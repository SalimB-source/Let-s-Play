import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rpgNouveauDuel,
  rpgLancerMagie,
  rpgJouerCreature,
  rpgOuvrirFenetreReponse,
  rpgTourSorcierPreparationIA,
  rpgSorcierAnnonceSuivante,
  rpgSorcierResoudreAnnonce,
} from '../src/games/rpgDuel.js';
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
/** Pendant le tour du sorcier, la fenêtre de réponse est ouverte au joueur. */
const fenetreDuSorcier = (duel) => {
  duel.tour = 'sorcier';
  assert.equal(rpgOuvrirFenetreReponse(duel, 'sorcier'), true);
};

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
  const contresorts = RPG_DECK_MAREE_BASE.filter((id) => cardById(id).effet?.type === 'contresort');
  assert.ok(contresorts.length >= 6, 'le deck embarque plusieurs contresorts');
  const entree = RPG_DECKS.find((deck) => deck.id === 'maree-des-abysses');
  assert.ok(entree, 'le deck est dans l’étagère');
  assert.equal(entree.element, 'eau');
  assert.equal(entree.cardIds, RPG_DECK_MAREE_BASE);
  assert.ok(entree.cardIds.includes(entree.boxArt), 'le boîtier reprend une carte du deck');
});

test('un contresort en attente annule la prochaine magie adverse : payée, défaussée, sans effet', () => {
  const duel = duelVide();
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 2);
  fenetreDuSorcier(duel);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'contresort-des-abimes').ok, true);
  assert.equal(duel.joueur.contresorts.length, 1, 'le contresort attend');

  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  const pvAvant = duel.joueur.pv;
  const res = rpgLancerMagie(duel, 'sorcier', 'fureur-du-souk', 'sorcier');
  assert.equal(res.ok, true);
  assert.equal(res.contre, true, 'la magie est annulée');
  assert.equal(duel.joueur.pv, pvAvant, 'aucun dégât au joueur');
  assert.equal(duel.sorcier.mana.braise, 0, 'le sorcier a payé le coût');
  assert.ok(duel.sorcier.cimetiere.includes('fureur-du-souk'), 'la magie va au cimetière');
  assert.equal(duel.joueur.contresorts.length, 0, 'le contresort est consommé');
  assert.ok(duel.log.some((l) => l.includes('Le sorcier lance Fureur du souk, mais votre contresort l’annule.')),
    'le journal dit qui annule quoi');
});

test('quand le joueur lance une magie annulée, le journal le dit du point de vue du joueur', () => {
  const duel = duelVide();
  duel.sorcier.contresorts.push({ contre: null });
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'fureur-du-souk');
  mana(duel, 'joueur', 'braise', 3);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'fureur-du-souk', 'sorcier').contre, true);
  assert.ok(duel.log.some((l) => l.includes('Vous lancez Fureur du souk, mais le contresort du sorcier l’annule.')));
});

test('sans contresort, la même magie fait ses dégâts', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  const pvAvant = duel.joueur.pv;
  const res = rpgLancerMagie(duel, 'sorcier', 'fureur-du-souk', 'sorcier');
  assert.equal(res.ok, true, 'le sort est bien lancé pendant le tour du sorcier');
  assert.equal(res.contre, undefined);
  assert.equal(duel.joueur.pv, pvAvant - 4);
});

test('un contresort ne vise que sa couleur : Silence d’écume ignore l’Eau et contre la Braise', () => {
  const duel = duelVide();
  donner(duel, 'joueur', 'silence-decume');
  mana(duel, 'joueur', 'eau', 1);
  fenetreDuSorcier(duel);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'silence-decume').ok, true);

  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'eau-de-la-source');
  mana(duel, 'sorcier', 'eau', 1);
  duel.sorcier.pv = 40;
  const soinEau = rpgLancerMagie(duel, 'sorcier', 'eau-de-la-source');
  assert.equal(soinEau.contre, undefined, 'la magie d’Eau n’est pas visée');
  assert.equal(duel.sorcier.pv, 44, 'le soin est appliqué');
  assert.equal(duel.joueur.contresorts.length, 1, 'le contresort attend toujours');

  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'fureur-du-souk', 'sorcier').contre, true, 'la Braise est annulée');
  assert.equal(duel.joueur.contresorts.length, 0);
});

