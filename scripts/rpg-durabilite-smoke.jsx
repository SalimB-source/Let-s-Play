import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TableCard } from '../src/games/RpgDuelPage.jsx';

export function rendre(carteId, options = {}) {
  return renderToStaticMarkup(<TableCard cote="joueur" tilt={0} entite={{
    id: 'test', carteId, name: 'Test', atk: 2, pv: 3, pvMax: 3, armes: [],
    arme: { carteId: 'sabre-du-croissant-noir', durabilite: 1, ...options.arme },
    ...(options.enCale ? { enCale: { name: 'Captif', carteId: 'chien-du-guet' } } : {}),
    ...(options.heures ? { heures: { restants: 2 } } : {}),
  }} />);
}
