# PLAN — Vice City Rush : le Nürburgring Nordschleife

## Objectif

Ajouter au jeu **Vice City Rush** un huitième parcours jouable : le **Nürburgring
Nordschleife**, aussi fidèle que possible au circuit réel — enchaînement des
virages, noms des sections, kilométrage officiel, point bas de Breidscheid
(320 m), sommet de la Hohe Acht (620 m), virole de béton du Karussell, pont
d'Antoniusbuche, ligne droite de la Döttinger Höhe (2 135 m), sens horaire,
20,832 km, 73 virages (33 à gauche, 40 à droite).

La boucle jouable du moteur reste une boucle de 600 m : le tour réel y est
rejoué à l'échelle 1:35 (20,832 km → 600 m), comme la C1 de Tokyo rejoue ses
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
