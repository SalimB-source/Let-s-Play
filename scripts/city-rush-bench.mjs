// ════════════════════════════════════════════════════════════════════
// Banc de mesure « Vice City Rush » : la difficulté des rivaux, chiffrée.
//
// Joue des courses COMPLÈTES avec le vrai monde du jeu (WebGLRenderer
// factice, comme le smoke) et un pilote automatique de niveau choisi, puis
// résume ce que le joueur subit : victoires, avance finale sur les rivaux,
// coups encaissés (mitrailleuse / tir bleu / hélico), temps passé avec un rival
// à portée, bonus ramassés par chacun, temps perdu dans le trafic…
//
// Ce n'est PAS un test (rien ne l'échoue) : c'est l'instrument pour régler
// `CITY_RUSH_RIVAL_AI` et les trois niveaux (cityRushRules.js) sans deviner. Une course dure
// ~0,7 s ; compter 160 à 200 courses pour que les victoires soient lisibles
// (± 4 points), ou regarder « avance finale / rivaux » (mesure continue, bien
// moins bruitée).
//
//   npm run bench:city-rush -- --bot=average --races=160 --city=all
//   npm run bench:city-rush -- --bot=casual --races=40 --city=tokyo --car=turbo-gt
//   npm run bench:city-rush -- --bot=average --races=160 --city=all --ai=paceFactor=0.985
//   npm run bench:city-rush -- --bot=average --races=160 --city=all --difficulty=hard
//   npm run bench:city-rush -- --races=1 --city=vice-city --trace=14     (trace des 14 premières s)
//
// Options
//   --bot=expert|average|casual   niveau du pilote automatique (défaut expert)
//   --races=N                     nombre de courses, réparties sur villes × voitures (24)
//   --city=ID|all                 vice-city, new-york, tokyo, paris, london (défaut vice-city)
//   --car=ID|all                  vice-roadster, turbo-gt, muscle-86, night-comet (défaut all)
//   --seed=N                      graine : mêmes courses d'un essai à l'autre (1)
//   --laps=N                      nombre de tours (3 : le mode CIRCUIT, le mode classique du jeu)
//   --difficulty=easy|normal|hard niveau des rivaux (défaut normal : `CITY_RUSH_RIVAL_AI`)
//   --ai=clé=val,clé=val          surcharge le réglage du niveau choisi à la volée, ex. paceFactor=0.985
//   --car-patch='id:clé=val;…'    modifie un profil de voiture en mémoire (équilibrage)
//   --trace=S                     imprime l'état des voitures chaque seconde pendant S secondes
//   --json                        une ligne JSON par course au lieu du résumé
//
// Les pilotes diffèrent peu en niveau final : ils servent à vérifier qu'un
// réglage tient quel que soit le style de conduite, pas à simuler un humain.
// ════════════════════════════════════════════════════════════════════
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arg = (name, fallback) => {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
// --ai=paceFactor=1.002,catchUpBoost=0.05 : surcharge à la volée du réglage des rivaux
// du niveau choisi (calibrage de la difficulté sans éditer le code du jeu).
const aiOverrides = Object.fromEntries(String(arg('ai', ''))
  .split(',')
  .filter(Boolean)
  .map((pair) => {
    const [key, value] = pair.split('=');
    if (!key || !Number.isFinite(Number(value))) throw new Error(`bench: --ai invalide « ${pair} »`);
    return [key.trim(), Number(value)];
  }));
// --car-patch=turbo-gt:accelerationRate=9.8;muscle-86:hitRecoveryMultiplier=1 :
// modifie un profil de voiture en mémoire (expériences d'équilibrage).
const carPatches = Object.fromEntries(String(arg('car-patch', ''))
  .split(';')
  .filter(Boolean)
  .map((chunk) => {
    const [id, assignments] = chunk.split(':');
    return [id, Object.fromEntries(assignments.split(',').map((pair) => {
      const [key, value] = pair.split('=');
      if (!key || !Number.isFinite(Number(value))) throw new Error(`bench: --car-patch invalide « ${pair} »`);
      return [key.trim(), Number(value)];
    }))];
  }));
const difficulty = String(arg('difficulty', 'normal'));
globalThis.__BENCH_OPTIONS = {
  ai: aiOverrides,
  difficulty,
  carPatches,
  bot: arg('bot', 'expert'),
  races: Number(arg('races', 24)),
  city: arg('city', 'vice-city'),
  car: arg('car', 'all'),
  seed: Number(arg('seed', 1)),
  laps: Number(arg('laps', 3)),
  json: process.argv.includes('--json'),
  trace: Number(arg('trace', 0)),
};

const ctxStub = {
  canvas: { width: 1, height: 1 },
  getExtension: () => null,
  getParameter: () => 0,
  isContextLost: () => false,
  drawingBufferWidth: 1,
  drawingBufferHeight: 1,
};

class FakeWebGLRenderer {
  constructor(opts = {}) {
    this.domElement = {
      style: {}, width: 1280, height: 720, className: '',
      setAttribute() {}, removeAttribute() {},
      addEventListener() {}, removeEventListener() {},
      setPointerCapture() {}, remove() {},
      getContext: () => null,
    };
    this.shadowMap = { enabled: false, type: 0, autoUpdate: true };
    this.info = { render: { calls: 0, triangles: 0, frame: 0 }, memory: { geometries: 0, textures: 0 } };
    this.capabilities = {
      isWebGL2: true, precision: 'highp', maxTextures: 16,
      maxCubemapSize: 16384, maxTextureSize: 16384, maxSamples: 4,
      getMaxAnisotropy: () => 4,
    };
    this.extensions = { has: () => false, get: () => null, init: () => {} };
    this.autoClear = true;
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this.outputColorSpace = 'srgb';
    this.xr = { enabled: false };
    this._ratio = opts.pixelRatio || 1;
    this._size = { width: 1, height: 1 };
  }
  getContext() { return ctxStub; }
  setPixelRatio(r) { this._ratio = r; }
  getPixelRatio() { return this._ratio; }
  setSize(w, h) { this._size.width = w; this._size.height = h; }
  getSize(t) { t.width = this._size.width; t.height = this._size.height; return t; }
  setClearColor() {}
  clear() {}
  // Pas de GPU : la logique de course n'a pas besoin du rendu, on ne met
  // à jour que les matrices pour que `localToWorld` reste juste.
  render(scene, camera) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); }
  compile() {}
  dispose() {}
}
globalThis.__FakeWebGLRenderer = FakeWebGLRenderer;

