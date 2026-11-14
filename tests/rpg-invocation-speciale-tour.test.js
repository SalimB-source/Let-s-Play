import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature, rpgFinDeTour, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce, rpgLancerMagie } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { invocationPossible, sacrificesInvocation, rpgInvocationSpecialeSurSonTour } from '../src/games/rpgInvocation.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaInvocationSpecialeDisponible, rpgMobaSacrificesInvocation, rpgMobaPeutPayer } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';
import { effetsDetailles, texteCombatIndividuel } from '../src/games/effetIcons.js';
import { rpgMobaCartePourApercu } from '../src/games/rpgMobaPresentation.js';

const cible = 'tojiro-le-pourfendeur';
const autre = (c) => c === 'joueur' ? 'sorcier' : 'joueur';
function partie(moba = false, pvp = true) {
  const deck = Array(30).fill('chien-du-guet');
  const opts = { joueurDeck: deck, sorcierDeck: deck, rng: () => .5 };
  const d = moba ? rpgMobaNouveauDuel(opts) : rpgNouveauDuel({ ...opts, pvp, modeMana: RPG_MODE_MANA_ESSAI });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  return d;
}
function preparer(moba, pvp, side) {
  const d = partie(moba, pvp);
  // Poser une victime blessée puis un Djinn chez l'adversaire et revenir au camp testé.
  if (d.tour !== side) rpgFinDeTour(d);
  d[side].main = ['gardienne-des-portes-de-sable'];
  const ami = moba ? rpgMobaJouerCreature(d, side, d[side].main[0], 'left', 0) : rpgJouerCreature(d, side, d[side].main[0]);
  assert.ok(ami.ok, JSON.stringify(ami)); ami.entite.pv--;
  rpgFinDeTour(d);
  const ennemi = autre(side); d[ennemi].main = ['djinn-du-dernier-brasier'];
  const djinn = moba ? rpgMobaJouerCreature(d, ennemi, d[ennemi].main[0], 'left', 0) : rpgJouerCreature(d, ennemi, d[ennemi].main[0]);
  assert.ok(djinn.ok, JSON.stringify(djinn)); djinn.entite.detruireFinDuTour = false;
  rpgFinDeTour(d);
  d[side].main = [cible, 'chien-du-guet'];
  return { d, ami: ami.entite, djinn: djinn.entite };
}
for (const side of ['joueur', 'sorcier']) for (const pvp of [false, true]) {
  test(`duel ${pvp ? 'PvP' : 'solo'} ${side} : spéciale à son tour sans sacrifice ni quota`, () => {
    const { d, ami } = preparer(false, pvp, side);
    d[side].invocationNormaleJouee = true;
    assert.equal(rpgInvocationSpecialeSurSonTour(d, side, cardById(cible)), true);
    assert.equal(sacrificesInvocation(cardById(cible), d, side), 0);
    assert.equal(invocationPossible(d, side, cardById(cible)), true);
    const r = pvp ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: cible }) : rpgJouerCreature(d, side, cible);
    assert.ok(r.ok, JSON.stringify(r));
    assert.ok(d[side].creatures.includes(ami));
    assert.equal(d[side].invocationNormaleJouee, true);
    assert.equal(d[side].creatures.find((e) => e.carteId === cible)?.malInvocation, true);
  });
  test(`duel ${pvp ? 'PvP' : 'solo'} ${side} : condition absente utilise l'invocation normale`, () => {
    const { d, ami } = preparer(false, pvp, side); ami.pv = ami.pvMax;
    assert.equal(rpgInvocationSpecialeSurSonTour(d, side, cardById(cible)), false);
    assert.equal(sacrificesInvocation(cardById(cible), d, side), 1);
    const r = pvp ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: cible, sacrificeIds: [ami.id] }) : rpgJouerCreature(d, side, cible, null, { sacrificeIds: [ami.id] });
    assert.ok(r.ok, JSON.stringify(r)); assert.equal(d[side].invocationNormaleJouee, true);
    assert.ok(!d[side].creatures.includes(ami));
  });
}
for (const side of ['joueur', 'sorcier']) {
  test(`MOBA ${side} : annonce et résolution de la spéciale après une pose normale`, () => {
    const { d, ami } = preparer(true, true, side);
    d.moba.creaturesJouees[side] = true;
    assert.equal(rpgMobaInvocationSpecialeDisponible(d, side, cible), true);
    assert.equal(rpgMobaSacrificesInvocation(d, side, cardById(cible)), 0);
    assert.equal(rpgMobaPeutPayer(d, side, cardById(cible)), true);
    assert.ok(rpgMobaJouerCreature(d, side, cible, 'left', 1, { ouvrirReponse: true, sacrificeIds: [] }).creatureEnAttente);
    assert.equal(d.moba.creaturesJouees[side], true);
    const result = rpgMobaPasserCreature(d, autre(side));
    assert.ok(result.ok, JSON.stringify(result)); assert.ok(d[side].creatures.includes(ami));
    assert.equal(result.entite.malInvocation, true);
  });
  test(`MOBA ${side} : condition absente conserve la pose normale avec sacrifice`, () => {
    const { d, ami } = preparer(true, true, side); ami.pv = ami.pvMax;
    assert.equal(rpgMobaInvocationSpecialeDisponible(d, side, cible), false);
    assert.equal(rpgMobaSacrificesInvocation(d, side, cardById(cible)), 1);
    const result = rpgMobaJouerCreature(d, side, cible, 'left', 0, { sacrificeIds: [ami.id] });
    assert.ok(result.ok, JSON.stringify(result)); assert.equal(d.moba.creaturesJouees[side], true);
    assert.ok(!d[side].creatures.includes(ami));
  });
}
test('la spéciale personnelle exige la phase principale et aucune réponse en cours', () => {
  const { d } = preparer(false, true, 'joueur'); const c = cardById(cible);
  d.phase = 'combat'; assert.equal(rpgInvocationSpecialeSurSonTour(d, 'joueur', c), false);
  d.phase = 'principale'; d.fenetreReponse = true; assert.equal(rpgInvocationSpecialeSurSonTour(d, 'joueur', c), false);
});
test('les fiches expliquent la pose spéciale à son tour et le repli normal', () => {
  const c = cardById(cible);
  for (const text of [effetsDetailles(c).pastilles.find((p) => p.cle === 'reactionTourAdverse').description, texteCombatIndividuel(c), rpgMobaCartePourApercu(c).text]) {
    assert.match(text, /phase principale/); assert.doesNotMatch(text, /(?:ou pendant le tour adverse|ou une fenêtre de réponse adverse)/); assert.match(text, /invocation normale/);
  }
});

