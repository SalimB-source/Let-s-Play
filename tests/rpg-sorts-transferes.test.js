import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, RPG_MAGIE_CARDS, cardById, cardColors, magieById, carteJouableSansTerrain, rpgValiderDeck } from '../src/games/rpgCards.js';
import { RPG_SORTS_TRANSFERES } from '../src/games/rpgSortsTransferes.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { MOBA_CARTES_AUTORISEES, MOBA_DECK_ESSAI, rpgMobaValiderDeck, rpgMobaNouveauDuel, rpgMobaLancerMagie } from '../src/games/rpgMobaLocal.js';
import { rpgNouveauDuel, rpgLancerMagie } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { normaliserDeckMaison, reparerCasierHorsStock, remplacerSortsDansDeck, fusionnerEtatsSablier, rpgValiderDeckMaison, peutAjouterCarte } from '../src/games/rpgDeckBuilder.js';
import { RPG_REVELATIONS_PAR_ETAGE, normaliserCollection } from '../src/games/rpgCollection.js';
import { carteAuVivier } from '../src/games/rpgBoosters.js';
import { RPG_CARD_LESSONS } from '../src/games/rpgCardLessons.js';
import { RPG_RECETTES_DECKS, RPG_RECETTES_HISTOIRE } from '../src/games/rpgDeckRecipes.js';
import { composerDeck } from '../src/games/rpgDeckComposer.js';
import { CATALOGUE_DU_COMPOSEUR } from '../src/games/rpgCards.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';
import { RPG_TUTORIELS } from '../src/games/rpgTutorial.js';
import { prixCarteDirecte } from '../src/games/rpgSoukDirect.js';

