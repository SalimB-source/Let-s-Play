/**
 * Le téléchargement d'un module de jeu, avec reprise — src/games/chargementJeu.js
 * ------------------------------------------------------------------------------
 * Un fichier du jeu (le morceau du duel pèse ~500 Ko) peut ne pas arriver :
 * connexion coupée une seconde, onglet mis en veille, redéploiement du site
 * pendant que la page était ouverte — l'ancien nom de fichier n'existe alors
 * plus sur le serveur. Sans reprise, `import()` rejette, React démonte la page
 * et le joueur ne voit **qu'un écran noir**.
 *
 * On retente donc la même importation quelques fois, en laissant un court
 * répit entre deux essais (le navigateur ne garde pas en cache une module
 * dont le téléchargement a échoué : le second essai refait vraiment la
 * requête). Au-delà, l'erreur remonte à `GameLoadBoundary`, qui explique au
 * joueur ce qui s'est passé et lui propose de recharger la page.
 *
 * Module pur — ni React ni DOM — pour être testable sans navigateur.
 */

/** Trois essais : deux reprises silencieuses, puis la main au joueur. */
export const TENTATIVES_CHARGEMENT = 3;

/**
 * Attend `ms` millisecondes. Isolé pour que les tests n'attendent pas pour de
 * vrai : ils passent leur propre `pause`.
 */
export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `importer` est une fonction qui rend la promesse d'un `import()` (on ne
 * passe pas l'importation elle-même : `import()` ne peut pas être réessayé
 * avec un cache vidé autrement qu'en l'appelant de nouveau).
 *
 * Options :
 *   - `tentatives` : nombre total d'essais (3 par défaut) ;
 *   - `attente` : délai du premier répit, doublé à chaque reprise (400 ms) ;
 *   - `pause` : injectée par les tests ;
 *   - `surNouvelEssai(essai, erreur)` : observateur (trace console).
 *
 * Rend le module importé, ou rejette avec la **dernière** erreur — c'est elle
 * qui a le plus de chances d'être la vraie cause (404 après redéploiement,
 * coupure réseau), pas la première.
 */
export async function importerAvecReprise(importer, {
  tentatives = TENTATIVES_CHARGEMENT,
  attente = 400,
  pause: attendre = pause,
  surNouvelEssai = () => {},
} = {}) {
  const total = Math.max(1, Math.floor(tentatives));
  let derniereErreur = null;
  for (let essai = 1; essai <= total; essai += 1) {
    try {
      return await importer();
    } catch (erreur) {
      derniereErreur = erreur;
      if (essai < total) {
        surNouvelEssai(essai, erreur);
        await attendre(attente * 2 ** (essai - 1));
      }
    }
  }
  throw derniereErreur;
}

/**
 * Le libellé affiché sous le message principal : le navigateur ne dit pas
 * grand-chose (« Failed to fetch dynamically imported module »), on préfère
 * une phrase utile au joueur.
 */
export function messageChargementJeu(erreur) {
  const brut = String(erreur?.message ?? erreur ?? '');
  if (/dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(brut)) {
    return 'Le fichier du jeu n’est pas arrivé : connexion interrompue, ou site mis à jour pendant que la page était ouverte.';
  }
  return brut || 'Erreur inconnue pendant le chargement du jeu.';
}
