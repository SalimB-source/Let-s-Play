/**
 * Génère les flux JSON légers consommés par l'application mobile React Native :
 *   - public/mobile-feed/feed-fr.json
 *   - public/mobile-feed/feed-en.json
 *   - public/mobile-feed/feed-ar.json
 *   - mobile/src/data/bundledFeed.json (instantané hors-ligne embarqué)
 *
 * Règles éditoriales respectées (voir AGENTS.md) :
 *   - Seules les URL passées par `articleFooterSource` (`src/lib/articleSources.js`)
 *     sont exposées dans `officialUrl` (jamais de lien vers un média tiers).
 *   - Les traductions `en` et `ar` de `src/news/localized/{en,ar}` sont fusionnées
 *     sur chaque article ; `translated` indique si le corps traduit est présent.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { articleFooterSource } from '../src/lib/articleSources.js';
import { autoStories } from '../src/news/autoIndex.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://let-s-play-nu.vercel.app';
const LANGS = ['fr', 'en', 'ar'];
const MAX_FEED_ITEMS = 60;
const MAX_BUNDLED_ITEMS = 18;

const SUPERSEDED_AUTO_SLUGS = new Set([
  'physint-un-budget-de-400-millions-de-dollars-pour-le-jeu-de',
  'pendant-4h-cette-nuit-etat-de-grace-gta-6-allait-etre-jouabl',
]);

function parseStoryDate(dateStr) {
  const parts = String(dateStr || '').split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return 0;
  const [day, month, year] = parts;
  return year * 10000 + month * 100 + day;
}

function inferSection(slug, category = '') {
  const cleanSlug = String(slug || '').toLowerCase();
  const cat = String(category || '').toUpperCase();
  if (cleanSlug.startsWith('cinema/') || /CINÉMA|CINEMA|SÉRIES|SERIES|NETFLIX|DISNEY|BOX-OFFICE|FILM|MARVEL/.test(cat)) {
    return 'cinema';
  }
  if (cleanSlug.startsWith('tech/') || /\bTECH\b|\bIA\b|\bAI\b|OPENAI|NVIDIA|APPLE|GOOGLE|TESLA|STARSHIP/.test(cat)) {
    return 'tech';
  }
  return 'gaming';
}

function resolveRasterImage(story) {
  const candidates = [
    story.thumbnail,
    story.image,
    story.officialThumbnailUrl,
  ].filter((v) => typeof v === 'string' && v.trim());

  const toAbsolute = (raw) => {
    const trimmed = raw.trim().replace(/^\/+/, '');
    if (/^https?:\/\//i.test(raw)) return raw.trim();
    return `${SITE_ORIGIN}/${encodeURI(trimmed).replace(/%2F/g, '/')}`;
  };

  for (const candidate of candidates) {
    if (!/\.svg(\?|$)/i.test(candidate)) {
      return toAbsolute(candidate);
    }
  }
  return null;
}

async function loadDailyStories() {
  const dailyDir = path.join(ROOT, 'src', 'news', 'daily');
  const entries = await fs.readdir(dailyDir);
  const files = entries
    .filter((f) => f.endsWith('.js') && f !== 'seo-index.js')
    .sort()
    .reverse();

  const merged = {};
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(dailyDir, file)).href);
    const stories = mod.dailyStories || mod.default || {};
    for (const [slug, story] of Object.entries(stories)) {
      if (!merged[slug]) {
        merged[slug] = { ...story, slug };
      }
    }
  }

  for (const [slug, story] of Object.entries(autoStories || {})) {
    if (SUPERSEDED_AUTO_SLUGS.has(slug)) continue;
    if (!merged[slug]) {
      merged[slug] = { ...story, slug };
    }
  }

  return Object.values(merged).sort((a, b) => parseStoryDate(b.date) - parseStoryDate(a.date));
}

async function loadLocalizedListings(lang) {
  if (lang === 'fr') return {};
  const indexPath = path.join(ROOT, 'src', 'news', 'localized', lang, 'index.js');
  try {
    const mod = await import(pathToFileURL(indexPath).href);
    return mod.listings || mod.default || {};
  } catch {
    return {};
  }
}

async function loadLocalizedBody(lang, slug) {
  if (lang === 'fr') return null;
  const normalized = String(slug).replace(/^\/+/, '').replace(/^news\//, '').replace(/\.js$/, '');
  const bodyPath = path.join(ROOT, 'src', 'news', 'localized', lang, `${normalized}.js`);
  try {
    await fs.access(bodyPath);
    const mod = await import(pathToFileURL(bodyPath).href);
    return mod.default || mod.fields || null;
  } catch {
    return null;
  }
}

function shapeMobileArticle(baseStory, listingOverride, bodyOverride, lang) {
  const merged = {
    ...baseStory,
    ...(listingOverride || {}),
    ...(bodyOverride || {}),
  };

  const footerSource = articleFooterSource(baseStory);
  const section = inferSection(baseStory.slug, baseStory.category);

  return {
    slug: baseStory.slug,
    route: `/news/${String(baseStory.slug).replace(/^\/+/, '')}`,
    section,
    date: baseStory.date || '',
    category: merged.category || baseStory.category || 'ACTU',
    title: merged.title || baseStory.title || '',
    accent: merged.accent || baseStory.accent || '',
    dek: merged.dek || baseStory.dek || '',
    lead: merged.lead || '',
    intro: merged.intro || '',
    h2: merged.h2 || '',
    p1: merged.p1 || '',
    p2: merged.p2 || '',
    quote: merged.quote || '',
    quoteBy: merged.quoteBy || '',
    h2b: merged.h2b || '',
    p3: merged.p3 || '',
    p4: merged.p4 || '',
    take: merged.take || (lang === 'en' ? 'KEY TAKEAWAY' : lang === 'ar' ? 'خلاصة' : 'À RETENIR'),
    takeText: merged.takeText || '',
    readTime: merged.readTime || baseStory.readTime || (lang === 'en' ? '3 MIN READ' : lang === 'ar' ? '3 دقائق قراءة' : '3 MIN DE LECTURE'),
    image: resolveRasterImage(baseStory),
    imageAlt: merged.imageAlt || baseStory.imageAlt || '',
    credit: merged.credit || merged.imageCredit || baseStory.credit || '',
    sentiment: baseStory.sentiment || 'neutral',
    officialUrl: footerSource ? footerSource.href : null,
    translated: lang === 'fr' ? true : Boolean(bodyOverride),
  };
}

async function main() {
  const allStories = (await loadDailyStories()).slice(0, MAX_FEED_ITEMS);
  const outPublicDir = path.join(ROOT, 'public', 'mobile-feed');
  const outMobileDir = path.join(ROOT, 'mobile', 'src', 'data');
  await fs.mkdir(outPublicDir, { recursive: true });
  await fs.mkdir(outMobileDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const bundled = { generatedAt, feeds: {} };

  for (const lang of LANGS) {
    const listings = await loadLocalizedListings(lang);
    const items = [];
    for (const story of allStories) {
      const routeKey = `/news/${String(story.slug).replace(/^\/+/, '')}`;
      const listingOverride = listings[routeKey] || listings[story.slug] || null;
      const bodyOverride = await loadLocalizedBody(lang, story.slug);
      items.push(shapeMobileArticle(story, listingOverride, bodyOverride, lang));
    }
    const payload = {
      version: 1,
      lang,
      generatedAt,
      count: items.length,
      items,
    };
    await fs.writeFile(
      path.join(outPublicDir, `feed-${lang}.json`),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
    bundled.feeds[lang] = items.slice(0, MAX_BUNDLED_ITEMS);
  }

  await fs.writeFile(
    path.join(outMobileDir, 'bundledFeed.json'),
    `${JSON.stringify(bundled, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `[mobile-feed] Généré ${allStories.length} actus (FR/EN/AR) dans public/mobile-feed/ et ${MAX_BUNDLED_ITEMS} hors-ligne dans mobile/src/data/bundledFeed.json`,
  );
}

main().catch((err) => {
  console.error('[mobile-feed] Erreur :', err);
  process.exit(1);
});
