/**
 * Les Lettres de Marque — le set Piraterie Sable + Eau (doc 18).
 *
 * L'Abordage prend sa cible À L'ARRIVÉE du capteur : quand la créature
 * accoste, la créature adverse ciblée de coût ≤ seuil (le coût du capteur
 * moins un) rejoint sa cale au lieu d'être détruite. La Cale la détient face
 * visible, une seule place ; il n'y a **pas** de rachat — la détenue ne revient
 * qu'en faisant quitter la table au capteur ; la Cargaison paie l'assurance du
 * convoi. Ces contrôles suivent la liste du doc 18 §12.10 :
 * la prise se fait à l'arrivée et remplace la destruction sans rien
 * déclencher, une seule place, la cale ne se rachète pas, la cale s'ouvre à
 * toute sortie de table — EN JEU quand le capteur meurt (statistiques de la
 * prise, aucun effet d'arrivée), en main sinon —, Tenacité et figures
 * refusent la cale (les boucliers,
 * eux, ne comptent plus : la prise ne blesse pas), jetons et effets créés ne
 * prennent rien, le sceau de la Lettre arme les arrivées du tour puis expire
 * mais la cale reste, Cargaison paie à la mort et à la prise, le Brûlot
 * embrase son tueur, et l'IA du sorcier choisit sa prize.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  rpgNouveauDuel,
  rpgJouerCreature,
  rpgLancerMagie,
  rpgAttaquerCreature,
  rpgJouerArme,
  rpgFinDeTour,
  rpgTourSorcierPreparationIA,
  rpgNombreDestructions,
  rpgSacrifierCreature,
  rpgResoudreArriveeCiblee,
  rpgResoudreSiteCible,
  rpgBlesserCreature,
  rpgPeutAttaquer,
  rpgCoutEntite,
} from '../src/games/rpgDuel.js';
import * as moteurDuel from '../src/games/rpgDuel.js';
import {
  RPG_DECKS,
  RPG_DECK_LETTRES_DE_MARQUE_BASE,
  CATALOGUE_DU_COMPOSEUR,
  cardById,
  cardColors,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import {
  RPG_MANA_ESSAI_DECKS,
  RPG_MODE_MANA_ESSAI,
  validerDeckManaEssai,
  deckManaEssaiParId,
} from '../src/games/rpgManaEssai.js';
import { RPG_RECETTES_DECKS } from '../src/games/rpgDeckRecipes.js';
import { composerDeck } from '../src/games/rpgDeckComposer.js';
import { puissanceCarte } from '../src/games/rpgCardPower.js';
import { pastillesPourCarte, iconePourLigne } from '../src/games/effetIcons.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';
import { RPG_LETTRES_DE_MARQUE_JETONS } from '../src/games/rpgLettresDeMarque.js';
import { cardArtEntite } from '../src/games/rpgCardArt.js';

const duelVide = () => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
const duelEssai = () => {
  const duel = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [],
    joueurCouleurs: ['sable', 'eau'], sorcierCouleurs: ['sable', 'eau'],
    modeMana: RPG_MODE_MANA_ESSAI,
  });
  // Le banc d’essai attend d’abord le choix de la première couleur de mana :
  // ici, les camps ont déjà leur réserve — on saute l’attente.
  duel.joueur.manaChoixEnAttente = false;
  duel.sorcier.manaChoixEnAttente = false;
  return duel;
};
const donner = (duel, cote, id) => duel[cote].main.push(id);
const mana = (duel, cote, n) => {
  duel[cote].mana.sable += n;
  duel[cote].mana.eau += n;
  duel[cote].mana.braise += n;
  duel[cote].mana.neige += n;
  // La Barbe Noire est devenue une carte 100 % Ténèbres : son mana la suit.
  duel[cote].mana.tenebres += n;
};
const jouer = (duel, cote, id, cibleId = null) => rpgJouerCreature(duel, cote, id, cibleId);
const pret = (entite) => {
  entite.ready = true;
  entite.attaquee = false;
};
const art = (id) => fileURLToPath(new URL(`../public/cards/${id}.jpg`, import.meta.url));
const libellesPastilles = (id) => pastillesPourCarte(cardById(id))
  .map((pastille) => (pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label));

/** Le Raïs de la galiote (2/2, Abordage 1 — coût 2 moins un) du joueur
 *  capture la Mousse (1/2) adverse DÈS SON ARRIVÉE en jeu. */
function priseDeBase(duel = duelVide(), victime = 'mousse-des-galiotes') {
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', victime);
  const cible = jouer(duel, 'sorcier', victime).entite;
  donner(duel, 'joueur', 'rais-de-la-galiote');
  const rais = jouer(duel, 'joueur', 'rais-de-la-galiote', cible.id).entite;
  return { rais, cible };
}

test('la prise se fait à l’arrivée : rien ne se déclenche, ni compteur, ni cimetière, ni riposte', () => {
  const duel = duelVide();
  duel.sorcier.deck = ['tercio-de-cuivre', 'tercio-de-cuivre', 'mousse-des-galiotes'];
  const destructionsAvant = rpgNombreDestructions(duel);
  const { rais, cible } = priseDeBase(duel);
  assert.ok(rais.enCale, 'le Raïs détient sa victime dès son arrivée');
  assert.equal(rais.enCale.carteId, 'mousse-des-galiotes');
  assert.equal(rais.enCale.entite.name, 'Mousse des galiotes', 'la cale garde la présence prise');
  assert.equal(duel.sorcier.creatures.includes(cible), false, 'la prisonnière a quitté la table');
  assert.equal(duel.sorcier.cimetiere.includes('mousse-des-galiotes'), false, 'elle n’est pas au cimetière');
  assert.equal(duel.joueur.creatures.includes(rais), true, 'le capteur tient la table');
  assert.equal(rais.pv, rais.def, 'aucun combat : le capteur n’a rien encaissé');
  assert.equal(rpgNombreDestructions(duel), destructionsAvant, 'aucune destruction comptée : les quêtes ne bougent pas');
  assert.ok(duel.log.some((ligne) => ligne.includes('prend') && ligne.includes('cale')), 'la prise s’écrit au journal');
  assert.ok(duel.combatFeed.some((evenement) => evenement.type === 'prise'), 'le journal visuel montre la prise');
});

test('le seuil suit le barème « coût du capteur − 1 » : une créature qui coûte 5 prend tout ce qui coûte 4 ou moins', () => {
  // Le Raïs (coût 2, Abordage 1) prend la Mousse (1) mais pas le Pilote (2).
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'pilote-de-la-carreira');
  const pilote = jouer(duel, 'sorcier', 'pilote-de-la-carreira').entite;
  donner(duel, 'joueur', 'rais-de-la-galiote');
  assert.equal(jouer(duel, 'joueur', 'rais-de-la-galiote', pilote.id).ok, false, 'cible trop chère : la pose est refusée');
  assert.equal(duel.joueur.main.includes('rais-de-la-galiote'), true, 'la carte reste en main');
  // Même créature posée sans désignation : l’auto-pick ne trouve rien.
  const res = jouer(duel, 'joueur', 'rais-de-la-galiote');
  assert.equal(res.ok, true);
  assert.equal(res.entite.enCale, null, 'aucune prise sans cible de bon coût');

  // Le Cotre (coût 3, Abordage 2) prend le Pilote (2).
  const cotre = duelVide();
  mana(cotre, 'joueur', 10);
  mana(cotre, 'sorcier', 10);
  donner(cotre, 'sorcier', 'pilote-de-la-carreira');
  const pilote2 = jouer(cotre, 'sorcier', 'pilote-de-la-carreira').entite;
  donner(cotre, 'joueur', 'cotre-de-course');
  const resCotre = jouer(cotre, 'joueur', 'cotre-de-course', pilote2.id);
  assert.equal(resCotre.ok, true);
  assert.equal(resCotre.entite.enCale?.carteId, 'pilote-de-la-carreira', 'le Cotre prend le coût 2');

  // La Barbe-Rousse (coût 6, Abordage 5) prend le Galion (5) — voir aussi
  // le test Cargaison, qui rejoue ce cas complet avec les jetons.
  const amirale = duelVide();
  mana(amirale, 'joueur', 10);
  mana(amirale, 'sorcier', 10);
  donner(amirale, 'sorcier', 'galion-de-la-flotte');
  const galion = jouer(amirale, 'sorcier', 'galion-de-la-flotte').entite;
  donner(amirale, 'joueur', 'la-barbe-rousse');
  const resAmirale = jouer(amirale, 'joueur', 'la-barbe-rousse', galion.id);
  assert.equal(resAmirale.ok, true);
  assert.equal(resAmirale.entite.enCale?.carteId, 'galion-de-la-flotte', 'l’amirale prend le coût 5');
});

