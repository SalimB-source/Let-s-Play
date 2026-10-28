# 22 — La Tour du Corbeau (le set Neige + Ténèbres)

**Statut : codé et jouable** dans la Conquête (les Tours de Bab El), entre la
Tour de la Nécropole et la Tour du Sablier renversé qui reste la tour
d'épreuves terminale.

## 1. Le parti pris : le Père des corbeaux se retourne

La Tour du Fjord finit sur le **Père des corbeaux** — la figure du Nord, la
neige, l'œil donné pour savoir. La Tour de la Nécropole finit sur la
**Dévoreuse** — les Ténèbres, la pesée, le prix. Les deux tours se répondent
depuis le début sans jamais se rencontrer : la neige d'un côté, la nuit de
l'autre.

La Tour du Corbeau les fait se rencontrer dans **un seul oiseau** :

> **Quand la neige entre dans la nuit, le Père des corbeaux devient le Maître
> des corbeaux.** Six cartes hybrides Neige + Ténèbres, quatre étages, et au
> sommet une figure qui réunit l'Envol et la Tenacité du Nord avec le Tribut
> et l'exil de la Balance des Heures.

La tour est une **tour libre** de la Conquête : elle n'ajoute ni acte ni scène
au récit « La Dernière Liste » (`rpgStoryScenes.js` reste à huit actes et 32
étages de campagne), mais elle hérite de tout l'appareil des tours — maquette
3D, peinture de repli, musique d'ambiance, plateau dédié, révélations de
cartes, et progression étage par étage.

## 2. Les quatre étages

| # | Gardien | Deck | Portée | Style IA | Puissance |
| --- | --- | --- | --- | --- | --- |
| 1 | La Vigie des neuf nuits | `corbeaux-du-givre` | `normale` | prudent | 4 |
| 2 | La Veilleuse au corbeau noir | `serment-des-neuf-nuits` | `veilleur` | controle | 5 |
| 3 | La Valkyrie des neuf nuits | `veille-du-corbeau` | `veilleur` | agressif | 6 |
| 4 | **Le Maître des corbeaux** | `maitre-des-corbeaux` | `sablier` | equilibre | 7 |

- Les quatre paquets sont **hybrides Neige + Ténèbres**, validés par
  `rpgValiderDeck`, et composés par leur recette (`RPG_RECETTES_HISTOIRE`) :
  aucun n'est écrit carte par carte.
- La rampe est celle des autres tours : les mythiques montent de 2 à 5 du
  premier étage au sommet ; le dernier gardien joue au niveau **`sablier`**,
  le plus fort du jeu, comme les sept maîtres de la Tour du Sablier renversé.
- Chaque gardien porte un portrait : trois cartes du set pour les étages 1 à
  3, et la nouvelle figure pour le sommet. Ce sont des peintures livrées,
  jamais des cartes provisoires.

## 3. Le set « Le Corbeau des neuf nuits »

Six cartes signature (`src/games/rpgCorbeau.js`), toutes **Neige +
Ténèbres** : elles demandent un pip de chaque couleur et portent le cadre
`hybride-neige-tenebres`.

| Carte | Coût | Type | Rareté | Ce qu'elle fait |
| --- | --- | --- | --- | --- |
| **Corbeau de givre** | 2 | Créature 1/2 | commune | Envol ; à l'arrivée, gèle une créature adverse **de coût 3 ou moins** |
| **Veilleuse au corbeau noir** | 3 | Créature 2/3 | inhabituelle | Rapidité ; Tribut 1 |
| **Berserk du crépuscule** | 4 | Créature 3/5 | rare | Provocation, Furie 2, Tribut 2 — il ouvre le combat, il encaisse, et chaque contact paie |
| **Valkyrie des neuf nuits** | 5 | Créature 3/4 | rare | Envol, Furie 2 ; à l'arrivée, exile une créature de coût 2 ou moins |
| **Neige noire** | 6 + 3 PV | Sorcellerie | rare | Détruit les créatures adverses de coût 3 ou moins ; gèle toutes les survivantes |
| **LE MAÎTRE DES CORBEAUX** | 7 | Héros 5/6 | mythique | Envol, Tenacité, Tribut 1 ; à l'arrivée, exile une créature de coût 4 ou moins |

Trois règles de direction tenues par les tests :

1. **Les deux vocabulaires se lisent sur les fiches.** La Neige apporte Envol,
   Furie, Provocation, Tenacité, le gel et la Rapidité ; les Ténèbres apportent
   le Tribut, l'exil et les **seuils de coût** — le froid et les corbeaux ne
   prennent que ce qui est assez petit pour eux. Aucune carte n'emprunte un
   mot-clé qu'elle ne pourrait pas expliquer.
