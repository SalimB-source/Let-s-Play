/**
 * Le cycle des cinq Cavaliers — les montures qui manquaient au Sablier.
 * -------------------------------------------------------------------
 * « Le cavalier sans nom » (Eau + Ténèbres, doc 26) ouvrait la série ; ces
 * cinq-ci la complètent. Chacun parle la langue de **ses deux** couleurs
 * (docs/rpg/05-concept-cartes.md §11) et trois d'entre eux ouvrent des
 * binômes que le catalogue ne connaissait pas encore : Braise + Eau,
 * Eau + Neige, Sable + Neige.
 *
 * Le cycle est vérifié sur trois plans, comme la fiche qui l'a ouvert :
 *   1. l'identité imprimée (coûts, cadre hybride, peinture livrée) ;
 *   2. la collection (hors dotation, étage de révélation, étal, booster) ;
 *   3. le comportement **réel** dans le moteur — c'est le point qui compte :
 *      aucun de ces effets n'ajoute de mécanique, ils réutilisent des hooks
 *      déjà éprouvés ailleurs au catalogue.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, openSync, readSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  cardById, cardColors, cardFrameInfo, cardCopyLimit, cardHasShinyFrame,
  RPG_CREATURE_CARDS, RPG_DUEL_CARDS,
} from '../src/games/rpgCards.js';
import { cardArt, CARD_ART_LARGEUR, CARD_ART_HAUTEUR } from '../src/games/rpgCardArt.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';
import { prixCarteDirecte } from '../src/games/rpgSoukDirect.js';
import { carteAuVivier } from '../src/games/rpgBoosters.js';
import { pastillesPourCarte, effetsDetailles } from '../src/games/effetIcons.js';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgFinDeTour,
  rpgBlesserCreature, rpgPeutAttaquer, RPG_PV_JOUEUR,
} from '../src/games/rpgDuel.js';

const SANS_NOM = 'le-cavalier-sans-nom';
const VAPEUR = 'le-cavalier-de-vapeur';
const RESSAC = 'le-cavalier-du-ressac-gele';
const DUNES = 'le-cavalier-des-dunes-gelees';
const CIMETIERE = 'le-cavalier-du-cimetiere';
const BUCHER = 'le-cavalier-du-bucher';

/** Les fiches du cycle, dans l'ordre attendu : binôme, palier, étage, prix. */
const CYCLE = [
  { id: VAPEUR, couleurs: ['braise', 'eau'], palier: [4, 3, 3], rarete: 'rare', etage: 'souk-4', prix: 150 },
  { id: RESSAC, couleurs: ['eau', 'neige'], palier: [6, 4, 6], rarete: 'mythique', etage: 'abysses-4', prix: 300 },
  { id: DUNES, couleurs: ['sable', 'neige'], palier: [4, 2, 4], rarete: 'rare', etage: 'fjord-2', prix: 150 },
  { id: CIMETIERE, couleurs: ['sable', 'tenebres'], palier: [5, 4, 4], rarete: 'rare', etage: 'necropole-3', prix: 150 },
  { id: BUCHER, couleurs: ['braise', 'tenebres'], palier: [5, 4, 3], rarete: 'rare', etage: 'necropole-3', prix: 150 },
];

/** Les trois binômes que le cycle ouvre, et qu'aucune autre carte n'occupe. */
const PAIRES_NEUVES = [['braise', 'eau'], ['eau', 'neige'], ['neige', 'sable']];

const PLEIN = { eau: 50, sable: 50, braise: 50, neige: 50, tenebres: 50 };

/** Un duel aux réserves pleines ; `rng` figé pour un combat reproductible. */
function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) {
    d[camp].mana = { ...PLEIN };
    d[camp].deck = ['chien-du-guet', 'chien-du-guet', 'chien-du-guet'];
  }
  d.tour = 'joueur';
  return d;
}

function plein(d) {
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = { ...PLEIN };
}

function poser(d, camp, id, cibleId = null) {
  plein(d);
  d[camp].main.push(id);
  const resultat = rpgJouerCreature(d, camp, id, cibleId);
  assert.equal(resultat.ok, true, `${id} se joue (${resultat.raison ?? 'ok'})`);
  return resultat.entite;
}