test('la désignation différée : la créature se pose, la table désigne, la prize tombe', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'sorcier', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'sorcier', 'tercio-de-cuivre').entite;
  // La page pose d'abord (`cibleDifferee`) : l'attente s'ouvre sur la table.
  donner(duel, 'joueur', 'rais-de-la-galiote');
  const res = rpgJouerCreature(duel, 'joueur', 'rais-de-la-galiote', null, { cibleDifferee: true });
  assert.equal(res.ok, true);
  assert.equal(res.arriveeEnAttente, true, 'le Raïs attend sa prize');
  assert.equal(duel.arriveeEnAttente?.abordage, 1, 'l’attente porte le seuil');
  assert.equal(duel.arriveeEnAttente?.carteId, 'rais-de-la-galiote');
  assert.equal(duel.joueur.creatures.includes(res.entite), true, 'le Raïs est déjà posé');
  // Un clic illégal (le Tercio coûte 3) est refusé, l'attente reste ouverte.
  assert.equal(rpgResoudreArriveeCiblee(duel, 'joueur', tercio.id).ok, false);
  assert.equal(duel.arriveeEnAttente?.abordage, 1, 'l’attente a survécu au clic illégal');
  assert.equal(duel.sorcier.creatures.includes(tercio), true, 'le Tercio n’a pas bougé');
  // Le clic légal prend la Mousse.
  const resolu = rpgResoudreArriveeCiblee(duel, 'joueur', mousse.id);
  assert.equal(resolu.ok, true);
  assert.equal(duel.arriveeEnAttente, null, 'l’attente est refermée');
  assert.equal(resolu.cible.carteId, 'mousse-des-galiotes');
  assert.equal(res.entite.enCale?.carteId, 'mousse-des-galiotes', 'la Mousse est en cale');
  // Sans cible légale sur la table, la pose différée n'ouvre aucune attente.
  const vide = duelVide();
  mana(vide, 'joueur', 10);
  donner(vide, 'joueur', 'cotre-de-course');
  const resVide = rpgJouerCreature(vide, 'joueur', 'cotre-de-course', null, { cibleDifferee: true });
  assert.equal(resVide.ok, true);
  assert.equal(resVide.arriveeEnAttente, undefined, 'table adverse vide : pas d’attente');
  assert.equal(vide.arriveeEnAttente ?? null, null);
});

test('une capacité de mort ne se déclenche pas sur une prise : le Ghul capturé ne frappe personne', () => {
  // Le Ghul des cendres : 1/1, sa mort inflige 1 dégât à une créature désignée.
  // Pris en cale par le Cotre (Abordage 2) du sorcier à son arrivée : rien.
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'ghul-des-cendres');
  const ghul = jouer(duel, 'joueur', 'ghul-des-cendres').entite;
  donner(duel, 'sorcier', 'cotre-de-course');
  const cotre = jouer(duel, 'sorcier', 'cotre-de-course', ghul.id).entite;
  assert.equal(cotre.enCale?.carteId, 'ghul-des-cendres', 'le Ghul est pris, pas détruit');
  assert.equal(duel.destructionsEnAttente, undefined, 'aucune désignation de cible en attente');
  assert.equal(JSON.stringify(duel.log).includes('désignez'), false, 'le journal ne demande rien');
  assert.equal(duel.joueur.cimetiere.includes('ghul-des-cendres'), false, 'le Ghul n’est pas au cimetière');
  // Même créature, morte d’une attaque ordinaire : la capacité part bien.
  const duel2 = duelVide();
  mana(duel2, 'joueur', 10);
  mana(duel2, 'sorcier', 10);
  donner(duel2, 'joueur', 'ghul-des-cendres');
  const ghul2 = jouer(duel2, 'joueur', 'ghul-des-cendres').entite;
  donner(duel2, 'sorcier', 'tercio-de-cuivre');
  const tercio = jouer(duel2, 'sorcier', 'tercio-de-cuivre').entite;
  pret(tercio);
  rpgAttaquerCreature(duel2, 'sorcier', tercio.id, ghul2.id);
  assert.equal(duel2.joueur.cimetiere.includes('ghul-des-cendres'), true, 'sans Abordage, le Ghul meurt');
  assert.equal(duel2.destructionsEnAttente?.length, 1, 'sa mort déclenche la désignation de sa victime');
  assert.ok(duel2.log.some((ligne) => ligne.includes('désignez')), 'la désignation s’écrit au journal');

  // La Momie de lin (coût 3) capturée par La Barbe-Rousse (Abordage 5) ne
  // laisse pas de Shabti : la prise court-circuite les « quand meurt » à
  // jetons comme les « quand meurt » à dégâts.
  const momie = duelVide();
  mana(momie, 'joueur', 10);
  mana(momie, 'sorcier', 10);
  momie.joueur.mana = { braise: 6, eau: 6, sable: 6, neige: 6, tenebres: 6 };
  donner(momie, 'joueur', 'momie-de-lin');
  const lin = jouer(momie, 'joueur', 'momie-de-lin').entite;
  donner(momie, 'sorcier', 'la-barbe-rousse');
  const amirale = jouer(momie, 'sorcier', 'la-barbe-rousse', lin.id).entite;
  assert.equal(amirale.enCale?.carteId, 'momie-de-lin', 'la Momie est prise');
  assert.equal(momie.joueur.creatures.length, 0, 'aucun jeton Shabti n’a surgi de ses bandelettes');
  assert.equal(JSON.stringify(momie.log).includes('Shabti'), false, 'le journal n’en parle même pas');
  assert.equal(momie.sorcier.creatures.filter((entite) => entite.carteId === 'corsaire').length, 2,
    'les deux Corsaires ont bien débarqué, eux');

  // L’Honneur du Soleil rouge non plus : pris, le Samouraï du torii (coût 3)
  // ne frappe personne en tombant — La Barbe-Rousse le prend vif.
  const honneur = duelVide();
  mana(honneur, 'joueur', 10);
  mana(honneur, 'sorcier', 10);
  honneur.joueur.mana = { braise: 6, eau: 6, sable: 6, neige: 6, tenebres: 6 };
  donner(honneur, 'joueur', 'samourai-du-torii');
  const samourai = jouer(honneur, 'joueur', 'samourai-du-torii').entite;
  donner(honneur, 'sorcier', 'la-barbe-rousse');
  const amiraleHonneur = jouer(honneur, 'sorcier', 'la-barbe-rousse', samourai.id).entite;
  assert.equal(amiraleHonneur.enCale?.carteId, 'samourai-du-torii', 'le Samouraï est pris');
  assert.equal(amiraleHonneur.pv, amiraleHonneur.def, 'aucun combat, aucune riposte : aucune dernière frappe d’Honneur');
  assert.equal(JSON.stringify(honneur.log).includes('Honneur'), false, 'le journal ignore l’Honneur');
});

test('une seule place en cale : le Grappin ne reprend pas sur un porteur déjà plein', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Le Raïs du joueur capture la Mousse du sorcier.
  const { rais } = priseDeBase(duel);
  assert.ok(rais.enCale, 'la première victime est en cale');
  // Le Grappin s'attache au Raïs déjà plein : aucune désignation ne s'ouvre,
  // la seconde Mousse reste sur la table.
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const seconde = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'joueur', 'grappin-d-abordage');
  assert.equal(rpgJouerArme(duel, 'joueur', 'grappin-d-abordage', rais.id).ok, true);
  assert.equal(duel.arriveeEnAttente ?? null, null, 'un porteur plein n’ouvre aucune désignation');
  assert.equal(duel.sorcier.creatures.includes(seconde), true, 'la seconde Mousse tient la table');
  assert.equal(rais.enCale.carteId, 'mousse-des-galiotes', 'et la cale n’a pas changé de main');
  // Chaque capteur a SA place : un second Raïs prend la seconde Mousse.
  donner(duel, 'joueur', 'rais-de-la-galiote');
  const secondRais = jouer(duel, 'joueur', 'rais-de-la-galiote', seconde.id).entite;
  assert.equal(secondRais.enCale?.carteId, 'mousse-des-galiotes', 'l’autre cale s’est remplie');
});

test('la cale ne se rachète pas : seul un départ de table du capteur libère la détenue', () => {
  const duel = duelVide();
  const { rais } = priseDeBase(duel);
  // Le moteur ne connaît plus de rachat : aucun export de rançon ne subsiste.
  for (const nom of ['rpgRanconner', 'rpgPeutRanconner', 'rpgPriXRancon', 'rpgSorcierRanconnerIA']) {
    assert.equal(nom in moteurDuel, false, `${nom} a disparu du moteur : le rachat n’existe plus`);
  }
  // Le propriétaire a beau avoir du mana plein et son tour, la cale reste fermée.
  duel.tour = 'sorcier';
  mana(duel, 'sorcier', 10);
  duel.finDeTour = { cote: 'joueur' };
  assert.ok(rais.enCale, 'la Mousse reste détenue tant que le Raïs tient la table');
  assert.equal(duel.sorcier.creatures.length, 0, 'aucune créature ne revient d’elle-même');
  assert.equal(duel.sorcier.main.includes('mousse-des-galiotes'), false, 'et rien n’arrive en main');
  duel.finDeTour = null;
});

