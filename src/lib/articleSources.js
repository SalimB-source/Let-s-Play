import { articleTrailers } from '../articleTrailers.js';

// Video IDs come from the editorial registry of verified official channels.
const officialVideoIds = new Set(Object.values(articleTrailers).flatMap(entry =>
  (entry.items || []).filter(item => item.verified && item.channel).map(item => item.id)));

// Fail closed: a new publisher must be reviewed before its footer link is shown.
// Never infer official status from article copy, a label, or a lookalike hostname.
const officialDomains = [
  'playstation.com', 'xbox.com', 'microsoft.com', 'nintendo.com',
  'rockstargames.com', 'sony.com', 'apple.com', 'google.com', 'blog.google',
  'deepmind.google', 'openai.com', 'nvidia.com', 'netflix.com',
  'koeitecmoamerica.com', 'merlinentertainments.biz', 'minecraft.net',
  'thewitcher.com', 'remedygames.com', 'tgs.cesa.or.jp', 'callofduty.com',
  'research.google',
  'dropbox.com', 'press.disney.co.uk',
  'longcat.ai', 'st.com', 'lightyearfrontier.com',
];

export function officialSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    // Exact partnership announcement supplied by the publisher; never allow all Facebook posts.
    if (url.href === 'https://www.facebook.com/photo/?fbid=1787284180064227&set=pb.100063479863011.-2207520000') return url.href;
    if (host === 'www.youtube.com' || host === 'youtube.com') {
      const id = url.searchParams.get('v');
      return url.pathname === '/watch' && officialVideoIds.has(id)
        ? `https://www.youtube.com/watch?v=${id}` : null;
    }
    return officialDomains.some(domain => host === domain || host.endsWith(`.${domain}`)) ? url.href : null;
  } catch {
    return null;
  }
}

// Do not reuse legacy source/sourceDetail text: it can mix an official
// announcement with third-party press citations. Keep research metadata intact.
//
// Aucun libellé ici : le texte affiché appartient à l'interface, donc au
// dictionnaire (`article.sourceOfficial`). Cette fonction ne rend que le lien
// vérifié — c'est elle qui fait foi, et `check:daily-news` l'interroge telle
// quelle pour savoir si un article doit afficher un lien.
export function articleFooterSource(story) {
  const href = officialSourceUrl(story?.sourceUrl);
  return href ? { href } : null;
}
