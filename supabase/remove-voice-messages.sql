-- ============================================================================
--  Let's Play · retrait définitif de l'ancienne messagerie vocale
-- ============================================================================
--  À exécuter UNE fois dans Supabase Dashboard > SQL Editor, sur le projet
--  pointé par VITE_SUPABASE_URL. L'application n'utilise plus les messages
--  vocaux (messagerie 100 % texte) ; ce script efface leurs reliquats :
--  les colonnes `kind` / `attachment_*` de public.direct_messages et le
--  bucket privé `voice-messages` (avec ses politiques de stockage).
--
--  ⚠ Opération DÉFINITIVE : les messages vocaux encore stockés (lignes de
--  direct_messages et fichiers du bucket) sont perdus.
--
--  Ordre important : les triggers de direct_messages référencent les colonnes
--  `kind` / `attachment_*` tant qu'ils ne sont pas remplacés. Ce script
--  remplace donc d'abord les deux fonctions par leur version « texte
--  uniquement » (identique à supabase/schema.sql), puis supprime les colonnes
--  — sinon chaque envoi de message planterait (« record "new" has no field
--  "attachment_path" »).
--
--  Relançable sans risque : chaque étape ne fait rien si l'objet est déjà
--  absent. À la fin, le tableau de contrôle doit afficher « OK » partout.
--  Une fois ce script passé, supabase/schema.sql ne recrée rien de tout ça.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Triggers de direct_messages : version texte uniquement
-- ----------------------------------------------------------------------------
-- Copie de la version actuelle de supabase/schema.sql. `create or replace`
-- remplace les fonctions encore en place (qui, elles, parlent de `kind` et
-- des `attachment_*`) avant la suppression des colonnes plus bas.

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
    -- Un client ne peut pas antidater / postdater un message pour contourner
    -- le repère d'effacement d'un participant.
    new.created_at := clock_timestamp();

    new.body := btrim(coalesce(new.body, ''));
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


-- ----------------------------------------------------------------------------
-- 2. Messages vocaux en base, puis leurs colonnes
-- ----------------------------------------------------------------------------
-- Les messages vocaux ont un `body` vide : restés en place, ils
-- s'afficheraient comme des bulles vides. On les supprime AVANT de retirer la
-- colonne `kind`. Le tout est conditionné à la présence des colonnes : sur une
-- base déjà nettoyée (ou créée avec le schema.sql à jour), ce bloc ne fait
-- rien.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'direct_messages'
               and column_name = 'kind') then
    delete from public.direct_messages where kind = 'voice';
    alter table public.direct_messages
      drop column if exists kind,
      drop column if exists attachment_path,
      drop column if exists attachment_duration,
      drop column if exists attachment_mime;
  end if;
exception
  when others then
    raise warning 'Let''s Play : colonnes de messagerie vocale non supprimées (%).', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 3. Bucket de stockage et politiques
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    drop policy if exists "Players upload their own voice messages" on storage.objects;
    drop policy if exists "Conversation participants read voice messages" on storage.objects;
    drop policy if exists "Senders delete their own voice messages" on storage.objects;
    delete from storage.objects where bucket_id = 'voice-messages';
    delete from storage.buckets where id = 'voice-messages';
  end if;
exception
  when others then
    raise warning 'Let''s Play : bucket voice-messages non supprimé (%).', sqlerrm;
end $$;


-- ----------------------------------------------------------------------------
-- 4. Tableau de contrôle : « OK » partout = nettoyage terminé
-- ----------------------------------------------------------------------------
select * from (
  values
    (1, 'triggers direct_messages en version texte uniquement',
      case when to_regprocedure('public.prepare_direct_message()') is null
             or to_regprocedure('public.restrict_direct_message_update()') is null
           then 'MANQUANT'
           when pg_get_functiondef('public.prepare_direct_message()'::regprocedure) like '%attachment%'
             or pg_get_functiondef('public.restrict_direct_message_update()'::regprocedure) like '%attachment%'
           then 'MANQUANT'
           else 'OK'
      end),
    (2, 'colonnes kind / attachment_* supprimées',
      case when not exists (
             select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'direct_messages'
                and column_name in ('kind', 'attachment_path', 'attachment_duration', 'attachment_mime'))
           then 'OK' else 'MANQUANT' end),
    (3, 'bucket voice-messages supprimé',
      case when to_regclass('storage.buckets') is null
            or not exists (select 1 from storage.buckets where id = 'voice-messages')
           then 'OK' else 'MANQUANT' end),
    (4, 'politiques de stockage voice-messages supprimées',
      case when (select count(*) from pg_policies p
                  where p.schemaname = 'storage' and p.tablename = 'objects'
                    and p.policyname in ('Players upload their own voice messages',
                                         'Conversation participants read voice messages',
                                         'Senders delete their own voice messages')) = 0
           then 'OK' else 'MANQUANT' end)
) as controle(numero, objet, etat)
order by controle.numero;
