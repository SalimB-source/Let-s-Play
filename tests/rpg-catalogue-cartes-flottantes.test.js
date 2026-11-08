import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const lire = f => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8');

test('le catalogue montre seulement les faces avec coût et effets, en gardant le bouton accessible', () => {
  const page = lire('RpgDuelPage.jsx');
  const debut = page.indexOf('{cartesCatalogue.map((carte) => {');
  const catalogue = page.slice(debut, page.indexOf("{screen === 'parametres'", debut));
  assert.match(catalogue, /<ManaCost carte=\{carte\} showElement=\{false\}/);
  assert.match(catalogue, /<IconesCarte carte=\{carte\} className="rpg-card-icones--colonne rpg-card-icones--catalogue"/);
  assert.doesNotMatch(catalogue, /rpg-card-catalogue__details|rpg-card-catalogue__meta|<CarteIllustrationAlternative/);
  assert.match(catalogue, /aria-label=\{`Agrandir/);
  assert.match(catalogue, /onClick=\{\(\) => onOpenCardPreview\?\.\(carte\)\}/);
});

test('cinq colonnes et débords visibles sur la face et son conteneur, même verrouillé', () => {
  const css = lire('rpg-battle.css') + lire('effet-icons.css');
  const dom = new JSDOM(`<style>${css}</style><div class="rpg-battle"><div class="rpg-card-catalogue__grid"><article class="rpg-card-catalogue__card is-locked"><div class="rpg-card-catalogue__art"><img><span class="rpg-card-icones rpg-card-icones--colonne rpg-card-icones--catalogue"></span></div></article></div></div>`, { virtualConsole: new VirtualConsole() });
  const style = sel => dom.window.getComputedStyle(dom.window.document.querySelector(sel));
  assert.equal(style('.rpg-card-catalogue__grid').gridTemplateColumns, 'repeat(5, minmax(0, 1fr))');
  assert.equal(style('.rpg-card-catalogue__grid').gap, '40px 44px');
  for (const sel of ['.rpg-card-catalogue__card', '.rpg-card-catalogue__art']) {
    assert.equal(style(sel).overflow, 'visible');
  }
  assert.equal(style('.rpg-card-catalogue__card').backgroundColor, 'rgba(0, 0, 0, 0)');
  assert.equal(style('.rpg-card-icones').right, '0px');
  assert.equal(style('.rpg-card-icones').top, 'var(--rpg-card-element-marker-top, 5%)');
  assert.equal(style('.rpg-card-icones').bottom, 'auto');
  dom.window.close();
});
