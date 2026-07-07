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
- ✅ Supabase Auth (email + password) with friendly errors + resend-confirmation;
  session-aware composition root + auth gate. `supabase/config.toml`.
- ✅ Google sign-in (OAuth via system browser → `rabbitdiary://` deep link).
- ✅ Settings screen: account, currency, sign out, and **CSV export** (share the
  year's transactions to open in Excel/Sheets — continuity with the spreadsheet).
- ✅ **Live period / real date-time management**: removed every hardcoded
  `YearMonth.of(2026, 4)` / `const YEAR = 2026`. A shared `PeriodProvider`
  (`src/lib/period.tsx`) defaults to the real current month (`YearMonth.fromDate(new Date())`)
  and drives the dashboard, activity, insights, report, budget(s), yearly and
  settings screens. The dashboard header carries a month switcher (prev/next,
  "next" disabled once you reach the current month). Date formatting moved to
  **dayjs**. Demo data is now anchored to the live current + previous month, so
  the dashboard is never empty regardless of when the app is opened.
- ✅ **Edit & delete transactions**: tap any row (dashboard, activity, account
  ledger) → detail screen preloaded with its fields (keypad + category/account
  pickers + note). `EditTransaction` rebuilds the aggregate from its snapshot so
  invariants re-check and the category type/direction re-denormalise on a move;
  `DeleteTransaction` removes it (with a confirm). `GetTransaction` loads the
  detail. Covered by unit tests.
- ✅ **Smart voice parse**: the live transcript is sent to the deployed
  `transcribe` Edge Function (text mode, gpt-4o-mini) to fill amount, category &
  a clean note; on-device word parser is the instant/offline fallback.
- ⬜ Apple sign-in (App Store requires it alongside Google); biometric lock
  (expo-local-authentication — Settings toggle exists & persists, not yet
  enforced); offline cache so demo data persists across reloads.
- ⬜ E2E happy paths; ship to TestFlight / Play internal testing.

### Phase 7 — Light/dark theming + full redesign (in progress)
Driven by `design/Rabbit Dairy Redesign.html` (the 19-screen mock set).
- ✅ Dual **light + dark** palettes; `ThemeProvider` + `useTheme` /
  `useThemeControls`; persisted mode (System/Light/Dark) wired to Settings.
- ✅ Domain→Ionicons icon map (no emojis anywhere); shared theme-aware UI
  (`Card`, `Pill`, `MoneyText`, `Tico`, `ModalHeader`, `PageHeader`, `Toggle`…).
- ✅ Screens matched to the mocks: Welcome, Auth, Dashboard, Transactions,
  Transaction detail (read-only + edit), Add hub, Manual, Voice (record→review),
  Scan + OCR review, Accounts, Account detail, Budgets, Budget-vs-Actual,
  Monthly report, Yearly, Settings. Tab bar with raised circular FAB.
- ✅ LottieFiles wired (voice waveform); modal top-inset/spacing bugs fixed;
  type scale calibrated to the doc's values.
- ⬜ **Categories screen (mock 18)** — not built yet (no route/entry point).
- ⬜ Final visual QA pass on a device across both themes.

---

## 3. Tech choices

| Concern | Choice |
|---|---|
| App framework | Expo SDK 54, expo-router v6 (file-based nav) |
| Language | TypeScript throughout, strict mode |
| State/data | TanStack Query over the application-layer queries |
| Dates | dayjs (formatting) + domain `YearMonth` (accounting period) |
| Backend | Supabase — Postgres, Auth, Storage, Edge Functions |
| Voice / camera | expo-speech-recognition (live STT), expo-image-picker, lottie-react-native |
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
