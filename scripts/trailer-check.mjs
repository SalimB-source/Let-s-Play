/**
 * Contrôle des bandes-annonces des actus cinéma — `npm run check:trailers`.
 *
 * La règle éditoriale (src/articleTrailers.js) : une actu cinéma montre une
 * vidéo **publiée par le distributeur** — bande-annonce, teaser ou extrait — et
 * quand le distributeur n'a encore rien publié, l'article le dit au lieu de
 * laisser un trou. Les montages de fans et les « trailers » générés par IA, très
 * nombreux sur ces licences, ne passent pas.
 *
 * Quatre niveaux de contrôle, sans navigateur :
 *
 *   1. les données : identifiant YouTube au bon format, nature de vidéo connue,
 *      chaîne officielle déclarée (et seulement elle), date de vérification,
 *      mention de crédit, aucune entrée muette ;
 *   2. la couverture : chaque actu cinéma du site (clés de
 *      `src/pages/CurrentNews.jsx` et cartes du hub `src/pages/CinemaNews.jsx`)
 *      a une entrée — vidéos ou mention d'absence — et aucune entrée ne pointe
 *      vers un article qui n'existe pas ;
 *   3. le rendu réel (SSR) : un seul lecteur par article, l'embed de la première
 *      vidéo, le sélecteur et ses miniatures quand il y a plusieurs vidéos, le
 *      lien YouTube, la note d'illustration, la mention d'absence, et les
 *      pastilles des cartes du hub ;
 *   4. la source : les embeds viennent de `youTubeEmbedUrl()`, les miniatures de
 *      `VideoThumb`, et aucune URL d'embed n'est codée en dur dans les données.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  articleTrailers,
  TRAILER_KINDS,
  trailerKindLabel,
  trailerBadgeLabel,
  trailerWatchUrl,
  getArticleTrailerEntry,
  getArticleTrailers,
  getArticleTrailerPending,
  trailerFlagLabel,
  trailerFlagTitle,
} from '../src/articleTrailers.js';
import { youTubeEmbedUrl } from '../src/lib/videoPlayback.js';
import { youTubeThumbUrl } from '../src/lib/videoThumbnails.js';

// Hôte et chemin des miniatures relus depuis la fabrique du site, jamais
// recopiés ici : `npm run check:thumbs` interdit toute URL de miniature codée
// en dur hors de src/lib/videoThumbnails.js.
const THUMB_URL = new URL(youTubeThumbUrl('abc123defgh'));
const THUMB_HOST = THUMB_URL.host;
const THUMB_PATH = THUMB_URL.pathname.split('abc123defgh')[0];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? ` → ${actual}` : ` → ${actual} (attendu : ${expected})`}`);
}

/** Identifiant YouTube : onze caractères, l'alphabet de l'encodage base64url. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/** Trace du contrôle d'une vidéo : jour du contrôle, au format du site. */
const VERIFIED = /^\d{2}\.\d{2}\.\d{4}$/;

/**
 * Chaînes officielles admises — celles des studios et diffuseurs qui publient
 * eux-mêmes leurs bandes-annonces. Ajouter une chaîne ici est un acte
 * éditorial : il faut avoir vérifié sur YouTube (oEmbed) que la vidéo vient bien
 * du distributeur, et non d'un agrégateur, d'un compte régional ou d'un fan.
 * Les comptes régionaux (Warner Bros. New Zealand, Sony Pictures France…) sont
 * refusés : on cite l'upload de la chaîne principale.
 */
const OFFICIAL_CHANNELS = new Set([
  'Marvel Entertainment',
  'Sony Pictures Entertainment',
  'Warner Bros.',
  'Netflix',
  'Netflix Anime',
  'HBO Max',
  'Focus Features',
  'GODZILLA OFFICIAL by TOHO',
  // Distributeur indépendant de Coyote vs. Acme (rachat des droits à Warner
  // Bros. en mars 2025) — chaîne vérifiée sur YouTube (oEmbed) le 29.09.2026
  // sur la vidéo « Coyote vs. ACME | Final Trailer » (Bpg3tJ4f3v0).
  'Ketchup Entertainment',
  // Chaînes vérifiées sur YouTube (oEmbed) le 04.10.2026 pour la fournée du
  // week-end : « Verity | Official Trailer » (xdPMKhjMSFs) pour Amazon MGM
  // Studios, « Dexter: Resurrection | Season 2 Official Trailer | Paramount+ »
  // (nTOf1FIsBcs) pour Paramount Plus et « Beware Boiúna (2026) Final Trailer »
  // (MQKqgFVU4dQ) pour Lionsgate Movies. Les copies d'agrégateurs (KinoCheck,
  // JoBlo, ONE Media…) qui reprennent les mêmes bandes-annonces restent
  // écartées, comme les re-uploads des chaînes régionales.
  'Amazon MGM Studios',
  'Paramount Plus',
  'Lionsgate Movies',
]);

