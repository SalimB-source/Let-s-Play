/**
 * Musiques MP3 du Sablier : thème principal hors parties et pistes dédiées aux plateaux.
 *
 * - Hors parties (menus, atelier de decks, souk, catalogue, récit, paramètres…) :
 *   `Desert Solitude with Percussion.mp3` tourne en boucle comme thème principal.
 * - En partie (`ecran === 'partie'`) : le thème principal s'efface au profit de la
 *   piste du plateau du duel (ou de la boucle d'ambiance synthétisée de la tour).
 */

const RPG_PUBLIC_BASE = import.meta.env?.BASE_URL ?? '/';
const RPG_AUDIO_BASE = `${RPG_PUBLIC_BASE}audio/`;

export const RPG_MAIN_THEME_FILE = `${RPG_PUBLIC_BASE}Desert Solitude with Percussion.mp3`;

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
const RPG_SOUND_STORAGE_KEY = 'letsplay_sablier_sound_v1';
const RPG_MUSIC_VOLUME_STORAGE_KEY = 'letsplay_sablier_music_volume_v1';

/** Lit les préférences sonores mémorisées du Sablier (pour l'écran d'entrée / connexion). */
export function lirePreferencesSonoresRpg() {
  let sonActif = true;
  let volumeMusique = 1;
  try {
    sonActif = window.localStorage.getItem(RPG_SOUND_STORAGE_KEY) !== 'off';
  } catch { /* stockage indisponible */ }
  try {
    const brut = window.localStorage.getItem(RPG_MUSIC_VOLUME_STORAGE_KEY);
    if (brut !== null && brut !== '') {
      const valeur = Number(brut);
      if (Number.isFinite(valeur)) volumeMusique = Math.max(0, Math.min(1, valeur));
    }
  } catch { /* stockage indisponible */ }
  return { sonActif, volumeMusique };
}

function choisirFichierMusique(fichiers, rng) {
  if (!Array.isArray(fichiers)) return fichiers ?? null;
  if (fichiers.length === 0) return null;

  const tirage = Number(rng());
  const borne = Number.isFinite(tirage)
    ? Math.min(Math.max(tirage, 0), 1 - Number.EPSILON)
    : 0;
  return fichiers[Math.floor(borne * fichiers.length)] ?? fichiers[0];
}

