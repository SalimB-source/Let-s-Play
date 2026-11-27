/** Sorts dont l'effet est désormais porté par une créature : leurs anciennes
 * fiches restent lisibles pour les sauvegardes et les effets différés, mais
 * ne sont plus des cartes jouables ou collectionnables dans le catalogue. */
export const RPG_SORTS_TRANSFERES = Object.freeze([
  'appel-des-marees', 'brume-du-fjord', 'confluence-des-etincelles', 'defi-du-jarl',
  'eau-de-la-source', 'effacement-des-faibles', 'embuscade', 'eveil-des-dunes', 'festin-des-vaillants', 'feux-de-kitsune', 'grand-hiver', 'hurlement-du-blizzard', 'la-derniere-pesee', 'la-grande-pesee',
  'lame-de-mer', 'le-grand-debarquement', 'le-jugement-des-colosses', 'le-routier',
  'les-feuillets', 'lettre-de-marque', 'courant-de-retour', 'memoire-de-l-armurerie', 'mur-de-boucliers',
  'neige-noire', 'nom-efface', 'nuage-de-cendres', 'offrande-de-lin', 'ralliement-des-neiges',
  'rapport-du-greffier', 'reanimation', 'serment-de-la-forge', 'ressac-de-la-lune-noire', 'retour-des-ensevelis',
  'tempete-de-foudre-et-de-givre', 'tempete-de-sable', 'veille-des-braises', 'vent-rouge', 'verglas',
  'frappe-iaijutsu', 'papyrus', 'le-poids', 'haut-fond', 'trait-de-braise', 'brise-lame',
  'rempart-de-dunes', 'parade-du-verre', 'brisure-de-verre', 'ecueil', 'eclair-du-marteau',
  'poigne-de-givre', 'grand-voile-blanc', 'appat-de-la-meute', 'contresort-des-abimes',
  'silence-decume', 'maree-contraire', 'ressac', 'voile-de-la-lune-noire',
]);
const RETIRES = new Set(RPG_SORTS_TRANSFERES);
export const sortTransfere = (id) => RETIRES.has(id);
