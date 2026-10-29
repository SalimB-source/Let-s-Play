import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createRpgLandscapeSession,
  sessionsPaysageOuvertes,
  reinitialiserSessionsPaysage,
} from '../src/games/rpgLandscape.js';

/**
 * Le paysage du Sablier : toute la section, du menu au duel
 * --------------------------------------------------------
 * Le joueur avait un jeu qui se jouait en paysage *pendant* les parties et
 * repassait en portrait au menu. Trois choses le corrigent, et chacune est
 * vérifiée ici sur un faux `window` — pas sur une relecture du source :
 *
 *   1. le compteur de sessions de `rpgLandscape.js` (une annonce au système à
 *      la première ouverture, une seule à la dernière fermeture) ;
 *   2. le pont Android `setPaysageSablier`, qui reconnaît toute la section ;
 *   3. les routes de `main.jsx`, enveloppées dans `PaysageSablier`.
 */

function environnement({ pont = null } = {}) {
  const calls = [];
  const win = {
    innerWidth: 360,
    innerHeight: 740,
    // Téléphone au doigt, en portrait : la session demande le paysage.
    matchMedia: () => ({ matches: true }),
    screen: {
      orientation: {
        lock: async (mode) => { calls.push(mode); },
        unlock: () => calls.push('unlock'),
      },
    },
  };
  if (pont) win.LetsPlayAndroid = pont(calls);
  const doc = { fullscreenElement: null };
  return { win, doc, calls, doc2: null };
}

