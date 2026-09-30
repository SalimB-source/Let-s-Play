// ── Les voies de la piste ───────────────────────────────────────────────
// Le site joue sur quatre voies, l'application Android sur trois (voir
// `mirageLanes.js`) : sur un téléphone tenu à deux mains, quatre couloirs de
// 2,1 m sont trop fins à viser, et la croix directionnelle obligeait à
// traverser trois cases d'un coup pour changer de côté.
//
// Le rendu, les règles et le décor lisent donc une piste *vivante* :
//
//   - `LANES` reste le tableau exporté que tous les modules importent par
//     référence : `setLaneCount()` remplace son contenu sur place, donc
//     `LANES[2]`, `LANES.length`… suivent la nouvelle piste sans rien
//     propager. C'est pour cette raison qu'il n'est PAS gelé ;
//   - `laneCount()` remplace l'ancienne constante `LANE_COUNT` : le nombre de
//     voies change au démarrage de l'app, un export figé ne pourrait pas le
//     suivre. Les valeurs dépendant des voies se calculent donc à l'intérieur
//     des fonctions (jamais au chargement d'un module, qui précède le choix de
//     la piste) ;
//   - `lanePosition(lane)` ramène une voie hors piste sur la dernière voie
//     disponible — un cavalier à la voie 3 vu depuis l'app (3 voies) court
//     sur la voie 2 au lieu de sortir de l'écran.
//
// La largeur d'une voie ne change pas (2,1 m) : seule la largeur de la piste
// suit le nombre de voies — 6,3 m à trois voies, 8,4 m à quatre.
export const LANE_SPACING = 2.1;
const LANE_POSITIONS = Object.freeze({
  3: Object.freeze([-LANE_SPACING, 0, LANE_SPACING]),
  4: Object.freeze([-3.15, -1.05, 1.05, 3.15]),
});
/** Les pistes que l'on sait construire, de la plus étroite à la plus large. */
export const LANE_COUNTS = Object.freeze([3, 4]);
/** Voies de la piste courante — contenu remplacé par `setLaneCount()`. */
export const LANES = [...LANE_POSITIONS[4]];
let activeLaneCount = LANES.length;

/** Nombre de voies de la piste courante (3 dans l'app, 4 sur le site). */
export function laneCount() {
  return activeLaneCount;
}

/** Largeur totale de la piste (m) pour un nombre de voies donné. */
export function trackWidth(count = activeLaneCount) {
  return count * LANE_SPACING;
}

/** Indices des voies de la piste courante : [0, 1, 2] ou [0, 1, 2, 3]. */
export function laneIndices() {
  return LANES.map((_, lane) => lane);
}

/**
 * Choisit la piste : `setLaneCount(3)` pour l'app, `setLaneCount(4)` pour le
 * site (voir `applyLaneCountForDevice()` dans `mirageLanes.js`). À appeler au
 * démarrage, avant la première course : les rangées d'obstacles, les lignes de
 * départ et d'arrivée et le sol se construisent ensuite à partir de `LANES`.
 */
export function setLaneCount(count) {
  const positions = LANE_POSITIONS[count];
  if (!positions) throw new RangeError(`Nombre de voies inconnu : ${count}`);
  LANES.length = 0;
  LANES.push(...positions);
  activeLaneCount = LANES.length;
  return activeLaneCount;
}

/**
 * Position x d'une voie, bornée à la piste courante : une voie inexistante
 * (celle d'un joueur venu d'un client à quatre voies, ou d'un ancien message)
 * retombe sur la dernière voie au lieu de sortir de la piste.
 */
export function lanePosition(lane, fallback = 1) {
  const value = lane === null || lane === undefined || lane === '' ? NaN : Number(lane);
  const index = Math.trunc(value);
  const wanted = Number.isFinite(index) ? index : fallback;
  return LANES[Math.min(Math.max(0, wanted), LANES.length - 1)];
}

// Four diamond tiers:
// Cyan (tier 0): 100 pts
// Rouge (tier 1): 150 pts
// Verte (tier 2): 200 pts (New: more than red, less than gold)
// Or (tier 3): 250 pts (Fewer golden diamonds)
export const CRYSTALS = [
  { name: 'Cyan', color: 0x45e4ff, value: 100 },
  { name: 'Rouge', color: 0xf2352c, value: 150 },
  { name: 'Verte', color: 0x4cd964, value: 200 },
  { name: 'Or', color: 0xffd15c, value: 250 },
];
export const CRYSTAL_COUNT = CRYSTALS.length;

export const jumpHeight = (remaining) => remaining > 0 ? Math.sin((0.82 - remaining) / 0.82 * Math.PI) * 1.7 : 0;

// ── Mud puddles (flaques de boue) ──────────────────────────────────────
// Appearing occasionally on open lanes, mud puddles slow down the mount
// when stepped in on the ground (jumping clears them).
export const MUD_SPAWN_CHANCE = 0.42;
export const MUD_SLOW_DURATION = 1.2; // seconds the mount is slowed by mud
export const MUD_SLOW_FACTOR = 0.7; // speed multiplier while wading through mud
export const MUD_JUMP_CLEARANCE = 0.45; // jump height above which the mount leaps over a mud puddle

