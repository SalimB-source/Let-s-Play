// ════════════════════════════════════════════════════════════════════
// LA CENDRE — règles de combat pures (M1 : le duel)
// Sans THREE ni React : endurance, attaques, esquive i-frames, hitstop,
// ennemi télégraphé, lock-on. Testable en Node, branché par SoulsWorld.
// ════════════════════════════════════════════════════════════════════

// ── Joueur : endurance & actions ─────────────────────────────────────
export const STAMINA = Object.freeze({
  max: 100,
  light: 14,
  heavy: 30,
  dodge: 22,
  regen: 30,          // points/s
  regenDelay: 0.55,   // s — délai après toute dépense
});

export const ATTACKS = Object.freeze({
  light: Object.freeze({
    windup: 0.15, active: 0.17, recover: 0.24,
    damage: 24, range: 2.15, arcCos: 0.35,   // cos(half-arc) : large balayage
    hitstop: 0.07, shake: 0.5,
  }),
  heavy: Object.freeze({
    windup: 0.38, active: 0.22, recover: 0.46,
    damage: 52, range: 2.45, arcCos: 0.25,
    hitstop: 0.14, shake: 1.0,
  }),
});

export const DODGE = Object.freeze({
  duration: 0.55,
  iframes: 0.4,        // i-frames débutantes (sur la roulade quasi entière)
  speed: 8.6,          // m/s pendant la roulade
  cooldown: 0.18,
});

/**
 * Potion de vie : geste long et VULNÉRABLE.
 * Tant que `action === 'drink'` : aucune attaque, aucune roulade, marche
 * ralentie. Le soin tombe à `healAt` (le goulot est aux lèvres), pas au
 * début — boire se mérite. Un coup encaissé interrompt la gorgée.
 */
export const DRINK = Object.freeze({
  duration: 1.35,      // s — lever le flacon, boire, le reposer
  healAt: 0.58,        // fraction du geste où les PV tombent
  speedMult: 0.32,     // marche au ralenti pendant la gorgée
  staminaCost: 0,      // la potion ne coûte pas d'endurance…
  recoverLock: 0.22,   // …mais laisse une courte inertie à la fin
});

export const PLAYER = Object.freeze({ maxHp: 100, hurtLock: 0.45 });

/** État de combat du joueur. */
export function createCombatState() {
  return {
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,     // surcharge par la progression (Vitalité)
    stamina: STAMINA.max,
    staminaMax: STAMINA.max, // surcharge par la progression (Endurance)
    strMult: 1,              // surcharge par la progression (Puissance)
    staminaLock: 0,
    action: 'none',        // none | light | heavy | dodge | hitstun | drink
    actionT: 0,
    drank: false,          // la gorgée a-t-elle déjà soigné ? (une fois/geste)
    hitstop: 0,
    invuln: 0,
    dodgeCd: 0,
    dodgeDir: { x: 0, z: -1 },
    swingHit: false,
    shake: 0,
    flash: 0,              // rouge de dégâts (HUD)
    lockOn: false,
    drawn: false,          // arme en main
    drawT: 0,              // retard avant rengainer
  };
}

const isAttacking = (c) => c.action === 'light' || c.action === 'heavy';

/** Le joueur est-il en train de boire sa potion ? */
export const isDrinking = (c) => c.action === 'drink';

/** La fenêtre d'action permet-elle de lancer une nouvelle action lourde ? */
export function canStart(c) {
  if (c.action === 'hitstun' || c.action === 'dodge') return false;
  if (isDrinking(c)) return false;   // on ne frappe pas le goulot aux lèvres
  if (isAttacking(c)) return false;
  return true;
}

/** L'esquive est-elle jouable (y compris annulation des récupérations) ? */
export function canDodge(c) {
  if (c.dodgeCd > 0 || c.stamina < STAMINA.dodge) return false;
  if (c.action === 'dodge' || c.action === 'hitstun') return false;
  if (isDrinking(c)) return false;   // aucune roulade pendant la gorgée
  if (isAttacking(c)) {
    const spec = ATTACKS[c.action];
    // Annule la fin de récupération seulement (fenêtre de skill).
    return c.actionT >= spec.windup + spec.active;
  }
  return true;
}

function spend(c, cost) {
  c.stamina = Math.max(0, c.stamina - cost);
  c.staminaLock = STAMINA.regenDelay;
}

