-- Mirage Rush multiplayer rooms. Apply in the Supabase SQL editor after schema.sql.
-- Positions are polled; results are casual client-reported race results, not anti-cheat verified.
--
-- If this table already exists from an earlier version (without 'sardinia'), run first:
--   alter table public.mirage_rooms drop constraint mirage_rooms_stage_check;
--   alter table public.mirage_rooms add constraint mirage_rooms_stage_check
--     check (stage in ('desert', 'western', 'prairie', 'sardinia'));
create table if not exists public.mirage_rooms (
  code text primary key check (code ~ '^[A-F0-9]{8}$'),
  name text not null default 'Salon Mirage' check (char_length(trim(name)) between 1 and 60),
  password_hash text,
  host_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage in ('desert', 'western', 'prairie', 'sardinia')),
  status text not null default 'lobby' check (status in ('lobby', 'started')),
  seed bigint not null check (seed between 0 and 4294967295),
  started_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mirage_rooms
  add column if not exists name text not null default 'Salon Mirage' check (char_length(trim(name)) between 1 and 60),
  add column if not exists password_hash text;

create table if not exists public.mirage_room_players (
  room_code text not null references public.mirage_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot integer not null check (slot between 0 and 3),
  ready boolean not null default false,
  distance numeric not null default 0 check (distance between 0 and 600),
  lane integer not null default 1 check (lane between 0 and 2),
  jump numeric not null default 0 check (jump between 0 and 1.7),
  score integer not null default 0 check (score between 0 and 200000),
  finished_at timestamptz,
  last_seen timestamptz not null default now(),
  primary key (room_code, user_id),
  unique (room_code, slot)
);

alter table public.mirage_room_players
  add column if not exists ready boolean not null default false;

