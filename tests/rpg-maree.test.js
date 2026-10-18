import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_PV_JOUEUR,
  rpgNouveauDuel,
  rpgLancerMagie,
  rpgJouerCreature,
  rpgDefausserCarte,
  rpgCibleAuto,
  rpgTourSorcierPreparationIA,
  rpgSorcierAnnonceSuivante,
  rpgSorcierResoudreAnnonce,
} from '../src/games/rpgDuel.js';
import { RPG_STORY_TOURS, deckHistoire } from '../src/games/rpgStoryTours.js';
import {
  RPG_DECKS,
  RPG_DECK_MAREE_BASE,
  RPG_DECK_SORCIER_BASE,
  cardById,
  cardColors,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';

const duelVide = () => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
const donner = (duel, cote, id) => duel[cote].main.push(id);
const mana = (duel, cote, couleur, n) => { duel[cote].mana[couleur] += n; };
/** Le sorcier joue son tour : il annonce une carte, la fenêtre de réponse s'ouvre au joueur. */
const annoncer = (duel, carteId) => {
  duel.tour = 'sorcier';
  // Le sorcier a de quoi payer : sinon l'IA n'annonce rien.
  duel.sorcier.mana = { braise: 5, eau: 5, sable: 5 };
  donner(duel, 'sorcier', carteId);
  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce?.carteId, carteId, `${carteId} est annoncé`);
  return annonce;
};
const contre = (duel, id) => rpgLancerMagie(duel, 'joueur', id);

test('la Marée des abysses garde une mythique et ouvre les autres bêtes dans les boosters', () => {
  assert.equal(RPG_DECK_MAREE_BASE.length, 30);
  assert.equal(rpgValiderDeck(RPG_DECK_MAREE_BASE).ok, true);
  assert.equal(RPG_DECK_MAREE_BASE.filter((id) => cardById(id).kind === 'terrain').length, 0, 'aucun terrain Eau');
  assert.equal(RPG_DECK_MAREE_BASE.filter((id) => id === 'mer').length, 0, 'aucune Mer à piocher');
  assert.equal(RPG_DECK_MAREE_BASE.filter((id) => id === 'lagune-des-salines').length, 0, 'aucune Lagune à piocher');
  for (const id of ['kraken', 'leviathan', 'bakunawa', 'jormungandr']) {
    assert.equal(cardById(id).rarity, 'mythique', `${id} est mythique`);
    const exemplaires = RPG_DECK_MAREE_BASE.filter((x) => x === id).length;
    if (id === 'leviathan') {
      assert.equal(exemplaires, 1, 'le Léviathan est l’unique mythique du deck');
    } else {
      assert.equal(exemplaires, 0, `${id} reste hors du starter`);
      assert.equal(COLLECTION_DEPART.includes(id), false, `${id} n’est pas dans la dotation`);
      assert.ok(carteReveleePar(id), `${id} peut être ouvert dans un booster après sa révélation`);
    }
  }
  assert.deepEqual(RPG_DECK_MAREE_BASE.filter((id) => cardById(id).rarity === 'mythique'), ['leviathan']);
  for (const id of new Set(RPG_DECK_MAREE_BASE)) {
    assert.deepEqual(cardColors(cardById(id)), ['eau'], `${id} est bleu (Eau)`);
  }
  const contres = RPG_DECK_MAREE_BASE.filter((id) => cardById(id).effet?.type === 'contresort');
  assert.ok(contres.length >= 6, 'le deck embarque plusieurs contres');
  const entree = RPG_DECKS.find((deck) => deck.id === 'maree-des-abysses');
  assert.ok(entree, 'le deck est dans l’étagère');
  assert.equal(entree.cardIds, RPG_DECK_MAREE_BASE);
  assert.ok(entree.cardIds.includes(entree.boxArt), 'le boîtier reprend une carte du deck');
});

