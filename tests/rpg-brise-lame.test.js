import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  RPG_MAGIE_CARDS, cardById, magieById,
} from '../src/games/rpgCards.js';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { CARD_ART_HAUTEUR, CARD_ART_LARGEUR } from '../src/games/rpgCardArt.js';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerMagie,
  rpgSortACibleValide,
} from '../src/games/rpgDuel.js';

const CHEMIN = (relatif) => fileURLToPath(new URL(`../${relatif}`, import.meta.url));

function partie() {
  const duel = rpgNouveauDuel({
    joueurDeck: Array(40).fill('montagne'),
    sorcierDeck: Array(40).fill('montagne'),
    rng: () => 0.5,
  });
  for (const cote of ['joueur', 'sorcier']) {
    duel[cote].mana = { braise: 100, sable: 100, eau: 100, neige: 100, tenebres: 100 };
  }
  return duel;
}
function poser(duel, cote, id) {
  duel[cote].main.push(id);
  const res = rpgJouerCreature(duel, cote, id);
  assert.equal(res.ok, true, `${id} se pose`);
  return res.entite;
}
function donnerBriseLame(duel) {
  duel.joueur.main.push('brise-lame');
  return 'brise-lame';
}
function dimensionsJpeg(chemin) {
  const octets = readFileSync(chemin);
  assert.equal(octets[0], 0xff);
  assert.equal(octets[1], 0xd8);
  for (let i = 2; i + 9 < octets.length;) {
    if (octets[i] !== 0xff) { i += 1; continue; }
    const balise = octets[i + 1];
    if (balise >= 0xc0 && balise <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(balise)) {
      return [octets.readUInt16BE(i + 7), octets.readUInt16BE(i + 5)];
    }
    i += 2 + octets.readUInt16BE(i + 2);
  }
  throw new Error('SOF introuvable');
}

test('Brise-lame : fiche Braise, coût 3, Magie Rapide inhabituelle et illustrée', () => {
  const carte = magieById('brise-lame');
  assert.ok(carte, 'la magie existe au catalogue');
  assert.equal(carte.name, 'Brise-lame');
  assert.equal(carte.element, 'braise');
  assert.equal(carte.cost, 3);
  assert.equal(carte.rarity, 'inhabituelle');
  assert.equal(carte.instant, true);
  assert.equal(carte.typeLine, 'Magie Rapide — Braise');
  assert.deepEqual(carte.effet, { type: 'destruction-arme', cible: 'creature', pioche: 1 });
  assert.match(carte.text, /Détruisez une arme équipée à une créature adverse/);
  assert.match(carte.text, /piochez une carte/);
  assert.ok(RPG_MAGIE_CARDS.includes(carte));
  assert.ok(COLLECTION_DEPART.includes('brise-lame'), 'inhabituelle Braise : dans la dotation');
  assert.equal(cardById('brise-lame'), carte);
  const peinture = CHEMIN('public/cards/brise-lame.jpg');
  assert.ok(existsSync(peinture), 'la peinture est livrée');
  assert.deepEqual(dimensionsJpeg(peinture), [CARD_ART_LARGEUR, CARD_ART_HAUTEUR],
    'plein art 4:5 au format livré');
  assert.match(readFileSync(CHEMIN('src/games/rpgCardArt.js'), 'utf8'),
    /'brise-lame': 'braise-brise-lame-v2'/, 'révision de cache dédiée');
});

test('sans créature adverse équipée, le sort ne se lance pas et le mana reste entier', () => {
  const duel = partie();
  const ennemi = poser(duel, 'sorcier', 'momie-de-lin');
  donnerBriseLame(duel);
  assert.equal(rpgSortACibleValide(duel, 'joueur', magieById('brise-lame')), false,
    'la carte ne s’allume pas en main');
  const mana = duel.joueur.mana.braise;
  const res = rpgLancerMagie(duel, 'joueur', 'brise-lame', ennemi.id);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'cible');
  assert.equal(duel.joueur.mana.braise, mana, 'aucun mana dépensé');
  assert.ok(duel.joueur.main.includes('brise-lame'), 'la carte reste en main');
});

