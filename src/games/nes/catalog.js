// Borne rétro Let's Play : les jeux NES jouables directement sur le site.
//
// RÈGLE D'OR : uniquement des jeux dont la licence autorise la
// redistribution (logiciel libre, domaine public). Jamais de ROM commerciale.
// Provenance et licences détaillées : public/roms/README.md.
//
// Chaque jeu vit dans public/roms/<slug>/ : la ROM, sa licence, la jaquette
// (`cover.webp`, illustration originale Let's Play) et deux captures prises
// dans l'émulateur (`title.png`, `play.png` — scripts/nes-screenshot.mjs).

const BASE = import.meta.env.BASE_URL;
const asset = (slug, file) => `${BASE}roms/${slug}/${file}`;

function entry(game) {
  return {
    ...game,
    rom: asset(game.slug, game.romFile),
    cover: asset(game.slug, 'cover.webp'),
    screenshots: [asset(game.slug, 'title.png'), asset(game.slug, 'play.png')],
    licenseUrl: game.licenseFile ? asset(game.slug, game.licenseFile) : game.licenseUrl,
    sourceDownload: game.sourceFile ? asset(game.slug, game.sourceFile) : null,
  };
}

export const NES_CATALOG = [
  entry({
    slug: 'thwaite',
    title: 'Thwaite',
    year: 2011,
    developer: 'Damian Yerrick',
    genre: 'Arcade · Défense',
    players: '1-2 joueurs (coop)',
    accent: '#f97316',
    romFile: 'thwaite.nes',
    tagline: 'Sept nuits pour sauver la ville.',
    description:
      'Un guitariste hippie devenu fou bombarde ta petite ville. Transforme les feux d’artifice en missiles anti-missiles et tiens bon du dimanche au samedi : un hommage survolté à Missile Command.',
    howTo: [
      'Croix : déplacer le viseur (tapote pour les petits gestes)',
      'B : tirer depuis le silo de gauche · A : silo de droite',
      'Vise un peu devant le missile : l’explosion peut en détruire plusieurs',
    ],
    warning: 'Explosions clignotantes : prudence en cas d’épilepsie photosensible.',
    license: 'GPL v3 ou ultérieure',
    licenseFile: 'LICENSE.txt',
    sourceFile: 'thwaite-source.zip',
    sourceUrl: 'https://github.com/pinobatch/thwaite-nes',
  }),
  entry({
    slug: 'rhde',
    title: 'RHDE: Furniture Fight',
    shortTitle: 'RHDE',
    year: 2014,
    developer: 'Damian Yerrick',
    genre: 'Stratégie · Duel',
    players: '2 joueurs',
    accent: '#ef4444',
    romFile: 'rhde.nes',
    tagline: 'Décore ta maison. « Décore » celle du voisin.',
    description:
      'Un jeu de stratégie en temps réel à deux où la déco est une arme : achète des meubles, vandalise la maison d’en face, vole son canapé puis reconstruis tes murs pièce par pièce, façon Tetris.',
    howTo: [
      'Joueur 1 au clavier (flèches, X, C) — joueur 2 au clavier (ZQSD, G, H) ou à la manette',
      'Meubler : A pour prendre et poser, B pour pivoter un tapis, → pour la boutique',
      'Bataille : fais un trou dans le mur adverse, entre et vole ses meubles',
    ],
    license: 'GNU All-Permissive',
    licenseFile: 'LICENSE.txt',
    sourceUrl: 'https://github.com/pinobatch/rhde-nes',
  }),
  entry({
    slug: 'concentration-room',
    title: 'Concentration Room',
    shortTitle: 'Concentration',
    year: 2010,
    developer: 'Damian Yerrick',
    genre: 'Réflexion · Memory',
    players: '1-2 joueurs',
    accent: '#22c55e',
    romFile: 'croom.nes',
    tagline: 'Garde ta tête froide pendant la quarantaine.',
    description:
      'Une fuite de neurotoxine t’a enfermé en quarantaine au labo. Pour garder la raison, retourne les cartes et trouve les paires : histoire, solitaire, duel à deux ou contre l’ordinateur.',
    howTo: [
      'Croix : déplacer le curseur',
      'A : retourner une carte',
      'Select sur l’écran titre : détails et crédits',
    ],
    license: 'GPL v3 (exception binaire)',
    licenseFile: 'README.html',
    sourceUrl: 'https://github.com/pinobatch/croom-nes',
  }),
  entry({
    slug: 'lan-master',
    title: 'Lan Master',
    year: 2011,
    developer: 'Shiru',
    genre: 'Réflexion · Puzzle',
    players: '1 joueur',
    accent: '#38bdf8',
    romFile: 'lan-master.nes',
    tagline: 'Rebranche tout le réseau avant la fin du chrono.',
    description:
      'Chaque niveau est un réseau en vrac : fais pivoter les câbles pour relier tous les ordinateurs au serveur avant la fin du temps imparti. Les mots de passe permettent de reprendre plus loin.',
    howTo: [
      'Croix : choisir une case',
      'A : faire pivoter le câble',
      'CODE sur l’écran titre : entrer un mot de passe',
    ],
    license: 'Domaine public (CC0)',
    licenseFile: 'LICENSE.txt',
    sourceUrl: 'https://github.com/RGBA-CRT/LanMasterFDS',
  }),
  entry({
    slug: '2048',
    title: '2048',
    year: 2015,
    developer: 'mmuszkow',
    genre: 'Réflexion · Chiffres',
    players: '1 joueur',
    accent: '#eab308',
    romFile: '2048.nes',
    tagline: 'Fais glisser, fusionne, atteins 2048.',
    description:
      'Le casse-tête culte, version 8-bit : fais glisser les tuiles, fusionne les nombres identiques et tente d’atteindre la tuile 2048 avant que la grille ne soit pleine.',
    howTo: [
      'Croix : faire glisser toutes les tuiles',
      'Start : commencer · Select : couper la musique',
    ],
    license: 'Unlicense (domaine public)',
    licenseFile: 'LICENSE.txt',
    sourceUrl: 'https://github.com/mmuszkow/2048-nes',
  }),
];

export function findNesGame(slug) {
  return NES_CATALOG.find((game) => game.slug === slug) || null;
}
