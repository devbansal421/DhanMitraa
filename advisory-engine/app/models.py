"""Request and response schemas for the advisory API."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from .scoring import Advisory, CropProjection, FarmContext

SEASONS = ("Kharif", "Rabi", "Zaid")
LANGUAGES = ("en", "hi", "mr", "bn", "ta")


class CostBreakdown(BaseModel):
    seed: float = Field(0, ge=0, le=1e12)
    labour: float = Field(0, ge=0, le=1e12)
    irrigation: float = Field(0, ge=0, le=1e12)
    transport: float = Field(0, ge=0, le=1e12)
    land_rent: float = Field(0, ge=0, le=1e12)
    other: float = Field(0, ge=0, le=1e12)

    @property
    def total(self) -> float:
        return self.seed + self.labour + self.irrigation + self.transport + self.land_rent + self.other


class AdvisoryRequest(BaseModel):
    # Validation ranges match khet_kundli.cpp exactly.
    land_acres: float = Field(..., gt=0, le=100_000)
    soil_ph: float = Field(..., ge=0, le=14)
    rainfall_mm: float = Field(..., ge=0, le=20_000)
    season: str
    costs: CostBreakdown = Field(default_factory=CostBreakdown)

    # Optional context — used only for the AI narrative and record-keeping.
    farmer_name: str | None = Field(None, max_length=120)
    location: str | None = Field(None, max_length=120)
    language: str = "en"
    top_n: int = Field(3, ge=1, le=13)

    @field_validator("season", mode="before")
    @classmethod
    def _normalise_season(cls, value: str) -> str:
        season = str(value).strip().title()
        if season not in SEASONS:
            raise ValueError(f"season must be one of {SEASONS} (case-insensitive)")
        return season

    @field_validator("language", mode="before")
    @classmethod
    def _normalise_language(cls, value: str) -> str:
        lang = str(value).strip().lower()[:2]
        return lang if lang in LANGUAGES else "en"

    def to_context(self) -> FarmContext:
        return FarmContext(
            land_acres=self.land_acres,
            soil_ph=self.soil_ph,
            rainfall_mm=self.rainfall_mm,
            season=self.season,
            seed_cost=self.costs.seed,
            labour_cost=self.costs.labour,
            irrigation_cost=self.costs.irrigation,
            transport_cost=self.costs.transport,
            land_rent=self.costs.land_rent,
            other_cost=self.costs.other,
        )


class ProjectionOut(BaseModel):
    crop: str
    season: str
    match_score: float
    rainfall_fit: float
    soil_ph_fit: float
    predicted_yield_kg_per_acre: float
    predicted_total_yield_kg: float
    price_per_kg: float
    predicted_revenue: float
    fertilizer_cost: float
    entered_cost: float
    predicted_total_cost: float
    predicted_profit: float
    projected_profit_per_acre: float

    @classmethod
    def of(cls, projection: CropProjection) -> "ProjectionOut":
        return cls(**projection.__dict__)


class NarrativeOut(BaseModel):
    status: str
    text: str | None = None
    model: str | None = None
    detail: str | None = None


class AdvisoryResponse(BaseModel):
    engine_version: str
    season: str
    has_recommendation: bool
    eligible_count: int
    recommended: ProjectionOut | None
    alternatives: list[ProjectionOut]
    score_weights: dict[str, float]
    narrative: NarrativeOut
    disclaimer: str

    @classmethod
    def build(
        cls,
        *,
        engine_version: str,
        advisory: Advisory,
        narrative: NarrativeOut,
    ) -> "AdvisoryResponse":
        return cls(
            engine_version=engine_version,
            season=advisory.season,
            has_recommendation=advisory.has_recommendation,
            eligible_count=advisory.eligible_count,
            recommended=ProjectionOut.of(advisory.recommended) if advisory.recommended else None,
            alternatives=[ProjectionOut.of(alt) for alt in advisory.alternatives],
            score_weights={"season": 0.50, "rainfall": 0.30, "soil_ph": 0.20},
            narrative=narrative,
            disclaimer=(
                "Planning guidance only. Predicted yield is interpolated from reference "
                "rainfall/yield points and clamped to the observed range; actual results "
                "depend on weather, inputs, and local market prices. Replace the reference "
                "crop data with figures approved for your district before relying on it."
            ),
        )


class CropOut(BaseModel):
    name: str
    season: str
    ph_min: float
    ph_max: float
    rain_min: float
    rain_max: float
    fertilizer_cost_per_acre: float
    price_per_kg: float
    yield_points: list[dict[str, float]]


class CropTableResponse(BaseModel):
    count: int
    warnings: list[str]
    crops: list[CropOut]
