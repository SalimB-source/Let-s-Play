/** Combat individuel du classique solo, indépendant des voies du MOBA. */
import { cardColors, duelCardById } from './rpgCards.js';
import { rpgAppliquerBannieresAttaque, rpgEstProtegee, rpgPeutAttaquer, rpgResoudreEchangeIndividuelClassique, rpgVainqueur } from './rpgDuel.js';

const camps = ['joueur', 'sorcier'];
const autre = (cote) => cote === 'joueur' ? 'sorcier' : 'joueur';
const creature = (entite) => Boolean(entite && duelCardById(entite.carteId) && duelCardById(entite.carteId).kind !== 'site');
const soloClassique = (duel, cote) => Boolean(duel && !duel.moba && !duel.pvp && camps.includes(cote));

function accessible(attaquant, cible, ciblee) {
  if (!creature(cible) || rpgEstProtegee(cible, cardColors(duelCardById(attaquant.carteId)))) return false;
  return ciblee || (!cible.infiltration && (attaquant.envol || !cible.envol));
}

/** Mêmes priorités que le MOBA, sans restriction de voie. */
export function rpgCiblesIndividuellesClassique(duel, cote, attaquantId) {
  if (!soloClassique(duel, cote)) return { cibles: [], directe: false };
  const attaquant = duel[cote]?.creatures.find((e) => e.id === attaquantId);
  if (!creature(attaquant)) return { cibles: [], directe: false };
  const ciblee = Boolean(attaquant.coupRapide);
  const possibles = (duel[autre(cote)]?.creatures ?? []).filter((e) => accessible(attaquant, e, ciblee));
  const provocations = possibles.filter((e) => e.provocation);
  const defenseurs = possibles.filter((e) => e.defenseur || e.prioriteAttaqueRapide);
  const prioritaires = provocations.length ? provocations : defenseurs;
  if (prioritaires.length) return { cibles: prioritaires.map((e) => e.id), directe: false };
  return {
    cibles: possibles.map((e) => e.id),
    directe: ciblee || Boolean(attaquant.infiltration) || (!attaquant.envol ? possibles.length === 0 : !possibles.some((e) => e.envol)),
  };
}

/** La cible annoncée reste fixée : l'arrivée d'un Défenseur ne la redirige pas. */
export function rpgCibleIndividuelleClassiqueEncoreLegale(duel, cote, attaquantId, cibleId, cibleeAnnoncee) {
  if (!soloClassique(duel, cote) || rpgVainqueur(duel)) return false;
  const attaquant = duel[cote]?.creatures.find((e) => e.id === attaquantId);
  if (!creature(attaquant) || (cibleeAnnoncee && !attaquant.coupRapide)) return false;
  if (cibleId === null) return true;
  return accessible(attaquant, duel[autre(cote)]?.creatures.find((e) => e.id === cibleId), Boolean(cibleeAnnoncee));
}

/** Déclare une attaque et ouvre la réponse adverse sans choisir de bloqueur. */
export function rpgDeclarerAttaqueIndividuelleClassique(duel, cote, attaquantId, cibleId = null) {
  if (!soloClassique(duel, cote)) return { ok: false, raison: 'mode' };
  if (rpgVainqueur(duel)) return { ok: false, raison: 'partie-terminee' };
  if (duel.tour !== cote) return { ok: false, raison: 'pas-votre-tour' };
  if (duel.phase !== 'principale' || duel.fenetreReponse || duel.combatDeclare || duel.finDeTour
    || duel.annonce || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente || duel.boualemEnAttente
    || duel[cote].manaChoixEnAttente) return { ok: false, raison: 'timing' };
  const attaquant = duel[cote].creatures.find((e) => e.id === attaquantId);
  if (!creature(attaquant) || !rpgPeutAttaquer(attaquant)) return { ok: false, raison: 'pas-pret' };
  const choix = rpgCiblesIndividuellesClassique(duel, cote, attaquantId);
  if (cibleId === null ? !choix.directe : !choix.cibles.includes(cibleId)) return { ok: false, raison: 'cible' };
  // Une reprise après Embuscade est la même attaque : sa bannière a déjà
  // déclenché à l'annonce initiale et ne doit pas grandir une seconde fois.
  const bannieresAppliquees = attaquant.repriseAttaqueIndividuelle
    ? true : rpgAppliquerBannieresAttaque(duel, cote, [attaquantId]);
  delete attaquant.repriseAttaqueIndividuelle;
  const ciblee = Boolean(attaquant.coupRapide);
  const cible = duel[autre(cote)].creatures.find((e) => e.id === cibleId);
  if (cible?.provocation) {
    cible.def += 1; cible.pv += 1; cible.pvMax += 1;
    (duel[autre(cote)].bonusTemporaires ??= []).push({ entiteId: cible.id, atk: 0, def: 1, tour: cote });
  }
  attaquant.attaquee = true;
  duel.log.push(`${attaquant.name} annonce une attaque ${cible ? `contre ${cible.name}` : 'directe contre le sorcier'}.`);
  duel.phase = 'blocage';
  duel.fenetreReponse = true;
  duel.combatDeclare = {
    cote, attaquants: [attaquantId], ciblesAttaque: ciblee && cible ? { [attaquantId]: cibleId } : {},
    bannieresAppliquees, cibleIndividuelle: { cibleId, ciblee },
  };
  return { ok: true };
}

