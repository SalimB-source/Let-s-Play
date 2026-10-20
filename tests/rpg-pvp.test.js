/**
 * Le Sablier en ligne — le protocole PvP, sans réseau ni interface.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *   1. aucune main adverse ne sort du serveur (`rpgPvpVue`) ;
 *   2. une intention refusée laisse l'état EXACTEMENT intact ;
 *   3. seul le camp qui a la main peut agir, y compris pendant le blocage ;
 *   4. la partie se rejoue à l'identique à partir de la même graine ;
 *   5. les codes de défi et les liens profonds se relisent.
 *
 * Lancer : `npm run check:rpg-pvp`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rpgNouveauDuel,
  rpgMulligan,
  rpgDemarrerManaEssai,
} from '../src/games/rpgDuel.js';
import { RPG_MANA_ESSAI_DECKS, RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rngSeme } from '../src/games/rpgHasard.js';
import {
  RPG_PVP_HORLOGES,
  rpgPvpAppliquer,
  rpgPvpAutreCote,
  rpgPvpBrancherHasard,
  rpgPvpCode,
  rpgPvpCodeAleatoire,
  rpgPvpCodeDuLien,
  rpgPvpCodeValide,
  rpgPvpCoteActif,
  rpgPvpLienDefi,
  rpgPvpNommerLog,
  rpgPvpPeutAgir,
  rpgPvpResultat,
  rpgPvpHorloge,
  rpgPvpVue,
} from '../src/games/rpgPvp.js';

const DECK_A = RPG_MANA_ESSAI_DECKS[0].cardIds;
const DECK_B = RPG_MANA_ESSAI_DECKS[1].cardIds;

/** Partie neuve, mulligans faits, premier mana accordé : le tour est au joueur. */
function partieNeuve(graine) {
  const duel = rpgNouveauDuel({
    joueurDeck: DECK_A,
    sorcierDeck: DECK_B,
    modeMana: RPG_MODE_MANA_ESSAI,
    ...(graine === undefined ? {} : { rng: rngSeme(graine) }),
  });
  rpgMulligan(duel, 'joueur', []);
  rpgMulligan(duel, 'sorcier', []);
  rpgDemarrerManaEssai(duel);
  return duel;
}

test('codes de défi : normalisation, tirage et lien profond', () => {
  assert.equal(rpgPvpCode('ab-12 cd 34'), 'AB12CD34');
  assert.equal(rpgPvpCode('AB12CD3'), '');
  assert.equal(rpgPvpCodeValide('deadbeef'), true);
  assert.equal(rpgPvpCodeValide('pas-un-code'), false);

  const code = rpgPvpCodeAleatoire(rngSeme(3));
  assert.equal(code.length, 8);
  assert.match(code, /^[A-F0-9]{8}$/);

  const lien = rpgPvpLienDefi(code, 'https://letsplay.dz/');
  assert.equal(lien, `https://letsplay.dz/jeu/sablier-de-bab-el/defi/${code}`);
  // Lien relatif accepté (application installée, test).
  assert.ok(rpgPvpLienDefi(code).startsWith('/jeu/sablier-de-bab-el/defi/'));
  // Le code se relit depuis l'URL complète, un chemin ou une saisie brute.
  assert.equal(rpgPvpCodeDuLien(lien), code);
  assert.equal(rpgPvpCodeDuLien(`${lien}?utm_source=dm`), code);
  assert.equal(rpgPvpCodeDuLien(`/jeu/sablier-de-bab-el?defi=${code}`), code);
  assert.equal(rpgPvpCodeDuLien(code.toLowerCase()), code);
  assert.equal(rpgPvpCodeDuLien('n’importe quoi'), '');
});

test('la vue ne contient jamais la main ni la pioche adverses', () => {
  const duel = partieNeuve(11);
  const vue = rpgPvpVue(duel, 'joueur');

  assert.deepEqual(vue.sorcier.main, []);
  assert.deepEqual(vue.sorcier.deck, []);
  assert.equal(vue.sorcier.mainCount, duel.sorcier.main.length);
  assert.equal(vue.sorcier.deckCount, duel.sorcier.deck.length);
  // Ma propre main, elle, est intacte.
  assert.deepEqual(vue.joueur.main, duel.joueur.main);
  assert.deepEqual(vue.joueur.deck, duel.joueur.deck);
  // Ni graine du hasard, ni profil d'IA, ni identité de sorcier.
  assert.equal('hasard' in vue, false);
  assert.equal(vue.sorcier.ia ?? null, null);
  assert.equal(JSON.stringify(vue).includes('"hasard"'), false);
});

