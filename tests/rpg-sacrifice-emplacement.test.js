/** L'invocation payée d'un sacrifice prend **la case de la victime** — celle
 *  qu'elle occupait vraiment, y compris chez l'adversaire. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { RPG_ELEMENTS, duelCardById } from '../src/games/rpgCards.js';
import { rpgJouerCreature, rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { positionDe } from '../src/games/rpgChamp.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';

const SACRIFICE = 'tarek';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], rng: () => .9, modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['sable'], sorcierCouleurs: ['braise'], lignes: true,
  });
  d.tour = 'joueur';
  const poser = (cote, id, options = {}) => {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    d[cote].manaChoixEnAttente = false;
    d[cote].invocationNormaleJouee = false;
    d[cote].main.push(id);
    const avant = d.tour;
    d.tour = cote;
    const res = rpgJouerCreature(d, cote, id, null, options);
    d.tour = avant;
    return res;
  };
  return { d, poser };
}

test('la carte de sacrifice demande bien une victime', () => {
  const { d } = table();
  assert.equal(sacrificesInvocation(duelCardById(SACRIFICE), d, 'joueur'), 1);
});

test('la nouvelle créature prend la case laissée par la victime', () => {
  const { d, poser } = table();
  // Une victime au fond, à la colonne 4 (case 8) : personne ne l'a mise là par
  // une ligne imposée, c'est un choix.
  const victime = poser('joueur', 'viking-des-neiges', { emplacement: 8 });
  assert.ok(victime.ok, victime.raison);
  victime.entite.ready = true;
  assert.equal(victime.entite.emplacement, 8);

  const invocation = poser('joueur', SACRIFICE, { sacrificeIds: [victime.entite.id] });
  assert.ok(invocation.ok, `l'invocation doit aboutir : ${invocation.raison}`);
  assert.equal(invocation.entite.emplacement, 8, 'elle entre sur la case libérée');
  assert.equal(invocation.entite.campPose, undefined, 'dans son propre camp');
  assert.ok(!d.joueur.creatures.some((e) => e.id === victime.entite.id), 'la victime a quitté le champ');
});

test('une victime qui avait percé laisse sa case chez l’adversaire', () => {
  const { d, poser } = table();
  const victime = poser('joueur', 'viking-des-neiges');
  assert.ok(victime.ok, victime.raison);
  // Elle a franchi la trouée : elle se tient sur le front du sorcier.
  victime.entite.campPose = 'sorcier';
  victime.entite.emplacement = 3;
  victime.entite.avancee = true;
  assert.deepEqual(positionDe(victime.entite, 'joueur'), { camp: 'sorcier', index: 3, rangee: 1, colonne: 3 });

  const invocation = poser('joueur', SACRIFICE, { sacrificeIds: [victime.entite.id] });
  assert.ok(invocation.ok, `l'invocation doit aboutir : ${invocation.raison}`);
  assert.deepEqual(positionDe(invocation.entite, 'joueur'), { camp: 'sorcier', index: 3, rangee: 1, colonne: 3 },
    'la nouvelle créature se tient là où la victime est tombée');
  assert.equal(invocation.entite.avancee, true, 'elle n’est pas rapatriée chez elle');
});

test('sans victime chez l’adversaire, la pose garde ses règles de place', () => {
  const { d, poser } = table();
  const victime = poser('joueur', 'viking-des-neiges', { emplacement: 1 });
  assert.ok(victime.ok, victime.raison);
  const invocation = poser('joueur', SACRIFICE, { sacrificeIds: [victime.entite.id] });
  assert.ok(invocation.ok, invocation.raison);
  assert.equal(invocation.entite.emplacement, 1);
  assert.ok(d);
});
