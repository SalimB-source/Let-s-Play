import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardById } from '../src/games/rpgCards.js';
import { rpgActiverCapacite, rpgActiverEffetReponse, rpgNouveauDuel, rpgRenvoisEnMain, rpgResoudreEffetCreatureEnAttente } from '../src/games/rpgDuel.js';
import { rpgPvpVue } from '../src/games/rpgPvp.js';
import { rpgMobaProjectiles, rpgMobaSignatures } from '../src/games/rpgMobaCinematiques.js';

function scene() { return rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .99 }); }
function poser(d, cote, carteId, emplacement = 0) {
  const carte = cardById(carteId);
  const entite = { id: `${cote}-${carteId}`, carteId, name: carte.name, atk: carte.atk, def: 10, pv: 10, pvMax: 10,
    ready: true, malInvocation: false, attaquee: false, emplacement };
  d[cote].creatures.push(entite);
  return entite;
}
const nouveaux = (d, type) => (d.combatAnimations ?? []).filter((e) => e.type === type);

test('Éclair du marteau : le Berserk émet la foudre et garde sa cible après sérialisation', () => {
  const d = scene(), source = poser(d, 'joueur', 'berserk-des-trois-hivers'), cible = poser(d, 'sorcier', 'chien-du-guet');
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, cible.id).ok, true);
  assert.equal(cible.pv, 7);
  const [foudre] = nouveaux(d, 'foudre-activation');
  assert.deepEqual(foudre.cibles, [cible.id]);
  assert.deepEqual(JSON.parse(JSON.stringify(d)).combatAnimations.find(e => e.id === foudre.id), foudre);
});

test('une réponse contrée ne déclenche pas l’animation de foudre, une réponse passée oui', () => {
  for (const contre of [true, false]) {
    const d = scene(); d.pvp = true;
    const source = poser(d, 'joueur', 'berserk-des-trois-hivers'), cible = poser(d, 'sorcier', 'chien-du-guet');
    const vipere = poser(d, 'sorcier', 'vipere-de-verre', 1);
    assert.equal(rpgActiverCapacite(d, 'joueur', source.id, cible.id).effetEnAttente, true);
    assert.equal(nouveaux(d, 'foudre-activation').length, 0, 'pas de foudre à la seule annonce');
    const res = contre ? rpgActiverEffetReponse(d, 'sorcier', vipere.id) : rpgResoudreEffetCreatureEnAttente(d, 'sorcier');
    assert.equal(res.ok, true); assert.equal(nouveaux(d, 'foudre-activation').length, contre ? 0 : 1);
    const contres = nouveaux(d, 'projectile-combat').filter(e => e.variante === 'contre');
    assert.equal(contres.length, contre ? 1 : 0);
    if (contre) assert.deepEqual(contres[0].cible, { type: 'creature', cote: 'joueur', entiteId: source.id });
    assert.equal(cible.pv, contre ? 10 : 7);
  }
});

test('la Tempête du Père trace les éclairs seulement dans la colonne choisie', () => {
  const d = scene(), source = poser(d, 'joueur', 'pere-des-corbeaux', 0);
  const cible = poser(d, 'sorcier', 'chien-du-guet', 0), loin = poser(d, 'sorcier', 'garde-du-voile', 2);
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'colonne', colonne: 0 } }).ok, true);
  const [fx] = nouveaux(d, 'foudre-activation'); assert.ok(fx);
  assert.deepEqual(new Set(fx.cibles), new Set([source.id, cible.id])); assert.ok(!fx.cibles.includes(loin.id));
});

test('renvoi en main : un tourbillon et une sortie sérialisable, sans fausse mort', () => {
  const d = scene(), source = poser(d, 'joueur', 'sonneur-fele'), cible = poser(d, 'sorcier', 'chien-du-guet');
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, cible.id).ok, true);
  assert.ok(d.sorcier.main.includes(cible.carteId)); assert.ok(!d.sorcier.cimetiere.includes(cible.carteId));
  assert.ok(nouveaux(d, 'projectile-combat').some(e => e.variante === 'renvoi' && e.cible.entiteId === cible.id));
  assert.equal(rpgRenvoisEnMain(d)[0].entityId, cible.id);
  assert.equal(JSON.parse(JSON.stringify(d)).combatAnimations.find(e => e.type === 'renvoi-main').entiteId, cible.id);
});

