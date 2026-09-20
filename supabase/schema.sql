-- ============================================================================
--  Let's Play · schéma Supabase — profils joueurs + commentaires des articles
-- ============================================================================
--  Où : Supabase Dashboard > SQL Editor, sur le projet pointé par
--       VITE_SUPABASE_URL. Coller tout ce fichier puis « Run ».
--  Relançable sans risque : chaque objet est créé seulement s'il manque.
--  Suppose un projet Supabase (schéma « auth » présent), pas une base nue.
--
--  ⚠ Le SQL Editor exécute le fichier dans UNE SEULE transaction : la moindre
--  erreur annule TOUT ce qui précède (c'est le piège classique — le script
--  semble avoir tourné, mais aucune table n'existe). Les étapes qui touchent à
--  des objets gérés par Supabase (trigger sur auth.users, droits des rôles
--  anon / authenticated) sont donc enfermées dans des blocs qui signalent
--  l'échec par un WARNING au lieu d'interrompre le script.
--
--  À la fin, le script affiche un tableau de contrôle : chaque ligne doit
--  indiquer « OK ». Si une ligne indique « MANQUANT », le WARNING affiché
--  juste au-dessus en donne la raison.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Profils publics (pseudo + avatar du joueur)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS + politiques sur les profils. Tout ou rien : si un des droits manque
-- (table créée par un autre rôle), le bloc entier est annulé et signalé, sans
-- interrompre le reste du script. Le profil est lisible par tout le monde
-- (l'espace commentaire et le hub joueur affichent pseudo et avatar des autres
-- joueurs) mais chaque joueur n'écrit que le sien.
do $$
begin
  alter table public.profiles enable row level security;

  drop policy if exists "Profiles are publicly readable" on public.profiles;
  create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

  drop policy if exists "Users can insert their own profile" on public.profiles;
  create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

  drop policy if exists "Users can update their own profile" on public.profiles;
  create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
exception
  when others then
    raise warning 'Let''s Play : politiques RLS de public.profiles non appliquées (%). Vérifiez que la table appartient bien au rôle du SQL Editor, puis relancez ce fichier.', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 2. Création du profil à l'inscription (trigger sur auth.users)
-- ----------------------------------------------------------------------------
-- Chaque nouveau compte (e-mail, Google, Microsoft) crée une ligne dans
-- auth.users ; ce trigger en dérive une ligne public.profiles en reprenant le
-- gamertag saisi au formulaire d'inscription (stocké par l'application dans
-- raw_user_meta_data). Il ne doit jamais faire échouer une inscription : si le
-- pseudo est déjà pris, le profil est créé sans pseudo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  desired_username text;
  desired_display_name text;
  desired_avatar text;
begin
  desired_username := nullif(trim(coalesce(
    new.raw_user_meta_data->>'gamertag',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'preferred_username',
    ''
  )), '');
  desired_display_name := coalesce(
    nullif(trim(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'fullName',
      new.raw_user_meta_data->>'name',
      ''
    )), ''),
    desired_username
  );
  desired_avatar := nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), '');

  begin
    insert into public.profiles (id, username, display_name, avatar_url)
    values (new.id, desired_username, desired_display_name, desired_avatar)
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, username, display_name, avatar_url)
    values (new.id, null, desired_display_name, desired_avatar)
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

-- auth.users appartient à Supabase (rôle supabase_auth_admin) : selon les
-- projets, le rôle du SQL Editor n'a pas le privilège TRIGGER sur cette table
-- et PostgreSQL refuse avec un code 42501 (« permission denied for table
-- users » ou « must be owner of relation users ») — ce qui annulait tout le
-- reste du script. On le signale et on continue : l'espace commentaire
-- fonctionne sans ce trigger (pseudo et avatar sont alors lus dans les
-- métadonnées du compte).
do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
exception
  when insufficient_privilege then
    raise warning 'Let''s Play : ce rôle n''a pas le droit de créer un trigger sur auth.users (doit être owner). Profils non créés automatiquement — sans effet sur les commentaires.';
  when undefined_table or invalid_schema_name then
    raise warning 'Let''s Play : schéma « auth » introuvable (base non Supabase ?). Trigger de profil ignoré.';
  when others then
    raise warning 'Let''s Play : trigger de profil ignoré (%).', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 3. Commentaires des articles
