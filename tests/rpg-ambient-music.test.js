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
import {
  RPG_MAIN_THEME_FILE,
  RpgMainThemeMusic,
  RpgPlateauMusic,
  RPG_PLATEAU_MUSIC_FILES,
  RPG_PLATEAUX_MUSICAUX,
  deposerThemePrincipal,
  reprendreThemePrincipal,
} from '../src/games/rpgPlateauMusic.js';
import { plateauParId } from '../src/games/rpgPlateaux.js';

test('ambiances, une par tour du mode Histoire', () => {
  const tourIds = RPG_STORY_TOURS.map((t) => t.id);
  assert.equal(tourIds.length, RPG_STORY_TOURS.length, 'chaque tour a son ambiance');
  for (const id of tourIds) {
    assert.ok(RPG_AMBIENT_BPM[id], `BPM manquant pour la tour : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id], `thème manquant pour la tour : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id].nom, `nom manquant : ${id}`);
    assert.ok(RPG_AMBIENT_THEMES[id].ambiance, `description d'ambiance manquante : ${id}`);
    assert.ok(RPG_AMBIENT_BPM[id] >= 55 && RPG_AMBIENT_BPM[id] <= 110,
      `le BPM de ${id} doit rester lent (ambiance, pas course) : ${RPG_AMBIENT_BPM[id]}`);
  }
});

test('supportedTours liste bien toutes les tours', () => {
  const supported = RpgAmbientMusic.supportedTours();
  assert.ok(Array.isArray(supported));
  assert.equal(supported.length, RPG_STORY_TOURS.length);
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
  assert.match(RPG_AMBIENT_THEMES['tour-du-soleil-rouge'].nom, /soleil|katana|forge|samouraï|acier/i);
  assert.match(RPG_AMBIENT_THEMES['tour-de-la-necropole'].nom, /nécropole|jugement|pesée|ombre|balance/i);
  assert.match(RPG_AMBIENT_THEMES['tour-du-sablier-renverse'].nom, /sablier|retournement|sable/i);
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
  assert.match(page, /RPG_PLATEAUX_MUSICAUX\.has\(plateauMusiqueId\)/,
    'la page connaît les plateaux qui ont leur propre musique');
  assert.match(page, /musiquePlateau\?\.setPlateau\(plateau\.id,\s*\{\s*reroll:\s*true\s*\}\)/,
    'le lecteur reçoit le plateau choisi et tire une nouvelle piste au sort au lancement');
  assert.match(page, /if \(modeLibre && sonActif && RPG_PLATEAUX_MUSICAUX\.has\(plateau\.id\)\) \{\s*void musiquePlateau\?\.start\(\);/,
    'la piste du plateau démarre dans le geste du duel libre, uniquement s’il est musical');
  assert.match(page, /tourHistoireId && sonActif && !plateauMusical && !document\.hidden\) musique\.start\(\)/,
    'l’ambiance de la tour démarre seulement si le plateau n’a pas sa propre musique');
  assert.match(page, /musique\.stop\(\)/,
    'la boucle s’arrête hors duel et récit (menus, duels libres, son coupé)');
  assert.match(page, /musique\.pause\(\)/,
    'un onglet mis de côté suspend la musique');
  assert.match(page, /!RPG_PLATEAUX_MUSICAUX\.has\(plateauMusiqueId\)\) musique\.start\(\)/,
    'au retour sur l’onglet, seule une ambiance sans piste dédiée peut reprendre');
  assert.match(page, /musiqueRef\.current\?\.setTour\(etageHistoireParId\(etageId\)\?\.tour\?\.id \?\? null\)/,
    'le lancement d’un étage naît dans le geste joueur (contexte audio)');
  assert.match(page, /onClick=\{basculerSon\}/,
    'un bouton de la barre du duel coupe ou rend la musique');
  assert.match(page, /musiqueRef\.current\?\.setVolume\(volumeMusique\)/,
    'le volume des musiques pilote l’ambiance des tours');
  assert.match(page, /musiquePlateauRef\.current\?\.setVolume\(volumeMusique\)/,
    'le volume des musiques pilote aussi les pistes des plateaux');
  assert.match(page, /musiqueThemeRef\.current\?\.setVolume\(volumeMusique\)/,
    'le volume des musiques pilote le thème principal hors parties');
  assert.match(page, /if \(ecran !== 'partie' && sonActif\) void musiqueTheme\.start\(\);\s*else musiqueTheme\.stop\(\);/,
    'le thème principal tourne hors parties et s’efface en partie');
  assert.match(page, /sfxRef\.current\?\.setVolume\(volumeSfx\)/,
    'le volume des sons du jeu pilote les bruitages');
});

