import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColors, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgResoudreArriveeCiblee, rpgLancerMagie, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi, rpgCibleAuto, rpgSorcierAnnonceSuivante } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature, rpgMobaLancerMagie, rpgMobaResoudreRecherche, rpgMobaPlacementCoherent, MOBA_CARTES_AUTORISEES } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';

const ID = 'empereur-du-colisee';
const autre = s => s === 'joueur' ? 'sorcier' : 'joueur';
function partie(mode) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = (mode === 'moba' ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: deck, sorcierDeck: deck, pvp: mode === 'pvp', modeMana: 'essai', rng: () => .9 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const side of ['joueur','sorcier']) {
    d[side].main = []; d[side].deck = []; d[side].manaChoixEnAttente = null;
    d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  }
  return d;
}
function poser(d, side, id, lane = 'left', slot = 0) {
  d.tour = side; d[side].invocationNormaleJouee = false;
  if (d.moba) d.moba.creaturesJouees[side] = false;
  d[side].main.push(id);
  const r = d.moba ? rpgMobaJouerCreature(d, side, id, lane, slot) : rpgJouerCreature(d, side, id);
  assert.ok(r.ok && r.entite, JSON.stringify(r)); return r.entite;
}
function jouer(d, mode, side, sacrifice, cible = null, differee = true) {
  d.tour = side; d[side].invocationNormaleJouee = false; d[side].main.push(ID);
  if (d.moba) { d.moba.creaturesJouees[side] = false; return rpgMobaJouerCreature(d, side, ID, 'left', 0, { sacrificeIds: [sacrifice.id] }); }
  if (mode === 'pvp') return rpgPvpAppliquer(d, side, { type:'jouer-carte', carteId: ID, sacrificeIds: [sacrifice.id], cibleId: cible, cibleDifferee: differee });
  return rpgJouerCreature(d, side, ID, cible, { sacrificeIds: [sacrifice.id], cibleDifferee: differee });
}
function choisir(d, mode, side, id) {
  return mode === 'moba' ? rpgMobaResoudreArrivee(d, side, id) : mode === 'pvp' ? rpgPvpAppliquer(d, side, {type:'resoudre-arrivee', cibleId:id}) : rpgResoudreArriveeCiblee(d, side, id);
}
function passer(d, mode, side) {
  if (mode === 'pvp' && d.effetCreatureEnAttente) assert.ok(rpgPvpAppliquer(d, autre(side), {type:'passer-effet'}).ok);
  if (mode === 'moba' && d.effetCreatureEnAttente) assert.ok(rpgMobaPasserEffetCreature(d, autre(side)).ok);
}

