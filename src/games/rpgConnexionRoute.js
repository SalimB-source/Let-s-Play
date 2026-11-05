/** Routes où la connexion est demandée avant de monter le Sablier. */
export function estRouteConnexionSablier(pathname) {
  return /^\/jeu\/sablier-de-bab-el(?:\/defi(?:\/[^/]+)?)?\/?$/.test(pathname || '');
}

/** Même condition que le gate, y compris pendant la restauration de session. */
export function connexionSablierEnAttente(pathname, auth) {
  return estRouteConnexionSablier(pathname) && (!auth || auth.loading || !auth.session?.user);
}