/* -------------------------------------------- 1. Les données des vidéos */

console.log('\n[1/4] données : identifiants, natures, chaînes officielles, traçabilité\n');

const keys = Object.keys(articleTrailers);
const withVideos = keys.filter((key) => getArticleTrailers(key));
const waiting = keys.filter((key) => getArticleTrailerPending(key));

check('chaque entrée a des vidéos ou une mention d’absence', keys.filter((key) => !getArticleTrailers(key) && !getArticleTrailerPending(key)).length, 0);
check('chaque entrée a un sujet (libellé d’en-tête)', keys.every((key) => Boolean(articleTrailers[key].label)), true);
console.log(`       └ ${withVideos.length} actu(s) avec vidéo, ${waiting.length} en attente d’une bande-annonce officielle`);

const items = keys.flatMap((key) => (articleTrailers[key].items || []).map((item) => ({ key, item })));
console.log(`\n  ${items.length} vidéo(s) officielle(s) référencée(s)\n`);

check('identifiant YouTube au format (11 caractères)', items.filter(({ item }) => !VIDEO_ID.test(item.id || '')).map(({ item }) => item.id).join(', ') || 'aucun', 'aucun');
check('nature de vidéo connue (trailer / teaser / extrait)', items.filter(({ item }) => !(item.kind in TRAILER_KINDS)).map(({ item }) => item.kind).join(', ') || 'aucune', 'aucune');
check('titre de la vidéo renseigné', items.every(({ item }) => Boolean(item.title)), true);
check('chaîne officielle déclarée', items.filter(({ item }) => !OFFICIAL_CHANNELS.has(item.channel)).map(({ item }) => `${item.id} → ${item.channel}`).join(', ') || 'aucune', 'aucune');
check('contrôle de la vidéo daté (JJ.MM.AAAA)', items.filter(({ item }) => !VERIFIED.test(item.verified || '')).map(({ item }) => item.id).join(', ') || 'aucun', 'aucun');
check('aucune vidéo en double dans un même article', items.length, new Set(items.map(({ key, item }) => `${key}|${item.id}`)).size);
check('crédit des vidéos présent dès qu’il y a une vidéo', withVideos.every((key) => Boolean(articleTrailers[key].credit)), true);
check('aucune mention d’absence sur un article qui a une vidéo', withVideos.filter((key) => articleTrailers[key].pending).length, 0);
check('libellé de nature (BANDE-ANNONCE)', trailerKindLabel('trailer'), 'BANDE-ANNONCE');
check('libellé de nature (TEASER)', trailerKindLabel('teaser'), 'TEASER');
check('libellé de nature (EXTRAIT)', trailerKindLabel('extrait'), 'EXTRAIT');
check('nature inconnue : repli sur bande-annonce', trailerKindLabel('making-of'), 'BANDE-ANNONCE');

// Une vidéo d'illustration (saison ou film précédent) doit le dire : c'est la
// même honnêteté que pour les photogrammes des galeries.
console.log('\n  vidéos d’illustration : l’article dit ce que le lecteur voit\n');
for (const { key, item } of items.filter(({ item }) => item.note)) {
  console.log(`  ok   ${key} · ${item.id}`);
  console.log(`       └ ${item.note}`);
}
check('chaque note explique vraiment ce que le lecteur voit', items.filter(({ item }) => item.note).every(({ item }) => item.note.length > 40), true);
check('au moins une vidéo d’illustration est signalée', items.filter(({ item }) => item.note).length >= 1, true);

/* ------------------------------------------------ 2. Couverture des actus */

console.log('\n[2/4] chaque actu cinéma a une bande-annonce, ou dit pourquoi elle n’existe pas\n');

const read = (file) => readFileSync(path.join(root, file), 'utf8');

