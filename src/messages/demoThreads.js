/**
 * Discussions de démonstration.
 * -----------------------------
 * Les personas de démonstration (`src/auth/demoProfiles.js`) n'ont pas de
 * session Supabase : leurs messages vivent dans localStorage, comme leurs
 * amis et leurs commentaires. Ce fichier fournit le contenu scripté de cet
 * aperçu — discussions de départ, réponses automatiques des joueurs en ligne
 * et messages qui arrivent tout seuls au fil des minutes.
 *
 * Tout est **déterministe** : les horodatages sont calculés à partir de
 * `seededAt` (l'heure du premier chargement) et les réponses suivent l'ordre
 * du catalogue. Deux onglets ouverts sur le même appareil voient la même
 * chose, et `npm run check:messages` peut rejouer la logique sans DOM.
 *
 * Chaque discussion de départ ne cite que des **amis** de la persona
 * (`DEMO_INITIAL_STATE` de `src/friends/demoRoster.js`) : la messagerie est
 * réservée aux amis, y compris dans l'aperçu.
 */

/** Longueur maximale d'un message (identique à la contrainte SQL). */
export const MESSAGE_MAX_LENGTH = 1000;

/**
 * Discussions de départ, par persona : liste de messages du plus ancien au
 * plus récent. `mine` = écrit par la persona ; `read: false` sur un message
 * reçu = non lu (le badge du lanceur les compte). `minutesAgo` est relatif à
 * l'heure du premier chargement.
 */
export const DEMO_THREADS = {
  vortex: {
    'demo-player-3105': [
      { mine: false, body: 'Salam ! Tu es chaud pour une session Tekken 8 ce soir ?', minutesAgo: 190 },
      { mine: true, body: 'Toujours. Je finis le dossier Souls et j’arrive.', minutesAgo: 186 },
      { mine: false, body: 'Parfait. Je chauffe la PS5, on se capte à 21 h.', minutesAgo: 42, read: false },
    ],
    'demo-player-4820': [
      { mine: false, body: 'Tu as vu la news sur le GTA VI et la DualSense ?', minutesAgo: 60 * 26 },
      { mine: true, body: 'Oui, le retour haptique sur les gâchettes a l’air dingue.', minutesAgo: 60 * 25 },
      { mine: false, body: 'Je te prête mon test si tu veux écrire dessus 😉', minutesAgo: 60 * 24, read: true },
    ],
    'demo-player-5573': [
      { mine: true, body: 'Bien joué pour ton run sur Metroid, le chrono est propre.', minutesAgo: 60 * 30 },
      { mine: false, body: 'Merci ! Il me manque 12 secondes sur le dernier boss.', minutesAgo: 60 * 29, read: false },
    ],
    'demo-user-8842': [
      { mine: false, body: 'Le co-op de dimanche tient toujours ?', minutesAgo: 95 },
      { mine: true, body: 'Oui, je stream la session sur la chaîne.', minutesAgo: 90 },
      { mine: false, body: 'Top, je prépare la playlist 🎧', minutesAgo: 88, read: true },
    ],
  },
  pixel: {
    'demo-user-7721': [
      { mine: false, body: 'J’ai fini le test d’Onimusha, tu le relis avant publication ?', minutesAgo: 220 },
      { mine: true, body: 'Envoie-le, je regarde ce soir.', minutesAgo: 210 },
      { mine: false, body: 'C’est parti. La note est sévère mais argumentée 😄', minutesAgo: 35, read: false },
    ],
    'demo-player-9950': [
      { mine: false, body: 'Tu viens à la 7ouma Arena cette année ?', minutesAgo: 60 * 20 },
      { mine: true, body: 'Si le planning le permet, oui !', minutesAgo: 60 * 19, read: true },
    ],
    'demo-player-6041': [
      { mine: true, body: 'Merci pour le tips sur le donjon de l’eau.', minutesAgo: 60 * 8 },
      { mine: false, body: 'Avec plaisir — le hookshot change tout.', minutesAgo: 60 * 7, read: false },
    ],
  },
};

/**
 * Réponses automatiques des joueurs scriptés. Un joueur « en ligne » répond
 * quelques secondes après le message de la persona ; le catalogue tourne en
 * boucle, donc la conversation continue sans jamais se répéter trop vite.
 */
