/**
 * L'ARCADE ÉTERNELLE — prototype « feel » : simulation pure.
 * =================================================================
 * Aucun accès au DOM, au canvas, au temps réel ni au hasard ambiant : tout se
 * passe en **tuiles** et en **secondes**, à pas fixe de 1/60 s. C'est le même
 * contrat que `cityRushRules.js` — la physique et les règles sont donc
 * vérifiables par `node --test`, sans navigateur, et rejouables image par image
 * (voir `tests/arcade-feel.test.js`).
 *
 * Ce que le prototype doit prouver (cf. `DESIGN-ARCADE-ETERNELLE.md`, §4.3) :
 * courir, sauter, attaquer et dasher doivent être **agréables à vide**. Tout le
 * réglage est donc regroupé dans `TUNE`, en haut du fichier, pour être ajusté
 * sans toucher à la logique.
 *
 * Repères : 1 tuile = 32 px à l'échelle interne. Le héros mesure 0,7 × 1,6
 * tuile. Sa position est (centre en X, **bas** en Y) : « y » est donc le sol
 * sous ses pieds, ce qui rend la lecture des salles naturelle.
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;
export const TILE = 32;

/** Réglage du feel. Tout est en tuiles et en secondes. */
export const TUNE = {
  // --- Course -------------------------------------------------------------
  runSpeed: 6.6,
  sprintSpeed: 9.0,
  accelGround: 55,
  accelAir: 34,
  frictionGround: 62,
  frictionAir: 8,
  turnBoost: 1.8, // virage : on freine plus fort qu'on accélère

  // --- Saut ---------------------------------------------------------------
  gravity: 88,
  gravityFall: 110, // la chute est plus franche que la montée
  jumpSpeed: 25.0, // → ~3,2 tuiles de hauteur maximale (mesuré par les tests)
  jumpCut: 0.6, // saut variable : relâcher coupe la vitesse (tap ≈ 1,5 tuile)
  coyote: 0.1, // on peut sauter 0,10 s après avoir quitté le rebord
  jumpBuffer: 0.12, // appuyer 0,12 s avant d'atterrir compte quand même
  apexGravityScale: 0.72, // petit « flottement » au sommet de la courbe
  apexWindow: 1.7,
  maxFall: 26,

  // --- Mur ----------------------------------------------------------------
  wallSlideSpeed: 4.2,
  wallJumpX: 8.8,
  wallJumpY: 23.0,
  wallJumpLock: 0.16, // on ne reprend pas la main tout de suite
  wallStickGrace: 0.12,

  // --- Attaque ------------------------------------------------------------
  attackTime: 0.3,
  attackChainWindow: 0.42, // part de l'animation à partir de laquelle on enchaîne
  attackBuffer: 0.18,
  attackReach: 1.35,
  attackSideY: -0.25,
  attackUpY: -1.0,
  attackDownY: 1.05,
  attackLunge: 2.6, // élan vers l'avant au moment de la frappe
  dmgStage: [1, 1, 2], // le 3e coup est lourd
  hitPause: [0.06, 0.07, 0.09],
  knockback: [3.2, 3.6, 6.0],
  upwardPop: [0, 0, 2.2],

  // --- Esquive ------------------------------------------------------------
  dodgeTime: 0.2,
  dodgeInvuln: 0.15,
  dodgeSpeed: 13.5,
  dodgeCooldown: 0.3,

  // --- Dash aérien (le « double saut » du prototype) ----------------------
  airDashTime: 0.16,
  airDashSpeed: 15,
  airDashCooldown: 0.35,

  // --- Dégâts -------------------------------------------------------------
  hurtTime: 0.18,
  invulnTime: 1.0,
  hurtKnockbackX: 6.5,
  hurtKnockbackY: 8.5,

  // --- Ennemis ------------------------------------------------------------
  beetleSpeed: 1.7,
  beetleHp: 1,
  idolHp: 2,
  idolRange: 9,
  idolTelegraph: 0.4,
  idolCooldown: 2.2,
  shardSpeed: 7,
  shardLife: 3,
  golemHp: 3,
  golemSpeed: 1.0,
  golemSight: 7,
  golemRestEvery: 2.6,
  golemRest: 0.8,
  vultureHp: 1,
  vultureSight: 5,
  vultureDiveSpeed: 9,

  // --- Divers -------------------------------------------------------------
  dropThrough: 0.2, // durée pendant laquelle on ignore les plateformes fines
  sandGrace: 1.5, // au-delà : 1 dégât et éjection
  sandSpeedScale: 0.45, // on marche au ralenti dans le sable
  sandJumpCap: 2, // impossible de reprendre de la hauteur : le sable retient
  sandEject: 10, // éjection verticale au moment de la sanction
  respawnTime: 0.7,
};

// ---------------------------------------------------------------------------
// La salle du prototype
// ---------------------------------------------------------------------------

/**
 * Une salle = des rectangles, rien d'autre. Le sol, les murs, la colline en
 * gradins, le grand trou (on y tombe, on en remonte par les corniches), le
 * tunnel bas avec son vautour, la cheminée à sauts muraux, puis la chaîne de
 * corniches jusqu'au socle d'or.
 */
