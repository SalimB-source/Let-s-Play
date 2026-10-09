# PLAN — Vice City Rush : le Nürburgring Nordschleife

## Objectif

Ajouter au jeu **Vice City Rush** un huitième parcours jouable : le **Nürburgring
Nordschleife**, aussi fidèle que possible au circuit réel — enchaînement des
virages, noms des sections, kilométrage officiel, point bas de Breidscheid
(320 m), sommet de la Hohe Acht (620 m), virole de béton du Karussell, pont
d'Antoniusbuche, ligne droite de la Döttinger Höhe (2 135 m), sens horaire,
20,832 km, 73 virages (33 à gauche, 40 à droite).

La boucle jouable du moteur est une boucle de 1 200 m : le tour réel y est
rejoué à l'échelle 1:17 (20,832 km → 1 200 m), comme la C1 de Tokyo rejoue ses
14,8 km. Le HUD affiche le kilomètre officiel et le secteur réellement traversé.

## Adaptations assumées (le joueur les a explicitement autorisées)

- **Tracé plus franc** : la ligne centrale n'est plus deux S très doux
  (±2,35 unités, ~3° de cap) mais un profil de courbure intégré, construit à
  partir de la suite réelle des virages (Aremberg, Karussell, Wehrseifen,
  Schwalbenschwanz…). Cap jusqu'à ~20-25°, déport latéral ~±18 unités.
- **Relief marqué** : profil d'altitude réel (Breidscheid 320 m, Hohe Acht
  620 m, cuvette de la Fuchsröhre, montée du Kesselchen) ramené à l'échelle du
  jeu, pentes jusqu'à ~30 % visuels (18 % réels × compression 35×).
- **Voies réduites** : piste étroite à sens unique — 9,20 m de bitume (les
  8,40 m réels + la marge peinte) répartis en 4 voies de 2,10 m, au lieu de six
  voies à double sens sur 13,40 m. Les voies sont marquées au sol (voir « Suite
  — les lignes des voies »).
- **Plus de trafic en face** : `oncomingCount: 0` — un circuit permanent ne
  croise personne. Le trafic restant est celui d'une journée de tourisme
  (ambulance, berline de police, GT de passage), sur une seule voiture par voie :
  un troisième véhicule bloquerait une voie et empêcherait l'escouade du dernier
  tour de revenir sur le leader.

## Fichiers

- `src/games/cityRushRules.js` — données du circuit : `CITY_RUSH_NORDSCHLEIFE`
  (36 secteurs contigus avec km réels, noms, notes, côté du virage, panneaux),
  profil de courbure (`nordschleifeTrackOffset/Tangent/Yaw`), profil d'altitude
  (`nordschleifeTrackElevation/Grade/Pitch`), trace de mini-carte
  (`NORDSCHLEIFE_OUTLINE_KM`, relevé OpenStreetMap ODbL), configuration des
  voies (`cityRushLaneSetup`), helpers de route génériques, `nordschleifeReadout`
  (km officiel, secteur, altitude, surface, prochaine section signée).
- `src/games/nordschleifeStage.js` — décor : forêt de l'Eifel, glissières,
  vibreurs rouge et blanc, trappes à graviers, panneaux allemands (atlas),
  ponts d'Antoniusbuche, de Breidscheid et de l'Eschbach, village de
  Breidscheid, château de Nürnburg, virole du Karussell, tour de la Hohe Acht,
  croix du Schwedenkreuz, talus spectateurs de Brünnchen/Pflanzgarten, tribunes
  de la Start-Ziel-Anlage.
- `src/games/cityRushThemes.js` — thème `nordschleife` : journée d'Eifel,
  brume, vert des forêts, vibreurs rouge et blanc, panneaux blancs.
- `src/games/cityRushStage.js` — ruban de piste piloté par le profil du
  parcours (`updateCurvedStrip`, `makeRoad`, `finishLoopGeometry`), herbe des
  bas-côtés, herse de sprint à l'échelle de la piste.
- `src/games/ViceCityWorld.jsx` — aiguillage du décor et de la route, voies du
  parcours (`cityRushLaneSetup`), HUD de route pour tout parcours officiel,
  rencontres et police sur les voies du parcours.
- `src/games/cityRushStartLine.js` — grille de départ et vibreurs à l'échelle
  de la piste.