// Shuffle a bag of encounters: no adjacent repeats, always a traversable route.
// Les voies sont relues à chaque rangée (`laneIndices()` / `laneCount()`), donc
// une piste de trois voies reçoit ses propres motifs : à trois voies, un
// obstacle double (barrière) ne laisse qu'une voie libre, contre deux à quatre.
export function createCourse(random = Math.random) {
  let bag = [];
  let previous;
  return () => {
    const indices = laneIndices();
    const count = indices.length;
    if (!bag.length) {
      bag = ['slalom', 'gate', 'jump', 'trail', 'fork'];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag[bag.length - 1] === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const pattern = bag.pop();
    previous = pattern;
    const lane = Math.floor(random() * count);
    const gem = (l, raised = false) => {
      const roll = random();
      // Ground gems: 32% Bleu/Cyan (Shield), 24% Rouge (Pistol), 18% Vert (All slightly), 26% Jaune/Or (Lasso)
      // Raised gems (on jumps): 45% Vert, 55% Jaune/Or (always tier >= 2)
      return {
        kind: 'crystal',
        lane: l,
        raised,
        tier: raised
          ? (roll < 0.45 ? 2 : 3)
          : roll < 0.32 ? 0
          : roll < 0.56 ? 1
          : roll < 0.74 ? 2
          : 3
      };
    };
    let items;
    if (pattern === 'jump') {
      const start = Math.floor(random() * (count - 1));
      items = [
        { kind: 'barrier', lane: start, lanes: [start, start + 1] },
        ...indices.filter(l => l !== start && l !== start + 1).map(l => ({ kind: 'cactus', lane: l })),
        gem(start, true), gem(start + 1, true),
      ];
    } else if (pattern === 'gate') {
      items = indices.map(l => l === lane ? gem(l) : { kind: 'cactus', lane: l });
    } else if (pattern === 'trail') {
      items = indices.map(l => gem(l));
      if (random() < MUD_SPAWN_CHANCE) {
        const mudLane = Math.floor(random() * count);
        items[mudLane] = { kind: 'mud', lane: mudLane };
      }
    } else if (pattern === 'fork') {
      const start = Math.floor(random() * (count - 1));
      const groundLanes = indices.filter(l => l !== start && l !== start + 1);
      const mudLane = random() < MUD_SPAWN_CHANCE
        ? groundLanes[Math.floor(random() * groundLanes.length)]
        : -1;
      items = [
        { kind: 'barrier', lane: start, lanes: [start, start + 1] },
        ...groundLanes.map(l => (l === mudLane ? { kind: 'mud', lane: l } : gem(l))),
        gem(start, true),
      ];
    } else {
      const freeLanes = indices.filter(l => l !== lane);
      const mudLane = random() < MUD_SPAWN_CHANCE
        ? freeLanes[Math.floor(random() * freeLanes.length)]
        : -1;
      items = indices.map(l => (
        l === lane
          ? { kind: 'cactus', lane: l }
          : l === mudLane
            ? { kind: 'mud', lane: l }
            : gem(l)
      ));
    }
    return { pattern, items, gap: 18 + random() * 7 };
  };
}

// ── Gem shatter burst ──────────────────────────────────────────────────
// Every collected diamond explodes into a handful of shards plus a flash ring.
export const GEM_BURST_DURATION = 0.52; // seconds a burst stays on screen
export const GEM_BURST_SHARDS = 10; // shards thrown by one diamond
export const GEM_BURST_GRAVITY = 12; // m/s², pulls the shards back down
export const GEM_BURST_LIFT = 0.55; // m of upward kick, on top of the spread
// Richer diamonds throw their shards further: cyan, red, green, gold.
export const GEM_BURST_SPEED = Object.freeze([3.6, 4.2, 4.7, 5.1]);

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export const gemBurstSpeed = (tier) => GEM_BURST_SPEED[tier] ?? GEM_BURST_SPEED[0];

const GEM_BURST_DOWNWARD = 0.55;

export function gemBurstShards(count = GEM_BURST_SHARDS, random = Math.random) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const twist = random() * Math.PI * 2;
  const shards = [];
  for (let i = 0; i < count; i += 1) {
    const y = 1 - ((i + 0.5) / count) * (1 + GEM_BURST_DOWNWARD);
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = twist + i * golden;
    shards.push({
      dir: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      speed: 0.72 + random() * 0.55,
      size: 0.62 + random() * 0.62,
      spin: [(random() - 0.5) * 22, (random() - 0.5) * 22, (random() - 0.5) * 22],
    });
  }
  return shards;
}

export function gemShardState(shard, age, tier = 0) {
  const life = clamp01(age / GEM_BURST_DURATION);
  const ease = 1 - (1 - life) ** 2;
  const reach = gemBurstSpeed(tier) * GEM_BURST_DURATION * shard.speed * ease;
  const fall = 0.5 * GEM_BURST_GRAVITY * (life * GEM_BURST_DURATION) ** 2;
  return {
    life,
    done: life >= 1,
    position: [
      shard.dir[0] * reach,
      shard.dir[1] * reach + GEM_BURST_LIFT * ease - fall,
      shard.dir[2] * reach,
    ],
    rotation: [shard.spin[0] * age, shard.spin[1] * age, shard.spin[2] * age],
    scale: shard.size * (1 - life * life * 0.9),
    opacity: 1 - life * life,
  };
}

