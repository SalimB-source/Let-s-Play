/** Le Sablier — le recul du bout du plateau.
 *
 *  Une créature qui frappe le sorcier depuis la dernière rangée ne s'y
 *  installe pas : elle recule d'une case, et la chaîne de créatures derrière
 *  elle recule aussi. La chaîne s'arrête au blocage (bord, Site). */
import test from 'node:test';
import assert from 'node:assert/strict';

import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgAttaquerSorcier, rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { positionDe } from '../src/games/rpgChamp.js';
import { rpgAuBoutDuPlateau, rpgReculerApresFrappe } from '../src/games/rpgRecul.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'viking-des-neiges';
const SITE = 'source-de-bimini';

function table({ lignes = true } = {}) {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes,
  });
  for (const camp of ['joueur', 'sorcier']) {
    d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    d[camp].pv = 40;
    d[camp].pvMax = 40;
  }
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id, options = {}) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id, null, options);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    resultat.entite.ready = true;
    resultat.entite.malInvocation = false;
    resultat.entite.bouge = false;
    return resultat.entite;
  };
  /** Pose une créature exactement sur une rangée/colonne absolues. */
  const surCase = (camp, id, rangee, colonne) => {
    const entite = poser(camp, id);
    // Rangées 0 et 3 = les fonds (cases 5-9) ; 1 et 2 = les fronts (cases 0-4).
    const fond = rangee === 0 || rangee === 3;
    entite.emplacement = fond ? 5 + colonne : colonne;
    const proprietaire = rangee <= 1 ? 'sorcier' : 'joueur';
    if (proprietaire === camp) delete entite.campPose;
    else entite.campPose = proprietaire;
    entite.avancee = true;
    return entite;
  };
  return { d, poser, surCase };
}

test('une créature qui frappe depuis le bout du plateau recule d’une case', () => {
  const { d, surCase } = table();
  const attaquant = surCase('joueur', MELEE, 0, 2);
  assert.ok(rpgAuBoutDuPlateau(d, 'joueur', attaquant), 'elle est sur le fond du sorcier');

  const res = rpgReculerApresFrappe(d, 'joueur', attaquant.id);
  assert.equal(res.ok, true, res.raison);
  assert.deepEqual(res.reculs.map((r) => [r.avant, r.apres]), [[7, 2]],
    'du fond du sorcier (case 7) à son front (case 2), même colonne');
  assert.deepEqual(positionDe(attaquant, 'joueur'), { camp: 'sorcier', index: 2, rangee: 1, colonne: 2 });
  assert.match(d.log.at(-1), /repoussée d’une case/);
});

test('une créature derrière elle recule aussi : la chaîne se déplie', () => {
  const { d, surCase } = table();
  const frappeuse = surCase('joueur', MELEE, 0, 1);
  const derriere = surCase('joueur', MELEE, 1, 1);
  const encore = surCase('joueur', MELEE, 2, 1);

  const res = rpgReculerApresFrappe(d, 'joueur', frappeuse.id);
  assert.equal(res.ok, true, res.raison);
  assert.equal(res.reculs.length, 3, 'les trois créatures de la colonne reculent');
  assert.equal(positionDe(frappeuse, 'joueur').rangee, 1);
  assert.equal(positionDe(derriere, 'joueur').rangee, 2);
  assert.equal(positionDe(encore, 'joueur').rangee, 3, 'la dernière prend le fond, resté libre');
  assert.match(d.log.at(-1), /reculent d’une case/);
});

test('la chaîne s’arrête au blocage : personne ne bouge si la place manque', () => {
  const { d, surCase } = table();
  // Colonne pleine jusqu'au fond du joueur : la quatrième case est le bord.
  const frappeuse = surCase('joueur', MELEE, 0, 3);
  const derriere = surCase('joueur', MELEE, 1, 3);
  const encore = surCase('joueur', MELEE, 2, 3);
  const fond = surCase('joueur', MELEE, 3, 3);

  const res = rpgReculerApresFrappe(d, 'joueur', frappeuse.id);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'bord');
  for (const [entite, rangee] of [[frappeuse, 0], [derriere, 1], [encore, 2], [fond, 3]]) {
    assert.equal(positionDe(entite, 'joueur').rangee, rangee, 'la colonne reste telle quelle');
  }
});

test('un Site bloque la chaîne', () => {
  const { d, surCase } = table();
  const frappeuse = surCase('joueur', MELEE, 0, 0);
  // Un Site occupe une case sans jamais marcher : il arrête la chaîne net.
  d.joueur.creatures.push({
    id: 'site-de-test', carteId: SITE, name: 'La Source de Bimini',
    atk: 0, pv: 1, def: 1, emplacement: 0, campPose: 'sorcier', ready: true, attaquee: false,
  });
  const res = rpgReculerApresFrappe(d, 'joueur', frappeuse.id);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'site');
  assert.equal(positionDe(frappeuse, 'joueur').rangee, 0, 'la frappeuse reste sur sa case');
});

test('hors du bout du plateau, personne ne recule', () => {
  const { d, surCase } = table();
  const tireur = surCase('joueur', MELEE, 1, 0);
  assert.equal(rpgAuBoutDuPlateau(d, 'joueur', tireur), false);
  assert.equal(rpgReculerApresFrappe(d, 'joueur', tireur.id).raison, 'pas-au-bout');
});

test('sans les lignes, la règle ne s’applique pas', () => {
  const { d, surCase } = table({ lignes: false });
  const entite = surCase('joueur', MELEE, 0, 0);
  assert.equal(rpgReculerApresFrappe(d, 'joueur', entite.id).raison, 'sans-lignes');
});

test('le sorcier recule aussi, symétriquement, depuis notre fond', () => {
  const { d, surCase } = table();
  const envahisseur = surCase('sorcier', MELEE, 3, 4);
  assert.ok(rpgAuBoutDuPlateau(d, 'sorcier', envahisseur), 'il est sur notre fond');
  const res = rpgReculerApresFrappe(d, 'sorcier', envahisseur.id);
  assert.equal(res.ok, true, res.raison);
  assert.equal(positionDe(envahisseur, 'sorcier').rangee, 2, 'il recule vers son camp');
});

test('une frappe réelle au bout du plateau repousse l’attaquant', () => {
  const { d, surCase } = table();
  const attaquant = surCase('joueur', MELEE, 0, 2);
  const pvAvant = d.sorcier.pv;
  const res = rpgAttaquerSorcier(d, 'joueur', attaquant.id);
  assert.ok(res.ok, res.raison);
  assert.ok(d.sorcier.pv < pvAvant, 'le sorcier encaisse');
  assert.equal(positionDe(attaquant, 'joueur').rangee, 1, 'et l’attaquant a reculé');
});

test('une frappe depuis le front ne déplace personne', () => {
  const { d, surCase } = table();
  // Portée 1 : depuis notre front (rangée 2), le sorcier n'est pas atteignable.
  const attaquant = surCase('joueur', MELEE, 2, 0);
  const res = rpgAttaquerSorcier(d, 'joueur', attaquant.id);
  assert.equal(res.ok, false, 'la distance interdit la frappe directe');
  assert.equal(positionDe(attaquant, 'joueur').rangee, 2);
});