test('la vue du camp sorcier est retournée : sa main est la sienne', () => {
  const duel = partieNeuve(12);
  const vue = rpgPvpVue(duel, 'sorcier');

  assert.equal(vue.siege, 'sorcier');
  assert.equal(vue.adversaire, 'joueur');
  // Le camp sorcier devient « moi » (joueur de la vue)…
  assert.deepEqual(vue.joueur.main, duel.sorcier.main);
  assert.deepEqual(vue.joueur.deck, duel.sorcier.deck);
  // …et le joueur réel devient l'adversaire caché.
  assert.deepEqual(vue.sorcier.main, []);
  assert.equal(vue.sorcier.mainCount, duel.joueur.main.length);
  // Le tour se lit du même point de vue.
  assert.equal(vue.tour, rpgPvpAutreCote(duel.tour));
  assert.deepEqual(vue.mulliganFait, {
    joueur: duel.mulliganFait.sorcier,
    sorcier: duel.mulliganFait.joueur,
  });
  // L'état de référence n'a pas bougé : la vue est une copie.
  assert.equal(duel.tour, 'joueur');
  assert.deepEqual(duel.joueur.main, rpgPvpVue(duel, 'joueur').joueur.main);
});

test('la vue est une copie profonde : la modifier ne touche pas l’état de référence', () => {
  const duel = partieNeuve(13);
  const vue = rpgPvpVue(duel, 'joueur');
  vue.joueur.pv = 1;
  vue.joueur.main.push('carte-inventee');
  assert.notEqual(duel.joueur.pv, 1);
  assert.equal(duel.joueur.main.includes('carte-inventee'), false);
});

test('qui a la main : tour normal, phase de blocage et fenêtre de réponse', () => {
  const duel = partieNeuve(14);
  assert.equal(rpgPvpCoteActif(duel), 'joueur');

  duel.phase = 'blocage';
  assert.equal(rpgPvpCoteActif(duel), 'sorcier', 'le défenseur choisit ses bloqueurs');

  duel.phase = 'principale';
  duel.fenetreReponse = true;
  assert.equal(rpgPvpCoteActif(duel), 'sorcier', 'le défenseur répond à la magie rapide');

  duel.fenetreReponse = false;
  assert.deepEqual(rpgPvpPeutAgir(duel, 'sorcier', { type: 'fin-de-tour' }), { ok: false, raison: 'pas-votre-tour' });
  assert.equal(rpgPvpPeutAgir(duel, 'joueur', { type: 'fin-de-tour' }).ok, true);
  assert.equal(rpgPvpPeutAgir(duel, 'joueur', { type: 'inventee' }).raison, 'intention-inconnue');
  assert.equal(rpgPvpPeutAgir(null, 'joueur', { type: 'fin-de-tour' }).raison, 'partie-inconnue');
});

test('avant les deux mulligans, on ne peut pas jouer de carte', () => {
  const duel = rpgNouveauDuel({ joueurDeck: DECK_A, sorcierDeck: DECK_B, modeMana: RPG_MODE_MANA_ESSAI });
  assert.equal(rpgPvpPeutAgir(duel, 'joueur', { type: 'fin-de-tour' }).raison, 'mulligan');
  assert.equal(rpgPvpPeutAgir(duel, 'joueur', { type: 'mulligan' }).ok, true);
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'mulligan', index: [] }).ok, true);
});

test('une intention refusée laisse l’état exactement intact', () => {
  const duel = partieNeuve(15);
  const avant = JSON.stringify(duel);

  // Carte qui n'est pas en main.
  const refus = rpgPvpAppliquer(duel, 'joueur', { type: 'jouer-carte', carteId: 'carte-qui-nexiste-pas' });
  assert.deepEqual(refus, { ok: false, raison: 'carte-inconnue', duel });

  const horsTour = rpgPvpAppliquer(duel, 'sorcier', { type: 'fin-de-tour' });
  assert.equal(horsTour.ok, false);
  assert.equal(horsTour.raison, 'pas-votre-tour');

  assert.equal(JSON.stringify(duel), avant, 'aucune mutation partielle ne survit à un refus');
});

test('fin de tour : le tour passe à l’autre camp, et à lui seul', () => {
  const duel = partieNeuve(16);
  const fin = rpgPvpAppliquer(duel, 'joueur', { type: 'fin-de-tour' });
  assert.equal(fin.ok, true);
  assert.equal(duel.tour, 'sorcier');

  const triche = rpgPvpAppliquer(duel, 'joueur', { type: 'fin-de-tour' });
  assert.equal(triche.ok, false);
  assert.equal(triche.raison, 'pas-votre-tour');

  assert.equal(rpgPvpAppliquer(duel, 'sorcier', { type: 'fin-de-tour' }).ok, true);
  assert.equal(duel.tour, 'joueur');
});

