import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const css = postcss.parse(readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8'));
function declaration(selector, prop) {
  const rules = [];
  css.walkRules((r) => { if (r.selectors?.includes(selector)) rules.push(r); });
  assert.ok(rules.length, `règle absente : ${selector}`);
  return rules.flatMap((r) => r.nodes.filter((n) => n.type === 'decl' && n.prop === prop)).at(-1)?.value;
}

test('la petite fenêtre est limitée aux sorts et conserve un contenu lisible et défilable', () => {
  assert.match(declaration('.rpg-annonce-sort--magie .rpg-hover-card-preview--annonce', '--rpg-annonce-card-width'), /27dvh.*140px/);
  assert.match(declaration('.rpg-annonce-sort--magie .rpg-hover-card-preview__layout', 'width'), /min\(424px, calc\(100% - 24px\)\)/);
  assert.match(declaration('.rpg-annonce-sort--magie .rpg-hover-card-preview__layout', 'grid-template-columns'), /var\(--rpg-annonce-card-width\) minmax\(0, 1fr\)/);
  assert.equal(declaration('.rpg-annonce-sort--magie .rpg-hover-card-preview__name', 'display'), 'block');
  assert.equal(declaration('.rpg-hover-card-preview--annonce .rpg-hover-card-preview__details', 'overflow-y'), 'auto');
  assert.equal(declaration('.rpg-annonce-sort__controls', 'pointer-events'), 'auto');
  assert.equal(declaration('.rpg-annonce-sort', 'pointer-events'), 'auto');
});

for (const partage of [true, false]) {
  test(`MOBA : le sort adverse est annoncé avant résolution (${partage ? 'rendu partagé' : 'rendu autonome'})`, async () => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root;
    try {
      const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
      const local = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
      const classic = await server.ssrLoadModule('/src/games/rpgDuel.js');
      const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
      let duel;
      const initialiser = () => (duel = local.rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 }));
      const props = { initialiser, onQuitter: () => {}, rendu: partage ? { HoverCardPreview: RPG_RENDU_MOBA.HoverCardPreview, TableCard: RPG_RENDU_MOBA.TableCard } : null };
      root = createRoot(document.getElementById('root'));
      const render = () => act(async () => root.render(React.createElement(Board, props)));
      const click = async (el) => { assert.ok(el); assert.equal(el.disabled, false); await act(async () => el.click()); };
      const text = (selector, value) => [...document.querySelectorAll(selector)].find(el => el.textContent.includes(value));
      await render(); await click(document.querySelector('.moba__mulligan .moba__primary'));
      duel.joueur.main = ['ashigaru-des-braises'];
      const cible = local.rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
      assert.ok(cible); cible.attaquee = true;
      classic.rpgFinDeTour(duel);
      duel.sorcier.main = ['trait-de-braise']; duel.joueur.main = ['silence-decume'];
      await render();
      for (let i = 0; i < 12 && !document.querySelector('.moba__card-announcement'); i++) await act(async () => new Promise(resolve => setTimeout(resolve, 250)));
      const modal = document.querySelector('.moba__card-announcement');
      assert.ok(modal?.classList.contains('rpg-annonce-sort--magie'));
      assert.match(modal.textContent, /Trait de braise/);
      assert.ok(duel.mobaSortEnAttente, 'le sort attend une décision');
      await click(text('.moba__card-announcement button', 'Répondre'));
      assert.ok(duel.mobaSortEnAttente, 'répondre ne résout pas le sort');
      assert.equal(document.querySelector('.moba__card-announcement'), null);
      await click(text('.moba__controls button', 'Voir l’annonce'));
      assert.ok(document.querySelector('.moba__card-announcement.rpg-annonce-sort--magie'));
      await click(text('.moba__card-announcement button', 'Laisser passer'));
      assert.equal(duel.mobaSortEnAttente, null);
      assert.ok(duel.sorcier.cimetiere.includes('trait-de-braise'));
    } finally {
      if (root) await act(async () => root.unmount());
      await server.close(); dom.window.close(); globalThis.window = oldWindow; globalThis.document = oldDocument;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
}
