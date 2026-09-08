# DhanMitraa + Khet Kundli — 5-Minute Demo Video Script

**IIC 3.0 Hackathon · Team DhanMitraa**
Dev Bansal · Krish Maheshwari · Samarth Agor · Tilak Jha

Total run time: **5:00**. Four speakers. Rehearse once with a timer.

---

## 0. Before you hit record (10-minute checklist)

Do these in order. If one fails, use the **Fallback** line for that segment — the
video still works.

| # | Command / action | Expected | Owner |
|---|---|---|---|
| 1 | `cd advisory-engine && make install` (once) then `make test` | `16 passed` | Dev |
| 2 | `make run` → open `http://localhost:8000/docs` | Swagger UI loads | Dev |
| 3 | (optional, best) add a free Groq key to `advisory-engine/.env` → restart `make run` | `/health` shows `"ai_enabled": true` | Dev |
| 4 | In `KHET KUNDLI/`, `./khet_kundli.exe` runs and shows the menu | menu prints | Dev |
| 5 | `npm run dev` in the repo root → `http://localhost:5173` | auth screen | Krish |
| 6 | **Wallet + data live path (pick ONE):** **A.** `npx supabase db push` + `npx supabase functions deploy wallet-transfer` + paste `supabase/seed.sql`'s new blocks into the hosted SQL Editor. **B.** `npx supabase start` + `npx supabase db reset` (needs Docker), point `.env.local` at the local URL. **C.** none — do the **code + UI walkthrough** fallbacks | A/B: full farmer world + a real transfer. C: redesigned UI + code | Samarth |
| 7 | Screen 1920×1080, browser zoom 100 %, dark mode, hide bookmarks bar, close other tabs | clean capture | all |
| 8 | One recording per person, then stitch — or one screen-share call with hand-offs | — | all |

**Recording tips:** speak 10 % slower than feels natural · pause 1 s after each
hand-off · never read a URL aloud, just show it · if a click lags, keep talking.

---

## 1. The problem — **Tilak Jha** — 0:00–0:45 (45 s)

**On screen:** title card, then Tilak talking head or a 3-bullet slide.

> "Half of India farms, and almost every farm runs on trust and paper. One crop
> means paying a seed supplier, a transporter, hired labour, a tractor owner —
> then waiting on one buyer to pay you back, over a cheap phone on a weak network,
> often in a language the app doesn't speak.
>
> Two things break. **Trust** — there's no shared record of who owes whom, so
> disputes are constant and middlemen exploit the gap. And **decisions** — a
> farmer picks a crop on a hunch and learns the economics only at harvest.
>
> DhanMitraa fixes both: a payments layer where money can only move between
> **verified** parties on a tamper-proof ledger, and an offline crop advisor that
> tells you what to plant and what you'll actually keep — before you plant it."

---

## 2. Product tour + payments experience — **Krish Maheshwari** — 0:45–2:05 (80 s)

**On screen:** the running web app, signed in as the seeded farmer "Ravi Kumar".
Move one screen at a time.

> "This is the app — a React PWA. It installs to the home screen and opens offline.
>
> *(Overview)* The farmer's position for the season: projected proceeds after
> obligations, the upcoming harvest, and every commitment tied to this crop —
> fertiliser, machinery, transport, labour — with what's secured and what's
> pending.
>
> *(My Crops)* Their whole track record — this year's crops and the last three
> seasons, each with its value, obligations, and stage.
>
> *(Settings → हिन्दी)* The interface is multilingual — English and Hindi fully
> translated, three more core-covered — remembered per device. *(toggle Larger
> text + Simple mode)* Larger text and a low-data mode for older phones.
> Accessibility is the default, not an add-on.
>
> *(Payments)* The wallet. Notice the badge — **Verified ledger**, not
> 'simulation'. *(click Send money)* And notice what you **can't** do: there's no
> 'type a name' box. You search and pick a **verified participant** — a real
> supplier or buyer. You cannot invent a person and pay them. *(pick one, enter
> an amount, Review)* Two-step confirm, the amount read back in words for
> low-literacy users, and offline it queues and syncs on reconnect."

**Hand-off:** "The reason you can't fake a payee is the backend — Samarth."

**Fallback (no backend):** run `npm run dev` anyway — auth, Settings, language
toggle and the Send-money sheet with the participant picker all render without a
backend. Narrate the rules over the UI.

---

## 3. The closed-loop ledger — **Samarth Agor** — 2:05–3:20 (75 s)

**On screen:** split between the Wallet page and the editor showing
`supabase/migrations/202609090001_wallet_closed_loop.sql` and
`supabase/functions/wallet-transfer/index.ts`.

