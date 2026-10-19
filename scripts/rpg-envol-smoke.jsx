// La carte d'une créature avec Envol, rendue réellement par `TableCard`.
// Le vol pose son calque de souffle ; une créature sans Envol n'en a aucun.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

void RpgDuelPage;

const rendre = (carteId, entite = {}) => renderToStaticMarkup(
  <TableCard
    entite={{
      id: 'entite-de-test', carteId, name: 'Créature de test', atk: 3, pv: 3, pvMax: 3, armes: [], ...entite,
    }}
    cote="joueur"
    tilt={0}
  />,
);

export function rendreCartesEnvol() {
  const envol = RPG_DUEL_CARDS.find((carte) => carte.envol && carte.kind === 'creature');
  const neutre = RPG_DUEL_CARDS.find((carte) => !carte.envol && carte.kind === 'creature');
  return {
    // L'Envol imprimé sur la carte est porté par l'entité, jamais lu sur la
    // carte : deux créatures, identifiants différents — leurs phases diffèrent.
    envol: { carte: envol, html: rendre(envol.id, { envol: true }) },
    envolVoisine: { carte: envol, html: rendre(envol.id, { envol: true, id: 'entite-voisine' }) },
    // L'Envol peut aussi venir d'une arme : l'état vit sur l'entité, pas sur la carte.
    parArme: { carte: neutre, html: rendre(neutre.id, { envol: true }) },
    neutre: { carte: neutre, html: rendre(neutre.id) },
  };
}
