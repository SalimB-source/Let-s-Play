// La foudre de l'Éclair du marteau sur une créature touchée, rendue réellement.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { EclairDuMarteau } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const EFFET = Object.freeze({
  entityId: 'entite-foudroyee',
  effectId: 'foudre-9-entite-foudroyee',
  name: 'Créature foudroyée',
  left: 214,
  top: 96,
  width: 132,
  height: 176,
  angle: 0.26,
});

export function rendreEclair() {
  return renderToStaticMarkup(<EclairDuMarteau effet={EFFET} />);
}
