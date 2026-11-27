import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { texteApercuSansDoublons } from '../src/games/rpgCardResume.js';
import { rpgMobaCartePourApercu } from '../src/games/rpgMobaPresentation.js';
import { rpgActionsEtat, rpgBlesserCreature, rpgCartesRenfortChoisi, rpgNouveauDuel, rpgNombreDestructions, rpgResoudreEchangeIndividuelMoba, rpgResoudreRenfortChoisi, rpgSacrifierCreature } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaResoudreRecherche, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { mobaPlacer } from '../src/games/rpgMoba.js';

const ID = 'valkyrie-de-la-derniere-aurore';
function scene(moba, cote = 'joueur') {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(12).fill('chien-du-guet'), sorcierDeck: Array(12).fill('chien-du-guet'), pvp: true, modeMana: 'essai', rng: () => .99 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true; d.tour = cote;
  const e = { id: 'valk', carteId: ID, name: cardById(ID).name, atk: 4, def: 5, pv: 5, pvMax: 5, emplacement: 0, ready: true, malInvocation: false, ...(moba ? { mobaLane: 'left' } : {}) };
  d[cote].creatures.push(e);
  if (moba) assert.ok(mobaPlacer(d.moba, cote, 'left', 0, e.id).ok);
  d[cote].cimetiere = ['viking-des-neiges'];
  return { d, e };
}

test('la ligne d’exil est visible dans les aperçus duel et Conquête', () => {
  const carte = cardById(ID); assert.equal(carte.exileeALaMort, true);
  for (const vue of [carte, rpgMobaCartePourApercu(carte)]) {
    assert.match(vue.text, /Elle est exilée quand elle meurt\./);
    assert.match(texteApercuSansDoublons(effetsDetailles(vue)), /Elle est exilée quand elle meurt\./);
  }
});

for (const moba of [false, true]) for (const cote of ['joueur', 'sorcier']) for (const methode of ['degats', 'etat', 'sacrifice']) {
  test(`la Valkyrie meurt et s’exile avant son choix (${moba ? 'Conquête' : 'PvP'}, ${cote}, ${methode})`, () => {
    const { d, e } = scene(moba, cote); const avant = rpgNombreDestructions(d);
    if (methode === 'degats') assert.ok(rpgBlesserCreature(d, cote, e.id, 10).ok);
    if (methode === 'etat') { e.pv = 0; rpgActionsEtat(d); }
    if (methode === 'sacrifice') assert.ok(rpgSacrifierCreature(d, cote, e.id).ok);
    assert.equal(rpgNombreDestructions(d), avant + 1, 'une vraie mort');
    assert.deepEqual(d[cote].exil, [ID]); assert.ok(!d[cote].cimetiere.includes(ID));
    assert.ok(!d[cote].creatures.some(x => x.id === e.id));
    const attente = d.mobaRechercheEnAttente ?? d.renfortChoixEnAttente;
    assert.equal(attente?.sourceCarteId, ID); assert.equal(attente?.origine, 'destruction');
    const choix = rpgCartesRenfortChoisi(d, cote);
    assert.ok(choix.some(x => x.id === 'viking-des-neiges' && x.admissible));
    assert.ok(!choix.some(x => x.id === ID));
    assert.equal(JSON.parse(JSON.stringify(d))[cote].exil[0], ID);
    const viking = choix.find(x => x.id === 'viking-des-neiges' && x.admissible);
    const retour = moba ? rpgMobaResoudreRecherche(d, cote, viking.id, viking.index) : rpgResoudreRenfortChoisi(d, cote, viking.index);
    assert.ok(retour.ok, JSON.stringify(retour));
    assert.ok(d[cote].creatures.some(x => x.carteId === 'viking-des-neiges'));
    assert.deepEqual(d[cote].exil, [ID]);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}

test('le combat simultané exile la Valkyrie et conserve son déclenchement de mort', () => {
  const { d, e } = scene(true, 'sorcier');
  const attaquant = { id: 'attaque', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 8, def: 10, pv: 10, pvMax: 10, mobaLane: 'left' };
  d.joueur.creatures.push(attaquant); assert.ok(mobaPlacer(d.moba, 'joueur', 'left', 0, attaquant.id).ok);
  const res = rpgResoudreEchangeIndividuelMoba(d, 'joueur', attaquant.id, e.id, false, { resoudreDegatsDirects: () => ({ recus: 0 }) });
  assert.ok(res.ok, JSON.stringify(res)); assert.deepEqual(d.sorcier.exil, [ID]);
  assert.ok(!d.sorcier.cimetiere.includes(ID));
  assert.equal((d.mobaRechercheEnAttente ?? d.renfortChoixEnAttente)?.sourceCarteId, ID);
  assert.ok(rpgCartesRenfortChoisi(d, 'sorcier').some(x => x.id === 'viking-des-neiges'));
});

test('une autre carte Valkyrie déjà au cimetière reste distincte de la défunte', () => {
  const { d, e } = scene(false); d.joueur.cimetiere.push(ID);
  e.pv = 0; rpgActionsEtat(d);
  assert.deepEqual(d.joueur.exil, [ID]);
  const autre = rpgCartesRenfortChoisi(d, 'joueur').find(x => x.id === ID && x.admissible);
  assert.ok(autre); assert.ok(rpgResoudreRenfortChoisi(d, 'joueur', autre.index).ok);
  assert.equal(d.joueur.creatures.filter(x => x.carteId === ID).length, 1);
  assert.deepEqual(d.joueur.exil, [ID]);
});


test('sans autre Viking au cimetière, elle ne peut pas être sa propre cible', () => {
  const { d, e } = scene(false); d.joueur.cimetiere = [];
  e.pv = 0; rpgActionsEtat(d);
  assert.deepEqual(d.joueur.exil, [ID]); assert.deepEqual(d.joueur.cimetiere, []);
  assert.ok(!rpgCartesRenfortChoisi(d, 'joueur').some(x => x.admissible));
  assert.ok(!d.joueur.creatures.some(x => x.carteId === ID));
});
