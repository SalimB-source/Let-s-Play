import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const mobaCss = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

// jsdom ne calcule pas les animations : vérifier leurs quatre étapes en plus
// des variables appliquées aux véritables cartes posées.
test('Envol MOBA reste sous les PV, sans modifier le duel, la main ni l’aperçu', () => {
  const dom = new JSDOM(`<style>${battleCss}\n${mobaCss}</style>
    <div class="rpg-battle rpg-battle--moba"><main class="moba">
      <div class="moba__side moba__side--sorcier"><div class="moba__health"></div><div class="moba__slots"><button class="rpg-card is-envol"></button></div></div>
      <div class="moba__side moba__side--joueur is-joined-flank"><div class="moba__health"></div><div class="moba__slots"><button class="rpg-card is-envol"></button></div></div>
      <div class="moba__hand"><button class="rpg-card is-envol"></button></div>
      <div class="moba__preview-layer"><button class="rpg-card is-envol"></button></div>
    </main></div>
    <div class="rpg-battle"><div class="card-row"><button class="rpg-card is-envol"></button></div></div>`, { virtualConsole: new VirtualConsole() });
  try {
    const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector));
    const flying = style('.rpg-battle--moba .moba__slots .rpg-card');
    assert.deepEqual(['--rpg-envol-repos', '--rpg-envol-montee', '--rpg-envol-sommet', '--rpg-envol-descente']
      .map((name) => flying.getPropertyValue(name)), ['-2px', '-3px', '-4px', '-3px']);
    for (const selector of ['.moba__hand .rpg-card', '.moba__preview-layer .rpg-card', '.card-row .rpg-card']) {
      assert.equal(style(selector).getPropertyValue('--rpg-envol-repos'), '', `${selector} garde la hauteur de vol classique`);
    }
    assert.equal(style('.moba__side--sorcier > .moba__health').zIndex, '3');
    assert.equal(style('.moba__side--sorcier > .moba__health').position, 'relative');
    assert.equal(style('.moba__side--joueur > .moba__health').position, 'absolute', 'la jauge rattachée reste ancrée');
    assert.equal(style('.moba__side--joueur > .moba__health').zIndex, '12');
  } finally { dom.window.close(); }
  assert.match(battleCss, /\.rpg-card\.is-envol\s*\{[^}]*translate: 0 var\(--rpg-envol-repos, -14px\)/s);
  for (const [stage, fallback] of [['repos', '-14px'], ['montee', '-19px'], ['sommet', '-23px'], ['descente', '-17.5px']]) {
    assert.match(battleCss, new RegExp(`@keyframes rpg-envol-levite[\\s\\S]*?translate: [^;]*var\\(--rpg-envol-${stage}, ${fallback.replace('.', '\\.')}\\)`));
  }
  assert.match(battleCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.rpg-card\.is-envol \{ animation: none; \}/);
});
