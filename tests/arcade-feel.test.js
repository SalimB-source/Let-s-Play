/**
 * Prototype « feel » de L'Arcade Éternelle — mesures et garde-fous.
 * ----------------------------------------------------------------
 * Les tests qui suivent ne vérifient pas « le jeu est joli » (ça, seul un
 * joueur le dit) mais **tout ce qui doit être vrai dans les chiffres** :
 * hauteur de saut tenue contre saut relâché, tolérance de coyote, mémoire de
 * saut, vitesse de course, portée du dash, dégâts de l'enchaînement, coque du
 * golem, sable, projectiles, arrivée, mort et réapparition.
 *
 * Le dernier bloc est une **règle de niveau** : chaque marche du grand trou
 * doit être franchissable avec la hauteur de saut réellement mesurée. Si on
 * touche au réglage (`TUNE`) sans vérifier ça, on peut rendre la salle
 * infranchissable sans que rien ne plante — c'est exactement le genre de
 * régression que ce fichier doit attraper.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACK_STRIKE_FROM,
  ATTACK_STRIKE_TO,
  TUNE,
  SIM_DT,
  ROOMS,
  attackBox,
  createState,
  step,
  heldInput,
  heroBox,
} from '../src/games/arcadeFeel.js';

// ---------------------------------------------------------------------------
// Aides
// ---------------------------------------------------------------------------

/**
 * Avance `frames` images. `script(state, i)` renvoie les commandes de l'image
 * (les champs `*Pressed` doivent être mis à `true` sur une seule image).
 */
function run(state, frames, script = null) {
  for (let i = 0; i < frames; i += 1) {
    const patch = typeof script === 'function' ? script(state, i) : script || {};
    step(state, heldInput(patch));
    if (state.phase === 'victory') return state;
  }
  return state;
}

/**
 * État de test « propre » : sans ennemis, héros posé où l'on veut. Les
 * mesures de course, de saut et de dash se font ainsi, loin du caisson de la
 * zone d'échauffement et des scarabées.
 */
function cleanState(x = 50, y = 15) {
  const state = createState();
  state.enemies = [];
  state.hero.x = x;
  state.hero.y = y;
  state.hero.vx = 0;
  state.hero.vy = 0;
  state.hero.grounded = true;
  state.hero.groundTimer = TUNE.coyote;
  state.hero.invuln = 30;
  return state;
}

/** Franchit un trou en courant vers la droite : saute dès qu'on quitte le sol. */
function runRightHopping(state, frames) {
  let airborne = 0;
  return run(state, frames, (s) => {
    const patch = { right: true, jump: false };
    if (!s.hero.grounded) {
      airborne += 1;
      // on saute une image après avoir quitté le rebord (coyote) puis à chaque
      // atterrissage manqué
      if (airborne === 2 && s.hero.vy > 0) patch.jumpPressed = true;
      if (airborne > 2) patch.jump = true;
    } else {
      airborne = 0;
      patch.jump = false;
    }
    return patch;
  });
}

// ---------------------------------------------------------------------------
// Course, repos, déterminisme
// ---------------------------------------------------------------------------

test('au repos, le héros reste posé et ne dérive pas', () => {
  const state = createState();
  run(state, 120);
  assert.equal(state.phase, 'play');
  assert.ok(Math.abs(state.hero.y - 15) < 0.001, `y = ${state.hero.y}`);
  assert.ok(Math.abs(state.hero.x - 3) < 0.01, `x = ${state.hero.x}`);
  assert.equal(state.hero.grounded, true);
});

test('la course atteint sa vitesse nominale et parcourt la bonne distance', () => {
  const state = cleanState(50, 15);
  run(state, 60, { right: true });
  assert.ok(Math.abs(state.hero.vx - TUNE.runSpeed) < 0.2, `vx = ${state.hero.vx}`);
  assert.ok(state.hero.x > 55, `x = ${state.hero.x}`);
  assert.ok(Math.abs(state.hero.x - 56.2) < 0.6, `distance = ${state.hero.x - 50}`);
});

