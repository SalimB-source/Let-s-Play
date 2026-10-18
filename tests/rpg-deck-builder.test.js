import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, cardById, convertirDeckSansTerrain } from '../src/games/rpgCards.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { fusionnerCollections } from '../src/games/rpgCollection.js';
import {
  RPG_DECKS_MAISON_LIMITE,
  RPG_DECKS_MAISON_STORAGE_KEY,
  casierMaisonVide,
  chargerCasierMaison,
  completerEnTerrains,
  courbeDeMana,
  chargerDecksMaison,
  deckMaisonEstSelectionnable,
  deckMaisonParId,
  enregistrerDeckDansCasier,
  fusionnerEtatsSablier,
  nomDeckMaisonParDefaut,
  normaliserDeckMaison,
  normaliserDecksMaison,
  normaliserSupprimesMaison,
  nouvelIdDeckMaison,
  peutAjouterCarte,
  repartitionCouleurs,
  rpgValiderDeckMaison,
  sauverCasierMaison,
  supprimerDeckDuCasier,
} from '../src/games/rpgDeckBuilder.js';

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

// La collection d'un joueur neuf : la dotation de départ, rien de plus — les
// étages ne donnent plus de cartes (dossier 13).
const COLLECTION = collectionJoueur();

/** Un deck maison valide de 40 cartes, entièrement dans la dotation (mono-Sable). */
function deckValide(nom = 'Deck d\'essai', element = 'sable', id = nouvelIdDeckMaison()) {
  const depart = { sable: 'chien-du-guet', braise: 'ashigaru-des-braises', eau: 'porteuse-de-cruches' }[element];
  const cardIds = convertirDeckSansTerrain([depart], COLLECTION);
  return normaliserDeckMaison({ id, nom, cardIds });
}

// ── Normalisation ────────────────────────────────────────────────────────────

test('un deck maison se normalise : nom tronqué, cartes inconnues retirées, couleurs dérivées', () => {
  const deck = normaliserDeckMaison({
    id: 'maison-abc',
    nom: '  Mon deck  ',
    cardIds: ['desert', 'desert', 'carte-fantome', 'chien-du-guet'],
    boxArt: 'chien-du-guet',
    majLe: '2026-01-15T10:00:00.000Z',
  });
  assert.ok(deck.maison, 'le deck se sait maison');
  assert.equal(deck.id, 'maison-abc');
  assert.equal(deck.nom, 'Mon deck');
  assert.deepEqual(deck.cardIds, ['chien-du-guet']);
  assert.equal(deck.boxArt, 'chien-du-guet');
  assert.equal(deck.element, 'sable', 'mono-Sable par ses cartes');
  assert.equal(deck.majLe, '2026-01-15T10:00:00.000Z');
  assert.ok(deck.creeLe, 'une date de création est posée');
});

test('un deck maison bicolore déclare ses éléments, un brouillon vide reste descriptible', () => {
  const deck = normaliserDeckMaison({ id: 'maison-x', nom: 'Deux couleurs', cardIds: ['desert', 'chien-du-guet', 'mer', 'ressac'] });
  // À égalité de présence, l'ordre canonique des éléments tranche (eau avant sable).
  assert.deepEqual(deck.elements, ['eau', 'sable']);
  const vide = normaliserDeckMaison({ id: 'maison-vide', nom: 'Brouillon', cardIds: [] });
  assert.equal(vide.cardIds.length, 0);
  assert.equal(vide.nom, 'Brouillon');
  assert.equal(vide.boxArt, null);
});

test('un enregistrement illisible ne devient jamais un deck', () => {
  assert.equal(normaliserDeckMaison(null), null);
  assert.equal(normaliserDeckMaison('maison-abc'), null);
  assert.equal(normaliserDeckMaison({ id: 'pas-un-prefixe', nom: 'X', cardIds: [] }), null, 'l\'identifiant doit commencer par maison-');
  assert.equal(normaliserDeckMaison({ nom: 'sans identifiant' }), null);
  // Un nom absent ou tout espace retombe sur le nom par défaut.
  assert.equal(normaliserDeckMaison({ id: 'maison-n', nom: '   ', cardIds: [] }).nom, 'Deck maison');
  // Un nom trop long est tronqué, jamais refusé.
  assert.equal(normaliserDeckMaison({ id: 'maison-l', nom: 'a'.repeat(200), cardIds: [] }).nom.length, 60);
});

