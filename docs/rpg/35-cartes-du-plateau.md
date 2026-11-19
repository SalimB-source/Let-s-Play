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
| `is-attacked` | la créature a frappé ce tour — **aucun signe visuel** : elle garde ses couleurs et son assise (voir plus bas) |
| `is-sacrifice-target`, `is-ascension-*` | victime d'invocation, Ascension |
| `is-lien-actif`, `is-touch-drop-target`, `is-protege` | lien, dépôt tactile, protection |
| `fx-*` | une cinématique de combat est en cours |

## L'engagement ne se voit pas

Attaquer engage la créature jusqu'au tour suivant : elle ne peut plus bloquer,
être sacrifiée ni avancer. C'est une **règle**, pas une apparence — la carte ne
grise plus, ne s'incline plus, et son illustration mythique garde tout son
éclat. Seul l'assaut lui-même se voit : `is-declared-attacker` penche la carte
le temps de la déclaration, `fx-lunge` porte le bond et sa lueur rouge.

Deux exceptions à ne pas confondre avec l'engagement :

- `is-summoning-sick` (mal d'invocation) **garde** son portrait grisé : là, la
  créature ne peut pas attaquer, et son état doit se lire ;
- un terrain `is-tapped` reste grisé aussi — c'est le mana dépensé, pas la
  créature.

Le libellé accessible dit toujours l'état (« engagée, elle se dégagera au début
du prochain tour… ») : ce que l'œil ne voit plus, la voix le dit.

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
