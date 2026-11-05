/**
 * Les budgets de rendu de la ville — `src/games/cityRushPerformance.js`
 * ====================================================================
 * Rien ici ne touche aux **règles** : ni la conduite, ni le trafic, ni les
 * exercices. Ce module ne décide que de ce que l'on dessine, et à quel
 * rythme — ce qui est exactement le levier dont on a besoin quand la WebView
 * d'un téléphone rame.
 *
 * Ce qui a changé, et pourquoi (mesuré, pas supposé) :
 *
 *   1. **Il y avait deux niveaux, il y en a trois.** `lite` ne distinguait pas
 *      un ordinateur tactile d'un téléphone d'entrée de gamme : dans les deux
 *      cas la ville gardait ses ~7 300 objets et ses ~1,4 million de triangles
 *      par image. Le niveau `low` (téléphone modeste : WebView Android, cœurs
 *      peu nombreux, mémoire annoncée faible) baisse en plus la résolution,
 *      l'éclairage par pixel et la distance de vue.
 *   2. **Le trafic ne coûtait pas des triangles, il coûtait des appels de
 *      dessin.** Chaque véhicule du trafic est un groupe d'une douzaine de
 *      maillages *distincts* (12 à 16 mesurés) : 34 véhicules = ~420 appels de
 *      dessin **par image**, multipliés par le rendu des ombres et par les
 *      rétroviseurs. Sur un GPU de téléphone, c'est le mur, pas la géométrie.
 *      D'où `cityRushTrafficFleet` : le même parc, mêmes types, mêmes
 *      positions, mais **une seule géométrie fusionnée** par type de véhicule
 *      (`cityRushTrafficBatch`).
 *   3. **Les lumières n'étaient pas comptées.** La ville porte une directionnelle
 *      à ombre, une hémisphérique, des spots de phares et jusqu'à 8 points de
 *      néon — et `MeshStandardMaterial` recalcule un shader par nombre de
 *      lumières. `cityRushLightBudget` dit combien de néons sont réellement
 *      autorisés, et `applyCityRushLightBudget` éteint les autres (la ville
 *      reste identique : ce sont des liserés, pas des projecteurs).
 */