export function gemFlashState(age, tier = 0) {
  const life = clamp01(age / GEM_BURST_DURATION);
  const ease = 1 - (1 - life) ** 3;
  return {
    life,
    done: life >= 1,
    scale: 0.45 + ease * (1.5 + tier * 0.28),
    opacity: (1 - life) ** 1.6 * 0.85,
  };
}

export const DUEL_DISTANCE = 800;
// Multiplicateur de vitesse temporaire par couleur : bleu, rouge, vert, jaune.
export const DIAMOND_SPEED_MULTIPLIERS = Object.freeze([1.3, 1.4, 1.2, 1.3]);
export const DUEL_BASE_SPEED = 15;
export const DUEL_MIN_SPEED = 8;
export const DUEL_MAX_SPEED = 26;

export const SPEED_BOOST_DURATION = 1;
export const SPEED_BOOST_NONE = Object.freeze({ multiplier: 1, left: 0 });

// ── Power-ups ──────────────────────────────────────────────────────────
export const POWER_UPS = {
  SHIELD: 'shield',
  LASSO: 'lasso',
  PISTOL: 'pistol',
  BOOST: 'boost',
};

// Power-up charging: points needed to charge each power-up.
// Blue diamonds charge Shield (+2), Yellow diamonds charge Lasso (+2),
// Red diamonds charge Pistol (+2), and Green diamonds charge Boost (+2).
export const POWER_UP_CHARGE_COST = {
  [POWER_UPS.SHIELD]: 8,   // 4 blue diamonds
  [POWER_UPS.LASSO]: 10,   // 5 yellow diamonds
  [POWER_UPS.PISTOL]: 12,  // 6 red diamonds
  [POWER_UPS.BOOST]: 8,    // 4 green diamonds
};

// Roster des rivaux du Duel : un rival de moins que de voies, le joueur
// occupant la sienne. À quatre voies, les trois PNJ ci-dessous courent aux
// voies 0, 2 et 3 (le joueur part à la voie 1) ; à trois voies, seuls L'Ombre
// (voie 0) et Sauge (voie 2) entrent en piste et le joueur part au centre.
export const DUEL_RIVALS = Object.freeze([
  Object.freeze({ id: 'ombre', name: 'L’OMBRE', label: 'L’Ombre', paletteIndex: 1, startLane: 0, pace: 1.0, hesitateChance: 0.11 }),
  Object.freeze({ id: 'sauge', name: 'SAUGE', label: 'Sauge', paletteIndex: 2, startLane: 2, pace: 0.985, hesitateChance: 0.14 }),
  Object.freeze({ id: 'amethyste', name: 'AMÉTHYSTE', label: 'Améthyste', paletteIndex: 3, startLane: 3, pace: 0.97, hesitateChance: 0.17 }),
]);
export const DUEL_RIVAL_COUNT = DUEL_RIVALS.length;

/**
 * Rivaux alignés sur la piste courante (voir `DUEL_RIVALS`) : trois sur le
 * site, deux dans l'application à trois voies. Une voie de départ trop large
 * pour la piste est ramenée sur la dernière voie.
 */
export function duelRivalsForTrack(count = laneCount()) {
  const wanted = Math.max(1, Math.min(count, LANE_COUNTS[LANE_COUNTS.length - 1]) - 1);
  return DUEL_RIVALS.slice(0, wanted).map((rival) => (
    rival.startLane < count ? rival : Object.freeze({ ...rival, startLane: count - 1 })
  ));
}

// Charge points gained per diamond tier:
// Tier 0 (Bleu/Cyan)  -> charges ONLY Shield (+2)
// Tier 1 (Rouge)      -> charges ONLY Pistol (+2)
// Tier 2 (Vert)       -> charges ONLY Boost (+2)
// Tier 3 (Jaune/Or)   -> charges ONLY Lasso (+2)
export const DIAMOND_POWER_CHARGE = Object.freeze([
  Object.freeze({ [POWER_UPS.SHIELD]: 2, [POWER_UPS.LASSO]: 0, [POWER_UPS.PISTOL]: 0, [POWER_UPS.BOOST]: 0 }),
  Object.freeze({ [POWER_UPS.SHIELD]: 0, [POWER_UPS.LASSO]: 0, [POWER_UPS.PISTOL]: 2, [POWER_UPS.BOOST]: 0 }),
  Object.freeze({ [POWER_UPS.SHIELD]: 0, [POWER_UPS.LASSO]: 0, [POWER_UPS.PISTOL]: 0, [POWER_UPS.BOOST]: 2 }),
  Object.freeze({ [POWER_UPS.SHIELD]: 0, [POWER_UPS.LASSO]: 2, [POWER_UPS.PISTOL]: 0, [POWER_UPS.BOOST]: 0 }),
]);

