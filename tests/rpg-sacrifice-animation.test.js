import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { SACRIFICE_ANIMATION as temps } from '../src/games/rpgSacrificeAnimation.js';
const lire = f => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8');

test('la déchirure et les derniers glyphes finissent avant la pose, à chaque vitesse', () => {
  assert.ok(temps.retardDechirement > 0, 'le cercle s’allume avant la déchirure');
  for (const vitesse of [.5, 1, 2]) {
    const finDechirure = (temps.retardDechirement + temps.dechirement) * vitesse;
    const finCercle = temps.cercle * vitesse;
    assert.ok(finDechirure < finCercle);
    const pose = (temps.cercle + temps.pause) * vitesse;
    assert.ok(pose > finCercle, 'pause après disparition complète du cercle');
    assert.ok((temps.cercle + temps.pause + temps.secours) * vitesse > pose);
  }
  assert.ok(temps.reduit > 0 && temps.reduit < temps.cercle);
});

test('la pose attend tous les cercles et les minuteries périmées ne peuvent poser une autre carte', () => {
  const page = lire('RpgDuelPage.jsx');
  const action = page.slice(page.indexOf('  const dechirerEtPoser ='), page.indexOf('  const equiperArme ='));
  assert.match(action, /choisis\.map\(id => champ\.find/);
  assert.match(action, /setSacrificeFx\(\{ victimes, token \}\)/);
  assert.match(action, /enCours\.termines\.size !== enCours\.attendus\.length/);
  assert.match(action, /enCours\.token !== token/);
  assert.match(action, /enCours\.finPlanifiee = true/);
  assert.match(action, /later\(\(\) => terminerPoseSacrifice\(token\), dureeAnimation\(SACRIFICE_ANIMATION.pause\)\)/);
  const finaliser = action.slice(action.indexOf('  const terminerPoseSacrifice'));
  assert.ok(finaliser.indexOf('setSacrificeFx(null)') < finaliser.indexOf('finaliserPoseCreature('));
  assert.ok(finaliser.indexOf('annoncerVoixArrivee') < finaliser.indexOf('finaliserPoseCreature('));
  assert.doesNotMatch(action.slice(0, action.indexOf('  const terminerPoseSacrifice')), /annoncerVoixArrivee/);
  assert.match(page, /sacrificeFx\?\.victimes\.map\(\(victime\) => \([\s\S]*?onTermine=\{terminerCercleSacrifice\}/);
});

test('deux victimes portent chacune leur cercle ; la carte réelle est masquée sans perdre sa case', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { CercleMagique, TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
      ...['a', 'b'].map(id => React.createElement(CercleMagique, { key: id, effet: { entityId: id, effectId: id, left: 10, top: 20, width: 100, height: 125, angle: 0 } })),
      React.createElement(TableCard, { entite: { id: 'a', carteId: 'chien-du-guet', name: 'Chien du guet', atk: 2, def: 2, pv: 2, pvMax: 2, ready: true }, cote: 'joueur', sacrificeEnAnimation: true }),
    ));
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('[data-rpg-sacrifice-id]').length, 2);
    assert.equal(doc.querySelectorAll('.rpg-cercle-magique__anneau').length, 4);
    assert.ok(doc.querySelector('.rpg-card.is-sacrifice-animating'));
    assert.match(doc.querySelector('.rpg-cercle-magique').getAttribute('style'), /--rpg-sacrifice-duree:1400ms/);
    dom.window.close();
  } finally { await vite.close(); }
  const css = lire('rpg-battle.css');
  const cercle = css.slice(css.indexOf('.rpg-cercle-magique {'), css.indexOf('/* ═════', css.indexOf('.rpg-cercle-magique {')));
  assert.match(cercle, /rgba\(225, 175, 65,/);
  assert.doesNotMatch(cercle, /170, 110, 255|110, 40, 220/);
  assert.match(cercle, /rotate: 360deg/);
  assert.match(cercle, /rotate: -360deg/);
  assert.match(css, /\.rpg-card\.is-sacrifice-animating \{ visibility: hidden; pointer-events: none; \}/);
  assert.match(css, /\.rpg-battle\.is-reduced \.rpg-cercle-magique/);
});
