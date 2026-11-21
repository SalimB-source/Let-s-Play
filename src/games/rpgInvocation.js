import { combinaisonsAscension } from './rpgAscension.js';
import { rpgCarteEmbuscade, rpgConditionEmbuscadeCommune } from './rpgEmbuscade.js';
import { cardById } from './rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from './rpgManaEssai.js';
import { champMax, ligneDePose, RPG_LIGNE_FOND } from './rpgLignes.js';

/** Le prix d'une invocation n'est plus un sacrifice : la créature de 5 étoiles
 *  ou plus **remet une carte de la main dans le deck** — deux cartes à partir
 *  de 7. Le plateau n'est jamais vidé, et l'Invocation spéciale à son tour ne
 *  paie ni ce retour ni le quota.
 *
 * `specialeForcee` tranche le choix quand le joueur l'a déjà fait : `false`
 * garde l'invocation **normale** (les retours imprimés, le quota) même quand la
 * condition de l'Invocation spéciale est remplie — sa défausse n'est pas un
 * péage obligatoire. `undefined` laisse le moteur décider. */
export function retoursAuDeckInvocation(carte, duel = null, cote = null, specialeMoba = false, specialeForcee = undefined) {
  if (carte?.ascension) return 0;
  if (embuscade(duel, cote, carte, specialeMoba, specialeForcee)) return 0;
  if (!['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return 0;
  const cout = Number(carte.cost) || 0;
  return cout >= 7 ? 2 : cout >= 5 ? 1 : 0;
}
/** Ce que l'Ascension exige encore du plateau : ses matériaux sont des corps. */
export function sacrificesInvocation(carte, duel = null, cote = null, specialeMoba = false, specialeForcee = undefined) {
  return carte?.ascension ? carte.ascension.nombre : 0;
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
/** Ce que la main peut remettre dans le deck : la fiche le dit cas par cas
 *  (`retourDeck.types`), sinon toute créature en main. */
export function typesRetourDeck(carte) {
  return carte?.retourDeck?.types ?? carte?.defausseSacrifice?.types ?? ['creature'];
}
export function retourDeckAdmissible(idMain, cartePosee) {
  const kind = cardById(idMain)?.kind;
  return kind != null && typesRetourDeck(cartePosee).includes(kind);
}
/** La main du camp porte-t-elle de quoi payer le retour au deck (hors la carte jouée) ? */
export function retourDeckPossible(duel, cote, carte, nombre) {
  if (!nombre || !duel?.[cote]?.main) return false;
  const reste = [...duel[cote].main];
  const idxPose = reste.indexOf(carte.id ?? carte);
  if (idxPose >= 0) reste.splice(idxPose, 1);
  return reste.filter((id) => retourDeckAdmissible(id, carte)).length >= nombre;
}
export function invocationPossible(duel, cote, carte, specialeMoba = false, specialeForcee = undefined) {
  if (!['creature', 'hero', 'site'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return true;
  const camp = duel[cote];
  if (carte?.ascension) {
    const corps = sacrificesInvocation(carte);
    return camp?.reserveAscension?.includes(carte.id)
      && combinaisonsAscension(camp, carte).length > 0
      && victimesInvocation(camp).length >= corps
      && (duel.modeMana !== RPG_MODE_MANA_ESSAI || camp.creatures.length - corps < champMax(duel));
  }
  if (limiteInvocationMoba(duel, cote, carte, specialeMoba, specialeForcee)) return false;
  const nombre = retoursAuDeckInvocation(carte, duel, cote, specialeMoba, specialeForcee);
  if (!nombre) return true;
  // Le prix se paie **depuis la main** : le plateau ne se vide plus, il faut
  // donc une case libre devant soi.
  return retourDeckPossible(duel, cote, carte, nombre)
    && (duel.modeMana !== RPG_MODE_MANA_ESSAI || camp.creatures.length < champMax(duel));
}
/** L'invocation **normale** reste offerte quand l'Invocation spéciale l'est
 *  aussi : la condition imprimée de la spéciale (défausser un Sabre maudit pour
 *  Tojiro) n'est pas un péage — le joueur qui préfère payer les retours au deck
 *  imprimés et son quota du tour garde ce choix. */
export function rpgInvocationNormalePossible(duel, cote, carte) {
  if (!duel?.[cote] || !carte?.id) return false;
  return invocationPossible(duel, cote, carte, false, false);
}
