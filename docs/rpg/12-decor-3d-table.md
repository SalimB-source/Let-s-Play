# 12 — Le décor 3D de la table

La table du duel reste une **peinture plein cadre sous des cartes en DOM**
(voir `04-progression-da.md`). Le décor 3D ne la remplace pas : un canvas
Three.js se glisse **entre la peinture CSS et les cartes** et lui donne du
relief, de la lumière et du mouvement. Rien de ce qui se joue n'y est dessiné :
glisser-déposer, tactile, flèches de blocage, compteurs et tests existants ne
changent pas.

## Ce que fait la 3D

- **Relief** : un plan portant la peinture du plateau, avec une carte de relief
  tirée de sa luminance (joints de dalles, dunes, fissures, veines de braise) ;
  le bord de la table se relève vers la caméra, le centre reste plat.
- **Lumière vivante** : bougies qui vacillent (Table des Heures), soleil rasant
  qui dérive (Erg, Gourara, Tipaza), aurore (Îles Célestes), braises qui
  respirent (Cavernes de Cristal), lumières qui glissent (Désert de Verre,
  Abysses).
- **Surface** : ombres de nuages qui défilent, ou caustiques sous la mer.
- **Particules** à plusieurs hauteurs : poussière, sable soufflé, neige, bulles,
  braises, éclats de verre.
- **Parallaxe** : la caméra respire et suit la souris (jamais le doigt).

Les neuf plateaux ont leur ambiance (`rpgTableSceneThemes.js`). Un identifiant
inconnu retombe sur celle de la Table des Heures.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/games/rpgTableSceneThemes.js` | Données pures : ambiances, budgets, particules (testable sous Node) |
| `src/games/rpgTableScene.js` | La scène Three.js (chargée à la demande) |
| `src/games/RpgTableScene3D.jsx` | La vue React, premier enfant de `.card-table` |
| `tests/rpg-table-3d.test.js` | Catalogue, bornes, particules, budget, cadrage, géométrie, bruits |
| `scripts/rpg-table-3d-check.mjs` | Vrai rendu WebGL (Chromium) |

## Garde-fous

- **Repli** : la peinture CSS reste le fond. Sans WebGL2, sans peinture, ou si le
  contexte est perdu, c'est elle qu'on voit, comme avant.
- **Sous le chrome** : `z-index: -1` dans l'isolat de `.card-table`,
  `pointer-events: none`, `aria-hidden`.
- **Budget** : 900 000 pixels (520 000 au doigt), 36 images/s (30 au doigt),
  moins de particules sur écran tactile, textures bornées à 2048 px (1536).
- **Pause** : onglet caché, glisser ou vol de carte. `prefers-reduced-motion`
  garde une vraie vue 3D mais fixe, sans boucle.
- **Dégradation** : sous 18 images/s en moyenne, le décor perd des pixels, puis
  ses particules, puis rend la main à la peinture CSS.
- **Réglage** : bouton « 3D » dans la barre du duel, mémorisé
  (`letsplay_sablier_decor3d_v1`), actif par défaut.
- **Rien d'externe** : bruits et sprites sont générés localement, la peinture
  est celle déjà chargée par le fond CSS.

## Vérifications

- `npm run check:rpg-table-3d` : catalogue, bornes, particules, budgets.
- `npm run check:rpg-table-3d-ui` (serveur Vite + Chromium) : rendu réel, couches,
  pause pendant un glisser, bouton, repli sans WebGL2, `reduced-motion`,
  téléphone en paysage.

## Limites connues

- La peinture est un peu plus cadrée qu'en CSS (≈ 3,5 % de marge pour la
  parallaxe) : les objets de bord peuvent être légèrement rognés.
- Sur 568 px de large, la barre du duel déborde déjà sur la plaque du sorcier ;
  le bouton 3D y est réduit au minimum.
- Pistes : décor 3D pour le mode Histoire, objets 3D posés sur la table.
