// Le fantôme d'une carte détruite, rendu réellement : la destruction générique
// se délite en grains de sable, la combustion Braise et la prise en cale non.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { FantomeCarteDetruite } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const effetBase = Object.freeze({
  effectId: 'destruction-1',
  entityId: 'fennec-1',
  cardId: 'fennec-des-decombres',
  name: 'Fennec des décombres',
  left: 210,
  top: 320,
  width: 132,
  height: 165,
  angle: 0,
});

// Une mort ordinaire (Eau, Sable, combat…) : les grains se déliten.
const effetGenerique = { ...effetBase };

// Une mort par la Braise : la combustion garde son propre théâtre de flammes.
const effetBrule = { ...effetBase, effectId: 'destruction-2', bruleeParBraise: true };

// Une prise en cale d'Abordage : la carte part chez son capteur, pas au sable.
const effetPrise = { ...effetBase, effectId: 'destruction-3', capteurId: 'capteur-1' };

const tableVide = { current: null };

export function rendreDestructionGenerique() {
  return renderToStaticMarkup(
    <FantomeCarteDetruite effet={effetGenerique} tableRef={tableVide} />,
  );
}

export function rendreDestructionBrulee() {
  return renderToStaticMarkup(
    <FantomeCarteDetruite effet={effetBrule} tableRef={tableVide} />,
  );
}

export function rendrePriseEnCale() {
  return renderToStaticMarkup(
    <FantomeCarteDetruite effet={effetPrise} tableRef={tableVide} />,
  );
}
