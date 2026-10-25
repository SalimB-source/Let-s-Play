# 21 — La Tour du Sablier renversé (tour d'épreuves terminale)

**Statut : codé et jouable** dans la Conquête (les Tours de Bab El), après la
Tour du Corbeau (dossier 22) — la dernière des neuf tours avant elle. La fiche
ci-dessous reste la référence de design.

## 1. Le parti pris : les maîtres revenus à leur sommet

Les neuf tours qui la précèdent enseignent le jeu couleur par couleur, avec une
rampe : les premiers étages ménagent leurs mythiques (`mythiquesMax`,
`raresMax` dans `rpgDeckRecipes.js`), l'IA monte de `recit` à `veilleur`, et
la puissance affichée plafonne à 7. Une fois ces tours déblayées, il ne
restait aucun mur à mesurer pour une collection complète.

La dixième tour renverse le principe — et le Sablier avec :

> **Quand le Sablier se renverse, les maîtres de Bab El reviennent à leur
> sommet.** Sept étages, sept types de duels différents, et à chaque palier
> le gardien joue **les meilleures cartes de son identité, sans aucun
> plafond**, avec le cerveau le plus fort du jeu.

La tour est une **tour d'épreuves de la Conquête** : elle n'ajoute ni acte ni
scène au récit « La Dernière Liste » (`rpgStoryScenes.js` reste à huit actes
et 32 étages de campagne), mais elle hérite de tout l'appareil des tours
libres — progression étage par étage, crédits au premier déblayage, butin de
la tour, maquette 3D, musique d'ambiance, peinture de repli.

## 2. Les sept étages : un type différent à chaque marche

| # | Gardien | Type du duel | Paquet | Style IA | Puissance |
| --- | --- | --- | --- | --- | --- |
| 1 | La Dame aux ailes d'or | **Sable** pur — muraille, soins, équipements | `veilleurs-absolus` | prudent | 8 |
| 2 | Kagutsuchi, la Flamme originelle | **Braise** pure — burn et Harakiri | `flamme-absolue` | agressif | 9 |
| 3 | Jörmungandr, le Serpent des marées | **Eau** pure — contresorts, renvois, bêtes du fond | `maree-absolue` | controle | 10 |
| 4 | La Dame des Neuf Mondes | **Neige** pure — gel, Furie, figures du Nord | `hiver-absolu` | equilibre | 11 |
| 5 | Le Passeur au masque de chacal | **Ténèbres** pures — Prix, Tribut, exil | `jugement-absolu` | controle | 12 |
| 6 | Le Chasseur d'Ocracoke | **Course Sable + Eau** — Abordage et prises | `course-absolue` | agressif | 13 |
| 7 | **Le Sablier** | **Tricolore Sable + Braise + Ténèbres** — toutes les réponses | `le-sablier` | equilibre | 14 |

« Différent type » est pris au pied de la lettre, et vérifié par
`tests/rpg-story.test.js` : sept paquets distincts, sept identités
chromatiques distinctes (les cinq couleurs pures, l'hybride de la Course,
puis le seul tricolore de la campagne) et les quatre styles tactiques sur la
montée.

### Le plateau de la tour — Le Sablier renversé

Contrairement aux autres tours, qui reçoivent chacune sur **un** terrain
attitré (`village-viking` pour le Fjord, `cercle-des-corbeaux` pour le
Corbeau…), la tour terminale n'empruntait jusqu'ici les terrains de ses
identités : Erg pour la Dame aux ailes d'or, Cour de l'Empereur pour
Kagutsuchi, etc. Elle a désormais **son propre plateau**, et ses sept étages
s'y battent tous :

- **Le Sablier renversé** (`sablier-renverse`, `public/plateau-sablier-renverse.jpg`,
  4K 3:2) — l'intérieur du grand sablier retourné, vu de dessus à 90° : le
  dallage circulaire d'albâtre et de sable poli, **nu au centre** pour y poser
  les cartes, bordé d'un anneau de laiton lisse où sont sertis des cabochons de
  verre coloré (crème, ambre, rouge, turquoise, glace, violet), et d'arcs
  d'orrery de laiton ouverts vers les bords ; sur les dalles, les éclats de
  verre et le sable d'or du sablier renversé ;