/** Un changement de tour, réserves regarnies : on teste l'effet, pas le mana. */
function tourSuivant(d) {
  rpgFinDeTour(d);
  plein(d);
}

/** Largeur/hauteur d'un JPEG lues dans son en-tête SOF (lecteur du dépôt). */
function dimensionsJpeg(chemin) {
  const descripteur = openSync(chemin, 'r');
  try {
    const entete = Buffer.alloc(64 * 1024);
    const lus = readSync(descripteur, entete, 0, entete.length, 0);
    for (let i = 2; i + 9 < lus;) {
      if (entete[i] !== 0xff) { i += 1; continue; }
      const balise = entete[i + 1];
      const estSof = balise >= 0xc0 && balise <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(balise);
      if (estSof) return [entete.readUInt16BE(i + 7), entete.readUInt16BE(i + 5)];
      i += 2 + entete.readUInt16BE(i + 2);
    }
  } finally {
    closeSync(descripteur);
  }
  throw new Error(`${chemin} : en-tête SOF introuvable`);
}

// ---------------------------------------------------------------------------
// 1. Le cycle comme ensemble
// ---------------------------------------------------------------------------

test('le cycle compte cinq Cavaliers hybrides, tous de type Cavalier', () => {
  assert.equal(CYCLE.length, 5);
  for (const { id } of CYCLE) {
    const c = cardById(id);
    assert.ok(c, `${id} existe au catalogue`);
    assert.equal(c.kind ?? 'creature', 'creature');
    assert.match(c.typeLine, /Cavalier/u, `${id} est bien un Cavalier`);
    assert.equal(cardColors(c).length, 2, `${id} est hybride`);
    assert.equal(RPG_DUEL_CARDS.filter((carte) => carte.id === id).length, 1, 'un seul exemplaire au catalogue');
  }
});

test('les cinq forment un pentagone fermé : chaque couleur y monte exactement deux fois', () => {
  // Braise → Eau → Neige → Sable → Ténèbres → Braise. Cinq montures, cinq
  // arêtes, cinq sommets de degré 2 : le cycle se referme sur lui-même.
  const comptes = { braise: 0, eau: 0, sable: 0, neige: 0, tenebres: 0 };
  for (const { id } of CYCLE) {
    for (const couleur of cardColors(cardById(id))) comptes[couleur] += 1;
  }
  assert.deepEqual(comptes, { braise: 2, eau: 2, sable: 2, neige: 2, tenebres: 2 },
    'aucune couleur n’est privilégiée par le cycle');
  const aretes = new Set(CYCLE.map(({ id }) => [...cardColors(cardById(id))].sort().join('+')));
  assert.equal(aretes.size, 5, 'cinq binômes distincts : le cycle ne repasse pas deux fois au même endroit');
});

test('Le cavalier sans nom est la corde du cycle : il rallie Eau et Ténèbres une troisième fois', () => {
  // Il n’appartient pas au pentagone — il lui tend une diagonale. Eau et
  // Ténèbres, ses deux couleurs, sont donc les seules à monter trois fois.
  const comptes = { braise: 0, eau: 0, sable: 0, neige: 0, tenebres: 0 };
  for (const id of [SANS_NOM, ...CYCLE.map((c) => c.id)]) {
    for (const couleur of cardColors(cardById(id))) comptes[couleur] += 1;
  }
  assert.deepEqual(comptes, { braise: 2, eau: 3, sable: 2, neige: 2, tenebres: 3 });
  const paires = new Set([SANS_NOM, ...CYCLE.map((c) => c.id)]
    .map((id) => [...cardColors(cardById(id))].sort().join('+')));
  assert.equal(paires.size, 6, 'six binômes sur les dix possibles');
  assert.ok(paires.has('eau+tenebres'), 'la corde du sans-nom');
});