export const ROOMS = {
  'feel-01': {
    id: 'feel-01',
    name: 'LE PUITS SEC',
    subtitle: 'prototype du feel — stage 1-1 (extrait)',
    width: 72,
    height: 46,
    spawn: { x: 3, y: 15 },
    /** Le socle d'or : le but du prototype. */
    goal: { x: 70.1, y: 13, w: 1.3, h: 2 },
    solids: [
      // enceinte de la salle
      { x: 0, y: 0, w: 72, h: 2 }, // plafond
      { x: 0, y: 2, w: 0.6, h: 44 }, // mur gauche
      { x: 71.4, y: 2, w: 0.6, h: 44 }, // mur droit
      // zone d'échauffement
      { x: 0.6, y: 15, w: 13.4, h: 8 },
      { x: 8, y: 12.4, w: 2.2, h: 0.6 },
      { x: 10.6, y: 10.2, w: 2.2, h: 0.6 },
      { x: 6.2, y: 13.6, w: 1.6, h: 1.4 }, // caisson à franchir
      // trou n°1 (3 tuiles : franchissable à la course) — avec un fond, pour
      // qu'une chute coûte une remontée et non la mort
      { x: 14, y: 18.5, w: 3.2, h: 11.5 },
      { x: 17, y: 15, w: 5, h: 12 }, // reprise du sol après le trou
      // bac à sable
      { x: 22, y: 15, w: 4, h: 12 },
      // colline en gradins
      { x: 26, y: 14.2, w: 2.4, h: 12.8 },
      { x: 28.4, y: 12.6, w: 2.4, h: 14.4 },
      { x: 30.8, y: 11.4, w: 2.4, h: 15.6 },
      { x: 33.2, y: 13.0, w: 2.2, h: 14 },
      // le grand trou : fond ensablé, puis trois corniches de remontée
      { x: 35.4, y: 22.4, w: 8.8, h: 0.6 },
      { x: 36.2, y: 19.6, w: 2.4, h: 0.6 },
      { x: 39.0, y: 17.0, w: 2.4, h: 0.6 },
      { x: 41.4, y: 14.6, w: 2.4, h: 0.6 },
      // plateau de sortie du trou, puis le tunnel bas
      { x: 44.2, y: 12.4, w: 4.4, h: 10.6 },
      { x: 48.6, y: 15, w: 8.8, h: 12 },
      { x: 48.6, y: 10.4, w: 6.4, h: 1.6 }, // plafond du tunnel
      // cheminée à sauts muraux : deux parois suspendues, on entre par-dessous
      { x: 57.4, y: 3.6, w: 1, h: 9.4 },
      { x: 60.4, y: 3.6, w: 1, h: 9.4 },
      // terrain d'arrivée
      { x: 57, y: 15, w: 14.4, h: 12 },
      // chaîne de corniches vers le socle
      { x: 64.6, y: 12.2, w: 2.4, h: 0.6 },
      { x: 67.2, y: 10.4, w: 2.4, h: 0.6 },
      // couverts / piliers
      { x: 29.6, y: 5.2, w: 1.2, h: 4 },
      { x: 51.4, y: 5.4, w: 1.2, h: 4 },
    ],
    /** Plateformes traversables par le bas (bas + saut pour passer au travers). */
    oneways: [
      { x: 12.8, y: 11.6, w: 2.6 },
      { x: 37, y: 21.0, w: 2.6 },
      { x: 45.2, y: 6.2, w: 2.6 },
      { x: 62, y: 9.4, w: 2.6 },
    ],
    /** Sables mouvants (rectangles en tuiles, du haut vers le bas). */
    sands: [
      { x: 23.2, y: 15, w: 1.8, h: 2.6 },
      { x: 35.8, y: 22.0, w: 7.6, h: 2.4 },
    ],
    enemies: [
      { kind: 'beetle', x: 11, y: 15, dir: -1 },
      { kind: 'beetle', x: 21, y: 15, dir: 1 },
      { kind: 'vulture', x: 20.6, y: 6.2 },
      { kind: 'idol', x: 31.6, y: 11.4 },
      { kind: 'vulture', x: 52.4, y: 12 },
      { kind: 'beetle', x: 54.6, y: 15, dir: -1 },
      { kind: 'beetle', x: 66.4, y: 15, dir: -1 },
      { kind: 'golem', x: 68.6, y: 15 },
    ],
    /**
     * Le parcours prévu, station par station (position des pieds, en tuiles).
     * Ce n'est pas une contrainte pour le joueur : c'est la **règle de niveau**
     * vérifiée par les tests — chaque montée doit tenir dans la hauteur de saut
     * réellement mesurée, sinon la salle devient infranchissable sans que rien
     * ne plante. `wall` marque une montée qui se fait au saut mural.
     */
    path: [
      { x: 3, y: 15, mode: 'walk' },
      { x: 6.9, y: 13.6, mode: 'jump' }, // le caisson de la zone d'échauffement
      { x: 10.5, y: 15, mode: 'fall' },
      { x: 13.6, y: 15, mode: 'walk' },
      { x: 17.6, y: 15, mode: 'jump' }, // le trou n°1 (3 tuiles)
      { x: 23, y: 15, mode: 'walk' }, // le bac à sable, traversé au ralenti
      { x: 27.2, y: 14.2, mode: 'jump' }, // les gradins de la colline
      { x: 29.6, y: 12.6, mode: 'jump' },
      { x: 32, y: 11.4, mode: 'jump' },
      { x: 34.3, y: 13.0, mode: 'fall' },
      { x: 37.4, y: 19.6, mode: 'fall' }, // chute dans le grand trou, reçue par la corniche
      { x: 40.2, y: 17.0, mode: 'jump' },
      { x: 42.6, y: 14.6, mode: 'jump' },
      { x: 45.2, y: 12.4, mode: 'jump' }, // le plateau de sortie
      { x: 52, y: 15, mode: 'fall' }, // le tunnel bas, sous le vautour
      { x: 59.4, y: 15, mode: 'walk' }, // on entre sous la paroi de la cheminée
      // la cheminée se remonte par sauts muraux alternés : un cran par rebond
      { x: 59.4, y: 13.4, mode: 'wall' },
      { x: 58.8, y: 11.8, mode: 'wall' },
      { x: 59.4, y: 10.2, mode: 'wall' },
      { x: 58.8, y: 8.6, mode: 'wall' },
      { x: 59.4, y: 7.0, mode: 'wall' },
      { x: 58.8, y: 5.4, mode: 'wall' },
      { x: 59.4, y: 4.6, mode: 'wall' },
      { x: 62.8, y: 9.4, mode: 'fall' }, // la plateforme fine
      { x: 65.8, y: 12.2, mode: 'fall' },
      { x: 68.4, y: 10.4, mode: 'jump' },
      { x: 70.5, y: 15, mode: 'fall' }, // le socle d'or
    ],
    /** Décor : purement visuel, la simulation l'ignore. */
    decor: [
      { kind: 'sun' },
      { kind: 'dune-far' },
      { kind: 'ruin-far', x: 8, y: 6 },
      { kind: 'ruin-far', x: 26, y: 4 },
      { kind: 'ruin-far', x: 47, y: 5 },
      { kind: 'ruin-far', x: 62, y: 3 },
      { kind: 'glyphs', x: 3.2, y: 9.4 },
      { kind: 'fountain', x: 18.4, y: 15 },
      { kind: 'pot', x: 19.6, y: 15 },
      { kind: 'pot', x: 45.6, y: 12.4 },
      { kind: 'banner', x: 30.2, y: 4 },
    ],
  },
};

