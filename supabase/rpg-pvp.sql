-- Le Sablier en ligne — schéma du PvP.
-- À exécuter dans l'éditeur SQL de Supabase APRÈS `schema.sql` (table `profiles`,
-- `direct_messages`, RLS des messages). Idempotent : rejouable sans perte.
--
-- Principe : **l'état d'un duel ne sort jamais de la base tel quel**. Il est
-- écrit et lu par l'arbitre (`api/sablier-duel.js`, clé service), qui n'en
-- renvoie qu'une vue filtrée (`rpgPvpVue` dans `src/games/rpgPvp.js`). Aucune
-- politique RLS n'ouvre `rpg_sablier_duels` au client : la seule porte est
-- l'arbitre, qui vérifie le JWT et rejoue l'intention avec le moteur du jeu.
--
-- Les autres tables (file d'attente, invitations, classement) sont, elles,
-- lisibles par leur propriétaire — ce sont des données de salon, pas de jeu.

-- ---------------------------------------------------------------------------
-- 1. Invitation dans la messagerie : un message typé, pas une chaîne à parser
-- ---------------------------------------------------------------------------
-- `body` reste le texte lisible (« Yasmine te défie au Sablier — Rejoindre »).
-- Un ancien client qui ne connaît pas `kind` affiche donc quand même un
-- message correct ; le client à jour lit `payload` et dessine une carte.
alter table public.direct_messages
  add column if not exists kind text not null default 'texte',
  add column if not exists payload jsonb;

alter table public.direct_messages
  drop constraint if exists direct_messages_kind_check;
alter table public.direct_messages
  add constraint direct_messages_kind_check
  check (kind in ('texte', 'defi-sablier', 'defi-sablier-resultat'));

-- Le statut d'un défi (en attente / accepté / refusé / terminé) n'est JAMAIS
-- recopié dans `payload` : la carte lit la table des duels par l'arbitre. Un
-- message ne peut donc pas mentir sur l'état d'une partie.

-- ---------------------------------------------------------------------------
-- 2. Les duels
-- ---------------------------------------------------------------------------
create table if not exists public.rpg_sablier_duels (
  code text primary key check (code ~ '^[A-F0-9]{8}$'),
  -- `live` : horloge de tour, les deux joueurs sont là.
  -- `async` : à la correspondance, pas de pendule, un rappel par jour.
  mode text not null default 'live' check (mode in ('live', 'async')),
  -- `amis` : invitation nominative. `lien` : n'importe qui avec le code.
  visibilite text not null default 'amis' check (visibilite in ('amis', 'lien')),
  statut text not null default 'invitation'
    check (statut in ('invitation', 'en_cours', 'terminee', 'refusee', 'expiree')),
  -- Siège `joueur` = hôte (celui qui crée le défi), siège `sorcier` = invité.
  hote_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid references auth.users(id) on delete cascade,
  -- Decks validés côté serveur : uniquement des identifiants de cartes, jamais
  -- la collection. `rpgValiderDeck` (rpgCards.js) doit les accepter ET le
  -- joueur doit posséder les cartes de `rpg_sablier_progress`.
  hote_deck jsonb not null check (jsonb_typeof(hote_deck) = 'array'),
  invite_deck jsonb check (invite_deck is null or jsonb_typeof(invite_deck) = 'array'),
  -- État de référence du moteur `rpgDuel.js`, en JSON : ~2 Ko en début de
  -- partie. `null` tant que le duel n'a pas commencé (invitation en attente).
  etat jsonb,
  graine bigint not null default floor(random() * 4294967296)::bigint,
  tour text check (tour in ('joueur', 'sorcier')),
  -- Dernier numéro d'action accepté : l'idempotence et l'anti-rejeu tiennent
  -- dans cette colonne (voir `rpg_sablier_duel_actions`).
  seq integer not null default 0,
  -- `version` du protocole client : deux versions différentes ne s'affrontent pas.
  version integer not null default 1,
  gagnant_id uuid references auth.users(id) on delete set null,
  fin_raison text check (fin_raison is null or fin_raison in ('pv', 'abandon', 'temps', 'nul')),
  hote_pv integer,
  invite_pv integer,
  dernier_coup timestamptz,
  echeance timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint rpg_sablier_duels_deux_joueurs
    check (invite_id is null or invite_id <> hote_id)
);

create index if not exists rpg_sablier_duels_hote_idx on public.rpg_sablier_duels (hote_id, maj_le desc);
create index if not exists rpg_sablier_duels_invite_idx on public.rpg_sablier_duels (invite_id, maj_le desc);
-- Un joueur ne peut avoir qu'une invitation en attente à la fois : sans cela,
-- un même ami reçoit dix cartes de défi identiques.
create unique index if not exists rpg_sablier_duels_une_invitation_idx
  on public.rpg_sablier_duels (hote_id, invite_id)
  where statut = 'invitation' and invite_id is not null;

-- Journal des intentions : la source d'audit, et le garde-fou anti-rejeu.
create table if not exists public.rpg_sablier_duel_actions (
  code text not null references public.rpg_sablier_duels(code) on delete cascade,
  seq integer not null check (seq > 0),
  acteur_id uuid not null references auth.users(id) on delete cascade,
  siege text not null check (siege in ('joueur', 'sorcier')),
  intention jsonb not null,
  resultat text not null default 'ok' check (resultat in ('ok', 'refusee')),
  cree_le timestamptz not null default now(),
  primary key (code, seq)
);

-- ---------------------------------------------------------------------------
-- 3. File d'attente (« trouver un adversaire »)
-- ---------------------------------------------------------------------------
create table if not exists public.rpg_sablier_file (
  joueur_id uuid primary key references auth.users(id) on delete cascade,
  deck jsonb not null check (jsonb_typeof(deck) = 'array'),
  mode text not null default 'live' check (mode in ('live', 'async')),
  classement boolean not null default false,
  note integer not null default 1200 check (note between 0 and 4000),
  entre_le timestamptz not null default now(),
  battement timestamptz not null default now()
);

create index if not exists rpg_sablier_file_attente_idx
  on public.rpg_sablier_file (entre_le)
  where mode = 'live';

alter table public.rpg_sablier_file enable row level security;
drop policy if exists "Un joueur voit sa propre attente" on public.rpg_sablier_file;
create policy "Un joueur voit sa propre attente"
  on public.rpg_sablier_file for select to authenticated
  using (auth.uid() = joueur_id);

-- ---------------------------------------------------------------------------
-- 4. Classement (facultatif : réservé aux défis « classés »)
-- ---------------------------------------------------------------------------
create table if not exists public.rpg_sablier_classement (
  joueur_id uuid primary key references auth.users(id) on delete cascade,
  note integer not null default 1200 check (note between 0 and 4000),
  victoires integer not null default 0,
  defaites integer not null default 0,
  nuls integer not null default 0,
  maj_le timestamptz not null default now()
);

alter table public.rpg_sablier_classement enable row level security;
drop policy if exists "Le classement est public" on public.rpg_sablier_classement;
create policy "Le classement est public"
  on public.rpg_sablier_classement for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 5. RLS : l'état des duels est invisible au client
-- ---------------------------------------------------------------------------
alter table public.rpg_sablier_duels enable row level security;
alter table public.rpg_sablier_duel_actions enable row level security;
-- Aucune politique : RLS refuse tout. On retire aussi les droits de table,
-- pour que même un futur `grant` implicite ne rouvre pas la porte.
revoke all on public.rpg_sablier_duels, public.rpg_sablier_duel_actions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Entrer / sortir de la file (RPC clients, sans arbitre)
-- ---------------------------------------------------------------------------
create or replace function public.rpg_sablier_file_rejoindre(
  p_deck jsonb,
  p_mode text default 'live',
  p_classe boolean default false,
  p_note integer default 1200
) returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_mode text := case when p_mode = 'async' then 'async' else 'live' end;
  v_note integer := least(4000, greatest(0, coalesce(p_note, 1200)));
  adversaire public.rpg_sablier_file%rowtype;
  duel public.rpg_sablier_duels%rowtype;
  v_code text;
begin
  if uid is null then
    raise exception 'connexion_requise' using errcode = '42501';
  end if;
  if p_deck is null or jsonb_typeof(p_deck) <> 'array' or jsonb_array_length(p_deck) < 20 then
    raise exception 'deck_invalide' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rpg_sablier_file', 0));

  -- Un adversaire qui attend le même mode, dont l'attente n'est pas périmée
  -- (30 s en direct), avec une note aussi proche que possible.
  select * into adversaire
    from public.rpg_sablier_file f
   where f.joueur_id <> uid
     and f.mode = v_mode
     and f.classement = p_classe
     and (v_mode = 'async' or f.battement > now() - interval '30 seconds')
   order by abs(f.note - v_note), f.entre_le
   limit 1
   for update skip locked;

  if adversaire.joueur_id is not null then
    loop
      v_code := upper(left(md5(gen_random_uuid()::text), 8));
      exit when not exists (select 1 from public.rpg_sablier_duels d where d.code = v_code);
    end loop;

    insert into public.rpg_sablier_duels
      (code, mode, visibilite, statut, hote_id, invite_id, hote_deck, invite_deck, tour)
    values
      (v_code, v_mode, 'lien', 'en_cours', adversaire.joueur_id, uid, adversaire.deck, p_deck, 'joueur')
    returning * into duel;

    delete from public.rpg_sablier_file where joueur_id in (adversaire.joueur_id, uid);

    return jsonb_build_object(
      'statut', 'apparie',
      'code', duel.code,
      'siege', 'sorcier',
      'adversaire_id', adversaire.joueur_id,
      'mode', duel.mode
    );
  end if;

  insert into public.rpg_sablier_file (joueur_id, deck, mode, classement, note, entre_le, battement)
  values (uid, p_deck, v_mode, p_classe, v_note, now(), now())
  on conflict (joueur_id) do update
    set deck = excluded.deck,
        mode = excluded.mode,
        classement = excluded.classement,
        note = excluded.note,
        entre_le = now(),
        battement = now();

  return jsonb_build_object('statut', 'attente', 'mode', v_mode);
end;
$$;

create or replace function public.rpg_sablier_file_quitter()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion_requise' using errcode = '42501';
  end if;
  delete from public.rpg_sablier_file where joueur_id = auth.uid();
end;
$$;

-- Battement de cœur : la file ne garde pas de fantômes. Appelé par le client
-- toutes les 10 s pendant l'attente.
create or replace function public.rpg_sablier_file_battement()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion_requise' using errcode = '42501';
  end if;
  update public.rpg_sablier_file set battement = now() where joueur_id = auth.uid();
end;
$$;

revoke all on function public.rpg_sablier_file_rejoindre(jsonb, text, boolean, integer) from anon;
revoke all on function public.rpg_sablier_file_quitter() from anon;
revoke all on function public.rpg_sablier_file_battement() from anon;
grant execute on function public.rpg_sablier_file_rejoindre(jsonb, text, boolean, integer) to authenticated;
grant execute on function public.rpg_sablier_file_quitter() to authenticated;
grant execute on function public.rpg_sablier_file_battement() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Ménage : invitations et duels oubliés
-- ---------------------------------------------------------------------------
-- À planifier (pg_cron) une fois par heure :
--   select public.rpg_sablier_purge();
create or replace function public.rpg_sablier_purge()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.rpg_sablier_duels
     set statut = 'expiree'
   where statut = 'invitation'
     and cree_le < now() - interval '7 days';

  -- Une partie à la correspondance abandonnée depuis 30 jours disparaît.
  delete from public.rpg_sablier_duels
   where mode = 'async'
     and statut in ('terminee', 'expiree', 'refusee')
     and maj_le < now() - interval '30 days';

  delete from public.rpg_sablier_file
   where battement < now() - interval '2 minutes';
end;
$$;

revoke all on function public.rpg_sablier_purge() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Realtime : la carte d'invitation arrive comme un message
-- ---------------------------------------------------------------------------
-- `direct_messages` est déjà publié (schema.sql §messages). Rien à ajouter
-- pour l'invitation. Le DÉROULÉ d'une partie, lui, n'a pas besoin de realtime :
-- le client interroge l'arbitre toutes les 2 s quand ce n'est pas son tour
-- (même choix que les salons Mirage), et le serveur répond avec `version`.
