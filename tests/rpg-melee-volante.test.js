/** Une mêlée au sol peut frapper le sorcier si seule une volante inaccessible
 * reste en face, y compris quand cette volante est aussi un tireur. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgAttaquerSorcier } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgAttaqueTousDisponible, rpgVagueDirecteClassique } from '../src/games/rpgAttaqueTous.js';
import {
  rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique,
  rpgResoudreAttaqueIndividuelleClassique, rpgChoisirAttaqueIndividuelleClassiqueIA,
} from '../src/games/rpgCombatIndividuelClassique.js';

function table(cote, pvp = false) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], lignes: true,
    modeMana: RPG_MODE_MANA_ESSAI, joueurCouleurs: ['braise'], sorcierCouleurs: ['tenebres'], rng: () => .9 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = pvp;
  d.tour = cote;
  function poser(camp, carte) {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(carte);
    const tour = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, carte);
    d.tour = tour;
    assert.ok(resultat.ok, `${carte} : ${resultat.raison}`);
    Object.assign(resultat.entite, { ready: true, malInvocation: false });
    return resultat.entite;
  }
  return { d, poser, ennemi: cote === 'joueur' ? 'sorcier' : 'joueur' };
}

for (const cote of ['joueur', 'sorcier']) for (const pvp of [false, true]) {
  test(`${cote}, ${pvp ? 'PvP' : 'duel'} : la mêlée passe une volante à distance inaccessible`, () => {
    const { d, poser, ennemi } = table(cote, pvp);
    const melee = poser(cote, 'chien-du-guet');
    const volante = poser(ennemi, 'tengu-du-mont-ardent');
    assert.ok(volante.envol && volante.distance && !melee.envol);
    const choix = rpgCiblesIndividuellesClassique(d, cote, melee.id);
    assert.deepEqual(choix.cibles, [], 'la volante reste impossible à viser');
    assert.equal(choix.directe, true);
    assert.equal(rpgAttaqueTousDisponible(d, cote), true);
    assert.deepEqual(rpgVagueDirecteClassique(d, cote).map((e) => e.id), [melee.id]);
    const pv = d[ennemi].pv;
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, cote, melee.id, null).ok);
    const resultat = rpgResoudreAttaqueIndividuelleClassique(d, cote);
    assert.ok(resultat.ok && !resultat.annule);
    assert.equal(d[ennemi].pv, pv - melee.atk);
    assert.ok(d[ennemi].creatures.includes(volante));
  });
}

test('un tireur terrestre couvre toujours le sorcier derrière une volante', () => {
  const { d, poser, ennemi } = table('joueur');
  const melee = poser('joueur', 'chien-du-guet');
  poser(ennemi, 'tengu-du-mont-ardent');
  poser(ennemi, 'ashigaru-des-braises');
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id).directe, false);
  assert.equal(rpgAttaqueTousDisponible(d, 'joueur'), false);
  assert.equal(rpgAttaquerSorcier(d, 'joueur', melee.id).ok, false);
});

test('une mêlée volante peut viser le tireur volant et ne passe pas sa couverture', () => {
  const { d, poser, ennemi } = table('joueur');
  const melee = poser('joueur', 'chien-du-guet');
  melee.envol = true;
  const volante = poser(ennemi, 'tengu-du-mont-ardent');
  const choix = rpgCiblesIndividuellesClassique(d, 'joueur', melee.id);
  assert.deepEqual(choix.cibles, [volante.id]);
  assert.equal(choix.directe, false);
});

test('la couverture est revérifiée après une réponse et le raccourci suit la même règle', () => {
  const { d, poser, ennemi } = table('joueur');
  const melee = poser('joueur', 'chien-du-guet');
  const volante = poser(ennemi, 'tengu-du-mont-ardent');
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', melee.id, null).ok);
  volante.envol = false;
  const pv = d[ennemi].pv;
  assert.equal(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').annule, true);
  assert.equal(d[ennemi].pv, pv);
  melee.attaquee = false;
  assert.equal(rpgAttaquerSorcier(d, 'joueur', melee.id).ok, false);
  volante.envol = true;
  assert.equal(rpgAttaquerSorcier(d, 'joueur', melee.id).ok, true);
  assert.equal(d[ennemi].pv, pv - melee.atk);
});


test('une volante de mêlée seule ne bloque pas non plus la frappe au sol', () => {
  const { d, poser, ennemi } = table('joueur');
  const melee = poser('joueur', 'chien-du-guet');
  const volante = poser(ennemi, 'chien-du-guet');
  volante.envol = true;
  assert.deepEqual(rpgCiblesIndividuellesClassique(d, 'joueur', melee.id), { cibles: [], directe: true });
});

test('le sorcier IA choisit aussi la frappe directe face à une volante inaccessible', () => {
  const { d, poser, ennemi } = table('sorcier');
  const melee = poser('sorcier', 'chien-du-guet');
  poser(ennemi, 'tengu-du-mont-ardent');
  const action = rpgChoisirAttaqueIndividuelleClassiqueIA(d, 'sorcier');
  assert.equal(action?.attaquantId, melee.id);
  assert.equal(action?.cibleId, null);
});
