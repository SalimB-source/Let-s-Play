import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_MANA_ESSAI_CHAMP_MAX,
  RPG_MANA_ESSAI_DECKS,
  RPG_MANA_ESSAI_MAX,
  RPG_MANA_ESSAI_TAILLE,
  RPG_MODE_MANA_ESSAI,
  adversaireManaEssai,
  validerDeckManaEssai,
} from '../src/games/rpgManaEssai.js';
import { cardById, cardColorCost, rpgValiderDeck, RPG_DECK_JOUEUR_BASE, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import {
  rpgChoisirCouleurMana,
  rpgDemarrerManaEssai,
  rpgEngagerTerrain,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgLancerMagie,
  rpgMulligan,
  rpgMulliganSorcier,
  rpgNouveauDuel,
  rpgOuvrirFinDeTour,
  rpgPeutPayer,
  rpgPoserTerrain,
  rpgVainqueur,
} from '../src/games/rpgDuel.js';
import { choisirCouleurManaIA, choisirMulliganIA } from '../src/games/rpgAI.js';

const rng = () => 0.5;
const [mono, bi, tri] = RPG_MANA_ESSAI_DECKS;
const nouveau = (joueur = mono, sorcier = adversaireManaEssai(joueur)) => rpgNouveauDuel({
  joueurDeck: joueur.cardIds, sorcierDeck: sorcier.cardIds,
  joueurCouleurs: joueur.elements, sorcierCouleurs: sorcier.elements,
  modeMana: RPG_MODE_MANA_ESSAI, rng,
});
const mulligans = (duel, indices = []) => {
  assert.equal(rpgMulligan(duel, 'joueur', indices, rng).ok, true);
  assert.equal(rpgMulliganSorcier(duel, rng).ok, true);
};
const total = (camp) => Object.values(camp.manaMax).reduce((somme, quantite) => somme + quantite, 0);

test('trois decks de 30 cartes sans terrain et hors économie ; le format 40 cartes reste valide', () => {
  assert.equal(RPG_MANA_ESSAI_DECKS.length, 3);
  assert.deepEqual(RPG_MANA_ESSAI_DECKS.map((deck) => deck.elements.length), [1, 2, 3]);
  for (const deck of RPG_MANA_ESSAI_DECKS) {
    assert.equal(deck.cardIds.length, RPG_MANA_ESSAI_TAILLE);
    assert.deepEqual(validerDeckManaEssai(deck), { ok: true }, deck.name);
    assert.ok(deck.cardIds.every((id) => cardById(id)?.kind !== 'terrain'));
    assert.equal(deck.cardIds.filter((id) => id === 'djinn-du-souk' || id === 'boussole-du-hoggar').length, 0);
    assert.ok(adversaireManaEssai(deck) !== deck);
  }
  assert.equal(rpgValiderDeck(RPG_DECK_JOUEUR_BASE).ok, true);
  assert.equal(rpgValiderDeck(mono.cardIds).ok, false);
  assert.equal(validerDeckManaEssai({ ...mono, cardIds: mono.cardIds.slice(1) }).ok, false);
  assert.equal(validerDeckManaEssai({ ...mono, cardIds: [...mono.cardIds.slice(1), 'desert'] }).ok, false);
  assert.equal(validerDeckManaEssai({ ...mono, cardIds: [...mono.cardIds.slice(1), 'trait-de-braise'] }).ok, false);
  assert.match(validerDeckManaEssai({ ...mono, cardIds: [...mono.cardIds.slice(1), 'boussole-du-hoggar'] }).raison, /effet lié aux terrains/);
  assert.match(validerDeckManaEssai({ ...bi, cardIds: [...bi.cardIds.slice(1), 'djinn-du-souk'] }).raison, /effet lié aux terrains/);
  for (const carteId of ['boussole-du-hoggar', 'djinn-du-souk']) {
    assert.throws(() => rpgNouveauDuel({
      modeMana: RPG_MODE_MANA_ESSAI,
      joueurDeck: [...mono.cardIds.slice(1), carteId],
      sorcierDeck: mono.cardIds,
      joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'], rng,
    }), /effet lié aux terrains/, `le moteur interdit ${carteId} même hors des decks de démonstration`);
  }
});

test('mana du tour 1 uniquement après les deux mulligans ; auto en mono, choix explicite en multi', () => {
  const duel = nouveau(mono);
  assert.equal(duel.joueur.main.length, 5);
  assert.equal(duel.sorcier.main.length, 5);
  assert.equal(duel.joueur.deck.length, 25);
  assert.equal(total(duel.joueur), 0);
  assert.deepEqual(duel.joueur.manaSources, [], 'dix emplacements éteints avant le premier tour');
  assert.equal(rpgDemarrerManaEssai(duel).ok, false);
  assert.equal(rpgChoisirCouleurMana(duel, 'joueur', 'sable').ok, false);
  assert.equal(rpgPeutPayer(duel.joueur, cardById('chien-du-guet')), false);
  assert.equal(rpgOuvrirFinDeTour(duel), null);
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur', 'pas de tour sauté pendant le mulligan');
  assert.equal(rpgMulligan(duel, 'joueur', [0, 2], rng).piochees.length, 2);
  assert.equal(total(duel.joueur), 0);
  assert.equal(rpgDemarrerManaEssai(duel).ok, false, 'le sorcier doit aussi mulliganer');
  assert.equal(rpgMulliganSorcier(duel, rng).ok, true);
  assert.equal(duel.joueur.main.length, 5);
  assert.equal(rpgDemarrerManaEssai(duel).ok, true);
  assert.deepEqual(duel.joueur.manaMax, { braise: 0, eau: 0, sable: 1, neige: 0 });
  assert.deepEqual(duel.joueur.manaSources, ['sable']);
  assert.equal(duel.joueur.mana.sable, 1);
  assert.equal(duel.joueur.deck.length, 25, 'aucune pioche de sixième carte au tour 1');
  assert.equal(duel.joueur.manaChoixEnAttente, false);
  assert.equal(rpgDemarrerManaEssai(duel).ok, false, 'le démarrage ne donne pas de second mana');

  const multi = nouveau(bi);
  mulligans(multi);
  assert.equal(rpgDemarrerManaEssai(multi).choixEnAttente, true);
  assert.equal(total(multi.joueur), 0);
  assert.equal(rpgPeutPayer(multi.joueur, { cost: 0 }), false, 'choix obligatoire même pour un coût nul');
  assert.equal(rpgChoisirCouleurMana(multi, 'joueur', 'eau').ok, false, 'couleur hors identité');
  assert.equal(rpgChoisirCouleurMana(multi, 'sorcier', 'braise').ok, false, 'pas de choix hors de son tour');
  assert.equal(rpgChoisirCouleurMana(multi, 'joueur', 'sable').ok, true);
  assert.equal(rpgChoisirCouleurMana(multi, 'joueur', 'braise').ok, false, 'un nouveau mana par tour');

  // Neige n'est pas dans les trois decks du laboratoire, mais elle fonctionne
  // aussi si un duel d'essai utilise cette identité : la quatrième teinte a un sens.
  const neige = rpgNouveauDuel({
    modeMana: RPG_MODE_MANA_ESSAI,
    joueurDeck: Array(5).fill('loup-des-neiges'),
    sorcierDeck: Array(5).fill('loup-des-neiges'),
    joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng,
  });
  mulligans(neige);
  assert.equal(rpgDemarrerManaEssai(neige).ok, true);
  assert.deepEqual(neige.joueur.manaSources, ['neige']);
  rpgFinDeTour(neige);
  assert.deepEqual(neige.sorcier.manaSources, ['neige'], 'l’IA mono Neige allume aussi son premier mana');
});

test('paiement des coûts colorés ; sources de chaque couleur conservées, surplus non reporté', () => {
  const duel = nouveau(bi);
  mulligans(duel);
  rpgDemarrerManaEssai(duel);
  assert.equal(rpgChoisirCouleurMana(duel, 'joueur', 'sable').ok, true);
  const hybride = cardById('djinn-de-foudre');
  assert.deepEqual(cardColorCost(hybride), { sable: 1, braise: 1 });
  assert.equal(rpgPeutPayer(duel.joueur, hybride), false, 'sable seul ne paie pas la Braise');
  assert.equal(rpgPoserTerrain(duel, 'joueur', 'desert').ok, false);
  assert.equal(rpgEngagerTerrain(duel, 'joueur', 'desert').ok, false);

  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.manaChoixEnAttente, false, 'l’IA choisit seule sa première couleur');
  assert.equal(total(duel.sorcier), 1);
  assert.equal(duel.joueur.mana.sable, 1, 'une réponse rapide adverse peut utiliser le mana restant');
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.manaChoixEnAttente, true);
  assert.equal(duel.joueur.mana.sable, 1, 'la réserve est rechargée, pas augmentée des restes');
  assert.equal(rpgPeutPayer(duel.joueur, hybride), false, 'choix requis avant de jouer');
  assert.equal(rpgChoisirCouleurMana(duel, 'joueur', 'braise').ok, true);
  assert.deepEqual(duel.joueur.manaMax, { braise: 1, eau: 0, sable: 1, neige: 0 });
  assert.deepEqual(duel.joueur.manaSources, ['sable', 'braise'], 'les orbes gardent l’ordre des choix, pas celui des couleurs');
  assert.equal(rpgPeutPayer(duel.joueur, hybride), true);
  duel.joueur.main.push('djinn-de-foudre');
  const pose = rpgJouerCreature(duel, 'joueur', 'djinn-de-foudre');
  assert.equal(pose.ok, true);
  assert.deepEqual(duel.joueur.mana, { braise: 0, eau: 0, sable: 0, neige: 0 });
  assert.deepEqual(duel.joueur.manaSources, ['sable', 'braise'], 'dépenser assombrit mais ne supprime pas les orbes');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.mana.sable, 1);
  assert.equal(duel.joueur.mana.braise, 1, 'le paiement ne détruit pas la source acquise');
  assert.equal(duel.joueur.manaChoixEnAttente, true, 'un nouveau mana s’ajoute avant le prochain coup');
});

