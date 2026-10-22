# Duel mobile : paysage et actions directes

## Présentation

`src/games/rpg-mobile.css` contient la présentation tactile, activée par `.rpg-battle--touch` (application Android, pointeur tactile ou fenêtre ≤ 1 100 px).

Le plateau conserve les illustrations originales de Bab El, avec une organisation inspirée des jeux de cartes numériques en paysage :

- deux champs au centre, sans panneaux opaques ;
- terrains identiques regroupés par type dans chaque camp, avec uniquement le compteur total sur la carte (disponibilités dans le libellé accessible) ;
- cartes homonymes regroupées elles aussi — main et deux champs de bataille — avec un compteur ×N flottant sur le coin de la pile ;
- identités et compteurs flottants ;
- **menu hamburger du duel (`.rpg-duel-nav`)** : sur écran tactile, la barre de navigation du duel reprend la **capsule sombre du PC** — même fond translucide, même rayon, posée à droite de la rangée de navigation — et n'y laisse qu'un bouton hamburger agrandi (`.rpg-duel-nav__burger`, icône `26 px`, panneau `.rpg-duel-nav__menu` à `min-width: 240px`) regroupant `Menu`, `Deck`, `Catalogue`, l'onglet `Paramètres` (qui abrite l'option `3D` ainsi que le contrôle du volume des `Sons du jeu` et des `Musiques`), l'entrée `Messagerie` (qui ouvre le voile de la messagerie du jeu au-dessus de la table) et le plein écran. Le menu principal du Sablier dispose également d'un onglet `⚙ Paramètres` ;
- **le journal du duel (`.rpg-combat-feed`)** : un onglet dans la cellule `coin`, à gauche de la navigation — même capsule que celle-ci, il ne montre que son nom et le badge des faits non lus ; le panneau des quatre derniers échanges s'ouvre au toucher, par-dessus le champ du sorcier, et se referme d'un second toucher, de sa croix, d'un toucher ailleurs sur la table ou d'Échap. Il ne recouvre plus la plaque du joueur, la main ni les commandes, où il restait déplié en bas à gauche ;
- main en bas : **une carte = une cible**, jamais deux cartes sous le même doigt — la rangée partage sa largeur entre ses emplacements (les cartes rétrécissent ensemble, `flex: 1 1 0; min-width: 0`) et **ne recadre rien** (`overflow: visible`, aucun masque) : aucune carte n’est coupée sur les côtés, la pioche qui glisse depuis la gauche (`rpg-player-card-draw`) entre à découvert et les compteurs ×N ne sont pas rognés. À la souris, la même rangée s’ouvre en **éventail** (angle, écart et descente en arc portés par `--hand-fan`, voir le `README.md`) ; au doigt, les repères de l’éventail sont remis à zéro — la règle « une carte = une cible » interdit tout recouvrement. Au doigt toujours, la **pastille de couleur** de la main est réduite (16 px, filet de 1,5 px) pour laisser l'illustration respirer, pendant que le disque de coût garde le diamètre commun de 22 px ;
- commandes « Attaquer avec tous », confirmation/annulation de l’attaque, annulation de la dernière action et fin du tour regroupées sur le plateau, selon la phase — **côte à côte à la souris, empilées au doigt sur toute la largeur de la colonne du tour**, chacune haute de 44 px au moins (voir « Au doigt, des cibles pleines » ci-dessous) ; **« Confirmer l’attaque » et « Résoudre le combat » portent leur propre aplat clair** (bleu glacé, or) et leur halo, au doigt comme à la souris : ce sont les commandes principales, elles ne prennent plus le fond sombre des commandes en retrait (`rpg-mobile.css`, voir « Le Sablier : la main en éventail… » dans le `README.md`) ;
- progression des phases immédiatement au-dessus des commandes, **comme sur PC** : une rangée de six icônes orange (début, principale, attaque, blocage, deuxième principale, fin) dans une capsule sombre translucide, la phase actuelle allumée, **l'attaque du tour marquée d'une coche une fois consommée** — une seule phase d'attaque par tour, voir « Le Sablier : le Coup rapide est un choix… » dans le `README.md` —, les noms gardés pour les lecteurs d'écran. Les six pastilles se partagent la largeur du rail (plafonnées à 0,34 carte) : sur un 568 × 320 elles se resserrent au lieu de se chevaucher ;
- colonne de droite (rail du tour et commandes) à **2,47 cartes de large** — la largeur du rail du PC (330 px pour une carte de 140) — plafonnée à 23 % de la largeur (`--rpg-touch-controls: min(calc(var(--duel-card) * 2.47), 23vw)`), les deux commandes de combat faisant 44 px de haut (0,55 carte, cible tactile) ;
- cartes posées sur la table un peu plus petites que celles de la main (`--rpg-field-card` = 95 % de `--duel-card` — agrandies depuis 85 % pour lire les créatures en jeu), **sans masque ni zone de défilement** autour d'elles : la largeur des cartes se partage entre les emplacements de la rangée (`--row-count`, compté en CSS par `:has(> :nth-child(N))`) jusqu'à un plancher de 40 px, puis elles se chevauchent plutôt que de déborder. **Leur coût ne s'imprime plus sur la face** : une créature en jeu n'a plus rien à payer — la pastille de couleur, les compteurs et ATQ/DEF suffisent. Le disque reste dans le DOM et son montant dans le `aria-label` de la carte, et il garde les autres faces (main, mulligan, aperçus, catalogue) ; le disque de neige du bouton de capacité activée, hors du titre, reste visible ;
- sur une **créature équipée**, ni le bonus ni le texte de l'arme ne sont imprimés sur la face. Les compteurs d'effet (Heures de la créature, sable de la Jitte équipée) se lisent en **petits losanges chiffrés sous la couleur sur une mono, à droite sur une hybride — sous l'emplacement du coût, qui ne s'imprime plus sur la face posée —**, même quand la carte se resserre ; ils ne recouvrent pas les statistiques ATQ/DEF. Seul le losange ⛓ de la **cale** (Abordage) échappe à ce partage : il se range **sous les couleurs, sur une hybride aussi** (sous ses deux pastilles empilées), parce que le prisonnier se lit avec la créature qui le détient, jamais avec son coût. Aucune vignette d'arme ne recouvre la face, au doigt comme à la souris : l'équipement ne change **pas le cadre ordinaire de la créature** et la petite carte illustrée apparaît dans l'aperçu ;
- **à chaque bascule de tour**, un bandeau nomme le camp qui prend la main, au centre de la table : « Votre tour » en or, « Tour de l'adversaire » en braise (les teintes de la pastille de tour), le temps d'un battement de 1,5 s (`RPG_ANNONCE_TOUR_DUREE`, composant `AnnonceTour` de `RpgDuelPage.jsx`). Il ne capte aucun geste — la main reste jouable dessous — et **passe sous ce qui prend la scène** : le voile de fin de duel, l'annonce de sort du sorcier et l'éclair d'impact. Il se tait pendant le mulligan, sur un duel terminé, et ne se rejoue pas quand on revient sur la table sans que le tour ait changé ; une partie neuve, elle, s'annonce toujours.
- **la consigne d'action** (`.rpg-annonce-action`, composant `AnnonceActionJoueur`) — « Choisissez vos bloqueurs ou résolvez le combat », « Blocages déclarés… », une cible, une défausse — se pose elle aussi au centre de la table. C'est une **puce discrète**, pas une plaque : texte de 10 à 12 px, pastilles de 4 px, fond à 76 % et largeur plafonnée à 560 px. Elle se glisse ainsi sur les cartes en jeu sans les masquer pendant la défense ; en mouvement réduit, elle apparaît sans animation.

