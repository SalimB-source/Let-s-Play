import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgMulligan,rpgDemarrerManaEssai,rpgFinDeTour} from '../src/games/rpgDuel.js';
import {rpgMobaNouveauDuel,rpgMobaJouerCreature,rpgMobaPeutEmbuscade,rpgMobaDeclarerAttaque,rpgMobaLancerAttaque,rpgMobaPasserCreature,rpgMobaLancerMagie,rpgMobaPasserSort,rpgMobaTerminerTour,rpgMobaPasserFinDeTour,rpgMobaResoudreArrivee,rpgMobaPasserEffetCreature,rpgMobaPlacementCoherent,MOBA_CARTES_AUTORISEES} from '../src/games/rpgMobaLocal.js';
const id='sanguinaire-des-dunes';
function partie(side){
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);if(side==='sorcier')rpgFinDeTour(d);
 const defender=side==='joueur'?'sorcier':'joueur';d[side].main=Array(3).fill('gardienne-des-portes-de-sable');d[side].mana.sable=20;
 const blessee=rpgMobaJouerCreature(d,side,'gardienne-des-portes-de-sable','left',0).entite;
 const saine=rpgMobaJouerCreature(d,side,'gardienne-des-portes-de-sable','left',1).entite;
 const autre=rpgMobaJouerCreature(d,side,'gardienne-des-portes-de-sable','right',0).entite;
 assert.ok(blessee&&saine&&autre);blessee.pv=3;blessee.def=3;blessee.ready=true;saine.ready=true;
 d[defender].main=[id];Object.assign(d[defender].mana,{braise:20,tenebres:20});return {d,defender,blessee,saine,autre};
}
for(const side of ['joueur','sorcier']){
 test(`Sanguinaire en combat : dégâts simultanés et limités à sa voie (${side})`,()=>{
  const {d,defender,blessee,saine,autre}=partie(side);assert.ok(MOBA_CARTES_AUTORISEES.includes(id));
  assert.ok(rpgMobaDeclarerAttaque(d,side,[blessee.id,saine.id]).ok);assert.ok(rpgMobaPeutEmbuscade(d,defender,id));
  assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,side).entite);assert.equal(blessee.pv,1);assert.equal(saine.pv,3);assert.equal(autre.pv,4);
  assert.ok(rpgMobaLancerAttaque(d,side,[blessee.id,saine.id],{}, {declaree:true}).ok);assert.ok(rpgMobaPlacementCoherent(d));
 });
 test(`Sanguinaire suspend une créature déjà payée et elle reprend (${side})`,()=>{
  const {d,defender}=partie(side);d[side].main=['ashigaru-des-braises'];d[side].mana.braise=20;
  assert.ok(rpgMobaJouerCreature(d,side,'ashigaru-des-braises','right',1,{ouvrirReponse:true}).ok);
  const originale=d.mobaCreatureEnAttente;const mana=structuredClone(d[side].mana);
  assert.ok(rpgMobaPeutEmbuscade(d,defender,id));assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,side).entite);assert.equal(d.mobaCreatureEnAttente,originale);
  assert.ok(rpgMobaPasserCreature(d,defender).entite);assert.deepEqual(d[side].mana,mana);
 });
 test(`Sanguinaire contré en réponse à une créature : l’annonce reprend (${side})`,()=>{
  const {d,defender}=partie(side);d[side].main=['ashigaru-des-braises','ecueil'];Object.assign(d[side].mana,{braise:20,eau:20});
  assert.ok(rpgMobaJouerCreature(d,side,'ashigaru-des-braises','right',1,{ouvrirReponse:true}).ok);const originale=d.mobaCreatureEnAttente;
  assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaLancerMagie(d,side,'ecueil').contre);assert.equal(d.mobaCreatureEnAttente,originale);
  assert.ok(rpgMobaPasserCreature(d,defender).entite);
 });
 test(`Sanguinaire suspend un sort de zone déjà payé (${side})`,()=>{
  const {d,defender}=partie(side);d[side].main=['tempete-de-sable'];d[side].mana.sable=20;
  assert.ok(rpgMobaLancerMagie(d,side,'tempete-de-sable',null,'left',null,{ouvrirReponse:true}).sortEnAttente);
  const originale=d.mobaSortEnAttente;assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,side).entite);assert.equal(d.mobaSortEnAttente,originale);assert.ok(rpgMobaPasserSort(d,defender).ok);
 });
 test(`Sanguinaire suspend la fin du tour (${side})`,()=>{
  const {d,defender}=partie(side);d[side].main=[];assert.ok(rpgMobaTerminerTour(d,side).ok);assert.ok(rpgMobaPeutEmbuscade(d,defender,id));
  assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);assert.equal(d.finDeTour,null);
  assert.ok(rpgMobaPasserCreature(d,side).entite);assert.equal(d.finDeTour.cote,side);
  assert.ok(rpgMobaPasserFinDeTour(d,defender).ok);assert.equal(d.tour,defender);
 });
}
for(const side of ['joueur','sorcier']) test(`Sanguinaire supprime le dernier attaquant sans bloquer la phase (${side})`,()=>{
 const {d,defender,blessee}=partie(side);blessee.pv=1;assert.ok(rpgMobaDeclarerAttaque(d,side,[blessee.id]).ok);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,side).entite);assert.equal(d.combatDeclare,null);assert.equal(d.phase,'principale2');assert.equal(d.fenetreReponse,false);
});

