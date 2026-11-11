import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgMobaCartePourApercu, rpgMobaNotesCarte } from '../src/games/rpgMobaPresentation.js';

test('le Traqueur perd visuellement l’Embuscade en MOBA sans modifier la carte classique', () => {
  const carte = cardById('traqueur-des-nuits-sans-lune');
  const moba = rpgMobaCartePourApercu(carte);
  assert.ok(carte.reactionTourAdverse);
  assert.ok(!moba.reactionTourAdverse);
  assert.ok(pastillesPourCarte(carte).some((p) => p.cle === 'reactionTourAdverse'));
  assert.ok(!pastillesPourCarte(moba).some((p) => p.cle === 'reactionTourAdverse'));
  assert.match(moba.text, /À son arrivée/);
  assert.match(rpgMobaNotesCarte(carte).join(' '), /effet d’arrivée reste actif/);
});

test('les notes de combat expliquent les priorités et restrictions MOBA', () => {
  assert.match(rpgMobaNotesCarte(cardById('appat-de-la-meute')).join(' '), /Injouable/);
  assert.match(rpgMobaNotesCarte(cardById('gardien-de-la-porte-ardente')).join(' '), /priorité/);
  assert.match(rpgMobaNotesCarte(cardById('feriel')).join(' '), /tout le plateau/);
});

test('les nouveaux indicateurs dirigent aussi les attaques ciblées hors de la voie', async () => {
  const { rpgMobaCombatIndicators } = await import('../src/games/rpgMobaCombatIndicators.js');
  const { mobaNouveau, mobaPlacer } = await import('../src/games/rpgMoba.js');
  const moba = mobaNouveau(); mobaPlacer(moba, 'joueur', 'left', 0, 'a'); mobaPlacer(moba, 'sorcier', 'right', 0, 'c');
  const duel = { moba, joueur: { creatures: [{ id: 'a', carteId: 'feriel', name: 'Fériel', mobaLane: 'left' }] }, sorcier: { creatures: [{ id: 'c', carteId: 'ashigaru-des-braises', name: 'Ashigaru', mobaLane: 'right' }] } };
  const arrows = rpgMobaCombatIndicators(duel, 'joueur', ['a'], { a: 'c' }, {}, { individuel: true });
  assert.deepEqual(arrows.attackArrows, { c: ['a'] });
});
