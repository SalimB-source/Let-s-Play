#!/usr/bin/env node
// Robot actus du jour — Let’s Play.
//
// 1. Moissonne les flux RSS des médias gaming (FR + internationaux).
// 2. Sélectionne les meilleures news du moment (fraîcheur, notoriété,
//    diversité des sources), en écartant promos, guides et tests.
// 3. Rédige chaque actu « façon Let’s Play » : via un modèle de langage si
//    une clé d’API est configurée, sinon via le gabarit éditorial extractif.
// 4. Télécharge la vraie photo officielle, écrit les fichiers JSON, l’index du site et un rapport.
//
// Utilisation :
//   node scripts/news-bot/fetch-news.mjs                 # run réel (réseau)
//   node scripts/news-bot/fetch-news.mjs --fixtures      # run hors-ligne (démo)
//   Options : --count=N  --force  --root=chemin

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOT, SOURCES, HOT_KEYWORDS, NEGATIVE_TITLE, NEGATIVE_CATEGORIES } from './config.mjs';
import { fetchText, fetchBinary } from './lib/net.mjs';
import { parseFeed } from './lib/rss.mjs';
import { extractArticle } from './lib/extract.mjs';
// Plus de visuel SVG généré : seules les vraies photos officielles des sources sont publiées.
const FIXTURE_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
import { detectLlm, writeWithLlm } from './lib/llm.mjs';
import {
  slugify, formatParisDate, templateCompose, validateStory, fitHeadline, HEADLINE_BUDGET,
} from './lib/story.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.split('=').slice(1).join('=') : undefined;
};

const FIXTURES = flag('fixtures');
const FORCE = flag('force') || !!process.env.NEWS_FORCE;
const COUNT = Math.max(1, Math.min(6, Number(option('count') || process.env.NEWS_COUNT || BOT.count)));
const ROOT = path.resolve(option('root') || (FIXTURES ? path.join(SCRIPT_DIR, 'demo-out') : path.resolve(SCRIPT_DIR, '../..')));
if (FIXTURES && !option('root')) fs.rmSync(ROOT, { recursive: true, force: true });

const PATHS = {
  autoDir: path.join(ROOT, 'src/news/auto'),
  autoIndex: path.join(ROOT, 'src/news/autoIndex.js'),
  coversDir: path.join(ROOT, 'public/news-auto'),
  state: path.join(ROOT, 'news-bot/state.json'),
  report: path.join(ROOT, 'news-bot/report.md'),
  mainJsx: path.join(ROOT, 'src/main.jsx'),
  fixturesDir: path.join(SCRIPT_DIR, 'fixtures'),
};

// ------------------------------------------------------------------ état
function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(PATHS.state, 'utf8'));
    return { seen: new Set(state.seen || []), published: state.published || {}, lastRun: state.lastRun || null };
  } catch {
    return { seen: new Set(), published: {}, lastRun: null };
  }
}

const state = loadState();
const now = new Date();
const dateLabel = formatParisDate(now);
const llm = FIXTURES ? null : detectLlm();

// ------------------------------------------------------------ entités connues
function spotEntities(text) {
  const haystack = ` ${text.toLowerCase().replace(/['’]/g, ' ')} `;
  const hits = [];
  for (const keyword of HOT_KEYWORDS) {
    const needle = ` ${keyword} `;
    if (haystack.includes(needle) || haystack.includes(keyword.replace(/\s/g, ' '))) hits.push(keyword.trim());
  }
  return [...new Set(hits)].slice(0, 3);
}

// ------------------------------------------------- 1. moisson des flux
async function loadItems() {
  if (FIXTURES) {
    const fixtures = [
      { source: { name: 'Jeuxvideo.com', tier: 3, lang: 'fr' }, file: 'feeds-fr.xml' },
      { source: { name: 'ActuGaming', tier: 3, lang: 'fr' }, file: 'feeds-fr-2.xml' },
      { source: { name: 'Gamekult', tier: 3, lang: 'fr' }, file: 'feeds-fr-3.xml' },
      { source: { name: 'VGC', tier: 3, lang: 'en' }, file: 'feeds-intl.xml' },
    ];
    const items = [];
    for (const fixture of fixtures) {
      const xml = fs.readFileSync(path.join(PATHS.fixturesDir, fixture.file), 'utf8');
      for (const item of parseFeed(xml)) {
        items.push({ ...item, source: fixture.source, dateIso: new Date(now.getTime() - items.length * 3 * 3600 * 1000).toISOString() });
      }
    }
    return { items, errors: [] };
  }
  const results = await Promise.allSettled(SOURCES.map(async (source) => {
    const xml = await fetchText(source.url, { accept: 'application/rss+xml, application/xml, text/xml' });
    return parseFeed(xml).map((item) => ({ ...item, source }));
  }));
  const items = [];
  const errors = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') items.push(...result.value);
    else errors.push(`${SOURCES[index].name} : ${result.reason.message}`);
  });
  return { items, errors };
}

