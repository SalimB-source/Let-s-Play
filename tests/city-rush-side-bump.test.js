import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CAR_GAP,
  CITY_RUSH_SIDE_BUMP_HOLD,
  CITY_RUSH_SIDE_BUMP_SKID,
  CITY_RUSH_SIDE_CONTACT_GAP,
  CITY_RUSH_TRAFFIC_CAR_GAP,
  cityRushIsAlongside,
  cityRushIsLevel,
  cityRushPlayerDamage,
  cityRushPoliceDamage,
  cityRushSideBumpChoice,
  cityRushSideBumpKeep,
  cityRushSideBumpLane,
  cityRushSideBumpLaneClear,
} from '../src/games/cityRushRules.js';

// Six voies, sens de circulation à droite : la course sur les trois premières,
// le contresens sur les trois dernières (voir `cityRushLaneConfig`).
const FORWARD = [0, 1, 2];
const ONCOMING = [3, 4, 5];

const car = (id, lane, distance, allowedLanes = FORWARD, extra = {}) => ({
  id, lane, distance, allowedLanes, ...extra,
});

test('le seuil de côte-à-côte est le pare-chocs contre pare-chocs du trafic', () => {
  assert.equal(CITY_RUSH_SIDE_CONTACT_GAP, CITY_RUSH_TRAFFIC_CAR_GAP);
  // La voie reste fermée au-delà du seuil (distance de sécurité), sans choc.
  assert.ok(CITY_RUSH_SIDE_CONTACT_GAP < CITY_RUSH_CAR_GAP);
});

test('une voiture est à côté du pilote dans la voie voisine, à la même hauteur', () => {
  assert.equal(cityRushIsAlongside(2, 3, 0), true);
  assert.equal(cityRushIsAlongside(2, 1, 1.5), true);
  // Légèrement en retrait : toujours à côté tant que l'écart est sous le seuil.
  assert.equal(cityRushIsAlongside(2, 3, -3.5), true);
  // Le seuil est exclu : à 3,6 m, on n'est plus à côté.
  assert.equal(cityRushIsAlongside(2, 3, CITY_RUSH_SIDE_CONTACT_GAP), false);
  assert.equal(cityRushIsAlongside(2, 3, 4.0), false);
  // Même voie : ce n'est pas un côte-à-côte, c'est une voiture devant ou derrière.
  assert.equal(cityRushIsAlongside(2, 2, 0), false);
  // Deux voies plus loin : la voie voisine reste libre.
  assert.equal(cityRushIsAlongside(2, 4, 0), false);
  assert.equal(cityRushIsAlongside(2, null, 0), false);
  assert.equal(cityRushIsAlongside(2, 3, Number.NaN), false);
});

test('l\'épisode tient tant que la voiture reste à la même hauteur, à deux voies au plus', () => {
  assert.equal(cityRushIsLevel(2, 4, 0), true);
  assert.equal(cityRushIsLevel(2, 3, 2), true);
  assert.equal(cityRushIsLevel(2, 5, 0), false);
  assert.equal(cityRushIsLevel(2, 4, CITY_RUSH_SIDE_CONTACT_GAP), false);
});

test('une voiture se pousse sur la voie voisine, du côté opposé au pilote', () => {
  // Trafic à droite du pilote : il part encore plus à droite.
  assert.equal(cityRushSideBumpLane(1, 2, FORWARD), 0);
  // Le contresens à droite de la course : la voiture part encore plus à droite.
  assert.equal(cityRushSideBumpLane(3, 2, ONCOMING), 4);
  assert.equal(cityRushSideBumpLane(4, 3, ONCOMING), 5);
  // Voiture à gauche du pilote : elle part encore plus à gauche (voie 2),
  // ici sur un parcours où toutes les voies sont dans le même sens.
  assert.equal(cityRushSideBumpLane(3, 4, [0, 1, 2, 3, 4, 5]), 2);
  // À gauche, côté course : la voie 2 est bien de la course, pas du contresens.
  assert.equal(cityRushSideBumpLane(3, 4, ONCOMING), null);
});

test('pas de voie d\'arrivée au bord de la chaussée ni hors du sens de circulation', () => {
  // Bord gauche : rien au-delà de la voie 0.
  assert.equal(cityRushSideBumpLane(0, 1, FORWARD), null);
  // Bord droit du contresens.
  assert.equal(cityRushSideBumpLane(5, 4, ONCOMING), null);
  // Une voiture de la course ne se pousse jamais dans le contresens.
  assert.equal(cityRushSideBumpLane(2, 1, FORWARD), null);
  // Sur un circuit à quatre voies, tout est de la course : bord à la voie 3.
  assert.equal(cityRushSideBumpLane(3, 2, [0, 1, 2, 3]), null);
  assert.equal(cityRushSideBumpLane(2, 2, FORWARD), null);
  assert.equal(cityRushSideBumpLane(Number.NaN, 2, FORWARD), null);
});

test('une voie d\'arrivée occupée à la même hauteur bloque la poussée', () => {
  const cars = [car('a', 4, 12), car('self', 4, 10)];
  assert.equal(cityRushSideBumpLaneClear(4, 10, cars, { id: 'self' }), false);
  // Assez loin : la voie est libre.
  assert.equal(cityRushSideBumpLaneClear(4, 10, [car('a', 4, 10 + CITY_RUSH_CAR_GAP)], { id: 'self' }), true);
  // La voiture poussée ne se bloque pas elle-même.
  assert.equal(cityRushSideBumpLaneClear(4, 10, [car('self', 4, 10)], { id: 'self' }), true);
});

