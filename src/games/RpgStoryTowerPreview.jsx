import { useEffect, useRef, useState } from 'react';

/**
 * Une vue 3D décorative, jamais un bouton dans le bouton de la galerie.
 * La peinture d'origine reste le repli pour les appareils sans WebGL2.
 * Three.js et les modèles ne sont téléchargés qu'en mode Histoire, à vue.
 */
export default function RpgStoryTowerPreview({ tour, className = '', detail = false }) {
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
  }, [tour.id, detail]);

  return (
    <span
      ref={hostRef}
      className={`rpg-story-stage ${className}${ready ? ' is-ready' : ''}`}
      data-tower-model={tour.id}
      data-renderer={ready ? '3d' : 'fallback'}
      aria-hidden="true"
    >
      <span className="rpg-story-stage__fallback" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}sablier-tours/${tour.miniature}")` }} />
      <canvas ref={canvasRef} className="rpg-story-stage__canvas" width="1" height="1" />
      <span className="rpg-story-stage__badge"><span /> VUE 3D</span>
    </span>
  );
}