> "The old wallet was a number in the browser — you could mint money and pay
> imaginary people. We replaced it with a real ledger in Postgres.
>
> *(migration file)* Every holder — farmer or organisation — has one wallet. The
> ledger is **append-only and immutable**: a trigger blocks every update and
> delete. A payment isn't a number change, it's **two rows written in one
> transaction** — debit the sender, credit the receiver — and a trigger rejects
> the whole thing if it would push any balance below zero.
>
> *(edge function)* The browser never sends a balance or a status — just a
> recipient id, an amount, and a one-time key. The server checks the recipient is
> a real registered participant, then does the atomic transfer. Unknown payee,
> overdraft, repeated request — all rejected here.
>
> *(app — do the live transfer if step 6A/6B worked)* So when Ravi pays Greenfield
> Fertilisers, money leaves his wallet, lands in theirs, and both sides get an
> immutable receipt. Row-level security means he only ever sees his own ledger.
>
> That's what 'no simulation' means: real integrity, closed loop. Connecting a
> real bank is only an RBI licence away — the architecture is already correct."

**Fallback (no backend):** skip the live transfer; scroll the migration and land
on the `wallet_transfer` function and the overdraft `raise exception`.

---

## 4. Khet Kundli — the AI advisory engine — **Dev Bansal** — 3:20–4:30 (70 s)

**On screen:** terminal, then the FastAPI `/docs` page.

> "The advice side started as a C++ terminal tool — Khet Kundli. *(run
> `./khet_kundli.exe`, show the menu for 3 seconds)* It scores crops against soil
> pH, rainfall and season, and projects the profit.
>
> For the hackathon we turned that engine into a **Python FastAPI microservice**
> so the website and an AI can use it. *(run `make test`)* These 16 tests include
> **five parity cases** — we feed the Python engine the same inputs as the old
> C++ tool and assert the output matches to the rupee. The web result can never
> drift from the original.
>
> *(open `/docs`, expand `POST /advisory`, run it with 3 acres, pH 5.6, 1500 mm
> rain, Kharif)* Slightly acidic soil, good monsoon rain, three acres. The engine
> returns **Rice** — match score 1.0 — with the full money picture: 1,800 kg per
> acre, ₹1,18,800 revenue, **₹99,300 profit**, and ranked alternatives.
>
> *(if a Groq key is set, scroll to `narrative`)* The AI layer turns those numbers
> into plain-language advice **in the farmer's language** — why this crop, the
> money in words, the risks this season. It never changes the crop or the
> numbers; it only explains the engine's result."

**Fallback (no Groq key):** the `narrative` shows `"status": "unconfigured"` —
say: "The AI narrative needs a free Groq key; the deterministic advisory you're
seeing is the part that must always be right, and that's the part we test."

---

## 5. Architecture, roadmap, close — **Dev Bansal** (or Tilak) — 4:30–5:00 (30 s)

**On screen:** a simple architecture slide.

> "Under the hood: a React PWA on Vercel; Supabase for auth, Postgres with
> row-level security on every table, and Deno edge functions as the only writers;
> and the Python advisory engine as its own service. Secrets never touch the
> browser.
>
> Shipped: the verified closed-loop wallet and the advisory engine with
> C++-parity tests. Next: the advisory screen wired into the app, real
> escrow-backed harvest settlement, and live weather and market-price feeds.
>
> DhanMitraa — money you can trust, and decisions you can see. Thank you."

**End card:** `github.com/devbansal421/DhanMitraa` + team names.

---

## Shot list (for the editor)

| Time | Shot | Source |
|---|---|---|
| 0:00 | Title card | slide |
| 0:05 | Tilak, problem | camera / slide |
| 0:45 | Overview page | web app |
| 1:00 | My Crops (history) | web app |
| 1:10 | Language + accessibility toggles | web app |
| 1:25 | Wallet — Verified ledger badge | web app |
| 1:35 | Send money → participant picker → Review | web app |
| 2:05 | Migration SQL scroll | editor |
| 2:35 | `wallet-transfer` edge function | editor |
| 2:55 | Live transfer + receipt *(or code fallback)* | web app |
| 3:20 | `khet_kundli.exe` menu | terminal |
| 3:35 | `make test` → 16 passed | terminal |
| 3:55 | `/docs` → POST /advisory → Rice result | browser |
| 4:20 | AI narrative block *(if keyed)* | browser |
| 4:30 | Architecture slide | slide |
| 4:55 | End card | slide |

## If you are very short on time

Cut to **3 speakers, 4 minutes**: merge §5 into §4 (Dev), Tilak's intro 30 s. The
must-keep beats: the **participant picker** (no ghost payees), the **immutable
double-entry ledger** (code is enough), the **C++-parity test run**, and the
**live `/advisory` call**. Those four moments carry the whole story.
