/**
 * Les portées des effets de créature (14b).
 *
 * Une créature qui arrive ne frappe plus n'importe où : son effet porte aussi
 * loin que sa fiche le dit — contact (1 case) pour les duels, tir (2 cases)
 * pour ce qui frappe ou soigne à distance, sans limite pour les effets déjà
 * globaux. La mesure est celle du plateau : Tchebychev, diagonales comprises.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS, cardById, duelCardById } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { RPG_PORTEE_EFFETS, porteeEffetCarte } from '../src/games/rpgPorteesCartes.js';
import { cibleDeLEffetAPortee, ciblesDeLEffetAPortee, porteeDeCarte } from '../src/games/rpgPortees.js';
import { positionDe } from '../src/games/rpgChamp.js';

const CARTES = ['dune-marchante', 'novice-des-cendres', 'chacal-du-seuil', 'ouvrier-du-natron',
  'garde-du-voile', 'messagere-des-cendres', 'ashigaru-des-braises', 'scribe-des-feuillets'];

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
function poser(d, cote, { carte = null, caseVoulue = null, cibleId = null } = {}) {
  const id = carte ?? CARTES[compteur++ % CARTES.length];
  d.tour = cote;
  d[cote].invocationNormaleJouee = false;
  d[cote].main.push(id);
  const options = {};
  if (caseVoulue !== null) options.emplacement = caseVoulue;
  const res = rpgJouerCreature(d, cote, id, cibleId, options);
  assert.ok(res.ok, `${id} : ${res.raison}`);
  const entite = res.entite;
  entite.pv = entite.pvMax = entite.def = 10;
  return entite;
}

test('le tableau des portées ne nomme que des cartes qui existent, à 1 ou 2 cases', () => {
  for (const [id, portee] of Object.entries(RPG_PORTEE_EFFETS)) {
    const carte = cardById(id);
    assert.ok(carte, id);
    assert.ok([1, 2].includes(portee), id);
    assert.equal(porteeEffetCarte(id), portee);
    assert.equal(porteeDeCarte(carte), portee);
    // Une portée par carte : elle est lue sur l'effet d'arrivée, pas ailleurs.
    assert.ok(carte.arrivee, id);
  }
  assert.equal(porteeEffetCarte('dune-marchante'), null);
  assert.equal(porteeEffetCarte('inconnue'), null);
});

test('les duels sont au contact, les tirs et les tours à deux cases', () => {
  assert.equal(porteeEffetCarte('bakunawa'), 1);
  assert.equal(porteeEffetCarte('cavalier-amazigh-du-desert'), 1);
  assert.equal(porteeEffetCarte('souverain-de-la-lune-noire'), 1);
  assert.equal(porteeEffetCarte('tour-de-braise'), 2);
  assert.equal(porteeEffetCarte('volva-soigneuse'), 2);
  assert.equal(porteeEffetCarte('eclipse-silencieuse'), 2);
  // Les masses ne se mesurent pas : elles passent par les zones.
  assert.equal(porteeEffetCarte('braisier-du-souk'), null);
  assert.equal(porteeEffetCarte('leviathan'), null);
});

test('une cible à une case est atteinte, une cible à trois ne l’est plus', () => {
  const d = scene();
  const source = poser(d, 'joueur', { carte: 'tour-de-braise', caseVoulue: 0 });
  assert.deepEqual(positionDe(source, 'joueur'), { camp: 'joueur', index: 0, rangee: 2, colonne: 0 });
  const proche = { emplacement: 0 };
  const loin = { emplacement: 7 };
  assert.equal(cibleDeLEffetAPortee(d, 'joueur', source.id, proche, 'sorcier', 2), true);
  assert.equal(cibleDeLEffetAPortee(d, 'joueur', source.id, loin, 'sorcier', 2), false);
  // Sans portée, la même cible redevient légale.
  assert.equal(cibleDeLEffetAPortee(d, 'joueur', source.id, loin, 'sorcier', null), true);
  // Sans géométrie, aucune règle ne s'applique.
  const nu = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  assert.equal(cibleDeLEffetAPortee(nu, 'joueur', 'x', loin, 'sorcier', 1), true);
});

test('une tour ne frappe pas au-delà de deux cases : hors de portée, la cible tient', () => {
  const d = scene();
  const cible = poser(d, 'sorcier', { carte: 'ashigaru-des-braises', caseVoulue: 7 });
  const tour = poser(d, 'joueur', { carte: 'tour-de-braise', caseVoulue: 0, cibleId: cible.id });
  assert.ok(tour, 'la tour est posée');
  assert.equal(cible.pv, 10, 'aucun dégât hors de portée');
  assert.ok(d.log.some((ligne) => /hors de portée/.test(ligne)), d.log.join(' | '));
});

test('à deux cases, la tour frappe sa cible', () => {
  const d = scene();
  const cible = poser(d, 'sorcier', { carte: 'novice-des-cendres', caseVoulue: 0 });
  poser(d, 'joueur', { carte: 'tour-de-braise', caseVoulue: 0, cibleId: cible.id });
  assert.equal(cible.pv, 9, 'la tour du front atteint le front adverse');
});

test('les cibles à portée se lisent dans l’ordre du champ', () => {
  const d = scene();
  const source = poser(d, 'joueur', { carte: 'tour-de-braise', caseVoulue: 0 });
  const pres = poser(d, 'sorcier', { carte: 'novice-des-cendres', caseVoulue: 0 });
  const loin = poser(d, 'sorcier', { carte: 'ashigaru-des-braises', caseVoulue: 7 });
  const aDeux = ciblesDeLEffetAPortee(d, 'joueur', source.id, 2, 'sorcier');
  assert.deepEqual(aDeux.map((e) => e.id), [pres.id]);
  const sansLimite = ciblesDeLEffetAPortee(d, 'joueur', source.id, null, 'sorcier');
  assert.deepEqual(sansLimite.map((e) => e.id).sort(), [pres.id, loin.id].sort());
});

test('le duel de Bakunawa exige le contact', () => {
  const d = scene();
  const loin = poser(d, 'sorcier', { carte: 'ashigaru-des-braises', caseVoulue: 7 });
  const bakunawa = poser(d, 'joueur', { carte: 'bakunawa', caseVoulue: 0, cibleId: loin.id });
  assert.ok(bakunawa);
  assert.equal(loin.pv, 10, 'aucune lame à trois cases');
  assert.ok(d.log.some((ligne) => /hors de portée/.test(ligne)), d.log.join(' | '));
});

test('la fiche garde la carte intacte : la portée est une donnée de table', () => {
  const carte = duelCardById('tour-de-braise');
  assert.equal(porteeEffetCarte(carte.id), 2);
  assert.equal(carte.arrivee.type, 'degats');
});