test('le thème principal hors parties utilise « Desert Solitude with Percussion.mp3 » dans public/', () => {
  assert.equal(RPG_MAIN_THEME_FILE, '/Desert Solitude with Percussion.mp3');
  assert.ok(
    existsSync(new URL('../public/Desert Solitude with Percussion.mp3', import.meta.url)),
    'Desert Solitude with Percussion.mp3 doit être présent dans public/',
  );
});

test('RpgMainThemeMusic boucle hors parties, déverrouille sur geste et s’arrête sans fuite', async () => {
  const precedentWindow = globalThis.window;
  const ecouteurs = new Map();
  let bloquerAutoplay = true;
  let resoudrePlayDiffere = null;

  class FauxHtmlAudio {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = 'none';
      this.volume = 1;
      this.muted = false;
      this.paused = true;
      this.currentTime = 0;
      this.lectures = 0;
    }
    play() {
      this.lectures += 1;
      if (resoudrePlayDiffere) {
        return new Promise((resolve) => {
          const suite = resoudrePlayDiffere;
          suite(() => {
            this.paused = false;
            resolve();
          });
        });
      }
      if (bloquerAutoplay) return Promise.reject(new Error('NotAllowedError'));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }

  globalThis.window = {
    location: { href: 'http://localhost/' },
    Audio: FauxHtmlAudio,
    addEventListener(type, fn) {
      if (!ecouteurs.has(type)) ecouteurs.set(type, new Set());
      ecouteurs.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      ecouteurs.get(type)?.delete(fn);
    },
  };

  try {
    const lecteur = new RpgMainThemeMusic();
    await lecteur.start();
    assert.equal(lecteur.running, false, 'bloqué avant un geste joueur, le lecteur attend');
    assert.equal(lecteur.audio.loop, true, 'le thème principal tourne en boucle');
    assert.ok((ecouteurs.get('pointerdown')?.size ?? 0) === 1, 'un écouteur de geste est armé');

    // Premier geste utilisateur : déverrouille et lance le thème principal
    bloquerAutoplay = false;
    for (const fn of [...(ecouteurs.get('pointerdown') ?? [])]) fn();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(lecteur.running, true, 'le thème démarre au premier geste');
    assert.equal(lecteur.audio.paused, false);
    assert.equal(ecouteurs.get('pointerdown')?.size ?? 0, 0, 'l’écouteur de geste est désarmé une fois lancé');

    // Changement d’onglet (pause / reprise sans remettre currentTime à zéro)
    lecteur.audio.currentTime = 42;
    lecteur.pause();
    assert.equal(lecteur.paused, true);
    assert.equal(lecteur.audio.paused, true);
    assert.equal(lecteur.audio.currentTime, 42, 'la pause préserve la position de lecture');
    lecteur.resume();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(lecteur.paused, false);
    assert.equal(lecteur.audio.paused, false);

    // Garde contre la course asynchrone : stop() appelé pendant un play() en vol
    lecteur.stop();
    assert.equal(lecteur.audio.currentTime, 0);
    let terminerPlay = null;
    resoudrePlayDiffere = (done) => { terminerPlay = done; };
    const promesseStart = lecteur.start();
    lecteur.stop();
    terminerPlay();
    await promesseStart;
    assert.equal(lecteur.running, false, 'stop() gagne toujours sur un play() en cours');
    assert.equal(lecteur.audio.paused, true, 'aucune fuite du thème principal dans une partie');

    // Relais sans coupure entre écran d’entrée et page du jeu
    resoudrePlayDiffere = null;
    deposerThemePrincipal(lecteur);
    assert.equal(reprendreThemePrincipal(), lecteur);
    assert.equal(reprendreThemePrincipal(), null);

    lecteur.destroy();
    assert.equal(lecteur.audio, null);
  } finally {
    globalThis.window = precedentWindow;
  }
});

