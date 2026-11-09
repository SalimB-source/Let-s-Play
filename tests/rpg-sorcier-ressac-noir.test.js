import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { RPG_ELEMENTS, cardById, cardHasPrintedType } from '../src/games/rpgCards.js';
import {
  rpgConditionEmbuscadeRemplie, rpgContreJouable, rpgJouerCreature, rpgLancerAttaque, rpgLancerMagie,
  rpgNouveauDuel, rpgPeutRepondre, rpgSorcierResoudreAnnonce,
} from '../src/games/rpgDuel.js';
import { conditionEmbuscadePourApercu, conditionEmbuscadeCourtePourApercu } from '../src/games/rpgCardResume.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';

const id = 'sorcier-du-ressac-noir';
const carte = cardById(id);
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 10]));
  return d;
}
function annoncerCreature(d, carteId = 'chien-du-guet') {
  d.tour = 'sorcier';
  d.sorcier.main.push(carteId);
  d.annonce = { cote: 'sorcier', carteId };
  d.fenetreReponse = true;
}

test('fiche bicolore Vampire et Sorcier, illustration et condition visibles dans l’aperçu', () => {
  assert.deepEqual(carte.colors, ['eau', 'tenebres']);
  assert.deepEqual(carte.colorCost, { eau: 1, tenebres: 1 });
  assert.deepEqual([carte.cost, carte.atk, carte.def], [4, 2, 2]);
  assert.equal(carte.coupRapide, true, 'Attaque ciblée utilise le marqueur de combat coupRapide');
  assert.match(carte.text, /Attaque ciblée/);
  assert.ok(cardHasPrintedType(carte, 'Vampire'));
  assert.ok(cardHasPrintedType(carte, 'Sorcier'));
  assert.equal(carte.conditionEmbuscade, 'creature-jouee-main');
  assert.ok(pastillesPourCarte(carte).some((pastille) => pastille.label === 'Embuscade'));
  assert.match(conditionEmbuscadePourApercu(carte), /joue depuis sa main/);
  assert.match(conditionEmbuscadeCourtePourApercu(carte).join(''), /depuis la main/);
  assert.ok(existsSync(new URL('../public/cards/sorcier-du-ressac-noir.jpg', import.meta.url)));
});

test('l’Embuscade contre une créature annoncée depuis la main avant son arrivée, puis laisse le Vampire en jeu', () => {
  const d = duel();
  d.joueur.main.push(id);
  annoncerCreature(d);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'joueur', carte), true);
  assert.equal(rpgContreJouable(d, 'joueur', carte), true);
  assert.equal(rpgPeutRepondre(d, 'joueur'), true);
  const res = rpgJouerCreature(d, 'joueur', id);
  assert.equal(res.ok, true, res.raison);
  assert.equal(res.contre, true);
  assert.equal(res.carteContree, 'chien-du-guet');
  assert.equal(res.entite.carteId, id);
  assert.deepEqual([res.entite.atk, res.entite.def, res.entite.coupRapide], [2, 2, true]);
  assert.ok(d.joueur.creatures.includes(res.entite));
  assert.ok(!d.joueur.cimetiere.includes(id));
  assert.ok(!d.sorcier.creatures.some((entite) => entite.carteId === 'chien-du-guet'));
  assert.ok(d.sorcier.cimetiere.includes('chien-du-guet'));
  assert.ok(!d.sorcier.main.includes('chien-du-guet'));
  assert.equal(d.annonce, null);
  assert.equal(d.fenetreReponse, false);
  assert.equal(rpgSorcierResoudreAnnonce(d).raison, 'aucune-annonce');
  assert.equal(d.joueur.mana.eau, 9);
  assert.equal(d.joueur.mana.tenebres, 9);
  assert.equal(d.sorcier.mana.sable, 9);
});

test('une carte de héros jouée depuis la main est également une carte de créature contrecarrable', () => {
  const d = duel(); d.joueur.main.push(id);
  annoncerCreature(d, 'souverain-de-la-lune-noire');
  const res = rpgJouerCreature(d, 'joueur', id);
  assert.equal(res.ok, true, res.raison);
  assert.equal(res.carteContree, 'souverain-de-la-lune-noire');
  assert.equal(d.sorcier.creatures.length, 0);
  assert.ok(d.sorcier.cimetiere.includes('souverain-de-la-lune-noire'));
});

