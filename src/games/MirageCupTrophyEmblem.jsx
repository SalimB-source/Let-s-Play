import React from 'react';
import MirageTrophyIcon from './MirageTrophyIcon';
import { getTrophyDesign } from './mirageTrophy';

/** La collection et le repli du podium partagent le modèle de la coupe. */
export default function MirageCupTrophyEmblem({ design = 'desert', className = '' }) {
  const trophy = getTrophyDesign(design);
  return <MirageTrophyIcon cupId={trophy.id} className={`mirage-cup-trophy-emblem is-${trophy.id} ${className}`} />;
}
