import { gameTests } from '../reviewsData';
import { gameReleases } from '../releasesData';
import { baseUrl as base } from '../data';
import { youTubeThumbUrl } from '../lib/videoThumbnails';

const news = [
  ['Kingdom Hearts 4 — Le monde de Coco', 'Sora est apparu au milieu d’une séquence Disney consacrée à Coco.', '/news/kingdom-hearts-4-coco', 'square enix disney', 'kingdom-hearts-4-coco-news.jpg'],
  ['Marvel’s Wolverine', 'Une exclusivité PS5 développée par Insomniac Games.', '/news/wolverine-exclu-ps5', 'marvel sony insomniac ps5', 'wolverine-countdown.jpg'],
  ['Fire Emblem: Fortune’s Weave', 'Le nouvel épisode revient sur ses quatre protagonistes et ses scénarios croisés.', '/news/fire-emblem-fortunes-weave', 'nintendo switch 2', 'fire-emblem-fortunes-weave-news.jpg'],
  ['Rayman Legends Retold', 'Le remaster Ubisoft est repoussé au 3 décembre 2026.', '/news/rayman-legends-retold', 'ubisoft remaster', 'rayman-legends-retold-news.jpg'],
  ['Cyberpunk 2077 change de quartier', 'L’Ultimate Edition rejoindra Battle.net plus tard cette année.', '/news/cyberpunk-2077-battlenet', 'cd projekt red blizzard pc', 'cyberpunk-2077-battlenet-news.webp'],
  ['Persona 6 arrive en physique', 'Le prochain épisode de Persona aura aussi une édition physique sur Switch 2.', '/news/persona-6-switch-2', 'sega atlus switch 2', 'persona-6-news.jpg'],
  ['Le mod multijoueur de The Last of Us II', 'Sony a demandé l’arrêt d’un projet de fans sur la version PC.', '/news/last-of-us-ii-mod', 'playstation sony pc', 'last-of-us-mod-news.jpg'],
  ['StarCraft passe au FPS', 'Blizzard prépare un shooter en monde ouvert dans l’univers StarCraft.', '/news/starcraft-fps', 'blizzard fps', 'starcraft-fps-news.jpeg'],
  ['Diablo V se prépare', 'Le prochain chapitre arrivera au printemps 2029.', '/news/diablo-v', 'blizzard action rpg', 'diablo-v-news.png'],
  ['Diablo IV arrive sur Switch 2', 'La collection Age of Hatred réunit le jeu et ses extensions.', '/news/diablo-switch-2', 'blizzard nintendo', 'diablo-switch2-news.jpg'],
  ['Diablo étend son univers', 'Une série animée Diablo est en préparation pour Netflix.', '/news/diablo-netflix', 'blizzard netflix', 'diablo-netflix-news.webp'],
  ['Monster Hunter Wilds sur Switch 2', 'Monster Hunter Wilds fixe sa sortie au 4 décembre 2026.', '/news/monster-hunter-wilds', 'capcom switch 2', 'monster-hunter-wilds-switch2.jpg'],
  ['Zelda fête ses 40 ans', 'Nintendo dévoile une Switch 2, une manette Pro et deux amiibo.', '/news/zelda-40th', 'nintendo switch 2 ocarina of time', 'zelda-40th-switch2.jpg'],
  ['Metroid Ravenous', 'La nouvelle aventure 2D de Samus arrivera sur Nintendo Switch 2.', '/news/metroid-ravenous', 'nintendo metroid switch 2', 'metroid-ravenous-news.png'],
  ['Wardogs', 'Le jeu de stratégie et de mercenaires arrive sur PC.', '/news/wardogs', 'pc stratégie', 'wardogs-news.jpg'],
  ['Physint', 'Le projet de jeu d’action espion de PlayStation.', '/news/physint', 'playstation sony', 'physint-news.jpg'],
  ['Zelda: Ocarina of Time', 'Le classique de Nintendo revient sur Switch 2.', '/news/zelda-ocarina', 'nintendo zelda switch 2', 'zelda-ocarina-news.jpg'],
  ['Onimusha: Way of the Sword', 'Le retour samouraï de Capcom dépasse le million de ventes.', '/news/onimusha-million', 'capcom samouraï', 'onimusha-million-news.jpg'],
].map(([title, description, route, keywords, image]) => ({ type: 'news', title, description, route, keywords, image: `${base}${image}` }));

