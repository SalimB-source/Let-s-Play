// Règles pures du combat tour par tour — « Le Sablier de Bab El » (concept B
// du dossier docs/rpg/).
//
// Comme pour Vice City Rush et Mirage Rush, tout ce qui décide est séparé du
// rendu : ce fichier ne connaît ni React, ni DOM, ni images. Il expose des
// fonctions qui transforment un état de combat, ce qui permet de le tester
// avec `node --test` (tests/rpg-combat.test.js) et de rejouer un combat coup
// par coup pour l'équilibrage.
//
// ── Le contrat de conception ───────────────────────────────────────────────
// **Aucune réaction en temps réel.** Pas de parade, pas d'esquive, pas de
// minutage. Le joueur contre une attaque en *choisissant*, à partir de ce que
// l'ennemi a annoncé un round à l'avance (`intent`). Quatre réponses : Garde,
// Barrage, Contre-élément, Reposition.
//
// Trois idées portent la tension :
//   1. **L'Intention** — chaque ennemi annonce son coup, sa cible, sa famille.
//   2. **Le Sable** — la moitié des PV perdus tombe au sol et peut être
//      ramassée, volée ou dépensée : les mêmes dégâts ne coûtent pas la même
//      chose à tout le monde.
//   3. **Les Étages** — on frappe mieux de haut, et tout le monde descend d'un
//      étage à chaque round. La hauteur est une ressource qui fond.

// ── Constantes de réglage ──────────────────────────────────────────────────
import { cardById, cardCost, rpgDraftOffer, RPG_BASIC_ATTACKS, RPG_BASIC_CARDS, RPG_STARTING_COLLECTION } from './rpgCards.js';
export const RPG_VERRE_MAX = 5;
export const RPG_CRISTALLISATION_COST = 3;
export const RPG_CRISTALLISATION_POWER = 2;

export const RPG_FELURE_MAX = 100;      // à 100, l'ennemi est Fêlé
export const RPG_FELURE_MULTIPLIER = 2;
export const RPG_FELURE_ON_DAMAGE = 0.1;
export const RPG_FELURE_DECAY = 25;
export const RPG_FELURE_PATIENCE = 3;
export const RPG_FELURE_COUNTER = 15;   // gagné en posant un contre-élément
export const RPG_FELURE_INTERRUPT = 25; // gagné en interrompant une incantation

export const RPG_CONSONANCE_ELEMENTS = 3;
export const RPG_CONSONANCE_MULTIPLIER = 1.5;

export const RPG_SABLE_SPILL = 0.5;     // moitié des PV perdus tombe au sol
export const RPG_SABLE_MAX = 200;       // plafond par sol
export const RPG_SABLE_POCKET = 40;     // ce qu'une Récolte ou un Souffle déplace
export const RPG_SABLE_HEAL = 0.8;      // PV rendus par point de sable récolté
export const RPG_BARRAGE_SABLE = 20;    // coût d'un barrage de verre
export const RPG_BARRAGE_BASE = 40;
export const RPG_BARRAGE_MAGIC = 1.2;

export const RPG_TIERS = 3;
export const RPG_TIER_DAMAGE = 0.15;    // +15 % de dégâts par étage au-dessus du 1er
export const RPG_TIER_TAKEN = 0.05;     // −5 % de dégâts subis par étage
export const RPG_SLIDE_PER_ROUND = 1;   // tout le monde descend d'autant chaque round
export const RPG_CHUTE_BONUS = 1.4;     // un coup qui fait tomber du 3e au 1er

export const RPG_CLOCK_INTERVAL = 5;    // rounds avant que l'Astrolabe sonne
export const RPG_CLOCK_BOSS_INTERVAL = 4;
export const RPG_CLOCK_BUFF = 0.2;      // +20 % d'Attaque ennemie
export const RPG_CLOCK_BUFF_ROUNDS = 2;

export const RPG_GUARD_REDUCTION = 0.6; // −60 % sur le prochain coup
export const RPG_GUARD_VERRE = 1;
export const RPG_COUNTER_REDUCTION = 0.5;

export const RPG_CRIT_MULTIPLIER = 1.6;
export const RPG_CRIT_CAP = 0.35;
export const RPG_CRIT_BASE = 0.05;
export const RPG_CRIT_AGI_DIVISOR = 400;
export const RPG_VARIANCE_SPREAD = 0.05;
export const RPG_HEAL_FACTOR = 1.15;
export const RPG_BACKLINE_REDUCTION = 0.75;

// ── Éléments ───────────────────────────────────────────────────────────────
// Un cycle à quatre (Braise → Souffle → Sable → Eau → Braise) et un axe à
// deux (Encre ↔ Verre, avantage dans les deux sens) : l'Encre de la Chambre
// contre le Verre des artisans.
export const RPG_ELEMENTS = ['braise', 'souffle', 'sable', 'eau', 'encre', 'verre'];
export const RPG_CYCLE = { braise: 'souffle', souffle: 'sable', sable: 'eau', eau: 'braise' };
export const RPG_AXIS = ['encre', 'verre'];
export const RPG_ADVANTAGE = 1.5;
export const RPG_WEAKNESS = 0.75;

export const RPG_ELEMENT_LABELS = {
  braise: 'Braise',
  souffle: 'Souffle',
  sable: 'Sable',
  eau: 'Eau',
  encre: 'Encre',
  verre: 'Verre',
};

/** Avantage élémentaire d'une attaque `element` contre un défenseur `target`. */
export function rpgElementMultiplier(element, target) {
  if (!element || !target || element === target) return 1;
  if (RPG_CYCLE[element] === target) return RPG_ADVANTAGE;
  if (RPG_CYCLE[target] === element) return RPG_WEAKNESS;
  if (RPG_AXIS.includes(element) && RPG_AXIS.includes(target)) return RPG_ADVANTAGE;
  return 1;
}

/** L'élément qui bat `element` dans le cycle (sert au contre-élément). */
export function rpgCounterElement(element) {
  return Object.keys(RPG_CYCLE).find((key) => RPG_CYCLE[key] === element) ?? null;
}

