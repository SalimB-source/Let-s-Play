import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { rpgAnglesRelief, rpgEffacerRelief, rpgLumiereElementaire, rpgSurvolRelief } from '../src/games/rpgReliefVisuel.js';

test('la lumière conserve tous les éléments des hybrides et prévoit un repli neutre', () => {
  assert.match(rpgLumiereElementaire({ element: 'braise' })['--rpg-lumiere-fond'], /#ff925e/);
  const multi = rpgLumiereElementaire({ colors: ['braise', 'eau', 'neige', 'tenebres'] })['--rpg-lumiere-fond'];
  for (const couleur of ['#ff925e', '#68d8ee', '#b5eaff', '#bd8ee9']) assert.ok(multi.includes(couleur));
  assert.match(rpgLumiereElementaire(null)['--rpg-lumiere-fond'], /#eac47e/);
});

test('relief : angles bornés, souris seulement et nettoyage sans interaction tactile', () => {
  const rect = { left: 10, top: 20, width: 100, height: 200 };
  assert.deepEqual(rpgAnglesRelief(rect, 60, 120), { x: -0, y: 0 });
  assert.deepEqual(rpgAnglesRelief(rect, 999, -999), { x: 3, y: 3 });
  assert.equal(rpgAnglesRelief({ width: 0, height: 1 }, 0, 0), null);
  const dom = new JSDOM('<div class="rpg-battle"><button></button></div>');
  const button = dom.window.document.querySelector('button');
  button.getBoundingClientRect = () => rect;
  const event = { currentTarget: button, pointerType: 'mouse', clientX: 110, clientY: 20, buttons: 0 };
  rpgSurvolRelief(event);
  assert.equal(button.dataset.reliefSurvol, 'true');
  assert.equal(button.style.getPropertyValue('--rpg-relief-x'), '3.00deg');
  assert.equal(button.style.getPropertyValue('--rpg-relief-y'), '3.00deg');
  assert.equal(button.style.getPropertyValue('--rpg-ombre-x'), '-4.50px');
  assert.equal(button.style.getPropertyValue('--rpg-ombre-y'), '12.50px');
  rpgSurvolRelief({ ...event, pointerType: 'touch' });
  assert.equal(button.hasAttribute('data-relief-survol'), false);
  rpgSurvolRelief(event, true); assert.equal(button.hasAttribute('data-relief-survol'), false);
  button.closest('.rpg-battle').classList.add('is-reduced');
  rpgSurvolRelief(event); assert.equal(button.hasAttribute('data-relief-survol'), false);
  rpgEffacerRelief(button); assert.equal(button.style.getPropertyValue('--rpg-relief-x'), '');
  dom.window.close();
});

test('les effets préservent les signaux de combat et le mouvement réduit', () => {
  const css = readFileSync(new URL('../src/games/rpg-relief-visuel.css', import.meta.url), 'utf8');
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.is-reduced[\s\S]*rpg-impact-onde/);
  assert.match(css, /pointer: fine/);
  assert.match(css, /\.is-attacked[\s\S]*\.fx-lunge/);
  assert.match(css, /\.rpg-relief-ombre\s*\{[^}]*box-shadow:/, 'l’ombre mobile est isolée de celle de la carte');
  assert.match(css, /:not\(\[data-combat-tilted="true"\]\)/);
});
