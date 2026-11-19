# 36 — L'avancée des créatures (palier 2)

> État : **livré.** Les créatures se déplacent et frappent ; l'IA du sorcier
> avance aussi. Moteur `src/games/rpgMouvement.js` + `src/games/rpgMouvementIA.js`,
> interface dans `RpgDuelPage.jsx`, styles dans `rpg-mana-essai.css`.

Jusqu'ici la table était un **tableau de cartes** : chaque créature naissait sur
une case, y frappait ce qu'elle pouvait, et y mourait. Les lignes avaient un
front et un fond, mais **personne ne les franchissait** — le fond adverse restait
une zone théorique, et la règle des portées (doc 30) n'avait aucune prise : une
mêlée sans case d'en face était simplement neutralisée.

Le palier 2 ouvre le champ : une créature **marche d'une case par tour**, puis
**frappe** de sa nouvelle place.

## Les règles

1. **Une case par tour.** `RPG_MOUVEMENT_CASES = 1`, huit directions (le
   voisinage complet : devant, diagonales, côtés, derrière). Une créature déjà
   déplacée porte `bouge` ; le drapeau est remis à `false` au début de chaque
   tour, en même temps que `ready` et `attaquee`.
2. **On ne traverse pas un corps.** Une case occupée — par n'importe qui, les
   deux camps confondus (`casesOccupees`) — n'est jamais une destination.
3. **Franchir la ligne neutre se fait par une trouée.** La case du front adverse
   visée doit être **vide**, et le passage est **droit devant**, dans la même
   colonne : jamais de glissement en diagonale entre deux corps. C'est la
   décision validée : « oui, mais seulement par une trouée ».
4. **Avancer et frapper, dans cet ordre.** Le déplacement ne consomme pas
   l'attaque. Une créature qui a marché peut frapper la même créature adverse
   qu'avant — c'est le sens du palier.
5. **Rien pour un Site**, une créature gelée (`gelToursRestants`), engagée
   (`attaquee`) ou déjà déplacée. Rien hors des lignes, rien au MOBA : les modes
   historiques gardent leur table figée.
5 bis. **Rien le tour de son arrivée.** Le mal d'invocation vaut pour le pas
   comme pour l'attaque : une créature posée pendant le tour de son camp attend
   le suivant pour avancer (`rpgSouffreMalInvocation`, levé par la Rapidité
   imprimée ou accordée). L'IA jouait autrement : elle posait un corps puis le
   faisait glisser d'une case dans le même tour, un avantage que le joueur
   n'avait pas lu sur sa carte.
5 ter. **Rien pour un Défenseur.** Il tient sa case, c'est son office : le
   Défenseur — imprimé ou accordé en cours de partie — ne se déplace jamais, il
   frappe de là où il est, et la trouée qu'il ferme ne s'ouvre pas de son fait.
6. **Aucune contrainte de ligne.** Le placement impose une ligne
   (`ligneObligee`) ; le mouvement non. Un tireur peut monter au front, un corps
   à corps reculer au fond — c'est un choix, pas une règle.

## Où l'on se tient

Une créature garde **deux** informations :

- `campPose` : la grille où elle se trouve (`'joueur'` ou `'sorcier'`) ;
- `emplacement` : sa case **dans cette grille** (0-4 front, 5-9 fond).

`campPoseDe(entite, cote)` rend le camp de pose, `campDeLaCreature(duel, entite)`
rend le **propriétaire**. Un envahisseur est donc une carte du joueur dont
`campPose` vaut `'sorcier'` : `envahisseurs(duel, camp)` les liste,
`occupantsDeCamp(duel, camp)` rend la rangée complète, triée par case.

`avancee` marque enfin une créature qui a quitté la case que sa carte lui
imposait : `rpgEmplacementsChamp` ne la rapatrie plus au fond.

## Le placement : on entre par l'arrière