test('Contresort des abîmes contre la carte annoncée, sort ou créature : la carte est défaussée sans effet', () => {
  const duel = duelVide();
  annoncer(duel, 'trait-de-braise');
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 3);
  const res = contre(duel, 'contresort-des-abimes');
  assert.equal(res.ok, true);
  assert.equal(res.contre, true);
  assert.equal(res.carteContree, 'trait-de-braise');
  assert.equal(duel.annonce, null, 'l’annonce est défaite');
  assert.equal(duel.sorcier.main.includes('trait-de-braise'), false, 'la carte quitte la main du sorcier');
  assert.ok(duel.sorcier.cimetiere.includes('trait-de-braise'), 'elle va au cimetière');
  assert.equal(duel.sorcier.mana.braise, 3, 'le sort annoncé paie son coût même s’il est contrecarré');
  assert.equal(duel.joueur.mana.eau, 0, 'le contresort est lui aussi payé');
  assert.equal(rpgSorcierResoudreAnnonce(duel).ok, false, 'il n’y a plus rien à résoudre');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR, 'aucun dégât');
});

test('Contresort des abîmes peut contrer une créature annoncée', () => {
  const duel = duelVide();
  annoncer(duel, 'chien-du-guet');
  mana(duel, 'sorcier', 'sable', 2);
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 3);
  assert.equal(contre(duel, 'contresort-des-abimes').contre, true);
  assert.equal(duel.sorcier.creatures.length, 0, 'la créature n’entre pas sur la table');
  assert.ok(duel.sorcier.cimetiere.includes('chien-du-guet'));
  assert.equal(Object.values(duel.sorcier.mana).reduce((total, value) => total + value, 0), 15,
    'le sorcier dépense les deux manas de la créature contrée');
  assert.equal(duel.joueur.mana.eau, 0, 'le contresort est aussi payé');
});

test('un contre ne peut répondre qu’à une annonce : rien à contrer sans carte annoncée', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  duel.fenetreReponse = true;
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 4);
  const res = contre(duel, 'contresort-des-abimes');
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'rien-a-contrer');
  assert.ok(duel.joueur.main.includes('contresort-des-abimes'), 'la carte reste en main');
  assert.equal(duel.joueur.mana.eau, 4, 'rien n’est payé');
});

test('laisser passer après un contre : aucune carte ne se résout', () => {
  const duel = duelVide();
  annoncer(duel, 'trait-de-braise');
  mana(duel, 'sorcier', 'braise', 3);
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 4);
  contre(duel, 'contresort-des-abimes');
  assert.equal(rpgSorcierResoudreAnnonce(duel).ok, false);
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR);
});

test('Silence d’écume contre tout sort annoncé (magie rapide ou sorcellerie), quelle que soit sa couleur', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  duel.sorcier.mana = { braise: 5, eau: 5, sable: 5 };
  donner(duel, 'sorcier', 'eau-de-la-source');
  duel.annonce = { cote: 'sorcier', carteId: 'eau-de-la-source', cibleId: null };
  duel.fenetreReponse = true;
  donner(duel, 'joueur', 'silence-decume');
  mana(duel, 'joueur', 'eau', 2);
  assert.equal(contre(duel, 'silence-decume').contre, true, 'un sort d’Eau est aussi contré par le Silence d’écume');
  assert.equal(duel.annonce, null, 'l’annonce est défaite');
  assert.equal(duel.joueur.mana.eau, 0, 'les 2 manas du Silence sont payés');
});

test('Silence d’écume contre un sort de Braise, mais pas une créature', () => {
  const duel = duelVide();
  annoncer(duel, 'chien-du-guet');
  mana(duel, 'sorcier', 'sable', 2);
  donner(duel, 'joueur', 'silence-decume');
  mana(duel, 'joueur', 'eau', 2);
  assert.equal(contre(duel, 'silence-decume').raison, 'cible', 'Silence ne vise que les sorts');
});

test('Silence d’écume contre un sort de Braise annoncé', () => {
  const duel = duelVide();
  annoncer(duel, 'trait-de-braise');
  mana(duel, 'sorcier', 'braise', 3);
  donner(duel, 'joueur', 'silence-decume');
  mana(duel, 'joueur', 'eau', 2);
  assert.equal(contre(duel, 'silence-decume').contre, true);
});

