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
  rpgPvpRng,
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
  const live = rpgPvpHorloge(maintenant - RPG_PVP_HORLOGES.live - 1, maintenant);
  assert.equal(live.expire, true);
  const liveOk = rpgPvpHorloge(maintenant - 1000, maintenant);
  assert.equal(liveOk.expire, false);
  assert.equal(liveOk.restant, RPG_PVP_HORLOGES.live - 1000);

  assert.deepEqual(rpgPvpHorloge(0, maintenant), { echeance: null, restant: null, expire: false, rappel: false });
});

test('le hasard est reprenable à l’identique après un aller-retour de sauvegarde', () => {
  const duel = partieNeuve(31);
  rpgPvpBrancherHasard(duel, 777);
  const rng = rpgPvpRng(duel);
  const troisPremiers = [rng(), rng(), rng()];
  assert.equal(duel.hasard.compteur, 3);

  // Sauvegarde puis rechargement : la suite reprend au 4e tirage, pas au début.
  const recharge = JSON.parse(JSON.stringify(duel));
  rpgPvpBrancherHasard(recharge);
  assert.equal(recharge.hasard.compteur, 3);

  const suiteOriginale = [0, 1, 2].map(() => rpgPvpRng(duel)());
  const suiteRechargee = [0, 1, 2].map(() => rpgPvpRng(recharge)());
  assert.deepEqual(suiteRechargee, suiteOriginale);
  assert.equal(duel.hasard.compteur, recharge.hasard.compteur);
  // Et deux branches tirées du même point donnent la même chose.
  const clone = { ...JSON.parse(JSON.stringify(duel)) };
  rpgPvpBrancherHasard(clone);
  assert.equal(rpgPvpRng(clone)(), rpgPvpRng(duel)());
  assert.equal(troisPremiers.length, 3);
  assert.notDeepEqual(troisPremiers, suiteOriginale, 'la suite avance bien');
});

test('les deux sièges remplacent réellement leurs cartes au mulligan avant le démarrage du mana', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: DECK_A,
    sorcierDeck: DECK_B,
    modeMana: RPG_MODE_MANA_ESSAI,
    pvp: true,
  });
  rpgPvpBrancherHasard(duel, 77);
  assert.equal(duel.manaEssaiDemarre, false);

  const ecarteeHote = duel.joueur.main[1];
  const ecarteeInvite = duel.sorcier.main[1];

  const m1 = rpgPvpAppliquer(duel, 'joueur', { type: 'mulligan', index: [1] });
  assert.equal(m1.ok, true);
  assert.equal(duel.manaEssaiDemarre, false, 'la table attend encore le second mulligan');

  const m2 = rpgPvpAppliquer(duel, 'sorcier', { type: 'mulligan', index: [1] });
  assert.equal(m2.ok, true);
  assert.equal(duel.manaEssaiDemarre, true, 'le mana démarre dès que les deux joueurs sont prêts');
  assert.equal(duel.joueur.main.length, 3);
  assert.equal(duel.sorcier.main.length, 3);
  assert.ok(duel.hasard.compteur > 0, 'le mélange semé a bien été consommé par les deux mulligans');
});

