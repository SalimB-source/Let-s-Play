-- Let's Play · la progression des jeux, par joueur, dans Supabase
-- ==============================================================
-- À coller tel quel dans Supabase → SQL Editor, puis « Run ». Le script est
-- IDEMPOTENT : le rejouer ne casse rien et ne supprime aucune donnée.
--
-- Il garantit une chose : chaque table de progression existe, la RLS est
-- active, et le rôle `authenticated` a bien les droits d'API sur SA ligne
-- (lecture, insertion, mise à jour). Sans le `grant`, le client reçoit
-- « permission denied » et le jeu — qui ne doit jamais casser — continue en
-- silence sur son cache local : c'est exactement le symptôme « ma progression
-- ne s'enregistre pas ».
--
-- Tables couvertes (une ligne privée par compte) :
--   public.player_progress          succès, XP, niveau
--   public.rpg_sablier_progress     Le Sablier : histoire, decks, collection,
--                                   bourse (◈), quêtes du jour
--   public.mirage_rush_progress     Mirage Rush : XP, skins, or
--   public.vice_city_rush_progress  Vice City Rush : billets, garage, Histoire
--   public.quiz_progress            paliers de quizz terminés
--
-- L'app PC (desktop/) utilise exactement ces tables : la progression y suit le
-- compte, pas l'ordinateur.

-- ---------------------------------------------------------------------------
-- 1. Les tables (création seulement si elles manquent)
-- ---------------------------------------------------------------------------

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  level integer not null default 1,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.rpg_sablier_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.mirage_rush_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.vice_city_rush_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null check (char_length(quiz_id) between 1 and 120),
  level_id text not null check (level_id in ('easy', 'medium', 'hard')),
  completed_at timestamptz not null default now(),
  primary key (user_id, quiz_id, level_id)
);

-- ---------------------------------------------------------------------------
-- 2. RLS : chacun ne lit et n'écrit QUE sa ligne
-- ---------------------------------------------------------------------------

alter table public.player_progress enable row level security;
drop policy if exists "Users can read their own progress" on public.player_progress;
create policy "Users can read their own progress"
  on public.player_progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own progress" on public.player_progress;
create policy "Users can insert their own progress"
  on public.player_progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own progress" on public.player_progress;
create policy "Users can update their own progress"
  on public.player_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own progress" on public.player_progress;
create policy "Users can delete their own progress"
  on public.player_progress for delete to authenticated using (auth.uid() = user_id);

alter table public.rpg_sablier_progress enable row level security;
drop policy if exists "Players read their own Sablier progress" on public.rpg_sablier_progress;
create policy "Players read their own Sablier progress"
  on public.rpg_sablier_progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Players insert their own Sablier progress" on public.rpg_sablier_progress;
create policy "Players insert their own Sablier progress"
  on public.rpg_sablier_progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players update their own Sablier progress" on public.rpg_sablier_progress;
create policy "Players update their own Sablier progress"
  on public.rpg_sablier_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.mirage_rush_progress enable row level security;
drop policy if exists "Players read their own Mirage Rush progress" on public.mirage_rush_progress;
create policy "Players read their own Mirage Rush progress"
  on public.mirage_rush_progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Players insert their own Mirage Rush progress" on public.mirage_rush_progress;
create policy "Players insert their own Mirage Rush progress"
  on public.mirage_rush_progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players update their own Mirage Rush progress" on public.mirage_rush_progress;
create policy "Players update their own Mirage Rush progress"
  on public.mirage_rush_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.vice_city_rush_progress enable row level security;
drop policy if exists "Players read their own Vice City Rush progress" on public.vice_city_rush_progress;
create policy "Players read their own Vice City Rush progress"
  on public.vice_city_rush_progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Players insert their own Vice City Rush progress" on public.vice_city_rush_progress;
create policy "Players insert their own Vice City Rush progress"
  on public.vice_city_rush_progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players update their own Vice City Rush progress" on public.vice_city_rush_progress;
create policy "Players update their own Vice City Rush progress"
  on public.vice_city_rush_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.quiz_progress enable row level security;
drop policy if exists "Players read their own quiz levels" on public.quiz_progress;
create policy "Players read their own quiz levels"
  on public.quiz_progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Players record their own quiz levels" on public.quiz_progress;
create policy "Players record their own quiz levels"
  on public.quiz_progress for insert to authenticated with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Droits d'API — le maillon qui manquait pour le Sablier
-- ---------------------------------------------------------------------------

do $$
begin
  -- Aucun accès anonyme : la progression n'est pas une donnée publique.
  revoke all on public.player_progress from public, anon;
  revoke all on public.rpg_sablier_progress from public, anon;
  revoke all on public.mirage_rush_progress from public, anon;
  revoke all on public.vice_city_rush_progress from public, anon;
  revoke all on public.quiz_progress from public, anon;

  grant select, insert, update, delete on public.player_progress to authenticated;
  grant select, insert, update on public.rpg_sablier_progress to authenticated;
  grant select, insert, update on public.mirage_rush_progress to authenticated;
  grant select, insert, update on public.vice_city_rush_progress to authenticated;
  grant select, insert on public.quiz_progress to authenticated;
exception
  when others then
    raise warning 'Let''s Play : droits anon/authenticated non appliqués (%). Vérifiez que la table appartient au rôle du SQL Editor, puis relancez ce fichier.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Contrôle : chaque ligne doit afficher « OK »
-- ---------------------------------------------------------------------------

select controle.objet as "controle", controle.etat as "etat"
from (
  values
    (1, 'table public.player_progress + RLS + grant authenticated',
      case when to_regclass('public.player_progress') is not null
            and (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.player_progress'))
            and has_table_privilege('authenticated', 'public.player_progress', 'insert')
            and has_table_privilege('authenticated', 'public.player_progress', 'update')
           then 'OK' else 'MANQUANT' end),
    (2, 'table public.rpg_sablier_progress + RLS + grant authenticated',
      case when to_regclass('public.rpg_sablier_progress') is not null
            and (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.rpg_sablier_progress'))
            and has_table_privilege('authenticated', 'public.rpg_sablier_progress', 'select')
            and has_table_privilege('authenticated', 'public.rpg_sablier_progress', 'insert')
            and has_table_privilege('authenticated', 'public.rpg_sablier_progress', 'update')
            and to_regrole('anon') is not null
            and not has_table_privilege('anon', 'public.rpg_sablier_progress', 'select')
           then 'OK' else 'MANQUANT' end),
    (3, 'table public.mirage_rush_progress + RLS + grant authenticated',
      case when to_regclass('public.mirage_rush_progress') is not null
            and (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.mirage_rush_progress'))
            and has_table_privilege('authenticated', 'public.mirage_rush_progress', 'update')
           then 'OK' else 'MANQUANT' end),
    (4, 'table public.vice_city_rush_progress + RLS + grant authenticated',
      case when to_regclass('public.vice_city_rush_progress') is not null
            and (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.vice_city_rush_progress'))
            and has_table_privilege('authenticated', 'public.vice_city_rush_progress', 'update')
           then 'OK' else 'MANQUANT' end),
    (5, 'table public.quiz_progress + RLS + grant authenticated',
      case when to_regclass('public.quiz_progress') is not null
            and (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.quiz_progress'))
            and has_table_privilege('authenticated', 'public.quiz_progress', 'insert')
            and to_regrole('anon') is not null
            and not has_table_privilege('anon', 'public.quiz_progress', 'select')
           then 'OK' else 'MANQUANT' end)
) as controle(numero, objet, etat)
order by controle.numero;

notify pgrst, 'reload schema';
