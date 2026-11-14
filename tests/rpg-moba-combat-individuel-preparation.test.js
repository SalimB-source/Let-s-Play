import test from 'node:test';
import assert from 'node:assert/strict';
import { mobaNouveau } from '../src/games/rpgMoba.js';
import { rpgMobaCiblesIndividuelles, rpgMobaCibleIndividuelleEncoreLegale, rpgMobaBonusProvocation, rpgMobaExcedentOverkill } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgLancerMagie, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { rpgMobaJouerCreature, rpgMobaNouveauDuel, rpgMobaDeclarerAttaque, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaPeutEmbuscade, rpgMobaLancerMagie, rpgMobaResoudreArrivee } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';

const entite = (id, lane, attrs = {}) => ({ id, carteId: 'ashigaru-des-braises', mobaLane: lane, atk: 3, def: 2, pv: 2, pvMax: 2, ...attrs });
function position(attackerAttrs = {}, targets = []) {
  return { tour: 'joueur', moba: mobaNouveau(), joueur: { creatures: [entite('a', 'left', attackerAttrs)] }, sorcier: { creatures: targets } };
}
const choix = (d) => rpgMobaCiblesIndividuelles(d, 'joueur', 'a');

test('attaque normale : même voie, sans Infiltration et sans cible volante pour un attaquant terrestre', () => {
  const d = position({}, [entite('sol', 'left'), entite('vol', 'left', { envol: true }), entite('furtif', 'left', { infiltration: true }), entite('ailleurs', 'right')]);
  assert.deepEqual(choix(d), { cibles: ['sol'], directe: true });
  d.sorcier.creatures.shift();
  assert.deepEqual(choix(d), { cibles: [], directe: true });
});

test('Envol : choix de la frappe directe même face à un ennemi volant', () => {
  const d = position({ envol: true }, [entite('sol', 'left'), entite('vol-infiltre', 'left', { envol: true, infiltration: true })]);
  assert.deepEqual(choix(d), { cibles: ['sol'], directe: true });
  d.sorcier.creatures.push(entite('vol', 'left', { envol: true }));
  assert.deepEqual(choix(d), { cibles: ['sol', 'vol'], directe: true });
});

test('Attaque ciblée : Défenseur ne force que les attaques de sa propre voie', () => {
  const d = position({ coupRapide: true }, [entite('cible', 'right', { envol: true, infiltration: true })]);
  assert.deepEqual(choix(d), { cibles: ['cible'], directe: true });
  d.sorcier.creatures.push(entite('garde', 'center', { defenseur: true }));
  assert.deepEqual(choix(d), { cibles: ['cible', 'garde'], directe: true });
  d.sorcier.creatures.push(entite('garde-local', 'left', { defenseur: true }));
  assert.deepEqual(choix(d), { cibles: ['garde-local'], directe: false });
});

test('Provocation prime sur Défenseur uniquement si accessible', () => {
  const d = position({}, [entite('garde', 'left', { defenseur: true }), entite('provoque', 'left', { provocation: true, envol: true }), entite('loin', 'right', { provocation: true })]);
  assert.deepEqual(choix(d), { cibles: ['garde'], directe: false });
  d.joueur.creatures[0].envol = true;
  assert.deepEqual(choix(d), { cibles: ['provoque'], directe: false });
  d.joueur.creatures[0].coupRapide = true;
  assert.deepEqual(choix(d), { cibles: ['provoque', 'loin'], directe: false });
});

test('cible fixée : nouveau Défenseur sans effet rétroactif, mais perte ou illégalité annule', () => {
  const d = position({}, [entite('c', 'left')]);
  const ok = () => rpgMobaCibleIndividuelleEncoreLegale(d, 'joueur', 'a', 'c', false, 'left');
  assert.equal(ok(), true);
  d.sorcier.creatures.push(entite('nouveau', 'left', { defenseur: true }));
  assert.equal(ok(), true);
  d.sorcier.creatures[0].infiltration = true; assert.equal(ok(), false);
  d.sorcier.creatures[0].infiltration = false; d.sorcier.creatures[0].mobaLane = 'right'; assert.equal(ok(), false);
  d.sorcier.creatures.shift(); assert.equal(ok(), false);
});

test('le ciblage fonctionne aussi pour le camp sorcier et la voie de combat effective', () => {
  const d = position({}, [entite('attaquant-sorcier', 'right')]);
  d.sorcier.creatures[0].coupRapide = true;
  d.joueur.creatures.push(entite('provocation', 'left', { provocation: true }));
  assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'sorcier', 'attaquant-sorcier'), { cibles: ['provocation'], directe: false });
  d.sorcier.creatures[0].coupRapide = false;
  d.sorcier.creatures[0].mobaLane = 'left';
  assert.deepEqual(rpgMobaCiblesIndividuelles(d, 'sorcier', 'attaquant-sorcier'), { cibles: ['provocation'], directe: false });
});

test('perdre Attaque ciblée ou Envol rend une cible fixe illégale sans redirection', () => {
  const d = position({ coupRapide: true }, [entite('c', 'right', { envol: true, infiltration: true })]);
  const ok = () => rpgMobaCibleIndividuelleEncoreLegale(d, 'joueur', 'a', 'c', true, 'left');
  assert.equal(ok(), true);
  d.joueur.creatures[0].coupRapide = false; assert.equal(ok(), false);
  d.joueur.creatures[0].envol = true; d.sorcier.creatures[0].infiltration = false; d.sorcier.creatures[0].mobaLane = 'left';
  assert.equal(rpgMobaCibleIndividuelleEncoreLegale(d, 'joueur', 'a', 'c', false, 'left'), true);
  d.joueur.creatures[0].envol = false;
  assert.equal(rpgMobaCibleIndividuelleEncoreLegale(d, 'joueur', 'a', 'c', false, 'left'), false);
});

