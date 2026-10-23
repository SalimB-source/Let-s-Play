# 20 — Le profil du joueur : la barre d'XP et le paquet de palier

> Le Sablier payait déjà : des crédits ◈ au Souk (dossier 13), des cartes
> révélées par les étages, des quêtes du jour, une série de sept jours. Il ne
> **comptait** pas le joueur. Aucune trace de son temps passé, aucune carte à
> son nom, rien qui monte en dehors de la collection.
>
> Ce document ouvre la **troisième monnaie** — l'**XP** — et la règle qui va
> avec : **chaque niveau franchi ouvre un booster tiré au hasard**, offert,
> sans un crédit dépensé. La barre monte vite au début (le niveau 2 tombe dans
> le premier duel libre gagné) et devient de plus en plus gourmande (le
> trentième palier coûte 247 fois le premier).
>
> Trois règles gouvernent le chantier, les mêmes que pour le Souk : **rien ne
> se paie avec de l'argent réel**, **tout ce qui est gagné est monotone** (ni
> l'XP ni le nombre de paquets offerts ne redescendent, ni par synchronisation,
> ni par remontée d'horloge), et **les crédits ◈ restent leur propre monnaie**
> — l'XP n'achète rien, et rien n'achète d'XP.

---

## 1. La boucle visée

```
   gestes du duel (contrat d'événements, dossier 13 §6)
              │
              ├── carte posée, duel gagné, étage déblayé, tour terminée,
              │   quête réclamée, Cachet, leçon, paquet ouvert
              ▼
             XP  ──►  palier franchi  ──►  dette : 1 paquet par niveau
                                                   │
                                                   ▼
                                    paquet tiré AU HASARD parmi les rayons
                                    ouverts du comptoir — offert, 0 ◈
                                                   │
                                                   ▼
                              cinq cartes (rare garantie, pitié, doublons ◈)
                                                   │
                                                   ▼
                                          collection, decks maison
```

La boucle emprunte **exactement** les deux tuyaux qui existent déjà : le
contrat d'événements pour l'entrée, le comptoir du Souk pour la sortie. Aucun
nouveau tirage, aucun nouveau vivier, aucune nouvelle table SQL.

Ce que le joueur voit, dans l'ordre :

1. **l'onglet Profil** du menu, en première position : l'emblème, « NIV. 12 »,
   une barre d'XP miniature, et une pastille quand un paquet attend ;
2. **la carte de profil**, dépouillée (§6) : l'emblème, le pseudo, le niveau,
   sa barre d'XP et les six emblèmes — rien d'autre ;
3. **la victoire** qui annonce les deux monnaies : « +50 crédits » et
   « ✦ +70 XP — niveau 3 atteint, un paquet s'ouvre ! » ;
4. **la cérémonie** du paquet offert — la même qu'au Souk, avec son sachet, ses
   cinq cartes face cachée et son bouton « Tout ranger ».

## 2. Ce qui existe déjà, et sur quoi on se branche

| Brique existante | Ce qu'elle fait | Ce que le profil en fait |
| --- | --- | --- |
| `rpgEvenementsDuel.js` | le contrat : 8 types d'événements, un seul payant | chaque geste **versé** rapporte aussi de l'XP ; le module rend `xp`, `niveaux` et le profil mis à jour |
| `rpgBoosters.js` | `ouvrirBooster`, tirage, rare garantie, pitié, doublons | `ouvrirUnPaquet` extrait, `ouvrirBoosterOffert` ajouté : même tirage, caisse court-circuitée |
| `rpgCredits.js` | portefeuille, journal des ouvertures | le journal porte `offert: true` pour un paquet de palier |
| `useSablierBourse.js` | l'économie : état entier, `appliquer`, `pousser` | le profil devient la **troisième moitié** de cet état (`bourse`, `quetes`, `profil`) |
| `rpgDeckBuilder.js` | `fusionnerEtatsSablier` | fusionne le profil par sa propre règle, monotone |
| `useDecksSablier.js` | état local + synchronisation | transporte le profil sans le modifier, et le rend au stockage après fusion |
| `RpgBoosterOuverture.jsx` | la cérémonie d'ouverture | variante « offert » : titre, eyebrow, prix à 0, sachet marqué |
| `RpgDuelPage.jsx` | menu à onglets, overlay de victoire | gagne un onglet **Profil**, un écran, et `MonteeDeNiveau` |

## 3. Les décisions structurantes

### P1 — La courbe est une puissance écrite une fois

```js
seuil(n) = max(1, round(26 × n^1,62))     // XP à gagner pour passer de n à n+1
```

- **26 XP** pour le premier palier : un duel libre gagné (20) et trois cartes
  posées (6) suffisent. Le joueur voit sa barre bouger et son premier paquet
  tomber **dans la première partie**.
- **1,62** d'exposant : chaque palier coûte strictement plus que le précédent
  (vérifié palier par palier par `tests/rpg-profil.test.js`), sans le mur d'une
  exponentielle. Le niveau 20 demande 3 332 XP, le niveau 50 en demande 14 700.
