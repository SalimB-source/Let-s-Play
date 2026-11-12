import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM, VirtualConsole } from 'jsdom';

// Tester le vrai composant et ses mises à jour indépendamment des scénarios de duel.
const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-stacks-smoke.jsx', outDir: 'node_modules/.cache/rpg-heures', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { scenarioCompteursSurCarte } = await import('../node_modules/.cache/rpg-heures/rpg-stacks-smoke.js');
  await scenarioCompteursSurCarte(assert);
} finally { dom.window.close(); }

// La cascade ne doit pas replacer les Heures avec les autres compteurs,
// notamment sur les cartes tactiles et les cases MOBA.
const css = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-mana-essai.css', 'effet-icons.css', 'rpg-moba.css']
  .map(nom => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8')).join('\n');
const fixtures = ['card-row', 'moba__slots'].flatMap(zone => [false, true].flatMap(touch => [false, true].map(hybride =>
  `<div class="rpg-battle ${zone === 'moba__slots' ? 'rpg-battle--moba moba' : ''} ${touch ? 'rpg-battle--touch' : ''}"><div class="${zone}"><div class="rpg-card rpg-card--img">
    <span class="rpg-card-element-badge is-plaque ${hybride ? 'rpg-card-element-badge--hybride' : ''}"></span>
    <span class="rpg-card__compteurs ${hybride ? 'rpg-card__compteurs--hybride' : ''}"></span>
    <span class="rpg-card__compteurs-creature"><span class="rpg-card__compteur rpg-card__compteur--heures">2</span><span class="rpg-card__compteur rpg-card__compteur--cale">⛓</span></span>
    <header class="rpg-card__title"><span class="rpg-mana-cost is-plaque"></span></header>
    <span class="rpg-card-icones rpg-card-icones--colonne"></span>
  </div></div></div>`))).join('');
assert.match(css, /\.rpg-card\.has-arme > \.rpg-card__compteurs-creature\s*\{[\s\S]*?calc\(max\(34cqw, 26px\) \/ 2 \+ var\(--rpg-card-counter-size\) \* \.21 \+ 2px\)/,
  'la pointe de la vignette et le losange central ne se chevauchent pas');
const styleDom = new JSDOM(`<style>${css}</style>${fixtures}`, { virtualConsole: new VirtualConsole() });
for (const heures of styleDom.window.document.querySelectorAll('.rpg-card__compteurs-creature')) {
  const style = styleDom.window.getComputedStyle(heures);
  assert.equal(style.position, 'absolute');
  assert.equal(style.left, '50%');
  assert.equal(style.transform, 'translateX(-50%)');
  assert.equal(style.top, 'calc(var(--rpg-card-element-marker-top, 5%) + (var(--rpg-cout-taille, 26.88px) - var(--rpg-card-counter-size)) / 2)');
  assert.equal(style.pointerEvents, 'none');
  assert.equal(style.display, 'flex');
  assert.equal(style.flexDirection, 'column');
  assert.equal(style.gap, 'calc(var(--rpg-card-counter-size) * .42 + 2px)');
  assert.equal(styleDom.window.getComputedStyle(heures.firstElementChild).transform, 'rotate(45deg)');
}
styleDom.window.close();
console.log('✓ Heures et cale centrées et séparées ; compteurs d’armes et colonne préservés sur mono, hybride, tactile et MOBA');
