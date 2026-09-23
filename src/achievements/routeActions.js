/**
 * Traduction d'une URL en actions de succès (logique pure).
 * ---------------------------------------------------------
 * Une seule table dit ce que chaque route du site apporte :
 *
 *   - la *section* visitée (accueil, actus, tests, dossiers, events,
 *     calendrier, recherche, succès, compte) ;
 *   - l'*article* lu, avec sa famille (actu / test / dossier) et son
 *     identifiant (le slug), pour ne compter qu'une fois chaque contenu.
 *
 * Les routes sont celles que voit le routeur : le `basename` (préfixe du
 * déploiement) est déjà retiré du `pathname`.
 */

/** Sections du site qui comptent pour « explorateur » / « grand tour ». */
export const SECTION_ROUTES = {
  '/': 'home',
  '/news': 'news',
  '/reviews': 'reviews',
  '/dossiers': 'dossiers',
  '/events': 'events',
  '/partenaires': 'events',
  '/calendrier': 'calendrier',
  '/calendar': 'calendrier',
  '/search': 'search',
  '/quizz': 'quizzes',
  '/quiz': 'quizzes',
  '/auth': 'account',
  '/register': 'account',
  '/profile': 'account',
  '/profil': 'account',
  '/u': 'account',
};

// Familles d'articles : préfixe → type retenu par le moteur.
const ARTICLE_SECTIONS = [
  { prefix: '/news/', section: 'news', kind: 'news' },
  { prefix: '/reviews/', section: 'reviews', kind: 'review' },
  { prefix: '/dossiers/', section: 'dossiers', kind: 'dossier' },
];

/**
 * Section d'une route : correspondance exacte, sinon la route parente la plus
 * précise (`/events/7ouma-arena` → section « events »).
 */
function sectionFor(path) {
  if (SECTION_ROUTES[path]) return SECTION_ROUTES[path];
  let best = null;
  for (const route of Object.keys(SECTION_ROUTES)) {
    if (route === '/' || !path.startsWith(`${route}/`)) continue;
    if (!best || route.length > best.length) best = route;
  }
  return best ? SECTION_ROUTES[best] : null;
}

/**
 * Décrit ce qu'une visite de `pathname` représente.
 *
 * @param {string} pathname chemin du routeur (sans basename)
 * @returns {{ section: string|null, article: { kind: string, id: string }|null }}
 */
export function describeRoute(pathname = '/') {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';

  for (const entry of ARTICLE_SECTIONS) {
    if (path.startsWith(entry.prefix)) {
      const id = path.slice(entry.prefix.length).split('/')[0];
      return {
        section: entry.section,
        article: id ? { kind: entry.kind, id } : null,
      };
    }
  }

  return { section: sectionFor(path), article: null };
}

/** Comptes tiers liés à une session Supabase (`google`, `azure` → `microsoft`). */
export function linkedProviders(user) {
  if (!user) return [];
  const found = new Set();
  const appProviders = user.app_metadata?.providers;
  if (Array.isArray(appProviders)) appProviders.forEach((provider) => provider && found.add(provider));
  if (user.app_metadata?.provider) found.add(user.app_metadata.provider);
  if (Array.isArray(user.identities)) {
    user.identities.forEach((identity) => identity?.provider && found.add(identity.provider));
  }
  const linked = [];
  if (found.has('google')) linked.push('google');
  if (found.has('azure') || found.has('microsoft')) linked.push('microsoft');
  return linked;
}
