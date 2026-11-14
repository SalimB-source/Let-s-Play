import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgCartesRenfortChoisi, rpgFinDeTour, rpgLancerMagie, rpgNouveauDuel, rpgResoudreRenfortChoisi } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer, rpgPvpVue, rpgPvpBrancherHasard } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaLancerMagie, rpgMobaPasserSort, rpgMobaResoudreRecherche, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
function partie(moba = false) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), pvp: true, modeMana: 'essai', rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const side of ['joueur', 'sorcier']) { d[side].main = []; d[side].deck = []; d[side].manaChoixEnAttente = null; }
  rpgPvpBrancherHasard(d, 42); return d;
}
const lancer = (d, side, id) => d.moba ? rpgMobaLancerMagie(d, side, id, null, null, null, { ouvrirReponse: true }) : rpgPvpAppliquer(d, side, { type: 'jouer-carte', carteId: id });
const passer = (d, side) => d.moba && assert.ok(rpgMobaPasserSort(d, side === 'joueur' ? 'sorcier' : 'joueur').ok);
const choisir = (d, side, choix) => d.moba ? rpgMobaResoudreRecherche(d, side, choix?.id ?? null) : rpgPvpAppliquer(d, side, { type: 'choisir-renfort', index: choix?.index ?? null });
for (const moba of [false, true]) for (const side of ['joueur', 'sorcier']) {
  test(`Appel : choix parmi les trois, autres sous le deck (${moba ? 'MOBA' : 'PvP'} ${side})`, () => {
    const d = partie(moba); d.tour = side; d[side].main = ['appel-des-marees'];
    d[side].deck = ['viking-des-neiges','chien-du-guet','loup-des-neiges','trait-de-braise','chacal-du-seuil'];
    const r = lancer(d, side, 'appel-des-marees'); assert.ok(r.ok, JSON.stringify(r)); passer(d, side);
    const cartes = rpgCartesRenfortChoisi(d, side); assert.deepEqual(cartes.map(c => c.id), ['chacal-du-seuil','trait-de-braise','loup-des-neiges']);
    assert.deepEqual(cartes.map(c => c.admissible), [true,false,true]);
    const avant = JSON.stringify(d); assert.equal(choisir(d, side, cartes[1]).ok, false); assert.equal(JSON.stringify(d), avant);
    assert.ok(choisir(d, side, cartes[2]).ok); assert.deepEqual(d[side].deck, ['trait-de-braise','chacal-du-seuil','viking-des-neiges','chien-du-guet']);
    assert.equal(d[side].creatures[0].carteId, 'loup-des-neiges');
    assert.equal(d[side].invocationNormaleJouee ?? false, false); if (moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`Appel sans créature : les trois cartes sont mises sous le deck (${moba ? 'MOBA' : 'PvP'} ${side})`, () => {
    const d = partie(moba); d.tour = side; d[side].main = ['appel-des-marees'];
    d[side].deck = ['chien-du-guet','trait-de-braise','verglas','papyrus'];
    assert.ok(lancer(d, side, 'appel-des-marees').ok); passer(d, side);
    assert.ok(choisir(d, side, null).ok); assert.deepEqual(d[side].deck, ['trait-de-braise','verglas','papyrus','chien-du-guet']);
  });
  test(`Ralliement : choix neige depuis le deck, mélange et destruction à la fin du tour (${moba ? 'MOBA' : 'PvP'} ${side})`, () => {
    const d = partie(moba); d.tour = side; d[side].main = ['ralliement-des-neiges'];
    d[side].deck = ['chien-du-guet','loup-des-neiges','viking-des-neiges','chacal-du-seuil'];
    assert.ok(lancer(d, side, 'ralliement-des-neiges').ok); passer(d, side);
    const cartes = rpgCartesRenfortChoisi(d, side); assert.ok(cartes.some(c=>c.id==='loup-des-neiges'));
    assert.ok(choisir(d, side, cartes.find(c=>c.id==='loup-des-neiges')).ok);
    assert.equal(d[side].creatures[0].detruireFinDuTour, true); assert.deepEqual([...d[side].deck].sort(), ['chien-du-guet','viking-des-neiges','chacal-du-seuil'].sort());
    rpgFinDeTour(d); assert.equal(d[side].creatures.length, 0); assert.ok(d[side].cimetiere.includes('loup-des-neiges'));
  });
  test(`Veille : seuls les Samouraïs de coût ≤ 3 de la main sont proposés (${moba ? 'MOBA' : 'PvP'} ${side})`, () => {
    const d = partie(moba); d.tour = side; d[side].main = ['veille-des-braises','hatamoto-des-cendres','loup-des-neiges','daimyo-du-soleil-rouge'];
    assert.ok(lancer(d, side, 'veille-des-braises').ok); passer(d, side);
    const cartes = rpgCartesRenfortChoisi(d, side); assert.deepEqual(cartes.map(c=>c.id), ['hatamoto-des-cendres']);
    assert.ok(choisir(d, side, cartes[0]).ok); assert.equal(d[side].creatures[0].carteId,'hatamoto-des-cendres');
    assert.ok(d[side].main.includes('daimyo-du-soleil-rouge'));
  });
}
test('PvP : le serveur bloque les actions pendant le choix et refuse un choix adverse ou invalide', () => {
  const d = partie(); d.joueur.main = ['appel-des-marees']; d.joueur.deck = ['chien-du-guet','loup-des-neiges'];
  assert.ok(lancer(d, 'joueur', 'appel-des-marees').ok);
  const avant = JSON.stringify(d);
  assert.equal(rpgPvpAppliquer(d, 'joueur', {type:'fin-de-tour'}).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', {type:'choisir-renfort', index:1}).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'joueur', {type:'choisir-renfort', index:99}).ok, false);
  assert.equal(JSON.stringify(d), avant);
  assert.deepEqual(rpgCartesRenfortChoisi(rpgPvpVue(d,'sorcier'), 'joueur'), []);
});

test('MOBA : le sort contrecarré ne révèle ni ne déplace les cartes du dessus', () => {
  const d = partie(true); d.joueur.main = ['appel-des-marees']; d.joueur.deck = ['chien-du-guet','loup-des-neiges']; d.sorcier.main = ['contresort-des-abimes'];
  assert.ok(lancer(d, 'joueur', 'appel-des-marees').ok);
  assert.ok(rpgMobaLancerMagie(d, 'sorcier', 'contresort-des-abimes').ok);
  assert.equal(d.mobaRechercheEnAttente, undefined); assert.deepEqual(d.joueur.deck, ['chien-du-guet','loup-des-neiges']);
});
for (const moba of [false, true]) {
  test(`Appel fonctionne avec moins de trois cartes et conserve les doublons (${moba ? 'MOBA' : 'PvP'})`, () => {
    const d = partie(moba); d.joueur.main = ['appel-des-marees']; d.joueur.deck = ['loup-des-neiges','loup-des-neiges'];
    assert.ok(lancer(d, 'joueur', 'appel-des-marees').ok); passer(d,'joueur');
    assert.ok(choisir(d,'joueur',rpgCartesRenfortChoisi(d,'joueur')[1]).ok);
    assert.deepEqual(d.joueur.deck, ['loup-des-neiges']); assert.equal(d.joueur.creatures.length, 1);
  });
  test(`le choix est résolu même lorsque la zone ne contient aucune cible (${moba ? 'MOBA' : 'PvP'})`, () => {
    const d = partie(moba); d.joueur.main = ['ralliement-des-neiges']; d.joueur.deck = [];
    assert.ok(lancer(d, 'joueur', 'ralliement-des-neiges').ok); passer(d,'joueur');
    assert.deepEqual(rpgCartesRenfortChoisi(d,'joueur'),[]); assert.ok(choisir(d,'joueur',null).ok);
    assert.equal(d.joueur.creatures.length, 0); assert.ok(!d.mobaRechercheEnAttente && !d.renfortChoixEnAttente);
  });
}
test('le mélange PvP est déterministe et utilise le hasard sérialisé', () => {
  function jouer() {
    const d = partie(); d.joueur.main = ['ralliement-des-neiges'];
    d.joueur.deck = ['chien-du-guet','chacal-du-seuil','viking-des-neiges','trait-de-braise','loup-des-neiges','papyrus'];
    assert.ok(lancer(d,'joueur','ralliement-des-neiges').ok);
    assert.ok(choisir(d,'joueur',rpgCartesRenfortChoisi(d,'joueur').find(c=>c.id==='loup-des-neiges')).ok);
    return d;
  }
  const a = jouer(), b = jouer(); assert.deepEqual(a.joueur.deck,b.joueur.deck); assert.ok(a.hasard.compteur > 0);
});
test('les autres actions de moteur ne peuvent pas interrompre le choix', () => {
  const d = partie(); d.joueur.main = ['appel-des-marees','chien-du-guet']; d.joueur.deck = ['loup-des-neiges'];
  assert.ok(lancer(d,'joueur','appel-des-marees').ok);
  const avant = JSON.stringify(d); assert.equal(rpgLancerMagie(d,'joueur','appel-des-marees').ok, false); rpgFinDeTour(d);
  assert.equal(JSON.stringify(d),avant);
});

test('l’IA du Duel choisit et résout un sort de renfort sans intervention humaine', async () => {
  const { choisirCarteIA } = await import('../src/games/rpgAI.js');
  const d = partie(); d.pvp = false; d.tour = 'sorcier'; d.sorcier.main = ['veille-des-braises','hatamoto-des-cendres']; d.sorcier.invocationNormaleJouee = true; d.sorcier.reserveAscension = [];
  const choix = choisirCarteIA(d,'sorcier',{rng:()=>.5}); assert.equal(choix?.carteId,'veille-des-braises');
  assert.ok(rpgLancerMagie(d,'sorcier','veille-des-braises').ok);
  assert.equal(d.sorcier.creatures[0].carteId,'hatamoto-des-cendres'); assert.ok(!d.renfortChoixEnAttente);
});
test('l’IA MOBA évalue le renfort et résout son choix', async () => {
  const { rpgMobaChoisirMagieIA, rpgMobaChoisirRechercheIA } = await import('../src/games/rpgMobaAI.js');
  const d = partie(true); d.tour='sorcier'; d.sorcier.main=['veille-des-braises','hatamoto-des-cendres']; d.moba.creaturesJouees.sorcier=true;
  const choix=rpgMobaChoisirMagieIA(d,'sorcier'); assert.equal(choix?.id,'veille-des-braises');
  assert.ok(rpgMobaLancerMagie(d,'sorcier',choix.id).ok);
  assert.equal(rpgMobaChoisirRechercheIA(d,'sorcier'),'hatamoto-des-cendres');
  assert.ok(rpgMobaResoudreRecherche(d,'sorcier','hatamoto-des-cendres').ok);
  assert.equal(d.sorcier.creatures[0].carteId,'hatamoto-des-cendres');
});
for (const moba of [false, true]) test(`l’arrivée ciblée de la créature invoquée reste à choisir (${moba ? 'MOBA' : 'PvP'})`, async () => {
  const d=partie(moba); d.joueur.main=['ralliement-des-neiges']; d.joueur.deck=['guerrier-au-bouclier-rond'];
  assert.ok(lancer(d,'joueur','ralliement-des-neiges').ok); passer(d,'joueur');
  assert.ok(choisir(d,'joueur',rpgCartesRenfortChoisi(d,'joueur')[0]).ok);
  const e=d.joueur.creatures[0]; assert.equal(d.arriveeEnAttente?.carteId,'guerrier-au-bouclier-rond');
  const result = moba ? (await import('../src/games/rpgMobaLocal.js')).rpgMobaResoudreArrivee(d,'joueur',e.id)
    : rpgPvpAppliquer(d,'joueur',{type:'resoudre-arrivee',cibleId:e.id});
  assert.ok(result.ok,JSON.stringify(result)); assert.equal(e.bouclier,1); assert.ok(!d.arriveeEnAttente);
});

test('MOBA : choisir un doublon précis conserve l’ordre des autres cartes', () => {
  const d=partie(true); d.joueur.main=['appel-des-marees'];
  d.joueur.deck=['chien-du-guet','loup-des-neiges','trait-de-braise','loup-des-neiges'];
  assert.ok(lancer(d,'joueur','appel-des-marees').ok); passer(d,'joueur');
  const cartes=rpgCartesRenfortChoisi(d,'joueur');
  assert.ok(rpgMobaResoudreRecherche(d,'joueur',cartes[2].id,cartes[2].index).ok);
  assert.deepEqual(d.joueur.deck,['trait-de-braise','loup-des-neiges','chien-du-guet']);
});
for (const side of ['joueur','sorcier']) test(`PvP : le choix est privé pour le camp ${side}`, () => {
  const d=partie(); d.tour=side; d[side].main=['appel-des-marees']; d[side].deck=['chien-du-guet','loup-des-neiges','trait-de-braise'];
  assert.ok(lancer(d,side,'appel-des-marees').ok);
  const own=rpgPvpVue(d,side), other=rpgPvpVue(d,side==='joueur'?'sorcier':'joueur');
  assert.equal(own.renfortChoixEnAttente.cote,'joueur');
  assert.equal(other.renfortChoixEnAttente.cote,'sorcier');
  assert.equal(rpgCartesRenfortChoisi(own,'joueur').length,3);
  assert.deepEqual(other.sorcier.deck,[]); assert.deepEqual(rpgCartesRenfortChoisi(other,'sorcier'),[]);
});

for (const moba of [false, true]) test(`terrain plein : aucune créature ne peut être choisie (${moba ? 'MOBA' : 'Duel'})`, async () => {
  const d=partie(moba); const {rpgJouerCreature}=await import('../src/games/rpgDuel.js');
  const {rpgMobaJouerCreature}=await import('../src/games/rpgMobaLocal.js');
  for (let i=0;i<5;i++) {
    d.joueur.main=['viking-des-neiges']; d.joueur.invocationNormaleJouee=false;
    if (moba) d.moba.creaturesJouees.joueur=false;
    const r=moba ? rpgMobaJouerCreature(d,'joueur','viking-des-neiges',['left','left','center','right','right'][i],[0,1,0,0,1][i]) : rpgJouerCreature(d,'joueur','viking-des-neiges');
    assert.ok(r.ok,JSON.stringify(r));
  }
  d.joueur.main=['appel-des-marees']; d.joueur.deck=['chien-du-guet','loup-des-neiges'];
  assert.ok(lancer(d,'joueur','appel-des-marees').ok); passer(d,'joueur');
  assert.ok(rpgCartesRenfortChoisi(d,'joueur').every(c=>!c.admissible));
  assert.ok(choisir(d,'joueur',null).ok); assert.equal(d.joueur.creatures.length,5);
  assert.deepEqual(d.joueur.deck,['chien-du-guet','loup-des-neiges']);
});

test('Duel : une attaque individuelle ne contourne pas le choix obligatoire', async () => {
  const {rpgJouerCreature}=await import('../src/games/rpgDuel.js');
  const {rpgDeclarerAttaqueIndividuelleClassique}=await import('../src/games/rpgCombatIndividuelClassique.js');
  const d=partie(); d.joueur.main=['djinn-des-braises-voilees'];
  const creature=rpgJouerCreature(d,'joueur','djinn-des-braises-voilees'); assert.ok(creature.ok);
  d.joueur.main=['appel-des-marees'];d.joueur.deck=['chien-du-guet'];assert.ok(lancer(d,'joueur','appel-des-marees').ok);
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d,'joueur',creature.entite.id).ok,false);
});
