import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardArt, CARD_ART_LARGEUR, CARD_ART_HAUTEUR } from '../src/games/rpgCardArt.js';

const illustrations = {
  'gardienne-des-sables-ensevelis': 'ascension-souls-v2',
  'valkyrie-de-la-derniere-aurore': 'ascension-pegase-dore-v3',
  'amiral-des-abysses': 'ascension-souls-v2',
  'serpent-des-deux-rivages': 'ascension-souls-v2',
};

for (const [id, version] of Object.entries(illustrations)) {
  test(`${id} : illustration au format des cartes et cache actualisé`, () => {
    const image = readFileSync(new URL(`../public/cards/${id}.jpg`, import.meta.url));
    assert.equal(image.readUInt16BE(0), 0xffd8);
    let dimensions;
    for (let i = 2; i + 9 < image.length;) {
      if (image[i] !== 0xff) { i += 1; continue; }
      const marqueur = image[i + 1];
      if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
        dimensions = [image.readUInt16BE(i + 7), image.readUInt16BE(i + 5)];
        break;
      }
      i += 2 + image.readUInt16BE(i + 2);
    }
    assert.deepEqual(dimensions, [CARD_ART_LARGEUR, CARD_ART_HAUTEUR]);
    assert.ok(cardArt(id).endsWith(`/cards/${id}.jpg?v=${version}`));
  });
}
