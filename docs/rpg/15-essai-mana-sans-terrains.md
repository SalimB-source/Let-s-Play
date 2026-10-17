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

## Ce que la table d'essai fait de particulier

Ces règles ne valent que pour le mode sans terrains — les formats classiques (quarante cartes, quatre terrains), l'histoire et le reste du jeu ne changent pas :

- **Cinq créatures au maximum sur la table.** Pour poser une sixième créature, le joueur choisit d'abord laquelle de ses créatures sacrifier : elle rejoint le cimetière, la carte se pose dans la place libérée (« Renoncer » ou Échap annule la pose). Le sorcier adverse choisit seul sa victime — sa créature la plus frêle — et le journal du duel raconte chaque sacrifice.
- **Aucun empilement d'homonymes.** Les créatures d'un même nom ne se superposent plus en une pile dépliable, ni dans la main ni sur le champ : chaque carte garde sa place, ses blessures et ses armes proprement à elle. Le format classique, lui, continue de montrer les piles du doigt.
- **Le bandeau « essai · 30 cartes » a disparu** de la barre du duel : le mode se reconnaît à sa jauge de mana et à ses listes de decks, sans texte en trop.
- **Au doigt (mobile et tactile)**, enfin, la table d'essai se range comme suit :
  - la barre de navigation du duel tient dans un bouton hamburger (☰) — Menu, Deck, Catalogue, son, 3D et plein écran se déplient sous la barre ;
  - le sorcier adverse a sa plaque de nom et de vie **à gauche**, dans la même forme que celle du joueur, sous le flux de mana adverse ;
  - les jauges de mana passent **au-dessus des noms des sorciers** (une par camp, chacune au-dessus de sa plaque) ;
  - les cartes de la main sont teintées **à la couleur de leur coût** : la braise, l'eau, le sable ou la neige de leurs pastilles, et le dégradé du mana hybride quand le coût mêle deux couleurs.

## Vérifier

```bash
npm run check:rpg-mana-essai  # moteur + parcours interface et stockage (jsdom)
npm run check:rpg             # régressions des règles classiques + nouvel essai
npm run check:rpg-ui          # fumigènes de l'interface (mulligan, mana, navigation, piles)
npm run build
```