test('combat PvP en deux temps : déclaration publique, blocage adverse et identifiants monotones', async () => {
  const { RPG_DECKS_ARCHETYPES, cardById } = await import('../src/games/rpgCards.js');
  const deckA = RPG_DECKS_ARCHETYPES[0].cardIds;
  const deckB = RPG_DECKS_ARCHETYPES[1].cardIds;
  const duel = rpgNouveauDuel({
    joueurDeck: deckA,
    sorcierDeck: deckB,
    modeMana: RPG_MODE_MANA_ESSAI,
    pvp: true,
  });
  rpgPvpBrancherHasard(duel, 91);
  rpgPvpAppliquer(duel, 'joueur', { type: 'mulligan', index: [] });
  rpgPvpAppliquer(duel, 'sorcier', { type: 'mulligan', index: [] });
  for (const camp of ['joueur', 'sorcier']) {
    if (duel[camp].manaChoixEnAttente) {
      rpgPvpAppliquer(duel, camp, { type: 'choix-mana', couleur: duel[camp].couleurs[0] });
    }
  }

  // Deux créatures robustes sans arrivée destructrice, protection ni vol, pour que le blocage croisé soit légal.
  const estSimple = (c) => c?.kind === 'creature' && !c.arrivee && !c.sacrifice && !c.protection && !c.vol && !c.imbattable && !c.mur;
  const creatureSimple = deckA.find((id) => estSimple(cardById(id)));
  const creatureAdverse = deckB.find((id) => estSimple(cardById(id)) && !cardById(id)?.destruction);
  duel.joueur.main[0] = creatureSimple;
  duel.sorcier.main[0] = creatureAdverse;
  duel.joueur.mana = { braise: 8, eau: 8, sable: 8, neige: 8, tenebres: 8 };
  duel.sorcier.mana = { braise: 8, eau: 8, sable: 8, neige: 8, tenebres: 8 };
  duel.joueur.manaMax = { braise: 8, eau: 8, sable: 8, neige: 8, tenebres: 8 };
  duel.sorcier.manaMax = { braise: 8, eau: 8, sable: 8, neige: 8, tenebres: 8 };

  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'jouer-carte', carteId: creatureSimple, cibleDifferee: true }).ok, true);
  if (duel.arriveeEnAttente) rpgPvpAppliquer(duel, 'joueur', { type: 'renoncer-arrivee' });
  const idPremiere = duel.joueur.creatures[0].id;
  assert.ok(duel.prochainUid >= 1);

  // Aller-retour JSON (comme entre deux invocations serverless) : l'ID suivant ne collisionne jamais.
  const recharge = JSON.parse(JSON.stringify(duel));
  rpgPvpAppliquer(recharge, 'joueur', { type: 'fin-de-tour' });
  if (recharge.sorcier.manaChoixEnAttente) {
    rpgPvpAppliquer(recharge, 'sorcier', { type: 'choix-mana', couleur: recharge.sorcier.couleurs[0] });
  }
  recharge.sorcier.mana = { braise: 8, eau: 8, sable: 8, neige: 8, tenebres: 8 };
  const poseSorcier = rpgPvpAppliquer(recharge, 'sorcier', { type: 'jouer-carte', carteId: creatureAdverse, cibleDifferee: true });
  assert.equal(poseSorcier.ok, true);
  if (recharge.arriveeEnAttente) rpgPvpAppliquer(recharge, 'sorcier', { type: 'renoncer-arrivee' });
  assert.equal(recharge.sorcier.creatures.length, 1);
  assert.notEqual(recharge.sorcier.creatures[0].id, idPremiere);

  // Retour au tour du joueur : sa créature est prête et l'adversaire a un bloqueur légal.
  rpgPvpAppliquer(recharge, 'sorcier', { type: 'fin-de-tour' });
  if (recharge.joueur.manaChoixEnAttente) {
    rpgPvpAppliquer(recharge, 'joueur', { type: 'choix-mana', couleur: recharge.joueur.couleurs[0] });
  }

  const decl = rpgPvpAppliquer(recharge, 'joueur', {
    type: 'attaquer',
    declarer: true,
    attaquants: [idPremiere],
    ciblesAttaque: {},
  });
  assert.equal(decl.ok, true);
  assert.equal(recharge.phase, 'blocage', 'le combat attend le choix de blocage du défenseur humain');
  assert.equal(rpgPvpCoteActif(recharge), 'sorcier', 'le défenseur humain a la main pour bloquer');

  const vueDefenseur = rpgPvpVue(recharge, 'sorcier');
  assert.equal(vueDefenseur.combatDeclare.cote, 'sorcier', 'l’attaque entrante est retournée côté défenseur');

  const resol = rpgPvpAppliquer(recharge, 'sorcier', {
    type: 'bloquer',
    blocages: { [idPremiere]: [recharge.sorcier.creatures[0].id] },
    repartitions: null,
  });
  assert.equal(resol.ok, true);
  assert.equal(recharge.phase, 'principale2');
  assert.equal(rpgPvpCoteActif(recharge), 'joueur');
});

test('pose PvP : la case choisie voyage dans l’intention, une case occupée est refusée intacte', async () => {
  const { cardById } = await import('../src/games/rpgCards.js');
  const duel = partieNeuve(7);
  if (duel.joueur.manaChoixEnAttente) {
    rpgPvpAppliquer(duel, 'joueur', { type: 'choix-mana', couleur: duel.joueur.couleurs[0] });
  }
  const creature = DECK_A.find((id) => cardById(id)?.kind === 'creature' && !cardById(id)?.arrivee);
  assert.ok(creature, 'le deck de départ contient une créature sans arrivée');
  duel.joueur.main[0] = creature;
  duel.joueur.main[1] = creature;
  duel.joueur.mana = { braise: 8, eau: 8, sable: 8, neige: 8, tenebres: 8 };

  const pose = rpgPvpAppliquer(duel, 'joueur', {
    type: 'jouer-carte', carteId: creature, cibleDifferee: true, emplacement: 4,
  });
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.creatures[0].emplacement, 4, 'la créature entre en jeu sur la case 5 désignée');

  // La même case, une seconde fois : refus du moteur, état intact.
  const avant = JSON.stringify(duel);
  const refus = rpgPvpAppliquer(duel, 'joueur', {
    type: 'jouer-carte', carteId: creature, cibleDifferee: true, emplacement: 4,
  });
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'emplacement');
  assert.equal(JSON.stringify(duel), avant, 'une intention refusée ne change rien');
});


test('PvP : une attaque ciblée ne peut viser le sorcier si une créature adverse est présente', () => {
  const duel = partieNeuve(123);
  duel.phase = 'principale';
  duel.tour = 'joueur';
  duel.joueur.creatures.push({ id: 'rapide-test', carteId: 'feriel', name: 'Fériel', coupRapide: true, ready: true, attaquee: false, atk: 3, pv: 2 });
  duel.sorcier.creatures.push({ id: 'cible-test', carteId: 'chien-du-guet', name: 'Chien', ready: false, atk: 2, pv: 2 });
  const refus = rpgPvpAppliquer(duel, 'joueur', { type: 'attaquer', declarer: true, attaquants: ['rapide-test'], ciblesAttaque: {} });
  assert.equal(refus.raison, 'cible-obligatoire');
  assert.ok(!duel.combatDeclare);
  const declaration = rpgPvpAppliquer(duel, 'joueur', { type: 'attaquer', declarer: true, attaquants: ['rapide-test'], ciblesAttaque: { 'rapide-test': 'cible-test' } });
  assert.equal(declaration.ok, true);
});