// ── Familles d'intention ───────────────────────────────────────────────────
// L'intention est affichée avant que l'ennemi n'agisse : la tension vient de
// ce qu'on sait, jamais de ce qu'on rate.
export const RPG_INTENT_FAMILIES = {
  lourd: { label: 'Lourd', icon: '⬇', hint: 'Un gros coup sur une cible : garde, barrage ou contre-élément.' },
  zone: { label: 'Zone', icon: '⬒', hint: 'Touche toute l’équipe : garde générale, barrage, ou le tuer avant.' },
  incantation: { label: 'Incantation', icon: '⧗', hint: 'Se charge : une attaque du bon élément l’interrompt.' },
  sablier: { label: 'Sablier', icon: '⛃', hint: 'Ramasse le sable de son sol pour se soigner : soufflez-le d’abord.' },
  soutien: { label: 'Soutien', icon: '⚑', hint: 'Renforce un allié à lui : interrompez ou changez de cible.' },
};

// ── Difficulté : de l'information, pas des réflexes ────────────────────────
export const RPG_DIFFICULTIES = {
  recit: { label: 'Récit', damage: 0.7, hidden: false },
  normale: { label: 'Normale', damage: 1, hidden: false },
  veilleur: { label: 'Veilleur', damage: 1.35, hidden: true },
};

// ── Formules ───────────────────────────────────────────────────────────────
/** Chance de critique d'un acteur, plafonnée à `RPG_CRIT_CAP`. */
export function rpgCritChance(actor) {
  const agi = Number(actor?.agi) || 0;
  return Math.min(RPG_CRIT_CAP, RPG_CRIT_BASE + agi / RPG_CRIT_AGI_DIVISOR);
}

/** Multiplicateur de hauteur : frapper de haut fait mal, être en haut protège. */
export function rpgTierMultiplier(attackerTier = 1, targetTier = 1) {
  const dealt = 1 + RPG_TIER_DAMAGE * (Math.max(1, attackerTier) - 1);
  const taken = 1 - RPG_TIER_TAKEN * (Math.max(1, targetTier) - 1);
  return dealt * taken;
}

/**
 * Formule de dégâts unique du jeu — la même pour le physique et la magie, ce
 * qui rend chaque coup prévisible : c'est le contrat de lisibilité.
 */
export function rpgComputeDamage({
  attack = 0,
  power = 100,
  defense = 0,
  element = null,
  targetElement = null,
  crit = false,
  felure = false,
  consonance = false,
  chute = false,
  variance = 1,
  backline = false,
  attackerTier = 1,
  targetTier = 1,
} = {}) {
  const base = (Number(attack) || 0) * (Number(power) || 0) / 100 - (Number(defense) || 0) * 0.5;
  let value = base;
  value *= rpgElementMultiplier(element, targetElement);
  value *= rpgTierMultiplier(attackerTier, targetTier);
  if (crit) value *= RPG_CRIT_MULTIPLIER;
  if (felure) value *= RPG_FELURE_MULTIPLIER;
  if (consonance) value *= RPG_CONSONANCE_MULTIPLIER;
  if (chute) value *= RPG_CHUTE_BONUS;
  if (backline) value *= RPG_BACKLINE_REDUCTION;
  value *= Number(variance) || 1;
  return Math.max(1, Math.round(value));
}

/** Dégâts avec l'aléa de variance (±5 %), tiré depuis `rng`. */
export function rpgVariance(rng) {
  const roll = typeof rng === 'function' ? rng() : Math.random();
  return 1 - RPG_VARIANCE_SPREAD + roll * RPG_VARIANCE_SPREAD * 2;
}

/** Quantité de soin d'une compétence. */
export function rpgComputeHeal({ magic = 0, power = 100, consonance = false } = {}) {
  let value = (Number(magic) || 0) * (Number(power) || 0) / 100 * RPG_HEAL_FACTOR;
  if (consonance) value *= RPG_CONSONANCE_MULTIPLIER;
  return Math.max(1, Math.round(value));
}

/** Ce qu'un barrage de verre peut absorber. */
export function rpgComputeShield(actor) {
  return Math.round(RPG_BARRAGE_BASE + (Number(actor?.mag) || 0) * RPG_BARRAGE_MAGIC);
}

/** PV rendus par une Récolte, à partir du sable puisé. */
export function rpgComputeRecolte(sable) {
  return Math.max(1, Math.round((Number(sable) || 0) * RPG_SABLE_HEAL));
}

// ── Progression ────────────────────────────────────────────────────────────
/** XP nécessaire pour atteindre `level` (courbe 60 × n^1,6). */
export function rpgXpForLevel(level) {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  return Math.round(60 * Math.pow(n, 1.6));
}

// Les Creux : un compagnon perdu laisse une empreinte dans le sable, qui
// profite à l'équipe pour le reste de la partie.
export const RPG_CREUX = {
  salem: { label: 'Le Creux du Sondeur', stat: 'spd', bonus: 2, text: '+2 Vitesse pour toute l’équipe.' },
  yamina: { label: 'Le Creux de l’Horlogère', stat: 'mag', bonus: 3, text: '+3 Magie pour toute l’équipe.' },
  boualem: { label: 'Le Creux du Puisatier', stat: 'def', bonus: 3, text: '+3 Défense pour toute l’équipe.' },
  tarek: { label: 'Le Creux du Porteur', stat: 'atk', bonus: 3, text: '+3 Attaque pour toute l’équipe.' },
};

/** Passifs laissés par les compagnons perdus. */
export function rpgCreuxBonuses(fallenIds = []) {
  return fallenIds.filter((id) => RPG_CREUX[id]).map((id) => ({ id, ...RPG_CREUX[id] }));
}

