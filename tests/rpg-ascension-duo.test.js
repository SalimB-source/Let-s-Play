import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RPG_ASCENSION_CARDS, RPG_DUEL_CARDS, cardById, cardColors } from '../src/games/rpgCards.js';
import { carteCorrespondMateriau, combinaisonsAscension, libelleRecetteAscension, validerMateriauxAscension } from '../src/games/rpgAscension.js';
import { indexReanimation, planRenfortAscension } from '../src/games/rpgRenforts.js';
import { cardArt, cardArtFurie } from '../src/games/rpgCardArt.js';
import {
  cibleRespecteCoutMax, rpgActionsEtat, rpgAttaquerCreature, rpgBlesserCreature,
  rpgFinDeTour, rpgJouerCreature, rpgLancerAttaque, rpgLancerMagie, rpgNouveauDuel, rpgPeutAttaquer,
  rpgResoudreArriveeCiblee, rpgResoudreDestructionCiblee, rpgSortACibleValide,
} from '../src/games/rpgDuel.js';
import {
  MOBA_CARTES_AUTORISEES, rpgMobaCiblesDestruction, rpgMobaJouerCreature, rpgMobaLancerMagie,
  rpgMobaNouveauDuel, rpgMobaPasserCreature, rpgMobaPasserEffetCreature, rpgMobaPasserSort,
  rpgMobaPlacementCoherent, rpgMobaResoudreArrivee, rpgMobaResoudreDestruction,
} from '../src/games/rpgMobaLocal.js';
import { rpgCombinaisonsSacrificesIA, choisirCarteIA } from '../src/games/rpgAI.js';
import { rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';
import { rpgPvpAppliquer, rpgPvpVue } from '../src/games/rpgPvp.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { rpgValiderDeck } from '../src/games/rpgCards.js';
import { rpgMobaChoisirCreatureIA, rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';
import { rpgMobaValiderDeck, rpgMobaPeutPayer } from '../src/games/rpgMobaLocal.js';
import { rpgReglerHasard, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce } from '../src/games/rpgDuel.js';

const JARL = 'jarl-du-dernier-rempart', SCORPION = 'scorpion-de-l-eclipse', COLOSSE = 'colosse-du-verre-ardent';
const CONVOI = 'convoi-des-dunes', RETOUR = 'retour-des-ensevelis', CONFLUENCE = 'confluence-des-etincelles', EVEIL = 'eveil-des-dunes';
const RECETTES = {
  [JARL]: ['gardien-viking-du-fjord', 'jarl-au-marteau-de-guerre'],
  [SCORPION]: ['scorpion-du-seuil', 'ureus-du-seuil', 'ureus-du-seuil'],
  [COLOSSE]: ['djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante', 'dune-marchante'],
};
function nouveau(moba = false, options = {}) {
  const init = moba ? rpgMobaNouveauDuel : rpgNouveauDuel;
  const d = init({ joueurDeck: Array(30).fill('viking-des-neiges'), sorcierDeck: Array(30).fill('viking-des-neiges'), rng: () => .5, ...options });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const s of ['joueur', 'sorcier']) { d[s].main = []; d[s].deck = []; d[s].manaChoixEnAttente = null; }
  return d;
}
function placeLibre(d, s, pref = null) {
  const voies = [...d.moba.lanes].filter(l => l.active).sort((a, b) => Number(b.id === pref) - Number(a.id === pref));
  for (const voie of voies) { const slot = voie.slots[s].indexOf(null); if (slot >= 0) return [voie.id, slot]; }
  throw new Error('Fixture sans place');
}
function poser(d, id, s = 'joueur', pref = null) {
  const cout = cardById(id).cost;
  const victimes = Array.from({ length: cout >= 7 ? 2 : cout >= 5 ? 1 : 0 }, () => poser(d, 'viking-des-neiges', s, pref));
  const tour = d.tour; d.tour = s; d[s].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[s] = false;
  d[s].main.push(id);
  const opts = { sacrificeIds: victimes.map(e => e.id) };
  let res;
  if (d.moba) {
    const place = victimes.length ? (() => { const v = d.moba.lanes.find(l => l.slots[s].includes(victimes[0].id)); return [v.id, v.slots[s].indexOf(victimes[0].id)]; })() : placeLibre(d, s, pref);
    res = rpgMobaJouerCreature(d, s, id, ...place, opts);
  } else res = rpgJouerCreature(d, s, id, null, opts);
  d.tour = tour;
  assert.ok(res.ok, `${id}: ${res.raison}`);
  return res.entite;
}
function materiaux(d, id, s = 'joueur') { return RECETTES[id].map((c, i) => poser(d, c, s, i === 2 ? 'right' : 'left')); }
function invoquer(d, id, victimes, cible = null, opts = {}) {
  const options = { sacrificeIds: victimes.map(e => e.id), ...opts };
  if (d.moba) {
    const lane = d.moba.lanes.find(l => l.slots.joueur.includes(victimes[0].id));
    return rpgMobaJouerCreature(d, 'joueur', id, lane.id, lane.slots.joueur.indexOf(victimes[0].id), options);
  }
  return rpgJouerCreature(d, 'joueur', id, cible, options);
}
function sansMutation(d, action) { const avant = JSON.stringify(d); const r = action(); assert.equal(r.ok, false); assert.equal(JSON.stringify(d), avant, r.raison); return r; }
function viderMorts(d) {
  while (d.destructionsEnAttente?.length) {
    const a = d.destructionsEnAttente[0];
    const cible = d.moba ? rpgMobaCiblesDestruction(d, a.cote)[0] : d[a.cote].cimetiere.find(id => ['magie','arme'].includes(cardById(id)?.kind));
    if (!cible) break;
    const r = d.moba ? rpgMobaResoudreDestruction(d, a.cote, cible) : rpgResoudreDestructionCiblee(d, a.cote, cible);
    assert.ok(r.ok, r.raison);
  }
}
const permutations = (xs) => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations(xs.filter((_, j) => j !== i)).map(ys => [x, ...ys]));

