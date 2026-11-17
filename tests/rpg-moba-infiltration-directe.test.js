import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirAttaqueIndividuelleIA } from '../src/games/rpgMobaAI.js';

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : Infiltration ne frappe plus directement derrière un Défenseur`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
    if (d.tour !== side) rpgFinDeTour(d);
    d[side].main = ['danseuse-des-ombres-de-dune'];
    const danseuse = rpgMobaJouerCreature(d, side, 'danseuse-des-ombres-de-dune', 'left', 0).entite;
    assert.ok(danseuse?.infiltration);
    rpgFinDeTour(d); d[enemy].main = ['gardien-de-la-porte-ardente'];
    const gardien = rpgMobaJouerCreature(d, enemy, 'gardien-de-la-porte-ardente', 'left', 0).entite;
    assert.ok(gardien?.defenseur);
    rpgFinDeTour(d); danseuse.ready = true;
    const avant = JSON.stringify(d); let hasard = 0; rpgReglerHasard(d, () => { hasard++; return .5; });
    const coup = rpgMobaChoisirAttaqueIndividuelleIA(d, side);
    assert.ok(!coup || coup.cibleId !== null);
    assert.equal(JSON.stringify(d), avant); assert.equal(hasard, 0);
    const attaque = rpgMobaDeclarerAttaqueIndividuelle(d, side, danseuse.id, null, 'left');
    assert.equal(attaque.raison, 'cible');
    assert.equal(JSON.stringify(d), avant);
    assert.ok(d[enemy].creatures.some(e => e.id === gardien.id)); assert.ok(rpgMobaPlacementCoherent(d));
  });
}

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : Infiltration et Attaque ciblée peuvent viser une autre créature que le Défenseur`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
    if (d.tour !== enemy) rpgFinDeTour(d);
    d[enemy].main = ['gardien-de-la-porte-ardente'];
    const garde = rpgMobaJouerCreature(d, enemy, 'gardien-de-la-porte-ardente', 'left', 0).entite;
    rpgFinDeTour(d); rpgFinDeTour(d);
    d[enemy].main = ['ashigaru-des-braises'];
    const cible = rpgMobaJouerCreature(d, enemy, 'ashigaru-des-braises', 'left', 1).entite;
    rpgFinDeTour(d);
    d[side].main = ['danseuse-des-ombres-de-dune'];
    const attaquant = rpgMobaJouerCreature(d, side, 'danseuse-des-ombres-de-dune', 'left', 0).entite;
    assert.ok(garde?.defenseur && cible && attaquant?.infiltration);
    attaquant.ready = true; attaquant.malInvocation = false; attaquant.coupRapide = true;
    rpgReglerHasard(d, () => .5);
    const pv = cible.pv;
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, cible.id, 'left').ok);
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, side).ok);
    assert.ok((d[enemy].creatures.find(e => e.id === cible.id)?.pv ?? 0) < pv);
    assert.ok(d[enemy].creatures.some(e => e.id === garde.id));
  });
}
