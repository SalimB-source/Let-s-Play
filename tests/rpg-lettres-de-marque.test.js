/**
 * Les Lettres de Marque — le set Piraterie Sable + Eau (doc 17).
 *
 * L'Abordage prend la créature vaincue en cale au lieu de la détruire ; la
 * Cale la détient face visible, une seule place ; la Rançon la rend au prix
 * imprimé ; la Cargaison paie l'assurance du convoi. Ces contrôles suivent la
 * liste du doc 17 §12.10 : la prise remplace la destruction sans rien
 * déclencher, une seule place, la rançon paie et rend, la cale s'ouvre à
 * toute sortie de table, Tenacité et boucliers protègent, jetons et figures
 * ne se prennent pas, le buff de la Lettre expire mais la cale reste,
 * Cargaison paie à la mort et à la prise, le Brûlot renvoie son tueur, et
 * l'IA du sorcier rançonne.
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

/** Le Raïs de la galiote (2/2, Abordage) du joueur capture la Mousse (1/2) adverse. */
function priseDeBase(duel = duelVide(), victime = 'mousse-des-galiotes') {
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'rais-de-la-galiote');
  const rais = jouer(duel, 'joueur', 'rais-de-la-galiote').entite;
  donner(duel, 'sorcier', victime);
  const cible = jouer(duel, 'sorcier', victime).entite;
  pret(rais);
  const res = rpgAttaquerCreature(duel, 'joueur', rais.id, cible.id);
  return { rais, cible, res };
}

test('la prise remplace la destruction : rien ne se déclenche, ni compteur, ni cimetière', () => {
  const duel = duelVide();
  duel.sorcier.deck = ['tercio-de-cuivre', 'tercio-de-cuivre', 'mousse-des-galiotes'];
  const destructionsAvant = rpgNombreDestructions(duel);
  const { rais, cible } = priseDeBase(duel);
  assert.ok(rais.enCale, 'le Raïs détient sa victime');
  assert.equal(rais.enCale.carteId, 'mousse-des-galiotes');
  assert.equal(rais.enCale.cost, 1, 'le prix de la rançon est le coût imprimé');
  assert.equal(duel.sorcier.creatures.includes(cible), false, 'la prisonnière a quitté la table');
  assert.equal(duel.sorcier.cimetiere.includes('mousse-des-galiotes'), false, 'elle n’est pas au cimetière');
  assert.equal(duel.joueur.creatures.includes(rais), true, 'le capteur tient la table');
  assert.equal(rais.pv, 1, 'le capteur a encaissé la riposte (2 - 1)');
  assert.equal(rpgNombreDestructions(duel), destructionsAvant, 'aucune destruction comptée : les quêtes ne bougent pas');
  assert.ok(duel.log.some((ligne) => ligne.includes('prend') && ligne.includes('cale')), 'la prise s’écrit au journal');
  assert.ok(duel.combatFeed.some((evenement) => evenement.type === 'prise'), 'le journal visuel montre la prise');
});

