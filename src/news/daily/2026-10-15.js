// Édition du jeudi 15 octobre 2026. Synthèses originales des sources liées.
// Quatre articles, et non trois : deux actus gaming ouvrent l'édition (la
// bande-annonce de lancement de GTA VI, puis la présentation d'Ocarina of
// Time), suivies du cinéma et de la tech. La grille des actus du jour est
// déjà prévue pour quatre colonnes sur bureau (src/news-carousel.css) ; la
// première entrée reste « l'actu du jour » de l'accueil et du hub gaming.
import { youTubeThumbUrl } from '../../lib/videoThumbnails.js';

export const editionDate = '15.10.2026';
export const editionIsoDate = '2026-10-15';

const sourceRoot = 'https://www.journaldugeek.com/2026/10/15/';
const entries = {
  'gta-6-trailer-de-lancement': {
    category: 'ROCKSTAR GAMES · GTA 6', readTime: '1 MIN DE LECTURE',
    image: youTubeThumbUrl('rz1B4B2yBZY'),
    fallbackImage: youTubeThumbUrl('rz1B4B2yBZY', 'hq'),
    imageAlt: 'Miniature officielle de la bande-annonce de lancement de Grand Theft Auto VI, publiée par la chaîne Rockstar Games sur YouTube',
    imageCredit: 'BANDE-ANNONCE OFFICIELLE · ROCKSTAR GAMES',
    cover: 'GTA 6', title: 'GTA 6', accent: 'A SON TRAILER DE SORTIE.',
    dek: 'Le troisième trailer officiel de GTA VI met Jason et Lucia en scène dans environ 90 secondes d’images capturées sur PS5.',
    lead: 'Rockstar l’a publié sans annonce préalable ce 15 octobre, à cinq semaines de la sortie.',
    intro: 'La vidéo est portée par « Flower in a Hurricane », morceau inédit de Justice avec Tame Impala, SZA et King Gizzard & The Lizard Wizard.',
    h2: 'JASON ET LUCIA FACE À LEONIDA',
    p1: 'Le couple se retrouve pris dans une conspiration criminelle qui s’étend à l’État de Leonida. Le montage enchaîne scènes d’action et moments plus intimes, sans séquence de gameplay continu.',
    takeText: 'Sortie le 19 novembre 2026 sur PS5 et Xbox Series X|S ; aucune version PC annoncée par Rockstar.',
    sourcePath: 'le-trailer-de-lancement-de-gta-6-vient-de-tomber-et-il-est-fou/',
    credit: 'Vidéo officielle : Rockstar Games, « Grand Theft Auto VI Launch Trailer » (15.10.2026), titre et chaîne vérifiés via oEmbed. Images capturées sur PS5 selon Rockstar. Aucune image générée.',
    sentiment: 'positive', keywords: 'gaming gta 6 gta vi grand theft auto vi rockstar games trailer de lancement bande annonce jason lucia leonida vice city justice tame impala sza king gizzard and the lizard wizard flower in a hurricane ps5 xbox series 19 novembre 2026 précommande',
  },
  'zelda-ocarina-of-time-nouvelle-presentation': {
    category: 'NINTENDO · SWITCH 2',
    image: youTubeThumbUrl('8v8eDMh1o3g'),
    fallbackImage: youTubeThumbUrl('8v8eDMh1o3g', 'hq'),
    imageAlt: 'Miniature officielle de la présentation de The Legend of Zelda: Ocarina of Time sur Switch 2 — Nintendo of America',
    imageCredit: 'VIDÉO OFFICIELLE · NINTENDO OF AMERICA',
    cover: 'ZELDA OCARINA OF TIME', title: 'OCARINA OF TIME', accent: 'REJOUE LE TEMPS.',
    dek: 'Une nouvelle présentation du remake met en avant les deux âges de Link et des environnements modernisés, avant la sortie annoncée le 5 novembre sur Switch 2.',
    lead: 'Le voyage dans le temps revient au premier plan. Dans son article du 15 octobre, le Journal du Geek revient sur une présentation de près de cinq minutes du remake de The Legend of Zelda: Ocarina of Time.',
    intro: 'Le classique de 1998 retrouve Link enfant et adulte, ses donjons et son instrument emblématique. La nouvelle présentation s’attarde sur la modernisation de cette aventure plutôt que sur un changement de sa formule.',
    h2: 'HYRULE CHANGE DE VISAGE',
    p1: 'Environnements plus détaillés, personnages retravaillés et animations modernisées : les séquences relayées par le média soulignent surtout le travail visuel. Le passage entre les deux âges de Link conserve sa place centrale dans le récit.',
    quote: 'Le défi de ce retour : retrouver les sensations du classique sans confondre modernisation visuelle et nouvelle aventure.',
    h2b: 'DES AJOUTS À DÉCOUVRIR',
    p2: 'Le Journal du Geek relève également un amphithéâtre des monstres permettant de retrouver des affrontements passés. Le média évoque par ailleurs un ocarina physique interactif proposé par Nintendo, sans que cette synthèse ne détaille ses conditions de vente.',
    p3: 'La sortie est annoncée pour le 5 novembre 2026 sur Nintendo Switch 2. Les réactions enthousiastes relevées sous une bande-annonce ne remplacent toutefois pas un test du jeu complet.',
    p4: 'Nous ne présentons pas ici une critique du remake. La présentation officielle publiée le 14 octobre par Nintendo of America est intégrée ci-dessous. Préférez-vous une relecture fidèle ou davantage de nouveautés ?',
    takeText: 'Une nouvelle présentation remet les deux âges de Link et la refonte visuelle au centre du remake, attendu le 5 novembre sur Switch 2 selon la source.',
    sourcePath: 'jen-pleure-le-dernier-trailer-de-zelda-ocarina-of-time-secoue-les-fans/',
    credit: 'Miniature et vidéo officielles : Nintendo of America, The Legend of Zelda: Ocarina of Time – Overview Trailer – Nintendo Switch 2 (14 octobre 2026), chaîne vérifiée le 15 octobre 2026.',
    sentiment: 'positive', keywords: 'gaming zelda ocarina of time nintendo switch 2 link remake novembre présentation',
  },
  'cinema/narnia-gerwig-chronologie-esthetique': {
    category: 'NETFLIX · FANTASTIQUE',
    image: youTubeThumbUrl('gDJ-ini7fF0'),
    fallbackImage: youTubeThumbUrl('gDJ-ini7fF0', 'hq'),
    imageAlt: 'Miniature de la bande-annonce officielle Netflix de Narnia : Le Neveu du Magicien',
    imageCredit: 'BANDE-ANNONCE OFFICIELLE · NETFLIX',
    cover: 'NARNIA', title: 'NARNIA CHANGE', accent: 'DE REPÈRES.',
    dek: 'L’analyse publiée aujourd’hui par le Journal du Geek éclaire les différences entre le Narnia de Greta Gerwig et les films des années 2000 : un autre roman et une chronologie déplacée.',
    lead: 'Après les premières images dévoilées cette semaine, place au contexte. Le Narnia de Greta Gerwig ne reprend pas simplement l’aventure de l’armoire magique : il s’appuie sur Le Neveu du Magicien.',
    intro: 'Ce roman de C.S. Lewis raconte les origines de l’univers et suit Digory et Polly, bien avant les aventures des enfants Pevensie. Ce point de départ explique en partie pourquoi les lieux et les personnages diffèrent des films précédents.',
    h2: 'AVANT L’ARMOIRE MAGIQUE',
    p1: 'Les deux enfants découvrent des anneaux permettant de passer entre plusieurs mondes. Leur parcours les mène notamment vers Charn et la reine Jadis. Pour éviter de dévoiler davantage l’intrigue, retenons surtout que ce récit remonte à la naissance de Narnia.',
    quote: 'Comparer les images à celles des anciens films ne suffit pas : Gerwig commence par une autre porte d’entrée dans les livres.',
    h2b: 'UNE CHRONOLOGIE À SURVEILLER',
    p2: 'Selon le Journal du Geek, le film déplace l’action vers les années 1950, alors que le roman se déroule avant la Première Guerre mondiale. Ce choix pose une question pour d’éventuelles adaptations ultérieures, dont le contexte historique reste à préciser.',
    p3: 'L’esthétique évoquée par le média penche vers un imaginaire d’opéra rock plutôt que vers le médiéval des films Disney. Il s’agit d’une lecture de la bande-annonce, pas d’un verdict sur le long-métrage, dont la sortie Netflix est annoncée au 2 avril 2027.',
    p4: 'Cet article prolonge notre couverture de la première bande-annonce : il ne présente pas celle-ci comme une nouvelle annonce du 15 octobre. La bande-annonce officielle publiée par Netflix le 13 octobre est intégrée ci-dessous pour accompagner cette analyse. Cette nouvelle direction vous intrigue-t-elle ?',
    takeText: 'Le Neveu du Magicien raconte les origines de Narnia. Le changement de roman, de période et d’esthétique distingue le projet de Greta Gerwig des adaptations précédentes.',
    sourcePath: 'narnia-pourquoi-le-film-netflix-ne-ressemble-pas-du-tout-aux-anciens/',
    credit: 'Miniature et bande-annonce officielles : chaîne Netflix, NARNIA: THE MAGICIAN’S NEPHEW | Official Trailer | Netflix (13 octobre 2026), vérifiée le 15 octobre 2026.',
    sentiment: 'mixed', keywords: 'cinéma narnia netflix greta gerwig neveu magicien digory polly jadis chronologie 2027',
  },
  'tech/free-mvpn-filtres-pays-widget': {
    category: 'FREE · SÉCURITÉ MOBILE',
    image: 'https://portail.free.fr/media/medium_article_Freem_VPN_oct26_1_d191a1cdf2.png',
    fallbackImage: 'https://freebox.cdn.scw.iliad.fr/large_protection_1080_3_cab7be9460.png',
    imageAlt: 'Visuel officiel Free mVPN accompagnant les nouveautés de filtrage, de pays et de widget',
    imageCredit: 'VISUEL OFFICIEL · FREE / ILIAD',
    cover: 'FREE MVPN', title: 'FREE MVPN AJOUTE', accent: 'TROIS OPTIONS.',
    dek: 'Free ajoute des niveaux de filtrage, le choix entre huit pays et un widget à son VPN mobile. Les restrictions au réseau Free en France métropolitaine restent importantes.',
    lead: 'Free fait évoluer mVPN ce jeudi 15 octobre. Selon le communiqué relayé par le Journal du Geek, trois nouveautés deviennent accessibles sur iOS et Android aux abonnés Forfait Free 5G+, Free Max et Série Free.',
    intro: 'Le service reste intégré au réseau mobile de l’opérateur. La mise à jour porte sur les réglages de protection, la destination de connexion et un accès plus rapide depuis l’écran d’accueil.',
    h2: 'FILTRES ET HUIT DESTINATIONS',
    p1: 'Trois niveaux sont proposés : Standard sans filtrage, Essentiel pour bloquer les domaines malveillants ou frauduleux, et Renforcé pour y ajouter les contenus pour adultes. Le filtrage repose sur des domaines déjà identifiés : il ne garantit donc pas une protection absolue.',
    quote: 'Plus de réglages ne font pas disparaître les limites du service : il faut distinguer confort d’utilisation et garanties de confidentialité.',
    h2b: 'UN VPN TOUJOURS TRÈS ENCADRÉ',
    p2: 'Les abonnés peuvent choisir entre l’Italie, les Pays-Bas, le Royaume-Uni, la Suisse, le Canada, les États-Unis, le Brésil et le Japon. Free ne promet pas pour autant l’accès aux catalogues étrangers des plateformes de streaming. Un widget permet aussi d’activer ou de couper le service.',
    p3: 'mVPN reste limité à des sessions de douze heures sur le réseau mobile Free en France métropolitaine, sans prise en charge du Wi-Fi. Les MMS sont indisponibles pendant son activation et les données consommées restent décomptées du forfait. Il ne s’agit donc pas d’un VPN utilisable directement sur un réseau mobile algérien.',
    p4: 'Sur iPhone, le filtrage n’est pas compatible avec le Relais privé iCloud ni avec l’option Masquer l’adresse IP de Safari, précise la source. Celle-ci relève également l’absence d’engagement de non-conservation des données vérifié par un audit indépendant. Aucune vidéo officielle consacrée à cette mise à jour n’a été identifiée sur les sources consultées ; le lecteur n’est donc pas remplacé par un tutoriel tiers.',
    takeText: 'Filtres, huit pays et widget enrichissent mVPN, mais le service reste réservé au réseau mobile Free en France métropolitaine et ne remplace pas toutes les fonctions d’un VPN spécialisé.',
    sourcePath: 'free-mvpn-un-an-de-silence-puis-trois-petites-nouveautes/',
    credit: 'Visuel officiel : Free / Iliad, article « Free mVPN s’enrichit : protection renforcée sur le web, huit pays de connexion et un widget », portail Free (15 octobre 2026). Repli : illustration de protection web de la page officielle Free mVPN. Aucun visuel généré.',
    sentiment: 'mixed', keywords: 'tech free mvpn vpn sécurité mobile filtrage pays widget france confidentialité',
  },
};

