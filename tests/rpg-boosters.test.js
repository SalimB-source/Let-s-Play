import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COFFRET,
  RAYONS,
  TAUX,
  carteAuVivier,
  cartesOuvertes,
  couleursOuvertes,
  etagesOuverts,
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
import { COLLECTION_DEPART, RPG_REVELATIONS_PAR_ETAGE, collectionJoueur } from '../src/games/rpgCollection.js';
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

test('aucune tour n’est entamée avant la première victoire', () => {
  assert.deepEqual([...toursEntamees(progression())], [], 'le Souk ouvre à la première victoire');
  assert.deepEqual([...toursEntamees(progression('listes-3'))], ['tour-des-listes']);
  assert.equal(toursEntamees(progression('listes-3', 'souk-1')).has('tour-du-souk'), true);
  assert.equal(toursEntamees(COMPLET).size, RPG_STORY_TOURS.length);
});

test('le Souk suit les marches montées : vaincue, ou la suivante', () => {
  const fjord = Object.entries(RPG_REVELATIONS_PAR_ETAGE).find(([etage]) => etage.startsWith('fjord'));
  const carteDuFjord = fjord[1].find((id) => !COLLECTION_DEPART.includes(id));
  assert.ok(carteDuFjord, 'le Fjord révèle bien une carte qui ne vient pas de la dotation');
  const tour = RPG_STORY_TOURS.find((candidate) => candidate.etages.some((etage) => etage.id === fjord[0]));
  assert.equal(tourIntroduction(carteDuFjord), tour.id);

  assert.equal(carteAuVivier(carteDuFjord, progression()), false, 'aucun Fjord avant le Fjord');
  assert.equal(carteAuVivier(carteDuFjord, progression('listes-5', 'souk-4')), false);
  assert.equal(carteAuVivier(carteDuFjord, progression('fjord-1')), true, 'l’étage vaincu ouvre sa carte');
  assert.equal(carteAuVivier('carte-qui-nexiste-pas', progression()), false);

  // « ou la suivante » : gagner listes-1 ouvre les cartes de listes-2.
  const braisier = RPG_REVELATIONS_PAR_ETAGE['listes-2'][0];
  assert.equal(carteAuVivier(braisier, progression()), false, 'la marche suivante n’est pas encore ouverte');
  assert.equal(carteAuVivier(braisier, progression('listes-1')), true, 'listes-1 vaincu ouvre listes-2, la marche suivante');
  assert.equal(carteAuVivier(braisier, progression('listes-2')), true, 'vaincue aussi');
  // Le Fjord ne s’ouvre qu’en y entrant : sa première marche ne s’offre pas d’office.
  const premierDuFjord = RPG_REVELATIONS_PAR_ETAGE['fjord-1'][0];
  assert.equal(carteAuVivier(premierDuFjord, progression()), false, 'aucun Fjord avant le Fjord');
  assert.equal(carteAuVivier(premierDuFjord, progression('sables-3')), false, 'même au sommet des Sables');
  assert.equal(carteAuVivier(premierDuFjord, progression('fjord-1')), true, 'entrer dans le Fjord l’ouvre');
});

test('les cartes ouvertes et les étages ouverts suivent la progression', () => {
  assert.deepEqual(cartesOuvertes(progression()), [], 'la ville n’a encore rien ouvert');
  assert.equal(cartesOuvertes(progression('listes-1')).length,
    RPG_REVELATIONS_PAR_ETAGE['listes-1'].length + RPG_REVELATIONS_PAR_ETAGE['listes-2'].length,
    'la marche conquise et la suivante sont ouvertes');
  assert.deepEqual(etagesOuverts(progression()), [], 'rien n’est ouvert avant la première victoire');
  const ouverts = etagesOuverts(progression('listes-1'));
  assert.ok(ouverts.includes('listes-1'), 'la marche conquise');
  assert.ok(ouverts.includes('listes-2'), 'et la suivante');
  assert.equal(ouverts.length, 2);
});

