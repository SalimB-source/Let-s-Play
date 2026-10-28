// La tempête de sable d'un sort Sable, rendue réellement par le composant.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TempeteSable } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const EFFET = Object.freeze({
  entityId: 'entite-ensablee',
  effectId: 'sable-7-entite-ensablee',
  name: 'Créature ensablée',
  left: 214,
  top: 96,
  width: 132,
  height: 176,
  angle: 0.26,
});

export function rendreTempete() {
  return renderToStaticMarkup(<TempeteSable effet={EFFET} />);
}
