import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { sacrificesAutomatiquesAscension, validerMateriauxAscension } from '../src/games/rpgAscension.js';
import { rpgCartesRenfortChoisi, rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgActionsEtat, rpgBlesserCreature, rpgAttaquerCreature, rpgAttaquerSorcier, rpgReglerHasard, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaResoudreRecherche, rpgMobaResoudreArrivee, rpgMobaPlacementCoherent, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';

function partie(moba = false) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), pvp: true, modeMana: 'essai', rng: () => .5 });
  d.mulliganFait = { joueur:true, sorcier:true }; d.manaEssaiDemarre = true;
  for (const side of ['joueur','sorcier']) { d[side].main=[]; d[side].manaChoixEnAttente=null; }
  return d;
}
for (const moba of [false,true]) for (const side of ['joueur','sorcier']) test(`Gardienne : choix au cimetière et arrivée ciblée (${moba?'MOBA':'PvP'} ${side})`, () => {
  const d = partie(moba); d.tour=side; d[side].main=['gardienne-des-sables-ensevelis'];
  d[side].cimetiere=['viking-des-neiges','guerrier-au-bouclier-rond','trait-de-braise','daimyo-du-soleil-rouge'];
  const pose = moba ? rpgMobaJouerCreature(d,side,'gardienne-des-sables-ensevelis','left',0) : rpgPvpAppliquer(d,side,{type:'jouer-carte',carteId:'gardienne-des-sables-ensevelis'});
  assert.ok(pose.ok, JSON.stringify(pose));
  const cartes=rpgCartesRenfortChoisi(d,side); assert.deepEqual(cartes.map(c=>c.id),['guerrier-au-bouclier-rond','viking-des-neiges']);
  const choix=cartes[0]; const resultat=moba?rpgMobaResoudreRecherche(d,side,choix.id,choix.index):rpgPvpAppliquer(d,side,{type:'choisir-renfort',index:choix.index});
  assert.ok(resultat.ok, JSON.stringify(resultat));
  const e=d[side].creatures.find(x=>x.carteId===choix.id); assert.ok(e); assert.equal(e.malInvocation,true);
  assert.equal(d.arriveeEnAttente?.entiteId,e.id);
  const arrivee=moba?rpgMobaResoudreArrivee(d,side,e.id):rpgPvpAppliquer(d,side,{type:'resoudre-arrivee',cibleId:e.id});
  assert.ok(arrivee.ok, JSON.stringify(arrivee)); assert.equal(e.bouclier,1);
  assert.ok(d[side].cimetiere.includes('trait-de-braise')); assert.ok(d[side].cimetiere.includes('daimyo-du-soleil-rouge'));
  if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});

test('Ascension : la combinaison valide des présences les plus faibles est déterministe', () => {
 const camp={creatures:[
   {id:'fort',carteId:'ronin-du-soleil-rouge',atk:8,pv:8},
   {id:'faible',carteId:'ronin-du-soleil-rouge',atk:2,pv:1},
   {id:'autre',carteId:'onna-musha-des-cendres',atk:3,pv:3},
   {id:'invalide',carteId:'hatamoto-des-cendres',atk:0,pv:1},
 ]};
 const carte=cardById('samourai-du-dragon-rouge');
 const ids=sacrificesAutomatiquesAscension(camp,carte);
 assert.deepEqual(ids,['faible','autre']); assert.ok(validerMateriauxAscension(camp,carte,ids).ok);
 assert.deepEqual(sacrificesAutomatiquesAscension({creatures:[]},carte),[]);
});

