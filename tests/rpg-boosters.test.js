import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COFFRET,
  RAYONS,
  TAUX,
  carteAuVivier,
  couleursRapportees,
  etageIntroduction,
  etatRayon,
  etatRayons,
  ouvrirBooster,
  ouvrirCoffret,
  prixCoffret,
  rayonParId,
  rayonOuvert,
  tourIntroduction,
  toursEntamees,
  vivierRayon,
} from '../src/games/rpgBoosters.js';
import { RPG_DUEL_CARDS, cardById, cardColors } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, RPG_RECOMPENSES_PAR_ETAGE } from '../src/games/rpgCollection.js';
import { RPG_STORY_TOURS, tousLesEtages } from '../src/games/rpgStoryTours.js';
import { BAREME_DOUBLON, portefeuilleVide } from '../src/games/rpgCredits.js';
import { rngSeme } from '../src/games/rpgHasard.js';

const progression = (...etages) => ({ etagesVaincus: [...etages] });
/** L'état d'un joueur qui a gravi la ville jusqu'à cet étage inclus. */
const jusqua = (etageId) => {
  const vaincus = [];
  for (const { etage } of tousLesEtages()) {
    vaincus.push(etage.id);
    if (etage.id === etageId) break;
  }
  return progression(...vaincus);
};
const TOUS_LES_ETAGES = tousLesEtages().map(({ etage }) => etage.id);
const COMPLET = progression(...TOUS_LES_ETAGES);
const idsCatalogue = new Set(RPG_DUEL_CARDS.map((carte) => carte.id));
const journalier = (credits) => ({ ...portefeuilleVide(), credits });

// ── La borne des tours ───────────────────────────────────────────────────────

test('la première tour est entamée d’office, les autres seulement après une victoire', () => {
  assert.deepEqual([...toursEntamees(progression())], [RPG_STORY_TOURS[0].id]);
  assert.equal(toursEntamees(progression('listes-3')).size, 1, 'les Listes restent la seule tour entamée');
  assert.equal(toursEntamees(progression('listes-3', 'souk-1')).has('tour-du-souk'), true);
  assert.equal(toursEntamees(COMPLET).size, RPG_STORY_TOURS.length);
});

test('une carte n’entre au vivier que si sa tour est entamée', () => {
  const fjord = Object.entries(RPG_RECOMPENSES_PAR_ETAGE).find(([etage]) => etage.startsWith('fjord'));
  const carteDuFjord = fjord[1].find((id) => !COLLECTION_DEPART.includes(id));
  assert.ok(carteDuFjord, 'le Fjord rend bien une carte qui ne vient pas de la dotation');
  const tour = RPG_STORY_TOURS.find((candidate) => candidate.etages.some((etage) => etage.id === fjord[0]));
  assert.equal(tourIntroduction(carteDuFjord), tour.id);

  assert.equal(carteAuVivier(carteDuFjord, progression()), false, 'aucun Fjord avant le Fjord');
  assert.equal(carteAuVivier(carteDuFjord, progression('listes-5', 'souk-4')), false);
  assert.equal(carteAuVivier(carteDuFjord, progression('fjord-1')), true);
  assert.equal(carteAuVivier('tarek', progression()), true, 'la Tour des Listes compte comme entamée');
  assert.equal(carteAuVivier('cavalier-amazigh-du-desert', progression()), true);
  assert.equal(carteAuVivier('carte-qui-nexiste-pas', progression()), false);
});

test('un vivier ne contient que la dotation et les tours entamées', () => {
  const vivier = vivierRayon('sable', jusqua('listes-1'));
  assert.ok(vivier.length > 0);
  for (const id of vivier) {
    assert.ok(idsCatalogue.has(id), `${id} est au catalogue`);
    assert.ok(COLLECTION_DEPART.includes(id) || tourIntroduction(id) === 'tour-des-listes', `${id} reste dans les tours entamées`);
    assert.ok(cardColors(id).includes('sable'), `${id} est du Sable`);
  }
  const final = vivierRayon('sable', COMPLET);
  assert.ok(final.length > vivier.length, 'le vivier grandit avec la ville');
  const tours = new Set(final.map((id) => tourIntroduction(id)).filter(Boolean));
  assert.ok(tours.size >= 3, `le Sable vient de plusieurs tours (${[...tours].join(', ')})`);
});

// ── L'ouverture des rayons ───────────────────────────────────────────────────

