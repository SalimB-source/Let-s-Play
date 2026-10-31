import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HoverCardPreview, TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

export function rendu() {
  const carte = cardById('garde-du-trone-givre');
  return {
    apercu: renderToStaticMarkup(<HoverCardPreview carte={carte} />),
    table: renderToStaticMarkup(<TableCard cote="joueur" tilt={0} entite={{ id: 'test', carteId: carte.id, name: carte.name, atk: 2, pv: 4, pvMax: 4, armes: [] }} />),
  };
}
