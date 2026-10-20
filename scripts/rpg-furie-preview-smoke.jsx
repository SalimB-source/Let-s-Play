// La preview d'une créature en Furie, rendue pour de vrai : le Jarl intact,
// puis blessé sous sa DEF de base 5 avec sa Furie 3 active (2/5 devenu
// 5/4 : +3/+0, sans aucun point de défense gagné). Le Loup ferme la marche
// dans ses deux états, peinture intacte puis meute ensanglantée.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { HoverCardPreview, TableCard } from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';

void RpgDuelPage;

const STATS_FURIE = Object.freeze({ atk: 5, def: 4 });

const entiteJarl = (furieDeclenchee) => ({
  id: furieDeclenchee ? 'jarl-en-furie' : 'jarl-intact',
  carteId: 'jarl-au-marteau-de-guerre',
  name: 'Jarl au marteau de guerre',
  atk: furieDeclenchee ? 5 : 2,
  pv: furieDeclenchee ? 4 : 5,
  pvMax: 5,
  armes: [],
  ready: true,
  furieDeclenchee,
  furieBonusAtk: furieDeclenchee ? 3 : 0,
});

const entiteLoup = (furieDeclenchee) => ({
  id: furieDeclenchee ? 'loup-en-furie' : 'loup-intact',
  carteId: 'loup-des-neiges',
  name: 'Loup des neiges',
  atk: furieDeclenchee ? 3 : 2,
  pv: furieDeclenchee ? 1 : 2,
  pvMax: 2,
  armes: [],
  ready: true,
  furieDeclenchee,
  furieBonusAtk: furieDeclenchee ? 1 : 0,
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
      <section data-cas="loup-normal-table">
        <TableCard entite={entiteLoup(false)} cote="joueur" tilt={0} />
      </section>
      <section data-cas="loup-furie-table">
        <TableCard entite={entiteLoup(true)} cote="joueur" tilt={0} />
      </section>
    </>,
  );
}