test('la course (Maj) va plus vite que la marche', () => {
  const walk = cleanState(50, 15);
  const sprint = cleanState(50, 15);
  run(walk, 40, { right: true });
  run(sprint, 40, { right: true, sprint: true });
  assert.ok(sprint.hero.vx > walk.hero.vx + 1.5, `marche ${walk.hero.vx} / course ${sprint.hero.vx}`);
  assert.ok(Math.abs(sprint.hero.vx - TUNE.sprintSpeed) < 0.2);
});

test('un mur arrête net : aucune vitesse cachée contre une paroi', () => {
  const state = cleanState(3, 15); // devant le caisson de la zone d'échauffement
  run(state, 60, { right: true });
  assert.ok(state.hero.x < 6, `le héros doit être arrêté par le caisson, x = ${state.hero.x}`);
  assert.equal(state.hero.vx, 0, 'la vitesse doit retomber à zéro');
});

test('la simulation est déterministe : mêmes entrées, même état', () => {
  const script = (s, i) => ({
    right: i > 30,
    left: i > 70 && i < 90,
    jump: i % 17 < 6,
    jumpPressed: i % 17 === 0,
    attackPressed: i % 23 === 0,
  });
  const a = createState();
  const b = createState();
  run(a, 240, script);
  run(b, 240, script);
  assert.deepEqual(
    [a.hero.x, a.hero.y, a.hero.vx, a.hero.vy, a.stats],
    [b.hero.x, b.hero.y, b.hero.vx, b.hero.vy, b.stats],
  );
  assert.deepEqual(
    a.enemies.map((e) => [e.x, e.y, e.hp]),
    b.enemies.map((e) => [e.x, e.y, e.hp]),
  );
});

// ---------------------------------------------------------------------------
// Saut : hauteur, saut variable, coyote, mémoire
// ---------------------------------------------------------------------------

function measureJump(releaseAfter) {
  const state = createState();
  let minY = state.hero.y;
  let frames = 0;
  run(state, 120, (s, i) => {
    const patch = {};
    if (i === 0) patch.jumpPressed = true;
    patch.jump = i <= releaseAfter;
    minY = Math.min(minY, s.hero.y);
    if (s.hero.grounded && i > 5 && frames === 0) frames = i;
    return patch;
  });
  return { height: 15 - minY, landedAt: frames, state };
}

test('saut tenu : environ 3 tuiles de haut, soit une marche de 2,4-2,8 tuiles', () => {
  const { height, landedAt } = measureJump(999);
  assert.ok(height > 2.9 && height < 3.4, `hauteur = ${height.toFixed(3)}`);
  assert.ok(landedAt > 30 && landedAt < 60, `atterrissage à l'image ${landedAt}`);
});

test('saut relâché tout de suite : environ la moitié de la hauteur', () => {
  const held = measureJump(999);
  const tap = measureJump(2);
  assert.ok(tap.height > 1.1 && tap.height < 2.2, `tap = ${tap.height.toFixed(3)}`);
  assert.ok(tap.height < held.height * 0.7, `${tap.height} vs ${held.height}`);
  // le saut le plus court doit quand même franchir le caisson de 1,4 tuile
  assert.ok(tap.height > 1.4, 'le tap doit franchir le caisson');
});

test('temps de coyote : on peut sauter 4 images après avoir quitté le rebord', () => {
  const state = cleanState(11.5, 15); // après le caisson, devant le premier trou
  let airFrames = 0;
  let jumped = false;
  run(state, 240, (s) => {
    const patch = { right: true };
    if (!s.hero.grounded) {
      airFrames += 1;
      if (airFrames === 4 && !jumped) {
        patch.jumpPressed = true;
        patch.jump = true;
        jumped = true;
      }
    } else if (airFrames === 0) {
      patch.jump = false;
    }
    return patch;
  });
  assert.equal(jumped, true, 'le héros doit avoir quitté le rebord');
  assert.ok(state.stats.jumps >= 1, `sauts = ${state.stats.jumps}`);
  assert.ok(state.hero.x > 17, `le héros doit avoir franchi le trou, x = ${state.hero.x}`);
});