test('La Table des Heures, plateau de base aux bougies, joue « Acoustic Guitar Solo (Cover) »', () => {
  const plateauId = 'table-des-heures';
  assert.equal(plateauParId(plateauId)?.nom, 'La Table des Heures');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'le plateau de base doit être traité comme musical');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], '/Acoustic Guitar Solo (Cover).mp3');
  assert.ok(existsSync(new URL('../public/Acoustic Guitar Solo (Cover).mp3', import.meta.url)));
});

test('La Nécropole des dalles, plateau égyptien, joue « Egypt.mp3 »', () => {
  const plateauId = 'necropole-des-dalles';
  assert.equal(plateauParId(plateauId)?.nom, 'La Nécropole des dalles');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'le plateau égyptien doit être traité comme musical');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], '/Egypt.mp3');
  assert.ok(existsSync(new URL('../public/Egypt.mp3', import.meta.url)), 'Egypt.mp3 doit être livré dans public/');
});

test('Le Cimetière des noms effacés et la Fosse jouent « Le Sceau de Sang »', async (t) => {
  // Les deux tables de la Tour Oubliée ont chacune leur instrumental : le
  // cimetière pour la table attitrée, la fosse pour son double merveilleux.
  const pistes = {
    'cimetiere-des-noms-effaces': 'Le Sceau de Sang (Instrumental).mp3',
    'fosse-de-l-oubliee': 'Le Sceau de Sang (Instrumental) (1).mp3',
  };
  for (const [plateauId, fichier] of Object.entries(pistes)) {
    assert.ok(plateauParId(plateauId), `${plateauId} est un plateau du catalogue`);
    assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), `${plateauId} doit être traité comme musical`);
    assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], `/${fichier}`);
    const urlDisque = new URL(`../public/${fichier}`, import.meta.url);
    if (!existsSync(urlDisque)) {
      // Les deux MP3 sont fournis par l'auteur du jeu : tant qu'ils ne sont pas
      // déposés dans public/audio/, les deux plateaux sont muets (aucune boucle
      // d'ambiance ne prend le relais, le plateau étant déclaré musical).
      t.diagnostic(`MP3 pas encore livré : public/${fichier}`);
      continue;
    }
    const octets = readFileSync(urlDisque);
    assert.ok(octets.length > 1_000_000, `${fichier} n’est pas un fichier vide`);
    assert.ok(
      octets.subarray(0, 3).toString('latin1') === 'ID3' || (octets[0] === 0xff && (octets[1] & 0xe0) === 0xe0),
      `${fichier} porte bien un en-tête MP3`,
    );
  }
  assert.notEqual(
    RPG_PLATEAU_MUSIC_FILES['cimetiere-des-noms-effaces'],
    RPG_PLATEAU_MUSIC_FILES['fosse-de-l-oubliee'],
    'les deux tables ne partagent pas la même piste',
  );

  // Le nom contient des espaces et des parenthèses : le lecteur doit retrouver
  // sa source telle quelle, la jouer en boucle, et ne pas la recharger quand on
  // redemande le même plateau.
  const precedentWindow = globalThis.window;
  class FauxAudioSceau {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = 'none';
      this.volume = 1;
      this.muted = false;
      this.paused = true;
      this.currentTime = 0;
    }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  globalThis.window = { location: { href: 'http://localhost/' }, Audio: FauxAudioSceau };
  try {
    const lecteur = new RpgPlateauMusic();
    lecteur.setPlateau('cimetiere-des-noms-effaces', { reroll: true });
    assert.equal(lecteur.musicFile, '/Le Sceau de Sang (Instrumental).mp3');
    await lecteur.start();
    assert.equal(lecteur.running, true);
    assert.equal(lecteur.audio.loop, true);
    assert.equal(lecteur.audio.src, '/Le Sceau de Sang (Instrumental).mp3');
    // On descend dans la fosse : la piste change, sans recréer d'Audio.
    const audioDuCimetiere = lecteur.audio;
    lecteur.setPlateau('fosse-de-l-oubliee', { reroll: true });
    await lecteur.start();
    assert.equal(lecteur.audio, audioDuCimetiere, 'le lecteur garde son Audio');
    assert.equal(lecteur.audio.src, '/Le Sceau de Sang (Instrumental) (1).mp3');
    lecteur.destroy();
  } finally {
    globalThis.window = precedentWindow;
  }
});

