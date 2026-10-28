// La ligne de charge d'une attaque, rendue réellement : géométrie figée à la
// capture (point de départ relatif à la table, longueur, angle), pour les deux
// natures de cible (une créature, ou la plaque du sorcier) et les deux camps.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { LigneCharge } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

// Une créature du joueur, en bas, qui fond sur une créature adverse plus haut.
const versCreature = Object.freeze({
  effectId: 'ligne-charge-1',
  cote: 'joueur',
  cibleType: 'creature',
  x1: 160,
  y1: 430,
  longueur: 210,
  angle: -82,
});

// La même créature, mais qui file droit sur la plaque du sorcier.
const versPlaque = Object.freeze({
  effectId: 'ligne-charge-2',
  cote: 'joueur',
  cibleType: 'sorcier',
  x1: 160,
  y1: 430,
  longueur: 305,
  angle: -96,
});

// Une créature du sorcier qui descend vers la plaque du joueur.
const attaqueEnnemie = Object.freeze({
  effectId: 'ligne-charge-3',
  cote: 'sorcier',
  cibleType: 'sorcier',
  x1: 240,
  y1: 170,
  longueur: 300,
  angle: 92,
});

export function rendreLigneVersCreature() {
  return renderToStaticMarkup(<LigneCharge effet={versCreature} />);
}

export function rendreLigneVersPlaque() {
  return renderToStaticMarkup(<LigneCharge effet={versPlaque} />);
}

export function rendreLigneEnnemie() {
  return renderToStaticMarkup(<LigneCharge effet={attaqueEnnemie} />);
}
