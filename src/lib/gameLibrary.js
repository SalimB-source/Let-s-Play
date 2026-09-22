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
 * Consoles proposées à la sélection dans le hub et le profil.
 * Comprend la génération moderne et les consoles iconiques rétro légendaires
 * (GameCube, Super NES, Mega Drive, Nintendo 64, PS2, PS1, Xbox 360, etc.).
 */
export const CONSOLE_OPTIONS = [
  // Génération actuelle & moderne
  { id: 'PS5', label: 'PlayStation 5' },
  { id: 'PS4', label: 'PlayStation 4' },
  { id: 'XBOX SERIES X', label: 'Xbox Series X' },
  { id: 'XBOX ONE', label: 'Xbox One' },
  { id: 'SWITCH 2', label: 'Nintendo Switch 2' },
  { id: 'SWITCH', label: 'Nintendo Switch' },
  { id: 'PC', label: 'PC' },

  // Consoles iconiques rétro & légendaires
  { id: 'GAMECUBE', label: 'Nintendo GameCube' },
  { id: 'SNES', label: 'Super Nintendo (SNES)' },
  { id: 'MEGADRIVE', label: 'Sega Mega Drive' },
  { id: 'N64', label: 'Nintendo 64' },
  { id: 'PS2', label: 'PlayStation 2' },
  { id: 'PS1', label: 'PlayStation' },
  { id: 'PS3', label: 'PlayStation 3' },
  { id: 'XBOX 360', label: 'Xbox 360' },
  { id: 'DREAMCAST', label: 'Sega Dreamcast' },
  { id: 'GBA', label: 'Game Boy Advance' },
  { id: 'NES', label: 'Nintendo NES' },
];