for (const moba of [false, true]) {
  test(`${moba ? 'MOBA' : 'duel'} : la spéciale ne consomme pas l'invocation normale encore disponible`, () => {
    const { d } = preparer(moba, true, 'joueur');
    const special = moba
      ? rpgMobaJouerCreature(d, 'joueur', cible, 'left', 1, { sacrificeIds: [] })
      : rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: cible });
    assert.ok(special.ok, JSON.stringify(special));
    assert.equal(moba ? d.moba.creaturesJouees.joueur : d.joueur.invocationNormaleJouee, false);
    const normal = moba
      ? rpgMobaJouerCreature(d, 'joueur', 'chien-du-guet', 'right', 0)
      : rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'chien-du-guet' });
    assert.ok(normal.ok, JSON.stringify(normal));
    assert.equal(moba ? d.moba.creaturesJouees.joueur : d.joueur.invocationNormaleJouee, true);
  });
}

test('MOBA : un drapeau interne ne permet pas une spéciale sans condition', () => {
  const { d, ami } = preparer(true, true, 'joueur'); ami.pv = ami.pvMax;
  const avant = JSON.stringify(d);
  const result = rpgJouerCreature(d, 'joueur', cible, null, { invocationSpecialeMoba: true, sacrificeIds: [] });
  assert.equal(result.raison, 'condition-embuscade');
  assert.equal(JSON.stringify(d), avant);
});