for (const moba of [false,true]) for (const side of ['joueur','sorcier']) test(`Réanimation : arrivée ciblée résolue (${moba?'MOBA':'PvP'} ${side})`, () => {
  const d=partie(moba); d.tour=side; d[side].main=['reanimation']; d[side].cimetiere=['guerrier-au-bouclier-rond']; d[side].mana.sable=20;
  const r=moba?rpgMobaLancerMagie(d,side,'reanimation',null,'left',null,{emplacementReanimation:0}):rpgPvpAppliquer(d,side,{type:'jouer-carte',carteId:'reanimation'});
  assert.ok(r.ok,JSON.stringify(r)); choisirCimetiere(d,side,'guerrier-au-bouclier-rond');
  const e=d[side].creatures[0]; assert.ok(e); assert.equal(d.arriveeEnAttente?.entiteId,e.id);
  const arrivee=moba?rpgMobaResoudreArrivee(d,side,e.id):rpgPvpAppliquer(d,side,{type:'resoudre-arrivee',cibleId:e.id}); assert.ok(arrivee.ok,JSON.stringify(arrivee));
  assert.equal(e.bouclier,1); if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) for (const scenario of [
  {id:'valkyrie-de-la-derniere-aurore', mat:['guerrier-au-bouclier-rond','gardien-viking-du-fjord'], valkyrie:true},
  {id:'amiral-des-abysses', mat:['rais-de-la-galiote','la-vengeance-de-la-reine-anne'], amiral:true},
  {id:'serpent-des-deux-rivages', mat:['cotre-de-course','la-vengeance-de-la-reine-anne'], cible:true},
]) test(`${scenario.id} : recette et arrivée réelles (${moba?'MOBA':'Duel'})`, () => {
  const d=partie(moba); d.tour='joueur'; d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
  const victimes=[];
  for (let i=0;i<2;i++) {
    const id=scenario.mat[i]; d.joueur.invocationNormaleJouee=false; if(moba) d.moba.creaturesJouees.joueur=false;
    d.joueur.main=[id]; const r=moba?rpgMobaJouerCreature(d,'joueur',id,'left',i):rpgJouerCreature(d,'joueur',id,null,{cibleDifferee:true});
    assert.ok(r.ok,JSON.stringify(r)); victimes.push(r.entite);
    if(d.arriveeEnAttente){const a=moba?rpgMobaResoudreArrivee(d,'joueur',r.entite.id):rpgPvpAppliquer(d,'joueur',{type:'resoudre-arrivee',cibleId:r.entite.id});assert.ok(a.ok,JSON.stringify(a));}
  }
  assert.ok(validerMateriauxAscension(d.joueur,cardById(scenario.id),victimes.map(e=>e.id)).ok);
  d.joueur.deck=Array(5).fill('chien-du-guet'); d.joueur.main=[];
  const r=moba?rpgMobaJouerCreature(d,'joueur',scenario.id,'left',0,{sacrificeIds:victimes.map(e=>e.id)}):rpgJouerCreature(d,'joueur',scenario.id,null,{sacrificeIds:victimes.map(e=>e.id),cibleDifferee:true});
  assert.ok(r.ok,JSON.stringify(r)); assert.equal(d.joueur.creatures.some(e=>e.carteId===scenario.id),true);
  if(scenario.valkyrie) { assert.equal(r.entite.rapidite,false); assert.equal(r.entite.envol,true); assert.equal(r.entite.volDeVie,true); }
  if(scenario.amiral) { assert.equal(r.entite.bouclier,1); assert.equal(r.entite.atk,4); assert.equal(r.entite.pv,4); assert.equal(d.joueur.main.length,1); }
  if(scenario.cible) {assert.equal(d.arriveeEnAttente?.entiteId,r.entite.id); const a=moba?rpgMobaResoudreArrivee(d,'joueur',r.entite.id):rpgPvpAppliquer(d,'joueur',{type:'resoudre-arrivee',cibleId:r.entite.id});assert.ok(a.ok,JSON.stringify(a));assert.equal(r.entite.bouclier,1);assert.equal(r.entite.atk,8);assert.equal(r.entite.pv,8);}
  if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Gardienne : chaîne limitée à une activation par tour (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba); d.joueur.main=['reanimation']; d.joueur.mana.sable=20;
 d.joueur.cimetiere=['gardienne-des-sables-ensevelis','viking-des-neiges','gardienne-des-sables-ensevelis'];
 const r=moba?rpgMobaLancerMagie(d,'joueur','reanimation',null,'left',null,{emplacementReanimation:0}):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'reanimation'});
 assert.ok(r.ok,JSON.stringify(r)); choisirCimetiere(d,'joueur','gardienne-des-sables-ensevelis');
 const c=rpgCartesRenfortChoisi(d,'joueur'); assert.deepEqual(c.map(x=>x.id),['viking-des-neiges']);
 const rr=moba?rpgMobaResoudreRecherche(d,'joueur',c[0].id,c[0].index):rpgPvpAppliquer(d,'joueur',{type:'choisir-renfort',index:c[0].index});
 assert.ok(rr.ok); assert.equal(d.joueur.creatures.length,2); assert.equal(d.joueur.creatures.find(e => e.carteId === 'viking-des-neiges').bouclier, 1); assert.ok(!d.renfortChoixEnAttente && !d.mobaRechercheEnAttente);
 // Une seconde copie peut arriver, mais ne rouvre pas la capacité ce tour.
 d.joueur.main=['gardienne-des-sables-ensevelis']; d.joueur.invocationNormaleJouee=false;
 if(moba) d.moba.creaturesJouees.joueur=false;
 const seconde=moba?rpgMobaJouerCreature(d,'joueur','gardienne-des-sables-ensevelis','right',0):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'gardienne-des-sables-ensevelis'});
 assert.ok(seconde.ok,JSON.stringify(seconde)); assert.ok(!d.renfortChoixEnAttente && !d.mobaRechercheEnAttente);
 if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});

