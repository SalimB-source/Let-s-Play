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
    assert.equal(value('.moba__mulligan-overlay .moba__mulligan', 'width'), 'min(100%, 1300px)');
    assert.match(value('.moba .moba__mulligan-overlay .moba__mulligan-item,\n  .moba__mulligan-overlay .moba__mulligan-card', 'flex-basis'), /calc\(\(100% - 4 \* var\(--moba-mulligan-gap\)\) \/ 5\).*220px/);
    assert.equal(value('.moba__mulligan-overlay .moba__mulligan-cards', 'padding'), '0px 24px');
    assert.equal(value('.moba .moba__mulligan-overlay .rpg-card-icones--mulligan-moba', '--rpg-plaque-bord'), '0%');
    // Six paquets tiennent sans rognage dans le sélecteur ; cinq faces 4:5
    // gardent au moins 26 px entre elles pour les pierres débordantes.
    const packs = 6 * 165 + 5 * 14 + 2 * 8;
    assert.ok(packs <= 1140 - 2 * 30);
    for (const [viewport, height] of [[1366, 768], [1568, 883]]) {
      const modal = Math.min(viewport - 6, 1300);
      const gap = Math.min(Math.max(viewport * .0225, 26), 34);
      const usable = modal - 2 * 20 - 2 * 24;
      const width = Math.min((usable - 4 * gap) / 5, 220);
      assert.ok(width >= 190 && gap >= 26 && 5 * width + 4 * gap <= usable);
      assert.ok(width * 1.25 + 44 + 2 * 20 < Math.min(height - 36, 660));
    }
  } finally { dom.window.close(); }
});
