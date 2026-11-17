import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgJouerCreature, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce, rpgLancerMagie } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgInvocationSpecialeSurSonTour, sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaLancerMagie } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';
import { rpgMobaCartePourApercu } from '../src/games/rpgMobaPresentation.js';
import { effetsDetailles, texteCombatIndividuel } from '../src/games/effetIcons.js';

const autre = (c) => c === 'joueur' ? 'sorcier' : 'joueur';
function partie(moba = false, pvp = true, side = 'joueur') {
  const deck = Array(30).fill('chien-du-guet');
  const opts = { joueurDeck: deck, sorcierDeck: deck, rng: () => .5 };
  const d = moba ? rpgMobaNouveauDuel(opts) : rpgNouveauDuel({ ...opts, pvp, modeMana: RPG_MODE_MANA_ESSAI });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (d.tour !== side) rpgFinDeTour(d);
  return d;
}

/* Les trois créatures qui paient encore un coût pour leur Invocation spéciale :
 * la Momie exile une créature du cimetière, le Sorcier une Magie Rapide, Tojiro
 * défausse un Sabre maudit de la main. */
const config = [
  { id: 'momie-de-lin', main: ['momie-de-lin'], grave: ['chien-du-guet', 'ecueil'],
    choix: 'chien-du-guet', expectedGrave: ['ecueil'], expectedExil: ['chien-du-guet'],
    repli: { grave: ['ecueil'] } },
  { id: 'sorcier-du-ressac-noir', main: ['sorcier-du-ressac-noir'], grave: ['ecueil', 'chien-du-guet'],
    choix: 'ecueil', expectedGrave: ['chien-du-guet'], expectedExil: ['ecueil'],
    repli: { grave: ['chien-du-guet'] } },
  { id: 'tojiro-le-pourfendeur', main: ['tojiro-le-pourfendeur', 'sabre-maudit'], grave: [],
    choix: 'sabre-maudit', expectedGrave: ['sabre-maudit'], expectedExil: [],
    repli: { main: ['tojiro-le-pourfendeur'], raison: 'sacrifice-requis' } },
];

for (const side of ['joueur', 'sorcier']) for (const mode of ['solo', 'pvp', 'moba']) for (const c of config) {
  test(`${mode} ${side}: ${c.id} paie le coût une seule fois sans quota`, () => {
    const d = partie(mode === 'moba', mode !== 'solo', side);
    d[side].main = [...c.main]; d[side].cimetiere = [...c.grave];
    if (mode === 'moba') d.moba.creaturesJouees[side] = true; else d[side].invocationNormaleJouee = true;
    assert.equal(rpgInvocationSpecialeSurSonTour(d, side, cardById(c.id)), true);
    assert.equal(sacrificesInvocation(cardById(c.id), d, side, mode === 'moba'), 0);
    let r = mode === 'moba' ? rpgMobaJouerCreature(d, side, c.id, 'left', 0, { ouvrirReponse: true, choixCoutInvocation: c.choix })
      : mode === 'pvp' ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: c.id, choixCoutInvocation: c.choix })
      : rpgJouerCreature(d, side, c.id, null, { choixCoutInvocation: c.choix });
    assert.ok(r.ok, JSON.stringify(r));
    assert.deepEqual(d[side].cimetiere, c.expectedGrave);
    assert.deepEqual(d[side].exil ?? [], c.expectedExil);
    if (mode === 'moba') {
      assert.ok(r.creatureEnAttente);
      r = rpgMobaPasserCreature(d, autre(side)); assert.ok(r.ok, JSON.stringify(r));
      assert.deepEqual(d[side].cimetiere, c.expectedGrave);
      assert.deepEqual(d[side].exil ?? [], c.expectedExil);
    }
    assert.equal(mode === 'moba' ? d.moba.creaturesJouees[side] : d[side].invocationNormaleJouee, true);
  });
}

for (const c of config) test(`${c.id}: sans coût admissible, repli normal sans mutation du cimetière`, () => {
  const d = partie(); d.joueur.main = [...(c.repli.main ?? [c.id])]; d.joueur.cimetiere = [...(c.repli.grave ?? [])];
  assert.equal(rpgInvocationSpecialeSurSonTour(d, 'joueur', cardById(c.id)), false);
  const pose = rpgJouerCreature(d, 'joueur', c.id);
  if (c.repli.raison) assert.equal(pose.raison, c.repli.raison);
  else assert.ok(pose.ok, JSON.stringify(pose));
  assert.deepEqual(d.joueur.cimetiere, [...(c.repli.grave ?? [])]); assert.deepEqual(d.joueur.exil ?? [], []);
});

