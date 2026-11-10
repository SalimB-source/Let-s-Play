import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';

test('en fin du tour adverse, jouer Sanguinaire et reprendre la fin du tour',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;try{
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour,rpgChoisirCouleurMana}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let d;const initialiser=()=>(d=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','tenebres'],sorcierCouleurs:['braise'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,val)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(val));
  const click=async(b)=>{assert.ok(b,'commande présente');assert.equal(b.disabled,false,b.outerHTML);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
  rpgFinDeTour(d);if(d.sorcier.manaChoixEnAttente)rpgChoisirCouleurMana(d,'sorcier','braise');
  d.sorcier.main=['gardienne-des-portes-de-sable'];d.sorcier.mana.sable=20;const cible=rpgMobaJouerCreature(d,'sorcier','gardienne-des-portes-de-sable','left',0).entite;cible.pv=3;cible.def=3;
  d.sorcier.main=[];d.joueur.main=['sanguinaire-des-dunes'];Object.assign(d.joueur.mana,{braise:20,tenebres:20});
  await act(async()=>root.render(React.createElement(Board,props)));
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.equal(d.finDeTour?.cote,'sorcier');
  await click(text('.moba__card','Sanguinaire des dunes'));
  await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
  assert.equal(d.mobaCreatureEnAttente?.carteId,'sanguinaire-des-dunes');
  await act(async()=>new Promise(r=>setTimeout(r,550)));assert.equal(cible.pv,1);assert.equal(d.finDeTour?.cote,'sorcier');
  await click(text('.moba__controls button','Passer'));assert.equal(d.tour,'joueur');
 }finally{if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
