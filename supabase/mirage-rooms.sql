-- Mirage Rush multiplayer rooms. Apply in the Supabase SQL editor after schema.sql.
-- Positions are polled; results are casual client-reported race results, not anti-cheat verified.
create table if not exists public.mirage_rooms (
  code text primary key check (code ~ '^[A-F0-9]{8}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage in ('desert', 'western', 'prairie')),
  status text not null default 'lobby' check (status in ('lobby', 'started')),
  seed bigint not null check (seed between 0 and 4294967295),
  started_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.mirage_room_players (
  room_code text not null references public.mirage_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot integer not null check (slot between 0 and 3),
  distance numeric not null default 0 check (distance between 0 and 600),
  lane integer not null default 1 check (lane between 0 and 2),
  jump numeric not null default 0 check (jump between 0 and 1.7),
  score integer not null default 0 check (score between 0 and 200000),
  finished_at timestamptz,
  last_seen timestamptz not null default now(),
  primary key (room_code, user_id),
  unique (room_code, slot)
);
create index if not exists mirage_room_players_user_idx on public.mirage_room_players(user_id);
alter table public.mirage_rooms enable row level security;
alter table public.mirage_room_players enable row level security;
revoke all on public.mirage_rooms, public.mirage_room_players from anon, authenticated;

-- One transactional gate for create/join/poll/start/position/finish/leave.
-- Locking the room row makes join capacity and host start decisions atomic.
create or replace function public.mirage_room_action(
  p_action text, p_code text default null, p_stage text default null,
  p_distance numeric default null, p_lane integer default null,
  p_jump numeric default null, p_score integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.mirage_rooms%rowtype;
  uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  slot_number integer;
  result jsonb;
begin
  if uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_action not in ('create','join','get','start','tick','finish','leave') then
    raise exception 'Action inconnue' using errcode = '22023';
  end if;
  if p_action = 'create' then
    if p_stage not in ('desert','western','prairie') or p_stage is null then
      raise exception 'Carte inconnue' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
    -- Prevent multiple active lobbies for one host.
    if exists(select 1 from public.mirage_rooms where host_id=uid and status='lobby' and created_at > now()-interval '2 hours') then
      raise exception 'Quitte ton salon précédent avant d’en créer un autre' using errcode = '23505';
    end if;
    loop
      v_code := upper(left(md5(gen_random_uuid()::text), 8));
      insert into public.mirage_rooms(code, host_id, stage, seed)
      values (v_code, uid, p_stage, floor(random()*4294967296)::bigint)
      on conflict do nothing;
      exit when found;
    end loop;
    insert into public.mirage_room_players(room_code,user_id,slot) values (v_code,uid,0);
  else
    if v_code !~ '^[A-F0-9]{8}$' then raise exception 'Code invalide' using errcode='22023'; end if;
    select * into r from public.mirage_rooms where mirage_rooms.code=v_code for update;
    if not found or r.created_at < now()-interval '2 hours' then
      raise exception 'Salon introuvable ou expiré' using errcode='22023';
    end if;
    if p_action = 'join' then
      if not exists (select 1 from public.mirage_room_players where room_code=v_code and user_id=uid) then
        if r.status <> 'lobby' then raise exception 'Course déjà lancée' using errcode='22023'; end if;
        select gs into slot_number from generate_series(0,3) gs
          where not exists(select 1 from public.mirage_room_players where room_code=v_code and slot=gs)
          order by gs limit 1;
        if slot_number is null then raise exception 'Salon complet (4 joueurs)' using errcode='22023'; end if;
        insert into public.mirage_room_players(room_code,user_id,slot) values(v_code,uid,slot_number);
      end if;
    elsif not exists(select 1 from public.mirage_room_players where room_code=v_code and user_id=uid) then
      raise exception 'Tu ne fais pas partie de ce salon' using errcode='42501';
    end if;
    if p_action='start' then
      if r.host_id <> uid then raise exception 'Seul l’hôte peut lancer la partie' using errcode='42501'; end if;
      if r.status <> 'lobby' then raise exception 'Course déjà lancée' using errcode='22023'; end if;
      if (select count(*) from public.mirage_room_players where room_code=v_code) < 2 then
        raise exception 'Il faut au moins deux joueurs' using errcode='22023';
      end if;
      update public.mirage_rooms set status='started', started_at=now()+interval '5 seconds' where mirage_rooms.code=v_code;
    elsif p_action in ('tick','finish') then
      if r.status <> 'started' or now() < r.started_at then
        raise exception 'La course n’a pas commencé' using errcode='22023';
      end if;
      if p_distance is null or p_distance < 0 or p_distance > 600 or
         p_lane is null or p_lane not between 0 and 2 or
         p_jump is null or p_jump not between 0 and 1.7 or
         p_score is null or p_score not between 0 and 200000 then
        raise exception 'Position invalide' using errcode='22023';
      end if;
      if p_action='finish' and p_distance < 600 then raise exception 'Arrivée non atteinte' using errcode='22023'; end if;
      update public.mirage_room_players
        set distance=greatest(distance,p_distance), lane=p_lane, jump=p_jump, score=p_score,
            finished_at=case when p_action='finish' and finished_at is null then now() else finished_at end,
            last_seen=now()
        where room_code=v_code and user_id=uid and finished_at is null;
    elsif p_action='leave' then
      if r.host_id=uid and r.status='lobby' then
        delete from public.mirage_rooms where mirage_rooms.code=v_code;
        return jsonb_build_object('left',true,'server_now',now());
      end if;
      delete from public.mirage_room_players where room_code=v_code and user_id=uid;
      return jsonb_build_object('left',true,'server_now',now());
    end if;
    update public.mirage_room_players set last_seen=now() where room_code=v_code and user_id=uid;
  end if;
  select jsonb_build_object(
    'code', room.code, 'host_id',room.host_id,'stage',room.stage,
    'status',room.status,'seed',room.seed,'started_at',room.started_at,
    'server_now',now(),
    'players',coalesce((select jsonb_agg(jsonb_build_object(
      'user_id',p.user_id,'name',left(coalesce(nullif(prof.display_name,''),nullif(prof.username,''),'Cavalier'),24),
      'slot',p.slot,'distance',p.distance,'lane',p.lane,'jump',p.jump,
      'score',p.score,'finished_at',p.finished_at,'last_seen',p.last_seen
    ) order by p.slot) from public.mirage_room_players p
      left join public.profiles prof on prof.id=p.user_id where p.room_code=room.code),'[]'::jsonb)
  ) into result from public.mirage_rooms room where room.code=v_code;
  return result;
end;
$$;
revoke all on function public.mirage_room_action(text,text,text,numeric,integer,numeric,integer) from public;
grant execute on function public.mirage_room_action(text,text,text,numeric,integer,numeric,integer) to authenticated;
