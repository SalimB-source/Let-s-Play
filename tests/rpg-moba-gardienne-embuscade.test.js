import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgDemarrerManaEssai,rpgMulligan,rpgFinDeTour} from '../src/games/rpgDuel.js';
import {rpgMobaNouveauDuel,rpgMobaJouerCreature,rpgMobaLancerMagie,rpgMobaPeutEmbuscade,rpgMobaPasserCreature,rpgMobaResoudreArrivee,rpgMobaPasserSort,rpgMobaPasserEffetCreature,rpgMobaDeclarerAttaque,rpgMobaLancerAttaque,rpgMobaPlacementCoherent} from '../src/games/rpgMobaLocal.js';
const id='gardienne-du-croissant';
function partie(side){
 const deck=Array(30).fill('ashigaru-des-braises'); const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 const defender=side==='joueur'?'sorcier':'joueur';if(side==='joueur')rpgFinDeTour(d);
 d[defender].main=['ronin-du-soleil-rouge'];d[defender].mana.braise=20;
 const cible=rpgMobaJouerCreature(d,defender,'ronin-du-soleil-rouge','left',0).entite;assert.ok(cible);
 rpgFinDeTour(d);d[side].main=['trait-de-braise'];d[side].mana.braise=20;
 d[defender].main=[id];Object.assign(d[defender].mana,{sable:20,tenebres:20});
 return {d,defender,cible};
}
for(const side of ['joueur','sorcier']){
 test(`Gardienne interrompt un sort ciblé et protège l’allié (${side})`,()=>{
  const {d,defender,cible}=partie(side);
  assert.ok(rpgMobaLancerMagie(d,side,'trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).sortEnAttente);
  const origine=d.mobaSortEnAttente;assert.ok(rpgMobaPeutEmbuscade(d,defender,id));
  assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).creatureEnAttente);
  assert.equal(d.mobaSortEnAttente,null);assert.equal(d.mobaReponseSuspendue.attente,origine);
  const res=rpgMobaPasserCreature(d,side);assert.ok(res.arriveeEnAttente,JSON.stringify(res));
  assert.ok(rpgMobaResoudreArrivee(d,defender,cible.id).ok);
  assert.equal(cible.pvMax,4);assert.equal(cible.bouclier,1);assert.equal(d.mobaSortEnAttente,origine);
  assert.ok(rpgMobaPasserSort(d,defender).ok);assert.ok(d[defender].creatures.includes(cible));assert.equal(cible.bouclier,0);
  assert.ok(rpgMobaPlacementCoherent(d));
 });
 test(`contre de la Gardienne : le sort original reprend (${side})`,()=>{
  const {d,defender,cible}=partie(side);d[side].main.push('ecueil');d[side].mana.eau=20;
  assert.ok(rpgMobaLancerMagie(d,side,'trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).sortEnAttente);
  const origine=d.mobaSortEnAttente;assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok);
  const contre=rpgMobaLancerMagie(d,side,'ecueil');assert.ok(contre.contre,JSON.stringify(contre));
  assert.equal(d.mobaSortEnAttente,origine);assert.equal(d.mobaCreatureEnAttente,null);
  assert.ok(rpgMobaPasserSort(d,defender).ok);assert.ok(!d[defender].creatures.includes(cible));
 });
}
for(const side of ['joueur','sorcier']) test(`Gardienne protège la cible d’une capacité annoncée (${side})`,()=>{
 const {d,defender,cible}=partie(side);d[side].main=['eclipse-silencieuse'];Object.assign(d[side].mana,{sable:20,tenebres:20});
 assert.ok(rpgMobaJouerCreature(d,side,'eclipse-silencieuse','left',0,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,defender).arriveeEnAttente);
 const declared=rpgMobaResoudreArrivee(d,side,cible.id);assert.ok(declared.effetEnAttente,JSON.stringify(declared));
 const origine=d.effetCreatureEnAttente;assert.ok(rpgMobaPeutEmbuscade(d,defender,id));
 const summon=rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true});assert.ok(summon.ok,JSON.stringify(summon));
 assert.equal(d.effetCreatureEnAttente,null);assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
 assert.ok(rpgMobaResoudreArrivee(d,defender,cible.id).ok);assert.equal(d.effetCreatureEnAttente,origine);
 assert.ok(rpgMobaPasserEffetCreature(d,defender).ok);assert.equal(cible.atk,3);assert.equal(cible.bouclier,0);
});
for(const side of ['joueur','sorcier']) test(`Gardienne répond à une Attaque ciblée et reprend le combat (${side})`,()=>{
 const {d,defender,cible}=partie(side);d[side].main=['sorcier-du-ressac-noir'];Object.assign(d[side].mana,{eau:20,tenebres:20});
 const attaquant=rpgMobaJouerCreature(d,side,'sorcier-du-ressac-noir','left',0).entite;assert.ok(attaquant);attaquant.ready=true;
 assert.ok(rpgMobaDeclarerAttaque(d,side,[attaquant.id],{[attaquant.id]:cible.id}).ok);
 assert.ok(rpgMobaPeutEmbuscade(d,defender,id));assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);assert.ok(rpgMobaResoudreArrivee(d,defender,cible.id).ok);
 assert.equal(cible.pvMax,4);assert.ok(d.combatDeclare);assert.ok(rpgMobaLancerAttaque(d,side,[attaquant.id],{}, {declaree:true}).ok);
 assert.ok(d[defender].creatures.includes(cible));assert.equal(cible.bouclier,1);
});
for(const side of ['joueur','sorcier']) test(`Gardienne : refus d’une cible hors voie sans mutation (${side})`,()=>{
 const {d,defender,cible}=partie(side);assert.ok(rpgMobaLancerMagie(d,side,'trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'right',0,{ouvrirReponse:true}).ok);const r=rpgMobaPasserCreature(d,side);assert.ok(r.entite);
 const avant=JSON.stringify(d);assert.equal(rpgMobaResoudreArrivee(d,defender,cible.id).ok,false);assert.equal(JSON.stringify(d),avant);
 assert.ok(rpgMobaResoudreArrivee(d,defender,r.entite.id).ok);assert.equal(r.entite.pvMax,3);
 assert.equal(d.mobaSortEnAttente.cibleId,cible.id);
});
test('l’IA choisit la Gardienne et protège la cible du sort sur copie',async()=>{
 const {rpgMobaChoisirEmbuscadeIA,rpgMobaChoisirArriveeIA}=await import('../src/games/rpgMobaAI.js');
 const {d,defender,cible}=partie('joueur');
 assert.ok(rpgMobaLancerMagie(d,'joueur','trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).ok);
 const avant=JSON.stringify(d);const choix=rpgMobaChoisirEmbuscadeIA(d,defender);assert.equal(choix?.id,id);assert.equal(choix.lane,'left');assert.equal(JSON.stringify(d),avant);
 assert.ok(rpgMobaJouerCreature(d,defender,id,choix.lane,choix.slot,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,'joueur').ok);assert.equal(rpgMobaChoisirArriveeIA(d,defender),cible.id);
});

test('Réanimation de la Gardienne : cible alliée choisie dans sa propre voie',()=>{
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 d.joueur.main=['ronin-du-soleil-rouge'];d.joueur.mana.braise=20;
 const voisine=rpgMobaJouerCreature(d,'joueur','ronin-du-soleil-rouge','right',0).entite;
 d.joueur.cimetiere=[id];d.joueur.main=['reanimation'];d.joueur.mana.sable=20;
 assert.ok(rpgMobaLancerMagie(d,'joueur','reanimation',null,'left',null,{emplacementReanimation:0}).ok);
 const gardienne=d.joueur.creatures.find(e=>e.carteId===id);assert.ok(gardienne);
 assert.equal(voisine.pvMax,2);assert.equal(voisine.bouclier,0);assert.equal(gardienne.pvMax,3);assert.equal(gardienne.bouclier,1);
});
for(const side of ['joueur','sorcier']) test(`cible du sort retirée pendant l’Embuscade : la Gardienne arrive et le sort se dissipe (${side})`,()=>{
 const {d,defender,cible}=partie(side);d[side].main=['trait-de-braise','frappe-iaijutsu'];
 assert.ok(rpgMobaLancerMagie(d,side,'trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).ok);
 const origine=d.mobaSortEnAttente;assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaLancerMagie(d,side,'frappe-iaijutsu',cible.id).ok);assert.ok(!d[defender].creatures.includes(cible));
 const r=rpgMobaPasserCreature(d,side);assert.ok(r.arriveeEnAttente,JSON.stringify(r));
 assert.ok(rpgMobaResoudreArrivee(d,defender,r.entite.id).ok);assert.equal(d.mobaSortEnAttente,origine);
 assert.ok(rpgMobaPasserSort(d,defender).dissipe);assert.equal(d.fenetreReponse,false);
});
test('IA peut contrer la Gardienne et simule ensuite le sort original',async()=>{
 const {rpgMobaChoisirMagieIA}=await import('../src/games/rpgMobaAI.js');const {d,defender,cible}=partie('sorcier');
 d.sorcier.main=['trait-de-braise','ecueil'];d.sorcier.mana.eau=20;
 assert.ok(rpgMobaLancerMagie(d,'sorcier','trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok);
 const avant=JSON.stringify(d);const choix=rpgMobaChoisirMagieIA(d,'sorcier',true);
 assert.equal(choix?.id,'ecueil');assert.equal(JSON.stringify(d),avant);
});
for(const side of ['joueur','sorcier']) test(`capacité suspendue : contre de la Gardienne puis reprise sans double effet (${side})`,()=>{
 const {d,defender,cible}=partie(side);d[side].main=['eclipse-silencieuse','ecueil'];Object.assign(d[side].mana,{sable:20,tenebres:20,eau:20});
 assert.ok(rpgMobaJouerCreature(d,side,'eclipse-silencieuse','left',0,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,defender).arriveeEnAttente);assert.ok(rpgMobaResoudreArrivee(d,side,cible.id).effetEnAttente);
 const originale=d.effetCreatureEnAttente;assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok);
 assert.equal(rpgMobaPasserEffetCreature(d,defender).ok,false);
 assert.ok(rpgMobaLancerMagie(d,side,'ecueil').contre);assert.equal(d.effetCreatureEnAttente,originale);
 assert.ok(rpgMobaPasserEffetCreature(d,defender).ok);assert.equal(cible.atk,1);assert.equal(d.effetCreatureEnAttente,null);
});

test('une vague non ciblée ne déclenche pas la Gardienne',()=>{
 const {d,defender}=partie('joueur');d.joueur.main=['tempete-de-sable'];d.joueur.mana.sable=20;
 assert.ok(rpgMobaLancerMagie(d,'joueur','tempete-de-sable',null,'left',null,{ouvrirReponse:true}).sortEnAttente);
 const avant=JSON.stringify(d);assert.equal(rpgMobaPeutEmbuscade(d,defender,id),false);
 assert.equal(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok,false);assert.equal(JSON.stringify(d),avant);
});

test('impossible de déclencher sans fenêtre ou sans droit de réponse',()=>{
 const {d,defender,cible}=partie('joueur');
 assert.ok(rpgMobaLancerMagie(d,'joueur','trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).sortEnAttente);
 const avant=JSON.stringify(d);assert.equal(rpgMobaJouerCreature(d,defender,id,'left',1).ok,false);assert.equal(JSON.stringify(d),avant);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok);
 assert.equal(rpgMobaPeutEmbuscade(d,defender,id),false);assert.equal(rpgMobaPasserSort(d,defender).ok,false);
});
for(const side of ['joueur','sorcier']) test(`la Gardienne se joue normalement et peut se choisir elle-même (${side})`,()=>{
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);if(side==='sorcier')rpgFinDeTour(d);
 d[side].main=[id];Object.assign(d[side].mana,{sable:20,tenebres:20});
 const annonce=rpgMobaJouerCreature(d,side,id,'left',0,{ouvrirReponse:true});assert.ok(annonce.creatureEnAttente);
 const r=rpgMobaPasserCreature(d,side==='joueur'?'sorcier':'joueur');assert.ok(r.arriveeEnAttente);
 assert.ok(rpgMobaResoudreArrivee(d,side,r.entite.id).ok);assert.equal(r.entite.pvMax,3);assert.equal(r.entite.bouclier,1);
});
test('la Gardienne ne peut pas donner son bouclier à un Site',()=>{
 const {d,defender,cible}=partie('joueur');
 assert.ok(rpgMobaLancerMagie(d,'joueur','trait-de-braise',cible.id,null,null,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',1,{ouvrirReponse:true}).ok);
 const r=rpgMobaPasserCreature(d,'joueur');assert.ok(r.arriveeEnAttente);
 // Simuler un Site dans une autre case de la même voie, sans modifier l'identité du plateau.
 const original=cible.carteId;cible.carteId='source-de-bimini';
 const avant=JSON.stringify(d);assert.equal(rpgMobaResoudreArrivee(d,defender,cible.id).ok,false);assert.equal(JSON.stringify(d),avant);
 cible.carteId=original;assert.ok(rpgMobaResoudreArrivee(d,defender,r.entite.id).ok);
});
