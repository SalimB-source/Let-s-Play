// Moteur de l'émulateur NES de Let's Play.
//
// jsnes fournit le cœur (CPU 6502, PPU, APU, mappers). Ce module s'occupe de
// tout ce qui relie ce cœur au navigateur :
//   - rendu 256×240 dans un <canvas> ;
//   - son via un AudioWorklet, avec un AudioContext créé AVANT le cœur pour que
//     le taux d'échantillonnage de l'APU corresponde exactement à celui de la
//     carte son (sinon le jeu accélère ou le son grésille) ;
//   - cadence à 60,0988 images/s (NTSC) pilotée par requestAnimationFrame,
//     indépendante de la fréquence de l'écran (60, 120, 144 Hz…) ;
//   - entrées clavier, manettes (Gamepad API) et boutons tactiles, fusionnées
//     sans qu'une source ne relâche un bouton tenu par une autre ;
//   - sauvegardes : états instantanés et SRAM des cartouches à pile.
//
// Aucun fichier ne quitte le navigateur : la ROM est lue localement.

import { NES, Controller } from 'jsnes';

export const SCREEN_WIDTH = 256;
export const SCREEN_HEIGHT = 240;
const NTSC_FPS = 60.0988;
const FRAME_MS = 1000 / NTSC_FPS;
const MAX_FRAMES_PER_TICK = 4;
const SRAM_START = 0x6000;
const SRAM_SIZE = 0x2000;

export const BUTTONS = {
  A: Controller.BUTTON_A,
  B: Controller.BUTTON_B,
  SELECT: Controller.BUTTON_SELECT,
  START: Controller.BUTTON_START,
  UP: Controller.BUTTON_UP,
  DOWN: Controller.BUTTON_DOWN,
  LEFT: Controller.BUTTON_LEFT,
  RIGHT: Controller.BUTTON_RIGHT,
};

// Clavier : `event.code` désigne la position physique de la touche. X, C, J
// et K sont au même endroit en AZERTY et en QWERTY — pas de surprise pour un
// clavier français. B à gauche, A à droite, comme sur la manette d'origine.
export const KEYBOARD_MAP = {
  ArrowUp: BUTTONS.UP,
  ArrowDown: BUTTONS.DOWN,
  ArrowLeft: BUTTONS.LEFT,
  ArrowRight: BUTTONS.RIGHT,
  KeyX: BUTTONS.B,
  KeyJ: BUTTONS.B,
  KeyC: BUTTONS.A,
  KeyK: BUTTONS.A,
  Enter: BUTTONS.START,
  NumpadEnter: BUTTONS.START,
  ShiftLeft: BUTTONS.SELECT,
  ShiftRight: BUTTONS.SELECT,
  Backspace: BUTTONS.SELECT,
};

// Manette au « standard mapping » (Xbox, PlayStation, Switch Pro, 8BitDo…).
// Bouton du bas → B, bouton de droite → A (disposition Nintendo).
const GAMEPAD_BUTTONS = [
  [0, BUTTONS.B],
  [2, BUTTONS.B],
  [1, BUTTONS.A],
  [3, BUTTONS.A],
  [8, BUTTONS.SELECT],
  [9, BUTTONS.START],
  [12, BUTTONS.UP],
  [13, BUTTONS.DOWN],
  [14, BUTTONS.LEFT],
  [15, BUTTONS.RIGHT],
];
const AXIS_THRESHOLD = 0.5;

// Processeur audio : tampon circulaire stéréo alimenté par le fil principal.
// Chaîne inline chargée par Blob URL (aucune config Vite nécessaire).
const WORKLET_SOURCE = `
class LetsPlayNesAudio extends AudioWorkletProcessor {
  constructor() {
    super();
    this.capacity = 16384;
    this.maxQueued = 4096; // ~85 ms à 48 kHz : latence faible, pas de dérive
    this.left = new Float32Array(this.capacity);
    this.right = new Float32Array(this.capacity);
    this.read = 0;
    this.write = 0;
    this.count = 0;
    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'clear') { this.read = this.write = this.count = 0; return; }
      if (data.type !== 'samples') return;
      const l = data.left, r = data.right, n = l.length;
      for (let i = 0; i < n; i++) {
        this.left[this.write] = l[i];
        this.right[this.write] = r[i];
        this.write = (this.write + 1) % this.capacity;
      }
      this.count += n;
      if (this.count > this.maxQueued) {
        const drop = this.count - this.maxQueued;
        this.read = (this.read + drop) % this.capacity;
        this.count -= drop;
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length < 2) return true;
    const outL = out[0], outR = out[1], size = outL.length;
    const available = Math.min(this.count, size);
    for (let i = 0; i < available; i++) {
      outL[i] = this.left[this.read];
      outR[i] = this.right[this.read];
      this.read = (this.read + 1) % this.capacity;
    }
    for (let i = available; i < size; i++) { outL[i] = 0; outR[i] = 0; }
    this.count -= available;
    return true;
  }
}
registerProcessor('lets-play-nes-audio', LetsPlayNesAudio);
`;

