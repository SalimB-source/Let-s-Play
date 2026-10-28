// La piste de mana rendue réellement : dix emplacements, leurs états et leur
// index de cascade (--mana-slot) pour la marée de la recharge de tour.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { FluxManaTrack } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

// Quatre mana acquis (trois Sable, un Eau), le reste des emplacements vide.
// La réserve est pleine : les quatre orbes sont allumés, les six autres vides.
const CAMP = Object.freeze({
  mana: { sable: 3, eau: 1, braise: 0, neige: 0, tenebres: 0 },
  manaMax: { sable: 3, eau: 1, braise: 0, neige: 0, tenebres: 0 },
  manaSources: ['sable', 'sable', 'sable', 'eau'],
});

export function rendrePisteMana() {
  return renderToStaticMarkup(<FluxManaTrack camp={CAMP} cote="joueur" />);
}
