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
    duel.joueur.main = ['appel-des-marees']; duel.joueur.deck = ['chien-du-guet','cotre-de-course','trait-de-braise','chacal-du-seuil'];
    assert.ok(rpgMobaLancerMagie(duel,'joueur','appel-des-marees',null,null,null,{ ouvrirReponse: true }).ok);
    assert.ok(rpgMobaPasserSort(duel,'sorcier').ok);
    await act(async () => root.render(React.createElement(Board, props)));
    const modal = document.querySelector('[aria-label="Choix de carte"]'); assert.ok(modal);
    const boutons = [...modal.querySelectorAll('.moba__mulligan-card')]; assert.equal(boutons.length, 3);
    assert.match(boutons[0].textContent, /Chacal/i); assert.equal(boutons[1].disabled, true);
    await act(async () => boutons[2].dispatchEvent(new dom.window.MouseEvent('click',{ bubbles: true })));
    assert.equal(duel.joueur.creatures[0].carteId,'cotre-de-course'); assert.equal(duel.mobaRechercheEnAttente,null);
    assert.equal(document.querySelector('[aria-label="Choix de carte"]'),null);
    for (const [sort, valide, nonValide, texte] of [
      ['veille-des-braises', 'veilleur-des-cendres', 'hatamoto-des-cendres', /Braise de coût 3.*détruite à la fin du tour/],
      ['ralliement-des-neiges', 'ifrit-des-ergs', 'dune-marchante', /créature de coût 5 dans votre main/],
    ]) {
      duel.joueur.main = [sort, valide, nonValide];
      assert.ok(rpgMobaLancerMagie(duel, 'joueur', sort, null, null, null, { ouvrirReponse: true }).ok);
      assert.ok(rpgMobaPasserSort(duel, 'sorcier').ok);
      await act(async () => root.render(React.createElement(Board, props)));
      const panneau = document.querySelector('[aria-label="Choix de carte"]'); assert.ok(panneau);
      assert.match(panneau.textContent, texte);
      const choix = [...panneau.querySelectorAll('.moba__mulligan-card')];
      assert.equal(choix.length, 1); assert.match(choix[0].textContent, new RegExp(valide === 'ifrit-des-ergs' ? 'Ifrit furtif' : 'Veilleur des cendres', 'i'));
      await act(async () => choix[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
      assert.ok(duel.joueur.creatures.some(c => c.carteId === valide));
      assert.ok(duel.joueur.main.includes(nonValide));
    }
    duel.joueur.main = ['reanimation']; duel.joueur.cimetiere = ['ureus-du-seuil', 'viking-des-neiges'];
    assert.ok(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, { emplacementReanimation: 1, ouvrirReponse: true }).ok);
    assert.ok(rpgMobaPasserSort(duel, 'sorcier').ok);
    await act(async () => root.render(React.createElement(Board, props)));
    const panneau = document.querySelector('[aria-label="Choix de carte"]'); assert.ok(panneau);
    assert.match(panneau.textContent, /cimetière/);
    const choix = [...panneau.querySelectorAll('.moba__mulligan-card')];
    assert.equal(choix.length, 2);
    const ureus = choix.find(c => /Uræus du seuil/.test(c.textContent)); assert.ok(ureus);
    await act(async () => ureus.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    assert.ok(duel.joueur.creatures.some(c => c.carteId === 'ureus-du-seuil'));
    assert.ok(duel.joueur.cimetiere.includes('viking-des-neiges'));
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
    d.tour=camp; d[camp].main=['appel-des-marees'];d[camp].deck=['chien-du-guet','cotre-de-course','trait-de-braise','chacal-du-seuil'];rpgPvpBrancherHasard(d,12);
    assert.ok(rpgPvpAppliquer(d,camp,{type:'jouer-carte',carteId:'appel-des-marees'}).ok);
    const intentions=[];
    const props={vue:rpgPvpVue(d,camp), siege:camp, code:'ABCDEF12', statut:'en_cours',onQuitter(){},onIntention:async intention=>{intentions.push(intention);const r=rpgPvpAppliquer(d,camp,intention);assert.ok(r.ok,JSON.stringify(r));return {etat:rpgPvpVue(d,camp),seq:1};}};
    root=createRoot(document.getElementById('root')); await act(async()=>root.render(React.createElement(Board,props)));
    const modal=document.querySelector('[aria-labelledby="rpg-renfort-choix-titre"]');assert.ok(modal);
    const boutons=[...modal.querySelectorAll('.rpg-renfort-choix__carte')];assert.equal(boutons.length,3);assert.equal(boutons[1].disabled,true);
    assert.match(boutons[1].textContent, /Non admissible/);
    assert.equal(document.activeElement, boutons.find((b) => !b.disabled), 'première carte admissible au focus');
    assert.equal(modal.getAttribute('aria-describedby'), 'rpg-renfort-choix-consigne');
    assert.equal(modal.querySelector('.rpg-renfort-choix__cartes').getAttribute('tabindex'), '0');
    await act(async()=>boutons[2].click());
    assert.equal(intentions[0].type,'choisir-renfort');assert.equal(d[camp].creatures[0].carteId,'cotre-de-course');
    assert.equal(document.querySelector('[aria-labelledby="rpg-renfort-choix-titre"]'),null);
  } finally {
    if(root) await act(async()=>root.unmount()); await vite.close();dom.window.close();
    globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('MOBA : le Porteur et le Convoi montrent leurs choix et destinations respectives', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { default: Board } = await vite.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
    const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await vite.ssrLoadModule('/src/games/rpgMobaLocal.js');
    const { RPG_RENDU_MOBA } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    let duel;
    const props = { initialiser: () => (duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 })), onQuitter: () => {}, rendu: { TableCard: RPG_RENDU_MOBA.TableCard } };
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Board, props)));
    await act(async () => document.querySelector('.moba__mulligan .moba__primary').click());
    duel.joueur.main = ['porteur-de-la-plume']; duel.joueur.deck = ['chien-du-guet', 'ureus-du-seuil', 'viking-des-neiges'];
    assert.ok(rpgMobaJouerCreature(duel, 'joueur', 'porteur-de-la-plume', 'left', 0).ok);
    await act(async () => root.render(React.createElement(Board, props)));
    let modal = document.querySelector('[aria-label="Choix de carte"]');
    assert.ok(modal); assert.match(modal.textContent, /coût 2 ou 3 dans votre deck.*cimetière/);
    assert.equal(modal.querySelectorAll('.moba__mulligan-card').length, 2);
    const ureus = [...modal.querySelectorAll('.moba__mulligan-card')].find(b => /Uræus du seuil/.test(b.textContent));
    await act(async () => ureus.click());
    assert.ok(duel.joueur.cimetiere.includes('ureus-du-seuil'));
    duel.moba.creaturesJouees.joueur = false; duel.joueur.invocationNormaleJouee = false;
    duel.joueur.main = ['convoi-des-dunes'];
    assert.ok(rpgMobaJouerCreature(duel, 'joueur', 'convoi-des-dunes', 'left', 1).ok);
    await act(async () => root.render(React.createElement(Board, props)));
    modal = document.querySelector('[aria-label="Choix de carte"]');
    assert.ok(modal); assert.match(modal.textContent, /Braise, Sable ou Ténèbres dans votre cimetière.*en main/);
    const choix = [...modal.querySelectorAll('.moba__mulligan-card')].find(b => /Uræus du seuil/.test(b.textContent));
    await act(async () => choix.click());
    assert.ok(duel.joueur.main.includes('ureus-du-seuil'));
    assert.equal(document.querySelector('[aria-label="Choix de carte"]'), null);
  } finally {
    if (root) await act(async () => root.unmount()); await vite.close(); dom.window.close();
    globalThis.window = oldWindow; globalThis.document = oldDocument; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