- trois sables — safran, braise, nuit — **remontent** du sol vers la taille de
  l'heure, en spirales près des bords : le sablier est retourné, et les trois
  couleurs du gardien du sommet traversent tous les étages ;
- même traitement que les autres terrains : couleur de repli dans
  `rpg-battle.css`, décor 3D (`rpgTableSceneThemes.js`), vignette de la carte
  de profil (`public/profil/plateaux/sablier-renverse.webp`), et aucune
  variante fantaisiste — `resoudrePlateauxDuDuel` n'y consomme aucun tirage.

Les deux moitiés de la table portent donc le même terrain d'un bout à l'autre
de la tour : la table reste d'un seul tenant, chez le Sablier.

Les six premiers gardiens portent le portrait de leur figure mythique —
elle joue dans leur paquet. Le Sablier, au sommet, n'a pas de visage
(`avatar: null`) : seulement du sable qui tombe.

## 3. « L'IA a les meilleures cartes » : les recettes absolues

Les sept recettes vivent dans `RPG_RECETTES_HISTOIRE`
(`rpgDeckRecipes.js`) et se distinguent par une absence : **ni
`mythiquesMax`, ni `raresMax`**. Le composeur (`rpgDeckComposer.js`) remplit
donc chaque paquet strictement par palier de rareté puis par puissance
(`rpgCardPower.js`) — toutes les mythiques de l'identité d'abord, chacune à
son maximum légal, puis les rares. La signature ne garde que l'ouverture
(les petits coûts qui tiennent les premiers tours : Tislit et le Fennec pour
le Sable, le Ghul et l'Ashigaru pour la Braise, les contres pour l'Eau…).

La densité obtenue, contre 0 à 5 mythiques dans les paquets de campagne
historiques :

| Paquet | Mythiques | Rares | Ouverture |
| --- | --- | --- | --- |
| `veilleurs-absolus` | 5 | 12 | Tislit ×2, Fennec ×2 |
| `flamme-absolue` | **13** (tout le vivier Braise) | 13 | Ghul ×2, Ashigaru ×2, Iaijutsu ×2, Sahir |
| `maree-absolue` | 6 | 12 | Ressac, Silence, Contresort ×2 |
| `hiver-absolu` | 6 (toutes les figures du Nord) | 20 | Eirik, Loups ×2, Boucliers ×2 |
| `jugement-absolu` | 6 | 9 | Chacal ×2, Ouvrier ×2, Papyrus ×2 |
| `course-absolue` | 13 | 9 | Mousse ×2, Raïs ×2, Cotre ×2, Lettre ×2 |
| `le-sablier` | **21 sur 30 cartes** | 5 | Tislit ×2, Trait de braise ×2, Sahir |

Les listes restent des decks **légaux** du format (30 cartes sans terrain,
1 à 3 couleurs, mythiques à un exemplaire — `rpgValiderDeck`), composées par
les mêmes recettes que le reste du catalogue : `tests/rpg-decks-puissance.test.js`
les couvre comme les autres (« chaque deck vaut la composition de sa
recette », « aucun regret »).

## 4. Le niveau d'IA `sablier`

La difficulté ne vient pas que des listes. `rpgAI.js` reçoit un quatrième
niveau, **au-dessus du Veilleur** :

| | `recit` | `normale` | `veilleur` | `sablier` |
| --- | --- | --- | --- | --- |
| Profondeur de recherche | 0 | 2 | 3 | **4** |
| Largeur (réponses explorées par pas) | 1 | 3 | 4 | **5** |
| Prescience (lignes létales, burn gardé) | non | non | oui | oui |
| Taux d'erreur | 40 % | 0 | 0 | 0 |
| Réflexion visible (base / plafond) | 480 / 1550 ms | 760 / 1550 ms | 1120 / 1550 ms | **1380 / 1900 ms** |

