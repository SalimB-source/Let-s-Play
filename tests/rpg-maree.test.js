import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rpgNouveauDuel,
  rpgLancerMagie,
  rpgJouerCreature,
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

test('la Marée des abysses est un deck d’Eau valide de 40 cartes, avec les quatre bêtes mythiques', () => {
  assert.equal(RPG_DECK_MAREE_BASE.length, 40);
  assert.equal(rpgValiderDeck(RPG_DECK_MAREE_BASE).ok, true);
  assert.equal(RPG_DECK_MAREE_BASE.filter((id) => id === 'mer').length, 16, '16 Mer');
  for (const id of ['kraken', 'leviathan', 'bakunawa', 'jormungandr']) {
    assert.equal(cardById(id).rarity, 'mythique', `${id} est mythique`);
    assert.equal(RPG_DECK_MAREE_BASE.filter((x) => x === id).length, 1, `${id} en un seul exemplaire`);
  }
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
  annoncer(duel, 'fureur-du-souk');
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 2);
  const res = contre(duel, 'contresort-des-abimes');
  assert.equal(res.ok, true);
  assert.equal(res.contre, true);
  assert.equal(res.carteContree, 'fureur-du-souk');
  assert.equal(duel.annonce, null, 'l’annonce est défaite');
  assert.equal(duel.sorcier.main.includes('fureur-du-souk'), false, 'la carte quitte la main du sorcier');
  assert.ok(duel.sorcier.cimetiere.includes('fureur-du-souk'), 'elle va au cimetière');
  assert.equal(duel.sorcier.mana.braise, 5, 'le sorcier n’a rien payé : sa carte n’a pas été résolue');
  assert.equal(rpgSorcierResoudreAnnonce(duel).ok, false, 'il n’y a plus rien à résoudre');
  assert.equal(duel.joueur.pv, 50, 'aucun dégât');
});

test('Contresort des abîmes peut contrer une créature annoncée', () => {
  const duel = duelVide();
  annoncer(duel, 'chien-du-guet');
  mana(duel, 'sorcier', 'sable', 2);
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 2);
  assert.equal(contre(duel, 'contresort-des-abimes').contre, true);
  assert.equal(duel.sorcier.creatures.length, 0, 'la créature n’entre pas sur la table');
  assert.ok(duel.sorcier.cimetiere.includes('chien-du-guet'));
});

test('un contre ne peut répondre qu’à une annonce : rien à contrer sans carte annoncée', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  duel.fenetreReponse = true;
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 2);
  const res = contre(duel, 'contresort-des-abimes');
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'rien-a-contrer');
  assert.ok(duel.joueur.main.includes('contresort-des-abimes'), 'la carte reste en main');
  assert.equal(duel.joueur.mana.eau, 2, 'rien n’est payé');
});

test('laisser passer après un contre : aucune carte ne se résout', () => {
  const duel = duelVide();
  annoncer(duel, 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 2);
  contre(duel, 'contresort-des-abimes');
  assert.equal(rpgSorcierResoudreAnnonce(duel).ok, false);
  assert.equal(duel.joueur.pv, 50);
});

test('Silence d’écume ne contre que les sorts de Braise ou de Sable', () => {
  const duel = duelVide();
  // Annonce posée directement : l'IA ne soigne pas un sorcier à pleine vie.
  duel.tour = 'sorcier';
  duel.annonce = { cote: 'sorcier', carteId: 'eau-de-la-source', cibleId: null };
  duel.fenetreReponse = true;
  donner(duel, 'joueur', 'silence-decume');
  mana(duel, 'joueur', 'eau', 1);
  assert.equal(contre(duel, 'silence-decume').raison, 'cible', 'un sort d’Eau échappe au Silence');
  assert.equal(duel.annonce.carteId, 'eau-de-la-source', 'l’annonce tient toujours');
  assert.equal(duel.joueur.mana.eau, 1, 'le refus ne coûte rien');
});

test('Silence d’écume contre un sort de Braise, mais pas une créature', () => {
  const duel = duelVide();
  annoncer(duel, 'chien-du-guet');
  mana(duel, 'sorcier', 'sable', 2);
  donner(duel, 'joueur', 'silence-decume');
  mana(duel, 'joueur', 'eau', 1);
  assert.equal(contre(duel, 'silence-decume').raison, 'cible', 'Silence ne vise que les sorts');
});

