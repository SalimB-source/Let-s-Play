/**
 * Les Lettres de Marque — le set Piraterie du Sablier (hybride Sable + Eau).
 *
 * Inspiration : l’âge de la course (XVIe–XVIIe) — convois espagnols et
 * portugais, corsaires anglais et barbaresques, et la maison algérienne de la
 * Régence d’Alger. Identité de jeu : l’**Abordage** (prendre sans tuer), la
 * **Cale** (détenir, face visible), la **Rançon** (racheter au prix imprimé)
 * et la **Cargaison** (le convoi assuré). Jamais de dégâts nus (règle de
 * direction §11 du doc 17) : la course prend, elle ne brûle pas.
 *
 * Le moteur lit quatre nouveaux marqueurs de fiche :
 *   - `abordage: true` — les blessures de **combat** que cette créature
 *     inflige prennent la victime en cale au lieu de la détruire (moteur :
 *     `prendreEnCale`, dans `appliquerDegatsDeCombatSimultanes`) ;
 *   - `cargaison: N` — quand cette créature meurt **ou** est prise en cale,
 *     son propriétaire pioche N cartes ;
 *   - `declencheRancon: 1` — quand une créature est rançonnée, le contrôleur
 *     de celle-ci pioche une carte (le Négociant) ;
 *   - `destruction: { type: 'renvoi-tueur' }` — morte en combat, la créature
 *     renvoie l’un de ses tueurs en main (Le Brûlot — la mort par magie ne
 *     déclenche rien, le tueur de combat seul est connu).
 *
 * Et deux contrats d’effet étendus : `donne: { abordage: true }` sur une arme
 * (chemin `donne` existant du Khopesh) et sur un buff d’équipe (Lettre de
 * marque, Le Grand Débarquement), plus `priseEnCale` sur une arme (le Grappin).
 */

export const RPG_LETTRES_DE_MARQUE_SET_ID = 'lettres-de-marque';

const carte = (definition) => ({
  ...definition,
  element: definition.element ?? 'sable',
  set: RPG_LETTRES_DE_MARQUE_SET_ID,
  art: definition.id,
});

/** Le Corsaire : l’équipage débarqué par La Barbe-Rousse. */
export const RPG_LETTRES_DE_MARQUE_JETONS = [{
  id: 'corsaire',
  name: 'Corsaire',
  pluriel: 'corsaires',
  kind: 'creature',
  jeton: true,
  element: 'sable',
  colors: ['sable', 'eau'],
  set: RPG_LETTRES_DE_MARQUE_SET_ID,
  art: 'corsaire',
  cost: 0,
  atk: 2,
  def: 1,
  rarity: 'commune',
  abordage: true,
  typeLine: 'Créature-jeton — Corsaire',
  text: 'Abordage — ses blessures de combat prennent la créature adverse vaincue en cale au lieu de la détruire.',
  flavor: 'Il a signé d’une croix ; la mer a contresigné.',
}];

export const RPG_LETTRES_DE_MARQUE_CREATURES = [
  carte({
    id: 'mousse-des-galiotes',
    name: 'Mousse des galiotes',
    cost: 1,
    atk: 1,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Humain · Mousse',
    text: '—',
    flavor: 'Il ne sait pas encore signer. Il sait déjà hisser.',
  }),
  carte({
    id: 'rais-de-la-galiote',
    name: 'Raïs de la galiote',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    abordage: true,
    typeLine: 'Créature — Humain · Raïs',
    text: 'Abordage — quand le Raïs inflige des blessures de combat qui détruiraient une créature adverse, celle-ci est prise en cale (face visible, sous le Raïs) au lieu d’être détruite : elle ne déclenche rien. Rançon — son propriétaire peut la reprendre en main en payant son coût en manas, à tout moment où il pourrait jouer une Magie Rapide. La cale s’ouvre quand le Raïs quitte la table.',
    flavor: 'Il ne coule jamais ce qu’il peut vendre.',
  }),
  carte({
    id: 'pilote-de-la-carreira',
    name: 'Pilote de la Carreira',
    element: 'eau',
    cost: 2,
    atk: 1,
    def: 3,
    rarity: 'inhabituelle',
    arrivee: { type: 'donne', cible: 'allie', donne: { envol: true }, tours: 1 },
    typeLine: 'Créature — Humain · Pilote',
    text: 'Quand le Pilote arrive : une créature alliée ciblée gagne Envol jusqu’à la fin du tour.',
    flavor: 'Il a lu le routier une seule fois ; la mer n’a gardé que lui.',
  }),
  carte({
    id: 'le-brulot',
    name: 'Le Brûlot',
    element: 'eau',
    cost: 2,
    atk: 1,
    def: 1,
    rarity: 'commune',
    destruction: { type: 'renvoi-tueur' },
    typeLine: 'Créature — Navire · Brûlot',
    text: 'Quand Le Brûlot meurt en combat, la créature qui l’a détruit est renvoyée dans la main de son propriétaire.',
    flavor: 'Une voile, une mèche, une promesse.',
  }),
  carte({
    id: 'tercio-de-cuivre',
    name: 'Tercio de cuivre',
    cost: 3,
    atk: 2,
    def: 4,
    rarity: 'commune',
    typeLine: 'Créature — Humain · Tercio',
    text: '—',
    flavor: 'Personne n’aboie sur un pont de cuivre.',
  }),
  carte({
    id: 'cotre-de-course',
    name: 'Cotre de course',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 3,
    atk: 3,
    def: 1,
    rarity: 'inhabituelle',
    rapidite: true,
    abordage: true,
    typeLine: 'Créature — Navire · Cotre',
    text: 'Rapidité — Peut attaquer le tour où il arrive. Abordage — ses blessures de combat prennent la créature adverse vaincue en cale au lieu de la détruire.',
    flavor: 'Deux voiles latines, une seule promesse : personne ne le rattrape.',
  }),
  carte({
    id: 'le-renegat',
    name: 'Le Renégat',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 3,
    atk: 3,
    def: 2,
    rarity: 'inhabituelle',
    rapidite: true,
    butin: true,
    typeLine: 'Créature — Humain · Corsaire',
    text: 'Rapidité — Peut attaquer le tour où il arrive. Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez une carte.',
    flavor: 'Deux pavillons l’ont porté ; aucun ne le réclame.',
  }),
  carte({
    id: 'negociant-des-ranscons',
    name: 'Négociant des rançons',
    cost: 3,
    atk: 2,
    def: 3,
    rarity: 'rare',
    declencheRancon: 1,
    typeLine: 'Créature — Humain · Négociant',
    text: 'Chaque fois qu’une créature est rançonnée, piochez une carte.',
    flavor: 'Il ne vend pas les captifs. Il vend la signature qui les rend.',
  }),
  carte({
    id: 'galion-de-la-flotte',
    name: 'Galion de la flotte',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 5,
    atk: 3,
    def: 6,
    rarity: 'rare',
    cargaison: 2,
    typeLine: 'Créature — Navire · Galion',
    text: 'Cargaison 2 — Quand le Galion meurt ou est pris en cale, piochez deux cartes.',
    flavor: 'L’argent voyage en convoi ; le roi voyage en prière.',
  }),
  carte({
    id: 'la-barbe-rousse',
    name: 'La Barbe-Rousse, amirale des deux mers',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 6,
    atk: 4,
    def: 5,
    rarity: 'mythique',
    abordage: true,
    arrivee: { type: 'jetons', jeton: 'corsaire', nombre: 2 },
    typeLine: 'Créature légendaire — Amirale des deux mers',
    text: 'Abordage — ses blessures de combat prennent la créature adverse vaincue en cale au lieu de la détruire. Quand La Barbe-Rousse arrive : créez deux jetons Corsaire 2/1 avec Abordage.',
    flavor: 'Alger lui doit ses remparts ; les deux mers lui doivent le reste.',
  }),
];

