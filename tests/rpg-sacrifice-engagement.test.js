import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { invocationPossible, victimesInvocation } from '../src/games/rpgInvocation.js';
import { validerMateriauxAscension, combinaisonsAscension } from '../src/games/rpgAscension.js';
import { rpgCombinaisonsSacrificesIA } from '../src/games/rpgAI.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgSacrifierCreature } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature } from '../src/games/rpgMobaLocal.js';

const creer = () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], joueurCouleurs: ['sable', 'braise'], sorcierCouleurs: ['sable', 'braise'], modeMana: RPG_MODE_MANA_ESSAI, rng: () => .5 });
  duel.mulliganFait = { joueur: true, sorcier: true }; duel.manaEssaiDemarre = true;
  for (const cote of ['joueur', 'sorcier']) { duel[cote].manaChoixEnAttente = false; duel[cote].mana = { sable: 40, braise: 40, neige: 40, eau: 40, tenebres: 40 }; }
  return duel;
};
function poser(d, id, cote = 'joueur') {
  d.tour = cote; d[cote].invocationNormaleJouee = false; d[cote].main.push(id);
  const r = rpgJouerCreature(d, cote, id);
  assert.equal(r.ok, true, r.raison); return r.entite;
}
function refuseSansMutation(d, action, raison) {
  const avant = JSON.stringify(d); const resultat = action();
  assert.equal(resultat.ok, false); if (raison) assert.equal(resultat.raison, raison);
  assert.equal(JSON.stringify(d), avant, 'aucun paiement ni changement au refus');
}
for (const cote of ['joueur', 'sorcier']) {
  test(`${cote} : sacrifices ordinaires et libération refusent les engagées, pas le mal d’invocation`, () => {
    const d = creer(), a = poser(d, 'chien-du-guet', cote);
    a.attaquee = true; d[cote].invocationNormaleJouee = false; d[cote].main = ['faucon-du-zenith'];
    assert.deepEqual(victimesInvocation(d[cote]), []);
    assert.equal(invocationPossible(d, cote, cardById('faucon-du-zenith')), false);
    assert.deepEqual(rpgCombinaisonsSacrificesIA(d, cote, cardById('faucon-du-zenith')), []);
    refuseSansMutation(d, () => rpgJouerCreature(d, cote, 'faucon-du-zenith', null, { sacrificeIds: [a.id] }), 'sacrifice-engage');
    refuseSansMutation(d, () => rpgSacrifierCreature(d, cote, a.id), 'sacrifice-engage');
    a.attaquee = false; a.malInvocation = true; a.rapidite = false;
    assert.equal(invocationPossible(d, cote, cardById('faucon-du-zenith')), true);
    assert.equal(rpgJouerCreature(d, cote, 'faucon-du-zenith', null, { sacrificeIds: [a.id], cibleDifferee: true }).ok, true);
  });
}
test('un paiement multiple entier est refusé si une seule victime est engagée', () => {
  const d = creer(), a = poser(d, 'chien-du-guet'), b = poser(d, 'chien-du-guet');
  b.attaquee = true; d.joueur.invocationNormaleJouee = false; d.joueur.main = ['orochi'];
  refuseSansMutation(d, () => rpgJouerCreature(d, 'joueur', 'orochi', null, { sacrificeIds: [a.id, b.id] }), 'sacrifice-engage');
  assert.deepEqual(rpgCombinaisonsSacrificesIA(d, 'joueur', cardById('orochi')), []);
});
test('Ascension filtre les engagées dans la recette, l’interface et l’IA', () => {
  const d = creer(), a = poser(d, 'ronin-du-soleil-rouge'), b = poser(d, 'onna-musha-des-cendres');
  const carte = cardById('samourai-du-dragon-rouge');
  d.joueur.reserveAscension = [carte.id]; d.joueur.invocationNormaleJouee = false;
  assert.equal(validerMateriauxAscension(d.joueur, carte, [a.id, b.id]).ok, true);
  a.attaquee = true;
  assert.equal(validerMateriauxAscension(d.joueur, carte, [a.id, b.id]).raison, 'ascension-engagee');
  assert.deepEqual(combinaisonsAscension(d.joueur, carte), []);
  assert.deepEqual(rpgCombinaisonsSacrificesIA(d, 'joueur', carte), []);
  refuseSansMutation(d, () => rpgJouerCreature(d, 'joueur', carte.id, null, { sacrificeIds: [a.id, b.id] }), 'sacrifice-engage');
});
test('le moteur PvP refuse également un sacrifice engagé', () => {
  const d = creer(), a = poser(d, 'chien-du-guet');
  a.attaquee = true; d.joueur.invocationNormaleJouee = false; d.joueur.main = ['faucon-du-zenith']; d.pvp = true;
  refuseSansMutation(d, () => rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'faucon-du-zenith', sacrificeIds: [a.id] }), 'sacrifice-engage');
});
for (const cote of ['joueur', 'sorcier']) test(`Conquête ${cote} : vérifie à l’annonce et à la résolution`, () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true; d.tour = cote;
  d[cote].manaChoixEnAttente = false; d[cote].main = ['ashigaru-des-braises'];
  const a = rpgMobaJouerCreature(d, cote, 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(a); d.moba.creaturesJouees[cote] = false; d[cote].main = ['anqa-des-braises'];
  a.attaquee = true;
  refuseSansMutation(d, () => rpgMobaJouerCreature(d, cote, 'anqa-des-braises', 'left', 0, { sacrificeIds: [a.id], ouvrirReponse: true }), 'sacrifice-engage');
  a.attaquee = false;
  assert.equal(rpgMobaJouerCreature(d, cote, 'anqa-des-braises', 'left', 0, { sacrificeIds: [a.id], ouvrirReponse: true }).creatureEnAttente, true);
  a.attaquee = true;
  const res = rpgMobaPasserCreature(d, cote === 'joueur' ? 'sorcier' : 'joueur');
  assert.equal(res.ok, true); assert.equal(res.dissipe, true);
  assert.ok(d[cote].creatures.some((e) => e.id === a.id));
  assert.ok(d[cote].cimetiere.includes('anqa-des-braises'));
});
