// La roue de feu d'une créature brûlée par la Braise, rendue réellement.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { RoueDeFeu } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const EFFET = Object.freeze({
  entityId: 'entite-brulee',
  effectId: 'feu-7-entite-brulee',
  cardId: 'fennec-des-decombres',
  name: 'Créature brûlée',
  left: 214,
  top: 96,
  width: 132,
  height: 176,
  angle: 0.26,
  avecCarte: true,
});

export function rendreRoue({ avecCarte = true } = {}) {
  return renderToStaticMarkup(<RoueDeFeu effet={{ ...EFFET, avecCarte }} />);
}
