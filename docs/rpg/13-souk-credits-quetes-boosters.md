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
>
> **Révision du 19 octobre 2026 — le paquet du Souk mélange les couleurs.**
> Les cinq rayons monochromes disparaissent. Le comptoir ne vend plus qu'un
> **paquet du Souk** : son vivier réunit toutes les couleurs déjà ouvertes,
> le tirage les mélange au hasard, **une rare est garantie** à la quatrième
> carte, et les mythiques passent de 20–30 % à **8 %** par paquet (pitié à
> douze). Les sections D2, D3 et 4.1 ci-dessous portent les règles à jour ;
> les sections « lots » gardent la trace de ce qui a été livré avant.

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
n'ait montré : le vivier suit les marches, et **l'avance d'une marche** — la
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

- **Le Souk ouvre à la première victoire.** Avant elle, le comptoir n'est pas
  ouvert : l'écran le dit, et la quête du comptoir n'est pas tirée.
- Gagner `listes-1` ouvre les cartes de `listes-1` **et** de `listes-2`.
  Le vivier grandit à chaque marche.
- **La dotation de départ ne compte pas** dans les couleurs ouvertes : ses 40
  communes et ses 9 inhabituelles couvrent les quatre couleurs et ouvriraient
  tout dès le premier duel. Elles remplissent les paquets, elles ne les ouvrent
  pas.
- Aucun paquet ne vend une carte du Fjord avant que le joueur soit **entré
  dans le Fjord** (la première marche d'une tour ne s'offre pas d'office).

Le vivier est **un seul panier, toutes couleurs confondues**. Les couleurs y
entrent au rythme des révélations : Sable et Braise après `listes-1`, Eau après
`souk-1` (les citernes du Souk), Neige après `abysses-1` (le fond glacé). Un
paquet peut donc contenir n'importe quelle carte ouverte, quelle que soit sa
couleur — et **jamais un paquet monochrome** : si les cinq cartes tombent sur la
même couleur, la dernière carte de la bande commune est échangée contre une
carte d'une autre couleur, de la même rareté.

Ce que le paquet fait, concrètement : il vend **l'avance d'une marche**, toutes
couleurs mêlées. Le joueur bloqué devant `listes-5` peut tirer la carte de son
boss avant de l'affronter — c'est là toute la valeur du Souk. Et quand tout le
vivier est possédé, le comptoir affiche **« complet »** : chaque carte paiera
des crédits.

### D3 — Un booster = cinq cartes, une rare garantie, 8 % de mythique

| Emplacement | Tirage |
| --- | --- |
| Cartes 1 à 3 | 88 % commune · 12 % inhabituelle |
| Carte 4 | **rare garantie** |
| Carte 5 | 92 % rare · **8 % mythique** |

- Les cinq cartes d'un même paquet sont **distinctes** (tirage sans remise dans
  le vivier) : pas de « trois fois la même commune », jamais.
- **Un paquet n'est jamais monochrome.** Le vivier réunit toutes les couleurs
  ouvertes ; si les cinq cartes tombent sur une seule couleur, une carte de la
  bande commune est échangée contre une carte d'une autre couleur **de la même
  rareté** — les taux ne bougent pas, le mélange se voit.
- **La rare est garantie** : la quatrième carte ne peut pas être mythique tant
  qu'une rare reste au vivier. Un paquet contient donc au moins une rare, et
  deux dans la grande majorité des cas (la cinquième retombe sur une rare quand
  elle ne sort pas de mythique).
- **Garantie des nouvelles** : tant que le vivier contient trois cartes que le
  joueur ne possède pas, **trois** des cinq le sont. L'échange d'un doublon se
  fait **vers le haut** — jamais contre une carte plus commune — et si les
  seules cartes neuves qui restent sont plus rares que le doublon, **une seule**
  place est promue. Sans cette promotion, les dernières mythiques ne sortiraient
  que de la cinquième carte.
- **Compteur de pitié** : après onze ouvertures consécutives sans mythique,
  la douzième en contient une — la promesse est tenue au plus tard au douzième
  paquet. Il ne compte **que si le vivier a une mythique à
  donner** — une promesse ne se compte pas là où elle est intenable — et il est
  **visible** (« prochaine mythique assurée dans N paquets »).
- Les taux sont **écrits sur la fiche du paquet**, **et la pitié se dit aussi**.
  Mesuré sur dix mille ouvertures semées : **12,6 %** de mythiques en moyenne
  (8 % annoncés, la pitié et la garantie des nouvelles relèvent le total),
  **jamais plus de onze paquets secs d'affilée**, **deux à trois rares par
  paquet**, et **trois nouvelles cartes par paquet** tant que le vivier en garde.
- Les taux sont des **cibles**, pas une garantie de résultat : ce sont les
  bornes ci-dessus (rare garantie, pitié, garantie des nouvelles) qui sont des
  promesses.

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
boucle en **≈ 37 paquets**, soit ≈ 3 500 ◈ **nets** une fois les doublons
réinvestis (mesuré sur 50 graines, une fois toutes les marches révélées). Au-delà,
le Souk ne vend plus que des doublons remboursés — c'est précisément pourquoi le
**lot 6** (un set dédié au Souk) devient la suite naturelle, et non un
supplément.

### D4 — Le doublon n'est pas une punition

Une carte déjà possédée est **estampillée** à l'ouverture (« déjà possédée ») et
rend des crédits au barème :

| Rareté du doublon | Remboursement |
| --- | --- |
| Commune | 6 ◈ |
| Inhabituelle | 10 ◈ |
| Rare | 22 ◈ |
| Mythique | 60 ◈ |

Le barème est calibré pour qu'un doublon **adoucisse** la perte sans jamais la
payer : même le pire paquet — trois inhabituelles, la rare garantie et la
mythique, toutes déjà possédées — rend 112 ◈ pour 140 ◈. Un joueur dont la
collection est complète ne peut donc pas s'enrichir en rachetant des paquets.
C'est le seul mécanisme anti-frustration : on ne recycle pas en poussière, on
recycle en crédits, parce que **le crédit est la seule monnaie du chantier**.

### D10 — L'étal vend un **exemplaire**, pas une carte