test('la mort du capteur rend la détenue EN JEU, avec ses statistiques de prise et sans effet d’arrivée', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Tislit des aures (1/1, arrivée : piochez une carte) est la proie du Raïs.
  donner(duel, 'sorcier', 'tislit-des-aures');
  const tislit = jouer(duel, 'sorcier', 'tislit-des-aures').entite;
  // Elle a grandi avant la prise : ce sont CES chiffres que la cale garde.
  tislit.atk = 3;
  tislit.def = 4;
  tislit.pvMax = 4;
  tislit.pv = 4;
  const deckApresArrivee = duel.sorcier.deck.length;
  donner(duel, 'joueur', 'rais-de-la-galiote');
  const rais = jouer(duel, 'joueur', 'rais-de-la-galiote', tislit.id).entite;
  assert.equal(rais.enCale?.carteId, 'tislit-des-aures', 'la prise se fait à l’arrivée');
  assert.equal(duel.sorcier.creatures.includes(tislit), false, 'la détenue quitte le champ');

  // Le Raïs meurt au combat : sa cale s’ouvre et la détenue revient sur le champ.
  donner(duel, 'sorcier', 'salem');
  const salem = jouer(duel, 'sorcier', 'salem').entite;
  pret(salem);
  rpgAttaquerCreature(duel, 'sorcier', salem.id, rais.id);
  assert.equal(duel.joueur.creatures.includes(rais), false, 'le capteur est mort');
  const revenue = duel.sorcier.creatures.find((entite) => entite.carteId === 'tislit-des-aures');
  assert.ok(revenue, 'la détenue revient en jeu, pas en main');
  assert.equal(revenue.atk, 3, 'l’attaque de la prise est rendue');
  assert.equal(revenue.def, 4, 'la défense de la prise aussi');
  assert.equal(revenue.pv, 4, 'avec ses points de vie d’avant la cale');
  assert.equal(duel.sorcier.main.includes('tislit-des-aures'), false, 'elle ne repasse pas en main');
  assert.equal(duel.sorcier.cimetiere.includes('tislit-des-aures'), false, 'elle n’est pas au cimetière non plus');
  assert.equal(duel.sorcier.deck.length, deckApresArrivee, 'aucun effet d’arrivée ne se rejoue');
  assert.equal(revenue.ready, false, 'mal d’invocation : le retour n’offre pas d’attaque gratuite');
  assert.match(duel.log.at(-2) ?? duel.log.at(-1) ?? '', /revient en jeu avec 3\/4/,
    'le journal dit le retour et ses chiffres');
});

test('la cale s’ouvre à toute sortie de table : mort et sacrifice en jeu, renvoi et exil en main', () => {
  // Mort au combat du capteur : la détenue revient EN JEU.
  const mort = duelVide();
  const { rais: raisMort } = priseDeBase(mort);
  donner(mort, 'sorcier', 'salem');
  const salem = jouer(mort, 'sorcier', 'salem').entite;
  pret(salem);
  rpgAttaquerCreature(mort, 'sorcier', salem.id, raisMort.id);
  assert.equal(mort.joueur.creatures.includes(raisMort), false, 'le capteur est mort');
  assert.ok(mort.sorcier.creatures.some((entite) => entite.carteId === 'mousse-des-galiotes'),
    'sa cale s’est ouverte en jeu, chez son propriétaire');
  assert.equal(mort.sorcier.main.includes('mousse-des-galiotes'), false, 'pas en main : le capteur a coulé');

  // Renvoi en main du capteur (le Sonneur fêlé rebondit le Raïs).
  const renvoi = duelVide();
  const { rais: raisRenvoi } = priseDeBase(renvoi);
  donner(renvoi, 'sorcier', 'sonneur-fele');
  jouer(renvoi, 'sorcier', 'sonneur-fele', raisRenvoi.id);
  assert.equal(renvoi.joueur.creatures.includes(raisRenvoi), false, 'le capteur est renvoyé en main');
  assert.ok(renvoi.sorcier.main.includes('mousse-des-galiotes'), 'le prisonnier suit, dans SA main à lui');

  // Exil du capteur (l’arrivée de La Dévoreuse avale le Raïs).
  const exil = duelVide();
  const { rais: raisExil } = priseDeBase(exil);
  exil.sorcier.mana = { braise: 6, eau: 6, sable: 6, neige: 6, tenebres: 6 };
  donner(exil, 'sorcier', 'la-devoreuse');
  assert.equal(jouer(exil, 'sorcier', 'la-devoreuse', raisExil.id).ok, true);
  assert.ok((exil.joueur.exil ?? []).includes('rais-de-la-galiote'), 'le capteur est exilé');
  assert.ok(exil.sorcier.main.includes('mousse-des-galiotes'), 'même l’au-delà paie ses dettes');

  // Sacrifice du capteur (mode essai) : c’est une mort, la détenue revient en jeu.
  const sacrifice = duelEssai();
  const { rais: raisSacrifice } = priseDeBase(sacrifice);
  const res = rpgSacrifierCreature(sacrifice, 'joueur', raisSacrifice.id);
  assert.equal(res.ok, true);
  assert.ok(sacrifice.sorcier.creatures.some((entite) => entite.carteId === 'mousse-des-galiotes'),
    'le sacrifice du capteur ouvre la cale en jeu');

  // Champ plein chez le propriétaire : pas de place, la carte repart en main.
  const plein = duelEssai();
  const { rais: raisPlein } = priseDeBase(plein);
  mana(plein, 'sorcier', 20);
  for (const id of ['ouvrier-du-natron', 'chacal-du-seuil', 'ashigaru-des-braises', 'scribe-des-feuillets', 'loup-des-neiges']) {
    donner(plein, 'sorcier', id);
    assert.equal(jouer(plein, 'sorcier', id).ok, true, `le sorcier pose ${id}`);
  }
  assert.equal(plein.sorcier.creatures.length, 5, 'les cinq cases du sorcier sont prises');
  assert.equal(rpgSacrifierCreature(plein, 'joueur', raisPlein.id).ok, true);
  assert.ok(plein.sorcier.main.includes('mousse-des-galiotes'),
    'sans place libre, la détenue retourne en main au lieu de déborder du champ');
});

test('la capture d’un capteur ouvre sa propre cale : la prisonnière du prisonnier s’échappe', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Le Raïs du joueur capture la Mousse du sorcier.
  const { rais, mousse } = priseDeBase(duel);
  assert.ok(rais.enCale);
  assert.equal(duel.sorcier.creatures.includes(mousse), false);
  // Le Cotre du sorcier (Abordage 2) ARRIVE et prend le Raïs (coût 2) : la
  // cale du Raïs s'ouvre avant sa propre capture — la Mousse s'échappe.
  donner(duel, 'sorcier', 'cotre-de-course');
  const cotre = jouer(duel, 'sorcier', 'cotre-de-course', rais.id).entite;
  assert.ok(cotre.enCale, 'le Cotre détient le Raïs');
  assert.equal(cotre.enCale.carteId, 'rais-de-la-galiote');
  assert.ok(duel.sorcier.main.includes('mousse-des-galiotes'), 'la cale du Raïs s’est ouverte avant sa capture');
});

