const common = { trafficSide: 'right', limit: 50, advisorySpeed: 20, duration: 150 };
const rightTurnArc = Array.from({ length: 12 }, (_, i) => {
  const angle = Math.PI + (i + 1) / 12 * Math.PI / 2;
  return { x: 309 + 6.65 * Math.cos(angle), z: -91 + 6.65 * Math.sin(angle) };
});

export const ADDITIONAL_DRIVING_EXERCISES = [
  {
    ...common, id: 'pedestrian-crossing', title: '10 · Laisser traverser un piéton',
    rule: 'pedestrian', center: { x: 300, z: -300 },
    summary: 'À l’approche d’un passage piéton, laisser une personne traverser avant de repartir.',
    theory: 'Cédez le passage au piéton engagé. Attendez avant le passage piéton, observez sa traversée puis repartez quand la chaussée est dégagée. Le cercle de fin est une zone pédagogique, pas un emplacement de stationnement.',
    spawn: { x: 302.35, z: -250, heading: 0 },
    bounds: { minX: 289, maxX: 311, minZ: -340, maxZ: -240 },
    crossings: [{ x: 300, z: -278, axis: 'z' }],
    replacedCrossings: [{ x: 300, z: -286, axis: 'z' }],
    priority: { entryZ: -275, triggerZ: -258, stopRequired: false, keepTrafficLights: true,
      actors: [{ id: 'walker', type: 'pedestrian', speed: 1.5, clearAt: 18,
        points: [{ x: 310, z: -278 }, { x: 290, z: -278 }] }] },
    stages: [
      { x: 302.35, z: -268, radius: 1.5, kind: 'priority', instruction: 'Attendez avant les bandes. Laissez traverser le piéton.' },
      { x: 302.35, z: -268, radius: 1.5, kind: 'signal', signal: { axis: 'z', ix: 3, iz: -3 }, instruction: 'Attendez le feu vert.' },
      { x: 302.35, z: -325, radius: 2, kind: 'stop', instruction: 'Traversez au vert. Arrêtez-vous dans le cercle.' },
    ],
  },
  {
    ...common, id: 'blocked-lane', title: '11 · Contourner un véhicule immobilisé',
    rule: 'obstacle', center: { x: -155, z: -300 },
    summary: 'Attendre un véhicule venant en face avant de contourner un obstacle dans sa voie.',
    theory: 'L’obstacle est de votre côté : laissez d’abord passer le véhicule venant en sens inverse. Lorsque la voie opposée est libre, contournez prudemment le véhicule immobilisé puis reprenez votre voie à droite. Contrôles et clignotants restent nécessaires en conduite réelle.',
    spawn: { x: -135, z: -302.35, heading: -Math.PI / 2 },
    bounds: { minX: -180, maxX: -125, minZ: -311, maxZ: -289 },
    priority: { axis: 'x', direction: -1, entryLine: -148, triggerLine: -140, stopRequired: false,
      actors: [
        { id: 'oncoming', type: 'taxi', speed: 4, clearAt: 49, points: [{ x: -176, z: -297.65 }, { x: -126, z: -297.65 }] },
        { id: 'stalled', type: 'sedan', speed: 0, clearAt: 0, points: [{ x: -155, z: -302.35 }, { x: -155, z: -302.35 }] },
      ] },
    stages: [
      { x: -143.5, z: -302.35, radius: 1.5, kind: 'priority', instruction: 'Laissez passer la voiture venant en face.' },
      { x: -166, z: -302.35, radius: 1.5, kind: 'drive', via: [{ x: -146, z: -302.35 }, { x: -150, z: -297.65 }, { x: -161, z: -297.65 }], instruction: 'Contournez par la gauche. Revenez dans votre voie.' },
      { x: -173, z: -302.35, radius: 1.5, kind: 'stop', instruction: 'Arrêtez-vous dans le cercle.' },
    ],
  },
  {
    ...common, id: 'right-turn', title: '12 · Tourner à droite', duration: 180,
    summary: 'Respecter un feu, tourner à droite puis s’arrêter après le carrefour.',
    theory: 'Approchez à droite, respectez le feu et vérifiez le passage piéton. Au vert, suivez la courbe sans monter sur le trottoir, puis reprenez votre voie à droite. En conduite réelle, contrôlez les rétroviseurs et l’angle mort et signalez le changement de direction : le clignotant droit est activé automatiquement dans cet atelier.',
    spawn: { x: 302.35, z: -60, heading: 0 },
    bounds: { minX: 289, maxX: 350, minZ: -125, maxZ: -50 },
    stages: [
      { x: 302.35, z: -78, radius: 2, kind: 'signal', signal: { axis: 'z', ix: 3, iz: -1 }, instruction: 'Rouge : stop. Vert : avancez si la voie est libre.' },
      { x: 324, z: -97.65, radius: 2, heading: Math.PI / 2, kind: 'drive', via: [{ x: 302.35, z: -91 }, ...rightTurnArc], instruction: 'Tournez à droite. Suivez la ligne bleue.' },
      { x: 340, z: -97.65, radius: 2, heading: Math.PI / 2, kind: 'stop', instruction: 'Arrêtez-vous dans le cercle après le passage piéton.' },
    ],
  },
  {
    ...common, id: 'traffic-yield', title: '13 · Traverser une route à double sens',
    jurisdiction: 'FR', rule: 'yield', article: 'R415-7',
    source: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074228/LEGISCTA000006159602/',
    center: { x: -300, z: 100 },
    summary: 'Observer les deux sens de circulation et laisser passer deux voitures avant de traverser.',
    theory: 'Au cédez-le-passage, laissez passer les usagers de la route abordée. Ne vous engagez pas si vous les obligeriez à freiner. L’arrêt n’est pas systématiquement obligatoire ; ici deux voitures arrivent des deux côtés, attendez que les deux sens soient dégagés.',
    spawn: { x: -297.65, z: 143, heading: 0 },
    bounds: { minX: -345, maxX: -255, minZ: 55, maxZ: 155 },
    priority: { entryZ: 118, triggerZ: 134, stopRequired: false,
      actors: [
        { id: 'from-left', type: 'taxi', speed: 6, clearAt: 56, points: [{ x: -340, z: 102.35 }, { x: -260, z: 102.35 }] },
        { id: 'from-right', type: 'sedan', speed: 6, delay: 4, clearAt: 56, points: [{ x: -260, z: 97.65 }, { x: -340, z: 97.65 }] },
      ] },
    stages: [
      { x: -297.65, z: 123, radius: 2, kind: 'priority', instruction: 'Regardez des deux côtés. Laissez passer les deux voitures.' },
      { x: -297.65, z: 68, radius: 2, kind: 'stop', instruction: 'Voie libre : traversez. Arrêtez-vous dans le cercle.' },
    ],
  },
];
