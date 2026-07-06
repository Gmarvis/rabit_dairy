-- Rabbit Dairy — initial schema
-- Money is stored as BIGINT minor units. XAF (FCFA) has no minor unit, so one
-- unit == one franc. Every row is owned by a user (auth.users).

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type category_type as enum (
  'income', 'fixed_expense', 'variable_expense', 'savings', 'business_cost'
);

create type account_type as enum (
  'bank_salary', 'bank_savings', 'bank_other', 'mobile_money', 'cash'
);

create type payment_method as enum (
  'cash', 'mobile_money', 'bank_card', 'bank_transfer', 'other'
);

create type txn_direction as enum ('in', 'out');

create type txn_source as enum ('manual', 'voice', 'scan', 'receipt');

-- ---------- accounts ----------
create table accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  type            account_type not null,
  currency        text not null default 'XAF',
  institution     text,
  mask            text,
  opening_balance bigint not null default 0,
  is_primary      boolean not null default false,
  is_dormant      boolean not null default false,
  created_at      timestamptz not null default now()
);
create index accounts_user_idx on accounts (user_id);

-- ---------- categories ----------
create table categories (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  name                   text not null,
  type                   category_type not null,
  color                  text not null default '#888888',
  default_payment_method payment_method,
  is_archived            boolean not null default false,
  created_at             timestamptz not null default now()
);
create index categories_user_idx on categories (user_id);

-- ---------- transactions ----------
create table transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  account_id       uuid not null references accounts (id) on delete restrict,
  category_id      uuid not null references categories (id) on delete restrict,
  category_type    category_type not null,      -- denormalised for fast reporting
  direction        txn_direction not null,
  amount           bigint not null check (amount > 0),
  currency         text not null default 'XAF',
  occurred_at      timestamptz not null,
  description      text,
  payment_method   payment_method,
  source           txn_source not null default 'manual',
  voice_note_path  text,
  voice_transcript text,
  receipt_path     text,
  transfer_id      uuid,                          -- links the two legs of a transfer
  created_at       timestamptz not null default now()
);
create index transactions_user_period_idx
  on transactions (user_id, occurred_at desc);
create index transactions_account_idx on transactions (account_id);
create index transactions_category_idx on transactions (category_id);

-- ---------- budgets ----------
create table budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  year        int not null,
  month       int not null check (month between 1 and 12),
  amount      bigint not null default 0 check (amount >= 0),
  created_at  timestamptz not null default now(),
  unique (user_id, category_id, year, month)
);
create index budgets_user_period_idx on budgets (user_id, year, month);

-- ---------- read model: account balances ----------
-- opening_balance + signed sum of the account's transactions.
create view account_balances as
select
  a.id as account_id,
  a.user_id,
  a.opening_balance
    + coalesce(sum(case when t.direction = 'in' then t.amount
                        else -t.amount end), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id
group by a.id, a.user_id, a.opening_balance;