// ── Aléa déterministe ──────────────────────────────────────────────────────
export function rpgRng(seed = 1) {
  let a = Number(seed) >>> 0 || 1;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Création d'un combat ───────────────────────────────────────────────────
function makeActor(def, side) {
  return {
    id: def.id,
    side,
    name: def.name,
    portrait: def.portrait ?? def.id,
    role: def.role || '',
    element: def.element || null,
    level: def.level || 1,
    maxHp: def.maxHp,
    hp: def.hp ?? def.maxHp,
    atk: def.atk ?? 10,
    def: def.def ?? 8,
    mag: def.mag ?? 10,
    res: def.res ?? 8,
    spd: def.spd ?? 10,
    agi: def.agi ?? 40,
    backline: Boolean(def.backline),
    tier: def.tier ?? 1,          // étage de départ (1 = en bas)
    basicUsed: false,
    harvested: false,
    guarding: false,
    shield: 0,                    // barrage de verre en cours
    blind: 0,
    weaken: 0,
    contred: false,               // un contre-élément a cassé son élan ce round
    nameSegments: def.nameSegments ?? 3,
    skills: def.skills || [],
    moves: def.moves || [],
    phases: def.phases || [],
    phaseIndex: 0,
    felure: 0,
    felureRounds: 0,
    fele: false,
    intent: null,                 // ce que l'ennemi a annoncé
    rewards: def.rewards || null,
    alive: true,
  };
}

/** Trie les acteurs vivants (hors réserve) pour former l'anneau d'un round. */
export function rpgBuildRing(actors) {
  return actors
    .filter((actor) => actor.alive && actor.side !== 'reserve')
    .slice()
    .sort((a, b) => (b.spd - a.spd) || (a.side === b.side ? (a.id < b.id ? -1 : 1) : (a.side === 'equipe' ? -1 : 1)))
    .map((actor) => actor.id);
}

/**
 * Ouvre un combat. `party` = compagnons, `foes` = ennemis, `reserve` = le
 * banc, `seed` = graine de l'aléa (même partie à chaque exécution).
 */
export function rpgCreateBattle({
  party = [],
  foes = [],
  reserve = [],
  seed = 1,
  difficulty = 'normale',
  ambush = false,
  clockInterval = RPG_CLOCK_INTERVAL,
  collection = [...RPG_STARTING_COLLECTION],
} = {}) {
  const battle = {
    difficulty,
    seed,
    rng: rpgRng(seed),
    collection,             // le classeur : les cartes possédées
    hand: [],               // la main en combat
    graveyard: [],          // jouées ce combat
    draft: null,            // offre de draft entre les vagues
    actors: [
      ...party.map((def) => makeActor(def, 'equipe')),
      ...foes.map((def) => makeActor(def, 'ennemi')),
      ...reserve.map((def) => makeActor(def, 'reserve')),
    ],
    verre: 0,
    ground: { equipe: 0, ennemi: 0 }, // le sable tombé au sol, par camp
    round: 1,
    clock: clockInterval,
    clockInterval,
    clockStrike: 0,             // rounds restants du buff de l'Astrolabe
    ring: [],
    ringIndex: 0,
    roundElements: [],
    consonance: false,
    freeSkillFor: null,
    over: null,
    log: [],
    ambush,
  };
  battle.ring = rpgBuildRing(battle.actors);
  if (ambush) {
    const team = battle.ring.filter((id) => actorById(battle, id)?.side === 'equipe');
    battle.ring = [...team, ...battle.ring.filter((id) => !team.includes(id))];
  }
  battle.ringIndex = 0;
  for (const foe of battle.actors) {
    if (foe.side === 'ennemi') computeIntent(battle, foe);
  }
  rpgDrawCards(battle, 4);
  rpgLog(battle, 'Le cycle commence. L’Astrolabe tourne.', 'systeme');
  return battle;
}

// ── La main : piocher, lire ses cartes, drafter ────────────────────────────
/** Pioche n cartes de la collection (ni dans la main ni au cimetière). */
export function rpgDrawCards(battle, count = 1) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (battle.hand.length >= 7) break;
    const pool = battle.collection.filter((id) => !battle.hand.includes(id) && !battle.graveyard.includes(id)
      && cardById(id)?.kind !== 'creature'); // les créatures attendent le duel
    if (!pool.length) break;
    const cardId = pool[Math.floor(battle.rng() * pool.length)];
    battle.hand.push(cardId);
    drawn.push(cardId);
    rpgLog(battle, `L’équipe pioche « ${cardById(cardId)?.name ?? cardId} ».`, 'systeme');
  }
  return drawn;
}

/**
 * Ce que peut jouer un compagnon : sa carte de base (une fois par tour),
 * l'action de base « Sonder le sol » (une fois par tour), et sa main —
 * chaque carte avec son verrou de Nom et son accessibilité en sable.
 */
export function rpgPlayableCards(battle, actor) {
  if (!actor?.alive) return [];
  const cards = [];
  const basic = RPG_BASIC_ATTACKS[actor.id];
  if (basic) cards.push({ ...basic, source: 'base', used: actor.basicUsed, locked: false, affordable: !actor.basicUsed });
  for (const card of RPG_BASIC_CARDS) {
    cards.push({ ...card, source: 'base', used: actor.harvested, locked: false, affordable: !actor.harvested });
  }
  for (const id of battle.hand) {
    const card = cardById(id);
    if (!card) continue;
    const locked = (card.requiresName || 0) > (actor.nameSegments ?? 3);
    cards.push({
      ...card,
      source: 'main',
      used: false,
      locked,
      affordable: !locked && cardCost(card) <= battle.ground[actor.side],
    });
  }
  return cards;
}

/** Draft d'après vague : choisit une des trois cartes proposées. */
export function rpgDraftPick(battle, cardId) {
  if (!battle.draft?.includes(cardId) || battle.collection.includes(cardId)) return { ok: false };
  battle.collection.push(cardId);
  battle.draft = null;
  rpgLog(battle, `La collection s’enrichit de « ${cardById(cardId)?.name} ».`, 'systeme');
  return { ok: true };
}

export function actorById(battle, id) {
  return battle.actors.find((actor) => actor.id === id) || null;
}

export function rpgLog(battle, text, tone = 'info') {
  battle.log.push({ text, tone });
  return text;
}

