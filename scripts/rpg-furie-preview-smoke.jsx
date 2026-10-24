// La preview d'une créature en Furie, rendue pour de vrai : le Jarl intact,
// puis blessé sous sa DEF de base 5 avec sa Furie 3 active (2/5 devenu
// 5/4 : +3/+0, sans aucun point de défense gagné). Le Loup ferme la marche
// dans ses deux états, peinture intacte puis meute ensanglantée. Le Maître
// vérifie enfin la coloration de ses gains conditionnels dans chaque surface.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { HoverCardPreview, TableCard } from '../src/games/RpgDuelPage.jsx';
import { IconesCarte } from '../src/games/effetIcons.jsx';
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

export function rendreApercusFurie() {
  const jarl = cardById('jarl-au-marteau-de-guerre');
  const maitre = cardById('maitre-du-marteau');
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
      <section data-cas="maitre-main">
        <IconesCarte carte={maitre} />
      </section>
      <section data-cas="maitre-normal-catalogue">
        <HoverCardPreview carte={maitre} variante="catalogue" />
      </section>
      <section data-cas="maitre-furie-catalogue">
        <HoverCardPreview carte={maitre} variante="catalogue" furieDeclenchee statsFurie={{ atk: 6, def: 2 }} />
      </section>
      <section data-cas="maitre-normal-table">
        <TableCard entite={entiteMaitre(false)} cote="joueur" tilt={0} />
      </section>
      <section data-cas="maitre-furie-table">
        <TableCard entite={entiteMaitre(true)} cote="joueur" tilt={0} />
      </section>
      <section data-cas="maitre-partiel-table">
        <TableCard entite={entiteMaitre(true, false)} cote="joueur" tilt={0} />
      </section>
    </>,
  );
}
