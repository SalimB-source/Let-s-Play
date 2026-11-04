const base = {
  jurisdiction: 'FR', trafficSide: 'right', limit: 50, advisorySpeed: 20, duration: 180,
  source: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074228/LEGISCTA000006159602/',
};
const arc = (cx, cz, radius, from, to) => Array.from({ length: 16 }, (_, i) => {
  const a = from + (to - from) * (i + 1) / 16;
  return { x: cx + radius * Math.cos(a), z: cz + radius * Math.sin(a) };
});
export const REAL_SITUATION_EXERCISES = [
  {
    ...base, id: 'left-turn-oncoming', title: '14 · Tourner à gauche avec circulation', rule: 'left-turn', article: 'R415-4',
    summary: 'Passer au vert puis laisser passer une voiture en face avant de tourner à gauche.',
    theory: 'Pour tourner à gauche, signalez votre intention et cédez le passage aux véhicules venant en sens inverse. Le feu vert ne donne pas priorité sur eux. Attendez sans empiéter sur leur voie ni sur le passage piéton, puis terminez le virage quand la voie est libre. Le clignotant gauche est automatique.',
    center: { x: 200, z: 100 }, spawn: { x: 202.35, z: 143, heading: 0 },
    bounds: { minX: 155, maxX: 245, minZ: 55, maxZ: 151 },
    priority: { triggerZ: 132, entryZ: 103.5, stopRequired: false, keepTrafficLights: true,
      actors: [{ id: 'opposite', type: 'sedan', speed: 6, clearAt: 56, signal: { axis: 'z', direction: 1, line: 82, ix: 2, iz: 1 }, points: [{ x: 197.65, z: 60 }, { x: 197.65, z: 140 }] }] },
    stages: [
      { x: 202.35, z: 123, radius: 2, kind: 'signal', signal: { axis: 'z', ix: 2, iz: 1 }, instruction: 'Attendez le vert avant de vous engager.' },
      { x: 202.35, z: 108, radius: 1.3, kind: 'priority', instruction: 'Laissez passer la voiture en face avant de tourner.' },
      { x: 175, z: 97.65, radius: 2, kind: 'drive', heading: -Math.PI / 2,
        via: [{ x: 202.35, z: 105 }, ...arc(195, 105, 7.35, 0, -Math.PI / 2)], instruction: 'Tournez à gauche. Rejoignez votre voie à droite.' },
      { x: 163, z: 97.65, radius: 2, kind: 'stop', heading: -Math.PI / 2, instruction: 'Arrêtez-vous dans le cercle après le virage.' },
    ],
  },
  {
    ...base, id: 'blocked-junction', title: '15 · Feu vert, mais sortie bloquée', rule: 'blocked-junction', article: 'R415-2',
    summary: 'Approcher du feu, attendre que le taxi libère la sortie, puis traverser au vert.',
    theory: 'Même au vert, ne vous engagez pas si vous risquez de rester immobilisé dans le carrefour et de bloquer les autres usagers. Ici, un véhicule attend dans la sortie. Attendez avant la ligne que la sortie soit dégagée et que le feu soit vert, puis traversez sans vous arrêter sur les passages piétons.',
    center: { x: -200, z: 100 }, spawn: { x: -197.65, z: 143, heading: 0 },
    bounds: { minX: -245, maxX: -155, minZ: 55, maxZ: 151 },
    priority: { triggerZ: 125, triggerOnGreen: true, entryZ: 118, stopRequired: false, keepTrafficLights: true,
      actors: [{ id: 'queue', type: 'taxi', speed: 4, delay: 2, clearAt: 12, points: [{ x: -197.65, z: 79 }, { x: -197.65, z: 54 }] }] },
    stages: [
      { x: -197.65, z: 123, radius: 2, kind: 'drive', instruction: 'Avancez jusqu’au cercle avant le carrefour.' },
      { x: -197.65, z: 123, radius: 2, kind: 'priority', signal: { axis: 'z', ix: -2, iz: 1 }, instruction: 'Feu vert : attendez que le taxi libère la sortie.' },
      { x: -197.65, z: 64, radius: 2, kind: 'stop', instruction: 'Traversez au vert. Arrêtez-vous dans le cercle.' },
    ],
  },
  {
    ...base, id: 'right-turn-cyclist', title: '16 · Tourner sans couper un cycliste', rule: 'cyclist-turn', article: 'R415-3',
    summary: 'Laisser passer un cycliste sur sa droite avant de tourner à droite.',
    theory: 'Avant de tourner à droite, contrôlez la présence de cyclistes sur votre droite et ne leur coupez pas la route. Dans cet atelier, un cycliste continue tout droit : laissez-le dépasser la zone du virage avant de tourner. Les contrôles visuels restent à effectuer en conduite réelle ; seul le respect de la priorité est validé automatiquement. Le clignotant droit est automatique.',
    center: { x: 100, z: 300 }, spawn: { x: 102.35, z: 343, heading: 0 },
    bounds: { minX: 89, maxX: 151, minZ: 255, maxZ: 351 },
    priority: { triggerZ: 334, entryZ: 304, stopRequired: false, keepTrafficLights: true,
      actors: [{ id: 'cyclist', type: 'cyclist', speed: 4, clearAt: 49, signal: { axis: 'z', direction: -1, line: 318, ix: 1, iz: 3, bumper: 1 }, points: [{ x: 106.1, z: 343 }, { x: 106.1, z: 269 }] }] },
    stages: [
      { x: 102.35, z: 323, radius: 2, kind: 'signal', signal: { axis: 'z', ix: 1, iz: 3 }, instruction: 'Attendez le feu vert. Repérez le cycliste à droite.' },
      { x: 102.35, z: 308, radius: 1, kind: 'priority', instruction: 'Laissez passer le cycliste avant de tourner à droite.' },
      { x: 124, z: 302.35, radius: 2, kind: 'drive', heading: Math.PI / 2,
        via: [{ x: 102.35, z: 307.5 }, ...arc(107.5, 307.5, 5.15, Math.PI, Math.PI * 1.5)], instruction: 'Cycliste passé : tournez à droite sans couper sa route.' },
      { x: 140, z: 302.35, radius: 2, kind: 'stop', heading: Math.PI / 2, instruction: 'Arrêtez-vous dans le cercle après le passage piéton.' },
    ],
  },
];
