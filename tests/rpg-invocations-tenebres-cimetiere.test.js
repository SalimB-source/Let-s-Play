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
const config = [
  { id: 'ouvrier-du-natron', main: ['ouvrier-du-natron', 'ecueil', 'chien-du-guet', 'momie-de-lin'], grave: [], choix: 'momie-de-lin', expectedGrave: ['momie-de-lin'], expectedExil: [] },
  { id: 'veuve-des-urnes', main: ['veuve-des-urnes', 'chien-du-guet', 'ecueil', 'contresort-des-abimes'], grave: [], choix: 'contresort-des-abimes', expectedGrave: ['contresort-des-abimes'], expectedExil: [] },
  { id: 'lecteur-du-dernier-nom', main: ['lecteur-du-dernier-nom'], grave: ['ecueil', 'chien-du-guet', 'momie-de-lin'], choix: 'momie-de-lin', expectedGrave: ['ecueil', 'chien-du-guet'], expectedExil: ['momie-de-lin'] },
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
    const graveApresArrivee = side === 'sorcier' && c.id === 'lecteur-du-dernier-nom' ? [...c.expectedGrave, 'chien-du-guet'] : c.expectedGrave;
    assert.deepEqual(d[side].cimetiere, mode === 'moba' ? c.expectedGrave : graveApresArrivee);
    assert.deepEqual(d[side].exil ?? [], c.expectedExil);
    if (mode === 'moba') {
      assert.ok(r.creatureEnAttente);
      r = rpgMobaPasserCreature(d, autre(side)); assert.ok(r.ok, JSON.stringify(r));
      assert.deepEqual(d[side].cimetiere, graveApresArrivee);
      assert.deepEqual(d[side].exil ?? [], c.expectedExil);
    }
    assert.equal(mode === 'moba' ? d.moba.creaturesJouees[side] : d[side].invocationNormaleJouee, true);
  });
}
for (const c of config) test(`${c.id}: sans coût admissible, repli normal sans mutation de cimetière`, () => {
  const d = partie(); d.joueur.main = [c.id]; d.joueur.cimetiere = ['ecueil'];
  assert.equal(rpgInvocationSpecialeSurSonTour(d, 'joueur', cardById(c.id)), false);
  if (c.id === 'lecteur-du-dernier-nom') {
    assert.equal(sacrificesInvocation(cardById(c.id), d, 'joueur'), 1);
    assert.equal(rpgJouerCreature(d, 'joueur', c.id).raison, 'sacrifice-requis');
  } else assert.ok(rpgJouerCreature(d, 'joueur', c.id).ok);
  assert.deepEqual(d.joueur.cimetiere, ['ecueil']); assert.deepEqual(d.joueur.exil ?? [], []);
});
test('une copie de la créature invoquée peut être défaussée', () => {
  const d = partie(); d.joueur.main = ['ouvrier-du-natron', 'ouvrier-du-natron'];
  assert.ok(rpgJouerCreature(d, 'joueur', 'ouvrier-du-natron', null, { choixCoutInvocation: 'ouvrier-du-natron' }).ok);
  assert.deepEqual(d.joueur.main, []); assert.deepEqual(d.joueur.cimetiere, ['ouvrier-du-natron']);
  assert.equal(Boolean(d.joueur.invocationNormaleJouee), false);
});
for (const [id, grave, ok] of [
  ['momie-de-lin', ['chien-du-guet', 'ecueil'], false],
  ['momie-de-lin', ['chien-du-guet', 'momie-de-lin'], true],
  ['gardien-des-sept-sceaux', ['chien-du-guet', 'ecueil'], false],
  ['gardien-des-sept-sceaux', ['chien-du-guet', 'ecueil', 'momie-de-lin'], true],
]) test(`${id}: condition de cimetière ${ok}`, () => {
  const d = partie(); d.joueur.main = [id]; d.joueur.cimetiere = [...grave];
  assert.equal(rpgInvocationSpecialeSurSonTour(d, 'joueur', cardById(id)), ok);
  assert.ok(rpgJouerCreature(d, 'joueur', id).ok);
  assert.equal(Boolean(d.joueur.invocationNormaleJouee), !ok);
  assert.deepEqual(d.joueur.cimetiere, grave);
});
test('MOBA : contre après annonce, coût déjà payé sans seconde défausse', () => {
  const d = partie(true); d.joueur.main = ['veuve-des-urnes', 'ecueil', 'contresort-des-abimes']; d.sorcier.main = ['ecueil'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'veuve-des-urnes', 'left', 0, { ouvrirReponse: true, choixCoutInvocation: 'contresort-des-abimes' }).creatureEnAttente);
  assert.deepEqual(d.joueur.cimetiere, ['contresort-des-abimes']);
  const r = rpgMobaLancerMagie(d, 'sorcier', 'ecueil'); assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(d.joueur.cimetiere, ['contresort-des-abimes', 'veuve-des-urnes']);
  assert.deepEqual(d.joueur.main, ['ecueil']);
  assert.equal(d.moba.creaturesJouees.joueur, false);
});
test('duel solo : une invocation contrée par IA paie son exil et pas de quota', () => {
  const d = partie(false, false); d.joueur.main = ['lecteur-du-dernier-nom']; d.joueur.cimetiere = ['chien-du-guet', 'momie-de-lin']; d.sorcier.main = ['ecueil'];
  const r = rpgJouerCreature(d, 'joueur', 'lecteur-du-dernier-nom', null, { choixCoutInvocation: 'momie-de-lin' }); assert.ok(r.ok && r.contre, JSON.stringify(r));
  assert.deepEqual(d.joueur.exil, ['momie-de-lin']); assert.deepEqual(d.joueur.cimetiere, ['chien-du-guet', 'lecteur-du-dernier-nom']);
  assert.equal(Boolean(d.joueur.invocationNormaleJouee), false);
});
for (const contrer of [false, true]) test(`IA annonce puis ${contrer ? 'est contrée' : 'résout'} la spéciale avec coût`, () => {
  const d = partie(false, false, 'sorcier'); d.sorcier.main = ['lecteur-du-dernier-nom']; d.sorcier.cimetiere = ['chien-du-guet', 'momie-de-lin']; d.joueur.main = ['ecueil'];
  const annonce = rpgSorcierAnnonceSuivante(d, () => .5); assert.equal(annonce?.invocationSpeciale, true);
  const r = contrer ? rpgLancerMagie(d, 'joueur', 'ecueil') : rpgSorcierResoudreAnnonce(d); assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(d.sorcier.exil, ['chien-du-guet']);
  assert.deepEqual(d.sorcier.cimetiere, contrer ? ['momie-de-lin', 'lecteur-du-dernier-nom'] : ['momie-de-lin', 'chien-du-guet']);
  assert.equal(Boolean(d.sorcier.invocationNormaleJouee), false);
});
for (const [id, regex] of [['ouvrier-du-natron', /Défaussez.*créature/iu], ['veuve-des-urnes', /Défaussez.*magie/iu], ['lecteur-du-dernier-nom', /Exilez.*créature.*cimetière/iu], ['momie-de-lin', /deux.*créature.*cimetière/iu], ['gardien-des-sept-sceaux', /trois.*cimetière/iu]]) test(`${id}: textes et pastilles affichent la condition`, () => {
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
    const d = partie(); d.joueur.main = [c.id]; d.joueur.cimetiere = ['ecueil']; d.joueur.invocationNormaleJouee = true;
    const avant = JSON.stringify(d); assert.equal(rpgJouerCreature(d, 'joueur', c.id).ok, false);
    assert.equal(JSON.stringify(d), avant);
  }
});
test('les effets imprimés restent intacts', () => {
  assert.equal(cardById('ouvrier-du-natron').destruction.type, 'transfert');
  assert.equal(cardById('momie-de-lin').destruction.type, 'jetons');
  assert.equal(cardById('veuve-des-urnes').tribut, 1);
  assert.equal(cardById('gardien-des-sept-sceaux').defenseur, true);
  assert.equal(cardById('lecteur-du-dernier-nom').arrivee.type, 'pioche-defausse');
});
test('le sacrifice normal qui remplit le cimetière ne transforme pas rétroactivement la pose en spéciale', () => {
  const d = partie(); d.joueur.main = ['chien-du-guet'];
  const victime = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite;
  d.joueur.invocationNormaleJouee = false; d.joueur.main = ['lecteur-du-dernier-nom']; d.joueur.cimetiere = [];
  const r = rpgJouerCreature(d, 'joueur', 'lecteur-du-dernier-nom', null, { sacrificeIds: [victime.id] });
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
  d.sorcier.main = ['veuve-des-urnes', 'ecueil', 'contresort-des-abimes'];
  d.moba.creaturesJouees.sorcier = true;
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirCreatureIA(d, 'sorcier');
  assert.equal(choix?.id, 'veuve-des-urnes'); assert.equal(JSON.stringify(d), avant);
  const pose = rpgMobaJouerCreature(d, 'sorcier', choix.id, choix.lane, choix.slot, { sacrificeIds: choix.sacrificeIds, choixCoutAuto: true, ouvrirReponse: true });
  assert.ok(pose.creatureEnAttente, JSON.stringify(pose));
  assert.deepEqual(d.sorcier.cimetiere, ['ecueil']);
  assert.ok(rpgMobaPasserCreature(d, 'joueur').ok);
  assert.deepEqual(d.sorcier.cimetiere, ['ecueil']);
});
