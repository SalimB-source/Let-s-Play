-- ============================================================================
--  Let's Play · schéma Supabase — profils, commentaires, succès, amis,
--  messagerie privée
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

-- ----------------------------------------------------------------------------
-- 3b2. Consoles possédées & jeux testés : colonnes publiques du profil
-- ----------------------------------------------------------------------------
-- Le hub joueur (src/pages/Auth.jsx) laisse cocher les consoles possédées et
-- marquer les jeux testés (catalogue PS5 / Xbox Series X,
-- src/lib/gameLibrary.js) ; la page de profil (src/pages/Profile.jsx) les
-- affiche en public. La source de vérité reste user_metadata (JWT) ; ces
-- colonnes dénormalisées servent l'affichage public sans session.
-- Ajout non bloquant sur une table existante.
do $$
begin
  if to_regclass('public.profiles') is not null then
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'profiles' and column_name = 'platforms') then
      execute 'alter table public.profiles add column platforms text[]';
    end if;
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'profiles' and column_name = 'tested_games') then
      execute 'alter table public.profiles add column tested_games text[]';
    end if;
  end if;
exception when others then
  raise warning 'Let''s Play : colonnes profiles.platforms / tested_games non ajoutées (%).', sqlerrm;
end $$;

-- ----------------------------------------------------------------------------
-- 3c. Progression des succès — UNE LIGNE PAR COMPTE
-- ----------------------------------------------------------------------------
-- Chaque compte possède SA progression (succès débloqués, XP, niveau) : le
-- client écrit ici à chaque action (`src/achievements/remote.js`). `state`
-- porte l'état complet du moteur ; `level` et `xp` sont dénormalisés pour
-- l'affichage public (fil de commentaires, profils).
-- RLS stricte : un joueur ne lit et n'écrit que SA ligne. Un compte neuf
-- démarre donc au niveau 1, même sur un appareil où l'on a déjà joué, et la
-- progression suit le joueur d'un appareil à l'autre.
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  level integer not null default 1,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

do $$
begin
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
exception
  when others then
    raise warning 'Let''s Play : politiques RLS de public.player_progress non appliquées (%).', sqlerrm;
end $$;

-- Garde le niveau public du profil (fil de commentaires) synchronisé avec la
-- progression des succès du compte. Le profil peut ne pas exister encore
-- (trigger de l'étape 2 refusé) : l'échec est ignoré, sans effet.
create or replace function public.sync_profile_progress()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  begin
    update public.profiles
       set level = new.level, xp = new.xp, updated_at = now()
     where id = new.user_id;
  exception when others then null;
  end;
  return new;
end;
$$;

drop trigger if exists on_player_progress_write on public.player_progress;
create trigger on_player_progress_write
after insert or update on public.player_progress
for each row execute procedure public.sync_profile_progress();

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

-- Le joueur peut mettre à jour ses propres commentaires (nom/avatar/niveau dénormalisés
-- synchronisés quand il modifie son profil).
drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments"
on public.comments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
-- 3d. Amis : demandes, liste d'amis, présence en ligne
-- ----------------------------------------------------------------------------
-- Une ligne par relation entre deux joueurs. `requester_id` a envoyé la
-- demande à `addressee_id` ; `status` vaut 'pending' tant que le destinataire
-- n'a pas répondu, 'accepted' ensuite. Refuser, annuler ou retirer un ami
-- SUPPRIME la ligne (pas d'historique). L'index unique sur la paire
-- (ordonnée) empêche deux lignes A→B et B→A.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx
  on public.friendships (requester_id, status);

-- RLS : chaque joueur ne voit que les relations dont il fait partie, n'envoie
-- des demandes qu'en son nom, ne répond (accepter) qu'à celles qu'il a reçues
-- et peut supprimer toute relation dont il fait partie (refuser / annuler /
-- retirer).
do $$
begin
  alter table public.friendships enable row level security;

  drop policy if exists "Friendships are visible to both players" on public.friendships;
  create policy "Friendships are visible to both players"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

  drop policy if exists "Players send friend requests as themselves" on public.friendships;
  create policy "Players send friend requests as themselves"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id and status = 'pending' and requester_id <> addressee_id);

  drop policy if exists "Players answer requests they received" on public.friendships;
  create policy "Players answer requests they received"
  on public.friendships for update to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status = 'accepted');

  drop policy if exists "Players remove friendships they belong to" on public.friendships;
  create policy "Players remove friendships they belong to"
  on public.friendships for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
exception
  when others then
    raise warning 'Let''s Play : politiques RLS de public.friendships non appliquées (%).', sqlerrm;
end $$;

-- Côté serveur : l'expéditeur est toujours le joueur connecté, une demande
-- part toujours en 'pending' et `updated_at` suit chaque changement. Une
-- demande envoyée à quelqu'un qui nous avait déjà écrit vaut acceptation :
-- sa demande passe en 'accepted' et rien n'est inséré (l'application recharge
-- alors la liste).
create or replace function public.prepare_friendship()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.requester_id := coalesce(auth.uid(), new.requester_id);
    if new.requester_id is null then
      raise exception 'friendship_requires_auth' using errcode = '42501';
    end if;
    update public.friendships
       set status = 'accepted', updated_at = now()
     where requester_id = new.addressee_id
       and addressee_id = new.requester_id
       and status = 'pending';
    if found then
      return null;
    end if;
    new.status := 'pending';
    new.created_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_friendship_write on public.friendships;
