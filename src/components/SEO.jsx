import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const SITE_URL = 'https://salimb-source.github.io/Let-s-Play';
const base = import.meta.env.BASE_URL;
const SITE_NAME = 'Let’s Play';
const DEFAULT_IMAGE = `${SITE_URL}/hero-lets-play.png`;

const pageMeta = {
  '/': {
    title: 'Let’s Play — Gaming, tech et pop culture en Algérie',
    description: 'Let’s Play est le média algérien dédié au gaming, à la tech, à l’e-sport, au cinéma et à la pop culture.',
    type: 'website',
  },
  '/news': {
    title: 'Actualités gaming — Let’s Play',
    description: 'Les dernières actualités du jeu vidéo, des consoles, du PC, de la tech et de la pop culture par la rédaction Let’s Play.',
    type: 'website',
  },
  '/reviews': {
    title: 'Tests de jeux vidéo — Let’s Play',
    description: 'Retrouvez les tests et analyses de jeux vidéo de Let’s Play : gameplay, technique, direction artistique et verdict.',
    type: 'website',
  },
  '/dossiers': {
    title: 'Dossiers gaming et pop culture — Let’s Play',
    description: 'Des dossiers de fond sur l’histoire du jeu vidéo, les générations de consoles, les studios et la culture gaming.',
    type: 'website',
  },
  '/events': {
    title: 'Events et partenaires — Let’s Play',
    description: 'Découvrez les événements, émissions et partenaires qui font vivre la scène gaming et e-sport algérienne.',
    type: 'website',
  },
  '/news/rayman-legends-retold': {
    title: 'Rayman Legends Retold reporté au 3 décembre 2026 — Let’s Play',
    description: 'Rayman Legends Retold est reporté au 3 décembre 2026 sur PS5, Xbox Series, Switch 2 et PC. Une vidéo de gameplay est annoncée le 22 septembre.',
    image: 'rayman-legends-retold-news.jpg', type: 'article', published: '2026-09-15', section: 'Actualités gaming',
  },
  '/news/fire-emblem-fortunes-weave': {
    title: 'Fire Emblem: Fortune’s Weave fait le point avant sa sortie — Let’s Play',
    description: 'Fire Emblem: Fortune’s Weave sortira le 17 septembre 2026 sur Nintendo Switch 2. Quatre protagonistes et des scénarios à entrelacer sont au cœur de cette nouvelle aventure.',
    image: 'fire-emblem-fortunes-weave-news.jpg', type: 'article', published: '2026-09-15', section: 'Actualités gaming',
  },
  '/news/cyberpunk-2077-battlenet': {
    title: 'Cyberpunk 2077 arrive sur Battle.net — Let’s Play',
    description: 'Cyberpunk 2077: Ultimate Edition rejoindra Battle.net en 2026 dans le prolongement du partenariat entre CD PROJEKT RED et Blizzard.',
    image: 'cyberpunk-2077-battlenet-news.webp', type: 'article', published: '2026-09-14', section: 'Actualités gaming',
  },
  '/news/persona-6-switch-2': {
    title: 'Persona 6 aura une édition physique sur Switch 2 — Let’s Play',
    description: 'Persona 6 est annoncé sur Switch 2, PS5, Xbox Series et PC, avec une édition physique prévue sur Nintendo Switch 2.',
    image: 'persona-6-news.jpg', type: 'article', published: '2026-09-14', section: 'Actualités gaming',
  },
  '/news/last-of-us-ii-mod': {
    title: 'Le mod multijoueur de The Last of Us Part II ne sortira pas — Let’s Play',
    description: 'Sony a demandé l’arrêt d’un projet de mod multijoueur destiné à The Last of Us Part II sur PC.',
    image: 'last-of-us-mod-news.jpg', type: 'article', published: '2026-09-14', section: 'Actualités gaming',
  },
};

const routeAliases = {
  '/partenaires': '/events',
};

function upsertMeta(attribute, value, content) {
  if (!content) return;
  let node = document.head.querySelector(`meta[${attribute}="${value}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, value);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function absoluteAsset(path) {
  if (!path) return DEFAULT_IMAGE;
  return `${SITE_URL}/${String(path).replace(/^\//, '')}`;
}

export default function SEO() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const key = routeAliases[pathname] || pathname;
  const meta = pageMeta[key] || {
    title: `${SITE_NAME} — Gaming et pop culture`,
    description: 'Let’s Play, média gaming et pop culture en Algérie : actualités, tests, dossiers et événements.',
    type: 'website',
  };
  const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;
  const image = absoluteAsset(meta.image);

  useEffect(() => {
    document.title = meta.title;
    document.documentElement.lang = lang || 'fr';
    upsertMeta('name', 'description', meta.description);
    upsertMeta('name', 'author', SITE_NAME);
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', meta.type || 'website');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', meta.title);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', image);

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    let structured = document.head.querySelector('#seo-jsonld');
    if (!structured) {
      structured = document.createElement('script');
      structured.id = 'seo-jsonld';
      structured.type = 'application/ld+json';
      document.head.appendChild(structured);
    }
    const graph = [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: `${SITE_URL}/`, logo: absoluteAsset('lets-play-logo.png') },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/`, publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: lang || 'fr' },
    ];
    if (meta.type === 'article') {
      graph.push({ '@type': 'NewsArticle', headline: meta.title.replace(' — Let’s Play', ''), description: meta.description, image: [image], datePublished: meta.published, dateModified: meta.published, author: { '@type': 'Organization', name: SITE_NAME }, publisher: { '@id': `${SITE_URL}/#organization` }, mainEntityOfPage: canonical, articleSection: meta.section });
    }
    structured.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  }, [canonical, image, lang, meta]);

  return null;
}
