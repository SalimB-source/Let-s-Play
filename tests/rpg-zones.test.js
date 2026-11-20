/**
 * Les zones des sorts de masse (14a).
 *
 * Une ligne tient la géométrie : une rangée est une ligne d'un camp, une
 * colonne traverse les deux camps (quatre cases), un carré est un bloc de
 * quatre dans un seul camp. Une autre tient le contrat du moteur : le sort ne
 * balaie plus la table, il couvre la zone désignée, et tout ce qui s'y tient
 * encaisse — les créatures du lanceur comprises.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie } from '../src/games/rpgDuel.js';
import {
  RPG_ZONES_FORMES, RPG_ZONE_TAILLE, ancresDeZone, casesDeZone, entiteDansZone,
  libelleZone, meilleureZone, rangeeZone, zoneDepuisAncre, zoneValide,
} from '../src/games/rpgZones.js';
import { RPG_ZONE_CARTES, zoneFormeCarte } from '../src/games/rpgZoneCartes.js';
import { positionDe } from '../src/games/rpgChamp.js';

const CARTES = ['dune-marchante', 'novice-des-cendres', 'chacal-du-seuil', 'ouvrier-du-natron',
  'garde-du-voile', 'messagere-des-cendres', 'ashigaru-des-braises', 'hatamoto-des-cendres'];

function scene() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], rng: () => 0.5, lignes: true, modeMana: 'essai',
    joueurCouleurs: ['braise', 'neige'], sorcierCouleurs: ['braise', 'neige'],
  });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((c) => [c, 40]));
  }
  return d;
}

let compteur = 0;
function poser(d, cote, { carte = null, caseVoulue = null } = {}) {
  const id = carte ?? CARTES[compteur++ % CARTES.length];
  d.tour = cote;
  d[cote].invocationNormaleJouee = false;
  d[cote].main.push(id);
  const res = rpgJouerCreature(d, cote, id, null, caseVoulue === null ? {} : { emplacement: caseVoulue });
  assert.ok(res.ok, `${id} : ${res.raison}`);
  const entite = res.entite;
  entite.pv = entite.pvMax = entite.def = 10;
  return entite;
}

function lancer(d, carteId, cote = 'joueur', zone = null) {
  d.tour = cote;
  d[cote].main.push(carteId);
  return rpgLancerMagie(d, cote, carteId, null, null, zone ? { zone } : null);
}

test('trois formes, trois tailles : rangée 5, colonne 4, carré 4', () => {
  assert.deepEqual([...RPG_ZONES_FORMES].sort(), ['carre', 'colonne', 'rangee']);
  const rangee = { forme: 'rangee', camp: 'sorcier', ligne: 'front' };
  const colonne = { forme: 'colonne', colonne: 1 };
  const carre = { forme: 'carre', camp: 'joueur', colonne: 2 };
  assert.equal(casesDeZone(rangee).length, 5);
  assert.equal(casesDeZone(colonne).length, 4);
  assert.equal(casesDeZone(carre).length, 4);
  assert.equal(RPG_ZONE_TAILLE.rangee, 5);
  assert.equal(RPG_ZONE_TAILLE.colonne, 4);
  assert.equal(RPG_ZONE_TAILLE.carre, 4);
});

test('les cases d’une colonne traversent les deux camps, celles d’une rangée un seul', () => {
  const colonne = casesDeZone({ forme: 'colonne', colonne: 2 });
  assert.deepEqual(colonne.map((c) => `${c.camp}:${c.index}`).sort(),
    ['joueur:2', 'joueur:7', 'sorcier:2', 'sorcier:7']);
  const rangee = casesDeZone({ forme: 'rangee', camp: 'sorcier', ligne: 'fond' });
  assert.deepEqual(rangee.map((c) => `${c.camp}:${c.index}`), ['sorcier:5', 'sorcier:6', 'sorcier:7', 'sorcier:8', 'sorcier:9']);
});

test('un carré tient deux colonnes d’un seul camp, la dernière paire en repli', () => {
  const carre = casesDeZone({ forme: 'carre', camp: 'sorcier', colonne: 3 });
  assert.deepEqual(carre.map((c) => c.index).sort(), [3, 4, 8, 9]);
  assert.ok(carre.every((c) => c.camp === 'sorcier'));
  // Ancre sur la cinquième colonne : le carré se replie sur la dernière paire.
  assert.deepEqual(casesDeZone({ forme: 'carre', camp: 'sorcier', colonne: 4 }).map((c) => c.colonne).sort(),
    [3, 3, 4, 4]);
});

test('l’ancre se lit depuis une case, et une zone invalide est refusée', () => {
  assert.deepEqual(zoneDepuisAncre('rangee', 'sorcier', 7), { forme: 'rangee', camp: 'sorcier', ligne: 'fond' });
  assert.deepEqual(zoneDepuisAncre('colonne', 'joueur', 3), { forme: 'colonne', colonne: 3 });
  assert.deepEqual(zoneDepuisAncre('carre', 'joueur', 9), { forme: 'carre', camp: 'joueur', colonne: 3 });
  assert.equal(zoneValide(null), false);
  assert.equal(zoneValide({ forme: 'rangee', camp: 'sorcier', ligne: 'front' }), true);
  assert.equal(zoneValide({ forme: 'colonne', colonne: 7 }), false);
  assert.equal(zoneValide({ forme: 'carre', camp: 'nul', colonne: 0 }), false);
});

test('les ancres d’une forme : dix par camp pour la rangée, cinq colonnes, huit carrés', () => {
  assert.equal(ancresDeZone('colonne').length, 5);
  assert.equal(ancresDeZone('carre').length, 10);
  assert.equal(ancresDeZone('rangee').length, 4);
  assert.equal(ancresDeZone('rangee', 'sorcier').length, 2);
  assert.deepEqual(ancresDeZone('rangee').slice(0, 2).map((a) => a.camp), ['sorcier', 'sorcier']);
});

test('le libellé nomme la zone en toutes lettres', () => {
  assert.match(libelleZone({ forme: 'rangee', camp: 'sorcier', ligne: 'front' }), /front/);
  assert.match(libelleZone({ forme: 'rangee', camp: 'sorcier', ligne: 'front' }), /camp adverse/);
  assert.match(libelleZone({ forme: 'colonne', colonne: 2 }), /colonnes 3 et 4|colonne 3/);
  assert.match(libelleZone({ forme: 'carre', camp: 'joueur', colonne: 0 }), /colonnes 1 et 2/);
});

test('une entité n’est dans la zone que sur une case qu’elle couvre, dans son camp', () => {
  const rangee = { forme: 'rangee', camp: 'sorcier', ligne: 'front' };
  assert.equal(entiteDansZone(rangee, 'sorcier', { emplacement: 2 }), true);
  assert.equal(entiteDansZone(rangee, 'sorcier', { emplacement: 7 }), false);
  // Les index se répètent d'un camp à l'autre : le camp fait partie de la case.
  assert.equal(entiteDansZone(rangee, 'joueur', { emplacement: 2 }), false);
  // Sans emplacement (duel d'avant les lignes), l'ordre du champ tient lieu de case.
  assert.equal(entiteDansZone(rangee, 'sorcier', {}, 2), true);
});

test('la meilleure zone est celle qui pèse le plus lourd, le camp adverse d’abord', () => {
  const duel = {
    joueur: { creatures: [{ id: 'a', emplacement: 5, pv: 4 }] },
    sorcier: { creatures: [{ id: 'b', emplacement: 5, pv: 9 }, { id: 'c', emplacement: 6, pv: 2 }] },
  };
  const meilleure = meilleureZone(duel, 'joueur', 'rangee');
  assert.deepEqual(meilleure, { forme: 'rangee', camp: 'sorcier', ligne: 'fond' });
  // Une pesée par PV choisit la même rangée, mais compte les points.
  const pesee = (entite, camp) => (camp === 'sorcier' ? entite.pv : -entite.pv);
  assert.deepEqual(meilleureZone(duel, 'joueur', 'rangee', pesee), { forme: 'rangee', camp: 'sorcier', ligne: 'fond' });
});

test('la table des zones ne nomme que des cartes qui existent', () => {
  for (const id of Object.keys(RPG_ZONE_CARTES)) {
    const carte = cardById(id);
    assert.ok(carte, id);
    assert.ok(['magie', 'creature', 'hero'].includes(carte.kind), id);
    assert.ok(['rangee', 'colonne', 'carre'].includes(zoneFormeCarte(id)), id);
  }
  assert.equal(zoneFormeCarte('dune-marchante'), null);
});

test('une tempête de sable ne frappe plus qu’une rangée : les autres créatures tiennent', () => {
  const d = scene();
  const frontAdverse = poser(d, 'sorcier', { caseVoulue: 0 });
  const allieeAuFront = poser(d, 'joueur', { caseVoulue: 0 });
  const res = lancer(d, 'tempete-de-sable');
  assert.equal(res.ok, true);
  assert.deepEqual(res.zone, { forme: 'rangee', camp: 'sorcier', ligne: 'front' });
  assert.equal(frontAdverse.pv, 7, 'la rangée du front adverse encaisse 3 dégâts');
  assert.equal(allieeAuFront.pv, 10, 'notre front n’est pas dans la zone');
  assert.deepEqual(positionDe(frontAdverse, 'sorcier'), { camp: 'sorcier', index: 0, rangee: 1, colonne: 0 });
});

test('la zone choisie par le lanceur est celle qui se résout, et elle est journalisée', () => {
  const d = scene();
  const front = poser(d, 'sorcier', { carte: 'novice-des-cendres', caseVoulue: 0 });
  const fond = poser(d, 'sorcier', { carte: 'ashigaru-des-braises', caseVoulue: 5 });
  const res = lancer(d, 'tempete-de-sable', 'joueur', { forme: 'rangee', camp: 'sorcier', ligne: 'fond' });
  assert.equal(res.ok, true);
  assert.equal(front.pv, 10);
  assert.equal(fond.pv, 7);
  assert.ok(d.log.some((ligne) => /Tempête de sable couvre .*fond/.test(ligne)), d.log.join(' | '));
});

test('une zone d’une autre forme que la carte est refusée sans rien dépenser', () => {
  const d = scene();
  poser(d, 'sorcier', { caseVoulue: 0 });
  d.tour = 'joueur';
  d.joueur.main.push('tempete-de-sable');
  const avant = JSON.stringify(d.joueur.main);
  const res = rpgLancerMagie(d, 'joueur', 'tempete-de-sable', null, null,
    { zone: { forme: 'carre', camp: 'sorcier', colonne: 0 } });
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'zone');
  assert.equal(JSON.stringify(d.joueur.main), avant);
});

test('une colonne traverse les deux camps et épargne le reste', () => {
  const d = scene();
  const monFront = poser(d, 'joueur', { carte: 'novice-des-cendres', caseVoulue: 0 });
  const sonFront = poser(d, 'sorcier', { carte: 'novice-des-cendres', caseVoulue: 0 });
  const sonFond = poser(d, 'sorcier', { carte: 'ashigaru-des-braises', caseVoulue: 6 });
  const res = lancer(d, 'grand-hiver', 'joueur', { forme: 'colonne', colonne: 0 });
  assert.equal(res.ok, true);
  assert.equal(monFront.pv, 10 - 1, 'nos alliées encaissent aussi : la zone ne choisit pas ses victimes');
  assert.equal(sonFront.pv, 10 - 1);
  assert.equal(sonFond.pv, 10, 'la colonne voisine n’est pas dans la zone');
});

test('le carré ne touche qu’une paire de colonnes, dans un seul camp', () => {
  const d = scene();
  const sonFront0 = poser(d, 'sorcier', { carte: 'novice-des-cendres', caseVoulue: 0 });
  const sonFond1 = poser(d, 'sorcier', { carte: 'ashigaru-des-braises', caseVoulue: 6 });
  const sonFond3 = poser(d, 'sorcier', { carte: 'scribe-des-feuillets', caseVoulue: 8 });
  const atkHorsZone = sonFond3.atk;
  const res = lancer(d, 'verglas', 'joueur', { forme: 'carre', camp: 'sorcier', colonne: 0 });
  assert.equal(res.ok, true);
  assert.equal(sonFront0.pv, 8, 'deux dégâts dans la zone');
  assert.equal(sonFond1.pv, 8, 'la colonne voisine du carré en fait partie');
  assert.equal(sonFond3.pv, 10, 'hors de la zone, la créature tient');
  assert.equal(sonFond3.atk, atkHorsZone);
});

test('les destructions de masse suivent la même zone', () => {
  const d = scene();
  const dansLaZone = poser(d, 'sorcier', { carte: 'chacal-du-seuil', caseVoulue: 0 });
  const horsZone = poser(d, 'sorcier', { carte: 'ouvrier-du-natron', caseVoulue: 3 });
  const idDansLaZone = dansLaZone.id;
  const idHorsZone = horsZone.id;
  const res = lancer(d, 'neige-noire', 'joueur', { forme: 'carre', camp: 'sorcier', colonne: 0 });
  assert.equal(res.ok, true);
  assert.equal(d.sorcier.creatures.some((e) => e.id === idDansLaZone), false, 'la neige noire emporte le front');
  assert.equal(d.sorcier.creatures.some((e) => e.id === idHorsZone), true, 'hors de la zone, la créature survit');
});