// Les actus cinéma sont les clés « cinema/<slug> » du dictionnaire de
// CurrentNews.jsx ; les cartes du hub donnent les routes réellement publiées
// (dont la série animée Diablo, servie par le gabarit Blizzard).
const cinemaKeys = [...new Set([...read('src/pages/CurrentNews.jsx').matchAll(/'(cinema\/[a-z0-9-]+)'\s*:/g)].map((m) => m[1]))];
const hubRoutes = [...new Set([...read('src/pages/CinemaNews.jsx').matchAll(/to:\s*'(\/news\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)'/g)].map((m) => m[1]))];
const hubKeys = hubRoutes.map((route) => route.replace(/^\/news\//, ''));
const covered = [...new Set([...cinemaKeys, ...hubKeys])];

console.log(`  ${cinemaKeys.length} actus cinéma, ${hubRoutes.length} cartes du hub, ${keys.length} entrées\n`);

check('toutes les clés du fichier sont des actus cinéma publiées', keys.filter((key) => !covered.includes(key)).join(', ') || 'aucune', 'aucune');
check('toutes les actus cinéma ont une entrée (vidéo ou mention)', covered.filter((key) => !getArticleTrailerEntry(key)).join(', ') || 'aucune', 'aucune');
check('toutes les cartes du hub ont une entrée', hubKeys.filter((key) => !getArticleTrailerEntry(key)).join(', ') || 'aucune', 'aucune');

console.log('\n  pastille des cartes du hub (libellé de la première vidéo)\n');
for (const route of hubRoutes) {
  const flag = trailerFlagLabel(route);
  console.log(`  ${flag ? 'ok  ' : '—   '} ${route}${flag ? ` → ▶ ${flag}` : ' → aucune vidéo officielle'}`);
}
check('la pastille reprend la nature de la première vidéo', trailerFlagLabel('/news/cinema/werwulf-trailer-eggers'), 'BANDE-ANNONCE');
check('… un teaser quand c’est un teaser', trailerFlagLabel('/news/cinema/house-of-dragon-saison-3'), 'TEASER');
check('… rien quand aucune vidéo officielle n’existe', trailerFlagLabel('/news/cinema/blade-reboot'), null);
check('… rien pour une route inconnue', trailerFlagLabel('/news/inconnu'), null);
check('… rien sans route', trailerFlagLabel(null), null);
check('une clé d’article est acceptée telle quelle', trailerFlagLabel('cinema/arcane-saison-2'), 'BANDE-ANNONCE');

/* ------------------------------------------------ 3. Rendu réel (SSR) */

console.log('\n[3/4] ce que les pages affichent vraiment\n');

const outDir = path.join(root, 'node_modules', '.cache', 'trailer-smoke');
execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'vite',
    'build',
    '--ssr',
    'scripts/trailer-smoke.jsx',
    '--outDir',
    path.relative(root, outDir),
    '--emptyOutDir',
    '--logLevel',
    'error',
  ],
  { cwd: root, stdio: 'inherit' }
);

const { renderArticle, renderHub } = await import(path.join(outDir, 'trailer-smoke.js'));

console.log(`  ${covered.length} article(s) rendu(s)\n`);
for (const key of covered) {
  const entry = getArticleTrailerEntry(key);
  const page = renderArticle(key);
  const videos = entry.items || [];

  check(`${key} : un bloc bande-annonce est rendu`, page.rendered, true);

  if (!videos.length) {
    check(`${key} : aucun lecteur intégré`, page.players.length, 0);
    check(`${key} : aucune miniature demandée`, page.thumbs.length, 0);
    check(`${key} : la mention d’absence est affichée telle quelle`, page.pendingText, entry.pending);
    continue;
  }

  const first = videos[0];
  check(`${key} : un seul lecteur à la fois`, page.players.length, 1);
  check(`${key} : l’embed vient de youTubeEmbedUrl (${first.id})`, page.players[0], youTubeEmbedUrl(first.id));
  check(`${key} : le lecteur est titré pour les lecteurs d’écran`, page.titles[0].startsWith(first.title), true);
  check(`${key} : la nature de la vidéo est annoncée`, page.badge, trailerBadgeLabel(first.kind));
  check(`${key} : le titre affiché est celui de la vidéo officielle`, page.title, first.title);
  check(`${key} : la chaîne officielle est citée`, page.channel, first.channel);
  check(`${key} : un lien vers la vidéo YouTube`, page.watchLinks.join(', '), trailerWatchUrl(first.id));
  check(`${key} : le crédit des vidéos est affiché`, page.credit, entry.credit);
  check(`${key} : la note d’illustration suit la vidéo`, page.note, first.note || null);

  if (videos.length > 1) {
    check(`${key} : ${videos.length} vidéos proposées au lecteur`, page.choices, videos.length);
    check(`${key} : une miniature YouTube par proposition`, page.thumbs.length, videos.length);
    check(`${key} : les miniatures viennent de la fabrique du site`, page.thumbs.every((src) => new URL(src).host === THUMB_HOST && new URL(src).pathname.startsWith(THUMB_PATH)), true);
    check(`${key} : la miniature affichée est celle de la vidéo en lecture`, page.thumbs[0].includes(`/vi/${first.id}/`), true);
  } else {
    check(`${key} : pas de sélecteur pour une seule vidéo`, page.choices, 0);
    check(`${key} : aucune miniature inutile`, page.thumbs.length, 0);
  }
}

