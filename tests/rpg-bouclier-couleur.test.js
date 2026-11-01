import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgLancerMagie, rpgBlesserCreature, rpgEstProtegee, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';

function scene(couleurs = ['eau', 'neige']) {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((c) => [c, 30]));
  duel.sorcier.main.push('dune-marchante');
  const cible = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  cible.protection = { contre: couleurs, toursRestants: Infinity };
  return { duel, cible };
}
function lancer(duel, cote, carte, cible) {
  duel[cote].main.push(carte);
  duel.tour = cote;
  return rpgLancerMagie(duel, cote, carte, cible);
}

test('un sort de l’une des deux couleurs paie et brise tout le bouclier', () => {
  const { duel, cible } = scene();
  const pv = cible.pv;
  const resultat = lancer(duel, 'joueur', 'poigne-de-givre', cible.id);
  assert.equal(resultat.ok, true);
  assert.equal(resultat.bouclierBloque, true);
  assert.equal(cible.pv, pv);
  assert.equal(cible.protection, null);
  assert.ok(duel.joueur.cimetiere.includes('poigne-de-givre'));
  assert.equal(lancer(duel, 'joueur', 'poigne-de-givre', cible.id).ok, true);
  assert.ok(cible.pv < pv);
});

test('les autres couleurs, attaques et capacités passent sans briser', () => {
  const { duel, cible } = scene();
  assert.equal(rpgEstProtegee(cible, 'neige'), false);
  const pv = cible.pv;
  assert.equal(lancer(duel, 'joueur', 'trait-de-braise', cible.id).ok, true);
  assert.ok(cible.pv < pv);
  assert.ok(cible.protection);
  const apres = cible.pv;
  assert.equal(rpgBlesserCreature(duel, 'sorcier', cible.id, 1, 'neige', null, 'capacite').ok, true);
  assert.equal(cible.pv, apres - 1);
  assert.ok(cible.protection);
});

test('un sort de zone épargne la porteuse et frappe les autres', () => {
  const { duel, cible } = scene();
  duel.sorcier.main.push('dune-marchante');
  const autre = rpgJouerCreature(duel, 'sorcier', 'dune-marchante').entite;
  const avant = cible.pv, avantAutre = autre.pv;
  assert.equal(lancer(duel, 'joueur', 'brume-du-fjord').ok, true);
  assert.equal(cible.pv, avant);
  assert.ok(autre.pv < avantAutre);
  assert.equal(cible.protection, null);
});

test('le bouclier dure au-delà du tour et les sorts alliés passent', () => {
  const { duel, cible } = scene(['neige']);
  rpgFinDeTour(duel);
  assert.ok(cible.protection);
  cible.pv -= 1;
  const pv = cible.pv;
  duel.sorcier.mana = Object.fromEntries(RPG_ELEMENTS.map((c) => [c, 30]));
  const res = lancer(duel, 'sorcier', 'festin-des-vaillants');
  assert.equal(res.ok, true);
  assert.ok(cible.pv > pv);
  assert.ok(cible.protection);
});

test('chaque couleur du bouclier double peut le briser', () => {
  for (const sort of ['poigne-de-givre', 'brisure-de-verre']) {
    const { duel, cible } = scene();
    const pv = cible.pv;
    assert.equal(lancer(duel, 'joueur', sort, cible.id).ok, true, sort);
    assert.equal(cible.pv, pv);
    assert.equal(cible.protection, null);
  }
});

test('le bouclier général est consommé avant le bouclier coloré', () => {
  const { duel, cible } = scene(['neige']);
  cible.bouclier = 1;
  assert.equal(lancer(duel, 'joueur', 'poigne-de-givre', cible.id).bouclierBloque, true);
  assert.equal(cible.bouclier, 0);
  assert.ok(cible.protection);
  assert.equal(lancer(duel, 'joueur', 'poigne-de-givre', cible.id).bouclierBloque, true);
  assert.equal(cible.protection, null);
});

test('un sort allié ciblé de même couleur traverse le bouclier', () => {
  const { duel, cible } = scene(['eau']);
  const res = lancer(duel, 'sorcier', 'parade-du-verre', cible.id);
  assert.equal(res.ok, true);
  assert.equal(cible.bouclier, 1);
  assert.ok(cible.protection);
});

test('un bouclier subsiste après sérialisation et intercepte un sort', () => {
  const { duel, cible } = scene(['neige']);
  const copie = JSON.parse(JSON.stringify(duel));
  const cibleCopie = copie.sorcier.creatures.find((e) => e.id === cible.id);
  assert.equal(lancer(copie, 'joueur', 'poigne-de-givre', cible.id).bouclierBloque, true);
  assert.equal(cibleCopie.protection, null);
});


test('la Jitte prête un bouclier Ténèbres consommable, sans réarmement au changement d’arme', () => {
  const { duel, cible } = scene(['eau']);
  duel.tour = 'sorcier';
  duel.sorcier.main.push('jitte-d-amayas');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'jitte-d-amayas', cible.id).ok, true);
  assert.equal(cible.protection.contre, 'tenebres');
  assert.equal(lancer(duel, 'joueur', 'le-jugement-des-colosses', cible.id).bouclierBloque, true);
  assert.equal(cible.protection, null);
  duel.tour = 'sorcier';
  duel.sorcier.main.push('lame-des-ergs');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'lame-des-ergs', cible.id).ok, true);
  assert.deepEqual(cible.protection.contre, ['eau']);
  assert.equal(lancer(duel, 'joueur', 'le-jugement-des-colosses', cible.id).ok, true);
  assert.equal(duel.sorcier.creatures.includes(cible), false);
});

test('retirer une Jitte intacte restitue le bouclier imprimé', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((c) => [c, 30]));
  duel.sorcier.main.push('lionne-du-midi-ardent');
  const lionne = rpgJouerCreature(duel, 'sorcier', 'lionne-du-midi-ardent').entite;
  duel.tour = 'sorcier';
  duel.sorcier.main.push('jitte-d-amayas', 'lame-des-ergs');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'jitte-d-amayas', lionne.id).ok, true);
  assert.equal(rpgJouerArme(duel, 'sorcier', 'lame-des-ergs', lionne.id).ok, true);
  assert.deepEqual(lionne.protection.contre, ['eau', 'neige']);
  assert.equal(lancer(duel, 'joueur', 'poigne-de-givre', lionne.id).bouclierBloque, true);
  assert.equal(lionne.protection, null);
});

test('un sort de zone bicolore brise un bouclier de chacune de ses couleurs', () => {
  for (const couleur of ['neige', 'tenebres']) {
    const { duel, cible } = scene([couleur]);
    const pv = cible.pv;
    assert.equal(lancer(duel, 'joueur', 'neige-noire').ok, true);
    assert.equal(cible.pv, pv);
    assert.equal(cible.gelToursRestants ?? 0, 0);
    assert.equal(cible.protection, null, couleur);
  }
});

test('un sort rapide lancé en réponse brise le bouclier adverse', () => {
  const { duel, cible } = scene(['neige']);
  duel.tour = 'sorcier';
  duel.fenetreReponse = true;
  duel.joueur.main.push('poigne-de-givre');
  const pv = cible.pv;
  const res = rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', cible.id);
  assert.equal(res.ok, true);
  assert.equal(res.bouclierBloque, true);
  assert.equal(cible.pv, pv);
  assert.equal(cible.protection, null);
});
