# Khet Kundli Advisory Engine

A Python **FastAPI** microservice that ports the offline **Khet Kundli** C++
crop-advisor (`../` — see the original at `KHET KUNDLI/khet_kundli.cpp`) and puts
it behind an HTTP API, with an optional AI layer that explains the result in the
farmer's language.

It is a separate service from the DhanMitraa web app: deploy the React app on
Vercel and this engine on Render / Railway / Fly. Step 3 wires the two together
(the `/advisory` page and the "Sahayak" assistant call this service).

## Why a separate service (polyglot by design)

| Layer | Language | Role |
|---|---|---|
| `KHET KUNDLI/khet_kundli.cpp` | **C++17** | the original offline tool — still the reference implementation |
| `app/scoring.py`, `app/crops.py` | **Python (stdlib only)** | a line-for-line port of the scoring; no web deps so it is trivially testable |
| `app/main.py` | **Python + FastAPI** | HTTP surface, validation, OpenAPI docs |
| `app/ai.py` | **Python + any OpenAI-compatible LLM** | turns the numbers into plain-language guidance |
| `data/crop_database.csv` | **CSV** | the shared crop-profile contract, identical to the C++ tool's |

`tests/test_scoring.py` asserts the Python output against real rows from
`advisory_log.csv` that the compiled C++ tool produced — so the web result can
never silently drift from the offline one.

## The engine (unchanged from Khet Kundli)

1. **Season is a hard gate** — a Kharif crop is never offered in Rabi or Zaid.
2. **Match score** = `0.50` (eligible) + `0.30 ×` rainfall band-fit + `0.20 ×`
   soil-pH band-fit. Band-fit is `1.0` inside the crop's range and decays
   linearly to `0` one band-width outside it.
3. **Yield** is linearly interpolated between the crop's observed
   `rainfall:yield` points and **clamped** (never extrapolated) outside that
   range.
4. **Ties** break by higher projected profit per acre, then crop name.
5. **Money** = interpolated yield × acres × price − fertiliser cost − the costs
   the farmer entered for the season.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | liveness, crop count, whether AI is configured |
| `GET` | `/crops` | the parsed crop reference table |
| `POST` | `/advisory` | run the engine + AI narrative |
| `GET` | `/docs` | interactive OpenAPI (Swagger) UI |

### `POST /advisory`

```jsonc
{
  "land_acres": 3,
  "soil_ph": 5.6,
  "rainfall_mm": 1500,
  "season": "kharif",            // case-insensitive; Kharif | Rabi | Zaid
  "costs": {                      // all optional, default 0
    "seed": 0, "labour": 0, "irrigation": 0,
    "transport": 0, "land_rent": 0, "other": 0
  },
  "farmer_name": "Ravi Kumar",   // optional, used only for the narrative
  "location": "Sultanpur",        // optional
  "language": "hi",               // en | hi | mr | bn | ta
  "top_n": 3
}
```

Response: the recommended crop with its full projection, ranked alternatives, the
score weights, and a `narrative` block (`status`: `ok` | `unconfigured` |
`error`). Validation ranges mirror the C++ tool exactly (land `0 < a ≤ 100000`,
pH `0–14`, rainfall `0–20000`).

## Run it

```bash
cd advisory-engine
make install         # creates .venv and installs deps
make test            # parity + API tests
cp .env.example .env # optional — add a Groq key for the AI narrative
make run             # http://localhost:8000/docs
```

Without `make`:

```bash
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest
.venv/bin/uvicorn app.main:app --reload
```

## Deploy

**Docker** (any host):

```bash
docker build -t khet-kundli-advisory .
docker run --rm -p 8000:8000 --env-file .env khet-kundli-advisory
```

**Render** (free): import the repo → New → Blueprint → `advisory-engine/render.yaml`,
then set `LLM_API_KEY` in the dashboard. Health check is `/health`.

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `LLM_API_KEY` | — | Groq key (`console.groq.com`, free). Absent ⇒ narrative `unconfigured`. |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | any OpenAI-compatible endpoint |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | primary model |
| `LLM_FALLBACK_MODEL` | `openai/gpt-oss-20b` | retried once if the primary fails |
| `CORS_ALLOW_ORIGINS` | `*` | comma-separated; set to your Vercel URL in prod |
| `ADVISORY_API_KEY` | — | when set, callers must send `X-API-Key` |