/** Ajoute une vague d'ennemis en cours de combat. */
export function rpgAddFoes(battle, foes = []) {
  const added = foes.map((def) => makeActor(def, 'ennemi'));
  battle.actors.push(...added);
  for (const foe of added) computeIntent(battle, foe);
  battle.ring = rpgBuildRing(battle.actors);
  battle.ringIndex = 0;
  return added;
}

// ── Anneau d'ordre ─────────────────────────────────────────────────────────
/** Les `depth` prochains acteurs, rounds suivants compris. */
export function rpgTurnRing(battle, depth = 8) {
  const order = rpgBuildRing(battle.actors);
  if (!order.length) return [];
  const sequence = order.slice(battle.ringIndex);
  while (sequence.length < depth) sequence.push(...order);
  return sequence.slice(0, depth).map((id) => actorById(battle, id)).filter(Boolean);
}

/** L'acteur dont c'est le tour (null si le combat est fini). */
export function rpgCurrentActor(battle) {
  if (battle.over) return null;
  if (!battle.actors.some((actor) => actor.alive && actor.side !== 'reserve')) return null;
  let guard = 0;
  while (battle.ringIndex < battle.ring.length) {
    const actor = actorById(battle, battle.ring[battle.ringIndex]);
    if (actor?.alive) return actor;
    battle.ringIndex += 1;
    guard += 1;
    if (guard > 64) break;
  }
  nextRound(battle);
  return rpgCurrentActor(battle);
}

function nextRound(battle) {
  battle.round += 1;
  battle.ring = rpgBuildRing(battle.actors);
  battle.ringIndex = 0;
  battle.roundElements = [];
  battle.consonance = false;
  for (const actor of battle.actors) {
    if (!actor.alive) continue;
    actor.guarding = false;
    actor.contred = false;
    if (actor.blind > 0) actor.blind -= 1;
    if (actor.weaken > 0) actor.weaken -= 1;
    // La ville glisse : tout le monde descend d'un étage.
    actor.tier = Math.max(1, actor.tier - RPG_SLIDE_PER_ROUND);
    if (actor.fele) {
      actor.fele = false;
    } else if (actor.side === 'ennemi' && actor.felure > 0) {
      actor.felureRounds += 1;
      if (actor.felureRounds >= RPG_FELURE_PATIENCE) {
        actor.felure = Math.max(0, actor.felure - RPG_FELURE_DECAY);
        actor.felureRounds = 0;
      }
    }
  }
  // L'Astrolabe : quand il sonne, les ennemis frappent plus fort et tout le
  // monde descend d'un étage de plus.
  battle.clock -= 1;
  if (battle.clock <= 0) {
    battle.clock = battle.clockInterval;
    battle.clockStrike = RPG_CLOCK_BUFF_ROUNDS;
    for (const actor of battle.actors) {
      if (actor.alive) actor.tier = Math.max(1, actor.tier - 1);
    }
    rpgLog(battle, `L’ASTROLABE SONNE — les ennemis frappent +${Math.round(RPG_CLOCK_BUFF * 100)} % et tout le monde descend.`, 'horloge');
  } else if (battle.clockStrike > 0) {
    battle.clockStrike -= 1;
  }
  // Les ennemis annoncent leur prochain coup : c'est ce que le joueur lira.
  // Un coup retardé reprend sa place ici, un round plus tard.
  for (const foe of battle.actors) {
    if (foe.side !== 'ennemi' || !foe.alive || foe.fele) continue;
    if (foe.delayed) {
      foe.intent = foe.delayed;
      foe.delayed = null;
      continue;
    }
    computeIntent(battle, foe);
  }
  rpgLog(battle, `Round ${battle.round}.`, 'systeme');
}

/** Clôt le tour de l'acteur courant. */
export function rpgEndTurn(battle) {
  const done = rpgCurrentActor(battle);
  if (done?.side === 'equipe') {
    done.basicUsed = false;
    done.harvested = false;
  }
  battle.ringIndex += 1;
  if (battle.ringIndex >= battle.ring.length) nextRound(battle);
  const next = rpgCurrentActor(battle);
  if (next?.side === 'equipe') rpgDrawCards(battle, 1);
  return next;
}

// ── Intention ennemie ──────────────────────────────────────────────────────
/**
 * Choisit et annonce le prochain coup d'un ennemi. `move.family` décide la
 * famille annoncée ; les règles d'instinct pondèrent le choix (soigner un
 * allié bas, ramasser le sable disponible…).
 */
export function computeIntent(battle, actor) {
  const moves = (actor.moves || []).filter((move) => !move.phase || move.phase === actor.phaseIndex + 1);
  const team = battle.actors.filter((a) => a.alive && a.side === 'equipe');
  if (!moves.length || !team.length) {
    actor.intent = null;
    return null;
  }
  const woundedAlly = battle.actors.find((a) => a.alive && a.side === 'ennemi' && a.hp / a.maxHp < 0.3);
  let chosen = moves[0];
  let best = -Infinity;
  for (const move of moves) {
    let weight = move.weight ?? 1;
    if (move.heal && woundedAlly) weight *= 6;
    if (move.heal && !woundedAlly) weight *= 0.15;
    if (move.family === 'sablier' && battle.ground.ennemi < 20) weight *= 0.1;
    const score = weight * (0.75 + battle.rng() * 0.5);
    if (score > best) {
      best = score;
      chosen = move;
    }
  }
  const pool = chosen.acharne ? team.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp) : team;
  const target = pool[Math.floor(battle.rng() * pool.length)] ?? team[0];
  actor.intent = {
    moveId: chosen.id,
    label: chosen.label,
    family: chosen.family || 'lourd',
    element: chosen.element ?? actor.element,
    power: chosen.power ?? 0,
    kind: chosen.kind || 'physique',
    targetId: chosen.family === 'zone' ? null : target.id,
    counterElement: chosen.counterElement ?? rpgCounterElement(chosen.element ?? actor.element),
  };
  return actor.intent;
}

