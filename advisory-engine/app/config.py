"""Runtime configuration, read once from the environment.

The AI narrative is optional: with no key the engine still returns the full
deterministic advisory and the narrative is simply marked ``unconfigured``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _split_origins(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # --- AI narrative (free path: a Groq key from console.groq.com) -----------
    llm_api_key: str | None = os.getenv("LLM_API_KEY") or None
    llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
    llm_model: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    llm_fallback_model: str = os.getenv("LLM_FALLBACK_MODEL", "openai/gpt-oss-20b")
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))

    # --- HTTP -------------------------------------------------------------------
    cors_allow_origins: list[str] = field(
        default_factory=lambda: _split_origins(os.getenv("CORS_ALLOW_ORIGINS", "*"))
    )
    api_key: str | None = os.getenv("ADVISORY_API_KEY") or None
    """Optional shared secret. When set, callers must send ``X-API-Key``."""

    @property
    def ai_enabled(self) -> bool:
        return bool(self.llm_api_key)


settings = Settings()
