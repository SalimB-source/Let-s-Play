import test from 'node:test';
import assert from 'node:assert/strict';
import { duelCardById } from '../src/games/rpgCards.js';
import { rpgMulligan, rpgDemarrerManaEssai, rpgChoisirCouleurMana } from '../src/games/rpgDuel.js';
import { mobaInfliger } from '../src/games/rpgMoba.js';
import { retoursAuDeckInvocation } from '../src/games/rpgInvocation.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaChoixActivation, rpgMobaActiverCapacite, rpgMobaLancerMagie, rpgMobaPasserEffetCreature, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirActivationIA } from '../src/games/rpgMobaAI.js';

function partie() {
  const deck = Array(30).fill('chien-du-guet');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  rpgChoisirCouleurMana(d, 'joueur', 'neige');
  return d;
}
function poser(d, side, id, lane, slot = 0) {
  d.tour = side; d[side].main = [id, 'chien-du-guet', 'chien-du-guet'];
  d[side].manaChoixEnAttente = false; d.moba.creaturesJouees[side] = false;
  for (const color of Object.keys(d[side].mana)) d[side].mana[color] = 20;
  const n = retoursAuDeckInvocation(duelCardById(id), d, side);
  const r = rpgMobaJouerCreature(d, side, id, lane, slot, n ? { retourIds: Array(n).fill('chien-du-guet') } : {});
  assert.ok(r.ok, `${id}: ${JSON.stringify(r)}`); r.entite.malInvocation = false; return r.entite;
}

test('Jarl : seules les paires partageant une voie sont acceptées, paiement atomique et cases libérées', () => {
  const d = partie(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre', 'left');
  const allie = poser(d, 'joueur', 'chien-du-guet', 'right');
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'left');
  d.tour = 'joueur'; d.sorcier.main = []; allie.atk = 1; jarl.atk = 10; cible.pv = 1; cible.def = 1;
  const choix = rpgMobaChoixActivation(d, 'joueur', jarl.id);
  assert.ok(choix.some(x => x.championId === jarl.id && x.cibleId === cible.id));
  assert.ok(!choix.some(x => x.championId === allie.id && x.cibleId === cible.id));
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaActiverCapacite(d, 'joueur', jarl.id, { championId: allie.id, cibleId: cible.id }).ok, false);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', jarl.id, { championId: jarl.id, cibleId: cible.id }).ok);
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
  assert.ok(rpgMobaPlacementCoherent(d)); assert.equal(jarl.activationUtiliseeMatch, true);
  assert.deepEqual(rpgMobaChoixActivation(d, 'joueur', jarl.id), []);
});

test('Jarl : centre partagé, et réponse payée puis passée', () => {
  const d = partie(); assert.ok(mobaInfliger(d.moba, 'joueur', 'center', 15).conquered);
  const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre', 'center');
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'right');
  d.tour = 'joueur'; d.sorcier.main = ['parade-du-verre']; for (const c of Object.keys(d.sorcier.mana)) d.sorcier.mana[c] = 20;
  assert.ok(rpgMobaChoixActivation(d, 'joueur', jarl.id).some(x => x.championId === jarl.id && x.cibleId === cible.id));
  const r = rpgMobaActiverCapacite(d, 'joueur', jarl.id, { championId: jarl.id, cibleId: cible.id });
  assert.ok(r.ok); assert.equal(r.effetEnAttente, true); assert.equal(jarl.activationUtiliseeMatch, true);
  assert.ok(rpgMobaPasserEffetCreature(d, 'sorcier').ok); assert.ok(rpgMobaPlacementCoherent(d));
});

test('Chercheuse : arme du cimetière et porteur réels, protections et garde du Bâton', () => {
  const d = partie(); const source = poser(d, 'joueur', 'chercheuse-des-armes-ensevelies', 'left');
  const porteur = poser(d, 'joueur', 'chien-du-guet', 'right'); d.tour = 'joueur';
  d.joueur.cimetiere.push('javelot-du-beffroi', 'baton-des-citernes');
  const choix = rpgMobaChoixActivation(d, 'joueur', source.id);
  assert.ok(choix.some(x => x.cibleId === porteur.id && x.armeCarteId === 'javelot-du-beffroi'));
  assert.ok(choix.every(x => x.armeCarteId !== 'baton-des-citernes'));
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: porteur.id, armeCarteId: 'baton-des-citernes' }).ok, false);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: porteur.id, armeCarteId: 'javelot-du-beffroi' }).ok);
  assert.equal(porteur.arme?.carteId, 'javelot-du-beffroi');
  assert.ok(!d.joueur.cimetiere.includes('javelot-du-beffroi')); assert.ok(rpgMobaPlacementCoherent(d));
});