export function tryLight(c) {
  if (!canStart(c) || c.stamina < STAMINA.light) return false;
  spend(c, STAMINA.light);
  c.action = 'light';
  c.actionT = 0;
  c.swingHit = false;
  return true;
}

export function tryHeavy(c) {
  if (!canStart(c) || c.stamina < STAMINA.heavy) return false;
  spend(c, STAMINA.heavy);
  c.action = 'heavy';
  c.actionT = 0;
  c.swingHit = false;
  return true;
}

export function tryDodge(c, dirX, dirZ) {
  if (!canDodge(c)) return false;
  spend(c, STAMINA.dodge);
  const mag = Math.hypot(dirX, dirZ);
  c.dodgeDir.x = mag > 1e-4 ? dirX / mag : 0;
  c.dodgeDir.z = mag > 1e-4 ? dirZ / mag : -1;
  c.action = 'dodge';
  c.actionT = 0;
  c.invuln = Math.max(c.invuln, DODGE.iframes);
  c.dodgeCd = DODGE.cooldown;
  return true;
}

/**
 * Le joueur porte le flacon à ses lèvres.
 * @param {object} c état de combat
 * @param {boolean} hasCharge une potion est-elle encore disponible ?
 * @returns {boolean} true si le geste démarre (la charge est consommée
 *   par l'appelant au moment du soin, pas au départ — une gorgée
 *   interrompue par un coup ne gaspille pas la potion)
 */
export function tryDrink(c, hasCharge = true) {
  if (!hasCharge) return false;
  if (c.action !== 'none' || c.hitstop > 0) return false;
  c.action = 'drink';
  c.actionT = 0;
  c.drank = false;
  return true;
}

/**
 * Le soin tombe-t-il maintenant ? (une seule fois par gorgée)
 * Renvoie true à l'instant précis où les PV doivent être rendus.
 */
export function drinkHealDue(c) {
  if (!isDrinking(c) || c.drank) return false;
  if (c.actionT < DRINK.duration * DRINK.healAt) return false;
  c.drank = true;
  return true;
}

/** Multiplicateur de vitesse de déplacement (la gorgée ralentit le pas). */
export function moveSpeedMult(c) {
  return isDrinking(c) ? DRINK.speedMult : 1;
}

/** Frame courante d'une attaque (windup / actif / récupération). */
export function attackPhase(c) {
  if (!isAttacking(c)) return null;
  const spec = ATTACKS[c.action];
  if (c.actionT < spec.windup) return 'windup';
  if (c.actionT < spec.windup + spec.active) return 'active';
  return 'recover';
}

/** Fenêtre de touche active, une seule fois par balayage.
 *  Impact à 55 % de la phase active : l'épaule a terminé son arc (60 %)
 *  → le hitstop fige la lame à plat dans la cible, à hauteur de poitrine. */
export function playerStrikeReady(c) {
  if (!isAttacking(c) || c.swingHit || attackPhase(c) !== 'active') return false;
  const spec = ATTACKS[c.action];
  return c.actionT - spec.windup >= spec.active * 0.55;
}

/** L'ennemi touche-t-il le joueur (distance + cône) ? */
export function inArc(ax, az, aYaw, bx, bz, range, arcCos) {
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return false;
  if (dist < 0.4) return true;
  const fx = -Math.sin(aYaw);
  const fz = -Math.cos(aYaw);
  return (dx * fx + dz * fz) / dist >= arcCos;
}

/** Frappe réussie joueur → enchaîne hitstop/secousse. Renvoie true. */
export function markSwingHit(c, attackName) {
  const spec = ATTACKS[attackName];
  c.swingHit = true;
  c.hitstop = Math.max(c.hitstop, spec.hitstop);
  c.shake = Math.max(c.shake, spec.shake);
  return spec.damage * (c.strMult ?? 1);
}

/** i-frames actives ? */
export function isInvulnerable(c) {
  return c.invuln > 0;
}

/**
 * Dégâts subis par le joueur. Renvoie false si i-frames (esquive).
 */
export function damagePlayer(c, amount) {
  if (isInvulnerable(c)) return false;
  c.hp = Math.max(0, c.hp - amount);
  c.action = 'hitstun';
  c.actionT = 0;
  c.drank = false;             // gorgée interrompue : la potion n'est pas bue
  c.hitstop = Math.max(c.hitstop, 0.05);
  c.shake = Math.max(c.shake, 0.8);
  c.flash = 1;
  c.invuln = 0.45;           // après-coup : pas de dégâts enchaînés
  return true;
}

