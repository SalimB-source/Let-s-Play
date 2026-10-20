# Banc d’essai : mana sans cartes Terrain

**Statut : prototype isolé, pas une migration des règles du Sablier.** Sur l’écran **Jouer**, le bloc « Et si le mana remplaçait les terrains ? » propose trois decks de démonstration : mono-Sable, Sable/Braise et Sable/Braise/Eau. Chaque deck a exactement **30 cartes non-terrain**. Le duel adverse utilise un autre des trois decks et joue les mêmes règles.

## Déroulement

1. Chaque camp pioche **trois cartes** et peut faire **un mulligan** de son choix. Le premier joueur ne pioche pas de carte supplémentaire au tour 1. À la fin de son tour, un camp qui a **plus de cinq cartes en main doit défausser** jusqu'à redescendre à cinq : le joueur choisit ses défausses, le sorcier défausse les siennes d'office.
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

- **Cinq créatures au maximum sur la table**, dessinées en cinq emplacements par camp. Pour poser une sixième créature, une fenêtre demande d'abord « Sacrifier » ou « Annuler » ; si le sacrifice est confirmé, le joueur désigne la victime sur la table : sa carte se déchire, elle rejoint le cimetière, et la nouvelle créature prend sa place, au même emplacement (le bandeau de désignation propose aussi « Renoncer », et Échap annule). Le sorcier adverse choisit seul sa victime — sa créature la plus frêle — et le journal du duel raconte chaque sacrifice.
- **Des emplacements resserrés.** Les cinq colonnes ont la largeur d'une carte posée (`--essai-colonne`, partagée par la rangée et par les cases dessinées dessous) et se groupent au centre de la table avec une gouttière étroite, au lieu de s'étirer sur toute sa largeur.
- **Chaque créature garde sa case.** Une créature posée reçoit la première case libre (`entite.emplacement`, 0 à 4 — la case de la victime pour un sacrifice) et la garde tant qu'elle reste en jeu. Quand une créature meurt ou quitte le champ, sa case reste vide au milieu de la rangée : les autres ne glissent pas pour prendre sa place, et la prochaine créature posée comble ce trou. `rpgEmplacementsChamp(camp)` donne les cinq cases (une partie sauvegardée sans cases se range dans l'ordre de la rangée) ; l'interface place chaque carte dans la colonne de sa case (`--case-essai`).
- **Les cinq cases sont les seules places du champ**, y compris pour les créatures qui n'ont pas été jouées depuis la main : les jetons d'arrivée ne sont créés que dans les cases libres, la Réanimation laisse sa créature au cimetière si le champ est plein, et le retour programmé d'Anqa attend une place pour revenir. La carte jouée, elle, atterrit dans la case libre qui l'attend : sa case et la grille des cartes partagent les mêmes colonnes, à toutes les tailles d'écran.
- **Aucun empilement d'homonymes.** Les créatures d'un même nom ne se superposent plus en une pile dépliable, ni dans la main ni sur le champ : chaque carte garde sa place, ses blessures et ses armes proprement à elle. Le format classique, lui, continue de montrer les piles du doigt.
- **Les icônes d'effets des cartes** se rangent en colonne verticale à droite dans tous les modes de duel : sur la table à la place du coût — qui ne s'imprime plus sur aucune carte posée (il reste dans le libellé accessible et sur la main, les aperçus et le catalogue) —, et dans la main juste sous le disque de coût, sur le même axe. La colonne affiche les mots-clés imprimés (Envol, Honneur…) et, sur la table, les états vivants (bouclier, esquive, protection…), l'icône seule, sans chiffre derrière (la valeur, comme celle d'Honneur, reste dans l'aperçu au survol). Quatre badges tiennent au-dessus des statistiques sur la table (trois sous le coût dans la main) — l'aperçu au survol garde la liste complète ; si le coin est pris sur la table (losanges de compteurs d'une hybride, bouton de capacité activée), la colonne descend dessous.
- **Le bandeau « essai · 30 cartes » a disparu** de la barre du duel : le mode se reconnaît à sa jauge de mana et à ses listes de decks, sans texte en trop.
- **Au doigt (mobile et tactile)**, enfin, la table d'essai se range comme suit :
  - la barre de navigation du duel tient dans un bouton hamburger (☰) — Menu, Deck, Catalogue, son, 3D et plein écran se déplient sous la barre ;
  - le sorcier adverse a sa plaque de nom et de vie **à gauche**, dans la même forme que celle du joueur, sous le flux de mana adverse ;
  - la plaque du joueur se pose **juste sous la ligne de séparation du plateau**, au milieu de l'écran (colonne de gauche), et sa jauge de mana suit **juste en dessous, alignée à gauche et de la même largeur** que la plaque, avec la pastille du compteur (« 1/1 ») sous la jauge (hauteur de plaque mesurée : `--rpg-plaque-joueur-h`) ;
  - le sorcier adverse est disposé **en miroir** : sa plaque juste au-dessus de la ligne, sa jauge (même largeur, même épaisseur) juste au-dessus, et sa pastille (« 0/0 ») au-dessus de la jauge (`--rpg-plaque-ennemi-h`) ;
  - dans chaque plaque, les **points de vie** sont **tout à droite, centrés verticalement**, inscrits dans un **rond rouge sang en volume** (reflet, ombre interne, halo ; un éventuel bouclier en petite capsule sous le rond) ; avatar à gauche, centré en hauteur, et au milieu le **nom centré dans les deux sens** avec la ligne des zones (Main · Paquet · Cimetière) juste dessous, centrée elle aussi ;
  - les cartes de la main sont teintées **à la couleur de leur coût** : la braise, l'eau, le sable ou la neige de leurs pastilles, et le dégradé du mana hybride quand le coût mêle deux couleurs.

## Vérifier

```bash
npm run check:rpg-mana-essai  # moteur + parcours interface et stockage (jsdom)
npm run check:rpg             # régressions des règles classiques + nouvel essai
npm run check:rpg-ui          # fumigènes de l'interface (mulligan, mana, navigation, piles)
npm run build
```

### Mobile : la colonne de gauche, comme sur PC

Sur la table d'essai tactile, chaque sorcier a sa **colonne** dans la rangée de
son camp, contre le bord gauche de la table (le sorcier adverse en haut, le
joueur en bas), et la composition reprend celle du PC :

- la **plaque** est une pastille horizontale : avatar à gauche, **nom** au
  milieu (sur deux lignes si la colonne est étroite — « LE » / « SORCIER »),
  **goutte de vie** à droite (élargie si la réserve s'affiche), et la ligne des
  **zones** (Main · Paquet · Cimetière) sous l'avatar et le nom, qui passe à la
  ligne entre deux compteurs plutôt que d'être tronquée ;
- la **jauge de mana** se range dans la même cellule de grille, derrière la
  plaque, à sa hauteur mesurée (`--rpg-plaque-*-h`) et dans la place qui reste
  (`--rpg-jauge-*-h`) : deux rangées de cinq losanges qui se resserrent si la
  plaque grandit ;
- la **capsule du compteur** (1/1, 0/0) ouvre la jauge, du côté de la plaque ;
- les **cinq cases** de chaque camp gardent la largeur d'une carte posée et
  s'alignent au bas de la rangée : une carte jouée tombe dans sa case.

La **colonne de droite** garde le tour : l'indicateur et les phases en haut,
puis **« Attaquer avec tous » et « Fin du tour » empilés sur toute la largeur
du rail** (44 px chacun), et les **commandes de combat** sous eux, dans la
barre qui ferme la colonne au-dessus de la main. La hauteur de cette barre est
publiée (`--rpg-controles-h`) et le rail s'ancre dessus ; la réponse au
sorcier (« Laisser passer », « Passer ») est une barre posée au-dessus de la
main, du bord droit de la plaque au bord de l'écran.

La **main du sorcier** se montre **face cachée**, en éventail compact centré
au-dessus de son champ (sept dos au plus, comme sur PC ; le nombre exact reste
sur sa plaque).
