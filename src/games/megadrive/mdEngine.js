// Moteur Mega Drive de la borne : RetroArch + cœur Genesis Plus GX compilés
// en WebAssembly, pilotés par Nostalgist.js. Le cœur est servi par le site
// (public/megadrive/core/, ~1,5 Mo compressé) : aucun CDN tiers.
//
// Nostalgist est importé à la demande : rien n'est téléchargé tant qu'on
// n'appuie pas sur « Jouer ».

const BASE = import.meta.env.BASE_URL;
const CORE_NAME = 'genesis_plus_gx';
const CORE_URL = `${BASE}megadrive/core/${CORE_NAME}_libretro`;

// Boutons Mega Drive → noms RetroPad utilisés par Genesis Plus GX
// (libretro.c : Y = A, B = B, A = C, Select = Mode).
export const MD_BUTTONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  A: 'y',
  B: 'b',
  C: 'a',
  START: 'start',
  MODE: 'select',
};

// Clavier (noms de touches RetroArch, lus via event.code : identiques en
// AZERTY et QWERTY — « w » = la touche Z d'un clavier AZERTY).
const UNUSED = ['x', 'l', 'r', 'l2', 'r2', 'l3', 'r3'];
const KEYMAP = {
  1: { up: 'up', down: 'down', left: 'left', right: 'right', y: 'x', b: 'c', a: 'v', start: 'enter', select: 'rshift' },
  2: { up: 'w', down: 's', left: 'a', right: 'd', y: 'g', b: 'h', a: 'j', start: 't', select: 'nul' },
};

function inputConfig() {
  const config = {};
  for (const [player, keys] of Object.entries(KEYMAP)) {
    for (const [button, key] of Object.entries(keys)) config[`input_player${player}_${button}`] = key;
    for (const button of UNUSED) config[`input_player${player}_${button}`] = 'nul';
  }
  return config;
}

// Raccourcis RetroArch coupés : la page gère pause / sauvegardes elle-même,
// et aucun menu RetroArch ne doit surgir en pleine partie.
const HOTKEYS_OFF = [
  'input_menu_toggle',
  'input_osk_toggle',
  'input_ai_service',
  'input_close_content',
  'input_movie_record_toggle',
  'input_recording_toggle',
  'input_streaming_toggle',
  'input_runahead_toggle',
  'input_preempt_toggle',
  'input_overlay_next',
  'input_disk_eject_toggle',
  'input_disk_next',
  'input_disk_prev',
  'input_send_debug_info',
  'input_toggle_statistics',
  'input_toggle_vrr_runloop',
  'input_play_replay',
  'input_record_replay',
  'input_halt_replay',
  'input_save_replay',
  'input_load_replay',
];

function retroarchConfig() {
  const config = {
    ...inputConfig(),
    video_font_enable: false,
    menu_enable_widgets: false,
    notification_show_autoconfig: false,
    pause_nonactive: false,
    video_smooth: false,
    savestate_thumbnail_enable: true,
  };
  for (const key of HOTKEYS_OFF) config[key] = 'nul';
  return config;
}

export function isMdRom(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.byteLength < 0x200) return false;
  const header = String.fromCharCode(...data.subarray(0x100, 0x110));
  // En-tête standard « SEGA MEGA DRIVE » / « SEGA GENESIS » ; les ROMs au
  // format .smd entrelacé ont 512 octets d'en-tête : on les accepte aussi.
  return header.includes('SEGA') || (data.byteLength % 16384 === 512);
}

