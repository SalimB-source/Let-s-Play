import { combinaisonsAscension } from './rpgAscension.js';
import { rpgCarteEmbuscade, rpgConditionEmbuscadeCommune } from './rpgEmbuscade.js';
import { cardById } from './rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from './rpgManaEssai.js';
import { champMax, ligneDePose, RPG_LIGNE_FOND } from './rpgLignes.js';

/** Les invocations depuis la main utilisent le coût imprimé pour les sacrifices.
 * Une Invocation spéciale à son tour est sans sacrifice ni quota.
 *
 * `specialeForcee` tranche le choix quand le joueur l'a déjà fait : `false`
 * garde l'invocation **normale** (les sacrifices imprimés, le quota) même
 * quand la condition de l'Invocation spéciale est remplie — sa défausse n'est
 * pas un péage obligatoire. `undefined` laisse le moteur décider. */
export function sacrificesInvocation(carte, duel = null, cote = null, specialeMoba = false, specialeForcee = undefined) {
  if (carte?.ascension) return carte.ascension.nombre;
  if (embuscade(duel, cote, carte, specialeMoba, specialeForcee)) return 0;
  if (!['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return 0;
  const cout = Number(carte.cost) || 0;
  return cout >= 7 ? 2 : cout >= 5 ? 1 : 0;
}
/** Classement des petites créatures selon leur coût imprimé. */
export function petiteCreatureMoba(carte) {
  const kind = carte?.kind ?? cardById(carte?.id)?.kind;
  const cout = Number(carte?.cost);
  return ['creature', 'hero'].includes(kind) && cout >= 1 && cout <= 4;
}
/** Invocation spéciale pendant son propre tour : en phase principale, si la
 * condition est remplie et qu'une place libre permet de poser sans sacrifice.
 * Sinon la carte reste disponible comme invocation normale. */
export function rpgInvocationSpecialeSurSonTour(duel, cote, carte) {
  const camp = duel?.[cote];
  if (!camp || duel.tour !== cote || !carte || !['creature', 'hero'].includes(carte.kind ?? cardById(carte.id)?.kind)
    || !camp.main.includes(carte.id) || !rpgCarteEmbuscade(carte)
    || !['principale', 'principale2'].includes(duel.phase) || duel.fenetreReponse
    || duel.finDeTour || duel.combatDeclare || duel.annonce || duel.arriveeEnAttente
    || duel.effetCreatureEnAttente || duel.destructionsEnAttente?.length
    || duel.defausseEnAttente || duel.siteEnAttente || duel.boualemEnAttente
    || duel.mobaCreatureEnAttente || duel.mobaSortEnAttente || duel.mobaRechercheEnAttente
    || duel.mobaReponseSuspendue || duel.mobaEmbuscadeArrivee || duel.moba?.centerChoice
    || duel.fin?.gagnant || duel.fin?.nul || duel.moba?.winner) return false;
  if (duel.modeMana === RPG_MODE_MANA_ESSAI && camp.creatures.length >= champMax(duel)) return false;
  return rpgConditionEmbuscadeCommune(duel, cote, carte);
}
function embuscade(duel, cote, carte, specialeMoba = false, specialeForcee = undefined) {
  if (specialeForcee !== undefined) return Boolean(specialeForcee);
  return Boolean(duel && cote && cote === duel.tour && (specialeMoba
    || (!duel.moba && rpgInvocationSpecialeSurSonTour(duel, cote, carte))));
}
/** Le quota d'invocation normale se tient par ligne : une mêlée ET une
 *  créature à distance par tour, pas une seule créature. */
export function ligneQuotaInvocation(carte) {
  return ligneDePose(carte) === RPG_LIGNE_FOND ? 'distance' : 'melee';
}
function lignesQuotaConsommees(duel, cote) {
  return duel?.moba ? duel.moba?.creaturesJoueesLignes?.[cote] : duel?.[cote]?.invocationsNormalesLignes;
}
export function limiteInvocationMoba(duel, cote, carte, specialeMoba = false, specialeForcee = undefined) {
  if (carte?.ascension) return null;
  if (!duel || !['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return null;
  if (embuscade(duel, cote, carte, specialeMoba, specialeForcee)) return null;
  const joue = duel.moba ? duel.moba.creaturesJouees?.[cote] : duel[cote]?.invocationNormaleJouee;
  if (!joue) return null;
  // Une mêlée puis une à distance : le quota ne ferme que la ligne déjà prise.
  // Sans détail de ligne (partie sauvegardée avant la règle), tout reste fermé.
  const lignes = lignesQuotaConsommees(duel, cote);
  if (!Array.isArray(lignes) || lignes.length === 0) return 'creature-limite';
  return lignes.includes(ligneQuotaInvocation(carte)) ? 'creature-limite' : null;
}
export function marquerInvocationMoba(duel, cote, carte, specialeMoba = false, specialeFixee = null) {
  if (carte?.ascension) return;
  if (!duel || !['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return;
  if (duel.moba) {
    const speciale = specialeFixee ?? embuscade(duel, cote, carte, specialeMoba);
    const quota = speciale ? 'embuscadesJouees' : 'creaturesJouees';
    (duel.moba[quota] ??= {})[cote] = true;
    if (!speciale) {
      const ligne = ligneQuotaInvocation(carte);
      duel.moba.creaturesJoueesLignes ??= {};
      duel.moba.creaturesJoueesLignes[cote] = [...new Set([...(duel.moba.creaturesJoueesLignes[cote] ?? []), ligne])];
    }
  } else if (!(specialeFixee ?? embuscade(duel, cote, carte, specialeMoba))) {
    duel[cote].invocationNormaleJouee = true;
    const ligne = ligneQuotaInvocation(carte);
    duel[cote].invocationsNormalesLignes = [...new Set([...(duel[cote].invocationsNormalesLignes ?? []), ligne])];
  }
}
export function victimesInvocation(camp) {
  return (camp?.creatures ?? []).filter(e => !e.attaquee && cardById(e.carteId)?.kind !== 'site');
}
/** Ce que la main peut défausser à la place d'un sacrifice : la fiche le dit
 *  cas par cas (`defausseSacrifice.types`), sinon toute créature en main. */
export function typesDefausseSacrifice(carte) {
  return carte?.defausseSacrifice?.types ?? ['creature'];
}
export function defausseSacrificeAdmissible(idMain, cartePosee) {
  const kind = cardById(idMain)?.kind;
  return kind != null && typesDefausseSacrifice(cartePosee).includes(kind);
}
/** La main du camp porte-t-elle de quoi payer la défausse (hors la carte jouée) ? */
export function defausseSacrificePossible(duel, cote, carte, nombre) {
  if (!nombre || !duel?.[cote]?.main) return false;
  const reste = [...duel[cote].main];
  const idxPose = reste.indexOf(carte.id ?? carte);
  if (idxPose >= 0) reste.splice(idxPose, 1);
  return reste.filter((id) => defausseSacrificeAdmissible(id, carte)).length >= nombre;
}
export function invocationPossible(duel, cote, carte, specialeMoba = false, specialeForcee = undefined) {
  if (!['creature', 'hero', 'site'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return true;
  const nombre = sacrificesInvocation(carte, duel, cote, specialeMoba, specialeForcee);
  const camp = duel[cote];
  if (carte?.ascension && (!camp?.reserveAscension?.includes(carte.id)
    || !combinaisonsAscension(camp, carte).length)) return false;
  if (limiteInvocationMoba(duel, cote, carte, specialeMoba, specialeForcee)) return false;
  const place = duel.modeMana !== RPG_MODE_MANA_ESSAI;
  const voieSacrifice = victimesInvocation(camp).length >= nombre
    && (place || camp.creatures.length - nombre < champMax(duel));
  // La défausse depuis la main paie le même nombre, sans vider le plateau :
  // il faut donc une case libre devant soi.
  const voieDefausse = nombre > 0 && defausseSacrificePossible(duel, cote, carte, nombre)
    && (place || camp.creatures.length < champMax(duel));
  return voieSacrifice || voieDefausse;
}
/** L'invocation **normale** reste offerte quand l'Invocation spéciale l'est
 *  aussi : la condition imprimée de la spéciale (défausser un Sabre maudit pour
 *  Tojiro) n'est pas un péage — le joueur qui préfère payer les sacrifices
 *  imprimés et son quota du tour garde ce choix. */
export function rpgInvocationNormalePossible(duel, cote, carte) {
  if (!duel?.[cote] || !carte?.id) return false;
  return invocationPossible(duel, cote, carte, false, false);
}
