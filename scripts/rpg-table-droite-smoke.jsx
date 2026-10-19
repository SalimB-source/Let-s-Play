// Les créatures posées sur la table, rendues réellement par `TableCard` :
// aucune inclinaison d'éventail ne doit subsister sur la face jouée.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

void RpgDuelPage;

const rendre = (carteId, cote) => renderToStaticMarkup(
  <TableCard
    entite={{
      id: `entite-${cote}-${carteId}`, carteId, name: 'Créature de test', atk: 3, pv: 3, pvMax: 3, armes: [], envol: true,
    }}
    cote={cote}
  />,
);

export function rendreCartesTable() {
  const creature = RPG_DUEL_CARDS.find((carte) => carte.kind === 'creature');
  return {
    joueur: rendre(creature.id, 'joueur'),
    sorcier: rendre(creature.id, 'ennemi'),
  };
}
