import { gameTests } from '../reviewsData';
import { gameReleases } from '../releasesData';

const news = [
  ['Kingdom Hearts 4 — Le monde de Coco', 'Sora est apparu au milieu d’une séquence Disney consacrée à Coco.', '/news/kingdom-hearts-4-coco', 'square enix disney'],
  ['Marvel’s Wolverine', 'Une exclusivité PS5 développée par Insomniac Games.', '/news/wolverine-exclu-ps5', 'marvel sony insomniac ps5'],
  ['Fire Emblem: Fortune’s Weave', 'Le nouvel épisode revient sur ses quatre protagonistes et ses scénarios croisés.', '/news/fire-emblem-fortunes-weave', 'nintendo switch 2'],
  ['Rayman Legends Retold', 'Le remaster Ubisoft est repoussé au 3 décembre 2026.', '/news/rayman-legends-retold', 'ubisoft remaster'],
  ['Cyberpunk 2077 change de quartier', 'L’Ultimate Edition rejoindra Battle.net plus tard cette année.', '/news/cyberpunk-2077-battlenet', 'cd projekt red blizzard pc'],
  ['Persona 6 arrive en physique', 'Le prochain épisode de Persona aura aussi une édition physique sur Switch 2.', '/news/persona-6-switch-2', 'sega atlus switch 2'],
  ['Le mod multijoueur de The Last of Us II', 'Sony a demandé l’arrêt d’un projet de fans sur la version PC.', '/news/last-of-us-ii-mod', 'playstation sony pc'],
  ['StarCraft passe au FPS', 'Blizzard prépare un shooter en monde ouvert dans l’univers StarCraft.', '/news/starcraft-fps', 'blizzard fps'],
  ['Diablo V se prépare', 'Le prochain chapitre arrivera au printemps 2029.', '/news/diablo-v', 'blizzard action rpg'],
  ['Diablo IV arrive sur Switch 2', 'La collection Age of Hatred réunit le jeu et ses extensions.', '/news/diablo-switch-2', 'blizzard nintendo'],
  ['Diablo étend son univers', 'Une série animée Diablo est en préparation pour Netflix.', '/news/diablo-netflix', 'blizzard netflix'],
  ['Monster Hunter Wilds sur Switch 2', 'Monster Hunter Wilds fixe sa sortie au 4 décembre 2026.', '/news/monster-hunter-wilds', 'capcom switch 2'],
  ['Zelda fête ses 40 ans', 'Nintendo dévoile une Switch 2, une manette Pro et deux amiibo.', '/news/zelda-40th', 'nintendo switch 2 ocarina of time'],
  ['Metroid Ravenous', 'La nouvelle aventure 2D de Samus arrivera sur Nintendo Switch 2.', '/news/metroid-ravenous', 'nintendo metroid switch 2'],
  ['Wardogs', 'Le jeu de stratégie et de mercenaires arrive sur PC.', '/news/wardogs', 'pc stratégie'],
  ['Physint', 'Le projet de jeu d’action espion de PlayStation.', '/news/physint', 'playstation sony'],
  ['Zelda: Ocarina of Time', 'Le classique de Nintendo revient sur Switch 2.', '/news/zelda-ocarina', 'nintendo zelda switch 2'],
  ['Onimusha: Way of the Sword', 'Le retour samouraï de Capcom dépasse le million de ventes.', '/news/onimusha-million', 'capcom samouraï'],
].map(([title, description, route, keywords]) => ({ type: 'news', title, description, route, keywords }));

const dossiers = [
  ['La PS2, la reine', 'Vingt-cinq ans après son lancement, retour sur la PlayStation 2.', '/dossiers/25-ans-playstation-2', 'playstation sony histoire'],
  ['La Xbox 360, une génération', 'Retour sur Xbox Live, la haute définition et le Red Ring of Death.', '/dossiers/20-ans-xbox-360', 'xbox microsoft histoire'],
  ['Le choc des générations', 'Les consoles, les jeux et les communautés qui ont façonné notre manière de jouer.', '/dossiers/choc-generations-gaming', 'culture gaming consoles'],
  ['La PlayStation 1, une révolution', 'Retour sur la console qui a fait passer le jeu vidéo aux CD et à la 3D.', '/dossiers/heritage-playstation-1', 'playstation sony histoire'],
  ['Let’s Play Awards 2025', 'Les jeux qui ont marqué l’année et le choix du GOTY.', '/dossiers/let-play-awards-2025', 'awards gaming goty'],
  ['GOYA et HicoSoft Studio', 'Dans les coulisses du projet GOYA et de la scène indépendante algérienne.', '/dossiers/goya-hicosoft', 'goya hicosoft algérie indépendant'],
  ['Games & Comic Con Dzair 2026', 'Cosplay, invités, découvertes et communauté gaming.', '/dossiers/games-comic-con-dzair', 'comic con culture algérie'],
  ['Pourquoi les Souls ?', 'Difficulté, narration, dopamine de la victoire et communauté.', '/dossiers/pourquoi-les-souls', 'souls fromsoftware analyse'],
].map(([title, description, route, keywords]) => ({ type: 'dossier', title, description, route, keywords }));

const reviews = gameTests.map((test) => ({
  type: 'review',
  title: test.name,
  description: test.excerpt,
  route: test.route,
  keywords: [test.platforms, test.genre, test.studio, test.cardTitle].join(' '),
  meta: `${test.score}/10 · ${test.platforms}`,
}));

const releases = gameReleases.map((game) => ({
  type: 'release',
  title: game.title,
  description: `${game.platforms} · sortie prévue au calendrier`,
  route: game.to || '/calendrier',
  keywords: game.platforms,
  meta: game.year ? `${game.day}/${game.month}/${game.year}` : `${game.day}/${game.month}/2026`,
}));

export const searchIndex = [...news, ...reviews, ...dossiers, ...releases];

export function normalizeSearch(value = '') {
  return String(value)
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

export function searchContent(query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);

  return searchIndex
    .map((item) => {
      const title = normalizeSearch(item.title);
      const description = normalizeSearch(item.description);
      const keywords = normalizeSearch(item.keywords);
      const searchable = `${title} ${description} ${keywords}`;
      const score = terms.reduce((total, term) => (
        total + (title.includes(term) ? 8 : 0) + (keywords.includes(term) ? 4 : 0) + (description.includes(term) ? 2 : 0)
      ), 0) + (title === normalized ? 10 : 0);
      return { ...item, score, searchable };
    })
    .filter((item) => terms.every((term) => item.searchable.includes(term)))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export const searchCounts = {
  news: news.length,
  review: reviews.length,
  dossier: dossiers.length,
  release: releases.length,
};