export const START_ROOM_ID = 'feel-01';

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Rapproche `v` de `target` sans dépasser, par pas de `step`. */
export function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return target;
}

export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Boîte du héros ({left, top, right, bottom}) en tuiles. */
export function heroBox(hero, shrink = 0) {
  const hw = hero.w / 2 - shrink;
  const hh = hero.h - shrink;
  return { left: hero.x - hw, right: hero.x + hw, top: hero.y - hh, bottom: hero.y };
}

/** Boîte d'un ennemi. */
export function enemyBox(enemy) {
  return {
    left: enemy.x - enemy.w / 2,
    right: enemy.x + enemy.w / 2,
    top: enemy.y - enemy.h,
    bottom: enemy.y,
  };
}

/** Rectangle solide → boîte. */
export const rect = (r) => ({ left: r.x, right: r.x + r.w, top: r.y, bottom: r.y + r.h });

/** Entrée de test : une image de commandes tenue. */
export function heldInput(overrides = {}) {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    jumpPressed: false,
    attack: false,
    attackPressed: false,
    dash: false,
    dashPressed: false,
    dodgePressed: false,
    sprint: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Création de l'état
// ---------------------------------------------------------------------------

function makeEnemy(def, index) {
  const base = {
    id: `${def.kind}-${index}`,
    kind: def.kind,
    x: def.x,
    y: def.y, // bas de la boîte
    w: 1,
    h: 1,
    vx: 0,
    vy: 0,
    dir: def.dir || -1,
    hp: 1,
    maxHp: 1,
    state: 'idle',
    timer: 0,
    hurt: 0,
    grounded: false,
    homeX: def.x,
    homeY: def.y,
    deathTimer: 0,
    dead: false,
  };
  if (def.kind === 'beetle') Object.assign(base, { w: 1, h: 0.75, hp: TUNE.beetleHp, maxHp: TUNE.beetleHp, state: 'patrol' });
  if (def.kind === 'idol') Object.assign(base, { w: 1.25, h: 1.5, hp: TUNE.idolHp, maxHp: TUNE.idolHp, state: 'idle' });
  if (def.kind === 'golem') Object.assign(base, { w: 1.75, h: 2, hp: TUNE.golemHp, maxHp: TUNE.golemHp, state: 'idle' });
  if (def.kind === 'vulture') Object.assign(base, { w: 1.25, h: 0.9, hp: TUNE.vultureHp, maxHp: TUNE.vultureHp, state: 'perched' });
  return base;
}

export function createState(roomId = START_ROOM_ID) {
  const room = ROOMS[roomId] || ROOMS[START_ROOM_ID];
  return {
    roomId: room.id,
    room,
    frame: 0,
    time: 0,
    phase: 'play', // 'play' | 'dead' | 'victory'
    respawnTimer: 0,
    hitPause: 0,
    shake: 0,
    hero: {
      x: room.spawn.x,
      y: room.spawn.y,
      vx: 0,
      vy: 0,
      w: 0.7,
      h: 1.6,
      facing: 1,
      grounded: true,
      groundTimer: TUNE.coyote,
      jumpBuffer: 0,
      jumping: false,
      wallDir: 0,
      wallTimer: 0,
      wallJumpLockTimer: 0,
      attack: null, // { kind, stage, timer, hits: [] }
      attackBuffer: 0,
      dodgeTimer: 0,
      dodgeCd: 0,
      dashTimer: 0,
      dashCd: 0,
      dropTimer: 0,
      invuln: 0,
      hurtTimer: 0,
      hp: 4,
      maxHp: 4,
      inSand: 0,
      sandTimer: 0,
      sandDepth: 0, // enfoncement 0 → 1, utilisé par le rendu
      landed: 0,
      lastLandVy: 0,
    },
    enemies: room.enemies.map(makeEnemy),
    projectiles: [],
    events: [],
    /** Dernier bond mesuré (toise de saut) — utile au réglage et aux tests. */
    measures: { lastJumpHeight: 0, maxAirTime: 0, airTime: 0 },
    stats: {
      time: 0,
      distance: 0,
      airTime: 0,
      jumps: 0,
      airDashes: 0,
      wallJumps: 0,
      dodges: 0,
      attacks: 0,
      hits: 0,
      kills: 0,
      damageTaken: 0,
      deaths: 0,
      maxX: room.spawn.x,
    },
  };
}

// ---------------------------------------------------------------------------
// Mesures du feel (partagées entre les tests et la page du prototype)
// ---------------------------------------------------------------------------

/**
 * Relève les chiffres du réglage courant en rejouant la simulation à vide :
 * hauteur de saut tenu, hauteur de saut relâché tout de suite, distance
 * parcourue en une seconde à la course et en sprint, temps de vol maximal.
 *
 * C'est ce que la page affiche dans son panneau « réglage » : les chiffres
 * montrés au joueur sont donc **les mêmes que ceux vérifiés par les tests**.
 */
export function measureFeel() {
  /**
   * État de mesure : sans ennemis, sans but (le socle d'or fige le temps quand
   * on le touche), héros posé dans le long couloir dégagé du tunnel.
   */
  const measuringState = () => {
    const state = createState();
    state.enemies = [];
    state.room = { ...state.room, goal: { x: -50, y: -50, w: 1, h: 1 } };
    state.hero.x = 55.5;
    state.hero.y = 15;
    return state;
  };

  const jumpHeight = (releaseAfter) => {
    const state = measuringState();
    let minY = state.hero.y;
    for (let i = 0; i < 90; i += 1) {
      step(state, heldInput({ jumpPressed: i === 0, jump: i <= releaseAfter }));
      minY = Math.min(minY, state.hero.y);
    }
    return 15 - minY;
  };

  const runDistance = (sprint) => {
    const state = measuringState();
    for (let i = 0; i < 60; i += 1) step(state, heldInput({ right: true, sprint }));
    return state.hero.x - 55.5;
  };

  const state = measuringState();
  for (let i = 0; i < 4; i += 1) step(state, heldInput({ jumpPressed: i === 0, jump: true }));
  let airFrames = 0;
  while (!state.hero.grounded && airFrames < 200) {
    step(state, heldInput({ jump: true }));
    airFrames += 1;
  }

  const jumpHeld = jumpHeight(999);
  const jumpTap = jumpHeight(2);
  return {
    jumpHeld,
    jumpTap,
    jumpTapRatio: jumpTap / jumpHeld,
    run1s: runDistance(false),
    sprint1s: runDistance(true),
    airTime: airFrames * SIM_DT,
    runSpeed: TUNE.runSpeed,
    sprintSpeed: TUNE.sprintSpeed,
  };
}

// ---------------------------------------------------------------------------
// Pas de simulation
// ---------------------------------------------------------------------------

/**
 * Avance d'exactement une image de simulation (1/60 s).
 * `input` vient de `heldInput()` ; les champs `*Pressed` sont des fronts
 * (une seule image à `true`) fournis par la couche d'entrée.
 */
export function step(state, input) {
  if (state.phase === 'victory') return state;

  // L'arrêt sur image (hitstop) gèle la simulation, pas le rendu.
  if (state.hitPause > 0) {
    state.hitPause -= SIM_DT;
    state.frame += 1;
    return state;
  }

  const hero = state.hero;
  state.frame += 1;
  state.time += SIM_DT;
  state.stats.time = state.time;
  state.stats.airTime = hero.grounded ? 0 : state.stats.airTime + SIM_DT;
  state.measures.maxAirTime = Math.max(state.measures.maxAirTime, state.stats.airTime);
  state.shake = Math.max(0, state.shake - SIM_DT * 22);

  if (state.phase === 'dead') {
    state.respawnTimer -= SIM_DT;
    if (state.respawnTimer <= 0) respawn(state);
    return state;
  }

  stepHero(state, hero, input);
  stepEnemies(state);
  stepProjectiles(state);
  checkGoal(state);
  return state;
}

// --- Héros -----------------------------------------------------------------

function stepHero(state, hero, input) {
  // --- Traverser une plateforme fine : bas + saut --------------------------
  if (input.down && input.jumpPressed && hero.grounded) {
    hero.dropTimer = TUNE.dropThrough;
    hero.grounded = false;
    hero.groundTimer = 0;
  }
  hero.dropTimer = Math.max(0, hero.dropTimer - SIM_DT);

  // --- Attaque -------------------------------------------------------------
  hero.attackBuffer = Math.max(0, hero.attackBuffer - SIM_DT);
  if (input.attackPressed) hero.attackBuffer = TUNE.attackBuffer;
  const wantsToDrop = hero.dropTimer > 0 && input.down;
  if (hero.attack) {
    hero.attack.timer -= SIM_DT;
    const remaining = hero.attack.timer;
    if (remaining <= 0) {
      hero.attack = null;
    } else if (hero.attackBuffer > 0 && TUNE.attackTime - remaining >= TUNE.attackTime * TUNE.attackChainWindow) {
      startAttack(state, hero, input, hero.attack.stage + 1);
    }
  } else if (hero.attackBuffer > 0 && !wantsToDrop) {
    startAttack(state, hero, input, 1);
  }

  // --- Intention de déplacement -------------------------------------------
  let ix = 0;
  if (input.left) ix -= 1;
  if (input.right) ix += 1;
  if (hero.dodgeTimer > 0 || hero.dashTimer > 0) ix = 0; // l'élan garde la main
  if (hero.wallJumpLockTimer > 0 || hero.hurtTimer > 0) ix = 0;
  const maxSpeed = (input.sprint ? TUNE.sprintSpeed : TUNE.runSpeed) * (hero.inSand > 0 ? TUNE.sandSpeedScale : 1);

  // --- Esquive / dash aérien ----------------------------------------------
  if (input.dodgePressed && hero.dodgeCd <= 0 && hero.dodgeTimer <= 0 && hero.grounded) {
    hero.dodgeTimer = TUNE.dodgeTime;
    hero.dodgeCd = TUNE.dodgeCooldown;
    hero.invuln = Math.max(hero.invuln, TUNE.dodgeInvuln);
    hero.vx = -hero.facing * TUNE.dodgeSpeed;
    hero.vy = 0;
    state.stats.dodges += 1;
    pushEvent(state, { type: 'dodge', x: hero.x, y: hero.y - 0.8, dir: -hero.facing });
  }
  if (input.dashPressed && !hero.grounded && hero.dashCd <= 0 && hero.dashTimer <= 0) {
    hero.dashTimer = TUNE.airDashTime;
    hero.dashCd = TUNE.airDashCooldown;
    hero.vy = 0;
    hero.vx = hero.facing * TUNE.airDashSpeed;
    state.stats.airDashes += 1;
    pushEvent(state, { type: 'dash', x: hero.x, y: hero.y - 0.8, dir: hero.facing });
  }

  // --- Saut : mémoire de saut + coyote + hauteur variable ------------------
  if (input.jumpPressed && !wantsToDrop) hero.jumpBuffer = TUNE.jumpBuffer;
  hero.jumpBuffer = Math.max(0, hero.jumpBuffer - SIM_DT);
  hero.groundTimer = hero.grounded ? TUNE.coyote : Math.max(0, hero.groundTimer - SIM_DT);

  if (hero.groundTimer > 0 && hero.jumpBuffer > 0) {
    hero.vy = -TUNE.jumpSpeed * (hero.inSand > 0 ? TUNE.sandSpeedScale : 1);
    hero.jumping = true;
    hero.jumpBuffer = 0;
    hero.groundTimer = 0;
    hero.grounded = false;
    state.stats.jumps += 1;
    state.measures.jumpStartY = hero.y;
    pushEvent(state, { type: 'jump', x: hero.x, y: hero.y });
  } else if (hero.wallDir !== 0 && hero.wallTimer > 0 && hero.jumpBuffer > 0 && !hero.grounded) {
    hero.vx = -hero.wallDir * TUNE.wallJumpX;
    hero.vy = -TUNE.wallJumpY;
    hero.facing = -hero.wallDir;
    hero.wallDir = 0;
    hero.wallTimer = 0;
    hero.wallJumpLockTimer = TUNE.wallJumpLock;
    hero.jumpBuffer = 0;
    hero.jumping = true;
    state.stats.jumps += 1;
    state.stats.wallJumps += 1;
    pushEvent(state, { type: 'walljump', x: hero.x, y: hero.y });
  }

  // --- Accélération horizontale -------------------------------------------
  if (hero.dodgeTimer > 0) {
    hero.dodgeTimer -= SIM_DT;
    hero.vx = approach(hero.vx, 0, TUNE.frictionGround * SIM_DT);
  } else if (hero.dashTimer > 0) {
    hero.dashTimer -= SIM_DT;
  } else if (ix !== 0) {
    const turning = ix * hero.vx < 0;
    const accel = (hero.grounded ? TUNE.accelGround : TUNE.accelAir) * (turning ? TUNE.turnBoost : 1);
    hero.vx = approach(hero.vx, ix * maxSpeed, accel * SIM_DT);
    hero.facing = ix;
  } else {
    const fric = hero.grounded ? TUNE.frictionGround : TUNE.frictionAir;
    hero.vx = approach(hero.vx, 0, fric * SIM_DT);
  }

  // --- Gravité -------------------------------------------------------------
  if (hero.dashTimer <= 0) {
    let g = hero.vy < 0 ? TUNE.gravity : TUNE.gravityFall;
    if (Math.abs(hero.vy) < TUNE.apexWindow) g *= TUNE.apexGravityScale; // flottement au sommet
    if (hero.vy < 0 && !input.jump && hero.jumping) {
      // saut variable : relâcher la touche coupe la vitesse restante
      hero.vy += Math.abs(hero.vy) * TUNE.jumpCut * 12 * SIM_DT;
    }
    if (hero.wallDir !== 0 && hero.vy > 0 && !hero.grounded) g *= 0.45; // glissade freinée
    hero.vy = Math.min(hero.vy + g * SIM_DT, TUNE.maxFall);
  }
  if (hero.vy >= 0) hero.jumping = false;

  // --- Déplacement + collisions -------------------------------------------
  moveBody(state, hero, hero.vx * SIM_DT, hero.vy * SIM_DT, {
    ignoreOneways: hero.dropTimer > 0,
    allowWall: hero.wallJumpLockTimer <= 0,
  });

  // --- Mur ----------------------------------------------------------------
  if (hero.wallDir !== 0 && !hero.grounded && hero.vy > 0) {
    hero.wallTimer = TUNE.wallStickGrace;
    hero.vy = Math.min(hero.vy, TUNE.wallSlideSpeed);
  } else if (hero.wallDir === 0) {
    hero.wallTimer = Math.max(0, hero.wallTimer - SIM_DT);
  }

  // --- Sable ---------------------------------------------------------------
  updateSand(state, hero);

  // --- Horloges ------------------------------------------------------------
  hero.wallJumpLockTimer = Math.max(0, hero.wallJumpLockTimer - SIM_DT);
  hero.dodgeCd = Math.max(0, hero.dodgeCd - SIM_DT);
  hero.dashCd = Math.max(0, hero.dashCd - SIM_DT);
  hero.invuln = Math.max(0, hero.invuln - SIM_DT);
  hero.hurtTimer = Math.max(0, hero.hurtTimer - SIM_DT);
  hero.landed = Math.max(0, hero.landed - SIM_DT);
  state.stats.maxX = Math.max(state.stats.maxX, hero.x);
  state.stats.distance += Math.abs(hero.vx) * SIM_DT;

  if (hero.grounded && state.measures.jumpStartY != null) {
    state.measures.lastJumpHeight = Math.max(
      state.measures.lastJumpHeight,
      state.measures.jumpStartY - hero.y,
    );
    state.measures.jumpStartY = null;
  }

  // --- Coups et contacts ---------------------------------------------------
  resolveAttack(state, hero);
  resolveContact(state, hero);

  // --- Chute hors de la salle ---------------------------------------------
  if (hero.y > state.room.height - 1) koHero(state, 'chute');
}

function startAttack(state, hero, input, stage) {
  const clampedStage = Math.min(stage, 3);
  let kind = 'side';
  if (input.up) kind = 'up';
  else if (input.down && !hero.grounded) kind = 'down';
  hero.attack = { kind, stage: clampedStage, timer: TUNE.attackTime, hits: [] };
  hero.attackBuffer = 0;
  state.stats.attacks += 1;
  if (kind === 'side' && hero.grounded) hero.vx = hero.facing * TUNE.attackLunge;
  pushEvent(state, { type: 'swing', x: hero.x, y: hero.y - 0.8, stage: clampedStage, kind, facing: hero.facing });
}

/** Boîte d'impact de l'attaque en cours (ou null). */
export function attackBox(hero) {
  if (!hero.attack) return null;
  const t = 1 - hero.attack.timer / TUNE.attackTime; // 0 → 1
  if (t < 0.12 || t > 0.72) return null; // fenêtre active de l'animation
  const r = TUNE.attackReach;
  if (hero.attack.kind === 'up') {
    return { left: hero.x - r * 0.6, right: hero.x + r * 0.6, top: hero.y - 1.6 + TUNE.attackUpY, bottom: hero.y - 0.5 };
  }
  if (hero.attack.kind === 'down') {
    return { left: hero.x - r * 0.6, right: hero.x + r * 0.6, top: hero.y + TUNE.attackDownY - 0.9, bottom: hero.y + TUNE.attackDownY + 0.2 };
  }
  const left = hero.facing > 0 ? hero.x + 0.2 : hero.x - 0.2 - r;
  return { left, right: left + r, top: hero.y - 1.6 + TUNE.attackSideY, bottom: hero.y - 0.25 };
}

function resolveAttack(state, hero) {
  const box = attackBox(hero);
  if (!box) return;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.hurt > 0) continue;
    if (hero.attack.hits.includes(enemy.id)) continue;
    if (!overlaps(box, enemyBox(enemy))) continue;
    hero.attack.hits.push(enemy.id);

    const isDown = hero.attack.kind === 'down';
    const stage = hero.attack.stage;
    // Le golem de grès ne cède qu'à une attaque plongeante ou au 3e coup.
    if (enemy.kind === 'golem' && !isDown && stage < 3) {
      enemy.vx = (enemy.x > hero.x ? 1 : -1) * 1.6;
      applyHitPause(state, 0.03);
      state.shake = Math.max(state.shake, 2);
      pushEvent(state, { type: 'ricochet', x: enemy.x, y: enemy.y - enemy.h * 0.6 });
      continue;
    }
    // Coque du golem : l'attaque plongeante fait 2 dégâts, le 3e coup lourd 1,
    // tout le reste ricoche (règle lisible, enseignée par la salle).
    let dmg = isDown ? 2 : TUNE.dmgStage[stage - 1];
    if (enemy.kind === 'golem' && !isDown) dmg = 1;
    damageEnemy(state, enemy, dmg, hero.x < enemy.x ? 1 : -1, {
      upward: isDown ? 0 : TUNE.upwardPop[stage - 1],
      knockback: TUNE.knockback[stage - 1] * (isDown ? 0.6 : 1),
      stage,
    });
  }
}

