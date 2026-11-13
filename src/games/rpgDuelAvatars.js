/** Visages détourés du duel, extraits des stands canoniques du récit.
 * Le registre explicite évite de construire une URL inexistante pour un
 * personnage ajouté au récit avant que son cadrage ne soit livré. */
export const RPG_AVATARS_DUEL_IDS = Object.freeze([
  'amani', 'boualem', 'corsaire-barbe-rousse', 'corsaire-mousse',
  'corsaire-negociant', 'corsaire-rais', 'dernier-fennec', 'devoreur',
  'djinn-souk', 'feriel', 'garde-fjord', 'guetteur', 'horloger-zenith',
  'ifrit-ergs', 'mahieddine', 'maitre-hivers', 'marchand', 'meute-neiges',
  'nageuse', 'necro-chacal', 'necro-devoreuse', 'necro-ouvrier',
  'necro-peseuse', 'pecheur', 'puisatier', 'reine-etals', 'salem',
  'samurai-ashigaru', 'samurai-daimyo', 'samurai-kenshi', 'samurai-ronin',
  'scribe', 'sonneur', 'tarek', 'valkyrie-fjord', 'yamina',
]);

export function avatarDuel(id, baseUrl = '/') {
  if (!RPG_AVATARS_DUEL_IDS.includes(id)) return null;
  return `${baseUrl}sablier-story/avatars/avatar-${id}.webp?v=duel-tetes-1`;
}
