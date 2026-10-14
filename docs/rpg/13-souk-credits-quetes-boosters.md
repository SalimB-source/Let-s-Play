# 13 — Le Souk : crédits, quêtes du jour, boosters

> Le Sablier a aujourd'hui **une seule source de cartes** : la dotation de départ
> et les récompenses d'étage. Ce document ajoute la **deuxième** : un Souk où
> l'on dépense des **crédits** gagnés en jouant — quêtes du jour, victoires,
> premières d'un étage — pour ouvrir des **boosters** de cinq cartes.
>
> Trois règles gouvernent le chantier : **rien ne se paie avec de l'argent
> réel**, **un booster ne court-circuite jamais le rythme des Tours** (pas d'Eau
> avant le Souk, pas de Neige avant les Abysses), et **tout ce qui est gagné est
> monotone** : une collection ou un solde ne redescendent jamais par accident,
> ni par synchronisation, ni par remontée d'horloge.

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

Le joueur qui ne fait que la campagne continue d'obtenir **toutes** les cartes
comme aujourd'hui, étage après étage : le Souk n'est pas un péage, c'est un
**raccourci choisi**. Celui qui veut un deck maison mono-Braise tout de suite,
ou qui n'a plus d'étage à portée, vient acheter au Souk.

## 2. Ce qui existe déjà, et sur quoi on se branche

| Brique existante | Ce qu'elle fait | Ce que le Souk en fait |
| --- | --- | --- |
| `rpgCollection.js` | collection **dérivée** : dotation + étages + apports du compte | gagne une quatrième source : les cartes du Souk |
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

### D2 — Un booster ne court-circuite pas la ville

La première rédaction disait « une carte dont la tour est **ouverte** ». Le code
a tranché autrement : dans *Le Sablier*, **la première marche de chaque tour est
toujours jouable** (`etageEstDebloque` rend `true` sur un premier étage, et
l'onglet Tours laisse entrer dans n'importe quelle tour) — « tour ouverte » ne
voulait donc rien dire. La règle réelle tient en deux phrases, vérifiées par
sonde sur la progression complète :

> **1. La tour doit être entamée.** Une carte n'entre dans un vivier que si au
> moins un étage de **sa tour d'introduction** est vaincu. La Tour des Listes,
> première de la ville, compte comme entamée dès le premier jour (c'est
> `RPG_STORY_TOURS[0]`). Aucun paquet ne vend une carte du Fjord avant que le
> joueur ait posé le pied dans le Fjord.
>
> **2. La couleur doit être entrée dans la ville.** Un rayon n'ouvre que si un
> étage vaincu a déjà rendu une carte de sa couleur.

Mesuré sur les données réelles : le rayon **Sable** ouvre avec `listes-1`, la
**Braise** avec `listes-2`, l'**Eau** avec `souk-2`, la **Neige** avec
`abysses-2`. La promesse du dossier (« le mono-Eau au seuil des Abysses, le
mono-Neige en entrant dans le Fjord ») tient donc **à l'intérieur du Souk
aussi**. Le grand étal (rayon « Souk ») ouvre avec la première couleur.

Ce que le rayon **peut** faire, en revanche : rendre les cartes **des étages à
venir de la tour déjà entamée**. C'est là toute l'utilité du Souk — un joueur
bloqué au 3ᵉ palier des Listes achète du Sable et reçoit ce que le 5ᵉ palier
gardait. Quand sa tour est terminée, le rayon peut afficher **« complet »** :
tout y est possédé, chaque carte paiera des crédits. Le Souk ne prétend jamais
vendre du neuf qu'il n'a pas.

### D3 — Un booster = cinq cartes, taux annoncés, jamais deux fois la même

| Emplacement | Tirage |
| --- | --- |
| Cartes 1 à 3 | 88 % commune · 12 % inhabituelle |
| Carte 4 | **rare garantie** |
| Carte 5 | 80 % rare · **20 % mythique** (30 % au grand étal) |

- Les cinq cartes d'un même paquet sont **distinctes** (tirage sans remise dans
  le vivier) : pas de « trois fois la même commune », jamais.
