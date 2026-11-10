import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgDemarrerManaEssai,rpgFinDeTour,rpgMulligan} from '../src/games/rpgDuel.js';
import {rpgMobaNouveauDuel,rpgMobaJouerCreature,rpgMobaPeutEmbuscade,rpgMobaPasserCreature,rpgMobaLancerMagie,rpgMobaPlacementCoherent,MOBA_CARTES_AUTORISEES} from '../src/games/rpgMobaLocal.js';
const id='sorcier-du-ressac-noir';
function annonce(side, avecAllie = false){
 const deck=Array(30).fill('ashigaru-des-braises'),d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 if(side==='sorcier')rpgFinDeTour(d);
 const defender=side==='joueur'?'sorcier':'joueur';
 d[side].mana.braise=20;
 if (avecAllie) { d[side].main=['ashigaru-des-braises']; assert.ok(rpgMobaJouerCreature(d,side,'ashigaru-des-braises','right',0).entite); }
 d[side].main=['ronin-du-soleil-rouge'];
 d[defender].main=[id];Object.assign(d[defender].mana,{eau:10,tenebres:10});
 assert.ok(rpgMobaJouerCreature(d,side,'ronin-du-soleil-rouge','left',0,{ouvrirReponse:true}).creatureEnAttente);
 return {d,defender};
}
for(const side of ['joueur','sorcier']) {
 test(`${side} annonce : le Sorcier contre la réserve déjà payée et arrive`,()=>{
  const {d,defender}=annonce(side);assert.ok(MOBA_CARTES_AUTORISEES.includes(id));
  const original=d.mobaCreatureEnAttente;const mana=d[side].mana.braise;
  assert.ok(rpgMobaPeutEmbuscade(d,defender,id));
  const annonceS=rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true});
  assert.ok(annonceS.creatureEnAttente,JSON.stringify(annonceS));assert.equal(d.mobaCreatureEnAttente.origineCreature,original);
  assert.equal(rpgMobaPasserCreature(d,defender).ok,false);
  const result=rpgMobaPasserCreature(d,side);assert.ok(result.entite,JSON.stringify(result));
  assert.equal(result.entite.carteId,id);assert.equal(d.mobaCreatureEnAttente,null);
  assert.equal(d[side].mana.braise,mana);assert.deepEqual(d[side].cimetiere,['ronin-du-soleil-rouge']);
  assert.equal(d.fenetreReponse,false);assert.ok(rpgMobaPlacementCoherent(d));
 });
 test(`${side} contre le Sorcier : la première annonce revient sans double paiement`,()=>{
  const {d,defender}=annonce(side);const original=d.mobaCreatureEnAttente;const mana=d[side].mana.braise;
  assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
  d[side].main=['ecueil'];d[side].mana.eau=10;
  const counter=rpgMobaLancerMagie(d,side,'ecueil');assert.equal(counter.contre,true,JSON.stringify(counter));
  assert.equal(d.mobaCreatureEnAttente,original);assert.equal(d.fenetreReponse,true);
  const manaApresContre = structuredClone(d[side].mana);
  assert.deepEqual(d[defender].cimetiere,[id]);assert.equal(d[side].cimetiere.includes(original.carteId),false);
  assert.ok(rpgMobaPasserCreature(d,defender).entite);assert.deepEqual(d[side].mana,manaApresContre);assert.ok(rpgMobaPlacementCoherent(d));
 });
 test(`${side} : case invalide refuse le Sorcier sans changer la réserve`,()=>{
  const {d,defender}=annonce(side);const before=JSON.stringify(d);
  assert.equal(rpgMobaJouerCreature(d,defender,id,'left',8,{ouvrirReponse:true}).ok,false);assert.equal(JSON.stringify(d),before);
 });
}

