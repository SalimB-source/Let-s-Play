// La prisonnière de la cale (Abordage), rendue réellement par `TableCard`.
// Le capteur porte la mini-face de sa prise — coin haut-droit, chaînes, nom —
// dans les deux camps ; une créature sans cale n'a rien.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

void RpgDuelPage;

const rendre = (carteId, entite = {}, cote = 'joueur') => renderToStaticMarkup(
  <TableCard
    entite={{
      id: 'entite-de-test', carteId, name: 'Créature de test', atk: 3, pv: 3, pvMax: 3, armes: [], ...entite,
    }}
    cote={cote}
    tilt={0}
  />,
);

export function rendreCales() {
  const fennec = cardById('fennec-des-decombres');
  const enCale = { carteId: fennec.id, name: fennec.name, cost: fennec.cost };
  return {
    // Le Cotre de course, capteur type du set : il détient le Fennec.
    capitaine: { html: rendre('le-cotre-de-course', { enCale }) },
    capitaineEnnemi: { html: rendre('le-cotre-de-course', { enCale }, 'ennemi') },
    // Le même Cotre, cale vide : rien ne dépasse du cadre.
    libre: { html: rendre('le-cotre-de-course') },
  };
}
