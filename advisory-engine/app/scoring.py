"""The deterministic crop-fit and seasonal-profit engine.

A line-for-line port of the scoring in ``khet_kundli.cpp`` so the web result is
identical to the offline C++ tool for the same inputs:

* season is a hard eligibility gate
* score = 0.50 (eligible) + 0.30 * rainfall band-fit + 0.20 * soil-pH band-fit
* yield is linearly interpolated between observed rainfall/yield points and
  clamped (never extrapolated) outside the observed range
* ties break by higher projected profit per acre, then by crop name

Standard library only — no FastAPI, no Pydantic — so it can be unit-tested and
reused anywhere.
"""

from __future__ import annotations

from dataclasses import dataclass

from .crops import Crop, YieldPoint

SEASON_WEIGHT = 0.50
RAINFALL_WEIGHT = 0.30
SOIL_PH_WEIGHT = 0.20
_EPSILON = 1e-9


@dataclass(frozen=True)
class FarmContext:
    land_acres: float
    soil_ph: float
    rainfall_mm: float
    season: str
    seed_cost: float = 0.0
    labour_cost: float = 0.0
    irrigation_cost: float = 0.0
    transport_cost: float = 0.0
    land_rent: float = 0.0
    other_cost: float = 0.0

    @property
    def entered_costs(self) -> float:
        return (
            self.seed_cost
            + self.labour_cost
            + self.irrigation_cost
            + self.transport_cost
            + self.land_rent
            + self.other_cost
        )


@dataclass(frozen=True)
class CropProjection:
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


def band_fit(value: float, low: float, high: float) -> float:
    """1.0 inside [low, high]; linearly decaying to 0 one band-width outside it."""
    if low <= value <= high:
        return 1.0
    distance = low - value if value < low else value - high
    return max(0.0, 1.0 - distance / (high - low))


def interpolate_yield(table: tuple[YieldPoint, ...], rainfall: float) -> float:
    if not table:
        return 0.0
    if rainfall <= table[0].rainfall_mm:
        return table[0].yield_kg_per_acre
    if rainfall >= table[-1].rainfall_mm:
        return table[-1].yield_kg_per_acre
    for a, b in zip(table, table[1:]):
        if a.rainfall_mm <= rainfall <= b.rainfall_mm:
            fraction = (rainfall - a.rainfall_mm) / (b.rainfall_mm - a.rainfall_mm)
            return a.yield_kg_per_acre + fraction * (b.yield_kg_per_acre - a.yield_kg_per_acre)
    return table[-1].yield_kg_per_acre


def score_crop(crop: Crop, ctx: FarmContext) -> float | None:
    """The blended match score, or ``None`` if the crop is not eligible this season."""
    if crop.season != ctx.season:
        return None
    return (
        SEASON_WEIGHT
        + RAINFALL_WEIGHT * band_fit(ctx.rainfall_mm, crop.rain_min, crop.rain_max)
        + SOIL_PH_WEIGHT * band_fit(ctx.soil_ph, crop.ph_min, crop.ph_max)
    )


def projected_profit_per_acre(crop: Crop, ctx: FarmContext) -> float:
    shared_costs = ctx.entered_costs / ctx.land_acres if ctx.land_acres else 0.0
    return (
        interpolate_yield(crop.yield_table, ctx.rainfall_mm) * crop.price_per_kg
        - crop.fertilizer_cost_per_acre
        - shared_costs
    )


def project(crop: Crop, ctx: FarmContext) -> CropProjection:
    yield_per_acre = interpolate_yield(crop.yield_table, ctx.rainfall_mm)
    revenue = yield_per_acre * ctx.land_acres * crop.price_per_kg
    fertilizer_cost = crop.fertilizer_cost_per_acre * ctx.land_acres
    total_cost = fertilizer_cost + ctx.entered_costs
    score = score_crop(crop, ctx) or 0.0
    return CropProjection(
        crop=crop.name,
        season=crop.season,
        match_score=round(score, 6),
        rainfall_fit=round(band_fit(ctx.rainfall_mm, crop.rain_min, crop.rain_max), 6),
        soil_ph_fit=round(band_fit(ctx.soil_ph, crop.ph_min, crop.ph_max), 6),
        predicted_yield_kg_per_acre=round(yield_per_acre, 4),
        predicted_total_yield_kg=round(yield_per_acre * ctx.land_acres, 4),
        price_per_kg=crop.price_per_kg,
        predicted_revenue=round(revenue, 2),
        fertilizer_cost=round(fertilizer_cost, 2),
        entered_cost=round(ctx.entered_costs, 2),
        predicted_total_cost=round(total_cost, 2),
        predicted_profit=round(revenue - total_cost, 2),
        projected_profit_per_acre=round(projected_profit_per_acre(crop, ctx), 2),
    )


def rank_eligible(crops: list[Crop], ctx: FarmContext) -> list[CropProjection]:
    """Every crop eligible for the season, best first.

    Sort key mirrors ``isBetterMatch`` / ``showTopThree`` in the C++ source:
    higher score, then higher projected profit per acre, then crop name.
    """
    eligible = [(crop, score_crop(crop, ctx)) for crop in crops]
    eligible = [(crop, score) for crop, score in eligible if score is not None]
    eligible.sort(
        key=lambda pair: (
            -pair[1],
            -projected_profit_per_acre(pair[0], ctx),
            pair[0].name,
        )
    )
    return [project(crop, ctx) for crop, _ in eligible]


@dataclass(frozen=True)
class Advisory:
    recommended: CropProjection | None
    alternatives: list[CropProjection]
    season: str
    eligible_count: int

    @property
    def has_recommendation(self) -> bool:
        return self.recommended is not None


def run_advisory(crops: list[Crop], ctx: FarmContext, *, top_n: int = 3) -> Advisory:
    ranked = rank_eligible(crops, ctx)
    recommended = ranked[0] if ranked else None
    alternatives = ranked[1:top_n] if len(ranked) > 1 else []
    return Advisory(
        recommended=recommended,
        alternatives=alternatives,
        season=ctx.season,
        eligible_count=len(ranked),
    )