test('duel : champ plein permet le repli normal avec sacrifice malgré une condition spéciale remplie', () => {
  const { d, ami } = preparer(false, true, 'joueur');
  for (let i = 0; i < 4; i++) {
    d.joueur.invocationNormaleJouee = false; d.joueur.main = ['chien-du-guet'];
    assert.ok(rpgJouerCreature(d, 'joueur', 'chien-du-guet').ok);
  }
  d.joueur.invocationNormaleJouee = false; d.joueur.main = [cible];
  assert.equal(rpgInvocationSpecialeSurSonTour(d, 'joueur', cardById(cible)), false);
  assert.equal(sacrificesInvocation(cardById(cible), d, 'joueur'), 1);
  assert.ok(rpgJouerCreature(d, 'joueur', cible, null, { sacrificeIds: [ami.id] }).ok);
  assert.equal(d.joueur.invocationNormaleJouee, true);
});


test('IA MOBA envisage une invocation spéciale à son tour sans muter le plateau', () => {
  const { d } = preparer(true, true, 'sorcier');
  d.sorcier.main = [cible]; d.moba.creaturesJouees.sorcier = true;
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirCreatureIA(d, 'sorcier');
  assert.equal(choix?.id, cible);
  assert.deepEqual(choix.sacrificeIds, []);
  assert.equal(JSON.stringify(d), avant);
});


test('IA du duel annonce puis résout sa spéciale sans consommer sa pose normale', () => {
  const { d, ami } = preparer(false, false, 'sorcier');
  d.sorcier.main = [cible]; d.sorcier.invocationNormaleJouee = true;
  const annonce = rpgSorcierAnnonceSuivante(d, () => .5);
  assert.equal(annonce?.carteId, cible);
  const result = rpgSorcierResoudreAnnonce(d);
  assert.ok(result.ok, JSON.stringify(result));
  assert.ok(d.sorcier.creatures.includes(ami));
  assert.equal(d.sorcier.invocationNormaleJouee, true);
});


test('une spéciale adverse contrée ne consomme pas son invocation normale', () => {
  const { d, ami } = preparer(false, false, 'sorcier');
  d.sorcier.main = [cible]; d.sorcier.invocationNormaleJouee = false;
  d.joueur.main = ['ecueil'];
  const annonce = rpgSorcierAnnonceSuivante(d, () => .5);
  assert.equal(annonce?.invocationSpeciale, true);
  const contre = rpgLancerMagie(d, 'joueur', 'ecueil');
  assert.ok(contre.ok && contre.contre, JSON.stringify(contre));
  assert.equal(d.sorcier.invocationNormaleJouee, false);
  assert.ok(d.sorcier.creatures.includes(ami));
});

for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  for (const fenetre of ['annonce', 'combat', 'effet', 'fin', 'aucune']) {
    test(`${moba ? 'MOBA' : 'duel'} ${side} : aucune spéciale pendant ${fenetre} adverse, même avec drapeau interne`, () => {
      const { d, ami, djinn } = preparer(moba, true, side);
      d.tour = autre(side);
      d[side].main = [cible];
      d.fenetreReponse = fenetre !== 'aucune';
      if (fenetre === 'annonce') {
        if (moba) d.mobaSortEnAttente = { cote: d.tour, carteId: 'trait-de-braise' };
        else d.annonce = { cote: d.tour, carteId: 'trait-de-braise' };
      }
      if (fenetre === 'combat') d.combatDeclare = { cote: d.tour, attaquants: [djinn.id], ciblesAttaque: {} };
      if (fenetre === 'effet') d.effetCreatureEnAttente = { cote: d.tour };
      if (fenetre === 'fin') d.finDeTour = { cote: d.tour };
      const avant = JSON.stringify(d);
      assert.equal(rpgInvocationSpecialeSurSonTour(d, side, cardById(cible)), false);
      if (moba) {
        assert.equal(rpgMobaInvocationSpecialeDisponible(d, side, cible), false);
        assert.equal(rpgMobaJouerCreature(d, side, cible, 'left', 1, { sacrificeIds: [] }).ok, false);
      } else {
        assert.equal(rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: cible }).ok, false);
      }
      assert.equal(rpgJouerCreature(d, side, cible, null, { invocationSpecialeMoba: true, sacrificeIds: [] }).ok, false);
      assert.equal(JSON.stringify(d), avant);
      assert.ok(d[side].creatures.includes(ami));
    });
  }
}

