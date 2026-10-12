# Duel mobile : paysage et actions directes

## Présentation

`src/games/rpg-mobile.css` contient la présentation tactile, activée par `.rpg-battle--touch` (application Android, pointeur tactile ou fenêtre ≤ 1 100 px).

Le plateau conserve les illustrations originales de Bab El, avec une organisation inspirée des jeux de cartes numériques en paysage :

- deux champs au centre, sans panneaux opaques ;
- terrains identiques regroupés par type dans chaque camp, avec uniquement le compteur total sur la carte (disponibilités dans le libellé accessible) ;
- cartes homonymes regroupées elles aussi — main et deux champs de bataille — avec un compteur ×N flottant sur le coin de la pile ;
- identités et compteurs flottants ;
- main en bas, défilable horizontalement ;
- commandes « Attaquer avec tous », confirmation/annulation de l’attaque, annulation de la dernière action et fin du tour regroupées côte à côte sur le plateau, selon la phase ;
- progression des phases immédiatement au-dessus des commandes, avec la phase actuelle mise en évidence.

Le clic sur une carte en main la joue immédiatement, sur ordinateur comme sur mobile : la pose réutilise les validations et les animations du glisser-déposer, y compris le paiement automatique et le choix ultérieur d’une cible. Une carte refusée reste en main et le refus est expliqué (mana, limite de terrain, phase). **Les magies demandent une confirmation** avant le lancement ; Annuler laisse le sort en main. Les créatures et terrains déjà posés agissent aussi directement au clic : attaque ou retrait de la sélection, blocage, choix de cible ou production de mana selon l’état de la partie. La confirmation de l’attaque se fait uniquement sur le plateau, à côté de la fin du tour, où reste aussi l’annulation de la dernière action. Les statistiques d’une créature en jeu reflètent ses valeurs actuelles.

Au survol d’une carte (ordinateur), l’aperçu instantané reste le seul moyen de consulter les détails : effets, statistiques, compteurs de terrains, sans texte explicatif bleu.

## L’aperçu au doigt : appui long d’une seconde

Le survol n’existe pas sur écran tactile, et le clic **agit** (poser la carte, déclarer une attaque, produire un mana). Consulter une carte sans la jouer passe donc par l’**appui long** :

- garder le doigt **une seconde** sur une carte (`RPG_LONG_PRESS_MS`, `src/games/rpgLongPress.js`) ouvre le même aperçu, dans un volet sombre centré avec son bouton « Fermer l’aperçu » ;
- le geste répond partout où une carte porte un `data-card-id` : main, créatures des deux camps, rails de terrains, dessus de cimetière, catalogue, liste de deck et **créateur de deck** (bibliothèque et deck en cours) — au menu comme en duel ;
- **rien n’est joué** : le clic synthétique qui suit le lever du doigt est avalé, comme après un glisser-déposer ;
- un **appui court reste un clic** et garde son action de jeu ; un doigt qui glisse au-delà de 10 px annule l’appui (c’est un défilement de la main ou un glisser-déposer) ;
- le volet se referme d’un toucher, du bouton Fermer, d’Échap, en changeant d’écran, ou quand l’appareil repasse en portrait ;
- le menu contextuel natif (callout iOS, « enregistrer l’image » Android), la sélection de texte **et le drag natif de l’illustration** sont étouffés sur les cartes — celles du créateur de deck comprises, pas seulement celles du duel ;
- le duel n’annonce pas le geste : la table est muette, et le volet d’aperçu ne porte plus de légende. Seul le créateur de deck le rappelle en tête de sa bibliothèque (`rpg-atelier__astuce`, montrée au seul pointeur grossier) ;
- dans le créateur de deck, tenir une carte — ou son bouton « + » ou « − » — n’ajoute ni ne retire rien : l’aperçu est une consultation, et le clic simple garde son action d’atelier.

En paysage de téléphone, l’illustration de l’aperçu se règle sur la hauteur disponible (`42dvh`) pour que le volet et son bouton tiennent sans recouvrir la main.

Les piles de terrains sont uniquement une présentation : chaque terrain reste une instance distincte dans le moteur. Une production manuelle engage le prochain terrain disponible de la pile ; le paiement automatique, le choix de couleur de Pétra, le dégagement et l’annulation conservent leur fonctionnement. Les types de terrains différents se placent côte à côte sur une seule rangée horizontale, dans les deux camps. Au moins deux piles sont visibles sur les formats paysage testés ; les suivantes sont accessibles par défilement horizontal, sans retour à la ligne. Les rangées sont décalées vers l’intérieur du bois et alignées en bas du champ de chaque camp, hors des bordures et ornements du décor. Les piles restent droites et leurs compteurs demeurent dans leur cadre. Une carte terrain jouée rejoint sa pile existante lors de l’animation.

Les attaquants sont couchés à 90° dès leur déclaration et restent couchés après l’attaque. Cette rotation dépend de l’état de la créature et reste prioritaire sur les animations ; annuler la déclaration redresse la carte.

