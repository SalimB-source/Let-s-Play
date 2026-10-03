import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARACTER_ACCESSORIES,
  CHARACTER_NAMES,
  CHARACTER_PALETTES,
  CHARACTER_PRICES,
  LINK_EPONA_INDEX,
  LOBBY_CHARACTER_INDICES,
} from '../src/games/mirageCharacters.js';
import {
  LINK_EPONA_FREE_DAYS,
  LINK_EPONA_FREE_FROM,
  LINK_EPONA_FREE_UNTIL,
  LINK_EPONA_ID,
  SKINS,
  SHOP_SKINS,
  buySkin,
  equipSkin,
  formatFreeWindow,
  isLinkEponaFree,
  isSkinTemporarilyFree,
  isSkinUnlocked,
  sanitizeProgress,
  temporaryFreeUntil,
} from '../src/games/mirageProgression.js';
import { accessoriesForPalette } from '../src/games/mirageExplorer.js';

const linkSkin = SKINS.find((skin) => skin.id === LINK_EPONA_ID);
const HOUR = 3600000;
const DAY = 24 * HOUR;

test('Link & Épona existent comme personnage jouable', () => {
  assert.ok(linkSkin, 'le skin Link & Épona est enregistré');
  assert.equal(linkSkin.name, 'Link & Épona');
  assert.equal(linkSkin.horse, 'Épona', 'il est monté sur Épona');
  assert.equal(linkSkin.price, 320, 'prix boutique de 320 OR');
  assert.equal(CHARACTER_PRICES[LINK_EPONA_INDEX], 320);
  assert.equal(CHARACTER_NAMES[LINK_EPONA_INDEX], 'Link · Épona & épée de légende');
  assert.equal(CHARACTER_ACCESSORIES[LINK_EPONA_INDEX], 'link-epona');
  assert.equal(
    accessoriesForPalette(CHARACTER_PALETTES[LINK_EPONA_INDEX]),
    'link-epona',
    'la palette verte / jument baie déclenche les accessoires de Link',
  );
  assert.ok(SHOP_SKINS.some((skin) => skin.id === LINK_EPONA_ID), 'il est vendu en boutique');
  assert.ok(LOBBY_CHARACTER_INDICES.includes(LINK_EPONA_INDEX), 'il est jouable dans le lobby en ligne');
});

test('l’essai gratuit dure exactement 3 jours', () => {
  assert.equal(LINK_EPONA_FREE_DAYS, 3);
  assert.equal(LINK_EPONA_FREE_UNTIL - LINK_EPONA_FREE_FROM, 3 * DAY, '72 heures d’accès offert');
});

test('l’accès est ouvert pendant la fenêtre, fermé avant et après', () => {
  assert.equal(isLinkEponaFree(LINK_EPONA_FREE_FROM - HOUR), false, 'pas offert avant l’ouverture');
  assert.equal(isLinkEponaFree(LINK_EPONA_FREE_FROM), true, 'offert dès l’ouverture');
  assert.equal(isLinkEponaFree(LINK_EPONA_FREE_FROM + 2 * DAY), true, 'offert le 3ᵉ jour');
  assert.equal(isLinkEponaFree(LINK_EPONA_FREE_UNTIL), false, 'refermé à la fin des 3 jours');
  assert.equal(isLinkEponaFree(LINK_EPONA_FREE_UNTIL + 10 * DAY), false, 'toujours fermé ensuite');
});

test('le skin est jouable gratuitement pendant l’essai, puis repasse à 320 OR', () => {
  const fresh = sanitizeProgress({ xp: 0, coins: 0, ownedSkins: [] });
  assert.equal(isSkinUnlocked(linkSkin, 1, [], LINK_EPONA_FREE_FROM + DAY), true,
    'débloqué pour tout le monde pendant les 3 jours');
  assert.equal(isSkinTemporarilyFree(linkSkin, LINK_EPONA_FREE_FROM + DAY), true);
  assert.equal(temporaryFreeUntil(linkSkin, LINK_EPONA_FREE_FROM + DAY), LINK_EPONA_FREE_UNTIL);
  assert.equal(isSkinUnlocked(linkSkin, 1, [], LINK_EPONA_FREE_UNTIL + HOUR), false,
    'reverrouillé une fois l’essai terminé');
  assert.equal(isSkinTemporarilyFree(linkSkin, LINK_EPONA_FREE_UNTIL + HOUR), false);

  // Pendant l’essai : équiper ne coûte rien et n’enregistre aucun achat.
  const during = equipSkin({ ...fresh, coins: 500 }, LINK_EPONA_ID);
  assert.equal(during.skinId, LINK_EPONA_ID);
  assert.deepEqual(during.ownedSkins, [], 'l’essai ne marque pas le skin comme acheté');
  assert.equal(during.coins, 500, 'l’essai ne débite pas le portefeuille');
  const buyDuring = buySkin({ ...fresh, coins: 500 }, LINK_EPONA_ID);
  assert.equal(buyDuring.ok, false);
  assert.equal(buyDuring.reason, 'temporarily-unlocked', 'aucun achat possible pendant l’essai');
});

test('après l’essai, l’achat redevient possible au prix de 320 OR', () => {
  const after = LINK_EPONA_FREE_UNTIL + HOUR;
  const poor = { xp: 0, coins: 100, ownedSkins: [], skinId: 'desert' };
  const failed = buySkin(poor, LINK_EPONA_ID, after);
  assert.equal(failed.ok, false, 'il faut 320 OR pour l’acheter');
  assert.equal(failed.reason, 'broke');
  const rich = { xp: 0, coins: 400, ownedSkins: [], skinId: 'desert' };
  const bought = buySkin(rich, LINK_EPONA_ID, after);
  assert.equal(bought.ok, true, 'l’achat redevient possible après la fenêtre gratuite');
  assert.equal(bought.progress.coins, 80, '320 OR sont débités');
  assert.deepEqual(bought.progress.ownedSkins, [LINK_EPONA_ID]);
  assert.equal(bought.progress.skinId, LINK_EPONA_ID);
  assert.equal(isSkinUnlocked(linkSkin, 1, [LINK_EPONA_ID], after), true,
    'une fois acheté, il reste jouable après la fin de l’essai');
});

test('le compte à rebours s’affiche en jours / heures / minutes', () => {
  assert.equal(formatFreeWindow(2 * DAY + 5 * HOUR), '2 j 05 h');
  assert.equal(formatFreeWindow(18 * HOUR + 4 * 60000), '18 h 04 min');
  assert.equal(formatFreeWindow(45 * 60000), '45 min');
  assert.equal(formatFreeWindow(0), '1 min', 'un reliquat n’affiche jamais « 0 min »');
});
