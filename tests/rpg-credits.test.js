import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAREME_DOUBLON,
  GAINS,
  butinDeTour,
  recompenseEtage,
  JOURNAL_MAX,
  RPG_BOURSE_STORAGE_KEY,
  ajouterCartesAuPortefeuille,
  ajouterExemplaireAuPortefeuille,
  chargerPortefeuille,
  exemplairesDuPortefeuille,
  fusionnerEtals,
  fusionnerExemplaires,
  normaliserEtal,
  crediterCredits,
  creditsDeDoublons,
  creditsDeVictoire,
  depenserCredits,
  enregistrerOuverture,
  fusionnerPortefeuilles,
  gainsDeTour,
  normaliserJournal,
  normaliserExemplaires,
  normaliserPortefeuille,
  normaliserToursPayees,
  noterOuvertureJournal,
  paquetsAvantMythique,
  portefeuilleVide,
  reclamerButinTour,
  sauverPortefeuille,
} from '../src/games/rpgCredits.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

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
  // Le barème est écrit noir sur blanc : un doublon adoucit la perte, il ne la
  // paie jamais (la borne « un paquet de doublons reste déficitaire » vit dans
  // `rpg-boosters.test.js`, avec le prix du paquet sous la main).
  assert.deepEqual(BAREME_DOUBLON, { commune: 6, inhabituelle: 10, rare: 22, mythique: 60 });
  for (const [rarete, montant] of Object.entries(BAREME_DOUBLON)) {
    assert.ok(montant > 0, `le barème paie la ${rarete}`);
  }
});

// ── Le butin des tours ───────────────────────────────────────────────────────

test('le barème promet un butin de tour plus gros qu’un étage', () => {
  assert.equal(GAINS.tourTerminee, 200);
  assert.ok(GAINS.tourTerminee > GAINS.etagePremiere, 'le sommet paie mieux qu’un premier déblayage');
});

test('le butin d’une tour se verse une fois, et jamais pour une tour inconnue', () => {
  const depart = portefeuille(100);
  const premier = reclamerButinTour(depart, 'tour-des-listes');
  assert.equal(premier.ok, true);
  assert.equal(premier.gain, GAINS.tourTerminee);
  assert.equal(premier.portefeuille.credits, 100 + GAINS.tourTerminee);
  assert.deepEqual(premier.portefeuille.toursPayees, ['tour-des-listes'], 'la tour réglée est retenue');

  const second = reclamerButinTour(premier.portefeuille, 'tour-des-listes');
  assert.equal(second.ok, false);
  assert.equal(second.raison, 'deja-payee');
  assert.equal(second.gain, 0);
  assert.equal(second.portefeuille.credits, 300, 'un refus ne crédite rien');

  const inconnue = reclamerButinTour(depart, 'tour-qui-nexiste-pas');
  assert.equal(inconnue.ok, false);
  assert.equal(inconnue.raison, 'tour-inconnue');
  assert.equal(inconnue.gain, 0);
  assert.equal(reclamerButinTour(depart, null).raison, 'tour-inconnue');
  assert.equal(reclamerButinTour(depart, '  tour-du-souk  ').ok, true, 'l’identifiant est nettoyé');
});

test('toursPayees se normalise comme les leçons : tours connues, sans doublon', () => {
  assert.deepEqual(portefeuilleVide().toursPayees, [], 'un joueur neuf n’a aucun butin encaissé');
  assert.deepEqual(normaliserToursPayees('pas un tableau'), []);
  assert.deepEqual(
    normaliserToursPayees(['tour-du-souk', 'tour-du-souk', 'tour-fantome', 42, null, ' tour-des-sables ']),
    ['tour-du-souk', 'tour-des-sables'],
    'une tour hors catalogue ne passe pas, les doublons non plus',
  );
  const lu = normaliserPortefeuille({ credits: 10, toursPayees: ['tour-du-fjord', 'inconnue'] });
  assert.deepEqual(lu.toursPayees, ['tour-du-fjord']);
});

