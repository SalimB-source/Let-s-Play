-- Vice City Rush · grants de progression réservés à l'administration.
--
-- Prérequis : la table public.profiles doit déjà exister (supabase/schema.sql).
-- Ce fichier ajoute aussi les champs/objets Vice City nécessaires, pour rester
-- récupérable si le grant est installé avant la migration complète. Coller tout
-- le fichier dans Supabase → SQL Editor, l'exécuter, puis appeler la fonction
-- dans une requête séparée :
--   select public.admin_grant_vice_city_rush_access('adresse@example.com', 'Salim');
--
-- Ce que le grant débloque sur le compte visé :
--   · le garage complet (les 8 voitures du catalogue, dont la Mistral offerte) ;
--   · les 7 parcours validés — « Vice City », New York, Tokyo, Paris, Londres,
--     la Route 66 et la route de campagne mexicaine : le suivant s'ouvre ;
--   · la campagne Histoire terminée (6 chapitres sur 6) ;
--   · 5 000 billets verts de prime, versés au portefeuille existant.
--
-- La fonction n'est pas exécutable par anon/authenticated : elle refuse un
-- e-mail absent (même en minuscules) et un compte inconnu de auth.users. Le
-- reçu `vice-city-rush-full-unlock-v1` garantit que la prime n'est versée
-- qu'une seule fois par compte, même si la requête est rejouée ; en revanche
-- les déblocages (garage, parcours, Histoire) sont réappliqués à chaque appel,
-- pour qu'une progression repartie de zéro puisse être regrantée. La fin de
-- l'histoire, elle, reste le choix du joueur : le grant ne la présélectionne
-- jamais.

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
create table if not exists public.vice_city_rush_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.vice_city_rush_progress enable row level security;
drop policy if exists "Players read their own Vice City Rush progress" on public.vice_city_rush_progress;
create policy "Players read their own Vice City Rush progress"
  on public.vice_city_rush_progress for select using (auth.uid() = user_id);
drop policy if exists "Players insert their own Vice City Rush progress" on public.vice_city_rush_progress;
create policy "Players insert their own Vice City Rush progress"
  on public.vice_city_rush_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Players update their own Vice City Rush progress" on public.vice_city_rush_progress;
create policy "Players update their own Vice City Rush progress"
  on public.vice_city_rush_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.vice_city_rush_progress from public, anon;
grant select, insert, update on public.vice_city_rush_progress to authenticated;

create table if not exists public.vice_city_rush_grant_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_code text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, grant_code)
);

alter table public.vice_city_rush_grant_receipts enable row level security;
revoke all on public.vice_city_rush_grant_receipts from public, anon, authenticated;

create or replace function public.admin_grant_vice_city_rush_access(
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
  raw_cash text;
  current_cash integer := 0;
  bonus integer := 5000;
  -- Catalogues du jeu (src/games/cityRushRules.js) : le garage et les parcours
  -- du grant doivent suivre le contenu réellement livré par la page.
  all_cars jsonb := jsonb_build_array(
    'city-hatch', 'nova-18-gt', 'night-comet', 'vice-roadster',
    'turbo-gt', 'muscle-86', 'vega-gt-67', 'toro-v12'
  );
  all_courses jsonb := jsonb_build_array(
    'vice-city', 'new-york', 'tokyo', 'paris', 'london',
    'route-66', 'mexico-countryside'
  );
  display_name_fallback text;
begin
  display_name_fallback := nullif(trim(coalesce(p_display_name, '')), '');
  if nullif(trim(coalesce(p_email, '')), '') is null then
    raise exception 'vice_city_grant_email_required' using errcode = '22023';
  end if;

  select u.id
    into target_user_id
    from auth.users as u
   where lower(u.email) = lower(trim(p_email))
   limit 1;

  if target_user_id is null then
    raise exception 'vice_city_grant_account_not_found' using errcode = 'P0002';
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

  -- Prime versée une seule fois : le reçu est la preuve du premier passage.
  insert into public.vice_city_rush_grant_receipts (user_id, grant_code)
  values (target_user_id, 'vice-city-rush-full-unlock-v1')
  on conflict (user_id, grant_code) do nothing
  returning true into did_grant;

  select p.progress
    into state
    from public.vice_city_rush_progress as p
   where p.user_id = target_user_id;

  if jsonb_typeof(state) is distinct from 'object' then
    state := '{}'::jsonb;
  end if;

  raw_cash := state ->> 'cash';
  if coalesce(raw_cash, '') ~ '^-?[0-9]+$' then
    begin
      current_cash := greatest(0, least(2147478647, raw_cash::numeric))::integer;
    exception when numeric_value_out_of_range then
      current_cash := 0;
    end;
  end if;

  -- Les clés du jeu gardent leur forme exacte (`normalizeCityRushSave`) ; les
  -- autres champs déjà présents dans la sauvegarde sont conservés tels quels.
  state := state || jsonb_build_object(
    'cash', current_cash + case when coalesce(did_grant, false) then bonus else 0 end,
    'ownedCarIds', all_cars,
    'completedCourseIds', all_courses,
    'storyChapter', 6
  );

  insert into public.vice_city_rush_progress (user_id, progress, updated_at)
  values (target_user_id, state, now())
  on conflict (user_id) do update
    set progress = excluded.progress,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'user_id', target_user_id,
    'verified', true,
    'already_granted', not coalesce(did_grant, false),
    'cash_added', case when coalesce(did_grant, false) then bonus else 0 end,
    'cash', current_cash + case when coalesce(did_grant, false) then bonus else 0 end,
    'cars_unlocked', 8,
    'courses_unlocked', 7,
    'story_chapters', 6
  );
end;
$$;

revoke all on function public.admin_grant_vice_city_rush_access(text, text) from public;
revoke all on function public.admin_grant_vice_city_rush_access(text, text) from anon, authenticated;
