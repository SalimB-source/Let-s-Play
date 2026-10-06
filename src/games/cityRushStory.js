// Mode Histoire « MIDNIGHT REVANCHE » : casting, chapitres, BD et règles.
//
// Le scénario vit ici, en données pures : la page (`ViceCityRushPage.jsx`)
// l'affiche (lecteur BD `CityRushComic.jsx`, briefing, débrief, radio) et le
// monde (`ViceCityWorld.jsx`) applique les règles de course du chapitre
// (`rules`). Rien d'autre ne connaît l'histoire : ajouter un chapitre, une
// réplique ou un défi ne touche qu'à ce fichier.
import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_SPRINT_DISTANCE,
  cityRushCoursePace,
  cityRushRaceDistance,
} from './cityRushRules.js';

// ── Casting ───────────────────────────────────────────────────────────────
// Les personnages sont définis UNE fois et réutilisés partout : cases BD,
// radio en course, grille de départ (Dante en boss), cinématiques. `avatar`
// sert aux petites icônes de HUD ; `comicArt` est le portrait BD canonique,
// toujours réutilisé pour que l’apparence reste identique à chaque réplique.
export const CITY_RUSH_STORY_CAST = Object.freeze({
  narrator: Object.freeze({
    id: 'narrator', name: 'NARRATEUR', short: '…', color: '#9fb2c8', icon: '🎬',
    role: 'Voix off des cartouches jaunes.',
    avatar: null,
  }),
  nico: Object.freeze({
    id: 'nico', name: 'NICO VEGA', short: 'NICO', color: '#43ead5', icon: '🏁',
    role: 'Le pilote. Toi. Peu de mots, que de la conduite.',
    comicArt: 'vice-city-comic-nico.webp',
    avatar: Object.freeze({
      id: 'avatar-nico', skin: '#e8b48c', hair: '#14161f', hairStyle: 'swept',
      accessory: 'mirror-shades', accessoryColor: '#43ead5', outfit: '#1e3a5f',
      trim: '#43ead5', bgStart: '#0e2a3a', bgEnd: '#3a1e4f',
    }),
  }),
  luna: Object.freeze({
    id: 'luna', name: 'LUNA REYES', short: 'LUNA', color: '#ff5db8', icon: '🎧',
    role: 'Mécano-hackeuse. Ta voix radio pendant les courses.',
    comicArt: 'vice-city-comic-luna.webp',
    avatar: Object.freeze({
      id: 'avatar-luna', skin: '#c8875b', hair: '#241428', hairStyle: 'neon-bangs',
      accessory: 'neon-headset', accessoryColor: '#ff5db8', outfit: '#5c2e6e',
      trim: '#ff8ac2', bgStart: '#2a1040', bgEnd: '#501040',
    }),
  }),
  dante: Object.freeze({
    id: 'dante', name: 'DANTE CROSS', short: 'DANTE', color: '#ff3b3b', icon: '😈',
    role: 'Le rival. Trois ans qu’il te doit une explication.',
    comicArt: 'vice-city-comic-dante.webp',
    avatar: Object.freeze({
      id: 'avatar-dante', skin: '#d89b72', hair: '#0f0d12', hairStyle: 'short-fade',
      accessory: 'mirror-shades', accessoryColor: '#ff3b3b', outfit: '#3a0f16',
      trim: '#ff3b3b', bgStart: '#2a060a', bgEnd: '#4f0f1a',
    }),
  }),
  voss: Object.freeze({
    id: 'voss', name: 'MR. VOSS', short: 'VOSS', color: '#c9a44a', icon: '🎩',
    role: 'Le promoteur. L’ombre derrière tout ça.',
    comicArt: 'vice-city-comic-voss.webp',
    avatar: Object.freeze({
      id: 'avatar-voss', skin: '#f1c2a0', hair: '#c9c9c9', hairStyle: 'swept',
      accessory: 'octagon-gold', accessoryColor: '#c9a44a', outfit: '#2b2b33',
      trim: '#c9a44a', bgStart: '#1a1a22', bgEnd: '#3d2f14',
    }),
  }),
  marlow: Object.freeze({
    id: 'marlow', name: 'SGT. MARLOW', short: 'MARLOW', color: '#48b9ff', icon: '🚨',
    role: 'Flic obsessionnel. Il te veut, vivant de préférence.',
    comicArt: 'vice-city-comic-marlow.webp',
    avatar: Object.freeze({
      id: 'avatar-marlow', skin: '#9e6240', hair: '#151218', hairStyle: 'cap-back',
      accessory: 'aviator-gold', accessoryColor: '#ffd44f', outfit: '#1b3a6e',
      trim: '#48b9ff', bgStart: '#0a1e3a', bgEnd: '#123a5c',
    }),
  }),
});

export function storyCastMember(id) {
  return CITY_RUSH_STORY_CAST[id] || CITY_RUSH_STORY_CAST.narrator;
}

/** Portrait BD canonique du personnage, identique à chacune de ses répliques. */
export function storyCastComicArt(id) {
  return storyCastMember(id).comicArt || null;
}