// Total charge points contributed by each diamond tier
export const DIAMOND_CHARGE_VALUE = [2, 2, 2, 2];

// Number of matching-color diamonds needed to fill each power-up bar.
export const POWER_UP_DIAMOND_COST = Object.freeze(Object.fromEntries(
  Object.entries(POWER_UP_CHARGE_COST).map(([type, points]) => [type, points / DIAMOND_CHARGE_VALUE[0]])
));

// Maximum charges a player can hold per power-up
export const POWER_UP_MAX_CHARGES = 3;

export const POWER_UP_MODES = Object.freeze(['duel', 'online']);

export function powerUpsEnabled(mode) {
  return mode === 'duel' || mode === 'online';
}

// ── Automatic power-ups (shield & boost) ─────────────────────────────
// Shield and Boost have no target to pick: they fire by themselves as soon as
// their charge bar is full. Lasso and Pistol stay manual because the player
// chooses who to catch or shoot.
export const AUTO_LAUNCH_POWERS = Object.freeze([POWER_UPS.SHIELD, POWER_UPS.BOOST]);

export function autoLaunchesWhenCharged(type) {
  return AUTO_LAUNCH_POWERS.includes(type);
}

/**
 * Split the powers that just finished charging into the ones that fire
 * instantly (`auto`) and the ones the player still triggers by hand (`manual`).
 */
export function splitChargedPowers(charged = []) {
  const auto = [];
  const manual = [];
  for (const type of charged) {
    if (autoLaunchesWhenCharged(type)) auto.push(type);
    else manual.push(type);
  }
  return { auto, manual };
}

/**
 * Initial power-up charge state: all four powers start at 0 charges and 0 progress.
 */
export function createPowerUpState() {
  return {
    shieldCharges: 0,
    lassoCharges: 0,
    pistolCharges: 0,
    boostCharges: 0,
    shieldChargePoints: 0,
    lassoChargePoints: 0,
    pistolChargePoints: 0,
    boostChargePoints: 0,
  };
}

/**
 * Charge power-ups according to the collected diamond `tier`:
 * - Tier 0 (Bleu/Cyan): charges only Shield
 * - Tier 1 (Rouge): charges only Pistol
 * - Tier 2 (Vert): charges only Boost
 * - Tier 3 (Jaune/Or): charges only Lasso
 * Once a power-up reaches its cost, it stays ready (progress = 1, charges = 1)
 * until ANY power-up is activated.
 */
export function chargePowerUps(state = createPowerUpState(), tier = 0) {
  const delta = DIAMOND_POWER_CHARGE[tier] ?? DIAMOND_POWER_CHARGE[0];
  const shieldDelta = delta[POWER_UPS.SHIELD] || 0;
  const lassoDelta = delta[POWER_UPS.LASSO] || 0;
  const pistolDelta = delta[POWER_UPS.PISTOL] || 0;
  const boostDelta = delta[POWER_UPS.BOOST] || 0;

  const shieldCost = POWER_UP_CHARGE_COST[POWER_UPS.SHIELD];
  const lassoCost = POWER_UP_CHARGE_COST[POWER_UPS.LASSO];
  const pistolCost = POWER_UP_CHARGE_COST[POWER_UPS.PISTOL];
  const boostCost = POWER_UP_CHARGE_COST[POWER_UPS.BOOST];

  let shieldCharges = state.shieldCharges || 0;
  let lassoCharges = state.lassoCharges || 0;
  let pistolCharges = state.pistolCharges || 0;
  let boostCharges = state.boostCharges || 0;
  let shieldChargePoints = state.shieldChargePoints || 0;
  let lassoChargePoints = state.lassoChargePoints || 0;
  let pistolChargePoints = state.pistolChargePoints || 0;
  let boostChargePoints = state.boostChargePoints || 0;

  const charged = [];

  if (shieldCharges === 0) {
    if (shieldDelta > 0) {
      shieldChargePoints = Math.min(shieldCost, shieldChargePoints + shieldDelta);
      if (shieldChargePoints >= shieldCost) {
        shieldCharges = 1;
        shieldChargePoints = shieldCost;
        charged.push(POWER_UPS.SHIELD);
      }
    }
  } else {
    shieldChargePoints = shieldCost;
  }

  if (lassoCharges === 0) {
    if (lassoDelta > 0) {
      lassoChargePoints = Math.min(lassoCost, lassoChargePoints + lassoDelta);
      if (lassoChargePoints >= lassoCost) {
        lassoCharges = 1;
        lassoChargePoints = lassoCost;
        charged.push(POWER_UPS.LASSO);
      }
    }
  } else {
    lassoChargePoints = lassoCost;
  }

  if (pistolCharges === 0) {
    if (pistolDelta > 0) {
      pistolChargePoints = Math.min(pistolCost, pistolChargePoints + pistolDelta);
      if (pistolChargePoints >= pistolCost) {
        pistolCharges = 1;
        pistolChargePoints = pistolCost;
        charged.push(POWER_UPS.PISTOL);
      }
    }
  } else {
    pistolChargePoints = pistolCost;
  }

  if (boostCharges === 0) {
    if (boostDelta > 0) {
      boostChargePoints = Math.min(boostCost, boostChargePoints + boostDelta);
      if (boostChargePoints >= boostCost) {
        boostCharges = 1;
        boostChargePoints = boostCost;
        charged.push(POWER_UPS.BOOST);
      }
    }
  } else {
    boostChargePoints = boostCost;
  }

  return {
    state: {
      shieldCharges,
      lassoCharges,
      pistolCharges,
      boostCharges,
      shieldChargePoints,
      lassoChargePoints,
      pistolChargePoints,
      boostChargePoints,
    },
    charged,
  };
}

