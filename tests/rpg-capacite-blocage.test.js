import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { EFFET_DEFINITIONS, pastillesPourCarte, effetsDetailles } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgReglerHasard, rpgFinDeTour, rpgMulligan, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique as declarer, rpgResoudreAttaqueIndividuelleClassique as resoudre, rpgChoisirAttaqueIndividuelleClassiqueIA } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaChoisirAttaqueIndividuelleIA } from '../src/games/rpgMobaAI.js';
import { rpgPvpAppliquer, rpgPvpBrancherHasard } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

const ids = ['gardienne-des-portes-de-sable', 'gardien-des-sept-sceaux', 'onna-musha-des-cendres', 'guerrier-au-bouclier-rond'];
const mana = () => Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
function classique(id = ids[0], side = 'joueur') {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  d[side].mana = mana(); d[enemy].mana = mana(); d.tour = enemy;
  if (cardById(id).cost >= 5) {
    d[enemy].main.push('chien-du-guet'); assert.ok(rpgJouerCreature(d, enemy, 'chien-du-guet').ok);
    d[enemy].invocationNormaleJouee = false;
  }
  const sacrificeId = d[enemy].creatures[0]?.id;
  d[enemy].main.push(id);
  const pose = rpgJouerCreature(d, enemy, id, null, { sacrificeId });
  assert.ok(pose.ok, JSON.stringify(pose)); const cible = pose.entite;
  d.tour = side; d[side].main.push('chien-du-guet');
  const a = rpgJouerCreature(d, side, 'chien-du-guet').entite;
  assert.ok(a); a.ready = true; a.malInvocation = false;
  return { d, a, cible, side, enemy };
}
for (const id of ids) {
  test(`${id} : fiche et entité gardent leurs autres capacités`, () => {
    const c = cardById(id), { cible } = classique(id);
    assert.deepEqual(c.blocage, { chance: .25, def: 2 });
    assert.deepEqual(cible.blocage, c.blocage); assert.ok(c.defenseur);
    assert.match(c.text, /Blocage.*25 %.*\+2 DEF.*fin du tour/);
    assert.ok(pastillesPourCarte(c).some(p => p.cle === 'blocage'));
    assert.ok(effetsDetailles(c).pastilles.some(p => p.cle === 'blocage' && p.description));
    if (id.startsWith('onna')) { assert.ok(c.esquive && c.honneur && cible.esquive); }
  });
  for (const jet of [.249, .25]) test(`${id} : jet ${jet} à l’annonce classique`, () => {
    const { d, a, cible, side } = classique(id); let jets = 0;
    rpgReglerHasard(d, () => { jets++; return jet; });
    const base = cible.pv;
    assert.ok(declarer(d, side, a.id, cible.id).ok);
    assert.equal(jets, 1); assert.equal(cible.pv, base + (jet < .25 ? 2 : 0));
    assert.equal(cible.pvMax, base + (jet < .25 ? 2 : 0));
    assert.equal(cible.def, base + (jet < .25 ? 2 : 0));
    assert.ok(resoudre(d, side).ok);
  });
}
test('les activations se cumulent et expirent selon les règles des renforts temporaires', () => {
  const { d, a, cible, side, enemy } = classique();
  a.atk = 1; a.pv = a.pvMax = a.def = 20;
  rpgReglerHasard(d, () => 0);
  for (let i = 0; i < 2; i++) {
    a.attaquee = false;
    assert.ok(declarer(d, side, a.id, cible.id).ok);
    assert.ok(resoudre(d, side).ok);
  }
  assert.equal(cible.pvMax, 8); assert.equal(cible.pv, 6);
  assert.equal(d[enemy].bonusTemporaires.length, 2);
  assert.ok(rpgFinDeTour(d));
  assert.equal(cible.pvMax, 4); assert.equal(cible.pv, 4); assert.equal(cible.def, 4);
  assert.equal(d[enemy].bonusTemporaires.length, 0);
});
test('un refus ou une attaque directe ne jette pas Blocage ; une annulation ultérieure ne le retire pas', () => {
  const { d, a, cible, side } = classique(); let jets = 0; rpgReglerHasard(d, () => { jets++; return 0; });
  assert.equal(declarer(d, side, a.id, 'absente').ok, false); assert.equal(jets, 0);
  assert.ok(declarer(d, side, a.id, cible.id).ok); assert.equal(jets, 1);
  d[side].creatures = []; assert.ok(resoudre(d, side).annule); assert.equal(cible.pv, 6);
  assert.match(EFFET_DEFINITIONS.blocage, /cumulent/);
  const autre = classique(); autre.cible.defenseur = false; autre.cible.infiltration = true;
  rpgReglerHasard(autre.d, () => { jets++; return 0; });
  assert.ok(declarer(autre.d, autre.side, autre.a.id, null).ok); assert.equal(jets, 1);
});
for (const id of [ids[0], 'guerrier-au-bouclier-rond']) for (const side of ['joueur', 'sorcier']) test(`PvP ${id} ${side} : hasard rejouable et annonce atomique`, () => {
  const { d, a, cible, enemy } = classique(id, side);
  const defenseInitiale = cible.pv;
  d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true };
  rpgPvpBrancherHasard(d, 4);
  const copie = structuredClone(d); rpgPvpBrancherHasard(copie);
  const action = { type: 'attaquer', declarer: true, attaquants: [a.id], cibleId: cible.id };
  assert.equal(rpgPvpAppliquer(d, side, { ...action, cibleId: 'absente' }).ok, false);
  assert.equal(d.hasard.compteur, 0);
  assert.ok(rpgPvpAppliquer(d, side, action).ok);
  assert.ok(rpgPvpAppliquer(copie, side, action).ok);
  assert.equal(d.hasard.compteur, 1); assert.deepEqual(d.hasard, copie.hasard);
  assert.equal(d[enemy].creatures[0].pv, defenseInitiale + 2);
  assert.equal(d[enemy].creatures[0].pv, copie[enemy].creatures[0].pv);
  assert.ok(rpgPvpAppliquer(d, enemy, { type: 'bloquer', blocages: {} }).ok);
});
for (const id of ids) for (const side of ['joueur', 'sorcier']) test(`MOBA ${id} : ${side} cible et réponse`, () => {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (d.tour !== enemy) rpgFinDeTour(d);
  d[enemy].mana = mana();
  let sacrificeIds = [];
  if (cardById(id).cost >= 5) {
    d[enemy].main = ['chien-du-guet'];
    const offrande = rpgMobaJouerCreature(d, enemy, 'chien-du-guet', 'left', 0).entite; assert.ok(offrande);
    sacrificeIds = [offrande.id]; rpgFinDeTour(d); rpgFinDeTour(d);
  }
  d[enemy].main = [id];
  const pose = rpgMobaJouerCreature(d, enemy, id, 'left', 0, { sacrificeIds });
  assert.ok(pose.ok, JSON.stringify(pose)); const cible = pose.entite;
  rpgFinDeTour(d); d[side].mana = mana(); d[side].main = ['ashigaru-des-braises'];
  const a = rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite; assert.ok(a);
  a.ready = true; a.malInvocation = false;
  let jets = 0; rpgReglerHasard(d, () => { jets++; return 0; });
  const base = cible.pv;
  assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, cible.id, 'right').ok, false); assert.equal(jets, 0);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, cible.id, 'left').ok);
  assert.equal(jets, 1); assert.equal(cible.pv, base + 2); assert.ok(d.fenetreReponse);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, side).ok); assert.ok(rpgMobaPlacementCoherent(d));
  rpgFinDeTour(d); assert.equal(cible.pvMax, base);
});