test('catalogue : quatre Ascensions publiques, indépendantes et jamais dans les paquets ordinaires', () => {
  const d = nouveau(); const ids = RPG_ASCENSION_CARDS.map(c => c.id);
  assert.deepEqual(d.joueur.reserveAscension, ids); assert.deepEqual(d.sorcier.reserveAscension, ids);
  assert.notEqual(d.joueur.reserveAscension, d.sorcier.reserveAscension);
  assert.deepEqual(JSON.parse(JSON.stringify(d)).joueur.reserveAscension, ids);
  for (const id of ids) { assert.ok(!RPG_DUEL_CARDS.some(c => c.id === id)); assert.ok(!MOBA_CARTES_AUTORISEES.includes(id)); }
  assert.deepEqual(cardColors(cardById(SCORPION)), ['sable', 'tenebres']);
  assert.deepEqual(cardColors(cardById(COLOSSE)), ['braise', 'sable']);
  for (const id of [CONVOI, RETOUR, CONFLUENCE, EVEIL]) {
    assert.ok(RPG_DUEL_CARDS.some(c => c.id === id)); assert.ok(MOBA_CARTES_AUTORISEES.includes(id));
  }
});

for (const id of [JARL, SCORPION, COLOSSE]) for (const ordre of permutations(RECETTES[id].map((_, i) => i))) {
  test(`${id} : recette exacte dans l’ordre ${ordre.join(',')}`, () => {
    const d = nouveau(); const es = materiaux(d, id); const ids = ordre.map(i => es[i].id);
    assert.ok(validerMateriauxAscension(d.joueur, id, ids).ok);
    assert.equal(sacrificesInvocation(cardById(id), d, 'joueur', true), es.length);
    const quota = d.joueur.invocationNormaleJouee;
    const r = rpgJouerCreature(d, 'joueur', id, null, { sacrificeIds: ids }); assert.ok(r.ok, r.raison);
    assert.deepEqual(r.sacrificeIds, ids); assert.equal(d.joueur.invocationNormaleJouee, quota);
    assert.ok(!d.joueur.reserveAscension.includes(id));
    assert.ok(es.every(e => !d.joueur.creatures.some(v => v.id === e.id)));
  });
}

for (const [id, faux] of [
  [JARL, ['archere-viking-du-givre', 'valkyrie-au-corbeau']],
  [SCORPION, ['fennec-des-decombres', 'ureus-du-seuil', 'ureus-du-seuil']],
  [SCORPION, ['scorpion-du-seuil', 'ronin-du-soleil-rouge', 'ureus-du-seuil']],
  [SCORPION, ['scorpion-du-seuil', 'garde-du-voile', 'lecteur-du-dernier-nom']],
  [COLOSSE, ['ashigaru-des-braises', 'djinn-de-la-flamme-mourante', 'dune-marchante']],
  [COLOSSE, ['djinn-de-la-premiere-etincelle', 'djinn-de-foudre', 'jarl-au-marteau-de-guerre']],
]) test(`${id} : un même total ne remplace jamais les rôles (${faux.join(', ')})`, () => {
  const d = nouveau(); const es = faux.map(c => poser(d, c));
  assert.equal(es.reduce((n, e) => n + cardById(e.carteId).cost, 0), 8);
  assert.equal(validerMateriauxAscension(d.joueur, id, es.map(e => e.id)).ok, false);
  assert.equal(combinaisonsAscension(d.joueur, id).length, 0);
  sansMutation(d, () => invoquer(d, id, es));
});

test('trois sacrifices : ni présence dupliquée, ni mort, ni ancienne sélection ; coûts imprimés invariants', () => {
  const d = nouveau(); const es = materiaux(d, SCORPION);
  const ids = es.map(e => e.id);
  assert.equal(validerMateriauxAscension(d.joueur, SCORPION, [ids[0], ids[1], ids[1]]).raison, 'ascension-nombre');
  assert.equal(validerMateriauxAscension(d.joueur, SCORPION, ids.slice(0, 2)).raison, 'ascension-nombre');
  Object.assign(es[1], { cost: 99, coutBonusArme: 10, atk: 25 });
  assert.ok(validerMateriauxAscension(d.joueur, SCORPION, ids).ok);
  es[2].pv = 0; sansMutation(d, () => invoquer(d, SCORPION, es));
  es[2].pv = 1; d.joueur.creatures.pop(); sansMutation(d, () => invoquer(d, SCORPION, es));
});

test('les combinaisons et l’IA réutilisent les rôles exacts, y compris une sélection partielle', () => {
  const d = nouveau(); const es = materiaux(d, SCORPION); poser(d, 'ronin-du-soleil-rouge');
  const avant = JSON.stringify(d);
  const groupes = combinaisonsAscension(d.joueur, SCORPION, [es[1].id]);
  assert.equal(groupes.length, 1); assert.equal(groupes[0].length, 3);
  assert.deepEqual(rpgCombinaisonsSacrificesIA(d, 'joueur', cardById(SCORPION)).map(g => g.map(e => e.id)), groupes.map(g => g.map(e => e.id)));
  assert.equal(JSON.stringify(d), avant);
  assert.match(libelleRecetteAscension(JARL), /Viking 3 \+ Viking 5/);
  assert.match(libelleRecetteAscension(SCORPION), /Scorpion Sable 2.*Ténèbres 3.*Ténèbres 3/);
});

