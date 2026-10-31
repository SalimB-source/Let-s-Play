import { RpgPlateauMusic, RPG_PLATEAUX_MUSICAUX } from './rpgPlateauMusic.js';

/** 20 points d'écart entre les territoires : 60/40, pas 70/30.
 * Hystérésis : entre 40 et 60, le dernier camp musical garde la main.
 */
export function campMusicalDuTerritoire(partJoueur, precedent = 'joueur') {
  if (partJoueur >= 60) return 'joueur';
  if (partJoueur <= 40) return 'sorcier';
  return precedent === 'sorcier' ? 'sorcier' : 'joueur';
}

/** Pas de piste livrée pour certains terrains : préférer la musique de
 * l'autre camp au silence ; sans aucune piste, l'ambiance de tour reste gérée
 * par la page. Les identifiants merveilleux utilisent leur propre catalogue.
 */
export function plateauMusicalDuCamp(camp, joueur, sorcier) {
  const prefere = camp === 'sorcier' ? sorcier : joueur;
  const autre = camp === 'sorcier' ? joueur : sorcier;
  return RPG_PLATEAUX_MUSICAUX.has(prefere) ? prefere
    : RPG_PLATEAUX_MUSICAUX.has(autre) ? autre : prefere;
}

/** Relais entre pistes de conquête. Un lecteur par fichier pendant le duel :
 * la piste choisie et sa position sont conservées lors des allers-retours.
 * Le fondu ne commence qu'après play() réussi. Un refus d'autoplay conserve
 * l'ancienne piste et le prochain geste peut réessayer start().
 */
export class RpgConqueteMusic {
  constructor(rng = Math.random, { duree = 1200 } = {}) {
    this.rng = rng;
    this.duree = duree;
    this.plateauId = null;
    this.cible = null;
    this.lecteurs = new Map();
    this.volume = 1;
    this.muted = false;
    this.wanted = false;
    this.paused = false;
    this.timer = null;
    this.token = 0;
    this.demarrage = null;
  }

  annulerFondu() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  appliquerVolumes() {
    for (const entree of new Set(this.lecteurs.values())) {
      entree.lecteur.setMuted(this.muted);
      entree.lecteur.setVolume(this.volume * entree.gain);
    }
  }

  setPlateau(plateauId, { reroll = false } = {}) {
    if (reroll) {
      this.destroy();
      // destroy libère l'audio mais garde les préférences volume/son.
    }
    if (this.plateauId === plateauId && !reroll) return;
    this.token += 1;
    this.demarrage = null;
    this.annulerFondu();
    this.plateauId = plateauId;
    if (!RPG_PLATEAUX_MUSICAUX.has(plateauId)) {
      this.cible = null;
      return;
    }
    let entree = this.lecteurs.get(plateauId);
    if (!entree) {
      const lecteur = new RpgPlateauMusic(this.rng);
      lecteur.setPlateau(plateauId, { reroll: true });
      // Deux terrains peuvent partager exactement le même morceau : pas de
      // redémarrage, ni deux copies déphasées de la même piste.
      // La playlist de la Cour change de piste : ne pas la fusionner avec
      // le cimetière, qui partage seulement son ancien morceau.
      entree = [...this.lecteurs.values()].find((e) =>
        plateauId !== 'cour-du-fleau' && e.lecteur.plateauId !== 'cour-du-fleau' &&
        e.lecteur.musicFile === lecteur.musicFile);
      if (!entree) entree = { lecteur, gain: this.lecteurs.size ? 0 : 1 };
      this.lecteurs.set(plateauId, entree);
    }
    this.cible = entree;
    this.appliquerVolumes();
  }

  async start() {
    this.wanted = true;
    this.paused = false;
    if (this.demarrage) return this.demarrage;
    // Un nouveau rendu ou un clic ne doit pas recommencer un fondu en cours.
    if (this.timer !== null) return;
    const cible = this.cible;
    if (cible?.lecteur.running && !cible.lecteur.paused && cible.gain === 1) return;
    const token = this.token;
    this.demarrage = (async () => {
      if (cible) {
        await cible.lecteur.start();
        if (token !== this.token || !this.wanted || this.paused) {
          if (cible !== this.cible || !this.wanted || this.paused) cible.lecteur.pause();
          return;
        }
        if (!cible.lecteur.running || cible.lecteur.audio?.paused !== false) return; // autoplay bloqué : pas de fondu vers le silence
      }
      if (token !== this.token || !this.wanted || this.paused) return;
      const entrees = [...new Set(this.lecteurs.values())];
      // Au retour d'un onglet, les deux pistes d'un fondu suspendu reprennent.
      for (const e of entrees) {
        if (e !== cible && e.gain > 0 && e.lecteur.paused) void e.lecteur.start();
      }
      const departs = entrees.map((e) => e.gain);
      const terminer = () => {
        for (const e of entrees) {
          e.gain = e === cible ? 1 : 0;
          if (e !== cible) e.lecteur.pause();
        }
        this.appliquerVolumes();
      };
      if (entrees.every((e) => e.gain === (e === cible ? 1 : 0))) {
        terminer();
        return;
      }
      const debut = Date.now();
      this.timer = setInterval(() => {
        const progression = Math.min(1, (Date.now() - debut) / this.duree);
        entrees.forEach((e, i) => { e.gain = departs[i] + ((e === cible ? 1 : 0) - departs[i]) * progression; });
        this.appliquerVolumes();
        if (progression >= 1) {
          this.annulerFondu();
          terminer();
        }
      }, 40);
    })();
    try { await this.demarrage; }
    finally { if (token === this.token) this.demarrage = null; }
  }

  pause() {
    this.paused = true;
    this.token += 1;
    this.demarrage = null;
    this.annulerFondu();
    for (const e of new Set(this.lecteurs.values())) e.lecteur.pause();
  }

  resume() {
    if (this.paused && this.wanted) void this.start();
  }

  stop() {
    this.pause();
    this.wanted = false;
    for (const e of new Set(this.lecteurs.values())) {
      e.lecteur.stop();
      e.gain = e === this.cible ? 1 : 0;
    }
    this.appliquerVolumes();
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.appliquerVolumes();
  }

  setVolume(volume) {
    const valeur = Number(volume);
    this.volume = Number.isFinite(valeur) ? Math.max(0, Math.min(1, valeur)) : 1;
    this.appliquerVolumes();
  }

  destroy() {
    this.stop();
    for (const e of new Set(this.lecteurs.values())) e.lecteur.destroy();
    this.lecteurs.clear();
    this.cible = null;
    this.plateauId = null;
  }
}
