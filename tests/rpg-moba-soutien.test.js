import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMobaSoinsCreatures, rpgMobaSoinsVoies, rpgMobaBoucliersAjoutes } from '../src/games/rpgMobaSoutien.js';

const duel = { joueur: { creatures: [{ id: 'a', bouclier: 1 }, { id: 'b', bouclierLumiere: true }] }, sorcier: { creatures: [{ id: 'c', bouclier: 1 }] } };

test('les soins regroupent les gains positifs réellement journalisés sur des créatures présentes', () => {
  const events = [{ cote: 'joueur', entityId: 'a', montant: 1 }, { cote: 'joueur', entityId: 'a', montant: 2 },
    { cote: 'joueur', entityId: 'b', montant: 0 }, { cote: 'joueur', entityId: 'absente', montant: 4 }, { cote: 'joueur', montant: 4 },
    { cote: 'sorcier', entityId: 'c', montant: 2 }, { cote: 'joueur', entityId: 'c', montant: 1 }];
  assert.deepEqual(rpgMobaSoinsCreatures(events, duel), { a: 3, c: 2 });
});

test('chaque voie reçoit uniquement ses vrais PV rendus, cumulés par camp', () => {
  const events = [{ laneId: 'left', side: 'joueur', healing: 2 }, { laneId: 'right', side: 'joueur', healing: 1 },
    { laneId: 'left', side: 'joueur', healing: 3 }, { laneId: 'left', side: 'sorcier', healing: 0 },
    { laneId: 'center', side: 'sorcier', healing: 2 }, { laneId: 'bad', side: 'joueur', healing: 5 }];
  assert.deepEqual(rpgMobaSoinsVoies(events), { 'left:joueur': 5, 'right:joueur': 1, 'center:sorcier': 2 });
});

test('un nouvel écran de protection ne se déclenche que sur un vrai bouclier ajouté', () => {
  const avant = { cartes: [{ side: 'joueur', entityId: 'a', bouclier: 0 }, { side: 'joueur', entityId: 'b', bouclierLumiere: false },
    { side: 'sorcier', entityId: 'c', bouclier: 1 }, { side: 'joueur', entityId: 'absente', bouclier: 0 }] };
  assert.deepEqual(rpgMobaBoucliersAjoutes(avant, duel), ['a', 'b']);
  assert.deepEqual(rpgMobaBoucliersAjoutes({ cartes: [] }, duel), []);
});