- `src/games/ViceCityRushPage.jsx` — vignette, plaque de route, texte d'intro.
- `public/nordschleife-thumb.jpg` — vignette du circuit (même direction
  artistique que les autres : photo de course, pas de schéma).
- `src/games/cityRushAudio.js`, `src/achievements/catalog.js`,
  `scripts/achievements-check.mjs` — bande-son (116 BPM) et succès (8 parcours).
- `README.md` — chapitre « Vice City Rush : le Nordschleife ».

## Vérifications

- `npm run check:city-rush` (règles, thèmes, audio, HUD, garage, etc.).
- `npm run check:city-rush-nordschleife` (nouveau : données du circuit,
  secteurs contigus, profil de piste, voies réduites, mini-carte).
- `npm run check:city-rush-smoke -- --all` : les huit parcours, dont le
  Nordschleife, jouent une course complète de 6 tours sans exception.
- `npm run check:city-rush-mexico` et `check:vice-city-nordschleife-ui`
  (vignette, sélection, garage, HUD en jsdom).
- `npx vite build` : build de production propre.

## Suite — de longs virages qui tournent presque sec

Demande : « sur la course Nürburgring, rajoute des longs virages qui tournent
presque sec ». Le profil précédent plafonnait à **14° de cap** avec des appuis
de **30 m** (moins d'une seconde) : aucun virage ne se sentait tenir. Le choix
retenu avec le joueur est un **mélange** : des enchaînements longs, où le tracé
s'ouvre en courbe douce puis se resserre sur une cassure franche.

### Ce qui change

- **Une forme d'appui par virage** (`nordschleifeCornerCurve`, quatrième
  élément de chaque entrée de `CITY_RUSH_NORDSCHLEIFE_TURNS`) :
  - `'sustained'` — appui tenu : la courbure reste à son maximum sur la moitié
    centrale du virage. C'est le long virage qui tourne presque sec (Hatzenbach,
    Hocheichen, Schwedenkreuz, Fuchsröhre, Kesselchen, Pflanzgarten…).
  - `'tightening'` — 45 % de l'angle en entrée douce, 55 % dans une cassure
    étroite placée vers la sortie (Aremberg, Metzgesfeld, Wehrbüsch,
    Brünnchen, Schwalbenschwanz…).
  - `'snap'` — cassure seule, concentrée (épingle d'Adenauer Forst, virole du
    Karussell).
  - `'smooth'` — la cloche rapide d'origine (ligne droite, crêtes, Fuchsröhre
    d'entrée).
  Chaque forme est **normalisée à une aire de 1** : l'angle annoncé reste
  exactement l'angle dont le virage fait tourner le cap.
- **Étendues recalibrées** : les virages deviennent des courbes de 250 à 900 m
  de relevé (Karussell 200 → 450 m), bornes des secteurs du HUD conservées.
- **Déport maximal 15 → 18 unités** : les longs appuis ont besoin de toute la
  largeur du ruban.
- **Ruban affiné** (112 → 176 rangées, une tous les 2,63 m) : une cassure de
  31° entre deux rangées pliait la piste au Karussell.
- **Fermeture du profil corrigée** : la suite discrète s'arrête un pas avant la
  ligne ; sans le pas de fermeture, le déport laissait une marche de 0,28 unité
  au portique (invisible avec les 5° de la première table, visible avec les
  longs appuis).

### Mesures (profil rendu, `nordschleifeTrackYaw`)

| | avant | après |
| --- | --- | --- |
| cap maximal | 13,9° | **31,0°** |
| part du tour ≥ 10° | 7 % | **33 %** |
| appuis ≥ 14° | 0 | **11** |
| appui le plus long (≥ 10°) | 29 m (0,8 s) | **71 m (2,0 s)** |
| rayon minimal du tracé | 12,6 unités | 5,5 unités |

Le rayon minimal de 5,5 unités (7 m) est la limite de pliabilité du ruban : les
virages réels plus serrés que cela sont rendus à cette limite, sans jamais
replier la piste sur elle-même à l'image.

### Vérifications

- `tests/city-rush-rules.test.js` — « le Ring enchaîne de longs appuis, avec des
  cassures qui se resserrent » : aires des quatre formes, longueur des appuis,
  asymétrie du virage qui se resserre, fermeture du profil, appuis nommés
  (Kesselchen, Hatzenbach), rayon du cap.
