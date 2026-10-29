/**
 * La relance de mise à jour du site.
 *
 * Deux choses à tenir, et deux seulement :
 *
 *   1. **le protocole** — `version.json` est écrit au build avec l'identité du
 *      déploiement, le bundle porte la même identité, et la comparaison ne dit
 *      « nouvelle version » que si elles diffèrent vraiment (jamais en
 *      développement, jamais quand la réponse est illisible) ;
 *   2. **la veille** — une vérification au lancement, une à chaque retour sur
 *      l'onglet, une toutes les quinze minutes, et une seule annonce par
 *      identifiant distant : « Plus tard » ne doit pas rouvrir le panneau en
 *      boucle.
 *
 * Le rechargement, lui, passe par une URL neuve (`?maj=<buildId>`) : c'est la
 * seule façon de faire relire `index.html` à une WebView qui l'a en cache.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BUILD_ID,
  DELAI_PREMIERE_VERIF_MS,
  INTERVALLE_VERIF_MS,
  demarrerVeilleMaj,
  estNouvelleVersion,
  lireVersionDistante,
  rechargerMaintenant,
  urlRechargement,
  urlVersion,
} from '../src/updates/maj-site.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (...parties) => fs.readFileSync(path.join(ROOT, ...parties), 'utf8');

const viteConfig = lire('vite.config.js');
const mainJsx = lire('src/main.jsx');
const composant = lire('src/components/MiseAJourDisponible.jsx');
const css = lire('src/components/mise-a-jour.css');
const desktop = lire('desktop/main.js');
const pkg = JSON.parse(lire('package.json'));

/** Réponse minimale, à la `fetch`. */
const reponse = (corps, { ok = true, statut = 200 } = {}) => ({
  ok,
  status: statut,
  json: async () => {
    if (corps instanceof Error) throw corps;
    return corps;
  },
});

/** Un ordonnanceur de poche : on déclenche les tâches à la main. */
function minuteurFactice() {
  let suivant = 0;
  const taches = new Map();
  const ajouter = (type) => (fn) => {
    suivant += 1;
    taches.set(suivant, { fn, type });
    return suivant;
  };
  return {
    taches,
    setTimeout: ajouter('timeout'),
    setInterval: ajouter('interval'),
    clearTimeout: (id) => taches.delete(id),
    clearInterval: (id) => taches.delete(id),
    /** Lance toutes les tâches programmées, dans l'ordre. */
    async lancerTout() {
      for (const tache of [...taches.values()]) await tache.fn();
    },
  };
}

test('le build grave son identité dans le bundle et dans version.json', () => {
  assert.match(viteConfig, /__BUILD_ID__:\s*JSON\.stringify\(buildId\)/,
    'le bundle doit connaître l’identité du build qu’il contient');
  assert.match(viteConfig, /fileName: 'version\.json'/, 'la sortie doit contenir version.json');
  assert.match(viteConfig, /Cache-Control',\s*'no-store, max-age=0'/,
    'version.json ne doit jamais être servi depuis un cache');
  assert.match(viteConfig, /VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA'/,
    'en CI, l’identité est le commit : deux déploiements du même commit ne se signalent pas');
  assert.match(viteConfig, /configureServer\(server\)\s*\{\s*server\.middlewares\.use\(servir\);\s*\}/,
    'en développement aussi, /version.json doit répondre');
});

