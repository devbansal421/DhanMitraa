"""Parity tests: the Python engine must reproduce the C++ tool's advisories.

The expected values are real rows from ``advisory_log.csv`` produced by
``khet_kundli.exe``. If these fail after a change to ``scoring.py`` or the crop
data, the web result has diverged from the offline tool.
"""

import math

import pytest

from app.crops import load_crops
from app.scoring import (
    FarmContext,
    band_fit,
    interpolate_yield,
    rank_eligible,
    run_advisory,
)

CROPS = load_crops().crops


# name, acres, ph, rain, season, costs(dict), expected(dict)
PARITY_CASES = [
    (
        "sultanpur / Rice",
        FarmContext(3, 5.6, 1500, "Kharif"),
        dict(crop="Rice", score=1.000, yield_per_acre=1800, revenue=118800, fert=19500, total=19500, profit=99300),
    ),
    (
        "baghpat / Chickpea",
        FarmContext(2, 7.6, 350, "Rabi"),
        dict(crop="Chickpea (Gram)", score=1.000, yield_per_acre=450, revenue=45000, fert=7200, total=7200, profit=37800),
    ),
    (
        "punjab / Moong (full costs)",
        FarmContext(12, 6.5, 100, "Zaid", seed_cost=124, labour_cost=134, irrigation_cost=1700,
                    transport_cost=1200, land_rent=1500, other_cost=200),
        dict(crop="Moong (Green Gram)", score=0.800, yield_per_acre=400, revenue=336000, fert=36000,
             total=40858, profit=295142),
    ),
    (
        "rawalpindi / Moong (tiny plot, negative profit)",
        FarmContext(0.01, 7, 120, "Zaid", seed_cost=1, irrigation_cost=1000, other_cost=2000),
        dict(crop="Moong (Green Gram)", score=0.820, yield_per_acre=400, revenue=280, fert=30,
             total=3031, profit=-2751),
    ),
    (
        "punjab / Moong (200 acres)",
        FarmContext(200, 5.6, 200, "Zaid", seed_cost=400, labour_cost=1000, irrigation_cost=100,
                    transport_cost=500, other_cost=300),
        dict(crop="Moong (Green Gram)", score=0.847, yield_per_acre=400, revenue=5_600_000, fert=600_000,
             total=602_300, profit=4_997_700),
    ),
]


@pytest.mark.parametrize("label,ctx,expected", PARITY_CASES, ids=[c[0] for c in PARITY_CASES])
def test_matches_cpp_advisory_log(label, ctx, expected):
    advisory = run_advisory(CROPS, ctx)
    rec = advisory.recommended
    assert rec is not None
    assert rec.crop == expected["crop"]
    assert round(rec.match_score, 3) == expected["score"]
    assert rec.predicted_yield_kg_per_acre == pytest.approx(expected["yield_per_acre"])
    assert rec.predicted_revenue == pytest.approx(expected["revenue"])
    assert rec.fertilizer_cost == pytest.approx(expected["fert"])
    assert rec.predicted_total_cost == pytest.approx(expected["total"])
    assert rec.predicted_profit == pytest.approx(expected["profit"])


def test_band_fit_inside_and_outside():
    assert band_fit(6.0, 5.5, 6.5) == 1.0
    assert band_fit(5.5, 5.5, 6.5) == 1.0
    # one full band-width below the floor -> 0
    assert band_fit(4.5, 5.5, 6.5) == pytest.approx(0.0)
    # half a band-width below -> 0.5
    assert band_fit(5.0, 5.5, 6.5) == pytest.approx(0.5)
    assert band_fit(100, 5.5, 6.5) == 0.0


def test_interpolate_yield_clamps_outside_observed_range():
    rice = next(c for c in CROPS if c.name == "Rice")
    lowest = rice.yield_table[0]
    highest = rice.yield_table[-1]
    assert interpolate_yield(rice.yield_table, 0) == lowest.yield_kg_per_acre
    assert interpolate_yield(rice.yield_table, 99_999) == highest.yield_kg_per_acre
    # exact midpoint between 1200:1500 and 1800:2100
    assert interpolate_yield(rice.yield_table, 1500) == pytest.approx(1800)


def test_season_is_a_hard_gate():
    # A Kharif-only crop must never be recommended in Rabi.
    advisory = run_advisory(CROPS, FarmContext(5, 6.5, 1500, "Rabi"))
    assert advisory.recommended is not None
    assert advisory.recommended.season == "Rabi"
    assert all(p.season == "Rabi" for p in advisory.alternatives)


def test_ranking_is_deterministic_and_ordered():
    ctx = FarmContext(4, 6.5, 800, "Kharif")
    ranked = rank_eligible(CROPS, ctx)
    scores = [p.match_score for p in ranked]
    assert scores == sorted(scores, reverse=True)
    # stable: same input, same order
    assert [p.crop for p in rank_eligible(CROPS, ctx)] == [p.crop for p in ranked]


def test_no_crops_for_impossible_context_is_reported():
    # Every configured crop has a season; an unknown season yields nothing.
    advisory = run_advisory([c for c in CROPS if c.season == "Rabi"], FarmContext(4, 6.5, 800, "Kharif"))
    assert not advisory.has_recommendation
    assert advisory.eligible_count == 0


def test_crop_database_loads_clean():
    result = load_crops()
    assert result.warnings == []
    assert len(result.crops) >= 13
    assert {c.season for c in result.crops} == {"Kharif", "Rabi", "Zaid"}
    for crop in result.crops:
        assert crop.ph_min < crop.ph_max
        assert crop.rain_min < crop.rain_max
        assert len(crop.yield_table) >= 2
        rains = [p.rainfall_mm for p in crop.yield_table]
        assert rains == sorted(rains)
        assert all(math.isfinite(p.yield_kg_per_acre) for p in crop.yield_table)
