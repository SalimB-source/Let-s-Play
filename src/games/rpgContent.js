// Contenu de la démo de combat — « Le Sablier de Bab El » (concept B).
//
// Ce fichier est la seule partie du prototype qui connaît l'univers : noms,
// chiffres, textes. Le moteur (rpgCombat.js) ne lit que des structures. Pour
// essayer un autre concept du dossier, il suffit d'écrire un autre fichier
// comme celui-ci.
//
// Échelle de lecture : une compétence de base tape autour de 100-115 % de
// l'Attaque, une compétence à 3 PA autour de 260-330 %, et tout ce qui coûte
// du sable tape plus fort que son coût en PA ne le laisserait croire.

export const RPG_ELEMENT_ICONS = {
  braise: '🔥',
  souffle: '🌀',
  sable: '⏳',
  eau: '💧',
  encre: '🖋',
  verre: '◇',
};

// ── L'équipe ───────────────────────────────────────────────────────────────
export const RPG_DEMO_PARTY = [
  {
    id: 'salem',
    name: 'SALEM',
    role: 'Le Sondeur · Sable',
    element: 'sable',
    level: 12,
    maxHp: 205,
    atk: 28,
    def: 19,
    mag: 16,
    res: 17,
    spd: 12,
    agi: 66,
    nameSegments: 3,
    portrait: 'salem',
    line: 'Je descends vérifier. Je remonte toujours avec quelqu’un. Jamais assez.',
  },
  {
    id: 'yamina',
    name: 'YAMINA',
    role: 'L’Horlogère · Verre',
    element: 'verre',
    level: 12,
    maxHp: 168,
    atk: 13,
    def: 12,
    mag: 30,
    res: 22,
    spd: 14,
    agi: 80,
    nameSegments: 3,
    backline: true,
    portrait: 'yamina',
    line: 'J’ai signé une Liste à dix-neuf ans. Depuis, je compte avant de signer.',
  },
  {
    id: 'boualem',
    name: 'BOUALEM',
    role: 'Le Puisatier · Eau',
    element: 'eau',
    level: 12,
    maxHp: 215,
    atk: 18,
    def: 20,
    mag: 27,
    res: 24,
    spd: 8,
    agi: 45,
    nameSegments: 3,
    portrait: 'boualem',
    line: 'L’eau monte, le sable aussi. Moi je fais monter ce qui aide.',
  },
  {
    id: 'feriel',
    name: 'FÉRIEL',
    role: 'La Souffleuse de verre · Braise',
    element: 'braise',
    level: 12,
    maxHp: 175,
    atk: 26,
    def: 14,
    mag: 24,
    res: 16,
    spd: 13,
    agi: 90,
    nameSegments: 3,
    portrait: 'feriel',
    line: 'Le sable, c’est du verre qui n’a pas encore compris.',
  },
];

// Tarek : la réserve. La permutation coûte le tour de celui qui entre.
export const RPG_DEMO_RESERVE = [
  {
    id: 'tarek',
    name: 'TAREK',
    role: 'Le Porteur · Sable',
    element: 'sable',
    level: 12,
    maxHp: 250,
    atk: 31,
    def: 27,
    mag: 12,
    res: 19,
    spd: 7,
    agi: 40,
    nameSegments: 2, // il lui manque un segment de Nom : son Ultime est verrouillée
    portrait: 'tarek',
    line: 'Je porte les cartons. Personne ne m’a jamais demandé ce qu’il y a dedans.',
  },
];

// ── Les ennemis de la démo ─────────────────────────────────────────────────
const BALAYEUR = {
  id: 'balayeur',
  name: 'BALAYEUR',
  role: 'Il nettoie ce que le cycle laisse',
  portrait: 'balayeur',
  element: 'sable',
  level: 11,
  maxHp: 285,
  atk: 27,
  def: 15,
  mag: 14,
  res: 14,
  spd: 9,
  agi: 42,
  rewards: { xp: 52, sable: 34 },
  moves: [
    { id: 'raclette', label: 'Raclette', family: 'lourd', power: 128, kind: 'physique', weight: 3 },
    { id: 'tourbillon', label: 'Tourbillon', family: 'zone', power: 104, kind: 'physique', weight: 2.2 },
    { id: 'sac', label: 'Sac de sable', family: 'sablier', power: 0, weight: 1.6 },
  ],
};

