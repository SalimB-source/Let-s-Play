/**
 * Vérification des miniatures YouTube — `npm run check:thumbs`.
 *
 * YouTube ne publie pas `maxresdefault.jpg` pour toutes les vidéos : l'URL
 * répond 404 et la carte reste sans image. C'était le cas du FreeFire Algerian
 * Championship 2023 (`twbaM8fiXpo`) affiché en épisode partenaire sur l'accueil.
 *
 * Quatre niveaux de contrôle, sans navigateur :
 *
 *   1. l'échelle des qualités (URL, ordre, dernier barreau toujours présent) ;
 *   2. le pilote de repli `createThumbFallback`, rejoué avec une image simulée :
 *      chaque qualité manquante fait descendre d'un cran, la dernière fait
 *      basculer l'afficheur sur son cadre de repli ;
 *   3. le rendu réel des pages (SSR) : l'URL demandée pour chaque carte, et
 *      surtout aucune requête vers une qualité connue absente ;
 *   4. la source du site : aucune URL de miniature codée en dur hors de
 *      `src/lib/videoThumbnails.js`, et les deux chemins du repli
 *      (`onError` + `isThumbMissing`) toujours présents dans l'afficheur.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  THUMB_QUALITIES,
  THUMB_BASELINE,
  VIDEOS_WITHOUT_HD_THUMB,
  youTubeThumbUrl,
  thumbFallbackChain,
  isThumbMissing,
  createThumbFallback,
} from '../src/lib/videoThumbnails.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? ` → ${actual}` : ` → ${actual} (attendu : ${expected})`}`);
}

const HD = 'twbaM8fiXpo'; // vidéo sans miniature HD (maxresdefault → 404)
const WITH_HD = 'aTs0zhm6Leg'; // épisode HicoSoft : maxresdefault disponible
const qualityOf = (src) => /\/([^/]+)\.jpg$/.exec(src)?.[1] ?? null;

/* ------------------------------------------------- 1. Échelle des qualités */

console.log('\n[1/4] URL et échelle des qualités YouTube\n');

