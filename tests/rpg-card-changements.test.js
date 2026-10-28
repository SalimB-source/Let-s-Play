import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_CREATURE_CARDS, RPG_HERO_CARDS, RPG_TOUR_CARDS, RPG_MAGIE_CARDS, RPG_DUEL_CARDS } from '../src/games/rpgCards.js';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgLancerAttaque,
  rpgBlesserCreature, rpgFinDeTour, rpgReglerHasard, rpgResoudreContresortBoualem,
} from '../src/games/rpgDuel.js';

function duel() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = { eau: 50, sable: 50, braise: 50, neige: 50, tenebres: 50 };
  return d;
}
function poser(d, camp, id) {
  d[camp].main.push(id);
  const resultat = rpgJouerCreature(d, camp, id);
  assert.equal(resultat.ok, true, `${id} se joue`);
  return resultat.entite;
}

test('fiches révisées et cartes ajoutées sont bien dans le catalogue', () => {
  const values = (id) => cardById(id);
  assert.equal(values('seigneur-des-machoires').overkill, true);
  assert.equal(values('le-brulot').cost, 2);
  assert.deepEqual([values('tercio-de-cuivre').atk, values('tercio-de-cuivre').def], [1, 4]);
  assert.deepEqual(values('tercio-de-cuivre').croissanceTour, { atk: 1, maximum: 3 });
  assert.equal(values('la-barbe-rousse').contreAttaque, true);
  assert.equal(values('cavalier-amazigh-du-desert').esquive, true);
  assert.equal(values('berserk-des-trois-hivers').overkill, true);
  assert.equal(values('berserk-du-crepuscule').overkill, true);
  assert.equal(values('feriel').cost, 3);
  assert.deepEqual([values('ifrit-al-ahmar').atk, values('ifrit-al-ahmar').def], [3, 7]);
  assert.equal(values('ifrit-al-ahmar').protection.contre, 'neige');
  assert.equal(values('dame-des-neuf-mondes').coupRapide, true);
  assert.equal(values('pere-des-corbeaux').arrivee.coutMax, 4);
  assert.equal(values('serpent-du-monde').arrivee.pioche, 3);
  assert.equal(values('hurlement-du-blizzard').effet.gelChance, 0.25);
  assert.equal(values('poigne-de-givre').cost, 2);
  assert.equal(values('verglas').effet.amount, 2);
  assert.equal(values('embuscade').effet.tours, 1);
  assert.deepEqual([values('salem').atk, values('salem').def], [3, 4]);
  assert.equal(values('salem').coupRapide, true);
  assert.deepEqual([values('tour-de-neige').atk, values('tour-de-neige').def], [0, 3]);
  assert.deepEqual([values('tour-des-flots').atk, values('tour-des-flots').def], [0, 4]);
  assert.ok(RPG_CREATURE_CARDS.some((c) => c.id === 'volva-soigneuse'));
  assert.ok(RPG_DUEL_CARDS.some((c) => c.id === 'braise-et-sable'));
  assert.deepEqual([values('volva-soigneuse').cost, values('volva-soigneuse').atk, values('volva-soigneuse').def, values('volva-soigneuse').furie], [3, 2, 3, 2]);
  assert.equal(values('braise-et-sable').effet.atk, 1);
  assert.equal(values('braise-et-sable').effet.coupRapide, true);
  assert.equal(values('braise-et-sable').effet.coupCritique, 0.3);
});

test('Tercio gagne +1/+0 au début de ses tours, jusqu’à +3/+0', () => {
  const d = duel();
  const tercio = poser(d, 'joueur', 'tercio-de-cuivre');
  assert.equal(tercio.atk, 1);
  for (let tour = 1; tour <= 4; tour += 1) {
    rpgFinDeTour(d);
    rpgFinDeTour(d);
    assert.equal(tercio.atk, 1 + Math.min(tour, 3));
  }
});

test('Tiziri cherche une Magie Rapide ou une Sorcellerie à son arrivée', () => {
  const d = duel();
  d.joueur.deck = ['grand-voile-blanc', 'hurlement-du-blizzard'];
  const tiziri = poser(d, 'joueur', 'tiziri-du-djurdjura');
  assert.ok(tiziri);
  assert.deepEqual(d.joueur.main, ['grand-voile-blanc']);
  assert.deepEqual(d.joueur.deck, ['hurlement-du-blizzard']);
});

test('Anqa balaie les ennemis et soigne les alliés lorsqu’elle revient', () => {
  const d = duel();
  const anqa = poser(d, 'joueur', 'anqa-des-braises');
  const amie = poser(d, 'joueur', 'chien-du-guet');
  const ennemi = poser(d, 'sorcier', 'dune-marchante');
  rpgBlesserCreature(d, 'joueur', amie.id, 1);
  rpgBlesserCreature(d, 'joueur', anqa.id, 4);
  assert.equal(d.joueur.retoursProgrammes[0].toursRestants, 4);
  for (let i = 0; i < 4; i += 1) rpgFinDeTour(d);
  const renaissance = d.joueur.creatures.find((e) => e.carteId === 'anqa-des-braises');
  assert.ok(renaissance);
  assert.equal(ennemi.pv, 3, 'la créature adverse subit 1 dégât au retour');
  assert.equal(amie.pv, 2, 'la créature alliée blessée récupère 1 PV');
});