function resolveContact(state, hero) {
  const hb = heroBox(hero, 0.02);
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.hurt > 0) continue;
    if (overlaps(hb, enemyBox(enemy))) hurtHero(state, 1, enemy.x < hero.x ? 1 : -1);
  }
  for (const p of state.projectiles) {
    const pb = { left: p.x - p.w / 2, right: p.x + p.w / 2, top: p.y - p.h / 2, bottom: p.y + p.h / 2 };
    if (overlaps(hb, pb)) {
      p.dead = true;
      hurtHero(state, 1, p.vx < 0 ? -1 : 1);
    }
  }
}

function hurtHero(state, dmg, dir) {
  const hero = state.hero;
  if (hero.invuln > 0 || state.phase !== 'play') return;
  hero.hp -= dmg;
  hero.invuln = TUNE.invulnTime;
  hero.hurtTimer = TUNE.hurtTime;
  hero.vx = dir * TUNE.hurtKnockbackX;
  hero.vy = -TUNE.hurtKnockbackY;
  hero.attack = null;
  hero.dodgeTimer = 0;
  hero.dashTimer = 0;
  state.stats.damageTaken += dmg;
  applyHitPause(state, 0.05);
  state.shake = Math.max(state.shake, 6);
  pushEvent(state, { type: 'hurt', x: hero.x, y: hero.y - 1, dmg });
  if (hero.hp <= 0) koHero(state, 'ko');
}