export function romFingerprint(bytes) {
  // FNV-1a 32 bits + taille : identifiant stable pour les sauvegardes.
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i += 1) {
    hash ^= data[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return `md-${(hash >>> 0).toString(16).padStart(8, '0')}-${data.length.toString(16)}`;
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export class MdEngine {
  constructor({ container, onStatus }) {
    this.container = container;
    this.onStatus = onStatus || (() => {});
    this.nostalgist = null;
    this.canvas = null;
    this.running = false;
    this.paused = false;
    this.volume = 0.7;
    this.muted = false;
    this.token = 0;
    this.resizeObserver = null;
  }

  emit() {
    this.onStatus({ running: this.running, paused: this.paused });
  }

  async launch({ bytes, fileName, sram }) {
    const token = ++this.token;
    await this.stop();
    const { Nostalgist } = await import('nostalgist');
    if (token !== this.token) return false;

    // Un canvas neuf à chaque cartouche : RetroArch garde son contexte
    // WebGL et ses écouteurs, on repart donc d'une surface propre.
    const canvas = document.createElement('canvas');
    canvas.className = 'md-canvas';
    canvas.setAttribute('aria-label', `Écran Mega Drive : ${fileName}`);
    this.container.appendChild(canvas);
    this.canvas = canvas;

    const nostalgist = await Nostalgist.launch({
      element: canvas,
      core: CORE_NAME,
      rom: { fileName, fileContent: new Blob([bytes]) },
      sram: sram ? new Blob([sram]) : undefined,
      resolveCoreJs: () => `${CORE_URL}.js`,
      resolveCoreWasm: () => `${CORE_URL}.wasm`,
      retroarchConfig: retroarchConfig(),
      retroarchCoreConfig: {
        genesis_plus_gx_bram: 'per game',
        genesis_plus_gx_audio_filter: 'low-pass',
      },
      respondToGlobalEvents: true,
      style: {
        width: '100%',
        height: '100%',
        display: 'block',
        backgroundColor: '#000',
        imageRendering: 'pixelated',
      },
    });

    if (token !== this.token) {
      try { nostalgist.exit(); } catch { /* déjà arrêté */ }
      return false;
    }
    this.nostalgist = nostalgist;
    this.running = true;
    this.paused = false;
    this.applyVolume();
    this.watchSize();
    this.emit();
    return true;
  }

  watchSize() {
    this.resizeObserver?.disconnect();
    if (typeof ResizeObserver === 'undefined' || !this.canvas) return;
    this.resizeObserver = new ResizeObserver(() => {
      const nostalgist = this.nostalgist;
      const box = this.container.getBoundingClientRect();
      if (!nostalgist || !box.width || !box.height) return;
      try { nostalgist.resize({ width: Math.round(box.width), height: Math.round(box.height) }); } catch { /* pas prêt */ }
    });
    this.resizeObserver.observe(this.container);
  }

  // Le son de RetroArch passe par l'OpenAL d'Emscripten : un GainNode par
  // contexte, qu'on règle directement (et qu'on suspend en pause).
  audioContexts() {
    try {
      const AL = this.nostalgist?.getEmscriptenAL?.();
      const contexts = AL?.contexts ? Object.values(AL.contexts).filter(Boolean) : [];
      if (AL?.currentCtx && !contexts.includes(AL.currentCtx)) contexts.push(AL.currentCtx);
      return contexts;
    } catch {
      return [];
    }
  }

  applyVolume() {
    const value = this.muted ? 0 : this.volume;
    for (const ctx of this.audioContexts()) {
      try { if (ctx.gain?.gain) ctx.gain.gain.value = value; } catch { /* rien */ }
    }
  }

  resumeAudio() {
    for (const ctx of this.audioContexts()) {
      try { ctx.audioCtx?.resume?.(); } catch { /* rien */ }
    }
  }

  setVolume(volume) {
    this.volume = volume;
    this.applyVolume();
  }

  setMuted(muted) {
    this.muted = muted;
    this.applyVolume();
  }

  setPaused(paused) {
    const nostalgist = this.nostalgist;
    if (!nostalgist || !this.running || paused === this.paused) return;
    try {
      if (paused) nostalgist.pause();
      else { nostalgist.resume(); this.resumeAudio(); }
      this.paused = paused;
    } catch { /* l'émulateur s'est arrêté entre-temps */ }
    this.emit();
  }

  reset() {
    try { this.nostalgist?.restart(); } catch { /* rien */ }
  }

  press(player, button) {
    try { this.nostalgist?.pressDown({ button, player }); } catch { /* rien */ }
  }

  release(player, button) {
    try { this.nostalgist?.pressUp({ button, player }); } catch { /* rien */ }
  }

  async saveState() {
    if (!this.nostalgist) throw new Error('Aucune partie en cours');
    const { state, thumbnail } = await this.nostalgist.saveState();
    return { state, thumbnail: thumbnail ? await blobToDataUrl(thumbnail) : null };
  }

  async loadState(state) {
    if (!this.nostalgist) throw new Error('Aucune partie en cours');
    await this.nostalgist.loadState(state instanceof Blob ? state : new Blob([state]));
  }

  // SRAM de la cartouche (scores, options). Genesis Plus GX ne la remplit que
  // si le jeu en déclare une : on renvoie null si elle est vide.
  // Lecture synchrone : `saveSRAM()` de Nostalgist attend jusqu'à une minute
  // le fichier quand le jeu n'a pas de SRAM. On déclenche l'écriture (appel C
  // synchrone) puis on lit directement le système de fichiers Emscripten.
  readSram() {
    const nostalgist = this.nostalgist;
    if (!nostalgist) return null;
    try {
      const emulator = nostalgist.getEmulator();
      emulator.callCommand('_cmd_savefiles');
      const FS = nostalgist.getEmscriptenFS();
      const path = emulator.sramFilePath;
      if (!FS.analyzePath(path).exists) return null;
      const data = FS.readFile(path);
      return data?.byteLength && data.some((byte) => byte !== 0) ? new Uint8Array(data) : null;
    } catch {
      return null;
    }
  }

  async stop() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    const nostalgist = this.nostalgist;
    this.nostalgist = null;
    this.running = false;
    this.paused = false;
    if (nostalgist) {
      try { nostalgist.exit({ removeCanvas: true }); } catch { /* déjà arrêté */ }
    }
    this.canvas?.remove();
    this.canvas = null;
    this.emit();
  }

  destroy() {
    this.token += 1;
    this.stop();
  }
}