test('la Furie de la Völva soigne les autres créatures alliées de 1', () => {
  const d = duel();
  const völva = poser(d, 'joueur', 'volva-soigneuse');
  const amie = poser(d, 'joueur', 'chien-du-guet');
  rpgBlesserCreature(d, 'joueur', amie.id, 1);
  rpgBlesserCreature(d, 'joueur', völva.id, 1);
  assert.equal(völva.furieDeclenchee, true);
  assert.equal(völva.atk, 4, 'la Furie 2 ajoute +2 ATQ');
  assert.equal(amie.pv, 2, 'l’alliée récupère 1 PV');
  assert.equal(amie.def, 2, 'la défense courante suit les PV soignés');
});

test('Tour de Neige gèle son attaquant bloqueur et Tour des Flots le renvoie en main', () => {
  for (const [tourId, expected] of [['tour-de-neige', 'gel'], ['tour-des-flots', 'main']]) {
    const d = duel();
    const attaquant = poser(d, 'joueur', 'chien-du-guet');
    d.sorcier.main.push(tourId);
    const towerResult = rpgJouerCreature(d, 'sorcier', tourId, attaquant.id);
    assert.equal(towerResult.ok, true);
    const tower = towerResult.entite;
    attaquant.gelToursRestants = 0; // ne teste que le déclencheur de blocage, pas l’arrivée de la Tour
    attaquant.ready = true;
    tower.ready = true;
    rpgReglerHasard(d, () => 0.99);
    const result = rpgLancerAttaque(d, 'joueur', [attaquant.id], { [attaquant.id]: [tower.id] });
    assert.equal(result.ok, true);
    if (expected === 'gel') assert.ok(attaquant.gelToursRestants > 0);
    else {
      assert.equal(tower.pv, tower.pvMax - 2, 'la Tour encaisse d’abord les dégâts de combat de l’attaquant');
      assert.ok(d.joueur.main.includes('chien-du-guet'), 'le renvoi se résout après les blessures');
      assert.equal(d.joueur.creatures.includes(attaquant), false);
    }
  }
});


test('Boualem contre l’effet ciblé, puis c’est son contrôleur qui désigne la nouvelle cible', () => {
  const d = duel();
  const boualem = poser(d, 'joueur', 'boualem');
  const autreCible = poser(d, 'joueur', 'chien-du-guet');
  d.sorcier.main.push('poigne-de-givre');
  d.tour = 'sorcier';
  const resultat = rpgLancerMagie(d, 'sorcier', 'poigne-de-givre', boualem.id);
  assert.equal(resultat.ok, true);
  assert.equal(boualem.boualemContresortDisponible, false);
  assert.equal(boualem.pv, boualem.pvMax, 'l’effet ne reste pas sur Boualem');
  // Le lanceur ne choisit rien : le sort attend la victime désignée par le
  // camp qui joue Boualem.
  assert.equal(autreCible.pv, autreCible.pvMax, 'rien n’est encore frappé');
  assert.equal(d.boualemEnAttente?.cote, 'joueur');
  // Un clic hors des cibles légales est refusé.
  assert.equal(rpgResoudreContresortBoualem(d, 'joueur', boualem.id).raison, 'cible');
  const choix = rpgResoudreContresortBoualem(d, 'joueur', autreCible.id);
  assert.equal(choix.ok, true);
  assert.equal(d.boualemEnAttente, null);
  assert.equal(autreCible.pv, autreCible.pvMax - 2, 'le sort relancé frappe la cible choisie par le joueur de Boualem');
});

test('Feux de kitsune fait 4 dégâts à une cible ou 2 dégâts à chacune de deux', () => {
  for (const separate of [false, true]) {
    const d = duel();
    const a = poser(d, 'sorcier', 'chien-du-guet');
    const b = poser(d, 'sorcier', 'dune-marchante');
    d.joueur.main.push('feux-de-kitsune');
    const ok = rpgLancerMagie(d, 'joueur', 'feux-de-kitsune', a.id, separate ? b.id : null);
    assert.equal(ok.ok, true);
    if (separate) {
      assert.equal(d.sorcier.creatures.includes(a), false, '2 dégâts détruisent le 2/2');
      assert.equal(b.pv, 2, 'la seconde cible reçoit 2 dégâts');
    } else {
      assert.equal(d.sorcier.creatures.includes(a), false, '4 dégâts détruisent la cible unique');
      assert.equal(b.pv, 4, 'la seconde créature reste intacte');
    }
  }
});
