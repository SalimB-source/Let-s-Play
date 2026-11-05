# Verrouillage du mode en ligne

Par défaut, `VITE_ONLINE_MODE_ENABLED` et `ONLINE_MODE_ENABLED` sont absents ou `false`. Régler les deux séparément dans Vercel pour Production et Preview, puis redéployer (le premier est incorporé au build). Le second protège uniquement `/api/sablier-duel`.

**Important : le verrouillage client n'est pas une protection contre un client modifié.** Mirage utilise directement la fonction RPC Supabase `mirage_room_action`, indépendamment de Vercel. Pour bloquer réellement les salons, exécuter la transaction `supabase/mirage-online-lock.sql` sur chaque projet Supabase concerné, après vérification et sauvegarde des privilèges. Ce script recherche toutes les signatures installées ; s'il ne trouve aucune fonction, vérifier le projet sélectionné et les autres points d'accès. Conserver les droits existants avant la révocation pour la réactivation. Cette action n'est pas déployée automatiquement. La messagerie générale et les sauvegardes solo ne sont pas désactivées.

Vérifier également dans le projet Supabase déployé qu'aucune ancienne Edge Function `sablier-duel` ou autre API multijoueur ne reste accessible : le client n'utilise plus ce chemin, mais ce dépôt ne permet pas de garantir sa configuration distante. Faire un test direct des endpoints/RPC avant le lancement. Les services sociaux et les sauvegardes solo peuvent toujours produire des requêtes réseau.

## Réactivation progressive
1. Tester d'abord sur un projet Preview isolé, avec surveillance des quotas, sécurité et tests de charge.
2. Pour Mirage, rétablir les droits sauvegardés pour chaque signature de fonction, après audit ; pour Sablier, vérifier que toutes les autres portes d'entrée sont fermées.
3. Définir `ONLINE_MODE_ENABLED=true` côté serveur puis `VITE_ONLINE_MODE_ENABLED=true` au build, redéployer et tester à deux joueurs, les liens directs et les erreurs réseau.
4. Observer la charge avant toute activation en production ; en cas de problème, repasser les drapeaux à `false`, redéployer et révoquer les droits RPC Mirage.

## Sauvegardes solo

Les actions en jeu conservent immédiatement leur copie locale. Pour chaque compte, les écritures distantes de Mirage et les écritures Sablier en arrière-plan sont sérialisées : pendant une requête en cours, seul l'instantané le plus récent attend. Les synchronisations initiales Sablier demeurent immédiates et attendues. Une fermeture de page ou une panne réseau peut interrompre une sauvegarde distante ; la copie locale reste disponible sur cet appareil. Tester les conflits et la reprise multi-appareils avant de considérer cette synchronisation comme une garantie transactionnelle.

Les contrôles UI automatisés utilisent jsdom : ils vérifient les routes et l'absence de `fetch` dans les composants montés, mais ne remplacent pas une inspection réseau et responsive dans un navigateur réel, avec Supabase configuré.