Le comptoir du Souk (D4) refund les doublons : une carte qu'on possède déjà n'y
apporte rien. **L'étal du jour — les cinq cartes à l'unité — obéit à une autre
règle, et cette règle tenait mal en écran.** Un joueur qui possédait une rare en
un seul exemplaire voyait « déjà possédée » sur la carte, pendant que la pastille
annonçait `×1` et que le deck, lui, en autorise deux (`cardCopyLimit`) : le
chiffre promettait un stock, le mot le déclarait fini.

La règle, depuis lors, est écrite en trois morceaux qui se recoupent :

| Notion | Où elle vit | Ce qu'elle répond |
| --- | --- | --- |
| **Possession** | `portefeuille.cartes`, `rpgCollection.js` | « est-ce que je la possède ? » — donc : est-ce que je peux la jouer, l'avoir dans un deck |
| **Quota de deck** | `cardCopyLimit` (`rpgCards.js`) | « combien de copies un deck peut-il en aligner ? » — 2, sauf mythique (1) et terrain (illimité) |
| **Stock acquis** | `portefeuille.exemplaires` | « combien de copies ai-je **payées** ? » — c'est lui seul qui remplit la pastille |

Conséquences, toutes testées :

- **une carte possédée en un exemplaire sur deux reste achetable** : l'étal vend
  la seconde copie, la pastille passe à `2/2`, et la ligne sous le nom dit
  « quota du deck atteint » au lieu d'un « déjà obtenu » qui ne voulait rien dire ;
- **une carte à quota unique ne se revend pas** : la mythique possède un
  exemplaire, elle est *complète* — l'étal le dit, il ne facture pas ;
- **la possession n'est jamais un compteur** : `cartes` reste un ensemble
  d'identifiants, `exemplaires` un objet `{ id: nombre }`. Racheter une copie ne
  débloque rien de plus au deck (le playset est ouvert dès la première possession,
  D9) — **c'est l'achèvement de la collection qui s'écrit, pas une place de
  plus**. C'est assumé, et cela se lit sur la carte : `2/2`, pas « nouveau deck » ;
- **le premier exemplaire ne s'écrit pas** : la valeur implicite d'une carte
  possédée sans entrée est `1`. Aucune sauvegarde d'avant l'étal ne change de
  valeur, et le `jsonb` du compte reste minuscule ;
- **un seul achat par carte et par jour** : le garde-fou `etal.achetees` ferme la
  journée sur une carte payée. C'est lui qui rend le geste idempotent — un double
  clic ne débite pas deux fois. La copie restante s'achète le jour où la carte
  reparaît ;
