-- The seed functions are SECURITY DEFINER and were exposed on the REST API,
-- so anon/authenticated could call them for arbitrary user ids. They only ever
-- need to run from the on_auth_user_created trigger, which executes as the
-- definer regardless of EXECUTE grants. Revoke public execute access.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.seed_defaults_for_user(uuid) from public, anon, authenticated;