test('une copie de la créature invoquée ne sert pas de coût à sa jumelle', () => {
  const d = partie(); d.joueur.main = ['tojiro-le-pourfendeur', 'tojiro-le-pourfendeur', 'sabre-maudit'];
  assert.ok(rpgJouerCreature(d, 'joueur', 'tojiro-le-pourfendeur', null, { choixCoutInvocation: 'sabre-maudit' }).ok);
  assert.deepEqual(d.joueur.main, ['tojiro-le-pourfendeur']);
  assert.deepEqual(d.joueur.cimetiere, ['sabre-maudit'], 'seul le Sabre maudit part au cimetière');
});

for (const [id, grave, ok] of [
  ['momie-de-lin', ['chien-du-guet', 'ecueil'], true],
  ['momie-de-lin', ['ecueil', 'source-de-bimini'], false],
  ['garde-du-trone-givre', ['chien-du-guet', 'ecueil'], false],
  ['garde-du-trone-givre', ['viking-des-neiges', 'ecueil'], true],
]) test(`${id}: condition de cimetière ${ok}`, () => {
  const d = partie(); d.joueur.main = [id]; d.joueur.cimetiere = [...grave];
  const speciale = rpgInvocationSpecialeSurSonTour(d, 'joueur', cardById(id));
  if (id === 'garde-du-trone-givre') {
    assert.equal(speciale, ok);
    return;
  }
  assert.equal(speciale, ok);
});

test('MOBA : contre après annonce, coût déjà payé sans seconde défausse', () => {
  const d = partie(true); d.joueur.main = ['sorcier-du-ressac-noir']; d.joueur.cimetiere = ['ecueil', 'chien-du-guet']; d.sorcier.main = ['ecueil'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'sorcier-du-ressac-noir', 'left', 0, { ouvrirReponse: true, choixCoutInvocation: 'ecueil' }).creatureEnAttente);
  assert.deepEqual(d.joueur.exil, ['ecueil']);
  const r = rpgMobaLancerMagie(d, 'sorcier', 'ecueil'); assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(d.joueur.exil, ['ecueil'], 'le coût n’est pas repayé');
  assert.deepEqual(d.joueur.cimetiere, ['chien-du-guet', 'sorcier-du-ressac-noir']);
  assert.equal(d.moba.creaturesJouees.joueur, false);
});

test('duel solo : une invocation contrée par IA paie son exil et pas de quota', () => {
  const d = partie(false, false); d.joueur.main = ['momie-de-lin']; d.joueur.cimetiere = ['chien-du-guet']; d.sorcier.main = ['ecueil'];
  const r = rpgJouerCreature(d, 'joueur', 'momie-de-lin', null, { choixCoutInvocation: 'chien-du-guet' });
  assert.ok(r.ok && r.contre, JSON.stringify(r));
  assert.deepEqual(d.joueur.exil, ['chien-du-guet']);
  assert.deepEqual(d.joueur.cimetiere, ['momie-de-lin']);
  assert.equal(Boolean(d.joueur.invocationNormaleJouee), false);
});

for (const contrer of [false, true]) test(`IA annonce puis ${contrer ? 'est contrée' : 'résout'} la spéciale avec coût`, () => {
  const d = partie(false, false, 'sorcier'); d.sorcier.main = ['momie-de-lin']; d.sorcier.cimetiere = ['chien-du-guet']; d.joueur.main = ['ecueil'];
  const annonce = rpgSorcierAnnonceSuivante(d, () => .5); assert.equal(annonce?.invocationSpeciale, true);
  const r = contrer ? rpgLancerMagie(d, 'joueur', 'ecueil') : rpgSorcierResoudreAnnonce(d); assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(d.sorcier.exil, ['chien-du-guet']);
  assert.equal(Boolean(d.sorcier.invocationNormaleJouee), false);
});

for (const [id, regex] of [
  ['momie-de-lin', /Exilez.*créature.*cimetière/iu],
  ['sorcier-du-ressac-noir', /Exilez.*Magie Rapide/iu],
  ['tojiro-le-pourfendeur', /Défaussez.*Sabre maudit/iu],
]) test(`${id}: textes et pastilles affichent la condition`, () => {
  const c = cardById(id);
  for (const texte of [effetsDetailles(c).pastilles.find((p) => p.cle === 'reactionTourAdverse').description, texteCombatIndividuel(c), rpgMobaCartePourApercu(c).text]) assert.match(texte, regex);
});

