/**
 * Le cadrage de Vice City, tenu par des nombres.
 *
 * Deux promesses se vérifient ici, et nulle part ailleurs :
 *
 *   1. **Le paysage ne bouge pas.** Un écran 16/9 — celui de l'ordinateur,
 *      celui du téléphone couché — doit garder le cadrage historique au
 *      centième : 66° de champ, 5,0 m de recul, 2,7 m de hauteur, regard à
 *      1,1 m. C'est la promesse faite au jeu au clavier : pas un pixel.
 *   2. **Le portrait respire.** Un téléphone debout reçoit un champ élargi
 *      qui retrouve le champ horizontal d'un 16/9, plafonné à 88°, et une
 *      poursuite qui recule et monte pour que la voiture garde sa taille.
 *
 * Le troisième contrôle est structurel : le cadrage se règle dans `resize`,
 * jamais au montage. Sinon, tourner le téléphone reconstruirait la ville — ce
 * que la promesse « la rotation ne coupe pas la partie » interdit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

import {
  CITY_RUSH_CAMERA_BASE_FOV,
  CITY_RUSH_CAMERA_MAX_FOV,
  CITY_RUSH_CAMERA_TARGET_HORIZONTAL_FOV,
  CITY_RUSH_CHASE_LANDSCAPE,
  CITY_RUSH_CHASE_PORTRAIT,
  CITY_RUSH_PORTRAIT_MAX_WIDTH,
  applyViceCityCameraFraming,
  isViceCityPortraitViewport,
  viceCityCameraFov,
  viceCityCameraFraming,
  viceCityChaseFraming,
} from '../src/games/viceCityMobileCamera.js';

const deg = (radians) => (radians * 180) / Math.PI;
const rad = (degrees) => (degrees * Math.PI) / 180;
/** Champ horizontal d'un champ vertical donné, pour un rapport largeur/hauteur. */
const horizontalFov = (vertical, width, height) => deg(2 * Math.atan(Math.tan(rad(vertical) / 2) * (width / height)));

// ── Le paysage, inchangé ───────────────────────────────────────────────────
test('en paysage, le cadrage historique est rendu au centième', () => {
  for (const [width, height] of [[1000, 700], [1600, 900], [844, 390], [1280, 720], [1920, 1080]]) {
    const framing = viceCityCameraFraming(width, height);
    assert.equal(framing.fov, 66, `${width}×${height} : champ de 66°`);
    assert.equal(framing.distance, 5.0, `${width}×${height} : 5,0 m de recul`);
    assert.equal(framing.height, 2.7, `${width}×${height} : 2,7 m de hauteur`);
    assert.equal(framing.lookHeight, 1.1, `${width}×${height} : regard à 1,1 m`);
  }
});

test('le module est sans effet dès qu’on quitte le téléphone debout', () => {
  // Un ordinateur dans une fenêtre verticale n'est pas un téléphone : 800 px de
  // large, c'est déjà une tablette, et le cadrage mobile n'a rien à y faire.
  assert.equal(isViceCityPortraitViewport(800, 1000), false);
  assert.equal(viceCityCameraFov(800, 1000), 66);
  // Un carré n'est pas un portrait.
  assert.equal(isViceCityPortraitViewport(600, 600), false);
  // La borne est inclusive côté téléphone, exclusive au-delà.
  assert.equal(isViceCityPortraitViewport(CITY_RUSH_PORTRAIT_MAX_WIDTH, 1000), true);
  assert.equal(isViceCityPortraitViewport(CITY_RUSH_PORTRAIT_MAX_WIDTH + 1, 1000), false);
  // Une taille absurde (canevas à zéro pendant un démontage) ne casse rien.
  for (const [w, h] of [[0, 0], [NaN, 800], [390, Infinity], [-1, 800]]) {
    assert.equal(isViceCityPortraitViewport(w, h), false);
    assert.equal(viceCityCameraFov(w, h), CITY_RUSH_CAMERA_BASE_FOV);
  }
});

