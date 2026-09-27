// Schéma d’un article « actus » — les mêmes champs que les articles manuels de
// src/pages/CurrentNews.jsx — plus la composition en mode gabarit (sans IA).
//
// Règle d’or : chaque phrase de la source ne sert qu’UNE fois. dek, lead,
// intro, p1, quote, p2, p3 et takeText piochent dans un pot commun de phrases
// dédupliquées — jamais deux champs ne partagent le même passage (contrôlé par
// detectRepetitions et bloqué par validateStory).

export const REQUIRED_FIELDS = [
  'slug', 'date', 'category', 'image', 'imageAlt', 'cover',
  'title', 'accent', 'dek', 'lead',
  'h2', 'p1', 'h2b', 'p4',
  'take', 'source', 'sourceUrl', 'sourceDetail',
];

// Champs éditoriaux servis quand la source a assez de matière. Le gabarit
// extractif les laisse vides sur les sources trop courtes plutôt que de
// répéter une phrase déjà publiée ; le rendu saute alors le bloc concerné.
export const OPTIONAL_FIELDS = ['intro', 'quote', 'quoteBy', 'p2', 'p3', 'takeText'];

// Budget d'un gros titre, en caractères — même règle que les titres écrits à
// la main sur le site (voir src/typography.css, bloc 3) : « title » porte
// l'amorce (l'entité, souvent le nom du jeu), « accent » la chute, et le tout
// doit tenir sur trois lignes à l'écran — y compris dans une carte de la
// grille Actus, large de ~200px sur PC. Au-delà de ~40 caractères, le titre
// passe sur une quatrième ligne.
export const HEADLINE_BUDGET = { title: 20, accent: 24, total: 40 };

// Ramène un texte au budget sans jamais couper un mot : on retire des mots
// entiers depuis la fin, et on préfère s'arrêter sur une ponctuation faible
// (virgule, deux-points) quand il y en a une dans la dernière partie du budget
// — la chute reste alors une proposition lisible.
function fitToBudget(text, max) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max + 1);
  const punctuation = Math.max(head.lastIndexOf(','), head.lastIndexOf(':'), head.lastIndexOf(';'), head.lastIndexOf(' – '));
  if (punctuation >= max * 0.55) return head.slice(0, punctuation).trimEnd();
  const cut = clean.slice(0, max + 1).replace(/\s+\S*$/, '').trimEnd();
  if (cut) return cut;
  // Un seul mot, plus long que le budget : on taille dedans, faute de mieux.
  return clean.slice(0, Math.max(1, max - 1)).trimEnd();
}

// Applique le budget à un couple title/accent, en gardant la chute lisible :
// l'accent est une phrase — elle finit par un point, et ne commence jamais par
// une ponctuation orpheline (« : AEGIS RIM… »).
export function fitHeadline(title, accent) {
  let short = fitToBudget(String(title || '').toUpperCase(), HEADLINE_BUDGET.title).replace(/[.,;:!?\s–—-]+$/, '');
  let tail = String(accent || '').replace(/\s+/g, ' ').trim().replace(/^[\s:;,.–—-]+/, '');
  const total = HEADLINE_BUDGET.total - short.length - 1; // -1 : l'espace entre les deux champs
  tail = fitToBudget(tail, Math.max(1, Math.min(HEADLINE_BUDGET.accent, total)));
  if (!tail) tail = fitToBudget(String(accent || title || 'ACTU'), HEADLINE_BUDGET.accent);
  if (!short) short = fitToBudget(String(title || tail).toUpperCase(), HEADLINE_BUDGET.title);
  if (!/[.!?]$/.test(tail)) tail += '.';
  return { title: short, accent: tail };
}

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
  const upper = String(headline).toUpperCase().replace(/\s+/g, ' ').trim();
  const words = upper.split(' ').filter(Boolean);
  // Amorce : les premiers mots, tant qu'ils tiennent dans le budget du champ
  // « title » (au moins un mot, même long).
  const title = [];
  let length = 0;
  for (const word of words) {
    const next = length + word.length + (title.length ? 1 : 0);
    if (title.length && next > HEADLINE_BUDGET.title) break;
    title.push(word);
    length = next;
  }
  const accent = words.slice(Math.max(1, title.length)).join(' ');
  // Titre d'un seul mot (ou source sans chute) : l'amorce se réduit au premier
  // mot, la chute récupère le reste — jamais deux champs identiques.
  if (!accent) {
    const head = title[0] || upper;
    return fitHeadline(head, words.slice(1).join(' ') || head);
  }
  // Le budget complet s'applique au couple : la chute récupère la place
  // laissée libre par l'amorce.
  return fitHeadline(title.join(' '), accent);
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

