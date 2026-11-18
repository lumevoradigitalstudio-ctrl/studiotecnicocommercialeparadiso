-- Fatturazione (webhook RevenueCat), ruoli admin con metriche aggregate, lista d'attesa. Tutto accessibile SOLO da service_role.

create table public.billing_events (
  event_id text primary key, user_id uuid, type text not null, environment text, event_ts timestamptz not null, received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security; -- nessuna policy: solo server

-- Applica un evento in modo idempotente e ignorando eventi più vecchi dello stato corrente.
create or replace function public.apply_billing_event(p_event_id text, p_user uuid, p_type text, p_env text, p_event_ts timestamptz, p_active boolean, p_expires timestamptz)
returns text language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from auth.users where id = p_user) then return 'unknown_user'; end if;
  insert into public.billing_events (event_id, user_id, type, environment, event_ts) values (p_event_id, p_user, p_type, p_env, p_event_ts) on conflict do nothing;
  get diagnostics n = row_count; if n = 0 then return 'duplicate'; end if;
  insert into public.subscription_entitlements (user_id, plan, active, expires_at, updated_at)
    values (p_user, case when p_active then 'plus' else 'free' end, p_active, p_expires, p_event_ts)
    on conflict (user_id) do update set plan = excluded.plan, active = excluded.active, expires_at = excluded.expires_at, updated_at = excluded.updated_at
    where public.subscription_entitlements.updated_at <= excluded.updated_at;
  get diagnostics n = row_count; return case when n = 1 then 'applied' else 'stale' end;
end $$;
revoke all on function public.apply_billing_event(text, uuid, text, text, timestamptz, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_billing_event(text, uuid, text, text, timestamptz, boolean, timestamptz) to service_role;

-- Ruoli amministrativi separati: 'viewer' (solo metriche aggregate) e 'owner'.
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, role text not null check (role in ('viewer','owner')), created_at timestamptz not null default now());
alter table public.admin_users enable row level security; -- nessuna policy: gestita solo da service_role/SQL

-- Metriche AGGREGATE: nessuna email, nessun testo di conversazione, nessun dato sanitario individuale.
create or replace function public.admin_metrics(p_days int default 30)
returns jsonb language sql security definer set search_path = public as $$
  with d as (select greatest(1, least(coalesce(p_days,30), 365)) as n)
  select jsonb_build_object(
    'generated_at', now(),
    'window_days', (select n from d),
    'signups_total', (select count(*) from auth.users),
    'signups_window', (select count(*) from auth.users, d where created_at >= now() - make_interval(days => d.n)),
    'onboarding_completed', (select count(*) from public.profiles where onboarding_completed),
    'active_users_7d', (select count(distinct user_id) from (select user_id, created_at from public.ai_usage_ledger union all select user_id, eaten_at from public.meal_entries) a where created_at >= now() - interval '7 days'),
    'active_users_30d', (select count(distinct user_id) from (select user_id, created_at from public.ai_usage_ledger union all select user_id, eaten_at from public.meal_entries) a where created_at >= now() - interval '30 days'),
    'plus_active', (select count(*) from public.subscription_entitlements where active and (expires_at is null or expires_at > now())),
    'billing_events_window', (select count(*) from public.billing_events, d where received_at >= now() - make_interval(days => d.n)),
    'cancellations_window', (select count(*) from public.billing_events, d where type in ('CANCELLATION','EXPIRATION') and received_at >= now() - make_interval(days => d.n)),
    'ai_requests_window', (select count(*) from public.ai_usage_ledger, d where created_at >= now() - make_interval(days => d.n)),
    'ai_failed_window', (select count(*) from public.ai_usage_ledger, d where status = 'failed' and created_at >= now() - make_interval(days => d.n)),
    'ai_cost_eur_window', (select coalesce(sum(cost_eur),0) from public.ai_usage_ledger, d where created_at >= now() - make_interval(days => d.n)),
    'ai_cost_eur_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'requests', c, 'cost_eur', cost) order by day), '[]'::jsonb) from (select created_at::date as day, count(*) c, coalesce(sum(cost_eur),0) cost from public.ai_usage_ledger, d where created_at >= now() - make_interval(days => d.n) group by 1) t),
    'revenue_estimate', null
  );
$$;
revoke all on function public.admin_metrics(int) from public, anon, authenticated;
grant execute on function public.admin_metrics(int) to service_role;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(), email text not null check (char_length(email) between 5 and 254),
  consent_marketing boolean not null check (consent_marketing), consent_text_version text not null, source text, created_at timestamptz not null default now()
);
create unique index waitlist_email_uq on public.waitlist (lower(email));
alter table public.waitlist enable row level security; -- nessuna policy: scrittura solo via Edge Function (service_role)

revoke all on public.billing_events, public.admin_users, public.waitlist from anon, authenticated;
