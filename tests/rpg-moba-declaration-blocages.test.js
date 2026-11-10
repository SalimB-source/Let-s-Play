import test from 'node:test';
import assert from 'node:assert/strict';
import {rpgMulligan,rpgDemarrerManaEssai,rpgFinDeTour} from '../src/games/rpgDuel.js';
import {rpgMobaNouveauDuel,rpgMobaJouerCreature,rpgMobaDeclarerAttaque,rpgMobaDeclarerBlocages,rpgMobaLancerAttaque,rpgMobaPeutEmbuscade,rpgMobaPasserCreature,rpgMobaLancerMagie,MOBA_CARTES_AUTORISEES} from '../src/games/rpgMobaLocal.js';

function partie(side, cibleRapide = false){
 const deck=Array(30).fill('ashigaru-des-braises'); const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 const defender=side==='joueur'?'sorcier':'joueur';
 if(side==='joueur')rpgFinDeTour(d);
 d[defender].main=['vampire-des-braises','vampire-des-braises'];d[defender].mana.braise=20;
 const b=rpgMobaJouerCreature(d,defender,'vampire-des-braises','left',0).entite;
 const horsVoie=rpgMobaJouerCreature(d,defender,'vampire-des-braises','right',0).entite;
 assert.ok(b&&horsVoie);rpgFinDeTour(d);
 const attaquant = cibleRapide ? 'sorcier-du-ressac-noir' : 'ronin-du-soleil-rouge';
 d[side].main=[attaquant];Object.assign(d[side].mana,{braise:20,eau:20,tenebres:20});
 const a=rpgMobaJouerCreature(d,side,attaquant,'left',0).entite;assert.ok(a);a.ready=true;
 assert.ok(rpgMobaDeclarerAttaque(d,side,[a.id],cibleRapide ? {[a.id]:b.id} : {}).ok);return {d,a,b,horsVoie,defender};
}
for(const side of ['joueur','sorcier']){
 test(`déclaration des bloqueurs : validation et verrouillage sans combat (${side})`,()=>{
  const {d,a,b,defender}=partie(side);const pv=a.pv;const resultat=rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]});
  assert.ok(resultat.ok,JSON.stringify(resultat));assert.equal(a.pv,pv);assert.equal(d.phase,'blocage');
  assert.deepEqual(d.combatDeclare.blocages,{[a.id]:[b.id]});resultat.blocages[a.id].push('invalide');
  assert.deepEqual(d.combatDeclare.blocages,{[a.id]:[b.id]});
  const before=JSON.stringify(d);assert.equal(rpgMobaDeclarerBlocages(d,defender,{}).ok,false);
  assert.equal(rpgMobaLancerAttaque(d,side,[a.id],{}, {declaree:true}).ok,false);assert.equal(JSON.stringify(d),before);
  assert.ok(rpgMobaLancerAttaque(d,side,[a.id],{[a.id]:[b.id]}, {declaree:true}).ok);
 });
 test(`déclaration illégale ne modifie rien (${side})`,()=>{
  const {d,a,b,horsVoie,defender}=partie(side);
  for(const blocks of [{[a.id]:[horsVoie.id]},{[a.id]:[b.id,b.id]}]){
   const before=JSON.stringify(d);assert.equal(rpgMobaDeclarerBlocages(d,defender,blocks).ok,false);assert.equal(JSON.stringify(d),before);
  }
  b.gelToursRestants=1;const before=JSON.stringify(d);
  assert.equal(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]}).ok,false);assert.equal(JSON.stringify(d),before);
 });
}

