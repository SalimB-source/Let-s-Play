/**
 * Bibliothèque de jeux — consoles & jeux testés.
 * ------------------------------------------------
 * Données partagées entre le hub joueur (src/pages/Auth.jsx : sélection des
 * consoles possédées, recherche dans le catalogue des jeux testés) et la
 * page de profil (src/pages/Profile.jsx : affichage public de la sélection).
 *
 * Stockage : la sélection vit dans les métadonnées du compte
 * (`user_metadata.platforms` / `user_metadata.testedGames`) pour un compte
 * réel, dans le profil de la persona pour l'aperçu démo, et est poussée
 * (best-effort) vers les colonnes publiques `profiles.platforms` /
 * `profiles.tested_games` — voir supabase/schema.sql (section 3b2) et
 * `syncSupabaseProfileAndComments` dans src/lib/comments.js.
 */

/**
 * Consoles proposées à la cocher dans le hub. `id` est la valeur stockée dans
 * le profil — le même court nom que la communauté de démonstration utilise
 * déjà — ; `label` est le nom complet affiché sur la carte d'option.
 */
export const CONSOLE_OPTIONS = [
  { id: 'PS5', label: 'PlayStation 5' },
  { id: 'PS4', label: 'PlayStation 4' },
  { id: 'XBOX SERIES X', label: 'Xbox Series X' },
  { id: 'XBOX ONE', label: 'Xbox One' },
  { id: 'SWITCH 2', label: 'Nintendo Switch 2' },
  { id: 'SWITCH', label: 'Nintendo Switch' },
  { id: 'PC', label: 'PC' },
];

// Alias déjà présents dans la communauté scriptée (roster démo, personas) :
// ramenés à l'identifiant canonique avant de pré-remplir la sélection.
const CONSOLE_ALIASES = {
  'PC STEAM': 'PC',
  'STEAM': 'PC',
  'NINTENDO SWITCH': 'SWITCH',
  'NINTENDO SWITCH 2': 'SWITCH 2',
};

/** Ramène une valeur stockée à l'identifiant canonique (ou la laisse telle quelle). */
export function normalizePlatform(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (CONSOLE_ALIASES[upper]) return CONSOLE_ALIASES[upper];
  if (CONSOLE_OPTIONS.some((option) => option.id === upper)) return upper;
  return trimmed;
}

