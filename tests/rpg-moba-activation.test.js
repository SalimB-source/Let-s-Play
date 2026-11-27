import test from 'node:test';
import assert from 'node:assert/strict';
import { duelCardById } from '../src/games/rpgCards.js';
import { rpgMulligan, rpgDemarrerManaEssai, rpgChoisirCouleurMana, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { mobaInfliger } from '../src/games/rpgMoba.js';
import { retoursAuDeckInvocation } from '../src/games/rpgInvocation.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaChoixActivation, rpgMobaActiverCapacite, rpgMobaLancerMagie, rpgMobaPasserEffetCreature, rpgMobaPlacementCoherent, rpgMobaResoudreRecherche, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
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
  assert.equal(d.joueur.deck.length, avant - 1); assert.equal(d.joueur.main.length, 1);
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

test('Oni : Feux de kitsune offre une cible ou deux dans une même voie, sans Lien', () => {
  const d = partie(); const oni = poser(d, 'joueur', 'oni-de-la-fournaise', 'left');
  const a = poser(d, 'sorcier', 'chien-du-guet', 'left', 0);
  const b = poser(d, 'sorcier', 'chien-du-guet', 'left', 1);
  const autre = poser(d, 'sorcier', 'chien-du-guet', 'right', 0);
  for (const e of [a, b, autre]) { e.pv = 8; e.pvMax = 8; e.def = 8; }
  d.tour = 'joueur'; d.sorcier.main = [];
  const choix = rpgMobaChoixActivation(d, 'joueur', oni.id);
  assert.ok(choix.some(x => x.cibleId === a.id && !x.cibleSecondaireId));
  assert.ok(choix.some(x => x.cibleId === a.id && x.cibleSecondaireId === b.id));
  assert.ok(!choix.some(x => x.cibleId === a.id && x.cibleSecondaireId === autre.id));
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaActiverCapacite(d, 'joueur', oni.id, { cibleId: a.id, cibleSecondaireId: autre.id }).ok, false);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', oni.id, { cibleId: a.id, cibleSecondaireId: b.id }).ok);
  assert.equal(a.pv, 6); assert.equal(b.pv, 6); assert.equal(autre.pv, 8);
  assert.equal(oni.activationUtiliseeMatch, true); assert.ok(rpgMobaPlacementCoherent(d));
});

test('Oni Conquête : les deux cibles survivent à l’annonce et l’IA peut choisir les feux', () => {
  const d = partie(); const oni = poser(d, 'sorcier', 'oni-de-la-fournaise', 'left');
  const a = poser(d, 'joueur', 'chien-du-guet', 'left', 0);
  const b = poser(d, 'joueur', 'chien-du-guet', 'left', 1);
  d.tour = 'sorcier'; d.joueur.main = ['parade-du-verre'];
  for (const color of Object.keys(d.joueur.mana)) d.joueur.mana[color] = 20;
  a.pv = 2; a.def = 2; b.pv = 2; b.def = 2;
  const choix = rpgMobaChoisirActivationIA(d);
  assert.equal(choix?.sourceId, oni.id); assert.ok(choix.choix.cibleSecondaireId);
  const res = rpgMobaActiverCapacite(d, 'sorcier', oni.id, choix.choix);
  assert.ok(res.ok, JSON.stringify(res)); assert.ok(res.effetEnAttente);
  assert.ok(rpgMobaPasserEffetCreature(d, 'joueur').ok);
  assert.ok(!d.joueur.creatures.some(e => e.id === a.id || e.id === b.id));
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Dune combat elle-même une cible dans sa voie, et refuse les autres', () => {
  const d = partie(); const dune = poser(d, 'joueur', 'dune-marchante', 'left');
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'left');
  const loin = poser(d, 'sorcier', 'chien-du-guet', 'right');
  d.tour = 'joueur'; d.sorcier.main = [];
  const choix = rpgMobaChoixActivation(d, 'joueur', dune.id);
  assert.ok(choix.some(c => c.cibleId === cible.id && !c.championId));
  assert.ok(!choix.some(c => c.cibleId === loin.id));
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', dune.id, { cibleId: cible.id }).ok);
  assert.ok(!d.sorcier.creatures.some(c => c.id === cible.id));
  assert.ok(rpgMobaPlacementCoherent(d));
});


