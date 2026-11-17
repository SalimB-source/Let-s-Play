import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const mana = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');
const regle = (texte, selecteur) => {
  const debut = texte.indexOf(selecteur); assert.notEqual(debut, -1, selecteur);
  return texte.slice(debut, texte.indexOf('}', debut) + 1);
};

test('le mulligan PC dispose de gouttières plus larges sans modifier le mode tactile', () => {
  const commun = regle(css, '.rpg-mulligan {');
  const pc = regle(css, '.rpg-battle:not(.rpg-battle--touch) .rpg-mulligan {');
  const tactile = regle(mobile, '.rpg-battle--touch .rpg-mulligan {');
  const dom = new JSDOM(`<style>${commun}\n${pc}\n${tactile}</style>
    <div class="rpg-battle"><div id="pc" class="rpg-mulligan"></div></div>
    <div class="rpg-battle rpg-battle--touch"><div id="mobile" class="rpg-mulligan"></div></div>`,
  { virtualConsole: new VirtualConsole() });
  try {
    const valeur = id => dom.window.getComputedStyle(dom.window.document.getElementById(id)).getPropertyValue('--rpg-mulligan-gap');
    assert.match(valeur('pc'), /clamp\(36px,\s*3vw,\s*48px\)/);
    assert.match(valeur('mobile'), /clamp\(14px,\s*1\.8vw,\s*16px\)/);
  } finally { dom.window.close(); }
});

test('cinq cartes et quatre espaces tiennent toujours dans la scène PC', () => {
  const cards = regle(css, '.rpg-mulligan__cards {');
  const colonnes = [...cards.matchAll(/grid-auto-columns:\s*([^;]+);/g)].map(m => m[1]);
  assert.equal(colonnes.length, 2);
  for (const colonne of colonnes) assert.match(colonne, /4 \* var\(--rpg-mulligan-gap\).*\/ 5\)/);
  for (const largeur of [768, 1024, 1280, 1920]) {
    const gap = Math.min(48, Math.max(36, largeur * .03));
    // Largeur utile conservative : panneau et réserve de pierres.
    const stage = Math.min(largeur - 88, 1360);
    const carte = (stage - 4 * gap) / 5;
    assert.ok(gap >= 36 && gap <= 48);
    assert.ok(carte >= 100, `${largeur}px : carte de ${carte}px`);
    assert.ok(5 * carte + 4 * gap <= stage + .01);
  }
});

test('le texte bleu sur le mana ne figure plus dans le mulligan', () => {
  const volet = page.slice(page.indexOf('function VoletMulligan('), page.indexOf('function ', page.indexOf('function VoletMulligan(') + 9));
  assert.match(volet, /rpg-mulligan__head/);
  assert.doesNotMatch(volet, /Sans terrains ni mana|rpg-mulligan__mana-note|essaiMana/);
  assert.doesNotMatch(mana, /rpg-mulligan__mana-note/);
});