- **60 niveaux**, comme le dossier 04 §1 — qui proposait `60 × n^1,6`. La base
  est descendue à 26 pour que le début soit immédiat ; la forme est la même.
- Au plafond, `seuil(60) = 0` : l'XP continue de compter, plus aucun palier ne
  sonne, et l'écran le dit au lieu de mentir avec une barre à 100 %.

Les seuils sont calculés **une fois au chargement** (`SEUILS`, `CUMULS`) : une
lecture de barre est une recherche de tableau, jamais une boucle.

### P2 — Le niveau n'est pas un champ

`niveauDeXp(xp)` le déduit. Le profil stocké ne contient donc **que** `xp`, et
aucune sauvegarde — locale, distante, ou fusionnée à la main — ne peut mentir
sur son propre palier. Même chose pour la dette (P3) : ce qui se calcule ne se
stocke pas.

Les champs du profil, tous bornés par `normaliserProfil` :

| Champ | Type | Règle |
| --- | --- | --- |
| `version` | `1` | la version du schéma local |
| `xp` | entier ≥ 0 | la seule source de vérité du niveau |
| `pseudo` | chaîne ≤ 24 ou `null` | `null` : la carte retombe sur le nom du compte, puis sur « Gardien de Bab El » |
| `embleme` | identifiant du catalogue | un glyphe de texte, **jamais un asset** |
| `boostersOfferts` | entier ≥ 0 | les paquets de palier déjà ouverts |
| `stats` | 8 compteurs entiers | `duelsGagnes`, `etagesPremiers`, `etagesRejoues`, `toursTerminees`, `cartesJouees`, `quetesReclamees`, `cachets`, `lecons` |
| `paliers` | ≤ 20 entrées | `{ niveau, le, motif }`, le plus haut d'abord, une entrée par niveau |
| `majLe` | ISO ou `null` | la dernière écriture |

### P3 — Chaque niveau **doit** un paquet ; la dette se calcule

```js
boostersDus(profil) = max(0, (niveauDeXp(xp) − 1) − boostersOfferts)
```

Un seul compteur monotone (`boostersOfferts`), jamais une file de « paquets à
ouvrir ». Conséquences :

- deux paliers franchis d'un coup doivent **deux** paquets, et ils s'ouvrent
  dans la même cérémonie (`paquets: 2`) ;
- un palier franchi pendant qu'une cérémonie est à l'écran **attend** au lieu
  de disparaître — `reglerPaliers` rend `null` et la dette reste au profil ;
- deux appareils ne se paient **jamais** deux fois le même palier : la fusion
  prend le maximum des deux compteurs, et la dette ressort identique des deux
  côtés ;
- un compteur d'offerts en avance (sauvegarde abîmée, fusion bizarre) ne rend
  pas de paquet au joueur : la dette ne descend pas sous zéro.

### P4 — Le paquet offert est un vrai paquet, sauf la caisse

`ouvrirBoosterOffert` appelle **le même** `ouvrirUnPaquet` qu'un achat :
même vivier par rayon, même rare garantie à la quatrième carte, même pitié
(`paquetsAvantMythique` avance), mêmes doublons remboursés au barème, même
journal — avec `offert: true`. Seules deux choses changent : `prix: 0`, et
`depenserCredits` n'est pas appelé (un joueur à zéro crédit reçoit son palier).

Le rayon est tiré **à chaque paquet** (`tirerParmi(rayons, rng)`), pas une fois
pour toute la montée : « au hasard » veut dire au hasard, et un double palier
peut offrir un paquet du Souk et un de la Banquise.

### P5 — Deux monnaies qui ne se convertissent pas

- L'XP ne s'achète pas : aucun bouton, aucun prix, aucun raccourci.
- Les crédits ◈ ne dépendent de l'XP que par un seul chemin, **visible et
  chiffré** : les doublons d'un paquet offert rendent leur montant au barème
  `BAREME_DOUBLON`, comme n'importe quel paquet. Un palier peut donc rapporter
  quelques ◈ ; il n'en coûte jamais.
- Une défaite ne retire **rien** — ni XP, ni crédits (règle D8 du dossier 13).

### P6 — Un palier sonne une fois, et ne bégaie pas

Deux garde-fous dans `reglerPaliers`, tous deux décidés par des refs et non par
l'état React :

1. `ouvertureRef` / `monteeRef` : jamais deux cérémonies à l'écran. Un paquet
   acheté qui se retourne encore reporte le paquet de palier.
2. `essaiPaliersRef` : quand **aucun** paquet n'a pu être tiré (comptoir fermé,
   vivier vide, stockage refusé), la montée est annoncée une fois, puis plus
   rien tant que la dette n'a pas changé. Sans ça, l'annonce automatique
   (6 s) se refermerait et le geste suivant réannoncerait le même palier,
   indéfiniment.