/** Estimation des dégâts annoncés (affichée sur la fiche de l'ennemi). */
export function rpgEstimateIntent(battle, actor, target) {
  const intent = actor?.intent;
  if (!intent || !intent.power) return 0;
  const attack = intent.kind === 'magie' ? actor.mag : actor.atk;
  const defense = intent.kind === 'magie' ? (target?.res ?? 0) : (target?.def ?? 0);
  const strike = battle.clockStrike > 0 ? 1 + RPG_CLOCK_BUFF : 1;
  return rpgComputeDamage({
    attack,
    power: intent.power,
    defense,
    element: intent.element,
    targetElement: target?.element,
    attackerTier: actor.tier,
    targetTier: target?.tier ?? 1,
  }) * strike * (RPG_DIFFICULTIES[battle.difficulty]?.damage ?? 1);
}

// ── Compétences ────────────────────────────────────────────────────────────
/** Compétences utilisables, avec l'état de verrouillage par le Nom. */


function spendVerre(battle, amount) {
  battle.verre = Math.max(0, Math.min(RPG_VERRE_MAX, battle.verre - amount));
}

function gainVerre(battle, amount) {
  const before = battle.verre;
  battle.verre = Math.max(0, Math.min(RPG_VERRE_MAX, battle.verre + amount));
  return battle.verre - before;
}

function addGround(battle, side, amount) {
  battle.ground[side] = Math.max(0, Math.min(RPG_SABLE_MAX, battle.ground[side] + amount));
}

/**
 * Applique des dégâts : contre-élément posé, garde, barrage de verre, puis
 * PV. Le sable arraché tombe sur le sol de la victime.
 */
export function rpgDealDamage(battle, target, amount, { source = null } = {}) {
  if (!target?.alive) return 0;
  let value = Math.max(1, Math.round(amount));
  if (source?.contred) value = Math.max(1, Math.round(value * RPG_COUNTER_REDUCTION));
  if (source?.blind > 0) value = Math.max(1, Math.round(value * 0.75));
  if (target.guarding) value = Math.max(1, Math.round(value * (1 - RPG_GUARD_REDUCTION)));
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, value);
    target.shield -= absorbed;
    value -= absorbed;
    rpgLog(battle, `Le barrage de ${target.name} absorbe ${absorbed}.`, 'barrage');
    if (value <= 0) return 0;
  }
  const before = target.hp;
  target.hp = Math.max(0, target.hp - value);
  const lost = before - target.hp;
  if (lost > 0) addGround(battle, target.side, Math.round(lost * RPG_SABLE_SPILL));
  if (target.side === 'ennemi' && lost > 0) {
    target.felure = Math.min(RPG_FELURE_MAX, target.felure + Math.round(lost * RPG_FELURE_ON_DAMAGE));
    if (target.felure >= RPG_FELURE_MAX && !target.fele) {
      target.fele = true;
      target.felureRounds = 0;
      battle.freeSkillFor = target.id;
      rpgLog(battle, `${target.name} est FÊLÉ : il n’agira pas et subira le double.`, 'felure');
    }
  }
  if (target.hp <= 0) {
    target.alive = false;
    target.intent = null;
    rpgLog(battle, `${target.name} tombe.`, target.side === 'equipe' ? 'perte' : 'victoire');
    rpgCheckEnd(battle);
  }
  return lost;
}

/** Enregistre l'élément joué ; le troisième élément distinct donne la Consonance. */
function registerElement(battle, element) {
  if (!element || !battle.roundElements.includes(element)) battle.roundElements.push(element);
  if (battle.roundElements.length >= RPG_CONSONANCE_ELEMENTS) {
    battle.consonance = true;
    battle.roundElements = [];
    gainVerre(battle, 1);
    rpgLog(battle, 'CONSONANCE — trois éléments accordés : les prochains coups frappent ×1,5.', 'consonance');
  }
}

/** Cibles d'une compétence (mono, zone, alliés, soi). */
export function resolveTargets(battle, actor, skill, targetId) {
  const foes = battle.actors.filter((a) => a.alive && a.side === 'ennemi');
  const team = battle.actors.filter((a) => a.alive && a.side === 'equipe');
  const scope = skill.target || 'ennemi';
  if (scope === 'soi') return [actor];
  if (scope === 'tous-ennemis') return foes;
  if (scope === 'tous-allies') return team;
  if (scope === 'allie') {
    const ally = actorById(battle, targetId);
    return [ally?.alive && ally.side === 'equipe' ? ally : team.find((a) => a.hp < a.maxHp) ?? actor];
  }
  const chosen = actorById(battle, targetId);
  if (chosen?.alive && chosen.side === 'ennemi') return [chosen];
  return foes.slice(0, 1);
}

/**
 * Fait agir un acteur. Retourne `{ ok, events }` ; refuse sans effet si
 * l'action est illégale (PA, sable, Nom verrouillé).
 */
/**
 * Joue une carte : carte de base (une fois par tour), « Sonder le sol »
 * (une fois par tour), ou pouvoir depuis la main (payé en sable, puis au
 * cimetière). Les éphémères peuvent aussi répondre pendant le tour ennemi.
 */
