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
// L'ancienne arrivée pendant l'assaut adverse n'existe plus. On vérifie
// l'arrivée pendant la phase principale suivante, avec et sans réponse magique.
function passerAuTourDuDefenseur(d, side, defender, a) {
  assert.ok(rpgMobaLancerAttaque(d, side, [a.id], {}, { declaree: true }).ok);
  rpgFinDeTour(d); assert.equal(d.tour, defender);
}
for (const card of ['eclipse-silencieuse', 'veilleuse-de-la-lune-givree']) for (const side of ['joueur', 'sorcier']) {
  test(`${card} : refus pendant l’attaque adverse puis arrivée à son tour (${side})`, () => {
    const {d, a, defender} = combat(side, card);
    assert.ok(MOBA_CARTES_AUTORISEES.includes(card));
    const before = JSON.stringify(d);
    assert.equal(rpgMobaPeutEmbuscade(d, defender, card), false);
    assert.equal(rpgMobaJouerCreature(d, defender, card, 'left', 0, { ouvrirReponse: true }).raison, 'pas-votre-tour');
    assert.equal(JSON.stringify(d), before);
    passerAuTourDuDefenseur(d, side, defender, a);
    assert.ok(rpgMobaJouerCreature(d, defender, card, 'left', 0, { ouvrirReponse: true }).creatureEnAttente);
    const summoned = rpgMobaPasserCreature(d, side);
    assert.ok(summoned.arriveeEnAttente, JSON.stringify(summoned));
    const result = rpgMobaResoudreArrivee(d, defender, a.id);
    assert.ok(result.ok, JSON.stringify(result));
    if (card === 'eclipse-silencieuse') assert.equal(a.atk, 1); else assert.ok(a.gelToursRestants > 0);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${card} : une parade protège sa cible de l’arrivée pendant son tour (${side})`, () => {
    const {d, a, defender} = combat(side, card, true);
    passerAuTourDuDefenseur(d, side, defender, a);
    assert.ok(rpgMobaJouerCreature(d, defender, card, 'left', 0, { ouvrirReponse: true }).creatureEnAttente);
    assert.ok(rpgMobaPasserCreature(d, side).arriveeEnAttente);
    const arrivee = rpgMobaResoudreArrivee(d, defender, a.id);
    assert.ok(arrivee.effetEnAttente, JSON.stringify(arrivee));
    assert.ok(rpgMobaLancerMagie(d, side, 'parade-du-verre', a.id).ok);
    assert.ok(rpgMobaPasserEffetCreature(d, side).ok);
    assert.equal(a.atk, 3); assert.ok(!a.gelToursRestants);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${card} : aucune cible dans une autre voie pendant son tour (${side})`, () => {
    const {d, a, defender} = combat(side, card);
    passerAuTourDuDefenseur(d, side, defender, a);
    const base = a.atk;
    assert.ok(rpgMobaJouerCreature(d, defender, card, 'right', 0, { ouvrirReponse: true }).creatureEnAttente);
    const result = rpgMobaPasserCreature(d, side);
    assert.ok(result.entite); assert.ok(!result.arriveeEnAttente);
    assert.equal(a.atk, base); assert.ok(!a.gelToursRestants);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${card} : elle peut être jouée pendant son propre tour (${side})`, () => {
    const {d, a, defender} = combat(side, card);
    passerAuTourDuDefenseur(d, side, defender, a);
    const announced = rpgMobaJouerCreature(d, defender, card, 'left', 0, { ouvrirReponse: true });
    assert.ok(announced.creatureEnAttente, JSON.stringify(announced));
    const placed = rpgMobaPasserCreature(d, side);
    assert.ok(placed.entite && placed.arriveeEnAttente, JSON.stringify(placed));
    assert.ok(rpgMobaResoudreArrivee(d, defender, a.id).ok);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
}

test('l’IA ne propose aucune Invocation spéciale pendant le tour adverse', () => {
  const {d, defender} = combat('joueur', 'eclipse-silencieuse'); const before = JSON.stringify(d);
  assert.equal(rpgMobaChoisirEmbuscadeIA(d, defender), null);
  assert.equal(JSON.stringify(d), before);
});

test('l’IA choisit une parade en réponse à une arrivée pendant le tour adverse', () => {
  const {d, a, defender} = combat('sorcier', 'eclipse-silencieuse', true);
  passerAuTourDuDefenseur(d, 'sorcier', defender, a);
  assert.ok(rpgMobaJouerCreature(d, defender, 'eclipse-silencieuse', 'left', 0, { ouvrirReponse: true }).creatureEnAttente);
  assert.ok(rpgMobaPasserCreature(d, 'sorcier').arriveeEnAttente);
  assert.ok(rpgMobaResoudreArrivee(d, defender, a.id).effetEnAttente);
  const before = JSON.stringify(d);
  const choice = rpgMobaChoisirMagieIA(d, 'sorcier', true);
  assert.equal(choice?.id, 'parade-du-verre'); assert.equal(choice?.cible, a.id);
  assert.equal(JSON.stringify(d), before);
});
