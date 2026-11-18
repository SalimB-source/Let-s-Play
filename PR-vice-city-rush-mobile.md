# Vice City Rush : cadrage portrait, tiroir d'actions et premier clic sur RENDU

## En une phrase

Sur téléphone, la ville se cadre comme sur un écran large (champ élargi, poursuite
qui recule) et les sept actions passent dans un tiroir **☰ ACTIONS** ; en paysage
et sur ordinateur, **rien ne bouge** — même champ, même recul, même colonne de
112 px.

---

## Ce que voit le joueur

**Portrait (390 × 844)**

- Champ vertical élargi à **88°** (au lieu de 66°) : le champ horizontal passe de
  41° à plus de 80°, la rue et les trottoirs sont de nouveau visibles.
- Poursuite reculée à **7,0 m** et montée à **3,0 m**, regard à **1,0 m** : la
  voiture reprend la taille qu'elle a sur un écran large, au lieu d'occuper la
  moitié de l'écran.
- Une pastille **☰ ACTIONS** à la place des sept boutons empilés, qui prenaient
  un tiers de la largeur. Un tap ouvre le tiroir en deux colonnes, un tap sur la
  ville le referme.
- La minicarte reste à droite, le compteur au-dessus des pouces, le joystick
  remonté : les réglages portrait existants ne bougent pas.

**Paysage (844 × 390)**

- Cadrage **strictement identique** : 66°, 5,0 m, 2,7 m, 1,1 m.
- La colonne de sept actions ne déborde plus de la fenêtre : elle reste à six
  boutons visibles dans la colonne de 112 px, le plein écran n'y est plus.

**Ordinateur (1000 × 700 et au-delà)**

- Colonne historique de 112 px, mêmes coordonnées, mêmes écarts de 44 px.
- Aucun tiroir, aucune pastille.

---

## Ce que fait le code

### `src/games/viceCityMobileCamera.js` (nouveau, sans dépendance)

```js
export const CITY_RUSH_CAMERA_MAX_FOV = 88;         // plafond du champ vertical
export const CITY_RUSH_CHASE_PORTRAIT = { distance: 7.0, height: 3.0, lookHeight: 1.0 };
export const CITY_RUSH_CHASE_LANDSCAPE = { distance: 5.0, height: 2.7, lookHeight: 1.1 };
```

- `isViceCityPortraitViewport(width, height)` : téléphone **debout**, c'est-à-dire
  plus haut que large *et* 600 px de large au plus. Une fenêtre verticale de
  bureau (800 × 1000) n'est pas concernée.
- `viceCityCameraFov()` : en portrait, le champ vertical qui redonne le champ
  **horizontal** d'un 16/9 (98,2°), plafonné à 88° ; en paysage, 66°.
- `viceCityChaseFraming()` / `viceCityCameraFraming()` : le placement de la
  poursuite et le champ, en une lecture.
- `applyViceCityCameraFraming(camera, framing)` : écrit le champ, refuse un `NaN`.
  Le module n'importe pas `three` : il se teste sans navigateur.

### `src/games/ViceCityFreeRoam.jsx`

- La caméra naît à 66° et lit le cadrage de l'écran dès le premier placement
  (`placeChaseCamera`).
- **`resize`** recalcule `chaseFraming` et l'applique — c'est ce qui fait suivre
  une rotation **sans remonter la scène**. Les dépendances de l'effet 3D restent
  `[carId, schoolMode, schoolExercise, liteDevice, graphicsEpoch]`.
- La poursuite lit `chaseFraming.distance`, `.height` et `.lookHeight` au lieu de
  `-5.0`, `2.7` et `1.1` recopiés ; la sortie du cockpit retrouve `chaseFraming.fov`
  au lieu de `66` en dur.
- Les sept actions sont dans **un seul conteneur** (`#vice-free-roam-actions`).
  Sur ordinateur il est en `display:contents` ; sur téléphone il devient le
  tiroir. Une seule pastille `☰ ACTIONS`, `aria-expanded`, et un tap sur la ville
  ou Échap le referme.
- `graphicsModeRef.current = runningGraphics` à chaque rendu : le clic sur RENDU
  part de ce qui est **affiché**.

### `src/games/vice-city-free-roam.css`

- `.vice-free-roam-actions{display:contents}` : la colonne de bureau est
  préservée au pixel (mêmes `--free-action-row`, même 112 × 38).
- Bloc « Tiroir d'actions, sur téléphone » : deux colonnes, `visibility:hidden`
  au repos, pastille 108 × 38, école exclue
  (`.driving-school-world .vice-free-roam-actions-toggle{display:none!important}`).
- Le plein écran n'est visible que dans le tiroir ; partout ailleurs il reste
  masqué, sans rang dans la colonne.

---

## Vérifications

| Contrôle | Résultat |
|---|---|
| `node --test tests/vice-city-mobile-camera.test.js` | **12/12** |
| `node --test` — les 10 fichiers qui touchent Vice City | **141/141** |
| `node --test` — tous les `city-rush-*` et `vice-city-*` | **311/311** |
| `node scripts/driving-free-mode-check.mjs` — PC, portrait, paysage | **PASS** |
| `npx vite build` | **OK** |
| `node scripts/phone-css-check.mjs` | **79**, identique à `main` (aucune dette) |
| Champ / recul mesurés dans le DOM | portrait `88.00` / `7.00`, paysage et bureau `66.00` / `5.00` |

Captures dans `shots/` : `portrait-avant-ouverture.png`,
`portrait-tiroir-ouvert.png`, `paysage-844x390.png`, `bureau-1000x700.png`.

### Comment revoir à la main

```bash
npm run dev
# http://localhost:5173/Let-s-Play/jeu/vice-city-rush → Conduite libre
```

Dans la console, l'état appliqué se lit sans deviner :

```js
document.querySelector('.vice-free-roam-world').dataset
// { chaseFov: "88.00", chaseDistance: "7.00", chaseFraming: "portrait", … }
```

---

## À valider à l'œil — trois constantes

| Constante | Valeur | Effet |
|---|---|---|
| `CITY_RUSH_CAMERA_MAX_FOV` | **88** | plafond du champ vertical en portrait ; 84–90 reste vivable, au-delà l'image s'étire |
| `CITY_RUSH_CHASE_PORTRAIT.distance` | **7.0** | recul de la poursuite ; plus grand = voiture plus petite |
| `CITY_RUSH_CHASE_PORTRAIT.lookHeight` | **1.0** | hauteur du point regardé ; plus bas = plus de route visible |

---

## Publication

- `deploy-vercel-preview.sh` : construit le site et envoie `dist/` en **preview**
  Vercel (`--prebuilt`, jamais de promotion en production). Il rend l'URL à la
  fin, à ouvrir sur `/jeu/vice-city-rush` en portrait puis en paysage.
- La PR est ouverte depuis la branche ; `vice-city-rush-mobile.md` sert de note
  technique de référence.

## Hors périmètre

En qualité **MINIMAL**, la ville s'affiche très sombre (ciel bleu nuit, fenêtres
dorées) alors qu'elle est censée être de plein jour. L'éclairage en qualité basse
mérite une enquête séparée.
