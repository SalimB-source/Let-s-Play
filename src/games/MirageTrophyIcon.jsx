import React, { useMemo } from 'react';
import { getTrophyDesign, TROPHY_MATERIAL_COLORS, trophyIconRects } from './mirageTrophy';

/**
 * Le trophée de la coupe choisie, projeté en pixels depuis son modèle 3D.
 * SVG plutôt qu'emoji : même silhouette et mêmes couleurs sur tous les
 * appareils, jusque dans le repli sans WebGL. Le texte voisin porte le sens.
 */
export default function MirageTrophyIcon({ cupId, className = '' }) {
  const design = getTrophyDesign(cupId);
  const rects = useMemo(() => trophyIconRects(design.id), [design.id]);
  return (
    <svg className={className} data-trophy={design.id} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {rects.map((rect) => (
        <rect
          key={rect.part}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={`#${TROPHY_MATERIAL_COLORS[rect.material].toString(16).padStart(6, '0')}`}
        />
      ))}
    </svg>
  );
}