test('Déflection contre un sort annoncé et fait piocher une carte', () => {
  const duel = duelVide();
  duel.joueur.deck = ['desert', 'mer'];
  annoncer(duel, 'trait-de-braise');
  mana(duel, 'sorcier', 'braise', 3);
  donner(duel, 'joueur', 'maree-contraire');
  mana(duel, 'joueur', 'eau', 3);
  assert.equal(contre(duel, 'maree-contraire').contre, true);
  assert.equal(duel.joueur.deck.length, 1, 'une carte piochée');
  assert.ok(duel.joueur.main.includes('mer'));
});

test('Déflection ne contre pas une créature', () => {
  const duel = duelVide();
  annoncer(duel, 'chien-du-guet');
  mana(duel, 'sorcier', 'sable', 2);
  donner(duel, 'joueur', 'maree-contraire');
  mana(duel, 'joueur', 'eau', 3);
  assert.equal(contre(duel, 'maree-contraire').raison, 'cible');
});

test('sans contre, la carte annoncée se résout quand le joueur laisse passer', () => {
  const duel = duelVide();
  annoncer(duel, 'trait-de-braise');
  mana(duel, 'sorcier', 'braise', 3);
  const res = rpgSorcierResoudreAnnonce(duel);
  assert.equal(res.ok, true);
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR - 3, 'la magie fait ses 3 dégâts au visage');
  assert.equal(duel.sorcier.mana.braise, 6, 'le sort qui passe paie son coût une seule fois');
  assert.equal(duel.annonce, null);
  assert.equal(duel.fenetreReponse, false);
});

test('le sorcier enchaîne les annonces, une par une', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'trait-de-braise');
  donner(duel, 'sorcier', 'chien-du-guet');
  mana(duel, 'sorcier', 'braise', 3);
  mana(duel, 'sorcier', 'sable', 2);
  const premiere = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => 0.5), premiere, 'pas de seconde annonce avant de passer');
  rpgSorcierResoudreAnnonce(duel);
  assert.ok(rpgSorcierAnnonceSuivante(duel, () => 0.5), 'la carte suivante est annoncée après le passage');
});

test('Bakunawa, à son arrivée, interdit le blocage à une créature adverse', () => {
  const duel = duelVide();
  duel.tour = 'joueur';
  donner(duel, 'sorcier', 'chien-du-guet');
  mana(duel, 'sorcier', 'sable', 2);
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
  assert.equal(chien.ok, true);
  donner(duel, 'joueur', 'bakunawa');
  mana(duel, 'joueur', 'eau', 4);
  const pose = rpgJouerCreature(duel, 'joueur', 'bakunawa', chien.entite.id);
  assert.equal(pose.ok, true, JSON.stringify(pose));
  assert.equal(duel.sorcier.creatures.length, 1, 'Bakunawa n’inflige plus de dégâts d’arrivée');
  assert.ok(chien.entite.empecheBlocageToursRestants >= 1, 'le chien ne peut plus bloquer');
});

test('le sorcier IA ne lance jamais un contre : il le garde en main', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'contresort-des-abimes');
  mana(duel, 'sorcier', 'eau', 4);
  rpgTourSorcierPreparationIA(duel, () => 0.5);
  assert.ok(duel.sorcier.main.includes('contresort-des-abimes'), 'la carte reste en main');
});

test('le deck de départ du sorcier reste valide', () => {
  assert.equal(rpgValiderDeck(RPG_DECK_SORCIER_BASE).ok, true);
});

/** Le joueur joue une carte : l'IA peut la contrer avec un contre payable. */
const jouerJoueur = (duel) => { duel.tour = 'joueur'; };

test('l’IA contre une créature du joueur de coût 2 avec Contresort des abîmes', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'eau', 2);
  donner(duel, 'joueur', 'porteuse-de-cruches');
  mana(duel, 'sorcier', 'eau', 3);
  donner(duel, 'sorcier', 'contresort-des-abimes');
  const res = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(res.ok, true);
  assert.equal(res.contre, true);
  assert.equal(res.parIA, true);
  assert.equal(duel.joueur.creatures.length, 0, 'la créature n’entre pas en jeu');
  assert.ok(duel.joueur.cimetiere.includes('porteuse-de-cruches'));
  assert.ok(duel.sorcier.cimetiere.includes('contresort-des-abimes'));
  assert.equal(duel.joueur.mana.eau, 0, 'le coût de la créature contrée est payé');
  assert.equal(duel.sorcier.mana.eau, 0, 'le contresort adverse est aussi payé');
});

