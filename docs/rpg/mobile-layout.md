# Duel mobile : paysage et actions directes

## Présentation

`src/games/rpg-mobile.css` contient la présentation tactile, activée par `.rpg-battle--touch` (application Android, pointeur tactile ou fenêtre ≤ 1 100 px).

Le plateau conserve les illustrations originales de Bab El, avec une organisation inspirée des jeux de cartes numériques en paysage :

- deux champs au centre, sans panneaux opaques ;
- terrains identiques regroupés par type dans chaque camp, avec uniquement le compteur total sur la carte (disponibilités dans le libellé accessible) ;
- cartes homonymes regroupées elles aussi — main et deux champs de bataille — avec un compteur ×N flottant sur le coin de la pile ;
- identités et compteurs flottants ;
- main en bas : **une carte = une cible**, jamais deux cartes sous le même doigt — la rangée partage sa largeur entre ses emplacements (jusqu’au plancher tactile de 34 px) et ne défile horizontalement qu’au-delà, un cran par carte. À la souris, la même rangée s’ouvre en **éventail** (angle, écart et descente en arc portés par `--hand-fan`, voir le `README.md`) ; au doigt, les repères de l’éventail sont remis à zéro — la règle « une carte = une cible » interdit tout recouvrement ;
- commandes « Attaquer avec tous », confirmation/annulation de l’attaque, annulation de la dernière action et fin du tour regroupées côte à côte sur le plateau, selon la phase ; **« Confirmer l’attaque » et « Résoudre le combat » portent leur propre aplat clair** (bleu glacé, or) et leur halo, au doigt comme à la souris : ce sont les commandes principales, elles ne prennent plus le fond sombre des commandes en retrait (`rpg-mobile.css`, voir « Le Sablier : la main en éventail… » dans le `README.md`) ;
- progression des phases immédiatement au-dessus des commandes, **comme sur PC** : une rangée de six icônes orange (début, principale, attaque, blocage, deuxième principale, fin) dans une capsule sombre translucide, la phase actuelle allumée, **l'attaque du tour marquée d'une coche une fois consommée** — une seule phase d'attaque par tour, voir « Le Sablier : le Coup rapide est un choix… » dans le `README.md` —, les noms gardés pour les lecteurs d'écran ;
- boutons de droite compacts (32 px de haut) dans une colonne resserrée (`--rpg-touch-controls: clamp(176px, 23vw, 280px)`) ;
- cartes posées sur la table un peu plus petites que celles de la main (`--rpg-field-card` = 85 % de `--duel-card`), **sans masque ni zone de défilement** autour d'elles : la largeur des cartes se partage entre les emplacements de la rangée (`--row-count`, compté en CSS par `:has(> :nth-child(N))`) jusqu'à un plancher de 40 px, puis elles se chevauchent plutôt que de déborder ;
- sur une **créature équipée**, ni le bonus ni le texte de l'arme ne sont imprimés sur la face. Les compteurs d'effet (Heures de la créature, sable de la Jitte équipée) se lisent en **petits losanges chiffrés sous la couleur sur une mono, sous le disque de coût sur une hybride**, même quand la carte se resserre ; ils ne recouvrent pas les statistiques ATQ/DEF. Les vignettes d'arme (`.rpg-card__weapons`) disparaissent au doigt : l'arme est déjà glissée sous la créature (`.rpg-card-stack--arme`) et sa petite carte illustrée apparaît dans l'aperçu ;
- **à chaque bascule de tour**, un bandeau nomme le camp qui prend la main, au centre de la table : « Votre tour » en or, « Tour de l'adversaire » en braise (les teintes de la pastille de tour), le temps d'un battement de 1,5 s (`RPG_ANNONCE_TOUR_DUREE`, composant `AnnonceTour` de `RpgDuelPage.jsx`). Il ne capte aucun geste — la main reste jouable dessous — et **passe sous ce qui prend la scène** : le voile de fin de duel, l'annonce de sort du sorcier et l'éclair d'impact. Il se tait pendant le mulligan, sur un duel terminé, et ne se rejoue pas quand on revient sur la table sans que le tour ait changé ; une partie neuve, elle, s'annonce toujours.