-- ----------------------------------------------------------------------------
-- Une ligne par commentaire. `article_id` est la route de l'article
-- (« /news/physint », « /reviews/wolverine »), stable entre les déploiements
-- Vercel et GitHub Pages. Les colonnes d'auteur sont dénormalisées : le fil
-- s'affiche sans jointure et garde le pseudo utilisé au moment du post.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '',
  author_avatar text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists comments_article_created_idx
  on public.comments (article_id, created_at desc);
create index if not exists comments_user_idx
  on public.comments (user_id);

-- ----------------------------------------------------------------------------
-- 3b. Niveaux XP : colonnes dénormalisées pour l'affichage dans les commentaires
-- ----------------------------------------------------------------------------
-- Ajout non bloquant : si la table existe déjà (déploiement mis à jour),
-- on complète avec les colonnes manquantes. Les nouveaux commentaires stockent
-- le niveau/XP du joueur au moment du post pour un affichage sans jointure.
do $$
begin
  -- profils : niveau public visible dans le fil de commentaires
  if to_regclass('public.profiles') is not null then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='level') then
      execute 'alter table public.profiles add column level integer not null default 1';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='xp') then
      execute 'alter table public.profiles add column xp integer not null default 0';
    end if;
  end if;
  -- commentaires : niveau/xp figés au moment du post
  if to_regclass('public.comments') is not null then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='author_level') then
      execute 'alter table public.comments add column author_level integer';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='author_xp') then
      execute 'alter table public.comments add column author_xp integer';
    end if;
  end if;
exception when others then
  raise warning 'Let''s Play : colonnes level/xp non ajoutées (%).', sqlerrm;
end $$;

alter table public.comments enable row level security;

-- La conversation est publique, y compris pour les visiteurs déconnectés.
drop policy if exists "Comments are publicly readable" on public.comments;
create policy "Comments are publicly readable"
on public.comments for select using (true);

-- Seul un joueur connecté peut publier, et uniquement en son nom.
drop policy if exists "Users can post comments as themselves" on public.comments;
create policy "Users can post comments as themselves"
on public.comments for insert to authenticated with check (auth.uid() = user_id);

-- Chacun peut supprimer ses propres commentaires.
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
on public.comments for delete to authenticated using (auth.uid() = user_id);

-- Remplit les colonnes d'auteur côté serveur à partir du joueur connecté
-- (gamertag et avatar du compte, puis profil, puis e-mail) : un client ne peut
-- pas publier sous un autre nom. Trime aussi le texte et applique une petite
-- limite anti-spam par joueur.
create or replace function public.set_comment_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb;
  user_email text;
  profile_username text;
  profile_display_name text;
  profile_avatar text;
  recent integer;
