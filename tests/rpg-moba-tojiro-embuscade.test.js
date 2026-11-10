import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgMulligan,rpgDemarrerManaEssai,rpgFinDeTour,rpgReglerHasard} from '../src/games/rpgDuel.js';
import {rpgMobaNouveauDuel,rpgMobaJouerCreature,rpgMobaPeutEmbuscade,rpgMobaDeclarerAttaque,rpgMobaLancerAttaque,rpgMobaPasserCreature,rpgMobaLancerMagie,rpgMobaPasserSort,rpgMobaTerminerTour,rpgMobaPasserFinDeTour,rpgMobaResoudreArrivee,rpgMobaPasserEffetCreature,rpgMobaPlacementCoherent,MOBA_CARTES_AUTORISEES} from '../src/games/rpgMobaLocal.js';
import {rpgMobaChoisirEmbuscadeIA} from '../src/games/rpgMobaAI.js';
const id='tojiro-le-pourfendeur';
function partie(actif, plein=false){
 const deck=Array(30).fill('ashigaru-des-braises'); const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 const defenseur=actif==='joueur'?'sorcier':'joueur';if(d.tour!==defenseur)rpgFinDeTour(d);
 d[defenseur].main=['gardienne-des-portes-de-sable'];d[defenseur].mana.sable=20;
 const victime=rpgMobaJouerCreature(d,defenseur,'gardienne-des-portes-de-sable','left',0).entite;assert.ok(victime);
 if(plein) for(const [lane,slot] of [['left',1],['center',0],['right',0],['right',1]]) {d[defenseur].main.push('gardienne-des-portes-de-sable');assert.ok(rpgMobaJouerCreature(d,defenseur,'gardienne-des-portes-de-sable',lane,slot).entite);}
 rpgFinDeTour(d);assert.equal(d.tour,actif);
 d[actif].main=['djinn-du-dernier-brasier'];d[actif].mana.braise=20;
 const djinn=rpgMobaJouerCreature(d,actif,'djinn-du-dernier-brasier','left',0).entite;assert.ok(djinn);djinn.ready=true;
 d[defenseur].main=[id];d[defenseur].mana.braise=20;d[actif].mana.braise=20;
 return {d,defenseur,victime,djinn};
}
for(const actif of ['joueur','sorcier']){
 test(`Tojiro répond au combat avec un sacrifice sélectionné (${actif})`,()=>{
  const {d,defenseur,victime,djinn}=partie(actif);assert.ok(MOBA_CARTES_AUTORISEES.includes(id));
  assert.ok(rpgMobaDeclarerAttaque(d,actif,[djinn.id]).ok);assert.ok(rpgMobaPeutEmbuscade(d,defenseur,id));
  const before=JSON.stringify(d);assert.equal(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true}).ok,false);assert.equal(JSON.stringify(d),before);
  assert.ok(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).creatureEnAttente);
  assert.ok(d[defenseur].creatures.includes(victime));assert.ok(rpgMobaPasserCreature(d,actif).entite);
  const tojiro=d[defenseur].creatures.find(e=>e.carteId===id);assert.ok(tojiro);assert.equal(tojiro.mobaLane,'left');assert.ok(!d[defenseur].creatures.includes(victime));
  assert.ok(rpgMobaLancerAttaque(d,actif,[djinn.id],{[djinn.id]:[tojiro.id]},{declaree:true}).ok);assert.ok(rpgMobaPlacementCoherent(d));
 });
 test(`Tojiro suspend un sort déjà payé (${actif})`,()=>{
  const {d,defenseur,victime}=partie(actif);d[actif].main=['tempete-de-sable'];d[actif].mana.sable=20;
  assert.ok(rpgMobaLancerMagie(d,actif,'tempete-de-sable',null,'right',null,{ouvrirReponse:true}).sortEnAttente);const originale=d.mobaSortEnAttente,mana=structuredClone(d[actif].mana);
  assert.ok(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);assert.ok(rpgMobaPasserCreature(d,actif).entite);
  assert.equal(d.mobaSortEnAttente,originale);assert.ok(rpgMobaPasserSort(d,defenseur).ok);assert.deepEqual(d[actif].mana,mana);
 });
 test(`Tojiro contré ne sacrifie pas et l’annonce de créature reprend (${actif})`,()=>{
  const {d,defenseur,victime}=partie(actif);d[actif].main=['ashigaru-des-braises','ecueil'];Object.assign(d[actif].mana,{braise:20,eau:20});
  assert.ok(rpgMobaJouerCreature(d,actif,'ashigaru-des-braises','right',0,{ouvrirReponse:true}).creatureEnAttente);const originale=d.mobaCreatureEnAttente;
  assert.ok(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);
  assert.ok(rpgMobaLancerMagie(d,actif,'ecueil').contre);assert.ok(d[defenseur].creatures.includes(victime));assert.equal(d.mobaCreatureEnAttente,originale);
  assert.ok(rpgMobaPasserCreature(d,defenseur).entite);
 });
 test(`Tojiro suspend et reprend la fin du tour (${actif})`,()=>{
  const {d,defenseur,victime}=partie(actif);d[actif].main=[];assert.ok(rpgMobaTerminerTour(d,actif).ok);
  assert.ok(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);
  assert.ok(rpgMobaPasserCreature(d,actif).entite);assert.equal(d.finDeTour.cote,actif);assert.ok(rpgMobaPasserFinDeTour(d,defenseur).ok);
 });
 test(`sans Djinn ou sacrifice Tojiro est refusé sans dépense (${actif})`,()=>{
  const {d,defenseur,victime,djinn}=partie(actif);assert.ok(rpgMobaTerminerTour(d,actif).ok);const carte=djinn.carteId;djinn.carteId='gardienne-des-portes-de-sable';
  const before=JSON.stringify(d);assert.equal(rpgMobaPeutEmbuscade(d,defenseur,id),false);assert.equal(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok,false);assert.equal(JSON.stringify(d),before);djinn.carteId=carte;
  const victimCard=victime.carteId;victime.carteId='source-de-bimini';assert.equal(rpgMobaPeutEmbuscade(d,defenseur,id),false);victime.carteId=victimCard;
 });
}

