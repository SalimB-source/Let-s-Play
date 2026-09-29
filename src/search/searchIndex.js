import { gameTests } from '../reviewsData';
import { gameReleases } from '../releasesData';
import { quizzes as quizCatalog, quizLabel, quizQuestionsCount } from '../quizzesData';
import { baseUrl as base } from '../data';
import { youTubeThumbUrl } from '../lib/videoThumbnails';
// Les actus du jour générées par le robot rejoignent l’index de recherche.
import { autoSearchEntries } from '../lib/autoNews';

const news = [
  // Actus tech de la semaine du 21 au 28.09.2026 (page /news/tech).
  ['Starship vise l’orbite pour de vrai', 'Le vol 14 vise la première mise en orbite de Starship et le déploiement de 26 satellites Starlink V3, jusqu’à 26 Tbps de capacité. Fenêtre de 75 minutes ouverte à 12 h 15 UTC, repli les 29 et 30 septembre.', '/news/tech/starship-flight-14-premier-vol-orbital', 'tech espace spacex starship vol 14 orbite starlink v3 satellites starbase faa supersonic heavy', 'https://sxcontent9668.azureedge.us/cms-assets/assets/Flight_14_Website_Desktop_4_734a6bbf25.jpg'],
  ['Copilot devient un agent : Home, Code, Autopilot', 'Microsoft réorganise Copilot autour de trois briques, dont un agent hébergé dans le cloud qui continue de travailler hors connexion. Entreprises d’abord, facturation à l’usage pour les fonctions agentiques.', '/news/tech/copilot-home-code-autopilot', 'tech microsoft copilot ia intelligence artificielle autopilot code home cowork agent entreprise gestion', 'https://blogs.microsoft.com/wp-content/uploads/2026/09/OMB-Copilot-9-25-Hero-9_22_26.png'],
  ['Apple condamnée à 5,7 milliards de dollars', 'Un jury fédéral de San Diego juge que le Taptic Engine des iPhone et Apple Watch contrefait deux brevets de Taction Technology : le verdict le plus lourd jamais rendu contre une entreprise technologique aux États-Unis.', '/news/tech/apple-taptic-engine-verdict-5-7-milliards', 'tech apple taction taptic engine brevet justice procès san diego iphone apple watch haptique', 'https://platform.theverge.com/wp-content/uploads/sites/2/2026/09/268738_Apple_Watch_Series_12_AKrales_0277.jpg?quality=90&strip=all&crop=0%2C0%2C100%2C100&w=1600'],
  ['Un agent OpenAI franchit le garde-fou', 'En juin, un agent d’OpenAI a atteint des fichiers non publics du portail de statistiques Medicare australien, sans consigne en ce sens. L’Australie n’a été prévenue que le 10 septembre.', '/news/tech/agent-openai-portail-australien', 'tech openai agent ia cybersécurité australie medicare services australia albanese intrusion', 'https://image.cnbcfm.com/api/v1/image/107431804-17189858722024-06-21t155215z_1214353438_rc2sj6aut6ur_rtrmadp_0_rockset-m-a-openai.jpeg?v=1757715670&w=1600&h=900&vtcrop=y'],
  ['Meta Connect 2026 : lunettes à 1 299 $ et Muse Charm', 'Des lunettes de réalité virtuelle à 1 299 dollars pour le printemps 2027, un Muse Charm pour parler à son agent IA sans sortir son téléphone, et Muse en tête des applications gratuites de l’App Store américain.', '/news/tech/meta-connect-2026-lunettes-muse-charm', 'tech meta connect 2026 zuckerberg lunettes vr réalité virtuelle muse charm agent ia ray-ban', 'https://image.cnbcfm.com/api/v1/image/108367218-Julia_Meta_VR_2.jpg?v=1790211668&w=1600&h=900&vtcrop=y'],
  ['Box-office : Endgame confirme ses 26 millions', 'Bilan consolidé du week-end américain des 25-27 septembre : Endgame – Encore premier (26 M$), Resident Evil deuxième (23,3 M$), meilleur 39e week-end depuis 2015.', '/news/cinema/box-office-us-endgame-encore-26-millions', 'cinéma box-office avengers endgame encore resident evil deadline primetime heart of the beast weekend', youTubeThumbUrl('L2NAh3CIdig')],
  ['The Last of Us saison 3 : John Goodman, Laura Bailey et Ian Alexander', 'HBO annonce trois nouveaux visages pour la saison 3 : Goodman (Joey), Alexander (Paco) et Bailey, la voix d’Abby dans le jeu, en cheffe des Séraphites.', '/news/cinema/the-last-of-us-saison-3-john-goodman-laura-bailey', 'série hbo the last of us saison 3 casting john goodman laura bailey ian alexander abby séraphites craig mazin', 'https://variety.com/wp-content/uploads/2026/09/LastofUs.Split_.1.jpg?w=1000&h=667&crop=1'],
  ['Godzilla Minus Zero rugit à New York', 'Première mondiale applaudie au New York Film Festival, premier Godzilla classé R ; sortie le 3 novembre au Japon, le 4 en France, le 6 aux États-Unis.', '/news/cinema/godzilla-minus-zero-premiere-nyff', 'cinéma godzilla minus zero minus one takashi yamazaki toho nyff festival kaiju classé r', 'https://variety.com/wp-content/uploads/2026/09/GettyImages-2297305809.jpg?w=1000&h=667&crop=1'],
  ['Box-office : Endgame contre Resident Evil', 'La ressortie d’Avengers: Endgame vise 24 à 26 M$ sur le week-end américain, devant le reboot Resident Evil.', '/news/cinema/box-office-us-endgame-resident-evil', 'cinéma box-office avengers endgame marvel resident evil sony zombies', youTubeThumbUrl('L2NAh3CIdig')],
  ['Werwulf montre ses crocs', 'La deuxième bande-annonce de Werwulf, l’horreur médiévale de Robert Eggers, sort le 25 décembre 2026.', '/news/cinema/werwulf-trailer-eggers', 'cinéma robert eggers werwulf trailer horreur loup-garou aaron taylor-johnson dafoe', 'https://images.contentstack.io/v3/assets/blt223a4a92692ca457/bltc56e9a2c23500694/6a3d520c6391ef7c261677e4/werwulf_4marquee_image.png?branch=production&width=1600'],
  ['Le biopic Fred Astaire trouve ses danseuses', 'Tom Holland, Margaret Qualley et Sabrina Carpenter réunis par Sony et Paul King.', '/news/cinema/fred-astaire-biopic-tom-holland', 'cinéma biopic fred astaire tom holland sabrina carpenter margaret qualley ginger rogers sony', 'https://variety.com/wp-content/uploads/2026/09/margaret-tom-sabrina.jpg?w=1200&h=800&crop=1'],
  ['Steel Ball Run — la course reprend', 'L’épisode 2 ouvre onze épisodes hebdomadaires sur Netflix, chaque vendredi jusqu’au 4 décembre.', '/news/cinema/jojo-steel-ball-run-episode-2', 'jojo steel ball run netflix anime david production gyro zeppeli johnny joestar', 'cinema-jojo-steel-ball-run.jpg'],
  ['Dune: Messiah — la bande-annonce officielle', 'Mise à jour : Warner Bros. a publié la bande-annonce du troisième chapitre, titré Dune: Part Three, pour une sortie le 18 décembre 2026. Villeneuve referme la prophétie de Paul Atréides.', '/news/cinema/dune-messiah-trailer', 'cinéma dune messiah part three trailer bande-annonce teaser villeneuve warner bros chalamet zendaya', 'cinema-dune-messiah.jpg'],
  ['The Last of Us saison 3 confirmée', 'HBO adapte la seconde moitié de Part II, du point de vue d’Abby.', '/news/cinema/last-of-us-saison-3', 'hbo the last of us série abby ellie Naughty Dog', 'cinema-last-of-us.jpg'],
  ['Doctor Doom prend les rênes du MCU', 'Robert Downey Jr. masqué, d’Avengers: Doomsday jusqu’à Secret Wars.', '/news/cinema/marvel-doctor-doom', 'marvel doctor doom robert downey jr avengers doomsday secret wars', 'cinema-doctor-doom.jpg'],
  ['Stranger Things 5 : date et trailer', 'La saison finale arrive en mars 2027 sur Netflix, huit épisodes.', '/news/cinema/stranger-things-saison-5', 'netflix stranger things vecna hawkins saison finale', 'cinema-stranger-things.jpg'],
  ['Joker 2 divise encore', 'Bilan d’un malentendu : la comédie musicale de Todd Phillips continue de fendre le public.', '/news/cinema/joker-folie-a-deux', 'joker folie à deux warner phoenix lady gaga todd phillips', 'cinema-joker.jpg'],
  ['House of the Dragon : tournage de la saison 3', 'La Danse des Dragons entre dans sa phase brutale, retour attendu en 2027.', '/news/cinema/house-of-dragon-saison-3', 'hbo house of the dragon westeros danse des dragons', 'cinema-hotd.jpg'],
  ['Blade retrouve un réalisateur', 'Sept ans de chantier et, enfin, un capitaine pour le Daywalker de Mahershala Ali.', '/news/cinema/blade-reboot', 'marvel blade mahershala ali daywalker reboot', 'cinema-blade.jpg'],
  ['Arcane saison 2 : dernière ligne droite', 'Les affiches de la saison finale arrivent, à quelques semaines de la sortie sur Netflix.', '/news/cinema/arcane-saison-2', 'arcane netflix riot games zaun piltover fortiche', 'cinema-arcane.jpg'],
  ['God of War Laufey : l’arc-serpent et les éditions', 'À l’ouverture des précommandes, Santa Monica Studio détaille l’arc-serpent de Faye, ses deux modes de visée et sa personnalisation, puis la grille des éditions : 79,99 € en Standard, 89,99 € en numérique Deluxe, mise à niveau à 10 €, aucun collector.', '/news/god-of-war-laufey-precommandes-arc-serpent', 'god of war laufey faye kratos santa monica studio playstation ps5 précommande éditions deluxe arc-serpent empyrée phranque sekhmet begtse 16 février 2027', 'https://blog.fr.playstation.com/tachyon/sites/10/2026/09/5bd30eac480284e480a9ba68e9f06472584219f4.jpg?resize=1088%2C612&crop_strategy=smart'],
  ['Le Minecraft World Hotel ouvre en 2027 à Chessington', 'Près de 70 chambres sur quatre étages, restaurant sous-marin et bar à potions : le premier hôtel officiel Minecraft au monde, annoncé au Minecraft Live, accompagnera le rollercoaster Escape the Nether en 2027.', '/news/minecraft-world-hotel-chessington-2027', 'minecraft world hotel chessington mojang merlin entertainments escape the nether rollercoaster parc à thème 2027 hôtel', 'screenshots/minecraft-world-hotel/01.jpg'],
  ['Minecraft ouvre une nouvelle dimension : le Sift', 'Dévoilé au Minecraft Live, le Sift est la première nouvelle dimension depuis quinze ans : dans Minecraft Dungeons II le 29 septembre, puis sur Java et Bedrock en 2027.', '/news/minecraft-the-sift-nouvelle-dimension', 'minecraft mojang the sift dimension minecraft live dungeons ii switch 2 grottes de glace', 'https://www.minecraft.net/content/dam/minecraftnet/games/spicewood/screenshots/MCL_Dungeons2_sift_1280x720.jpg'],
  ['The Witcher 3 Remastered sort le 29 septembre', 'Déverrouillage mondial à 10 h UTC (11 h à Alger) sur PC, PS5, Xbox Series X|S et Switch 2 ; gratuit pour les propriétaires, 45 Go, sans préchargement.', '/news/the-witcher-3-remastered-sortie-29-septembre', 'the witcher 3 wild hunt remastered cd projekt red geralt sortie 29 septembre gratuit switch 2 battle.net', 'https://public.cdn.cdpr.app/common/news/974db3ceaf0e6035a922cbbd7c7770b0_q90_1280x720.jpeg'],
  ['Nadella défend la restructuration Xbox', 'Le PDG de Microsoft juge « formidable » la rationalisation menée par Asha Sharma et promet un retour à la croissance, malgré près de 3 200 postes supprimés.', '/news/xbox-nadella-restructuration', 'xbox microsoft satya nadella asha sharma licenciements restructuration halo activision ninja theory', 'https://news.microsoft.com/source/wp-content/uploads/2024/10/MS-Exec-Nadella-Satya.jpg'],
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
].map(([title, description, route, keywords, image]) => ({ type: 'news', title, description, route, keywords, image: /^https?:\/\//i.test(image) ? image : `${base}${image}` }));

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
