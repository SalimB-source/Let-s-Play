/**
 * Le profil du joueur (`rpgProfil.js`) et ce que les gestes du duel lui versent
 * (`rpgEvenementsDuel.js`, `rpgBoosters.js`). Aucune règle n'est montée en
 * composant : la courbe, la dette de paquets et le tirage offert sont purs, et
 * c'est ici qu'ils sont tenus.
 *
 * Les trois promesses vérifiées, dans l'ordre :
 *
 *   1. **la barre monte vite au début et devient gourmande** — chaque seuil est
 *      strictement plus cher que le précédent, le niveau 2 tombe en un duel, et
 *      le rapport entre les premiers et les derniers paliers se mesure ;
 *   2. **chaque niveau gagné doit un paquet** — la dette se calcule, elle ne
 *      s'écrit pas, donc deux appareils ne se paient pas deux fois ;
 *   3. **le paquet offert est un vrai paquet** — aucun crédit débité, la pitié
 *      avance, les doublons remboursent, le journal le dit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAREME_XP,
  COURBE,
  EMBLEMES,
  MOTIFS,
  RPG_PROFIL_STORAGE_KEY,
  RANGS,
  XP,
  boostersDus,
  chargerProfil,
  choisirEmbleme,
  fusionnerProfils,
  gagnerXp,
  glypheEmbleme,
  marquerBoosterOffert,
  motifLisible,
  niveauDeXp,
  normaliserProfil,
  normaliserPseudo,
  paliersAVenir,
  profilVide,
  progressionDeXp,
  progressionDuProfil,
  pseudoLisible,
  rangDeNiveau,
  renommerProfil,
  sauverProfil,
  seuilDuNiveau,
  xpLisible,
  xpTotalDuNiveau,
} from '../src/games/rpgProfil.js';
import {
  EVENEMENTS_XP,
  appliquerEvenementDuel,
  motifDeLEvenement,
  statsDeLEvenement,
  xpDeLEvenement,
} from '../src/games/rpgEvenementsDuel.js';
import { ouvrirBooster, ouvrirBoosterOffert, rayonsOuverts } from '../src/games/rpgBoosters.js';
import { GAINS, portefeuilleVide } from '../src/games/rpgCredits.js';
import { etatQuetesVide } from '../src/games/rpgQuetes.js';
import { rngSeme, tirerParmi } from '../src/games/rpgHasard.js';

// ── Outillage ────────────────────────────────────────────────────────────────

function avecStockage(stockage, test) {
  const precedent = globalThis.window;
  globalThis.window = { localStorage: stockage };
  try {
    test();
  } finally {
    if (precedent === undefined) delete globalThis.window;
    else globalThis.window = precedent;
  }
}

function stockageEnMemoire(donnees = new Map()) {
  return {
    donnees,
    stockage: {
      getItem: (cle) => donnees.get(cle) ?? null,
      setItem: (cle, valeur) => donnees.set(cle, valeur),
      removeItem: (cle) => donnees.delete(cle),
    },
  };
}

const LE = '2026-10-23T18:00:00.000Z';
const profil = (reste = {}) => ({ ...profilVide(), ...reste });
const tousSeuils = () => Array.from({ length: COURBE.niveauMax - 1 }, (_, i) => seuilDuNiveau(i + 1));

// ── La courbe ────────────────────────────────────────────────────────────────

test('la courbe suit la puissance écrite, du niveau 1 au niveau 60', () => {
  assert.equal(COURBE.niveauDepart, 1);
  assert.equal(COURBE.niveauMax, 60, 'le plafond du dossier 04');
  assert.equal(seuilDuNiveau(1), Math.round(COURBE.base * Math.pow(1, COURBE.exposant)));
  assert.equal(seuilDuNiveau(2), Math.round(COURBE.base * Math.pow(2, COURBE.exposant)));
  assert.equal(seuilDuNiveau(10), Math.round(COURBE.base * Math.pow(10, COURBE.exposant)));
  assert.equal(xpTotalDuNiveau(1), 0, 'on naît au niveau 1, sans rien à payer');
  assert.equal(xpTotalDuNiveau(2), seuilDuNiveau(1));
  assert.equal(xpTotalDuNiveau(3), seuilDuNiveau(1) + seuilDuNiveau(2));
  assert.equal(seuilDuNiveau(COURBE.niveauMax), 0, 'au plafond, plus aucun palier ne demande rien');
  assert.equal(seuilDuNiveau(0), seuilDuNiveau(1), 'un niveau hors catalogue retombe sur ses pieds');
  assert.equal(seuilDuNiveau(999), 0);
  assert.equal(seuilDuNiveau('deux'), seuilDuNiveau(1));
});

test('chaque palier coûte strictement plus cher que le précédent', () => {
  const seuils = tousSeuils();
  for (let index = 1; index < seuils.length; index += 1) {
    assert.ok(
      seuils[index] > seuils[index - 1],
      `le palier ${index + 1} → ${index + 2} (${seuils[index]}) doit coûter plus que ${index} → ${index + 1} (${seuils[index - 1]})`,
    );
  }
});

test('les premiers niveaux tombent vite, les derniers se méritent', () => {
  // Le premier palier tient dans un seul duel libre gagné : 20 XP de victoire,
  // et les cartes posées font le reste. C'est la promesse « vite au début ».
  assert.ok(seuilDuNiveau(1) <= XP.duelLibre + XP.carteJouee * 4,
    'le niveau 2 tombe dans le premier duel libre');
  assert.ok(seuilDuNiveau(2) <= XP.etagePremiere + XP.carteJouee * 10,
    'le niveau 3 tombe dans le premier étage déblayé');
  // Et la marche s'élargit : le trentième palier coûte plus de quarante fois le
  // premier, le cinquantième plus de cinq cents fois.
  assert.ok(seuilDuNiveau(30) > seuilDuNiveau(1) * 40, 'le palier 30 est bien plus gourmand que le premier');
  assert.ok(seuilDuNiveau(50) > seuilDuNiveau(1) * 200, 'et le palier 50 plus encore');
  assert.ok(
    xpTotalDuNiveau(COURBE.niveauMax) > xpTotalDuNiveau(30) * 3,
    'la moitié haute de la courbe pèse plus que les trente premiers niveaux réunis',
  );
});

test('le niveau se déduit de l’XP, borne par borne', () => {
  assert.equal(niveauDeXp(0), 1);
  assert.equal(niveauDeXp(seuilDuNiveau(1) - 1), 1, 'un XP de moins : pas de palier');
  assert.equal(niveauDeXp(seuilDuNiveau(1)), 2, 'le seuil atteint suffit');
  assert.equal(niveauDeXp(xpTotalDuNiveau(5)), 5);
  assert.equal(niveauDeXp(xpTotalDuNiveau(5) + seuilDuNiveau(5)), 6);
  assert.equal(niveauDeXp(xpTotalDuNiveau(COURBE.niveauMax)), COURBE.niveauMax);
  assert.equal(niveauDeXp(xpTotalDuNiveau(COURBE.niveauMax) + 10 ** 6), COURBE.niveauMax, 'rien au-delà du plafond');
  assert.equal(niveauDeXp(-40), 1, 'un XP négatif ne descend pas sous le niveau 1');
  assert.equal(niveauDeXp('beaucoup'), 1);
  assert.equal(niveauDeXp(null), 1);
});

test('la barre rend ce que l’écran affiche, sans arithmétique à refaire', () => {
  const debut = progressionDeXp(0);
  assert.deepEqual(
    { niveau: debut.niveau, into: debut.into, need: debut.need, reste: debut.reste, percent: debut.percent, suivant: debut.suivant, maximal: debut.maximal },
    { niveau: 1, into: 0, need: seuilDuNiveau(1), reste: seuilDuNiveau(1), percent: 0, suivant: 2, maximal: false },
  );

  const moitié = progressionDeXp(xpTotalDuNiveau(4) + Math.round(seuilDuNiveau(4) / 2));
  assert.equal(moitié.niveau, 4);
  assert.equal(moitié.into, Math.round(seuilDuNiveau(4) / 2));
  assert.equal(moitié.reste, seuilDuNiveau(4) - moitié.into);
  assert.equal(moitié.percent, 50, 'la moitié du palier vaut 50 %');
  assert.equal(moitié.into + moitié.reste, moitié.need);

  const plafond = progressionDeXp(xpTotalDuNiveau(COURBE.niveauMax) + 500);
  assert.equal(plafond.maximal, true);
  assert.equal(plafond.suivant, null);
  assert.equal(plafond.percent, 100);
  assert.equal(plafond.need, 0, 'plus rien à demander');
  assert.equal(plafond.xp, xpTotalDuNiveau(COURBE.niveauMax) + 500, 'l’XP continue de compter au plafond');

  assert.equal(progressionDuProfil({ xp: seuilDuNiveau(1) }).niveau, 2);
  assert.equal(progressionDuProfil(null).niveau, 1, 'un profil absent se lit niveau 1');
});

test('la courbe à venir se lit : chaque palier annoncé est plus cher', () => {
  const aVenir = paliersAVenir(profil({ xp: 0 }), { nombre: 4 });
  assert.equal(aVenir.length, 4);
  assert.equal(aVenir[0].niveau, 1, 'on commence par le palier en cours');
  assert.equal(aVenir[0].seuil, seuilDuNiveau(1));
  assert.equal(aVenir[1].seuil, seuilDuNiveau(2));
  assert.ok(aVenir[3].seuil > aVenir[0].seuil, 'le quatrième palier annoncé coûte plus que le premier');
  assert.equal(aVenir[0].total, xpTotalDuNiveau(2), 'et il dit le palier total à atteindre');
  assert.equal(paliersAVenir(profil({ xp: xpTotalDuNiveau(COURBE.niveauMax) }), { nombre: 4 }).length, 0,
    'au plafond, plus rien à venir');
  assert.equal(paliersAVenir(profil(), { nombre: 0 }).length, 0);
  assert.ok(paliersAVenir(profil(), { nombre: 99 }).length <= 12, 'la liste reste lisible');
});

// ── Les rangs ────────────────────────────────────────────────────────────────

test('les rangs couvrent toute la courbe, dans l’ordre', () => {
  assert.equal(RANGS[0].niveau, COURBE.niveauDepart, 'le premier rang est le niveau de départ');
  assert.equal(RANGS[RANGS.length - 1].niveau, COURBE.niveauMax, 'le dernier est le plafond');
  for (let index = 1; index < RANGS.length; index += 1) {
    assert.ok(RANGS[index].niveau > RANGS[index - 1].niveau, 'les rangs montent');
    assert.ok(RANGS[index].nom && RANGS[index].phrase, 'un rang a un nom et une phrase');
  }
  assert.equal(rangDeNiveau(1).rang.id, RANGS[0].id);
  assert.equal(rangDeNiveau(2).rang.id, RANGS[0].id, 'rien entre deux rangs : on garde le dernier atteint');
  assert.equal(rangDeNiveau(RANGS[1].niveau).rang.id, RANGS[1].id);
  assert.equal(rangDeNiveau(RANGS[1].niveau).prochain.id, RANGS[2].id);
  assert.equal(rangDeNiveau(COURBE.niveauMax).prochain, null, 'le dernier rang n’en promet pas d’autre');
  assert.equal(rangDeNiveau('six').rang.id, RANGS[0].id);
});

// ── La dette de paquets ──────────────────────────────────────────────────────

test('un niveau gagné doit exactement un paquet, et la dette se calcule', () => {
  const avant = profil({ xp: 0 });
  assert.equal(boostersDus(avant), 0, 'au niveau 1, rien n’est dû');

  const monte = gagnerXp(avant, seuilDuNiveau(1), { motif: 'duel-libre', horloge: LE });
  assert.equal(monte.niveauxGagnes, 1);
  assert.equal(monte.niveau, 2);
  assert.equal(monte.niveauAvant, 1);
  assert.equal(boostersDus(monte.profil), 1, 'un palier = un paquet dû');

  const regle = marquerBoosterOffert(monte.profil, { horloge: LE });
  assert.equal(boostersDus(regle), 0, 'le paquet ouvert solde la dette');
  assert.equal(regle.boostersOfferts, 1);
  assert.equal(marquerBoosterOffert(regle, { horloge: LE }), regle, 'rien à offrir : le profil est rendu tel quel');
});

test('deux paliers d’un coup doivent deux paquets, et la dette survit à la fusion', () => {
  const triple = gagnerXp(profil(), xpTotalDuNiveau(4), { motif: 'etage', horloge: LE });
  assert.equal(triple.niveau, 4);
  assert.equal(triple.niveauxGagnes, 3, 'les niveaux 2, 3 et 4 tombent ensemble');
  assert.equal(boostersDus(triple.profil), 3, 'un paquet par niveau franchi');
  assert.equal(triple.profil.paliers.length, 3, 'et une ligne de journal par palier');
  assert.deepEqual(triple.profil.paliers.map((palier) => palier.niveau), [4, 3, 2], 'le plus haut d’abord');

  // Un appareil ouvre un paquet, l'autre pas encore : la fusion prend le maximum
  // des compteurs, donc la dette ressort identique des deux côtés — jamais deux
  // paquets pour le même palier.
  const regle = marquerBoosterOffert(triple.profil, { horloge: LE });
  const fusion = fusionnerProfils(triple.profil, regle);
  assert.equal(fusion.profil.boostersOfferts, 1);
  assert.equal(boostersDus(fusion.profil), 2, 'deux paquets restent dus, pas trois');
  assert.equal(boostersDus(fusionnerProfils(regle, triple.profil).profil), 2, 'dans les deux sens');
});

test('au plafond, l’XP continue de compter mais plus aucun palier ne sonne', () => {
  const auTaquet = profil({ xp: xpTotalDuNiveau(COURBE.niveauMax), boostersOfferts: COURBE.niveauMax - 1 });
  assert.equal(boostersDus(auTaquet), 0);
  const suite = gagnerXp(auTaquet, 5000, { motif: 'tour', horloge: LE });
  assert.equal(suite.niveau, COURBE.niveauMax);
  assert.equal(suite.niveauxGagnes, 0, 'plus de palier au-delà');
  assert.equal(suite.xpGagne, 5000, 'mais l’XP s’additionne toujours');
  assert.equal(boostersDus(suite.profil), 0, 'et rien n’est dû');
});

test('un compteur d’offerts en avance ne rend jamais de paquet au joueur', () => {
  const avance = profil({ xp: seuilDuNiveau(1), boostersOfferts: 9 });
  assert.equal(boostersDus(avance), 0, 'la dette ne descend pas sous zéro');
  assert.equal(marquerBoosterOffert(avance), avance);
});

// ── Ce que versent les gestes ────────────────────────────────────────────────

test('gagner de l’XP écrit le profil, et ne rien verser le rend tel quel', () => {
  const avant = profil({ xp: 10 });
  assert.equal(gagnerXp(avant, 0).profil, avant, 'zéro XP : la même référence, aucun re-rendu');
  assert.equal(gagnerXp(avant, -30).profil, avant, 'un XP négatif n’existe pas');
  assert.equal(gagnerXp(avant, 'beaucoup').profil, avant);
  assert.equal(gagnerXp(avant, null).profil, avant);

  const suite = gagnerXp(avant, 5, { motif: 'carte', horloge: LE });
  assert.notEqual(suite.profil, avant);
  assert.equal(suite.profil.xp, 15);
  assert.equal(suite.niveau, 1);
  assert.equal(suite.profil.majLe, LE);
  assert.deepEqual(suite.profil.paliers, [], 'aucun palier franchi : le journal ne bouge pas');

  const compteurs = gagnerXp(avant, 0, { stats: { cartesJouees: 1 }, horloge: LE });
  assert.equal(compteurs.profil.stats.cartesJouees, 1, 'un compteur seul s’écrit aussi');
  assert.equal(compteurs.xpGagne, 0);
  assert.equal(gagnerXp(avant, 0, { stats: { cartesJouees: 0 } }).profil, avant, 'un compteur à zéro non plus ne bouge pas');
});

test('le barème est écrit noir sur blanc, et l’écran l’affiche', () => {
  assert.equal(XP.carteJouee, 2);
  assert.equal(XP.duelLibre, 20);
  assert.equal(XP.etagePremiere, 70);
  assert.equal(XP.etageRejoue, 22);
  assert.equal(XP.tourTerminee, 150);
  assert.ok(XP.etagePremiere > XP.etageRejoue * 2, 'le premier déblayage paie le récit, pas le farm');
  assert.deepEqual(BAREME_XP.map((ligne) => ligne.xp), BAREME_XP.map((ligne) => XP[ligne.cle]),
    'chaque ligne du barème affiche le chiffre du module');
  for (const ligne of BAREME_XP) {
    assert.ok(ligne.xp > 0, `${ligne.label} vaut quelque chose`);
    assert.ok(MOTIFS.includes(ligne.motif), `${ligne.label} a un motif connu`);
  }
  assert.equal(BAREME_XP.length, 10, 'dix gestes payés, pas un de plus');
});

test('les motifs du journal se lisent en français', () => {
  for (const motif of MOTIFS) {
    assert.ok(motifLisible(motif).length > 3, `${motif} a un libellé`);
    assert.notEqual(motifLisible(motif), motif, 'le libellé n’est pas l’identifiant recraché');
    assert.ok(!/^['"a-z-]+$/.test(motifLisible(motif)), 'le libellé est une phrase, pas un code');
  }
  assert.equal(motifLisible('inconnu'), motifLisible('autre'));
  const journal = gagnerXp(profil(), xpTotalDuNiveau(3), { motif: 'tour', horloge: LE }).profil.paliers;
  assert.ok(journal.every((palier) => palier.motif === 'tour'));
});

// ── Les événements du duel ───────────────────────────────────────────────────

test('trois gestes font monter la barre, et un seul est continu', () => {
  assert.deepEqual([...EVENEMENTS_XP].sort(), ['booster-ouvert', 'carte-jouee', 'duel-gagne']);
  assert.equal(xpDeLEvenement({ type: 'carte-jouee', cardId: 'tarek' }), XP.carteJouee);
  assert.equal(xpDeLEvenement({ type: 'duel-gagne', mode: 'libre' }), XP.duelLibre);
  assert.equal(xpDeLEvenement({ type: 'duel-gagne', mode: 'histoire', premiere: true }), XP.etagePremiere);
  assert.equal(xpDeLEvenement({ type: 'duel-gagne', mode: 'histoire', premiere: false }), XP.etageRejoue);
  assert.equal(xpDeLEvenement({ type: 'duel-gagne', mode: 'tours', premiere: true }), XP.etagePremiere);
  assert.equal(xpDeLEvenement({ type: 'booster-ouvert', rayonId: 'souk' }), XP.boosterOuvert);
  // Une carte posée raconte déjà `carte-jouee` : les gestes précis ne comptent
  // pas deux fois, exactement comme les crédits ne paient qu'une fois.
  assert.equal(xpDeLEvenement({ type: 'creature-invoquee', cardId: 'tarek' }), 0);
  assert.equal(xpDeLEvenement({ type: 'magie-lancee', cardId: 'tarek' }), 0);
  assert.equal(xpDeLEvenement({ type: 'arme-jouee', cardId: 'tarek' }), 0);
  assert.equal(xpDeLEvenement({ type: 'etage-deblaye', etageId: 'listes-1' }), 0);
  assert.equal(xpDeLEvenement({ type: 'degats-infliges', montant: 12 }), 0);
  assert.equal(xpDeLEvenement({ type: 'defaite' }), 0);
  assert.equal(xpDeLEvenement(null), 0);
});

test('chaque geste dit pourquoi la barre a bougé, et ce qu’il compte', () => {
  assert.equal(motifDeLEvenement({ type: 'carte-jouee', cardId: 'tarek' }), 'carte');
  assert.equal(motifDeLEvenement({ type: 'duel-gagne', mode: 'libre' }), 'duel-libre');
  assert.equal(motifDeLEvenement({ type: 'duel-gagne', mode: 'histoire', premiere: true }), 'etage');
  assert.equal(motifDeLEvenement({ type: 'duel-gagne', mode: 'histoire', tourComplete: true, tourId: 'tour-des-listes' }), 'tour');
  assert.equal(motifDeLEvenement({ type: 'booster-ouvert', rayonId: 'souk' }), 'booster');
  assert.equal(motifDeLEvenement({ type: 'degats-infliges', montant: 3 }), 'autre');

  assert.deepEqual(statsDeLEvenement({ type: 'carte-jouee', cardId: 'tarek' }), { cartesJouees: 1 });
  assert.deepEqual(statsDeLEvenement({ type: 'duel-gagne', mode: 'histoire', premiere: true }), { duelsGagnes: 1, etagesPremiers: 1 });
  assert.deepEqual(statsDeLEvenement({ type: 'duel-gagne', mode: 'histoire', premiere: false }), { duelsGagnes: 1, etagesRejoues: 1 });
  assert.deepEqual(statsDeLEvenement({ type: 'duel-gagne', mode: 'libre' }), { duelsGagnes: 1 });
  assert.equal(statsDeLEvenement({ type: 'booster-ouvert', rayonId: 'souk' }), null,
    'les ouvertures se comptent dans le portefeuille, pas deux fois');
  assert.equal(statsDeLEvenement(null), null);
});

test('appliquer un événement fait monter le profil avec le reste de l’économie', () => {
  const quetes = etatQuetesVide();
  const suite = appliquerEvenementDuel(
    { bourse: portefeuilleVide(), quetes, profil: profilVide() },
    { type: 'duel-gagne', mode: 'histoire', etageId: 'listes-1', tourId: 'tour-des-listes', premiere: true },
  );
  assert.equal(suite.reconnu, true);
  assert.equal(suite.gain, GAINS.etagePremiere);
  assert.equal(suite.xp, XP.etagePremiere, 'l’XP suit les crédits');
  assert.equal(suite.profil.xp, XP.etagePremiere);
  assert.equal(suite.profil.stats.duelsGagnes, 1);
  assert.equal(suite.profil.stats.etagesPremiers, 1);
  assert.equal(suite.niveauDeXpAttendu ?? suite.profil.xp, XP.etagePremiere);
  assert.equal(niveauDeXp(suite.profil.xp), 2, '70 XP : le niveau 2 tombe, le 3 demande 106');
  assert.equal(suite.niveaux, 1, 'un palier franchi');
  assert.equal(boostersDus(suite.profil), 1, 'et un paquet est dû');

  // Un geste sans XP ni compteur rend le profil d'origine : la comparaison de
  // références tient de bout en bout.
  const neutre = appliquerEvenementDuel({ bourse: portefeuilleVide(), quetes, profil: profilVide() }, { type: 'degats-infliges', montant: 4 });
  assert.equal(neutre.xp, 0);
  assert.equal(neutre.niveaux, 0);
  const inconnu = appliquerEvenementDuel({ bourse: null, quetes, profil: null }, { type: 'geste-inconnu' });
  assert.equal(inconnu.reconnu, false);
  assert.equal(inconnu.profil, null);
  assert.equal(inconnu.xp, 0);
});

test('l’XP de la tour ne suit que si le butin a vraiment été versé', () => {
  const tourComplete = { type: 'duel-gagne', mode: 'histoire', etageId: 'listes-5', tourId: 'tour-des-listes', premiere: true, tourComplete: true };
  const premiere = appliquerEvenementDuel({ bourse: portefeuilleVide(), quetes: etatQuetesVide(), profil: profilVide() }, tourComplete);
  assert.equal(premiere.butin, GAINS.tourTerminee);
  assert.equal(premiere.xp, XP.etagePremiere + XP.tourTerminee, 'le butin paie, la tour monte la barre');
  assert.equal(premiere.profil.stats.toursTerminees, 1);

  // La même victoire, sur une tour déjà payée : le portefeuille refuse le butin
  // (garde `toursPayees`), et la barre suit le même refus.
  const dejaPayee = appliquerEvenementDuel(
    { bourse: premiere.bourse, quetes: etatQuetesVide(), profil: premiere.profil },
    { ...tourComplete, premiere: false },
  );
  assert.equal(dejaPayee.butin, 0);
  assert.equal(dejaPayee.xp, XP.etageRejoue, 'rien de plus que l’étage rejoué');
});

// ── Le paquet offert ─────────────────────────────────────────────────────────

test('un paquet offert est un vrai paquet, sans caisse', () => {
  const rng = rngSeme('palier');
  const bourse = { ...portefeuilleVide(), credits: 0 };
  const offert = ouvrirBoosterOffert({ portefeuille: bourse, rayonId: 'souk', progression: null, collection: [], rng });
  assert.equal(offert.ok, true, 'un joueur à zéro crédit reçoit son palier');
  assert.equal(offert.prix, 0);
  assert.equal(offert.portefeuille.credits >= 0, true, 'aucun débit, jamais de solde négatif');
  assert.equal(offert.tirage.cartes.length, 5, 'cinq cartes, comme au comptoir');
  assert.equal(offert.portefeuille.ouvertures, 1, 'l’ouverture est comptée');
  assert.equal(offert.portefeuille.journal[0].offert, true, 'et le journal dit qu’elle est offerte');

  // La même ouverture, achetée cette fois : le solde descend, le journal ne
  // marque rien d’offert. Les deux chemins tirent pareil.
  const paye = ouvrirBooster({ portefeuille: { ...portefeuilleVide(), credits: 500 }, rayonId: 'souk', rng: rngSeme('palier') });
  assert.equal(paye.ok, true);
  assert.equal(paye.prix, 140);
  assert.equal(paye.portefeuille.credits, 500 - 140 + paye.tirage.remboursement);
  assert.equal(paye.portefeuille.journal[0].offert, false);
  assert.deepEqual(offert.tirage.cartes, paye.tirage.cartes, 'à graine égale, l’offert tire le même paquet que l’acheté');

  assert.equal(ouvrirBoosterOffert({ portefeuille: bourse, rayonId: 'rayon-fantome' }).ok, false);
  assert.equal(ouvrirBoosterOffert({ portefeuille: bourse, rayonId: 'rayon-fantome' }).prix, 0);
});

test('un paquet offert fait avancer la pitié et rembourse ses doublons', () => {
  const rng = rngSeme('pitie');
  let bourse = portefeuilleVide();
  for (let index = 0; index < 6; index += 1) {
    const offert = ouvrirBoosterOffert({ portefeuille: bourse, rayonId: 'souk', rng, collection: bourse.cartes });
    assert.equal(offert.ok, true);
    bourse = offert.portefeuille;
  }
  assert.equal(bourse.ouvertures, 6, 'six paquets offerts comptent comme six paquets');
  assert.ok(bourse.pitie > 0 || bourse.journal.some((entree) => entree.mythique),
    'la pitié avance, ou une mythique est sortie');
  assert.ok(bourse.cartes.length > 0, 'les cartes sont rangées');
});

test('le rayon offert est tiré au hasard parmi les paquets ouverts', () => {
  const ouverts = rayonsOuverts(null, []);
  assert.ok(ouverts.length >= 2, 'au moins deux paquets au comptoir');
  // Le même geste que le hook : un seul flux de hasard, `tirerParmi` à chaque
  // paquet. Deux tirages successifs ne tombent pas sur le même rayon à tous les
  // coups — c'est ce que « au hasard » veut dire ici.
  const choix = rngSeme('paliers');
  const vus = new Set();
  for (let index = 0; index < 40; index += 1) {
    const rayon = tirerParmi(ouverts, choix);
    const offert = ouvrirBoosterOffert({
      portefeuille: portefeuilleVide(),
      rayonId: rayon.rayon.id,
      rng: rngSeme(`tirage-${index}`),
    });
    assert.equal(offert.ok, true);
    assert.equal(offert.portefeuille.journal[0].rayonId, rayon.rayon.id);
    vus.add(rayon.rayon.id);
  }
  assert.equal(vus.size, ouverts.length, 'tous les paquets du comptoir peuvent être offerts');
});

// ── L'identité ───────────────────────────────────────────────────────────────

test('le pseudo se tient court, propre, et ne s’efface jamais', () => {
  assert.equal(normaliserPseudo('  Salem   l’arpenteur  '), 'Salem l’arpenteur');
  assert.equal(normaliserPseudo('a\nb\tc'), 'a b c', 'les sauts de ligne n’ont rien à faire sur un onglet');
  assert.equal(normaliserPseudo('   '), null);
  assert.equal(normaliserPseudo(null), null);
  assert.equal(normaliserPseudo(42), null);
  assert.equal(normaliserPseudo('x'.repeat(COURBE.pseudoMax + 30)).length, COURBE.pseudoMax, 'la longueur est bornée');

  const renomme = renommerProfil(profil(), 'Yamina', { horloge: LE });
  assert.equal(renomme.pseudo, 'Yamina');
  assert.equal(renomme.majLe, LE);
  assert.equal(renommerProfil(renomme, 'Yamina'), renomme, 'le même nom ne réécrit rien');
  const nomme = profil({ pseudo: 'Salem' });
  assert.equal(renommerProfil(nomme, ''), nomme, 'un nom vide ne change rien');
  assert.equal(renommerProfil(nomme, '  Salem  '), nomme, 'le même nom, espacé autrement, ne réécrit rien');
  assert.equal(renommerProfil(profil({ pseudo: 'Salem' }), '   ').pseudo, 'Salem');

  assert.equal(pseudoLisible(profil({ pseudo: 'Salem' }), 'Yamina'), 'Salem', 'le pseudo choisi l’emporte');
  assert.equal(pseudoLisible(profil(), 'compte@exemple.dz'), 'compte@exemple.dz', 'sinon le nom du compte');
  assert.equal(pseudoLisible(profil(), '   '), 'Gardien de Bab El', 'et sinon la ville nomme le joueur');
  assert.equal(pseudoLisible(null, null), 'Gardien de Bab El');
});

test('l’emblème est un glyphe du catalogue, jamais une image', () => {
  assert.ok(EMBLEMES.length >= 4);
  for (const embleme of EMBLEMES) {
    assert.ok(embleme.id && embleme.glyphe && embleme.nom, 'un emblème est complet');
    assert.equal([...embleme.glyphe].length, 1, `${embleme.id} tient en un glyphe`);
  }
  const choisi = choisirEmbleme(profil(), EMBLEMES[2].id, { horloge: LE });
  assert.equal(choisi.embleme, EMBLEMES[2].id);
  assert.equal(glypheEmbleme(choisi), EMBLEMES[2].glyphe);
  assert.equal(choisirEmbleme(choisi, EMBLEMES[2].id), choisi, 'le même emblème ne réécrit rien');
  assert.equal(choisirEmbleme(choisi, 'introuvable'), choisi, 'un emblème inconnu ne change rien');
  assert.equal(glypheEmbleme(profil({ embleme: 'introuvable' })), EMBLEMES[0].glyphe, 'un emblème illisible retombe sur le premier');
});

test('le format des XP est celui des crédits', () => {
  assert.equal(xpLisible(0), '0');
  assert.equal(xpLisible(1084), '1\u202f084');
  assert.equal(xpLisible(3332), '3\u202f332');
  assert.equal(xpLisible(-5), '0');
});

// ── La tolérance et la fusion ────────────────────────────────────────────────

test('un profil illisible rend un profil neuf, jamais une erreur', () => {
  for (const valeur of [null, undefined, 'profil', 42, [], { xp: 'beaucoup' }, { xp: -90, stats: 'rien', paliers: 'rien' }]) {
    const normalise = normaliserProfil(valeur);
    assert.equal(normalise.version, 1);
    assert.ok(Number.isInteger(normalise.xp) && normalise.xp >= 0, `l’XP de ${JSON.stringify(valeur)} est un entier positif`);
    assert.equal(niveauDeXp(normalise.xp) >= 1, true);
    assert.ok(Array.isArray(normalise.paliers));
    assert.equal(normalise.embleme, EMBLEMES[0].id);
  }
  const casse = normaliserProfil({
    xp: 300,
    pseudo: 'Salem',
    embleme: EMBLEMES[1].id,
    boostersOfferts: 1,
    stats: { duelsGagnes: 4, inconnu: 9 },
    paliers: [
      { niveau: 3, le: LE, motif: 'etage' },
      { niveau: 3, le: '2026-01-01T00:00:00.000Z', motif: 'carte' },
      { niveau: 99, le: null },
      { niveau: 'deux', le: LE },
      null,
    ],
    majLe: LE,
  });
  assert.equal(casse.xp, 300);
  assert.equal(casse.pseudo, 'Salem');
  assert.equal(casse.stats.duelsGagnes, 4);
  assert.equal(casse.stats.inconnu, undefined, 'un compteur inconnu n’entre pas');
  assert.equal(casse.stats.cartesJouees, 0, 'un compteur absent vaut zéro');
  assert.equal(casse.paliers.length, 1, 'un palier sans date et un niveau illisible sont jetés, un doublon se fond');
  assert.deepEqual(casse.paliers.map((palier) => palier.niveau), [3]);
  assert.equal(casse.paliers[0].le, '2026-01-01T00:00:00.000Z', 'deux appareils, un palier : la première date l’emporte');
  assert.equal(casse.paliers[0].motif, 'carte');
});

test('le journal des paliers est borné', () => {
  let p = profilVide();
  for (let niveau = 2; niveau <= COURBE.niveauMax; niveau += 1) {
    p = { ...p, paliers: [...p.paliers, { niveau, le: `2026-10-${String((niveau % 28) + 1).padStart(2, '0')}T10:00:00.000Z`, motif: 'etage' }] };
  }
  const borne = normaliserProfil(p);
  assert.equal(borne.paliers.length, COURBE.paliersJournal, 'la mémoire reste petite');
  assert.equal(borne.paliers[0].niveau, COURBE.niveauMax, 'le plus haut d’abord');
});

test('la fusion ne fait rien redescendre, et ne perd aucun nom', () => {
  const ici = profil({ xp: 400, pseudo: 'Salem', boostersOfferts: 1, stats: { duelsGagnes: 5, cartesJouees: 90 }, majLe: '2026-10-20T10:00:00.000Z' });
  const la = profil({ xp: 900, pseudo: null, boostersOfferts: 3, stats: { duelsGagnes: 2, cartesJouees: 140 }, majLe: '2026-10-22T10:00:00.000Z', paliers: [{ niveau: 5, le: '2026-10-22T10:00:00.000Z', motif: 'tour' }] });
  const { profil: fusion, modifie } = fusionnerProfils(ici, la);
  assert.equal(fusion.xp, 900, 'l’XP au maximum, jamais le dernier arrivé');
  assert.equal(fusion.boostersOfferts, 3);
  assert.equal(fusion.stats.duelsGagnes, 5, 'compteur par compteur, le maximum');
  assert.equal(fusion.stats.cartesJouees, 140);
  assert.equal(fusion.pseudo, 'Salem', 'un appareil sans nom n’efface pas celui de l’autre');
  assert.deepEqual(fusion.paliers.map((palier) => palier.niveau), [5]);
  assert.equal(fusion.majLe, '2026-10-22T10:00:00.000Z');
  assert.equal(modifie, true);

  assert.equal(fusionnerProfils(fusion, fusion).modifie, false, 'deux fois le même profil ne modifie rien');
  assert.equal(fusionnerProfils(ici, null).profil.xp, 400, 'sans compte, l’appareil reste la référence');
  assert.equal(fusionnerProfils(null, la).profil.xp, 900, 'sans appareil, le compte descend');

  const renomme = fusionnerProfils(
    { ...ici, pseudo: 'Yamina', majLe: '2026-10-23T10:00:00.000Z' },
    { ...la, pseudo: 'Salem', majLe: '2026-10-22T10:00:00.000Z' },
  );
  assert.equal(renomme.profil.pseudo, 'Yamina', 'le nom le plus récent l’emporte');
});

// ── Le stockage de l'appareil ────────────────────────────────────────────────

test('le profil se sauvegarde et se relit, et se tait quand le stockage manque', () => {
  const { stockage, donnees } = stockageEnMemoire();
  avecStockage(stockage, () => {
    assert.equal(chargerProfil().xp, 0, 'sans rien d’écrit : profil neuf');
    assert.equal(sauverProfil(gagnerXp(profilVide(), 300, { motif: 'etage', horloge: LE }).profil), true);
    const relu = chargerProfil();
    assert.equal(relu.xp, 300);
    assert.equal(niveauDeXp(relu.xp), 4, 'le niveau se relit de l’XP, il n’est jamais stocké');
    assert.ok(donnees.has(RPG_PROFIL_STORAGE_KEY), 'la clé est celle du profil');
    donnees.set(RPG_PROFIL_STORAGE_KEY, '{ pas du json');
    assert.equal(chargerProfil().xp, 0, 'un JSON cassé rend un profil neuf');
  });
  assert.equal(sauverProfil(profil({ xp: 10 })), false, 'hors stockage, l’écriture échoue en silence');
  assert.equal(chargerProfil().xp, 0);
});
