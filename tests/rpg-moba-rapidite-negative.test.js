import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { mobaNouveau } from '../src/games/rpgMoba.js';
import { MOBA_RAPIDITE_EMBUSCADES, rpgMobaConditionRapidite } from '../src/games/rpgMobaRapidite.js';
import { MOBA_EMBUSCADES_IMPRIMEES, rpgMobaConditionImprimee } from '../src/games/rpgMobaEmbuscadesImprimees.js';
import { MOBA_EMBUSCADES_CONDITIONS, rpgMobaConditionSpeciale } from '../src/games/rpgMobaEmbuscades.js';

const presence = (id, options = {}) => ({ id, carteId: id, atk: cardById(id)?.atk ?? 1,
  pv: 1, pvMax: 4, mobaLane: 'right', ...options });
const fixture = () => ({
  moba: mobaNouveau(), tour: 'joueur', phase: 'principale',
  joueur: {
    main: ['gerboise-des-ruines', 'ronin-du-soleil-rouge', 'ashigaru-des-braises'],
    cimetiere: ['sandales-de-tislit', 'poigne-de-givre', 'memoire-de-l-armurerie'],
    creatures: [presence('vampire-des-braises', { pv: 4 }), presence('vampire-des-braises', { id: 'vampire-blesse' }),
      presence('ronin-du-soleil-rouge', { arme: { carteId: 'takouba-des-pistes' } }),
      presence('djinn-des-braises-voilees'), presence('viking-des-neiges'), presence('cotre-de-course'), presence('gardienne-des-portes-de-sable')],
  },
  sorcier: { creatures: [presence('la-barbe-noire', { atk: 4, envol: true }),
    presence('djinn-de-foudre', { atk: 3 }), presence('ashigaru-des-braises', { atk: 2 }),
    ...Array.from({ length: 5 }, (_, i) => presence('ashigaru-des-braises', { id: `ennemi-${i}` }))] },
});

for (const [label, entries, condition] of [
  ['Rapidité', MOBA_RAPIDITE_EMBUSCADES, rpgMobaConditionRapidite],
  ['imprimée', MOBA_EMBUSCADES_IMPRIMEES, rpgMobaConditionImprimee],
  ['spéciale', MOBA_EMBUSCADES_CONDITIONS, rpgMobaConditionSpeciale],
]) test(`conditions ${label} : chaque carte possède un prérequis global et un contre-exemple`, () => {
  for (const id of Object.keys(entries)) {
    const positif = fixture();
    assert.equal(condition(positif, 'joueur', id), true, `positif ${id}`);
    const negatif = fixture();
    negatif.joueur.creatures = [];
    negatif.sorcier.creatures = [];
    negatif.joueur.main = ['cotre-de-course'];
    negatif.joueur.cimetiere = [];
    assert.equal(condition(negatif, 'joueur', id), false, `négatif ${id}`);
    assert.ok((entries[id].texte ?? entries[id]).length > 15, `texte ${id}`);
  }
});

test('main et cimetière : seuils et catégories sont distincts et réévalués', () => {
  const d = fixture();
  const ok = (id) => rpgMobaConditionRapidite(d, 'joueur', id);
  assert.equal(ok('gerboise-des-ruines'), true);
  d.joueur.main = ['gerboise-des-ruines', 'poigne-de-givre', 'sandales-de-tislit'];
  assert.equal(ok('gerboise-des-ruines'), false, 'magie/arme ne sont pas des créatures en main');
  d.joueur.main.push('ashigaru-des-braises');
  assert.equal(ok('gerboise-des-ruines'), true);
  d.joueur.cimetiere = ['poigne-de-givre', 'memoire-de-l-armurerie'];
  assert.equal(ok('bouchra-guerriere-des-cretes'), false);
  assert.equal(ok('djinn-du-dernier-brasier'), true);
  assert.equal(ok('salem'), true);
  assert.equal(rpgMobaConditionImprimee(d, 'joueur', 'sorcier-du-ressac-noir'), true);
  d.joueur.cimetiere = ['sandales-de-tislit', 'memoire-de-l-armurerie'];
  assert.equal(ok('bouchra-guerriere-des-cretes'), true);
  assert.equal(ok('djinn-du-dernier-brasier'), false);
  assert.equal(rpgMobaConditionImprimee(d, 'joueur', 'sorcier-du-ressac-noir'), false);
  d.joueur.cimetiere = ['sandales-de-tislit', 'poigne-de-givre'];
  assert.equal(ok('salem'), false);
});
