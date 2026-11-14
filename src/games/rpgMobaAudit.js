// Shared catalogue gate for the adapter and automatic MOBA returns.
// Keep this dependency-free so the duel engine can enforce the same audit.
export const MOBA_ABORDAGE_IMPRIME = Object.freeze(['rais-de-la-galiote', 'cotre-de-course', 'galion-de-la-flotte', 'la-vengeance-de-la-reine-anne', 'la-barbe-noire', 'la-barbe-rousse']);
export const MOBA_SITES_AUDITES = Object.freeze(['le-tresor-de-lima', 'source-de-bimini']);
export const MOBA_TOURS_AUDITEES = Object.freeze(['tour-de-braise', 'tour-des-flots', 'tour-de-sable', 'tour-de-neige', 'tour-des-tenebres']);
export const CARTES_COMBAT_AUDITEES = new Set([
  ...MOBA_TOURS_AUDITEES, ...MOBA_SITES_AUDITES,
  'gardienne-des-derniers-noms', 'veilleur-des-cendres', 'samourai-du-dragon-rouge', 'jarl-du-dernier-rempart', 'scorpion-de-l-eclipse', 'colosse-du-verre-ardent', 'convoi-des-dunes',
  'tojiro-le-pourfendeur', 'sanguinaire-des-dunes', 'gardienne-du-croissant', 'porte-etendard-de-leclipse', 'sorcier-du-ressac-noir', 'garde-du-trone-givre', 'eclipse-silencieuse', 'veilleuse-de-la-lune-givree', 'sentinelle-des-sables', 'traqueur-des-nuits-sans-lune',
  'passeur-au-masque-de-chacal', 'guetteuse-des-marees', 'djinn-des-cendres-vengeresses', 'scarabee-du-natron', 'lecteur-du-dernier-nom', 'general-du-croissant-noir', 'fleau-de-la-lune-noire', 'souverain-de-la-lune-noire',
  'messagere-des-cendres', 'garde-du-voile', 'rodeuse-des-tombes', 'gerboise-des-ruines', 'gardien-des-sept-sceaux',
  'veuve-des-urnes', 'porteur-de-la-plume', 'scarabee-des-sceaux', 'scorpion-du-seuil', 'manticore-des-dunes', 'vampire-des-braises',
  'novice-des-cendres', 'chasseuse-de-braise', 'sentinelle-du-brasier', 'danseuse-des-ombres-de-dune', 'veilleur-du-dernier-crepuscule', 'archonte-du-sablier-noir',
  'ashigaru-des-braises', 'mousse-des-galiotes', 'viking-des-neiges', 'eirik-du-premier-serment', 'pourfendeur-des-djinns', 'ghul-des-cendres', 'chercheuse-des-armes-ensevelies', 'salem', 'kusayla-roi-des-imazighen', 'dame-aux-ailes-d-or',
  'gardienne-des-portes-de-sable', 'gardien-viking-du-fjord',
  'loup-des-neiges', 'berserk-des-trois-hivers', 'jarl-au-marteau-de-guerre',
  'anqa-des-braises', 'porteuse-de-cruches', 'sahir-des-braises', 'guerrier-au-bouclier-rond', 'lionne-du-midi-ardent', 'maitre-du-marteau',
  'ifrit-des-ergs', 'djinn-des-braises-voilees', 'djinn-du-dernier-brasier', 'djinn-de-la-premiere-etincelle', 'djinn-des-ailes-de-cendre',
  'djinn-de-la-flamme-mourante', 'veilleuse-des-citernes', 'scalde-des-runes', 'valkyrie-au-corbeau', 'scribe-des-feuillets', 'drakkar-a-tete-de-dragon',
  'volva-soigneuse', 'faiseur-de-passage', 'vipere-de-verre', 'sonneur-fele', 'corbeau-de-givre', 'geant-des-banquises', 'leviathan',
  'gardien-de-la-porte-ardente', 'rempart-des-sables-eternels', 'tin-hinan', 'serpent-du-monde', 'ifrit-al-ahmar', 'celle-qui-pese', 'ibis-des-comptes', 'amayas-du-hoggar', 'jormungandr', 'yamina', 'dame-des-neuf-mondes', 'la-devoreuse', 'valkyrie-des-neuf-nuits', 'pere-des-corbeaux', 'kraken', 'fennec-des-decombres', 'chien-du-guet', 'le-renegat', 'tiziri-du-djurdjura', 'pilote-de-la-carreira',
  ...MOBA_ABORDAGE_IMPRIME, 'le-brulot', 'negociant-des-ranscons', 'le-chasseur-d-ocracoke', 'oni-de-la-fournaise', 'bakunawa', 'cavalier-amazigh-du-desert',
  'le-cavalier-sans-nom', 'le-cavalier-de-vapeur', 'le-cavalier-du-ressac-gele', 'le-cavalier-des-dunes-gelees', 'le-cavalier-du-cimetiere', 'le-cavalier-du-bucher',
  'chacal-du-seuil', 'veilleuse-au-corbeau-noir', 'berserk-du-crepuscule', 'seigneur-des-machoires', 'faucon-du-zenith', 'celui-qui-juge', 'pretre-de-la-bouche', 'ouvrier-du-natron', 'gardienne-de-la-balance',
  'orochi', 'momie-de-lin', 'daimyo-du-soleil-rouge', 'tarek',
  'braisier-du-souk', 'valkyrie-des-glaces', 'maitre-des-corbeaux', 'guetteur-du-beffroi', 'dune-marchante', 'faussoyeur-des-dunes', 'scribe-de-la-liste',
  'amani-des-ksour', 'susanoo', 'ronin-du-soleil-rouge', 'hatamoto-des-cendres', 'cavalier-des-deux-sabres', 'samourai-du-torii', 'onna-musha-des-cendres', 'tengu-du-mont-ardent', 'kenshi-de-la-forge',
  'tislit-des-aures', 'ureus-du-seuil', 'feriel', 'djinn-de-la-fleche-ardente', 'djinn-de-foudre', 'bouchra-guerriere-des-cretes', 'kagutsuchi-flamme-originelle', 'maitre-des-hieroglyphes', 'tercio-de-cuivre', 'archere-viking-du-givre',
]);
