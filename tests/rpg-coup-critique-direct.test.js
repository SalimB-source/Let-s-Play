import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerMagie, rpgAttaquerSorcier, rpgReglerHasard, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaJouerArme, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaCombatFeedback } from '../src/games/rpgMobaCombatFeedback.js';
import { EFFET_DEFINITIONS } from '../src/games/effetIcons.js';

function classique(side, carte = 'kagutsuchi-flamme-originelle') {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  d.tour = side;
  if (carte === 'kagutsuchi-flamme-originelle') {
    const fiche = cardById(carte);
    const a = { id: 'kagutsuchi', carteId: carte, name: fiche.name, atk: fiche.atk, def: fiche.def, pv: fiche.def, pvMax: fiche.def,
      ready: true, attaquee: false, coupRapide: fiche.coupRapide, coupCritique: { ...fiche.coupCritique } };
    d[side].creatures.push(a);
    return { d, a };
  }
  d[side].main.push(carte);
  const resultat = rpgJouerCreature(d, side, carte);
  assert.ok(resultat.ok, JSON.stringify(resultat));
  const a = resultat.entite; a.ready = true; a.malInvocation = false;
  return { d, a };
}
function equipe(d, side, a, sabre = false) {
  if (sabre) { d[side].main.push('sabre-maudit'); assert.ok(rpgLancerMagie(d, side, 'sabre-maudit', a.id).ok); }
  d[side].main.push('lance-de-la-lune-givree');
  assert.ok(rpgJouerArme(d, side, 'lance-de-la-lune-givree', a.id).ok);
}
for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  for (const [rng, fois] of [[.149, 4], [.15, 1]]) {
    test(`${side} : critique imprimé sur une attaque directe classique (tirage ${rng})`, () => {
      const { d, a } = classique(side); rpgReglerHasard(d, () => rng);
      const pv = d[enemy].pv;
      assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, side, a.id, null).ok);
      const result = rpgResoudreAttaqueIndividuelleClassique(d, side);
      assert.ok(result.ok); assert.equal(d[enemy].pv, pv - a.atk * fois);
      assert.equal(result.resume.critiques.length, fois === 1 ? 0 : 1);
      if (fois > 1) assert.deepEqual(result.resume.critiques[0], { entiteId: a.id, carteId: a.carteId, fois });
    });
  }
  test(`${side} : PvP résout le critique après la fenêtre de réponse`, () => {
    const { d, a } = classique(side); d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; rpgReglerHasard(d, () => .1);
    const pv = d[enemy].pv;
    assert.ok(rpgPvpAppliquer(d, side, { type: 'attaquer', declarer: true, attaquants: [a.id], cibleId: null }).ok);
    assert.equal(d[enemy].pv, pv);
    const result = rpgPvpAppliquer(d, enemy, { type: 'bloquer', blocages: {} });
    assert.ok(result.ok, JSON.stringify(result)); assert.equal(d[enemy].pv, pv - a.atk * 4);
    assert.ok(d.log.some(line => /Coup critique.*4 fois/.test(line)));
  });
  for (const [rng, multiplicateur] of [[.149, 2], [.15, 1]]) {
    test(`${side} : la Lance peut critiquer directement une voie MOBA (tirage ${rng})`, () => {
      const deck = Array(30).fill('ashigaru-des-braises');
      const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
      assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
      if (d.tour !== side) rpgFinDeTour(d);
      d[side].mana.neige = 20; d[side].mana.tenebres = 20;
      d[side].main = ['ashigaru-des-braises', 'lance-de-la-lune-givree'];
      const a = rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite;
      assert.ok(a); assert.ok(rpgMobaJouerArme(d, side, 'lance-de-la-lune-givree', a.id).ok);
      a.ready = true; a.malInvocation = false; rpgReglerHasard(d, () => rng);
      const pv = mobaVoie(d.moba, 'left').hp[enemy];
      assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
      const r = rpgMobaResoudreAttaqueIndividuelle(d, side);
      assert.ok(r.ok, JSON.stringify(r)); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - 2 * multiplicateur);
      assert.equal(r.resume.critiques.length, multiplicateur === 1 ? 0 : 1);
      if (multiplicateur > 1) assert.match(rpgMobaCombatFeedback(r.resume, [a], 1).annonce, /coup critique ×2/);
    });
  }
}