test('une capacité de mort ne se déclenche pas sur une prise : le Ghul capturé ne frappe personne', () => {
  // Le Ghul des cendres : 1/1, sa mort inflige 1 dégât à une créature désignée.
  // Pris en cale par le Cotre (Abordage) du sorcier : rien ne se déclenche.
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'ghul-des-cendres');
  const ghul = jouer(duel, 'joueur', 'ghul-des-cendres').entite;
  donner(duel, 'sorcier', 'cotre-de-course');
  const cotre = jouer(duel, 'sorcier', 'cotre-de-course').entite;
  cotre.pv = 10;
  pret(cotre);
  rpgAttaquerCreature(duel, 'sorcier', cotre.id, ghul.id);
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

  // La Momie de lin capturée ne laisse pas de Shabti : la prise court-circuite
  // les « quand meurt » à jetons comme les « quand meurt » à dégâts.
  const momie = duelVide();
  mana(momie, 'joueur', 10);
  mana(momie, 'sorcier', 10);
  momie.joueur.mana = { braise: 6, eau: 6, sable: 6, neige: 6, tenebres: 6 };
  donner(momie, 'joueur', 'momie-de-lin');
  const lin = jouer(momie, 'joueur', 'momie-de-lin').entite;
  lin.pv = 3;
  lin.def = 3;
  donner(momie, 'sorcier', 'cotre-de-course');
  const cotreMomie = jouer(momie, 'sorcier', 'cotre-de-course').entite;
  cotreMomie.pv = 10;
  pret(cotreMomie);
  rpgAttaquerCreature(momie, 'sorcier', cotreMomie.id, lin.id);
  assert.equal(cotreMomie.enCale?.carteId, 'momie-de-lin', 'la Momie est prise');
  assert.equal(momie.joueur.creatures.length, 0, 'aucun jeton Shabti n’a surgi de ses bandelettes');
  assert.equal(JSON.stringify(momie.log).includes('Shabti'), false, 'le journal n’en parle même pas');

  // L’Honneur du Soleil rouge non plus : pris, le Samouraï du torii ne frappe
  // personne en tombant — morte, sa dernière frappe part au hasard.
  const honneur = duelVide();
  mana(honneur, 'joueur', 10);
  mana(honneur, 'sorcier', 10);
  donner(honneur, 'joueur', 'samourai-du-torii');
  const samourai = jouer(honneur, 'joueur', 'samourai-du-torii').entite;
  donner(honneur, 'sorcier', 'cotre-de-course');
  const cotreHonneur = jouer(honneur, 'sorcier', 'cotre-de-course').entite;
  cotreHonneur.pv = 10;
  pret(cotreHonneur);
  rpgAttaquerCreature(honneur, 'sorcier', cotreHonneur.id, samourai.id);
  assert.equal(cotreHonneur.enCale?.carteId, 'samourai-du-torii', 'le Samouraï est pris');
  assert.equal(cotreHonneur.pv, 8, 'il n’a encaissé que la riposte (10 - 2) : aucune dernière frappe d’Honneur');
  assert.equal(JSON.stringify(honneur.log).includes('Honneur'), false, 'le journal ignore l’Honneur');
});

test('une seule place en cale : la deuxième victime du même capteur meurt normalement', () => {
  const duel = duelVide();
  const { rais } = priseDeBase(duel);
  assert.ok(rais.enCale, 'la première victime est en cale');
  rais.pv = rais.pvMax;
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const seconde = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  pret(rais);
  rpgAttaquerCreature(duel, 'joueur', rais.id, seconde.id);
  assert.equal(duel.sorcier.cimetiere.filter((id) => id === 'mousse-des-galiotes').length, 1,
    'la seconde Mousse meurt : la cale était pleine');
  assert.equal(rais.enCale.carteId, 'mousse-des-galiotes', 'et la cale n’a pas changé de main');
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
  mana(mort, 'joueur', 10);
  mana(mort, 'sorcier', 10);
  donner(mort, 'joueur', 'rais-de-la-galiote');
  const raisMort = jouer(mort, 'joueur', 'rais-de-la-galiote').entite;
  donner(mort, 'sorcier', 'mousse-des-galiotes');
  const mousseMort = jouer(mort, 'sorcier', 'mousse-des-galiotes').entite;
  pret(raisMort);
  rpgAttaquerCreature(mort, 'joueur', raisMort.id, mousseMort.id);
  assert.ok(raisMort.enCale, 'prise de référence');
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
  donner(duel, 'joueur', 'rais-de-la-galiote');
  const rais = jouer(duel, 'joueur', 'rais-de-la-galiote').entite;
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  pret(rais);
  rpgAttaquerCreature(duel, 'joueur', rais.id, mousse.id);
  assert.ok(rais.enCale);
  // Le Cotre du sorcier (Abordage) tue le Raïs plein : la Mousse s’échappe,
  // et le Raïs, capturé à son tour, rejoint la cale du Cotre.
  donner(duel, 'sorcier', 'cotre-de-course');
  const cotre = jouer(duel, 'sorcier', 'cotre-de-course').entite;
  cotre.pv = 10;
  pret(cotre);
  rpgAttaquerCreature(duel, 'sorcier', cotre.id, rais.id);
  assert.ok(cotre.enCale, 'le Cotre détient le Raïs');
  assert.equal(cotre.enCale.carteId, 'rais-de-la-galiote');
  assert.ok(duel.sorcier.main.includes('mousse-des-galiotes'), 'la cale du Raïs s’est ouverte avant sa capture');
});

