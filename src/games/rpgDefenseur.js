import { duelCardById } from './rpgCards.js';

/** Les Défenseurs attirent les attaques accessibles, même engagés ou gelés,
 * sauf celles des créatures avec Infiltration.
 * L'ancienne propriété des Tours reste reconnue dans les parties sauvegardées.
 * On filtre d'abord les cibles autrement légales : un Défenseur impossible à
 * viser ne doit pas rendre les autres cibles impossibles. Pour une frappe
 * directe en revanche, même un Défenseur inaccessible barre la voie à Envol,
 * sauf s’il est la seule créature adverse et possède Infiltration.
 */
// Les anciennes sauvegardes peuvent encore porter l'ancien marqueur : il
// représente désormais Défenseur, sans conserver ses anciennes règles.
export function estDefenseur(entite) {
  // Les anciennes parties ont enregistré les mots-clés imprimés directement
  // sur l'entité. Le Berserk et le Jarl au marteau ne possèdent plus leur
  // Défenseur imprimé ni l'ancien marqueur de Provocation : ils peuvent
  // toutefois recevoir Défenseur par un effet distinct.
  if (['berserk-des-trois-hivers', 'jarl-au-marteau-de-guerre'].includes(entite?.carteId ?? entite?.id)) {
    return Boolean(entite.defenseurAccorde || entite.prioriteAttaqueRapide);
  }
  return Boolean(entite?.defenseur || entite?.defenseurAccorde || entite?.prioriteAttaqueRapide || entite?.provocation
    // Une sauvegarde antérieure peut contenir un ancien instantané de la
    // carte : ses capacités imprimées actuelles restent applicables.
    || (entite?.carteId && duelCardById(entite.carteId)?.defenseur));
}

export function ciblesDefenseur(cibles = [], attaquant = null) {
  if (attaquant?.infiltration) return cibles;
  const defenseurs = cibles.filter(estDefenseur);
  return defenseurs.length ? defenseurs : cibles;
}

/** Une créature adverse avec Envol interdit la frappe directe *tant qu'une
 * cible reste atteignable* : le vol ne protège plus le sorcier, il protège
 * seulement les créatures qu'il rend intouchables. L'appelant fournit les
 * créatures du champ ou de la voie, sans Sites.
 *
 * `ciblesAtteignables` (facultatif) est la liste des créatures que CET
 * attaquant peut réellement viser, tous filtres déjà appliqués. Fournie et
 * vide, elle rend la frappe directe légale même face à un champ peuplé :
 * l'attaquant n'a plus aucune créature à portée, frapper le sorcier est sa
 * seule action. ABSENTE, la règle historique s'applique (une créature volante
 * suffit à interdire la frappe directe) pour les appelants qui n'ont pas
 * encore calculé l'atteignabilité.
 *
 * Sinon, champ vide, unique infiltrée ou Envol sans Défenseur autorisent la
 * frappe. */
export function attaqueDirectePermise(attaquant, creaturesAdverses = [], ciblesAtteignables = null) {
  if (Array.isArray(ciblesAtteignables) && ciblesAtteignables.length === 0) return true;
  if (creaturesAdverses.some((creature) => creature?.envol)) return false;
  return creaturesAdverses.length === 0
    || (creaturesAdverses.length === 1 && Boolean(creaturesAdverses[0]?.infiltration))
    || Boolean(attaquant?.envol && !creaturesAdverses.some(estDefenseur));
}
