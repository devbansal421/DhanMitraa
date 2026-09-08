# DhanMitraa — Explain Everything (for the team)

You do not need to understand the code. You need to understand **what each part
does and why**. This document gives you that, in plain language, plus answers to
every question a judge is likely to ask.

Read it once tonight. Tomorrow, each person "owns" one section (see the cheat
sheet at the end).

---

## PART 1 — What is this project, in one breath

> **DhanMitraa is a phone app for farmers that does two things: it lets them pay
> the people involved in a crop safely, and it advises them what crop to plant
> and how much money they'll actually keep.**

Everything else is detail.

---

## PART 2 — The problem we're solving

**Problem 1: Rural payments run on trust and paper, and both fail.**
One crop = paying a seed seller, a transporter, hired labour, a tractor owner —
then waiting for one buyer to pay you back. There's no shared record. So there
are constant fights: *"I paid you." "No you didn't."* Middlemen exploit the gap.

**Problem 2: Farmers choose crops blind.**
A farmer picks a crop from habit or a neighbour's guess, and only learns the real
economics — after paying for seed, fertiliser, labour — at harvest, when it's too
late.

DhanMitraa attacks both: **payments you can't fake or dispute**, and **crop
advice with the money worked out before you plant**.

---

## PART 3 — What "full-stack" means (the restaurant analogy)

A web app has three layers. Think of a restaurant:

| Layer | Restaurant | In our project |
|---|---|---|
| **Frontend** | The dining room, the menu, the waiter — what you see and touch | The screens on the phone (React) |
| **Backend** | The kitchen — does the real work, you never see it | Our server code (Supabase Edge Functions) |
| **Database** | The store room — every ingredient and every order slip is kept here | Postgres, inside Supabase |
| **API** | The little window where the waiter hands orders in and picks food up | The messages the phone sends to the server |

Golden rule we follow: **the kitchen never trusts the dining room.** The phone
can *ask* for something; the server decides whether to do it.

---

## PART 4 — Every piece of tech, explained simply

### Frontend

- **React** — Instead of one giant web page, you build small reusable pieces
  ("components" — like LEGO bricks: a Button brick, a Card brick) and snap them
  together. When data changes, React redraws only the bricks that changed.
- **TypeScript** — The language browsers actually run is JavaScript. TypeScript
  is JavaScript *with a spell-checker for data types* — it catches "you put a
  word where a number should be" before a user ever sees the bug.
- **Tailwind CSS** — A shorthand for styling (colours, spacing, layout) written
  right next to each piece, so the look and the structure stay together.
- **Vite** — The tool that bundles all our code into a few small files a browser
  can download fast. Also runs the local preview while developing.
- **PWA (Progressive Web App)** — A website that can be *installed* like a real
  app: icon on the home screen, opens full-screen.
- **Service worker** — A tiny helper that saves ("caches") the app's files on the
  phone, so the app still **opens with no internet**.

### Backend + database

- **Supabase** — A "backend in a box". Instead of building and running our own
  server, database, and login system separately, Supabase gives all three as one
  ready service. We only wrote the parts unique to us.
- **PostgreSQL (Postgres)** — The database. A very trusted, decades-old system
  banks and governments use. A **table** is basically a spreadsheet: rows =
  records, columns = fields.
- **Row-Level Security (RLS)** — A rule enforced *by the database itself*: "each
  person can only see their own rows." So even if someone bypassed our app and
  talked to the database directly, they still couldn't read anyone else's data.
- **Edge Function** — A tiny program that runs **on the server**, not on the
  phone, when the phone calls it. We use one for every sensitive action (moving
  money, running a settlement). The phone asks; the function checks the rules and
  does it. Secrets (keys, passwords) live only here, never on the phone.
- **Migration** — A numbered instruction file that changes the database's shape
  (adds a table, a rule, etc.). Run in order, they let any teammate rebuild the
  exact same database from scratch. Our new one is
  `supabase/migrations/202609090001_wallet_closed_loop.sql`.
- **Auth** — Supabase's built-in login (email + password, or "continue as
  guest"). We didn't build login ourselves.

### The advisory engine (the Python service)

- **The original tool** — `KHET KUNDLI/khet_kundli.cpp` is a program written in
  **C++** that runs in a black terminal window. You type in your soil, rainfall,
  season and costs; it prints the best crop and the projected profit.
