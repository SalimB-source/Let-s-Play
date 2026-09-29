import { supabase } from '../lib/supabase';

export const roomsAvailable = () => Boolean(supabase);

export async function roomAction(action, code = null, extras = {}) {
  if (!supabase) throw new Error('Les salons nécessitent Supabase et un compte connecté.');
  const { data, error } = await supabase.rpc('mirage_room_action', {
    p_action: action, p_code: code, ...extras,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Salons indisponibles : installe supabase/mirage-rooms.sql dans Supabase.');
    }
    throw new Error(error.message || 'Impossible de joindre le salon.');
  }
  return data;
}

export function roomCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8);
}

// Estimate server time from each round-trip instead of trusting local clock.
export function serverOffset(room, requestStart, requestEnd) {
  return Date.parse(room.server_now) - (requestStart + requestEnd) / 2;
}
