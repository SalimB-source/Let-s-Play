// Bandes-annonces et teasers intégrés au corps des articles des actus cinéma.
//
// Clé = identifiant de l'article (le même que les cartes du hub
// `/news/cinema`, donc préfixé « cinema/ »). Le gabarit de page
// (`src/pages/CurrentNews.jsx`) appelle `getArticleTrailers(key)` et rend
// `src/components/ArticleTrailer.jsx` juste après le chapô — même mécanique
// que les galeries de captures (`src/articleGalleries.js`).
//
// Règle éditoriale : uniquement des vidéos publiées par la chaîne officielle
// du studio ou du diffuseur (Marvel Entertainment, Sony Pictures, Warner Bros.,
// Netflix, HBO Max, Focus Features, GODZILLA OFFICIAL by TOHO…). Les
// « trailers » de chaînes d'agrégation ou de fans — et les concepts générés par
// IA, nombreux sur ces licences — sont exclus : une bande-annonce qui n'est pas
// celle du distributeur n'a rien à faire dans un article qui cite ses sources.
//
// Chaque entrée porte la trace du contrôle (`verified`) : identifiant vérifié
// sur YouTube (oEmbed) — titre exact et chaîne officielle — le jour indiqué.
// `npm run check:trailers` rejoue la cohérence du fichier hors-ligne (format
// des identifiants, kinds connus, article existant, aucune actu cinéma sans
// bande-annonce ni mention explicite) et vérifie le rendu réel des pages.
//
// Quand le distributeur n'a encore rien publié (biopic sans titre, reboot en
// développement, saison en tournage), l'entrée ne reste pas vide : elle porte
// `pending`, affiché tel quel dans l'article, pour que l'absence soit dite
// plutôt que devinée. Une vidéo d'une saison ou d'un film précédent peut
// servir d'illustration, à condition de le dire dans `note` — c'est la même
// honnêteté que pour les photogrammes des galeries.

/** Natures de vidéo acceptées, et leur libellé affiché. */
export const TRAILER_KINDS = {
  trailer: 'BANDE-ANNONCE',
  teaser: 'TEASER',
  extrait: 'EXTRAIT',
};

/** Libellé d'une nature de vidéo (« BANDE-ANNONCE », « TEASER », « EXTRAIT »). */
export function trailerKindLabel(kind) {
  return TRAILER_KINDS[kind] || TRAILER_KINDS.trailer;
}

/**
 * Pastille du lecteur, accordée au genre du mot : « BANDE-ANNONCE OFFICIELLE »
 * mais « TEASER OFFICIEL », « EXTRAIT OFFICIEL ».
 */
const KIND_BADGES = {
  trailer: 'BANDE-ANNONCE OFFICIELLE',
  teaser: 'TEASER OFFICIEL',
  extrait: 'EXTRAIT OFFICIEL',
};

/** Pastille affichée sous le lecteur d'une vidéo. */
export function trailerBadgeLabel(kind) {
  return KIND_BADGES[kind] || KIND_BADGES.trailer;
}

/** Annonce au survol de la pastille du hub, elle aussi accordée au genre. */
const KIND_HINTS = {
  trailer: 'Bande-annonce officielle intégrée à l’article',
  teaser: 'Teaser officiel intégré à l’article',
  extrait: 'Extrait officiel intégré à l’article',
};

