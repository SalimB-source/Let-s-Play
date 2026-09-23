-- ----------------------------------------------------------------------------
-- Remise à zéro des quizz — classement global (étape 2) et, en option,
-- tous les compteurs/points joueurs (étape 4)
-- ----------------------------------------------------------------------------
-- Où : Supabase → SQL Editor → New query → coller → Run.
--
-- Ce script remplace le bloc « 8b » qui vivait dans `supabase/schema.sql` :
-- une remise à zéro ponctuelle n'a rien à faire dans le fichier d'installation
-- — recoller le schéma (ce que le README demande à chaque évolution) ne doit
-- jamais effacer les données des joueurs. L'opération se déclenche donc ici,
-- explicitement.
--
-- DEUX NIVEAUX, à choisir :
--
--   1. ÉTAPES 1 → 3 (par défaut, non destructif pour les joueurs) : le
--      CLASSEMENT partagé revient à zéro. On vide `public.quiz_attempts`,
--      l'unique source de `get_quiz_leaderboard` (top 10 d'un run) et de
--      `get_quiz_global_rank` (position globale : somme des points de toutes
--      les tentatives). Chaque joueur redevient « pas encore classé » (rang
--      null, 0 point, 0 quizz), chaque quizz n'a plus aucun score. Les comptes,
--      les profils, l'XP et les succès ne bougent pas.
--
--   2. ÉTAPES 1 → 4 : TOUT à zéro, y compris les points joueurs. L'étape 4 est
--      commentée (à décommenter volontairement) car elle touche à l'XP : elle
--      nettoie le `state` de `public.player_progress` — points de quizz
--      (`quizPoints`), succès du groupe « quiz », compteurs et ensembles
--      associés — puis force `xp`/`level` à 0/1. `xp` et `level` étant
--      recalculés par le client à partir de l'état (`saveAccountState`), le
--      nettoyage de `quizPoints` fait de toute façon retomber le total au
--      prochain passage ; le forçage sert surtout aux profils jamais rouverts.
--      Les succès des autres groupes (lecture, vidéo, communauté…) et leur XP
--      sont conservés.
--
-- Rappels utiles :
--   * le MEILLEUR SCORE de l'appareil (navigateur du joueur, `localStorage`,
--     clé `letsplay_quiz_best_v1`) et l'état local des succès ne dépendent pas
--     du serveur : ils peuvent continuer d'afficher un record local. C'est
--     voulu — serveur et appareil sont deux choses distinctes.
--   * les points servent aussi d'XP joueur depuis l'état `quizPoints` : vider
--     le classement seul (étape 2) laisse donc l'XP acquis, c'est l'étape 4 qui
--     la remet à zéro.
--   * irréversible : impossible de récupérer les tentatives supprimées. En cas
--     de doute, exporte la table avant (Dashboard → Table Editor →
--     quiz_attempts → Export CSV) ou note les nombres de l'étape 1.
--
-- ----------------------------------------------------------------------------

-- 1) État AVANT (note les trois nombres : ils servent de référence).
select count(*)                    as tentatives,
       count(distinct user_id)     as joueurs_classes,
       coalesce(sum(points), 0)    as points_cumules
  from public.quiz_attempts;

-- 2) Le CLASSEMENT à zéro.
--    `truncate` plutôt que `delete` : la table est vidée d'un coup, sans
--    balayage ligne à ligne, et l'espace disque est rendu immédiatement.
--    Rien ne référence `quiz_attempts` par clé étrangère, et RLS ne s'applique
--    pas à TRUNCATE (le SQL Editor se connecte en `postgres`, propriétaire).
--    Si ton rôle n'est pas propriétaire de la table (erreur 42501), remplace
--    la ligne par :  delete from public.quiz_attempts;
truncate table public.quiz_attempts;

