/**
 * Le contrat d'événements du duel (`rpgEvenementsDuel.js`) — les règles pures
 * du lot 2 du Souk : ce que chaque geste rapporte, et à quoi il fait avancer
 * les quêtes du jour. Aucun composant React n'est monté : le duel *raconte*,
 * la règle compte, et c'est tout.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENEMENTS_DUEL,
  EVENEMENTS_PAYANTS,
  appliquerEvenementDuel,
  compterReclamations,
  creditsDeLEvenement,
  normaliserEvenementDuel,
} from '../src/games/rpgEvenementsDuel.js';
import { GAINS, portefeuilleVide } from '../src/games/rpgCredits.js';
import {
  QUETES,
  etatQuetesVide,
  ouvrirJournee,
  progresserQuete,
  queteParId,
  reclamerQuete,
} from '../src/games/rpgQuetes.js';
import { cardById, cardColors } from '../src/games/rpgCards.js';

const JOUR = '2026-10-14';

/** Une carte réelle par couleur — pour fabriquer le geste d'une quête de couleur. */
const CARTE_PAR_COULEUR = { braise: 'trait-de-braise', eau: 'ressac', sable: 'fennec-des-decombres', neige: 'loup-des-neiges' };

/**
 * Un geste appliqué à une journée de quêtes, sans bourse : rend l'état des
 * quêtes qui suit. Le piège de ce fichier est là — `journee()` rend l'état des
 * quêtes, pas `{ bourse, quetes }`, et les deux ont une propriété `quetes`.
 */
function gesteSurQuetes(etatQuetes, evenement) {
  return appliquerEvenementDuel({ quetes: etatQuetes }, evenement).quetes;
}

/** Un état de quêtes du jour, tiré sur la graine demandée. */
function journee(graine = 'test', progression = null) {
  return ouvrirJournee({ etat: etatQuetesVide(), jour: JOUR, graine, progression }).etat;
}

test('le contrat énumère les huit gestes du duel, et un seul paie', () => {
  assert.deepEqual([...EVENEMENTS_DUEL].sort(), [
    'arme-jouee', 'booster-ouvert', 'carte-jouee', 'creature-invoquee',
    'degats-infliges', 'duel-gagne', 'etage-deblaye', 'magie-lancee',
  ]);
  assert.deepEqual([...EVENEMENTS_PAYANTS], ['duel-gagne']);
});

test('un événement se normalise, un inconnu ne passe pas', () => {
  assert.equal(normaliserEvenementDuel(null), null);
  assert.equal(normaliserEvenementDuel('terrain-pose'), null);
  assert.equal(normaliserEvenementDuel({ type: 'geste-inconnu' }), null);
  assert.equal(normaliserEvenementDuel({}), null);
});

test('les couleurs d’une carte sont lues dans le catalogue, pas crues sur parole', () => {
  const carte = cardById('trait-de-braise');
  const normalise = normaliserEvenementDuel({
    type: 'carte-jouee', cardId: 'trait-de-braise', couleurs: ['neige'], kind: 'terrain',
  });
  assert.deepEqual(normalise.couleurs, cardColors(carte), 'les couleurs annoncées sont ignorées');
  assert.equal(normalise.kind, carte.kind);
  assert.equal(normalise.type, 'carte-jouee');
  assert.deepEqual(normaliserEvenementDuel({ type: 'carte-jouee', cardId: 'carte-fantome' }), { type: 'carte-jouee' },
    'une carte inconnue laisse l’événement nu, sans le casser');
});

test('seuls les dégâts portent un montant, et il est borné au positif', () => {
  assert.equal(normaliserEvenementDuel({ type: 'degats-infliges', montant: 7 }).montant, 7);
  assert.equal(normaliserEvenementDuel({ type: 'degats-infliges', montant: -4 }).montant, 0);
  assert.equal(normaliserEvenementDuel({ type: 'degats-infliges', montant: 'trente' }).montant, 0);
  assert.equal(normaliserEvenementDuel({ type: 'degats-infliges', montant: 3.8 }).montant, 3);
  assert.equal('montant' in normaliserEvenementDuel({ type: 'arme-jouee', cardId: 'cimeterre-du-souk', montant: 40 }), false,
    'un montant glissé ailleurs ne compte jamais');
});