create trigger on_friendship_write
before insert or update on public.friendships
for each row execute procedure public.prepare_friendship();

-- Présence : `profiles.last_seen_at` est rafraîchi par l'application toutes
-- les 90 secondes pour un joueur connecté (battement de cœur). La fenêtre
-- d'amis considère un joueur en ligne s'il est présent sur le canal Realtime
-- OU vu il y a moins de 3 minutes — le second signal fonctionne même si
-- Realtime est indisponible. Ajout non bloquant sur une table existante.
do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_seen_at') then
    execute 'alter table public.profiles add column last_seen_at timestamptz';
  end if;
exception when others then
  raise warning 'Let''s Play : colonne profiles.last_seen_at non ajoutée (%).', sqlerrm;
end $$;

-- Realtime : la fenêtre d'amis écoute les changements de `friendships` pour
-- afficher une demande reçue sans recharger. Les DELETE ne transportent que la
-- clé primaire sans REPLICA IDENTITY FULL : on l'active pour que les filtres
-- (requester_id / addressee_id) s'appliquent aussi aux suppressions. Sans
-- publication `supabase_realtime` (base hors Supabase), on le signale.
do $$
begin
  alter table public.friendships replica identity full;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    alter publication supabase_realtime add table public.friendships;
  end if;
exception when others then
  raise warning 'Let''s Play : friendships non ajoutée à la publication Realtime (%). La fenêtre d''amis se rafraîchit alors toutes les minutes.', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 3e. Messagerie : messages privés 1-à-1, joueurs bloqués, signalements
-- ----------------------------------------------------------------------------
-- Une ligne par message. `conversation_key` regroupe les deux sens d'un même
-- échange (`le plus petit uuid _ le plus grand`) : c'est la clé écoutée en
-- temps réel et celle qui indexe le fil. Un message est `read_at is null`
-- tant que le destinataire n'a pas ouvert la discussion — c'est ce qui compte
-- les « non-lus ». On n'écrit à un joueur que si une amitié 'accepted' existe
-- et qu'aucun des deux ne bloque l'autre (vérifié côté serveur, ci-dessous).
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_key text not null,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint direct_messages_not_self check (sender_id <> recipient_id)
);

create index if not exists direct_messages_conversation_idx
  on public.direct_messages (conversation_key, created_at desc);
create index if not exists direct_messages_sender_idx
  on public.direct_messages (sender_id, created_at desc);
-- Fil des non-lus d'un joueur (badge du lanceur, liste des discussions).
create index if not exists direct_messages_unread_idx
  on public.direct_messages (recipient_id, created_at desc)
  where read_at is null;

-- RLS : un joueur ne lit que ses propres échanges, n'écrit qu'en son nom, ne
-- marque comme lus que les messages qu'il a reçus, ne supprime que les siens
-- (effacer un message envoyé) et ne modifie rien d'autre (le trigger
-- ci-dessous refuse toute autre colonne).
do $$
begin
  alter table public.direct_messages enable row level security;

  drop policy if exists "Direct messages are visible to both players" on public.direct_messages;
  create policy "Direct messages are visible to both players"
  on public.direct_messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

  drop policy if exists "Players send direct messages as themselves" on public.direct_messages;
  create policy "Players send direct messages as themselves"
  on public.direct_messages for insert to authenticated
  with check (auth.uid() = sender_id and auth.uid() <> recipient_id);

  drop policy if exists "Recipients mark their own messages as read" on public.direct_messages;
  create policy "Recipients mark their own messages as read"
  on public.direct_messages for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

  drop policy if exists "Senders delete their own messages" on public.direct_messages;
  create policy "Senders delete their own messages"
  on public.direct_messages for delete to authenticated
  using (auth.uid() = sender_id);
exception
  when others then
    raise warning 'Let''s Play : politiques RLS de public.direct_messages non appliquées (%).', sqlerrm;
end $$;

