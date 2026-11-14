import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

for (const attaquant of ['joueur', 'sorcier']) test(`PvP : une ancienne attaque de ${attaquant} retrouve sa table de blocage à la reconnexion`, async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/jeu/sablier-de-bab-el/defi/ABCDEF12', pretendToBeVisual: true });
  const oldWindow=globalThis.window, oldDocument=globalThis.document;
  globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator, configurable:true});
  for (const name of ['HTMLElement','SVGElement','Element','Node','CustomEvent','Event','MouseEvent']) globalThis[name]=dom.window[name];
  globalThis.PointerEvent=dom.window.MouseEvent; globalThis.localStorage=dom.window.localStorage; globalThis.sessionStorage=dom.window.sessionStorage;
  globalThis.requestAnimationFrame=(cb)=>setTimeout(()=>cb(Date.now()),16); globalThis.cancelAnimationFrame=clearTimeout;
  globalThis.ResizeObserver=class { observe(){} unobserve(){} disconnect(){} };
  dom.window.matchMedia=()=>({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  dom.window.scrollTo=()=>{}; dom.window.HTMLMediaElement.prototype.play=()=>Promise.resolve();dom.window.HTMLMediaElement.prototype.pause=()=>{};dom.window.HTMLMediaElement.prototype.load=()=>{};
  const vite=await createServer({server:{middlewareMode:true,hmr:false},ssr:{external:['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime']},appType:'custom',logLevel:'silent'});
  let root;
  try {
    const {default:Board}=await vite.ssrLoadModule('/src/games/RpgPvpBoard.jsx');
    const {rpgNouveauDuel,rpgJouerCreature}=await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const {rpgPvpVue,rpgPvpAppliquer}=await vite.ssrLoadModule('/src/games/rpgPvp.js');
    const d=rpgNouveauDuel({joueurDeck:Array(30).fill('chien-du-guet'),sorcierDeck:Array(30).fill('chien-du-guet'),modeMana:'essai',pvp:true,rng:()=>.5});
    d.mulliganFait={joueur:true,sorcier:true};d.manaEssaiDemarre=true;
    for(const side of ['joueur','sorcier']) { d.tour=side;d[side].manaChoixEnAttente=null;d[side].main=['chien-du-guet'];const r=rpgJouerCreature(d,side,'chien-du-guet');assert.ok(r.ok);r.entite.ready=true;r.entite.malInvocation=false; }
    const defenseur=attaquant==='joueur'?'sorcier':'joueur';
    d.tour=attaquant;d.phase='blocage';d.fenetreReponse=true;
    const a=d[attaquant].creatures[0];
    d.combatDeclare={cote:attaquant,attaquants:[a.id],ciblesAttaque:{},bannieresAppliquees:true};
    const intentions=[];
    const props={vue:rpgPvpVue(d,defenseur),siege:defenseur,seq:0,code:'ABCDEF12',statut:'en_cours',onQuitter(){},onIntention:async intention=>{
      intentions.push(intention);const result=rpgPvpAppliquer(d,defenseur,intention);assert.ok(result.ok,JSON.stringify(result));return {ok:true,etat:rpgPvpVue(d,defenseur),seq:intentions.length};
    }};
    root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
    const cartes=()=>[...document.querySelectorAll('.rpg-card[data-card-id="chien-du-guet"]')];
    const bloqueur=cartes().find(e=>e.closest('.card-row--equipe')); const carteAttaquante=cartes().find(e=>e.closest('.card-row--ennemi'));
    assert.ok(bloqueur);assert.ok(carteAttaquante);
    await act(async()=>bloqueur.click());await act(async()=>carteAttaquante.click());
    assert.equal(intentions[0]?.type,'preparer-blocage');
    const bouton=document.querySelector('.rpg-btn--resolve-combat');assert.ok(bouton);assert.match(bouton.textContent,/Déclarer les bloqueurs/);
    await act(async()=>bouton.click());
    await act(async()=>document.querySelector('.rpg-btn--resolve-combat').click());
    assert.equal(intentions.at(-1).type,'bloquer');assert.equal(d.combatDeclare,null);assert.equal(d.phase,'principale');
    assert.equal(d.joueur.creatures.length,0);assert.equal(d.sorcier.creatures.length,0);
  } finally {
    if(root) await act(async()=>root.unmount());await vite.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
