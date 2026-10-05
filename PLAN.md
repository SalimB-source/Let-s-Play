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
  voies à double sens sur 13,40 m.
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
  - `'snap'` — cassure seule, concentrée (chicane de Hohenrain, épingle
    d'Adenauer Forst, virole du Karussell).
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
