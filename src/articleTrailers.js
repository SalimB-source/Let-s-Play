// Bandes-annonces et teasers intégrés au corps des articles des actus.
//
// Clé = identifiant de l'article (le même que les cartes du hub `/news/cinema`,
// donc préfixé « cinema/ » — ou celui du hub `/news/gaming` quand une actu
// gaming déclare les trailers d'un studio). Le gabarit de page
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
  coulisses: 'COULISSES',
  replay: 'REPLAY',
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
  coulisses: 'COULISSES OFFICIELLES',
  replay: 'REPLAY OFFICIEL',
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
  coulisses: 'Coulisses officielles intégrées à l’article',
  replay: 'Replay officiel intégré à l’article',
};

/** Lien public d'une vidéo YouTube (aucun embed codé en dur hors de lib/). */
export function trailerWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export const articleTrailers = {
  // ---- Édition du dimanche 18.10.2026 --------------------------------------
  // Titres et chaînes contrôlés sur les pages YouTube publiques le 18.10.2026.
  // Gaming : la présentation officielle d'Ocarina of Time sur Switch 2 est la
  // seule vidéo publiée par Nintendo sur le remake — aucune vidéo spécifique
  // aux options d'affichage n'existe à cette date, et la note le dit.
  // Cinéma : la nouvelle bande-annonce de Ramayana est celle du distributeur
  // mondial, Sony Pictures Entertainment ; la première bande-annonce sert de
  // contexte dans le sélecteur.
  // Tech : aucune vidéo officielle (ANSSI, Cnaf ou organisations visées) ne
  // documente la vague d'incidents du 17 octobre ; l'absence est explicitée.
  'zelda-ocarina-of-time-switch-2-affichages-hud': {
    label: 'ZELDA OCARINA OF TIME', meta: 'NINTENDO · SWITCH 2 · 5 NOVEMBRE 2026',
    items: [
      { id: '8v8eDMh1o3g', kind: 'trailer', title: 'The Legend of Zelda: Ocarina of Time – Overview Trailer – Nintendo Switch 2', channel: 'Nintendo of America', verified: '18.10.2026', note: 'Présentation officielle du remake publiée le 14 octobre 2026 : c’est la seule vidéo diffusée par Nintendo sur le jeu à la date du 18 octobre, aucune vidéo dédiée aux modes d’affichage Standard, Pro et Master n’ayant été publiée. Elle sert d’illustration à cet article.' },
    ],
    credit: 'Vidéo officielle : chaîne principale Nintendo of America, sur YouTube. The Legend of Zelda: Ocarina of Time sort le 5 novembre 2026, exclusivement sur Nintendo Switch 2.',
  },
  'peak-console-edition-crossplay-22-octobre': {
    label: 'PEAK: CONSOLE EDITION', meta: 'AGGRO CRAB · LANDFALL · 22 OCTOBRE 2026',
    items: [
      { id: 'OsO0Dpt9OPs', kind: 'trailer', title: 'PEAK: Console Edition | Coming October 22nd', channel: 'Aggro Crab', verified: '18.10.2026', note: 'Annonce officielle publiée le 15 octobre 2026 : sortie le 22 octobre sur PlayStation 5, Xbox Series X|S et Nintendo Switch 2, avec crossplay, toutes les mises à jour de contenu et une édition physique en précommande.' },
    ],
    credit: 'Vidéo officielle : chaîne Aggro Crab (co-développeur de PEAK avec Landfall), sur YouTube.',
  },
  'cinema/ramayana-rise-of-a-legend-nouvelle-bande-annonce': {
    label: 'RAMAYANA: RISE OF A LEGEND', meta: 'SONY PICTURES · 5 NOVEMBRE 2026',
    items: [
      { id: 'AYkPRN874m8', kind: 'trailer', title: 'RAMAYANA: RISE OF A LEGEND - NEW TRAILER', channel: 'Sony Pictures Entertainment', verified: '18.10.2026', note: 'Nouvelle bande-annonce publiée le 15 octobre 2026 : sortie mondiale le 5 novembre en salles, IMAX et formats premium, avec Ranbir Kapoor, Yash et Sai Pallavi.' },
      { id: '1zip1rNaNYs', kind: 'trailer', title: 'RAMAYANA: RISE OF A LEGEND - Official Trailer', channel: 'Sony Pictures Entertainment', verified: '18.10.2026', note: 'Première bande-annonce officielle du film, publiée deux mois plus tôt par le même distributeur.' },
      { id: 'djmh9ca-Ibg', kind: 'trailer', title: 'RAMAYANA: RISE OF A LEGEND - Offizieller Trailer (Deutsch)', channel: 'Sony Pictures Germany', verified: '18.10.2026', note: 'Version allemande de la bande-annonce, en anglais, publiée par Sony Pictures Germany.' },
    ],
    credit: 'Bandes-annonces officielles : chaînes Sony Pictures Entertainment et Sony Pictures Germany, sur YouTube. Film réalisé par Nitesh Tiwari, produit par Namit Malhotra (DNEG), musique de Hans Zimmer et A.R. Rahman.',
  },

  // ---- Édition du samedi 17.10.2026 ----------------------------------------
  // Gaming : les deux vidéos de Total War: SHOGUN 2 - Complete Edition sont
  // celles de la chaîne officielle Total War ; elles documentent ce que le
  // studio présentait avant le retrait de la vente. Les « ensembles de succès »
  // de Steam n'ont fait l'objet d'aucune vidéo officielle de Valve.
  // Cinéma : la bande-annonce de la saison 2 de Daredevil: Born Again, publiée
  // par Marvel Entertainment, illustre un article portant sur la saison 3 — la
  // note le dit, aucune vidéo de la saison 3 n'existant à cette date.
  'steam-ensembles-de-succes-beta': {
    label: 'STEAM ACHIEVEMENT SETS', items: [],
    pending: 'Aucune vidéo officielle consacrée aux ensembles de succès n’a été publiée par Valve dans les sources consultées (annonce officielle « Steam Achievement Sets Now in Beta » du 15 octobre 2026, notes de version du client Steam, documentation Steamworks, Engadget, The Verge et gaming.net). Les vidéos de youtubeurs qui présentent la bêta ne sont pas officielles : le lecteur reste vide et l’absence est dite.',
  },
  'total-war-shogun-2-complete-edition-retiree': {
    label: 'TOTAL WAR: SHOGUN 2', meta: 'SEGA · CREATIVE ASSEMBLY / MATABOO',
    items: [
      { id: '7GhrQYfOPPw', kind: 'trailer', title: 'Total War: SHOGUN 2 - Complete Edition - Launch Trailer', channel: 'Total War', verified: '18.10.2026', note: 'Bande-annonce de lancement publiée le 13 octobre 2026, quatre jours avant le retrait de cette édition de la vente.' },
      { id: 'IC72MSW09qI', kind: 'trailer', title: 'Total War: SHOGUN 2 - Complete Edition - Announce Trailer', channel: 'Total War', verified: '18.10.2026', note: 'Bande-annonce d’annonce de la Complete Edition, développée par The Creative Assembly avec le studio MATABOO.' },
      { id: 'aV87N57Ud58', kind: 'replay', title: 'Total War: SHOGUN 2 - Complete Edition - Game Overview', channel: 'Total War', verified: '18.10.2026', note: 'Présentation détaillée des changements annoncés (interface modernisée, cinématiques retravaillées, localisation), soit les éléments les plus critiqués par les joueurs.' },
    ],
    credit: 'Vidéos officielles : chaîne principale Total War (SEGA / The Creative Assembly), sur YouTube.',
  },
  'cinema/daredevil-born-again-saison-3-finale': {
    label: 'DAREDEVIL: BORN AGAIN', meta: 'MARVEL TELEVISION · DISNEY+',
    items: [
      { id: 'U1MqJBVn8Rk', kind: 'trailer', title: 'Daredevil: Born Again | Season 2 Trailer | Marvel Television | Disney+', channel: 'Marvel Entertainment', verified: '18.10.2026', note: 'Bande-annonce de la saison 2, disponible sur Disney+ depuis le 24 mars 2026. Aucune vidéo de la saison 3 n’ayant été publiée, elle illustre les déclarations de Brad Winderbaum sur la fin de la série.' },
    ],
    credit: 'Bande-annonce officielle : chaînes Marvel Entertainment et Disney Plus, sur YouTube.',
  },
  'tech/google-ai-overviews-liens-mis-en-avant': {
    label: 'GOOGLE AI OVERVIEWS', items: [],
    pending: 'Aucune vidéo officielle de Google ne présente spécifiquement ces changements dans les sources consultées (annonce de Hema Budaraju sur le blog The Keyword du 15 octobre 2026, messages de Nick Fox sur X, dépêche de l’AFP, analyses de Stratégies et Libération). Les analyses de référenceurs ne sont pas officielles : le lecteur reste vide et l’absence est dite.',
  },

  // ---- Édition du vendredi 16.10.2026 --------------------------------------
  // Gaming : la bande-annonce de la campagne de Modern Warfare 4 est celle de
  // la chaîne officielle Call of Duty ; le trailer de lancement de Beast of
  // Reincarnation (4 août 2026) sert d’illustration à un article portant sur la
  // fin du cycle de mises à jour — la note le dit.
  // Cinéma : HBO n’a publié aucune image ni vidéo de la saison 5 de True
  // Detective, encore au stade de l’annonce de distribution.
  // Tech : Meta n’a publié ni vidéo ni communiqué visuel sur l’incident des
  // Ray-Ban Meta.
  'modern-warfare-4-campagne-acces-anticipe': {
    label: 'CALL OF DUTY: MODERN WARFARE 4', meta: 'ACTIVISION · SORTIE LE 23 OCTOBRE 2026',
    items: [
      { id: 'yLFRQaQT0qM', kind: 'trailer', title: 'Call of Duty: Modern Warfare 4 - Official Campaign Trailer', channel: 'Call of Duty', verified: '18.10.2026', note: 'Bande-annonce officielle de la campagne publiée le 17 septembre 2026 : « De la Corée aux confins du globe, la Task Force 141 affronte une guerre sans frontières. »' },
    ],
    credit: 'Bande-annonce officielle : chaîne principale Call of Duty (Activision), sur YouTube.',
  },
  'beast-of-reincarnation-fin-cycle-mises-a-jour': {
    label: 'BEAST OF REINCARNATION', meta: 'GAME FREAK · PS5 / XBOX / PC',
    items: [
      { id: 'YBAuVSnS0ls', kind: 'trailer', title: 'Beast of Reincarnation - Launch Trailer | PS5 Games', channel: 'PlayStation', verified: '18.10.2026', note: 'Bande-annonce de lancement publiée le 4 août 2026. Game Freak n’ayant diffusé aucune vidéo pour annoncer la fin de la phase de mises à jour rapprochées, elle sert d’illustration à cet article.' },
    ],
    credit: 'Bande-annonce officielle : chaîne principale PlayStation (Sony Interactive Entertainment), sur YouTube. Jeu développé par GAME FREAK inc.',
  },
  'cinema/true-detective-saison-5-cage-banderas': {
    label: 'TRUE DETECTIVE SAISON 5', items: [],
    pending: 'HBO n’a publié aucune bande-annonce, aucun teaser ni aucune image officielle de la saison 5 de True Detective dans les sources consultées (annonce de distribution du 16 octobre 2026 relayée par The Playlist et la presse spécialisée) : la saison n’entrera en tournage qu’en 2027. Les bandes-annonces des saisons précédentes ne sont pas intégrées, l’article portant sur une distribution et non sur une œuvre déjà filmée.',
  },
  'tech/ray-ban-meta-enregistrements-sans-consentement': {
    label: 'RAY-BAN META', items: [],
    pending: 'Meta n’a publié aucune vidéo ni démonstration officielle du correctif dans les sources consultées (enquête d’Ars Technica du 16 octobre 2026, signalement d’origine sur Reddit, reprises de TechRadar France et Frandroid). Les présentations produit des Ray-Ban Meta ne documentent pas cet incident : le lecteur reste vide et l’absence est dite.',
  },

  // Édition du 15.10.2026 : chaînes et miniatures contrôlées sur les pages YouTube.
  // GTA VI : la bande-annonce de lancement publiée le jour même par Rockstar
  // Games. Titre et chaîne vérifiés via oEmbed le 15.10.2026 (« Grand Theft
  // Auto VI Launch Trailer », Rockstar Games) ; l'URL est celle que
  // rockstargames.com/VI/launch-trailer met en avant. Les deux trailers
  // précédents ne sont pas ajoutés ici : l'article porte sur cette vidéo, et
  // ils sont déjà déclarés sous les clés gaming du 06.10 et du 07.10.2026.
  'gta-6-trailer-de-lancement': {
    label: 'GRAND THEFT AUTO VI', meta: 'ROCKSTAR GAMES · 19 NOVEMBRE 2026',
    items: [
      { id: 'rz1B4B2yBZY', kind: 'trailer', title: 'Grand Theft Auto VI Launch Trailer', channel: 'Rockstar Games', verified: '15.10.2026' },
    ],
    credit: 'Bande-annonce officielle : Rockstar Games, publiée le 15 octobre 2026 sur YouTube. Images capturées dans le jeu sur PlayStation 5, selon le studio ; musique « Flower in a Hurricane » de Justice feat. Tame Impala, SZA et King Gizzard & The Lizard Wizard.',
  },
  'zelda-ocarina-of-time-nouvelle-presentation': {
    label: 'ZELDA OCARINA OF TIME', meta: 'NINTENDO · SWITCH 2',
    items: [
      { id: '8v8eDMh1o3g', kind: 'trailer', title: 'The Legend of Zelda: Ocarina of Time – Overview Trailer – Nintendo Switch 2', channel: 'Nintendo of America', verified: '15.10.2026' },
    ],
    credit: 'Présentation officielle : Nintendo of America, publiée le 14 octobre 2026 sur YouTube.',
  },
  'cinema/narnia-gerwig-chronologie-esthetique': {
    label: 'NARNIA : LE NEVEU DU MAGICIEN', meta: 'NETFLIX · GRETA GERWIG',
    items: [
      { id: 'gDJ-ini7fF0', kind: 'trailer', title: 'NARNIA: THE MAGICIAN’S NEPHEW | Official Trailer | Netflix', channel: 'Netflix', verified: '15.10.2026' },
    ],
    credit: 'Bande-annonce officielle : Netflix, publiée le 13 octobre 2026 sur YouTube.',
  },
  'tech/free-mvpn-filtres-pays-widget': {
    label: 'FREE MVPN', items: [],
    pending: 'Aucune vidéo officielle consacrée à cette mise à jour n’a été identifiée dans les sources consultées (Free mVPN et Mag Free, le 15 octobre 2026). Le visuel provient de Free ; aucun tutoriel tiers n’est présenté comme officiel.',
  },
  // ---- Édition du mercredi 14.10.2026 --------------------------------------
  // Titres et chaînes contrôlés via YouTube oEmbed le 14.10.2026.
  // Gaming : le trailer de lancement du pack Avatar Legends (publié le 14.10.2026),
  // le Year Two Showcase complet et la présentation du mode Duel proviennent de la
  // chaîne officielle Sonic the Hedgehog.
  // Cinéma : la bande-annonce et la featurette d'entraînement de Street Fighter (2026)
  // proviennent de la chaîne principale Paramount Pictures.
  // Tech : les trois vidéos de présentation d'Apple HomeView, de l'Apple TV 4K (A19)
  // et du HomePod mini 2 (S10) proviennent de la chaîne principale Apple.
  'sonic-racing-crossworlds-annee-2': {
    label: 'SONIC RACING: CROSSWORLDS', meta: 'SEGA · ANNÉE 2 & AVATAR LEGENDS',
    items: [
      { id: 'mAN1R_RoKrI', kind: 'trailer', title: 'Sonic Racing: CrossWorlds - Avatar Legends Pack Launch Trailer', channel: 'Sonic the Hedgehog', verified: '14.10.2026' },
      { id: 'O0TSwHOJ7Xw', kind: 'replay', title: 'Sonic Racing: CrossWorlds - Year Two Showcase', channel: 'Sonic the Hedgehog', verified: '14.10.2026', note: 'Présentation intégrale de la feuille de route de l’Année 2 (Bayonetta, Godzilla, Evangelion, Sanrio, SEGALAND, Final Fantasy VII Remake, Persona et baisse de prix).' },
      { id: '9iaR0YiqGJg', kind: 'trailer', title: 'Sonic Racing: CrossWorlds - Duel Mode', channel: 'Sonic the Hedgehog', verified: '14.10.2026', note: 'Présentation du nouveau mode Duel en un contre un sans objets offensifs, inclus dans la mise à jour gratuite du 3 novembre 2026.' },
    ],
    credit: 'Vidéos officielles : chaîne principale Sonic the Hedgehog (SEGA), sur YouTube.',
  },
  'cinema/street-fighter-sortie-suite-sakurai': {
    label: 'STREET FIGHTER (2026)', meta: 'PARAMOUNT · LEGENDARY / CAPCOM',
    items: [
      { id: 'U6sbm1OaJb8', kind: 'trailer', title: 'Street Fighter | New Trailer (2026 Movie)', channel: 'Paramount Pictures', verified: '14.10.2026' },
      { id: 'Zk2aB3Wc17c', kind: 'coulisses', title: 'Training for Street Fighter (2026 Movie)', channel: 'Paramount Pictures', verified: '14.10.2026', note: 'Coulisses de la préparation physique et martiale du casting autour d’Andrew Koji, Noah Centineo et Callina Liang.' },
    ],
    credit: 'Vidéos officielles : chaîne principale Paramount Pictures, sur YouTube.',
  },
  'tech/apple-homeview-apple-tv-4k-homepod-mini-2': {
    label: 'APPLE HOMEVIEW & SALON 2026', meta: 'APPLE · WELCOME HOME',
    items: [
      { id: 'QeQAXuQpGEA', kind: 'trailer', title: 'The new Apple HomeView: Keep the whole home connected, entertained, and in the know.', channel: 'Apple', verified: '14.10.2026' },
      { id: 'bNdmGYamiWM', kind: 'trailer', title: 'The new Apple TV 4K: The ultimate cinematic experience.', channel: 'Apple', verified: '14.10.2026', note: 'Présentation officielle de l’Apple TV 4K de 4e génération équipée de la puce A19 et de microphones longue portée pour Siri AI.' },
      { id: 'xLL4UnrLNWs', kind: 'trailer', title: 'The new HomePod mini 2: Rich, room-filling sound in a compact design.', channel: 'Apple', verified: '14.10.2026', note: 'Présentation officielle du HomePod mini 2 sous puce S10 et architecture acoustique à quatre haut-parleurs.' },
    ],
    credit: 'Vidéos officielles : chaîne principale Apple, sur YouTube.',
  },
  'tekken-8-roger-jr-ace-combat-8-million': {
    label: 'TEKKEN 8 & ACE COMBAT 8', meta: 'BANDAI NAMCO · SAISON 3 & 1M',
    items: [
      { id: 'fehoyeYVOtE', kind: 'trailer', title: 'TEKKEN 8 - Roger Jr. Gameplay Reveal Trailer', channel: 'Bandai Namco Entertainment America', verified: '14.10.2026' },
      { id: 'ZMFY0G-DOv4', kind: 'trailer', title: 'TEKKEN 8 - 「ロジャーJr.」 ゲームプレイトレイラー', channel: 'tekkenchannel', verified: '14.10.2026', note: 'Bande-annonce de gameplay de Roger Jr. dans sa version japonaise officielle publiée par tekkenchannel.' },
      { id: 'yOS-Yb5z3-k', kind: 'trailer', title: 'ACE COMBAT 8: WINGS OF THEVE | Accolades Trailer', channel: 'Bandai Namco Entertainment America', verified: '14.10.2026', note: 'Bande-annonce officielle accompagnant le cap du million d’exemplaires vendus dans le monde pour Ace Combat 8: Wings of Theve.' },
    ],
    credit: 'Vidéos officielles : chaînes principales Bandai Namco Entertainment America et tekkenchannel, sur YouTube.',
  },
  'cinema/narnia-le-neveu-du-magicien-bande-annonce-netflix': {
    label: 'NARNIA : LE NEVEU DU MAGICIEN', meta: 'NETFLIX · GRETA GERWIG',
    items: [
      { id: 'gDJ-ini7fF0', kind: 'trailer', title: 'NARNIA: THE MAGICIAN’S NEPHEW | Official Trailer | Netflix', channel: 'Netflix', verified: '14.10.2026' },
    ],
    credit: 'Bande-annonce officielle : chaîne principale Netflix, mise en ligne le 14 octobre 2026.',
  },
  'tech/google-play-apps-vibe-codees-gemini-spark': {
    label: 'ANDROID & GEMINI 4 ARGON', meta: 'GOOGLE · ANDROID DEVELOPERS',
    items: [
      { id: '91oc9SyHxKI', kind: 'trailer', title: 'Project Planetarium: 3D Android UI with Gemini 4 Argon', channel: 'Android Developers', verified: '14.10.2026', note: 'Démonstration officielle publiée par Android Developers montrant Gemini 4 Argon générer et déployer une interface 3D spatiale interactive dans Jetpack Compose.' },
      { id: 'JMPd2jbQEqo', kind: 'trailer', title: 'Android CLI and skills to improve your development', channel: 'Android Developers', verified: '14.10.2026', note: 'Présentation par l’équipe Android Developers des nouveaux outils et compétences d’assistance au développement mobile.' },
    ],
    credit: 'Vidéos officielles : chaîne principale Android Developers (Google), sur YouTube.',
  },

  // ---- Édition du dimanche 11.10.2026 --------------------------------------
  // Titres et chaînes contrôlés via YouTube oEmbed le 11.10.2026.
  // Le teaser de l'anime Ghost of Tsushima: Legends date de juillet 2026 : la
  // note dit qu'il sert d'illustration, pas d'annonce du report à 2028.
  // La bande-annonce de L'Exorciste : Martyrs est, elle, bien celle dévoilée
  // à la New York Comic Con le 9 octobre 2026.
  'ghost-tsushima-legends-anime-2028': {
    label: 'GHOST OF TSUSHIMA: LEGENDS', meta: 'CRUNCHYROLL · ANIPLEX',
    items: [
      { id: 'uU8slMpqDXU', kind: 'teaser', title: 'Ghost of Tsushima Legends | Official Teaser | Crunchyroll', channel: 'Crunchyroll', verified: '11.10.2026', note: 'À titre d’illustration : le teaser « character art » publié par Crunchyroll en juillet 2026, avant l’annonce du report. Il présente le trio de personnages et le traitement encre de l’anime, pas la nouvelle fenêtre de diffusion.' },
      { id: 'm4E5n06ZxNU', kind: 'teaser', title: 'アニメ「Ghost of Tsushima 冥人奇譚」キャラクターアートPV', channel: 'アニプレックス チャンネル', verified: '11.10.2026', note: 'Le même teaser « character art » dans sa version japonaise, publiée par Aniplex, coproducteur de l’anime : mêmes images, titres et mentions en japonais. La vidéo est en japonais ; le titre traduit annonce le visuel de personnages de l’anime Ghost of Tsushima : Legends.' },
    ],
    credit: 'Vidéos officielles : chaîne principale Crunchyroll (version anglaise) et chaîne アニプレックス チャンネル d’Aniplex (version japonaise), teasers de juillet 2026 intégrés à titre d’illustration.',
  },
  'cinema/exorciste-martyrs-trailer': {
    label: 'L’EXORCISTE : MARTYRS', meta: 'UNIVERSAL · BLUMHOUSE',
    items: [
      { id: 'iIEYfH-jg1Y', kind: 'trailer', title: 'The Exorcist: Martyrs | Official Trailer', channel: 'Universal Pictures', verified: '11.10.2026' },
    ],
    credit: 'Bande-annonce officielle : chaîne principale Universal Pictures, dévoilée au BlumFest de la New York Comic Con le 9 octobre 2026.',
  },
  'tech/anthropic-claude-faux-indice-philadelphie': {
    label: 'ANTHROPIC · AGENTS IA', meta: 'ÉVALUATIONS INTERNES',
    pending: 'Aucune vidéo officielle : Anthropic n’a publié ni captation ni point presse filmé sur cet incident, et le formulaire de la police de Philadelphie ne donne évidemment pas d’images. L’article se tient donc au rapport du laboratoire et aux prises de parole publiques.',
  },

  // ---- Fournée du mercredi 07.10.2026 ---------------------------------------
  // GTA VI (gaming) : les bandes-annonces officielles de Rockstar Games
  // présentent Leonida et Vice City, où se déroulera GTA VI.
  'gta-6-cloud-pc-dementi-xbox': {
    label: 'GRAND THEFT AUTO VI', meta: 'ROCKSTAR GAMES · LEONIDA',
    items: [
      { id: 'QdBZY2fkU-0', kind: 'trailer', title: 'Grand Theft Auto VI Trailer 1', channel: 'Rockstar Games', verified: '07.10.2026', note: 'À titre d’illustration : le premier trailer officiel (04.12.2023) présente Leonida et Vice City, où se jouera GTA VI.' },
      { id: 'VQRLujxTm3c', kind: 'trailer', title: 'Grand Theft Auto VI Trailer 2', channel: 'Rockstar Games', verified: '07.10.2026', note: 'À titre d’illustration : le deuxième trailer officiel (06.05.2025) suit Jason et Lucia dans Leonida.' },
    ],
    credit: 'Vidéos officielles : Rockstar Games, sur YouTube (trailers 1 et 2).',
  },
  // Spider-Man 4 (cinéma) : Destin Daniel Cretton prépare le tournage,
  // aucune image animée officielle n’a encore été publiée.
  'cinema/spider-man-4-destin-daniel-cretton': {
    label: 'SPIDER-MAN 4', meta: 'SONY PICTURES · MARVEL STUDIOS',
    pending: 'Aucune bande-annonce : le quatrième opus de Spider-Man avec Tom Holland et Zendaya n’a encore dévoilé aucune image officielle — Sony Pictures et Marvel Studios préparent le tournage pour l’été.',
  },
  // ---- Fournée du mardi 06.10.2026 -----------------------------------------
  // Gaming : Rockstar Games publie ses trailers sur sa propre chaîne — les
  // seules vidéos officielles montrant l’État de Leonida dont parle l’article.
  // L’Extended Look du 27.08.2026 n’est pas repris ici : ses URLs n’ont pas pu
  // être recoupées le jour de la rédaction, contrairement à celles des deux
  // trailers (relevées sur rockstargames.com/VI et sur le listing des uploads
  // Rockstar). L’entrée vit sous une clé gaming : `npm run check:trailers`
  // accepte désormais les actus gaming publiées par le hub `/news/gaming`.
  'gta-6-satire-monde-invente': {
    label: 'GRAND THEFT AUTO VI', meta: 'ROCKSTAR GAMES · LEONIDA',
    items: [
      { id: 'QdBZY2fkU-0', kind: 'trailer', title: 'Grand Theft Auto VI Trailer 1', channel: 'Rockstar Games', verified: '06.10.2026', note: 'À titre d’illustration : le premier trailer officiel (04.12.2023) présente Leonida et Vice City, le monde inventé où se jouera la satire du jeu.' },
      { id: 'VQRLujxTm3c', kind: 'trailer', title: 'Grand Theft Auto VI Trailer 2', channel: 'Rockstar Games', verified: '06.10.2026', note: 'À titre d’illustration : le deuxième trailer officiel (06.05.2025) suit Jason et Lucia dans Leonida, quelques mois avant la sortie du jeu.' },
    ],
    credit: 'Vidéos officielles : Rockstar Games, sur YouTube (trailers 1 et 2).',
  },
  // Cinéma : la suite n’a publié aucune bande-annonce. Le seul aperçu animé de
  // 2026 est un camera test diffusé par Matt Reeves sur son compte Vimeo —
  // hors du lecteur YouTube du site —, donc l’actu s’appuie sur la campagne
  // officielle de The Batman (2022), reprise à titre d’illustration (`note`),
  // comme les galeries reprennent la saga précédente. Identifiant et chaîne
  // recoupés le 06.10.2026 : upload Warner Bros. du « Trailer 2 » de 2022,
  // listé par la fiche Archive.org du trailer.
  'cinema/the-batman-part-ii-tournage-suspendu': {
    label: 'THE BATMAN PART II', meta: 'DC STUDIOS · WARNER BROS.',
    items: [
      { id: 'mqqft2x_Aa4', kind: 'trailer', title: 'The Batman – Trailer 2 (2022)', channel: 'Warner Bros.', verified: '06.10.2026', note: 'À titre d’illustration : la bande-annonce de The Batman (2022), premier film de l’univers de Matt Reeves — The Batman Part II, toujours en tournage, n’a publié aucune image animée.' },
    ],
    credit: 'Vidéo officielle : Warner Bros., sur YouTube (campagne de The Batman, 2022).',
  },
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

/**
 * Vidéo de tête d'un article — la première déclarée, celle dont la pastille
 * du hub reprend la nature — ou null si l'article n'a aucune vidéo officielle.
 * C'est elle que la carte de tête du flux `/news/gaming` projette dans son
 * cadre (src/pages/GamingNews.jsx), à la place du visuel de l'actu.
 *
 * @param {string} routeOrKey route de la carte (ex. `/news/gta-6-satire-monde-invente`)
 *   ou identifiant d'article
 * @returns {{id: string, kind: string, title: string, channel: string, note?: string}|null}
 */
export function leadTrailer(routeOrKey) {
  const trailers = getArticleTrailers(articleKeyOf(routeOrKey));
  return trailers ? trailers.items[0] : null;
}
