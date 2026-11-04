// Semantic previews are per exercise, never inferred from the chapter's icon.
const straight = 'M85 126H310';
const crossing = { layout: 'junction', route: straight, goal: [310,126] };
const turnRight = 'M85 126H135Q160 126 160 151V190';
export const SCHOOL_SITUATION_SCENES = {
  'narrow-passage': { layout:'narrow', route:'M85 126H110Q137 126 145 106H230Q255 106 265 126H319', goal:[319,126], signs:['narrow-yield'], actors:[{kind:'car',x:218,y:106,heading:180}], caption:'Passage étroit : céder en face' },
  'emergency-vehicle': { ...crossing, actors:[{kind:'police',x:160,y:53,heading:90}], caption:'Police en intervention : céder le passage' },
  'priority-road': { ...crossing, signs:['priority-road'], actors:[{kind:'car',x:200,y:174,heading:-90}], caption:'Route prioritaire : le véhicule latéral attend' },
  'yield-clear': { ...crossing, signs:['yield'], caption:'Cédez-le-passage libre : arrêt non systématique' },
  control: { layout:'straight', route:straight, goal:[310,126], caption:'Ligne droite · arrêt dans la zone' },
  bump: { layout:'straight', route:straight, goal:[310,126], signs:['bump'], bump:true, caption:'Ralentir avant le dos d’âne' },
  signal: { ...crossing, signal:'red', stopLine:true, caption:'Arrêt au rouge · départ au vert' },
  stop: { ...crossing, signs:['stop'], stopLine:true, caption:'STOP · arrêt complet, puis traverser' },
  precision: { layout:'straight', route:'M85 126H280', goal:[280,126], precision:true, caption:'Viser la petite zone · rester immobile' },
  'fr-right': { ...crossing, actors:[{kind:'car',x:200,y:177,heading:-90}], caption:'Laisser passer le véhicule de droite' },
  'fr-yield': { ...crossing, signs:['yield'], actors:[{kind:'car',x:160,y:53,heading:90}], caption:'Céder le passage avant de traverser' },
  'fr-stop': { ...crossing, signs:['stop'], stopLine:true, actors:[{kind:'car',x:200,y:177,heading:-90}], caption:'Arrêt obligatoire + priorité au trafic' },
  'fr-giratory': { layout:'roundabout', circulation:'counterclockwise', route:'M85 126H112Q125 159 180 159Q220 159 233 126H321', goal:[321,126], signs:['yield'], actors:[{kind:'car',x:180,y:159,heading:0}], caption:'Céder à l’anneau · ressortir en face' },
  'pedestrian-crossing': { ...crossing, signal:'red', zebra:'approach', actors:[{kind:'pedestrian',x:113,y:162,heading:-90}], caption:'Piéton d’abord · puis attendre le vert' },
  'blocked-lane': { layout:'straight', route:'M85 126H131Q154 126 160 104Q164 84 190 84H225Q250 84 255 108Q258 126 280 126H323', goal:[323,126], actors:[{kind:'obstacle',x:203,y:126,heading:0},{kind:'car',x:287,y:84,heading:180}], caption:'Attendre en face · contourner · se rabattre' },
  'right-turn': { layout:'junction', route:turnRight, goal:[160,190], signal:'red', zebra:'exit', caption:'Au vert · tourner à droite' },
  'traffic-yield': { ...crossing, actors:[{kind:'car',x:160,y:53,heading:90},{kind:'car',x:200,y:178,heading:-90}], caption:'Observer et laisser passer les deux sens' },
  'left-turn-oncoming': { layout:'junction', route:'M85 126H172Q200 126 200 97V48', goal:[200,48], signal:'green', actors:[{kind:'car',x:280,y:84,heading:180}], caption:'Au vert · céder en face · tourner à gauche' },
  'blocked-junction': { ...crossing, route:'M85 126H130', goal:null, signal:'green', stopLine:true, actors:[{kind:'taxi',x:272,y:126,heading:0}], caption:'Même au vert · attendre une sortie libre' },
  'right-turn-cyclist': { layout:'junction', route:turnRight, goal:[160,190], signal:'green', zebra:'exit', actors:[{kind:'cyclist',x:120,y:147,heading:0}], caption:'Laisser passer le cycliste à droite' },
  'parking-exit': { layout:'parking-exit', player:[85,177], route:'M85 177H115Q145 177 150 150Q154 126 182 126H320', goal:[320,126], actors:[{kind:'car',x:215,y:126,heading:0}], caption:'Laisser passer · quitter la place · s’insérer' },
  'lane-change': { layout:'lanes', route:'M85 126H130Q165 126 184 105Q205 84 239 84H319', goal:[319,84], actors:[{kind:'car',x:267,y:84,heading:0}], caption:'Deux voies de même sens · céder à gauche' },
  'parking-choice': { layout:'parking-choice', route:'M85 126H232Q253 126 264 149Q278 177 296 177H302', goal:[302,177], caption:'Dépasser l’interdit · choisir la deuxième place' },
};
export function schoolSituationScene(exercise) {
  return SCHOOL_SITUATION_SCENES[exercise.id] ?? SCHOOL_SITUATION_SCENES.control;
}
