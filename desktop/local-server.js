/**
 * Serveur local du Sablier de Bab El — desktop/local-server.js
 * -----------------------------------------------------------
 * La coque PC ne charge **pas** le jeu en `file://`. Elle démarre un minuscule
 * serveur HTTP écoutant sur `127.0.0.1` (un port libre choisi par le système)
 * et la fenêtre Electron ouvre `http://127.0.0.1:<port>/jeu/sablier-de-bab-el`.
 *
 * Pourquoi un serveur plutôt qu'un fichier local :
 *
 *   - **Le routage** : l'app utilise `BrowserRouter` (`src/main.jsx`) — des
 *     URLs propres comme `/jeu/sablier-de-bab-el`. En `file://`, recharger une
 *     route ou partager une URL profonde casse. Ici, toute route sans extension
 *     renvoie `index.html` et React Router reprend la main.
 *   - **Le contexte de sécurité** : `127.0.0.1` est une « origine sûre » pour
 *     Chromium. Le WebAudio, `localStorage` (les decks et la progression du
 *     joueur y vivent) et les appels micro/caméra fonctionnent ; en `file://`
 *     l'origine est opaque et une partie de tout cela est refusée.
 *   - **L'origine stable** : `localStorage` est cloisonné par origine. Un port
 *     aléatoire changerait l'origine… d'où le port **fixe par défaut** (4173)
 *     et un repli sur un port libre seulement si 4173 est déjà pris — le
 *     joueur retrouve alors ses decks, mais une deuxième installation lancée en
 *     parallèle ne partage pas la progression.
 *   - **Supabase** : le compte, les duels en ligne, le souk et la synchronisation
 *     des decks (`rpgSablierRemote.js`) parlent à `https://<projet>.supabase.co`
 *     depuis l'origine locale — une simple requête CORS sortante, inchangée par
 *     rapport au site.
 *
 * Le serveur ne fait rien d'autre que servir des fichiers, avec deux règles :
 *
 *   1. un chemin **sans extension** = une route de l'app → `index.html` ;
 *   2. un fichier **absent** du paquet local (les images d'actus, par exemple,
 *      non embarquées pour garder l'installeur léger) est cherché sur le site en
 *      ligne — le jeu hors ligne ne perd donc rien, et le reste de l'app reste
 *      utilisable quand Internet est là.
 *
 * Ce module est volontairement sans Electron : `node desktop/local-server.js`
 * le démarre seul (pratique pour vérifier un paquet dans un navigateur), et
 * `scripts/desktop-check.mjs` le teste.
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { extname, join, normalize, resolve, sep } from 'node:path';

/** Port par défaut. Fixe pour que l'origine (donc `localStorage`) le soit. */
export const DEFAULT_PORT = 4173;

/** Hôte d'écoute : la boucle locale uniquement, jamais le réseau. */
const HOST = '127.0.0.1';

/** Origine en ligne de repli (même site que l'APK Android). */
export const DEFAULT_REMOTE_ORIGIN = 'https://let-s-play-nu.vercel.app';

/** Routes de l'app servies par `index.html` même si aucun fichier ne correspond. */
const ROUTE_RACINE = '/jeu/sablier-de-bab-el';

/** Types MIME des fichiers servis. Tout ce qui manque part en
 * `application/octet-stream` (le navigateur télécharge au lieu d'afficher). */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.wasm': 'application/wasm',
};

/** Extensions jamais demandées au site en ligne : si elles manquent dans le
 * paquet local, c'est que le paquet est cassé — un 404 franc vaut mieux qu'un
 * fichier du site qui n'a rien à voir. */
const SANS_REPLI_DISTANT = new Set(['.js', '.mjs', '.css', '.html', '.map', '.wasm']);

/**
 * Démarre le serveur.
 *
 * @param {object} options
 * @param {string} options.distDir      dossier du paquet web (`desktop/app`).
 * @param {string} [options.remoteOrigin] site en ligne de repli ; `''` désactive le repli.
 * @param {number} [options.port]       port demandé (défaut `DEFAULT_PORT`).
 * @param {(message: string) => void} [options.log]
 * @param {() => object} [options.getStatus] état ajouté à `/__desktop/status`.
 * @returns {Promise<{port: number, origin: string, url: (path?: string) => string, close: () => Promise<void>}>}
 */
