import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_ELEMENTS, cardHasPrintedType } from '../src/games/rpgCards.js';
import { cardArt } from '../src/games/rpgCardArt.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgAttaquerCreature, rpgLancerMagie, rpgBlesserCreature } from '../src/games/rpgDuel.js';
import { resultatBlocage } from '../src/games/rpgAI.js';
function duel() { const d=rpgNouveauDuel({joueurDeck:[],sorcierDeck:[],rng:()=>0.9}); for (const cote of ['joueur','sorcier']) d[cote].mana=Object.fromEntries(RPG_ELEMENTS.map(e=>[e,40])); return d; }
function pose(d,c,id, cible=null, opts={}) { d[c].main.push(id); const r=rpgJouerCreature(d,c,id,cible,opts); assert.equal(r.ok,true,`${id}: ${r.raison}`); return r.entite; }
test('Vampire des braises : 2/2 coût 3, Rapidité, Embuscade et Vampire',()=>{
 const c=cardById('vampire-des-braises'); assert.deepEqual([c.cost,c.atk,c.def,c.element,c.rapidite,c.reactionTourAdverse],[3,2,2,'braise',true,true]); assert.ok(cardHasPrintedType(c,'Vampire'));
 assert.match(cardArt(c.id), /vampire-braise-souffle-v2$/, 'le nouvel art qui crache du feu contourne le cache');
});
test('Vampire inflige 1 dégât à chaque bloqueur avant les dégâts de combat',()=>{
 const d=duel(), a=pose(d,'joueur','vampire-des-braises'), b=pose(d,'sorcier','dune-marchante');
 assert.equal(a.ready,true); const r=rpgLancerAttaque(d,'joueur',[a.id],{[a.id]:[b.id]});
 assert.equal(r.ok,true,JSON.stringify(r)); assert.equal(b.pv,1); assert.equal(a.pv,0);
});
test('un bloqueur éliminé par la capacité ne riposte pas et bloque toujours la créature',()=>{
 const d=duel(), a=pose(d,'joueur','vampire-des-braises'), b=pose(d,'sorcier','fennec-des-decombres'); const pv=d.sorcier.pv;
 const simulation=resultatBlocage(a,b); assert.equal(simulation.attaquantMeurt,false);
 const r=rpgLancerAttaque(d,'joueur',[a.id],{[a.id]:[b.id]}); assert.equal(r.ok,true); assert.equal(a.pv,2); assert.ok(!d.sorcier.creatures.includes(b)); assert.equal(d.sorcier.pv,pv);
});
test('plusieurs bloqueurs sont chacun frappés et le Bouclier adverse protège',()=>{
 const d=duel(), a=pose(d,'joueur','vampire-des-braises'), b=pose(d,'sorcier','dune-marchante'), c=pose(d,'sorcier','dune-marchante'); c.bouclier=1;
 assert.equal(rpgLancerAttaque(d,'joueur',[a.id],{[a.id]:[b.id,c.id]}).ok,true); assert.equal(c.bouclier,0); assert.ok(b.pv<=3);
});
test('le duel ciblé ne déclenche pas l’effet réservé au blocage',()=>{
 const d=duel(), a=pose(d,'joueur','vampire-des-braises'), b=pose(d,'sorcier','dune-marchante');
 assert.ok(rpgAttaquerCreature(d,'joueur',a.id,b.id).ok); assert.equal(b.pv,2);
});
test('Brûlot : 2 dégâts au sorcier et au tueur survivant en combat',()=>{
 const d=duel(), brulot=pose(d,'sorcier','le-brulot'), tueur=pose(d,'joueur','dune-marchante'); tueur.ready=true;
 assert.equal(cardById('le-brulot').cost,3); const pv=d.joueur.pv;
 assert.ok(rpgAttaquerCreature(d,'joueur',tueur.id,brulot.id).ok); assert.equal(d.joueur.pv,pv-2); assert.equal(tueur.pv,1);
});
test('Brûlot touche toujours le sorcier à sa mort par sort ou sans tueur',()=>{
 const d=duel(), b=pose(d,'sorcier','le-brulot'); d.joueur.main.push('trait-de-braise'); const pv=d.joueur.pv;
 assert.ok(rpgLancerMagie(d,'joueur','trait-de-braise',b.id).ok); assert.equal(d.joueur.pv,pv-2);
 const x=pose(d,'sorcier','le-brulot'); const avant=d.joueur.pv; rpgBlesserCreature(d,'sorcier',x.id,10); assert.equal(d.joueur.pv,avant-2);
});
test('Brûlot riposte à la créature qui le tue avec une capacité ciblée',()=>{
 const d=duel(), b=pose(d,'sorcier','le-brulot'), pv=d.joueur.pv;
 const a=pose(d,'joueur','ghul-des-cendres');
 // La Sentinelle tue à l’arrivée un attaquant adverse désigné.
 const sent=pose(d,'joueur','sentinelle-des-sables',b.id,{attaquants:[b.id]});
 assert.ok(!d.sorcier.creatures.includes(b)); assert.equal(d.joueur.pv,pv-2); assert.ok(!d.joueur.creatures.includes(sent)); assert.ok(d.joueur.creatures.includes(a));
});