test('un hybride peut prendre un rôle, jamais deux : appariement sans dépendance à l’ordre', () => {
  const d = nouveau(); const a = poser(d, 'djinn-de-foudre'), b = poser(d, 'djinn-de-foudre');
  const c = { ascension: { nombre: 2, coutTotal: 4, materiaux: [{ element: 'sable', cout: 2 }, { element: 'braise', cout: 2 }] } };
  assert.ok(carteCorrespondMateriau(a.carteId, { element: 'braise', cout: 2 }));
  assert.ok(validerMateriauxAscension(d.joueur, c, [b.id, a.id]).ok);
  assert.equal(validerMateriauxAscension(d.joueur, c, [a.id, a.id]).ok, false);
  assert.equal(combinaisonsAscension(d.joueur, c).length, 1);
});

test('Jarl : 4/10, Bouclier puis Furie 4 réversible ; la face change réellement', () => {
  const d = nouveau(); const r = invoquer(d, JARL, materiaux(d, JARL)); assert.ok(r.ok, r.raison);
  const e = r.entite; assert.equal(e.atk, 4); assert.equal(e.pv, 10); assert.equal(e.bouclier, 1); assert.equal(e.overkill, true);
  d.tour = 'sorcier'; d.sorcier.main.push('trait-de-braise');
  assert.ok(rpgLancerMagie(d, 'sorcier', 'trait-de-braise', e.id).ok); d.tour = 'joueur';
  assert.equal(e.pv, 10); assert.equal(e.bouclier, 0); assert.equal(e.furieDeclenchee, false);
  rpgBlesserCreature(d, 'joueur', e.id, 2, 'braise', null, 'attaque', null, null, 'sorcier'); rpgActionsEtat(d);
  assert.equal(e.atk, 8); assert.equal(e.pv, 8); assert.equal(e.furieDeclenchee, true);
  d.joueur.main.push('festin-des-vaillants'); assert.ok(rpgLancerMagie(d, 'joueur', 'festin-des-vaillants').ok);
  assert.equal(e.pv, 10); assert.equal(e.atk, 4); assert.equal(e.furieDeclenchee, false);
  rpgBlesserCreature(d, 'joueur', e.id, 1); rpgActionsEtat(d); assert.equal(e.atk, 8);
  assert.match(cardArt(JARL), /casque-loup-v2/); assert.match(cardArtFurie(JARL), /furie.*\?v=/);
});

test('Scorpion : l’arrivée exige une proie blessée sous le seuil, refus atomique sinon', () => {
  const d = nouveau(); const es = materiaux(d, SCORPION); const cible = poser(d, 'gardien-viking-du-fjord', 'sorcier');
  assert.equal(cibleRespecteCoutMax(cardById(SCORPION), cible), false);
  sansMutation(d, () => invoquer(d, SCORPION, es, cible.id));
  rpgBlesserCreature(d, 'sorcier', cible.id, 1);
  const r = invoquer(d, SCORPION, es, cible.id); assert.ok(r.ok, r.raison);
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
  assert.ok(d.sorcier.cimetiere.includes(cible.carteId));
});

test('Scorpion : des dégâts seulement absorbés par une armure ne créent pas une proie blessée', () => {
  const cible = { carteId: 'gardien-viking-du-fjord', pv: 6, pvMax: 6, def: 6,
    arme: { carteId: 'cuirasse-de-sel', armure: { max: 2, restant: 2 } } };
  assert.equal(cibleRespecteCoutMax(cardById(SCORPION), cible), false);
  cible.pv = 5; cible.arme.armure.restant = 1;
  assert.equal(cibleRespecteCoutMax(cardById(SCORPION), cible), false);
  cible.pv = 3; cible.arme.armure.restant = 0;
  assert.equal(cibleRespecteCoutMax(cardById(SCORPION), cible), true);
});

test('Scorpion : Poison et Vol de vie fonctionnent en combat réel', () => {
  const d = nouveau(); const r = invoquer(d, SCORPION, materiaux(d, SCORPION)); assert.ok(r.ok, r.raison);
  rpgFinDeTour(d); rpgFinDeTour(d);
  const cible = poser(d, 'gardien-viking-du-fjord', 'sorcier'); cible.pv = 12; cible.pvMax = 12; cible.def = 12;
  const pv = d.joueur.pv; assert.ok(rpgAttaquerCreature(d, 'joueur', r.entite.id, cible.id).ok);
  assert.equal(cible.pv, 7); assert.equal(cible.poison.degats, 1); assert.equal(cible.poison.toursRestants, 2);
  assert.equal(d.joueur.pv, pv + 3);
  rpgFinDeTour(d); assert.equal(d.tour, 'sorcier'); assert.equal(cible.pv, 6); assert.equal(cible.poison.toursRestants, 1);
});

