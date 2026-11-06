/**
 * Réglages « carte graphique » de la coque PC — desktop/gpu.js
 * ------------------------------------------------------------
 * Le Sablier de Bab El est rendu en **WebGL** (Three.js : `rpgTableScene.js`,
 * `rpgStoryTowerScene.js`, `RpgTableScene3D.jsx`). Sous Chromium, WebGL n'est
 * jamais parlé directement au pilote : il est traduit par **ANGLE** vers
 * l'API native du système — Direct3D 11 sous Windows, OpenGL/Vulkan ailleurs.
 * C'est cette traduction qui décide si le jeu tourne sur le GPU ou retombe sur
 * un rendu logiciel (SwiftShader) exécuté par le CPU.
 *
 * Sur un PC, trois situations font basculer un jeu WebGL dans le logiciel :
 *
 *   1. **Le pilote est sur la liste noire de Chromium** (`gpu-blocklist`) :
 *      vieux pilotes Intel/NVIDIA/AMD, pilotes de machine virtuelle. Chromium
 *      désactive alors l'accélération matérielle « par précaution », même si la
 *      carte fonctionne parfaitement. → `ignore-gpu-blocklist`.
 *   2. **Le PC portable à deux GPU** (Intel/AMD intégré + NVIDIA/AMD dédié) :
 *      sans déclaration explicite, Windows peut exécuter le processus sur la
 *      puce intégrée. L'application demande le GPU haute performance à Chromium
 *      (`force_high_performance_gpu`) ; le réglage Windows ou le panneau du
 *      constructeur reste toutefois souverain. Le panneau de diagnostic de
 *      l'app (`app.getGPUInfo`) affiche le nom du GPU réellement utilisé :
 *      c'est la seule vérité à regarder.
 *   3. **Un `--disable-gpu` hérité** ou une session sans GPU (RDP, VM) :
 *      Chromium bascule sur SwiftShader et le jeu tourne à 5 images/seconde.
 *
 * Ce module ne contient **ni Electron ni DOM** : il calcule la liste des
 * commutateurs à poser avant `app.whenReady()` (ils n'ont aucun effet après),
 * et met en forme l'état du GPU pour le panneau de diagnostic. Être pur permet
 * de le tester dans `scripts/desktop-check.mjs` sans lancer Electron.
 */

/** Backend ANGLE par plateforme. `d3d11` est le chemin recommandé sous
 * Windows (le plus testé par Chromium) ; ailleurs on laisse ANGLE choisir. */
const ANGLE_PAR_DEFAUT = Object.freeze({
  win32: 'd3d11',
  darwin: 'metal',
  linux: '',
});

/** Commutateurs acceptés par `--use-angle`. Utile au diagnostic : `gl` force
 * l'OpenGL natif (pilotes Linux récalcitrants), `swiftshader` force le rendu
 * logiciel pour comparer les images/seconde et prouver que le GPU travaillait. */
export const ANGLE_BACKENDS = Object.freeze(['d3d11', 'd3d9', 'gl', 'gles', 'vulkan', 'swiftshader', '']);

/**
 * Commutateurs de ligne de commande à passer à Chromium.
 *
 * @param {object} options
 * @param {string} options.platform  `process.platform` (`win32`, `darwin`, `linux`).
 * @param {object} [options.env]     Environnement pour les dérogations de test.
 * @returns {Array<[string, string]>} paires `[nom, valeur]` pour
 *   `app.commandLine.appendSwitch(nom, valeur)`.
 *
 * Dérogations (variables d'environnement, jamais nécessaires en jeu normal) :
 *   - `LETSPLAY_ANGLE=d3d11|gl|vulkan|swiftshader|…` : impose le backend ANGLE ;
 *   - `LETSPLAY_SOFTWARE_GL=1` : force le rendu logiciel (comparaison, ou PC
 *     dont le pilote plante) — l'inverse de ce que veut le joueur ;
 *   - `LETSPLAY_EXTRA_GPU_SWITCHES="nom=valeur,nom2"` : commutateurs libres.
 */