export const DEMO_REPLIES = {
  'demo-player-3105': [
    'Ça marche, je lance le lobby.',
    'Tu as vu le patch notes ? Ils ont nerfé mon main 😅',
    'On se fait un best-of 5 ?',
    'Je suis chaud, donne-moi 5 minutes.',
  ],
  'demo-player-4820': [
    'Je viens de finir le chapitre 4, c’est superbe.',
    'Tu écris un article dessus ? Je te passe mes captures.',
    'La bande-son est incroyable sur ce passage.',
    'Je te rejoins dès que ma partie est finie.',
  ],
  'demo-player-5573': [
    'Je regarde ça en rentrant du boulot.',
    'Merci ! Je retente le run ce week-end.',
    'Tu as le lien du dossier ?',
  ],
  'demo-player-6041': [
    'Le secret c’est de sauvegarder avant le saut.',
    'Je t’envoie la soluce complète.',
    'On se fait la coop dimanche ?',
  ],
  'demo-player-7298': [
    'Désolé, je sors d’un marathon de speedruns.',
    'Je te réponds ce soir, promis.',
  ],
  'demo-player-8364': [
    'Trop bien ! Je note ça.',
    'Je suis en train d’y jouer là, viens !',
  ],
  'demo-player-9127': [
    'Reçu, je regarde après ma partie.',
    'Le prochain tournoi est annoncé, tu viens ?',
  ],
  'demo-player-9950': [
    'J’adore ce jeu, tu as vu la fin secrète ?',
    'Je te passe mon build si tu veux.',
  ],
  'demo-player-2214': [
    'Ok pour moi, on se capte en ligne.',
    'Je viens de finir ma session arcade.',
  ],
  'demo-player-2790': [
    'La guilde t’attend ce soir.',
    'Je te reserve une place dans le raid.',
  ],
  'demo-user-7721': [
    'Parfait, je m’en occupe.',
    'Je te réponds entre deux parties.',
    'Bien vu, je n’avais pas pensé à ça.',
  ],
  'demo-user-8842': [
    'Super, je prépare le stream.',
    'Je t’envoie les assets dans la soirée.',
    'On en reparle après la session 🎮',
  ],
};

/** Réponse par défaut quand un joueur n'a pas de catalogue. */
export const DEMO_REPLIES_FALLBACK = [
  'Bien reçu !',
  'Je te réponds vite.',
  'On en reparle en ligne.',
];

/** Délai avant la réponse d'un joueur scripté « en ligne ». */
export const DEMO_REPLY_DELAY_MS = 2800;

/**
 * Messages qui arrivent tout seuls dans l'aperçu, pour montrer le temps réel
 * et le badge des non-lus sans backend : chacun part `afterMs` millisecondes
 * après le premier chargement de la persona.
 */
export const DEMO_INCOMING = {
  vortex: [
    { afterMs: 25 * 1000, from: 'demo-player-3105', body: 'Je viens de te challenger — regarde ta liste d’amis 👀' },
    { afterMs: 100 * 1000, from: 'demo-user-8842', body: 'Le replay de la session est en ligne, dis-moi ce que tu en penses.' },
    { afterMs: 6 * 60 * 1000, from: 'demo-player-4820', body: 'Nouvelle démo dispo, je te fais suivre le lien.' },
  ],
  pixel: [
    { afterMs: 25 * 1000, from: 'demo-user-7721', body: 'Test relu, deux fautes corrigées — tu peux publier.' },
    { afterMs: 100 * 1000, from: 'demo-player-6041', body: 'J’ai battu mon chrono grâce à ton astuce, merci !' },
    { afterMs: 6 * 60 * 1000, from: 'demo-player-9950', body: 'Co-op à 21 h, tu es partante ?' },
  ],
};

/** Réponse scriptée d'un joueur : le catalogue tourne en boucle. */
export function demoReplyFor(peerId, index = 0) {
  const pool = DEMO_REPLIES[peerId] || DEMO_REPLIES_FALLBACK;
  const slot = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  return pool[slot % pool.length];
}

/** Message de démonstration normalisé (même forme que les lignes SQL). */
export function demoMessage(id, peerId, key, mine, body, at, read) {
  return { id, peerId, key, mine, body, createdAt: at, read: Boolean(read) };
}

/**
 * État de départ d'une persona : discussions de départ horodatées à partir de
 * `now`, aucun blocage, aucun signalement, aucun message scripté délivré.
 */
export function seedDemoThreadState(personaKey, now = Date.now()) {
  const seededAt = new Date(now).toISOString();
  const threads = {};
  const seeded = DEMO_THREADS[personaKey] || {};
  for (const [peerId, list] of Object.entries(seeded)) {
    threads[peerId] = list.map((message, index) => ({
      id: `demo-${peerId}-${index + 1}`,
      from: message.mine ? 'me' : 'them',
      body: message.body,
      at: new Date(now - (message.minutesAgo || 0) * 60 * 1000).toISOString(),
      read: message.mine ? true : message.read !== false,
    }));
  }
  return { seededAt, threads, blocked: [], reported: {}, deliveredIncoming: 0, replyCounters: {} };
}

/**
 * Messages scriptés arrivés à échéance (`afterMs` écoulé depuis `seededAt`)
 * et pas encore délivrés. Déterministe : même `now` → même liste.
 */
export function dueDemoIncoming(state, personaKey, now = Date.now()) {
  const script = DEMO_INCOMING[personaKey] || [];
  const seededAt = Date.parse(state?.seededAt || '');
  if (!Number.isFinite(seededAt)) return [];
  const delivered = Number.isFinite(state?.deliveredIncoming) ? state.deliveredIncoming : 0;
  const due = [];
  for (let index = delivered; index < script.length; index += 1) {
    const event = script[index];
    if (now - seededAt >= (event.afterMs || 0)) due.push({ index, ...event });
    else break;
  }
  return due;
}