test('mémoire de saut : appuyer avant d’atterrir déclenche le saut à l’atterrissage', () => {
  const state = createState();
  state.hero.x = 5;
  state.hero.y = 11.5; // 3,5 tuiles au-dessus du sol
  state.hero.grounded = false;
  state.hero.vy = 0;
  run(state, 20, (s, i) => (i === 10 ? { jumpPressed: true, jump: true } : { jump: true }));
  assert.ok(state.stats.jumps >= 1, `sauts = ${state.stats.jumps}`);
  assert.ok(state.hero.y < 15, 'le héros doit être reparti vers le haut');
});

test('saut mural : posé en glissade contre un mur, on repart de l’autre côté', () => {
  const state = createState();
  const hero = state.hero;
  // paroi suspendue de la cheminée : x 57,4 → 58,4 ; le héros glisse à droite
  hero.x = 58.82;
  hero.y = 11;
  hero.grounded = false;
  hero.groundTimer = 0; // il y a longtemps qu'il a quitté le sol
  hero.vy = 1;
  hero.invuln = 30;
  run(state, 4, {});
  assert.equal(hero.wallDir, -1, `wallDir = ${hero.wallDir}`);
  run(state, 1, { jumpPressed: true, jump: true });
  assert.equal(state.stats.wallJumps, 1);
  assert.ok(hero.vx > 4, `vx = ${hero.vx}`);
  assert.ok(hero.vy < -10, `vy = ${hero.vy}`);
});

// ---------------------------------------------------------------------------
// Attaque, enchaînement, coque du golem
// ---------------------------------------------------------------------------

test('l’attaque tue le scarabée de sable en un coup', () => {
  const state = createState();
  state.hero.x = 9; // après le caisson : le terrain de chasse du scarabée
  const beetle = state.enemies.find((e) => e.kind === 'beetle');
  run(state, 180, (s) => {
    const dx = beetle.x - s.hero.x;
    if (beetle.dead) return {};
    if (dx < 1.25 && dx > 0) return { right: false, attackPressed: true, attack: true };
    return { right: dx > 1.3, left: dx < 0.9, facingRight: dx > 0 };
  });
  assert.equal(beetle.dead, true, 'le scarabée doit être éliminé');
  assert.equal(state.stats.kills >= 1, true);
});

test('l’enchaînement des trois coups monte en puissance', () => {
  const state = cleanState(50, 15);
  run(state, 1, { attackPressed: true, attack: true });
  assert.equal(state.hero.attack.stage, 1);
  run(state, 10, { attack: true }); // on laisse passer la fenêtre d'enchaînement
  run(state, 1, { attackPressed: true, attack: true });
  assert.equal(state.hero.attack.stage, 2, 'le 2e coup doit s’enchaîner');
  run(state, 10, { attack: true });
  run(state, 1, { attackPressed: true, attack: true });
  assert.equal(state.hero.attack.stage, 3, 'le 3e coup doit s’enchaîner');
  run(state, 40, {});
  assert.equal(state.hero.attack, null, 'l’attaque doit se terminer');
  assert.equal(state.stats.attacks, 3);
});

test('frapper en courant ne casse pas l’élan', () => {
  const state = cleanState(50, 15);
  run(state, 60, { right: true, sprint: true });
  const before = state.hero.vx;
  run(state, 1, { right: true, sprint: true, attackPressed: true, attack: true });
  assert.ok(before > 8.5, `le sprint doit être lancé (vx ${before.toFixed(2)})`);
  assert.ok(
    state.hero.vx >= before * TUNE.attackSpeedKeep - 0.05,
    `frapper en courant conservait mal l’élan (${before.toFixed(2)} → ${state.hero.vx.toFixed(2)})`,
  );
  assert.ok(state.hero.vx > TUNE.attackLunge, 'l’élan d’estoc ne doit pas remplacer la course');
});