- `npm run check:city-rush`, `check:city-rush-smoke -- --all`,
  `check:city-rush-nordschleife`, `npx vite build`.

## Suite — les lignes des voies

Demande : « dans la course Nürburgring, ajoute les lignes des voies ». La piste
du Ring se partage en quatre voies de 2,10 m mais roulait sans marquage — le
code assumait même « pas de ligne axiale : une piste, pas une route ». Les
quatre voies ne se lisaient donc qu'à la grille de départ.

### Ce qui change

- **Le marquage se déduit des voies.** `CITY_RUSH_LANE_PAINT_WIDTH = 0,16 m` et
  `cityRushLaneSeparators(parcours)` (dans `cityRushRules.js`) donnent l'abscisse
  des lignes peintes, au milieu de chaque paire de voies : les six voies
  urbaines gardent leurs séparateurs historiques (∓2,10 m, ∓4,20 m et l'axe) et
  le Ring tombe sur −2,10 m, 0 et +2,10 m.
- **La texture de piste les peint** (`makeRacewayTexture`, désormais exportée
  pour le contrôle) : traits de 3,72 m pour 9,30 m de motif — le quart du
  carreau de 37,2 m, donc quatre traits par carreau et aucune couture au
  raccord — à 16 cm de large. Les rives continues passent à la teinte de voie du
  thème (`laneColor`). L'axe reste blanc : sur un circuit, personne ne vient en
  face, une ligne jaune n'aurait aucun sens.

### Vérifications

- `npm run check:city-rush-nordschleife-lanes` (nouveau) — dessine la vraie
  texture dans un canevas qui enregistre chaque trait, puis relit le dessin en
  mètres : position des trois lignes, largeur peinte, longueur des traits,
  raccord du carreau, rives, et rien qui recouvre le marquage. Une piste nue
  échoue.
- `tests/city-rush-rules.test.js` — « les lignes peintes séparent exactement les
  voies de chaque parcours » (villes et Ring).
- `npm run check:city-rush`, `check:city-rush-nordschleife`,
  `check:city-rush-smoke -- --all`, `npx vite build`.

## Suite — le contresens paye, la voie se verrouille en l'air, Londres et Tokyo passent à gauche

Demande : « Dans le jeu Vice City Rush, les 3 voies de la route inverse donnent
un bonus cumulatif de vitesse. Sur la course de Londres et du Japon, inverse les
voies de gauche et de droite (conduite à gauche). Aussi par rapport au saut, le
saut empêche de bouger en l'air. » Deux points ont été confirmés avec le joueur
avant d'écrire : le bonus de contresens était à **créer** (il n'existait pas —
seule la « ligne propre » donnait de la vitesse), et le verrou de voie en plein
saut est la **règle voulue**, pas un bogue à corriger.

### Ce qui change