test('sans annonce de créature jouée depuis la main, aucune réaction ni dépense (sort, arme, jeton, créature déjà arrivée)', () => {
  for (const annonceId of [null, 'trait-de-braise', 'sabre-du-croissant-noir', 'chien-de-sable', 'chien-du-guet']) {
    const d = duel(); d.tour = 'sorcier'; d.fenetreReponse = true;
    d.joueur.main.push(id);
    if (annonceId) d.annonce = { cote: 'sorcier', carteId: annonceId };
    if (annonceId && annonceId !== 'chien-du-guet') d.sorcier.main.push(annonceId);
    if (annonceId === 'chien-du-guet') {
      d.sorcier.main.push(annonceId);
      const posee = rpgJouerCreature(d, 'sorcier', annonceId);
      assert.ok(posee.ok, posee.raison);
    }
    const avant = JSON.stringify(d);
    assert.equal(rpgConditionEmbuscadeRemplie(d, 'joueur', carte), false);
    assert.equal(rpgContreJouable(d, 'joueur', carte), false);
    assert.equal(rpgPeutRepondre(d, 'joueur'), false);
    assert.equal(rpgJouerCreature(d, 'joueur', id).ok, false);
    assert.equal(JSON.stringify(d), avant);
  }
});

test('le mana insuffisant refuse le contre et conserve intégralement l’annonce', () => {
  const d = duel(); d.joueur.main.push(id);
  annoncerCreature(d);
  d.joueur.mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 0]));
  const avant = JSON.stringify(d);
  assert.equal(rpgJouerCreature(d, 'joueur', id).raison, 'mana');
  assert.equal(JSON.stringify(d), avant);
});

test('pendant son propre tour, le Vampire peut être joué normalement sans contrer une créature déjà posée', () => {
  const d = duel(); d.joueur.main.push(id);
  assert.equal(rpgConditionEmbuscadeRemplie(d, 'joueur', carte), true);
  const res = rpgJouerCreature(d, 'joueur', id);
  assert.equal(res.ok, true, res.raison);
  assert.equal(res.contre, undefined);
  assert.equal(d.joueur.creatures[0].carteId, id);
});

test('son Attaque ciblée inflige 2 dégâts à la créature choisie, sans riposte', () => {
  const d = duel(); d.joueur.main.push(id);
  const vampire = rpgJouerCreature(d, 'joueur', id).entite;
  d.sorcier.main.push('fennec-des-decombres');
  const fennec = rpgJouerCreature(d, 'sorcier', 'fennec-des-decombres').entite;
  Object.assign(fennec, { pv: 5, def: 5, pvMax: 5 });
  vampire.ready = true;
  const pvSorcier = d.sorcier.pv;
  const res = rpgLancerAttaque(d, 'joueur', [vampire.id], {}, null, null, { [vampire.id]: fennec.id });
  assert.equal(res.ok, true, res.raison);
  assert.equal(fennec.pv, 3);
  assert.equal(vampire.pv, 2);
  assert.equal(d.sorcier.pv, pvSorcier);
});

test('l’IA ne contre pas les magies avec ce Vampire', () => {
  const d = duel(); d.joueur.main.push('embuscade'); d.sorcier.main.push(id);
  const res = rpgLancerMagie(d, 'joueur', 'embuscade');
  assert.equal(res.ok, true, res.raison);
  assert.ok(d.sorcier.main.includes(id));
  assert.equal(d.sorcier.creatures.length, 0);
});

test('l’IA peut jouer le Vampire en réaction à la créature du joueur', () => {
  const d = duel(); d.joueur.main.push('garde-du-trone-givre'); d.sorcier.main.push(id);
  const res = rpgJouerCreature(d, 'joueur', 'garde-du-trone-givre');
  assert.equal(res.ok, true, res.raison);
  assert.equal(res.contre, true);
  assert.equal(res.parIA, true);
  assert.equal(res.carteContree, 'garde-du-trone-givre');
  assert.equal(d.sorcier.creatures[0].carteId, id);
  assert.equal(d.joueur.creatures.length, 0);
  assert.ok(d.joueur.cimetiere.includes('garde-du-trone-givre'));
});
