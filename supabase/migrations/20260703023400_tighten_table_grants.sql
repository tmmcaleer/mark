revoke all privileges on table
  public.profiles,
  public.stripe_customers,
  public.credit_transactions,
  public.analysis_jobs,
  public.analysis_segments,
  public.device_sessions,
  public.stripe_webhook_events
from public, anon, authenticated;

grant select on table
  public.profiles,
  public.stripe_customers,
  public.credit_transactions,
  public.analysis_jobs,
  public.analysis_segments
to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.stripe_customers,
  public.credit_transactions,
  public.analysis_jobs,
  public.analysis_segments,
  public.device_sessions,
  public.stripe_webhook_events
to service_role;