test('chaque recette exige le coût imprimé de son Ascension, même si son seuil configuré diverge', async () => {
 const { RPG_ASCENSION_CARDS } = await import('../src/games/rpgAscensionCards.js');
 for (const carte of RPG_ASCENSION_CARDS) assert.equal(carte.ascension.coutTotal, carte.cost, carte.id);
 const dragon=cardById('samourai-du-dragon-rouge');
 const camp={creatures:[{id:'a',carteId:'ronin-du-soleil-rouge',pv:2,atk:2},{id:'b',carteId:'ronin-du-soleil-rouge',pv:2,atk:2},{id:'c',carteId:'onna-musha-des-cendres',pv:3,atk:3}]};
 const modifiee={...dragon,ascension:{...dragon.ascension,coutTotal:6}};
 assert.equal(validerMateriauxAscension(camp,modifiee,['a','b']).raison,'ascension-cout');
 assert.ok(validerMateriauxAscension(camp,modifiee,['a','c']).ok);
 assert.deepEqual(sacrificesAutomatiquesAscension(camp,modifiee),['a','c']);
});

function poserPourCapacite(d, side, id, lane, slot) {
 d.tour=side; d[side].invocationNormaleJouee=false;
 if(d.moba) d.moba.creaturesJouees[side]=false;
 d[side].main=[id];
 const r=d.moba?rpgMobaJouerCreature(d,side,id,lane,slot):rpgJouerCreature(d,side,id,null,{cibleDifferee:true});
 assert.ok(r.ok,JSON.stringify(r));
 if(d.arriveeEnAttente) {
   const a=d.moba?rpgMobaResoudreArrivee(d,side,r.entite.id):rpgPvpAppliquer(d,side,{type:'resoudre-arrivee',cibleId:r.entite.id});
   assert.ok(a.ok,JSON.stringify(a));
 }
 return r.entite;
}

for (const moba of [false,true]) for (const [id, attendu] of [
 ['chien-du-guet', [2,0]], ['porteuse-de-cruches',[0,2]], ['soi',[2,2]],
]) test(`Serpent : bonus selon la couleur ${id} (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba); d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const victimes=['cotre-de-course','la-vengeance-de-la-reine-anne'].map((c,i)=>poserPourCapacite(d,'joueur',c,'left',i));
 const allie=id==='soi'?null:poserPourCapacite(d,'joueur',id,'right',0);
 d.tour='joueur'; d.joueur.main=[];
 const ids=victimes.map(e=>e.id);
 const r=moba?rpgMobaJouerCreature(d,'joueur','serpent-des-deux-rivages','left',0,{sacrificeIds:ids}):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'serpent-des-deux-rivages',sacrificeIds:ids,cibleDifferee:true});
 assert.ok(r.ok,JSON.stringify(r)); const cible=allie??d.joueur.creatures.find(e=>e.carteId==='serpent-des-deux-rivages'); const avant={atk:cible.atk,pv:cible.pv,pvMax:cible.pvMax};
 const a=moba?rpgMobaResoudreArrivee(d,'joueur',cible.id):rpgPvpAppliquer(d,'joueur',{type:'resoudre-arrivee',cibleId:cible.id});
 assert.ok(a.ok,JSON.stringify(a));assert.equal(cible.bouclier,1);assert.equal(cible.atk,avant.atk+attendu[0]);assert.equal(cible.pv,avant.pv+attendu[1]);assert.equal(cible.pvMax,avant.pvMax+attendu[1]);
 if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});

test('les sept recettes nomment des cartes distinctes et refusent une substitution de même coût', async () => {
 const { RPG_ASCENSION_CARDS } = await import('../src/games/rpgAscensionCards.js');
 const { RPG_CREATURE_CARDS } = await import('../src/games/rpgCards.js');
 const { combinaisonsAscension, libelleRecetteAscension } = await import('../src/games/rpgAscension.js');
 for (const carte of RPG_ASCENSION_CARDS) {
   const roles=carte.ascension.materiaux; assert.ok([2,3].includes(roles.length),carte.id);
   assert.equal(new Set(roles.map(r=>r.carteId)).size,roles.length,carte.id);
   const presences=roles.map((role,i)=>({id:`id-${i}`,carteId:role.carteId,pv:4,atk:2}));
   assert.equal(roles.reduce((n,r)=>n+cardById(r.carteId).cost,0),carte.cost,carte.id);
   assert.ok(validerMateriauxAscension({creatures:presences},carte,presences.map(e=>e.id)).ok,carte.id);
   assert.ok(validerMateriauxAscension({creatures:presences},carte,presences.map(e=>e.id).reverse()).ok,carte.id);
   for(const role of roles) assert.ok(libelleRecetteAscension(carte).includes(cardById(role.carteId).name),carte.id);
   const cout=cardById(roles[0].carteId).cost;
   const autre=RPG_CREATURE_CARDS.find(c=>c.cost===cout && !roles.some(r=>r.carteId===c.id) && cardById(c.id)?.kind==='creature');
   assert.ok(autre,carte.id);
   const mauvaises=[{...presences[0],carteId:autre.id},...presences.slice(1)];
   assert.equal(validerMateriauxAscension({creatures:mauvaises},carte,mauvaises.map(e=>e.id)).ok,false,carte.id);
   assert.equal(combinaisonsAscension({creatures:mauvaises},carte).length,0,carte.id);
 }
});

for (const moba of [false,true]) for (const side of ['joueur','sorcier']) test(`Recette nommée : refus atomique d'un Samouraï de même coût (${moba?'MOBA':'PvP'} ${side})`, () => {
 const d=partie(moba);d[side].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const es=['kenshi-de-la-forge','onna-musha-des-cendres'].map((id,i)=>poserPourCapacite(d,side,id,'left',i));
 d.tour=side;d[side].main=[];const ids=es.map(e=>e.id);const avant=JSON.stringify(d);
 const r=moba?rpgMobaJouerCreature(d,side,'samourai-du-dragon-rouge','left',0,{sacrificeIds:ids}):rpgPvpAppliquer(d,side,{type:'jouer-carte',carteId:'samourai-du-dragon-rouge',sacrificeIds:ids});
 assert.equal(r.ok,false);assert.equal(r.raison,'ascension-recette');assert.equal(JSON.stringify(d),avant);
 if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});