// Clé de comparaison : apostrophes unifiées, minuscules, espaces réduits.
// Sert à la déduplication des phrases et à la détection de répétitions.
export function normalizeKey(text) {
  return String(text).replace(/['’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
}

// Scories d’extraction HTML : espaces parasites autour des parenthèses,
// guillemets et signes faibles, élidations désolidarisées (« d' Aniimo »).
// Ne touche pas aux espaces françaises avant : ; ! ? ni après «.
export function polishSentence(text) {
  return String(text)
    .replace(/(^|[\s«"'(])((?:[dlnscjm]|qu|jusqu|lorsqu|puisqu|quoiqu|presqu|quelqu)') (?=[A-Za-zÀ-ÿ0-9«"'(])/g, '$1$2')
    .replace(/\s+([)\],.…])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pot commun de phrases : ordre d’apparition, une seule occurrence par phrase.
// C’est la garantie anti-répétition du gabarit : chaque champ consomme des
// phrases de ce pot, aucune phrase ne sert deux fois.
export function sentencePool(...texts) {
  const seen = new Set();
  const pool = [];
  for (const text of texts) {
    for (const sentence of sentenceSplit(text || '')) {
      const polished = polishSentence(sentence);
      const key = normalizeKey(polished);
      if (key.length < 2 || seen.has(key)) continue;
      seen.add(key);
      pool.push(polished);
    }
  }
  return pool;
}

// Plus longue sous-chaîne commune (assez rapide sur des textes < 1 200 chars).
function longestCommonSubstring(a, b) {
  if (!a || !b) return 0;
  let best = 0;
  let prev = new Uint16Array(b.length + 1);
  let curr = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > best) best = curr[j];
      } else {
        curr[j] = 0;
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return best;
}

// Champs lus les uns après les autres sur la page article : c’est entre eux
// qu’une répétition se voit (p4 est un bloc méta à part, hors contrôle).
export const RENDERED_FIELDS = ['dek', 'lead', 'intro', 'p1', 'quote', 'p2', 'p3', 'takeText'];

// Répétition = un passage de « threshold » caractères (ou plus) présent dans
// deux champs rendus. Renvoie la liste des paires fautives.
export function detectRepetitions(story, { threshold = 70 } = {}) {
  const texts = RENDERED_FIELDS
    .filter((field) => typeof story[field] === 'string' && story[field].trim())
    .map((field) => ({ field, text: normalizeKey(story[field]) }));
  const issues = [];
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      const length = longestCommonSubstring(texts[i].text, texts[j].text);
      if (length >= threshold) issues.push({ a: texts[i].field, b: texts[j].field, length });
    }
  }
  return issues;
}

// Score d’une phrase candidate à la citation ou au résumé final :
// longueur éditoriale, présence de l’entité principale, chiffres.
function scoreSentence(sentence, entity) {
  let score = 0;
  if (sentence.length >= 80 && sentence.length <= 190) score += 4;
  if (entity && new RegExp(escapeRegExp(entity), 'i').test(sentence)) score += 3;
  if (/\d/.test(sentence)) score += 1;
  return score;
}

function pickScored(pool, entity) {
  let bestIndex = -1;
  let bestScore = -1;
  pool.forEach((sentence, index) => {
    const score = scoreSentence(sentence, entity);
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  });
  return bestIndex;
}

// Découpage du pot en champs éditoriaux, sans jamais réutiliser une phrase.
// Ordre de lecture : dek → lead → intro → p1 → quote → p2 → p3 → takeText.
// Quand le pot s’épuise, les derniers champs restent vides (rendu sauté) :
// une actu courte vaut mieux qu’une actu qui se répète.
export function allocateExtractiveFields(pool, entity) {
  let cursor = 0;
  // Consomme 1 phrase (2 si la première est trop courte pour ouvrir un bloc),
  // puis continue tant qu’on n’a pas dépassé le budget de caractères.
  const consume = (maxChars, maxCount) => {
    if (cursor >= pool.length) return '';
    const parts = [pool[cursor]];
    cursor += 1;
    let total = parts[0].length;
    const target = parts[0].length < 60 && cursor < pool.length ? 2 : 1;
    while (cursor < pool.length && parts.length < maxCount) {
      const next = pool[cursor];
      if (parts.length >= target && total + next.length + 1 > maxChars) break;
      parts.push(next);
      total += next.length + 1;
      cursor += 1;
    }
    return condense(parts.join(' '), maxChars);
  };
  const fields = { dek: '', lead: '', intro: '', p1: '', quote: '', p2: '', p3: '', takeText: '' };
  fields.dek = consume(280, 2);
  fields.lead = consume(300, 2);
  // intro seulement s’il reste assez de matière pour le corps (p1 et plus).
  if (pool.length - cursor >= 4) fields.intro = consume(320, 2);
  fields.p1 = consume(420, 3);
  if (pool.length - cursor >= 2) {
    const quoteIndex = cursor + pickScored(pool.slice(cursor), entity);
    fields.quote = condense(pool[quoteIndex], 190);
    pool.splice(quoteIndex, 1);
  }
  if (pool.length - cursor >= 1) fields.p2 = consume(420, 3);
  const remaining = pool.length - cursor;
  if (remaining >= 2) {
    const takeIndex = cursor + pickScored(pool.slice(cursor), entity);
    fields.takeText = condense(pool[takeIndex], 240);
    pool.splice(takeIndex, 1);
    fields.p3 = consume(900, pool.length - cursor);
  } else if (remaining === 1) {
    fields.p3 = consume(900, 1);
  }
  return fields;
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

// Sentiment global de l'actu : vert (positive), rouge (negative), jaune (mixed).
// Détecté à partir du titre/résumé/category pour alimenter le smiley en haut à droite des miniatures.
const POSITIVE_SENT = /(succès|succes|million|record|victoire|remport|gagn|prime|récompens|annonce|dévoile|arrive|arrivée|lancement|lance|disponible|sortie|exclus|nouveau|nouvelle|innovation|amélior|partenariat|collaboration|célèbre|fête|festival|révèle|numéro un|première place|garde la première|passe à l'attaque|change de quartier|fait des jaloux)/i;
const NEGATIVE_SENT = /(licenciement|licenciements|suppression|consolidation|annulation|perd son dernier jour|report|repouss|retard|prend un peu de retard|reste au garage|ne sortira pas|échec|controverse|procès|plainte|justice|accuse|fermeture|baisse|chute|difficulté|crise|typhon|annule|demande l'arrêt)/i;

export function inferSentiment(item, extracted) {
  const hay = `${item.title || ''} ${item.summary || ''} ${extracted?.description || ''} ${buildCategory(item, {})}`.toLowerCase();
  const pos = POSITIVE_SENT.test(hay);
  const neg = NEGATIVE_SENT.test(hay);
  // Négatif prime, sauf si les deux coexistent avec un signal de nuance.
  const hasMixedHint = /(mais|pourtant|cependant|nuance|mitigé|contrasté|incertain)/i.test(hay);
  if (pos && neg) return hasMixedHint ? 'mixed' : 'negative';
  if (neg) return 'negative';
  if (pos) return 'positive';
  return 'mixed';
}

// Variantes du paragraphe de transparence (p4) : tourner d’un article à
// l’autre pour ne pas infliger le même bloc à chaque actu. Le texte reste
// strictement méta — aucun fait inventé, aucune promesse sur une « fenêtre de
// sortie » qui n’aurait aucun sens sur une rétrospective ou un plan social.
const P4_VARIANTS = [
  'Cet article a été préparé automatiquement par la rédaction Let’s Play à partir de la source citée ci-dessous. Les prochaines communications officielles préciseront la suite. De votre côté, quel élément mérite d’être surveillé en premier ? Dites-le dans les commentaires.',
  'Cet article a été préparé automatiquement par la rédaction Let’s Play à partir de la source citée ci-dessous. La rédaction suivra les prochaines annonces pour compléter le dossier. Et vous, qu’avez-vous envie de voir en premier ? Dites-le dans les commentaires.',
  'Cet article a été préparé automatiquement par la rédaction Let’s Play à partir de la source citée ci-dessous. Chaque nouveau communiqué officiel permettra d’en savoir plus. Quel point doit-on suivre en priorité selon vous ? Répondez dans les commentaires.',
];

export function autoClosing(slug) {
  let hash = 0;
  for (const char of String(slug)) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return P4_VARIANTS[hash % P4_VARIANTS.length];
}

// Composition « sans IA » : assemblage extractif dans le gabarit éditorial.
// Les textes proviennent uniquement de la source citée ; chaque phrase sert au
// plus une fois (pot commun dédupliqué), et le dernier paragraphe indique
// clairement que l’article est généré automatiquement.
export function templateCompose(item, extracted, { date, image, slug }) {
  const headline = item.title;
  const { title, accent } = splitHeadline(headline);
  const description = extracted.description || item.summary || headline;
  const paragraphs = extracted.paragraphs.length ? extracted.paragraphs : [];
  const entity = mainEntity(item);
  const cover = (item.entities && item.entities[0] ? item.entities[0] : headline.split(' ').slice(0, 3).join(' ')).toUpperCase();
  // Toutes les phrases utiles, dans l’ordre de la source : corps d’article
  // d’abord, description RSS ensuite (ses phrases inédites complètent le pot).
  const pool = sentencePool(...paragraphs, description);
  if (!pool.length) pool.push(condense(description, 280) || headline);
  const fields = allocateExtractiveFields(pool, entity);
  const sentiment = inferSentiment(item, extracted);
  return {
    slug, date, category: buildCategory(item, { p1: fields.p1 }),
    image, imageAlt: `${headline} — visuel éditorial Let’s Play`,
    cover,
    title, accent,
    dek: fields.dek,
    lead: fields.lead,
    intro: fields.intro,
    h2: 'LES FAITS',
    p1: fields.p1,
    quote: fields.quote,
    quoteBy: fields.quote ? 'L’ANALYSE LET’S PLAY' : '',
    h2b: 'LE CONTEXTE',
    p2: fields.p2, p3: fields.p3,
    p4: autoClosing(slug),
    take: 'À RETENIR',
    takeText: fields.takeText,
    source: `D’après ${item.source?.name || 'la source citée'}, article consulté le ${date}.`,
    sourceUrl: item.url,
    sourceDetail: 'Lire l’article source',
    credit: 'Visuel : carte éditoriale Let’s Play générée automatiquement.',
    sentiment,
  };
}

const LENGTH_RULES = {
  // Titrage : le couple title + accent doit tenir sur trois lignes (HEADLINE_BUDGET).
  title: HEADLINE_BUDGET.title, accent: HEADLINE_BUDGET.accent, category: 70, cover: 40, dek: 400, lead: 500, intro: 600,
  h2: 70, p1: 900, quote: 300, quoteBy: 80, h2b: 70, p2: 900, p3: 900, p4: 900,
  take: 40, takeText: 400, source: 300, sourceDetail: 80, sourceUrl: 1000,
  sentiment: 20,
};

// Validation stricte : un article incomplet ou hors gabarit ne part jamais en prod.
export function validateStory(story, { internal = false } = {}) {
  if (!story || typeof story !== 'object') throw new Error('story absente');
  for (const field of REQUIRED_FIELDS) {
    if (typeof story[field] !== 'string' || !story[field].trim()) {
      throw new Error(`champ « ${field} » manquant ou vide`);
    }
  }
  // Les champs optionnels peuvent être vides (source courte) mais jamais
  // contenir un contenu invalide.
  for (const field of OPTIONAL_FIELDS) {
    if (story[field] != null && typeof story[field] !== 'string') {
      throw new Error(`champ « ${field} » invalide`);
    }
  }
  if (story.sentiment && !['positive', 'negative', 'mixed', 'neutral'].includes(String(story.sentiment).toLowerCase())) {
    throw new Error(`champ « sentiment » invalide : ${story.sentiment}`);
  }
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(story.date)) throw new Error(`champ « date » invalide : ${story.date}`);
  if (!story.slug || !/^[a-z0-9-]+$/.test(story.slug)) throw new Error(`slug invalide : ${story.slug}`);
  if (!story.image.startsWith('news-auto/') || !/\.(jpg|png|webp|avif|gif)$/.test(story.image)) throw new Error(`image invalide (photo requise) : ${story.image}`);
  if (!story.thumbnail || !story.thumbnail.startsWith('news-auto/') || !/-official\.(jpg|png|webp|avif|gif)$/.test(story.thumbnail)) throw new Error(`thumbnail officielle invalide : ${story.thumbnail || 'absente'}`);
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
  // Anti-répétition : deux champs rendus ne doivent pas partager un même
  // passage. Une actu qui se répète est une actu refusée.
  const repetitions = detectRepetitions(story);
  if (repetitions.length) {
    const detail = repetitions.map((issue) => `${issue.a}↔${issue.b} (${issue.length} caractères)`).join(', ');
    throw new Error(`répétitions entre champs rendus : ${detail}`);
  }
  if (!internal && !story.credit) throw new Error('champ « credit » manquant');
  return true;
}
