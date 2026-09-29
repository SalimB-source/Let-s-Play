-- Mirage Rush — optional online best-score table.
-- Apply once in the Supabase SQL editor after schema.sql.
-- Only the authenticated RPC can write scores; the table itself is never
-- directly writable from anon/authenticated clients.

create table if not exists public.mirage_rush_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 150000),
  gems integer not null check (gems between 0 and 300),
  duration integer not null check (duration between 1 and 60),
  played_at timestamptz not null default now()
);

alter table public.mirage_rush_scores enable row level security;
revoke all on public.mirage_rush_scores from anon, authenticated;

create or replace function public.get_mirage_rush_leaderboard(p_limit integer default 10)
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.rank), '[]'::jsonb)
  from (
    select row_number() over (order by s.score desc, s.gems desc, s.played_at asc)::integer as rank,
           s.user_id,
           coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'Runner') as username,
           s.score,
           s.gems,
           s.played_at,
           (s.user_id = auth.uid()) as mine
      from public.mirage_rush_scores s
      left join public.profiles p on p.id = s.user_id
     order by s.score desc, s.gems desc, s.played_at asc
     limit least(greatest(coalesce(p_limit, 10), 1), 50)
  ) r;
$$;

create or replace function public.submit_mirage_rush_score(
  p_score integer,
  p_gems integer,
  p_duration integer
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'mirage_requires_auth' using errcode = '42501';
  end if;
  if p_score is null or p_score < 0 or p_score > 150000
     or p_gems is null or p_gems < 0 or p_gems > 300
     or p_duration is null or p_duration < 1 or p_duration > 60 then
    raise exception 'invalid_mirage_score' using errcode = '22023';
  end if;
  -- Broad plausibility ceiling; the game remains fully playable offline, but
  -- a modified client cannot submit an arbitrarily large leaderboard number.
  if p_score > (p_duration * 2500 + 100) then
    raise exception 'implausible_mirage_score' using errcode = '22023';
  end if;

  insert into public.mirage_rush_scores as current_score (user_id, score, gems, duration, played_at)
  values (auth.uid(), p_score, p_gems, p_duration, now())
  on conflict (user_id) do update
    set score = excluded.score,
        gems = excluded.gems,
        duration = excluded.duration,
        played_at = excluded.played_at
    where excluded.score > current_score.score
       or (excluded.score = current_score.score and excluded.gems > current_score.gems);

  return public.get_mirage_rush_leaderboard(10);
end;
$$;

revoke all on function public.get_mirage_rush_leaderboard(integer) from public;
revoke all on function public.submit_mirage_rush_score(integer, integer, integer) from public;
grant execute on function public.get_mirage_rush_leaderboard(integer) to anon, authenticated;
grant execute on function public.submit_mirage_rush_score(integer, integer, integer) to authenticated;
