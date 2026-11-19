/**
 * Nouvelle règle : **un Défenseur ne se déplace pas.**
 *
 * Sa raison d'être est de tenir une case — offrir la trouée qu'il est censé
 * fermer, c'est perdre son office. La règle vaut des deux côtés, pour le
 * Défenseur imprimé comme pour celui qu'une capacité accorde en cours de
 * partie, et elle ne retire rien à sa frappe : il attaque de là où il est.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgPeutAttaquer } from '../src/games/rpgDuel.js';
import { deplacementsLegaux, rpgPeutBouger, rpgDeplacerCreature, creaturesMouvantes } from '../src/games/rpgMouvement.js';
import { rpgIABougerUneCreature } from '../src/games/rpgMouvementIA.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';

const DEFENSEUR = 'gardien-de-la-porte-ardente';
const MELEE = 'viking-des-neiges';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => 0.9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    // Tour suivant simulé : le mal d'invocation est levé, seule la règle
    // Défenseur peut encore retenir la créature.
    resultat.entite.malInvocation = false;
    resultat.entite.bouge = false;
    return resultat.entite;
  };
  return { d, poser };
}

test('un Défenseur ne bouge pas, même une fois son mal d’invocation levé', () => {
  const { d, poser } = table();
  const defenseur = poser('joueur', DEFENSEUR);
  assert.equal(estDefenseur(defenseur), true);
  assert.equal(rpgPeutBouger(d, 'joueur', defenseur), false, 'le Défenseur tient sa case');
  assert.deepEqual(deplacementsLegaux(d, 'joueur', defenseur.id), [], 'aucune case proposée');
  const resultat = rpgDeplacerCreature(d, 'joueur', defenseur.id, { camp: 'joueur', index: 1 });
  assert.equal(resultat.ok, false);
  assert.equal(resultat.raison, 'pas-disponible');
  assert.ok(!creaturesMouvantes(d, 'joueur').includes(defenseur), 'il n’est pas dans la liste des créatures qui avancent');
});

test('la même table sans Défenseur laisse la créature avancer', () => {
  const { d, poser } = table();
  const simple = poser('joueur', MELEE);
  assert.equal(estDefenseur(simple), false);
  assert.equal(rpgPeutBouger(d, 'joueur', simple), true);
  assert.ok(deplacementsLegaux(d, 'joueur', simple.id).length > 0);
});

test('le Défenseur frappe quand même : la règle ne touche que le pas', () => {
  const { d, poser } = table();
  const defenseur = poser('joueur', DEFENSEUR);
  assert.equal(rpgPeutAttaquer(defenseur), true, 'il attaque de sa case');
});

test('l’IA ne fait pas avancer un Défenseur qu’elle vient de poser', () => {
  const { d, poser } = table();
  const defenseur = poser('sorcier', DEFENSEUR);
  assert.equal(rpgPeutBouger(d, 'sorcier', defenseur), false);
  assert.equal(rpgIABougerUneCreature(d, 'sorcier'), null);
});

test('un Défenseur accordé en cours de partie s’immobilise aussitôt', () => {
  const { d, poser } = table();
  const simple = poser('joueur', MELEE);
  assert.equal(rpgPeutBouger(d, 'joueur', simple), true, 'elle avançait avant l’effet');
  simple.defenseurAccorde = true;
  assert.equal(estDefenseur(simple), true);
  assert.equal(rpgPeutBouger(d, 'joueur', simple), false, 'elle devient un mur');
  assert.deepEqual(deplacementsLegaux(d, 'joueur', simple.id), []);
});
