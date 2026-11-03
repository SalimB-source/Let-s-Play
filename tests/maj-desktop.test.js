/**
 * La mise à jour de la coque PC, pilotée depuis le jeu.
 *
 * Deux choses à tenir :
 *
 *   1. **le store** (`src/updates/maj-desktop.js`) — il lit le pont sécurisé,
 *      normalise l'état, relaie les ordres, et reste inerte hors coque PC ;
 *   2. **le câblage** — `desktop/main.js` diffuse son état et reçoit les ordres
 *      par IPC, `preload.cjs` les expose sous `window.letsPlayDesktop.maj`, et
 *      le jeu monte le panneau (`RpgMiseAJour.jsx`) à la racine de la table.
 *
 * Le processus principal reste seul à parler à `electron-updater` : le jeu ne
 * fait que lire et commander. Les dialogues natifs ne sont plus qu'un filet
 * (page hors ligne, vieille version du site sans le panneau).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ETAT_MAJ_INITIAL,
  creerStoreMajDesktop,
  libelleDebit,
  libelleTaille,
  normaliserEtatMaj,
  pontMajDisponible,
} from '../src/updates/maj-desktop.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (...parties) => fs.readFileSync(path.join(ROOT, ...parties), 'utf8');

const desktop = lire('desktop', 'main.js');
const preload = lire('desktop', 'preload.cjs');
const composant = lire('src', 'games', 'RpgMiseAJour.jsx');
const entree = lire('src', 'games', 'RpgEntryChoice.jsx');
const page = lire('src', 'games', 'RpgDuelPage.jsx');

/** Un pont de coque factice : on tient les callbacks et on journalise les ordres. */
function pontFactice() {
  const journal = [];
  let ecouteurEtat = null;
  let ecouteurOuverture = null;
  return {
    journal,
    diffuser(etat) { ecouteurEtat?.(etat); },
    ouvrir() { ecouteurOuverture?.(); },
    pont: {
      etat: async () => { journal.push('etat'); return { ...ETAT_MAJ_INITIAL, phase: 'a-jour', versionInstallee: '1.0.8' }; },
      verifier: async () => { journal.push('verifier'); },
      telecharger: async () => { journal.push('telecharger'); },
      installer: async () => { journal.push('installer'); },
      surEtat: (cb) => { ecouteurEtat = cb; return () => { ecouteurEtat = null; }; },
      surOuverture: (cb) => { ecouteurOuverture = cb; return () => { ecouteurOuverture = null; }; },
    },
  };
}

test('hors coque PC, le pont est absent et le store reste inerte', () => {
  assert.equal(pontMajDisponible(undefined), false);
  assert.equal(pontMajDisponible({}), false);
  assert.equal(pontMajDisponible({ letsPlayDesktop: {} }), false);
  assert.equal(pontMajDisponible({ letsPlayDesktop: { maj: { etat: () => {} } } }), true);

  const store = creerStoreMajDesktop(undefined);
  assert.equal(store.disponible, false);
  // Les ordres ne lèvent pas et n'envoient rien.
  assert.doesNotThrow(() => { store.verifier(); store.telecharger(); store.installer(); });
  assert.equal(store.getEtat().phase, 'repos');
});

test('normaliserEtatMaj comble les trous et borne la progression', () => {
  assert.deepEqual(normaliserEtatMaj(null), { ...ETAT_MAJ_INITIAL });
  assert.deepEqual(normaliserEtatMaj({}), { ...ETAT_MAJ_INITIAL });
  const etat = normaliserEtatMaj({
    phase: 'telechargement',
    version: '1.0.9',
    progression: { percent: 150, octetsParSeconde: -5, transferes: 'abc', total: 100 },
  });
  assert.equal(etat.phase, 'telechargement');
  assert.equal(etat.progression.percent, 100, 'la progression est bornée à 100');
  assert.equal(etat.progression.octetsParSeconde, 0, 'un débit négatif retombe à 0');
  assert.equal(etat.progression.transferes, 0, 'une valeur non numérique retombe à 0');
  assert.equal(normaliserEtatMaj({ phase: 'inconnue' }).phase, 'repos', 'une phase inconnue retombe au repos');
});

test('le store réclame la main, relaie les diffusions et les ordres', async () => {
  const { pont, journal, diffuser } = pontFactice();
  const store = creerStoreMajDesktop(pont);
  assert.equal(store.disponible, true);

  const vus = [];
  const desabonnement = store.abonner((etat) => vus.push(etat));
  // L'abonnement réclame l'état initial à la coque.
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(journal.includes('etat'), 'le store lit l’état courant en s’abonnant');
  assert.equal(store.getEtat().phase, 'a-jour');

  // Une diffusion de la coque arrive jusqu'à l'abonné.
  diffuser({ phase: 'disponible', version: '1.0.9' });
  assert.equal(store.getEtat().phase, 'disponible');
  assert.equal(store.getEtat().version, '1.0.9');
  assert.equal(vus[vus.length - 1].phase, 'disponible');

  // Les ordres partent vers la coque.
  store.verifier();
  store.telecharger();
  store.installer();
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(journal.includes('verifier'));
  assert.ok(journal.includes('telecharger'));
  assert.ok(journal.includes('installer'));

  desabonnement();
});

