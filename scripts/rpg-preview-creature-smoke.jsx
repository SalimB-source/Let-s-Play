import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HoverCardPreview, TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

const carte = cardById('fennec-des-decombres');
const entite = {
  id: 'fennec-teste', carteId: carte.id, name: carte.name,
  atk: 7, pv: 0, pvMax: carte.def, defenseurAccorde: true,
  envol: true, bouclier: 2, gelToursRestants: 1, armes: [],
};
export const table = () => renderToStaticMarkup(<TableCard entite={entite} cote="joueur" />);
export const apercu = (visuel, variante = '') => renderToStaticMarkup(
  <HoverCardPreview carte={carte} entite={visuel} variante={variante} />,
);
export const apercuSort = () => renderToStaticMarkup(<HoverCardPreview carte={cardById('rapport-du-greffier')} />);
export const defenseurMain = () => renderToStaticMarkup(<HoverCardPreview carte={cardById('gardien-viking-du-fjord')} />);
