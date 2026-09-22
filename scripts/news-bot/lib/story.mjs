// Schéma d’un article « actus » — les mêmes champs que les articles manuels de
// src/pages/CurrentNews.jsx — plus la composition en mode gabarit (sans IA).

export const REQUIRED_FIELDS = [
  'slug', 'date', 'category', 'image', 'imageAlt', 'cover',
  'title', 'accent', 'dek', 'lead', 'intro',
  'h2', 'p1', 'quote', 'quoteBy', 'h2b', 'p2', 'p3', 'p4',
  'take', 'takeText', 'source', 'sourceUrl', 'sourceDetail',
];

export function slugify(input) {
  return String(input)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
    .slice(0, 60).replace(/-+$/g, '') || 'actu';
}

// Date affichée au format éditorial du site, fuseau Europe/Paris.
export function formatParisDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '01';
  return `${get('day')}.${get('month')}.${get('year')}`;
}

export function splitHeadline(headline) {
  const upper = headline.toUpperCase().replace(/\s+/g, ' ').trim();
  const words = upper.split(' ');
  const target = Math.max(1, Math.round((upper.length * 0.38) / 6)); // ≈ 1-3 mots forts
  let cut = 0;
  let length = 0;
  while (cut < words.length - 1 && (cut < target || length < 10)) {
    length += words[cut].length + 1;
    cut += 1;
  }
  let title = words.slice(0, cut).join(' ').replace(/[.,;:!]+$/, '');
  let accent = words.slice(cut).join(' ');
  if (!accent) { accent = title; title = words[0] || 'ACTU'; }
  if (!/[.!?]$/.test(accent)) accent += '.';
  return { title, accent };
}

