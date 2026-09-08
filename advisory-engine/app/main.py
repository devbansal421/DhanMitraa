"""Khet Kundli advisory engine — HTTP surface.

    GET  /health        liveness + how many crop profiles loaded
    GET  /crops         the crop reference table (parsed from crop_database.csv)
    POST /advisory      run the crop-fit + profit engine, with an AI narrative

The scoring is the deterministic C++ port in ``app.scoring``; the model only
explains the result it is handed.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .ai import generate_narrative
from .config import settings
from .crops import load_crops
from .models import (
    AdvisoryRequest,
    AdvisoryResponse,
    CropOut,
    CropTableResponse,
    NarrativeOut,
)
from .scoring import run_advisory

app = FastAPI(
    title="Khet Kundli Advisory Engine",
    version=__version__,
    summary="Crop-fit and seasonal-profit advisory for the DhanMitraa rural-finance app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# The crop table is small and immutable at runtime — load it once.
_CROPS = load_crops()


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if settings.api_key and x_api_key != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing X-API-Key")


@app.get("/health", tags=["meta"])
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "engine_version": __version__,
        "crops_loaded": len(_CROPS.crops),
        "crop_warnings": _CROPS.warnings,
        "ai_enabled": settings.ai_enabled,
        "ai_model": settings.llm_model if settings.ai_enabled else None,
    }


@app.get("/crops", response_model=CropTableResponse, tags=["reference"])
def crops() -> CropTableResponse:
    return CropTableResponse(
        count=len(_CROPS.crops),
        warnings=_CROPS.warnings,
        crops=[
            CropOut(
                name=c.name,
                season=c.season,
                ph_min=c.ph_min,
                ph_max=c.ph_max,
                rain_min=c.rain_min,
                rain_max=c.rain_max,
                fertilizer_cost_per_acre=c.fertilizer_cost_per_acre,
                price_per_kg=c.price_per_kg,
                yield_points=[
                    {"rainfall_mm": p.rainfall_mm, "yield_kg_per_acre": p.yield_kg_per_acre}
                    for p in c.yield_table
                ],
            )
            for c in _CROPS.crops
        ],
    )


@app.post("/advisory", response_model=AdvisoryResponse, tags=["advisory"], dependencies=[Depends(require_api_key)])
async def advisory(request: AdvisoryRequest) -> AdvisoryResponse:
    ctx = request.to_context()
    result = run_advisory(_CROPS.crops, ctx, top_n=request.top_n)

    if not result.has_recommendation:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No crop profiles are configured for the {ctx.season} season.",
        )

    narrative = await generate_narrative(ctx, result, request.language)
    return AdvisoryResponse.build(
        engine_version=__version__,
        advisory=result,
        narrative=NarrativeOut(**narrative.__dict__),
    )