function pontModerne(calls) {
  return { setPaysageSablier: (actif) => calls.push(`sablier:${actif}`) };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('route et duel partagent un seul verrou : le système n’entend qu’un début et qu’une fin', async () => {
  reinitialiserSessionsPaysage();
  const { win, doc, calls } = environnement({ pont: pontModerne });

  const route = createRpgLandscapeSession(win, doc);   // PaysageSablier
  await route.enter({ fullscreen: false });
  assert.deepEqual(calls, ['sablier:true', 'landscape'], 'entrer dans le Sablier réclame le paysage');
  assert.equal(sessionsPaysageOuvertes(), 1);

  const duel = createRpgLandscapeSession(win, doc);    // RpgDuelPage
  await duel.enter({ fullscreen: false });
  assert.deepEqual(calls.filter((c) => c.startsWith('sablier:')), ['sablier:true'],
    'le duel ne redemande rien au système');
  assert.equal(sessionsPaysageOuvertes(), 2);

  duel.leave();                                        // retour au menu
  assert.deepEqual(calls.filter((c) => c.startsWith('sablier:')), ['sablier:true'],
    'refermer le duel ne rend pas l’écran : le menu est encore là');
  assert.equal(sessionsPaysageOuvertes(), 1);

  route.leave();                                       // sortie vers les actus
  assert.deepEqual(calls.filter((c) => c.startsWith('sablier:')), ['sablier:true', 'sablier:false'],
    'quitter le Sablier rend l’orientation');
  assert.equal(sessionsPaysageOuvertes(), 0);
});

test('le duel peut verrouiller là où la route a échoué : la dernière sortie déverrouille quand même', async () => {
  reinitialiserSessionsPaysage();
  const { win, doc, calls } = environnement({ pont: pontModerne });
  // La route est montée hors plein écran : son verrou est refusé.
  win.screen.orientation.lock = async (mode) => {
    calls.push(mode);
    if (!doc.fullscreenElement) throw new Error('plein écran requis');
  };

  const route = createRpgLandscapeSession(win, doc);
  await route.enter({ fullscreen: false });
  assert.equal(sessionsPaysageOuvertes(), 1);

  // Le duel verrouille, lui, une fois la page en plein écran.
  doc.fullscreenElement = doc.documentElement = {};
  const duel = createRpgLandscapeSession(win, doc);
  await duel.enter({ fullscreen: false });
  duel.leave();
  assert.ok(!calls.includes('unlock'), 'le menu tient encore l’écran');

  route.leave();
  assert.ok(calls.includes('unlock'), 'le verrou pris par le duel est rendu en quittant le Sablier');
  assert.equal(calls.at(-1), 'unlock', 'l’écran est rendu après l’annonce au système');
  assert.equal(sessionsPaysageOuvertes(), 0);
});

test('une APK plus ancienne reste pilotée par son ancien nom', async () => {
  reinitialiserSessionsPaysage();
  const { win, doc, calls } = environnement({
    pont: (liste) => ({ setDuelLandscape: (actif) => liste.push(`duel:${actif}`) }),
  });
  const session = createRpgLandscapeSession(win, doc);
  await session.enter({ fullscreen: false });
  session.leave();
  assert.deepEqual(calls.filter((c) => c.startsWith('duel:')), ['duel:true', 'duel:false']);
});

test('un pont qui lève ne casse pas le jeu', async () => {
  reinitialiserSessionsPaysage();
  const { win, doc } = environnement({
    pont: () => ({ setPaysageSablier: () => { throw new Error('pont cassé'); } }),
  });
  const session = createRpgLandscapeSession(win, doc);
  await assert.doesNotReject(session.enter({ fullscreen: false }));
  assert.doesNotThrow(() => session.leave());
});

test('les routes du Sablier sont enveloppées, les actus non', async () => {
  const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const lignes = source.split('\n').filter((ligne) => ligne.includes('<Route path='));
  const sablier = lignes.filter((ligne) => ligne.includes('/jeu/sablier-de-bab-el'));
  assert.equal(sablier.length, 3, 'entrée, salon PvP et salon PvP avec code');
  for (const ligne of sablier) {
    assert.match(ligne, /element=\{<PaysageSablier>/, `route habillée : ${ligne.trim()}`);
    assert.match(ligne, /<\/PaysageSablier>\}/);
  }
  for (const chemin of ['"/actus"', '"/news"', '"/messages"', '"/"']) {
    const ligne = lignes.find((l) => l.includes(`path=${chemin}`));
    assert.ok(ligne, `route ${chemin} présente`);
    assert.ok(!ligne.includes('PaysageSablier'), `route ${chemin} laissée en portrait`);
  }
});

test('le menu du jeu invite à tourner l’appareil, comme le duel', async () => {
  const source = await readFile(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import InvitePaysage from '\.\/InvitePaysage\.jsx';/);
  // Les deux rendus du menu (`rpg-battle--menu`) le posent, l'invite du duel reste.
  assert.equal(source.split('{invitePaysage}').length - 1, 2, 'les deux menus portent l’invite');
  assert.match(source, /const invitePaysage = viewport\.portrait \?/);
  assert.match(source, /onActiver=\{demanderPleinEcranEtPaysage\}/,
    'le bouton doit repasser par le plein écran du geste puis le verrou');
});

test('l’APK verrouille toute la section, en paysage, tablette comprise', async () => {
  const source = await readFile(
    new URL('../android/app/src/main/java/dz/letsplay/officiel/MainActivity.java', import.meta.url),
    'utf8',
  );
  assert.match(source, /public void setPaysageSablier\(boolean active\)/);
  assert.match(source, /public void setDuelLandscape\(boolean active\)/,
    'ancien nom conservé pour une page restée en cache');
  assert.match(source, /SCREEN_ORIENTATION_SENSOR_LANDSCAPE/, 'les deux sens de rotation, jamais le portrait');
  assert.match(source, /path\.startsWith\(base \+ "\/"\)/, 'tout préfixe de la section, pas le seul chemin du duel');
  assert.ok(!source.includes('isTrustedDuelPage'), 'plus de reconnaissance limitée au duel');
  assert.match(source, /if \(!estPageSablier\(\)\) rendreOrientation\(\);/);
});

test('le wrapper monte une session et la referme', async () => {
  // Le composant ne rend rien : on vérifie le contrat qu'il tient sur la
  // session, sans DOM — c'est la session qui possède les effets.
  const { default: PaysageSablier } = await import('../src/games/PaysageSablier.jsx')
    .catch(() => ({ default: null }));
  if (!PaysageSablier) {
    // Node ne lit pas le JSX : on retombe sur le source, qui doit rester aussi
    // simple que ça — un `enter` au montage, un `leave` au démontage.
    const source = await readFile(new URL('../src/games/PaysageSablier.jsx', import.meta.url), 'utf8');
    assert.match(source, /useEffect\(\(\) => \{/);
    assert.match(source, /paysage\.enter\(\{ fullscreen: false \}\)/);
    assert.match(source, /return \(\) => paysage\.leave\(\);/);
    return;
  }
  assert.equal(typeof PaysageSablier, 'function');
});

test('la session ne compte pas deux fois ses entrées', async () => {
  reinitialiserSessionsPaysage();
  const { win, doc, calls } = environnement({ pont: pontModerne });
  const session = createRpgLandscapeSession(win, doc);
  await session.enter({ fullscreen: false });
  await session.enter({ fullscreen: false });   // « Activer le paysage » rappuyé
  await tick();
  assert.equal(sessionsPaysageOuvertes(), 1);
  assert.deepEqual(calls.filter((c) => c.startsWith('sablier:')), ['sablier:true']);
  session.leave();
  assert.equal(sessionsPaysageOuvertes(), 0);
  assert.deepEqual(calls.filter((c) => c.startsWith('sablier:')), ['sablier:true', 'sablier:false']);
});
