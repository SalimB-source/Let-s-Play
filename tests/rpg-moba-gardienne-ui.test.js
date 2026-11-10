import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';

test('le joueur protège une créature ciblée par un sort annoncé par l’IA',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;try{
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let d;const initialiser=()=>(d=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','sable','tenebres'],sorcierCouleurs:['braise'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,val)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(val));
  const click=async(b)=>{assert.ok(b,'commande présente');assert.equal(b.disabled,false,b.outerHTML);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
  d.joueur.main=['ronin-du-soleil-rouge'];d.joueur.mana.braise=20;const cible=rpgMobaJouerCreature(d,'joueur','ronin-du-soleil-rouge','left',0).entite;assert.ok(cible);
  rpgFinDeTour(d);d.sorcier.main=['trait-de-braise'];d.sorcier.mana.braise=20;
  d.joueur.main=['gardienne-du-croissant'];Object.assign(d.joueur.mana,{sable:20,tenebres:20});
  await act(async()=>root.render(React.createElement(Board,props)));
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.equal(d.mobaSortEnAttente?.cibleId,cible.id);
  await click(text('.moba__card','Gardien au croissant'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  assert.equal(d.mobaCreatureEnAttente?.carteId,'gardienne-du-croissant');
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.ok(d.arriveeEnAttente);
  await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.equal(d.mobaSortEnAttente?.cibleId,cible.id);assert.ok(text('.moba__controls button','Passer et résoudre le sort'));
  await click(text('.moba__controls button','Passer et résoudre le sort'));
  assert.ok(d.joueur.creatures.includes(cible));assert.equal(cible.bouclier,0);
 }finally{if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('le joueur contre la Gardienne IA et son sort reprend',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;try{
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour,rpgChoisirCouleurMana}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let d;const initialiser=()=>(d=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','eau'],sorcierCouleurs:['braise','sable','tenebres'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,val)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(val));
  const click=async(b)=>{assert.ok(b,'commande présente');assert.equal(b.disabled,false,b.outerHTML);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
  rpgFinDeTour(d);if(d.sorcier.manaChoixEnAttente)rpgChoisirCouleurMana(d,'sorcier','braise');
  d.sorcier.main=['ronin-du-soleil-rouge'];d.sorcier.mana.braise=20;const cible=rpgMobaJouerCreature(d,'sorcier','ronin-du-soleil-rouge','left',0).entite;assert.ok(cible);
  rpgFinDeTour(d);if(d.joueur.manaChoixEnAttente)rpgChoisirCouleurMana(d,'joueur','braise');
  d.sorcier.main=['gardienne-du-croissant'];Object.assign(d.sorcier.mana,{sable:20,tenebres:20});
  d.joueur.main=['trait-de-braise','ecueil'];Object.assign(d.joueur.mana,{braise:20,eau:20});
  await act(async()=>root.render(React.createElement(Board,props)));
  await click(text('.moba__card','Trait de braise'));await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.equal(d.mobaCreatureEnAttente?.carteId,'gardienne-du-croissant');
  await click(text('.moba__card','Écueil'));assert.equal(d.mobaSortEnAttente?.cibleId,cible.id);
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.ok(!d.sorcier.creatures.includes(cible));
 }finally{if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('le joueur répond à une capacité ciblée annoncée avec sa Gardienne',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;try{
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour,rpgChoisirCouleurMana}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let d;const initialiser=()=>(d=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','sable','tenebres'],sorcierCouleurs:['braise','sable','tenebres'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,val)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(val));
  const click=async(b)=>{assert.ok(b,'commande présente');assert.equal(b.disabled,false,b.outerHTML);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
  d.joueur.main=['ronin-du-soleil-rouge'];d.joueur.mana.braise=20;const cible=rpgMobaJouerCreature(d,'joueur','ronin-du-soleil-rouge','left',0).entite;
  rpgFinDeTour(d);if(d.sorcier.manaChoixEnAttente)rpgChoisirCouleurMana(d,'sorcier','braise');
  d.sorcier.main=['eclipse-silencieuse'];Object.assign(d.sorcier.mana,{sable:20,tenebres:20});
  d.joueur.main=['gardienne-du-croissant'];Object.assign(d.joueur.mana,{sable:20,tenebres:20});
  await act(async()=>root.render(React.createElement(Board,props)));
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.equal(d.mobaCreatureEnAttente?.carteId,'eclipse-silencieuse');
  await click(text('.moba__controls button','Passer et laisser entrer'));
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.equal(d.effetCreatureEnAttente?.cibleId,cible.id);
  await click(text('.moba__card','Gardien au croissant'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.ok(d.arriveeEnAttente);
  await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.equal(d.effetCreatureEnAttente?.cibleId,cible.id);assert.ok(text('.moba__controls button','Passer et résoudre l’effet'));
  await click(text('.moba__controls button','Passer et résoudre l’effet'));assert.equal(cible.atk,3);assert.equal(cible.bouclier,0);
 }finally{if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