// ── Visuels des cases ─────────────────────────────────────────────────────
// Chaque chapitre a son image de ville ; les chapitres d’action ont parfois
// une variante « poursuite », sinon la ville sert de repli.
const STORY_CITY_ART = Object.freeze({
  'vice-city': 'vice-city-story-vice-city.webp',
  'new-york': 'vice-city-story-new-york.webp',
  tokyo: 'vice-city-story-tokyo.webp',
  paris: 'vice-city-story-paris.webp',
  london: 'vice-city-story-london.webp',
  'route-66': 'vice-city-story-route-66.jpg',
  'mexico-countryside': 'vice-city-story-mexico-countryside.jpg',
  nordschleife: 'vice-city-story-nordschleife.jpg',
});
const STORY_ACTION_ART = Object.freeze({
  'vice-city': 'vice-city-action-finale.webp',
  'new-york': 'vice-city-action-new-york.webp',
  paris: 'vice-city-action-paris.webp',
});

/** Fichier d’image d’une case (`city` par défaut, `action` en poursuite). */
export function storyArtFor(chapter, kind = 'city') {
  const cityId = chapter?.city || 'vice-city';
  if (kind === 'action') return STORY_ACTION_ART[cityId] || STORY_CITY_ART[cityId] || STORY_CITY_ART['vice-city'];
  return STORY_CITY_ART[cityId] || STORY_CITY_ART['vice-city'];
}

// ── Objectifs, défis et étoiles ────────────────────────────────────────────
// Les vérifications sont des codes évalués sur le bilan de course
// (`result` du monde : place, chrono, casse, tirs, police détruite…).
// `ctx` porte les valeurs calculées par la page (vitesse de pointe pour le
// chrono de référence du Sprint, chrono cible du Ring).
export function evaluateStoryCheck(check, result = {}, ctx = {}) {
  const code = typeof check === 'string' ? check : check?.code;
  const rank = Number(result?.rank);
  const finished = !result?.destroyed && !result?.timedOut;
  const healthLeft = Number(result?.healthLeft);
  const healthMax = Math.max(1, Number(result?.healthMax) || 1);
  const duration = Number(result?.duration) || Infinity;
  switch (code) {
    case 'win': return finished && rank === 1;
    case 'podium': return finished && rank >= 1 && rank <= 2;
    case 'finish': return finished;
    case 'sprint-done': return Boolean(result?.sprint) && !result?.timedOut;
    case 'scripted': return true; // le prologue fait avancer l’histoire, quoi qu’il arrive
    case 'health-half': return finished && healthLeft / healthMax >= 0.5;
    case 'health-left-3': return finished && healthLeft >= 3;
    case 'no-shots': return finished && (Number(result?.shotsFired) || 0) === 0;
    case 'no-hits': return finished && (Number(result?.hitsTaken) || 0) === 0;
    case 'police-1': return finished && (Number(result?.policeDestroyed) || 0) >= 1;
    case 'police-2': return finished && (Number(result?.policeDestroyed) || 0) >= 2;
    case 'pickups-10': return finished && (Number(result?.pickups) || 0) >= 10;
    case 'margin-100': return finished && rank === 1 && (Number(result?.margin) || 0) >= 100;
    case 'margin-150': return finished && rank === 1 && (Number(result?.margin) || 0) >= 150;
    case 'lead-at-breakdown': return (Number(result?.rankAtBreakdown) || 9) === 1;
    case 'clean-at-breakdown':
      return (Number(result?.rankAtBreakdown) || 9) === 1 && (Number(result?.hitsTaken) || 0) === 0;
    case 'time-target': return finished && duration <= (Number(ctx.targetTime) || Infinity);
    case 'time-95': return finished && duration <= (Number(ctx.targetTime) || Infinity) * 0.95;
    case 'time-90': return finished && duration <= (Number(ctx.targetTime) || Infinity) * 0.9;
    case 'sprint-par': return finished && duration <= (Number(ctx.sprintPar) || Infinity);
    case 'sprint-par-90': return finished && duration <= (Number(ctx.sprintPar) || Infinity) * 0.9;
    default: return false;
  }
}

export function checkStoryObjective(chapter, result, ctx = {}) {
  if (!chapter) return false;
  if (chapter.objective?.type === 'scripted') return true;
  return evaluateStoryCheck(chapter.objective?.check || 'win', result, ctx);
}

/** Étoiles d’une course : 1 pour l’objectif, +1 par défi rempli. */
export function storyStarsForChapter(chapter, result, ctx = {}) {
  if (!chapter || !checkStoryObjective(chapter, result, ctx)) {
    return { stars: 0, met: false, two: false, three: false };
  }
  const two = evaluateStoryCheck(chapter.stars?.two?.check, result, ctx);
  const three = evaluateStoryCheck(chapter.stars?.three?.check, result, ctx);
  return { stars: 1 + (two ? 1 : 0) + (three ? 1 : 0), met: true, two, three };
}

// Chrono cible du Ring : le temps parfait de la TEMPESTA prêtée par Voss,
// margé de 35 % pour la circulation et les 73 virages.
export function storyRingTargetTime() {
  const chapter = CITY_RUSH_STORY_CHAPTERS.find((entry) => entry.id === 'ring');
  const car = CITY_RUSH_CARS.find((entry) => entry.id === chapter?.fixedCarId) || CITY_RUSH_CARS[0];
  const course = CITY_RUSH_COURSES.find((entry) => entry.id === chapter?.city) || null;
  const topSpeed = CITY_RUSH_PLAYER_SPEED * (Number(car.powerMultiplier) || 1) * cityRushCoursePace(course);
  const distance = cityRushRaceDistance(chapter?.laps || 3);
  return Math.ceil(((distance / Math.max(1, topSpeed)) * 1.35) / 5) * 5;
}