2. **Pas de dégâts nus.** Comme dans La Balance des Heures, les pertes et
   gains de vie s'écrivent « perd / gagne des PV » (doc 05, §11).
3. **Jamais de divinité nommée.** Le set Neige appelle ses figures par leurs
   attributs ; le Maître des corbeaux reçoit le sien : *celui qui voit dans la
   nuit*.

## 4. Les révélations et la collection

Le set n'entre **pas** dans la dotation de départ : même ses communes se
découvrent étage par étage, comme celles des Lettres de Marque et de la
Balance des Heures.

| Étage | Cartes révélées |
| --- | --- |
| `corbeau-1` | Corbeau de givre |
| `corbeau-2` | Veilleuse au corbeau noir · Berserk du crépuscule |
| `corbeau-3` | Valkyrie des neuf nuits · Neige noire |
| `corbeau-4` | Le Maître des corbeaux |

Aucune carte n'est exclusive à un paquet : les six se jouent dans les quatre
decks de la tour et se révèlent en montant.

## 5. Autour de la tour

- **Maquette 3D** (`rpgStoryTowerModels.js`) : la clairière des neuf nuits —
  cercle de neuf pierres levées cerclées de plumes, tour de pierre sombre en
  trois paliers coiffés de neige, tronc noir et son nid de givre, deux
  corbeaux de garde, lanterne de fer au verre cassé, éclats de glace noire.
  Traits déclarés : `arbre-des-corbeaux`, `neige-noire`, `cercle-de-plumes`.
- **Peinture de repli** : `public/sablier-tours/tour-du-corbeau.jpg`
  (1536×1024, comme les neuf autres).
- **Plateau dédié** : **Le Cercle des corbeaux** (`cercle-des-corbeaux`,
  `public/plateau-cercle-des-corbeaux.jpg`, 4K 3:2), vu de dessus, le cercle
  de pierres vide au centre. Les quatre étages s'y battent ; sa vignette de
  profil est générée par `tools/make-profil-vignettes.mjs`.
- **Musique de duel** (`rpgPlateauMusic.js`) : le plateau joue
  `public/raspberrymusic - A Vikings.mp3` — une seule piste viking en boucle,
  pour les quatre étages et pour le plateau quand le profil le choisit. Le
  relais de conquête 60/40 s'applique comme aux autres plateaux : face à une
  table sans piste, c'est le Cercle qui fournit la musique.
- **Aucune ambiance de tour** : `rpgAmbientMusic.js` a été supprimé. Le Cercle
  des corbeaux porte seul le son de ses quatre étages — c'est la piste du
  plateau, et rien d'autre, qui joue pendant les duels.
- **Récompenses** : le barème commun des tours libres (50 ◈ par étage, 200 ◈
  pour la tour), aucune carte exclusive. L'enjeu est le set lui-même et le
  retournement de sa figure.

## 6. Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/games/rpgCorbeau.js` | les six fiches du set hybride |
| `src/games/rpgCards.js` | les intègre au catalogue (créatures, héros, magies) |
| `src/games/rpgDeckRecipes.js` | les quatre recettes `corbeaux-du-givre` … `maitre-des-corbeaux` |
| `src/games/rpgStoryTours.js` | les paquets de campagne et les quatre étages de la tour |
| `src/games/rpgCollection.js` | l'exclusion de la dotation et les quatre révélations |
| `src/games/rpgPlateaux.js` | Le Cercle des corbeaux et la correspondance des quatre decks |
| `src/games/rpgPlateauMusic.js` | la piste MP3 du Cercle des corbeaux |
| `src/games/rpgStoryTowerModels.js` | la maquette 3D et son thème |
| `public/raspberrymusic - A Vikings.mp3` | la piste viking du plateau |
| `src/games/rpgCardArt.js` | la révision de cache `corbeau-neuf-nuits-v1` et celles des deux faces de Furie |
| `public/cards/*.jpg` | les six peintures plein art 1024×1280, plus les deux faces de Furie `berserk-du-crepuscule-furie.jpg` et `valkyrie-des-neuf-nuits-furie.jpg` (révisions `corbeau-furie-crepuscule-v1` / `corbeau-furie-neuf-nuits-v1`) |
| `tests/rpg-corbeau.test.js` | le set, la tour, les révélations et les règles en jeu |

```bash
npm run check:rpg-corbeau      # le set, la tour, les révélations, la piste et les règles en jeu
npm run check:rpg-conquete-music # le branchement audio et le relais de conquête
npm run check:rpg              # toute la suite du Sablier (tours, decks, plateaux, sets)
npm run check:rpg-decks        # les recettes et « les meilleures d'abord »
npm run check:rpg-story-ui     # la galerie des tours et la page de chaque tour
```