test('Braisier : activation dans sa voie et dégâts à la voie adverse', () => {
  const d = partie(); const source = poser(d, 'joueur', 'braisier-du-souk', 'left');
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'left'); cible.pv = 8; cible.pvMax = 8; cible.def = 8;
  const loin = poser(d, 'sorcier', 'chien-du-guet', 'right');
  d.tour = 'joueur'; d.sorcier.main = [];
  const hp = d.moba.lanes.find(v => v.id === 'left').hp.sorcier;
  const [avant, horsVoie] = [cible.pv, loin.pv];
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null }).ok);
  assert.equal(cible.pv, avant - 1); assert.equal(loin.pv, horsVoie);
  assert.equal(d.moba.lanes.find(v => v.id === 'left').hp.sorcier, hp - 1);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Djinn des cendres : réanimation choisie dans une place valide', () => {
  const d = partie(); const source = poser(d, 'joueur', 'djinn-des-cendres-vengeresses', 'left');
  d.tour = 'joueur'; d.joueur.cimetiere = ['djinn-des-braises-voilees', 'chien-du-guet'];
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null }).ok);
  assert.equal(d.mobaRechercheEnAttente?.origine, 'activation');
  assert.equal(rpgMobaResoudreRecherche(d, 'joueur', 'chien-du-guet').ok, false);
  assert.ok(rpgMobaResoudreRecherche(d, 'joueur', 'djinn-des-braises-voilees').ok);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'djinn-des-braises-voilees'));
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Scalde soigne tous les alliés et une voie active au choix', () => {
  const d = partie(); const source = poser(d, 'joueur', 'scalde-des-runes', 'left');
  const ami = poser(d, 'joueur', 'chien-du-guet', 'left', 1);
  const loin = poser(d, 'joueur', 'chien-du-guet', 'right');
  d.tour = 'joueur'; ami.pv = 1; loin.pv = 1;
  const voie = d.moba.lanes.find(v => v.id === 'left'); voie.hp.joueur -= 3;
  const pv = voie.hp.joueur;
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null, voieSoin: 'left' }).ok);
  assert.equal(ami.pv, 2); assert.equal(loin.pv, 2); assert.equal(voie.hp.joueur, pv + 2);
});

test('Lionne : activation cible seulement une créature adverse dans sa voie', () => {
  const d = partie(); const lionne = poser(d, 'joueur', 'lionne-du-midi-ardent', 'left');
  const ami = poser(d, 'joueur', 'chien-du-guet', 'left', 1);
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'left'); cible.pv = 8; cible.pvMax = 8; cible.def = 8;
  const loin = poser(d, 'sorcier', 'chien-du-guet', 'right');
  d.tour = 'joueur'; d.sorcier.main = [];
  const choix = rpgMobaChoixActivation(d, 'joueur', lionne.id);
  assert.ok(choix.some(c => c.cibleId === cible.id));
  assert.ok(!choix.some(c => c.cibleId === ami.id || c.cibleId === loin.id));
  const pv = cible.pv;
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', lionne.id, { cibleId: cible.id }).ok);
  assert.equal(cible.pv, pv - 4);
});

test('IA Conquête : les nouveaux effets ciblés et le Braisier sont évalués', () => {
  const d = partie(); const lionne = poser(d, 'sorcier', 'lionne-du-midi-ardent', 'left');
  const cible = poser(d, 'joueur', 'chien-du-guet', 'left');
  d.tour = 'sorcier'; d.joueur.main = []; cible.pv = 1;
  const choix = rpgMobaChoisirActivationIA(d);
  assert.equal(choix?.sourceId, lionne.id); assert.equal(choix?.choix.cibleId, cible.id);
  assert.ok(rpgMobaActiverCapacite(d, 'sorcier', lionne.id, choix.choix).ok);
  const d2 = partie(); const braisier = poser(d2, 'sorcier', 'braisier-du-souk', 'left'); d2.tour = 'sorcier';
  const choix2 = rpgMobaChoisirActivationIA(d2);
  assert.equal(choix2?.sourceId, braisier.id);
});