Toute créature arrive **au fond** — le front ne se pose pas, il se gagne, une
case par tour. `RPG_LIGNE_POSE` porte cette règle, et trois fonctions la lisent :

- `caseAutorisee` / `caseChoisissable` : seules les cinq cases de l'arrière sont
  des cases d'arrivée ;
- `caseParDefaut` : la première libre de l'arrière, pour toutes les cartes ;
- `casesLibresPour` : les places libres de l'arrière — quand il est plein, la
  pose est refusée (`champ-plein`), même si le front est vide.

La ligne que la fiche décrit (`ligneObligee` : Défenseur et mêlée devant, tir
derrière) ne décide plus de rien : elle reste le repère de lecture d'une carte
qui n'a pas encore de case. Le joueur, lui, choisit seulement sa **colonne** :
un clic sur une case du front est ignoré, la pose se rabat sur l'arrière.

Une créature qui a avancé (`avancee`) garde la case qu'elle a gagnée ;
`rpgEmplacementsChamp` ne rapatrie que celles qui n'ont jamais quitté
l'arrière (sauvegarde reprise, réanimation).

**Le sacrifice suit la colonne de la victime.** L'invocation payée d'un
sacrifice entre elle aussi par l'arrière, sur la même colonne que la victime si
cette case est libre — jamais chez l'adversaire, même quand la victime y était
tombée : la mort d'un envahisseur ne fait pas naître un envahisseur.

## Le corps qui bloque

Une case tenue n'est jamais une destination : on ne se pose pas sur une
créature, ni sur celle d'en face, ni sur un envahisseur qui a percé avant nous
(`casesOccupees` lit les deux camps). La case d'arrivée mise à part,
`rpgCheminLibre` juge le **chemin** : toute case strictement intermédiaire doit
être vide, faute de quoi la créature s'arrête au lieu de glisser à travers. Une
créature avec **Envol** survole ces cases : le chemin ne la concerne pas — mais
elle ne se pose pas davantage sur un corps.
Aujourd'hui le pas vaut une case, donc la question ne se pose pas encore ; la
règle est écrite une fois, dans `rpgMouvement.js`, pour que la portée du pas
puisse grandir sans rouvrir le sujet.

## Qui entend l'Aura

Les quatre sources d'Aura (Tarek, Amani des ksour, Kenshi de la forge, Bou
Jeloud) parlent de **créatures adjacentes** : un voisinage, pas un camp. Tant
que les créatures ne bougeaient pas, « adjacente » se calculait sur l'ordre
d'arrivée — `casesRangee` rendait la suite des rangs et deux cartes étaient
voisines si leurs positions se suivaient. Dès qu'une créature avance, cet ordre
ne veut plus rien dire : une carte passée chez le sorcier restait « voisine » de
celles qu'elle avait laissées au fond, et une case vide ne coupait rien.

`voisines(duel, entite, cote)` lit désormais la **grille** (`positionsDuCamp`,
construite sur `positionDe`) :

1. même **camp de pose** — le camp adverse n'entend jamais notre Aura ;
2. même **rangée** — le fond ne renforce pas le front ;
3. **une colonne d'écart** — `|Δcolonne| === 1`, et rien d'autre.

Conséquences directes : un trou coupe le voisinage, deux sources voisines
cumulent, une créature qui a franchi la trouée n'est plus la voisine de ses
anciens compagnons, et la source ne se renforce jamais elle-même.

Restent **globales**, par choix et par texte de carte : la Malédiction, la
Bannière, la Résonance et les Lettres de marque. Le test
`tests/rpg-aura-adjacence.test.js` fige les deux familles.

## La case fantôme

Une créature qui a franchi la trouée n'est plus dans sa rangée — mais elle
reste dans `duel[cote].creatures`. `rpgEmplacementsChamp(camp, maximum, cote)`
la **laisse donc dehors** : sans le troisième paramètre, sa case locale passait
pour prise dans son propre camp. Deux symptômes, tous deux corrigés :

