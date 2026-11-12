import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CARD_ART_HAUTEUR, CARD_ART_LARGEUR, cardArt, cardArtFurie } from '../src/games/rpgCardArt.js';
import { cardById } from '../src/games/rpgCards.js';

function imageJpeg(id) {
  const bytes = readFileSync(new URL(`../public/cards/${id}.jpg`, import.meta.url));
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  for (let i = 2; i + 9 < bytes.length;) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      assert.deepEqual([bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)],
        [CARD_ART_LARGEUR, CARD_ART_HAUTEUR], `${id} garde le ratio de la carte`);
      return bytes;
    }
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  assert.fail(`${id} n’a pas de dimensions JPEG lisibles`);
}

test('la peinture du Jarl remplit la carte sans réduction qui révèle des bordures', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(css, /\.rpg-card__img\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;/s);
  assert.doesNotMatch(css, /\[data-card-id=["']jarl-au-marteau-de-guerre["']\][^{]*>\s*\.rpg-card__img\s*\{/);
});

test('le Jarl et le Gardien ont leurs faces de Furie dédiées et datées', () => {
  for (const id of ['jarl-au-marteau-de-guerre', 'gardien-viking-du-fjord']) {
    const carte = cardById(id);
    assert.ok(carte.furie > 0, `${id} peut déclencher Furie`);
    const intacte = imageJpeg(id);
    const enFurie = imageJpeg(`${id}-furie`);
    assert.notEqual(createHash('sha256').update(intacte).digest('hex'),
      createHash('sha256').update(enFurie).digest('hex'), `${id} change réellement de peinture`);
    assert.match(cardArtFurie(carte), new RegExp(`cards/${id}-furie\\.jpg\\?v=`));
  }
  assert.match(cardArt('jarl-au-marteau-de-guerre'), /jarl-au-marteau-de-guerre\.jpg\?v=neige-jarl-marteau-v2/);
  assert.match(cardArtFurie('jarl-au-marteau-de-guerre'), /neige-jarl-charge-furie-v2/);
  assert.match(cardArtFurie('gardien-viking-du-fjord'), /neige-gardien-charge-furie-v1/);
});