La cérémonie porte `key={montee.token}` — un **compteur**, pas `Date.now()` :
deux paquets dus se règlent dans le même tick (fermer l'un ouvre l'autre), et
sans `key` React garderait l'état de la première : le joueur verrait un paquet
déjà retourné.

### P7 — Le profil voyage avec l'état entier

`letsplay_sablier_profil_v1` sur l'appareil, par joueur (`progressionScope.js`),
et dans le `jsonb` `state` de `rpg_sablier_progress` — **aucune nouvelle
table, aucun SQL**. La fusion passe par `fusionnerProfils(local, distant)` :

- `xp`, `boostersOfferts` et chaque compteur : le **maximum** ;
- `paliers` : l'union, une entrée par niveau, la **date la plus ancienne**
  (deux appareils, un palier : c'est la première fois qui compte) ;
- `pseudo` : le plus récent non vide — un appareil sans nom n'efface pas celui
  de l'autre ;
- `embleme` : celui du côté le plus récemment mis à jour.

Un piège corrigé au passage : `useDecksSablier.etatLocalActuel()` pousse
**tout** l'état. Sans `chargerProfil()` dedans, modifier un deck écrasait le
profil du compte avec un profil vide.

### P8 — Rien en PvP, tout le reste oui

`noterEvenementDuel` rend `null` en PvP : c'est l'arbitre serveur qui paie, et
deux écritures concurrentes sur la même barre finiraient par tricher. En
Histoire, en Tours, en partie libre, dans les leçons du guide et au Souk,
chaque geste verse son XP.

Un bug réel est tombé avec ce chantier : `appliquer()` écrivait `setEtat` mais
laissait `etatRef.current` se mettre à jour **au rendu suivant**. Deux
événements dans le même tick — la victoire raconte `duel-gagne` puis
`etage-deblaye` — faisaient lire un état périmé au second, qui écrasait
l'écriture du premier : 50 ◈ perdus. `appliquer` met maintenant la ref à jour
de façon synchrone.

## 4. Le contenu (données pures)

### 4.1 Le barème — ce qui fait monter la barre

| Geste | XP | Motif du journal |
| --- | --- | --- |
| Premier déblayage d'un étage | **70** | `etage` |
| Tour terminée (tous ses étages) | **150** | `tour` |
| Étage rejoué | 22 | `etage` |
| Duel libre gagné | 20 | `duel-libre` |
| Cachet de la semaine | 80 | `semaine` |
| Cachet du cycle | 50 | `cachet` |
| Leçon du guide terminée | 40 | `lecon` |
| Quête du jour réclamée | 30 | `quete` |
| Paquet ouvert au Souk | 6 | `booster` |
| Carte posée sur la table | 2 | `carte` |

Le barème suit celui des crédits, pas à pas : le récit paie mieux que le farm
(70 contre 22), le sommet paie mieux que la marche (150), et le geste continu
(le plus fréquent) paie le moins. `BAREME_XP` est exporté : l'écran l'affiche
tel quel, et `tests/rpg-profil.test.js` vérifie que chaque ligne annonce le
chiffre du module.

**Une carte posée ne paie qu'une fois.** `creature-invoquee`, `magie-lancee` et
`arme-jouee` racontent déjà `carte-jouee` : compter les deux aurait doublé
l'XP de chaque geste de table.

Le butin de la tour ne monte la barre **que s'il a été versé** : la garde
`toursPayees` du portefeuille décide des deux, donc une tour rejouée ne
remonte ni le solde ni l'XP.

### 4.2 La courbe

| Niveau | XP du palier | XP total | Repères |
| --- | --- | --- | --- |
| 1 → 2 | 26 | 26 | un duel libre et trois cartes |
| 2 → 3 | 80 | 106 | un étage et demi |
| 3 → 4 | 154 | 260 | |
| 4 → 5 | 246 | 506 | |
| 5 → 6 | 353 | 859 | |
| 9 → 10 | 914 | 3 610 | |
| 14 → 15 | 2 090 | 10 942 | rang « Gardien d'étage » |
| 19 → 20 | 3 332 | 23 788 | |
| 29 → 30 | 6 426 | 70 391 | rang « Souffleur de verre » |
| 49 → 50 | 14 700 | 273 215 | |
| 59 → 60 | 19 220 | 442 471 | plafond, rang « Voix de l'Astrolabe » |

Le rapport entre le premier et le trentième palier est de **247**, et de
**565** avec le cinquantième. La moitié haute de la courbe pèse plus que les
trente premiers niveaux réunis — c'est la promesse « vite au début, gourmand
ensuite », écrite en chiffres et vérifiée par les tests.

### 4.3 Les rangs de Bab El

Dix rangs, du niveau 1 au niveau 60. Un rang se **garde** entre deux paliers
(`rangDeNiveau` rend le dernier atteint, et annonce le prochain) :

| Niveau | Rang |
| --- | --- |
| 1 | Sans-Nom |
| 3 | Porteur de lanterne |
| 6 | Sondeur |
| 10 | Veilleur |
| 15 | Gardien d'étage |
| 22 | Horloger |
| 30 | Souffleur de verre |
| 40 | Vigie du beffroi |
| 50 | Passeur de la Liste |
| 60 | Voix de l'Astrolabe |

> Les rangs **ne s'affichent plus** sur la carte de profil (voir §6) : la table
> reste dans le module pour le jour où un autre écran voudra la lire, et
> `tests/rpg-profil.test.js` continue de la vérifier.

### 4.5 Les visages du profil

Douze personnages emblématiques, pris dans la bible visuelle du récit
(`rpgStoryCast.js`) — **un portrait canonique par figure, jamais un second
fichier** : les cinq héros du récit d'abord, le Grand Horloger qui les envoie,
puis une figure par grande famille du catalogue.

| Avatar | Personnage | Famille |
| --- | --- | --- |
| `salem` | Salem, le Sondeur | Bab El (héros) |
| `yamina` | Yamina, l'Horlogère | Bab El (héros) |
| `feriel` | Fériel, la Souffleuse de verre | Bab El (héros) |
| `tarek` | Tarek, le Porteur | Bab El (héros) |
| `boualem` | Boualem, le Puisatier | Bab El (héros) |
| `mahieddine` | Mahieddine, le Grand Horloger | Bab El |
| `reine-etals` | Tin Hinan, la Reine des étals | Sables |
| `ifrit-ergs` | L'Ifrit des ergs | Braise |
| `maitre-hivers` | Le Maître des Neuf Hivers (le Père des Corbeaux) | Neige |
| `samurai-daimyo` | Le Daimyō du Soleil rouge | Soleil rouge |
| `corsaire-barbe-rousse` | La Barbe-Rousse | Corsaires |
| `necro-peseuse` | Celle qui pèse | Ténèbres |

Les peintures canoniques font de 160 à 590 Ko : douze d'un coup dans un bandeau
de choix coûteraient plus qu'un booster entier. Chacune a donc sa **vignette** —
un carré de 192 px découpé **au cadrage exact du jeu** (`position` de la bible,
le `background-position` d'un cadre en `background-size: cover`, reproduit par
`tools/make-profil-vignettes.mjs`) — de 6 à 16 Ko. Les vignettes des douze
tables (336×224, recadrées au centre du fond 4K) font de 10 à 34 Ko. Tout vit
dans `public/profil/`, suivi par le dépôt comme les sprites du récit
(`public/sablier-story/stands/`), et l'outil se relit d'un commande :

```bash
node tools/make-profil-vignettes.mjs            # régénère visages et tables
node tools/make-profil-vignettes.mjs --verifier # ne régénère rien, contrôle
```

Une figure **repeinte** (révision de cache dans `rpgCardArt.js`) passe par
l'outil, puis par `AVATAR_REVISION` / `PLATEAU_VIGNETTE_REVISION` pour que les
caches suivent. `tests/rpg-profil.test.js` vérifie que chaque visage a son
portrait canonique **et** sa vignette, et que chacune pèse moins de 60 Ko.

### 4.6 Les emblèmes

Six glyphes de texte — `⌛ ✦ ⚒ ☾ ❂ ▤` — aucun asset à charger, aucun temps de
téléchargement, et une lisibilité identique sur l'onglet du menu, le médaillon
de la carte et l'annonce de palier. Un emblème inconnu (sauvegarde d'une
version future) retombe sur le premier.