/** Liste de consoles nettoyée : canonique, sans doublon, ordre conservé. */
export function normalizePlatforms(values) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const normalized = normalizePlatform(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/** Plafond de jeux testés par profil (la liste vit dans les métadonnées). */
export const MAX_TESTED_GAMES = 30;

/**
 * Catalogue des jeux parus sur PS5 et/ou Xbox Series X proposés à la ligne
 * « jeux testés ». `platforms` utilise les identifiants canoniques de
 * CONSOLE_OPTIONS. Ordre volontairement éditorial (pas alphabétique).
 */
export const TESTED_GAMES_CATALOG = [
  { id: 'gtav6', title: 'Grand Theft Auto VI', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'gtav', title: 'Grand Theft Auto V', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'elden-ring', title: 'Elden Ring', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'elden-ring-sote', title: 'Elden Ring: Shadow of the Erdtree', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'god-of-war-ragnarok', title: 'God of War Ragnarök', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'spider-man-2', title: "Marvel's Spider-Man 2", platforms: ['PS5'] },
  { id: 'spider-man-remastered', title: "Marvel's Spider-Man Remastered", platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'hogwarts-legacy', title: 'Hogwarts Legacy', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 're4', title: 'Resident Evil 4 Remake', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 're2', title: 'Resident Evil 2 Remake', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 're3', title: 'Resident Evil 3 Remake', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'alan-wake-2', title: 'Alan Wake 2', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'alan-wake-an', title: "Alan Wake's American Nightmare", platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'hellblade-2', title: "Senua's Saga: Hellblade II", platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'jedi-survivor', title: 'Star Wars Jedi: Survivor', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'star-wars-outlaws', title: 'Star Wars Outlaws', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'death-stranding-dc', title: "Death Stranding Director's Cut", platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'ghost-of-tsushima', title: 'Ghost of Tsushima', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'rift-apart', title: 'Ratchet & Clank: Rift Apart', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'horizon-fw', title: 'Horizon Forbidden West', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'demon-souls', title: "Demon's Souls", platforms: ['PS5'] },
  { id: 'returnal', title: 'Returnal', platforms: ['PS5'] },
  { id: 'gran-turismo-7', title: 'Gran Turismo 7', platforms: ['PS5'] },
  { id: 'astro-bot', title: 'Astro Bot', platforms: ['PS5'] },
  { id: 'stellar-blade', title: 'Stellar Blade', platforms: ['PS5'] },
  { id: 'ffxvi', title: 'Final Fantasy XVI', platforms: ['PS5'] },
  { id: 'ffvii-rebirth', title: 'Final Fantasy VII Rebirth', platforms: ['PS5'] },
  { id: 'ffvii-intergrade', title: 'Final Fantasy VII Remake Intergrade', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'p5r', title: 'Persona 5 Royal', platforms: ['PS5'] },
  { id: 'p3r', title: 'Persona 3 Reload', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'diablo-iv', title: 'Diablo IV', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'rdr2', title: 'Red Dead Redemption 2', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'cyberpunk', title: 'Cyberpunk 2077', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'witcher3', title: 'The Witcher 3: Wild Hunt', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'black-myth-wukong', title: 'Black Myth: Wukong', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'monster-hunter-wilds', title: 'Monster Hunter Wilds', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'onimusha-wots', title: 'Onimusha: Way of the Sword', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'physint', title: 'Physint', platforms: ['XBOX SERIES X'] },
  { id: 'cod-bo6', title: 'Call of Duty: Black Ops 6', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'cod-mw3', title: 'Call of Duty: Modern Warfare III', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'cod-mw2', title: 'Call of Duty: Modern Warfare II', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'cod-warzone', title: 'Call of Duty: Warzone', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'battlefield-2042', title: 'Battlefield 2042', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'space-marine-2', title: 'Warhammer 40,000: Space Marine 2', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'dying-light-2', title: 'Dying Light 2', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'dead-island-2', title: 'Dead Island 2', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'stalker-2', title: 'S.T.A.L.K.E.R. 2: Heart of Chornobyl', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'ac-shadows', title: "Assassin's Creed Shadows", platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'ac-mirage', title: "Assassin's Creed Mirage", platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'far-cry-6', title: 'Far Cry 6', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'avatar-fop', title: 'Avatar: Frontiers of Pandora', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'ghostwire', title: 'Ghostwire: Tokyo', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'crew-motorfest', title: 'The Crew Motorfest', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'it-takes-two', title: 'It Takes Two', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'a-way-out', title: 'A Way Out', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'unravel-two', title: 'Unravel Two', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'halo-infinite', title: 'Halo Infinite', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'forza-horizon-5', title: 'Forza Horizon 5', platforms: ['XBOX SERIES X'] },
  { id: 'forza-motorsport', title: 'Forza Motorsport', platforms: ['XBOX SERIES X'] },
  { id: 'fable', title: 'Fable', platforms: ['XBOX SERIES X'] },
  { id: 'gears-reloaded', title: 'Gears of War: Reloaded', platforms: ['XBOX SERIES X'] },
  { id: 'avowed', title: 'Avowed', platforms: ['XBOX SERIES X'] },
  { id: 'hi-fi-rush', title: 'Hi-Fi Rush', platforms: ['XBOX SERIES X'] },
  { id: 'sea-of-thieves', title: 'Sea of Thieves', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'ms-flight-sim', title: 'Microsoft Flight Simulator', platforms: ['XBOX SERIES X'] },
  { id: 'mortal-kombat-1', title: 'Mortal Kombat 1', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'tekken-8', title: 'Tekken 8', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'sf6', title: 'Street Fighter 6', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'rocket-league', title: 'Rocket League', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'apex-legends', title: 'Apex Legends', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'fortnite', title: 'Fortnite', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'palworld', title: 'Palworld', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'lethal-company', title: 'Lethal Company', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'hades-2', title: 'Hades II', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'hollow-knight-silksong', title: 'Hollow Knight: Silksong', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'balatro', title: 'Balatro', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'fc25', title: 'EA Sports FC 25', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'madden-nfl-25', title: 'Madden NFL 25', platforms: ['XBOX SERIES X'] },
  { id: 'nba2k25', title: 'NBA 2K25', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'efootball-2025', title: 'eFootball 2025', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'wwe2k25', title: 'WWE 2K25', platforms: ['PS5', 'XBOX SERIES X'] },
];

/** Normalisation de la recherche : minuscules, sans diacritiques. */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Plateformes cataloguées d'un jeu (comparaison insensible aux accents et à
 * la casse). `[]` quand le titre n'est pas dans le catalogue (un titre
 * stocké avant une mise à jour du catalogue s'affiche quand même, sans tag).
 */
export function gamePlatforms(title) {
  const needle = normalizeSearchText(title);
  if (!needle) return [];
  const found = TESTED_GAMES_CATALOG.find((game) => normalizeSearchText(game.title) === needle);
  return found ? found.platforms : [];
}
