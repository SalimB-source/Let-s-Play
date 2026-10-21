/**
 * Les Lettres de Marque — le set Piraterie du Sablier (hybride Sable + Eau).
 *
 * Inspiration : l’âge de la course (XVIe–XVIIe) — convois espagnols et
 * portugais, corsaires anglais et barbaresques, et la maison algérienne de la
 * Régence d’Alger. Identité de jeu : l’**Abordage** (prendre sans tuer), la
 * **Cale** (détenir, face visible — on ne rend une prise qu’en faisant quitter
 * la table au capteur) et la **Cargaison** (le convoi assuré). Jamais de
 * dégâts nus (règle de direction §11 du doc 17) : la course prend, elle ne
 * brûle pas.
 *
 * Le moteur lit quatre nouveaux marqueurs de fiche :
 *   - `abordage: N` — QUAND la créature arrive en jeu, la créature adverse
 *     ciblée de coût N ou moins est prise en sa cale au lieu d’être détruite
 *     (moteur : `rpgJouerCreature` → `prendreEnCale`) ; le seuil imprimé suit
 *     le barème « coût du capteur − 1 » ;
 *   - `cargaison: N` — quand cette créature meurt **ou** est prise en cale,
 *     son propriétaire pioche N cartes ;
 *   - `declenchePrise: 1` — quand une créature est prise en cale, le
 *     contrôleur de celle-ci pioche une carte (le Négociant) ;
 *   - `destruction: { type: 'renvoi-tueur' }` — morte en combat, la créature
 *     renvoie l’un de ses tueurs en main (Le Brûlot — la mort par magie ne
 *     déclenche rien, le tueur de combat seul est connu).
 *
 * Et cinq contrats d’effet étendus : `arriveesAbordage: true` sur un effet
 * (la Lettre de marque en propre) drape `camp.abordageDesArrivees` — jusqu’à
 * la fin du tour, chaque créature que le camp joue accoste avec Abordage au
 * seuil « coût − 1 » —, l’arrivée `prochaine-arrivee-abordage` (le Pilote de
 * la Carreira) drape `camp.prochaineArriveeAbordage` pour la **seule**
 * prochaine créature jouée ce tour, `caleOccupeeSeulement: true` sur un buff
 * (le Grand Débarquement : seules les créatures qui détiennent une prise en
 * cale sont renforcées), et sur une arme `coutPorteur` + `abordageDynamique`
 * (le Grappin : le porteur coûte +1 tant qu’il est attaché, puis active à
 * l’attachement un Abordage au seuil de son coût augmenté − 1) avec
 * `priseEnCale` (la prime de soins du Grappin).
 *
 * Et le marqueur du Chasseur d’Ocracoke :
 *   - `traquePirates: N` — la Traque : quand le Chasseur attaque une créature
 *     avec Abordage, Butin ou une cale occupée, il gagne +N/+0 contre elle
 *     pour ce combat (Coup rapide, combat bloqué et duel de créatures —
 *     jamais contre le sorcier) ; sa Prime (`primeChasseur`) paie en sus la
 *     destruction d’une telle proie.
 *
 * Deux marqueurs de plus pour La Barbe Noire (la carte du dédoublement) :
 *   - `alternance: { visages: [...] }` — Les Deux Visages : elle arrive sous
 *     le visage imprimé (index 0), puis change au début de chaque tour de son
 *     camp (`changerVisages`, appelé par `rpgFinDeTour`) — l’homme 2/7 avec
 *     Provocation, la légende 6/2, les blessures suivant d’un visage à l’autre ;
 *   - `insaisissable: true` — Le dédoublement : la cale adverse ne la prend
 *     jamais (filtre `priseEnCaleLegale`, garde `prendreEnCale`).
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
  typeLine: 'Créature-jeton — Corsaire',
  text: '—',
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
    abordage: 1,
    typeLine: 'Créature — Humain · Raïs',
    text: 'Abordage 1 — quand le Raïs arrive en jeu, la créature adverse ciblée de coût 1 ou moins est prise en sa cale (face visible) : elle ne déclenche rien. La cale s’ouvre quand le Raïs quitte la table : détruit, il rend la détenue EN JEU, avec l’attaque et la défense qu’elle avait à la prise et sans effet d’arrivée ; exilé ou renvoyé en main, il la rend en main.',
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
    arrivee: { type: 'prochaine-arrivee-abordage' },
    typeLine: 'Créature — Humain · Pilote',
    text: 'Quand le Pilote arrive : la prochaine créature que vous jouez ce tour a Abordage — au seuil de son coût moins un.',
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
    atk: 1,
    def: 4,
    rarity: 'commune',
    coupRapide: true,
    typeLine: 'Créature — Humain · Tercio',
    text: 'Coup rapide — quand il est sélectionné pour attaquer, il peut frapper une créature adverse de votre choix avant le combat (25 % de chances de rater ; il touche à 100 % contre l’adversaire) : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là.',
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
    abordage: 2,
    typeLine: 'Créature — Navire · Cotre',
    text: 'Rapidité — Peut attaquer le tour où il arrive. Abordage 2 — quand le Cotre arrive en jeu, la créature adverse ciblée de coût 2 ou moins est prise en sa cale : elle ne déclenche rien.',
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
    name: 'Négociant des prises',
    cost: 3,
    atk: 2,
    def: 3,
    rarity: 'rare',
    declenchePrise: 1,
    typeLine: 'Créature — Humain · Négociant',
    text: 'Chaque fois qu’une créature est prise en cale, piochez une carte.',
    flavor: 'Il ne vend pas les captifs. Il vend la signature qui les rend.',
  }),
  carte({
    id: 'galion-de-la-flotte',
    name: 'Galion de la flotte',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 5,
    atk: 2,
    def: 5,
    rarity: 'rare',
    coupRapide: true,
    abordage: 4,
    cargaison: 2,
    typeLine: 'Créature — Navire · Galion',
    text: 'Coup rapide — quand il est sélectionné pour attaquer, il peut frapper une créature adverse de votre choix avant le combat (25 % de chances de rater ; il touche à 100 % contre l’adversaire) : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Abordage 4 — quand le Galion arrive en jeu, la créature adverse ciblée de coût 4 ou moins est prise en sa cale : elle ne déclenche rien. Cargaison 2 — Quand le Galion meurt ou est pris en cale, piochez deux cartes.',
    flavor: 'L’argent voyage en convoi ; le roi voyage en prière.',
  }),
  // L’identifiant historique demeure (collections et decks sauvegardés) :
  // la carte jadis nommée « La Vengeance de la reine Anne » est devenue le
  // vaisseau fantôme bleu translucent de la légende.
  carte({
    id: 'la-vengeance-de-la-reine-anne',
    name: 'La légende du Hollandais volant',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 4,
    atk: 2,
    def: 4,
    rarity: 'rare',
    coupRapide: true,
    abordage: 3,
    caleComble: { atk: 2, butin: true },
    typeLine: 'Créature légendaire — Navire · Vaisseau fantôme',
    text: 'Coup rapide — quand il est sélectionné pour attaquer, il peut frapper une créature adverse de votre choix avant le combat (25 % de chances de rater ; il touche à 100 % contre l’adversaire) : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Abordage 3 — quand le Hollandais arrive en jeu, la créature adverse ciblée de coût 3 ou moins est prise en sa cale. Tant que sa cale est occupée, le Hollandais gagne +2/+0 et Butin.',
    flavor: 'Il ne cherche plus un port : il embarque ceux que la mer a oublié de rendre.',
  }),
  carte({
    id: 'le-chasseur-d-ocracoke',
    name: 'Le Chasseur d’Ocracoke',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 6,
    atk: 3,
    def: 6,
    rarity: 'mythique',
    rapidite: true,
    coupRapide: true,
    traquePirates: 3,
    primeChasseur: true,
    typeLine: 'Créature légendaire — Humain · Chasseur de pirates',
    text: 'Rapidité. Coup rapide — quand il frappe une créature avant le combat, il a 25 % de chances de rater ; il touche à 100 % contre l’adversaire. Traque — quand le Chasseur attaque une créature avec Abordage, Butin ou une cale occupée, il gagne +3/+0 contre elle pour ce combat. Prime — quand le Chasseur détruit une créature avec Abordage, Butin ou une cale occupée, piochez une carte.',
    flavor: 'Dans les brumes d’Ocracoke, il reconnaît un pirate au silence qui précède son tir.',
  }),
  carte({
    id: 'source-de-bimini',
    name: 'La Source de Bimini',
    kind: 'site',
    element: 'eau',
    colors: ['eau', 'sable'],
    colorCost: { eau: 1, sable: 1 },
    cost: 3,
    atk: 0,
    def: 1,
    rarity: 'mythique',
    site: {
      compteurs: 3,
      recompense: 'bimini',
      arts: {
        3: 'source-de-bimini',
        2: 'source-de-bimini-2',
        1: 'source-de-bimini-1',
        0: 'source-de-bimini-0',
      },
    },
    typeLine: 'Site légendaire — Grotte · Trésor',
    text: 'Indestructible. La Source occupe un emplacement du champ et arrive avec 3 compteurs d’Heures. Au début de chacun de vos tours, retirez-en un et avancez dans la grotte. Quand le dernier est retiré, choisissez une créature alliée : soignez-la complètement ; elle gagne définitivement +3/+3, Protection contre les sorts et Tenacité.',
    flavor: 'Trois seuils sous la pierre, puis une eau que même le temps n’a jamais troublée.',
  }),
  carte({
    id: 'le-tresor-de-lima',
    name: 'Le Trésor de Lima',
    kind: 'site',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 2,
    atk: 0,
    def: 1,
    rarity: 'rare',
    site: {
      compteurs: 2,
      recompense: 'pioche',
      pioche: 2,
      arts: {
        2: 'le-tresor-de-lima',
        1: 'le-tresor-de-lima-1',
        0: 'le-tresor-de-lima-0',
      },
    },
    typeLine: 'Site légendaire — Trésor enfoui',
    text: 'Indestructible. Le Trésor occupe un emplacement du champ et arrive avec 2 compteurs d’Heures. Au début de chacun de vos tours, retirez-en un et révélez une nouvelle étape de la fouille. Quand le dernier est retiré, piochez deux cartes.',
    flavor: 'On trouva d’abord les chaînes, puis la pierre creuse. L’or attendait plus bas.',
  }),
  carte({
    id: 'la-barbe-rousse',
    name: 'La Barbe-Rousse, amiral des deux mers',
    element: 'sable',
    colors: ['sable', 'eau'],
    colorCost: { sable: 1, eau: 1 },
    cost: 6,
    atk: 4,
    def: 5,
    rarity: 'mythique',
    abordage: 5,
    arrivee: { type: 'jetons', jeton: 'corsaire', nombre: 2 },
    typeLine: 'Créature légendaire — Amiral des deux mers',
    text: 'Abordage 5 — quand La Barbe-Rousse arrive en jeu, la créature adverse ciblée de coût 5 ou moins est prise en sa cale : elle ne déclenche rien. Quand La Barbe-Rousse arrive : créez deux jetons Corsaire 2/1.',
    flavor: 'Alger lui doit ses remparts ; les deux mers lui doivent le reste.',
  }),
  // La Barbe Noire est une carte 100 % Ténèbres : née dans le set Piraterie
  // (son Abordage, sa cale), elle se paie en mana de Ténèbres et se joue dans
  // les decks dont l’identité inclut les Ténèbres — plus dans les paquets
  // Sable + Eau des Lettres de Marque (voir le portillon de `rpgDeckComposer`).
  carte({
    id: 'la-barbe-noire',
    name: 'La Barbe Noire, les deux visages',
    element: 'tenebres',
    colors: ['tenebres'],
    colorCost: { tenebres: 1 },
    cost: 5,
    atk: 2,
    def: 7,
    rarity: 'mythique',
    provocation: true,
    abordage: 4,
    insaisissable: true,
    alternance: {
      visages: [
        { nom: 'l’homme', atk: 2, def: 7, provocation: true },
        { nom: 'la légende', atk: 6, def: 2 },
      ],
    },
    typeLine: 'Créature légendaire — Pirate · Terreur',
    text: 'Abordage 4 — quand La Barbe Noire arrive en jeu, la créature adverse ciblée de coût 4 ou moins est prise en sa cale : elle ne déclenche rien. Deux Visages — elle arrive en jeu sous le visage de l’homme (2/7 avec Provocation) ; au début de chacun de vos tours, elle change : l’homme 2/7 avec Provocation, ou la légende 6/2 — ses blessures la suivent d’un visage à l’autre. Le dédoublement — Barbe Noire ne peut pas être prise en cale : on emporte un visage, l’autre reste.',
    flavor: 'Thatch comptait les rançons au sou près ; la chose qui brûlait dans sa barbe n’a jamais rien compté.',
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
    effet: { type: 'arrivees-abordage' },
    text: 'Jusqu’à la fin du tour, vos créatures qui arrivent en jeu ont Abordage — chacune au seuil de son coût moins un.',
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
    effet: { type: 'buff', atk: 2, def: 2, overkill: true, caleOccupeeSeulement: true, cible: 'toutes-alliees', tours: 1 },
    text: 'Jusqu’à la fin du tour, chacune de vos créatures qui détient une créature en sa cale gagne +2/+2 et Overkill.',
    flavor: 'Ce jour-là, tout le quai monta à l’assaut — jusqu’aux lapins de la cale.',
  }),
];

export const RPG_LETTRES_DE_MARQUE_ARMES = [
  carte({
    id: 'grappin-d-abordage',
    name: 'Grappin d’abordage',
    kind: 'arme',
    cost: 4,
    rarity: 'rare',
    typeLine: 'Arme — Grappin',
    bonus: { atk: 1, def: 1 },
    coutPorteur: 1,
    abordageDynamique: true,
    priseEnCale: { type: 'soin', amount: 2 },
    text: 'Arme — Le porteur gagne +1/+1, et son coût augmente de 1 tant que le Grappin est attaché. Quand le Grappin s’attache, le porteur active Abordage X, où X vaut son coût augmenté moins un : choisissez une créature adverse de coût X ou moins, elle est prise en sa cale. Quand le porteur prend une créature en cale, vous gagnez 2 PV.',
    flavor: 'Trois dents de fer, et la mer devient un couloir.',
  }),
];
