import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque } from '../src/games/rpgDuel.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';

function scenario({ rng = () => 0.5, bloqueurCarte = 'chien-du-guet', plusieurs = false, cote = 'joueur' } = {}) {
  const deck = Array(12).fill('chien-du-guet');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng });
  const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
  duel.tour = cote;
  for (const camp of [cote, adv]) duel[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 50]));
  const jouer = (camp, carte) => {
    duel[camp].main.push(carte);
    const res = rpgJouerCreature(duel, camp, carte);
    assert.equal(res.ok, true);
    res.entite.ready = true;
    return res.entite;
  };
  const attaquant = jouer(cote, 'chien-du-guet');
  const rapide = jouer(cote, 'feriel');
  const bloqueur = jouer(adv, bloqueurCarte);
  const autre = plusieurs ? jouer(adv, 'dune-marchante') : null;
  const pv = duel[adv].pv;
  const resultat = rpgLancerAttaque(duel, cote, [attaquant.id, rapide.id], {
    [attaquant.id]: [bloqueur.id, ...(autre ? [autre.id] : [])],
  }, null, null, { [rapide.id]: bloqueur.id });
  assert.equal(resultat.ok, true, resultat.raison);
  return { duel, adv, attaquant, rapide, bloqueur, autre, pv, resultat };
}

for (const cote of ['joueur', 'sorcier']) test(`dernier bloqueur tué par une autre Attaque rapide : passage sur l’adversaire (${cote})`, () => {
  const { duel, adv, attaquant, rapide, bloqueur, pv, resultat } = scenario({ cote });
  assert.ok(!duel[adv].creatures.some(e => e.id === bloqueur.id));
  assert.equal(duel[adv].pv, pv - attaquant.atk);
  assert.equal(resultat.resume.frappeSorcier, attaquant.atk, 'la frappe ciblée de Feriel ne frappe pas aussi le sorcier');
  assert.equal(attaquant.attaquee, true);
  assert.equal(rapide.attaquee, true);
});

test('une frappe rapide ratée ne libère pas l’attaquant', () => {
  const { duel, adv, pv, resultat } = scenario({ rng: () => 0.1 });
  assert.equal(resultat.resume.coupsRapides[0].rate, true);
  assert.equal(duel[adv].pv, pv);
});

test('un bloqueur qui survit à la frappe rapide maintient le blocage', () => {
  const { duel, adv, pv } = scenario({ bloqueurCarte: 'dune-marchante' });
  assert.equal(duel[adv].pv, pv);
});

test('un second bloqueur vivant empêche le passage sur le sorcier', () => {
  const { duel, adv, bloqueur, pv } = scenario({ plusieurs: true });
  assert.ok(!duel[adv].creatures.some(e => e.id === bloqueur.id));
  assert.equal(duel[adv].pv, pv);
});