const attenteRenfort = d => d.moba ? d.mobaRechercheEnAttente : d.renfortChoixEnAttente;
function choisirCimetiere(d, side, id) {
 const c = rpgCartesRenfortChoisi(d,side).find(x => x.id===id && x.admissible);
 assert.ok(c, `${id} absent des choix ${JSON.stringify(rpgCartesRenfortChoisi(d,side))}`);
 const r=d.moba?rpgMobaResoudreRecherche(d,side,id,c.index):rpgPvpAppliquer(d,side,{type:'choisir-renfort',index:c.index});
 assert.ok(r.ok,JSON.stringify(r));return r;
}
function renoncerRenfort(d,side) {
 return d.moba?rpgMobaResoudreRecherche(d,side,null):rpgPvpAppliquer(d,side,{type:'choisir-renfort',index:null});
}
function invoquerNomme(d,side,id,material) {
 const es=material.map((id,i)=>poserPourCapacite(d,side,id,i===2?'right':'left',i===2?0:i));
 // Les trois matériaux ne tiennent pas tous dans une voie MOBA.
 d.tour=side; d[side].main=[];
 const result=d.moba?rpgMobaJouerCreature(d,side,id,'left',0,{sacrificeIds:es.map(e=>e.id)}):rpgPvpAppliquer(d,side,{type:'jouer-carte',carteId:id,sacrificeIds:es.map(e=>e.id),cibleDifferee:true});
 assert.ok(result.ok,JSON.stringify(result));return d[side].creatures.find(e=>e.carteId===id);
}