// ------------------------------------------------- 2. filtre + score + sélection
const tokensOf = (title) => title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((token) => token.length > 2 && !['les', 'des', 'une', 'pour', 'avec', 'dans', 'son', 'ses', 'the', 'and', 'new', 'its', 'after', 'from', 'that', 'this', 'game', 'jeu', 'est', 'pas', 'plus', 'aux', 'par', 'sur'].includes(token));

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const token of setA) if (setB.has(token)) inter += 1;
  return inter / (setA.size + setB.size - inter);
}

function prepare(items) {
  const freshLimit = now.getTime() - (FORCE ? BOT.forceHours : BOT.freshHours) * 3600 * 1000;
  const seenNow = [];
  for (const item of items) {
    if (!item.title || !item.url) continue;
    // Sans clé IA, le bot ne rédige qu’à partir des médias francophones :
    // le gabarit extractif ne traduit pas, et le site est en français.
    if (!llm && item.source.lang !== 'fr') continue;
    const haystack = `${item.title} ${item.summary || ''}`;
    if (NEGATIVE_TITLE.some((pattern) => pattern.test(item.title))) continue;
    if (NEGATIVE_CATEGORIES.some((pattern) => item.categories.some((category) => pattern.test(category)))) continue;
    const date = item.dateIso ? new Date(item.dateIso) : now;
    if (date.getTime() < freshLimit) continue;
    if (state.seen.has(item.guid)) continue;
    const ageHours = Math.max(0, (now.getTime() - date.getTime()) / 3600000);
    const keywordHits = spotEntities(haystack);
    const recency = ageHours <= 6 ? 30 : ageHours <= 12 ? 24 : ageHours <= 24 ? 14 : 6;
    item.score = item.source.tier * 10 + recency + Math.min(30, keywordHits.length * 8) + (item.summary ? 4 : 0);
    item.entities = keywordHits;
    item.tokens = tokensOf(item.title);
    item.ageHours = ageHours;
    seenNow.push(item);
  }
  // Deux titres qui racontent la même histoire : on garde le meilleur score.
  const deduped = [];
  for (const item of seenNow.sort((a, b) => b.score - a.score)) {
    const twin = deduped.find((other) => jaccard(other.tokens, item.tokens) >= 0.5);
    if (twin) continue;
    deduped.push(item);
  }
  // Diversité : deux articles maximum par média.
  const picked = [];
  const perSource = new Map();
  for (const item of deduped) {
    const count = perSource.get(item.source.name) || 0;
    if (count >= BOT.maxPerSource) continue;
    perSource.set(item.source.name, count + 1);
    picked.push(item);
    if (picked.length >= COUNT) break;
  }
  return { picked, considered: seenNow.length };
}

// ------------------------------------------------- 3. rédaction d’un article
function reserveSlug(headline, taken) {
  const base = slugify(headline);
  const shortDate = `${dateLabel.slice(0, 2)}${dateLabel.slice(3, 5)}`; // ex. « 2209 » pour le 22.09
  let slug = base;
  if (taken.has(slug) || state.published[slug]) slug = `${base}-${shortDate}`;
  let counter = 2;
  while (taken.has(slug) || state.published[slug]) slug = `${base}-${counter}`;
  counter += 1;
  taken.add(slug);
  return slug;
}

function manualSlugs() {
  try {
    const main = fs.readFileSync(PATHS.mainJsx, 'utf8');
    return new Set([...main.matchAll(/\/news\/([a-z0-9-]+)/g)].map((match) => match[1]));
  } catch {
    return new Set();
  }
}