begin
  new.user_id := coalesce(auth.uid(), new.user_id);
  if new.user_id is null then
    raise exception 'comment_requires_auth' using errcode = '42501';
  end if;

  select raw_user_meta_data, email into meta, user_email
  from auth.users where id = new.user_id;

  -- Profil facultatif : s'il n'existe pas encore (trigger de l'étape 2 refusé)
  -- ou n'est pas lisible, on retombe simplement sur les métadonnées du compte.
  -- Aucun incident côté profils ne doit empêcher un joueur de commenter.
  begin
    select username, display_name, avatar_url
      into profile_username, profile_display_name, profile_avatar
      from public.profiles where id = new.user_id;
  exception when others then
    null;
  end;

  new.author_name := coalesce(
    nullif(trim(meta->>'gamertag'), ''),
    nullif(trim(profile_username), ''),
    nullif(trim(profile_display_name), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(split_part(coalesce(user_email, ''), '@', 1), ''),
    'Player'
  );
  new.author_avatar := coalesce(
    nullif(trim(meta->>'avatar'), ''),
    nullif(trim(meta->>'avatar_url'), ''),
    nullif(trim(meta->>'picture'), ''),
    nullif(trim(profile_avatar), '')
  );
  -- Niveau XP dénormalisé pour le fil : si le client n'a rien envoyé,
  -- on tente de le déduire des métadonnées (niveau du hub ou achievements).
  -- Les colonnes n'existent que si la migration 3b a été appliquée — on
  -- teste leur existence à chaque insertion pour rester compatible avec les
  -- déploiements n'ayant pas encore migré.
  begin
    if new.author_level is null then
      -- priorité : level explicite dans les métadonnées du compte
      new.author_level := nullif(trim(meta->>'level'), '')::int;
    end if;
  exception when others then null; end;
  begin
    if new.author_xp is null then
      new.author_xp := nullif(trim(meta->>'xp'), '')::int;
    end if;
  exception when others then null; end;
  -- fallback si toujours vide : 1 / 0
  begin
    if new.author_level is null then new.author_level := 1; end if;
    if new.author_xp is null then new.author_xp := 0; end if;
  exception when undefined_column then null; -- colonnes absentes sur ancien schéma
  end;
  new.body := trim(new.body);
  new.created_at := now();

  select count(*) into recent
  from public.comments
  where user_id = new.user_id and created_at > now() - interval '1 minute';
  if recent >= 5 then
    raise exception 'comment_rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists on_comment_insert on public.comments;
create trigger on_comment_insert
before insert on public.comments
for each row execute procedure public.set_comment_author();


-- ----------------------------------------------------------------------------
-- 4. Droits d'accès à l'API (rôles anon / authenticated)
-- ----------------------------------------------------------------------------
-- Supabase accorde normalement ces droits tout seul ; on les pose
-- explicitement pour que l'espace commentaire marche aussi si les privilèges
-- par défaut du schéma public ont été modifiés. Sur une base Postgres sans ces
-- rôles, l'échec est signalé sans interrompre le script.
do $$
begin
  grant usage on schema public to anon, authenticated;
  grant select on public.profiles to anon, authenticated;
  grant insert, update on public.profiles to authenticated;
  grant select on public.comments to anon, authenticated;
  grant insert, delete on public.comments to authenticated;
exception
  when others then
    raise warning 'Let''s Play : droits anon/authenticated non appliqués (%). Sur Supabase c''est habituellement déjà le cas par défaut.', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 5. Rechargement de l'API + contrôle final
-- ----------------------------------------------------------------------------
-- PostgREST garde en mémoire la liste des tables : sans ce signal, l'API peut
-- répondre « Could not find the table 'public.comments' in the schema cache »
-- alors que la table vient d'être créée.
notify pgrst, 'reload schema';

-- Contrôle final : chaque ligne doit afficher « OK ».
select controle.objet as "controle", controle.etat as "etat"
from (
  values
    (1, 'table public.comments',
      case when to_regclass('public.comments') is null then 'MANQUANT' else 'OK' end),
    (2, 'RLS activee sur comments',
      case when (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.comments')) then 'OK' else 'MANQUANT' end),
    (3, 'politiques RLS comments (3)',
      case when (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'comments'
                   and p.policyname in ('Comments are publicly readable',
                                        'Users can post comments as themselves',
                                        'Users can delete their own comments')) = 3
           then 'OK' else 'MANQUANT' end),
    (4, 'trigger auteur + anti-spam',
      case when exists (select 1 from pg_trigger t
                        where t.tgrelid = to_regclass('public.comments')
                          and t.tgname = 'on_comment_insert') then 'OK' else 'MANQUANT' end),
    (5, 'table public.profiles',
      case when to_regclass('public.profiles') is null then 'MANQUANT' else 'OK' end),
    (6, 'politiques RLS profiles (3)',
      case when (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'profiles') = 3
           then 'OK' else 'MANQUANT' end),
    (7, 'trigger profil (auth.users)',
      case when exists (select 1 from pg_trigger t
                        where t.tgrelid = to_regclass('auth.users')
                          and t.tgname = 'on_auth_user_created') then 'OK' else 'ABSENT (voir WARNING)' end),
    (8, 'lecture autorisee (visiteurs)',
      case
        when to_regclass('public.comments') is null then 'MANQUANT'
        when to_regrole('anon') is null then 'role anon absent'
        when has_table_privilege('anon', 'public.comments', 'select') then 'OK'
        else 'MANQUANT'
      end),
    (9, 'ecriture autorisee (connectes)',
      case
        when to_regclass('public.comments') is null then 'MANQUANT'
        when to_regrole('authenticated') is null then 'role authenticated absent'
        when has_table_privilege('authenticated', 'public.comments', 'insert') then 'OK'
        else 'MANQUANT'
      end)
) as controle(numero, objet, etat)
order by controle.numero;