export function rpgPlayCard(battle, { actorId, cardId, targetId = null, crystallize = false } = {}) {
  const actor = actorById(battle, actorId);
  const card = cardById(cardId);
  if (!actor?.alive || !card) return { ok: false, reason: 'introuvable', events: [] };
  const current = rpgCurrentActor(battle);
  const ownTurn = current?.id === actor.id && current.side === 'equipe';

  if ((card.requiresName || 0) > (actor.nameSegments ?? 3)) return { ok: false, reason: 'nom-verrouille', events: [] };

  if (card.basic) {
    if (!ownTurn || actor.basicUsed) return { ok: false, reason: 'deja-jouee', events: [] };
    actor.basicUsed = true;
    return applyCardEffect(battle, actor, card, targetId, crystallize);
  }
  if (card.effect === 'sonder') {
    if (!ownTurn || actor.harvested) return { ok: false, reason: 'deja-jouee', events: [] };
    actor.harvested = true;
    addGround(battle, 'equipe', 20);
    rpgLog(battle, `${actor.name} sonde le sol : +20 sable sur notre sol.`, 'sable');
    return { ok: true, events: [{ type: 'sable', amount: 20 }] };
  }

  if (!battle.hand.includes(card.id)) return { ok: false, reason: 'pas-en-main', events: [] };
  if (!ownTurn && !card.instant) return { ok: false, reason: 'pas-instant', events: [] };

  const cost = cardCost(card);
  if (cost > battle.ground[actor.side]) return { ok: false, reason: 'sable-insuffisant', events: [] };
  if (crystallize && battle.verre < RPG_CRISTALLISATION_COST) return { ok: false, reason: 'verre-insuffisant', events: [] };

  battle.hand.splice(battle.hand.indexOf(card.id), 1);
  battle.graveyard.push(card.id);
  if (cost) addGround(battle, actor.side, -cost);
  if (crystallize) spendVerre(battle, RPG_CRISTALLISATION_COST);
  rpgLog(battle, `${actor.name} pose la carte « ${card.name} »${cost ? ` — ${cost} sable` : ''}.`, 'systeme');

  if (card.effect === 'garde') return rpgGuard(battle, actor.id);
  if (card.effect === 'barrage') return rpgBarrage(battle, actor.id, targetId);
  if (card.effect === 'recolte') return rpgRecolte(battle, actor.id, targetId);
  if (card.effect === 'souffle') return rpgSouffle(battle, actor.id);
  if (card.effect === 'reposition') return rpgReposition(battle, actor.id, targetId);
  return applyCardEffect(battle, actor, card, targetId, crystallize);
}

/** Résout l'effet d'une carte d'attaque / soin / statut une fois payée. */
function applyCardEffect(battle, actor, skill, targetId, crystallize = false) {
  const free = battle.freeSkillFor && targetId === battle.freeSkillFor;
  if (free) {
    battle.freeSkillFor = null;
    rpgLog(battle, `La Fêlure rend le coup gratuit.`, 'felure');
  }

  const events = [];
  const targets = resolveTargets(battle, actor, skill, targetId);
  const power = (crystallize ? (skill.crystallizePower ?? skill.power * RPG_CRISTALLISATION_POWER) : skill.power) || 0;

  // Interruption : une incantation annoncée tombe si l'élément est le bon.
  if (skill.interrupt) {
    for (const foe of battle.actors) {
      if (foe.side !== 'ennemi' || !foe.alive || !foe.intent) continue;
      if (foe.intent.family !== 'incantation') continue;
      if (foe.intent.counterElement !== skill.element) continue;
      foe.intent = null;
      foe.felure = Math.min(RPG_FELURE_MAX, foe.felure + RPG_FELURE_INTERRUPT);
      rpgLog(battle, `${actor.name} interrompt ${foe.label ?? foe.name} : l’incantation retombe (+${RPG_FELURE_INTERRUPT} Fêlure).`, 'interruption');
      events.push({ type: 'interruption', targetId: foe.id });
    }
  }

  // Contre-élément : frapper un ennemi avec l'élément qui bat celui de son
  // coup annoncé casse son élan pour ce round.
  for (const target of targets) {
    if (target.side !== 'ennemi' || !target.intent?.element || !skill.element) continue;
    if (rpgElementMultiplier(skill.element, target.intent.element) > 1 && !target.contred) {
      target.contred = true;
      target.felure = Math.min(RPG_FELURE_MAX, target.felure + RPG_FELURE_COUNTER);
      gainVerre(battle, 1);
      rpgLog(battle, `CONTRE-ÉLÉMENT de ${actor.name} : ${target.name} frappera deux fois moins fort (+${RPG_FELURE_COUNTER} Fêlure, +1 Verre).`, 'contre');
      events.push({ type: 'contre', targetId: target.id });
    }
  }

  for (const target of targets) {
    if (skill.kind === 'soin') {
      const healed = Math.min(target.maxHp - target.hp, rpgComputeHeal({ magic: actor.mag, power, consonance: battle.consonance }));
      target.hp += healed;
      rpgLog(battle, `${actor.name} soigne ${target.name} de ${healed} PV.`, 'soin');
      events.push({ type: 'soin', targetId: target.id, amount: healed });
      continue;
    }
    if (!power) continue; // compétence de statut pur

    const attack = skill.kind === 'magie' ? actor.mag * (actor.weaken > 0 ? 0.75 : 1) : actor.atk;
    const defense = skill.kind === 'magie' ? target.res : target.def;
    const tierBefore = target.tier;
    const crit = battle.rng() < rpgCritChance(actor);
    const damage = rpgComputeDamage({
      attack,
      power,
      defense,
      element: skill.element,
      targetElement: target.element,
      crit,
      felure: target.fele,
      consonance: battle.consonance,
      variance: rpgVariance(battle.rng),
      backline: target.backline && skill.kind === 'physique',
      attackerTier: actor.tier,
      targetTier: target.tier,
    });
    // Le déplacement se résout avant les dégâts : une chute du 3e au 1er
    // étage frappe plus fort que le coup qui l'a provoquée.
    if (skill.push && target.alive) {
      target.tier = Math.max(1, target.tier - skill.push);
    }
    const chute = Boolean(skill.push) && tierBefore === RPG_TIERS && target.tier === 1;
    const finalDamage = chute ? Math.round(damage * RPG_CHUTE_BONUS) : damage;
    const lost = rpgDealDamage(battle, target, finalDamage, { source: actor });
    const extraFelure = crystallize ? (skill.crystallizeFelure ?? 0) : (skill.felure || 0);
    if (extraFelure && target.alive && target.side === 'ennemi') {
      target.felure = Math.min(RPG_FELURE_MAX, target.felure + extraFelure);
      if (target.felure >= RPG_FELURE_MAX && !target.fele) {
        target.fele = true;
        battle.freeSkillFor = target.id;
        rpgLog(battle, `${target.name} est FÊLÉ.`, 'felure');
      }
    }
    if (skill.blind && target.alive) target.blind = 2;
    if (skill.weaken && target.alive) target.weaken = 2;
    if (skill.drain) {
      const heal = Math.round(lost * skill.drain);
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      rpgLog(battle, `${actor.name} absorbe ${heal} PV.`, 'soin');
    }
    if (skill.selfDamage) actor.hp = Math.max(1, actor.hp - Math.round(actor.maxHp * skill.selfDamage));
    if (skill.climb && target.alive) target.tier = Math.min(RPG_TIERS, target.tier + skill.climb);
    rpgLog(
      battle,
      `${actor.name} — ${skill.name}${crystallize ? ' (CRISTALLISÉ)' : ''} sur ${target.name} : ${lost} dégâts`
      + `${crit ? ' (critique !)' : ''}${chute ? ' (CHUTE ×1,4)' : ''}`
      + `${rpgElementMultiplier(skill.element, target.element) > 1 ? ' — avantage' : ''}.`,
      crit ? 'critique' : 'info',
    );
    events.push({ type: 'degats', targetId: target.id, amount: lost, crit, chute, element: skill.element });
  }

  if (skill.element) registerElement(battle, skill.element);
  if (skill.ground) addGround(battle, actor.side, skill.ground);
  if (skill.shield) {
    const shield = rpgComputeShield(actor);
    targets[0].shield += shield;
    rpgLog(battle, `${targets[0].name} reçoit un barrage de ${shield}.`, 'barrage');
  }
  if (skill.draw) {
    const drawn = rpgDrawCards(battle, skill.draw);
    rpgLog(battle, `${actor.name} pioche ${drawn.length} carte(s).`, 'statut');
  }
  if (skill.delay) {
    const foe = targets.find((t) => t.side === 'ennemi');
    if (foe?.intent) {
      const saved = foe.intent;
      foe.intent = null;
      foe.delayed = saved;
      rpgLog(battle, `${foe.name} est retardé d’un round : ${saved.label} attendra.`, 'statut');
    }
  }
  return { ok: true, events, crystallize };
}

