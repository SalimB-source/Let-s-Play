# Salons Mirage Rush

## Installation

Exécuter `supabase/mirage-rooms.sql` dans le SQL Editor du projet Supabase déjà configuré pour le site, après `schema.sql` (table `profiles`). Aucun secret supplémentaire ni publication Realtime obligatoire : synchronisation par RPC (`mirage_room_action`) toutes les 200 ms pendant la course, 900 ms dans le salon, et liste des salons ouverts via l'action `list`. En l'absence de la migration SQL ou hors connexion Supabase, le client bascule automatiquement sur le moteur de salons local/multi-onglets.

## Mise à jour vers quatre voies

Réexécuter `supabase/mirage-rooms.sql` sur les installations existantes, avant de déployer le client à quatre voies. Le script remplace la contrainte de position et met à jour la validation RPC pour accepter les voies `0` à `3`, sans supprimer les salons ni les joueurs. Les clients d'une même course doivent utiliser la même version du jeu (le parcours généré a changé).

## Fonctionnalités des rooms

1. **Liste des rooms disponibles (`list`)** : affiche les rooms en statut `lobby` (nom de la room, terrain, hôte, nombre de joueurs, nombre de joueurs prêts, indicateur de mot de passe).
2. **Création de room (`create`)** : permet de donner un **nom** à la room, un **mot de passe optionnel** (peut rester vide pour une room ouverte) et de choisir le terrain (`desert`, `western`, `prairie`, `sardinia`, `alger`, `japan`, `dust2`). Après l’ajout d’une map, rejouez `mirage-rooms.sql` dans l’éditeur SQL de Supabase : le script recrée la contrainte `mirage_rooms_stage_check` et remplace la fonction RPC.
3. **Statut prêt (`ready`)** : chaque joueur apparaît comme « Joueur pas encore prêt » tant qu'il n'a pas activé son statut « Prêt ».
4. **Chat de coordination (`chat`)** : messagerie intégrée au salon pour communiquer et se coordonner avant de lancer la partie.
5. **Lancement (`start`)** : disponible lorsque les joueurs du salon sont prêts, déclenchant un compte à rebours synchronisé de 5 secondes avant le départ de la course de 600 m.
