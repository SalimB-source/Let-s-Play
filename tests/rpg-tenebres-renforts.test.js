import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { cardById, cardColors, RPG_CREATURE_CARDS, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { RPG_TENEBRES_CREATURES, RPG_TENEBRES_FIGURES } from '../src/games/rpgTenebres.js';
import { cardArt } from '../src/games/rpgCardArt.js';
import { COLLECTION_DEPART, carteReveleePar } from '../src/games/rpgCollection.js';
import { carteAuVivier, carteFavoriseeRayon } from '../src/games/rpgBoosters.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { rpgBlesserCreature, rpgDefausserCarte, rpgJouerCreature, rpgLancerAttaque, rpgNouveauDuel } from '../src/games/rpgDuel.js';

const renforts = [
  ['porteur-de-la-plume', 1, 1, 2, 'commune', 'necropole-1'],
  ['scarabee-du-natron', 2, 1, 2, 'commune', 'necropole-1'],
  ['veuve-des-urnes', 3, 2, 3, 'inhabituelle', 'necropole-2'],
  ['gardien-des-sept-sceaux', 4, 3, 4, 'commune', 'necropole-2'],
  ['lecteur-du-dernier-nom', 5, 3, 4, 'rare', 'necropole-3'],
];

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) {
    d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 20]));
  }
  return d;
}
function poser(d, cote, id, options = {}) {
  d[cote].main.push(id);
  const resultat = rpgJouerCreature(d, cote, id, null, options);
  assert.equal(resultat.ok, true, `${id}: ${resultat.raison}`);
  return resultat.entite;
}

test('cinq créatures mono-Ténèbres complètent chaque coût de 1 à 5, avec art et Nécropole', () => {
  assert.equal(RPG_TENEBRES_CREATURES.length, 22);
  assert.equal(RPG_CREATURE_CARDS.length, 138);
  assert.equal(RPG_TENEBRES_FIGURES.length, 5, 'les figures de fin de set restent distinctes');
  for (const [id, cost, atk, def, rarity, etage] of renforts) {
    const carte = cardById(id);
    assert.deepEqual([carte.cost, carte.atk, carte.def, carte.rarity, carte.set],
      [cost, atk, def, rarity, 'balance-des-heures'], id);
    assert.deepEqual(cardColors(carte), ['tenebres'], id);
    assert.equal(carte.art, id);
    assert.equal(carte.reactionTourAdverse, undefined);
    assert.ok(RPG_TENEBRES_CREATURES.some((candidate) => candidate.id === id), id);
    assert.ok(existsSync(new URL(`../public/cards/${id}.jpg`, import.meta.url)), id);
    assert.match(cardArt(id), /tenebres-renforts-v1$/);
    assert.equal(carteAuVivier(id), true, id);
    assert.equal(carteFavoriseeRayon('set-egyptiens', carte), true, id);
    assert.ok(!COLLECTION_DEPART.includes(id), 'la dotation ne livre pas le set Ténèbres');
    assert.equal(carteReveleePar(id)?.etageId, etage, id);
  }
});

test('le Porteur soigne à sa mort et le Scarabée laisse un Shabti', () => {
  const d = duel(); d.joueur.pv = 10;
  const porteur = poser(d, 'joueur', 'porteur-de-la-plume');
  const scarabee = poser(d, 'joueur', 'scarabee-du-natron');
  assert.equal(d.joueur.creatures.filter((c) => c.carteId === 'shabti').length, 0);
  rpgBlesserCreature(d, 'joueur', porteur.id, porteur.pv);
  assert.equal(d.joueur.pv, 11);
  rpgBlesserCreature(d, 'joueur', scarabee.id, scarabee.pv);
  const shabtis = d.joueur.creatures.filter((c) => c.carteId === 'shabti');
  assert.equal(shabtis.length, 1);
  assert.deepEqual([shabtis[0].atk, shabtis[0].pv, shabtis[0].ready], [1, 1, false]);
});

test('la Veuve perçoit son Tribut ; le Gardien attire les Attaques ciblées', () => {
  const d = duel(); d.joueur.pv = 10;
  const veuve = poser(d, 'joueur', 'veuve-des-urnes'); veuve.ready = true;
  assert.deepEqual(pastillesPourCarte(cardById('veuve-des-urnes')).map((p) => p.cle), ['tribut']);
  assert.equal(rpgLancerAttaque(d, 'joueur', [veuve.id], {}).ok, true);
  assert.deepEqual([d.sorcier.pv, d.joueur.pv], [22, 11]);

  const protection = duel();
  const gardien = poser(protection, 'joueur', 'gardien-des-sept-sceaux');
  const autre = poser(protection, 'joueur', 'porteur-de-la-plume');
  const assaillant = poser(protection, 'sorcier', 'chien-du-guet');
  assaillant.ready = true; assaillant.coupRapide = true;
  assert.equal(gardien.defenseur, true);
  assert.deepEqual(pastillesPourCarte(cardById('gardien-des-sept-sceaux')).map((p) => p.cle), ['defenseur']);
  assert.equal(rpgLancerAttaque(protection, 'sorcier', [assaillant.id], null, null, null,
    { [assaillant.id]: autre.id }).raison, 'defenseur');
  assert.equal(rpgLancerAttaque(protection, 'sorcier', [assaillant.id], null, null, null,
    { [assaillant.id]: gardien.id }).ok, true);
});

test('le Lecteur se paie par un sacrifice et ouvre le choix de défausse après deux pioches', () => {
  const d = duel();
  const offrande = poser(d, 'joueur', 'porteur-de-la-plume');
  d.joueur.deck = ['chacal-du-seuil', 'scribe-des-feuillets'];
  const lecteur = poser(d, 'joueur', 'lecteur-du-dernier-nom', { sacrificeId: offrande.id });
  assert.ok(d.joueur.creatures.some((c) => c.id === lecteur.id));
  assert.ok(!d.joueur.creatures.some((c) => c.id === offrande.id));
  assert.equal(d.joueur.deck.length, 0);
  assert.deepEqual([...d.joueur.main].sort(), ['chacal-du-seuil', 'scribe-des-feuillets'].sort());
  assert.equal(d.defausseEnAttente?.restant, 1);
  assert.equal(d.defausseEnAttente?.cote, 'joueur');
  assert.equal(rpgDefausserCarte(d, 'joueur', 'chacal-du-seuil').ok, true);
  assert.equal(d.joueur.main.length, 1);
  assert.equal(d.defausseEnAttente, null);
});
