/** Adaptations de présentation uniquement. Les définitions du catalogue et
 * les cartes du duel classique ne sont jamais modifiées. */
export function rpgMobaCartePourApercu(carte) {
  if (carte?.conditionEmbuscade !== 'deux-attaquants') return carte;
  return { ...carte, reactionTourAdverse: false, conditionEmbuscade: null,
    text: carte.text.replace(/^Embuscade\s*[—-]\s*[^.]*\.\s*/u, '') };
}

export function rpgMobaNotesCarte(carte) {
  if (!carte) return [];
  const notes = [];
  if (carte.conditionEmbuscade === 'deux-attaquants') notes.push('En MOBA, cette créature ne possède pas Embuscade ; son effet d’arrivée reste actif.');
  if (['appat-de-la-meute', 'embuscade'].includes(carte.id)) notes.push('Injouable en MOBA : ce sort impose un blocage.');
  if (carte.provocation) notes.push('Provocation : priorité sur Défenseur si accessible ; +0/+1 par attaque qui la cible, jusqu’à la fin du tour.');
  if (carte.defenseur || carte.prioriteAttaqueRapide) notes.push('Défenseur : les attaques doivent la viser en priorité si elle est accessible et qu’aucune Provocation accessible ne prime.');
  if (carte.envol || carte.furieGains?.envol) notes.push('Envol : peut viser les créatures accessibles au sol ou en vol ; sans ennemi volant accessible, peut aussi attaquer directement.');
  if (carte.infiltration) notes.push('Infiltration : ne peut pas être visée par une attaque normale, mais peut être visée par une Attaque ciblée.');
  if (carte.coupRapide || carte.donne?.coupRapide || carte.effet?.coupRapide) notes.push('Attaque ciblée : peut viser une créature sur tout le plateau ou attaquer directement, sauf priorité accessible ; risque d’échec contre une créature.');
  if (carte.overkill || carte.furieGains?.overkill || carte.donne?.overkill || carte.effet?.overkill) notes.push('Overkill : les dégâts qui dépassent la défense de la créature touchée atteignent la voie adverse.');
  if (['vampire-des-braises', 'sahir-des-braises', 'le-cavalier-de-vapeur', 'tour-de-braise', 'tour-des-flots'].includes(carte.id)) notes.push('En MOBA, les effets qui exigent un blocage ne se déclenchent pas.');
  return notes;
}
