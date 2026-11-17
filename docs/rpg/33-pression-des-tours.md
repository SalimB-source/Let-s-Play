# 33 — La pression des Tours : des gardiens durs à battre

**Statut : codé et jouable.** `src/games/rpgDifficulteTours.js` (règles pures),
appliqué une fois à la construction des tours dans `rpgStoryTours.js`, vérifié
par `tests/rpg-difficulte-tours.test.js`.

## 1. Le constat : le paquet ne fait plus la difficulté

Depuis que les paquets d'étage sont **retaillés dans les listes thématiques
communes** (`rpgDecksThematiques.js`), les nouvelles cartes sont bien dans les
tours — les sets du Corbeau, du Soleil rouge, des Ténèbres, les Ascensions, les
Vampires du croissant noir y entrent avec le reste du catalogue —, mais deux
conséquences sont apparues :

- **le joueur peut aligner exactement le même paquet** : mêmes trente cartes,
  mêmes deux exemplaires par carte, même identité de deux couleurs. Un étage
  n'a plus rien que le joueur n'ait pas ;
- **la rampe des anciennes recettes a disparu** : plus de `mythiquesMax`, plus
  de signature d'étage, plus de quota de rares. Le gardien joue la liste
  commune, comme un adversaire de duel libre.

Résultat : les tours se traversaient comme un duel libre. Le Sablier recréait
ses étages, mais pas leur **pression**.

## 2. La règle : la puissance devient un pacte

La puissance affichée sur la fiche d'étage (0 à 16) ne gonfle toujours pas les
PV par elle-même (`RPG_PV_SORCIER_PAR_PUISSANCE` reste à 0) : elle se traduit
désormais en deux leviers, calculés par `pressionEtage(puissance)`.

### Le pacte

| Puissance | PV de départ | Cartes en plus | Bouclier |
| --- | --- | --- | --- |
| 0 | — | — | — |
| 1 | +2 | — | — |
| 3 | +6 | — | 2 |
| 5 | +10 | — | 3 |
| 7 | +14 | +1 | 4 |
| 8 | +16 | +1 | 5 |
| 12 | +20 | +2 | 7 |
| 14 | +20 | +2 | 8 |
| 16 | +20 | +2 | 10 |

- **PV** : 2 par point de puissance, plafonnés à `RPG_ATOUTS_MAX.pv` (20).
- **Cartes en main** : une de plus dès la puissance 7, deux dès la 12 — le
  gardien ouvre plus large et pose plus vite.
- **Bouclier** : 0,6 par point de puissance (arrondi), plafonné à 10 : le
  bouclier du sorcier **absorbe les dégâts avant les PV** (`rpgInfligerSorcier`),
  il s'ajoute donc à la vie réelle du gardien.
- **Mana : aucun.** Les règles du Sablier sont **sans mana** (`rpgPeutPayer` ne
  regarde que le prix en PV). Un atout `mana` reste accepté dans les données —
  les fiches anciennes en portent un — mais il ne change rien au duel, donc la
  pression n'en accorde pas : un pacte affiché doit peser.

Le pacte se **cumule** avec celui qu'un étage déclare (le sommet de la Tour
Oubliée garde ses 12 PV écrits et reçoit la pression : 20 PV, 2 cartes,
bouclier 8). Il ne retire jamais un atout : `fusionnerAtouts` prend le maximum,
levier par levier.

### Le cerveau

La puissance impose aussi un **plancher d'IA** — un étage ne joue jamais plus
tendre que son rang :

| Puissance | Niveau plancher |
| --- | --- |
| 0 | Initiation (`recit`) |
| 1 → 4 | Gardien (`normale`) |
| 5 → 7 | Veilleur (`veilleur`) |
| 8 et plus | Sablier (`sablier`) |

Un étage peut toujours déclarer **plus fort** que son plancher (le Roi sans nom
garde `oubliee`) : `niveauLePlusFort` ne descend personne.

## 3. Ce que ça donne sur les onze tours

- **La Tour des Listes** garde son Initiation au premier palier — c'est l'école
  du jeu — puis passe Gardien, et son sommet Veilleur.
- **Les six tours du milieu** (Souk, Sables, Abysses, Corsaires, Fjord, Soleil
  rouge, Nécropole) montent de +4 à +14 PV, gagnent leur bouclier (2 à 4), et
  leurs sommets se jouent au moins contre un Veilleur.
- **La Tour du Corbeau** finit sur son Maître au niveau Sablier, +14 PV, une
  carte de plus et 4 de bouclier.
- **La Tour du Sablier renversé** est la plus dure du jeu : +16 à +20 PV, une
  à deux cartes de plus, un bouclier de 5 à 8, et le niveau Sablier du premier
  au dernier palier. Son sommet : **45 PV, 7 cartes en main, bouclier 8**.
- **La Tour Oubliée** ajoute sa pression à ses pactes écrits : son dernier
  étage arrive à **45 PV, 7 cartes, bouclier 10**, contre le seul niveau
  `oubliee` du jeu.

## 4. L'affichage : rien de caché

- La fiche d'étage et le panneau « Prochain défi » affichent le pacte en clair
  (`libellePacte`) : « Pacte : +14 PV · +1 carte · bouclier 4 ».
- La scène d'avant-duel annonce les **PV réels** du gardien
  (`rpgSorcierPv(puissance) + atouts.pv`), plus « 25 PV » quand la table en
  pose 45.
- Le niveau d'IA reste lisible sur la fiche d'étage (« Veilleur », « Sablier —
  maître absolu »).

## 5. Régler la difficulté

Tout est dans `rpgDifficulteTours.js` :

- `RPG_PRESSION_RAMPE.pvParPuissance` — la pente des PV (2 aujourd'hui) ;
- `RPG_PRESSION_RAMPE.mainDes` / `mainForteDes` / `bouclierDes` — les seuils des
  autres leviers, et `bouclierParPuissance` leur pente ;
- `RPG_PRESSION_PALIERS_IA` — les planchers d'IA par puissance.

Les bornes (`RPG_PRESSION_CAPS`) doivent rester identiques à `RPG_ATOUTS_MAX`
(`rpgDuel.js`) : un test le vérifie, sinon la fiche promettrait un pacte que le
moteur rognerait en silence.
