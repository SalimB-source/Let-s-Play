/** Le ninja samouraï des ombres — le tueur du Serment du Soleil rouge.
 *
 *  Un 3/1 pour 3, type Ninja · Samouraï, qui porte **Infiltration** (on ne le
 *  bloque pas, il ignore la priorité des Défenseurs) et **Harakiri 1**. Sa
 *  règle propre, la **Frappe de l'ombre** : quand il attaque une créature,
 *  celle-ci encaisse sans rendre le coup — ni riposte de mêlée, ni capacité
 *  « au blocage », ni **Contre-attaque**.
 *
 *  En duel classique, l'Infiltration le rend inblocable : il passe donc
 *  directement au sorcier. La Frappe de l'ombre se voit dès qu'il affronte une
 *  créature (combat individuel, voie MOBA, ou tout chemin qui l'oppose à un
 *  corps à corps) — ces tests prennent ce chemin-là.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { RPG_SOLEIL_ROUGE_CARDS, RPG_SOLEIL_ROUGE_SET_ID } from '../src/games/rpgSoleilRouge.js';
import { RPG_DECKS_ARCHETYPES, RPG_DUEL_CARDS, cardById, cardColors, cardColorCost, cardCopyLimit, cardCost, cardArtId, rpgValiderDeck } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { CARD_ART_HAUTEUR, CARD_ART_LARGEUR, cardArt } from '../src/games/rpgCardArt.js';
import { EFFET_DEFINITIONS, EFFET_ICONE, EFFET_LIBELLES, pastillesPourCarte } from '../src/games/effetIcons.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgReglerHasard, rpgLancerAttaque, rpgAttaquerCreature } from '../src/games/rpgDuel.js';

const ID = 'ninja-samourai-des-ombres';

function dimensionsJpeg(jpg) {
  for (let i = 2; i < jpg.length;) {
    const marqueur = jpg[i + 1];
    if (marqueur >= 0xc0 && marqueur <= 0xc3) {
      return [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)];
    }
    i += 2 + jpg.readUInt16BE(i + 2);
  }
  return null;
}

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) {
    duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 40]));
  }
  duel.moba = false;
  duel.lignes = false;
  // Ni coup critique, ni esquive, ni raté : les dégâts mesurés sont ceux des fiches.
  rpgReglerHasard(duel, () => 0.99);
  return duel;
}

/** Pose une créature prête, sur le champ. */
function poser(duel, cote, id) {
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(id);
  const tourAvant = duel.tour;
  duel.tour = cote;
  const res = rpgJouerCreature(duel, cote, id);
  duel.tour = tourAvant;
  assert.equal(res.ok, true, `${id} entre en jeu : ${res.raison ?? ''}`);
  res.entite.ready = true;
  res.entite.malInvocation = false;
  return res.entite;
}

const presente = (duel, cote, id) => duel[cote].creatures.some((entite) => entite.id === id);
const pvDe = (duel, cote, id) => duel[cote].creatures.find((entite) => entite.id === id)?.pv;

test('la fiche : un 3/1 pour 3, Ninja · Samouraï, Infiltration et Harakiri 1', () => {
  const carte = cardById(ID);
  assert.ok(carte, 'la carte est au catalogue');
  assert.equal(carte.name, 'Ninja samouraï des ombres');
  assert.equal(cardCost(carte), 3);
  assert.deepEqual([carte.atk, carte.def], [3, 1]);
  assert.equal(carte.kind, 'creature');
  assert.equal(carte.typeLine, 'Créature — Humain · Ninja · Samouraï');
  assert.equal(carte.rarity, 'inhabituelle');
  assert.equal(carte.infiltration, true, 'Infiltration');
  assert.equal(carte.frappeSansRiposte, true, 'Frappe de l’ombre');
  assert.equal(carte.honneur, 1, 'Harakiri 1');
  assert.equal(carte.distance, undefined, 'c’est un corps à corps, pas un tireur');
  assert.equal(carte.coupRapide, undefined, 'il ne porte pas l’Attaque ciblée');
  assert.equal(carte.contreAttaque, undefined, 'la Contre-attaque reste un mot-clé à part');
  assert.match(carte.text, /^Infiltration — /);
  assert.match(carte.text, /Frappe de l’ombre — /);
  assert.match(carte.text, /Contre-attaque\. /, 'le texte nomme l’exception Contre-attaque');
  assert.match(carte.text, /Harakiri — /, 'la règle du Harakiri est rappelée sur la face');
  assert.ok(carte.flavor?.length > 0);
});

test('la carte appartient au Serment du Soleil rouge et se collectionne', () => {
  const carte = cardById(ID);
  assert.equal(carte.set, RPG_SOLEIL_ROUGE_SET_ID);
  assert.equal(carte.element, 'braise');
  assert.deepEqual(cardColors(ID), ['braise', 'tenebres'], 'Braise et Ténèbres');
  assert.deepEqual(cardColorCost(ID), { braise: 1, tenebres: 1 },
    'trois manas, dont un de chaque couleur');
  assert.ok(RPG_SOLEIL_ROUGE_CARDS.some((candidate) => candidate.id === ID), 'présente dans le set');
  assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === ID), 'présente au catalogue du duel');
  assert.ok(COLLECTION_DEPART.includes(ID), 'offerte dans la dotation de départ, comme les inhabituelles');
  assert.equal(cardArtId(carte), ID, 'sa peinture porte son identifiant');
});

