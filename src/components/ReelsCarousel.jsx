import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Carrousel de reels Instagram.
 *
 * Même mise en page que le bloc « reels » de la page d'accueil (label de
 * section, tête avec eyebrow + titre + lien, cartes verticales au format
 * court) mais en version carrousel : défilement horizontal, boutons
 * précédent / suivant et embeds Instagram officiels.
 *
 * Les reels sont intégrés via le snippet officiel Instagram : un
 * <blockquote class="instagram-media"> transformé en iframe par le script
 * https://www.instagram.com/embed.js. Si le script est bloqué (réseau,
 * bloqueur de publicité, Instagram indisponible…), chaque carte bascule sur
 * un état de repli qui renvoie directement vers le reel sur Instagram —
 * la section reste donc toujours lisible et cliquable.
 */

const IG_EMBED_SRC = 'https://www.instagram.com/embed.js';

// Temps laissé à Instagram pour transformer le blockquote en iframe avant de
// considérer l'embed indisponible et d'afficher l'état de repli.
const READY_TIMEOUT = 10000;

let embedLoader = null;

function loadInstagramEmbeds() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return Promise.reject(new Error('Instagram embeds need a browser'));
  }
  if (window.instgrm && window.instgrm.Embeds) return Promise.resolve(window.instgrm);
  if (embedLoader) return embedLoader;

  embedLoader = new Promise((resolve, reject) => {
    const finish = () =>
      window.instgrm && window.instgrm.Embeds
        ? resolve(window.instgrm)
        : reject(new Error('Instagram embed script loaded without window.instgrm'));

    const existing = document.querySelector(`script[src="${IG_EMBED_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', () => reject(new Error('Instagram embed script failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = IG_EMBED_SRC;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error('Instagram embed script failed to load'));
    document.body.appendChild(script);
  });

  // En cas d'échec on repart d'une page blanche : un changement de page
  // (ou un réseau redevenu disponible) pourra retenter le chargement.
  embedLoader.catch(() => {
    embedLoader = null;
  });

  return embedLoader;
}

// Snippet officiel Instagram. Le markup est injecté d'un bloc afin que React
// ne réconcilie pas des nœuds que le script Instagram remplace par une iframe.
function buildEmbedHtml(reel) {
  const permalink = `${reel.url.replace(/\?.*$/, '').replace(/\/$/, '')}/?utm_source=ig_embed&amp;utm_campaign=loading`;
  return [
    '<blockquote class="instagram-media"',
    ` data-instgrm-permalink="${permalink}"`,
    ' data-instgrm-version="14"',
    ' data-instgrm-captioned',
    ' style="background:#0b0d1e;border:0;margin:0;padding:0;width:100%;">',
    `<a href="${reel.url}" target="_blank" rel="noreferrer">${reel.label} — @letsplay.officiel</a>`,
    '</blockquote>',
  ].join('');
}

function ReelSlide({ reel, labels }) {
  const hostRef = useRef(null);
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'fallback'

  useEffect(() => {
    let cancelled = false;
    const hasIframe = () => !!hostRef.current && !!hostRef.current.querySelector('iframe');
    const markReady = () => {
      if (!cancelled) setState('ready');
    };

    const poll = window.setInterval(() => {
      if (hasIframe()) {
        window.clearInterval(poll);
        markReady();
      }
    }, 400);

    const timeout = window.setTimeout(() => {
      window.clearInterval(poll);
      if (!cancelled && !hasIframe()) setState('fallback');
    }, READY_TIMEOUT);

    loadInstagramEmbeds()
      .then((instgrm) => {
        if (cancelled) return;
        try {
          instgrm.Embeds.process();
        } catch (error) {
          setState('fallback');
        }
      })
      .catch(() => {
        if (!cancelled) setState('fallback');
      });

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <article className="reel-slide hud-frame">
      <header className="reel-slide-head">
        <span className="reel-slide-index">{reel.label}</span>
        <a className="reel-slide-open" href={reel.url} target="_blank" rel="noreferrer">
          {labels.open} <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div className={`reel-embed${state === 'ready' ? ' is-ready' : ''}`} ref={hostRef}>
        <div className="reel-embed-mount" dangerouslySetInnerHTML={{ __html: buildEmbedHtml(reel) }} />
        {state !== 'ready' &&
          (state === 'fallback' ? (
            <a className="reel-overlay is-fallback" href={reel.url} target="_blank" rel="noreferrer">
              <div>
                <strong>{labels.fallbackTitle}</strong>
                <span>{labels.fallbackText}</span>
                <em>{labels.fallbackCta} <span aria-hidden="true">↗</span></em>
              </div>
            </a>
          ) : (
            <div className="reel-overlay is-loading" aria-hidden="true">
              <div>
                <strong>{reel.label}</strong>
                <span>{labels.loading}</span>
              </div>
            </div>
          ))}
      </div>
    </article>
  );
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function ReelsCarousel({ id, index = '03', labels, reels, seeAllHref }) {
  const { dir } = useLanguage();
  const windowRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const syncEdges = useCallback(() => {
    const node = windowRef.current;
    if (!node) return;
    const maxScroll = node.scrollWidth - node.clientWidth;
    const position = Math.abs(node.scrollLeft);
    setEdges({ start: position <= 4, end: position >= maxScroll - 4 });
  }, []);

  useEffect(() => {
    const node = windowRef.current;
    if (!node) return undefined;
    syncEdges();
    node.addEventListener('scroll', syncEdges, { passive: true });
    window.addEventListener('resize', syncEdges);
    return () => {
      node.removeEventListener('scroll', syncEdges);
      window.removeEventListener('resize', syncEdges);
    };
  }, [syncEdges]);

  const scrollBySlide = (direction) => {
    const node = windowRef.current;
    if (!node) return;
    const slide = node.querySelector('.reel-slide');
    const gap = 18;
    const step = slide ? slide.getBoundingClientRect().width + gap : node.clientWidth * 0.8;
    // En RTL (arabe) le défilement horizontal part de la droite : scrollLeft
    // est négatif, il faut donc inverser le sens du déplacement.
    node.scrollBy({ left: direction * step * (dir === 'rtl' ? -1 : 1), behavior: 'smooth' });
  };

  return (
    <section className="reels-section reels-carousel wrap" id={id}>
      <div className="section-label">
        <span>
          <b>{index}</b> / {labels.label1}
        </span>
        <span>{labels.label2}</span>
      </div>

      <div className="reels-head">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {labels.eyebrow}</p>
          <h2>{labels.h2a}<br /><em>{labels.h2b}</em></h2>
        </div>
        <div className="reels-head-side">
          <a className="arrow-link" href={seeAllHref} target="_blank" rel="noreferrer">{labels.seeAll} <Arrow /></a>
          <div className="reel-nav">
            <button
              type="button"
              onClick={() => scrollBySlide(-1)}
              disabled={edges.start}
              aria-label={labels.prev}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              onClick={() => scrollBySlide(1)}
              disabled={edges.end}
              aria-label={labels.next}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      <p className="carousel-hint">{labels.hint}</p>

      <div className="reel-window" ref={windowRef}>
        {reels.map((reel) => (
          <ReelSlide reel={reel} labels={labels} key={reel.id} />
        ))}
      </div>
    </section>
  );
}
