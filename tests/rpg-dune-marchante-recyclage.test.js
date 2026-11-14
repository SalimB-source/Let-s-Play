import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, carteEstArme } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

const adversaire = cote => cote === 'joueur' ? 'sorcier' : 'joueur';
function partie(moba, cote) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), pvp: true, modeMana: 'essai', rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const camp of ['joueur', 'sorcier']) {
    d[camp].main = []; d[camp].cimetiere = []; d[camp].manaChoixEnAttente = null;
    d[camp].mana = { sable: 20, braise: 20, neige: 20, eau: 20, tenebres: 20 };
  }
  d.tour = cote; d[cote].main = ['dune-marchante'];
  const r = moba ? rpgMobaJouerCreature(d, cote, 'dune-marchante', 'left', 0) : rpgJouerCreature(d, cote, 'dune-marchante');
  assert.ok(r.ok, JSON.stringify(r));
  return { d, dune: r.entite };
}
function detruire(d, dune, cote) {
  const ennemi = adversaire(cote);
  d.tour = ennemi; d[ennemi].main = ['eclair-du-marteau']; dune.pv = 1;
  const r = d.moba ? rpgMobaLancerMagie(d, ennemi, 'eclair-du-marteau', dune.id) : rpgLancerMagie(d, ennemi, 'eclair-du-marteau', dune.id);
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(!d[cote].creatures.includes(dune));
  assert.ok(d[cote].cimetiere.includes('dune-marchante'));
  if (d.moba) assert.ok(rpgMobaPlacementCoherent(d));
}

test('Dune marchante : texte et filtre de coût imprimé cohérents', () => {
  const carte = cardById('dune-marchante');
  assert.deepEqual(carte.destruction, { type: 'recyclage', cible: 'magie-cimetiere', coutMax: 3, exclureArmes: true });
  assert.match(carte.text, /sort de coût imprimé 3 ou moins/);
  assert.equal(cardById('trait-de-braise').cost, 3);
  assert.equal(cardById('rapport-du-greffier').cost, 4);
  assert.ok(carteEstArme(cardById('javelot-du-beffroi')));
});

for (const moba of [false, true]) for (const cote of ['joueur', 'sorcier']) {
  const mode = moba ? 'MOBA' : 'Duel PvP';
  test(`Dune : récupère le dernier sort éligible, sans prendre arme ou sort trop cher (${mode}, ${cote})`, () => {
    const { d, dune } = partie(moba, cote);
    d[cote].cimetiere = ['eclair-du-marteau', 'trait-de-braise', 'rapport-du-greffier', 'javelot-du-beffroi', 'chien-du-guet'];
    d[adversaire(cote)].cimetiere = ['vent-rouge'];
    detruire(d, dune, cote);
    assert.deepEqual(d[cote].main, ['trait-de-braise']);
    assert.deepEqual(d[cote].cimetiere, ['eclair-du-marteau', 'rapport-du-greffier', 'javelot-du-beffroi', 'chien-du-guet', 'dune-marchante']);
    assert.ok(d[adversaire(cote)].cimetiere.includes('vent-rouge'));
  });
  test(`Dune : rien à récupérer si seules armes, créatures et sorts trop chers sont au cimetière (${mode}, ${cote})`, () => {
    const { d, dune } = partie(moba, cote);
    d[cote].cimetiere = ['rapport-du-greffier', 'verglas', 'javelot-du-beffroi', 'sabre-maudit', 'chien-du-guet'];
    detruire(d, dune, cote);
    assert.deepEqual(d[cote].main, []);
    assert.deepEqual(d[cote].cimetiere, ['rapport-du-greffier', 'verglas', 'javelot-du-beffroi', 'sabre-maudit', 'chien-du-guet', 'dune-marchante']);
  });
  test(`Dune : les doublons restent distincts et un seul sort revient en main (${mode}, ${cote})`, () => {
    const { d, dune } = partie(moba, cote);
    d[cote].cimetiere = ['trait-de-braise', 'trait-de-braise'];
    detruire(d, dune, cote);
    assert.deepEqual(d[cote].main, ['trait-de-braise']);
    assert.deepEqual(d[cote].cimetiere, ['trait-de-braise', 'dune-marchante']);
  });
}

for (const moba of [false, true]) test(`Sacrifice pour le Colosse : la Dune récupère un sort éligible (${moba ? 'MOBA' : 'Duel'})`, () => {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), pvp: true, modeMana: 'essai', rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  d.joueur.manaChoixEnAttente = null; d.joueur.mana = { sable: 20, braise: 20, neige: 20, eau: 20, tenebres: 20 };
  const materiaux = ['djinn-de-la-premiere-etincelle', 'djinn-de-la-flamme-mourante', 'dune-marchante'].map((id, i) => {
    d.joueur.main = [id]; d.joueur.invocationNormaleJouee = false;
    if (moba) d.moba.creaturesJouees.joueur = false;
    const pose = moba ? rpgMobaJouerCreature(d, 'joueur', id, i === 2 ? 'right' : 'left', i === 2 ? 0 : i) : rpgJouerCreature(d, 'joueur', id);
    assert.ok(pose.ok, JSON.stringify(pose)); return pose.entite.id;
  });
  d.joueur.main = []; d.joueur.cimetiere = ['confluence-des-etincelles', 'rapport-du-greffier'];
  const r = moba ? rpgMobaJouerCreature(d, 'joueur', 'colosse-du-verre-ardent', 'left', 0, { sacrificeIds: materiaux })
    : rpgJouerCreature(d, 'joueur', 'colosse-du-verre-ardent', null, { sacrificeIds: materiaux });
  assert.ok(r.ok, JSON.stringify(r)); assert.deepEqual(d.joueur.main, ['confluence-des-etincelles']);
  assert.ok(d.joueur.cimetiere.includes('rapport-du-greffier'));
  assert.ok(d.moba ? d.mobaRechercheEnAttente : d.renfortChoixEnAttente);
  if (moba) assert.ok(rpgMobaPlacementCoherent(d));
});