Le clic sur une carte en main la joue immédiatement, sur ordinateur comme sur mobile : la pose réutilise les validations et les animations du glisser-déposer, y compris le paiement automatique et le choix ultérieur d’une cible. Une carte refusée reste en main et le refus est expliqué (mana, limite de terrain, phase). **Les magies demandent une confirmation** avant le lancement ; Annuler laisse le sort en main. Les créatures et terrains déjà posés agissent aussi directement au clic : attaque ou retrait de la sélection, blocage, choix de cible ou production de mana selon l’état de la partie. La confirmation de l’attaque se fait uniquement sur le plateau, à côté de la fin du tour, où reste aussi l’annulation de la dernière action. Les statistiques d’une créature en jeu reflètent ses valeurs actuelles.

Au survol d’une carte (ordinateur), l’aperçu instantané permet de consulter les détails : effets, statistiques et compteurs de terrains. La créature équipée y montre une **petite carte par arme** avec son image, son nom et son effet ; les bonus directs ouvrent aussi le texte d'effet de la créature en bleu. Au doigt, le même contenu s'ouvre par appui long ou sur la fiche au clic droit.

## L’aperçu au doigt : appui long d’une seconde

Le survol n’existe pas sur écran tactile, et le clic **agit** (poser la carte, déclarer une attaque, produire un mana). Consulter une carte sans la jouer passe donc par l’**appui long** :

- garder le doigt **une seconde** sur une carte (`RPG_LONG_PRESS_MS`, `src/games/rpgLongPress.js`) ouvre le même aperçu, dans un volet sombre centré avec son bouton « Fermer l’aperçu » ;
- le geste répond partout où une carte porte un `data-card-id` : main, créatures des deux camps, rails de terrains, dessus de cimetière, catalogue, liste de deck et **créateur de deck** (bibliothèque et deck en cours) — au menu comme en duel ;
- **rien n’est joué** : le clic synthétique qui suit la fin du geste est avalé, comme après un glisser-déposer — **quelle que soit la fin du geste** (levée du doigt, annulation, défilement, `pointercancel` de WebView). Sans ça, une interruption qui arrivait entre le déclenchement et la levée laissait passer ce clic : il refermait le volet à peine ouvert et le joueur ne voyait « rien ne se passe » ;
- un **appui court reste un clic** et garde son action de jeu ; un doigt qui glisse au-delà de 10 px annule l’appui (c’est un défilement de la main ou un glisser-déposer) ;
- l’annonce d’une carte par le sorcier ne désarme jamais un appui long déjà en cours : son volet s’ouvre au-dessus du voile de l’annonce ; un aperçu déjà ouvert, lui, se range pour laisser l’annonce prendre la scène ;
- le volet se referme d’un toucher, du bouton Fermer, d’Échap, en changeant d’écran, ou quand l’appareil repasse en portrait ;
- le menu contextuel natif (callout iOS, « enregistrer l’image » Android), la sélection de texte **et le drag natif de l’illustration** sont étouffés sur toute la coque du jeu — cartes du créateur de deck comprises, pas seulement celles du duel. Dans l’APK, la WebView est en plus `setLongClickable(false)` et le **pull-to-refresh est désarmé pendant le duel** : un tirage vers le bas ne recharge plus la partie en cours, et ne vient plus annuler les appuis longs par `pointercancel` ;
- le duel n’annonce pas le geste : la table est muette, et le volet d’aperçu ne porte plus de légende. Seul le créateur de deck le rappelle en tête de sa bibliothèque (`rpg-atelier__astuce`, montrée au seul pointeur grossier) ;
- dans le créateur de deck, tenir une carte — ou son bouton « + » ou « − » — n’ajoute ni ne retire rien : l’aperçu est une consultation, et le clic simple garde son action d’atelier.

En paysage de téléphone, l’illustration de l’aperçu se règle sur la hauteur disponible (`42dvh`) pour que le volet et son bouton tiennent sans recouvrir la main.

## Le clic droit (souris) : la fiche de la carte

À la souris, le survol garde l’aperçu instantané collé à la carte, et le **bouton droit** ouvre la **fiche** — le même volet sombre que le clic du catalogue, avec le sur-titre de l’écran qui l’a ouvert (`DUEL · CRÉATURE` sur la table, `CATALOGUE · TERRAIN` au catalogue, `LE SABLIER · …` ailleurs).