export function gpuSwitches({ platform = 'linux', env = {} } = {}) {
  const switches = [];

  // Rendu logiciel demandé explicitement : aucun autre réglage n'a de sens.
  // Sert à comparer les images/seconde, ou à dépanner un PC dont le pilote
  // plante (le jeu reste jouable, lentement, au lieu d'avoir une table vide).
  if (env.LETSPLAY_SOFTWARE_GL === '1') {
    switches.push(['use-angle', 'swiftshader']);
    switches.push(['enable-unsafe-swiftshader', '']);
    return switches.concat(extraSwitches(env));
  }

  // 1. Ne pas laisser la liste noire de Chromium désactiver la carte : c'est la
  //    première cause d'un jeu WebGL lent sur un PC qui a pourtant un GPU.
  switches.push(['ignore-gpu-blocklist', 'true']);

  // 2. Rasterisation et ressources sur le GPU plutôt que sur le CPU.
  switches.push(['enable-gpu-rasterization', 'true']);
  switches.push(['enable-zero-copy', 'true']);
  switches.push(['enable-native-gpu-memory-buffers', 'true']);

  // Windows peut choisir le GPU basse consommation d'un portable hybride.
  // Demander explicitement le GPU haute performance à Chromium avant la
  // création du processus GPU. C'est une préférence : si le pilote ou le
  // réglage Graphiques de Windows l'emporte, le diagnostic indiquera le GPU
  // réellement actif et l'utilisateur pourra choisir l'exe dans Windows.
  if (platform === 'win32') switches.push(['force_high_performance_gpu', '']);

  // 3. Backend ANGLE : D3D11 sous Windows (chemin nominal de WebGL2), Metal sur
  //    macOS, choix d'ANGLE ailleurs. Dérogation possible pour le diagnostic.
  const angle = typeof env.LETSPLAY_ANGLE === 'string' && env.LETSPLAY_ANGLE.trim()
    ? env.LETSPLAY_ANGLE.trim()
    : ANGLE_PAR_DEFAUT[platform] || '';
  if (angle) switches.push(['use-angle', angle]);

  // 4. **WebGPU** — l'essai de la conduite libre. La ville ne s'en sert que si
  //    le joueur le demande, et seulement sur une machine qui a répondu ; mais
  //    le backend doit être autorisé à s'ouvrir, sinon `requestAdapter()` rend
  //    toujours null et le bouton annonce « STANDARD · REPLI » à tort.
  //
  //    `enable-unsafe-webgpu` lève la liste noire WebGPU de Chromium — la même
  //    logique que `ignore-gpu-blocklist` côté WebGL : un pilote un peu ancien
  //    mais fonctionnel n'est plus refusé par précaution.
  //
  //    On ne force **pas** de backend ici : sous Windows, Chromium choisit seul
  //    D3D12 ou Vulkan selon le pilote, et `use-angle` ne concerne que le WebGL
  //    (deux couches distinctes). Sur un PC sans carte WebGPU, ce commutateur
  //    est sans effet : le jeu continue en WebGL.
  switches.push(['enable-unsafe-webgpu', '']);

  // 5. Repli logiciel **autorisé mais signalé** : si la carte est absente ou son
  //    pilote refusé, SwiftShader prend le relais et le duel reste jouable au
  //    lieu d'afficher une table 3D vide. Le panneau de diagnostic nomme ce
  //    repli, donc un joueur lent sait immédiatement qu'il n'est pas sur le GPU.
  //    (Commutateur de présence : pas de valeur.)
  switches.push(['enable-unsafe-swiftshader', '']);

  return switches.concat(extraSwitches(env));
}

/** Commutateurs libres ajoutés par l'environnement (`nom=valeur,nom2=`). */
function extraSwitches(env) {
  const brut = env.LETSPLAY_EXTRA_GPU_SWITCHES;
  if (typeof brut !== 'string' || !brut.trim()) return [];
  return brut.split(',')
    .map((paire) => paire.trim())
    .filter(Boolean)
    .map((paire) => {
      const separateur = paire.indexOf('=');
      if (separateur === -1) return [paire, 'true'];
      return [paire.slice(0, separateur).trim(), paire.slice(separateur + 1).trim()];
    });
}

/**
 * Lecture humaine de `app.getGPUFeatureStatus()` : ce que Chromium a really
 * activé. Toute valeur autre que `enabled…` ou `hardware` sur `webgl`, `webgl2`
 * et `compositing` signifie que le jeu n'utilise pas la carte graphique.
 *
 * @param {Record<string, string>} statut paires fonction → état.
 * @returns {{ok: boolean, lignes: Array<{fonction: string, etat: string, critique: boolean}>}}
 */
export function interpreterEtatGpu(statut = {}) {
  // `compositing` est le nom réel de la clé dans `getGPUFeatureStatus()`
  // (pas « gpu_compositing »). Sous Windows, `opengl` reste souvent
  // « disabled » : c'est normal, ANGLE parle à Direct3D — ce n'est donc PAS
  // une fonction critique ici.
  const CRITIQUES = ['webgl', 'webgl2', 'compositing'];
  const lignes = Object.entries(statut).map(([fonction, etat]) => ({
    fonction,
    etat,
    critique: CRITIQUES.includes(fonction),
  }));
  const ok = lignes
    .filter((ligne) => ligne.critique)
    .every((ligne) => /enabled|hardware/i.test(ligne.etat));
  return { ok, lignes };
}

/**
 * Devine, d'après la chaîne de renderer renvoyée par `app.getGPUInfo('basic')`,
 * si le jeu tourne sur une vraie carte ou sur le rendu logiciel.
 *
 * @param {string} renderer chaîne `GL_RENDERER` / `gl_RENDERER` (ex. « ANGLE
 *   (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11) »).
 * @returns {{carte: boolean, nom: string, raison: string}}
 */
export function qualifierRenderer(renderer = '') {
  const texte = String(renderer || '').trim();
  if (!texte) {
    return { carte: false, nom: '(inconnu)', raison: 'Chromium n’a pas renvoyé de renderer.' };
  }
  if (/swiftshader|software rasterizer|llvmpipe|basic render driver|mesa offscreen/i.test(texte)) {
    return {
      carte: false,
      nom: texte,
      raison: 'Rendu logiciel : le CPU dessine les images, la carte graphique n’est pas utilisée.',
    };
  }
  const marque = texte.match(/nvidia|amd|radeon|intel|apple|adreno|qualcomm|arc|geforce|quadro/i);
  return {
    carte: true,
    nom: texte,
    raison: marque
      ? `Accélération matérielle active (${marque[0]}).`
      : 'Accélération matérielle active.',
  };
}

/** Texte affiché en tête du panneau de diagnostic. */
export const DIAGNOSTIC_INTRO = [
  'Vice City Rush et Le Sablier dessinent leur 3D en WebGL, traduit par ANGLE',
  'vers l’API graphique du système. Sur Windows, l’application demande le GPU',
  'haute performance. Si le renderer ci-dessous nomme votre carte (NVIDIA /',
  'AMD / Intel Arc…), le GPU travaille. S’il indique SwiftShader ou',
  '« Microsoft Basic Render Driver », le jeu tourne sur le CPU : mettez à jour',
  'le pilote graphique, ou choisissez l’exe dans Windows → Système → Écran →',
  'Graphiques → « Processeur graphique haute performance ».',
].join(' ');