test('matraquer la touche ne donne pas des coups lourds à l’infini', () => {
  const state = cleanState(50, 15);
  const stages = [];
  let last = null;
  for (let i = 0; i < 120 && stages.length < 4; i += 1) {
    run(state, 1, { attackPressed: true, attack: true });
    const a = state.hero.attack;
    if (a && a !== last && a.timer > TUNE.attackTime * 0.9) stages.push(a.stage);
    if (a) last = a;
  }
  assert.deepEqual(stages, [1, 2, 3, 1], 'après le coup lourd, la chaîne doit repartir au premier');
});

test('la boîte d’impact s’ouvre au milieu du geste, pas pendant la préparation', () => {
  const state = cleanState(50, 15);
  run(state, 1, { attackPressed: true, attack: true });
  const opens = [];
  for (let i = 0; i < 20 && state.hero.attack; i += 1) {
    const t = 1 - state.hero.attack.timer / TUNE.attackTime;
    if (attackBox(state.hero)) opens.push(t);
    run(state, 1, { attack: true });
  }
  assert.ok(opens.length >= 4, `la fenêtre d’impact doit durer quelques images (${opens.length})`);
  assert.ok(
    opens[0] >= ATTACK_STRIKE_FROM - 0.03 && opens[0] <= ATTACK_STRIKE_FROM + 0.1,
    `la boîte s’ouvre à t ${opens[0].toFixed(2)} au lieu de ${ATTACK_STRIKE_FROM}`,
  );
  assert.ok(
    opens[opens.length - 1] <= ATTACK_STRIKE_TO + 0.05,
    `la boîte reste ouverte après la fin du geste (t ${opens[opens.length - 1].toFixed(2)})`,
  );
  // le dessin du bras lit ces mêmes bornes : si elles bougent, la planche de
  // contrôle (mockups/05) doit être refaite
  assert.ok(ATTACK_STRIKE_FROM < ATTACK_STRIKE_TO);
});

test('la coque du golem ricoche, l’attaque plongeante le casse', () => {
  const state = createState();
  const golem = state.enemies.find((e) => e.kind === 'golem');
  const hero = state.hero;
  hero.x = golem.x - 1.5;
  hero.y = 15;
  hero.facing = 1;
  hero.invuln = 20; // on ne teste pas les dégâts reçus ici

  run(state, 1, { attackPressed: true, attack: true });
  run(state, 6, { attack: true });
  assert.equal(golem.hp, golem.maxHp, 'la coque ne doit rien encaisser');
  assert.ok(state.events.some((e) => e.type === 'ricochet'), 'un ricochet doit être signalé');

  // attaque plongeante depuis le dessus
  hero.attack = null;
  hero.x = golem.x;
  hero.y = 13.05;
  hero.grounded = false;
  hero.vy = 0;
  run(state, 1, { attackPressed: true, attack: true, down: true });
  run(state, 5, { down: true });
  assert.equal(golem.hp, golem.maxHp - 2, `pv du golem = ${golem.hp}`);
});

// ---------------------------------------------------------------------------
// Dash aérien, esquive
// ---------------------------------------------------------------------------

test('le dash aérien va plus vite que la course, puis la gravité reprend', () => {
  const state = cleanState(36, 15); // au-dessus du grand trou : rien à heurter
  run(state, 1, { jumpPressed: true, jump: true });
  run(state, 6, { jump: true });
  const apexY = state.hero.y;
  run(state, 1, { dashPressed: true, dash: true });
  assert.equal(state.stats.airDashes, 1);
  assert.ok(state.hero.vx > TUNE.runSpeed + 4, `vx = ${state.hero.vx}`);
  assert.equal(state.hero.vy, 0, 'le dash annule la chute');
  assert.ok(state.hero.y <= apexY + 0.01, 'le dash part bien en l’air');
  run(state, 12, {}); // le dash dure 0,16 s : après, la chute reprend
  assert.ok(state.hero.vy > 0, `la gravité doit reprendre, vy = ${state.hero.vy}`);
  assert.ok(state.hero.x > 38, `le dash a porté le héros, x = ${state.hero.x}`);
});