test('Colosse : arrivée de zone, Bouclier et Contre-attaque ne sont pas seulement du texte', () => {
  const d = nouveau(); const es = materiaux(d, COLOSSE); const allie = poser(d, 'viking-des-neiges');
  const cible = poser(d, 'gardien-viking-du-fjord', 'sorcier'); const pv = cible.pv;
  const r = invoquer(d, COLOSSE, es); assert.ok(r.ok, r.raison);
  assert.equal(cible.pv, pv - 2); assert.equal(allie.pv, 1); assert.equal(r.entite.bouclier, 1); assert.equal(r.entite.contreAttaque, true);
  const attaquant = poser(d, 'feriel', 'sorcier'); d.tour = 'sorcier';
  assert.ok(rpgLancerAttaque(d, 'sorcier', [attaquant.id], null, null, null, { [attaquant.id]: r.entite.id }).ok);
  assert.equal(r.entite.pv, 5); assert.ok(!d.sorcier.creatures.some(e => e.id === attaquant.id));
  assert.equal(r.entite.bouclier, 1, 'une attaque ne consomme pas la parade anti-effet');
});

for (const moba of [false, true]) test(`Convoi : vrai renfort, sans seconde invocation normale et sans boucle (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = nouveau(moba); d.joueur.main = [CONVOI, CONVOI, 'scorpion-du-seuil'];
  const r = moba ? rpgMobaJouerCreature(d, 'joueur', CONVOI, 'left', 0) : rpgJouerCreature(d, 'joueur', CONVOI);
  assert.ok(r.ok, r.raison); assert.equal(d.joueur.creatures.filter(e => e.carteId === CONVOI).length, 2);
  assert.deepEqual(d.joueur.main, ['scorpion-du-seuil']);
  const renfort = d.joueur.creatures.find(e => e.id !== r.entite.id);
  assert.equal(renfort.ready, false); assert.equal(renfort.malInvocation, true); assert.equal(rpgPeutAttaquer(renfort), false);
  assert.equal(moba ? d.moba.creaturesJouees.joueur : d.joueur.invocationNormaleJouee, true);
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false, true]) test(`Confluence + Éveil : trois matériaux depuis deux effets spéciaux (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = nouveau(moba); d.joueur.invocationNormaleJouee = true;
  if (moba) d.moba.creaturesJouees.joueur = true;
  d.joueur.main = [CONFLUENCE, EVEIL, 'djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante'];
  d.joueur.deck = ['dune-marchante', 'viking-des-neiges'];
  const lancer = id => moba ? rpgMobaLancerMagie(d, 'joueur', id) : rpgLancerMagie(d, 'joueur', id);
  assert.ok(lancer(CONFLUENCE).ok); assert.ok(lancer(EVEIL).ok);
  assert.equal(d.joueur.creatures.length, 3); assert.deepEqual(d.joueur.deck, []); assert.ok(d.joueur.main.includes('viking-des-neiges'), 'l’arrivée du Djinn pioche bien une carte');
  assert.equal(combinaisonsAscension(d.joueur, COLOSSE).length, 1);
  assert.equal(moba ? d.moba.creaturesJouees.joueur : d.joueur.invocationNormaleJouee, true);
  const dune = d.joueur.creatures.find(e => e.carteId === 'dune-marchante'); assert.equal(dune.ready, false);
  const flamme = d.joueur.creatures.find(e => e.carteId === 'djinn-de-la-flamme-mourante'); assert.equal(flamme.ready, true, 'Rapidité imprimée conservée');
  const r = invoquer(d, COLOSSE, [...d.joueur.creatures]); assert.ok(r.ok, r.raison);
  viderMorts(d);
  assert.equal(d.joueur.creatures.some(e => e.carteId === COLOSSE), true);
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});

test('renforts : au plus une activation par nom et tour, y compris après sérialisation', () => {
  const d = nouveau(); d.joueur.main = [EVEIL, EVEIL]; d.joueur.deck = ['dune-marchante', 'dune-marchante'];
  assert.ok(rpgLancerMagie(d, 'joueur', EVEIL).ok);
  const copie = JSON.parse(JSON.stringify(d));
  assert.equal(sansMutation(copie, () => rpgLancerMagie(copie, 'joueur', EVEIL)).raison, 'renfort-limite');
  assert.equal(rpgSortACibleValide(copie, 'joueur', cardById(EVEIL)), false);
  rpgFinDeTour(d); assert.equal(d.tour, 'sorcier'); assert.deepEqual(d.joueur.renfortsAscensionJoues, {});
});

test('renforts : champ plein ou absence de matériau = aucun paiement ni retrait de carte', () => {
  const d = nouveau(false, { modeMana: 'essai' });
  for (let i = 0; i < 5; i++) poser(d, 'viking-des-neiges');
  d.joueur.main = [EVEIL]; d.joueur.deck = ['dune-marchante'];
  sansMutation(d, () => rpgLancerMagie(d, 'joueur', EVEIL));
  d.joueur.creatures = []; d.joueur.deck = ['viking-des-neiges'];
  sansMutation(d, () => rpgLancerMagie(d, 'joueur', EVEIL));
});

test('Confluence partielle : ne retire pas la deuxième carte si la première remplit le champ', () => {
  const d = nouveau(false, { modeMana: 'essai' }); for (let i = 0; i < 4; i++) poser(d, 'viking-des-neiges');
  d.joueur.main = [CONFLUENCE, 'ghul-des-cendres', 'djinn-de-la-flamme-mourante'];
  assert.ok(rpgLancerMagie(d, 'joueur', CONFLUENCE).ok);
  assert.equal(d.joueur.creatures.length, 5); assert.deepEqual(d.joueur.main, ['djinn-de-la-flamme-mourante']);
});

