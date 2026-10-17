# Banc d’essai : mana sans cartes Terrain

**Statut : prototype isolé, pas une migration des règles du Sablier.** Sur l’écran **Jouer**, le bloc « Et si le mana remplaçait les terrains ? » propose trois decks de démonstration : mono-Sable, Sable/Braise et Sable/Braise/Eau. Chaque deck a exactement **30 cartes non-terrain**. Le duel adverse utilise un autre des trois decks et joue les mêmes règles.

## Déroulement

1. Chaque camp pioche **cinq cartes** et peut faire **un mulligan** de son choix. Le premier joueur ne pioche pas une sixième carte au tour 1.
2. Le **premier mana** arrive une fois le mulligan terminé. Puis, au début de chaque tour de son propriétaire, il gagne **un nouveau mana coloré permanent**, jusqu’à **dix** sources. Le mono-couleur est automatique ; en bi-/tricolore, le joueur choisit **seulement la couleur du nouveau mana**. Les choix s’affichent comme des boutons ronds compacts à fond noir translucide, avec des emblèmes et contours assortis à leur élément (Sable, Braise, Eau ou Neige), sans grand panneau autour ; un voile noir transparent assombrit le plateau pendant le choix. Le titre « Choisis ton mana » apparaît au-dessus des boutons, dont chacun ne montre que l’emblème centré (la couleur reste annoncée aux lecteurs d’écran). À la souris, le rond survolé pivote de 30° vers la droite puis revient en place ; le mouvement est désactivé si l’utilisateur préfère des animations réduites. L’IA choisit aussi la couleur du sien suivant les coûts en main.
3. Les sources acquises restent de leur couleur ; la réserve **se recharge au début de chaque tour personnel** à hauteur de la capacité acquise. Elle peut servir à répondre pendant le tour adverse. Le surplus de réserve non dépensé et le mana produit temporairement **ne se reportent pas** au prochain tour personnel. La jauge compacte à fond noir, placée sous la plaque de chaque camp, montre **dix emplacements** : losanges discrets avant acquisition, puis un emblème SVG de sablier (Sable), de cristal (Neige), de goutte (Eau) ou de flamme (Braise) dans l'ordre des choix. L'icône dépensée s'assombrit sans changer de couleur et se rallume à la recharge.
4. Le paiement utilise d’abord les **pips colorés obligatoires**, puis essaie de payer le **coût générique avec une autre couleur** : une carte Braise à 2 manas prend un Braise et un Sable disponible plutôt que deux Braise. Sans autre couleur, le deuxième Braise reste utilisable. Les cartes à 8 manas restent accessibles si le duel dure assez longtemps et si la couleur requise a été choisie.
5. Si le paquet est vide au moment de la **pioche obligatoire de début de tour**, la fatigue retire 1 PV, puis 2, puis 3, etc., à chaque nouveau tour vide. Les tentatives de pioche par effet ne multiplient pas cette fatigue.

La Boussole du Hoggar et le Djinn du souk, qui dépendent directement des terrains, sont exclus de ces decks. Les décors du plateau ne sont pas des cartes Terrain et restent inchangés.

## Frontière de l’essai

Le mode est actif uniquement si le duel est créé avec `modeMana: 'essai'` (`src/games/rpgDuel.js`). Il n’émet **aucun événement de quête/Souk** et ne crédite aucune victoire, ne débloque ni carte ni étage. « Rejouer l’essai » conserve le même deck ; revenir au menu permet d’en choisir un autre. Les decks historiques de **40 cartes**, l’atelier, la collection, les boosters, le Souk et la campagne continuent de fonctionner à l’identique.

Les trois decks et leur validateur propre à 30 cartes sont dans `src/games/rpgManaEssai.js`. Aucune validation de deck existant n’a été remplacée. Il s’agit pour l’instant d’une **expérience de duel prédéfinie**, pas d’un nouvel atelier où composer/importer des decks personnels.

## Vérifier

```bash
npm run check:rpg-mana-essai  # moteur + parcours interface et stockage (jsdom)
npm run check:rpg             # régressions des règles classiques + nouvel essai
npm run build
```
