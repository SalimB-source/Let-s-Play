import {
  CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP,
  CITY_RUSH_BAZOOKA_PICKUP_SHARES,
  CITY_RUSH_CLEAN_LINE_MAX_BONUS,
  CITY_RUSH_CLEAN_LINE_RAMP_DURATION,
  CITY_RUSH_HEALTH_PICKUP_RESTORE,
  CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT,
  CITY_RUSH_ONCOMING_BONUS_MAX,
  CITY_RUSH_PICKUPS,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
  CITY_RUSH_POWERS,
  CITY_RUSH_SPRINT_CHECKPOINTS,
  CITY_RUSH_SPRINT_CHECKPOINT_SPACING,
  CITY_RUSH_TRACK_BOOST_DURATION,
} from './cityRushRules.js';
import { CITY_RUSH_CASH_BY_PLACE } from './cityRushProgress.js';

/**
 * Temps minimal d'affichage d'une étape, en millisecondes. Le tutoriel se joue
 * tout seul : chaque mini-tuto se termine quand son action est réellement
 * effectuée en piste (le tic vert), jamais avant que la fiche ait eu le temps
 * d'être lue. C'est donc un plancher, pas un minuteur : une démonstration qui
 * prend plus de temps garde sa fiche à l'écran jusqu'à sa réussite.
 */
export const CITY_RUSH_TUTORIAL_STEP_DURATION_MS = 5200;

/** Durée du tic vert avant que la démonstration suivante ne se lance (s). */
export const CITY_RUSH_TUTORIAL_TICK_MS = 1100;

/** Leçon qui fait entrer la police en piste : celle des tirs à l'AK-47. */
export const CITY_RUSH_TUTORIAL_POLICE_FROM_ID = 'magazine';

/** Cadence des écarts de voie de la voiture qui se conduit toute seule (s). */
export const CITY_RUSH_TUTORIAL_STEER_INTERVAL = 0.42;

/** Durée pendant laquelle la démo lâche le volant après une touche du pilote (s). */
export const CITY_RUSH_TUTORIAL_MANUAL_GRACE = 1.6;

/**
 * Garde-fou : une démonstration qui n'atteint pas son action au bout de ce
 * délai (scénario malchanceux) passe à la suivante au lieu de bloquer le tour.
 */
export const CITY_RUSH_TUTORIAL_LESSON_TIMEOUT = 75;

const cleanLineBonus = Math.round((CITY_RUSH_CLEAN_LINE_MAX_BONUS - 1) * 100);
const oncomingBonus = Math.round((CITY_RUSH_ONCOMING_BONUS_MAX - 1) * 100);
const bazookaPickupPercentages = CITY_RUSH_BAZOOKA_PICKUP_SHARES
  .map((share) => Math.round(share * 100))
  .join(' % puis ');

/**
 * Dix démonstrations courtes, jouées par la voiture elle-même. Chaque fiche
 * annonce l'action que la démo doit accomplir pour de vrai en piste
 * (`action`), le libellé du tic vert (`success`) et, pour les leçons qui
 * reposent sur un bonus, la nature de l'accessoire que le coach pose devant la
 * voiture (`prop` : chargeur rouge, cercle vert au sol, trousse de soins).
 */
