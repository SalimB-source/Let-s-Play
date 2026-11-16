import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique, rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
const ID = 'samourai-du-dragon-rouge';
function partie(moba, pvp = false) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp, rng: () => .5, joueurReserveAscension: [ID], sorcierReserveAscension: [ID] });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const side of ['joueur', 'sorcier']) { d[side].main = []; d[side].deck = []; d[side].manaChoixEnAttente = null; d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); }
  return d;
}
function poser(d, side, id, slot = 0) {
  d.tour = side; d[side].invocationNormaleJouee = false; if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, 'left', slot) : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
function dragon(d, side, pvp = false) {
  const ronin = poser(d, side, 'ronin-du-soleil-rouge', 0), onna = poser(d, side, 'onna-musha-des-cendres', 1);
  d[side].invocationNormaleJouee = false; if (d.moba) d.moba.creaturesJouees[side] = false;
  const ids = [ronin.id, onna.id];
  const r = d.moba ? rpgMobaJouerCreature(d, side, ID, 'left', 0, { sacrificeIds: ids })
    : pvp ? rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: ID, sacrificeIds: ids })
      : rpgJouerCreature(d, side, ID, null, { sacrificeIds: ids });
  assert.ok(r.ok, JSON.stringify(r));
  const e = d[side].creatures.find(c => c.carteId === ID); assert.ok(e); e.ready = true; e.malInvocation = false; return e;
}
test('fiche : Défenseur conservé, Coup critique et autres capacités visibles', () => {
  const c = cardById(ID); assert.equal(c.defenseur, true); assert.ok(c.esquive && c.contreAttaque);
  assert.deepEqual(c.coupCritique, { chance: .15, fois: 2 });
  const pastilles = effetsDetailles(c).pastilles; for (const cle of ['coupCritique', 'defenseur', 'esquive', 'contreAttaque']) assert.ok(pastilles.find(p => p.cle === cle)?.description);
});
for (const mode of ['classique', 'pvp', 'moba']) for (const side of ['joueur', 'sorcier']) for (const jet of [.149, .15]) test(`Dragon ${mode} ${side} : critique direct au seuil ${jet}`, () => {
  const moba = mode === 'moba', pvp = mode === 'pvp', adv = side === 'joueur' ? 'sorcier' : 'joueur';
  const d = partie(moba, pvp), a = dragon(d, side, pvp); assert.deepEqual(a.coupCritique, { chance: .15, fois: 2 });
  const before = moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv; rpgReglerHasard(d, () => jet);
  const decl = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left') : pvp ? rpgPvpAppliquer(d, side, { type: 'attaquer', declarer: true, attaquants: [a.id] }) : rpgDeclarerAttaqueIndividuelleClassique(d, side, a.id, null);
  assert.ok(decl.ok, JSON.stringify(decl));
  const r = moba ? rpgMobaResoudreAttaqueIndividuelle(d, side) : pvp ? rpgPvpAppliquer(d, adv, { type: 'bloquer', blocages: {} }) : rpgResoudreAttaqueIndividuelleClassique(d, side);
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(moba ? mobaVoie(d.moba, 'left').hp[adv] : d[adv].pv, before - (jet < .15 ? 14 : 7));
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
for (const mode of ['classique', 'pvp', 'moba']) test(`Dragon ${mode} : Défenseur prioritaire et critique en riposte`, () => {
  const moba = mode === 'moba', pvp = mode === 'pvp', d = partie(moba, pvp), gardien = dragon(d, 'joueur', pvp);
  const allie = poser(d, 'joueur', 'chacal-du-seuil', 1), ennemi = poser(d, 'sorcier', 'chacal-du-seuil', 0);
  ennemi.ready = true; ennemi.malInvocation = false; ennemi.pv = ennemi.pvMax = ennemi.def = 20;
  const choix = moba ? rpgMobaCiblesIndividuelles(d, 'sorcier', ennemi.id) : rpgCiblesIndividuellesClassique(d, 'sorcier', ennemi.id);
  assert.deepEqual(choix, { cibles: [gardien.id], directe: false });
  const jets = [.1, .9]; rpgReglerHasard(d, () => jets.shift() ?? .9);
  const dec = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'sorcier', ennemi.id, gardien.id, 'left') : pvp ? rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [ennemi.id], cibleId: gardien.id }) : rpgDeclarerAttaqueIndividuelleClassique(d, 'sorcier', ennemi.id, gardien.id);
  assert.ok(dec.ok, JSON.stringify(dec));
  const res = moba ? rpgMobaResoudreAttaqueIndividuelle(d, 'sorcier') : pvp ? rpgPvpAppliquer(d, 'joueur', { type: 'bloquer', blocages: {} }) : rpgResoudreAttaqueIndividuelleClassique(d, 'sorcier');
  assert.ok(res.ok, JSON.stringify(res)); assert.equal(ennemi.pv, 6); assert.equal(gardien.pv, 5); assert.equal(allie.pv, 1);
});
for (const mode of ['classique', 'pvp', 'moba']) test(`Dragon ${mode} : coup critique en attaquant une créature`, () => {
  const moba = mode === 'moba', pvp = mode === 'pvp', d = partie(moba, pvp), attaquant = dragon(d, 'joueur', pvp);
  const cible = poser(d, 'sorcier', 'chacal-du-seuil'); cible.pv = cible.pvMax = cible.def = 20; d.tour = 'joueur';
  const jets = [.1, .9]; rpgReglerHasard(d, () => jets.shift() ?? .9);
  const dec = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', attaquant.id, cible.id, 'left') : pvp ? rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [attaquant.id], cibleId: cible.id }) : rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', attaquant.id, cible.id);
  assert.ok(dec.ok, JSON.stringify(dec));
  const res = moba ? rpgMobaResoudreAttaqueIndividuelle(d, 'joueur') : pvp ? rpgPvpAppliquer(d, 'sorcier', { type: 'bloquer', blocages: {} }) : rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
  assert.ok(res.ok, JSON.stringify(res)); assert.equal(cible.pv, 6); assert.equal(attaquant.pv, 5);
});