/** Lien public d'une vidéo YouTube (aucun embed codé en dur hors de lib/). */
export function trailerWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export const articleTrailers = {
  // ---- Fournée du 05.10.2026 ------------------------------------------------
  // « Les Misérables » de Fred Cavayé : bande-annonce française publiée par le
  // distributeur Pathé Cinémas (ZZRo2fIbomE), complétée par la version
  // originale sous-titrée de STUDIOCANAL (PyBTjrK43Hg) — les deux chaînes ont
  // été vérifiées sur YouTube (oEmbed) le 05.10.2026.
  'cinema/les-miserables-cavaye-14-octobre': {
    label: 'LES MISÉRABLES', meta: 'PATHÉ · FRED CAVAYÉ',
    items: [
      { id: 'ZZRo2fIbomE', kind: 'trailer', title: 'LES MISÉRABLES - Bande-annonce', channel: 'Pathé Cinémas', verified: '05.10.2026' },
      { id: 'PyBTjrK43Hg', kind: 'trailer', title: 'LES MISÉRABLES | Official Trailer | STUDIOCANAL', channel: 'STUDIOCANAL', verified: '05.10.2026', note: 'À titre d’illustration : la version originale sous-titrée publiée par STUDIOCANAL, en complément de la bande-annonce française de Pathé Cinémas.' },
    ],
    credit: 'Vidéos officielles : Pathé Cinémas et STUDIOCANAL, sur YouTube.',
  },
  'cinema/matthew-perry-documentaire-netflix': { label: 'MATTHEW PERRY', meta: 'NETFLIX · DOCUMENTAIRE', items: [{ id: '_iM1AOFxoDI', kind: 'trailer', title: 'The One About Matthew Perry | Official Trailer | Netflix', channel: 'Netflix', verified: '01.10.2026' }], credit: 'Vidéo officielle : Netflix, sur YouTube.' },
  'cinema/a-l-est-d-eden-netflix': { label: 'À L’EST D’ÉDEN', meta: 'NETFLIX · ZOE KAZAN', items: [{ id: 'M9NWvGZViCg', kind: 'trailer', title: 'East of Eden | Official Trailer | Netflix', channel: 'Netflix', verified: '01.10.2026' }], credit: 'Vidéo officielle : Netflix, sur YouTube.' },
  // ---- Fournée du 29.09.2026 ------------------------------------------------
  'cinema/endgame-encore-record-avatar': {
    label: 'ENDGAME – ENCORE', meta: 'MARVEL STUDIOS',
    items: [
      { id: 'L2NAh3CIdig', kind: 'trailer', title: 'Avengers Endgame: Encore | Official Trailer | In Theaters Sep 25', channel: 'Marvel Entertainment', verified: '29.09.2026' },
    ],
    credit: 'Vidéo officielle : Marvel Entertainment, sur YouTube.',
  },
  'cinema/coyote-vs-acme-numerique': {
    label: 'COYOTE VS. ACME', meta: 'KETCHUP ENTERTAINMENT · WARNER BROS. ANIMATION',
    items: [
      { id: 'Bpg3tJ4f3v0', kind: 'trailer', title: 'Coyote vs. ACME | Final Trailer', channel: 'Ketchup Entertainment', verified: '29.09.2026' },
    ],
    credit: 'Vidéo officielle : Ketchup Entertainment, sur YouTube.',
  },
  'cinema/mononoke-chapter-3-netflix': {
    label: 'MONONOKE – CHAPTER III', meta: 'NETFLIX · STUDIO KAFKA / EOTA',
    items: [
      { id: 'R6PUcxSZ7YM', kind: 'trailer', title: 'Mononoke The Movie: Chapter Ⅲ - The Curse of the Serpent | Official Trailer | Netflix Anime', channel: 'Netflix Anime', verified: '29.09.2026' },
    ],
    credit: 'Vidéo officielle : Netflix Anime, sur YouTube — © EOTA / Studio Kafka / Twin Engine.',
  },

  // ---- Fournée du 28.09.2026 ------------------------------------------------
  'cinema/box-office-us-endgame-encore-26-millions': {
    label: 'LE PODIUM DU WEEK-END', meta: 'MARVEL STUDIOS · SONY PICTURES',
    items: [
      { id: 'L2NAh3CIdig', kind: 'trailer', title: 'Avengers Endgame: Encore | Official Trailer | In Theaters Sep 25', channel: 'Marvel Entertainment', verified: '28.09.2026' },
      { id: 'mNd1gb19A-c', kind: 'trailer', title: 'RESIDENT EVIL – Official Trailer (4K)', channel: 'Sony Pictures Entertainment', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Marvel Entertainment et Sony Pictures Entertainment, sur YouTube.',
  },
  'cinema/the-last-of-us-saison-3-john-goodman-laura-bailey': {
    label: 'THE LAST OF US', meta: 'HBO MAX · SAISON 2',
    items: [
      {
        id: '_zHPsmXCjB0', kind: 'trailer', title: 'The Last of Us Season 2 | Official Trailer | Max', channel: 'HBO Max', verified: '28.09.2026',
        note: 'À titre d’illustration : la saison 3 est en tournage et n’a pas encore de bande-annonce. Voici celle de la saison 2, publiée par HBO Max.',
      },
    ],
    credit: 'Vidéo officielle : HBO Max, sur YouTube.',
  },
  'cinema/godzilla-minus-zero-premiere-nyff': {
    label: 'GODZILLA MINUS ZERO', meta: 'TOHO · TAKASHI YAMAZAKI',
    items: [
      { id: 'kw0YhiqOPFg', kind: 'trailer', title: 'GODZILLA MINUS ZERO | Official 1.43:1 Trailer | Filmed For IMAX', channel: 'GODZILLA OFFICIAL by TOHO', verified: '28.09.2026' },
      { id: 'Xmy-Z3dHMd8', kind: 'teaser', title: 'GODZILLA MINUS ZERO | Official Teaser', channel: 'GODZILLA OFFICIAL by TOHO', verified: '28.09.2026' },
      { id: 'n-NDYWPXpKg', kind: 'teaser', title: 'GODZILLA MINUS ZERO | First Look Teaser', channel: 'GODZILLA OFFICIAL by TOHO', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : GODZILLA OFFICIAL by TOHO, sur YouTube — © 2026 TOHO CO., LTD.',
  },

  // ---- Fournée du 27.09.2026 ------------------------------------------------
  'cinema/box-office-us-endgame-resident-evil': {
    label: 'ENDGAME × RESIDENT EVIL', meta: 'MARVEL STUDIOS · SONY PICTURES',
    items: [
      { id: 'L2NAh3CIdig', kind: 'trailer', title: 'Avengers Endgame: Encore | Official Trailer | In Theaters Sep 25', channel: 'Marvel Entertainment', verified: '28.09.2026' },
      { id: 'mNd1gb19A-c', kind: 'trailer', title: 'RESIDENT EVIL – Official Trailer (4K)', channel: 'Sony Pictures Entertainment', verified: '28.09.2026' },
      { id: 'SJPu1spHqfk', kind: 'teaser', title: 'RESIDENT EVIL – Official Teaser Trailer (4K)', channel: 'Sony Pictures Entertainment', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Marvel Entertainment et Sony Pictures Entertainment, sur YouTube.',
  },
  'cinema/werwulf-trailer-eggers': {
    label: 'WERWULF', meta: 'FOCUS FEATURES · ROBERT EGGERS',
    items: [
      { id: 'CL1EFACsWag', kind: 'trailer', title: 'WERWULF - Official Trailer 2 [HD] - Only In Theaters This Christmas', channel: 'Focus Features', verified: '28.09.2026' },
      { id: 'cmjpadVj-Vk', kind: 'trailer', title: 'WERWULF - Official Trailer [HD] - Only In Theaters This Christmas', channel: 'Focus Features', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Focus Features, sur YouTube.',
  },
  'cinema/fred-astaire-biopic-tom-holland': {
    label: 'BIOPIC FRED ASTAIRE', meta: 'SONY PICTURES · PAUL KING',
    pending: 'Aucune bande-annonce : le film n’a encore ni titre officiel ni date de sortie, et le tournage est annoncé pour janvier 2027. Sony Pictures n’a publié aucune image animée — les seules visuels disponibles sont les photos de presse du casting.',
  },

  // ---- Fournées précédentes -------------------------------------------------
  'cinema/jojo-steel-ball-run-episode-2': {
    label: 'STEEL BALL RUN', meta: 'NETFLIX · DAVID PRODUCTION',
    items: [
      { id: '43qoWFJbWF0', kind: 'trailer', title: 'STEEL BALL RUN JoJo’s Bizarre Adventure 2nd STAGE | Official Trailer | Netflix', channel: 'Netflix', verified: '28.09.2026' },
      { id: '__GPPKA7Uww', kind: 'teaser', title: 'STEEL BALL RUN JoJo’s Bizarre Adventure 2nd STAGE | Official Teaser | Netflix', channel: 'Netflix Anime', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Netflix et Netflix Anime, sur YouTube — ©LUCKY LAND COMMUNICATIONS / SHUEISHA / JOJO’s Animation SBR Project.',
  },
  'cinema/dune-messiah-trailer': {
    label: 'DUNE, TROISIÈME CHAPITRE', meta: 'WARNER BROS · LEGENDARY',
    items: [
      {
        id: 'NdvqHc56lE0', kind: 'trailer', title: 'Dune: Part Three | Official Trailer', channel: 'Warner Bros.', verified: '28.09.2026',
        note: 'Mise à jour du 28.09.2026 : Warner Bros. a depuis publié la bande-annonce officielle, sous le titre Dune: Part Three et avec une sortie annoncée au 18 décembre 2026 — l’article ci-dessous, écrit le 26.09, faisait état d’une révélation « en fin d’année ».',
      },
    ],
    credit: 'Vidéo officielle : Warner Bros. Pictures / Legendary Pictures, sur YouTube.',
  },
  'cinema/last-of-us-saison-3': {
    label: 'THE LAST OF US', meta: 'HBO MAX · SAISONS 1 ET 2',
    items: [
      {
        id: '_zHPsmXCjB0', kind: 'trailer', title: 'The Last of Us Season 2 | Official Trailer | Max', channel: 'HBO Max', verified: '28.09.2026',
        note: 'À titre d’illustration : la saison 3 vient d’être commandée et n’a pas encore de bande-annonce.',
      },
      { id: 'uLtkt8BonwM', kind: 'trailer', title: 'The Last of Us | Official Trailer | Max', channel: 'HBO Max', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : HBO Max, sur YouTube.',
  },
  'cinema/marvel-doctor-doom': {
    label: 'AVENGERS: DOOMSDAY', meta: 'MARVEL STUDIOS · MCU',
    items: [
      { id: 'irVNGjRFZGk', kind: 'trailer', title: 'Avengers: Doomsday | Official Trailer | In Theaters December 18', channel: 'Marvel Entertainment', verified: '28.09.2026' },
      { id: 'X1aFkAkFASk', kind: 'extrait', title: 'Avengers: Doomsday | Special Look | In Theaters December 18', channel: 'Marvel Entertainment', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Marvel Entertainment, sur YouTube.',
  },
  'cinema/stranger-things-saison-5': {
    label: 'STRANGER THINGS', meta: 'NETFLIX · SAISON FINALE',
    items: [
      { id: 'PssKpzB0Ah0', kind: 'trailer', title: 'Stranger Things 5 | Official Trailer | Netflix', channel: 'Netflix', verified: '28.09.2026' },
      { id: 'iKZyYdwS3Wg', kind: 'teaser', title: 'Stranger Things 5 | Official Teaser | Netflix', channel: 'Netflix', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Netflix, sur YouTube.',
  },
  'cinema/joker-folie-a-deux': {
    label: 'FOLIE À DEUX', meta: 'WARNER BROS · TODD PHILLIPS',
    items: [
      { id: '_OKAwz2MsJs', kind: 'trailer', title: 'Joker: Folie À Deux | Official Trailer', channel: 'Warner Bros.', verified: '28.09.2026' },
      { id: 'xy8aJw1vYHo', kind: 'teaser', title: 'Joker: Folie à Deux | Official Teaser Trailer', channel: 'Warner Bros.', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Warner Bros. Pictures, sur YouTube.',
  },
  'cinema/house-of-dragon-saison-3': {
    label: 'HOUSE OF THE DRAGON', meta: 'HBO MAX · SAISON 3',
    items: [
      { id: 'i6w7O1kwuBk', kind: 'teaser', title: 'House of the Dragon Season 3 | Official Teaser | HBO Max', channel: 'HBO Max', verified: '28.09.2026' },
    ],
    credit: 'Vidéo officielle : HBO Max, sur YouTube.',
  },
  'cinema/blade-reboot': {
    label: 'BLADE', meta: 'MARVEL STUDIOS · MAHERSHALA ALI',
    pending: 'Aucune bande-annonce officielle : Marvel Studios n’a encore rien publié pour le Blade de Mahershala Ali, toujours sans réalisateur confirmé ni date de sortie. Les « trailers » en circulation sont des montages de fans, y compris ceux présentés comme officiels — ils ne sont pas relayés ici.',
  },
  'cinema/arcane-saison-2': {
    label: 'ARCANE', meta: 'NETFLIX · RIOT GAMES',
    items: [
      { id: 'ysqiEC6bLUI', kind: 'trailer', title: 'Arcane: Season 2 | Official Trailer | Netflix', channel: 'Netflix', verified: '28.09.2026' },
      { id: 'AEbfiLaOdJA', kind: 'teaser', title: 'Arcane: Season 2 | Official Teaser | Netflix', channel: 'Netflix', verified: '28.09.2026' },
    ],
    credit: 'Vidéos officielles : Netflix, sur YouTube — animation Fortiche pour Riot Games.',
  },

  // ---- Fournée du 03-04.10.2026 -------------------------------------------
  // Le distributeur, et lui seul, est cité : Amazon MGM Studios pour « Verity »,
  // Paramount+ pour la saison 2 de « Dexter: Resurrection » et Lionsgate Movies
  // pour « Beware Boiúna ». Identifiants contrôlés sur YouTube (oEmbed) le
  // 04.10.2026, avec leur chaîne d'origine.
  // « Beware Boiúna » n'a pas encore de date française : l'entrée reste celle de
  // la campagne américaine de Lionsgate.
  'cinema/box-office-verity-digger': {
    label: 'VERITY', meta: 'AMAZON MGM STUDIOS · COLLEEN HOOVER',
    items: [
      { id: 'xdPMKhjMSFs', kind: 'trailer', title: 'Verity | Official Trailer', channel: 'Amazon MGM Studios', verified: '04.10.2026' },
    ],
    credit: 'Vidéo officielle : Amazon MGM Studios, sur YouTube.',
  },
  'cinema/dexter-resurrection-saison-2-bande-annonce': {
    label: 'DEXTER: RESURRECTION', meta: 'PARAMOUNT+ · SAISON 2',
    items: [
      { id: 'nTOf1FIsBcs', kind: 'trailer', title: 'Dexter: Resurrection | Season 2 Official Trailer | Paramount+', channel: 'Paramount Plus', verified: '04.10.2026' },
    ],
    credit: 'Vidéo officielle : Paramount+, sur YouTube.',
  },
  'cinema/beware-boiuna-premiers-avis': {
    label: 'BEWARE BOIÚNA', meta: 'LIONSGATE · MIKE P. NELSON',
    items: [
      { id: 'MQKqgFVU4dQ', kind: 'trailer', title: 'Beware Boiúna (2026) Final Trailer - Kiana Madeira, Jessica Rothe, Logan Marshall-Green', channel: 'Lionsgate Movies', verified: '04.10.2026' },
    ],
    credit: 'Vidéo officielle : Lionsgate Movies, sur YouTube.',
  },

  // Marshals: A Yellowstone Story — saison 2 française sur Paramount+ le
  // 05.10.2026, au lendemain de la diffusion américaine sur CBS. Le trailer
  // utilisé est celui de la chaîne CBS (upload principal), vérifié sur YouTube
  // (oEmbed) le 05.10.2026 : « Marshals Season 2: Official Trailer | CBS »
  // (mtk4ZZutvLc). La version française de Paramount+ France reprend la même
  // campagne et reste écartée, comme les copies d'agrégateurs.
  'cinema/marshals-saison-2-paramount-france': {
    label: 'MARSHALS', meta: 'PARAMOUNT+ · SAISON 2',
    items: [
      { id: 'mtk4ZZutvLc', kind: 'trailer', title: 'Marshals Season 2: Official Trailer | CBS', channel: 'CBS', verified: '05.10.2026' },
    ],
    credit: 'Vidéo officielle : CBS, sur YouTube.',
  },

  // ---- Annonces sans images animées ----------------------------------------
  // Carte du hub cinéma servie par le gabarit Blizzard (`/news/diablo-netflix`) :
  // l'annonce d'ouverture de la BlizzCon 2026 n'a été accompagnée d'aucun visuel
  // animé, ni par Blizzard ni par Netflix.
  'diablo-netflix': {
    label: 'SÉRIE ANIMÉE DIABLO', meta: 'BLIZZARD · NETFLIX',
    pending: 'Aucune bande-annonce : la série animée Diablo annoncée pour Netflix n’a encore aucune image en mouvement — Blizzard et Netflix n’ont publié ni teaser, ni casting, ni date de diffusion.',
  },
};

/**
 * Entrée brute d'un article (ou null) : `items` pour les vidéos publiées,
 * `pending` quand le distributeur n'a encore rien montré.
 *
 * @param {string} key identifiant d'article (ex. `cinema/werwulf-trailer-eggers`)
 */
export function getArticleTrailerEntry(key) {
  return (key && articleTrailers[key]) || null;
}

/**
 * Lecteur d'un article : `{ label, meta, items, credit }` ou null s'il n'y a
 * rien à projeter. C'est ce que rend `ArticleTrailer` dans le corps de
 * l'article.
 *
 * @param {string} key identifiant d'article
 */
export function getArticleTrailers(key) {
  const entry = getArticleTrailerEntry(key);
  if (!entry || !entry.items?.length) return null;
  return entry;
}

/**
 * Mention « aucune bande-annonce » d'un article, ou null.
 *
 * @param {string} key identifiant d'article
 */
export function getArticleTrailerPending(key) {
  const entry = getArticleTrailerEntry(key);
  return entry && !entry.items?.length ? entry.pending || null : null;
}

/** Clé d'article d'une route du hub (`/news/cinema/<slug>` → `cinema/<slug>`). */
const articleKeyOf = (routeOrKey) =>
  routeOrKey ? String(routeOrKey).replace(/^\/news\//, '') : '';

/**
 * Pastille affichée sur les cartes du hub cinéma : le libellé de la première
 * vidéo de l'article (« BANDE-ANNONCE », « TEASER »…), ou null si l'article
 * n'a aucune vidéo officielle à proposer.
 *
 * @param {string} routeOrKey route de la carte (ex. `/news/cinema/blade-reboot`)
 *   ou identifiant d'article
 */
export function trailerFlagLabel(routeOrKey) {
  const trailers = getArticleTrailers(articleKeyOf(routeOrKey));
  return trailers ? trailerKindLabel(trailers.items[0].kind) : null;
}

/**
 * Annonce au survol de la pastille du hub (« Bande-annonce officielle intégrée
 * à l'article »), ou null quand l'article n'a aucune vidéo officielle.
 *
 * @param {string} route route de la carte ou identifiant d'article
 */
export function trailerFlagTitle(routeOrKey) {
  const trailers = getArticleTrailers(articleKeyOf(routeOrKey));
  return trailers ? KIND_HINTS[trailers.items[0].kind] || KIND_HINTS.trailer : null;
}