const porte='porte-etendard-de-leclipse';
for(const side of ['joueur','sorcier']){
 test(`Porte-étendard : Vampire bloqueur donne accès à l’Embuscade (${side})`,()=>{
  const {d,a,b,horsVoie,defender}=partie(side);d[defender].main=[porte];Object.assign(d[defender].mana,{sable:20,tenebres:20});
  assert.ok(MOBA_CARTES_AUTORISEES.includes(porte));assert.equal(rpgMobaPeutEmbuscade(d,defender,porte),false);
  assert.ok(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]}).ok);assert.ok(rpgMobaPeutEmbuscade(d,defender,porte));
  assert.ok(rpgMobaJouerCreature(d,defender,porte,'left',1,{ouvrirReponse:true}).creatureEnAttente);
  const result=rpgMobaPasserCreature(d,side);assert.ok(result.entite,JSON.stringify(result));
  assert.equal(b.pvMax,4);assert.equal(result.entite.pvMax,5);assert.equal(horsVoie.pvMax,2);
  assert.deepEqual(d.combatDeclare.blocages,{[a.id]:[b.id]});assert.equal(rpgMobaLancerAttaque(d,side,[a.id],{[a.id]:[result.entite.id]}, {declaree:true}).ok,false);
  assert.ok(rpgMobaLancerAttaque(d,side,[a.id],d.combatDeclare.blocages,{declaree:true}).ok);
 });
 test(`Porte-étendard contrecarré : blocages toujours verrouillés (${side})`,()=>{
  const {d,a,b,defender}=partie(side);d[defender].main=[porte];Object.assign(d[defender].mana,{sable:20,tenebres:20});
  d[side].main=['ecueil'];d[side].mana.eau=20;
  assert.ok(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]}).ok);
  assert.ok(rpgMobaJouerCreature(d,defender,porte,'left',1,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaLancerMagie(d,side,'ecueil').contre);
  assert.deepEqual(d.combatDeclare.blocages,{[a.id]:[b.id]});assert.equal(b.pvMax,2);
  assert.ok(rpgMobaLancerAttaque(d,side,[a.id],d.combatDeclare.blocages,{declaree:true}).ok);
 });
}
test('IA choisit le Porte-étendard dans une voie où le renfort est utile',async()=>{
 const {rpgMobaChoisirEmbuscadeIA}=await import('../src/games/rpgMobaAI.js');
 const {d,a,b,defender}=partie('joueur');d[defender].main=[porte];Object.assign(d[defender].mana,{sable:20,tenebres:20});
 assert.ok(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]}).ok);const avant=JSON.stringify(d);
 const choix=rpgMobaChoisirEmbuscadeIA(d,defender);assert.equal(choix?.id,porte);assert.equal(JSON.stringify(d),avant);
 assert.ok(rpgMobaJouerCreature(d,defender,porte,choix.lane,choix.slot,{ouvrirReponse:true}).ok);assert.ok(rpgMobaPasserCreature(d,'joueur').ok);
});
for(const side of ['joueur','sorcier']) test(`Porte-étendard : un bloqueur retiré en réponse reste une attaque bloquée (${side})`,()=>{
 const {d,a,b,defender}=partie(side);d[defender].main=[porte];Object.assign(d[defender].mana,{sable:20,tenebres:20});
 d[side].main=['frappe-iaijutsu'];d[side].mana.braise=20;
 assert.ok(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]}).ok);
 assert.ok(rpgMobaJouerCreature(d,defender,porte,'left',1,{ouvrirReponse:true}).ok);
 const retrait=rpgMobaLancerMagie(d,side,'frappe-iaijutsu',b.id);assert.ok(retrait.ok,JSON.stringify(retrait));
 assert.ok(!d[defender].creatures.includes(b));assert.deepEqual(d.combatDeclare.blocages,{[a.id]:[]});
 assert.ok(rpgMobaPasserCreature(d,side).entite);
 assert.ok(rpgMobaLancerAttaque(d,side,[a.id],d.combatDeclare.blocages,{declaree:true}).ok);
 assert.equal(d.moba.lanes.find(l=>l.id==='left').hp[defender],20);
});
for(const side of ['joueur','sorcier']) test(`Porte-étendard répond à une Attaque ciblée visant un Vampire (${side})`,()=>{
 const {d,a,b,defender}=partie(side,true);d[defender].main=[porte];Object.assign(d[defender].mana,{sable:20,tenebres:20});
 assert.ok(rpgMobaPeutEmbuscade(d,defender,porte));
 assert.ok(rpgMobaJouerCreature(d,defender,porte,'left',1,{ouvrirReponse:true}).ok);
 assert.ok(rpgMobaPasserCreature(d,side).entite);assert.equal(b.pvMax,4);
 assert.ok(rpgMobaLancerAttaque(d,side,[a.id],{}, {declaree:true}).ok);
});
for(const side of ['joueur','sorcier']) test(`Porte-étendard normal : renfort temporaire seulement dans sa voie (${side})`,()=>{
 const {d,a,b,horsVoie,defender}=partie(side);
 assert.ok(rpgMobaLancerAttaque(d,side,[a.id],{}, {declaree:true}).ok);rpgFinDeTour(d);
 d[defender].main=[porte];Object.assign(d[defender].mana,{sable:20,tenebres:20});
 const p=rpgMobaJouerCreature(d,defender,porte,'left',1);assert.ok(p.entite,JSON.stringify(p));
 assert.equal(b.pvMax,4);assert.equal(p.entite.pvMax,5);assert.equal(horsVoie.pvMax,2);
 rpgFinDeTour(d);assert.equal(b.pvMax,2);assert.equal(p.entite.pvMax,3);
});
test('Réanimation du Porte-étendard : renfort limité à la voie de retour',()=>{
 const deck=Array(30).fill('ashigaru-des-braises');const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
 assert.ok(rpgMulligan(d,'joueur',[]).ok&&rpgMulligan(d,'sorcier',[]).ok&&rpgDemarrerManaEssai(d).ok);
 d.joueur.main=['vampire-des-braises','vampire-des-braises'];d.joueur.mana.braise=20;
 const local=rpgMobaJouerCreature(d,'joueur','vampire-des-braises','left',0).entite;
 const autre=rpgMobaJouerCreature(d,'joueur','vampire-des-braises','right',0).entite;
 d.joueur.cimetiere=[porte];d.joueur.main=['reanimation'];d.joueur.mana.sable=20;
 const r=rpgMobaLancerMagie(d,'joueur','reanimation',null,'left',null,{emplacementReanimation:1});assert.ok(r.ok,JSON.stringify(r));
 assert.equal(local.pvMax,4);assert.equal(autre.pvMax,2);
 assert.equal(d.joueur.creatures.find(e=>e.carteId===porte).pvMax,5);
});
test('les contraintes de blocage sont validées avant le verrouillage',()=>{
 const {d,a,b,defender}=partie('joueur');
 a.envol=true;const avant=JSON.stringify(d);
 assert.equal(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]}).ok,false);assert.equal(JSON.stringify(d),avant);
 a.envol=false;a.provocation=true;
 const avantProvoc=JSON.stringify(d);assert.equal(rpgMobaDeclarerBlocages(d,defender,{}).ok,false);assert.equal(JSON.stringify(d),avantProvoc);
 assert.ok(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id]}).ok);
 b.gelToursRestants=1;assert.ok(rpgMobaLancerAttaque(d,'joueur',[a.id],d.combatDeclare.blocages,{declaree:true}).ok);
});

