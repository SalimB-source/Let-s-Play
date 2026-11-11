import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgChoisirCouleurMana } from '../src/games/rpgDuel.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaPasserCreature, rpgMobaPeutEmbuscade, rpgMobaPlacementCoherent, MOBA_CARTES_AUTORISEES } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirEmbuscadeIA, rpgMobaChoisirMagieIA, rpgMobaChoisirBlocagesIA } from '../src/games/rpgMobaAI.js';

const garde = 'garde-du-trone-givre';
function combat(attackerSide) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (attackerSide === 'sorcier') rpgFinDeTour(d);
  const defender = attackerSide === 'joueur' ? 'sorcier' : 'joueur';
  d[attackerSide].main = ['ashigaru-des-braises']; d[attackerSide].mana.braise = 20;
  const a = rpgMobaJouerCreature(d, attackerSide, 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(a); a.ready = true;
  d[defender].main = [garde]; Object.assign(d[defender].mana, { neige: 10, tenebres: 10 });
  assert.ok(rpgMobaDeclarerAttaque(d, attackerSide, [a.id]).ok);
  return { d, a, defender };
}
for (const attackerSide of ['joueur', 'sorcier']) {
  test(`${attackerSide} attaque : annonce du Garde sans blocage rétroactif`, () => {
    const {d, a, defender} = combat(attackerSide);
    assert.ok(MOBA_CARTES_AUTORISEES.includes(garde));
    assert.ok(rpgMobaPeutEmbuscade(d, defender, garde));
    const mana = structuredClone(d[defender].mana);
    assert.equal(rpgMobaJouerCreature(d, defender, garde, 'left', 0).ok, false);
    assert.equal(rpgMobaJouerCreature(d, defender, garde, 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
    assert.equal(d[defender].main.length, 0); assert.deepEqual(d[defender].mana, mana);
    assert.equal(rpgMobaLancerAttaque(d, attackerSide, [a.id], {}, { declaree: true }).ok, false);
    assert.equal(rpgMobaPasserCreature(d, defender).ok, false);
    const result = rpgMobaPasserCreature(d, attackerSide);
    assert.ok(result.ok, JSON.stringify(result)); assert.ok(result.entite);
    assert.equal(d.fenetreReponse, true); assert.equal(d.combatDeclare.attaquants[0], a.id);
    assert.equal(mobaVoie(d.moba, 'left').slots[defender][0], result.entite.id);
    assert.equal(rpgMobaLancerAttaque(d, attackerSide, [a.id], { [a.id]: [result.entite.id] }, { declaree: true }).ok, false);
    assert.ok(rpgMobaLancerAttaque(d, attackerSide, [a.id], {}, { declaree: true }).ok);
    assert.equal(mobaVoie(d.moba, 'left').hp[defender], 20 - a.atk);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${attackerSide} contre l'Embuscade avec Écueil puis reprend le combat`, () => {
    const {d, a, defender} = combat(attackerSide);
    d[attackerSide].main = ['ecueil']; d[attackerSide].mana.eau = 10;
    assert.ok(rpgMobaJouerCreature(d, defender, garde, 'left', 0, { ouvrirReponse: true }).ok);
    const result = rpgMobaLancerMagie(d, attackerSide, 'ecueil');
    assert.equal(result.contre, true, JSON.stringify(result));
    assert.equal(d.mobaCreatureEnAttente, null); assert.equal(d.fenetreReponse, true);
    assert.deepEqual(d[defender].cimetiere, [garde]);
    assert.ok(rpgMobaLancerAttaque(d, attackerSide, [a.id], {}, { declaree: true }).ok);
  });
  test(`${attackerSide} : refus sans mutation si Abordage offert ou case invalide`, () => {
    const {d, defender} = combat(attackerSide);
    d[defender].prochaineArriveeAbordage = true;
    const before = JSON.stringify(d);
    assert.equal(rpgMobaPeutEmbuscade(d, defender, garde), false);
    assert.equal(rpgMobaJouerCreature(d, defender, garde, 'left', 0, { ouvrirReponse: true }).ok, false);
    assert.equal(JSON.stringify(d), before);
    d[defender].prochaineArriveeAbordage = false;
    const before2 = JSON.stringify(d);
    assert.equal(rpgMobaJouerCreature(d, defender, garde, 'left', 9, { ouvrirReponse: true }).ok, false);
    assert.equal(JSON.stringify(d), before2);
  });
}

test('IA choisit une voie défendable sans mutation puis peut contrer une Embuscade', () => {
  const {d, defender} = combat('joueur');
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirEmbuscadeIA(d, defender);
  assert.equal(choix?.lane, 'left'); assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaJouerCreature(d, defender, garde, choix.lane, choix.slot, { ouvrirReponse: true }).ok);
  assert.ok(rpgMobaPasserCreature(d, 'joueur').ok);
  const blocks = rpgMobaChoisirBlocagesIA(d, 'joueur', d.combatDeclare.attaquants);
  assert.deepEqual(blocks, {}, 'le combat individuel ne comporte pas de blocage');
  const other = combat('sorcier'); other.d.sorcier.main = ['ecueil']; other.d.sorcier.mana.eau = 10;
  assert.ok(rpgMobaJouerCreature(other.d, other.defender, garde, 'left', 0, { ouvrirReponse: true }).ok);
  assert.equal(rpgMobaChoisirMagieIA(other.d, 'sorcier', true)?.id, 'ecueil');
});

test('le Garde se joue aussi normalement à son propre tour', () => {
  const { d, a, defender } = combat('joueur');
  assert.ok(rpgMobaLancerAttaque(d, 'joueur', [a.id], {}, { declaree: true }).ok);
  rpgFinDeTour(d);
  assert.equal(d.tour, defender);
  if (d[defender].manaChoixEnAttente) assert.ok(rpgChoisirCouleurMana(d, defender, d[defender].couleurs[0]).ok);
  Object.assign(d[defender].mana, { neige: 10, tenebres: 10 });
  const result = rpgMobaJouerCreature(d, defender, garde, 'right', 0, { ouvrirReponse: true });
  assert.equal(result.creatureEnAttente, true, JSON.stringify(result));
  assert.ok(rpgMobaPasserCreature(d, 'joueur').entite);
  assert.equal(d.fenetreReponse, false);
});

for (const side of ['joueur', 'sorcier']) test(`${side} répond à l'Embuscade avec un autre instant avant de passer`, () => {
  const { d, a, defender } = combat(side);
  d[side].main = ['parade-du-verre']; d[side].mana.eau = 10;
  assert.ok(rpgMobaJouerCreature(d, defender, garde, 'left', 0, { ouvrirReponse: true }).ok);
  const result = rpgMobaLancerMagie(d, side, 'parade-du-verre', a.id);
  assert.ok(result.ok, JSON.stringify(result));
  assert.ok(d.mobaCreatureEnAttente); assert.equal(d.fenetreReponse, true);
  assert.ok(rpgMobaPasserCreature(d, side).entite);
  assert.ok(d.combatDeclare); assert.equal(d.fenetreReponse, true);
});

for (const side of ['joueur', 'sorcier']) test(`${side} : l'Embuscade ne demande pas de mana, exige son déclencheur et ne bloque pas une autre voie`, () => {
  const { d, a, defender } = combat(side);
  d[defender].mana.neige = 0;
  d[defender].mana.tenebres = 0;
  assert.equal(rpgMobaPeutEmbuscade(d, defender, garde), true);
  assert.ok(rpgMobaJouerCreature(d, defender, garde, 'right', 0, { ouvrirReponse: true }).ok);
  const guard = rpgMobaPasserCreature(d, side).entite; assert.ok(guard);
  const before = JSON.stringify(d);
  assert.equal(rpgMobaLancerAttaque(d, side, [a.id], { [a.id]: [guard.id] }, { declaree: true }).ok, false);
  assert.equal(JSON.stringify(d), before);
  assert.ok(rpgMobaLancerAttaque(d, side, [a.id], {}, { declaree: true }).ok);
  d[defender].main = [garde];
  assert.equal(rpgMobaPeutEmbuscade(d, defender, garde), false);
});

test('une voie conquise pendant la réponse ne laisse pas de créature en attente bloquée', () => {
  const { d, defender } = combat('joueur');
  mobaVoie(d.moba, 'left').hp[defender] = 3;
  d.joueur.main = ['trait-de-braise']; d.joueur.mana.braise = 20;
  assert.ok(rpgMobaJouerCreature(d, defender, garde, 'left', 0, { ouvrirReponse: true }).ok);
  const spell = rpgMobaLancerMagie(d, 'joueur', 'trait-de-braise', 'sorcier', 'left');
  assert.ok(spell.ok, JSON.stringify(spell));
  assert.equal(d.mobaCreatureEnAttente?.carteId, garde);
  const resolved = rpgMobaPasserCreature(d, 'joueur');
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  assert.equal(resolved.dissipe, true);
  assert.equal(d.mobaCreatureEnAttente, null);
  assert.equal(d[defender].cimetiere.filter((id) => id === garde).length, 1);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('la disparition du dernier attaquant ne fait pas perdre une Embuscade déjà annoncée ailleurs', () => {
  const { d, defender } = combat('joueur');
  mobaVoie(d.moba, 'left').hp[defender] = 3;
  d.joueur.main = ['trait-de-braise']; d.joueur.mana.braise = 20;
  assert.ok(rpgMobaJouerCreature(d, defender, garde, 'right', 0, { ouvrirReponse: true }).ok);
  const spell = rpgMobaLancerMagie(d, 'joueur', 'trait-de-braise', 'sorcier', 'left');
  assert.ok(spell.ok); assert.equal(spell.combatTermine, true);
  assert.equal(d.combatDeclare, null); assert.equal(d.fenetreReponse, true);
  const resolved = rpgMobaPasserCreature(d, 'joueur');
  assert.ok(resolved.entite, JSON.stringify(resolved));
  assert.equal(d.fenetreReponse, false); assert.equal(d.phase, 'principale');
  assert.ok(rpgMobaPlacementCoherent(d));
});

for (const side of ['joueur', 'sorcier']) test(`${side} : une Embuscade contrée consomme le quota du défenseur pour ce tour`, () => {
  const { d, a, defender } = combat(side);
  d[defender].main = [garde, garde]; d[side].main = ['ecueil'];
  assert.ok(rpgMobaJouerCreature(d, defender, garde, 'left', 0, { ouvrirReponse: true }).ok);
  assert.ok(rpgMobaLancerMagie(d, side, 'ecueil').contre);
  assert.equal(d.moba.embuscadesJouees[defender], true);
  assert.equal(rpgMobaPeutEmbuscade(d, defender, garde), false);
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaJouerCreature(d, defender, garde, 'left', 0, { ouvrirReponse: true }).ok, false);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaLancerAttaque(d, side, [a.id], {}, { declaree: true }).ok);
  d[defender].main = ['gardienne-des-portes-de-sable'];
  rpgFinDeTour(d);
  assert.equal(d.tour, defender);
  assert.equal(d.moba.embuscadesJouees[defender], false);
  assert.ok(rpgMobaJouerCreature(d, defender, 'gardienne-des-portes-de-sable', 'right', 0, { ouvrirReponse: true }).ok);
});