test('le générique dépense une autre couleur si possible, sans priver la carte de son pip ni changer le classique', () => {
  // Simule une réserve acquise sur plusieurs tours sans attendre l’IA entre
  // chaque source : capacité, réserve et ordre de la jauge restent cohérents.
  const repartir = (camp, sources) => {
    camp.manaSources = [...sources];
    camp.manaMax = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [
      couleur, sources.filter((source) => source === couleur).length,
    ]));
    camp.mana = { ...camp.manaMax };
    camp.manaChoixEnAttente = false;
  };
  const commencer = (deck) => {
    const duel = nouveau(deck);
    mulligans(duel);
    rpgDemarrerManaEssai(duel);
    rpgChoisirCouleurMana(duel, 'joueur', 'braise');
    return duel;
  };

  const braise = commencer(bi);
  repartir(braise.joueur, ['braise', 'sable', 'braise']);
  braise.joueur.main.push('ghul-des-cendres', 'ashigaru-des-braises');
  assert.equal(rpgPeutPayer(braise.joueur, cardById('ghul-des-cendres')), true);
  assert.equal(rpgJouerCreature(braise, 'joueur', 'ghul-des-cendres').ok, true);
  assert.deepEqual(braise.joueur.mana, { braise: 1, eau: 0, sable: 0, neige: 0 },
    'Ghul coûte un Braise et un générique : le Sable part avant le deuxième Braise');
  assert.deepEqual(braise.joueur.manaSources, ['braise', 'sable', 'braise'], 'les sources ne changent pas');
  assert.equal(rpgJouerCreature(braise, 'joueur', 'ashigaru-des-braises').ok, true,
    'le Braise préservé permet encore de jouer une autre carte colorée');

  const hybride = commencer(tri);
  repartir(hybride.joueur, ['braise', 'sable', 'eau', 'braise']);
  hybride.joueur.main.push('vent-rouge');
  assert.deepEqual(cardColorCost('vent-rouge'), { braise: 1, sable: 1 });
  assert.equal(rpgLancerMagie(hybride, 'joueur', 'vent-rouge').ok, true);
  assert.deepEqual(hybride.joueur.mana, { braise: 1, eau: 0, sable: 0, neige: 0 },
    'les deux pips hybrides sont payés, puis le générique utilise Eau');

  const sansAutreCouleur = commencer(bi);
  repartir(sansAutreCouleur.joueur, ['braise', 'braise']);
  sansAutreCouleur.joueur.main.push('ghul-des-cendres');
  assert.equal(rpgJouerCreature(sansAutreCouleur, 'joueur', 'ghul-des-cendres').ok, true);
  assert.equal(sansAutreCouleur.joueur.mana.braise, 0,
    'sans autre couleur disponible, le générique peut prendre le deuxième Braise');

  const ia = commencer(bi);
  rpgFinDeTour(ia);
  repartir(ia.sorcier, ['braise', 'sable', 'braise']);
  ia.sorcier.main.push('ghul-des-cendres');
  assert.equal(rpgJouerCreature(ia, 'sorcier', 'ghul-des-cendres').ok, true);
  assert.deepEqual(ia.sorcier.mana, { braise: 1, eau: 0, sable: 0, neige: 0 },
    'le sorcier paie lui aussi son générique avec une autre couleur');

  const classique = rpgNouveauDuel({ joueurDeck: ['ghul-des-cendres'], sorcierDeck: [], rng });
  classique.joueur.mana = { braise: 2, eau: 0, sable: 1, neige: 0 };
  assert.equal(rpgJouerCreature(classique, 'joueur', 'ghul-des-cendres').ok, true);
  assert.deepEqual(classique.joueur.mana, { braise: 0, eau: 0, sable: 1, neige: 0 },
    'le paiement des duels classiques conserve sa priorité historique');
});