- **Bonus de contresens** (`cityRushRules.js`) : `CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION`
  = 4 s pour la jauge pleine, `CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION` = 1,2 s
  pour la vider (plus vite qu'elle ne monte), `CITY_RUSH_ONCOMING_BONUS_MAX` =
  1,35 ×, `cityRushOncomingBonusFactor(jauge)` et
  `advanceCityRushOncomingBonus(jauge, dt, inOncoming)`. La jauge se **multiplie**
  aux autres facteurs dans `targetPlayerSpeed` (`ViceCityWorld.jsx`), ne monte
  que si le pilote roule dans une voie de `oncomingLaneSet` sans être épave ou
  sonné, et retombe sinon.
- **Conséquences jouables** : `applyOncomingImpact` remet la jauge à zéro et
  émet `oncoming-bonus`/`'lost'` en plus du choc frontal (qui recale le joueur
  derrière la voiture en face) ; le HUD publie `oncomingBonus`,
  `oncomingBonusMax` et `oncomingTime` ; la page affiche le pourcentage dans la
  carte VITESSE (`.city-rush-speed-bonus`) et la pastille
  `CONTRESENS · +X %` (`.city-rush-status-pill.is-oncoming`), avec le règlement
  du bandeau de mode mis à jour.
- **Conduite à gauche** : `CITY_RUSH_DRIVE_SIDES` / `cityRushDriveSide(parcours)`
  et `driveSide: 'left'` sur `tokyo` et `london` (villes **et** thèmes). Dans
  `cityRushLaneConfig`, la conduite à gauche échange les moitiés : `forwardLanes`
  = [0,1,2], `oncomingLanes` = [3,4,5], `policeLanes` = moitié de course, et la
  grille de départ passe à `CITY_RUSH_DEFAULT_LANES_LEFT_HAND` = [1,0,2] (joueur
  au milieu de la moitié gauche). Les **abscisses** ne changent pas : c'est le
  rôle des moitiés qui s'échange, donc `cityRushOncomingImpactX(startX, elapsed,
  width, driveSide)` renvoie le véhicule heurté vers le **bord de son sens** (à
  droite) et l'effet `traffic-impact` porte `pushDirection: 'right'`.
- **Textures** : `makeRoadTexture` (rues, dont Londres) et
  `makeExpresswayDeckTexture` (tablier de la Shuto) lisent
  `cityRushThemeDriveSide(theme)` et peignent les flèches de voie en miroir (les
  voies de course pointent vers l'avant, le contresens vers le joueur).
- **Saut** : `cityRushLaneAfterAction(voie, action, nombre, { airborne })`
  retourne la voie de décollage sans la changer quand `airborne` est vrai.
  `action()` du joueur passe `airborne: playerJumpState.active` et le choix de
  voie des rivaux est gelé par `racerAirborne` (`racer.jumpState.active`). Le
  guide des tremplins de `ViceCityRushPage.jsx` l'annonce.

### Vérifications

- `tests/city-rush-rules.test.js` : « a jump locks the wheel… », « London and
  the Shutō C1 drive on the left… » (moitiés, grille reflétée, abscisses
  inchangées, Ring sans contresens) et « the oncoming bonus ramps up… »
  (montée, plafond, retombée plus rapide, bornes basses) ; le test du choc
  frontal couvre la déviation miroir.
- `tests/city-rush-themes.test.js` : « the driving side is painted by the theme
  and mirrored by the course, city by city » (Tokyo et Londres seuls à gauche,
  thème et parcours d'accord).
- `tests/city-rush-hud.test.js` : le bonus dans le monde/le HUD/la page, la
  conduite à gauche jusque dans les textures, le verrou de voie en l'air
  (joueur et rivaux) et le texte du guide.
- `npm run check:city-rush`, `check:city-rush-smoke -- --all` (le pilote
  automatique vise le contresens selon `cityRushLaneConfig` et la jauge doit
  bouger sur les sept parcours à trafic en face, jamais sur le Ring),
  `check:city-rush-nordschleife-lanes`, `check:city-rush-sprint`,
  `check:city-rush-wreck`, `check:vice-city-fullscreen`, `npx vite build`.

## Suite — les rivaux aussi se font pourchasser par la police

### Objectif

Le joueur n'est plus la seule cible : dans Vice City Rush, un **adversaire** est
pourchassé par la police quand il **touche** une voiture de police (carambolage
comme tir) ou quand il **mène la course au dernier tour**.

### Ce qui change

- **Règles pures** (`src/games/cityRushRules.js`) :
  `cityRushRivalWantedLevelAfterContact` (trois étoiles, le barème du contact du
  joueur), `cityRushRivalPursued` (≥ trois étoiles), `cityRushRivalPursuerCount`
  (**une** berline — celle de la réserve du rival, jamais l'escouade du joueur) et
  `cityRushRivalLeaderWanted({ leader, lastLap, playerId })` (seul un rival mène
  sans escouade ; le joueur a la sienne).
- **Le monde** (`ViceCityWorld.jsx`) : chaque rival porte son `wantedLevel` ;
  `registerPoliceRetaliation(attackerId, source, { reason })` reçoit les motifs
  `police-shot`, `police-contact`, `last-lap-leader` et `pursuer-renewal` (relève
  d'une unité dédiée détruite, après le délai de l'escouade) ;
  `checkRivalPoliceCollisions` (carambolage rival/berline, `cityRushPoliceCollisionHit`) ;
  le face-à-face d'un rival retourne la patrouille pour lui (`applyOncomingImpact`) ;
  la berline de ronde percutée sort de sa patrouille (`rallyTrafficPolice`) ;
  `chaseLastLapLeader(leader, playerLap)` ouvre le dossier du premier du dernier
  tour ; l'épave d'un rival referme son dossier et lâche ses poursuivants
  (`releasePolicePursuit`).
- **HUD** : le classement publie `wanted` / `pursued` par pilote
  (`CityRushRaceList.jsx`, pastille 🚨 `.city-rush-race-list-pursued`), jamais sur
  la ligne du joueur ; les textes de mode et du guide de `ViceCityRushPage.jsx`
  annoncent les deux motifs.

### Vérifications

- `tests/city-rush-rules.test.js` : le barème du contact d'un rival (trois
  étoiles, jamais de baisse, une seule unité) et la règle du premier du dernier
  tour (joueur exclu, avant-dernier tour exclu).
- `tests/city-rush-hud.test.js` : le motif du dossier dans `damagePolice`, les
  deux carambolages (ronde et contresens), le carambolage des berlines de
  poursuite, `chaseLastLapLeader`, la pastille du classement et sa CSS.
- `npm run check:city-rush-rival-police` : le nouveau harnais, joué sur les dix
  parcours à graine fixe, en deux passes — motifs mêlés (dix poursuites par
  carambolage) puis `--leader-only` (le flot sans berline de police : dix
  poursuites du premier du dernier tour).
- `npm run check:city-rush`, `check:city-rush-smoke`, `check:city-rush-weapons`,
  `check:city-rush-police-fire`, `check:city-rush-police-wreck`,
  `check:city-rush-wreck`, `npx vite build`.

## Suite — le choc latéral : on pousse la voiture qui bloque

### Objectif

Une voiture **à côté** du pilote, dans la voie qu'il veut rejoindre, lui ferme
cette voie. S'il tourne quand même vers elle, il y a **choc** : la voiture
bloquante se pousse sur la voie voisine, **du côté opposé au pilote**, et les
deux voitures perdent un carré. Le trafic ordinaire n'a pas de PV et ne perd
rien ; un rival ou une berline de police perd un PV.

### Ce qui change

- **Règles pures** (`src/games/cityRushRules.js`) :
  `CITY_RUSH_SIDE_CONTACT_GAP` (= `CITY_RUSH_TRAFFIC_CAR_GAP`, 3,6 m : à côté =
  pare-chocs contre pare-chocs), `cityRushIsLevel` (même hauteur, deux voies au
  plus), `cityRushIsAlongside` (voie voisine et même hauteur),
  `cityRushSideBumpLane` (voie d'arrivée : la voie voisine du côté opposé, dans
  le sens de circulation de la voiture, sinon `null`), `cityRushSideBumpLaneClear`
  (voie d'arrivée libre, distance de sécurité 4,8 m), `cityRushSideBumpChoice`
  (la voiture la plus proche, pas déjà poussée, qui a une voie libre) et
  `cityRushSideBumpKeep` (l'épisode tient tant que la voiture reste à la même
  hauteur).
- **Le monde** (`src/games/ViceCityWorld.jsx`) :
  - `canEnterLane` : pour le **pilote seul**, les rivaux (non en vol, non en
    épave) et les berlines de patrouille lâchées ferment la voie comme le trafic.
    Les rivaux restent traversables entre eux, et la police garde son verrou.
  - `action()` (gauche / droite) : si la voie est refusée et que le pilote a
    tourné (pas en bord de chaussée), `trySideBump(targetLane)` essaie le choc.
  - `applySideBump` : la voiture part sur sa voie d'arrivée. Trafic, patrouille
    et ronde reprennent le rabat du trafic (`impactChanging`, 0,5 s). Un rival ou
    une berline de l'escouade prend un dérapage court et garde sa voie
    (`changeIn`, `collisionCooldownLeft`). Le pilote glisse à l'opposé, la
    caméra secoue, les étincelles et le son du carambolage sont joués
    (`spawnTrafficImpact`, `skid`). Le contact compte dans `playerVehicleContacts`
    (missions « zéro contact »).
  - Le carré du pilote passe par `applyCarCollision` (répit partagé de 1,5 s). Le
    PV de la voiture bloquante passe par `damageRacer` ou `damagePolice`. Une
    ronde touchée rejoint la poursuite (`rallyTrafficPolice`), puis encaisse son
    carré. Un choc frontal d'une patrouille venant en face la fait se retourner
    (`damagePolice` appelle `beginOncomingPoliceTurnaround`).
  - `pruneSideBumpContacts` (chaque image) : une voiture qui n'est plus à la même
    hauteur sort de l'épisode ; un nouveau côte-à-côte sera à nouveau un choc.
  - Les SUV de charge, les voitures en demi-tour, en vol ou en épave ne sont pas
    touchés. Le choc n'occupe pas la page : `ViceCityRushPage.jsx` ignore
    l'effet `side-bump`. Le HUD montre le carré perdu (barre de vie) et le
    compteur de contacts.
- **Dégâts** : un rival touché par un carambolage annonce `collision-hit` au lieu
  de `blue-shot-hit` (le tir bleu ne se confond plus avec un choc).
- **Décisions prises** (validées dans la conversation) : toutes les voitures
  sont concernées (trafic, rivaux, escouade et rondes, voitures venant en face) ;
  le trafic ordinaire ne perd pas de PV ; un seul choc par côte-à-côte ; pas de
  choc quand la voie d'à côté est occupée ou au bord ; le pilote ne ralentit pas ;
  le glissement reprend la cinétique existante du rabat du trafic
  (`CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION` = 0,5 s comme constante : aux deux tiers
  du chemin à 0,5 s, arrivée complète vers 1,8 s).

### Vérifications

- `tests/city-rush-side-bump.test.js` (14 cas, dans `check:city-rush`) : les seuils
  (3,6 m pour le contact, 4,8 m pour la voie), la voie d'arrivée selon le sens de
  circulation et les bords, la voie occupée, le choix de la voiture la plus
  proche, l'épisode complet (un seul choc tant que les voitures restent côte à
  côte) et le nouvel épisode après séparation.
- `npm run check:city-rush-side-bump` : le harnais `scripts/city-rush-side-bump-check.mjs`
  joue le vrai monde sur les huit parcours (`--all`), avec de vrais événements
  clavier et des voitures posées par `world.harness` : trafic poussé (un carré
  pour le pilote, aucun PV pour le trafic), glissement, un seul choc côte à côte
  même touche tenue (et, sur le Ring à quatre voies, pas de second choc sur la
  voiture encore côte à côte), bord de chaussée et voie occupée (rien ne bouge),
  4 m (voie fermée sans choc), rival (un PV), berline de l'escouade (un PV), ronde
  (rejoint la poursuite, un PV), voiture venant en face (aucun PV).
  Mutations vérifiées : sans mémoire d'épisode, le harnais échoue sur le Ring ;
  sans `trySideBump`, il échoue au premier cas ; sans contrôle de la voie
  d'arrivée, il échoue au bord de la chaussée.
- `npm run check:city-rush-smoke` (huit parcours), `check:city-rush-rival-police`
  (deux passes), `check:city-rush-police-wreck`, `check:city-rush-police-fire`,
  `check:city-rush-blue-shot`, `check:city-rush-bazooka`,
  `check:city-rush-tutorial-run`, `check:city-rush-sprint`, `check:city-rush-lanes`,
  `check:city-rush-nordschleife-lanes`, `check:city-rush-steer-hold`,
  `check:city-rush-tournament`, et la partie interface de `check:city-rush-missions` : verts.
- `npx vite build` : vert.

### Points restés ouverts

- **`check:city-rush-missions` (partie mission-run) ne passe plus sur la graine par
  défaut.** Le bot scripté de « Poursuite du dealer » traversait les rivaux ; il
  tourne maintenant vers une voiture qui est à côté de lui, ce qui la pousse hors
  de la mire et ferme sa voie. Sur la base, ce même contrôle ne passait déjà que
  sur 3 graines sur 8 (20261004, 22 et 44) : son issue dépend de la trajectoire
  exacte des voitures. Ce n'est pas tranché : soit on accepte la poursuite plus difficile
  et on règle le contrôle (ou la mission), soit les cibles de mission restent
  traversables (exception à « toutes les voitures »).
- `check:city-rush-wreck --all` échoue déjà sur la base : la réserve de cellules
  de départ n'est pas celle que le contrôle attend, et les réparations au
  mini-garage (effet `mini-garage-used`, PV relevés sans `player-hit`) ne sont
  probablement pas suivies. Même famille d'erreurs après le changement.
- Les vérifications d'interface (`check:city-rush-mexico`, `check:city-rush-sprint-ui`,
  `check:city-rush-tutorial-ui`, `check:city-rush-quiet`) dépendent d'un canevas et
  d'un WebGL absents du bac à sable : elles échouent aussi sur la base.