const dossiers = [
  ['La PS2, la reine', 'Vingt-cinq ans après son lancement, retour sur la PlayStation 2.', '/dossiers/25-ans-playstation-2', 'playstation sony histoire', 'A2VPhWOUMHI'],
  ['La Xbox 360, une génération', 'Retour sur Xbox Live, la haute définition et le Red Ring of Death.', '/dossiers/20-ans-xbox-360', 'xbox microsoft histoire', '8NqnTzVh5O0'],
  ['Le choc des générations', 'Les consoles, les jeux et les communautés qui ont façonné notre manière de jouer.', '/dossiers/choc-generations-gaming', 'culture gaming consoles', 't1Re8ki_gsw'],
  ['La PlayStation 1, une révolution', 'Retour sur la console qui a fait passer le jeu vidéo aux CD et à la 3D.', '/dossiers/heritage-playstation-1', 'playstation sony histoire', 'oOyW_rjiZ5w'],
  ['Let’s Play Awards 2025', 'Les jeux qui ont marqué l’année et le choix du GOTY.', '/dossiers/let-play-awards-2025', 'awards gaming goty', '0ThNyFItASM'],
  ['GOYA et HicoSoft Studio', 'Dans les coulisses du projet GOYA et de la scène indépendante algérienne.', '/dossiers/goya-hicosoft', 'goya hicosoft algérie indépendant', 'aTs0zhm6Leg'],
  ['Games & Comic Con Dzair 2026', 'Cosplay, invités, découvertes et communauté gaming.', '/dossiers/games-comic-con-dzair', 'comic con culture algérie', 'HzigJZOxz2o'],
  ['Pourquoi les Souls ?', 'Difficulté, narration, dopamine de la victoire et communauté.', '/dossiers/pourquoi-les-souls', 'souls fromsoftware analyse', 'OH51fSHznwg'],
].map(([title, description, route, keywords, videoId]) => ({ type: 'dossier', title, description, route, keywords, image: youTubeThumbUrl(videoId, 'hq') }));

const reviews = gameTests.map((test) => ({
  type: 'review', title: test.name, description: test.excerpt, route: test.route,
  keywords: [test.platforms, test.genre, test.studio, test.cardTitle].join(' '),
  meta: `${test.score}/10 · ${test.platforms}`, image: test.image,
}));

const releases = gameReleases.map((game) => ({
  type: 'release', title: game.title, description: `${game.platforms} · sortie prévue au calendrier`,
  route: game.to || '/calendrier', keywords: game.platforms,
  meta: game.year ? `${game.day}/${game.month}/${game.year}` : `${game.day}/${game.month}/2026`,
  image: game.image ? `${base}${game.image}` : null,
}));

export const searchIndex = [...news, ...reviews, ...dossiers, ...releases];

export function normalizeSearch(value = '') {
  return String(value).toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[’'`]/g, '').replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
}

export function searchContent(query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);
  return searchIndex.map((item) => {
    const title = normalizeSearch(item.title), description = normalizeSearch(item.description), keywords = normalizeSearch(item.keywords);
    const searchable = `${title} ${description} ${keywords}`;
    const score = terms.reduce((total, term) => total + (title.includes(term) ? 8 : 0) + (keywords.includes(term) ? 4 : 0) + (description.includes(term) ? 2 : 0), 0) + (title === normalized ? 10 : 0);
    return { ...item, score, searchable };
  }).filter((item) => terms.every((term) => item.searchable.includes(term))).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export const searchCounts = { news: news.length, review: reviews.length, dossier: dossiers.length, release: releases.length };