- **FastAPI** — A tool for quickly building an **API** in **Python**: a web
  address that other programs send a question to and get an answer back. We used
  it to wrap the crop logic so the website (and an AI) can use it.
- **"We ported C++ to Python"** — We rewrote the crop-advice maths from C++ into
  Python (because our website world is Python/JavaScript, not C++), then wrote
  **tests** that feed *both* versions the same inputs and check the answers match
  to the rupee. Proof we didn't change the logic, only the language.
- **Groq / LLM** — An **LLM** (large language model, like ChatGPT) turns our cold
  numbers into a friendly paragraph in the farmer's language. **Groq** is just a
  company that runs these models fast and free. **Crucial point:** the AI never
  picks the crop or the money — a plain, predictable formula does that. The AI is
  only the *voice* that explains the result.

### Hosting + version control

- **Vercel** — Hosts our website on the internet. We push code to GitHub; Vercel
  automatically rebuilds and publishes. Live at
  `https://dhanmitraa-five.vercel.app`.
- **Render** — Where the Python advisory engine can be hosted (a separate service
  from the website).
- **Git / GitHub** — **Git** is an unlimited "save history" for code, with undo
  and branches. **GitHub** is the website where that history lives so the whole
  team shares one copy. Our repo: `github.com/devbansal421/DhanMitraa`.

---

## PART 5 — What actually happens when you tap "Send money"

Follow the money:

1. You open **Send money**. The app shows a **list of verified participants**
   (real suppliers, buyers, transporters) — it loaded that list from the
   database. **There is no box to type a name.**
2. You pick "Greenfield Fertilizers", type **₹5,000**, tap **Review**, then
   **Confirm**.
3. Your phone sends one message to our **Edge Function**: *"pay participant #123,
   ₹5,000, ticket #abc-123."* It does **not** send a balance or a "mark this as
   done" — just the request.
4. The Edge Function checks: Are you logged in with a real account? Is #123
   actually a registered participant? Is the amount sane?
5. It tells the database: **do this transfer.**
6. The database does it in **one unbreakable step**: subtract ₹5,000 from you,
   add ₹5,000 to them, write **two ledger lines**, and **refuse the whole thing**
   if it would push your balance below zero.
7. It returns your new balance and a receipt reference (e.g. `DM-8F3K2P`).
8. Your phone shows the receipt.
9. **If you were offline** at step 3: the request is saved on your phone and
   automatically retried when signal returns — with the *same ticket #*, so it
   can never pay twice.

---

## PART 6 — The wallet: what we built and why it's the headline

### What it was before (the thing that was broken)

The old wallet was just **a number stored in the phone's memory**. You could:
- press "Add money" and invent ₹50,000 from nothing,
- type any name — a person who doesn't exist anywhere — and "pay" them,
- reset it whenever.

It was Monopoly money. One of the judges' own critiques would have been "this
isn't real."

### What it is now — a "closed-loop ledger"

Think **metro card** or **arcade tokens**: real value, fully tracked, but only
spendable *inside* the system. Real bank money doesn't enter or leave (that needs
a licence from the Reserve Bank of India — explained in the Q&A). But inside,
every rupee is real and accounted for.

Four guarantees, all enforced by the **database**, not by our app (so they can't
be bypassed):

1. **Double-entry** — Every payment is written **twice**: −₹5,000 from the sender
   *and* +₹5,000 to the receiver, in one step. They must cancel out. This is how
   banks and accountants have tracked money for 500 years. Money cannot appear or
   vanish.
2. **You can only pay a real, verified participant.** No typed-in names. No
   "ghost" payees. The old "steal from a fake person" trick is impossible.
3. **You cannot overdraw.** The database physically refuses any change that would
   make a balance negative.
4. **History is immutable.** Once a payment line is written, nobody — not even us
   — can edit or delete it. You can only add new lines. So the record can't be
   faked after the fact.

Plus:
- **Row-Level Security** — you can only ever see *your own* ledger.
- **Idempotency key** ("ticket number") — a repeated request (bad signal, double
  tap) is recognised and ignored, never paid twice.
- **Offline outbox** — payments made with no signal are queued and replayed
  safely when you reconnect.

**One-line summary for judges:** *"We replaced a fake number in the browser with
a real, tamper-proof, double-entry ledger in the database. You can't invent
money, you can't pay someone who doesn't exist, you can't overdraw, and you can't
edit history."*

