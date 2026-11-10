import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgChoisirCouleurMana } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaque, rpgMobaPeutEmbuscade, rpgMobaPasserCreature, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature, rpgMobaLancerMagie, rpgMobaLancerAttaque, rpgMobaPlacementCoherent, MOBA_CARTES_AUTORISEES } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirEmbuscadeIA, rpgMobaChoisirArriveeIA, rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';

function combat(attackerSide, card, shield = false) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d,'joueur',[]).ok && rpgMulligan(d,'sorcier',[]).ok && rpgDemarrerManaEssai(d).ok);
  if (attackerSide === 'sorcier') rpgFinDeTour(d);
  const defender = attackerSide === 'joueur' ? 'sorcier' : 'joueur';
  d[attackerSide].main = ['ronin-du-soleil-rouge']; d[attackerSide].mana.braise = 20;
  const a = rpgMobaJouerCreature(d, attackerSide, 'ronin-du-soleil-rouge', 'left', 0).entite;
  assert.ok(a); a.ready = true;
  d[attackerSide].main = shield ? ['parade-du-verre'] : [];
  d[attackerSide].mana.eau = 10;
  d[defender].main = [card]; Object.assign(d[defender].mana, { sable: 10, neige: 10, tenebres: 10 });
  assert.ok(rpgMobaDeclarerAttaque(d, attackerSide, [a.id]).ok);
  return {d, a, defender};
}
for (const card of ['eclipse-silencieuse', 'veilleuse-de-la-lune-givree']) for (const side of ['joueur','sorcier']) {
  test(`${card} : ${side} peut répondre à l’arrivée ciblée avant le retour au combat`, () => {
    const {d,a,defender} = combat(side,card,true);
    assert.ok(MOBA_CARTES_AUTORISEES.includes(card)); assert.ok(rpgMobaPeutEmbuscade(d,defender,card));
    assert.ok(rpgMobaJouerCreature(d,defender,card,'left',0,{ouvrirReponse:true}).creatureEnAttente);
    const summoned = rpgMobaPasserCreature(d,side); assert.ok(summoned.arriveeEnAttente, JSON.stringify(summoned));
    assert.equal(d.arriveeEnAttente.cote,defender); assert.ok(d.combatDeclare);
    assert.equal(rpgMobaLancerAttaque(d,side,[a.id],{}, {declaree:true}).ok,false);
    const arrivee = rpgMobaResoudreArrivee(d,defender,a.id); assert.ok(arrivee.effetEnAttente,JSON.stringify(arrivee));
    assert.equal(d.effetCreatureEnAttente.cote,defender);
    assert.ok(rpgMobaLancerMagie(d,side,'parade-du-verre',a.id).ok);
    assert.ok(rpgMobaPasserEffetCreature(d,side).ok);
    assert.equal(a.atk,3); assert.ok(!a.gelToursRestants); assert.ok(d.combatDeclare); assert.equal(d.fenetreReponse,true);
    assert.equal(d.mobaEmbuscadeArrivee,null); assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${card} : effet sans réponse, puis reprise du combat (${side})`, () => {
    const {d,a,defender} = combat(side,card);
    assert.ok(rpgMobaJouerCreature(d,defender,card,'left',0,{ouvrirReponse:true}).creatureEnAttente);
    assert.ok(rpgMobaPasserCreature(d,side).arriveeEnAttente);
    const result = rpgMobaResoudreArrivee(d,defender,a.id);
    assert.ok(result.ok,JSON.stringify(result)); assert.ok(!result.effetEnAttente);
    if (card === 'eclipse-silencieuse') assert.equal(a.atk,1); else assert.ok(a.gelToursRestants > 0);
    assert.ok(d.combatDeclare); assert.equal(d.fenetreReponse,true); assert.ok(rpgMobaPlacementCoherent(d));
  });
}

test('l’IA choisit et résout une arrivée en défense sans modifier la partie examinée', () => {
  const {d,defender} = combat('joueur','eclipse-silencieuse'); const before=JSON.stringify(d);
  const choix=rpgMobaChoisirEmbuscadeIA(d,defender); assert.equal(choix?.id,'eclipse-silencieuse');
  assert.equal(JSON.stringify(d),before);
  assert.ok(rpgMobaJouerCreature(d,defender,choix.id,choix.lane,choix.slot,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,'joueur').ok);
  assert.ok(rpgMobaChoisirArriveeIA(d,defender));
});

for (const card of ['eclipse-silencieuse','veilleuse-de-la-lune-givree']) for (const side of ['joueur','sorcier']) {
  test(`${card} : le seuil de force et l’absence de cible dans la voie sont respectés (${side})`, () => {
    const {d,a,defender}=combat(side,card);
    const base=a.atk; a.atk=card==='eclipse-silencieuse'?1:2;
    const before=JSON.stringify(d); assert.equal(rpgMobaPeutEmbuscade(d,defender,card),false);
    assert.equal(rpgMobaJouerCreature(d,defender,card,'left',0,{ouvrirReponse:true}).ok,false); assert.equal(JSON.stringify(d),before);
    a.atk=base;
    assert.ok(rpgMobaJouerCreature(d,defender,card,'right',0,{ouvrirReponse:true}).ok);
    const result=rpgMobaPasserCreature(d,side); assert.ok(result.entite); assert.ok(!result.arriveeEnAttente);
    assert.ok(!d.arriveeEnAttente); assert.equal(a.atk,base); assert.ok(!a.gelToursRestants); assert.ok(d.combatDeclare); assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${card} : elle peut être jouée normalement pendant son propre tour (${side})`, () => {
    const {d,defender}=combat(side,card);
    const attacker=d.combatDeclare.attaquants[0]; assert.ok(rpgMobaLancerAttaque(d,side,[attacker],{}, {declaree:true}).ok);
    rpgFinDeTour(d); assert.equal(d.tour,defender);
    if (d[defender].manaChoixEnAttente) assert.ok(rpgChoisirCouleurMana(d,defender,d[defender].couleurs[0]).ok); Object.assign(d[defender].mana,{sable:10,neige:10,tenebres:10});
    const announced=rpgMobaJouerCreature(d,defender,card,'left',0,{ouvrirReponse:true}); assert.ok(announced.creatureEnAttente,JSON.stringify(announced));
    const placed=rpgMobaPasserCreature(d,side); assert.ok(placed.entite,JSON.stringify(placed));
    assert.ok(placed.arriveeEnAttente); assert.ok(rpgMobaResoudreArrivee(d,defender,attacker).ok);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
}


test('l’IA compare la réponse à l’effet ciblé sur une copie sans toucher au duel', () => {
  const {d,a,defender}=combat('sorcier','eclipse-silencieuse',true);
  assert.ok(rpgMobaJouerCreature(d,defender,'eclipse-silencieuse','left',0,{ouvrirReponse:true}).ok);
  assert.ok(rpgMobaPasserCreature(d,'sorcier').arriveeEnAttente);
  assert.ok(rpgMobaResoudreArrivee(d,defender,a.id).effetEnAttente);
  const before=JSON.stringify(d);
  const choice=rpgMobaChoisirMagieIA(d,'sorcier',true);
  assert.equal(choice?.id,'parade-du-verre'); assert.equal(choice?.cible,a.id);
  assert.equal(JSON.stringify(d),before);
});