test('Silence d’écume contre un sort de Braise annoncé', () => {
  const duel = duelVide();
  annoncer(duel, 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  donner(duel, 'joueur', 'silence-decume');
  mana(duel, 'joueur', 'eau', 1);
  assert.equal(contre(duel, 'silence-decume').contre, true);
});

test('Marée contraire contre un sort annoncé et fait piocher une carte', () => {
  const duel = duelVide();
  duel.joueur.deck = ['desert', 'mer'];
  annoncer(duel, 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  donner(duel, 'joueur', 'maree-contraire');
  mana(duel, 'joueur', 'eau', 3);
  assert.equal(contre(duel, 'maree-contraire').contre, true);
  assert.equal(duel.joueur.deck.length, 1, 'une carte piochée');
  assert.ok(duel.joueur.main.includes('mer'));
});

test('Marée contraire ne contre pas une créature', () => {
  const duel = duelVide();
  annoncer(duel, 'chien-du-guet');
  mana(duel, 'sorcier', 'sable', 2);
  donner(duel, 'joueur', 'maree-contraire');
  mana(duel, 'joueur', 'eau', 3);
  assert.equal(contre(duel, 'maree-contraire').raison, 'cible');
});

test('sans contre, la carte annoncée se résout quand le joueur laisse passer', () => {
  const duel = duelVide();
  annoncer(duel, 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  const res = rpgSorcierResoudreAnnonce(duel);
  assert.equal(res.ok, true);
  assert.equal(duel.joueur.pv, 46, 'la magie fait ses dégâts');
  assert.equal(duel.annonce, null);
  assert.equal(duel.fenetreReponse, false);
});

test('le sorcier enchaîne les annonces, une par une', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  donner(duel, 'sorcier', 'chien-du-guet');
  mana(duel, 'sorcier', 'braise', 3);
  mana(duel, 'sorcier', 'sable', 2);
  const premiere = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => 0.5), premiere, 'pas de seconde annonce avant de passer');
  rpgSorcierResoudreAnnonce(duel);
  assert.ok(rpgSorcierAnnonceSuivante(duel, () => 0.5), 'la carte suivante est annoncée après le passage');
});

test('Bakunawa, à son arrivée, inflige 2 dégâts à une créature adverse', () => {
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
  assert.equal(duel.sorcier.creatures.length, 0, 'le chien (2 de défense) tombe sous les 2 dégâts');
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
  mana(duel, 'sorcier', 'eau', 2);
  donner(duel, 'sorcier', 'contresort-des-abimes');
  const res = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(res.ok, true);
  assert.equal(res.contre, true);
  assert.equal(res.parIA, true);
  assert.equal(duel.joueur.creatures.length, 0, 'la créature n’entre pas en jeu');
  assert.ok(duel.joueur.cimetiere.includes('porteuse-de-cruches'));
  assert.ok(duel.sorcier.cimetiere.includes('contresort-des-abimes'));
  assert.equal(duel.sorcier.mana.eau, 0, 'le contre est payé');
});

test('l’IA contre une magie du joueur avec Silence d’écume si c’est un sort de Braise', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'braise', 3);
  donner(duel, 'joueur', 'fureur-du-souk');
  mana(duel, 'sorcier', 'eau', 1);
  donner(duel, 'sorcier', 'silence-decume');
  const res = rpgLancerMagie(duel, 'joueur', 'fureur-du-souk');
  assert.equal(res.contre, true);
  assert.equal(res.parIA, true);
  assert.ok(duel.joueur.cimetiere.includes('fureur-du-souk'));
});

test('l’IA ne contre pas une carte de coût 1', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'eau', 1);
  donner(duel, 'joueur', 'eau-de-la-source');
  mana(duel, 'sorcier', 'eau', 2);
  donner(duel, 'sorcier', 'contresort-des-abimes');
  const res = rpgLancerMagie(duel, 'joueur', 'eau-de-la-source');
  assert.equal(res.ok, true);
  assert.equal(res.contre, undefined, 'pas de contre pour une carte bon marché');
  assert.ok(duel.sorcier.main.includes('contresort-des-abimes'));
});

test('l’IA ne contre pas un sort d’Eau avec Silence d’écume', () => {
  const duel = duelVide();
  jouerJoueur(duel);
  mana(duel, 'joueur', 'eau', 3);
  donner(duel, 'joueur', 'brisure-de-verre');
  mana(duel, 'sorcier', 'eau', 1);
  donner(duel, 'sorcier', 'silence-decume');
  const res = rpgLancerMagie(duel, 'joueur', 'brisure-de-verre');
  assert.equal(res.ok, true);
  assert.equal(res.contre, undefined);
  assert.ok(duel.sorcier.main.includes('silence-decume'), 'Silence reste en main');
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
