// Vérifications de la bande-son de Vice City Rush (src/games/cityRushAudio.js).
// Le contexte Web Audio est remplacé par une doublure qui enregistre ce qui
// est programmé : on peut donc jouer la vraie partition et les vrais
// bruitages sans carte son, et compter les notes plutôt que les écouter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CityRushAudio,
  CITY_RUSH_DEFAULT_BPM,
  CITY_RUSH_ENGINE_GEARS,
  CITY_RUSH_ENGINE_PROFILES,
  CITY_RUSH_LOOP_STEPS,
  CITY_RUSH_MUSIC_BPM,
  CITY_RUSH_TOUGE_BPM,
  cityRushEngineRpm,
  cityRushEngineProfile,
  cityRushMusicBpm,
} from '../src/games/cityRushAudio.js';

/** Un AudioContext en carton : il note tout ce qu'on lui demande. */
function makeContext() {
  const events = [];
  const param = (value = 0) => ({
    value,
    // `first` retient la valeur posée en début de note : un oscillateur qui
    // descend (la grosse caisse 132 → 44 Hz) finit sinon par valoir 44.
    first: undefined,
    setValueAtTime(next) { if (this.first === undefined) this.first = next; this.value = next; return this; },
    linearRampToValueAtTime(next) { this.value = next; return this; },
    exponentialRampToValueAtTime(next) { this.value = next; return this; },
    setTargetAtTime(next) { this.value = next; return this; },
    cancelScheduledValues() { return this; },
  });
  const link = (destination) => destination;
  const context = {
    events,
    currentTime: 0,
    sampleRate: 48000,
    get destination() { return { connect: link }; },
    createGain: () => ({ gain: param(1), connect: link, disconnect() {} }),
    createOscillator() {
      const oscillator = {
        type: 'sine',
        frequency: param(440),
        detune: param(0),
        connect: link,
        start(at) {
          events.push({
            kind: 'osc',
            type: oscillator.type,
            frequency: oscillator.frequency.first ?? oscillator.frequency.value,
            at,
          });
        },
        stop() {},
      };
      return oscillator;
    },
    createBiquadFilter: () => ({ type: 'lowpass', frequency: param(1000), Q: param(1), connect: link }),
    createBufferSource() {
      const source = {
        buffer: null,
        loop: false,
        connect: link,
        start(at = 0, offset = 0, duration = 0) { events.push({ kind: 'noise', at, duration }); },
        stop() {},
      };
      return source;
    },
    createStereoPanner: () => ({ pan: param(0), connect: link }),
    createDynamicsCompressor: () => ({
      threshold: param(-24), knee: param(30), ratio: param(12),
      attack: param(0.003), release: param(0.25), connect: link,
    }),
    createBuffer: (channels, length) => ({
      sampleRate: context.sampleRate,
      length,
      getChannelData: () => new Float32Array(length),
    }),
    resume: async () => {},
    close: () => {},
  };
  return context;
}