- le geste répond partout où une carte porte un `data-card-id` : main, créatures des deux camps, rails de terrains, dessus de cimetière, grille du catalogue, liste d’un deck et guide des cartes ;
- **une carte, une fiche** : le volet ne montre que la carte désignée — celle du clic comme celle du clic droit. Ni flèches sur les côtés, ni compteur, ni balayage : pour lire une autre carte, on ouvre la sienne ;
- **rien n’est joué** : la créature n’est pas déclarée attaquante, la carte en main n’est ni posée ni payée, et une magie ne demande aucune confirmation de lancement ;
- la fiche se referme par le volet, Échap, son bouton Fermer, ou en changeant d’écran ;
- le menu du navigateur reste étouffé partout (table nue comme carte) ; dans le **créateur de deck**, le clic droit garde son sens — il retire un exemplaire — et n’ouvre donc pas la fiche (voir « L’aperçu au doigt », ci-dessus).

Les piles de terrains sont uniquement une présentation : chaque terrain reste une instance distincte dans le moteur. Une production manuelle engage le prochain terrain disponible de la pile ; le paiement automatique, le choix de couleur de Pétra, le dégagement et l’annulation conservent leur fonctionnement. Les types de terrains différents se placent côte à côte sur une seule rangée horizontale, dans les deux camps. Au moins deux piles sont visibles sur les formats paysage testés ; les suivantes sont accessibles par défilement horizontal, sans retour à la ligne. Les rangées sont décalées vers l’intérieur du bois et alignées en bas du champ de chaque camp, hors des bordures et ornements du décor. Les piles restent droites et leurs compteurs demeurent dans leur cadre. Une carte terrain jouée rejoint sa pile existante lors de l’animation.

Les attaquants sont couchés à 90° dès leur déclaration et restent couchés après l’attaque. Cette rotation dépend de l’état de la créature et reste prioritaire sur les animations ; annuler la déclaration redresse la carte.

Le glisser-déposer reste disponible. Les flèches de blocage suivent le défilement. L’aperçu instantané n’a ni fond principal ni cadre ; seul l’encadré des infos garde son fond sombre, et le plateau n’a plus de grands fonds opaques. L’aperçu d’une magie lancée (centré, 1,8 s, aucune carte n’étant survolée) est ce même aperçu : ni liseré, ni halo, ni ombre, ni animation à lui. Seul son `z-index` (`.is-spell-preview`) le distingue, pour rester devant l’annonce « MAGIE JOUÉE ».

Le plateau, lui, n’est **plus recouvert du tout** : le voile noir dégradé (`--rpg-plateau-voile`) et les vignettes par famille de terrain sont retirés, souris comme doigt. Les textes de la table tiennent désormais par leur **chrome** — chaque capsule porte son propre fond translucide (deux tiers d’ombre, un tiers de peinture, soit ≈ 4,5:1 pour l’encre crème, contre ≈ 2,9:1 sur la dune nue). Au doigt, la barre de navigation du duel et les plaques des deux sorciers reçoivent la leur (`rpg-mobile.css`) ; la capsule des compteurs de paquet et de cimetière vit dans `rpg-battle.css` pour les deux présentations.

## La zone de jeu élargie et les piles de cartes homonymes

La grille tactile partage l'écran en trois colonnes : identité et terrains à gauche, **zone de jeu** au centre, phases et commandes à droite. La colonne centrale mesurait 343 px sur un 844 × 390 (≈ 3,8 cartes visibles) et 246 px sur un 667 × 375 (≈ 2,8) : trop court pour voir sa main et les deux champs sans défiler.

Elle passe à **386 px (≈ 4,7 cartes, +25 %)** sur 844 × 390 et **270 px (≈ 3,4, +21 %)** sur 667 × 375, en rendant de la place sur les deux rails (`clamp(116px, 16vw, 190px)` à gauche, `clamp(200px, 27vw, 320px)` à droite — trois boutons tactiles de 44 px y tiennent encore côte à côte) et en resserrant les gouttières des rangées (`gap: max(8px, carte × .22)`, marges `max(8px, carte × .12)`, main à 6 px). **`--duel-card` ne bouge pas** : agrandir les cartes en réduirait le nombre. **`--terrain-inset` non plus** : c'est la marge qui tient les rails de terrains hors du cadre illustré, mesurée par `check:rpg-mobile`.