test('Tenacité et boucliers refusent la prise : la victime survit', () => {
  const tenacite = duelVide();
  const setup = (duel) => {
    mana(duel, 'joueur', 10);
    mana(duel, 'sorcier', 10);
    donner(duel, 'joueur', 'rais-de-la-galiote');
    const rais = jouer(duel, 'joueur', 'rais-de-la-galiote').entite;
    donner(duel, 'sorcier', 'mousse-des-galiotes');
    const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
    pret(rais);
    return { rais, mousse };
  };
  const { rais, mousse } = setup(tenacite);
  mousse.tenaciteDisponible = true;
  rpgAttaquerCreature(tenacite, 'joueur', rais.id, mousse.id);
  assert.equal(mousse.pv, 1, 'Tenacité : la Mousse survit avec 1 point de défense');
  assert.equal(rais.enCale, null, 'on ne prend pas ce qui refuse de mourir');
  assert.equal(tenacite.sorcier.cimetiere.length, 0);

  const bouclier = duelVide();
  const fois2 = setup(bouclier);
  fois2.mousse.bouclier = 2;
  rpgAttaquerCreature(bouclier, 'joueur', fois2.rais.id, fois2.mousse.id);
  assert.equal(fois2.mousse.pv, 2, 'le bouclier a tout absorbé');
  assert.equal(fois2.rais.enCale, null, 'aucune prise sans destruction');
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
  // Le Cotre du sorcier (Abordage) tue le jeton : il meurt, il n’est pas pris.
  donner(duel, 'sorcier', 'cotre-de-course');
  const cotre = jouer(duel, 'sorcier', 'cotre-de-course').entite;
  cotre.pv = 10;
  pret(cotre);
  rpgAttaquerCreature(duel, 'sorcier', cotre.id, chien.id);
  assert.equal(duel.joueur.creatures.includes(chien), false, 'le jeton a cessé d’exister');
  assert.equal(cotre.enCale, null, 'un jeton n’a pas de carte à détenir');
  // Une figure légendaire (SALEM, kind hero) meurt sans être prise.
  // Son bouclier de lumière d’arrivée a déjà absorbé une attaque : à nu.
  donner(duel, 'joueur', 'salem');
  const salem = jouer(duel, 'joueur', 'salem').entite;
  salem.bouclierLumiere = false;
  salem.pv = 2;
  salem.def = 2;
  pret(cotre);
  rpgAttaquerCreature(duel, 'sorcier', cotre.id, salem.id);
  assert.equal(duel.joueur.cimetiere.includes('salem'), true, 'SALEM est détruite');
  assert.equal(cotre.enCale, null, 'on ne met pas une figure en cale');
});

test('la Lettre de marque prête l’Abordage pour un tour — la cale déjà prise reste pleine', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  assert.equal(tercio.abordage, false, 'le Tercio n’a pas l’Abordage imprimé');
  donner(duel, 'joueur', 'lettre-de-marque');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'lettre-de-marque').ok, true);
  assert.equal(tercio.abordage, true, 'le sceau de la Chancellerie arme tout le camp');
  // Le Tercio (2/4) prend la Mousse (1/2) pendant que la lettre court.
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  pret(tercio);
  rpgAttaquerCreature(duel, 'joueur', tercio.id, mousse.id);
  assert.ok(tercio.enCale, 'le Tercio a pris la Mousse avec l’Abordage prêté');
  rpgFinDeTour(duel);
  assert.equal(tercio.abordage, false, 'à la fin du tour, la lettre expire');
  assert.ok(tercio.enCale, 'mais la cale prise ne se vide jamais d’elle-même');
});

