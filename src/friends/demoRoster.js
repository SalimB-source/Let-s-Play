/**
 * Communauté de démonstration.
 * ----------------------------
 * Les personas de démonstration (`src/auth/demoProfiles.js`) n'ont pas de
 * session Supabase : leur liste d'amis vit dans localStorage, comme leurs
 * commentaires. Ce fichier fournit les joueurs « qui peuplent » cette
 * communauté simulée — chacun avec un statut de présence scripté, pour que la
 * fenêtre d'amis montre à la fois des joueurs en ligne et hors ligne sans
 * aucun backend.
 *
 *   presence : 'online'  — toujours en ligne ;
 *              'offline' — toujours hors ligne (`lastSeenMinutes` = vu il y a…) ;
 *              'cycle'   — alterne toutes les `cycleMinutes` minutes (décalé
 *                          par `cycleOffset`) : la liste bouge dans le temps.
 */
import { DEMO_PROFILES } from '../auth/demoProfiles';

export const DEMO_PLAYERS = [
  {
    id: 'demo-player-3105',
    gamertag: 'KAYZ_ORAN',
    fullName: 'Kamel Yazid',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    level: 17,
    xp: 1640,
    platforms: ['PC STEAM', 'PS5'],
    testedGames: ['Elden Ring', 'Tekken 8', 'Mortal Kombat 1'],
    presence: 'online',
  },
  {
    id: 'demo-player-4820',
    gamertag: 'NOUR_GG',
    fullName: 'Nour Haddad',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    level: 23,
    xp: 2310,
    platforms: ['SWITCH 2', 'PS5'],
    presence: 'cycle',
    cycleMinutes: 7,
    cycleOffset: 0,
  },
  {
    id: 'demo-player-5573',
    gamertag: 'RAYAN_PLAYS',
    fullName: 'Rayan Meziane',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    level: 9,
    xp: 760,
    platforms: ['XBOX SERIES X'],
    presence: 'offline',
    lastSeenMinutes: 95,
  },
  {
    id: 'demo-player-6041',
    gamertag: 'LINA_LOOT',
    fullName: 'Lina Brahimi',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80',
    level: 31,
    xp: 3280,
    platforms: ['PC STEAM'],
    presence: 'cycle',
    cycleMinutes: 11,
    cycleOffset: 5,
  },
  {
    id: 'demo-player-7298',
    gamertag: 'MEHDI_SPEED',
    fullName: 'Mehdi Cherif',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    level: 12,
    xp: 1105,
    platforms: ['PS5', 'SWITCH 2'],
    testedGames: ['Astro Bot', 'Gran Turismo 7', 'Stellar Blade'],
    presence: 'offline',
    lastSeenMinutes: 60 * 26,
  },
  {
    id: 'demo-player-8364',
    gamertag: 'SARAH_RETRO',
    fullName: 'Sarah Ould',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    level: 6,
    xp: 420,
    platforms: ['SWITCH 2'],
    presence: 'online',
  },
  {
    id: 'demo-player-9127',
    gamertag: 'YANIS_FPS',
    fullName: 'Yanis Bouzid',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    level: 20,
    xp: 1980,
    platforms: ['PC STEAM', 'XBOX SERIES X'],
    testedGames: ['Call of Duty: Black Ops 6', 'Forza Horizon 5', 'Hi-Fi Rush'],
    presence: 'offline',
    lastSeenMinutes: 60 * 24 * 3,
  },
  {
    id: 'demo-player-2214',
    gamertag: 'ADEL_ARCADE',
    fullName: 'Adel Benyoucef',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    level: 11,
    xp: 980,
    platforms: ['PS5', 'PC STEAM'],
    testedGames: ['Balatro', 'Hades II', 'Rocket League'],
    presence: 'online',
  },
  {
    id: 'demo-player-2790',
    gamertag: 'MAYA_MMO',
    fullName: 'Maya Terki',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
    level: 26,
    xp: 2640,
    platforms: ['PC STEAM'],
    presence: 'offline',
    lastSeenMinutes: 60 * 7,
  },
  {
    id: 'demo-player-9950',
    gamertag: 'IMENE_INDIE',
    fullName: 'Imène Saadi',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&auto=format&fit=crop&q=80',
    level: 14,
    xp: 1330,
    platforms: ['PC STEAM', 'SWITCH 2'],
    presence: 'cycle',
    cycleMinutes: 5,
    cycleOffset: 2,
  },
];

