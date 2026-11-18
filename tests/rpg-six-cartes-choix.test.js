import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi, rpgBlesserCreature, rpgLancerMagie, rpgDefausserCarte, rpgReglerHasard, rpgFinDeTour, arriveeConsulteDeck } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgPvpAppliquer, rpgPvpVue } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreRecherche, rpgMobaCandidatsRecherche, rpgMobaPlacementCoherent, rpgMobaLancerMagie, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaChoisirRechercheIA } from '../src/games/rpgMobaAI.js';

function partie(moba = false, side = 'joueur', pvp = true) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp, rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true; d.tour = side;
  for (const s of ['joueur', 'sorcier']) { d[s].main = []; d[s].deck = []; d[s].manaChoixEnAttente = null; d[s].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); }
  return d;
}
function poser(d, side, id, slot = 0) {
  d[side].main.push(id); d[side].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[side] = false;
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, 'left', slot) : rpgJouerCreature(d, side, id);
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
function choisir(d, side, id, index = undefined) {
  const choix = rpgCartesRenfortChoisi(d, side).find(c => c.id === id && (index === undefined || c.index === index));
  assert.ok(choix, `${id} pas admissible`);
  return d.moba ? rpgMobaResoudreRecherche(d, side, id, choix.index) : rpgResoudreRenfortChoisi(d, side, choix.index);
}

