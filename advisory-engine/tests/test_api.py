"""HTTP-surface tests. The AI narrative is unconfigured in CI, so responses
carry the full deterministic advisory and ``narrative.status == "unconfigured"``.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_loaded_crops():
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["crops_loaded"] >= 13
    assert body["crop_warnings"] == []


def test_crops_endpoint_returns_reference_table():
    body = client.get("/crops").json()
    assert body["count"] == len(body["crops"])
    rice = next(c for c in body["crops"] if c["name"] == "Rice")
    assert rice["season"] == "Kharif"
    assert len(rice["yield_points"]) >= 2


def test_advisory_recommends_rice_for_kharif_paddy_conditions():
    response = client.post(
        "/advisory",
        json={
            "land_acres": 3,
            "soil_ph": 5.6,
            "rainfall_mm": 1500,
            "season": "kharif",
            "costs": {},
            "language": "hi",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["has_recommendation"] is True
    assert body["recommended"]["crop"] == "Rice"
    assert body["recommended"]["predicted_profit"] == 99300
    assert body["narrative"]["status"] == "unconfigured"
    assert body["score_weights"] == {"season": 0.50, "rainfall": 0.30, "soil_ph": 0.20}


def test_advisory_rejects_out_of_range_ph():
    response = client.post(
        "/advisory",
        json={"land_acres": 3, "soil_ph": 20, "rainfall_mm": 1500, "season": "kharif"},
    )
    assert response.status_code == 422


def test_advisory_422_when_no_crop_for_season_subset(monkeypatch):
    # Restrict the in-memory table to Kharif crops, then ask for Rabi.
    import app.main as main

    kharif_only = [c for c in main._CROPS.crops if c.season == "Kharif"]
    monkeypatch.setattr(main._CROPS, "crops", kharif_only)
    response = client.post(
        "/advisory",
        json={"land_acres": 3, "soil_ph": 6.5, "rainfall_mm": 500, "season": "rabi"},
    )
    assert response.status_code == 422
    assert "Rabi" in response.json()["detail"]
