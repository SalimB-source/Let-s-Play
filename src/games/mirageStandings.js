// Classement de fin de course de Mirage Rush — Duel (contre les PNJ) et salons
// en ligne. Logique pure, sans React ni DOM : `node --test` l'exerce directement
// (voir tests/mirage-standings.test.js) et les écrans de résultats n'ont plus
// qu'à afficher les lignes (voir MirageScoreboard.jsx).
//
// Une « ligne » du classement décrit un cavalier :
//   { key, slot, name, isYou, tag, character, palette, finished, time, gap,
//     distance, remaining, score, status, rank }
// où `status` vaut :
//   'finished' — a franchi la ligne (`time` en secondes, `gap` = retard sur le 1er)
//   'racing'   — encore en piste dans un salon en ligne (`remaining` mètres à faire)
//   'behind'   — Duel : la course s'est arrêtée à l'arrivée du joueur, ce rival
//                n'avait pas encore franchi la ligne (`remaining` mètres à faire)
//   'offline'  — salon en ligne : plus de nouvelles depuis OFFLINE_AFTER_MS
import { DUEL_DISTANCE, DUEL_RIVALS } from './mirageRules.js';

/** Au-delà, un cavalier qui ne donne plus signe de vie est « hors ligne ». */
export const OFFLINE_AFTER_MS = 10000;

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
// `Number(null)` vaut 0 : une valeur absente ne doit pas passer pour « 0 seconde ».
const toSeconds = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value));

/** « 1ᵉʳ », « 2ᵉ », « 3ᵉ »… — même graphie que le badge de rang du HUD. */
export function rankLabel(rank) {
  const position = Math.max(1, Math.round(Number(rank) || 1));
  return position === 1 ? '1ᵉʳ' : `${position}ᵉ`;
}

/** Temps de course au dixième : 47.7 → « 0:47.7 », 61.3 → « 1:01.3 ». */
export function formatRaceTime(seconds) {
  const value = toSeconds(seconds);
  if (!Number.isFinite(value) || value < 0) return '—';
  // Travail en dixièmes entiers : 59.96 s devient « 1:00.0 », jamais « 0:60.0 ».
  const tenths = Math.round(value * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

/** Retard sur le vainqueur : 1.24 → « +1.2 s » ; au-delà d'une minute, « +1:05.3 ». */
export function formatGap(seconds) {
  const value = toSeconds(seconds);
  if (!Number.isFinite(value) || value < 0) return '';
  if (Math.round(value * 10) >= 600) return `+${formatRaceTime(value)}`;
  return `+${(Math.round(value * 10) / 10).toFixed(1)} s`;
}

/**
 * Ordre d'arrivée : les arrivés d'abord (le plus rapide en tête), puis ceux
 * qui restent en piste, le plus avancé en premier. `youLosesTies` reprend la
 * règle du calcul du rang en jeu (MirageWorld : `finishedAt <= elapsed`) : à
 * égalité, le rival devance le joueur.
 */
function compareRows(a, b, { youLosesTies = false } = {}) {
  if (a.finished !== b.finished) return a.finished ? -1 : 1;
  if (a.finished) {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    if (youLosesTies && a.isYou !== b.isYou) return a.isYou ? 1 : -1;
  } else if (a.distance !== b.distance) {
    return b.distance - a.distance;
  }
  return a.slot - b.slot;
}

/** Classe, numérote, calcule les retards et les mètres restants. */
function rankRows(rows, options) {
  const sorted = [...rows].sort((a, b) => compareRows(a, b, options));
  const winnerTime = sorted[0]?.finished && isNumber(sorted[0].time) ? sorted[0].time : null;
  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
    gap: row.finished && index > 0 && winnerTime !== null && isNumber(row.time)
      ? Math.max(0, row.time - winnerTime)
      : null,
    remaining: row.finished ? 0 : Math.max(1, Math.round(DUEL_DISTANCE - row.distance)),
  }));
}

function summarize(rows, extra = {}) {
  const you = rows.find((row) => row.isYou) || null;
  return {
    rows,
    total: rows.length,
    playerRank: you ? you.rank : 0,
    playerWon: Boolean(you && you.rank === 1),
    winner: rows[0]?.name || '',
    ...extra,
  };
}

/**
 * Classement d'un Duel, construit à partir du résultat que MirageWorld remet à
 * l'arrivée du joueur (`{ duration, score, gems, rivals: [{ id, slot, name,
 * distance, duration, ghost }] }`). La course s'arrête quand le joueur franchit
 * la ligne : les rivaux qui l'avaient déjà franchie ont un temps, les autres
 * sont classés derrière lui selon la distance qu'il leur restait à parcourir.
 */