test('Le Cercle des corbeaux joue « raspberrymusic - A Vikings.mp3 »', async () => {
  const plateauId = 'cercle-des-corbeaux';
  const fichier = 'raspberrymusic - A Vikings.mp3';
  const urlDisque = new URL(`../public/${fichier}`, import.meta.url);
  assert.equal(plateauParId(plateauId)?.nom, 'Le Cercle des corbeaux');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'la clairière doit être traitée comme musicale');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], `/${fichier}`);
  assert.ok(existsSync(urlDisque), 'la piste viking doit être livrée dans public/');
  assert.ok(readFileSync(urlDisque).length > 1_000_000, 'le MP3 livré n’est pas un fichier vide');

  // Le nom contient des espaces : le lecteur doit quand même retrouver sa
  // source et la jouer en boucle, sans récréer un second Audio à chaque rendu.
  const precedentWindow = globalThis.window;
  class FauxAudioCorbeau {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = 'none';
      this.volume = 1;
      this.muted = false;
      this.paused = true;
      this.currentTime = 0;
    }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  globalThis.window = { location: { href: 'http://localhost/' }, Audio: FauxAudioCorbeau };
  try {
    const lecteur = new RpgPlateauMusic();
    lecteur.setPlateau(plateauId, { reroll: true });
    assert.equal(lecteur.musicFile, `/${fichier}`);
    await lecteur.start();
    assert.equal(lecteur.running, true);
    assert.equal(lecteur.audio.loop, true);
    assert.equal(lecteur.audio.src, `/${fichier}`);
    await lecteur.start();
    assert.equal(lecteur.audio.src, `/${fichier}`, 'le nom à espaces ne déclenche pas un rechargement');
    lecteur.destroy();
    assert.equal(lecteur.audio, null);
  } finally {
    globalThis.window = precedentWindow;
  }
});

test('L’Erg du Sahara joue « Arabian Meditative Fantasy »', () => {
  const plateauId = 'erg-du-sahara';
  const fichier = 'ArabianMeditativeFantasyCover.mp3';
  assert.equal(plateauParId(plateauId)?.nom, 'L’Erg du Sahara');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'le plateau doit être traité comme musical');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], `/audio/${fichier}`);
  assert.ok(existsSync(new URL(`../public/audio/${fichier}`, import.meta.url)), 'le MP3 doit être livré dans public/audio');
});

test('Le Navire Pirate joue la piste dédiée « stepanbel_pirates_main-01.mp3 » en boucle', async () => {
  const plateauId = 'navire-pirate';
  const fichier = 'stepanbel_pirates_main-01.mp3';
  const urlDisque = new URL(`../public/audio/${fichier}`, import.meta.url);
  assert.equal(plateauParId(plateauId)?.nom, 'Le Navire Pirate');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'le navire pirate doit être enregistré comme plateau musical');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], `/audio/${fichier}`);
  assert.ok(existsSync(urlDisque), 'stepanbel_pirates_main-01.mp3 doit être livré dans public/audio/');
  assert.equal(readFileSync(urlDisque).length, 3049104, 'le fichier MP3 pirate d’origine est conservé intact');

  const precedentWindow = globalThis.window;
  class FauxAudioPirate {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = 'none';
      this.volume = 1;
      this.muted = false;
      this.paused = true;
      this.currentTime = 0;
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  globalThis.window = { location: { href: 'http://localhost/' }, Audio: FauxAudioPirate };
  try {
    const lecteur = new RpgPlateauMusic();
    lecteur.setPlateau(plateauId, { reroll: true });
    assert.equal(lecteur.musicFile, `/audio/${fichier}`);
    await lecteur.start();
    assert.equal(lecteur.running, true);
    assert.equal(lecteur.audio.loop, true);
    assert.equal(lecteur.audio.src, `/audio/${fichier}`);
    lecteur.pause();
    assert.equal(lecteur.paused, true);
    lecteur.resume();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(lecteur.paused, false);
    lecteur.destroy();
    assert.equal(lecteur.audio, null);
  } finally {
    globalThis.window = precedentWindow;
  }
});