test('bonus de Provocation cumulable, inscrit pour expiration en fin de tour', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  d.joueur.main = ['ashigaru-des-braises'];
  const c = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  c.provocation = true; const base = [c.def, c.pv, c.pvMax];
  assert.equal(rpgMobaBonusProvocation(d, 'joueur', c.id), true);
  assert.equal(rpgMobaBonusProvocation(d, 'joueur', c.id), true);
  assert.deepEqual([c.def, c.pv, c.pvMax], base.map((v) => v + 2));
  rpgFinDeTour(d);
  assert.deepEqual([c.def, c.pv, c.pvMax], base);
});

test('Overkill ne calcule que l’excédent de dégâts', () => {
  assert.equal(rpgMobaExcedentOverkill({ overkill: true }, { def: 3 }, 5), 2);
  assert.equal(rpgMobaExcedentOverkill({ overkill: true }, { def: 3 }, 2), 0);
  assert.equal(rpgMobaExcedentOverkill({}, { def: 3 }, 5), 0);
});

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  return d;
}

test('Traqueur garde son arrivée normale mais pas son Embuscade à deux attaquants', () => {
  const d = partie(); d.joueur.main = ['ashigaru-des-braises'];
  const a = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite; a.ready = true; a.malInvocation = false;
  d.joueur.main = ['ashigaru-des-braises'];
  // Un second attaquant est placé sur un tour séparé des quotas de pose.
  d.moba.creaturesJouees.joueur = false;
  const b = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 1).entite; b.ready = true;
  d.sorcier.main = ['traqueur-des-nuits-sans-lune'];
  assert.equal(rpgMobaDeclarerAttaque(d, 'joueur', [a.id, b.id]).ok, false);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, null, 'left').ok);
  assert.equal(rpgMobaPeutEmbuscade(d, 'sorcier', 'traqueur-des-nuits-sans-lune'), false);
});


test('Traqueur conserve son effet d’arrivée en invocation normale', () => {
  const d = partie();
  d.joueur.main = ['ashigaru-des-braises'];
  const victime = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(d);
  d.sorcier.main = ['traqueur-des-nuits-sans-lune'];
  const resultat = rpgMobaJouerCreature(d, 'sorcier', 'traqueur-des-nuits-sans-lune', 'left', 0);
  assert.ok(resultat.ok, JSON.stringify(resultat));
  assert.equal(resultat.arriveeEnAttente, true);
  assert.ok(rpgMobaResoudreArrivee(d, 'sorcier', victime.id).ok);
});

test('le sort Embuscade reste utilisable en classique', () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 });
  d.joueur.main = ['embuscade']; d.joueur.mana.neige = 20;
  assert.ok(rpgLancerMagie(d, 'joueur', 'embuscade').ok);
});

for (const side of ['joueur', 'sorcier']) {
  for (const voie of ['left', 'center', 'right']) {
    test(`${side} : Défenseur sur une autre voie ne contraint pas l’attaque ciblée depuis ${voie}`, () => {
      const adversaire = side === 'joueur' ? 'sorcier' : 'joueur';
      const autreVoie = voie === 'right' ? 'left' : 'right';
      const attaquant = entite('attaquant', voie, { coupRapide: true });
      const cible = entite('cible', voie);
      const lointain = entite('lointain', autreVoie, { defenseur: true, prioriteAttaqueRapide: true });
      const d = { tour: side, moba: mobaNouveau(), [side]: { creatures: [attaquant] }, [adversaire]: { creatures: [cible, lointain] } };
      assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: ['cible', 'lointain'], directe: true });
      const local = entite('local', voie, { defenseur: true });
      d[adversaire].creatures.push(local);
      assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: ['local'], directe: false });
      local.defenseur = false; local.prioriteAttaqueRapide = true;
      assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: ['local'], directe: false });
      lointain.provocation = true;
      assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: ['lointain'], directe: false }, 'Provocation reste prioritaire');
      lointain.provocation = false;
      attaquant.coupRapide = false;
      assert.deepEqual(rpgMobaCiblesIndividuelles(d, side, attaquant.id), { cibles: ['local'], directe: false }, 'attaque normale inchangée');
    });
  }
}

test('Infiltration peut choisir la voie même face aux créatures, sans ignorer les priorités MOBA', () => {
  const d = position({ infiltration: true }, [entite('sol', 'left'), entite('vol', 'left', { envol: true })]);
  assert.deepEqual(choix(d), { cibles: ['sol'], directe: true });
  d.joueur.creatures[0].envol = true;
  assert.deepEqual(choix(d), { cibles: ['sol', 'vol'], directe: true }, 'Infiltration reste efficace contre un volant');
  d.sorcier.creatures[0].defenseur = true;
  assert.deepEqual(choix(d), { cibles: ['sol'], directe: false });
  d.sorcier.creatures[0].defenseur = false; d.sorcier.creatures[1].provocation = true;
  assert.deepEqual(choix(d), { cibles: ['vol'], directe: false });
});