Le clic sur une carte en main la joue immédiatement, sur ordinateur comme sur mobile : la pose réutilise les validations et les animations du glisser-déposer, y compris le paiement automatique et le choix ultérieur d’une cible. Une carte refusée reste en main et le refus est expliqué (mana, limite de terrain, phase). **Les magies demandent une confirmation** avant le lancement ; Annuler laisse le sort en main. Les créatures et terrains déjà posés agissent aussi directement au clic : attaque ou retrait de la sélection, blocage, choix de cible ou production de mana selon l’état de la partie. La confirmation de l’attaque se fait uniquement sur le plateau, à côté de la fin du tour, où reste aussi l’annulation de la dernière action. Les statistiques d’une créature en jeu reflètent ses valeurs actuelles.

Au survol d’une carte (ordinateur), l’aperçu instantané permet de consulter les détails : effets, statistiques et compteurs de terrains. La créature équipée y montre une **petite carte par arme** avec son image, son nom et son effet ; les bonus directs ouvrent aussi le texte d'effet de la créature en bleu. Au doigt, le même contenu s'ouvre par appui long ou sur la fiche au clic droit.

## L’aperçu au doigt : appui long d’une seconde

Le survol n’existe pas sur écran tactile, et le clic **agit** (poser la carte, déclarer une attaque, produire un mana). Consulter une carte sans la jouer passe donc par l’**appui long** :

