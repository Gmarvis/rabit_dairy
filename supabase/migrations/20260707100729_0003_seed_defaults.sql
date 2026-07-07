-- Seed a new user with the Rabbit Dairy starter categories (from the
-- spreadsheet) and their real account set. Runs automatically on signup.

create or replace function public.seed_defaults_for_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Categories: name, type, colour, default payment method
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

  -- Accounts: the user's real setup (balances start at 0; edit in the app)
  insert into accounts (user_id, name, type, institution, mask, is_primary, is_dormant) values
    (uid, 'Salary account',  'bank_salary',  'Afriland', '4821', true,  false),
    (uid, 'Savings account', 'bank_savings', 'UBA',      '7130', false, false),
    (uid, 'Dormant account', 'bank_other',   'Ecobank',  null,   false, true),
    (uid, 'MTN MoMo',        'mobile_money', 'MTN',      null,   false, false),
    (uid, 'Cash wallet',     'cash',         null,       null,   false, false);
end;
$$;

-- Fire it whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_defaults_for_user(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
