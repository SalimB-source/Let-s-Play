import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

test('les voies latérales et la main MOBA disposent de plus d’espace', () => {
  const dom = new JSDOM(`<style>${css}</style><div class="moba"><div class="moba__lanes">${[2, 1, 2].map((nombre) => `<section class="moba__lane"><div class="moba__side"><div class="moba__slots">${'<div class="moba__real-slot"></div>'.repeat(nombre)}</div></div></section>`).join('')}</div><div class="moba__hand"><div class="moba__hand-cards">${'<div class="moba__hand-item"></div>'.repeat(6)}</div></div></div>`, { virtualConsole: new VirtualConsole() });
  try {
    const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector));
    assert.equal(style('.moba__slots').gap, 'clamp(12px, 1.8vw, 26px)');
    assert.equal(style('.moba__lane:first-child .moba__slots').transform, 'translateX(calc(-1 * clamp(4px, 1.6vw, 22px)))');
    assert.equal(style('.moba__lane:nth-child(2) .moba__slots').transform, 'none');
    assert.equal(style('.moba__lane:last-child .moba__slots').transform, 'translateX(clamp(4px, 1.6vw, 22px))');
    assert.equal(style('.moba__hand-cards').gap, 'clamp(12px, 1.5vw, 22px)');
    // JSDOM normalise désormais min(vw, vh) en px ; vérifier la déclaration
    // d'origine plutôt qu'une sérialisation dépendante de sa version.
    assert.match(css, /\.moba \.moba__hand-item \{ position: relative; flex: 0 1 min\(7\.65vw, 12\.75vh, 105px\)/);
    assert.match(style('.moba__hand-item').maxWidth, /^calc\(14\.333% - /);
  } finally { dom.window.close(); }
});

test('le plateau conserve son décor et réduit légèrement les cartes selon le format', () => {
  assert.doesNotMatch(css, /\.moba::(?:before|after)\s*\{/);
  assert.match(css, /--moba-card-size:\s*min\(9\.6vw, 13\.5vh, 126px\)/);
  assert.match(css, /--moba-card-size:\s*min\(12\.5vw, 14\.3vh, 87px\)/);
  assert.match(css, /--moba-card-size:\s*min\(16\.3vw, 10\.5vh, 78px\)/);
  assert.match(css, /\.moba__slots \{ gap: 14px; \}/);
});

test('en portrait mobile, les pierres dépassent moins que l’espace entre deux cartes', () => {
  for (const [width, height] of [[320, 568], [390, 844], [430, 932]]) {
    const card = Math.min(width * .163, height * .105, 78);
    const effet = Math.min(36, Math.max(21, card * .26));
    assert.ok(card * 2 + 14 <= width * .96 * .4, `${width}×${height} : les deux cartes tiennent dans une voie`);
    assert.ok(14 - effet * .36 >= 6, `${width}×${height} : les effets gardent un intervalle visible`);
  }
});

test('sur PC paysage, les cinq positions gardent leur place avec des icônes séparées', () => {
  const dom = new JSDOM(`<style>${css}</style>`, { virtualConsole: new VirtualConsole() });
  try {
    const media = [...dom.window.document.styleSheets[0].cssRules].find((rule) =>
      rule.conditionText?.includes('min-width: 1200px') && rule.conditionText?.includes('min-height: 740px')
        && rule.conditionText?.includes('orientation: landscape'));
    assert.ok(media, 'les formats courts et portrait gardent leurs propres tailles');
    const declaration = (selector, property) => [...media.cssRules].find((rule) => rule.selectorText === selector)?.style.getPropertyValue(property).trim();
    assert.equal(declaration('.moba', '--moba-card-size').replaceAll(' ', ''), 'min(12vw,15.8vh,186px)');
    assert.equal(declaration('.moba .moba__hand-item', 'flex-basis').replaceAll(' ', ''), 'min(9.7vw,15.2vh,180px)');
    assert.match(declaration('.moba .moba__hand-item', 'max-width'), /100%.*clamp\(12px, 1\.5vw, 22px\)/);
    assert.match(css, /grid-template-columns: 2fr 1fr 2fr/);
    assert.match(css, /\.moba \.moba__real-slot \.rpg-card\.moba__slot \{[^}]*aspect-ratio: 4 \/ 5/);
    // Une rangée de cartes + leur marge et leur jauge doit tenir dans la
    // moitié du plateau (60 % de la hauteur) aux tailles PC courantes.
    for (const [width, height] of [[1366, 768], [1568, 883], [1920, 1080]]) {
      const card = Math.min(width * .12, height * .158, 186);
      const hand = Math.min(width * .097, height * .152, 180);
      const gap = Math.min(26, Math.max(12, width * .018));
      const effet = Math.min(36, Math.max(21, card * .26));
      assert.ok(card * 1.25 + 18 + 30 <= height * .30, `${width}×${height} : deux rangées entières`);
      assert.ok(hand * 1.25 + 8 <= height * .21, `${width}×${height} : main entière`);
      assert.ok(card * 2 + gap <= width * .6 * .4, `${width}×${height} : deux cartes sur le flanc`);
      assert.ok(gap - effet * .36 >= 6, `${width}×${height} : les pierres d'effets ne se touchent pas`);
    }
  } finally { dom.window.close(); }
});
