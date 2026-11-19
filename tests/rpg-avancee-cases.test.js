/** Une créature qui a franchi la trouée ne laisse pas de **case fantôme** dans
 *  sa propre rangée : elle se dessine chez l'adversaire (`occupantsDeCamp`) et
 *  sa case locale redevient libre pour une invocation ou un sacrifice. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgEmplacementsChamp } from '../src/games/rpgDuel.js';
import { occupantsDeCamp } from '../src/games/rpgChamp.js';
import { champMax } from '../src/games/rpgLignes.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'viking-des-neiges';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => .9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id, options) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id, null, options);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    resultat.entite.ready = true;
    resultat.entite.malInvocation = false;
    return resultat.entite;
  };
  return { d, poser };
}

test('une créature avancée chez l’adversaire ne prend plus de case chez elle', () => {
  const { d, poser } = table();
  poser('joueur', MELEE); // case 0 de notre front
  const perceur = poser('joueur', MELEE); // case 1
  perceur.emplacement = 4;
  perceur.campPose = 'sorcier';
  perceur.avancee = true;

  const cases = rpgEmplacementsChamp(d.joueur, champMax(d), 'joueur');
  assert.equal(cases.includes(perceur), false, 'aucune case fantôme dans notre rangée');
  assert.equal(cases[4], null, 'la case 4 de notre camp reste libre');
  // Elle se dessine bien chez le sorcier, à sa vraie place.
  const chezLui = occupantsDeCamp(d, 'sorcier');
  assert.deepEqual(chezLui.map(({ entite, index }) => [entite.id, index]), [[perceur.id, 4]]);
});

test('sans le camp, la fonction garde son ancien contrat (une rangée nue)', () => {
  const { d, poser } = table();
  const perceur = poser('joueur', MELEE);
  perceur.emplacement = 4;
  perceur.campPose = 'sorcier';
  perceur.avancee = true;
  assert.ok(rpgEmplacementsChamp(d.joueur, champMax(d)).includes(perceur),
    'les appels sans camp ne changent pas de comportement');
});

test('la case libérée par l’envahisseur accepte une invocation', () => {
  const { d, poser } = table();
  poser('joueur', MELEE); // case 5 de l'arrière
  const perceur = poser('joueur', MELEE); // case 6
  perceur.emplacement = 6;
  perceur.campPose = 'sorcier';
  perceur.avancee = true;
  // Sa case de l'arrière est libre : l'invocation peut la reprendre.
  const nouveau = poser('joueur', MELEE, { emplacement: 6 });
  assert.equal(nouveau.emplacement, 6, 'la case 6 de notre arrière est bien libre');
});

test('une créature restée chez nous garde sa case, le fantôme de l’autre non', () => {
  const { d, poser } = table();
  const restee = poser('joueur', MELEE, { emplacement: 6 });
  const perceur = poser('joueur', MELEE);
  perceur.emplacement = 6;
  perceur.campPose = 'sorcier';
  perceur.avancee = true;
  assert.equal(rpgEmplacementsChamp(d.joueur, champMax(d), 'joueur')[6]?.id, restee.id);
  // Le fantôme de la case 6 ne prend pas la place de la créature restée.
  const perceurCase = rpgEmplacementsChamp(d.joueur, champMax(d), 'joueur')
    .findIndex((occupant) => occupant?.id === perceur.id);
  assert.equal(perceurCase, -1, 'la créature restée est la seule à occuper sa case');
});