function koHero(state, cause) {
  if (state.phase !== 'play') return;
  state.phase = 'dead';
  state.respawnTimer = TUNE.respawnTime;
  state.stats.deaths += 1;
  state.shake = 8;
  pushEvent(state, { type: 'ko', x: state.hero.x, y: state.hero.y - 1, cause });
}

function respawn(state) {
  const room = state.room;
  const hero = state.hero;
  hero.x = room.spawn.x;
  hero.y = room.spawn.y;
  hero.vx = 0;
  hero.vy = 0;
  hero.hp = hero.maxHp;
  hero.invuln = 1.2;
  hero.attack = null;
  hero.dodgeTimer = 0;
  hero.dashTimer = 0;
  hero.sandTimer = 0;
  hero.sandDepth = 0;
  hero.inSand = 0;
  state.phase = 'play';
  // Les ennemis simples repopent (décision à trancher, cf. design §16).
  state.enemies = room.enemies.map(makeEnemy);
  state.projectiles = [];
  pushEvent(state, { type: 'respawn', x: hero.x, y: hero.y });
}

// --- Déplacement et collisions ---------------------------------------------

function moveBody(state, body, dx, dy, opts = {}) {
  const room = state.room;
  const solids = room.solids.map(rect);
  const hw = body.w / 2;
  const hh = body.h;

  // --- axe X ---
  body.x += dx;
  let box = { left: body.x - hw, right: body.x + hw, top: body.y - hh, bottom: body.y };
  for (const s of solids) {
    if (!overlaps(box, s)) continue;
    if (dx > 0) body.x = s.left - hw - 0.0001;
    else if (dx < 0) body.x = s.right + hw + 0.0001;
    body.vx = 0; // le mur arrête net : aucune vitesse « cachée » dans la paroi
    box = { left: body.x - hw, right: body.x + hw, top: body.y - hh, bottom: body.y };
  }

  // --- axe Y ---
  const prevBottom = body.y;
  const wasGrounded = body.grounded;
  body.y += dy;
  body.grounded = false;
  body.wallDir = 0;
  box = { left: body.x - hw, right: body.x + hw, top: body.y - hh, bottom: body.y };
  for (const s of solids) {
    if (!overlaps(box, s)) continue;
    if (dy > 0) {
      body.y = s.top;
      body.vy = 0;
      body.grounded = true;
    } else if (dy < 0) {
      body.y = s.bottom + hh;
      body.vy = 0;
    }
    box = { left: body.x - hw, right: body.x + hw, top: body.y - hh, bottom: body.y };
  }

  // --- plateformes traversables (une seule voie) ---
  if (!opts.ignoreOneways) {
    for (const p of room.oneways) {
      if (dy <= 0) continue;
      if (prevBottom > p.y + 0.02) continue; // on venait d'en dessous : on passe
      const inX = body.x + hw > p.x && body.x - hw < p.x + p.w;
      if (!inX || body.y < p.y || body.y > p.y + 1.2) continue;
      body.y = p.y;
      body.vy = 0;
      body.grounded = true;
    }
  }

  // --- contact mural (pour la glissade et le saut mural) ---
  if (opts.allowWall !== false) {
    const probe = 0.08;
    const wallBox = { left: body.x - hw - probe, right: body.x + hw + probe, top: body.y - hh + 0.15, bottom: body.y - 0.15 };
    for (const s of solids) {
      if (!overlaps(wallBox, s)) continue;
      // Le corps est-il à gauche du solide (mur à droite) ou à sa droite ?
      if (body.x + hw <= s.left + 0.001) body.wallDir = 1;
      else if (body.x - hw >= s.right - 0.001) body.wallDir = -1;
    }
    // ne s'accroche pas en glissant sur un sol
    if (body.grounded) body.wallDir = 0;
  }

  if (body.grounded && !wasGrounded) {
    body.landed = 0.12;
    body.lastLandVy = dy / SIM_DT;
  }
}

