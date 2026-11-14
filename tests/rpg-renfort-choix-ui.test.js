import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('MOBA : les trois cartes sont montrées, une carte inéligible est désactivée et le choix invoque', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await vite.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaLancerMagie, rpgMobaPasserSort } = await vite.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { RPG_RENDU_MOBA } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let duel;
    const props = { initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 })), onQuitter: () => {}, rendu: { TableCard: RPG_RENDU_MOBA.TableCard } };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    duel.joueur.main = ['appel-des-marees']; duel.joueur.deck = ['chien-du-guet','loup-des-neiges','trait-de-braise','chacal-du-seuil'];
    assert.ok(rpgMobaLancerMagie(duel,'joueur','appel-des-marees',null,null,null,{ ouvrirReponse: true }).ok);
    assert.ok(rpgMobaPasserSort(duel,'sorcier').ok);
    await act(async () => root.render(React.createElement(Board, props)));
    const modal = document.querySelector('[aria-label="Choix de carte"]'); assert.ok(modal);
    const boutons = [...modal.querySelectorAll('.moba__mulligan-card')]; assert.equal(boutons.length, 3);
    assert.match(boutons[0].textContent, /Chacal/i); assert.equal(boutons[1].disabled, true);
    await act(async () => boutons[2].dispatchEvent(new dom.window.MouseEvent('click',{ bubbles: true })));
    assert.equal(duel.joueur.creatures[0].carteId,'loup-des-neiges'); assert.equal(duel.mobaRechercheEnAttente,null);
    assert.equal(document.querySelector('[aria-label="Choix de carte"]'),null);
  } finally {
    if (root) await act(async () => root.unmount()); await vite.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

for (const camp of ['joueur', 'sorcier']) test(`PvP : le camp ${camp} choisit avec une intention serveur`, async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/jeu/sablier-de-bab-el/defi/ABCDEF12', pretendToBeVisual: true });
  const oldWindow=globalThis.window, oldDocument=globalThis.document;
  globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator, configurable:true});
  for (const name of ['HTMLElement','SVGElement','Element','Node','CustomEvent','Event','MouseEvent']) globalThis[name]=dom.window[name];
  globalThis.PointerEvent=dom.window.MouseEvent; globalThis.localStorage=dom.window.localStorage; globalThis.sessionStorage=dom.window.sessionStorage;
  globalThis.requestAnimationFrame=(cb)=>setTimeout(()=>cb(Date.now()),16); globalThis.cancelAnimationFrame=clearTimeout;
  globalThis.ResizeObserver=class { observe(){} unobserve(){} disconnect(){} };
  dom.window.matchMedia=()=>({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  dom.window.scrollTo=()=>{}; dom.window.HTMLMediaElement.prototype.play=()=>Promise.resolve(); dom.window.HTMLMediaElement.prototype.pause=()=>{}; dom.window.HTMLMediaElement.prototype.load=()=>{};
  const vite=await createServer({server:{middlewareMode:true,hmr:false},ssr:{external:['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime']},appType:'custom',logLevel:'silent'});
  let root;
  try {
    const {default:Board}=await vite.ssrLoadModule('/src/games/RpgPvpBoard.jsx');
    const {rpgNouveauDuel}=await vite.ssrLoadModule('/src/games/rpgDuel.js');
    const {rpgPvpVue,rpgPvpAppliquer,rpgPvpBrancherHasard}=await vite.ssrLoadModule('/src/games/rpgPvp.js');
    const d=rpgNouveauDuel({joueurDeck:Array(30).fill('chien-du-guet'),sorcierDeck:Array(30).fill('chien-du-guet'),modeMana:'essai',pvp:true,rng:()=>.5});
    d.mulliganFait={joueur:true,sorcier:true};d.manaEssaiDemarre=true;d.joueur.manaChoixEnAttente=null;d.sorcier.manaChoixEnAttente=null;
    d.tour=camp; d[camp].main=['appel-des-marees'];d[camp].deck=['chien-du-guet','loup-des-neiges','trait-de-braise','chacal-du-seuil'];rpgPvpBrancherHasard(d,12);
    assert.ok(rpgPvpAppliquer(d,camp,{type:'jouer-carte',carteId:'appel-des-marees'}).ok);
    const intentions=[];
    const props={vue:rpgPvpVue(d,camp), siege:camp, code:'ABCDEF12', statut:'en_cours',onQuitter(){},onIntention:async intention=>{intentions.push(intention);const r=rpgPvpAppliquer(d,camp,intention);assert.ok(r.ok,JSON.stringify(r));return {etat:rpgPvpVue(d,camp),seq:1};}};
    root=createRoot(document.getElementById('root')); await act(async()=>root.render(React.createElement(Board,props)));
    const modal=document.querySelector('[aria-labelledby="rpg-renfort-choix-titre"]');assert.ok(modal);
    const boutons=[...modal.querySelectorAll('.rpg-renfort-choix__carte')];assert.equal(boutons.length,3);assert.equal(boutons[1].disabled,true);
    await act(async()=>boutons[2].click());
    assert.equal(intentions[0].type,'choisir-renfort');assert.equal(d[camp].creatures[0].carteId,'loup-des-neiges');
    assert.equal(document.querySelector('[aria-labelledby="rpg-renfort-choix-titre"]'),null);
  } finally {
    if(root) await act(async()=>root.unmount()); await vite.close();dom.window.close();
    globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