test('le cycle ouvre trois binômes absents du reste du catalogue', () => {
  const idsCycle = new Set([SANS_NOM, ...CYCLE.map((c) => c.id)]);
  const cle = (couleurs) => [...couleurs].sort().join('+');
  for (const paire of PAIRES_NEUVES) {
    const porteuses = RPG_CREATURE_CARDS.filter((c) => cle(cardColors(c)) === cle(paire));
    assert.ok(porteuses.length >= 1, `${paire.join(' + ')} est désormais représenté`);
    assert.ok(porteuses.every((c) => idsCycle.has(c.id)),
      `${paire.join(' + ')} n'appartient qu'au cycle : c'est bien une ouverture`);
  }
});

// ---------------------------------------------------------------------------
// 2. Identité imprimée, cadre, peinture, collection, aperçu
// ---------------------------------------------------------------------------

for (const { id, couleurs, palier, rarete, etage, prix } of CYCLE) {
  test(`${id} : palier, cadre hybride et coût coloré conformes`, () => {
    const c = cardById(id);
    assert.deepEqual([c.cost, c.atk, c.def], palier);
    assert.equal(c.rarity, rarete);
    assert.deepEqual(cardColors(c), couleurs);
    assert.deepEqual(c.colorCost, { [couleurs[0]]: 1, [couleurs[1]]: 1 },
      'une exigence de chaque couleur : la monture se paie dans les deux');
    assert.equal(cardFrameInfo(c).key, `hybride-${couleurs[0]}-${couleurs[1]}`);
    assert.equal(cardHasShinyFrame(c), false, 'une hybride ne brille pas');
    assert.equal(cardCopyLimit(c), rarete === 'mythique' ? 1 : 2);
    assert.ok(c.text && c.flavor, 'texte de règle et citation sont écrits');
  });

  test(`${id} : peinture livrée en 768 × 960, sous le plafond`, () => {
    assert.equal(cardArt(cardById(id)), `/cards/${id}.jpg`);
    const chemin = fileURLToPath(new URL(`../public/cards/${id}.jpg`, import.meta.url));
    assert.ok(existsSync(chemin), `${id}.jpg est livré`);
    assert.deepEqual(dimensionsJpeg(chemin), [CARD_ART_LARGEUR, CARD_ART_HAUTEUR]);
    assert.ok(readFileSync(chemin).length < 260 * 1024, 'sous les 260 Ko');
  });

  test(`${id} : hors dotation, révélé à l'étage, vendu à l'étal, ouvrable en booster`, () => {
    assert.equal(COLLECTION_DEPART.includes(id), false, 'le cycle ne se donne pas d’entrée');
    assert.equal(carteReveleePar(id)?.etageId, etage);
    assert.equal(prixCarteDirecte(id), prix);
    assert.equal(carteAuVivier(id), true);
  });

  test(`${id} : l'aperçu ne perd aucun mot du texte de règle`, () => {
    const c = cardById(id);
    const mots = (t) => new Set(String(t).toLowerCase().match(/[a-z0-9à-ÿ]+/gu) ?? []);
    const { pastilles, texte } = effetsDetailles(c);
    const affiches = mots([
      texte,
      ...pastilles.map((p) => (p.valeur != null ? `${p.label} ${p.valeur}` : p.label)),
      ...pastilles.map((p) => p.description),
    ].filter(Boolean).join(' '));
    for (const mot of mots(c.text)) {
      assert.ok(affiches.has(mot), `« ${mot} » reste lisible dans l'aperçu`);
    }
  });
}

test('les pastilles du cycle nomment ses mots-clés, sans nouveau symbole', () => {
  const labels = (id) => pastillesPourCarte(cardById(id))
    .map((p) => (p.valeur != null ? `${p.label} ${p.valeur}` : p.label));
  assert.deepEqual(labels(RESSAC), ['Défenseur']);
  assert.deepEqual(labels(DUNES), ['Heures']);
  assert.deepEqual(labels(CIMETIERE), ['Tribut 2']);
  assert.deepEqual(labels(BUCHER), ['Rapidité']);
  // La Vapeur n'a pas de mot-clé : son Rebond ne part qu'au blocage, et le
  // sprite ne compte pas de pastille pour ce déclenchement (la Tour des
  // Flots est logée à la même enseigne). Le texte de règle le dit en clair.
  assert.deepEqual(labels(VAPEUR), []);
  assert.match(effetsDetailles(cardById(VAPEUR)).texte, /Quand il bloque/u);
});

