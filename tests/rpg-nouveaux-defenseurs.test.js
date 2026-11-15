import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { pastillesPourCarte, effetsDetailles } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgResoudreArriveeCiblee, rpgFinDeTour, rpgMulligan, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaDeclarerAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { choisirCibleAutoIA } from '../src/games/rpgAI.js';
import { rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';

const nouveaux = ['guetteuse-des-marees', 'guerrier-au-bouclier-rond', 'amani-des-ksour', 'gardienne-de-la-balance', 'onna-musha-des-cendres'];
function partie() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  for (const c of ['joueur', 'sorcier']) d[c].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  return d;
}
function pose(d, c, id, cible = null, options = {}) {
  d[c].invocationNormaleJouee = false;
  d[c].main.push(id);
  const tour = d.tour; d.tour = c;
  const r = rpgJouerCreature(d, c, id, cible, options);
  d.tour = tour;
  assert.ok(r.ok, JSON.stringify(r));
  return r;
}

test('les cinq gardiens choisis portent Défenseur et gardent leurs capacités', () => {
  for (const id of nouveaux) {
    const carte = cardById(id);
    assert.equal(carte.defenseur, true, id);
    assert.match(carte.text, /Défenseur/, id);
    assert.equal(pastillesPourCarte(carte).filter(p => p.cle === 'defenseur').length, 1, id);
  }
  assert.equal(cardById('guetteuse-des-marees').arrivee.type, 'exil-temporaire');
  assert.equal(cardById('guerrier-au-bouclier-rond').arrivee.type, 'bouclier');
  assert.equal(cardById('amani-des-ksour').aura.def, 1);
  assert.equal(cardById('gardienne-de-la-balance').destruction.type, 'soin');
  assert.equal(cardById('onna-musha-des-cendres').esquive, true);
  assert.equal(cardById('onna-musha-des-cendres').honneur, 1);
});

test('Veilleuse donne le bouclier et Défenseur à une autre alliée durablement', () => {
  const d = partie();
  const allie = pose(d, 'joueur', 'ashigaru-des-braises').entite;
  const adversaire = pose(d, 'sorcier', 'ashigaru-des-braises').entite;
  const r = pose(d, 'joueur', 'veilleuse-des-citernes', null, { cibleDifferee: true });
  assert.ok(r.arriveeEnAttente);
  assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', adversaire.id).ok, false);
  assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', r.entite.id).ok, false);
  assert.ok(rpgResoudreArriveeCiblee(d, 'joueur', allie.id).ok);
  assert.equal(estDefenseur(allie), true); assert.equal(allie.bouclier, 1);
  assert.equal(r.entite.defenseur, false);
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'sorcier', adversaire.id), { cibles: [allie.id], directe: false });
  rpgFinDeTour(d);
  assert.equal(estDefenseur(allie), true, 'le don survit au changement de tour');
  const restored = JSON.parse(JSON.stringify(d));
  assert.equal(estDefenseur(restored.joueur.creatures.find(e => e.id === allie.id)), true, 'le don est sauvegardé');
  assert.match(effetsDetailles(cardById('veilleuse-des-citernes')).texte, /gagne Défenseur/);
});

test('Veilleuse seule reçoit les deux effets', () => {
  const d = partie(); const r = pose(d, 'joueur', 'veilleuse-des-citernes');
  assert.equal(estDefenseur(r.entite), true); assert.equal(r.entite.bouclier, 1);
});

test('l’IA ne choisit ni un site ni un Défenseur fragile avant un bon nouveau gardien', () => {
  const d = partie();
  const entite = (id, pv, def = false) => ({ id, carteId: 'ashigaru-des-braises', atk: 1, def: pv, pv, pvMax: pv, defenseur: def });
  d.sorcier.creatures = [entite('deja', 3, true), entite('solide', 4), { ...entite('site', 12), carteId: 'source-de-bimini' }];
  assert.equal(choisirCibleAutoIA(d, 'sorcier', cardById('veilleuse-des-citernes')), 'solide');
});

test('en PvP l’arrivée ciblée donne Défenseur à une alliée', () => {
  const d = partie();
  const allie = pose(d, 'joueur', 'ashigaru-des-braises').entite;
  d.pvp = true; d.mulliganFait = { joueur: true, sorcier: true }; d.phase = 'principale';
  const r = pose(d, 'joueur', 'veilleuse-des-citernes', null, { cibleDifferee: true });
  assert.ok(r.arriveeEnAttente);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: allie.id }).ok);
  assert.equal(estDefenseur(allie), true); assert.equal(allie.bouclier, 1);
});