/** Une persona connectable, vue comme un joueur de la communauté. */
function personaAsPlayer(profile, presence) {
  if (!profile) return null;
  const meta = profile.user_metadata || {};
  return {
    id: profile.id,
    gamertag: meta.gamertag,
    fullName: meta.fullName,
    avatar: meta.avatar,
    level: meta.level || 1,
    xp: meta.xp || 0,
    platforms: meta.platforms || [],
    testedGames: meta.testedGames || [],
    presence,
    persona: profile.profileKey,
  };
}

/**
 * Tous les joueurs de la communauté de démonstration (personas comprises).
 *
 * **Calculé à la demande**, jamais au chargement du module : les personas
 * connectables (`src/auth/demoProfiles.js`) ne sont plus livrées dans le bundle
 * et ne sont enregistrées que par les scripts de vérification
 * (`scripts/demoFixtures.js`). Une lecture trop précoce — ou une persona
 * absente — ne doit donc ni figer une communauté incomplète, ni faire tomber
 * l'application : c'est exactement ce qui vidait l'écran de tout le site.
 *
 * @returns {object[]} personas enregistrées (le cas échéant), puis joueurs scriptés.
 */
export function demoCommunity() {
  const personas = Object.values(DEMO_PROFILES)
    .map((profile) => personaAsPlayer(profile, 'online'))
    .filter(Boolean);
  return [...personas, ...DEMO_PLAYERS];
}

export function findDemoPlayer(id) {
  return demoCommunity().find((player) => player.id === id) || null;
}

/** Vrai quand `id` désigne un joueur de la communauté de démonstration. */
export function isDemoPlayerId(id) {
  return typeof id === 'string' && id.startsWith('demo-');
}

/**
 * Présence scriptée d'un joueur à l'instant `now` : `{ online, lastSeenAt }`.
 * Déterministe (pas d'aléatoire) : deux composants qui lisent la même minute
 * voient le même état, et l'état évolue au fil des minutes.
 */
export function demoPresence(player, now = Date.now()) {
  if (!player) return { online: false, lastSeenAt: null };
  if (player.presence === 'online') return { online: true, lastSeenAt: new Date(now).toISOString() };
  if (player.presence === 'cycle') {
    const period = Math.max(1, player.cycleMinutes || 10) * 60 * 1000;
    const slot = Math.floor(now / period) + (player.cycleOffset || 0);
    const online = slot % 2 === 0;
    // Hors ligne : « vu » à la fin du dernier créneau en ligne.
    const lastSeenAt = online ? new Date(now).toISOString() : new Date(Math.floor(now / period) * period).toISOString();
    return { online, lastSeenAt };
  }
  const minutes = player.lastSeenMinutes || 60;
  return { online: false, lastSeenAt: new Date(now - minutes * 60 * 1000).toISOString() };
}

/**
 * État de départ de chaque persona : quelques amis (en ligne et hors ligne),
 * des demandes reçues à traiter, une demande envoyée en attente. Le reste de
 * la communauté est à découvrir dans l'onglet « Ajouter ».
 */
export const DEMO_INITIAL_STATE = {
  vortex: {
    friends: ['demo-user-8842', 'demo-player-3105', 'demo-player-4820', 'demo-player-5573', 'demo-player-7298'],
    incoming: ['demo-player-6041', 'demo-player-8364'],
    outgoing: ['demo-player-9127'],
  },
  pixel: {
    friends: ['demo-user-7721', 'demo-player-9950', 'demo-player-6041', 'demo-player-9127'],
    incoming: ['demo-player-3105'],
    outgoing: ['demo-player-4820'],
  },
};