/**
 * Un pas de combat joueur.
 * hitstop > 0 : tout est figé (freeze frame) sauf le décrément lui-même.
 */
export function stepCombat(c, dt) {
  if (c.hitstop > 0) {
    c.hitstop = Math.max(0, c.hitstop - dt);
    return c;
  }
  c.shake = Math.max(0, c.shake - dt * 3.2);
  c.flash = Math.max(0, c.flash - dt * 2.4);
  c.invuln = Math.max(0, c.invuln - dt);
  c.dodgeCd = Math.max(0, c.dodgeCd - dt);
  if (c.staminaLock > 0) c.staminaLock = Math.max(0, c.staminaLock - dt);
  else if (c.action !== 'dodge' && c.stamina < (c.staminaMax ?? STAMINA.max)) {
    c.stamina = Math.min(c.staminaMax ?? STAMINA.max, c.stamina + STAMINA.regen * dt);
  }

  c.actionT += dt;
  if (c.action === 'dodge' && c.actionT >= DODGE.duration) {
    c.action = 'none';
    c.actionT = 0;
  } else if (c.action === 'drink' && c.actionT >= DRINK.duration) {
    c.action = 'none';
    c.actionT = 0;
    c.drank = false;
    c.staminaLock = Math.max(c.staminaLock, DRINK.recoverLock);
  } else if (c.action === 'hitstun' && c.actionT >= PLAYER.hurtLock) {
    c.action = 'none';
    c.actionT = 0;
  } else if (isAttacking(c)) {
    const spec = ATTACKS[c.action];
    if (c.actionT >= spec.windup + spec.active + spec.recover) {
      c.action = 'none';
      c.actionT = 0;
    }
  }
  return c;
}

/** Régression aggro → repos : arme rengainée après 4 s sans menace. */
export function updateDraw(c, inCombat, dt) {
  c.drawn = inCombat || c.lockOn;
  c.drawT = c.drawn ? 0 : c.drawT + dt;
  return c.drawn || c.drawT < 4;
}

// ── Ennemi : « guerrier insecte déchu » télégraphié ────────────────────
export const ENEMY = Object.freeze({
  maxHp: 160,
  souls: 175,        // récompense relevée avec la difficulté
  walkSpeed: 2.65,
  aggroRange: 10.5,
  deaggroRange: 15,
  attackRange: 2.45,
  strikeArcCos: 0.35,
  windup: 0.5,         // télégraphe raccourci, mais encore lisible et esquivable
  active: 0.24,
  recover: 0.65,       // fenêtre de riposte plus courte
  damage: 21,
  cooldown: 0.38,
  turnRate: 6,
  staggerTime: 0.28,
  riposte: 1.35,       // la garde résiste mieux aux ripostes
  radius: 0.46,
});

export const ENEMY_PHASES = Object.freeze([
  'idle', 'chase', 'windup', 'strike', 'recover',
  'windup2', 'leap', 'strike2', // boss : bond + coup dans le sol
  'seated', 'rise',             // boss : assis sur le trône → se lève
  'dead',
]);

/**
 * Spécifications du boss « Veilleur de Cendre ».
 * Deuxième attaque : accroupissement → BOND (parabole vers le joueur)
 * → épée enfoncée dans la cendre (arc quasi circulaire, on passe
 * derrière ou hors du rayon d'impact).
 */
export const BOSS = Object.freeze({
  maxHp: 560, walkSpeed: 3.45, aggroRange: 9.5, deaggroRange: 16,
  attackRange: 3.05, strikeArcCos: 0.3, windup: 0.55, active: 0.28,
  recover: 0.75, damage: 32, cooldown: 0.3, turnRate: 5.6,
  staggerTime: 0.22, riposte: 1.3, radius: 0.66, souls: 1200,
  windup2: 0.45,   // accroupissement télégraphié plus bref
  leapDur: 0.42,   // bond plus vif, trajectoire toujours lisible
  active2: 0.32,   // impact plus difficile à traverser
  leapMax: 7.4,    // portée horizontale du bond
  leapHeight: 2.05, // hauteur du saut
  jumpReach: 3.6,  // rayon de l'onde à l'impact
  jumpArcCos: -0.45, // large arc : esquive par distance ou en passant derrière
  jumpCdMax: 3.8,  // repos raccourci entre deux bonds
  seated: true,    // attend sur son trône…
  riseRange: 8.5,  // …et se lève quand on approche à cette distance
  riseDur: 2.1,    // se lève plus vite, invulnérable pendant le cri final
  riseAdvance: 1.75, // il descend de l'estrade en se dressant (dégage le trône)
});

