import React from 'react';
import { baseUrl as base } from '../data';

// Galerie de captures d'écran / photogrammes intégrée au corps des articles.
// props : label (sujet affiché dans l'en-tête), meta (badge à droite),
// items [{ src, alt, caption }] et credit (ligne de mention sous la grille).
// Avec trois visuels ou plus, la première capture s'étale sur toute la
// largeur ; les suivantes se partagent la ligne en deux colonnes.
export default function ArticleGallery({ label, meta, items = [], credit, creditSources = [] }) {
  if (!items.length) return null;
  return (
    <figure className="article-gallery">
      <div className="section-label">
        <span><b>CAPTURES</b> / {label}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="article-gallery-grid">
        {items.map((item, i) => (
          <figure className="article-gallery-item" key={i}>
            <img src={`${base}${item.src}`} alt={item.alt} loading="lazy" />
            {item.caption ? <figcaption>{item.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      {credit || creditSources.length ? (
        <figcaption className="article-gallery-credit">
          {credit}
          {creditSources.length ? (
            <span className="article-gallery-sources">
              {' '}Sources des visuels : {creditSources.map((source, index) => (
                <React.Fragment key={source.href}>
                  {index ? ', ' : ''}<a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
                </React.Fragment>
              ))}.
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