const GREFFIER = {
  id: 'greffier',
  name: 'GREFFIER',
  role: 'Il tamponne les noms, page après page',
  portrait: 'greffier',
  element: 'encre',
  level: 12,
  maxHp: 300,
  atk: 17,
  def: 13,
  mag: 30,
  res: 23,
  spd: 10,
  agi: 55,
  backline: true,
  rewards: { xp: 66, sable: 48 },
  moves: [
    { id: 'tampon', label: 'Tampon', family: 'lourd', power: 150, kind: 'magie', element: 'encre', weight: 2.4 },
    {
      id: 'radiation',
      label: 'Radiation',
      family: 'incantation',
      power: 280,
      kind: 'magie',
      element: 'encre',
      weight: 2,
      counterElement: 'verre',
    },
  ],
};

const SONNIER = {
  id: 'sonnier',
  name: 'SONNIER',
  role: 'Il sonne pour les autres',
  portrait: 'sonnier',
  element: 'souffle',
  level: 12,
  maxHp: 265,
  atk: 20,
  def: 14,
  mag: 26,
  res: 18,
  spd: 11,
  agi: 60,
  rewards: { xp: 60, sable: 40 },
  moves: [
    { id: 'tocsin', label: 'Tocsin', family: 'zone', power: 118, kind: 'magie', element: 'souffle', weight: 2.6 },
    { id: 'carillon', label: 'Carillon', family: 'soutien', power: 0, weight: 1.8 },
  ],
};

// Le boss : deux phases, et l'Astrolabe sonne plus souvent à partir de la 2e.
const PROTOTYPE = {
  id: 'prototype',
  name: 'LE PROTOTYPE',
  role: 'Construit pour descendre à la place des hommes',
  portrait: 'prototype',
  element: 'sable',
  level: 14,
  maxHp: 2400,
  atk: 36,
  def: 22,
  mag: 24,
  res: 21,
  spd: 12,
  agi: 50,
  rewards: { xp: 460, sable: 420, registres: 1 },
  phases: [
    {
      threshold: 0.5,
      label: 'Le Prototype ouvre sa chaudière : l’Astrolabe sonnera plus souvent',
      clockInterval: 4,
    },
  ],
  moves: [
    { id: 'piston', label: 'Piston', family: 'lourd', power: 168, kind: 'physique', weight: 3, phase: 1 },
    { id: 'jet', label: 'Jet de vapeur', family: 'zone', power: 128, kind: 'physique', element: 'souffle', weight: 2.4, phase: 1 },
    {
      id: 'chaudiere',
      label: 'Chaudière',
      family: 'incantation',
      power: 300,
      kind: 'magie',
      element: 'braise',
      weight: 1.8,
      counterElement: 'eau',
      phase: 1,
    },
    { id: 'marteau', label: 'Marteau de laiton', family: 'lourd', power: 215, kind: 'physique', push: 1, weight: 3, phase: 2 },
    { id: 'purge', label: 'Purge', family: 'zone', power: 172, kind: 'magie', element: 'braise', weight: 2.6, phase: 2 },
    { id: 'surcharge', label: 'Surcharge', family: 'soutien', power: 0, weight: 1.4, phase: 2 },
  ],
};

/** Les trois vagues de la démo : montée en tension, puis le boss. */
export const RPG_DEMO_WAVES = [
  {
    id: 'vague-1',
    title: 'Vague 1 — les quais',
    intro: 'Deux balayeurs travaillent. L’un d’eux ramassera le sable du sol : soufflez-le avant.',
    clockInterval: 5,
    foes: [{ ...BALAYEUR, id: 'balayeur-a' }, { ...BALAYEUR, id: 'balayeur-b' }],
  },
  {
    id: 'vague-2',
    title: 'Vague 2 — le greffe',
    intro: 'Le Greffier incante une Radiation. Seule une attaque de Verre qui interrompt (Aiguille, Éclat de verre) peut la faire tomber.',
    clockInterval: 5,
    foes: [{ ...GREFFIER, id: 'greffier-a' }, { ...SONNIER, id: 'sonnier-a' }],
  },
  {
    id: 'vague-3',
    title: 'Boss — le Prototype',
    intro: 'Sous la moitié de sa vie, il ouvre sa chaudière : l’Astrolabe sonne tous les 4 rounds au lieu de 5. Sa Chaudière s’interrompt à l’Eau (la Vague de Boualem).',
    clockInterval: 5,
    foes: [PROTOTYPE],
  },
];

