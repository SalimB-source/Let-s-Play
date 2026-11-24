import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-avatars-plateau.css', import.meta.url), 'utf8');
const sheet = postcss.parse(css);
const rules = [];
sheet.walkRules(rule => rules.push(rule));
const decl = (rule, name) => rule.nodes.find(node => node.type === 'decl' && node.prop === name)?.value;
const ruleWith = (prop, value) => rules.find(rule => decl(rule, prop) === value);

test('perspective des cases et des cartes réellement posées, sans transformer le calque de ciblage', () => {
  const perspective = ruleWith('perspective', '900px');
  assert.ok(perspective);
  assert.match(perspective.selector, /\.card-row/);
  assert.match(perspective.selector, /\.rpg-creature-slot/);
  assert.equal(decl(perspective, 'transform'), undefined);
  assert.equal(decl(perspective, 'pointer-events'), undefined);
  const rotation = ruleWith('rotate', 'x 6deg');
  assert.ok(rotation);
  assert.match(rotation.selector, /> \.rpg-card:not\(\.is-envol\)/);
  assert.match(rotation.selector, /rpg-card-prison, \.rpg-card-stack/);
  assert.equal(decl(rotation, 'transform'), undefined, 'la rotation individuelle laisse libres les transforms de combat');
  const envol = ruleWith('transform', 'rotateX(6deg)');
  assert.match(envol.selector, /\.rpg-card\.is-envol/);
  for (const etat of ['data-combat-tilted', 'fx-enter', 'fx-lunge', 'fx-hit', 'fx-dodge']) assert.ok(envol.selector.includes(etat));
});

test('élévation limitée aux pointeurs fins et respect des préférences de mouvement', () => {
  const elevation = ruleWith('translate', '0 -6px');
  assert.ok(elevation);
  assert.match(elevation.selector, /:hover/);
  assert.match(elevation.selector, /:focus-within/);
  assert.match(elevation.selector, /:not\(\.is-reduced\)/);
  assert.match(elevation.parent.params, /hover:\s*hover/);
  assert.match(elevation.parent.params, /pointer:\s*fine/);
  assert.match(elevation.parent.params, /prefers-reduced-motion:\s*no-preference/);
  assert.equal(decl(elevation, 'z-index'), '20');
});

test('les sélecteurs visent les vraies cartes, piles et armes, pas leurs cases séparées', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const entite = (id, extra = {}) => ({ id, carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true, ...extra });
    const render = e => renderToStaticMarkup(React.createElement(TableCard, { entite: e, cote: 'joueur' }));
    const doc = new JSDOM(`<div class="rpg-battle" data-scene="duel"><div class="card-row">
      <div class="rpg-creature-slots"><span class="rpg-creature-slot is-occupied"></span></div>
      ${render(entite('simple'))}
      ${render(entite('equipee', { arme: { carteId: 'armure-de-cendres' } }))}
      <span class="rpg-card-stack">${render(entite('pile', { arme: { carteId: 'sabre-maudit' } }))}</span>
      ${render(entite('volante', { envol: true }))}
    </div></div>`).window.document;
    const rotation = ruleWith('rotate', 'x 6deg');
    const cibles = [...doc.querySelectorAll(rotation.selector)];
    assert.equal(cibles.length, 3, 'carte simple, wrapper d’arme et pile, sans doubler le wrapper interne');
    assert.equal(cibles.filter(el => el.classList.contains('rpg-card-prison')).length, 1);
    assert.equal(cibles.filter(el => el.classList.contains('rpg-card-stack')).length, 1);
    assert.equal(cibles.flatMap(el => [...el.querySelectorAll('.rpg-card__arme-derriere')]).length, 2);
    assert.equal(doc.querySelector('.rpg-creature-slot').matches(rotation.selector), false);
    const envol = doc.querySelector('.rpg-card.is-envol');
    assert.equal(envol.matches(ruleWith('transform', 'rotateX(6deg)').selector), false, 'entrée animée préservée');
    envol.classList.remove('fx-enter');
    assert.ok(envol.matches(ruleWith('transform', 'rotateX(6deg)').selector));
    envol.dataset.combatTilted = 'true';
    assert.equal(envol.matches(ruleWith('transform', 'rotateX(6deg)').selector), false);
    envol.dataset.combatTilted = 'false'; envol.classList.add('fx-lunge');
    assert.equal(envol.matches(ruleWith('transform', 'rotateX(6deg)').selector), false);
  } finally { await vite.close(); }
});
