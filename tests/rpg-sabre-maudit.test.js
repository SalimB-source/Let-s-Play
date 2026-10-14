import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_DECKS, terrainManaColors, rpgValiderDeck } from '../src/games/rpgCards.js';
import { choisirCarteIA, choisirCiblesRapidesIA } from '../src/games/rpgAI.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgFinDeTour, rpgBlesserCreature, rpgLancerAttaque, rpgAttaquerSorcier } from '../src/games/rpgDuel.js';

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: Array(40).fill('montagne'), sorcierDeck: Array(40).fill('montagne'), rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = { braise: 100, sable: 100, eau: 100, neige: 100 };
  return duel;
}
function poser(duel, cote, id) {
  duel[cote].main.push(id);
  const r = rpgJouerCreature(duel, cote, id);
  assert.equal(r.ok, true);
  return r.entite;
}
function armer(duel, cible) {
  duel.joueur.main.push('sabre-maudit');
  return rpgLancerMagie(duel, 'joueur', 'sabre-maudit', cible.id);
}

test('le sabre et la montagne dédiée sont présents dans le deck valide du Soleil rouge', () => {
  const sabre = cardById('sabre-maudit');
  assert.equal(sabre.typeLine, 'Arme — Sabre maudit');
  assert.equal(sabre.cost, 4);
  assert.equal(sabre.honneur, undefined);
  assert.deepEqual(sabre.effet, { type: 'arme', cible: 'creature-amie', atk: 5, def: -2, coupRapide: true });
  const deck = RPG_DECKS.find((d) => d.id === 'serment-du-soleil-rouge');
  assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
  assert.equal(deck.cardIds.filter((id) => id === 'sabre-maudit').length, 2);
  assert.equal(deck.cardIds.filter((id) => id === 'montagne-du-soleil-rouge').length, 8);
  assert.deepEqual(terrainManaColors('montagne-du-soleil-rouge'), ['braise']);
  assert.equal(cardById('montagne-du-soleil-rouge').varianteDe, 'montagne');
});

test('l’arme applique +5/-2, reste attachée et persiste entre les tours', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'samourai-du-torii');
  assert.equal(armer(duel, porteur).ok, true);
  assert.deepEqual([porteur.atk, porteur.def, porteur.pvMax], [8, 2, 2]);
  assert.equal(porteur.coupRapide, true);
  assert.equal(porteur.ready, false, 'Coup rapide ne donne pas Rapidité');
  assert.deepEqual(porteur.armes, ['sabre-maudit']);
  assert.ok(!duel.joueur.cimetiere.includes('sabre-maudit'));
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.deepEqual([porteur.atk, porteur.def], [8, 2]);
});

test('la cible doit être alliée et non protégée, sans consommation sur cible invalide', () => {
  const duel = partie();
  const ennemi = poser(duel, 'sorcier', 'samourai-du-torii');
  const mana = duel.joueur.mana.braise;
  assert.equal(armer(duel, ennemi).ok, false);
  assert.equal(duel.joueur.mana.braise, mana);
  const protege = poser(duel, 'joueur', 'amayas-du-hoggar');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', protege.id).raison, 'protection');
  assert.ok(duel.joueur.main.includes('sabre-maudit'));
});

test('une défense réduite à zéro tue le porteur et déclenche son Honneur', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'ronin-du-soleil-rouge');
  const cible = poser(duel, 'sorcier', 'drakkar-a-tete-de-dragon');
  assert.equal(armer(duel, porteur).ok, true);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(cible.def, 5);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === 'sabre-maudit').length, 1);
});

test('le porteur utilise Coup rapide à sa force augmentée, sans riposte, puis attaque', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'samourai-du-torii');
  const cible = poser(duel, 'sorcier', 'colosse-de-sel');
  armer(duel, porteur);
  porteur.ready = true;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [porteur.id], {}).raison, 'cible');
  const r = rpgLancerAttaque(duel, 'joueur', [porteur.id], { [porteur.id]: cible.id }, null, null, { [porteur.id]: cible.id });
  assert.equal(r.ok, true);
  assert.equal(r.resume.coupsRapides[0].degats, 8);
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(porteur.def, 2, 'le colosse détruit ne riposte pas');
  assert.equal(duel.sorcier.pv, 17);
});

test('l’attaque directe du sorcier reconnaît aussi Coup rapide accordé par une arme', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'samourai-du-torii');
  const cible = poser(duel, 'sorcier', 'colosse-de-sel');
  armer(duel, porteur);
  porteur.ready = true;
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', porteur.id, cible.id).ok, true);
  assert.equal(duel.sorcier.creatures.length, 0);
});

test('mort et renvoi du porteur envoient le sabre au cimetière, jamais en main', () => {
  for (const renvoi of [false, true]) {
    const duel = partie();
    const porteur = poser(duel, 'joueur', 'samourai-du-torii');
    armer(duel, porteur);
    if (renvoi) {
      duel.tour = 'sorcier';
      duel.sorcier.main.push('ressac');
      assert.equal(rpgLancerMagie(duel, 'sorcier', 'ressac', porteur.id).ok, true);
      assert.ok(duel.joueur.main.includes('samourai-du-torii'));
    } else rpgBlesserCreature(duel, 'joueur', porteur.id, 5, 'eau');
    assert.equal(duel.joueur.cimetiere.filter((id) => id === 'sabre-maudit').length, 1);
    assert.ok(!duel.joueur.main.includes('sabre-maudit'));
    if (renvoi) {
      const neuf = poser(duel, 'joueur', 'samourai-du-torii');
      assert.equal(neuf.coupRapide, false);
      assert.equal(neuf.atk, 3);
    }
  }
});

test('le sabre est sérialisable et l’IA utilise une cible survivant au malus', () => {
  const duel = partie();
  const fragile = poser(duel, 'sorcier', 'ashigaru-des-braises');
  const robuste = poser(duel, 'sorcier', 'samourai-du-torii');
  const cible = poser(duel, 'joueur', 'colosse-de-sel');
  duel.sorcier.main = ['sabre-maudit'];
  duel.tour = 'sorcier';
  const choix = choisirCarteIA(duel, 'sorcier');
  assert.equal(choix.carteId, 'sabre-maudit');
  assert.equal(choix.cibleId, robuste.id);
  assert.notEqual(choix.cibleId, fragile.id);
  assert.equal(rpgLancerMagie(duel, 'sorcier', choix.carteId, choix.cibleId).ok, true);
  robuste.ready = true;
  assert.equal(choisirCiblesRapidesIA(duel, 'sorcier', [robuste.id])[robuste.id], cible.id);
  const copie = JSON.parse(JSON.stringify(duel));
  assert.deepEqual(copie.sorcier.creatures.find((e) => e.id === robuste.id).armes, ['sabre-maudit']);
});