/** Textes d'aide affichés autour du combat. */
export const RPG_DEMO_HELP = [
  {
    title: 'Tout est annoncé',
    text: 'Chaque ennemi montre son prochain coup un round à l’avance : ⬇ lourd, ⬒ zone, ⧗ incantation, ⛃ sablier, ⚑ soutien. Aucune attaque ne surprend.',
  },
  {
    title: 'Quatre réponses, zéro réflexe',
    text: 'Garde (−60 %, +1 Verre si vous étiez la cible), Barrage de verre (absorbe), Contre-élément (l’attaque ennemie −50 % et +15 Fêlure), Reposition (monter d’un étage).',
  },
  {
    title: 'Le sable est une deuxième barre de vie',
    text: 'La moitié des PV perdus tombe au sol. Récoltez-le pour vous soigner, soufflez celui de l’ennemi, ou dépensez-le dans les sorts les plus lourds.',
  },
  {
    title: 'Les étages fondent',
    text: 'Frapper de haut fait +15 % par étage, être en haut protège. Tout le monde descend d’un étage chaque round — et une chute du 3e au 1er fait ×1,4.',
  },
  {
    title: 'L’Astrolabe sonne',
    text: 'Tous les 5 rounds (4 sur les boss), les ennemis gagnent +20 % d’Attaque et tout le monde descend d’un étage. Les combats longs se retournent.',
  },
  {
    title: 'Fêlure et Consonance',
    text: 'À 100 de Fêlure, l’ennemi est Fêlé : il n’agit pas, subit ×2, et le premier coup qui le touche est gratuit. Trois éléments dans un round : ×1,5 et +1 Verre.',
  },
];

