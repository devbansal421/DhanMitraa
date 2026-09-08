# DhanMitraa

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local`, then enter the Supabase project URL and publishable key.
3. Run `npm install` and `npm run dev`.

## Authentication setup

Email-confirmation links should never use a production `localhost` address. Set
`VITE_AUTH_REDIRECT_URL` in the deployed environment to the public application
URL (for example, `https://app.example.com`). In **Supabase Dashboard → Authentication → URL Configuration**, set that same address as the **Site URL** and add it to **Redirect URLs**. Keep the local Vite address there too when developing locally (for example, `http://localhost:5173`). The application sends this URL explicitly with email sign-up; the dashboard setting remains the safe fallback for recovery and other email flows.

The sign-in page supports Supabase Anonymous Sign-Ins. In **Supabase Dashboard → Authentication → Settings**, enable **Allow anonymous sign-ins** to give guests a temporary authenticated session. If anonymous sign-in is unavailable, the app shows the Supabase error rather than pretending a local workspace was opened. Anonymous accounts are intentionally restricted by RLS; do not grant them membership, settlement, payment, or document access.

## Database setup

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), authenticate it, link the project, then apply migrations:

```powershell
supabase login
supabase link --project-ref wjgwpplsdrecnbeskcvx
supabase db push
```

For a local development database, start Supabase and load the demo records:

```powershell
supabase start
supabase db reset
```

`supabase/seed.sql` creates a **local-only** development account:

- Email: `ravi@dhanmitraa.local`
- Password: `ChangeMe123!`

Never run the seed script against a production project. Change the development password if that database is accessible outside your machine.

## Security model

- The frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; both are intended for browser use.
- Do not add `SUPABASE_SERVICE_ROLE_KEY` to a Vite variable or frontend file. Payment webhooks, settlement execution, document verification, and other privileged work belong in Supabase Edge Functions.
- Row-level security is enabled on all application tables. Members may see only their organization’s crop/contract/insight data; settlement and payment writes are server-only.
- Crop, contract, network, and settlement screens read Supabase data. Insights are still illustrative mock data and must not be presented as a customer-specific assessment.
- A guest is an authenticated Supabase user with an `is_anonymous` claim, not the unauthenticated `anon` database role. Policies explicitly keep these sessions out of shared reference and business records.

## Frontend data migration

The crop, obligation, contract, network, and settlement **read** slices now use
repositories in `src/services/`; page components do not call Supabase directly.
They show loading, empty, permission-denied, retry, and error states instead of
falling back to mock records. Apply migrations through `202609080007` and use
`supabase db reset` locally to load the development settlement record.

Obligation creation/editing is not exposed until the UI can select a verified
payee organization and submit the required approval workflow. Settlement actions
must use the simulated server workflow; it never creates payment intents,
invokes a provider, or moves money.

## Simulated settlement workflow

`simulate-settlement` is an authenticated Edge Function; deploy it after the
migrations with `supabase functions deploy simulate-settlement`. It is the only
intended caller of the private `advance_simulated_settlement` function. The
function accepts a settlement ID, action, and UUID idempotency key—never an
amount or desired status. PostgreSQL snapshots locked obligations, computes and
balances allocations, enforces the role-specific transition, and appends an
immutable event plus audit record. It does not call a payout provider.

Run the database workflow tests locally after reset:

```powershell
supabase test db --local supabase/tests/settlement_workflow.sql
```

## Wallet (simulated payments)

The **Payments** screen is a client-side simulation: the ledger lives in the
browser's `localStorage`, no bank or UPI is connected, and no real money moves.
It exists to prove the payment experience (send / request / add money, pay
obligations, receipts, an offline queue that syncs on reconnect). Promoting it to
a shared, server-backed wallet is Phase 2 of the roadmap.

## Multilingual support

UI text is translated through `src/i18n/`. `en.ts` is the source of truth;
`hi.ts` is a full Hindi translation; `mr.ts`, `bn.ts`, `ta.ts` cover core
strings and fall back to English. To add or complete a language, copy `en.ts`,
translate the values, register it in `src/i18n/index.tsx` (`DICTIONARIES` and
`LANGUAGES`), and add its display name (`lang.<code>`) to every dictionary. The
language picker lives in the Settings menu (gear icon) and persists to
`localStorage`.