- **Garantie des nouvelles** : tant que le vivier contient au moins trois cartes
  que le joueur ne possède pas, **trois** des cinq le sont. L'échange se fait
  **vers le haut** — un doublon des trois premières places devient une carte
  neuve au moins aussi rare (la rare garantie et la carte 5 ne sont jamais
  touchées).
- **Compteur de pitié** : huit ouvertures consécutives sans mythique ⇒ la
  cinquième carte est mythique. Le compteur est **visible** dans le rayon
  (« prochaine mythique assurée dans N paquets »).
- Les taux sont **écrits** sur la fiche du rayon, **et la pitié se dit aussi** :
  elle relève la moyenne au-dessus du taux du paquet. Mesuré sur dix mille
  ouvertures semées : **24 % de mythiques** en moyenne sur un rayon thématique
  (20 % annoncés par paquet) et **32 %** au grand étal (30 % annoncés), avec
  **jamais plus de sept paquets secs d'affilée**. Le Souk affiche les deux
  chiffres : le taux du paquet et la moyenne tenue.
- Un rayon dont le vivier est **entièrement possédé** reste achetable, mais la
  fiche le dit : « rayon complet — chaque carte rendra des crédits ».

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

| Source | Crédits |
| --- | --- |
| Premier déblayage d'un étage | **+50 ◈** |
| Étage déjà déblayé, rejoué et gagné | +10 ◈ |
| Partie libre gagnée (sans étage) | +8 ◈ |
| Défaite | 0 ◈ |
| Quêtes du jour (trois) | ≈ 200 ◈ |
| Cachet du cycle (les trois terminées) | +80 ◈ |

Une journée pleine vaut donc ≈ 300–350 ◈, soit **deux boosters**. Aucun gain
n'est infini : la victoire d'un étage déjà déblayé ne vaut que 10 ◈, et le duel
libre 8 ◈ — farmer ne remplace pas une journée de quêtes.

## 4. Le contenu (données pures)

### 4.1 Les rayons du Souk

Prix calibrés pour qu'une journée de jeu vaille ~2 paquets, et pour que le
rayon thématique soit un peu plus cher que le générique.

| Rayon | Prix | Ouvre après | Vivier | Particularité |
| --- | --- | --- | --- | --- |
| **Braise** | 140 ◈ | `listes-2` | cartes de Braise des tours entamées | 1 rare garantie |
| **Sable** | 140 ◈ | `listes-1` | cartes de Sable des tours entamées | 1 rare garantie |
| **Eau** | 160 ◈ | `souk-2` | cartes d'Eau des tours entamées | 1 rare garantie |
| **Neige** | 160 ◈ | `abysses-2` | cartes de Neige des tours entamées | 1 rare garantie |
| **Souk** (mélange) | 180 ◈ | première couleur | toutes les couleurs entrées | 1 rare garantie **+ carte 5 à 30 %** |
| **Coffret du Cycle** | 10 × prix − 10 % | le rayon choisi | celui du rayon choisi | **+ 1 mythique garanti** sur les dix paquets |

Chaque vivier contient aussi **les communes et inhabituelles de la dotation**
(elles font le remplissage et paient en doublon) : sans elles, un paquet ne
serait fait que de rares et les taux annoncés ne voudraient plus rien dire.

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

Stockage local : `letsplay_sablier_bourse_v1` et `letsplay_sablier_quetes_v1`.
Le même contenu voyage dans le `state` du compte (`rpg_sablier_progress`) :

