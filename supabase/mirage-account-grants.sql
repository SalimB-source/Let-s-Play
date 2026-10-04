-- Mirage Rush · grants de progression réservés à l'administration.
--
-- Prérequis : la table public.profiles doit déjà exister (supabase/schema.sql).
-- Ce fichier ajoute aussi ses champs/objets Mirage nécessaires, pour rester
-- récupérable si le grant a été installé avant la migration complète. Coller
-- tout le fichier dans Supabase → SQL Editor, l'exécuter, puis appeler la
-- fonction dans une requête séparée :
--   select public.admin_grant_mirage_rush_access('adresse@example.com', 'Salim');
-- La fonction n'est pas exécutable par anon/authenticated. Elle ajoute les
-- 5 000 OR une seule fois par compte, même si la requête est rejouée.

-- Mise à niveau idempotente : la table profiles existait déjà sur les projets
-- qui n'avaient pas encore appliqué la version récente de schema.sql.
alter table public.profiles
  add column if not exists is_verified boolean not null default false;

create or replace function public.protect_profile_verification_badge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.is_verified := false;
    else
      new.is_verified := old.is_verified;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_verification_badge on public.profiles;
create trigger profiles_protect_verification_badge
before insert or update of is_verified on public.profiles
for each row execute function public.protect_profile_verification_badge();

-- Progression privée, accessible à un joueur uniquement pour sa propre ligne.
create table if not exists public.mirage_rush_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.mirage_rush_progress enable row level security;
drop policy if exists "Players read their own Mirage Rush progress" on public.mirage_rush_progress;
create policy "Players read their own Mirage Rush progress"
  on public.mirage_rush_progress for select using (auth.uid() = user_id);
drop policy if exists "Players insert their own Mirage Rush progress" on public.mirage_rush_progress;
create policy "Players insert their own Mirage Rush progress"
  on public.mirage_rush_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Players update their own Mirage Rush progress" on public.mirage_rush_progress;
create policy "Players update their own Mirage Rush progress"
  on public.mirage_rush_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.mirage_rush_progress from public, anon;
grant select, insert, update on public.mirage_rush_progress to authenticated;

create table if not exists public.mirage_rush_grant_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_code text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, grant_code)
);

alter table public.mirage_rush_grant_receipts enable row level security;
revoke all on public.mirage_rush_grant_receipts from public, anon, authenticated;

create or replace function public.admin_grant_mirage_rush_access(
  p_email text,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  did_grant boolean := false;
  state jsonb;
  raw_coins text;
  current_coins integer := 0;
  display_name_fallback text;
begin
  display_name_fallback := nullif(trim(coalesce(p_display_name, '')), '');
  if nullif(trim(coalesce(p_email, '')), '') is null then
    raise exception 'mirage_grant_email_required' using errcode = '22023';
  end if;

  select u.id
    into target_user_id
    from auth.users as u
   where lower(u.email) = lower(trim(p_email))
   limit 1;

  if target_user_id is null then
    raise exception 'mirage_grant_account_not_found' using errcode = 'P0002';
  end if;

  -- Create a minimal profile only if signup did not create one. Preserve any
  -- existing name/avatar, using the supplied name only as a missing-name
  -- fallback; verification itself remains an admin-only database field.
  insert into public.profiles (id, display_name, is_verified)
  values (target_user_id, display_name_fallback, true)
  on conflict (id) do nothing;

  update public.profiles as p
     set is_verified = true,
         display_name = coalesce(nullif(trim(p.display_name), ''), display_name_fallback, p.display_name),
         updated_at = now()
   where p.id = target_user_id;

  insert into public.mirage_rush_grant_receipts (user_id, grant_code)
  values (target_user_id, 'mirage-rush-full-unlock-v1')
  on conflict (user_id, grant_code) do nothing
  returning true into did_grant;

  if not coalesce(did_grant, false) then
    return jsonb_build_object(
      'user_id', target_user_id,
      'verified', true,
      'already_granted', true
    );
  end if;

  select p.progress
    into state
    from public.mirage_rush_progress as p
   where p.user_id = target_user_id;

  if jsonb_typeof(state) is distinct from 'object' then
    state := '{}'::jsonb;
  end if;

  raw_coins := state ->> 'coins';
  if coalesce(raw_coins, '') ~ '^-?[0-9]+$' then
    begin
      current_coins := greatest(0, least(2147478647, raw_coins::numeric))::integer;
    exception when numeric_value_out_of_range then
      current_coins := 0;
    end;
  end if;

  -- Mirage Rush currently has ten maps and four cups. Winning every map/cup
  -- records them as completed, which opens all cards in the existing rules.
  -- Keep XP, runs, selected rider and purchased skins already in the progression.
  state := state || jsonb_build_object(
    'coins', current_coins + 5000,
    'wonStages', jsonb_build_array(
      'desert', 'western', 'prairie', 'sardinia', 'alger',
      'japan', 'ramparts', 'infinity', 'airbase', 'snakeway'
    ),
    'completedCups', jsonb_build_array('desert', 'winds', 'worldtour', 'legends')
  );

  insert into public.mirage_rush_progress (user_id, progress, updated_at)
  values (target_user_id, state, now())
  on conflict (user_id) do update
    set progress = excluded.progress,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'user_id', target_user_id,
    'verified', true,
    'already_granted', false,
    'gold_added', 5000,
    'maps_unlocked', 10,
    'cups_unlocked', 4
  );
end;
$$;

revoke all on function public.admin_grant_mirage_rush_access(text, text) from public;
revoke all on function public.admin_grant_mirage_rush_access(text, text) from anon, authenticated;