export function buildDuelStandings(result = {}, { playerName = 'Cavalier', playerPalette = null } = {}) {
  const playerTime = isNumber(result.duration) ? result.duration : 0;
  const source = Array.isArray(result.rivals) && result.rivals.length
    ? result.rivals
    // Anciens résultats : un seul rival « de tête ».
    : [{ name: result.rivalName, duration: result.rivalDuration, distance: result.rivalDistance }];

  const rivals = source.map((rival, index) => {
    const spec = DUEL_RIVALS.find((entry) => entry.id === rival.id);
    const hasTime = isNumber(rival.duration);
    const distance = clamp(Number(rival.distance) || 0, 0, DUEL_DISTANCE);
    // Un rival à la ligne dans la toute dernière image du joueur n'a pas encore
    // son chrono : il a franchi la ligne en même temps que lui (le jeu le
    // compte devant), on lui prête donc le même temps.
    const finished = hasTime || distance >= DUEL_DISTANCE;
    const time = hasTime ? rival.duration : playerTime;
    const slot = Number(rival.slot) || index + 1;
    return {
      key: rival.id || `rival-${index}`,
      slot,
      // Les noms du jeu sont en capitales (« SAUGE ») : on affiche « Sauge ». Le
      // fantôme d'un lien de défi garde le nom de son auteur tel quel.
      name: spec && rival.name === spec.name ? spec.label : String(rival.name || spec?.label || 'Rival'),
      isYou: false,
      tag: rival.ghost ? 'FANTÔME' : null,
      character: spec ? spec.paletteIndex : slot,
      palette: null,
      finished,
      time: finished ? time : null,
      sortKey: time,
      distance: finished ? DUEL_DISTANCE : distance,
      score: null,
      status: finished ? 'finished' : 'behind',
    };
  });

  const player = {
    key: 'you',
    slot: 0,
    name: String(playerName || 'Cavalier'),
    isYou: true,
    tag: null,
    character: 0,
    palette: playerPalette,
    finished: true,
    time: playerTime,
    sortKey: playerTime,
    distance: DUEL_DISTANCE,
    score: Math.max(0, Number(result.score) || 0),
    status: 'finished',
  };

  return summarize(rankRows([player, ...rivals], { youLosesTies: true }), {
    gems: Math.max(0, Number(result.gems) || 0),
    score: player.score,
    racing: 0,
    done: true,
    confirmed: true,
  });
}

/**
 * Classement d'un salon en ligne à partir de l'état du salon.
 *
 * L'ordre d'arrivée est celui que le salon enregistre (`finished_at`, horloge
 * du salon) : c'est l'arbitre, donc le même pour tous les joueurs. Les temps
 * affichés sont les écarts à `started_at` sur cette même horloge.
 *
 * @param {object} room  salon sérialisé ({ players, started_at, … })
 * @param {object} [options]
 * @param {string} [options.meId]          identifiant du joueur local
 * @param {number} [options.now]           heure du salon estimée (ms) — sert à repérer les connexions perdues
 * @param {string} [options.myFinishedAt]  arrivée provisoire du joueur local (ISO), utilisée tant que
 *                                         le salon n'a pas enregistré la sienne (quelques centaines de ms)
 * @param {number} [options.myScore]       score final du joueur local (plus frais que la dernière position envoyée)
 */
export function buildRoomStandings(room, { meId = null, now = Date.now(), myFinishedAt = null, myScore = null } = {}) {
  const players = Array.isArray(room?.players) ? room.players : [];
  const startedMs = Date.parse(room?.started_at);

  const rows = players.map((player, index) => {
    const isYou = meId !== null && player.user_id === meId;
    const finishedIso = player.finished_at || (isYou ? myFinishedAt : null);
    const finishedMs = finishedIso ? Date.parse(finishedIso) : NaN;
    const finished = Number.isFinite(finishedMs);
    const lastSeen = Date.parse(player.last_seen);
    const offline = !finished && Number.isFinite(lastSeen) && now - lastSeen > OFFLINE_AFTER_MS;
    const slot = Number.isFinite(Number(player.slot)) ? Number(player.slot) : index;
    return {
      key: player.user_id || `player-${index}`,
      slot,
      name: String(player.name || 'Cavalier'),
      isYou,
      tag: player.is_bot ? 'IA' : null,
      character: Number(player.character ?? slot) || 0,
      palette: null,
      finished,
      time: finished && Number.isFinite(startedMs) ? Math.max(0, (finishedMs - startedMs) / 1000) : null,
      sortKey: finishedMs,
      distance: finished ? DUEL_DISTANCE : clamp(Number(player.distance) || 0, 0, DUEL_DISTANCE),
      // Le « score » d'un cavalier IA n'est qu'un dérivé de sa distance : il
      // n'a rien à voir avec les cristaux d'un joueur, on ne le met pas en regard.
      score: player.is_bot
        ? null
        : Math.max(0, isYou && isNumber(myScore) ? myScore : Number(player.score) || 0),
      status: finished ? 'finished' : offline ? 'offline' : 'racing',
    };
  });

  const ranked = rankRows(rows);
  const racing = ranked.filter((row) => row.status === 'racing').length;
  const mine = players.find((player) => meId !== null && player.user_id === meId);
  // Le salon a-t-il enregistré l'arrivée du joueur local ? Tant que non, sa ligne n'est qu'une
  // estimation et son rang peut encore bouger.
  const confirmed = Boolean(mine?.finished_at);
  return summarize(ranked, {
    racing,
    // Fini quand plus personne n'est en piste (les cavaliers hors ligne ne bloquent pas) et que
    // l'arrivée du joueur local est bien enregistrée.
    done: ranked.length > 0 && racing === 0 && (!mine || confirmed),
    confirmed,
  });
}
