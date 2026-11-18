# Vice City Rush — améliorations visuelles mobile

Ce qui change pour un joueur qui ouvre `/jeu/vice-city-rush` puis **Conduite
libre** sur un téléphone, et ce qui ne change pas pour celui qui joue sur un
ordinateur.

---

## 1. Le cadrage portrait — `src/games/viceCityMobileCamera.js`

### Le problème, chiffré

La poursuite a été réglée sur un écran large : **66° de champ vertical**, 5,0 m
derrière la voiture, 2,7 m au-dessus, regard à 1,1 m du sol. En 16/9, ce champ
vertical donne 98° en horizontal — large, et c'est voulu.

Sur un téléphone debout (390 × 844), le même 66° vertical ne donne plus que
**41° en horizontal**. Ce n'est plus une rue, c'est une fente : le joueur ne voit
ni le trottoir d'en face, ni la voiture qu'il croise, et la voiture occupe la
moitié de la hauteur.

### Ce que fait le module

Deux réglages, appliqués ensemble :

1. **Le champ s'élargit** jusqu'à retrouver le champ *horizontal* d'un 16/9
   (98,2°), avec un **plafond à 88°** : au-delà, la projection s'étire et la
   ville se déforme sur les bords. Sur tous les téléphones usuels (375 à 430 px
   de large), le plafond est atteint.
2. **La poursuite recule et monte** : 5,0 m → **7,0 m** de recul, 2,7 m → **3,0 m**
   de hauteur, et le regard descend de 1,1 m à **1,0 m**. La voiture reprend la
   taille qu'elle a sur un écran large : le rapport de taille apparente tombe à
   0,87×, contre 2,4× si on ne touchait qu'au champ.

Les trois constantes à valider à l'œil :

```js
export const CITY_RUSH_CAMERA_MAX_FOV = 88;              // plafond du champ vertical
export const CITY_RUSH_CHASE_PORTRAIT = { distance: 7.0, height: 3.0, lookHeight: 1.0 };
```

### Ce qui ne bouge pas

**Le paysage est strictement identique.** Le module ne s'applique que si le
canevas est plus haut que large **et** large de 600 px au plus — c'est-à-dire un
téléphone debout. Un ordinateur dans une fenêtre verticale de 800 × 1000 n'est
pas concerné. En paysage, `viceCityCameraFraming()` rend **exactement** 66° /
5,0 m / 2,7 m / 1,1 m : le jeu au clavier ne bouge pas d'un pixel, et
`tests/vice-city-mobile-camera.test.js` le vérifie au centième sur cinq formats.

### La rotation ne coupe pas la partie

Le cadrage se recalcule **dans `resize`**, à chaque changement de taille du
canevas. Tourner le téléphone ne remonte pas l'effet 3D : les dépendances du
montage restent `[carId, schoolMode, schoolExercise, liteDevice, graphicsEpoch]`,
et le test existant qui les fige continue de passer. Le premier placement de la
caméra lit lui aussi le cadrage, pour que la ville ne s'ouvre pas sur un cadrage
paysage corrigé à la deuxième image.

Ce qui est appliqué est lisible dans le DOM, pour les vérifications :

```js
mount.dataset.chaseFov      // "88.00" en portrait, "66.00" en paysage
mount.dataset.chaseDistance // "7.00" en portrait, "5.00" en paysage
mount.dataset.chaseFraming  // "portrait" | "landscape"
```

---

## 2. Les actions dans un tiroir ☰ — fini les sept boutons empilés

### Le problème

Sept boutons de 112 px empilés à droite. En portrait, cette colonne occupe **un
tiers de la largeur** de l'écran. En paysage sur un téléphone de 390 px de haut,
elle dépasse la fenêtre : MENU et PLEIN ÉCRAN sont hors champ.

### Ce qui a changé

- Sur téléphone, une seule pastille **☰ ACTIONS** remplace la colonne. Un tap
  ouvre un tiroir **à deux colonnes** sous la pastille ; un tap sur la ville, ou
  Échap, le referme. La pastille passe au rose quand le tiroir est ouvert.
- **Les sept actions sont les mêmes boutons**, dans un seul conteneur monté une
  fois : il n'y a pas de second jeu de boutons à maintenir, et aucun état
  (`aria-pressed`, `data-graphics-mode`, libellé de qualité) ne peut diverger
  entre les deux mises en page.
- Sur ordinateur, le conteneur est en `display:contents` : il s'efface de la
  mise en page et les boutons reprennent **la colonne historique de 112 px, aux
  mêmes coordonnées**. C'est vérifié au pixel par
  `scripts/driving-free-mode-check.mjs`.
- L'école de conduite (`driving-school-world`) a son propre bandeau en grille :
  ni pastille ni tiroir chez elle, sauf le bouton plein écran qui y avait déjà
  sa place.

Le plein écran, lui, n'existe plus que dans le tiroir : sur téléphone il est
visible et cliquable ; ailleurs il reste masqué, comme avant — sans quoi il
tomberait sur la colonne de 112 px, en huitième position sans rang assigné.

---

## 3. Correctif — le premier clic sur RENDU part de ce qui est affiché

`graphicsModeRef` n'était écrite **qu'au clic**. Après un essai WebGPU refusé
(pas de carte, pilote qui renonce), le bouton affichait « STANDARD · REPLI »
mais la référence restait sur `webgpu` : le clic suivant **redemandait l'essai
refusé** au lieu de passer à CINÉMA. La référence est désormais resynchronisée à
chaque rendu sur le mode affiché ; deux clics rapprochés avancent toujours de
deux crans, puisque le clic écrit la référence avant que React ne rende.

`tests/vice-city-mobile-camera.test.js` vérifie l'ordre : le calcul du mode
affiché précède la resynchronisation, qui précède le cycle.

---

## Vérifications

| Contrôle | Résultat |
|---|---|
| `node --test tests/vice-city-mobile-camera.test.js` | **12/12** |
| `node --test` (les 10 fichiers qui touchent Vice City) | **141/141** |
| `node --test` (tous les `city-rush-*` et `vice-city-*`) | **311/311** |
| `node scripts/driving-free-mode-check.mjs` (PC 1000×700, portrait 390×844, paysage 844×390) | **PASS** |
| `npx vite build` | **OK** |
| `node scripts/phone-css-check.mjs` | **79** requêtes signalées, exactement le compte d'avant (aucune dette ajoutée) |

Captures dans `shots/` : portrait fermé, portrait tiroir ouvert, paysage
844 × 390, bureau 1000 × 700.

---

## Fichiers touchés

```
src/games/viceCityMobileCamera.js      (nouveau)  le cadrage, testable sans three
src/games/ViceCityFreeRoam.jsx                    poursuite + tiroir + graphicsModeRef
src/games/vice-city-free-roam.css                 tiroir, pastille, colonne préservée
tests/vice-city-mobile-camera.test.js  (nouveau)  12 contrôles
tests/city-rush-free-drive.test.js                la poursuite lit le cadrage
scripts/driving-free-mode-check.mjs               tiroir sur téléphone, colonne sur PC
deploy-vercel-preview.sh               (nouveau)  preview Vercel sans passer par GitHub
shots/                                            captures avant/après
```

---

## Hors périmètre, noté au passage

En qualité **MINIMAL**, la ville émulée s'affiche très sombre (ciel bleu nuit,
fenêtres dorées) alors qu'elle est censée être de plein jour. L'éclairage en
qualité basse mérite une enquête séparée.