// ---------------------------------------------------------------------------
// 3. Comportements réels
// ---------------------------------------------------------------------------

test('Vapeur : la Braise cuit à l’arrivée — 2 dégâts à une créature désignée', () => {
  const d = duel();
  const cible = poser(d, 'sorcier', 'dune-marchante'); // 2/4
  const intacte = poser(d, 'sorcier', 'chien-du-guet');
  const cavalier = poser(d, 'joueur', VAPEUR, cible.id);
  assert.ok(d.joueur.creatures.includes(cavalier));
  assert.equal(cible.pv, 2, '4 PV − 2 dégâts');
  assert.equal(intacte.pv, 2, 'l’autre créature adverse est épargnée : la frappe est ciblée');
  assert.equal(d.sorcier.creatures.length, 2, 'la vapeur blesse, elle n’exile pas');
});

test('Vapeur : l’Eau rend à la main ce qui vient le bloquer, après les blessures', () => {
  const d = duel();
  const bloqueur = poser(d, 'joueur', VAPEUR);
  tourSuivant(d);
  tourSuivant(d);
  const attaquante = poser(d, 'sorcier', 'dune-marchante'); // 2 ATK / 4 PV
  attaquante.ready = true;
  bloqueur.ready = true;
  d.tour = 'sorcier';
  const combat = rpgLancerAttaque(d, 'sorcier', [attaquante.id], { [attaquante.id]: [bloqueur.id] });
  assert.equal(combat.ok, true);
  assert.equal(bloqueur.pv, 1, 'les blessures ont bien été échangées d’abord : 3 − 2');
  assert.equal(d.joueur.creatures.includes(bloqueur), true, 'le bloqueur survit à l’échange');
  assert.equal(d.sorcier.creatures.includes(attaquante), false, 'l’attaquante quitte la table');
  assert.equal(d.sorcier.main.includes('dune-marchante'), true, 'elle repart dans la main de son propriétaire');
  assert.equal(d.sorcier.cimetiere.includes('dune-marchante'), false, 'ce n’est pas une destruction');
  assert.ok(d.log.some((ligne) => /renvoie Dune marchante dans la main/u.test(ligne)));
});

test('Vapeur : le Rebond est réservé au blocage — il ne part pas en attaque', () => {
  const d = duel();
  const cavalier = poser(d, 'joueur', VAPEUR);
  const garde = poser(d, 'sorcier', 'dune-marchante');
  tourSuivant(d);
  tourSuivant(d);
  cavalier.ready = true;
  garde.ready = true;
  const combat = rpgLancerAttaque(d, 'joueur', [cavalier.id], { [cavalier.id]: [garde.id] });
  assert.equal(combat.ok, true);
  assert.equal(d.sorcier.main.includes('dune-marchante'), false,
    'attaquer ne renvoie rien : `quand: blocage` tient la capacité en défense');
  assert.equal(cardById(VAPEUR).combat.quand, 'blocage');
});

test('Ressac gelé : Défenseur, et toute la table adverse est prise par les glaces', () => {
  const d = duel();
  const chien = poser(d, 'sorcier', 'chien-du-guet');
  const dune = poser(d, 'sorcier', 'dune-marchante');
  const cavalier = poser(d, 'joueur', RESSAC);
  assert.equal(cavalier.defenseur, true, 'Défenseur est porté par l’entité en jeu');
  cavalier.ready = true;
  assert.equal(rpgPeutAttaquer(cavalier), true, 'Défenseur ne l’empêche pas d’attaquer une fois prêt');
  assert.equal(chien.gelToursRestants > 0, true);
  assert.equal(dune.gelToursRestants > 0, true);
  chien.ready = true;
  dune.ready = true;
  assert.equal(rpgPeutAttaquer(chien), false, 'même prête, gelée elle n’attaque pas');
  assert.equal(rpgPeutAttaquer(dune), false);
  assert.equal(cavalier.gelToursRestants ?? 0, 0, 'la monture ne se gèle pas elle-même');
  tourSuivant(d); // tour du sorcier : le gel court jusqu’à la fin de celui-ci
  tourSuivant(d);
  assert.equal(rpgPeutAttaquer(chien), true, 'la glace a fondu à la fin de leur tour');
  assert.equal(rpgPeutAttaquer(dune), true);
});

