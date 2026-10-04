/**
 * Le moteur 3D de Mirage Rush ne se vérifie pas en jsdom (pas de WebGL : les
 * autres vérifications remplacent `MirageWorld` par une doublure). Ces tests
 * couvrent donc ce que personne ne voyait : un identifiant utilisé sans être
 * déclaré dans `src/games/MirageWorld.jsx`.
 *
 * L'incident : le commit « Fix Snake Way stutter » appelait
 * `syncSnakewayClouds()` dans `updateVisualRoute()` — appelée à chaque image et
 * à chaque `reset()`, sur **tous** les terrains — sans jamais la déclarer. Le
 * `ReferenceError` (module ES = mode strict) faisait échouer `makeWorld()`, donc
 * plus aucune partie ne se lançait, sur n'importe quelle map, et la page
 * restait sur une piste noire. Le même commit laissait une faute de frappe,
 * `powerStwerUp(...)`, dans le chemin du Turbo.
 *
 * `scripts/mirage-engine-scan.mjs` fait l'analyse ; ici on vérifie que le
 * fichier est sain, et que l'analyse attrape bien ces deux bugs-là.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describeFindings, scanEngineSource } from '../scripts/mirage-engine-scan.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const engine = read('../src/games/MirageWorld.jsx');
const page = read('../src/games/MirageRushPage.jsx');
const pageCss = read('../src/games/mirage-rush.css');

test('le moteur 3D n’utilise aucun identifiant sans le déclarer', () => {
  const findings = describeFindings(scanEngineSource(engine));
  assert.deepEqual(
    findings,
    [],
    `un identifiant inconnu dans le moteur fait échouer makeWorld() et la partie ne démarre plus :\n- ${findings.join('\n- ')}`,
  );
});

test('l’analyse attrape un identifiant affecté sans déclaration (la panne du Chemin du Serpent)', () => {
  const broken = [
    'function makeWorld() {',
    '  let cloudSea = { sync: () => {} };',
    '  syncSnakewayClouds = cloudSea.sync;', // `let syncSnakewayClouds` manquant
    '}',
  ].join('\n');
  const findings = scanEngineSource(broken);
  assert.deepEqual(findings.undeclaredAssignments.map((finding) => finding.name), ['syncSnakewayClouds']);
  assert.equal(findings.undeclaredAssignments[0].line, 3);
});

test('l’analyse attrape un appel à un identifiant jamais déclaré (la faute de frappe du Turbo)', () => {
  const broken = [
    'function useBoost(consumePowerUp) {',
    '  const res = consumePowerUp();',
    '  powerStwerUp(res.state);',
    '}',
  ].join('\n');
  const findings = scanEngineSource(broken);
  assert.deepEqual(findings.undeclaredCalls.map((finding) => finding.name), ['powerStwerUp']);
  assert.equal(findings.undeclaredCalls[0].line, 3);
});

test('l’analyse ne prend pas shaders, divisions et expressions régulières pour du code', () => {
  const healthy = [
    'const SHADER = `void main() { float x = abs(clamp(u, 0.0, 1.0)); vec3 v = vec3(1.0); }`;',
    'function render(mount, ratio) {',
    '  let half = 0;',
    '  half = ratio / 2;',
    '  const slash = /^[a-z()]+$/i;',
    '  const scaled = `pixel ${half} of ${Math.round(ratio / 4)}`;',
    '  return half + slash.source.length + SHADER.length + scaled.length;',
    '}',
  ].join('\n');
  assert.deepEqual(scanEngineSource(healthy), { undeclaredAssignments: [], undeclaredCalls: [] });
});

test('le Turbo consomme la charge une seule fois', () => {
  const start = engine.indexOf('const useBoost = () => {');
  assert.ok(start > 0, 'useBoost est déclaré dans le moteur');
  const body = engine.slice(start, engine.indexOf('\n  };', start));
  assert.equal(body.match(/consumePowerUp\(powerState, POWER_UPS\.BOOST\)/g)?.length, 1, 'une seule consommation de la charge');
  assert.equal(body.match(/powerState = res\.state;/g)?.length, 1, 'l’état des charges est bien repris');
  assert.equal(/powerStwerUp/.test(engine), false, 'aucune faute de frappe ne subsiste dans le chemin du Turbo');
});

test('le Chemin du Serpent recale sa mer de nuages sur toutes les maps', () => {
  // Déclarée une fois pour toutes (aucune opération hors Chemin du Serpent)…
  assert.match(engine, /let syncSnakewayClouds = \(\) => \{\};/);
  // …puis branchée sur la mer instanciée quand le terrain est le Chemin du Serpent.
  assert.match(engine, /syncSnakewayClouds = cloudSea\.sync;/);
  // Et appelée depuis `updateVisualRoute`, qui tourne à chaque image et au reset.
  assert.match(engine, /if \(snakeway\) snakewayRouteProgress\.value = progress;\s*\n\s*syncSnakewayClouds\(\);/);
});

test('la page montre la panne du moteur au lieu d’une piste noire', () => {
  // Le moteur remonte l'erreur, et la page l'affiche.
  assert.match(engine, /console\.error\('\[mirage\] construction du monde impossible/);
  assert.match(engine, /callbackRefs\.current\.onError\?\.\(/);
  assert.match(page, /<MirageWorld[\s\S]{0,600}?onError=\{\(message\) => setWorldError\(/);
  assert.match(page, /className="mirage-world-error" role="alert"/);
  assert.match(pageCss, /\.mirage-world-error\s*\{/);
  // Le message disparaît au lancement suivant.
  assert.match(page, /setCountdown\(3\);\s*\n\s*setPhase\('countdown'\);\s*\n\s*setWorldError\(''\);/);
});
