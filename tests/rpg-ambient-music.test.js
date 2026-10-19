/**
 * Tests de la musique d'ambiance du mode Histoire.
 *
 * Comme pour `rpgAudio.js`, la couche pure est testée sans navigateur :
 * on vérifie que les cinq tours ont bien un BPM, un thème et qu'une
 * instance reste muette en l'absence de window.AudioContext (ne plante pas,
 * comme le veut la convention du dépôt).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  RPG_AMBIENT_BPM,
  RPG_AMBIENT_THEMES,
  RPG_AMBIENT_LOOP_STEPS,
  RpgAmbientMusic,
} from '../src/games/rpgAmbientMusic.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { RPG_PLATEAU_MUSIC_FILES, RPG_PLATEAUX_MUSICAUX } from '../src/games/rpgPlateauMusic.js';
import { plateauParId } from '../src/games/rpgPlateaux.js';

test('cinq ambiances, une par tour du mode Histoire', () => {
  const tourIds = RPG_STORY_TOURS.map((t) => t.id);
  assert.equal(tourIds.length, 5, 'le mode Histoire doit compter cinq tours');
  for (const id of tourIds) {
    assert.ok(RPG_AMBIENT_BPM[id], `BPM manquant pour la tour : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id], `thème manquant pour la tour : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id].nom, `nom manquant : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id].ambiance, `description d'ambiance manquante : ${id}`);
    assert.ok(RPG_AMBIENT_BPM[id] >= 55 && RPG_AMBIENT_BPM[id] <= 110,
      `le BPM de ${id} doit rester lent (ambiance, pas course) : ${RPG_AMBIENT_BPM[id]}`);
  }
});

test('supportedTours liste bien les cinq tours', () => {
  const supported = RpgAmbientMusic.supportedTours();
  assert.ok(Array.isArray(supported));
  assert.equal(supported.length, 5);
  for (const { id } of RPG_STORY_TOURS) assert.ok(supported.includes(id), `tour absente : ${id}`);
});

test('boucle de 8 mesures × 16 pas = 128 pas', () => {
  assert.equal(RPG_AMBIENT_LOOP_STEPS, 128);
});

test('setTour change la tour sans lancer d\'exception', () => {
  const player = new RpgAmbientMusic();
  for (const { id } of RPG_STORY_TOURS) {
    player.setTour(id);
    assert.equal(player.tourId, id);
  }
  // Un identifiant inconnu ne doit pas changer la tour.
  const before = player.tourId;
  player.setTour('tour-inexistante');
  assert.equal(player.tourId, before);
});

test('lecteur sans navigateur : start/stop/pause/resume/setMuted/destroy ne plantent pas', async () => {
  const player = new RpgAmbientMusic();
  await player.start(); // pas de window.AudioContext → pas de contexte
  assert.equal(player.context, null);
  assert.equal(player.running, false);
  player.pause();
  player.resume();
  player.setMuted(true);
  player.stop();
  player.destroy();
  assert.ok(true);
});

test('noms des ambiances reflètent bien chaque tour', () => {
  assert.match(RPG_AMBIENT_THEMES['tour-des-listes'].nom, /Horloger|Liste|compte/i);
  assert.match(RPG_AMBIENT_THEMES['tour-du-souk'].nom, /étal|souk/i);
  assert.match(RPG_AMBIENT_THEMES['tour-des-sables'].nom, /zénith|portail|sable/i);
  assert.match(RPG_AMBIENT_THEMES['tour-des-abysses'].nom, /cloche|fond|abîme/i);
  assert.match(RPG_AMBIENT_THEMES['tour-du-fjord'].nom, /hiver|fjord|glace|neige/i);
});

// La musique existe mais ne se fait entendre que si la page la joue : ce
// garde-fou lit la source de la page du duel, comme les checks d'interface.
test('la page du duel joue la musique d’ambiance du mode Histoire sans doubler un plateau musical', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /import\s*\{\s*RpgAmbientMusic\s*\}\s*from\s*'\.\/rpgAmbientMusic\.js';/,
    'la page du duel importe le lecteur d’ambiance');
  assert.match(page, /musiqueRef\.current = new RpgAmbientMusic\(\)/,
    'un lecteur est créé pour la page');
  assert.match(page, /musiqueRef\.current\?\.destroy\(\)/,
    'le lecteur est détruit au démontage (contexte audio fermé)');
  assert.match(page, /musiqueRef\.current\?\.setTour\(tourHistoireId\)/,
    'la tour de l’étage en cours commande la boucle');
  assert.match(page, /RPG_PLATEAUX_MUSICAUX\.has\(plateauId\)/,
    'la page connaît les plateaux qui ont leur propre musique');
  assert.match(page, /musiquePlateau\?\.setPlateau\(plateau\.id\)/,
    'le lecteur reçoit le plateau choisi dans la fonction de lancement');
  assert.match(page, /if \(modeLibre && sonActif && RPG_PLATEAUX_MUSICAUX\.has\(plateau\.id\)\) \{\s*void musiquePlateau\?\.start\(\);/,
    'la piste du plateau démarre dans le geste du duel libre, uniquement s’il est musical');
  assert.match(page, /tourHistoireId && sonActif && !plateauMusical\) musique\.start\(\)/,
    'l’ambiance de la tour démarre seulement si le plateau n’a pas sa propre musique');
  assert.match(page, /musique\.stop\(\)/,
    'la boucle s’arrête hors duel et récit (menus, duels libres, son coupé)');
  assert.match(page, /musique\.pause\(\)/,
    'un onglet mis de côté suspend la musique');
  assert.match(page, /musique\.resume\(\)/,
    'au retour sur l’onglet, la musique reprend');
  assert.match(page, /musiqueRef\.current\?\.setTour\(etageHistoireParId\(etageId\)\?\.tour\?\.id \?\? null\)/,
    'le lancement d’un étage naît dans le geste joueur (contexte audio)');
  assert.match(page, /onClick=\{basculerSon\}/,
    'un bouton de la barre du duel coupe ou rend la musique');
  assert.match(page, /musiqueRef\.current\?\.setVolume\(volumeMusique\)/,
    'le volume des musiques pilote l’ambiance des tours');
  assert.match(page, /musiquePlateauRef\.current\?\.setVolume\(volumeMusique\)/,
    'le volume des musiques pilote aussi les pistes des plateaux');
  assert.match(page, /sfxRef\.current\?\.setVolume\(volumeSfx\)/,
    'le volume des sons du jeu pilote les bruitages');
});

test('La Cour de l’Empereur joue « Way of the Bushido » et ses voix de geisha', () => {
  const plateauId = 'cour-de-l-empereur';
  const fichier = 'WayOfTheBushidoWithGeishaVocals.mp3';
  assert.equal(plateauParId(plateauId)?.nom, 'La Cour de l’Empereur');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'le plateau doit être traité comme musical');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], `/audio/${fichier}`);
  assert.ok(existsSync(new URL(`../public/audio/${fichier}`, import.meta.url)), 'le MP3 doit être livré dans public/audio');
});

// ── Le lecteur fait-il vraiment du son ? ─────────────────────────────
// Un faux `AudioContext` compte les nœuds que le lecteur planifie : si une
// tour ne produit aucun oscillateur, la boucle est muette chez le joueur.
class FauxAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = {};
    this.cumul = { oscillateurs: 0, sources: 0 };
    this.ferme = false;
  }
  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
        cancelScheduledValues() {},
        setTargetAtTime() {},
      },
      connect() {},
    };
  }
  createOscillator() {
    this.cumul.oscillateurs += 1;
    return {
      type: 'sine',
      frequency: { value: 0, setValueAtTime() {} },
      detune: { value: 0, setValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      Q: { value: 0 },
      connect() {},
    };
  }
  createBuffer(_, length) {
    return { length, getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    this.cumul.sources += 1;
    return { buffer: null, loop: false, connect() {}, start() {}, stop() {} };
  }
  createConvolver() {
    return { buffer: null, connect() {} };
  }
  async resume() {}
  async close() { this.ferme = true; }
}

const ancienWindow = globalThis.window;
test.after(() => { globalThis.window = ancienWindow; });

test('chaque tour produit des nœuds audio sur toute sa boucle', async () => {
  globalThis.window = {
    AudioContext: FauxAudioContext,
    setInterval: () => 0,
    clearInterval: () => {},
  };
  const lecteur = new RpgAmbientMusic();
  await lecteur.start();
  assert.ok(lecteur.ready(), 'le lecteur doit tourner après start()');
  assert.ok(lecteur.context instanceof FauxAudioContext, 'un contexte audio est créé');
  assert.ok(lecteur.reverb, 'les nappes passent par une réverbération procédurale discrète');

  for (const { id } of RPG_STORY_TOURS) {
    lecteur.setTour(id);
    const avant = lecteur.context.cumul.oscillateurs;
    for (let pas = 0; pas < RPG_AMBIENT_LOOP_STEPS; pas += 1) {
      lecteur.playStep(pas, lecteur.context.currentTime + pas * 0.01);
    }
    const produits = lecteur.context.cumul.oscillateurs - avant;
    assert.ok(produits > 0, `la tour ${id} doit produire du son (0 oscillateur)`);
    assert.ok(lecteur.context.cumul.sources > 0, `la tour ${id} doit produire du souffle`);
  }

  // Le sablier ne se taît pas au milieu de la boucle : la planification
  // alimente les pas à venir tant que le contexte avance.
  lecteur.context.currentTime += 0.2;
  const avant = lecteur.context.cumul.oscillateurs;
  lecteur.schedule();
  assert.ok(lecteur.context.cumul.oscillateurs > avant, 'la planification alimente la boucle');

  lecteur.setMuted(true);
  lecteur.pause();
  assert.equal(lecteur.ready(), false, 'une pause interrompt la lecture');
  lecteur.resume();
  assert.equal(lecteur.ready(), true, 'la reprise relance la lecture');
  lecteur.stop();
  assert.equal(lecteur.ready(), false, 'stop interrompt la lecture');
  lecteur.destroy();
  assert.equal(lecteur.context, null, 'destroy libère le contexte');
  assert.equal(lecteur.musique ?? null, null);
});
