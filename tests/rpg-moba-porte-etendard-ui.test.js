import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';

test('le joueur déclare un Vampire bloqueur puis joue le Porte-étendard',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;
 try {
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let duel;const initialiser=()=>(duel=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','sable','tenebres'],sorcierCouleurs:['braise'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,value)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(value));
  const click=async(button)=>{assert.ok(button,'commande présente');assert.equal(button.disabled,false,button.outerHTML);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
  duel.joueur.main=['vampire-des-braises'];duel.joueur.mana.braise=20;
  const b=rpgMobaJouerCreature(duel,'joueur','vampire-des-braises','left',0).entite;assert.ok(b);
  rpgFinDeTour(duel);duel.sorcier.main=['ronin-du-soleil-rouge'];duel.sorcier.mana.braise=20;
  const a=rpgMobaJouerCreature(duel,'sorcier','ronin-du-soleil-rouge','left',0).entite;assert.ok(a);a.ready=true;duel.sorcier.main=[];
  duel.joueur.main=['porte-etendard-de-leclipse'];Object.assign(duel.joueur.mana,{sable:20,tenebres:20});
  await act(async()=>root.render(React.createElement(Board,props)));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));assert.ok(duel.combatDeclare);
  await click(document.querySelector(`[data-moba-entity="${b.id}"] button`));
  await click(text('.moba__controls button','Déclarer les bloqueurs'));
  assert.deepEqual(duel.combatDeclare.blocages,{[a.id]:[b.id]});
  await click(text('.moba__card','Porte-étendard de l’éclipse'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  assert.equal(duel.mobaCreatureEnAttente?.carteId,'porte-etendard-de-leclipse');
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
  assert.equal(b.pvMax,4);assert.ok(duel.joueur.creatures.some(e=>e.carteId==='porte-etendard-de-leclipse'));
  await click(text('.moba__controls button','Résoudre le combat'));assert.equal(duel.combatDeclare,null);
 } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});

test('l’IA verrouille ses blocs, joue son Porte-étendard et rend la réponse au joueur',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;
 try {
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour,rpgChoisirCouleurMana}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let duel;const initialiser=()=>(duel=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise'],sorcierCouleurs:['braise','sable','tenebres'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,value)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(value));
  const click=async(button)=>{assert.ok(button,'commande présente');assert.equal(button.disabled,false,button.outerHTML);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));
  rpgFinDeTour(duel);if(duel.sorcier.manaChoixEnAttente)rpgChoisirCouleurMana(duel,'sorcier','braise');
  duel.sorcier.main=['vampire-des-braises'];duel.sorcier.mana.braise=20;
  const b=rpgMobaJouerCreature(duel,'sorcier','vampire-des-braises','left',0).entite;assert.ok(b);
  rpgFinDeTour(duel);duel.joueur.main=['ronin-du-soleil-rouge'];duel.joueur.mana.braise=20;
  const a=rpgMobaJouerCreature(duel,'joueur','ronin-du-soleil-rouge','left',0).entite;assert.ok(a);a.ready=true;duel.joueur.main=[];
  duel.sorcier.main=['porte-etendard-de-leclipse'];Object.assign(duel.sorcier.mana,{sable:20,tenebres:20});
  await act(async()=>root.render(React.createElement(Board,props)));
  await click(document.querySelector(`[data-moba-entity="${a.id}"] button`));await click(text('.moba__controls button','Déclarer'));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
  assert.deepEqual(duel.combatDeclare?.blocages,{[a.id]:[b.id]});
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
  assert.equal(duel.mobaCreatureEnAttente?.carteId,'porte-etendard-de-leclipse');
  await click(text('.moba__controls button','Passer et laisser entrer'));
  assert.ok(duel.sorcier.creatures.some(e=>e.carteId==='porte-etendard-de-leclipse'));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));assert.equal(duel.combatDeclare,null);
 } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