// --- Sable -----------------------------------------------------------------

/**
 * Sables mouvants — « étouffoir, pas tueur » (design §6).
 *
 * Le sol reste sous les pieds : on n'enfonce donc pas le corps dans la
 * collision (à chaque image la résolution le remonterait). On mesure à la place
 * l'enfoncement (`sandDepth`, 0 → 1) que le rendu utilise pour peindre le
 * héros jusqu'aux genoux et le passer derrière le bord du sable.
 *
 * Rester dans le sable plus de `sandGrace` coûte un cœur et éjecte le héros,
 * puis le compteur repart en négatif : on a un répit avant la sanction
 * suivante. Le sable ralentit (×0,45) et empêche de reprendre de la hauteur.
 */
function updateSand(state, hero) {
  const hb = heroBox(hero);
  let inside = null;
  for (const s of state.room.sands) {
    const r = rect(s);
    if (hb.left < r.right && hb.right > r.left && hb.bottom > r.top - 0.01 && hb.top < r.bottom) {
      inside = r;
      break;
    }
  }
  if (!inside) {
    hero.inSand = 0;
    hero.sandTimer = 0;
    hero.sandDepth = 0;
    return;
  }
  hero.inSand = 1;
  hero.sandTimer += SIM_DT;
  hero.sandDepth = clamp(hero.sandTimer / TUNE.sandGrace, 0, 1);
  hero.vy = Math.max(hero.vy, -TUNE.sandJumpCap);
  hero.vx *= 1 - Math.min(1, 6 * SIM_DT);
  if (hero.sandTimer > TUNE.sandGrace) {
    hero.sandTimer = -TUNE.sandGrace; // répit : la prochaine sanction dans 2×1,5 s
    hero.sandDepth = 0;
    hero.vy = -TUNE.sandEject;
    hurtHero(state, 1, hero.vx >= 0 ? 1 : -1);
  }
}

