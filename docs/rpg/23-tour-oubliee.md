# 23 — La Tour Oubliée (le deck secret de l'IA)

**Statut : codée et jouable** dans le Jeu Solo (les Tours de Bab El), après la
Tour du Sablier renversé — qu'elle ne remplace pas : le Sablier reste la tour
d'épreuves terminale du récit, l'Oubliée est l'épreuve d'après, celle qui n'est
écrite nulle part.

> La onzième tour de Bab El n'existe pas. Elle n'a jamais existé : la Chambre a
> effacé son nom du registre, ses gardiens de la Liste, ses cartes du catalogue.
> Il reste une porte en bas des Tours, un deck que personne ne peut collectionner,
> et une créature qui attend qu'on se souvienne d'elle.

Ce dossier décrit une tour **post-campagne**, jouée **uniquement par l'IA**, avec
un set de cartes **hors catalogue** (invisibles au Souk, à l'atelier de decks, à
la collection, à l'essai mana et au PvP), une rampe de difficulté qui commence
équilibrée et finit quasi imbattable, et une **prime de première victoire** de
1 500 crédits.

---

## 1. Ce qui existe déjà et sur quoi on s'appuie

Rien de tout cela n'invente un nouveau moteur : le jeu fournissait déjà presque
tout.

| Brique existante | Fichier | Ce qu'elle donne |
| --- | --- | --- |
| Tours & étages | `src/games/rpgStoryTours.js` | `RPG_STORY_TOURS`, déblocage étage par étage, `RPG_STORY_DECKS` |
| Moteur de duel | `src/games/rpgDuel.js` | `exil`, `destruction-coutmax`, `reanimation`, `jetons`, `buff`, `debuff`, `gel`, `empeche-blocage`, `transfert`, `aura`, `prixPv`, Envol, Rapidité, Tribut, Furie, Tenacité, Protection contre les magies |
| Cerveau adverse | `src/games/rpgAI.js` | niveaux `recit` / `normale` / `veilleur` / `sablier`, styles tactiques |
| Économie | `src/games/rpgCredits.js`, `rpgEvenementsDuel.js` | `GAINS`, `creditsDeVictoire`, `gainsDeTour`, butin de tour payé **une fois** |
| Hors catalogue | `rpgCards.js` (`RPG_JETON_CARDS`, `CATALOG`) | un précédent existe : les jetons sont peints par `cardById` **sans** entrer dans `RPG_DUEL_CARDS` |
| Appareil des tours | `rpgStoryTowerModels.js`, `rpgPlateaux.js` | maquette 3D, plateau attitré |
| Progression | `rpgStory.js` | victoires, récit, fusion entre appareils |

**Le levier central** : `RPG_DUEL_CARDS` est la définition du *catalogue*. Une
carte peut être connue du moteur (`cardById`, `duelCardById`, `magieById`,
`armeById`, `jetonById`) sans y figurer. C'est exactement ainsi que les jetons
échappent à la collection. Les cartes de l'Oubliée suivent le même chemin.

---

## 2. Le concept : « Les Oubliés »

- **La Tour Oubliée** se dresse **après** la Tour du Sablier renversé : elle est
  la onzième et dernière carte de la galerie. Elle est **verrouillée** tant que
  les sept maîtres du Sablier ne sont pas vaincus (`deblocage.tour`).
- Tour **libre** : aucun acte, aucune scène, aucun registre du récit
  « La Dernière Liste ».
- Son identité chromatique est **Ténèbres**, mais une Ténèbres d'une autre
  facture que la Nécropole : ni Égypte, ni pesée des âmes — **l'Encre du
  registre effacé**, les morts sans nom, les crocs, les cauchemars du Maghreb.
- Trois tribus :
  1. **La Horde** — zombies, cousus, charognards (la mort qui revient en nombre) ;
  2. **La Cour de sang** — vampires, buveurs, dents longues (le vol de vie) ;
  3. **Les Cauchemars** — goules, Aïcha Kandicha, Bou Jeloud, Teryel, l'Ifrit
     d'encre (le folklore démoniaque, effets les plus variés).
- Au sommet : **L'OUBLIÉ**, celui dont on a effacé le nom — il n'est pas dans la
  Liste parce que c'est lui qui l'a écrite.

Signature visuelle : cartes `element: 'tenebres'`, `set: 'tour-oubliee'`, et une
pastille discrète **« OUBLIÉE »** peut être posée sur la face pour que le joueur
comprenne immédiatement qu'il voit une carte qu'il ne possédera jamais.

---

## 3. Le set « Le Bestiaire oublié » — 24 cartes + 1 jeton

Fichier : `src/games/rpgTourOubliee.js` (aucun import de `rpgCards.js`, comme
`rpgTenebres.js` — l'import se fait dans un seul sens). 30 cartes par paquet,
2 exemplaires maximum (1 pour les mythiques), une seule couleur : **Ténèbres**.

### 3.1 Les communes (8) — les deux premiers étages

| Carte | Coût | Type | Effet |
| --- | --- | --- | --- |
| **Rôdeur des fosses** | 1 | Créature 2/1 | Rapidité |
| **Chauve-souris du seuil** | 1 | Créature 1/1 | Envol, Rapidité |
| **Portefaix cousu** | 2 | Créature 1/3 | À la mort : crée un jeton **Lambeau** 1/1 |
| **Charognard du puits** | 2 | Créature 2/2 | À la mort : la carte du dessus du paquet adverse au cimetière |
| **Chacal sans maître** | 2 | Créature 2/2 | À l'arrivée : piochez 1 puis défaussez 1 |
| **Goule des cimetières** | 2 | Créature 2/1 | À l'arrivée : -1/-1 à une créature adverse (plancher 1) |
| **Encre du registre** | 1 | Magie Rapide | +1/+2 à une créature alliée |
| **Pilon du fossoyeur** | 2 | Arme | +1/+1 et Tribut 1 au porteur |

### 3.2 Les inhabituelles (7) — le milieu de la tour

| Carte | Coût | Type | Effet |
| --- | --- | --- | --- |
| **Buveur de nuits** | 2 | Créature 2/2 | Rapidité, Tribut 1 |
| **Aiguille du sabbat** | 2 | Sorcellerie | -2/-2 à une créature adverse (plancher 1) |
| **Ifrit d'encre** | 3 | Créature 3/2 | Rapidité, Furie 1 |
| **Mange-souvenirs** | 3 | Créature 3/2 | À l'arrivée : les 2 cartes du dessus du paquet adverse au cimetière |
| **Soif du sabbat** | 3 | Magie Rapide | Le sorcier adverse perd 2 PV, vous en gagnez 2 |
| **Dame aux crocs longs** | 4 | Créature 3/3 | Envol, Tribut 2 |
| **Noyé du puits** | 4 | Créature 4/4 | À l'arrivée : gèle une créature adverse |

### 3.3 Les rares (5) — la seconde moitié

| Carte | Coût | Type | Effet |
| --- | --- | --- | --- |
| **Goule affamée** | 3 | Créature 3/1 | À l'arrivée : détruit les créatures adverses de coût 1 ou moins |
| **Colosse des charognes** | 5 | Créature 5/5 | À la mort : crée **deux** Lambeaux |
| **Bou Jeloud** | 5 | Créature 3/4 | Aura : +1/+0 à vos créatures adjacentes (moteur `appliquerAurasBuffAutres`) |
| **Pacte de l'Oubliée** | 2 + 3 PV | Sorcellerie | Piochez 2 cartes (`prixPv`) |
| **Réveil de la horde** | 5 | Sorcellerie | Réanime la dernière créature de votre cimetière |

### 3.4 Les mythiques (4) — les sommets

| Carte | Coût | Type | Effet |
| --- | --- | --- | --- |
| **Aïcha Kandicha** | 5 | Créature 4/4 | Envol ; à l'arrivée : une créature adverse ne peut plus bloquer avant la fin de son prochain tour |
| **Comte des mille dents** | 6 | Créature 5/5 | Envol, Tribut 3 ; à l'arrivée : transfert 2 |
| **Teryel aux sept cornes** | 6 | Créature 6/6 | Furie 2 ; à l'arrivée : exile une créature adverse de coût 3 ou moins |
| **L'OUBLIÉ** | 7 | Héros 7/7 | Protection contre les magies, Tenacité, Tribut 2 ; à l'arrivée : détruit les créatures adverses de coût 2 ou moins ; à la mort : deux Lambeaux |

### 3.5 Le jeton

- **Lambeau** 1/1, créé par le Portefaix, le Colosse et L'OUBLIÉ. Il emprunte la
  peinture du Portefaix cousu (sa dépouille est la même) : aucun jeton n'entre
  dans les tests de partage d'illustration, qui ne couvrent que le catalogue.

---

## 4. Les six étages : la rampe

| # | Gardien | Tribu / thème | Paquet | IA | Puissance | Pacte | 1re victoire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Le Fossoyeur sans nom | La Horde — la mort en nombre | `horde-des-fosses` | `normale` / prudent | 4 | — | 60 ◈ |
| 2 | La Dame aux crocs | La Cour de sang — le vol de vie | `cour-de-sang` | `normale` / agressif | 5 | +1 carte | 70 ◈ |
| 3 | Bou Jeloud | Les Cauchemars — la meute | `cauchemars-du-gourara` | `veilleur` / agressif | 7 | — | 90 ◈ |
| 4 | Aïcha Kandicha | Les Cauchemars — l'illusion | `cauchemars-du-registre` | `veilleur` / controle | 9 | +1 mana | 120 ◈ |
| 5 | Teryel aux sept cornes | Les trois tribus réunies | `bestiaire-oublie` | `sablier` / equilibre | 12 | +4 PV, +1 mana | 180 ◈ |
| 6 | **L'OUBLIÉ** | Le registre effacé | `le-roi-sans-nom` | **`oubliee`** / controle | 16 | +12 PV, +1 mana, +1 carte, bouclier 6 | **1 500 ◈** |

- **Étages 1-2 « équilibrés »** : l'étage 1 n'aligne que des communes et des
  inhabituelles ; l'étage 2 ouvre les rares avec une seule Goule affamée.
  Aucune mythique, IA `normale`. Un joueur qui vient de finir une tour classique
  gagne sans transpirer — c'est l'appât.
- **Étages 3-4 « durs »** : les rares entrent, l'IA passe en `veilleur`, les
  premiers pactes tombent. Il faut un deck de campagne complet et une main
  correcte.
- **Étage 5 « très dur »** : `sablier` + pacte cumulé, trois mythiques ; les
  parties se jouent sur un ou deux tours de retard.
- **Étage 6 « quasi imbattable »** : `oubliee`, pacte maximal, quatre mythiques,
  deux vagues de table rase. On gagne avec un deck optimal, une courbe parfaite
  et souvent plusieurs essais. **Jamais par un verrou absolu** : voir §7.

Butin de la tour (les six étages conquis) : **600 ◈**, en plus des primes
d'étage. Total d'un premier parcours complet : **3 120 ◈**, dont 2 100 ◈ au
sommet.

---

## 5. Le « Pacte de l'Oubliée » — les atouts d'étage

`puissance` n'influe pas sur les PV (`RPG_PV_SORCIER_PAR_PUISSANCE = 0`) et tous
les duels d'Histoire partent à 25 PV. Pour rendre le boss final réellement
monstrueux **sans** casser les règles des cartes, chaque étage peut déclarer un
champ optionnel `atouts`, lu par `rpgNouveauDuel` :

```js
atouts: { pv: 12, mana: 1, main: 1, bouclier: 6 }
```

- `pv` : PV de départ supplémentaires du sorcier ;
- `mana` : sources de mana permanentes offertes (la rampe du boss commence à 1,
  et le plafond de dix sources reste le même) ;
- `main` : cartes de départ supplémentaires (la main du mode sans terrains est
  de 3) ;
- `bouclier` : réserve d'armure initiale du SORCIER, à briser avant de le
  toucher. Elle absorbe encore les dégâts : ce n'est pas la parade anti-sort
  des créatures, qui ne concerne qu'elles (voir le README, section « le
  bouclier bloque un sort »).

`rpgAtoutsSorcier` **borne** chaque levier (`RPG_ATOUTS_MAX` : 20 PV, 3 manas,
3 cartes, 10 de bouclier) et ramène à zéro tout ce qui est absent ou illisible.
Le PvP ignore complètement les pactes. Tout est affiché sur la fiche d'étage
(« **Pacte** : +12 PV · +1 mana · +1 carte · bouclier 6 ») et annoncé dans le
journal du duel — aucune triche cachée.

---

## 6. Les récompenses : premier déblayage, rejeu, butin

Le barème global (`GAINS.etagePremiere = 50`) reste la règle ; un étage peut
déclarer le sien :

```js
recompense: { premiere: 1500, rejoue: 80 }
```

- `recompenseEtage` / `creditsDeVictoire` / `gainsDeTour` lisent le barème de
  l'étage avant de retomber sur `GAINS` ;
- l'événement `duel-gagne` porte déjà `etageId` et `tourId` : rien de nouveau
  sur le fil, seulement une lecture plus fine ;
- l'unicité reste tenue par `etagesVaincus` (progression) et `toursPayees`
  (portefeuille) : deux appareils, deux onglets, aucun double paiement ;
- l'écran de victoire, la fiche d'étage et l'affiche de la tour montrent le
  montant **réel** ;
- `butinDeTour` lit le `butin` déclaré par la tour (600 pour l'Oubliée) ;
- le rejeu paie 80 ◈ (le plus haut du jeu) : la tour reste rentable sans
  permettre de farmer 1 500 ◈ à la chaîne.

Option ouverte : 500 XP et un trophée « Celui qui s'en souvient » au premier
déblayage du sommet — non implémentés à ce stade.

---

## 7. Les garde-fous (le boss doit être dur, pas truqué)

1. **Aucun verrou absolu** : pas d'association Insaisissable + Envol + vol de
   vie dans une même boucle, pas d'exil recyclable à l'infini. Le boss gagne par
   la courbe, pas par une prison.
2. **Plafond de recherche IA** : le niveau `oubliee` est borné (profondeur 5,
   largeur 6, une branche de plus que `sablier`) et sa réflexion est plafonnée à
   2 200 ms — pas de gel du navigateur.
3. **Pas de triche cachée** : tous les pactes sont affichés avant le duel et
   réutilisent les mécaniques existantes.
4. **Pas d'effet « casino »** : le hasard est le même que dans les autres tours.
5. **Défaite lisible** : le journal explique chaque coup du boss.

---

## 8. « Hors catalogue » : la garantie, et ses conséquences

Les 24 cartes de l'Oubliée **n'entrent pas** dans `RPG_DUEL_CARDS`. Elles sont
connues uniquement de `cardById`, `duelCardById`, `magieById`, `armeById` et
`jetonById`, via un seul point d'entrée (`rpgTourOubliee.js`).

| Surface | Comportement |
| --- | --- |
| Souk / boosters | impossibles à tirer (le vivier est `RPG_DUEL_CARDS`) |
| Collection / complétion | absentes, aucun compteur faussé |
| Atelier de decks / draft | impossibles à choisir (aucune possession possible) |
| Essai mana | absents du banc |
| PvP | un deck qui les contiendrait est refusé (hors collection) |
| Duel contre l'Oubliée | tout fonctionne : art, texte, effets, journal |

`carteEstOubliee(id)` existe pour les gardes et l'affichage.
`convertirDeckSansTerrain` (appelé au lancement du duel) laisse les paquets du
boss **identiques** : ils sont écrits au format standard (30 cartes, ≤ 2 copies,
mythiques uniques, une couleur).

---

## 9. Ce qui est implémenté, fichier par fichier

### Données & hors-catalogue
- **`src/games/rpgTourOubliee.js`** *(neuf)* : le set (24 cartes + 1 jeton), les
  6 paquets de 30 cartes, la tour complète (`etages`, `atouts`, `recompense`,
  `deblocage`, `butin`).
- **`src/games/rpgCards.js`** : le set entre dans `CATALOG` et dans les quatre
  lookups (`duelCardById`, `magieById`, `armeById`, `jetonById`), **jamais** dans
  `RPG_DUEL_CARDS` ; export `carteEstOubliee`.
- **`src/games/rpgStoryTours.js`** : la tour est ajoutée **en dernier** et ses
  paquets à `RPG_STORY_DECKS`.

### Difficulté
- **`src/games/rpgAI.js`** : niveau `oubliee` (profondeur 5, largeur 6,
  prescience, zéro erreur), délai dédié (~1 620 ms + plateau, plafond 2 200 ms).
- **`src/games/rpgDuel.js`** : `sorcierAtouts` dans `rpgNouveauDuel`
  (`rpgAtoutsSorcier`, `rpgAtoutsActifs`, `RPG_ATOUTS_MAX`) — PV, mana, main,
  bouclier ; tout est optionnel, donc **aucun autre mode ne change**.
- **`src/games/RpgDuelPage.jsx`** : passe `etageCourant.atouts` au moteur,
  affiche le pacte dans la fiche d'étage, affiche le barème réel de l'étage, et
  verrouille la tour dans la galerie.
- **`src/games/rpgStory.js`** : `tourEstDebloquee` ; `etageEstDebloque` respecte
  le verrou de tour.

### Économie
- **`src/games/rpgCredits.js`** : `recompenseEtage`, `butinDeTour`,
  `creditsDeVictoire({ …, etageId })`, `gainsDeTour` par étage et par tour.
- **`src/games/rpgEvenementsDuel.js`**, **`RpgDuelPage.jsx`** : propagation de
  `etageId` et affichage des montants réels.

### Décor
- **`public/sablier-tours/tour-oubliee.jpg`** : miniature de repli.
- **`src/games/rpgStoryTowerModels.js`** : maquette 3D (fosse sans fond, chaînes
  rompues, cloche fêlée, encre du registre) et thème de pierre unique.
- **`src/games/rpgPlateaux.js`** — la tour a **deux tables**, dans cet ordre :

  1. **Le Cimetière des noms effacés** (`plateau-cimetiere-des-noms-effaces.jpg`,
     3840×2560 en 3:2) est la **table attitrée** des six paquets. L'aire
     circulaire de terre battue reste nue au centre ; les tombes blanchies, les
     stèles sans inscription, les cyprès, la grille rouillée, la lampe à huile
     et la brume sont aux bords. C'est la nécropole que la tour a effacée du
     registre — le dehors de la tour.
  2. **La Fosse de l'Oubliée** (`plateau-fosse-de-l-oubliee.jpg`) est son
     **double merveilleux** : quand la partie autorise les variantes
     (`variantesPlateaux`, actif sur la route du jeu), le second tirage peut
     faire descendre les duellistes au fond du puits — dallage de basalte nu,
     chaîne rouillée, cloche fêlée, parchemins vierges, tache d'encre et pitons
     de fer aux bords.

  Dans les deux cas la table ne change plus de camp, comme dans la chambre du
  Sablier. Vignettes de profil livrées
  (`public/profil/plateaux/{cimetiere-des-noms-effaces,fosse-de-l-oubliee}.webp`,
  produites par `tools/make-profil-vignettes.mjs`).
- **`src/games/rpgTableSceneThemes.js`** : un décor 3D par table, aucun objet
  maquetté dans les deux cas (tout est peint aux bords, le centre reste libre).
  - **Cimetière** — la lampe à huile qui vacille contre le muret, la lune froide
    qui prend la moitié haute, poussière portée par le vent, voile d'ombre bleu
    nuit.
  - **Fosse** — la clarté froide qui tombe du haut du puits, les braises
    violettes de la tache d'encre, brume qui **monte** du sol et voile d'ombre
    pourpre.

- **`src/games/rpgPlateauMusic.js`** : chaque table a son instrumental,
  **« Le Sceau de Sang »**, à la racine de `public/` comme les autres pistes à
  espaces —
  `public/Le Sceau de Sang (Instrumental).mp3` pour le cimetière,
  `public/Le Sceau de Sang (Instrumental) (1).mp3` pour la Fosse. Les deux
  plateaux sont donc **musicaux** (`RPG_PLATEAUX_MUSICAUX`), comme toutes les
  tables du jeu : il n'existe plus d'ambiance de tour pour prendre le relais.
  ⚠️ **Les deux MP3 doivent être présents dans `public/` sous ces noms exacts**
  (espaces et parenthèses compris). Tant qu'ils manquent, les deux tables sont
  muettes : `npm run check:rpg` le signale (`tests/rpg-tour-oubliee.test.js`
  et `tests/rpg-plateaux.test.js`).
- **`public/cards/*.jpg`** : 24 peintures plein art **4:5** (1024×1280),
  direction « Encre et cauchemar » — noir bleuté, violet, or terni, folklore
  maghrébin, sans texte ni bordure.
  *État au 25/10 — **deuxième direction artistique**.* Le set a d'abord été
  peint en encrage BD ; il est **entièrement repeint en peinture réaliste
  sombre, façon Elden Ring / Dark Souls** : rendu à l'huile, clair-obscur
  marqué, palette désaturée (gris cendré, bleu ardoise, violet meurtri, ambre
  sale), brume atmosphérique, aucun trait d'encre ni aplat de BD. La révision de
  cache `SET_TOUR_OUBLIEE_ART_VERSION = 'souls-realiste-v1'` (dans
  `rpgCardArt.js`) change l'URL de chaque peinture pour qu'aucun navigateur ne
  resserve l'ancienne passe. **À incrémenter à chaque nouvelle direction
  artistique du set.**

  **Le set est repeint à 100 %** : les 24 cartes et la miniature de la tour
  sont dans la nouvelle direction artistique.

  Décision de repaint sur l'Ifrit d'encre (retour du 25/10) : la première
  version « djinn sortant d'un vase » a été rejetée. La peinture définitive
  montre un ifrit **debout, à proportion humaine**, qui traverse une archive en
  feu — plus de lampe, de vase ni de génie qui s'échappe. Même consigne pour
  les prochaines passes : aucun contenant magique, aucun cliché du génie.

  **Face de Furie de l'Ifrit d'encre.** La carte porte `Furie 1` : quand une
  blessure déclenche l'état, le jeu affiche désormais
  `public/cards/ifrit-d-encre-furie.jpg` (**1024×1280**, révision
  `tour-furie-encre-v1` dans `rpgCardArt.js`). Même composition que la face
  intacte — ifrit debout, archive en feu, livre ouvert au premier plan — mais
  le corps fissuré s'est ouvert sur une braise blanche, la gueule hurle, la
  flamme violette se déchaîne et l'encre noire jaillit en fouets sur les
  rayonnages. Les pages du registre ne portent que des éclaboussures : aucun
  texte lisible, ni latin ni arabe. Plein cadre, sans bordure, et affichée
  sans filet de couleur sous la vignette rouge de Furie. L'autre porteur de
  Furie du set, **Teryel aux sept cornes**, n'a pas encore de double
  déclenché.

  **Règle de peinture — le plein cadre.** L'illustration va à fond perdu :
  aucune bordure, aucun liseré, aucune marge intégrée à l'image, le cadre étant
  dessiné par le CSS du jeu (`.rpg-card`). Cinq peintures sont arrivées
  encadrées et ont été reprises : `chacal-sans-maitre`, `goule-affamee`,
  `bou-jeloud` et `portefaix-cousu` (bordure **blanche** de 39 à 43 px, plus un
  liseré noir résiduel pour le dernier — recadrage de 12 px), `reveil-de-la-horde`
  et `pilon-du-fossoyeur` (marge blanche de ~25 px, recadrées).

  Le test « les peintures du set sont plein cadre » mesure les quatre bords de
  chaque fichier (via `jpeg-js`, dépendance de test) : refus au-delà de 20 % de
  pixels clairs, et refus de tout pourtour **uni** (écart-type de luminance
  inférieur à 4) qui tranche de plus de 22 points avec l'anneau situé 34 px plus
  loin — la signature d'une bande de cadre blanche **ou noire**.

  **Pas un caractère.** Aucune peinture ne doit porter de texte lisible ni de
  calligraphie **arabe** (consigne du 25/10) : la stèle du Portefaix cousu, les
  dalles de la Goule des cimetières et les papiers du Charognard étaient
  gravés de versets — les glyphes du registre restent désormais abstraits.
  Audit des 24 peintures livrées :

  | peinture | verdict |
  |---|---|
  | `portefaix-cousu` · `goule-des-cimetieres` | **repeints** — la stèle portée par le premier et les trois dalles de la seconde étaient gravées de versets ; le bloc de pierre est désormais nu et les dalles lisses |
  | `chacal-sans-maitre` | repeint — parchemin redevenu blanc |
  | `charognard-du-puits`, `mange-souvenirs`, `l-oublie`, `encre-du-registre` | griffures illisibles, aucun caractère reconnaissable |
  | les 18 autres | aucune écriture |

  La consigne « pas un caractère » est répétée dans chaque prompt et vaut pour
  toutes les vagues suivantes.

### Tests
- **`tests/rpg-tour-oubliee.test.js`** *(quatorze)* : intégrité du set, absence de
  catalogue, paquets valides et conversion neutre, rampe, pactes bornés et
  appliqués, verrou de tour, barème et butin uniques, refus en deck de joueur.
- Mis à jour : `tests/rpg-story.test.js` (le Sablier n'est plus la dernière
  tour), `tests/rpg-story-3d.test.js` (features de la maquette),
  `tests/rpg-ia.test.js` (niveau `oubliee`), `tests/rpg-credits.test.js`
  (barème par étage).

Commande de vérification : `npm run check:rpg`.

---

## 10. Risques et parades

| Risque | Parade |
| --- | --- |
| Boss perçu comme « triché » | pacte affiché, mécaniques existantes, aucun verrou |
| Boss impossible à battre | plafond de pacte, deck sans boucle infinie, 4 mythiques maximum |
| Lenteur de l'IA au niveau `oubliee` | profondeur/largeur bornées, délai plafonné |
| Fuite dans le catalogue | test dur « aucune carte du set dans RPG_DUEL_CARDS » + refus hors collection |
| Anciennes sauvegardes | ids nouveaux seulement ; normalisation et fusion distante les acceptent |
| Coût des 24 peintures | livraison en vagues ; le set reste jouable avec les arts déjà livrés |

---

## 11. Décisions actées

1. **Six étages** — rampe 4 → 16 de puissance.
2. **Prime de première victoire du boss : 1 500 ◈** (rejeu 80 ◈), plus 600 ◈ de
   butin de tour.
3. **24 peintures inédites** au ratio 4:5, plus la miniature de la tour.
4. **Tour verrouillée** jusqu'à la fin de la Tour du Sablier renversé.
