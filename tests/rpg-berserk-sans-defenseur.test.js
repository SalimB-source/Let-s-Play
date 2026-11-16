import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';

const ID = 'berserk-des-trois-hivers';
const deck = Array(30).fill('ashigaru-des-braises');
function partie(moba) {
  const opts = { joueurDeck: deck, sorcierDeck: deck, rng: () => .5 };
  const d = moba ? rpgMobaNouveauDuel(opts) : rpgNouveauDuel({ ...opts, modeMana: 'essai', pvp: true });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  return d;
}
function poser(d, side, id, moba, slot = 0) {
  d[side].main = [id];
  const r = moba ? rpgMobaJouerCreature(d, side, id, 'left', slot) : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
test('la fiche conserve Furie et Overkill sans afficher Défenseur', () => {
  const c = cardById(ID);
  assert.equal(c.defenseur, undefined); assert.equal(c.furie, 2); assert.equal(c.overkill, true);
  assert.doesNotMatch(c.text, /Défenseur/);
  assert.deepEqual(pastillesPourCarte(c).map(p => p.cle), ['overkill', 'furie']);
});
for (const moba of [false, true]) test(`${moba ? 'MOBA' : 'duel PvP'} : le Berserk ne contraint plus les attaques, mais peut gagner Défenseur`, () => {
  const d = partie(moba);
  const berserk = poser(d, 'joueur', ID, moba);
  assert.equal(estDefenseur(berserk), false);
  rpgFinDeTour(d);
  const attaquant = poser(d, 'sorcier', 'ashigaru-des-braises', moba);
  const cibles = () => moba ? rpgMobaCiblesIndividuelles(d, 'sorcier', attaquant.id, 'left') : rpgCiblesIndividuellesClassique(d, 'sorcier', attaquant.id);
  assert.deepEqual(cibles(), { cibles: [berserk.id], directe: true });
  berserk.defenseurAccorde = true;
  assert.equal(estDefenseur(berserk), true);
  assert.deepEqual(cibles(), { cibles: [berserk.id], directe: false });
});
test('les anciennes sauvegardes perdent le Défenseur imprimé, pas celui donné par un effet', () => {
  const ancien = { carteId: ID, defenseur: true, provocation: true };
  assert.equal(estDefenseur(ancien), false);
  assert.equal(estDefenseur({ ...ancien, defenseurAccorde: true }), true);
  assert.equal(estDefenseur({ carteId: 'jarl-au-marteau-de-guerre', defenseur: true }), true);
});
test('la Veilleuse des citernes peut accorder Défenseur au Berserk', () => {
  const d = partie(false);
  const berserk = poser(d, 'joueur', ID, false);
  d.joueur.invocationNormaleJouee = false;
  d.joueur.main = ['veilleuse-des-citernes'];
  const r = rpgJouerCreature(d, 'joueur', 'veilleuse-des-citernes', berserk.id);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(berserk.defenseurAccorde, true); assert.equal(estDefenseur(berserk), true);
});