for(const actif of ['joueur','sorcier']) test(`champ plein : la case du sacrifice reste utilisable (${actif})`,()=>{
 const {d,defenseur,victime}=partie(actif,true);assert.ok(rpgMobaTerminerTour(d,actif).ok);assert.ok(rpgMobaPeutEmbuscade(d,defenseur,id));
 assert.ok(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);
 const result=rpgMobaPasserCreature(d,actif);assert.ok(result.entite,JSON.stringify(result));assert.equal(d[defenseur].creatures.length,5);assert.ok(rpgMobaPlacementCoherent(d));
});
for(const actif of ['joueur','sorcier']) test(`l’IA évalue les sacrifices et peut remplacer sa victime sur champ plein (${actif})`,()=>{
 const {d,defenseur}=partie(actif,true);assert.ok(rpgMobaTerminerTour(d,actif).ok);const avant=JSON.stringify(d);
 const choix=rpgMobaChoisirEmbuscadeIA(d,defenseur);assert.equal(choix?.id,id);assert.equal(choix.sacrificeIds.length,1);
 const occupant=d.moba.lanes.find(l=>l.id===choix.lane).slots[defenseur][choix.slot];assert.equal(occupant,choix.sacrificeIds[0]);assert.equal(JSON.stringify(d),avant);
 assert.ok(rpgMobaJouerCreature(d,defenseur,id,choix.lane,choix.slot,{ouvrirReponse:true,sacrificeIds:choix.sacrificeIds}).ok);assert.ok(rpgMobaPasserCreature(d,actif).entite);
});
for(const actif of ['joueur','sorcier']) test(`Tojiro suspend une capacité ciblée (${actif})`,()=>{
 const {d,defenseur,victime}=partie(actif);d[actif].main=['eclipse-silencieuse'];Object.assign(d[actif].mana,{sable:20,tenebres:20});
 assert.ok(rpgMobaJouerCreature(d,actif,'eclipse-silencieuse','left',1,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,defenseur).arriveeEnAttente);
 assert.ok(rpgMobaResoudreArrivee(d,actif,victime.id).effetEnAttente);const initial=d.effetCreatureEnAttente;
 assert.ok(rpgMobaJouerCreature(d,defenseur,id,'right',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);assert.ok(rpgMobaPasserCreature(d,actif).entite);
 assert.equal(d.effetCreatureEnAttente,initial);const result=rpgMobaPasserEffetCreature(d,defenseur);assert.ok(result.ok,JSON.stringify(result));assert.equal(d.effetCreatureEnAttente,null);
});
function tojiroEnJeu(side){
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);if(d.tour!==side)rpgFinDeTour(d);
 d[side].main=['gardienne-des-portes-de-sable',id];Object.assign(d[side].mana,{sable:20,braise:20});
 const victime=rpgMobaJouerCreature(d,side,'gardienne-des-portes-de-sable','left',0).entite;
 const tojiro=rpgMobaJouerCreature(d,side,id,'left',0,{sacrificeIds:[victime.id]}).entite;assert.ok(tojiro);
 rpgFinDeTour(d);const actif=d.tour;d[actif].main=['gardienne-des-portes-de-sable'];d[actif].mana.sable=20;
 const autre=rpgMobaJouerCreature(d,actif,'gardienne-des-portes-de-sable','right',0).entite;assert.ok(autre);
 d[actif].main=['trait-de-braise'];d[actif].mana.braise=20;return {d,actif,tojiro,autre};
}
for(const side of ['joueur','sorcier']){
 test(`Esquive contre un sort riposte sur la voie de Tojiro (${side})`,()=>{
  const {d,actif,tojiro,autre}=tojiroEnJeu(side);rpgReglerHasard(d,()=>0);const hp=d.moba.lanes.find(l=>l.id==='left').hp[actif];
  assert.ok(rpgMobaLancerMagie(d,actif,'trait-de-braise',tojiro.id).ok);assert.equal(tojiro.pv,5);assert.equal(d.moba.lanes.find(l=>l.id==='left').hp[actif],hp-5);assert.equal(autre.pv,4);
 });
 test(`Harakiri choisit une créature adverse même dans une autre voie (${side})`,()=>{
  const {d,actif,tojiro,autre}=tojiroEnJeu(side);tojiro.pv=1;tojiro.def=1;rpgReglerHasard(d,()=>.5);
  const hp=d.moba.lanes.find(l=>l.id==='left').hp[actif];assert.ok(rpgMobaLancerMagie(d,actif,'trait-de-braise',tojiro.id).ok);
  assert.ok(!d[side].creatures.includes(tojiro));assert.equal(autre.pv,3);assert.equal(d.moba.lanes.find(l=>l.id==='left').hp[actif],hp-5);
 });
 test(`Harakiri ignore un Site et frappe la voie adverse à défaut de créature (${side})`,()=>{
  const {d,actif,tojiro,autre}=tojiroEnJeu(side);autre.carteId='source-de-bimini';tojiro.pv=1;tojiro.def=1;rpgReglerHasard(d,()=>.5);
  const hp=d.moba.lanes.find(l=>l.id==='left').hp[actif];assert.ok(rpgMobaLancerMagie(d,actif,'trait-de-braise',tojiro.id).ok);
  assert.equal(autre.pv,4);assert.equal(d.moba.lanes.find(l=>l.id==='left').hp[actif],hp-6);
 });
}
for(const side of ['joueur','sorcier']) test(`Tojiro esquive l’Attaque ciblée et riposte à sa source (${side})`,()=>{
 const {d,actif,tojiro,autre}=tojiroEnJeu(side);d[actif].main=['sorcier-du-ressac-noir'];Object.assign(d[actif].mana,{eau:20,tenebres:20});
 const attaquant=rpgMobaJouerCreature(d,actif,'sorcier-du-ressac-noir','left',0).entite;assert.ok(attaquant);attaquant.ready=true;let tir=0;rpgReglerHasard(d,()=>tir++ === 0 ? .9 : 0);
 assert.ok(rpgMobaDeclarerAttaque(d,actif,[attaquant.id],{[attaquant.id]:tojiro.id}).ok);
 assert.ok(rpgMobaLancerAttaque(d,actif,[attaquant.id],{}, {declaree:true}).ok);assert.equal(tojiro.pv,5);assert.ok(!d[actif].creatures.includes(attaquant));assert.equal(autre.pv,4);
});
for(const side of ['joueur','sorcier']) test(`un sort de zone esquivé reçoit la riposte dans la voie de Tojiro (${side})`,()=>{
 const {d,actif,tojiro,autre}=tojiroEnJeu(side);d[actif].main=['tempete-de-sable'];d[actif].mana.sable=20;rpgReglerHasard(d,()=>0);
 const hp=d.moba.lanes.find(l=>l.id==='left').hp[actif];assert.ok(rpgMobaLancerMagie(d,actif,'tempete-de-sable',null,'left').ok);
 assert.equal(tojiro.pv,5);assert.equal(autre.pv,4);assert.equal(d.moba.lanes.find(l=>l.id==='left').hp[actif],hp-5);
});
for(const actif of ['joueur','sorcier']) test(`le sacrifice retiré en réponse dissipe Tojiro et restaure l’annonce (${actif})`,()=>{
 const {d,defenseur,victime}=partie(actif);d[actif].main=['ashigaru-des-braises','frappe-iaijutsu'];d[actif].mana.braise=20;victime.pv=1;victime.def=1;
 assert.ok(rpgMobaJouerCreature(d,actif,'ashigaru-des-braises','right',0,{ouvrirReponse:true}).ok);const initiale=d.mobaCreatureEnAttente;
 assert.ok(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);
 assert.ok(rpgMobaLancerMagie(d,actif,'frappe-iaijutsu',victime.id).ok);assert.ok(!d[defenseur].creatures.includes(victime));
 const result=rpgMobaPasserCreature(d,actif);assert.ok(result.dissipe,JSON.stringify(result));assert.equal(d.mobaCreatureEnAttente,initiale);assert.ok(rpgMobaPasserCreature(d,defenseur).entite);
});

