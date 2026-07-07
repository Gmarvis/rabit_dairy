-- Row-Level Security: every row is private to its owner. Without these
-- policies, RLS-enabled tables deny all access by default.

alter table accounts     enable row level security;
alter table categories   enable row level security;
alter table transactions enable row level security;
alter table budgets       enable row level security;

-- accounts
create policy "own accounts — select" on accounts
  for select using (auth.uid() = user_id);
create policy "own accounts — insert" on accounts
  for insert with check (auth.uid() = user_id);
create policy "own accounts — update" on accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own accounts — delete" on accounts
  for delete using (auth.uid() = user_id);

-- categories
create policy "own categories — select" on categories
  for select using (auth.uid() = user_id);
create policy "own categories — insert" on categories
  for insert with check (auth.uid() = user_id);
create policy "own categories — update" on categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own categories — delete" on categories
  for delete using (auth.uid() = user_id);

-- transactions
create policy "own transactions — select" on transactions
  for select using (auth.uid() = user_id);
create policy "own transactions — insert" on transactions
  for insert with check (auth.uid() = user_id);
create policy "own transactions — update" on transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions — delete" on transactions
  for delete using (auth.uid() = user_id);

-- budgets
create policy "own budgets — select" on budgets
  for select using (auth.uid() = user_id);
create policy "own budgets — insert" on budgets
  for insert with check (auth.uid() = user_id);
create policy "own budgets — update" on budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own budgets — delete" on budgets
  for delete using (auth.uid() = user_id);

-- Storage buckets for the spoken "why" and scanned receipts (private).
insert into storage.buckets (id, name, public)
  values ('voice-notes', 'voice-notes', false), ('receipts', 'receipts', false)
  on conflict (id) do nothing;

-- Users may only touch files under a folder named after their uid.
create policy "own voice notes" on storage.objects
  for all using (
    bucket_id = 'voice-notes' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'voice-notes' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own receipts" on storage.objects
  for all using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );
