import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAREME_DOUBLON,
  GAINS,
  RPG_BOURSE_STORAGE_KEY,
  ajouterCartesAuPortefeuille,
  chargerPortefeuille,
  crediterCredits,
  creditsDeDoublons,
  creditsDeVictoire,
  depenserCredits,
  enregistrerOuverture,
  fusionnerPortefeuilles,
  normaliserPortefeuille,
  paquetsAvantMythique,
  portefeuilleVide,
  sauverPortefeuille,
} from '../src/games/rpgCredits.js';

/** Remplace `localStorage` le temps d'un test, puis le rétablit. */
function avecStockage(stockage, test) {
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...stockage });
  try {
    return test();
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
}

function stockageEnMemoire(donnees = new Map()) {
  return {
    donnees,
    stockage: {
      value: {
        getItem: (cle) => donnees.get(cle) ?? null,
        setItem: (cle, valeur) => donnees.set(cle, valeur),
        removeItem: (cle) => donnees.delete(cle),
      },
    },
  };
}

const portefeuille = (credits, reste = {}) => ({ ...portefeuilleVide(), credits, ...reste });

// ── Les gains ────────────────────────────────────────────────────────────────

test('une victoire paie le premier déblayage, pas la reprise du même étage', () => {
  assert.equal(creditsDeVictoire({ mode: 'histoire', premiere: true }), GAINS.etagePremiere);
  assert.equal(creditsDeVictoire({ mode: 'tours', premiere: true }), GAINS.etagePremiere);
  assert.equal(creditsDeVictoire({ mode: 'histoire', premiere: false }), GAINS.etageRejoue);
  assert.equal(creditsDeVictoire({ mode: 'tours', premiere: false }), GAINS.etageRejoue);
  assert.equal(creditsDeVictoire({ mode: 'libre' }), GAINS.duelLibre);
  assert.equal(creditsDeVictoire({ mode: 'defaite' }), 0);
  assert.equal(creditsDeVictoire(), GAINS.duelLibre);
  assert.ok(GAINS.etagePremiere > GAINS.etageRejoue * 4, 'la reprise ne vaut pas un farm');
  assert.equal(GAINS.cachetDuCycle, 80);
});

test('le remboursement des doublons suit le barème, carte inconnue comprise', () => {
  assert.equal(creditsDeDoublons(['tarek']), BAREME_DOUBLON.mythique);
  assert.equal(creditsDeDoublons(['cavalier-amazigh-du-desert']), BAREME_DOUBLON.rare);
  assert.equal(creditsDeDoublons(['carte-qui-nexiste-pas']), 0);
  assert.equal(creditsDeDoublons([]), 0);
  assert.equal(creditsDeDoublons(undefined), 0);
  const trois = creditsDeDoublons(['tarek', 'tarek', 'cavalier-amazigh-du-desert']);
  assert.equal(trois, BAREME_DOUBLON.mythique * 2 + BAREME_DOUBLON.rare);
  for (const [rarete, montant] of Object.entries(BAREME_DOUBLON)) {
    assert.ok(montant > 0, `le barème paie la ${rarete}`);
  }
});

test('créditer encaisse un montant valable, ignore le reste', () => {
  assert.equal(crediterCredits(portefeuille(100), 50).portefeuille.credits, 150);
  assert.equal(crediterCredits(portefeuille(100), 0).portefeuille.credits, 100);
  assert.equal(crediterCredits(portefeuille(100), -80).portefeuille.credits, 100);
  assert.equal(crediterCredits(portefeuille(100), 'vingt').portefeuille.credits, 100);
  assert.equal(crediterCredits(portefeuille(100), 12.7).gain, 12, 'les crédits sont entiers');
});

// ── La dépense ───────────────────────────────────────────────────────────────

test('dépenser refuse sans solde, sans jamais amputer le portefeuille', () => {
  const pauvre = portefeuille(139);
  const refus = depenserCredits(pauvre, 140);
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'solde-insuffisant');
  assert.equal(refus.portefeuille.credits, 139, 'un refus ne retire rien');

  const achat = depenserCredits(portefeuille(140), 140);
  assert.equal(achat.ok, true);
  assert.equal(achat.portefeuille.credits, 0);

  assert.equal(depenserCredits(portefeuille(500), 0).raison, 'montant-invalide');
  assert.equal(depenserCredits(portefeuille(500), -140).raison, 'montant-invalide');
});

// ── Les cartes du Souk et la pitié ───────────────────────────────────────────