test('un duel gagné paie selon le mode et le premier déblayage', () => {
  assert.equal(creditsDeLEvenement({ type: 'duel-gagne', mode: 'libre' }), GAINS.duelLibre);
  assert.equal(creditsDeLEvenement({ type: 'duel-gagne', mode: 'histoire', premiere: true }), GAINS.etagePremiere);
  assert.equal(creditsDeLEvenement({ type: 'duel-gagne', mode: 'tours', premiere: true }), GAINS.etagePremiere);
  assert.equal(creditsDeLEvenement({ type: 'duel-gagne', mode: 'histoire', premiere: false }), GAINS.etageRejoue);
  assert.equal(creditsDeLEvenement({ type: 'duel-gagne', mode: 'inconnu' }), 0);
  assert.equal(GAINS.etagePremiere > GAINS.etageRejoue, true, 'le premier déblayage vaut plus que le rejeu');
  assert.equal(GAINS.etageRejoue > GAINS.duelLibre, true, 'et le rejeu vaut plus qu’un duel libre');
});

test('etage-deblaye ne paie pas : le duel a déjà payé', () => {
  assert.equal(creditsDeLEvenement({ type: 'etage-deblaye', premiere: true }), 0);
  assert.equal(creditsDeLEvenement({ type: 'etage-deblaye', mode: 'histoire', premiere: true }), 0);
  for (const type of EVENEMENTS_DUEL.filter((t) => t !== 'duel-gagne')) {
    assert.equal(creditsDeLEvenement({ type, mode: 'histoire', premiere: true, montant: 99 }), 0, `${type} ne paie rien`);
  }
});

test('appliquer un événement crédite le solde et rend le gain', () => {
  const bourse = portefeuilleVide();
  const quetes = journee();
  const suite = appliquerEvenementDuel({ bourse, quetes }, { type: 'duel-gagne', mode: 'histoire', premiere: true });
  assert.equal(suite.reconnu, true);
  assert.equal(suite.gain, GAINS.etagePremiere);
  assert.equal(suite.bourse.credits, GAINS.etagePremiere);
  assert.equal(suite.quetes, quetes, 'un duel gagné ne touche pas une journée sans quête de duel');

  const perdu = appliquerEvenementDuel({ bourse, quetes }, { type: 'defaite' });
  assert.equal(perdu.reconnu, false);
  assert.equal(perdu.gain, 0);
  assert.equal(perdu.bourse, bourse, 'un événement inconnu rend l’état d’origine tel quel');
  assert.equal(perdu.quetes, quetes);
  assert.equal(perdu.evenement, null);
});

test('une victoire qui termine la tour paie aussi son butin — une fois par tour', () => {
  const bourse = portefeuilleVide();
  const quetes = journee();
  const sommet = appliquerEvenementDuel(
    { bourse, quetes },
    { type: 'duel-gagne', mode: 'histoire', etageId: 'listes-5', tourId: 'tour-des-listes', premiere: true, tourComplete: true },
  );
  assert.equal(sommet.butin, GAINS.tourTerminee, 'le butin est isolé pour l’annonce');
  assert.equal(sommet.gain, GAINS.etagePremiere + GAINS.tourTerminee, 'le gain annonce étage + butin');
  assert.equal(sommet.bourse.credits, GAINS.etagePremiere + GAINS.tourTerminee);
  assert.deepEqual(sommet.bourse.toursPayees, ['tour-des-listes'], 'la tour réglée est retenue dans le portefeuille');

  const reprise = appliquerEvenementDuel(
    { bourse: sommet.bourse, quetes },
    { type: 'duel-gagne', mode: 'histoire', etageId: 'listes-5', tourId: 'tour-des-listes', premiere: false, tourComplete: true },
  );
  assert.equal(reprise.butin, 0, 'le butin est déjà en poche');
  assert.equal(reprise.gain, GAINS.etageRejoue, 'la reprise ne paie que le duel');
  assert.equal(reprise.bourse.credits, sommet.bourse.credits + GAINS.etageRejoue);
});