test('Les Ruines de Tipaza, plateau d’eau, jouent « Sorcerer of the Deep Tide »', () => {
  const plateauId = 'ruines-de-tipaza';
  const fichier = 'SorcererOfTheDeepTide.mp3';
  assert.equal(plateauParId(plateauId)?.nom, 'Les Ruines de Tipaza');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'le plateau doit être traité comme musical');
  assert.equal(RPG_PLATEAU_MUSIC_FILES[plateauId], `/audio/${fichier}`);
  assert.ok(existsSync(new URL(`../public/audio/${fichier}`, import.meta.url)), 'le MP3 doit être livré dans public/audio');
});

test('La Cour de l’Empereur choisit au hasard entre ses deux pistes japonaises', () => {
  const plateauId = 'cour-de-l-empereur';
  const fichiers = [
    '/audio/WayOfTheBushidoWithGeishaVocals.mp3',
    '/CherryBlossomStrings(Extended).mp3',
  ];
  assert.equal(plateauParId(plateauId)?.nom, 'La Cour de l’Empereur');
  assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), 'le plateau doit être traité comme musical');
  assert.deepEqual(RPG_PLATEAU_MUSIC_FILES[plateauId], fichiers);
  assert.ok(existsSync(new URL('../public/audio/WayOfTheBushidoWithGeishaVocals.mp3', import.meta.url)),
    'la piste Bushido existante est conservée');
  assert.ok(existsSync(new URL('../public/CherryBlossomStrings(Extended).mp3', import.meta.url)),
    'la piste Cherry Blossom Strings est livrée dans public/');

  const tirages = [0, 0.99];
  const lecteur = new RpgPlateauMusic(() => tirages.shift());
  lecteur.setPlateau(plateauId, { reroll: true });
  assert.equal(lecteur.musicFile, fichiers[0], 'un tirage peut choisir la piste Bushido existante');
  lecteur.setPlateau(plateauId, { reroll: true });
  assert.equal(lecteur.musicFile, fichiers[1], 'un autre tirage peut choisir Cherry Blossom Strings');
});

test('les deux plateaux enneigés proposent aléatoirement les pistes Viking Howl et « full-track »', () => {
  const fichiers = ['/Viking Howl.mp3', '/Viking Howl (Take 2).mp3', '/audio/full-track.mp3'];
  assert.ok(existsSync(new URL('../public/Viking Howl.mp3', import.meta.url)));
  assert.ok(existsSync(new URL('../public/Viking Howl (Take 2).mp3', import.meta.url)));
  for (const plateauId of ['village-viking', 'iles-celestes']) {
    assert.ok(RPG_PLATEAUX_MUSICAUX.has(plateauId), `${plateauId} doit avoir une musique dédiée`);
    assert.deepEqual(RPG_PLATEAU_MUSIC_FILES[plateauId], fichiers);
  }
  assert.ok(existsSync(new URL('../public/audio/full-track.mp3', import.meta.url)),
    'la piste complète doit être livrée dans public/audio');

  const tirages = [0, 0.5, 0.99];
  const lecteur = new RpgPlateauMusic(() => tirages.shift());
  lecteur.setPlateau('village-viking', { reroll: true });
  assert.equal(lecteur.musicFile, fichiers[0], 'le premier tirage choisit Viking Howl');
  lecteur.setPlateau('village-viking');
  assert.equal(lecteur.musicFile, fichiers[0], 'les mises à jour du duel gardent la même piste');
  lecteur.setPlateau('village-viking', { reroll: true });
  assert.equal(lecteur.musicFile, fichiers[1], 'une nouvelle partie peut tirer Take 2');
  lecteur.setPlateau('iles-celestes');
  assert.equal(lecteur.musicFile, fichiers[2], 'la variante neige peut aussi tirer la piste complète');
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
