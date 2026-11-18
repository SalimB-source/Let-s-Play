import { cardColors } from './rpgCards.js';

/** Multiensemble : détecte aussi un remplacement à taille constante et les doublons. */
export function nombreAjouts(avant = [], apres = []) {
  const restants = new Map();
  for (const id of avant) restants.set(id, (restants.get(id) ?? 0) + 1);
  let ajouts = 0;
  for (const id of apres) {
    const n = restants.get(id) ?? 0;
    if (n) restants.set(id, n - 1);
    else ajouts += 1;
  }
  return ajouts;
}

export function elementPortail(carte) {
  const couleurs = cardColors(carte);
  if (couleurs.includes('braise')) return 'braise';
  if (couleurs.includes('neige') || couleurs.includes('eau')) return 'givre';
  return 'sable';
}

export function matiereBordure(id) {
  if (['navire-pirate', 'port-des-corsaires', 'village-viking', 'champ-de-bataille-viking', 'lac-gele-viking', 'caravane-de-gourara'].includes(id)) return 'bois';
  if (['table-des-heures', 'cour-de-l-empereur', 'palais-du-pharaon', 'sablier-renverse', 'cour-du-fleau'].includes(id)) return 'metal';
  return 'pierre';
}