test('un joueur peut toujours concéder ; le résultat suit', () => {
  const duel = partieNeuve(17);
  assert.deepEqual(rpgPvpResultat(duel), { gagnant: null, nul: false, raison: null });

  assert.equal(rpgPvpAppliquer(duel, 'sorcier', { type: 'conceder' }).ok, true);
  assert.equal(rpgPvpPeutAgir(duel, 'joueur', { type: 'fin-de-tour' }).raison, 'terminee');
  assert.deepEqual(rpgPvpResultat(duel), { gagnant: 'joueur', nul: false, raison: 'abandon' });

  // Concéder deux fois ne change plus rien (client qui rejoue après reconnexion).
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'conceder' }).ok, true);
  assert.equal(rpgPvpResultat(duel).gagnant, 'joueur');
});

test('le résultat se déduit des points de vie quand personne n’a concédé', () => {
  const duel = partieNeuve(18);
  duel.sorcier.pv = 0;
  assert.deepEqual(rpgPvpResultat(duel), { gagnant: 'joueur', nul: false, raison: 'pv' });
  duel.joueur.pv = 0;
  assert.deepEqual(rpgPvpResultat(duel), { gagnant: null, nul: true, raison: 'double-ko' });
});

test('le hasard semé survit à un aller-retour JSON et reste hors de la vue', () => {
  const a = partieNeuve(21);
  const b = partieNeuve(21);
  assert.equal(JSON.stringify(a.joueur.deck), JSON.stringify(b.joueur.deck), 'même graine, même pioche');

  const duel = rpgNouveauDuel({ joueurDeck: DECK_A, sorcierDeck: DECK_B, modeMana: RPG_MODE_MANA_ESSAI });
  rpgPvpBrancherHasard(duel, 4242);
  assert.equal(duel.hasard.compteur, 0);
  // Un mulligan avec écart consomme du hasard (le mélange des cartes écartées).
  // Il passe par le protocole : c'est le générateur du duel qui sert, pas Math.random.
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'mulligan', index: [0] }).ok, true);
  assert.ok(duel.hasard.compteur > 0);

  const recharge = JSON.parse(JSON.stringify(duel));
  const compteur = recharge.hasard.compteur;
  rpgPvpBrancherHasard(recharge);
  assert.equal(recharge.hasard.compteur, compteur);
  assert.deepEqual(recharge.hasard, duel.hasard);
  assert.equal(JSON.stringify(rpgPvpVue(recharge, 'joueur')).includes('hasard'), false);
});

test('le journal est réécrit avec les noms des deux joueurs', () => {
  const noms = { joueur: 'Salim', sorcier: 'Yasmine' };
  const entrees = ['Vous posez le terrain Oasis.', 'Le sorcier pioche une carte.', 'vous gagnez un mana'];
  assert.deepEqual(rpgPvpNommerLog(entrees, 'joueur', noms), [
    'Salim posez le terrain Oasis.',
    'Yasmine pioche une carte.',
    'Salim gagnez un mana',
  ]);
  // Depuis le camp sorcier, « Vous » désigne Yasmine.
  assert.deepEqual(rpgPvpNommerLog(['Vous jouez une créature.'], 'sorcier', noms), ['Yasmine jouez une créature.']);
  assert.deepEqual(rpgPvpNommerLog(null, 'joueur', noms), []);
});

test('l’horloge d’un tour live expire, celle d’un défi asynchrone rappelle', () => {
  const maintenant = 1_700_000_000_000;
  const live = rpgPvpHorloge('live', maintenant - RPG_PVP_HORLOGES.live - 1, maintenant);
  assert.equal(live.expire, true);
  const liveOk = rpgPvpHorloge('live', maintenant - 1000, maintenant);
  assert.equal(liveOk.expire, false);
  assert.equal(liveOk.restant, RPG_PVP_HORLOGES.live - 1000);

  const rappel = rpgPvpHorloge('async', maintenant - RPG_PVP_HORLOGES.rappelAsync - 1, maintenant);
  assert.equal(rappel.rappel, true);
  assert.equal(rappel.expire, false);
  const abandon = rpgPvpHorloge('async', maintenant - RPG_PVP_HORLOGES.abandonAsync - 1, maintenant);
  assert.equal(abandon.expire, true);

  assert.deepEqual(rpgPvpHorloge('live', 0, maintenant), { echeance: null, restant: null, expire: false, rappel: false });
});