/** État de l'unique ennemi du M1. */
export function createEnemyState(x, z) {
  return {
    x, z,
    spawnX: x, spawnZ: z,
    yaw: 0,
    hp: ENEMY.maxHp,
    phase: 'idle',
    t: 0,
    cooldown: 0,
    jumpCd: 0,
    leapY: 0,
  stagger: 0,
  strikeDone: false,
  dead: false,
  deathT: 0,
  aggroAnnounced: false,
  leftThrone: false,   // le boss a quitté son trône (le meuble redevient solide)
  vx: 0, vz: 0,
};
}

/**
 * Un pas d'IA pure.
 * @returns {'strike'|null} événement « fenêtre d'attaque ouverte »
 */
export function stepEnemy(e, player, dt, opts = {}) {
  if (e.dead) {
    e.deathT += dt;
    return null;
  }
  const S = e.spec || ENEMY; // specs par instance (boss / variantes)
  e.t += dt;
  if (e.cooldown > 0) e.cooldown = Math.max(0, e.cooldown - dt);
  if (e.jumpCd > 0) e.jumpCd = Math.max(0, e.jumpCd - dt);
  if (e.stagger > 0) {
    e.stagger = Math.max(0, e.stagger - dt);
    return null;
  }

  const dx = player.x - e.x;
  const dz = player.z - e.z;
  const dist = Math.hypot(dx, dz);
  const toPlayer = Math.atan2(-dx, -dz);

  if (e.phase === 'seated') {
    // Assis : immobile tant que personne n'approche (zone du joueur requise).
    if (!opts.blockAggro && dist < (S.riseRange ?? 8.5)) {
      e.phase = 'rise';
      e.t = 0;
      return 'rise';
    }
    return null;
  }

  if (e.phase === 'rise') {
    // Il se lève : regard qui se verrouille sur l'intrus, puis la chasse.
    e.yaw = stepEnemyYaw(e.yaw, toPlayer, S.turnRate * 0.5, dt);
    // Il dégage le trône en se dressant : un pas vers la nef, sinon il
    // reste assis dans son propre meuble et se bat à travers le dossier.
    const adv = S.riseAdvance ?? 0;
    if (adv) {
      const u = e.t / (S.riseDur ?? 2.4);
      const s = u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
      const seat = e.seatYaw ?? e.yaw;
      e.x = (e.spawnX ?? e.x) - Math.sin(seat) * adv * s;
      e.z = (e.spawnZ ?? e.z) - Math.cos(seat) * adv * s;
    }
    if (e.t >= (S.riseDur ?? 2.4)) {
      e.phase = 'chase';
      e.t = 0;
      e.cooldown = 0.35;
      e.jumpCd = 1.2; // pas de bond dans la première seconde
      e.leftThrone = true; // debout : le trône redevient un obstacle pour lui
      return 'risen';
    }
    return null;
  }

  if (e.phase === 'idle') {
    if (!opts.blockAggro && dist < S.aggroRange) {
      e.phase = 'chase';
      e.t = 0;
      return null;
    }
    // Retour au poste (stage) : les gardes reprennent leur place.
    const hx = (e.spawnX ?? e.x) - e.x;
    const hz = (e.spawnZ ?? e.z) - e.z;
    const hd = Math.hypot(hx, hz);
    if (hd > 1.2) {
      e.yaw = stepEnemyYaw(e.yaw, Math.atan2(-hx, -hz), S.turnRate * 0.7, dt);
      const hs = S.walkSpeed * 0.8;
      e.vx += ((hx / hd) * hs - e.vx) * Math.min(1, 8 * dt);
      e.vz += ((hz / hd) * hs - e.vz) * Math.min(1, 8 * dt);
      e.x += e.vx * dt;
      e.z += e.vz * dt;
    } else {
      e.vx *= Math.exp(-8 * dt);
      e.vz *= Math.exp(-8 * dt);
    }
    return null;
  }

  if (e.phase === 'chase' && opts.blockAggro) {
    e.phase = 'idle'; // le joueur a changé de niveau : on regarde
    e.t = 0;
    e.vx *= 0.5;
    e.vz *= 0.5;
    return null;
  }

  if (e.phase === 'chase') {
    if (dist > S.deaggroRange) {
      e.phase = 'idle';
      e.t = 0;
      return null;
    }
    e.yaw = stepEnemyYaw(e.yaw, toPlayer, S.turnRate, dt);
    if (S.windup2 && e.jumpCd <= 0 && dist > S.attackRange
      && dist <= (S.leapMax ?? 8)) {
      e.phase = 'windup2'; // le boss bondit depuis sa distance de vol
      e.t = 0;
      return null;
    }
    if (dist > S.attackRange * 0.92) {
      // Avance en gardant l'alignement (glissement discret acceptable).
      const speed = S.walkSpeed;
      e.vx += ((dx / (dist || 1)) * speed - e.vx) * Math.min(1, 8 * dt);
      e.vz += ((dz / (dist || 1)) * speed - e.vz) * Math.min(1, 8 * dt);
      e.x += e.vx * dt;
      e.z += e.vz * dt;
    } else {
      e.vx *= 0.7;
      e.vz *= 0.7;
      if (e.cooldown <= 0 && dist <= S.attackRange) {
        e.phase = 'windup';
        e.t = 0;
      }
    }
    return null;
  }

  if (e.phase === 'windup') {
    // Télégraphe verrouillé : l'armure de vent (super-armure) est active,
    // on se prend les dégâts sans interruption — il faut esquiver.
    e.yaw = stepEnemyYaw(e.yaw, toPlayer, S.turnRate * 0.45, dt);
    if (e.t >= S.windup) {
      e.phase = 'strike';
      e.t = 0;
      e.strikeDone = false;
      return 'strike';
    }
    return null;
  }

  if (e.phase === 'strike') {
    if (e.t >= S.active) {
      e.phase = 'recover';
      e.t = 0;
    }
    return null;
  }

  if (e.phase === 'windup2') {
    // Accroupissement télégraphé : on garde le regard sur la cible.
    e.yaw = stepEnemyYaw(e.yaw, toPlayer, S.turnRate * 0.8, dt);
    if (e.t >= (S.windup2 ?? 0.55)) {
      // Lancement : le point d'arrivée est figé (on l'esquive en courant).
      const d = Math.hypot(dx, dz) || 1;
      const leap = Math.min(S.leapMax ?? 6.5, d);
      e.leapFromX = e.x;
      e.leapFromZ = e.z;
      e.leapToX = e.x + (dx / d) * leap;
      e.leapToZ = e.z + (dz / d) * leap;
      e.leapY = 0;
      e.jumpCd = S.jumpCdMax ?? 5;
      e.phase = 'leap';
      e.t = 0;
    }
    return null;
  }

  if (e.phase === 'leap') {
    // Vol en parabole vers le point figé — sans collision (vol au-dessus).
    const u = Math.min(1, e.t / (S.leapDur ?? 0.55));
    e.x = e.leapFromX + (e.leapToX - e.leapFromX) * u;
    e.z = e.leapFromZ + (e.leapToZ - e.leapFromZ) * u;
    e.leapY = (S.leapHeight ?? 1.9) * 4 * u * (1 - u);
    e.yaw = stepEnemyYaw(e.yaw, toPlayer, S.turnRate * 0.9, dt);
    if (u >= 1) {
      e.leapY = 0;
      e.phase = 'strike2';
      e.t = 0;
      e.strikeDone = false;
      return 'slam';
    }
    return null;
  }

  if (e.phase === 'strike2') {
    // Enfoncement de la lame dans la cendre, puis récupération ouverte.
    if (e.t >= (S.active2 ?? 0.3)) {
      e.phase = 'recover';
      e.t = 0;
      e.cooldown = S.cooldown;
    }
    return null;
  }

  if (e.phase === 'recover') {
    if (e.t >= S.recover) {
      e.phase = dist < S.deaggroRange ? 'chase' : 'idle';
      e.t = 0;
      e.cooldown = S.cooldown;
    }
    return null;
  }
  return null;
}

