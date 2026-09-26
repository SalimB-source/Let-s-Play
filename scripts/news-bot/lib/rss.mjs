// Lecteur RSS 2.0 / Atom tolérant, sans dépendance : le but est de survivre
// aux flux hétéroclites (CDATA, entités HTML, catégories, dates manquantes…).

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ecirc: 'ê', auml: 'ä', ouml: 'ö',
  uuml: 'ü', ocirc: 'ô', icirc: 'î', uacute: 'ú', ugrave: 'ù', acirc: 'â', iuml: 'ï',
  oelig: 'œ', aelig: 'æ', ccedil: 'ç', copy: '©', reg: '®', trade: '™',
  euro: '€', deg: '°', times: '×', middot: '·',
};

export function decodeEntities(input) {
  if (!input) return '';
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

export function stripTags(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(block, ...tags) {
  for (const tag of tags) {
    const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}\\s*>`, 'i'));
    if (match) return stripTags(match[1]);
  }
  return '';
}

function pickLink(block) {
  // RSS : <link>texte</link> — Atom : <link rel="alternate" href="…"/>.
  const atomLinks = [...block.matchAll(/<link\b([^>]*?)\/?>(?:<\/link>)?/gi)]
    .map((match) => ({ attrs: match[1] || '', href: (match[1].match(/href="([^"]+)"/i) || [])[1] || '' }))
    .filter((link) => link.href);
  const alternate = atomLinks.find((link) => /rel=["']alternate["']/i.test(link.attrs));
  if (alternate) return alternate.href;
  if (atomLinks.length) return atomLinks[0].href;
  return pick(block, 'link', 'guid');
}

export function parseFeed(xml) {
  const blocks = [
    ...[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)].map((m) => m[1]),
    ...[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/gi)].map((m) => m[1]),
  ];
  const items = [];
  for (const block of blocks) {
    const title = pick(block, 'title');
    const url = pickLink(block);
    if (!title || !url) continue;
    const dateRaw = pick(block, 'pubDate', 'published', 'updated', 'dc:date');
    const parsed = dateRaw ? new Date(dateRaw) : null;
    const dateIso = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
    const summary = pick(block, 'description', 'summary', 'content:encoded', 'content');
    const categories = [...block.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category\s*>/gi)]
      .map((match) => stripTags(match[1])).filter(Boolean);
    const guid = pick(block, 'guid', 'id') || url;
    items.push({ guid, title, url, dateIso, summary, categories });
  }
  return items;
}
