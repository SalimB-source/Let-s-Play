import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, cardColorCost, RPG_MAGIE_CARDS, RPG_ARME_CARDS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi, rpgBlesserCreature, rpgLancerMagie, rpgJouerArme } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaCandidatsRecherche, rpgMobaResoudreRecherche } from '../src/games/rpgMobaLocal.js';
import { rpgPvpVue, rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaChoisirCreatureIA, rpgMobaChoisirRechercheIA } from '../src/games/rpgMobaAI.js';
import { courbeDeMana } from '../src/games/rpgDeckBuilder.js';

const candidats = ['trait-de-braise', 'rapport-du-greffier'];
function partie(moba, cote, deck, pvp = true) {
  const d = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), pvp, modeMana: 'essai', rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const camp of ['joueur', 'sorcier']) { d[camp].main = []; d[camp].manaChoixEnAttente = null; }
  d.tour = cote; d[cote].main = ['dune-marchante']; d[cote].deck = deck.slice();
  const r = moba ? rpgMobaJouerCreature(d, cote, 'dune-marchante', 'left', 0) : rpgJouerCreature(d, cote, 'dune-marchante');
  assert.ok(r.ok, JSON.stringify(r));
  return d;
}

test('Les sorts et armes ne possèdent ni coût imprimé ni pips ; les autres coûts sont préservés', () => {
  for (const c of [...RPG_MAGIE_CARDS, ...RPG_ARME_CARDS, cardById('encre-du-registre'), cardById('pilon-du-fossoyeur')]) {
    assert.ok(!Object.hasOwn(c, 'cost'), c.id); assert.deepEqual(cardColorCost(c), {}, c.id);
  }
  assert.equal(cardById('dune-marchante').cost, 4);
  assert.equal(cardById('neige-noire').prixPv, 3);
  assert.equal(cardById('dune-marchante').destruction, undefined);
  assert.equal(courbeDeMana(['dune-marchante', ...candidats]).nonTerrains, 1);
});

for (const moba of [false, true]) for (const cote of ['joueur', 'sorcier']) {
  const mode = moba ? 'MOBA' : 'Duel PvP';
  test(`Dune choisit seulement un sort de son deck (${mode}, ${cote})`, () => {
    const d = partie(moba, cote, ['sabre-maudit', 'chien-du-guet', ...candidats, 'javelot-du-beffroi']);
    const cs = moba ? rpgMobaCandidatsRecherche(d, cote) : rpgCartesRenfortChoisi(d, cote).map(c => c.id);
    assert.deepEqual(cs, candidats);
    const adverse = cote === 'joueur' ? 'sorcier' : 'joueur';
    assert.deepEqual(moba ? rpgMobaCandidatsRecherche(d, adverse) : rpgCartesRenfortChoisi(d, adverse), []);
    const invalid = moba ? rpgMobaResoudreRecherche(d, cote, 'sabre-maudit') : rpgResoudreRenfortChoisi(d, cote, 0);
    assert.equal(invalid.ok, false);
    const ok = moba ? rpgMobaResoudreRecherche(d, cote, candidats[1]) : rpgResoudreRenfortChoisi(d, cote, 3);
    assert.ok(ok.ok); assert.deepEqual(d[cote].main, [candidats[1]]);
    assert.deepEqual(d[cote].deck, ['sabre-maudit', 'chien-du-guet', candidats[0], 'javelot-du-beffroi']);
    assert.ok(!d.log.some(line => line.includes('Rapport du greffier')));
  });
  test(`Dune ne bloque pas sans sort admissible (${mode}, ${cote})`, () => {
    const d = partie(moba, cote, ['chien-du-guet', 'sabre-maudit']);
    assert.equal(d.renfortChoixEnAttente ?? d.mobaRechercheEnAttente, undefined);
  });
}
test('Dune : IA du duel résout sa recherche', () => {
  const d = partie(false, 'sorcier', candidats, false);
  assert.equal(d.renfortChoixEnAttente, null); assert.equal(d.sorcier.main.length, 1);
});
test('Dune : vue PvP masque le deck et le choix adverses', () => {
  const d = partie(false, 'sorcier', candidats);
  const vue = rpgPvpVue(d, 'joueur');
  assert.deepEqual(vue.sorcier.deck, []); assert.deepEqual(rpgCartesRenfortChoisi(vue, 'joueur'), []);
});

test('Dune : le protocole PvP vérifie le camp, l’indice et masque la carte choisie', () => {
  const d = partie(false, 'sorcier', candidats);
  assert.equal(rpgPvpAppliquer(d, 'joueur', { type: 'choisir-renfort', index: 0 }).ok, false);
  assert.equal(rpgPvpAppliquer(d, 'sorcier', { type: 'choisir-renfort', index: 8 }).ok, false);
  assert.ok(rpgPvpAppliquer(d, 'sorcier', { type: 'choisir-renfort', index: 1 }).ok);
  assert.deepEqual(rpgPvpVue(d, 'joueur').sorcier.main, []);
  assert.ok(!d.log.some(line => line.includes('Rapport du greffier')));
});

test('La mort de Dune ne recycle plus de sort', () => {
  const d = partie(false, 'joueur', ['chien-du-guet']);
  d.joueur.cimetiere = ['trait-de-braise'];
  rpgBlesserCreature(d, 'joueur', d.joueur.creatures[0].id, 99);
  assert.deepEqual(d.joueur.main, []);
  assert.ok(d.joueur.cimetiere.includes('trait-de-braise'));
});
test('Le Prix en PV reste dû et une arme reste jouable sans mana', () => {
  const d = partie(false, 'joueur', ['chien-du-guet']);
  d.joueur.pv = 10; d.joueur.main = ['papyrus', 'takouba-des-pistes'];
  d.joueur.mana = { sable: 0, braise: 0, eau: 0, neige: 0, tenebres: 0 };
  assert.ok(rpgLancerMagie(d, 'joueur', 'papyrus').ok); assert.equal(d.joueur.pv, 8);
  assert.ok(rpgJouerArme(d, 'joueur', 'takouba-des-pistes', d.joueur.creatures[0].id).ok);
});
test('L’IA MOBA prévoit la recherche de Dune et la résout', () => {
  const d = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('chien-du-guet'), sorcierDeck: Array(30).fill('chien-du-guet'), rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  d.tour = 'sorcier'; d.sorcier.manaChoixEnAttente = null; d.sorcier.main = ['dune-marchante']; d.sorcier.deck = [...candidats]; d.sorcier.reserveAscension = [];
  const decision = rpgMobaChoisirCreatureIA(d, 'sorcier'); assert.equal(decision?.id, 'dune-marchante');
  assert.ok(rpgMobaJouerCreature(d, 'sorcier', decision.id, decision.lane, decision.slot, { sacrificeIds: decision.sacrificeIds }).ok);
  const choix = rpgMobaChoisirRechercheIA(d); assert.ok(candidats.includes(choix));
  assert.ok(rpgMobaResoudreRecherche(d, 'sorcier', choix).ok);
});