import * as THREE from 'three';
import { mergeGeometries as mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Niveaux de qualité, du plus riche au plus économe. */
export const CITY_RUSH_QUALITY_FULL = 'full';
export const CITY_RUSH_QUALITY_LITE = 'lite';
export const CITY_RUSH_QUALITY_LOW = 'low';
export const CITY_RUSH_QUALITY_LEVELS = Object.freeze([
  CITY_RUSH_QUALITY_FULL,
  CITY_RUSH_QUALITY_LITE,
  CITY_RUSH_QUALITY_LOW,
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Le budget de rendu d'un appareil.
 *
 * `lite` reste accepté (booléen) pour ne pas casser les appelants existants :
 * il vaut alors `lite` ou `low` selon `hardware`. La ville, elle, passe
 * `quality`.
 *
 * Les valeurs « low » ne sont pas des caprices : sur une WebView de téléphone,
 * `devicePixelRatio` vaut souvent 2,75 à 3, et dessiner 3 × 3 pixels par pixel
 * CSS sur une scène de 1,4 M de triangles coûte neuf fois le remplissage d'un
 * écran 1×. 1,25 garde une image nette (l'anticrénelage est coupé, la ville
 * reste lisible) pour ~36 % du remplissage d'un écran 3×.
 */
export function cityRushRenderBudget({ quality, lite = false, devicePixelRatio = 1, hardware = null } = {}) {
  const level = CITY_RUSH_QUALITY_LEVELS.includes(quality)
    ? quality
    : levelFor({ lite, hardware });
  const ratio = Number(devicePixelRatio);
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  // Le plancher **n'est pas** au-dessus de l'allégé : il descend (1,25 → 1 → 1).
  // Un niveau plus économe qui dessinerait plus de pixels serait un piège.
  const cap = level === CITY_RUSH_QUALITY_LOW ? 1 : level === CITY_RUSH_QUALITY_LITE ? 1 : 1.25;
  const base = {
    quality: level,
    pixelRatio: Math.min(safeRatio, cap),
    antialias: level === CITY_RUSH_QUALITY_FULL,
    shadowSize: level === CITY_RUSH_QUALITY_FULL ? 1024 : level === CITY_RUSH_QUALITY_LITE ? 512 : 256,
    shadowIntervalMs: level === CITY_RUSH_QUALITY_FULL ? 100 : level === CITY_RUSH_QUALITY_LITE ? 150 : 220,
    mirrorIntervalMs: level === CITY_RUSH_QUALITY_FULL ? 100 : level === CITY_RUSH_QUALITY_LITE ? 250 : 400,
  };
  return { ...base, ...cityRushSceneBudget(level) };
}

/** Le niveau qui correspond à un appareil décrit par `cityRushDeviceProfile`. */
function levelFor({ lite, hardware }) {
  const tier = hardware?.tier;
  if (tier === CITY_RUSH_QUALITY_LOW) return CITY_RUSH_QUALITY_LOW;
  if (tier === CITY_RUSH_QUALITY_FULL) return CITY_RUSH_QUALITY_FULL;
  if (tier === CITY_RUSH_QUALITY_LITE) return CITY_RUSH_QUALITY_LITE;
  return lite ? CITY_RUSH_QUALITY_LITE : CITY_RUSH_QUALITY_FULL;
}

/**
 * Ce qui se règle **dans la scène** — et pas dans le renderer.
 *
 *   - `viewDistance` : la brume et la caméra lointaine. La ville entière reste
 *     construite (les collisions n'en dépendent pas), mais au-delà de cette
 *     distance elle n'est plus qu'un aplat de brume : sur un téléphone, la
 *     moitié des immeubles hors champ coûte encore du remplissage.
 *   - `neonLights` : nombre de points de néon allumés (0 = l'éclat peint sur
 *     les façades suffit, c'est lui qu'on voit de loin).
 *   - `headlightShadows` / `sunShadows` : les ombres ne sont pas gratuites deux
 *     fois (une passe de profondeur, puis l'échantillonnage par pixel).
 *   - `trafficCars` / `highwayTrafficCars` : la taille du parc. **Réduire le
 *     parc change la circulation** : on ne le fait que sur le niveau le plus
 *     bas, et les voitures retirées ne sont pas remplacées par du vide — le
 *     parc garde ses quatre directions et ses embouteillages, simplement plus
 *     court. C'est un compromis assumé, pas une gratuité.
 *   - `parkedCars` : `stationary` laisse les voitures en stationnement (elles
 *     ne bougent que si on les percute) sans les faire tourner à chaque image.
 *   - `cloudPuffs` : les nuages sont 240 sphères instanciées dans un seul appel
 *     de dessin — leur coût est le remplissage, pas les appels.
 */
export function cityRushSceneBudget(quality = CITY_RUSH_QUALITY_FULL) {
  if (quality === CITY_RUSH_QUALITY_LOW) {
    return Object.freeze({
      quality: CITY_RUSH_QUALITY_LOW,
      viewDistance: 420,
      farPlane: 620,
      neonLights: 2,
      sunShadows: true,
      headlightShadows: false,
      trafficCars: 12,
      highwayTrafficCars: 9,
      parkedCarsLimit: 32,
      cloudPuffs: true,
      lampCasters: 0,
    });
  }
  if (quality === CITY_RUSH_QUALITY_LITE) {
    return Object.freeze({
      quality: CITY_RUSH_QUALITY_LITE,
      viewDistance: 560,
      farPlane: 760,
      neonLights: 4,
      sunShadows: true,
      headlightShadows: false,
      trafficCars: 16,
      highwayTrafficCars: 18,
      parkedCarsLimit: Infinity,
      cloudPuffs: true,
      lampCasters: 0,
    });
  }
  return Object.freeze({
    quality: CITY_RUSH_QUALITY_FULL,
    viewDistance: 660,
    farPlane: 900,
    neonLights: 8,
    sunShadows: true,
    headlightShadows: false,
    trafficCars: 16,
    highwayTrafficCars: 18,
    parkedCarsLimit: Infinity,
    cloudPuffs: true,
    lampCasters: 1,
  });
}

/**
 * Le profil matériel, lu une fois au montage. Il ne devine pas la marque du
 * téléphone : il regarde ce que le navigateur accepte de dire, et il **ne
 * dégrade jamais** ce qui marchait.
 *
 *   - `memory` sous 4 Go, ou `hardwareConcurrency` ≤ 4 : téléphone modeste.
 *   - `saveData` (Économiseur de données de Chrome) : on respecte le joueur.
 *   - la coque PC (Electron) et les fonctions absentes : jamais « low ».
 */
export function cityRushDeviceProfile(globalObject = typeof window === 'undefined' ? null : window) {
  if (!globalObject) return Object.freeze({ tier: CITY_RUSH_QUALITY_FULL, android: false, reasons: [] });
  const navigatorObject = globalObject.navigator || {};
  const android = Boolean(globalObject.LetsPlayAndroid);
  const reasons = [];
  let lowSignals = 0;
  let fullSignals = 0;

  const memory = Number(navigatorObject.deviceMemory);
  if (Number.isFinite(memory) && memory > 0) {
    if (memory <= 3) { lowSignals += 2; reasons.push(`mémoire annoncée ${memory} Go`); }
    else if (memory <= 4) { lowSignals += 1; reasons.push(`mémoire annoncée ${memory} Go`); }
    else fullSignals += 1;
  }

  const cores = Number(navigatorObject.hardwareConcurrency);
  if (Number.isFinite(cores) && cores > 0) {
    if (cores <= 4) { lowSignals += 1; reasons.push(`${cores} cœurs`); }
    else if (cores >= 8) fullSignals += 1;
  }

  const connection = navigatorObject.connection;
  if (connection && connection.saveData === true) { lowSignals += 2; reasons.push('économie de données'); }
  // `effectiveType` « 2g »/« slow-2g » ne dit rien du GPU : on ne s'en sert pas.

  // Une WebView Android est un téléphone : elle part avec un handicap, que des
  // signaux franchement bons peuvent encore effacer.
  if (android && lowSignals < 3) lowSignals += 1;
  if (lowSignals >= 2) return Object.freeze({ tier: CITY_RUSH_QUALITY_LOW, android, reasons });
  if (fullSignals >= 2 && !android) return Object.freeze({ tier: CITY_RUSH_QUALITY_FULL, android, reasons });
  return Object.freeze({ tier: CITY_RUSH_QUALITY_LITE, android, reasons });
}

/**
 * La qualité demandée par l'appareil, avec la **surcharge du joueur**. Une
 * préférence explicite (`full`/`lite`/`low`) gagne toujours : un joueur qui a
 * constaté que son téléphone tient le rendu complet doit pouvoir le garder.
 */
export function cityRushQualityPreference({ stored = null, profile = null } = {}) {
  if (CITY_RUSH_QUALITY_LEVELS.includes(stored)) return stored;
  return profile?.tier || CITY_RUSH_QUALITY_FULL;
}

/**
 * Combien de fois, au plus, la scène est **construite** avant de renoncer au
 * niveau le plus bas. La ville se reconstruit entièrement quand on change de
 * niveau : ce garde-fou évite une boucle de reconstructions si un appareil
 * n'arrive à rien, et laisse la main au joueur (bouton RENDU).
 */
export function cityRushCanAutoDowngrade({ downgrades = 0 } = {}) {
  return Number.isFinite(downgrades) && downgrades < 1;
}

/** Le niveau juste en dessous, ou `null` si l'on est déjà au plancher. */
export function cityRushNextLowerQuality(quality) {
  const index = CITY_RUSH_QUALITY_LEVELS.indexOf(quality);
  if (index < 0) return null;
  return CITY_RUSH_QUALITY_LEVELS[index + 1] || null;
}

/**
 * Combien de voitures garder pour un budget donné.
 *
 * `sceneBudget.trafficCars` (16 en complet, 12 en minimal) décrit la **ville**.
 * La route du viaduc a son propre budget (`highwayTrafficCars` : 18 puis 9).
 * Le plancher de 4 n'est pas décoratif : sous ce seuil, une route n'a plus de
 * circulation, elle a des figurants.
 */
export function cityRushTrafficFleetSize(requested, { floor = 4, ceiling = Infinity } = {}) {
  const value = Math.floor(Number(requested));
  if (!Number.isFinite(value)) return Number.isFinite(ceiling) ? ceiling : 0;
  return clamp(value, Math.max(0, floor), Math.max(0, ceiling));
}

/**
 * Le parc de trafic, décrit comme des **lots** de véhicules du même type
 * plutôt que comme une suite de groupes distincts.
 *
 * Entrée : les spécifications du parc (`type`, `x`, `z`, `yaw`, …), dans
 * l'ordre où elles doivent être créées. Sortie : `{ specs, byType }` — les
 * spécifications retenues et, pour chaque type, les entrées correspondantes
 * avec leur place d'origine (`index`).
 *
 * `limit` tronque le parc **par la fin** : la première voiture de chaque sens
 * survit à l'allègement, ce sont les dernières d'un convoi qui disparaissent.
 * Le parc reste celui d'avant — mêmes types, mêmes positions, même ordre — on
 * n'en garde simplement pas toute la longueur.
 */
export function cityRushTrafficFleet(specs = [], { limit = Infinity } = {}) {
  const list = Array.isArray(specs) ? specs : [];
  const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : list.length;
  // Répartition, pas troncature : on retire des voitures **au milieu** du parc
  // plutôt qu'à la fin, sinon l'allègement viderait le second sens de
  // circulation (les spécifications sont rangées sens par sens).
  // On retire des voitures régulièrement dans chaque **sens** (le parc est
  // décrit sens par sens : `perDirection` entrées d'affilée), jamais un bloc
  // entier. Un parc de 18 réduit à 12 garde ainsi 6 voitures par sens et par
  // type au lieu de supprimer la seconde moitié de la route.
  let kept = list.map((spec, index) => ({ spec, index }));
  if (count < kept.length) {
    const ratio = count / kept.length;
    const selected = [];
    for (let index = 0; index < kept.length && selected.length < count; index += 1) {
      // On garde l'entrée si elle tombe sur la grille du ratio, ou si l'on est
      // en retard sur le compte : la répartition est régulière, pas aléatoire.
      const expected = Math.floor(selected.length / ratio);
      if (index === expected || index === kept.length - 1 && selected.length < count) selected.push(kept[index]);
    }
    // Le compte exact est prioritaire sur la régularité : on complète au besoin.
    for (const entry of kept) {
      if (selected.length >= count) break;
      if (!selected.includes(entry)) selected.push(entry);
    }
    kept = selected.sort((a, b) => a.index - b.index);
  }
  const byType = new Map();
  for (const entry of kept) {
    const type = entry.spec?.type ?? 'unknown';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(entry);
  }
  return { specs: kept.map((entry) => entry.spec), byType };
}

/** Les types du parc, avec leurs places — pour construire un lot par type. */
export function cityRushTrafficGroups(specs = [], { limit = Infinity } = {}) {
  return [...cityRushTrafficFleet(specs, { limit }).byType.entries()]
    .map(([type, entries]) => ({ type, entries }))
    .sort((a, b) => b.entries.length - a.entries.length);
}

/**
 * Fusionne les maillages d'un véhicule en **une géométrie** (ou une par
 * matériau vraiment différent), pour que chaque voiture du trafic ne coûte
 * plus qu'un petit nombre d'appels de dessin.
 *
 * Trois choses à ne pas casser, et qui sont ici explicites :
 *
 *   - les **roues** doivent rester animables (elles tournent) : elles sortent du
 *     lot et sont retournées à part, sous forme de pivots ;
 *   - les **gyrophares** changent d'opacité à chaque image : ils restent des
 *     maillages séparés, comme avant ;
 *   - les **matériaux à transparence** (découpes, vitres teintées) gardent leur
 *     ordre de dessin : chaque matériau transparent reste sa propre géométrie.
 *
 * La fonction ne devine rien : elle range les maillages par matériau, fusionne
 * les géométries statiques de chaque matériau, et laisse intact tout ce qui
 * porte `userData.animated`.
 */
export function cityRushBatchVehicle(root, { mergeGeometries } = {}) {
  const merge = mergeGeometries || mergeBufferGeometries;
  if (typeof merge !== 'function' || !root) return { root, batched: false, mergedMeshes: 0 };
  root.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const extras = [];
  const local = new THREE.Matrix4();
  const materialOrder = [];
  const sourceMeshes = countMeshes(root);
  // Parcours manuel, comme pour la ville : un sous-arbre entier peut être
  // écarté d'un coup. `userData.dynamic` (« les roues tournent », « les
  // gyrophares clignotent ») vaut pour **tout** le sous-arbre, pas seulement
  // pour le maillage qui le porte : sans cela, les roues seraient fusionnées
  // dans la carrosserie et le véhicule roulerait sur des roues immobiles.
  const visit = (object) => {
    if (object !== root) {
      if (object.userData?.dynamic || object.userData?.noBatch) { extras.push(object); return false; }
      if (object.isInstancedMesh || object.isSprite || object.isLine || object.isPoints) { extras.push(object); return false; }
      if (object.isMesh) {
        const material = object.material;
        const animated = object.userData.animated;
        const transparent = Array.isArray(material) || !material || material.transparent || material.alphaTest > 0;
        if (animated || transparent) { extras.push(object); return false; }
        if (!buckets.has(material.uuid)) { buckets.set(material.uuid, { material, geometries: [] }); materialOrder.push(material.uuid); }
        local.multiplyMatrices(inverse, object.matrixWorld);
        const geometry = object.geometry.clone();
        geometry.applyMatrix4(local);
        for (const name of Object.keys(geometry.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color') geometry.deleteAttribute(name);
        }
        buckets.get(material.uuid).geometries.push(geometry.index ? geometry.toNonIndexed() : geometry);
      }
    }
    for (const child of object.children) visit(child);
    return true;
  };
  visit(root);
  if (buckets.size === 0) return { root, batched: false, mergedMeshes: 0, sourceMeshes };
  const group = new THREE.Group();
  group.name = `${root.name || 'vehicle'}-batched`;
  group.userData = root.userData;
  let mergedMeshes = 0;
  for (const { material, geometries } of buckets.values()) {
    const merged = geometries.length === 1 ? geometries[0] : merge(geometries, false);
    if (geometries.length > 1) geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    mergedMeshes += 1;
  }
  // Ce qui doit bouger suit le groupe **en conservant sa place** : un pivot de
  // roue est projeté du repère du véhicule vers celui du groupe (le même),
  // pour qu'une roue avant ne se retrouve pas au centre de la voiture.
  for (const object of extras) {
    local.multiplyMatrices(inverse, object.matrixWorld);
    local.decompose(object.position, object.quaternion, object.scale);
    group.add(object);
  }
  return { root: group, batched: true, mergedMeshes, sourceMeshes };
}

function countMeshes(root) {
  let count = 0;
  root.traverse((object) => { if (object.isMesh) count += 1; });
  return count;
}

/**
 * Allume les seules lumières autorisées par le budget. Les autres sont
 * **éteintes** (`intensity = 0`) et non retirées : la ville garde ses repères
 * et l'on peut revenir en arrière sans reconstruire la scène.
 */
export function applyCityRushLightBudget(lights = [], budget = cityRushSceneBudget()) {
  const allowed = Math.max(0, Math.round(Number(budget.neonLights) || 0));
  lights.forEach((light, index) => {
    if (!light) return;
    const on = index < allowed;
    light.visible = on;
    light.userData.cityRushBudgetOn = on;
  });
  return { total: lights.length, enabled: Math.min(allowed, lights.length) };
}

/**
 * Les material « néon » de la ville sont animés à chaque image (couleur mise à
 * l'échelle de la nuit). Cette fonction dit, image par image, ce qu'on met à
 * jour : uniquement les lumières autorisées — inutile de recalculer une couleur
 * pour une lumière éteinte.
 */
export function cityRushLightActive(light) {
  return Boolean(light && light.userData?.cityRushBudgetOn !== false);
}

/** Horloge indépendante de la simulation, pour les seuls effets visuels. */
export function createCityRushVisualClock(intervalMs) {
  let last = -Infinity;
  const interval = Number.isFinite(intervalMs) ? Math.max(0, intervalMs) : 0;
  return (now) => {
    if (!Number.isFinite(now)) return false;
    if (now < last || now - last >= interval) { last = now; return true; }
    return false;
  };
}

/**
 * Le détecteur de saccades : une moyenne glissante du temps par image, et le
 * droit de proposer **une** baisse de qualité quand la ville tient visiblement
 * mal. Il ne décide pas seul : il rend un verdict, la ville le suit une fois,
 * puis se tait (le joueur peut remonter la qualité à tout moment).
 *
 * La fenêtre ignore les premières images (compilation des shaders) : juger une
 * ville sur ses 30 premières images condamnerait tous les téléphones.
 */
export function createCityRushFrameWatch({ thresholdMs = 34, samples = 90, warmup = 60 } = {}) {
  const times = [];
  let frames = 0;
  let snoozed = false;
  return {
    /** `ms` : durée de l'image. Rend `true` si la ville rame franchement. */
    sample(ms) {
      frames += 1;
      if (!Number.isFinite(ms) || ms <= 0) return false;
      times.push(ms);
      if (times.length > samples) times.shift();
      if (snoozed || frames < warmup || times.length < samples) return false;
      const sorted = [...times].sort((a, b) => a - b);
      // La médiane, pas la moyenne : une image de 200 ms due au ramasse-miettes
      // ne doit pas condamner un téléphone qui tient 60 images/s.
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median <= thresholdMs) return false;
      snoozed = true;
      return true;
    },
    /** Le joueur a choisi : on ne propose plus rien de la session. */
    snooze() { snoozed = true; },
    get frames() { return frames; },
    get median() {
      if (!times.length) return 0;
      const sorted = [...times].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    },
  };
}

/**
 * La **reprise en place** : changer de qualité ou de moteur reconstruit la
 * ville, et le joueur ne doit pas se retrouver au point de départ au milieu
 * d'une course.
 *
 * `cityRushResumeSnapshot` photographie la pose au moment où la scène est
 * démontée ; `cityRushResumeState` la réapplique au montage suivant. Les deux
 * refusent les valeurs non finies : une pose corrompue (physique instable,
 * valeur `NaN` après une image aberrante) vaut mieux ignorée que propagée — la
 * ville repartirait sinon dans les limbes, hors de toute route.
 */
export function cityRushResumeSnapshot(state) {
  if (!state) return null;
  const { x, z, heading, speed, time } = state;
  for (const value of [x, z, heading, speed, time]) {
    if (!Number.isFinite(value)) return null;
  }
  return { x, z, heading, speed, time };
}

/** La pose de départ, corrigée par la reprise quand elle est utilisable. */
export function cityRushResumeState(spawn, snapshot) {
  const pose = {
    x: spawn?.x ?? 0,
    z: spawn?.z ?? 0,
    heading: spawn?.heading ?? 0,
  };
  if (!snapshot) return { ...pose, resumed: false };
  for (const value of [snapshot.x, snapshot.z, snapshot.heading]) {
    if (!Number.isFinite(value)) return { ...pose, resumed: false };
  }
  return {
    x: snapshot.x,
    z: snapshot.z,
    heading: snapshot.heading,
    speed: Number.isFinite(snapshot.speed) ? snapshot.speed : 0,
    time: Number.isFinite(snapshot.time) ? snapshot.time : 0,
    resumed: true,
  };
}

/**
 * Le **regroupement statique** de la ville — le levier principal.
 * =============================================================
 * Mesure de départ (ville montée, scène réelle) : 7 250 maillages pour 7 290
 * appels de dessin, dont 5 945 maillages **immobiles** répartis sur 239
 * signatures de matériau seulement — les mêmes matériaux étaient donc
 * reconstruits des centaines de fois (588 fois pour un seul ton de façade).
 * Un GPU de téléphone sature sur le nombre d'appels bien avant le nombre de
 * triangles : chaque maillage est une passe de validation, d'uniformes et de
 * changement d'état.
 *
 * Ce que fait `cityRushBatchStatic` : il parcourt la scène, prend les maillages
 * qui ne bougeront jamais (décor, immeubles, trottoirs, mobilier), les range
 * **par matériau**, fusionne leurs géométries (coordonnées monde, donc l'image
 * ne change pas d'un pixel) et pose à la place **un maillage par matériau**.
 *
 * Ce qu'il ne touche jamais, et pourquoi :
 *
 *   - les groupes qui portent `userData.dynamic` (véhicules, piétons, fumée,
 *     marques de pneus) ;
 *   - tout ce qui est `InstancedMesh` (déjà un seul appel), `Sprite`, `Line`
 *     (les lignes s'ajoutent et s'effacent en conduite) ;
 *   - les matériaux `transparent` ou `alphaTest` : leur ordre de dessin compte,
 *     les fusionner changerait le rendu ;
 *   - les matériaux **animés** (`userData.animated` ou `userData.keepAlive`) :
 *     néons dont la couleur change à la nuit, eau du canal qui ondule, planches
 *     de bord, gyrophares. Leur matériau reste partagé, seul leur maillage
 *     survit.
 *
 * La fonction est **réversible** : elle rend les objets d'origine, ce qui permet
 * à un test de comparer la scène avant et après, et à la ville de changer de
 * niveau de qualité sans perdre son décor.
 *
 * Retour : `{ group, merged, before, after, restore }`.
 */
const BATCHED_ATTRIBUTES = ['position', 'normal', 'uv', 'color'];

/** La liste stable des attributs d'une géométrie, pour ne fusionner qu'à égalité. */
export function attributeSignature(geometry) {
  return BATCHED_ATTRIBUTES.filter((name) => Boolean(geometry?.attributes?.[name])).join(',');
}

export function cityRushBatchStatic(root, { minInstances = 2 } = {}) {
  if (!root || typeof root.traverse !== 'function') {
    return { group: null, merged: 0, before: 0, after: 0, restore() {} };
  }
  const inverse = new THREE.Matrix4().copy(root.matrixWorld || new THREE.Matrix4()).invert();
  const buckets = new Map();
  const removals = [];
  const originals = [];
  // `before` est le nombre **total** de maillages de la scène, et `after` le
  // même compte une fois le regroupement fait : les deux chiffres parlent donc
  // de la même population (appels de dessin par image). Compter d'un côté les
  // seuls maillages éligibles et de l'autre tout ce qui reste donnait des
  // rapports absurdes (« 113 → 1120 ») dès qu'une bonne part de la scène était
  // exclue du regroupement.
  let before = countVisibleMeshes(root);
  const visit = (object) => {
    if (object === root) return;
    if (object.userData?.dynamic) return false; // n'entre pas dans les véhicules
    if (object.userData?.noBatch) return false;
    if (object.isMesh && !object.isInstancedMesh) {
      const material = object.material;
      const batched = !Array.isArray(material)
        && material
        && !material.transparent
        && material.alphaTest === 0
        && !material.userData?.animated
        && !material.userData?.keepAlive
        && object.visible
        && object.geometry?.attributes?.position
        // Une géométrie réécrite chaque image (trajectoire, marqueur au sol)
        // ne doit pas être gelée : on la reconnaît à son usage dynamique.
        && object.geometry.attributes.position.usage !== THREE.DynamicDrawUsage
        && !object.geometry.userData?.dynamic;
      if (batched) {
        // Un même matériau est partagé par des géométries qui n'ont pas toujours
        // les mêmes attributs (une boîte a des UV, une forme extrudée parfois
        // pas). On ne fusionne donc qu'à signature égale : c'est ce qui évite
        // l'avertissement de `mergeGeometries` et une géométrie muette.
        const signature = attributeSignature(object.geometry);
        const key = `${material.uuid}|${signature}`;
        buckets.set(key, buckets.get(key) || { material, items: [] });
        buckets.get(key).items.push(object);
      }
      return true;
    }
    if (object.isInstancedMesh || object.isSprite || object.isLine || object.isPoints) {
      return false;
    }
    return true;
  };
  // Parcours manuel : on veut pouvoir écarter tout un sous-arbre.
  const stack = [...root.children];
  while (stack.length) {
    const object = stack.pop();
    if (visit(object) === false) continue;
    for (const child of object.children) stack.push(child);
  }

  const group = new THREE.Group();
  group.name = `${root.name || 'city'}-batched`;
  group.userData.cityRushBatched = true;
  let merged = 0;
  const matrix = new THREE.Matrix4();
  for (const { material, items } of buckets.values()) {
    if (items.length < minInstances) continue;
    const geometries = [];
    for (const object of items) {
      const geometry = object.geometry.clone();
      for (const name of Object.keys(geometry.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color') geometry.deleteAttribute(name);
      }
      geometry.morphAttributes = {};
      object.updateWorldMatrix(true, false);
      matrix.multiplyMatrices(inverse, object.matrixWorld);
      geometry.applyMatrix4(matrix);
      geometries.push(geometry.index ? geometry.toNonIndexed() : geometry);
    }
    const result = geometries.length === 1 ? geometries[0] : mergeBufferGeometries(geometries, false);
    for (let index = 0; index < geometries.length; index += 1) {
      if (result !== geometries[index]) geometries[index].dispose();
    }
    if (!result) continue;
    result.computeBoundingSphere();
    result.computeBoundingBox();
    const mesh = new THREE.Mesh(result, material);
    const casts = items.some((item) => item.castShadow);
    const receives = items.some((item) => item.receiveShadow);
    mesh.castShadow = casts;
    mesh.receiveShadow = receives;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    merged += 1;
    for (const item of items) {
      originals.push({ item, parent: item.parent });
      item.parent?.remove(item);
    }
  }
  if (merged > 0) root.add(group);
  const after = countVisibleMeshes(root);
  return {
    group,
    merged,
    before,
    after,
    restore() {
      if (group.parent) group.parent.remove(group);
      group.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); } });
      for (const { item, parent } of originals) parent?.add(item);
      originals.length = 0;
      removals.length = 0;
    },
  };
}