/** Résout la cible d'origine après la réponse ; une cible disparue n'est pas
 * remplacée par une frappe directe. Chaque créature conserve son engagement. */
export function rpgResoudreAttaqueIndividuelleClassique(duel, cote) {
  const combat = duel?.combatDeclare;
  if (!soloClassique(duel, cote) || !combat?.cibleIndividuelle || combat.cote !== cote
    || duel.tour !== cote || duel.phase !== 'blocage' || !duel.fenetreReponse
    || duel.annonce || duel.arriveeEnAttente || duel.effetCreatureEnAttente
    || duel.destructionsEnAttente?.length || duel.defausseEnAttente || duel.siteEnAttente || duel.boualemEnAttente) {
    return { ok: false, raison: 'timing' };
  }
  const attaquantId = combat.attaquants[0];
  const { cibleId, ciblee, interrompueParEmbuscade } = combat.cibleIndividuelle;
  if (interrompueParEmbuscade) {
    const attaquant = duel[cote].creatures.find((e) => e.id === attaquantId);
    // Si l'arrivée a détruit l'attaquant il ne peut évidemment pas repartir.
    if (attaquant) {
      attaquant.attaquee = false;
      attaquant.repriseAttaqueIndividuelle = true;
    }
    duel.combatDeclare = null;
    duel.fenetreReponse = false;
    duel.phase = 'principale';
    duel.log.push('L’Invocation spéciale interrompt l’attaque directe : l’attaquant doit choisir à nouveau sa cible.');
    return { ok: true, annule: true, choisirNouvelleCible: Boolean(attaquant && rpgPeutAttaquer(attaquant)), attaquantId,
      resume: { frappeSorcier: 0, furies: [], paires: [], coupsRapides: [], critiques: [], blessures: [] } };
  }
  const valide = rpgCibleIndividuelleClassiqueEncoreLegale(duel, cote, attaquantId, cibleId, ciblee);
  const result = valide
    ? rpgResoudreEchangeIndividuelClassique(duel, cote, attaquantId, cibleId, ciblee)
    : { ok: true, annule: true, resume: { frappeSorcier: 0, furies: [], paires: [], coupsRapides: [], critiques: [], blessures: [] } };
  if (!result.ok) return result;
  if (!valide) duel.log.push('La cible ou l’attaquant n’est plus disponible : l’attaque est annulée.');
  duel.combatDeclare = null;
  duel.fenetreReponse = false;
  duel.phase = 'principale';
  return result;
}

/** Choix déterministe de l'IA : privilégier une victoire directe puis les
 * échanges favorables. La légalité est recalculée avant chaque déclaration. */
export function rpgChoisirAttaqueIndividuelleClassiqueIA(duel, cote = 'sorcier', attaquantImpose = null) {
  if (!soloClassique(duel, cote) || duel.tour !== cote || duel.phase !== 'principale' || duel.combatDeclare || rpgVainqueur(duel)) return null;
  const adversaire = autre(cote);
  const choix = [];
  for (const attaquant of duel[cote].creatures.filter((e) => rpgPeutAttaquer(e) && (!attaquantImpose || e.id === attaquantImpose))) {
    const cibles = rpgCiblesIndividuellesClassique(duel, cote, attaquant.id);
    if (cibles.directe) {
      const degats = Math.max(0, Number(attaquant.atk) || 0);
      const lethal = degats >= (duel[adversaire].pv ?? 0) + (duel[adversaire].bouclier ?? 0);
      choix.push({ attaquantId: attaquant.id, cibleId: null, score: lethal ? 1000 : degats * 2 + 1 });
    }
    for (const cibleId of cibles.cibles) {
      const cible = duel[adversaire].creatures.find((e) => e.id === cibleId);
      const tue = attaquant.atk >= cible.pv;
      const meurt = !attaquant.coupRapide && cible.atk >= attaquant.pv;
      const score = (tue ? 5 + cible.atk + cible.pv : Math.min(attaquant.atk, cible.pv))
        - (meurt ? 5 + attaquant.atk + attaquant.pv : 0);
      choix.push({ attaquantId: attaquant.id, cibleId, score });
    }
  }
  choix.sort((a, b) => b.score - a.score);
  return choix[0] && (attaquantImpose || choix[0].score > 0) ? { attaquantId: choix[0].attaquantId, cibleId: choix[0].cibleId } : null;
}