function sourceCorrespond(audio, musicFile) {
  if (!audio?.src) return false;
  if (audio.src === musicFile) return true;
  if (typeof window !== 'undefined' && window.location?.href) {
    try {
      return audio.src === new URL(musicFile, window.location.href).href;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Lecteur du thème principal du Sablier hors parties (`Desert Solitude with Percussion.mp3`).
 *
 * Gère également le déverrouillage automatique au premier geste utilisateur
 * lorsque la politique d'autoplay du navigateur bloque la lecture initiale
 * avant toute interaction sur la page.
 */
export class RpgMainThemeMusic {
  constructor(musicFile = RPG_MAIN_THEME_FILE) {
    this.musicFile = musicFile;
    this.audio = null;
    this.running = false;
    this.paused = false;
    this.muted = false;
    this.volume = 1;
    this.wanted = false;
    this.playToken = 0;
    this.gestureArmed = false;
    this.onGestureUnlock = () => {
      if (!this.wanted || this.paused || this.muted || this.volume <= 0) {
        this.disarmGestureUnlock();
        return;
      }
      void this.start();
    };
  }

  effectiveVolume() {
    if (this.muted || this.volume <= 0) return 0;
    return Math.max(0, Math.min(1, BASE_PLATEAU_VOLUME * this.volume));
  }

  armGestureUnlock() {
    if (this.gestureArmed || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    this.gestureArmed = true;
    window.addEventListener('pointerdown', this.onGestureUnlock, { capture: true, passive: true });
    window.addEventListener('keydown', this.onGestureUnlock, { capture: true });
  }

  disarmGestureUnlock() {
    if (!this.gestureArmed || typeof window === 'undefined' || typeof window.removeEventListener !== 'function') {
      this.gestureArmed = false;
      return;
    }
    this.gestureArmed = false;
    window.removeEventListener('pointerdown', this.onGestureUnlock, { capture: true });
    window.removeEventListener('keydown', this.onGestureUnlock, { capture: true });
  }

  async start() {
    this.wanted = true;
    this.paused = false;
    if (!this.musicFile || typeof window === 'undefined' || typeof window.Audio !== 'function') return;
    if (!this.audio) {
      this.audio = new window.Audio(this.musicFile);
      this.audio.loop = true;
      this.audio.preload = 'auto';
    } else if (!sourceCorrespond(this.audio, this.musicFile)) {
      this.audio.src = this.musicFile;
    }
    this.audio.volume = this.effectiveVolume();
    this.audio.muted = this.muted || this.volume <= 0;
    if (this.running && this.audio.paused === false) {
      this.disarmGestureUnlock();
      return;
    }
    const token = ++this.playToken;
    try {
      await this.audio.play();
      if (token !== this.playToken || !this.wanted || this.paused) {
        this.audio?.pause();
        return;
      }
      this.running = true;
      this.paused = false;
      this.disarmGestureUnlock();
    } catch {
      this.running = false;
      // Si le navigateur bloque l'autoplay avant le premier geste, on réarme
      // silencieusement pour démarrer dès le premier clic ou appui clavier.
      if (this.wanted && !this.paused && !this.muted && this.volume > 0) {
        this.armGestureUnlock();
      }
    }
  }

  stop() {
    this.wanted = false;
    this.running = false;
    this.paused = false;
    this.playToken += 1;
    this.disarmGestureUnlock();
    this.audio?.pause();
    if (this.audio) this.audio.currentTime = 0;
  }

  pause() {
    if ((!this.running && !this.wanted) || this.paused) return;
    this.paused = true;
    this.playToken += 1;
    this.disarmGestureUnlock();
    this.audio?.pause();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (!this.running && !this.wanted) return;
    void this.start();
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.audio) {
      this.audio.volume = this.effectiveVolume();
      this.audio.muted = this.muted || this.volume <= 0;
    }
    if (this.muted) {
      this.disarmGestureUnlock();
    } else if (this.wanted && !this.paused && !this.running) {
      void this.start();
    }
  }

  setVolume(volume) {
    const num = Number(volume);
    this.volume = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 1;
    if (this.audio) {
      this.audio.volume = this.effectiveVolume();
      this.audio.muted = this.muted || this.volume <= 0;
    }
    if (this.volume <= 0) {
      this.disarmGestureUnlock();
    } else if (this.wanted && !this.paused && !this.muted && !this.running) {
      void this.start();
    }
  }

  destroy() {
    this.stop();
    if (this.audio) {
      this.audio.removeAttribute?.('src');
      this.audio.load?.();
    }
    this.audio = null;
  }
}

/** Relais d'instance entre l'écran d'entrée / connexion et `RpgDuelPage` sans coupure sonore. */
let relaiThemePrincipal = null;

export function deposerThemePrincipal(lecteur) {
  if (relaiThemePrincipal && relaiThemePrincipal !== lecteur) {
    relaiThemePrincipal.destroy();
  }
  relaiThemePrincipal = lecteur ?? null;
}

export function reprendreThemePrincipal() {
  const lecteur = relaiThemePrincipal;
  relaiThemePrincipal = null;
  return lecteur;
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
    this.playToken = 0;
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
    this.playToken += 1;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.running = false;
    this.paused = false;
  }

  async start() {
    if (!this.plateauId || !this.musicFile || typeof window === 'undefined' || typeof window.Audio !== 'function') return;
    if (!this.audio) {
      this.audio = new window.Audio(this.musicFile);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.effectiveVolume();
    } else if (!sourceCorrespond(this.audio, this.musicFile)) {
      this.audio.src = this.musicFile;
    }
    this.audio.volume = this.effectiveVolume();
    this.audio.muted = this.muted || this.volume <= 0;
    const token = ++this.playToken;
    try {
      await this.audio.play();
      if (token !== this.playToken || this.paused) {
        this.audio?.pause();
        return;
      }
      this.running = true;
      this.paused = false;
    } catch {
      // Le navigateur peut bloquer la lecture automatique avant un geste joueur.
    }
  }

  stop() {
    this.playToken += 1;
    this.audio?.pause();
    if (this.audio) this.audio.currentTime = 0;
    this.running = false;
    this.paused = false;
  }

  pause() {
    if (!this.running || this.paused) return;
    this.playToken += 1;
    this.audio?.pause();
    this.paused = true;
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
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
      this.audio.removeAttribute?.('src');
      this.audio.load?.();
    }
    this.audio = null;
  }
}