---

## PART 7 — The advisory engine: what it does

### The maths (no AI involved here — this is a fixed formula)

You give it: **soil pH, expected rainfall, season, land size, your costs.**
It does:

1. **Season gate** — a monsoon (Kharif) crop is *never* suggested for a winter
   (Rabi) season. Hard rule.
2. **Match score** — each eligible crop gets a score out of 1.0:
   `0.50` for being in-season `+ 0.30 ×` how well the rainfall fits the crop's
   ideal range `+ 0.20 ×` how well the soil pH fits. "Fit" is 1.0 inside the
   ideal range and drops off smoothly outside it.
3. **Yield estimate** — from a small table of "at this rainfall, expect this
   yield" points for each crop, it draws a straight line between the two closest
   points to estimate your yield. It never guesses beyond the data it has.
4. **Money** — yield × your acres × the crop's price − fertiliser cost − the
   costs you entered = **projected profit**.
5. It returns the **best crop** plus ranked runners-up.

Example we demo: 3 acres, pH 5.6, 1500 mm rain, Kharif → **Rice**, score 1.0,
~1,800 kg/acre, ₹1,18,800 revenue, **₹99,300 profit**.

### Why "we ported C++ to Python and tested it" is impressive

We had a working tool in C++. We rewrote its brain in Python so the website could
use it. Then we wrote **automated tests** that take real results the old C++ tool
produced and check the Python version produces **exactly the same numbers**. 16
tests, all passing. That means the web advice is provably identical to the
reference tool — not a rushed re-implementation with hidden bugs.

### What the AI adds

The AI takes the engine's finished numbers and writes 3–4 simple sentences **in
the farmer's language** — why this crop suits the season and soil, the money in
plain words, and 2–3 risks to watch. It is told, firmly, **never to change the
crop or any number.** If there's no AI key configured, the app still shows all
the numbers — it just skips the paragraph.

---

## PART 8 — The architecture, in one picture (in words)

```
  Farmer's phone
     │   (a website that installs like an app, works offline, 5 languages)
     ▼
  React app  ──────────►  Vercel   (hosts the website)
     │
     │  asks for things ─────►  Supabase
     │                            ├─ Auth        (login)
     │                            ├─ Postgres    (all data; every table locked by Row-Level Security)
     │                            └─ Edge Functions  (the ONLY code allowed to move money / run settlements)
     │
     └─ asks for crop advice ───►  Python advisory engine  ──►  Groq LLM (writes the explanation)
                                     (ported from the original C++ tool; tested to match it)
```

Secrets (API keys, the service password) live **only** in the Edge Functions and
the Python service. The phone never sees them.

---

## PART 9 — What's done vs. what's planned (be honest — judges respect this)

**Working now:**
- The whole app UI, live on Vercel — overview, crops, contracts, network,
  settlement view, wallet.
- 5-language switching, larger-text mode, low-data mode, offline launch.
- The **closed-loop wallet**: migration + Edge Function + redesigned UI. *(The
  UI is live; the database migration is one command away from being live —
  we kept it un-deployed to avoid changing the demo DB mid-hackathon.)*
- The **advisory engine**: runs, 16 tests pass including the C++-parity tests,
  live API docs, AI narrative when a key is set.

**Planned next (say this if asked "what would you add"):**
- The advisory screen wired directly into the app (right now the engine runs as
  its own service).
- **Escrow-backed settlement**: the buyer's money is held, and at harvest it's
  split automatically to the farmer + everyone owed, in one atomic step.
- Live **weather** and **mandi (market) price** feeds into the advisory.
- A partnership with a licensed payments provider to connect real bank money.

---

## PART 10 — File map (if a judge points at the screen)

| File / folder | What it is |
|---|---|
| `src/` | The React app — every screen and component |
| `src/pages/WalletPage.tsx` | The Payments screen |
| `src/components/PaymentSheet.tsx` | The "Send money" pop-up with the verified-participant picker |
| `src/wallet.tsx` | The app's wallet logic — talks to the server, handles the offline queue |
| `supabase/migrations/202609090001_wallet_closed_loop.sql` | The database blueprint for the real ledger — tables, the "can't overdraw" rule, the "can't edit history" rule, the transfer function |
| `supabase/functions/wallet-transfer/` | The server code that is the *only* thing allowed to move money |
| `advisory-engine/app/scoring.py` | The crop-fit + profit maths (ported from C++) |
| `advisory-engine/app/ai.py` | The layer that asks the LLM to explain the result |
| `advisory-engine/app/main.py` | The API — the 3 web addresses the engine answers on |
| `advisory-engine/tests/test_scoring.py` | The tests that prove Python == the original C++ |
| `KHET KUNDLI/khet_kundli.cpp` | The original C++ tool this all grew from |