// ── Les quatre réponses ────────────────────────────────────────────────────
/** Garde (carte éphémère) : −60 % sur le prochain coup, +1 Verre si cible annoncée. */
export function rpgGuard(battle, actorId) {
  const actor = actorById(battle, actorId);
  if (!actor?.alive) return { ok: false };
  actor.guarding = true;
  const vise = battle.actors.some(
    (foe) => foe.side === 'ennemi' && foe.alive && foe.intent?.targetId === actor.id,
  );
  if (vise) {
    gainVerre(battle, RPG_GUARD_VERRE);
    rpgLog(battle, `${actor.name} se met en garde face au coup annoncé : +1 Verre.`, 'statut');
  } else {
    rpgLog(battle, `${actor.name} se met en garde.`, 'statut');
  }
  return { ok: true, vise };
}

/** Barrage de verre (carte) : absorbe avant les PV. Le sable est le coût de la carte. */
export function rpgBarrage(battle, actorId, targetId = null) {
  const actor = actorById(battle, actorId);
  if (!actor?.alive) return { ok: false };
  const ally = actorById(battle, targetId);
  const target = ally?.alive && ally.side === 'equipe' ? ally : actor;
  target.shield += rpgComputeShield(actor);
  rpgLog(battle, `${actor.name} souffle un barrage de verre pour ${target.name} (${target.shield}).`, 'barrage');
  return { ok: true, target: target.id };
}

/** Récolte (carte) : convertit jusqu'à 40 sable du sol en soins. */
export function rpgRecolte(battle, actorId, targetId = null) {
  const actor = actorById(battle, actorId);
  if (!actor?.alive) return { ok: false };
  if (battle.ground[actor.side] < 1) return { ok: false, reason: 'sable-insuffisant' };
  const ally = actorById(battle, targetId);
  const target = ally?.alive && ally.side === 'equipe' ? ally : actor;
  const taken = Math.min(RPG_SABLE_POCKET, battle.ground[actor.side]);
  const heal = Math.min(target.maxHp - target.hp, rpgComputeRecolte(taken));
  addGround(battle, actor.side, -taken);
  target.hp += heal;
  rpgLog(battle, `${actor.name} récolte ${taken} sable et rend ${heal} PV à ${target.name}.`, 'soin');
  return { ok: true, heal, taken };
}

/** Souffle (carte) : retire du sable du sol ennemi et en récupère la moitié. */
export function rpgSouffle(battle, actorId) {
  const actor = actorById(battle, actorId);
  if (!actor?.alive) return { ok: false };
  const ennemi = battle.ground.ennemi;
  const equipe = battle.ground.equipe;
  const other = actor.side === 'ennemi' ? 'equipe' : 'ennemi';
  const taken = Math.min(RPG_SABLE_POCKET, battle.ground[other]);
  if (taken < 1) return { ok: false, reason: 'sable-insuffisant' };
  addGround(battle, other, -taken);
  addGround(battle, actor.side, Math.floor(taken / 2));
  rpgLog(battle, `${actor.name} souffle ${taken} sable du sol adverse (avant : ${ennemi} / ${equipe}).`, 'sable');
  return { ok: true, taken };
}

/** Reposition (carte) : fait monter d'un étage (soi ou un allié). */
export function rpgReposition(battle, actorId, targetId = null) {
  const actor = actorById(battle, actorId);
  if (!actor?.alive) return { ok: false };
  const ally = actorById(battle, targetId);
  const target = ally?.alive && ally.side === 'equipe' ? ally : actor;
  if (target.tier >= RPG_TIERS) return { ok: false, reason: 'etage-max' };
  target.tier += 1;
  rpgLog(battle, `${target.name} monte à l’étage ${target.tier}.`, 'statut');
  return { ok: true, tier: target.tier };
}

/** Permutation avec la réserve : coûte le tour de celui qui entre. */
export function rpgSwap(battle, outId, inId) {
  const out = actorById(battle, outId);
  const incoming = actorById(battle, inId);
  if (!out?.alive || !incoming || incoming.side !== 'reserve') return { ok: false };
  out.side = 'reserve';
  incoming.side = 'equipe';
  battle.ring = rpgBuildRing(battle.actors);
  rpgLog(battle, `${incoming.name} prend la place de ${out.name}.`, 'systeme');
  return { ok: true };
}

