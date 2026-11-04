const base = {
  jurisdiction: 'FR', trafficSide: 'right', limit: 50, advisorySpeed: 15, duration: 150,
  source: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074228/LEGISCTA000006159602/',
};
export const DRIVING_MERGE_EXERCISES = [
  {
    ...base, id: 'parking-exit', title: '17 · Sortir d’un stationnement', rule: 'parking-exit', article: 'R415-9',
    summary: 'Laisser passer la circulation avant de quitter une place et rejoindre sa voie.',
    theory: 'En quittant un stationnement, cédez le passage aux usagers qui circulent déjà. Contrôlez les rétroviseurs et l’angle mort, signalez votre intention puis insérez-vous sans obliger un autre usager à freiner. Ici, une voiture arrive par l’arrière : attendez son passage. Le clignotant gauche est automatique ; les contrôles visuels ne sont pas évalués.',
    center: { x: -300, z: -156 }, spawn: { x: -294.7, z: -156, heading: 0 },
    bounds: { minX: -311, maxX: -289, minZ: -184, maxZ: -122 },
    parkingBay: { x: -294.7, z: -156, width: 3.2, depth: 6.2 },
    // Lateral boundary: bumper is a lateral clearance, not the forward nose.
    priority: { axis: 'x', direction: -1, bumper: .75, entryLine: -296.6, triggerLine: -294.5, stopRequired: false,
      actors: [{ id: 'passing-car', type: 'sedan', speed: 5, clearAt: 38, points: [{ x: -297.65, z: -130 }, { x: -297.65, z: -178 }] }] },
    stages: [
      { x: -294.7, z: -156, radius: 1, kind: 'priority', instruction: 'Laissez passer la voiture avant de quitter le stationnement.' },
      { x: -297.65, z: -162.5, radius: 1.1, kind: 'drive', heading: 0, via: [{ x: -294.7, z: -158 }, { x: -297.65, z: -161 }], instruction: 'Voie libre : sortez doucement et alignez-vous dans votre voie.' },
      { x: -297.65, z: -171, radius: 1.5, kind: 'stop', heading: 0, instruction: 'Arrêtez-vous dans le cercle après votre insertion.' },
    ],
  },
  {
    ...base, id: 'lane-change', title: '18 · Changer de voie sans gêner', rule: 'lane-change', article: 'R412-10',
    source: 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074228/',
    summary: 'Sur deux voies de même sens, laisser passer une voiture avant de se déporter.',
    theory: 'Un clignotant ne donne pas la priorité. Avant de changer de voie, vérifiez les rétroviseurs et l’angle mort, laissez passer les véhicules déjà dans la voie visée puis déplacez-vous progressivement. La section comporte deux voies vers l’est : le changement demandé reste dans le même sens de circulation. Les contrôles visuels ne sont pas évalués ; le clignotant gauche est automatique.',
    center: { x: -250, z: -100 }, spawn: { x: -275, z: -94.75, heading: Math.PI / 2 },
    bounds: { minX: -292, maxX: -215, minZ: -111, maxZ: -89 },
    laneDivider: { z: -96.5, startX: -280, endX: -222, lanes: [-98.25, -94.75] },
    priority: { axis: 'z', direction: -1, bumper: .5, entryLine: -96.5, triggerLine: -94.5, stopRequired: false,
      actors: [{ id: 'left-lane-car', type: 'taxi', speed: 6, clearAt: 37, points: [{ x: -280, z: -98.25 }, { x: -225, z: -98.25 }] }] },
    stages: [
      { x: -275, z: -94.75, radius: 1, kind: 'priority', instruction: 'Laissez passer la voiture dans la voie de gauche.' },
      { x: -253, z: -98.25, radius: 1.2, kind: 'drive', heading: Math.PI / 2, via: [{ x: -270, z: -94.75 }, { x: -258, z: -98.25 }], instruction: 'Créneau libre : rejoignez progressivement la voie de gauche.' },
      { x: -230, z: -98.25, radius: 1.5, kind: 'stop', heading: Math.PI / 2, instruction: 'Restez dans votre voie. Arrêtez-vous dans le cercle.' },
    ],
  },
];
