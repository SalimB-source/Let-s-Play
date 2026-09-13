// Events, annonceurs, médias et partenaires éditoriaux de Let's Play.
// Les contextes sont formulés à partir des traces publiques disponibles ;
// lorsqu'une confirmation publique manque, la page le signale explicitement.

const base = import.meta.env.BASE_URL;

export const partners = [
  {
    id: 'ooredoo', tag: 'ooredoo', name: 'Ooredoo', nameNative: 'أوريدو', mark: 'O', tone: 'ooredoo',
    logo: 'partners/ooredoo.png', external: 'https://www.ooredoo.dz/', externalLabel: 'ooredoo.dz',
    media: 'https://www.instagram.com/ooredooalgerie/reel/CzecTPOLn76/', mediaLabel: 'Jeu-concours Let’s Play',
    role: 'Annonceur', context: 'Activation de marque autour de Let’s Play : jeu-concours Ooredoo Algérie destiné à la communauté de l’émission.',
    confidence: 'Vérifié publiquement', source: 'https://www.instagram.com/ooredooalgerie/reel/CzecTPOLn76/'
  },
  {
    id: 'djezzy', tag: 'djezzy', name: 'Djezzy', nameNative: 'جازي', mark: 'Y', tone: 'djezzy',
    logo: 'partners/djezzy.jpg', external: 'https://www.djezzy.dz/', externalLabel: 'djezzy.dz',
    media: 'https://www.youtube.com/@letsplay.officiel', mediaLabel: 'Chaîne Let’s Play',
    role: 'Annonceur — à confirmer', context: 'Présence demandée comme annonceur. Le cadre exact de la collaboration Let’s Play doit être confirmé par un support officiel dédié.',
    confidence: 'À confirmer', source: 'https://www.djezzy.dz/'
  },
  {
    id: 'ifa-constantine', tag: 'ifa', name: 'IFA Constantine', nameNative: 'المعهد الفرنسي قسنطينة', mark: 'IFA', tone: 'ifa',
    logo: null, external: 'https://www.institutfrancais-algerie.com/constantine/', externalLabel: 'Institut français de Constantine',
    media: 'https://www.facebook.com/IFConstantine/', mediaLabel: 'Page officielle',
    role: 'Partenaire culturel — à confirmer', context: 'Relais culturel et territorial autour de Constantine. La nature exacte de la collaboration avec Let’s Play n’est pas documentée publiquement sur une page dédiée.',
    confidence: 'À confirmer', source: 'https://www.facebook.com/IFConstantine/'
  },
  {
    id: 'lg', tag: 'lg', name: 'LG', nameNative: '', mark: 'LG', tone: 'lg',
    logo: null, external: 'https://www.lg.com/dz', externalLabel: 'lg.com/dz',
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
    logo: null, external: 'https://www.facebook.com/letsplay.officiel/posts/-tmv-cinemas-gadern-city-cinema-algeria-rending-popculture-alger/258015130520926/', externalLabel: 'Publication Let’s Play',
    media: null, mediaLabel: null,
    role: 'Partenaire cinéma — à confirmer', context: 'Collaboration éditoriale autour du cinéma et de la pop culture, avec une publication Let’s Play consacrée à TMV Cinemas.',
    confidence: 'Trace publique', source: 'https://www.facebook.com/letsplay.officiel/posts/-tmv-cinemas-gadern-city-cinema-algeria-rending-popculture-alger/258015130520926/'
  },
  {
    id: '7ouma-arena', tag: '7ouma-arena', name: '7ouma Arena', nameNative: '', mark: '7A', tone: 'arena',
    logo: null, external: 'https://www.instagram.com/letsplay.officiel/', externalLabel: 'Let’s Play Official',
    media: null, mediaLabel: null,
    role: 'Événement gaming — à confirmer', context: 'Événement et communauté gaming ajoutés au portefeuille Events ; les détails de l’activation Let’s Play restent à documenter publiquement.',
    confidence: 'À confirmer', source: 'https://www.instagram.com/letsplay.officiel/'
  },
  {
    id: 'egor-gaming', tag: 'egor-gaming', name: 'EGOR Gaming', nameNative: '', mark: 'EG', tone: 'egor',
    logo: 'partners/egor-gaming.png', external: 'https://egorgaming.com/', externalLabel: 'egorgaming.com',
    media: 'https://www.youtube.com/watch?v=r-E7cdhAAe8', mediaLabel: 'Journal du Geek — EGOR Gaming',
    role: 'Partenaire gaming / esports', context: 'Mise en avant éditoriale dans Journal du Geek : Let’s Play a présenté EGOR Gaming comme un écosystème algérien dédié aux joueurs et à l’esport.',
    confidence: 'Vérifié publiquement', source: 'https://www.youtube.com/watch?v=r-E7cdhAAe8'
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