- garder le doigt **320 ms** sur une carte (`RPG_LONG_PRESS_MS`, `src/games/rpgLongPress.js`) ouvre le même aperçu, dans un volet sombre décalé à l'opposé du pouce avec retour haptique et son bouton « Fermer l’aperçu » ;
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

Les attaquants sont couchés à 10° dès leur déclaration et restent couchés après l’attaque. Cette rotation dépend de l’état de la créature et reste prioritaire sur les animations ; annuler la déclaration redresse la carte.

Le glisser-déposer reste disponible. Les flèches de blocage suivent le défilement. L’aperçu instantané n’a ni fond principal ni cadre ; seul l’encadré des infos garde son fond sombre, et le plateau n’a plus de grands fonds opaques. L’aperçu d’une magie lancée (centré, 1,8 s, aucune carte n’étant survolée) est ce même aperçu : ni liseré, ni halo, ni ombre, ni animation à lui. Seul son `z-index` (`.is-spell-preview`) le distingue, pour rester devant l’annonce « MAGIE JOUÉE ».

Le plateau, lui, n’est **plus recouvert du tout** : le voile noir dégradé (`--rpg-plateau-voile`) et les vignettes par famille de terrain sont retirés, souris comme doigt. Les textes de la table tiennent désormais par leur **chrome** — chaque capsule porte son propre fond translucide (deux tiers d’ombre, un tiers de peinture, soit ≈ 4,5:1 pour l’encre crème, contre ≈ 2,9:1 sur la dune nue). Au doigt, la barre de navigation du duel et les plaques des deux sorciers reçoivent la leur (`rpg-mobile.css`) ; la capsule des compteurs de paquet et de cimetière vit dans `rpg-battle.css` pour les deux présentations.

## La composition du PC, à l'échelle du téléphone

Le duel au doigt reprend **la composition du PC**, et non plus une disposition
propre au téléphone : la plaque du sorcier en haut à gauche avec sa jauge de
mana juste dessous, la plaque du joueur en bas à gauche avec la sienne juste
au-dessus, les deux champs au centre avec leurs cinq cases alignées en bas de
chaque rangée, le rail du tour et les commandes dans la colonne de droite,
la main sur toute la largeur en bas, la capsule de navigation en haut à droite.

Une seule mesure commande tout le reste : **la largeur d'une carte de la
main**, `--duel-card`, qui vaut `clamp(44px, 15.55svh, 104px)` — les 140 px du
PC sur 900 px de haut, soit 15,55 % de la hauteur. Les autres mesures s'en
déduisent, comme sur le grand écran :

