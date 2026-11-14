import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, cardById, cardColors } from '../src/games/rpgCards.js';
import { rpgBlesserCreature, rpgFinDeTour, rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { MOBA_CARTES_AUTORISEES, rpgMobaJouerCreature, rpgMobaNouveauDuel, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { CARTES_COMBAT_AUDITEES } from '../src/games/rpgMobaAudit.js';
import { vivierRayon } from '../src/games/rpgBoosters.js';
import { RPG_REVELATIONS_PAR_ETAGE } from '../src/games/rpgCollection.js';
const id = 'gardienne-des-derniers-noms';
function partie(moba) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp: true, rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const s of ['joueur', 'sorcier']) { d[s].main = []; d[s].deck = []; d[s].manaChoixEnAttente = null; }
  return d;
}
function poser(d, side, slot = 0) {
  d.tour = side; d[side].invocationNormaleJouee = false; if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, slot < 2 ? 'left' : 'right', slot < 2 ? slot : slot - 2) : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}

test('la Gardienne est jouable, trouvable et les réanimations admissibles sont auditées en MOBA', () => {
  assert.ok(RPG_DUEL_CARDS.some(c => c.id === id)); assert.ok(MOBA_CARTES_AUTORISEES.includes(id));
  assert.ok(vivierRayon('souk').includes(id)); assert.ok(RPG_REVELATIONS_PAR_ETAGE['necropole-2'].includes(id));
  for (const c of RPG_DUEL_CARDS.filter(c => ['creature','hero'].includes(c.kind) && cardColors(c).includes('tenebres') && c.cost <= 2)) assert.ok(CARTES_COMBAT_AUDITEES.has(c.id), c.id);
});
for (const moba of [false, true]) for (const side of ['joueur','sorcier']) {
  test(`mort de la Gardienne : réanimation automatique pendant le tour adverse (${moba ? 'MOBA' : 'Duel'}, ${side})`, () => {
    const d = partie(moba); const e = poser(d, side); const autre = side === 'joueur' ? 'sorcier' : 'joueur';
    d[side].cimetiere = ['chacal-du-seuil', 'viking-des-neiges', 'ouvrier-du-natron', 'papyrus']; d.tour = autre;
    const quota = moba ? d.moba.creaturesJouees[side] : d[side].invocationNormaleJouee;
    rpgBlesserCreature(d, side, e.id, 10);
    assert.deepEqual(d[side].creatures.map(c => c.carteId), ['ouvrier-du-natron']);
    assert.equal(d[side].creatures[0].malInvocation, true);
    assert.equal(moba ? d.moba.creaturesJouees[side] : d[side].invocationNormaleJouee, quota);
    assert.ok(d[side].cimetiere.includes(id)); assert.ok(d[side].cimetiere.includes('chacal-du-seuil'));
    assert.match(d.log.join(' '), /cimetière/); if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`sans cible admissible la Gardienne reste au cimetière (${moba ? 'MOBA' : 'Duel'}, ${side})`, () => {
    const d = partie(moba); const e = poser(d, side); d[side].cimetiere = ['viking-des-neiges', 'souverain-de-la-lune-noire'];
    rpgBlesserCreature(d, side, e.id, 10);
    assert.equal(d[side].creatures.length, 0); assert.ok(d[side].cimetiere.includes(id));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`deux Gardiennes ne réaniment qu’une créature par tour (${moba ? 'MOBA' : 'Duel'}, ${side})`, () => {
    const d = partie(moba); const e1 = poser(d, side, 0), e2 = poser(d, side, 1);
    d[side].cimetiere = ['chacal-du-seuil', 'ouvrier-du-natron'];
    rpgBlesserCreature(d, side, e1.id, 10); rpgBlesserCreature(d, side, e2.id, 10);
    assert.deepEqual(d[side].creatures.map(e => e.carteId), ['ouvrier-du-natron']);
    assert.ok(d[side].cimetiere.includes('chacal-du-seuil'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
    rpgFinDeTour(d); assert.deepEqual(d[side].renfortsAscensionJoues, {});
  });
}
for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  test(`Veilleur des cendres invoque un renfort Braise à sa mort (${moba ? 'MOBA' : 'Duel'}, ${side})`, () => {
    const d = partie(moba); d.tour = side; d[side].main = ['veilleur-des-cendres'];
    const r = moba ? rpgMobaJouerCreature(d, side, 'veilleur-des-cendres', 'left', 0) : rpgJouerCreature(d, side, 'veilleur-des-cendres');
    assert.ok(r.ok, JSON.stringify(r)); d[side].cimetiere = ['viking-des-neiges', 'djinn-des-braises-voilees'];
    d.tour = side === 'joueur' ? 'sorcier' : 'joueur'; rpgBlesserCreature(d, side, r.entite.id, 10);
    assert.deepEqual(d[side].creatures.map(e => e.carteId), ['djinn-des-braises-voilees']);
    assert.equal(d[side].creatures[0].ready, true); assert.ok(d[side].cimetiere.includes('veilleur-des-cendres'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}
for (const moba of [false, true]) test(`sacrifice de la Gardienne réserve la case pour l'invocation normale (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = partie(moba); const e = poser(d, 'joueur');
  for (let i = 0; i < 4; i++) {
    d.joueur.main = ['viking-des-neiges']; d.joueur.invocationNormaleJouee = false; if (moba) d.moba.creaturesJouees.joueur = false;
    const r = moba ? rpgMobaJouerCreature(d, 'joueur', 'viking-des-neiges', i === 0 ? 'left' : i === 1 ? 'center' : 'right', i >= 2 ? i - 2 : i === 0 ? 1 : 0) : rpgJouerCreature(d, 'joueur', 'viking-des-neiges');
    assert.ok(r.ok, JSON.stringify(r));
  }
  d.joueur.cimetiere = ['chacal-du-seuil']; d.joueur.main = ['jarl-au-marteau-de-guerre'];
  d.joueur.invocationNormaleJouee = false; if (moba) d.moba.creaturesJouees.joueur = false;
  const r = moba ? rpgMobaJouerCreature(d, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0, { sacrificeIds: [e.id] }) : rpgJouerCreature(d, 'joueur', 'jarl-au-marteau-de-guerre', null, { sacrificeIds: [e.id] });
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(d.joueur.creatures.length, 5);
  assert.ok(d.joueur.cimetiere.includes('chacal-du-seuil')); assert.ok(d.joueur.creatures.some(c => c.carteId === 'jarl-au-marteau-de-guerre'));
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