/**
 * Decide whether an NPC rival should trigger one of its ready power-ups.
 * Lasso and Pistol can ONLY be used forward (on targets ahead of the NPC).
 * Returns `{ type, target }` or `null`.
 */
export function chooseNpcPowerAction(npc, candidates = []) {
  const state = npc?.powerState;
  if (!state || (npc.stunTimer || 0) > 0 || (npc.powerCooldown || 0) > 0) return null;

  const ahead = candidates
    .filter((c) => c.dist > npc.dist + 1.2)
    .sort((a, b) => b.dist - a.dist); // leader / furthest ahead first

  if ((state.pistolCharges || 0) > 0) {
    const target = ahead[0];
    if (target) return { type: POWER_UPS.PISTOL, target };
  }

  if ((state.lassoCharges || 0) > 0) {
    const aheadInLassoRange = ahead
      .filter((c) => c.dist - npc.dist <= 36)
      .sort((a, b) => a.dist - b.dist);
    const target = aheadInLassoRange[0];
    if (target) return { type: POWER_UPS.LASSO, target };
  }

  if ((state.boostCharges || 0) > 0 && (npc.powerBoostTimer || 0) <= 0) {
    return { type: POWER_UPS.BOOST, target: null };
  }

  if ((state.shieldCharges || 0) > 0 && !npc.shieldActive) {
    return { type: POWER_UPS.SHIELD, target: null };
  }

  return null;
}

/**
 * Use a ready power-up (`shield`, `lasso`, `pistol`, or `boost`).
 * Using a power-up discharges ONLY that power-up and keeps all other power-ups intact.
 */
export function consumePowerUp(state = createPowerUpState(), type) {
  const isReady =
    (type === POWER_UPS.SHIELD && (state.shieldCharges || 0) > 0) ||
    (type === POWER_UPS.LASSO && (state.lassoCharges || 0) > 0) ||
    (type === POWER_UPS.PISTOL && (state.pistolCharges || 0) > 0) ||
    (type === POWER_UPS.BOOST && (state.boostCharges || 0) > 0);

  if (!isReady) {
    return { used: false, type: null, state };
  }

  const nextState = {
    shieldCharges: state.shieldCharges || 0,
    lassoCharges: state.lassoCharges || 0,
    pistolCharges: state.pistolCharges || 0,
    boostCharges: state.boostCharges || 0,
    shieldChargePoints: state.shieldChargePoints || 0,
    lassoChargePoints: state.lassoChargePoints || 0,
    pistolChargePoints: state.pistolChargePoints || 0,
    boostChargePoints: state.boostChargePoints || 0,
  };

  if (type === POWER_UPS.SHIELD) {
    nextState.shieldCharges = 0;
    nextState.shieldChargePoints = 0;
  } else if (type === POWER_UPS.LASSO) {
    nextState.lassoCharges = 0;
    nextState.lassoChargePoints = 0;
  } else if (type === POWER_UPS.PISTOL) {
    nextState.pistolCharges = 0;
    nextState.pistolChargePoints = 0;
  } else if (type === POWER_UPS.BOOST) {
    nextState.boostCharges = 0;
    nextState.boostChargePoints = 0;
  }

  return {
    used: true,
    type,
    state: nextState,
  };
}

/**
 * Derive HUD-ready progress (0..1) and counters for the 4 power-ups.
 * A ready power-up always reports progress = 1 (100% full bar).
 */
export function powerUpHudState(state = createPowerUpState()) {
  const shieldCost = POWER_UP_CHARGE_COST[POWER_UPS.SHIELD];
  const lassoCost = POWER_UP_CHARGE_COST[POWER_UPS.LASSO];
  const pistolCost = POWER_UP_CHARGE_COST[POWER_UPS.PISTOL];
  const boostCost = POWER_UP_CHARGE_COST[POWER_UPS.BOOST];

  const shieldCharges = state.shieldCharges || 0;
  const lassoCharges = state.lassoCharges || 0;
  const pistolCharges = state.pistolCharges || 0;
  const boostCharges = state.boostCharges || 0;

  const shieldReady = shieldCharges > 0;
  const lassoReady = lassoCharges > 0;
  const pistolReady = pistolCharges > 0;
  const boostReady = boostCharges > 0;

  const shieldChargePoints = shieldReady ? shieldCost : Math.min(shieldCost, state.shieldChargePoints || 0);
  const lassoChargePoints = lassoReady ? lassoCost : Math.min(lassoCost, state.lassoChargePoints || 0);
  const pistolChargePoints = pistolReady ? pistolCost : Math.min(pistolCost, state.pistolChargePoints || 0);
  const boostChargePoints = boostReady ? boostCost : Math.min(boostCost, state.boostChargePoints || 0);

  return {
    shieldCharges,
    shieldChargePoints,
    shieldProgress: shieldReady ? 1 : shieldChargePoints / shieldCost,
    lassoCharges,
    lassoChargePoints,
    lassoProgress: lassoReady ? 1 : lassoChargePoints / lassoCost,
    pistolCharges,
    pistolChargePoints,
    pistolProgress: pistolReady ? 1 : pistolChargePoints / pistolCost,
    boostCharges,
    boostChargePoints,
    boostProgress: boostReady ? 1 : boostChargePoints / boostCost,
    anyPowerReady: shieldReady || lassoReady || pistolReady || boostReady,
  };
}