export function stepEnemyYaw(yaw, target, rate, dt) {
  let delta = ((target - yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const maxStep = rate * dt;
  if (Math.abs(delta) <= maxStep) return target;
  return yaw + Math.sign(delta) * maxStep;
}

/**
 * Dégâts reçus par l'ennemi.
 * Super-armure pendant windup/strike (télégraphe intouchable) ;
 * stagger sinon ; riposte ×1.5 en récupération ; mort à 0 pv.
 * @returns {'hit'|'armor'|'riposte'|'dead'}
 */
export function damageEnemy(e, amount) {
  if (e.dead) return 'dead';
  const S = e.spec || ENEMY;
  // Assis ou en train de se lever : intouchable (aucun dégât, aucun stagger).
  if (e.phase === 'seated' || e.phase === 'rise') return 'armor';
  const armored = e.phase === 'windup' || e.phase === 'strike'
    || e.phase === 'windup2' || e.phase === 'strike2';
  const riposte = e.phase === 'recover';
  e.hp = Math.max(0, e.hp - amount * (riposte ? S.riposte : 1));
  if (e.hp <= 0) {
    e.dead = true;
    e.phase = 'dead';
    e.deathT = 0;
    return 'dead';
  }
  // ── Boss : bascule en PHASE 2 à 50 % — cri, puis specs accélérées.
  let awakened = false;
  if (e.isBoss && !e.phase2 && e.baseSpec && e.hp <= e.baseSpec.maxHp * 0.5) {
    e.phase2 = true;
    awakened = true;
    e.spec = {
      ...e.baseSpec,
      walkSpeed: e.baseSpec.walkSpeed * 1.3,
      windup: e.baseSpec.windup * 0.68,
      active: e.baseSpec.active * 0.9,
      recover: e.baseSpec.recover * 0.56,
      cooldown: e.baseSpec.cooldown * 0.72,
      turnRate: e.baseSpec.turnRate * 1.3,
      damage: Math.round(e.baseSpec.damage * 1.2),
      windup2: e.baseSpec.windup2 * 0.68,  // bond plus rapide
      leapDur: e.baseSpec.leapDur * 0.75,
      jumpCdMax: 2,
    };
  }
  if (armored) return 'armor';
  e.stagger = awakened ? S.staggerTime * 2.6 : S.staggerTime;
  e.phase = 'recover';
  e.t = 0;
  e.cooldown = S.cooldown;
  return riposte ? 'riposte' : 'hit';
}

/** Le joueur peut-il encaisser un coup (pour le HUD / le feedback) ? */
export function resetEnemy(e, x, z) {
  e.x = x;
  e.z = z;
  e.spawnX = x;
  e.spawnZ = z;
  e.hp = (e.spec || ENEMY).maxHp;
  e.phase2 = false;
  e.phase2Shown = false;
  if (e.baseSpec) e.spec = { ...e.baseSpec }; // le boss repart en phase 1
  const home = e.spec || ENEMY;
  e.phase = home.seated ? 'seated' : 'idle'; // le Roi se rassoit sur son trône
  if (home.seated && e.seatYaw !== undefined) e.yaw = e.seatYaw;
  e.leftThrone = false;             // il réoccupe son trône (collider coupé)
  e.t = 0;
  e.cooldown = 0;
  e.jumpCd = 0;
  e.leapY = 0;
  e.stagger = 0;
  e.strikeDone = false;
  e.dead = false;
  e.deathT = 0;
  e.aggroAnnounced = false;
  e.vx = 0;
  e.vz = 0;
}

// ── Lock-on ──────────────────────────────────────────────────────────
/**
 * Cible de verrouillage : ennemi vivant dans le cône avant prioritaire,
 * sinon ennemi vivant le plus proche dans la portée.
 */
export function pickLockTarget(px, pz, pyaw, enemies, maxRange = 15) {
  let best = null;
  let bestScore = Infinity;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - px;
    const dz = e.z - pz;
    const dist = Math.hypot(dx, dz);
    if (dist > maxRange) continue;
    let inCone = false;
    if (dist > 1e-3) {
      const fx = -Math.sin(pyaw);
      const fz = -Math.cos(pyaw);
      inCone = (dx * fx + dz * fz) / dist > -0.2; // ±100° autour de l'avant
    }
    const score = dist + (inCone ? 0 : 25);
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/** Le verrouillage reste-t-il valide ? */
export function lockStillValid(target, px, pz, maxRange = 17) {
  if (!target || target.dead) return false;
  return Math.hypot(target.x - px, target.z - pz) <= maxRange;
}