for (const moba of [false, true]) {
  test(`${moba ? 'MOBA' : 'duel'} : un effet de mort crée toujours un jeton pendant le tour adverse`, async () => {
    const { rpgMobaLancerMagie } = await import('../src/games/rpgMobaLocal.js');
    const d = partie(moba, true);
    d.joueur.main = ['momie-de-lin'];
    const pose = moba ? rpgMobaJouerCreature(d, 'joueur', 'momie-de-lin', 'left', 0)
      : rpgJouerCreature(d, 'joueur', 'momie-de-lin');
    assert.ok(pose.ok, JSON.stringify(pose));
    pose.entite.pv = 3;
    rpgFinDeTour(d);
    d.sorcier.main = ['trait-de-braise'];
    const sort = moba ? rpgMobaLancerMagie(d, 'sorcier', 'trait-de-braise', pose.entite.id)
      : rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'trait-de-braise', cibleId: pose.entite.id });
    assert.ok(sort.ok, JSON.stringify(sort));
    assert.ok(d.joueur.creatures.some((e) => e.carteId === 'shabti' && e.jeton));
    assert.equal(d.tour, 'sorcier');
  });
}

test('PvP : un contresort reste jouable pendant l’annonce adverse', () => {
  const d = partie(false, true);
  d.joueur.main = ['anqa-des-braises'];
  d.sorcier.main = ['ecueil'];
  d.annonce = { cote: 'joueur', carteId: 'anqa-des-braises' };
  d.fenetreReponse = true;
  const r = rpgPvpAppliquer(d, 'sorcier', { type: 'jouer-carte', carteId: 'ecueil' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(d.sorcier.cimetiere.includes('ecueil'));
  assert.ok(d.joueur.cimetiere.includes('anqa-des-braises'));
});

for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  test(`${moba ? 'MOBA' : 'PvP'} ${side} : une Magie Rapide reste utilisable en réponse`, async () => {
    const { rpgOuvrirFinDeTour, rpgPeutRepondre } = await import('../src/games/rpgDuel.js');
    const { rpgMobaTerminerTour, rpgMobaLancerMagie } = await import('../src/games/rpgMobaLocal.js');
    const d = partie(moba, true), actif = autre(side);
    if (d.tour !== actif) rpgFinDeTour(d);
    d[actif].main = ['chien-du-guet'];
    const cibleSort = moba ? rpgMobaJouerCreature(d, actif, 'chien-du-guet', 'left', 0)
      : rpgJouerCreature(d, actif, 'chien-du-guet');
    assert.ok(cibleSort.ok);
    d[side].main = ['trait-de-braise', 'sentinelle-des-sables'];
    assert.equal(rpgPeutRepondre(d, side), true);
    if (moba) assert.ok(rpgMobaTerminerTour(d, actif).reponse);
    else assert.ok(rpgOuvrirFinDeTour(d));
    const r = moba ? rpgMobaLancerMagie(d, side, 'trait-de-braise', cibleSort.entite.id)
      : rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: 'trait-de-braise', cibleId: cibleSort.entite.id });
    assert.ok(r.ok, JSON.stringify(r));
    assert.ok(d[side].cimetiere.includes('trait-de-braise'));
    assert.ok(d[side].main.includes('sentinelle-des-sables'));
  });
}
