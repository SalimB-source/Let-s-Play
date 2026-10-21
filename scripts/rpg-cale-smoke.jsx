// La carte prisonnière de la cale (Abordage), rendue réellement par
// `TableCard` et par la fiche `HoverCardPreview`.
// Sur la table, la prisonnière se glisse DERRIÈRE son capteur ; dans la
// fiche du capteur, elle apparaît en petite carte dans la description. Une
// créature sans cale n'a ni petite carte captive ni face supplémentaire.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TableCard, HoverCardPreview } from '../src/games/RpgDuelPage.jsx';
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
  const cotre = cardById('cotre-de-course');
  const enCale = { carteId: fennec.id, name: fennec.name, cost: fennec.cost };
  // L'entité porte le nom de sa carte, comme au moteur.
  const capitaineCotre = { name: cotre.name, enCale };
  return {
    // Le Cotre de course, capteur type du set : il détient le Fennec.
    capitaine: { html: rendre('cotre-de-course', capitaineCotre) },
    capitaineEnnemi: { html: rendre('cotre-de-course', capitaineCotre, 'ennemi') },
    // Le même Cotre, cale vide : le DOM reste celui d'avant, une carte = un bouton.
    libre: { html: rendre('cotre-de-course') },
    // La fiche du capteur (clic droit sur la table) : une petite carte captive
    // dans les détails, et une seule face principale.
    fiche: {
      html: renderToStaticMarkup(
        <HoverCardPreview
          carte={cotre}
          variante="catalogue"
          prisonniere={fennec}
        />,
      ),
    },
    // La même fiche sans prisonnière : une seule face, aucun encart de cale.
    ficheLibre: {
      html: renderToStaticMarkup(
        <HoverCardPreview carte={cotre} variante="catalogue" />,
      ),
    },
  };
}