test('un vivier ne contient que la dotation et les cartes ouvertes', () => {
  const vivier = vivierRayon('sable', jusqua('listes-1'));
  assert.ok(vivier.length > 0);
  const ouvertes = new Set(cartesOuvertes(jusqua('listes-1')));
  for (const id of vivier) {
    assert.ok(idsCatalogue.has(id), `${id} est au catalogue`);
    assert.ok(COLLECTION_DEPART.includes(id) || ouvertes.has(id), `${id} est de la dotation ou ouvert`);
    assert.ok(cardColors(id).includes('sable'), `${id} est du Sable`);
  }
  const final = vivierRayon('sable', COMPLET);
  assert.ok(final.length > vivier.length, 'le vivier grandit avec la ville');
  const tours = new Set(final.map((id) => tourIntroduction(id)).filter(Boolean));
  assert.ok(tours.size >= 3, `le Sable vient de plusieurs tours (${[...tours].join(', ')})`);
  assert.equal(vivierRayon('sable', COMPLET).length, final.length, 'à la fin, tout le Sable est au vivier');
});

// ── L'ouverture des rayons ───────────────────────────────────────────────────

test('un rayon ouvre quand sa couleur est entrée dans la ville par un étage vaincu', () => {
  assert.deepEqual([...couleursOuvertes(progression())], [], 'la ville n’a rien ouvert');
  assert.deepEqual(new Set(couleursOuvertes(jusqua('listes-1'))), new Set(['sable', 'braise']));
  assert.deepEqual(new Set(couleursOuvertes(jusqua('souk-1'))), new Set(['sable', 'braise', 'eau']));
  assert.deepEqual(new Set(couleursOuvertes(jusqua('abysses-1'))), new Set(['sable', 'braise', 'eau', 'neige']));

  for (const rayon of RAYONS) assert.equal(rayonOuvert(rayon.id, progression()), false, `${rayon.id} est fermé au premier jour`);

  assert.equal(rayonOuvert('sable', jusqua('listes-1')), true);
  assert.equal(rayonOuvert('braise', jusqua('listes-1')), true, 'la marche suivante ouvre la Braise de listes-2');
  assert.equal(rayonOuvert('eau', jusqua('listes-5')), false, 'l’Eau attend le Souk');
  assert.equal(rayonOuvert('eau', jusqua('souk-1')), true);
  assert.equal(rayonOuvert('neige', jusqua('souk-4')), false, 'la Neige attend les Abysses');
  assert.equal(rayonOuvert('neige', jusqua('abysses-1')), true);
  assert.equal(rayonOuvert('souk', jusqua('listes-1')), true, 'le grand étal ouvre avec la première couleur');
  // La dotation ne compte pas : ses communes couvrent les quatre couleurs.
  assert.equal(COLLECTION_DEPART.some((id) => cardColors(id).includes('neige')), true, 'la dotation a bien de la Neige commune');
  assert.equal(rayonOuvert('neige', progression()), false, 'et pourtant la Neige reste fermée');
  for (const rayon of RAYONS) assert.equal(rayonParId(rayon.id).id, rayon.id);
  assert.equal(rayonParId('inconnu'), null);
});

test('un rayon fermé le dit, et un rayon complet aussi', () => {
  const ferme = etatRayon('neige', jusqua('listes-5'));
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
  assert.equal(ouvert.mythiques, 0, 'au deuxième jour, le Sable n’a encore aucune mythique à donner');
  assert.ok(etatRayon('sable', jusqua('listes-5')).mythiques >= 1, 'Tarek arrive avec les Listes, plus haut');

  // Un joueur qui possède tout le Sable du vivier : le rayon le dit.
  const complet = etatRayon('sable', COMPLET, vivierRayon('sable', COMPLET));
  assert.equal(complet.ouvert, true);
  assert.equal(complet.complet, true, 'tout est possédé : le rayon le dit');
  assert.equal(complet.nouvelles, 0);
  assert.equal(etatRayons(progression()).length, RAYONS.length);
});

// ── Le tirage ────────────────────────────────────────────────────────────────