test('fiche de l’empereur, illustration et disponibilité MOBA', () => {
  const c = cardById(ID);
  assert.deepEqual([c.kind, c.cost, c.atk, c.def], ['creature',6,5,4]);
  assert.deepEqual(new Set(cardColors(c)), new Set(['sable','braise']));
  assert.deepEqual(c.arrivee, {type:'destruction-cible', cible:'creature', portee:'tous', coutMax:4});
  assert.match(c.text, /créature ciblée de coût 4 ou moins/);
  assert.ok(existsSync(new URL(`../public/cards/${ID}.jpg`, import.meta.url))); assert.ok(MOBA_CARTES_AUTORISEES.includes(ID));
});
for (const mode of ['classique','pvp','moba']) for (const side of ['joueur','sorcier']) for (const camp of ['allie','adverse']) {
  test(`${mode} ${side} détruit une créature ${camp} de coût 4`, () => {
    const d = partie(mode), sacrifice = poser(d, side, 'ashigaru-des-braises');
    const targetSide = camp === 'allie' ? side : autre(side);
    const cible = poser(d, targetSide, 'chevalier-sacre-des-braises', 'left', targetSide === side ? 1 : 0);
    assert.equal(cardById(cible.carteId).cost, 4);
    const r = jouer(d, mode, side, sacrifice); assert.ok(r.ok && d.arriveeEnAttente, JSON.stringify(r.raison));
    assert.ok(choisir(d, mode, side, cible.id).ok); passer(d, mode, side);
    assert.ok(!d[targetSide].creatures.some(e => e.id === cible.id));
    assert.ok(d[targetSide].cimetiere.includes(cible.carteId));
    assert.ok(d[side].creatures.some(e => e.carteId === ID)); if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}
for (const mode of ['classique','pvp','moba']) for (const side of ['joueur','sorcier']) {
  test(`${mode} ${side} refuse coût 5 et site puis accepte une cible légale`, () => {
    const d = partie(mode), sacrifice = poser(d, side, 'ashigaru-des-braises');
    const enemy = autre(side), cible = poser(d, enemy, 'chevalier-sacre-des-braises');
    const legal = poser(d, side, 'ashigaru-des-braises', 'left', 1);
    cible.coutBonusArme = 1; // 4 + le surcoût du Grappin = 5.
    const r = jouer(d, mode, side, sacrifice); assert.ok(r.ok && d.arriveeEnAttente);
    assert.equal(choisir(d, mode, side, cible.id).ok, false);
    const actuelle = () => d[enemy].creatures.find(e => e.id === cible.id);
    actuelle().coutBonusArme = 0; actuelle().carteId = 'source-de-bimini';
    assert.equal(choisir(d, mode, side, cible.id).ok, false);
    assert.ok(choisir(d, mode, side, legal.id).ok); passer(d, mode, side);
    assert.ok(!d[side].creatures.some(e => e.id === legal.id));
    if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${mode} ${side} sans cible après sacrifice ne bloque pas`, () => {
    const d = partie(mode), sacrifice = poser(d, side, 'ashigaru-des-braises');
    const r = jouer(d, mode, side, sacrifice, null, false);
    assert.ok(r.ok, JSON.stringify(r.raison)); assert.ok(!d.arriveeEnAttente);
    assert.ok(d[side].creatures.some(e => e.carteId === ID));
  });
}
for (const side of ['joueur','sorcier']) {
  test(`pose directe ${side} : choix allié, choix invalide et cible sacrifiée`, () => {
    const d = partie('classique'), sacrifice = poser(d, side, 'ashigaru-des-braises');
    const cible = poser(d, side, 'chevalier-sacre-des-braises', 'left', 1);
    d.tour = side; d[side].invocationNormaleJouee = false; d[side].main.push(ID);
    const opts = {sacrificeIds:[sacrifice.id]};
    assert.equal(rpgJouerCreature(d, side, ID, sacrifice.id, opts).ok, false);
    assert.equal(rpgJouerCreature(d, side, ID, null, opts).ok, false);
    assert.ok(rpgJouerCreature(d, side, ID, cible.id, opts).ok);
    assert.ok(!d[side].creatures.some(e => e.id === cible.id));
  });
  test(`MOBA ${side} : seule la voie de l’empereur peut être ciblée`, () => {
    const d = partie('moba'), sacrifice = poser(d, side, 'ashigaru-des-braises');
    const hors = poser(d, autre(side), 'ashigaru-des-braises', 'right', 0);
    const dans = poser(d, side, 'ashigaru-des-braises', 'left', 1);
    assert.ok(jouer(d, 'moba', side, sacrifice).ok);
    assert.equal(choisir(d, 'moba', side, hors.id).ok, false);
    assert.ok(choisir(d, 'moba', side, dans.id).ok);
    assert.ok(d[autre(side)].creatures.some(e => e.id === hors.id));
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`MOBA ${side} : pas d’attente si seules les autres voies ont des cibles`, () => {
    const d = partie('moba'), sacrifice = poser(d, side, 'ashigaru-des-braises');
    const hors = poser(d, autre(side), 'ashigaru-des-braises', 'right', 0);
    assert.ok(jouer(d, 'moba', side, sacrifice).ok);
    assert.ok(!d.arriveeEnAttente); assert.ok(d[autre(side)].creatures.some(e => e.id === hors.id));
  });
}
for (const mode of ['classique','pvp','moba']) for (const side of ['joueur','sorcier']) {
  test(`${mode} ${side} : réanimation déclenche l’arrivée et choisit un allié`, () => {
    const d = partie(mode), cible = poser(d, side, 'ashigaru-des-braises', 'left', 1);
    d.tour = side; d[side].cimetiere = [ID]; d[side].main = ['reanimation'];
    const r = d.moba ? rpgMobaLancerMagie(d, side, 'reanimation', null, 'left', null, { emplacementReanimation: 0 })
      : rpgLancerMagie(d, side, 'reanimation');
    assert.ok(r.ok, JSON.stringify(r));
    const choix = rpgCartesRenfortChoisi(d, side).find(c => c.id === ID);
    if (choix) {
      const rr = d.moba ? rpgMobaResoudreRecherche(d, side, ID, choix.index) : rpgResoudreRenfortChoisi(d, side, choix.index);
      assert.ok(rr.ok, JSON.stringify(rr));
    }
    // L'IA classique résout certains retours automatiquement ; les autres demandent le choix.
    if (d.arriveeEnAttente) { assert.ok(choisir(d, mode, side, cible.id).ok); passer(d, mode, side); }
    assert.ok(!d[side].creatures.some(e => e.id === cible.id));
    assert.ok(d[side].creatures.some(e => e.carteId === ID));
    if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
  });
}
test('IA classique : choisit une cible adverse puis, à défaut, alliée', () => {
  const d = partie('classique'), alliée = poser(d, 'sorcier', 'ashigaru-des-braises'), adverse = poser(d, 'joueur', 'chevalier-sacre-des-braises');
  assert.equal(rpgCibleAuto(d, 'sorcier', cardById(ID)), adverse.id);
  d.joueur.creatures = [];
  assert.equal(rpgCibleAuto(d, 'sorcier', cardById(ID)), alliée.id);
});
test('IA classique : l’annonce distingue le sacrifice et la cible adverse', () => {
  const d = partie('classique'); const sacrifice = poser(d, 'sorcier', 'ashigaru-des-braises');
  const cible = poser(d, 'joueur', 'chevalier-sacre-des-braises');
  d.tour = 'sorcier'; d.sorcier.main = [ID]; d.sorcier.invocationNormaleJouee = false;
  const annonce = rpgSorcierAnnonceSuivante(d, () => .9);
  assert.ok(annonce); assert.equal(annonce.cibleId, cible.id); assert.deepEqual(annonce.sacrificeIds, [sacrifice.id]);
});
test('IA MOBA : choisit dans la voie et évite une cible hors voie', () => {
  const d = partie('moba'), sacrifice = poser(d, 'sorcier', 'ashigaru-des-braises');
  const hors = poser(d, 'joueur', 'ashigaru-des-braises', 'right', 0);
  const allie = poser(d, 'sorcier', 'ashigaru-des-braises', 'left', 1);
  assert.ok(jouer(d, 'moba', 'sorcier', sacrifice).ok);
  assert.equal(rpgMobaChoisirArriveeIA(d, 'sorcier'), allie.id);
  assert.ok(choisir(d, 'moba', 'sorcier', allie.id).ok); assert.ok(d.joueur.creatures.some(e => e.id === hors.id));
});
for (const side of ['joueur','sorcier']) test(`PvP ${side} : réponse adverse avant résolution de la destruction`, () => {
  const d = partie('pvp'), sacrifice = poser(d, side, 'ashigaru-des-braises');
  const cible = poser(d, autre(side), 'chevalier-sacre-des-braises');
  d[autre(side)].main = ['rempart-de-dunes'];
  assert.ok(jouer(d, 'pvp', side, sacrifice).ok); assert.ok(choisir(d, 'pvp', side, cible.id).ok);
  assert.ok(d.effetCreatureEnAttente); assert.ok(d[autre(side)].creatures.some(e => e.id === cible.id));
  passer(d, 'pvp', side); assert.ok(!d[autre(side)].creatures.some(e => e.id === cible.id));
});
test('un coût imprimé 5 est hors seuil même si la cible reste une créature', () => {
  const d = partie('classique'), sacrifice = poser(d, 'joueur', 'ashigaru-des-braises');
  const cible = poser(d, 'sorcier', 'ashigaru-des-braises');
  const legal = poser(d, 'joueur', 'ashigaru-des-braises', 'left', 1);
  cible.carteId = 'jarl-au-marteau-de-guerre'; assert.equal(cardById(cible.carteId).cost, 5);
  assert.ok(jouer(d, 'classique', 'joueur', sacrifice).ok);
  assert.equal(choisir(d, 'classique', 'joueur', cible.id).ok, false);
  assert.ok(choisir(d, 'classique', 'joueur', legal.id).ok);
});
test('la carte et l’illustration apparaissent sur la table et l’aperçu', async () => {
  const { createServer } = await import('vite'); const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server'); const { JSDOM } = await import('jsdom');
  const vite = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  try {
    const { TableCard, HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const { cardArt } = await vite.ssrLoadModule('/src/games/rpgCardArt.js');
    assert.match(cardArt(ID), /cards\/empereur-du-colisee\.jpg/);
    const d = partie('classique'), sacrifice = poser(d, 'joueur', 'ashigaru-des-braises');
    assert.ok(jouer(d, 'classique', 'joueur', sacrifice, null, false).ok);
    const entite = d.joueur.creatures.find(e => e.carteId === ID);
    for (const moba of [null, {className:'moba__slot'}]) {
      const doc = new JSDOM(renderToStaticMarkup(React.createElement(TableCard, {entite, cote:'joueur', moba}))).window.document;
      assert.match(doc.body.innerHTML, /empereur-du-colisee\.jpg/);
    }
    const doc = new JSDOM(renderToStaticMarkup(React.createElement(HoverCardPreview, {carte:cardById(ID), entite}))).window.document;
    assert.match(doc.body.textContent, /Empereur du Colisée/); assert.match(doc.body.textContent, /coût 4 ou moins/);
  } finally { await vite.close(); }
});
for (const side of ['joueur','sorcier']) test(`MOBA ${side} : réponse avant la destruction d’une cible adverse`, () => {
  const d = partie('moba'); d.pvp = true;
  const sacrifice = poser(d, side, 'ashigaru-des-braises');
  const cible = poser(d, autre(side), 'chevalier-sacre-des-braises');
  d[autre(side)].main = ['rempart-de-dunes'];
  assert.ok(jouer(d, 'moba', side, sacrifice).ok); assert.ok(choisir(d, 'moba', side, cible.id).ok);
  assert.ok(d.effetCreatureEnAttente); assert.ok(d[autre(side)].creatures.some(e => e.id === cible.id));
  passer(d, 'moba', side); assert.ok(!d[autre(side)].creatures.some(e => e.id === cible.id));
  assert.ok(rpgMobaPlacementCoherent(d));
});