test('le choix pousse la voiture la plus proche, vers une voie libre', () => {
  const cars = [
    car('far', 3, 98.5, ONCOMING),
    car('near', 3, 101, ONCOMING),
  ];
  const choice = cityRushSideBumpChoice({ playerLane: 2, playerDistance: 100, targetLane: 3, cars });
  assert.equal(choice.car.id, 'near');
  assert.equal(choice.farLane, 4);
});

test('pas de choc quand la voie d\'arrivée est occupée ou au bord', () => {
  // Voie d'arrivée occupée à côté de la voiture : elle reste en place.
  const blocked = cityRushSideBumpChoice({
    playerLane: 2,
    playerDistance: 100,
    targetLane: 3,
    cars: [car('o', 3, 101, ONCOMING), car('blocker', 4, 103, ONCOMING)],
  });
  assert.equal(blocked, null);
  // Au bord de la chaussée (voie 5 du contresens, pas de voie 6) : pas de choc.
  const edge = cityRushSideBumpChoice({
    playerLane: 4,
    playerDistance: 100,
    targetLane: 5,
    cars: [car('o', 5, 101, ONCOMING)],
  });
  assert.equal(edge, null);
  // Pas de voiture à côté : rien à pousser.
  const none = cityRushSideBumpChoice({
    playerLane: 2,
    playerDistance: 100,
    targetLane: 3,
    cars: [car('far', 3, 120, ONCOMING)],
  });
  assert.equal(none, null);
});

test('une voiture déjà poussée pendant ce côte-à-côte ne déclenche pas de nouveau choc', () => {
  const cars = [car('o', 3, 101, ONCOMING)];
  const pushed = new Set(['o']);
  assert.equal(cityRushSideBumpChoice({
    playerLane: 2, playerDistance: 100, targetLane: 3, cars, pushedIds: pushed,
  }), null);
});

test('l\'épisode se garde tant que la voiture reste à la même hauteur, et s\'ouvre à nouveau après', () => {
  const cars = [car('o', 4, 101, ONCOMING), car('x', 4, 140, ONCOMING)];
  // `o` est à deux voies du pilote, toujours à la même hauteur : l'épisode tient.
  const kept = cityRushSideBumpKeep(new Set(['o', 'x']), cars, 2, 100);
  assert.deepEqual([...kept], ['o']);
  // Une voiture qui disparaît de la course sort de l'épisode.
  assert.deepEqual([...cityRushSideBumpKeep(new Set(['gone']), cars, 2, 100)], []);
});

test('un épisode complet : une seule poussée tant que les voitures restent côte à côte', () => {
  // Pilote voie 2 à 100 m ; voiture `o` voie 3 à 101 m. Le joueur garde la
  // touche enfoncée : chaque tentative est simulée image par image.
  let playerLane = 2;
  const playerDistance = 100;
  const pushed = new Set();
  const o = { id: 'o', lane: 3, distance: 101, allowedLanes: ONCOMING };
  const cars = () => [o];
  const steer = (target) => {
    // Le choix se fait seulement quand la voie visée est fermée (voir `action`).
    const blockedBy = cars().some((item) => cityRushIsAlongside(playerLane, item.lane, item.distance - playerDistance) && item.lane === target);
    if (!blockedBy) {
      playerLane = target;
      return 'moved';
    }
    const choice = cityRushSideBumpChoice({ playerLane, playerDistance, targetLane: target, cars: cars(), pushedIds: pushed });
    if (!choice) return 'refused';
    o.lane = choice.farLane;
    pushed.add(choice.car.id);
    return 'bumped';
  };
  const frame = () => {
    const kept = cityRushSideBumpKeep(pushed, cars(), playerLane, playerDistance);
    pushed.clear();
    kept.forEach((id) => pushed.add(id));
  };

  assert.equal(steer(3), 'bumped'); // premier appui : la voiture part à droite
  assert.equal(o.lane, 4);
  frame();
  assert.equal(steer(3), 'moved'); // le maintien : le pilote prend la voie libérée
  assert.equal(playerLane, 3);
  frame();
  // La voiture est toujours à côté, deux voies à droite : pas de second choc.
  assert.equal(steer(4), 'refused');
  assert.equal(o.lane, 4);
});

test('une voiture qui s\'éloigne ouvre un nouvel épisode', () => {
  const pushed = new Set(['o']);
  const cars = [car('o', 4, 140, ONCOMING)];
  const kept = cityRushSideBumpKeep(pushed, cars, 3, 100);
  assert.equal(kept.size, 0);
  // Revenue à côté plus tard : c'est un nouveau côte-à-côte, donc un choc.
  const back = cityRushSideBumpChoice({
    playerLane: 3,
    playerDistance: 100,
    targetLane: 4,
    cars: [car('o', 4, 101, ONCOMING)],
    pushedIds: kept,
  });
  assert.equal(back.farLane, 5);
});

test('le choc latéral reprend le coût du carambolage : un carré pour le pilote, un PV pour un rival ou une berline', () => {
  // Le pilote perd un carré ; un rival ou une berline de police en perd un
  // aussi, comme dans un carambolage. Le trafic ordinaire n'a pas de PV.
  assert.equal(cityRushPlayerDamage(15, 'collision'), 14);
  assert.equal(cityRushPoliceDamage(6, 'collision'), 5);
});

test('le dérapage et l\'attente après un choc restent courts', () => {
  assert.ok(CITY_RUSH_SIDE_BUMP_SKID > 0 && CITY_RUSH_SIDE_BUMP_SKID <= 0.6);
  assert.ok(CITY_RUSH_SIDE_BUMP_HOLD > 0 && CITY_RUSH_SIDE_BUMP_HOLD <= 1);
});
