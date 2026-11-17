import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { pastillesPourCarte, definitionPastille } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgVainqueur, rpgBlesserCreature, rpgAttaquerCreature, rpgLancerMagie, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi } from '../src/games/rpgDuel.js';
import { rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaPlacementCoherent, rpgMobaLancerMagie, rpgMobaResoudreRecherche } from '../src/games/rpgMobaLocal.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

function partie(moba = false, pvp = false) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp, rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const s of ['joueur', 'sorcier']) { d[s].main = []; d[s].deck = []; d[s].manaChoixEnAttente = null; d[s].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40])); }
  return d;
}
function poser(d, side, id, lane = 'left', slot = 0, sacrificeIds = []) {
  d.tour = side; d[side].main.push(id); d[side].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[side] = false;
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, lane, slot, { sacrificeIds }) : rpgJouerCreature(d, side, id, null, { sacrificeIds });
  assert.ok(r.ok, JSON.stringify(r)); return r.entite;
}
test('fiches, capacités conservées et descriptions adaptées', () => {
  const v = cardById('veuve-des-urnes'), c = cardById('chien-du-guet'), p = cardById('passeur-au-masque-de-chacal'), dame = cardById('dame-aux-ailes-d-or');
  assert.equal(v.tribut, 1); assert.equal(v.arrivee.type, 'payer-vie-pioche');
  assert.ok(c.butin); assert.deepEqual(c.blocage, { chance: .15, def: 2 });
  assert.equal(p.arrivee.type, 'reanimation'); assert.deepEqual(p.malediction, { atk: 1, def: 0 });
  assert.ok(dame.envol && dame.volDeVie && dame.coupRapide && dame.destruction.amount === 5);
  const shield = pastillesPourCarte(dame).find(p => p.label === 'Bouclier parfait'); assert.ok(shield); assert.match(definitionPastille(shield), /attaque ou magie/);
  const curse = pastillesPourCarte(p).find(p => p.cle === 'malediction'); assert.equal(curse.valeur, 1); assert.match(definitionPastille(curse), /perdent 1 point/);
  assert.match(definitionPastille(pastillesPourCarte(cardById('la-barbe-noire')).find(p => p.cle === 'malediction')), /perdent 2 points/);
});
for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`Veuve paie puis pioche ${moba ? 'MOBA' : 'duel'} ${side}`, () => {
    const d = partie(moba); d[side].deck = ['papyrus']; const avant = moba ? mobaVoie(d.moba, 'left').hp[side] : d[side].pv;
    poser(d, side, 'veuve-des-urnes');
    assert.equal(moba ? mobaVoie(d.moba, 'left').hp[side] : d[side].pv, avant - 2); assert.deepEqual(d[side].main, ['papyrus']);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Veuve paie même si elle perd ${moba ? 'MOBA' : 'duel'} ${side}`, () => {
    const d = partie(moba); d[side].deck = ['papyrus'];
    if (moba) { const left = mobaVoie(d.moba, 'left'); left.hp[side] = 2; const right = mobaVoie(d.moba, 'right'); right.active = false; right.conqueredBy = enemy; }
    else d[side].pv = 1;
    poser(d, side, 'veuve-des-urnes'); assert.equal(rpgVainqueur(d), enemy); assert.deepEqual(d[side].main, ['papyrus']);
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  for (const jet of [0.1, 0.9]) test(`Esquive de l'attaquant contre la réplique ${jet} ${moba ? 'MOBA' : 'duel'} ${side}`, () => {
    const d = partie(moba); const cible = poser(d, enemy, 'chacal-du-seuil'); const a = poser(d, side, 'chien-du-guet');
    a.esquive = true; a.esquiveChance = .15; a.ready = true; a.malInvocation = false;
    cible.blocage = null; rpgReglerHasard(d, () => jet);
    const dec = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, cible.id, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, side, a.id, cible.id);
    assert.ok(dec.ok, JSON.stringify(dec));
    const res = moba ? rpgMobaResoudreAttaqueIndividuelle(d, side) : rpgResoudreAttaqueIndividuelleClassique(d, side);
    assert.ok(res.ok, JSON.stringify(res)); assert.equal(d[side].creatures.some(x => x.id === a.id), jet < .15); assert.equal(d[enemy].creatures.some(x => x.id === cible.id), false);
    if (jet < .15) assert.ok(d.log.some(line => line.includes('esquive')));
  });
}
test('Esquive de l’attaquant aussi dans le combat historique', () => {
  const d = partie(); const cible = poser(d, 'sorcier', 'chacal-du-seuil'); const a = poser(d, 'joueur', 'chien-du-guet');
  a.esquive = true; a.esquiveChance = .15; a.ready = true; a.malInvocation = false; cible.blocage = null;
  rpgReglerHasard(d, () => 0); assert.ok(rpgAttaquerCreature(d, 'joueur', a.id, cible.id).ok); assert.equal(a.pv, 2);
});
for (const side of ['joueur', 'sorcier']) test(`PvP : paiement mortel réellement appliqué par le protocole ${side}`, () => {
  const d = partie(false, true); d.tour = side; d[side].pv = 2; d[side].deck = ['papyrus']; d[side].main = ['veuve-des-urnes'];
  assert.ok(rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: 'veuve-des-urnes' }).ok);
  assert.equal(rpgVainqueur(d), side === 'joueur' ? 'sorcier' : 'joueur'); assert.deepEqual(d[side].main, ['papyrus']);
});
for (const moba of [false, true]) test(`Veuve réanimée : effet d'arrivée obligatoire (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba, true); d.tour = 'joueur'; d.joueur.cimetiere = ['veuve-des-urnes']; d.joueur.deck = ['papyrus']; d.joueur.main = ['reanimation'];
  const before = moba ? mobaVoie(d.moba, 'left').hp.joueur : d.joueur.pv;
  const r = moba ? rpgMobaLancerMagie(d, 'joueur', 'reanimation', null, 'left', null, { emplacementReanimation: 0 }) : rpgLancerMagie(d, 'joueur', 'reanimation');
  assert.ok(r.ok, JSON.stringify(r)); const choice = rpgCartesRenfortChoisi(d, 'joueur').find(c => c.id === 'veuve-des-urnes'); assert.ok(choice);
  const selection = moba ? rpgMobaResoudreRecherche(d, 'joueur', choice.id, choice.index) : rpgResoudreRenfortChoisi(d, 'joueur', choice.index);
  assert.ok(selection.ok, JSON.stringify(selection)); assert.equal(moba ? mobaVoie(d.moba, 'left').hp.joueur : d.joueur.pv, before - 2); assert.deepEqual(d.joueur.main, ['papyrus']);
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
for (const moba of [false, true]) test(`Passeur : Malédiction suit les arrivées et disparaît (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba); const ennemi = poser(d, 'sorcier', 'chien-du-guet', 'left', 0);
  const autreVoie = moba ? poser(d, 'sorcier', 'chien-du-guet', 'right', 0) : null;
  const offrande = poser(d, 'joueur', 'chien-du-guet');
  const p = poser(d, 'joueur', 'passeur-au-masque-de-chacal', 'left', 0, [offrande.id]);
  const choix = rpgCartesRenfortChoisi(d, 'joueur').find(c => c.id === 'chien-du-guet');
  assert.ok(choix); assert.ok((moba ? rpgMobaResoudreRecherche(d, 'joueur', choix.id, choix.index) : rpgResoudreRenfortChoisi(d, 'joueur', choix.index)).ok);
  assert.equal(ennemi.atk, 1); if (moba) assert.equal(autreVoie.atk, 2);
  const tard = poser(d, 'sorcier', 'chien-du-guet', 'left', 1); assert.equal(tard.atk, 1);
  rpgBlesserCreature(d, 'joueur', p.id, 99); assert.equal(ennemi.atk, 2); assert.equal(tard.atk, 2);
});
for (const moba of [false, true]) test(`Dame : bouclier doré, Attaque ciblée et Vol de vie (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba); const offrande = poser(d, 'joueur', 'chien-du-guet');
  const dame = poser(d, 'joueur', 'dame-aux-ailes-d-or', 'left', 0, [offrande.id]);
  assert.ok(dame.bouclierLumiere && dame.envol && dame.coupRapide && dame.volDeVie);
  const hp = dame.pv;
  if (moba) { rpgBlesserCreature(d, 'joueur', dame.id, 2, null, null, 'capacite', null, null, 'sorcier'); assert.equal(dame.pv, hp); assert.ok(dame.bouclierLumiere); }
  rpgBlesserCreature(d, 'joueur', dame.id, 3, null, null, 'attaque', null, null, 'sorcier'); assert.equal(dame.pv, hp); assert.equal(dame.bouclierLumiere, false);
  dame.ready = true; dame.malInvocation = false; const avant = moba ? mobaVoie(d.moba, 'left').hp.joueur : d.joueur.pv; if (moba) mobaVoie(d.moba, 'left').hp.joueur -= 3; else d.joueur.pv -= 3;
  rpgReglerHasard(d, () => .9);
  const decl = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', dame.id, null, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', dame.id, null);
  assert.ok(decl.ok, JSON.stringify(decl)); const result = moba ? rpgMobaResoudreAttaqueIndividuelle(d, 'joueur') : rpgResoudreAttaqueIndividuelleClassique(d, 'joueur'); assert.ok(result.ok);
  assert.equal(moba ? mobaVoie(d.moba, 'left').hp.joueur : d.joueur.pv, avant - 1);
});
for (const moba of [false, true]) test(`Veuve réanimée peut vaincre son contrôleur (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba, true); d.tour = 'joueur'; d.joueur.cimetiere = ['veuve-des-urnes']; d.joueur.deck = ['papyrus']; d.joueur.main = ['reanimation'];
  if (moba) { mobaVoie(d.moba, 'left').hp.joueur = 1; const right = mobaVoie(d.moba, 'right'); right.active = false; right.conqueredBy = 'sorcier'; } else d.joueur.pv = 1;
  assert.ok((moba ? rpgMobaLancerMagie(d, 'joueur', 'reanimation', null, 'left', null, { emplacementReanimation: 0 }) : rpgLancerMagie(d, 'joueur', 'reanimation')).ok);
  const c = rpgCartesRenfortChoisi(d, 'joueur')[0];
  const r = moba ? rpgMobaResoudreRecherche(d, 'joueur', c.id, c.index) : rpgResoudreRenfortChoisi(d, 'joueur', c.index);
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(rpgVainqueur(d), 'sorcier'); assert.deepEqual(d.joueur.main, ['papyrus']); if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
for (const moba of [false, true]) test(`Esquive de l'attaquant contre Contre-attaque ciblée (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba); const cible = poser(d, 'sorcier', 'chacal-du-seuil'); cible.contreAttaque = true;
  const a = poser(d, 'joueur', 'chien-du-guet'); a.esquive = true; a.esquiveChance = .15; a.coupRapide = true; a.ready = true; a.malInvocation = false;
  const jets = [.9, .1]; rpgReglerHasard(d, () => jets.shift() ?? .1);
  assert.ok((moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, cible.id, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id)).ok);
  assert.ok((moba ? rpgMobaResoudreAttaqueIndividuelle(d, 'joueur') : rpgResoudreAttaqueIndividuelleClassique(d, 'joueur')).ok);
  assert.equal(a.pv, 2); assert.ok(d.log.some(l => l.includes('esquive')));
});
for (const moba of [false, true]) test(`Momie de lin : le coût d'Invocation spéciale reste distinct de l'arrivée (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba, true); d.tour = 'joueur';
  d.joueur.cimetiere = ['chien-du-guet', 'papyrus'];
  d.joueur.main = ['momie-de-lin'];
  const r = moba
    ? rpgMobaJouerCreature(d, 'joueur', 'momie-de-lin', 'left', 0, { choixCoutInvocation: 'chien-du-guet', sacrificeIds: [] })
    : rpgJouerCreature(d, 'joueur', 'momie-de-lin', null, { choixCoutInvocation: 'chien-du-guet' });
  assert.ok(r.ok, JSON.stringify(r));
  // Le coût exile la créature choisie, sans rien prendre d'autre au cimetière.
  assert.deepEqual(d.joueur.exil ?? [], ['chien-du-guet']);
  assert.deepEqual(d.joueur.cimetiere, ['papyrus']);
  assert.ok(!(moba ? d.moba.creaturesJouees.joueur : d.joueur.invocationNormaleJouee),
    'la spéciale ne consomme pas l’invocation normale');
  assert.ok(d.joueur.creatures.some((entite) => entite.carteId === 'momie-de-lin'));
});
test('MOBA : payer depuis le centre rallié touche les deux voies latérales', () => {
  const d = partie(true); d.tour = 'joueur'; const center = mobaVoie(d.moba, 'center'); center.active = false; center.conqueredBy = 'joueur'; d.moba.centerJoined = { side: 'joueur', laneId: null };
  d.joueur.main = ['veuve-des-urnes']; d.joueur.deck = ['papyrus'];
  const left = mobaVoie(d.moba, 'left').hp.joueur, right = mobaVoie(d.moba, 'right').hp.joueur;
  const r = rpgMobaJouerCreature(d, 'joueur', 'veuve-des-urnes', 'center', 0); assert.ok(r.ok, JSON.stringify(r));
  assert.equal(mobaVoie(d.moba, 'left').hp.joueur, left - 2); assert.equal(mobaVoie(d.moba, 'right').hp.joueur, right - 2); assert.ok(rpgMobaPlacementCoherent(d));
});
for (const moba of [false, true]) test(`Malédiction 1 se cumule par source (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba, true), victime = poser(d, 'sorcier', 'chien-du-guet');
  const sacrifice = poser(d, 'joueur', 'chien-du-guet'); const p1 = poser(d, 'joueur', 'passeur-au-masque-de-chacal', 'left', 0, [sacrifice.id]);
  let c = rpgCartesRenfortChoisi(d, 'joueur')[0]; assert.ok((moba ? rpgMobaResoudreRecherche(d, 'joueur', c.id, c.index) : rpgResoudreRenfortChoisi(d, 'joueur', c.index)).ok);
  const chien = d.joueur.creatures.find(e => e.carteId === 'chien-du-guet');
  const p2 = poser(d, 'joueur', 'passeur-au-masque-de-chacal', 'left', 1, [chien.id]);
  c = rpgCartesRenfortChoisi(d, 'joueur')[0]; assert.ok((moba ? rpgMobaResoudreRecherche(d, 'joueur', c.id, c.index) : rpgResoudreRenfortChoisi(d, 'joueur', c.index)).ok);
  assert.equal(victime.atk, 0); rpgBlesserCreature(d, 'joueur', p1.id, 99); assert.equal(victime.atk, 1); rpgBlesserCreature(d, 'joueur', p2.id, 99); assert.equal(victime.atk, 2);
});
for (const moba of [false, true]) test(`Chien : Blocage à l’annonce sans perdre Butin (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba), chien = poser(d, 'sorcier', 'chien-du-guet'); const a = poser(d, 'joueur', 'chacal-du-seuil'); a.ready = true; a.malInvocation = false;
  rpgReglerHasard(d, () => .1);
  const r = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, chien.id, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, chien.id);
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(chien.pvMax, 4); assert.ok(chien.butin);
});
for (const moba of [false, true]) test(`Susanoo attaque et esquive la réplique (${moba ? 'MOBA' : 'duel'})`, () => {
  const d = partie(moba), cible = poser(d, 'sorcier', 'chacal-du-seuil');
  const sacrifice = poser(d, 'joueur', 'chien-du-guet'); const a = poser(d, 'joueur', 'susanoo', 'left', 0, [sacrifice.id]);
  assert.ok(a.esquive); a.ready = true; a.malInvocation = false; rpgReglerHasard(d, () => .1);
  assert.ok((moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, cible.id, 'left') : rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id, cible.id)).ok);
  assert.ok((moba ? rpgMobaResoudreAttaqueIndividuelle(d, 'joueur') : rpgResoudreAttaqueIndividuelleClassique(d, 'joueur')).ok);
  assert.equal(a.pv, 3); assert.ok(d.log.some(l => l.includes('esquive'))); assert.ok(!d.sorcier.creatures.includes(cible));
});
test('MOBA : paiement mortel conquiert une voie même sans finir la partie', () => {
  const d = partie(true); d.joueur.deck = ['papyrus']; mobaVoie(d.moba, 'left').hp.joueur = 2;
  poser(d, 'joueur', 'veuve-des-urnes'); assert.equal(mobaVoie(d.moba, 'left').conqueredBy, 'sorcier'); assert.equal(rpgVainqueur(d), null); assert.deepEqual(d.joueur.main, ['papyrus']); assert.ok(rpgMobaPlacementCoherent(d));
});

test('Bouclier parfait utilise les animations de Bouclier en doré, en duel et MOBA', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const moba = readFileSync(new URL('../src/games/RpgMobaBoard.jsx', import.meta.url), 'utf8');
  assert.match(page, /<EgideBouclier montant=\{entite\.bouclier \?\? 0\} lumiere=\{Boolean\(entite\.bouclierLumiere\)\}/);
  assert.match(css, /\.rpg-bouclier-egide--lumiere,\s*\.rpg-bouclier-impact--lumiere\s*\{[^}]*255, 222, 130/s);
  assert.match(moba, /bouclier: \{ montant: 1, token, lumiere: true \}/);
});