test('l’IA contre une magie du joueur avec Silence d’écume', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'braise', 3);
  donner(duel, 'joueur', 'trait-de-braise');
  mana(duel, 'sorcier', 'eau', 2);
  donner(duel, 'sorcier', 'silence-decume');
  const res = rpgLancerMagie(duel, 'joueur', 'trait-de-braise', 'sorcier');
  assert.equal(res.contre, true);
  assert.equal(res.parIA, true);
  assert.ok(duel.joueur.cimetiere.includes('trait-de-braise'));
  assert.equal(duel.joueur.mana.braise, 1, 'le coût du sort contré est payé');
  assert.equal(duel.sorcier.mana.eau, 0, 'le contresort adverse est aussi payé');
});

test('l’IA ne contre pas une carte de coût 1', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'eau', 1);
  donner(duel, 'joueur', 'eau-de-la-source');
  mana(duel, 'sorcier', 'eau', 4);
  donner(duel, 'sorcier', 'contresort-des-abimes');
  const res = rpgLancerMagie(duel, 'joueur', 'eau-de-la-source');
  assert.equal(res.ok, true);
  assert.equal(res.contre, undefined, 'pas de contre pour une carte bon marché');
  assert.ok(duel.sorcier.main.includes('contresort-des-abimes'));
});

test('l’IA contre aussi un sort d’Eau de coût 2 avec Silence d’écume', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'eau', 2);
  donner(duel, 'joueur', 'brisure-de-verre');
  mana(duel, 'sorcier', 'eau', 2);
  donner(duel, 'sorcier', 'silence-decume');
  const res = rpgLancerMagie(duel, 'joueur', 'brisure-de-verre');
  assert.equal(res.ok, true);
  assert.equal(res.contre, true);
  assert.equal(res.parIA, true);
  assert.ok(duel.sorcier.cimetiere.includes('silence-decume'), 'Silence est consommé pour contrer le sort');
});

test('Jörmungandr (8 manas, 7/6) fait piocher 3 cartes puis défausser 1 carte choisie en main', () => {
  const jorm = cardById('jormungandr');
  assert.equal(jorm.cost, 8);
  assert.equal(jorm.atk, 7);
  assert.equal(jorm.def, 6);
  const duel = duelVide();
  jouerJoueur(duel);
  duel.joueur.deck = ['mer', 'ressac', 'lame-de-mer'];
  donner(duel, 'joueur', 'desert');
  donner(duel, 'joueur', 'jormungandr');
  mana(duel, 'joueur', 'eau', 8);
  const pose = rpgJouerCreature(duel, 'joueur', 'jormungandr');
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.main.length, 4, 'les 3 cartes sont piochées et ajoutées au Désert en main');
  assert.deepEqual(duel.defausseEnAttente, { cote: 'joueur', restant: 1, sourceCarteId: 'jormungandr' });
  const defausse = rpgDefausserCarte(duel, 'joueur', 'desert');
  assert.equal(defausse.ok, true);
  assert.equal(duel.defausseEnAttente, null);
  assert.equal(duel.joueur.main.length, 3);
  assert.ok(duel.joueur.cimetiere.includes('desert'));
});

test('sans mana, l’IA ne contre pas : la carte du joueur se résout', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'eau', 2);
  donner(duel, 'joueur', 'porteuse-de-cruches');
  donner(duel, 'sorcier', 'contresort-des-abimes');
  const res = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(res.ok, true);
  assert.equal(res.contre, undefined);
  assert.equal(duel.joueur.creatures.length, 1, 'la créature est posée');
});

test('la Tour des Abysses joue le deck bleu sur ses quatre étages, avec des contres pour l’IA', () => {
  const tour = RPG_STORY_TOURS.find((t) => t.id === 'tour-des-abysses');
  assert.ok(tour, 'la tour existe');
  assert.equal(tour.etages.length, 4);
  for (const etage of tour.etages) assert.equal(etage.deck, 'maree-des-abysses');
  assert.equal(deckHistoire('maree-des-abysses'), RPG_DECK_MAREE_BASE);
});

