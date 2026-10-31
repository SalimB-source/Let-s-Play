import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgResoudreArriveeCiblee, rpgLancerAttaque } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';

function scene(defenseur = 'joueur') {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  const attaque = defenseur === 'joueur' ? 'sorcier' : 'joueur';
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 30]));
  d[defenseur].main.push('chien-du-guet', 'veilleur-du-dernier-crepuscule');
  const cible = rpgJouerCreature(d, defenseur, 'chien-du-guet').entite;
  d[attaque].main.push('chien-du-guet', 'chien-du-guet');
  const a = rpgJouerCreature(d, attaque, 'chien-du-guet').entite;
  const b = rpgJouerCreature(d, attaque, 'chien-du-guet').entite;
  for (const e of [a,b]) { e.coupRapide = true; e.ready = true; }
  d.tour = attaque; d.fenetreReponse = true;
  d.combatDeclare = { cote: attaque, attaquants: [a.id, b.id], ciblesAttaque: { [a.id]: cible.id, [b.id]: cible.id } };
  return { d, a, b, cible, attaque, defenseur };
}

test('le Veilleur choisit une seule des attaques ciblées et subit la frappe', () => {
  const { d, a, b, cible, attaque, defenseur } = scene();
  const pose = rpgJouerCreature(d, defenseur, 'veilleur-du-dernier-crepuscule', null, { cibleDifferee: true });
  assert.equal(pose.arriveeEnAttente, true);
  assert.equal(rpgResoudreArriveeCiblee(d, defenseur, cible.id).ok, false);
  assert.equal(rpgResoudreArriveeCiblee(d, defenseur, b.id).ok, true);
  assert.equal(d.combatDeclare.ciblesAttaque[a.id], cible.id);
  assert.equal(d.combatDeclare.ciblesAttaque[b.id], d[defenseur].creatures.find(e => e.carteId === "veilleur-du-dernier-crepuscule").id);
  const res = rpgLancerAttaque(d, attaque, [a.id, b.id], {}, null, null, d.combatDeclare.ciblesAttaque, { attaqueDeclaree: true });
  assert.equal(res.ok, true);
  assert.ok(res.resume.coupsRapides.some(c => c.attaquantId === b.id && c.cibleId === pose.entite.id));
  assert.equal(pose.entite.pv, 1, 'le Veilleur prend la frappe de 2');
  assert.equal(d[attaque].creatures.some(e => e.id === b.id), false, 'sa Contre-attaque abat l’attaquant');
});

test('sans attaque ciblée, le Veilleur arrive sans choix', () => {
  const { d, defenseur } = scene(); d.combatDeclare.ciblesAttaque = {};
  const pose = rpgJouerCreature(d, defenseur, 'veilleur-du-dernier-crepuscule', null, { cibleDifferee: true });
  assert.equal(pose.ok, true); assert.ok(!d.arriveeEnAttente);
});

test('interception arbitrée en PvP pour chacun des deux sièges', () => {
  for (const defenseur of ['joueur', 'sorcier']) {
    const { d, a, b, cible, attaque } = scene(defenseur);
    d.pvp = true; d.phase = 'blocage'; d.mulliganFait = { joueur: true, sorcier: true };
    const pose = rpgPvpAppliquer(d, defenseur, { type: 'jouer-carte', carteId: 'veilleur-du-dernier-crepuscule', cibleDifferee: true });
    assert.equal(pose.ok, true);
    assert.equal(rpgPvpAppliquer(d, attaque, { type: 'resoudre-arrivee', cibleId: a.id }).ok, false);
    assert.equal(rpgPvpAppliquer(d, defenseur, { type: 'resoudre-arrivee', cibleId: b.id }).ok, true);
    assert.equal(d.combatDeclare.ciblesAttaque[a.id], cible.id);
    assert.equal(d.combatDeclare.ciblesAttaque[b.id], d[defenseur].creatures.find(e => e.carteId === "veilleur-du-dernier-crepuscule").id);
  }
});

test('PvP : déclaration, arrivée, choix et résolution traversent l’arbitre', () => {
  for (const defenseur of ['joueur', 'sorcier']) {
    const { d, a, b, cible, attaque } = scene(defenseur);
    d.combatDeclare = null; d.phase = 'principale1'; d.pvp = true; d.fenetreReponse = false;
    d.mulliganFait = { joueur: true, sorcier: true };
    assert.equal(rpgPvpAppliquer(d, attaque, { type: 'attaquer', declarer: true,
      attaquants: [a.id, b.id], ciblesAttaque: { [a.id]: cible.id, [b.id]: cible.id } }).ok, true);
    assert.equal(rpgPvpAppliquer(d, defenseur, { type: 'jouer-carte', carteId: 'veilleur-du-dernier-crepuscule', cibleDifferee: true }).ok, true);
    const veilleur = d[defenseur].creatures.find(e => e.carteId === 'veilleur-du-dernier-crepuscule');
    assert.equal(rpgPvpAppliquer(d, defenseur, { type: 'resoudre-arrivee', cibleId: b.id }).ok, true);
    assert.equal(d.combatDeclare.ciblesAttaque[b.id], veilleur.id);
    assert.equal(rpgPvpAppliquer(d, defenseur, { type: 'bloquer', blocages: {} }).ok, true);
    assert.equal(d.combatDeclare, null);
    assert.ok(d.log.some(l => l.includes('intercepte')));
  }
});
