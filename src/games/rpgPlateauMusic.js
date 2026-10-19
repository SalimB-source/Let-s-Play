/**
 * Musique dédiée à certains plateaux du Sablier.
 *
 * Les fichiers fournis par l'équipe sont joués en boucle sur les plateaux
 * associés. Les autres plateaux conservent la musique d'ambiance synthétisée
 * existante (ou le silence en duel libre).
 */

const RPG_AUDIO_BASE = `${import.meta.env?.BASE_URL ?? '/'}audio/`;
export const RPG_PLATEAU_MUSIC_FILES = Object.freeze({
  'table-des-heures': `${RPG_AUDIO_BASE}arabian-travel.mp3`,
  'erg-du-sahara': `${RPG_AUDIO_BASE}ArabianMeditativeFantasyCover.mp3`,
  'caravane-de-gourara': `${RPG_AUDIO_BASE}arabian-travel.mp3`,
  'ruines-de-tipaza': `${RPG_AUDIO_BASE}deep-sea-underwater-ambience.mp3`,
  'abysses-phosphorescentes': `${RPG_AUDIO_BASE}deep-sea-underwater-ambience.mp3`,
  'desert-de-verre': `${RPG_AUDIO_BASE}arabian-travel.mp3`,
  'fjord-des-neuf-hivers': `${RPG_AUDIO_BASE}full-track.mp3`,
  'cour-de-l-empereur': `${RPG_AUDIO_BASE}WayOfTheBushidoWithGeishaVocals.mp3`,
  'iles-celestes': `${RPG_AUDIO_BASE}full-track.mp3`,
});
export const RPG_PLATEAUX_MUSICAUX = Object.freeze(new Set(Object.keys(RPG_PLATEAU_MUSIC_FILES)));

const BASE_PLATEAU_VOLUME = 0.16;

export class RpgPlateauMusic {
  constructor() {
    this.plateauId = null;
    this.musicFile = null;
    this.audio = null;
    this.running = false;
    this.paused = false;
    this.muted = false;
    this.volume = 1;
  }

  effectiveVolume() {
    if (this.muted || this.volume <= 0) return 0;
    return Math.max(0, Math.min(1, BASE_PLATEAU_VOLUME * this.volume));
  }

  setPlateau(plateauId) {
    const next = RPG_PLATEAUX_MUSICAUX.has(plateauId) ? plateauId : null;
    const nextFile = next ? RPG_PLATEAU_MUSIC_FILES[next] : null;
    if (next === this.plateauId && nextFile === this.musicFile) return;
    this.plateauId = next;
    this.musicFile = nextFile;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.running = false;
    this.paused = false;
  }

  async start() {
    if (!this.plateauId || typeof window === 'undefined') return;
    if (!this.audio) {
      this.audio = new window.Audio(this.musicFile);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.effectiveVolume();
    } else if (this.audio.src !== new URL(this.musicFile, window.location.href).href) {
      this.audio.src = this.musicFile;
    }
    this.audio.volume = this.effectiveVolume();
    this.audio.muted = this.muted || this.volume <= 0;
    try {
      await this.audio.play();
      this.running = true;
      this.paused = false;
    } catch {
      // Le navigateur peut bloquer la lecture automatique avant un geste joueur.
    }
  }

  stop() {
    this.audio?.pause();
    if (this.audio) this.audio.currentTime = 0;
    this.running = false;
    this.paused = false;
  }

  pause() {
    if (!this.running || this.paused) return;
    this.audio?.pause();
    this.paused = true;
  }

  resume() {
    if (!this.running || !this.paused) return;
    void this.start();
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.audio) {
      this.audio.volume = this.effectiveVolume();
      this.audio.muted = this.muted || this.volume <= 0;
    }
  }

  setVolume(volume) {
    const num = Number(volume);
    this.volume = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 1;
    if (this.audio) {
      this.audio.volume = this.effectiveVolume();
      this.audio.muted = this.muted || this.volume <= 0;
    }
  }

  destroy() {
    this.stop();
    if (this.audio) {
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.audio = null;
  }
}
