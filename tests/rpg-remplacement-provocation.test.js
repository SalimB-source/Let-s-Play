import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgChoisirBloqueurs } from '../src/games/rpgDuel.js';

const anciennes = ['gardien-de-la-porte-ardente', 'jarl-au-marteau-de-guerre', 'garde-du-trone-givre', 'berserk-du-crepuscule', 'colosse-du-verre-ardent', 'la-barbe-noire'];

test('les autres anciennes cartes affichent Défenseur une fois, sans ancienne mécanique', () => {
  for (const id of anciennes) {
    const carte = cardById(id);
    assert.ok(carte, id);
    assert.equal(carte.defenseur, true, id);
    assert.equal(carte.provocation, undefined, id);
    assert.doesNotMatch(carte.text, /provocation|doit être bloqu/i, id);
    assert.equal(pastillesPourCarte(carte).filter(p => p.cle === 'defenseur').length, 1, id);
  }
  const ancienne = { defenseur: true, provocation: true };
  assert.deepEqual(pastillesPourCarte(ancienne).map(p => p.cle), ['defenseur']);
});

test('l’IA ne sacrifie pas un bloqueur pour satisfaire un ancien marqueur', () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  const entite = (id, atk, pv, extra = {}) => ({ id, carteId: 'ashigaru-des-braises', name: id, atk, def: pv, pv, pvMax: pv, ready: true, attaquee: false, ...extra });
  d.joueur.creatures = [entite('a', 8, 8, { provocation: true })];
  d.sorcier.creatures = [entite('b', 1, 1)];
  d.sorcier.pv = 25;
  assert.deepEqual(rpgChoisirBloqueurs(d, 'joueur', ['a']), {});
});