/** Installe un `window` minimal, lance le son et rend la main. */
async function boot(cityId = 'vice-city') {
  const audio = new CityRushAudio();
  audio.setCity(cityId);
  globalThis.window = {
    AudioContext: function AudioContext() { return makeContext(); },
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
  await audio.start();
  return audio;
}

const shutdown = (audio) => {
  audio.destroy();
  delete globalThis.window;
};

test('chaque ville a son tempo, Vice City à 122', () => {
  assert.equal(cityRushMusicBpm('vice-city'), 122);
  assert.equal(cityRushMusicBpm('tokyo'), 132);
  assert.equal(cityRushMusicBpm('paris'), 118);
  // La峠道 : eurobeat de col à 130 BPM, constante à part comme la 66 et le Ring.
  assert.equal(cityRushMusicBpm('touge'), 130);
  assert.equal(cityRushMusicBpm('touge'), CITY_RUSH_TOUGE_BPM);
  assert.ok(cityRushMusicBpm('atlantide') === CITY_RUSH_DEFAULT_BPM, 'une ville inconnue retombe sur le tempo par défaut');
  assert.deepEqual(Object.keys(CITY_RUSH_MUSIC_BPM).sort(), ['london', 'mexico-countryside', 'new-york', 'paris', 'tokyo', 'vice-city']);
});

test('start() ouvre le contexte et branche musique, bruitages, moteur et hélico', async () => {
  const audio = await boot();
  try {
    assert.ok(audio.context, 'un contexte audio existe');
    assert.ok(audio.ready(), 'le son est prêt à jouer');
    assert.ok(audio.musicBus && audio.sfxBus && audio.engineBus && audio.heliBus, 'les quatre bus sont créés');
    assert.ok(audio.sirenBus, 'la sirène de police a son bus');
    assert.equal(audio.sirenBus.gain.value, 0, 'la sirène démarre silencieuse');
    assert.ok(audio.limiter, 'un limiteur protège la sortie des explosions par-dessus la musique');
    assert.equal(audio.heliBus.gain.value, 0, "l'hélicoptère démarre silencieux");
    assert.ok(audio.timer !== null, 'le séquenceur tourne');
  } finally { shutdown(audio); }
});

test('le régime moteur remonte dans chaque rapport et tient dans une plage audible', () => {
  const idle = cityRushEngineRpm(0);
  const top = cityRushEngineRpm(1);
  assert.ok(top.frequency > idle.frequency, 'le rupteur est plus haut que le ralenti');
  assert.equal(cityRushEngineRpm(0).gear, 0);
  assert.equal(cityRushEngineRpm(1).gear, CITY_RUSH_ENGINE_GEARS - 1);
  let gearChanges = 0;
  let rechutes = 0;
  let previousGear = 0;
  let previousFrequency = 0;
  for (let step = 0; step <= 200; step += 1) {
    const { gear, frequency } = cityRushEngineRpm(step / 200);
    assert.ok(Number.isFinite(frequency) && frequency > 20 && frequency < 200, `hauteur plausible : ${frequency}`);
    if (gear !== previousGear) { gearChanges += 1; previousGear = gear; }
    else if (frequency < previousFrequency) rechutes += 1;
    previousFrequency = frequency;
  }
  assert.equal(gearChanges, CITY_RUSH_ENGINE_GEARS - 1, 'un passage de vitesse par rapport');
  assert.equal(rechutes, 0, 'le régime ne retombe jamais à l’intérieur d’un rapport');
  assert.ok(cityRushEngineRpm(2).frequency === cityRushEngineRpm(1).frequency, 'les valeurs hors bornes sont écrêtées');
  assert.ok(cityRushEngineRpm(-1).frequency === cityRushEngineRpm(0).frequency);
});

test('la partition disco programme grosse caisse, basse et cuivres à chaque mesure', async () => {
  const audio = await boot('vice-city');
  try {
    const events = audio.context.events;
    const stepLength = 60 / cityRushMusicBpm('vice-city') / 4;
    for (let step = 0; step < CITY_RUSH_LOOP_STEPS; step += 1) audio.playStep(step, step * stepLength);
    assert.ok(events.length > 300, `la boucle de ${CITY_RUSH_LOOP_STEPS} pas est dense (${events.length} événements)`);
    for (const event of events) {
      assert.ok(Number.isFinite(event.at) && event.at >= 0, 'chaque note est datée');
      if (event.kind === 'osc') {
        assert.ok(event.frequency > 0 && event.frequency < 20000, `hauteur plausible : ${event.frequency}`);
      } else {
        assert.ok(event.duration > 0, 'un bruit a toujours une durée');
      }
    }
    // Grosse caisse : une descente de 132 Hz sur chaque temps (4 par mesure).
    const kicks = events.filter((event) => event.kind === 'osc' && Math.abs(event.frequency - 132) < 0.001);
    assert.equal(kicks.length, CITY_RUSH_LOOP_STEPS / 4, 'quatre temps au plancher sur toute la boucle');
    // Le refrain (square aigu) n'entre qu'après la moitié de la boucle.
    const lead = events.filter((event) => event.kind === 'osc' && event.type === 'square' && event.at > 0);
    const leadStart = Math.min(...lead.map((event) => event.at));
    const halfLoop = (CITY_RUSH_LOOP_STEPS / 2) * stepLength;
    assert.ok(leadStart >= halfLoop - 1e-6, `la mélodie attend la mesure 5 (${leadStart} ≥ ${halfLoop})`);
  } finally { shutdown(audio); }
});

test('le séquenceur programme le bon nombre de pas pour le tempo de la ville', async () => {
  const audio = await boot('tokyo');
  try {
    audio.context.currentTime = 0;
    audio.nextTime = 0;
    audio.schedule();
    const stepLength = 60 / cityRushMusicBpm('tokyo') / 4;
    // Fenêtre de 0,12 s : le nombre de pas suit le tempo, il est plus serré
    // à Tokyo (132) qu'à Paris (118).
    // Fenêtre d’avance de 0,12 s : on programme tout ce qui doit l’être,
    // et un pas de plus qu’à Paris (tempo plus lent).
    const expected = Math.ceil(0.12 / stepLength);
    assert.equal(audio.step, expected);
    assert.ok(expected >= Math.ceil(0.12 / (60 / cityRushMusicBpm('paris') / 4)), 'Tokyo programme au moins autant de pas que Paris');
    assert.ok(Math.abs(audio.nextTime - expected * stepLength) < 1e-9);
  } finally { shutdown(audio); }
});

test('les voitures modernes disposent de textures moteur distinctes', () => {
  assert.notEqual(cityRushEngineProfile('volkswagen'), cityRushEngineProfile('porsche'));
  assert.notEqual(cityRushEngineProfile('porsche').edge, cityRushEngineProfile('lamborghini').edge);
  assert.ok(cityRushEngineProfile('electric-gt').electric, 'le groupe électrique a une signature dédiée');
  assert.equal(cityRushEngineProfile('unknown'), CITY_RUSH_ENGINE_PROFILES['city-hatch'], 'un archétype inconnu reste compatible');
});

test('le moteur suit la vitesse : plus haut en turbo, muet à l’arrêt', async () => {
  const audio = await boot();
  try {
    audio.engine({ speed: 0.4, throttle: 0.5 });
    const nodes = audio.engineNodes;
    assert.ok(nodes, 'les nœuds du moteur existent');
    const cruise = nodes.body.oscillator.frequency.value;
    audio.engine({ speed: 0.4, throttle: 0.5, boost: true });
    assert.ok(nodes.body.oscillator.frequency.value > cruise, 'le turbo monte le régime');
    assert.ok(nodes.out.gain.value > 0.0001, 'le moteur s’entend en course');
    audio.engine({ speed: 0, throttle: 0, mute: true });
    assert.ok(nodes.out.gain.value < 0.001, 'couper le son réduit le moteur au silence');
    // Un seul jeu de nœuds : on ne fabrique pas d’oscillateur par image.
    assert.equal(audio.engineNodes, nodes);
  } finally { shutdown(audio); }
});

test('un bonus rouge joue un son mécanique de changement de chargeur', async () => {
  const audio = await boot();
  try {
    const before = audio.context.events.length;
    audio.pickup('pistol');
    const reload = audio.context.events.slice(before);
    const clacks = reload.filter((event) => event.kind === 'noise');
    assert.ok(clacks.length >= 4, 'le rechargement enchaîne plusieurs déclics et bruits mécaniques');
    assert.ok(clacks.some((event) => event.at >= 0.4), 'le dernier verrouillage arrive après l’insertion du chargeur');
    assert.ok(reload.some((event) => event.kind === 'osc' && event.at >= 0.4), 'le verrouillage final a aussi son claquement tonal');
  } finally { shutdown(audio); }
});

test('la traversée d’un mini-garage joue l’atelier : pont, clé à chocs, capot, puis l’accord réparée', async () => {
  const audio = await boot();
  try {
    const before = audio.context.events.length;
    audio.garageRepair({ restored: 2 });
    const repaired = audio.context.events.slice(before);

    // Le pont hydraulique souffle dès la première image.
    const lift = repaired.find((event) => event.kind === 'noise');
    assert.ok(lift && lift.at <= 0.01, 'l’appel d’air du pont part immédiatement');
    assert.ok(lift.duration >= 0.4, 'le pont monte sur une longue tenue');

    // La clé à chocs : une rafale de cliquetis métalliques dans les premiers
    // quarante centièmes, bien plus nombreuse que le simple souffle du pont.
    const ratchet = repaired.filter((event) => event.kind === 'noise' && event.at > 0.07 && event.at < 0.42);
    assert.ok(ratchet.length >= 8, `la clé à chocs claque plusieurs fois (${ratchet.length} coups)`);
    const cliquetis = repaired.filter((event) => event.kind === 'osc' && event.at > 0.07 && event.at < 0.42);
    assert.ok(cliquetis.length >= 8, 'chaque coup de cliquet a sa composante métallique');
    assert.ok(
      cliquetis.every((event) => event.frequency > 250 && event.frequency < 700),
      'les cliquetis restent dans le registre de la clé à chocs',
    );

    // Le capot claque juste avant l’accord.
    assert.ok(
      repaired.some((event) => event.kind === 'osc' && event.at > 0.58 && event.at < 0.62 && event.frequency <= 130),
      'le capot est rabattu dans le grave',
    );

    // L’accord de « réparée » : trois notes claires après le capot.
    const accord = repaired.filter((event) => event.kind === 'osc' && event.at >= 0.73);
    assert.equal(accord.length, 3, 'trois notes de confirmation quand la coque a repris des points');
    assert.ok(accord.every((event) => event.frequency > 500), 'l’accord sonne clair, au-dessus de l’atelier');
  } finally { shutdown(audio); }
});

test('une coque déjà intacte entend l’atelier mais pas l’accord de réparation', async () => {
  const audio = await boot();
  try {
    const before = audio.context.events.length;
    audio.garageRepair({ restored: 0 });
    const events = audio.context.events.slice(before);
    assert.ok(events.length > 10, 'le passage au garage s’entend quand même');
    assert.ok(
      events.every((event) => event.at < 0.73),
      'aucune note de confirmation n’est jouée sans point de vie rendu',
    );
    // Le bruitage reste muet quand le son est coupé.
    audio.stop();
    const stopped = audio.context.events.length;
    audio.garageRepair({ restored: 2 });
    assert.equal(audio.context.events.length, stopped, 'son coupé : l’atelier ne programme plus rien');
  } finally { shutdown(audio); }
});

test('tir, dérapage et explosion programment du son, et se taisent quand le son est coupé', async () => {
  const audio = await boot();
  try {
    audio.gunshot({ pan: -0.4 });
    const afterShot = audio.context.events.length;
    assert.ok(afterShot > 0, 'un coup de feu fabrique du bruit');
    audio.skid({ pan: 0.3, delay: 0.3, intensity: 1 });
    audio.explosion({});
    assert.ok(audio.context.events.length > afterShot, 'le dérapage et l’explosion ajoutent leurs nœuds');
    audio.stop();
    const before = audio.context.events.length;
    audio.gunshot();
    audio.skid();
    audio.explosion();
    audio.missileLaunch();
    audio.pickup('boost');
    audio.pickup('pistol');
    audio.lap(true);
    audio.finish(1);
    audio.countdownBeep(3);
    audio.garageRepair({ restored: 2 });
    assert.equal(audio.context.events.length, before, 'son coupé : plus aucun nœud programmé');
  } finally { shutdown(audio); }
});

test('les primitives audio héritées de l’hélicoptère libèrent leurs nœuds à l’arrêt', async () => {
  const audio = await boot();
  try {
    audio.helicopterStart();
    const nodes = audio.heliNodes;
    assert.ok(nodes, 'les pales tournent');
    // Le gain interne ne doit pas étouffer le rotor : le niveau est piloté
    // par le bus hélicoptère seul (un gain à 0,0001 rendait le rotor muet).
    assert.equal(nodes.out.gain.value, 1);
    assert.ok(audio.heliBus.gain.value > 0.1, 'le rotor monte en régime');
    audio.helicopterStop();
    assert.ok(audio.heliStopTimer !== null, 'l’arrêt est différé : le rotor s’éloigne');
    audio.disposeHelicopter();
    assert.equal(audio.heliNodes, null, 'les nœuds de l’hélicoptère sont libérés');
    assert.equal(audio.heliStopTimer, null);
  } finally { shutdown(audio); }
});

test('la sirène de l’escouade suit la proximité, puis s’éteint', async () => {
  const audio = await boot();
  try {
    audio.policeSiren({ level: 1 });
    const nodes = audio.sirenNodes;
    assert.ok(nodes, 'les deux tons tournent');
    // Comme le rotor : le niveau est piloté par le bus, jamais par le gain
    // interne (un gain à 0,0001 rendrait la sirène muette).
    assert.equal(nodes.out.gain.value, 1);
    assert.equal(nodes.wail.frequency.first ?? nodes.wail.frequency.value, 690);
    assert.ok(audio.sirenBus.gain.value > 0.1, 'la sirène s’entend quand la berline est proche');
    const loud = audio.sirenBus.gain.value;
    audio.policeSiren({ level: 0.15 });
    assert.ok(audio.sirenBus.gain.value < loud, 'elle faiblit quand la berline s’éloigne');
    audio.policeSirenOff();
    assert.equal(audio.sirenState, null);
    assert.ok(audio.sirenStopTimer !== null, 'l’extinction est différée');
    audio.disposeSiren();
    assert.equal(audio.sirenNodes, null, 'les nœuds de la sirène sont libérés');
    assert.equal(audio.sirenStopTimer, null);
  } finally { shutdown(audio); }
});

test('pause et reprise gardent la musique là où elle en était', async () => {
  const audio = await boot();
  try {
    audio.step = 37;
    audio.pause();
    assert.equal(audio.paused, true);
    assert.equal(audio.timer, null, 'le séquenceur s’arrête en pause');
    const before = audio.context.events.length;
    audio.gunshot();
    assert.equal(audio.context.events.length, before, 'pas de bruitage en pause');
    audio.resume();
    assert.equal(audio.paused, false);
    assert.ok(audio.timer !== null, 'le séquenceur repart');
    assert.equal(audio.step, 37, 'la reprise continue la phrase en cours');
  } finally { shutdown(audio); }
});

test('destroy() coupe tout et ferme le contexte', async () => {
  const audio = await boot();
  try {
    audio.engine({ speed: 0.8 });
    audio.helicopterStart();
    audio.destroy();
    assert.equal(audio.context, null);
    assert.equal(audio.running, false);
    assert.equal(audio.engineNodes, null);
    assert.equal(audio.heliNodes, null);
    assert.equal(audio.sirenNodes, null);
    assert.equal(audio.timer, null);
  } finally { delete globalThis.window; }
});

test('le monde déclenche les bruitages au bon endroit', async () => {
  const [world, page] = await Promise.all([
    readFile(new URL('../src/games/ViceCityWorld.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/games/ViceCityRushPage.jsx', import.meta.url), 'utf8'),
  ]);
  // Le moteur est piloté à l’image près par le monde.
  assert.match(world, /audioRef\?\.current\?\.engine\(\{/);
  // Tir rouge d'AK-47 au départ, dérapage de la cible à l'impact.
  assert.match(world, /audioRef\?\.current\?\.machineGun\(\{ pan: vehiclePan\(attackerId\) \}\)/);
  assert.match(world, /audioRef\?\.current\?\.skid\(\{\s*pan: vehiclePan\(target\.id\),/);
  // L'attaque d'hélicoptère est retirée du monde ; les explosions restent
  // utilisées pour les voitures de police détruites et l'épave du pilote.
  assert.doesNotMatch(world, /audioRef\?\.current\?\.helicopterStart\(\)/);
  assert.doesNotMatch(world, /audioRef\?\.current\?\.missileLaunch\(/);
  assert.doesNotMatch(world, /audioRef\?\.current\?\.helicopterStop\(\)/);
  assert.match(world, /audioRef\?\.current\?\.explosion\(/);
  // Tir bleu droit, rafale rouge, zones lentes, ramassages, tours et arrivée.
  assert.match(world, /audioRef\?\.current\?\.gunshot\(\{ pan: vehiclePan\(attackerId\) \}\)/);
  assert.match(world, /audioRef\?\.current\?\.pickup\(type, \{ ready/);
  assert.match(world, /audioRef\?\.current\?\.countdownBeep\(step\)/);
  // Sortie de mini-garage : le bruitage d'atelier, avec les points rendus.
  assert.match(world, /audioRef\?\.current\?\.garageRepair\?\.\(\{ pan: vehiclePan\('player'\), restored: healthRestored \}\)/,
    'le garage joue la réparation et sait combien de points la coque a repris');
  // Escouade de police : sirène pilotée par la proximité, extinction à la fin.
  assert.match(world, /audioRef\?\.current\?\.policeSiren\?\.\(\{/);
  assert.match(world, /audioRef\?\.current\?\.policeSirenOff\?\.\(\)/);
  assert.match(world, /audioRef\?\.current\?\.lap\(finalLap\)/);
  assert.match(world, /audioRef\?\.current\?\.finish\(standings\.rank\)/);
  // La page crée l’instance, la transmet au monde et garde un bouton SON.
  assert.match(page, /new CityRushAudio\(\)/);
  assert.match(page, /audioRef=\{audioRef\}/);
  assert.match(page, /city-rush-sound-button/);
  assert.match(page, /if \(soundOnRef\.current\) audioRef\.current\?\.start\(\)/);
});

test('les bruitages ne sont jamais créés hors d’un contexte vivant', () => {
  const audio = new CityRushAudio();
  assert.equal(audio.ready(), false);
  // Aucun contexte : chaque appel doit sortir sans lever.
  audio.engine({ speed: 1 });
  audio.gunshot();
  audio.skid();
  audio.explosion();
  audio.helicopterStart();
  audio.helicopterStop();
  audio.policeSiren({ level: 1 });
  audio.policeSirenOff();
  audio.disposeSiren();
  audio.pickup('radio');
  audio.garageRepair();
  audio.lap();
  audio.finish();
  audio.crowd();
  audio.pause();
  audio.resume();
  audio.stop();
  audio.destroy();
  assert.equal(audio.engineNodes, null);
});

test('chaque stage / parcours de Vice City Rush a sa propre partition musicale', async () => {
  const cities = ['vice-city', 'tokyo', 'paris', 'london', 'new-york', 'route-66', 'mexico-countryside', 'nordschleife', 'touge'];
  const notesByCity = {};

  for (const cityId of cities) {
    const audio = await boot(cityId);
    try {
      const events = audio.context.events;
      const stepLength = 60 / cityRushMusicBpm(cityId) / 4;
      for (let step = 0; step < CITY_RUSH_LOOP_STEPS; step += 1) {
        audio.playStep(step, step * stepLength);
      }
      assert.ok(events.length > 100, `${cityId} produit une partition riche`);
      const oscFreqs = events.filter((e) => e.kind === 'osc').map((e) => Math.round(e.frequency));
      notesByCity[cityId] = oscFreqs;
    } finally {
      shutdown(audio);
    }
  }

  // Vérifie que toutes les musiques de ville/pays sont distinctes de celle de Vice City et entre elles
  for (let i = 0; i < cities.length; i += 1) {
    for (let j = i + 1; j < cities.length; j += 1) {
      const cityA = cities[i];
      const cityB = cities[j];
      assert.notDeepEqual(
        notesByCity[cityA],
        notesByCity[cityB],
        `La musique de ${cityA} doit être différente de celle de ${cityB}`,
      );
    }
  }
});

