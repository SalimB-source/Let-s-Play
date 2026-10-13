/**
 * Musique dédiée à certains plateaux du Sablier.
 *
 * Le fichier fourni par l'équipe est joué en boucle uniquement sur la Table
 * des Heures et le Désert de Verre. Les autres plateaux conservent la musique
 * d'ambiance synthétisée existante (ou le silence en duel libre).
 */

export const RPG_PLATEAU_MUSIC_FILE = `${import.meta.env?.BASE_URL ?? '/'}audio/arabian-travel.mp3`;
export const RPG_PLATEAUX_MUSICAUX = Object.freeze(new Set([
  'table-des-heures',
  'desert-de-verre',
]));

export class RpgPlateauMusic {
  constructor() {
    this.plateauId = null;
    this.audio = null;
    this.running = false;
    this.paused = false;
    this.muted = false;
  }

  setPlateau(plateauId) {
    const next = RPG_PLATEAUX_MUSICAUX.has(plateauId) ? plateauId : null;
    if (next === this.plateauId) return;
    this.plateauId = next;
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
      this.audio = new window.Audio(RPG_PLATEAU_MUSIC_FILE);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = 0.16;
    }
    this.audio.muted = this.muted;
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
    if (this.audio) this.audio.muted = this.muted;
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
