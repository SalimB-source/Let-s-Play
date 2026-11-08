# Projectiles de combat

Les capacités de Braise qui infligent des dégâts à la créature combattue avant
les blessures normales lancent une petite flammèche orange depuis leur source.
Cela couvre l’attaque bloquée, le blocage et les déclenchements d’armes de feu.
L’Attaque ciblée réussie utilise un trait bleu-blanc orienté vers sa cible.
Les coups ratés ou annulés ne montrent pas un projectile qui touche.

Le moteur publie un signal `projectile-combat` dans `combatAnimations` avec
source, cible et variante. Ce signal ne modifie ni les dégâts, ni les chances,
ni l’ordre de résolution. Il est sérialisable pour le PvP. La simulation
prévisionnelle ne duplique pas les signaux de la résolution réelle.

La page lit les événements nouveaux lors de `animerModificationsChamp` et
fige leur géométrie à partir des positions **avant** l’action : une cible
mortellement touchée reste joignable. La couche décorative est sur la table,
pas dans les cartes ; elle ne prend aucun clic et est masquée aux lecteurs
d’écran. Durée du trajet : 550 ms à vitesse normale ; retrait de sécurité à
650 ms. La vitesse configurée s’applique aux deux. Aucun tir n’est créé en
mode d’animations réduites ; le réglage système est aussi couvert en CSS.

Tests ciblés :

```sh
node --test tests/rpg-projectiles-combat.test.js tests/rpg-attaque-rapide-liberation.test.js tests/rpg-vampire-braise-brulot.test.js
```
