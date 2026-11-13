import { MOBA_EMBUSCADES_CONDITIONS } from './rpgMobaEmbuscades.js';
import { MOBA_RAPIDITE_EMBUSCADES } from './rpgMobaRapidite.js';
import { MOBA_EMBUSCADES_IMPRIMEES } from './rpgMobaEmbuscadesImprimees.js';

const texteSansRapidite = (texte = '') => texte
  .replace(/Rapidité\s*—\s*[^.]*\.\s*/gu, '')
  .replace(/\bRapidité\.\s*/gu, '')
  .replace(/\s+avec Rapidité/gu, '');

/** Adaptations de présentation uniquement. Les définitions du catalogue restent inchangées ; les conditions
 * d’Embuscade sont partagées avec les autres modes. */
export function rpgMobaCartePourApercu(carte) {
  if (!carte) return carte;
  // Les fiches doivent conserver le timing propre au MOBA pour les renvois.
  carte = { ...carte, presentationCombatMoba: true };
  if (carte.id === 'sandales-de-tislit') return { ...carte, donne: { ...carte.donne, rapidite: false },
    bonus: { ...carte.bonus, atk: 1, def: 1 },
    text: 'Arme — Le porteur gagne +1/+1 en MOBA. Se joue uniquement pendant votre tour.' };
  if (['chien-de-sable', 'guepard'].includes(carte.id)) return { ...carte, rapidite: false,
    text: `${carte.name} est créé par son invocateur. En MOBA, son invocateur peut entrer en Embuscade sous condition.` };
  const ambush = MOBA_RAPIDITE_EMBUSCADES[carte.id]?.texte
    ?? MOBA_EMBUSCADES_IMPRIMEES[carte.id]?.texte ?? MOBA_EMBUSCADES_CONDITIONS[carte.id];
  if (ambush) {
    const texte = carte.reactionTourAdverse
      ? carte.text.replace(/^Embuscade\s*[—-]\s*[^.]*\.\s*/u, '')
      : texteSansRapidite(carte.text);
    const arrivee = carte.id === 'sorcier-du-ressac-noir'
      ? texte.replace(/Si vous la jouez ainsi, contrez cette carte de créature\. Le Sorcier du ressac noir arrive ensuite en jeu\.\s*/u, '')
      : carte.id === 'sentinelle-des-sables'
        ? texte.replace('créature attaquante ciblée', 'créature adverse ciblée de sa voie')
        : carte.id === 'porte-etendard-de-leclipse'
          ? texte.replace('jusqu’à la fin du tour', 'jusqu’à la fin du prochain tour adverse')
          : texte;
    return { ...carte, rapidite: false, reactionTourAdverse: false,
      text: `Embuscade MOBA — Pendant le tour adverse, dans une fenêtre de réponse : ${ambush} Invocation spéciale sans sacrifice, sans consommer l’invocation normale. ${carte.id === 'sorcier-du-ressac-noir' ? 'À son arrivée, il renvoie la première créature adverse admissible non-jeton de coût 3 ou moins dans la main de son propriétaire. ' : ''}${arrivee}` };
  }
  return carte;
}

export function rpgMobaNotesCarte(carte) {
  if (!carte) return [];
  const notes = [];
  if (carte.rapidite && !carte.jeton) notes.push('Toutes les créatures peuvent attaquer dès leur arrivée ; cette ancienne Rapidité est remplacée par une Embuscade conditionnelle.');
  if (carte.id === 'sandales-de-tislit') notes.push('En MOBA, les Sandales donnent +1/+1 au porteur et ne se jouent que pendant votre tour. Dans le duel classique, elles donnent +0/+1 et Rapidité.');
  if (['chien-de-sable', 'guepard'].includes(carte.id)) notes.push('Jeton : ne se joue pas depuis la main. En MOBA, son invocateur (Tarek ou Kusayla) peut arriver en Embuscade sous condition.');
  if (MOBA_RAPIDITE_EMBUSCADES[carte.id]) notes.push(`Embuscade MOBA pendant une fenêtre de réponse adverse — ${MOBA_RAPIDITE_EMBUSCADES[carte.id].texte} Invocation spéciale sans sacrifice, sans quota et sans consommer l’invocation normale.`);

  if (MOBA_EMBUSCADES_IMPRIMEES[carte.id]) notes.push(`Embuscade MOBA pendant une fenêtre de réponse adverse — ${MOBA_EMBUSCADES_IMPRIMEES[carte.id].texte} Invocation spéciale sans sacrifice, sans quota et sans consommer l’invocation normale.`);
  if (MOBA_EMBUSCADES_CONDITIONS[carte.id]) notes.push(`Embuscade MOBA pendant une fenêtre de réponse adverse — ${MOBA_EMBUSCADES_CONDITIONS[carte.id]} Invocation spéciale sans sacrifice et sans consommer l’invocation normale. Sinon, invocation normale pendant votre tour.`);
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