test('IA choisit le Sorcier sur copie pour contrer une créature annoncée', async () => {
  const { rpgMobaChoisirEmbuscadeIA } = await import('../src/games/rpgMobaAI.js');
  const {d,defender}=annonce('joueur'); const avant=JSON.stringify(d);
  const choix=rpgMobaChoisirEmbuscadeIA(d,defender);
  assert.equal(choix?.id,id); assert.equal(JSON.stringify(d),avant);
  assert.ok(rpgMobaJouerCreature(d,defender,id,choix.lane,choix.slot,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,'joueur').entite);
});

test('une réponse rapide non contrante laisse le Sorcier et son annonce originale en attente',()=>{
  const {d,defender}=annonce('joueur', true); const original=d.mobaCreatureEnAttente;
  assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
  d.joueur.main=['parade-du-verre'];d.joueur.mana.eau=20;
  const res=rpgMobaLancerMagie(d,'joueur','parade-du-verre', d.joueur.creatures[0].id);
  assert.ok(res.ok,JSON.stringify(res)); assert.equal(d.mobaCreatureEnAttente.origineCreature,original);
  assert.equal(d.fenetreReponse,true); assert.ok(rpgMobaPasserCreature(d,'joueur').entite);
});

test('l’IA évalue un contre du Sorcier en simulant le retour de sa propre créature',async()=>{
 const {rpgMobaChoisirMagieIA}=await import('../src/games/rpgMobaAI.js');
 const {d,defender}=annonce('sorcier');
 assert.ok(rpgMobaJouerCreature(d,defender,id,'left',0,{ouvrirReponse:true}).ok);
 d.sorcier.main=['ecueil'];d.sorcier.mana.eau=20;
 const avant=JSON.stringify(d);const choix=rpgMobaChoisirMagieIA(d,'sorcier',true);
 assert.equal(choix?.id,'ecueil');assert.equal(JSON.stringify(d),avant);
});

test('le Sorcier ne peut pas répondre à un Site annoncé',()=>{
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 d.joueur.main=['source-de-bimini'];Object.assign(d.joueur.mana,{eau:20,sable:20});
 d.sorcier.main=[id];Object.assign(d.sorcier.mana,{eau:20,tenebres:20});
 assert.ok(rpgMobaJouerCreature(d,'joueur','source-de-bimini','left',0,{ouvrirReponse:true}).creatureEnAttente);
 const avant=JSON.stringify(d);assert.equal(rpgMobaPeutEmbuscade(d,'sorcier',id),false);
 assert.equal(rpgMobaJouerCreature(d,'sorcier',id,'left',0,{ouvrirReponse:true}).ok,false);assert.equal(JSON.stringify(d),avant);
});

test('le Sorcier se joue normalement pendant son tour',()=>{
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 d.joueur.main=[id];Object.assign(d.joueur.mana,{eau:20,tenebres:20});
 assert.equal(rpgMobaJouerCreature(d,'joueur',id,'left',0).entite?.carteId,id);
});

test('une créature contrecarrée ne sacrifie pas ses victimes réservées',()=>{
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 d.joueur.main=['ashigaru-des-braises'];d.joueur.mana.braise=20;
 const victime=rpgMobaJouerCreature(d,'joueur','ashigaru-des-braises','left',0).entite;
 d.joueur.main=['ifrit-des-ergs'];d.joueur.mana.braise=20;
 d.sorcier.main=[id];Object.assign(d.sorcier.mana,{eau:20,tenebres:20});
 const annonce=rpgMobaJouerCreature(d,'joueur','ifrit-des-ergs','left',0,{ouvrirReponse:true,sacrificeIds:[victime.id]});
 assert.ok(annonce.creatureEnAttente,JSON.stringify(annonce));
 assert.ok(rpgMobaJouerCreature(d,'sorcier',id,'left',0,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,'joueur').entite);
 assert.ok(d.joueur.creatures.some(e=>e.id===victime.id));assert.ok(d.joueur.cimetiere.includes('ifrit-des-ergs'));
});
