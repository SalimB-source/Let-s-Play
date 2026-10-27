/** Une synchronisation bloquée ne doit pas empêcher l'accès au jeu hors ligne. */
export const RPG_SABLIER_DELAI_MS = 8000;

/**
 * Borne une requête et l'annule à l'expiration. L'annulation est importante
 * pour les écritures : une vieille sauvegarde ne doit pas continuer à arriver
 * après que le joueur a reçu son coffret en mode local.
 */
export async function avecDelaiSablier(requete, delai = RPG_SABLIER_DELAI_MS) {
  const controleur = new AbortController();
  let minuterie;
  const expiration = new Promise((_, refuser) => {
    minuterie = setTimeout(() => {
      controleur.abort();
      refuser(new Error('Délai de synchronisation du Sablier dépassé'));
    }, delai);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => requete(controleur.signal)), expiration]);
  } finally {
    clearTimeout(minuterie);
  }
}
