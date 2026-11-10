import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';

async function setup(){
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const {default:Board}=await server.ssrLoadModule('/src/games/RpgMobaBoard.jsx');
 const local=await server.ssrLoadModule('/src/games/rpgMobaLocal.js');const rules=await server.ssrLoadModule('/src/games/rpgDuel.js');
 let d;const initialiser=()=>(d=local.rpgMobaNouveauDuel({joueurDeck:Array(30).fill('ashigaru-des-braises'),sorcierDeck:Array(30).fill('ashigaru-des-braises'),joueurCouleurs:['braise','sable'],sorcierCouleurs:['braise','sable'],rng:()=>.5}));
 const props={initialiser,onQuitter:()=>{}};const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Board,props)));
 const text=(sel,val)=>[...document.querySelectorAll(sel)].find(e=>e.textContent.includes(val));
 const click=async(b)=>{assert.ok(b,'commande présente');assert.equal(b.disabled,false,b.outerHTML);await act(async()=>b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
 await click(document.querySelector('.moba__mulligan .moba__primary'));await click(text('.moba__choice button','braise'));
 return {d,local,rules,props,root,text,click,redraw:()=>act(async()=>root.render(React.createElement(Board,props))),wait:()=>act(async()=>new Promise(r=>setTimeout(r,550))),cleanup:async()=>{await act(async()=>root.unmount());await server.close();dom.window.close();globalThis.window=oldWindow;globalThis.document=oldDocument;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}};
}

test('joueur : sacrifice hors tour et pose sur la case libérée quand le champ est plein',async()=>{
 const t=await setup();try{const {d,local,rules,click,text}=t;
  d.joueur.main=Array(5).fill('gardienne-des-portes-de-sable');d.joueur.mana.sable=30;
  let victime;for(const [lane,slot] of [['left',0],['left',1],['center',0],['right',0],['right',1]]){const e=local.rpgMobaJouerCreature(d,'joueur','gardienne-des-portes-de-sable',lane,slot).entite;assert.ok(e);if(!victime)victime=e;}
  rules.rpgFinDeTour(d);if(d.sorcier.manaChoixEnAttente)rules.rpgChoisirCouleurMana(d,'sorcier','braise');
  d.sorcier.main=['djinn-du-dernier-brasier'];d.sorcier.mana.braise=20;const djinn=local.rpgMobaJouerCreature(d,'sorcier','djinn-du-dernier-brasier','right',0).entite;assert.ok(djinn);djinn.ready=false;djinn.attaquee=true;
  d.sorcier.main=[];d.joueur.main=['tojiro-le-pourfendeur'];d.joueur.mana.braise=20;
  await t.redraw();await t.wait();assert.equal(d.finDeTour?.cote,'sorcier');
  await click(text('.moba__card','Tojiro'));const slot=()=>document.querySelector(`[data-moba-entity="${victime.id}"] button`);
  await click(slot());assert.ok(text('.moba__sacrifice-hint','1/1'));await click(slot());
  assert.equal(d.mobaCreatureEnAttente?.carteId,'tojiro-le-pourfendeur');assert.ok(d.joueur.creatures.includes(victime));
  await t.wait();assert.ok(!d.joueur.creatures.includes(victime));assert.ok(d.joueur.creatures.some(e=>e.carteId==='tojiro-le-pourfendeur'));assert.equal(d.finDeTour?.cote,'sorcier');
  await click(text('.moba__controls button','Passer'));assert.equal(d.tour,'joueur');
 }finally{await t.cleanup();}
});

test('IA : annonce Tojiro avec son sacrifice puis reprend la fin du tour',async()=>{
 const t=await setup();try{const {d,local,rules,click,text}=t;
  rules.rpgFinDeTour(d);if(d.sorcier.manaChoixEnAttente)rules.rpgChoisirCouleurMana(d,'sorcier','braise');
  d.sorcier.main=['gardienne-des-portes-de-sable'];d.sorcier.mana.sable=20;const victime=local.rpgMobaJouerCreature(d,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
  rules.rpgFinDeTour(d);if(d.joueur.manaChoixEnAttente)rules.rpgChoisirCouleurMana(d,'joueur','braise');
  d.joueur.main=['djinn-du-dernier-brasier'];d.joueur.mana.braise=20;assert.ok(local.rpgMobaJouerCreature(d,'joueur','djinn-du-dernier-brasier','left',0).entite);
  d.joueur.main=[];d.sorcier.main=['tojiro-le-pourfendeur'];d.sorcier.mana.braise=20;await t.redraw();
  await click(text('.moba__controls button','Fin du tour'));await t.wait();
  assert.equal(d.mobaCreatureEnAttente?.carteId,'tojiro-le-pourfendeur');assert.deepEqual(d.mobaCreatureEnAttente.sacrificeIds,[victime.id]);
  await click(text('.moba__controls button','Passer et laisser entrer'));assert.ok(d.sorcier.creatures.some(e=>e.carteId==='tojiro-le-pourfendeur'));assert.ok(!d.sorcier.creatures.includes(victime));assert.equal(d.finDeTour?.cote,'joueur');
  await t.wait();assert.equal(d.tour,'sorcier');
 }finally{await t.cleanup();}
});
