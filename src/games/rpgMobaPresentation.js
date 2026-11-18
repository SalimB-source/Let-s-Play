import { estDefenseur } from './rpgDefenseur.js';
import { MOBA_EMBUSCADES_CONDITIONS } from './rpgMobaEmbuscades.js';
import { MOBA_RAPIDITE_EMBUSCADES } from './rpgMobaRapidite.js';
import { MOBA_EMBUSCADES_IMPRIMEES } from './rpgMobaEmbuscadesImprimees.js';

/** Adaptations de présentation uniquement. Les définitions du catalogue restent inchangées ; les conditions
 * d’Embuscade sont partagées avec les autres modes. */
export function rpgMobaCartePourApercu(carte) {
  if (!carte) return carte;
  // Les fiches doivent conserver le timing propre au MOBA pour les renvois.
  carte = { ...carte, presentationCombatMoba: true };
  if (carte.id === 'embuscade') return { ...carte, text: 'Sorcellerie — Dans la voie choisie, les créatures adverses gagnent -2/-2 jusqu’à la fin du tour, sans descendre sous 1/1. Les voies partagées du centre conquis comptent aussi.' };
  if (carte.id === 'serment-de-la-forge') return { ...carte, text: carte.text.replace('Vos créatures gagnent', 'Vos créatures dans la voie choisie gagnent') };
  if (carte.id === 'sandales-de-tislit') return { ...carte, donne: { ...carte.donne, rapidite: false },
    bonus: { ...carte.bonus, atk: 1, def: 1 },
    text: 'Arme — Le porteur gagne +1/+1 en MOBA. Se joue uniquement pendant votre tour.' };
  if (['chien-de-sable', 'guepard'].includes(carte.id)) return { ...carte,
    text: `${carte.name} est créé par son invocateur avec Rapidité. En MOBA, son invocateur peut être invoqué spécialement sous condition.` };
  const ambush = MOBA_RAPIDITE_EMBUSCADES[carte.id]?.texte
    ?? MOBA_EMBUSCADES_IMPRIMEES[carte.id]?.texte ?? MOBA_EMBUSCADES_CONDITIONS[carte.id];
  if (ambush) {
    const texte = carte.reactionTourAdverse
      ? carte.text.replace(/^(?:Embuscade|Invocation spéciale)\s*[—-]\s*[^.]*\.\s*/u, '')
      : carte.text;
    const arrivee = carte.id === 'sentinelle-des-sables'
      ? texte.replace('créature adverse ciblée', 'créature adverse ciblée de sa voie')
      : carte.id === 'porte-etendard-de-leclipse'
        ? texte.replace('jusqu’à la fin du tour', 'jusqu’à la fin du prochain tour adverse')
        : texte;
    return { ...carte, reactionTourAdverse: false,
      text: `Invocation spéciale — Pendant votre phase principale, si la condition est remplie : ${ambush} Sans sacrifice et sans consommer l’invocation normale. Sinon, invocation normale pendant votre tour. ${arrivee}` };
  }
  return carte;
}

export function rpgMobaNotesCarte(carte) {
  if (!carte) return [];
  const notes = [];
  if (carte.rapidite) notes.push('Rapidité : cette créature peut attaquer dès son arrivée, sous réserve des autres restrictions.');
  if (carte.id === 'sandales-de-tislit') notes.push('En MOBA, les Sandales donnent +1/+1 au porteur et ne se jouent que pendant votre tour. Dans le duel classique, elles donnent +0/+1 et Rapidité.');
  if (['chien-de-sable', 'guepard'].includes(carte.id)) notes.push('Jeton : ne se joue pas depuis la main. En MOBA, son invocateur (Tarek ou Kusayla) peut être invoqué spécialement sous condition.');
  if (MOBA_RAPIDITE_EMBUSCADES[carte.id]) notes.push(`Invocation spéciale pendant votre phase principale — ${MOBA_RAPIDITE_EMBUSCADES[carte.id].texte} Invocation spéciale sans sacrifice, sans quota et sans consommer l’invocation normale.`);

  if (MOBA_EMBUSCADES_IMPRIMEES[carte.id]) notes.push(`Invocation spéciale pendant votre phase principale — ${MOBA_EMBUSCADES_IMPRIMEES[carte.id].texte} Invocation spéciale sans sacrifice, sans quota et sans consommer l’invocation normale.`);
  if (MOBA_EMBUSCADES_CONDITIONS[carte.id]) notes.push(`Invocation spéciale pendant votre phase principale — ${MOBA_EMBUSCADES_CONDITIONS[carte.id]} Invocation spéciale sans sacrifice et sans consommer l’invocation normale. Sinon, invocation normale pendant votre tour.`);
  if (estDefenseur(carte)) notes.push('Défenseur : les attaques sans Infiltration venant de sa voie doivent la viser en priorité si elle est accessible.');
  if (carte.envol || carte.furieGains?.envol) notes.push('Envol : peut viser les créatures accessibles au sol ou en vol ; peut attaquer directement même en présence de créatures dans la voie, sauf si une créature avec Envol ou un Défenseur s’y trouve ; une unique créature avec Infiltration et sans Envol permet toutefois la frappe.');
  if (carte.infiltration) notes.push('Infiltration : ignore la priorité des Défenseurs pour choisir une créature, mais respecte la règle d’attaque directe ; ne peut pas être visée par une attaque normale, mais peut être visée par une Attaque ciblée. Une voie dont elle est la seule créature adverse peut être attaquée directement si elle n’a pas Envol.');
  if (carte.coupRapide || carte.donne?.coupRapide || carte.effet?.coupRapide) notes.push('Attaque ciblée : peut viser une créature sur tout le plateau ou attaquer directement selon les règles de la voie ; risque d’échec contre une créature.');
  if (carte.honneur) notes.push('Harakiri : à sa mort, frappe une créature adverse au hasard dans sa voie ; à défaut, frappe la voie adverse. Le centre conquis partage les deux flancs actifs.');
  if (carte.overkill || carte.furieGains?.overkill || carte.donne?.overkill || carte.effet?.overkill) notes.push('Overkill : les dégâts qui dépassent la défense de la créature touchée atteignent la voie adverse.');
  if (carte.combat?.type === 'degats-creature-combattue') notes.push('En MOBA, lors d’un duel normal entre créatures, ses dégâts « à l’attaque » ou « au blocage » sont infligés juste avant les blessures ordinaires. La frappe directe et l’Attaque ciblée ne déclenchent pas cet effet.');
  if (carte.combat?.quand === 'blocage' && carte.combat?.type === 'retour-main') notes.push('En MOBA, la créature attaquée déclenche cet effet lors d’un duel normal ; le renvoi indiqué après les blessures garde ce timing.');
  return notes;
}
