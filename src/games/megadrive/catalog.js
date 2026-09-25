// Borne Mega Drive Let's Play.
//
// RÈGLE D'OR : on n'héberge que des jeux dont les auteurs autorisent la
// diffusion gratuite, preuve à l'appui (public/megadrive/README.md et
// public/megadrive/roms/<slug>/INFO.txt ou LICENSE.txt). Jamais de ROM
// commerciale. Les jeux gratuits SANS droit de redistribution sont présentés
// en « external » : la jaquette renvoie vers la page officielle de l'auteur.
//
// `pending: true` = licence vérifiée, mais le fichier .bin n'est pas encore
// déposé dans public/megadrive/roms/<slug>/ : la jaquette affiche « Bientôt ».

const BASE = import.meta.env.BASE_URL;
const MD = `${BASE}megadrive/`;

function hosted(game) {
  const dir = `${MD}roms/${game.slug}/`;
  return {
    ...game,
    rom: `${dir}${game.romFile}`,
    cover: `${MD}covers/${game.slug}.webp`,
    screenshots: game.screenshots ? [`${dir}title.png`, `${dir}play.png`] : [],
    licenseUrl: game.licenseUrl || `${dir}${game.licenseFile}`,
  };
}

function external(game) {
  return {
    ...game,
    external: true,
    cover: `${MD}covers/${game.slug}.webp`,
    screenshots: [],
  };
}