test('le store relaie le signal d’ouverture du menu Aide', async () => {
  const { pont, ouvrir } = pontFactice();
  const store = creerStoreMajDesktop(pont);
  let ouvertures = 0;
  store.abonner(() => {});
  const desabonnement = store.abonnerOuverture(() => { ouvertures += 1; });
  await new Promise((r) => setTimeout(r, 0));
  ouvrir();
  assert.equal(ouvertures, 1, 'le signal du menu Aide ouvre le panneau');
  desabonnement();
  ouvrir();
  assert.equal(ouvertures, 1, 'désabonné, le signal ne fait plus rien');
});

test('un pont qui rejette donne un état erreur, jamais une exception', async () => {
  const pont = {
    etat: async () => { throw new Error('coque injoignable'); },
    verifier: async () => { throw new Error('réseau coupé'); },
    telecharger: async () => {},
    installer: async () => {},
    surEtat: () => () => {},
    surOuverture: () => () => {},
  };
  const store = creerStoreMajDesktop(pont);
  const vus = [];
  store.abonner((etat) => vus.push(etat));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(store.getEtat().phase, 'erreur');
  assert.match(store.getEtat().erreur, /coque injoignable/);
  assert.doesNotThrow(() => store.verifier());
  await new Promise((r) => setTimeout(r, 0));
  assert.match(store.getEtat().erreur, /réseau coupé/);
});

test('les libellés de débit et de taille sont lisibles en français', () => {
  assert.equal(libelleTaille(105 * 1048576), '105 Mo');
  assert.equal(libelleTaille(512 * 1024), '512 Ko');
  assert.equal(libelleDebit(2.5 * 1048576), '2,5 Mo/s');
  assert.equal(libelleDebit(2048), '2 Ko/s');
});

test('la coque diffuse son état et reçoit les ordres du jeu par IPC', () => {
  // Le processus principal diffuse, et n'ouvre plus ses dialogues quand le jeu
  // a réclamé la main.
  assert.match(desktop, /webContents\.send\('desktop:maj', etatMaj\)/);
  assert.match(desktop, /ipcMain\.handle\('desktop:maj-etat'/);
  assert.match(desktop, /ipcMain\.handle\('desktop:maj-verifier'/);
  assert.match(desktop, /ipcMain\.handle\('desktop:maj-telecharger'/);
  assert.match(desktop, /ipcMain\.handle\('desktop:maj-installer'/);
  assert.match(desktop, /autoUpdater\.autoDownload = false/,
    'le jeu décide du téléchargement, la coque ne télécharge plus sans accord');
  assert.match(desktop, /autoUpdater\.downloadUpdate\(\)/);
  assert.match(desktop, /if \(majUiActive\) return;/,
    'une fois le jeu maître, plus de dialogue natif à la fin du téléchargement');
  // L'installation reste câblée (le check:desktop la vérifie aussi).
  assert.match(desktop, /autoUpdater\.quitAndInstall\(\)/);
});

test('le preload expose le pont de mise à jour sous letsPlayDesktop.maj', () => {
  assert.match(preload, /maj:\s*\{/);
  assert.match(preload, /ipcRenderer\.invoke\('desktop:maj-etat'\)/);
  assert.match(preload, /ipcRenderer\.invoke\('desktop:maj-telecharger'\)/);
  assert.match(preload, /ipcRenderer\.invoke\('desktop:maj-installer'\)/);
  assert.match(preload, /ipcRenderer\.on\('desktop:maj', ecouteur\)/);
  // Le pont Android ne doit toujours pas exister sur PC.
  assert.doesNotMatch(preload, /exposeInMainWorld\(\s*['"]LetsPlayAndroid/);
});

test('le jeu monte le panneau à la racine de la table et la carte dans les Paramètres', () => {
  assert.match(composant, /storeMajDesktop/);
  assert.match(composant, /role="dialog"/);
  assert.match(composant, /Télécharger la mise à jour/);
  assert.match(composant, /Redémarrer et installer/);
  assert.match(composant, /role="progressbar"/);
  assert.match(entree, /import RpgMiseAJour from '\.\/RpgMiseAJour\.jsx';/);
  assert.match(entree, /<RpgMiseAJour \/>/);
  assert.match(page, /import \{ RpgMiseAJourCarte \} from '\.\/RpgMiseAJour\.jsx';/);
  assert.match(page, /\{desktopMode && <RpgMiseAJourCarte \/>\}/);
});
