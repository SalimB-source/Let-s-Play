# 30 — Les portées

> État : **branché (palier 2).** Le moteur (`src/games/rpgPortees.js`) est
> utilisé par la liste des cibles, la revérification du clic, la frappe directe
> contre le sorcier et le survol. Les créatures **avancent** désormais — c'est ce
> qui rend la portée jouable : voir [`36-avancee.md`](36-avancee.md).

## La règle

| Créature | Portée | Peut frapper |
|---|---|---|
| Mêlée | 1 | les **huit cases** autour d'elle : devant, en diagonale, **derrière** |
| À distance (`distance`) | 2 | deux cases de grille, diagonale comprise |
| Attaque ciblée (`coupRapide`) | 2 | deux cases aussi — **plus d'infini** |

Une case occupée n'est pas une cible : on frappe une **créature**, pas une case.

Deux précisions qui ont coûté des tests :

- **`coupRapide` n'est pas une portée infinie.** Vingt-deux des quarante cartes
  `distance` portent aussi `coupRapide` (`faucon-du-zenith`,
  `dame-aux-ailes-d-or`…) : l'infini rendait la règle des lignes inapplicable
  et faisait passer les anciens tests « la ligne est franchie » par accident.
  L'infini appartient au passé.
- **La diagonale est toujours à une case.** L'ancienne règle « la diagonale
  seulement si la case d'en face est vide » n'a plus lieu d'être : elle décrivait
  une créature qui ne pouvait pas bouger. Depuis que la mêlée avance, elle
  choisit sa case — et frappe les huit qui l'entourent.

## L'échange de tirs

Frappée au corps à corps, une créature rend son coup : la mêlée est un duel
simultané. Un **tir** n'a pas de contact — l'Attaque ciblée n'en a jamais eu, et
une créature « À distance » frappe de loin sans qu'une mêlée puisse l'atteindre
en retour.

Une exception, décidée après une partie : **deux tireurs qui se visent se
répondent**. Quand une créature « À distance » en attaque une autre, la cible
riposte de sa propre volée, dans le même échange simultané que la mêlée.

Ce que l'exception **ne** rouvre pas : l'échange de tirs reste **sans contact**.
Ni capacités « au blocage », ni gel du porteur adverse, ni renvoi de Sphère
après les blessures — ces effets-là supposent des corps qui se touchent. Un
tireur n'y gagne donc qu'une chose : le droit de répondre.

Le gel se lit toujours dans la force : un tireur gelé riposte à zéro. Un tireur
face à un **corps à corps** garde son tir sans réponse — l'autre ne l'atteint
pas. L'Attaque ciblée, elle, n'en reçoit jamais, d'où qu'elle vienne.

## La géométrie

Quatre rangées absolues (`src/games/rpgChamp.js`), distance de **Tchebychev** :

```
rangée -1 : le sorcier adverse
rangée  0 : son fond      (cases locales 5-9)
rangée  1 : son front     (0-4)
rangée  2 : notre front   (0-4)
rangée  3 : notre fond    (5-9)
rangée  4 : notre sorcier

distance(A, B) = max(|Δrangée|, |Δcolonne|)
```

- front ↔ front : **1** · front ↔ fond : **2** · fond ↔ fond : **3**
- même rangée, deux colonnes plus loin : **2**

Une créature garde son camp d'origine (`cote`) et sa position réelle
(`emplacement` + `campPose`). `campPoseDe` dit sur quelle grille elle se tient ;
`campDeLaCreature` dit à qui elle appartient — les deux ne se confondent pas.

## Le sorcier comme objectif

`attaqueDirecteSurLesLignes` (dans `rpgLignes.js`) répond à « peut-on viser le
sorcier adverse **d'ici** ? ». La règle est désormais **la portée, et rien
d'autre** :

```js
if (!attaqueDirectePermise(attaquant, adversaires, atteignables)) return false;
if (!lignesActives(duel) || duel?.moba) return true;       // hors lignes : rien ne change
if (!Number.isInteger(attaquant?.emplacement)) return false; // sans case, aucune position : aucune portée
return sorcierAPortee(duel, cote, attaquant);              // distance au sorcier <= portée
```

Conséquences, toutes voulues :

- une **mêlée** doit **percer les deux lignes** (elle est alors sur le fond
  adverse, à une case du sorcier) ;
- une créature **à distance** le frappe depuis le **front adverse** (deux cases) ;
- depuis nos lignes (trois ou quatre cases), **personne** ne le touche — ni un
  tireur du fond, ni un Défenseur garé derrière ;
- l'ancienne exception « plus aucune créature adverse » a disparu : sans
  adversaire, il faut quand même arriver à portée. La victoire conclut
  toujours sur `duel.sorcier.pv <= 0` ;
