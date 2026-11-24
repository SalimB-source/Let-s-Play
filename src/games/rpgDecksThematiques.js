/** Les douze listes bicolores du Sablier, communes aux modes classiques et MOBA.
 * Ce module ne dépend pas du catalogue pour éviter un cycle avec rpgCards. */
const deux = (id) => [id, id];

/** 30 cartes, exactement deux couleurs, deux exemplaires des cartes ordinaires
 * et un seul des cartes d'exception. Le MOBA est sans mana et demande un
 * sacrifice pour les poses lourdes ; les autres modes paient le coût imprimé.
 * Chaque liste garde assez de petites créatures, des soutiens et peu de finisseurs. */
export const RPG_DECKS_THEMATIQUES = Object.freeze([
  Object.freeze({
    id: 'sable', name: 'Éclaireurs des pistes', elements: Object.freeze(['sable', 'neige']),
    description: 'Attaque ciblée et armes légères : protéger les éclaireurs, équiper les meilleurs tireurs et ouvrir la voie.',
    cardIds: Object.freeze([
      ...deux('tislit-des-aures'), ...deux('viking-des-neiges'),
      ...deux('gardienne-des-portes-de-sable'), 'bouchra-guerriere-des-cretes', 'gerboise-des-ruines', ...deux('guerrier-au-bouclier-rond'),
      ...deux('guetteur-du-beffroi'), ...deux('scalde-des-runes'),
      'salem', 'faucon-du-zenith', 'jarl-au-marteau-de-guerre',
      ...deux('javelot-du-beffroi'), ...deux('cuirasse-de-sel'), ...deux('sandales-de-tislit'), 'hache-de-la-banquise',
      ...deux('poigne-de-givre'), ...deux('grand-voile-blanc'), 'festin-des-vaillants', 'festin-des-vaillants',
    ]),
  }),
  Object.freeze({
    id: 'sources', name: 'Gardiennes des citernes', elements: Object.freeze(['neige', 'eau']),
    description: 'Blessures soignées, boucliers et marées : tenir les trois voies, puis épuiser la réponse adverse.',
    cardIds: Object.freeze([
      ...deux('viking-des-neiges'), ...deux('guerrier-au-bouclier-rond'), ...deux('porteuse-de-cruches'),
      ...deux('guetteuse-des-marees'), ...deux('loup-des-neiges'), ...deux('volva-soigneuse'),
      ...deux('veilleuse-des-citernes'), ...deux('sonneur-fele'),
      'jarl-au-marteau-de-guerre', 'tour-des-flots', 'geant-des-banquises',
      'lance-de-givre', 'baton-des-citernes',
      ...deux('eau-de-la-source'), ...deux('ressac'), ...deux('parade-du-verre'),
      ...deux('festin-des-vaillants'), 'poigne-de-givre',
    ]),
  }),
  Object.freeze({
    id: 'sahir', name: 'Meute des braises', elements: Object.freeze(['sable', 'braise']),
    description: 'Djinns rapides et chien de Tarek : Les Djinns et Dune marchante réunissent les matériaux du Colosse du Verre Ardent dans la réserve.',
    cardIds: Object.freeze([
      ...deux('ashigaru-des-braises'), ...deux('ghul-des-cendres'), ...deux('djinn-de-la-premiere-etincelle'),
      ...deux('djinn-de-foudre'), ...deux('djinn-des-braises-voilees'), ...deux('fennec-des-decombres'),
      'sahir-des-braises', 'djinn-du-dernier-brasier', ...deux('djinn-de-la-flamme-mourante'), 'tarek', 'ifrit-des-ergs',
      ...deux('javelot-du-beffroi'), ...deux('dune-marchante'), 'lame-des-ergs',
      ...deux('frappe-iaijutsu'), ...deux('feux-de-kitsune'), ...deux('trait-de-braise'), 'rempart-de-dunes',
    ]),
  }),
  Object.freeze({
    id: 'lionne', name: 'Forge des samouraïs', elements: Object.freeze(['neige', 'braise']),
    description: 'Samouraïs, Harakiri et équipement : Rōnin et Onna-musha permettent aussi l’Ascension du Dragon Rouge depuis la réserve.',
    cardIds: Object.freeze([
      ...deux('ashigaru-des-braises'), ...deux('viking-des-neiges'), ...deux('hatamoto-des-cendres'),
      ...deux('guerrier-au-bouclier-rond'), ...deux('ronin-du-soleil-rouge'), ...deux('kenshi-de-la-forge'),
      ...deux('samourai-du-torii'), 'tengu-du-mont-ardent', 'daimyo-du-soleil-rouge',
      'lionne-du-midi-ardent', 'cavalier-des-deux-sabres', 'tojiro-le-pourfendeur',
      ...deux('hache-de-la-banquise'), 'armure-de-cendres', 'lance-de-givre',
      'serment-de-la-forge', 'trait-de-braise', ...deux('frappe-iaijutsu'), 'grand-voile-blanc', ...deux('onna-musha-des-cendres'),
    ]),
  }),
  Object.freeze({
    id: 'papyrus', name: 'Pesée des tombes', elements: Object.freeze(['neige', 'tenebres']),
    description: 'Morts utiles, Tribut et pioche : convertir les petites pertes en Shabtis, protéger les survivants et peser les voies.',
    cardIds: Object.freeze([
      ...deux('garde-du-voile'), ...deux('ouvrier-du-natron'), ...deux('viking-des-neiges'),
      ...deux('scarabee-du-natron'), ...deux('pretre-de-la-bouche'), ...deux('momie-de-lin'),
      ...deux('veuve-des-urnes'), ...deux('corbeau-de-givre'), ...deux('garde-du-trone-givre'),
      'celle-qui-pese', 'maitre-des-hieroglyphes', 'celui-qui-juge',
      ...deux('khopesh-d-or'), 'lance-de-la-lune-givree',
      ...deux('le-poids'), ...deux('papyrus'), 'effacement-des-faibles', 'poigne-de-givre',
    ]),
  }),
  Object.freeze({
    id: 'vikings', name: 'Drakkars des fjords', elements: Object.freeze(['neige', 'eau']),
    description: 'Compagnie viking et Furie : Guerrier et Gardien ouvrent l’Ascension de la Valkyrie ; Berserk et Jarl préparent celle du Dernier Rempart.',
    cardIds: Object.freeze([
      ...deux('viking-des-neiges'), 'eirik-du-premier-serment', ...deux('gardien-viking-du-fjord'),
      ...deux('berserk-des-trois-hivers'), ...deux('scalde-des-runes'), ...deux('guerrier-au-bouclier-rond'),
      ...deux('valkyrie-au-corbeau'), ...deux('archere-viking-du-givre'),
      ...deux('pilote-de-la-carreira'), 'jarl-au-marteau-de-guerre', 'drakkar-a-tete-de-dragon',
      'le-cavalier-du-ressac-gele',
      ...deux('hache-de-la-banquise'), 'lance-de-givre',
      ...deux('eau-de-la-source'), ...deux('brisure-de-verre'), ...deux('ressac'), 'courant-de-retour',
    ]),
  }),
  Object.freeze({
    id: 'vampires', name: 'Cour du croissant noir', elements: Object.freeze(['sable', 'tenebres']),
    description: 'Résonance vampire et Vol de vie : protéger le Général, infiltrer les voies et renforcer les Vampires avec l’Archonte.',
    cardIds: Object.freeze([
      ...deux('garde-du-voile'), ...deux('porteur-de-la-plume'), ...deux('rodeuse-des-tombes'),
      ...deux('danseuse-des-ombres-de-dune'), ...deux('eclipse-silencieuse'),
      ...deux('sentinelle-des-sables'), ...deux('general-du-croissant-noir'),
      'veilleur-du-dernier-crepuscule', 'porte-etendard-de-leclipse',
      ...deux('gardienne-du-croissant'), 'archonte-du-sablier-noir', 'souverain-de-la-lune-noire',
      ...deux('sabre-du-croissant-noir'), 'khopesh-d-or',
      ...deux('voile-de-la-lune-noire'), ...deux('nom-efface'), ...deux('le-poids'), 'papyrus',
    ]),
  }),
  Object.freeze({
    id: 'corsaires', name: 'Flotte de l’abordage', elements: Object.freeze(['sable', 'eau']),
    description: 'Abordage et Butin : Raïs et le Hollandais volant invoquent l’Amiral des abysses depuis la réserve ; le Cotre permet aussi l’Ascension du Serpent.',
    cardIds: Object.freeze([
      ...deux('mousse-des-galiotes'), ...deux('pilote-de-la-carreira'), ...deux('negociant-des-ranscons'),
      ...deux('rais-de-la-galiote'), ...deux('cotre-de-course'), ...deux('le-renegat'),
      ...deux('guetteuse-des-marees'), ...deux('galion-de-la-flotte'),
      ...deux('la-vengeance-de-la-reine-anne'), 'la-barbe-rousse', 'le-chasseur-d-ocracoke',
      ...deux('grappin-d-abordage'), 'sphere-de-rotation',
      ...deux('eau-de-la-source'), ...deux('parade-du-verre'), 'brisure-de-verre', 'brisure-de-verre', 'ressac',
    ]),
  }),
  Object.freeze({
    id: 'ascension-eclipse', name: 'Rite de l’Éclipse', elements: Object.freeze(['sable', 'tenebres']),
    boxArt: 'scorpion-de-l-eclipse',
    description: 'Ascension du Scorpion : Scorpion du seuil, Uræus du seuil et Momie de lin. Le Convoi prépare les matériaux.',
    cardIds: Object.freeze([
      ...deux('scorpion-du-seuil'), ...deux('convoi-des-dunes'),
      ...deux('garde-du-voile'), ...deux('porteur-de-la-plume'),
      ...deux('ureus-du-seuil'), ...deux('momie-de-lin'), ...deux('veuve-des-urnes'),
      ...deux('nom-efface'), 'gardienne-des-sables-ensevelis',
      ...deux('voile-de-la-lune-noire'), 'javelot-du-beffroi', ...deux('gardien-des-sept-sceaux'),
      'lecteur-du-dernier-nom', 'celle-qui-pese',
      ...deux('le-poids'), ...deux('effacement-des-faibles'), ...deux('papyrus'),
    ]),
  }),
  Object.freeze({
    id: 'ascension-verre', name: 'Forge du Verre Ardent', elements: Object.freeze(['braise', 'sable']),
    boxArt: 'colosse-du-verre-ardent',
    description: 'Ascension du Colosse : Djinn de la première étincelle, Djinn de la flamme mourante et Dune marchante. Leur invocation prépare le rituel.',
    cardIds: Object.freeze([
      ...deux('djinn-de-la-premiere-etincelle'), ...deux('ghul-des-cendres'),
      ...deux('djinn-de-la-flamme-mourante'), ...deux('djinn-de-la-fleche-ardente'),
      ...deux('dune-marchante'), ...deux('feux-de-kitsune'), ...deux('brise-lame'),
      ...deux('fennec-des-decombres'), ...deux('djinn-de-foudre'),
      'sahir-des-braises', 'djinn-des-cendres-vengeresses', 'tarek', 'ifrit-des-ergs',
      ...deux('trait-de-braise'), 'serment-de-la-forge', 'rempart-de-dunes', ...deux('frappe-iaijutsu'), 'armure-de-cendres', 'braise-et-sable',
    ]),
  }),
  Object.freeze({
    id: 'ascension-dragon', name: 'Éveil du Dragon Rouge', elements: Object.freeze(['braise', 'sable']),
    boxArt: 'samourai-du-dragon-rouge',
    description: 'Ascension du Dragon : Rōnin du Soleil rouge et Onna-musha des cendres. Le Convoi et la Gardienne préparent les matériaux.',
    cardIds: Object.freeze([
      ...deux('ashigaru-des-braises'), ...deux('hatamoto-des-cendres'),
      ...deux('ronin-du-soleil-rouge'), ...deux('kenshi-de-la-forge'),
      ...deux('onna-musha-des-cendres'), ...deux('samourai-du-torii'),
      ...deux('convoi-des-dunes'), 'scarabee-des-sceaux', 'gardienne-des-sables-ensevelis', ...deux('tiziri-du-djurdjura'),
      'daimyo-du-soleil-rouge', 'tojiro-le-pourfendeur',
      ...deux('feux-de-kitsune'), ...deux('brise-lame'), ...deux('frappe-iaijutsu'),
      ...deux('rempart-de-dunes'), 'trait-de-braise', 'armure-de-cendres',
    ]),
  }),
  Object.freeze({
    id: 'ascension-rempart', name: 'Serment du Dernier Rempart', elements: Object.freeze(['neige', 'tenebres']),
    boxArt: 'jarl-du-dernier-rempart',
    description: 'Ascensions du Jarl et de la Valkyrie : leurs quatre matériaux nommés sont présents. La Valkyrie au corbeau aide à les réunir.',
    cardIds: Object.freeze([
      ...deux('viking-des-neiges'), ...deux('guerrier-au-bouclier-rond'),
      ...deux('gardien-viking-du-fjord'), ...deux('garde-du-trone-givre'), ...deux('veilleuse-de-la-lune-givree'),
      ...deux('berserk-des-trois-hivers'), 'volva-soigneuse', ...deux('valkyrie-au-corbeau'),
      ...deux('jarl-au-marteau-de-guerre'), ...deux('valkyrie-des-neuf-nuits'),
      ...deux('nom-efface'), ...deux('papyrus'), ...deux('poigne-de-givre'),
      ...deux('festin-des-vaillants'), 'lance-de-la-lune-givree', 'grand-voile-blanc', 'eclair-du-marteau',
    ]),
  }),
]);