test('la Tenacité refuse la cale, les boucliers ne comptent plus : la prise ne blesse pas', () => {
  const tenacite = duelVide();
  mana(tenacite, 'joueur', 10);
  mana(tenacite, 'sorcier', 10);
  donner(tenacite, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(tenacite, 'sorcier', 'mousse-des-galiotes').entite;
  mousse.tenaciteDisponible = true;
  // Désignée d'avance : la pose est refusée.
  donner(tenacite, 'joueur', 'rais-de-la-galiote');
  assert.equal(jouer(tenacite, 'joueur', 'rais-de-la-galiote', mousse.id).ok, false,
    'on ne prend pas ce qui refuse de mourir : cible illégale');
  // Posé sans désignation : l'auto-pick l'ignore, aucune prise.
  const rais = jouer(tenacite, 'joueur', 'rais-de-la-galiote').entite;
  assert.equal(rais.enCale, null, 'la Mousse tenace n’a pas été prise');
  assert.equal(tenacite.sorcier.creatures.includes(mousse), true, 'elle tient la table');
  // Elle meurt normalement au combat, et sa renaissance est promise.
  pret(rais);
  rpgAttaquerCreature(tenacite, 'joueur', rais.id, mousse.id);
  assert.equal(tenacite.sorcier.cimetiere.length, 1, 'la Mousse tenace tombe comme les autres');
  assert.ok(
    tenacite.sorcier.retoursProgrammes?.some((retour) => retour.carteId === 'mousse-des-galiotes' && retour.tenacite),
    'sa renaissance est promise au prochain tour de son camp',
  );

  // Un bouclier n'empêche plus la prise : la capture ne passe pas par les
  // blessures — la Mousse blindée part en cale, intacte sous ses plaques.
  const bouclier = duelVide();
  mana(bouclier, 'joueur', 10);
  mana(bouclier, 'sorcier', 10);
  donner(bouclier, 'sorcier', 'mousse-des-galiotes');
  const blindee = jouer(bouclier, 'sorcier', 'mousse-des-galiotes').entite;
  blindee.bouclier = 5;
  donner(bouclier, 'joueur', 'rais-de-la-galiote');
  const raisBlindage = jouer(bouclier, 'joueur', 'rais-de-la-galiote', blindee.id).entite;
  assert.equal(raisBlindage.enCale?.carteId, 'mousse-des-galiotes', 'le bouclier n’a rien arrêté');
  assert.equal(bouclier.sorcier.cimetiere.length, 0, 'personne n’est mort');
});

test('les jetons sont prisables par l’abordage : on les met en cale', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Tarek dresse deux chiens de sable (jetons 1/1).
  donner(duel, 'joueur', 'tarek');
  jouer(duel, 'joueur', 'tarek');
  const chiens = duel.joueur.creatures.filter((entite) => entite.carteId === 'chien-de-sable');
  assert.equal(chiens.length, 2, 'Tarek a bien dressé ses deux chiens');
  // Le Cotre du sorcier (Abordage 2) peut désigner un jeton : il est pris en cale.
  donner(duel, 'sorcier', 'cotre-de-course');
  assert.equal(jouer(duel, 'sorcier', 'cotre-de-course', chiens[0].id).ok, true, 'un jeton est une cible légale pour l’abordage');
  const cotre = duel.sorcier.creatures.find((entite) => entite.carteId === 'cotre-de-course');
  assert.equal(cotre.enCale?.carteId, 'chien-de-sable', 'le premier jeton est mis en cale');
  assert.equal(duel.joueur.creatures.includes(chiens[0]), false, 'le premier jeton a quitté la table');
  // Le second jeton est aussi prisable : l'auto-pick le prend.
  donner(duel, 'sorcier', 'cotre-de-course');
  const cotre2 = jouer(duel, 'sorcier', 'cotre-de-course').entite;
  assert.equal(cotre2.enCale?.carteId, 'chien-de-sable', 'le second jeton est pris en auto-pick');
  assert.equal(duel.joueur.creatures.filter((e) => e.carteId === 'chien-de-sable').length, 0, 'plus de jeton sur la table');
  // Une figure légendaire (SALEM, kind hero, coût 4) : même La Barbe-Rousse
  // (Abordage 5) refuse de la désigner.
  donner(duel, 'joueur', 'salem');
  const salem = jouer(duel, 'joueur', 'salem').entite;
  salem.bouclierLumiere = false;
  donner(duel, 'sorcier', 'la-barbe-rousse');
  assert.equal(jouer(duel, 'sorcier', 'la-barbe-rousse', salem.id).ok, false, 'on ne met pas une figure en cale');
  const amirale = jouer(duel, 'sorcier', 'la-barbe-rousse').entite;
  assert.equal(amirale.enCale, null, 'l’auto-pick ignore la figure légendaire');
  // Au combat, elle meurt.
  salem.pv = 2;
  salem.def = 2;
  pret(amirale);
  rpgAttaquerCreature(duel, 'sorcier', amirale.id, salem.id);
  assert.equal(duel.joueur.cimetiere.includes('salem'), true, 'SALEM est détruite');
});

test('le jeton Corsaire n’accoste pas : créé par effet, il ne prend rien', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  // La Barbe-Rousse débarque son équipage : les deux Corsaires arrivent par
  // effet, pas depuis la main — aucun ne déclenche l'Abordage.
  donner(duel, 'joueur', 'la-barbe-rousse');
  const amirale = jouer(duel, 'joueur', 'la-barbe-rousse', mousse.id).entite;
  const corsaires = duel.joueur.creatures.filter((entite) => entite.carteId === 'corsaire');
  assert.equal(corsaires.length, 2, 'l’équipage a débarqué');
  assert.ok(corsaires.every((entite) => entite.enCale === null), 'aucun Corsaire n’a pris la moindre prize');
  // Même la fiche du jeton ne porte plus le mot-clé : il n’y a plus rien à
  // prêter à ce qui ne se joue pas depuis la main.
  assert.equal(RPG_LETTRES_DE_MARQUE_JETONS[0].abordage, undefined, 'la fiche du Corsaire est muette');
});

test('la Lettre de marque arme les arrivées pour un tour — la cale déjà prise reste pleine', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  assert.equal(cardById('tercio-de-cuivre').abordage, undefined, 'le Tercio n’a pas l’Abordage imprimé');
  donner(duel, 'joueur', 'lettre-de-marque');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'lettre-de-marque').ok, true);
  assert.equal(tercio.enCale, null, 'le sceau ne se gratte pas après coup : le Tercio déjà posé ne prend rien');
  // Le Tercio (3/4) est déjà là — c'est la suivante arrivée qui accoste :
  // le Routier ? Non : une créature. Le Tercio Deux prend la Mousse (1 ≤ 2).
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio2 = jouer(duel, 'joueur', 'tercio-de-cuivre', mousse.id).entite;
  assert.ok(tercio2.enCale, 'l’arrivée sous sceau a pris la Mousse (seuil : coût 3 − 1 = 2)');
  assert.equal(duel.joueur.abordageDesArrivees, true, 'le drapeau du camp est levé');
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.abordageDesArrivees, false, 'à la fin du tour, la lettre expire');
  assert.ok(tercio2.enCale, 'mais la cale prise ne se vide jamais d’elle-même');
  // Le tour suivant : une nouvelle arrivée ne prend plus rien.
  duel.tour = 'joueur';
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse2 = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio3 = jouer(duel, 'joueur', 'tercio-de-cuivre', mousse2.id).entite;
  assert.equal(tercio3.enCale, null, 'le sceau a expiré : la pose suivante n’accoste plus');
});

test('le Pilote de la Carreira arme la seule prochaine créature jouée ce tour', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 12);
  mana(duel, 'sorcier', 12);
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  // Le Pilote arrive : il ne prend rien lui-même, il arme la pose suivante.
  donner(duel, 'joueur', 'pilote-de-la-carreira');
  const pilote = jouer(duel, 'joueur', 'pilote-de-la-carreira').entite;
  assert.equal(pilote.enCale, null, 'le Pilote ne s’arme pas lui-même');
  assert.equal(duel.sorcier.creatures.includes(mousse), true, 'la Mousse tient encore la table');
  assert.equal(duel.joueur.prochaineArriveeAbordage, true, 'le routier est ouvert pour la prochaine pose');
  // Le Tercio (aucun Abordage imprimé) accoste au barème : coût 3 − 1 = 2.
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre', mousse.id).entite;
  assert.equal(tercio.enCale?.carteId, 'mousse-des-galiotes', 'la créature armée par le Pilote a pris la Mousse');
  assert.equal(duel.joueur.prochaineArriveeAbordage, false, 'le sceau est consommé par cette unique pose');
  // La créature suivante n’accoste plus : une seule route lue par tour (et par Pilote).
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse2 = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio2 = jouer(duel, 'joueur', 'tercio-de-cuivre', mousse2.id).entite;
  assert.equal(tercio2.enCale, null, 'sans sceau en cours, la pose suivante ne prend rien');

  // Non dépensé, le sceau meurt avec le tour qui l’a vu naître.
  const tardif = duelVide();
  mana(tardif, 'joueur', 10);
  donner(tardif, 'joueur', 'pilote-de-la-carreira');
  jouer(tardif, 'joueur', 'pilote-de-la-carreira');
  assert.equal(tardif.joueur.prochaineArriveeAbordage, true);
  rpgFinDeTour(tardif);
  assert.equal(tardif.joueur.prochaineArriveeAbordage, false, 'le tour fermé emporte le routier');
});

test('Le Grand Débarquement arme les cales pleines : +2/+2 et Overkill jusqu’à la fin du tour', () => {
  const duel = duelVide();
  const { rais } = priseDeBase(duel);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  const atkRais = rais.atk;
  const pvRais = rais.pv;
  const atkTercio = tercio.atk;
  donner(duel, 'joueur', 'le-grand-debarquement');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'le-grand-debarquement').ok, true);
  assert.equal(rais.atk, atkRais + 2, 'sa cale pleine débarque en force');
  assert.equal(rais.pv, pvRais + 2, 'le renfort tient aussi en défense');
  assert.equal(rais.overkill, true, 'Overkill pour la créature qui détient une prise');
  assert.equal(tercio.atk, atkTercio, 'une cale vide ne débarque personne');
  assert.equal(tercio.overkill, false, 'pas d’Overkill sans prise à bord');
  assert.ok(!duel.joueur.abordageDesArrivees, 'le Débarquement n’arme plus les arrivées — la Lettre seule le fait');
  rpgFinDeTour(duel);
  assert.equal(rais.atk, atkRais, 'le renfort s’évapore');
  assert.equal(rais.pv, pvRais, 'la défense prêtée repart avec');
  assert.equal(rais.overkill, false, 'l’Overkill prêté aussi');
  assert.ok(rais.enCale, 'la cale, jamais');

  // Sans aucune cale occupée, personne ne débarque.
  const vide = duelVide();
  mana(vide, 'joueur', 10);
  donner(vide, 'joueur', 'tercio-de-cuivre');
  const solitaire = jouer(vide, 'joueur', 'tercio-de-cuivre').entite;
  donner(vide, 'joueur', 'le-grand-debarquement');
  assert.equal(rpgLancerMagie(vide, 'joueur', 'le-grand-debarquement').ok, true);
  assert.equal(solitaire.atk, 1, 'aucun bonus sans cale pleine (le Tercio est un 1/4)');
  assert.equal(solitaire.overkill, false);
});

