import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_FRAME_COLORS,
  CARD_RARITIES,
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  cardById,
  cardFrameClass,
  cardFrameColor,
  cardFrameInfo,
  cardHybridGradient,
  cardHasMythicFrame,
  cardHasShinyFrame,
  cardRarityInfo,
  RPG_ARME_CARDS,
} from '../src/games/rpgCards.js';

test('une mythique mono garde la couleur de son élément, avec un cadre brillant', () => {
  for (const element of RPG_ELEMENTS) {
    const mythique = { element, rarity: 'mythique' };
    const rare = { element, rarity: 'rare' };
    assert.equal(cardFrameColor(mythique), CARD_FRAME_COLORS[element].color, element);
    assert.equal(cardFrameColor(mythique), cardFrameColor(rare), element);
    assert.equal(cardFrameClass(mythique), `rpg-card--frame-${element} rpg-card--frame-brillant rpg-card--mythique`, element);
    assert.equal(cardFrameClass(rare), `rpg-card--frame-${element}`, element);
    assert.equal(cardHasShinyFrame(mythique), true, element);
    assert.equal(cardHasShinyFrame(rare), false, element);
  }
  // La pastille de rareté conserve sa couleur propre, distincte du cadre.
  assert.equal(cardRarityInfo({ element: 'eau', rarity: 'mythique' }).color, CARD_RARITIES.mythique.color);
});

test('une hybride garde la diagonale de sa combinaison sans reflet, même mythique', () => {
  const hybride = { element: 'braise', colors: ['sable', 'braise'], rarity: 'mythique' };
  const rare = { ...hybride, rarity: 'rare' };
  assert.equal(cardFrameInfo(hybride).key, 'hybride-braise-sable');
  assert.equal(cardFrameColor(hybride), CARD_FRAME_COLORS['hybride-braise-sable'].color);
  assert.equal(cardFrameColor(hybride), cardFrameColor(rare));
  assert.equal(cardFrameClass(hybride), 'rpg-card--frame-hybride-braise-sable rpg-card--mythique');
  assert.equal(cardFrameClass(rare), 'rpg-card--frame-hybride-braise-sable');
  assert.equal(cardHasShinyFrame(hybride), false);
  assert.equal(cardHasShinyFrame(rare), false);
});

test('les coûts hybrides se partagent nettement les couleurs de la carte', () => {
  assert.equal(cardHybridGradient(cardById('trait-de-braise')), null, 'une mono garde son coût ordinaire');
  assert.equal(cardHybridGradient(cardById('desert')), null, 'un terrain mono n’a pas de dégradé');
  const rouge = CARD_FRAME_COLORS.braise.color;
  const sable = CARD_FRAME_COLORS.sable.color;
  assert.equal(cardHybridGradient('vent-rouge'),
    `linear-gradient(135deg, ${rouge} 0% 50%, ${sable} 50% 100%)`,
    'Vent rouge : Braise en haut à gauche, Sable en bas à droite');
  assert.equal(cardHybridGradient('djinn-de-foudre'),
    `linear-gradient(135deg, ${rouge} 0% 50%, ${sable} 50% 100%)`,
    'Djinn de foudre : le coût partage le cadre dans le même sens que la carte, quel que soit l’ordre déclaré');
  assert.equal(cardHybridGradient({ colors: ['braise', 'eau', 'neige'] }),
    `linear-gradient(135deg, ${rouge} 0% 33%, ${CARD_FRAME_COLORS.eau.color} 33% 67%, ${CARD_FRAME_COLORS.neige.color} 67% 100%)`,
    'une future tricolore recevra trois bandes sans changer les couleurs des cartes mono');
});

test('chaque combinaison, y compris future, garde ses couleurs sans fond brillant', () => {
  for (const key of Object.keys(CARD_FRAME_COLORS).filter((key) => key.startsWith('hybride-'))) {
    const colors = key.replace('hybride-', '').split('-');
    const carte = { element: 'hybride', colors: colors.slice().reverse(), rarity: 'mythique' };
    assert.equal(cardFrameInfo(carte).key, key);
    assert.equal(cardFrameClass(carte), `rpg-card--frame-${key} rpg-card--mythique`);
    assert.equal(cardHasShinyFrame(carte), false);
  }
  for (const carte of RPG_DUEL_CARDS.filter((entry) => cardFrameInfo(entry).key.startsWith('hybride-'))) {
    assert.equal(cardHasShinyFrame(carte), false, carte.id);
  }
});

test('le catalogue applique les mêmes cadres aux vraies mythiques, sans violet imposé', () => {
  for (const carte of RPG_DUEL_CARDS.filter((c) => c.rarity === 'mythique')) {
    assert.equal(cardFrameColor(carte), cardFrameInfo(carte).color, carte.id);
    assert.equal(cardHasMythicFrame(carte), true, carte.id);
    assert.equal(cardFrameClass(carte).includes('rpg-card--frame-brillant'),
      !cardFrameInfo(carte).key.startsWith('hybride-'), carte.id);
  }
  assert.equal(cardFrameColor(cardById('anqa-des-braises')), CARD_FRAME_COLORS.braise.color);
  assert.equal(cardFrameColor(cardById('kraken')), CARD_FRAME_COLORS.eau.color);
  assert.equal(cardFrameColor(cardById('tin-hinan')), CARD_FRAME_COLORS.sable.color);
  assert.equal(cardFrameColor(cardById('maitre-du-marteau')), CARD_FRAME_COLORS.neige.color);
});

test('les armes n’ont plus de cadre spécifique : elles suivent leur élément', () => {
  for (const carte of RPG_ARME_CARDS) {
    assert.equal(cardFrameInfo(carte).key, carte.element, carte.id);
    assert.equal(cardFrameColor(carte), CARD_FRAME_COLORS[carte.element].color, carte.id);
    assert.equal(cardFrameClass(carte).includes('rpg-card--frame-arme'), false, carte.id);
  }
  const takouba = cardById('takouba-des-pistes');
  const baton = cardById('baton-des-citernes');
  assert.equal(cardFrameClass(takouba), 'rpg-card--frame-sable');
  assert.equal(cardFrameClass(baton), 'rpg-card--frame-eau');
  const armure = cardById('armure-de-cendres');
  assert.equal(cardFrameClass(armure), 'rpg-card--frame-braise rpg-card--frame-brillant rpg-card--mythique');
  assert.equal(cardHasShinyFrame(armure), true);
  assert.equal(cardHasShinyFrame(takouba), false);
  assert.equal(cardFrameInfo(cardById('kraken')).key, 'eau');
});
