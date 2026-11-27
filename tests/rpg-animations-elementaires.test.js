import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardById } from '../src/games/rpgCards.js';
import { rpgActiverCapacite, rpgActionsEtat, rpgBlesserCreature, rpgBlessuresDepuis, rpgExils, rpgNouveauDuel, rpgResoudreArriveeCiblee } from '../src/games/rpgDuel.js';
import { rpgPvpVue } from '../src/games/rpgPvp.js';
import { blessuresVisuelles } from '../src/games/rpgAnimationsElementaires.js';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';
import { mobaPlacer } from '../src/games/rpgMoba.js';
import { rpgMobaSignatures } from '../src/games/rpgMobaCinematiques.js';
import { rpgMobaSorties } from '../src/games/rpgMobaSorties.js';

const deck = Array(12).fill('chien-du-guet');
function scene(moba = false, pvp = true) {
  return (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: deck, sorcierDeck: deck, pvp, rng: () => .99 });
}
function poser(d, cote, carteId, emplacement = 0, lane = 'left') {
  const c = cardById(carteId), e = { id: `${cote}-${carteId}-${emplacement}`, carteId, name: c.name, atk: c.atk, def: 10, pv: 10, pvMax: 10, emplacement, ready: true, malInvocation: false, ...(d.moba ? { mobaLane: lane } : {}) };
  d[cote].creatures.push(e);
  if (d.moba) assert.ok(mobaPlacer(d.moba, cote, lane, emplacement, e.id).ok);
  return e;
}

for (const [element, carteId] of [['braise', 'chasseuse-de-braise'], ['sable', 'faucon-du-zenith']]) {
  test(`la ${element} blessante est visible en PvP après sérialisation et inversion`, () => {
    const d = scene(), cible = poser(d, 'sorcier', 'chien-du-guet');
    assert.ok(rpgBlesserCreature(d, 'sorcier', cible.id, 3, element, null, 'effet-creature', carteId).ok);
    const local = rpgBlessuresDepuis(d); const evenements = d.combatAnimations;
    const serial = evenements.find(e => e.type === 'blessure-elementaire'); assert.ok(serial);
    assert.deepEqual(serial.elements, [element]); assert.equal(serial.pvApres, 7);
    assert.equal(blessuresVisuelles(local, evenements).length, 1, 'aucun doublon local');
    const vue = JSON.parse(JSON.stringify(rpgPvpVue(d, 'sorcier')));
    const distance = blessuresVisuelles([], vue.combatAnimations);
    assert.equal(distance.length, 1); assert.equal(distance[0].cote, 'joueur');
    assert.equal(distance[0].entityId, cible.id);
    assert.deepEqual(blessuresVisuelles([], vue.combatAnimations, new Set([serial.id])), [], 'un ancien coup ne se rejoue pas');
  });
}

test('une protection empêche les faux impacts élémentaires', () => {
  const d = scene(), cible = poser(d, 'sorcier', 'chien-du-guet'); cible.protectionSorts = true;
  const r = rpgBlesserCreature(d, 'sorcier', cible.id, 3, 'braise', null, 'effet-creature', 'chasseuse-de-braise');
  assert.equal(r.recus, 0); assert.equal(rpgBlessuresDepuis(d).length, 0);
  assert.ok(!(d.combatAnimations ?? []).some(e => e.type === 'blessure-elementaire'));
});

test('Le Grand Hiver activé conserve la roue de feu sur les victimes de la vague simultanée', () => {
  const d = scene(), source = poser(d, 'joueur', 'kagutsuchi-flamme-originelle', 7);
  const allie = poser(d, 'joueur', 'chien-du-guet', 0), cible = poser(d, 'sorcier', 'chien-du-guet');
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'colonne', colonne: 0 } }).ok);
  const touches = rpgBlessuresDepuis(d).filter(b => b.elements.includes('braise'));
  assert.ok(touches.some(b => b.entityId === allie.id)); assert.ok(touches.some(b => b.entityId === cible.id));
  assert.ok(touches.every(b => b.sourceCarteId === source.carteId));
  const vue = rpgPvpVue(d, 'sorcier');
  assert.ok(vue.combatAnimations.some(e => e.type === 'blessure-elementaire' && e.entityId === cible.id));
});

test('la Tempête de sable activée ne signe que les victimes de la rangée choisie', () => {
  const d = scene(), source = poser(d, 'joueur', 'faucon-du-zenith', 7);
  const cible = poser(d, 'sorcier', 'chien-du-guet', 0), loin = poser(d, 'sorcier', 'garde-du-voile', 6);
  assert.ok(rpgActiverCapacite(d, 'joueur', source.id, null, { zone: { forme: 'rangee', camp: 'sorcier', ligne: 'front' } }).ok);
  const touches = rpgBlessuresDepuis(d).filter(b => b.elements.includes('sable'));
  assert.ok(touches.some(b => b.entityId === cible.id)); assert.ok(!touches.some(b => b.entityId === loin.id));
});