test('l’esquive donne une courte invincibilité', () => {
  const state = createState();
  run(state, 1, { dodgePressed: true });
  assert.equal(state.stats.dodges, 1);
  assert.ok(state.hero.invuln > 0.1);
  assert.ok(Math.abs(state.hero.vx) > 5, 'l’esquive pousse le héros en arrière');
});

// ---------------------------------------------------------------------------
// Dangers : sable, idole, dégâts, mort
// ---------------------------------------------------------------------------

test('le sable engloutit : on s’enfonce, le pas ralentit, puis on est puni', () => {
  const state = createState();
  state.enemies = [];
  const hero = state.hero;
  hero.x = 24.2; // dans le bac à sable
  hero.y = 15;
  hero.invuln = 0;

  // la marche est bien ralentie dans le sable
  const dry = cleanState(50, 15);
  run(state, 30, {});
  run(dry, 15, { right: true });
  const wet = createState();
  wet.enemies = [];
  wet.hero.x = 24.2;
  run(wet, 15, { right: true });
  assert.equal(hero.inSand, 1);
  assert.ok(hero.sandDepth > 0.2 && hero.sandDepth < 0.5, `enfoncement = ${hero.sandDepth}`);
  assert.ok(hero.y > 14.99, 'les pieds restent au sol : c’est le rendu qui enfonce');
  assert.ok(wet.hero.vx < dry.hero.vx * 0.5, `sable ${wet.hero.vx.toFixed(2)} / sec ${dry.hero.vx.toFixed(2)}`);

  // au-delà de la grâce : un cœur, une éjection, puis un répit
  run(state, 80, {});
  assert.ok(state.stats.damageTaken >= 1, 'le sable doit finir par coûter un cœur');
  assert.equal(state.stats.damageTaken, 1, 'et une seule fois : l’éjection sort le héros du sable');
  assert.ok(hero.sandDepth <= 0.6, `l’enfoncement repart de zéro, sandDepth = ${hero.sandDepth.toFixed(2)}`);
});

test('l’idole télégraphie puis tire un éclat qui file vers le héros', () => {
  const state = createState();
  state.enemies = state.enemies.filter((e) => e.kind === 'idol');
  state.hero.x = 27;
  state.hero.y = 14.2; // sur la première marche de la colline, face à l'idole
  state.hero.invuln = 30;
  const shots = [];
  run(state, 40, (s) => {
    for (const e of s.events) if (e.type === 'shard') shots.push(e);
    return {};
  });
  assert.ok(shots.length >= 1, 'l’idole doit avoir tiré');
  assert.ok(state.projectiles.length >= 1, 'l’éclat doit être en vol');
  const shard = state.projectiles[0];
  assert.ok(shard.vx !== 0, 'l’éclat doit filer vers le héros');
  // il doit menacer le héros, pas passer au-dessus de sa tête
  assert.ok(Math.abs(shard.vy) < Math.abs(shard.vx) + 1);
});

test('un contact coûte un cœur, puis l’invincibilité protège', () => {
  const state = createState();
  const beetle = state.enemies.find((e) => e.kind === 'beetle');
  state.hero.x = beetle.x - 0.2;
  state.hero.y = 15;
  run(state, 1, {});
  assert.equal(state.hero.hp, 3);
  run(state, 20, {});
  assert.equal(state.hero.hp, 3, 'pas de dégât pendant l’invincibilité');
});