test('Haut-fond amollit la prise : -1/-2 pour un tour, la vague rend son dû', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  duel.tour = 'sorcier';
  duel.sorcier.mana = { sable: 3, eau: 3, braise: 0 };
  donner(duel, 'sorcier', 'haut-fond');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'haut-fond', tercio.id).ok, true);
  assert.equal(tercio.atk, 0, 'le Tercio 1/4 s’affaisse sur le sable sous la vague');
  assert.equal(tercio.pv, 2);
  rpgFinDeTour(duel);
  assert.equal(tercio.atk, 1, 'à la fin du tour du sorcier, la vague se retire');
  assert.equal(tercio.pv, 4);
});

test('Cargaison paie à la mort ET à la prise : le convoi est assuré', () => {
  // À la prise — La Barbe-Rousse (Abordage 5) prend le Galion (5).
  const prise = duelVide();
  prise.sorcier.deck = ['tercio-de-cuivre', 'tercio-de-cuivre'];
  mana(prise, 'joueur', 10);
  mana(prise, 'sorcier', 10);
  donner(prise, 'sorcier', 'galion-de-la-flotte');
  const galion = jouer(prise, 'sorcier', 'galion-de-la-flotte').entite;
  donner(prise, 'joueur', 'la-barbe-rousse');
  const mainAvant = prise.sorcier.main.length;
  const amirale = jouer(prise, 'joueur', 'la-barbe-rousse', galion.id).entite;
  assert.ok(amirale.enCale?.carteId === 'galion-de-la-flotte', 'le Galion est pris, pas coulé');
  assert.equal(prise.sorcier.main.length, mainAvant + 2, 'son propriétaire pioche deux cartes');
  assert.equal(prise.sorcier.deck.length, 0, 'les deux cartes venaient du paquet');

  // À la mort (sort direct, sans Abordage).
  const mort = duelVide();
  mort.sorcier.deck = ['tercio-de-cuivre', 'tercio-de-cuivre'];
  mana(mort, 'joueur', 10);
  mana(mort, 'sorcier', 10);
  mort.joueur.mana = { sable: 4, eau: 4, braise: 4 };
  donner(mort, 'sorcier', 'galion-de-la-flotte');
  const galion2 = jouer(mort, 'sorcier', 'galion-de-la-flotte').entite;
  galion2.pv = 2;
  galion2.def = 2;
  const mainAvant2 = mort.sorcier.main.length;
  donner(mort, 'joueur', 'trait-de-braise');
  assert.equal(rpgLancerMagie(mort, 'joueur', 'trait-de-braise', galion2.id).ok, true);
  assert.equal(mort.sorcier.cimetiere.includes('galion-de-la-flotte'), true, 'cette fois le Galion meurt');
  assert.equal(mort.sorcier.main.length, mainAvant2 + 2, 'la Cargaison paie aussi à la mort');
});

test('Le Brûlot embrase la créature qui le détruit en combat — jamais par magie', () => {
  // Morte en combat : le tueur survivant encaisse 2 dégâts.
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  donner(duel, 'sorcier', 'le-brulot');
  const brulot = jouer(duel, 'sorcier', 'le-brulot').entite;
  pret(tercio);
  rpgAttaquerCreature(duel, 'joueur', tercio.id, brulot.id);
  assert.equal(duel.sorcier.cimetiere.includes('le-brulot'), true, 'le Brûlot est mort');
  assert.equal(duel.joueur.creatures.includes(tercio), true, 'son tueur survit à l’échange');
  assert.equal(tercio.pv, 1, 'le Tercio 1/4 a pris 1 au combat et 2 à l’explosion');

  // Un tueur qui tombe avec lui n'a pas à être embrasé : la Vipère 3/1 meurt
  // du seul retour de combat, et l'explosion n'a plus de cible.
  const double = duelVide();
  mana(double, 'joueur', 10);
  mana(double, 'sorcier', 10);
  donner(double, 'joueur', 'vipere-de-verre');
  const vipere = jouer(double, 'joueur', 'vipere-de-verre').entite;
  donner(double, 'sorcier', 'le-brulot');
  const brulotDouble = jouer(double, 'sorcier', 'le-brulot').entite;
  pret(vipere);
  rpgAttaquerCreature(double, 'joueur', vipere.id, brulotDouble.id);
  assert.equal(double.sorcier.cimetiere.includes('le-brulot'), true);
  assert.equal(double.joueur.cimetiere.includes('vipere-de-verre'), true, 'la Vipère meurt du retour de combat');

  // La capacité de combat (le Sahir frappe avant les coups normaux) nomme
  // elle aussi son auteur : le Brûlot qu’elle tue embrase le Sahir.
  const capacite = duelVide();
  mana(capacite, 'joueur', 12);
  mana(capacite, 'sorcier', 12);
  donner(capacite, 'joueur', 'sahir-des-braises');
  const sahir = jouer(capacite, 'joueur', 'sahir-des-braises').entite;
  donner(capacite, 'sorcier', 'le-brulot');
  const brulotCapacite = jouer(capacite, 'sorcier', 'le-brulot').entite;
  pret(sahir);
  rpgAttaquerCreature(capacite, 'joueur', sahir.id, brulotCapacite.id);
  assert.equal(capacite.sorcier.cimetiere.includes('le-brulot'), true, 'la capacité tue le Brûlot');
  assert.equal(sahir.pv, 1, 'le Sahir 2/3 encaisse les 2 dégâts de l’explosion');

  // Protégée contre la Braise, la Valkyrie des glaces ne sent rien : le
  // Brûlot est désormais une créature Braise, sa frappe comme son explosion
  // s'écrasent sur la protection.
  const protegee = duelVide();
  mana(protegee, 'joueur', 12);
  mana(protegee, 'sorcier', 12);
  donner(protegee, 'joueur', 'valkyrie-des-glaces');
  const valkyrie = jouer(protegee, 'joueur', 'valkyrie-des-glaces').entite;
  donner(protegee, 'sorcier', 'le-brulot');
  const brulotProtege = jouer(protegee, 'sorcier', 'le-brulot').entite;
  pret(valkyrie);
  rpgAttaquerCreature(protegee, 'joueur', valkyrie.id, brulotProtege.id);
  assert.equal(protegee.sorcier.cimetiere.includes('le-brulot'), true);
  assert.equal(valkyrie.pv, 5, 'ni la frappe du Brûlot ni l’explosion ne passent la protection');

  // Morte par magie : le tueur est inconnu, rien ne se déclenche.
  const magie = duelVide();
  mana(magie, 'joueur', 10);
  mana(magie, 'sorcier', 10);
  donner(magie, 'joueur', 'tercio-de-cuivre');
  const tercio2 = jouer(magie, 'joueur', 'tercio-de-cuivre').entite;
  donner(magie, 'sorcier', 'le-brulot');
  const brulot2 = jouer(magie, 'sorcier', 'le-brulot').entite;
  magie.joueur.mana = { sable: 4, eau: 4, braise: 4 };
  donner(magie, 'joueur', 'trait-de-braise');
  assert.equal(rpgLancerMagie(magie, 'joueur', 'trait-de-braise', brulot2.id).ok, true);
  assert.equal(magie.sorcier.cimetiere.includes('le-brulot'), true);
  assert.equal(magie.joueur.creatures.includes(tercio2), true, 'tué par sort : le Tercio reste intact');
  assert.equal(tercio2.pv, 4, 'aucune explosion hors combat');

  // Capturé par l'Abordage à l'arrivée : la prise remplace la mort, le
  // capteur n'a rien tué — le Brûlot (coût 2) part en la cale du Cotre (2).
  const capture = duelVide();
  mana(capture, 'joueur', 10);
  mana(capture, 'sorcier', 10);
  donner(capture, 'sorcier', 'le-brulot');
  const brulot3 = jouer(capture, 'sorcier', 'le-brulot').entite;
  donner(capture, 'joueur', 'cotre-de-course');
  const cotre = jouer(capture, 'joueur', 'cotre-de-course', brulot3.id).entite;
  assert.equal(cotre.enCale?.carteId, 'le-brulot', 'le Brûlot est pris en cale');
  assert.equal(capture.joueur.creatures.includes(cotre), true, 'son capteur n’a pas été embrasé : rien n’est mort');
  assert.equal(cotre.pv, 1, 'le Cotre garde ses 1 PV');
});