## AI help assistant (`assistant` Edge Function)

The in-app assistant ("Sahayak") answers navigation and how-to questions in the
user's chosen language. The browser calls the `assistant` Edge Function, which
holds the model API key as a **secret** — never a `VITE_` variable.

The function is provider-agnostic. **Free option (recommended):** a Groq key
(`console.groq.com`, no card). It also works with any OpenAI-compatible endpoint
(Google Gemini's OpenAI endpoint, OpenRouter, …) by changing `LLM_BASE_URL` /
`LLM_MODEL`, or with Claude by setting `ANTHROPIC_API_KEY` instead.

```powershell
# put keys in supabase/.env (copy from supabase/.env.example), then:
supabase secrets set --env-file supabase/.env
supabase functions deploy assistant
```

| Secret | Purpose |
|---|---|
| `LLM_API_KEY` | Groq (or other OpenAI-compatible) key — the free path |
| `LLM_BASE_URL` | default `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | default `llama-3.3-70b-versatile` |
| `ANTHROPIC_API_KEY` | use instead of `LLM_API_KEY` to run Claude |

Until it is deployed and keyed, the assistant panel shows a clear "not set up
yet" message and the rest of the app is unaffected.

## Payment gateway (Razorpay, test mode)

"Add money" can use a real gateway. **Default: off** (built-in simulation).

**Test mode is free.** A Razorpay signup (email + phone OTP) gives test API
keys immediately — no KYC, no business details, no card, no charges. Test
payments use fake cards. KYC is only needed to go *live* and receive real money.

```powershell
# frontend flag
#   .env.local:  VITE_PAYMENTS_PROVIDER=razorpay
# function secrets (use Razorpay TEST keys from dashboard.razorpay.com):
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx
supabase secrets set RAZORPAY_KEY_SECRET=xxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxx   # same value set in the Razorpay dashboard webhook
supabase functions deploy payments-create-order
supabase functions deploy payments-verify
supabase functions deploy payments-webhook --no-verify-jwt
```

Then in the Razorpay dashboard add a webhook pointing at
`https://<project-ref>.functions.supabase.co/payments-webhook` for the
`payment.captured` event.

Flow: the browser asks `payments-create-order` for an order (the secret key
stays server-side) → Razorpay Checkout opens → on success the browser calls
`payments-verify` (HMAC signature check) → the `payments-webhook` reliably
credits the wallet ledger even if the browser closes.

**Test mode moves no real money.** Going live holds real customer funds as a
wallet balance, which in India needs an RBI Prepaid Payment Instrument licence
or a licensed PPI / escrow partner. Do not point live keys at this without that.

## Server-backed wallet (Phase 2)

`supabase/migrations/202609080008_wallet.sql` adds `wallet_accounts`,
`wallet_ledger` (append-only, balance kept in sync by trigger) and
`payment_orders`, all read-only under RLS. `wallet-transfer` is the only
authorised way to spend — it mirrors `simulate-settlement`: the client sends an
amount, a kind and a UUID idempotency key, never a balance or a status.

```powershell
supabase db reset            # test the migration locally first
supabase db push             # then apply to the linked project
supabase functions deploy wallet-transfer
#   .env.local:  VITE_WALLET_BACKEND=supabase
```

With the flag on and the migration applied, the wallet reads its balance and
ledger from the server and routes spends through `wallet-transfer`; any failure
(flag off, migration missing, offline, guest) silently falls back to the
localStorage simulation.

`credit_wallets_for_settlement(settlement_id, idempotency_key)` (in the same
migration) is the Phase 3 hook — call it from `advance_simulated_settlement`
after `execute` to pay each party's wallet.

## Offline / installable

`public/manifest.webmanifest` and `public/sw.js` make the app installable to a
phone home screen and cache the app shell for offline launch (production builds
only). The service worker never touches Supabase or API requests, so it cannot
serve stale data.

## Verification

```powershell
npm run typecheck
npm run lint
npm run build
```
