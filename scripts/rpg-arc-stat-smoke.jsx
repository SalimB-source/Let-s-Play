import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TableCard, HoverCardPreview } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

const table = (carteId, coupRapide) => renderToStaticMarkup(<TableCard cote="joueur" entite={{
  id: 'test', carteId, name: 'Test', atk: 2, pv: 2, pvMax: 2, armes: [], coupRapide,
}} />);
const apercu = (carteId, armes = []) => renderToStaticMarkup(<HoverCardPreview carte={cardById(carteId)} armes={armes} variante="catalogue" />);
export function rendusArcStat() {
  return {
    tableArc: table('tislit-des-aures', true),
    tableArcAccorde: table('chien-du-guet', true),
    tableEpee: table('tislit-des-aures', false),
    apercuArc: apercu('tislit-des-aures'),
    apercuEpee: apercu('chien-du-guet'),
    apercuArme: apercu('chien-du-guet', [cardById('lance-de-la-lune-givree')]),
  };
}