test('en Conquête, feu et sable apparaissent à la case réelle des blessures, même mortelles', () => {
  const d = scene(true, false), cible = poser(d, 'sorcier', 'chien-du-guet');
  const avant = { animationSeq: 0, cartes: [{ entityId: cible.id, laneId: 'left', side: 'sorcier', slot: 0 }], positions: { cases: { 'left:sorcier:0': { left: 25, top: 35, width: 20, height: 30 } } } };
  assert.ok(rpgBlesserCreature(d, 'sorcier', cible.id, 10, ['braise', 'sable'], null, 'effet-creature', 'source').ok);
  const fx = rpgMobaSignatures(avant, d, rpgBlessuresDepuis(d));
  assert.deepEqual(fx.map(e => [e.type, e.entityId, e.left]), [['feu', cible.id, 25], ['sable', cible.id, 25]]);
});

for (const moba of [false, true]) test(`l’exil de mort de la Valkyrie joue sa sortie blanche (${moba ? 'Conquête' : 'PvP'})`, () => {
  const d = scene(moba), e = poser(d, 'joueur', 'valkyrie-de-la-derniere-aurore');
  d.joueur.cimetiere = ['viking-des-neiges']; const avant = { renvois: 0, exils: 0, cartes: [{ entityId: e.id, side: 'joueur', laneId: 'left', slot: 0 }] };
  e.pv = 0; rpgActionsEtat(d); assert.deepEqual(d.joueur.exil, [e.carteId]);
  assert.ok(rpgExils(d).some(x => x.entityId === e.id));
  if (moba) assert.deepEqual(rpgMobaSorties(avant, [], rpgExils(d), d).map(x => x.variante), ['exil']);
  else {
    const vue = JSON.parse(JSON.stringify(rpgPvpVue(d, 'sorcier')));
    const fx = vue.combatAnimations.find(x => x.type === 'exil'); assert.equal(fx.entiteId, e.id); assert.equal(fx.cote, 'sorcier');
  }
});

test('les sorties et les impacts ne capturent pas les clics et respectent le mouvement réduit', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-projectile-combat\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.rpg-projectile-combat--exil/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*?\.rpg-projectile-combat\s*\{\s*display:\s*none/);
  assert.match(page, /blessuresVisuelles\(/); assert.match(page, /animation\.type === 'exil'/);
});


for (const moba of [false, true]) test(`l’arrivée du Père produit une vraie sortie d’exil (${moba ? 'Conquête' : 'PvP'})`, () => {
  const d = scene(moba), source = poser(d, 'joueur', 'pere-des-corbeaux');
  const cible = poser(d, 'sorcier', 'chien-du-guet'); d.sorcier.main = [];
  d.arriveeEnAttente = { cote: 'joueur', entiteId: source.id, carteId: source.carteId };
  const avant = { renvois: 0, exils: 0, cartes: [{ entityId: cible.id, side: 'sorcier', laneId: 'left', slot: 0 }] };
  const res = rpgResoudreArriveeCiblee(d, 'joueur', cible.id);
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(!res.effetEnAttente);
  assert.ok(d.sorcier.exil.includes(cible.carteId)); assert.ok(!d.sorcier.cimetiere.includes(cible.carteId));
  const sortie = rpgExils(d).find(e => e.entityId === cible.id); assert.equal(sortie.sourceCarteId, source.carteId);
  if (moba) assert.equal(rpgMobaSorties(avant, [], rpgExils(d), d)[0]?.variante, 'exil');
  else assert.equal(rpgPvpVue(d, 'sorcier').combatAnimations.find(e => e.type === 'exil')?.entiteId, cible.id);
});


test('une parade intercepte le feu sans inventer de blessure visuelle', () => {
  const d = scene(), source = poser(d, 'joueur', 'chasseuse-de-braise');
  const cible = poser(d, 'sorcier', 'chien-du-guet'); cible.bouclier = 1;
  const res = rpgActiverCapacite(d, 'joueur', source.id, cible.id);
  assert.ok(res.ok); assert.equal(cible.pv, 10);
  assert.ok(!rpgBlessuresDepuis(d).some(b => b.entityId === cible.id));
  assert.ok(!(d.combatAnimations ?? []).some(e => e.type === 'blessure-elementaire'));
});