export const RPG_LETTRES_DE_MARQUE_MAGIES = [
  carte({
    id: 'lettre-de-marque',
    name: 'Lettre de marque',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    kind: 'magie',
    cost: 2,
    rarity: 'commune',
    typeLine: 'Sorcellerie — Chancellerie · Sable + Eau',
    cibles: ['soi'],
    effet: { type: 'donne', donne: { abordage: true }, cible: 'toutes-alliees', tours: 1 },
    text: 'Jusqu’à la fin du tour, toutes vos créatures gagnent Abordage.',
    flavor: 'Le sceau de la Chambre change un pillard en officier — le temps d’un assaut.',
  }),
  carte({
    id: 'haut-fond',
    name: 'Haut-fond',
    element: 'eau',
    kind: 'magie',
    cost: 1,
    rarity: 'commune',
    instant: true,
    typeLine: 'Magie Rapide — Eau',
    cibles: ['creature'],
    effet: { type: 'debuff', atk: -1, def: -2, tours: 1 },
    text: 'La créature adverse ciblée gagne -1/-2 jusqu’à la fin du tour.',
    flavor: 'Le pilote connaît le sable sous la vague ; la vague, elle, ne prévient pas.',
  }),
  carte({
    id: 'le-routier',
    name: 'Le Routier',
    element: 'eau',
    kind: 'magie',
    cost: 3,
    rarity: 'inhabituelle',
    typeLine: 'Sorcellerie — Carte marine · Eau',
    cibles: ['soi'],
    effet: { type: 'pioche-defausse', pioche: 2, defausse: 1 },
    text: 'Piochez deux cartes, puis défaussez une carte.',
    flavor: 'Les routes de la mer se copient à la main, jamais à l’imprimé.',
  }),
  carte({
    id: 'le-grand-debarquement',
    name: 'Le Grand Débarquement',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    kind: 'magie',
    cost: 5,
    rarity: 'rare',
    typeLine: 'Sorcellerie — Assaut · Sable + Eau',
    cibles: ['soi'],
    effet: { type: 'buff', atk: 1, def: 0, donne: { abordage: true }, cible: 'toutes-alliees', tours: 1 },
    text: 'Jusqu’à la fin du tour, vos créatures gagnent +1/+0 et Abordage.',
    flavor: 'Ce jour-là, tout le quai monta à l’assaut — jusqu’aux lapins de la cale.',
  }),
];

export const RPG_LETTRES_DE_MARQUE_ARMES = [
  carte({
    id: 'grappin-d-abordage',
    name: 'Grappin d’abordage',
    kind: 'arme',
    cost: 2,
    rarity: 'rare',
    typeLine: 'Arme — Grappin',
    bonus: { atk: 1, def: 1 },
    donne: { abordage: true },
    priseEnCale: { type: 'soin', amount: 2 },
    text: 'Arme — Le porteur gagne +1/+1 et Abordage. Quand le porteur prend une créature en cale, vous gagnez 2 PV.',
    flavor: 'Trois dents de fer, et la mer devient un couloir.',
  }),
];