export const SHIELD_DURATION = 5; // seconds the shield stays active
export const LASSO_SLOW_DURATION = 1.5; // seconds target is slowed
export const LASSO_SLOW_FACTOR = 0.65; // speed multiplier while slowed
export const LASSO_PROJECTILE_DURATION = 0.45; // seconds rope flies
export const PISTOL_STUN_DURATION = 2.5; // seconds the shot rider is on the ground, fully stopped before remounting
export const POWER_BOOST_DURATION = 3; // seconds the green-diamond Boost power-up lasts before returning to normal speed
export const POWER_BOOST_BONUS = 6.5; // m/s speed boost granted by the Boost power-up during POWER_BOOST_DURATION
export const GEM_RESPAWN_DELAY = 0.5; // seconds a taken diamond disappears before reappearing

/**
 * Mark a diamond key as temporarily hidden for `delay` seconds (`GEM_RESPAWN_DELAY = 0.5`).
 */
export function markGemTaken(gemCooldowns, key, now, delay = GEM_RESPAWN_DELAY) {
  if (!gemCooldowns || !key) return;
  gemCooldowns.set(key, Number(now) + delay);
}

/**
 * Check whether a diamond key is currently hidden (`now < respawnAt`).
 * Automatically removes expired entries once `now >= respawnAt`.
 */
export function isGemHidden(gemCooldowns, key, now) {
  if (!gemCooldowns || !key) return false;
  const respawnAt = gemCooldowns.get(key);
  if (respawnAt === undefined) return false;
  if (Number(now) < respawnAt) return true;
  gemCooldowns.delete(key);
  return false;
}

const rankIndex = (rank) => Math.max(0, Math.min(3, (rank | 0) - 1));

export const PISTOL_CHANCES = [0, 0.05, 0.15, 0.3];
export const LASSO_CHANCES = [0, 0.3, 0.4, 0.6];

export function getLassoChance(rank) {
  return LASSO_CHANCES[rankIndex(rank)] ?? 0;
}

export function getPistolChance(rank) {
  return PISTOL_CHANCES[rankIndex(rank)] ?? 0;
}

export function powerUpOdds(rank) {
  const pistol = getPistolChance(rank);
  const lasso = (1 - pistol) * getLassoChance(rank);
  return { pistol, lasso, shield: 1 - pistol - lasso };
}

export function rollPowerUpSlot() {
  return false; // No longer spawning power-up "?" items on the road!
}

export function rollPowerUpContent(rank, random = Math.random) {
  if (random() < getPistolChance(rank)) return POWER_UPS.PISTOL;
  if (random() < getLassoChance(rank)) return POWER_UPS.LASSO;
  return POWER_UPS.SHIELD;
}

export function rollPowerUpType(rank, random = Math.random) {
  return null; // No road items
}

export function rollPowerUpForMode(mode, rank, random = Math.random) {
  return null; // No road items
}

export function nearestRider(myDistance, riders) {
  let best = null;
  for (const rider of riders || []) {
    const gap = Math.abs((Number(rider.distance) || 0) - myDistance);
    if (!best || gap < best.gap) best = { ...rider, gap };
  }
  return best;
}

export function stunPose(left, duration = PISTOL_STUN_DURATION, side = 1) {
  if (!(left > 0)) return { x: 0, y: 0, roll: 0, pitch: 0 };
  const p = clamp01(1 - left / duration);
  const ease = (t) => t * t * (3 - 2 * t);
  let off;
  let hop = 0;
  if (p < 0.22) { off = ease(p / 0.22); hop = Math.sin((p / 0.22) * Math.PI) * 0.45; }
  else if (p < 0.75) off = 1;
  else { const t = (p - 0.75) / 0.25; off = 1 - ease(t); hop = Math.sin(t * Math.PI) * 0.55; }
  return {
    x: side * off * 1.05,
    y: -off * 1.1 + hop,
    roll: side * off * 1.35,
    pitch: p >= 0.75 ? -Math.sin(((p - 0.75) / 0.25) * Math.PI) * 0.5 : 0,
  };
}