for (const moba of [false, true]) test(`Retour des ensevelis : dernière créature admissible, pas la dernière carte ni une Ascension (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = nouveau(moba); d.joueur.cimetiere = ['momie-de-lin', 'viking-des-neiges', JARL, 'lecteur-du-dernier-nom'];
  d.joueur.main = [RETOUR];
  assert.equal(indexReanimation(d.joueur, cardById(RETOUR).effet), 0);
  const r = moba ? rpgMobaLancerMagie(d, 'joueur', RETOUR, null, 'right', null, { emplacementReanimation: 1 }) : rpgLancerMagie(d, 'joueur', RETOUR);
  assert.ok(r.ok, r.raison); assert.equal(d.joueur.creatures[0].carteId, 'momie-de-lin');
  assert.equal(d.joueur.creatures[0].ready, false);
  assert.ok(d.joueur.cimetiere.includes(JARL)); assert.equal(d.joueur.invocationNormaleJouee ?? false, false);
  if (moba) { assert.equal(d.moba.creaturesJouees.joueur, false); assert.equal(d.joueur.creatures[0].mobaLane, 'right'); assert.ok(rpgMobaPlacementCoherent(d)); }
});

test('Éveil prend la première carte admissible depuis le dessus et garde l’ordre des autres', () => {
  const d = nouveau(); d.joueur.main = [EVEIL]; d.joueur.deck = ['dune-marchante', 'viking-des-neiges', 'le-cavalier-des-dunes-gelees', 'ghul-des-cendres'];
  const avant = JSON.stringify(d);
  assert.deepEqual(planRenfortAscension(d.joueur, cardById(EVEIL).effet), [{ id: 'le-cavalier-des-dunes-gelees', index: 2 }]);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgLancerMagie(d, 'joueur', EVEIL).ok);
  assert.equal(d.joueur.creatures[0].carteId, 'le-cavalier-des-dunes-gelees');
  assert.deepEqual(d.joueur.deck, ['dune-marchante', 'viking-des-neiges', 'ghul-des-cendres']);
});

for (const id of [JARL, SCORPION, COLOSSE]) test(`MOBA ${id} : trois/deux sacrifices réservés à l’annonce, payés seulement à la résolution`, () => {
  const d = nouveau(true); const es = materiaux(d, id); const avant = es.map(e => e.id);
  d.moba.creaturesJouees.joueur = true;
  const r = invoquer(d, id, es, null, { ouvrirReponse: true }); assert.ok(r.ok, r.raison);
  assert.ok(d.mobaCreatureEnAttente); assert.ok(avant.every(id => d.joueur.creatures.some(e => e.id === id)));
  assert.ok(!d.joueur.reserveAscension.includes(id));
  assert.ok(rpgMobaPasserCreature(d, 'sorcier').ok); viderMorts(d);
  assert.ok(avant.every(id => !d.joueur.creatures.some(e => e.id === id)));
  assert.ok(d.joueur.creatures.some(e => e.carteId === id)); assert.equal(d.moba.creaturesJouees.joueur, true);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('MOBA : renfort annoncé contrecarré ne prend aucune carte de main/pioche et conserve son activation', () => {
  const d = nouveau(true); d.joueur.main = [EVEIL, EVEIL]; d.joueur.deck = ['dune-marchante'];
  d.sorcier.main = ['contresort-des-abimes'];
  assert.ok(rpgMobaLancerMagie(d, 'joueur', EVEIL, null, null, null, { ouvrirReponse: true }).ok);
  assert.ok(d.mobaSortEnAttente); assert.equal(d.joueur.creatures.length, 0);
  assert.ok(rpgMobaLancerMagie(d, 'sorcier', 'contresort-des-abimes').ok);
  assert.deepEqual(d.joueur.deck, ['dune-marchante']); assert.equal(d.joueur.creatures.length, 0);
  sansMutation(d, () => rpgMobaLancerMagie(d, 'joueur', EVEIL));
});

test('MOBA : une annonce de renfort réussie ne se résout pas deux fois', () => {
  const d = nouveau(true); d.joueur.main = [EVEIL]; d.joueur.deck = ['dune-marchante'];
  assert.ok(rpgMobaLancerMagie(d, 'joueur', EVEIL, null, null, null, { ouvrirReponse: true }).ok);
  assert.ok(rpgMobaPasserSort(d, 'sorcier').ok); assert.equal(d.joueur.creatures.length, 1);
  sansMutation(d, () => rpgMobaPasserSort(d, 'sorcier')); assert.ok(rpgMobaPlacementCoherent(d));
});

test('MOBA : le Colosse ne souffle que dans sa voie et ne touche pas les alliés', () => {
  const d = nouveau(true); const es = materiaux(d, COLOSSE);
  const gauche = poser(d, 'gardien-viking-du-fjord', 'sorcier', 'left');
  const droite = poser(d, 'gardien-viking-du-fjord', 'sorcier', 'right');
  const avant = [gauche.pv, droite.pv]; const r = invoquer(d, COLOSSE, es); assert.ok(r.ok, r.raison);
  assert.equal(gauche.pv, avant[0] - 2); assert.equal(droite.pv, avant[1]); assert.ok(rpgMobaPlacementCoherent(d));
});

test('PvP : recette à trois contrôlée par l’arbitre, réserve publique et quota normal préservé', () => {
  const d = nouveau(false, { pvp: true }); const es = materiaux(d, SCORPION); d.joueur.invocationNormaleJouee = true;
  const r = rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: SCORPION, sacrificeIds: es.map(e => e.id) });
  assert.ok(r.ok, r.raison); assert.ok(!d.joueur.reserveAscension.includes(SCORPION)); assert.equal(d.joueur.invocationNormaleJouee, true);
  assert.ok(rpgPvpVue(d, 'sorcier').sorcier.reserveAscension.includes(JARL));
});

test('les huit nouveaux arts sont de vrais JPEG 768×960, optimisés et datés ; Furie distincte', () => {
  const ids = [JARL, `${JARL}-furie`, SCORPION, COLOSSE, CONVOI, RETOUR, CONFLUENCE, EVEIL];
  const hash = id => createHash('sha256').update(readFileSync(new URL(`../public/cards/${id}.jpg`, import.meta.url))).digest('hex');
  for (const id of ids) {
    const bytes = readFileSync(new URL(`../public/cards/${id}.jpg`, import.meta.url));
    assert.equal(bytes.readUInt16BE(0), 0xffd8); assert.ok(bytes.length < 260 * 1024);
    let dimensions;
    for (let i = 2; i + 9 < bytes.length;) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) { dimensions = [bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)]; break; }
      i += 2 + bytes.readUInt16BE(i + 2);
    }
    assert.deepEqual(dimensions, [768, 960], id);
    assert.match(id.endsWith('-furie') ? cardArtFurie(JARL) : cardArt(id), /\.jpg\?v=/);
  }
  assert.notEqual(hash(JARL), hash(`${JARL}-furie`));
});

for (const moba of [false, true]) for (const id of [JARL, SCORPION, COLOSSE]) test(`IA ${moba ? 'MOBA' : 'Duel'} : décision réelle d’invoquer ${id} sans muter l’état ni son hasard`, () => {
  const d = nouveau(moba); const side = moba ? 'joueur' : 'sorcier';
  const es = materiaux(d, id, side); d.tour = side; d[side].main = []; d[side].reserveAscension = [id];
  if (id === SCORPION) {
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    const cible = poser(d, 'gardien-viking-du-fjord', enemy, 'left'); rpgBlesserCreature(d, enemy, cible.id, 1);
  }
  for (const e of es) Object.assign(e, { pv: 1, atk: 0, nePeutPasAttaquer: true });
  let tirages = 0; rpgReglerHasard(d, () => { tirages++; return .5; }); const avant = JSON.stringify(d);
  const choix = moba ? rpgMobaChoisirCreatureIA(d, side) : choisirCarteIA(d, side, { rng: () => .5 });
  assert.equal(moba ? choix?.id : choix?.carteId, id);
  assert.ok(validerMateriauxAscension(d[side], id, choix.sacrificeIds).ok);
  assert.equal(JSON.stringify(d), avant); assert.equal(tirages, 0);
  const r = moba ? rpgMobaJouerCreature(d, side, choix.id, choix.lane, choix.slot, choix)
    : (assert.equal(rpgSorcierAnnonceSuivante(d, () => .5)?.carteId, id), rpgSorcierResoudreAnnonce(d));
  assert.ok(r.ok, r.raison); assert.ok(d[side].creatures.some(e => e.carteId === id));
});

for (const moba of [false, true]) for (const id of [CONFLUENCE, EVEIL, RETOUR]) test(`IA ${moba ? 'MOBA' : 'Duel'} : choisit et résout le soutien ${id} même invocation normale dépensée`, () => {
  const d = nouveau(moba); const side = moba ? 'joueur' : 'sorcier'; d.tour = side;
  d[side].reserveAscension = []; d[side].invocationNormaleJouee = true; if (moba) d.moba.creaturesJouees[side] = true;
  d[side].main = [id, ...(id === CONFLUENCE ? ['ghul-des-cendres', 'djinn-de-la-flamme-mourante'] : [])];
  d[side].deck = id === EVEIL ? ['dune-marchante'] : []; d[side].cimetiere = id === RETOUR ? ['momie-de-lin'] : [];
  const avant = JSON.stringify(d);
  const choix = moba ? rpgMobaChoisirMagieIA(d, side) : choisirCarteIA(d, side, { rng: () => .5 });
  assert.equal(moba ? choix?.id : choix?.carteId, id); assert.equal(JSON.stringify(d), avant);
  const r = moba ? rpgMobaLancerMagie(d, side, choix.id, choix.cible, choix.lane, choix.prixLane, choix)
    : (assert.equal(rpgSorcierAnnonceSuivante(d, () => .5)?.carteId, id), rpgSorcierResoudreAnnonce(d));
  assert.ok(r.ok, r.raison); assert.equal(d[side].creatures.length, id === CONFLUENCE ? 2 : 1);
  assert.equal(moba ? d.moba.creaturesJouees[side] : d[side].invocationNormaleJouee, true);
});

for (const moba of [false, true]) test(`Réanimation ordinaire reste compatible avec une Ascension morte (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = nouveau(moba); const e = invoquer(d, JARL, materiaux(d, JARL)).entite;
  e.pv = 0; rpgActionsEtat(d);
  if (moba) { // L’adaptateur réconcilie normalement la mort avant l’action suivante.
    for (const lane of d.moba.lanes) lane.slots.joueur = lane.slots.joueur.map(id => id === e.id ? null : id);
  }
  d.joueur.main = ['reanimation']; d.joueur.invocationNormaleJouee = true; if (moba) d.moba.creaturesJouees.joueur = true;
  const r = moba ? rpgMobaLancerMagie(d, 'joueur', 'reanimation', null, 'right', null, { emplacementReanimation: 1 }) : rpgLancerMagie(d, 'joueur', 'reanimation');
  assert.ok(r.ok, r.raison); const revient = d.joueur.creatures.find(e => e.carteId === JARL);
  assert.ok(revient); assert.equal(revient.atk, 4); assert.equal(revient.pv, 10); assert.equal(revient.bouclier, 1);
  assert.ok(!d.joueur.cimetiere.includes(JARL)); assert.ok(!d.joueur.reserveAscension.includes(JARL));
  assert.equal(moba ? d.moba.creaturesJouees.joueur : d.joueur.invocationNormaleJouee, true);
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false, true]) test(`Confluence : rôle absent ignoré, second rôle et arrivée conservés (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = nouveau(moba); d.joueur.main = [CONFLUENCE, 'djinn-de-la-flamme-mourante']; d.joueur.deck = ['garde-du-voile'];
  const r = moba ? rpgMobaLancerMagie(d, 'joueur', CONFLUENCE) : rpgLancerMagie(d, 'joueur', CONFLUENCE);
  assert.ok(r.ok, r.raison); assert.equal(d.joueur.creatures.length, 1); assert.deepEqual(d.joueur.main, ['garde-du-voile']);
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});

test('soutiens : timing principal autoritaire, tous les refus avant paiement', () => {
  const variantes = [
    d => { d.phase = 'blocage'; }, d => { d.tour = 'sorcier'; }, d => { d.fenetreReponse = true; },
    d => { d.mulliganFait.sorcier = false; }, d => { d.fin = { gagnant: 'joueur' }; },
    d => { d.arriveeEnAttente = { cote: 'joueur', entiteId: 'absente' }; },
    d => { d.defausseEnAttente = { cote: 'joueur', restant: 1 }; },
  ];
  for (const changer of variantes) {
    const d = nouveau(); d.joueur.main = [EVEIL]; d.joueur.deck = ['dune-marchante']; changer(d);
    assert.equal(sansMutation(d, () => rpgLancerMagie(d, 'joueur', EVEIL)).raison, 'timing');
  }
});

test('MOBA : disponibilités de soutien pures, champs pleins et quota d’effet reflétés dans la main', () => {
  const d = nouveau(true); d.joueur.main = [EVEIL, EVEIL]; d.joueur.deck = ['dune-marchante', 'dune-marchante'];
  let avant = JSON.stringify(d); assert.equal(rpgMobaPeutPayer(d, 'joueur', cardById(EVEIL)), true); assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaLancerMagie(d, 'joueur', EVEIL).ok); avant = JSON.stringify(d);
  assert.equal(rpgMobaPeutPayer(d, 'joueur', cardById(EVEIL)), false); assert.equal(JSON.stringify(d), avant);
  const plein = nouveau(true); for (let i = 0; i < 5; i++) poser(plein, 'viking-des-neiges');
  plein.joueur.main = [EVEIL]; plein.joueur.deck = ['dune-marchante']; avant = JSON.stringify(plein);
  assert.equal(rpgMobaPeutPayer(plein, 'joueur', cardById(EVEIL)), false); assert.equal(JSON.stringify(plein), avant);
  sansMutation(plein, () => rpgMobaLancerMagie(plein, 'joueur', EVEIL));
  plein.joueur.creatures.pop(); avant = JSON.stringify(plein); // Case physique périmée : pas de réparation dans une requête.
  rpgMobaPeutPayer(plein, 'joueur', cardById(EVEIL)); assert.equal(JSON.stringify(plein), avant);
  assert.equal(sansMutation(plein, () => rpgMobaLancerMagie(plein, 'joueur', EVEIL)).raison, 'etat-incoherent');
});

test('MOBA : renfort annoncé privé de sa source se dissipe une fois, sans perdre d’autres cartes', () => {
  const d = nouveau(true); d.joueur.main = [CONFLUENCE, 'ghul-des-cendres'];
  assert.ok(rpgMobaLancerMagie(d, 'joueur', CONFLUENCE, null, null, null, { ouvrirReponse: true }).ok);
  d.joueur.cimetiere.push(...d.joueur.main.splice(0)); // État après une réponse de défausse.
  const r = rpgMobaPasserSort(d, 'sorcier'); assert.ok(r.ok); assert.equal(r.dissipe, true);
  assert.equal(d.joueur.creatures.length, 0); assert.equal(d.joueur.cimetiere.filter(id => id === CONFLUENCE).length, 1);
  assert.equal(d.fenetreReponse, false); assert.equal(d.mobaSortEnAttente, null);
  sansMutation(d, () => rpgMobaPasserSort(d, 'sorcier'));
});

test('MOBA Scorpion : désignation hostile dans sa voie, réponse de Bouclier et résolution unique', () => {
  const d = nouveau(true); const es = materiaux(d, SCORPION);
  const proche = poser(d, 'gardien-viking-du-fjord', 'sorcier', 'left');
  const loin = poser(d, 'gardien-viking-du-fjord', 'sorcier', 'right');
  rpgBlesserCreature(d, 'sorcier', proche.id, 1); rpgBlesserCreature(d, 'sorcier', loin.id, 1);
  d.sorcier.main = ['parade-du-verre'];
  assert.ok(invoquer(d, SCORPION, es).ok); assert.ok(d.arriveeEnAttente);
  sansMutation(d, () => rpgMobaResoudreArrivee(d, 'joueur', loin.id));
  const avant = JSON.stringify(d); assert.equal(rpgMobaChoisirArriveeIA(d, 'joueur'), proche.id); assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaResoudreArrivee(d, 'joueur', proche.id).ok); assert.ok(d.effetCreatureEnAttente); assert.equal(proche.bouclier, 0);
  assert.ok(rpgMobaLancerMagie(d, 'sorcier', 'parade-du-verre', proche.id).ok); assert.equal(proche.bouclier, 1);
  assert.ok(rpgMobaPasserEffetCreature(d, 'sorcier').ok);
  assert.ok(d.sorcier.creatures.some(e => e.id === proche.id)); assert.equal(proche.bouclier, 0);
  assert.equal(d.effetCreatureEnAttente, null); assert.equal(d.fenetreReponse, false);
  sansMutation(d, () => rpgMobaPasserEffetCreature(d, 'sorcier')); assert.ok(rpgMobaPlacementCoherent(d));
});

test('deux préconstruits Ascension de 30 cartes, légaux en Duel et MOBA, avec tous les rôles et soutiens', () => {
  for (const [theme, ascension, soutiens] of [['ascension-eclipse', SCORPION, [CONVOI, RETOUR]], ['ascension-verre', COLOSSE, [CONFLUENCE, EVEIL]]]) {
    const deck = RPG_DECKS_THEMATIQUES.find(d => d.id === theme); assert.ok(deck); assert.equal(deck.cardIds.length, 30);
    assert.ok(rpgValiderDeck(deck.cardIds).ok); assert.ok(rpgMobaValiderDeck(deck).ok);
    assert.equal(deck.boxArt, ascension); assert.ok(soutiens.every(id => deck.cardIds.filter(c => c === id).length === 2));
    assert.ok(!deck.cardIds.some(id => cardById(id).ascension));
    assert.ok(cardById(ascension).ascension.materiaux.every(role => deck.cardIds.some(id => carteCorrespondMateriau(id, role))));
  }
});

for (const moba of [false, true]) test(`IA ${moba ? 'MOBA' : 'Duel'} : le Convoi prépare réellement un Scorpion depuis la main`, () => {
  const d = nouveau(moba); const side = moba ? 'joueur' : 'sorcier'; d.tour = side;
  d[side].reserveAscension = []; d[side].main = [CONVOI, 'scorpion-du-seuil'];
  const avant = JSON.stringify(d);
  const choix = moba ? rpgMobaChoisirCreatureIA(d, side) : choisirCarteIA(d, side, { rng: () => .5 });
  assert.equal(moba ? choix?.id : choix?.carteId, CONVOI); assert.equal(JSON.stringify(d), avant);
  const r = moba ? rpgMobaJouerCreature(d, side, choix.id, choix.lane, choix.slot, choix)
    : (assert.equal(rpgSorcierAnnonceSuivante(d, () => .5)?.carteId, CONVOI), rpgSorcierResoudreAnnonce(d));
  assert.ok(r.ok, r.raison); assert.ok(d[side].creatures.some(e => e.carteId === 'scorpion-du-seuil'));
});

test('Scorpion : le seuil d’arrivée lit le coût imprimé, pas l’équipement ni un coût forgé', () => {
  const d = nouveau(); const es = materiaux(d, SCORPION); const cible = poser(d, 'gardien-viking-du-fjord', 'sorcier');
  rpgBlesserCreature(d, 'sorcier', cible.id, 1); Object.assign(cible, { coutBonusArme: 10, cost: 99 });
  assert.equal(cibleRespecteCoutMax(cardById(SCORPION), cible), true);
  assert.equal(cibleRespecteCoutMax({ arrivee: { coutMax: 4 } }, cible), false, 'seuils historiques inchangés');
  assert.ok(invoquer(d, SCORPION, es, cible.id).ok); assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
});

for (const moba of [false, true]) test(`renfort sans Rapidité : ne peut attaquer avant son prochain tour, puis se dégage (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = nouveau(moba); d.joueur.main = [RETOUR]; d.joueur.cimetiere = ['ureus-du-seuil'];
  const r = moba ? rpgMobaLancerMagie(d, 'joueur', RETOUR, null, 'left', null, { emplacementReanimation: 0 }) : rpgLancerMagie(d, 'joueur', RETOUR);
  assert.ok(r.ok, r.raison); const e = d.joueur.creatures[0]; assert.equal(rpgPeutAttaquer(e), false);
  rpgFinDeTour(d); assert.equal(d.tour, 'sorcier'); assert.equal(rpgPeutAttaquer(e), false);
  rpgFinDeTour(d); assert.equal(d.tour, 'joueur'); assert.equal(rpgPeutAttaquer(e), true);
});

for (const moba of [false, true]) test(`trois sacrifices simultanés et deux morts de Momie ne volent pas la destination (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = nouveau(moba, { modeMana: 'essai' });
  const es = ['scorpion-du-seuil', 'momie-de-lin', 'momie-de-lin'].map(c => poser(d, c));
  poser(d, 'viking-des-neiges'); poser(d, 'viking-des-neiges');
  const r = invoquer(d, SCORPION, es); assert.ok(r.ok, r.raison);
  assert.equal(d.joueur.creatures.filter(e => e.jeton).length, 2); assert.equal(d.joueur.creatures.length, 5);
  assert.equal(d.joueur.cimetiere.filter(id => id === 'momie-de-lin').length, 2);
  assert.equal(d.joueur.creatures.filter(e => e.carteId === SCORPION).length, 1);
  assert.ok(es.every(e => !d.joueur.creatures.some(v => v.id === e.id)));
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