// ── Exploration : deux paliers à traverser entre les vagues ────────────────
// Chaque action coûte une heure ; le cycle n'attend pas, mais il ne presse
// jamais. Les effets sont appliqués par rpgExplore.js.
export const RPG_EXPLORE_PALIERS = [
  null, // on démarre au cœur du combat, pas de palier avant la vague 1
  {
    id: 'palier-5',
    title: 'Palier 5 · Le Souk suspendu',
    lede: 'Le tram vous laisse sur une place étroite où le linge claque entre les arches. En bas, on entend encore les balayeurs. Ici, on vit comme si le cycle n’existait pas.',
    places: [
      {
        id: 'puis',
        name: 'Le puits public',
        npc: 'Barka, la doyenne',
        line: 'L’eau baisse plus vite que les étages. Alors on compte les deux.',
        actions: [
          {
            id: 'eau',
            label: 'Puiser pour l’équipe',
            text: 'Barka regarde vos plaies sans un mot, et tend la corde. L’eau est froide, presque douce.',
            cost: 1,
            effects: { healAll: 0.25 },
          },
          {
            id: 'ecouter',
            label: 'Écouter l’eau avec Barka',
            text: '« Le sable fait un bruit de registre qu’on feuillette. » Elle rit. Vous repartez avec une outre pleine et sa bénédiction têtue.',
            cost: 1,
            choices: [
              { label: 'Puiser pour l’équipe', text: 'Vous tirez la corde jusqu’aux épaules qui craquent. L’équipe boit, respire, se redresse.', effects: { healAll: 0.25 } },
              { label: 'Puiser pour les anciens du palier', text: 'Vous remplissez leurs jarres à eux. Zoher vous glisse une poignée de sable de ferraille en faisant semblant de ne pas avoir vu.', effects: { sand: 20, flag: 'baraka' } },
            ],
          },
        ],
      },
      {
        id: 'souk',
        name: 'Le souk des descendeurs',
        npc: 'Zoher, gamin du souk',
        line: 'Tout se vend, même ce qui vient d’en bas. Surtout ce qui vient d’en bas.',
        actions: [
          {
            id: 'ferraille',
            label: 'Vendre la ferraille des balayeurs',
            text: 'Les plaques de laiton arrachées à l’automate valent plus que leur poids : les descendeurs les achètent sans marchander.',
            cost: 1,
            effects: { sand: 30 },
          },
          {
            id: 'onguent',
            label: 'Acheter l’onguent de verre (20 sable)',
            text: 'Un baume vert pâle qui sent la braise éteinte. Sur les blessures, il fait un bruit de bulle qui éclate, puis plus rien ne fait mal.',
            cost: 1,
            effects: { spend: 20, healWeak: true },
          },
        ],
      },
      {
        id: 'tram',
        name: 'La station du tramway',
        npc: 'Hnia, la mécanicienne',
        line: 'Elle monte encore, ma cabine. Tant que quelqu’un paie le câble.',
        actions: [
          {
            id: 'reparer',
            label: 'Réparer la cabine avec Hnia',
            text: 'Trois heures de câbles et de graisse. Au dernier palier, la cabine vous lâche au-dessus de l’ennemi : on descend de haut, comme toujours.',
            cost: 1,
            effects: { buff: 'atk', flag: 'tram' },
          },
          {
            id: 'cables',
            label: 'Réquisitionner les câbles',
            text: 'Hnia ne dit rien. Elle note votre nom sur un carnet à spirale, très soigneusement. Le cuivre part dans votre sac.',
            cost: 1,
            effects: { sand: 25, flag: 'cables' },
          },
        ],
      },
      {
        id: 'antichambre',
        name: 'L’antichambre de la Chambre des Heures',
        npc: 'Un greffier sans ruban',
        line: 'La Liste n’est pas une punition. C’est une horloge comme une autre.',
        actions: [
          {
            id: 'liste',
            label: 'Affronter la Liste',
            text: 'Le greffier pousse un formulaire vers vous. Deux cases, une seule encre.',
            cost: 1,
            choices: [
              { label: 'Signer la dérogation', text: 'Votre paraphe vaut un verre de priorité : l’administration, une fois, vous doit quelque chose.', effects: { buff: 'verre', flag: 'signe' } },
              { label: 'Arracher la page de Salem', text: 'Le nom de Salem quitte le registre. Quelque part, un segment de son Nom se soude. Le greffier ne lève même pas les yeux.', effects: { name: 'salem', flag: 'page-arrachee' } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'palier-6',
    title: 'Palier 6 · L’Étage blanc',
    lede: 'Ici, le sable n’est jamais monté : les murs sont blancs, les arches propres, et le silence a un goût de dimanche. C’est l’étage qui ne croit pas au cycle.',
    places: [
      {
        id: 'soufflerie',
        name: 'La soufflerie de Fériel',
        npc: 'Personne. Le four est encore tiède.',
        line: 'Sur le banc, une canne de rechange et un carnet de bulles ratées, datées, signées.',
        actions: [
          {
            id: 'ampoule',
            label: 'Souffler une ampoule de verre',
            text: 'Fériel vous guide la main depuis le carnet : « Plus lent. Le verre sent la peur. » L’ampoule tient. Quelque chose de votre équipe tient aussi.',
            cost: 1,
            effects: { buff: 'verre', flag: 'ampoule' },
          },
          {
            id: 'calcin',
            label: 'Balayer le calcin',
            text: 'Les éclats de verre ratés se revendent au souk comme du sable de première qualité. Personne n’est dupe. Tout le monde est content.',
            cost: 1,
            effects: { sand: 25 },
          },
        ],
      },
      {
        id: 'beffroi',
        name: 'Le beffroi',
        npc: 'Le sonnier sourd',
        line: 'Il ne vous entend pas venir. Il vous regarde venir, c’est tout.',
        actions: [
          {
            id: 'sourdine',
            label: 'Feutrer le tocsin',
            text: 'Vous bourrez le battant de laine et de lin. Au prochain assaut, leurs cloches sonneront comme à travers un mur — et leurs coups avec.',
            cost: 1,
            effects: { buff: 'sourdine', flag: 'feutre' },
          },
          {
            id: 'morts',
            label: 'Sonner pour les disparus',
            text: 'Le vieux sonne neuf coups, un par étage perdu. L’équipe se tient droite. On repart moins lourds.',
            cost: 1,
            effects: { healAll: 0.15, flag: 'memorial' },
          },
        ],
      },
      {
        id: 'bureau',
        name: 'Le bureau de la Liste',
        npc: 'Trois chaises vides, un tampon',
        line: 'Sur le registre, la page du prochain cycle est déjà imprimée. Seule l’encre manque.',
        actions: [
          {
            id: 'page',
            label: 'Trancher devant le registre',
            text: 'Le tampon attend. La page aussi.',
            cost: 1,
            choices: [
              { label: 'Brûler la page du cycle', text: 'Yamina tient la flamme jusqu’au bout des doigts. Au prochain combat, l’administration bafouille : une heure de plus avant que l’Astrolabe ne sonne.', effects: { buff: 'pret', name: 'yamina', flag: 'page-brulee' } },
              { label: 'Tamponner trois laissez-passer', text: 'Des soins de première classe, signés d’une administration qui n’existe plus tout à fait. On prend.', effects: { healAll: 0.2, flag: 'laissez-passer' } },
            ],
          },
        ],
      },
      {
        id: 'terrasse',
        name: 'La terrasse du bord',
        npc: 'Le vent, le sable au loin',
        line: 'D’ici, on voit la dune respirer. Elle est belle. C’est ça le plus difficile.',
        actions: [
          {
            id: 'regarder',
            label: 'Regarder monter le sable',
            text: 'Un quart d’heure à ne rien faire, vraiment rien. Le cœur redescend, les mains s’ouvrent.',
            cost: 1,
            effects: { healAll: 0.1 },
          },
          {
            id: 'souffler',
            label: 'Reprendre son souffle',
            text: 'Assis sur le parapet, l’équipe partage une galette et ne parle de rien d’important. C’est précisément ça, l’important.',
            cost: 0,
            effects: { healAll: 0.05 },
          },
        ],
      },
    ],
  },
];
