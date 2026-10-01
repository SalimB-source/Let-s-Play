import { DUEL_DISTANCE } from './mirageRules.js';

// Shareable, client-side ghost run. These links are not verified multiplayer results.
export function encodeChallenge({ seed, duration, trace, name, stage }) {
  const data = { v: 1, ...(['western', 'prairie', 'sardinia', 'alger', 'japan', 'ramparts', 'infinity', 'airbase', 'snakeway'].includes(stage) ? { stage } : {}), seed: seed >>> 0, duration: Math.round(duration * 10) / 10,
    trace: trace.map(n => Math.min(DUEL_DISTANCE, Math.round(n))), name: String(name || 'Cavalier').slice(0, 24) };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeChallenge(code) {
  try {
    if (!code || code.length > 4000 || !/^[a-zA-Z0-9_-]+$/.test(code)) return null;
    const raw = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(raw, c => c.charCodeAt(0))));
    if ((data.stage !== undefined && !['western', 'desert', 'prairie', 'sardinia', 'alger', 'japan', 'ramparts', 'infinity', 'airbase', 'snakeway'].includes(data.stage)) || data.v !== 1 || !Number.isInteger(data.seed) || data.seed < 0 || data.seed > 0xffffffff
      || !Number.isFinite(data.duration) || data.duration < 15 || data.duration > 180
      || !Array.isArray(data.trace) || data.trace.length < 2 || data.trace.length > 360
      || typeof data.name !== 'string' || data.name.length > 24 || /[<>]/.test(data.name)) return null;
    if (data.trace.some((n, i) => !Number.isInteger(n) || n < 0 || n > DUEL_DISTANCE || (i && n < data.trace[i - 1]))) return null;
    if (data.trace.at(-1) !== DUEL_DISTANCE) return null;
    return data;
  } catch { return null; }
}
