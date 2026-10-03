import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Le ciel partagé vit dans `MirageWorld.jsx`, un composant React qu'on ne peut pas
 * monter sans DOM ni WebGL : ce fichier vérifie donc le **câblage** dans la source
 * (comme le fait `tests/mirage-link-powers.test.js` pour la bombe de Link) — que
 * chaque terrain déclare sa force de faisceaux, qu'elle se lit dans l'ambiance, et
 * qu'elle se rebascule en direct avec les graphismes. Ce que la lumière rend
 * vraiment se juge à l'œil, en jeu.
 */
const world = readFileSync(new URL('../src/games/MirageWorld.jsx', import.meta.url), 'utf8');

/** Les ambiances en clair de `makeWorld` : prairie, western, sardinia, alger, japan, ramparts, airbase. */
const inlineAtmospheres = [...world.matchAll(/rays: ([0-9.]+),/g)].map((match) => Number(match[1]));

test('faisceaux : chaque terrain en clair annonce sa force, entre 0 et 1', () => {
  assert.equal(inlineAtmospheres.length, 7, 'les sept ambiances écrites dans MirageWorld.jsx');
  for (const value of inlineAtmospheres) {
    assert.ok(value > 0 && value <= 1, `${value} hors de [0, 1] : une force multiplie l’effet, elle ne l’inverse pas`);
  }
  // Les couchers de soleil en portent le plus, la nuit du Japon le moins.
  assert.equal(inlineAtmospheres[0], 1, 'prairie : plein couchant');
  assert.equal(inlineAtmospheres[1], 1, 'western : plein couchant');
  assert.ok(Math.min(...inlineAtmospheres) === 0.25, 'le Japon est le plus discret (lune froide)');
});

test('faisceaux : la force se lit dans l’ambiance, jamais en dur dans le shader', () => {
  assert.match(world, /uniform float uRays;/, 'le ciel partagé reçoit uRays en shader');
  assert.match(world, /sunset\.material\.uniforms\.uRays/, 'et c’est par là que `applySkyRays` le règle');
  assert.match(world, /uRays: \{ value: 0 \}/, 'et démarre éteint, avant l’application du profil');
  assert.match(world, /if \(uRays > 0\.001\)/, 'les faisceaux se sautent quand la force est nulle');
  assert.match(world, /graphics\.sceneryEffects \? \(atmosphere\.rays \?\? 0\) : 0/, 'la force du terrain, coupée en graphismes baissés');
  // Le ciel du Château et celui du désert ont les leurs : ils ne reçoivent pas ce réglage-ci.
  assert.match(world, /makeInfinitySky\(camera, atmosphere\.rays \?\? 0\)/);
});

test('faisceaux : la bascule en pleine course les éteint et les rallume', () => {
  assert.match(world, /const applySkyRays = \(\) => \{/);
  assert.match(world, /applySkyRays\(\);\n/, 'appliquée à la création du monde');
  const setGraphics = world.slice(world.indexOf('setGraphics(quality)'));
  assert.match(setGraphics.slice(0, 400), /applySkyRays\(\)/, 'et à chaque changement de graphismes, sans reconstruire le ciel');
  // Le ciel partagé a une horloge (les faisceaux battent) ; celui du Château n'en a pas.
  assert.match(world, /if \(!infinity\) sunset\.material\.uniforms\.uTime\.value = time \* 0\.001;/);
});

test('faisceaux : ils s’effacent sous l’horizon et la brume garde sa couleur', () => {
  const shader = world.slice(world.indexOf('Faisceaux du soleil et traînée'), world.indexOf('float halo = exp(-radius'));
  assert.match(shader, /smoothstep\(0\.0, 6\.0, height\) \* haloVisibility/, 'rien sous la ligne d’horizon');
  assert.match(shader, /haloVisibility/, 'et rien quand le soleil est couché (nuits de la Prairie et du Far West)');
  assert.match(shader, /mix\(sky, glow/, 'les faisceaux éclaircissent vers la lueur du terrain, sans toucher à sa palette');
});

test('ambiances hors MirageWorld : le Serpent porte sa force, le Château la sienne', () => {
  const snakeway = readFileSync(new URL('../src/games/snakewayStage.js', import.meta.url), 'utf8');
  assert.match(snakeway, /rays: 0\.35/, 'la mer de cumulus dorés se suffit presque à elle-même');
  const infinity = readFileSync(new URL('../src/games/infinityAtmosphere.js', import.meta.url), 'utf8');
  assert.match(infinity, /rays: 0\.6/);
  assert.match(infinity, /uRays: \{ value: rays \}/, 'posée à la création : le ciel du Château ne se met jamais à jour');
});
