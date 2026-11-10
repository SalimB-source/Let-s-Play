import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MOBA_DECKS } from '../src/games/rpgMobaLocal.js';
import { MOBA_DECKS_TOURS, MOBA_DECKS_TOURS_TOTAL } from '../src/games/rpgMobaDecks.js';

test('les decks sont choisis par des boosters 3D ; seuls les decks compatibles peuvent démarrer', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document, random = Math.random;
  dom.window.HTMLElement.prototype.attachEvent = () => {}; dom.window.HTMLElement.prototype.detachEvent = () => {};
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true; Math.random = () => 0;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const valide = { ...MOBA_DECKS[0], id: 'maison-valide', name: 'Mon deck créé' };
    const invalide = { ...valide, id: 'maison-invalide', name: 'Deck incomplet', cardIds: [] };
    root = createRoot(document.getElementById('root'));
    const props = { onQuitter: () => {}, decksMaison: [valide, invalide] };
    await act(async () => root.render(React.createElement(Board, props)));
    const button = (name) => [...document.querySelectorAll('button')].find((item) => item.textContent.includes(name));
    const initial = button(MOBA_DECKS[0].name), maison = button('Mon deck créé'), indisponible = button('Deck incomplet');
    assert.equal(document.querySelectorAll('[aria-label="Decks MOBA"] .moba__booster').length, MOBA_DECKS.length);
    assert.equal(initial.getAttribute('aria-pressed'), 'true'); assert.equal(maison.disabled, false); assert.equal(indisponible.disabled, true);
    assert.match(indisponible.closest('.moba__booster-item').textContent, /30 cartes exigées/);
    assert.ok(initial.querySelector('.moba__booster-face img')); assert.ok(initial.querySelector('.moba__booster-edge'));
    assert.match(document.querySelector('.moba__opponent-deck').textContent, new RegExp(`${MOBA_DECKS_TOURS.length} / ${MOBA_DECKS_TOURS_TOTAL}`));
    assert.match(document.querySelector('.moba__opponent-deck').textContent, /aléatoire/i);
    await act(async () => maison.click());
    assert.equal(maison.getAttribute('aria-pressed'), 'true'); assert.equal(initial.getAttribute('aria-pressed'), 'false');
    assert.match(document.querySelector('.moba__selected-deck').textContent, /Mon deck créé/);
    // Un deck maison peut devenir invalide pendant que l'écran est ouvert.
    await act(async () => root.render(React.createElement(Board, { ...props, decksMaison: [{ ...valide, cardIds: [] }, invalide] })));
    assert.equal(button('Commencer le duel').disabled, true); assert.match(document.querySelector('[role="alert"]').textContent, /30 cartes exigées/);
    await act(async () => initial.click());
    assert.equal(button('Commencer le duel').disabled, false);
    await act(async () => button('Commencer le duel').click());
    assert.ok(document.querySelector('[aria-label="Votre main de départ"]'));
    assert.deepEqual([...document.querySelectorAll('.moba__health-bar')].map((bar) => bar.getAttribute('aria-valuemax')), ['20','20','10','10','20','20']);
  } finally {
    if (root) await act(async () => root.unmount()); Math.random = random; await server.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('l’atelier conserve une composition personnalisée sélectionnée et permet de revenir à un autre paquet', async () => {
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;
 dom.window.HTMLElement.prototype.attachEvent=()=>{};dom.window.HTMLElement.prototype.detachEvent=()=>{};
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;try{
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(Board,{onQuitter:()=>{}})));
  const button=(name)=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(name));
  await act(async()=>button('Personnaliser le deck du joueur').click());assert.ok(document.querySelector('[aria-label="Composer le deck de Vous"]'));
  const save=button('Utiliser ce deck');assert.equal(save.disabled,false);await act(async()=>save.click());
  assert.equal(button('Deck personnalisé').getAttribute('aria-pressed'),'true');assert.match(document.querySelector('.moba__selected-deck').textContent,/Deck personnalisé/);
  await act(async()=>button(MOBA_DECKS[1].name).click());assert.equal(button(MOBA_DECKS[1].name).getAttribute('aria-pressed'),'true');assert.equal(button('Deck personnalisé'),undefined);
 }finally{if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