test('Dunes gelées : deux Heures, puis +1/+1 permanent à toute la rangée, lui compris', () => {
  const d = duel();
  const allie = poser(d, 'joueur', 'chien-du-guet'); // 2/2
  const cavalier = poser(d, 'joueur', DUNES);        // 2/4
  assert.equal(cavalier.heures?.restants, 2, 'le compte à rebours est posé à l’arrivée');
  assert.deepEqual([allie.atk, allie.def], [2, 2], 'rien n’est gagné avant la sonnerie');

  tourSuivant(d); tourSuivant(d); // un tour du joueur
  assert.equal(cavalier.heures?.restants, 1, 'une Heure tombe par tour du contrôleur');
  assert.deepEqual([allie.atk, allie.def], [2, 2], 'pas encore');

  tourSuivant(d); tourSuivant(d); // la sonnerie
  assert.equal(cavalier.heures ?? null, null, 'les Heures sont purgées');
  assert.deepEqual([allie.atk, allie.def], [3, 3], 'l’allié gagne +1/+1');
  assert.deepEqual([cavalier.atk, cavalier.def], [3, 5], 'la monture se sert elle-même : inclutSource');
  assert.ok(d.log.some((ligne) => /a fini de compter/u.test(ligne)));

  tourSuivant(d); tourSuivant(d);
  assert.deepEqual([allie.atk, allie.def], [3, 3], 'le buff est permanent, il ne se rejoue pas');
  assert.deepEqual([cavalier.atk, cavalier.def], [3, 5]);
});

test('Cimetière : Tribut 2 sur le sorcier, et un retour programmé à sa mort', () => {
  const d = duel();
  const cavalier = poser(d, 'joueur', CIMETIERE);
  assert.equal(cavalier.tribut, 2);
  cavalier.ready = true;
  cavalier.attaquee = false;
  const avant = { joueur: d.joueur.pv, sorcier: d.sorcier.pv };
  const attaque = rpgLancerAttaque(d, 'joueur', [cavalier.id], { [cavalier.id]: [] });
  assert.equal(attaque.ok, true);
  assert.equal(d.sorcier.pv, avant.sorcier - 4 - 2, '4 d’attaque + 2 de Tribut');
  assert.equal(d.joueur.pv, avant.joueur + 2, 'le Tribut rend ses 2 PV');
});

test('Cimetière : le tuer n’achète que trois tours — il revient, pas avant', () => {
  const d = duel();
  const cavalier = poser(d, 'joueur', CIMETIERE);
  rpgBlesserCreature(d, 'joueur', cavalier.id, 99, 'braise');
  assert.equal(d.joueur.creatures.length, 0, 'il est bien mort');
  assert.deepEqual(d.joueur.cimetiere, [CIMETIERE], 'il attend au cimetière, il n’est pas exilé');
  assert.deepEqual(d.joueur.retoursProgrammes, [{ carteId: CIMETIERE, toursRestants: 3 }],
    'sa mort programme SON retour : pas de réanimation en boucle sur lui-même');

  for (let tour = 1; tour <= 2; tour += 1) {
    tourSuivant(d);
    assert.equal(d.joueur.creatures.some((e) => e.carteId === CIMETIERE), false,
      `tour ${tour} : la fosse le garde encore`);
    assert.equal(d.joueur.retoursProgrammes[0].toursRestants, 3 - tour);
  }
  tourSuivant(d);
  const revenu = d.joueur.creatures.find((e) => e.carteId === CIMETIERE);
  assert.ok(revenu, 'au troisième tour, il est de retour en selle');
  assert.deepEqual([revenu.atk, revenu.def, revenu.pv], [4, 4, 4], 'il revient entier, pas diminué');
  assert.equal(revenu.tribut, 2, 'et il facture toujours son Tribut');
  assert.deepEqual(d.joueur.cimetiere, [], 'le cimetière s’est vidé de lui');
  assert.deepEqual(d.joueur.retoursProgrammes, [], 'le retour est consommé');
});

