import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, RPG_MAGIE_CARDS, cardById, magieById, carteJouableSansTerrain, rpgValiderDeck } from '../src/games/rpgCards.js';
import { RPG_SORTS_TRANSFERES } from '../src/games/rpgSortsTransferes.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { MOBA_CARTES_AUTORISEES, MOBA_DECK_ESSAI, rpgMobaValiderDeck, rpgMobaNouveauDuel, rpgMobaLancerMagie } from '../src/games/rpgMobaLocal.js';
import { rpgNouveauDuel, rpgLancerMagie } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { normaliserDeckMaison, reparerCasierHorsStock, rpgValiderDeckMaison, peutAjouterCarte } from '../src/games/rpgDeckBuilder.js';
import { RPG_REVELATIONS_PAR_ETAGE, normaliserCollection } from '../src/games/rpgCollection.js';
import { carteAuVivier } from '../src/games/rpgBoosters.js';
import { RPG_CARD_LESSONS } from '../src/games/rpgCardLessons.js';
import { prixCarteDirecte } from '../src/games/rpgSoukDirect.js';

const ids = new Set(RPG_SORTS_TRANSFERES);
test('les 29 cartes transférées correspondent exactement aux capacités associées, sans magie rapide ni contresort', () => {
  const associes = new Set(RPG_DUEL_CARDS.map(c => c.activation?.sortAssocie).filter(Boolean));
  assert.equal(ids.size, 29); assert.deepEqual([...ids].sort(), [...associes].sort());
  for (const id of ids) {
    const fiche = magieById(id);
    assert.ok(fiche && cardById(id), `${id} reste lisible dans les archives`);
    assert.ok(!fiche.instant && fiche.effet.type !== 'contresort', id);
    assert.ok(!RPG_MAGIE_CARDS.some(c => c.id === id)); assert.ok(!RPG_DUEL_CARDS.some(c => c.id === id));
    assert.ok(!carteJouableSansTerrain(fiche)); assert.ok(!MOBA_CARTES_AUTORISEES.includes(id));
    assert.equal(carteAuVivier(id), false); assert.equal(prixCarteDirecte(id), null);
    assert.ok(!Object.values(RPG_REVELATIONS_PAR_ETAGE).some(liste => liste.includes(id)));
  }
  assert.ok(RPG_CARD_LESSONS.every(lecon => lecon.cardIds.every(id => !ids.has(id))));
  for (const id of ['poigne-de-givre', 'trait-de-braise', 'parade-du-verre']) {
    assert.ok(RPG_DUEL_CARDS.some(c => c.id === id), `${id} reste jouable`);
    assert.equal(carteJouableSansTerrain(cardById(id)), true);
  }
});

test('les douze préconstruits restent jouables en classique, essai et Conquête', () => {
  assert.ok(validerDeckManaEssai({ cardIds: MOBA_DECK_ESSAI, elements: ['sable', 'neige'] }).ok);
  for (const deck of RPG_DECKS_THEMATIQUES) {
    assert.equal(deck.cardIds.length, 30, deck.id);
    assert.ok(deck.cardIds.every(id => !ids.has(id)), deck.id);
    assert.ok(rpgValiderDeck(deck.cardIds).ok, deck.id);
    assert.ok(validerDeckManaEssai(deck).ok, deck.id);
    assert.ok(rpgMobaValiderDeck(deck).ok, deck.id);
  }
});

test('les cartes retirées ne peuvent pas être lancées, même présentes en main', () => {
  const classique = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  const moba = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 });
  for (const id of ids) {
    classique.joueur.main = [id]; moba.joueur.main = [id];
    const avant = JSON.stringify(classique);
    assert.equal(rpgLancerMagie(classique, 'joueur', id).raison, 'sort-transfere', id);
    assert.equal(JSON.stringify(classique), avant, id);
    const avantMoba = JSON.stringify(moba);
    assert.equal(rpgMobaLancerMagie(moba, 'joueur', id).raison, 'sort-transfere', id);
    assert.equal(JSON.stringify(moba), avantMoba, id);
  }
});

test('PvP : les intentions de jouer un sort transféré sont rejetées sans mutation', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], pvp: true });
  duel.mulliganFait = { joueur: true, sorcier: true };
  for (const id of ids) {
    duel.joueur.main = [id]; const avant = JSON.stringify(duel);
    const res = rpgPvpAppliquer(duel, 'joueur', { type: 'jouer-carte', carteId: id });
    assert.equal(res.raison, 'sort-transfere', id); assert.equal(JSON.stringify(duel), avant, id);
  }
});

test('les anciens decks et acquisitions sont conservés, mais le joueur doit remplacer le sort', () => {
  const original = [...RPG_DECKS_THEMATIQUES[0].cardIds]; original[0] = 'rapport-du-greffier';
  const deck = { id: 'maison-ancien', nom: 'Ancien', cardIds: original, majLe: '2024-01-01T00:00:00.000Z' };
  const lu = normaliserDeckMaison(deck);
  assert.deepEqual(lu.cardIds, original); assert.deepEqual(normaliserCollection(['rapport-du-greffier']), ['rapport-du-greffier']);
  const casier = reparerCasierHorsStock({ decks: [deck], supprimes: [] }, [...new Set(original)]);
  assert.equal(casier.modifie, false); assert.deepEqual(casier.casier.decks[0].cardIds, original);
  assert.match(rpgValiderDeckMaison(original).raisons[0], /capacité de créature.*remplacez/);
  assert.equal(peutAjouterCarte('rapport-du-greffier', []).ok, false);
  assert.equal(rpgMobaValiderDeck({ cardIds: original, elements: ['sable', 'neige'] }).ok, false);
});