-- Côté serveur : l'expéditeur est toujours le joueur connecté, la clé de
-- conversation est recalculée, le message est vidé/nettoyé, et trois garde-
-- fous s'appliquent — amitié acceptée obligatoire, aucun blocage entre les
-- deux joueurs, pas plus de 20 messages par minute.
create or replace function public.prepare_direct_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  recent int;
begin
  if tg_op = 'INSERT' then
    new.sender_id := coalesce(auth.uid(), new.sender_id);
    if new.sender_id is null then
      raise exception 'direct_message_requires_auth' using errcode = '42501';
    end if;
    if new.sender_id = new.recipient_id then
      raise exception 'direct_message_to_self' using errcode = 'P0001';
    end if;

    -- Comparaison des UUID eux-mêmes (ordre des octets, indépendant de la
    -- collation) : l'application calcule la même clé en triant les deux
    -- identifiants en texte.
    new.conversation_key := case
      when new.sender_id < new.recipient_id
        then new.sender_id::text || '_' || new.recipient_id::text
      else new.recipient_id::text || '_' || new.sender_id::text
    end;
    new.body := btrim(new.body);
    if char_length(new.body) = 0 then
      raise exception 'direct_message_empty' using errcode = 'P0001';
    end if;
    if char_length(new.body) > 1000 then
      raise exception 'direct_message_too_long' using errcode = 'P0001';
    end if;

    if not exists (
      select 1 from public.friendships f
       where f.status = 'accepted'
         and ((f.requester_id = new.sender_id and f.addressee_id = new.recipient_id)
           or (f.requester_id = new.recipient_id and f.addressee_id = new.sender_id))
    ) then
      raise exception 'direct_message_requires_friendship' using errcode = 'P0001';
    end if;

    if exists (
      select 1 from public.message_blocks b
       where (b.blocker_id = new.recipient_id and b.blocked_id = new.sender_id)
          or (b.blocker_id = new.sender_id and b.blocked_id = new.recipient_id)
    ) then
      raise exception 'direct_message_blocked' using errcode = 'P0001';
    end if;

    select count(*) into recent
    from public.direct_messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute';
    if recent >= 20 then
      raise exception 'direct_message_rate_limited' using errcode = 'P0001';
    end if;

    new.created_at := now();
    new.read_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_direct_message_write on public.direct_messages;
create trigger on_direct_message_write
before insert on public.direct_messages
for each row execute procedure public.prepare_direct_message();

-- Une mise à jour ne peut que poser `read_at` (accusé de lecture). Toute
-- autre colonne renvoyée différente est refusée, et un message déjà lu ne
-- redevient jamais non-lu.
create or replace function public.restrict_direct_message_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.conversation_key is distinct from old.conversation_key
     or new.body is distinct from old.body then
    raise exception 'direct_message_readonly' using errcode = '42501';
  end if;
  new.sender_id := old.sender_id;
  new.recipient_id := old.recipient_id;
  new.conversation_key := old.conversation_key;
  new.body := old.body;
  new.created_at := old.created_at;
  new.read_at := coalesce(old.read_at, new.read_at);
  return new;
end;
$$;

drop trigger if exists on_direct_message_update on public.direct_messages;
create trigger on_direct_message_update
before update on public.direct_messages
for each row execute procedure public.restrict_direct_message_update();

-- Joueurs bloqués : qui bloque qui. Un joueur ne voit que SES blocages — la
-- liste de ceux qui l'ont bloqué ne lui est jamais exposée, d'où l'absence de
-- politique de lecture pour `blocked_id`.
create table if not exists public.message_blocks (
  blocker_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint message_blocks_not_self check (blocker_id <> blocked_id)
);

do $$
begin
  alter table public.message_blocks enable row level security;

  drop policy if exists "Players see who they blocked" on public.message_blocks;
  create policy "Players see who they blocked"
  on public.message_blocks for select to authenticated
  using (auth.uid() = blocker_id);

  drop policy if exists "Players block on their own behalf" on public.message_blocks;
  create policy "Players block on their own behalf"
  on public.message_blocks for insert to authenticated
  with check (auth.uid() = blocker_id and auth.uid() <> blocked_id);

  drop policy if exists "Players unblock on their own behalf" on public.message_blocks;
  create policy "Players unblock on their own behalf"
  on public.message_blocks for delete to authenticated
  using (auth.uid() = blocker_id);
exception
  when others then
    raise warning 'Let''s Play : politiques RLS de public.message_blocks non appliquées (%).', sqlerrm;
end $$;

-- Le blocage est toujours posé par le joueur connecté.
create or replace function public.prepare_message_block()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.blocker_id := coalesce(auth.uid(), new.blocker_id);
  if new.blocker_id is null then
    raise exception 'message_block_requires_auth' using errcode = '42501';
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists on_message_block_write on public.message_blocks;
create trigger on_message_block_write
before insert on public.message_blocks
for each row execute procedure public.prepare_message_block();

-- Signalements : un joueur peut signaler un autre joueur (avec le message en
-- cause, facultatif). Un seul signalement par couple — le second met à jour
-- le motif au lieu d'ajouter une ligne.
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.direct_messages(id) on delete set null,
  reason text not null default 'other'
    check (reason in ('harassment', 'spam', 'hate', 'inappropriate', 'other')),
  note text,
  created_at timestamptz not null default now(),
  constraint message_reports_not_self check (reporter_id <> reported_id)
);

create unique index if not exists message_reports_pair_idx
  on public.message_reports (reporter_id, reported_id);
create index if not exists message_reports_reported_idx
  on public.message_reports (reported_id, created_at desc);

