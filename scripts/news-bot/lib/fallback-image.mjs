// Repli quand l’article source n’a pas de miniature officielle :
// on cherche une image officielle du sujet général (jeu, licence, éditeur).
//   1. Steam : visuel officiel « header » de la fiche du jeu ;
//   2. Wikipédia (FR puis EN) : image principale de la page du sujet.
// Seules des images matricielles (jpg/png/webp/avif) sont retenues : jamais de SVG.
import { fetchText } from './net.mjs';

const RASTER = /\.(jpe?g|png|webp|avif)(\?|$)/i;

const normalize = (text) => String(text || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Termes candidats : le début du titre, puis les entités repérées (avant « : », « – », « , »).
export function subjectCandidates(item) {
  const terms = [];
  const head = String(item.title || '').split(/\s[:–—-]\s|:|,|\?|!/)[0].trim();
  if (head && head.split(/\s+/).length <= 6) terms.push(head); // le plus précis d’abord
  terms.push(...(item.entities || []));
  return [...new Set(terms.map((term) => term.trim()).filter((term) => term.length >= 3))].slice(0, 4);
}

async function fromSteam(term) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=french&cc=FR`;
  const data = JSON.parse(await fetchText(url, { timeout: 10000, accept: 'application/json' }));
  const wanted = normalize(term);
  // On n’accepte qu’un jeu dont le nom contient réellement le sujet.
  const hit = (data.items || []).find((game) => normalize(game.name).includes(wanted));
  if (!hit) return null;
  const details = JSON.parse(await fetchText(`https://store.steampowered.com/api/appdetails?appids=${hit.id}&l=french`, { timeout: 10000, accept: 'application/json' }));
  const header = details?.[hit.id]?.data?.header_image;
  return header ? { url: header, credit: `Visuel officiel Steam — ${hit.name}` } : null;
}

async function fromWikipedia(term, lang) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(term)}&prop=pageimages&piprop=original`;
  const data = JSON.parse(await fetchText(url, { timeout: 10000, accept: 'application/json' }));
  const page = Object.values(data?.query?.pages || {})[0];
  const source = page?.original?.source;
  if (!source || !RASTER.test(source)) return null;
  if (!normalize(page.title).includes(normalize(term).split(' ')[0])) return null;
  return { url: source, credit: `Image officielle du sujet — ${page.title} (Wikipédia)` };
}

export async function findSubjectImage(item) {
  for (const term of subjectCandidates(item)) {
    for (const lookup of [() => fromSteam(term), () => fromWikipedia(term, 'fr'), () => fromWikipedia(term, 'en')]) {
      try {
        const found = await lookup();
        if (found) return { ...found, term };
      } catch { /* source suivante */ }
    }
  }
  return null;
}
