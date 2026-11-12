import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

test('les paquets et la main de départ s’agrandissent seulement sur PC paysage', () => {
  const dom = new JSDOM(`<style>${css}</style>`, { virtualConsole: new VirtualConsole() });
  try {
    const media = [...dom.window.document.styleSheets[0].cssRules].find((rule) =>
      rule.conditionText?.includes('min-width: 1200px') && rule.conditionText?.includes('min-height: 740px')
        && rule.conditionText?.includes('orientation: landscape'));
    assert.ok(media, 'hors PC paysage, les tailles compactes restent en place');
    const value = (selector, property) => [...media.cssRules].find((rule) => rule.selectorText === selector)?.style.getPropertyValue(property).trim();
    assert.equal(value('.moba__setup', 'width'), 'min(100%, 1140px)');
    assert.equal(value('.moba__setup .moba__booster-item', 'flex-basis'), '165px');
    assert.equal(value('.moba__setup .moba__booster-scene', 'height'), 'min(26dvh, 220px)');
    assert.equal(value('.moba__mulligan-overlay .moba__mulligan', 'width'), 'min(100%, 1020px)');
    assert.match(value('.moba .moba__mulligan-overlay .moba__mulligan-item,\n  .moba__mulligan-overlay .moba__mulligan-card', 'flex-basis'), /calc\(\(100% - 4 \* var\(--moba-mulligan-gap\)\) \/ 5\).*180px/);
    assert.equal(value('.moba__mulligan-overlay .moba__mulligan-cards', 'padding'), '0px 18px');
    // Six paquets tiennent sans rognage dans le sélecteur ; cinq faces 4:5
    // laissent leur marge d’icônes et le bouton entièrement visibles.
    const packs = 6 * 165 + 5 * 14 + 2 * 8;
    assert.ok(packs <= 1140 - 2 * 30);
    const usable = 1020 - 2 * 18 - 2 * 18;
    const width = Math.min((usable - 4 * 22) / 5, 180);
    assert.ok(width >= 160 && 5 * width + 4 * 22 <= usable);
    assert.ok(width * 1.25 + 44 + 2 * 20 < 600);
  } finally { dom.window.close(); }
});
