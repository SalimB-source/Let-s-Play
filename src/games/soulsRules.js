// ════════════════════════════════════════════════════════════════════
// LA CENDRE — règles pures du soulslike (M0 : fondations)
// Logique seule, sans THREE ni React : lisible, testable, réutilisable
// par un smoke check. Le rendu (soulsWorld.jsx) se contente d'appeler
// ces fonctions et d'afficher l'état.
// ════════════════════════════════════════════════════════════════════

// ── Déplacement ─────────────────────────────────────────────────────
export const WALK_SPEED = 2.9;   // m/s — allure par défaut
export const RUN_SPEED = 5.6;    // m/s — course (Shift)
export const ACCEL = 13;         // approchement de la vitesse cible (1/s)
export const TURN_RATE = 11;     // rad/s — rotation du modèle vers la direction de marche
export const PLAYER_RADIUS = 0.4;

// ── Caméra 3e personne ──────────────────────────────────────────────
export const CAMERA = Object.freeze({
  distance: 4.7,          // m — recul derrière l'épaule
  headHeight: 1.55,       // m — hauteur des yeux du chevalier
  sensitivity: 0.0023,    // rad par pixel de souris
  pitchMin: -0.58,        // regard vers le bas (caméra haute)
  pitchMax: 0.66,         // regard vers le haut (caméra basse)
  followSmoothing: 14,    // 1/s — braquage de la caméra de poursuite
  minClearance: 0.55,     // m — garde-fou anti-mur après raycast
});

/**
 * Direction de regard de la caméra (normalisée) pour un couple yaw/pitch.
 * yaw 0 = on regarde vers −Z ; pitch > 0 = on lève les yeux.
 */
export function lookDirection(yaw, pitch) {
  const cosP = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosP,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosP,
  };
}

/** Position oculaire de la caméra de poursuite autour d'une tête (x,y,z). */
export function cameraPosition(head, yaw, pitch, distance) {
  const dir = lookDirection(yaw, pitch);
  return {
    x: head.x - dir.x * distance,
    y: head.y - dir.y * distance,
    z: head.z - dir.z * distance,
  };
}

/** Bornage du pitch (empêche de passer sous le sol ou de vriller). */
export function clampPitch(pitch) {
  return Math.min(CAMERA.pitchMax, Math.max(CAMERA.pitchMin, pitch));
}

/**
 * Vecteurs caméra : avant (direction de marche « tout droit ») et droite,
 * dans le plan XZ, pour convertir ZQSD/AWSD en déplacement monde.
 * yaw 0 → avant = (0, −1), droite = (1, 0).
 */
export function cameraBasis(yaw) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    forward: { x: -sin, z: -cos },
    right: { x: cos, z: -sin },
  };
}

/**
 * Un pas de déplacement pur.
 * @param {{x:number,z:number,vx:number,vz:number,yaw:number}} state
 * @param {{x:number,y:number,run?:boolean,cameraYaw:number}} input  x∈[−1,1] strafe, y∈[−1,1] avant
 * @param {number} dt secondes
 * @returns le même state muté (commodité : un seul objet à suivre)
 */
export function stepMovement(state, input, dt) {
  const basis = cameraBasis(input.cameraYaw);
  let dx = basis.right.x * input.x + basis.forward.x * input.y;
  let dz = basis.right.z * input.x + basis.forward.z * input.y;
  const mag = Math.hypot(dx, dz);
  const speed = input.run ? RUN_SPEED : WALK_SPEED;
  if (mag > 1e-4) {
    dx = (dx / mag) * speed;
    dz = (dz / mag) * speed;
  } else {
    dx = 0;
    dz = 0;
  }
  const t = Math.min(1, ACCEL * dt);
  state.vx += (dx - state.vx) * t;
  state.vz += (dz - state.vz) * t;
  state.x += state.vx * dt;
  state.z += state.vz * dt;
  return state;
}

/** Vitesse instantanée (magnitude de la vélocité). */
export function speedOf(state) {
  return Math.hypot(state.vx, state.vz);
}

/** Plus proche angle : avance `yaw` vers `target` au plus `rate*dt`. */
export function stepYaw(yaw, target, rate, dt) {
  let delta = ((target - yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const maxStep = rate * dt;
  if (Math.abs(delta) <= maxStep) return target;
  return yaw + Math.sign(delta) * maxStep;
}

/** Angle vers lequel un modèle se tourne pour aller de (x,z) vers le haut de l'écran marche. */
export function yawToward(fromX, fromZ, toX, toZ) {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ));
}

// ── Collisions (cercle joueur vs AABB / cercles) ────────────────────

/**
 * Collisions simples du plan XZ.
 * collider : { kind:'aabb', minX, maxX, minZ, maxZ } | { kind:'circle', x, z, r }
 * Chaque collider peut porter `solid:false` (décor traversable).
 */
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    if (c.solid === false) continue;
    if (c.kind === 'circle') {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const dist = Math.hypot(dx, dz);
      const minDist = radius + c.r;
      if (dist < minDist) {
        const nx = dist > 1e-6 ? dx / dist : 1;
        const nz = dist > 1e-6 ? dz / dist : 0;
        pos.x = c.x + nx * minDist;
        pos.z = c.z + nz * minDist;
      }
    } else {
      // Point le plus proche sur la boîte.
      const cx = Math.min(c.maxX, Math.max(c.minX, pos.x));
      const cz = Math.min(c.maxZ, Math.max(c.minZ, pos.z));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-6) {
        if (dist < radius) {
          pos.x = cx + (dx / dist) * radius;
          pos.z = cz + (dz / dist) * radius;
        }
      } else {
        // Centre à l'intérieur de la boîte : pousser par la face la plus proche.
        const pushLeft = pos.x - c.minX + radius;
        const pushRight = c.maxX - pos.x + radius;
        const pushUp = pos.z - c.minZ + radius;
        const pushDown = c.maxZ - pos.z + radius;
        const minPush = Math.min(pushLeft, pushRight, pushUp, pushDown);
        if (minPush === pushLeft) pos.x = c.minX - radius;
        else if (minPush === pushRight) pos.x = c.maxX + radius;
        else if (minPush === pushUp) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      }
    }
  }
  return pos;
}

/** État initial d'un run M0 : face au feu de cendres, dos à la caméra. */
export function createRunState(spawn = { x: 0, z: 6 }) {
  return {
    x: spawn.x,
    z: spawn.z,
    vx: 0,
    vz: 0,
    yaw: 0, // on regarde vers −Z : le feu est à l'origine
  };
}