test('ses trois pastilles : Infiltration, Frappe de l’ombre et Harakiri', () => {
  const cles = pastillesPourCarte(cardById(ID)).map((pastille) => pastille.cle);
  assert.deepEqual(cles, ['infiltration', 'frappeSansRiposte', 'honneur']);
  assert.equal(EFFET_LIBELLES.frappeSansRiposte, 'Frappe de l’ombre');
  assert.ok(EFFET_ICONE.frappeSansRiposte, 'la pastille a son pictogramme');
  assert.match(EFFET_DEFINITIONS.frappeSansRiposte, /Contre-attaque/,
    'le volet déplié dit que la Contre-attaque ne part pas');
});

test('un deck Braise + Ténèbres l’accepte, deux exemplaires au plus', () => {
  // Le starter préconstruit est Braise + Neige : l'hybride Ténèbres y ferait
  // une troisième couleur. Le deck se compose donc du set et de lui.
  const deck = [ID, ID];
  for (const carte of RPG_SOLEIL_ROUGE_CARDS) {
    if (carte.id === ID || deck.length >= 30) continue;
    const max = Math.min(2, cardCopyLimit(carte));
    for (let copie = 0; copie < max && deck.length < 30; copie += 1) deck.push(carte.id);
  }
  assert.deepEqual(rpgValiderDeck(deck), { ok: true, terrains: 0 });
  assert.deepEqual([...new Set(deck.flatMap((id) => cardColors(id)))], ['braise', 'tenebres'],
    'deux couleurs, la Braise du set et les Ténèbres du ninja');

  const starter = RPG_DECKS_ARCHETYPES.find((deckArchetype) => deckArchetype.id === RPG_SOLEIL_ROUGE_SET_ID);
  const melange = [...starter.cardIds.slice(0, 28), ID, ID];
  assert.equal(rpgValiderDeck(melange).ok, false, 'Braise + Neige + Ténèbres : trois couleurs refusées');

  const trois = [...deck.slice(0, 27), ID, ID, ID];
  assert.equal(rpgValiderDeck(trois).ok, false, 'la limite de copies reste celle des inhabituelles');
});

test('Infiltration : personne ne peut lui assigner un bloqueur', () => {
  const duel = partie();
  const ninja = poser(duel, 'joueur', ID);
  const bloqueur = poser(duel, 'sorcier', 'viking-des-neiges');
  const res = rpgLancerAttaque(duel, 'joueur', [ninja.id], { [ninja.id]: [bloqueur.id] });
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'infiltration', 'le ninja ne se fait pas bloquer');
});

test('Frappe de l’ombre : la créature attaquée encaisse sans rendre le coup', () => {
  const duel = partie();
  const ninja = poser(duel, 'joueur', ID);
  const cible = poser(duel, 'sorcier', 'chien-du-guet');
  assert.equal(rpgAttaquerCreature(duel, 'joueur', ninja.id, cible.id).ok, true);
  assert.equal(presente(duel, 'sorcier', cible.id), false, 'la cible encaisse les 3 dégâts et meurt');
  assert.equal(pvDe(duel, 'joueur', ninja.id), 1, 'le ninja n’a pas perdu un seul PV');
});

test('… même quand la créature attaquée porte Contre-attaque', () => {
  const duel = partie();
  const ninja = poser(duel, 'joueur', ID);
  // 2/3, Contre-attaque, sans Harakiri : sa riposte de 2 tuerait le ninja (1 PV).
  const cible = poser(duel, 'sorcier', 'guerrier-au-bouclier-rond');
  assert.equal(rpgAttaquerCreature(duel, 'joueur', ninja.id, cible.id).ok, true);
  assert.equal(presente(duel, 'sorcier', cible.id), false, 'la cible tombe sous les 3 dégâts');
  assert.equal(pvDe(duel, 'joueur', ninja.id), 1,
    'la Contre-attaque de la victime ne part pas : le ninja garde son unique PV');
});

test('témoin : un autre corps à corps, lui, encaisse le coup en retour', () => {
  const duel = partie();
  const gardien = poser(duel, 'joueur', 'gardien-de-la-porte-ardente');
  const bloqueur = poser(duel, 'sorcier', 'viking-des-neiges');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [gardien.id], { [gardien.id]: [bloqueur.id] }).ok, true);
  assert.equal(presente(duel, 'sorcier', bloqueur.id), false, 'le bloqueur 2/1 tombe');
  assert.equal(pvDe(duel, 'joueur', gardien.id), 2, 'mais le Gardien 2/4 encaisse les 2 dégâts en retour');
});

test('sa peinture est livrée en 768 × 960 et reste légère', () => {
  const chemin = new URL(`../public/cards/${ID}.jpg`, import.meta.url);
  const jpg = readFileSync(chemin);
  assert.deepEqual(dimensionsJpeg(jpg), [CARD_ART_LARGEUR, CARD_ART_HAUTEUR]);
  assert.ok(statSync(chemin).size <= 260 * 1024, 'sous le plafond d’une peinture livrée');
  assert.match(cardArt(ID), new RegExp(`cards/${ID}\\.jpg\\?v=ninja-samourai-ombres-v2$`),
    'la révision de cache est déclarée');
});
