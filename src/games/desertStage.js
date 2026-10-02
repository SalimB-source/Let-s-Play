import * as THREE from 'three';
import { DESERT_PERIOD, clamp01 } from './desertShared.js';
import { buildTerrainGeometry, makeDesertSky, makeTerrainMaterial } from './desertTerrain.js';
import { buildProps } from './desertProps.js';
import { makeDust, makeMirage, makeSheen } from './desertMirage.js';

/*
 * Dunes de l’Écho — le décor du stage « desert » de Mirage Rush.
 *
 * Ce que voit le joueur : une piste de dalles posée au fond d’une vallée de
 * sable, des dunes à crêtes qui montent de chaque côté, et tout au bout, sous
 * un grand soleil bas, un MIRAGE (oasis + palais) qui vacille dans la chaleur
 * et se rapproche doucement au fil de la course — sans jamais être atteint.
 *
 * Tout est procédural (aucun asset) et pensé pour rester léger sur mobile :
 *   · le sable est une grille de terrain PÉRIODIQUE en z (DESERT_PERIOD m) que
 *     l’on fait défiler comme le sol de la piste → boucle parfaite ;
 *   · les accessoires (cactus, rochers, ruines…) sont fusionnés en un seul
 *     mesh à couleurs de sommets, collé au terrain, donc défilent avec lui ;
 *   · le mirage, le ciel et le sable soulevé par le vent sont de simples
 *     shaders sur quelques quads / points.
 *
 * Organisation : `desertShared` (constantes, palette, relief), `desertTerrain` (sable + ciel),
 * `desertProps` (accessoires), `desertMirage` (mirage, voile d’eau, poussière) ; ce fichier les
 * assemble et expose l’API utilisée par MirageWorld.
 */

export {
  DESERT_CULL_Z,
  DESERT_GROUND_Y,
  DESERT_PALETTE,
  DESERT_PERIOD,
  DESERT_ROAD_EDGE,
  terrainHeight,
} from './desertShared.js';
export { makeDesertSky } from './desertTerrain.js';

const P = DESERT_PERIOD;
// 3 segments de 96 m couvrent en permanence [-96 m ; +96 m] : bien au-delà de la brume totale (≈ -73 m).
const CHUNKS = 3;

// ── Assemblage ───────────────────────────────────────────────────────────
/**
 * Construit tout le décor du désert. `update({ time, offset, progress, camera, renderer })` est
 * appelé à chaque image : `time` en ms, `offset` = distance parcourue par le sol de la piste (les
 * dunes défilent avec lui), `progress` ∈ [0, 1] = avancement de la course (le mirage se rapproche).
 *
 * `lite` / `setLite(vrai)` : la version allégée des graphismes baissés. Le décor garde sa piste, ses
 * dunes, son soleil et son mirage, mais perd ce qui coûte le plus par pixel sans rien porter du
 * jeu : nuages et vacillement du ciel, rides du sable (deux branches sur un uniforme dans les
 * shaders — aucun recalcul à la bascule), voile d’eau sur les dalles lointaines et poussière.
 */
export function makeDesertScenery({ reduceMotion = false, lite = false } = {}) {
  const group = new THREE.Group();
  group.name = 'desert-scenery';

  const sky = makeDesertSky(reduceMotion);
  group.add(sky);

  const terrainMaterial = makeTerrainMaterial();
  const terrainGeometry = buildTerrainGeometry();
  const props = buildProps();
  const solidMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const chunks = [];
  for (let k = 0; k < CHUNKS; k += 1) {
    const chunk = new THREE.Group();
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.frustumCulled = false;
    chunk.add(terrain);
    if (props.solid) {
      const solid = new THREE.Mesh(props.solid, solidMaterial);
      solid.frustumCulled = false;
      chunk.add(solid);
    }
    if (props.glow) {
      const glow = new THREE.Mesh(props.glow, glowMaterial);
      glow.frustumCulled = false;
      chunk.add(glow);
    }
    group.add(chunk);
    chunks.push(chunk);
  }

  const mirage = makeMirage(reduceMotion);
  group.add(mirage.mesh);
  const sheen = makeSheen(reduceMotion);
  group.add(sheen.mesh);
  const dust = makeDust();
  dust.points.visible = !reduceMotion;
  group.add(dust.points);

  let isLite = false;
  const setLite = (value) => {
    isLite = Boolean(value);
    const flag = isLite ? 1 : 0;
    sky.material.uniforms.uLite.value = flag;
    terrainMaterial.uniforms.uLite.value = flag;
    sheen.mesh.visible = !isLite;
    dust.points.visible = !isLite && !reduceMotion;
  };
  setLite(lite);

  const scroll = (offset) => {
    const s = ((offset % P) + P) % P;
    chunks.forEach((chunk, k) => { chunk.position.z = s + P - P * k; });
  };
  scroll(0);

  return {
    group,
    scroll,
    setLite,
    get lite() { return isLite; },
    update({ time = 0, offset = 0, progress = 0, camera, renderer } = {}) {
      const t = time * 0.001;
      const p = clamp01(progress);
      scroll(offset);
      sky.material.uniforms.uTime.value = t;
      terrainMaterial.uniforms.uTime.value = t;
      // Les runes respirent doucement.
      const pulse = 0.8 + 0.2 * Math.sin(t * 1.6);
      glowMaterial.color.setScalar(reduceMotion ? 0.9 : pulse);
      // Le mirage se rapproche au fil de la course (sans jamais être atteint) et s’éclaircit.
      mirage.mesh.scale.setScalar(THREE.MathUtils.lerp(0.86, 1.14, p));
      mirage.material.uniforms.uTime.value = t;
      mirage.material.uniforms.uAmount.value = 0.8 + 0.2 * p;
      sheen.material.uniforms.uTime.value = t;
      sheen.material.uniforms.uAmount.value = 0.75 + 0.25 * p;
      dust.material.uniforms.uTime.value = t;
      dust.material.uniforms.uScroll.value = offset;
      if (camera && renderer) {
        dust.material.uniforms.uPx.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      }
    },
    dispose() {
      terrainGeometry.dispose();
      terrainMaterial.dispose();
      props.solid?.dispose();
      props.glow?.dispose();
      solidMaterial.dispose();
      glowMaterial.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
      mirage.mesh.geometry.dispose();
      mirage.material.dispose();
      mirage.texture.dispose();
      sheen.mesh.geometry.dispose();
      sheen.material.dispose();
      dust.geometry.dispose();
      dust.material.dispose();
    },
  };
}

