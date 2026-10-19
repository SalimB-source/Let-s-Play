// La boule de feu de l'Honneur, rendue réellement : de la carte morte vers la
// carte frappée, quelle que soit la direction du trajet.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { JetHonneur, RPG_JET_HONNEUR_DUREE, trajetJetHonneur } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const CARTE = { width: 150, height: 188 };

export function rendreJets() {
  const jet = (de, vers, montant = 2) => renderToStaticMarkup(
    <JetHonneur jet={{ entityId: 'mort-1', cibleId: 'vivant-9', cote: 'joueur', montant, de: { ...de, ...CARTE }, vers: { ...vers, ...CARTE } }} />,
  );
  return {
    duree: RPG_JET_HONNEUR_DUREE,
    // Le calcul pur, dans les quatre directions de la table.
    trajets: {
      basGauche: trajetJetHonneur({ left: 400, top: 60, ...CARTE }, { left: 180, top: 420, ...CARTE }),
      hautDroite: trajetJetHonneur({ left: 200, top: 430, ...CARTE }, { left: 520, top: 90, ...CARTE }),
      memeColonne: trajetJetHonneur({ left: 300, top: 60, ...CARTE }, { left: 300, top: 420, ...CARTE }),
      memeLigne: trajetJetHonneur({ left: 100, top: 200, ...CARTE }, { left: 500, top: 200, ...CARTE }),
    },
    // La créature meurt en haut, la cible est en bas à gauche.
    versLeBas: jet({ left: 400, top: 60 }, { left: 180, top: 420 }),
    // Et l'inverse : la cible est au-dessus, à droite.
    versLeHaut: jet({ left: 200, top: 430 }, { left: 520, top: 90 }),
  };
}