test('Veilleuse des citernes : choix des trois cartes en Conquête', () => {
  const d = partie(); const source = poser(d, 'joueur', 'veilleuse-des-citernes', 'left');
  d.tour = 'joueur'; d.joueur.deck = ['chien-du-guet', 'gerboise-des-ruines', 'porteuse-de-cruches', 'pilote-de-la-carreira'];
  assert.ok(rpgMobaActiverCapacite(d, 'joueur', source.id, { cibleId: null }).ok);
  assert.equal(d.mobaRechercheEnAttente?.origine, 'activation');
  assert.ok(rpgMobaResoudreRecherche(d, 'joueur', 'porteuse-de-cruches').ok);
  assert.deepEqual(d.joueur.deck, ['gerboise-des-ruines', 'pilote-de-la-carreira', 'chien-du-guet']);
  assert.ok(d.joueur.creatures.some(e => e.carteId === 'porteuse-de-cruches'));
  assert.ok(rpgMobaPlacementCoherent(d));
});


for (const [jet, gele] of [[.249, true], [.25, false]]) test(`Archère Conquête : seuil de gel ${jet}`, () => {
  const d = partie(); const a = poser(d, 'joueur', 'archere-viking-du-givre', 'left');
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'left');
  d.tour = 'joueur'; d.sorcier.main = []; a.ready = true; cible.pv = 8; cible.pvMax = 8; cible.def = 8;
  const jets = [.9, .9, .9, jet]; rpgReglerHasard(d, () => jets.shift() ?? .9);
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, cible.id).ok);
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
  assert.equal(cible.gelToursRestants > 0, gele);
});

test('Vampire : deux dégâts dans sa voie, choix invalide sans paiement et réponse différée', () => {
  const d = partie(); const vampire = poser(d, 'joueur', 'vampire-des-braises', 'left');
  const cible = poser(d, 'sorcier', 'chien-du-guet', 'left'); cible.pv = 8; cible.pvMax = 8; cible.def = 8;
  const loin = poser(d, 'sorcier', 'chien-du-guet', 'right');
  d.tour = 'joueur'; d.sorcier.main = ['parade-du-verre'];
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaActiverCapacite(d, 'joueur', vampire.id, { cibleId: loin.id }).ok, false);
  assert.equal(JSON.stringify(d), avant);
  const res = rpgMobaActiverCapacite(d, 'joueur', vampire.id, { cibleId: cible.id });
  assert.ok(res.ok && res.effetEnAttente); assert.equal(cible.pv, 8);
  assert.equal(vampire.activationUtiliseeMatch, true);
  assert.ok(rpgMobaPasserEffetCreature(d, 'sorcier').ok); assert.equal(cible.pv, 6);
  assert.ok(rpgMobaPlacementCoherent(d));
});

test('Scalde : choix obligatoire, une autre voie peut être soignée et l’IA la privilégie', () => {
  const d = partie(); const source = poser(d, 'sorcier', 'scalde-des-runes', 'left'); d.tour = 'sorcier';
  const droite = d.moba.lanes.find(l => l.id === 'right'); droite.hp.sorcier -= 3;
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaActiverCapacite(d, 'sorcier', source.id, { cibleId: null, voieSoin: 'invalide' }).ok, false);
  assert.equal(JSON.stringify(d), avant);
  const choix = rpgMobaChoisirActivationIA(d);
  assert.equal(choix?.sourceId, source.id); assert.equal(choix?.choix.voieSoin, 'right');
  assert.ok(rpgMobaActiverCapacite(d, 'sorcier', source.id, choix.choix).ok);
  assert.equal(droite.hp.sorcier, 19);
});