// --- Ennemis ---------------------------------------------------------------

function stepEnemies(state) {
  const hero = state.hero;
  state.enemies = state.enemies.filter((e) => !(e.dead && e.deathTimer <= 0));
  for (const e of state.enemies) {
    if (e.dead) {
      e.deathTimer -= SIM_DT;
      continue;
    }
    e.hurt = Math.max(0, e.hurt - SIM_DT);
    e.timer += SIM_DT;
    const dx = hero.x - e.x;
    const dy = hero.y - e.y;
    const dist = Math.hypot(dx, dy);

    // recul commun après un coup
    if (Math.abs(e.vx) > 0.01 && e.hurt > 0) {
      const nx = e.x + e.vx * SIM_DT;
      if (!hitsWall(state, nx, e.y, e.w, e.h)) e.x = nx;
      e.vx = approach(e.vx, 0, 18 * SIM_DT);
    }

    switch (e.kind) {
      case 'beetle': {
        const step = e.dir * TUNE.beetleSpeed * SIM_DT;
        const nx = e.x + step;
        if (hitsWall(state, nx, e.y, e.w, e.h) || !groundAhead(state, nx, e.y, e.dir)) e.dir *= -1;
        else e.x = nx;
        break;
      }
      case 'idol': {
        if (e.state === 'idle' && e.timer > 0 && Math.abs(dx) < TUNE.idolRange && Math.abs(dy) < 4.2) {
          e.state = 'charge';
          e.timer = 0;
        } else if (e.state === 'charge') {
          if (e.timer >= TUNE.idolTelegraph) {
            e.state = 'idle';
            e.timer = -TUNE.idolCooldown;
            const dir = dx >= 0 ? 1 : -1;
            // visée : l'éclat part vers la poitrine du héros, pas à l'horizontale
            const aimDx = hero.x - (e.x + dir * 0.8);
            const aimDy = hero.y - hero.h * 0.5 - (e.y - e.h * 0.62);
            const aimLen = Math.hypot(aimDx, aimDy) || 1;
            const sin = clamp(aimDy / aimLen, -0.65, 0.65);
            state.projectiles.push({
              x: e.x + dir * 0.8,
              y: e.y - e.h * 0.62,
              vx: dir * TUNE.shardSpeed * Math.sqrt(Math.max(0, 1 - sin * sin)),
              vy: TUNE.shardSpeed * sin,
              w: 0.5,
              h: 0.35,
              life: TUNE.shardLife,
              dead: false,
            });
            pushEvent(state, { type: 'shard', x: e.x, y: e.y - e.h * 0.6, dir });
          }
        }
        break;
      }
      case 'golem': {
        if (e.state === 'rest') {
          if (e.timer >= TUNE.golemRest) {
            e.state = 'idle';
            e.timer = 0;
          }
        } else if (e.timer >= TUNE.golemRestEvery) {
          e.state = 'rest';
          e.timer = 0;
        } else if (dist < TUNE.golemSight && Math.abs(dy) < 2.4) {
          e.dir = dx >= 0 ? 1 : -1;
          const nx = e.x + e.dir * TUNE.golemSpeed * SIM_DT;
          if (!hitsWall(state, nx, e.y, e.w, e.h) && groundAhead(state, nx, e.y, e.dir)) e.x = nx;
        }
        break;
      }
      case 'vulture': {
        if (e.state === 'perched') {
          if (Math.abs(dx) < TUNE.vultureSight && dy > -1) {
            e.state = 'dive';
            e.vy = 0;
            e.dir = dx >= 0 ? 1 : -1;
          }
        } else if (e.state === 'dive') {
          e.x += e.dir * TUNE.vultureDiveSpeed * 0.55 * SIM_DT;
          e.y += TUNE.vultureDiveSpeed * SIM_DT;
          if (groundAhead(state, e.x, e.y + 0.2, 0) || hitsWall(state, e.x, e.y, e.w, e.h)) {
            e.state = 'return';
            e.y -= 0.5;
          }
        } else if (e.state === 'return') {
          const ddx = e.homeX - e.x;
          const ddy = e.homeY - e.y;
          const len = Math.hypot(ddx, ddy) || 1;
          e.x += (ddx / len) * TUNE.vultureDiveSpeed * 0.6 * SIM_DT;
          e.y += (ddy / len) * TUNE.vultureDiveSpeed * 0.6 * SIM_DT;
          if (len < 0.35) {
            e.state = 'perched';
            e.x = e.homeX;
            e.y = e.homeY;
          }
        }
        break;
      }
      default:
        break;
    }
  }
}

