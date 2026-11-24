/** Sorts dont l'effet est désormais porté par une créature : leurs anciennes
 * fiches restent lisibles pour les sauvegardes et les effets différés, mais
 * ne sont plus des cartes jouables ou collectionnables dans le catalogue. */
export const RPG_SORTS_TRANSFERES = Object.freeze([
  'appel-des-marees', 'brume-du-fjord', 'confluence-des-etincelles', 'defi-du-jarl',
  'eveil-des-dunes', 'hurlement-du-blizzard', 'la-derniere-pesee', 'la-grande-pesee',
  'lame-de-mer', 'le-grand-debarquement', 'le-jugement-des-colosses', 'le-routier',
  'les-feuillets', 'lettre-de-marque', 'memoire-de-l-armurerie', 'mur-de-boucliers',
  'neige-noire', 'nuage-de-cendres', 'offrande-de-lin', 'ralliement-des-neiges',
  'rapport-du-greffier', 'reanimation', 'ressac-de-la-lune-noire', 'retour-des-ensevelis',
  'tempete-de-foudre-et-de-givre', 'tempete-de-sable', 'veille-des-braises', 'vent-rouge', 'verglas',
]);
const RETIRES = new Set(RPG_SORTS_TRANSFERES);
export const sortTransfere = (id) => RETIRES.has(id);