test('plafond ferme à dix sources sans perdre la répartition ; l’IA acquiert aussi au plus dix', () => {
  const duel = nouveau(tri, bi);
  mulligans(duel);
  rpgDemarrerManaEssai(duel);
  rpgChoisirCouleurMana(duel, 'joueur', 'eau');
  for (let tour = 2; tour <= RPG_MANA_ESSAI_MAX + 2; tour += 1) {
    rpgFinDeTour(duel);
    rpgFinDeTour(duel);
    if (tour <= RPG_MANA_ESSAI_MAX) {
      assert.equal(duel.joueur.manaChoixEnAttente, true);
      const couleur = tour % 2 ? 'sable' : 'braise';
      assert.equal(rpgChoisirCouleurMana(duel, 'joueur', couleur).ok, true);
    } else {
      assert.equal(duel.joueur.manaChoixEnAttente, false);
      assert.equal(rpgChoisirCouleurMana(duel, 'joueur', 'eau').ok, false);
    }
    assert.equal(total(duel.joueur), Math.min(tour, RPG_MANA_ESSAI_MAX));
    assert.equal(duel.joueur.manaSources.length, Math.min(tour, RPG_MANA_ESSAI_MAX), 'une seule orbe nouvelle par tour');
    assert.equal(total(duel.sorcier), Math.min(tour - 1, RPG_MANA_ESSAI_MAX));
    assert.equal(duel.sorcier.manaSources.length, Math.min(tour - 1, RPG_MANA_ESSAI_MAX));
  }
  assert.deepEqual(duel.joueur.manaSources.slice(0, 4), ['eau', 'braise', 'sable', 'braise']);
  assert.equal(duel.joueur.manaMax.eau, 1, 'la source Eau choisie au tour 1 reste Eau');
  assert.equal(total(duel.joueur), 10);
  assert.ok(Object.values(duel.joueur.mana).every((n) => n <= 10));
});

