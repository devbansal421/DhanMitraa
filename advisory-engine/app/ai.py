"""The AI narrative layer.

Turns the deterministic advisory (numbers the engine is certain about) into a
short, plain-language explanation in the farmer's language. The model never
decides the crop or the figures — it only explains what the engine already
computed, plus agronomic risks and next actions.

Provider-agnostic: any OpenAI-compatible chat endpoint. Free path is Groq
(``console.groq.com``, no card). With no key configured the caller gets the full
numeric advisory and ``status="unconfigured"``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import httpx

from .config import settings
from .scoring import Advisory, FarmContext

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "bn": "Bengali",
    "ta": "Tamil",
}

_SYSTEM = (
    "You are the explainer for Khet Kundli, an offline-first crop-fit and profit "
    "advisor used by small farmers in India. A deterministic engine has ALREADY "
    "chosen the recommended crop and computed every rupee figure. Your job is only "
    "to explain that result in clear, simple language.\n"
    "Rules:\n"
    "- Reply ONLY in {language}. Short sentences. Assume a small phone screen and "
    "limited reading confidence. No markdown headings or tables.\n"
    "- Never change the recommended crop or any number. Refer to the figures you "
    "are given.\n"
    "- Cover, briefly: (1) why this crop fits the season, rainfall and soil; "
    "(2) the money picture in words (expected yield, revenue, cost, profit); "
    "(3) two or three concrete risks or next actions for this season.\n"
    "- This is agronomic and cash-flow guidance for planning only. Do NOT give "
    "investment, credit, tax, or legal advice. End with one short caution line "
    "that yields depend on weather and local prices."
)


@dataclass
class Narrative:
    status: str  # "ok" | "unconfigured" | "error"
    text: str | None = None
    model: str | None = None
    detail: str | None = None


def _facts(ctx: FarmContext, advisory: Advisory) -> str:
    rec = advisory.recommended
    payload = {
        "season": ctx.season,
        "land_acres": ctx.land_acres,
        "soil_ph": ctx.soil_ph,
        "expected_rainfall_mm": ctx.rainfall_mm,
        "entered_costs_rupees": round(ctx.entered_costs, 2),
        "recommended": None
        if rec is None
        else {
            "crop": rec.crop,
            "match_score": rec.match_score,
            "rainfall_fit": rec.rainfall_fit,
            "soil_ph_fit": rec.soil_ph_fit,
            "predicted_yield_kg_per_acre": rec.predicted_yield_kg_per_acre,
            "predicted_total_yield_kg": rec.predicted_total_yield_kg,
            "predicted_revenue_rupees": rec.predicted_revenue,
            "predicted_total_cost_rupees": rec.predicted_total_cost,
            "predicted_profit_rupees": rec.predicted_profit,
        },
        "alternatives": [
            {"crop": alt.crop, "match_score": alt.match_score, "profit_per_acre": alt.projected_profit_per_acre}
            for alt in advisory.alternatives
        ],
    }
    return json.dumps(payload, ensure_ascii=False)


async def _call(model: str, system: str, user: str) -> str:
    async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        response = await client.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.3,
                "max_tokens": 700,
            },
        )
    if response.status_code >= 400:
        raise RuntimeError(f"{model} -> HTTP {response.status_code}: {response.text[:200]}")
    data = response.json()
    message = (data.get("choices") or [{}])[0].get("message", {})
    # Some reasoning models leave `content` empty and put the answer in `reasoning`.
    return str(message.get("content") or message.get("reasoning") or "").strip()


async def generate_narrative(ctx: FarmContext, advisory: Advisory, language: str) -> Narrative:
    if not settings.ai_enabled:
        return Narrative(status="unconfigured")
    if advisory.recommended is None:
        return Narrative(status="unconfigured")

    language_name = LANGUAGE_NAMES.get(language, "English")
    system = _SYSTEM.format(language=language_name)
    user = (
        "Explain this advisory result to the farmer.\n\n"
        f"ENGINE RESULT (JSON, already final):\n{_facts(ctx, advisory)}"
    )

    for model in (settings.llm_model, settings.llm_fallback_model):
        try:
            text = await _call(model, system, user)
            if text:
                return Narrative(status="ok", text=text, model=model)
        except Exception as exc:  # noqa: BLE001 - report upstream reason, keep serving numbers
            last_detail = str(exc)
            continue
    return Narrative(status="error", detail=locals().get("last_detail", "no narrative produced"))