export async function startLocalServer({
  distDir,
  remoteOrigin = DEFAULT_REMOTE_ORIGIN,
  port = DEFAULT_PORT,
  host = HOST,
  log = () => {},
  getStatus = () => ({}),
} = {}) {
  const racine = resolve(distDir);
  if (!existsSync(join(racine, 'index.html'))) {
    throw new Error(
      `Paquet web introuvable : ${join(racine, 'index.html')} manque. `
      + 'Lancez d’abord `npm run desktop:web` (voir desktop/README.md).',
    );
  }

  const serveur = createServer((req, res) => {
    traiter(req, res).catch((erreur) => {
      log(`[desktop] erreur ${req.url} : ${erreur?.message || erreur}`);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Erreur interne du serveur local.');
    });
  });

  async function traiter(req, res) {
    const url = new URL(req.url, `http://${host}`);
    const chemin = decodeURIComponent(url.pathname);

    // Point d'état pour le panneau de diagnostic et les vérifications.
    if (chemin === '/__desktop/status') {
      return repondreJson(res, 200, {
        ok: true,
        mode: 'local',
        paquet: racine,
        repliDistant: remoteOrigin || null,
        route: ROUTE_RACINE,
        ...getStatus(),
      });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' });
      return res.end();
    }

    const cible = resoudreDansPaquet(racine, chemin);

    // 1) Fichier présent dans le paquet → on le sert.
    if (cible) {
      return servirFichier(res, req, cible, chemin);
    }

    // 2) Chemin sans extension → route de l'app : `index.html` laisse React
    //    Router décider (le jeu, l'atelier de decks, le souk…).
    if (!extname(chemin)) {
      return servirFichier(res, req, join(racine, 'index.html'), '/', {
        cache: 'no-cache',
      });
    }

    // 3) Fichier absent (image d'actu non embarquée…) → site en ligne, si le
    //    repli est activé et que ce n'est pas un fichier de code.
    const extension = extname(chemin).toLowerCase();
    if (remoteOrigin && !SANS_REPLI_DISTANT.has(extension)) {
      const relaye = await relayerDepuisLeSite(remoteOrigin, chemin, req, res, log);
      if (relaye) return undefined;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('404 — fichier absent du paquet local.');
  }

  // Le port demandé peut être pris (deux installations, un `vite preview` qui
  // tourne déjà) : on essaie le port demandé, puis le système choisit.
  const portUtilise = await ecouter(serveur, port, host);
  const origin = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${portUtilise}`;

  return {
    port: portUtilise,
    origin,
    url: (chemin = '/') => `${origin}${chemin.startsWith('/') ? chemin : `/${chemin}`}`,
    close: () => new Promise((fin) => serveur.close(() => fin())),
  };
}

/** Tente `port`, puis un port libre si celui-là est occupé. */
function ecouter(serveur, port, host) {
  return new Promise((fin, echec) => {
    serveur.once('error', (erreur) => {
      if (erreur?.code !== 'EADDRINUSE') return echec(erreur);
      serveur.once('error', echec);
      serveur.listen(0, host, () => fin(serveur.address().port));
      return undefined;
    });
    serveur.listen(port, host, () => fin(serveur.address().port));
  });
}

/**
 * Traduit un chemin d'URL en fichier du paquet, **sans jamais en sortir**.
 * `..`, `%2e%2e`, chiffres absolus et octets nuls sont neutralisés : le serveur
 * n'écoute que sur la boucle locale, mais un lien piégé dans la page ne doit pas
 * pouvoir lire `C:\Users\…` pour autant.
 *
 * @returns {string|null} chemin absolu du fichier, ou `null` s'il n'existe pas.
 */
export function resoudreDansPaquet(racine, cheminUrl) {
  if (!cheminUrl || cheminUrl.includes('\0')) return null;
  const relatif = normalize(cheminUrl).replace(/^([/\\])+/, '');
  const cible = resolve(racine, relatif.split('/').join(sep));
  if (cible !== racine && !cible.startsWith(racine + sep)) return null;

  try {
    const etat = statSync(cible);
    if (etat.isDirectory()) {
      const index = join(cible, 'index.html');
      return existsSync(index) ? index : null;
    }
    return etat.isFile() ? cible : null;
  } catch {
    return null;
  }
}

/** Sert un fichier du disque (flux, pas de mise en mémoire : les musiques de
 * plateau font 3 à 7 Mo, les vidéos du site davantage). */
function servirFichier(res, req, fichier, chemin, { cache } = {}) {
  const extension = extname(fichier).toLowerCase();
  const entetes = {
    'content-type': MIME[extension] || 'application/octet-stream',
    // Les fichiers de build sont hachés (`assets/index-a1b2c3.js`) : ils ne
    // changent jamais de contenu, on les cache définitivement. `index.html`,
    // lui, doit être relu à chaque lancement.
    'cache-control': cache
      || (chemin.startsWith('/assets/') || extension === '.map'
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'),
  };

  let taille = 0;
  try {
    taille = statSync(fichier).size;
  } catch {
    res.writeHead(404);
    return res.end();
  }
  entetes['accept-ranges'] = 'bytes';

  const plage = req.headers?.range;
  if (typeof plage === 'string' && plage.startsWith('bytes=') && taille > 0) {
    const correspondance = /^bytes=(\d*)-(\d*)$/.exec(plage.trim());
    if (!correspondance || (!correspondance[1] && !correspondance[2])) {
      res.writeHead(416, { ...entetes, 'content-range': `bytes */${taille}` });
      return res.end();
    }
    const debut = correspondance[1]
      ? Number.parseInt(correspondance[1], 10)
      : Math.max(0, taille - Number.parseInt(correspondance[2], 10));
    const finDemandee = correspondance[1] && correspondance[2]
      ? Number.parseInt(correspondance[2], 10)
      : taille - 1;
    const fin = Math.min(finDemandee, taille - 1);
    if (!Number.isFinite(debut) || !Number.isFinite(fin) || debut >= taille || debut > fin) {
      res.writeHead(416, { ...entetes, 'content-range': `bytes */${taille}` });
      return res.end();
    }
    entetes['content-range'] = `bytes ${debut}-${fin}/${taille}`;
    entetes['content-length'] = String(fin - debut + 1);
    if (req.method === 'HEAD') {
      res.writeHead(206, entetes);
      return res.end();
    }
    res.writeHead(206, entetes);
    const fluxPartiel = createReadStream(fichier, { start: debut, end: fin });
    fluxPartiel.on('error', () => res.destroy());
    fluxPartiel.pipe(res);
    return undefined;
  }

  entetes['content-length'] = String(taille);

  if (req.method === 'HEAD') {
    res.writeHead(200, entetes);
    return res.end();
  }
  res.writeHead(200, entetes);
  const flux = createReadStream(fichier);
  flux.on('error', () => res.destroy());
  flux.pipe(res);
  return undefined;
}

/**
 * Récupère un fichier manquant sur le site en ligne et le renvoie tel quel.
 * @returns {Promise<boolean>} `true` si la réponse a été envoyée.
 */
async function relayerDepuisLeSite(remoteOrigin, chemin, req, res, log) {
  const cible = `${remoteOrigin.replace(/\/+$/, '')}${chemin}`;
  try {
    const reponse = await fetch(cible, {
      method: 'GET',
      redirect: 'follow',
      // Ni cookies ni en-têtes du joueur : le repli ne sert que des fichiers
      // publics (images, sons). `Set-Cookie` du site est ignoré au retour.
      headers: { accept: req.headers.accept || '*/*' },
      signal: AbortSignal.timeout(15000),
    });
    if (!reponse.ok || !reponse.body) return false;

    const entetes = { 'cache-control': 'public, max-age=86400' };
    const type = reponse.headers.get('content-type');
    if (type) entetes['content-type'] = type;
    const longueur = reponse.headers.get('content-length');
    if (longueur) entetes['content-length'] = longueur;

    if (req.method === 'HEAD') {
      res.writeHead(200, entetes);
      res.end();
      return true;
    }
    res.writeHead(200, entetes);
    Readable.fromWeb(reponse.body).pipe(res);
    return true;
  } catch (erreur) {
    // Hors ligne : ce n'est pas une erreur, juste un fichier non disponible.
    log(`[desktop] repli distant impossible pour ${chemin} : ${erreur?.message || erreur}`);
    return false;
  }
}

/** Réponse JSON courte (état, erreurs). */
function repondreJson(res, code, objet) {
  const corps = JSON.stringify(objet, null, 2);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(corps),
    'cache-control': 'no-store',
  });
  res.end(corps);
}

// ---------------------------------------------------------------------------
// Lancement seul : `node desktop/local-server.js [port] [distDir]`
// Ouvre le paquet web dans n'importe quel navigateur — utile pour vérifier un
// build avant de construire l'installeur, ou pour jouer sans Electron.
// ---------------------------------------------------------------------------
const lanceSeul = process.argv[1] && resolve(process.argv[1]).endsWith('local-server.js');
if (lanceSeul) {
  const portDemande = Number(process.argv[2] || process.env.PORT || DEFAULT_PORT);
  // Sans argument : le paquet construit par `npm run desktop:web`
  // (desktop/dist-web), sinon desktop/app si on l'a déplacé là.
  const defaut = [join(import.meta.dirname, 'dist-web'), join(import.meta.dirname, 'app')]
    .find((dossier) => existsSync(join(dossier, 'index.html')));
  const paquet = resolve(process.argv[3] || defaut || join(import.meta.dirname, 'dist-web'));
  // `LETSPLAY_HOST=0.0.0.0` ouvre l'aperçu au réseau (aperçu live du sandbox,
  // test depuis un autre appareil). Sans cela : boucle locale seulement.
  const hote = process.env.LETSPLAY_HOST || HOST;
  startLocalServer({
    distDir: paquet,
    port: portDemande,
    host: hote,
    remoteOrigin: process.env.LETSPLAY_REMOTE_ORIGIN ?? DEFAULT_REMOTE_ORIGIN,
    log: (message) => console.log(message),
  }).then((serveur) => {
    console.log(`Sablier de Bab El — paquet local servi sur ${serveur.origin} (hôtesse : ${hote})`);
    console.log(`Jeu : ${serveur.url(ROUTE_RACINE)}`);
    if (hote !== HOST) console.log('Écoute ouverte au réseau : ne jamais lancer ainsi depuis la coque.');
    console.log('Ctrl+C pour arrêter.');
  }).catch((erreur) => {
    console.error(erreur?.message || erreur);
    process.exit(1);
  });
}
