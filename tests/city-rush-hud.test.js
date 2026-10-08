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

test('route bonuses use the generated lane offset instead of stacking at the road center', () => {
  const setPickupKind = world.match(/function setPickupKind\(pickup, type, laneX, shared\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(world, /setPickupKind\(slot, pickup\.type, laneX\(pickup\.lane\), shared\)/,
    'la voie tirée par la rangée est transmise à l’objet 3D');
  assert.match(setPickupKind, /pickup\.position\.x\s*=\s*laneX/,
    'le bonus est décalé latéralement depuis le groupe centré sur la route');
});

test('the race exposes one large, round red machine-gun button and no legacy shot buttons', () => {
  // Un seul bouton de tir pour les deux armes : l'AK-47 rouge et le fusil à
  // pompe bleu se partagent l'emplacement, jamais les deux à la fois.
  assert.match(page, /const POWER_ORDER = \[...CITY_RUSH_WEAPON_TYPES\]/);
  assert.match(page, /city-rush-machine-gun-button/);
  assert.match(page, /ramasse un bonus rouge \(AK-47, 7 balles\) ou un bonus bleu/);
  assert.match(page, /chargeur recourbé/);
  assert.match(page, /bouche évasée/);
  assert.match(world, /unguided: isWeapon/);
  assert.match(world, /fireStraightShot\('player', null, type\)/);
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
  assert.match(page, /ready \? \(reloading \? `RECHARGE \${ammo}\/\${max}` : `CHARGÉ \${ammo}\/\${max}`\) : 'À RAMASSER'/,
    'le bouton annonce la cartouche restante, le réarmement, ou reste vide');
  // Le pompe repeint le même bouton en bleu.
  assert.match(css, /\.city-rush-machine-gun-button\.is-shotgun\s*\{/);
  assert.match(css, /\.city-rush-machine-gun-button\.is-reloading\s*\{/);
  assert.match(css, /\.city-rush-guide-item\.is-shotgun/);
});

test('le HUD de la première mission affiche la coque du dealer et son intercepteur démarre dans la voie du joueur', () => {
  const missions = readFileSync(new URL('../src/games/cityRushMissions.js', import.meta.url), 'utf8');
  assert.match(missions, /targetHealth:\s*36/);
  assert.match(missions, /rivalHealth:\s*Object\.freeze\(\{ dealer: 36 \}\)/);
  assert.match(page, /lane:\s*player\?\.lane \?\? opponent\?\.lane/);
  assert.match(page, /health:\s*currentMission\.targetHealth \|\| 36/);
  assert.match(page, /hud\.racers\?\.find\([\s\S]*?\|\|\s*roster\.find\(/, 'la jauge affiche déjà les 36 PV avant la première mise à jour du monde');
  assert.match(page, /DEALER \$\{Math\.max\(0, Number\(missionTargetHud\?\.health\) \|\| 0\)\}\/\$\{currentMission\.targetHealth \|\| 36\} PV/);
  assert.match(raceList, /<CityRushHealthBar[\s\S]*?health=\{racer\.health\}[\s\S]*?maxHealth=\{racer\.maxHealth\}/);
});

test('maintenir Z vide le chargeur à cadence régulière et s’arrête à la relâche', () => {
  assert.match(world, /const PISTOL_HOLD_FIRE_INTERVAL = 0\.12/);
  // Le fusil à pompe partage le bouton, pas la cadence : 1,5 s par cartouche.
  assert.match(world, /const SHOTGUN_HOLD_FIRE_INTERVAL = CITY_RUSH_SHOTGUN_FIRE_COOLDOWN/);
  assert.match(world, /function weaponFireInterval\(type\)/);
  assert.match(world, /let pistolKeyHeld = false/);
  assert.match(world, /pistolKeyHeld && pistolHoldCooldown <= 0/);
  assert.match(world, /window\.addEventListener\('keyup', onKeyUp\)/);
  assert.match(world, /const onWindowBlur = \(\) => \{/);
  assert.match(world, /if \(pistolKeyHeld && pistolHoldCooldown <= 0 && heldWeapon\(\)\) fireHeldWeapon\(\)/);
  assert.match(world, /if \(fired\) pistolHoldCooldown = weaponFireInterval\(weapon\.type\)/);
  assert.match(page, /actionsRef\.current\?\.\('pistol-down'\)/, 'le bouton tactile déclenche immédiatement le premier tir');
  assert.match(page, /actionsRef\.current\?\.\('pistol-up'\)/, 'le relâchement tactile arrête la rafale');
  assert.match(world, /if \(name === 'pistol-down'\)/);
  assert.match(world, /if \(name === 'pistol-tap'\)/, 'un clic clavier tire un seul coup sans armer la rafale');
  assert.match(world, /if \(name === 'pistol-up'\)/);
  assert.match(css, /\.city-rush-machine-gun-button\s*\{[^}]*touch-action:\s*none;/);
});

test('maintenir une flèche enchaîne les changements de voie jusqu’à la relâche', () => {
  // Le calendrier est celui d'un clavier système : l'écart part à l'image même
  // de la pression, le deuxième attend le délai de répétition, les suivants
  // s'enchaînent à la cadence — calée sur le glissement latéral de la voiture.
  assert.match(world, /const STEER_HOLD_FIRST_DELAY = 0\.26/);
  assert.match(world, /const STEER_HOLD_LANE_INTERVAL = 0\.18/);
  assert.match(world, /const steerKeysHeld = new Map\(\)/);
  assert.match(world, /let steerHoldDirection = null/);
  assert.match(world, /let steerHoldCooldown = 0/);
  // Les quatre touches du volant sont déclarées ensemble, AZERTY compris.
  assert.match(world, /const STEER_KEY_DIRECTIONS = Object\.freeze\(\{\s*\n\s*arrowleft: 'left',\s*\n\s*q: 'left',\s*\n\s*arrowright: 'right',\s*\n\s*d: 'right',/);
  // La première pression répond tout de suite. Q et ← tiennent la même
  // direction : la seconde touche ne relance ni écart immédiat, ni délai.
  assert.match(world, /const steerDirection = STEER_KEY_DIRECTIONS\[key\];/);
  assert.match(world, /if \(pressSteerKey\(key\)\) action\(steerDirection\)/);
  assert.match(world, /if \(directionHeld\) return false;/);
  assert.match(world, /steerHoldCooldown = STEER_HOLD_FIRST_DELAY;/);
  // Les écarts suivants partent de la boucle de rendu, jamais de la répétition
  // native du clavier, qui reste ignorée.
  assert.match(world, /if \(!active \|\| finished \|\| event\.repeat\) return;/);
  assert.match(world, /steerHoldCooldown = Math\.max\(0, steerHoldCooldown - dt\);\s*\n\s*if \(steerHoldDirection && steerHoldCooldown <= 0\) \{\s*\n\s*action\(steerHoldDirection\);\s*\n\s*steerHoldCooldown = STEER_HOLD_LANE_INTERVAL;/);
  // La relâche s'écoute même hors course : une touche laissée enfoncée pendant
  // la pause ne repart pas toute seule au retour en piste.
  assert.match(world, /if \(STEER_KEY_DIRECTIONS\[key\]\) \{ liftSteerKey\(key\); return; \}/);
  // Relâcher une touche rend la main à la dernière encore enfoncée : l'autre
  // flèche, ou un doublon de la même direction (Q relâché, ← toujours enfoncé).
  assert.match(world, /const liftSteerKey = \(key\) => \{\s*\n\s*if \(!steerKeysHeld\.has\(key\)\) return;/);
  assert.match(world, /steerHoldDirection = steerKeysHeld\.size \? \[\.\.\.steerKeysHeld\.values\(\)\]\.pop\(\) : null;/);
  // Fenêtre quittée, pause, nouvelle course et démontage lâchent les touches.
  assert.match(world, /releasePistolKey\(\);\s*\n\s*releaseSteerKeys\(\);\s*\n\s*\};/);
  assert.equal(world.match(/releaseSteerKeys\(\);/g)?.length, 4,
    'relâche sur le blur, au reset, à la pause et au démontage');
  // La page annonce le maintien dans les commandes et le règlement du mode.
  assert.match(page, /← → \/ Q D · VOIES \(MAINTENIR\)/);
  assert.match(page, /← → \/ Q D : VOIES \(MAINTENIR\)/);
  assert.match(page, /Maintenir ← ou → \(Q \/ D\) enchaîne les écarts tout seul/);
});

test('une voiture de police qui atterrit après un saut perd deux carrés et n’explose que vidée', () => {
  assert.match(world, /police\.jumpState = \{\s*active: true,[\s\S]*?computeCityRushJumpDistance\(takeoffSpeed\)/,
    'une patrouille déclenche le même saut que les voitures de course');
  assert.match(world, /jumping: policeAirborne/, 'la résolution de mouvement sait que la berline est en l’air');
  // L’atterrissage coûte deux carrés (le prix d’un tir bleu) au lieu de
  // détruire la berline : elle n’explose que lorsque sa barre tombe à zéro,
  // ce que fait `damagePolice` en appelant `destroyPolice` avec la même source.
  assert.match(world, /damagePolice\(police, CITY_RUSH_POLICE_RAMP_LANDING_SOURCE, null\)/,
    'le toucher du sol inflige les dégâts d’atterrissage, qui vident la barre saut après saut');
  assert.doesNotMatch(world, /destroyPolice\(police, 'ramp-landing', null\)/,
    'plus aucune destruction directe à l’atterrissage');
  assert.match(world, /audioRef\?\.current\?\.rampLand\?\.\(\{ pan: vehiclePan\(police\.id\), speed: police\.currentSpeed \}\)/,
    'chaque retombée joue son boum d’atterrissage');
  assert.match(world, /emitPoliceSkidSmoke\(police\);\s*\n\s*\}\s*\n\s*const healthBeforeLanding/,
    'la gomme de l’atterrissage est émise avant de compter les dégâts');
  assert.match(world, /type: 'police-ramp-landing'[\s\S]*?damage: healthBeforeLanding - Number\(police\.health\)/,
    'le monde raconte chaque atterrissage encaissé, avec la coque perdue');
  assert.match(world, /landingsToDestroy: cityRushPoliceShotsLeft\(police\.health, CITY_RUSH_POLICE_RAMP_LANDING_SOURCE\)/,
    'l’événement compte les atterrissages restants avant la casse');
  const policeCollision = world.match(/function checkPoliceCollisions\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(policeCollision, /police\.jumpState\?\.active/);
  assert.match(world, /trackRelativeY\(police\.distance\) \+ \(police\.currentJumpY \|\| 0\)/,
    'la position verticale suit bien la trajectoire du saut');
});

test('les tirs allument des flammes de plus en plus grandes sur les voitures de police', () => {
  const fireAnimation = world.match(/function animatePoliceDamageFire\([\s\S]*?\n}\n/)?.[0] || '';
  const policeDamage = world.match(/function damagePolice\([\s\S]*?\n  function updateVisualEffects/)?.[0] || '';
  assert.match(world, /group\.name = 'police-damage-fire'/, 'les flammes sont attachées à la voiture touchée');
  assert.match(world, /const POLICE_DAMAGE_FIRE_SPOTS = 6/,
    'la coque d’une berline peut allumer un foyer supplémentaire à chaque impact');
  assert.match(fireAnimation, /const progress = clamp\(level \* POLICE_DAMAGE_FIRE_SPOTS - index, 0, 1\)/,
    'les foyers apparaissent par étapes selon la part de coque perdue');
  assert.match(fireAnimation, /flame\.group\.visible = progress > 0\.025/);
  assert.match(fireAnimation, /flame\.group\.scale\.set\(width \* flicker, height, width \* flicker\)/,
    'les foyers déjà allumés grandissent aussi avec les dégâts');
  assert.match(policeDamage, /animatePoliceDamageFire\(police\.mesh, 1 - clamp\(police\.health \/ maxHealth, 0, 1\), clockTime\)/,
    'chaque tir actualise immédiatement les flammes à partir de la coque restante');
  assert.match(world, /animatePoliceDamageFire\(mesh, 1, clockTime\)/,
    'l’embrasement maximal reste visible pendant le tête-à-queue');
  assert.match(world, /if \(wreck\.mesh\) animatePoliceDamageFire\(wreck\.mesh, 0, clockTime\)/,
    'les flammes de dégâts passent le relais à la carcasse en feu');
  assert.match(world, /if \(isCityRushPoliceTrafficType\(spec\.id\)\) \{\s*withPoliceVisualRandom\(\(\) => attachPoliceDamageFire\(mesh, policeDamageFireKit\)\)/,
    'les voitures de police du trafic ont le même effet que l’escouade');
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

test('les étoiles suivent les tirs/destructions et l’unique mini-garage répare la coque à mi-course', () => {
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
  assert.match(world, /cityRushMiniGarageCanUse\(/);
  assert.match(world, /wantedLevel = cityRushMiniGarageWantedLevel\(previousStars\);[\s\S]*?type: 'mini-garage-used'/,
    'la sortie du mini-garage baisse le niveau selon le nombre d’étoiles et annonce son usage');
  assert.match(world, /miniGaragesRemaining: miniGarages\.filter\(\(garage\) => !garage\.used\)\.length/);
  assert.match(page, /miniGaragesRemaining:\s*CITY_RUSH_MINI_GARAGE_COUNT/);
  assert.match(page, /city-rush-gta-garages/);
  assert.match(page, /MINI-GARAGE DISPONIBLE/);
  assert.match(page, /MINI-GARAGE DANS \$\{miniGarageNextDistance\} M/,
    'le compteur annonce la distance de la prochaine porte');
  // Le passage à l'atelier est un événement du monde : la page n'en fait plus
  // un message (course muette), elle se contente de la scène — pont qui se
  // referme, poursuite qui décroche — et de la carte MINI-GARAGE du HUD.
  assert.match(world, /const healthRestored = playerHealth - healthBefore;/,
    'le monde mesure la réparation réellement rendue');
  assert.match(world, /healthRestored,\s*\n\s*pursuersReleased,/, 'le monde publie la réparation et les poursuivants lâchés');
  assert.match(world, /pursuersReleased = wantedLevel === 0\s*\n?\s*\? releasePolicePursuit\(\{ targetId: 'player' \}\)/,
    'le monde compte lui-même les poursuivants lâchés');
  assert.doesNotMatch(page, /LA POLICE ABANDONNE LA POURSUITE/,
    'plus aucun message n’annonce l’abandon de la poursuite');
  assert.match(page, /miniGaragesActive: false/, 'le compteur n’est pas disponible au départ');
  assert.match(page, /!sprintMode && hud\.miniGaragesActive && \(/,
    'le compteur des garages n’apparaît qu’avec une porte en approche');
  assert.match(page, /un seul mini-garage élargi, placé au centre de la chaussée[\s\S]*?voies 3 et 4/);
  assert.match(page, /rend aussi jusqu’à \{CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT\} carrés de vie/,
    'le bandeau annonce la réparation rendue par le portique');

  // Une seule porte, ouverte dès le départ : plus aucune n'attend le dernier
  // tour depuis le retrait de celle du dernier tour.
  assert.match(world, /const miniGarageTrackDistances = cityRushMiniGarageTrackDistances\(\{ laps: effectiveLaps \}\)/);
  assert.doesNotMatch(world, /cityRushMiniGarageKindAt|CITY_RUSH_MINI_GARAGE_FINAL_LAP_KIND/,
    'le monde ne distingue plus de porte de dernier tour');
  const availability = world.match(/function miniGarageAvailable\(garage\)[\s\S]*?\n  function miniGaragesAvailable/)?.[0] || '';
  assert.match(availability, /phase === 'playing' && !finished && !playerWrecked/);
  assert.match(availability, /return cityRushMiniGarageAvailable\(\{ sprint \}\)/,
    'la porte ne s’ouvre que hors Sprint, quel que soit le tour');
  const placement = world.match(/function placeMiniGarage\(garage\)[\s\S]*?\n  function setMiniGaragesToStart/)?.[0] || '';
  assert.match(placement, /!miniGarageAvailable\(garage\)/, 'le rendu applique la même disponibilité que le service');
  assert.match(world, /garage\.trackDistance = miniGarageTrackDistances\[index\]/,
    'la porte repart de son repère de mi-course');
  const service = world.match(/function useMiniGarage\([\s\S]*?\n  function updateMiniGarages/)?.[0] || '';
  assert.match(service, /playerHealth = cityRushMiniGarageRepair\(playerHealth, playerMaxHealth\)/,
    'la réparation utilise la résistance de la voiture sélectionnée');
  assert.match(service, /const healthRestored = playerHealth - healthBefore;[\s\S]*?healthRestored,/,
    'le service calcule une fois les points rendus, pour le bandeau et le bruitage');
  assert.match(service, /audioRef\?\.current\?\.garageRepair\?\.\(\{ pan: vehiclePan\('player'\), restored: healthRestored \}\)/,
    'la traversée joue le bruitage d’atelier, accord de réparation compris seulement si la coque a repris des points');
  assert.match(service, /const pursuersReleased = wantedLevel === 0\s*\?\s*releasePolicePursuit\(\{ targetId: 'player' \}\)\s*:\s*0/,
    'la sortie du garage ne fait abandonner la poursuite que si le niveau retombe à zéro');
  assert.match(world, /miniGaragesActive: miniGarages\.some\(\(garage\) => \{/);
  assert.match(world, /miniGarageNextDistance: nextMiniGarageGap\(\)/);
});

test('sortir d’un mini-garage fait reprendre une conduite normale aux poursuivants', () => {
  const release = world.match(/function releasePolicePursuit\([\s\S]*?\n  function updatePatrolPolice/)?.[0] || '';
  assert.ok(release, 'la remise en conduite normale existe dans le monde');
  assert.match(release, /policePursuitDropped = true/,
    'la poursuite lâchée ne se relève plus toute seule');
  assert.match(release, /policeReinforcementQueue\.length = 0/,
    'les renforts déjà prévus sont annulés');
  assert.match(release, /releaseRalliedPolice\(\{ targetId \}\)/,
    'les patrouilles rappelées retournent à leur ronde');
  assert.match(release, /abandonOncomingPoliceTurnaround\(oncoming\)/,
    'une berline à demi retournée reprend son sens');
  assert.match(world, /function releaseSquadPoliceUnit\(police\)[\s\S]*?police\.active = false/,
    'l’unité d’escouade quitte la chasse');
  assert.match(world, /function spawnPatrolPolice\(squadCar\)[\s\S]*?baseSpeed: paced\(spec\.speed \* randomRange/,
    'une voiture de patrouille ordinaire prend sa place, à l’allure du trafic');
  assert.match(world, /function updatePatrolPolice\(dt, movementById = null\)[\s\S]*?releasePatrolMesh\(patrol\.mesh\)[\s\S]*?patrolCars\.splice\(index, 1\)/,
    'une berline distancée quitte la scène');
  assert.match(world, /const squadSlots = policeDeployed && !policePursuitDropped \? CITY_RUSH_POLICE_COUNT : 0/,
    'aucune relève ne part tant que le pilote ne provoque pas de nouveau la police');
  assert.match(world, /policeDeployed = true;[\s\S]*?policePursuitDropped = false;/,
    'le déploiement scénarisé du dernier tour repart en chasse');
  assert.match(world, /policePursuitDropped = false;\n    if \(wantedLevel >= CITY_RUSH_WANTED_MAX_STARS\)/,
    'une nouvelle provocation annule l’abandon');
  assert.match(world, /patrolCars\.map\(\(patrol\) => \(\{\n          id: patrol\.id,\n          collisionGroup: 'traffic'/,
    'les berlines lâchées roulent comme du trafic, chocs compris');
  assert.match(world, /clearPatrolPolice\(\)/);
});

test('les berlines de police du trafic sont ciblables par un tir rouge', () => {
  const candidates = world.match(/function laneShotCandidates\([\s\S]*?\n  function firstEnemyOnLane/)?.[0] || '';
  const vehicleState = world.match(/function getRaceVehicleState\([\s\S]*?\n  function isVisibleInPlayerCamera/)?.[0] || '';
  const pistolHit = world.match(/function applyWeaponHit\([\s\S]*?\n  function applyStraightShotHit/)?.[0] || '';
  const policeDamage = world.match(/function damagePolice\([\s\S]*?\n  function updateVisualEffects/)?.[0] || '';
  assert.match(candidates, /trafficCars[\s\S]*?isCityRushPoliceTrafficType\(traffic\.type\)/, 'les véhicules de police civils et banalisés entrent dans les cibles IA');
  assert.match(vehicleState, /const isPolice = isCityRushPoliceTrafficType\(trafficVehicle\.type\)/, 'un véhicule policier du trafic reçoit un état avec sa santé');
  assert.match(pistolHit, /damagePolice\(target\.racer, kind, attackerId\)/);
  assert.match(pistolHit, /raiseWantedLevel\(\{ reason: 'vehicle-hit' \}\)/, 'un véhicule touché par le joueur augmente sa recherche');
  assert.match(pistolHit, /cameraKick = Math\.max\(cameraKick, kind === CITY_RUSH_POWERS\.SHOTGUN \? 0\.3 : 0\.12\)/,
    'une cartouche de pompe secoue davantage la caméra');
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
  const pistolHit = world.match(/function applyWeaponHit\([\s\S]*?\n  function applyStraightShotHit/)?.[0] || '';
  assert.ok(pistolHit, 'le gestionnaire d’impact des armes existe');
  assert.match(pistolHit, /damageRacer\(target\.racer, kind, attackerId\)/);
  assert.match(pistolHit, /damagePolice\(target\.racer, kind, attackerId\)/);
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
  assert.match(policeDamage, /if \(attackerId && attackerId !== 'player'\) \{[\s\S]*?registerPoliceRetaliation\(attackerId, source, \{/,
    'un tir réussi par un rival déclenche la représaille');
  assert.match(policeDamage, /reason: source === 'collision' \? 'police-contact' : 'police-shot'/,
    'le motif du dossier distingue le tir du carambolage');
  assert.match(retaliation, /policeCars\.find\(\(police\) => police\.reserveForId === attackerId\)/,
    'chaque rival reçoit son unité pré-réservée');
  assert.match(retaliation, /targetId: attackerId/);
  assert.match(retaliation, /type: 'police-retaliation'/);
  assert.match(retaliation, /policeRetaliationByAttacker\.set\(attackerId, reserve\)/,
    'une seule unité est attribuée par rival');
});

test('un rival qui percute la police ou mène le dernier tour est chassé lui aussi', () => {
  // Le carambolage d'un rival avec une berline de ronde : la patrouille sort de
  // sa ronde pour le chasser, et son dossier s'ouvre — trois étoiles, une unité
  // dédiée, sans toucher à la recherche du joueur.
  const trafficImpact = world.match(/function applyTrafficImpact\([\s\S]*?\n  function applyOncomingImpact/)?.[0] || '';
  assert.match(trafficImpact, /if \(racer && !traffic\.rallied && isCityRushPoliceTrafficType\(traffic\.type\)\)/,
    'le contact rival/berline de ronde est reconnu dans le choc de trafic');
  assert.match(trafficImpact, /rallyTrafficPolice\(traffic, racer\.id/,
    'la berline percutée prend le rival en chasse');
  assert.match(trafficImpact, /registerPoliceRetaliation\(racer\.id, 'collision', \{ reason: 'police-contact' \}\)/,
    'le carambolage ouvre le dossier du rival');
  // Le face-à-face : une patrouille heurtée par un rival se retourne pour lui.
  const oncoming = world.match(/function applyOncomingImpact\([\s\S]*?\n  function checkOncomingImpacts/)?.[0] || '';
  assert.match(oncoming, /const policeContact = \(actorId === 'player' \|\| Boolean\(racerActor\)\)/);
  assert.match(oncoming, /beginOncomingPoliceTurnaround\(oncoming, \{ asBackup: false, targetId: actorId \}\)/);
  assert.match(oncoming, /registerPoliceRetaliation\(racerActor\.id, 'collision', \{ reason: 'police-contact' \}\)/);
  // Le carambolage rival/berline de poursuite : même barème que celui du joueur.
  const rivalCollisions = world.match(/function checkRivalPoliceCollisions\([\s\S]*?\n  function fireAsPolice/)?.[0] || '';
  assert.ok(rivalCollisions, 'le carambolage des rivaux avec les berlines existe');
  assert.match(rivalCollisions, /cityRushPoliceCollisionHit\(\{/);
  assert.match(rivalCollisions, /damagePolice\(police, 'collision', racer\.id/);
  // Le premier du dernier tour : la règle pure décide, le monde l'applique.
  assert.match(world, /chaseLastLapLeader\(leader, playerLap\)/);
  const chase = world.match(/function chaseLastLapLeader\([\s\S]*?\n  function activatePoliceUnit/)?.[0] || '';
  assert.ok(chase, 'la règle du premier du dernier tour existe');
  assert.match(chase, /cityRushRivalLeaderWanted\(\{ leader: leaderId, lastLap: playerLap >= effectiveLaps \}\)/);
  assert.match(chase, /registerPoliceRetaliation\(leaderId, null, \{ reason: 'last-lap-leader' \}\)/);
  // Le classement publie la poursuite d'un rival, et le HUD la porte au joueur.
  assert.match(world, /pursued: racer\.id !== 'player' && cityRushRivalPursued\(racer\.wantedLevel \|\| 0\)/);
  assert.match(raceList, /racer\.pursued/);
  assert.match(raceList, /city-rush-race-list-pursued/);
  assert.match(css, /\.city-rush-race-list-copy b em\.city-rush-race-list-pursued\s*\{/);
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
  // La page l’affiche une seule fois, dans la carte VITESSE : le pourcentage
  // gagné, avec le règlement qui l’explique. Pas de message de course.
  assert.match(page, /oncomingBonusPercent/);
  assert.match(page, /city-rush-speed-bonus/);
  assert.match(page, /Rouler à contresens/);
  assert.doesNotMatch(page, /CONTRESENS ·/, 'plus aucune pastille de course ne récite le bonus');
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
  assert.match(world, /const racerCanThink = !racer\.wrecked && racer\.stunLeft <= 0 && \(racer\.spinLeft \|\| 0\) <= 0 && !racerAirborne/);
  assert.match(world, /if \(racerCanThink\) racer\.changeIn -= dt/);
  assert.match(world, /if \(racerCanThink && racer\.changeIn <= 0\)/);
  // La page le dit au joueur dans le guide des tremplins.
  assert.match(page, /en l’air, la voiture garde sa voie/);
});

test('les rivaux ne sont pas limités à une vitesse inférieure à celle du joueur', () => {
  // La pointe propre au modèle reste visible, mais la consigne de course prend
  // au moins la pointe du joueur avant d'appliquer le rythme du rival.
  assert.match(world, /baseSpeed: paced\(PLAYER_SPEED \* profile\.powerMultiplier\)/);
  assert.match(world, /cityRushRivalTargetSpeed\(playerTopSpeed, racer\.baseSpeed, \{\s*pace: racerPace,\s*storyPace: storyPaceBoost,\s*\}\)/);
  assert.match(world, /: rivalTargetTopSpeed \* \(racerSlowed \?/);
  // Le réflexe comme le choix de voie jugent la scène à la distance d'arrêt du
  // rival (voir `cityRushAiBrakingRate`) : une supercar freine plus court
  // qu'une citadine, et chaque voie est lue avec le bon modèle.
  const brakingRateWired = world.match(/brakingRate: cityRushAiBrakingRate\(racer\.profile\.accelerationRate\)/g) || [];
  assert.equal(brakingRateWired.length, 2, 'le réflexe et le choix de voie partagent le taux de freinage du modèle');
});

test('l’atterrissage d’un saut est transmis au résolveur de mouvement', () => {
  // Le résolveur ne peut pas savoir qu'une voiture vient de toucher le sol :
  // le monde le lui dit, sinon le plancher du suiveur l'y fige dans la
  // carrosserie qu'elle vient de survoler (voir `resolveCityRushCarMovement`).
  assert.match(world, /let playerLandedThisFrame = false;/);
  assert.match(world, /landing: playerLandedThisFrame/);
  assert.match(world, /racer\.landedThisFrame = false;/);
  assert.match(world, /racer\.landedThisFrame = true;/);
  assert.match(world, /landing: Boolean\(racer\.landedThisFrame\)/);
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
  assert.match(policeUpdate, /const isFireLiner = !police\.rallied && fireLiners\.get\(leader\.id\)\?\.police === police;/);
  assert.match(policeUpdate, /fireLane: isFireLiner \? leader\.lane : null/);
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
  // Le HUD annonce la mire, la page la montre — halo rouge du cadre, alimenté
  // par la progression du viseur — et se tait : le pilote voit qu'on le vise
  // sans qu'un message ne le lui raconte.
  assert.match(world, /aim: police\.aimLeft > 0 \? clamp\(police\.aimLeft \/ CITY_RUSH_POLICE_AIM_TIME, 0, 1\) : 0/);
  assert.match(world, /aimTargetId: police\.aimTargetId \|\| null/);
  assert.match(page, /const policeAim = \(Array\.isArray\(hud\.police\)/);
  assert.match(page, /policeAim > 0 && phase === 'playing' \? ' is-aimed' : ''/);
  assert.match(page, /'--cr-aim': policeAim\.toFixed\(2\)/);
  assert.doesNotMatch(page, /effect\.type === 'police-aim'/,
    'la mire ne passe plus par une fenêtre de message');
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
  // Une balle rouge n’emporte jamais qu’un carré : la règle est écrite dans le
  // monde (`damage: healthBeforeHit - police.health`), et la règle affichée au
  // garage la promet au joueur. La course, elle, ne commente plus les tirs.
  assert.match(world, /damage: healthBeforeHit - police\.health/);
  const pistolHit = world.match(/type: 'police-hit'([\s\S]*?)\n\s*\}\);/)?.[1] || '';
  assert.match(pistolHit, /health: police\.health,[\s\S]*?maxHealth: police\.maxHealth/, 'le monde publie la vie restante de la berline');
  assert.doesNotMatch(page, /−1 CARRÉ · \$\{effect\.health\}/,
    'plus aucun message ne récite le carré emporté par la balle');
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

test('le HUD tactile compacte la barre haute et réorganise le paysage mobile', () => {
  const hudCss = readFileSync(new URL('../src/games/vice-city-rush-hud.css', import.meta.url), 'utf8');
  assert.match(hudCss, /\.city-rush-shell\.is-running \.city-rush-wallet \{ display: none; \}/);
  assert.match(hudCss, /\.city-rush-shell\.is-running \.city-rush-topbar \{[^}]*height: 48px;[^}]*flex: 0 0 48px/);
  assert.match(hudCss, /\.city-rush-viewport \.city-rush-hud \.city-rush-lap-card \{[^}]*flex: 1 1 110px/);
  assert.match(hudCss, /@media \(orientation: landscape\) and \(max-height: 520px\) and \(pointer: coarse\)/);
  assert.match(hudCss, /\.city-rush-viewport \.city-rush-hud \.city-rush-speedometer \{ width: 86px; \}/);
  assert.match(hudCss, /\.city-rush-viewport \.city-rush-hud-zone\.is-mid-left,[\s\S]*?display: none;/);
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
  // Le carré perdu est mesuré dans le monde et publié avec l’impact ; la page
  // n’en fait plus un message, la coque du pilote s’allume un instant.
  assert.match(collision, /playerHealthLost,[\s\S]*?playerHealthMax: playerMaxHealth/);
  assert.doesNotMatch(page, /TA COQUE PERD \$\{effect\.playerHealthLost\}/);
});

test('le bouton de tir affiche l’arme en main et reste vide sans ramassage', () => {
  const button = page.match(/\{\(\(\) => \{\s*\/\/ Un seul bouton pour les deux armes[\s\S]*?\)\(\)\}/)?.[0] || '';
  assert.ok(button, 'le bloc du bouton de tir existe');
  // Une seule arme à la fois, lue depuis l'inventaire : rien de ramassé, rien d'affiché.
  assert.match(button, /const weapon = cityRushActiveWeapon\(hud\.inventory\)/);
  assert.match(button, /const max = weapon\?\.max \|\| CITY_RUSH_PISTOL_AMMO_PER_PICKUP/);
  assert.match(button, /disabled=\{!ready\}/, `le bouton est inerte tant qu'il n'y a rien à tirer`);
  assert.match(button, /: 'À RAMASSER'/, `vide : le bouton invite à ramasser au lieu d'annoncer un chargeur`);
  // L'étiquette suit l'arme : POMPE pour le bleu, AK-47 pour le rouge, ARME sinon.
  assert.match(button, /const label = isShotgun \? 'POMPE' : type === CITY_RUSH_POWERS\.PISTOL \? 'AK-47' : 'ARME'/);
  assert.match(button, /isShotgun \? ' is-shotgun' : ''/);
  // Réarmement du pompe : le HUD publie la cadence, le bouton se met en pause.
  assert.match(button, /const reloading = ready && Number\(hud\.weaponCooldown\) > 0/);
  assert.match(button, /reloading \? ' is-reloading' : ''/);
  assert.match(button, /RECHARGE \$\{ammo\}\/\$\{max\}/);
  // L'anneau de munitions se redessine sur la capacité de l'arme : trois
  // cartouches pour le pompe au lieu des sept balles de l'AK-47.
  assert.match(button, /Array\.from\(\{ length: max \}/);
  assert.match(button, /const span = 360 \/ max/);
  // Le même geste pour les deux armes, et un coup sec au clavier.
  assert.match(button, /actionsRef\.current\?\.\('pistol-down'\)/);
  assert.match(button, /actionsRef\.current\?\.\('pistol-tap'\)/);
  // Le guide présente les deux armes, dans l'ordre de rareté croissante.
  assert.match(page, /POWER_ORDER\.map\(\(type\) =>/);
  assert.match(page, /isShotgun \? ` · \$\{CITY_RUSH_SHOTGUN_DAMAGE\} CARRÉS PAR TIR` : ''/);
});

test('le fusil à pompe bleu reste l’arme du pilote : rivaux et police passent au travers', () => {
  const rivalPickup = world.match(/function collectRacerPickup\([\s\S]*?\n  \}/)?.[0] || '';
  const policePickup = world.match(/function collectPolicePickup\([\s\S]*?\n  \}/)?.[0] || '';
  assert.match(rivalPickup, /if \(type === CITY_RUSH_POWERS\.SHOTGUN\) return;/,
    'un rival ne ramasse jamais le pompe');
  assert.match(policePickup, /if \(type === CITY_RUSH_POWERS\.SHOTGUN\) return;/,
    'la police non plus');
  // Le ramassage du joueur passe par l'emplacement unique : l'autre arme est vidée.
  const collect = world.match(/if \(weapon\) \{[\s\S]*?\n    \} else \{/)?.[0] || '';
  assert.match(collect, /inventory = cityRushEquipWeapon\(inventory, type, pickupAmount\)/);
  assert.match(collect, /pistolHoldCooldown = 0/, `l'arme fraîche n'hérite pas du réarmement`);
  assert.match(world, /swapped: weapon && Boolean\(previousWeapon\) && previousWeapon\.type !== type/);
});