---

## PART 11 — Judge Q&A (say the **bold** line; the rest is backup)

**Q: Is this real money?**
**"No — it's a closed-loop ledger, like a metro card. Real value moves between
accounts inside the system, but it's not connected to a bank."** Holding real
public money as a balance in India legally requires an RBI Prepaid Payment
Instrument licence. Our architecture is exactly what a licensed provider uses —
the only missing piece is the licence, not the engineering.

**Q: How is this different from GPay / PhonePe / UPI?**
**"Those move money between any two people and assume trust already exists. We're
built for a low-trust setting: you can only pay *verified participants* in your
crop network, every payment is on a shared tamper-proof record, and the same app
tells you what to plant."** UPI is a payment rail; we're a trust + decision layer
for one specific hard problem.

**Q: What's actually innovative here?**
**"Three things. One: payments you can't fake or dispute, designed for a setting
where the core problem is 'he says he paid, she says he didn't'. Two: we put the
money and the farming decision in one app — nobody does both. Three: our crop
engine's output is automatically tested to match our original reference tool to
the rupee, so the advice is provably correct, not a rushed guess."**

**Q: Why build your own ledger? Why not just use Razorpay / Stripe?**
**"Those are for taking a card payment. They don't give you a multi-party,
tamper-proof record of who owes whom across a whole crop cycle — that's the
actual problem here."** We do have Razorpay wired in as an optional "top up"
path for later.

**Q: What stops someone from hacking the wallet and giving themselves money?**
**"Every money rule is enforced by the database itself, not by the app."** The
phone can't write to the money tables at all (Row-Level Security). The only code
that can is one server function that checks who you are, checks the recipient is
real, and does the transfer in one step that the database rejects if it would
overdraw or unbalance. History can't be edited or deleted.

**Q: Which AI model? How does the AI work?**
**"We use an open model (Llama 3.3) served free by Groq. It only *explains* the
result — a fixed formula picks the crop and does the money maths. The AI is told
never to change a number."** If the AI is down or unconfigured, the app still
shows the full advice, just without the paragraph.

**Q: Is the AI just a ChatGPT wrapper?**
**"No. The decision engine is deterministic maths ported from our own C++ tool
and covered by tests. The LLM is a thin translation layer on top."** That's the
opposite of a wrapper — the intelligence is ours, the LLM is optional polish.

**Q: Does it really work offline?**
**"Yes. It's a Progressive Web App — it installs to the home screen and the app
shell is cached, so it opens with no internet. Payments made offline are queued
and sent automatically when signal returns, with a safeguard so they can't send
twice."**

**Q: Why two languages — C++ and Python?**
**"The original advisor was a C++ terminal tool one of us built. For the web we
needed it as a service the site and the AI could call, so we ported the logic to
Python and wrote tests proving the two produce identical results."** Right tool
for each job; the tests keep them honest.

**Q: Is the data real?**
**"The crop reference data (pH ranges, rainfall-to-yield curves, prices) is
starter data — we're explicit that it must be replaced with district-approved
figures before real use. The engine and the tests are real. The demo farmer and
suppliers are seeded sample records."**

**Q: How is farmer data kept private?**
**"Row-Level Security on every table. A farmer's account can only read its own
rows — its own crops, its own wallet, its own ledger. That's enforced by the
database, so it holds even if someone bypasses our app."**

**Q: What happens if the network drops in the middle of a payment?**
**"Two protections. The transfer is one atomic database step — it either fully
happens or not at all, never half. And every request carries a unique ID, so if
the phone retries, the server recognises it and doesn't repeat the payment."**

**Q: How accurate is the crop advice?**
**"The *method* is sound — season eligibility, soil and rainfall fit, yield
interpolated from real data points, full cost accounting. The *accuracy* depends
on the input data, which is why we flag that the reference table needs local
calibration. It's a planning aid, not a guarantee — and we say that in the
output."**

