/**
 * Les Lettres de Marque — le set Piraterie Sable + Eau (doc 18).
 *
 * L'Abordage prend sa cible À L'ARRIVÉE du capteur : quand la créature
 * accoste, la créature adverse ciblée de coût ≤ seuil (le coût du capteur
 * moins un) rejoint sa cale au lieu d'être détruite. La Cale la détient face
 * visible, une seule place ; la Rançon la rend au prix imprimé ; la Cargaison
 * paie l'assurance du convoi. Ces contrôles suivent la liste du doc 18 §12.10 :
 * la prise se fait à l'arrivée et remplace la destruction sans rien
 * déclencher, une seule place, la rançon paie et rend, la cale s'ouvre à
 * toute sortie de table, Tenacité et figures refusent la cale (les boucliers,
 * eux, ne comptent plus : la prise ne blesse pas), jetons et effets créés ne
 * prennent rien, le sceau de la Lettre arme les arrivées du tour puis expire
 * mais la cale reste, Cargaison paie à la mort et à la prise, le Brûlot
 * renvoie son tueur, et l'IA du sorcier rançonne — et choisit sa prize.
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
  rpgRanconner,
  rpgPeutRanconner,
  rpgPriXRancon,
  rpgSorcierRanconnerIA,
  rpgNombreDestructions,
  rpgSacrifierCreature,
  rpgResoudreArriveeCiblee,
} from '../src/games/rpgDuel.js';
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
  assert.equal(rais.enCale.cost, 1, 'le prix de la rançon est le coût imprimé');
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

test('la rançon paie le coût imprimé en manas libres et rend la créature en main', () => {
  const duel = duelVide();
  const { rais } = priseDeBase(duel);
  duel.tour = 'joueur';
  assert.equal(rpgPeutRanconner(duel, 'sorcier', rais.id), false, 'pas de rançon pendant le tour adverse');
  duel.tour = 'sorcier';
  duel.sorcier.mana = { sable: 1, eau: 1, braise: 0 };
  const mainAvant = duel.sorcier.main.length;
  const res = rpgRanconner(duel, 'sorcier', rais.id);
  assert.equal(res.ok, true);
  assert.equal(res.prix, 1, 'le prix de la Mousse est son coût imprimé');
  assert.equal(res.carteId, 'mousse-des-galiotes');
  assert.equal(rais.enCale, null, 'la cale est vide');
  assert.equal(duel.sorcier.main.length, mainAvant + 1, 'la créature revient en main');
  assert.ok(duel.sorcier.main.includes('mousse-des-galiotes'));
  assert.equal(duel.sorcier.mana.sable + duel.sorcier.mana.eau, 1, 'un mana a été payé, libre de couleur');
  // La fenêtre de la Magie Rapide : en réponse à une annonce, la rançon part.
  duel.tour = 'joueur';
  duel.annonce = { cote: 'joueur', carteId: 'lettre-de-marque' };
  duel.sorcier.mana = { sable: 1, eau: 1, braise: 0 };
  assert.equal(rpgPeutRanconner(duel, 'sorcier', rais.id), false, 'plus de prisonnier : rien à payer');
  duel.annonce = null;
});

test('la cale s’ouvre à toute sortie de table : mort, renvoi, exil, sacrifice', () => {
  // Mort au combat du capteur.
  const mort = duelVide();
  const { rais: raisMort } = priseDeBase(mort);
  donner(mort, 'sorcier', 'salem');
  const salem = jouer(mort, 'sorcier', 'salem').entite;
  pret(salem);
  rpgAttaquerCreature(mort, 'sorcier', salem.id, raisMort.id);
  assert.equal(mort.joueur.creatures.includes(raisMort), false, 'le capteur est mort');
  assert.ok(mort.sorcier.main.includes('mousse-des-galiotes'), 'sa cale s’est ouverte vers la main adverse');

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

  // Sacrifice du capteur (mode essai).
  const sacrifice = duelEssai();
  const { rais: raisSacrifice } = priseDeBase(sacrifice);
  const res = rpgSacrifierCreature(sacrifice, 'joueur', raisSacrifice.id);
  assert.equal(res.ok, true);
  assert.ok(sacrifice.sorcier.main.includes('mousse-des-galiotes'), 'le sacrifice du capteur ouvre la cale');
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

test('les jetons et les figures légendaires ne se prennent pas : on les tue, on ne les vend pas', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Tarek dresse deux chiens de sable (jetons 1/1).
  donner(duel, 'joueur', 'tarek');
  jouer(duel, 'joueur', 'tarek');
  const chien = duel.joueur.creatures.find((entite) => entite.carteId === 'chien-de-sable');
  assert.ok(chien, 'Tarek a bien dressé ses chiens');
  // Le Cotre du sorcier (Abordage 2) ne peut pas désigner le jeton : refus.
  donner(duel, 'sorcier', 'cotre-de-course');
  assert.equal(jouer(duel, 'sorcier', 'cotre-de-course', chien.id).ok, false, 'un jeton n’est pas une cible légale');
  // Posé sans désignation, il n'auto-pick que des vraies cartes : le jeton
  // reste sur la table, aucune cale ne s'ouvre.
  const cotre = jouer(duel, 'sorcier', 'cotre-de-course').entite;
  assert.equal(cotre.enCale, null, 'un jeton n’a pas de carte à détenir');
  assert.equal(duel.joueur.creatures.includes(chien), true, 'le jeton tient toujours la table');
  // Au combat, on le tue : il cesse d'exister.
  cotre.pv = 10;
  pret(cotre);
  rpgAttaquerCreature(duel, 'sorcier', cotre.id, chien.id);
  assert.equal(duel.joueur.creatures.includes(chien), false, 'le jeton a cessé d’exister');
  // Une figure légendaire (SALEM, kind hero, coût 4) : même La Barbe-Rousse
  // (Abordage 5) refuse de la désigner.
  donner(duel, 'joueur', 'salem');
  const salem = jouer(duel, 'joueur', 'salem').entite;
  salem.bouclierLumiere = false;
  donner(duel, 'sorcier', 'la-barbe-rousse');
  assert.equal(jouer(duel, 'sorcier', 'la-barbe-rousse', salem.id).ok, false, 'on ne met pas une figure en cale');
  const amirale = jouer(duel, 'sorcier', 'la-barbe-rousse').entite;
  assert.equal(amirale.enCale, null, 'l’auto-pick l’ignore aussi');
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

test('Le Grand Débarquement arme l’assaut : +1/+0 pour la table, Abordage pour les arrivées', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  const atkAvant = tercio.atk;
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  donner(duel, 'joueur', 'le-grand-debarquement');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'le-grand-debarquement').ok, true);
  assert.equal(tercio.atk, atkAvant + 1, 'tout le quai monte à l’assaut');
  assert.equal(tercio.enCale, null, 'le renfort ne prend pas : seules les arrivées comptent');
  // L'arrivée suivante accoste (le Tercio 2, seuil 2, prend la Mousse 1).
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio2 = jouer(duel, 'joueur', 'tercio-de-cuivre', mousse.id).entite;
  assert.ok(tercio2.enCale, 'l’arrivée sous le Débarquement a pris la Mousse');
  rpgFinDeTour(duel);
  assert.equal(tercio.atk, atkAvant, 'le renfort s’évapore');
  assert.equal(duel.joueur.abordageDesArrivees, false, 'le sceau des arrivées aussi');
  assert.ok(tercio2.enCale, 'la cale, jamais');
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
  assert.equal(tercio.atk, 1, 'le Tercio s’affaisse sur le sable sous la vague');
  assert.equal(tercio.pv, 2);
  rpgFinDeTour(duel);
  assert.equal(tercio.atk, 2, 'à la fin du tour du sorcier, la vague se retire');
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

test('Le Brûlot renvoie son tueur en combat — jamais par magie, jamais capturé', () => {
  // Morte en combat : le tueur repart en main.
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
  assert.equal(duel.joueur.creatures.includes(tercio), false, 'son tueur a été renvoyé');
  assert.ok(duel.joueur.main.includes('tercio-de-cuivre'), 'le tueur est revenu en main');

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
  assert.equal(magie.joueur.creatures.includes(tercio2), true, 'tué par sort : le Tercio reste en jeu');

  // Capturé par l'Abordage à l'arrivée : la prise remplace la mort, le
  // capteur n'a rien tuu — le Brûlot (coût 2) part en la cale du Cotre (2).
  const capture = duelVide();
  mana(capture, 'joueur', 10);
  mana(capture, 'sorcier', 10);
  donner(capture, 'sorcier', 'le-brulot');
  const brulot3 = jouer(capture, 'sorcier', 'le-brulot').entite;
  donner(capture, 'joueur', 'cotre-de-course');
  const cotre = jouer(capture, 'joueur', 'cotre-de-course', brulot3.id).entite;
  assert.equal(cotre.enCale?.carteId, 'le-brulot', 'le Brûlot est pris en cale');
  assert.equal(capture.joueur.creatures.includes(cotre), true, 'son capteur n’a pas été renvoyé : rien n’est mort');
});

test('le Grappin d’abordage prend à l’attachement et paie son soin à chaque prise', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = jouer(duel, 'joueur', 'fennec-des-decombres').entite;
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  const pvAvant = duel.joueur.pv;
  donner(duel, 'joueur', 'grappin-d-abordage');
  assert.equal(rpgJouerArme(duel, 'joueur', 'grappin-d-abordage', fennec.id).ok, true);
  assert.equal(fennec.atk, 4, '+1/+1 du Grappin (3 + 1)');
  assert.equal(duel.arriveeEnAttente?.abordage, 1, 'le crochet a ouvert la désignation de prize');
  assert.equal(duel.arriveeEnAttente?.carteId, 'grappin-d-abordage', 'l’arme porte l’attente');
  const resolu = rpgResoudreArriveeCiblee(duel, 'joueur', mousse.id);
  assert.equal(resolu.ok, true);
  assert.equal(fennec.enCale?.carteId, 'mousse-des-galiotes', 'le porteur a pris la Mousse à l’attachement');
  assert.equal(duel.joueur.pv, pvAvant + 2, 'la prime du Grappin : 2 PV gagnés à la prise');
  // Sans prize possible, l'attachement ne demande rien.
  const seul = duelVide();
  mana(seul, 'joueur', 10);
  donner(seul, 'joueur', 'fennec-des-decombres');
  const fennec2 = jouer(seul, 'joueur', 'fennec-des-decombres').entite;
  donner(seul, 'joueur', 'grappin-d-abordage');
  assert.equal(rpgJouerArme(seul, 'joueur', 'grappin-d-abordage', fennec2.id).ok, true);
  assert.equal(seul.arriveeEnAttente ?? null, null, 'table adverse vide : le crochet mord dans l’eau');
});

test('le Négociant des rançons encaisse sa commission à chaque rançon', () => {
  const duel = duelVide();
  duel.joueur.deck = ['fennec-des-decombres', 'fennec-des-decombres'];
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Le Négociant du joueur regarde la mer ; le Raïs du sorcier ARRIVE et
  // prend la Mousse du joueur (coût 1 ≤ seuil 1).
  donner(duel, 'joueur', 'negociant-des-ranscons');
  jouer(duel, 'joueur', 'negociant-des-ranscons');
  donner(duel, 'joueur', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'joueur', 'mousse-des-galiotes').entite;
  donner(duel, 'sorcier', 'rais-de-la-galiote');
  const rais = jouer(duel, 'sorcier', 'rais-de-la-galiote', mousse.id).entite;
  assert.ok(rais.enCale, 'le Raïs du sorcier détient la Mousse du joueur');
  duel.tour = 'joueur';
  duel.joueur.mana = { sable: 3, eau: 3, braise: 0 };
  const deckAvant = duel.joueur.deck.length;
  const res = rpgRanconner(duel, 'joueur', rais.id);
  assert.equal(res.ok, true, 'le joueur rachète sa Mousse');
  assert.equal(duel.joueur.deck.length, deckAvant - 1, 'le Négociant a pioché sa commission');
});

test('l’IA du sorcier choisit sa prize et rançonne ce qu’elle peut payer', () => {
  // La prize : le sorcier pose son Cotre (Abordage 2) sans désigner — le
  // moteur lui choisit la prise la plus précieuse parmi les légales.
  const prise = duelVide();
  mana(prise, 'joueur', 10);
  mana(prise, 'sorcier', 10);
  donner(prise, 'joueur', 'mousse-des-galiotes');
  const mousse = jouer(prise, 'joueur', 'mousse-des-galiotes').entite;
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

  // La rançon : le Raïs du joueur détient la Mousse du sorcier (prix 1).
  const duel = duelVide();
  const { rais } = priseDeBase(duel);
  assert.ok(rais.enCale?.carteId === 'mousse-des-galiotes', 'le Raïs détient la Mousse');
  duel.tour = 'sorcier';
  duel.sorcier.mana = { sable: 0, eau: 0, braise: 0 };
  assert.deepEqual(rpgSorcierRanconnerIA(duel), [], 'sans mana, pas de rançon');
  assert.ok(rais.enCale, 'la Mousse reste détenue');
  duel.sorcier.mana = { sable: 4, eau: 4, braise: 0 };
  const rachetees = rpgSorcierRanconnerIA(duel);
  assert.equal(rachetees.length, 1);
  assert.equal(rachetees[0].carteId, 'mousse-des-galiotes');
  assert.equal(rais.enCale, null, 'la cale est vide');
  assert.ok(duel.sorcier.main.includes('mousse-des-galiotes'), 'la Mousse revient en main du sorcier');

  // Une prise trop chère (le Galion, prix 5) : sept manas ne suffisent pas au
  // tempo que l’IA s’impose (prix + 3) — elle attend un pactole.
  const cher = duelVide();
  mana(cher, 'joueur', 10);
  mana(cher, 'sorcier', 10);
  donner(cher, 'sorcier', 'galion-de-la-flotte');
  const galion = jouer(cher, 'sorcier', 'galion-de-la-flotte').entite;
  donner(cher, 'joueur', 'la-barbe-rousse');
  const amirale = jouer(cher, 'joueur', 'la-barbe-rousse', galion.id).entite;
  assert.equal(amirale.enCale?.carteId, 'galion-de-la-flotte', 'le Galion est détenu');
  assert.equal(rpgPriXRancon(amirale), 5, 'le prix du Galion est son coût imprimé');
  cher.tour = 'sorcier';
  cher.sorcier.mana = { sable: 3, eau: 4, braise: 0 };
  assert.deepEqual(rpgSorcierRanconnerIA(cher), [], 'sept manas pour huit exigés : le sorcier garde son tempo');
  assert.ok(amirale.enCale, 'le Galion croupit en cale');
  cher.sorcier.mana = { sable: 6, eau: 6, braise: 0 };
  const rachetes = rpgSorcierRanconnerIA(cher);
  assert.equal(rachetes.length, 1, 'la mer assez généreuse, il paie');
  assert.equal(rachetes[0].carteId, 'galion-de-la-flotte');
  assert.ok(cher.sorcier.main.includes('galion-de-la-flotte'));
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
  assert.deepEqual(essai.elements, ['sable', 'eau']);
  assert.deepEqual(validerDeckManaEssai(essai), { ok: true });
  assert.equal(essai.cardIds.filter((id) => id === 'la-barbe-rousse').length, 1, 'une seule mythique');
  assert.ok(essai.cardIds.every((id) => cardColors(cardById(id)).every((couleur) => ['sable', 'eau'].includes(couleur))),
    'toutes les cartes sont Sable, Eau ou les deux');
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
    assert.ok(cardColors(carte).every((couleur) => ['sable', 'eau'].includes(couleur)), `${id} tient l’identité Sable + Eau`);
  }
  assert.deepEqual(familles, { creature: 19, magie: 9, arme: 0 + 2 }, '19 créatures, 9 magies, 2 armes');
  assert.equal(boitier.cardIds.filter((id) => id === 'la-barbe-rousse').length, 1, 'La Barbe-Rousse est l’unique mythique');
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

test('les valeurs du set se paient au barème : Abordage, Cargaison, Rançon, pastilles et icônes', () => {
  const rais = cardById('rais-de-la-galiote');
  assert.ok(puissanceCarte(rais) > puissanceCarte({ ...rais, abordage: false }),
    'l’Abordage vaut son prix au barème');
  const galion = cardById('galion-de-la-flotte');
  assert.ok(puissanceCarte(galion) > puissanceCarte({ ...galion, cargaison: 0 }),
    'la Cargaison assure le convoi au barème');
  const negociant = cardById('negociant-des-ranscons');
  assert.ok(puissanceCarte(negociant) > puissanceCarte({ ...negociant, declencheRancon: 0 }),
    'la commission du Négociant compte');
  const lettre = cardById('lettre-de-marque');
  assert.ok(puissanceCarte(lettre) > 0, 'le sceau des arrivées vaut son prix au barème');

  assert.deepEqual(libellesPastilles('rais-de-la-galiote'), ['Abordage 1'], 'le Raïs porte la pastille Abordage 1');
  assert.deepEqual(libellesPastilles('la-barbe-rousse').slice(0, 1), ['Abordage 5'], 'l’amirale porte Abordage 5');
  assert.deepEqual(libellesPastilles('galion-de-la-flotte'), ['Cargaison 2'], 'le Galion porte la pastille Cargaison 2');
  assert.deepEqual(libellesPastilles('negociant-des-ranscons'), ['Rançon 1'], 'le Négociant porte la pastille Rançon');
  assert.ok(libellesPastilles('grappin-d-abordage').includes('Abordage 1'), 'le Grappin porte Abordage 1');
  const noire = cardById('la-barbe-noire');
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
