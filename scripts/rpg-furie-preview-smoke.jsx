// La preview d'une créature en Furie, rendue pour de vrai : le Jarl avant
// sa première blessure survivée, puis tel qu'il se tient sur la table une
// fois sa Furie 3 enflammée (3/4 blessé pour 1, devenu 6/6).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { HoverCardPreview, TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

void RpgDuelPage;

const STATS_FURIE = Object.freeze({ atk: 6, def: 6 });

const entiteJarl = (furieDeclenchee) => ({
  id: furieDeclenchee ? 'jarl-en-furie' : 'jarl-intact',
  carteId: 'jarl-au-marteau-de-guerre',
  name: 'Jarl au marteau de guerre',
  atk: furieDeclenchee ? 6 : 3,
  pv: furieDeclenchee ? 6 : 4,
  pvMax: furieDeclenchee ? 7 : 4,
  armes: [],
  ready: true,
  furieDeclenchee,
});

export function rendreApercusFurie() {
  const jarl = cardById('jarl-au-marteau-de-guerre');
  return renderToStaticMarkup(
    <>
      <section data-cas="normal-catalogue">
        <HoverCardPreview carte={jarl} variante="catalogue" />
      </section>
      <section data-cas="furie-catalogue">
        <HoverCardPreview carte={jarl} variante="catalogue" furieDeclenchee statsFurie={STATS_FURIE} />
      </section>
      <section data-cas="normal-rapide">
        <HoverCardPreview carte={jarl} />
      </section>
      <section data-cas="furie-rapide">
        <HoverCardPreview carte={jarl} furieDeclenchee statsFurie={STATS_FURIE} />
      </section>
      <section data-cas="furie-appui-long">
        <HoverCardPreview carte={jarl} variante="appui-long" furieDeclenchee statsFurie={STATS_FURIE} />
      </section>
      <section data-cas="normal-table">
        <TableCard entite={entiteJarl(false)} cote="joueur" tilt={0} />
      </section>
      <section data-cas="furie-table">
        <TableCard entite={entiteJarl(true)} cote="joueur" tilt={0} />
      </section>
    </>,
  );
}
