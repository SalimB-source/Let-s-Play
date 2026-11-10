import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';

test('le joueur contre le Sorcier IA puis retrouve la réponse à sa créature',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;
 try {
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  let duel;
  const initialiser=()=>(duel=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','eau'],sorcierCouleurs:['braise','eau','tenebres'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,value)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(value));
  const click=async(button)=>{assert.ok(button,'commande présente');assert.equal(button.disabled,false,button.outerHTML);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));
  await click(text('.moba__choice button','braise'));
  duel.joueur.main=['ronin-du-soleil-rouge','ecueil'];Object.assign(duel.joueur.mana,{braise:20,eau:10});
  duel.sorcier.main=['sorcier-du-ressac-noir'];Object.assign(duel.sorcier.mana,{eau:10,tenebres:10});
  await act(async()=>root.render(React.createElement(Board,props)));
  await click(text('.moba__card','Rōnin du Soleil rouge'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
  assert.equal(duel.mobaCreatureEnAttente?.carteId,'sorcier-du-ressac-noir');
  await click(text('.moba__card','Écueil'));
  assert.equal(duel.mobaCreatureEnAttente?.carteId,'ronin-du-soleil-rouge');
  assert.ok(text('.moba__controls button','Passer et laisser entrer'));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
  assert.ok(duel.joueur.creatures.some(e=>e.carteId==='ronin-du-soleil-rouge'));
 } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('le joueur répond à une créature IA avec le Sorcier',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;
 try {
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour,rpgChoisirCouleurMana}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let duel;const initialiser=()=>(duel=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','eau','tenebres'],sorcierCouleurs:['braise'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,value)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(value));
  const click=async(button)=>{assert.ok(button,'commande présente');assert.equal(button.disabled,false,button.outerHTML);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
  rpgFinDeTour(duel); if(duel.sorcier.manaChoixEnAttente)rpgChoisirCouleurMana(duel,'sorcier','braise');
  duel.sorcier.main=['ashigaru-des-braises'];duel.sorcier.mana.braise=20;
  duel.joueur.main=['sorcier-du-ressac-noir'];Object.assign(duel.joueur.mana,{eau:10,tenebres:10});
  await act(async()=>root.render(React.createElement(Board,props)));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
  assert.equal(duel.mobaCreatureEnAttente?.cote,'sorcier');
  await click(text('.moba__card','Sorcier du ressac noir'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  assert.equal(duel.mobaCreatureEnAttente?.carteId,'sorcier-du-ressac-noir');
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
  assert.ok(duel.joueur.creatures.some(e=>e.carteId==='sorcier-du-ressac-noir'));
  assert.ok(duel.sorcier.cimetiere.includes('ashigaru-des-braises'));
 } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
