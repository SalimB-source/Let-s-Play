// La carte à résonance rendue dans jsdom. La source imprime l'aura ; une
// créature qui ne l'imprime pas — même si le moteur lui compte le bonus reçu —
// n'affiche aucun calque. Rendu réel de `TableCard`, puis lectures du source et
// de la feuille de style.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

void RpgDuelPage;

const carteRendue = (carteId, entite = {}) => {
  const html = renderToStaticMarkup(
    <TableCard
      entite={{
        id: 'entite-de-test', carteId, name: 'Créature de test', atk: 3, pv: 3, pvMax: 3, armes: [], ...entite,
      }}
      cote="joueur"
      tilt={0}
    />,
  );
  // Le rendu statique n'a pas de `document` : on relit le balisage par un DOM.
  return html;
};

export function rendreCartes() {
  const source = RPG_DUEL_CARDS.find((carte) => carte.id === 'valkyrie-au-corbeau');
  const neutre = RPG_DUEL_CARDS.find((carte) => carte.id === 'fennec-des-decombres');
  return {
    source: { carte: source, html: carteRendue('valkyrie-au-corbeau') },
    // Le bonus reçu est recalculé par le moteur sur TOUTES les créatures de la
    // famille : `entite.resonance` vaut 1 ici, et pourtant l'aura reste éteinte.
    neutre: {
      carte: neutre,
      html: carteRendue('fennec-des-decombres', { resonance: 1, resonanceParGroupe: { neige: 1 } }),
    },
  };
}