test('les cartes gagnées au Souk s’ajoutent en union, sans doublon', () => {
  const depart = ajouterCartesAuPortefeuille(portefeuille(0), ['tarek', 'kraken']);
  assert.deepEqual(depart.cartes, ['tarek', 'kraken']);
  const suite = ajouterCartesAuPortefeuille(depart, ['kraken', 'carte-qui-nexiste-pas', 'yamina']);
  assert.deepEqual(suite.cartes, ['tarek', 'kraken', 'yamina']);
  assert.equal(ajouterCartesAuPortefeuille(suite, ['tarek']).cartes.length, 3, 'une carte déjà là ne compte pas deux fois');
});

test('la pitié monte à chaque ouverture et ne retombe que sur une mythique', () => {
  let p = portefeuille(1000);
  for (let index = 0; index < 3; index += 1) p = enregistrerOuverture(p, { mythique: false });
  assert.equal(p.ouvertures, 3);
  assert.equal(p.pitie, 3);
  p = enregistrerOuverture(p, { mythique: true });
  assert.equal(p.ouvertures, 4);
  assert.equal(p.pitie, 0, 'la mythique remet la pitié à zéro');
  assert.equal(portefeuilleVide().pitie, 0);
});

test('« paquets avant la mythique assurée » compte juste, et se tait sans mythique au vivier', () => {
  assert.equal(paquetsAvantMythique(portefeuille(0, { pitie: 0 }), { seuil: 8 }), 7);
  assert.equal(paquetsAvantMythique(portefeuille(0, { pitie: 7 }), { seuil: 8 }), 0, 'le prochain paquet en contient une');
  assert.equal(paquetsAvantMythique(portefeuille(0, { pitie: 3 }), { seuil: 8 }), 4);
  assert.equal(paquetsAvantMythique(portefeuille(0), { aDesMythiques: false }), null, 'aucune promesse quand le vivier n’en a pas');
});

// ── La normalisation et la fusion ────────────────────────────────────────────

test('un portefeuille corrompu se relit en portefeuille vide, jamais en exception', () => {
  for (const valeur of [null, undefined, 'n’importe quoi', 42, [], { credits: -50 }, { credits: 'x', cartes: 'y', pitie: NaN }]) {
    const lu = normaliserPortefeuille(valeur);
    assert.equal(lu.credits, 0);
    assert.deepEqual(lu.cartes, []);
    assert.equal(lu.pitie, 0);
  }
  assert.equal(normaliserPortefeuille({ credits: 12.9 }).credits, 12);
  assert.deepEqual(normaliserPortefeuille({ cartes: ['tarek', 'tarek', 'inconnue'] }).cartes, ['tarek']);
});

test('la fusion ne fait jamais baisser un solde, et unit les cartes', () => {
  const local = portefeuille(400, { cartes: ['tarek'], ouvertures: 9, pitie: 3 });
  const distant = portefeuille(900, { cartes: ['kraken'], ouvertures: 4, pitie: 7 });
  const { portefeuille: fusion, modifie } = fusionnerPortefeuilles(local, distant);
  assert.equal(fusion.credits, 900, 'le maximum, jamais le dernier arrivé');
  assert.deepEqual(fusion.cartes, ['tarek', 'kraken'], 'les cartes s’unissent');
  assert.equal(fusion.ouvertures, 9);
  assert.equal(fusion.pitie, 7, 'la pitié la plus avancée — la règle est généreuse');
  assert.equal(modifie, true);
  const identique = fusionnerPortefeuilles(fusion, fusion);
  assert.equal(identique.modifie, false, 'deux fois le même portefeuille ne modifie rien');
  assert.equal(fusionnerPortefeuilles(local, null).portefeuille.credits, 400);
});

// ── Le stockage de l'appareil ────────────────────────────────────────────────

test('le portefeuille se sauvegarde et se relit, et se tait quand le stockage manque', () => {
  const { stockage, donnees } = stockageEnMemoire();
  avecStockage(stockage, () => {
    assert.equal(chargerPortefeuille().credits, 0, 'sans rien d’écrit : portefeuille vide');
    assert.equal(sauverPortefeuille(portefeuille(320, { cartes: ['tarek'] })), true);
    const relu = chargerPortefeuille();
    assert.equal(relu.credits, 320);
    assert.deepEqual(relu.cartes, ['tarek']);
    donnees.set(RPG_BOURSE_STORAGE_KEY, '{ pas du json');
    assert.equal(chargerPortefeuille().credits, 0, 'un JSON cassé rend un portefeuille vide');
  });
  assert.equal(sauverPortefeuille(portefeuille(10)), false, 'hors stockage, l’écriture échoue en silence');
  assert.equal(chargerPortefeuille().credits, 0);
});
