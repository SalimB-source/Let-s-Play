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

/** Multiensemble des armes effectivement retirées, y compris les doublons.
 * L'ordre suit l'ancien équipement ; un simple réordonnancement ne compte pas. */
export function armesRetirees(avant = [], apres = []) {
  const restants = new Map();
  for (const id of apres) restants.set(id, (restants.get(id) ?? 0) + 1);
  return avant.filter((id) => {
    const nombre = restants.get(id) ?? 0;
    if (!nombre) return true;
    restants.set(id, nombre - 1);
    return false;
  });
}

/** Comparer deux relevés du plateau : seuls les porteurs encore en jeu
 * reçoivent un départ d'arme ; une créature sortie a déjà sa propre animation. */
export function retraitsArmesVue(avant, apres) {
  const retraits = [];
  for (const [cle, armes] of apres) {
    if (!avant.has(cle)) continue;
    const perdues = armesRetirees(avant.get(cle), armes);
    if (perdues.length) retraits.push({ cle, armes: perdues });
  }
  return retraits;
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
