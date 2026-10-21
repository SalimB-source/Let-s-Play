import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardById, RPG_DECKS, terrainManaColors, rpgValiderDeck } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';
import { choisirCarteIA, choisirCiblesRapidesIA } from '../src/games/rpgAI.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgFinDeTour, rpgBlesserCreature, rpgLancerAttaque, rpgAttaquerSorcier } from '../src/games/rpgDuel.js';

function partie() {
  const duel = rpgNouveauDuel({ joueurDeck: Array(40).fill('montagne'), sorcierDeck: Array(40).fill('montagne'), rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = { braise: 100, sable: 100, eau: 100, neige: 100, tenebres: 100 };
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

test('le sabre accompagne le starter sans terrain et reste à acquérir au Souk', () => {
  const sabre = cardById('sabre-maudit');
  assert.equal(sabre.typeLine, 'Arme — Sabre maudit');
  assert.equal(sabre.cost, 4);
  assert.equal(sabre.honneur, undefined);
  assert.deepEqual(sabre.effet, { type: 'arme', cible: 'creature-amie', atk: 1, def: 0, coupRapide: true });
  const deck = RPG_DECKS.find((d) => d.id === 'serment-du-soleil-rouge');
  assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
  assert.equal(deck.cardIds.filter((id) => id === 'sabre-maudit').length, 2, 'le starter de trente cartes inclut deux sabres');
  assert.equal(COLLECTION_DEPART.includes('sabre-maudit'), false);
  assert.ok(carteReveleePar('sabre-maudit'), 'le sabre est accessible dans un booster après sa révélation');
  assert.equal(deck.cardIds.filter((id) => id === 'montagne-du-soleil-rouge').length, 0);
  assert.deepEqual(terrainManaColors('montagne-du-soleil-rouge'), ['braise']);
  assert.equal(cardById('montagne-du-soleil-rouge').varianteDe, 'montagne');
});

test('l’arme applique +1/+0, reste attachée et persiste entre les tours', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'momie-de-lin');
  assert.equal(armer(duel, porteur).ok, true);
  assert.deepEqual([porteur.atk, porteur.def, porteur.pvMax], [3, 4, 4]);
  assert.equal(porteur.coupRapide, true);
  assert.equal(porteur.ready, false, 'Coup rapide ne donne pas Rapidité');
  assert.deepEqual(porteur.armes, ['sabre-maudit']);
  assert.ok(!duel.joueur.cimetiere.includes('sabre-maudit'));
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.deepEqual([porteur.atk, porteur.def], [3, 4]);
});

test('la cible doit être alliée et non protégée, sans consommation sur cible invalide', () => {
  const duel = partie();
  const ennemi = poser(duel, 'sorcier', 'samourai-du-torii');
  const mana = duel.joueur.mana.braise;
  assert.equal(armer(duel, ennemi).ok, false);
  assert.equal(duel.joueur.mana.braise, mana);
  const protege = poser(duel, 'joueur', 'tiziri-du-djurdjura');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', protege.id).raison, 'protection');
  assert.ok(duel.joueur.main.includes('sabre-maudit'));
});

test('le sabre ne ronge plus la défense : le porteur survit, lame au poing', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'ronin-du-soleil-rouge');
  assert.equal(armer(duel, porteur).ok, true);
  assert.equal(duel.joueur.creatures.includes(porteur), true,
    '+1/+0 ne menace plus la vie du porteur');
  assert.deepEqual([porteur.atk, porteur.def], [4, 2]);
  assert.deepEqual(porteur.armes, ['sabre-maudit']);
  assert.equal(duel.joueur.cimetiere.includes('sabre-maudit'), false,
    'le sabre reste attaché, pas au cimetière');
});

test('le porteur frappe à sa force augmentée, sans riposte, et l’attaque s’arrête là', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'momie-de-lin');
  const cible = poser(duel, 'sorcier', 'chien-du-guet');
  armer(duel, porteur);
  porteur.ready = true;
  const pvSorcier = duel.sorcier.pv;
  const r = rpgLancerAttaque(duel, 'joueur', [porteur.id], {}, null, null, { [porteur.id]: cible.id });
  assert.equal(r.ok, true);
  assert.equal(r.resume.coupsRapides[0].degats, 3);
  assert.equal(duel.sorcier.creatures.length, 0, 'le Chien 2/2 tombe sous les 3 dégâts');
  assert.equal(porteur.def, 4, 'la créature détruite ne riposte pas');
  assert.equal(duel.sorcier.pv, pvSorcier, 'l’attaque s’arrête sur la frappe rapide');
});