- une invocation légitime était refusée sur la case qu'elle semblait occuper ;
- la créature apparaissait deux fois — une fois chez elle, une fois chez
  l'adversaire.

Le paramètre est optionnel : les appels qui ne connaissent pas le camp gardent
l'ancien contrat (une rangée nue). Les rangées dessinées, elles, ne passent
plus par cette fonction : elles lisent `occupantsDeCamp(duel, camp)`, qui
mélange les deux propriétaires dans la rangée réelle.

## Le recul du bout du plateau

Une créature qui atteint le bout du plateau — la dernière rangée avant le
sorcier adverse — et qui **le frappe** ne s'y installe pas : elle est
**repoussée d'une case**, vers son propre camp (`rpgRecul.js`).

Le recul ne s'arrête pas au premier corps : si la case derrière la frappeuse est
tenue, la créature qui s'y trouve recule **aussi**, et ainsi de suite dans la
même colonne — la chaîne se déplie tant que la place est libre derrière. La
chaîne s'arrête au **blocage** : un bord du camp, un Site (il ne marche pas) ou
une case hors grille. Ceux qui sont devant le blocage ne bougent pas non plus —
leur case n'est pas libérée —, mais rien n'est cassé : la frappe a eu lieu.

- **Les deux camps** : symétrique. Une créature du sorcier qui frappe notre
  sorcier depuis notre fond recule vers son camp.
- **Seule la frappe du sorcier** déclenche le recul : une attaque bloquée par
  une créature, ou un tir qui n'atteint pas le sorcier, ne déplace personne.
- **Rien sans les lignes** : le champ d'origine n'a pas de bout du plateau, et
  le MOBA garde sa géométrie.
- **Aucun coût** : la créature a déjà frappé ; le recul ne consomme ni pas ni
  attaque, il ne fait que rendre la case du sorcier intenable.

C'est ce qui empêche un camp de camper avec cinq créatures sur la ligne arrière
adverse : chaque frappe sur le sorcier fait reculer l'assaillant d'un cran.

## L'invocation sous occupation

Une ligne arrière envahie ne ferme plus l'invocation. Quand un envahisseur tient
une case du fond d'un camp, ce camp peut invoquer comme si elle était libre :
**l'envahisseur de la colonne choisie est repoussé d'une case** — la même
mécanique de chaîne que le recul du bout du plateau (`rpgPousserEnvahisseur`,
`rpgCasesPose`, dans `rpgRecul.js`) — puis la créature s'installe normalement, à
l'arrière.

- **On choisit une colonne, pas un trou** : les cases tenues par un envahisseur
  poussable sont des cases d'arrivée comme les autres. À l'écran, cliquer
  l'envahisseur pendant le choix de la case le repousse et termine la pose.
- **La chaîne vaut aussi** : si la case derrière l'envahisseur est tenue, toute
  la file recule d'un cran, dans la même colonne.
- **Elle s'arrête au blocage** : bord du plateau, Site, case hors grille → la
  chaîne ne se déplie pas, la case reste tenue et l'invocation se rabat sur une
  autre colonne. Si aucune ne s'ouvre, c'est `champ-plein`.
- **Nos créatures ne se poussent pas** : une case tenue par une créature du camp
  reste prise — l'invocation ne déloge jamais les siens.
- **Symétrique** : le sorcier déloge nos envahisseurs de son fond de la même
  façon.
- **Rien sans les lignes** : le champ d'origine n'a qu'une rangée, donc pas
  d'envahisseur à pousser.

## Ce que l'écran montre

- **Choisir une créature ouvre sa manœuvre** : les proies légales s'allument en
  cyan, et les **cases où elle peut marcher** deviennent des boutons **en
  pointillés, avec une flèche** (`.rpg-creature-slot--deplacement`). Le doré
  reste au placement : deux invitations différentes, deux signaux différents.
