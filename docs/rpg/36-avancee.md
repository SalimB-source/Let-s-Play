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

## Le placement : le joueur choisit, la ligne propose

La ligne que la carte impose (`ligneObligee`) n'est plus une contrainte de pose.
Le joueur place ses créatures **où il veut dans son camp** : une archère peut
tenir le front, un corps à corps reculer au fond. `caseChoisissable` dit la
règle : toute case du camp est ouverte — sauf pour une carte avec **Envol**, qui
garde la ligne de sa fiche.

La ligne imposée ne disparaît pas pour autant :

- elle reste la **case par défaut** quand personne ne choisit (IA, jeton,
  glisser-déposer sur la table, `caseParDefaut`) ;
- quand elle est pleine, la créature prend la première place libre du camp au
  lieu d'être refusée ;
- la règle de protection du front se lit sur les **positions réelles**, jamais
  sur la fiche : dix cases ouvertes, le front protège toujours le fond.

Une créature posée hors de la ligne de sa carte porte `caseChoisie` : sa case
lui appartient, et `rpgEmplacementsChamp` ne la rapatrie plus.

**Le sacrifice suit la victime.** L'invocation payée d'un sacrifice entre sur la
case que la victime occupait — y compris si elle avait franchi la trouée, auquel
cas la nouvelle créature naît chez le sorcier (`campPose`, `avancee`). La victime
est lue par `positionDe`, pas par sa place dans la rangée de son camp.

## Le corps qui bloque

Une case tenue n'est jamais une destination : on ne se pose pas sur une
créature, ni sur celle d'en face, ni sur un envahisseur qui a percé avant nous
(`casesOccupees` lit les deux camps). La case d'arrivée mise à part,
`rpgCheminLibre` juge le **chemin** : toute case strictement intermédiaire doit
être vide, faute de quoi la créature s'arrête au lieu de glisser à travers.
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

## Ce que l'écran montre

- **Choisir une créature ouvre la phase d'attaque** : les proies légales
  s'allument en cyan (inchangé), et les **cases où elle peut marcher** deviennent
  des boutons **en pointillés, avec une flèche** (`.rpg-creature-slot--deplacement`).
  Le doré reste au placement : deux invitations différentes, deux signaux
  différents.
- **Cliquer une case avance la créature** (`rpgDeplacerCreature`) ; la phase
  reste ouverte et se recalcule — elle frappe de sa nouvelle place, ou le joueur
  referme.
- **Une créature qui a percé se dessine dans la rangée qu'elle occupe**, du côté
  du sorcier comme du nôtre, avec son propre camp : le clic la traite toujours
  comme la nôtre. Les piles d'envahisseurs restent d'un seul exemplaire — deux
  cartes identiques de deux camps ne se confondent jamais.
- **Le survol** suit les mêmes portées (doc 30) ; il n'a pas eu à changer.

Les repères de case vide (`::before`/`::after`) sont explicitement exclus des
cases d'avancée : une case qui propose un pas ne dessine pas une croix.

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
| `tests/rpg-sacrifice-emplacement.test.js` | 4 (case de la victime, camp adverse compris) |
| `tests/rpg-mouvement-blocage.test.js` | 4 (case tenue, envahisseur, chemin, refus du pas) |
| `tests/rpg-avancee-scenario.test.js` | 4 (traversée en deux tours puis frappe, tireur au sorcier, trouée fermée, pas de franchissement diagonal) |
| `tests/rpg-avancee-ui.test.js` | 7 (page, styles, IA câblée, propriétaire d'une carte) |
| `tests/rpg-portees.test.js` | 9 |
| `tests/rpg-lignes-duel.test.js` | 14 (case choisie respectée, Envol, dix places) |
| `tests/rpg-sorcier-objectif.test.js` | 9 |
| `npm run check:rpg-avancee` | 58 / 0 + la page montée dans jsdom (`scripts/rpg-avancee-ui-check.mjs`) |
| `npm run check:rpg-lignes` | 33 / 0 |
| `npm run check:rpg-classique-individuel` | 64 / 0 |

Les suites déjà rouges à la base (`rpg-moba-*`, `check:rpg-defenseurs`,
`check:rpg-pvp`, `rpg-mana-essai`, `rpg-classique-ia-*`) le restent, au même
chiffre : ce palier ne les touche pas.