**Q: Who are your users and how do they get this?**
**"Small and marginal farmers and the small businesses around them — suppliers,
transporters, buyers. Distribution would be through farmer producer
organisations, cooperatives, and agri-input dealers who already have the trust
and the reach."** It's a web app, so there's nothing to install from a store.

**Q: What's the business model?**
**"A small fee per settled transaction, paid by the buyer or the aggregator —
not the farmer. Optionally, premium analytics for cooperatives and lenders who
want visibility into repayment reliability."** The farmer side stays free.

**Q: How does this scale?**
**"The database (Postgres) and the hosting (Vercel, Supabase) are standard
managed services that scale horizontally. The advisory engine is stateless — you
just run more copies behind a load balancer."** Nothing here is a bottleneck at
realistic scale.

**Q: What was the hardest part?**
Pick a real one and be honest, e.g. **"Making the wallet genuinely safe. It's
easy to fake a balance; it's hard to make a ledger that can't be cheated even by
us. We had to push every rule down into the database itself."**

**Q: How much of this did you build vs. use AI to build?**
**"We designed the architecture, the features, and the security model. We used AI
coding assistance to implement it faster — which is standard practice now — and
we understand what every part does."** (This document is proof you do — study it.)

**Q: If you had one more week?**
**"Wire the advisory screen into the app, make settlement a real escrow split at
harvest, and plug in live weather and market-price data."**

---

## PART 12 — If a judge asks something you don't know

1. **Don't bluff.** Judges catch it instantly and it costs you more than "I don't
   know."
2. **Redirect to what you do know:** *"I'm not certain of that detail, but the
   related thing I can tell you is…"*
3. **Hand off:** *"Samarth built that part — Samarth?"* A team that knows who owns
   what looks strong.
4. If it's a genuine gap: *"That's on our list — we haven't solved it yet."* Owning
   a limitation beats faking a strength.

---

## PART 13 — Team cheat sheet (who says what)

| Person | Own this | Be ready for |
|---|---|---|
| **Tilak Jha** | The problem, the users, the business model, the RBI/licence answer | "Why does this matter?", "Who pays?", "Is it legal?" |
| **Krish Maheshwari** | The app itself — the screens, offline, multilingual, accessibility, the Send-money flow | "Show us the app", "Does it really work offline?" |
| **Samarth Agor** | The wallet — double-entry, can't-overdraw, can't-edit-history, Row-Level Security, Edge Functions | "What stops fraud?", "Is this real money?", "How is data private?" |
| **Dev Bansal** | Architecture overall + the advisory engine — C++ → Python, the tests, the AI's role | "What's the tech stack?", "How does the AI work?", "What's innovative?" |

---

## PART 14 — Glossary (one line each)

- **Frontend** — the part you see and touch (the screens).
- **Backend** — server code you don't see; does the real work.
- **Database** — where all records are stored; think spreadsheets.
- **API** — the messages/addresses one program uses to ask another for something.
- **React** — a way to build screens out of small reusable pieces.
- **TypeScript** — JavaScript with a type spell-checker.
- **Supabase** — a ready-made backend: database + login + server functions.
- **Postgres** — the actual database engine; old, trusted, used by banks.
- **Table** — a spreadsheet inside the database.
- **Row-Level Security (RLS)** — DB rule: you can only see your own rows.
- **Edge Function** — a small server program run on demand; holds the secrets.
- **Migration** — a numbered file that changes the database's structure.
- **Ledger** — the running record of every money movement.
- **Double-entry** — every payment written twice (out of one, into another).
- **Closed-loop** — money moves inside the system but not to/from real banks.
- **Immutable** — can't be edited or deleted, only added to.
- **Idempotency key** — a unique ID so a repeated request isn't done twice.
- **Overdraft protection** — the DB refuses to let a balance go negative.
- **PWA** — a website that installs and behaves like an app.
- **Service worker** — the helper that makes offline work.
- **FastAPI** — a Python tool for building an API quickly.
- **Port (verb)** — rewrite code from one language to another, same behaviour.
- **LLM** — large language model (ChatGPT-style AI).
- **Groq** — a company that runs LLMs fast and free.
- **Deterministic** — same input always gives the same output (a fixed formula).
- **Vercel / Render** — services that host your app on the internet.
- **Git / GitHub** — code history + the website that shares it.
- **RBI PPI licence** — Reserve Bank of India permission needed to hold public
  money as a wallet balance.
