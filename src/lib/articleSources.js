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
  'bandainamcoent.com', 'bandainamcoent.eu',
  'thewitcher.com', 'remedygames.com', 'tgs.cesa.or.jp', 'callofduty.com',
  'research.google',
  // Figma product release notes and vendor help reviewed for 19 November.
  'figma.com',
  // Official Bethesda publisher news, verified on Slayers Club for the 16 November edition.
  'bethesda.net',
  'dropbox.com', 'press.disney.co.uk',
  'longcat.ai', 'st.com', 'lightyearfrontier.com',
  // Official The Game Awards site, verified for the 18 November 2026 edition
  // (nominees announced 17 November, ceremony 10 December).
  'thegameawards.com',
];

export function officialSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    // Only these individually reviewed pages, never the whole hosting platform.
    // Google Developers vendor articles, not arbitrary googleblog.com blogs.
    if (['https://developers.googleblog.com/check-what-your-ai-agents-do-before-they-do-it-with-semantic-governance-policies/',
      'https://developers.googleblog.com/agent-anomaly-detection-safeguarding-agents-across-other-clouds/'].includes(url.href)) return url.href;
    // Official Miami HEAT event page reviewed for the 18 November edition.
    if (url.href === 'https://www.nba.com/heat/uniforms/2627-heat-vice-city-uniform-collection') return url.href;
    // Official Discord product announcement, not a community server or user content.
    if (url.href === 'https://discord.com/blog/vice-city-theme-available-in-discord') return url.href;
    if (url.href === 'https://www.facebook.com/photo/?fbid=1787284180064227&set=pb.100063479863011.-2207520000') return url.href;
    // The S-GAME publisher listing supplies an official Phantom Blade Zero visual.
    if (url.href === 'https://store.epicgames.com/p/phantom-blade-zero-e78a35') return url.href;
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
