-- ----------------------------------------------------------------------------
-- Remise à zéro du classement GLOBAL des quizz
-- ----------------------------------------------------------------------------
-- Où : Supabase → SQL Editor → New query → coller → Run.
--
-- Ce que fait ce script : il vide `public.quiz_attempts`, l'unique source des
-- classements des quizz — `get_quiz_leaderboard` (top 10 d'un quizz) et
-- `get_quiz_global_rank` (position globale : somme des points des meilleures
-- parties, tous quizz confondus) lisent cette table et rien d'autre.
-- Après exécution : tout le monde repart de zéro, chaque joueur est
-- « pas encore classé » (rang null, 0 point, 0 quizz) et chaque quizz n'a plus
-- aucun score. Le site n'affiche donc plus que l'état vide prévu pour ça
-- (« Pas encore classé — joue un quizz pour entrer au classement »), sans
-- aucune modification de code à déployer.
--
-- Ce qui n'est PAS touché :
--   * les comptes (`auth.users`) et les profils publics (`public.profiles`) :
--     pseudos, avatars, niveaux affichés restent en place ;
--   * la progression des succès et l'XP (`public.player_progress`) — les
--     succès quizz déjà débloqués restent acquis ;
--   * le meilleur score gardé sur chaque appareil (navigateur du joueur,
--     `localStorage`, clé `letsplay_quiz_best_v1`) : le record local peut donc
--     continuer d'afficher « 8/8 · 1200 PTS » alors que le classement partagé
--     est vide. C'est voulu — serveur et appareil sont deux choses distinctes.
--
-- Irréversible : impossible de récupérer les parties supprimées. En cas de
-- doute, exporte la table avant (Dashboard → Table Editor → quiz_attempts →
-- Export CSV) ou copie les nombres de l'étape 1.
--
-- ----------------------------------------------------------------------------

-- 1) État AVANT (note les trois nombres : ils servent de référence).
select count(*)                    as tentatives,
       count(distinct user_id)     as joueurs_classes,
       coalesce(sum(points), 0)    as points_cumules
  from public.quiz_attempts;

-- 2) La remise à zéro.
--    `truncate` plutôt que `delete` : la table est vidée d'un coup, sans
--    balayage ligne à ligne, et l'espace disque est rendu immédiatement.
--    Rien ne référence `quiz_attempts` par clé étrangère, et RLS ne s'applique
--    pas à TRUNCATE (le SQL Editor se connecte en `postgres`, propriétaire).
--    Si ton rôle n'est pas propriétaire de la table (erreur 42501), remplace
--    la ligne par :  delete from public.quiz_attempts;
truncate table public.quiz_attempts;

-- 3) Contrôle APRÈS : 0 ligne, et le rang global d'un joueur sans partie
--    répond bien « pas encore classé » (rank null, 0 point, 0 quizz,
--    0 joueur classé). Le top 10 d'un quizz, lui, revient vide (`[]`).
select count(*) as lignes_restantes from public.quiz_attempts;
select public.get_quiz_global_rank(null)      as rang_global;
select public.get_quiz_leaderboard('rpg-legends', 10) as classement_du_quizz;

-- ----------------------------------------------------------------------------
-- Variantes (facultatives) — n'exécute que ce dont tu as besoin.
-- ----------------------------------------------------------------------------

-- a) Vider le classement d'UN SEUL quizz (slugs : culture-gaming,
--    consoles-retro, souls-fromsoftware, rpg-legends, esport-competition,
--    studios-legends, tech-hardware, cinema-pop-culture) :
-- delete from public.quiz_attempts where quiz_id = 'souls-fromsoftware';

-- b) Sortir UN joueur du classement (départ du site, demande de
--    suppression) — l'uuid se lit dans Dashboard → Authentication → Users :
-- delete from public.quiz_attempts where user_id = '00000000-0000-0000-0000-000000000000';
