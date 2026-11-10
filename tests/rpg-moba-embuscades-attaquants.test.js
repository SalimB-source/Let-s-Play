import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgChoisirCouleurMana } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaque, rpgMobaPeutEmbuscade, rpgMobaPasserCreature, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature, rpgMobaLancerMagie, rpgMobaLancerAttaque, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirEmbuscadeIA, rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';

function combat(side, card, { two = true, shield = false, high = false, third = false } = {}) {
  const deck=Array(30).fill('ashigaru-des-braises'); const d=rpgMobaNouveauDuel({joueurDeck:deck,sorcierDeck:deck,rng:()=>.5});
  assert.ok(rpgMulligan(d,'joueur',[]).ok && rpgMulligan(d,'sorcier',[]).ok && rpgDemarrerManaEssai(d).ok);
  if(side==='sorcier') rpgFinDeTour(d);
  const defender=side==='joueur'?'sorcier':'joueur'; d[side].mana.braise=20;
  const first=high?'onna-musha-des-cendres':'ronin-du-soleil-rouge';
  d[side].main=[first,'ashigaru-des-braises'];
  const a=rpgMobaJouerCreature(d,side,first,'left',0).entite;
  const b=rpgMobaJouerCreature(d,side,'ashigaru-des-braises','left',1).entite;
  assert.ok(a && b); a.ready=true; b.ready=true;
  let c; if(third) { d[side].main.push('ashigaru-des-braises'); c=rpgMobaJouerCreature(d,side,'ashigaru-des-braises','right',0).entite; assert.ok(c); c.ready=true; }
  d[side].main=shield?['parade-du-verre']:[]; d[side].mana.eau=10;
  d[defender].main=[card]; Object.assign(d[defender].mana,{sable:10,eau:10,tenebres:10});
  assert.ok(rpgMobaDeclarerAttaque(d,side,third?[a.id,c.id]:two?[a.id,b.id]:[a.id]).ok);
  return {d,a,b,defender};
}
for (const card of ['sentinelle-des-sables','traqueur-des-nuits-sans-lune']) for (const side of ['joueur','sorcier']) {
  test(`${card} : arrivée cible un attaquant, réduit la déclaration et reprend (${side})`, () => {
    const {d,a,b,defender}=combat(side,card);
    assert.ok(rpgMobaPeutEmbuscade(d,defender,card));
    assert.ok(rpgMobaJouerCreature(d,defender,card,'left',0,{ouvrirReponse:true}).ok);
    assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
    const result=rpgMobaResoudreArrivee(d,defender,a.id);
    assert.ok(result.ok,JSON.stringify(result)); assert.ok(!result.effetEnAttente);
    assert.ok(!d[side].creatures.includes(a)); assert.deepEqual(d.combatDeclare.attaquants,[b.id]);
    assert.ok(rpgMobaLancerAttaque(d,side,[b.id],{}, {declaree:true}).ok);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${card} : la cible peut se protéger dans la fenêtre de réponse (${side})`, () => {
    const {d,a,defender}=combat(side,card,{shield:true});
    assert.ok(rpgMobaJouerCreature(d,defender,card,'left',0,{ouvrirReponse:true}).ok);
    assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
    assert.ok(rpgMobaResoudreArrivee(d,defender,a.id).effetEnAttente);
    assert.ok(rpgMobaLancerMagie(d,side,'parade-du-verre',a.id).ok);
    assert.ok(rpgMobaPasserEffetCreature(d,side).ok);
    assert.ok(d[side].creatures.includes(a)); assert.equal(a.pv,a.pvMax);
    assert.equal(d.combatDeclare.attaquants.length,2); assert.ok(d.fenetreReponse);
  });
}
for (const side of ['joueur','sorcier']) test(`Traqueur : deux attaquants exigés, mais une autre créature de la voie peut être ciblée (${side})`, () => {
  const insuffisant=combat(side,'traqueur-des-nuits-sans-lune',{two:false});
  const before=JSON.stringify(insuffisant.d); assert.equal(rpgMobaPeutEmbuscade(insuffisant.d,insuffisant.defender,'traqueur-des-nuits-sans-lune'),false);
  assert.equal(rpgMobaJouerCreature(insuffisant.d,insuffisant.defender,'traqueur-des-nuits-sans-lune','left',0,{ouvrirReponse:true}).ok,false); assert.equal(JSON.stringify(insuffisant.d),before);
  const {d,a,b,defender}=combat(side,'traqueur-des-nuits-sans-lune',{third:true});
  assert.ok(!d.combatDeclare.attaquants.includes(b.id));
  assert.ok(rpgMobaJouerCreature(d,defender,'traqueur-des-nuits-sans-lune','left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
  assert.ok(rpgMobaResoudreArrivee(d,defender,b.id).ok); assert.ok(!d[side].creatures.includes(b));
  assert.ok(d.combatDeclare.attaquants.includes(a.id)); assert.equal(d.combatDeclare.attaquants.length,2);
});
for (const card of ['sentinelle-des-sables','traqueur-des-nuits-sans-lune']) test(`IA : ${card} choisit une attaque légale sur copie`, () => {
  const {d,defender}=combat('joueur',card); const before=JSON.stringify(d);
  const c=rpgMobaChoisirEmbuscadeIA(d,defender); assert.equal(c?.id,card); assert.equal(JSON.stringify(d),before);
  assert.ok(rpgMobaJouerCreature(d,defender,card,c.lane,c.slot,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,'joueur').arriveeEnAttente);
  assert.ok(rpgMobaChoisirArriveeIA(d,defender));
});

for (const side of ['joueur','sorcier']) test(`Sentinelle : ne peut cibler un ennemi qui n’attaque pas (${side})`, () => {
  const {d,a,b,defender}=combat(side,'sentinelle-des-sables',{two:false});
  assert.ok(rpgMobaJouerCreature(d,defender,'sentinelle-des-sables','left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
  const before=JSON.stringify(d); assert.equal(rpgMobaResoudreArrivee(d,defender,b.id).ok,false); assert.equal(JSON.stringify(d),before);
  assert.ok(rpgMobaResoudreArrivee(d,defender,a.id).ok);
  assert.equal(d.combatDeclare,null); assert.equal(d.fenetreReponse,false);
});
for (const side of ['joueur','sorcier']) test(`Traqueur : renvoie la cible de coût 4 au lieu de la détruire (${side})`, () => {
  const {d,a,b,defender}=combat(side,'traqueur-des-nuits-sans-lune',{high:true});
  assert.ok(rpgMobaJouerCreature(d,defender,'traqueur-des-nuits-sans-lune','left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
  assert.ok(rpgMobaResoudreArrivee(d,defender,a.id).ok);
  assert.ok(d[side].main.includes(a.carteId)); assert.ok(!d[side].cimetiere.includes(a.carteId));
  assert.deepEqual(d.combatDeclare.attaquants,[b.id]); assert.ok(rpgMobaPlacementCoherent(d));
});

for (const side of ['joueur','sorcier']) test(`Sentinelle : si le dernier attaquant meurt après la réponse, la phase de combat se termine (${side})`, () => {
  const {d,a,defender}=combat(side,'sentinelle-des-sables',{two:false,shield:true});
  assert.ok(rpgMobaJouerCreature(d,defender,'sentinelle-des-sables','left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
  assert.ok(rpgMobaResoudreArrivee(d,defender,a.id).effetEnAttente);
  assert.ok(rpgMobaPasserEffetCreature(d,side).ok);
  assert.equal(d.combatDeclare,null);assert.equal(d.fenetreReponse,false);assert.equal(d.phase,'principale2');
  assert.equal(d.mobaEmbuscadeArrivee,null);assert.ok(rpgMobaPlacementCoherent(d));
});

for (const card of ['sentinelle-des-sables','traqueur-des-nuits-sans-lune']) for (const side of ['joueur','sorcier']) test(`${card} peut se jouer normalement hors combat pendant son tour (${side})`, () => {
  const {d,a,b,defender}=combat(side,card);
  assert.ok(rpgMobaLancerAttaque(d,side,[a.id,b.id],{}, {declaree:true}).ok);
  rpgFinDeTour(d); if(d[defender].manaChoixEnAttente) assert.ok(rpgChoisirCouleurMana(d,defender,d[defender].couleurs[0]).ok);
  Object.assign(d[defender].mana,{sable:10,eau:10,tenebres:10});
  assert.ok(rpgMobaJouerCreature(d,defender,card,'left',0,{ouvrirReponse:true}).creatureEnAttente);
  const result=rpgMobaPasserCreature(d,side);assert.ok(result.entite,JSON.stringify(result));
  if(card==='sentinelle-des-sables') { assert.ok(!result.arriveeEnAttente); assert.equal(a.pv,a.pvMax); }
  else { assert.ok(result.arriveeEnAttente); assert.ok(rpgMobaResoudreArrivee(d,defender,a.id).ok); assert.ok(!d[side].creatures.includes(a)); }
  assert.ok(rpgMobaPlacementCoherent(d));
});