-- 3) Contrôle APRÈS : 0 ligne, le rang global d'un joueur sans partie répond
--    « pas encore classé » (rank null, 0 point, 0 quizz, 0 joueur classé) et le
--    top 10 d'un quizz revient vide (`[]`). `get_quiz_leaderboard` attend un
--    run `slug:difficulté` (v2) mais accepte aussi un slug nu.
select count(*) as lignes_restantes from public.quiz_attempts;
select public.get_quiz_global_rank(null)                as rang_global;
select public.get_quiz_leaderboard('rpg-legends', 10)    as classement_slug_nu;
select public.get_quiz_leaderboard('rpg-legends:hard', 10) as classement_run_v2;

-- 4) OPTIONNEL — TOUT à zéro côté joueurs (points de quizz, succès quizz,
--    XP). Décommente ce bloc, relis-le, puis exécute-le en connaissance de
--    cause : les succès et l'XP des autres groupes restent, le reste part.
--
--    La liste des succès ci-dessous est le groupe « quiz » du catalogue
--    (`src/achievements/catalog.js`) : si un succès quizz y est ajouté, ajoute
--    son id ici (une ligne `#- '{unlocked,<id>}'`).
--
-- do $$
-- begin
--   if to_regclass('public.player_progress') is not null then
--     update public.player_progress
--        set state = jsonb_set(
--              jsonb_set(
--                jsonb_set(
--                  jsonb_set(
--                    jsonb_set(
--                      jsonb_set(
--                        state
--                        #- '{unlocked,first-quiz}'
--                        #- '{unlocked,perfect-score}'
--                        #- '{unlocked,quiz-tour}'
--                        #- '{unlocked,quiz-week}'
--                        #- '{unlocked,first-challenge}',
--                        '{counters,quizzes_completed}', '0'::jsonb, true
--                      ),
--                      '{counters,challenges_sent}', '0'::jsonb, true
--                    ),
--                    '{sets,quizzes_played}', '[]'::jsonb, true
--                  ),
--                  '{sets,perfect_quizzes}', '[]'::jsonb, true
--                ),
--                '{sets,quiz_days}', '[]'::jsonb, true
--              ),
--              '{quizPoints}', '{}'::jsonb, true
--            ),
--            xp = 0,
--            level = 1,
--            updated_at = now();
--     raise notice 'Let''s Play : compteurs quizz remis à zéro sur % profil(s),',
--                  (select count(*) from public.player_progress);
--   else
--     raise notice 'Let''s Play : public.player_progress absente — étape 4 ignorée.';
--   end if;
-- end $$;
--
-- Vérification de l'étape 4 (à lancer après l'avoir décommentée) : plus aucun
-- point de quizz, plus de succès quizz, xp à 0.
-- select user_id,
--        jsonb_object_length(coalesce(state->'quizPoints', '{}'::jsonb)) as runs_notes,
--        (select count(*) from jsonb_object_keys(coalesce(state->'unlocked', '{}'::jsonb)) as k(id)
--          where k.id in ('first-quiz','perfect-score','quiz-tour','quiz-week','first-challenge')) as succes_quizz,
--        xp, level
--   from public.player_progress
--  order by xp desc;

-- ----------------------------------------------------------------------------
-- Variantes (facultatives) — n'exécute que ce dont tu as besoin.
-- ----------------------------------------------------------------------------

-- a) Vider le classement d'UN SEUL run (slugs : culture-gaming,
--    consoles-retro, souls-fromsoftware, rpg-legends, esport-competition,
--    studios-legends, tech-hardware, cinema-pop-culture — suffixés par la
--    difficulté depuis la v2 : `rpg-legends:medium`, `rpg-legends:hard`) :
-- delete from public.quiz_attempts where quiz_id = 'souls-fromsoftware';
-- delete from public.quiz_attempts where quiz_id like 'souls-fromsoftware:%';

-- b) Sortir UN joueur du classement (départ du site, demande de
--    suppression) — l'uuid se lit dans Dashboard → Authentication → Users :
-- delete from public.quiz_attempts where user_id = '00000000-0000-0000-0000-000000000000';
