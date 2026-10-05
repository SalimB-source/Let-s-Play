import { CITY_RUSH_SHUTO_C1 } from './cityRushRules.js';

// Habillage visuel de chaque ville de Vice City Rush : ciel, météo, éclairage,
// enseignes, boutiques, sponsors des tribunes et porte de mi-parcours. Les
// règles de jeu restent dans cityRushRules.js ; ici il n'y a que de la
// direction artistique.
export const CITY_RUSH_THEMES = Object.freeze({
  // Vice City : plein jour sur le front de mer. Ciel bleu de Floride, soleil
  // haut, sable chaud au sol, mer turquoise au loin et façades Art déco
  // pastel. `daylight` coupe les réflexes nocturnes (fenêtres allumées, halos
  // de lampadaires, phares) et `beach` remplace le mobilier urbain par du
  // mobilier de plage (parasols, planches de surf, poste de maître-nageur).
  'vice-city': Object.freeze({
    daylight: true,
    beach: true,
    sky: Object.freeze({
      top: 0x1f6fd0, mid: 0x63b6ef, horizon: 0xd9edf7, haze: 0xfff2d4,
      sun: Object.freeze({ color: 0xfffdf2, glow: 0xffe9a6, elevation: 0.78, radius: 0.055, stripes: 0 }),
      stars: 0, moon: 0,
    }),
    weather: 'clear',
    fogNear: 95, fogFar: 330,
    facade: Object.freeze({
      style: 'deco', floor: 1.55, litRatio: 0.06, litColors: ['#fff6dd', '#ffe9f2', '#dff6ff'],
      wall: '#fff8f0', glass: '#7fb6d4', sheen: 'rgba(255, 255, 255, .34)', frame: '#ffffff',
    }),
    shops: Object.freeze([
      { text: 'SURF & SUN', color: '#12b7c9', awning: '#ff7ac3' },
      { text: 'NEON BAY SURF', color: '#ff5db8', awning: '#43ead5' },
      { text: 'VICE RECORDS', color: '#f2a93b', awning: '#2fb6a8' },
      { text: 'HOTEL PALMA', color: '#8d6bff', awning: '#ffd36b' },
    ]),
    shopWall: '#f8ede0', shopTrim: '#e2cfb9', shopDoor: '#4f7385',
    verticalSigns: Object.freeze(['HOTEL', 'BEACH', 'CLUB', 'VICE']),
    sponsors: Object.freeze(['LET’S PLAY', 'RADIO VICE 98.6', 'OCEAN BEACH CLUB', 'PALMA TYRES', 'SUNSET SURF']),
    gate: Object.freeze({ style: 'deco-arch', text: 'WELCOME TO VICE CITY' }),
    gantryText: 'OCEAN DRIVE',
    crowdColors: Object.freeze([0xff5db8, 0x43ead5, 0xffd36b, 0xf6f1e4, 0xff8d5a, 0x7ad0ff]),
    roadTint: 0x7b808c, laneColor: '#ffffff', edgeColor: '#ff8ac9', sidewalkTint: 0xf0dcb2,
    lamp: 'deco', tree: 'palm',
    // Sable au-delà des trottoirs, halos et enseignes presque éteints.
    ground: 0xf2ddb0,
    glow: 0.16,
    lampCone: 0.012,
    accentCone: 0.04,
    skyline: Object.freeze({ base: [163, 197, 216], window: 'rgba(255, 255, 255, .5)' }),
    materials: Object.freeze({
      roof: 0xf7ede3, stone: 0xeadfc9, concrete: 0xd9d3c7, asphaltDark: 0x9aa0a8,
      metal: 0xa9b7c0, darkMetal: 0x74828c, white: 0xffffff, cream: 0xfdf3e2,
      trunk: 0x9a7148, wood: 0xb07a45, foliage: 0x3fae7c, foliageLight: 0x7fd08a,
      glassDark: 0x63a8c4, sand: 0xf6e3ba, canopy: 0xf6ece0,
    }),
    light: Object.freeze({
      key: Object.freeze({ color: 0xfff4d8, intensity: 3.2, position: [-18, 34, 6] }),
      hemi: Object.freeze({ sky: 0xcfeaff, ground: 0xf2dcb0, intensity: 1.6 }),
      rim: Object.freeze({ color: 0x9fe4f2, intensity: 0.6, position: [10, 12, -26] }),
      fill: Object.freeze({ color: 0xff9ad2, intensity: 6, distance: 60, position: [0, 8, -30] }),
      headlamp: 0,
      exposure: 1.02,
    }),
  }),
  // ── Historic U.S. 66 · Chicago → Santa Monica ───────────────────────
  // Route 66 n'est pas une ville néon : c'est une longue route à deux voies,
  // des motels de bord de route, des stations-service, des poteaux téléphoniques
  // et des paysages qui passent des plaines de l'Illinois aux mesas rouges.
  'route-66': Object.freeze({
    daylight: true,
    route66: true,
    sky: Object.freeze({
      top: 0x2d6da9, mid: 0x86c4e8, horizon: 0xf2c27f, haze: 0xf6dfb2,
      sun: Object.freeze({ color: 0xfff8db, glow: 0xffbd68, elevation: 0.42, radius: 0.075, stripes: 1 }),
      stars: 0, moon: 0,
    }),
    weather: 'clear',
    fogNear: 125, fogFar: 390,
    facade: Object.freeze({
      style: 'route66', floor: 1.5, litRatio: 0.015, litColors: ['#fff0bd', '#ffe0a1'],
      wall: '#c7a57a', glass: '#536d72', sheen: 'rgba(255, 232, 184, .18)', frame: '#ead8b8',
    }),
    shops: Object.freeze([
      { text: 'ROUTE 66 DINER', color: '#e34b35', awning: '#f0d28b' },
      { text: 'MOTEL 66', color: '#2e8eb5', awning: '#e9e0c8' },
      { text: 'GASOLINE', color: '#e0a82e', awning: '#c63d36' },
      { text: 'TRADING POST', color: '#9d563c', awning: '#d7b474' },
    ]),
    shopWall: '#b98d62', shopTrim: '#704d3c', shopDoor: '#273945',
    verticalSigns: Object.freeze(['MOTEL', 'GAS', 'DINER', '66', 'WEST']),
    sponsors: Object.freeze(['HISTORIC U.S. 66', 'MOTHER ROAD', 'BLUE SWALLOW MOTEL', 'WIGWAM MOTEL', 'SANTA MONICA']),
    gate: Object.freeze({ style: 'route66', text: 'HISTORIC U.S. 66 · WEST' }),
    gantryText: 'CHICAGO → SANTA MONICA',
    crowdColors: Object.freeze([0xf0d28b, 0xe34b35, 0x2e8eb5, 0xf4eee0, 0x6f4737, 0x6b8b72]),
    roadTint: 0x6f6b61, laneColor: '#e8e0c9', centerLineColor: '#e8b43f', edgeColor: '#f4d07a', sidewalkTint: 0xa9906d,
    lamp: 'route66', tree: 'route66',
    ground: 0xc8a271,
    glow: 0.26,
    lampCone: 0.018,
    accentCone: 0.05,
    skyline: Object.freeze({ base: [146, 142, 112], window: 'rgba(255, 238, 188, .22)' }),
    materials: Object.freeze({
      roof: 0x755144, stone: 0xb89168, concrete: 0x9f896e, asphaltDark: 0x83796a,
      metal: 0x86796a, darkMetal: 0x443c36, chrome: 0xd2c6af, brick: 0x9b5742,
      white: 0xf1e6cf, cream: 0xe6d2ab, red: 0xc84936, green: 0x55724b,
      yellow: 0xe4b438, blue: 0x3b7790, wood: 0x76523b, trunk: 0x76523b,
      foliage: 0x65744b, foliageLight: 0x85935d, glassDark: 0x32484d, sand: 0xc9a676,
      canopy: 0xe7d7b1,
    }),
    light: Object.freeze({
      key: Object.freeze({ color: 0xfff1cf, intensity: 2.6, position: [-16, 28, 8] }),
      hemi: Object.freeze({ sky: 0xcfe8f3, ground: 0xb28e65, intensity: 1.35 }),
      rim: Object.freeze({ color: 0xffb36b, intensity: 0.5, position: [12, 10, -28] }),
      fill: Object.freeze({ color: 0xd58e55, intensity: 3.2, distance: 72, position: [0, 7, -30] }),
      headlamp: 0,
      exposure: 1.05,
    }),
  }),
  'new-york': Object.freeze({
    sky: Object.freeze({
      top: 0x060a1e, mid: 0x152447, horizon: 0x5b4a6e, haze: 0xffb871,
      sun: Object.freeze({ color: 0xfff1c9, glow: 0xffc06b, elevation: 0.2, radius: 0.045, stripes: 0 }),
      stars: 0.75, moon: 1,
    }),
    weather: 'clear',
    fogNear: 60, fogFar: 240,
    facade: Object.freeze({ style: 'brick', floor: 1.45, litRatio: 0.46, litColors: ['#ffd98a', '#ffe9b8', '#9fd3ff'] }),
    shops: Object.freeze([
      { text: 'PIZZA 24H', color: '#ff6b5c', awning: '#d93a3a' },
      { text: 'DELI · GROCERY', color: '#ffc45c', awning: '#2d7a4a' },
      { text: 'LIQUOR', color: '#ff5fa2', awning: '#1f1f2f' },
      { text: 'NIGHT SHIFT BAR', color: '#4fd6e8', awning: '#2a2f4a' },
    ]),
    verticalSigns: Object.freeze(['HOTEL', 'DINER', 'PARKING', 'JAZZ']),
    sponsors: Object.freeze(['LET’S PLAY', 'BROADWAY NIGHTS', 'MIDTOWN CAB CO.', 'EMPIRE OIL', '42ND ST RADIO']),
    gate: Object.freeze({ style: 'overpass', text: 'MIDTOWN · 42ND ST' }),
    gantryText: 'MIDTOWN',
    crowdColors: Object.freeze([0xffc45c, 0x4fd6e8, 0xf0ece6, 0x2f4f8f, 0xc94040, 0x8c8c99]),
    roadTint: 0x16181f, laneColor: '#ffe28a', edgeColor: '#ffc45c', sidewalkTint: 0x3a3d47,
    lamp: 'cobra', tree: 'street',
  }),
  // ── Shuto Expressway Route 1 · la C1 都心環状線 ──────────────────────────
  // Tokyo ne se joue plus dans une rue de Shibuya : c'est l'anneau intérieur
  // de la Shuto Expressway, 14,8 km de viaduc au-dessus de la ville, avec ses
  // tunnels sous le palais impérial, ses murs antibruit, ses portiques verts et
  // ses panneaux de sortie numérotés. Tout ce qui est propre à la voie rapide
  // vit dans `expressway` ; les secteurs réels (日本橋 km 0 → 神田橋 → 竹橋 →
  // 北の丸 → 千代田 → 霞が関 → 谷町 → 飯倉 → 芝公園 et sa Tokyo Tower →
  // 浜崎橋 → 汐留 → 銀座 → 京橋 → 宝町) viennent de `CITY_RUSH_SHUTO_C1`.
  tokyo: Object.freeze({
    // Le Japon roule à gauche : la chaussée de la C1 peint ses flèches de voie
    // en miroir — la moitié gauche va dans le sens de la course, la droite
    // vient en face. Côté règles, le même champ vit sur la ville, dans
    // `CITY_RUSH_CITIES` (`driveSide: 'left'`) ; le test des thèmes vérifie que
    // les deux restent d'accord.
    driveSide: 'left',
    sky: Object.freeze({
      top: 0x070b1e, mid: 0x1d1a44, horizon: 0x6d3560, haze: 0xffa463,
      sun: Object.freeze({ color: 0xfff6e0, glow: 0xf54eae, elevation: 0.2, radius: 0.048, stripes: 0 }),
      stars: 0.32, moon: 0.9,
    }),
    // Crachin de nuit sur le bitume drainant : la chaussée reste brillante.
    weather: 'drizzle',
    // Du haut du viaduc on voit loin : la brume repousse l'horizon de la baie.
    fogNear: 82, fogFar: 330,
    // Façades des tours qui montent le long du tablier (Shiodome, Ginza,
    // Toranomon) : denses, vitrées, très allumées la nuit.
    facade: Object.freeze({ style: 'dense', floor: 1.32, litRatio: 0.66, litColors: ['#9af4ff', '#ffffff', '#ff7dd1', '#ffe08a'] }),
    verticalSigns: Object.freeze(['ネオン', '銀座', '汐留', '夜', 'カラオケ', 'ラーメン', '首都高']),
    sponsors: Object.freeze(['LET’S PLAY', 'SHUTŌ C1 内回り', 'MID NIGHT RADIO', '首都高速道路', 'WANGAN TYRES']),
    // Porte de mi-parcours : le portique vert de 谷町JCT, à 300 m du tour.
    gate: Object.freeze({ style: 'shuto-gantry', text: '谷町 JCT' }),
    gantryText: 'C1 都心環状',
    // La « foule » de la zone de départ devient l'équipe de piste : gilets
    // haute visibilité, casques blancs et rouge de la Shuto.
    crowdColors: Object.freeze([0xffb03a, 0xf2f4ee, 0x3ce08a, 0xff5b5b, 0x9fd8ff, 0x2a2f3d]),
    roadTint: 0x14161d, laneColor: '#eef4ff', edgeColor: '#3ce08a', sidewalkTint: 0x2a2c38,
    // Mâts d'éclairage de la voie rapide, aucun arbre sur le tablier.
    lamp: 'mast', tree: 'none',
    glow: 1, lampCone: 0.07, accentCone: 0.1,
    skyline: Object.freeze({ base: [10, 14, 32] }),
    expressway: Object.freeze({
      route: CITY_RUSH_SHUTO_C1,
      // Lignes annoncées sur le panneau du portique de départ (江戸橋JCT).
      signExits: Object.freeze(['1号上野線', '6号向島線', 'B 湾岸線']),
      // Coupe du tablier, en mètres : chaussée 13,4 + bandes d'arrêt d'urgence
      // + trottoir de service, puis glissière, mur antibruit et parapet.
      deckHalfWidth: 10.6,
      shoulderWidth: 1.5,
      barrierHeight: 1.05,
      parapetHeight: 0.95,
      wallHeight: 3.4,
      // La ville est treize mètres plus bas ; les tours de Shiodome et de
      // Ginza remontent bien au-dessus du tablier.
      streetDepth: 13,
      towerBaseX: 15.5,
      // Vert officiel de la signalisation Shuto, blanc des caractères.
      signGreen: '#0b6b3f',
      signGreenDark: '#064a2c',
      signWhite: '#f4f8f1',
      materials: Object.freeze({
        concrete: 0x6a7180, deckConcrete: 0x565c6a, parapet: 0x767d8b,
        steel: 0x93a0ad, galvanized: 0xc0cad3, darkSteel: 0x2b303c,
      }),
      tunnel: Object.freeze({ wall: 0x2b2f3a, ceiling: 0x1d2029, portal: 0x3a4050, sodium: 0xffb46b, led: 0xf2f7ff }),
      soundWall: Object.freeze({ panel: 0x2b4a3c, post: 0x9aa6b4, opacity: 0.55 }),
      below: Object.freeze({ ground: 0x080a12, neonA: '#ff5b9a', neonB: '#42e6ff', palace: 0x0e2018 }),
      // Panneaux publicitaires scellés sur les murs antibruit, comme sur la
      // vraie C1 entre 汐留 et 銀座.
      billboards: Object.freeze([
        { text: 'ミッドナイト ラジオ', color: '#ff5b9a' },
        { text: 'WANGAN TYRES', color: '#42e6ff' },
        { text: '首都高 24H', color: '#3ce08a' },
        { text: 'NEO TOKYO MOTORS', color: '#ffe066' },
        { text: '銀座 NIGHT DRIVE', color: '#ff9f43' },
        { text: 'MID NIGHT CLUB', color: '#ff4d6d' },
      ]),
    }),
  }),
  paris: Object.freeze({
    sky: Object.freeze({
      top: 0x1d1a3f, mid: 0x5b3f72, horizon: 0xf2a36b, haze: 0xffd0a8,
      sun: Object.freeze({ color: 0xfff0c8, glow: 0xffa86b, elevation: 0.07, radius: 0.12, stripes: 0 }),
      stars: 0.25, moon: 0,
    }),
    weather: 'clear',
    fogNear: 65, fogFar: 245,
    facade: Object.freeze({ style: 'haussmann', floor: 1.6, litRatio: 0.44, litColors: ['#ffdca3', '#fff0cf', '#ffc98a'] }),
    shops: Object.freeze([
      { text: 'CAFÉ DE LA NUIT', color: '#ffd9a8', awning: '#b8322f' },
      { text: 'BOULANGERIE', color: '#ffe6b8', awning: '#2f5d44' },
      { text: 'TABAC · PRESSE', color: '#ff8c8c', awning: '#c9402f' },
      { text: 'BRASSERIE 86', color: '#72d9d0', awning: '#2a3a66' },
    ]),
    verticalSigns: Object.freeze(['HÔTEL', 'MÉTRO', 'CINÉMA', 'BAL']),
    sponsors: Object.freeze(['LET’S PLAY', 'RADIO RIVE GAUCHE', 'PNEUS LUMIÈRE', 'CAFÉ 1986', 'SEINE MOTORS']),
    gate: Object.freeze({ style: 'arc', text: 'RIVE GAUCHE' }),
    gantryText: 'RIVE GAUCHE',
    crowdColors: Object.freeze([0xffb7a4, 0x72d9d0, 0xf5f0e6, 0x2f3f7a, 0xd94a4a, 0xf2d36c]),
    roadTint: 0x26232c, laneColor: '#f0e7d8', edgeColor: '#ffb7a4', sidewalkTint: 0x6b5b58,
    lamp: 'globe', tree: 'plane',
  }),
  london: Object.freeze({
    // Le Royaume-Uni roule à gauche (voir le commentaire du thème de Tokyo) :
    // les flèches des trois voies de gauche pointent vers l'avant, celles de
    // droite viennent vers le joueur.
    driveSide: 'left',
    sky: Object.freeze({
      top: 0x0b1226, mid: 0x1f3047, horizon: 0x4f5f6c, haze: 0xd8b27a,
      sun: Object.freeze({ color: 0xfff4de, glow: 0xffc879, elevation: 0.17, radius: 0.05, stripes: 0 }),
      stars: 0.3, moon: 1,
    }),
    weather: 'rain',
    fogNear: 40, fogFar: 200,
    facade: Object.freeze({ style: 'georgian', floor: 1.5, litRatio: 0.42, litColors: ['#ffd98d', '#ffe9c0', '#ffc46b'] }),
    shops: Object.freeze([
      { text: 'THE NEON CROWN', color: '#e8bd64', awning: '#1d3b2a' },
      { text: 'FISH & CHIPS', color: '#ffd98d', awning: '#2a3a66' },
      { text: 'SOHO RECORDS', color: '#70cbd1', awning: '#3a1f3f' },
      { text: 'TUBE · SOHO', color: '#ff6b6b', awning: '#1a1f2f' },
    ]),
    verticalSigns: Object.freeze(['PUB', 'THEATRE', 'HOTEL', 'SOHO']),
    sponsors: Object.freeze(['LET’S PLAY', 'SOHO FM', 'THAMES TYRES', 'PICCADILLY MOTORS', 'NIGHTLINE']),
    gate: Object.freeze({ style: 'tower-bridge', text: 'SOHO' }),
    gantryText: 'SOHO',
    crowdColors: Object.freeze([0xe8bd64, 0x70cbd1, 0xf3eee4, 0xb83a3a, 0x2f3f5f, 0x6b6f7a]),
    roadTint: 0x171a22, laneColor: '#e9efe9', edgeColor: '#e8bd64', sidewalkTint: 0x3f434b,
    lamp: 'victorian', tree: 'street',
  }),
  // ── Route de campagne au Mexique · Zacatecas → San Luis Potosí ────────
  // Plein jour écrasant d'azur : champs d'agaves, petits ranchos de
  // stuc coloré, clôtures de piquets, cactus et panneaux peints à la main.
  // Très peu de trafic : les voitures rencontrées sont rares, typiques des
  // routes secondaires du Bajío.
  'mexico-countryside': Object.freeze({
    daylight: true,
    mexico: true,
    countryside: true,
    sky: Object.freeze({
      top: 0x216fbf, mid: 0x7ec0e6, horizon: 0xf4d090, haze: 0xffe0a8,
      sun: Object.freeze({ color: 0xfff8e0, glow: 0xffcc5c, elevation: 0.82, radius: 0.06, stripes: 0 }),
      stars: 0, moon: 0,
    }),
    weather: 'clear',
    fogNear: 160, fogFar: 480,
    facade: Object.freeze({
      style: 'adobe', floor: 1.45, litRatio: 0.01, litColors: ['#fff1c2'],
      wall: '#d9a673', glass: '#4a6273', sheen: 'rgba(255, 238, 200, .18)', frame: '#f4e6c9',
    }),
    shops: Object.freeze([
      { text: 'TAQUERÍA EL SOL', color: '#e85d38', awning: '#f2c14e' },
      { text: 'TORTILLERÍA', color: '#2f8f6b', awning: '#e8d3a5' },
      { text: 'ABARROTES LUPITA', color: '#c8463a', awning: '#f2d4a8' },
      { text: 'MECÁNICO CHOLO', color: '#3b6d8f', awning: '#d9915c' },
    ]),
    shopWall: '#c8885a', shopTrim: '#7a4a30', shopDoor: '#2d3c48',
    verticalSigns: Object.freeze(['PULQUERÍA', 'MÉXICO', 'TAQUERÍA', 'NORTE', 'SUR']),
    sponsors: Object.freeze(['CARRETERA 45', 'CAMINO DEL SOL', 'AGAVE AZUL', 'RANCHO NUEVO', 'PUEBLO VIEJO']),
    gate: Object.freeze({ style: 'mexico-arch', text: 'CARRETERA DEL SOL · SUR' }),
    gantryText: 'CARRETERA 45',
    crowdColors: Object.freeze([0xe85d38, 0xf2c14e, 0x2f8f6b, 0xf4e6c9, 0x7a4a30, 0x3b6d8f]),
    roadTint: 0x5c554a, laneColor: '#f4e6c9', centerLineColor: '#e8b43f', edgeColor: '#e85d38', sidewalkTint: 0xb08a5e,
    lamp: 'mexico', tree: 'mexico',
    ground: 0xd6b079,
    glow: 0.12,
    lampCone: 0.01,
    accentCone: 0.03,
    skyline: Object.freeze({ base: [158, 134, 94], window: 'rgba(255, 236, 180, .18)' }),
    materials: Object.freeze({
      roof: 0xa04432, tile: 0xc8583d, stone: 0xb99064, concrete: 0xa99478, asphaltDark: 0x6d6154,
      metal: 0x8a8070, darkMetal: 0x443c36, chrome: 0xd2c6af, brick: 0xa86848,
      white: 0xf4ecd8, cream: 0xeacfa3, red: 0xc8422a, green: 0x4d8b3c,
      yellow: 0xe4b438, blue: 0x3b7790, wood: 0x7a4f35, trunk: 0x7a4f35,
      foliage: 0x5a7a3e, foliageLight: 0x81a558, agaveBlue: 0x5e8a76, agaveGreen: 0x6d8f4e,
      glassDark: 0x3d5a6b, sand: 0xd6b079, adobe: 0xd9a673,
      canopy: 0xeacfa3, terracotta: 0xc8583d,
    }),
    light: Object.freeze({
      key: Object.freeze({ color: 0xfff4d0, intensity: 3.4, position: [-14, 36, 4] }),
      hemi: Object.freeze({ sky: 0xd3edf7, ground: 0xc09968, intensity: 1.6 }),
      rim: Object.freeze({ color: 0xffc36b, intensity: 0.55, position: [14, 10, -30] }),
      fill: Object.freeze({ color: 0xd98642, intensity: 4, distance: 80, position: [0, 8, -30] }),
      headlamp: 0,
      exposure: 1.0,
    }),
  }),
  // ── Nürburgring Nordschleife · Eifel ──────────────────────────────────
  // Ciel d'orage qui se lève sur la forêt : la « Grüne Hölle » change de
  // temps tous les kilomètres. Le thème porte `raceway` — le monde construit
  // alors la piste étroite de `nordschleifeStage.js` au lieu d'une rue — et
  // `roadHalf` fixe sa largeur : 9,20 m de bitume (8,40 m utiles, comme le
  // vrai Ring, plus la marge peinte de chaque côté).
  nordschleife: Object.freeze({
    daylight: true,
    raceway: true,
    roadHalf: 4.6,
    verge: true,
    sky: Object.freeze({
      top: 0x2f6fb2, mid: 0x7fa8c8, horizon: 0xd9e0d0, haze: 0xe8e4cf,
      sun: Object.freeze({ color: 0xfff6dc, glow: 0xf2cf8a, elevation: 0.58, radius: 0.052, stripes: 0 }),
      stars: 0, moon: 0,
    }),
    // Le Ring a son microclimat : averse sur la Hohe Acht, soleil à Breidscheid.
    weather: 'rain',
    fogNear: 120, fogFar: 420,
    facade: Object.freeze({
      style: 'eifel', floor: 1.4, litRatio: 0.02, litColors: ['#ffe9b0'],
      wall: '#e6e1d4', glass: '#3d5566', sheen: 'rgba(240, 244, 232, .2)', frame: '#6b5a44',
    }),
    shops: Object.freeze([
      { text: 'MOTORSPORT SHOP', color: '#c8382f', awning: '#f4f1e8' },
      { text: 'RING CAFÉ', color: '#3f6d4a', awning: '#e8dcb8' },
      { text: 'REIFEN DIENST', color: '#2f3a42', awning: '#d7b049' },
      { text: 'EIFEL BRAUHAUS', color: '#8f4134', awning: '#f4f1e8' },
    ]),
    shopWall: '#cfc7b4', shopTrim: '#5a5145', shopDoor: '#2f3a42',
    verticalSigns: Object.freeze(['NORDSCHLEIFE', 'EIFEL', 'RING°', 'GRÜNE HÖLLE', 'BOXENGASSE']),
    sponsors: Object.freeze(['NÜRBURGRING', 'GRÜNE HÖLLE', 'EIFEL', 'RING RACING', 'ADENAU', 'DÖTTINGER HÖHE']),
    gate: Object.freeze({ style: 'nordschleife', text: 'NORDSCHLEIFE · EINFAHRT' }),
    gantryText: 'NORDSCHLEIFE',
    crowdColors: Object.freeze([0xf4f1e8, 0xc8382f, 0xd7b049, 0x3f6d4a, 0x2f3a42, 0x8f4134]),
    roadTint: 0x4a4a4c, laneColor: '#f4f1e8', centerLineColor: '#f4d35e', edgeColor: '#f4f1e8', sidewalkTint: 0x4f7a3c,
    lamp: 'ring', tree: 'eifel',
    ground: 0x3f6634,
    glow: 0.1,
    lampCone: 0.01,
    accentCone: 0.04,
    curb: 0x6f6a63,
    skyline: Object.freeze({ base: [110, 124, 96], window: 'rgba(255, 240, 200, .14)' }),
    materials: Object.freeze({
      kerbRed: 0xc8382f, kerbWhite: 0xf1efe6, armco: 0xa8adb4, armcoPost: 0x6b7076,
      concrete: 0x9a978d, concreteDark: 0x74716a, gravel: 0x9a8f7c, gravelDark: 0x7d7361,
      grass: 0x4f7a3c, grassDark: 0x375c2c, foliage: 0x2f5a30, foliageLight: 0x477a3a,
      trunk: 0x53402f, wood: 0x7a5b3a, steel: 0x8e949c, darkMetal: 0x2e3238,
      stone: 0x8d867a, slate: 0x3a3f47, plaster: 0xe6e1d4, roofTile: 0x8f4134,
      canopy: 0xd9d3c2, terracotta: 0x8f4134,
    }),
    light: Object.freeze({
      key: Object.freeze({ color: 0xfff2d6, intensity: 2.9, position: [-16, 38, 6] }),
      hemi: Object.freeze({ sky: 0xcfe2ef, ground: 0x5a6b4a, intensity: 1.5 }),
      rim: Object.freeze({ color: 0xf2cf8a, intensity: 0.5, position: [16, 12, -30] }),
      fill: Object.freeze({ color: 0x8fb0c8, intensity: 3.4, distance: 90, position: [0, 9, -30] }),
      headlamp: 0,
      exposure: 1.0,
    }),
  }),
});

