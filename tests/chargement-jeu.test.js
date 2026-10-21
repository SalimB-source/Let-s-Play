import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TENTATIVES_CHARGEMENT,
  importerAvecReprise,
  messageChargementJeu,
} from '../src/games/chargementJeu.js';

/**
 * La reprise du téléchargement d'un morceau du jeu — le filet qui empêche
 * l'écran noir quand `RpgDuelPage` n'arrive pas du premier coup.
 */

test('un morceau qui arrive au premier essai n’est pas redemandé', async () => {
  let appels = 0;
  const module = await importerAvecReprise(async () => {
    appels += 1;
    return { duel: true };
  }, { pause: async () => {} });
  assert.deepEqual(module, { duel: true });
  assert.equal(appels, 1);
});

test('une coupure passagère est rattrapée sans que le joueur s’en aperçoive', async () => {
  let appels = 0;
  const attentes = [];
  const essais = [];
  const module = await importerAvecReprise(async () => {
    appels += 1;
    if (appels === 1) throw new Error('Failed to fetch dynamically imported module');
    return 'duel';
  }, {
    pause: async (ms) => { attentes.push(ms); },
    surNouvelEssai: (essai, erreur) => essais.push([essai, erreur.message]),
  });
  assert.equal(module, 'duel');
  assert.equal(appels, 2);
  assert.deepEqual(attentes, [400], 'le premier répit reste court');
  assert.equal(essais.length, 1, 'chaque reprise est signalée une fois');
});

test('les répits doublent, et la dernière erreur remonte', async () => {
  const attentes = [];
  let appels = 0;
  await assert.rejects(
    importerAvecReprise(async () => {
      appels += 1;
      throw new Error(`échec ${appels}`);
    }, { pause: async (ms) => { attentes.push(ms); } }),
    /échec 3/,
    'c’est la dernière tentative qui décrit l’état réel du serveur',
  );
  assert.equal(appels, TENTATIVES_CHARGEMENT);
  assert.deepEqual(attentes, [400, 800], '400 ms puis 800 ms, jamais plus de trois essais');
});

test('un morceau définitivement absent rejette après trois essais', async () => {
  let appels = 0;
  await assert.rejects(importerAvecReprise(async () => {
    appels += 1;
    throw new Error('404');
  }, { pause: async () => {} }));
  assert.equal(appels, 3);
});

test('le nombre d’essais est réglable, sans descendre sous un', async () => {
  let appels = 0;
  const jamais = async (ms) => { throw new Error(`attente inattendue ${ms}`); };
  await assert.rejects(importerAvecReprise(async () => {
    appels += 1;
    throw new Error('absent');
  }, { tentatives: 0, pause: jamais }), /absent/);
  assert.equal(appels, 1, 'zéro tentative reste une tentative');
});

test('le message au joueur traduit l’erreur du navigateur', () => {
  assert.match(
    messageChargementJeu(new Error('Failed to fetch dynamically imported module: https://exemple/assets/RpgDuelPage-abc.js')),
    /connexion interrompue/,
    'la panne de téléchargement se raconte en français',
  );
  assert.match(
    messageChargementJeu(new Error('error loading dynamically imported module')),
    /site mis à jour/,
    'un redéploiement est nommé : c’est la cause la plus fréquente',
  );
  assert.equal(messageChargementJeu(new Error('Boom')), 'Boom', 'les autres erreurs gardent leur message');
  assert.match(messageChargementJeu(null), /Erreur inconnue/, 'sans erreur, on ne laisse pas le champ vide');
});
