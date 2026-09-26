import { gameTests } from '../reviewsData';
import { gameReleases } from '../releasesData';
import { quizzes as quizCatalog, quizLabel, quizQuestionsCount } from '../quizzesData';
import { baseUrl as base } from '../data';
import { youTubeThumbUrl } from '../lib/videoThumbnails';
// Les actus du jour générées par le robot rejoignent l’index de recherche.
import { autoSearchEntries } from '../lib/autoNews';

const news = [
  ['Steel Ball Run — la course reprend', 'L’épisode 2 ouvre onze épisodes hebdomadaires sur Netflix, chaque vendredi jusqu’au 4 décembre.', '/news/cinema/jojo-steel-ball-run-episode-2', 'jojo steel ball run netflix anime david production gyro zeppeli johnny joestar', 'cinema-jojo-steel-ball-run.jpg'],
  ['Dune: Messiah — le trailer arrive', 'Première bande-annonce en fin d’année, sortie en 2027 : Villeneuve referme la prophétie de Paul Atréides.', '/news/cinema/dune-messiah-trailer', 'dune messiah villeneuve warner bros chalamet zendaya', 'cinema-dune-messiah.jpg'],
  ['The Last of Us saison 3 confirmée', 'HBO adapte la seconde moitié de Part II, du point de vue d’Abby.', '/news/cinema/last-of-us-saison-3', 'hbo the last of us série abby ellie Naughty Dog', 'last-of-us-mod-news.jpg'],
  ['Doctor Doom prend les rênes du MCU', 'Robert Downey Jr. masqué, d’Avengers: Doomsday jusqu’à Secret Wars.', '/news/cinema/marvel-doctor-doom', 'marvel doctor doom robert downey jr avengers doomsday secret wars', 'cinema-doctor-doom.jpg'],
  ['Stranger Things 5 : date et trailer', 'La saison finale arrive en mars 2027 sur Netflix, huit épisodes.', '/news/cinema/stranger-things-saison-5', 'netflix stranger things vecna hawkins saison finale', 'cinema-stranger-things.jpg'],
  ['Joker 2 divise encore', 'Bilan d’un malentendu : la comédie musicale de Todd Phillips continue de fendre le public.', '/news/cinema/joker-folie-a-deux', 'joker folie à deux warner phoenix lady gaga todd phillips', 'cinema-joker.jpg'],
  ['House of the Dragon : tournage de la saison 3', 'La Danse des Dragons entre dans sa phase brutale, retour attendu en 2027.', '/news/cinema/house-of-dragon-saison-3', 'hbo house of the dragon westeros danse des dragons', 'cinema-hotd.jpg'],
  ['Blade retrouve un réalisateur', 'Sept ans de chantier et, enfin, un capitaine pour le Daywalker de Mahershala Ali.', '/news/cinema/blade-reboot', 'marvel blade mahershala ali daywalker reboot', 'cinema-blade.jpg'],
  ['Arcane saison 2 : dernière ligne droite', 'Les affiches de la saison finale arrivent, à quelques semaines de la sortie sur Netflix.', '/news/cinema/arcane-saison-2', 'arcane netflix riot games zaun piltover fortiche', 'cinema-arcane.jpg'],
  ['EA Sports FC 27 — la carrière devient vivante', 'Note globale dynamique, valeur marchande hebdomadaire via TransferRoom et scénarios créés par la communauté.', '/news/ea-sports-fc-27-carriere-dynamique', 'ea sports fc 27 electronic arts football carrière transferts manager', 'ea-sports-fc-27-carriere-pitch-notes.jpg'],
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

// `slug` : la page de recherche et la recherche instantanée de la nav s'en
// servent pour reconnaître un quizz TERMINÉ (ses trois niveaux faits) et le
// griser comme sur la grille `/quizz`.
const quizzes = quizCatalog.map((quiz) => ({
  type: 'quiz',
  slug: quiz.slug,
  title: quizLabel(quiz.labels, 'fr')?.title || quiz.slug,
  description: quizLabel(quiz.labels, 'fr')?.text || '',
  route: quiz.route,
  keywords: quiz.keywords,
  meta: `${quizQuestionsCount(quiz)} questions`,
  image: quiz.image || youTubeThumbUrl(quiz.videoId, 'hq'),
}));

export const searchIndex = [...news, ...reviews, ...dossiers, ...releases, ...quizzes];

export function normalizeSearch(value = '') {
  return String(value).toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[’'`]/g, '').replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
}

export function searchContent(query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);
  const matchesToken = (tokens, term) => tokens.some((token) => token === term || (term.length >= 3 && token.startsWith(term)));
  const matchesAll = (tokens) => terms.every((term) => matchesToken(tokens, term));
  const scored = searchIndex.map((item) => {
    const title = normalizeSearch(item.title), description = normalizeSearch(item.description), keywords = normalizeSearch(item.keywords);
    const titleTokens = title.split(' '), descriptionTokens = description.split(' '), keywordTokens = keywords.split(' ');
    const titleMatch = matchesAll(titleTokens), keywordMatch = matchesAll(keywordTokens), metadataMatch = titleMatch || keywordMatch;
    const descriptionMatch = matchesAll(descriptionTokens);
    const score = terms.reduce((total, term) => (
      total + (titleTokens.includes(term) ? 12 : 0) + (keywordTokens.includes(term) ? 6 : 0) + (descriptionTokens.includes(term) ? 1 : 0)
    ), 0) + (title === normalized ? 20 : 0);
    return { ...item, score, metadataMatch, descriptionMatch };
  });
  const strongMatches = scored.filter((item) => item.metadataMatch);
  const matches = strongMatches.length ? strongMatches : scored.filter((item) => item.descriptionMatch);
  return matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export const searchCounts = { news: news.length + autoSearchEntries.length, review: reviews.length, dossier: dossiers.length, release: releases.length, quiz: quizzes.length };
