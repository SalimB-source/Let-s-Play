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