- **Choisir n'est pas déclarer.** Tant qu'aucune cible n'est désignée, la carte
  ne prend ni lueur rouge ni inclinaison (`is-declared-attacker` attend la cible,
  en combat individuel) et l'invite propose les deux gestes :
  « cliquez une case libre pour avancer, ou une cible pour attaquer ». Une
  créature trop loin pour frapper ne réclame pas de cible : « cliquez une case
  libre pour avancer (aucune cible à portée) ».
- **Cliquer une case avance la créature** (`rpgDeplacerCreature`) et **referme
  la sélection** : le pas est un geste complet, rien ne reste en attente d'une
  cible. Frapper reste possible — le pas ne consomme pas l'attaque —, il suffit
  de recliquer la créature : elle ne peut plus marcher, donc l'invite passe à la
  cible. Une créature qui n'a ni pas devant elle ni proie à portée n'ouvre
  aucune phase (un son d'erreur, rien d'autre).
- **Une créature qui a percé se dessine dans la rangée qu'elle occupe**, du côté
  du sorcier comme du nôtre, avec son propre camp : le clic la traite toujours
  comme la nôtre. Les piles d'envahisseurs restent d'un seul exemplaire — deux
  cartes identiques de deux camps ne se confondent jamais.
- **Le survol** suit les mêmes portées (doc 30), et il montre aussi **où la
  créature peut marcher** : sans la choisir, ses cases de pas s'allument en bleu
  (`.rpg-creature-slot--survol-deplacement`) — un aperçu, pas un bouton. Le
  bleu se tait pour une créature qui a déjà consommé son pas, et pendant la
  phase d'attaque, où la sélection parle déjà en doré.

Les repères de case vide (`::before`/`::after`) sont explicitement exclus des
cases d'avancée : une case qui propose un pas ne dessine pas une croix.

## Le plateau à deux lignes sur un téléphone