test('en MOBA la Veilleuse donne Défenseur à travers les voies, priorité limitée à celle du gardien', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .9 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  d.joueur.main = ['ashigaru-des-braises'];
  const allie = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d);
  d.sorcier.main = ['ashigaru-des-braises'];
  const ennemi = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d);
  d.joueur.main = ['veilleuse-des-citernes']; d.joueur.mana.eau = 20;
  const r = rpgMobaJouerCreature(d, 'joueur', 'veilleuse-des-citernes', 'right', 0);
  assert.ok(r.ok && r.arriveeEnAttente, JSON.stringify(r));
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaChoisirArriveeIA(d, 'joueur'), allie.id);
  assert.equal(JSON.stringify(d), avant, 'la simulation de l’IA ne mute pas la partie');
  assert.ok(rpgMobaResoudreArrivee(d, 'joueur', allie.id).ok);
  assert.equal(estDefenseur(allie), true); assert.equal(allie.bouclier, 1);
  rpgFinDeTour(d); ennemi.ready = true;
  assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'sorcier', ennemi.id, 'left'), { cibles: [allie.id], directe: false });
  assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, 'sorcier', ennemi.id, null, 'left').ok, false);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'sorcier', ennemi.id, allie.id, 'left').ok);
});


test('le don ne suit pas une créature qui quitte le champ puis revient', () => {
  const d = partie();
  const allie = pose(d, 'joueur', 'ashigaru-des-braises').entite;
  pose(d, 'joueur', 'veilleuse-des-citernes', allie.id);
  assert.equal(estDefenseur(allie), true);
  const guetteuse = pose(d, 'joueur', 'guetteuse-des-marees', allie.id).entite;
  assert.equal(estDefenseur(guetteuse), true);
  assert.ok(!d.joueur.creatures.includes(allie));
  rpgFinDeTour(d);
  const retour = d.joueur.creatures.find(e => e.carteId === 'ashigaru-des-braises');
  assert.ok(retour); assert.notEqual(retour.id, allie.id);
  assert.equal(estDefenseur(retour), false);
});

test('un site ne peut pas être choisi et ne supprime pas le repli sur la Veilleuse', () => {
  const d = partie();
  d.joueur.creatures.push({ id: 'site', carteId: 'source-de-bimini', name: 'Source', pv: 1, def: 1, pvMax: 1 });
  const r = pose(d, 'joueur', 'veilleuse-des-citernes');
  assert.equal(estDefenseur(r.entite), true);
  assert.equal(r.entite.bouclier, 1);
  assert.equal(estDefenseur(d.joueur.creatures[0]), false);
});

test('la prise en cale retire le Défenseur donné sans retirer le Défenseur imprimé', () => {
  const d = partie();
  const allie = pose(d, 'joueur', 'ashigaru-des-braises').entite;
  pose(d, 'joueur', 'veilleuse-des-citernes', allie.id);
  const capteur = pose(d, 'sorcier', 'rais-de-la-galiote', allie.id).entite;
  assert.equal(capteur.enCale?.entite.id, allie.id);
  assert.equal(estDefenseur(capteur.enCale.entite), false);

  const d2 = partie();
  const gardienne = pose(d2, 'joueur', 'gardienne-des-portes-de-sable').entite;
  pose(d2, 'joueur', 'veilleuse-des-citernes', gardienne.id);
  const cotre = pose(d2, 'sorcier', 'cotre-de-course', gardienne.id).entite;
  assert.equal(cotre.enCale?.entite.id, gardienne.id);
  assert.equal(estDefenseur(cotre.enCale.entite), true, 'la capacité imprimée subsiste');
});

test('une créature qui possède déjà Défenseur garde une seule pastille après le don', () => {
  const d = partie();
  const gardienne = pose(d, 'joueur', 'gardienne-des-portes-de-sable').entite;
  pose(d, 'joueur', 'veilleuse-des-citernes', gardienne.id);
  assert.equal(gardienne.defenseur, true);
  assert.equal(estDefenseur(gardienne), true);
  assert.equal(pastillesPourCarte({ ...cardById(gardienne.carteId), ...gardienne }).filter(p => p.cle === 'defenseur').length, 1);
});


test('les anciennes sauvegardes des cinq cartes retrouvent leur Défenseur imprimé', () => {
  for (const carteId of nouveaux) {
    const ancienne = { carteId, defenseur: false };
    assert.equal(estDefenseur(ancienne), true, carteId);
  }
});


test('la Veilleuse seule en MOBA reçoit Défenseur et Bouclier', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .9 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  d.joueur.main = ['veilleuse-des-citernes']; d.joueur.mana.eau = 20;
  const r = rpgMobaJouerCreature(d, 'joueur', 'veilleuse-des-citernes', 'left', 0);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(estDefenseur(r.entite), true); assert.equal(r.entite.bouclier, 1);
});