test('à zéro cœur : mort, puis réapparition avec les cœurs pleins', () => {
  const state = createState();
  const beetle = state.enemies.find((e) => e.kind === 'beetle');
  state.hero.hp = 1;
  state.hero.x = beetle.x - 0.2;
  state.hero.y = 15;
  run(state, 2, {});
  assert.equal(state.phase, 'dead');
  assert.equal(state.stats.deaths, 1);
  run(state, 60, {});
  assert.equal(state.phase, 'play');
  assert.equal(state.hero.hp, state.hero.maxHp);
  assert.ok(Math.abs(state.hero.x - ROOMS['feel-01'].spawn.x) < 0.01, 'retour au point de départ');
});

// ---------------------------------------------------------------------------
// Plateformes traversables, arrivée, parcours complet
// ---------------------------------------------------------------------------

test('on atterrit sur une plateforme fine, et on la traverse avec bas + saut', () => {
  const state = createState();
  state.enemies = [];
  const hero = state.hero;
  hero.x = 14;
  hero.y = 9;
  hero.grounded = false;
  hero.vy = 0;
  run(state, 30, {});
  assert.equal(hero.grounded, true);
  assert.ok(Math.abs(hero.y - 11.6) < 0.02, `y = ${hero.y}`);
  // bas + saut : on passe au travers
  run(state, 1, { down: true, jumpPressed: true });
  run(state, 40, { down: true });
  assert.ok(hero.y > 13, `on doit être passé au travers, y = ${hero.y}`);
});

test('atteindre le socle d’or déclenche la victoire et fige le temps', () => {
  const state = createState();
  state.hero.x = 69.3;
  state.hero.y = 15;
  run(state, 60, { right: true });
  assert.equal(state.phase, 'victory');
  assert.ok(state.stats.clearedIn > 0);
  const frozen = { x: state.hero.x, time: state.time };
  run(state, 10, { right: true });
  assert.deepEqual({ x: state.hero.x, time: state.time }, frozen, 'le temps s’arrête');
});

test('la salle se parcourt de bout en bout en sautant les trous', () => {
  const state = ROOMS['feel-01'];
  // Le premier trou (14 → 17) se franchit à la course et au saut.
  const s1 = createState();
  s1.hero.x = 12.4;
  run(s1, 180, (s) => {
    const patch = { right: true };
    if (!s.hero.grounded && s.hero.vx > 4 && !patch.__done) {
      patch.jumpPressed = true;
      patch.jump = true;
    }
    return patch;
  });
  assert.ok(s1.hero.x > 17, `le premier trou doit être franchi, x = ${s1.hero.x}`);
  assert.equal(s1.phase, 'play', 'sans mourir');
  assert.ok(state.width > 60);
});

test('règle de niveau : chaque marche du grand trou tient dans la hauteur de saut', () => {
  const { height } = measureJump(999);
  const ledges = ROOMS['feel-01'].solids
    .filter((s) => s.y >= 12 && s.y <= 23 && s.x >= 35 && s.x <= 44.5)
    .map((s) => ({ top: s.y, left: s.x, right: s.x + s.w }))
    .sort((a, b) => b.top - a.top);
  assert.ok(ledges.length >= 4, 'les corniches de remontée doivent exister');
  for (let i = 1; i < ledges.length; i += 1) {
    const delta = ledges[i - 1].top - ledges[i].top;
    assert.ok(
      delta <= height - 0.15,
      `marche de ${delta.toFixed(2)} tuiles > hauteur de saut ${height.toFixed(2)}`,
    );
    const gap = Math.max(0, Math.min(ledges[i - 1].right, ledges[i].right) - ledges[i - 1].right);
    assert.ok(gap < 2.5, `écart horizontal de ${gap.toFixed(2)} tuiles : trop large`);
  }
});

// ---------------------------------------------------------------------------
// Robustesse : 60 secondes d'entrées pseudo-aléatoires
// ---------------------------------------------------------------------------