export const MD_CATALOG = [
  hosted({
    slug: 'oh-mummy',
    title: 'Oh Mummy Genesis',
    shortTitle: 'Oh Mummy',
    year: 2012,
    developer: '1985 Alternativo',
    credits: 'Code : Pocket Lucho · Graphismes : Pocket Lucho, David Ayala, Juan M. Rodríguez · Musique : David Sánchez',
    genre: 'Arcade · Labyrinthe',
    players: '1-2 joueurs',
    screenshots: true,
    accent: '#f59e0b',
    romFile: 'oh-mummy.bin',
    tagline: 'Fais le tour des tombeaux. Évite les momies.',
    description:
      'Le remake 16 bits du classique Amstrad de 1984, par l’équipe espagnole 1985 Alternativo. Explore la pyramide, fais le tour des blocs pour révéler ce qu’ils cachent et file avant que les momies ne te rattrapent. Modes Aventure et Survie, à un ou deux joueurs — et la version d’origine est aussi dans la cartouche : deux jeux en un.',
    howTo: [
      'Menu de démarrage : ↓ puis A pour la version GENESIS (↑ = version classique)',
      'Croix : déplacer l’archéologue · Start : valider / pause',
      'Fais le tour complet d’un bloc pour découvrir ce qu’il cache',
      'Trouve la clé et le sarcophage royal pour ouvrir l’étage suivant',
    ],
    license: 'Freeware (libéré par les auteurs)',
    licenseFile: 'INFO.txt',
    officialUrl: 'https://www.fasebonus.net/2013/05/oh-mummy-genesis-liberado/',
    officialLabel: 'Annonce de la libération',
  }),
  hosted({
    slug: 'irmaos-aratu',
    title: 'Irmãos Aratu',
    year: 2022,
    developer: 'Mangangá Team',
    credits: 'Laudelino (code, design) · Amaweks (décors, musique) · pixel art : ansimuz',
    genre: 'Beat ’em up',
    players: '1-2 joueurs',
    accent: '#a855f7',
    romFile: 'irmaos-aratu.bin',
    pending: true,
    tagline: 'Deux frangins contre toute une nuit de cauchemars.',
    description:
      'Un beat ’em up brésilien à l’ancienne : les frères Aratu cognent zombies et squelettes à travers cimetières et ruines. En portugais, mais parfaitement jouable sans parler la langue.',
    howTo: [
      'Croix : se déplacer',
      'Boutons A / B / C : frapper et sauter (essaie-les tous !)',
      'Start : commencer / pause',
    ],
    license: 'Gratuit, diffusion libre (auteurs)',
    licenseFile: 'INFO.txt',
    officialUrl: 'https://amaweks.itch.io/aratu-shaolin',
    officialLabel: 'Page officielle (dons)',
  }),
  hosted({
    slug: 'shaolin-carcara',
    title: 'Shaolin Carcará',
    year: 2022,
    developer: 'Mangangá Team',
    credits: 'Laudelino (code, design) · Amaweks (musique) · pixel art : ansimuz',
    genre: 'Beat ’em up · Plateformes',
    players: '1 joueur',
    accent: '#ea580c',
    romFile: 'shaolin-carcara.bin',
    pending: true,
    tagline: 'Le kung-fu du sertão.',
    description:
      'Le petit frère d’Irmãos Aratu : un moine combattant traverse le Nordeste brésilien à coups de pied sautés. L’astuce des pros : maîtrise le super saut pour éviter les projectiles.',
    howTo: [
      'Croix : se déplacer',
      'Haut + A : super saut',
      'Boutons A / B / C : attaquer et sauter',
    ],
    license: 'Gratuit, diffusion libre (auteurs)',
    licenseFile: 'INFO.txt',
    officialUrl: 'https://amaweks.itch.io/aratu-shaolin',
    officialLabel: 'Page officielle (dons)',
  }),
  hosted({
    slug: 'minesweeper',
    title: 'Minesweeper MD',
    shortTitle: 'Minesweeper',
    year: 2024,
    developer: 'Nightwolf-47',
    genre: 'Réflexion',
    players: '1 joueur',
    accent: '#22d3ee',
    romFile: 'minesweeper.bin',
    pending: true,
    tagline: 'Le démineur, en 16 bits et en grand format.',
    description:
      'Le démineur façon Mega Drive, avec des grilles géantes (jusqu’à 38 × 22), le « chording » des pros et un tableau des trois meilleurs temps par difficulté.',
    howTo: [
      'Croix : déplacer le curseur',
      'A : découvrir une case · C : poser un drapeau',
      'B : découvrir les cases voisines d’un chiffre (chording)',
      'Start : retour au menu',
    ],
    license: 'MIT',
    licenseFile: 'LICENSE.txt',
    sourceUrl: 'https://github.com/Nightwolf-47/Minesweeper-MD',
  }),
  hosted({
    slug: 'kleleatoms',
    title: 'KłełeAtoms MD',
    shortTitle: 'KłełeAtoms',
    year: 2022,
    developer: 'Nightwolf-47',
    genre: 'Stratégie · Réaction en chaîne',
    players: '1-4 joueurs',
    accent: '#84cc16',
    romFile: 'kleleatoms.bin',
    pending: true,
    tagline: 'Fais exploser tes atomes, vole ceux des autres.',
    description:
      'Chacun pose un atome par tour. Une case trop chargée explose, contamine ses voisines et déclenche des réactions en chaîne. Le dernier joueur qui possède encore des atomes gagne. Jusqu’à quatre joueurs, humains ou IA.',
    howTo: [
      'Croix : choisir une case',
      'A : poser un atome',
      'Coin = 2 atomes, bord = 3, centre = 4 avant explosion',
      'Start : pause',
    ],
    license: 'MIT',
    licenseFile: 'LICENSE.txt',
    sourceUrl: 'https://github.com/Nightwolf-47/KleleAtoms-MD',
  }),

  // Gratuits chez leurs auteurs, mais sans droit de redistribution.
  external({
    slug: '30-years-of-nintendont',
    title: '30 Years of Nintendon’t',
    shortTitle: 'Nintendon’t',
    year: 2018,
    developer: 'Dr. Ludos',
    genre: 'Quiz · Parodie',
    players: '1 joueur',
    accent: '#3b82f6',
    externalUrl: 'https://drludos.itch.io/30-years-of-nintendont',
    externalReason: 'jouable sur itch.io',
  }),
  external({
    slug: 'break-an-egg',
    title: 'Break An Egg',
    year: 2018,
    developer: 'Dr. Ludos',
    genre: 'Arcade',
    players: '1 joueur',
    accent: '#facc15',
    externalUrl: 'https://drludos.itch.io/break-an-egg',
    externalReason: 'jouable sur itch.io',
  }),
  external({
    slug: 'bio-evil',
    title: 'Bio Evil (démo technique)',
    shortTitle: 'Bio Evil',
    year: 2020,
    developer: 'PSCDGames',
    genre: 'Survival horror',
    players: '1 joueur',
    accent: '#16a34a',
    externalUrl: 'https://pscdgames.itch.io/bio-evil',
    externalReason: 'démo sur itch.io',
  }),
  external({
    slug: 'barbarian',
    title: 'Barbarian (remake)',
    shortTitle: 'Barbarian',
    year: 2021,
    developer: 'Z-Team',
    genre: 'Action · Plateformes',
    players: '1 joueur',
    accent: '#dc2626',
    externalUrl: 'https://z-team.itch.io/barbarian-sega-megadrive',
    externalReason: 'sur itch.io',
  }),
];

export const MD_PLAYABLE = MD_CATALOG.filter((game) => !game.external && !game.pending);

export function findMdGame(slug) {
  return MD_CATALOG.find((game) => game.slug === slug && !game.external) || null;
}