test('un rayon ouvre quand sa couleur est entrée dans la ville par un étage vaincu', () => {
  assert.deepEqual([...couleursRapportees(progression())], [], 'la ville n’a rien rendu');
  assert.deepEqual([...couleursRapportees(jusqua('listes-1'))], ['sable']);
  assert.deepEqual(new Set(couleursRapportees(jusqua('listes-2'))), new Set(['sable', 'braise']));
  assert.deepEqual(new Set(couleursRapportees(jusqua('souk-2'))), new Set(['sable', 'braise', 'eau']));
  assert.deepEqual(new Set(couleursRapportees(jusqua('abysses-2'))), new Set(['sable', 'braise', 'eau', 'neige']));

  for (const rayon of RAYONS) assert.equal(rayonOuvert(rayon.id, progression()), false, `${rayon.id} est fermé au premier jour`);

  assert.equal(rayonOuvert('sable', jusqua('listes-1')), true);
  assert.equal(rayonOuvert('braise', jusqua('listes-1')), false, 'la Braise attend listes-2');
  assert.equal(rayonOuvert('braise', jusqua('listes-2')), true);
  assert.equal(rayonOuvert('eau', jusqua('souk-1')), false, 'l’Eau attend le cœur du Souk');
  assert.equal(rayonOuvert('eau', jusqua('souk-2')), true);
  assert.equal(rayonOuvert('neige', jusqua('abysses-1')), false, 'la Neige attend les Abysses');
  assert.equal(rayonOuvert('neige', jusqua('abysses-2')), true);
  assert.equal(rayonOuvert('souk', jusqua('listes-1')), true, 'le grand étal ouvre avec la première couleur');
  for (const rayon of RAYONS) assert.equal(rayonParId(rayon.id).id, rayon.id);
  assert.equal(rayonParId('inconnu'), null);
});

test('un rayon fermé le dit, et un rayon complet aussi', () => {
  const ferme = etatRayon('neige', jusqua('listes-1'));
  assert.equal(ferme.ouvert, false);
  assert.equal(ferme.complet, false);
  assert.match(ferme.raison, /garde/, 'la raison nomme la tour qui garde la couleur');
  assert.match(ferme.raison, /Fjord|Abysses/);

  const ouvert = etatRayon('sable', jusqua('listes-1'));
  assert.equal(ouvert.ouvert, true);
  assert.equal(ouvert.complet, false);
  assert.ok(ouvert.nouvelles >= 1, 'il reste des cartes à rapporter');
  assert.equal(ouvert.prix, 140);
  assert.equal(ouvert.prixCoffret, 1260);
  assert.ok(ouvert.mythiques >= 1, 'le Sable a une mythique à donner');

  const complet = etatRayon('sable', COMPLET);
  assert.equal(complet.ouvert, true);
  assert.equal(complet.complet, true, 'tout est possédé : le rayon le dit');
  assert.equal(complet.nouvelles, 0);
  assert.equal(etatRayons(progression()).length, RAYONS.length);
});

// ── Le tirage ────────────────────────────────────────────────────────────────

test('un paquet fait cinq cartes distinctes, toutes au catalogue et de la couleur du rayon', () => {
  const rng = rngSeme(11);
  for (let index = 0; index < 200; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'sable', progression: jusqua('listes-1'), rng });
    assert.equal(tirage.ok, true);
    assert.equal(tirage.tirage.cartes.length, TAUX.cartes);
    assert.equal(new Set(tirage.tirage.cartes).size, TAUX.cartes, 'jamais deux fois la même carte');
    for (const id of tirage.tirage.cartes) {
      assert.ok(idsCatalogue.has(id), `${id} est au catalogue`);
      assert.ok(cardColors(id).includes('sable'), `${id} est du Sable`);
    }
    assert.equal(tirage.tirage.nouvelles >= 3, true, `le paquet complète (${tirage.tirage.nouvelles} neuves)`);
    assert.equal(tirage.prix, 140);
  }
});

test('la rare est garantie, la mythique reste rare et la pitié la force', () => {
  assert.equal(TAUX.pitie, 8);
  const rares = { braise: 0, sable: 0 };
  const rng = rngSeme(23);
  for (let index = 0; index < 300; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: journalier(100000), rayonId: 'braise', progression: jusqua('listes-2'), rng });
    const rarete = tirage.tirage.details.map((carte) => carte.rarete);
    assert.ok(rarete.includes('rare') || rarete.includes('mythique'), 'au moins une carte rare ou mythique');
    rares.braise += tirage.tirage.mythique ? 1 : 0;
  }
  assert.ok(rares.braise / 300 < 0.35, `les mythiques restent rares (${rares.braise}/300)`);

  const avecPitie = { ...journalier(10000), pitie: TAUX.pitie - 1 };
  for (let index = 0; index < 20; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: avecPitie, rayonId: 'braise', progression: jusqua('listes-2'), rng: rngSeme(100 + index) });
    assert.equal(tirage.tirage.mythique, true, 'la pitié est une promesse, pas une chance');
  }
});