test('IA Conquête choisit une activation favorable sans muter le plateau', () => {
  const d = partie(); const cible = poser(d, 'joueur', 'chien-du-guet', 'left');
  const jarl = poser(d, 'sorcier', 'jarl-au-marteau-de-guerre', 'left'); d.tour = 'sorcier'; d.joueur.main = [];
  jarl.atk = 10; cible.pv = 1; cible.def = 1;
  const avant = JSON.stringify(d); const choix = rpgMobaChoisirActivationIA(d);
  assert.equal(JSON.stringify(d), avant); assert.equal(choix?.sourceId, jarl.id);
  assert.ok(rpgMobaActiverCapacite(d, 'sorcier', choix.sourceId, choix.choix).ok);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Jarl : une magie rapide détruit la source sans supprimer le défi déjà annoncé', () => {
  const d = partie(); const jarl = poser(d, 'joueur', 'jarl-au-marteau-de-guerre', 'left');
  const champion = poser(d, 'joueur', 'chien-du-guet', 'left', 1);
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'left');
  d.tour = 'joueur'; d.sorcier.main = ['trait-de-braise'];
  jarl.pv = 1; jarl.def = 1; champion.atk = 10; cible.pv = 1; cible.def = 1;
  const r = rpgMobaActiverCapacite(d, 'joueur', jarl.id, { championId: champion.id, cibleId: cible.id });
  assert.ok(r.ok); assert.equal(r.effetEnAttente, true);
  const reaction = rpgMobaLancerMagie(d, 'sorcier', 'trait-de-braise', jarl.id);
  assert.ok(reaction.ok, JSON.stringify(reaction));
  assert.ok(!d.joueur.creatures.some(e => e.id === jarl.id));
  assert.ok(rpgMobaPasserEffetCreature(d, 'sorcier').ok);
  assert.ok(!d.sorcier.creatures.some(e => e.id === cible.id));
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('pioche et défausse activées : la main garde son choix obligatoire', () => {
  const d = partie(); const source = poser(d, 'joueur', 'bakunawa', 'left');
  d.tour = 'joueur'; d.joueur.main = []; d.sorcier.main = [];
  const avant = d.joueur.deck.length;
  assert.deepEqual(rpgMobaChoixActivation(d, 'joueur', source.id), [{ cibleId: null }]);
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null }).ok);
  assert.equal(d.joueur.deck.length, avant - 2); assert.equal(d.joueur.main.length, 2);
  assert.equal(d.defausseEnAttente?.cote, 'joueur'); assert.equal(d.defausseEnAttente?.restant, 1);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Rapport du greffier : la pioche est utilisable et consommée une fois', () => {
  const d = partie(); const source = poser(d, 'joueur', 'guetteur-du-beffroi', 'left');
  d.tour = 'joueur'; d.joueur.main = []; const avant = d.joueur.deck.length;
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null }).ok);
  assert.equal(d.joueur.deck.length, avant - 2); assert.equal(d.joueur.main.length, 2);
  assert.deepEqual(rpgMobaChoixActivation(d, 'joueur', source.id), []); assert.ok(rpgMobaPlacementCoherent(d));
});

test('Les feuillets : seules les cartes du dessus du paquet adverse sont défaussées', () => {
  const d = partie(); const source = poser(d, 'joueur', 'scribe-des-feuillets', 'left');
  d.tour = 'joueur'; d.sorcier.deck = ['chien-du-guet', 'jarl-au-marteau-de-guerre', 'guetteur-du-beffroi', 'scribe-des-feuillets'];
  const anciennes = d.sorcier.cimetiere.length;
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null }).ok);
  assert.deepEqual(d.sorcier.deck, ['chien-du-guet']);
  assert.deepEqual(d.sorcier.cimetiere.slice(anciennes), ['jarl-au-marteau-de-guerre', 'guetteur-du-beffroi', 'scribe-des-feuillets']);
});

test('Lettre de marque : prépare la prochaine arrivée et pioche une carte', () => {
  const d = partie(); const source = poser(d, 'joueur', 'le-chasseur-d-ocracoke', 'left');
  d.tour = 'joueur'; d.joueur.main = []; const avant = d.joueur.deck.length;
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null }).ok);
  assert.equal(d.joueur.deck.length, avant - 1); assert.equal(d.joueur.prochaineArriveeAbordage, true);
  assert.ok(rpgMobaPlacementCoherent(d));
});
