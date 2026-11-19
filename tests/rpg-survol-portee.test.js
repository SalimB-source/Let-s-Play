/** Le survol d'une créature allume d'un anneau doré les proies qu'elle
 * atteindrait — une lecture, pas une promesse : la règle ne bouge pas. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const page = lire('RpgDuelPage.jsx');
const battle = lire('rpg-battle.css');

/** Les quelques lignes qui suivent un marqueur, pour lire un bloc JSX. */
const blocApres = (source, marqueur, taille = 24) => {
  const lignes = source.split('\n');
  const i = lignes.findIndex((l) => l.includes(marqueur));
  assert.ok(i >= 0, `${marqueur} existe`);
  return lignes.slice(i, i + taille).join('\n');
};

const entite = (surcharge = {}) => ({
  id: 'e-ashigaru',
  carteId: 'ashigaru-des-braises',
  name: 'Ashigaru des braises',
  pv: 2,
  pvMax: 2,
  ...surcharge,
});

test('TableCard : `porteeVisible` pose l’anneau doré `is-a-portee`', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await server.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const sans = renderToStaticMarkup(React.createElement(TableCard, { entite: entite(), cote: 'sorcier' }));
    assert.doesNotMatch(sans, /is-a-portee/, 'sans survol, aucune créature ne s’allume');
    const avec = renderToStaticMarkup(React.createElement(TableCard, { entite: entite(), cote: 'sorcier', porteeVisible: true }));
    assert.match(avec, /is-a-portee/, 'la proie à portée porte l’anneau');
    assert.match(sans, /rpg-card/, 'la carte reste une carte de table ordinaire');
  } finally {
    await server.close();
  }
});

test('Survol : la page lit la règle du clic, elle ne la réécrit pas', () => {
  const bloc = blocApres(page, 'const porteeSurvol = (() => {');
  assert.match(bloc, /const entiteId = apercuSurvol\?\.entiteId;/,
    'c’est la créature survolée (`apercuSurvol`) qui parle');
  assert.match(bloc, /rpgCiblesIndividuellesClassique\(duel, 'joueur', entiteId\)/,
    'les proies sont celles de `rpgCiblesIndividuellesClassique`, la règle du clic');
  assert.match(bloc, /lignesActives\(duel\)/, 'la lecture n’a de sens que sur deux lignes');
  assert.match(bloc, /modePvp/, 'en PvP, la table adverse ne s’annonce pas');
  assert.match(bloc, /duel\.joueur\?\.creatures\?\.find/,
    'seules nos créatures s’annoncent — ce que l’adversaire peut frapper ne nous regarde pas');
  // Une créature n'est jamais *rendue* ciblable par le survol : la classe
  // n'entre ni dans `canTarget` ni dans la déclaration d'attaque.
  assert.doesNotMatch(bloc, /canTarget|is-ciblable|rpgDeclarerAttaque/,
    'le survol ne déclare aucune attaque');
});

test('Survol : l’anneau se pose sur les cartes adverses, jamais sur les nôtres', () => {
  const cartes = page.split('\n').filter((ligne) => ligne.includes('porteeVisible='));
  assert.equal(cartes.length, 1, 'un seul point de pose, la rangée adverse');
  assert.match(cartes[0], /porteeVisible=\{Boolean\(porteeSurvol\?\.cibles\?\.has\(entite\.id\)\)\}/,
    'la carte survolée n’a pas à s’annoncer elle-même');
  const lignes = page.split('\n');
  const i = lignes.findIndex((ligne) => ligne.includes('porteeVisible='));
  const contexte = lignes.slice(i, i + 10).join('\n');
  assert.match(contexte, /pourCreature\(duel, 'sorcier'/,
    'ce point de pose est celui du camp adverse');
});

test('Survol : la plaque du sorcier s’allume quand la frappe directe reste seule', () => {
  const plaque = page.split('\n').find((ligne) => ligne.includes('rpg-wizard-plate rpg-wizard-plate--ennemi'));
  assert.ok(plaque, 'la plaque du sorcier existe');
  assert.match(plaque, /porteeSurvol\?\.directe/, 'le survol allume la plaque comme le clic');
  assert.match(plaque, /choixIndividuel\.directe/, 'le signal du clic reste intact');
});

test('CSS : l’anneau doré ne prend jamais le pas sur le ciblage', () => {
  assert.match(battle, /\.rpg-card\.is-a-portee \{\n  outline: 2px solid #f0cd7f;/,
    'anneau doré fin, distinct du cyan de `is-ciblable`');
  assert.match(battle, /\.rpg-card\.is-a-portee:not\(\.is-ciblable, \.is-spell-target, \.is-coup-rapide-cible/,
    'la pulsation dorée cède aux états plus forts');
  assert.match(battle, /@media \(prefers-reduced-motion: reduce\) \{\n  \.rpg-card\.is-a-portee \{ animation: none; \}/,
    'mouvement réduit : l’anneau reste, la pulsation s’arrête');
  const cyan = battle.indexOf('.rpg-card.is-ciblable {\n  outline: 3px solid #72e6d0;');
  const or = battle.indexOf('.rpg-card.is-a-portee {');
  assert.ok(cyan >= 0 && or > cyan, 'le cyan reste déclaré avant, l’or après');
  assert.doesNotMatch(battle.slice(or, or + 400), /#72e6d0/, 'l’or ne vole pas la couleur du ciblage');
});