La recherche reste bornée (largeur fixe, simulations par les vraies règles
du moteur, aucune connaissance de la main adverse — `evaluerPositionIA` ne
lit que l'information publique). Mesure en partie réelle simulée : moins
d'une demi-seconde de calcul par partie entière sur la machine de
développement — en partie réelle, le mana (≤ 10 sources) élague presque
tout l'arbre avant la profondeur maximale.

## 5. Autour de la tour

- **Maquette 3D** (`rpgStoryTowerModels.js`) : la silhouette d'un sablier —
  large en bas, étranglée à la taille, renflée au-dessus — pierre améthyste
  unique, un anneau d'or incliné portant cinq gemmes (une par couleur) et
  le sablier géant du parvis. Traits déclarés : `sablier-geant`,
  `chambres-inversees`, `anneau-des-cinq-couleurs`.
- **Peinture de repli** : `public/sablier-tours/tour-du-sablier-renverse.jpg`
  (1536×1024, comme les huit autres) — chaque étage y brille de la couleur
  de son élément.
- **Musique** (`rpgAmbientMusic.js`) : « Le retournement du Sablier », 72 BPM —
  bourdon des deux chambres, tic-tac qui bascule toujours dans le même sens,
  grains de sable en souffle aigu, mélodie en miroir (deux mesures qui
  descendent, deux qui remontent).
- **Récompenses** : le barème commun des tours libres (crédits au premier
  déblayage et au rejeu, butin de la tour au sommet). Aucune carte n'est
  exclusive à la tour : son enjeu est le mur lui-même.
- **Progression** : le premier étage est ouvert d'emblée, comme celui de
  chaque tour libre — mais ses puissances (8 à 14, quand toutes les autres
  tours plafonnent à 7) disent clairement à qui elle s'adresse.

## 6. Équilibre constaté (simulation IA contre IA)

Parties complètes simulées par le moteur, joueur = Veilleur avec le deck de
départ des Veilleurs, 8 parties par étage :

| Adversaire | Victoires du sorcier |
| --- | --- |
| Boss historiques (les 7 sommets d'avant) | 33 / 56 (59 %) |
| **Tour du Sablier renversé (les 7 étages)** | **38 / 56 (68 %)** |
| dont l'Hiver absolu, le plus dur | 7 / 8 |
| dont la Marée absolue (contre 1/8 pour les Abysses) | 6 / 8 |

C'est la tour la plus difficile du jeu — et elle reste battable : les
paquets absolus sont lourds (beaucoup de cartes à 5 manas et plus), une
ouverture agressive peut passer avant que les figures ne descendent, et le
joueur humain amène sa collection, pas le deck de départ. Le mur est haut,
pas fermé.

## 7. Fichiers

- `src/games/rpgStoryTours.js` — la tour, ses sept étages, ses sept paquets.
- `src/games/rpgDeckRecipes.js` — les sept recettes « absolues » sans plafond.
- `src/games/rpgAI.js` — le niveau `sablier`.
- `src/games/rpgPlateaux.js` — le plateau de la tour (`sablier-renverse`),
  terrain attitré de ses sept étages.
- `public/plateau-sablier-renverse.jpg` — la peinture 4K du plateau (et sa
  vignette `public/profil/plateaux/sablier-renverse.webp`).
- `src/games/rpgTableSceneThemes.js` — l'éclairage 3D de la chambre de verre.
- `src/games/rpgStoryTowerModels.js` — la maquette 3D (et le grand mât qui
  porte la Tour des Corsaires à la hauteur des autres).
- `src/games/rpgAmbientMusic.js` — l'ambiance « Le retournement du Sablier ».
- `public/sablier-tours/tour-du-sablier-renverse.jpg` — la peinture de repli.
- Tests : `tests/rpg-story.test.js` (la tour, ses types, ses meilleures
  cartes), `tests/rpg-ia.test.js` (le niveau), `tests/rpg-story-3d.test.js`,
  `tests/rpg-ambient-music.test.js` ; couverture générique par
  `tests/rpg-decks-puissance.test.js`, `tests/rpg-plateaux.test.js`,
  `tests/rpg-credits.test.js` et `tests/rpg-boosters.test.js`.