test('la condition exige une créature adverse blessée et le refus ne dépense rien',()=>{
 const {d,defender,blessee,saine}=partie('joueur');blessee.pv=blessee.pvMax;blessee.def=blessee.pvMax;
 assert.ok(rpgMobaDeclarerAttaque(d,'joueur',[blessee.id,saine.id]).ok);const avant=JSON.stringify(d);
 assert.equal(rpgMobaPeutEmbuscade(d,defender,id),false);assert.equal(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok,false);assert.equal(JSON.stringify(d),avant);
});

test('un bouclier intercepte la vague mais la voie voisine reste intacte',()=>{
 const {d,defender,blessee,saine,autre}=partie('joueur');saine.bouclier=1;
 assert.ok(rpgMobaDeclarerAttaque(d,'joueur',[blessee.id,saine.id]).ok);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,'joueur').entite);
 assert.equal(blessee.pv,1);assert.equal(saine.pv,4);assert.equal(saine.bouclier,0);assert.equal(autre.pv,4);
});

test('IA sélectionne le Sanguinaire dans la voie utile sans muter le duel',async()=>{
 const {rpgMobaChoisirEmbuscadeIA}=await import('../src/games/rpgMobaAI.js');const {d,defender}=partie('joueur');
 d.joueur.main=['ashigaru-des-braises'];d.joueur.mana.braise=20;assert.ok(rpgMobaJouerCreature(d,'joueur','ashigaru-des-braises','right',1,{ouvrirReponse:true}).ok);
 const avant=JSON.stringify(d),choix=rpgMobaChoisirEmbuscadeIA(d,defender);assert.equal(choix?.id,id);assert.equal(choix?.lane,'left');assert.equal(JSON.stringify(d),avant);
});

for(const side of ['joueur','sorcier']) test(`Sanguinaire suspend une capacité ciblée et la reprend (${side})`,()=>{
 const {d,defender,blessee}=partie(side);
 // Une cible alliée du défenseur est nécessaire à l'annonce de l'arrivée.
 rpgFinDeTour(d);d[defender].main=['gardienne-des-portes-de-sable'];d[defender].mana.sable=20;
 const cible=rpgMobaJouerCreature(d,defender,'gardienne-des-portes-de-sable','right',0).entite;
 rpgFinDeTour(d);d[side].main=['eclipse-silencieuse'];Object.assign(d[side].mana,{sable:20,tenebres:20});d[defender].main=[id];Object.assign(d[defender].mana,{braise:20,tenebres:20});blessee.pv=3;blessee.def=3;
 assert.ok(rpgMobaJouerCreature(d,side,'eclipse-silencieuse','right',1,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,defender).arriveeEnAttente);const eff=rpgMobaResoudreArrivee(d,side,cible.id);assert.ok(eff.effetEnAttente,JSON.stringify(eff));
 const originale=d.effetCreatureEnAttente;assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,side).entite);assert.equal(blessee.pv,1);assert.equal(d.effetCreatureEnAttente,originale);
 assert.ok(rpgMobaPasserEffetCreature(d,defender).ok);assert.equal(cible.atk,0);
});