| repère | valeur | PC (1440 × 900) |
| --- | --- | --- |
| carte de la main | 1 | 140 px |
| plaque de sorcier | 2 cartes de large | 204–216 px |
| jauge de mana | 2,6 cartes au plus | 314 px |
| carte posée | 0,95 carte | 144 px de case |
| bande de la main | 1,38 carte | 193 px |
| rangée de navigation | 0,62 carte | 44 px |
| colonne des commandes | 2,47 cartes (≤ 23 %) | 330 px |
| commande de combat | 0,55 carte (plancher 44 px) | 48–58 px |

La grille tactile est donc, littéralement, celle du PC :

```
"coin      nav      nav"
"enemy-mana enemy    controls"
"mana      allies   controls"
"hand      hand     hand"
```

Les deux champs se partagent la hauteur restante à parts égales et se
rejoignent au milieu de la table, comme les deux rangées du PC. Les cinq cases
de chaque camp gardent la largeur d'une carte posée : une carte jouée tombe
dans sa case, sans défilement.

Sur les quatre formats vérifiés (`check:rpg-mobile`), la carte de la main suit
la proportion du PC — 50 px sur 568 × 320, 58 sur 667 × 375, 61 sur
844 × 390, 104 (plafond) sur 1024 × 768 —, la navigation fait 0,62 carte et la
main 1,38 carte. Seuls deux planchers restent en pixels : les cibles tactiles
(44 px) et les textes (9 px), pour que rien ne devienne illisible ni
intouchable sur un 568 × 320.

**La jauge de mana remplace les piles de terrains.** Le duel par défaut se joue
sans terrains (`RPG_MODE_MANA_ESSAI`) : chaque camp a ses dix losanges et son
compteur, posés contre sa plaque, deux rangées de cinq — la colonne de gauche
du téléphone est plus étroite que celle du PC, les losanges y restent lisibles
au lieu de dix points de 8 px. La jauge et la plaque partagent la même cellule
de grille : la plaque s'aligne au bord extérieur, la jauge se cale derrière elle
à la hauteur réelle de la plaque (`--rpg-plaque-*-h`), publiée par la page, et
**se borne à la place qui reste** dans la rangée (`--rpg-jauge-*-h`) : ses deux
rangées de cinq losanges se resserrent plutôt que de déborder sur le camp
d'en face quand la plaque s'offre une ligne de plus.

Le reste vient des **piles de cartes homonymes**, au doigt seulement (`empilerCartes = viewport.mobile`) :