console.log('\n  pastilles rendues sur les cartes du hub /news/cinema\n');
const hub = renderHub();
check('le hub rend ses cartes', hub.length >= 12, true);
for (const card of hub) {
  const name = card.to.replace('/news/', '');
  check(`carte ${name} : pastille`, card.flag, trailerFlagLabel(card.to));
  check(`carte ${name} : annonce au survol`, card.flagTitle, trailerFlagTitle(card.to));
}
check('pastille d’un teaser au masculin', trailerBadgeLabel('teaser'), 'TEASER OFFICIEL');
check('pastille d’une bande-annonce au féminin', trailerBadgeLabel('trailer'), 'BANDE-ANNONCE OFFICIELLE');
check('annonce d’un teaser au masculin', trailerFlagTitle('/news/cinema/house-of-dragon-saison-3'), 'Teaser officiel intégré à l’article');
check('chaque carte avec vidéo porte sa pastille', hub.filter((card) => card.flag).length, hub.filter((card) => trailerFlagLabel(card.to)).length);
check('aucune pastille inventée', hub.filter((card) => card.flag && !trailerFlagLabel(card.to)).length, 0);

/* ----------------------------------------------------- 4. Source du site */

console.log('\n[4/4] une seule fabrique d’embed, une seule fabrique de miniatures\n');

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(jsx?|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const data = read('src/articleTrailers.js');
const component = read('src/components/ArticleTrailer.jsx');
const cinemaHub = read('src/pages/CinemaNews.jsx');
const articlePage = read('src/pages/CurrentNews.jsx');

check('les données ne codent aucune URL d’embed', /youtube\.com\/embed|youtube-nocookie\.com\/embed/.test(data), false);
check('les données ne codent aucune URL de miniature', data.includes(THUMB_HOST), false);
check('les données ne gardent que des identifiants', /id: '[A-Za-z0-9_-]{11}'/.test(data), true);
check('le lecteur passe par youTubeEmbedUrl', /youTubeEmbedUrl\(current\.id\)/.test(component), true);
check('le lien YouTube passe par trailerWatchUrl', /trailerWatchUrl\(current\.id\)/.test(component), true);
check('les miniatures du sélecteur passent par VideoThumb', /<VideoThumb/.test(component), true);
check('le sélecteur n’invente aucune URL de miniature', component.includes(THUMB_HOST), false);
check('la page actu rend le bloc bande-annonce', /<ArticleTrailer \{\.\.\.trailer\} \/>/.test(articlePage), true);
check('la page actu lit les vidéos du fichier de données', /getArticleTrailerEntry\(key\)/.test(articlePage), true);
check('le hub cinéma calcule ses pastilles depuis les données', /trailerFlagLabel\(article\.to\)/.test(cinemaHub), true);

// Le coordinateur « une seule vidéo à la fois » repose sur `enablejsapi=1`,
// ajouté par la fabrique : aucun lecteur du bloc ne doit s'en passer.
check('l’embed garde enablejsapi (coordinateur de lecture)', youTubeEmbedUrl('abc123defgh').includes('enablejsapi=1'), true);
check('aucun autoplay forcé sur une bande-annonce', youTubeEmbedUrl('abc123defgh').includes('autoplay'), false);

const hardcoded = sourceFiles(path.join(root, 'src'))
  .filter((file) => file !== path.join(root, 'src', 'lib', 'videoPlayback.js'))
  .filter((file) => /youtube\.com\/embed|youtube-nocookie\.com\/embed/.test(readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file));
check('aucun embed YouTube codé en dur hors de src/lib/videoPlayback.js', hardcoded.join(', ') || 'aucun', 'aucun');

/* ---------------------------------------------------------------- résumé */

if (failures) {
  console.log(`\nBandes-annonces des actus cinéma : ${failures} contrôle(s) en échec\n`);
  process.exit(1);
}
console.log(`\nBandes-annonces des actus cinéma : OK (${withVideos.length} actu(s) avec vidéo, ${waiting.length} en attente, ${items.length} vidéo(s) officielle(s))\n`);
