// La tempête de sable d'un sort Sable, rendue réellement par le composant :
// la lame d'une carte frappée, et la vague qui couvre tout un côté du plateau.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TempeteSable, TempeteSableZone } from '../src/games/RpgDuelPage.jsx';

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

const EFFET_ZONE = Object.freeze({
  camp: 'sorcier',
  carteId: 'tempete-de-sable',
  token: 4,
  effectId: 'sable-zone-4-sorcier',
});

export function rendreTempete() {
  return renderToStaticMarkup(<TempeteSable effet={EFFET} />);
}

export function rendreTempeteZone() {
  return renderToStaticMarkup(<TempeteSableZone effet={EFFET_ZONE} />);
}
