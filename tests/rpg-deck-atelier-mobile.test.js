import React, { act } from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

const css = readFileSync(new URL('../src/games/rpg-deck-atelier.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/games/RpgDeckAtelier.jsx', import.meta.url), 'utf8');

test('le mobile affiche une seule liste, avec onglets et actions hors des deux listes défilantes', () => {
  assert.match(css, /@media \(max-width: 960px\)\s*\{[\s\S]*?\.rpg-atelier\[data-mobile-view="cartes"\] \.rpg-atelier__deck,[\s\S]*?display: none;/);
  assert.match(css, /navigation du jeu est encore latérale[\s\S]*?grid-template-rows: minmax\(0, 1fr\) auto;/);
  assert.match(css, /téléphone portrait[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.rpg-atelier__cartes,\s*\.rpg-atelier__liste\s*\{[^}]*max-height: none;/);
  assert.match(css, /\.rpg-atelier__mobile-barre\s*\{[^}]*display: flex;/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.rpg-atelier__carte-ajout,\s*\.rpg-atelier__carte-retrait\s*\{[^}]*width: 44px;[^}]*height: 44px;/);
  assert.match(css, /\.rpg-atelier__ligne-compte button\s*\{[^}]*width: 42px;[^}]*height: 42px;/);
  assert.match(css, /\.rpg-atelier__courbe:not\(\.is-mobile-open\) \{ display: none; \}/);
  assert.match(source, /onOpenCardPreview\?\.\(carte\)/, 'toucher une carte ouvre toujours son aperçu');
});