test('le PvP inverse les camps des projectiles vers les sorciers sans changer les identifiants', () => {
  const d = scene(), source = poser(d, 'joueur', 'scribe-de-la-liste'); d.joueur.deck = ['chien-du-guet'];
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, null).ok, true);
  const original = nouveaux(d, 'projectile-combat').find(e => e.variante === 'plume'); assert.ok(original);
  const inverse = rpgPvpVue(d, 'sorcier').combatAnimations.find(e => e.id === original.id);
  assert.equal(inverse.source.cote, 'sorcier'); assert.equal(inverse.cible.cote, 'sorcier');
  assert.equal(inverse.source.entiteId, source.id); assert.equal(original.source.cote, 'joueur');
});

test('en Conquête les tirs ciblent les PV de voie et les éclairs utilisent les positions avant résolution', () => {
  const rect = (left, top) => ({ left, top, width: 20, height: 20 });
  const avant = { animationSeq: 0, cartes: [{ entityId: 'source', laneId: 'left', side: 'joueur', slot: 0 }, { entityId: 'cible', laneId: 'left', side: 'sorcier', slot: 0 }],
    positions: { cases: { 'left:joueur:0': rect(0, 100), 'left:sorcier:0': rect(0, 0) }, voies: { '@moba:left:joueur': rect(100, 100) } } };
  const d = { moba: { lanes: [{ id: 'left', active: true, slots: { joueur: ['source'], sorcier: [] } }] }, combatAnimations: [
    { id: 1, type: 'projectile-combat', variante: 'plume', source: { entiteId: 'source' }, cible: { type: 'sorcier', cote: 'joueur' } },
    { id: 2, type: 'foudre-activation', cibles: ['cible'] },
  ] };
  const [tir] = rpgMobaProjectiles(avant, d); assert.equal(tir.dx, 100); assert.equal(tir.dy, 0);
  const [foudre] = rpgMobaSignatures(avant, d, []); assert.equal(foudre.type, 'foudre'); assert.equal(foudre.entityId, 'cible');
});

test('le passage d’une réponse en duel relève le champ avant la résolution', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const passage = page.slice(page.indexOf('const passerEffetCreature = () =>'), page.indexOf('const contrerEffetCreature = (id) =>'));
  assert.match(passage, /prendreInstantaneChamp\(\)/); assert.match(passage, /animerModificationsChamp\(champAvantAction/);
});


test('les effets activés conservent une signature visuelle adaptée à leur action', () => {
  for (const [sourceId, type, cibleAlliee] of [
    ['guetteuse-des-marees', 'egide', true],
    ['gardienne-des-portes-de-sable', 'renfort', true],
    ['la-devoreuse', 'ruine', false],
    ['porteuse-de-cruches', 'ombre', false],
    ['chasseuse-de-braise', 'feu', false],
  ]) {
    const d = scene();
    const source = poser(d, 'joueur', sourceId);
    const cible = poser(d, cibleAlliee ? 'joueur' : 'sorcier', 'chien-du-guet', 1);
    if (type === 'soin') cible.pv = 5;
    const res = rpgActiverCapacite(d, 'joueur', source.id, cible.id);
    assert.equal(res.ok, true, `${sourceId} : ${JSON.stringify(res)}`);
    assert.ok(nouveaux(d, 'projectile-combat').some(e => e.variante === type && e.cible.entiteId === cible.id), sourceId);
  }
});


test('un soin de sorcier émet un projectile vers son portrait', () => {
  const d = scene(), source = poser(d, 'joueur', 'volva-soigneuse');
  assert.equal(rpgActiverCapacite(d, 'joueur', source.id, null).ok, true);
  assert.ok(nouveaux(d, 'projectile-combat').some(e => e.variante === 'soin' && e.cible.type === 'sorcier' && e.cible.cote === 'joueur'));
});