export function sentenceSplit(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[«"'(A-ZÀ-ÖØ-Þ0-9])/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

// Raccourcit un texte en finissant sur une phrase (jamais au milieu d’un mot).
export function condense(text, max) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const sentences = sentenceSplit(clean);
  let out = '';
  for (const sentence of sentences) {
    if (out && `${out} ${sentence}`.length > max) break;
    out = out ? `${out} ${sentence}` : sentence;
    if (out.length > max * 0.6) break;
  }
  if (!out) out = clean.slice(0, max);
  if (!/[.!?…]$/.test(out)) {
    const lastStop = Math.max(out.lastIndexOf('.'), out.lastIndexOf('!'), out.lastIndexOf('?'));
    out = lastStop > max * 0.5 ? out.slice(0, lastStop + 1) : `${out.slice(0, max - 1).trimEnd()}…`;
  }
  return out;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickQuote(paragraphs, entity) {
  const sentences = paragraphs.flatMap((paragraph) => sentenceSplit(paragraph));
  const scored = sentences.map((sentence) => {
    let score = 0;
    if (sentence.length >= 80 && sentence.length <= 190) score += 4;
    if (entity && new RegExp(escapeRegExp(entity), 'i').test(sentence)) score += 3;
    if (/\d/.test(sentence)) score += 1;
    return { sentence, score };
  }).sort((a, b) => b.score - a.score);
  return condense(scored[0]?.sentence || paragraphs[0] || '', 190);
}

const TOPIC_LABELS = [
  [/\bnintendo|switch\b/i, 'NINTENDO'],
  [/\bplaystation|\bps5\b|\bsony\b/i, 'PLAYSTATION'],
  [/\bxbox|\bmicrosoft\b/i, 'XBOX'],
  [/\bpc\b|\bsteam\b|\bvalve\b/i, 'PC'],
  [/\besport\b|championnat|coupe du monde/i, 'E-SPORT'],
  [/\bfilm\b|\bsérie\b|\bnetflix\b|\banime\b|\bmanga\b/i, 'POP CULTURE'],
  [/\bsortie\b|\bdate\b|\bj-|sortira/i, 'SORTIES'],
];

export function topicLabel(text) {
  for (const [pattern, label] of TOPIC_LABELS) if (pattern.test(text)) return label;
  return 'ACTUALITÉ';
}

export function buildCategory(item, story) {
  const subject = (item.source?.name || 'ACTU').toUpperCase().replace(/\s+/g, ' ');
  const haystack = `${item.title} ${story?.p1 || ''} ${item.summary || ''}`;
  return `${topicLabel(haystack)} · ${subject}`;
}

const BRAND_CASE = {
  ps5: 'PS5', ps4: 'PS4', xbox: 'Xbox', pc: 'PC', sega: 'SEGA', atlus: 'Atlus',
  gta: 'GTA', ea: 'EA', tgs: 'TGS', e3: 'E3', ign: 'IGN', vgc: 'VGC', ai: 'IA',
};

// Entité principale : celle qui apparaît le plus tôt dans le titre/résumé,
// à position égale la plus longue — c’est elle qui habille le « p4 ».
function mainEntity(item) {
  const haystack = ` ${`${item.title} ${item.summary || ''}`.toLowerCase()} `;
  const found = (item.entities || [])
    .map((entity) => ({ entity, at: haystack.indexOf(` ${entity.toLowerCase()} `) }))
    .filter((hit) => hit.at >= 0)
    .sort((a, b) => a.at - b.at || b.entity.length - a.entity.length);
  const best = (found[0]?.entity || (item.title || '').split(' ').slice(0, 2).join(' ')).toLowerCase();
  const smartCase = (word) => BRAND_CASE[word] || (word.charAt(0).toUpperCase() + word.slice(1));
  return best.split(' ').map(smartCase).join(' ');
}

// Composition « sans IA » : assemblage extractif dans le gabarit éditorial.
// Les textes proviennent uniquement de la source citée, le dernier paragraphe
// indique clairement que l’article est généré automatiquement.
export function templateCompose(item, extracted, { date, image, slug }) {
  const headline = item.title;
  const { title, accent } = splitHeadline(headline);
  const dek = condense(extracted.description || item.summary || headline, 280);
  const paragraphs = extracted.paragraphs.length ? extracted.paragraphs : [dek];
  const entity = mainEntity(item);
  const cover = (item.entities && item.entities[0] ? item.entities[0] : headline.split(' ').slice(0, 3).join(' ')).toUpperCase();
  const bodySentences = sentenceSplit(paragraphs.join(' '));
  const lead = condense(bodySentences.slice(0, 2).join(' ') || dek, 300);
  const intro = condense(bodySentences.slice(2, 4).join(' ') || paragraphs[0] || dek, 320);
  const p1 = condense(paragraphs[0] || dek, 480);
  const p2 = condense(paragraphs[1] || dek, 480);
  const p3 = condense(paragraphs[2] || paragraphs[1] || dek, 480);
  const p4 = `Cet article a été préparé automatiquement par la rédaction Let’s Play à partir de la source citée ci-dessous. Les prochains communiqués de ${entity} préciseront la suite : fenêtre de sortie, supports et contenus restent à confirmer par l’éditeur.`;
  return {
    slug, date, category: buildCategory(item, { p1 }),
    image, imageAlt: `${headline} — visuel éditorial Let’s Play`,
    cover,
    title, accent,
    dek,
    lead,
    intro,
    h2: 'LES FAITS',
    p1,
    quote: pickQuote(paragraphs.slice(0, 3), entity),
    quoteBy: 'L’ANALYSE LET’S PLAY',
    h2b: 'LE CONTEXTE',
    p2, p3, p4,
    take: 'À RETENIR',
    takeText: condense(sentenceSplit(dek)[0] || dek, 240),
    source: `D’après ${item.source?.name || 'la source citée'}, article consulté le ${date}.`,
    sourceUrl: item.url,
    sourceDetail: 'Lire l’article source',
    credit: 'Visuel : carte éditoriale Let’s Play générée automatiquement.',
  };
}

const LENGTH_RULES = {
  title: 60, accent: 80, category: 70, cover: 40, dek: 400, lead: 500, intro: 600,
  h2: 70, p1: 900, quote: 300, quoteBy: 80, h2b: 70, p2: 900, p3: 900, p4: 900,
  take: 40, takeText: 400, source: 300, sourceDetail: 80, sourceUrl: 1000,
};

// Validation stricte : un article incomplet ou hors gabarit ne part jamais en prod.
export function validateStory(story, { internal = false } = {}) {
  if (!story || typeof story !== 'object') throw new Error('story absente');
  for (const field of REQUIRED_FIELDS) {
    if (typeof story[field] !== 'string' || !story[field].trim()) {
      throw new Error(`champ « ${field} » manquant ou vide`);
    }
  }
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(story.date)) throw new Error(`champ « date » invalide : ${story.date}`);
  if (!story.slug || !/^[a-z0-9-]+$/.test(story.slug)) throw new Error(`slug invalide : ${story.slug}`);
  if (!story.image.startsWith('news-auto/') || !story.image.endsWith('.svg')) throw new Error(`image invalide : ${story.image}`);
  if (!story.thumbnail || !story.thumbnail.startsWith('news-auto/') || !/-official\.(jpg|png|webp|avif|gif|svg)$/.test(story.thumbnail)) throw new Error(`thumbnail officielle invalide : ${story.thumbnail || 'absente'}`);
  if (!/^https?:\/\//.test(story.officialThumbnailUrl)) throw new Error(`officialThumbnailUrl invalide : ${story.officialThumbnailUrl}`);
  if (!/^https?:\/\//.test(story.sourceUrl)) throw new Error(`sourceUrl invalide : ${story.sourceUrl}`);
  for (const [field, max] of Object.entries(LENGTH_RULES)) {
    if (story[field] && story[field].length > max) throw new Error(`champ « ${field} » trop long (${story[field].length} > ${max})`);
  }
  for (const [field, value] of Object.entries(story)) {
    if (typeof value === 'string' && /[<>]|<\/?(script|iframe)/i.test(value) && field !== 'sourceUrl') {
      throw new Error(`champ « ${field} » contient du HTML non autorisé`);
    }
  }
  if (!internal && !story.credit) throw new Error('champ « credit » manquant');
  return true;
}
