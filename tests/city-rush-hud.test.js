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

  const readyRule = css.match(/\.city-rush-machine-gun-button\.is-ready\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(readyRule, /border:\s*3px solid #fff/);
  assert.match(readyRule, /animation:\s*crMachineGunReadyGlow/);
  assert.match(css, /@keyframes crMachineGunReadyGlow/);
  assert.match(css, /\.city-rush-machine-gun-button\.is-ready,\s*\n\s*\.city-rush-machine-gun-button\.is-ready::after/);
  assert.match(page, /ready \? `CHARGÉ \${ammo}\/\$\{CITY_RUSH_PISTOL_AMMO_PER_PICKUP\}`/);
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

test('le niveau de recherche à cinq étoiles est explicite, visible et réinitialisé entre deux courses', () => {
  assert.match(page, /const wantedStars = Math\.max\(0, Math\.min\(/);
  assert.match(page, /Number\(hud\.wantedLevel\)/, 'les étoiles ne sont plus déduites du nombre de voitures actives');
  assert.match(page, /star <= wantedStars \? 'is-on' : ''/);
  assert.match(page, /Police en chasse · niveau \$\{wantedStars\} sur \$\{CITY_RUSH_WANTED_MAX_STARS\}/);
  assert.match(page, /wantedLevel: 0/);
  assert.match(world, /wantedLevel,\s*wantedMaxStars: CITY_RUSH_WANTED_MAX_STARS/);
  assert.match(world, /wantedLevel = effectivePoliceFromStart \? CITY_RUSH_WANTED_MAX_STARS : 0/,
    'un nouveau départ revient à zéro, sauf le mode Poursuite');
  assert.match(world, /CITY_RUSH_POLICE_TURNAROUND_DURATION/);
  assert.match(world, /oncoming\.mesh\.rotation\.y = trackYaw\(oncoming\.distance\)[\s\S]*?Math\.PI \* \(1 - turnEase\)/,
    'le véhicule effectue un demi-tour animé, pas un changement d’orientation instantané');
  assert.match(world, /oncoming\.turnaroundElapsed = Math\.min\(/,
    'l’animation de demi-tour progresse avec le temps réel');
});

test('les étoiles suivent les tirs/destructions et deux mini-garages réinitialisent la recherche', () => {
  const policeDamage = world.match(/function damagePolice\([\s\S]*?\n  function updateVisualEffects/)?.[0] || '';
  const policeDestruction = world.match(/function destroyPolice\([\s\S]*?\n  function acquirePoliceWreckHusk/)?.[0] || '';
  assert.match(world, /cityRushWantedLevelAfterHit\(wantedLevel, \{ hit: true, police \}\)/,
    'un tir ou contact policier élève la recherche sans passer directement à cinq');
  assert.match(policeDamage, /const isShot = source !== 'collision';[\s\S]*?raiseWantedLevel\(\{ police: true, reason: isShot \? 'police-shot' : 'police-contact' \}\)/,
    'un tir réussi sur la police déclenche bien le palier de trois étoiles');
  assert.match(world, /cityRushWantedLevelAfterPoliceDestroyed\(wantedLevel, policeDestroyedByPlayer\)/,
    'les destructions de police comptent séparément');
  assert.match(policeDestruction, /raiseWantedLevel\(\{ police: true, destroyed: true, reason: 'police-destroyed' \}\)/,
    'détruire une voiture de police applique le palier de destruction');
  assert.match(world, /policeDestroyedByPlayer = Math\.min\(CITY_RUSH_POLICE_DESTROYS_TO_MAX_STARS, policeDestroyedByPlayer \+ 1\)/);
  assert.match(world, /CITY_RUSH_MINI_GARAGE_COUNT/);
  assert.match(world, /const garageExitDistance = garage\.trackDistance \+ CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH/,
    'la remise à zéro attend que la voiture ait traversé toute la longueur du portique');
  assert.match(world, /while \(!garage\.used && garage\.trackDistance \+ CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH <= distance\)/,
    'le garage reste visible jusqu’à ce que la voiture en sorte');
  assert.match(world, /cityRushMiniGarageCanClearWanted\(/);
  assert.match(world, /wantedLevel = 0;[\s\S]*?type: 'mini-garage-used'/,
    'la sortie du mini-garage remet le niveau à zéro et annonce son usage');
  assert.match(world, /miniGaragesRemaining: miniGarages\.filter\(\(garage\) => !garage\.used\)\.length/);
  assert.match(page, /miniGaragesRemaining:\s*CITY_RUSH_MINI_GARAGE_COUNT/);
  assert.match(page, /city-rush-gta-garages/);
  assert.match(page, /MINI-GARAGES/);
  assert.match(page, /MINI-GARAGE · \$\{effect\.previousStars\} ÉTOILES EFFACÉES/);
});

test('les berlines de police du trafic sont ciblables par un tir rouge', () => {
  const candidates = world.match(/function laneShotCandidates\([\s\S]*?\n  function firstEnemyOnLane/)?.[0] || '';
  const vehicleState = world.match(/function getRaceVehicleState\([\s\S]*?\n  function isVisibleInPlayerCamera/)?.[0] || '';
  const pistolHit = world.match(/function applyPistolHit\([\s\S]*?\n  function applyStraightShotHit/)?.[0] || '';
  const policeDamage = world.match(/function damagePolice\([\s\S]*?\n  function updateVisualEffects/)?.[0] || '';
  assert.match(candidates, /trafficCars[\s\S]*?isCityRushPoliceTrafficType\(traffic\.type\)/, 'les véhicules de police civils et banalisés entrent dans les cibles IA');
  assert.match(vehicleState, /const isPolice = isCityRushPoliceTrafficType\(trafficVehicle\.type\)/, 'un véhicule policier du trafic reçoit un état avec sa santé');
  assert.match(pistolHit, /damagePolice\(target\.racer, CITY_RUSH_POWERS\.PISTOL, attackerId\)/);
  assert.match(pistolHit, /raiseWantedLevel\(\{ reason: 'vehicle-hit' \}\)/, 'un véhicule touché par le joueur augmente sa recherche');
  assert.match(policeDamage, /const healthBeforeHit = hasHealth \? Number\(police\.health\) : CITY_RUSH_POLICE_HEALTH/,
    'les berlines civiles reçoivent leur santé complète au premier impact');
  assert.match(policeDamage, /cityRushPoliceDamage\(healthBeforeHit, source\)/);
  assert.match(policeDamage, /if \(source === CITY_RUSH_POWERS\.BLUE_SHOT\)/, 'le tir bleu peut déraper, contrairement au tir rouge');
});

test('un choc avec la police fait déraper les deux voitures et rabat la patrouille', () => {
  const collisionAnimation = world.match(/function startPoliceCollisionAnimation\([\s\S]*?\n  }\n\n  \/\/ Contact avec une voiture de police/)?.[0] || '';
  const directCollision = world.match(/function applyPoliceCollision\([\s\S]*?\n  }\n/)?.[0] || '';
  assert.ok(collisionAnimation, 'l’animation de collision avec la police existe');
  assert.match(collisionAnimation, /forwardLanes\.includes\(lane\)/, 'la police reste dans le sens de course');
  assert.match(collisionAnimation, /canEnterLane\(police\.id, lane\)/, 'la voie choisie est libre si possible');
  assert.match(collisionAnimation, /police\.lane = nextLane/);
  assert.match(collisionAnimation, /police\.skidLeft = policeSkidDuration/);
  assert.match(collisionAnimation, /playerSkidLeft = nextPlayerSkidDuration/);
  assert.match(collisionAnimation, /playerSkidSide = -skidSide/, 'le joueur glisse légèrement dans l’autre sens');
  assert.match(directCollision, /startPoliceCollisionAnimation\(police\)/);
  assert.match(world, /if \(rallied\) \{[\s\S]*?startPoliceCollisionAnimation\(rallied\)/,
    'la patrouille percutée déclenche elle aussi l’animation');
  assert.match(world, /police\.mesh\.rotation\.z = skidOffset\(police\.skidLeft/);
  assert.match(world, /function emitPoliceSkidSmoke\([\s\S]*?smoke\.emit\(scratch/);
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

test('la police arrive au dernier tour du joueur et réserve une unité par rival tireur', () => {
  const deployment = world.match(/const playerLap = cityRushLapForDistance\(distance, CITY_RUSH_LAP_LENGTH, effectiveLaps\);[\s\S]*?updatePolice\(dt, leader\);/)?.[0] || '';
  assert.ok(deployment, 'le seuil de déploiement de l’escouade est explicite');
  assert.match(deployment, /else if \(playerLap >= effectiveLaps\) deployPolice\(\)/);
  assert.doesNotMatch(deployment, /cityRushLapForDistance\(leader\.distance/,
    'un rival en tête ne fait pas entrer la police avant le dernier tour du joueur');

  const policeDamage = world.match(/function damagePolice\([\s\S]*?\n  function updateVisualEffects/)?.[0] || '';
  const retaliation = world.match(/function registerPoliceRetaliation\([\s\S]*?\n  function activatePoliceUnit/)?.[0] || '';
  assert.match(policeDamage, /if \(attackerId && attackerId !== 'player'\) registerPoliceRetaliation\(attackerId, source\)/,
    'un tir réussi par un rival déclenche la représaille');
  assert.match(retaliation, /policeCars\.find\(\(police\) => police\.reserveForId === attackerId\)/,
    'chaque rival reçoit son unité pré-réservée');
  assert.match(retaliation, /targetId: attackerId/);
  assert.match(retaliation, /type: 'police-retaliation'/);
  assert.match(retaliation, /policeRetaliationByAttacker\.set\(attackerId, reserve\)/,
    'une seule unité est attribuée par rival');
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

test('le bonus de contresens vit dans le monde, s’affiche et se perd au choc frontal', () => {
  // Le monde fait vivre la jauge (règles importées), l’expose au HUD et
  // l’annonce par paliers.
  assert.match(world, /advanceCityRushOncomingBonus\(playerOncomingTime, dt, inOncomingLane\)/);
  assert.match(world, /playerOncomingTime = 0;/);
  assert.match(world, /playerOncomingStage = 'none';/);
  assert.match(world, /oncomingBonus: cityRushOncomingBonusFactor\(playerOncomingTime\)/);
  assert.match(world, /const oncomingScale = cityRushOncomingBonusFactor\(playerOncomingTime\)/);
  const oncomingTargetLine = world.match(/const targetPlayerSpeed = [^\n]+/)?.[0] || '';
  assert.match(oncomingTargetLine, /oncomingScale/, 'le contresens entre dans la vitesse visée');
  assert.match(world, /type: 'oncoming-bonus'/);
  assert.match(world, /stage: 'lost'/);
  // La page l’affiche : pourcentage dans la carte VITESSE et pastille d’état
  // « CONTRESENS », avec le règlement qui l’explique.
  assert.match(page, /oncomingBonusPercent/);
  assert.match(page, /city-rush-speed-bonus/);
  assert.match(page, /CONTRESENS/);
  assert.match(page, /Rouler à contresens/);
  assert.match(css, /\.city-rush-status-pill\.is-oncoming\s*\{/);
  assert.match(css, /\.city-rush-speed-bonus\s*\{/);
});

test('Londres et Tokyo roulent à gauche jusque dans le décor et la page', () => {
  const themes = readFileSync(new URL('../src/games/cityRushThemes.js', import.meta.url), 'utf8');
  const textures = readFileSync(new URL('../src/games/cityRushTextures.js', import.meta.url), 'utf8');
  assert.match(world, /const driveSide = courseLanes\.driveSide/);
  assert.match(world, /pushDirection: driveSide === 'left' \? 'right' : 'left'/);
  assert.match(world, /cityRushOncomingImpactX\(oncoming\.pushAsideStartX, oncoming\.pushAsideElapsed, oncoming\.width, driveSide\)/);
  assert.match(page, /city\.driveSide === 'left'/);
  assert.match(themes, /driveSide: 'left'/);
  assert.match(textures, /const leftHand = cityRushThemeDriveSide\(theme\) === 'left'/);
});

test('en plein saut, personne ne change de voie : ni le joueur, ni les rivaux', () => {
  assert.match(world, /const nextLane = cityRushLaneAfterAction\(playerLane, name, laneCount, \{ airborne: playerJumpState\.active \}\)/);
  assert.match(world, /const racerAirborne = Boolean\(racer\.jumpState\?\.active\)/);
  assert.match(world, /&& !racerAirborne\) racer\.changeIn -= dt/);
  // La page le dit au joueur dans le guide des tremplins.
  assert.match(page, /en l’air, la voiture garde sa voie/);
});

test('la police tire sur les pilotes, jamais sur ses collègues', () => {
  // La liste des cibles d'un tir part du tireur : un policier ne prend pas la
  // police dans sa ligne de tir (sinon l'escouade, qui roule en file devant le
  // leader, vidait ses chargeurs dans le pare-chocs de la berline précédente).
  const candidates = world.match(/function laneShotCandidates\([\s\S]*?\n  function firstEnemyOnLane/)?.[0] || '';
  assert.ok(candidates, 'la liste des cibles des tirs existe');
  assert.match(candidates, /const policeAttacker = Boolean\(activePursuerById\(attackerId\)\)/);
  assert.match(candidates, /\.\.\.\(policeAttacker \? \[\] : activePursuers\(\)/,
    'la police ne se vise pas elle-même');
  assert.match(candidates, /policeAttacker \? \[\] : \[\.\.\.trafficCars, \.\.\.oncomingCars\]/,
    'un tireur policier ne vise pas non plus la police du trafic');
  // Les pilotes, eux, gardent la police dans leurs cibles : le joueur abat les
  // berlines à l’AK-47 et un rival qui touche la police reçoit son poursuivant.
  assert.match(candidates, /attackerId === 'player'\s*\n?\s*\? \[\.\.\.trafficCars, \.\.\.oncomingCars\]/);
});

test('une berline armée se range dans le dos du pilote, avec une mire annoncée', () => {
  const policeUpdate = world.match(/function updatePolice\([\s\S]*?\n  function canEnterLane/)?.[0] || '';
  assert.ok(policeUpdate, 'la mise à jour de l’escouade existe');
  // Une seule berline prend la ligne de tir par client, et jamais une berline
  // du trafic rappelée par un contact.
  assert.match(policeUpdate, /const fireLiners = new Map\(\)/);
  assert.match(policeUpdate, /if \(police\.rallied\) continue;/);
  assert.match(policeUpdate, /gap >= 0 \|\| gap < -CITY_RUSH_POLICE_FIRE_LINE_RANGE/);
  assert.match(policeUpdate, /fireLane: !police\.rallied && fireLiners\.get\(leader\.id\)\?\.police === police \? leader\.lane : null/);
  // La rafale attend l'alignement : le temps de mire se cumule et retombe à
  // zéro dès que la cible se décale.
  assert.match(policeUpdate, /const aligned = Boolean\(target\) && cityRushPoliceAimAligned\(/);
  assert.match(policeUpdate, /police\.aimLeft = cityRushPoliceAimHold\(\{ aim: police\.aimLeft, aligned: true, dt \}\)/);
  assert.match(policeUpdate, /if \(!cityRushPoliceAimReady\(police\.aimLeft\)\) continue;/);
  assert.match(policeUpdate, /fireAsPolice\(police\);[\s\S]*?police\.aimLeft = 0;/);
  assert.match(policeUpdate, /type: 'police-aim'/);
  // La cible d'une mire doit porter sa position latérale : la mire se casse
  // quand le pilote se décale, pas seulement quand il change de voie.
  assert.match(world, /x: playerCar\.position\.x/);
  assert.match(world, /x: racer\.currentX/);
  // Le HUD annonce la mire, la page la montre et prévient le pilote.
  assert.match(world, /aim: police\.aimLeft > 0 \? clamp\(police\.aimLeft \/ CITY_RUSH_POLICE_AIM_TIME, 0, 1\) : 0/);
  assert.match(world, /aimTargetId: police\.aimTargetId \|\| null/);
  assert.match(page, /const policeAim = \(Array\.isArray\(hud\.police\)/);
  assert.match(page, /policeAim > 0 && phase === 'playing' \? ' is-aimed' : ''/);
  assert.match(page, /'--cr-aim': policeAim\.toFixed\(2\)/);
  assert.match(page, /effect\.type === 'police-aim'/);
  assert.match(css, /\.city-rush-viewport\.is-aimed::before\s*\{/);
  assert.match(css, /@keyframes crAimPulse\s*\{/);
});

test('une berline détruite nomme son auteur, et la poursuite reste en course', () => {
  assert.match(world, /type: 'police-destroyed'[\s\S]*?attackerId: attackerId \|\| null/,
    'l’auteur du dernier dégât voyage avec l’explosion');
  assert.match(world, /CITY_RUSH_POLICE_FIRE_LINE_RANGE/);
  assert.match(world, /CITY_RUSH_POLICE_AIM_TIME/);
});

test('la barre de police affiche six carrés pour une berline, dix pour un SUV', () => {
  // Le nombre de carrés dessinés au-dessus du toit vient de la règle : changer
  // la vie de la police change la barre, et réciproquement.
  const bar = world.match(/function attachPoliceHealthBar\([\s\S]*?\nfunction detachPoliceHealthBar/)?.[0] || '';
  assert.ok(bar, 'la barre de vie des berlines existe');
  assert.match(bar, /const segmentCount = cityRushPoliceMaxHealth\(group\.userData\?\.trafficType\);/);
  assert.match(bar, /Array\.from\(\{ length: segmentCount \}/);
  assert.match(bar, /Array\.from\(\{ length: segmentCount \}, \(_, index\) => \{/);
  // Les carrés allumés suivent la vie restante, arrondie au carré supérieur.
  assert.match(world, /segment\.visible = segmentIndex < remainingSquares;/);
  assert.match(world, /const remainingSquares = Math\.ceil\(clamp\(police\.health, 0, policeMax\)\)/);
  // La page annonce les six carrés dans le bandeau de touche — et un seul
  // carré emporté par balle, au bandeau comme dans la règle affichée.
  assert.match(page, /CARRÉS\./);
  assert.match(page, /effect\.maxHealth/);
  const pistolToast = page.match(/effect\.type === 'police-hit' && effect\.source === 'pistol'\) \{\s*showToast\(([\s\S]*?), 'pistol'\)/)?.[1] || '';
  assert.ok(pistolToast, 'le bandeau de la berline touchée par une balle rouge existe');
  assert.match(pistolToast, /−1 CARRÉ/, 'une balle rouge n’enlève jamais qu’un carré à la berline');
  assert.match(page, /une berline de police[^.]*un tir rouge lui retire un seul carré/i,
    'la règle affichée promet un seul carré par tir rouge, berline comme adversaire');
  assert.doesNotMatch(page, /3 dégâts|trois dégâts/, 'plus aucun texte ne promet trois dégâts d’un tir rouge');
});

test('le HUD de course est une grille de zones : aucun élément ne se superpose', () => {
  const hudCss = readFileSync(new URL('../src/games/vice-city-rush-hud.css', import.meta.url), 'utf8');
  assert.match(page, /import '\.\/vice-city-rush-hud\.css'/);
  assert.match(page, /className=\{`city-rush-hud\$\{sprintMode/);
  for (const zone of ['is-top-left', 'is-top-center', 'is-top-right', 'is-mid-left', 'is-mid-right', 'is-bottom-left', 'is-bottom-center', 'is-bottom-right']) {
    assert.match(page, new RegExp(`city-rush-hud-zone ${zone}`), `zone ${zone} présente`);
  }
  assert.match(hudCss, /\.city-rush-viewport \.city-rush-hud \{[^}]*display: grid;[^}]*grid-template-areas:/);
  assert.doesNotMatch(page, /city-rush-controls-bottom|className="city-rush-radar"/);
});

test('les flèches de direction ne sont plus affichées ; le compteur à aiguille occupe le bas gauche', () => {
  assert.doesNotMatch(page, /city-rush-steering/);
  assert.match(page, /city-rush-hud-zone is-bottom-left">\s*<div className="city-rush-speedometer-wrap">\s*<CityRushSpeedometer speed=\{hud\.speed\}/);
  const gauge = readFileSync(new URL('../src/games/CityRushSpeedometer.jsx', import.meta.url), 'utf8');
  assert.match(gauge, /onClick=\{toggle\}/);
  assert.match(gauge, /'mph'/);
});

test('le bouton AK-47 vide est grisé et montre un anneau de munitions', () => {
  const hudCss = readFileSync(new URL('../src/games/vice-city-rush-hud.css', import.meta.url), 'utf8');
  assert.match(page, /ready \? ' is-ready' : ' is-empty'/);
  assert.match(page, /city-rush-machine-gun-ammo/);
  assert.match(hudCss, /\.city-rush-machine-gun-button\.is-empty \{[^}]*filter: grayscale\(1\)/);
});

test('le compte à rebours laisse voir la route (pas de voile opaque)', () => {
  const hudCss = readFileSync(new URL('../src/games/vice-city-rush-hud.css', import.meta.url), 'utf8');
  assert.match(hudCss, /\.city-rush-page \.city-rush-viewport \.city-rush-countdown,[^{]*\{[^}]*backdrop-filter: none;[^}]*\}/);
  assert.doesNotMatch(hudCss.match(/\.city-rush-page \.city-rush-viewport \.city-rush-countdown,[^{]*\{([^}]*)\}/)[1], /#090c12/);
});

test('le blindage du SUV est conservé à la création, au rejeu et au renfort', () => {
  assert.match(world, /health: cityRushPoliceMaxHealth\(vehicleType\)/);
  assert.match(world, /maxHealth: cityRushPoliceMaxHealth\(vehicleType\)/);
  assert.match(world, /police\.health = cityRushPoliceMaxHealth\(police\.vehicleType\)/);
  const activation = world.match(/function activatePoliceUnit\([\s\S]*?function /)?.[0] || '';
  assert.match(activation, /police\.maxHealth = cityRushPoliceMaxHealth\(police\.vehicleType\)/);
  assert.match(activation, /police\.health = police\.maxHealth/);
  assert.match(world, /maxHealth: police\.maxHealth \|\| CITY_RUSH_POLICE_HEALTH/);
});

test('le choc du SUV coûte deux carrés sans contourner le répit partagé', () => {
  const collision = world.match(/function applyPoliceCollision\([\s\S]*?function /)?.[0] || '';
  assert.match(collision, /applyCarCollision\([\s\S]*?source: police\.vehicleType === 'police-suv' \? 'suv-collision' : 'collision'/);
  const shared = world.match(/function applyCarCollision\([\s\S]*?function /)?.[0] || '';
  assert.match(shared, /if \(playerCollisionCooldownLeft > 0\) return 0;/);
  assert.match(shared, /damagePlayer\(source, null/);
  assert.match(shared, /if \(lost > 0\) playerCollisionCooldownLeft = CITY_RUSH_PLAYER_COLLISION_COOLDOWN;/);
  assert.match(collision, /damagePolice\(police, 'collision', 'player'/);
  assert.match(page, /TA COQUE PERD \$\{effect\.playerHealthLost\}/);
});
