import { duelCardById } from './rpgCards.js';

/** Les Défenseurs attirent les Attaques ciblées, même engagés ou gelés.
 * L'ancienne propriété des Tours reste reconnue dans les parties sauvegardées.
 * On filtre d'abord les cibles autrement légales : un Défenseur impossible à
 * viser ne doit pas rendre les autres cibles impossibles.
 */
// Les anciennes sauvegardes peuvent encore porter l'ancien marqueur : il
// représente désormais Défenseur, sans conserver ses anciennes règles.
export function estDefenseur(entite) {
  // Les anciennes parties ont enregistré les mots-clés imprimés directement
  // sur l'entité. Le Berserk ne possède plus Défenseur ni son ancien marqueur
  // de Provocation, mais peut toujours recevoir Défenseur par un autre effet.
  if (entite?.carteId === 'berserk-des-trois-hivers') {
    return Boolean(entite.defenseurAccorde || entite.prioriteAttaqueRapide);
  }
  return Boolean(entite?.defenseur || entite?.defenseurAccorde || entite?.prioriteAttaqueRapide || entite?.provocation
    // Une sauvegarde antérieure peut contenir un ancien instantané de la
    // carte : ses capacités imprimées actuelles restent applicables.
    || (entite?.carteId && duelCardById(entite.carteId)?.defenseur));
}

export function ciblesDefenseur(cibles = []) {
  const defenseurs = cibles.filter(estDefenseur);
  return defenseurs.length ? defenseurs : cibles;
}