async function composeArticle(item, taken) {
  const slug = reserveSlug(item.title, taken);
  let extracted = { headline: item.title, description: item.summary || '', paragraphs: [] };
  let extractionError = null;
  if (FIXTURES) {
    const fixtureName = item.url.split('/').pop();
    const fixturePath = path.join(PATHS.fixturesDir, `${fixtureName}.html`);
    if (fs.existsSync(fixturePath)) {
      const { extractFromHtml } = await import('./lib/extract.mjs');
      extracted = extractFromHtml(fs.readFileSync(fixturePath, 'utf8'));
    }
  } else {
    try {
      extracted = await extractArticle(item.url);
    } catch (error) {
      extractionError = error.message;
    }
  }
  if (!extracted.officialThumbnailUrl || !/^https?:\/\//i.test(extracted.officialThumbnailUrl)) {
    throw new Error('miniature officielle absente : publication refusée');
  }
  let thumbnail = `news-auto/${slug}-official.jpg`;
  if (!FIXTURES) {
    const downloaded = await fetchBinary(extracted.officialThumbnailUrl);
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' })[downloaded.contentType];
    // Seules de vraies photos/images matricielles sont acceptées (pas de SVG).
    if (!extension) throw new Error(`format de miniature officielle non supporté (${downloaded.contentType}) : publication refusée`);
    thumbnail = `news-auto/${slug}-official.${extension}`;
    writeFileSafe(path.join(PATHS.coversDir, `${slug}-official.${extension}`), downloaded.buffer);
  } else {
    writeFileSafe(path.join(PATHS.coversDir, `${slug}-official.jpg`), FIXTURE_JPEG);
  }
  const fields = await writeWithLlm(item, extracted, llm);
  const base = templateCompose(item, { ...extracted, description: extracted.description || item.summary || '' }, {
    date: dateLabel,
    image: thumbnail,
    slug,
  });
  const story = { ...base, slug, date: dateLabel, image: thumbnail, thumbnail, officialThumbnailUrl: extracted.officialThumbnailUrl };
  if (fields) {
    // Les champs rédigés par le modèle complètent le gabarit : le cadre
    // (slug, date, image, source, url) reste contrôlé par le bot.
    for (const key of ['title', 'accent', 'category', 'cover', 'dek', 'lead', 'intro', 'h2', 'p1', 'quote', 'quoteBy', 'h2b', 'p2', 'p3', 'p4', 'takeText', 'sentiment']) {
      if (typeof fields[key] === 'string' && fields[key].trim()) story[key] = fields[key].trim().replace(/\s+/g, ' ');
    }
    if (typeof fields.title === 'string' && fields.title.trim()) {
      story.title = fields.title.trim().toUpperCase().replace(/\s+/g, ' ').replace(/[.,;:]+$/, '');
      story.accent = (typeof fields.accent === 'string' && fields.accent.trim() ? fields.accent.trim() : accent);
      if (!/[.!?]$/.test(story.accent)) story.accent += '.';
    }
    // Le modèle peut fournir sentiment : on normalise.
    if (typeof fields.sentiment === 'string') {
      const s = fields.sentiment.trim().toLowerCase();
      if (['positive', 'negative', 'mixed', 'neutral'].includes(s)) story.sentiment = s === 'neutral' ? 'mixed' : s;
    }
  }
  // Titrage : le modèle rédige, le gabarit découpe — mais le budget, lui, est
  // tenu ici, pour les deux chemins. Un titre trop long passerait sur quatre
  // lignes dans la grille Actus comme dans l'article (HEADLINE_BUDGET).
  const drafted = { title: story.title, accent: story.accent };
  const headline = fitHeadline(drafted.title, drafted.accent);
  if (headline.title !== drafted.title || headline.accent !== drafted.accent) {
    console.log(`  ✂️  Titre ramené au budget (${HEADLINE_BUDGET.total} caractères) : ${headline.title} ${headline.accent}`);
  }
  story.title = headline.title;
  story.accent = headline.accent;

  // Filet de sécurité : si sentiment manquant/invalide, on garde celui du gabarit (déjà présent via base)
  if (!story.sentiment || !['positive', 'negative', 'mixed'].includes(String(story.sentiment).toLowerCase())) {
    story.sentiment = base.sentiment || 'mixed';
  } else {
    story.sentiment = String(story.sentiment).toLowerCase() === 'neutral' ? 'mixed' : String(story.sentiment).toLowerCase();
  }
  story.credit = fields ? 'Article rédigé avec l’assistance d’un modèle de langage, à partir de la source citée. Visuel : carte éditoriale Let’s Play générée automatiquement.' : base.credit;
  story.auto = true;
  story.sourceName = item.source?.name || 'Let’s Play';
  validateStory(story, { internal: true });
  return { story, extractionError, mode: fields ? `llm:${llm?.provider}:${llm?.model}` : 'gabarit' };
}

// ------------------------------------------------- 4. écriture des fichiers
function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function parseDisplayDate(label) {
  const [day, month, year] = label.split('.').map(Number);
  return year * 10000 + month * 100 + day;
}