- **le stock n'ouvre aucune voie de farm** : une carte au quota est refusée avant
  la caisse, un refus ne débite rien, et les doublons de booster continuent de se
  rembourser au barème de D4 (ils ne s'empilent pas dans `exemplaires`).

L'écran, lui, ne tranche rien : `vueCarteDeEtal` (`rpgSoukDirect.js`) rend
`{ prix, acquis, limite, reste, etat, manque }`, et `RpgSouk.jsx` habille l'un
des quatre états — `disponible`, `achetee`, `complet`, `sans-solde`. Le quota
passe avant le garde-fou du jour : « achetée aujourd'hui » promet un retour
demain, « complet » dit qu'il n'y a plus rien à acheter du tout.

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
| **Tour terminée** — tous ses étages déblayés | **+200 ◈**, une seule fois par tour |
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
**≈ 2,3 paquets par jour** — tient dans cette fourchette. Les **≈ 3 500 ◈
nets** qui bouclent la collection (37 paquets, doublons réinvestis) représentent
ainsi ≈ 12 journées de quêtes, crédits des étages compris.

**Ce que la campagne entière rapporte** : 20 étages × 50 ◈ = **1 000 ◈**, plus
le butin des cinq tours gravies (5 × 200 ◈) = **2 000 ◈**, soit quatorze
paquets. Toute la galerie des Tours (10 tours, 43 étages) rapporte
43 × 50 ◈ + 10 × 200 ◈ = **4 150 ◈**. Le butin ne se rejoue pas : une tour
terminée l'a versé une fois (`toursPayees` dans le portefeuille), les reprises
d'étages ne paient que 10 ◈. Les Tours paient l'entrée au Souk, pas sa
totalité — c'est la boucle quotidienne qui porte le reste, et c'est voulu.

## 4. Le contenu (données pures)

### 4.1 Le comptoir du Souk

Prix calibré pour qu'une journée de jeu (≈ 280 ◈) vaille deux paquets.

| Paquet | Prix | Ouvre après | Vivier | Particularité |
| --- | --- | --- | --- | --- |
| **Paquet du Souk** | 140 ◈ | `listes-1` | **toutes les couleurs ouvertes** | 5 cartes, **1 rare garantie**, 8 % de mythique |
| **Coffret du Souk** | 10 × prix − 10 % = **1 260 ◈** | `listes-1` | celui du paquet | **+ 1 mythique assurée** sur les dix paquets |

« Ouvre après » se lit dans la règle D2 : c'est la **première victoire** qui
ouvre le comptoir. Le vivier suit ensuite les révélations : les cartes de Sable
et de Braise arrivent dès `listes-1`, l'Eau avec les citernes de `souk-1`, la
Neige avec `abysses-1` — mais **toutes se mélangent** dans le même paquet.
Seuils mesurés sur les données réelles, pas estimés.

Le vivier contient aussi **les communes et inhabituelles de la dotation**
(elles font le remplissage et paient en doublon) : sans elles, un paquet ne
serait fait que de rares et les mythiques n'auraient plus rien de rare. Un
vivier au début du jeu reste **petit** — 42 cartes après `listes-1`, dont
3 rares et aucune mythique — mais c'est exactement la mesure de la promesse :
on n'y vend que ce que la ville a déjà montré.

Le coffret ne se vend jamais seul : c'est « dix paquets du comptoir, d'un
coup », à 1 260 ◈ (1 400 ◈ moins 10 %).

### 4.2 Les quêtes du jour

Treize quêtes, trois paliers, une par palier et par jour. La seule garde est
celle du comptoir : elle n'est tirée que si **le comptoir du Souk est ouvert**
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
| Difficile | « Ouvrir le comptoir » | ouvrir 1 booster | 60 | `booster-ouvert` (**garde** : comptoir ouvert) |

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
    "exemplaires": { "tarek": 2 },       // stock payé à l'étal (D10) ; 1 = implicite, non écrit
    "etal": {                            // la sélection du jour, figée par la graine
      "jour": "2026-10-14",
      "cartes": ["tarek", "kraken", "scribe-de-la-liste", "ifrit-al-ahmar", "yamina"],
      "achetees": ["tarek"],             // une carte par jour et par achat (D10)
      "rafraichissements": 1
    },
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
| `bourse.exemplaires` | **maximum copie par copie** | deux appareils qui paient la même copie n'en créent pas deux ; un appareil en retard ne fait pas redescendre une carte de `2/2` à `1/2` (D10) |
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

Sept modules purs (aucune dépendance au DOM, `rng` injectable), deux hooks,
trois composants, deux feuilles de style, les tests de chaque module et deux
vérifications d'interface. Les lignes **✅** du tableau sont celles du **lot 1,
livré** ; les autres sont les lots 2 à 5.

| Fichier | Rôle | Vérifié par |
| --- | --- | --- |
| ✅ `src/games/rpgHasard.js` | hasard semé : `graineNumerique` (FNV-1a), `rngSeme` (mulberry32), `tirerIndex`, `tirerParmi`, `choixPondere`, `melanger` | `tests/rpg-hasard.test.js` |
| ✅ `src/games/rpgCredits.js` | portefeuille : normalisation, gains, dépense, barème des doublons, **stock d'exemplaires** (D10), pitié, fusion, stockage | `tests/rpg-credits.test.js` |
| ✅ `src/games/rpgQuetes.js` | pool, tirage semé, journée monotone, progression, réclamation, Cachet, fusion | `tests/rpg-quetes.test.js` |
| ✅ `src/games/rpgBoosters.js` | comptoir, viviers mélangés ouverts par les marches (D2), `tirerCartes`, `ouvrirBooster`, `ouvrirCoffret`, prix du coffret | `tests/rpg-boosters.test.js` |
| ✅ `src/games/rpgSoukDirect.js` | l'**étal du jour** : tirage semé de cinq rares/mythiques, rafraîchissement unique, prix à l'unité, quota d'exemplaires (D10), vue de carte | `tests/rpg-souk-direct.test.js` |
| ✅ `src/games/RpgCardCopyBadge.jsx` | la pastille de stock : `×2` seul, `1/2` avec le quota du deck, voix comprise | `scripts/rpg-souk-ui-check.mjs` (gardes de source) |
| ✅ `src/games/rpgCollection.js` | révélations d'étage, **gel des acquis** (D9), sources de la collection | `tests/rpg-collection.test.js` |
| ✅ `src/games/rpgDeckBuilder.js` | la fusion de compte transporte les acquis, gel compris | `tests/rpg-deck-builder.test.js` |
| ✅ `src/games/useDecksSablier.js` | pose le gel au montage, pousse les acquis, `noterVictoireEtage` ouvre les cartes | `scripts/rpg-story-narrative-smoke.jsx` |
| ✅ `src/games/rpgEvenementsDuel.js` | le **contrat d'événements** : normalisation, ce qui paie, ce qui compte | `tests/rpg-evenements.test.js` |
| ✅ `src/games/useSablierBourse.js` | état React + fusion + poussée au compte, patron de `useDecksSablier.js` | `scripts/rpg-souk-bourse-smoke.jsx` |
| ✅ `scripts/rpg-souk-bourse-smoke.jsx` + `scripts/rpg-souk-bourse-check.mjs` | le hook monté dans jsdom (jour, gains, réclamation, rechargement) + les gardes de source | `npm run check:rpg-souk-branche` |
| ✅ `src/games/RpgSouk.jsx` | l'écran : la bourse, les quêtes, les Cachets, le **paquet en volume qui est le bouton d'achat**, le journal | `scripts/rpg-souk-smoke.jsx` |
| ✅ `src/games/RpgQuetesDuJour.jsx` | le panneau des quêtes du jour dans l'onglet **Jouer** (barres, montants, encaissement, chemin du Souk) | `scripts/rpg-souk-smoke.jsx` |
| ✅ `src/games/rpg-quetes-jour.css` | l'habit du panneau : carte de laiton, barres lisibles, appel quand c'est prêt | `scripts/rpg-souk-ui-check.mjs` (garde-fous de source) |
| ✅ `src/games/rpg-souk.css` | mise en page, **volume des paquets** (perspective, faces, reflet), `prefers-reduced-motion`, portrait étroit, tactile | `scripts/rpg-souk-ui-check.mjs` (garde-fous de source) |
| ✅ `scripts/rpg-souk-smoke.jsx` + `scripts/rpg-souk-ui-check.mjs` | l'écran monté dans jsdom **branché au vrai hook** (journée, barres, réclamation, Cachets, comptoir, achat, cérémonie, coffret, journal, série) + les gardes de source du menu | `npm run check:rpg-souk-ui` |
| ✅ `src/games/RpgBoosterOuverture.jsx` | la cérémonie des cinq cartes (et du coffret) | le même smoke |

**Ce que les modules exportent** — le contrat réel, celui que les tests
tiennent (aucun `fusionnerBourses` : le portefeuille et les quêtes se fusionnent
chacun chez soi, le hook appelle les deux) :

```js
// rpgHasard.js
graineNumerique(texte) -> uint32 · rngSeme(graine) -> () => [0,1[
tirerIndex(liste, rng) · tirerParmi(liste, rng) · choixPondere(paires, rng, defaut) · melanger(liste, rng)

// rpgCredits.js
BAREME_DOUBLON = { commune: 12, inhabituelle: 20, rare: 45, mythique: 120 }
GAINS = { etagePremiere: 50, etageRejoue: 10, tourTerminee: 200, duelLibre: 8, cachetDuCycle: 80 }
RPG_BOURSE_STORAGE_KEY = 'letsplay_sablier_bourse_v1'
portefeuilleVide() · normaliserPortefeuille(v)   // le portefeuille porte `toursPayees`
creditsDeVictoire({ mode, premiere }) · creditsDeDoublons(ids)
reclamerButinTour(p, tourId) -> { ok, raison, gain, portefeuille }   // une fois par tour
gainsDeTour(tourId, { etagesVaincus, toursPayees })   // l'affiche des tours : barème et acquis
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
TAUX = { cartes: 5, communes: 0.88, rareGarantie: 1, mythique: 0.08, pitie: 12, nouvellesMin: 3 }
COFFRET = { taille: 10, remise: 0.1, mythiqueAssuree: true } · RAYONS (1) · COULEURS_SOUK
rayonParId(id) · prixCoffret(rayonId) · toursEntamees(progression) · tourIntroduction(cardId)
carteAuVivier(cardId, progression) · cartesOuvertes(progression) · etagesOuverts(progression)
couleursOuvertes(progression)
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
3. **Le comptoir** — un seul booster en volume (un sachet scellé de trois
   quarts, au laiton du Souk) qui **est lui-même le bouton d'achat**, avec une
   ligne de taux, « N cartes sur M vous manquent encore », et le motif du refus
   écrit noir sur blanc (solde insuffisant, comptoir fermé).

L'écran dit si **le comptoir est ouvert** — il s'ouvre à la première victoire,
puis son vivier suit les marches que vous montez. C'est la règle D2 rendue
visible, et c'est ce qui répond à la question du joueur devant un paquet éteint.

**Ce que le lot 4 a livré** : les boosters et la cérémonie. Le **paquet** (5
cartes, une rare garantie) et le **coffret** (10 paquets, −10 %, une mythique
assurée) s'achètent sur le comptoir, la tuile annonçant son prix, sa ligne
de taux, ce qui manque encore au vivier, et le motif du refus (« Il manque
140 ◈ », « le Souk ouvrira à votre première victoire »). L'ouverture est la
seule chose qui reste à regarder : cinq cartes retournées une à une, la **rare
garantie** en quatrième, la cinquième pour la mythique, tamponnées
**Nouvelle** ou « déjà possédée · +22 ◈ », avec **Passer** pour les gens pressés
et **Tout ranger dans la collection** qui rend la main. Les cartes sont écrites
sur l'appareil **avant** la cérémonie : fermer l'onglet au milieu d'un
retournement ne coûte rien.

**Le paquet, en volume.** Le comptoir ne vend plus son booster par un bouton
posé à côté : le paquet **est** le bouton. Un sachet scellé de trois quarts —
cinq faces (`--avant`, `--dos`, `--tranche`, `--dessus`, `--dessous`) montées
autour d'un pavé large × haut × épais, sous une `perspective`, avec les deux
**sertissages** écrasés d'un sachet thermoscellé, la rune `⌛`, le nom du
comptoir, ce qu'il contient (« 5 cartes », « 1 rare garantie ») et une étiquette
**Acheter · 140 ◈** bordée d'or. Trois choses le font vivre : un **balancement
lent** (7,5 s), un **reflet qui glisse** sur le métal toutes les 6,5 s, et le
paquet qui **se redresse et se soulève** au survol comme au focus clavier. Le
paquet a sa teinte de laiton (`--foil-1/2`, `--foil-ink`, `--foil-shine`), un
comptoir fermé affiche un paquet **éteint** (désaturé, immobile, réduit de
6 %), et `prefers-reduced-motion` coupe le balancement comme le reflet — le
volume reste, le mouvement s'en va.

Ce choix tranche deux choses. D'abord **un seul prix par tuile** : le badge de
l'en-tête a disparu, c'est l'étiquette du paquet qui le porte. Ensuite **un
seul geste d'achat** : le bouton texte « Ouvrir · 140 ◈ » qui doublait le paquet
a été retiré — deux boutons pour la même dépense, c'était deux façons de se
tromper. Le coffret, lui, reste un bouton à part : c'est **une autre** dépense
(dix paquets, remise, mythique assurée). L'accessibilité n'y perd rien : le
paquet est un `<button>` qui porte `aria-label="Ouvrir le paquet du Souk · 140
crédits"`, la scène 3D ne porte que le décor (`aria-hidden`), le focus clavier
l'entoure et le soulève, et son étiquette s'écrit toujours 140 ◈ en clair.

**Les quêtes du jour dans l'onglet Jouer.** La colonne de droite du menu — la
grille `.rpg-mode-menu__play` avait **déjà** deux colonnes, la seconde attendait
son contenu — porte le panneau des quêtes du jour : les trois quêtes avec leur
palier, leur barre, leur montant frappé de la pièce, et le bouton **Réclamer**
qui s'allume dès que l'objectif est atteint (« Encore 2. » tant qu'il ne l'est
pas). En dessous, le **Cachet du cycle** (qui appelle quand les trois y sont
passées), la **série** (« 3 jours d'affilée — Cachet de la semaine dans 4
jours », et son bouton au septième), puis le **solde** et le chemin vers le Souk
— parce qu'une récompense qu'on ne peut pas dépenser ne donne envie de rien.
Sous 820 px, la grille repasse à une colonne et le panneau passe sous le héros :
aucune règle de mise en page n'a été ajoutée pour ça.

Ce que le panneau **ne fait pas** : il n'ajoute ni règle ni compteur. Il lit
`vueDeLaQuete(etat, id)` — la vue partagée exportée par `rpgQuetes.js`, que
l'écran du Souk utilise aussi : mêmes barres, mêmes montants, mêmes états
(`encours`, `terminee`, `reclamee`), donc les deux écrans ne peuvent pas se
contredire. Réclamer dans le panneau paie exactement ce que paie le Souk, parce
que c'est **le même geste du hook** (`reclamerUneQuete`, `reclamerLeCachet`,
`reclamerLeCachetDeLaSemaine`) — le smoke le prouve en encaissant une quête et
le Cachet **depuis le panneau**, puis en relisant le Souk.