test('la disparition d’un attaquant déclaré retire ses blocages sans libérer les autres',()=>{
 const {d,a,b,horsVoie,defender}=partie('joueur');
 // Un second attaquant existe dans l'autre voie au moment de la déclaration.
 d.combatDeclare=null;d.phase='principale';d.fenetreReponse=false;
 d.joueur.main=['ashigaru-des-braises'];d.joueur.mana.braise=20;
 const autre=rpgMobaJouerCreature(d,'joueur','ashigaru-des-braises','right',0).entite;autre.ready=true;
 assert.ok(rpgMobaDeclarerAttaque(d,'joueur',[a.id,autre.id]).ok);
 assert.ok(rpgMobaDeclarerBlocages(d,defender,{[a.id]:[b.id],[autre.id]:[horsVoie.id]}).ok);
 d[defender].main=['trait-de-braise'];d[defender].mana.braise=20;
 assert.ok(rpgMobaLancerMagie(d,defender,'trait-de-braise',a.id).ok);
 assert.deepEqual(d.combatDeclare.attaquants,[autre.id]);assert.deepEqual(d.combatDeclare.blocages,{[autre.id]:[horsVoie.id]});
 assert.ok(rpgMobaLancerAttaque(d,'joueur',[autre.id],d.combatDeclare.blocages,{declaree:true}).ok);
});
