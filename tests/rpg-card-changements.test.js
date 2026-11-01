import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cardById, RPG_CREATURE_CARDS, RPG_HERO_CARDS, RPG_TOUR_CARDS, RPG_MAGIE_CARDS, RPG_DUEL_CARDS } from '../src/games/rpgCards.js';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgLancerAttaque,
  rpgBlesserCreature, rpgFinDeTour, rpgReglerHasard, rpgResoudreContresortBoualem,
  rpgResoudreArriveeCiblee, arriveeCiblePortee,
} from '../src/games/rpgDuel.js';
import { cardArt, cardArtFurie } from '../src/games/rpgCardArt.js';

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
  assert.equal(values('braise-et-sable').effet.coupCritique, 0.25);
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

test('la Völva arrive en soignant 3 PV à une créature alliée ciblée', () => {
  const carte = cardById('volva-soigneuse');
  assert.deepEqual(carte.arrivee, {
    type: 'soin-creatures', amount: 3, cible: 'creature-amie', choisirCible: true, cibleSoi: true,
  });
  assert.match(carte.text, /Quand la Völva arrive : une créature alliée ciblée — ou elle-même — récupère 3 PV\./);
  assert.equal(arriveeCiblePortee(carte), 'allie', 'la table allume les alliés, pas les adversaires');

  // Le soin ne panse QUE la créature désignée : sa voisine blessée garde sa plaie.
  const d = duel();
  const blessee = poser(d, 'joueur', 'cavalier-amazigh-du-desert');
  const voisine = poser(d, 'joueur', 'momie-de-lin');
  rpgBlesserCreature(d, 'joueur', blessee.id, 2);
  rpgBlesserCreature(d, 'joueur', voisine.id, 2);
  const pvBlessee = blessee.pv;
  const pvVoisine = voisine.pv;
  d.joueur.main.push('volva-soigneuse');
  const pose = rpgJouerCreature(d, 'joueur', 'volva-soigneuse', null, { cibleDifferee: true });
  assert.equal(pose.ok, true, 'la Völva entre en jeu');
  assert.ok(d.arriveeEnAttente, 'sa cible d’arrivée attend d’être désignée');
  assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', blessee.id).ok, true);
  assert.equal(blessee.pv, Math.min(blessee.pvMax, pvBlessee + 3), 'la cible récupère 3 PV');
  assert.equal(voisine.pv, pvVoisine, 'la voisine n’est pas soignée');
});

test('la Völva seule sur la table se soigne elle-même, sans perdre son arrivée', () => {
  const d = duel();
  d.joueur.main.push('volva-soigneuse');
  const pose = rpgJouerCreature(d, 'joueur', 'volva-soigneuse', null, { cibleDifferee: true });
  assert.equal(pose.ok, true);
  assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', pose.entite.id).ok, true,
    'elle-même est une cible légale');
  assert.match(d.log.at(-1), /plus de blessure à refermer/, 'le clic n’est pas perdu en silence');
});

test('la Völva a sa peinture de Furie, livrée et révisée', () => {
  const carte = cardById('volva-soigneuse');
  assert.equal(cardArtFurie(carte), '/cards/volva-soigneuse-furie.jpg?v=neige-furie-volva-v1');
  assert.equal(cardArt(carte), '/cards/volva-soigneuse.jpg?v=volva-soigneuse-souls-v1',
    'la face calme garde sa peinture');
  assert.ok(existsSync(fileURLToPath(
    new URL('../public/cards/volva-soigneuse-furie.jpg', import.meta.url),
  )), 'volva-soigneuse-furie.jpg est livré avec le jeu');
});

test('la Furie de la Völva ne soigne plus personne : elle garde son +2 ATQ', () => {
  const d = duel();
  const völva = poser(d, 'joueur', 'volva-soigneuse');
  const amie = poser(d, 'joueur', 'chien-du-guet');
  rpgBlesserCreature(d, 'joueur', amie.id, 1);
  const pvAmie = amie.pv;
  rpgBlesserCreature(d, 'joueur', völva.id, 1);
  assert.equal(völva.furieDeclenchee, true, 'sa Furie s’allume toujours');
  assert.equal(völva.atk, 4, 'la Furie 2 ajoute +2 ATQ');
  assert.equal(amie.pv, pvAmie, 'la montée en furie ne soigne plus la rangée');
  // Le champ `soinFurie` a disparu du catalogue : plus aucune carte ne s'en
  // sert, et le moteur ne le lit plus.
  for (const carte of RPG_CREATURE_CARDS) {
    assert.equal(carte.soinFurie, undefined, `${carte.id} ne déclare plus de soin de Furie`);
  }
});

test('Tour de Neige gèle à son arrivée, mais pas en bloquant', () => {
  const d = duel();
  const attaquant = poser(d, 'joueur', 'dame-des-neuf-mondes');
  d.sorcier.main.push('tour-de-neige');
  const resultat = rpgJouerCreature(d, 'sorcier', 'tour-de-neige', attaquant.id);
  assert.equal(resultat.ok, true);
  const tour = resultat.entite;
  assert.ok(attaquant.gelToursRestants > 0, 'le gel d’arrivée reste actif');
  assert.equal(cardById('tour-de-neige').combat, undefined, 'aucun effet de gel au blocage');
  attaquant.gelToursRestants = 0;
  attaquant.ready = true; tour.ready = true;
  attaquant.coupRapide = false; // exercer le blocage ordinaire, pas l'Attaque ciblée
  const avant = tour.pv;
  const combat = rpgLancerAttaque(d, 'joueur', [attaquant.id], { [attaquant.id]: [tour.id] });
  assert.equal(combat.ok, true);
  assert.equal(attaquant.gelToursRestants, 0, 'bloquer ne gèle pas la Dame');
  assert.equal(tour.pv, avant - attaquant.atk, 'la Dame inflige ses dégâts normalement');
});

test('la Dame ne gèle pas lorsqu’une Attaque ciblée contre la Tour de Neige rate', () => {
  const d = duel();
  const dame = poser(d, 'joueur', 'dame-des-neuf-mondes');
  d.sorcier.main.push('tour-de-neige');
  const tour = rpgJouerCreature(d, 'sorcier', 'tour-de-neige', dame.id).entite;
  dame.gelToursRestants = 0; dame.ready = true;
  const pvTour = tour.pv;
  rpgReglerHasard(d, () => 0);
  const res = rpgLancerAttaque(d, 'joueur', [dame.id], {}, null, null, { [dame.id]: tour.id });
  assert.equal(res.ok, true);
  assert.equal(res.resume.coupsRapides[0].rate, true);
  assert.equal(dame.gelToursRestants, 0);
  assert.equal(tour.pv, pvTour);
});

test('Tour des Flots renvoie son attaquant après les blessures', () => {
  const d = duel();
  const attaquant = poser(d, 'joueur', 'chien-du-guet');
  d.sorcier.main.push('tour-des-flots');
  const tour = rpgJouerCreature(d, 'sorcier', 'tour-des-flots').entite;
  attaquant.ready = true; tour.ready = true;
  rpgReglerHasard(d, () => 0.99);
  const result = rpgLancerAttaque(d, 'joueur', [attaquant.id], { [attaquant.id]: [tour.id] });
  assert.equal(result.ok, true);
  assert.equal(tour.pv, tour.pvMax - 2);
  assert.ok(d.joueur.main.includes('chien-du-guet'));
  assert.equal(d.joueur.creatures.includes(attaquant), false);
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