**La pièce du crédit.** Le losange `◈` reste la façon d'**écrire** la monnaie —
docs, commentaires, `aria-label` — mais à l'écran c'est une **pièce frappée or**
qui s'affiche : un losange taillé à quatre facettes, les arêtes du dessus prises
dans la lumière, un centre gravé, une étincelle et un halo. Elle se dimensionne
toute seule (`1em`) : 11 px dans une ligne de récompense, 14 px sur l'onglet du
menu, 22 à 30 px à côté du solde — et c'est la grande qui **respire**
(`anime`), parce que c'est elle qu'on regarde avant de descendre au Souk. Elle
est **décorative** (`aria-hidden`) : partout où elle sert, le mot « crédits » est
déjà là — un `aria-label` sur le solde et sur l'onglet, un `title` sur les
boutons, un `.sr-only` dans les lignes de quête — donc rien n'est lu deux fois.
`creditsLisible` a suivi le mouvement : le format des montants (`1 240`) vit
maintenant avec les règles, dans `rpgCredits.js`, parce que trois écrans
l'affichent.

**Ce que le lot 3 a livré** : les trois premiers points, **sans** les boosters.
La bourse, les quêtes et le Cachet sont jouables ; la section du comptoir
attendait le lot 4. Le jeton du lot 2 a quitté sa pastille à part pour
**l'onglet lui-même** — mêmes chiffres, un seul endroit à lire — et l'onglet
porte la pastille des réclamations dues.

