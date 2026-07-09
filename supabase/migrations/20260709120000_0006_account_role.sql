-- Give accounts an explicit ROLE, separate from their institution type. The
-- role is what drives the money logic:
--   • spending — everyday money you can freely use (an asset).
--   • savings  — money set aside; its whole balance counts as "saved", and
--     depositing into it is a savings transaction.
--   • credit   — money you owe (a liability); its balance is subtracted from
--     net worth and the combined total.
-- Existing rows are backfilled from their type (a Savings bank → savings,
-- everything else → spending) so nothing changes for current data.

create type account_role as enum ('spending', 'savings', 'credit');

alter table accounts
  add column role account_role not null default 'spending';

-- Backfill: any existing "Savings" bank account becomes a savings-role account.
update accounts set role = 'savings' where type = 'bank_savings';

-- Keep the signup seed in step: the starter Cash wallet is a spending account.
create or replace function public.seed_defaults_for_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Categories: name, type, colour, default payment method (generic starters).
  insert into categories (user_id, name, type, color, default_payment_method) values
    -- Income
    (uid, 'Salary (Net)',            'income', '#26A876', 'bank_transfer'),
    (uid, 'Freelance / Consulting',  'income', '#2FBF87', 'mobile_money'),
    (uid, 'Side Projects',           'income', '#3ED996', null),
    (uid, 'Investments / Dividends', 'income', '#1E7A50', 'bank_transfer'),
    (uid, 'Other Income',            'income', '#5FE0AC', null),
    -- Fixed expenses
    (uid, 'Rent / Mortgage',         'fixed_expense', '#C24B3F', 'bank_transfer'),
    (uid, 'Utilities (Electricity, Water, Gas)', 'fixed_expense', '#D95A4E', 'cash'),
    (uid, 'Internet & Phone',        'fixed_expense', '#E4685C', 'cash'),
    (uid, 'Airtime / Data Top-ups',  'fixed_expense', '#E97767', 'mobile_money'),
    (uid, 'Insurance (Health, Car, etc.)', 'fixed_expense', '#B23B30', 'bank_transfer'),
    (uid, 'Subscriptions (Netflix, Spotify, etc.)', 'fixed_expense', '#CF5145', 'bank_card'),
    (uid, 'Loan / Debt Repayment',   'fixed_expense', '#A83228', null),
    (uid, 'School / Education Fees',  'fixed_expense', '#E07A6E', 'bank_transfer'),
    -- Variable expenses
    (uid, 'Groceries & Food',        'variable_expense', '#BC8623', 'cash'),
    (uid, 'Dining Out / Takeaway',   'variable_expense', '#D69A2D', 'cash'),
    (uid, 'Transport / Fuel',        'variable_expense', '#E0A83E', 'cash'),
    (uid, 'Shopping / Clothing',     'variable_expense', '#C9922A', 'mobile_money'),
    (uid, 'Entertainment / Leisure', 'variable_expense', '#EDB44C', 'mobile_money'),
    (uid, 'Personal Care / Health',  'variable_expense', '#D8A238', 'cash'),
    (uid, 'Household Help / Staff',  'variable_expense', '#B8801F', 'cash'),
    (uid, 'Gifts & Donations',       'variable_expense', '#E8B44C', 'cash'),
    (uid, 'Tithe / Church Giving',   'variable_expense', '#C99A2E', 'cash'),
    (uid, 'Send Money to Family',    'variable_expense', '#DBA636', 'mobile_money'),
    -- Savings
    (uid, 'Emergency Fund',          'savings', '#4E8FD9', 'bank_transfer'),
    (uid, 'Savings Account',         'savings', '#6FA8E8', 'bank_transfer'),
    (uid, 'Investment Account',      'savings', '#3A78C2', 'bank_transfer'),
    (uid, 'Retirement Fund',         'savings', '#5B9BE0', 'bank_transfer'),
    -- Business costs
    (uid, 'Software & Tools',        'business_cost', '#7C6BD6', 'bank_card'),
    (uid, 'Hosting / Domains',       'business_cost', '#9085E9', 'bank_card'),
    (uid, 'Marketing / Ads',         'business_cost', '#6A5AC0', 'bank_card'),
    (uid, 'Professional Services',   'business_cost', '#8878E0', 'bank_transfer'),
    (uid, 'Equipment / Hardware',    'business_cost', '#5B4AA8', 'mobile_money'),
    (uid, 'Travel (Business)',       'business_cost', '#A99BF0', 'bank_card');

  -- One neutral starter account. The user adds their own banks / mobile money.
  insert into accounts (user_id, name, type, role, institution, mask, is_primary, is_dormant) values
    (uid, 'Cash', 'cash', 'spending', null, null, true, false);
end;
$$;
