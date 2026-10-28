import { useEffect, useRef, useState } from 'react';

/**
 * Une vue 3D décorative, jamais un bouton dans le bouton de la galerie.
 * La peinture d'origine reste le repli pour les appareils sans WebGL2.
 * Three.js et les modèles ne sont téléchargés qu'en mode Histoire, à vue.
 *
 * `detruite` montre la tour une fois son dernier étage déblayé : la maquette
 * est brisée à mi-hauteur et sa brèche fume (voir `rpgStoryTowerScene.js`).
 * Sans WebGL2, la même ruine se lit sur la peinture : elle est assombrie,
 * quelques petites flammes dansent sur les gravats et une fumée grise, discrète,
 * s'en échappe (règles `.is-detruite` dans `rpg-story.css`).
 */
export default function RpgStoryTowerPreview({ tour, className = '', detail = false, detruite = false }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false, started = false, scene = null, observer = null;
    setReady(false);
    const start = async () => {
      if (started || disposed || !window.WebGL2RenderingContext) return;
      started = true;
      observer?.disconnect();
      try {
        const { mountStoryTowerScene } = await import('./rpgStoryTowerScene.js');
        if (disposed) return;
        scene = mountStoryTowerScene({
          host: hostRef.current,
          canvas: canvasRef.current,
          tourId: tour.id,
          detail,
          detruite,
          onReady: () => { if (!disposed) setReady(true); },
          onUnavailable: () => { if (!disposed) setReady(false); },
        });
      } catch {
        // Import/contexte indisponible : la galerie et les étages restent jouables.
        if (!disposed) setReady(false);
      }
    };
    if (typeof window.IntersectionObserver === 'function' && window.WebGL2RenderingContext) {
      observer = new window.IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      }, { rootMargin: '80px' });
      observer.observe(hostRef.current);
    } else start();
    return () => {
      disposed = true;
      observer?.disconnect();
      scene?.dispose();
    };
  }, [tour.id, detail, detruite]);

  return (
    <span
      ref={hostRef}
      className={`rpg-story-stage ${className}${ready ? ' is-ready' : ''}${detruite ? ' is-detruite' : ''}`}
      data-tower-model={tour.id}
      data-tower-detruite={detruite ? 'oui' : 'non'}
      data-renderer={ready ? '3d' : 'fallback'}
      aria-hidden="true"
    >
      <span className="rpg-story-stage__fallback" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}sablier-tours/${tour.miniature}")` }} />
      <canvas ref={canvasRef} className="rpg-story-stage__canvas" width="1" height="1" />
      {detruite && (
        <>
          {/* Le repli sans WebGL2 : quelques flammes courtes et une fumée grise. */}
          <span className="rpg-story-stage__flammes">
            <i /><i /><i />
          </span>
          <span className="rpg-story-stage__fumee">
            <i /><i /><i />
          </span>
        </>
      )}
      <span className="rpg-story-stage__badge"><span /> VUE 3D</span>
      {detruite && (
        <span className="rpg-story-stage__badge rpg-story-stage__badge--ruine"><span /> TOUR DÉTRUITE</span>
      )}
    </span>
  );
}
