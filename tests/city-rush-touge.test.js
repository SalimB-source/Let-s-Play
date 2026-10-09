/**
 * La峠道 (Tōge Pass) — neuvième parcours de Vice City Rush : une route de
 * montagne japonaise de nuit, à deux voies, avec beaucoup de virages serrés,
 * un freinage des voitures avant les virages et un dérapage contrôlé.
 *
 * Ce fichier vérifie, sans navigateur ni WebGL :
 *   — la course et sa route (secteurs, kilométrage, relief, signalisation) ;
 *   — le profil de tracé : vingt-quatre épingles à cheveux, refermé, lisible ;
 *   — le freinage avant virages (corner pace + anticipation) ;
 *   — le dérapage contrôlé (angle signé, seuils de vitesse) ;
 *   — la configuration des deux voies à double sens ;
 *   — le thème de nuit (lune, brume, ligne jaune centrale, phares allumés) ;
 *   — le choc frontal borné à la chaussée étroite ;
 *   — la lecture HUD (secteur, km, altitude) et la mini-carte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CITIES,
  CITY_RUSH_COURSES,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_CORNER_PACE_COURSES,
  CITY_RUSH_CORNER_PACE_MIN,
  CITY_RUSH_CORNER_PACE_PREBRAKE_METERS,
  CITY_RUSH_CORNER_PACE_SWEEP,
  CITY_RUSH_DRIFT_MAX_ANGLE,
  CITY_RUSH_DRIFT_SPEED_MIN,
  CITY_RUSH_DRIFT_YAW_START,
  CITY_RUSH_TOUGE,
  CITY_RUSH_TOUGE_COURSE,
  CITY_RUSH_TOUGE_MAX_OFFSET,
  CITY_RUSH_TOUGE_PROFILE_STEPS,
  CITY_RUSH_TOUGE_ROAD_HALF,
  CITY_RUSH_TOUGE_ROAD_WIDTH,
  CITY_RUSH_TOUGE_TURNS,
  CITY_RUSH_TRACK_PROFILE_TOUGE,
  TOUGE_CORNERS,
  TOUGE_HIGH_M,
  TOUGE_LEFT_CORNERS,
  TOUGE_LENGTH_KM,
  TOUGE_LOW_M,
  TOUGE_RELIEF_M,
  TOUGE_RIGHT_CORNERS,
  buildCityRushMinimapState,
  cityRushCornerDrift,
  cityRushCornerPace,
  cityRushDriveSide,
  cityRushLaneConfig,
  cityRushLaneX,
  cityRushOncomingImpactX,
  cityRushRouteFor,
  cityRushTrackProfile,
  cityRushUsesCornerPace,
  cityRushUsesDrift,
  clampCityRushLane,
  tougeAltitudeAt,
  tougeAt,
  tougeKmAt,
  tougeReadout,
  tougeTrackElevation,
  tougeTrackGrade,
  tougeTrackOffset,
  tougeTrackPitch,
  tougeTrackTangent,
  tougeTrackYaw,
} from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_NIGHT_LIGHT,
  CITY_RUSH_THEMES,
  cityRushLightRig,
  cityRushTheme,
  cityRushThemeDriveSide,
} from '../src/games/cityRushThemes.js';

const course = CITY_RUSH_TOUGE_COURSE;
const route = CITY_RUSH_TOUGE;
const profile = CITY_RUSH_TRACK_PROFILE_TOUGE;
const deg = (rad) => (rad * 180) / Math.PI;

test('la峠道 est le neuvième parcours : une route de montagne japonaise de nuit', () => {
  // Dernier parcours de la carrière, après le Ring — ce n'est pas une ville.
  assert.equal(CITY_RUSH_COURSES.at(-1).id, 'touge');
  assert.ok(!CITY_RUSH_CITIES.some((city) => city.id === 'touge'), 'ce n’est pas une ville');
  assert.equal(course.route, route);
  assert.equal(cityRushRouteFor('touge'), route);
  assert.equal(cityRushRouteFor(course.id), route);
  // Le Japon roule à gauche.
  assert.equal(course.driveSide, 'left');
  assert.equal(cityRushDriveSide('touge'), 'left');
  assert.equal(cityRushDriveSide(course), 'left');
  // Deux voies au total, une dans chaque sens.
  assert.equal(course.laneCount, 2);
  assert.equal(course.twoWay, true);
  // Très peu de voitures : une seule patrouille à l’aller, une seule en face
  // — une berline de police percutée quitte sa ronde pour la chasse.
  assert.deepEqual([...course.trafficTypes], ['police', 'taxi', 'white-lambo']);
  assert.equal(course.trafficCount, 1);
  assert.equal(course.oncomingCount, 1);
  // Rythme posé, freinage avant les virages, dérapage contrôlé.
  assert.ok(course.pace < 1 && course.pace > 0.5);
  assert.equal(course.cornerPrebrake, true);
  assert.equal(course.drift, true);
  assert.equal(course.style, 'touge');
  // Ambiance : la tagline annonce la nuit et la montagne.
  assert.match(course.tagline, /lune/i);
  assert.match(course.district, /峠道/);
});

test('la route couvre exactement un tour, secteur par secteur, avec sa signalisation', () => {
  assert.equal(route.id, 'touge');
  assert.equal(route.marker, '峠');
  assert.equal(route.lengthKm, TOUGE_LENGTH_KM);
  assert.equal(route.corners, TOUGE_CORNERS);
  assert.equal(route.speedLimit, 60);
  assert.equal(route.speedUnit, 'km/h');
  assert.equal(route.lanes, 2);
  // Huit secteurs contigus : le premier part de 0, le dernier se referme sur 1.
  const sectors = route.sectors;
  assert.ok(sectors.length >= 6);
  assert.equal(sectors[0].from, 0);
  for (let index = 1; index < sectors.length; index += 1) {
    assert.ok(Math.abs(sectors[index].from - sectors[index - 1].to) < 1e-9, `le secteur ${sectors[index].id} enchaîne sur le précédent`);
  }
  // Le dernier secteur se referme sur la ligne de départ (to === 0, modulo).
  assert.ok(Math.abs(sectors.at(-1).to) < 1e-9, 'le dernier secteur referme le tour sur la ligne');
  // Chaque secteur a un panneau japonais (nom + transcription) avec le marqueur 峠.
  for (const sector of sectors) {
    assert.ok(sector.sign, `${sector.id} a un panneau`);
    assert.equal(sector.sign.route, '峠');
    assert.ok(sector.sign.lines.length >= 1, `${sector.id} : lignes du panneau`);
    assert.ok(sector.name && sector.romaji, `${sector.id} : nom + romaji`);
  }
  // Les repères du décor : épingles, cèdres, torii, sommet, brume.
  assert.ok(sectors.some((sector) => sector.hairpin), 'un secteur d’épingles');
  assert.ok(sectors.some((sector) => sector.cedar), 'l’allée de cèdres');
  assert.ok(sectors.some((sector) => sector.torii), 'le torii');
  assert.ok(sectors.some((sector) => sector.summit), 'le sommet');
  assert.ok(sectors.some((sector) => sector.mist), 'la descente dans la brume');
  // Kilométrage : aller-retour du village au sommet et retour.
  assert.equal(tougeAt(0), 0);
  assert.equal(tougeAt(TOUGE_LENGTH_KM), 0, 'le tour se referme');
  assert.ok(Math.abs(tougeAt(TOUGE_LENGTH_KM / 2) - 0.5) < 1e-9);
  assert.equal(tougeKmAt(0), 0);
  assert.equal(tougeKmAt(0.5), Number((TOUGE_LENGTH_KM / 2).toFixed(1)));
  assert.equal(tougeKmAt(1), Number(TOUGE_LENGTH_KM.toFixed(1)));
});

test('le relief monte du village au col puis redescend', () => {
  assert.equal(TOUGE_RELIEF_M, TOUGE_HIGH_M - TOUGE_LOW_M);
  assert.equal(tougeAltitudeAt(0), TOUGE_LOW_M);
  assert.equal(tougeAltitudeAt(1), TOUGE_LOW_M, 'le tour revient au village');
  let peak = 0;
  for (let index = 0; index <= 200; index += 1) {
    peak = Math.max(peak, tougeAltitudeAt(index / 200));
  }
  // L'échantillonnage peut rater le sommet d'un mètre : le profil l'atteint
  // exactement au kilomètre du col (6,4 km, soit 2/3 du tour).
  assert.ok(peak >= TOUGE_HIGH_M - 1, 'le sommet est atteint');
  assert.equal(tougeAltitudeAt(6.4 / TOUGE_LENGTH_KM), TOUGE_HIGH_M, 'altitude exacte au col');
  // Le sommet est au milieu du tour, pas au départ.
  const summitAt = [...Array(1201).keys()]
    .map((index) => index / 1200)
    .find((progress) => tougeAltitudeAt(progress) === TOUGE_HIGH_M);
  assert.ok(summitAt > 0.4 && summitAt < 0.8, `le sommet est à ${(summitAt * 100).toFixed(0)} % du tour`);
});

test('le tracé enchaîne beaucoup de virages serrés, refermé et lisible', () => {
  // Vingt-quatre épingles à cheveux, douze à gauche et douze à droite.
  assert.equal(CITY_RUSH_TOUGE_TURNS.length, TOUGE_CORNERS);
  const left = CITY_RUSH_TOUGE_TURNS.filter(([, angle]) => angle < 0);
  const right = CITY_RUSH_TOUGE_TURNS.filter(([, angle]) => angle > 0);
  assert.equal(left.length, TOUGE_LEFT_CORNERS);
  assert.equal(right.length, TOUGE_RIGHT_CORNERS);
  for (const [km, angle, spanKm, shape] of CITY_RUSH_TOUGE_TURNS) {
    assert.ok(km >= 0 && km < TOUGE_LENGTH_KM, `km ${km}`);
    assert.ok(Math.abs(angle) >= 16, `angle ${angle}° : pas un zigzag`);
    assert.ok(Math.abs(angle) <= 60, `angle ${angle}° : le ruban resterait lisible`);
    assert.ok(spanKm >= 0.15, `étendue ${spanKm} km : assez longue pour la fluidité`);
    assert.ok(['snap', 'tightening', 'sustained', 'smooth'].includes(shape), `forme ${shape}`);
  }
  // Presque que des cassures et des virages qui se resserrent : une route de
  // col ne connaît presque pas de courbe rapide tenue.
  const snaps = CITY_RUSH_TOUGE_TURNS.filter(([, , , shape]) => shape === 'snap').length;
  const tightening = CITY_RUSH_TOUGE_TURNS.filter(([, , , shape]) => shape === 'tightening').length;
  assert.ok(snaps + tightening >= CITY_RUSH_TOUGE_TURNS.length * 0.8, 'au moins 80 % de virages serrés');

  // Le profil est refermé et tient dans la largeur déclarée.
  assert.equal(tougeTrackOffset(0), 0);
  assert.equal(tougeTrackTangent(0), 0);
  assert.ok(Math.abs(tougeTrackYaw(0)) < 1e-9);
  assert.equal(CITY_RUSH_TOUGE_PROFILE_STEPS, 2400);
  assert.equal(cityRushTrackProfile('touge'), profile);
  assert.equal(cityRushTrackProfile(course), profile);
  assert.equal(cityRushTrackProfile('vice-city').id, 'vice-city', 'les autres profils ne bougent pas');

  // Mesures sur le tour : déport plafonné, cap lisible, virages omniprésents.
  let maxOffset = 0;
  let maxYaw = 0;
  let turned = 0;
  let maxElevation = 0;
  let maxGrade = 0;
  const samples = 3000;
  const step = CITY_RUSH_LAP_LENGTH / samples;
  for (let index = 0; index < samples; index += 1) {
    const distance = index * step;
    maxOffset = Math.max(maxOffset, Math.abs(tougeTrackOffset(distance)));
    const yaw = Math.abs(tougeTrackYaw(distance));
    maxYaw = Math.max(maxYaw, yaw);
    if (deg(yaw) >= 14) turned += 1;
    maxElevation = Math.max(maxElevation, tougeTrackElevation(distance));
    maxGrade = Math.max(maxGrade, Math.abs(tougeTrackGrade(distance)));
  }
  assert.ok(Math.abs(maxOffset - CITY_RUSH_TOUGE_MAX_OFFSET) < 0.05, `déport max ${maxOffset.toFixed(2)}`);
  assert.ok(deg(maxYaw) >= 20 && deg(maxYaw) < 45, `cap max ${deg(maxYaw).toFixed(1)}° : le ruban reste lisible`);
  assert.ok(turned / samples >= 0.3, `le tour tourne sur ${((turned / samples) * 100).toFixed(0)} % de sa longueur`);
  // Le relief du profil de rendu suit le col (montée puis descente).
  assert.ok(maxElevation > 0.5, 'le tracé monte');
  assert.ok(maxGrade <= 0.1 + 1e-6, `pente plafonnée à 10 % (${(maxGrade * 100).toFixed(1)} %)`);
  assert.ok(Math.abs(tougeTrackElevation(CITY_RUSH_LAP_LENGTH) - tougeTrackElevation(0)) < 1e-6, 'le relief se referme');
  // Au départ le ruban est presque à plat (le village est en pente douce).
  assert.ok(Math.abs(tougeTrackPitch(0)) < 0.05, `pente de départ ${(tougeTrackPitch(0) * 100).toFixed(2)} %`);

  // Rayon du ruban : les épingles sont serrées, mais le ruban ne se replie pas
  // (le bord intérieur garde un rayon positif sur une route de 6,80 m).
  let minRadius = Infinity;
  const h = 0.5;
  for (let index = 0; index < samples; index += 1) {
    const distance = index * step;
    const o1 = tougeTrackOffset(distance - h);
    const o2 = tougeTrackOffset(distance);
    const o3 = tougeTrackOffset(distance + h);
    const d1 = (o2 - o1) / h;
    const d2 = (o3 - o2) / h;
    const dd = (d2 - d1) / h;
    const kappa = Math.abs(dd * 0.72) / Math.pow(d1 * d1 + 0.72 * 0.72, 1.5);
    if (kappa > 1e-9) minRadius = Math.min(minRadius, 1 / kappa);
  }
  assert.ok(minRadius >= 4, `rayon minimal ${minRadius.toFixed(1)} m : les épingles restent franchissables`);
});

test('les voitures freinent avant les virages, comme à Vice City', () => {
  assert.ok(CITY_RUSH_CORNER_PACE_COURSES.includes('touge'));
  assert.equal(cityRushUsesCornerPace(course), true);
  assert.equal(cityRushUsesCornerPace('touge'), true);

  // Ligne droite du départ : pleine vitesse.
  assert.equal(cityRushCornerPace(course, 0, profile), 1);
  assert.equal(cityRushCornerPace('touge', 0, profile), 1);

  // Au cœur d'une épingle, la vitesse visée tombe sous le seuil de grande courbe.
  let minPace = 1;
  for (let index = 0; index < 1200; index += 1) {
    minPace = Math.min(minPace, cityRushCornerPace(course, (index / 1200) * CITY_RUSH_LAP_LENGTH, profile));
  }
  assert.ok(minPace <= CITY_RUSH_CORNER_PACE_SWEEP, `la峠道 ralentit vraiment (${minPace.toFixed(3)})`);
  assert.ok(minPace >= CITY_RUSH_CORNER_PACE_MIN, 'sans figer la course');

  // Anticipation : la vitesse baisse 40 m avant l’entrée d’une épingle, et le
  // freinage se répète à chaque tour. (Sur un tracé aussi serré — une épingle
  // tous les ~45 m — le freinage est quasi continu : seule la ligne droite du
  // départ, où le pace vaut 1, prouve que le système ne bride pas en ligne
  // droite.)
  const hairpinKm = 1.1; // épingle à droite au milieu de la montée
  const hairpinCentre = (hairpinKm / TOUGE_LENGTH_KM) * CITY_RUSH_LAP_LENGTH;
  assert.ok(cityRushCornerPace(course, hairpinCentre - CITY_RUSH_CORNER_PACE_PREBRAKE_METERS, profile) < 1, 'le freinage commence avant l’épingle');
  assert.ok(cityRushCornerPace(course, hairpinCentre - 10, profile) < 1, 'déjà ralenti à l’entrée');
  assert.ok(cityRushCornerPace(course, hairpinCentre, profile) < 1, 'ralenti au cœur du virage');
  assert.equal(
    cityRushCornerPace(course, hairpinCentre - CITY_RUSH_CORNER_PACE_PREBRAKE_METERS, profile),
    cityRushCornerPace(course, hairpinCentre - CITY_RUSH_CORNER_PACE_PREBRAKE_METERS + CITY_RUSH_LAP_LENGTH, profile),
    'le freinage anticipé se répète au tour suivant',
  );

  // Les autres parcours gardent leur comportement.
  assert.equal(cityRushUsesCornerPace('vice-city'), true);
  assert.equal(cityRushUsesCornerPace('nordschleife'), true);
  assert.equal(cityRushUsesCornerPace('paris'), false);
  assert.equal(cityRushUsesCornerPace(null), false);
  assert.equal(cityRushCornerPace('paris', 400), 1);
  assert.equal(cityRushCornerPace(null, 400), 1);
});

test('le dérapage contrôlé tourne la caisse vers l’intérieur du virage', () => {
  assert.equal(cityRushUsesDrift(course), true);
  assert.equal(cityRushUsesDrift('touge'), true);
  // Seule la峠道 dérape.
  for (const id of ['vice-city', 'new-york', 'tokyo', 'paris', 'london', 'route-66', 'mexico-countryside', 'nordschleife']) {
    assert.equal(cityRushUsesDrift(id), false, `${id} ne dérape pas`);
  }
  assert.equal(cityRushUsesDrift(null), false);
  assert.equal(cityRushUsesDrift('inconnu'), false);
  assert.equal(cityRushCornerDrift(null, 400, null, 35), 0);
  assert.equal(cityRushCornerDrift('paris', 400, null, 35), 0);

  // Ligne droite : la caisse suit le ruban, quel que soit le rythme.
  assert.equal(cityRushCornerDrift(course, 0, profile, 35), 0);
  assert.equal(cityRushCornerDrift(course, 0, profile, 0), 0);

  // Au cœur d’une épingle à pleine vitesse : dérapage maximal, signé comme le cap.
  let maxDrift = 0;
  let driftYaw = 0;
  for (let index = 0; index < 1200; index += 1) {
    const distance = (index / 1200) * CITY_RUSH_LAP_LENGTH;
    const drift = cityRushCornerDrift(course, distance, profile, 35);
    if (Math.abs(drift) > Math.abs(maxDrift)) {
      maxDrift = drift;
      driftYaw = tougeTrackYaw(distance);
    }
  }
  assert.ok(Math.abs(maxDrift) > CITY_RUSH_DRIFT_MAX_ANGLE * 0.9, `dérapage quasi maximal (${deg(maxDrift).toFixed(1)}°)`);
  assert.ok(Math.abs(maxDrift) <= CITY_RUSH_DRIFT_MAX_ANGLE + 1e-9);
  assert.equal(Math.sign(maxDrift), Math.sign(driftYaw), 'le signe du dérapage suit le signe du virage');

  // À basse vitesse, pas de dérapage : un trafic lent ne glisse pas.
  const hairpinCentre = (1.1 / TOUGE_LENGTH_KM) * CITY_RUSH_LAP_LENGTH;
  assert.equal(cityRushCornerDrift(course, hairpinCentre, profile, 0), 0);
  assert.equal(cityRushCornerDrift(course, hairpinCentre, profile, CITY_RUSH_DRIFT_SPEED_MIN - 1), 0);
  // Le dérapage croît avec la vitesse (son signe suit le cap, d'où le abs).
  const slow = Math.abs(cityRushCornerDrift(course, hairpinCentre, profile, CITY_RUSH_DRIFT_SPEED_MIN + 2));
  const fast = Math.abs(cityRushCornerDrift(course, hairpinCentre, profile, 30));
  assert.ok(slow > 0 && slow < fast, `le dérapage croît avec la vitesse (${deg(slow).toFixed(1)}° → ${deg(fast).toFixed(1)}°)`);
  // Sous le cap de départ, même à pleine vitesse : pas de dérapage en ligne droite.
  assert.ok(CITY_RUSH_DRIFT_YAW_START > 0);
  assert.equal(cityRushCornerDrift(course, 0, profile, 35), 0);
});

test('la route n’a que deux voies, une dans chaque sens, centrées sur l’axe jaune', () => {
  const lanes = cityRushLaneConfig(course);
  assert.equal(lanes.laneCount, 2);
  assert.equal(lanes.twoWay, true);
  assert.equal(lanes.raceway, false, 'ce n’est pas un circuit à sens unique');
  assert.equal(lanes.driveSide, 'left');
  assert.equal(lanes.roadHalf, CITY_RUSH_TOUGE_ROAD_HALF);
  assert.equal(lanes.roadWidth, CITY_RUSH_TOUGE_ROAD_WIDTH);
  assert.equal(CITY_RUSH_TOUGE_ROAD_WIDTH, 6.8);
  // Conduite à gauche : la course tient la gauche de l’axe (voie 0, x = −1,05 m),
  // le contresens roule à droite (voie 1, x = +1,05 m).
  assert.deepEqual([...lanes.lanes], [0, 1]);
  assert.deepEqual([...lanes.forwardLanes], [0]);
  assert.deepEqual([...lanes.oncomingLanes], [1]);
  assert.deepEqual([...lanes.policeLanes], [0]);
  assert.deepEqual([...lanes.gridLanes], [0]);
  assert.equal(lanes.laneX(0), -1.05);
  assert.equal(lanes.laneX(1), 1.05);
  assert.equal(cityRushLaneX(0, 2), -1.05);
  assert.equal(cityRushLaneX(1, 2), 1.05);
  // Départ en file indienne : toutes les voitures sur la voie de course.
  assert.deepEqual([...lanes.defaultLanes], [0, 0, 0]);
  // Le pilote peut emprunter les deux voies (la voie de face pour doubler).
  assert.equal(clampCityRushLane(0, lanes.laneCount), 0);
  assert.equal(clampCityRushLane(1, lanes.laneCount), 1);
  assert.equal(clampCityRushLane(2, lanes.laneCount), 1, 'la voie 2 n’existe pas : ramenée à la voie 1');
  // Les autres parcours gardent leur grille à six voies.
  const city = cityRushLaneConfig(CITY_RUSH_COURSES.find((entry) => entry.id === 'vice-city'));
  assert.equal(city.laneCount, 6);
  assert.equal(city.twoWay, undefined);
  assert.deepEqual([...city.forwardLanes], [3, 4, 5]);
  const ring = cityRushLaneConfig(CITY_RUSH_COURSES.find((entry) => entry.id === 'nordschleife'));
  assert.equal(ring.laneCount, 4);
  assert.equal(ring.twoWay, undefined);
  assert.equal(ring.raceway, true);
});

test('le thème est une nuit de montagne : lune, brume, ligne jaune centrale, phares', () => {
  const theme = cityRushTheme('touge');
  assert.equal(theme, CITY_RUSH_THEMES.touge);
  assert.equal(theme.touge, true);
  assert.notEqual(theme.daylight, true, 'pas de plein jour');
  assert.equal(theme.driveSide, 'left');
  assert.equal(cityRushThemeDriveSide(theme), 'left');
  // Ciel de nuit : étoiles et lune.
  assert.ok(theme.sky.stars > 0, 'des étoiles');
  assert.equal(theme.sky.moon, 1, 'la lune');
  // Brume de col : elle avale les crêtes au-delà de 200 m.
  assert.ok(theme.fogFar < 300, `brume proche (${theme.fogFar} m)`);
  assert.ok(theme.fogNear > 0 && theme.fogFar > theme.fogNear);
  // Marquage japonais : ligne centrale jaune continue, rives blanches.
  assert.equal(theme.centerLineColor, '#f2c230');
  assert.equal(theme.laneColor, '#f4f1e8');
  assert.equal(theme.edgeColor, '#f4f1e8');
  // Largeur de la route à deux voies.
  assert.equal(theme.roadHalf, CITY_RUSH_TOUGE_ROAD_HALF);
  // Pas de boutique en montagne, mais les parrainages du portique.
  assert.equal(theme.shops, undefined);
  assert.ok(theme.sponsors.length >= 4);
  assert.ok(theme.gantryText);
  assert.ok(theme.crowdColors.length >= 4);
  assert.ok(theme.verticalSigns.length >= 3);
  assert.ok(theme.gate.style && theme.gate.text);
  // Matières du décor : roche, cèdre, vermillon du torii, neige.
  for (const key of ['rock', 'cedar', 'vermillion', 'snow', 'moss', 'lanternGlow']) {
    assert.ok(theme.materials[key] !== undefined, `matière ${key}`);
  }
  // Pas de bloc `light` : le rig de nuit par défaut s’applique, phares allumés —
  // ce sont eux qui découpent la brume dans les épingles.
  assert.equal(theme.light, undefined);
  const rig = cityRushLightRig(theme, course);
  assert.deepEqual(rig.key, CITY_RUSH_NIGHT_LIGHT.key);
  assert.equal(rig.headlamp, CITY_RUSH_NIGHT_LIGHT.headlamp);
  assert.ok(rig.headlamp > 0, 'les phares sont allumés');
  assert.equal(rig.exposure, CITY_RUSH_NIGHT_LIGHT.exposure);
  // Le thème de nuit reste cohérent avec le côté de circulation de la course.
  assert.equal(cityRushThemeDriveSide(theme), cityRushDriveSide(course));
});

test('le choc frontal d’une voiture de face reste sur la chaussée étroite', () => {
  // Conduite à gauche : le contresens roule à droite (voie 1, x = +1,05 m). Une
  // voiture heurtée est poussée vers le bord droit, sans quitter les 6,80 m.
  const start = 1.05;
  const atStart = cityRushOncomingImpactX(start, 0, 2.12, 'left', CITY_RUSH_TOUGE_ROAD_HALF);
  assert.ok(Math.abs(atStart - start) < 1e-9, 'aucun décalage au premier instant');
  const atEnd = cityRushOncomingImpactX(start, 1, 2.12, 'left', CITY_RUSH_TOUGE_ROAD_HALF);
  assert.ok(atEnd > start, 'poussée vers le bord extérieur');
  assert.ok(atEnd <= CITY_RUSH_TOUGE_ROAD_HALF, `retenue avant le bord (${atEnd.toFixed(2)} m)`);
  // Même le pare-choc reste sur les 6,80 m : c'est `roadHalf` qui borne la poussée.
  assert.ok(atEnd + 2.12 / 2 <= CITY_RUSH_TOUGE_ROAD_HALF + 1e-9, `pare-choc à ${(atEnd + 1.06).toFixed(2)} m du bord`);
  // Toute la trajectoire reste dans la chaussée.
  for (let t = 0; t <= 1; t += 0.05) {
    const x = cityRushOncomingImpactX(start, t, 2.12, 'left', CITY_RUSH_TOUGE_ROAD_HALF);
    assert.ok(x >= -CITY_RUSH_TOUGE_ROAD_HALF && x <= CITY_RUSH_TOUGE_ROAD_HALF, `t=${t.toFixed(2)} : x=${x.toFixed(2)}`);
  }
  // Sans `roadHalf`, le garde-fou historique des artères urbaines (13,40 m)
  // s’applique : le pare-choc dépasserait la route de col — le paramètre est
  // bien pris en compte.
  const wide = cityRushOncomingImpactX(start, 1, 2.12, 'left');
  assert.ok(wide + 2.12 / 2 > CITY_RUSH_TOUGE_ROAD_HALF, 'sans roadHalf, le pare-choc dépasserait la route de col');
});

test('le HUD lit la route : secteur, kilomètre, altitude, prochain repère', () => {
  const start = tougeReadout(0);
  assert.equal(start.marker, '峠');
  assert.equal(start.km, 0);
  assert.equal(start.altitudeM, TOUGE_LOW_M);
  assert.equal(start.sector.id, 'village');
  assert.equal(start.direction, 'MONTÉE');
  assert.equal(start.speedLimit, 60);
  assert.ok(start.next && start.next.aheadM > 0, 'le prochain repère est annoncé');
  assert.equal(start.next.id, 'hairpin-row');

  // Le col (760 m) est au kilomètre 6,4, soit 2/3 du tour.
  const summit = tougeReadout(6.4 / TOUGE_LENGTH_KM);
  assert.equal(summit.sector.kind, 'summit');
  assert.equal(summit.altitudeM, TOUGE_HIGH_M);
  assert.ok(summit.km > 5 && summit.km < 7, `km au sommet : ${summit.km}`);

  const end = tougeReadout(1);
  assert.equal(end.km, Number(TOUGE_LENGTH_KM.toFixed(1)));

  // Progression invalide : garde-fous.
  assert.equal(tougeReadout(Number.NaN).km, 0);
  assert.equal(tougeReadout(-1).km, 0);
});

test('la mini-carte projette le tour de la峠道 avec ses repères', () => {
  const minimap = buildCityRushMinimapState([], { cityId: 'touge' });
  assert.ok(minimap.route, 'la route est publiée');
  assert.equal(minimap.route.id, 'touge');
  assert.ok(minimap.routeTicks.length >= 6, 'un repère par secteur');
  assert.equal(minimap.routeTicks[0].id, 'village');
  for (const tick of minimap.routeTicks) {
    assert.ok(tick.name && tick.kind, `${tick.id} : nom et type`);
    assert.ok(Number.isFinite(tick.tangentX) && Number.isFinite(tick.tangentY), `${tick.id} : tangente`);
    assert.ok(tick.loopProgress >= 0 && tick.loopProgress <= 1, `${tick.id} : progression du tour`);
  }
  // Les voitures sont projetées sur le tracé (deux voies seulement).
  assert.ok(minimap.racers.length >= 1);
  for (const racer of minimap.racers) {
    assert.ok(racer.lane === 0 || racer.lane === 1, `${racer.id} : voie ${racer.lane}`);
  }
});