export const dailyStories = Object.fromEntries(Object.entries(entries).map(([key, { sourcePath, ...story }]) => [key, {
  ...story, date: editionDate, thumbnail: story.image,
  quoteBy: 'L’ANALYSE LET’S PLAY', take: 'À RETENIR',
  sourceName: 'JOURNAL DU GEEK',
  source: 'Synthèse de l’article du Journal du Geek publié et consulté le 15.10.2026. Les informations rapportées sont attribuées à cette source.',
  sourceUrl: `${sourceRoot}${sourcePath}`, sourceDetail: 'Lire l’article du Journal du Geek',
}]));

export const dailyNewsListing = Object.entries(dailyStories).map(([key, story]) => ({
  to: `/news/${key}`,
  image: story.thumbnail,
  poster: story.thumbnail,
  fallbackImage: story.fallbackImage,
  alt: story.imageAlt,
  imageCredit: story.imageCredit,
  badge: story.category,
  kicker: `${story.date} · ${story.sourceName}`,
  title: `${story.title} ${story.accent}`,
  excerpt: story.dek,
  read: 'LIRE L’ARTICLE',
  sentiment: story.sentiment,
  keywords: story.keywords,
}));

export const dailySeoEntries = Object.fromEntries(Object.entries(dailyStories).map(([key, story]) => [
  `/news/${key}`,
  {
    title: `${story.title} ${story.accent} — Let’s Play`,
    description: story.dek,
    image: story.thumbnail,
    type: 'article',
    published: editionIsoDate,
    section: key.startsWith('cinema/') ? 'Actualités cinéma' : key.startsWith('tech/') ? 'Actualités tech' : 'Actualités gaming',
  },
]));