create table if not exists public.mirage_room_messages (
  id bigserial primary key,
  room_code text not null references public.mirage_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists mirage_room_players_user_idx on public.mirage_room_players(user_id);
create index if not exists mirage_room_messages_room_idx on public.mirage_room_messages(room_code, created_at);

alter table public.mirage_rooms enable row level security;
alter table public.mirage_room_players enable row level security;
alter table public.mirage_room_messages enable row level security;
revoke all on public.mirage_rooms, public.mirage_room_players, public.mirage_room_messages from anon, authenticated;

drop function if exists public.mirage_room_action(text, text, text, numeric, integer, numeric, integer);

-- One transactional gate for list/create/join/ready/chat/poll/start/position/finish/leave.
-- Locking the room row makes join capacity, ready checks, and host start decisions atomic.
create or replace function public.mirage_room_action(
  p_action text,
  p_code text default null,
  p_stage text default null,
  p_distance numeric default null,
  p_lane integer default null,
  p_jump numeric default null,
  p_score integer default null,
  p_name text default null,
  p_password text default null,
  p_ready boolean default null,
  p_message text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.mirage_rooms%rowtype;
  uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_name text := left(trim(coalesce(p_name, '')), 60);
  v_password text := trim(coalesce(p_password, ''));
  v_message text := left(trim(coalesce(p_message, '')), 280);
  slot_number integer;
  result jsonb;
begin
  if p_action = 'list' then
    select jsonb_build_object(
      'server_now', now(),
      'rooms', coalesce((
        select jsonb_agg(jsonb_build_object(
          'code', rm.code,
          'name', rm.name,
          'stage', rm.stage,
          'status', rm.status,
          'host_id', rm.host_id,
          'host_name', left(coalesce(nullif(hp.display_name, ''), nullif(hp.username, ''), 'Cavalier'), 24),
          'has_password', (rm.password_hash is not null and rm.password_hash <> ''),
          'player_count', (select count(*)::int from public.mirage_room_players mp where mp.room_code = rm.code),
          'ready_count', (select count(*)::int from public.mirage_room_players mp where mp.room_code = rm.code and mp.ready),
          'created_at', rm.created_at
        ) order by rm.created_at desc)
        from public.mirage_rooms rm
        left join public.profiles hp on hp.id = rm.host_id
        where rm.status = 'lobby'
          and rm.created_at > now() - interval '2 hours'
          and (select count(*) from public.mirage_room_players mp where mp.room_code = rm.code) > 0
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  if uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_action not in ('create', 'join', 'ready', 'chat', 'get', 'start', 'tick', 'finish', 'leave') then
    raise exception 'Action inconnue' using errcode = '22023';
  end if;

  if p_action = 'create' then
    if p_stage not in ('desert', 'western', 'prairie', 'sardinia') or p_stage is null then
      raise exception 'Carte inconnue' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
    -- Clean up any previous open lobby hosted by the same user.
    delete from public.mirage_rooms
      where host_id = uid and status = 'lobby';
    if v_name = '' then
      select 'Salon de ' || left(coalesce(nullif(prof.display_name, ''), nullif(prof.username, ''), 'Cavalier'), 24)
        into v_name
        from public.profiles prof where prof.id = uid;
      v_name := coalesce(nullif(v_name, ''), 'Salon Mirage');
    end if;
    loop
      v_code := upper(left(md5(gen_random_uuid()::text), 8));
      insert into public.mirage_rooms(code, name, password_hash, host_id, stage, seed)
      values (
        v_code,
        v_name,
        case when v_password <> '' then md5(v_password) else null end,
        uid,
        p_stage,
        floor(random() * 4294967296)::bigint
      )
      on conflict do nothing;
      exit when found;
    end loop;
    insert into public.mirage_room_players(room_code, user_id, slot, ready)
      values (v_code, uid, 0, false);
  else
    if v_code !~ '^[A-F0-9]{8}$' then raise exception 'Code invalide' using errcode = '22023'; end if;
    select * into r from public.mirage_rooms where mirage_rooms.code = v_code for update;
    if not found or r.created_at < now() - interval '2 hours' then
      raise exception 'Salon introuvable ou expiré' using errcode = '22023';
    end if;

    if p_action = 'join' then
      if not exists (select 1 from public.mirage_room_players where room_code = v_code and user_id = uid) then
        if r.status <> 'lobby' then raise exception 'Course déjà lancée' using errcode = '22023'; end if;
        if r.password_hash is not null and r.password_hash <> '' then
          if v_password = '' or md5(v_password) <> r.password_hash then
            raise exception 'Mot de passe incorrect' using errcode = '42501';
          end if;
        end if;
        select gs into slot_number from generate_series(0, 3) gs
          where not exists(select 1 from public.mirage_room_players where room_code = v_code and slot = gs)
          order by gs limit 1;
        if slot_number is null then raise exception 'Salon complet (4 joueurs)' using errcode = '22023'; end if;
        insert into public.mirage_room_players(room_code, user_id, slot, ready)
          values (v_code, uid, slot_number, false);
      end if;
    elsif not exists(select 1 from public.mirage_room_players where room_code = v_code and user_id = uid) then
      raise exception 'Tu ne fais pas partie de ce salon' using errcode = '42501';
    end if;

    if p_action = 'ready' then
      if r.status <> 'lobby' then raise exception 'Course déjà lancée' using errcode = '22023'; end if;
      update public.mirage_room_players
        set ready = coalesce(p_ready, not ready), last_seen = now()
        where room_code = v_code and user_id = uid;
    elsif p_action = 'chat' then
      if char_length(v_message) < 1 then
        raise exception 'Message vide' using errcode = '22023';
      end if;
      insert into public.mirage_room_messages(room_code, user_id, body)
        values (v_code, uid, v_message);
    elsif p_action = 'start' then
      if r.host_id <> uid then raise exception 'Seul l’hôte peut lancer la partie' using errcode = '42501'; end if;
      if r.status <> 'lobby' then raise exception 'Course déjà lancée' using errcode = '22023'; end if;
      if (select count(*) from public.mirage_room_players where room_code = v_code) < 2 then
        raise exception 'Il faut au moins deux joueurs' using errcode = '22023';
      end if;
      if exists (select 1 from public.mirage_room_players where room_code = v_code and not ready) then
        raise exception 'Tous les joueurs doivent être prêts pour lancer la partie' using errcode = '22023';
      end if;
      update public.mirage_rooms
        set status = 'started', started_at = now() + interval '5 seconds'
        where mirage_rooms.code = v_code;
    elsif p_action in ('tick', 'finish') then
      if r.status <> 'started' or now() < r.started_at then
        raise exception 'La course n’a pas commencé' using errcode = '22023';
      end if;
      if p_distance is null or p_distance < 0 or p_distance > 600 or
         p_lane is null or p_lane not between 0 and 2 or
         p_jump is null or p_jump not between 0 and 1.7 or
         p_score is null or p_score not between 0 and 200000 then
        raise exception 'Position invalide' using errcode = '22023';
      end if;
      if p_action = 'finish' and p_distance < 600 then raise exception 'Arrivée non atteinte' using errcode = '22023'; end if;
      update public.mirage_room_players
        set distance = greatest(distance, p_distance), lane = p_lane, jump = p_jump, score = p_score,
            finished_at = case when p_action = 'finish' and finished_at is null then now() else finished_at end,
            last_seen = now()
        where room_code = v_code and user_id = uid and finished_at is null;
    elsif p_action = 'leave' then
      if r.host_id = uid and r.status = 'lobby' then
        delete from public.mirage_rooms where mirage_rooms.code = v_code;
        return jsonb_build_object('left', true, 'server_now', now());
      end if;
      delete from public.mirage_room_players where room_code = v_code and user_id = uid;
      return jsonb_build_object('left', true, 'server_now', now());
    end if;

    update public.mirage_room_players set last_seen = now() where room_code = v_code and user_id = uid;
  end if;

  select jsonb_build_object(
    'code', room.code,
    'name', room.name,
    'has_password', (room.password_hash is not null and room.password_hash <> ''),
    'host_id', room.host_id,
    'stage', room.stage,
    'status', room.status,
    'seed', room.seed,
    'started_at', room.started_at,
    'server_now', now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'name', left(coalesce(nullif(prof.display_name, ''), nullif(prof.username, ''), 'Cavalier'), 24),
        'slot', p.slot,
        'ready', p.ready,
        'distance', p.distance,
        'lane', p.lane,
        'jump', p.jump,
        'score', p.score,
        'finished_at', p.finished_at,
        'last_seen', p.last_seen
      ) order by p.slot)
      from public.mirage_room_players p
      left join public.profiles prof on prof.id = p.user_id
      where p.room_code = room.code
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(msg order by msg.created_at asc, msg.id asc)
      from (
        select
          m.id,
          m.user_id,
          left(coalesce(nullif(prof.display_name, ''), nullif(prof.username, ''), 'Cavalier'), 24) as name,
          coalesce(rp.slot, 0) as slot,
          m.body,
          m.created_at
        from public.mirage_room_messages m
        left join public.profiles prof on prof.id = m.user_id
        left join public.mirage_room_players rp on rp.room_code = m.room_code and rp.user_id = m.user_id
        where m.room_code = room.code
        order by m.created_at desc, m.id desc
        limit 50
      ) msg
    ), '[]'::jsonb)
  ) into result from public.mirage_rooms room where room.code = v_code;
  return result;
end;
$$;

revoke all on function public.mirage_room_action(text, text, text, numeric, integer, numeric, integer, text, text, boolean, text) from public;
grant execute on function public.mirage_room_action(text, text, text, numeric, integer, numeric, integer, text, text, boolean, text) to anon, authenticated;