test('Le Grand Débarquement arme l’assaut : +1/+0 et Abordage pour un tour', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'tercio-de-cuivre');
  const tercio = jouer(duel, 'joueur', 'tercio-de-cuivre').entite;
  const atkAvant = tercio.atk;
  donner(duel, 'joueur', 'le-grand-debarquement');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'le-grand-debarquement').ok, true);
  assert.equal(tercio.atk, atkAvant + 1, 'tout le quai monte à l’assaut');
  assert.equal(tercio.abordage, true);
  rpgFinDeTour(duel);
  assert.equal(tercio.atk, atkAvant, 'le renfort s’évapore');
  assert.equal(tercio.abordage, false);
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
  // À la prise.
  const prise = duelVide();
  prise.sorcier.deck = ['tercio-de-cuivre', 'tercio-de-cuivre'];
  mana(prise, 'joueur', 10);
  mana(prise, 'sorcier', 10);
  donner(prise, 'joueur', 'cotre-de-course');
  const cotre = jouer(prise, 'joueur', 'cotre-de-course').entite;
  cotre.pv = 10;
  donner(prise, 'sorcier', 'galion-de-la-flotte');
  const galion = jouer(prise, 'sorcier', 'galion-de-la-flotte').entite;
  galion.pv = 3;
  galion.def = 3;
  pret(cotre);
  const mainAvant = prise.sorcier.main.length;
  rpgAttaquerCreature(prise, 'joueur', cotre.id, galion.id);
  assert.ok(cotre.enCale?.carteId === 'galion-de-la-flotte', 'le Galion est pris, pas coulé');
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

  // Capturé par l’Abordage : la prise remplace la mort, le tueur reste.
  const capture = duelVide();
  mana(capture, 'joueur', 10);
  mana(capture, 'sorcier', 10);
  donner(capture, 'joueur', 'cotre-de-course');
  const cotre = jouer(capture, 'joueur', 'cotre-de-course').entite;
  cotre.pv = 10;
  donner(capture, 'sorcier', 'le-brulot');
  const brulot3 = jouer(capture, 'sorcier', 'le-brulot').entite;
  pret(cotre);
  rpgAttaquerCreature(capture, 'joueur', cotre.id, brulot3.id);
  assert.equal(cotre.enCale?.carteId, 'le-brulot', 'le Brûlot est pris en cale');
  assert.equal(capture.joueur.creatures.includes(cotre), true, 'son capteur n’a pas été renvoyé : rien n’est mort');
});

test('le Grappin d’abordage arme son porteur et paie son soin à chaque prise', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'fennec-des-decombres');
  const fennec = jouer(duel, 'joueur', 'fennec-des-decombres').entite;
  assert.equal(fennec.abordage, false);
  donner(duel, 'joueur', 'grappin-d-abordage');
  assert.equal(rpgJouerArme(duel, 'joueur', 'grappin-d-abordage', fennec.id).ok, true);
  assert.equal(fennec.abordage, true, 'trois dents de fer, et la mer devient un couloir');
  assert.equal(fennec.atk, 4, '+1/+1 du Grappin (3 + 1)');
  donner(duel, 'sorcier', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'sorcier', 'mousse-des-galiotes').entite;
  pret(fennec);
  const pvAvant = duel.joueur.pv;
  rpgAttaquerCreature(duel, 'joueur', fennec.id, mousse.id);
  assert.ok(fennec.enCale, 'le porteur a pris la Mousse');
  assert.equal(duel.joueur.pv, pvAvant + 2, 'la prime du Grappin : 2 PV gagnés à la prise');
});

test('le Négociant des rançons encaisse sa commission à chaque rançon', () => {
  const duel = duelVide();
  duel.joueur.deck = ['fennec-des-decombres', 'fennec-des-decombres'];
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Le Négociant du joueur regarde la mer ; le Raïs du sorcier prend la Mousse du joueur.
  donner(duel, 'joueur', 'negociant-des-ranscons');
  jouer(duel, 'joueur', 'negociant-des-ranscons');
  donner(duel, 'sorcier', 'rais-de-la-galiote');
  const rais = jouer(duel, 'sorcier', 'rais-de-la-galiote').entite;
  donner(duel, 'joueur', 'mousse-des-galiotes');
  const mousse = jouer(duel, 'joueur', 'mousse-des-galiotes').entite;
  pret(rais);
  rpgAttaquerCreature(duel, 'sorcier', rais.id, mousse.id);
  assert.ok(rais.enCale, 'le Raïs du sorcier détient la Mousse du joueur');
  duel.tour = 'joueur';
  duel.joueur.mana = { sable: 3, eau: 3, braise: 0 };
  const deckAvant = duel.joueur.deck.length;
  const res = rpgRanconner(duel, 'joueur', rais.id);
  assert.equal(res.ok, true, 'le joueur rachète sa Mousse');
  assert.equal(duel.joueur.deck.length, deckAvant - 1, 'le Négociant a pioché sa commission');
});