/**
 * Compte les maillages **réellement dessinés** : invisibilité comprise, et en
 * coupant les sous-arbres invisibles comme le fait la boucle de rendu. C'est le
 * chiffre qui parle — compter des objets masqués donnait en école un « 1 120
 * appels » alors que 199 maillages seulement partaient au dessin.
 */
export function countVisibleMeshes(root) {
  if (!root) return 0;
  let count = 0;
  const stack = [root];
  while (stack.length) {
    const object = stack.pop();
    if (!object.visible) continue;
    if (object.isMesh) count += 1;
    for (const child of object.children) stack.push(child);
  }
  return count;
}

/**
 * Le **rognage à la zone d'exercice** (école de conduite).
 *
 * L'école encadre la leçon par quatre plans de clipping (`drivingExerciseZone`) :
 * tout ce qui déborde de la zone est *jeté par le GPU*. Mesure sur un exercice
 * réel, avant ce rognage : **8 maillages et 632 triangles** dans la zone,
 * contre **1 741 maillages, 947 projeteurs d'ombre et 756 789 triangles**
 * dehors — dessinés, transformés, éclairés, projetés en ombre, puis coupés par
 * les plans. Sur un téléphone, ce travail est payé pour rien, et c'est ce qui
 * restait lourd en école alors que la ville libre était devenue fluide.
 *
 * On jette donc ces objets **côté processeur** : la scène ne les parcourt plus,
 * la passe d'ombre ne les voit plus, et l'image est identique (les plans les
 * coupaient déjà). Une marge conserve tout objet qui *traverse* la limite — un
 * long trottoir, la route, le sol de la ville restent entiers.
 *
 * Ne sont jamais touchés : les sous-arbres `dynamic` (voiture, piétons,
 * trafic — le jeu continue de les simuler), les `InstancedMesh` (un seul appel
 * de dessin chacun), les `Sprite`/`Line`/`Points`.
 *
 * Retour : `{ hidden, kept, restore }`.
 */