test('carte chère jouable à huit manas (dont son pip Eau), pas avant', () => {
  const duel = nouveau(tri);
  mulligans(duel);
  rpgDemarrerManaEssai(duel);
  const cher = cardById('jormungandr');
  assert.equal(cher.cost, 8);
  rpgChoisirCouleurMana(duel, 'joueur', 'eau');
  assert.equal(rpgPeutPayer(duel.joueur, cher), false);
  for (let tour = 2; tour <= 8; tour += 1) {
    rpgFinDeTour(duel);
    rpgFinDeTour(duel);
    rpgChoisirCouleurMana(duel, 'joueur', 'sable');
    assert.equal(rpgPeutPayer(duel.joueur, cher), tour === 8, `tour ${tour}`);
  }
  duel.joueur.main.push(cher.id);
  assert.equal(rpgJouerCreature(duel, 'joueur', cher.id).ok, true);
  assert.equal(Object.values(duel.joueur.mana).reduce((a, b) => a + b, 0), 0);
});

test('paquet vide : fatigue croissante seulement pour la pioche de tour de l’essai', () => {
  const mini = { ...mono, cardIds: Array(5).fill('chien-du-guet') };
  const duel = nouveau(mini, mini);
  mulligans(duel);
  rpgDemarrerManaEssai(duel);
  assert.equal(duel.joueur.deck.length, 0);
  assert.equal(duel.joueur.pv, 25);
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.fatigue, 1);
  assert.equal(duel.sorcier.pv, 24);
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.fatigue, 1);
  assert.equal(duel.joueur.pv, 24);
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.fatigue, 2);
  assert.equal(duel.joueur.fatigue, 2);
  assert.equal(duel.joueur.pv, 22);
  assert.equal(rpgVainqueur(duel), null);

  const classique = rpgNouveauDuel({ joueurDeck: mini.cardIds, sorcierDeck: mini.cardIds, rng });
  assert.equal(classique.modeMana, undefined);
  assert.equal(classique.joueur.manaMax, undefined);
  assert.equal(classique.joueur.manaSources, undefined, 'aucun changement des duels classiques');
  rpgFinDeTour(classique);
  rpgFinDeTour(classique);
  assert.equal(classique.joueur.pv, 25);
  assert.equal(classique.sorcier.pv, 25);
});

