import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rpgDemarrerManaEssai,
  rpgFinDeTour,
  rpgJouerArme,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgLancerMagie,
  rpgNouveauDuel,
  rpgOuvrirFenetreReponse,
  rpgPeutMulligan,
  rpgSorcierResoudreAnnonce,
} from '../src/games/rpgDuel.js';
import { RPG_DECKS, cardById, cardHasPrintedType } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { portefeuilleVide, reclamerRecompenseTutoriel } from '../src/games/rpgCredits.js';
import {
  RPG_TUTORIELS,
  appliquerManaInitialTutoriel,
  cartesDeLaLecon,
  preparerDuelTutoriel,
  preparerEtapeTutoriel,
  tutorielParId,
} from '../src/games/rpgTutorial.js';

const deckDe = (id) => RPG_DECKS.find((deck) => deck.id === id)?.cardIds ?? [];

function duelDeLecon(tutoriel) {
  const duel = rpgNouveauDuel({
    joueurDeck: deckDe(tutoriel.deckId),
    sorcierDeck: deckDe(tutoriel.opponentDeckId),
    sorcierPuissance: 0,
    modeMana: RPG_MODE_MANA_ESSAI,
    rng: () => 0.37,
  });
  preparerDuelTutoriel(duel, tutoriel);
  assert.equal(rpgDemarrerManaEssai(duel).ok, true);
  appliquerManaInitialTutoriel(duel, tutoriel);
  return duel;
}

test('le menu propose cinq leçons, une par deck, chacune récompensée', () => {
  assert.deepEqual(RPG_TUTORIELS.map((tutoriel) => tutoriel.id), [
    'fondations-du-sablier',
    'maree-des-abysses',
    'balance-des-heures',
    'serment-du-soleil-rouge',
    'serment-des-neuf-hivers',
  ]);
  assert.deepEqual(RPG_TUTORIELS.map((tutoriel) => tutoriel.deckId), [
    'veilleurs-du-desert',
    'maree-des-abysses',
    'balance-des-heures',
    'serment-du-soleil-rouge',
    'serment-des-neuf-hivers',
  ]);
  for (const tutoriel of RPG_TUTORIELS) {
    assert.ok(tutoriel.reward > 0, `${tutoriel.id} paie ses crédits`);
    assert.ok(tutoriel.steps.length >= 13, `${tutoriel.id} est une vraie leçon`);
    assert.equal(new Set(tutoriel.steps.map((etape) => etape.id)).size, tutoriel.steps.length,
      `${tutoriel.id} n'utilise pas deux fois le même identifiant d'étape`);
    assert.ok(tutoriel.steps.every((etape) => etape.title && etape.text),
      `${tutoriel.id} explique chaque étape`);
    assert.equal(tutoriel.steps.at(-1).kind, 'complete', `${tutoriel.id} se termine par un bilan`);
    assert.ok(RPG_DECKS.some((deck) => deck.id === tutoriel.opponentDeckId));
  }
  assert.equal(tutorielParId('inconnu').id, RPG_TUTORIELS[0].id);
});

test('chaque carte manipulée existe et chaque annonce scénarisée est en main adverse', () => {
  for (const tutoriel of RPG_TUTORIELS) {
    for (const cardId of cartesDeLaLecon(tutoriel)) {
      assert.ok(cardById(cardId), `${tutoriel.id} référence une carte inconnue : ${cardId}`);
    }
    for (const etape of tutoriel.steps) {
      if (!etape.scriptedAnnonce) continue;
      assert.ok(tutoriel.opponentHand.includes(etape.scriptedAnnonce.cardId),
        `${tutoriel.id}/${etape.id} annonce une carte absente de la main du sorcier`);
    }
    assert.ok(cartesDeLaLecon(tutoriel).length >= tutoriel.openingHand.length);
  }
});

test('la préparation installe la main, le mana et la scène de chaque leçon', () => {
  for (const tutoriel of RPG_TUTORIELS) {
    const duel = duelDeLecon(tutoriel);
    assert.deepEqual(duel.joueur.main, tutoriel.openingHand, `${tutoriel.id} : main exacte`);
    assert.equal(rpgPeutMulligan(duel, 'joueur'), false, `${tutoriel.id} : pas de mulligan`);
    assert.equal(duel.sorcier.main.length, tutoriel.opponentHand.length, `${tutoriel.id} : main adverse`);
    const manaAttendu = tutoriel.playerMana ?? { [RPG_DECKS.find((deck) => deck.id === tutoriel.deckId).element]: 1 };
    for (const [couleur, montant] of Object.entries(manaAttendu)) {
      assert.equal(duel.joueur.mana[couleur], montant, `${tutoriel.id} : mana ${couleur}`);
    }
    for (const scene of tutoriel.stagedOpponent ?? []) {
      assert.ok(duel.sorcier.creatures.some((entite) => entite.carteId === scene.cardId),
        `${tutoriel.id} : ${scene.cardId} est en scène`);
    }
    for (const step of tutoriel.steps) {
      if (step.target?.startsWith('.card-row--equipe ')) {
        assert.equal(step.side, 'top', `${tutoriel.id}/${step.id} : une carte alliée place le panneau au-dessus`);
      }
      if (step.target?.startsWith('.card-row--ennemi ')) {
        assert.equal(step.side, 'bottom', `${tutoriel.id}/${step.id} : une carte ennemie place le panneau en dessous`);
      }
    }
  }
});

