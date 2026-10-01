import React, { useEffect, useRef, useState } from 'react';
import { accessoriesForPalette, disposeExplorer, makeExplorer, paintModel } from './mirageExplorer';
import { ensureLoop, getShared, nextPreviewPhase, stopLoop } from './mirageSkinRenderer';

/*
 * Aperçu 3D d'un skin Mirage : monture + cavalier voxel du jeu, qui tourne
 * en continu sur lui-même (en galopant sur place). Rendu via le renderer
 * partagé de mirageSkinRenderer.js.
 */

/**
 * @param {number[]} palette  palette du skin ([coat, mane, cloth, trim, head, hat, markings])
 * @param {string}   label    texte alternatif (sinon décoratif)
 */
export default function MirageSkinPreview({ palette, className = '', label = '' }) {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const s = canvas && getShared();
    if (!s) { setFailed(true); return undefined; }
    const model = makeExplorer(false, palette);
    const preview = { canvas, model, visible: true, phase: nextPreviewPhase(), ctx: null, w: 1, h: 1 };
    previewRef.current = preview;
    s.previews.add(preview);
    let observer = null;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(([entry]) => {
        preview.visible = entry.isIntersecting;
        ensureLoop();
      });
      observer.observe(canvas);
    }
    ensureLoop();
    return () => {
      observer?.disconnect();
      s.previews.delete(preview);
      disposeExplorer(model);
      previewRef.current = null;
      if (!s.previews.size) stopLoop();
    };
    // Le modèle n'est construit qu'une fois ; la palette est repeinte ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (previewRef.current && palette) paintModel(previewRef.current.model, palette);
  }, [palette]);

  if (failed) return <span className={`${className} mirage-skin-3d is-fallback`} aria-hidden="true">{accessoriesForPalette(palette) === 'cloud-chocobo' ? '🐤' : '♞'}</span>;
  return (
    <canvas
      ref={canvasRef}
      className={`${className} mirage-skin-3d`}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
    />
  );
}
