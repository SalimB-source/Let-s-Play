// Le fantôme d'une carte prise en cale et la chaîne qui la ramène au capteur.
// Rendu réel de `FantomeCarteDetruite` (sans table : les effets de mise en
// page n'existent pas sur le serveur) et de `ChaineAbordage` avec un vecteur
// connu, pour que le contrôle lise des positions exactes.
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import {
  ChaineAbordage,
  elementCapteurPourAnimation,
  FantomeCarteDetruite,
  vecteurVersCapteur,
} from '../src/games/RpgDuelPage.jsx';

export { elementCapteurPourAnimation, vecteurVersCapteur };

const PRISE = {
  entityId: 'entite-prise',
  cardId: 'fennec-des-decombres',
  name: 'Fennec des décombres',
  left: 200,
  top: 300,
  width: 120,
  height: 150,
  angle: 0,
};

export function rendreFantome({ abordage = null, capteurId = 'entite-capteur' } = {}) {
  return renderToStaticMarkup(
    <FantomeCarteDetruite
      effet={{ ...PRISE, capteurId, abordage }}
      tableRef={{ current: null }}
      onTermine={() => {}}
    />,
  );
}

export function rendreChaine(vecteur) {
  return renderToStaticMarkup(<ChaineAbordage effet={{ ...PRISE, abordage: vecteur }} />);
}

// Une carte détruite sans prise : aucun balayage d'Abordage, aucun vecteur.
export function rendreMorte() {
  return renderToStaticMarkup(
    <FantomeCarteDetruite effet={{ ...PRISE, capteurId: null, abordage: null }} tableRef={{ current: null }} />,
  );
}

/**
 * Le cas du vrai geste : l'action du sorcier résout la prise AVANT que son
 * capteur n'ait un élément. On monte donc le fantôme devant une table vide,
 * puis on pose la carte du capteur — la mesure doit la trouver à l'image
 * suivante et non rester sur le milieu de la rangée.
 */
export async function monterFantomeDevantTableVide() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const table = document.createElement('div');
  table.className = 'card-table';
  container.append(table);
  document.body.append(container);
  const root = createRoot(container);
  const effet = { ...PRISE, capteurId: 'entite-capteur', abordage: null };
  await act(async () => {
    root.render(<FantomeCarteDetruite effet={effet} tableRef={{ current: table }} />);
  });
  return { container, table, root };
}