export const POWER_UP_DEFS = {
  [POWER_UPS.SHIELD]: {
    id: POWER_UPS.SHIELD,
    label: 'Bouclier',
    keyHintPC: 'AUTO',
    icon: '🛡️',
    description: 'S’active automatiquement dès que la barre est pleine : protège d’un choc, lasso ou tir (5s)',
    color: 0x4ce9df,
    emissive: 0x1a7a74,
    cost: POWER_UP_CHARGE_COST[POWER_UPS.SHIELD],
  },
  [POWER_UPS.LASSO]: {
    id: POWER_UPS.LASSO,
    label: 'Lasso',
    keyHintPC: 'W / Z',
    icon: '🪢',
    description: 'Attrape et ralentit l’adversaire devant toi',
    color: 0xd9913b,
    emissive: 0x8a4a12,
    cost: POWER_UP_CHARGE_COST[POWER_UPS.LASSO],
  },
  [POWER_UPS.BOOST]: {
    id: POWER_UPS.BOOST,
    label: 'Turbo',
    keyHintPC: 'AUTO',
    icon: '⚡',
    description: `S’active automatiquement dès que la barre est pleine : boost de vitesse pendant ${POWER_BOOST_DURATION}s avant de revenir à la vitesse normale`,
    color: 0x4cd964,
    emissive: 0x1e7a34,
    cost: POWER_UP_CHARGE_COST[POWER_UPS.BOOST],
  },
  [POWER_UPS.PISTOL]: {
    id: POWER_UPS.PISTOL,
    label: 'Pistolet',
    keyHintPC: 'R',
    icon: '🔫',
    description: `Fait tomber le cavalier devant toi pendant ${PISTOL_STUN_DURATION}s avant de remonter (se charge en ${POWER_UP_CHARGE_COST[POWER_UPS.PISTOL]} pts)`,
    color: 0xe05656,
    emissive: 0x801e1e,
    cost: POWER_UP_CHARGE_COST[POWER_UPS.PISTOL],
  },
};

// ── Diamond pickup effect (no traps) ────────────────────────────────────
/**
 * What a crystal does to the rider: its speed burst.
 * No trap probability: all diamonds give speed boost.
 */
export function crystalPickupEffect(tier, trapped = false) {
  return { trap: false, boost: speedBoostFor(tier), slowDuration: 0, slowFactor: 1 };
}

export function speedBoostFor(tier) {
  const multiplier = DIAMOND_SPEED_MULTIPLIERS[tier] ?? 1;
  return multiplier > 1 ? { multiplier, left: SPEED_BOOST_DURATION } : SPEED_BOOST_NONE;
}

export function tickSpeedBoost(boost, dt) {
  const left = Math.max(0, (boost?.left ?? 0) - dt);
  return left > 0 && boost?.multiplier > 1
    ? { multiplier: boost.multiplier, left }
    : SPEED_BOOST_NONE;
}

export function duelSpeed(base, multiplier = 1) {
  return Math.min(DUEL_MAX_SPEED, Math.max(DUEL_MIN_SPEED, base * multiplier));
}