test('MOBA : un emplacement invalide ne paie ni défausse ni exil', () => {
  for (const c of config) {
    const d = partie(true); d.joueur.main = [...c.main]; d.joueur.cimetiere = [...c.grave];
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaJouerCreature(d, 'joueur', c.id, 'left', 99, { ouvrirReponse: true }).ok, false);
    assert.equal(JSON.stringify(d), avant);
  }
});

test('avec quota normal épuisé et coût indisponible, aucune carte ne bouge', () => {
  for (const c of config) {
    const d = partie(); d.joueur.main = [...(c.repli.main ?? [c.id])]; d.joueur.cimetiere = [...(c.repli.grave ?? [])];
    d.joueur.invocationNormaleJouee = true;
    const avant = JSON.stringify(d); assert.equal(rpgJouerCreature(d, 'joueur', c.id).ok, false);
    assert.equal(JSON.stringify(d), avant);
  }
});

test('les effets imprimés restent intacts', () => {
  assert.equal(cardById('momie-de-lin').destruction.type, 'jetons');
  assert.equal(cardById('sorcier-du-ressac-noir').contreAnnonceCreature, true);
  assert.equal(cardById('tojiro-le-pourfendeur').contreAttaque, true);
  assert.equal(cardById('tojiro-le-pourfendeur').esquive, true);
});

test('le sacrifice normal qui remplit le cimetière ne transforme pas rétroactivement la pose en spéciale', () => {
  const d = partie(); d.joueur.main = ['chien-du-guet'];
  const victime = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite;
  d.joueur.invocationNormaleJouee = false; d.joueur.main = ['tojiro-le-pourfendeur']; d.joueur.cimetiere = [];
  const r = rpgJouerCreature(d, 'joueur', 'tojiro-le-pourfendeur', null, { sacrificeIds: [victime.id] });
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(d.joueur.invocationNormaleJouee, true);
  assert.deepEqual(d.joueur.cimetiere, ['chien-du-guet']); assert.deepEqual(d.joueur.exil ?? [], []);
});

for (const mode of ['solo', 'pvp', 'moba']) for (const c of config) test(`${mode} : choix absent ou illégal refusé sans mutation pour ${c.id}`, () => {
  for (const choix of [null, 'papyrus', 'introuvable']) {
    const d = partie(mode === 'moba', mode !== 'solo'); d.joueur.main = [...c.main]; d.joueur.cimetiere = [...c.grave];
    const avant = JSON.stringify(d);
    const result = mode === 'moba' ? rpgMobaJouerCreature(d, 'joueur', c.id, 'left', 0, { choixCoutInvocation: choix })
      : mode === 'pvp' ? rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: c.id, choixCoutInvocation: choix })
      : rpgJouerCreature(d, 'joueur', c.id, null, { choixCoutInvocation: choix });
    assert.equal(result.ok, false); assert.equal(result.raison, choix === null ? 'choix-cout-requis' : 'choix-cout-invalide');
    assert.equal(JSON.stringify(d), avant);
  }
});

test('IA MOBA simule puis paie son propre choix sans modifier la partie pendant la simulation', () => {
  const d = partie(true, true, 'sorcier');
  d.sorcier.main = ['sorcier-du-ressac-noir'];
  d.sorcier.cimetiere = ['ecueil', 'chien-du-guet'];
  d.moba.creaturesJouees.sorcier = true;
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirCreatureIA(d, 'sorcier');
  assert.equal(choix?.id, 'sorcier-du-ressac-noir'); assert.equal(JSON.stringify(d), avant);
  const pose = rpgMobaJouerCreature(d, 'sorcier', choix.id, choix.lane, choix.slot, { sacrificeIds: choix.sacrificeIds, choixCoutAuto: true, ouvrirReponse: true });
  assert.ok(pose.creatureEnAttente, JSON.stringify(pose));
  assert.deepEqual(d.sorcier.exil, ['ecueil']);
  assert.ok(rpgMobaPasserCreature(d, 'joueur').ok);
  assert.deepEqual(d.sorcier.exil, ['ecueil'], 'le coût n’est payé qu’une fois');
});
