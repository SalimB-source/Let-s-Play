/**
 * Musique dédiée à certains plateaux du Sablier.
 *
 * Les fichiers fournis par l'équipe sont joués en boucle sur les plateaux
 * associés. Les autres plateaux conservent la musique d'ambiance synthétisée
 * existante (ou le silence en duel libre).
 */

const RPG_PUBLIC_BASE = import.meta.env?.BASE_URL ?? '/';
const RPG_AUDIO_BASE = `${RPG_PUBLIC_BASE}audio/`;
const RPG_SNOW_MUSIC_FILES = Object.freeze([
  `${RPG_PUBLIC_BASE}Viking Howl.mp3`,
  `${RPG_PUBLIC_BASE}Viking Howl (Take 2).mp3`,
  // La piste complète livrée dans public/audio entre dans le même tirage.
  `${RPG_AUDIO_BASE}full-track.mp3`,
]);
const RPG_JAPANESE_MUSIC_FILES = Object.freeze([
  `${RPG_AUDIO_BASE}WayOfTheBushidoWithGeishaVocals.mp3`,
  `${RPG_PUBLIC_BASE}CherryBlossomStrings(Extended).mp3`,
]);

export const RPG_PLATEAU_MUSIC_FILES = Object.freeze({
  'table-des-heures': `${RPG_PUBLIC_BASE}Acoustic Guitar Solo (Cover).mp3`,
  'erg-du-sahara': `${RPG_AUDIO_BASE}ArabianMeditativeFantasyCover.mp3`,
  'caravane-de-gourara': `${RPG_AUDIO_BASE}arabian-travel.mp3`,
  'ruines-de-tipaza': `${RPG_AUDIO_BASE}SorcererOfTheDeepTide.mp3`,
  'abysses-phosphorescentes': `${RPG_AUDIO_BASE}deep-sea-underwater-ambience.mp3`,
  'desert-de-verre': `${RPG_AUDIO_BASE}arabian-travel.mp3`,
  // Le Fjord et son double, les Îles Célestes, partagent trois pistes : les
  // deux prises vikings et la piste complète. Le lecteur en choisit une au
  // lancement de chaque duel enneigé.
  'fjord-des-neuf-hivers': RPG_SNOW_MUSIC_FILES,
  // La Cour alterne le thème Bushido existant et la nouvelle piste des cerisiers.
  'cour-de-l-empereur': RPG_JAPANESE_MUSIC_FILES,
  'iles-celestes': RPG_SNOW_MUSIC_FILES,
});
export const RPG_PLATEAUX_MUSICAUX = Object.freeze(new Set(Object.keys(RPG_PLATEAU_MUSIC_FILES)));

const BASE_PLATEAU_VOLUME = 0.16;

function choisirFichierMusique(fichiers, rng) {
  if (!Array.isArray(fichiers)) return fichiers ?? null;
  if (fichiers.length === 0) return null;

  const tirage = Number(rng());
  const borne = Number.isFinite(tirage)
    ? Math.min(Math.max(tirage, 0), 1 - Number.EPSILON)
    : 0;
  return fichiers[Math.floor(borne * fichiers.length)] ?? fichiers[0];
}

export class RpgPlateauMusic {
  constructor(rng = Math.random) {
    this.rng = typeof rng === 'function' ? rng : Math.random;
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

  /**
   * Sélectionne une piste à l'arrivée sur un plateau. `reroll` est utilisé
   * au lancement d'une nouvelle partie : les appels d'effet et de reprise
   * gardent ensuite la même piste pendant tout le duel.
   */
  setPlateau(plateauId, { reroll = false } = {}) {
    const next = RPG_PLATEAUX_MUSICAUX.has(plateauId) ? plateauId : null;
    if (next === this.plateauId && !reroll) return;

    const nextFile = next ? choisirFichierMusique(RPG_PLATEAU_MUSIC_FILES[next], this.rng) : null;
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
    if (!this.plateauId || !this.musicFile || typeof window === 'undefined') return;
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