test('le panneau est monté à la racine, pas dans une page', () => {
  assert.match(mainJsx, /import MiseAJourDisponible from '\.\/components\/MiseAJourDisponible';/);
  assert.match(mainJsx, /<MiseAJourDisponible \/>/,
    'le panneau vit à la racine : il doit parler pendant un duel comme sur l’accueil');
  assert.match(composant, /veille = demarrerVeilleMaj/, 'la veille est celle du module, injectable pour les tests');
  assert.match(composant, /return veille\(\{/, 'le composant branche la veille');
  assert.match(composant, /rechargerMaintenant\(version\.buildId\)/, 'le bouton recharge sur le build distant');
  assert.match(composant, /role="dialog"/, 'le panneau est un dialogue accessible');
  assert.match(composant, /dev = Boolean\(import\.meta\.env\?\.DEV\)/,
    'en développement, la veille est coupée : l’identité change à chaque démarrage');
  assert.match(composant, /if \(dev\) return undefined;/);
  assert.match(css, /\.maj-site__panneau\s*\{/);
  assert.match(css, /\.maj-site__pastille\s*\{[\s\S]*?position:\s*fixed/,
    'après « Plus tard », le rappel reste discret et ne couvre rien');
});

test('deux identités différentes font une nouvelle version — et rien d’autre', () => {
  assert.equal(estNouvelleVersion({ buildId: 'abc123' }, 'def456'), true);
  assert.equal(estNouvelleVersion({ buildId: 'abc123' }, 'abc123'), false, 'même build : rien à faire');
  assert.equal(estNouvelleVersion({ buildId: 'abc123' }, 'dev'), false, 'en développement, jamais');
  assert.equal(estNouvelleVersion({ buildId: 'abc123' }, 'local-1793280000000'), false,
    'un build local n’est pas comparable à un déploiement');
  assert.equal(estNouvelleVersion(null, 'abc123'), false);
  assert.equal(estNouvelleVersion({ buildId: '   ' }, 'abc123'), false);
  assert.equal(estNouvelleVersion({ buildId: 'abc123' }, ''), false);
});

test('version.json est lu sans cache, et un échec ne lève pas', async () => {
  const appels = [];
  const json = await lireVersionDistante({
    baseUrl: '/Let-s-Play/',
    fetchImpl: async (url, options) => {
      appels.push({ url, options });
      return reponse({ buildId: 'abc123', builtAt: '2026-10-29T14:23:06.000Z' });
    },
    maintenant: () => 42,
    Controleur: undefined,
  });
  assert.equal(urlVersion('/Let-s-Play/'), '/Let-s-Play/version.json');
  assert.equal(appels[0].url, '/Let-s-Play/version.json?v=42', 'l’URL porte un jeton anti-cache');
  assert.equal(appels[0].options.cache, 'no-store');
  assert.deepEqual(json, { buildId: 'abc123', builtAt: '2026-10-29T14:23:06.000Z' });

  const echecs = [
    async () => reponse({ buildId: 'abc123' }, { ok: false, statut: 404 }),
    async () => reponse(new SyntaxError('JSON cassé')),
    async () => { throw new TypeError('Failed to fetch'); },
    async () => reponse({}),
    async () => reponse({ buildId: 42 }),
  ];
  for (const fetchImpl of echecs) {
    assert.equal(await lireVersionDistante({ fetchImpl, Controleur: undefined }), null,
      'une vérification ratée est une vérification sans réponse, pas une erreur');
  }
});

test('la veille annonce une nouvelle version une seule fois par build', async () => {
  // Deux lectures par passage (la vérification du lancement et le battement).
  const builds = ['111111', '111111', '222222', '222222'];
  const annonces = [];
  const horloge = minuteurFactice();
  let appel = 0;

  const arreter = demarrerVeilleMaj({
    baseUrl: '/',
    locale: '000000',
    fetchImpl: async () => reponse({ buildId: builds[Math.min(appel++, builds.length - 1)] }),
    onNouvelleVersion: (distante) => annonces.push(distante.buildId),
    documentRef: null,
    minuterie: horloge,
  });

  assert.equal(horloge.taches.size, 2, 'une vérification au lancement, puis un battement');
  assert.ok(DELAI_PREMIERE_VERIF_MS > 0 && INTERVALLE_VERIF_MS >= 5 * 60 * 1000);

  await horloge.lancerTout();          // lancement + battement
  assert.deepEqual(annonces, ['111111'], 'le second passage voit le même build : silence');

  await horloge.lancerTout();          // 222222
  assert.deepEqual(annonces, ['111111', '222222'], 'un build différent se signale');

  await horloge.lancerTout();          // toujours 222222
  assert.deepEqual(annonces, ['111111', '222222'], 'pas de rappel en boucle');

  arreter();
  assert.equal(horloge.taches.size, 0, 'l’arrêt coupe toutes les minuteries');
});

test('le rechargement passe par une URL neuve', () => {
  const cible = urlRechargement('abc123', 'https://let-s-play-nu.vercel.app/jeu/sablier-de-bab-el?x=1');
  const url = new URL(cible);
  assert.equal(url.searchParams.get('maj'), 'abc123');
  assert.equal(url.searchParams.get('x'), '1', 'les paramètres existants sont conservés');
  assert.equal(url.pathname, '/jeu/sablier-de-bab-el', 'on reste sur la page courante');

  const appels = [];
  const fenetre = { location: { href: cible, replace: (vers) => appels.push(vers) } };
  assert.equal(rechargerMaintenant('def456', fenetre), true);
  assert.match(appels[0], /maj=def456/);
  assert.equal(rechargerMaintenant('abc', null), false, 'sans fenêtre, rien ne casse');
});

test('le PC vérifie aussi que le paquet embarqué n’est pas plus vieux que le site', () => {
  assert.match(desktop, /function configurerVerificationSite\(\)/,
    'la coque PC compare son paquet au site au lancement');
  assert.match(desktop, /REMOTE_ORIGIN}\/version\.json\?v=\$\{Date\.now\(\)\}/,
    'la coque PC relit version.json sans cache');
  assert.match(desktop, /if \(response === 0\) basculerEnLigne\(\);/,
    'le joueur peut choisir de jouer la version en ligne');
  assert.match(desktop, /planifierVerificationMaj\(2000\)/,
    'la vérification de l’installateur se fait tôt, pendant que le joueur est au menu');
  assert.match(desktop, /planifierVerificationMaj\(60000\)/,
    'un démarrage hors ligne est réessayé une fois, en silence');
});

test('un script dédié vérifie la relance', () => {
  assert.equal(
    pkg.scripts['check:maj-version'],
    'node --test tests/maj-version.test.js tests/maj-version-ui.test.js',
  );
  assert.match(pkg.scripts['check:rpg'], /tests\/maj-version\.test\.js/,
    'la relance de mise à jour entre dans la suite Sablier');
  assert.equal(BUILD_ID, 'dev', 'hors bundle, l’identité vaut « dev » : la veille se tait');
});
