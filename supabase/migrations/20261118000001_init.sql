-- RITMO AI — schema iniziale. Tutte le tabelle utente hanno RLS: l'utente accede solo alle proprie righe.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text, diet text[] not null default '{}', excluded_foods text[] not null default '{}',
  cooking_minutes int check (cooking_minutes between 0 and 240), weekly_budget_eur numeric check (weekly_budget_eur >= 0),
  updated_at timestamptz not null default now()
);
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('terms','privacy','health_data_processing','ai_memory','marketing')),
  granted boolean not null, policy_version text not null, created_at timestamptz not null default now()
);
create table public.work_schedules (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), start_time time not null, end_time time not null
);
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80), quantity numeric check (quantity > 0), unit text check (unit in ('g','kg','ml','l','pz')),
  expires_on date, created_at timestamptz not null default now()
);
create table public.recipes ( -- user_id null = ricetta di catalogo (sola lettura per i client)
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  title text not null, servings int not null default 2 check (servings > 0), minutes int, ingredients jsonb not null default '[]', steps jsonb not null default '[]',
  nutrition_estimate jsonb, source text
);
create table public.meal_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('colazione','pranzo','cena','spuntino')), eaten_at timestamptz not null,
  description text not null check (char_length(description) <= 200), kcal numeric check (kcal between 0 and 5000), is_estimate boolean not null default true
);
create table public.meal_suggestions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null, accepted boolean, created_at timestamptz not null default now()
);
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]', created_at timestamptz not null default now()
);
create table public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, created_at timestamptz not null default now()
);
create table public.progress_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, value jsonb not null, recorded_at timestamptz not null default now()
);
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now()
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('user','assistant')),
  content text not null, created_at timestamptz not null default now()
);
create table public.ai_memories ( -- memoria autorizzata, visibile/modificabile/cancellabile dall'utente
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  fact text not null check (char_length(fact) <= 300), created_at timestamptz not null default now()
);
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade, enabled boolean not null default false, quiet_from time, quiet_to time
);

-- Tabelle SOLO server: nessuna policy di scrittura per i client.
create table public.subscription_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','plus')), active boolean not null default false, expires_at timestamptz, updated_at timestamptz not null default now()
);
create table public.plan_limits (plan text primary key, per_day int not null, per_month int not null, max_concurrent int not null);
insert into public.plan_limits values ('free',5,60,1),('plus',40,500,2);
create table public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','done','failed')),
  input_tokens int, output_tokens int, cost_eur numeric(12,6), created_at timestamptz not null default now()
);
create index on public.ai_usage_ledger (user_id, created_at);
create table public.audit_events (
  id bigserial primary key, actor uuid, action text not null, subject uuid, meta jsonb, created_at timestamptz not null default now()
);

-- RLS: tabelle utente → solo proprie righe (lettura e scrittura).
do $$ declare t text; begin
  foreach t in array array['profiles','user_preferences','consents','work_schedules','pantry_items','meal_entries','meal_suggestions','shopping_lists','habits','progress_entries','ai_conversations','ai_messages','ai_memories','notification_preferences'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (%s = (select auth.uid())) with check (%s = (select auth.uid()))',
      t, case when t='profiles' then 'id' else 'user_id' end, case when t='profiles' then 'id' else 'user_id' end);
  end loop;
end $$;

alter table public.recipes enable row level security;
create policy recipes_read on public.recipes for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy recipes_write on public.recipes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Entitlements e ledger: lettura propria, nessuna scrittura da client (solo service_role, che bypassa RLS).
alter table public.subscription_entitlements enable row level security;
create policy ent_read on public.subscription_entitlements for select to authenticated using (user_id = (select auth.uid()));
alter table public.ai_usage_ledger enable row level security;
create policy ledger_read on public.ai_usage_ledger for select to authenticated using (user_id = (select auth.uid()));
alter table public.plan_limits enable row level security;
create policy limits_read on public.plan_limits for select to authenticated using (true);
alter table public.audit_events enable row level security; -- nessuna policy: solo service_role

-- Consumo quota ATOMICO: lock per utente → conteggi → insert 'pending'. Il piano è derivato dal DB, mai dal client.
create or replace function public.consume_ai_quota(p_user uuid, p_global_month_budget_eur numeric default null)
returns table (decision text, ledger_id uuid) language plpgsql security definer set search_path = public as $$
declare v_plan text; v_active boolean; v_exp timestamptz; l public.plan_limits; d int; m int; c int; spent numeric; v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  select plan, active, expires_at into v_plan, v_active, v_exp from public.subscription_entitlements where user_id = p_user;
  if v_plan is null or not v_active or (v_exp is not null and v_exp <= now()) then v_plan := 'free'; end if;
  select * into l from public.plan_limits where plan = v_plan;
  select count(*) filter (where created_at >= date_trunc('day', now())),
         count(*) filter (where created_at >= date_trunc('month', now())),
         count(*) filter (where status = 'pending' and created_at > now() - interval '2 minutes')
    into d, m, c from public.ai_usage_ledger where user_id = p_user and status <> 'failed';
  if p_global_month_budget_eur is not null then
    select coalesce(sum(cost_eur),0) into spent from public.ai_usage_ledger where created_at >= date_trunc('month', now());
    if spent >= p_global_month_budget_eur then return query select 'budget'::text, null::uuid; return; end if;
  end if;
  if c >= l.max_concurrent then return query select 'concurrency'::text, null::uuid; return; end if;
  if d >= l.per_day then return query select 'daily'::text, null::uuid; return; end if;
  if m >= l.per_month then return query select 'monthly'::text, null::uuid; return; end if;
  insert into public.ai_usage_ledger (user_id) values (p_user) returning id into v_id;
  return query select 'ok'::text, v_id;
end $$;
revoke all on function public.consume_ai_quota(uuid, numeric) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, numeric) to service_role;

create or replace function public.finish_ai_request(p_id uuid, p_in int, p_out int, p_cost numeric, p_ok boolean)
returns void language sql security definer set search_path = public as $$
  update public.ai_usage_ledger set status = case when p_ok then 'done' else 'failed' end, input_tokens = p_in, output_tokens = p_out, cost_eur = p_cost where id = p_id;
$$;
revoke all on function public.finish_ai_request(uuid, int, int, numeric, boolean) from public, anon, authenticated;
grant execute on function public.finish_ai_request(uuid, int, int, numeric, boolean) to service_role;

-- Il client non può modificare/inserire entitlement né ledger né audit.
revoke insert, update, delete on public.subscription_entitlements, public.ai_usage_ledger, public.plan_limits, public.audit_events from authenticated, anon;
