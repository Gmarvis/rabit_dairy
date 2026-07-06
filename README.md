# Rabbit Dairy

Personal financial tracker. **Expo (React Native)** app + **Supabase**, built as
an npm-workspaces monorepo using **DDD + CQRS**. Currency **XAF (FCFA)**.

Log spending three ways: **type** it, **speak** it (recording a short "why"), or
**scan** a bank / mobile-money statement and confirm the parsed rows. Track
balances across multiple accounts (salary, savings, dormant, mobile money, cash),
with savings deposits/withdrawals captured by snapping the receipt.

## Layout

```
apps/mobile           Expo app — expo-router, the screens, the pine/gold UI kit
packages/domain       Pure business model (Money, Account, Transaction, Budget…)
packages/application  Use cases — CQRS commands + queries, repository ports
packages/infra        Supabase adapters implementing the ports
supabase/             SQL schema, Row-Level Security, per-user seed
design/ui-flow.html   The full 19-screen UI flow
```

See **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** for the phased roadmap.

## Develop

```bash
npm install                                   # all workspaces
( cd packages/domain && npx vitest run )      # domain unit tests
( cd packages/application && npx vitest run ) # use-case tests

npm run start -w @rabbit/mobile               # Expo dev server
```

The app runs against **built-in demo data** (the April 2026 spreadsheet figures)
until you configure Supabase. Copy `apps/mobile/.env.example` to
`apps/mobile/.env` and fill the two `EXPO_PUBLIC_SUPABASE_*` values to switch to a
live backend.

### Supabase

```bash
supabase start        # local stack (Docker)
supabase db reset     # apply supabase/migrations + seed on signup
```
