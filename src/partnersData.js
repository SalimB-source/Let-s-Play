// Events, annonceurs, médias et partenaires éditoriaux de Let's Play.
// Les contextes sont formulés à partir des traces publiques disponibles ;
// lorsqu'une confirmation publique manque, la page le signale explicitement.

const base = import.meta.env.BASE_URL;

// Trace publique de référence pour 7ouma Arena : l'annonce de lancement du show
// (format, diffusion YouTube, sponsoring Djezzy, tournois organisés par EGOR
// Gaming). Utilisée par la page Events et par les fiches partenaires liées.
export const arenaLaunchSource = 'https://dz.linkedin.com/in/samy-charif-egorgaming';

export const partners = [
  {
    id: 'algerie-telecom', tag: 'telecom', name: 'Algérie Télécom', nameNative: 'اتصالات الجزائر', mark: 'AT', tone: 'telecom',
    logo: 'partners/algerie-telecom.png', external: 'https://www.algerietelecom.dz/', externalLabel: 'algerietelecom.dz',
    media: 'https://www.youtube.com/watch?v=aTs0zhm6Leg', mediaLabel: 'HicoSoft Studio & GOYA — Let’s Play', video: 'aTs0zhm6Leg',
    role: 'Partenaire de diffusion', context: 'Algérie Télécom accompagne la production et la diffusion de Let’s Play, de la chronique Journal du Geek aux rencontres avec les studios locaux.',
    confidence: 'Vérifié publiquement', source: 'https://www.youtube.com/watch?v=aTs0zhm6Leg'
  },
  {
    id: 'ooredoo', tag: 'ooredoo', name: 'Ooredoo', nameNative: 'أوريدو', mark: 'O', tone: 'ooredoo',
    logo: 'partners/ooredoo.png', external: 'https://www.ooredoo.dz/', externalLabel: 'ooredoo.dz',
    media: 'https://www.youtube.com/watch?v=0nHji4C-Mp4', mediaLabel: 'Upcoming Horror Games — Ooredoo Giveaway', video: '0nHji4C-Mp4',
    role: 'Annonceur', context: 'Partenariat visible sur la chaîne YouTube officielle Let’s Play, complété par une activation Ooredoo Algérie destinée à la communauté de l’émission.',
    confidence: 'Vérifié publiquement', source: 'https://www.youtube.com/@letsplay.officiel'
  },
  {
    id: 'djezzy', tag: 'djezzy', name: 'Djezzy', nameNative: 'جازي', mark: 'Y', tone: 'djezzy',
    logo: 'partners/djezzy.png', external: 'https://www.djezzy.dz/', externalLabel: 'djezzy.dz',
    media: arenaLaunchSource, mediaLabel: 'Annonce du lancement — LinkedIn',
    role: 'Marque présentatrice — 7ouma Arena',
    context: 'Djezzy présente 7ouma Arena, l’émission et le tournoi gaming de l’écosystème algérien : la marque donne son nom au rendez-vous (« by Djezzy ») et l’articule à ses enjeux réseau — 5G, qualité du streaming, essor de l’esport.',
    confidence: 'Vérifié publiquement', source: arenaLaunchSource
  },
  {
    id: 'ifa-constantine', tag: 'ifa', name: 'IFA Constantine', nameNative: 'المعهد الفرنسي قسنطينة', mark: 'IFA', tone: 'ifa',
    logo: 'partners/ifa-constantine.png', external: 'https://www.institutfrancais-algerie.com/constantine/', externalLabel: 'Institut français de Constantine',
    media: 'https://www.facebook.com/IFConstantine/', mediaLabel: 'Page officielle',
    role: 'Partenaire culturel — à confirmer', context: 'Relais culturel et territorial autour de Constantine. La nature exacte de la collaboration avec Let’s Play n’est pas documentée publiquement sur une page dédiée.',
    confidence: 'À confirmer', source: 'https://www.facebook.com/IFConstantine/'
  },
  {
    id: 'lg', tag: 'lg', name: 'LG', nameNative: '', mark: 'LG', tone: 'lg',
    logo: 'partners/lg.png', external: 'https://www.lg.com/dz', externalLabel: 'lg.com/dz',
    media: 'https://www.lg.com/global/newsroom/news/corporate/lifes-good-lets-play-lg-introduces-korean-culture-to-young-parisians/', mediaLabel: 'LG — Life’s Good, Let’s Play',
    role: 'Annonceur — à confirmer', context: 'Marque annoncée comme partenaire de la page Events. Le dispositif LG x Let’s Play doit être précisé avant publication d’un intitulé plus affirmatif.',
    confidence: 'À confirmer', source: 'https://www.lg.com/dz'
  },
  {
    id: 'el-heddaf-tv', tag: 'el-heddaf-tv', name: 'El Heddaf TV', nameNative: 'الهداف TV', mark: 'TV', tone: 'heddaf',
    logo: 'partners/el-heddaf-tv.png', external: 'https://www.youtube.com/channel/UC8rOLwbg9yW9-Y6NAQSojJQ', externalLabel: 'Chaîne officielle El Heddaf TV',
    media: 'https://www.tiktok.com/@othmanerached0/video/7231894059353246982', mediaLabel: 'Passage dans Let’s Play',
    role: 'Canal de diffusion', context: 'Canal de diffusion média : El Heddaf TV a accueilli une séquence liée à Let’s Play, notamment autour du gaming et de FIFA.',
    confidence: 'Vérifié par trace publique', source: 'https://www.tiktok.com/@othmanerached0/video/7231894059353246982'
  },
  {
    id: 'tmv', tag: 'tmv', name: 'TMV Cinemas', nameNative: '', mark: 'TMV', tone: 'tmv',
    logo: 'partners/tmv.png', external: 'https://www.facebook.com/letsplay.officiel/posts/-tmv-cinemas-gadern-city-cinema-algeria-rending-popculture-alger/258015130520926/', externalLabel: 'Publication Let’s Play',
    media: null, mediaLabel: null,
    role: 'Partenaire cinéma — à confirmer', context: 'Collaboration éditoriale autour du cinéma et de la pop culture, avec une publication Let’s Play consacrée à TMV Cinemas.',
    confidence: 'Trace publique', source: 'https://www.facebook.com/letsplay.officiel/posts/-tmv-cinemas-gadern-city-cinema-algeria-rending-popculture-alger/258015130520926/'
  },
  {
    id: '7ouma-arena', tag: '7ouma-arena', name: '7ouma Arena', nameNative: '', mark: '7A', tone: 'arena',
    logo: 'partners/7ouma-arena.png', external: 'https://www.instagram.com/letsplay.officiel/', externalLabel: 'Let’s Play Official',
    media: arenaLaunchSource, mediaLabel: 'Annonce du lancement — LinkedIn',
    role: 'Émission & tournoi — by Djezzy',
    context: 'Deux formats sous une même bannière : une émission gaming & esport diffusée sur YouTube, présentée par Djezzy, et un tournoi esport organisé par EGOR Gaming avec l’équipe Let’s Play. Le détail est expliqué dans la section « Le show & le tournoi » de la page Events.',
    page: '/events#7ouma-arena-show',
    confidence: 'Confirmé par l’équipe Let’s Play', source: arenaLaunchSource
  },
  {
    id: 'egor-gaming', tag: 'egor-gaming', name: 'EGOR Gaming', nameNative: '', mark: 'EG', tone: 'egor',
    logo: 'partners/egor-gaming.png', external: 'https://egorgaming.com/', externalLabel: 'egorgaming.com',
    media: 'https://www.youtube.com/watch?v=r-E7cdhAAe8', mediaLabel: 'Journal du Geek — EGOR Gaming',
    role: 'Organisation des tournois — 7ouma Arena',
    context: 'EGOR Gaming, structure esport algérienne, organise les tournois de 7ouma Arena avec l’équipe Let’s Play : formats, inscriptions, arbitrage et déroulé des matchs jusqu’aux finales. Let’s Play a présenté cet écosystème dans le Journal du Geek.',
    confidence: 'Vérifié publiquement', source: arenaLaunchSource
  },
];

export const partnerUrls = {
  instagram: 'https://www.instagram.com/letsplay.officiel/',
  youtube: 'https://www.youtube.com/@letsplay.officiel',
  heroVisual: `${base}hero-lets-play.png`,
};

export const partnerByTag = partners.reduce((acc, partner) => {
  acc[partner.tag] = partner;
  return acc;
}, {});

// Aliases kept for the homepage modules that still reference the former
// collaboration categories.
partnerByTag.show = partnerByTag.ooredoo;
partnerByTag.screen = partnerByTag.lg;
partnerByTag.event = partnerByTag['7ouma-arena'];