// Alias ramenés à l'identifiant canonique avant de pré-remplir la sélection
const CONSOLE_ALIASES = {
  'PC STEAM': 'PC',
  'STEAM': 'PC',
  'NINTENDO SWITCH': 'SWITCH',
  'NINTENDO SWITCH 2': 'SWITCH 2',
  'NINTENDO GAMECUBE': 'GAMECUBE',
  'GAMECUBE': 'GAMECUBE',
  'GCN': 'GAMECUBE',
  'NGC': 'GAMECUBE',
  'SUPER NINTENDO': 'SNES',
  'SUPER NES': 'SNES',
  'SNES': 'SNES',
  'SUPER FAMICOM': 'SNES',
  'MEGA DRIVE': 'MEGADRIVE',
  'MEGADRIVE': 'MEGADRIVE',
  'SEGA MEGA DRIVE': 'MEGADRIVE',
  'GENESIS': 'MEGADRIVE',
  'SEGA GENESIS': 'MEGADRIVE',
  'NINTENDO 64': 'N64',
  'N64': 'N64',
  'PLAYSTATION': 'PS1',
  'PLAYSTATION 1': 'PS1',
  'PS1': 'PS1',
  'PSX': 'PS1',
  'PLAYSTATION 2': 'PS2',
  'PS2': 'PS2',
  'PLAYSTATION 3': 'PS3',
  'PS3': 'PS3',
  'PLAYSTATION 4': 'PS4',
  'PS4': 'PS4',
  'PLAYSTATION 5': 'PS5',
  'PS5': 'PS5',
  'XBOX 360': 'XBOX 360',
  'X360': 'XBOX 360',
  'DREAMCAST': 'DREAMCAST',
  'SEGA DREAMCAST': 'DREAMCAST',
  'GAME BOY ADVANCE': 'GBA',
  'GAMEBOY ADVANCE': 'GBA',
  'GBA': 'GBA',
  'NES': 'NES',
  'NINTENDO NES': 'NES',
  'FAMICOM': 'NES',
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
export const MAX_TESTED_GAMES = 10;

/**
 * Catalogue des jeux parus sur consoles modernes et iconiques rétro
 * (PS5, PS4, Xbox Series X, Switch, GameCube, SNES, Mega Drive, N64, PS2, PS1, PC, etc.).
 */
export const TESTED_GAMES_CATALOG = [
  // ==========================================
  // HITS MODERNES RÉCENTS (PS5 / Series X / PC)
  // ==========================================
  { id: 'gtav6', title: 'Grand Theft Auto VI', platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'gtav', title: 'Grand Theft Auto V', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'XBOX ONE', 'PC'] },
  { id: 'elden-ring', title: 'Elden Ring', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'XBOX ONE', 'PC'] },
  { id: 'elden-ring-sote', title: 'Elden Ring: Shadow of the Erdtree', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'god-of-war-ragnarok', title: 'God of War Ragnarök', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'spider-man-2', title: "Marvel's Spider-Man 2", platforms: ['PS5'] },
  { id: 'spider-man-remastered', title: "Marvel's Spider-Man Remastered", platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'hogwarts-legacy', title: 'Hogwarts Legacy', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'XBOX ONE', 'SWITCH', 'PC'] },
  { id: 're4', title: 'Resident Evil 4 Remake', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 're2', title: 'Resident Evil 2 Remake', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 're3', title: 'Resident Evil 3 Remake', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'alan-wake-2', title: 'Alan Wake 2', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'alan-wake-an', title: "Alan Wake's American Nightmare", platforms: ['PS5', 'XBOX SERIES X'] },
  { id: 'hellblade-2', title: "Senua's Saga: Hellblade II", platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'jedi-survivor', title: 'Star Wars Jedi: Survivor', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'star-wars-outlaws', title: 'Star Wars Outlaws', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'death-stranding-dc', title: "Death Stranding Director's Cut", platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'ghost-of-tsushima', title: 'Ghost of Tsushima', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'rift-apart', title: 'Ratchet & Clank: Rift Apart', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'horizon-fw', title: 'Horizon Forbidden West', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'demon-souls', title: "Demon's Souls", platforms: ['PS5'] },
  { id: 'returnal', title: 'Returnal', platforms: ['PS5', 'PC'] },
  { id: 'gran-turismo-7', title: 'Gran Turismo 7', platforms: ['PS5', 'PS4'] },
  { id: 'astro-bot', title: 'Astro Bot', platforms: ['PS5'] },
  { id: 'stellar-blade', title: 'Stellar Blade', platforms: ['PS5'] },
  { id: 'ffxvi', title: 'Final Fantasy XVI', platforms: ['PS5'] },
  { id: 'ffvii-rebirth', title: 'Final Fantasy VII Rebirth', platforms: ['PS5'] },
  { id: 'ffvii-intergrade', title: 'Final Fantasy VII Remake Intergrade', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'p5r', title: 'Persona 5 Royal', platforms: ['PS5', 'PS4', 'SWITCH', 'PC'] },
  { id: 'p3r', title: 'Persona 3 Reload', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'diablo-iv', title: 'Diablo IV', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'rdr2', title: 'Red Dead Redemption 2', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'XBOX ONE', 'PC'] },
  { id: 'cyberpunk', title: 'Cyberpunk 2077', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'witcher3', title: 'The Witcher 3: Wild Hunt', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'XBOX ONE', 'SWITCH', 'PC'] },
  { id: 'black-myth-wukong', title: 'Black Myth: Wukong', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'monster-hunter-wilds', title: 'Monster Hunter Wilds', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'onimusha-wots', title: 'Onimusha: Way of the Sword', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'physint', title: 'Physint', platforms: ['XBOX SERIES X'] },
  { id: 'cod-bo6', title: 'Call of Duty: Black Ops 6', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'cod-mw3', title: 'Call of Duty: Modern Warfare III', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'cod-mw2', title: 'Call of Duty: Modern Warfare II', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'cod-warzone', title: 'Call of Duty: Warzone', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'battlefield-2042', title: 'Battlefield 2042', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'space-marine-2', title: 'Warhammer 40,000: Space Marine 2', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'dying-light-2', title: 'Dying Light 2', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'dead-island-2', title: 'Dead Island 2', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'stalker-2', title: 'S.T.A.L.K.E.R. 2: Heart of Chornobyl', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'ac-shadows', title: "Assassin's Creed Shadows", platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'ac-mirage', title: "Assassin's Creed Mirage", platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'far-cry-6', title: 'Far Cry 6', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'avatar-fop', title: 'Avatar: Frontiers of Pandora', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'ghostwire', title: 'Ghostwire: Tokyo', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'crew-motorfest', title: 'The Crew Motorfest', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'it-takes-two', title: 'It Takes Two', platforms: ['PS5', 'PS4', 'SWITCH', 'XBOX SERIES X', 'XBOX ONE', 'PC'] },
  { id: 'a-way-out', title: 'A Way Out', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'unravel-two', title: 'Unravel Two', platforms: ['PS5', 'PS4', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'halo-infinite', title: 'Halo Infinite', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'forza-horizon-5', title: 'Forza Horizon 5', platforms: ['XBOX SERIES X', 'PC'] },
  { id: 'forza-motorsport', title: 'Forza Motorsport', platforms: ['XBOX SERIES X', 'PC'] },
  { id: 'fable', title: 'Fable', platforms: ['XBOX SERIES X'] },
  { id: 'gears-reloaded', title: 'Gears of War: Reloaded', platforms: ['XBOX SERIES X'] },
  { id: 'avowed', title: 'Avowed', platforms: ['XBOX SERIES X', 'PC'] },
  { id: 'hi-fi-rush', title: 'Hi-Fi Rush', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'sea-of-thieves', title: 'Sea of Thieves', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'ms-flight-sim', title: 'Microsoft Flight Simulator', platforms: ['XBOX SERIES X', 'PC'] },
  { id: 'mortal-kombat-1', title: 'Mortal Kombat 1', platforms: ['PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'tekken-8', title: 'Tekken 8', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'sf6', title: 'Street Fighter 6', platforms: ['PS5', 'PS4', 'XBOX SERIES X', 'PC'] },
  { id: 'rocket-league', title: 'Rocket League', platforms: ['PS5', 'PS4', 'SWITCH', 'XBOX SERIES X', 'XBOX ONE', 'PC'] },
  { id: 'apex-legends', title: 'Apex Legends', platforms: ['PS5', 'PS4', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'fortnite', title: 'Fortnite', platforms: ['PS5', 'PS4', 'SWITCH', 'XBOX SERIES X', 'XBOX ONE', 'PC'] },
  { id: 'palworld', title: 'Palworld', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'lethal-company', title: 'Lethal Company', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'hades-2', title: 'Hades II', platforms: ['PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'hollow-knight-silksong', title: 'Hollow Knight: Silksong', platforms: ['PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'balatro', title: 'Balatro', platforms: ['PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'fc25', title: 'EA Sports FC 25', platforms: ['PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'madden-nfl-25', title: 'Madden NFL 25', platforms: ['XBOX SERIES X', 'PC'] },
  { id: 'nba2k25', title: 'NBA 2K25', platforms: ['PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'efootball-2025', title: 'eFootball 2025', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'wwe2k25', title: 'WWE 2K25', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },

  // ==========================================
  // NINTENDO GAMECUBE (ICÔNES GAMECUBE)
  // ==========================================
  { id: 'smash-melee', title: 'Super Smash Bros. Melee', platforms: ['GAMECUBE'] },
  { id: 'zelda-wind-waker', title: 'The Legend of Zelda: The Wind Waker', platforms: ['GAMECUBE'] },
  { id: 'zelda-twilight-princess', title: 'The Legend of Zelda: Twilight Princess', platforms: ['GAMECUBE'] },
  { id: 'metroid-prime', title: 'Metroid Prime', platforms: ['GAMECUBE', 'SWITCH'] },
  { id: 're4-original', title: 'Resident Evil 4 (2005)', platforms: ['GAMECUBE', 'PS2', 'PC'] },
  { id: 'super-mario-sunshine', title: 'Super Mario Sunshine', platforms: ['GAMECUBE'] },
  { id: 'mario-kart-double-dash', title: 'Mario Kart: Double Dash!!', platforms: ['GAMECUBE'] },
  { id: 'luigis-mansion', title: "Luigi's Mansion", platforms: ['GAMECUBE'] },
  { id: 'f-zero-gx', title: 'F-Zero GX', platforms: ['GAMECUBE'] },
  { id: 'paper-mario-ttyd', title: 'Paper Mario: The Thousand-Year Door', platforms: ['GAMECUBE', 'SWITCH'] },
  { id: 'mario-party-4', title: 'Mario Party 4', platforms: ['GAMECUBE'] },
  { id: 'star-fox-adventures', title: 'Star Fox Adventures', platforms: ['GAMECUBE'] },
  { id: 'soulcalibur-2', title: 'Soulcalibur II', platforms: ['GAMECUBE', 'PS2', 'XBOX 360'] },
  { id: 'pikmin-2', title: 'Pikmin 2', platforms: ['GAMECUBE', 'SWITCH'] },

  // ==========================================
  // SUPER NINTENDO / SNES (ICÔNES 16-BIT NINTENDO)
  // ==========================================
  { id: 'super-mario-world', title: 'Super Mario World', platforms: ['SNES', 'GBA'] },
  { id: 'zelda-alttp', title: 'The Legend of Zelda: A Link to the Past', platforms: ['SNES', 'GBA'] },
  { id: 'super-metroid', title: 'Super Metroid', platforms: ['SNES'] },
  { id: 'chrono-trigger', title: 'Chrono Trigger', platforms: ['SNES', 'PS1', 'PC'] },
  { id: 'donkey-kong-country', title: 'Donkey Kong Country', platforms: ['SNES', 'GBA'] },
  { id: 'donkey-kong-country-2', title: "Donkey Kong Country 2: Diddy's Kong Quest", platforms: ['SNES', 'GBA'] },
  { id: 'super-mario-kart', title: 'Super Mario Kart', platforms: ['SNES'] },
  { id: 'street-fighter-2-turbo', title: 'Street Fighter II Turbo', platforms: ['SNES', 'MEGADRIVE'] },
  { id: 'final-fantasy-6', title: 'Final Fantasy VI', platforms: ['SNES', 'GBA', 'PC'] },
  { id: 'secret-of-mana', title: 'Secret of Mana', platforms: ['SNES', 'PC'] },
  { id: 'super-mario-rpg', title: 'Super Mario RPG', platforms: ['SNES', 'SWITCH'] },
  { id: 'mega-man-x', title: 'Mega Man X', platforms: ['SNES', 'PC'] },
  { id: 'earthbound', title: 'EarthBound', platforms: ['SNES'] },
  { id: 'f-zero', title: 'F-Zero', platforms: ['SNES'] },

  // ==========================================
  // SEGA MEGA DRIVE / GENESIS (ICÔNES SEGA)
  // ==========================================
  { id: 'sonic-2', title: 'Sonic the Hedgehog 2', platforms: ['MEGADRIVE'] },
  { id: 'sonic-1', title: 'Sonic the Hedgehog', platforms: ['MEGADRIVE'] },
  { id: 'sonic-knuckles', title: 'Sonic & Knuckles', platforms: ['MEGADRIVE'] },
  { id: 'streets-of-rage-2', title: 'Streets of Rage 2', platforms: ['MEGADRIVE'] },
  { id: 'streets-of-rage', title: 'Streets of Rage', platforms: ['MEGADRIVE'] },
  { id: 'shinobi-3', title: 'Shinobi III: Return of the Ninja Master', platforms: ['MEGADRIVE'] },
  { id: 'golden-axe', title: 'Golden Axe', platforms: ['MEGADRIVE'] },
  { id: 'gunstar-heroes', title: 'Gunstar Heroes', platforms: ['MEGADRIVE'] },
  { id: 'earthworm-jim', title: 'Earthworm Jim', platforms: ['MEGADRIVE', 'SNES', 'PC'] },
  { id: 'phantasy-star-4', title: 'Phantasy Star IV', platforms: ['MEGADRIVE'] },
  { id: 'comix-zone', title: 'Comix Zone', platforms: ['MEGADRIVE', 'PC'] },
  { id: 'aladdin-md', title: "Disney's Aladdin (Mega Drive)", platforms: ['MEGADRIVE'] },
  { id: 'mortal-kombat-2-md', title: 'Mortal Kombat II', platforms: ['MEGADRIVE', 'SNES'] },

  // ==========================================
  // NINTENDO 64 (N64)
  // ==========================================
  { id: 'super-mario-64', title: 'Super Mario 64', platforms: ['N64'] },
  { id: 'zelda-oot', title: 'The Legend of Zelda: Ocarina of Time', platforms: ['N64', 'GAMECUBE'] },
  { id: 'zelda-majoras-mask', title: "The Legend of Zelda: Majora's Mask", platforms: ['N64', 'GAMECUBE'] },
  { id: 'goldeneye-007', title: 'GoldenEye 007', platforms: ['N64', 'XBOX SERIES X', 'SWITCH'] },
  { id: 'banjo-kazooie', title: 'Banjo-Kazooie', platforms: ['N64', 'XBOX 360'] },
  { id: 'super-smash-bros', title: 'Super Smash Bros.', platforms: ['N64'] },
  { id: 'mario-kart-64', title: 'Mario Kart 64', platforms: ['N64'] },
  { id: 'perfect-dark', title: 'Perfect Dark', platforms: ['N64', 'XBOX 360'] },
  { id: 'diddy-kong-racing', title: 'Diddy Kong Racing', platforms: ['N64'] },
  { id: 'star-fox-64', title: 'Star Fox 64', platforms: ['N64'] },
  { id: 'paper-mario-64', title: 'Paper Mario', platforms: ['N64'] },
  { id: 'conkers-bad-fur-day', title: "Conker's Bad Fur Day", platforms: ['N64'] },

  // ==========================================
  // PLAYSTATION 2 (PS2)
  // ==========================================
  { id: 'gta-san-andreas', title: 'Grand Theft Auto: San Andreas', platforms: ['PS2', 'XBOX ONE', 'PC'] },
  { id: 'gta-vice-city', title: 'Grand Theft Auto: Vice City', platforms: ['PS2', 'PC'] },
  { id: 'metal-gear-solid-3', title: 'Metal Gear Solid 3: Snake Eater', platforms: ['PS2', 'PS3', 'PS5', 'PC'] },
  { id: 'metal-gear-solid-2', title: 'Metal Gear Solid 2: Sons of Liberty', platforms: ['PS2', 'PS3', 'PC'] },
  { id: 'god-of-war-2', title: 'God of War II', platforms: ['PS2', 'PS3'] },
  { id: 'god-of-war-1', title: 'God of War (2005)', platforms: ['PS2', 'PS3'] },
  { id: 'shadow-of-the-colossus-ps2', title: 'Shadow of the Colossus (2005)', platforms: ['PS2'] },
  { id: 'kingdom-hearts-2', title: 'Kingdom Hearts II', platforms: ['PS2', 'PS4', 'PC'] },
  { id: 'silent-hill-2-ps2', title: 'Silent Hill 2 (2001)', platforms: ['PS2', 'PC'] },
  { id: 'final-fantasy-10', title: 'Final Fantasy X', platforms: ['PS2', 'PS4', 'SWITCH', 'PC'] },
  { id: 'dmc3', title: "Devil May Cry 3: Dante's Awakening", platforms: ['PS2', 'PS4', 'SWITCH', 'PC'] },
  { id: 'gran-turismo-4', title: 'Gran Turismo 4', platforms: ['PS2'] },
  { id: 'ico', title: 'Ico', platforms: ['PS2', 'PS3'] },
  { id: 'burnout-3-takedown', title: 'Burnout 3: Takedown', platforms: ['PS2'] },
  { id: 'okami', title: 'Ōkami', platforms: ['PS2', 'PS4', 'SWITCH', 'PC'] },
  { id: 'dragon-ball-budokai-tenkaichi-3', title: 'Dragon Ball Z: Budokai Tenkaichi 3', platforms: ['PS2'] },

  // ==========================================
  // PLAYSTATION 1 (PS1)
  // ==========================================
  { id: 'mgs1', title: 'Metal Gear Solid (1998)', platforms: ['PS1', 'PC'] },
  { id: 'ff7-original', title: 'Final Fantasy VII (1997)', platforms: ['PS1', 'SWITCH', 'PC'] },
  { id: 'ff8', title: 'Final Fantasy VIII', platforms: ['PS1', 'SWITCH', 'PC'] },
  { id: 'ff9', title: 'Final Fantasy IX', platforms: ['PS1', 'SWITCH', 'PC'] },
  { id: 'castlevania-sotn', title: 'Castlevania: Symphony of the Night', platforms: ['PS1', 'PS4'] },
  { id: 're2-original', title: 'Resident Evil 2 (1998)', platforms: ['PS1', 'N64', 'GAMECUBE', 'PC'] },
  { id: 're1-original', title: 'Resident Evil (1996)', platforms: ['PS1', 'PC'] },
  { id: 're3-original', title: 'Resident Evil 3: Nemesis', platforms: ['PS1', 'GAMECUBE', 'PC'] },
  { id: 'tekken-3', title: 'Tekken 3', platforms: ['PS1'] },
  { id: 'crash-bandicoot-3', title: 'Crash Bandicoot 3: Warped', platforms: ['PS1'] },
  { id: 'crash-team-racing', title: 'Crash Team Racing', platforms: ['PS1'] },
  { id: 'spyro-the-dragon', title: 'Spyro the Dragon', platforms: ['PS1'] },
  { id: 'silent-hill-1', title: 'Silent Hill (1999)', platforms: ['PS1'] },
  { id: 'gran-turismo-2', title: 'Gran Turismo 2', platforms: ['PS1'] },
  { id: 'tomb-raider', title: 'Tomb Raider (1996)', platforms: ['PS1', 'PC'] },

  // ==========================================
  // PLAYSTATION 3 (PS3)
  // ==========================================
  { id: 'tlou-ps3', title: 'The Last of Us (2013)', platforms: ['PS3', 'PS4'] },
  { id: 'uncharted-2', title: 'Uncharted 2: Among Thieves', platforms: ['PS3', 'PS4'] },
  { id: 'god-of-war-3', title: 'God of War III', platforms: ['PS3', 'PS4'] },
  { id: 'demons-souls-ps3', title: "Demon's Souls (2009)", platforms: ['PS3'] },
  { id: 'mgs4', title: 'Metal Gear Solid 4: Guns of the Patriots', platforms: ['PS3'] },
  { id: 'infamous-2', title: 'Infamous 2', platforms: ['PS3'] },
  { id: 'red-dead-redemption', title: 'Red Dead Redemption (2010)', platforms: ['PS3', 'XBOX 360', 'SWITCH', 'PS4'] },
  { id: 'killzone-2', title: 'Killzone 2', platforms: ['PS3'] },

  // ==========================================
  // XBOX 360
  // ==========================================
  { id: 'halo-3', title: 'Halo 3', platforms: ['XBOX 360', 'PC'] },
  { id: 'halo-reach', title: 'Halo: Reach', platforms: ['XBOX 360', 'PC'] },
  { id: 'gears-of-war-1', title: 'Gears of War', platforms: ['XBOX 360', 'PC'] },
  { id: 'gears-of-war-2', title: 'Gears of War 2', platforms: ['XBOX 360'] },
  { id: 'forza-motorsport-4', title: 'Forza Motorsport 4', platforms: ['XBOX 360'] },
  { id: 'mass-effect-2', title: 'Mass Effect 2', platforms: ['XBOX 360', 'PS3', 'PC'] },
  { id: 'bioshock', title: 'BioShock', platforms: ['XBOX 360', 'PS3', 'PC'] },
  { id: 'fable-2', title: 'Fable II', platforms: ['XBOX 360'] },
  { id: 'left-4-dead-2', title: 'Left 4 Dead 2', platforms: ['XBOX 360', 'PC'] },
  { id: 'alan-wake-360', title: 'Alan Wake (2010)', platforms: ['XBOX 360', 'PC'] },

  // ==========================================
  // SEGA DREAMCAST
  // ==========================================
  { id: 'shenmue-1', title: 'Shenmue', platforms: ['DREAMCAST', 'PS4', 'PC'] },
  { id: 'shenmue-2', title: 'Shenmue II', platforms: ['DREAMCAST', 'PS4', 'PC'] },
  { id: 'sonic-adventure', title: 'Sonic Adventure', platforms: ['DREAMCAST', 'GAMECUBE', 'PC'] },
  { id: 'sonic-adventure-2', title: 'Sonic Adventure 2', platforms: ['DREAMCAST', 'GAMECUBE', 'PC'] },
  { id: 'crazy-taxi', title: 'Crazy Taxi', platforms: ['DREAMCAST', 'GAMECUBE', 'PC'] },
  { id: 'jet-set-radio', title: 'Jet Set Radio', platforms: ['DREAMCAST', 'PC'] },
  { id: 'soulcalibur-dc', title: 'Soulcalibur', platforms: ['DREAMCAST'] },
  { id: 're-code-veronica', title: 'Resident Evil: Code Veronica', platforms: ['DREAMCAST', 'PS2', 'GAMECUBE'] },
  { id: 'skies-of-arcadia', title: 'Skies of Arcadia', platforms: ['DREAMCAST', 'GAMECUBE'] },
  { id: 'power-stone-2', title: 'Power Stone 2', platforms: ['DREAMCAST'] },

  // ==========================================
  // GAME BOY ADVANCE (GBA)
  // ==========================================
  { id: 'pokemon-emerald', title: 'Pokémon Emerald', platforms: ['GBA'] },
  { id: 'pokemon-firered', title: 'Pokémon FireRed / LeafGreen', platforms: ['GBA'] },
  { id: 'pokemon-ruby-sapphire', title: 'Pokémon Ruby / Sapphire', platforms: ['GBA'] },
  { id: 'zelda-minish-cap', title: 'The Legend of Zelda: The Minish Cap', platforms: ['GBA', 'SWITCH'] },
  { id: 'metroid-fusion', title: 'Metroid Fusion', platforms: ['GBA', 'SWITCH'] },
  { id: 'metroid-zero-mission', title: 'Metroid: Zero Mission', platforms: ['GBA', 'SWITCH'] },
  { id: 'castlevania-aria-of-sorrow', title: 'Castlevania: Aria of Sorrow', platforms: ['GBA', 'SWITCH', 'PC'] },
  { id: 'golden-sun', title: 'Golden Sun', platforms: ['GBA', 'SWITCH'] },
  { id: 'advance-wars', title: 'Advance Wars', platforms: ['GBA', 'SWITCH'] },
  { id: 'fire-emblem-gba', title: 'Fire Emblem: The Blazing Blade', platforms: ['GBA', 'SWITCH'] },

  // ==========================================
  // NINTENDO ENTERTAINMENT SYSTEM (NES)
  // ==========================================
  { id: 'super-mario-bros-3', title: 'Super Mario Bros. 3', platforms: ['NES', 'GBA'] },
  { id: 'super-mario-bros', title: 'Super Mario Bros.', platforms: ['NES'] },
  { id: 'zelda-nes', title: 'The Legend of Zelda (1986)', platforms: ['NES'] },
  { id: 'mega-man-2', title: 'Mega Man 2', platforms: ['NES', 'SWITCH', 'PC'] },
  { id: 'castlevania-nes', title: 'Castlevania', platforms: ['NES'] },
  { id: 'metroid-nes', title: 'Metroid (1986)', platforms: ['NES', 'GBA'] },
  { id: 'contra', title: 'Contra', platforms: ['NES'] },
  { id: 'punch-out', title: 'Punch-Out!!', platforms: ['NES'] },
  { id: 'duck-hunt', title: 'Duck Hunt', platforms: ['NES'] },

  // ==========================================
  // NINTENDO SWITCH & SWITCH 2
  // ==========================================
  { id: 'zelda-botw', title: 'The Legend of Zelda: Breath of the Wild', platforms: ['SWITCH'] },
  { id: 'zelda-totk', title: 'The Legend of Zelda: Tears of the Kingdom', platforms: ['SWITCH', 'SWITCH 2'] },
  { id: 'super-mario-odyssey', title: 'Super Mario Odyssey', platforms: ['SWITCH'] },
  { id: 'super-smash-bros-ultimate', title: 'Super Smash Bros. Ultimate', platforms: ['SWITCH'] },
  { id: 'mario-kart-8-deluxe', title: 'Mario Kart 8 Deluxe', platforms: ['SWITCH', 'SWITCH 2'] },
  { id: 'metroid-dread', title: 'Metroid Dread', platforms: ['SWITCH'] },
  { id: 'metroid-prime-4', title: 'Metroid Prime 4: Beyond', platforms: ['SWITCH', 'SWITCH 2'] },
  { id: 'animal-crossing-nh', title: 'Animal Crossing: New Horizons', platforms: ['SWITCH'] },
  { id: 'pokemon-scarlet-violet', title: 'Pokémon Scarlet & Violet', platforms: ['SWITCH'] },
  { id: 'xenoblade-3', title: 'Xenoblade Chronicles 3', platforms: ['SWITCH'] },
  { id: 'fire-emblem-three-houses', title: 'Fire Emblem: Three Houses', platforms: ['SWITCH'] },

  // ==========================================
  // PS4 D'ÉPOQUE & CLASSIQUES
  // ==========================================
  { id: 'god-of-war', title: 'God of War (2018)', platforms: ['PS4', 'PC'] },
  { id: 'bloodborne', title: 'Bloodborne', platforms: ['PS4'] },
  { id: 'shadow-of-the-colossus', title: 'Shadow of the Colossus (2018)', platforms: ['PS4', 'PC'] },
  { id: 'tlou2', title: 'The Last of Us Part II', platforms: ['PS4', 'PC'] },
  { id: 'uncharted-4', title: "Uncharted 4: A Thief's End", platforms: ['PS4', 'PC'] },
  { id: 'horizon-zero-dawn', title: 'Horizon Zero Dawn', platforms: ['PS4', 'PC'] },
  { id: 'days-gone', title: 'Days Gone', platforms: ['PS4'] },
  { id: 'sekiro', title: 'Sekiro: Shadows Die Twice', platforms: ['PS4', 'PC'] },
  { id: 'dark-souls-3', title: 'Dark Souls III', platforms: ['PS4', 'PC'] },
  { id: 'monster-hunter-world', title: 'Monster Hunter: World', platforms: ['PS4', 'PC'] },
  { id: 'dmc5', title: 'Devil May Cry 5 Special Edition', platforms: ['PS4', 'PC'] },
  { id: 'ac-valhalla', title: "Assassin's Creed Valhalla", platforms: ['PS4', 'PC'] },
  { id: 'death-stranding', title: 'Death Stranding (2019)', platforms: ['PS4', 'PC'] },
  { id: 'yakuza-0', title: 'Yakuza 0', platforms: ['PS4', 'PC'] },
  { id: 'arkham-knight', title: 'Batman: Arkham Knight', platforms: ['PS4', 'PC'] },
  { id: 'dbz-kakarot', title: 'Dragon Ball Z: Kakarot', platforms: ['PS4', 'PC'] },
  { id: 'nier-automata', title: 'NieR: Automata', platforms: ['PS4', 'SWITCH', 'PC'] },
  { id: 'jedi-fallen-order', title: 'Star Wars Jedi: Fallen Order', platforms: ['PS4', 'PC'] },
  { id: 'pubg', title: "PlayerUnknown's Battlegrounds", platforms: ['PS4', 'PC'] },
  { id: 'nfs-heat', title: 'Need for Speed Heat', platforms: ['PS4', 'PC'] },

  // ==========================================
  // PC & HITS MULTI-PLATEFORMES
  // ==========================================
  { id: 'cs2', title: 'Counter-Strike 2', platforms: ['PC'] },
  { id: 'valorant', title: 'Valorant', platforms: ['PC'] },
  { id: 'lol', title: 'League of Legends', platforms: ['PC'] },
  { id: 'dota-2', title: 'Dota 2', platforms: ['PC'] },
  { id: 'wow', title: 'World of Warcraft', platforms: ['PC'] },
  { id: 'baldurs-gate-3', title: "Baldur's Gate 3", platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'starfield', title: 'Starfield', platforms: ['XBOX SERIES X', 'PC'] },
  { id: 'silent-hill-2', title: 'Silent Hill 2 (2024)', platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'dragons-dogma-2', title: "Dragon's Dogma 2", platforms: ['PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'helldivers-2', title: 'Helldivers 2', platforms: ['PS5', 'PC'] },
  { id: 'vampire-survivors', title: 'Vampire Survivors', platforms: ['SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'slay-the-spire', title: 'Slay the Spire', platforms: ['PS4', 'SWITCH', 'XBOX ONE', 'PC'] },
  { id: 'dead-cells', title: 'Dead Cells', platforms: ['PS4', 'SWITCH', 'XBOX ONE', 'PC'] },
  { id: 'cuphead', title: 'Cuphead', platforms: ['PS4', 'SWITCH', 'XBOX ONE', 'PC'] },
  { id: 'outer-wilds', title: 'Outer Wilds', platforms: ['PS4', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'subnautica', title: 'Subnautica', platforms: ['PS4', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'no-mans-sky', title: "No Man's Sky", platforms: ['PS4', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'destiny-2', title: 'Destiny 2', platforms: ['PS4', 'PS5', 'XBOX SERIES X', 'PC'] },
  { id: 'overwatch-2', title: 'Overwatch 2', platforms: ['PS4', 'PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'warframe', title: 'Warframe', platforms: ['PS4', 'PS5', 'SWITCH', 'XBOX SERIES X', 'PC'] },
  { id: 'genshin-impact', title: 'Genshin Impact', platforms: ['PS4', 'PS5', 'PC'] },
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