test('sans créature désignée, le porteur du Sabre maudit attaque le sorcier de ses 3 dégâts', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'momie-de-lin');
  const cible = poser(duel, 'sorcier', 'colosse-de-sel');
  armer(duel, porteur);
  porteur.ready = true;
  const pvSorcier = duel.sorcier.pv;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [porteur.id], { [porteur.id]: [] }).ok, true,
    'le Coup rapide n’impose plus de cible');
  assert.equal(duel.sorcier.pv, pvSorcier - 3, 'la force augmentée part au visage');
  assert.equal(duel.sorcier.creatures.includes(cible), true, 'la créature écartée reste en jeu');
});

test('l’attaque directe du sorcier reconnaît aussi Coup rapide accordé par une arme', () => {
  const duel = partie();
  const porteur = poser(duel, 'joueur', 'momie-de-lin');
  const cible = poser(duel, 'sorcier', 'chien-du-guet');
  armer(duel, porteur);
  porteur.ready = true;
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', porteur.id, cible.id).ok, true);
  assert.equal(duel.sorcier.creatures.length, 0);
});

test('mort et renvoi du porteur envoient le sabre au cimetière, jamais en main', () => {
  for (const renvoi of [false, true]) {
    const duel = partie();
    const porteur = poser(duel, 'joueur', 'momie-de-lin');
    armer(duel, porteur);
    if (renvoi) {
      duel.tour = 'sorcier';
      duel.sorcier.main.push('ressac');
      assert.equal(rpgLancerMagie(duel, 'sorcier', 'ressac', porteur.id).ok, true);
      assert.ok(duel.joueur.main.includes('momie-de-lin'));
    } else rpgBlesserCreature(duel, 'joueur', porteur.id, 5, 'eau');
    assert.equal(duel.joueur.cimetiere.filter((id) => id === 'sabre-maudit').length, 1);
    assert.ok(!duel.joueur.main.includes('sabre-maudit'));
    if (renvoi) {
      const neuf = poser(duel, 'joueur', 'momie-de-lin');
      assert.equal(neuf.coupRapide, false);
      assert.equal(neuf.atk, 2, '2/4 imprimé, sans le sabre resté au cimetière');
    }
  }
});

test('le sabre est sérialisable et l’IA arme sa meilleure créature', () => {
  const duel = partie();
  const fragile = poser(duel, 'sorcier', 'ashigaru-des-braises');
  const robuste = poser(duel, 'sorcier', 'momie-de-lin');
  const cible = poser(duel, 'joueur', 'chien-du-guet');
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

test('le sabre porte le cadre d’acier des armes, comme les autres armes', async () => {
  const { cardFrameInfo, cardFrameClass, carteEstArme, bonusArme, cardById: byId } = await import('../src/games/rpgCards.js');
  const sabre = byId('sabre-maudit');
  assert.equal(carteEstArme(sabre), true);
  assert.equal(sabre.kind, 'magie', 'le moteur le garde parmi les magies (ciblage, porteur.armes)');
  assert.equal(cardFrameInfo(sabre).key, 'arme');
  assert.equal(cardFrameClass(sabre), 'rpg-card--frame-arme rpg-card--frame-arme-braise');
  assert.deepEqual(bonusArme(sabre), { atk: 1, def: 0 });
  assert.deepEqual(bonusArme(byId('takouba-des-pistes')), { atk: 2, def: 0 });
  assert.equal(carteEstArme(byId('samourai-du-torii')), false);
  assert.equal(bonusArme(byId('samourai-du-torii')), null);
  assert.match(sabre.text, /^Arme — Le porteur gagne \+1\/\+0/, 'texte au format des autres armes');
});

test('équipé, le Sabre ne se dessine plus en miniature sur son porteur', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const batailleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const mobileCss = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');

  // Le Sabre vit dans `entite.armes` : l'ancienne rangée `.rpg-card__weapons`
  // en faisait une carte de 22 × 28 px collée sur la créature. Elle a disparu
  // de toutes les surfaces ; l'équipement se lit au cadre d'acier du porteur.
  assert.doesNotMatch(page, /rpg-card__weapons/);
  assert.doesNotMatch(batailleCss, /\.rpg-card__weapons\b/);
  assert.doesNotMatch(mobileCss, /\.rpg-card__weapons\b/);
  assert.match(page, /is-arme-equipee/, 'le cadre d’acier signale toujours l’équipement');
  assert.match(page, /data-armes=\{armes\.length \? armes\.join\(' '\) : undefined\}/,
    'les armes portées restent transmises aux aperçus');
  assert.match(page, /rpg-hover-card-preview__weapons/,
    'la carte du Sabre reste lisible dans l’aperçu du porteur');
});
