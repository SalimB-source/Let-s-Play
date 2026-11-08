import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardArt } from '../src/games/rpgCardArt.js';
import { effetsDetailles, iconePourLigne } from '../src/games/effetIcons.js';
import { texteApercuSansDoublons } from '../src/games/rpgCardResume.js';
import { RPG_CREATURE_CARDS, RPG_DUEL_CARDS, RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { carteAuVivier, carteFavoriseeRayon } from '../src/games/rpgBoosters.js';
import {
  rpgBlesserCreature, rpgFinDeTour, rpgJouerCreature, rpgLancerAttaque,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';

const BETES = [
  ['gerboise-des-ruines', 2, 1, 'commune'],
  ['scarabee-des-sceaux', 1, 2, 'inhabituelle'],
  ['scorpion-du-seuil', 1, 2, 'inhabituelle'],
];

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 10]));
  }
  return d;
}

function poser(d, cote, id) {
  d[cote].main.push(id);
  const resultat = rpgJouerCreature(d, cote, id);
  assert.equal(resultat.ok, true, `${id} entre en jeu : ${resultat.raison}`);
  return resultat.entite;
}

test('les trois petites bêtes Sable coûtent deux, ont chacune une peinture et rejoignent le Souk', () => {
  for (const [id, atk, def, rarity] of BETES) {
    const carte = cardById(id);
    assert.ok(carte, `${id} existe`);
    assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def, carte.rarity],
      ['sable', 2, atk, def, rarity]);
    assert.equal(carte.art, id, 'une peinture dédiée à chaque créature');
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)));
    assert.match(cardArt(id), new RegExp(`cards/${id}\\.jpg\\?v=sable-petites-betes-v1$`));
    assert.ok(RPG_CREATURE_CARDS.some((candidate) => candidate.id === id));
    assert.ok(RPG_DUEL_CARDS.some((candidate) => candidate.id === id && candidate.kind === 'creature'));
    assert.equal(carteAuVivier(id), true);
    assert.equal(carteFavoriseeRayon('set-sable', carte), true);
  }
});

test('la Gerboise peut attaquer dès son arrivée', () => {
  const d = duel();
  const gerboise = poser(d, 'joueur', 'gerboise-des-ruines');
  assert.equal(gerboise.ready, true);
  const pv = d.sorcier.pv;
  assert.equal(rpgLancerAttaque(d, 'joueur', [gerboise.id], {}).ok, true);
  assert.equal(d.sorcier.pv, pv - 2);
});

test('le Scarabée fait piocher une seule carte à son contrôleur en mourant', () => {
  const d = duel();
  d.joueur.deck.push('chien-du-guet');
  const scarabee = poser(d, 'joueur', 'scarabee-des-sceaux');
  const avant = d.joueur.main.length;
  rpgBlesserCreature(d, 'joueur', scarabee.id, 2, 'braise');
  assert.ok(d.joueur.cimetiere.includes('scarabee-des-sceaux'));
  assert.equal(d.joueur.main.length, avant + 1);
  assert.ok(d.joueur.main.includes('chien-du-guet'));
});

test('Poison a sa pastille et la preview ne répète pas sa description', () => {
  const carte = cardById('scorpion-du-seuil');
  const lecture = effetsDetailles(carte);
  const pastille = lecture.pastilles.find((effet) => effet.cle === 'poison');
  assert.ok(pastille);
  assert.match(pastille.description, /1 PV.*deux prochains tours/u);
  assert.equal(lecture.texte, '');
  assert.equal(texteApercuSansDoublons(lecture), '');
  assert.equal(iconePourLigne(carte, carte.text), 'poison');
});

test('Poison : une blessure en combat inflige 1 PV aux deux prochains tours de la victime', () => {
  const d = duel();
  const dune = poser(d, 'sorcier', 'dune-marchante');
  const scorpion = poser(d, 'joueur', 'scorpion-du-seuil');
  scorpion.ready = true;
  assert.deepEqual(cardById('scorpion-du-seuil').poison, { degats: 1, tours: 2 });
  assert.equal(cardById('scorpion-du-seuil').destruction, undefined,
    'le Scorpion ne blesse plus personne en mourant');
  assert.equal(rpgLancerAttaque(d, 'joueur', [scorpion.id], { [scorpion.id]: [dune.id] }).ok, true);
  assert.equal(dune.pv, 3, 'la première blessure est celle de l’attaque');
  assert.equal(dune.poison?.toursRestants, 2);
  assert.ok(d.joueur.cimetiere.includes('scorpion-du-seuil'), 'le poison persiste après la mort du Scorpion');
  assert.equal(d.destructionsEnAttente?.length ?? 0, 0, 'aucun ancien effet ciblé à la mort');
  rpgFinDeTour(d); // début du tour de la victime
  assert.equal(dune.pv, 2);
  assert.equal(dune.poison?.toursRestants, 1);
  rpgFinDeTour(d); // tour du joueur : le poison ne frappe pas
  assert.equal(dune.pv, 2);
  rpgFinDeTour(d); // deuxième tour de la victime
  assert.equal(dune.pv, 1);
  assert.equal(dune.poison, null);
  rpgFinDeTour(d);
  rpgFinDeTour(d);
  assert.equal(dune.pv, 1, 'pas de troisième dégât');
});