for (const moba of [false, true]) for (const side of ['joueur','sorcier']) {
  const mode = `${moba ? 'MOBA' : 'classique'}, ${side}`;
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`Porteur : choix des seules créatures coût 2 ou 3 dans son deck (${mode})`, () => {
    const d = partie(moba, side); d[side].deck = ['chien-du-guet', 'ureus-du-seuil', 'papyrus', 'dune-marchante', 'chacal-du-seuil', 'ureus-du-seuil'];
    poser(d, side, 'porteur-de-la-plume');
    const candidats = rpgCartesRenfortChoisi(d, side); assert.deepEqual(candidats.map(c => c.index), [0, 1, 5]);
    assert.deepEqual(rpgCartesRenfortChoisi(d, enemy), []);
    const etat = JSON.stringify(d);
    assert.equal((moba ? rpgMobaResoudreRecherche(d, side, 'papyrus') : rpgResoudreRenfortChoisi(d, side, 2)).ok, false);
    assert.equal(JSON.stringify(d), etat);
    assert.ok(choisir(d, side, 'ureus-du-seuil', 5).ok);
    assert.deepEqual(d[side].cimetiere, ['ureus-du-seuil']);
    assert.deepEqual(d[side].deck, ['chien-du-guet', 'ureus-du-seuil', 'papyrus', 'dune-marchante', 'chacal-du-seuil']);
    assert.deepEqual(d[side].main, []); assert.ok(!d.renfortChoixEnAttente && !d.mobaRechercheEnAttente);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Convoi : choix des couleurs et coûts sans limite (${mode})`, () => {
    const d = partie(moba, side);
    d[side].cimetiere = ['chien-du-guet', 'ureus-du-seuil', 'dune-marchante', 'guetteuse-des-marees', 'viking-des-neiges', 'papyrus', 'ashigaru-des-braises'];
    poser(d, side, 'convoi-des-dunes');
    assert.deepEqual(rpgCartesRenfortChoisi(d, side).map(c => c.id), ['chien-du-guet', 'ureus-du-seuil', 'dune-marchante', 'ashigaru-des-braises']);
    assert.equal((moba ? rpgMobaResoudreRecherche(d, side, 'guetteuse-des-marees') : rpgResoudreRenfortChoisi(d, side, 3)).ok, false);
    assert.ok(choisir(d, side, 'dune-marchante').ok);
    assert.deepEqual(d[side].main, ['dune-marchante']); assert.equal(d[side].cimetiere.includes('dune-marchante'), false);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  for (const id of ['porteur-de-la-plume', 'convoi-des-dunes']) test(`${id} ne bloque pas sans candidat (${mode})`, () => {
    const d = partie(moba, side); d[side].deck = ['papyrus']; d[side].cimetiere = ['guetteuse-des-marees'];
    poser(d, side, id); assert.ok(!d.renfortChoixEnAttente && !d.mobaRechercheEnAttente);
  });
}

test('PvP masque les candidats du Porteur et n’accepte que son contrôleur', () => {
  const d = partie(false, 'sorcier'); d.sorcier.deck = ['chien-du-guet', 'ureus-du-seuil']; poser(d, 'sorcier', 'porteur-de-la-plume');
  const vue = rpgPvpVue(d, 'joueur'); assert.deepEqual(vue.sorcier.deck, []); assert.deepEqual(rpgCartesRenfortChoisi(vue, 'joueur'), []);
  assert.equal(rpgPvpAppliquer(d, 'joueur', {type: 'choisir-renfort', index: 0}).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', {type: 'choisir-renfort', index: 10}).ok, false);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', {type: 'choisir-renfort', index: 1}).ok);
  assert.deepEqual(d.sorcier.cimetiere, ['ureus-du-seuil']);
});

test('le Porteur conserve son soin de mort, et son arrivée consulte le deck', () => {
  const d = partie(); d.joueur.pv = 10; const e = poser(d, 'joueur', 'porteur-de-la-plume');
  assert.ok(arriveeConsulteDeck(cardById('porteur-de-la-plume')));
  rpgBlesserCreature(d, 'joueur', e.id, 99); assert.equal(d.joueur.pv, 11);
});
test('les fiches conservent leurs capacités et affichent les nouveautés', () => {
  const sus = cardById('susanoo'), cav = cardById('cavalier-des-deux-sabres'), ibis = cardById('ibis-des-comptes'), momie = cardById('momie-de-lin');
  assert.ok(sus.esquive && sus.arrivee.type === 'exil' && sus.honneur);
  assert.ok(cav.rapidite && !cav.overkill && cav.honneur); assert.deepEqual(cav.coupCritique, { chance: .25, fois: 2 });
  assert.ok(ibis.envol && ibis.arrivee.type === 'pioche-defausse'); assert.equal(ibis.tribut, 1);
  assert.ok(momie.defenseur && momie.destruction.type === 'jetons'); assert.deepEqual(momie.blocage, { chance: .25, def: 2 });
  for (const [carte, cle] of [[sus, 'esquive'], [cav, 'coupCritique'], [ibis, 'tribut'], [momie, 'blocage'], [momie, 'defenseur']]) assert.ok(pastillesPourCarte(carte).some(p => p.cle === cle), `${carte.id}: ${cle}`);
});
test('la Momie gagne +2 DEF en étant ciblée et conserve son Shabti', () => {
  const d = partie(false, 'sorcier'); const momie = poser(d, 'sorcier', 'momie-de-lin');
  d.tour = 'joueur'; const attaquant = poser(d, 'joueur', 'chien-du-guet'); attaquant.ready = true; attaquant.malInvocation = false;
  rpgReglerHasard(d, () => 0); assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', attaquant.id, momie.id).ok);
  assert.equal(momie.pv, 6); assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok); rpgFinDeTour(d);
  assert.equal(momie.pvMax, 4); rpgBlesserCreature(d, 'sorcier', momie.id, 99);
  assert.ok(d.sorcier.creatures.some(e => e.carteId === 'shabti'));
});
test('IA : choisit sans consommer le hasard réel en duel et MOBA', () => {
  const d = partie(false, 'sorcier', false); d.sorcier.deck = ['chien-du-guet', 'ureus-du-seuil']; poser(d, 'sorcier', 'porteur-de-la-plume');
  assert.ok(!d.renfortChoixEnAttente); assert.equal(d.sorcier.cimetiere.length, 1);
  const m = partie(true, 'sorcier'); m.sorcier.deck = ['chien-du-guet', 'ureus-du-seuil']; poser(m, 'sorcier', 'porteur-de-la-plume');
  let jets = 0; rpgReglerHasard(m, () => { jets++; return 0; });
  const avant = JSON.stringify(m), choix = rpgMobaChoisirRechercheIA(m, 'sorcier');
  assert.ok(rpgMobaCandidatsRecherche(m, 'sorcier').includes(choix)); assert.equal(jets, 0); assert.equal(JSON.stringify(m), avant);
  assert.ok(rpgMobaResoudreRecherche(m, 'sorcier', choix).ok);
});


function poserCher(d, side, id) {
  const offrande = poser(d, side, 'chien-du-guet');
  d[side].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, 'left', 0, { sacrificeIds: [offrande.id] })
    : rpgJouerCreature(d, side, id, null, { sacrificeId: offrande.id });
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  const mode = `${moba ? 'MOBA' : 'duel'}, ${side}`;
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`Cavalier : critique direct à 25 %, sans Overkill imprimé (${mode})`, () => {
    const d = partie(moba, side), cav = poserCher(d, side, 'cavalier-des-deux-sabres');
    assert.equal(cav.overkill, false); assert.equal(cav.rapidite, true); assert.deepEqual(cav.coupCritique, { chance: .25, fois: 2 });
    cav.ready = true; cav.malInvocation = false; rpgReglerHasard(d, () => .1);
    const vie = moba ? mobaVoie(d.moba, 'left').hp[enemy] : d[enemy].pv;
    const a = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, side, cav.id, null, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, side, cav.id, null);
    assert.ok(a.ok, JSON.stringify(a));
    const r = moba ? rpgMobaResoudreAttaqueIndividuelle(d, side) : rpgResoudreAttaqueIndividuelleClassique(d, side);
    assert.ok(r.ok, JSON.stringify(r)); assert.ok(r.resume.critiques.some(c => c.entiteId === cav.id && c.fois === 2));
    assert.equal(moba ? mobaVoie(d.moba, 'left').hp[enemy] : d[enemy].pv, vie - cav.atk * 2);
  });
  test(`Susanoo : son Esquive évite une attaque, exil toujours imprimé (${mode})`, () => {
    const d = partie(moba, enemy), sus = poserCher(d, enemy, 'susanoo');
    assert.ok(sus.esquive); assert.equal(sus.esquiveChance, .25);
    d.tour = side; const attaquant = poser(d, side, 'chien-du-guet'); attaquant.ready = true; attaquant.malInvocation = false;
    rpgReglerHasard(d, () => .1); const pv = sus.pv;
    const a = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, side, attaquant.id, sus.id, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, side, attaquant.id, sus.id);
    assert.ok(a.ok, JSON.stringify(a));
    const r = moba ? rpgMobaResoudreAttaqueIndividuelle(d, side) : rpgResoudreAttaqueIndividuelleClassique(d, side);
    assert.ok(r.ok, JSON.stringify(r)); assert.equal(sus.pv, pv);
  });
  test(`Ibis : pioche-défausse puis Tribut 1 sur attaque directe (${mode})`, () => {
    const d = partie(moba, side); d[side].deck = ['chien-du-guet'];
    const ibis = poser(d, side, 'ibis-des-comptes');
    assert.equal(ibis.tribut, 1); assert.equal(ibis.envol, true);
    if (d.defausseEnAttente) assert.ok(rpgDefausserCarte(d, side, 0).ok);
    ibis.ready = true; ibis.malInvocation = false; d[side].pv = 10;
    if (moba) mobaVoie(d.moba, 'left').hp[side] = 10;
    const vie = moba ? mobaVoie(d.moba, 'left').hp[enemy] : d[enemy].pv;
    const a = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, side, ibis.id, null, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, side, ibis.id, null);
    assert.ok(a.ok, JSON.stringify(a));
    const r = moba ? rpgMobaResoudreAttaqueIndividuelle(d, side) : rpgResoudreAttaqueIndividuelleClassique(d, side);
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(moba ? mobaVoie(d.moba, 'left').hp[enemy] : d[enemy].pv, vie - ibis.atk - 1);
    assert.equal(moba ? mobaVoie(d.moba, 'left').hp[side] : d[side].pv, 11);
  });
}

for (const moba of [false, true]) test(`Porteur réanimé : sa recherche s’ouvre après le choix de réanimation (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba); d.joueur.cimetiere = ['porteur-de-la-plume']; d.joueur.deck = ['ureus-du-seuil']; d.joueur.main = ['reanimation'];
  const r = moba ? rpgMobaLancerMagie(d, 'joueur', 'reanimation', null, 'left', null, { emplacementReanimation: 0 })
    : rpgLancerMagie(d, 'joueur', 'reanimation');
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(choisir(d, 'joueur', 'porteur-de-la-plume').ok);
  assert.ok(d.joueur.creatures.some(c => c.carteId === 'porteur-de-la-plume'));
  assert.equal((d.mobaRechercheEnAttente ?? d.renfortChoixEnAttente)?.sourceCarteId, 'porteur-de-la-plume');
  assert.ok(choisir(d, 'joueur', 'ureus-du-seuil').ok);
  assert.ok(d.joueur.cimetiere.includes('ureus-du-seuil'));
});
test('un effet externe peut toujours donner Overkill au Cavalier', () => {
  const d = partie(), cav = poserCher(d, 'joueur', 'cavalier-des-deux-sabres');
  assert.equal(cav.overkill, false); d.joueur.main = ['mur-de-boucliers'];
  assert.ok(rpgLancerMagie(d, 'joueur', 'mur-de-boucliers').ok); assert.equal(cav.overkill, true);
  rpgFinDeTour(d); assert.equal(cav.overkill, false); assert.deepEqual(cav.coupCritique, { chance: .25, fois: 2 });
});