test('le butin exige le mode Histoire et une tour connue', () => {
  const libre = appliquerEvenementDuel(
    { bourse: portefeuilleVide() },
    { type: 'duel-gagne', mode: 'libre', tourComplete: true, tourId: 'tour-des-listes' },
  );
  assert.equal(libre.butin, 0, 'un duel libre ne termine aucune tour');
  assert.equal(libre.gain, GAINS.duelLibre);

  const fantome = appliquerEvenementDuel(
    { bourse: portefeuilleVide() },
    { type: 'duel-gagne', mode: 'histoire', premiere: true, tourComplete: true, tourId: 'tour-fantome' },
  );
  assert.equal(fantome.butin, 0);
  assert.equal(fantome.gain, GAINS.etagePremiere, 'une tour inconnue ne bloque pas le gain de l’étage');

  const sansTour = appliquerEvenementDuel(
    { bourse: portefeuilleVide() },
    { type: 'duel-gagne', mode: 'histoire', premiere: true, tourComplete: true },
  );
  assert.equal(sansTour.butin, 0, 'pas de butin sans tour racontée');
  assert.equal(sansTour.gain, GAINS.etagePremiere);
});

test('tourComplete se raconte comme premiere, et etage-deblaye ne paie pas le butin', () => {
  assert.equal(normaliserEvenementDuel({ type: 'duel-gagne', tourComplete: true }).tourComplete, true);
  assert.equal('tourComplete' in normaliserEvenementDuel({ type: 'duel-gagne' }), false);
  assert.equal('tourComplete' in normaliserEvenementDuel({ type: 'duel-gagne', tourComplete: 'oui' }), false,
    'seul le vrai drapeau compte');
  const deblaye = appliquerEvenementDuel(
    { bourse: portefeuilleVide() },
    { type: 'etage-deblaye', etageId: 'listes-5', tourId: 'tour-des-listes', premiere: true, tourComplete: true },
  );
  assert.equal(deblaye.gain, 0, 'le duel a déjà payé : etage-deblaye ne paie rien, butin compris');
  assert.equal(deblaye.butin, 0);
});

test('un événement sans effet ne bouge pas l’état (stabilité référentielle)', () => {
  const bourse = portefeuilleVide();
  const quetes = journee('partie-sans-duel');
  const avant = JSON.stringify(quetes);
  const suite = appliquerEvenementDuel({ bourse, quetes }, { type: 'creature-invoquee', cardId: 'fennec-des-decombres' });
  assert.equal(suite.gain, 0, 'poser un terrain ne rapporte aucun crédit');
  assert.equal(suite.bourse, bourse, 'le portefeuille n’est pas recopié');
  assert.equal(JSON.stringify(suite.quetes), avant, 'les quêtes non concernées ne bougent pas');
});

test('les gestes du duel font avancer les quêtes qui les écoutent', () => {
  // Chaque quête du jour est mise à l'épreuve de son propre geste. L'événement
  // passe par `appliquerEvenementDuel` — la porte réelle —, et non par
  // `progresserQuete` : c'est lui qui va lire le catalogue pour trouver les
  // couleurs de la carte jouée.
  const etat = journee('gestes');
  assert.ok(etat.quetes.length >= 3);
  for (const queteId of etat.quetes) {
    const quete = queteParId(queteId);
    const suite = appliquerEvenementDuel({ quetes: journee('gestes') }, gestePour(quete));
    assert.equal(suite.reconnu, true, `${queteId} : le geste est au contrat`);
    assert.ok((suite.quetes.progres[queteId] ?? 0) > 0, `${queteId} avance sur « ${quete.ecoute.type} »`);
  }
});