for (const moba of [false,true]) for (const side of ['joueur','sorcier']) test(`Valkyrie : mort et choix Viking dans le cimetière (${moba?'MOBA':'PvP'} ${side})`, () => {
 const d=partie(moba);d[side].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const valk=invoquerNomme(d,side,'valkyrie-de-la-derniere-aurore',['guerrier-au-bouclier-rond','gardien-viking-du-fjord']);
 assert.ok(valk);assert.equal(valk.envol,true);assert.equal(valk.volDeVie,true);assert.equal(valk.rapidite,false);
 d[side].cimetiere.push('chien-du-guet');valk.pv=0;rpgActionsEtat(d);
 assert.equal(attenteRenfort(d)?.sourceCarteId,valk.carteId);assert.equal(attenteRenfort(d)?.origine,'destruction');
 const possibles=rpgCartesRenfortChoisi(d,side).map(c=>c.id);
 assert.ok(possibles.includes('gardien-viking-du-fjord'));assert.ok(possibles.includes('valkyrie-de-la-derniere-aurore'));assert.ok(!possibles.includes('chien-du-guet'));
 choisirCimetiere(d,side,'gardien-viking-du-fjord');
 assert.ok(d[side].creatures.some(e=>e.carteId==='gardien-viking-du-fjord'));
 assert.ok(d[side].cimetiere.includes('valkyrie-de-la-derniere-aurore'));assert.equal(attenteRenfort(d),null);
 if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) for (const side of ['joueur','sorcier']) test(`Colosse : choix successifs et arrivée du Djinn (${moba?'MOBA':'PvP'} ${side})`, () => {
 const d=partie(moba);d[side].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const col=invoquerNomme(d,side,'colosse-du-verre-ardent',['djinn-de-la-premiere-etincelle','djinn-de-la-flamme-mourante','dune-marchante']);
 assert.ok(col);assert.equal(col.defenseur,true);assert.equal(col.contreAttaque,false);assert.equal(col.bouclier,1);
 assert.equal(attenteRenfort(d)?.restant,2);
 assert.deepEqual(new Set(rpgCartesRenfortChoisi(d,side).map(c=>c.id)),new Set(['djinn-de-la-premiere-etincelle','djinn-de-la-flamme-mourante']));
 assert.equal(renoncerRenfort(d,side).ok,true);assert.equal(attenteRenfort(d),null);assert.equal(d[side].creatures.length,1);
 // Une nouvelle partie vérifie le choix de deux cartes et leur vraie arrivée.
 const e=partie(moba);e[side].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 invoquerNomme(e,side,'colosse-du-verre-ardent',['djinn-de-la-premiere-etincelle','djinn-de-la-flamme-mourante','dune-marchante']);
 e[side].deck=['chien-du-guet'];const avant=e[side].main.length;
 choisirCimetiere(e,side,'djinn-de-la-flamme-mourante');assert.equal(e[side].main.length,avant+1);
 assert.equal(attenteRenfort(e)?.restant,1);choisirCimetiere(e,side,'djinn-de-la-premiere-etincelle');
 assert.equal(attenteRenfort(e),null);assert.equal(e[side].creatures.length,3);
 assert.ok(e[side].creatures.filter(c=>c.carteId.startsWith('djinn-')).every(c=>c.rapidite));
 if(moba) assert.ok(rpgMobaPlacementCoherent(e));
});

for (const moba of [false,true]) for (const side of ['joueur','sorcier']) test(`Amiral : pioche et prise en cale de coût 5 (${moba?'MOBA':'PvP'} ${side})`, () => {
 const d=partie(moba), enemy=side==='joueur'?'sorcier':'joueur';
 for(const s of [side,enemy])d[s].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const es=['rais-de-la-galiote','la-vengeance-de-la-reine-anne'].map((id,i)=>poserPourCapacite(d,side,id,'left',i));
 const petit=poserPourCapacite(d,enemy,'viking-des-neiges','left',0);d.tour=enemy;d[enemy].main=['jarl-au-marteau-de-guerre'];d[enemy].invocationNormaleJouee=false;if(moba)d.moba.creaturesJouees[enemy]=false;
 const j=moba?rpgMobaJouerCreature(d,enemy,'jarl-au-marteau-de-guerre','left',0,{sacrificeIds:[petit.id]}):rpgJouerCreature(d,enemy,'jarl-au-marteau-de-guerre',null,{sacrificeIds:[petit.id]});assert.ok(j.ok,JSON.stringify(j));
 d.tour=side;d[side].main=[];d[side].deck=['chien-du-guet'];
 const res=moba?rpgMobaJouerCreature(d,side,'amiral-des-abysses','left',0,{sacrificeIds:es.map(e=>e.id)}):rpgPvpAppliquer(d,side,{type:'jouer-carte',carteId:'amiral-des-abysses',sacrificeIds:es.map(e=>e.id),cibleDifferee:true});
 assert.ok(res.ok,JSON.stringify(res));const amiral=d[side].creatures.find(e=>e.carteId==='amiral-des-abysses');
 assert.deepEqual([amiral.atk,amiral.pv,amiral.bouclier],[4,4,1]);assert.equal(amiral.butin,true);assert.ok(d[side].main.includes('chien-du-guet'));
 assert.equal(d.arriveeEnAttente?.abordage,5);
 const r=moba?rpgMobaResoudreArrivee(d,side,j.entite.id):rpgPvpAppliquer(d,side,{type:'resoudre-arrivee',cibleId:j.entite.id});
 assert.ok(r.ok,JSON.stringify(r));assert.ok(!d[enemy].creatures.some(x=>x.id===j.entite.id));
 assert.ok(amiral.enCale);assert.ok(!d[enemy].main.includes('jarl-au-marteau-de-guerre'));
 if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Valkyrie : le Viking choisi résout son arrivée ciblée (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const valk=invoquerNomme(d,'joueur','valkyrie-de-la-derniere-aurore',['guerrier-au-bouclier-rond','gardien-viking-du-fjord']);
 valk.pv=0;rpgActionsEtat(d);choisirCimetiere(d,'joueur','guerrier-au-bouclier-rond');
 const guerrier=d.joueur.creatures.find(e=>e.carteId==='guerrier-au-bouclier-rond');
 assert.equal(d.arriveeEnAttente?.entiteId,guerrier.id);assert.equal(attenteRenfort(d),null);
 const r=moba?rpgMobaResoudreArrivee(d,'joueur',guerrier.id):rpgPvpAppliquer(d,'joueur',{type:'resoudre-arrivee',cibleId:guerrier.id});
 assert.ok(r.ok,JSON.stringify(r));assert.equal(guerrier.bouclier,1);if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Colosse : deux choix restent possibles avec cinq cases après les sacrifices (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const materials=['djinn-de-la-premiere-etincelle','djinn-de-la-flamme-mourante','dune-marchante'];
 const es=materials.map((id,i)=>poserPourCapacite(d,'joueur',id,i===2?'right':'left',i===2?0:i));
 poserPourCapacite(d,'joueur','chien-du-guet','right',1);poserPourCapacite(d,'joueur','viking-des-neiges','center',0);
 d.tour='joueur';d.joueur.main=[];
 const r=moba?rpgMobaJouerCreature(d,'joueur','colosse-du-verre-ardent','left',0,{sacrificeIds:es.map(e=>e.id)}):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'colosse-du-verre-ardent',sacrificeIds:es.map(e=>e.id),cibleDifferee:true});
 assert.ok(r.ok,JSON.stringify(r));choisirCimetiere(d,'joueur','djinn-de-la-premiere-etincelle');
 assert.equal(attenteRenfort(d)?.restant,1);choisirCimetiere(d,'joueur','djinn-de-la-flamme-mourante');
 assert.equal(attenteRenfort(d),null);assert.equal(d.joueur.creatures.length,5);if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Réanimation de l'Amiral : pioche et Abordage s'appliquent à nouveau (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);for(const side of ['joueur','sorcier'])d[side].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const cible=poserPourCapacite(d,'sorcier','chien-du-guet','left',0);
 d.tour='joueur';d.joueur.main=['reanimation'];d.joueur.deck=['viking-des-neiges'];d.joueur.cimetiere=['amiral-des-abysses'];
 const r=moba?rpgMobaLancerMagie(d,'joueur','reanimation',null,'left',null,{emplacementReanimation:0}):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'reanimation'});
 assert.ok(r.ok,JSON.stringify(r));choisirCimetiere(d,'joueur','amiral-des-abysses');const amiral=d.joueur.creatures.find(e=>e.carteId==='amiral-des-abysses');
 assert.ok(amiral);assert.equal(amiral.bouclier,1);assert.ok(d.joueur.main.includes('viking-des-neiges'));
 assert.ok(amiral.enCale);assert.ok(!d.sorcier.creatures.some(e=>e.id===cible.id));
 if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Deux Valkyries mortes : leurs choix restent séparés et sérialisables (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const premiere=invoquerNomme(d,'joueur','valkyrie-de-la-derniere-aurore',['guerrier-au-bouclier-rond','gardien-viking-du-fjord']);
 d.joueur.cimetiere.push('valkyrie-de-la-derniere-aurore');d.joueur.main=['reanimation'];
 const r=moba?rpgMobaLancerMagie(d,'joueur','reanimation',null,'right',null,{emplacementReanimation:0}):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'reanimation'});assert.ok(r.ok,JSON.stringify(r)); choisirCimetiere(d,'joueur','valkyrie-de-la-derniere-aurore');
 const seconde=d.joueur.creatures.find(e=>e.carteId==='valkyrie-de-la-derniere-aurore' && e.id!==premiere.id);assert.ok(seconde);
 d.joueur.cimetiere.push('viking-des-neiges','viking-des-neiges');premiere.pv=0;seconde.pv=0;rpgActionsEtat(d);
 assert.equal(attenteRenfort(d)?.sourceCarteId,'valkyrie-de-la-derniere-aurore');assert.equal(d.renfortsChoixFiles.length,1);
 const clone=JSON.parse(JSON.stringify(d));assert.equal(clone.renfortsChoixFiles.length,1);
 choisirCimetiere(d,'joueur','viking-des-neiges');assert.equal(attenteRenfort(d)?.sourceCarteId,'valkyrie-de-la-derniere-aurore');
 choisirCimetiere(d,'joueur','viking-des-neiges');assert.equal(attenteRenfort(d),null);assert.equal(d.renfortsChoixFiles.length,0);
 if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Valkyrie : le Vol de vie soigne sur les dégâts réellement infligés (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const valk=invoquerNomme(d,'joueur','valkyrie-de-la-derniere-aurore',['guerrier-au-bouclier-rond','gardien-viking-du-fjord']);
 valk.ready=true;valk.malInvocation=false;valk.attaquee=false;
 if(moba){const lane=d.moba.lanes.find(x=>x.id==='left');lane.hp.joueur=10;const annonce=rpgMobaDeclarerAttaqueIndividuelle(d,'joueur',valk.id);assert.ok(annonce.ok,JSON.stringify(annonce));const r=rpgMobaResoudreAttaqueIndividuelle(d,'joueur');assert.ok(r.ok,JSON.stringify(r));assert.equal(lane.hp.joueur,12);assert.equal(lane.hp.sorcier,16);assert.ok(rpgMobaPlacementCoherent(d));}
 else {d.joueur.pv=10;const avant=d.sorcier.pv;const r=rpgAttaquerSorcier(d,'joueur',valk.id);assert.ok(r.ok,JSON.stringify(r));assert.equal(d.joueur.pv,12);assert.equal(d.sorcier.pv,avant-4);}
});