## 5. Architecture et fichiers

| Fichier | Rôle |
| --- | --- |
| `src/games/rpgProfil.js` | **les règles pures** : courbe, niveau, rangs, dette, journal, normalisation, fusion, stockage. Aucun import de React, aucun import du contrat d'événements |
| `src/games/rpgEvenementsDuel.js` | `xpDeLEvenement`, `motifDeLEvenement`, `statsDeLEvenement` ; `appliquerEvenementDuel` rend aussi `profil`, `xp`, `niveaux` |
| `src/games/rpgBoosters.js` | `ouvrirUnPaquet` (acheté **ou** offert), `ouvrirBoosterOffert` |
| `src/games/rpgCredits.js` | `offert` dans le journal des ouvertures |
| `src/games/useSablierBourse.js` | `reglerPaliers`, `verserXp`, `fermerMonteeNiveau`, `renommerLeProfil`, `choisirUnEmbleme` ; rend `profil`, `barreXp`, `boostersEnAttente`, `monteeNiveau` |
| `src/games/RpgProfilJoueur.jsx` | **l'écran** : présentationnel, il reçoit des états et rend des gestes |
| `src/games/rpg-profil.css` | la carte de profil, l'annonce de palier, l'onglet du menu, la ligne d'XP de la victoire |
| `src/games/RpgDuelPage.jsx` | l'onglet Profil, la branche `screen === 'profil'`, `MonteeDeNiveau`, l'XP dans l'overlay de victoire |
| `tests/rpg-profil.test.js` | la courbe, la dette, le barème, la fusion, le paquet offert |
| `scripts/rpg-profil-check.mjs` | l'écran monté dans jsdom + la vraie page, et les gardes de source |

