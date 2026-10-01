// ════════════════════════════════════════════════════════════════════
// LA CENDRE — boucle souls (M2) : logique PURE et testable.
// Âmes → mort → bloodstain → récupération, potion de vie, repos au feu,
// niveaux de stats. Aucun rendu, aucun état globale.
// ════════════════════════════════════════════════════════════════════

export const PROGRESS = Object.freeze({
  enemySouls: 150,       // âmes par Chevalier déchu vaincu
  flaskMax: 3,           // 3 gorgées de potion de vie
  flaskHeal: 34,         // PV rendus par gorgée (« un peu de vie »)
  restRadius: 2.6,       // zone d'action autour du feu (0,0)
  stainRadius: 1.7,      // rayon de récupération du bloodstain
  baseHp: 100,
  hpPerVit: 15,          // +15 PV par Vitalité
  baseStamina: 100,
  staminaPerEnd: 10,     // +10 Endurance par niveau
  strPer: 0.12,          // +12 % dégâts par Puissance
  stats: Object.freeze(['vit', 'end', 'str']),
});

/** Libellé joueur de la fiole (HUD, toasts, écrans). */
export const POTION_LABEL = 'POTION DE VIE';

export const STAT_LABELS = Object.freeze({
  vit: 'Vitalité',
  end: 'Endurance',
  str: 'Puissance',
});

/** Progression fraîche du joueur. */
export function createProgress() {
  return {
    souls: 0,
    vit: 0,
    end: 0,
    str: 0,
    level: 0,
    flask: PROGRESS.flaskMax,
    bloodstain: null,     // { x, z, souls } ou null
    deaths: 0,
  };
}

/** Encaisser des âmes (butin d'ennemi, récupération…). */
export function gainSouls(p, n) {
  const gained = Math.max(0, Math.round(n));
  p.souls += gained;
  return gained;
}

/**
 * Mort du joueur : les âmes tombent au sol à (x,z), la flasque se
 * recharge, le compteur tombe à zéro. Mourir à nouveau AVANT la
 * récupération écrase le bloodstain — les anciennes âmes sont perdues.
 * @returns {number} âmes lâchées (0 si rien à perdre)
 */
export function die(p, x, z) {
  const dropped = p.souls;
  p.bloodstain = dropped > 0 ? { x, z, souls: dropped } : null;
  p.souls = 0;
  p.flask = PROGRESS.flaskMax;
  p.deaths += 1;
  return dropped;
}

/**
 * Récupération du bloodstain en marchant dessus.
 * @returns {number} âmes récupérées (0 si absente/trop loin)
 */
export function stainNear(p, x, z) {
  const s = p.bloodstain;
  if (!s) return 0;
  if (Math.hypot(x - s.x, z - s.z) > PROGRESS.stainRadius) return 0;
  const n = s.souls;
  p.souls += n;
  p.bloodstain = null;
  return n;
}

/** Le joueur est-il au rayon d'action du feu (0,0) ? */
export function atBonfire(x, z) {
  return Math.hypot(x, z) <= PROGRESS.restRadius;
}

/** Repos au feu : flasque remise à neuf (PV/stamina rendus par l'appelant). */
export function rest(p) {
  p.flask = PROGRESS.flaskMax;
  return true;
}

/** Une gorgée de flasque : décrémente et renvoie le soin (0 si vide). */
export function drinkFlask(p) {
  if (p.flask <= 0) return 0;
  p.flask -= 1;
  return PROGRESS.flaskHeal;
}

/** Coût du prochain niveau d'une stat (courbe croissante). */
export function levelCost(currentLevel) {
  return 60 + currentLevel * 70 + currentLevel * currentLevel * 20;
}

/**
 * Tente d'acheter un niveau de stat.
 * @returns {{ok: boolean, cost: number}} coût demandé même en échec
 */
export function tryLevelUp(p, stat) {
  if (!PROGRESS.stats.includes(stat)) return { ok: false, cost: 0 };
  const cost = levelCost(p[stat]);
  if (p.souls < cost) return { ok: false, cost };
  p.souls -= cost;
  p[stat] += 1;
  p.level += 1;
  return { ok: true, cost };
}

// ── Valeurs dérivées appliquées à l'état de combat ───────────────────
export const maxHp = (p) => PROGRESS.baseHp + p.vit * PROGRESS.hpPerVit;
export const staminaMax = (p) => PROGRESS.baseStamina + p.end * PROGRESS.staminaPerEnd;
export const strMult = (p) => 1 + p.str * PROGRESS.strPer;