test('IA : choix de couleur d’après les pips en main et mulligan sans rechercher de terrain', () => {
  const duel = nouveau(mono, tri);
  duel.sorcier.main = ['eau-de-la-source', 'ressac', 'sonneur-fele', 'djinn-de-foudre', 'jormungandr'];
  assert.equal(choisirCouleurManaIA(duel), 'eau');
  assert.deepEqual(choisirMulliganIA(duel), [4], 'la grosse carte repart, pas toutes les cartes sans terrain');
  mulligans(duel);
  rpgDemarrerManaEssai(duel);
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.manaMax.eau, 1);
});

test('champ limité à cinq créatures : la sixième exige un sacrifice choisi, le classique reste libre', () => {
  const duel = nouveau(mono);
  mulligans(duel);
  rpgDemarrerManaEssai(duel);
  duel.sorcier.main = [];
  const payerSable = () => {
    duel.joueur.mana = { braise: 0, eau: 0, sable: 5, neige: 0 };
    duel.joueur.manaChoixEnAttente = false;
  };
  for (let place = 0; place < RPG_MANA_ESSAI_CHAMP_MAX; place += 1) {
    payerSable();
    duel.joueur.main.push('tislit-des-aures');
    assert.equal(rpgJouerCreature(duel, 'joueur', 'tislit-des-aures').ok, true, `place ${place + 1}`);
    assert.equal(duel.joueur.creatures.length, place + 1);
  }
  payerSable();
  duel.joueur.main.push('fennec-des-decombres');
  const refuse = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres');
  assert.equal(refuse.ok, false, 'la sixième créature attend le sacrifice');
  assert.equal(refuse.raison, 'champ-plein');
  assert.equal(duel.joueur.main.includes('fennec-des-decombres'), true, 'la carte reste en main');
  assert.equal(duel.joueur.creatures.length, RPG_MANA_ESSAI_CHAMP_MAX);

  const victime = duel.joueur.creatures[1];
  const cimetiereAvant = duel.joueur.cimetiere.length;
  const pose = rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres', null, { sacrificeId: victime.id });
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.creatures.length, RPG_MANA_ESSAI_CHAMP_MAX, 'une place libérée, une autre occupée');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === victime.id), false, 'la victime a quitté la table');
  assert.equal(duel.joueur.cimetiere.length, cimetiereAvant + 1, 'la victime rejoint le cimetière');
  assert.ok(duel.log.some((ligne) => ligne.includes('sacrifiée')), 'le sacrifice est raconté');

  payerSable();
  duel.joueur.main.push('chien-du-guet');
  const mauvaiseVictime = rpgJouerCreature(duel, 'joueur', 'chien-du-guet', null, { sacrificeId: 'id-inconnu' });
  assert.equal(mauvaiseVictime.ok, false);
  assert.equal(mauvaiseVictime.raison, 'sacrifice', 'un sacrifice hors du camp est refusé sans rien changer');
  assert.equal(duel.joueur.creatures.length, RPG_MANA_ESSAI_CHAMP_MAX);
  assert.equal(duel.joueur.main.includes('chien-du-guet'), true);

  // Le sorcier, lui, choisit seul : sa créature la plus frêle fait la place.
  const sorcier = nouveau(mono, tri);
  sorcier.joueur.main = [];
  for (let place = 0; place < RPG_MANA_ESSAI_CHAMP_MAX; place += 1) {
    sorcier.sorcier.mana = { braise: 0, eau: 0, sable: 5, neige: 0 };
    sorcier.sorcier.main.push('tislit-des-aures');
    assert.equal(rpgJouerCreature(sorcier, 'sorcier', 'tislit-des-aures').ok, true);
  }
  const avant = [...sorcier.sorcier.creatures];
  const teteDAttaque = { ...avant[0], atk: 9, def: 9, pv: 9 };
  sorcier.sorcier.creatures = [teteDAttaque, ...avant.slice(1)];
  sorcier.sorcier.mana = { braise: 0, eau: 0, sable: 5, neige: 0 };
  sorcier.sorcier.main.push('fennec-des-decombres');
  const auto = rpgJouerCreature(sorcier, 'sorcier', 'fennec-des-decombres');
  assert.equal(auto.ok, true, 'le sorcier pose sa sixième créature sans intervention');
  assert.equal(sorcier.sorcier.creatures.length, RPG_MANA_ESSAI_CHAMP_MAX);
  assert.equal(sorcier.sorcier.creatures.some((entite) => entite.id === teteDAttaque.id), true,
    'la créature la plus forte est gardée');
  assert.equal(sorcier.sorcier.creatures.filter((entite) => entite.carteId === 'tislit-des-aures').length, 4,
    'une seule tislit a cédé sa place');

  // Le format historique n'a pas de plafond : six créatures cohabitent.
  const classique = rpgNouveauDuel({ joueurDeck: Array(6).fill('tislit-des-aures'), sorcierDeck: [], rng });
  classique.joueur.main = Array(6).fill('tislit-des-aures');
  for (let place = 0; place < 6; place += 1) {
    classique.joueur.mana = { braise: 0, eau: 0, sable: 10, neige: 0 };
    assert.equal(rpgJouerCreature(classique, 'joueur', 'tislit-des-aures').ok, true, `classique ${place + 1}`);
  }
  assert.equal(classique.joueur.creatures.length, 6, 'le duel classique garde son champ illimité');
});
