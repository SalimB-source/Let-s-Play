import { MOBA_EMBUSCADES_CONDITIONS } from './rpgMobaEmbuscades.js';

/** Adaptations de présentation uniquement. Les définitions du catalogue et
 * les cartes du duel classique ne sont jamais modifiées. */
export function rpgMobaCartePourApercu(carte) {
  if (MOBA_EMBUSCADES_CONDITIONS[carte?.id]) return { ...carte, reactionTourAdverse: true };
  if (carte?.conditionEmbuscade !== 'deux-attaquants') return carte;
  return { ...carte, reactionTourAdverse: false, conditionEmbuscade: null,
    text: carte.text.replace(/^Embuscade\s*[—-]\s*[^.]*\.\s*/u, '') };
}

export function rpgMobaNotesCarte(carte) {
  if (!carte) return [];
  const notes = [];
  if (carte.rapidite || carte.donne?.rapidite) notes.push('En MOBA, Rapidité ne confère aucun bonus : toutes les créatures peuvent attaquer dès leur arrivée.');
  if (carte.conditionEmbuscade === 'deux-attaquants') notes.push('En MOBA, cette créature ne possède pas Embuscade ; son effet d’arrivée reste actif.');
  if (MOBA_EMBUSCADES_CONDITIONS[carte.id]) notes.push(`Embuscade MOBA — ${MOBA_EMBUSCADES_CONDITIONS[carte.id]} Invocation spéciale sans sacrifice et sans quota, sans consommer l’invocation normale. Sinon, invocation normale pendant votre tour.`);
  if (['appat-de-la-meute', 'embuscade'].includes(carte.id)) notes.push('Injouable en MOBA : ce sort impose un blocage.');
  if (carte.provocation) notes.push('Provocation : priorité sur Défenseur si accessible ; +0/+1 par attaque qui la cible, jusqu’à la fin du tour.');
  if (carte.defenseur || carte.prioriteAttaqueRapide) notes.push('Défenseur : les attaques venant de sa voie doivent la viser en priorité si elle est accessible et qu’aucune Provocation accessible ne prime.');
  if (carte.envol || carte.furieGains?.envol) notes.push('Envol : peut viser les créatures accessibles au sol ou en vol ; sans ennemi volant accessible, peut aussi attaquer directement.');
  if (carte.infiltration) notes.push('Infiltration : peut attaquer directement sauf priorité accessible ; ne peut pas être visée par une attaque normale, mais peut être visée par une Attaque ciblée.');
  if (carte.coupRapide || carte.donne?.coupRapide || carte.effet?.coupRapide) notes.push('Attaque ciblée : peut viser une créature sur tout le plateau ou attaquer directement, sauf priorité accessible ; risque d’échec contre une créature.');
  if (carte.honneur) notes.push('Harakiri : à sa mort, frappe une créature adverse au hasard dans sa voie ; à défaut, frappe la voie adverse. Le centre conquis partage les deux flancs actifs.');
  if (carte.overkill || carte.furieGains?.overkill || carte.donne?.overkill || carte.effet?.overkill) notes.push('Overkill : les dégâts qui dépassent la défense de la créature touchée atteignent la voie adverse.');
  if (carte.combat?.type === 'degats-creature-combattue') notes.push('En MOBA, lors d’un duel normal entre créatures, ses dégâts « à l’attaque » ou « au blocage » sont infligés juste avant les blessures ordinaires. La frappe directe et l’Attaque ciblée ne déclenchent pas cet effet.');
  if (carte.combat?.quand === 'blocage' && carte.combat?.type === 'retour-main') notes.push('En MOBA, la créature attaquée déclenche cet effet lors d’un duel normal ; le renvoi indiqué après les blessures garde ce timing.');
  return notes;
}