test('une victoire déclenchée par le sacrifice ne ressuscite pas l’annonce suspendue',async()=>{
 const {mobaInfliger}=await import('../src/games/rpgMoba.js');const deck=Array(30).fill('ashigaru-des-braises');
 const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 d.joueur.main=['gardienne-des-portes-de-sable','djinn-des-cendres-vengeresses'];Object.assign(d.joueur.mana,{sable:20,braise:20});
 const victime=rpgMobaJouerCreature(d,'joueur','gardienne-des-portes-de-sable','left',0).entite;
 assert.ok(rpgMobaJouerCreature(d,'joueur','djinn-des-cendres-vengeresses','left',1).entite);rpgFinDeTour(d);
 d.sorcier.main=['djinn-du-dernier-brasier'];d.sorcier.mana.braise=20;assert.ok(rpgMobaJouerCreature(d,'sorcier','djinn-du-dernier-brasier','center',0).entite);
 d.joueur.main=[id];d.joueur.mana.braise=20;mobaInfliger(d.moba,'joueur','right',20);mobaInfliger(d.moba,'joueur','left',19);
 d.sorcier.main=['ashigaru-des-braises'];assert.ok(rpgMobaJouerCreature(d,'sorcier','ashigaru-des-braises','left',0,{ouvrirReponse:true}).ok);
 const choix=rpgMobaChoisirEmbuscadeIA(d,'joueur');assert.equal(choix?.id,id,JSON.stringify(choix));
 assert.ok(rpgMobaJouerCreature(d,'joueur',id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);
 const result=rpgMobaPasserCreature(d,'sorcier');assert.ok(result.ok,JSON.stringify(result));assert.equal(d.moba.winner,'joueur');assert.equal(d.mobaCreatureEnAttente,null);assert.equal(d.mobaReponseSuspendue,null);
});
for(const side of ['joueur','sorcier']) test(`une capacité ciblée ne s’esquive pas et Tojiro riposte à sa source (${side})`,()=>{
 const {d,actif,tojiro,autre}=tojiroEnJeu(side);d[actif].main=['eclipse-silencieuse'];Object.assign(d[actif].mana,{sable:20,tenebres:20});
 const source=rpgMobaJouerCreature(d,actif,'eclipse-silencieuse','left',0).entite;assert.ok(source);rpgReglerHasard(d,()=>0);
 const result=rpgMobaResoudreArrivee(d,actif,tojiro.id);assert.ok(result.ok,JSON.stringify(result));
 assert.equal(tojiro.atk,3);assert.ok(!d[actif].creatures.includes(source));assert.equal(autre.pv,4);
});
for(const actif of ['joueur','sorcier']) test(`champ plein : une capacité ciblée ouvre la réponse grâce à un sacrifice (${actif})`,()=>{
 const {d,defenseur,victime}=partie(actif,true);d[actif].main=['eclipse-silencieuse'];Object.assign(d[actif].mana,{sable:20,tenebres:20});
 assert.ok(rpgMobaJouerCreature(d,actif,'eclipse-silencieuse','left',1,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,defenseur).arriveeEnAttente);
 assert.ok(rpgMobaResoudreArrivee(d,actif,victime.id).effetEnAttente);assert.ok(rpgMobaPeutEmbuscade(d,defenseur,id));
 assert.ok(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok);assert.ok(rpgMobaPasserCreature(d,actif).entite);assert.ok(rpgMobaPasserEffetCreature(d,defenseur).ok);
});

test('toutes les créatures portant Embuscade sont présentes dans le pool audité',async()=>{
 const {RPG_DUEL_CARDS}=await import('../src/games/rpgCards.js');const ids=RPG_DUEL_CARDS.filter(card=>card.reactionTourAdverse).map(card=>card.id);
 assert.equal(ids.length,10);for(const card of ids)assert.ok(MOBA_CARTES_AUTORISEES.includes(card),card);
});
for(const side of ['joueur','sorcier']) test(`Réanimation de Tojiro sans Djinn ni sacrifice (${side})`,()=>{
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);if(d.tour!==side)rpgFinDeTour(d);
 d[side].cimetiere=[id];d[side].main=['reanimation'];d[side].mana.sable=20;
 const result=rpgMobaLancerMagie(d,side,'reanimation',null,'left',null,{emplacementReanimation:0});assert.ok(result.ok,JSON.stringify(result));
 const tojiro=d[side].creatures.find(e=>e.carteId===id);assert.ok(tojiro);assert.ok(tojiro.esquive&&tojiro.contreAttaque);assert.ok(rpgMobaPlacementCoherent(d));
});
