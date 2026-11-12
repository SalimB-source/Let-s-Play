/** Fixtures mono-couleur et hybrides d'avant le catalogue commun : elles
 * vérifient les règles du moteur mana sans être proposées au joueur. */
import { CATALOGUE_DU_COMPOSEUR } from '../../src/games/rpgCards.js';
import { RPG_RECETTES_DECKS } from '../../src/games/rpgDeckRecipes.js';
import { composerDeck } from '../../src/games/rpgDeckComposer.js';
const RPG_DECK_JOUEUR_BASE = composerDeck(RPG_RECETTES_DECKS['veilleurs-du-desert'], CATALOGUE_DU_COMPOSEUR);
const RPG_DECK_HYBRIDE_BASE = composerDeck(RPG_RECETTES_DECKS['sentiers-de-cendre'], CATALOGUE_DU_COMPOSEUR);
export { RPG_DECK_JOUEUR_BASE as DECK_ESSAI_MONO_FIXTURE };

const copies = (id, nombre) => Array(nombre).fill(id);

/** Un départ souple, puis des cartes plus lourdes. Pas de Boussole ni de Djinn
 * du souk : leurs effets dépendent encore de cartes Terrain. */
export const DECKS_ESSAI_HISTORIQUES = Object.freeze([
  {
    id: 'essai-mana-sable',
    name: 'Les Pistes du Sable',
    element: 'sable',
    elements: ['sable'],
    boxArt: 'fennec-des-decombres',
    description: 'Mono-Sable : le mana grandit sans choix de couleur.',
    cardIds: [...RPG_DECK_JOUEUR_BASE],
  },
  {
    id: 'essai-mana-sable-braise',
    name: 'Les Sentiers ardents',
    element: 'hybride',
    elements: ['sable', 'braise'],
    boxArt: 'djinn-de-foudre',
    description: 'Sable + Braise : choisissez chaque tour la couleur de votre nouveau mana.',
    cardIds: [...RPG_DECK_HYBRIDE_BASE],
  },
  {
    // Identifiant historique conservé pour les anciennes sélections enregistrées.
    id: 'essai-mana-trois-couleurs',
    name: 'La Croisée des Heures',
    element: 'hybride',
    elements: ['sable', 'braise'],
    boxArt: 'sahir-des-braises',
    description: 'Sable + Braise : anticipez les sorts de deux couleurs.',
    cardIds: [
      ...copies('tislit-des-aures', 2), ...copies('fennec-des-decombres', 2),
      ...copies('chien-du-guet', 2), ...copies('faussoyeur-des-dunes', 2),
      'rapport-du-greffier', 'dune-marchante',
      ...copies('ashigaru-des-braises', 2), ...copies('ghul-des-cendres', 2),
      ...copies('hatamoto-des-cendres', 2), ...copies('trait-de-braise', 2),
      'ronin-du-soleil-rouge', 'nuage-de-cendres',
      ...copies('messagere-des-cendres', 2), ...copies('novice-des-cendres', 2),
      ...copies('chasseuse-de-braise', 2), ...copies('sentinelle-du-brasier', 2),
      'sahir-des-braises', 'anqa-des-braises',
    ],
  },
  {
    id: 'essai-mana-tenebres',
    name: 'La Balance des Heures',
    element: 'tenebres',
    elements: ['tenebres'],
    boxArt: 'la-devoreuse',
    description: 'Mono-Ténèbres : on paie sa vie, on reçoit la leur.',
    cardIds: [
      ...copies('chacal-du-seuil', 2), 'ouvrier-du-natron',
      ...copies('papyrus', 2),
      ...copies('gardienne-de-la-balance', 2), ...copies('scribe-des-feuillets', 2),
      ...copies('pretre-de-la-bouche', 2), ...copies('nom-efface', 2),
      ...copies('offrande-de-lin', 2),
      ...copies('ureus-du-seuil', 2), ...copies('momie-de-lin', 2),
      ...copies('ibis-des-comptes', 2),
      'khopesh-d-or', ...copies('le-poids', 2),
      'celle-qui-pese', 'les-feuillets', 'la-grande-pesee', 'la-derniere-pesee',
      'la-devoreuse', 'celui-qui-juge',
    ],
  },
  {
    id: 'essai-mana-lettres-de-marque',
    name: 'Les Lettres de Marque',
    element: 'hybride',
    // Sable + Eau, sans flamme : le Brûlot, devenu Braise, a quitté le paquet.
    elements: ['sable', 'eau'],
    boxArt: 'la-barbe-rousse',
    description: 'Sable + Eau : la course amollit, l’abordage emporte, la cale ne se rachète pas.',
    cardIds: [
      ...copies('mousse-des-galiotes', 2), ...copies('rais-de-la-galiote', 2),
      ...copies('pilote-de-la-carreira', 2), ...copies('porteuse-de-cruches', 2),
      ...copies('tercio-de-cuivre', 2), ...copies('cotre-de-course', 2),
      ...copies('le-renegat', 2), 'negociant-des-ranscons',
      'galion-de-la-flotte', 'la-barbe-rousse',
      ...copies('sonneur-fele', 2),
      ...copies('lettre-de-marque', 2), ...copies('haut-fond', 2),
      'le-routier', 'le-grand-debarquement',
      ...copies('lame-de-mer', 2), 'ressac',
      'grappin-d-abordage', 'baton-des-citernes',
    ],
  },
]);