test('Brise-lame détruit une arme du prototype, retire ses bonus et fait piocher', () => {
  const duel = partie();
  duel.tour = 'sorcier';
  const ennemi = poser(duel, 'sorcier', 'momie-de-lin');
  duel.sorcier.main.push('takouba-des-pistes');
  const equipement = rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', ennemi.id);
  assert.equal(equipement.ok, true, 'la Takouba s’attache');
  const atkEquipee = ennemi.atk;
  assert.ok(atkEquipee > 2, 'le porteur a bien gagné l’attaque de l’arme');
  duel.tour = 'joueur';
  donnerBriseLame(duel);
  assert.equal(rpgSortACibleValide(duel, 'joueur', magieById('brise-lame')), true,
    'la carte s’allume dès qu’une arme est en jeu');
  const deckAvant = duel.joueur.deck.length;
  const res = rpgLancerMagie(duel, 'joueur', 'brise-lame', ennemi.id);
  assert.equal(res.ok, true);
  assert.equal(ennemi.arme, null, 'plus aucune arme attachée');
  assert.equal(ennemi.atk, 2, 'le bonus +2/+0 est retiré');
  assert.equal(ennemi.infiltration, false, 'le mot-clé prêté par l’arme repart');
  assert.ok(duel.sorcier.cimetiere.includes('takouba-des-pistes'), 'l’arme rejoint le cimetière adverse');
  assert.ok(duel.joueur.creatures.length === 0 && duel.sorcier.creatures.includes(ennemi),
    'la créature adverse reste en jeu');
  assert.equal(duel.joueur.deck.length, deckAvant - 1, 'la pioche de remplacement est effective');
});

test('Brise-lame détruit aussi le Sabre maudit (arme portée par une magie)', () => {
  const duel = partie();
  duel.tour = 'sorcier';
  const ennemi = poser(duel, 'sorcier', 'momie-de-lin');
  duel.sorcier.main.push('sabre-maudit');
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'sabre-maudit', ennemi.id).ok, true);
  assert.deepEqual([ennemi.atk, ennemi.def], [4, 2], '+2/-2 appliqué');
  assert.equal(ennemi.coupRapide, false, 'le Sabre maudit ne donne pas Attaque ciblée');
  duel.tour = 'joueur';
  donnerBriseLame(duel);
  const res = rpgLancerMagie(duel, 'joueur', 'brise-lame', ennemi.id);
  assert.equal(res.ok, true);
  assert.deepEqual(ennemi.armes, [], 'la liste des armes-sorts est vidée');
  assert.deepEqual([ennemi.atk, ennemi.def], [2, 4], 'le bonus du sabre est retiré');
  assert.equal(ennemi.coupRapide, false, 'l’Attaque ciblée prêtée repart');
  assert.ok(duel.sorcier.cimetiere.includes('sabre-maudit'));
});

test('un bouclier Braise bloque Brise-lame après paiement', () => {
  const duel = partie();
  duel.tour = 'sorcier';
  const ennemi = poser(duel, 'sorcier', 'momie-de-lin');
  duel.sorcier.main.push('takouba-des-pistes');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', ennemi.id).ok, true);
  ennemi.protection = { contre: 'braise', toursRestants: 2 };
  duel.tour = 'joueur';
  donnerBriseLame(duel);
  const mana = duel.joueur.mana.braise;
  const res = rpgLancerMagie(duel, 'joueur', 'brise-lame', ennemi.id);
  assert.equal(res.ok, true);
  assert.equal(res.bouclierBloque, true);
  assert.ok(duel.joueur.mana.braise < mana, 'le sort est payé');
  assert.equal(ennemi.protection, null);
  assert.equal(ennemi.arme.carteId, 'takouba-des-pistes', 'l’arme reste attachée');
});