Le glisser-déposer reste disponible. Les flèches de blocage suivent le défilement. L’aperçu instantané n’a ni fond principal ni cadre ; seul l’encadré des infos garde son fond sombre, et le plateau n’a plus de grands fonds opaques. L’aperçu d’une magie lancée (centré, 1,8 s, aucune carte n’étant survolée) est ce même aperçu : ni liseré, ni halo, ni ombre, ni animation à lui. Seul son `z-index` (`.is-spell-preview`) le distingue, pour rester devant l’annonce « MAGIE JOUÉE ».

Le plateau garde en revanche son **voile noir dégradé en haut et en bas** (`--rpg-plateau-voile`, `rpg-battle.css`) : les textes de la table vivent dans ces deux bandes — navigation et identité du sorcier en haut, identité du joueur, terrains, indicateur de tour, journal, phases, commandes et main en bas — et les plateaux clairs (l’Erg du Sahara monte à 142/255 en haut du cadre, les Ruines de Tipaza à 118 en bas) noyaient l’encre crème. Seule la vignette centrale disparaît au doigt, pour laisser le champ de bataille dégagé ; les bandes sont recalées sur les rangées de la grille tactile.

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
- à la souris et sur grand écran, **rien ne change** : une carte = un emplacement, et le DOM de la main est exactement celui d'origine.

Le regroupement est une présentation : chaque exemplaire reste une instance distincte dans le moteur, avec son index réel en main (le vol de carte, la pioche et le paiement visent l'exemplaire concerné). `src/games/rpgCardStacks.js` porte les deux fonctions pures (`groupCartesMain`, `groupEntitesParCarte`), `src/games/rpg-mobile.css` la présentation (`.rpg-hand__pile`, `.rpg-card-stack`, `.rpg-card-stack__count`, `.rpg-card-stack__toggle`).

## Orientation

`rpgLandscape.js` demande le plein écran depuis le geste de lancement, puis `screen.orientation.lock('landscape')` quand le navigateur l’autorise. Si l’appareil reste en portrait, un écran de rotation empêche d’interagir avec le duel derrière lui. Aucun artifice CSS ne tourne les coordonnées du plateau.

Safari, certaines WebViews et les aperçus embarqués peuvent refuser les API de plein écran/rotation. Dans ce cas, l’utilisateur tourne physiquement son appareil. Le bouton « Activer le paysage » permet de réessayer ; « Retour au menu » reste accessible.

Dans l’APK, `LetsPlayAndroid.setDuelLandscape` demande `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`, uniquement sur l’URL de confiance du duel. L’orientation précédente est restaurée au retour au menu ou en quittant le jeu. Le manifeste gère déjà les changements d’orientation sans recréer l’activité. **Cette nouvelle méthode native nécessite de reconstruire et installer l’APK** ; une ancienne APK utilise le repli navigateur.

## Vérifications

```sh
npm ci
npx playwright install chromium
npm run dev
# Dans un autre terminal :
npm run check:rpg-mobile
npm run check:rpg
npm run check:rpg-ui
npm run build
```

- Tests purs : moteur, audio, gestes (glisser-déposer **et appui long** : `tests/rpg-long-press.test.js`), piles de terrains (paiement, production individuelle, dégagement, restauration), piles de cartes homonymes (`tests/rpg-card-stacks.test.js` : ordre, index réels, carte de tête, camps séparés) et cycle de vie de l’orientation, y compris les refus et promesses tardives.
- Tests React/jsdom : clic-jeu direct, confirmation des magies, mana insuffisant, limite de terrain, annulation, sélection d’attaque, annulation, confirmation, interdiction d’attaquer deux fois, terrain engagé, aperçu par appui long (catalogue, main, créature en jeu, et le créateur de deck : bibliothèque, bouton « + », ligne du deck en cours, bouton « − ») qui ne joue rien et n’ajoute ni ne retire aucune carte, et — dans `scripts/rpg-stacks-smoke.jsx` — les piles homonymes des deux camps : compteur ×N, tête de pile, dépliage au toucher et automatique, blocage assigné depuis une pile repliée, pioche qui remplit la pile sans l’élargir.
- Tests Chromium : repli portrait, plateaux 568×320, 667×375, 844×390 et 1024×768 sans recouvrement des zones (rails de terrains, centrage ou défilement complet des groupes de cartes, commandes côte à côte) ; actions directes au toucher ; jeu d’un terrain par glisser-déposer après rotations ; retour au menu.

Variables facultatives : `RPG_URL`, `CHROMIUM_EXECUTABLE_PATH` et `RPG_SCREENSHOT` (capture du plateau).

La compilation web et les tests de navigateur ne valident pas l’APK natif. Vérifier aussi sur Android/iOS réels, en particulier les encoches, barres système, verrouillages d’orientation et retours vers le menu.

Les cartes posées n’impriment plus leur type sur l’illustration ; celui-ci reste disponible dans l’aperçu au survol et le libellé accessible. Les cartes en main ne sont pas modifiées.
