/** L'invocation payée d'un sacrifice entre par **l'arrière**, comme toute
 *  créature : la victime ne transmet pas sa case, seulement sa colonne. */
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

test('la nouvelle créature occupe la colonne de la victime, à l’arrière', () => {
  const { d, poser } = table();
  const victime = poser('joueur', 'viking-des-neiges', { emplacement: 8 });
  assert.ok(victime.ok, victime.raison);
  victime.entite.ready = true;
  assert.equal(victime.entite.emplacement, 8);

  const invocation = poser('joueur', SACRIFICE, { sacrificeIds: [victime.entite.id] });
  assert.ok(invocation.ok, `l'invocation doit aboutir : ${invocation.raison}`);
  assert.equal(invocation.entite.emplacement, 8, 'même colonne, même case : elle est libre');
  assert.equal(invocation.entite.campPose, undefined, 'dans son propre camp');
  assert.equal(positionDe(invocation.entite, 'joueur').rangee, 3, 'à l’arrière');
  assert.ok(!d.joueur.creatures.some((e) => e.id === victime.entite.id), 'la victime a quitté le champ');
});

test('une victime qui avait percé n’entraîne pas l’invocation chez l’adversaire', () => {
  const { d, poser } = table();
  const victime = poser('joueur', 'viking-des-neiges');
  assert.ok(victime.ok, victime.raison);
  // Elle avait franchi la trouée : elle se tenait sur le front du sorcier.
  victime.entite.campPose = 'sorcier';
  victime.entite.emplacement = 3;
  victime.entite.avancee = true;
  assert.deepEqual(positionDe(victime.entite, 'joueur'), { camp: 'sorcier', index: 3, rangee: 1, colonne: 3 });

  const invocation = poser('joueur', SACRIFICE, { sacrificeIds: [victime.entite.id] });
  assert.ok(invocation.ok, `l'invocation doit aboutir : ${invocation.raison}`);
  assert.equal(invocation.entite.campPose, undefined, 'elle reste chez nous');
  assert.deepEqual(positionDe(invocation.entite, 'joueur'), { camp: 'joueur', index: 8, rangee: 3, colonne: 3 },
    'la colonne de la victime, sur notre arrière');
  assert.notEqual(invocation.entite.avancee, true, 'elle n’a pas avancé : elle vient d’entrer');
});

test('une case du front demandée pour l’invocation est ignorée', () => {
  const { d, poser } = table();
  const victime = poser('joueur', 'viking-des-neiges');
  assert.ok(victime.ok, victime.raison);
  const invocation = poser('joueur', SACRIFICE, { sacrificeIds: [victime.entite.id], emplacement: 2 });
  assert.ok(invocation.ok, invocation.raison);
  assert.equal(positionDe(invocation.entite, 'joueur').rangee, 3, 'l’arrière, jamais le front');
  assert.ok(d);
});