export function cityRushTheme(cityId) {
  return CITY_RUSH_THEMES[cityId] || CITY_RUSH_THEMES['vice-city'];
}

/**
 * Côté de circulation peint par un thème : `'right'` par défaut, `'left'` pour
 * les thèmes qui roulent à gauche (Londres, Tokyo). Les textures de route s'en
 * servent pour orienter leurs flèches de voie ; côté règles, c'est le même côté
 * que `cityRushDriveSide` sur la ville.
 */
export function cityRushThemeDriveSide(theme) {
  return theme?.driveSide === 'left' ? 'left' : 'right';
}

// ── Éclairage ──────────────────────────────────────────────────────────────
// Réglages nocturnes d'origine (néons, phares, halo aux couleurs de la ville) :
// toute ville sans bloc `light` les conserve tels quels. Les couleurs `null`
// sont résolues par `cityRushLightRig` depuis la palette de la ville.
export const CITY_RUSH_NIGHT_LIGHT = Object.freeze({
  key: Object.freeze({ color: 0xe4ecff, intensity: 2, position: Object.freeze([-12, 24, 17.1]) }),
  hemi: Object.freeze({ sky: null, ground: 0x1c1522, intensity: 1.75 }),
  rim: Object.freeze({ color: null, intensity: 1.05, position: Object.freeze([8, 8, -24]) }),
  fill: Object.freeze({ color: null, intensity: 20, distance: 54, decay: 2, position: Object.freeze([0, 7, -27]) }),
  headlamp: 60,
  exposure: 1.1,
});

/**
 * Résout l'éclairage d'une ville : un thème en plein jour (`theme.light`)
 * remplace soleil, hémisphère, contre-jour, remplissage, phares et exposition,
 * les autres villes gardent l'ambiance nocturne.
 */
export function cityRushLightRig(theme, city) {
  const override = theme.light || {};
  const accent = Number.parseInt(city.accent.slice(1), 16);
  const secondary = Number.parseInt(city.secondary.slice(1), 16);
  const base = CITY_RUSH_NIGHT_LIGHT;
  const merge = (section, fallback) => ({ ...fallback, ...(override[section] || {}) });
  return {
    key: merge('key', base.key),
    hemi: merge('hemi', { ...base.hemi, sky: theme.sky.mid }),
    rim: merge('rim', { ...base.rim, color: secondary }),
    fill: merge('fill', { ...base.fill, color: accent }),
    headlamp: override.headlamp ?? base.headlamp,
    exposure: override.exposure ?? base.exposure,
  };
}