export const CITY_RUSH_TUTORIAL_STEPS = Object.freeze([
  {
    id: 'steering',
    label: 'Le volant',
    chapter: '01 · PILOTAGE',
    title: 'Change de voie, sans lever le pied.',
    description: 'La démo roule toute seule et se décale avec ← / → ou Q / D — ou glisse sur la route. Prends le volant quand tu veux : la voiture te laisse la main, puis reprend la leçon.',
    tip: 'ÉVITE LE TRAFIC · LE CHANGEMENT DE VOIE NE RALENTIT PAS.',
    controls: ['←', '→', 'Q', 'D'],
    touch: 'GLISSE ← / →',
    scene: 'steering',
    visual: 'DÉCALER · DOUBLER · ÉVITER',
    accent: '#54ead1',
    action: 'steer',
    success: 'CHANGEMENT DE VOIE RÉUSSI',
  },
  {
    id: 'speed',
    label: 'Gagner de la vitesse',
    chapter: '02 · TRAJECTOIRE',
    title: 'La ligne propre récompense la patience.',
    description: `Garde ta voie environ ${CITY_RUSH_CLEAN_LINE_RAMP_DURATION} s pour charger jusqu’à +${cleanLineBonus} %. Sur les routes à double sens, le contresens monte jusqu’à +${oncomingBonus} %, mais un choc frontal annule le bonus et abîme la voiture.`,
    tip: 'PLUS SÛR : RESTE DANS TON SENS ET TIENS UNE VOIE.',
    controls: ['TENIR SA VOIE'],
    touch: 'CONTRESENS = RISQUE',
    scene: 'speed',
    visual: `LIGNE PROPRE +${cleanLineBonus} % · CONTRESENS +${oncomingBonus} %`,
    accent: '#76d8ff',
    action: 'clean-line',
    success: 'LIGNE PROPRE CHARGÉE À FOND',
  },
  {
    id: 'magazine',
    label: 'AK-47',
    chapter: '03 · ARME ROUGE',
    title: 'Recharge, puis tire avec Z.',
    description: `Traverse un chargeur rouge : il se ramasse automatiquement et complète l’AK-47 jusqu’à ${CITY_RUSH_PISTOL_AMMO_PER_PICKUP} balles. Appuie ou maintiens Z (ou le bouton rouge) pour tirer droit dans ta voie.`,
    tip: 'C’EST LA LEÇON DES TIRS : LA POLICE ENTRE EN PISTE MAINTENANT.',
    controls: ['Z · TIRER', 'MAINTENIR · RAFALE'],
    touch: 'BOUTON ROUGE',
    scene: 'magazine',
    visual: `CHARGEUR ROUGE · ${CITY_RUSH_PISTOL_AMMO_PER_PICKUP} BALLES`,
    accent: '#ff536d',
    action: 'shoot',
    success: 'TIR AU BUT',
    prop: CITY_RUSH_POWERS.PISTOL,
  },
  {
    id: 'boost',
    label: 'Boost de vitesse',
    chapter: '04 · TURBO VERT',
    title: 'Le rond vert se déclenche tout seul.',
    description: `Passe sur un rond vert peint sur la chaussée : le bonus est automatique et te propulse pendant ${CITY_RUSH_TRACK_BOOST_DURATION} secondes. Plus aucune icône ne flotte au-dessus du bitume — aligne ta voiture avec le cercle que tu veux traverser.`,
    tip: 'AUCUNE TOUCHE À PRESSER · LE TURBO PART AU CONTACT.',
    controls: ['RAMASSAGE AUTO'],
    touch: 'VISE LE ROND',
    scene: 'boost',
    visual: `TURBO · ${CITY_RUSH_TRACK_BOOST_DURATION} S`,
    accent: '#55f5a7',
    action: 'boost',
    success: 'TURBO RAMASSÉ',
    prop: CITY_RUSH_PICKUPS.BOOST,
  },
  {
    id: 'bazooka',
    label: 'Bazooka',
    chapter: '05 · ARME JAUNE',
    title: 'Traverse le conteneur jaune.',
    description: `Deux entrepôts sont placés à ${bazookaPickupPercentages} % de la course, sur une voie extérieure. Passe dans l’ouverture pour prendre ${CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP} roquettes : elles remplacent ton arme en main, tire avec Z ou le bouton de tir.`,
    tip: 'LES ROQUETTES FILENT TOUT DROIT ET EXPLOSENT PRÈS DES VOITURES DE POLICE.',
    controls: ['Z · TIRER'],
    touch: 'BOUTON DE TIR',
    scene: 'bazooka',
    visual: `CONTENEUR JAUNE · ${CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP} ROQUETTES`,
    accent: '#ffd447',
    action: 'bazooka',
    success: 'ROQUETTE TIRÉE',
  },
  {
    id: 'police',
    label: 'La police',
    chapter: '06 · POURSUITE',
    title: 'Quand la mire rougit, décale-toi.',
    description: 'La police est entrée en piste avec la leçon sur les tirs et ne te lâche plus. Ses étoiles montent si tu l’attaques : herse à 4 ★, SUV de face à 5 ★.',
    tip: 'LE HALO ROUGE T’AVERTIT : CHANGE DE VOIE AVANT LA FIN DE LA MIRE.',
    controls: ['← / → · ESQUIVER'],
    touch: 'GLISSE POUR ESQUIVER',
    scene: 'police',
    visual: 'MIRE ROUGE → DÉCALE-TOI',
    accent: '#ff687c',
    action: 'dodge',
    success: 'ESQUIVE RÉUSSIE',
  },
  {
    id: 'garage',
    label: 'Mini-garage',
    chapter: '07 · SERVICE',
    title: 'Traverse le mini-garage à mi-course.',
    description: `Au milieu du parcours, passe dans l’une des deux voies centrales : le garage ne sert qu’une fois et répare jusqu’à ${CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT} cases de coque. Il fait aussi baisser ton indice de recherche.`,
    tip: 'SUIS LES CHEVRONS PEINTS ET LE PANNEAU « MINI-GARAGE ».',
    controls: ['MI-PARCOURS'],
    touch: '2 VOIES CENTRALES',
    scene: 'garage',
    visual: `RÉPARATION · JUSQU’À +${CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT}`,
    accent: '#61efb0',
    action: 'garage',
    success: 'MINI-GARAGE TRAVERSÉ',
  },
  {
    id: 'health',
    label: 'Vie & collisions',
    chapter: '08 · COQUE',
    title: 'Protège ta coque et ramasse les soins.',
    description: `Un carambolage coûte 1 case (2 contre un SUV blindé). La trousse avec une croix rouge rend ${CITY_RUSH_HEALTH_PICKUP_RESTORE} case si ta coque n’est pas pleine.`,
    tip: 'SURVEILLE LA JAUGE DE VIE : ELLE DÉPEND DE LA VOITURE CHOISIE.',
    controls: ['CROIX ROUGE · +1'],
    touch: 'RAMASSAGE AUTO',
    scene: 'health',
    visual: `SOINS · +${CITY_RUSH_HEALTH_PICKUP_RESTORE} CASE`,
    accent: '#ff6179',
    action: 'health',
    success: 'SOINS RAMASSÉS',
    prop: CITY_RUSH_PICKUPS.HEALTH,
  },
  {
    id: 'ramp',
    label: 'Tremplins',
    chapter: '09 · SAUT',
    title: 'Prends la rampe dans la bonne voie.',
    description: 'La voiture saute au contact et peut survoler le trafic ou une herse. En l’air, elle garde sa voie : choisis ton passage avant de décoller.',
    tip: 'LE VOLANT NE RÉPOND QU’APRÈS L’ATTERRISSAGE.',
    controls: ['CHOISIS TA VOIE'],
    touch: 'SAUT AUTOMATIQUE',
    scene: 'ramp',
    visual: 'RAMPE → SAUT → ATTERRISSAGE',
    accent: '#c09aff',
    action: 'ramp',
    success: 'SAUT RÉUSSI',
  },
  {
    id: 'modes',
    label: 'Modes & progression',
    chapter: '10 · À TOI DE JOUER',
    title: 'Choisis ton défi, puis décroche les récompenses.',
    description: `Circuit : podium = ${CITY_RUSH_CASH_BY_PLACE.join(' / ')} billets verts. Poursuite : police dès le départ, sans billets. Sprint : ${CITY_RUSH_SPRINT_CHECKPOINTS} portes tous les ${CITY_RUSH_SPRINT_CHECKPOINT_SPACING} m ; chacune ajoute du temps, sans armes ni police. En Histoire, suis l’objectif pour gagner des étoiles.`,
    tip: 'RAPPEL · P : PAUSE · M : SON · F : PLEIN ÉCRAN.',
    controls: ['CIRCUIT', 'POURSUITE', 'SPRINT'],
    touch: 'BONNE COURSE !',
    scene: 'modes',
    visual: `${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS · PODIUM · ÉTOILES`,
    accent: '#ff70bf',
    action: 'debrief',
    success: 'ENTRAÎNEMENT TERMINÉ',
  },
]);

/** Identifiants des dix leçons, dans l'ordre joué par le moteur. */
export const CITY_RUSH_TUTORIAL_LESSON_IDS = Object.freeze(
  CITY_RUSH_TUTORIAL_STEPS.map((step) => step.id),
);

/** Durée minimale annoncée du tour guidé, en secondes (plancher, pas minuteur). */
export const CITY_RUSH_TUTORIAL_DURATION_SECONDS = Math.ceil(
  (CITY_RUSH_TUTORIAL_STEPS.length * CITY_RUSH_TUTORIAL_STEP_DURATION_MS) / 1000,
);