test('un Site blessé ne suffit pas à déclencher Sanguinaire et ne subit pas la vague',()=>{
 const {d,defender,blessee,saine}=partie('joueur');const carte=blessee.carteId;blessee.carteId='source-de-bimini';
 assert.ok(rpgMobaDeclarerAttaque(d,'joueur',[saine.id]).ok);assert.equal(rpgMobaPeutEmbuscade(d,defender,id),false);
 saine.pv=3;saine.def=3;assert.ok(rpgMobaPeutEmbuscade(d,defender,id));
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,'joueur').entite);assert.equal(blessee.pv,3);blessee.carteId=carte;
});

test('une créature annoncée conserve son sacrifice réservé et son paiement après Sanguinaire',()=>{
 const {d,defender,blessee}=partie('joueur');d.joueur.main=['ifrit-des-ergs'];d.joueur.mana.braise=20;
 const annonce=rpgMobaJouerCreature(d,'joueur','ifrit-des-ergs','left',0,{ouvrirReponse:true,sacrificeIds:[blessee.id]});assert.ok(annonce.creatureEnAttente,JSON.stringify(annonce));
 const original=d.mobaCreatureEnAttente,mana=structuredClone(d.joueur.mana);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'right',0,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,'joueur').entite);
 assert.equal(d.mobaCreatureEnAttente,original);assert.ok(d.joueur.creatures.includes(blessee));
 assert.ok(rpgMobaPasserCreature(d,defender).entite);assert.ok(!d.joueur.creatures.includes(blessee));assert.deepEqual(d.joueur.mana,mana);
});

test('Réanimation de Sanguinaire applique la vague uniquement dans sa voie',()=>{
 const {d,blessee,saine,autre}=partie('joueur');
 // Réanimation du côté actif : les adversaires sont mis en place au tour précédent.
 rpgFinDeTour(d);d.sorcier.cimetiere=[id];d.sorcier.main=['reanimation'];d.sorcier.mana.sable=20;
 blessee.pv=3;blessee.def=3;
 const result=rpgMobaLancerMagie(d,'sorcier','reanimation',null,'left',null,{emplacementReanimation:0});assert.ok(result.ok,JSON.stringify(result));
 assert.equal(blessee.pv,1);assert.equal(saine.pv,3);assert.equal(autre.pv,4);
});

test('la disparition du sacrifice réservé dissipe l’annonce initiale sans nouveau paiement',()=>{
 const {d,defender,blessee}=partie('joueur');blessee.pv=1;d.joueur.main=['ifrit-des-ergs'];d.joueur.mana.braise=20;
 assert.ok(rpgMobaJouerCreature(d,'joueur','ifrit-des-ergs','left',0,{ouvrirReponse:true,sacrificeIds:[blessee.id]}).ok);const mana=structuredClone(d.joueur.mana);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,'joueur').entite);
 assert.ok(!d.joueur.creatures.includes(blessee));assert.ok(rpgMobaPasserCreature(d,defender).dissipe);
 assert.ok(d.joueur.cimetiere.includes('ifrit-des-ergs'));assert.deepEqual(d.joueur.mana,mana);assert.equal(d.mobaCreatureEnAttente,null);
});
for(const side of ['joueur','sorcier']) test(`le contre de Sanguinaire restaure la fin du tour (${side})`,()=>{
 const {d,defender,blessee}=partie(side);d[side].main=['ecueil'];d[side].mana.eau=20;assert.ok(rpgMobaTerminerTour(d,side).ok);
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);assert.ok(rpgMobaLancerMagie(d,side,'ecueil').contre);
 assert.equal(d.finDeTour.cote,side);assert.equal(blessee.pv,3);assert.ok(rpgMobaPasserFinDeTour(d,defender).ok);
});

test('l’IA choisit aussi Sanguinaire dans la fenêtre de fin du tour',async()=>{
 const {rpgMobaChoisirEmbuscadeIA}=await import('../src/games/rpgMobaAI.js');const {d,defender}=partie('joueur');d.joueur.main=[];
 assert.ok(rpgMobaTerminerTour(d,'joueur').ok);const avant=JSON.stringify(d);const choix=rpgMobaChoisirEmbuscadeIA(d,defender);
 assert.equal(choix?.id,id);assert.equal(choix.lane,'left');assert.equal(JSON.stringify(d),avant);
});
