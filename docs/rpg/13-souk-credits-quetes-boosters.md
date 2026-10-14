# 13 — Le Souk : crédits, quêtes du jour, boosters

> Le Sablier avait **une seule source de cartes** : la dotation de départ, puis
> les récompenses d'étage. Ce document ouvre la **deuxième** — un Souk où l'on
> dépense des **crédits** gagnés en jouant (quêtes du jour, victoires, premières
> d'un étage) pour ouvrir des **boosters** de cinq cartes — et, pour lui faire
> une place, **ferme la première** : les étages ne donnent plus de cartes, ils
> les *révèlent*, et c'est le Souk qui les vend (D9).
>
> Trois règles gouvernent le chantier : **rien ne se paie avec de l'argent
> réel**, **un booster ne court-circuite jamais le rythme des Tours** (pas d'Eau
> avant les citernes du Souk, pas de Neige avant les Abysses, pas une carte du
> Fjord avant d'y être entré), et **tout ce qui est gagné est monotone** : une
> collection, un acquis ou un solde ne redescendent jamais par accident — ni par
> synchronisation, ni par remontée d'horloge, ni par la migration du chapitre
> précédent.

---

## 1. La boucle visée

```
   duel (Histoire · Tours · partie libre)
              │
              ├──────────► victoire d'étage ──┐
              │                               ▼
              │                        crédits ◈ ──► BOOSTERS ──► cartes
   quêtes du jour ──(réclamation)──────────┘            │            │
        ▲                                               │            ▼
        └──────────────── événements du duel ◄──── doublons ◈    decks maison
```

Deux façons de jouer y mènent, et c'est voulu : le **campagnard** monte ses
vingt étages (1 000 ◈ de premières, ses cartes révélées au fil des marches),
le **quotidien** fait ses quêtes (jusqu'à 310 ◈ par jour) et achète au rythme
de deux paquets par jour. Dans les deux cas, le Souk ne vend rien que la ville
n'ait montré : l'étagère suit les marches, et **l'avance d'une marche** — la
carte du boss qu'on n'a pas encore affronté — est le seul luxe offert.

## 2. Ce qui existe déjà, et sur quoi on se branche

| Brique existante | Ce qu'elle fait | Ce que le Souk en fait |
| --- | --- | --- |
| `rpgCollection.js` | collection **dérivée** : dotation + étages + apports du compte | devient la carte des **révélations** ; les étages sortent de la collection, un **gel des acquis** les y reprend une fois, et les cartes du Souk deviennent la quatrième source |
| `rpgDeckBuilder.js` | casier local, `fusionnerEtatsSablier` (union monotone, pierres tombales) | la fusion prend aussi `bourse` et `quetes` |
| `useDecksSablier.js` | état local + synchronisation du compte, défensif hors provider | sert de patron à `useSablierBourse.js` |
| `rpgSablierRemote.js` | `state` jsonb dans `rpg_sablier_progress`, RLS stricte | **aucune nouvelle table, aucun SQL à écrire** |
| `RpgDuelPage.jsx` | menu à onglets (`jouer`, `histoire`, `tours`, `decks`, `catalogue`), boucle de duel, `enregistrerVictoire` | gagne un onglet **Souk**, un badge et un point d'émission d'événements |
| `rpgAudio.js`, `rpg-mobile.css`, plein écran | sons synthétisés, ergonomie tactile | l'ouverture du booster s'y adosse, sans nouvel asset |

## 3. Les décisions structurantes

### D1 — Une monnaie : les crédits, et un portefeuille prévu pour en accueillir d'autres

**Les crédits (◈)** sont l'argent du jeu. Le module de portefeuille est écrit
comme un objet `{ credits, sable }` dès maintenant, mais **seuls les crédits
sont ouverts** dans ce chantier : le lore d'`04-progression-da.md` réserve le
**sable** comme monnaie forte (place sur la Liste, forge, rachat de Nom), et
cette économie-là mérite son propre chantier, une fois le Souk en place.

- La ligne « les dinars servent au courant » de `04-progression-da.md` devient
  **« les crédits de la Chambre servent au courant »** — un seul vocabulaire.
- Le solde s'affiche partout avec le même glyphe : `◈ 1 240`.
- Aucune monnaie ne s'achète avec de l'argent réel, aucun coffret payant,
  jamais. C'est une règle du dossier, pas un réglage.

### D2 — Le Souk suit les marches que vous avez montées

**Ce qu'un paquet a le droit de contenir**, version finale — les étages ne
donnent plus de cartes, ils les **révèlent** (D9), et le vivier suit :

> **Une carte entre au vivier quand l'étage qui la révèle est vaincu, ou quand
> c'est la marche suivante** — l'étage précédent de sa tour est déjà conquis.

- **Le Souk ouvre à la première victoire.** Avant elle, aucun rayon n'est
  ouvert : l'étagère le dit, et la quête du comptoir n'est pas tirée.
- Gagner `listes-1` ouvre les cartes de `listes-1` **et** de `listes-2`.
  L'étagère grandit à chaque marche.
- **La dotation de départ ne compte pas** dans les couleurs ouvertes : ses 38
  communes couvrent les quatre couleurs et ouvriraient tout dès le premier
  duel. Elles remplissent les paquets, elles ne les ouvrent pas.
- Aucun paquet ne vend une carte du Fjord avant que le joueur soit **entré
  dans le Fjord** (la première marche d'une tour ne s'offre pas d'office).

Mesuré sur les données réelles : **Sable et Braise après `listes-1`**, **Eau
après `souk-1`** (les citernes du Souk), **Neige après `abysses-1`** (le fond
glacé). Une seule règle tient donc les seuils du dossier — celle-ci — sans
garde de couleur séparée : la couleur d'un rayon n'est ouverte que si une carte
de cette couleur est **entrée dans la ville**.

Ce que le rayon fait, concrètement : il vend **l'avance d'une marche**. Le
joueur bloqué devant `listes-5` peut acheter la carte de son boss avant de
l'affronter — c'est là toute la valeur du Souk. Et quand sa tour est terminée,
le rayon affiche **« complet »** : tout y est possédé, chaque carte paiera des
crédits.

### D3 — Un booster = cinq cartes, taux annoncés, jamais deux fois la même

| Emplacement | Tirage |
| --- | --- |
| Cartes 1 à 3 | 88 % commune · 12 % inhabituelle |
| Carte 4 | **rare garantie** |
| Carte 5 | 80 % rare · **20 % mythique** (30 % au grand étal) |

- Les cinq cartes d'un même paquet sont **distinctes** (tirage sans remise dans
  le vivier) : pas de « trois fois la même commune », jamais.
- **Garantie des nouvelles** : tant que le vivier contient trois cartes que le
  joueur ne possède pas, **trois** des cinq le sont. L'échange d'un doublon se
  fait **vers le haut** — jamais contre une carte plus commune — et si les
  seules cartes neuves qui restent sont plus rares que le doublon, **une seule**
  place est promue (mesuré : sans cette promotion, les 26 mythiques du set se
  ramassaient en ~400 paquets, soit six mois de quêtes ; avec elle, la
  collection se boucle en ~33 paquets).
- **Compteur de pitié** : huit ouvertures consécutives sans mythique ⇒ la
  cinquième carte est mythique. Il ne compte **que sur les rayons qui ont une
  mythique au vivier** — une promesse ne se compte pas là où elle est
  intenable — et il est **visible** (« prochaine mythique assurée dans N
  paquets »).
- Les taux sont **écrits** sur la fiche du rayon, **et la pitié se dit aussi**.
  Mesuré sur trente mille ouvertures semées : **23,8 %** de mythiques en moyenne
  sur un rayon thématique (20 % annoncés par paquet), **31,8 %** au grand étal
  (30 % annoncés), **jamais plus de sept paquets secs d'affilée**, et **trois
  nouvelles cartes par paquet** tant que le vivier en garde.
- Les taux sont des **cibles**, pas une garantie de résultat : ce sont les
  bornes ci-dessus (pitié, garantie des nouvelles) qui sont des promesses.

### D9 — Les étages ne donnent plus de cartes, ils les révèlent

Le changement de fond du chantier, décidé après avoir mesuré ce que l'ancien
système laissait comme place au Souk :

- **Avant** : la dotation (38 cartes) plus les vingt étages donnaient **les 99
  cartes du set** — 61 cartes offertes, dont les 26 mythiques aux boss. Un
  booster ne pouvait plus rien apprendre au joueur : dans le meilleur des cas il
  rendait une carte qu'un étage aurait donnée de toute façon, et le plus souvent
  un doublon remboursé.
- **Après** : `RPG_REVELATIONS_PAR_ETAGE` dit **où** une carte entre dans la
  ville, pas ce qu'un joueur reçoit. L'étage la révèle, le Souk la vend.

**Le gel des acquis (`figerAcquisitions`) est obligatoire, pas un confort.**
La collection était *dérivée* de la progression : rien n'était stocké. Retirer
la source des récompenses aurait donc effacé, au premier lancement de cette
version, tout ce que les joueurs avaient déjà gagné — et avec elle la jouabilité
de leurs decks maison (l'atelier ne propose que les cartes possédées). Le gel
reprend **une fois** les cartes que l'ancienne règle aurait données pour les
étages déjà vaincus, les range dans `letsplay_sablier_acquis_v1` et pose
`gel: true` : définitif, transmis avec le compte, et sans effet sur un joueur
neuf (il n'a rien à reprendre).

**Ce que le retrait change pour le joueur** :

| | Avant | Après |
| --- | --- | --- |
| Ce qu'un étage donne | 2 à 4 cartes | des **crédits** (+50 ◈ au premier déblayage) et un récit |
| Où l'on obtient une carte | en montant | au **Souk**, avec le produit des quêtes et des victoires |
| Ce que voit l'écran de fin d'étage | « CARTES RENDUES À VOTRE COLLECTION » | « CE QUE L'ÉTAGE RÉVÈLE — À PRENDRE AU SOUK » |
| Ce que dit l'atelier sur une carte verrouillée | « Vainquez « tel étage » » | « Le Souk la vendra après « tel étage » » |
| Les decks maison | 38 cartes puis les étages | la dotation, les acquis gelés, et **ce que l'on achète** |

**Le prix de ce choix, assumé** : la collection n'est plus infinie — elle se
boucle en **19 jours** de jeu quotidien (≈ 5 200 ◈, 33 paquets, mesuré sur trois
graines : 50 cartes à J6, 75 à J11, 90 à J17, 99 à J19). Au-delà, le Souk ne
vend plus que des doublons remboursés — c'est précisément pourquoi le **lot 6**
(un set dédié au Souk) devient la suite naturelle, et non un supplément.

### D4 — Le doublon n'est pas une punition

Une carte déjà possédée est **estampillée** à l'ouverture (« déjà possédée ») et
rend des crédits au barème :

| Rareté du doublon | Remboursement |
| --- | --- |
| Commune | 12 ◈ |
| Inhabituelle | 20 ◈ |
| Rare | 45 ◈ |
| Mythique | 120 ◈ |

Un paquet à trois doublons rend donc de quoi repartir dans la boucle. C'est le
seul mécanisme anti-frustration : on ne recycle pas en poussière, on recycle en
crédits, parce que **le crédit est la seule monnaie du chantier**.

### D5 — La quête du jour est tirée par graine, jamais au hasard

`quetesDuJour(jour, graineCompte)` : trois quêtes tirées d'un pool de douze par
un générateur **déterministe** (LCG semé par `hash(jour + graine)`, le même
patron que les autres jeux de la maison avec `rng` injectable). Deux appareils
du même compte voient **les mêmes trois quêtes** le même jour ; un joueur ne
peut pas « relancer le dé » en vidant le stockage.

La graine de compte est le `user.id` s'il existe, sinon un identifiant
d'appareil créé une fois (`letsplay_sablier_graine_v1`) — le jeu hors ligne
continue de fonctionner.

### D6 — Le jour ne recule jamais

La clé de jour est `AAAA-MM-JJ` locale, mais **monotone** :
`jourCourant = max(jour(horloge), dernierJourConnu)`. Remonter l'horloge ne
rend aucune quête ; avancer l'horloge en rend, comme partout — c'est un jeu
solo hors ligne, on l'assume et on l'écrit ici plutôt que de le cachait.

### D7 — On réclame, on ne reçoit pas en silence

Une quête terminée **attend** son bouton **« Réclamer »**. Le badge de l'onglet
Souk compte les réclamations en attente, la pastille du menu général aussi.
Terminer **les trois quêtes du jour** ouvre le **Cachet du cycle** : +80 ◈.

### D8 — Les gains sont lisibles et bornés

| Source | Gain |
| --- | --- |
| Premier déblayage d'un étage | **50 ◈** |
| Étage rejoué | **10 ◈** |
| Duel libre gagné | **8 ◈** |
| Duel perdu | 0 ◈ |
| Quête facile terminée | 55 ◈ |
| Quête moyenne terminée | 65 à 70 ◈ |
| Quête difficile terminée | 75 à 100 ◈ |
| **Cachet** du cycle (3 quêtes du jour) | **+80 ◈** |

Le **maximum théorique** d'une journée est donc **310 ◈** (quatre quêtes de 60,
70, 100 et la quête du comptoir à 60, plus le cachet). La **moyenne** tourne
autour de **250 à 280 ◈** — les quatre quêtes sorties du tirage peuvent valoir
moins, et une journée ratée ne se rattrape pas (D6). Le calibrage visé —
**≈ 2,3 paquets par jour** — et **5 200 ◈** pour les 33 paquets qui bouclent la
collection — tient dans cette fourchette. Les 19 jours de la simulation
(D9) incluent les crédits des étages, pas seulement les quêtes.

**Ce que la campagne entière rapporte** : 20 étages × 50 ◈ = **1 000 ◈**, soit
six paquets. Les Tours paient l'entrée au Souk, pas sa totalité — c'est la
boucle quotidienne qui porte le reste, et c'est voulu.

## 4. Le contenu (données pures)

### 4.1 Les rayons du Souk

Prix calibrés pour qu'une journée de jeu (≈ 280 ◈) vaille deux paquets, le rayon
thématique restant le meilleur marché.

| Rayon | Prix | Ouvre après | Vivier | Particularité |
| --- | --- | --- | --- | --- |
| **Sable** | 140 ◈ | `listes-1` | cartes de Sable ouvertes | 1 rare garantie |
| **Braise** | 140 ◈ | `listes-1` | cartes de Braise ouvertes | 1 rare garantie |
| **Eau** | 160 ◈ | `souk-1` | cartes d'Eau ouvertes | 1 rare garantie |
| **Neige** | 160 ◈ | `abysses-1` | cartes de Neige ouvertes | 1 rare garantie |
| **Souk** (grand étal) | 180 ◈ | `listes-1` | toutes les couleurs ouvertes | 1 rare garantie **+ carte 5 à 30 %** |
| **Coffret du Cycle** | 10 × prix − 10 % | le rayon choisi | celui du rayon choisi | **+ 1 mythique garanti** sur les dix paquets |

« Ouvre après » se lit dans la règle D2 : c'est la **première victoire** qui
ouvre la ville, et une couleur n'arrive qu'avec la carte qui l'introduit. Le
Sable et la Braise sont là dès `listes-1`, l'Eau attend les citernes de `souk-1`
(les sables ont leurs cartes d'Eau propres au même moment), la Neige attend
`abysses-1`. Seuils mesurés sur les données réelles, pas estimés.

Chaque vivier contient aussi **les communes et inhabituelles de la dotation**
(elles font le remplissage et paient en doublon) : sans elles, un paquet ne
serait fait que de rares et les taux annoncés ne voudraient plus rien dire. Un
vivier au début du jeu est **petit** — 10 cartes de Braise après `listes-1` —
mais c'est exactement la mesure de la promesse : on n'y vend que ce que la ville
a déjà montré.

Le coffret ne se vend jamais seul : c'est « dix paquets du même rayon, d'un
coup », et son prix suit le rayon choisi (Sable : 1 260 ◈, Souk : 1 620 ◈).

### 4.2 Les quêtes du jour

Treize quêtes, trois paliers, une par palier et par jour. La seule garde est
celle du comptoir : elle n'est tirée que si **un rayon du Souk est ouvert**
(jamais avant la première victoire). Les quêtes de couleur, elles, sont toutes
jouables dès le premier jour grâce aux decks du catalogue — le Serment pour la
Neige, la Marée pour l'Eau —, donc pas de garde inutile.

| Palier | Quête | Objectif | ◈ | Écoute |
| --- | --- | --- | --- | --- |
| Facile | « Une journée de plus » | poser 12 terrains | 55 | `terrain-pose` |
| Facile | « La ménagerie » | invoquer 10 créatures | 60 | `creature-invoquee` |
| Facile | « Le prix du passage » | équiper 3 armes | 60 | `arme-jouee` |
| Facile | « La Montagne au travail » | jouer 8 cartes de Braise | 55 | `carte-jouee` (couleur) |
| Moyenne | « Deux duels » | gagner 2 duels | 70 | `duel-gagne` |
| Moyenne | « Le grand jeu » | lancer 6 magies | 65 | `magie-lancee` |
| Moyenne | « Le Désert au travail » | jouer 8 cartes de Sable | 65 | `carte-jouee` (couleur) |
| Moyenne | « La Marée au travail » | jouer 8 cartes d'Eau | 70 | `carte-jouee` (couleur) |
| Moyenne | « Le Serment au travail » | jouer 8 cartes de Neige | 65 | `carte-jouee` (couleur) |
| Difficile | « Trois duels » | gagner 3 duels | 100 | `duel-gagne` |
| Difficile | « Le palier suivant » | déblayer 1 étage | 80 | `etage-deblaye` |
| Difficile | « Le sorcier saigne » | infliger 40 dégâts au sorcier | 75 | `degats-infliges` (montant) |
| Difficile | « Ouvrir le comptoir » | ouvrir 1 booster | 60 | `booster-ouvert` (**garde** : rayon ouvert) |

Trois quêtes tirées = **≈ 200 ◈**, plus le Cachet. Le plafond quotidien est
donc structurel, pas surveillé à l'exécution. Une quête réclamée ne progresse
plus, la progression est plafonnée à l'objectif, et un événement en double ne
compte pas deux fois.

### 4.3 L'état sauvegardé

Stockage local : `letsplay_sablier_bourse_v1`, `letsplay_sablier_quetes_v1`,
plus `letsplay_sablier_acquis_v1` (le gel de D9, qui vit avec la collection).
Le même contenu voyage dans le `state` du compte (`rpg_sablier_progress`) :

```jsonc
{
  "decks": [ /* inchangé */ ],
  "supprimes": [ /* inchangé */ ],
  "collection": [ /* inchangé — les cartes venues d'un autre appareil */ ],
  "acquis": {
    "version": 1,
    "gel": true,                        // définitif une fois posé
    "cartes": [ "kraken", "tarek" ]     // reprises au premier lancement (D9)
  },
  "bourse": {
    "credits": 1240,
    "cartes": ["tarek", "kraken"],      // cartes gagnées au Souk (union monotone)
    "ouvertures": 12,
    "pitie": 3,                          // ouvertures depuis la dernière mythique
    "majLe": "2026-10-14T18:02:11.000Z"
  },
  "quetes": {
    "jour": "2026-10-14",
    "progres": { "duel-gagne": 1, "terrain-pose": 12 },
    "reclamations": ["terrain-pose"],
    "serie": 4,
    "majLe": "2026-10-14T18:02:11.000Z"
  }
}
```

**Aucune migration SQL** : `state` est un `jsonb`, et la ligne de commentaire du
schéma qui décrit son contenu sera mise à jour — c'est la seule écriture
autorisée dans `supabase/schema.sql`.

### 4.4 La fusion entre appareils

| Champ | Règle | Pourquoi |
| --- | --- | --- |
| `acquis.cartes` | **union** | une carte gagnée ne se perd jamais |
| `acquis.gel` | **ou** dès qu'un appareil l'a posé | un appareil non migré ne défait pas la migration d'un autre |
| `bourse.cartes` | **union** | une carte gagnée ne se perd jamais |
| `bourse.credits` | **maximum** | on ne fait pas disparaître un solde |
| `bourse.ouvertures` / `pitie` | maximum, appariés | la pitié la plus avancée : la règle est généreuse |
| `quetes.jour` | **le jour le plus récent** | le temps ne recule pas |
| `quetes.progres` (même jour) | **maximum par quête** | deux appareils additionnent la même journée |
| `quetes.reclamations` | **union** | on ne paie pas deux fois, on ne retire jamais un dû |
| `quetes.serie` | maximum | idem |

**Le gel vit sur l'appareil** (`letsplay_sablier_acquis_v1`) et voyage avec le
compte : c'est la copie locale qui fait foi pour la migration — même si un
appareil qui n'a pas encore la nouvelle version écrase `state` sans le champ
`acquis`, l'appareil migré le repousse à la première fusion. Les cartes gelées ne
peuvent donc pas être perdues par une écriture concurrente.

**Le compromis assumé** : un joueur qui dépense 400 ◈ hors ligne sur l'appareil A
peut voir ces 400 ◈ revenir si l'appareil B pousse un solde plus élevé avant
d'avoir vu la dépense. C'est le prix de la règle « on ne perd jamais rien », et
c'est sans conséquence : jeu solo, aucun classement, aucun achat réel. Un
compteur de séquence strict serait plus « juste » et pourrait faire disparaître
des crédits — on refuse.

## 5. Architecture et fichiers

Quatre modules purs (aucune dépendance au DOM, `rng` injectable), un hook, deux
composants, une feuille de style, quatre tests, une vérification d'interface.
Les lignes **✅** du tableau sont celles du **lot 1, livré** ; les autres sont
les lots 2 à 5.

| Fichier | Rôle | Vérifié par |
| --- | --- | --- |
| ✅ `src/games/rpgHasard.js` | hasard semé : `graineNumerique` (FNV-1a), `rngSeme` (mulberry32), `tirerIndex`, `tirerParmi`, `choixPondere`, `melanger` | `tests/rpg-hasard.test.js` |
| ✅ `src/games/rpgCredits.js` | portefeuille : normalisation, gains, dépense, barème des doublons, pitié, fusion, stockage | `tests/rpg-credits.test.js` |
| ✅ `src/games/rpgQuetes.js` | pool, tirage semé, journée monotone, progression, réclamation, Cachet, fusion | `tests/rpg-quetes.test.js` |
| ✅ `src/games/rpgBoosters.js` | rayons, viviers ouverts par les marches (D2), `tirerCartes`, `ouvrirBooster`, `ouvrirCoffret`, prix du coffret | `tests/rpg-boosters.test.js` |
| ✅ `src/games/rpgCollection.js` | révélations d'étage, **gel des acquis** (D9), sources de la collection | `tests/rpg-collection.test.js` |
| ✅ `src/games/rpgDeckBuilder.js` | la fusion de compte transporte les acquis, gel compris | `tests/rpg-deck-builder.test.js` |
| ✅ `src/games/useDecksSablier.js` | pose le gel au montage, pousse les acquis, `noterVictoireEtage` ouvre les cartes | `scripts/rpg-story-narrative-smoke.jsx` |
| ✅ `src/games/rpgEvenementsDuel.js` | le **contrat d'événements** : normalisation, ce qui paie, ce qui compte | `tests/rpg-evenements.test.js` |
| ✅ `src/games/useSablierBourse.js` | état React + fusion + poussée au compte, patron de `useDecksSablier.js` | `scripts/rpg-souk-bourse-smoke.jsx` |
| ✅ `scripts/rpg-souk-bourse-smoke.jsx` + `scripts/rpg-souk-bourse-check.mjs` | le hook monté dans jsdom (jour, gains, réclamation, rechargement) + les gardes de source | `npm run check:rpg-souk-branche` |
| `src/games/RpgSouk.jsx` | l'écran : bourse, quêtes, rayons | `scripts/rpg-souk-smoke.jsx` |
| `src/games/RpgBoosterOuverture.jsx` | la cérémonie des cinq cartes | idem |
| `src/games/rpg-souk.css` | mise en page, animations, `prefers-reduced-motion`, tactile | `scripts/rpg-souk-ui-check.mjs` (garde-fous de source) |
| `scripts/rpg-souk-smoke.jsx` + `scripts/rpg-souk-ui-check.mjs` | l'écran monté dans jsdom (onglet, réclamation, achat, ouverture, ajout à la collection) | `npm run check:rpg-souk-ui` |

**Ce que les modules exportent** — le contrat réel, celui que les tests
tiennent (aucun `fusionnerBourses` : le portefeuille et les quêtes se fusionnent
chacun chez soi, le hook appelle les deux) :

```js
// rpgHasard.js
graineNumerique(texte) -> uint32 · rngSeme(graine) -> () => [0,1[
tirerIndex(liste, rng) · tirerParmi(liste, rng) · choixPondere(paires, rng, defaut) · melanger(liste, rng)

// rpgCredits.js
BAREME_DOUBLON = { commune: 12, inhabituelle: 20, rare: 45, mythique: 120 }
GAINS = { etagePremiere: 50, etageRejoue: 10, duelLibre: 8, cachetDuCycle: 80 }
RPG_BOURSE_STORAGE_KEY = 'letsplay_sablier_bourse_v1'
portefeuilleVide() · normaliserPortefeuille(v)
creditsDeVictoire({ mode, premiere }) · creditsDeDoublons(ids)
crediterCredits(p, montant) · depenserCredits(p, prix) -> { ok, raison, portefeuille }
ajouterCartesAuPortefeuille(p, ids) · enregistrerOuverture(p, { mythique, aDesMythiques })
paquetsAvantMythique(p, { aDesMythiques, seuil }) · fusionnerPortefeuilles(local, distant)
chargerPortefeuille() · sauverPortefeuille(p)

// rpgQuetes.js
PALIERS = ['facile', 'moyenne', 'difficile'] · QUETES (13) · RPG_QUETES_STORAGE_KEY
etatQuetesVide() · normaliserEtatQuetes(v) · queteParId(id)
cleJour(horloge) · jourCourant(horloge, dernierJour) · jourPrecedent(cle) · secondesAvantMinuit(horloge)
quetesDisponibles(progression) · quetesDuJour(jour, graine, progression) · ouvrirJournee({ etat, jour, graine, progression })
progresserQuete(etat, evenement) · queteTerminee · quetesAReclamer · cachetDisponible
reclamerQuete(etat, id) · reclamerCachetDuCycle(etat) -> { ok, raison, etat, credits }
fusionnerQuetes(local, distant) · chargerEtatQuetes() · sauverEtatQuetes(e) · chargerGraine()

// rpgBoosters.js
TAUX = { cartes: 5, communes: 0.88, mythique: 0.2, mythiqueSouk: 0.3, pitie: 8, nouvellesMin: 3 }
COFFRET = { taille: 10, remise: 0.1, mythiqueAssuree: true } · RAYONS (5) · COULEURS_SOUK
rayonParId(id) · prixCoffret(rayonId) · toursEntamees(progression) · tourIntroduction(cardId)
carteAuVivier(cardId, progression) · cartesOuvertes(progression) · etagesOuverts(progression)
couleursOuvertes(progression) · tourQuiGarde(couleur)
vivierRayon(rayonId, progression) · rayonOuvert(rayonId, progression)
etatRayon(rayonId, progression, collection) · etatRayons(...) · rayonsOuverts(...)
tirerCartes({ rayonId, progression, collection, rng, pitie })
ouvrirBooster({ portefeuille, rayonId, progression, collection, rng })
ouvrirCoffret({ portefeuille, rayonId, progression, collection, rng }) · etageIntroduction(cardId)

// rpgEvenementsDuel.js — le contrat du duel (lot 2)
EVENEMENTS_DUEL (9) · EVENEMENTS_PAYANTS = ['duel-gagne']
normaliserEvenementDuel(e) -> e normalisé | null      // couleurs et kind lus DANS le catalogue
creditsDeLEvenement(e) -> 0 | 8 | 10 | 50             // seul « duel-gagne » paie
appliquerEvenementDuel({ bourse, quetes }, e) -> { bourse, quetes, gain, evenement, reconnu }
compterReclamations(quetes) -> 0..4                    // ce que la pastille affiche

// rpgCollection.js — le changement de nature des étages (D9)
RPG_REVELATIONS_PAR_ETAGE (20 étages) · RPG_ACQUIS_STORAGE_KEY = 'letsplay_sablier_acquis_v1'
cartesReveleesParEtage(etageId) · carteReveleePar(cardId) · revelationsDepuisEtages(etageIds)
acquisVide() · normaliserAcquis(v) · fusionnerAcquisitions(...a) · figerAcquisitions({ acquis, progression })
chargerAcquis() · sauverAcquis(a)
collectionJoueur({ acquis, distante, souk })   // plus d'etagesVaincus : les étages ne donnent plus
```

Trois choix d'implémentation que le code a tranchés, et qui valent d'être
connus avant d'écrire les lots suivants :

- **`collection` est optionnelle partout.** Sans elle, les modules prennent
  `collectionJoueur()` — la dotation, les acquis gelés, les apports du compte.
  Le hook, lui, passera la collection effective (celle qui compte les cartes du
  Souk) : c'est la seule façon pour qu'un doublon soit reconnu comme tel juste
  après l'avoir gagné.
- **`collectionJoueur` ne prend plus d'étages** : depuis D9, la progression ne
  décide plus de ce qu'on possède, elle décide de ce qui est **en vente**
  (`carteAuVivier`). C'est `rpgBoosters.js` qui lit les étages, pas la
  collection — la séparation est nette, et c'est ce qui rend le retrait sûr.
- **La stabilité référentielle est tenue** : `progresserQuete` rend l'objet
  d'origine quand rien ne bouge (un terrain posé pendant un duel ne doit pas
  faire re-rendre l'écran du Souk), comme `marquerEtageVaincu` le fait déjà.
- **Aucun module ne touche au stockage d'un autre** : `rpgBoosters.js` ne
  connaît que des entrées et des sorties, l'écriture appartient au hook.

## 6. Le contrat d'événements du duel

Un seul point d'entrée dans `RpgDuelPage.jsx` :
`noterEvenementDuel(evenement)`. Les gestes du duel l'appellent aux endroits qui
existent déjà ; le hook ne connaît que des événements normalisés, donc
**testables sans React**.

| Événement | Émis quand | Champs | Quêtes servies |
| --- | --- | --- | --- |
| `duel-gagne` | vainqueur `joueur` (effet de victoire, une fois par session) | `mode`, `etageId`, `tourId`, `premiere` | deux / trois duels |
| `etage-deblaye` | `enregistrerVictoire` a ajouté l'étage | `etageId`, `tourId`, `premiere` | palier suivant |
| `terrain-pose` | `poserTerrain` réussi | `cardId`, `elements` | journée de plus |
| `creature-invoquee` | `poserCreature` réussi | `cardId`, `elements` | ménagerie |
| `magie-lancee` | sort résolu | `cardId`, `elements` | grand jeu |
| `arme-jouee` | arme posée | `cardId` | prix du passage |
| `carte-jouee` | tout ce qui précède (union) | `cardId`, `elements`, `kind` | couleur portée |
| `degats-infliges` | dégâts au sorcier | `montant` | le sorcier saigne |
| `booster-ouvert` | ouverture terminée | `rayonId`, `cartes` | ouvrir le comptoir |

Règle : un événement non reconnu est **ignoré en silence** (aucune quête ne
casse), et un événement en double ne compte pas deux fois dans la même journée
pour un objectif déjà atteint.

## 7. L'écran Souk

Un sixième onglet dans le menu du jeu, **◈ Souk**, avec une pastille quand
quelque chose attend (une réclamation, une mythique promise à 0 paquet).

1. **La bourse** — le solde `◈ 1 240`, la série de jours joués, et le compte à
   rebours du cycle (« le cycle se referme dans 7 h 12 »).
2. **Les quêtes du jour** — trois cartes, une barre de progression par quête,
   la récompense, le bouton **Réclamer** (désactivé et expliqué si l'objectif
   n'est pas atteint), puis le **Cachet du cycle** quand les trois sont prises.
3. **Les rayons** — les boosters en étagère, façon boîtiers de l'onglet Deck :
   nom du rayon, prix, couleurs, une ligne de taux, « N cartes sur M vous
   manquent encore », et le bouton **Ouvrir** (ou le motif du refus : solde
   insuffisant, rayon fermé).

L'écran affiche aussi **l'état de l'étagère** : « le Souk suit les marches que
vous avez montées — prochaine ouverture : « Le Séisme de la Citerne » ». C'est
la règle D2 rendue visible, et c'est ce qui répond à la question du joueur
devant un rayon fermé.

**La cérémonie d'ouverture** : une nappe plein écran, les cinq cartes se
retournent une à une (la rare en dernier), tampon **NOUVELLE** ou **déjà
possédée → +45 ◈**, total encaissé, puis **« Tout ranger dans la collection »**
qui pousse l'union et rend la main. Un bouton « Passer » saute l'animation.

Contraintes reprises telles quelles des autres écrans : tactile d'abord (les
boutons ne dépendent d'aucun survol), `prefers-reduced-motion` remplace les
retournements par des apparitions, l'écran tient en portrait étroit comme sur
grand écran, le plein écran du jeu reste actif. Le son réutilise les séquences
existantes : `pioche` par carte, `victoire` pour la mythique, `erreur` pour un
achat refusé.

## 8. Les chiffres, et ce qu'ils donnent

| Question | Réponse |
| --- | --- |
| Combien de cartes dans le jeu ? | 99 (35 communes, 3 inhabituelles, 35 rares, 26 mythiques) |
| Ce que le joueur possède sans jouer | **38 / 99** — la dotation de départ |
| Ce qu'un étage donne après D9 | des crédits (50 ◈ au premier déblayage) et le récit ; ses cartes deviennent **achetables** |
| Ce qu'un booster ajoute | de l'**avance** dans une tour déjà ouverte, du **choix**, et des **mythiques** hors boss |
| Une journée de jeu | 250–310 ◈ ⇒ deux boosters, ≈ 10 cartes dont 6 neuves quand l'étagère suit |
| Boucler la collection | **19 jours** (≈ 5 200 ◈, 33 paquets) à 280 ◈/jour, la campagne fournissant ses 1 000 ◈ au passage |
| Prix d'un coffret | 1 260 ◈ (Braise/Sable) — quatre journées, une mythique assurée |

**Ce que le Souk ne fera pas** : vendre une carte avant sa tour, vendre un deck
complet, ni créer une troisième monnaie. Et le joueur qui n'y met jamais les
pieds ne perd **rien** de ce qui existe aujourd'hui : il garde ses acquis gelés,
la dotation, et les étages continuent de lui révéler la ville — simplement, il
les paiera plus tard.

## 9. Le chantier, découpé en lots

| Lot | Contenu | Livrable vérifiable | Fichiers |
| --- | --- | --- | --- |
| **0** | **ce document**, validé | le dossier relu et tranché | `docs/rpg/13-…md`, `docs/rpg/README.md` |
| **1 ✅ livré** | les règles pures | quatre suites vertes (**41 tests**), **invisible pour le joueur** | `rpgHasard.js`, `rpgCredits.js`, `rpgQuetes.js`, `rpgBoosters.js`, `tests/rpg-*.test.js`, `package.json` |
| **1bis ✅ livré** | **les étages ne donnent plus de cartes** (D9) : révélations, gel des acquis, vivier refait, écrans réalignés | **428 tests verts** (4 suites préexistantes sans `jsdom`/`three`), collection d'un joueur neuf = 38 cartes exactement | `rpgCollection.js`, `rpgBoosters.js`, `rpgDeckBuilder.js`, `useDecksSablier.js`, `RpgStoryScene.jsx`, `RpgDeckAtelier.jsx`, tests, docs 06/09/10/13 |
| **2 ✅ livré** | les gains branchés | **475 tests verts** ; le solde et la pastille sont dans l'en-tête du menu, et l'événement est émis | `RpgDuelPage.jsx`, `useSablierBourse.js`, `rpgEvenementsDuel.js`, `rpg-souk-bourse-*` |
| **3** | l'écran Souk | la bourse, les quêtes, la réclamation — sans les rayons | `RpgSouk.jsx`, `rpg-souk.css`, smoke |
| **4** | les boosters | achats, ouverture, doublons, cartes rangées dans la collection, poussée au compte | `RpgBoosterOuverture.jsx`, `rpgBoosters.js`, `useSablierBourse.js` |
| **5** | le fini | sons, plein écran, portrait étroit, série de 7 jours, journal des ouvertures | `rpgAudio.js`, `rpg-mobile.css`, docs |
| **6** *(plus tard)* | les **cartes du Souk** — un set dédié, hors des Tours, achetable seulement au Souk | contenu + art, hors de ce chantier | `rpgCards.js`, `public/cards/` |

Le lot 1 est **livré** — et il était bien mergéable seul : il n'ajoute que des
modules purs et des tests, ne touche à aucun écran (seuls `package.json` et
l'index du dossier ont bougé), et il fige les règles sur lesquelles les lots
suivants s'appuient. Le lot 2 est **livré** aussi : ce qui se gagne dans les
Tours est maintenant compté, gardé et montré, et l'économie suit le joueur d'un
appareil à l'autre. Le lot 3 n'a plus qu'à peindre ce qui existe.

**Ce que le lot 1 a appris** (et qui a modifié ce dossier) : la règle du vivier
a dû être réécrite (D2), la pitié relève la moyenne des mythiques au-dessus du
taux annoncé (D3), la quête du comptoir exige une garde que les quêtes de
couleur n'exigent pas, et le pool des quêtes compte **treize** entrées, pas
douze.

**Le lot 2 a tranché trois choses** que le dossier ne disait pas :

1. **Le paiement tient à un seul événement, `duel-gagne`.** `duel-gagne` et
   `etage-deblaye` tombent au même instant, pour le même étage : les faire payer
   tous les deux aurait doublé chaque victoire. Le premier paie (8/10/50 ◈), le
   second ne sert qu'à la quête du palier suivant — et il ne tombe que si
   l'étage était vraiment neuf.
2. **Les dégâts au sorcier se comptent sur ses PV**, pas au point d'appel. Un
   effet de fin de tour, un écho différé, une capacité d'arrivée : sept chemins
   différents font saigner le sorcier, et un point d'appel oublié était un
   quota perdu. L'écart entre les dégâts cumulés et ceux déjà annoncés couvre
   **toutes** les sources, et une action annulée puis rejouée ne compte pas
   deux fois — l'écart retombe à zéro puis remonte, sans re-émettre.
3. **Le contrat d'événements est un module pur** (`rpgEvenementsDuel.js`), pas
   une liste de règles dans `RpgDuelPage.jsx`. Le duel *raconte*, le module
   compte : la règle se teste sans monter un composant, et les couleurs d'une
   carte jouée se lisent **dans le catalogue** au lieu d'être crues sur parole
   par l'écran.

**Ce que le lot 1bis a appris** — trois corrections que le code a imposées, et
qui valent d'être retenues :

1. **La dotation ouvre tout si on la laisse compter.** Les 38 communes couvrent
   les quatre couleurs : la première version de `rayonOuvert` ouvrait les cinq
   rayons dès le premier jour. Ne comptent que les cartes **révélées**.
2. **« L'étage suivant » était un contresens** : la règle est « l'étage est
   vaincu, **ou** son étage précédent l'est » — autrement dit, *la marche
   suivante est ouverte*. Écrite à l'envers, elle n'ouvrait rien.
3. **La garantie des nouvelles ne suffisait pas à compléter la collection** :
   les dernières mythiques ne sortaient que de la cinquième carte, et boucler
   le set demandait ~400 paquets. Une seule place promue vers le haut ramène ça
   à 33. Ce n'est pas un détail d'équilibrage, c'est ce qui rend le Souk
   praticable.

**Le jeton du menu** : en attendant l'onglet du lot 3, le solde ◈ et le compte
des réclamations vivent dans l'en-tête du menu (`data-souk-bourse`,
`data-souk-a-reclamer`). C'est une fenêtre sur l'économie, pas l'écran du Souk :
la pastille ne s'affiche que s'il y a quelque chose à réclamer, et le lot 3 la
reprendra sur l'onglet.

**La reprise du monolithe** : `RpgDuelPage.jsx` fait 283 Ko et ne doit pas
grossir de l'écran du Souk. La page ne reçoit **que** l'onglet, le badge,
l'appel `noterEvenementDuel` et le rendu `<RpgSouk … />` ; tout le reste vit dans
ses propres fichiers, comme `RpgDeckAtelier.jsx` l'a fait avant lui.

## 10. Vérifications

Le lot 1 se vérifie en quatre commandes (agrégées par `check:rpg-souk`) ; les
lots 1bis et 2 se vérifient par `check:rpg` — ils touchent à la collection, à la
fusion de compte et au récit, donc au jeu entier :

```bash
npm run check:rpg-hasard         # node --test tests/rpg-hasard.test.js
npm run check:rpg-credits        # node --test tests/rpg-credits.test.js
npm run check:rpg-quetes         # node --test tests/rpg-quetes.test.js
npm run check:rpg-boosters       # node --test tests/rpg-boosters.test.js
npm run check:rpg-evenements     # node --test tests/rpg-evenements.test.js
npm run check:rpg-souk-branche   # le hook monté dans jsdom + les gardes de source
npm run check:rpg-souk           # les six d'affilée
```

Les quatre suites sont aussi **entrées dans `check:rpg`** : une régression
d'économie casse désormais la vérification du jeu entier. État après le lot 2 : **475 tests,
475 verts** — les quatre échecs qui traînaient venaient bien de `jsdom` et
`three` absents de l'environnement de travail, et ils disparaissent dès que les
dépendances sont installées.

**Ce qui n'est pas vérifié automatiquement** : les smoke d'interface du dépôt
(`check:rpg-story-ui`, `check:rpg-deck-ui`, `check:rpg-mobile`, `check:rpg-ui`)
échouent dans cet environnement **avant comme après** ce chantier — vérifié au
commit de base `2034b25` dans un worktree séparé, mêmes erreurs, mêmes lignes.
Ce sont des tests d'animation et de mise en page, sensibles au rythme de la
machine ; ils ne disent rien du Souk. Le smoke du lot 2 a été écrit pour ne
**dépendre d'aucune minuterie** — et il pose sa graine, faute de quoi il passait
ou échouait selon le tirage du jour (constaté, corrigé).

Les cas couverts :

- **hasard** — graine stable et sans collision, suites reproductibles, tirage
  pondéré qui respecte ses poids, mélange qui ne touche pas sa source ;
- **crédits** — barème par rareté, plafond anti-farm (un étage rejoué vaut dix
  fois moins que le premier), refus d'une dépense sans solde, portefeuille
  corrompu relu proprement, fusion qui ne fait jamais baisser un solde, stockage
  silencieux ;
- **quêtes** — même tirage pour un même couple (jour, graine), tirage différent
  le lendemain et d'un joueur à l'autre, une quête par palier, quête de couleur
  négligée par un événement d'une autre couleur, montant compté pour les dégâts,
  progression plafonnée, quête réclamée qui ne bouge plus, Cachet payé une seule
  fois, journée qui ne recule pas quand l'horloge recule, garde du comptoir ;
- **événements (lot 2)** — le contrat compte neuf gestes et **un seul paie** ;
  un événement inconnu, `null` ou mal formé est ignoré en silence ; les
  couleurs d'une carte jouée sont lues **dans le catalogue** (une couleur
  annoncée par l'appelant est ignorée) ; un montant glissé dans un autre
  événement ne compte jamais ; le premier déblayage paie 50 ◈, le rejeu 10 ◈,
  le duel libre 8 ◈, la défaite 0 ; `etage-deblaye` ne paie rien ; un geste sans
  effet rend l'état **d'origine** (stabilité référentielle) ; chaque quête du
  jour avance sur le geste de son type, et une carte d'une autre couleur ne
  touche pas une quête de couleur ; les dégâts comptent leur montant et
  plafonnent à l'objectif ; la quête du comptoir ne se tire pas tant que le Souk
  est fermé ; la pastille compte les réclamations dues et pas une de plus ;
- **bourse montée (lot 2)** — le smoke jsdom ouvre la journée, joue la boucle
  (duel libre 8 ◈, premier étage 50 ◈, rejeu 10 ◈), vérifie qu'un événement hors
  contrat ne casse rien, que le solde et la journée survivent à un
  rechargement, qu'une quête réclamée paie son montant **une seule fois**, et
  que le menu affiche le même chiffre que le hook ;
- **boosters** — cinq cartes distinctes et toutes du vivier du rayon, rare
  garantie, pitié qui **force** la mythique après une série sèche (et qui ne
  compte pas sur un rayon sans mythique), taux mesurés sur dix mille ouvertures
  semées (23,8 % par rayon thématique, 31,8 % au grand étal, jamais plus de sept
  paquets secs), **vivier qui suit les marches** (aucune carte du Fjord avant
  d'y être entré, la marche suivante ouverte par la précédente), garantie des
  trois nouvelles adaptée à ce que le vivier offre, doublons remboursés au
  barème, achat refusé sans solde ni sur un rayon fermé, coffret à dix paquets
  avec remise et mythique assurée ;
- **collection (lot 1bis)** — chaque révélation nomme une carte réelle hors
  dotation et sans doublon, dotation + révélations couvrent les 99 cartes,
  **gagner un étage ne donne plus rien** (la collection d'un joueur neuf est
  exactement la dotation), la collection grandit par les acquis / le Souk / le
  compte, le **gel** reprend une fois exactement les cartes de l'ancienne règle
  puis ne bouge plus, il se sauvegarde et se relit, et les quatre couleurs
  entrent dans l'ordre de la campagne.

## 11. Risques et points ouverts

| Risque | Réponse |
| --- | --- |
| **Retirer les récompenses d'étage efface les cartes déjà gagnées** | le **gel des acquis** (D9) les reprend une fois, avant que quiconque puisse les perdre ; testé, y compris sur un compte à deux appareils dont un seul a migré |
| La collection est **dérivée** : oublier une source rendrait les cartes invisibles | une seule porte (`collectionJoueur`, quatre sources) + un test qui vérifie qu'une carte du Souk est bien possédée et jouable |
| L'économie écrase le rythme de la campagne | le vivier qui suit les marches (D2) + un test qui refuse une carte du Fjord à qui n'y est pas entré |
| **La collection se boucle en 19 jours** et le Souk n'a plus rien à vendre | assumé : c'est exactement ce qui rend le lot 6 (set dédié) nécessaire — et les doublons paient en crédits d'ici là |
| Le solde donne envie de farmer les parties libres | 8 ◈ par duel libre, 10 ◈ par étage rejoué, et les quêtes restent le gros du revenu |
| Deux appareils, dépense hors ligne | fusion par maximum, compromis documenté (§4.4) — jamais de perte |
| Le monolithe `RpgDuelPage.jsx` | l'écran vit dans ses fichiers, la page ne gagne qu'une branche |

**Décisions prises** (elles ont débloqué les lots 1 et 1bis) :

1. **La monnaie s'appelle « crédits » (◈)** — le mot du demandeur. Le lore du
   dossier 04 passe des « dinars du courant » aux « crédits de la Chambre ».
2. **Le rythme quotidien est celui du dossier** : quêtes de 55 à 100 ◈, 80 ◈ de
   Cachet, 50 ◈ par premier étage, rayons à 140–180 ◈ — une journée pleine vaut
   **310 ◈ au maximum**, 250 à 280 en moyenne, soit deux paquets.
3. **Le Cachet du cycle vaut +80 ◈**, en crédits, pas en booster offert : une
   seule mécanique à expliquer.
4. **Les cartes du Souk (lot 6) attendent** : la boucle doit d'abord vivre en
   ligne avant qu'on lui ajoute un set dédié.
5. **Les Tours ne donnent plus aucune carte** — choix « retirer complètement »,
   exécuté **avant le lot 2** : trophées de boss compris, les mythiques d'étage
   aussi. Corollaire accepté : les Tours ne rendent plus que du récit et des
   crédits, et le Souk devient la seule voie d'acquisition.
6. **Le jeton de bourse vit dans l'en-tête du menu** tant que l'écran du Souk
   n'existe pas (lot 3) : le solde ◈ et le compte des réclamations y sont déjà,
   et la pastille du lot 3 reprendra le même chiffre.
7. **L'économie voyage avec le compte dès maintenant**, pas au lot 4 : les deux
   hooks poussent **le même état entier**, chacun relisant le stockage local de
   l'autre au moment d'écrire. Sans ça, le premier enregistrement de deck aurait
   effacé les crédits — et c'est un bug qui n'aurait été vu qu'au lot 4.

**Reste ouvert pour la suite** : les cartes du Souk (lot 6, **devenu la
priorité** puisque la collection se boucle en trois semaines), une série de sept
jours récompensée (lot 5), et le moment où le **sable** du dossier 04 entre en
scène comme seconde devise — le portefeuille est déjà écrit pour l'accueillir.
Un écart à trancher aussi : le calibrage vise « ≈ 200 ◈ de quêtes » alors que le
maximum mesuré est 310 ◈ — la fourchette retenue est 250–280 en moyenne, à
réajuster si les parties réelles s'en écartent.
