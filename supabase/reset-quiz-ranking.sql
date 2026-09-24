-- ----------------------------------------------------------------------------
-- Remise à zéro complète des quizz — TOUS les joueurs
-- ----------------------------------------------------------------------------
-- Où : Supabase → SQL Editor → New query → coller → Run.
--
-- Cette opération est destructive et irréversible. Elle remet à zéro, pour
-- tous les comptes :
--   * les scores et classements (`quiz_attempts`),
--   * les trois niveaux terminés (`quiz_progress`),
--   * les points d'XP, compteurs, jours, succès et défis liés aux quizz dans
--     `player_progress`.
--
-- Les profils, comptes et progression NON liée aux quizz sont conservés.
-- L'XP et le niveau restants sont recalculés à partir de la progression
-- conservée. Les anciennes copies dans le stockage du navigateur sont
-- invalidées par la version publiée du client (`quizResetVersion` et les clés
-- locales v2/v3) : un joueur ne récupère donc pas ses anciens quizz en
-- revenant sur le site.
--
-- Si l'ancien schéma n'a pas encore créé `quiz_progress` ou `player_progress`,
-- le bloc concerné est ignoré avec un message NOTICE. `quiz_attempts` doit
-- normalement exister après l'installation de `supabase/schema.sql`.
--
-- Exporter les tables avant de lancer ce script si une sauvegarde est requise.
-- ----------------------------------------------------------------------------

begin;

-- 1) État AVANT : garde une trace de ce qui va disparaître.
select count(*)                 as tentatives,
       count(distinct user_id)  as joueurs_classes,
       coalesce(sum(points), 0) as points_cumules
  from public.quiz_attempts;

do $$
begin
  if to_regclass('public.quiz_progress') is not null then
    raise notice 'Let''s Play : % niveau(x) de quizz seront supprimés.',
      (select count(*) from public.quiz_progress);
  else
    raise notice 'Let''s Play : public.quiz_progress absente — rien à supprimer dans cette table.';
  end if;

  if to_regclass('public.player_progress') is not null then
    raise notice 'Let''s Play : % profil(s) seront nettoyés de leur progression quizz.',
      (select count(*) from public.player_progress);
  else
    raise notice 'Let''s Play : public.player_progress absente — nettoyage des succès ignoré.';
  end if;
end $$;

-- 2) Scores partagés : aucun joueur ne reste classé.
--    TRUNCATE est atomique dans la transaction et ne laisse aucun ancien run.
truncate table public.quiz_attempts;

-- 3) Progression des paliers : les niveaux Facile, Confirmé et Expert sont
--    tous à nouveau ouverts. Le test conditionnel permet aussi d'utiliser le
--    script sur un projet qui n'a pas encore relancé la dernière partie du
--    schéma.
do $$
begin
  if to_regclass('public.quiz_progress') is not null then
    execute 'truncate table public.quiz_progress';
  end if;
end $$;

-- 4) Progression des succès : supprimer uniquement la famille quizz.
--    Les compteurs/ensembles/achievements de lecture, vidéo, profil et
--    communauté restent intacts. `quizResetVersion` permet au client de
--    reconnaître ce reset même si une copie locale plus ancienne subsiste.
do $$
declare
  player record;
  cleaned jsonb;
  quiz_xp integer;
  remaining_xp integer;
  remaining_level integer;
  level_cost integer;
