import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { cardById, bonusArme } from '../src/games/rpgCards.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';

test('les faces du mulligan reprennent les repères de la main et restent sélectionnables', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { RPG_RENDU_MOBA } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const Carte = RPG_RENDU_MOBA.CarteMulligan;
    const ids = ['tojiro-le-pourfendeur', 'feriel', 'jitte-d-amayas', 'trait-de-braise', 'ashigaru-des-braises'];
    let indices = [];
    root = createRoot(document.getElementById('root'));
    const render = async (selected = null) => act(async () => root.render(React.createElement('div', { className: 'rpg-battle' },
      ids.map((id, index) => React.createElement(Carte, { key: id, carte: cardById(id), index, selectionnee: index === selected, onBasculer: i => indices.push(i) }))
    )));
    await render();
    const cartes = [...document.querySelectorAll('.rpg-mulligan__card')];
    assert.equal(cartes.length, ids.length);
    for (const [i, id] of ids.entries()) {
      const carte = cardById(id), bouton = cartes[i];
      assert.equal(bouton.dataset.cardId, id); assert.equal(bouton.dataset.mulliganIndex, String(i));
      assert.ok(bouton.querySelector('img')?.getAttribute('src').includes(id));
      assert.equal(Boolean(bouton.querySelector('.rpg-mana-cost')), carte.cost != null && carte.kind !== 'terrain');
      assert.deepEqual([...bouton.querySelectorAll('.rpg-card-icone')].map(e => e.dataset.effet),
        pastillesPourCarte(carte).flatMap(p => p.cle === 'protection' && p.contres?.length > 1 ? p.contres.map(() => p.cle) : [p.cle]), id);
      const stats = bouton.querySelector('.rpg-mulligan__stats');
      if (carte.kind === 'creature' || carte.kind === 'hero') {
        assert.equal(stats.querySelector('.rpg-card__stat--atk .rpg-stat-value').textContent, String(carte.atk));
        assert.equal(stats.querySelector('.rpg-card__pt .rpg-stat-value').textContent, String(carte.def));
        assert.equal(stats.querySelector('[data-stat-icon="arc"]') !== null, Boolean(carte.coupRapide));
      } else if (id === 'jitte-d-amayas') {
        const bonus = bonusArme(carte), signer = n => n >= 0 ? `+${n}` : `${n}`;
        assert.equal(stats.querySelector('.rpg-card__stat--atk .rpg-stat-value').textContent, signer(bonus.atk ?? 0));
        assert.equal(stats.querySelector('.rpg-card__pt .rpg-stat-value').textContent, signer(bonus.def ?? 0));
      } else assert.equal(stats, null, `${id} ne reçoit pas de statistiques fictives`);
    }
    await act(async () => cartes[0].click());
    assert.deepEqual(indices, [0]); await render(0);
    assert.equal(cartes[0].getAttribute('aria-pressed'), 'true');
    assert.ok(cartes[0].classList.contains('is-selected'));
    // Le MOBA dessine ses effets dans le wrapper, avec ses règles adaptées,
    // et sa main n'affiche pas les bonus des armes : éviter les doublons.
    await act(async () => root.render(React.createElement(Carte, { carte: cardById('tojiro-le-pourfendeur'), index: 0, selectionnee: false, onBasculer: () => {}, afficherIcones: false, moba: true })));
    assert.equal(document.querySelector('.rpg-card-icones'), null);
    assert.ok(document.querySelector('.rpg-mulligan__stats'));
    await act(async () => root.render(React.createElement(Carte, { carte: cardById('jitte-d-amayas'), index: 0, selectionnee: false, onBasculer: () => {}, afficherIcones: false, moba: true })));
    assert.equal(document.querySelector('.rpg-mulligan__stats'), null, 'comme dans la main MOBA');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});


test('la disposition du mulligan suit celle des cartes en main', () => {
  const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
  const battle = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const rules = css.slice(css.indexOf('/* Mulligan : les mêmes repères'));
  assert.match(rules, /grid-template-columns:\s*max-content; grid-template-rows:\s*auto auto/);
  assert.match(rules, /left:\s*5%; right:\s*auto; bottom:\s*4%/);
  assert.match(rules, /font-size:\s*clamp\(11px, 20cqw, 20px\)/);
  assert.match(rules, /\.rpg-card-icones--mulligan-moba\s*\{[^}]*--rpg-plaque-taille:\s*26cqw;[^}]*top:\s*5%; right:\s*0/s);
  assert.match(battle, /\.rpg-mulligan__stage\s*\{[^}]*padding-inline:\s*clamp\(12px, 2vw, 24px\)/s);
});