- une créature **sans case** ne touche rien du tout — ni le sorcier, ni une
  créature adverse, même au contact. Ce n'est pas une tolérance : sans
  position, il n'y a rien à mesurer. La même règle vaut pour les créatures
  (`filtrePortee` rend une liste vide) et pour le sorcier (`sorcierAPortee`).

  Une invocation qui entrerait **sans case** est refusée, elle aussi : la garde
  d'invocation (`rpgJouerCreature`) lit la table réelle de `rpgRecul.js`
  (`rpgCasesPose`), envahisseurs compris, et refuse `champ-plein` **avant
  paiement** quand aucune case de la ligne de la carte ne peut s'ouvrir. `casesLibresPour` ne
  voyait que nos propres créatures : une case tenue par un Site adverse
  passait pour libre, la pose n'avait plus où aller et la créature arrivait
  sans case — donc capable de frapper de n'importe où.

La portée **remplace** la condition de percée : on ne regarde plus la ligne de
l'attaquant, seulement la distance. C'est la décision prise au palier 2.

## La portée des effets de créature

La portée d'attaque dit jusqu'où une créature **frappe au combat**. Elle ne
disait rien de son **effet d'arrivée** : l'Oni de la fournaise, la Tour de
braise ou le Corbeau de givre désignaient leur cible n'importe où sur la table.
C'est fini — une créature porte son effet aussi loin qu'elle, et la valeur est
écrite **sur la fiche**, une portée par carte (`rpgPorteesCartes.js`) :

| Portée | Cartes | Mesure |
|---|---|---|
| `1` — contact | les duels : Bakunawa, Cavalier amazigh du désert, Souverain de la lune noire | une case, diagonales comprises |
| `2` — tir | les tours de défense, la Völva soigneuse, l'Éclipse silencieuse, la Guetteuse des marées, les effets d'arrivée des archers | deux cases, même mesure |
| absente | les masses (zones, renvois, destructions) et tout ce qui ne désigne pas une créature en jeu | sans limite |

`porteeDeCarte` lit la table (ou `arrivee.porteeCases` sur la fiche) ; le
moteur confronte la cible désignée à la source **avant** de résoudre l'effet
(`cibleDeLEffetAPortee`, dans `appliquerEffet`). Une cible hors de portée n'est
pas atteinte : rien ne tombe, et le journal le dit en toutes lettres
(« … est hors de portée de … »). `ciblesDeLEffetAPortee` rend la même liste
pour l'écran et l'IA.

Deux tolérances voulues : un duel **sans lignes** n'a pas de géométrie, et une
distance nulle (`null`) ne refuse jamais une cible ; le MOBA, lui, mesure ses
voies, pas des cases — sa portée d'effet n'y est pas opposée.

## Le branchement

| Endroit | Ce qu'il fait |
|---|---|
| `rpgCiblesIndividuellesClassique` | `filtrePortee` remplace `filtreLigne` : les proies sont les créatures assez proches |
| `rpgDeclarerAttaqueIndividuelleClassique` | revérifie la même liste au moment du clic — pas de cible périmée |
| `rpgAttaquerSorcier` | passe `cote` à `attaqueDirecteSurLesLignes` |
| `casesAPortee` | la matière du survol (`rpg-survol-portee`) |
| `appliquerEffet` | `cibleDeLEffetAPortee` : l'effet d'arrivée ne dépasse pas la portée de sa carte |
| `rpgPorteesCartes.js` | la table des portées d'effet, une ligne par carte |

`filtrePortee` **conserve l'ordre reçu** et rend une liste vide hors des lignes
ou au MOBA : les modes historiques gardent leur comportement.

## Le survol

Survoler une des nôtres (souris, ou focus au clavier) allume d'un **anneau doré**
les proies que son attaque atteindrait vraiment. La page n'écrit aucune règle :
elle appelle `rpgCiblesIndividuellesClassique(duel, 'joueur', id)` — la fonction
du clic — et pose `is-a-portee` sur les cartes rendues.

Trois garde-fous : **nos créatures seulement**, **sur deux lignes seulement**,
**pas en PvP**, et **pas pendant la phase d'attaque** (le cyan y parle déjà).

Une créature sans proie atteignable mais qui garde la frappe directe allume la
**plaque du sorcier** (`is-ciblable`) : le survol annonce la décision.

Les couleurs restent trois signaux distincts : l'**or** invite (survol), le
**cyan** ouvre le ciblage (`is-ciblable`), le **rouge** désigne la proie déjà
choisie (`is-spell-target`). Au doigt, l'anneau n'existe pas : le premier appui
ouvre la phase d'attaque et les proies légales s'allument d'elles-mêmes — sauf
si la créature peut encore avancer, auquel cas la phase montre aussi ses cases
(voyez `36-avancee.md`).

## Vérifications

`node --test tests/rpg-tir-riposte.test.js` (6) · `tests/rpg-portees.test.js`
(9) · `tests/rpg-portees-effets.test.js` (8, une portée par carte : contact,
tir, cible hors d'atteinte) · `tests/rpg-lignes-duel.test.js` (13) ·
`tests/rpg-sorcier-objectif.test.js` (9) · `tests/rpg-mouvement.test.js` (12) ·
`tests/rpg-avancee-scenario.test.js` (4) · `npm run check:rpg-avancee` (90) ·
`npm run check:rpg-lignes` (34) · `npm run check:rpg-classique-individuel` (64).