test('l’IA du sorcier rançonne ce qu’elle peut payer — et garde son tempo sur les grosses prises', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 10);
  mana(duel, 'sorcier', 10);
  // Le Raïs du joueur détient la Mousse du sorcier (prix 1).
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
  donner(cher, 'joueur', 'cotre-de-course');
  const cotre = jouer(cher, 'joueur', 'cotre-de-course').entite;
  cotre.pv = 10;
  donner(cher, 'sorcier', 'galion-de-la-flotte');
  const galion = jouer(cher, 'sorcier', 'galion-de-la-flotte').entite;
  galion.pv = 3;
  galion.def = 3;
  pret(cotre);
  rpgAttaquerCreature(cher, 'joueur', cotre.id, galion.id);
  assert.equal(cotre.enCale?.carteId, 'galion-de-la-flotte', 'le Galion est détenu');
  assert.equal(rpgPriXRancon(cotre), 5, 'le prix du Galion est son coût imprimé');
  cher.tour = 'sorcier';
  cher.sorcier.mana = { sable: 3, eau: 4, braise: 0 };
  assert.deepEqual(rpgSorcierRanconnerIA(cher), [], 'sept manas pour huit exigés : le sorcier garde son tempo');
  assert.ok(cotre.enCale, 'le Galion croupit en cale');
  cher.sorcier.mana = { sable: 6, eau: 6, braise: 0 };
  const rachetes = rpgSorcierRanconnerIA(cher);
  assert.equal(rachetes.length, 1, 'la mer assez généreuse, il paie');
  assert.equal(rachetes[0].carteId, 'galion-de-la-flotte');
  assert.ok(cher.sorcier.main.includes('galion-de-la-flotte'));
});

test('le deck d’essai et le boîtier des Lettres de Marque suivent les règles du jeu', () => {
  // Le banc d’essai : 30 cartes Sable + Eau, validateur content.
  const essai = deckManaEssaiParId('essai-mana-lettres-de-marque');
  assert.ok(essai, 'le cinquième deck d’essai existe');
  assert.equal(essai.cardIds.length, 30);
  assert.deepEqual(essai.elements, ['sable', 'eau']);
  assert.deepEqual(validerDeckManaEssai(essai), { ok: true });
  assert.equal(essai.cardIds.filter((id) => id === 'la-barbe-rousse').length, 1, 'une seule mythique');
  assert.ok(essai.cardIds.every((id) => cardColors(cardById(id)).every((couleur) => ['sable', 'eau'].includes(couleur))),
    'toutes les cartes sont Sable, Eau ou les deux');
  assert.equal(RPG_MANA_ESSAI_DECKS.length, 5, 'le banc d’essai compte cinq paquets');

  // Le boîtier de l’étagère : composé par sa recette, pas écrit à la main.
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

  assert.deepEqual(libellesPastilles('rais-de-la-galiote'), ['Abordage'], 'le Raïs porte la pastille Abordage');
  assert.deepEqual(libellesPastilles('galion-de-la-flotte'), ['Cargaison 2'], 'le Galion porte la pastille Cargaison 2');
  assert.deepEqual(libellesPastilles('negociant-des-ranscons'), ['Rançon 1'], 'le Négociant porte la pastille Rançon');
  assert.ok(libellesPastilles('grappin-d-abordage').includes('Abordage'), 'le Grappin prête l’Abordage');
  assert.equal(iconePourLigne(cardById('rais-de-la-galiote'),
    'Abordage — quand le Raïs inflige des blessures de combat qui détruiraient une créature adverse, celle-ci est prise en cale.'),
    'abordage', 'la ligne de règle se lit Abordage');
  assert.equal(iconePourLigne(cardById('galion-de-la-flotte'),
    'Cargaison 2 — Quand le Galion meurt ou est pris en cale, piochez deux cartes.'),
    'cargaison', 'la ligne de règle se lit Cargaison');
});