test('les listes de decks et de pierres tombales se normalisent sans doublon', () => {
  const decks = normaliserDecksMaison({ decks: [{ id: 'maison-a', cardIds: [] }, { id: 'maison-a', cardIds: [] }, 'borne'] });
  assert.equal(decks.length, 1);
  const supprimes = normaliserSupprimesMaison({ supprimes: [{ id: 'maison-a', majLe: '2026-01-01T00:00:00Z' }, { id: 'maison-a', majLe: '2026-02-01T00:00:00Z' }, { id: 'x' }] });
  assert.equal(supprimes.length, 1, 'une pierre par deck, la première retenue');
  assert.deepEqual(normaliserSupprimesMaison(null), []);
  assert.ok(nouvelIdDeckMaison().startsWith('maison-'));
  assert.notEqual(nouvelIdDeckMaison(), nouvelIdDeckMaison());
});

// ── Stockage tolérant ────────────────────────────────────────────────────────

test('le casier se sauvegarde, se recharge et tolère la corruption', () => {
  const memoire = stockageEnMemoire();
  avecStockage(memoire.stockage, () => {
    assert.deepEqual(chargerCasierMaison(), casierMaisonVide(), 'casier vide sans donnée');
    const deck = deckValide('Sauvegardé');
    const { casier } = enregistrerDeckDansCasier(casierMaisonVide(), deck);
    assert.equal(sauverCasierMaison(casier), true);
    assert.equal(chargerDecksMaison().length, 1);
    assert.equal(chargerDecksMaison()[0].nom, 'Sauvegardé');
    memoire.donnees.set(RPG_DECKS_MAISON_STORAGE_KEY, '{ cassé');
    assert.deepEqual(chargerCasierMaison(), casierMaisonVide(), 'un casier corrompu rend un casier vide');
    memoire.donnees.set(RPG_DECKS_MAISON_STORAGE_KEY, JSON.stringify({ decks: 'pas une liste', supprimes: 42 }));
    assert.deepEqual(chargerCasierMaison(), casierMaisonVide());
  });
  // Stockage indisponible : le casier reste en session, l'écriture rend false.
  avecStockage({ get: () => { throw new Error('interdit'); } }, () => {});
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('interdit'); } });
  try {
    assert.deepEqual(chargerCasierMaison(), casierMaisonVide());
    assert.equal(sauverCasierMaison(casierMaisonVide()), false);
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
});

// ── Enregistrement, plafond, suppression ─────────────────────────────────────

test('enregistrerDeckDansCasier crée puis met à jour sans muter l\'ancien casier', () => {
  const deck = deckValide('Premier');
  const premier = enregistrerDeckDansCasier(casierMaisonVide(), deck);
  assert.equal(premier.ok, true);
  assert.deepEqual(premier.casier.supprimes, []);
  // L'horodatage passé est écrasé : la mise à jour porte la date du moment.
  const modifie = enregistrerDeckDansCasier(premier.casier, { ...premier.deck, nom: 'Renommé', majLe: '2020-01-01T00:00:00.000Z' });
  assert.equal(modifie.ok, true);
  assert.equal(modifie.casier.decks.length, 1, 'mise à jour sur place, pas de doublon');
  assert.equal(modifie.casier.decks[0].nom, 'Renommé');
  assert.notEqual(modifie.casier.decks[0].majLe, '2020-01-01T00:00:00.000Z', 'l\'horodatage périmé est écrasé');
  assert.deepEqual(premier.casier.decks[0].nom, 'Premier', 'l\'ancien casier est intact');
  assert.equal(enregistrerDeckDansCasier(premier.casier, { id: 'faux', nom: 'x' }).ok, false, 'un enregistrement illisible est refusé');
});