test('Blocage précède une Attaque ciblée manquée', () => {
  const { d, a, cible, side } = classique(ids[2]);
  a.coupRapide = true;
  const sequence = [0, 0]; let n = 0;
  rpgReglerHasard(d, () => sequence[n++] ?? .5);
  assert.ok(declarer(d, side, a.id, cible.id).ok);
  const r = resoudre(d, side); assert.ok(r.ok);
  assert.equal(cible.pv, 5); assert.equal(n, 2); // Blocage puis raté
  assert.ok(r.resume.coupsRapides.some(c => c.rate));
});

test('une magie ciblée ne déclenche pas Blocage', () => {
  const { d, cible, side } = classique(); let jets = 0;
  d[side].main.push('trait-de-braise');
  rpgReglerHasard(d, () => { jets++; return 0; });
  const r = rpgLancerMagie(d, side, 'trait-de-braise', cible.id);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(jets, 0); assert.equal(d.log.some(l => l.startsWith('Blocage :')), false);
});

test('les simulations classiques ne modifient pas le hasard ni la partie', () => {
  const { d, side } = classique(); let jets = 0;
  rpgReglerHasard(d, () => { jets++; return 0; });
  const avant = JSON.stringify(d);
  rpgChoisirAttaqueIndividuelleClassiqueIA(d, side);
  assert.equal(jets, 0); assert.equal(JSON.stringify(d), avant);
});

test('les simulations MOBA ne modifient pas le hasard ni la partie', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  d.joueur.mana = mana(); d.joueur.main = [ids[0]];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', ids[0], 'left', 0).ok);
  rpgFinDeTour(d); d.sorcier.mana = mana(); d.sorcier.main = ['ashigaru-des-braises'];
  const a = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(a); a.ready = true; a.malInvocation = false;
  let jets = 0; rpgReglerHasard(d, () => { jets++; return 0; });
  const avant = JSON.stringify(d); rpgMobaChoisirAttaqueIndividuelleIA(d, 'sorcier');
  assert.equal(jets, 0); assert.equal(JSON.stringify(d), avant);
});

test('Esquive et Blocage font chacun leur jet indépendant', () => {
  const { d, a, cible, side } = classique(ids[2]); a.coupRapide = true;
  const sequence = [0, .5, 0]; let n = 0;
  rpgReglerHasard(d, () => sequence[n++] ?? .5);
  assert.ok(declarer(d, side, a.id, cible.id).ok);
  assert.ok(resoudre(d, side).ok);
  assert.equal(n, 3); assert.equal(cible.pv, 5);
});

test('une ancienne partie avec le Blocage imprimé à 15 % utilise le nouveau taux', () => {
  for (const jet of [.249, .25]) {
    const { d, a, cible, side } = classique();
    cible.blocage = { chance: .15, def: 2 }; // copie sérialisée avant la mise à jour
    const base = cible.pv;
    rpgReglerHasard(d, () => jet);
    assert.ok(declarer(d, side, a.id, cible.id).ok);
    assert.equal(cible.pv, base + (jet < .25 ? 2 : 0));
  }
});

test('les valeurs de Blocage explicitement différentes restent inchangées', () => {
  const { d, a, cible, side } = classique(); cible.blocage = { chance: .1, def: 2 };
  const base = cible.pv; rpgReglerHasard(d, () => .2);
  assert.ok(declarer(d, side, a.id, cible.id).ok);
  assert.equal(cible.pv, base);
});