// Chrono de référence du Sprint : le temps parfait de la voiture engagée,
// margé de 30 %. Le SPRINT suit déjà la voiture (bonus par checkpoint) : la
// référence aussi, sinon la citadine ne pourrait jamais viser les étoiles.
export function storySprintParTime(playerTopSpeed) {
  const top = Math.max(1, Number(playerTopSpeed) || CITY_RUSH_PLAYER_SPEED);
  return Math.ceil(((CITY_RUSH_SPRINT_DISTANCE / top) * 1.3) / 5) * 5;
}

// ── Chapitres ─────────────────────────────────────────────────────────────
// Une case BD = `{ art, caption, bubbles, sfx }` :
// - `art` : 'city' | 'action' | { portrait: 'dante' } (gros plan du perso) ;
// - `caption` : cartouche jaune du narrateur (optionnel) ;
// - `bubbles` : bulles révélées une par une au clic, `{ who, text }` ;
// - `sfx` : onomatopée géante (optionnel).
// La radio en course reprend le même casting (`who`) : les voix de la BD
// sont celles qu’on entend au volant.
export const CITY_RUSH_STORY_CHAPTERS = Object.freeze([
  Object.freeze({
    id: 'prologue', title: '1983 : VICTOIRE VOLÉE', act: 1, actTitle: 'CENDRES', year: '1983',
    city: 'vice-city', sceneKind: 'action',
    race: Object.freeze({ name: 'Ocean Drive — Grand Prix d’été', type: 'Course classique', route: 'Ocean Drive · South Beach · Collins Avenue' }),
    format: 'laps', laps: 2, policeFromStart: false,
    fixedCarId: 'city-hatch',
    rules: Object.freeze({
      weaponsEnabled: true, policeEnabled: false,
      breakdown: Object.freeze({ warnShare: 0.62, failShare: 0.8 }),
    }),
    boss: null,
    objective: Object.freeze({ type: 'scripted', check: 'scripted', label: 'MÈNE LA COURSE !', detail: 'Tiens la tête… jusqu’au drame.' }),
    cash: Object.freeze({ type: 'flat', amount: 0 }),
    tip: 'Ta MISTRAL est lente mais incassable : faufile-toi, pas de panique.',
    recap: '',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'OCEAN DRIVE, 1983. Le Grand Prix d’été. 40 000 spectateurs.', bubbles: Object.freeze([{ who: 'nico', text: 'Deux tours. C’est tout ce qui me sépare de la coupe.' }]) }),
        Object.freeze({ art: { portrait: 'dante' }, bubbles: Object.freeze([{ who: 'dante', text: 'Vega… Profite du soleil. Il se couche vite, en Floride.' }, { who: 'nico', text: 'Sur la piste, Dante. Pas dans les stands.' }]) }),
        Object.freeze({ art: 'action', sfx: 'VROOM !', caption: '3… 2… 1… GO !', bubbles: Object.freeze([]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: { portrait: 'dante' }, caption: 'TA VOITURE S’EST ARRÊTÉE À 500 M DE LA LIGNE. « Panne moteur », dit le rapport.', bubbles: Object.freeze([{ who: 'dante', text: 'Oh… quel dommage. Un problème mécanique, paraît-il.' }, { who: 'nico', text: 'Ce n’était pas une panne. Je le sais.' }]) }),
        Object.freeze({ art: 'city', caption: 'DISQUALIFIÉ. RUINÉ. OUBLIÉ. Nico Vega disparaît pendant trois ans.', bubbles: Object.freeze([{ who: 'nico', text: 'ET JE REVIENDRAI.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'dante' }, caption: 'ÉPAVE AVANT MÊME LA PANNE. La honte est totale.', bubbles: Object.freeze([{ who: 'dante', text: 'Rentre chez toi, Vega. La piste n’est pas pour toi.' }, { who: 'nico', text: '…Il a raison. Cette fois. Mais l’histoire ne finit pas là.' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'nico', text: 'Allez, ma belle. Deux tours et on est des légendes.' }),
      Object.freeze({ on: 'warn', who: 'nico', text: 'Ce bruit… C’est quoi, ce bruit ?!' }),
      Object.freeze({ on: 'breakdown', who: 'nico', text: 'NON ! Le moteur… il me LÂCHE !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'En tête au moment de la panne', check: 'lead-at-breakdown' }),
      three: Object.freeze({ label: '…sans une égratignure', check: 'clean-at-breakdown' }),
    }),
  }),
  Object.freeze({
    id: 'retour', title: 'LE RETOUR', act: 1, actTitle: 'CENDRES', year: '1986',
    city: 'vice-city', sceneKind: 'dialogue',
    race: Object.freeze({ name: 'Ocean Drive — Sunset Run', type: 'Course côtière', route: 'Ocean Drive · South Beach · Collins Avenue' }),
    format: 'laps', laps: 4, policeFromStart: false,
    fixedCarId: null,
    rules: Object.freeze({ weaponsEnabled: true, policeEnabled: true }),
    boss: null,
    objective: Object.freeze({ type: 'win', check: 'win', label: 'FINIS 1ER', detail: 'Gagne pour que Dante te parle.' }),
    cash: Object.freeze({ type: 'rank' }),
    tip: 'L’AK-47 se ramasse en bonus rouge : 7 balles par chargeur.',
    recap: '1983 : ta victoire volée par une « panne » signée Dante Cross. Trois ans d’exil. Te voilà de retour.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: '1986. OCEAN DRIVE. Trois ans plus tard. Une enveloppe rouge t’attend au départ.', bubbles: Object.freeze([{ who: 'dante', text: '« Gagne cette course, minable, et je te dirai qui a touché à ton moteur. — D. »' }, { who: 'nico', text: 'Il veut jouer ? ON VA JOUER.' }]) }),
        Object.freeze({ art: 'action', sfx: 'GO !', bubbles: Object.freeze([]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: { portrait: 'dante' }, bubbles: Object.freeze([{ who: 'nico', text: 'Première étape. Où est mon nom, Dante ?' }, { who: 'dante', text: 'NEW YORK. L’entrepôt du port. Viens seul… si tu l’oses.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'dante' }, bubbles: Object.freeze([{ who: 'dante', text: 'Pathétique. Reviens quand tu sauras piloter.' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'nico', text: 'La maison… Rien n’a changé. Sauf moi.' }),
      Object.freeze({ on: 'half', who: 'nico', text: 'Mi-course. Cette coupe, je la sens.' }),
      Object.freeze({ on: 'finallap', who: 'nico', text: 'Dernier tour. Pour 1983 !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Victoire avec +50 % de coque', check: 'health-half' }),
      three: Object.freeze({ label: '…et une berline détruite', check: 'police-1' }),
    }),
  }),
  Object.freeze({
    id: 'heat', title: 'HEAT RUN', act: 1, actTitle: 'CENDRES', year: '1986',
    city: 'new-york', sceneKind: 'action',
    race: Object.freeze({ name: 'Midtown — Heat Run', type: 'Échappée urbaine', route: 'Times Square · Broadway · Midtown Tunnel' }),
    format: 'laps', laps: 3, policeFromStart: true,
    fixedCarId: null,
    rules: Object.freeze({ weaponsEnabled: true, policeEnabled: true }),
    boss: null,
    objective: Object.freeze({ type: 'survive', check: 'finish', label: 'SURVIS ! FINIR = GAGNER', detail: 'La place ne compte pas. Reste en vie.' }),
    cash: Object.freeze({ type: 'rank' }),
    tip: 'Pas besoin de gagner : évite les chocs, fonce, et traverse le mini-garage à mi-course.',
    recap: 'Dante t’a donné rendez-vous à New York. L’entrepôt du port… était vide.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'MIDTOWN, 23H12. L’entrepôt est vide. C’ÉTAIT UN PIÈGE.', sfx: 'WOUU-WOUU !', bubbles: Object.freeze([]) }),
        Object.freeze({ art: { portrait: 'marlow' }, bubbles: Object.freeze([{ who: 'marlow', text: 'NICO VEGA ! Coupez le moteur ! Vous êtes en état d’arrestation !' }]) }),
        Object.freeze({ art: { portrait: 'luna' }, caption: 'Une voix inconnue crépite dans ta radio…', bubbles: Object.freeze([{ who: 'luna', text: 'Ici Luna ! Si tu veux voir demain, tu suis mes instructions. GO GO GO !' }, { who: 'nico', text: 'Et t’es qui, toi ?!' }, { who: 'luna', text: 'Ton ange gardien. Maintenant, PILOTE !' }]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: { portrait: 'luna' }, bubbles: Object.freeze([{ who: 'luna', text: 'Pas mal, pour un retraité. Prochaine étape : l’OUEST. La Mother Road.' }, { who: 'nico', text: 'Pourquoi tu m’aides ?' }, { who: 'luna', text: 'Disons que Dante me doit… de l’argent. Beaucoup d’argent.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'luna' }, bubbles: Object.freeze([{ who: 'luna', text: 'Respire ! On ne meurt pas ce soir. On recommence !' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: 'Trois patrouilles sur toi ! Ne t’arrête JAMAIS !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Tiens bon ! Le tunnel est juste devant !' }),
      Object.freeze({ on: 'wanted', who: 'luna', text: 'Ils appellent des renforts ! Sème-les !' }),
      Object.freeze({ on: 'hit', who: 'luna', text: 'Aïe… Évite-les au lieu de les embrasser !' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'Dernier tour ! Montre-leur ce qu’un Vega a dans le ventre !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Survis ET sur le podium', check: 'podium' }),
      three: Object.freeze({ label: '…et une berline détruite', check: 'police-1' }),
    }),
  }),
  Object.freeze({
    id: 'mother-road', title: 'MOTHER ROAD', act: 2, actTitle: 'LA FUITE', year: '1986',
    city: 'route-66', sceneKind: 'action',
    race: Object.freeze({ name: 'Historic 66 — Westbound Run', type: 'Poursuite sur route', route: 'Chicago · Amarillo · Santa Monica' }),
    format: 'laps', laps: 3, policeFromStart: true,
    fixedCarId: null,
    rules: Object.freeze({ weaponsEnabled: true, policeEnabled: true }),
    boss: null,
    objective: Object.freeze({ type: 'win', check: 'win', label: 'FINIS 1ER MALGRÉ LA POLICE', detail: 'Gagne ET sème Marlow.' }),
    cash: Object.freeze({ type: 'rank' }),
    tip: 'Le contresens charge un bonus de vitesse : risqué, mais payant.',
    recap: 'En fuite, guidé par Luna. Direction l’ouest : un contact vous attend à Santa Monica.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'HISTORIC 66. 3 940 KM de poussière et de néons.', bubbles: Object.freeze([{ who: 'marlow', text: 'Avis à toutes les unités : Vega roule vers l’ouest. BARREZ LA ROUTE.' }]) }),
        Object.freeze({ art: { portrait: 'luna' }, bubbles: Object.freeze([{ who: 'luna', text: 'Ils ont des barrages jusqu’à Santa Monica. Alors on passe… À FOND.' }, { who: 'nico', text: 'J’ai toujours aimé les road-trips.' }]) }),
        Object.freeze({ art: 'action', sfx: 'VROOM !', bubbles: Object.freeze([]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: 'city', caption: 'SANTA MONICA PIER. Le Pacifique. Le contact de Luna t’attend.', bubbles: Object.freeze([{ who: 'luna', text: 'Le dossier est au sud. Chez mon oncle. Au Mexique.' }, { who: 'nico', text: 'Le Mexique ? Sérieux ?' }, { who: 'luna', text: 'Tacos, soleil, et aucune extradition. Parfait, non ?' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'marlow' }, bubbles: Object.freeze([{ who: 'marlow', text: 'On t’a perdu… CETTE FOIS.' }, { who: 'luna', text: 'On refait la route. Plus vite, plus malin !' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: 'Bienvenue sur la Mother Road ! Les flics sont partout, le soleil est gratuit.' }),
      Object.freeze({ on: 'wanted', who: 'luna', text: 'Barrage en approche ! Fonce ou contourne, mais ne freine pas !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Mi-chemin ! Santa Monica sent déjà l’iode…' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'Dernier tronçon ! La jetée est au bout !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Victoire avec +50 % de coque', check: 'health-half' }),
      three: Object.freeze({ label: 'Nettoie la route : 2 berlines détruites', check: 'police-2' }),
    }),
  }),
  Object.freeze({
    id: 'camino', title: 'CAMINO DEL SOL', act: 2, actTitle: 'LA FUITE', year: '1986',
    city: 'mexico-countryside', sceneKind: 'dialogue',
    race: Object.freeze({ name: 'Carretera 45 — Camino del Sol', type: 'Course pure, sans armes', route: 'Zacatecas · Rancho Nuevo · San Luis Potosí' }),
    format: 'laps', laps: 3, policeFromStart: false,
    fixedCarId: null,
    rules: Object.freeze({ weaponsEnabled: false, policeEnabled: false }),
    boss: null,
    objective: Object.freeze({ type: 'win', check: 'win', label: 'FINIS 1ER — SANS ARMES', detail: 'Pas d’AK-47, pas de police. Que du pilotage.' }),
    cash: Object.freeze({ type: 'rank' }),
    tip: 'Aucune arme sur cette course : les pads turbo verts sont tes seuls amis.',
    recap: 'Planque au Mexique, chez l’oncle de Luna. Pour payer le vol vers Tokyo : gagner la course locale.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'MEXIQUE. La planque de l’oncle Reyes. Agaves, soleil, silence.', bubbles: Object.freeze([{ who: 'luna', text: 'Ici, pas de flics, pas d’armes. Juste toi, la route, et ta fierté.' }, { who: 'nico', text: 'Une vraie course, pour changer…' }, { who: 'luna', text: 'Gagne, et mon oncle te paie le vol pour Tokyo. Perds… et tu laves la vaisselle.' }]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: 'city', caption: 'BILLET POUR TOKYO : OBTENU.', bubbles: Object.freeze([{ who: 'luna', text: 'Direction le Japon ! Le mécano de Dante veut vendre le dossier.' }, { who: 'nico', text: 'Cette fois, pas de piège ?' }, { who: 'luna', text: '…Probablement un piège.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'luna' }, bubbles: Object.freeze([{ who: 'luna', text: 'La vaisselle t’attend ! …Allez, on refait la course.' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: 'Respire le désert ! Course propre, mains douces !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Magnifique trajectoire ! Tu me donnes des frissons !' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'Dernier tour ! L’avion pour Tokyo décolle avec ou sans toi !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Victoire sans une égratignure', check: 'no-hits' }),
      three: Object.freeze({ label: '…et 10 bonus ramassés', check: 'pickups-10' }),
    }),
  }),
  Object.freeze({
    id: 'midnight', title: 'MIDNIGHT LOOP', act: 3, actTitle: 'LA TRAQUE', year: '1986',
    city: 'tokyo', sceneKind: 'action',
    race: Object.freeze({ name: 'Shutō C1 — Midnight Loop', type: 'Sprint : livraison du dossier', route: '日本橋 · 霞が関 · 芝公園 · 汐留トンネル' }),
    format: 'sprint', laps: 1, policeFromStart: false,
    fixedCarId: null,
    rules: Object.freeze({ weaponsEnabled: false, policeEnabled: false }),
    boss: null,
    objective: Object.freeze({ type: 'sprint', check: 'sprint-done', label: 'LIVRE LE DOSSIER À TEMPS', detail: '16 checkpoints. Le chrono ne pardonne pas.' }),
    cash: Object.freeze({ type: 'flat', amount: 30 }),
    tip: 'Chaque portique recharge le chrono. Vise les pads turbo verts !',
    recap: 'Tokyo. Le mécano de Dante veut vendre le dossier… au pied du péage de Takarachō.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'TOKYO. Péage de Takarachō, 00H47.', bubbles: Object.freeze([{ who: 'luna', text: 'L’échange tourne mal ! Prends le dossier et FONCE ! La C1, tour complet, pas d’arrêt !' }, { who: 'nico', text: '14 km de viaduc… sans freins ?' }, { who: 'luna', text: 'AVEC les freins, idiot ! Mais vite !' }]) }),
        Object.freeze({ art: 'action', sfx: 'GO !', bubbles: Object.freeze([]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: { portrait: 'luna' }, caption: 'DOSSIER LIVRÉ. Luna l’ouvre… et devient blanche.', bubbles: Object.freeze([{ who: 'luna', text: 'J’ai lu le dossier… Nico. Ça parle d’un certain VOSS. Un promoteur.' }, { who: 'nico', text: 'Dante n’était qu’un pion ?' }, { who: 'luna', text: 'Direction PARIS. Dante s’y cache. On va lui rendre visite.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'luna' }, bubbles: Object.freeze([{ who: 'luna', text: 'Le chrono a gagné… Recommence, le dossier n’attend pas !' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: 'Les hommes de Dante sont derrière ! Chaque portique compte !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Mi-anneau ! Le palais est à ta gauche, les ennuis derrière !' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'Derniers portiques ! Ne regarde pas le chrono, PILOTE !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Sous le chrono de référence', check: 'sprint-par' }),
      three: Object.freeze({ label: '…avec 10 % de marge', check: 'sprint-par-90' }),
    }),
  }),
  Object.freeze({
    id: 'duel', title: 'MARCHÉ DE DUPES', act: 3, actTitle: 'LA TRAQUE', year: '1986',
    city: 'paris', sceneKind: 'action',
    race: Object.freeze({ name: 'Rive Gauche — Redline Duel', type: 'Duel contre Dante Cross', route: 'Saint-Germain · Quai de Conti · Boulevard Saint-Michel' }),
    format: 'laps', laps: 3, policeFromStart: false,
    fixedCarId: null,
    rules: Object.freeze({
      weaponsEnabled: true, policeEnabled: false,
      rivalCarIds: Object.freeze({ juno: 'city-hatch' }),
      rivalPace: Object.freeze({ nova: 1.05 }),
    }),
    boss: Object.freeze({ racerId: 'nova', label: 'DANTE CROSS — BOSS' }),
    objective: Object.freeze({ type: 'win', check: 'win', label: 'BATS DANTE !', detail: 'Finis 1er. Lui ne doit pas gagner.' }),
    cash: Object.freeze({ type: 'rank' }),
    tip: 'Dante est boosté : utilise turbo, ligne propre et contresens pour le distancer.',
    recap: 'Paris. Dante se cache rive gauche. Cette fois, pas de piège : un duel.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'PARIS, RIVE GAUCHE. L’heure du duel.', bubbles: Object.freeze([{ who: 'dante', text: 'Vega… Tu as suivi mes miettes jusqu’ici. Impressionnant.' }, { who: 'nico', text: 'Plus de pièges, Dante. Toi. Moi. Trois tours.' }, { who: 'dante', text: 'Et si je gagne, tu disparais. Pour de bon.' }]) }),
        Object.freeze({ art: { portrait: 'luna' }, bubbles: Object.freeze([{ who: 'luna', text: 'Nico, fais attention… il a modifié sa voiture. Il ne joue pas franc-jeu.' }]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: { portrait: 'dante' }, bubbles: Object.freeze([{ who: 'dante', text: 'Impossible… IMPOSSIBLE !' }, { who: 'nico', text: 'Le nom, Dante. TOUT DE SUITE.' }, { who: 'dante', text: 'VOSS… Le promoteur VOSS ! C’est lui qui a tout commandité !' }]) }),
        Object.freeze({ art: 'city', caption: 'Dante s’enfuit dans la nuit parisienne. Mais tu tiens ton nom : VOSS.', bubbles: Object.freeze([]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'dante' }, bubbles: Object.freeze([{ who: 'dante', text: 'Toujours second, Vega. Toujours.' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: 'C’est lui ! Reste collé à son pare-chocs !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Il zigzague ! Il te provoque ! Ne mords pas !' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'TOUT DONNER ! C’est maintenant ou jamais !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Bats Dante avec 100 m d’avance', check: 'margin-100' }),
      three: Object.freeze({ label: '…à la loyale, sans AK-47', check: 'no-shots' }),
    }),
  }),
  Object.freeze({
    id: 'ombres', title: 'LA SOIRÉE DES OMBRES', act: 3, actTitle: 'LA TRAQUE', year: '1986',
    city: 'london', sceneKind: 'action',
    race: Object.freeze({ name: 'Soho — After Hours', type: 'Survie : coque fragile', route: 'Piccadilly Circus · Soho · Tower Bridge' }),
    format: 'laps', laps: 3, policeFromStart: false,
    fixedCarId: null,
    rules: Object.freeze({ weaponsEnabled: true, policeEnabled: true, playerHealthOverride: 6 }),
    boss: null,
    objective: Object.freeze({ type: 'podium', check: 'podium', label: 'PODIUM — COQUE FRAGILE', detail: '6 carrés de vie. Finis 1er ou 2e.' }),
    cash: Object.freeze({ type: 'rank' }),
    tip: 'Ta coque est fragile : les trousses « + » rouges réparent 1 carré.',
    recap: 'Londres. Réception privée du promoteur Voss. Tu t’y es invité… en costume.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'LONDRES, SOHO. Réception privée de Mr. Voss. Champagne et secrets.', bubbles: Object.freeze([{ who: 'voss', text: 'Brûlez les preuves. Et trouvez-moi ce Vega…' }, { who: 'nico', text: 'Luna, tu entends ça ?!' }, { who: 'luna', text: 'FUIS ! Les gardes arrivent ! Ta voiture est en sale état, ménage-la !' }]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: { portrait: 'voss' }, bubbles: Object.freeze([{ who: 'voss', text: 'Intéressant… Ce Vega a du talent. AMENEZ-LE MOI.' }, { who: 'luna', text: 'Voss veut te voir ! Il te lance un défi : le Nürburgring. Le Ring.' }, { who: 'nico', text: 'L’enfer vert… 20 km, 73 virages.' }, { who: 'luna', text: 'Bats son chrono, et il te reçoit.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'luna' }, bubbles: Object.freeze([{ who: 'luna', text: 'Ta voiture n’a pas tenu… On la répare et on y retourne !' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: 'Ta coque est fragile ! Chaque choc compte DOUBLE !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Ils sont partout ! Reste en vie, c’est tout ce qui compte !' }),
      Object.freeze({ on: 'hit', who: 'luna', text: 'NON ! Ta coque ! …Respire, elle tient encore.' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'Tiens jusqu’au bout ! Le podium est à portée !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Gagne au lieu de survivre', check: 'win' }),
      three: Object.freeze({ label: '…avec 3+ carrés de coque', check: 'health-left-3' }),
    }),
  }),
  Object.freeze({
    id: 'ring', title: 'L’ÉPREUVE DU RING', act: 3, actTitle: 'LA TRAQUE', year: '1986',
    city: 'nordschleife', sceneKind: 'action',
    race: Object.freeze({ name: 'Nordschleife — Le défi Voss', type: 'Contre-la-montre', route: 'Antoniusbuche · Karussell · Döttinger Höhe' }),
    format: 'laps', laps: 3, policeFromStart: false,
    fixedCarId: 'toro-v12',
    rules: Object.freeze({ weaponsEnabled: true, policeEnabled: false }),
    boss: null,
    objective: Object.freeze({ type: 'time', check: 'time-target', label: 'BATS LE CHRONO DE VOSS', detail: 'Le chrono cible, pas la place, décide.' }),
    cash: Object.freeze({ type: 'flat', amount: 40 }),
    tip: 'Voss te prête la TEMPESTA : 179 km/h de pointe. Ne la rends pas en pièces.',
    recap: 'Le Nürburgring. Le défi de Voss : bats son chrono sur l’enfer vert, et il te recevra.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'NÜRBURGRING. L’ENFER VERT. 20,832 KM. 73 VIRAGES.', bubbles: Object.freeze([{ who: 'voss', text: 'Voici ma proposition, Vega : bats mon chrono sur le Ring, et je te dirai tout. Échoue… et disparais.' }, { who: 'luna', text: 'Il te prête un monstre : la TEMPESTA. Ne la raye pas… enfin, si, raye-la. C’est SA voiture.' }, { who: 'nico', text: 'Un chrono. Rien d’autre. Que la piste et moi.' }]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: { portrait: 'voss' }, bubbles: Object.freeze([{ who: 'voss', text: '…Impressionnant. Très bien. VICE CITY. La finale. Dante contre toi. Je regarderai.' }, { who: 'luna', text: 'C’est un piège, évidemment.' }, { who: 'nico', text: 'Évidemment. On y va quand même.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'voss' }, bubbles: Object.freeze([{ who: 'voss', text: 'Trop lent, Vega. Le Ring ne pardonne pas. …Recommence.' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: '73 virages ! Ne cherche pas la bagarre, cherche la TRAJECTOIRE !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Tu es dans le rythme ! La Döttinger Höhe arrive, PIED AU PLANCHER !' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'Plus que le chrono et toi ! TOUT !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Bats le chrono avec 5 % de marge', check: 'time-95' }),
      three: Object.freeze({ label: '…avec 10 % de marge', check: 'time-90' }),
    }),
  }),
  Object.freeze({
    id: 'finale', title: 'LE DERNIER TOUR', act: 3, actTitle: 'LA TRAQUE', year: '1986',
    city: 'vice-city', sceneKind: 'action',
    race: Object.freeze({ name: 'Vice City — Last Lap', type: 'Finale : Dante + police de Voss', route: 'Ocean Drive · Starfish Island · Vice City Docks' }),
    format: 'laps', laps: 5, policeFromStart: false,
    fixedCarId: null,
    rules: Object.freeze({
      weaponsEnabled: true, policeEnabled: true,
      rivalPace: Object.freeze({ nova: 1.06 }),
    }),
    boss: Object.freeze({ racerId: 'nova', label: 'DANTE CROSS — BOSS FINAL' }),
    objective: Object.freeze({ type: 'win', check: 'win', label: 'FINALE : FINIS 1ER', detail: 'Dante, la police de Voss, la herse. Tout. En même temps.' }),
    cash: Object.freeze({ type: 'rank' }),
    tip: 'Dernier tour : escouade + herse. Le mini-garage de mi-course répare et blanchit.',
    recap: 'Vice City. Là où tout a commencé. Voss a truqué la finale : la police est à lui.',
    comic: Object.freeze({
      briefing: Object.freeze([
        Object.freeze({ art: 'city', caption: 'OCEAN DRIVE. Là où tout a commencé. La foule est immense.', bubbles: Object.freeze([{ who: 'voss', text: 'Messieurs… que le meilleur gagne. La police veillera au… bon déroulement.' }, { who: 'luna', text: 'La police est À LUI, Nico ! Tout est truqué ! Gagne quand même !' }, { who: 'nico', text: 'Trois ans que j’attends ça. DANTE ! ON RÈGLE ÇA ! MAINTENANT !' }, { who: 'dante', text: 'Viens me chercher, Vega.' }]) }),
      ]),
      debriefWin: Object.freeze([
        Object.freeze({ art: 'action', caption: 'DANTE EST VAINCU. VOSS S’ENFUIT. Tu tiens les preuves.', sfx: 'K.O. !', bubbles: Object.freeze([{ who: 'nico', text: 'C’est fini, Dante.' }, { who: 'dante', text: 'Fais… ce que tu veux de moi.' }]) }),
      ]),
      debriefFail: Object.freeze([
        Object.freeze({ art: { portrait: 'dante' }, bubbles: Object.freeze([{ who: 'dante', text: 'L’histoire se répète, Vega…' }, { who: 'luna', text: 'NON ! On ne perd pas comme ça ! ENCORE !' }]) }),
      ]),
    }),
    radio: Object.freeze([
      Object.freeze({ on: 'start', who: 'luna', text: 'C’EST LA FINALE ! Tout ce qu’on a traversé… pour CE moment !' }),
      Object.freeze({ on: 'half', who: 'luna', text: 'Mi-course ! Ne lâche rien !' }),
      Object.freeze({ on: 'wanted', who: 'luna', text: 'Les flics de Voss arrivent ! Ils protègent Dante !' }),
      Object.freeze({ on: 'finallap', who: 'luna', text: 'DERNIER TOUR ! TOUT ! DONNE ! TOUT !' }),
    ]),
    stars: Object.freeze({
      two: Object.freeze({ label: 'Victoire avec +50 % de coque', check: 'health-half' }),
      three: Object.freeze({ label: 'Écrase Dante : 150 m d’avance', check: 'margin-150' }),
    }),
  }),
]);

export const CITY_RUSH_STORY_CHAPTER_COUNT = CITY_RUSH_STORY_CHAPTERS.length;

export function getStoryChapter(index) {
  const list = CITY_RUSH_STORY_CHAPTERS;
  const safe = Math.max(0, Math.min(list.length - 1, Math.floor(Number(index) || 0)));
  return list[safe];
}

// ── Fins ──────────────────────────────────────────────────────────────────
// Le choix final ne change pas qu’un paragraphe : prime en billets, trophée
// dédié, et « Double jeu » seulement pour les pilotes quasi parfaits (27★+).
export const CITY_RUSH_STORY_ENDINGS = Object.freeze({
  revenge: Object.freeze({
    id: 'revenge', title: 'La revanche', pitch: 'Dante paiera pour sa trahison.',
    text: 'Nico remet Dante aux autorités et restaure son nom. Voss s’enfuit à l’étranger — mais avec le dossier publié, tous les flics du monde le cherchent. La vengeance de Nico s’arrête là. La justice, elle, ne fait que commencer.',
    cashBonus: 100, requiresStars: 0,
  }),
  truth: Object.freeze({
    id: 'truth', title: 'La vérité', pitch: 'Expose le complot jusqu’au bout.',
    text: 'Nico rend publiques toutes les preuves. L’empire Voss s’effondre en une semaine, et Dante — pour sauver sa peau — témoigne contre son ancien maître. Ocean Drive fête son champion jusqu’au bout de la nuit.',
    cashBonus: 100, requiresStars: 0,
  }),
  double: Object.freeze({
    id: 'double', title: 'Double jeu', pitch: 'Piège-les l’un contre l’autre. (27★+)',
    text: 'Nico monte Voss et Dante l’un contre l’autre : le promoteur tombe pour corruption, le pilote pour sabotage. Et Luna ? Elle a vendu une copie du dossier à la presse… La bande se partage une fortune au soleil de Santa Monica. FIN — enfin, presque.',
    cashBonus: 250, requiresStars: 27,
  }),
});

export function storyEndingUnlocked(endingId, totalStars = 0) {
  const ending = CITY_RUSH_STORY_ENDINGS[endingId];
  if (!ending) return false;
  return (Number(totalStars) || 0) >= (Number(ending.requiresStars) || 0);
}

/** Total d’étoiles d’une carte `{ chapitreId: étoiles }` (30 max). */
export function storyTotalStars(starsMap) {
  if (!starsMap || typeof starsMap !== 'object') return 0;
  return CITY_RUSH_STORY_CHAPTERS.reduce(
    (total, chapter) => total + Math.max(0, Math.min(3, Math.floor(Number(starsMap[chapter.id]) || 0))),
    0,
  );
}

// ── Migration ─────────────────────────────────────────────────────────────
// L’ancienne campagne comptait 6 chapitres (Vice City, New York, Tokyo,
// Paris, Londres, finale). La nouvelle en compte 10 : on replace le joueur
// au chapitre équivalent au lieu de le renvoyer au début.
export const CITY_RUSH_STORY_VERSION = 2;
const LEGACY_CHAPTER_MAP = Object.freeze([1, 2, 5, 6, 7, 9, 10]);

export function mapLegacyStoryChapter(legacyChapter) {
  const raw = Math.floor(Number(legacyChapter) || 0);
  if (raw <= 0) return 0;
  if (raw >= LEGACY_CHAPTER_MAP.length) return CITY_RUSH_STORY_CHAPTER_COUNT;
  return LEGACY_CHAPTER_MAP[raw];
}