- dans la **main** comme sur les **deux champs de bataille**, N exemplaires d'une même carte n'occupent plus qu'un emplacement, avec un compteur **×N** sur le coin supérieur droit et des ombres décalées — le langage des piles de terrains ;
- une pile **agit sur l'exemplaire pertinent** : le premier prêt (ni engagé, ni déjà attaquant, ni mal d'invocation) côté joueur, la cible légale ou l'attaquant non bloqué côté adverse. Chaque clic suivant avance dans le groupe ;
- toucher le compteur **déplie** le groupe (une puce ×N, dans la rangée, permet de le **replier**) ;
- tout groupe dont un exemplaire participe à l'**action en cours** — attaquants déclarés, combat entrant, blocages assignés, cible de sort, coup rapide, bloqueur sélectionné, effet visuel — **se déplie seul**, pour que les flèches de blocage, les halos de cible et les destructions retrouvent chaque carte ;
- un exemplaire masqué **emprunte la place de sa pile** dans l'instantané du champ : son effet de destruction part du bon endroit au lieu du coin de la table ;
- l'**appui long** d'une seconde ouvre l'aperçu de la pile sans rien jouer ni déplier ;
- une **créature armée** n'est jamais regroupée avec ses homonymes : elle forme sa propre pile d'exemplaires et **conserve le cadre ordinaire de sa carte** (la carte d'arme ne se glisse plus derrière elle), et son aperçu — survol ou appui long — ajoute les stats et effets accordés par l'arme **en bleu et en tête** du texte d'effet, sans en afficher le nom ;
- à la souris et sur grand écran, **rien ne change** : une carte = un emplacement, et le DOM de la main est exactement celui d'origine.

Le regroupement est une présentation : chaque exemplaire reste une instance distincte dans le moteur, avec son index réel en main (le vol de carte, la pioche et le paiement visent l'exemplaire concerné). `src/games/rpgCardStacks.js` porte les deux fonctions pures (`groupCartesMain`, `groupEntitesParCarte`), `src/games/rpg-mobile.css` la présentation (`.rpg-hand__pile`, `.rpg-card-stack`, `.rpg-card-stack__count`, `.rpg-card-stack__toggle`).

## Au doigt, des cibles pleines : les commandes du tour et la réponse au sorcier

Une commande peut être parfaitement dimensionnée et rester **intouchable** :
mesurée à 844 × 390, la colonne d'actions du coin inférieur droit passait sous
la main du joueur (`z-index: 42`), et le centre de « Laisser passer »
répondait `.rpg-hand` — le doigt touchait une carte, pas le bouton. Trois
règles règlent le problème.

**Les commandes du tour s'empilent.** « Attaquer avec tous (0) » et « Fin du
tour » occupaient deux demi-colonnes de 73 px, où le premier tenait sur trois
lignes ; ils prennent maintenant toute la largeur du rail, 44 px de haut
chacun (`--rpg-touch-combat`, 0,55 carte). La `grid-column: 2` du PC est remise
à `auto` : sans ça, une colonne implicite réapparaissait et les deux boutons se
serraient de nouveau côte à côte.

**La colonne se mesure.** La barre de combat ferme la colonne juste au-dessus
de la main ; sa hauteur varie d'une à trois commandes empilées
(« Confirmer l'attaque », « Annuler l'attaque », « Résoudre le combat »…). La
page publie sa hauteur réelle (`--rpg-controles-h`, `ResizeObserver`) et le rail
du tour s'ancre dessus : il ne recouvre jamais la barre et ne passe jamais sous
la main. Sur un écran très court (≤ 360 px de haut), les commandes de combat
passent sur deux colonnes et « Attaquer avec tous » s'efface pendant une
attaque — le rail garde « Fin du tour » dans la colonne ; au besoin, il se
borne à la hauteur libre et défile au lieu de sortir par le haut.

**La réponse au sorcier quitte la colonne.** Le panneau compact
(`.rpg-annonce-sort__compact`, « Laisser passer » / « Voir l'aperçu », et sa
variante « Fin du tour du sorcier → Passer ») était posé dans la colonne de
droite, sous la main. Il devient une **barre fixe juste au-dessus de la main**,
au-dessus de tout le reste (`z-index: 60`), qui part du **bord droit de la
plaque du joueur** (`--rpg-plaque-droite`, publiée elle aussi) : le profil et
la vie restent lisibles pendant qu'on choisit. Ses commandes font 48 px de haut
au moins et la largeur de leur texte (« Laisser passer » : 153 × 50 à
844 × 390, atteint au centre). Le rail du tour s'ancre au-dessus de la barre
(`--rpg-barre-reponse-h`, 64 px) au lieu de passer dessous.

## Le profil au doigt : le nom en deux lignes, les zones entières

La plaque du sorcier reprend la pastille du PC — avatar à gauche, nom au
milieu, vie à droite — à l'échelle du téléphone, avec trois retouches :

- **le nom tient sur deux lignes** (« LE » / « SORCIER ») au lieu d'être coupé
  en « LE SOR… » : la colonne du nom ne fait que 31 px sur un 568 × 320, la
  place laissée par la goutte de vie. L'avatar descend à 0,48 carte et la
  goutte à 0,62 pour lui rendre de la largeur ;
- **les zones (Main · Paquet · Cimetière) passent à la ligne entre deux
  compteurs** au lieu d'être tronquées à l'ellipse : chaque compteur est une
  unité insécable (« Main · 3 » ne se coupe jamais), le point de séparation du
  PC s'efface et l'écart suffit. Deux lignes de zones tiennent dans la plaque,
  et la jauge de mana se resserre derrière elle ;
- **la vie garde la goutte de sang**, élargie si la réserve s'affiche
  (« 25/34 ») : `min-width` de 0,62 carte, hauteur identique, chiffre à 0,32
  carte, maximum en exposant dans la goutte.

## Le menu hamburger du duel

Au doigt, la barre de navigation du duel ne montre que le **bouton hamburger** — et l'éventuel bandeau de mode — ; ses sept commandes (Menu, Deck, Catalogue, Messagerie, son, 3D, plein écran) se déplient dans un panneau sous la barre (`rpg-mobile.css`). Le panneau n'est visible que sur `.rpg-duel-nav__menu.is-open` : `RpgDuelPage.jsx` pose cette classe quand `navMenuOuvert` est vrai, en même temps que `aria-expanded` et l'icône ✕. Sans elle, le hamburger changeait d'icône mais **aucun mode n'apparaissait** — Menu, Deck et Catalogue restaient inatteignables. Un toucher hors de la barre, Échap ou le ✕ referment le panneau ; choisir un mode referme le panneau et ouvre son écran. À la souris, `display: contents` garde les sept commandes déroulées en ligne et le bouton reste masqué.

Le panneau est **fixé au viewport** (`position: fixed`, 50 px sous le bord haut avec `env(safe-area-inset-top)`, calé à droite avec `env(safe-area-inset-right)`, `z-index: 60` dans le contexte de la barre). Posé en `absolute` dans la barre, il héritait du rognage de la table (`overflow: auto` sur `.card-table`) et de la hauteur de la barre : sur certaines WebViews, il changeait d'état sans jamais être peint. Il porte un fond quasi opaque, **sans `backdrop-filter`** (certaines WebViews ne peignent pas un panneau filtré au-dessus d'un plateau animé), et un `max-height` défilant pour rester entier sur un 568 × 320. Le bouton hamburger porte `touch-action: manipulation`.

## La messagerie vit dans le jeu

La messagerie du site — la fenêtre « Let's Talk » posée en bas de l'écran — **n'apparaît pas dans le Sablier sur téléphone** : le jeu est une couche plein écran (`z-index: 1500`) qui la recouvre, et le plein écran natif de l'APK la relègue carrément derrière. La messagerie est pourtant le canal des défis du duel en ligne : elle a donc sa place **dans** le jeu, et une seule.

- **au menu**, un onglet « Messagerie » dans la barre des modes — le huitième, après `Paramètres` — ouvre le panneau de `RpgMessageriePanel.jsx` (`variante="ecran"`), listes et fil compris (`InboxView` / `ThreadView` de `MessagesTabs.jsx`, les mêmes que la page `/messages`) ;
- **en pleine partie**, l'entrée `Messagerie` du panneau hamburger (et le bouton de la barre du salon en ligne) ouvre le même panneau en **voile au-dessus de la table** (`variante="volet"`, `position: absolute`, `z-index: 3100` — au-dessus du HUD et des effets) : le duel reste monté derrière, la partie reprend à la fermeture (bouton « Fermer » ou Échap) ;
- la pastille jaune compte ce qui attend — messages non lus d'abord, demandes d'amis sinon, le détail dans l'`aria-label` ; sans compte, le panneau montre l'invitation à se connecter ;
- **le lanceur flottant du site disparaît de ces routes au téléphone** (`dockVisible` de `SocialDock.jsx`) : il n'aurait fait que mener hors de la partie en ouvrant `/messages`. Sur ordinateur, il reste, au-dessus du jeu (`social-dock--sablier`), avec l'onglet « Demandes » d'amis que le panneau du jeu n'a pas.

**L'onglet se voit à toutes les largeurs.** La barre des modes a été dessinée pour six onglets ; le huitième disparaissait dès qu'il ne tenait plus sur la même ligne — peint hors de l'écran, sans barre de défilement visible, donc incliquable (paysage du téléphone 701 – 1100 px), et réduit à une bulle anonyme sans son mot au-dessous de 560 px. Deux règles le rattrapent : à 701 – 1100 px la barre **passe à la ligne** (`flex-wrap: wrap`) au lieu de défiler, et au-dessous de 560 px l'onglet garde le mot « Messagerie », en tout petit. Un onglet qu'on ne peut pas voir est un onglet qui n'existe pas.

Vérification : `npm run check:rpg-messagerie` (onglet, voile, couches, relecture des routes du Sablier, libellé jamais perdu), `npm run check:rpg-duel-nav` (le hamburger ouvre le voile, la table reste montée) et `npm run check:rpg-accueil` (les huit onglets sur deux rangées à 700 px, et la barre qui passe à la ligne de 701 à 1100 px).

## Plein écran et orientation

Le plein écran appartient à la **page**, pas au duel : `RpgDuelPage.jsx` branche le moteur partagé des jeux d’arcade (`gameFullscreen.js` / `useGameFullscreen.js`) sur la coque `.rpg-battle`, qui est déjà une couche fixe couvrant tout le viewport. À l’ouverture, rien n’est demandé : la page reste dans la page, et le bouton du menu, le bouton de la barre du duel ou la touche F basculent le plein écran sur demande explicite. **Au doigt** (téléphone, tablette, application : `pointer: coarse` ou pont `LetsPlayAndroid`), **lancer une partie demande le plein écran natif dans le geste du clic** — c’est la seule condition sous laquelle un navigateur mobile accepte ensuite de tourner l’écran —, puis la session de paysage verrouille l’orientation. Sur ordinateur, aucun plein écran automatique : l’orientation n’est jamais verrouillée. Voir « Le Sablier : le plein écran » dans le `README.md`.

`rpgLandscape.js` ne possède pas le plein écran (`enter({ fullscreen: false })`) : il **attend** celui de la page — `screen.orientation.lock('landscape')` est refusé tant que le document n’y est pas — puis verrouille le paysage quand le navigateur l’autorise. Le plein écran peut arriver **après** cette attente (navigateur lent, geste suivant) : tant que le duel est ouvert, un écouteur de rattrapage rejoue le verrou à chaque `fullscreenchange` — la partie finit en paysage dès que le plein écran est là, sans deuxième clic. Une seule tentative de verrou à la fois ; le paysage pris, l’écouteur se retire. Un seul propriétaire du plein écran : le retour au menu ne referme plus l’écran demandé. Si l’appareil reste en portrait, un écran de rotation empêche d’interagir avec le duel derrière lui. Aucun artifice CSS ne tourne les coordonnées du plateau.

Safari, certaines WebViews et les aperçus embarqués peuvent refuser les API de plein écran/rotation. La couche fixe couvre quand même tout le viewport, et l’utilisateur tourne physiquement son appareil. Le bouton « Activer le paysage » permet de réessayer : il repasse par le même chemin (plein écran natif dans le geste, puis verrou, puis rattrapage) ; « Retour au menu » reste accessible.

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
npm run check:rpg-duel-nav
npm run check:rpg-ui
npm run build
```

- Tests purs : moteur, audio, gestes (glisser-déposer **et appui long** : `tests/rpg-long-press.test.js`), piles de terrains (paiement, production individuelle, dégagement, restauration), piles de cartes homonymes (`tests/rpg-card-stacks.test.js` : ordre, index réels, carte de tête, camps séparés) et cycle de vie de l’orientation — y compris les refus, les promesses tardives, l’attente du plein écran de la page avant le verrou de paysage et le rattrapage du verrou quand le plein écran arrive après l’attente.
- Tests React/jsdom : le menu hamburger du duel (`npm run check:rpg-duel-nav` : fermé au départ, ouvert sur `is-open` après l’appui, panneau fixé au viewport, sans `backdrop-filter`, défilement vertical, sept commandes, fermeture hors barre et ouverture du mode Deck), bandeau d’ouverture de tour (`npm run check:rpg-turn-banner` : « Votre tour » au joueur, « Tour de l’adversaire » au sorcier, 1,5 s chronométrée, muet pendant le mulligan et sur un duel terminé, toujours éteint après un aller-retour par le menu), clic-jeu direct, confirmation des magies, mana insuffisant, limite de terrain, annulation, sélection d’attaque, annulation, confirmation, interdiction d’attaquer deux fois, terrain engagé, aperçu par appui long (catalogue, main, créature en jeu, et le créateur de deck : bibliothèque, bouton « + », ligne du deck en cours, bouton « − ») qui ne joue rien et n’ajoute ni ne retire aucune carte, et — dans `scripts/rpg-stacks-smoke.jsx` — les piles homonymes des deux camps : compteur ×N, tête de pile, dépliage au toucher et automatique, blocage assigné depuis une pile repliée, pioche qui remplit la pile sans l’élargir. `scripts/rpg-battle-ui-check.mjs` vérifie la **petite carte d'arme** dans l'aperçu, la ligne bleue d'effet, l'absence de bonus et de texte d'arme sur la face jouée, et les **losanges chiffrés sous la couleur des monos ou sous le coût des hybrides** (Heures et sable, lisibles même au doigt sur une carte étroite) — le losange ⛓ de la cale, lui, reste sous les couleurs sur une hybride (`scripts/rpg-cale-check.mjs`). `scripts/rpg-stacks-smoke.jsx` vérifie aussi leur mise à jour et leur disparition à zéro. `npm run check:rpg-hybrid-cost` vérifie les moitiés de couleur communes aux coûts et sceaux, ainsi que les médaillons de la bibliothèque et du deck dans l’atelier ; le guide montre Vent rouge avec le même disque et le même sceau (`check:rpg-tutorial-ui`). `scripts/rpg-fullscreen-smoke.jsx` joue de son côté le plein écran de la page réelle : ouverture dans la page sans aucune demande au montage, bouton du menu qui demande le natif sur la coque (et le referme), geste ordinaire et lancement à la souris qui ne demandent rien, et — pointeur grossier installé (téléphone, tablette, application) — lancement du duel qui demande le natif dans le geste sur le même nœud d’un écran à l’autre, le démontage refermant le tout.
- Tests Chromium : repli portrait, plateaux 568×320, 667×375, 844×390 et 1024×768 sans recouvrement des zones, **proportions du PC** (carte de la main à 15,55 % de la hauteur, navigation à 0,62 carte, main à 1,38 carte, plaques et jauges dans la colonne de gauche, champs de même hauteur qui se rejoignent au milieu), cases des cinq emplacements sous chaque carte posée (1, 3 et 5 cartes), **commandes du tour empilées sur la largeur du rail, 44 px de haut, atteintes au centre** (`elementFromPoint`) à 844 × 390 et 568 × 320, barre de combat au-dessus de la main et rail ancré dessus ; actions directes au toucher ; retour au menu. La main y est mesurée carte par carte — **aucun recouvrement**, chaque carte visible répondant au doigt en son centre, largeur ≥ 34 px, première carte atteignable — puis remplie de huit cartes factices dont chacune est touchée après avoir été amenée dans le champ : 8/8. La main de départ compte trois cartes (`RPG_MANA_ESSAI_MAIN_DEPART`) : le mulligan en présente trois, 4:5, entières et touchables. Le parcours des piles de terrains n’est plus proposé par l’interface ; le check le rejoue seulement si une main en contient. Le voile n’existe plus : `check:rpg-ui` interdit `--rpg-plateau-voile`, `.card-table::before` et les vignettes par plateau, et exige les capsules qui les remplacent.

Variables facultatives : `RPG_URL`, `CHROMIUM_EXECUTABLE_PATH` et `RPG_SCREENSHOT` (capture du plateau).

La compilation web et les tests de navigateur ne valident pas l’APK natif. Vérifier aussi sur Android/iOS réels, en particulier les encoches, barres système, verrouillages d’orientation et retours vers le menu.

Les cartes posées n’impriment plus leur type sur l’illustration ; celui-ci reste disponible dans l’aperçu au survol et le libellé accessible. Les cartes en main ne sont pas modifiées.