// Accès à l'état interne du monde pour le pilote automatique et les mesures :
// injecté ici, à la volée, pour ne rien ajouter au code du jeu.
const DEBUG_HOOK = `get distance() { return distance; },
    get __debug() {
      return {
        racers, trafficCars, rows,
        get playerLane() { return playerLane; },
        get inventory() { return inventory; },
        get currentSpeed() { return currentSpeed; },
        get slowLeft() { return playerSlowLeft; },
        get stunLeft() { return playerStunLeft; },
        get boostLeft() { return playerBoostLeft; },
        get strike() { return strike; },
        get elapsed() { return elapsed; },
        get distance() { return distance; },
        get finished() { return finished; },
        get score() { return score; },
        get pickedUp() { return pickedUp; },
      };
    },`;

// Points d'injection dans le monde : tous obligatoires, sinon le banc s'arrête
// plutôt que d'imprimer des statistiques à zéro sans le dire.
const WORLD_HOOKS = [
  ['new THREE.WebGLRenderer(', 'new (globalThis.__FakeWebGLRenderer)('],
  ['function fireMachineGun(attackerId, targetId) {', 'function fireMachineGun(attackerId, targetId) {\n    globalThis.__benchFire?.(attackerId, targetId);'],
  ['function collectRacerPickup(racer, type) {', 'function collectRacerPickup(racer, type) {\n    globalThis.__benchPickup?.(racer.id, type);'],
  ['get distance() { return distance; },', DEBUG_HOOK],
];

const server = await createServer({
  root,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, fs: { allow: [root] } },
  plugins: [
    {
      name: 'bench-hooks',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('cityRushRules') && (Object.keys(aiOverrides).length || Object.keys(carPatches).length)) {
          // Les objets figés deviennent modifiables, uniquement dans le banc.
          let patched = code.replaceAll('Object.freeze(', '(');
          if (Object.keys(aiOverrides).length) patched += `\nObject.assign(cityRushRivalAI(${JSON.stringify(difficulty)}), ${JSON.stringify(aiOverrides)});\n`;
          for (const [carId, patch] of Object.entries(carPatches)) {
            patched += `\nObject.assign(CITY_RUSH_CARS.find((car) => car.id === ${JSON.stringify(carId)}), ${JSON.stringify(patch)});\n`;
          }
          return { code: patched, map: null };
        }
        if (!id.includes('ViceCityWorld')) return undefined;
        let hooked = code;
        for (const [needle, replacement] of WORLD_HOOKS) {
          if (!hooked.includes(needle)) throw new Error(`bench: point d’injection introuvable dans ViceCityWorld.jsx : ${needle}`);
          hooked = hooked.replaceAll(needle, () => replacement);
        }
        return { code: hooked, map: null };
      },
    },
  ],
});

let code = 0;
try {
  await server.ssrLoadModule('/scripts/city-rush-bench-entry.jsx');
} catch (error) {
  console.error('BENCH FAILED :');
  console.error(error);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