test('le Grappin (4 manas) alourdit son porteur de 1, puis active Abordage selon son coût augmenté', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 12);
  mana(duel, 'sorcier', 12);
  assert.equal(cardById('grappin-d-abordage').cost, 4, 'le crochet se paie désormais quatre manas');
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = jouer(duel, 'joueur', 'fennec-des-decombres').entite;
  assert.equal(rpgCoutEntite(fennec), 2, 'le Fennec vaut d’abord son coût imprimé');
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'sorcier', 'pilote-de-la-carreira');
  const pilote = jouer(duel, 'sorcier', 'pilote-de-la-carreira').entite;
  const pvAvant = duel.joueur.pv;
  donner(duel, 'joueur', 'grappin-d-abordage');
  assert.equal(rpgJouerArme(duel, 'joueur', 'grappin-d-abordage', fennec.id).ok, true);
  assert.equal(fennec.atk, 4, '+1/+1 du Grappin (3 + 1)');
  assert.equal(rpgCoutEntite(fennec), 3, 'équipé, le coût du porteur augmente de 1');
  assert.equal(duel.arriveeEnAttente?.abordage, 2, 'Abordage X : coût augmenté (3) moins un');
  assert.equal(duel.arriveeEnAttente?.carteId, 'grappin-d-abordage', 'l’arme porte l’attente');
  // Le joueur **choisit** sa prize : le Pilote (coût 2) plutôt que la
  // Mousse (coût 1) — impossible sous l’ancien seuil fixe de 1.
  const resolu = rpgResoudreArriveeCiblee(duel, 'joueur', pilote.id);
  assert.equal(resolu.ok, true);
  assert.equal(fennec.enCale?.carteId, 'pilote-de-la-carreira', 'le porteur a pris la créature choisie, au seuil de son coût augmenté');
  assert.equal(duel.sorcier.creatures.includes(mousse), true, 'la Mousse épargnée tient la table');
  assert.equal(duel.joueur.pv, pvAvant + 2, 'la prime du Grappin : 2 PV gagnés à la prise');
  // Remplacer l’arme rend le coût imprimé : le surcoût ne survit pas au crochet.
  donner(duel, 'joueur', 'baton-des-citernes');
  assert.equal(rpgJouerArme(duel, 'joueur', 'baton-des-citernes', fennec.id).ok, true);
  assert.equal(rpgCoutEntite(fennec), 2, 'le Grappin parti, le porteur coûte à nouveau son imprimé');
  assert.equal(fennec.enCale?.carteId, 'pilote-de-la-carreira', 'la prise, elle, reste en cale');
  // Sans prize possible, l'attachement ne demande rien.
  const seul = duelVide();
  mana(seul, 'joueur', 10);
  donner(seul, 'joueur', 'fennec-des-decombres');
  const fennec2 = jouer(seul, 'joueur', 'fennec-des-decombres').entite;
  donner(seul, 'joueur', 'grappin-d-abordage');
  assert.equal(rpgJouerArme(seul, 'joueur', 'grappin-d-abordage', fennec2.id).ok, true);
  assert.equal(seul.arriveeEnAttente ?? null, null, 'table adverse vide : le crochet mord dans l’eau');
});

test('le Négociant des prises encaisse sa commission à chaque créature mise en cale', () => {
  const duel = duelVide();
  duel.joueur.deck = ['fennec-des-decombres', 'fennec-des-decombres'];
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Le Négociant du joueur regarde la mer ; le Raïs du sorcier ARRIVE et
  // prend la Mousse du joueur (coût 1 ≤ seuil 1) : la commission tombe à la
  // prise, sans rien payer.
  donner(duel, 'joueur', 'negociant-des-ranscons');
  jouer(duel, 'joueur', 'negociant-des-ranscons');
  donner(duel, 'joueur', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'joueur', 'mousse-des-galiotes').entite;
  const deckAvant = duel.joueur.deck.length;
  donner(duel, 'sorcier', 'rais-de-la-galiote');
  const rais = jouer(duel, 'sorcier', 'rais-de-la-galiote', mousse.id).entite;
  assert.ok(rais.enCale, 'le Raïs du sorcier détient la Mousse du joueur');
  assert.equal(duel.joueur.deck.length, deckAvant - 1, 'le Négociant a pioché sa commission à la prise');
});

test('l’IA du sorcier choisit sa prise la plus précieuse parmi les légales', () => {
  const prise = duelVide();
  mana(prise, 'joueur', 10);
  mana(prise, 'sorcier', 10);
  donner(prise, 'joueur', 'mousse-des-galiotes');
  jouer(prise, 'joueur', 'mousse-des-galiotes');
  donner(prise, 'joueur', 'le-brulot');
  const brulot = jouer(prise, 'joueur', 'le-brulot').entite;
  donner(prise, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(prise, 'joueur', 'tercio-de-cuivre').entite; // coût 3 : trop cher
  donner(prise, 'sorcier', 'cotre-de-course');
  const cotre = jouer(prise, 'sorcier', 'cotre-de-course').entite;
  assert.equal(cotre.enCale?.carteId, 'le-brulot',
    'l’auto-pick a pris le Brûlot (coût 2), pas la Mousse (coût 1) ni le Tercio (coût 3, hors seuil)');
  assert.equal(prise.joueur.creatures.includes(brulot), false);
  assert.equal(prise.joueur.creatures.includes(tercio), true, 'le Tercio coûteux reste sur la table');
});

test('rien ne rend une prise trop chère : même riche, l’IA ne rachète plus la cale adverse', () => {
  // La disparition de la rançon vaut aussi pour l'IA : sa préparation de tour
  // ne paie plus rien pour récupérer une créature détenue.
  const cher = duelVide();
  mana(cher, 'joueur', 10);
  mana(cher, 'sorcier', 10);
  donner(cher, 'sorcier', 'galion-de-la-flotte');
  const galion = jouer(cher, 'sorcier', 'galion-de-la-flotte').entite;
  donner(cher, 'joueur', 'la-barbe-rousse');
  const amirale = jouer(cher, 'joueur', 'la-barbe-rousse', galion.id).entite;
  assert.equal(amirale.enCale?.carteId, 'galion-de-la-flotte', 'le Galion est détenu');
  cher.tour = 'sorcier';
  mana(cher, 'sorcier', 10);
  rpgTourSorcierPreparationIA(cher);
  assert.ok(amirale.enCale, 'le Galion croupit en cale : l’IA ne rachète pas');
  assert.equal(cher.sorcier.main.includes('galion-de-la-flotte'), false, 'rien ne revient en main');
});

test('La Barbe Noire change de visage au début de chaque tour — et ne se prend jamais en cale', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Elle arrive sous le visage de l'homme : 2/7 avec Provocation, et son
  // Abordage 4 emporte une créature adverse de coût ≤ 4.
  donner(duel, 'sorcier', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'sorcier', 'tercio-de-cuivre').entite;
  donner(duel, 'joueur', 'la-barbe-noire');
  const noire = jouer(duel, 'joueur', 'la-barbe-noire', tercio.id).entite;
  assert.ok(noire.enCale?.carteId === 'tercio-de-cuivre', 'l’homme a pris le Tercio à l’arrivée');
  assert.equal(noire.atk, 2, 'l’homme est un mur');
  assert.equal(noire.def, 7);
  assert.equal(noire.provocation, true, 'l’homme tient le rempart');
  assert.equal(noire.visage, 0);
  // Le tour du sorcier s'ouvre : son camp ne tourne pas, elle reste l'homme.
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(noire.visage, 0, 'le visage ne tour qu’au début du tour de son camp');
  // Le tour du joueur s'ouvre : la légende se réveille — 6/2, plus de mur.
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(noire.visage, 1);
  assert.equal(noire.atk, 6, 'la légende frappe');
  assert.equal(noire.def, 2);
  assert.equal(noire.provocation, false, 'la légende ne se cache derrière rien');
  // Blessée sous la légende (1 PV), elle redevient l'homme : les blessures
  // suivent — ni mort, ni soin gratuit.
  noire.pv = 1;
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(noire.visage, 0);
  assert.equal(noire.def, 7);
  assert.equal(noire.pv, 6, 'blessures conservées : 7 − (2 − 1)');
  assert.equal(noire.provocation, true, 'le rempart revient avec l’homme');
  // Et la légende revient tour après tour — personne ne choisit.
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(noire.visage, 1);
  assert.equal(noire.atk, 6);

  // Le dédoublement : même La Barbe-Rousse adverse (Abordage 5, et la Noire
  // coûte 5) ne peut pas la prendre — ni en la désignant, ni en auto-pick.
  const miroir = duelVide();
  mana(miroir, 'joueur', 10);
  mana(miroir, 'sorcier', 10);
  donner(miroir, 'joueur', 'la-barbe-noire');
  const insaisissable = jouer(miroir, 'joueur', 'la-barbe-noire').entite;
  donner(miroir, 'sorcier', 'la-barbe-rousse');
  assert.equal(jouer(miroir, 'sorcier', 'la-barbe-rousse', insaisissable.id).ok, false,
    'la désignation refuse l’insaisissable');
  const rousse = jouer(miroir, 'sorcier', 'la-barbe-rousse').entite;
  assert.equal(rousse.enCale, null, 'l’auto-pick la laisse sur la table');
  assert.equal(miroir.joueur.creatures.includes(insaisissable), true, 'on emporte un visage, l’autre reste');
});

