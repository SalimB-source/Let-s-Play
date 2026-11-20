/**
 * Le Sablier — **une portée par carte**.
 *
 * Le tableau de la portée des **effets d'arrivée** : une créature qui entre ne
 * frappe plus n'importe où, elle frappe à sa mesure. La valeur se lit en cases
 * de grille, diagonales comprises (`rpgPortees.js`) :
 *
 * - `1` — **contact** : une lame ne touche que ce qui la touche. C'est la
 *   portée des duels — le champion et sa proie se joignent, puis chacun
 *   encaisse ;
 * - `2` — **tir** : ce qui frappe ou soigne **à distance** — les tours de
 *   défense, la Völva, l'Éclipse silencieuse, les effets d'arrivée des archers.
 *
 * Une carte absente garde son effet **sans limite** : les masses passent par
 * les zones (`rpgZoneCartes.js`), et tout ce qui ne désigne pas une créature
 * en jeu n'a rien à mesurer.
 *
 * Le MOBA, lui, ne mesure pas : ses voies tiennent lieu de géométrie.
 */
export const RPG_PORTEE_EFFETS = Object.freeze({
  // --- Contact : les duels ------------------------------------------------
  'cavalier-amazigh-du-desert': 1,
  bakunawa: 1,
  'souverain-de-la-lune-noire': 1,

  // --- Tir : deux cases ------------------------------------------------
  'guetteuse-des-marees': 2,
  'rempart-des-sables-eternels': 2,
  'sentinelle-des-sables': 2,
  susanoo: 2,
  'oni-de-la-fournaise': 2,
  'la-devoreuse': 2,
  'lionne-du-midi-ardent': 2,
  'vipere-de-verre': 2,
  'sonneur-fele': 2,
  'veilleuse-des-citernes': 2,
  'volva-soigneuse': 2,
  kraken: 2,
  'corbeau-de-givre': 2,
  'valkyrie-des-neuf-nuits': 2,
  'eclipse-silencieuse': 2,
  'gardienne-du-croissant': 2,
  'traqueur-des-nuits-sans-lune': 2,
  'veilleuse-de-la-lune-givree': 2,
  'le-cavalier-sans-nom': 2,
  'le-cavalier-de-vapeur': 2,
  'tour-de-braise': 2,
  'tour-de-sable': 2,
  'tour-de-neige': 2,
  'pere-des-corbeaux': 2,
  'maitre-du-marteau': 2,
  'maitre-des-corbeaux': 2,
});

/** La portée d'effet d'une carte, ou `null` si son effet ne se mesure pas. */
export function porteeEffetCarte(carteId) {
  const portee = RPG_PORTEE_EFFETS[carteId];
  return Number.isFinite(portee) && portee > 0 ? portee : null;
}