// ── Tour de l'ennemi : il exécute ce qu'il a annoncé ───────────────────────
export function rpgEnemyTurn(battle) {
  const actor = rpgCurrentActor(battle);
  if (!actor || actor.side !== 'ennemi') return { acted: false };

  // Phase de boss : le seuil franchi change ses coups et raccourcit l'horloge.
  const phase = actor.phases[actor.phaseIndex];
  if (phase && actor.hp / actor.maxHp <= phase.threshold) {
    actor.phaseIndex += 1;
    if (phase.clockInterval) battle.clockInterval = phase.clockInterval;
    rpgLog(battle, phase.label, 'phase');
  }

  // Un ennemi retardé par l'Horlogère perd son tour : son coup repart au
  // round suivant (c'est `nextRound` qui le remet dans ses intentions).
  if (!actor.intent && actor.delayed) {
    rpgLog(battle, `${actor.name} est en retard : ${actor.delayed.label} attendra le prochain round.`, 'statut');
    rpgEndTurn(battle);
    return { acted: true, skipped: true };
  }

  if (actor.fele) {
    rpgLog(battle, `${actor.name} est Fêlé : il perd son tour.`, 'felure');
    rpgEndTurn(battle);
    return { acted: true, skipped: true };
  }

  const intent = actor.intent;
  if (!intent) {
    rpgEndTurn(battle);
    return { acted: true, skipped: true };
  }
  actor.intent = null;
  rpgLog(battle, `${actor.name} pose la carte « ${intent.label} ».`, 'ennemi');

  const team = battle.actors.filter((a) => a.alive && a.side === 'equipe');
  const strike = battle.clockStrike > 0 ? 1 + RPG_CLOCK_BUFF : 1;
  const difficultyDamage = RPG_DIFFICULTIES[battle.difficulty]?.damage ?? 1;

  // ⛃ Sablier : il se soigne avec le sable tombé de son côté.
  if (intent.family === 'sablier') {
    const taken = Math.min(RPG_SABLE_POCKET, battle.ground.ennemi);
    const heal = Math.min(actor.maxHp - actor.hp, rpgComputeRecolte(taken));
    addGround(battle, 'ennemi', -taken);
    actor.hp += heal;
    rpgLog(battle, `${actor.name} ramasse ${taken} sable et se répare de ${heal} PV.`, 'soin');
    rpgEndTurn(battle);
    return { acted: true, intent };
  }

  // ⚑ Soutien : il renforce un allié.
  if (intent.family === 'soutien') {
    const ally = battle.actors.filter((a) => a.alive && a.side === 'ennemi').sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? actor;
    ally.atk = Math.round(ally.atk * 1.2);
    ally.tier = Math.min(RPG_TIERS, ally.tier + 1);
    rpgLog(battle, `${actor.name} — ${intent.label} : ${ally.name} frappe plus fort et gagne un étage.`, 'statut');
    rpgEndTurn(battle);
    return { acted: true, intent };
  }

  if (!team.length) {
    rpgEndTurn(battle);
    return { acted: true, intent };
  }

  // ⬇ Lourd et ⬒ Zone : le coup annoncé tombe.
  const targets = intent.family === 'zone'
    ? team
    : [actorById(battle, intent.targetId)].filter((a) => a?.alive);
  const finalTargets = targets.length ? targets : team.slice(0, 1);

  for (const target of finalTargets) {
    const attack = intent.kind === 'magie' ? actor.mag : actor.atk;
    const defense = intent.kind === 'magie' ? target.res : target.def;
    const damage = rpgComputeDamage({
      attack,
      power: intent.power,
      defense,
      element: intent.element,
      targetElement: target.element,
      crit: battle.rng() < rpgCritChance(actor),
      variance: rpgVariance(battle.rng),
      attackerTier: actor.tier,
      targetTier: target.tier,
    }) * strike * difficultyDamage;
    const lost = rpgDealDamage(battle, target, damage, { source: actor });
    rpgLog(battle, `${actor.name} — ${intent.label} sur ${target.name} : ${lost} dégâts.`, 'degats');
  }

  // L'ennemi annonce déjà son prochain coup : le joueur le verra au round suivant.
  if (actor.alive) computeIntent(battle, actor);
  rpgEndTurn(battle);
  return { acted: true, intent };
}

// ── Fin de combat ──────────────────────────────────────────────────────────
export function rpgCheckEnd(battle) {
  if (battle.over) return battle.over;
  const team = battle.actors.filter((a) => a.side === 'equipe');
  const foes = battle.actors.filter((a) => a.side === 'ennemi');
  if (!foes.some((a) => a.alive)) {
    battle.over = 'victoire';
    rpgLog(battle, 'Le cycle est tenu.', 'victoire');
  } else if (!team.some((a) => a.alive)) {
    battle.over = 'defaite';
    rpgLog(battle, 'L’équipe tombe. Le sable monte d’un cran.', 'perte');
  }
  return battle.over;
}

/** Récompenses des ennemis du combat. */
export function rpgRewards(battle) {
  const gains = battle.actors
    .filter((a) => a.side === 'ennemi')
    .reduce((acc, foe) => ({
      xp: acc.xp + (foe.rewards?.xp ?? 40),
      sable: acc.sable + (foe.rewards?.sable ?? 25),
      registres: acc.registres + (foe.rewards?.registres ?? 0),
    }), { xp: 0, sable: 0, registres: 0 });
  // La progression passe par le classeur : chaque vague offre un draft
  // (tiré une seule fois, puis conservé tant qu'on n'a pas choisi).
  if (!battle.draftOffered) {
    battle.draftOffered = true;
    battle.draft = rpgDraftOffer(battle.rng, battle.collection);
  }
  gains.draft = battle.draft;
  return gains;
}

/** Barre de Fêlure normalisée (0 → 1) pour l'affichage. */
export function rpgFelureRatio(actor) {
  if (!actor) return 0;
  return Math.max(0, Math.min(1, actor.felure / RPG_FELURE_MAX));
}