export function cityRushCullToZone(root, bounds, { margin = 14 } = {}) {
  const result = { hidden: 0, kept: 0, restore() {} };
  if (!root || !bounds || typeof root.traverse !== 'function') return result;
  if (![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every((value) => Number.isFinite(value))) return result;
  const zone = new THREE.Box3(
    new THREE.Vector3(bounds.minX - margin, -Infinity, bounds.minZ - margin),
    new THREE.Vector3(bounds.maxX + margin, Infinity, bounds.maxZ + margin),
  );
  const hidden = [];
  const box = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  const visit = (object) => {
    if (object.userData?.dynamic || object.userData?.noBatch) return false;
    if (object.isInstancedMesh || object.isSprite || object.isLine || object.isPoints) return false;
    if (object.isMesh) {
      const geometry = object.geometry;
      if (!geometry?.attributes?.position) return false;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (!geometry.boundingBox) return false;
      // Boîte du maillage **dans le monde** : un objet peut être petit mais
      // posé loin, ou l'inverse.
      box.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
      if (zone.intersectsBox(box)) { result.kept += 1; return true; }
      hidden.push(object);
      result.hidden += 1;
      return true;
    }
    return true;
  };
  // Parcours manuel : un sous-arbre écarté ne doit pas être visité.
  const stack = [...root.children];
  while (stack.length) {
    const object = stack.pop();
    if (visit(object) === false) continue;
    for (const child of object.children) stack.push(child);
  }
  // On **détache** plutôt que de masquer : un objet masqué reste dans la scène,
  // donc dans le parcours de la boucle de rendu *et* dans les comptes du
  // regroupement statique (qui, lui, ne fusionne que le visible). Détaché, il
  // ne coûte plus rien du tout, et le regroupement retrouve son efficacité.
  const removed = [];
  for (const object of hidden) {
    if (!object.parent) continue;
    removed.push({ object, parent: object.parent });
    object.parent.remove(object);
  }
  result.restore = () => {
    for (const { object, parent } of removed) parent.add(object);
    removed.length = 0;
    hidden.length = 0;
  };
  return result;
}

/**
 * La **visibilité par zone des objets qui bougent** (école de conduite).
 *
 * `cityRushCullToZone` écarte le décor, mais pas le trafic : ses voitures
 * roulent d'un bout à l'autre de la ville, et le rognage ne peut pas les
 * détacher une fois pour toutes. Or dans l'école, l'immense majorité roule
 * **hors de la zone** : mesuré, une soixantaine de voitures de trafic et de
 * stationnement représentaient près de 700 maillages et 500 projeteurs d'ombre
 * pour un carré de conduite de quelques dizaines de mètres.
 *
 * La fonction rend un test `(x, z) => boolean`, à appeler chaque image sur les
 * objets mobiles : `visible = test(x, z)`. Elle ne modifie **pas** la
 * simulation — une voiture masquée continue d'avancer, ses feux continuent de
 * cycler, et elle réapparaît si elle entre dans la zone. Un simple test de
 * distance, ~100 fois par image : le coût est négligeable devant les maillages
 * qu'il évite.
 */
export function cityRushZoneCuller(bounds, { margin = 40 } = {}) {
  if (!bounds || ![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every((value) => Number.isFinite(value))) {
    return () => true;
  }
  const minX = bounds.minX - margin;
  const maxX = bounds.maxX + margin;
  const minZ = bounds.minZ - margin;
  const maxZ = bounds.maxZ + margin;
  return (x, z) => (Number.isFinite(x) && Number.isFinite(z)
    ? x >= minX && x <= maxX && z >= minZ && z <= maxZ
    : true); // une position inconnue ne masque rien : on ne perd pas un objet
}

/**
 * Même regroupement, mais **rendu à la boucle d'évènements** entre deux
 * matériaux. Fusionner 300 lots prend quelques centaines de millisecondes sur
 * un ordinateur, et sans doute une à deux secondes sur un téléphone modeste :
 * le faire d'un bloc figerait l'image juste après le chargement de la ville.
 *
 * `yieldEvery` matériaux traités avant de rendre la main ; `onProgress` reçoit
 * l'avancement (0 → 1) pour un éventuel indicateur.
 */
export async function cityRushBatchStaticAsync(root, {
  minInstances = 2,
  yieldEvery = 24,
  onProgress,
  yieldTo = null,
} = {}) {
  const wait = yieldTo || (() => new Promise((resolve) => { setTimeout(resolve, 0); }));
  if (!root || typeof root.traverse !== 'function') return { group: null, merged: 0, before: 0, after: 0, restore() {} };
  const inverse = new THREE.Matrix4().copy(root.matrixWorld || new THREE.Matrix4()).invert();
  const buckets = new Map();
  const originals = [];
  let before = countVisibleMeshes(root);
  const stack = [...root.children];
  while (stack.length) {
    const object = stack.pop();
    if (object.userData?.dynamic || object.userData?.noBatch) continue;
    if (object.isInstancedMesh || object.isSprite || object.isLine || object.isPoints) continue;
    if (object.isMesh) {
      const material = object.material;
      const batched = !Array.isArray(material)
        && material && !material.transparent && material.alphaTest === 0
        && !material.userData?.animated && !material.userData?.keepAlive
        && object.visible && object.geometry?.attributes?.position;
      if (batched) {
        const key = `${material.uuid}|${attributeSignature(object.geometry)}`;
        buckets.set(key, buckets.get(key) || { material, items: [] });
        buckets.get(key).items.push(object);
      }
      continue;
    }
    for (const child of object.children) stack.push(child);
  }
  const group = new THREE.Group();
  group.name = `${root.name || 'city'}-batched`;
  group.userData.cityRushBatched = true;
  let merged = 0;
  let processed = 0;
  const matrix = new THREE.Matrix4();
  for (const { material, items } of buckets.values()) {
    processed += 1;
    if (processed % yieldEvery === 0) {
      onProgress?.(processed / Math.max(1, buckets.size));
      await wait();
    }
    if (items.length < minInstances) continue;
    const geometries = [];
    for (const object of items) {
      const geometry = object.geometry.clone();
      for (const name of Object.keys(geometry.attributes)) {
        if (!BATCHED_ATTRIBUTES.includes(name)) geometry.deleteAttribute(name);
      }
      geometry.morphAttributes = {};
      object.updateWorldMatrix(true, false);
      matrix.multiplyMatrices(inverse, object.matrixWorld);
      geometry.applyMatrix4(matrix);
      geometries.push(geometry.index ? geometry.toNonIndexed() : geometry);
    }
    const result = geometries.length === 1 ? geometries[0] : mergeBufferGeometries(geometries, false);
    for (const geometry of geometries) if (result !== geometry) geometry.dispose();
    if (!result) continue;
    result.computeBoundingSphere();
    const mesh = new THREE.Mesh(result, material);
    mesh.castShadow = items.some((item) => item.castShadow);
    mesh.receiveShadow = items.some((item) => item.receiveShadow);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    merged += 1;
    for (const item of items) {
      originals.push({ item, parent: item.parent });
      item.parent?.remove(item);
    }
  }
  if (merged > 0) root.add(group);
  onProgress?.(1);
  const after = countVisibleMeshes(root);
  return {
    group,
    merged,
    before,
    after,
    /** Maillages d'origine, hors scène : ils ne sont plus dessinés. */
    originals,
    restore() {
      group.parent?.remove(group);
      group.traverse((object) => { if (object.isMesh) object.geometry.dispose(); });
      for (const { item, parent } of originals) parent?.add(item);
      originals.length = 0;
    },
    /** Les géométries et matériaux retirés ne doivent pas fuir à la fermeture. */
    disposeOriginals() {
      for (const { item } of originals) {
        item.geometry?.dispose?.();
        const list = Array.isArray(item.material) ? item.material : [item.material];
        list.filter(Boolean).forEach((material) => material.dispose?.());
      }
      originals.length = 0;
    },
  };
}