begin
  if to_regclass('public.player_progress') is null then
    raise notice 'Let''s Play : public.player_progress absente — étape 4 ignorée.';
    return;
  end if;

  for player in
    select user_id, coalesce(state, '{}'::jsonb) as state, coalesce(xp, 0)::integer as xp
      from public.player_progress
  loop
    -- Les succès liés aux quizz (catalogue JS : catalog.js, groupe quiz).
    cleaned := player.state
      #- '{unlocked,first-quiz}'
      #- '{unlocked,perfect-score}'
      #- '{unlocked,quiz-tour}'
      #- '{unlocked,quiz-week}'
      #- '{unlocked,first-challenge}'
      #- '{counters,quizzes_completed}'
      #- '{counters,challenges_sent}';

    -- Les clés d'ensembles restent présentes et vides : les anciennes
    -- versions du client les comprennent aussi.
    cleaned := jsonb_set(cleaned, '{sets}', coalesce(cleaned->'sets', '{}'::jsonb), true);
    cleaned := jsonb_set(cleaned, '{sets,quizzes_played}', '[]'::jsonb, true);
    cleaned := jsonb_set(cleaned, '{sets,perfect_quizzes}', '[]'::jsonb, true);
    cleaned := jsonb_set(cleaned, '{sets,quiz_days}', '[]'::jsonb, true);
    cleaned := jsonb_set(cleaned, '{quizPoints}', '{}'::jsonb, true);
    cleaned := jsonb_set(cleaned, '{quizResetVersion}', '1'::jsonb, true);

    -- `xp` stocke succès + points de quizz. Retirer les points et les cinq
    -- récompenses quizz garde l'XP gagnée dans les autres familles.
    quiz_xp := coalesce((
      select sum(greatest(0, value::integer))
        from jsonb_each_text(coalesce(player.state->'quizPoints', '{}'::jsonb))
    ), 0);
    quiz_xp := quiz_xp
      + case when player.state->'unlocked' ? 'first-quiz' then 30 else 0 end
      + case when player.state->'unlocked' ? 'perfect-score' then 70 else 0 end
      + case when player.state->'unlocked' ? 'quiz-tour' then 200 else 0 end
      + case when player.state->'unlocked' ? 'quiz-week' then 500 else 0 end
      + case when player.state->'unlocked' ? 'first-challenge' then 35 else 0 end;

    remaining_xp := greatest(0, player.xp - quiz_xp);
    remaining_level := 1;
    level_cost := 150; -- XP_PER_LEVEL_STEP du moteur des succès.
    while remaining_xp >= level_cost loop
      remaining_xp := remaining_xp - level_cost;
      remaining_level := remaining_level + 1;
      level_cost := 150 * remaining_level;
    end loop;

    update public.player_progress
       set state = cleaned,
           xp = greatest(0, player.xp - quiz_xp),
           level = remaining_level,
           updated_at = now()
     where user_id = player.user_id;
  end loop;
end $$;

-- 4b) Ancien repli utilisé par les déploiements sans `player_progress` :
-- retirer uniquement la clé d'achievements des métadonnées Auth. Les autres
-- métadonnées de compte restent intactes.
do $$
declare
  cleared integer;
begin
  update auth.users
     set raw_user_meta_data = raw_user_meta_data - 'achievements'
   where raw_user_meta_data ? 'achievements';
  get diagnostics cleared = row_count;
  raise notice 'Let''s Play : % copie(s) legacy achievements supprimée(s).', cleared;
exception
  when undefined_table then
    raise notice 'Let''s Play : métadonnées Auth absentes — repli legacy ignoré.';
end $$;

commit;

-- 5) Contrôles APRÈS : tout le monde est déclassé et les trois sources de
--    progression quizz sont vides.
select count(*) as tentatives_restantes
  from public.quiz_attempts;

do $$
begin
  if to_regclass('public.quiz_progress') is not null then
    raise notice 'Let''s Play : niveaux_restants = %',
      (select count(*) from public.quiz_progress);
  end if;
end $$;

select public.get_quiz_global_rank(null)                 as rang_global;
select public.get_quiz_leaderboard('rpg-legends', 10)     as classement_slug_nu;
select public.get_quiz_leaderboard('rpg-legends:hard', 10) as classement_run_v2;

do $$
begin
  if to_regclass('public.player_progress') is not null then
    raise notice 'Let''s Play : profils_avec_etat_quizz_non_vide = %', (
      select count(*)
        from public.player_progress
       where coalesce(jsonb_object_length(coalesce(state->'quizPoints', '{}'::jsonb)), 0) > 0
          or coalesce(jsonb_array_length(coalesce(state->'sets'->'quizzes_played', '[]'::jsonb)), 0) > 0
          or coalesce(jsonb_array_length(coalesce(state->'sets'->'perfect_quizzes', '[]'::jsonb)), 0) > 0
          or coalesce(jsonb_array_length(coalesce(state->'sets'->'quiz_days', '[]'::jsonb)), 0) > 0
          or coalesce((state->'counters'->>'quizzes_completed')::integer, 0) > 0
          or coalesce((state->'counters'->>'challenges_sent')::integer, 0) > 0
    );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Variante : sortir un seul joueur du classement (demande de suppression).
-- Ne l'exécute pas en plus du reset global sauf si c'est intentionnel.
-- delete from public.quiz_attempts where user_id = '00000000-0000-0000-0000-000000000000';
-- delete from public.quiz_progress where user_id = '00000000-0000-0000-0000-000000000000';
-- ----------------------------------------------------------------------------
