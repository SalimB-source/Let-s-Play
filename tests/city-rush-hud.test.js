import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/vice-city-rush.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/ViceCityRushPage.jsx', import.meta.url), 'utf8');
const world = readFileSync(new URL('../src/games/ViceCityWorld.jsx', import.meta.url), 'utf8');
const raceList = readFileSync(new URL('../src/games/CityRushRaceList.jsx', import.meta.url), 'utf8');
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

test('maintenir Z vide le chargeur à cadence régulière et s’arrête à la relâche', () => {
  assert.match(world, /const PISTOL_HOLD_FIRE_INTERVAL = 0\.12/);
  assert.match(world, /let pistolKeyHeld = false/);
  assert.match(world, /pistolKeyHeld && pistolHoldCooldown <= 0/);
  assert.match(world, /window\.addEventListener\('keyup', onKeyUp\)/);
  assert.match(world, /const onWindowBlur = \(\) => releasePistolKey/);
  assert.match(world, /if \(pistolKeyHeld && pistolHoldCooldown <= 0 && isCityRushPowerCharged/);
  assert.match(world, /if \(usePower\(CITY_RUSH_POWERS\.PISTOL\)\) pistolHoldCooldown = PISTOL_HOLD_FIRE_INTERVAL/);
});

test('the mobile fifteen-cell player health bar is compact and sits above the corner HUD', () => {
  assert.ok(mobileHealthRule, 'la règle mobile de la barre de vie existe');
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
  assert.equal(Number(bottomOffset[1]), 218, 'la barre reste au-dessus des commandes tactiles');

  const mobileCellsRule = [...css.matchAll(/\.city-rush-health-cells\s*\{([^}]*)\}/g)].at(-1)?.[1] || '';
  assert.match(mobileCellsRule, /gap:\s*2px/);
  assert.match(page, /playerHealthCritical \? ' — critique' : ''/, 'la criticité reste annoncée par le HUD');
  assert.match(page, /phase === 'playing'/, 'la barre du joueur est visible dès le début de la course');
  assert.match(page, /<CityRushHealthBar health=\{playerHealthValue\}/);
  assert.match(raceList, /health=\{racer\.health\}/, 'le classement montre aussi les barres de chaque adversaire');
});

test('les berlines de police du trafic sont ciblables par un tir rouge', () => {
  const candidates = world.match(/function laneShotCandidates\([\s\S]*?\n  function firstEnemyOnLane/)?.[0] || '';
  const vehicleState = world.match(/function getRaceVehicleState\([\s\S]*?\n  function isVisibleInPlayerCamera/)?.[0] || '';
  const pistolHit = world.match(/function applyPistolHit\([\s\S]*?\n  function applyStraightShotHit/)?.[0] || '';
  const policeDamage = world.match(/function damagePolice\([\s\S]*?\n  function updateVisualEffects/)?.[0] || '';
  assert.match(candidates, /trafficCars[\s\S]*?traffic\.type === 'police'/, 'les véhicules de police civils entrent dans la liste des cibles');
  assert.match(vehicleState, /trafficPolice\?\.type === 'police'/, 'un véhicule du trafic reçoit un état de police avec sa santé');
  assert.match(pistolHit, /damagePolice\(target\.racer, CITY_RUSH_POWERS\.PISTOL, attackerId\)/);
  assert.match(policeDamage, /cityRushPoliceDamage\(police\.health, source\)/);
  assert.match(policeDamage, /if \(source !== CITY_RUSH_POWERS\.PISTOL\)/, 'un tir rouge ne fait pas déraper la voiture de police');
});

test('un tir rouge retire de la vie sans ralentir ni faire déraper sa cible', () => {
  const pistolHit = world.match(/function applyPistolHit\([\s\S]*?\n  function applyStraightShotHit/)?.[0] || '';
  assert.ok(pistolHit, 'le gestionnaire de tir rouge existe');
  assert.match(pistolHit, /damageRacer\(target\.racer, CITY_RUSH_POWERS\.PISTOL, attackerId\)/);
  assert.match(pistolHit, /damagePolice\(target\.racer, CITY_RUSH_POWERS\.PISTOL, attackerId\)/);
  assert.doesNotMatch(pistolHit, /playerSlowLeft|playerSkidLeft|slowLeft\s*=|skidLeft\s*=|spinLeft\s*=/);
  assert.match(world, /start\(\)\s*\{[\s\S]*?activatePlayerHealth\(\)/, 'la santé est activée au départ, pas au dernier tour');
  assert.match(world, /police\.targetId = targetId/);
  assert.match(world, /targetId: attackerId/);
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

test('changer de voie ne ralentit plus : ni malus dans le monde, ni promesse dans la page', () => {
  // Le monde ne doit plus jamais moduler la vitesse visée du joueur à cause
  // d'un écart : le malus a été retiré de l'équation, pas seulement réduit.
  assert.doesNotMatch(world, /CITY_RUSH_LANE_CHANGE_SLOW/, 'plus aucune règle de ralentissement au changement de voie importée');
  assert.doesNotMatch(world, /laneChangeScale/, 'aucun facteur de changement de voie dans le calcul de vitesse');
  assert.doesNotMatch(world, /playerLaneChangeSlowLeft/, 'aucun compte à rebours de ralentissement après un écart');
  // La cible de vitesse du joueur ne dépend que des malus (trafic, tirs), du
  // pad turbo et de la voie tenue (bonus), jamais de l'écart lui-même.
  const targetLine = world.match(/const targetPlayerSpeed = [^\n]+/)?.[0] || '';
  assert.ok(targetLine, 'la vitesse visée du joueur est toujours calculée sur une ligne');
  assert.match(targetLine, /cleanLineScale/);
  assert.doesNotMatch(targetLine, /[Ll]aneChange/);
  // Un écart ne fait que remettre à zéro le bonus de ligne propre.
  assert.match(world, /playerCleanLineTime = 0;/);
  // La page ne promet plus de coup de frein au joueur.
  assert.doesNotMatch(page, /changement de voie ralentit/, 'le bandeau ne doit plus annoncer de ralentissement');
  assert.match(page, /changer de voie ne ralentit plus/i);
});