test('la fusion des appareils unit les butins déjà versés', () => {
  const ici = portefeuille(300, { toursPayees: ['tour-des-listes'] });
  const la = portefeuille(250, { toursPayees: ['tour-du-souk'] });
  const fusion = fusionnerPortefeuilles(ici, la).portefeuille;
  assert.deepEqual(fusion.toursPayees, ['tour-des-listes', 'tour-du-souk'], 'l’union — un butin payé ailleurs reste payé');
  assert.equal(reclamerButinTour(fusion, 'tour-des-listes').raison, 'deja-payee');
  assert.equal(reclamerButinTour(fusion, 'tour-du-souk').raison, 'deja-payee');
  assert.equal(reclamerButinTour(fusion, 'tour-des-sables').ok, true);
});

test('gainsDeTour affiche le barème de chaque étage, le butin et ce qui est en poche', () => {
  for (const tour of RPG_STORY_TOURS) {
    const affiche = gainsDeTour(tour.id);
    // Chaque étage peut déclarer son propre barème (`recompense`), et la tour
    // son propre butin : la Tour Oubliée paie 1 500 crédits au sommet et 600 de
    // butin, les autres gardent `GAINS`.
    const promis = tour.etages.reduce((somme, etage) => somme + recompenseEtage(etage.id, { premiere: true }), 0)
      + butinDeTour(tour.id);
    assert.equal(affiche.total, promis,
      `${tour.nom} : le total promet chaque étage au premier déblayage, plus le butin`);
    assert.equal(affiche.dejaGagne, 0, 'rien de gagné sans progression');
    assert.equal(affiche.reste, affiche.total);
    assert.equal(affiche.complete, false);
    assert.equal(affiche.butinGagne, false);
    assert.equal(affiche.etages.length, tour.etages.length);
    for (const etage of affiche.etages) {
      assert.equal(etage.premiere, recompenseEtage(etage.id, { premiere: true }));
      assert.equal(etage.rejoue, recompenseEtage(etage.id, { premiere: false }));
      assert.equal(etage.gagne, false);
    }
  }

  const souk = RPG_STORY_TOURS.find((tour) => tour.id === 'tour-du-souk');
  const deuxEtages = souk.etages.slice(0, 2).map((etage) => etage.id);
  const enRoute = gainsDeTour('tour-du-souk', { etagesVaincus: deuxEtages });
  assert.equal(enRoute.dejaGagne, 2 * GAINS.etagePremiere);
  assert.equal(enRoute.reste, enRoute.total - enRoute.dejaGagne);
  assert.equal(enRoute.complete, false);
  assert.equal(enRoute.etages.filter((etage) => etage.gagne).length, 2);

  const tout = souk.etages.map((etage) => etage.id);
  const finie = gainsDeTour('tour-du-souk', { etagesVaincus: tout, toursPayees: ['tour-du-souk'] });
  assert.equal(finie.complete, true);
  assert.equal(finie.butinGagne, true);
  assert.equal(finie.dejaGagne, finie.total, 'tout est gagné : étages et butin');
  assert.equal(finie.reste, 0);

  const finieNonPayee = gainsDeTour('tour-du-souk', { etagesVaincus: tout });
  assert.equal(finieNonPayee.complete, true);
  assert.equal(finieNonPayee.butinGagne, false, 'une tour complète d’avant le butin l’affiche encore à gagner');
  assert.equal(finieNonPayee.dejaGagne, tout.length * GAINS.etagePremiere);

  assert.equal(gainsDeTour('tour-fantome'), null, 'une tour inconnue n’affiche rien');
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

  // Une promesse ne se compte que là où elle est tenable : sur un rayon sans
  // mythique au vivier, l'ouverture compte mais la pitié ne bouge pas.
  const sansMythique = enregistrerOuverture(portefeuille(1000, { pitie: 4 }), { mythique: false, aDesMythiques: false });
  assert.equal(sansMythique.ouvertures, 1);
  assert.equal(sansMythique.pitie, 4, 'la pitié reste où elle en était');
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

// ── Le journal des ouvertures (lot 5) ───────────────────────────────────────

test('le journal garde la plus récente en tête et refuse ce qu’il ne connaît pas', () => {
  let p = portefeuilleVide();
  p = noterOuvertureJournal(p, { rayonId: 'braise', cartes: ['tarek', 'yamina'], horloge: '2026-03-01T10:00:00.000Z' });
  p = noterOuvertureJournal(p, { rayonId: 'souk', cartes: ['kraken'], mythique: true, remboursement: 45, horloge: '2026-03-02T10:00:00.000Z' });
  assert.equal(p.journal.length, 2);
  assert.equal(p.journal[0].rayonId, 'souk', 'la dernière ouverture est en tête');
  assert.equal(p.journal[0].mythique, true);
  assert.equal(p.journal[0].remboursement, 45);
  assert.deepEqual(p.journal[1].cartes, ['tarek', 'yamina']);

  assert.equal(noterOuvertureJournal(p, { rayonId: 'rayon-fantome', cartes: ['tarek'] }).journal.length, 2,
    'un rayon inconnu n’entre pas au journal');
  assert.equal(noterOuvertureJournal(p, { rayonId: 'braise', cartes: ['carte-fantome'] }).journal.length, 2,
    'une carte inconnue non plus');
  assert.equal(noterOuvertureJournal(p, { rayonId: 'braise', cartes: [] }).journal.length, 2,
    'et une ouverture vide ne compte pas');
});

test('le journal est borné, se normalise et se fusionne sans doublon', () => {
  let p = portefeuilleVide();
  for (let index = 0; index < JOURNAL_MAX + 8; index += 1) {
    p = noterOuvertureJournal(p, {
      rayonId: 'braise',
      cartes: ['tarek'],
      horloge: new Date(Date.UTC(2026, 2, 1, 10, index)).toISOString(),
    });
  }
  assert.equal(p.journal.length, JOURNAL_MAX, 'la mémoire est bornée');
  assert.equal(p.journal[0].le, new Date(Date.UTC(2026, 2, 1, 10, JOURNAL_MAX + 7)).toISOString(),
    'et c’est la plus récente qu’on garde');

  assert.deepEqual(normaliserJournal('pas un tableau'), []);
  assert.deepEqual(normaliserJournal([null, 12, {}, { le: 'hier', rayonId: 'braise' }]), [],
    'une entrée sans date, sans rayon ou sans carte est jetée');

  const ici = noterOuvertureJournal(portefeuilleVide(), {
    rayonId: 'braise', cartes: ['tarek'], horloge: '2026-03-01T10:00:00.000Z',
  });
  const ailleurs = noterOuvertureJournal(portefeuilleVide(), {
    rayonId: 'souk', cartes: ['kraken'], horloge: '2026-03-02T10:00:00.000Z',
  });
  const fusion = fusionnerPortefeuilles(ici, ailleurs).portefeuille;
  assert.equal(fusion.journal.length, 2, 'les deux journaux se rejoignent');
  assert.equal(fusion.journal[0].rayonId, 'souk', 'du plus récent au plus ancien');
  assert.deepEqual(fusionnerPortefeuilles(ici, ici).portefeuille.journal.length, 1,
    'un appareil qui a déjà tout n’écrit rien en double');
});

test('une ouverture avec cartes entre au journal, une ouverture sans cartes non', () => {
  const sans = enregistrerOuverture(portefeuilleVide(), { mythique: false });
  assert.equal(sans.ouvertures, 1, 'le compteur avance toujours');
  assert.deepEqual(sans.journal, [], 'mais le journal ne devine rien');
  const avec = enregistrerOuverture(portefeuilleVide(), {
    mythique: true, rayonId: 'braise', cartes: ['tarek'], remboursement: 12, coffret: true,
  });
  assert.equal(avec.journal.length, 1);
  assert.equal(avec.journal[0].coffret, true, 'un paquet de coffret se reconnaît');
  assert.equal(avec.journal[0].mythique, true);
  assert.equal(avec.pitie, 0, 'et la pitié repart, comme avant');
});

test('la mémoire de l’étal garde les inhabituelles depuis qu’elles s’y vendent', () => {
  // Le tiroir de l’étal ne retient que ce qui s’y achète. Oublier le palier de
  // 80 ◈ dans cette liste vidé silencieusement un cinquième de l’étal du jour à
  // chaque relecture : la carte est proposée, payable, puis disparaît du casier.
  const inhabituelle = RPG_DUEL_CARDS.find((carte) => carte.kind !== 'terrain'
    && carte.rarity === 'inhabituelle').id;
  const etal = {
    jour: '2026-10-24',
    cartes: [inhabituelle, 'scribe-de-la-liste', 'tarek'],
    achetees: [inhabituelle],
    rafraichissements: 1,
    majLe: '2026-10-24T10:00:00.000Z',
  };
  const relu = normaliserPortefeuille({ cartes: [inhabituelle], exemplaires: { [inhabituelle]: 1 }, etal });
  assert.deepEqual(relu.etal.cartes, [inhabituelle, 'scribe-de-la-liste', 'tarek'],
    'les trois offres du jour se relisent telles quelles');
  assert.deepEqual(relu.etal.achetees, [inhabituelle], 'et l’achat du jour reste comptabilisé');
  assert.equal(relu.exemplaires[inhabituelle], undefined, 'un seul exemplaire payé reste implicite');
  // Une commune n’a rien à faire dans cette mémoire : elle ne s’achète pas.
  const commune = RPG_DUEL_CARDS.find((carte) => carte.kind !== 'terrain' && carte.rarity === 'commune').id;
  assert.deepEqual(normaliserEtal({ jour: '2026-10-24', cartes: [commune, inhabituelle] }).cartes, [inhabituelle],
    'la filtre garde sa raison d’être : elle ne connaît que les raretés de l’étal');
  // La fusion, elle, ne soude jamais deux moitiés d’un même compteur.
  const fusion = fusionnerEtals(
    { jour: '2026-10-24', cartes: [inhabituelle], achetees: [], rafraichissements: 0, majLe: '2026-10-24T09:00:00.000Z' },
    { jour: '2026-10-24', cartes: [inhabituelle, 'scribe-de-la-liste'], achetees: [inhabituelle], rafraichissements: 1, majLe: '2026-10-24T11:00:00.000Z' },
  );
  assert.deepEqual(fusion.achetees, [inhabituelle], 'l’achat déjà fait sur un appareil n’est pas rejouable sur l’autre');
});

// ── Le stock d'exemplaires de l'étal ─────────────────────────────────────────
//
// `cartes` répond à « est-ce que je la possède ? », `exemplaires` à « combien de
// copies ai-je payées ? ». Les deux doivent survivre au stockage, à la fusion
// entre appareils et à une sauvegarde retouchée — sans jamais rendre une carte
// jouable ou invisible : la possession ne se discute pas avec un compteur.

test('le stock d’exemplaires part vide et se normalise sans bruit', () => {
  assert.deepEqual(portefeuilleVide().exemplaires, {}, 'un joueur neuf n’a aucune copie rachetée');
  assert.deepEqual(normaliserExemplaires('pas un objet', []), {});
  assert.deepEqual(normaliserExemplaires([2, 3], []), {}, 'un tableau n’est pas un compteur');
  assert.deepEqual(normaliserExemplaires({ 'tarek': 'deux' }, ['tarek']), {}, 'une valeur illisible tombe');
  assert.deepEqual(normaliserExemplaires({ 'tarek': 1 }, ['tarek']), {},
    'le premier exemplaire est la valeur implicite : il ne s’écrit pas');
  assert.deepEqual(normaliserExemplaires({ 'tarek': 2 }, []), {},
    'un compteur ne peut pas faire exister une carte');
  assert.deepEqual(normaliserExemplaires({ 'carte-inconnue': 2 }, ['carte-inconnue']), {},
    'et une carte hors catalogue n’a pas de stock');
});

test('le quota de rareté borne le stock, la mythique reste unique', () => {
  let p = portefeuilleVide();
  const premiere = ajouterExemplaireAuPortefeuille(p, 'scribe-de-la-liste');
  assert.equal(premiere.ajoute, true);
  assert.equal(premiere.total, 1);
  assert.deepEqual(premiere.portefeuille.cartes, ['scribe-de-la-liste'], 'la copie range aussi la carte');
  assert.deepEqual(premiere.portefeuille.exemplaires, {}, 'et laisse le premier exemplaire implicite');
  p = premiere.portefeuille;
  const seconde = ajouterExemplaireAuPortefeuille(p, 'scribe-de-la-liste');
  assert.equal(seconde.ajoute, true, 'une rare a droit à un second exemplaire');
  assert.equal(seconde.total, 2);
  assert.deepEqual(seconde.portefeuille.exemplaires, { 'scribe-de-la-liste': 2 });
  p = seconde.portefeuille;
  const avant = JSON.stringify(p);
  const troisieme = ajouterExemplaireAuPortefeuille(p, 'scribe-de-la-liste');
  assert.equal(troisieme.ajoute, false, 'le troisième est hors quota');
  assert.equal(troisieme.total, 2);
  assert.equal(JSON.stringify(troisieme.portefeuille), avant, 'et le portefeuille ne bouge pas d’un octet');
  // Une mythique déclarée à cinq copies par une sauvegarde retouchée : la borne
  // du catalogue gagne, toujours.
  const triche = normaliserPortefeuille({ cartes: ['tarek'], exemplaires: { tarek: 5 } });
  assert.deepEqual(triche.exemplaires, {}, 'tarek est mythique : une seule copie, donc rien d’écrit');
});

test('la possession d’un appareil ne dépend pas du compteur de l’autre', () => {
  // Une rare, quota de deux copies : `tarek` est mythique et ne serait jamais
  // écrit, ce qui est exactement la règle à vérifier ailleurs.
  assert.deepEqual(fusionnerExemplaires(
    { 'scribe-de-la-liste': 2 }, { 'scribe-de-la-liste': 1 }, ['scribe-de-la-liste'],
  ), { 'scribe-de-la-liste': 2 }, 'le maximum gagne, jamais la somme ni le plus récent');
  assert.deepEqual(fusionnerExemplaires({}, { 'scribe-de-la-liste': 2 }, ['scribe-de-la-liste']),
    { 'scribe-de-la-liste': 2 });
  assert.deepEqual(fusionnerExemplaires({ 'scribe-de-la-liste': 2 }, {}, []), {},
    'une carte que la fusion ne connaît pas perd son compteur, pas sa possession');
  const local = normaliserPortefeuille({ cartes: ['scribe-de-la-liste'], exemplaires: { 'scribe-de-la-liste': 2 } });
  const enRetard = normaliserPortefeuille({ cartes: ['scribe-de-la-liste'] });
  const fusion = fusionnerPortefeuilles(local, enRetard).portefeuille;
  assert.deepEqual(fusion.exemplaires, { 'scribe-de-la-liste': 2 },
    'un appareil en retard ne fait pas redescendre une carte de 2 à 1');
});

test('le stock traverse le stockage local comme le reste du portefeuille', () => {
  const stockage = stockageEnMemoire();
  avecStockage({ value: stockage.stockage.value }, () => {
    const trop = ajouterExemplaireAuPortefeuille(
      ajouterCartesAuPortefeuille(portefeuilleVide(), ['kraken']), 'kraken', { possedee: true },
    );
    assert.equal(trop.ajoute, false, 'une mythique possédée n’a plus de copie à vendre');
    assert.equal(trop.total, 1, 'et son stock reste au quota, sans écriture');
    const avecSeconde = ajouterExemplaireAuPortefeuille(
      ajouterCartesAuPortefeuille(portefeuilleVide(), ['scribe-de-la-liste']), 'scribe-de-la-liste', { possedee: true },
    );
    assert.equal(avecSeconde.total, 2);
    assert.equal(sauverPortefeuille(avecSeconde.portefeuille), true);
    const relu = chargerPortefeuille();
    assert.deepEqual(relu.exemplaires, { 'scribe-de-la-liste': 2 }, 'la relecture retrouve le stock');
    assert.deepEqual(exemplairesDuPortefeuille(relu), { 'scribe-de-la-liste': 2 });
    assert.deepEqual(exemplairesDuPortefeuille(null), {}, 'un portefeuille absent ne dit rien');
  });
});