Trois détails tenus au passage : le bouton **Réclamer** est désactivé tant que
l'objectif n'est pas atteint, et il écrit ce qu'il reste (« Il reste 4 à
faire ») ; le compte à rebours du cycle se rafraîchit tout seul, sans dépendre
d'une animation ; et l'écran **ne touche à aucun stockage** — il reçoit des états
et rend des gestes, tout passe par `useSablierBourse`.

**La cérémonie d'ouverture** : une nappe plein écran, les cinq cartes se
retournent une à une (la rare garantie en quatrième, la cinquième pour la
mythique), tampon **NOUVELLE** ou **déjà possédée → +22 ◈**, total encaissé,
puis **« Tout ranger dans la collection »**
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
| Combien de cartes dans le jeu ? | 144 entrées au catalogue, terrains compris ; la dotation et les révélations en couvrent 118, dont **105 cartes jouables** entrent au vivier du Souk |
| Ce que le joueur possède sans jouer | **49 cartes** — la dotation de départ (communes et inhabituelles, Ténèbres exclues) |
| Ce qu'un étage donne après D9 | des crédits (50 ◈ au premier déblayage) et le récit ; ses cartes deviennent **achetables** |
| Ce qu'un booster ajoute | de l'**avance** dans une tour déjà ouverte, du **choix**, et des **mythiques** hors boss |
| Une journée de jeu | 250–310 ◈ ⇒ deux boosters, ≈ 10 cartes dont **6 neuves** quand le vivier suit |
| Boucler la collection | **≈ 37 paquets** une fois toutes les marches révélées, ≈ **3 500 ◈ nets** (les doublons remboursent), soit ≈ 12 journées à 280 ◈/jour |
| Prix d'un coffret | 1 260 ◈ — quatre journées et demie, une mythique assurée |

**Le Cachet de la semaine (lot 5) déplace la moyenne de 4 %** : +80 ◈ tous les
sept jours d'affilée, soit ≈ +11 ◈ par jour. Le rythme tenu — « environ deux
paquets par jour » — ne bouge pas (280 → 291 ◈). C'est la seule ligne du
calibrage que ce chantier a touchée, et c'est pour récompenser l'habitude
quotidienne : la série ne se rattrape pas (D6).

**Ce que le Souk ne fera pas** : vendre une carte d'une tour où le joueur n'est
pas encore entré, vendre un deck complet, ni créer une troisième monnaie. Et le joueur qui n'y met jamais les
pieds ne perd **rien** de ce qui existe aujourd'hui : il garde ses acquis gelés,
la dotation, et les étages continuent de lui révéler la ville — simplement, il
les paiera plus tard.

## 9. Le chantier, découpé en lots

