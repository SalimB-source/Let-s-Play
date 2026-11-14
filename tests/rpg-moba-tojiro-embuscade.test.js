import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgMulligan,rpgDemarrerManaEssai,rpgFinDeTour,rpgReglerHasard} from '../src/games/rpgDuel.js';
import {rpgMobaNouveauDuel,rpgMobaJouerCreature,rpgMobaPeutEmbuscade,rpgMobaInvocationSpecialeDisponible,rpgMobaDeclarerAttaque,rpgMobaLancerAttaque,rpgMobaPasserCreature,rpgMobaLancerMagie,rpgMobaPasserSort,rpgMobaTerminerTour,rpgMobaPasserFinDeTour,rpgMobaResoudreArrivee,rpgMobaPasserEffetCreature,rpgMobaPlacementCoherent,MOBA_CARTES_AUTORISEES} from '../src/games/rpgMobaLocal.js';
import {rpgMobaChoisirEmbuscadeIA} from '../src/games/rpgMobaAI.js';
const id='tojiro-le-pourfendeur';
function partie(actif, plein=false){
 const deck=Array(30).fill('ashigaru-des-braises'); const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 const defenseur=actif==='joueur'?'sorcier':'joueur';if(d.tour!==defenseur)rpgFinDeTour(d);
 d[defenseur].main=['gardienne-des-portes-de-sable'];d[defenseur].mana.sable=20;
 const victime=rpgMobaJouerCreature(d,defenseur,'gardienne-des-portes-de-sable','left',0).entite;assert.ok(victime);
 if(plein) for(const [lane,slot] of [['left',1],['center',0],['right',0],['right',1]]) {rpgFinDeTour(d);rpgFinDeTour(d);d[defenseur].main.push('gardienne-des-portes-de-sable');assert.ok(rpgMobaJouerCreature(d,defenseur,'gardienne-des-portes-de-sable',lane,slot).entite);}
 rpgFinDeTour(d);assert.equal(d.tour,actif);
 d[actif].main=['djinn-du-dernier-brasier'];d[actif].mana.braise=20;
 // Le Djinn éphémère est conservé pour préparer une menace à un tour ultérieur.
 const djinn=rpgMobaJouerCreature(d,actif,'djinn-du-dernier-brasier','left',0).entite;assert.ok(djinn);djinn.detruireFinDuTour=false;rpgFinDeTour(d);rpgFinDeTour(d);djinn.ready=true;
 victime.pv--; // La condition MOBA exige une créature alliée blessée.
 d[defenseur].main=[id];d[defenseur].mana.braise=20;d[actif].mana.braise=20;
 return {d,defenseur,victime,djinn};
}
for (const actif of ['joueur', 'sorcier']) for (const fenetre of ['combat', 'sort', 'creature', 'fin']) {
 test(`Tojiro refusé pendant ${fenetre} adverse, sans paiement ni sacrifice (${actif})`, () => {
  const {d, defenseur, victime, djinn} = partie(actif);
  if (fenetre === 'combat') assert.ok(rpgMobaDeclarerAttaque(d, actif, [djinn.id], {[djinn.id]: victime.id}).ok);
  if (fenetre === 'sort') { d[actif].main = ['tempete-de-sable']; assert.ok(rpgMobaLancerMagie(d, actif, 'tempete-de-sable', null, 'right', null, {ouvrirReponse:true}).sortEnAttente); }
  if (fenetre === 'creature') { d[actif].main = ['ashigaru-des-braises']; assert.ok(rpgMobaJouerCreature(d, actif, 'ashigaru-des-braises', 'right', 0, {ouvrirReponse:true}).creatureEnAttente); }
  if (fenetre === 'fin') { d[actif].main = []; assert.ok(rpgMobaTerminerTour(d, actif).ok); }
  const before = JSON.stringify(d);
  assert.equal(rpgMobaPeutEmbuscade(d, defenseur, id), false);
  assert.equal(rpgMobaJouerCreature(d, defenseur, id, 'left', 1, {ouvrirReponse:true, sacrificeIds:[]}).raison, 'pas-votre-tour');
  assert.equal(JSON.stringify(d), before);
  assert.ok(d[defenseur].creatures.includes(victime));
  if (fenetre === 'combat') assert.ok(rpgMobaLancerAttaque(d, actif, [djinn.id], {}, {declaree:true}).ok);
  if (fenetre === 'sort') assert.ok(rpgMobaPasserSort(d, defenseur).ok);
  if (fenetre === 'creature') assert.ok(rpgMobaPasserCreature(d, defenseur).ok);
  if (fenetre === 'fin') assert.ok(rpgMobaPasserFinDeTour(d, defenseur).ok);
  assert.ok(rpgMobaPlacementCoherent(d));
 });
}
for (const actif of ['joueur', 'sorcier']) {
 test(`Tojiro vérifie Djinn et créature blessée à son tour (${actif})`, () => {
  const {d, defenseur, victime, djinn} = partie(actif);
  assert.ok(rpgMobaTerminerTour(d, actif).ok);
  assert.ok(rpgMobaPasserFinDeTour(d, defenseur).ok);
  const carte = djinn.carteId; djinn.carteId = 'gardienne-des-portes-de-sable';
  assert.equal(rpgMobaInvocationSpecialeDisponible(d, defenseur, id), false);
  djinn.carteId = carte; victime.carteId = 'source-de-bimini';
  assert.equal(rpgMobaInvocationSpecialeDisponible(d, defenseur, id), false);
  victime.carteId = 'gardienne-des-portes-de-sable';
  assert.equal(rpgMobaInvocationSpecialeDisponible(d, defenseur, id), true);
  const result = rpgMobaJouerCreature(d, defenseur, id, 'left', 1, {sacrificeIds: []});
  assert.ok(result.ok, JSON.stringify(result));
  assert.ok(d[defenseur].creatures.includes(victime));
 });
}