test('la leçon Eau joue une sorcellerie, une magie rapide puis un contre', () => {
  const tutoriel = tutorielParId('maree-des-abysses');
  const duel = duelDeLecon(tutoriel);
  assert.equal(rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').ok, true);
  assert.equal(duel.joueur.pv, 28, 'la Porteuse rend 3 PV');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eau-de-la-source').ok, true);
  assert.equal(duel.joueur.pv, 32, 'la sorcellerie rend 4 PV');
  const vipere = duel.sorcier.creatures[0];
  assert.equal(rpgLancerMagie(duel, 'joueur', 'ressac', vipere.id).ok, true);
  assert.equal(duel.sorcier.creatures.length, 0, 'Ressac renvoie la Vipère en main');
  assert.equal(duel.joueur.mana.eau, 4, 'les trois sorts ont coûté quatre manas');

  rpgFinDeTour(duel);
  duel.annonce = { cote: 'sorcier', carteId: 'lame-de-mer', cibleId: duel.joueur.creatures[0].id, cibleAllieeId: null };
  duel.fenetreReponse = true;
  const contre = rpgLancerMagie(duel, 'joueur', 'contresort-des-abimes');
  assert.equal(contre.ok, true);
  assert.equal(contre.contre, true, 'le Contresort défait l’annonce');
  assert.equal(duel.annonce, null);
  assert.ok(duel.sorcier.cimetiere.includes('lame-de-mer'), 'la carte contredite paie puis va au cimetière');
  assert.equal(duel.sorcier.mana.eau, 0, 'le sorcier n’a plus de mana pour annoncer la Vipère renvoyée en main');
  assert.equal(duel.joueur.creatures[0].pv, 3, 'la Lame de mer n’a pas résolu son effet');
});

test('la leçon Ténèbres montre le Tribut, le Prix et les jetons de mort', () => {
  const tutoriel = tutorielParId('balance-des-heures');
  const duel = duelDeLecon(tutoriel);
  const chacal = rpgJouerCreature(duel, 'joueur', 'chacal-du-seuil');
  assert.equal(chacal.ok, true);
  assert.equal(chacal.entite.ready, true, 'Rapidité : le Chacal attaque tout de suite');
  rpgOuvrirFenetreReponse(duel, 'joueur');
  assert.equal(rpgLancerAttaque(duel, 'joueur', [chacal.entite.id], null, null, null, {}, { attaqueDeclaree: true }).ok, true);
  assert.equal(duel.sorcier.pv, 22, '2 dégâts de combat + 1 de Tribut');
  assert.equal(duel.joueur.pv, 26, 'le Tribut rend 1 PV au joueur');

  assert.equal(rpgJouerCreature(duel, 'joueur', 'pretre-de-la-bouche').ok, true);
  assert.equal(duel.joueur.pv, 27);
  const pvAvantPapyrus = duel.joueur.pv;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'papyrus').ok, true);
  assert.equal(duel.joueur.pv, pvAvantPapyrus - 2, 'le Prix du Papyrus se paie en PV');
  const momie = rpgJouerCreature(duel, 'joueur', 'momie-de-lin');
  assert.equal(momie.ok, true);

  rpgFinDeTour(duel);
  duel.annonce = { cote: 'sorcier', carteId: 'feux-de-kitsune', cibleId: momie.entite.id, cibleAllieeId: null };
  duel.fenetreReponse = true;
  assert.equal(rpgSorcierResoudreAnnonce(duel).ok, true);
  assert.equal(duel.joueur.creatures.filter((entite) => entite.carteId === 'shabti').length, 1,
    'la Momie laisse un Shabti');
});

test('la leçon Samouraï installe la Résonance, les jetons et la Bannière', () => {
  const tutoriel = tutorielParId('serment-du-soleil-rouge');
  const duel = duelDeLecon(tutoriel);
  assert.equal(rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises').ok, true);
  assert.equal(rpgJouerCreature(duel, 'joueur', 'samourai-du-torii').ok, true);
  const ashigaru = duel.joueur.creatures.find((entite) => entite.carteId === 'ashigaru-des-braises');
  assert.equal(ashigaru.atk, 2);
  assert.equal(ashigaru.pv, 2, 'la Résonance du torii renforce l’Ashigaru');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'daimyo-du-soleil-rouge').ok, true);
  assert.equal(duel.joueur.creatures.length, 5, 'le Daimyō crée deux jetons : cinq créatures, la limite');
  assert.equal(duel.joueur.mana.braise, 0, 'les trois poses coûtent exactement dix manas');

  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const ids = duel.joueur.creatures.filter((entite) => entite.ready && !entite.attaquee).map((entite) => entite.id);
  assert.equal(ids.length, 5);
  const pvAvant = duel.sorcier.pv;
  rpgOuvrirFenetreReponse(duel, 'joueur');
  assert.equal(rpgLancerAttaque(duel, 'joueur', ids, null, null, null, {}, { attaqueDeclaree: true }).ok, true);
  assert.ok(duel.sorcier.pv < pvAvant);
  assert.deepEqual(duel.joueur.creatures.map((entite) => entite.atk), [3, 4, 5, 3, 3],
    'la Bannière grandit chaque Samouraï qui attaque');
});