// ── Le portrait, élargi ────────────────────────────────────────────────────
test('en portrait, le champ horizontal rejoint celui d’un 16/9 et plafonne à 88°', () => {
  // La cible : ce que voit un écran 16/9 en 66° vertical.
  assert.ok(Math.abs(CITY_RUSH_CAMERA_TARGET_HORIZONTAL_FOV - horizontalFov(66, 16, 9)) < 1e-9);
  assert.ok(CITY_RUSH_CAMERA_TARGET_HORIZONTAL_FOV > 98, 'un 16/9 en 66° vertical voit plus de 98° en large');
  for (const [width, height] of [[390, 844], [375, 812], [430, 932], [600, 1000], [360, 780]]) {
    const fov = viceCityCameraFov(width, height);
    assert.ok(fov <= CITY_RUSH_CAMERA_MAX_FOV, `${width}×${height} : jamais au-delà du plafond`);
    assert.ok(fov >= CITY_RUSH_CAMERA_MAX_FOV - 1e-9, `${width}×${height} : le plafond est atteint`);
    // Ce que le joueur voit en large : plus qu'en paysage, sans l'étirement
    // d'un champ vertical démesuré.
    const seen = horizontalFov(fov, width, height);
    assert.ok(seen > 40, `${width}×${height} : le champ horizontal ne reste pas une fente (${seen.toFixed(1)}°)`);
    assert.ok(seen < CITY_RUSH_CAMERA_TARGET_HORIZONTAL_FOV + 1, `${width}×${height} : il ne dépasse pas la cible`);
  }
  // Un écran très étroit atteint le plafond : c'est lui qui protège l'image,
  // pas une constante recopiée dans le composant.
  assert.equal(viceCityCameraFov(320, 1000), CITY_RUSH_CAMERA_MAX_FOV);
});

test('la poursuite portrait recule, monte et regarde plus haut', () => {
  const portrait = viceCityChaseFraming(390, 844);
  assert.equal(portrait, CITY_RUSH_CHASE_PORTRAIT);
  assert.equal(portrait.distance, 7.0, 'la voiture reprend sa taille d’écran large');
  assert.equal(portrait.height, 3.0, 'la caméra monte avec le recul');
  assert.equal(portrait.lookHeight, 1.0, 'le regard descend sur la route');
  assert.ok(portrait.distance > CITY_RUSH_CHASE_LANDSCAPE.distance);
  assert.ok(portrait.height > CITY_RUSH_CHASE_LANDSCAPE.height);
  assert.ok(portrait.lookHeight < CITY_RUSH_CHASE_LANDSCAPE.lookHeight);
  // Les trois constantes que l'auteur du jeu doit valider à l'œil.
  assert.equal(CITY_RUSH_CAMERA_MAX_FOV, 88);
  assert.equal(CITY_RUSH_CHASE_PORTRAIT.distance, 7.0);
  assert.equal(CITY_RUSH_CHASE_PORTRAIT.lookHeight, 1.0);
});

test('la voiture garde une taille comparable dans les deux sens', () => {
  // La hauteur apparente d'un objet à `distance` mètres, pour un champ vertical
  // donné, se lit en fraction de l'image : tan(fov / 2) / distance. C'est ce
  // rapport qu'on égalise, sinon la voiture paraît deux fois plus grosse.
  const size = (fov, distance) => Math.tan(rad(fov) / 2) / distance;
  const landscape = viceCityCameraFraming(1600, 900);
  const portrait = viceCityCameraFraming(390, 844);
  const ratio = size(portrait.fov, portrait.distance) / size(landscape.fov, landscape.distance);
  assert.ok(ratio > 0.75 && ratio < 1.1, `la voiture occupe une place comparable (${ratio.toFixed(2)}×)`);
});

