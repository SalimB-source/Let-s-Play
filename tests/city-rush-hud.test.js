import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/vice-city-rush.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/ViceCityRushPage.jsx', import.meta.url), 'utf8');
const world = readFileSync(new URL('../src/games/ViceCityWorld.jsx', import.meta.url), 'utf8');
const healthRules = [...css.matchAll(/\.city-rush-health\s*\{([^}]*)\}/g)].map((match) => match[1]);
const mobileHealthRule = healthRules.at(-1) || '';
const mobileHealthDeclarations = Object.fromEntries(
  [...mobileHealthRule.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)]
    .map((match) => [match[1], match[2].trim()]),
);

test('the race exposes one large, round red machine-gun button and no legacy shot buttons', () => {
  assert.match(page, /const POWER_ORDER = \[CITY_RUSH_POWERS\.PISTOL\]/);
  assert.match(page, /city-rush-machine-gun-button/);
  assert.match(page, /Tirer à l’AK-47/);
  assert.match(page, /chargeur recourbé/);
  assert.match(world, /unguided: isPistol/);
  assert.match(world, /fireStraightShot\('player', null, CITY_RUSH_POWERS.PISTOL\)/);
  assert.match(world, /CITY_RUSH_PISTOL_SPIN_TURNS/);
  assert.doesNotMatch(page, /city-rush-power-button/);
  assert.doesNotMatch(page, /A : TIR BLEU|R : HÉLICO/);

  const buttonRule = css.match(/\.city-rush-machine-gun-button\s*\{([^}]*)\}/)?.[1] || '';
  const declarations = Object.fromEntries(
    [...buttonRule.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)]
      .map((match) => [match[1], match[2].trim()]),
  );
  assert.equal(declarations.width, '102px');
  assert.equal(declarations.height, '102px');
  assert.equal(declarations['border-radius'], '50%');
});

test('the mobile player health bar is compact and sits lower without covering the corner HUD', () => {
  assert.ok(mobileHealthRule, 'la règle mobile de la barre de coque existe');
  assert.equal(mobileHealthDeclarations.left, '50%', 'la barre reste centrée entre le classement et les commandes');
  assert.equal(mobileHealthDeclarations.transform, 'translateX(-50%)');
  assert.equal(mobileHealthDeclarations['z-index'], '6', 'la barre reste au-dessus des éléments du HUD');
  assert.equal(mobileHealthDeclarations.display, 'flex', 'la barre mobile tient sur une ligne compacte');
  assert.equal(mobileHealthDeclarations.gap, '6px');
  assert.equal(mobileHealthDeclarations.padding, '5px 8px');

  const bottomOffset = mobileHealthDeclarations.bottom?.match(
    /^calc\((\d+)px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\)$/,
  );
  assert.ok(bottomOffset, 'le décalage tient compte de la zone de sécurité de l’écran');
  assert.equal(Number(bottomOffset[1]), 218, 'la barre est abaissée tout en restant au-dessus des commandes tactiles');

  const mobileTrackRule = [...css.matchAll(/\.city-rush-health-track\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';
  assert.match(mobileTrackRule, /height:\s*6px/);
  assert.match(mobileTrackRule, /flex:\s*1/);
  assert.match(page, /playerHealthCritical \? ' — critique' : ''/, 'la criticité reste annoncée même sans libellé visuel mobile');
});

test('victoire en mode course : le bouton COURSE SUIVANTE doré à texte noir est présent', () => {
  assert.match(page, /isRaceWon/);
  assert.match(page, /city-rush-next-race-button|COURSE SUIVANTE/);
  assert.match(page, /startNextRace/);
});

test('le bouton COURSE SUIVANTE est doré avec un texte noir dans le CSS', () => {
  const cinematicCss = readFileSync(new URL('../src/games/vice-city-rush-cinematic.css', import.meta.url), 'utf8');
  assert.match(css, /\.city-rush-start-button\.is-gold|\.city-rush-next-race-button/);
  assert.match(css, /color:\s*#000000/);
  assert.match(cinematicCss, /\.city-rush-next-race-button|\.city-rush-start-button\.is-gold/);
  assert.match(cinematicCss, /color:\s*#000000/);
});