| Lot | Contenu | Livrable vérifiable | Fichiers |
| --- | --- | --- | --- |
| **0** | **ce document**, validé | le dossier relu et tranché | `docs/rpg/13-…md`, `docs/rpg/README.md` |
| **1 ✅ livré** | les règles pures | quatre suites vertes (**41 tests**), **invisible pour le joueur** | `rpgHasard.js`, `rpgCredits.js`, `rpgQuetes.js`, `rpgBoosters.js`, `tests/rpg-*.test.js`, `package.json` |
| **1bis ✅ livré** | **les étages ne donnent plus de cartes** (D9) : révélations, gel des acquis, vivier refait, écrans réalignés | **428 tests verts** (4 suites préexistantes sans `jsdom`/`three`), dotation d'un joueur neuf = 38 cartes à la livraison, 49 aujourd'hui après le reclassement du Sonneur fêlé | `rpgCollection.js`, `rpgBoosters.js`, `rpgDeckBuilder.js`, `useDecksSablier.js`, `RpgStoryScene.jsx`, `RpgDeckAtelier.jsx`, tests, docs 06/09/10/13 |
| **2 ✅ livré** | les gains branchés | **475 tests verts** ; le solde et la pastille sont dans l'en-tête du menu, et l'événement est émis | `RpgDuelPage.jsx`, `useSablierBourse.js`, `rpgEvenementsDuel.js`, `rpg-souk-bourse-*` |
| **3 ✅ livré** | l'écran Souk | **475 tests verts** + le smoke de l'écran ; sixième onglet, solde et pastille dessus, trois quêtes réclamables, Cachet du cycle, comptoir annoncé | `RpgSouk.jsx`, `rpg-souk.css`, `rpg-mode-menu__souk` (dans `rpg-battle.css`), `RpgDuelPage.jsx`, `scripts/rpg-souk-*` |
| **4 ✅ livré** | les boosters | **475 tests verts** + le smoke de l'écran ; paquet et coffret achetables, cérémonie des cinq cartes, doublons remboursés, cartes rangées dans la collection, poussée au compte **entière** | `RpgBoosterOuverture.jsx`, `RpgSouk.jsx`, `useSablierBourse.js`, `useDecksSablier.js`, `rpg-souk.css` |
| **5 ✅ livré** | le fini | **482 tests verts** + le smoke ; le Cachet de la semaine (sept jours d'affilée), le journal des vingt dernières ouvertures, le portrait étroit des six onglets, et le son branché sur la préférence du joueur | `rpgQuetes.js`, `rpgCredits.js`, `RpgSouk.jsx`, `rpg-souk.css`, `rpg-battle.css` |
| **6** *(plus tard)* | les **cartes du Souk** — un set dédié, hors des Tours, achetable seulement au Souk | contenu + art, hors de ce chantier | `rpgCards.js`, `public/cards/` |

Le lot 1 est **livré** — et il était bien mergéable seul : il n'ajoute que des
modules purs et des tests, ne touche à aucun écran (seuls `package.json` et
l'index du dossier ont bougé), et il fige les règles sur lesquelles les lots
suivants s'appuient. Le lot 2 est **livré** aussi : ce qui se gagne dans les
Tours est maintenant compté, gardé et montré, et l'économie suit le joueur d'un
appareil à l'autre. Le lot 3 est **livré** : le joueur peut ouvrir le Souk,
voir sa bourse, ses trois quêtes du jour et son Cachet, et se faire payer. Le
lot 4 est **livré** aussi : la boucle complète tourne — jouer paie, les quêtes
avancent, le Souk vend, les cartes entrent dans la collection. Il ne reste au
lot 5 que le fini.

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
   l'étage était vraiment neuf. Le **butin de la tour** (+200 ◈, tous les
   étages déblayés) suit la même règle : il voyage avec `duel-gagne`
   (`tourComplete`, raconté par l'écran qui lit la progression après la
   victoire), jamais dans un événement à part, et sa garde d'unicité vit dans
   le portefeuille (`toursPayees`) — pas au point d'appel.
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

**Le lot 3 a tranché deux choses** :

1. **Le jeton vit sur l'onglet du Souk**, pas à côté. Un solde affiché deux fois
   finit par diverger — et l'onglet est le seul endroit d'où l'on peut agir.
   Au téléphone, l'icône ◈ disparaît et le chiffre reste : le libellé et le
   montant tiennent dans la largeur d'un onglet de 320 px.
2. **L'écran est présentationnel, et le smoke le vérifie branché au vrai hook.**
   `RpgSouk` ne connaît ni le stockage ni les crédits : il reçoit `quetes`,
   `credits` et deux gestes. Le smoke le monte **avec** `useSablierBourse`, joue
   la journée par les gestes du contrat et clique les boutons dans le DOM — donc
   il mesure ce que le joueur voit (la barre qui se remplit, le bouton qui
   s'active, le solde qui monte), pas l'état interne.

**Ce que le lot 1bis a appris** — trois corrections que le code a imposées, et
qui valent d'être retenues :

1. **La dotation ouvre tout si on la laisse compter.** Ses 40 communes et ses
   9 inhabituelles couvrent les quatre couleurs : la première version de
   `rayonOuvert` ouvrait le comptoir dès le premier jour. Ne comptent que les
   cartes **révélées**.
2. **« L'étage suivant » était un contresens** : la règle est « l'étage est
   vaincu, **ou** son étage précédent l'est » — autrement dit, *la marche
   suivante est ouverte*. Écrite à l'envers, elle n'ouvrait rien.
3. **La garantie des nouvelles ne suffisait pas à compléter la collection** :
   les dernières mythiques ne sortaient que de la cinquième carte, et boucler
   le set demandait ~400 paquets. Une seule place promue vers le haut ramène ça
   à une quarantaine — **≈ 37 mesurés** avec la mythique à 8 %. Ce n'est pas un
   détail d'équilibrage, c'est ce qui rend le Souk praticable.

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
npm run check:rpg-souk-ui        # l'écran monté dans jsdom + les gardes du menu
npm run check:rpg-souk           # les sept d'affilée
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
  le duel libre 8 ◈, la défaite 0 ; le butin de la tour (+200 ◈) accompagne
  `duel-gagne` quand la victoire trouve la tour complète, ne se verse qu'**une
  fois par tour** (`toursPayees`), exige le mode Histoire et une tour du
  catalogue ; `etage-deblaye` ne paie rien, butin compris ; un geste sans
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
- **écran monté (lot 3)** — le smoke monte `RpgSouk` **avec** le vrai hook :
  l'écran se rend, il annonce trois quêtes, le Cachet attend, le comptoir se
  dit « à venir », et rien ne s'affiche à réclamer le premier jour ; chacune
  des trois quêtes commence **en cours**, son bouton **désactivé** et disant ce
  qu'il reste ; les gestes du contrat remplissent la barre jusqu'à
  `objectif/objectif`, le bouton s'active et annonce son montant ; un clic
  encaisse **exactement** la récompense annoncée, la carte passe à « réclamée »
  et le bouton disparaît (on ne paie pas deux fois) ; les trois réclamées
  ouvrent le Cachet, qui paie ses 80 ◈ et se referme ; le bandeau compte ce qui
  reste et s'efface à zéro ; les montants se lisent avec leur espace fine
  (`1 240 ◈`) et le cycle se dit en heures et minutes ; le son d'encaissement et
  celui du retour sont émis. Aucune assertion ne dépend d'une minuterie ;
- **achat et cérémonie (lot 4)** — le smoke clique **Ouvrir** dans le DOM et
  suit l'argent : le solde vaut le solde d'avant moins le prix **plus** ce que
  les doublons rendent, les cinq cartes rejoignent le portefeuille, la
  cérémonie s'ouvre face cachée, **Passer** retourne les cinq d'un coup, les
  tampons **Nouvelle** comptent exactement ce que le tirage a donné, la somme
  des remboursements affichés égale celle du portefeuille, aucune carte n'est en
  double, et **Tout ranger** referme la cérémonie en laissant la collection
  grandie (le comptoir annonce moins de cartes manquantes) ; le **coffret** est
  acheté sur une bourse semée : dix paquets, cinquante cartes posées d'un bloc,
  **aucune face cachée**, une mythique sortie, chaque paquet sans doublon ;
  un comptoir fermé refuse l'achat (`rayon-ferme`) **sans toucher un seul
  crédit**, et un comptoir ouvert sans solde désactive son bouton en disant ce
  qui manque ;
- **le paquet en volume (lot 4)** — le smoke interroge le DOM du paquet :
  `data-souk-paquet` vaut `souk` (le paquet n'a plus de couleur propre), les
  **cinq faces** sont là, les **deux sertissages** aussi, la rune du Sablier est
  marquée, le nom est celui du comptoir, l'étiquette s'écrit `Acheter · 140 ◈`,
  l'`aria-label` dit « Ouvrir le paquet du Souk · 140 crédits », la scène 3D est
  `aria-hidden`, **aucun** bouton texte ne double le paquet
  (`data-souk-ouvrir-bouton` n'existe plus). Les gardes de source tiennent le
  reste : `data-souk-ouvrir={rayon.id}`, le `preserve-3d`, les `translateZ(`, le
  `rotateY(24deg)`, le reflet et le balancement nommés, la
  `backface-visibility: hidden`, **un seul** prix par tuile (plus de
  `rpg-souk__rayon-prix`) et le balancement coupé sous
  `prefers-reduced-motion` ;
- **les gestes du duel, et l'ordre dans lequel le Souk les apprend** — un
  correctif qui vient de la fusion avec `main`, et qui a révélé un bug. La bourse
  vit dans la même page que le plateau : appeler `noterEvenementDuel` **avant**
  `force()` fait passer le rendu du champ en tâche de fond, et la table montre
  encore l'ancien état juste après le clic (constaté par `check:rpg-preview` —
  `rpgJouerCreature` rendait `ok: true` et la créature n'apparaissait qu'à la
  macrotâche suivante). Les quatre gestes (terrain, sort, créature, arme) sont
  donc racontés **après** le rendu. Au passage, trois d'entre eux passaient la
  carte en abrégé — `{ type: 'creature-invoquee', cardId }` — alors que le
  paramètre s'appelle `carteId` : un **`ReferenceError` silencieux** (React le
  signale sans casser le geste), qui privait les quêtes du sort, de la créature
  et de l'arme de leur progression depuis le lot 2. Corrigé, et gardé par deux
  règles de source : aucun événement ne passe sa carte en abrégé, et les quatre
  gestes sont racontés après `force()` ;
- **la pièce du crédit** — le smoke vérifie qu'elle est frappée (six polygones et
  plus : corps, quatre facettes, biseau, marque de frappe), qu'elle porte son
  étincelle et son halo, que son or est un dégradé, que le grand solde respire
  (`is-anime`), qu'elle est `aria-hidden`, et que **deux pièces ne partagent pas
  leurs dégradés** — sans quoi le navigateur résoudrait le second `url(#…)` vers
  le premier dessiné. Les gardes de source tiennent les quatre endroits où elle
  s'affiche (solde, récompense de quête, refus du comptoir, journal), le mot
  « crédits » en `.sr-only`, la taille `1em`, le `prefers-reduced-motion` qui
  l'apaise sans la faire disparaître, et l'absence du losange de texte dans les
  trois écrans (`RpgSouk`, `RpgBoosterOuverture`, `RpgDuelPage`) ;
- **les quêtes du jour dans l'onglet Jouer** — le smoke monte le panneau à côté
  de l'écran du Souk, **avec le même hook** : il vérifie que les deux écrans
  annoncent le même solde et le même état de quête, que la barre du panneau se
  remplit quand celle du Souk se remplit, que le bouton d'encaissement apparaît
  au même moment, qu'une quête réclamée **depuis le panneau** paie le montant du
  barème et que le Souk le voit, que le **Cachet du cycle** se réclame de la même
  façon des deux côtés, et que le panneau mène au Souk (son compris). Les gardes
  de source tiennent le reste : le panneau est monté dans la branche `jouer`,
  il reçoit les trois gestes du hook et `onChangeScreen('souk')`, il lit la vue
  partagée, il n'écrit aucun montant à la main (`GAINS` s'en charge), il ne
  touche à aucun stockage, l'écran du Souk n'a plus de vue des quêtes à lui, et
  la grille du menu garde ses deux colonnes (une seule sous 820 px) ;