test('le deck d’essai et le boîtier des Lettres de Marque suivent les règles du jeu', () => {
  // Le banc d'essai : 30 cartes Sable + Eau, validateur content.
  const essai = deckManaEssaiParId('essai-mana-lettres-de-marque');
  assert.ok(essai, 'le cinquième deck d’essai existe');
  assert.equal(essai.cardIds.length, 30);
  assert.deepEqual(essai.elements, ['sable', 'eau', 'braise'],
    'Sable + Eau, plus la flamme du Brûlot');
  assert.deepEqual(validerDeckManaEssai(essai), { ok: true });
  assert.equal(essai.cardIds.filter((id) => id === 'la-barbe-rousse').length, 1, 'une seule mythique');
  assert.ok(essai.cardIds.every((id) => cardColors(cardById(id)).every((couleur) => ['sable', 'eau', 'braise'].includes(couleur))),
    'toutes les cartes sont Sable, Eau, ou Braise pour le seul Brûlot');
  assert.equal(essai.cardIds.filter((id) => cardColors(cardById(id)).includes('braise')).length, 2,
    'seul le Brûlot apporte la Braise, en deux exemplaires');
  assert.equal(RPG_MANA_ESSAI_DECKS.length, 5, 'le banc d’essai compte cinq paquets');

  // Le boîtier de l'étagère : composé par sa recette, pas écrit à la main.
  const boitier = RPG_DECKS.find((deck) => deck.id === 'lettres-de-marque');
  assert.ok(boitier, 'le boîtier est sur l’étagère');
  assert.deepEqual(boitier.cardIds, composerDeck(RPG_RECETTES_DECKS['lettres-de-marque'], CATALOGUE_DU_COMPOSEUR),
    'la liste est celle de la recette');
  assert.equal(boitier.cardIds, RPG_DECK_LETTRES_DE_MARQUE_BASE);
  assert.equal(rpgValiderDeck(boitier.cardIds).ok, true);
  assert.equal(boitier.cardIds.length, 30);
  const familles = { creature: 0, magie: 0, arme: 0 };
  for (const id of boitier.cardIds) {
    const carte = cardById(id);
    familles[carte.kind === 'magie' ? 'magie' : carte.kind === 'arme' ? 'arme' : 'creature'] += 1;
    // Le Brûlot est l'exception assumée : la seule flamme (Braise) de la
    // flotte, posée par la signature hors du vivier Sable + Eau.
    const couleursAutorisees = carte.id === 'le-brulot' ? ['sable', 'eau', 'braise'] : ['sable', 'eau'];
    assert.ok(cardColors(carte).every((couleur) => couleursAutorisees.includes(couleur)), `${id} tient l’identité Sable + Eau`);
  }
  assert.deepEqual(familles, { creature: 19, magie: 9, arme: 0 + 2 }, '19 créatures, 9 magies, 2 armes');
  assert.equal(boitier.cardIds.filter((id) => id === 'la-barbe-rousse').length, 1, 'La Barbe-Rousse est l’unique mythique');
  assert.equal(boitier.cardIds.filter((id) => id === 'le-brulot').length, 2, 'le Brûlot reste la flamme de la flotte');
  assert.deepEqual(cardColors(cardById('le-brulot')), ['braise'], 'le Brûlot est une créature Braise');
  assert.equal(boitier.boxArt, 'la-barbe-rousse');
  assert.ok(existsSync(art('la-barbe-rousse')), 'l’illustration du boîtier est livrée');

  // La frontière du Souk : pas de dotation gratuite, mais des révélations.
  for (const id of ['mousse-des-galiotes', 'rais-de-la-galiote', 'negociant-des-ranscons', 'la-barbe-rousse']) {
    assert.equal(COLLECTION_DEPART.includes(id), false, `${id} n’est pas dans la dotation de départ`);
    assert.ok(carteReveleePar(id), `${id} entre dans la ville par une révélation d’étage`);
  }
  // Les quinze cartes du set + le jeton Corsaire ont leur peinture plein art.
  for (const id of [
    'mousse-des-galiotes', 'rais-de-la-galiote', 'pilote-de-la-carreira', 'le-brulot',
    'tercio-de-cuivre', 'cotre-de-course', 'le-renegat', 'negociant-des-ranscons',
    'galion-de-la-flotte', 'la-barbe-rousse', 'lettre-de-marque', 'haut-fond',
    'le-routier', 'le-grand-debarquement', 'grappin-d-abordage', 'corsaire',
    'la-barbe-noire',
  ]) {
    assert.ok(existsSync(art(id)), `${id} a sa peinture plein art`);
  }
});

test('les valeurs du set se paient au barème : Abordage, Cargaison, Prise, pastilles et icônes', () => {
  const rais = cardById('rais-de-la-galiote');
  assert.ok(puissanceCarte(rais) > puissanceCarte({ ...rais, abordage: false }),
    'l’Abordage vaut son prix au barème');
  const galion = cardById('galion-de-la-flotte');
  assert.ok(puissanceCarte(galion) > puissanceCarte({ ...galion, cargaison: 0 }),
    'la Cargaison assure le convoi au barème');
  const negociant = cardById('negociant-des-ranscons');
  assert.ok(puissanceCarte(negociant) > puissanceCarte({ ...negociant, declenchePrise: 0 }),
    'la commission du Négociant compte');
  const lettre = cardById('lettre-de-marque');
  assert.ok(puissanceCarte(lettre) > 0, 'le sceau des arrivées vaut son prix au barème');

  assert.deepEqual(libellesPastilles('rais-de-la-galiote'), ['Abordage 1'], 'le Raïs porte la pastille Abordage 1');
  assert.deepEqual(libellesPastilles('la-barbe-rousse').slice(0, 1), ['Abordage 5'], 'l’amirale porte Abordage 5');
  assert.deepEqual(libellesPastilles('galion-de-la-flotte'), ['Coup rapide', 'Abordage 4', 'Cargaison 2'],
    'le Galion 2/5 porte Coup rapide, Abordage 4 et Cargaison 2');
  assert.equal(galion.atk, 2, 'le Galion est un 2/5');
  assert.equal(galion.def, 5);
  assert.deepEqual(libellesPastilles('le-chasseur-d-ocracoke'), ['Rapidité', 'Coup rapide', 'Traque 3'],
    'le Chasseur porte la pastille de sa Traque');
  assert.ok(libellesPastilles('le-grand-debarquement').includes('Overkill'),
    'le Grand Débarquement annonce l’Overkill sur sa face');
  assert.deepEqual(libellesPastilles('negociant-des-ranscons'), ['Prise 1'], 'le Négociant porte la pastille Prise');
  assert.ok(libellesPastilles('grappin-d-abordage').includes('Abordage'),
    'le Grappin porte la pastille Abordage — dynamique, sans chiffre imprimé');
  assert.deepEqual(libellesPastilles('tercio-de-cuivre'), ['Coup rapide'],
    'le Tercio 1/4 porte la pastille Coup rapide');
  assert.equal(cardById('tercio-de-cuivre').atk, 1, 'le Tercio est un 1/4');
  assert.ok(libellesPastilles('pilote-de-la-carreira').includes('Abordage'),
    'le Pilote annonce sur sa face l’Abordage qu’il offre à la prochaine pose');
  const noire = cardById('la-barbe-noire');
  assert.equal(noire.element, 'tenebres', 'La Barbe Noire est devenue une carte Ténèbres');
  assert.deepEqual(cardColors(noire), ['tenebres'], '100 % Ténèbres : ni Sable ni Eau');
  assert.ok(puissanceCarte(noire) > puissanceCarte({ ...noire, alternance: null, insaisissable: false }),
    'le dédoublement vaut son prix au barème');
  assert.deepEqual(libellesPastilles('la-barbe-noire'), ['Provocation', 'Abordage 4', 'Deux Visages'],
    'la Barbe Noire porte ses trois pastilles');
  assert.equal(iconePourLigne(noire,
    'Deux Visages — elle arrive en jeu sous le visage de l’homme (2/7 avec Provocation) ; au début de chacun de vos tours, elle change.'),
    'visages', 'la ligne de règle se lit Deux Visages');
  assert.equal(iconePourLigne(cardById('rais-de-la-galiote'),
    'Abordage 1 — quand le Raïs arrive en jeu, la créature adverse ciblée de coût 1 ou moins est prise en sa cale.'),
    'abordage', 'la ligne de règle se lit Abordage');
  assert.equal(iconePourLigne(cardById('galion-de-la-flotte'),
    'Cargaison 2 — Quand le Galion meurt ou est pris en cale, piochez deux cartes.'),
    'cargaison', 'la ligne de règle se lit Cargaison');
});

test('La légende du Hollandais volant (ex-Vengeance) : 2/4 avec Coup rapide, +2/+0 et Butin uniquement quand sa cale est occupée', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 12);
  mana(duel, 'sorcier', 12);
  assert.equal(cardById('la-vengeance-de-la-reine-anne').name, 'La légende du Hollandais volant',
    'la Vengeance a changé de nom — son identifiant, lui, demeure pour les collections');
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'joueur', 'la-vengeance-de-la-reine-anne');
  const hollandais = jouer(duel, 'joueur', 'la-vengeance-de-la-reine-anne', mousse.id).entite;

  assert.equal(hollandais.pvMax, 4, 'le vaisseau fantôme est un 2/4');
  assert.equal(hollandais.coupRapide, true, 'avec Coup rapide');
  assert.equal(hollandais.enCale?.carteId, 'mousse-des-galiotes', 'il garde son Abordage 3');
  assert.equal(hollandais.atk, 4, 'la cale comble donne +2 attaque');
  assert.equal(hollandais.butin, true, 'la cale comble donne Butin');

  // La cale ne se rachète pas : il faut tuer le Hollandais pour que la Mousse
  // quitte sa cale — et comme la mort rend en jeu, elle n'arrive pas en main.
  assert.equal(rpgBlesserCreature(duel, 'joueur', hollandais.id, 99).ok, true);
  assert.equal(hollandais.enCale, null);
  assert.equal(hollandais.atk, 2, 'le bonus disparaît avec la prisonnière');
  assert.equal(hollandais.butin, false, 'le Butin conditionnel disparaît lui aussi');
});

