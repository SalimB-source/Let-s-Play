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

test('les armes portent le même acier guilloché, teinté dans leur élément', () => {
  for (const carte of RPG_ARME_CARDS) {
    assert.equal(cardFrameInfo(carte).key, 'arme', carte.id);
    assert.equal(cardFrameInfo(carte).label, CARD_FRAME_COLORS[`arme-${carte.element}`].label, carte.id);
    assert.equal(cardFrameColor(carte), CARD_FRAME_COLORS[`arme-${carte.element}`].color, carte.id);
    assert.deepEqual(cardFrameClass(carte).split(' ').slice(0, 2),
      ['rpg-card--frame-arme', `rpg-card--frame-arme-${carte.element}`], carte.id);
  }
  // Le Takouba (Sable) et le Bâton (Eau) partagent la matière, pas la teinte :
  // acier doré contre acier bleu.
  const takouba = cardById('takouba-des-pistes');
  const baton = cardById('baton-des-citernes');
  assert.notEqual(takouba.element, baton.element);
  assert.notEqual(cardFrameColor(takouba), cardFrameColor(baton));
  assert.equal(cardFrameColor(takouba), CARD_FRAME_COLORS.sable.color);
  assert.equal(cardFrameColor(baton), CARD_FRAME_COLORS.eau.color);
  // L'Armure de cendres, mythique, garde le reflet animé sur son acier rouge.
  const armure = cardById('armure-de-cendres');
  assert.equal(cardFrameClass(armure), 'rpg-card--frame-arme rpg-card--frame-arme-braise rpg-card--frame-brillant rpg-card--mythique');
  assert.equal(cardHasShinyFrame(armure), true);
  assert.equal(cardHasShinyFrame(takouba), false);
  // Une carte ordinaire garde le cadre de son élément.
  assert.equal(cardFrameInfo(cardById('kraken')).key, 'eau');
});
