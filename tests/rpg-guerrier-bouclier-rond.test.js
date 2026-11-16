import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgResoudreArriveeCiblee } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreArrivee, MOBA_ARRIVEES_ALLIEES } from '../src/games/rpgMobaLocal.js';

const ID = 'guerrier-au-bouclier-rond';
const deck = Array(30).fill('ashigaru-des-braises');

test('la fiche est 2/3 Défenseur, sans Bouclier ni arrivée', () => {
  const c = cardById(ID);
  assert.deepEqual([c.atk, c.def, c.cost, c.defenseur], [2, 3, 2, true]);
  assert.equal(c.arrivee, undefined);
  assert.equal(c.text, 'Défenseur.');
  assert.deepEqual(pastillesPourCarte(c).map(p => p.cle), ['defenseur']);
  assert.equal(MOBA_ARRIVEES_ALLIEES.includes(ID), false);
});
for (const moba of [false, true]) for (const cote of ['joueur', 'sorcier']) {
  test(`${moba ? 'MOBA' : 'duel'} ${cote} : le Guerrier ne distribue plus de bouclier, mais peut en recevoir`, () => {
    const opts = { joueurDeck: deck, sorcierDeck: deck, rng: () => .5 };
    const d = moba ? rpgMobaNouveauDuel(opts) : rpgNouveauDuel({ ...opts, modeMana: 'essai', pvp: true });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
    if (cote === 'sorcier') rpgFinDeTour(d);
    Object.assign(d[cote].mana, { eau: 10, neige: 10 });
    d[cote].main = [ID];
    const r = moba ? rpgMobaJouerCreature(d, cote, ID, 'left', 0) : rpgJouerCreature(d, cote, ID, null, { cibleDifferee: true });
    assert.ok(r.ok, JSON.stringify(r));
    assert.deepEqual([r.entite.atk, r.entite.def, r.entite.pv, r.entite.pvMax], [2, 3, 3, 3]);
    assert.equal(estDefenseur(r.entite), true);
    assert.equal(r.entite.bouclier ?? 0, 0);
    assert.equal(d.arriveeEnAttente == null, true);
    if (moba) d.moba.creaturesJouees[cote] = false; else d[cote].invocationNormaleJouee = false;
    d[cote].main = ['veilleuse-des-citernes'];
    const v = moba ? rpgMobaJouerCreature(d, cote, 'veilleuse-des-citernes', 'right', 0) : rpgJouerCreature(d, cote, 'veilleuse-des-citernes', null, { cibleDifferee: true });
    assert.ok(v.ok && v.arriveeEnAttente, JSON.stringify(v));
    const choix = moba ? rpgMobaResoudreArrivee(d, cote, r.entite.id) : rpgResoudreArriveeCiblee(d, cote, r.entite.id);
    assert.ok(choix.ok, JSON.stringify(choix));
    assert.equal(r.entite.bouclier, 1);
  });
}
