# 38 — La main autour du médaillon du joueur

> **En une phrase.** Sur un écran large à la souris, la main s'ouvre en deux
> autour du portrait du joueur ; une main **impaire** glissait d'une demi-carte
> et le portrait finissait sous une carte. Une **carte fantôme** invisible
> rétablit l'équilibre sans rétrécir les cartes.

## La demande

> *« Quand j'ai un nombre de cartes impair en main (3, 5), une des cartes cache
> une partie de l'avatar de mon personnage. »*

Le défaut ne se voyait qu'aux nombres **impairs** — la moitié de la main,
autrement dit très souvent.

## Ce qui se passait

Sur un écran large, la main ne se contente pas de s'aligner au centre : elle
s'ouvre en deux pour laisser passer le médaillon du joueur, posé sur l'axe de
la table, sous son champ (`rpg-avatars-plateau.css`, règle 6). Une **cale**
(`.rpg-hand__ecart`, posée par la page à l'indice `coupeMain`) réserve la
largeur du portrait entre les deux moitiés.

Or une cale en flux tombe au milieu du **contenu** de la main, pas au milieu de
l'écran. Avec un nombre pair de cartes, les deux moitiés ont la même largeur :
la cale est exactement au centre, sous le portrait. Avec un nombre impair, une
moitié compte une carte de plus, et la cale glisse de **la moitié d'une carte**
(≈ 35 px à 45 px) vers le côté le plus chargé. Le portrait, lui, ne bouge pas :
il est ancré sur l'axe. Une carte venait donc mourir sur son visage.

Aucune marge ne pouvait corriger cela : une marge déplace la cale *et* le
centre du contenu de la même quantité, leur écart reste identique. Seules deux
issues existent — **déplacer le portrait** (il entraîne alors la jauge de mana
et l'Ascension, alignés sur le même axe, et il danse d'une demi-carte à chaque
carte jouée) ou **équilibrer les deux moitiés**.

## Ce qui a été fait

Une **carte fantôme** (`.rpg-hand__cale-fantome`) ouvre la main quand la main
est impaire :

- la page ajoute la classe `.is-main-impaire` sur la main et pose la fantôme en
  premier enfant, avant la première carte (`RpgDuelPage.jsx`) ;
- la fantôme a **exactement la largeur d'une carte** — même `flex: 0 1
  clamp(64px, 7.2vw, 108px)` —, donc elle se resserre comme elles quand la main
  est chargée ; elle est `visibility: hidden`, sans `pointer-events` et hors de
  l'arbre d'accessibilité ;
- la main s'élargit d'une **place** (`--rpg-main-slot` = une carte + une
  gouttière) pour l'accueillir : les cartes ne rétrécissent pas, elles
  profitent même du resserrement réparti sur une part de plus ;
- la coupe tombe désormais au plus bas (`Math.floor(n / 2)`), pour que la
  fantôme complète toujours la **gauche** et que la règle reste simple.

Rien ne change au doigt : la fantôme n'existe que dans le rail de la souris
(`@media (min-width: 900px) and (hover: hover) and (pointer: fine)`), et la main
tactile, qui défile, garde ses cartes seules.

## Vérifier

```sh
npm run check:rpg-main-cale   # tests d'arithmétique + la vraie page en jsdom
```

- `tests/rpg-main-impaire.test.js` rejoue la géométrie sans navigateur : la cale
  tombe sur l'axe pour 0 à 12 cartes, et **une demi-carte à côté** sans la
  fantôme (c'est le défaut, figé comme témoin) ; les cartes ne rétrécissent pas
  sur quatre tailles d'écran.
- `scripts/rpg-main-cale-check.mjs` monte la page : à 1, 3, 5 et 7 cartes la
  fantôme est là, les deux moitiés comptent le même nombre d'enfants et la cale
  tombe au milieu ; à 2, 4 et 6 cartes il n'y a ni fantôme ni classe.