test('Lance et critique imprimé se cumulent aussi contre le sorcier', () => {
  const { d, a } = classique('joueur'); equipe(d, 'joueur', a);
  assert.deepEqual(a.coupCritique, { chance: .3, fois: 4 });
  rpgReglerHasard(d, () => .2);
  const pv = d.sorcier.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.equal(d.sorcier.pv, pv - 4 * 3); assert.equal(r.resume.critiques[0].fois, 4);
});

test('le raccourci direct applique critique, bouclier et vol de vie aux dégâts réels', () => {
  const { d, a } = classique('joueur', 'chien-du-guet'); equipe(d, 'joueur', a, true);
  d.joueur.pv = 10; d.sorcier.bouclier = 2; rpgReglerHasard(d, () => .2);
  const force = a.atk * 2; const avant = d.sorcier.pv;
  const r = rpgAttaquerSorcier(d, 'joueur', a.id);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(d.sorcier.pv, avant - (force - 2));
  assert.equal(d.joueur.pv, 10 + Math.ceil((force - 2) / 2));
  assert.ok(d.log.some(line => /Coup critique/.test(line)));
});

test('le brouillard empêche une frappe directe et son jet critique', () => {
  const { d, a } = classique('joueur'); d.brouillardCombat = true;
  let jets = 0; rpgReglerHasard(d, () => { jets++; return 0; });
  const pv = d.sorcier.pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
  const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.equal(d.sorcier.pv, pv); assert.equal(jets, 0); assert.deepEqual(r.resume.critiques, []);
});

test('les descriptions incluent les attaques contre l’adversaire', () => {
  assert.match(EFFET_DEFINITIONS.coupCritique, /créature ou l’adversaire/);
  assert.match(cardById('lance-de-la-lune-givree').text, /créature ou l’adversaire/);
  assert.match(cardById('kagutsuchi-flamme-originelle').text, /créature ou l’adversaire/);
});

test('Kagutsuchi annonce son critique ×4 sur une voie MOBA', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  d.joueur.main = ['ashigaru-des-braises']; d.joueur.mana.braise = 40;
  const victime = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(victime);
  rpgFinDeTour(d); rpgFinDeTour(d);
  d.joueur.main = ['kagutsuchi-flamme-originelle']; d.joueur.mana.braise = 40;
  const pose = rpgMobaJouerCreature(d, 'joueur', 'kagutsuchi-flamme-originelle', 'left', 0, { sacrificeIds: [victime.id] });
  assert.ok(pose.ok, JSON.stringify(pose));
  const a = pose.entite; a.ready = true; a.malInvocation = false; rpgReglerHasard(d, () => .1);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, null, 'left').ok);
  const r = rpgMobaResoudreAttaqueIndividuelle(d, 'joueur');
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, 12);
  const feedback = rpgMobaCombatFeedback(r.resume, [a], 7);
  assert.deepEqual(feedback.critiques[a.id], { token: 7, fois: 4 });
  assert.match(feedback.annonce, /coup critique ×4/);
});

test('le critique contre une créature ciblée reste conditionné à la réussite de la frappe', () => {
  for (const rate of [false, true]) {
    const { d, a } = classique('joueur');
    d.sorcier.creatures.push({ id: 'cible', carteId: 'chien-du-guet', name: 'Chien', atk: 2, def: 20, pv: 20, pvMax: 20, ready: true });
    const jets = rate ? [.1] : [.2, .1]; let index = 0;
    rpgReglerHasard(d, () => jets[index++] ?? .99);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, 'cible').ok);
    const r = rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
    assert.ok(r.ok);
    assert.equal(d.sorcier.creatures[0].pv, rate ? 20 : 12);
    assert.equal(r.resume.critiques.length, rate ? 0 : 1);
  }
});