Le reste vient des **piles de cartes homonymes**, au doigt seulement (`empilerCartes = viewport.mobile`) :

- dans la **main** comme sur les **deux champs de bataille**, N exemplaires d'une même carte n'occupent plus qu'un emplacement, avec un compteur **×N** sur le coin supérieur droit et des ombres décalées — le langage des piles de terrains ;
- une pile **agit sur l'exemplaire pertinent** : le premier prêt (ni engagé, ni déjà attaquant, ni mal d'invocation) côté joueur, la cible légale ou l'attaquant non bloqué côté adverse. Chaque clic suivant avance dans le groupe ;
- toucher le compteur **déplie** le groupe (une puce ×N, dans la rangée, permet de le **replier**) ;
- tout groupe dont un exemplaire participe à l'**action en cours** — attaquants déclarés, combat entrant, blocages assignés, cible de sort, coup rapide, bloqueur sélectionné, effet visuel — **se déplie seul**, pour que les flèches de blocage, les halos de cible et les destructions retrouvent chaque carte ;
- un exemplaire masqué **emprunte la place de sa pile** dans l'instantané du champ : son effet de destruction part du bon endroit au lieu du coin de la table ;
- l'**appui long** d'une seconde ouvre l'aperçu de la pile sans rien jouer ni déplier ;
- une **créature armée** n'est jamais regroupée avec ses homonymes : elle forme sa propre pile, l'arme glissée sous elle (`.rpg-card-stack--arme`), et son aperçu — survol ou appui long — ajoute les stats et effets accordés par l'arme **en bleu et en tête** du texte d'effet, sans en afficher le nom ;
- à la souris et sur grand écran, **rien ne change** : une carte = un emplacement, et le DOM de la main est exactement celui d'origine.

