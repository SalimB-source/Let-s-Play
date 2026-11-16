import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgResoudreArriveeCiblee, rpgPeutAttaquer, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPlacementCoherent, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
const ID = 'serpent-des-deux-rivages';
function partie(moba, pvp) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp, rng: () => .9, joueurReserveAscension: [ID], sorcierReserveAscension: [ID] });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const side of ['joueur', 'sorcier']) { d[side].main = []; d[side].deck = []; d[side].manaChoixEnAttente = null; d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); }
  return d;
}
function poser(d, side, id, slot) {
  d.tour = side; d[side].invocationNormaleJouee = false; if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, 'left', slot) : rpgJouerCreature(d, side, id, null, { cibleDifferee: true });
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
function invoquer(d, side, pvp) {
  const cotre = poser(d, side, 'cotre-de-course', 0), hollandais = poser(d, side, 'la-vengeance-de-la-reine-anne', 1);
  const ids = [cotre.id, hollandais.id]; d[side].invocationNormaleJouee = false; if (d.moba) d.moba.creaturesJouees[side] = false;
  const r = d.moba ? rpgMobaJouerCreature(d, side, ID, 'left', 0, { sacrificeIds: ids }) : pvp ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: ID, sacrificeIds: ids, cibleDifferee: true }) : rpgJouerCreature(d, side, ID, null, { sacrificeIds: ids, cibleDifferee: true });
  assert.ok(r.ok, JSON.stringify(r)); const e = d[side].creatures.find(c => c.carteId === ID); assert.ok(e); assert.equal(d.arriveeEnAttente?.entiteId, e.id);
  const a = d.moba ? rpgMobaResoudreArrivee(d, side, e.id) : pvp ? rpgPvpAppliquer(d, side, { type: 'resoudre-arrivee', cibleId: e.id }) : rpgResoudreArriveeCiblee(d, side, e.id);
  assert.ok(a.ok, JSON.stringify(a)); return e;
}
test('fiche : Envol, Rapidité et arrivée conservée visibles dans les pastilles', () => {
  const c = cardById(ID); assert.ok(c.envol && c.rapidite); assert.equal(c.arrivee.type, 'bouclier'); assert.equal(c.arrivee.cibleSoi, true);
  assert.deepEqual(c.ascension.materiaux.map(m => m.carteId), ['cotre-de-course', 'la-vengeance-de-la-reine-anne']);
  for (const cle of ['envol', 'rapidite', 'bouclier']) assert.ok(effetsDetailles(c).pastilles.find(p => p.cle === cle)?.description, cle);
});
for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) test(`${mode} ${side} : Rapidité permet une attaque directe dès l’Ascension`, () => {
  const moba = mode === 'moba', pvp = mode === 'pvp', adv = side === 'joueur' ? 'sorcier' : 'joueur'; const d = partie(moba, pvp), serpent = invoquer(d, side, pvp);
  assert.ok(serpent.envol && serpent.rapidite && serpent.malInvocation && rpgPeutAttaquer(serpent));
  assert.equal(serpent.bouclier, 1); assert.equal(serpent.atk, 8); assert.equal(serpent.pv, 8);
  const before = moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv;
  const decl = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, side, serpent.id, null, 'left') : pvp ? rpgPvpAppliquer(d, side, { type: 'attaquer', declarer: true, attaquants: [serpent.id] }) : rpgDeclarerAttaqueIndividuelleClassique(d, side, serpent.id, null);
  assert.ok(decl.ok, JSON.stringify(decl));
  const result = moba ? rpgMobaResoudreAttaqueIndividuelle(d, side) : pvp ? rpgPvpAppliquer(d, adv, { type: 'bloquer', blocages: {} }) : rpgResoudreAttaqueIndividuelleClassique(d, side);
  assert.ok(result.ok, JSON.stringify(result)); assert.equal(moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv, before - 8); if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
for (const mode of ['classique', 'pvp', 'moba']) test(`${mode} : Envol protège contre une attaque normale au sol et permet de viser une créature volante`, () => {
  const moba = mode === 'moba', pvp = mode === 'pvp', d = partie(moba, pvp), serpent = invoquer(d, 'joueur', pvp);
  const sol = poser(d, 'sorcier', 'ashigaru-des-braises', 0), vol = poser(d, 'sorcier', 'djinn-des-ailes-de-cendre', 1);
  const choixSol = moba ? rpgMobaCiblesIndividuelles(d, 'sorcier', sol.id) : rpgCiblesIndividuellesClassique(d, 'sorcier', sol.id);
  assert.ok(!choixSol.cibles.includes(serpent.id));
  d.tour = 'joueur'; const choix = moba ? rpgMobaCiblesIndividuelles(d, 'joueur', serpent.id) : rpgCiblesIndividuellesClassique(d, 'joueur', serpent.id);
  assert.ok(choix.cibles.includes(vol.id)); assert.ok(choix.cibles.includes(sol.id));
  rpgReglerHasard(d, () => .9);
  const dec = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', serpent.id, vol.id, 'left') : pvp ? rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [serpent.id], cibleId: vol.id }) : rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', serpent.id, vol.id);
  assert.ok(dec.ok, JSON.stringify(dec));
  const res = moba ? rpgMobaResoudreAttaqueIndividuelle(d, 'joueur') : pvp ? rpgPvpAppliquer(d, 'sorcier', { type: 'bloquer', blocages: {} }) : rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(!d.sorcier.creatures.includes(vol)); assert.equal(serpent.pv, 5); if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