function hitsWall(state, x, y, w, h) {
  const box = { left: x - w / 2, right: x + w / 2, top: y - h, bottom: y - 0.05 };
  return state.room.solids.some((s) => overlaps(box, rect(s)));
}

/** Y a-t-il un sol juste devant `x`, dans la direction `dir` ? */
function groundAhead(state, x, y, dir) {
  const probeX = x + dir * 0.25;
  const box = { left: probeX - 0.05, right: probeX + 0.05, top: y + 0.02, bottom: y + 0.35 };
  return state.room.solids.some((s) => overlaps(box, rect(s)));
}

function damageEnemy(state, enemy, dmg, dir, opts = {}) {
  enemy.hp -= dmg;
  enemy.hurt = 0.12;
  enemy.vx = dir * (opts.knockback || TUNE.knockback[0]);
  if (opts.upward) enemy.y -= 0.08;
  state.stats.hits += 1;
  applyHitPause(state, TUNE.hitPause[Math.min((opts.stage || 1) - 1, 2)]);
  state.shake = Math.max(state.shake, 2.4 + (opts.stage || 1));
  pushEvent(state, { type: 'hit', x: enemy.x, y: enemy.y - enemy.h * 0.6, stage: opts.stage || 1, dir });
  if (enemy.hp <= 0) {
    enemy.dead = true;
    enemy.deathTimer = 0.22;
    state.stats.kills += 1;
    pushEvent(state, { type: 'poof', x: enemy.x, y: enemy.y - enemy.h * 0.5, kind: enemy.kind });
  }
}

function stepProjectiles(state) {
  for (const p of state.projectiles) {
    p.life -= SIM_DT;
    p.x += p.vx * SIM_DT;
    p.y += p.vy * SIM_DT;
    if (p.life <= 0) p.dead = true;
    if (!p.dead && hitsWall(state, p.x, p.y + p.h * 0.5, p.w, p.h)) {
      p.dead = true;
      pushEvent(state, { type: 'shardBreak', x: p.x, y: p.y });
    }
  }
  state.projectiles = state.projectiles.filter((p) => !p.dead);
}

function checkGoal(state) {
  const hero = state.hero;
  if (overlaps(heroBox(hero), rect(state.room.goal))) {
    state.phase = 'victory';
    state.stats.clearedIn = state.time;
    pushEvent(state, { type: 'victory', x: hero.x, y: hero.y - 1 });
  }
}

function applyHitPause(state, seconds) {
  state.hitPause = Math.max(state.hitPause, seconds);
}

function pushEvent(state, event) {
  if (state.events.length >= 96) state.events.shift();
  state.events.push({ ...event, frame: state.frame });
}
