# 35 — Les cartes du plateau : plates au repos, un contour au survol

Une créature **en jeu** n'est pas une carte qu'on tient. Elle est *posée* sur la
table : elle n'a donc plus de relief. C'est la seule idée de ce document.

## Le biseau s'en va

Le relief venait de l'ombre portée en deux couches de `.rpg-card`
(`0 12px 28px` + `0 2px 6px`) : sous chaque carte, ce double cran faisait le
« biseau » qui la décollait du plateau. Il part sur **toutes** les cartes des
rangées (`card-row--ennemi` et `card-row--equipe`), comme il était déjà parti
des Défenseurs, dont la silhouette doit rester nue au repos.

```
.rpg-battle .card-row .rpg-card:not(<états>) { box-shadow: none; }
```

Rien d'autre ne bouge : même géométrie, même illustration, mêmes pierres, mêmes
compteurs, mêmes cadres. La main, le mulligan, les aperçus, le catalogue et les
cartes annoncées gardent leur relief — ce sont des cartes qu'on lit ou qu'on
tient, pas des cartes posées. Le MOBA a son propre plateau et n'est pas
concerné.

### Aucun état ne perd son signal

Le repos devient plat ; **l'état garde son ombre**. Ce sont elles qui disent
qu'une carte se cible, se bloque, se sacrifie ou s'élève — la liste du `:not()`
est donc une liste d'exceptions à tenir à jour :

| Classe | Ce qu'elle dit |
| --- | --- |
| `is-pret` | la créature peut attaquer (liseré doré) |
| `is-mythique-creature` | le liseré d'une prête, en azur |
| `is-active`, `is-selected` | la carte est engagée par le joueur |
| `is-envol` | la volante, tenue en l'air (relief par `filter`) |
| `is-ciblable` | cible légale, cyan |
| `is-spell-target`, `is-coup-rapide-cible` | proie désignée, rouge épais |
| `is-a-portee` | proie atteignable par la créature survolée, or |
| `is-blocking`, `is-blocker-*` | déclaration de blocage |
| `is-declared-attacker` | assaut déclaré : la carte penche de 10° (`data-combat-tilted`) |
| `is-attacked` | la créature a frappé ce tour : **la face se grise** (voir plus bas) |
| `is-sacrifice-target`, `is-ascension-*` | victime d'invocation, Ascension |
| `is-lien-actif`, `is-touch-drop-target`, `is-protege` | lien, dépôt tactile, protection |
| `fx-*` | une cinématique de combat est en cours |

## L'engagement grise la carte

Attaquer engage la créature jusqu'au tour suivant : elle ne peut plus frapper,
bloquer, être sacrifiée ni avancer. La table le dit — la carte **entière** se
grise (`filter: grayscale(1) brightness(.72)`, `rpg-etats-cartes.css`), du même
gris que la carte tombée : ce qui est gris ne fera plus rien ce tour-ci.

L'engagement ne fait que cela : la carte ne s'incline pas (seul
`is-declared-attacker` penche, le temps de la déclaration) et son assise ne
bouge pas. `fx-lunge` porte le bond et sa lueur rouge, puis le gris prend le
relais.

Aucun clic n'est retiré : une créature engagée reste une cible de sort et
d'Attaque ciblée. Quand la table lui parle justement — `is-ciblable`,
`is-spell-target`, `is-coup-rapide-cible`, `is-selected`, `is-active` —, la
carte **se rallume** : le ciblage est l'information la plus fraîche, deux
signaux de sens contraires ne se disputent jamais la même carte.

Deux gris à ne pas confondre avec celui-là :

- `is-summoning-sick` (mal d'invocation) grise **l'illustration seule** : la
  créature peut encore bloquer, son état de lecture ne couvre pas la face ;
- un terrain `is-tapped` reste grisé aussi — c'est le mana dépensé, pas la
  créature.

Le MOBA suit la même règle sur ses créatures posées, malgré le bouton désactivé
de ses emplacements. Le libellé accessible dit toujours l'état (« engagée, elle
se dégagera au début du prochain tour… ») : le gris pour l'œil, la phrase pour
la voix.

## Le contour : or pour nous, rouge pour le sorcier

Le relief ne revient qu'au survol, et sous la forme la plus simple : un **contour
de 2 px**, sans halo, sans animation.

- **or** `#f0cd7f` sur notre rangée (`card-row--equipe`) ;
- **rouge** `#ff7b6f` sur celle du sorcier (`card-row--ennemi`).

On sait du premier coup d'œil à qui l'on a affaire. La teinte descend de la
rangée — `--rpg-contour-survol` est posée sur les cartes de chaque camp — et la
carte ne fait que la lire : aucun JSX n'a été touché, aucune prop n'a été
ajoutée.

Trois règles de priorité :

1. **désigner reste plus fort que survoler** : la proie désignée
   (`is-spell-target`, `is-coup-rapide-cible`) garde son contour de 4 px et son
   halo qui respire ; le rouge du survol est volontairement plus tendre ;
2. **un état plus fort ne reçoit pas de contour** : les cartes déjà marquées par
   un ciblage, une sélection ou une déclaration gardent leur couleur — elle a
   déjà quelque chose à dire ;
3. **le survol est une affaire de souris** : tout vit dans
   `@media (hover: hover) and (pointer: fine)`. Au doigt, les cartes restent
   plates et ce sont les états (ciblage, sélection) qui parlent.

## Vérifier

```sh
node --test tests/rpg-plateau-contour.test.js   # 6/0
node scripts/apercu-rail-avatars.mjs            # régénère l'aperçu hors navigateur
```

`docs/apercu-rail-avatars.html` porte les vraies feuilles de style : ouvert dans
un navigateur, il montre le plateau à plat et, au survol, les deux contours.
