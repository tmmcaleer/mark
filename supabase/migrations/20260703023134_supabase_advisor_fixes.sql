alter function public.mark_credit_balance(uuid)
  set search_path = public, pg_temp;

revoke all on function public.mark_credit_balance(uuid) from public, anon;
grant execute on function public.mark_credit_balance(uuid) to authenticated, service_role;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;
