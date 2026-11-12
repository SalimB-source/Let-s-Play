import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirAttaqueIndividuelleIA } from '../src/games/rpgMobaAI.js';

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : Infiltration frappe la voie sans blesser l'ennemi, avec une réponse possible`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
    if (d.tour !== side) rpgFinDeTour(d);
    d[side].main = ['danseuse-des-ombres-de-dune'];
    const danseuse = rpgMobaJouerCreature(d, side, 'danseuse-des-ombres-de-dune', 'left', 0).entite;
    assert.ok(danseuse?.infiltration);
    rpgFinDeTour(d); d[enemy].main = ['ashigaru-des-braises'];
    const gardien = rpgMobaJouerCreature(d, enemy, 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(d); danseuse.ready = true;
    const avant = JSON.stringify(d); let hasard = 0; rpgReglerHasard(d, () => { hasard++; return .5; });
    const coup = rpgMobaChoisirAttaqueIndividuelleIA(d, side);
    assert.equal(coup?.attaquantId, danseuse.id); assert.equal(coup?.cibleId, null);
    assert.equal(JSON.stringify(d), avant); assert.equal(hasard, 0);
    const attaque = rpgMobaDeclarerAttaqueIndividuelle(d, side, danseuse.id, null, 'left');
    assert.ok(attaque.ok, JSON.stringify(attaque)); assert.ok(d.fenetreReponse);
    assert.equal(d.moba.lanes.find(l => l.id === 'left').hp[enemy], 20);
    const result = rpgMobaResoudreAttaqueIndividuelle(d, side);
    assert.ok(result.ok, JSON.stringify(result)); assert.equal(d.moba.lanes.find(l => l.id === 'left').hp[enemy], 18);
    assert.ok(d[enemy].creatures.some(e => e.id === gardien.id)); assert.ok(rpgMobaPlacementCoherent(d));
  });
}
