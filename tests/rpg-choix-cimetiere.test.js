import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgBlesserCreature, rpgCartesRenfortChoisi, rpgFinDeTour, rpgJouerCreature, rpgLancerMagie, rpgNouveauDuel, rpgResoudreRenfortChoisi } from '../src/games/rpgDuel.js';
import { rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaNouveauDuel, rpgMobaPasserSort, rpgMobaPlacementCoherent, rpgMobaResoudreRecherche } from '../src/games/rpgMobaLocal.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
function partie(moba, side = 'joueur') {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), modeMana: 'essai', pvp: true, rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true; d.tour = side;
  for (const s of ['joueur','sorcier']) { d[s].main = []; d[s].deck = []; d[s].manaChoixEnAttente = null; }
  return d;
}
function choisir(d, side, id) {
  const c = rpgCartesRenfortChoisi(d, side).find(x => x.id === id && x.admissible); assert.ok(c, `choix ${id}`);
  const r = d.moba ? rpgMobaResoudreRecherche(d, side, id, c.index) : rpgPvpAppliquer(d, side, {type:'choisir-renfort',index:c.index});
  assert.ok(r.ok, JSON.stringify(r));
}
for (const moba of [false, true]) for (const side of ['joueur','sorcier']) for (const spell of ['reanimation','retour-des-ensevelis']) {
  test(`${spell} : choix explicite, autre qu'une dernière créature (${moba ? 'MOBA' : 'PvP'} ${side})`, () => {
    const d = partie(moba, side); d[side].main = [spell];
    d[side].cimetiere = ['ureus-du-seuil','chacal-du-seuil','papyrus'];
    const r = moba ? rpgMobaLancerMagie(d,side,spell,null,'right',null,{emplacementReanimation:1,ouvrirReponse:true}) : rpgPvpAppliquer(d,side,{type:'jouer-carte',carteId:spell});
    assert.ok(r.ok, JSON.stringify(r)); if (moba) assert.ok(rpgMobaPasserSort(d, side === 'joueur' ? 'sorcier' : 'joueur').ok);
    assert.equal(d[side].creatures.length,0); assert.ok(rpgCartesRenfortChoisi(d,side).length >= 2);
    if (!moba) assert.equal(rpgPvpAppliquer(d, side === 'joueur' ? 'sorcier' : 'joueur', {type:'choisir-renfort',index:0}).ok,false);
    choisir(d,side,'ureus-du-seuil');
    assert.equal(d[side].creatures[0].carteId,'ureus-du-seuil'); assert.ok(d[side].cimetiere.includes('chacal-du-seuil'));
    if (moba) { assert.equal(d.moba.lanes.find(l=>l.id==='right').slots[side][1],d[side].creatures[0].id); assert.ok(rpgMobaPlacementCoherent(d)); }
  });
}
for (const moba of [false,true]) for (const side of ['joueur','sorcier']) {
  test(`Veilleur : choix et fin de tour enchaînés (${moba ? 'MOBA' : 'PvP'} ${side})`, () => {
    const d=partie(moba, side); d[side].main=['veilleur-des-cendres'];
    const r=moba ? rpgMobaJouerCreature(d,side,'veilleur-des-cendres','left',0) : rpgJouerCreature(d,side,'veilleur-des-cendres'); assert.ok(r.ok);
    d[side].cimetiere=['ureus-du-seuil','viking-des-neiges','chien-du-guet'];
    r.entite.detruireFinDuTour=true;
    rpgFinDeTour(d);
    assert.equal(d.tour,side); assert.equal(d.transitionRetours?.etape,'ephemeres');
    assert.deepEqual(rpgCartesRenfortChoisi(d,side).map(c=>c.id), ['viking-des-neiges','ureus-du-seuil']);
    choisir(d,side,'ureus-du-seuil');
    assert.equal(d.tour,side==='joueur'?'sorcier':'joueur');
    assert.equal(d[side].creatures.length,0); assert.ok(d[side].cimetiere.includes('ureus-du-seuil'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}
for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  test(`Passeur : choix de la créature du cimetière à l'arrivée (${moba ? 'MOBA' : 'PvP'} ${side})`, () => {
    const d=partie(moba,side); d[side].main=['chien-du-guet'];
    const petit = moba ? rpgMobaJouerCreature(d,side,'chien-du-guet','left',0) : rpgJouerCreature(d,side,'chien-du-guet');
    assert.ok(petit.ok); d[side].invocationNormaleJouee = false; if (moba) d.moba.creaturesJouees[side]=false;
    d[side].main=['passeur-au-masque-de-chacal']; d[side].cimetiere=['ureus-du-seuil','viking-des-neiges'];
    const r = moba ? rpgMobaJouerCreature(d,side,'passeur-au-masque-de-chacal','left',0,{sacrificeIds:[petit.entite.id]})
      : rpgJouerCreature(d,side,'passeur-au-masque-de-chacal',null,{sacrificeIds:[petit.entite.id]});
    assert.ok(r.ok,JSON.stringify(r)); assert.equal(d[side].creatures.length,1);
    assert.ok(rpgCartesRenfortChoisi(d,side).some(c=>c.id==='chien-du-guet'));
    choisir(d,side,'ureus-du-seuil'); assert.ok(d[side].creatures.some(c=>c.carteId==='ureus-du-seuil'));
    if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}
for (const side of ['joueur','sorcier']) test(`Réveil de la horde : choix de carte en PvP ${side}`, () => {
  const d=partie(false,side); d[side].main=['reveil-de-la-horde']; d[side].cimetiere=['ureus-du-seuil','viking-des-neiges'];
  assert.ok(rpgPvpAppliquer(d,side,{type:'jouer-carte',carteId:'reveil-de-la-horde'}).ok);
  choisir(d,side,'ureus-du-seuil'); assert.equal(d[side].creatures[0].carteId,'ureus-du-seuil');
});
test('Un choix MOBA reste sérialisable et conserve la case choisie', () => {
  let d=partie(true); d.joueur.main=['reanimation']; d.joueur.cimetiere=['viking-des-neiges','chien-du-guet'];
  assert.ok(rpgMobaLancerMagie(d,'joueur','reanimation',null,'right',null,{emplacementReanimation:1}).ok);
  d=JSON.parse(JSON.stringify(d)); choisir(d,'joueur','viking-des-neiges');
  assert.equal(d.moba.lanes.find(l=>l.id==='right').slots.joueur[1],d.joueur.creatures[0].id); assert.ok(rpgMobaPlacementCoherent(d));
});
test('MOBA : arrivée de la carte choisie applique et annonce le soin dans la case choisie', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const d=partie(true); d.joueur.main=['reanimation']; d.joueur.cimetiere=['porteuse-de-cruches','chien-du-guet'];
  mobaInfliger(d.moba,'sorcier','right',4);
  assert.ok(rpgMobaLancerMagie(d,'joueur','reanimation',null,'right',null,{emplacementReanimation:1}).ok);
  const carte=rpgCartesRenfortChoisi(d,'joueur').find(c=>c.id==='porteuse-de-cruches');
  const r=rpgMobaResoudreRecherche(d,'joueur',carte.id,carte.index); assert.ok(r.ok,JSON.stringify(r));
  assert.equal(d.moba.lanes.find(l=>l.id==='right').hp.joueur,19);
  assert.ok(r.healingEvents?.some(e=>e.laneId==='right' && e.healing===3));
});
test('MOBA : Passeur préfère sa voie pour la créature choisie', () => {
  const d=partie(true); d.joueur.main=['chien-du-guet'];
  const e=rpgMobaJouerCreature(d,'joueur','chien-du-guet','right',1); assert.ok(e.ok);
  d.moba.creaturesJouees.joueur=false; d.joueur.main=['passeur-au-masque-de-chacal']; d.joueur.cimetiere=['viking-des-neiges'];
  const pose=rpgMobaJouerCreature(d,'joueur','passeur-au-masque-de-chacal','right',1,{sacrificeIds:[e.entite.id]}); assert.ok(pose.ok);
  choisir(d,'joueur','viking-des-neiges');
  assert.equal(d.joueur.creatures.find(c=>c.carteId==='viking-des-neiges').mobaLane,'right'); assert.ok(rpgMobaPlacementCoherent(d));
});
for (const moba of [false,true]) test(`Fin du tour : le renfort du Veilleur résout son arrivée ciblée avant de disparaître (${moba?'MOBA':'PvP'})`, async () => {
  const d=partie(moba); d.joueur.main=['veilleur-des-cendres'];
  const r=moba?rpgMobaJouerCreature(d,'joueur','veilleur-des-cendres','left',0):rpgJouerCreature(d,'joueur','veilleur-des-cendres'); assert.ok(r.ok);
  d.joueur.cimetiere=['guerrier-au-bouclier-rond']; r.entite.detruireFinDuTour=true; rpgFinDeTour(d);
  choisir(d,'joueur','guerrier-au-bouclier-rond');
  const e=d.joueur.creatures.find(x=>x.carteId==='guerrier-au-bouclier-rond'); assert.ok(e); assert.equal(d.tour,'joueur');
  assert.equal(d.arriveeEnAttente?.entiteId,e.id);
  const resultat=moba?(await import('../src/games/rpgMobaLocal.js')).rpgMobaResoudreArrivee(d,'joueur',e.id):rpgPvpAppliquer(d,'joueur',{type:'resoudre-arrivee',cibleId:e.id});
  assert.ok(resultat.ok,JSON.stringify(resultat)); assert.equal(d.tour,'sorcier'); assert.equal(d.joueur.creatures.length,0);
  assert.ok(d.joueur.cimetiere.includes('guerrier-au-bouclier-rond')); if(moba) assert.ok(rpgMobaPlacementCoherent(d));
});
test('MOBA : une carte non auditée ne masque pas les créatures admissibles plus anciennes', () => {
  const d=partie(true); d.joueur.main=['reanimation']; d.joueur.cimetiere=['chien-du-guet','boualem'];
  assert.ok(rpgMobaLancerMagie(d,'joueur','reanimation',null,'left',null,{emplacementReanimation:0}).ok);
  assert.deepEqual(rpgCartesRenfortChoisi(d,'joueur').map(c=>c.id),['chien-du-guet']);
  choisir(d,'joueur','chien-du-guet'); assert.ok(d.joueur.cimetiere.includes('boualem'));
});
test('IA Duel : réanimation choisie automatiquement sans bloquer la partie', () => {
  const d=partie(false,'sorcier'); d.pvp=false; d.sorcier.main=['reanimation']; d.sorcier.cimetiere=['jarl-au-marteau-de-guerre','viking-des-neiges'];
  assert.ok(rpgLancerMagie(d,'sorcier','reanimation').ok); assert.equal(d.renfortChoixEnAttente,null);
  assert.equal(d.sorcier.creatures[0].carteId,'jarl-au-marteau-de-guerre');
});
test('IA MOBA : évalue et choisit sa réanimation', async () => {
  const {rpgMobaChoisirMagieIA,rpgMobaChoisirRechercheIA} = await import('../src/games/rpgMobaAI.js');
  const d=partie(true,'sorcier'); d.sorcier.main=['reanimation']; d.sorcier.cimetiere=['jarl-au-marteau-de-guerre','viking-des-neiges'];
  const coup=rpgMobaChoisirMagieIA(d,'sorcier'); assert.equal(coup?.id,'reanimation');
  assert.ok(rpgMobaLancerMagie(d,'sorcier',coup.id,coup.cible,coup.lane,coup.prixLane,coup).ok);
  const id=rpgMobaChoisirRechercheIA(d,'sorcier'); assert.ok(id); choisir(d,'sorcier',id);
  assert.equal(d.sorcier.creatures.length,1); assert.ok(rpgMobaPlacementCoherent(d));
});