- **série et journal (lot 5)** — quinze jours d'affilée ouverts un par un : la
  série suit, le Cachet de la semaine paie au **septième** et au
  **quatorzième** jour, jamais entre les deux, et jamais deux fois le même jour ;
  une série de quatre ne se réclame pas même en annonçant sept (mais un état en
  retard sur une série réelle se rattrape) ; la nouvelle journée rouvre le
  Cachet de la semaine et laisse la série continuer ; un champ illisible ne vaut
  pas une semaine réclamée. Le **journal** garde la plus récente en tête, refuse
  un comptoir inconnu, une carte inconnue et une ouverture vide, se borne à vingt
  entrées, dédoublonne ce que le compte renvoie, et se fusionne sans doublon ;
  une ouverture sans cartes fait avancer les compteurs **sans** écrire au
  journal ;
- **boosters** — un seul paquet, cinq cartes distinctes, toutes du vivier
  mélangé (les quatre couleurs de l'Histoire sortent sur 300 paquets, et aucun
  paquet n'est monochrome), rare garantie à la quatrième carte, 8 % de mythique
  à la cinquième, pitié qui **force** la mythique au douzième paquet (et qui ne
  compte pas avant que le vivier n'ait une mythique), taux mesurés sur dix mille
  ouvertures semées (12,6 % en moyenne, jamais plus de onze paquets secs),
  **vivier qui suit les marches** (aucune carte du Fjord avant d'y être entré,
  la marche suivante ouverte par la précédente), garantie des trois nouvelles
  adaptée à ce que le vivier offre, doublons remboursés au barème, achat refusé
  sans solde ni devant un comptoir fermé, coffret à dix paquets avec remise et
  mythique assurée ;
- **collection (lot 1bis)** — chaque révélation nomme une carte réelle hors
  dotation et sans doublon, dotation + révélations couvrent les 118 entrées révélées du catalogue (dont 105 cartes jouables, terrains exclus),
  **gagner un étage ne donne plus rien** (la collection d'un joueur neuf est
  exactement la dotation), la collection grandit par les acquis / le Souk / le
  compte, le **gel** reprend une fois exactement les cartes de l'ancienne règle
  puis ne bouge plus, il se sauvegarde et se relit, et les quatre couleurs
  entrent dans l'ordre de la campagne.

- **l'étal à l'unité et son stock (D10)** — cinq cartes distinctes tirées du jour
  et de la graine (stables au rechargement, différentes le lendemain), une rare
  et une mythique garanties, rafraîchissement unique qui ne répète aucune carte
  du premier tirage et ne coûte rien ; **150 ◈ la première copie d'une rare comme
  sa seconde**, 300 ◈ la mythique ; la copie déjà possédée une fois **s'achète**,
  la copie de trop est refusée (`quota-atteint`) **sans un crédit de débit** ;
  le stock s'écrit à la seconde copie et jamais à la première (valeur implicite
  `1`), il se borne au quota même si une sauvegarde déclare cinq mythiques, il ne
  fait pas exister une carte absente de la collection, il se fusionne au maximum
  copie par copie, et il traverse le stockage local ; la vue de l'écran tranche
  les quatre états (`disponible`, `achetee`, `complet`, `sans-solde`) dans le
  même ordre que l'achat, quota compris ; une carte héritée des Tours compte déjà
  son exemplaire avant même d'être rangée au portefeuille. Le smoke, lui, lit le
  DOM : `1/2` sur la pastille, le bouton qui nomme « le 2ᵉ exemplaire », la ligne
  « quota du deck atteint · 2/2 » une fois la copie payée, et **plus une seule
  carte qui dise « déjà possédée »** ;

## 11. Risques et points ouverts

| Risque | Réponse |
| --- | --- |
| **Retirer les récompenses d'étage efface les cartes déjà gagnées** | le **gel des acquis** (D9) les reprend une fois, avant que quiconque puisse les perdre ; testé, y compris sur un compte à deux appareils dont un seul a migré |
| La collection est **dérivée** : oublier une source rendrait les cartes invisibles | une seule porte (`collectionJoueur`, quatre sources) + un test qui vérifie qu'une carte du Souk est bien possédée et jouable |
| L'économie écrase le rythme de la campagne | le vivier qui suit les marches (D2) + un test qui refuse une carte du Fjord à qui n'y est pas entré |
| **La collection se boucle en ≈ 37 paquets** et le Souk n'a plus rien à vendre | assumé : c'est exactement ce qui rend le lot 6 (set dédié) nécessaire — et les doublons paient en crédits d'ici là |
| Le solde donne envie de farmer les parties libres | 8 ◈ par duel libre, 10 ◈ par étage rejoué, et les quêtes restent le gros du revenu |
| Deux appareils, dépense hors ligne | fusion par maximum, compromis documenté (§4.4) — jamais de perte |
| Le monolithe `RpgDuelPage.jsx` | l'écran vit dans ses fichiers, la page ne gagne qu'une branche |

**Décisions prises** (elles ont débloqué les lots 1 et 1bis) :

1. **La monnaie s'appelle « crédits » (◈)** — le mot du demandeur. Le lore du
   dossier 04 passe des « dinars du courant » aux « crédits de la Chambre ».
2. **Le rythme quotidien est celui du dossier** : quêtes de 55 à 100 ◈, 80 ◈ de
   Cachet, 50 ◈ par premier étage, paquet à 140 ◈ — une journée pleine vaut
   **310 ◈ au maximum**, 250 à 280 en moyenne, soit deux paquets.
3. **Le Cachet du cycle vaut +80 ◈**, en crédits, pas en booster offert : une
   seule mécanique à expliquer.
4. **Les cartes du Souk (lot 6) attendent** : la boucle doit d'abord vivre en
   ligne avant qu'on lui ajoute un set dédié.
5. **Les Tours ne donnent plus aucune carte** — choix « retirer complètement »,
   exécuté **avant le lot 2** : trophées de boss compris, les mythiques d'étage
   aussi. Corollaire accepté : les Tours ne rendent plus que du récit et des
   crédits, et le Souk devient la seule voie d'acquisition.
6. **Le jeton de bourse vit sur l'onglet du Souk** : le solde ◈ y était dès le
   lot 2 (en attendant l'écran), l'onglet a pris le relais au lot 3 en gardant le
   même chiffre et la même pastille. Un seul endroit à lire, et c'est celui qui
   mène à l'écran.
7. **L'économie voyage avec le compte dès maintenant**, pas au lot 4 : les deux
   hooks poussent **le même état entier**, chacun relisant le stockage local de
   l'autre au moment d'écrire. Sans ça, le premier enregistrement de deck aurait
   effacé les crédits — et c'est un bug qui n'aurait été vu qu'au lot 4.

8. **L'écran du Souk est présentationnel** : `RpgSouk.jsx` ne touche à aucun
   stockage et ne calcule aucun crédit — il reçoit `quetes`, `credits` et deux
   gestes de réclamation. C'est ce qui permet au smoke de le monter branché au
   vrai hook, et aux gardes de source de refuser toute persistance qui
   s'inviterait dans l'écran.
9. **Le comptoir est annoncé, jamais simulé** : tant que le lot 4 n'est pas
   là, la section dit qu'elle viendra au lieu d'afficher des paquets qui ne
   s'achètent pas.

10. **L'état du compte est poussé entier, toujours** : `etatLocalActuel()` est
   la seule fabrique de cet état, et les deux hooks passent par elle au moment
   d'écrire. Un `upsert` remplace la colonne — un état partiel efface ce qu'il
   ne porte pas.
11. **Les cartes du Souk sont achetées avant d'être montrées** : le portefeuille
   est écrit et poussé au compte dès l'achat, la cérémonie ne fait que les
   retourner. Fermer l'onglet en plein retournement ne coûte rien, et « Tout
   ranger » n'écrit rien de plus.
12. **Aucun prix, aucun taux, aucun barème dans l'écran** : `RpgSouk.jsx` et
   `RpgBoosterOuverture.jsx` lisent `rpgBoosters.js` et `rpgCredits.js`, et la
   garde de source refuse tout montant en dur dans l'écran. C'est ce qui permet
   de recalibrer l'économie sans toucher à un composant.

**Reste ouvert pour la suite** : les cartes du Souk (lot 6, **devenu la
priorité** puisque la collection se boucle en une semaine de jeu), une série de sept
jours récompensée (lot 5), et le moment où le **sable** du dossier 04 entre en
scène comme seconde devise — le portefeuille est déjà écrit pour l'accueillir.
Un écart à trancher aussi : le calibrage vise « ≈ 200 ◈ de quêtes » alors que le
maximum mesuré est 310 ◈ — la fourchette retenue est 250–280 en moyenne, à
réajuster si les parties réelles s'en écartent.