// ── Renvoi en main : Ressac et Courant de retour ───────────────────────────────
// L'effet `retour-main` du moteur : la créature visée quitte la table sans
// mourir et retourne dans la main de son propriétaire (ni cimetière, ni
// capacité de destruction).

/** Le sorcier pose une de ses créatures : elle devient la cible du renvoi. */
const creatureAdverse = (duel, carteId) => {
  mana(duel, 'sorcier', 'sable', 9);
  mana(duel, 'sorcier', 'eau', 9);
  mana(duel, 'sorcier', 'braise', 9);
  donner(duel, 'sorcier', carteId);
  const pose = rpgJouerCreature(duel, 'sorcier', carteId);
  assert.equal(pose.ok, true, `${carteId} est en jeu`);
  return pose.entite;
};

test('la Marée des abysses embarque le renvoi en main : deux Ressac et le Courant de retour à son maximum', () => {
  assert.equal(RPG_DECK_MAREE_BASE.filter((id) => id === 'ressac').length, 2, 'deux Ressac');
  assert.equal(RPG_DECK_MAREE_BASE.filter((id) => id === 'courant-de-retour').length, 2,
    'le Courant de retour à son maximum, comme toute rare du deck');
  for (const id of ['ressac', 'courant-de-retour']) {
    const carte = cardById(id);
    assert.equal(carte.kind, 'magie', `${id} est un sort`);
    assert.deepEqual(cardColors(carte), ['eau'], `${id} est un sort d’Eau`);
    assert.equal(carte.effet.type, 'retour-main', `${id} renvoie en main`);
    assert.equal(carte.effet.cible, 'creature', `${id} vise une créature`);
  }
  assert.equal(cardById('ressac').instant, true, 'le Ressac est une magie rapide');
  assert.equal(cardById('ressac').effet.pioche, undefined, 'le Ressac ne fait pas piocher');
  assert.equal(cardById('courant-de-retour').effet.pioche, 1, 'le Courant de retour fait piocher une carte');
});

test('Ressac renvoie une créature adverse dans la main de son propriétaire', () => {
  const duel = duelVide();
  duel.tour = 'joueur';
  const chien = creatureAdverse(duel, 'chien-du-guet');
  mana(duel, 'joueur', 'eau', 1);
  donner(duel, 'joueur', 'ressac');
  const res = rpgLancerMagie(duel, 'joueur', 'ressac', chien.id);
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.renvoiMain, true, 'le moteur confirme le retour en main');
  assert.ok(res.renvoiEntityId, 'le moteur identifie la créature renvoyée');
  assert.equal(duel.sorcier.creatures.length, 0, 'la créature quitte la table');
  assert.ok(duel.sorcier.main.includes('chien-du-guet'), 'elle retourne dans la main du sorcier');
  assert.equal(duel.sorcier.cimetiere.length, 0, 'un renvoi n’envoie rien au cimetière');
  assert.ok(duel.joueur.cimetiere.includes('ressac'), 'le sort, lui, est consommé');
  assert.equal(duel.joueur.mana.eau, 0, 'le mana d’Eau est payé');
  assert.match(duel.log.at(-2), /Chien du guet retourne dans la main de son propriétaire/,
    'le journal nomme la carte renvoyée');
});

test('Courant de retour renvoie une créature adverse, puis fait piocher son lanceur', () => {
  const duel = duelVide();
  duel.tour = 'joueur';
  duel.joueur.deck = ['mer', 'mer'];
  const colosse = creatureAdverse(duel, 'colosse-de-sel');
  mana(duel, 'joueur', 'eau', 3);
  donner(duel, 'joueur', 'courant-de-retour');
  const res = rpgLancerMagie(duel, 'joueur', 'courant-de-retour', colosse.id);
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.renvoiMain, true, 'le moteur confirme le retour en main');
  assert.ok(duel.sorcier.main.includes('colosse-de-sel'), 'le Colosse repart dans la main adverse');
  assert.equal(duel.joueur.deck.length, 1, 'une carte a été piochée');
  assert.ok(duel.joueur.main.includes('mer'), 'la carte piochée vient du deck');
  assert.equal(duel.joueur.main.length, 1, 'le sort quitte la main, la pioche le remplace');
});

