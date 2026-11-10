import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

test('Éclipse IA : le joueur répond à son arrivée ciblée puis le combat reprend', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;
    const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise','eau'], sorcierCouleurs: ['braise','sable','tenebres'], rng: () => .5 }));
    const props = { initialiser, onQuitter: () => {} };
    root = createRoot(document.getElementById('root')); await act(async () => root.render(React.createElement(Board, props)));
    const text = (selector, value) => [...document.querySelectorAll(selector)].find((b) => b.textContent.includes(value));
    const click = async (button) => { assert.ok(button, 'commande présente'); assert.equal(button.disabled, false, button.outerHTML); await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); };
    const tick = async () => act(async () => new Promise((resolve) => setTimeout(resolve, 550)));
    await click(document.querySelector('.moba__mulligan .moba__primary')); await click(text('.moba__choice button','braise'));
    duel.joueur.main=['ronin-du-soleil-rouge']; duel.joueur.mana.braise=20;
    const attacker=rpgMobaJouerCreature(duel,'joueur','ronin-du-soleil-rouge','left',0).entite; assert.ok(attacker); attacker.ready=true;
    duel.joueur.main=['parade-du-verre']; duel.joueur.mana.eau=10;
    duel.sorcier.main=['eclipse-silencieuse']; Object.assign(duel.sorcier.mana,{sable:10,tenebres:10});
    await act(async () => root.render(React.createElement(Board, props)));
    await click(document.querySelector(`[data-moba-entity="${attacker.id}"] button`)); await click(text('.moba__controls button','Déclarer'));
    await tick(); assert.equal(duel.mobaCreatureEnAttente?.carteId,'eclipse-silencieuse');
    await click(text('.moba__controls button','Passer et laisser entrer'));
    assert.equal(duel.arriveeEnAttente?.cote,'sorcier');
    await tick(); assert.equal(duel.effetCreatureEnAttente?.cote,'sorcier');
    assert.match(document.querySelector('.moba__controls').textContent,/Réponse à la capacité/);
    await click(text('.moba__card','Parade de verre'));
    await click(document.querySelector(`[data-moba-entity="${attacker.id}"] button`));
    await click(text('.moba__controls button','Passer et résoudre l’effet'));
    assert.equal(attacker.atk,3); assert.ok(duel.combatDeclare); assert.equal(duel.fenetreReponse,true);
    assert.ok(text('.moba__controls button','Résoudre le combat'));
  } finally {
    if (root) await act(async () => root.unmount()); await server.close(); dom.window.close();
    globalThis.window=oldWindow; globalThis.document=oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Veilleuse humaine : choisir une case et une cible pendant l’attaque de l’IA', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow=globalThis.window, oldDocument=globalThis.document;
  globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  let root;
  try {
    const { default: Board }=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature }=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { rpgFinDeTour, rpgChoisirCouleurMana }=await server.ssrLoadModule('/src/games/rpgDuel.js');
    let duel;
    const initialiser=()=> (duel=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','neige','tenebres'],sorcierCouleurs:['braise','neige'],rng:()=>.5}));
    const props={initialiser,onQuitter:()=>{}}; root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(React.createElement(Board,props)));
    const text=(selector,value)=>[...document.querySelectorAll(selector)].find(b=>b.textContent.includes(value));
    const click=async(button)=>{assert.ok(button,'commande présente'); assert.equal(button.disabled,false,button.outerHTML); await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const tick=async()=>act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
    await click(document.querySelector('.moba__mulligan .moba__primary')); await click(text('.moba__choice button','braise'));
    rpgFinDeTour(duel); if(duel.sorcier.manaChoixEnAttente) assert.ok(rpgChoisirCouleurMana(duel,'sorcier','braise').ok);
    duel.sorcier.mana.braise=20; duel.sorcier.main=['ronin-du-soleil-rouge'];
    const attacker=rpgMobaJouerCreature(duel,'sorcier','ronin-du-soleil-rouge','left',0).entite; assert.ok(attacker); attacker.ready=true; duel.sorcier.main=[];
    duel.joueur.main=['veilleuse-de-la-lune-givree']; Object.assign(duel.joueur.mana,{neige:10,tenebres:10});
    await act(async()=>root.render(React.createElement(Board,props))); await tick(); assert.ok(duel.combatDeclare);
    await click(text('.moba__card','Veilleuse de la lune givrée'));
    await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));
    assert.equal(duel.mobaCreatureEnAttente?.cote,'joueur'); await tick();
    assert.equal(duel.arriveeEnAttente?.cote,'joueur');
    await click(document.querySelector(`[data-moba-entity="${attacker.id}"] button`));
    assert.ok(attacker.gelToursRestants>0); assert.ok(duel.combatDeclare);
    assert.ok(text('.moba__controls button','Résoudre le combat'));
  } finally {
    if(root) await act(async()=>root.unmount()); await server.close(); dom.window.close();
    globalThis.window=oldWindow; globalThis.document=oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Sentinelle IA : la liste des attaquants est mise à jour après la mort ciblée', async () => {
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  const oldWindow=globalThis.window,oldDocument=globalThis.document;
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  let root;
  try {
    const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
    let duel;const initialiser=()=>(duel=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','neige'],sorcierCouleurs:['braise','sable','tenebres'],rng:()=>.5}));
    const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const text=(sel,value)=>[...document.querySelectorAll(sel)].find(b=>b.textContent.includes(value));
    const click=async(button)=>{assert.ok(button,'commande présente');assert.equal(button.disabled,false,button.outerHTML);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
    const tick=async()=>act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
    await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
    duel.joueur.mana.braise=20;duel.joueur.main=['ronin-du-soleil-rouge','ashigaru-des-braises'];
    const a=rpgMobaJouerCreature(duel,'joueur','ronin-du-soleil-rouge','left',0).entite;
    const b=rpgMobaJouerCreature(duel,'joueur','ashigaru-des-braises','left',1).entite;assert.ok(a&&b);a.ready=true;b.ready=true;duel.joueur.main=[];
    duel.sorcier.main=['sentinelle-des-sables'];Object.assign(duel.sorcier.mana,{sable:10,tenebres:10});
    await act(async()=>root.render(React.createElement(Board,props)));
    await click(document.querySelector(`[data-moba-entity="${a.id}"] button`));await click(document.querySelector(`[data-moba-entity="${b.id}"] button`));
    await click(text('.moba__controls button','Déclarer'));await tick();
    assert.equal(duel.mobaCreatureEnAttente?.carteId,'sentinelle-des-sables');
    await click(text('.moba__controls button','Passer et laisser entrer'));await tick();
    assert.equal(duel.combatDeclare?.attaquants.length,1);
    await tick();assert.equal(duel.combatDeclare,null);assert.doesNotMatch(document.querySelector('.moba__ai-status').textContent,/Réessayer/);
  } finally {
    if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
    globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('Traqueur humain : une créature qui n’attaque pas peut être ciblée dans la même voie',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;try{
  const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
  const {rpgMobaNouveauDuel,rpgMobaJouerCreature}=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');
  const {rpgFinDeTour,rpgChoisirCouleurMana}=await server.ssrLoadModule('/src/games/rpgDuel.js');
  let d;const initialiser=()=>(d=rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','eau','tenebres'],sorcierCouleurs:['braise','sable'],rng:()=>.5}));
  const props={initialiser,onQuitter:()=>{}};root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
  const text=(sel,value)=>[...document.querySelectorAll(sel)].find(b=>b.textContent.includes(value));
  const click=async(b)=>{assert.ok(b,'commande présente');assert.equal(b.disabled,false,b.outerHTML);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  const tick=async()=>act(async()=>new Promise(r=>setTimeout(r,550)));
  await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
  rpgFinDeTour(d);if(d.sorcier.manaChoixEnAttente)rpgChoisirCouleurMana(d,'sorcier','braise');
  d.sorcier.main=['ronin-du-soleil-rouge','ashigaru-des-braises','gardienne-des-portes-de-sable'];Object.assign(d.sorcier.mana,{braise:20,sable:20});
  const a=rpgMobaJouerCreature(d,'sorcier','ronin-du-soleil-rouge','left',0).entite;
  const cible=rpgMobaJouerCreature(d,'sorcier','gardienne-des-portes-de-sable','left',1).entite;
  const b=rpgMobaJouerCreature(d,'sorcier','ashigaru-des-braises','right',0).entite;assert.ok(a&&b&&cible);a.ready=true;b.ready=true;cible.attaquee=true;d.sorcier.main=[];
  d.joueur.main=['traqueur-des-nuits-sans-lune'];Object.assign(d.joueur.mana,{eau:20,tenebres:20});
  await act(async()=>root.render(React.createElement(Board,props)));await tick();assert.equal(d.combatDeclare?.attaquants.length,2);assert.ok(!d.combatDeclare.attaquants.includes(cible.id));
  await click(text('.moba__card','Traqueur des nuits sans lune'));await click(document.querySelector('.moba__lane[aria-label="Voie gauche"] .moba__side--joueur .moba__slot.is-empty'));await tick();
  assert.equal(d.arriveeEnAttente?.carteId,'traqueur-des-nuits-sans-lune');await click(document.querySelector(`[data-moba-entity="${cible.id}"] button`));
  assert.ok(!d.sorcier.creatures.includes(cible));assert.equal(d.combatDeclare?.attaquants.length,2);
 }finally{if(root)await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
