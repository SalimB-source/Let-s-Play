import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const feuilles = ['rpg-cadre-carte.css', 'rpg-battle.css', 'rpg-moba.css']
  .map(nom => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8'));

test('éclair et spirale sont sans fond et la spirale est plus petite partout', () => {
  const paires = [
    '<div class="rpg-cadre-vignette">',
    '<div class="rpg-battle"><div class="rpg-card--img">',
    '<div class="rpg-hover-card-preview__face">',
    '<div class="rpg-mulligan__card">',
    '<div class="moba__mulligan-card">',
  ];
  const fixture = paires.map((parent, i) => `${parent}<span id="actif-${i}" class="rpg-card__effet-badge">⚡</span><span id="reponse-${i}" class="rpg-card__effet-badge rpg-card__effet-badge--reponse">🌀</span>${i === 1 ? '</div></div>' : '</div>'}`).join('');
  const dom = new JSDOM(`<style>${feuilles.join('\n')}</style>${fixture}`, { virtualConsole: new VirtualConsole() });
  try {
    for (let i = 0; i < paires.length; i++) {
      const actif = dom.window.getComputedStyle(dom.window.document.getElementById(`actif-${i}`));
      const reponse = dom.window.getComputedStyle(dom.window.document.getElementById(`reponse-${i}`));
      for (const style of [actif, reponse]) {
        assert.equal(style.backgroundColor, 'rgba(0, 0, 0, 0)', `${i} : fond transparent`);
        assert.equal(style.borderStyle, 'none', `${i} : aucun contour`);
        assert.equal(style.boxShadow, 'none', `${i} : aucun disque ou ombre portée`);
        assert.equal(style.clipPath, 'none', `${i} : pas de triangle`);
        assert.equal(style.pointerEvents, 'none', `${i} : les clics passent à la carte`);
      }
      assert.ok(parseFloat(reponse.fontSize) < parseFloat(actif.fontSize), `${i} : spirale plus petite que l’éclair`);
      assert.equal(reponse.color, 'rgb(56, 189, 248)', `${i} : spirale bleue`);
    }
  } finally { dom.window.close(); }
});