check('URL par défaut (meilleure qualité)', youTubeThumbUrl('abc123'), 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
check('alias hq', youTubeThumbUrl('abc123', 'hq'), 'https://i.ytimg.com/vi/abc123/hqdefault.jpg');
check('alias maxres', youTubeThumbUrl('abc123', 'maxres'), 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
check('qualité inconnue ignorée', youTubeThumbUrl('abc123', 'ultra'), 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
check('échelle complète, du meilleur au plus sûr', thumbFallbackChain(WITH_HD).map(qualityOf).join(' > '), THUMB_QUALITIES.join(' > '));
check('qualité demandée = départ de la chaîne', thumbFallbackChain(WITH_HD, { quality: 'sd' }).map(qualityOf).join(' > '), 'sddefault > hqdefault');
check('le dernier barreau est toujours hqdefault', thumbFallbackChain(WITH_HD).at(-1), youTubeThumbUrl(WITH_HD, THUMB_BASELINE));
check('chaîne jamais vide', thumbFallbackChain(WITH_HD, { quality: 'hq' }).length, 1);

console.log('\n  vidéos connues sans miniature HD (aucune requête vouée au 404)\n');
for (const [id, trace] of Object.entries(VIDEOS_WITHOUT_HD_THUMB)) {
  const chain = thumbFallbackChain(id);
  check(`${id} : chaîne`, chain.map(qualityOf).join(' > '), THUMB_BASELINE);
  check(`${id} : aucune URL maxresdefault`, chain.filter((src) => src.includes('maxresdefault')).length, 0);
  console.log(`       └ ${trace}`);
}

/* ------------------------------------------------------ 2. Pilote de repli */

console.log('\n[2/4] le pilote descend l’échelle, puis bascule sur le cadre de repli\n');

/**
 * Rejoue la boucle de l'afficheur : source chargée → image vide ? on descend.
 * Une qualité absente est simulée par une image complète sans pixels, soit
 * exactement ce que laisse un 404 servi depuis le cache (`isThumbMissing`).
 */
function browse(id, { quality, available } = {}) {
  const published = [];
  const thumb = createThumbFallback(id, { quality, onChange: (state) => published.push({ ...state }) });
  const requested = [];
  for (let guard = 0; guard < THUMB_QUALITIES.length + 1 && !thumb.failed; guard += 1) {
    const src = thumb.src;
    requested.push(qualityOf(src));
    const img = available.has(qualityOf(src))
      ? { complete: true, naturalWidth: 1280 }
      : { complete: true, naturalWidth: 0 };
    if (!isThumbMissing(img)) break;
    thumb.reportMissing();
  }
  return { requested, src: thumb.src, failed: thumb.failed, published };
}

const allMissing = browse(WITH_HD, { available: new Set() });
check('tout manque : les trois qualités sont essayées', allMissing.requested.join(' > '), THUMB_QUALITIES.join(' > '));
check('tout manque : l’afficheur passe en échec', allMissing.failed, true);
check('tout manque : plus aucune URL à charger', allMissing.src, null);
check('chaque repli est publié à l’afficheur', allMissing.published.length, 3);

const onlyHq = browse(WITH_HD, { available: new Set(['hqdefault']) });
check('maxres et sd absents : on finit sur hqdefault', onlyHq.src, youTubeThumbUrl(WITH_HD, THUMB_BASELINE));
check('… sans déclarer d’échec', onlyHq.failed, false);

const hdAvailable = browse(WITH_HD, { available: new Set(THUMB_QUALITIES) });
check('maxres disponible : une seule requête', hdAvailable.requested.length, 1);
check('… et c’est la meilleure qualité', qualityOf(hdAvailable.src), 'maxresdefault');

const noHdVideo = browse(HD, { available: new Set(['hqdefault']) });
check(`${HD} : aucune requête maxresdefault envoyée`, noHdVideo.requested.join(','), 'hqdefault');
check(`${HD} : la vignette s’affiche`, noHdVideo.failed, false);

const deadVideo = browse('videoSupprimee', { available: new Set() });
check('vidéo retirée de YouTube : cadre de repli, pas de boucle infinie', `${deadVideo.failed}/${deadVideo.requested.length}`, 'true/3');

console.log('\n  image « complète mais vide » = miniature absente (404 en cache)\n');
check('complète sans pixels', isThumbMissing({ complete: true, naturalWidth: 0 }), true);
check('complète avec pixels', isThumbMissing({ complete: true, naturalWidth: 480 }), false);
check('pas encore chargée', isThumbMissing({ complete: false, naturalWidth: 0 }), false);
check('aucune image', isThumbMissing(null), false);

/* ------------------------------------------- 3. Rendu réel des pages (SSR) */

console.log('\n[3/4] ce que les pages demandent vraiment\n');

const outDir = path.join(root, 'node_modules', '.cache', 'thumbnail-smoke');
execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'vite',
    'build',
    '--ssr',
    'scripts/thumbnail-smoke.jsx',
    '--outDir',
    path.relative(root, outDir),
    '--emptyOutDir',
    '--logLevel',
    'error',
  ],
  { cwd: root, stdio: 'inherit' }
);

const { homeThumbs, dossierThumbs } = await import(path.join(outDir, 'thumbnail-smoke.js'));

const home = homeThumbs();
console.log(`  ${home.length} vignette(s) d’épisodes à la une sur l’accueil\n`);
check('accueil : trois épisodes à la une', home.length, 3);
check('accueil : toutes les vignettes ont une URL', home.every((thumb) => /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/\w+\.jpg$/.test(thumb.src || '')), true);
check('accueil : toutes les vignettes sont décrites (alt)', home.every((thumb) => Boolean(thumb.alt)), true);

for (const id of Object.keys(VIDEOS_WITHOUT_HD_THUMB)) {
  const thumb = home.find((entry) => (entry.src || '').includes(`/vi/${id}/`));
  check(`accueil : ${id} est bien affiché`, Boolean(thumb), true);
  check(`accueil : ${id} ne demande pas maxresdefault`, qualityOf(thumb?.src), THUMB_BASELINE);
}
check('accueil : l’épisode HicoSoft garde la qualité HD', home.some((thumb) => (thumb.src || '').includes(`/vi/${WITH_HD}/maxresdefault.jpg`)), true);

const dossiers = dossierThumbs();
check('dossiers : huit vignettes', dossiers.length, 8);
check('dossiers : qualité demandée inchangée (hqdefault)', dossiers.every((src) => qualityOf(src) === THUMB_BASELINE), true);

/* ----------------------------------------------------- 4. Source du site */

console.log('\n[4/4] une seule fabrique d’URL, et les deux chemins du repli\n');

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(jsx?|mjs)$/.test(entry.name) ? [full] : [];
  });
}

// Les commentaires documentent la règle (et citent donc `maxresdefault`) : on
// ne regarde que le code. Un `//` précédé de `:` est un protocole d'URL, pas un
// commentaire — il est conservé.
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

const factory = path.join(root, 'src', 'lib', 'videoThumbnails.js');
const hardcoded = [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'scripts'))]
  .filter((file) => file !== factory && file !== fileURLToPath(import.meta.url))
  .filter((file) => /i\.ytimg\.com|maxresdefault/.test(codeOnly(readFileSync(file, 'utf8'))))
  .map((file) => path.relative(root, file));
check('aucune URL de miniature codée en dur hors de src/lib/videoThumbnails.js', hardcoded.join(', ') || 'aucune', 'aucune');

const display = readFileSync(path.join(root, 'src', 'components', 'VideoThumb.jsx'), 'utf8');
check('l’afficheur écoute onError', /onError=\{/.test(display), true);
check('l’afficheur relit l’état de l’image (404 en cache)', /isThumbMissing\(/.test(display), true);
check('l’afficheur dessine un cadre quand tout manque', /video-thumb-fallback/.test(display), true);

const homeSource = readFileSync(path.join(root, 'src', 'pages', 'Home.jsx'), 'utf8');
check('l’accueil passe par VideoThumb', /<VideoThumb/.test(homeSource), true);

console.log(`\n  ${failures === 0 ? 'OK' : `${failures} échec(s)`} — chaque carte a une miniature, ou un cadre\n`);
if (failures > 0) process.exitCode = 1;