Deux règles d'import, toutes deux vérifiées :

- `rpgProfil.js` n'importe **rien** du jeu : pas de contrat d'événements
  (cycle), pas de React, pas de DOM. C'est ce qui permet de le tester seul.
- `RpgProfilJoueur.jsx` ne touche à **aucun** stockage et n'appelle aucune
  règle d'écriture : `localStorage`, `chargerProfil`, `sauverProfil`,
  `gagnerXp` et `useSablierBourse` y sont absents, et le contrôle le vérifie.

## 6. L'écran Profil — une carte dépouillée

**Une seule carte.** La première version empilait cinq sections : le rang et sa
phrase, seize compteurs, le barème des dix gestes, le journal des vingt derniers
paliers, les quatre paliers à venir et la formule de la courbe, l'état de la
synchronisation. C'était un tableau de bord, et on n'y lisait plus rien.
L'écran tient maintenant en une carte centrée (520 px au plus), lisible sans
faire défiler :

1. **le médaillon** — le visage choisi (§4.5), peint en fond d'un cercle de
   96 px ; sans visage, le glyphe de l'emblème — et, visage peint, ce même
   glyphe en **cachet de cire** au coin du cercle (30 px, cerclé d'or) ;
2. **le pseudo** — le titre, une ligne ;
3. **le niveau** — « Niveau 5 », ou « Niveau 60 — maximal » au plafond ;
4. **la barre** — un `role="progressbar"` complet (`aria-valuenow`, `-min`,
   `-max`, `-text`) et sa seule lecture : « 214 / 353 XP » ;
5. **trois gestes**, chacun sous une étiquette de 10 px : les douze **visages**
   en cercles de 52 px, les six **emblèmes** en glyphes, les douze **tables** en
   pellicule qui défile plus « Au gré du deck ». Chaque tuile de table porte le
   **nom** de son terrain, peint au bas de la vignette sur une encre (8,5 px,
   deux lignes au plus) ; chaque étiquette écrit le nom du choix courant —
   « Visage · Yamina », « Emblème · Le corbeau des neiges », « Table · au gré du
   deck » ;
6. **le champ du pseudo** — avec son bouton **Enregistrer**, désactivé tant que
   rien n'a changé (« Un champ vide n'efface pas votre nom. »).

Une ligne apparaît entre la barre et les gestes **seulement** quand des paquets
attendent : « Un paquet vous attend. », avec le bouton **Ouvrir au Souk**. C'est
la seule information contextuelle de la carte, et elle porte une action.

Les vignettes sont des **fonds peints** des boutons (`background-image`), pas
des `<img>` dans le flux : ce sont des décors de choix, et chaque bouton porte
déjà son nom accessible (« Yamina — L'Horlogère », « La Table des Heures — Bab
El, salle haute de la Chambre »). L'onglet Profil du menu, lui, remplace son
glyphe par la vignette du visage choisi (`data-profil-onglet-avatar`).

**Choisir se lit, pas seulement se marque.** Les six emblèmes tiennent dans des
cercles de 44 px : un anneau doré autour d'un glyphe en était le seul retour,
et une fois le médaillon peint d'un visage, cliquer un emblème ne déplaçait plus
qu'un anneau — le geste semblait mort. Deux choses l'écrivent désormais :
l'**étiquette** du bandeau, qui porte le nom du choix courant, et le **cachet**
posé au coin du médaillon, qui suit le clic quand un visage est peint. Sans
visage, le médaillon porte déjà le glyphe : le sceau s'efface pour ne pas le
répéter. Les noms peints sur les tuiles répondent au même besoin — une pellicule
de vignettes muettes ne se choisit pas à l'œil, et la tuile choisie peut avoir
défilé hors de vue quand l'étiquette, elle, reste sous les yeux. Le nom
accessible de chaque bouton reste complet (« La Cour de l'Empereur — Rome, la
pourpre et le sable ») : la légende peinte est `aria-hidden`.

### 6.1 La table choisie — la moitié du joueur, et seulement elle

`profil.plateau` vaut l'identifiant d'un plateau du catalogue, ou `null` pour
« au gré du deck » — l'état d'un joueur neuf. `resoudrePlateauxDuDuel` accepte
alors `plateauChoisi` : la **moitié basse** de la table se peint avec ce terrain
(`motif: 'choix-du-joueur'`), la moitié haute reste celle du deck adverse —
l'adversaire joue toujours chez lui. Le plateau du joueur restant le
**principal**, le choix pilote la musique dédiée et le décor 3D.

- un terrain choisi n'est **jamais** échangé contre son double merveilleux :
  `variantesFantaisistes` ne tire que ce qui n'a pas été demandé, et le tirage
  du joueur n'est pas consommé — sans choix, la résolution reste bit à bit
  celle d'avant (`tests/rpg-plateaux.test.js`) ;