function generateAutoIndex() {
  const files = fs.existsSync(PATHS.autoDir) ? fs.readdirSync(PATHS.autoDir).filter((file) => file.endsWith('.json')).sort() : [];
  const stories = [];
  for (const file of files) {
    try {
      stories.push(JSON.parse(fs.readFileSync(path.join(PATHS.autoDir, file), 'utf8')));
    } catch (error) {
      console.warn(`  ⚠️ JSON illisible ignoré (${file}) : ${error.message}`);
    }
  }
  stories.sort((a, b) => parseDisplayDate(b.date) - parseDisplayDate(a.date) || b.slug.localeCompare(a.slug));
  const body = stories
    .map((story) => `  ${JSON.stringify(story.slug)}: ${JSON.stringify(story, null, 2).replace(/\n/g, '\n  ')},`)
    .join('\n');
  const banner = `// ⚙️ FICHIER GÉNÉRÉ par scripts/news-bot/fetch-news.mjs — ne pas éditer à la main.
// Dernière génération : ${new Date().toISOString()} — ${stories.length} article(s).
// Ce module alimente la page Actus et les routes /news/<slug> du site.`;
  writeFileSafe(PATHS.autoIndex, `${banner}\nexport const autoStories = {\n${body}\n};\n`);
  return stories;
}

function pruneArchive() {
  const removed = [];
  if (!fs.existsSync(PATHS.autoDir)) return removed;
  // Comparaison date contre date : minuit du jour moins archiveDays — sinon
  // les articles du jour même seraient jugés « vieux » par rapport à l’heure
  // d’exécution du run.
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - BOT.archiveDays).getTime();
  for (const file of fs.readdirSync(PATHS.autoDir).filter((file) => file.endsWith('.json'))) {
    const file_ = path.join(PATHS.autoDir, file);
    try {
      const story = JSON.parse(fs.readFileSync(file_, 'utf8'));
      const [day, month, year] = story.date.split('.').map(Number);
      if (new Date(year, month - 1, day).getTime() < cutoff) {
        fs.rmSync(file_);
        fs.rmSync(path.join(PATHS.coversDir, `${story.slug}.svg`), { force: true });
        if (story.thumbnail) fs.rmSync(path.join(ROOT, 'public', story.thumbnail), { force: true });
        removed.push(story.slug);
      }
    } catch { /* on garde le fichier en cas de doute */ }
  }
  return removed;
}

// ------------------------------------------------------------------ main
const { items, errors } = await loadItems();
if (errors.length) console.warn(`⚠️ Flux injoignables : \n  - ${errors.join('\n  - ')}`);
const { picked, considered } = prepare(items);
console.log(`Flux : ${items.length} entrées · ${considered} candidates fraîches · ${picked.length} retenues (mode ${FIXTURES ? 'fixtures' : 'réseau'}${llm ? `, rédaction : ${llm.provider}/${llm.model}` : ', rédaction : gabarit'}).`);

const taken = manualSlugs();
const articles = [];
for (const item of picked) {
  try {
    const composed = await composeArticle(item, taken);
    articles.push({ item, ...composed });
  } catch (error) {
    console.warn(`  ⚠️ Article abandonné (« ${item.title} ») : ${error.message}`);
  }
}

for (const { story } of articles) {
  writeFileSafe(path.join(PATHS.autoDir, `${story.date.split('.').reverse().join('-')}-${story.slug}.json`), `${JSON.stringify(story, null, 2)}\n`);
  validateStory(story);
  console.log(`  ✔ /news/${story.slug} — ${story.title} ${story.accent}`);
}

const archived = pruneArchive();
const allStories = generateAutoIndex();

// L’état retient les GUID vus (anti-doublon) et les slugs déjà publiés.
for (const item of items) state.seen.add(item.guid);
if (state.seen.size > 4000) state.seen = new Set([...state.seen].slice(-4000));
for (const story of allStories) state.published[story.slug] = story.date;
if (Object.keys(state.published).length > 2000) {
  state.published = Object.fromEntries(Object.entries(state.published).slice(-2000));
}
state.lastRun = new Date().toISOString();
writeFileSafe(PATHS.state, `${JSON.stringify({ seen: [...state.seen], published: state.published, lastRun: state.lastRun }, null, 2)}\n`);

const lines = articles.map(({ story, mode }) => `- [${story.title} ${story.accent}](/news/${story.slug}) — d’après ${story.source.replace(/^D’après /, '').replace(/, article.*/, '')} (${mode})`);
writeFileSafe(PATHS.report, `${articles.length ? `🤖 Actus du jour · ${dateLabel} — ${articles.length} article(s)` : '🤖 Actus du jour — rien de nouveau'}\n\n${lines.join('\n')}${archived.length ? `\n\nArchivé (>${BOT.archiveDays} jours) : ${archived.join(', ')}` : ''}\n`);

console.log(`\nTerminé : ${articles.length} article(s) généré(s), ${allStories.length} au total dans l’index, ${archived.length} archivé(s).`);
if (!articles.length) console.log('Rien de nouveau à publier — le workflow ne committra rien.');
