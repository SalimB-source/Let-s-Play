// Original closed-road practice, not official exam questions or certification.
const common = { jurisdiction:'FR', trafficSide:'right', limit:50, advisorySpeed:20, duration:180,
  source:'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074228/' };
const junction = (x,z) => ({center:{x,z},spawn:{x:x+2.35,z:z+43,heading:0},bounds:{minX:x-45,maxX:x+45,minZ:z-45,maxZ:z+55}});
export const ROAD_CODE_EXERCISES = [
  {
    ...common,id:'narrow-passage',title:'20 · Passage étroit : céder en face',rule:'narrow-passage',article:'R411-25',
    summary:'Au panneau à flèches, laisser passer le véhicule en face avant d’emprunter le passage étroit.',
    theory:'Le panneau rond B15, à bord rouge, impose de céder le passage aux véhicules venant en sens inverse. Attendez avant le rétrécissement. Après leur passage, engagez-vous doucement, puis reprenez votre côté droit. Le panneau bleu C18 vu depuis l’autre entrée donne la priorité au sens opposé. Ce scénario ne traite pas des règles particulières aux routes de montagne.',
    center:{x:-100,z:-250},spawn:{x:-97.65,z:-220,heading:0},bounds:{minX:-111,maxX:-89,minZ:-280,maxZ:-210},
    narrowPassage:{x:-100,minZ:-263,maxZ:-239,halfWidth:2.2,outerHalfWidth:6.8},
    priority:{entryZ:-234,triggerZ:-225,stopRequired:false,actors:[{id:'oncoming',type:'sedan',speed:4,clearAt:52,
      points:[{x:-102.35,z:-277},{x:-100,z:-269},{x:-100,z:-235},{x:-102.35,z:-222.5}]}]},
    stages:[
      {x:-97.65,z:-229,radius:1.2,kind:'priority',instruction:'Cédez en face. Attendez avant le passage étroit.'},
      {x:-100,z:-250,radius:1,kind:'drive',via:[{x:-98.8,z:-232},{x:-100,z:-236}],instruction:'Voie libre : avancez doucement dans le passage étroit.'},
      {x:-97.65,z:-270,radius:1.2,kind:'drive',via:[{x:-100,z:-267}],instruction:'Sortez du passage. Reprenez votre côté droit.'},
      {x:-97.65,z:-275.5,radius:1.4,kind:'stop',heading:0,instruction:'Arrêtez-vous dans le cercle après le rétrécissement.'},
    ],
  },
  {
    ...common,...junction(-300,200),id:'emergency-vehicle',title:'21 · Laisser passer un véhicule prioritaire',rule:'emergency-vehicle',article:'R415-12',
    summary:'Repérer une voiture de police en intervention et lui céder le passage sans s’engager dans le carrefour.',
    theory:'Cédez le passage aux véhicules d’intérêt général prioritaires qui annoncent leur approche par leurs avertisseurs spéciaux. Ici, une voiture de police arrive de gauche avec des feux bleus clignotants et une sirène deux tons. Ralentissez et attendez hors de sa trajectoire, avant le carrefour. Ne franchissez pas un feu rouge et ne montez pas sur le trottoir pour lui faire de la place. Le son reste désactivable ; les avertisseurs visuels restent présents.',
    priority:{entryZ:218,triggerZ:234,stopRequired:false,actors:[{id:'police-response',type:'police',emergency:true,speed:8,clearAt:60,points:[{x:-342,z:202.35},{x:-258,z:202.35}]}]},
    stages:[{x:-297.65,z:223,radius:2,kind:'priority',instruction:'Laissez passer la police en intervention avant de traverser.'},
      {x:-297.65,z:168,radius:2,kind:'stop',instruction:'Voie libre : traversez, puis arrêtez-vous dans le cercle.'}],
  },
  {
    ...common,...junction(300,100),id:'priority-road',title:'22 · Reconnaître une route prioritaire',rule:'priority-road',article:'R411-25',
    summary:'Reconnaître le losange jaune et traverser prudemment pendant que le véhicule latéral cède le passage.',
    theory:'Le losange jaune AB6 annonce le caractère prioritaire de la route. Dans cet atelier sans feux, le conducteur de la route latérale rencontre un cédez-le-passage et s’arrête pour vous laisser traverser. Votre priorité ne dispense jamais de prudence. Observez son comportement et avancez si le carrefour est dégagé ; aucun arrêt systématique n’est demandé.',
    priority:{entryZ:118,triggerZ:134,playerClearZ:86,stopRequired:false,actors:[{id:'yielding-car',type:'sedan',yieldsToPlayer:true,holdDistance:20,speed:4,clearAt:65,points:[{x:342,z:97.65},{x:258,z:97.65}]}]},
    stages:[{x:302.35,z:123,radius:2,kind:'priority',instruction:'Losange jaune : avancez prudemment sur la route prioritaire.'},
      {x:302.35,z:68,radius:2,kind:'stop',instruction:'Traversez, puis arrêtez-vous dans le cercle.'}],
  },
  {
    ...common,...junction(-200,-200),bounds:{minX:-234,maxX:-155,minZ:-245,maxZ:-145},id:'yield-clear',title:'23 · Cédez-le-passage : voie libre',rule:'yield',article:'R415-7',
    summary:'Ralentir au cédez-le-passage et traverser sans arrêt obligatoire lorsque la route est libre.',
    theory:'Au cédez-le-passage, laissez la priorité aux usagers de la route abordée. Contrairement au STOP, l’arrêt n’est pas systématiquement obligatoire. Ici, les deux sens sont dégagés : ralentissez, vérifiez puis traversez prudemment, sans vous immobiliser par réflexe. Un arrêt prudent reste autorisé ; le jeu ne prétend pas détecter vos contrôles du regard.',
    priority:{entryZ:-182,triggerZ:-166,stopRequired:false,actors:[]},
    stages:[{x:-197.65,z:-177,radius:2,kind:'priority',instruction:'Ralentissez et vérifiez. Voie libre : passez prudemment.'},
      {x:-197.65,z:-232,radius:2,kind:'stop',instruction:'Traversez, puis arrêtez-vous dans le cercle.'}],
  },
];
export function narrowPassageBodies(exercise) {
  const p=exercise?.narrowPassage;if(!p)return [];
  const width=p.outerHalfWidth-p.halfWidth;
  return [-1,1].map(side=>({x:p.x+side*(p.halfWidth+width/2),z:(p.minZ+p.maxZ)/2,width,depth:p.maxZ-p.minZ}));
}
export function narrowPassageBlocked(exercise,x,z,heading=0) {
  if(!exercise?.narrowPassage)return false;
  const halfX=Math.abs(Math.cos(heading))*1.2+Math.abs(Math.sin(heading))*2.6;
  const halfZ=Math.abs(Math.sin(heading))*1.2+Math.abs(Math.cos(heading))*2.6;
  return narrowPassageBodies(exercise).some(b=>Math.abs(x-b.x)<b.width/2+halfX&&Math.abs(z-b.z)<b.depth/2+halfZ);
}
export function keepPassageMarking(exercise,x,z,halfDepth=0) {
  const p=exercise?.narrowPassage;
  return !p||Math.abs(x-p.x)>p.outerHalfWidth||z+halfDepth<p.minZ-4||z-halfDepth>p.maxZ+4;
}
