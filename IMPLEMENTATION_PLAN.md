# Rabbit Dairy — Implementation Plan

Personal finance tracker. **Expo (React Native)** app, **Supabase** backend, an
**npm-workspaces monorepo** organised with **DDD + CQRS**. Currency **XAF (FCFA)**.

The UI is designed screen-by-screen in [`design/ui-flow.html`](design/ui-flow.html)
(19 screens across 6 flows). This document is the build roadmap.

---

## 1. Architecture at a glance

```
rabit_dairy/
├── apps/
│   └── mobile/            Expo app — expo-router, the screens, the UI kit
├── packages/
│   ├── domain/            Pure business model — entities, value objects, rules
│   ├── application/       Use cases — Commands (write) + Queries (read) = CQRS
│   └── infra/             Adapters — Supabase implementations of the ports
└── supabase/
    ├── migrations/        SQL schema + Row-Level Security
    └── seed.sql           Starter categories & accounts
```

**Dependency rule (points inward):** `infra → application → domain`. The app
depends on `application` (and `domain` types); `domain` depends on nothing. This
keeps the rules testable in isolation and swappable at the edges.

### Why DDD + CQRS here
- **Domain** owns the invariants your spreadsheet encoded in formulas — signed
  balances, savings rate, budget variance — so they live in one place, not
  scattered across screens.
- **Commands** change state (`LogTransaction`, `RecordSavingsMovement`,
  `ImportStatement`, `SetBudget`). **Queries** read shaped view-models
  (`GetDashboard`, `GetMonthlyReport`, `GetBudgetVsActual`). Reads and writes
  have different shapes, so we model them separately.

### Core domain model
- **Money** — value object, integer minor units, XAF has none (whole francs).
- **Account** — salary / savings / dormant / mobile-money / cash. Has a type,
  optional institution + mask, `isPrimary`, `isDormant` (dormant is excluded
  from net-worth totals).
- **Category** — one of 5 types (income, fixed/variable expense, savings,
  business cost), a colour, and a default payment method. Seeded from the sheet.
- **Transaction** — belongs to one Account and one Category, has a `direction`
  (`in`/`out`) giving its signed effect on that account, an amount, a date, a
  payment method, and a `source` (manual / voice / scan / receipt). Optionally
  carries a **voice-note** path (the spoken "why") and a **receipt/statement**
  image path.
- **Budget** — a planned amount per Category per (year, month).

Account balance = `opening + Σ(in) − Σ(out)` over its transactions. Transfers
(e.g. salary → savings) are two linked legs sharing a `transferId`.

---

## 2. Phased roadmap

### Phase 0 — Scaffolding ✅ (this commit)
- Monorepo workspaces, shared `tsconfig`, lint/format config.
- Package skeletons for domain / application / infra.
- Expo app shell: theme tokens, tab navigation, first screens.

### Phase 1 — Domain + data layer ✅ (this commit)
- Money, Account, Category, Transaction, Budget with their rules + unit tests.
- Supabase schema + RLS migrations; seed categories & accounts.
- Ports (repository interfaces) in `application`.

### Phase 2 — Read side (Queries) ✅
- `GetDashboard`, `GetAccountsOverview`, `GetAccountLedger`,
  `GetMonthlyReport`, `GetBudgetVsActual`, `GetYearlyOverview` — all built.
- Screens: Dashboard, Accounts, **Account detail** (balance sparkline + ledger),
  Insights hub → **Monthly Report** (donut + top 5), **Budget vs Actual**,
  **Yearly Overview** (12-month bars). Wired through the composition root.
- (Postgres views for reports remain a later optimisation; queries currently
  aggregate in the application layer.)

### Phase 3 — Write side (Commands) + manual capture ✅
- Commands: `LogTransaction`, `RecordSavingsMovement`, `SetBudget`,
  `CreateAccount` — all built.
- Screens: manual entry (keypad + pickers), **Budgets editor** (per-category
  caps, grouped by type), **Savings deposit/withdrawal** (keypad; receipt
  attach lands in Phase 5), **Add account** (type/institution/opening balance).
  Reached from the ＋ hub, the Budget-vs-Actual screen, account detail, and the
  Accounts header.

### Phase 4 — Voice capture ✅
- **Live on-device transcription** via `expo-speech-recognition`: words appear as
  you speak; the final transcript is saved as the "why" (`voiceTranscript`).
- `word2num` extracts the amount from the spoken phrase ("forty thousand five
  hundred" → 40500) and the category is keyword-matched — both pre-filled for the
  user to confirm. Saved via `LogTransaction` (`source: "voice"`).
- **Lottie** (`lottie-react-native`) pulsing voice indicator while listening
  (`assets/lottie/listening.json` — swappable for any LottieFiles animation).
- (A Whisper Edge Function `transcribe` also exists as a server-side fallback.)

### Phase 5 — Scan & import ✅
- `expo-image-picker` (camera + gallery). Statement image sent inline to the
  `parse-statement` Edge Function (OpenAI vision) — image is NOT stored, only
  the extracted rows. `ImportStatement` command persists the user-confirmed set
  (source "scan").
- **Scan screen**: capture/upload → parse → **review** (per-row checkboxes,
  auto-mapped categories, account picker) → confirm-before-import.
- **Savings receipt-snap**: the savings deposit/withdrawal screen now attaches a
  receipt (camera/gallery → `receipts` bucket) to the movement.
- (Duplicate detection across already-logged rows remains a follow-up.)

### Phase 6 — Auth, sync, hardening (in progress)
- ✅ Supabase Auth (email + password): sign-in/up screen, session-aware
  composition root, auth gate. `supabase/config.toml` + `db push` workflow.
- Phone OTP + OAuth; onboarding polish.
- Offline-first cache + sync; biometric lock; Excel/CSV export.
- E2E happy paths; ship to TestFlight / Play internal testing.

---

## 3. Tech choices

| Concern | Choice |
|---|---|
| App framework | Expo SDK 51+, expo-router (file-based nav) |
| Language | TypeScript throughout, strict mode |
| State/data | TanStack Query over the application-layer queries |
| Backend | Supabase — Postgres, Auth, Storage, Edge Functions |
| Audio / camera | expo-av, expo-camera, expo-image-picker |
| Testing | Vitest for domain/application; Maestro for app E2E |
| Monorepo | npm workspaces (no extra tooling to start) |

---

## 4. Getting started

```bash
npm install                      # install all workspaces
npm run test -w @rabbit/domain   # run domain unit tests

# Supabase (once the CLI is set up):
supabase start                   # local stack
supabase db reset                # apply migrations + seed

# Mobile app:
npm run start -w @rabbit/mobile  # Expo dev server
```

Environment: copy `apps/mobile/.env.example` to `.env` and fill
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

## 5. What's intentionally deferred
- Exact OCR accuracy per bank / mobile-money statement format (Phase 5 — the
  review step means the app is trustworthy regardless of parser quality).
- On-device vs. server transcription split (Phase 4 — depends on provider).
- Multi-currency (model stores a currency per account; UI assumes XAF for now).
