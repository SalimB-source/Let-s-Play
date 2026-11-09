import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { SACRIFICE_ANIMATION as temps, instantaneSansSacrificesAnimes } from '../src/games/rpgSacrificeAnimation.js';
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
    assert.equal(doc.querySelectorAll('.rpg-invocation-sceau__orbite').length, 4);
    assert.equal(doc.querySelectorAll('svg.rpg-invocation-sceau polygon').length, 8);
    assert.equal(doc.querySelectorAll('svg.rpg-invocation-sceau circle').length, 8);
    assert.equal(doc.querySelector('.rpg-invocation-sceau').getAttribute('viewBox'), '0 0 200 200');
    assert.ok(doc.querySelector('.rpg-card.is-sacrifice-animating'));
    assert.match(doc.querySelector('.rpg-cercle-magique').getAttribute('style'), /--rpg-sacrifice-duree:1400ms/);
    dom.window.close();
  } finally { await vite.close(); }
  const css = lire('rpg-battle.css');
  const cercle = css.slice(css.indexOf('.rpg-cercle-magique {'), css.indexOf('/* ═════', css.indexOf('.rpg-cercle-magique {')));
  assert.match(cercle, /rgba\(225, 175, 65,/);
  assert.doesNotMatch(cercle, /170, 110, 255|110, 40, 220/);
  assert.match(cercle, /transform: rotate\(360deg\)/);
  assert.match(cercle, /animation-direction: reverse/);
  assert.match(css, /\.rpg-card\.is-sacrifice-animating \{ visibility: hidden; pointer-events: none; \}/);
  assert.match(css, /\.rpg-battle\.is-reduced \.rpg-cercle-magique/);
});


test('les sacrifices déjà animés sont exclus des sorties, sans toucher aux vrais renvois/exils', () => {
  const avant = ['sacrifice1', 'sacrifice2', 'renvoi', 'exil', 'mort'].map(entityId => ({ entityId }));
  const apres = instantaneSansSacrificesAnimes(avant, ['sacrifice1', 'sacrifice2']);
  assert.deepEqual(apres.map(e => e.entityId), ['renvoi', 'exil', 'mort']);
  assert.equal(avant.length, 5, 'aucune mutation de l’instantané');
  assert.deepEqual(instantaneSansSacrificesAnimes(avant), avant);
  const page = lire('RpgDuelPage.jsx');
  assert.match(page, /animerModificationsChamp\(champAvantAction, \[\], debutJournalDestructions, \[\],\s*res.sacrificeIds/);
  const animation = page.slice(page.indexOf('  const animerModificationsChamp ='), page.indexOf('  const animerModificationsChamp =') + 33000);
  assert.ok(animation.indexOf('instantaneSansSacrificesAnimes(avant, entitesDejaAnimees)') < animation.indexOf('const renvoyees ='));
  assert.match(page, /animerModificationsChamp\(champAvantAction, \[\], debutJournalDestructions,\s*\[res.renvoiEntityId\]/);
});


test('l’IA montre le même rituel pour chaque victime avant de révéler sa créature', () => {
  const page = lire('RpgDuelPage.jsx');
  const action = page.slice(page.indexOf('  const laisserPasser ='), page.indexOf('  // Phase d’attaque du sorcier', page.indexOf('  const laisserPasser =')));
  assert.match(action, /res\.sacrificeIds \?\? \[\]/);
  assert.match(action, /champAvant\.find\(entite => entite\.entityId === id\)/);
  assert.match(action, /setSacrificeFx\(\{ victimes: victimesSacrifice, token: tokenSacrifice, entiteArriveeId: res\.entite\?\.id \}\)/);
  assert.match(action, /\[res\.renvoiEntityId\], victimesSacrifice\.map\(v => v\.entityId\)/,
    'le sacrifice ne rejoue pas le fantôme de destruction');
  assert.match(action, /later\(\(\) => terminerPoseSacrifice\(tokenSacrifice\), duree\)/);
  assert.match(page, /sacrificeEnAnimation=\{sacrificeFx\?\.entiteArriveeId === entite\.id\}/,
    'la créature de l’IA reste cachée jusqu’à la fin du rituel');
  assert.match(page, /const fenetreEffetCreature = Boolean\([^;]*&& !sacrificeFx\)/,
    'une réponse à l’effet de la créature attend la fin du rituel');
  const fin = page.slice(page.indexOf('  const terminerPoseSacrifice ='), page.indexOf('  const terminerCercleSacrifice ='));
  assert.match(fin, /if \(enCours\.cote === 'sorcier'\)/);
  assert.match(fin, /else later\(annoncerSuivantSorcier, delaiReflexionSorcier\(\)\)/,
    'l’IA attend la fin des cercles pour annoncer sa carte suivante');
});

test('le filtrage préserve le journal des projectiles et les coordonnées des avatars', () => {
  const avant = [{ entityId: 'victime' }];
  avant.combatAnimationIds = new Set(['projectile-deja-joue']);
  avant.avatarRects = { sorcier: { x: 80, y: 20, width: 30, height: 30 } };
  const apres = instantaneSansSacrificesAnimes(avant, ['victime']);
  assert.equal(apres.length, 0);
  assert.equal(apres.combatAnimationIds, avant.combatAnimationIds);
  assert.equal(apres.avatarRects, avant.avatarRects);
});
