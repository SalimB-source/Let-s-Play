/** La session du Sablier — le pont Android, le plein écran, et plus d'orientation.
 *
 *  Les routes `/jeu/sablier-de-bab-el[/defi[/:code]]` ouvrent une session
 *  (`SessionSablier.jsx`), le duel en ouvrait une seconde : le compteur ne
 *  prévenait le pont qu'à la première ouverture et à la dernière fermeture.
 *
 *  Le Sablier ne verrouille **plus** le paysage : le plateau est une pile
 *  verticale (coque portrait `rpg-portrait.css`), le paysage garde la sienne
 *  (`rpg-mobile.css`). Ce qui reste testé ici : le compteur, l'annonce au pont
 *  Android (`setSablierActif`, qui désarme le tirer-pour-rafraîchir), le plein
 *  écran demandé dans le geste, et l'absence de tout verrou d'orientation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createSessionSablier, sessionsSablierOuvertes, reinitialiserSessionsSablier,
} from '../src/games/rpgSessionSablier.js';

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');

function environnement({ pont = true, pleinEcran = true } = {}) {
  const calls = [];
  const doc = { fullscreenElement: null };
  if (pleinEcran) {
    doc.documentElement = {
      requestFullscreen: async () => { calls.push('fullscreen'); doc.fullscreenElement = doc.documentElement; },
    };
    doc.exitFullscreen = async () => { calls.push('exit'); doc.fullscreenElement = null; };
  } else {
    doc.documentElement = {};
  }
  const win = {
    innerWidth: 390,
    matchMedia: () => ({ matches: true }),
    // Un `lock` qui traînerait encore se verrait dans les appels : c'est le
    // garde-fou du test.
    screen: { orientation: { lock: async (mode) => calls.push(`lock:${mode}`), unlock: () => calls.push('unlock') } },
  };
  if (pont) win.LetsPlayAndroid = { setSablierActif: (actif) => calls.push(`sablier:${actif}`) };
  return { calls, win, doc };
}

test('aucun verrou d’orientation ne subsiste dans le module ni dans la coque', () => {
  const module = lire('src/games/rpgSessionSablier.js');
  assert.doesNotMatch(module, /orientation\.lock|lock\('landscape'\)|SENSOR_LANDSCAPE/);
  const coque = lire('src/games/SessionSablier.jsx');
  // Le commentaire peut nommer l'orientation ; le code, jamais.
  assert.doesNotMatch(coque, /orientation\.lock|screen\.orientation|lock\('landscape'\)/);
  for (const fichier of ['src/games/InvitePaysage.jsx', 'src/games/PaysageSablier.jsx', 'src/games/rpgLandscape.js']) {
    assert.throws(() => lire(fichier), `${fichier} n'existe plus`);
  }
});

test('la session demande le plein écran dans le geste et le rend en sortant', async () => {
  const e = environnement();
  const s = createSessionSablier(e.win, e.doc);
  await s.enter();
  s.leave();
  assert.deepEqual(e.calls, ['sablier:true', 'fullscreen', 'sablier:false', 'exit']);
});

test('une session de route n’ouvre pas le plein écran à la place de l’écran', async () => {
  const e = environnement();
  const s = createSessionSablier(e.win, e.doc);
  await s.enter({ fullscreen: false });
  s.leave();
  assert.deepEqual(e.calls, ['sablier:true', 'sablier:false']);
});

test('le pont n’entend qu’une annonce, quel que soit le nombre d’écrans', async () => {
  const e = environnement();
  reinitialiserSessionsSablier();
  const route = createSessionSablier(e.win, e.doc);   // SessionSablier
  const duel = createSessionSablier(e.win, e.doc);    // le duel, dans la route
  await route.enter({ fullscreen: false });
  await duel.enter({ fullscreen: false });
  assert.equal(sessionsSablierOuvertes(), 2, 'les deux sessions vivent');
  duel.leave();
  assert.deepEqual(e.calls, ['sablier:true'], 'refermer le duel ne rend pas la section inactive');
  route.leave();
  assert.deepEqual(e.calls, ['sablier:true', 'sablier:false'], 'la dernière fermeture seule annonce la sortie');
  assert.equal(sessionsSablierOuvertes(), 0);
});

test('une APK sans la nouvelle méthode ne casse rien et n’est pas verrouillée', async () => {
  const e = environnement({ pont: false });
  e.win.LetsPlayAndroid = { setPaysageSablier: () => e.calls.push('ancien-verrou') };
  const s = createSessionSablier(e.win, e.doc);
  await assert.doesNotReject(s.enter({ fullscreen: false }));
  s.leave();
  assert.deepEqual(e.calls, [], 'aucun repli sur l’ancien verrou de paysage');
});

test('le pont cassé ou refusé est silencieux', async () => {
  const e = environnement({ pont: false });
  e.win.LetsPlayAndroid = { setSablierActif: () => { throw new Error('pont cassé'); } };
  const s = createSessionSablier(e.win, e.doc);
  await assert.doesNotReject(s.enter({ fullscreen: false }));
  s.leave();
});

test('un appareil sans Fullscreen API garde la coque calée sur sa fenêtre', async () => {
  const e = environnement({ pleinEcran: false });
  const s = createSessionSablier(e.win, e.doc);
  await assert.doesNotReject(s.enter());
  s.leave();
  assert.deepEqual(e.calls, ['sablier:true', 'sablier:false']);
});

test('les trois routes du Sablier ouvrent la même session', () => {
  const main = lire('src/main.jsx');
  const lignes = main.split('\n').filter((l) => l.includes('sablier-de-bab-el'));
  assert.equal(lignes.length, 3, 'entrée, salon de défi, défi par code');
  for (const ligne of lignes) {
    assert.match(ligne, /<SessionSablier>/, `route habillée : ${ligne.trim()}`);
    assert.match(ligne, /<\/SessionSablier>/);
  }
  assert.equal((main.match(/import SessionSablier from '\.\/games\/SessionSablier';/g) ?? []).length, 1);
});

test('la page ne montre plus d’écran de rotation', () => {
  const duel = lire('src/games/RpgDuelPage.jsx');
  assert.doesNotMatch(duel, /rpg-rotate-prompt/);
  assert.doesNotMatch(duel, /InvitePaysage/);
  const entree = lire('src/games/RpgEntryChoice.jsx');
  assert.doesNotMatch(entree, /InvitePaysage|usePortraitAuDoigt/);
});

test('le pont Android expose setSablierActif sans toucher à l’orientation', () => {
  const java = lire('android/app/src/main/java/dz/letsplay/officiel/MainActivity.java');
  const debut = java.indexOf('public void setSablierActif(boolean active)');
  assert.ok(debut >= 0, 'la méthode existe');
  const corps = java.slice(debut, java.indexOf('\n        }', debut));
  assert.match(corps, /refreshLayout\.setEnabled\(!active\)/, 'le tirer-pour-rafraîchir est désarmé');
  assert.doesNotMatch(corps, /setRequestedOrientation/, 'aucune orientation imposée');
  // L'ancienne méthode reste branchée pour une page plus ancienne restée en
  // cache : elle, elle verrouille (c'est son contrat historique).
  assert.match(java, /public void setPaysageSablier\(boolean active\)/);
});
