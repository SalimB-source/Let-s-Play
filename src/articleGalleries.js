// Sélections de captures d'écran / photogrammes intégrées au corps des
// articles (à la place de l’ancien encadré « En bref »).
//
// Clé = identifiant de l’article (celui des routes CurrentNews/BlizzardNews
// ou du gabarit de page dédiée). Les fichiers vivent dans
// public/screenshots/<dossier>/. Les légendes sont en français, comme le
// reste des pages actus ; le crédit précise toujours la source du visuel —
// quand un jeu n’a encore rien montré, on affiche la saga à titre
// d’illustration et on le dit.

export const articleGalleries = {
  // ---- Actus gaming -------------------------------------------------------
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
    label: 'PART II REMASTERED', meta: 'NAUGHTY DOG · PC',
    items: [
      { src: 'screenshots/last-of-us-ii/01.jpg', alt: 'The Last of Us Part II Remastered — Ellie en exploration à Seattle', caption: '01 / Seattle, le terrain de jeu d’Ellie' },
      { src: 'screenshots/last-of-us-ii/02.jpg', alt: 'The Last of Us Part II Remastered — environnement envahi par la végétation', caption: '02 / Le monde que le mod voulait reconnecter' },
      { src: 'screenshots/last-of-us-ii/03.jpg', alt: 'The Last of Us Part II Remastered — scène d’exploration en intérieur', caption: '03 / Les traces d’un multijoueur attendu' },
    ],
    credit: 'Captures : The Last of Us Part II Remastered (Naughty Dog / PlayStation).',
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
    label: 'SOLO LEVELING: KARMA', meta: 'NETMARBLE · TGS 2026',
    items: [
      { src: 'screenshots/netmarble-tgs/01.jpg', alt: 'Solo Leveling: KARMA — Sung Jinwoo en action dans le roguelite de Netmarble', caption: '01 / L’action roguelite de KARMA' },
      { src: 'screenshots/netmarble-tgs/02.jpg', alt: 'Solo Leveling: KARMA — affrontement dans l’univers Solo Leveling', caption: '02 / Sung Jinwoo, jouable au TGS' },
    ],
    credit: 'Captures : Solo Leveling: KARMA (Netmarble).',
  },

  // ---- Actus cinéma & séries ---------------------------------------------
  'cinema/jojo-steel-ball-run-episode-2': {
    label: 'STEEL BALL RUN', meta: 'NETFLIX · DAVID PRODUCTION',
    items: [
      { src: 'screenshots/cinema-jojo-steel-ball-run/01.jpg', alt: 'Steel Ball Run — Gyro Zeppeli, photogramme officiel de l’anime', caption: '01 / Gyro Zeppeli, photogramme officiel' },
      { src: 'screenshots/cinema-jojo-steel-ball-run/02.jpg', alt: 'Steel Ball Run — la course transcontinentale en images', caption: '02 / La course reprend chaque vendredi' },
      { src: 'screenshots/cinema-jojo-steel-ball-run/03.jpg', alt: 'Steel Ball Run — Johnny Joestar et Gyro Zeppeli', caption: '03 / Johnny et Gyro, le duo de la 1st STAGE' },
    ],
    credit: 'Photogrammes : STEEL BALL RUN JoJo’s Bizarre Adventure — ©LUCKY LAND COMMUNICATIONS/SHUEISHA, JOJO’s Animation SBR Project.',
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

  // ---- Actus Blizzard -----------------------------------------------------
  'starcraft-fps': {
    label: 'L’UNIVERS STARCRAFT', meta: 'BLIZZARD · GUERRE INTERSTELLAIRE',
    items: [
      { src: 'screenshots/starcraft-fps/01.jpg', alt: 'StarCraft II — affrontement Terrans contre Zergs', caption: '01 / Terrans contre Zergs' },
      { src: 'screenshots/starcraft-fps/02.jpg', alt: 'StarCraft II — champ de bataille vu du dessus', caption: '02 / La guerre vue du dessus' },
    ],
    credit: 'Captures : StarCraft II (Blizzard Entertainment), à titre d’illustration de l’univers.',
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
};

// Récupère la galerie d’un article (undefined si l’article n’en a pas).
export function getArticleGallery(key) {
  return articleGalleries[key];
}
