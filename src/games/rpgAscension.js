import { cardById, cardColors, cardHasPrintedType } from './rpgCards.js';
import { RPG_ASCENSION_CARDS } from './rpgAscensionCards.js';

const definition = (carte) => typeof carte === 'string' ? cardById(carte) : carte;
export const estCarteAscension = (carte) => Boolean(definition(carte)?.ascension);

/** Une copie de lancement de chaque Ascension ; [] désactive la réserve.
 * Les listes explicites sont copiées, dédoublonnées et limitées au catalogue. */
export function reserveAscensionInitiale(ids = RPG_ASCENSION_CARDS.map((c) => c.id)) {
  return [...new Set(Array.isArray(ids) ? ids : [])].filter((id) => estCarteAscension(id));
}

/** Tout renvoi vers la main d’une Ascension la rend à sa réserve, jamais à
 * la pioche. Une mort reste, elle, une vraie entrée au cimetière. */
export function ajouterCarteEnMainOuReserve(camp, carteId) {
  const zone = estCarteAscension(carteId) ? 'reserveAscension' : 'main';
  (camp[zone] ??= []).push(carteId);
  return zone;
}

/** Les statistiques modifiées, armes et réductions ne changent pas le coût. */
export function coutImprimeAscension(entite) {
  const cout = Number(cardById(entite?.carteId)?.cost);
  return Number.isInteger(cout) && cout >= 0 ? cout : null;
}

/** Un rôle désigne UNE vraie carte : un hybride peut correspondre à plusieurs
 * rôles, mais la même présence ne peut jamais payer deux places de la recette. */
export function carteCorrespondMateriau(carteOuId, role = {}) {
  const carte = definition(carteOuId);
  return Boolean(carte && ['creature', 'hero'].includes(carte.kind)
    && (!role.type || cardHasPrintedType(carte, role.type))
    && (!role.element || cardColors(carte).includes(role.element))
    && (!Number.isFinite(role.cout) || carte.cost === role.cout)
    && (!Number.isFinite(role.coutMax) || carte.cost <= role.coutMax)
    && (!role.sansAscension || !carte.ascension));
}

const vivant = (entite) => entite && entite.pv > 0
  && carteCorrespondMateriau(entite.carteId) && coutImprimeAscension(entite) !== null;
const rolesDe = (condition) => condition?.materiaux?.map((role) => ({ type: condition.type, ...role })) ?? null;

export function materiauAscensionValide(carte, entite) {
  const condition = definition(carte)?.ascension;
  const roles = rolesDe(condition);
  return Boolean(condition && vivant(entite)
    && (!condition.type || cardHasPrintedType(entite.carteId, condition.type))
    && (!roles || roles.some((role) => carteCorrespondMateriau(entite.carteId, role))));
}

/** Appariement biparti exact, sans dépendre de l’ordre de sélection. La petite
 * taille des recettes (2 ou 3) borne cette recherche, y compris pour les IA. */
function correspondanceExacte(victimes, roles, index = 0, utilises = new Set()) {
  if (index === roles.length) return true;
  return victimes.some((entite, i) => {
    if (utilises.has(i) || !carteCorrespondMateriau(entite.carteId, roles[index])) return false;
    const suivants = new Set(utilises); suivants.add(i);
    return correspondanceExacte(victimes, roles, index + 1, suivants);
  });
}

/** Validation pure, complète AVANT tout paiement ou réservation de destination.
 * Deux copies de la même carte peuvent être sacrifiées, jamais deux fois le
 * même ID de présence. Le Dragon garde sa recette souple au total exact. */
export function validerMateriauxAscension(camp, carte, ids) {
  const condition = definition(carte)?.ascension;
  if (!condition) return { ok: false, raison: 'pas-ascension' };
  if (!Array.isArray(ids) || ids.length !== condition.nombre || new Set(ids).size !== ids.length) {
    return { ok: false, raison: 'ascension-nombre', nombreSacrifices: condition.nombre };
  }
  const victimes = ids.map((id) => camp?.creatures?.find((e) => e.id === id));
  if (victimes.some((e) => !e)) return { ok: false, raison: 'ascension-allies' };
  if (victimes.some((e) => !vivant(e) || (condition.type && !cardHasPrintedType(e.carteId, condition.type)))) {
    return { ok: false, raison: 'ascension-type' };
  }
  const total = victimes.reduce((somme, e) => somme + coutImprimeAscension(e), 0);
  if (total !== condition.coutTotal) return { ok: false, raison: 'ascension-cout', total, attendu: condition.coutTotal };
  const roles = rolesDe(condition);
  if (roles && (roles.length !== victimes.length || !correspondanceExacte(victimes, roles))) {
    return { ok: false, raison: 'ascension-recette', total };
  }
  return { ok: true, victimes, total };
}

