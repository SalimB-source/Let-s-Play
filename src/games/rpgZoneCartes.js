/**
 * Le Sablier — **quelle zone pour quelle carte**.
 *
 * Un effet de masse ne balaie plus la table : il couvre une zone que le
 * lanceur désigne (`rpgZones.js`). Cette table dit la forme de chaque carte ;
 * tout le reste — géométrie, ancre, filtrage — est générique.
 *
 * Trois formes, et une règle de lecture :
 *
 * - `rangee` — un sort qui balaie **une ligne** : la tempête de sable et la
 *   brume du fjord descendent sur un front ou sur un fond, pas sur les deux ;
 * - `colonne` — un effet qui **traverse les deux camps** : la rafale de vent
 *   rouge, le hurlement du blizzard, la brisure de verre, et les sorts
 *   symétriques qui frappent « toutes les créatures » (Le Grand Hiver, Tempête
 *   de foudre et de givre) — quatre cases, deux chez chacun ;
 * - `carre` — une **zone de quatre** (deux colonnes × les deux lignes d'un
 *   camp) : le nuage de cendres, le verglas, la neige noire, l'embuscade.
 *
 * Une carte absente de la table garde son effet global : rien ne change pour
 * elle.
 */
export const RPG_ZONE_CARTES = Object.freeze({
  // --- Sorts de dégâts de masse -------------------------------------------
  'tempete-de-sable': { forme: 'rangee' },
  'brume-du-fjord': { forme: 'rangee' },
  'vent-rouge': { forme: 'colonne' },
  'hurlement-du-blizzard': { forme: 'colonne' },
  'brisure-de-verre': { forme: 'colonne' },
  'nuage-de-cendres': { forme: 'carre' },
  verglas: { forme: 'carre' },
  // Sorts symétriques : la colonne traverse les deux camps, c'est ce qui rend
  // « toutes les créatures » vrai sans balayer la table entière.
  'grand-hiver': { forme: 'colonne' },
  'tempete-de-foudre-et-de-givre': { forme: 'colonne' },
  // Masses qui ne blessent pas : elles suivent la même règle.
  'neige-noire': { forme: 'carre' },
  embuscade: { forme: 'carre' },
  'ressac-de-la-lune-noire': { forme: 'rangee' },

  // --- Effets de masse portés par des créatures ---------------------------
  'braisier-du-souk': { forme: 'carre' },
  'valkyrie-des-glaces': { forme: 'carre' },
  'sanguinaire-des-dunes': { forme: 'carre' },
  'geant-des-banquises': { forme: 'colonne' },
  'le-cavalier-du-bucher': { forme: 'colonne' },
  'le-cavalier-du-ressac-gele': { forme: 'colonne' },
  leviathan: { forme: 'colonne' },
  'celui-qui-juge': { forme: 'carre' },
  'tour-des-tenebres': { forme: 'carre' },
  'tin-hinan': { forme: 'carre' },
  'le-cavalier-des-dunes-gelees': { forme: 'carre' },
});

/** La forme de zone d'une carte, ou `null` si son effet reste global. */
export function zoneFormeCarte(carteId) {
  return RPG_ZONE_CARTES[carteId]?.forme ?? null;
}