Le regroupement est une présentation : chaque exemplaire reste une instance distincte dans le moteur, avec son index réel en main (le vol de carte, la pioche et le paiement visent l'exemplaire concerné). `src/games/rpgCardStacks.js` porte les deux fonctions pures (`groupCartesMain`, `groupEntitesParCarte`), `src/games/rpg-mobile.css` la présentation (`.rpg-hand__pile`, `.rpg-card-stack`, `.rpg-card-stack__count`, `.rpg-card-stack__toggle`).

## Plein écran et orientation

Le plein écran appartient à la **page**, pas au duel : `RpgDuelPage.jsx` branche le moteur partagé des jeux d’arcade (`gameFullscreen.js` / `useGameFullscreen.js`) sur la coque `.rpg-battle`, qui est déjà une couche fixe couvrant tout le viewport. Il est posé dès l’ouverture — menu Jouer, mode Histoire, decks et catalogue compris — et le plein écran natif part au premier geste du joueur, puis à chaque lancement de partie. Bouton du menu, bouton de la barre du duel et touche F le basculent. Voir « Le Sablier : le plein écran » dans le `README.md`.

`rpgLandscape.js` ne demande donc plus le plein écran (`enter({ fullscreen: false })`) : il **attend** celui de la page — `screen.orientation.lock('landscape')` est refusé tant que le document n’est pas en plein écran — puis verrouille le paysage quand le navigateur l’autorise. Un seul propriétaire du plein écran : le retour au menu ne referme plus l’écran demandé. Si l’appareil reste en portrait, un écran de rotation empêche d’interagir avec le duel derrière lui. Aucun artifice CSS ne tourne les coordonnées du plateau.

Safari, certaines WebViews et les aperçus embarqués peuvent refuser les API de plein écran/rotation. La couche fixe couvre quand même tout le viewport, et l’utilisateur tourne physiquement son appareil. Le bouton « Activer le paysage » permet de réessayer (il redemande aussi le plein écran) ; « Retour au menu » reste accessible.

Dans l’APK, `LetsPlayAndroid.setDuelLandscape` demande `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`, uniquement sur l’URL de confiance du duel. L’orientation précédente est restaurée au retour au menu ou en quittant le jeu. Le manifeste gère déjà les changements d’orientation sans recréer l’activité. **Cette nouvelle méthode native nécessite de reconstruire et installer l’APK** ; une ancienne APK utilise le repli navigateur.

## Vérifications

```sh
npm ci
npx playwright install chromium
npm run dev
# Dans un autre terminal :
npm run check:rpg-mobile
npm run check:rpg
npm run check:rpg-fullscreen
npm run check:rpg-ui
npm run build
```

- Tests purs : moteur, audio, gestes (glisser-déposer **et appui long** : `tests/rpg-long-press.test.js`), piles de terrains (paiement, production individuelle, dégagement, restauration), piles de cartes homonymes (`tests/rpg-card-stacks.test.js` : ordre, index réels, carte de tête, camps séparés) et cycle de vie de l’orientation — y compris les refus, les promesses tardives et l’attente du plein écran de la page avant le verrou de paysage.
- Tests React/jsdom : bandeau d’ouverture de tour (`npm run check:rpg-turn-banner` : « Votre tour » au joueur, « Tour de l’adversaire » au sorcier, 1,5 s chronométrée, muet pendant le mulligan et sur un duel terminé, toujours éteint après un aller-retour par le menu), clic-jeu direct, confirmation des magies, mana insuffisant, limite de terrain, annulation, sélection d’attaque, annulation, confirmation, interdiction d’attaquer deux fois, terrain engagé, aperçu par appui long (catalogue, main, créature en jeu, et le créateur de deck : bibliothèque, bouton « + », ligne du deck en cours, bouton « − ») qui ne joue rien et n’ajoute ni ne retire aucune carte, et — dans `scripts/rpg-stacks-smoke.jsx` — les piles homonymes des deux camps : compteur ×N, tête de pile, dépliage au toucher et automatique, blocage assigné depuis une pile repliée, pioche qui remplit la pile sans l’élargir. `scripts/rpg-battle-ui-check.mjs` vérifie la **petite carte d'arme** dans l'aperçu, la ligne bleue d'effet, l'absence de bonus et de texte d'arme sur la face jouée, et les **losanges chiffrés sous la couleur des monos ou sous le coût des hybrides** (Heures et sable, lisibles même au doigt sur une carte étroite). `scripts/rpg-stacks-smoke.jsx` vérifie aussi leur mise à jour et leur disparition à zéro. `npm run check:rpg-hybrid-cost` vérifie les moitiés de couleur communes aux coûts et sceaux, ainsi que les médaillons de la bibliothèque et du deck dans l’atelier ; le guide montre Vent rouge avec le même disque et le même sceau (`check:rpg-tutorial-ui`). `scripts/rpg-fullscreen-smoke.jsx` joue de son côté le plein écran de la page réelle : couche fixe au montage (menu compris), natif au premier geste et au lancement d’un duel ou d’un étage, même nœud d’un écran à l’autre, touche F et ses combinaisons ignorées, sortie du navigateur, repli sans Fullscreen API.
- Tests Chromium : repli portrait, plateaux 568×320, 667×375, 844×390 et 1024×768 sans recouvrement des zones (rails de terrains, centrage ou défilement complet des groupes de cartes, commandes côte à côte) ; actions directes au toucher ; jeu d’un terrain par glisser-déposer après rotations ; retour au menu. La main y est mesurée carte par carte — **aucun recouvrement**, chaque carte visible répondant au doigt en son centre, largeur ≥ 34 px, première carte atteignable — puis remplie de huit cartes factices dont chacune est touchée après avoir été amenée dans le champ : 8/8. Le voile n’existe plus : `check:rpg-ui` interdit `--rpg-plateau-voile`, `.card-table::before` et les vignettes par plateau, et exige les capsules qui les remplacent.

Variables facultatives : `RPG_URL`, `CHROMIUM_EXECUTABLE_PATH` et `RPG_SCREENSHOT` (capture du plateau).

La compilation web et les tests de navigateur ne valident pas l’APK natif. Vérifier aussi sur Android/iOS réels, en particulier les encoches, barres système, verrouillages d’orientation et retours vers le menu.

Les cartes posées n’impriment plus leur type sur l’illustration ; celui-ci reste disponible dans l’aperçu au survol et le libellé accessible. Les cartes en main ne sont pas modifiées.