test('la leçon Neige appelle un Viking, gèle un adversaire et active deux Furies', () => {
  const tutoriel = tutorielParId('serment-des-neuf-hivers');
  assert.ok(tutoriel.steps.some((etape) => etape.id === 'appel-viking'),
    'la leçon nomme la nouvelle arrivée de la Valkyrie');
  const duel = duelDeLecon(tutoriel);
  const guerrier = rpgJouerCreature(duel, 'joueur', 'guerrier-au-bouclier-rond');
  assert.equal(guerrier.ok, true);
  assert.equal(guerrier.entite.bouclier, 1, 'le Guerrier arrive avec un bouclier 1');
  const mainAvantValkyrie = duel.joueur.main.length;
  const valkyrie = rpgJouerCreature(duel, 'joueur', 'valkyrie-au-corbeau');
  assert.equal(valkyrie.ok, true);
  assert.deepEqual([valkyrie.entite.atk, valkyrie.entite.def, valkyrie.entite.pv], [3, 4, 4]);
  assert.deepEqual(
    [guerrier.entite.atk, guerrier.entite.pv, guerrier.entite.pvMax, guerrier.entite.resonance],
    [1, 3, 3, 0],
    'la Valkyrie ne porte plus de Résonance : le Guerrier reste une 1/3',
  );
  assert.equal(duel.joueur.main.length, mainAvantValkyrie,
    'poser la Valkyrie et piocher son arrivée laisse le même nombre de cartes en main');
  assert.equal(cardHasPrintedType(cardById(duel.joueur.main.at(-1)), 'viking'), true,
    'la carte amenée par la Valkyrie porte le type Viking');

  const ennemi = duel.sorcier.creatures.find((entite) => entite.carteId === 'guerrier-au-bouclier-rond');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', ennemi.id).ok, true);
  assert.ok(ennemi.gelToursRestants > 0, 'la Poigne gèle même à travers le bouclier');
  assert.equal(ennemi.bouclier, 0);
  assert.deepEqual(
    [ennemi.atk, ennemi.pv, ennemi.pvMax, ennemi.furieDeclenchee],
    [3, 2, 3, true],
    'sa Furie 2 est active sous sa DEF de base 3 — mais le gel le tient hors du combat',
  );
  assert.equal(duel.joueur.mana.neige, 0, 'les trois cartes de la leçon consomment les dix manas');

  preparerEtapeTutoriel(duel, tutoriel.steps.find((etape) => etape.id === 'furie'));
  const berserk = duel.joueur.creatures.find((entite) => entite.carteId === 'berserk-des-trois-hivers');
  assert.deepEqual([berserk.atk, berserk.def, berserk.pv], [2, 4, 4],
    'la leçon installe le Berserk 2/4 comme défenseur de la riposte');
  rpgFinDeTour(duel);
  const loup = duel.sorcier.creatures.find((entite) => entite.carteId === 'loup-des-neiges');
  assert.deepEqual([loup.atk, loup.def, loup.pv], [2, 2, 2]);
  assert.equal(rpgLancerAttaque(duel, 'sorcier', [loup.id], { [loup.id]: [berserk.id] }, null,
    [loup.id], {}, { attaqueDeclaree: true }).ok, true);
  assert.deepEqual(
    [berserk.furieDeclenchee, berserk.furieBonusAtk, berserk.atk, berserk.pv, berserk.pvMax],
    [true, 2, 4, 2, 4],
    'le Berserk tombe à 2 PV : sa Furie 2 lui donne +2/+0',
  );
  assert.equal(duel.sorcier.creatures.includes(loup), false,
    'les 2 dégâts du Berserk détruisent le Loup 2/2');
  assert.equal(duel.joueur.pv, 25, 'aucun dégât ne passe au joueur');
});

test('la récompense d’un tutoriel n’est versée qu’une fois', () => {
  const tutoriel = RPG_TUTORIELS[1];
  const premier = reclamerRecompenseTutoriel(portefeuilleVide(), tutoriel.id, tutoriel.reward);
  assert.equal(premier.ok, true);
  assert.equal(premier.gain, tutoriel.reward);
  assert.deepEqual(premier.portefeuille.tutoriels, [tutoriel.id]);
  const second = reclamerRecompenseTutoriel(premier.portefeuille, tutoriel.id, tutoriel.reward);
  assert.equal(second.ok, false);
  assert.equal(second.raison, 'deja-reclame');
  assert.equal(second.gain, 0);
  const autre = reclamerRecompenseTutoriel(second.portefeuille, RPG_TUTORIELS[2].id, 150);
  assert.equal(autre.gain, 150, 'une autre leçon reste payable');
});