const ids = new Set(RPG_SORTS_TRANSFERES);
test('les 38 cartes transférées correspondent exactement aux capacités associées, sans magie rapide ni contresort', () => {
  const associes = new Set(RPG_DUEL_CARDS.map(c => c.activation?.sortAssocie).filter(Boolean));
  assert.equal(ids.size, 38); assert.deepEqual([...ids].sort(), [...associes].sort());
  assert.ok(RPG_DUEL_CARDS.filter(c => c.kind === 'magie' && c.effet?.type !== 'arme').every(c => c.instant), 'aucune sorcellerie ne reste jouable');
  for (const id of ids) {
    const fiche = magieById(id);
    const porteur = RPG_DUEL_CARDS.find(c => c.activation?.sortAssocie === id);
    assert.deepEqual(porteur.activation.effet, fiche.effet, `${id} : effet complet sans Lien`);
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

test('campagne, recettes historiques et leçons ne distribuent aucun sort transféré', () => {
  for (const [id, cartes] of Object.entries(RPG_STORY_DECKS)) {
    assert.equal(cartes.length, 30, id); assert.ok(cartes.every(c => !ids.has(c)), id);
    assert.ok(rpgValiderDeck(cartes).ok, id);
  }
  for (const [id, recette] of [...Object.entries(RPG_RECETTES_DECKS), ...Object.entries(RPG_RECETTES_HISTOIRE)]) {
    assert.ok(recette.signature.every(([carte]) => !ids.has(carte)), id);
    assert.equal(new Set(recette.signature.map(([carte]) => carte)).size, recette.signature.length, `${id} : signature sans doublon`);
    const cartes = composerDeck(recette, CATALOGUE_DU_COMPOSEUR);
    assert.ok(cartes.every(c => !ids.has(c)), id);
    assert.ok(rpgValiderDeck(cartes).ok, `${id} : ${rpgValiderDeck(cartes).raison}`);
  }
  for (const tutoriel of RPG_TUTORIELS) {
    for (const champ of ['openingHand', 'playerDraws', 'opponentHand', 'opponentDraws', 'deckCards']) {
      assert.ok((tutoriel[champ] ?? []).every(c => !ids.has(c)), `${tutoriel.id} : ${champ}`);
    }
    assert.ok(!ids.has(tutoriel.opponentDeckFill), tutoriel.id);
    assert.ok(tutoriel.steps.every(etape => !ids.has(etape.scriptedAnnonce?.cardId)), tutoriel.id);
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

test('les anciens decks sont remplacés avec le stock, sans modifier les autres cartes ni la collection', () => {
  const original = [...RPG_DECKS_THEMATIQUES[0].cardIds]; original[0] = 'rapport-du-greffier';
  const deck = { id: 'maison-ancien', nom: 'Ancien', cardIds: original, majLe: '2024-01-01T00:00:00.000Z' };
  const collection = [...new Set([...original, ...RPG_DECKS_THEMATIQUES[0].cardIds])];
  assert.deepEqual(normaliserDeckMaison(deck).cardIds, original, 'avant le chargement du stock, la sauvegarde reste intacte');
  assert.deepEqual(normaliserCollection(['rapport-du-greffier']), ['rapport-du-greffier']);
  const exemplaires = Object.fromEntries(collection.map(id => [id, 2]));
  const result = reparerCasierHorsStock({ decks: [deck], supprimes: [] }, collection, exemplaires);
  const migre = result.casier.decks[0];
  assert.equal(result.modifie, true); assert.equal(result.retires, 1); assert.equal(result.ajoutes, 1);
  assert.equal(migre.cardIds.length, 30); assert.ok(migre.cardIds.every(id => !ids.has(id)));
  assert.deepEqual(migre.cardIds.slice(1), original.slice(1), 'les autres cartes sont conservées dans leur ordre');
  assert.ok(rpgValiderDeckMaison(migre.cardIds, collection, exemplaires).ok);
  assert.ok(rpgMobaValiderDeck(migre).ok);
  assert.deepEqual(migre.migrationSorts, [{ retire: 'rapport-du-greffier', ajoute: migre.cardIds[0] }]);
  assert.deepEqual(normaliserDeckMaison(migre).migrationSorts, migre.migrationSorts);
  assert.equal(reparerCasierHorsStock(result.casier, collection, exemplaires).modifie, false, 'migration idempotente');
  assert.equal(peutAjouterCarte('rapport-du-greffier', []).ok, false);
});

test('la migration couvre tous les sorts, respecte les couleurs et les copies possédées', () => {
  const collection = RPG_DUEL_CARDS.map(c => c.id);
  for (const id of ids) {
    const ancienne = cardById(id);
    const r = remplacerSortsDansDeck([id, id], collection);
    assert.equal(r.retires, 2, id); assert.equal(r.ajoutes, 2, id);
    assert.ok(r.cardIds.every(c => !ids.has(c) && collection.includes(c)), id);
    assert.ok(r.cardIds.every(c => MOBA_CARTES_AUTORISEES.includes(c)), `${id} : les cartes communes sont compatibles Conquête`);
    assert.ok(r.cardIds.every(c => cardColors(c).every(couleur => cardColors(ancienne).includes(couleur))), id);
    assert.ok(rpgValiderDeckMaison(r.cardIds, collection).raisons.every(raison => !raison.includes('non possédés')), id);
  }
});

test('sans stock compatible, la place reste vide et le rapport explique quoi compléter', () => {
  const original = ['rapport-du-greffier', 'chien-du-guet', 'chien-du-guet'];
  assert.equal(remplacerSortsDansDeck(original, null).modifie, false, 'le stock inconnu attend la fusion');
  assert.deepEqual(remplacerSortsDansDeck(original, []).cardIds, original.slice(1), 'un stock connu vide laisse une place libre');
  const r = reparerCasierHorsStock({ decks: [{ id: 'maison-incomplet', nom: 'Brouillon', cardIds: original, majLe: '2024-01-01T00:00:00.000Z' }], supprimes: [] }, ['chien-du-guet']);
  assert.equal(r.retires, 1); assert.equal(r.ajoutes, 0);
  assert.deepEqual(r.casier.decks[0].cardIds, ['chien-du-guet', 'chien-du-guet']);
  assert.deepEqual(r.casier.decks[0].migrationSorts, [{ retire: 'rapport-du-greffier', ajoute: null }]);
  assert.match(rpgValiderDeckMaison(r.casier.decks[0].cardIds, ['chien-du-guet']).raisons[0], /30 cartes/);
});

test('la sauvegarde la plus récente est fusionnée avant le remplacement et les suppressions sont respectées', () => {
  const ancien = { id: 'maison-sync', nom: 'Ancien', cardIds: ['rapport-du-greffier'], majLe: '2024-01-01T00:00:00.000Z' };
  const distant = { ...ancien, nom: 'Distant', cardIds: ['rapport-du-greffier', 'chien-du-guet'], majLe: '2025-01-01T00:00:00.000Z' };
  const fusion = fusionnerEtatsSablier({ local: { decks: [ancien] }, distant: { decks: [distant] } });
  const r = reparerCasierHorsStock(fusion.casier, ['chien-du-guet', 'guetteur-du-beffroi']);
  assert.equal(r.casier.decks[0].nom, 'Distant');
  assert.ok(!r.casier.decks[0].cardIds.some(sort => ids.has(sort)));
  assert.ok(Date.parse(r.casier.decks[0].majLe) > Date.parse(distant.majLe));
  const efface = fusionnerEtatsSablier({ local: { decks: [ancien] }, distant: { decks: [distant], supprimes: [{ id: ancien.id, majLe: '2026-01-01T00:00:00.000Z' }] } });
  assert.equal(reparerCasierHorsStock(efface.casier, ['chien-du-guet']).casier.decks.length, 0);
});