const INES_MAGIC = [0x4e, 0x45, 0x53, 0x1a]; // "NES\x1A"

export function isNesRom(bytes) {
  return bytes && bytes.length > 16 && INES_MAGIC.every((value, i) => bytes[i] === value);
}

// Empreinte FNV-1a 32 bits + taille : identifie une ROM pour ses sauvegardes,
// sans dépendre de crypto.subtle (indisponible hors HTTPS).
export function romFingerprint(bytes) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}-${bytes.length.toString(16)}`;
}

export function describeRomError(error) {
  const message = String(error?.message || error || '');
  const mapper = message.match(/Unsupported mapper:\s*(\d+)/i);
  if (mapper) {
    return `Cette cartouche utilise le mapper ${mapper[1]}, pas encore pris en charge par l’émulateur. La plupart des classiques (mappers 0 à 4, 7, 9, 11, 66…) fonctionnent.`;
  }
  if (/not a valid nes rom|invalid|header/i.test(message)) {
    return 'Ce fichier n’est pas une ROM NES valide (format iNES .nes attendu).';
  }
  if (/crashed/i.test(message)) {
    return 'Le jeu a planté. Appuie sur Reset ou recharge la ROM.';
  }
  return message || 'Impossible de lancer cette ROM.';
}

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (target.getAttribute('type') || 'text').toLowerCase();
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file'].includes(type);
}

export class NesEngine {
  constructor({ canvas, onError, onSramChange, onStatus } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.imageData = this.ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
    this.pixels.fill(0xff000000);
    this.ctx.putImageData(this.imageData, 0, 0);

    this.onError = onError || (() => {});
    this.onSramChange = onSramChange || (() => {});
    this.onStatus = onStatus || (() => {});

    this.nes = null;
    this.romBytes = null;
    this.hasBattery = false;
    this.sram = null;
    this.running = false;
    this.paused = false;
    this.frameDirty = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.raf = 0;

    this.audioCtx = null;
    this.audioNode = null;
    this.gainNode = null;
    this.audioReady = false;
    this.volume = 0.7;
    this.muted = false;
    this.sampleRate = 48000;
    this.sampleL = new Float32Array(4096);
    this.sampleR = new Float32Array(4096);
    this.sampleCount = 0;

    // pressed[player][button] = Set des sources qui tiennent le bouton.
    this.pressed = {
      1: Array.from({ length: 8 }, () => new Set()),
      2: Array.from({ length: 8 }, () => new Set()),
    };
    this.gamepadState = new Map();

    this.fpsFrames = 0;
    this.fpsSince = 0;
    this.fps = 0;

    this.tick = this.tick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.resumeAudio = this.resumeAudio.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('pointerdown', this.resumeAudio, true);
    window.addEventListener('keydown', this.resumeAudio, true);

    this.raf = requestAnimationFrame(this.tick);
  }

  // ---------------------------------------------------------------- audio --

  ensureAudioContext() {
    if (this.audioCtx) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    try {
      this.audioCtx = new AudioCtor({ latencyHint: 'interactive' });
    } catch {
      try { this.audioCtx = new AudioCtor(); } catch { this.audioCtx = null; return; }
    }
    this.sampleRate = this.audioCtx.sampleRate || 48000;
    this.gainNode = this.audioCtx.createGain();
    this.applyVolume();
    this.gainNode.connect(this.audioCtx.destination);

    if (!this.audioCtx.audioWorklet) return;
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
    const ctx = this.audioCtx;
    ctx.audioWorklet.addModule(url)
      .then(() => {
        if (this.audioCtx !== ctx) return;
        this.audioNode = new AudioWorkletNode(ctx, 'lets-play-nes-audio', { outputChannelCount: [2] });
        this.audioNode.connect(this.gainNode);
        this.audioReady = true;
      })
      .catch((error) => console.warn('[NES] audio indisponible', error))
      .finally(() => URL.revokeObjectURL(url));
  }

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended' && this.running && !this.paused) {
      this.audioCtx.resume().catch(() => {});
    }
  }

  applyVolume() {
    if (!this.gainNode) return;
    const value = this.muted ? 0 : this.volume;
    try {
      this.gainNode.gain.setTargetAtTime(value, this.audioCtx.currentTime, 0.015);
    } catch {
      this.gainNode.gain.value = value;
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  setMuted(muted) {
    this.muted = !!muted;
    this.applyVolume();
  }

  clearAudio() {
    this.sampleCount = 0;
    if (this.audioNode) this.audioNode.port.postMessage({ type: 'clear' });
  }

  writeSample = (left, right) => {
    if (this.sampleCount >= this.sampleL.length) return;
    this.sampleL[this.sampleCount] = left;
    this.sampleR[this.sampleCount] = right;
    this.sampleCount += 1;
  };

  flushAudio() {
    const count = this.sampleCount;
    this.sampleCount = 0;
    if (!count || !this.audioReady || !this.audioNode) return;
    const left = this.sampleL.slice(0, count);
    const right = this.sampleR.slice(0, count);
    this.audioNode.port.postMessage({ type: 'samples', left, right }, [left.buffer, right.buffer]);
  }

  // ------------------------------------------------------------------ ROM --

  loadRom(bytes, { sram = null } = {}) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (!isNesRom(data)) throw new Error('Not a valid NES ROM');

    // Le contexte audio doit exister avant le cœur : l'APU fige son taux
    // d'échantillonnage à la construction.
    this.ensureAudioContext();

    const nes = new NES({
      onFrame: this.writeFrame,
      onAudioSample: this.writeSample,
      onBatteryRamWrite: this.writeBatteryRam,
      emulateSound: true,
      sampleRate: this.sampleRate,
    });
    nes.loadROM(data); // lève une erreur si mapper inconnu : l'ancien jeu continue

    this.releaseAll();
    this.nes = nes;
    this.romBytes = data;
    this.hasBattery = !!nes.rom?.batteryRam;
    this.sram = this.hasBattery ? new Uint8Array(SRAM_SIZE) : null;
    if (this.hasBattery && sram && sram.length === SRAM_SIZE) {
      this.sram.set(sram);
      this.restoreSram();
    }
    this.clearAudio();
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.running = true;
    this.paused = false;
    this.resumeAudio();
    this.emitStatus();
  }

  restoreSram() {
    if (!this.nes || !this.sram) return;
    this.nes.cpu.mem.set(this.sram, SRAM_START);
  }

  writeBatteryRam = (address, value) => {
    if (!this.sram) return;
    const offset = address - SRAM_START;
    if (offset < 0 || offset >= SRAM_SIZE || this.sram[offset] === value) return;
    this.sram[offset] = value;
    this.onSramChange(this.sram);
  };

  reset() {
    if (!this.nes) return;
    this.nes.reloadROM();
    this.restoreSram();
    this.releaseAll();
    this.clearAudio();
    this.paused = false;
    this.emitStatus();
  }

  eject() {
    this.running = false;
    this.paused = false;
    this.nes = null;
    this.romBytes = null;
    this.sram = null;
    this.hasBattery = false;
    this.releaseAll();
    this.clearAudio();
    this.pixels.fill(0xff000000);
    this.ctx.putImageData(this.imageData, 0, 0);
    if (this.audioCtx && this.audioCtx.state === 'running') this.audioCtx.suspend().catch(() => {});
    this.emitStatus();
  }

  setPaused(paused) {
    if (!this.running) return;
    this.paused = !!paused;
    if (this.paused) {
      this.releaseAll();
      this.clearAudio();
      if (this.audioCtx && this.audioCtx.state === 'running') this.audioCtx.suspend().catch(() => {});
    } else {
      this.lastTime = performance.now();
      this.accumulator = 0;
      if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
    }
    this.emitStatus();
  }

  // ------------------------------------------------------------ savestate --

  saveState() {
    if (!this.nes) return null;
    return JSON.stringify(this.nes.toJSON());
  }

  loadState(serialized) {
    if (!this.nes || !serialized) return false;
    const state = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    this.nes.fromJSON(state);
    // L'état embarque le taux d'échantillonnage de la machine qui l'a créé :
    // on le recale sur la carte son actuelle.
    this.nes.papu.sampleRate = this.sampleRate;
    this.nes.papu.setFrameRate(60);
    this.releaseAll();
    this.clearAudio();
    this.frameDirty = true;
    return true;
  }

  screenshot(width = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round((width * SCREEN_HEIGHT) / SCREEN_WIDTH);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  // --------------------------------------------------------------- inputs --

  press(player, button, source) {
    const holders = this.pressed[player]?.[button];
    if (!holders || holders.has(source)) return;
    holders.add(source);
    if (holders.size === 1 && this.nes && !this.paused) this.nes.buttonDown(player, button);
  }

  release(player, button, source) {
    const holders = this.pressed[player]?.[button];
    if (!holders || !holders.has(source)) return;
    holders.delete(source);
    if (holders.size === 0 && this.nes) this.nes.buttonUp(player, button);
  }

  releaseSource(source) {
    for (const player of [1, 2]) {
      this.pressed[player].forEach((holders, button) => {
        if (holders.has(source)) this.release(player, button, source);
      });
    }
  }

  releaseAll() {
    for (const player of [1, 2]) {
      this.pressed[player].forEach((holders, button) => {
        if (holders.size && this.nes) this.nes.buttonUp(player, button);
        holders.clear();
      });
    }
    this.gamepadState.clear();
  }

  handleKeyDown(event) {
    if (!this.running || this.paused) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;
    const button = KEYBOARD_MAP[event.code];
    if (button === undefined) return;
    event.preventDefault();
    this.press(1, button, `key:${event.code}`);
  }

  handleKeyUp(event) {
    const button = KEYBOARD_MAP[event.code];
    if (button === undefined) return;
    if (this.running) event.preventDefault();
    this.release(1, button, `key:${event.code}`);
  }

  handleBlur() {
    this.releaseAll();
  }

  pollGamepads() {
    if (!navigator.getGamepads) return;
    let pads;
    try { pads = navigator.getGamepads(); } catch { return; }
    let player = 1;
    for (const pad of pads) {
      if (!pad || !pad.connected || player > 2) continue;
      const source = `pad:${pad.index}`;
      const previous = this.gamepadState.get(pad.index) || 0;
      let mask = 0;
      for (const [index, button] of GAMEPAD_BUTTONS) {
        const b = pad.buttons[index];
        if (b && (b.pressed || b.value > 0.5)) mask |= 1 << button;
      }
      const x = pad.axes[0] || 0;
      const y = pad.axes[1] || 0;
      if (x < -AXIS_THRESHOLD) mask |= 1 << BUTTONS.LEFT;
      if (x > AXIS_THRESHOLD) mask |= 1 << BUTTONS.RIGHT;
      if (y < -AXIS_THRESHOLD) mask |= 1 << BUTTONS.UP;
      if (y > AXIS_THRESHOLD) mask |= 1 << BUTTONS.DOWN;
      if (mask !== previous) {
        for (let button = 0; button < 8; button++) {
          const bit = 1 << button;
          if ((mask & bit) && !(previous & bit)) this.press(player, button, source);
          else if (!(mask & bit) && (previous & bit)) this.release(player, button, source);
        }
        this.gamepadState.set(pad.index, mask);
      }
      player += 1;
    }
  }

  // ----------------------------------------------------------------- loop --

  writeFrame = (buffer) => {
    const pixels = this.pixels;
    for (let i = 0; i < 61440; i++) pixels[i] = 0xff000000 | buffer[i];
    this.frameDirty = true;
  };

  tick(now) {
    this.raf = requestAnimationFrame(this.tick);
    if (!this.running || this.paused || !this.nes) {
      this.lastTime = now;
      if (this.frameDirty) this.present();
      return;
    }
    let delta = now - this.lastTime;
    this.lastTime = now;
    if (delta > 250 || delta < 0) delta = FRAME_MS; // retour d'onglet, horloge instable
    this.accumulator += delta;

    let frames = 0;
    try {
      while (this.accumulator >= FRAME_MS && frames < MAX_FRAMES_PER_TICK) {
        this.pollGamepads();
        this.nes.frame();
        this.flushAudio();
        this.accumulator -= FRAME_MS;
        frames += 1;
      }
    } catch (error) {
      this.running = false;
      this.emitStatus();
      this.onError(error);
      return;
    }
    if (frames === MAX_FRAMES_PER_TICK) this.accumulator = 0; // machine trop lente : on ne rattrape pas
    if (this.frameDirty) this.present();

    this.fpsFrames += frames;
    if (now - this.fpsSince >= 1000) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsSince || 1));
      this.fpsFrames = 0;
      this.fpsSince = now;
      this.emitStatus();
    }
  }

  present() {
    this.ctx.putImageData(this.imageData, 0, 0);
    this.frameDirty = false;
  }

  emitStatus() {
    this.onStatus({
      running: this.running,
      paused: this.paused,
      fps: this.running && !this.paused ? this.fps : 0,
      hasBattery: this.hasBattery,
      audio: !!this.audioCtx,
    });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointerdown', this.resumeAudio, true);
    window.removeEventListener('keydown', this.resumeAudio, true);
    this.running = false;
    this.nes = null;
    if (this.audioNode) {
      try { this.audioNode.disconnect(); } catch { /* déjà déconnecté */ }
    }
    if (this.audioCtx) this.audioCtx.close().catch(() => {});
    this.audioCtx = null;
    this.audioNode = null;
    this.audioReady = false;
  }
}
