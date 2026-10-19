// Le tourbillon d'eau d'un renvoi en main, rendu réellement par le composant.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TourbillonEau } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const EFFET = Object.freeze({
  entityId: 'entite-renvoyee',
  effectId: 'eau-7-entite-renvoyee',
  cardId: 'ressac',
  name: 'Créature renvoyée',
  left: 214,
  top: 96,
  width: 132,
  height: 176,
  angle: 0.26,
});

export function rendreTourbillon() {
  return renderToStaticMarkup(<TourbillonEau effet={EFFET} />);
}