Le duel se joue **en paysage** au doigt (le portrait n'affiche que l'invite à
tourner l'appareil). Deux bandes de camp, un bandeau d'avatar au-dessus, la main
en dessous : sur un écran de 390 px de haut, il ne reste que ~200 px pour les
deux champs. Une colonne de case ne peut donc pas se mesurer sur la carte seule
(`--essai-colonne`, 72 % d'une carte posée) : elle est **plafonnée par la
hauteur d'une bande** (`--rpg-board-band`, `rpg-avatars-plateau.css`), qui vaut
la plus petite de deux bornes — la moitié de la table moins le bandeau
d'avatar, et la moitié de ce que la table laisse une fois le bandeau et la main
payés.

Sans ce plafond, les deux rangées du joueur débordaient de leur bande : elles
passaient **par-dessus l'avatar** et poussaient la main à moitié hors de
l'écran. Les deux bandes gardent maintenant la hauteur de leurs deux rangées,
la main reste entière et l'avatar du joueur reste dégagé.

| Écran (paysage) | Colonne avant | Colonne après | Deux rangées | Place par camp |
|---|---|---|---|---|
| 568 × 320 | 36 px | 24 px | 72 px | 76 px |
| 667 × 375 | 44 px | 26 px | 78 px | 96 px |
| 844 × 390 | 46 px | 28 px | 82 px | 100 px |
| 926 × 428 | 50 px | 33 px | 94 px | 112 px |

Les cases sont plus petites qu'avant — c'est la place qui manquait, pas la
marge : dix cartes au ratio 4/5 ne tiennent pas autrement dans 200 px de haut.
`tests/rpg-plateau-mobile.test.js` rejoue cette arithmétique sur les six tailles
courantes plutôt que de la laisser au hasard d'un rendu.

## L'IA

`rpgIABougerCreatures(duel, 'sorcier')` est appelée au début de
`declarerAttaqueSorcier`. Trois lignes de règle, aucune simulation :

1. une créature qui a une proie à portée **ne bouge pas** — elle frappe d'où
   elle est ;
2. sinon, parmi ses cases légales, elle prend celle qui **réduit la distance à
   la proie la plus proche** (créature adverse, sinon le sorcier) ;
3. à distance égale, elle **reste** : s'immobiliser est plus sûr.

L'appel est idempotent : une créature déplacée porte `bouge`, elle ne repart pas
au tour suivant de la boucle d'attaque.

## Le tutoriel suit la règle

Depuis la portée, un sorcier ne se frappe **que de près**. Les leçons qui
enseignaient « champ adverse vide → on frappe le sorcier » ne tenaient plus :

- **Fondations du sablier** : le sorcier envoie un Chien de sable sur son front.
  Tislit, à distance 2, le tue — et la leçon explique justement que le sorcier,
  lui, est encore trop loin.
- **La Balance des Heures** et **Le Serment du Soleil rouge** : leur attaquant
  arrive **déjà percé** (`prepare: { percer: [...] }` le pose sur le fond
  adverse, `bouge` consommé, donc un seul clic déclare la frappe). La fiction
  est la même que la règle : il faut être passé.

`preparerEtapeTutoriel` accepte donc deux mises en scène nouvelles :
`prepare.immediat` (une proie posée pendant le tour du joueur) et
`prepare.percer` (une créature à nous, déjà chez l'adversaire). Les deux sont
idempotentes, comme le reste des scènes.

## Ce que le palier 2 ne fait pas

- Pas de **zone de contrôle** ni d'attaque d'opportunité : on peut passer devant
  un corps sans être frappé.
- Pas d'**Envol** particulier au mouvement : une créature qui vole marche comme
  les autres (elle survole, mais ne saute pas par-dessus un corps).
- Pas de **grille 6×3** : c'est le palier 3, toujours différé.
- Pas d'animation de pas : la carte change de case, le journal dit « avance en
  front du camp du sorcier, colonne 3 ».

## Vérifications

| Suite | Résultat |
|---|---|
| `tests/rpg-mouvement.test.js` | 12 |
| `tests/rpg-aura-adjacence.test.js` | 7 (voisinage de case, rangée, franchissement) |
| `tests/rpg-sacrifice-emplacement.test.js` | 4 (arrivée à l'arrière, colonne de la victime) |
| `tests/rpg-recul.test.js` | 9 (recul, chaîne, bord, Site, symétrie, frappe réelle) |
| `tests/rpg-invocation-poussee.test.js` | 6 (case envahie, chaîne, arrière plein, bord, allié, sans lignes) |
| `tests/rpg-mouvement-blocage.test.js` | 5 (case tenue, envahisseur, chemin, refus du pas, Envol) |
| `tests/rpg-avancee-scenario.test.js` | 4 (traversée en deux tours puis frappe, tireur au sorcier, trouée fermée, pas de franchissement diagonal) |
| `tests/rpg-avancee-ui.test.js` | 7 (page, styles, IA câblée, propriétaire d'une carte) |
| `tests/rpg-portees.test.js` | 9 |
| `tests/rpg-lignes-duel.test.js` | 14 (entrée par l'arrière, arrière plein, tir à deux cases) |
| `tests/rpg-plateau-mobile.test.js` | 4 (plafond de la colonne, mesure de la bande, six tailles d'écran, largeur des cinq cases) |
| `tests/rpg-sorcier-objectif.test.js` | 9 |
| `npm run check:rpg-avancee` | 84 / 0 + la page montée dans jsdom (`scripts/rpg-avancee-ui-check.mjs`) |
| `npm run check:rpg-lignes` | 33 / 0 |
| `npm run check:rpg-classique-individuel` | 64 / 0 |

Les suites déjà rouges à la base (`rpg-moba-*`, `check:rpg-defenseurs`,
`check:rpg-pvp`, `rpg-mana-essai`, `rpg-classique-ia-*`) le restent, au même
chiffre : ce palier ne les touche pas.