test('Poison : il fonctionne aussi quand le Scorpion bloque et peut achever sa victime', () => {
  const d = duel();
  const scorpion = poser(d, 'joueur', 'scorpion-du-seuil');
  const dune = poser(d, 'sorcier', 'dune-marchante');
  dune.ready = true;
  d.tour = 'sorcier';
  assert.equal(rpgLancerAttaque(d, 'sorcier', [dune.id], { [dune.id]: [scorpion.id] }).ok, true);
  assert.equal(dune.pv, 3);
  assert.equal(dune.poison?.toursRestants, 2);
  assert.ok(d.joueur.cimetiere.includes('scorpion-du-seuil'));
  rpgFinDeTour(d); // joueur
  assert.equal(dune.pv, 3);
  rpgFinDeTour(d); // sorcier
  assert.equal(dune.pv, 2);
  rpgBlesserCreature(d, 'sorcier', dune.id, 1, 'braise');
  rpgFinDeTour(d);
  rpgFinDeTour(d); // deuxième dose, fatale
  assert.ok(d.sorcier.cimetiere.includes('dune-marchante'));
});

test('Poison ne cible pas le sorcier et disparaît si la victime quitte la table', () => {
  const d = duel();
  const scorpion = poser(d, 'joueur', 'scorpion-du-seuil');
  scorpion.ready = true;
  const pvSorcier = d.sorcier.pv;
  assert.equal(rpgLancerAttaque(d, 'joueur', [scorpion.id], {}).ok, true);
  assert.equal(d.sorcier.pv, pvSorcier - 1);
  assert.equal(d.sorcier.poison, undefined);
  assert.equal(scorpion.poison, null);
  const cible = poser(d, 'sorcier', 'dune-marchante');
  cible.poison = { degats: 1, toursRestants: 2, sourceCarteId: 'scorpion-du-seuil' };
  rpgBlesserCreature(d, 'sorcier', cible.id, 10, 'eau');
  assert.ok(!d.sorcier.creatures.includes(cible));
  const nouvelle = poser(d, 'sorcier', 'dune-marchante');
  assert.equal(nouvelle.poison, null, 'une nouvelle instance n’hérite pas du poison');
});

test('Poison : une parade ou une cible qui meurt sur le coup ne reçoit pas de marque', () => {
  const d = duel();
  const protege = poser(d, 'sorcier', 'chien-du-guet');
  protege.bouclierLumiere = true;
  const scorpion = poser(d, 'joueur', 'scorpion-du-seuil');
  scorpion.ready = true;
  assert.equal(rpgLancerAttaque(d, 'joueur', [scorpion.id], { [scorpion.id]: [protege.id] }).ok, true);
  assert.equal(protege.poison, null);

  const autre = duel();
  const fragile = poser(autre, 'sorcier', 'tislit-des-aures');
  const second = poser(autre, 'joueur', 'scorpion-du-seuil');
  second.ready = true;
  assert.equal(rpgLancerAttaque(autre, 'joueur', [second.id], { [second.id]: [fragile.id] }).ok, true);
  assert.equal(fragile.poison, null, 'pas de poison à transporter hors de la table');
});

test('Poison : une nouvelle piqûre renouvelle deux tours sans cumuler les doses', () => {
  const d = duel();
  const dune = poser(d, 'sorcier', 'dune-marchante');
  dune.pv = dune.def = dune.pvMax = 8; // cible résistante pour observer les deux piqûres
  const premier = poser(d, 'joueur', 'scorpion-du-seuil');
  premier.ready = true;
  assert.equal(rpgLancerAttaque(d, 'joueur', [premier.id], { [premier.id]: [dune.id] }).ok, true);
  rpgFinDeTour(d); // premier dégât différé : reste 1 tour
  assert.equal(dune.poison?.toursRestants, 1);
  rpgFinDeTour(d);
  d.joueur.mana.sable = 10;
  const second = poser(d, 'joueur', 'scorpion-du-seuil');
  second.ready = true;
  assert.equal(rpgLancerAttaque(d, 'joueur', [second.id], { [second.id]: [dune.id] }).ok, true);
  assert.equal(dune.poison?.toursRestants, 2, 'durée renouvelée');
  const pv = dune.pv;
  rpgFinDeTour(d);
  assert.equal(dune.pv, pv - 1, 'une seule dose par tour');
});
