# Salons Mirage Rush

## Installation

Exécuter `supabase/mirage-rooms.sql` dans le SQL Editor du projet Supabase déjà configuré pour le site, après `schema.sql` (table `profiles`). Aucun secret supplémentaire ni publication Realtime nécessaire : synchronisation par RPC toutes les 200 ms pendant la course, 900 ms dans le salon. Redéployer le frontend avec les variables Supabase habituelles.

Cette migration n'a pas été exécutée par l'agent. Ne pas considérer le mode disponible en production avant installation et tests ci-dessous.

## Vérification à plusieurs comptes (nécessaire avant production)

1. A crée un salon : un joueur, lancement désactivé. B rejoint avec le code, même carte et même seed.
2. B tente directement le RPC `start` : refus. A lance avec B : départ serveur dans 5 secondes.
3. Recommencer avec A/B/C/D : quatre apparences différentes (bleu, rouge, vert, violet). E tente de rejoindre : refus. Tester aussi deux arrivées simultanées pour la dernière place.
4. Chaque joueur voit les autres avancer, sauter et ralentir après collision. Course de 600 m, cristaux individuels, pas de PNJ. Vérifier clavier et tactile, notamment impossibilité de changer de voie en sautant.
5. Vérifier les arrivées, perte/reprise réseau, fermeture du salon par l'hôte et départ d'un invité ; aucune position étrangère ne peut être écrite (auth.uid côté serveur).
6. Vérifier qu'anonyme/démo ne peut pas appeler le RPC et que les tables refusent les écritures directes.

## Limites explicites

Course amicale : simulation locale et positions déclarées par le client, pas de serveur anti-triche. Les arrivées sont ordonnées selon leur réception serveur, donc influencées par la latence. Pas de collision entre cavaliers ni de cristaux partagés en ligne. Un onglet ralenti peut prendre du retard. Une course ne redémarre pas : quitter puis créer un nouveau salon.

Quitter la page sans le bouton ne libère pas automatiquement la place. Rejoindre le même code permet de retrouver sa place ; recharger en course ne restaure pas la simulation. Un hôte absent ne peut pas être remplacé. Les salons expirent au bout de deux heures ; prévoir une purge périodique des lignes anciennes pour un usage durable. Les erreurs réseau sont affichées et les tentatives reprennent automatiquement.
