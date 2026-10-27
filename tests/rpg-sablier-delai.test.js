import test from 'node:test';
import assert from 'node:assert/strict';
import { avecDelaiSablier } from '../src/games/rpgSablierDelai.js';
import { accueilSablierPret } from '../src/games/useStatutSyncSablier.js';

test('une synchronisation bloquée est annulée et rend la main', async () => {
  let signal;
  await assert.rejects(avecDelaiSablier((fourni) => {
    signal = fourni;
    return new Promise(() => {});
  }, 15), /Délai de synchronisation/);
  assert.equal(signal.aborted, true, 'la requête distante ne reste pas active');
});

test('une réponse ou une erreur immédiate ne se transforme pas en expiration', async () => {
  let signal;
  const resultat = await avecDelaiSablier((fourni) => { signal = fourni; return 'table'; }, 100);
  assert.equal(resultat, 'table');
  assert.equal(signal.aborted, false);
  await assert.rejects(avecDelaiSablier(() => { throw new Error('réseau'); }, 100), /réseau/);
});

test('un compte attend toutes ses synchronisations, les invités et démos restent locaux', () => {
  const compte = { user: { id: 'A' }, loading: false, isDemo: false };
  assert.equal(accueilSablierPret({ ...compte, loading: true }, 'synchronise', 'synchronise'), false);
  assert.equal(accueilSablierPret(compte), false);
  assert.equal(accueilSablierPret(compte, 'local', 'local'), false);
  assert.equal(accueilSablierPret(compte, 'synchronise', 'attente'), false);
  assert.equal(accueilSablierPret(compte, 'synchronise', 'horsligne', 'synchronise'), true);
  assert.equal(accueilSablierPret({ user: null, loading: false }, 'local'), true);
  assert.equal(accueilSablierPret({ ...compte, isDemo: true }, 'local'), true);
});
