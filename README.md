# DhanMitraa

**Trustworthy, multilingual, offline-first digital payments for farmers and the rural economy.**

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![IIC 3.0](https://img.shields.io/badge/IIC%203.0-Hackathon-blue.svg)
![Stack](https://img.shields.io/badge/stack-React%20%C2%B7%20TypeScript%20%C2%B7%20Supabase-8b5cf6.svg)
![PWA](https://img.shields.io/badge/PWA-offline--first-informational.svg)

Built for **IIC 3.0**. Payments run on a **closed-loop ledger** — real money never
enters or leaves (that needs an RBI PPI licence), but inside the system every
rupee is a real, double-entry, server-authoritative, tamper-proof record.

---

## The Problem

- **Rural payments are hard to trust and hard to use.** Farmers deal with multiple
  parties (suppliers, transporters, labour, buyers) per crop, on cheap phones and
  patchy networks, often in a language the app doesn't speak.
- **Crop finance is opaque.** What is owed, what is secured, and what a farmer
  actually keeps after harvest is scattered across paper and word of mouth.

## Key Features

| Module | What it does |
|---|---|
| **Closed-loop wallet** | A real Postgres double-entry ledger. You can only pay a **verified network participant** (no free-text ghost payees); every transfer is two balancing rows written atomically by an Edge Function; balances can never overdraw; history is immutable and audited. Two-step confirm, receipts, amount-in-words, a daily spending limit, and an **offline outbox** that replays idempotently on reconnect. |
| **Crop & settlement view** | Crop cycles, buyer commitments, and a server-authorised settlement engine that snapshots obligations and balances allocations. |
| **Multilingual UI** | English + Hindi fully translated; Marathi, Bengali, Tamil core-covered with English fallback. Switchable and remembered per device. |
| **AI help assistant ("Sahayak")** | Answers "how do I…" questions in the user's language via a provider-agnostic Edge Function (free Groq path). Voice input and read-aloud. |
| **Accessibility & trust** | Larger-text mode, simple (low-data) mode, light/dark, "verified in your network" cues, new-payee warnings. |
| **Installable / offline** | Web-app manifest + service worker: add to home screen, launches offline. |

## Architecture

```
  React 18 + TypeScript + Vite + Tailwind  (SPA, PWA)
        │  read models only, never raw SQL
        ▼
  src/services/*  ──►  Supabase  ──►  PostgreSQL + Row-Level Security
        │                 │
        │                 ├─ Auth (email + anonymous guests)
        │                 └─ Edge Functions (Deno) — the only writers:
        │                      simulate-settlement · wallet-transfer
        │                      assistant · payments-*  (secrets stay server-side)
        ▼
  localStorage  ──  last-known wallet snapshot + offline transfer outbox
```

- **Frontend** holds only public keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- **Privileged work** (settlement execution, wallet debits, payment webhooks, the
  model API key) lives in Edge Functions using the service-role key.
- **Every table has RLS.** Members see only their organisation's data; settlement
  and payment writes are server-only.

---

## Quickstart

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key.
3. `npm install && npm run dev`

```powershell
npm run typecheck
npm run lint
npm run build
```

## Deploy on Vercel

1. Import the repo on [vercel.com](https://vercel.com) → framework preset **Vite**.
2. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy. Every push to `main` redeploys automatically.
4. In **Supabase → Authentication → URL Configuration**, add the Vercel URL to
   **Site URL** and **Redirect URLs** (`https://<app>.vercel.app/**`).

---

## Configuration & services

### Database

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), then:

```powershell
supabase login
supabase link --project-ref wjgwpplsdrecnbeskcvx
supabase db push
```

Local dev DB with demo records:

```powershell
supabase start
supabase db reset
```

`supabase/seed.sql` creates a **local-only** account (`ravi@dhanmitraa.local` /
`ChangeMe123!`). Never run the seed against a production project.

### Authentication

Set `VITE_AUTH_REDIRECT_URL` to the public app URL in the deployed environment,
and mirror it in **Supabase Dashboard → Authentication → URL Configuration**
(Site URL + Redirect URLs), keeping `http://localhost:5173` for local dev. Enable
**Allow anonymous sign-ins** to give guests a temporary session; anonymous
accounts are intentionally restricted by RLS.

### Multilingual support

UI text lives in `src/i18n/`. `en.ts` is the source of truth; other locales fall
back to it. To add a language: copy `en.ts`, translate the values, register it in
`src/i18n/index.tsx` (`DICTIONARIES`, `LANGUAGES`), and add its `lang.<code>` name.

### AI help assistant (`assistant` Edge Function)

Provider-agnostic. **Free path:** a Groq key (`console.groq.com`, no card).
Also works with any OpenAI-compatible endpoint, or Claude via `ANTHROPIC_API_KEY`.

```powershell
# put keys in supabase/.env (copy from supabase/.env.example), then:
supabase secrets set --env-file supabase/.env
supabase functions deploy assistant
```

| Secret | Purpose |
|---|---|
| `LLM_API_KEY` | Groq (or other OpenAI-compatible) key — the free path |
| `LLM_BASE_URL` | default `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | default `qwen/qwen3.8-27b` (check `/v1/models` for your account) |
| `ANTHROPIC_API_KEY` | use instead of `LLM_API_KEY` to run Claude |

Until deployed and keyed, the panel shows a clear "not set up yet" message and
the rest of the app is unaffected.

### Wallet (closed-loop ledger)

Migration `supabase/migrations/202609090001_wallet_closed_loop.sql` builds a real
double-entry wallet:

- **One wallet per holder** — a farmer (`profiles`) or an organisation
  (`organizations`), auto-provisioned by trigger.
- **`wallet_ledger`** is append-only and immutable. Every transfer is two rows
  (debit sender, credit recipient) sharing a `transfer_id`, written atomically by
  `public.wallet_transfer(...)`. A trigger keeps the cached balance in step and
  raises `P0001` on any overdraft.
- **Row-level security** lets a holder read only their own account and ledger.
- **The only write path is the `wallet-transfer` Edge Function.** The browser
  sends a recipient id, an amount, a kind (`send` | `obligation`) and a UUID
  idempotency key — never a balance or a status. Unknown payees, overdrafts and
  replays are all rejected in Postgres.
- Balances rise only from a transfer in, a `credit_wallets_for_settlement()`
  payout, or a labelled `wallet_grant()` seed float — there is no "add money
  from nowhere".
- The client keeps a last-known snapshot and an **offline outbox** in
  `localStorage`; queued transfers replay (idempotently) on reconnect.

Deploy: `supabase db push` then `supabase functions deploy wallet-transfer`.
`supabase/seed.sql` grants demo opening balances via `wallet_grant`.

### Payment gateway (Razorpay, test mode — optional)

**Off by default.** Test mode is free (email + phone OTP, no KYC). Set
`VITE_PAYMENTS_PROVIDER=razorpay` and the `RAZORPAY_*` function secrets, deploy
`payments-create-order` / `payments-verify` / `payments-webhook`, and add a
`payment.captured` webhook in the Razorpay dashboard. **Going live** holds real
customer funds as a balance, which in India needs an RBI Prepaid Payment
Instrument licence or a licensed PPI / escrow partner.

### Simulated settlement workflow

`simulate-settlement` is an authenticated Edge Function and the only caller of
the private `advance_simulated_settlement`. It accepts a settlement ID, action,
and UUID idempotency key — never an amount or status. Run the DB tests after
reset:

```powershell
supabase test db --local supabase/tests/settlement_workflow.sql
```

### Offline / installable

`public/manifest.webmanifest` + `public/sw.js` make the app installable and
cache the shell for offline launch (production builds only). The service worker
never touches Supabase or API requests, so it cannot serve stale data.

---

## Security model

- Frontend uses only browser-safe keys; `SUPABASE_SERVICE_ROLE_KEY`,
  `LLM_API_KEY`, and `RAZORPAY_*` are Edge Function secrets, never `VITE_` vars.
- Row-level security is enabled on every application table.
- Settlement, wallet, and payment writes are server-only, idempotent, and audited.
- Guests are anonymous authenticated users, kept out of shared business records by policy.

---

## Team

| Member | Role | Contribution Area |
|--------|------|-------------------|
| Dev Bansal | Team Leader | Project direction, architecture, Supabase backend, and deployment |
| Krish Maheshwari | Frontend Developer | React UI, the payments experience, multilingual and accessibility work |
| Samarth Agor | Backend Developer | Supabase Edge Functions, wallet and settlement logic, and database schema |
| Tilak Jha | Research & Compliance Analyst | Rural payments research, RBI / PPI risk framework, and documentation |

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