do $$
begin
  alter table public.message_reports enable row level security;

  drop policy if exists "Players see their own reports" on public.message_reports;
  create policy "Players see their own reports"
  on public.message_reports for select to authenticated
  using (auth.uid() = reporter_id);

  drop policy if exists "Players report on their own behalf" on public.message_reports;
  create policy "Players report on their own behalf"
  on public.message_reports for insert to authenticated
  with check (auth.uid() = reporter_id and auth.uid() <> reported_id);
exception
  when others then
    raise warning 'Let''s Play : politiques RLS de public.message_reports non appliquées (%).', sqlerrm;
end $$;

create or replace function public.prepare_message_report()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.reporter_id := coalesce(auth.uid(), new.reporter_id);
  if new.reporter_id is null then
    raise exception 'message_report_requires_auth' using errcode = '42501';
  end if;
  if new.reporter_id = new.reported_id then
    raise exception 'message_report_to_self' using errcode = 'P0001';
  end if;
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  if char_length(coalesce(new.note, '')) > 500 then
    raise exception 'message_report_note_too_long' using errcode = 'P0001';
  end if;
  -- Un signalement existe déjà pour ce joueur : on met à jour le motif et
  -- rien n'est inséré (l'application affiche « signalement envoyé »).
  update public.message_reports
     set reason = new.reason, note = new.note, message_id = new.message_id, created_at = now()
   where reporter_id = new.reporter_id and reported_id = new.reported_id;
  if found then
    return null;
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists on_message_report_write on public.message_reports;
create trigger on_message_report_write
before insert on public.message_reports
for each row execute procedure public.prepare_message_report();

-- Realtime : la fenêtre de messagerie écoute `direct_messages` filtrée par
-- clé de conversation (messages des deux sens + accusés de lecture) et par
-- destinataire (nouveau message reçu, pour le badge des non-lus).
do $$
begin
  alter table public.direct_messages replica identity full;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
exception when others then
  raise warning 'Let''s Play : direct_messages non ajoutée à la publication Realtime (%). La messagerie se rafraîchit alors toutes les minutes.', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 4. Suppression du compte (ré-authentification requise côté application)
-- ----------------------------------------------------------------------------
-- L'application vérifie d'abord le mot de passe avec
-- `auth.signInWithPassword`, puis appelle cette fonction. La fonction est
-- SECURITY DEFINER car le rôle `authenticated` ne doit jamais recevoir un
-- accès direct à auth.users. La suppression en cascade efface le profil,
-- les commentaires et la progression du joueur.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'account_delete_requires_auth' using errcode = '42501';
  end if;

  delete from auth.users
   where id = auth.uid();

  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Droits d'accès à l'API (rôles anon / authenticated)
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
  grant insert, delete, update on public.comments to authenticated;
  -- Progression des succès : accès à sa propre ligne seulement (RLS).
  grant select, insert, update, delete on public.player_progress to authenticated;
  -- Amis : uniquement les relations dont on fait partie (RLS).
  grant select, insert, update, delete on public.friendships to authenticated;
  -- Messagerie : ses échanges (lecture / écriture / accusés de lecture),
  -- ses blocages et ses signalements — le reste est refusé par la RLS.
  grant select, insert, update, delete on public.direct_messages to authenticated;
  grant select, insert, delete on public.message_blocks to authenticated;
  grant select, insert on public.message_reports to authenticated;
exception
  when others then
    raise warning 'Let''s Play : droits anon/authenticated non appliqués (%). Sur Supabase c''est habituellement déjà le cas par défaut.', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 6. Rechargement de l'API + contrôle final
-- ----------------------------------------------------------------------------
-- PostgREST garde en mémoire la liste des tables : sans ce signal, l'API peut
-- répondre « Could not find the table 'public.comments' in the schema cache »
-- alors que la table vient d'être créée.
-- Réactions partagées : un vote par compte et par article.
create table if not exists public.article_reactions (
  article_id text not null check (length(article_id) between 1 and 300),
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('hype', 'watch', 'wait')),
  primary key (article_id, user_id)
);
alter table public.article_reactions enable row level security;
-- Les identités des votants ne sont jamais exposées ; accès via RPC seulement.
revoke all on public.article_reactions from anon, authenticated;

create or replace function public.get_article_reactions(p_article_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'hype', count(*) filter (where choice = 'hype'),
    'watch', count(*) filter (where choice = 'watch'),
    'wait', count(*) filter (where choice = 'wait'),
    'mine', coalesce(max(choice) filter (where user_id = auth.uid()), '')
  ) from public.article_reactions where article_id = p_article_id;
$$;

