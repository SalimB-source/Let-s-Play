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


/**
 * Le rechargement de secours — `tenterRechargementSecours`
 * -------------------------------------------------------
 * Les trois essais ci-dessus ne peuvent rien contre le cas le plus fréquent :
 * le site vient d'être redéployé, l'ancien nom du morceau (`RpgDuelPage-abc123.js`)
 * n'existe plus sur le serveur. Réessayer le MÊME nom ne peut pas marcher ;
 * il faut une **page neuve**, qui lira l'`index.html` à jour et ses nouveaux
 * noms de fichiers.
 *
 * D'où ce garde-fou : quand un morceau échoue pour de bon, on recharge une
 * fois, tout seul, sur une URL neuve (`?recharge=<horodatage>`, la seule forme
 * qu'une WebView accepte de relire). Le joueur ne voit alors qu'un clignotement
 * — plus jamais la carte d'erreur pour une simple mise à jour.
 *
 * La mémoire (`sessionStorage`) empêche la boucle : si le rechargement ramène
 * la même panne (serveur réellement en panne, `/assets/` bloqué par une
 * extension), on ne recharge pas une deuxième fois dans la foulée — la carte
 * d'erreur reprend la main, avec les explications et le bouton.
 */

/** Le paramètre qui force une URL neuve. */
export const PARAM_RECHARGE = 'recharge';

/** La clé de `sessionStorage` : l'horodatage du dernier rechargement automatique. */
export const CLE_MEMOIRE_RECHARGE = 'letsplay:recharge-jeu';

/** Deux échecs d'affilée dans ce délai : on ne recharge plus, on explique. */
export const DELAI_ENTRE_RECHARGEMENTS_MS = 3 * 60 * 1000;

/**
 * Vrai quand l'erreur vient d'un fichier du jeu qui n'est pas arrivé — et non
 * d'un bug du jeu lui-même. Les navigateurs ne disent pas la même chose :
 * Chrome/Vite « Failed to fetch dynamically imported module » ou
 * « error loading dynamically imported module », WebKit « Importing a module
 * script failed », webpack « ChunkLoadError », et un `<script>`/CSS qui tombe
 * donne « Loading chunk … failed » / « Unable to preload CSS ».
 */
export function estErreurDeMorceau(erreur) {
  if (!erreur) return false;
  const nom = typeof erreur.name === 'string' ? erreur.name : '';
  if (nom === 'ChunkLoadError') return true;
  const brut = String(erreur.message ?? erreur);
  return /dynamically imported module|Importing a module script failed|Loading (CSS )?chunk|ChunkLoadError|Unable to preload (CSS|module)|Importing a module script failed/i.test(brut);
}

/**
 * L'URL de secours : la même page, plus un paramètre **jamais vu**. On garde
 * les paramètres existants (une partie en cours, un code de défi) et le
 * fragment ; seul `recharge` change.
 */
export function urlRechargementSecours(href, marqueur = Date.now()) {
  try {
    const url = new URL(href);
    url.searchParams.set(PARAM_RECHARGE, String(marqueur));
    return url.toString();
  } catch {
    return String(href ?? '');
  }
}

/**
 * Tente le rechargement automatique. Rend `true` si la navigation est partie,
 * `false` si l'erreur ne s'y prête pas, si l'on a déjà rechargé il y a moins de
 * `delaiMs`, ou si l'environnement ne le permet pas (rendu de test, WebView
 * sans `location.replace`).
 *
 * Tout est injectable (`fenetre`, `stockage`, `maintenant`, `marqueur`) : ce
 * module reste pur, testable sans navigateur.
 */
export function tenterRechargementSecours({
  erreur = null,
  fenetre = typeof window === 'undefined' ? null : window,
  stockage = (() => { try { return globalThis.sessionStorage ?? null; } catch { return null; } })(),
  maintenant = () => Date.now(),
  delaiMs = DELAI_ENTRE_RECHARGEMENTS_MS,
  marqueur = null,
} = {}) {
  if (!estErreurDeMorceau(erreur)) return false;
  const location = fenetre?.location;
  const href = location?.href;
  if (typeof href !== 'string' || !href || typeof location.replace !== 'function') return false;
  const instant = maintenant();
  try {
    const memo = JSON.parse(stockage?.getItem?.(CLE_MEMOIRE_RECHARGE) || 'null');
    const dernier = Number(memo?.ts);
    if (Number.isFinite(dernier) && dernier > 0 && instant - dernier < delaiMs) return false;
  } catch {
    /* mémoire illisible : on ne bloque pas le joueur pour autant */
  }
  try {
    stockage?.setItem?.(CLE_MEMOIRE_RECHARGE, JSON.stringify({ ts: instant }));
  } catch {
    /* quota plein ou mode privé : la navigation reste la priorité */
  }
  location.replace(urlRechargementSecours(href, marqueur ?? instant));
  return true;
}
