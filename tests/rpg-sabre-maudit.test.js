import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_DECKS_ARCHETYPES, rpgValiderDeck } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgLancerAttaque, rpgReglerHasard } from '../src/games/rpgDuel.js';

function partie(rng = () => 0.5) {
  const duel = rpgNouveauDuel({ joueurDeck: Array(40).fill('montagne'), sorcierDeck: Array(40).fill('montagne'), rng });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = { braise: 100, sable: 100, eau: 100, neige: 100, tenebres: 100 };
  return duel;
}
function poser(duel, cote, id) {
  duel[cote].main.push(id);
  const resultat = rpgJouerCreature(duel, cote, id);
  assert.equal(resultat.ok, true);
  return resultat.entite;
}
function armer(duel, porteur) {
  duel.joueur.main.push('sabre-maudit');
  return rpgLancerMagie(duel, 'joueur', 'sabre-maudit', porteur.id);
}

test('Sabre maudit : +2/-2, sans Attaque ciblée, avec Coup critique x2 à 25 %', () => {
  const sabre = cardById('sabre-maudit');
  assert.equal(sabre.typeLine, 'Arme — Sabre maudit');
  assert.deepEqual(sabre.effet, { type: 'arme', cible: 'creature-amie', atk: 2, def: -2, coupCritique: 0.25 });
  assert.equal(sabre.effet.coupRapide, undefined);
  assert.match(sabre.text, /\+2\/-2/);
  assert.match(sabre.text, /Coup critique/);
  assert.match(sabre.text, /25 %/);
  const deck = RPG_DECKS_ARCHETYPES.find((d) => d.id === 'serment-du-soleil-rouge');
  assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
});

test('l’équipement applique les stats et le Coup critique au porteur', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'momie-de-lin');
  assert.equal(armer(duel, porteur).ok, true);
  assert.deepEqual([porteur.atk, porteur.def, porteur.pvMax, porteur.pv], [4, 2, 2, 2]);
  assert.equal(porteur.coupRapide, false, 'le sabre ne donne plus Attaque ciblée');
  assert.deepEqual(porteur.coupCritique, { chance: 0.25, fois: 2 });
  assert.deepEqual(porteur.armes, ['sabre-maudit']);
});

test('le Coup critique inflige bien le double des dégâts d’attaque à une créature', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'momie-de-lin');
  const cible = poser(duel, 'sorcier', 'chien-du-guet');
  cible.pv = 10;
  cible.pvMax = 10;
  cible.def = 10;
  assert.equal(armer(duel, porteur).ok, true);
  porteur.ready = true;
  rpgReglerHasard(duel, () => 0); // garantit le jet critique à 25 %
  const resultat = rpgLancerAttaque(duel, 'joueur', [porteur.id], { [porteur.id]: [cible.id] });
  assert.equal(resultat.ok, true);
  assert.equal(cible.pv, 2, 'la force 4 est doublée : 8 blessures');
});

test('le Sabre ne peut être attaché qu’à une créature alliée', () => {
  const duel = partie();
  const ennemie = poser(duel, 'sorcier', 'samourai-du-torii');
  duel.joueur.main.push('sabre-maudit');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', ennemie.id).ok, false);
  assert.ok(duel.joueur.main.includes('sabre-maudit'));
});
