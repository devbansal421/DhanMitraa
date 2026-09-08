"""Load and validate the crop reference table.

A faithful port of ``loadCropDatabase`` / ``parseYieldPoints`` from
``khet_kundli.cpp``. Kept dependency-free (standard library only) so the
scoring core can be imported and tested without FastAPI or Pydantic.

The CSV is deliberately external to the code, exactly as in the C++ program:
changing a crop profile is a data edit, not a code change. Malformed rows are
skipped with a recorded warning rather than crashing the load.
"""

from __future__ import annotations

import csv
import io
import math
from dataclasses import dataclass, field
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CROP_FILE = DATA_DIR / "crop_database.csv"

EXPECTED_COLUMNS = 9
SEASONS = ("Kharif", "Rabi", "Zaid")


@dataclass(frozen=True)
class YieldPoint:
    rainfall_mm: float
    yield_kg_per_acre: float


@dataclass(frozen=True)
class Crop:
    name: str
    season: str
    ph_min: float
    ph_max: float
    rain_min: float
    rain_max: float
    fertilizer_cost_per_acre: float
    price_per_kg: float
    yield_table: tuple[YieldPoint, ...]


@dataclass
class CropLoadResult:
    crops: list[Crop] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def by_season(self) -> dict[str, list[Crop]]:
        grouped: dict[str, list[Crop]] = {season: [] for season in SEASONS}
        for crop in self.crops:
            grouped.setdefault(crop.season, []).append(crop)
        return grouped


def _to_float(text: str) -> float | None:
    try:
        value = float(text.strip())
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def parse_yield_points(text: str) -> tuple[YieldPoint, ...] | None:
    """Parse ``rain:yield;rain:yield;...`` into a sorted, de-duplicated tuple.

    Mirrors the C++ rule set: at least two points, non-negative values,
    strictly increasing rainfall after sorting.
    """
    points: list[YieldPoint] = []
    for item in text.split(";"):
        item = item.strip()
        if not item:
            continue
        head, _, tail = item.partition(":")
        if not _:
            return None
        rain = _to_float(head)
        yld = _to_float(tail)
        if rain is None or yld is None or rain < 0 or yld < 0:
            return None
        points.append(YieldPoint(rain, yld))

    if len(points) < 2:
        return None
    points.sort(key=lambda p: p.rainfall_mm)
    for earlier, later in zip(points, points[1:]):
        if earlier.rainfall_mm == later.rainfall_mm:
            return None
    return tuple(points)


def _parse_row(row: list[str], line_number: int) -> tuple[Crop | None, str | None]:
    if len(row) != EXPECTED_COLUMNS:
        return None, f"row {line_number}: expected {EXPECTED_COLUMNS} columns, found {len(row)}"

    name = row[0].strip()
    season = row[1].strip().title()
    ph_min = _to_float(row[2])
    ph_max = _to_float(row[3])
    rain_min = _to_float(row[4])
    rain_max = _to_float(row[5])
    fertilizer = _to_float(row[6])
    price = _to_float(row[7])
    yield_table = parse_yield_points(row[8])

    if not name:
        return None, f"row {line_number}: crop name is empty"
    if season not in SEASONS:
        return None, f"row {line_number}: season '{row[1].strip()}' is not one of {SEASONS}"
    if None in (ph_min, ph_max, rain_min, rain_max, fertilizer, price):
        return None, f"row {line_number}: a numeric field could not be parsed"
    if yield_table is None:
        return None, f"row {line_number}: yield points are malformed"
    assert ph_min is not None and ph_max is not None
    assert rain_min is not None and rain_max is not None
    assert fertilizer is not None and price is not None
    if ph_min >= ph_max or rain_min >= rain_max:
        return None, f"row {line_number}: min/max bounds are inverted or equal"
    if rain_min < 0 or fertilizer < 0 or price < 0:
        return None, f"row {line_number}: a value that must be non-negative is negative"

    return (
        Crop(
            name=name,
            season=season,
            ph_min=ph_min,
            ph_max=ph_max,
            rain_min=rain_min,
            rain_max=rain_max,
            fertilizer_cost_per_acre=fertilizer,
            price_per_kg=price,
            yield_table=yield_table,
        ),
        None,
    )


def load_crops_from_text(text: str) -> CropLoadResult:
    result = CropLoadResult()
    reader = csv.reader(io.StringIO(text))
    for line_number, row in enumerate(reader, start=1):
        if line_number == 1:  # header
            continue
        if not row or not any(cell.strip() for cell in row):
            continue
        crop, warning = _parse_row(row, line_number)
        if crop is not None:
            result.crops.append(crop)
        elif warning is not None:
            result.warnings.append(warning)
    return result


def load_crops(path: Path | str = CROP_FILE) -> CropLoadResult:
    return load_crops_from_text(Path(path).read_text(encoding="utf-8"))