```jsonc
{
  "decks": [ /* inchangé */ ],
  "supprimes": [ /* inchangé */ ],
  "collection": [ /* inchangé */ ],
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
| `bourse.cartes` | **union** | une carte gagnée ne se perd jamais |
| `bourse.credits` | **maximum** | on ne fait pas disparaître un solde |
| `bourse.ouvertures` / `pitie` | maximum, appariés | la pitié la plus avancée : la règle est généreuse |
| `quetes.jour` | **le jour le plus récent** | le temps ne recule pas |
| `quetes.progres` (même jour) | **maximum par quête** | deux appareils additionnent la même journée |
| `quetes.reclamations` | **union** | on ne paie pas deux fois, on ne retire jamais un dû |
| `quetes.serie` | maximum | idem |

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
| ✅ `src/games/rpgBoosters.js` | rayons, viviers bornés, `tirerCartes`, `ouvrirBooster`, `ouvrirCoffret`, prix du coffret | `tests/rpg-boosters.test.js` |
| `src/games/useSablierBourse.js` | état React + fusion + poussée au compte, patron de `useDecksSablier.js` | couvert par le smoke |
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
ajouterCartesAuPortefeuille(p, ids) · enregistrerOuverture(p, { mythique })
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
carteAuVivier(cardId, progression) · couleursRapportees(progression) · tourQuiGarde(couleur)
vivierRayon(rayonId, progression) · rayonOuvert(rayonId, progression)
etatRayon(rayonId, progression, collection) · etatRayons(...) · rayonsOuverts(...)
tirerCartes({ rayonId, progression, collection, rng, pitie })
ouvrirBooster({ portefeuille, rayonId, progression, collection, rng })
ouvrirCoffret({ portefeuille, rayonId, progression, collection, rng }) · etageIntroduction(cardId)
```

Trois choix d'implémentation que le code a tranchés, et qui valent d'être
connus avant d'écrire les lots suivants :

- **`collection` est optionnelle partout.** Sans elle, les modules prennent
  `collectionJoueur({ progression })` — la collection dérivée. Le hook, lui,
  passera la collection effective (celle qui compte les cartes du Souk) : c'est
  la seule façon pour qu'un doublon soit reconnu comme tel juste après l'avoir
  gagné.
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
| Ce que la campagne donne aujourd'hui | **99 / 99** — la dotation plus les vingt étages |
| Ce qu'un booster ajoute | de l'**avance** dans une tour déjà ouverte, du **choix**, et des **mythiques** hors boss |
| Une journée de jeu | ≈ 300–350 ◈ ⇒ deux boosters, ≈ 8 cartes dont 4 à 6 nouvelles |
| Une tour de cinq étages | ≈ 4 à 6 journées pour en sortir avec le premier déblayage (250 ◈) plus les récompenses |
| Prix d'un coffret | 1 260 ◈ (Braise/Sable) — quatre journées, une mythique assurée |

**Ce que le Souk ne fera pas** : vendre une carte avant sa tour, vendre un deck
complet, ni créer une troisième monnaie. Et le joueur qui n'y met jamais les
pieds ne perd **rien** de ce qui existe aujourd'hui : les vingt étages rendent
toujours les mêmes cartes.

## 9. Le chantier, découpé en lots

| Lot | Contenu | Livrable vérifiable | Fichiers |
| --- | --- | --- | --- |
| **0** | **ce document**, validé | le dossier relu et tranché | `docs/rpg/13-…md`, `docs/rpg/README.md` |
| **1 ✅ livré** | les règles pures | quatre suites vertes (**41 tests**), **invisible pour le joueur** | `rpgHasard.js`, `rpgCredits.js`, `rpgQuetes.js`, `rpgBoosters.js`, `tests/rpg-*.test.js`, `package.json` |
| **2** | les gains branchés | gagner un étage crédite le solde, l'événement est émis, badge sur l'onglet | `RpgDuelPage.jsx`, `useSablierBourse.js` |
| **3** | l'écran Souk | la bourse, les quêtes, la réclamation — sans les rayons | `RpgSouk.jsx`, `rpg-souk.css`, smoke |
| **4** | les boosters | achats, ouverture, doublons, cartes rangées dans la collection, poussée au compte | `RpgBoosterOuverture.jsx`, `rpgBoosters.js`, `useSablierBourse.js` |
| **5** | le fini | sons, plein écran, portrait étroit, série de 7 jours, journal des ouvertures | `rpgAudio.js`, `rpg-mobile.css`, docs |
| **6** *(plus tard)* | les **cartes du Souk** — un set dédié, hors des Tours, achetable seulement au Souk | contenu + art, hors de ce chantier | `rpgCards.js`, `public/cards/` |

