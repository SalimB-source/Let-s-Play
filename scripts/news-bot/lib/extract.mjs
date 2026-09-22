// Extraction de la matière première d’un article : JSON-LD d’abord (le plus
// propre), méta descriptions ensuite, moisson de <p> en dernier recours.

import { fetchText } from './net.mjs';
import { decodeEntities, stripTags } from './rss.mjs';

const JUNK_LINE = /abonnez|s’abonner|s'abonner|newsletter|cookie|publicit[ée]|lire aussi|à lire aussi|a lire aussi|partager|tous droits r[ée]serv[ée]s|©|cliquez|crédits? photo|image :|d[ée]j[àa] abonné|rejoignez la communaut[ée]/i;

function metaContent(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) return decodeEntities(match[1]).trim();
  }
  return '';
}

function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);
        blocks.push(node);
      }
    } catch { /* bloc JSON-LD invalide : on ignore */ }
  }
  return blocks;
}

export function extractFromHtml(html) {
  const ld = jsonLdBlocks(html);
  const article = ld.find((node) => /Article|NewsArticle|BlogPosting|ReportageNewsArticle/i.test(String(node['@type'] || '')));
  const headline = article?.headline
    || metaContent(html, [/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i, /<title[^>]*>([\s\S]*?)<\/title>/i]);
  let body = typeof article?.articleBody === 'string' ? article.articleBody : '';
  let paragraphs = [];
  if (body) {
    paragraphs = body.split(/\n{2,}|\n/).map((part) => stripTags(part)).filter(Boolean);
  } else {
    const scope = html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1] || html;
    const cleaned = scope
      .replace(/<(script|style|nav|header|footer|aside|form|figure)[\s>][\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');
    paragraphs = [...cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
      .map((match) => stripTags(match[1]))
      .filter((text) => text.length >= 60 && !JUNK_LINE.test(text));
  }
  paragraphs = paragraphs
    .map((text) => text.slice(0, 1400))
    .filter((text) => text.length >= 50)
    .slice(0, 8);
  const description = article?.description
    || metaContent(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
    ])
    || paragraphs[0]
    || '';
  return { headline: decodeEntities(headline).trim(), description, paragraphs };
}

export async function extractArticle(url) {
  const html = await fetchText(url, { accept: 'text/html' });
  const extracted = extractFromHtml(html);
  if (!extracted.headline && !extracted.paragraphs.length) {
    throw new Error('aucun contenu extractible');
  }
  return extracted;
}