test('les cinq nouveaux Défenseurs imposent leur priorité dès leur arrivée', () => {
  for (const id of nouveaux) {
    const d = partie();
    const gardien = pose(d, 'joueur', id).entite;
    const ennemi = pose(d, 'sorcier', 'ashigaru-des-braises').entite;
    assert.equal(estDefenseur(gardien), true, id);
    assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'sorcier', ennemi.id), { cibles: [gardien.id], directe: false }, id);
  }
});

const autresGardiens = ['gardienne-des-sables-ensevelis', 'gardienne-des-derniers-noms', 'hatamoto-des-cendres', 'dune-marchante', 'veilleur-du-dernier-crepuscule'];

test('cinq autres gardiens ont Défenseur sans perdre leurs capacités imprimées', () => {
  for (const id of autresGardiens) {
    const carte = cardById(id);
    assert.equal(carte.defenseur, true, id);
    assert.match(carte.text, /Défenseur/, id);
    assert.equal(pastillesPourCarte(carte).filter(p => p.cle === 'defenseur').length, 1, id);
    assert.equal(estDefenseur({ carteId: id, defenseur: false }), true, `ancienne sauvegarde : ${id}`);
  }
  assert.equal(cardById('gardienne-des-sables-ensevelis').arrivee.type, 'renfort-choisi');
  assert.equal(cardById('gardienne-des-sables-ensevelis').arrivee.bouclierRenfort, true);
  assert.equal(cardById('gardienne-des-derniers-noms').destruction.type, 'renfort-ascension');
  assert.equal(cardById('hatamoto-des-cendres').honneur, 1);
  assert.match(cardById('hatamoto-des-cendres').text, /Harakiri/);
  assert.equal(cardById('dune-marchante').arrivee.type, 'recherche-deck-categories');
  assert.equal(cardById('veilleur-du-dernier-crepuscule').contreAttaque, true);
});

test('ces gardiens attirent les attaques ciblées en classique et PvP', () => {
  for (const pvp of [false, true]) for (const id of autresGardiens) {
    const d = partie(); d.pvp = pvp;
    const allie = pose(d, 'joueur', 'ashigaru-des-braises').entite;
    const ennemi = pose(d, 'sorcier', 'ashigaru-des-braises').entite;
    const gardien = pose(d, 'joueur', id).entite;
    assert.equal(estDefenseur(gardien), true, id);
    assert.equal(estDefenseur(allie), false);
    assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'sorcier', ennemi.id), { cibles: [gardien.id], directe: false }, `${id}, PvP=${pvp}`);
  }
});

test('ces gardiens attirent les attaques ciblées dans leur voie en MOBA', () => {
  for (const id of autresGardiens) {
    const deck = Array(30).fill('ashigaru-des-braises');
    const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .9 });
    assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
    for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
    rpgFinDeTour(d);
    d.sorcier.main = ['ashigaru-des-braises'];
    const ennemi = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(ennemi, id);
    rpgFinDeTour(d);
    d.joueur.main = [id];
    const r = rpgMobaJouerCreature(d, 'joueur', id, 'left', 0);
    assert.ok(r.ok, `${id}: ${JSON.stringify(r)}`);
    assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'sorcier', ennemi.id, 'left'), { cibles: [r.entite.id], directe: false }, id);
  }
});


test('la priorité du Veilleur protège son allié et sa Contre-attaque riposte toujours', () => {
  const d = partie();
  const tireur = pose(d, 'joueur', 'ashigaru-des-braises').entite;
  const allie = pose(d, 'sorcier', 'ashigaru-des-braises').entite;
  const veilleur = pose(d, 'sorcier', 'veilleur-du-dernier-crepuscule').entite;
  tireur.ready = true; tireur.malInvocation = false; tireur.coupRapide = true;
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', tireur.id, allie.id).raison, 'cible');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', tireur.id, veilleur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').ok);
  assert.ok(!d.joueur.creatures.some(e => e.id === tireur.id), 'la riposte détruit le tireur');
  assert.ok(d.log.some(ligne => ligne.includes('Contre-attaque : Veilleur du dernier crépuscule')));
});

test('en PvP le Hatamoto interdit la frappe directe et protège son allié', () => {
  const d = partie();
  const tireur = pose(d, 'joueur', 'ashigaru-des-braises').entite;
  const allie = pose(d, 'sorcier', 'ashigaru-des-braises').entite;
  const garde = pose(d, 'sorcier', 'hatamoto-des-cendres').entite;
  tireur.ready = true; tireur.malInvocation = false; tireur.coupRapide = true;
  d.pvp = true; d.tour = 'joueur'; d.phase = 'principale'; d.mulliganFait = { joueur: true, sorcier: true };
  const attaquer = cibleId => rpgPvpAppliquer(d, 'joueur', { type: 'attaquer', declarer: true, attaquants: [tireur.id], cibleId });
  assert.equal(attaquer(null).raison, 'cible');
  assert.equal(attaquer(allie.id).raison, 'cible');
  assert.ok(attaquer(garde.id).ok);
});