create or replace function public.set_article_reaction(p_article_id text, p_choice text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'reaction_requires_auth' using errcode = '42501';
  end if;
  if p_article_id is null or length(p_article_id) not between 1 and 300 then
    raise exception 'invalid_article' using errcode = '22023';
  end if;
  if p_choice is null then
    delete from public.article_reactions where article_id = p_article_id and user_id = auth.uid();
  else
    if p_choice not in ('hype', 'watch', 'wait') then
      raise exception 'invalid_reaction' using errcode = '22023';
    end if;
    insert into public.article_reactions(article_id, user_id, choice)
    values (p_article_id, auth.uid(), p_choice)
    on conflict (article_id, user_id) do update set choice = excluded.choice;
  end if;
  return public.get_article_reactions(p_article_id);
end;
$$;
revoke all on function public.get_article_reactions(text) from public;
revoke all on function public.set_article_reaction(text, text) from public;
grant execute on function public.get_article_reactions(text) to anon, authenticated;
grant execute on function public.set_article_reaction(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Vues globales des actus (compteur partagé)
-- ----------------------------------------------------------------------------
-- Une ligne par article. Compteur global exposé sur les miniatures de /news
-- et sur la page article : ``vues`` est le total de tous les lecteurs.
-- Lecture publique (anon + authenticated) ; l'incrément passe par la RPC
-- atomique ci-dessous (security definer) pour éviter qu'un client pose une
-- valeur arbitraire. Fallback local (localStorage) géré côté client si
-- Supabase n'est pas configuré.
create table if not exists public.article_views (
  article_id text primary key check (char_length(article_id) between 1 and 300),
  views integer not null default 0 check (views >= 0),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.article_views enable row level security;

  drop policy if exists "Article views are publicly readable" on public.article_views;
  create policy "Article views are publicly readable"
  on public.article_views for select using (true);
exception
  when others then
    raise warning 'Let''s Play : politiques RLS article_views non appliquées (%).', sqlerrm;
end $$;

-- Incrément atomique : insère à 1 si inconnu, sinon +1. Retourne le total.
create or replace function public.increment_article_view(p_article_id text)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare next_views integer;
begin
  if p_article_id is null or char_length(p_article_id) not between 1 and 300 then
    raise exception 'invalid_article_id' using errcode = '22023';
  end if;
  insert into public.article_views(article_id, views, updated_at)
  values (p_article_id, 1, now())
  on conflict (article_id) do update
    set views = public.article_views.views + 1, updated_at = now()
  returning views into next_views;
  return next_views;
end;
$$;

revoke all on function public.increment_article_view(text) from public;
grant execute on function public.increment_article_view(text) to anon, authenticated;

do $$
begin
  grant usage on schema public to anon, authenticated;
  grant select on public.article_views to anon, authenticated;
exception
  when others then
    raise warning 'Let''s Play : droits article_views non appliqués (%).', sqlerrm;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Quizz : tentatives & classement
-- ----------------------------------------------------------------------------
-- Une ligne par compte et par RUN (`quiz_id` = `slug:difficulté`, ex.
-- `culture-gaming:hard`) : la PREMIÈRE COMPLÉTION est conservée, c'est tout —
-- un quizz déjà terminé à une difficulté ne rapporte plus de points s'il est
-- rejoué (règle anti-farm, même contrat que l'XP côté client ; le `do
-- nothing` du conflit l'applique aussi côté serveur). Chaque difficulté,
-- elle, a ses propres points : le barème « fun » du moteur (base + rapidité
-- + combo, 200 max par question en facile) est MULTIPLIÉ par la difficulté
-- (facile ×1, confirmé ×1,5, expert ×2 → plafond 200/300/400 par question).
-- Le classement d'un run se fait donc sur les POINTS gagnés, pas sur le
-- nombre de bonnes réponses (resté affiché en secondaire). La RPC joint le
-- profil public (pseudo, avatar, niveau). Même contrat que les réactions
-- partagées : la table n'est pas exposée directement (revoke), tout passe par
-- des RPC security definer — un client ne peut ni écrire au nom d'un autre,
-- ni poser un score hors bornes (0 ≤ score ≤ total et
-- 100 × mult × score ≤ points ≤ 200 × mult × total vérifiés côté serveur,
-- le multiplicateur étant déduit du suffixe `:difficulté` de `quiz_id`).
create table if not exists public.quiz_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null check (char_length(quiz_id) between 1 and 120),
  score integer not null,
  total integer not null check (total >= 1),
  points integer not null default 0,
  perfect boolean not null default false,
  played_at timestamptz not null default now(),
  primary key (user_id, quiz_id),
  check (score between 0 and total),
  check (points >= 0)
);
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon, authenticated;

-- Points de la meilleure partie : ajout non bloquant sur une table existante.
-- Les anciennes lignes (avant les points) reçoivent le plancher du barème —
-- 100 points par bonne réponse, la base sans bonus — pour rester classables.
do $$
begin
  if to_regclass('public.quiz_attempts') is not null then
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'quiz_attempts' and column_name = 'points') then
      execute 'alter table public.quiz_attempts add column points integer not null default 0 check (points >= 0)';
    end if;
    update public.quiz_attempts set points = score * 100 where points = 0 and score > 0;
  end if;
exception when others then
  raise warning 'Let''s Play : colonne quiz_attempts.points non ajoutée (%).', sqlerrm;
end $$;

-- Dépose une tentative : conserve la PREMIÈRE COMPLÉTION du compte sur ce
-- run (quizz + difficulté) — rejoué, un quizz ne rapporte plus de points.
-- Retourne le classement à jour (le joueur voit sa ligne entrer au tableau).
-- Signature 2026-09 : p_points en plus ; l'ancienne surcharge à quatre
-- paramètres est retirée pour ne pas ambiguïser les appels. Depuis 2026-09
-- (difficultés), le `quiz_id` est composé `slug:difficulté` — le
-- multiplicateur de points en est déduit côté serveur.
drop function if exists public.submit_quiz_attempt(text, integer, integer, boolean);

create or replace function public.submit_quiz_attempt(
  p_quiz_id text, p_score integer, p_total integer, p_perfect boolean default false, p_points integer default 0
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_points integer;
  v_difficulty text;
  v_multiplier numeric;
begin
  if auth.uid() is null then
    raise exception 'quiz_requires_auth' using errcode = '42501';
  end if;
  if p_quiz_id is null or char_length(p_quiz_id) not between 1 and 120 then
    raise exception 'invalid_quiz' using errcode = '22023';
  end if;
  if p_total is null or p_total < 1 or p_score is null or p_score < 0 or p_score > p_total then
    raise exception 'invalid_quiz_score' using errcode = '22023';
  end if;
  v_points := coalesce(p_points, 0);
  -- Multiplicateur de la difficulté du run (DIFFICULTY_MULTIPLIER du moteur :
  -- facile ×1, confirmé ×1,5, expert ×2 — un slug nu, sans suffixe, reste au
  -- facteur 1). Plancher du barème (100 × multiplicateur par bonne réponse)
  -- et plafond (QUIZ_POINTS : 200 × multiplicateur max par question) : les
  -- deux bornes sont revérifiées ici, côté serveur.
  v_difficulty := split_part(p_quiz_id, ':', 2);
  v_multiplier := case v_difficulty
                    when 'medium' then 1.5
                    when 'hard' then 2
                    else 1
                  end;
  if v_points < (100 * v_multiplier) * p_score
     or v_points > (200 * v_multiplier) * p_total then
    raise exception 'invalid_quiz_points' using errcode = '22023';
  end if;

  -- Première complétion uniquement : le conflit ne met à jour JAMAIS —
  -- rejouer une difficulté déjà terminée ne remonte pas la ligne du joueur.
  insert into public.quiz_attempts as qa (user_id, quiz_id, score, total, points, perfect)
  values (auth.uid(), p_quiz_id, p_score, p_total, v_points,
          coalesce(p_perfect, false) or p_score = p_total)
  on conflict (user_id, quiz_id) do nothing;
  return public.get_quiz_leaderboard(p_quiz_id, 10);
end;
$$;

-- Classement d'un run (quizz + difficulté) : une ligne par compte, joint au
-- profil public. Trié par POINTS gagnés (bonnes réponses puis antériorité en
-- départage). `mine` marque la ligne du joueur connecté pour la surligner
-- côté client.
create or replace function public.get_quiz_leaderboard(p_quiz_id text, p_limit integer default 10)
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(row), '[]'::jsonb)
  from (
    select a.points, a.score, a.total, a.perfect, a.played_at,
           coalesce(p.display_name, p.username, '') as username,
           p.avatar_url, coalesce(p.level, 1) as level,
           (a.user_id = auth.uid()) as mine
      from public.quiz_attempts a
      left join public.profiles p on p.id = a.user_id
     where a.quiz_id = p_quiz_id
     order by a.points desc, a.score desc, a.played_at asc
     limit least(greatest(p_limit, 1), 50)
  ) row;
$$;

-- Position d'un joueur au classement GLOBAL des quizz : somme des points de
-- ses meilleures parties, tous les quizz confondus. `rank` suit le classement
-- standard (égalité = même rang), `players` compte les joueurs classés, et
-- `mine` signale si la fiche demandée est celle du visiteur. Un joueur sans
-- partie classée reçoit `rank` null (« pas encore classé »).
create or replace function public.get_quiz_global_rank(p_user_id uuid default null)
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  with totals as (
    select a.user_id, sum(a.points) as points, count(*) as quizzes
      from public.quiz_attempts a
     group by a.user_id
  ),
  ranked as (
    select t.user_id, t.points, t.quizzes,
           rank() over (order by t.points desc, t.quizzes desc) as rank,
           count(*) over () as players
      from totals t
  )
  select coalesce(
    (select jsonb_build_object(
              'rank', r.rank::int,
              'points', r.points::int,
              'quizzes', r.quizzes::int,
              'players', r.players::int,
              'mine', coalesce(r.user_id = auth.uid(), false))
       from ranked r
      where r.user_id = coalesce(p_user_id, auth.uid())),
    jsonb_build_object(
      'rank', null, 'points', 0, 'quizzes', 0,
      'players', (select count(*)::int from totals),
      'mine', coalesce(coalesce(p_user_id, auth.uid()) = auth.uid(), false))
  );
$$;

revoke all on function public.submit_quiz_attempt(text, integer, integer, boolean, integer) from public;
revoke all on function public.get_quiz_leaderboard(text, integer) from public;
revoke all on function public.get_quiz_global_rank(uuid) from public;
grant execute on function public.get_quiz_leaderboard(text, integer) to anon, authenticated;
grant execute on function public.get_quiz_global_rank(uuid) to anon, authenticated;
grant execute on function public.submit_quiz_attempt(text, integer, integer, boolean, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- 8b. REMISE À ZÉRO GLOBALE DES QUIZZ (demandée : tous les compteurs à 0)
-- ----------------------------------------------------------------------------
-- Supprime toutes les tentatives (points joueurs → 0, classements vides) et
-- nettoie la progression des succès pour que plus aucune difficulté n'affiche
-- "déjà terminé". Relançable sans risque.
do $$
begin
  if to_regclass('public.quiz_attempts') is not null then
    execute 'delete from public.quiz_attempts';
  end if;
exception when others then
  raise warning 'Let''s Play : remise à zéro quiz_attempts échouée (%).', sqlerrm;
end $$;

do $$
begin
  if to_regclass('public.player_progress') is not null then
    update public.player_progress
       set state = jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         state
                         #- '{unlocked,first-quiz}'
                         #- '{unlocked,perfect-score}'
                         #- '{unlocked,quiz-tour}'
                         #- '{unlocked,quiz-week}'
                         #- '{unlocked,first-challenge}',
                         '{counters,quizzes_completed}', '0'::jsonb, true
                       ),
                       '{counters,challenges_sent}', '0'::jsonb, true
                     ),
                     '{sets,quizzes_played}', '[]'::jsonb, true
                   ),
                   '{sets,perfect_quizzes}', '[]'::jsonb, true
                 ),
                 '{sets,quiz_days}', '[]'::jsonb, true
               ),
           updated_at = now();
    -- Recalcule xp/level à partir du state nettoyé côté app au prochain sync,
    -- mais on met déjà xp à 0 / level 1 pour que les points joueurs reviennent
    -- à 0 immédiatement si l'app ne resync pas tout de suite.
    -- On ne touche qu'aux lignes qui contenaient des données quizz pour éviter
    -- de pénaliser les joueurs sans quizz : on remet xp/level à 0/1 seulement
    -- si on vient de nettoyer, sinon on laisse tel quel. Ici on force 0/1 pour
    -- tous afin de répondre à "même les points de joueurs doivent revenir à 0".
    -- Si l'on veut conserver les autres succès, commenter les deux lignes ci-dessous
    -- et laisser le client recalculer.
    update public.player_progress set xp = 0, level = 1, updated_at = now();
  end if;
exception when others then
  raise warning 'Let''s Play : remise à zéro player_progress quizz échouée (%).', sqlerrm;
end $$;

notify pgrst, 'reload schema';

-- Contrôle final : chaque ligne doit afficher « OK ».
select controle.objet as "controle", controle.etat as "etat"
from (
  values
    (1, 'table public.comments',
      case when to_regclass('public.comments') is null then 'MANQUANT' else 'OK' end),
    (2, 'RLS activee sur comments',
      case when (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.comments')) then 'OK' else 'MANQUANT' end),
    (3, 'politiques RLS comments (4)',
      case when (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'comments'
                   and p.policyname in ('Comments are publicly readable',
                                        'Users can post comments as themselves',
                                        'Users can delete their own comments',
                                        'Users can update their own comments')) = 4
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
    (7, 'table public.player_progress',
      case when to_regclass('public.player_progress') is null then 'MANQUANT' else 'OK' end),
    (8, 'RLS activee sur player_progress',
      case when (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.player_progress')) then 'OK' else 'MANQUANT' end),
    (9, 'politiques RLS player_progress (4)',
      case when (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'player_progress'
                   and p.policyname in ('Users can read their own progress',
                                        'Users can insert their own progress',
                                        'Users can update their own progress',
                                        'Users can delete their own progress')) = 4
           then 'OK' else 'MANQUANT' end),
    (10, 'trigger progression → profil',
      case when exists (select 1 from pg_trigger t
                        where t.tgrelid = to_regclass('public.player_progress')
                          and t.tgname = 'on_player_progress_write') then 'OK' else 'MANQUANT' end),
    (11, 'trigger profil (auth.users)',
      case when exists (select 1 from pg_trigger t
                        where t.tgrelid = to_regclass('auth.users')
                          and t.tgname = 'on_auth_user_created') then 'OK' else 'ABSENT (voir WARNING)' end),
    (12, 'lecture autorisee (visiteurs)',
      case
        when to_regclass('public.comments') is null then 'MANQUANT'
        when to_regrole('anon') is null then 'role anon absent'
        when has_table_privilege('anon', 'public.comments', 'select') then 'OK'
        else 'MANQUANT'
      end),
    (13, 'ecriture autorisee (connectes)',
      case
        when to_regclass('public.comments') is null then 'MANQUANT'
        when to_regrole('authenticated') is null then 'role authenticated absent'
        when has_table_privilege('authenticated', 'public.comments', 'insert') then 'OK'
        else 'MANQUANT'
      end),
    (14, 'fonction suppression compte',
      case
        when to_regprocedure('public.delete_my_account()') is not null
         and to_regrole('authenticated') is not null
         and has_function_privilege('authenticated', 'public.delete_my_account()', 'execute')
          then 'OK'
        else 'MANQUANT'
      end),
    (15, 'table public.friendships',
      case when to_regclass('public.friendships') is null then 'MANQUANT' else 'OK' end),
    (16, 'politiques RLS friendships (4)',
      case when (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'friendships'
                   and p.policyname in ('Friendships are visible to both players',
                                        'Players send friend requests as themselves',
                                        'Players answer requests they received',
                                        'Players remove friendships they belong to')) = 4
           then 'OK' else 'MANQUANT' end),
    (17, 'trigger demande d''ami',
      case when exists (select 1 from pg_trigger t
                        where t.tgrelid = to_regclass('public.friendships')
                          and t.tgname = 'on_friendship_write') then 'OK' else 'MANQUANT' end),
    (18, 'presence profiles.last_seen_at',
      case when exists (select 1 from information_schema.columns
                        where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_seen_at')
           then 'OK' else 'MANQUANT' end),
    (19, 'realtime friendships',
      case when exists (select 1 from pg_publication_tables
                        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships')
           then 'OK' else 'ABSENT (voir WARNING)' end),
    (20, 'table public.direct_messages',
      case when to_regclass('public.direct_messages') is null then 'MANQUANT' else 'OK' end),
    (21, 'politiques RLS direct_messages (4)',
      case when (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'direct_messages'
                   and p.policyname in ('Direct messages are visible to both players',
                                        'Players send direct messages as themselves',
                                        'Recipients mark their own messages as read',
                                        'Senders delete their own messages')) = 4
           then 'OK' else 'MANQUANT' end),
    (22, 'trigger message 1-à-1 (amitié, blocage, anti-spam)',
      case when exists (select 1 from pg_trigger t
                        where t.tgrelid = to_regclass('public.direct_messages')
                          and t.tgname = 'on_direct_message_write') then 'OK' else 'MANQUANT' end),
    (23, 'trigger accusé de lecture seul modifiable',
      case when exists (select 1 from pg_trigger t
                        where t.tgrelid = to_regclass('public.direct_messages')
                          and t.tgname = 'on_direct_message_update') then 'OK' else 'MANQUANT' end),
    (24, 'tables blocages / signalements',
      case when to_regclass('public.message_blocks') is null
             or to_regclass('public.message_reports') is null then 'MANQUANT' else 'OK' end),
    (25, 'politiques RLS blocages (3) / signalements (2)',
      case when (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'message_blocks'
                   and p.policyname in ('Players see who they blocked',
                                        'Players block on their own behalf',
                                        'Players unblock on their own behalf')) = 3
            and (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = 'message_reports'
                   and p.policyname in ('Players see their own reports',
                                        'Players report on their own behalf')) = 2
           then 'OK' else 'MANQUANT' end),
    (26, 'realtime direct_messages',
      case when exists (select 1 from pg_publication_tables
                        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages')
           then 'OK' else 'ABSENT (voir WARNING)' end),
    (27, 'consoles profiles.platforms',
      case when exists (select 1 from information_schema.columns
                        where table_schema = 'public' and table_name = 'profiles' and column_name = 'platforms')
           then 'OK' else 'MANQUANT' end),
    (28, 'jeux testés profiles.tested_games',
      case when exists (select 1 from information_schema.columns
                        where table_schema = 'public' and table_name = 'profiles' and column_name = 'tested_games')
           then 'OK' else 'MANQUANT' end)
, (29, 'réactions partagées (table et RPC)',
      case when to_regclass('public.article_reactions') is not null
             and to_regprocedure('public.get_article_reactions(text)') is not null
             and to_regprocedure('public.set_article_reaction(text,text)') is not null
           then 'OK' else 'MANQUANT' end)
, (30, 'vues globales actus (table et RPC)',
      case when to_regclass('public.article_views') is not null
             and to_regprocedure('public.increment_article_view(text)') is not null
           then 'OK' else 'MANQUANT' end)
, (31, 'table public.quiz_attempts',
      case when to_regclass('public.quiz_attempts') is null then 'MANQUANT' else 'OK' end)
, (32, 'RLS activee et table quizz non exposee',
      case when to_regclass('public.quiz_attempts') is not null
            and (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.quiz_attempts'))
            and to_regrole('anon') is not null
            and not has_table_privilege('anon', 'public.quiz_attempts', 'select')
           then 'OK' else 'MANQUANT' end)
, (33, 'RPC quizz (tentative + classement + rang global)',
     case when to_regprocedure('public.submit_quiz_attempt(text,integer,integer,boolean,integer)') is not null
            and to_regprocedure('public.get_quiz_leaderboard(text,integer)') is not null
            and to_regprocedure('public.get_quiz_global_rank(uuid)') is not null
           then 'OK' else 'MANQUANT' end)
) as controle(numero, objet, etat)
order by controle.numero;