- un identifiant inconnu (plateau retiré d'une version à l'autre) rend la main
  au deck : `plateauParId` rend `null`, rien ne casse ;
- le **tutoriel** garde sa table : la leçon impose son décor, la page passe
  `plateauChoisi: modeTutoriel ? null : plateauChoisiDuProfil` ;
- en **duel en ligne**, le choix est une préférence locale : chaque client
  peint sa propre moitié, l'arbitre ne lit ni l'une ni l'autre.

Il n'y a toujours ni pastille « Aléatoire » ni verrou de plateau en début de
partie : le choix vit sur la carte de profil, comme une préférence de maison.

Ce qui a disparu de l'écran n'a pas disparu du jeu :

| Retiré de la carte | Où le lire |
| --- | --- |
| le rang et sa phrase | `RANGS` / `rangDeNiveau` dans `rpgProfil.js` (§4.3) |
| les seize compteurs | `profil.stats`, et le Souk pour la collection |
| le barème des gestes | `BAREME_XP` (§4.1) |
| le journal des paliers | `profil.paliers`, fusionné monotone (§P7) |
| les paliers à venir | `paliersAVenir`, et `SEUILS`/`CUMULS` (§4.2) |
| l'état de la synchronisation | le Souk et le menu, qui l'affichent déjà |

Les props suivent : l'écran ne reçoit plus que `profil` et `nomCompte` (plus de
`collection`, `portefeuille`, `quetes`, `statutSync`) et quatre gestes —
`onRenommer`, `onChoisirEmbleme`, `onChoisirAvatar`, `onChoisirPlateau`.
`paliersAVenir`, `BAREME_XP` et `RANGS` restent exportés — un autre écran, ou
une infobulle, pourra les reprendre sans qu'ils reviennent ici.

Les quatre gestes arrivent du hook **renommés** : `choisirUnEmbleme:
choisirUnEmblemeProfil`, `choisirUnAvatar: choisirUnAvatarProfil`,
`choisirUnPlateau: choisirUnPlateauProfil`. Écrire le nom de la page tout seul
déstructure un champ que le hook ne rend pas, le prop part `undefined`, et le
clic ne fait plus rien — sans erreur, sans avertissement, nulle part. C'est
arrivé à l'emblème : le visage et la table répondaient, l'emblème semblait
inerte. Deux garde-fous le tiennent maintenant : le smoke clique les trois
gestes **à travers la vraie page** (page → menu → écran → hook → stockage, puis
retour au menu pour l'onglet), et `rpg-profil-check.mjs` vérifie le renommage
dans la source, geste par geste.

L'identité tient désormais en trois champs (`pseudo`, `embleme`, `avatar`) plus
un choix de table (`plateau`). Le module du profil ne connaît **ni le casting ni
les plateaux** : il garde une chaîne propre bornée à 48 caractères, et ce sont
les catalogues qui valident à la lecture — un visage ou une table inconnus
rendent `null`, le médaillon retombe sur le glyphe, la table sur le deck. La
fusion reprend la règle du pseudo : le côté le plus récent parle, et un choix
qui n'existe que d'un côté ne s'efface jamais.

L'ancienne découpe, pour mémoire — cinq sections, dans l'ordre de lecture :

1. **l'en-tête** — emblème, pseudo, rang et sa phrase, médaillon du niveau,
   état de la synchronisation (« ☁ Profil synchronisé avec votre compte »,
   « Compte non rejoint : le profil reste sur cet appareil »), bouton Menu ;
2. **la barre d'XP** — un `role="progressbar"` complet (`aria-valuenow`,
   `-min`, `-max`, `-text`), la lecture en toutes lettres (« 214 / 353 XP dans
   le niveau 5 — encore 139 XP avant le niveau 6, qui offrira un paquet du
   Souk »), les quatre prochains paliers et leur prix, la formule de la courbe
   écrite noir sur blanc ;
3. **l'identité** — le pseudo (24 caractères, un champ vide n'efface rien et
   l'écran le dit) et les six emblèmes ;
4. **les compteurs** — seize lignes, dont « Paquets offerts par un palier »
   et « Cartes dans la collection » ;
5. **le barème et le journal** — les dix gestes payés, puis les vingt derniers
   paliers avec leur date et leur motif (« Niveau 7 · 12 mars, 14 h 05 · un
   étage déblayé · 1 paquet offert »).