test('Cimetière : en mode essai, un champ plein retarde le retour', () => {
  const d = duel();
  const cavalier = poser(d, 'joueur', CIMETIERE);
  rpgBlesserCreature(d, 'joueur', cavalier.id, 99, 'braise');
  const occupants = Array.from({ length: 5 }, () => poser(d, 'joueur', 'chien-du-guet'));
  // Activer la limite à cinq cases après avoir préparé le plateau.
  d.modeMana = 'essai';
  for (const camp of ['joueur', 'sorcier']) d[camp].manaMax = { ...PLEIN };
  tourSuivant(d); tourSuivant(d); tourSuivant(d);
  assert.equal(d.joueur.creatures.some((e) => e.carteId === CIMETIERE), false);
  assert.equal(d.joueur.retoursProgrammes[0].toursRestants, 1);
  assert.ok(d.joueur.cimetiere.includes(CIMETIERE));
  rpgBlesserCreature(d, 'joueur', occupants[0].id, 99, 'braise');
  tourSuivant(d);
  assert.equal(d.joueur.creatures.some((e) => e.carteId === CIMETIERE), true);
  assert.deepEqual(d.joueur.retoursProgrammes, []);
});

test('Cimetière : si la carte a quitté le cimetière, aucun doublon ne revient', () => {
  const d = duel();
  const cavalier = poser(d, 'joueur', CIMETIERE);
  rpgBlesserCreature(d, 'joueur', cavalier.id, 99, 'braise');
  d.joueur.cimetiere.splice(d.joueur.cimetiere.indexOf(CIMETIERE), 1);
  tourSuivant(d); tourSuivant(d); tourSuivant(d);
  assert.equal(d.joueur.creatures.some((e) => e.carteId === CIMETIERE), false);
  assert.deepEqual(d.joueur.retoursProgrammes, []);
});

test('Bûcher : Rapidité le fait charger dès l’arrivée', () => {
  const d = duel();
  const cavalier = poser(d, 'joueur', BUCHER);
  assert.equal(cavalier.rapidite, true);
  assert.equal(rpgPeutAttaquer(cavalier), true, 'pas de mal d’invocation');
  const avant = d.sorcier.pv;
  const attaque = rpgLancerAttaque(d, 'joueur', [cavalier.id], { [cavalier.id]: [] });
  assert.equal(attaque.ok, true);
  assert.equal(d.sorcier.pv, avant - 4, 'la charge porte ses 4 dégâts le tour même');
});

test('Bûcher : sa mort embrase la table adverse, et elle seule', () => {
  const d = duel();
  const chien = poser(d, 'sorcier', 'chien-du-guet');   // 2 PV : la flambée le tue
  const dune = poser(d, 'sorcier', 'dune-marchante');   // 4 PV : elle survit, brûlée
  const cavalier = poser(d, 'joueur', BUCHER);
  const allie = poser(d, 'joueur', 'chien-du-guet');
  rpgBlesserCreature(d, 'joueur', cavalier.id, 99, 'braise');
  assert.equal(d.joueur.creatures.includes(cavalier), false, 'le bûcher s’est consumé');
  assert.equal(d.sorcier.creatures.includes(chien), false, 'le Chien n’a pas survécu aux 2 dégâts');
  assert.equal(dune.pv, 2, 'la Dune encaisse 4 − 2');
  assert.equal(allie.pv, 2, 'les Ténèbres paient le prix, mais l’allié n’est pas dans le brasier');
  assert.equal(d.joueur.pv, RPG_PV_JOUEUR, 'la flambée ne touche aucun sorcier');
  assert.equal(d.sorcier.pv, RPG_PV_JOUEUR);
});
