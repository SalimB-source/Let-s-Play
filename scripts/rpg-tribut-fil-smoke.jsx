// Le fil de sable d'un Tribut au contact, rendu réellement : la géométrie est
// figée à la capture (position relative à la table, longueur et angle).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { TributFil } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

// Une créature du joueur en bas de table qui reçoit le Tribut de la plaque
// ennemie située plus haut : le conteneur part du centre de la créature.
const effetJoueur = Object.freeze({
  effectId: 'tribut-fil-1',
  entityId: 'chacal-joueur',
  nom: 'Chacal du seuil',
  cote: 'joueur',
  montant: 1,
  x1: 180,
  y1: 420,
  x2: 240,
  y2: 180,
  longueur: 247.4,
  angle: -75.9,
});

// Le geste symétrique : une créature du sorcier ponctionne la plaque du joueur.
const effetSorcier = Object.freeze({
  effectId: 'tribut-fil-2',
  entityId: 'chacal-sorcier',
  nom: 'Chacal adverse',
  cote: 'sorcier',
  montant: 2,
  x1: 240,
  y1: 180,
  x2: 180,
  y2: 420,
  longueur: 247.4,
  angle: 104.1,
});

export function rendreFilJoueur() {
  return renderToStaticMarkup(<TributFil effet={effetJoueur} />);
}

export function rendreFilSorcier() {
  return renderToStaticMarkup(<TributFil effet={effetSorcier} />);
}