for (const moba of [false,true]) test(`Dragon rouge : Contre-attaque riposte à un sort ciblé (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);for(const s of ['joueur','sorcier'])d[s].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const dragon=invoquerNomme(d,'joueur','samourai-du-dragon-rouge',['ronin-du-soleil-rouge','onna-musha-des-cendres']);
 assert.ok(dragon.contreAttaque && dragon.esquive && dragon.defenseur);rpgReglerHasard(d,()=>0.5);
 d.tour='sorcier';d.sorcier.main=['trait-de-braise'];const avant=moba?d.moba.lanes.find(l=>l.id==='left').hp.sorcier:d.sorcier.pv;
 const r=moba?rpgMobaLancerMagie(d,'sorcier','trait-de-braise',dragon.id):rpgLancerMagie(d,'sorcier','trait-de-braise',dragon.id);
 assert.ok(r.ok,JSON.stringify(r));const apres=moba?d.moba.lanes.find(l=>l.id==='left').hp.sorcier:d.sorcier.pv;
 assert.equal(apres,avant-dragon.atk);assert.ok(d.log.some(l=>l.includes('Contre-attaque')));if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Retour d'exil : les choix Colosse suspendent et reprennent la transition (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.exil=['colosse-du-verre-ardent','chien-du-guet'];d.joueur.cimetiere=['djinn-de-la-premiere-etincelle','djinn-de-la-flamme-mourante'];
 d.retoursExilFinTour=[{cote:'joueur',carteId:'colosse-du-verre-ardent',mobaLane:'left',mobaSlot:0},{cote:'joueur',carteId:'chien-du-guet',mobaLane:'right',mobaSlot:0}];
 rpgFinDeTour(d);assert.equal(d.tour,'joueur');assert.equal(d.transitionRetours?.etape,'exil');assert.equal(attenteRenfort(d)?.restant,2);
 assert.ok(!d.joueur.creatures.some(e=>e.carteId==='chien-du-guet'));
 choisirCimetiere(d,'joueur','djinn-de-la-premiere-etincelle');assert.equal(attenteRenfort(d)?.restant,1);assert.equal(d.tour,'joueur');
 assert.ok(renoncerRenfort(d,'joueur').ok);assert.equal(d.transitionRetours,null);assert.equal(d.tour,'sorcier');assert.ok(d.joueur.creatures.some(e=>e.carteId==='chien-du-guet'));
 if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Sacrifice de la Valkyrie : son choix est conservé après la pose (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const valk=invoquerNomme(d,'joueur','valkyrie-de-la-derniere-aurore',['guerrier-au-bouclier-rond','gardien-viking-du-fjord']);
 d.tour='joueur';d.joueur.main=['jarl-au-marteau-de-guerre'];d.joueur.invocationNormaleJouee=false;if(moba)d.moba.creaturesJouees.joueur=false;
 const r=moba?rpgMobaJouerCreature(d,'joueur','jarl-au-marteau-de-guerre','left',0,{sacrificeIds:[valk.id]}):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'jarl-au-marteau-de-guerre',sacrificeIds:[valk.id]});
 assert.ok(r.ok,JSON.stringify(r));assert.ok(d.joueur.creatures.some(e=>e.carteId==='jarl-au-marteau-de-guerre'));
 assert.equal(attenteRenfort(d)?.origine,'destruction');choisirCimetiere(d,'joueur','gardien-viking-du-fjord');assert.equal(attenteRenfort(d),null);
 if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Amiral : prise refuse coût supérieur à 5 et Tenacité (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);for(const s of ['joueur','sorcier'])d[s].mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const es=['rais-de-la-galiote','la-vengeance-de-la-reine-anne'].map((id,i)=>poserPourCapacite(d,'joueur',id,'left',i));
 const sacrifice=poserPourCapacite(d,'sorcier','chien-du-guet','left',0);d.sorcier.invocationNormaleJouee=false;if(moba)d.moba.creaturesJouees.sorcier=false;d.sorcier.main=['cavalier-des-deux-sabres'];
 const pose=moba?rpgMobaJouerCreature(d,'sorcier','cavalier-des-deux-sabres','left',0,{sacrificeIds:[sacrifice.id]}):rpgJouerCreature(d,'sorcier','cavalier-des-deux-sabres',null,{sacrificeIds:[sacrifice.id]});assert.ok(pose.ok,JSON.stringify(pose));const cher=pose.entite;
 const protege=poserPourCapacite(d,'sorcier','chien-du-guet','left',1);protege.tenaciteDisponible=true;
 d.tour='joueur';d.joueur.main=[];
 const r=moba?rpgMobaJouerCreature(d,'joueur','amiral-des-abysses','left',0,{sacrificeIds:es.map(e=>e.id)}):rpgPvpAppliquer(d,'joueur',{type:'jouer-carte',carteId:'amiral-des-abysses',sacrificeIds:es.map(e=>e.id),cibleDifferee:true});
 assert.ok(r.ok,JSON.stringify(r));assert.ok(!d.arriveeEnAttente);assert.ok(d.sorcier.creatures.includes(cher));assert.ok(d.sorcier.creatures.includes(protege));
 assert.ok(!r.entite?.enCale);if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Retour programmé : choix Colosse puis suite du début de tour (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.cimetiere=['colosse-du-verre-ardent','chien-du-guet','djinn-de-la-premiere-etincelle'];
 d.joueur.retoursProgrammes=[{carteId:'colosse-du-verre-ardent',toursRestants:1,mobaLane:'left'},{carteId:'chien-du-guet',toursRestants:1,mobaLane:'right'}];
 rpgFinDeTour(d);assert.equal(d.tour,'sorcier');assert.equal(d.transitionRetours?.etape,'programmes');assert.equal(attenteRenfort(d)?.restant,2);
 assert.ok(!d.joueur.creatures.some(e=>e.carteId==='chien-du-guet'));choisirCimetiere(d,'joueur','djinn-de-la-premiere-etincelle');
 assert.ok(renoncerRenfort(d,'joueur').ok);assert.equal(d.transitionRetours,null);assert.ok(d.joueur.creatures.some(e=>e.carteId==='chien-du-guet'));assert.equal(d.phase,'principale');
 if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});

for (const moba of [false,true]) test(`Amiral : Butin se déclenche après une attaque directe (${moba?'MOBA':'PvP'})`, () => {
 const d=partie(moba);d.joueur.mana={sable:20,eau:20,neige:20,braise:20,tenebres:20};
 const amiral=invoquerNomme(d,'joueur','amiral-des-abysses',['rais-de-la-galiote','la-vengeance-de-la-reine-anne']);
 amiral.ready=true;amiral.malInvocation=false;amiral.attaquee=false;d.joueur.deck=['viking-des-neiges'];d.joueur.main=['chien-du-guet'];
 if(moba){const annonce=rpgMobaDeclarerAttaqueIndividuelle(d,'joueur',amiral.id);assert.ok(annonce.ok,JSON.stringify(annonce));assert.ok(rpgMobaResoudreAttaqueIndividuelle(d,'joueur').ok);}
 else assert.ok(rpgAttaquerSorcier(d,'joueur',amiral.id).ok);
 assert.equal(d.joueur.deck.length,0);assert.ok(d.log.some(l=>l.includes('Butin : Amiral des abysses')));assert.ok(d.defausseEnAttente || d.joueur.cimetiere.includes('chien-du-guet') || d.joueur.cimetiere.includes('viking-des-neiges'));
 if(moba)assert.ok(rpgMobaPlacementCoherent(d));
});