test('un paquet fait cinq cartes distinctes, toutes au catalogue et de la couleur du rayon', () => {
  const rng = rngSeme(11);
  for (const [rayonId, progressionTest] of [['sable', jusqua('listes-1')], ['souk', COMPLET]]) {
    const vivier = vivierRayon(rayonId, progressionTest);
    const possedees = new Set(collectionJoueur({ progression: progressionTest }));
    const neuvesAuVivier = vivier.filter((id) => !possedees.has(id)).length;
    for (let index = 0; index < 200; index += 1) {
      const tirage = ouvrirBooster({ portefeuille: journalier(10000), rayonId, progression: progressionTest, rng });
      assert.equal(tirage.ok, true);
      assert.equal(tirage.tirage.cartes.length, TAUX.cartes);
      assert.equal(new Set(tirage.tirage.cartes).size, TAUX.cartes, 'jamais deux fois la même carte');
      for (const id of tirage.tirage.cartes) {
        assert.ok(idsCatalogue.has(id), `${id} est au catalogue`);
        assert.ok(vivier.includes(id), `${id} est bien au vivier du rayon`);
      }
      // La garantie des nouvelles suit ce que le vivier peut offrir : trois
      // tant qu'il reste trois cartes neuves, sinon tout ce qu'il reste.
      const attendu = Math.min(TAUX.nouvellesMin, neuvesAuVivier);
      assert.ok(tirage.tirage.nouvelles >= attendu, `${tirage.tirage.nouvelles} neuves (attendu ≥ ${attendu})`);
    }
  }
});

test('la rare est garantie, la mythique reste rare et la pitié la force', () => {
  assert.equal(TAUX.pitie, 8);
  let mythiques = 0;
  const rng = rngSeme(23);
  for (let index = 0; index < 200; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: journalier(100000), rayonId: 'braise', progression: COMPLET, rng });
    const rarete = tirage.tirage.details.map((carte) => carte.rarete);
    assert.ok(rarete.includes('rare') || rarete.includes('mythique'), 'au moins une carte rare ou mythique');
    mythiques += tirage.tirage.mythique ? 1 : 0;
  }
  assert.ok(mythiques / 200 < 0.4, `les mythiques restent rares (${mythiques}/200)`);

  // La pitié ne force que si le rayon a des mythiques à donner : sur un rayon
  // qui n'en a aucune, elle retombe sur la rare — c'est la règle, pas un oubli.
  const vivierSansMythique = vivierRayon('braise', jusqua('listes-2'));
  assert.equal(vivierSansMythique.some((id) => cardById(id).rarity === 'mythique'), false);
  const sansMythique = ouvrirBooster({ portefeuille: { ...journalier(10000), pitie: TAUX.pitie - 1 }, rayonId: 'braise', progression: jusqua('listes-2'), rng: rngSeme(3) });
  assert.equal(sansMythique.tirage.mythique, false);
  assert.ok(sansMythique.tirage.details.some((carte) => carte.rarete === 'rare'), 'la place retombe sur la rare');

  const avecPitie = { ...journalier(10000), pitie: TAUX.pitie - 1 };
  for (let index = 0; index < 20; index += 1) {
    const tirage = ouvrirBooster({ portefeuille: avecPitie, rayonId: 'braise', progression: COMPLET, rng: rngSeme(100 + index) });
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
      if (bourse.credits < 200) bourse = { ...bourse, credits: 1000000 }; // budget illimité : on mesure des taux
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
  const coffret = ouvrirCoffret({ portefeuille: depart, rayonId: 'sable', progression: COMPLET, rng: rngSeme(77) });
  assert.equal(coffret.ok, true);
  assert.equal(coffret.paquets.length, 10, 'dix paquets, même si le dernier se vide');
  assert.equal(coffret.mythique, true, 'une mythique au moins dans le coffret');
  assert.equal(coffret.prix, 1260);
  assert.equal(coffret.portefeuille.credits, 5000 - 1260 + coffret.paquets.reduce((somme, paquet) => somme + paquet.remboursement, 0));
  assert.ok(coffret.portefeuille.ouvertures >= 10);

  const pauvre = ouvrirCoffret({ portefeuille: journalier(1200), rayonId: 'sable', progression: COMPLET });
  assert.equal(pauvre.ok, false);
  assert.equal(pauvre.raison, 'solde-insuffisant');
  assert.deepEqual(pauvre.paquets, []);
});

// ── Les repères d'affichage ──────────────────────────────────────────────────

test('l’étage d’introduction d’une carte se retrouve, la dotation n’en a pas', () => {
  const etage = etageIntroduction('cavalier-amazigh-du-desert');
  assert.equal(etage.id, 'listes-1');
  assert.equal(etageIntroduction('carte-qui-nexiste-pas'), null);
  const dotation = COLLECTION_DEPART.find((id) => !Object.values(RPG_REVELATIONS_PAR_ETAGE).some((revelation) => revelation.includes(id)));
  assert.ok(dotation, 'la dotation compte des cartes qu’aucun étage ne rend');
  assert.equal(tourIntroduction(dotation), null);
  assert.equal(cardById(dotation) !== null, true);
});