test('l\'étagère maison tient douze decks, pas un de plus', () => {
  let casier = casierMaisonVide();
  for (let i = 0; i < RPG_DECKS_MAISON_LIMITE; i += 1) {
    const resultat = enregistrerDeckDansCasier(casier, deckValide(`Deck ${i + 1}`));
    assert.equal(resultat.ok, true, `le deck ${i + 1} entre`);
    casier = resultat.casier;
  }
  const refus = enregistrerDeckDansCasier(casier, deckValide('De trop'));
  assert.equal(refus.ok, false);
  assert.match(refus.raison, /étagère pleine/);
  // Une mise à jour d'un deck existant passe toujours, même étagère pleine.
  const maj = enregistrerDeckDansCasier(casier, { ...casier.decks[0], nom: 'Toujours éditable' });
  assert.equal(maj.ok, true);
});

test('supprimerDeckDuCasier retire le deck et pose une pierre tombale horodatée', () => {
  const deck = deckValide('À partir');
  const { casier } = enregistrerDeckDansCasier(casierMaisonVide(), deck);
  const apres = supprimerDeckDuCasier(casier, deck.id);
  assert.equal(apres.decks.length, 0);
  assert.equal(apres.supprimes.length, 1);
  assert.equal(apres.supprimes[0].id, deck.id);
  assert.ok(apres.supprimes[0].majLe);
  assert.equal(deckMaisonParId(apres.decks, deck.id), null);
});

test('le nom par défaut s\'incrémente : « Deck maison », puis 2, 3…', () => {
  assert.equal(nomDeckMaisonParDefaut([]), 'Deck maison');
  const un = enregistrerDeckDansCasier(casierMaisonVide(), deckValide('Deck maison')).casier;
  assert.equal(nomDeckMaisonParDefaut(un), 'Deck maison 2');
  const deux = enregistrerDeckDansCasier(un, { id: 'maison-2', nom: 'Deck maison 2', cardIds: ['desert'] }).casier;
  assert.equal(nomDeckMaisonParDefaut(deux), 'Deck maison 3');
});

// ── Quotas et validation maison ──────────────────────────────────────────────

test('peutAjouterCarte refuse l\'inconnu, le verrouillé et le dépassement de quota', () => {
  assert.equal(peutAjouterCarte('carte-fantome', [], COLLECTION).ok, false);
  assert.equal(peutAjouterCarte('kraken', [], COLLECTION).ok, false, 'mythique verrouillée au départ');
  assert.equal(peutAjouterCarte('petra', [], COLLECTION).ok, false, 'Pétra verrouillée au départ');
  assert.equal(peutAjouterCarte('chien-du-guet', [], COLLECTION).ok, true);
  const plein = [...Array(3).fill('chien-du-guet')];
  const avis = peutAjouterCarte('chien-du-guet', plein, COLLECTION);
  assert.equal(avis.ok, false);
  assert.match(avis.raison, /Quota/);
  // La collection absente ne verrouille pas (le duel reste jouable hors atelier).
  assert.equal(peutAjouterCarte('kraken', [], null).ok, true);
});

test('rpgValiderDeckMaison liste les raisons de structure ET de collection', () => {
  const court = rpgValiderDeckMaison(['desert'], COLLECTION);
  assert.equal(court.ok, false);
  assert.match(court.raisons[0], /30 cartes/);
  const verrouille = rpgValiderDeckMaison([...Array(40).fill('kraken')], COLLECTION);
  assert.equal(verrouille.ok, false);
  assert.ok(verrouille.raisons.some((raison) => raison.includes('hors collection')), 'les cartes non possédées sont nommées');
  const valide = deckValide();
  assert.deepEqual(rpgValiderDeckMaison(valide.cardIds, COLLECTION), { ok: true, raisons: [] });
  assert.equal(deckMaisonEstSelectionnable(valide, COLLECTION), true);
  // Sans collection, seule la structure parle.
  assert.equal(deckMaisonEstSelectionnable(valide, null), true);
  assert.equal(deckMaisonEstSelectionnable(valide, []), false, 'une collection vide ne possède aucune carte');
  assert.equal(deckMaisonEstSelectionnable(null, COLLECTION), false);
  const avecKraken = { ...valide, cardIds: [...valide.cardIds.slice(0, 29), 'kraken'] };
  assert.equal(deckMaisonEstSelectionnable(avecKraken, COLLECTION), false, 'une carte hors collection rend le deck injouable');
  const avecKrakenPossede = { ...valide, cardIds: [...valide.cardIds.slice(0, 29), 'kraken'] };
  assert.equal(
    deckMaisonEstSelectionnable(avecKrakenPossede, collectionJoueur({ acquis: { gel: true, cartes: ['kraken'] } })),
    true,
    'le même deck devient jouable une fois le Kraken acquis (gel de migration ou Souk)',
  );
});

