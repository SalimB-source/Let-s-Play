import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { baseUrl as base } from '../data';
import { pauseAllPlayback } from '../lib/videoPlayback';

// Les visuels officiels publiés par les éditeurs (page de lancement SpaceX,
// blog Microsoft, newsroom Meta, figures de brevets…) sont des URL absolues et
// passent telles quelles ; les captures déposées dans public/screenshots/
// prennent le préfixe du baseUrl — même règle que les images de couverture
// des pages actus.
const imageUrl = (src) => (/^https?:\/\//i.test(src) ? src : `${base}${src}`);

const pad = (value) => String(value).padStart(2, '0');

// Galerie de captures d'écran / photogrammes intégrée au corps des articles.
// props : label (sujet affiché dans l'en-tête), meta (badge à droite),
// items [{ src, alt, caption, full? }] et credit (ligne de mention sous la
// grille). Avec trois visuels ou plus, la première capture s'étale sur toute
// la largeur ; les suivantes se partagent la ligne en deux colonnes.
//
// Chaque capture est cliquable : elle ouvre la visionneuse (lightbox), qui
// affiche le visuel en grand, sans recadrage, avec sa légende et un compteur.
// `item.full` permet de servir une version plus grande dans la visionneuse que
// dans la grille ; à défaut, c'est `item.src` qui est repris. La visionneuse
// se comporte comme le lecteur modal des tests (src/components/VideoModal.jsx) :
// fermeture au clic sur le fond, au bouton ou avec Échap, défilement de la page
// verrouillé, et les lecteurs vidéo de la page mis en pause à l'ouverture
// (règle « une seule vidéo à la fois »). S'y ajoutent la navigation au clavier
// (flèches, Début / Fin) et le balayage au doigt sur téléphone.
export default function ArticleGallery({ label, meta, items = [], credit, creditSources = [] }) {
  const total = items.length;
  const [openIndex, setOpenIndex] = useState(null);
  const isOpen = openIndex !== null;
  // Bouton-vignette à l'origine de l'ouverture : le focus lui revient à la
  // fermeture, pour ne pas renvoyer le lecteur au clavier en haut de page.
  const returnFocusRef = useRef(null);
  const closeRef = useRef(null);
  const touchStartRef = useRef(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback((delta) => {
    setOpenIndex((current) => (current === null ? current : (current + delta + total) % total));
  }, [total]);

  const openAt = (index) => (event) => {
    returnFocusRef.current = event.currentTarget;
    setOpenIndex(index);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    // La visionneuse recouvre la page : on coupe les lecteurs qui tournent
    // derrière elle, comme le fait le lecteur modal des tests.
    pauseAllPlayback();
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
      else if (event.key === 'Home') { event.preventDefault(); setOpenIndex(0); }
      else if (event.key === 'End') { event.preventDefault(); setOpenIndex(total - 1); }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen, close, step, total]);

  // Balayage horizontal sur téléphone : au-delà de 48 px, on change de visuel.
  const onTouchStart = (event) => {
    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || total < 2) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  };

  if (!total) return null;

  const current = isOpen ? items[openIndex] : null;

  return (
    <figure className="article-gallery">
      <div className="section-label">
        <span><b>CAPTURES</b> / {label}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="article-gallery-grid">
        {items.map((item, i) => (
          <figure className="article-gallery-item" key={i}>
            <button
              type="button"
              className="article-gallery-open"
              onClick={openAt(i)}
              aria-haspopup="dialog"
              aria-label={`Agrandir le visuel ${i + 1} sur ${total} : ${item.alt}`}
            >
              <img src={imageUrl(item.src)} alt={item.alt} loading="lazy" />
              <span className="article-gallery-zoom" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="15" height="15">
                  <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.4 15.4 21 21M10.5 7.8v5.4M7.8 10.5h5.4" />
                </svg>
              </span>
            </button>
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

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="article-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${label} — visuel ${openIndex + 1} sur ${total}`}
          onClick={close}
        >
          <div
            className="article-lightbox-box"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="article-lightbox-head">
              <div>
                <span className="article-lightbox-kicker">CAPTURES / {label}</span>
                {meta ? <strong>{meta}</strong> : null}
              </div>
              <button type="button" ref={closeRef} className="article-lightbox-close" onClick={close} aria-label="Fermer la visionneuse">✕</button>
            </div>
            <div className="article-lightbox-stage">
              <img src={imageUrl(current.full || current.src)} alt={current.alt} />
              {total > 1 ? (
                <>
                  <button type="button" className="article-lightbox-nav article-lightbox-prev" onClick={() => step(-1)} aria-label="Visuel précédent">‹</button>
                  <button type="button" className="article-lightbox-nav article-lightbox-next" onClick={() => step(1)} aria-label="Visuel suivant">›</button>
                </>
              ) : null}
            </div>
            <div className="article-lightbox-foot">
              <span className="article-lightbox-caption">{current.caption || current.alt}</span>
              <span className="article-lightbox-count">{pad(openIndex + 1)} / {pad(total)}</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </figure>
  );
}
