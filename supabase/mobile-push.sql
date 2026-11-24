-- =============================================================================
-- Notifications Push Mobile (React Native / Expo) — public.push_tokens
-- =============================================================================
-- Stocke les jetons Expo Push (`ExponentPushToken[...]`) associés aux joueurs
-- connectés, leur langue d'affichage (`fr`, `en`, `ar`) et leurs préférences
-- par catégorie (messages directs, demandes d'amis, actualités).
--
-- Ce script est idempotent et n'altère aucune table existante.
-- =============================================================================

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null check (
    char_length(expo_push_token) between 16 and 256
    and expo_push_token ~ '^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$'
  ),
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  lang text not null default 'fr' check (lang in ('fr', 'en', 'ar')),
  notify_messages boolean not null default true,
  notify_friends boolean not null default true,
  notify_news boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_token_unique unique (expo_push_token)
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
  on public.push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
  on public.push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Enregistre ou met à jour le jeton de l'appareil courant pour le compte
-- connecté. Si un autre compte utilisait auparavant ce même téléphone, le
-- jeton est réaffecté proprement au joueur actuellement authentifié.
create or replace function public.upsert_push_token(
  p_token text,
  p_platform text default 'unknown',
  p_lang text default 'fr',
  p_notify_messages boolean default true,
  p_notify_friends boolean default true,
  p_notify_news boolean default true
)
returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lang text := case when p_lang in ('fr', 'en', 'ar') then p_lang else 'fr' end;
  v_platform text := case when p_platform in ('ios', 'android', 'web') then p_platform else 'unknown' end;
  v_row public.push_tokens;
begin
  if v_uid is null then
    raise exception 'push_token_auth_required';
  end if;

  if p_token is null or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$' then
    raise exception 'push_token_invalid_format';
  end if;

  insert into public.push_tokens (
    user_id,
    expo_push_token,
    platform,
    lang,
    notify_messages,
    notify_friends,
    notify_news,
    updated_at
  )
  values (
    v_uid,
    p_token,
    v_platform,
    v_lang,
    coalesce(p_notify_messages, true),
    coalesce(p_notify_friends, true),
    coalesce(p_notify_news, true),
    now()
  )
  on conflict (expo_push_token) do update
    set user_id = v_uid,
        platform = excluded.platform,
        lang = excluded.lang,
        notify_messages = excluded.notify_messages,
        notify_friends = excluded.notify_friends,
        notify_news = excluded.notify_news,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_push_token(text, text, text, boolean, boolean, boolean) from public;
grant execute on function public.upsert_push_token(text, text, text, boolean, boolean, boolean) to authenticated;

-- Retire le jeton de l'appareil lors de la déconnexion du compte.
create or replace function public.delete_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_token is null then
    return;
  end if;
  delete from public.push_tokens
   where user_id = v_uid
     and expo_push_token = p_token;
end;
$$;

revoke all on function public.delete_push_token(text) from public;
grant execute on function public.delete_push_token(text) to authenticated;
