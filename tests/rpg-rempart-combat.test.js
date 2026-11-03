import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardCopyLimit } from '../src/games/rpgCards.js';
import { RPG_REVELATIONS_PAR_ETAGE } from '../src/games/rpgCollection.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';

function creer(rng = () => 0.9) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = { sable: 30, eau: 30, braise: 30, neige: 30, tenebres: 30 };
  return d;
}
function poser(d, cote, carte) {
  d[cote].main.push(carte);
  const r = rpgJouerCreature(d, cote, carte);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.entite;
}
function scenario(cote = 'joueur', rng = () => 0.9, attaquantCarte = 'chien-du-guet', bloqueurCarte = 'fennec-des-decombres') {
  const d = creer(rng); const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
  d.tour = cote;
  const a = poser(d, cote, attaquantCarte); a.ready = true;
  const rapide = poser(d, cote, 'feriel'); rapide.ready = true;
  const bloc = poser(d, adv, bloqueurCarte);
  return { d, cote, adv, a, rapide, bloc };
}
function combat(s, autres = []) {
  return rpgLancerAttaque(s.d, s.cote, [s.a.id, s.rapide.id],
    { [s.a.id]: [s.bloc.id, ...autres.map(x => x.id)] }, null, null, { [s.rapide.id]: s.bloc.id });
}
for (const cote of ['joueur', 'sorcier']) {
  test(`Attaque ciblée létale libère l'attaquant (${cote})`, () => {
    const s = scenario(cote); const pv = s.d[s.adv].pv;
    const r = combat(s); assert.equal(r.ok, true); assert.equal(s.d[s.adv].pv, pv - s.a.atk);
    assert.deepEqual(r.resume.attaquantsLiberes, [s.a.id]);
    assert.equal(s.d[s.adv].creatures.includes(s.bloc), false);
  });
}
test('un raté, une esquive et un bloqueur survivant maintiennent le blocage', () => {
  for (const variante of ['rate', 'esquive', 'survit']) {
    const s = scenario('joueur', () => 0.9, 'chien-du-guet', variante === 'esquive' ? 'onna-musha-des-cendres' : 'fennec-des-decombres');
    if (variante === 'rate') rpgReglerHasard(s.d, () => 0.1);
    if (variante === 'esquive') { s.bloc.esquiveChance = 1; }
    if (variante === 'survit') Object.assign(s.bloc, { pv: 10, pvMax: 10, def: 10 });
    const pv = s.d[s.adv].pv; const r = combat(s);
    assert.equal(r.ok, true, variante); assert.equal(s.d[s.adv].pv, pv, variante);
    assert.deepEqual(r.resume.attaquantsLiberes, [], variante);
  }
});
test('un autre bloqueur encore vivant intercepte normalement', () => {
  const s = scenario(); const autre = poser(s.d, s.adv, 'chien-du-guet');
  const pv = s.d[s.adv].pv; const r = combat(s, [autre]);
  assert.equal(r.ok, true); assert.equal(s.d[s.adv].pv, pv);
  assert.ok(r.resume.paires.some(p => p.includes(autre.name)));
});
test('une capacité de combat létale sans Attaque ciblée ne libère pas', () => {
  const s = scenario('joueur', () => 0.9, 'sahir-des-braises');
  const pv = s.d[s.adv].pv;
  const r = rpgLancerAttaque(s.d, s.cote, [s.a.id], { [s.a.id]: [s.bloc.id] });
  assert.equal(r.ok, true); assert.equal(s.d[s.adv].pv, pv); assert.equal(s.d[s.adv].creatures.includes(s.bloc), false);
});
test('une capacité létale combinée à une frappe ciblée insuffisante ne libère pas', () => {
  const s = scenario('joueur', () => 0.9, 'sahir-des-braises');
  Object.assign(s.bloc, { pv: 4, pvMax: 4, def: 4 });
  const pv = s.d[s.adv].pv; const r = combat(s);
  assert.equal(r.ok, true); assert.equal(s.d[s.adv].creatures.includes(s.bloc), false);
  assert.equal(s.d[s.adv].pv, pv); assert.deepEqual(r.resume.attaquantsLiberes, []);
});
test('un bloqueur déjà disparu avant le combat ne libère pas', () => {
  const s = scenario(); s.d[s.adv].creatures = []; const pv = s.d[s.adv].pv;
  const r = rpgLancerAttaque(s.d, s.cote, [s.a.id, s.rapide.id], {}, null, [s.a.id], { [s.rapide.id]: s.bloc.id }, { attaqueDeclaree: true });
  assert.equal(r.ok, true); assert.equal(s.d[s.adv].pv, pv); assert.deepEqual(r.resume.attaquantsLiberes, []);
});
test('PvP : déclaration puis blocage résolvent la règle', () => {
  const s = scenario(); s.d.mulliganFait = { joueur: true, sorcier: true }; s.d.phase = 'principale';
  const pv = s.d.sorcier.pv;
  const decl = rpgPvpAppliquer(s.d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [s.a.id, s.rapide.id], ciblesAttaque: { [s.rapide.id]: s.bloc.id } });
  assert.equal(decl.ok, true, JSON.stringify(decl));
  const res = rpgPvpAppliquer(s.d, 'sorcier', { type: 'bloquer', blocages: { [s.a.id]: [s.bloc.id] } });
  assert.equal(res.ok, true, JSON.stringify(res)); assert.equal(s.d.sorcier.pv, pv - s.a.atk);
});
test('Rempart mythique légendaire : toutes les créatures alliées et lui reçoivent un Bouclier', () => {
  const c = cardById('rempart-des-sables-eternels');
  assert.deepEqual([c.element, c.cost, c.atk, c.def, c.rarity, c.defenseur], ['sable', 6, 5, 6, 'mythique', true]);
  assert.match(c.typeLine, /légendaire.*Géant.*Gardien/); assert.equal(cardCopyLimit(c), 1);
  assert.ok(RPG_REVELATIONS_PAR_ETAGE['sables-3'].includes(c.id)); assert.ok(existsSync('public/cards/rempart-des-sables-eternels.jpg'));
  const d = creer(); const allie = poser(d, 'joueur', 'chien-du-guet'); const ennemi = poser(d, 'sorcier', 'chien-du-guet');
  const rempart = poser(d, 'joueur', c.id);
  assert.equal(allie.bouclier, 1); assert.equal(rempart.bouclier, 1); assert.ok(!ennemi.bouclier);
});