test('le parcours prévu est faisable : chaque montée tient dans la hauteur de saut mesurée', () => {
  const { height } = measureJump(999);
  const WALL_HOP = 2.6; // gain vertical d'un rebond de mur, dans une cheminée serrée
  const path = ROOMS['feel-01'].path;
  assert.ok(path.length >= 20, 'le parcours doit décrire la salle en entier');
  assert.equal(path[0].mode, 'walk');
  assert.equal(path[path.length - 1].y, 15, 'le parcours finit au sol, devant le socle d’or');
  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const to = path[i];
    const climb = from.y - to.y; // positif = on monte
    const gap = to.x - from.x;
    const where = `station ${i} (${from.mode} → ${to.mode}, x ${from.x} → ${to.x})`;
    assert.ok(to.y >= 3 && to.y <= 23, `${where} : hauteur ${to.y} hors du domaine de la salle`);
    // recul toléré : un saut mural fait zigzaguer de 0,6 tuile au plus
    assert.ok(gap > -1.2, `${where} : recul de ${(-gap).toFixed(2)} tuiles — le parcours doit avancer`);
    if (to.mode === 'wall') {
      assert.ok(climb > 0, `${where} : une station de mur doit monter`);
      assert.ok(climb <= WALL_HOP, `${where} : rebond de ${climb.toFixed(2)} tuiles > ${WALL_HOP} tenables`);
      continue;
    }
    if (climb > 0) {
      assert.ok(
        climb <= height - 0.15,
        `${where} : montée de ${climb.toFixed(2)} tuiles > hauteur de saut ${height.toFixed(2)}`,
      );
    }
    // `walk` et `fall` : on progresse au sol, la distance n'est qu'un jalon de
    // lecture. `jump` et `wall` : le vide doit être franchi en l'air.
    if (to.mode === 'walk') {
      assert.ok(gap > 0 && gap <= 8, `${where} : ${gap.toFixed(2)} tuiles à pied, trop loin pour un jalon`);
    } else if (to.mode === 'fall') {
      assert.ok(gap >= -1.2, `${where} : recul de ${(-gap).toFixed(2)} tuiles en tombant`);
    } else {
      assert.ok(Math.abs(gap) < 4.6, `${where} : franchissement de ${gap.toFixed(2)} tuiles — irréaliste`);
    }
  }
});

test('60 secondes d’entrées aléatoires : rien ne casse, rien ne sort des bornes', () => {
  const state = createState();
  let seed = 987654321;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const prev = { jump: false, attack: false, dash: false };
  const script = () => {
    const jump = rnd() < 0.22;
    const attack = rnd() < 0.3;
    const dash = rnd() < 0.12;
    const patch = {
      left: rnd() < 0.28,
      right: rnd() < 0.4,
      down: rnd() < 0.15,
      jump,
      attack,
      dash,
      jumpPressed: jump && !prev.jump,
      attackPressed: attack && !prev.attack,
      dashPressed: dash && !prev.dash,
      dodgePressed: rnd() < 0.06,
      sprint: rnd() < 0.4,
    };
    prev.jump = jump;
    prev.attack = attack;
    prev.dash = dash;
    return patch;
  };
  run(state, 3600, script);
  const hero = state.hero;
  assert.ok(Number.isFinite(hero.x) && Number.isFinite(hero.y), 'pas de NaN');
  assert.ok(hero.x > -2 && hero.x < 74, `héros dans la salle, x = ${hero.x}`);
  assert.ok(hero.y > -2 && hero.y < 30, `héros dans la salle, y = ${hero.y}`);
  assert.ok(state.projectiles.length < 40, 'pas d’accumulation de projectiles');
  assert.ok(state.events.length <= 96, 'les événements sont bornés');
  assert.ok(state.enemies.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)));
});

test('la boîte du héros reste cohérente avec sa position', () => {
  const state = createState();
  const box = heroBox(state.hero);
  assert.ok(Math.abs((box.left + box.right) / 2 - state.hero.x) < 1e-9);
  assert.ok(Math.abs(box.bottom - state.hero.y) < 1e-9);
  assert.ok(Math.abs(box.bottom - box.top - state.hero.h) < 1e-9);
  assert.ok(Math.abs(SIM_DT - 1 / 60) < 1e-12);
});