Marques de vérification dans le DOM : `data-profil`, `data-profil-niveau`,
`data-profil-xp`, `data-profil-xp-need`, `data-profil-xp-maximal`,
`data-profil-xp-percent`, `data-profil-xp-reste`, `data-profil-pseudo`,
`data-profil-pseudo-saisie`, `data-profil-pseudo-enregistrer`,
`data-profil-pseudo-vide`, `data-profil-attente`, `data-profil-attente-aller`,
`data-profil-medaille`, `data-profil-avatar-image`, `data-profil-avatars`,
`data-profil-avatar`, `data-profil-embleme`, `data-profil-cachet`, `data-profil-plateaux`,
`data-profil-plateau`, `data-profil-plateau-auto`, `data-profil-identite`,
`data-profil-retour`. Sur l'onglet : `data-profil-onglet-avatar`.
**Retirées** : `data-profil-rang`, `-sync`, `-courbe`, `-bareme`, `-stat` et
`-journal` — `scripts/rpg-profil-check.mjs` vérifie maintenant leur **absence**.
Sur la page : `data-profil-onglet`, `data-profil-xp-onglet`,
`data-profil-pastille`, `data-victoire-xp`, `data-victoire-niveaux`,
`data-niveau-toast`, `data-niveau-dus`, `data-souk-ceremonie-offert`,
`data-souk-ceremonie-niveau`.

## 7. Les deux visages d'une montée de niveau

