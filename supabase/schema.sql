-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Creates a profile row for every new auth user (email signup, OAuth, ...).
-- Picks up the gamertag chosen on the registration form (stored in
-- raw_user_meta_data by the app) as username / display name.
-- Never blocks signup: if the gamertag is already taken, the profile is
-- created without a username instead of failing the insert.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Article comments
-- ---------------------------------------------------------------------------
-- One row per comment. `article_id` is the article route (e.g. "/news/physint",
-- "/reviews/wolverine"), which is stable across the Vercel and GitHub Pages
-- deployments. Author fields are denormalised so the feed renders without a
-- join and keeps the name the player had when they posted.
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

alter table public.comments enable row level security;

-- Anyone (including logged-out visitors) can read the conversation.
drop policy if exists "Comments are publicly readable" on public.comments;
create policy "Comments are publicly readable"
on public.comments for select using (true);

-- Only signed-in players can post, and only as themselves.
drop policy if exists "Users can post comments as themselves" on public.comments;
create policy "Users can post comments as themselves"
on public.comments for insert to authenticated with check (auth.uid() = user_id);

-- Players can remove their own comments.
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
on public.comments for delete to authenticated using (auth.uid() = user_id);

-- Fills the author columns server-side from the signed-in user (gamertag and
-- avatar chosen on /auth, then the profile row, then the email), so a client
-- can never post under someone else's name. Also trims the body and applies a
-- small per-user rate limit against spam.
create or replace function public.set_comment_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb;
  user_email text;
  profile public.profiles%rowtype;
  recent integer;
begin
  new.user_id := coalesce(auth.uid(), new.user_id);
  if new.user_id is null then
    raise exception 'comment_requires_auth' using errcode = '42501';
  end if;

  select raw_user_meta_data, email into meta, user_email
  from auth.users where id = new.user_id;
  select * into profile from public.profiles where id = new.user_id;

  new.author_name := coalesce(
    nullif(trim(meta->>'gamertag'), ''),
    nullif(trim(profile.username), ''),
    nullif(trim(profile.display_name), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(split_part(coalesce(user_email, ''), '@', 1), ''),
    'Player'
  );
  new.author_avatar := coalesce(
    nullif(trim(meta->>'avatar'), ''),
    nullif(trim(meta->>'avatar_url'), ''),
    nullif(trim(meta->>'picture'), ''),
    nullif(trim(profile.avatar_url), '')
  );
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