export function ghostDistance(trace, seconds, duration) {
  if (!trace?.length || seconds <= 0) return 0;
  if (seconds >= duration) return DUEL_DISTANCE;
  const index = Math.floor(seconds * 2);
  const lastSample = (trace.length - 2) * 0.5;
  if (seconds >= lastSample) {
    const start = trace[trace.length - 2];
    return start + (DUEL_DISTANCE - start) * Math.min(1, (seconds - lastSample) / Math.max(0.01, duration - lastSample));
  }
  return trace[index] + (trace[index + 1] - trace[index]) * (seconds * 2 - index);
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

export function planNpcLane(items, currentLane, occupiedLanes = []) {
  let best = { lane: currentLane, jump: false, value: -Infinity };
  for (let lane = 0; lane < laneCount(); lane++) {
    if (items.some(item => item.kind === 'cactus' && item.lane === lane)) continue;
    const barrier = items.some(item => item.kind === 'barrier' && item.lanes.includes(lane));
    const mud = items.some(item => item.kind === 'mud' && item.lane === lane);
    const gem = items.find(item => item.kind === 'crystal' && item.lane === lane && !item.taken);
    const jump = barrier || mud || Boolean(gem?.raised);
    const crowdPenalty = occupiedLanes.includes(lane) ? 95 : 0;
    const value = (gem ? CRYSTALS[gem.tier].value : 0) - Math.abs(lane - currentLane) * 45 - (barrier ? 10 : 0) - (mud ? 110 : 0) - crowdPenalty;
    if (value > best.value) best = { lane, jump, value };
  }
  return best;
}

export function hitsMudPuddle(item, riderX, jumpY = 0) {
  if (!item || item.kind !== 'mud') return false;
  if (jumpY > MUD_JUMP_CLEARANCE) return false;
  return Math.abs(riderX - LANES[item.lane]) < 0.92;
}

export function resolveMudSlow({
  baseSpeed = DUEL_BASE_SPEED,
  mode = 'rush',
  slowTimer = 0,
  slowFactor = 1,
  slowKind = null,
} = {}) {
  const keepLasso = slowKind === 'lasso' && slowTimer > MUD_SLOW_DURATION;
  return {
    slowTimer: Math.max(slowTimer, MUD_SLOW_DURATION),
    slowFactor: keepLasso ? LASSO_SLOW_FACTOR : MUD_SLOW_FACTOR,
    slowKind: keepLasso ? 'lasso' : 'mud',
    baseSpeed: mode === 'rush' ? baseSpeed : Math.max(DUEL_MIN_SPEED, baseSpeed * 0.78),
    boost: SPEED_BOOST_NONE,
  };
}

export function advanceCowboyStreak(current, collected, crashed = false) {
  const streak = collected && !crashed ? current + 1 : 0;
  return { streak, cheer: streak > 0 && streak % 5 === 0 };
}

export function playerLaneAfterAction(lane, action, jumpRemaining) {
  if (jumpRemaining > 0) return lane;
  if (action === 'left') return Math.max(0, lane - 1);
  if (action === 'right') return Math.min(laneCount() - 1, lane + 1);
  return lane;
}

export function playerLateralPosition(x, targetX, dt, jumpRemaining) {
  return jumpRemaining > 0 ? x : x + (targetX - x) * Math.min(1, dt * 12);
}

export function resolveCollision({ mode, lives, speed, boost }) {
  if (mode === 'rush') {
    const nextLives = Math.max(0, lives - 1);
    return { lives: nextLives, baseSpeed: speed, boost, gameOver: nextLives === 0 };
  }
  return { lives, baseSpeed: Math.max(8, speed * 0.55), boost: SPEED_BOOST_NONE, gameOver: false };
}

export function isPlayerVisible(mode, invulnerable, time) {
  return mode !== 'online' && (invulnerable <= 0 || Math.floor(time / 90) % 2 === 0);
}

function lerpVec3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Computes the dynamic sunset-to-night progression for the Prairie ('Plaines d’Or') stage.
 * As `progress` goes from 0 (start of race) to 1 (end of race):
 * - The sun sinks from above the horizon (+5.5) down below the horizon (-12.0),
 *   with its top rim disappearing under the horizon (sunElevation + 8 <= 0) before the finish.
 * - The sky transitions from Golden Hour (0) -> Crimson Dusk (0.55) -> Starry Night (1).
 */
export function prairieSunsetState(progress = 0) {
  const p = Math.min(1, Math.max(0, Number(progress) || 0));
  const sunElevation = 5.5 - 17.5 * p;
  const sunVisible = sunElevation + 8.0 > 0;
  const starAlpha = p <= 0.5 ? 0 : Math.min(1, (p - 0.5) / 0.45);

  const golden = {
    skyBottom: [0.90, 0.70, 0.45],
    skyHorizon: [0.84, 0.52, 0.32],
    skyTop: [0.46, 0.37, 0.44],
    glow: [1.0, 0.58, 0.29],
    fog: [0.851, 0.604, 0.439],
    bg: [0.459, 0.376, 0.455],
    hemiSky: [1.0, 0.875, 0.627],
    hemiGround: [0.396, 0.322, 0.235],
    sunLight: [1.0, 0.714, 0.329],
  };
  const dusk = {
    skyBottom: [0.72, 0.28, 0.26],
    skyHorizon: [0.45, 0.20, 0.36],
    skyTop: [0.16, 0.13, 0.28],
    glow: [0.95, 0.32, 0.18],
    fog: [0.38, 0.21, 0.31],
    bg: [0.18, 0.12, 0.23],
    hemiSky: [0.82, 0.46, 0.48],
    hemiGround: [0.22, 0.16, 0.21],
    sunLight: [0.98, 0.38, 0.24],
  };
  const night = {
    skyBottom: [0.11, 0.15, 0.28],
    skyHorizon: [0.06, 0.09, 0.20],
    skyTop: [0.02, 0.03, 0.09],
    glow: [0.10, 0.14, 0.26],
    fog: [0.07, 0.10, 0.18],
    bg: [0.04, 0.06, 0.12],
    hemiSky: [0.44, 0.55, 0.78],
    hemiGround: [0.10, 0.13, 0.20],
    sunLight: [0.48, 0.60, 0.86],
  };

  const from = p < 0.55 ? golden : dusk;
  const to = p < 0.55 ? dusk : night;
  const localT = p < 0.55 ? p / 0.55 : (p - 0.55) / 0.45;

  return {
    progress: p,
    sunElevation,
    sunVisible,
    starAlpha,
    skyBottom: lerpVec3(from.skyBottom, to.skyBottom, localT),
    skyHorizon: lerpVec3(from.skyHorizon, to.skyHorizon, localT),
    skyTop: lerpVec3(from.skyTop, to.skyTop, localT),
    glow: lerpVec3(from.glow, to.glow, localT),
    fog: lerpVec3(from.fog, to.fog, localT),
    bg: lerpVec3(from.bg, to.bg, localT),
    hemiSky: lerpVec3(from.hemiSky, to.hemiSky, localT),
    hemiGround: lerpVec3(from.hemiGround, to.hemiGround, localT),
    sunLight: lerpVec3(from.sunLight, to.sunLight, localT),
    hemiIntensity: 1.65 - 0.72 * p,
    sunIntensity: 1.8 - 1.12 * p,
    rimIntensity: 0.45 - 0.22 * p,
  };
}