for(const actif of ['joueur','sorcier']) test(`champ plein : Tojiro exempté ne peut pas remplacer une créature (${actif})`,()=>{
 const {d,defenseur,victime}=partie(actif,true);assert.ok(rpgMobaTerminerTour(d,actif).ok);
 const avant=JSON.stringify(d);assert.equal(rpgMobaPeutEmbuscade(d,defenseur,id),false);
 assert.equal(rpgMobaJouerCreature(d,defenseur,id,'left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]}).ok,false);
 assert.equal(JSON.stringify(d),avant);
});
for(const actif of ['joueur','sorcier']) test(`l’IA ne remplace pas de victime pour Tojiro sur champ plein (${actif})`,()=>{
 const {d,defenseur}=partie(actif,true);assert.ok(rpgMobaTerminerTour(d,actif).ok);const avant=JSON.stringify(d);
 assert.equal(rpgMobaChoisirEmbuscadeIA(d,defenseur),null);assert.equal(JSON.stringify(d),avant);
});
for (const actif of ['joueur', 'sorcier']) test(`Tojiro refusé ne suspend pas une capacité ciblée (${actif})`, () => {
 const {d, defenseur, victime} = partie(actif); d[actif].main = ['eclipse-silencieuse'];
 d[defenseur].main.push('trait-de-braise');
 assert.ok(rpgMobaJouerCreature(d, actif, 'eclipse-silencieuse', 'left', 1, {ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d, defenseur).arriveeEnAttente);
 assert.ok(rpgMobaResoudreArrivee(d, actif, victime.id).effetEnAttente);
 const initial = d.effetCreatureEnAttente, before = JSON.stringify(d);
 assert.equal(rpgMobaJouerCreature(d, defenseur, id, 'right', 0, {sacrificeIds:[]}).raison, 'pas-votre-tour');
 assert.equal(JSON.stringify(d), before); assert.equal(d.effetCreatureEnAttente, initial);
 assert.ok(rpgMobaPasserEffetCreature(d, defenseur).ok);
});

function tojiroEnJeu(side){
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);if(d.tour!==side)rpgFinDeTour(d);
 d[side].main=['gardienne-des-portes-de-sable',id];Object.assign(d[side].mana,{sable:20,braise:20});
 const victime=rpgMobaJouerCreature(d,side,'gardienne-des-portes-de-sable','left',0).entite;
 rpgFinDeTour(d);rpgFinDeTour(d);
 const tojiro=rpgMobaJouerCreature(d,side,id,'left',0,{sacrificeIds:[victime.id]}).entite;assert.ok(tojiro);
 rpgFinDeTour(d);const actif=d.tour;d[actif].main=['gardienne-des-portes-de-sable'];d[actif].mana.sable=20;
 const autre=rpgMobaJouerCreature(d,actif,'gardienne-des-portes-de-sable','right',0).entite;assert.ok(autre);rpgFinDeTour(d);rpgFinDeTour(d);
 d[actif].main=['trait-de-braise'];d[actif].mana.braise=20;return {d,actif,tojiro,autre};
}
for(const side of ['joueur','sorcier']){
 test(`Esquive contre un sort riposte sur la voie de Tojiro (${side})`,()=>{
  const {d,actif,tojiro,autre}=tojiroEnJeu(side);rpgReglerHasard(d,()=>0);const hp=d.moba.lanes.find(l=>l.id==='left').hp[actif];
  assert.ok(rpgMobaLancerMagie(d,actif,'trait-de-braise',tojiro.id).ok);assert.equal(tojiro.pv,5);assert.equal(d.moba.lanes.find(l=>l.id==='left').hp[actif],hp-5);assert.equal(autre.pv,4);
 });
 test(`Harakiri ignore une créature adverse dans une autre voie (${side})`,()=>{
  const {d,actif,tojiro,autre}=tojiroEnJeu(side);tojiro.pv=1;tojiro.def=1;rpgReglerHasard(d,()=>.5);
  const hp=d.moba.lanes.find(l=>l.id==='left').hp[actif];assert.ok(rpgMobaLancerMagie(d,actif,'trait-de-braise',tojiro.id).ok);
  assert.ok(!d[side].creatures.includes(tojiro));assert.equal(autre.pv,4);assert.equal(d.moba.lanes.find(l=>l.id==='left').hp[actif],hp-6);
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
for (const actif of ['joueur', 'sorcier']) test(`une annonce reste intacte après le refus de Tojiro (${actif})`, () => {
 const {d, defenseur, victime} = partie(actif); d[actif].main = ['ashigaru-des-braises'];
 assert.ok(rpgMobaJouerCreature(d, actif, 'ashigaru-des-braises', 'right', 0, {ouvrirReponse:true}).creatureEnAttente);
 const initial = d.mobaCreatureEnAttente, before = JSON.stringify(d);
 assert.equal(rpgMobaJouerCreature(d, defenseur, id, 'left', 1, {sacrificeIds:[]}).raison, 'pas-votre-tour');
 assert.equal(JSON.stringify(d), before); assert.equal(d.mobaCreatureEnAttente, initial);
 assert.ok(d[defenseur].creatures.includes(victime));
 assert.ok(rpgMobaPasserCreature(d, defenseur).entite);
});

test('Tojiro spécial à son tour ne déclenche pas les effets de mort', () => {
 const {d, defenseur, victime} = partie('sorcier');
 assert.ok(rpgMobaTerminerTour(d, 'sorcier').ok);
 assert.ok(rpgMobaPasserFinDeTour(d, defenseur).ok);
 const cimetiere = [...d[defenseur].cimetiere];
 const result = rpgMobaJouerCreature(d, defenseur, id, 'left', 1, {sacrificeIds:[]});
 assert.ok(result.ok, JSON.stringify(result));
 assert.ok(d[defenseur].creatures.includes(victime));
 assert.deepEqual(d[defenseur].cimetiere, cimetiere);
});

for(const side of ['joueur','sorcier']) for(const [jet, esquive] of [[0, true], [0.9, false]]) test(`un souffle de créature ${esquive ? 'esquivé' : 'encaissé'} réveille la riposte sur la même voie MOBA (${side})`,()=>{
 const {d,actif,tojiro}=tojiroEnJeu(side);
 d[actif].main=['ashigaru-des-braises'];d[actif].mana.braise=20;
 const sacrifice=rpgMobaJouerCreature(d,actif,'ashigaru-des-braises','left',0).entite;assert.ok(sacrifice);
 rpgFinDeTour(d);rpgFinDeTour(d); // Une invocation normale par tour.
 d[actif].main=['geant-des-banquises'];d[actif].mana.neige=20;
 rpgReglerHasard(d,()=>jet);
 const resultat=rpgMobaJouerCreature(d,actif,'geant-des-banquises','left',0,{sacrificeIds:[sacrifice.id]});
 assert.ok(resultat.ok,JSON.stringify(resultat));
 assert.equal(tojiro.pv,esquive ? 5 : 4);
 if(esquive) assert.equal(tojiro.gelToursRestants ?? 0,0);
 else assert.ok(tojiro.gelToursRestants > 0);
 assert.equal(d.log.some(ligne=>ligne.includes('esquive la capacité')),esquive);
 assert.ok(d.log.some(ligne=>ligne.includes('Contre-attaque')));
 assert.ok(!d[actif].creatures.some(e=>e.carteId==='geant-des-banquises'), 'la source encaisse la riposte, même après Esquive');
});
for(const side of ['joueur','sorcier']) for (const [jet, esquive] of [[0, true], [0.9, false]]) test(`une capacité ciblée ${esquive ? 'esquivée' : 'encaissée'} réveille la riposte de Tojiro (${side})`,()=>{
 const {d,actif,tojiro,autre}=tojiroEnJeu(side);d[actif].main=['eclipse-silencieuse'];Object.assign(d[actif].mana,{sable:20,tenebres:20});
 const source=rpgMobaJouerCreature(d,actif,'eclipse-silencieuse','left',0).entite;assert.ok(source);rpgReglerHasard(d,()=>jet);
 const result=rpgMobaResoudreArrivee(d,actif,tojiro.id);assert.ok(result.ok,JSON.stringify(result));
 assert.equal(tojiro.atk,esquive ? 5 : 3);assert.ok(!d[actif].creatures.includes(source));assert.equal(autre.pv,4);
 assert.equal(d.log.some(ligne=>ligne.includes('esquive la capacité')),esquive);
});
for(const actif of ['joueur','sorcier']) test(`champ plein : la capacité ciblée se résout sans réponse Tojiro impossible (${actif})`,()=>{
 const {d,defenseur,victime}=partie(actif,true);d[actif].main=['eclipse-silencieuse'];Object.assign(d[actif].mana,{sable:20,tenebres:20});
 assert.ok(rpgMobaJouerCreature(d,actif,'eclipse-silencieuse','left',1,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,defenseur).arriveeEnAttente);
 const result = rpgMobaResoudreArrivee(d,actif,victime.id);assert.ok(result.ok,JSON.stringify(result));
 assert.ok(!result.effetEnAttente);assert.equal(rpgMobaPeutEmbuscade(d,defenseur,id),false);
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

test('l’IA ne propose pas Tojiro pendant le tour adverse', () => {
 const {d, defenseur, victime} = partie('joueur');
 Object.assign(victime, {atk:18, pv:17, def:18, pvMax:18});
 assert.ok(rpgMobaTerminerTour(d, 'joueur').ok);
 const before = JSON.stringify(d);
 assert.equal(rpgMobaChoisirEmbuscadeIA(d, defenseur), null);
 assert.equal(JSON.stringify(d), before);
});

test('une Invocation spéciale à son tour laisse l’invocation normale disponible', () => {
 const {d, defenseur, victime} = partie('sorcier');
 assert.ok(rpgMobaTerminerTour(d, 'sorcier').ok);
 assert.ok(rpgMobaPasserFinDeTour(d, defenseur).ok);
 const special = rpgMobaJouerCreature(d, defenseur, id, 'left', 1, {sacrificeIds:[]});
 assert.ok(special.ok, JSON.stringify(special));
 assert.equal(d.moba.creaturesJouees[defenseur], false);
 assert.ok(d[defenseur].creatures.includes(victime));
 d[defenseur].main = ['anqa-des-braises'];
 assert.ok(rpgMobaJouerCreature(d, defenseur, 'anqa-des-braises', 'left', 1, {sacrificeIds:[special.entite.id]}).ok);
 assert.equal(d.moba.creaturesJouees[defenseur], true);
});
