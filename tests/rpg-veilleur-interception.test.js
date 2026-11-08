import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';

function scene(defenseur = 'joueur') {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  const attaque = defenseur === 'joueur' ? 'sorcier' : 'joueur';
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 30]));
  d.tour = defenseur;
  d[defenseur].main.push('veilleur-du-dernier-crepuscule');
  const veilleur = rpgJouerCreature(d, defenseur, 'veilleur-du-dernier-crepuscule').entite;
  d.tour = attaque;
  d[attaque].main.push('chien-du-guet');
  const assaillant = rpgJouerCreature(d, attaque, 'chien-du-guet').entite;
  assaillant.coupRapide = true;
  assaillant.ready = true;
  return { d, veilleur, assaillant, attaque, defenseur };
}

test('le Veilleur conserve sa Contre-attaque contre une attaque ciblée, sans intercepter', () => {
  for (const defenseur of ['joueur', 'sorcier']) {
    const { d, veilleur, assaillant, attaque } = scene(defenseur);
    assert.equal(cardById('veilleur-du-dernier-crepuscule').interceptionAttaque, undefined);
    const cibles = { [assaillant.id]: veilleur.id };
    const res = rpgLancerAttaque(d, attaque, [assaillant.id], {}, null, null, cibles);
    assert.equal(res.ok, true);
    assert.ok(d.log.some(ligne => ligne.includes('Contre-attaque : Veilleur du dernier crépuscule')));
    assert.ok(!d[attaque].creatures.some(entite => entite.id === assaillant.id),
      'la riposte abat l’attaquant ciblant le Veilleur');
  }
});

test('le Veilleur se joue à son tour, mais pas pendant une réponse PvP à une attaque ciblée', () => {
  for (const defenseur of ['joueur', 'sorcier']) {
    const { d, veilleur, assaillant, attaque } = scene(defenseur);
    d.pvp = true;
    d.phase = 'principale1';
    d.mulliganFait = { joueur: true, sorcier: true };
    d[defenseur].main.push('veilleur-du-dernier-crepuscule');
    const declaree = rpgPvpAppliquer(d, attaque, { type: 'attaquer', declarer: true,
      attaquants: [assaillant.id], ciblesAttaque: { [assaillant.id]: veilleur.id } });
    assert.equal(declaree.ok, true);
    const pose = rpgPvpAppliquer(d, defenseur, { type: 'jouer-carte', carteId: 'veilleur-du-dernier-crepuscule' });
    assert.equal(pose.ok, false, 'la fenêtre de réponse ne donne plus Embuscade au Veilleur');
    assert.ok(d[defenseur].main.includes('veilleur-du-dernier-crepuscule'));
  }
});