// ── Application à la caméra ────────────────────────────────────────────────
test('appliquer un cadrage n’écrit jamais un champ invalide', () => {
  const camera = { fov: 66 };
  assert.equal(applyViceCityCameraFraming(camera, { fov: 88 }), true);
  assert.equal(camera.fov, 88);
  applyViceCityCameraFraming(camera, { fov: NaN });
  assert.equal(camera.fov, 88, 'un NaN laisse le champ en place');
  applyViceCityCameraFraming(camera, null);
  assert.equal(camera.fov, 88);
  assert.equal(applyViceCityCameraFraming(null, { fov: 70 }), false);
});

// ── Le câblage, dans le composant ──────────────────────────────────────────
test('le cadrage se règle dans resize, jamais dans les dépendances du montage 3D', async () => {
  const source = await readFile(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  // `resize` recalcule le cadrage et l'applique : c'est ce qui fait suivre une
  // rotation de téléphone sans reconstruire la ville.
  const resize = source.match(/const resize = \(\) => \{[\s\S]*?\n    \};/);
  assert.ok(resize, 'la fonction resize est connue');
  assert.match(resize[0], /viceCityCameraFraming\(width, height\)/);
  assert.match(resize[0], /applyViceCityCameraFraming\(camera, chaseFraming\)/);
  assert.match(resize[0], /camera\.aspect = width \/ height/);
  // Le montage 3D garde ses dépendances historiques : aucune taille d'écran.
  assert.match(source, /\}, \[carId, schoolMode, schoolExercise, liteDevice, graphicsEpoch\]\);/);
  assert.doesNotMatch(source, /\}, \[[^\]]*chaseFraming[^\]]*\]\);/);
  assert.doesNotMatch(source, /\}, \[[^\]]*innerWidth[^\]]*\]\);/);
  assert.doesNotMatch(source, /\}, \[[^\]]*innerHeight[^\]]*\]\);/);
});