test('les taux annoncés tiennent sur dix mille ouvertures semées', () => {
  const rng = rngSeme(4242);
  const compter = (rayonId, progressionTest) => {
    let mythiques = 0;
    let ouvertureDepuisMythique = 0;
    let pireSerie = 0;
    let bourse = journalier(1000000);
    for (let index = 0; index < 10000; index += 1) {
      const tirage = ouvrirBooster({ portefeuille: bourse, rayonId, progression: progressionTest, rng });
      bourse = tirage.portefeuille;
      ouvertureDepuisMythique = tirage.tirage.mythique ? 0 : ouvertureDepuisMythique + 1;
      pireSerie = Math.max(pireSerie, ouvertureDepuisMythique);
      mythiques += tirage.tirage.mythique ? 1 : 0;
    }
    return { part: mythiques / 10000, pireSerie };
  };
  // La pitié relève la moyenne : 20 % par paquet annoncés, ~24 % sur la durée
  // (et 30 % → ~32 % pour le grand étal). Le Souk affiche les deux chiffres.
  const souk = compter('souk', COMPLET);
  assert.ok(souk.part > 0.29 && souk.part < 0.35, `la carte 5 du grand étal vaut ${(souk.part * 100).toFixed(1)} % de mythiques`);
  assert.ok(souk.pireSerie <= TAUX.pitie - 1, `jamais plus de ${TAUX.pitie - 1} paquets secs (${souk.pireSerie})`);
  const braise = compter('braise', COMPLET);
  assert.ok(braise.part > 0.22 && braise.part < 0.26, `un rayon thématique vaut ${(braise.part * 100).toFixed(1)} % en moyenne`);
  assert.ok(braise.part > TAUX.mythique, 'la pitié paie les séries sèches : la moyenne dépasse le taux du paquet');
});

// ── L'achat ──────────────────────────────────────────────────────────────────

test('ouvrir un paquet débite le solde, range les cartes et rembourse les doublons', () => {
  const depart = journalier(500);
  const tirage = ouvrirBooster({ portefeuille: depart, rayonId: 'sable', progression: jusqua('listes-1'), rng: rngSeme(9) });
  assert.equal(tirage.ok, true);
  const remboursement = tirage.tirage.remboursement;
  assert.equal(remboursement, tirage.tirage.details.reduce((somme, carte) => somme + carte.remboursement, 0));
  assert.equal(tirage.portefeuille.credits, 500 - 140 + remboursement);
  assert.equal(tirage.portefeuille.ouvertures, 1);
  assert.equal(tirage.portefeuille.cartes.length, TAUX.cartes, 'les cinq cartes sont rangées');
  assert.deepEqual(depart.cartes, [], 'le portefeuille de départ n’est pas modifié');
  const doublons = tirage.tirage.details.filter((carte) => carte.doublon);
  assert.ok(doublons.length >= 2, 'un rayon presque complet rend des doublons');
  for (const carte of doublons) assert.equal(carte.remboursement, BAREME_DOUBLON[carte.rarete]);
  for (const carte of tirage.tirage.details.filter((detail) => !detail.doublon)) assert.equal(carte.remboursement, 0);
});

test('sans solde ou sur un rayon fermé, l’achat ne touche à rien', () => {
  const pauvre = ouvrirBooster({ portefeuille: journalier(139), rayonId: 'sable', progression: jusqua('listes-1') });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.equal(pauvre.portefeuille.credits, 139);
  assert.equal(pauvre.tirage, null);

  const ferme = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'neige', progression: jusqua('listes-1') });
  assert.equal(ferme.ok, false);
  assert.equal(ferme.raison, 'rayon-ferme');
  assert.equal(ferme.portefeuille.credits, 10000, 'un rayon fermé ne coûte rien');

  const inconnu = ouvrirBooster({ portefeuille: journalier(10000), rayonId: 'etagere-fantome' });
  assert.equal(inconnu.raison, 'rayon-inconnu');
});

test('le coffret vend dix paquets avec la remise, et une mythique assurée', () => {
  assert.equal(prixCoffret('sable'), 1260);
  assert.equal(prixCoffret('souk'), 1620);
  assert.equal(prixCoffret('inconnu'), null);
  assert.equal(COFFRET.taille, 10);

  const depart = journalier(5000);
  const coffret = ouvrirCoffret({ portefeuille: depart, rayonId: 'sable', progression: jusqua('listes-1'), rng: rngSeme(77) });
  assert.equal(coffret.ok, true);
  assert.equal(coffret.paquets.length, 10, 'dix paquets, même si le dernier se vide');
  assert.equal(coffret.mythique, true, 'une mythique au moins dans le coffret');
  assert.equal(coffret.prix, 1260);
  assert.equal(coffret.portefeuille.credits, 5000 - 1260 + coffret.paquets.reduce((somme, paquet) => somme + paquet.remboursement, 0));
  assert.ok(coffret.portefeuille.ouvertures >= 10);

  const pauvre = ouvrirCoffret({ portefeuille: journalier(1200), rayonId: 'sable', progression: jusqua('listes-1') });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.deepEqual(pauvre.paquets, []);
});

// ── Les repères d'affichage ──────────────────────────────────────────────────

test('l’étage d’introduction d’une carte se retrouve, la dotation n’en a pas', () => {
  const etage = etageIntroduction('cavalier-amazigh-du-desert');
  assert.equal(etage.id, 'listes-1');
  assert.equal(etageIntroduction('carte-qui-nexiste-pas'), null);
  const dotation = COLLECTION_DEPART.find((id) => !Object.values(RPG_RECOMPENSES_PAR_ETAGE).some((recompense) => recompense.includes(id)));
  assert.ok(dotation, 'la dotation compte des cartes qu’aucun étage ne rend');
  assert.equal(tourIntroduction(dotation), null);
  assert.equal(cardById(dotation) !== null, true);
});