// ── Fusion de compte (dernière écriture par deck, union de collection) ──────

test('la fusion retient le deck le plus récemment modifié, sans perte', () => {
  const vieux = { ...deckValide('Vieux'), majLe: '2026-01-01T00:00:00.000Z', id: 'maison-a' };
  const neuf = { ...deckValide('Neuf'), majLe: '2026-06-01T00:00:00.000Z', id: 'maison-a' };
  const fusion = fusionnerEtatsSablier({ local: { decks: [vieux], supprimes: [], collection: [] }, distant: { decks: [neuf], supprimes: [], collection: [] } });
  assert.equal(fusion.casier.decks[0].nom, 'Neuf');
  // À horodatage égal, le local garde la main (l'appareil sous les yeux prime).
  const egal = fusionnerEtatsSablier({ local: { decks: [vieux], supprimes: [], collection: [] }, distant: { decks: [{ ...vieux, nom: 'Distant' }], supprimes: [], collection: [] } });
  assert.equal(egal.casier.decks[0].nom, 'Vieux');
  // Deux decks différents coexistent.
  const autre = fusionnerEtatsSablier({ local: { decks: [vieux], supprimes: [], collection: [] }, distant: { decks: [{ ...neuf, id: 'maison-b' }], supprimes: [], collection: [] } });
  assert.equal(autre.casier.decks.length, 2);
});

test('les pierres tombales enterrent les decks supprimés — sauf s\'il a été réédité ailleurs', () => {
  const deck = { ...deckValide('Survivant ?'), id: 'maison-a', majLe: '2026-01-01T00:00:00.000Z' };
  const enterre = fusionnerEtatsSablier({
    local: { decks: [deck], supprimes: [], collection: [] },
    distant: { decks: [], supprimes: [{ id: 'maison-a', majLe: '2026-02-01T00:00:00.000Z' }], collection: [] },
  });
  assert.equal(enterre.casier.decks.length, 0, 'la pierre plus récente gagne');
  assert.equal(enterre.casier.supprimes.length, 1);
  const ressuscite = fusionnerEtatsSablier({
    local: { decks: [{ ...deck, majLe: '2026-03-01T00:00:00.000Z' }], supprimes: [], collection: [] },
    distant: { decks: [], supprimes: [{ id: 'maison-a', majLe: '2026-02-01T00:00:00.000Z' }], collection: [] },
  });
  assert.equal(ressuscite.casier.decks.length, 1, 'le deck réédité après sa pierre ressuscite');
  assert.equal(ressuscite.casier.supprimes.length, 0, 'la pierre périmée est retirée');
});

test('la collection fusionne en union, les pierres se plafonnent, `modifie` dit quoi pousser', () => {
  const local = { decks: [], supprimes: [], collection: COLLECTION };
  const distant = { decks: [], supprimes: [{ id: 'maison-x', majLe: '2026-01-01T00:00:00.000Z' }], collection: [...COLLECTION, 'kraken'] };
  const fusion = fusionnerEtatsSablier({ local, distant });
  assert.equal(fusion.etat.collection.includes('kraken'), true, 'l\'union ne perd rien');
  assert.deepEqual(fusion.etat.collection, fusionnerCollections(COLLECTION, ['kraken']));
  assert.equal(fusion.modifie, true, 'le distant a apporté : il faut pousser');
  const identique = fusionnerEtatsSablier({ local: { ...local, supprimes: distant.supprimes, collection: [...COLLECTION, 'kraken'] }, distant });
  assert.equal(identique.modifie, false, 'rien de nouveau : pas de réécriture');
  // Une localiste seule (jamais synchronisée) vaut poussée.
  const neuf = fusionnerEtatsSablier({ local, distant: null });
  assert.equal(neuf.modifie, false, 'distant absent : rien à fusionner');
  assert.ok(neuf.etat.majLe);
});

// ── Le panneau du deck, façon Arena : courbe, couleurs, « Compléter en terrains » ─────────

