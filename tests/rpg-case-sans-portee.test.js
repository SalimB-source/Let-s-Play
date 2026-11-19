/** Une créature **sans case** ne frappe rien.
 *
 *  Sur les deux lignes, toute la géométrie part de `emplacement` : la portée
 *  d'une mêlée, la distance au sorcier adverse, le survol. Une créature sans
 *  case n'avait aucune position… et le moteur la laissait pourtant frapper
 *  **partout** (`filtrePortee` et `sorcierAPortee` rendaient toutes les cibles,
 *  `attaqueDirecteSurLesLignes` autorisait le sorcier). D'où des attaques à
 *  deux cases, et un sorcier touché depuis une rangée qui n'y touche pas.
 *
 *  Une invocation peut arriver sans case : la ligne arrière est pleine et le
 *  dernier envahisseur ne peut pas être poussé (`placerDansEmplacement` rend
 *  la main sans poser). La garde d'invocation refuse désormais ce cas
 *  (`rpgJouerCreature`), et la portée ferme la porte pour tout état hérité
 *  d'une partie sauvegardée ou d'une synchronisation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { sorcierAPortee } from '../src/games/rpgPortees.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'fennec-des-decombres';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['sable'], rng: () => .5, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true; d.tour = 'joueur'; d.phase = 'principale';
  const poser = (camp, id, index, campPose = null) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour; d.tour = camp;
    const r = rpgJouerCreature(d, camp, id, null);
    d.tour = avant;
    assert.ok(r.ok, `${id} entre en jeu : ${r.raison}`);
    Object.assign(r.entite, { ready: true, malInvocation: false, tribut: 0, avancee: true });
    if (index === null) delete r.entite.emplacement;
    else r.entite.emplacement = index;
    if (campPose) r.entite.campPose = campPose; else delete r.entite.campPose;
    return r.entite;
  };
  return { d, poser };
}

test('sans case : aucune créature adverse n’est à portée, même au contact', () => {
  const { d, poser } = table();
  const sansCase = poser('joueur', MELEE, null);
  poser('sorcier', MELEE, 2); // juste en face, à une case
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', sansCase.id).cibles, []);
});

test('sans case : le sorcier adverse n’est pas à portée, même champ adverse vide', () => {
  const { d, poser } = table();
  const sansCase = poser('joueur', MELEE, null);
  assert.equal(sorcierAPortee(d, 'joueur', sansCase), false);
  const choix = rpgCiblesIndividuellesClassique(d, 'joueur', sansCase.id);
  assert.equal(choix.directe, false, 'la frappe directe ne part pas d’une case inconnue');
  assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', sansCase.id, null).ok, false);
});

test('avec une case : les portées restent celles des lignes', () => {
  const { d, poser } = table();
  const front = poser('joueur', MELEE, 2, 'sorcier'); // front adverse, à deux cases du sorcier
  poser('sorcier', MELEE, 2); // une proie au contact
  assert.equal(sorcierAPortee(d, 'joueur', front), false, 'deux cases : hors de portée d’une mêlée');
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', front.id).cibles.length, 1, 'la proie au contact reste visable');

  const { d: autre, poser: poser2 } = table();
  const bout = poser2('joueur', MELEE, 7, 'sorcier'); // fond adverse, à une case du sorcier
  assert.equal(sorcierAPortee(autre, 'joueur', bout), true, 'sur le bout du plateau, la mêlée touche le sorcier');
});

test('hors des lignes, rien ne change : la lecture historique reste', () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['sable'], rng: () => .5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  assert.equal(sorcierAPortee(d, 'joueur', { carteId: MELEE, atk: 3, pv: 1 }), true,
    'un duel sans lignes garde la frappe directe historique');
});
