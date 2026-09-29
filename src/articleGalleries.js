// Sélections de captures d'écran / photogrammes intégrées au corps des
// articles (à la place de l’ancien encadré « En bref »).
//
// Clé = identifiant de l’article (celui des routes CurrentNews/BlizzardNews
// ou du gabarit de page dédiée). Les fichiers vivent dans
// public/screenshots/<dossier>/. Les légendes sont en français, comme le
// reste des pages actus ; le crédit précise toujours la source du visuel —
// quand un jeu n’a encore rien montré, on affiche la saga à titre
// d’illustration et on le dit.
//
// Cas particulier des dossiers (`dossier-*`) : les captures sont les trois
// photogrammes que YouTube extrait automatiquement de l’épisode (quart,
// moitié, trois quarts de la vidéo), via youTubeFrameUrl() — aucun fichier
// local à déposer, et les URL passent par la fabrique unique de
// src/lib/videoThumbnails.js (règle `npm run check:thumbs`).

import { youTubeFrameUrl } from './lib/videoThumbnails';

export const articleGalleries = {
  // ---- Actus gaming -------------------------------------------------------
  'physint-budget-400-millions-xbox': {
    label: 'PHYSINT × XBOX', meta: 'KOJIMA PRODUCTIONS · XBOX',
    items: [
      { src: 'news-auto/physint-un-budget-de-400-millions-de-dollars-pour-le-jeu-de-official.jpg', alt: 'Physint — visuel clé officiel « Here Comes the Feeling » dévoilé par Kojima Productions', caption: '01 / « Here Comes the Feeling », key art officiel de Physint' },
      { src: 'news-sources/kojima-asha-sharma-xbox-tokyo.jpg', alt: 'Hideo Kojima et Asha Sharma posent chez Kojima Productions à Tokyo avec les vestes Xbox', caption: '02 / Hideo Kojima et Asha Sharma chez Kojima Productions à Tokyo' },
      { src: 'kojima-xbox-news.jpg', alt: 'Carte éditoriale Let’s Play récapitulant le passage de Kojima Productions chez Xbox avec Physint et OD', caption: '03 / Après PlayStation, Physint rejoint OD sous bannière Xbox' },
    ],
    credit: 'Visuels : affiche teaser officielle de Physint (Kojima Productions), photographie officielle Hideo Kojima & Asha Sharma (comptes X officiels, 14.09.2026) et composition éditoriale Let’s Play.',
    creditSources: [
      { label: 'article ActuGaming sur le budget de Physint chez Xbox', href: 'https://www.actugaming.net/physint-un-budget-de-400-millions-de-dollars-pour-le-jeu-de-kojima-xbox-aurait-signe-pour-beaucoup-moins-que-cela-827065/' },
    ],
  },
  'halo-activision': {
    label: 'HALO INFINITE', meta: '343 INDUSTRIES · XBOX',
    items: [
      { src: 'screenshots/halo-activision/01.jpg', alt: 'Halo Infinite — Master Chief face aux Exilés sur Zeta Halo', caption: '01 / Zeta Halo, la campagne Infinite' },
      { src: 'screenshots/halo-activision/02.jpg', alt: 'Halo Infinite — captures de la campagne sur Zeta Halo', caption: '02 / La saga vue par 343 Industries' },
      { src: 'screenshots/halo-activision/03.jpg', alt: 'Halo Infinite — Master Chief en armure Mjolnir', caption: '03 / Master Chief passe chez Activision' },
    ],
    credit: 'Captures : Halo Infinite (343 Industries / Xbox Game Studios), à titre d’illustration — le prochain Halo d’Activision n’a pas encore montré d’images.',
  },
  'ea-sports-fc-27-carriere-dynamique': {
    label: 'MODE CARRIÈRE', meta: 'EA SPORTS · CAPTURES OFFICIELLES',
    items: [
      { src: 'screenshots/ea-sports-fc-27/01.jpg', alt: 'Interface du mode Carrière avec le hub du club et ses objectifs', caption: '01 / Le hub Carrière et ses objectifs' },
      { src: 'screenshots/ea-sports-fc-27/02.jpg', alt: 'Conversation avec un joueur qui souhaite discuter une prolongation', caption: '02 / Le vestiaire parle, le moral bouge' },
      { src: 'screenshots/ea-sports-fc-27/03.jpg', alt: 'Éditeur de tactiques d’équipe avec formation et style de jeu', caption: '03 / L’éditeur de tactiques' },
    ],
    credit: 'Captures officielles du mode Carrière EA SPORTS FC — © Electronic Arts.',
  },
  'control-resonant-24-septembre': {
    label: 'CONTROL', meta: 'REMEDY ENTERTAINMENT',
    items: [
      { src: 'screenshots/control-resonant/01.jpg', alt: 'CONTROL — l’Oldest House, le siège paranormal du FBC', caption: '01 / L’Oldest House, QG du FBC' },
      { src: 'screenshots/control-resonant/02.jpg', alt: 'CONTROL — Jesse Faden affronte une menace paranormale', caption: '02 / L’action paranormale de Remedy' },
      { src: 'screenshots/control-resonant/03.jpg', alt: 'CONTROL — les couloirs mouvants de l’Oldest House', caption: '03 / Le Département des recherches' },
    ],
    credit: 'Captures : Control (Remedy Entertainment), à titre d’illustration — Resonant sort le 24 septembre.',
  },
  'kingdom-hearts-4-coco': {
    label: 'KINGDOM HEARTS IV', meta: 'SQUARE ENIX · DISNEY',
    items: [
      { src: 'screenshots/kingdom-hearts-4/01.jpg', alt: 'Kingdom Hearts 4 — Sora observe la ville de Quadratum', caption: '01 / Sora dans Quadratum' },
      { src: 'screenshots/kingdom-hearts-4/02.jpg', alt: 'Kingdom Hearts 4 — Sora se repose dans son appartement de Quadratum', caption: '02 / L’appartement, capture du trailer' },
    ],
    credit: 'Captures : trailers officiels KINGDOM HEARTS IV. KINGDOM HEARTS © Disney. Developed by SQUARE ENIX.',
  },
  'wolverine-exclu-ps5': {
    label: 'MARVEL’S WOLVERINE', meta: 'INSOMNIAC GAMES · PS5',
    items: [
      { src: 'screenshots/wolverine-ps5/01.jpg', alt: 'Marvel’s Wolverine — Logan, image promotionnelle d’Insomniac Games', caption: '01 / Logan, image promotionnelle' },
      { src: 'screenshots/wolverine-ps5/02.jpg', alt: 'Marvel’s Wolverine — Logan en manteau de fourrure lors de la prise en main', caption: '02 / Prise en main : la fourrure et les griffes' },
    ],
    credit: 'Visuels : Marvel’s Wolverine (Insomniac Games / Sony Interactive Entertainment).',
  },
  'cyberpunk-2077-battlenet': {
    label: 'CYBERPUNK 2077', meta: 'CD PROJEKT RED · NIGHT CITY',
    items: [
      { src: 'screenshots/cyberpunk-2077/01.jpg', alt: 'Cyberpunk 2077 — vue de Night City illuminée', caption: '01 / Night City, direction Battle.net' },
      { src: 'screenshots/cyberpunk-2077/02.jpg', alt: 'Cyberpunk 2077 — les rues bondées de Night City', caption: '02 / Les rues de la ville éternelle' },
      { src: 'screenshots/cyberpunk-2077/03.jpg', alt: 'Cyberpunk 2077 — environnement néonité de Night City', caption: '03 / L’Ultimate Edition change de quartier' },
    ],
    credit: 'Captures : Cyberpunk 2077 (CD PROJEKT RED).',
  },
  'rayman-legends-retold': {
    label: 'RAYMAN LEGENDS', meta: 'UBISOFT · LE RETOUR',
    items: [
      { src: 'screenshots/rayman-legends/01.jpg', alt: 'Rayman Legends — niveau coloré du jeu de plateforme', caption: '01 / Les niveaux cultes du platformer' },
      { src: 'screenshots/rayman-legends/02.jpg', alt: 'Rayman Legends — Rayman et ses amis en pleine course', caption: '02 / La patte graphique d’Ubisoft' },
      { src: 'screenshots/rayman-legends/03.jpg', alt: 'Rayman Legends — environnement peint du jeu', caption: '03 / Le rendez-vous passe au 3 décembre' },
    ],
    credit: 'Captures : Rayman Legends (Ubisoft), à titre d’illustration du remaster Retold.',
  },
  'fire-emblem-fortunes-weave': {
    label: 'L’UNIVERS FIRE EMBLEM', meta: 'NINTENDO · INTELLIGENT SYSTEMS',
    items: [
      { src: 'screenshots/fire-emblem/01.jpg', alt: 'Fire Emblem Engage — bataille tactique au tour par tour', caption: '01 / La formule tactique de la saga' },
      { src: 'screenshots/fire-emblem/02.jpg', alt: 'Fire Emblem Engage — affrontement sur la grille de combat', caption: '02 / Le tour par tour, signature de la série' },
      { src: 'screenshots/fire-emblem/03.jpg', alt: 'Fire Emblem Engage — dialogues et soutiens entre personnages', caption: '03 / Des liens à nouer entre les batailles' },
    ],
    credit: 'Captures : Fire Emblem Engage (Nintendo / Intelligent Systems), à titre d’illustration de la série — Fortune’s Weave sort le 17 septembre sur Switch 2.',
  },
  'persona-6-switch-2': {
    label: 'L’UNIVERS PERSONA', meta: 'ATLUS · SEGA',
    items: [
      { src: 'screenshots/persona/01.jpg', alt: 'Persona 5 Royal — Joker dans l’univers stylisé de la série', caption: '01 / Persona 5 Royal, la référence de la série' },
      { src: 'screenshots/persona/02.jpg', alt: 'Persona 5 Royal — Joker et Futaba dans un bar à jazz', caption: '02 / Le style ATLUS, signature de la saga' },
    ],
    credit: 'Captures : Persona 5 Royal (ATLUS / SEGA), à titre d’illustration — Persona 6 n’a pas encore montré de gameplay.',
  },
  'last-of-us-ii-mod': {
    label: 'THE LAST OF US PART II', meta: 'MOD MULTIJOUEUR · PC',
    items: [
      { src: 'screenshots/last-of-us-ii/01.jpg', alt: 'The Last of Us Part II — deux joueurs avancent ensemble dans le mod multijoueur de Speclizer', caption: '01 / Le mod de Speclizer en coopération' },
      { src: 'screenshots/last-of-us-ii/02.jpg', alt: 'The Last of Us Part II Remastered — Ellie retrouve Tommy', caption: '02 / Ellie et Tommy, le récit solo' },
      { src: 'screenshots/last-of-us-ii/03.jpg', alt: 'The Last of Us Part II Remastered — Ellie explore les rues envahies de Seattle', caption: '03 / Seattle, terrain d’exploration' },
    ],
    credit: 'Capture du mod de Speclizer via Wccftech ; captures du jeu : The Last of Us Part II Remastered (Naughty Dog / PlayStation) via XDA Developers.',
    creditSources: [
      { label: 'article Wccftech sur le mod et la demande d’arrêt de Sony', href: 'https://wccftech.com/speclizer-the-last-of-us-2-multiplayer-mod-sony-cease-desist/' },
      { label: 'test PC et captures XDA Developers', href: 'https://www.xda-developers.com/the-last-of-us-part-ii-remastered-pc-review/' },
    ],
  },
  'sorties-24-septembre': {
    label: 'LE 24 SEPTEMBRE EN IMAGES', meta: 'SILENT HILL × CONTROL',
    items: [
      { src: 'screenshots/sorties-24-septembre/01.jpg', alt: 'Silent Hill: Townfall — ambiance de l’île de St. Amelia', caption: '01 / Townfall, l’île de St. Amelia' },
      { src: 'screenshots/sorties-24-septembre/02.jpg', alt: 'Silent Hill: Townfall — exploration à la première personne', caption: '02 / L’enquête à la première personne' },
      { src: 'screenshots/sorties-24-septembre/03.jpg', alt: 'CONTROL — l’Oldest House chez Remedy', caption: '03 / Resonant, la réponse de Remedy' },
    ],
    credit: 'Captures : Silent Hill: Townfall (Konami) et Control (Remedy Entertainment).',
  },
  'netmarble-tgs-2026': {
    label: 'TROIS JEUX AU TGS', meta: 'NETMARBLE · TGS 2026',
    items: [
      { src: 'screenshots/netmarble-tgs/01.jpg', alt: 'Solo Leveling: KARMA — Sung Jinwoo, visuel du jeu mobile de Netmarble', caption: '01 / Solo Leveling: KARMA' },
      { src: 'screenshots/netmarble-tgs/02.jpg', alt: 'Shangri-La Frontier: The Seven Colossi — visuel officiel du RPG présenté au TGS', caption: '02 / Shangri-La Frontier: The Seven Colossi' },
      { src: 'screenshots/netmarble-tgs/03.png', alt: 'Pearl in Blue — visuel officiel du jeu présenté au TGS 2026', caption: '03 / Pearl in Blue' },
    ],
    credit: 'Visuels des trois jeux annoncés au TGS 2026. Sources : Netmarble, GameMeca et GachaGo.',
    creditSources: [
      { label: 'bilan TGS de Netmarble', href: 'https://www.eqs-news.com/news/corporate/netmarble-wraps-up-tokyo-game-show-2026-with-three-upcoming-titles/3fca48e2-6062-4712-8715-83b095654f1a_en' },
      { label: 'visuel Shangri-La Frontier (GameMeca)', href: 'https://gamemeca.com/en/view.php?gid=1780506' },
      { label: 'visuel Pearl in Blue (GachaGo)', href: 'https://gachago.com/en/news/pearl-in-blue-new-trailer-tgs-2026' },
    ],
  },

  // ---- Actus cinéma & séries ---------------------------------------------
  'cinema/jojo-steel-ball-run-episode-2': {
    label: 'STEEL BALL RUN', meta: 'NETFLIX · DAVID PRODUCTION',
    items: [
      { src: 'screenshots/cinema-jojo-steel-ball-run/01.jpg', alt: 'Steel Ball Run — gros plan sur Gyro Zeppeli', caption: '01 / Gyro Zeppeli, photogramme officiel' },
      { src: 'screenshots/cinema-jojo-steel-ball-run/02.jpg', alt: 'Steel Ball Run — Johnny et Gyro à cheval pendant la course', caption: '02 / Johnny et Gyro reprennent la route' },
      { src: 'screenshots/cinema-jojo-steel-ball-run/03.jpg', alt: 'Steel Ball Run — Steven Steel, Lucy Steel et Mountain Tim autour des journaux', caption: '03 / Mountain Tim et Lucy Steel, une intrigue parallèle' },
    ],
    credit: 'Photogrammes de l’épisode 2 — ©LUCKY LAND COMMUNICATIONS / SHUEISHA / JOJO’s Animation SBR Project.',
    creditSources: [
      { label: 'JoJoWiki', href: 'https://jojowiki.com/SBR_Episode_2' },
      { label: 'But Why Tho?', href: 'https://butwhytho.net/2026/09/steel-ball-run-episode-2-review/' },
      { label: 'Trill Mag', href: 'https://www.trillmag.com/entertainment/tv-film/the-journey-continues-steel-ball-run-episode-2-preview-and-episode-1-recap/' },
    ],
  },
  'cinema/dune-messiah-trailer': {
    label: 'DUNE: PART TWO', meta: 'WARNER BROS · LEGENDARY',
    items: [
      { src: 'screenshots/cinema-dune-messiah/01.jpg', alt: 'Dune Part Two — Paul Atréides, photogramme officiel', caption: '01 / Paul Atréides, photogramme officiel' },
      { src: 'screenshots/cinema-dune-messiah/02.jpg', alt: 'Dune Part Two — Paul et Chani sur Arrakis', caption: '02 / Paul et Chani sur Arrakis' },
      { src: 'screenshots/cinema-dune-messiah/03.jpg', alt: 'Dune Part Two — Timothée Chalamet en Paul Atréides', caption: '03 / La prophétie avant Messiah' },
    ],
    credit: 'Photogrammes : Dune: Part Two (Warner Bros. / Legendary).',
  },
  'cinema/last-of-us-saison-3': {
    label: 'THE LAST OF US', meta: 'HBO · SAISONS PRÉCÉDENTES',
    items: [
      { src: 'screenshots/cinema-last-of-us/01.jpg', alt: 'The Last of Us — Ellie dans la série HBO', caption: '01 / Ellie (Bella Ramsey), photogramme officiel' },
      { src: 'screenshots/cinema-last-of-us/02.jpg', alt: 'The Last of Us — Joel et Ellie à cheval', caption: '02 / Joel et Ellie, le duo des saisons 1-2' },
      { src: 'screenshots/cinema-last-of-us/03.jpg', alt: 'The Last of Us — Ellie dans la série HBO', caption: '03 / Avant de passer de l’autre côté du miroir' },
    ],
    credit: 'Photogrammes : The Last of Us (HBO).',
  },
  'cinema/marvel-doctor-doom': {
    label: 'AVENGERS: DOOMSDAY', meta: 'MARVEL STUDIOS · MCU',
    items: [
      { src: 'screenshots/cinema-doctor-doom/01.jpg', alt: 'Avengers Doomsday — art promotionnel officiel de Doctor Doom', caption: '01 / Doom, art promotionnel officiel' },
      { src: 'screenshots/cinema-doctor-doom/02.jpg', alt: 'Avengers Doomsday — Doctor Doom et les figures du multivers', caption: '02 / Un masque pour toute la saga' },
      { src: 'screenshots/cinema-doctor-doom/03.jpg', alt: 'Robert Downey Jr. arrive en Doctor Doom à la Comic-Con', caption: '03 / RDJ entre dans le Monde à l’Envers du MCU' },
    ],
    credit: 'Visuels : Marvel Studios / Comic-Con International.',
  },
  'cinema/stranger-things-saison-5': {
    label: 'STRANGER THINGS', meta: 'NETFLIX · SAISON FINALE',
    items: [
      { src: 'screenshots/cinema-stranger-things/01.jpg', alt: 'Stranger Things saison 5 — Eleven dans le Monde à l’Envers', caption: '01 / Eleven dans le Monde à l’Envers — saison 5' },
      { src: 'screenshots/cinema-stranger-things/02.jpg', alt: 'Stranger Things saison 5 — le groupe réuni à Hawkins', caption: '02 / Le noyau dur, réuni une dernière fois' },
      { src: 'screenshots/cinema-stranger-things/03.jpg', alt: 'Stranger Things saison 5 — Hawkins sous la menace', caption: '03 / Le dernier portail' },
    ],
    credit: 'Photogrammes : Stranger Things (Netflix).',
  },
  'cinema/joker-folie-a-deux': {
    label: 'FOLIE À DEUX', meta: 'WARNER BROS · MUSICAL',
    items: [
      { src: 'screenshots/cinema-joker/01.jpg', alt: 'Joker Folie à Deux — Joker et Lee Quinzel, photogramme officiel', caption: '01 / Joker et Lee Quinzel' },
      { src: 'screenshots/cinema-joker/02.jpg', alt: 'Joker Folie à Deux — Joaquin Phoenix et Lady Gaga', caption: '02 / La comédie musicale de procès' },
      { src: 'screenshots/cinema-joker/03.jpg', alt: 'Joker Folie à Deux — la descente des escaliers iconiques', caption: '03 / Le pèlerinage des escaliers' },
    ],
    credit: 'Photogrammes : Joker: Folie à Deux (Warner Bros.).',
  },
  'cinema/house-of-dragon-saison-3': {
    label: 'HOUSE OF THE DRAGON', meta: 'HBO · LA DANSE DES DRAGONS',
    items: [
      { src: 'screenshots/cinema-house-of-dragon/01.jpg', alt: 'House of the Dragon — Aemond Targaryen sur Vhagar', caption: '01 / Aemond et Vhagar' },
      { src: 'screenshots/cinema-house-of-dragon/02.jpg', alt: 'House of the Dragon — Rhaenyra découvre les restes de Lucerys', caption: '02 / La guerre déjà écrite' },
      { src: 'screenshots/cinema-house-of-dragon/03.jpg', alt: 'House of the Dragon — Rhaenyra et Syrax', caption: '03 / Rhaenyra et Syrax' },
    ],
    credit: 'Photogrammes : House of the Dragon (HBO).',
  },
  'cinema/blade-reboot': {
    label: 'BLADE (1998)', meta: 'NEW LINE CINEMA · LA FILIATION',
    items: [
      { src: 'screenshots/cinema-blade/01.jpg', alt: 'Blade 1998 — Wesley Snipes en Daywalker', caption: '01 / Wesley Snipes, le Daywalker original' },
      { src: 'screenshots/cinema-blade/02.jpg', alt: 'Blade 1998 — la scène d’ouverture du club de sang', caption: '02 / La scène d’ouverture du club de sang' },
      { src: 'screenshots/cinema-blade/03.jpg', alt: 'Blade 1998 — Blade affronte les vampires', caption: '03 / Le film qui a financé Marvel' },
    ],
    credit: 'Photogrammes : Blade (New Line Cinema, 1998).',
  },
  'cinema/arcane-saison-2': {
    label: 'ARCANE', meta: 'NETFLIX · RIOT GAMES · FORTICHE',
    items: [
      { src: 'screenshots/cinema-arcane/01.jpg', alt: 'Arcane saison 2 — Jinx face à Vi', caption: '01 / Jinx contre Vi' },
      { src: 'screenshots/cinema-arcane/02.jpg', alt: 'Arcane saison 2 — portrait rapproché des deux sœurs', caption: '02 / Les sœurs au cœur de la série' },
      { src: 'screenshots/cinema-arcane/03.jpg', alt: 'Arcane saison 2 — Jinx dans Zaun', caption: '03 / Zaun n’a pas fini de briller' },
    ],
    credit: 'Photogrammes : Arcane (Netflix / Riot Games, animation Fortiche).',
  },

  // ---- Pages articles dédiées --------------------------------------------
  'zelda-ocarina': {
    label: 'OCARINA OF TIME', meta: 'NINTENDO · SWITCH 2',
    items: [
      { src: 'screenshots/zelda-ocarina/01.jpg', alt: 'Ocarina of Time 3D — la plaine d’Hyrule', caption: '01 / La plaine d’Hyrule' },
      { src: 'screenshots/zelda-ocarina/02.jpg', alt: 'Ocarina of Time 3D — Link devant le château d’Hyrule', caption: '02 / Le château, la Triforce, la légende' },
      { src: 'screenshots/zelda-ocarina/03.jpg', alt: 'Ocarina of Time 3D — Link en exploration', caption: '03 / Retourner à Hyrule, regard neuf' },
    ],
    credit: 'Captures : The Legend of Zelda: Ocarina of Time 3D (Nintendo), à titre d’illustration — le remake Switch 2 arrive le 5 novembre.',
  },
  'zelda-40th': {
    label: '40 ANS DE ZELDA', meta: 'NINTENDO · LES ORIGINES',
    items: [
      { src: 'screenshots/zelda-40th/01.jpg', alt: 'Ocarina of Time — le village Kokiri, version Nintendo 64', caption: '01 / Le village Kokiri, l’original N64 (1998)' },
      { src: 'screenshots/zelda-40th/02.jpg', alt: 'Ocarina of Time — la plaine d’Hyrule sur Nintendo 64', caption: '02 / La plaine d’Hyrule, il y a 28 ans' },
    ],
    credit: 'Captures : The Legend of Zelda: Ocarina of Time (Nintendo 64, Nintendo).',
  },
  'wardogs': {
    label: 'WARDOGS', meta: 'BULKHEAD · ACCÈS ANTICIPÉ PC',
    items: [
      { src: 'screenshots/wardogs/01.jpg', alt: 'WarDogs — champ de bataille du FPS de BULKHEAD', caption: '01 / Trois équipes, 256 km²' },
      { src: 'screenshots/wardogs/02.jpg', alt: 'WarDogs — construction et destruction de bases', caption: '02 / Construire, détruire, recommencer' },
      { src: 'screenshots/wardogs/03.jpg', alt: 'WarDogs — affrontement à grande échelle', caption: '03 / Le FPS à l’ancienne' },
    ],
    credit: 'Captures : WarDogs (BULKHEAD).',
  },
  'onimusha-million': {
    label: 'WAY OF THE SWORD', meta: 'CAPCOM · 1 M LE PREMIER JOUR',
    items: [
      { src: 'screenshots/onimusha-million/01.jpg', alt: 'Onimusha Way of the Sword — combat samouraï', caption: '01 / Le retour samouraï de Capcom' },
      { src: 'screenshots/onimusha-million/02.jpg', alt: 'Onimusha Way of the Sword — capture du trailer The Genma Experiments', caption: '02 / The Genma Experiments' },
      { src: 'screenshots/onimusha-million/03.jpg', alt: 'Onimusha Way of the Sword — affrontement contre les Genma', caption: '03 / Un million de lames vendues' },
    ],
    credit: 'Captures : Onimusha: Way of the Sword (Capcom).',
  },
  'onimusha': {
    label: 'WAY OF THE SWORD', meta: 'CAPCOM · LE TEST',
    items: [
      { src: 'screenshots/onimusha/01.jpg', alt: 'Onimusha Way of the Sword — combat précis au sabre', caption: '01 / Des combats précis au sabre' },
      { src: 'screenshots/onimusha/02.jpg', alt: 'Onimusha Way of the Sword — affrontement monumental', caption: '02 / Plus de 30 heures d’action' },
      { src: 'screenshots/onimusha/03.jpg', alt: 'Onimusha Way of the Sword — mise en scène cinématographique', caption: '03 / Une mise en scène au cordeau' },
    ],
    credit: 'Captures : Onimusha: Way of the Sword (Capcom).',
  },
  'monster-hunter-wilds': {
    label: 'MONSTER HUNTER WILDS', meta: 'CAPCOM · SWITCH 2',
    items: [
      { src: 'screenshots/monster-hunter-wilds/01.jpg', alt: 'Monster Hunter Wilds — les Terres interdites', caption: '01 / Les Terres interdites' },
      { src: 'screenshots/monster-hunter-wilds/02.jpg', alt: 'Monster Hunter Wilds — Arkveld, le monstre emblème', caption: '02 / Arkveld, le monstre emblème' },
      { src: 'screenshots/monster-hunter-wilds/03.jpg', alt: 'Monster Hunter Wilds — chasse en pleine tempête', caption: '03 / La chasse devient nomade' },
    ],
    credit: 'Captures : Monster Hunter Wilds (Capcom).',
  },
  'gta6-dualsense': {
    label: 'GRAND THEFT AUTO VI', meta: 'ROCKSTAR GAMES · VICE CITY',
    items: [
      { src: 'screenshots/gta6-dualsense/01.jpg', alt: 'GTA 6 — Lucia et Jason dans Vice City, capture du trailer', caption: '01 / Lucia et Jason, le duo de Vice City' },
      { src: 'screenshots/gta6-dualsense/02.jpg', alt: 'GTA 6 — ambiance néon de Vice City', caption: '02 / Les néons des trailers' },
      { src: 'screenshots/gta6-dualsense/03.jpg', alt: 'GTA 6 — Lucia et Jason à Vice City', caption: '03 / La ville qui inspire la manette' },
    ],
    credit: 'Captures : trailers officiels Grand Theft Auto VI (Rockstar Games).',
  },
  'metroid-ravenous': {
    label: 'LA SAGA METROID EN 2D', meta: 'NINTENDO · SWITCH',
    items: [
      { src: 'screenshots/metroid-ravenous/01.jpg', alt: 'Metroid Dread — Samus en exploration 2D', caption: '01 / Samus en 2D, l’ADN de la série' },
      { src: 'screenshots/metroid-ravenous/02.jpg', alt: 'Metroid Dread — exploration et créatures dangereuses', caption: '02 / Explorer, survivre, revenir' },
    ],
    credit: 'Captures : Metroid Dread (Nintendo), à titre d’illustration de la série — Ravenous n’a montré que des extraits.',
  },

  // ---- Actus du 28.09.2026 (gaming) ----------------------------------------
  'minecraft-the-sift-nouvelle-dimension': {
    label: 'THE SIFT', meta: 'MOJANG · MINECRAFT LIVE',
    items: [
      { src: 'screenshots/minecraft-the-sift/01.jpg', alt: 'Minecraft — une créature bleue aux longues oreilles de la dimension The Sift, extrait du Minecraft Live de septembre 2026', caption: '01 / Les habitants de The Sift, dévoilés au Minecraft Live' },
      { src: 'screenshots/minecraft-the-sift/02.jpg', alt: 'Minecraft Dungeons II — quatre héros en coopération sur des blocs orange, dans une zone aux teintes roses et turquoise', caption: '02 / Dungeons II, première porte d’entrée vers la dimension' },
      { src: 'screenshots/minecraft-the-sift/03.jpg', alt: 'Minecraft — grottes de glace du prochain game drop, extrait du Minecraft Live de septembre 2026', caption: '03 / Les grottes de glace du prochain game drop' },
    ],
    credit: 'Extraits du Minecraft Live du 26 septembre 2026 et capture officielle de Minecraft Dungeons II — Mojang Studios / Xbox Game Studios.',
    creditSources: [
      { label: 'récapitulatif du Minecraft Live par BisectHosting', href: 'https://www.bisecthosting.com/blog/minecraft-live-announcements-september-2026-the-sift-ice-caves-more' },
      { label: 'article officiel Minecraft.net sur les systèmes de jeu de Dungeons II', href: 'https://www.minecraft.net/en-us/article/minecraft-dungeons-ii-gameplay-systems' },
    ],
  },
  'the-witcher-3-remastered-sortie-29-septembre': {
    label: 'THE WITCHER 3 REMASTERED', meta: 'CD PROJEKT RED · 29.09.2026',
    items: [
      { src: 'screenshots/witcher-3-remastered/01.jpg', alt: 'The Witcher 3: Wild Hunt Remastered — visuel officiel, Geralt de Riv l’épée à la main', caption: '01 / Geralt, visuel officiel de la version remasterisée' },
      { src: 'screenshots/witcher-3-remastered/02.jpg', alt: 'The Witcher 3: Wild Hunt Remastered — Geralt lance le signe Igni face à un Sylvain dans la forêt', caption: '02 / Igni face au Sylvain, capture officielle' },
      { src: 'screenshots/witcher-3-remastered/03.jpg', alt: 'The Witcher 3: Wild Hunt Remastered — Geralt affronte des noyeurs dans les marais de Velen', caption: '03 / Les marais de Velen en path tracing' },
    ],
    credit: 'Visuel et captures officiels de The Witcher 3: Wild Hunt Remastered — © CD Projekt Red.',
    creditSources: [
      { label: 'article IGN India (visuel officiel)', href: 'https://in.ign.com/the-witcher-3-wild-hunt-remastered/270260/the-witcher-3-remastered-cd-projekt-red-shares-new-gameplay-footage-of-its-action-rpg-title' },
      { label: 'article GamesRadar+ (capture Igni)', href: 'https://www.gamesradar.com/games/the-witcher/cd-projekt-red-snuck-30-improvements-into-the-witcher-3-remastered-reveal-including-immersive-meditation-new-quest-tracking-a-loot-rework-and-switch-2-exclusives/' },
      { label: 'article FinalBoss (capture des marais)', href: 'https://finalboss.io/the-witcher-3-remastered-path-tracing-combat-and-skill-tree-changes' },
    ],
  },
  'xbox-nadella-restructuration': {
    label: 'XBOX, ANNÉE ZÉRO', meta: 'MICROSOFT · RESTRUCTURATION',
    items: [
      { src: 'screenshots/xbox-nadella/01.jpg', alt: 'Satya Nadella, PDG de Microsoft — portrait officiel', caption: '01 / Satya Nadella, portrait officiel Microsoft' },
      { src: 'screenshots/xbox-nadella/02.jpg', alt: 'Asha Sharma, patronne de Xbox, aux côtés de Hideo Kojima chez Kojima Productions', caption: '02 / Asha Sharma, ici avec Hideo Kojima le 14 septembre' },
      { src: 'screenshots/xbox-nadella/03.jpg', alt: 'Halo Infinite — le Master Chief, capture du jeu', caption: '03 / Halo, la licence passée sous pavillon Activision' },
    ],
    credit: 'Portrait : Brian Smale & Microsoft (CC BY-SA 4.0) ; photo publiée sur les comptes X officiels de Hideo Kojima et Asha Sharma ; capture de Halo Infinite (343 Industries / Xbox Game Studios), à titre d’illustration.',
    creditSources: [
      { label: 'photothèque officielle Microsoft News Center', href: 'https://news.microsoft.com/microsoft-news-center-photos' },
      { label: 'article Instant Gaming News sur la visite chez Kojima Productions', href: 'https://news.instant-gaming.com/en/articles/21882-asha-sharma-poses-with-hideo-kojima-to-prepare-for-the-future' },
    ],
  },

  // ---- Actus du 28.09.2026 (cinéma) ----------------------------------------
  'cinema/box-office-us-endgame-encore-26-millions': {
    label: 'LE PODIUM DU WEEK-END', meta: 'BOX-OFFICE US · 25-27.09',
    items: [
      { src: 'screenshots/cinema-box-office-endgame-encore/01.jpg', alt: 'Avengers: Endgame Encore — détail de l’affiche officielle de la ressortie, les héros sculptés en argent', caption: '01 / Endgame Encore, détail de l’affiche officielle' },
      { src: 'screenshots/cinema-box-office-endgame-encore/02.jpg', alt: 'Resident Evil — Zach Cregger dirige Austin Abrams sur le tournage, photo officielle', caption: '02 / Resident Evil : Cregger et Abrams sur le plateau' },
      { src: 'screenshots/cinema-box-office-endgame-encore/03.jpg', alt: 'Primetime — Robert Pattinson en Chris Hansen face à un miroir, photogramme officiel', caption: '03 / Primetime : Pattinson en Chris Hansen' },
    ],
    credit: 'Affiche : Marvel Studios / Disney ; photo de tournage : Sony Pictures / Constantin Film ; photogramme : A24.',
    creditSources: [
      { label: 'article Times Now (affiche Encore)', href: 'https://www.timesnownews.com/entertainment-news/hollywood/avengers-endgame-encore-marvel-alters-footage-for-2026-re-release-what-has-changed-article-155988728' },
      { label: 'article The Hollywood Reporter (photo de tournage)', href: 'https://www.hollywoodreporter.com/movies/movie-features/resident-evil-filmmaker-zach-cregger-test-screenings-1236697134/' },
      { label: 'article CNN (photogramme Primetime)', href: 'https://www.cnn.com/2026/09/23/entertainment/primetime-movie-chris-hansen-robert-pattinson' },
    ],
  },
  'cinema/the-last-of-us-saison-3-john-goodman-laura-bailey': {
    label: 'THE LAST OF US', meta: 'HBO · SAISON 3',
    items: [
      { src: 'screenshots/cinema-last-of-us-casting/01.jpg', alt: 'The Last of Us saison 2 — Abby (Kaitlyn Dever), photogramme officiel HBO', caption: '01 / Abby (Kaitlyn Dever), au centre de la saison 3' },
      { src: 'screenshots/cinema-last-of-us-casting/02.jpg', alt: 'The Last of Us Part II — Abby, le personnage incarné par Laura Bailey dans le jeu', caption: '02 / L’Abby du jeu, jouée par Laura Bailey' },
      { src: 'screenshots/cinema-last-of-us-casting/03.jpg', alt: 'The Last of Us — Ellie (Bella Ramsey), photogramme officiel HBO', caption: '03 / Ellie (Bella Ramsey), de retour' },
    ],
    credit: 'Photogrammes : The Last of Us (HBO) ; capture : The Last of Us Part II (Naughty Dog / PlayStation), à titre d’illustration du rôle tenu par Laura Bailey.',
    creditSources: [
      { label: 'article Soap Central (photogramme HBO)', href: 'https://www.soapcentral.com/shows/what-kaitlyn-dever-s-casting-mean-future-the-last-us-here-s-know' },
      { label: 'analyse Observer (capture Naughty Dog)', href: 'https://observer.com/2020/07/the-last-of-us-part-2-redemption-naughty-dog-analysis/' },
    ],
  },
  'cinema/godzilla-minus-zero-premiere-nyff': {
    label: 'GODZILLA MINUS ZERO', meta: 'TOHO · TAKASHI YAMAZAKI',
    items: [
      { src: 'screenshots/cinema-godzilla-minus-zero/01.jpg', alt: 'Godzilla Minus Zero — détail de l’affiche teaser, l’Empire State Building émergeant de la brume', caption: '01 / L’affiche teaser : New York dans la brume' },
      { src: 'screenshots/cinema-godzilla-minus-zero/02.jpg', alt: 'Godzilla Minus Zero — Godzilla rugit au-dessus d’une ville en ruine, image de la bande-annonce', caption: '02 / Godzilla, image de la bande-annonce' },
      { src: 'screenshots/cinema-godzilla-minus-zero/03.jpg', alt: 'Godzilla Minus Zero — visuel clé officiel, Godzilla sous la foudre', caption: '03 / Le visuel clé du site officiel' },
    ],
    credit: 'Affiche, image de bande-annonce et visuel clé : © 2026 TOHO CO., LTD.',
    creditSources: [
      { label: 'article SlashFilm sur la bande-annonce', href: 'https://www.slashfilm.com/2252602/godzilla-minus-zero-trailer/' },
      { label: 'page officielle Godzilla.com', href: 'https://godzilla.com/pages/godzilla-minus-zero' },
    ],
  },

  // ---- Actus tech de la semaine du 21 au 28.09.2026 ------------------------
  // Contrairement aux actus gaming et cinéma, les visuels tech ne sont pas
  // déposés dans public/screenshots/ : ce sont ceux publiés par les éditeurs
  // eux-mêmes (page de lancement SpaceX, blog Microsoft, newsroom Meta,
  // figures de brevets USPTO) et les photos de presse des articles sources,
  // hotlinkés en direct. Chaque crédit renvoie à sa publication d'origine ; les
  // cartes SVG de public/*.svg restent le repli si une URL ne répond plus.
  'tech/starship-flight-14-premier-vol-orbital': {
    label: 'LE VOL 14', meta: 'SPACEX · STARBASE',
    items: [
      { src: 'https://sxcontent9668.azureedge.us/cms-assets/assets/Flight_14_Website_Desktop_4_734a6bbf25.jpg', alt: 'Starship — visuel officiel du quatorzième vol d’essai sur la page de lancement de SpaceX', caption: '01 / Le vol 14, page de lancement SpaceX' },
      { src: 'https://sxcontent9668.azureedge.us/cms-assets/assets/Test_Flight_14_Trajectory_090226_web_2_56b3b513b2.png', alt: 'Trajectoire officielle du vol 14, du décollage de Starbase à l’amerrissage dans le Pacifique', caption: '02 / La trajectoire officielle, jusqu’à l’amerrissage' },
      { src: 'https://starlink.com/assets-new/images/marketing/starlink-version-3-satellites/Starlink_V3_Banner_03.webp', alt: 'Satellite Starlink V3 — visuel officiel de la constellation Starlink', caption: '03 / Starlink V3, les 26 satellites à déployer' },
    ],
    credit: 'Visuels : SpaceX (page de lancement du vol 14) et Starlink (fiche des satellites V3).',
    creditSources: [
      { label: 'page de lancement officielle du vol 14', href: 'https://www.spacex.com/launches/starship-flight-14' },
      { label: 'fiche officielle des satellites Starlink V3', href: 'https://starlink.com/updates/starlink-version-3-satellites' },
    ],
  },
  'tech/copilot-home-code-autopilot': {
    label: 'HOME, CODE, AUTOPILOT', meta: 'MICROSOFT · 25.09.2026',
    items: [
      { src: 'https://blogs.microsoft.com/wp-content/uploads/2026/09/OMB-Home-FINAL-2.png', alt: 'Capture d’écran de Home, la nouvelle page d’accueil de Microsoft Copilot où se retrouvent Chat et Cowork', caption: '01 / Home, où Chat et Cowork se retrouvent' },
      { src: 'https://blogs.microsoft.com/wp-content/uploads/2026/09/OMB-Code-FINAL-2.png', alt: 'Capture d’écran de Code, la brique de Copilot qui construit une application décrite en langage courant', caption: '02 / Code, les applications en langage courant' },
      { src: 'https://blogs.microsoft.com/wp-content/uploads/2026/09/OMB-Autopilot-FINAL-2.png', alt: 'Capture d’écran d’Autopilot, l’agent hébergé dans le cloud qui continue de travailler sans surveillance', caption: '03 / Autopilot, l’agent qui travaille la nuit' },
    ],
    credit: 'Captures d’écran : Microsoft, tirées de l’annonce « Introducing the new Copilot with Home, Code and Autopilot » du 25 septembre 2026.',
    creditSources: [
      { label: 'annonce officielle de Microsoft', href: 'https://blogs.microsoft.com/blog/2026/09/25/introducing-the-new-copilot-with-home-code-and-autopilot/' },
    ],
  },
  'tech/apple-taptic-engine-verdict-5-7-milliards': {
    label: 'LE TACTIC ENGINE EN JUSTICE', meta: 'APPLE · TACTION TECHNOLOGY',
    items: [
      { src: 'https://platform.theverge.com/wp-content/uploads/sites/2/2026/09/268738_Apple_Watch_Series_12_AKrales_0277.jpg?quality=90&strip=all&crop=0%2C0%2C100%2C100&w=1600', alt: 'Apple Watch Series 12 — photo de presse d’Amelia Holowaty Krales pour The Verge', caption: '01 / L’Apple Watch, où bat le Taptic Engine' },
      { src: 'https://patentimages.storage.googleapis.com/9b/b7/15/85b39cf905d838/US10659885-20200519-D00000.png', alt: 'Figure 1 du brevet américain US 10 659 885 de Taction Technology : un transducteur tactile à mouvement plan amorti', caption: '02 / Brevet US 10 659 885, le transducteur' },
      { src: 'https://patentimages.storage.googleapis.com/a0/91/85/287d1c39ae3b37/US10820117-20201027-D00000.png', alt: 'Figure 1 du brevet américain US 10 820 117 de Taction Technology : le module de vibration plan dans un casque', caption: '03 / Brevet US 10 820 117, le module' },
    ],
    credit: 'Photo : Amelia Holowaty Krales / The Verge. Figures : Office des brevets et des marques des États-Unis, domaine public.',
    creditSources: [
      { label: 'article The Verge sur le verdict', href: 'https://www.theverge.com/tech/1001118/apple-hit-with-5-7-billion-in-damages-over-haptic-patents' },
      { label: 'brevet US 10 659 885 (Google Patents)', href: 'https://patents.google.com/patent/US10659885B2/en' },
      { label: 'brevet US 10 820 117 (Google Patents)', href: 'https://patents.google.com/patent/US10820117B2/en' },
    ],
  },
  'tech/agent-openai-portail-australien': {
    label: 'L’AGENT HORS CADRE', meta: 'OPENAI · SERVICES AUSTRALIA',
    items: [
      { src: 'https://image.cnbcfm.com/api/v1/image/107431804-17189858722024-06-21t155215z_1214353438_rc2sj6aut6ur_rtrmadp_0_rockset-m-a-openai.jpeg?v=1757715670&w=1600&h=900&vtcrop=y', alt: 'Logo OpenAI sur un mur — photo d’illustration Reuters / Dado Ruvic', caption: '01 / OpenAI, l’éditeur du modèle concerné' },
      { src: 'https://images.ctfassets.net/kftzwdyauwt9/1XS9bnL9RrtlceJl54sXEl/d902366830a41aef6319b8db24401cb3/OAI_02_InternetAccess_Lightmode_CardAccent.svg?w=3840&q=90', alt: 'Chronologie publiée par OpenAI : un agent obtient un accès à Internet en détournant le gestionnaire de paquets Artifactory, via une faille SSRF', caption: '02 / L’accès à Internet obtenu par contournement' },
      { src: 'https://images.ctfassets.net/kftzwdyauwt9/1tNhWnDkDNOLWal5uUlpVi/b89dd7c6c9d8af8283fdb08727abcfc8/figure-03.gif?w=3840&q=90&fm=webp', alt: 'Illustration OpenAI : un agent de jeu collecte indéfiniment des récompenses au lieu d’aller au bout du parcours', caption: '03 / Le contournement, un mode d’action connu' },
    ],
    credit: 'Photo : Dado Ruvic / Reuters. Schéma et illustration : OpenAI, tirés du rapport « The Hugging Face incident and the road ahead » du 26.08.2026 — la revue des « activités de modèle désalignées » qui a débusqué les faits de juin.',
    creditSources: [
      { label: 'article CNBC sur l’incident australien', href: 'https://www.cnbc.com/2026/09/24/openai-agent-hacked-australian-government-website-.html' },
      { label: 'rapport OpenAI sur l’activité de modèle désalignée', href: 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/' },
      { label: 'conférence de presse d’Anthony Albanese (pm.gov.au)', href: 'https://www.pm.gov.au/media/press-conference-new-york' },
    ],
  },
  'tech/meta-connect-2026-lunettes-muse-charm': {
    label: 'META CONNECT 2026', meta: 'META · MENLO PARK',
    items: [
      { src: 'https://about.fb.com/wp-content/uploads/2026/09/01_VRGlasses_Inline_CloseUp.jpg?resize=960%2C836', alt: 'Gros plan sur les Meta VR Glasses, la paire de lunettes de réalité virtuelle à 100 grammes annoncée par Meta', caption: '01 / Les Meta VR Glasses, 100 g et 1 299 $' },
      { src: 'https://about.fb.com/wp-content/uploads/2026/09/03_VRGlasses_Inline_Airplane_d9b0fd.jpg?resize=960%2C836', alt: 'Un passager regarde un film en 3D avec les Meta VR Glasses depuis son siège d’avion', caption: '02 / Le cinéma privé, jusque dans l’avion' },
      { src: 'https://about.fb.com/wp-content/uploads/2026/09/02_Ray-Ban-Meta-Audio_Carousel_01.jpg?fit=1920%2C1672', alt: 'Ray-Ban Meta Audio Clubmaster, les premières lunettes audio de Meta, annoncées sans caméra', caption: '03 / Ray-Ban Meta Audio, les lunettes sans caméra' },
    ],
    credit: 'Visuels : Meta, tirés des communiqués officiels du Meta Connect 2026 (23 septembre 2026).',
    creditSources: [
      { label: 'annonce officielle des Meta VR Glasses', href: 'https://about.fb.com/news/2026/09/introducing-meta-vr-glasses-3d-movies-immersive-live-sports-100-grams/' },
      { label: 'annonce officielle des Ray-Ban Meta Audio', href: 'https://about.fb.com/news/2026/09/introducing-ray-ban-meta-audio-glasses-new-styles-plus-muse/' },
    ],
  },

  // ---- Actus Blizzard -----------------------------------------------------
  'starcraft-fps': {
    label: 'L’UNIVERS STARCRAFT', meta: 'BLIZZARD · GUERRE INTERSTELLAIRE',
    items: [
      { src: 'screenshots/starcraft-fps/01.jpg', alt: 'StarCraft — marine en armure, photogramme du trailer cinématique d’annonce', caption: '01 / Le nouveau shooter se dévoile en cinématique' },
      { src: 'screenshots/starcraft-fps/02.jpg', alt: 'StarCraft II — bataille Terran contre Zerg vue du dessus', caption: '02 / L’héritage stratégique de la saga' },
    ],
    credit: 'Photogramme du trailer cinématique : Blizzard Entertainment ; capture de StarCraft II, à titre d’illustration de l’héritage de la licence.',
    creditSources: [
      { label: 'présentation du trailer chez Video Games Chronicle', href: 'https://www.videogameschronicle.com/news/blizzard-reveals-open-world-starcraft-shooter-from-ex-far-cry-boss/' },
    ],
  },
  'diablo-v': {
    label: 'L’UNIVERS DIABLO', meta: 'BLIZZARD · SANCTUAIRE',
    items: [
      { src: 'screenshots/diablo-v/01.jpg', alt: 'Diablo IV — affrontement dans le Sanctuaire', caption: '01 / Le Sanctuaire, terrain de la saga' },
      { src: 'screenshots/diablo-v/02.jpg', alt: 'Diablo IV — Lilith, la Mère du Sanctuaire', caption: '02 / Lilith, la Mère du Sanctuaire' },
    ],
    credit: 'Visuels : Diablo IV (Blizzard Entertainment), à titre d’illustration — Diablo V n’a rien montré au-delà du teaser.',
  },
  'diablo-switch-2': {
    label: 'DIABLO IV', meta: 'BLIZZARD · AGE OF HATRED',
    items: [
      { src: 'screenshots/diablo-switch-2/01.jpg', alt: 'Diablo IV — gameplay dans le Sanctuaire', caption: '01 / Age of Hatred, la collection complète' },
      { src: 'screenshots/diablo-switch-2/02.jpg', alt: 'Diablo IV — combat contre les démons', caption: '02 / Chasser les démons en nomade' },
    ],
    credit: 'Captures : Diablo IV (Blizzard Entertainment).',
  },

  // ---- Dossiers -----------------------------------------------------------
  // Trois photogrammes de l’épisode YouTube, extraits automatiquement par
  // YouTube (autour de 25 %, 50 % et 75 % de la vidéo) : ce sont de vraies
// images de l’épisode. Les légendes reprennent le thème du passage où chaque
// photogramme est capturé, sans promettre une seconde précise.
  'dossier-souls': {
    label: 'LES SOULS', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('OH51fSHznwg', 1), alt: 'Photogramme de l’épisode sur les Souls — segment sur la dopamine de la victoire', caption: '01 / La dopamine de la victoire' },
      { src: youTubeFrameUrl('OH51fSHznwg', 2), alt: 'Photogramme de l’épisode sur les Souls — segment sur la narration cryptique', caption: '02 / Un récit qui se reconstitue par fragments' },
      { src: youTubeFrameUrl('OH51fSHznwg', 3), alt: 'Photogramme de l’épisode sur les Souls — segment sur la communauté', caption: '03 / Une communauté qui transmet' },
    ],
    credit: 'Photogrammes extraits automatiquement de l’épisode par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'l’épisode sur YouTube', href: 'https://www.youtube.com/watch?v=OH51fSHznwg' },
    ],
  },
  'dossier-awards': {
    label: 'LP AWARDS 2025', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('0ThNyFItASM', 1), alt: 'Photogramme de l’épisode des Let’s Play Awards 2025 — segment sur la direction artistique', caption: '01 / La direction artistique à l’honneur' },
      { src: youTubeFrameUrl('0ThNyFItASM', 2), alt: 'Photogramme de l’épisode des Let’s Play Awards 2025 — segment sur l’action-aventure', caption: '02 / L’action-aventure sous les projecteurs' },
      { src: youTubeFrameUrl('0ThNyFItASM', 3), alt: 'Photogramme de l’épisode des Let’s Play Awards 2025 — segment sur la surprise de l’année, avant le jeu de l’année', caption: '03 / Avant l’annonce du jeu de l’année' },
    ],
    credit: 'Photogrammes extraits automatiquement de l’épisode par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'l’épisode sur YouTube', href: 'https://www.youtube.com/watch?v=0ThNyFItASM' },
    ],
  },
  'dossier-comiccon': {
    label: 'COMIC CON DZAIR', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('HzigJZOxz2o', 1), alt: 'Photogramme du reportage Games & Comic Con Dzair 2026 — ambiance des allées du salon', caption: '01 / L’ambiance des allées' },
      { src: youTubeFrameUrl('HzigJZOxz2o', 2), alt: 'Photogramme du reportage Games & Comic Con Dzair 2026 — invités et cosplay', caption: '02 / Invités, cosplay et culture populaire' },
      { src: youTubeFrameUrl('HzigJZOxz2o', 3), alt: 'Photogramme du reportage Games & Comic Con Dzair 2026 — la communauté réunie', caption: '03 / La communauté réunie' },
    ],
    credit: 'Photogrammes extraits automatiquement du reportage par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'le reportage sur YouTube', href: 'https://www.youtube.com/watch?v=HzigJZOxz2o' },
    ],
  },
  'dossier-generations': {
    label: 'GÉNÉRATIONS', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('t1Re8ki_gsw', 1), alt: 'Photogramme de l’épisode Old School vs New School — entretien avec El Joueur', caption: '01 / Le parcours d’El Joueur' },
      { src: youTubeFrameUrl('t1Re8ki_gsw', 2), alt: 'Photogramme de l’épisode Old School vs New School — segment sur les jeux qui ont marqué', caption: '02 / Les jeux qui nous ont marqués' },
      { src: youTubeFrameUrl('t1Re8ki_gsw', 3), alt: 'Photogramme de l’épisode Old School vs New School — débat graphismes ou gameplay', caption: '03 / Graphismes ou gameplay ?' },
    ],
    credit: 'Photogrammes extraits automatiquement de l’épisode par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'l’épisode sur YouTube', href: 'https://www.youtube.com/watch?v=t1Re8ki_gsw' },
    ],
  },
  'dossier-goya': {
    label: 'HICOSOFT STUDIO', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('aTs0zhm6Leg', 1), alt: 'Photogramme de l’épisode sur HicoSoft Studio — segment sur les outils du pipeline', caption: '01 / Les outils du pipeline' },
      { src: youTubeFrameUrl('aTs0zhm6Leg', 2), alt: 'Photogramme de l’épisode sur HicoSoft Studio — segment sur les défis locaux', caption: '02 / Les défis d’un studio algérien' },
      { src: youTubeFrameUrl('aTs0zhm6Leg', 3), alt: 'Photogramme de l’épisode sur HicoSoft Studio — segment sur le jeu indé de l’année 2025', caption: '03 / Cap sur le jeu indé de l’année' },
    ],
    credit: 'Photogrammes extraits automatiquement de l’épisode par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'l’épisode sur YouTube', href: 'https://www.youtube.com/watch?v=aTs0zhm6Leg' },
    ],
  },
  'dossier-playstation-1': {
    label: 'PLAYSTATION 1', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('oOyW_rjiZ5w', 1), alt: 'Photogramme de l’épisode sur la PlayStation 1 — segment sur Ken Kutaragi et le projet Sony', caption: '01 / Le projet de Ken Kutaragi' },
      { src: youTubeFrameUrl('oOyW_rjiZ5w', 2), alt: 'Photogramme de l’épisode sur la PlayStation 1 — segment sur les jeux qui ont fait aimer la console', caption: '02 / Les jeux qui nous ont fait aimer' },
      { src: youTubeFrameUrl('oOyW_rjiZ5w', 3), alt: 'Photogramme de l’épisode sur la PlayStation 1 — segment sur les souvenirs de console', caption: '03 / Souvenirs de la première PlayStation' },
    ],
    credit: 'Photogrammes extraits automatiquement de l’épisode par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'l’épisode sur YouTube', href: 'https://www.youtube.com/watch?v=oOyW_rjiZ5w' },
    ],
  },
  'dossier-playstation-2': {
    label: 'PLAYSTATION 2', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('A2VPhWOUMHI', 1), alt: 'Photogramme de l’épisode sur les 25 ans de la PS2 — segment sur les fonctionnalités de la console', caption: '01 / Les fonctionnalités de la machine' },
      { src: youTubeFrameUrl('A2VPhWOUMHI', 2), alt: 'Photogramme de l’épisode sur les 25 ans de la PS2 — segment sur les jeux qui ont marqué', caption: '02 / Les jeux qui nous ont marqués' },
      { src: youTubeFrameUrl('A2VPhWOUMHI', 3), alt: 'Photogramme de l’épisode sur les 25 ans de la PS2 — segment sur le modèle des consoles suivantes', caption: '03 / Le modèle des consoles suivantes' },
    ],
    credit: 'Photogrammes extraits automatiquement de l’épisode par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'l’épisode sur YouTube', href: 'https://www.youtube.com/watch?v=A2VPhWOUMHI' },
    ],
  },
  'dossier-xbox-360': {
    label: 'XBOX 360', meta: 'PHOTOGRAMMES · YOUTUBE',
    items: [
      { src: youTubeFrameUrl('8NqnTzVh5O0', 1), alt: 'Photogramme de l’épisode sur les 20 ans de la Xbox 360 — segment sur les jeux légendaires de la machine', caption: '01 / Les jeux légendaires' },
      { src: youTubeFrameUrl('8NqnTzVh5O0', 2), alt: 'Photogramme de l’épisode sur les 20 ans de la Xbox 360 — segment sur Kinect', caption: '02 / Kinect, le jeu sans manette' },
      { src: youTubeFrameUrl('8NqnTzVh5O0', 3), alt: 'Photogramme de l’épisode sur les 20 ans de la Xbox 360 — segment sur l’héritage de la console', caption: '03 / L’héritage de la Xbox 360' },
    ],
    credit: 'Photogrammes extraits automatiquement de l’épisode par YouTube (quart, moitié, trois quarts de la vidéo) — chaîne Let’s Play Official.',
    creditSources: [
      { label: 'l’épisode sur YouTube', href: 'https://www.youtube.com/watch?v=8NqnTzVh5O0' },
    ],
  },
};

// Récupère la galerie d’un article (undefined si l’article n’en a pas).
articleGalleries['physint-un-budget-de-400-millions-de-dollars-pour-le-jeu-de'] = articleGalleries['physint-budget-400-millions-xbox'];

export function getArticleGallery(key) {
  return articleGalleries[key];
}
