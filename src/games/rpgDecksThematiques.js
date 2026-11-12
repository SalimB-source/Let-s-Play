/** Les huit listes bicolores du Sablier, communes aux modes classiques et MOBA.
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
      ...deux('poigne-de-givre'), ...deux('brume-du-fjord'), 'defi-du-jarl', 'festin-des-vaillants',
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
    description: 'Djinns rapides et chiens de Tarek : attaquer tôt, piocher avec Sahir et finir avec des armes ou le feu.',
    cardIds: Object.freeze([
      ...deux('ashigaru-des-braises'), ...deux('ghul-des-cendres'), ...deux('djinn-de-la-premiere-etincelle'),
      ...deux('djinn-de-foudre'), ...deux('djinn-des-braises-voilees'), ...deux('fennec-des-decombres'),
      'sahir-des-braises', 'djinn-du-dernier-brasier', ...deux('djinn-de-la-flamme-mourante'), 'tarek', 'ifrit-des-ergs',
      ...deux('javelot-du-beffroi'), ...deux('braise-et-sable'), 'lame-des-ergs',
      ...deux('frappe-iaijutsu'), ...deux('vent-rouge'), ...deux('trait-de-braise'), 'rempart-de-dunes',
    ]),
  }),
  Object.freeze({
    id: 'lionne', name: 'Forge des samouraïs', elements: Object.freeze(['neige', 'braise']),
    description: 'Samouraïs, Harakiri et équipement : tenir avec les boucliers, déclencher le Serment et le Cavalier armé.',
    cardIds: Object.freeze([
      ...deux('ashigaru-des-braises'), ...deux('viking-des-neiges'), ...deux('hatamoto-des-cendres'),
      ...deux('guerrier-au-bouclier-rond'), ...deux('ronin-du-soleil-rouge'), ...deux('kenshi-de-la-forge'),
      ...deux('samourai-du-torii'), 'tengu-du-mont-ardent', 'daimyo-du-soleil-rouge',
      'lionne-du-midi-ardent', 'cavalier-des-deux-sabres', 'tojiro-le-pourfendeur',
      ...deux('hache-de-la-banquise'), 'armure-de-cendres', 'lance-de-givre',
      'serment-de-la-forge', 'mur-de-boucliers', ...deux('frappe-iaijutsu'), 'defi-du-jarl', ...deux('trait-de-braise'),
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
      ...deux('offrande-de-lin'), ...deux('papyrus'), 'effacement-des-faibles', 'poigne-de-givre',
    ]),
  }),
  Object.freeze({
    id: 'vikings', name: 'Drakkars des fjords', elements: Object.freeze(['neige', 'eau']),
    description: 'Compagnie viking et Furie : Eirik rassemble les guerriers, la Valkyrie cherche les renforts et les marées dégagent leurs voies.',
    cardIds: Object.freeze([
      ...deux('viking-des-neiges'), 'eirik-du-premier-serment', ...deux('gardien-viking-du-fjord'),
      ...deux('berserk-des-trois-hivers'), ...deux('scalde-des-runes'), ...deux('guetteuse-des-marees'),
      ...deux('valkyrie-au-corbeau'), ...deux('archere-viking-du-givre'),
      ...deux('pilote-de-la-carreira'), 'jarl-au-marteau-de-guerre', 'drakkar-a-tete-de-dragon',
      'le-cavalier-du-ressac-gele',
      ...deux('hache-de-la-banquise'), 'lance-de-givre',
      ...deux('brume-du-fjord'), ...deux('hurlement-du-blizzard'), ...deux('ressac'), 'courant-de-retour',
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
      ...deux('voile-de-la-lune-noire'), ...deux('nom-efface'), ...deux('le-poids'), 'reanimation',
    ]),
  }),
  Object.freeze({
    id: 'corsaires', name: 'Flotte de l’abordage', elements: Object.freeze(['sable', 'eau']),
    description: 'Abordage et Butin : remplir les cales, piocher avec la Lettre de marque et lancer le Grand Débarquement.',
    cardIds: Object.freeze([
      ...deux('mousse-des-galiotes'), ...deux('pilote-de-la-carreira'), ...deux('negociant-des-ranscons'),
      ...deux('rais-de-la-galiote'), ...deux('cotre-de-course'), ...deux('le-renegat'),
      ...deux('guetteuse-des-marees'), ...deux('galion-de-la-flotte'),
      ...deux('la-vengeance-de-la-reine-anne'), 'la-barbe-rousse', 'le-chasseur-d-ocracoke',
      ...deux('grappin-d-abordage'), 'sphere-de-rotation',
      ...deux('lettre-de-marque'), ...deux('le-grand-debarquement'), ...deux('le-routier'), 'ressac',
    ]),
  }),
]);