test('la Prime du Chasseur d’Ocracoke pioche quand il détruit une créature pirate qualifiée', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 12);
  mana(duel, 'sorcier', 12);
  donner(duel, 'sorcier', 'cotre-de-course');
  const cotre = jouer(duel, 'sorcier', 'cotre-de-course').entite;
  donner(duel, 'joueur', 'le-chasseur-d-ocracoke');
  const chasseur = jouer(duel, 'joueur', 'le-chasseur-d-ocracoke').entite;
  duel.joueur.deck = ['mousse-des-galiotes'];
  const mainAvant = duel.joueur.main.length;

  pret(chasseur);
  assert.equal(rpgAttaquerCreature(duel, 'joueur', chasseur.id, cotre.id).ok, true);
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === cotre.id), false);
  assert.equal(duel.joueur.main.length, mainAvant + 1, 'la Prime fait piocher exactement une carte');
  assert.equal(chasseur.coupRapide, true);
  assert.equal(chasseur.atk, 3, 'le Chasseur est un 3/6');
  assert.equal(chasseur.pvMax, 6);
  assert.ok(!cardById(chasseur.carteId).insaisissable, 'Insaisissable lui a été retiré');
  assert.equal(cardById(chasseur.carteId).traquePirates, 3, 'il traque à +3/+0');
});

test('La Traque du Chasseur : +3/+0 contre les proies de la course, rien contre les autres', () => {
  // — Contre une proie (La Barbe-Rousse, 4/5 avec Abordage) : 3 + 3 = 6
  // dégâts la font sombrer malgré ses 5 PV, et la Prime paie en sus.
  const duel = duelVide();
  mana(duel, 'joueur', 12);
  mana(duel, 'sorcier', 12);
  donner(duel, 'sorcier', 'la-barbe-rousse');
  const proie = jouer(duel, 'sorcier', 'la-barbe-rousse').entite;
  donner(duel, 'joueur', 'le-chasseur-d-ocracoke');
  const chasseur = jouer(duel, 'joueur', 'le-chasseur-d-ocracoke').entite;
  duel.joueur.deck = ['mousse-des-galiotes'];
  const mainAvant = duel.joueur.main.length;
  pret(chasseur);
  assert.equal(rpgAttaquerCreature(duel, 'joueur', chasseur.id, proie.id).ok, true);
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === proie.id), false,
    'la Traque achève une proie que ses 3 d’attaque seuls épargnaient');
  assert.ok(duel.joueur.creatures.includes(chasseur), 'le Chasseur survit à la riposte de 4');
  assert.equal(duel.joueur.main.length, mainAvant + 1, 'la Prime pioche sur la traque réussie');
  assert.ok(duel.log.some((ligne) => ligne.startsWith('Traque')), 'la Traque s’écrit au journal');

  // — Contre une créature ordinaire (Tercio de cuivre, 2/4, aucun mot de la
  // course) : 3 dégâts seulement, elle tient, aucune Traque à consigner.
  const neutre = duelVide();
  mana(neutre, 'joueur', 12);
  mana(neutre, 'sorcier', 12);
  donner(neutre, 'sorcier', 'tercio-de-cuivre');
  const tercio = jouer(neutre, 'sorcier', 'tercio-de-cuivre').entite;
  donner(neutre, 'joueur', 'le-chasseur-d-ocracoke');
  const chasseur2 = jouer(neutre, 'joueur', 'le-chasseur-d-ocracoke').entite;
  pret(chasseur2);
  const journalAvant = neutre.log.length;
  assert.equal(rpgAttaquerCreature(neutre, 'joueur', chasseur2.id, tercio.id).ok, true);
  assert.ok(neutre.sorcier.creatures.includes(tercio), 'facé à la loi ordinaire : 3 dégâts n’entament que 3 PV');
  assert.equal(tercio.pv, 1);
  assert.equal(neutre.log.slice(journalAvant).some((ligne) => ligne.startsWith('Traque')), false,
    'rien à traquer sur une cible qui ne fait pas la course');
});

test('la Source de Bimini porte ses trois Heures, change d’étape et consacre définitivement une créature', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const cible = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  cible.pv = 1;
  cible.def = 1;
  donner(duel, 'joueur', 'source-de-bimini');
  const source = jouer(duel, 'joueur', 'source-de-bimini').entite;

  assert.equal(source.heures.restants, 3);
  assert.match(cardArtEntite(source), /source-de-bimini\.jpg/);
  assert.equal(rpgPeutAttaquer(source), false, 'un Site ne peut jamais attaquer');
  rpgBlesserCreature(duel, 'joueur', source.id, 99, 'braise');
  assert.ok(duel.joueur.creatures.includes(source), 'la Source est indestructible');

  rpgFinDeTour(duel); // tour du sorcier
  rpgFinDeTour(duel); // tour du joueur : 2
  assert.equal(source.heures.restants, 2);
  assert.match(cardArtEntite(source), /source-de-bimini-2\.jpg/);
  rpgFinDeTour(duel);
  rpgFinDeTour(duel); // 1
  assert.equal(source.heures.restants, 1);
  assert.match(cardArtEntite(source), /source-de-bimini-1\.jpg/);
  rpgFinDeTour(duel);
  rpgFinDeTour(duel); // 0, choix
  assert.equal(source.heures, null);
  assert.match(cardArtEntite(source), /source-de-bimini-0\.jpg/);
  assert.equal(duel.siteEnAttente?.recompense, 'bimini');

  const res = rpgResoudreSiteCible(duel, 'joueur', cible.id);
  assert.equal(res.ok, true);
  assert.equal(cible.atk, 4, 'le Tercio 1/4 consacré par Bimini frappe à 1 + 3');
  assert.equal(cible.pvMax, 7);
  assert.equal(cible.pv, 7, 'la créature est entièrement soignée après le +3/+3');
  assert.equal(cible.def, 7);
  assert.equal(cible.protectionSorts, true);
  assert.equal(cible.tenaciteDisponible, true);
  assert.equal(duel.siteEnAttente, null);
  assert.ok(duel.joueur.creatures.includes(source), 'le Site reste posé après sa résolution');
});

test('le Trésor de Lima porte deux Heures puis fait piocher deux cartes', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'le-tresor-de-lima');
  const tresor = jouer(duel, 'joueur', 'le-tresor-de-lima').entite;
  duel.joueur.deck = ['mousse-des-galiotes', 'tercio-de-cuivre', 'le-brulot', 'haut-fond'];

  assert.equal(tresor.heures.restants, 2);
  rpgFinDeTour(duel);
  rpgFinDeTour(duel); // pioche de tour + une Heure restante
  assert.equal(tresor.heures.restants, 1);
  assert.equal(duel.joueur.main.length, 1);
  rpgFinDeTour(duel);
  rpgFinDeTour(duel); // pioche de tour + les deux cartes du Trésor
  assert.equal(tresor.heures, null);
  assert.equal(duel.joueur.main.length, 4, 'deux pioches normales et deux cartes du Trésor');
  assert.equal(duel.joueur.deck.length, 0);
  assert.ok(duel.joueur.creatures.includes(tresor), 'le Trésor persiste sur son emplacement');
});

test('les quatre nouvelles cartes pirates sont révélées avec leurs peintures d’étapes', () => {
  assert.equal(cardById('la-vengeance-de-la-reine-anne').rarity, 'rare');
  assert.equal(cardById('la-vengeance-de-la-reine-anne').name, 'La légende du Hollandais volant');
  assert.equal(cardById('le-chasseur-d-ocracoke').rarity, 'mythique');
  assert.equal(cardById('source-de-bimini').kind, 'site');
  assert.equal(cardById('source-de-bimini').rarity, 'mythique');
  assert.equal(cardById('le-tresor-de-lima').site.compteurs, 2);
  assert.equal(carteReveleePar('la-vengeance-de-la-reine-anne')?.etageId, 'sables-2');
  assert.equal(carteReveleePar('le-tresor-de-lima')?.etageId, 'sables-2');
  assert.equal(carteReveleePar('le-chasseur-d-ocracoke')?.etageId, 'sables-3');
  assert.equal(carteReveleePar('source-de-bimini')?.etageId, 'sables-3');

  for (const id of [
    'la-vengeance-de-la-reine-anne', 'le-chasseur-d-ocracoke',
    'source-de-bimini', 'source-de-bimini-2', 'source-de-bimini-1', 'source-de-bimini-0',
    'le-tresor-de-lima', 'le-tresor-de-lima-1', 'le-tresor-de-lima-0',
  ]) {
    assert.ok(existsSync(art(id)), `${id} a sa peinture plein art 1024 × 1280`);
  }
  assert.ok(puissanceCarte(cardById('source-de-bimini')) > 40, 'le Site mythique valorise sa récompense différée');
});