test('un geste d’une autre couleur ne fait pas avancer une quête de couleur', () => {
  // Les journées sans quête de couleur sont sautées : on cherche une graine qui
  // en porte une, puis on lui oppose le geste d'une autre couleur.
  for (const graine of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    const etat = journee(graine);
    const braise = etat.quetes.find((id) => queteParId(id).ecoute?.couleur === 'braise');
    if (!braise) continue;
    assert.equal(braise, 'cartes-braise-8');
    const neige = gesteSurQuetes(etat, { type: 'carte-jouee', cardId: 'loup-des-neiges' });
    assert.equal(neige, etat, 'la Neige ne touche pas une quête de Braise');
    const braiseJouee = gesteSurQuetes(etat, { type: 'carte-jouee', cardId: 'trait-de-braise' });
    assert.equal(braiseJouee.progres['cartes-braise-8'], 1, 'la Braise, si');
    return;
  }
  assert.fail('aucune graine testée ne porte de quête de couleur');
});

test('les dégâts comptent leur montant, pas leur nombre d’événements', () => {
  const quete = queteParId('degats-40');
  assert.equal(quete.ecoute.type, 'degats-infliges');
  assert.equal(quete.ecoute.montant, true);
  let etat = journee('degats');
  if (!etat.quetes.includes('degats-40')) return; // graine malheureuse : voir le test global plus bas
  etat = progresserQuete(etat, { type: 'degats-infliges', montant: 12 });
  assert.equal(etat.progres['degats-40'], 12);
  etat = progresserQuete(etat, { type: 'degats-infliges', montant: 30 });
  assert.equal(etat.progres['degats-40'], quete.objectif, 'l’objectif plafonne la progression');
  assert.equal(reclamerQuete(etat, 'degats-40').ok, true);
});

test('la pastille compte les réclamations dues, jamais plus', () => {
  const etat = journee('pastille');
  assert.equal(compterReclamations(etat), 0, 'rien n’est terminé au début du jour');
  assert.equal(compterReclamations(null), 0);

  const premiere = etat.quetes[0];
  const quete = queteParId(premiere);
  let fini = etat;
  for (let coup = 0; coup < quete.objectif; coup += 1) {
    fini = gesteSurQuetes(fini, gestePour(quete, quete.objectif));
  }
  assert.equal(fini.progres[premiere], quete.objectif, `${premiere} est terminée`);
  assert.equal(compterReclamations(fini), 1);

  const paye = reclamerQuete(fini, premiere).etat;
  assert.equal(compterReclamations(paye), 0, 'une quête réclamée ne compte plus');

  // Les trois payées : le Cachet du cycle compte pour une réclamation de plus.
  let cycle = etat;
  for (const id of etat.quetes) {
    const q = queteParId(id);
    for (let coup = 0; coup < q.objectif; coup += 1) {
      cycle = gesteSurQuetes(cycle, gestePour(q, q.objectif));
    }
    cycle = reclamerQuete(cycle, id).etat;
  }
  assert.equal(compterReclamations(cycle), 1, 'seul le Cachet reste à réclamer');
});

/**
 * Le geste qui fait avancer une quête — son type, ses couleurs (par la carte
 * jouée) et son montant. C'est la fabrication du test : le contrat, lui, ne
 * connaît que ce que le duel raconte.
 */
function gestePour(quete, montant = null) {
  const ecoute = quete.ecoute ?? {};
  const evenement = { type: ecoute.type };
  if (ecoute.montant) evenement.montant = montant ?? 5;
  if (!ecoute.type.startsWith('carte-')) return evenement;
  const carte = CARTE_PAR_COULEUR[ecoute.couleur];
  return carte ? { ...evenement, cardId: carte } : evenement;
}