test('le contresort ne s’applique qu’à la prochaine magie, pas aux suivantes', () => {
  const duel = duelVide();
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 2);
  fenetreDuSorcier(duel);
  rpgLancerMagie(duel, 'joueur', 'contresort-des-abimes');
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 6);
  const pvAvant = duel.joueur.pv;
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'fureur-du-souk', 'sorcier').contre, true);
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'fureur-du-souk', 'sorcier').contre, undefined);
  assert.equal(duel.joueur.pv, pvAvant - 4, 'la seconde frappe passe');
});

test('Bakunawa, à son arrivée, pose un contresort en attente', () => {
  const duel = duelVide();
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'bakunawa');
  mana(duel, 'joueur', 'eau', 4);
  const pose = rpgJouerCreature(duel, 'joueur', 'bakunawa');
  assert.equal(pose.ok, true, JSON.stringify(pose));
  assert.equal(duel.joueur.contresorts.length, 1, 'l’arrivée prépare le contresort');

  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'fureur-du-souk', 'sorcier').contre, true);
});

test('Marée contraire annule la magie adverse et fait piocher une carte', () => {
  const duel = duelVide();
  duel.joueur.deck = ['desert', 'mer'];
  donner(duel, 'joueur', 'maree-contraire');
  mana(duel, 'joueur', 'eau', 3);
  fenetreDuSorcier(duel);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'maree-contraire').ok, true);
  assert.equal(duel.joueur.deck.length, 1, 'une carte piochée');
  assert.ok(duel.joueur.main.includes('mer'), 'la carte piochée est en main');
  assert.equal(duel.joueur.contresorts.length, 1);
});

test('le sorcier IA ne lance jamais un contresort : il le garde en main', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'contresort-des-abimes');
  mana(duel, 'sorcier', 'eau', 4);
  rpgTourSorcierPreparationIA(duel, () => 0.5);
  assert.ok(duel.sorcier.main.includes('contresort-des-abimes'), 'la carte reste en main');
  assert.equal(duel.sorcier.contresorts.length, 0);
});

test('le deck de départ du sorcier reste valide après l’ajout des contresorts', () => {
  assert.equal(rpgValiderDeck(RPG_DECK_SORCIER_BASE).ok, true);
});

test('le sorcier annonce sa carte sans la payer : le joueur a la main pour répondre', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  const annonce = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.equal(annonce.carteId, 'fureur-du-souk', 'la carte est annoncée');
  assert.equal(duel.fenetreReponse, true, 'la fenêtre de réponse est ouverte');
  assert.equal(duel.sorcier.mana.braise, 3, 'rien n’est payé avant la résolution');
  assert.ok(duel.sorcier.main.includes('fureur-du-souk'), 'la carte est encore en main');
  assert.equal(duel.joueur.pv, 50, 'aucun effet avant de laisser passer');
});

test('laisser passer résout la carte annoncée', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  rpgSorcierAnnonceSuivante(duel, () => 0.5);
  const res = rpgSorcierResoudreAnnonce(duel);
  assert.equal(res.ok, true);
  assert.equal(duel.joueur.pv, 46, 'la magie fait ses dégâts');
  assert.equal(duel.annonce, null);
  assert.equal(duel.fenetreReponse, false);
});

test('un contresort joué pendant l’annonce annule la carte au moment où elle se résout', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  mana(duel, 'sorcier', 'braise', 3);
  rpgSorcierAnnonceSuivante(duel, () => 0.5);
  donner(duel, 'joueur', 'contresort-des-abimes');
  mana(duel, 'joueur', 'eau', 2);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'contresort-des-abimes').ok, true, 'la réponse est jouable');
  const res = rpgSorcierResoudreAnnonce(duel);
  assert.equal(res.contre, true, 'la carte annoncée est annulée');
  assert.equal(duel.joueur.pv, 50, 'aucun dégât');
});

test('le sorcier enchaîne les annonces jusqu’à épuisement, une par une', () => {
  const duel = duelVide();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'fureur-du-souk');
  donner(duel, 'sorcier', 'chien-du-guet');
  mana(duel, 'sorcier', 'braise', 3);
  mana(duel, 'sorcier', 'sable', 2);
  const premiere = rpgSorcierAnnonceSuivante(duel, () => 0.5);
  assert.ok(premiere);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => 0.5), premiere, 'pas de seconde annonce tant qu’on n’a pas passé');
  rpgSorcierResoudreAnnonce(duel);
  let suivantes = 0;
  while (rpgSorcierAnnonceSuivante(duel, () => 0.5)) {
    suivantes += 1;
    if (!rpgSorcierResoudreAnnonce(duel).ok) break;
    if (suivantes > 10) break;
  }
  assert.ok(suivantes >= 1, 'la carte suivante est annoncée après le passage');
  assert.equal(duel.annonce, null);
});