`MonteeDeNiveau` (dans la page, jamais dans l'écran) n'en montre qu'un à la
fois :

- **le paquet offert** — la cérémonie du Souk, montée par la page parce qu'un
  palier tombe aussi en plein duel. Dans `.rpg-battle`, elle passe à
  `z-index: 10045` : la navigation de la table est à 900 et le journal du
  combat à 80, donc une cérémonie à 60 (sa valeur au Souk) serait passée
  **sous** la table ;
- **l'annonce seule** — `.rpg-niveau-toast` à `z-index: 10040`, `role="status"`,
  `aria-live="polite"`, quand le comptoir ne peut pas encore tirer. Elle dit le
  niveau et le nombre de paquets qui attendent, se ferme à la main, et se
  referme toute seule au bout de 6 s. Le toast du tutoriel reste au-dessus
  (10 050) : deux annonces ne se battent pas.

En plein duel, la cérémonie ne mange aucun chrono : le seul minuteur est celui
du salon PvP, et le PvP ne verse pas d'XP (P8).

L'onglet du menu tient sur téléphone. Sous 560 px, `rpg-battle.css` empile tous
les `span` d'un onglet (`display: block`) : les règles du Profil sont donc
**qualifiées** (`.rpg-mode-menu__switch button.rpg-mode-menu__profil …`) pour
que l'emblème, le libellé, le niveau et la pastille gardent leur ligne, pendant
que la piste d'XP — une barre, pas un signe — reste un bloc de 34 px (26 px
sous 1 100 px, où le libellé s'efface).

## 8. Les chiffres, et ce qu'ils donnent

| Palier | XP total | Duels libres | Premiers déblayages |
| --- | --- | --- | --- |
| niveau 2 | 26 | 1,3 | 0,4 |
| niveau 3 | 106 | 5,3 | 1,5 |
| niveau 5 | 506 | 25 | 7 |
| niveau 10 | 3 610 | 180 | 52 |
| niveau 20 | 23 788 | 1 189 | 340 |
| niveau 30 | 70 391 | 3 520 | 1 006 |
| niveau 60 | 442 471 | 22 124 | 6 321 |

Les deux colonnes de droite bornent la courbe : personne ne monte au seul duel
libre (le farm le moins rentable), et le campagnard qui déblaie ses vingt
étages arrive vers le niveau 5–6 en finissant la première tour. Une journée de
jeu ordinaire — trois quêtes, deux Cachets, un étage, un paquet — verse
environ 200 XP : de quoi franchir un palier tous les deux ou trois jours au
début, un par semaine vers le niveau 15, un par mois vers le niveau 30.

Côté cartes : 59 paquets offerts sur toute la courbe, soit 295 cartes tirées
pour un catalogue de **157** — de quoi le couvrir presque deux fois. Le paquet
de palier complète donc la collection bien avant le plafond, et la deuxième
moitié de la courbe rend surtout des doublons (leur remboursement ◈, P5). La
pitié, elle, continue de tourner : une mythique assurée tous les douze paquets,
offerts compris.

## 9. Vérifications

```bash
npm run check:rpg-profil   # tests/rpg-profil.test.js + scripts/rpg-profil-check.mjs
npm run check:rpg-souk     # l'économie du comptoir, dont le paquet offert
npm run check:rpg          # les 915 tests du Sablier
npm run build
```

`tests/rpg-profil.test.js` (28 tests) tient : la monotonie de la courbe palier
par palier, les bornes de `niveauDeXp`, la forme de `progressionDeXp`, les
paliers à venir, les rangs, la dette (un niveau = un paquet, deux niveaux =
deux paquets, la dette qui survit à la fusion, le plafond qui ne sonne plus),
la stabilité référentielle de `gagnerXp` / `renommerProfil` / `choisirEmbleme` /
`marquerBoosterOffert`, le barème, les motifs, la normalisation des profils
abîmés, la fusion, le stockage, et `ouvrirBoosterOffert` (zéro crédit, cinq
cartes, journal `offert`, même tirage qu'un achat à graine égale).

`scripts/rpg-profil-check.mjs` monte l'écran dans jsdom **branché sur le vrai
hook** : quatre cartes posées remplissent la barre, un duel libre gagne fait
tomber le niveau 2, la cérémonie s'ouvre avec `data-souk-ceremonie-offert`,
aucun crédit n'est débité, un second palier franchi **pendant** la cérémonie
reste dû (bandeau « un paquet vous attend »), la fermeture règle la dette, la
seconde cérémonie repart du sachet (`key`), le pseudo et l'emblème s'écrivent
et survivent à un remontage — puis la **vraie page** est montée pour l'onglet
Profil, son `aria-current`, son aria-label, son aller-retour vers le menu, et
surtout **les trois gestes cliqués à travers elle** : l'emblème se marque et se
lit sur l'étiquette, le visage se peint, la table se choisit, les trois choix
sont écrits sur l'appareil, et l'onglet du menu repart avec la vignette du
visage. Un prop perdu entre la page et l'écran — comme l'emblème renommé de
travers — ne se voit que là.
Les gardes de source vérifient ce que le DOM ne peut pas dire : où vit la
persistance, qui tire le rayon au hasard, ce qu'une dette impayée ne répète
pas, et à quelle hauteur la cérémonie passe au-dessus de la table. Elles
tiennent aussi la carte **dépouillée** : ni `paliersAVenir`, ni `BAREME_XP`, ni
`RANGS`, ni aucune des classes retirées dans la source de l'écran, aucune
section à titre, aucun `<img>` dans le flux (les vignettes sont des fonds
peints) — et, côté page, que l'écran ne reçoit plus `collection`,
`portefeuille`, `quetes` ni `statutSync`, mais bien les quatre gestes, **chacun
renommé** à la déstructuration du hook. Elles tiennent aussi les noms : le sceau
et la légende peinte existent dans l'écran et dans `rpg-profil.css`
(`.rpg-profil__cachet` en `position: absolute`, `.rpg-profil__plateau-nom` en
deux lignes, `.rpg-profil__etiquette b`).

`tests/rpg-profil.test.js` (34 tests) ajoute l'identité élargie : un profil neuf
n'a ni visage ni table, `choisirAvatar` / `choisirPlateau` s'écrivent et se
retirent avec `null`, la fusion ne perd pas un choix qui n'existe que d'un
côté, les douze visages ont chacun leur portrait canonique **et** leur
vignette de moins de 60 Ko. `tests/rpg-plateaux.test.js` (38 tests) tient la
table choisie : la moitié du joueur obéit, celle de l'adversaire reste chez
elle, un terrain choisi n'est jamais merveilleux malgré lui, le rng n'est pas
consommé pour qui a demandé, et sans choix la résolution reste celle d'avant.

Les contrôles voisins ont été mis à jour pour dire la même chose :
`scripts/rpg-souk-bourse-smoke.jsx` et `scripts/rpg-souk-smoke.jsx` affirment
désormais le montant **rendu par le geste** (exact) et un solde qui monte
d'autant (un paquet de palier peut rendre ses doublons par-dessus) ;
`scripts/rpg-tutorial-smoke.jsx` de même pour les 120 ◈ de la première leçon,
qui verse aussi ses 40 XP.

## 10. Risques et points ouverts

- **Le plafond de 60 niveaux est atteignable** (442 471 XP). Passé ce niveau,
  l'XP continue de compter mais plus rien ne sonne : si la ville grandit
  (nouvelles tours, nouveaux chapitres), il faudra soit relever le plafond,
  soit payer les paliers autrement. La courbe est une constante
  (`COURBE.base`, `COURBE.exposant`) : la relever ne touche aucun écran.
- **Un pseudo n'est pas modéré.** Il est borné à 24 caractères, nettoyé de ses
  espaces et de ses sauts de ligne, et il reste local ou dans le `jsonb` du
  joueur (RLS stricte). Rien ne l'affiche à un autre joueur aujourd'hui — le
  jour où le PvP montrera la carte de profil, il passera par la modération des
  pseudonymes du site.
- **La cérémonie en plein duel** coupe la lecture de la table quelques
  secondes. Elle est fermable immédiatement (« Passer », « Tout ranger »),
  aucun chrono ne tourne, et le PvP n'en déclenche jamais. Un réglage
  « annoncer sans ouvrir » (tout ranger d'office) reste possible si l'usage le
  demande : la dette et le tirage ne changeraient pas.
- **Les doublons d'un paquet offert rendent des crédits** (P5). C'est
  volontaire — un paquet est un paquet — mais cela fait du palier une petite
  source de ◈. Le montant reste marginal devant un premier déblayage (50 ◈) et
  un paquet acheté (140 ◈) ; à surveiller si la courbe est relevée.
- **L'XP ne se synchronise pas en temps réel entre deux onglets.** La fusion au
  retour du compte est monotone, donc rien ne se perd, mais deux onglets
  ouverts en même temps jouent chacun leur barre jusqu'au prochain
  `pousser()`.