test('courbeDeMana répartit les sorts par coût (1 à 6, puis 7+), sans les terrains', () => {
  const vide = courbeDeMana([]);
  assert.equal(vide.paliers.length, 7);
  assert.deepEqual(vide.paliers.map((palier) => palier.label), ['1', '2', '3', '4', '5', '6', '7+']);
  assert.equal(vide.max, 0);
  assert.equal(vide.moyenne, 0);
  const deck = ['chien-du-guet', 'chien-du-guet', 'djinn-du-souk', 'desert', 'desert', 'inconnue-xyz'];
  const courbe = courbeDeMana(deck);
  assert.equal(courbe.nonTerrains, 3, 'terrains et cartes inconnues ne comptent pas');
  assert.equal(courbe.paliers.find((palier) => palier.cout === 2).nombre, 2);
  assert.equal(courbe.paliers.find((palier) => palier.cout === cardById('djinn-du-souk').cost).nombre, 1);
  assert.equal(courbe.max, 2);
  assert.equal(courbe.moyenne, Math.round(((2 + 2 + cardById('djinn-du-souk').cost) / 3) * 10) / 10);
  // Les coûts de 7 et plus se rejoignent au dernier palier.
  const grosCout = RPG_DUEL_CARDS.find((carte) => carte.kind !== 'terrain' && carte.cost >= 7);
  assert.ok(grosCout, 'le catalogue a au moins une carte à 7+');
  assert.equal(courbeDeMana([grosCout.id]).paliers.at(-1).nombre, 1);
});

test('repartitionCouleurs compte cartes, pips et terrains par couleur, par présence décroissante', () => {
  assert.deepEqual(repartitionCouleurs([]), []);
  const deck = ['chien-du-guet', 'chien-du-guet', 'porteuse-de-cruches', 'desert', 'mer', 'mer'];
  const repartition = repartitionCouleurs(deck);
  assert.deepEqual(repartition.map((entree) => entree.couleur), ['sable', 'eau'], 'le Sable d\'abord : deux cartes contre une');
  const sable = repartition.find((entree) => entree.couleur === 'sable');
  assert.equal(sable.cartes, 2);
  assert.equal(sable.pips, 2, 'une carte mono exige un pip de sa couleur');
  assert.equal(sable.terrains, 1);
  const eau = repartition.find((entree) => entree.couleur === 'eau');
  assert.equal(eau.terrains, 2, 'les terrains sont comptés dans la couleur qu\'ils produisent');
});

test('l’ancien complément en terrains ne modifie plus les cartes ni la collection', () => {
  const cartes = ['chien-du-guet', 'porteuse-de-cruches'];
  const resultat = completerEnTerrains(cartes, COLLECTION);
  assert.deepEqual(resultat.cardIds, cartes);
  assert.notEqual(resultat.cardIds, cartes);
  assert.equal(resultat.ajoutes, 0);
  assert.match(resultat.raison, /automatique/);
  assert.deepEqual(completerEnTerrains([], []).cardIds, []);
});

test('la migration maison retire uniquement les cartes hors format, sans fabriquer de cartes', () => {
  const ancien = { id: 'maison-ancien', nom: 'Ancien', majLe: '2026-01-15T10:00:00.000Z',
    cardIds: ['desert', 'boussole-du-hoggar', 'djinn-du-souk', 'chien-du-guet', 'chien-du-guet'] };
  const avant = structuredClone(ancien);
  const migre = normaliserDeckMaison(ancien);
  assert.deepEqual(ancien, avant);
  assert.deepEqual(migre.cardIds, ['chien-du-guet', 'chien-du-guet']);
  assert.equal(migre.majLe, ancien.majLe);
  assert.equal(deckMaisonEstSelectionnable(migre, COLLECTION), false, 'le brouillon doit être complété');
  assert.deepEqual(normaliserDeckMaison(migre), migre, 'migration idempotente');
  assert.equal(peutAjouterCarte('desert', [], COLLECTION).ok, false);
  assert.equal(peutAjouterCarte('boussole-du-hoggar', [], COLLECTION).ok, false);
  assert.equal(peutAjouterCarte('djinn-du-souk', [], null).ok, false);
  assert.equal(peutAjouterCarte('chien-du-guet', Array(30).fill('tislit-des-aures'), COLLECTION).ok, false);
});
