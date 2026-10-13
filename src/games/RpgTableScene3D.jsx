import { useEffect, useRef, useState } from 'react';
import { tablePlaqueFile } from './rpgTableSceneThemes.js';

/**
 * Le décor 3D de la table du duel (voir `rpgTableScene.js`).
 *
 * Décoratif et jamais interactif : `aria-hidden`, `pointer-events: none`, sous
 * tout le chrome du duel (`z-index: -1` dans l'isolat de `.card-table`). La
 * peinture CSS de la table reste en dessous : tant que la 3D n'est pas prête
 * — et pour toujours sans WebGL2, sans la peinture, ou si le contexte est
 * perdu — c'est elle que le joueur voit, exactement comme avant.
 * Three.js n'est téléchargé qu'à l'ouverture d'un duel avec le décor activé.
 */
export default function RpgTableScene3D({ plateau, enabled = true, paused = false, pointerHost = null }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const pausedRef = useRef(paused);
  const [ready, setReady] = useState(false);
  pausedRef.current = paused;

  useEffect(() => {
    setReady(false);
    if (!enabled || !window.WebGL2RenderingContext || !hostRef.current) return undefined;
    let disposed = false;
    const start = async () => {
      try {
        const { mountTableScene } = await import('./rpgTableScene.js');
        if (disposed) return;
        const scene = mountTableScene({
          host: hostRef.current,
          canvas: canvasRef.current,
          plateauId: plateau.id,
          // La plaque « vide » quand le plateau pose des objets 3D ; sinon la peinture.
          imageUrl: `${import.meta.env.BASE_URL}${tablePlaqueFile(plateau)}`,
          pointerHost: pointerHost ?? hostRef.current.parentElement ?? hostRef.current,
          coarse: window.matchMedia?.('(pointer: coarse)')?.matches ?? false,
          onReady: () => { if (!disposed) setReady(true); },
          onUnavailable: () => { if (!disposed) setReady(false); },
        });
        sceneRef.current = scene;
        scene?.setPaused(pausedRef.current);
      } catch {
        // Import ou contexte indisponible : la table reste la peinture d'origine.
        if (!disposed) setReady(false);
      }
    };
    start();
    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [plateau.id, plateau.fichier, enabled, pointerHost]);

  useEffect(() => { sceneRef.current?.setPaused(paused); }, [paused]);

  if (!enabled) return null;
  return (
    <div
      ref={hostRef}
      className={`rpg-table-3d${ready ? ' is-ready' : ''}`}
      data-table-3d={plateau.id}
      data-renderer={ready ? '3d' : 'fallback'}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="rpg-table-3d__canvas" width="1" height="1" />
    </div>
  );
}