Le lot 1 est **livré** — et il était bien mergéable seul : il n'ajoute que des
modules purs et des tests, ne touche à aucun écran (seuls `package.json` et
l'index du dossier ont bougé), et il fige les règles sur lesquelles les lots
suivants s'appuient. Les lots 2 à 4 sont chacun démontrables au joueur.

**Ce que le lot 1 a appris** (et qui a modifié ce dossier) : la règle du vivier
a dû être réécrite (D2), la pitié relève la moyenne des mythiques au-dessus du
taux annoncé (D3), la quête du comptoir exige une garde que les quêtes de
couleur n'exigent pas, et le pool des quêtes compte **treize** entrées, pas
douze.

**La reprise du monolithe** : `RpgDuelPage.jsx` fait 283 Ko et ne doit pas
grossir de l'écran du Souk. La page ne reçoit **que** l'onglet, le badge,
l'appel `noterEvenementDuel` et le rendu `<RpgSouk … />` ; tout le reste vit dans
ses propres fichiers, comme `RpgDeckAtelier.jsx` l'a fait avant lui.

## 10. Vérifications

Le lot 1 se vérifie en quatre commandes (agrégées par `check:rpg-souk`) :

```bash
npm run check:rpg-hasard     # node --test tests/rpg-hasard.test.js
npm run check:rpg-credits    # node --test tests/rpg-credits.test.js
npm run check:rpg-quetes     # node --test tests/rpg-quetes.test.js
npm run check:rpg-boosters   # node --test tests/rpg-boosters.test.js
npm run check:rpg-souk       # les quatre d'affilée
```

Les quatre suites sont aussi **entrées dans `check:rpg`** : une régression
d'économie casse désormais la vérification du jeu entier. État au jour du lot 1 :
**41 tests, 41 verts**. (`check:rpg` compte quatre échecs qui lui préexistent —
`rpg-long-press`, `rpg-story-3d`, `rpg-table-3d`, `rpg-touch-drag` —, dus à
`jsdom` absent de l'environnement, et sans rapport avec ce chantier.)

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
- **boosters** — cinq cartes distinctes et du bon rayon, rare garantie, pitié
  qui **force** la mythique après une série sèche, taux mesurés sur dix mille
  ouvertures semées (24 % en moyenne par rayon thématique, 32 % au grand étal,
  jamais plus de sept paquets secs), vivier borné (aucune carte du Fjord sans
  tour entamée), garantie des trois nouvelles, doublons remboursés au barème,
  achat refusé sans solde ni sur un rayon fermé, coffret à dix paquets avec
  remise et mythique assurée.

## 11. Risques et points ouverts

| Risque | Réponse |
| --- | --- |
| La collection est **dérivée** : oublier la nouvelle source rendrait les cartes invisibles | une seule porte (`collectionJoueur`) + un test qui vérifie qu'une carte du Souk est bien possédée et jouable |
| L'économie écrase le rythme de la campagne | le vivier borné par les tours (D2) + un test dédié qui refuse une carte du Fjord à la Tour des Listes |
| Le solde donne envie de farmer les parties libres | 8 ◈ par duel libre, 10 ◈ par étage rejoué, et les quêtes restent le gros du revenu |
| Deux appareils, dépense hors ligne | fusion par maximum, compromis documenté (§4.4) — jamais de perte |
| Le monolithe `RpgDuelPage.jsx` | l'écran vit dans ses fichiers, la page ne gagne qu'une branche |

**Décisions prises** (elles ont débloqué le lot 1) :

1. **La monnaie s'appelle « crédits » (◈)** — le mot du demandeur. Le lore du
   dossier 04 passe des « dinars du courant » aux « crédits de la Chambre ».
2. **Le rythme quotidien est celui du dossier** : ≈ 200 ◈ de quêtes, 80 ◈ de
   Cachet, 50 ◈ par premier étage, rayons à 140–180 ◈ — une journée pleine vaut
   ≈ 320 ◈, soit deux paquets.
3. **Le Cachet du cycle vaut +80 ◈**, en crédits, pas en booster offert : une
   seule mécanique à expliquer.
4. **Les cartes du Souk (lot 6) attendent** : la boucle doit d'abord vivre en
   ligne avant qu'on lui ajoute un set dédié.

**Reste ouvert pour la suite** : les cartes du Souk (lot 6), une série de sept
jours récompensée (lot 5), et le moment où le **sable** du dossier 04 entre en
scène comme seconde devise — le portefeuille est déjà écrit pour l'accueillir.
