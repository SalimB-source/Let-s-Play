// Les gains conditionnels du Maître du marteau, rendus dans leurs deux états.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { HoverCardPreview, TableCard } from '../src/games/RpgDuelPage.jsx';
import { IconesCarte, PastillesCarte } from '../src/games/effetIcons.jsx';
import { cardById } from '../src/games/rpgCards.js';

void RpgDuelPage;

const entiteMaitre = (furieDeclenchee, overkill = furieDeclenchee) => ({
  id: furieDeclenchee ? 'maitre-en-furie' : 'maitre-intact',
  carteId: 'maitre-du-marteau',
  name: 'Le Maître du marteau',
  atk: furieDeclenchee ? 6 : 3,
  pv: furieDeclenchee ? 2 : 4,
  pvMax: 4,
  armes: [],
  ready: true,
  furieDeclenchee,
  furieBonusAtk: furieDeclenchee ? 3 : 0,
  envol: furieDeclenchee,
  overkill,
});

export function rendreIconesFurie() {
  const maitre = cardById('maitre-du-marteau');
  return renderToStaticMarkup(
    <>
      <section data-cas="main">
        <IconesCarte carte={maitre} />
      </section>
      <section data-cas="catalogue">
        <PastillesCarte carte={maitre} />
      </section>
      <section data-cas="normal-preview">
        <HoverCardPreview carte={maitre} variante="catalogue" />
      </section>
      <section data-cas="furie-preview">
        <HoverCardPreview carte={maitre} variante="catalogue" furieDeclenchee statsFurie={{ atk: 6, def: 2 }} />
      </section>
      <section data-cas="normal-table">
        <TableCard entite={entiteMaitre(false)} cote="joueur" tilt={0} />
      </section>
      <section data-cas="furie-table">
        <TableCard entite={entiteMaitre(true)} cote="joueur" tilt={0} />
      </section>
      <section data-cas="partiel-table">
        <TableCard entite={entiteMaitre(true, false)} cote="joueur" tilt={0} />
      </section>
    </>,
  );
}