test('un renvoi ne déclenche pas la capacité de destruction du Kraken', () => {
  const duel = duelVide();
  duel.tour = 'joueur';
  const kraken = creatureAdverse(duel, 'kraken');
  mana(duel, 'joueur', 'eau', 3);
  donner(duel, 'joueur', 'courant-de-retour');
  const mainAdverse = duel.sorcier.main.length;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'courant-de-retour', kraken.id).ok, true);
  assert.equal(duel.sorcier.main.length, mainAdverse + 1, 'seul le renvoi ajoute une carte à la main adverse');
  assert.equal(duel.sorcier.cimetiere.length, 0, 'le Kraken n’est pas détruit');
  assert.equal(duel.log.some((ligne) => ligne.includes('pioche')), false, 'aucune pioche de destruction');
});

test('Ressac sans créature adverse ne se lance pas et ne coûte rien', () => {
  const duel = duelVide();
  duel.tour = 'joueur';
  mana(duel, 'joueur', 'eau', 1);
  donner(duel, 'joueur', 'ressac');
  const res = rpgLancerMagie(duel, 'joueur', 'ressac', null);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'cible');
  assert.ok(duel.joueur.main.includes('ressac'), 'la carte reste en main');
  assert.equal(duel.joueur.mana.eau, 1, 'rien n’est payé');
});

test('une créature protégée contre l’Eau échappe au renvoi', () => {
  const duel = duelVide();
  duel.tour = 'joueur';
  const tiziri = creatureAdverse(duel, 'tiziri-du-djurdjura');
  tiziri.protection = { contre: 'eau', toursRestants: 2 }; // Tiziri ne protège plus que de la Braise : on force l'Eau
  mana(duel, 'joueur', 'eau', 1);
  donner(duel, 'joueur', 'ressac');
  const res = rpgLancerMagie(duel, 'joueur', 'ressac', tiziri.id);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'protection');
  assert.equal(duel.sorcier.creatures.length, 1, 'Tiziri reste en jeu');
  assert.equal(duel.joueur.mana.eau, 1, 'rien n’est payé');
  assert.ok(duel.joueur.main.includes('ressac'));
});

test('l’IA vise la menace la plus lourde avec le Ressac', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 'sable', 9);
  mana(duel, 'joueur', 'eau', 9); // le Colosse de sel est une créature d’Eau
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'colosse-de-sel');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  const colosse = rpgJouerCreature(duel, 'joueur', 'colosse-de-sel').entite;
  assert.equal(rpgCibleAuto(duel, 'sorcier', cardById('ressac')), colosse.id,
    'le Colosse pèse plus lourd que le Chien');
});

test('le sorcier annonce et résout un Ressac sur la créature du joueur', () => {
  const duel = duelVide();
  mana(duel, 'joueur', 'sable', 9);
  mana(duel, 'joueur', 'eau', 9); // le Colosse de sel est une créature d’Eau
  donner(duel, 'joueur', 'colosse-de-sel');
  const colosse = rpgJouerCreature(duel, 'joueur', 'colosse-de-sel').entite;
  duel.tour = 'sorcier';
  mana(duel, 'sorcier', 'eau', 5);
  donner(duel, 'sorcier', 'ressac');
  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce?.carteId, 'ressac', 'le sorcier annonce le Ressac');
  assert.equal(annonce.cibleId, colosse.id, 'il vise la créature posée');
  assert.equal(rpgSorcierResoudreAnnonce(duel).ok, true);
  assert.equal(duel.joueur.creatures.length, 0, 'la créature du joueur quitte la table');
  assert.ok(duel.joueur.main.includes('colosse-de-sel'), 'elle revient dans la main du joueur');
  assert.ok(duel.sorcier.cimetiere.includes('ressac'), 'le sort du sorcier est consommé');
});
