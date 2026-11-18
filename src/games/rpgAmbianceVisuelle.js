import { cardColors } from './rpgCards.js';

// Chaque décor conserve une ambiance en 2D, même lorsque le plateau est partagé.
const AMBIANCES = {
  'table-des-heures': 'braise', 'erg-du-sahara': 'sable', 'caravane-de-gourara': 'sable',
  'place-du-souk': 'sable', 'village-viking': 'neige', 'champ-de-bataille-viking': 'neige',
  'ruines-de-tipaza': 'eau', 'cour-de-l-empereur': 'petales', 'necropole-des-dalles': 'sable',
  'palais-du-pharaon': 'braise', 'navire-pirate': 'eau', 'cercle-des-corbeaux': 'neige',
  'sablier-renverse': 'sable', 'fosse-de-l-oubliee': 'brume', 'cimetiere-des-noms-effaces': 'brume',
  'cour-du-fleau': 'brume', 'desert-de-verre': 'sable', 'abysses-phosphorescentes': 'eau',
  'iles-celestes': 'neige', 'trois-voies': 'petales', 'port-des-corsaires': 'eau',
  'erg-des-ksour': 'sable', 'lac-gele-viking': 'neige', 'temple-du-nil-egyptien': 'sable',
};

export function rpgAmbiancePlateau(id) { return AMBIANCES[id] ?? 'sable'; }

// Le danger n'est pas actif après la défaite ni pour une valeur invalide.
export function rpgVieCritique(pv, maximum) {
  return Number.isFinite(pv) && Number.isFinite(maximum) && maximum > 0 && pv > 0 && pv <= maximum * .25;
}

// Les hybrides répartissent les particules entre tous leurs éléments.
export function rpgElementParticule(carte, index) {
  const couleurs = cardColors(carte);
  return couleurs.length ? couleurs[index % couleurs.length] : 'sable';
}