test('la grille mobile utilise cinq colonnes seulement en paysage', () => {
  const reglePaysage = css.match(/@media \(max-width: 960px\) and \(orientation: landscape\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(reglePaysage, 'un palier dédié au paysage existe');
  assert.match(reglePaysage, /\.rpg-atelier__cartes\s*\{[^}]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
  assert.match(reglePaysage, /grid-auto-rows: max-content;/, 'la hauteur des rangées suit toute la carte');
  assert.match(reglePaysage, /\.rpg-battle \.rpg-atelier__cartes \.rpg-atelier__carte\s*\{[^}]*display: block;/,
    'le conteneur de la carte ne rétrécit pas sa face en flex');
  assert.match(reglePaysage, /\.rpg-battle \.rpg-atelier__cartes \.rpg-atelier__carte-art\s*\{[^}]*aspect-ratio: 4 \/ 5;/,
    'la face conserve son format portrait complet');
  const cartePaysage = reglePaysage.match(/\.rpg-battle \.rpg-atelier__cartes \.rpg-atelier__carte\s*\{([^}]*)\}/)?.[1];
  assert.match(cartePaysage, /padding: 0 12px 54px;/,
    'les repères qui chevauchent les bords ont un espace dans chaque case');
  assert.match(cartePaysage, /overflow: visible;/,
    'le parent ne rogne pas les repères de coût, de couleur et d’effet');
  assert.match(reglePaysage, /\.rpg-atelier__carte-retrait \{ left: 5px; right: auto; \}/,
    'les commandes occupent le pied sans masquer l’illustration');
  assert.ok(css.indexOf('@media (max-width: 960px) and (orientation: landscape)')
    > css.indexOf('@media (max-width: 540px)'), 'la règle paysage l’emporte sur la règle tactile à deux colonnes');
  assert.match(css, /@media \(max-width: 540px\)[\s\S]*?\.rpg-atelier__cartes\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.rpg-atelier__cartes\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/, 'le bureau reste à quatre colonnes');
});

test('sur mobile : possédées par défaut, onglets persistants, sauvegarde depuis Cartes', async () => {
  const previousEnv = process.env.NODE_ENV;
  await build({ logLevel: 'error', build: {
    ssr: 'src/games/RpgDeckAtelier.jsx',
    outDir: 'node_modules/.cache/rpg-deck-atelier-mobile',
    emptyOutDir: true,
  } });
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;
  const dom = new JSDOM('<!doctype html><html lang="fr"><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/jeu/sablier-de-bab-el', pretendToBeVisual: true,
  });
  dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'SVGElement', 'Node', 'Event', 'MouseEvent'];
  const precedent = Object.fromEntries(globals.map((key) => [key, globalThis[key]]));
  for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    const { createRoot } = await import('react-dom/client');
    const { RpgDeckAtelier } = await import('../node_modules/.cache/rpg-deck-atelier-mobile/RpgDeckAtelier.js');
    const container = document.getElementById('root');
    const root = createRoot(container);
    const enregistrements = [];
    let refuserEnregistrement = true;
    await act(async () => root.render(React.createElement(RpgDeckAtelier, {
      cardIdsInitiaux: ['chien-du-guet'],
      collection: ['chien-du-guet', 'ashigaru-des-braises'],
      onOpenCardPreview: () => {},
      onEnregistrer: (deck) => {
        if (refuserEnregistrement) return { ok: false, raison: 'Échec de synchronisation' };
        enregistrements.push(deck);
        return { ok: true };
      },
      onAnnuler: () => {},
    })));
    const atelier = container.querySelector('.rpg-atelier');
    const onglets = container.querySelectorAll('.rpg-atelier__mobile-tabs button');
    const catalogue = container.querySelector('.rpg-atelier__cartes');
    const liste = container.querySelector('.rpg-atelier__liste');
    assert.equal(atelier.dataset.mobileView, 'cartes');
    assert.equal(onglets[0].getAttribute('aria-pressed'), 'true');
    assert.equal(container.querySelector('.rpg-atelier__toggles--fin button').getAttribute('aria-pressed'), 'true');
    assert.equal(container.querySelector('.rpg-atelier__carte.is-locked'), null, 'les cartes non possédées sont masquées au départ');
    assert.match(container.querySelector('.rpg-atelier__mobile-compteur').textContent, /1\/30/);
    const filtrePossedees = container.querySelector('.rpg-atelier__toggles--fin button');
    await act(async () => filtrePossedees.click());
    assert.ok(container.querySelector('.rpg-atelier__carte.is-locked'), 'les cartes verrouillées restent consultables à la demande');
    await act(async () => filtrePossedees.click());
    const filtres = container.querySelector('.rpg-atelier__toggle--filtres');
    await act(async () => filtres.click());
    assert.equal(filtres.getAttribute('aria-expanded'), 'true');
    await act(async () => [...container.querySelectorAll('#rpg-atelier-filtres-avances button')]
      .find((button) => button.textContent === 'Créat.').click());
    assert.equal(filtres.textContent.trim(), 'Filtres (1)');
    await act(async () => onglets[1].click());
    await act(async () => onglets[0].click());
    assert.equal(filtres.getAttribute('aria-expanded'), 'true', 'le panneau de filtres est conservé');
    await act(async () => [...container.querySelectorAll('#rpg-atelier-filtres-avances button')]
      .find((button) => button.textContent === 'Tous').click());

    catalogue.scrollTop = 190;
    await act(async () => onglets[1].click());
    assert.equal(atelier.dataset.mobileView, 'deck');
    liste.scrollTop = 120;
    await act(async () => onglets[0].click());
    assert.equal(catalogue.scrollTop, 190, 'la position dans la collection est conservée');
    await act(async () => onglets[1].click());
    assert.equal(liste.scrollTop, 120, 'la position dans le deck est conservée');
    await act(async () => onglets[0].click());

    const search = container.querySelector('.rpg-atelier__search input');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
      setter.call(search, 'Chien');
      search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    await act(async () => onglets[1].click());
    await act(async () => onglets[0].click());
    assert.equal(search.value, 'Chien', 'la recherche survit au changement de vue');
    await act(async () => container.querySelector('.rpg-atelier__carte-ajout').click());
    assert.match(container.querySelector('.rpg-atelier__mobile-compteur').textContent, /2\/30/);
    await act(async () => container.querySelector('.rpg-atelier__mobile-sauver').click());
    assert.equal(atelier.dataset.mobileView, 'deck', 'le nommage est accessible depuis la collection');
    assert.ok(container.querySelector('.rpg-atelier__nommage[role="dialog"]'));
    assert.equal(document.activeElement, container.querySelector('.rpg-atelier__nommage input'));
    await act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    assert.equal(container.querySelector('.rpg-atelier__nommage'), null, 'Échap ferme le nommage sans enregistrer');
    assert.equal(document.activeElement, container.querySelector('.rpg-atelier__mobile-sauver'), 'le focus revient au bouton Enregistrer');
    assert.equal(enregistrements.length, 0);
    await act(async () => container.querySelector('.rpg-atelier__mobile-sauver').click());
    await act(async () => container.querySelector('.rpg-atelier__nommage-actions .rpg-atelier__btn-done').click());
    assert.match(container.querySelector('.rpg-atelier__nommage [role="alert"]').textContent, /Échec de synchronisation/);
    refuserEnregistrement = false;
    await act(async () => container.querySelector('.rpg-atelier__nommage-actions .rpg-atelier__btn-done').click());
    assert.equal(enregistrements.length, 1);
    assert.equal(enregistrements[0].cardIds.length, 2);
    await act(async () => root.unmount());
  } finally {
    for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: precedent[key] });
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    dom.window.close();
  }
});
