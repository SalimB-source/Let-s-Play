// Entrées « actus du jour » générées par le robot (scripts/news-bot/).
// Le fichier src/news/autoIndex.js est généré automatiquement : il est vide
// au départ et se remplit à chaque exécution du robot (GitHub Actions ou
// run local). Toute la page Actus, les routes /news/<slug> et la recherche
// interne dérivent d’ici — aucun autre endroit du site à modifier.
import { autoStories } from '../news/autoIndex';
import { baseUrl as base } from '../data';

const storyNumber = (label) => {
  const [day, month, year] = label.split('.').map(Number);
  return year * 10000 + month * 100 + day;
};

// Articles du robot repris en version éditoriale complète dans CurrentNews.jsx
// (évite les doublons dans la grille GamingNews et dans la recherche).
const SUPERSEDED_AUTO_SLUGS = new Set([
  'physint-un-budget-de-400-millions-de-dollars-pour-le-jeu-de',
  'pendant-4h-cette-nuit-etat-de-grace-gta-6-allait-etre-jouabl',
]);

export const autoNewsStories = Object.values(autoStories)
  .filter((story) => !SUPERSEDED_AUTO_SLUGS.has(story.slug))
  .sort((a, b) => storyNumber(b.date) - storyNumber(a.date));

const listingOf = (story) => ({
  to: `/news/${story.slug}`,
  image: story.thumbnail || story.image,
  alt: story.imageAlt,
  badge: story.category,
  kicker: `${story.date} · ${(story.sourceName || story.cover || 'RÉDACTION').toUpperCase()}`,
  title: `${story.title} ${story.accent}`.trim(),
  excerpt: story.dek,
  read: 'LIRE L’ARTICLE',
  sentiment: story.sentiment || 'mixed',
});

// Format attendu par la liste des actus (src/pages/News.jsx).
export const autoNewsListing = autoNewsStories.map(listingOf);

// Format attendu par l’index de recherche (src/search/searchIndex.js).
export const autoSearchEntries = autoNewsStories.map((story) => ({
  type: 'news',
  title: `${story.title} ${story.accent}`.trim(),
  description: story.dek,
  route: `/news/${story.slug}`,
  keywords: `${story.category} ${story.cover} ${story.sourceName || ''}`.toLowerCase(),
  image: `${base}${story.thumbnail || story.image}`,
}));
