/** L'IA attaque **en meute** : plusieurs petites créatures qui meurent en
 * entamant une proie ne sacrifient rien si le camp l'abat ce tour-ci.
 *
 * Sans ce plan, chaque échange est jugé isolément : la première petite
 * créature meurt sans tuer (`min(atk, pv) − perte < 0`) et l'IA n'attaque
 * jamais, si bien qu'une créature un peu plus grosse reste intacte face à
 * plusieurs petites qui, ensemble, la coucheraient.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA, rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

// 1/1 à une braise : le corps le moins cher, il meurt à la riposte.
const PETITE = 'novice-des-cendres';
// 1/3 : elle survit à une petite (1 dégât), pas à trois.
const PROIE = 'sentinelle-du-brasier';

/** Le champ du sorcier : trois petites au front, face à la proie du joueur. */
function meute() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['sable'], rng: () => .5, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.tour = 'sorcier';
  const poser = (camp, id, index) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const r = rpgJouerCreature(d, camp, id, null);
    d.tour = avant;
    assert.ok(r.ok, `${id} entre en jeu : ${r.raison}`);
    // Labo : la créature est posée là où la mesure a besoin d'elle.
    Object.assign(r.entite, {
      ready: true, malInvocation: false, tenaciteDisponible: false, tribut: 0,
      emplacement: index, avancee: true,
    });
    delete r.entite.campPose;
    return r.entite;
  };
  // Nos trois mêlées au front (rangée 1), la proie en face (rangée 2).
  const petites = [poser('sorcier', PETITE, 0), poser('sorcier', PETITE, 1), poser('sorcier', PETITE, 2)];
  // Colonne 1 : les trois cases du front adverse lui sont adjacentes.
  const proie = poser('joueur', PROIE, 1);
  return { d, petites, proie };
}

test('la meute : trois petites abattent ensemble une proie qu’aucune ne tue seule', () => {
  const { d, petites, proie } = meute();
  // Géométrie : chaque petite est au contact de la proie.
  for (const petite of petites) {
    assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'sorcier', petite.id).cibles, [proie.id]);
    assert.ok(petite.atk < proie.pv, 'seule, elle ne la tue pas');
    assert.ok(proie.atk >= petite.pv, 'et la riposte l’emporte');
  }
  const somme = petites.reduce((total, petite) => total + petite.atk, 0);
  assert.ok(somme >= proie.pv, 'ensemble, elles la couchent');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(d, 'sorcier');
  assert.ok(choix, 'l’IA ne renonce pas : elle engage la première petite');
  assert.equal(choix.cibleId, proie.id, 'elle vise la proie');
  assert.ok(petites.some((petite) => petite.id === choix.attaquantId));
});

test('sans meute, l’IA ne jette pas une créature sur une proie qui survit', () => {
  const { d, petites, proie } = meute();
  d.sorcier.creatures = [petites[0]];
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(d, 'sorcier'), null,
    `${petites[0].atk} dégâts sur ${proie.pv} PV : l’échange serait une perte sèche`);
});

test('la meute ne compte pas les créatures hors de portée', () => {
  const { d, petites } = meute();
  // Les deux autres restent au fond, à deux cases : la force retombe à 1.
  petites[1].emplacement = 7;
  petites[2].emplacement = 8;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'sorcier', petites[1].id).cibles, []);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(d, 'sorcier'), null);
});