test('la poursuite lit le cadrage de l’écran, plus une constante recopiée', async () => {
  const source = await readFile(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  // Le recul, la hauteur et le point regardé viennent de `chaseFraming`.
  assert.match(source, /addScaledVector\(forward, -chaseFraming\.distance\)/);
  assert.match(source, /cameraPosition\.y \+= chaseFraming\.height/);
  assert.match(source, /\+ chaseFraming\.lookHeight/);
  // Les anciennes constantes en dur ne traînent plus dans la poursuite.
  assert.doesNotMatch(source, /addScaledVector\(forward, -5\.0\)/);
  assert.doesNotMatch(source, /cameraPosition\.y \+= 2\.7/);
  // La sortie du cockpit retrouve le champ courant, pas 66 en dur.
  assert.match(source, /camera\.fov = cockpitActive \? CITY_RUSH_COCKPIT_FOV : chaseFraming\.fov/);
  // Et le premier placement suit déjà le cadrage : pas de première image en
  // cadrage paysage sur un téléphone debout.
  assert.match(source, /const placeChaseCamera = \(\) => \{/);
});

test('le cadrage appliqué est lisible dans le DOM, pour les vérifications', async () => {
  const source = await readFile(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /mount\.dataset\.chaseFov = camera\.fov\.toFixed\(2\)/);
  assert.match(source, /mount\.dataset\.chaseDistance = chaseFraming\.distance\.toFixed\(2\)/);
  assert.match(source, /mount\.dataset\.chaseFraming = isViceCityPortraitViewport\(width, height\) \? 'portrait' : 'landscape'/);
});

// ── Le tiroir d'actions ────────────────────────────────────────────────────
test('le tiroir ☰ ACTIONS ne remplace pas la colonne de bureau, il la replie', async () => {
  const source = await readFile(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/games/vice-city-free-roam.css', import.meta.url), 'utf8');
  // Les sept actions vivent dans **un** conteneur, monté une seule fois.
  assert.match(source, /<div id="vice-free-roam-actions"[\s\S]*?className="vice-free-roam-actions-toggle"/);
  assert.equal((source.match(/vice-free-roam-action vice-free-roam-activities/g) || []).length, 1,
    'un seul jeu de boutons : pas de doublon desktop/mobile à maintenir');
  assert.match(source, /aria-expanded=\{actionsOpen\}/);
  assert.match(source, /data-actions-open=\{actionsOpen \? 'true' : 'false'\}/);
  // Un tap sur la ville referme le tiroir.
  assert.match(source, /if \(actionsOpenRef\.current\) setActionsOpen\(false\);/);
  // Sur ordinateur, le conteneur s'efface de la mise en page : les boutons
  // reprennent la colonne historique, au même endroit.
  assert.match(css, /\.vice-free-roam-actions\{display:contents\}/);
  assert.match(css, /\.vice-free-roam:not\(\.driving-school-world\) \.vice-free-roam-actions>button:nth-of-type\(1\)\{--free-action-row:0\}/);
  assert.match(css, /box-sizing:border-box;width:112px;height:38px/);
  // Et la pastille n'y apparaît pas.
  assert.match(css, /\.vice-free-roam:not\(\.driving-school-world\) \.vice-free-roam-header>\.vice-free-roam-actions-toggle\{display:none\}/);
});

test('le tiroir a une mise en page téléphone, avec la condition du site', async () => {
  const css = await readFile(new URL('../src/games/vice-city-free-roam.css', import.meta.url), 'utf8');
  const drawer = css.slice(css.indexOf('/* ── Tiroir d'));
  assert.ok(drawer.length > 0, 'le bloc tiroir existe');
  assert.match(drawer, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'deux colonnes');
  // Fermé, il n'est ni cliquable ni lu : c'est le comportement d'un panneau.
  assert.match(drawer, /\.vice-free-roam:not\(\.driving-school-world\) \.vice-free-roam-actions\{[\s\S]*?visibility:hidden/);
  assert.match(drawer, /\.vice-free-roam-actions\.is-open\{visibility:visible/);
  // La pastille tient dans le pouce, pas dans la fenêtre du voisin.
  assert.match(drawer, /width:108px;height:38px/);
  // L'école garde son bandeau à elle : aucune pastille dans le monde école.
  assert.match(drawer, /\.driving-school-world \.vice-free-roam-actions-toggle\{display:none!important\}/);
  // Les requêtes média « petit écran » de ce bloc portent la condition
  // téléphone du site, vérifiée globalement par `npm run check:phone-css`.
  for (const query of drawer.matchAll(/@media([^{]*)\{/g)) {
    if (!/max-width:\s*\d+px/.test(query[1])) continue;
    assert.match(query[1], /max-device-width\s*:\s*600px|max-width:\s*650px/, `« ${query[1].trim()} » doit couvrir le téléphone`);
  }
});

test('le premier clic sur RENDU part de ce qui est affiché', () => {
  // Le défaut d'origine : la référence n'était écrite qu'au clic. Après un
  // essai WebGPU refusé, le bouton affichait STANDARD · REPLI mais la
  // référence restait sur `webgpu` — le clic suivant redemandait l'essai.
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  const resync = source.indexOf('graphicsModeRef.current = runningGraphics;');
  const running = source.indexOf('const runningGraphics = graphicsLive?.reason');
  assert.ok(resync > 0, 'la référence est resynchronisée à chaque rendu');
  // Elle l'est **après** le calcul de ce qui tourne (elle en dépend) et donc à
  // chaque rendu : le clic, lui, arrive toujours après le rendu qui l'affiche.
  assert.ok(resync > running, 'la resynchronisation suit le calcul du mode affiché');
  // Le cycle lit bien cette référence, et l'écrit quand il avance d'un cran.
  const cycle = source.slice(source.indexOf('const cycleGraphics = () => {'));
  assert.match(cycle.slice(0, 900), /const current = graphicsModeRef\.current;/, 'le cycle part de la référence');
  assert.match(cycle.slice(0, 900), /graphicsModeRef\.current = next;/, 'et l’avance d’un cran');
});