/** Même validation pour l’interface et les deux IA ; aucune permutation
 * du même groupe n’est rendue plusieurs fois. */
export function combinaisonsAscension(camp, carte, selection = []) {
  const condition = definition(carte)?.ascension;
  if (!condition || !Array.isArray(selection) || new Set(selection).size !== selection.length
    || selection.length > condition.nombre) return [];
  const candidats = (camp?.creatures ?? []).filter((e) => materiauAscensionValide(carte, e));
  if (selection.some((id) => !candidats.some((e) => e.id === id))) return [];
  const groupes = [];
  const explorer = (debut, groupe, total) => {
    if (total > condition.coutTotal) return;
    if (groupe.length === condition.nombre) {
      const ids = groupe.map((e) => e.id);
      if (selection.every((id) => ids.includes(id)) && validerMateriauxAscension(camp, carte, ids).ok) groupes.push(groupe);
      return;
    }
    for (let i = debut; i <= candidats.length - (condition.nombre - groupe.length); i += 1) {
      explorer(i + 1, [...groupe, candidats[i]], total + coutImprimeAscension(candidats[i]));
    }
  };
  explorer(0, [], 0);
  return groupes;
}

const COULEURS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
export function libelleRecetteAscension(carte) {
  const condition = definition(carte)?.ascension;
  if (!condition) return '';
  const roles = rolesDe(condition);
  return roles ? roles.map((role) => [role.typeLabel ?? condition.typeLabel ?? 'Créature', COULEURS[role.element], role.cout].filter((s) => s !== undefined).join(' ')).join(' + ')
    : `${condition.nombre} ${condition.typeLabel}s · total ${condition.coutTotal}`;
}

/** Une Ascension est une invocation de phase principale, jamais une réaction.
 * Le MOBA peut résoudre une annonce déjà réservée après sa fenêtre de réponse. */
export function timingAscensionValide(duel, cote, { resolutionMoba = false } = {}) {
  if (!duel?.[cote] || duel.tour !== cote || !['principale', 'principale2'].includes(duel.phase)) return false;
  if (duel.fin?.gagnant || duel.fin?.nul || duel.moba?.winner) return false;
  if (!duel.moba && (duel.joueur.pv <= 0 || duel.sorcier.pv <= 0)) return false;
  if (duel.mulliganFait && (!duel.mulliganFait.joueur || !duel.mulliganFait.sorcier)) return false;
  if (duel.modeMana && (!duel.manaEssaiDemarre || duel[cote].manaChoixEnAttente)) return false;
  if (duel.mobaDebutTourEnAttente || duel.moba?.centerChoice) return false;
  if (duel.arriveeEnAttente || duel.effetCreatureEnAttente || duel.destructionsEnAttente?.length
    || duel.defausseEnAttente || duel.boualemEnAttente || duel.siteEnAttente || duel.combatDeclare
    || duel.finDeTour || duel.mobaRechercheEnAttente || duel.mobaReponseSuspendue || duel.annonce) return false;
  return resolutionMoba || !(duel.fenetreReponse || duel.mobaSortEnAttente || duel.mobaCreatureEnAttente);
}

export function ascensionDisponible(duel, cote, carte) {
  const fiche = definition(carte);
  return Boolean(fiche?.ascension && duel?.[cote]?.reserveAscension?.includes(fiche.id)
    && timingAscensionValide(duel, cote) && combinaisonsAscension(duel[cote], fiche).length);
}

export const ERREURS_ASCENSION = Object.freeze({
  'pas-en-reserve': 'Cette créature n’est plus dans votre réserve d’Ascension.',
  'ascension-timing': 'L’Ascension se prépare pendant votre phase principale, sans action en attente.',
  'ascension-nombre': 'Choisissez exactement le nombre de sacrifices indiqué.',
  'ascension-allies': 'Les sacrifices doivent être des créatures distinctes que vous contrôlez encore.',
  'ascension-type': 'Les sacrifices doivent être vivants et porter le type imprimé demandé.',
  'ascension-cout': 'La somme des coûts imprimés doit être exactement égale au seuil d’Ascension.',
  'ascension-recette': 'Les types, couleurs et coûts individuels doivent respecter chaque place de la recette.',
});
