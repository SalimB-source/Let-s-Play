import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgBlesserCreature, rpgDemarrerManaEssai, rpgFinDeTour, rpgJouerArme, rpgJouerCreature, rpgLancerMagie, rpgMulligan, rpgNouveauDuel, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';

function partie(attaquant = 'ashigaru-des-braises', defenseur = 'tour-des-flots') {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = [defenseur];
  const tour = rpgJouerCreature(duel, 'joueur', defenseur).entite;
  assert.ok(tour);
  rpgFinDeTour(duel);
  duel.sorcier.main = [attaquant];
  const allie = rpgJouerCreature(duel, 'sorcier', attaquant).entite;
  assert.ok(allie);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  return { duel, tour, allie };
}

test('classique : ne pas envoyer un Ashigaru sans effet contre la Tour des Flots', () => {
  const { duel, tour, allie } = partie();
  let jets = 0;
  rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(JSON.stringify(duel), avant);
  assert.equal(jets, 0);
  // Si l'attaque était réellement déclarée, la Tour renverrait l'Ashigaru
  // avant de subir le moindre dégât.
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, tour.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 4);
  assert.ok(duel.sorcier.main.includes('ashigaru-des-braises'));
  assert.ok(!duel.sorcier.creatures.includes(allie));
});

test('classique : une Attaque ciblée peut blesser la Tour sans déclencher son renvoi', () => {
  const { duel, tour, allie } = partie('tislit-des-aures');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 3);
  assert.ok(duel.sorcier.creatures.includes(allie));
});

test('classique : une attaque imposée après interruption reste déclarable', () => {
  const { duel, tour, allie } = partie();
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', allie.id),
    { attaquantId: allie.id, cibleId: tour.id });
});

test('classique : le Vampire peut entamer la Tour avant son propre renvoi', () => {
  const { duel, tour, allie } = partie('vampire-des-braises');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 3);
  assert.ok(duel.sorcier.main.includes('vampire-des-braises'));
});

test('classique : privilégier une Attaque ciblée plutôt que renvoyer gratuitement un allié', () => {
  const { duel, tour, allie } = partie();
  duel.sorcier.main = ['tislit-des-aures'];
  const tireuse = rpgJouerCreature(duel, 'sorcier', 'tislit-des-aures').entite;
  assert.ok(tireuse);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: tireuse.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 3);
  assert.ok(duel.sorcier.creatures.includes(allie));
});

test('classique : le Scalde peut être renvoyé pour piocher si la main est faible et la table sûre', () => {
  const { duel, tour, allie } = partie('scalde-des-runes');
  duel.sorcier.main = [];
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, tour.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.sorcier.main.includes('scalde-des-runes'));
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const cartesAvant = duel.sorcier.main.length, deckAvant = duel.sorcier.deck.length;
  const pose = rpgJouerCreature(duel, 'sorcier', 'scalde-des-runes');
  assert.ok(pose.ok, JSON.stringify(pose));
  assert.equal(duel.sorcier.deck.length, deckAvant - 1);
  assert.equal(duel.sorcier.main.length, cartesAvant);
});

for (const contexte of ['main fournie', 'paquet presque vide', 'renfort', 'menace']) {
  test(`classique : le Scalde reste en défense si ${contexte}`, () => {
    const { duel, allie } = partie('scalde-des-runes');
    duel.sorcier.main = [];
    if (contexte === 'main fournie') duel.sorcier.main = ['ashigaru-des-braises', 'ashigaru-des-braises'];
    if (contexte === 'paquet presque vide') duel.sorcier.deck = ['ashigaru-des-braises'];
    if (contexte === 'renfort') { allie.atk += 2; }
    if (contexte === 'menace') {
      rpgFinDeTour(duel);
      duel.joueur.main = ['ashigaru-des-braises'];
      assert.ok(rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises').ok);
      rpgFinDeTour(duel);
      duel.sorcier.main = [];
    }
    const avant = JSON.stringify(duel);
    assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
    assert.equal(JSON.stringify(duel), avant);
  });
}

test('classique : un renvoi peut permettre de rejouer une créature blessée intacte', () => {
  const { duel, tour, allie } = partie('chasseuse-de-braise');
  assert.ok(rpgBlesserCreature(duel, 'sorcier', allie.id, 1).ok);
  assert.equal(allie.pv, 1);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, tour.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const pose = rpgJouerCreature(duel, 'sorcier', 'chasseuse-de-braise');
  assert.ok(pose.ok); assert.equal(pose.entite.pv, 2);
});

test('classique : ne pas envoyer un Ashigaru mourir sans blesser la Tour de Braise', () => {
  const { duel, tour, allie } = partie('ashigaru-des-braises', 'tour-de-braise');
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, tour.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 4);
  assert.ok(!duel.sorcier.creatures.includes(allie));
});

test('classique : un Vampire blesse la Tour de Braise grâce à sa capacité avant combat', () => {
  const { duel, tour, allie } = partie('vampire-des-braises', 'tour-de-braise');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 1); assert.equal(allie.pv, 1);
});

test('classique : la Tour de Braise gelée ne déclenche pas son effet de blocage', () => {
  const { duel, tour, allie } = partie('ashigaru-des-braises', 'tour-de-braise');
  duel.sorcier.main = ['poigne-de-givre'];
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'poigne-de-givre', tour.id).ok);
  assert.equal(tour.pv, 2); assert.ok(tour.gelToursRestants > 0);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 1); assert.ok(duel.sorcier.creatures.includes(allie));
});

test('classique : un Ashigaru renforcé survit à l’effet et blesse la Tour de Braise', () => {
  const { duel, tour, allie } = partie('ashigaru-des-braises', 'tour-de-braise');
  duel.sorcier.main = ['sandales-de-tislit'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'sandales-de-tislit', allie.id).ok);
  assert.equal(allie.pv, 2);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(tour.pv, 3); assert.ok(duel.sorcier.creatures.includes(allie));
  assert.equal(allie.pv, 1);
});

test('classique : la mort du Ghul peut encore blesser la Tour de Braise', () => {
  const { duel, tour, allie } = partie('ghul-des-cendres', 'tour-de-braise');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(!duel.sorcier.creatures.includes(allie));
  assert.equal(tour.pv, 3);
});

test('classique : un plan gagnant ne gaspille pas d’Ashigaru contre une Tour de Braise', () => {
  const { duel, tour, allie } = partie('chasseuse-de-braise', 'tour-de-braise');
  assert.ok(rpgBlesserCreature(duel, 'joueur', tour.id, 3).ok);
  duel.sorcier.main = ['ashigaru-des-braises'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 1;
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(premier, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', premier.attaquantId, premier.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.creatures.includes(tour), false);
  const dernier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(dernier?.cibleId, null);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', dernier.attaquantId, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 0);
});

test('classique : sur un champ plein, libérer une place reste une possibilité', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, modeMana: RPG_MODE_MANA_ESSAI, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok);
  assert.ok(rpgMulligan(duel, 'sorcier', []).ok);
  assert.ok(rpgDemarrerManaEssai(duel).ok);
  duel.joueur.main = ['tour-de-braise'];
  const tour = rpgJouerCreature(duel, 'joueur', 'tour-de-braise').entite;
  assert.ok(tour); rpgFinDeTour(duel);
  for (let i = 0; i < 5; i++) {
    duel.sorcier.main = ['ashigaru-des-braises'];
    assert.ok(rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').ok);
    rpgFinDeTour(duel); rpgFinDeTour(duel);
  }
  assert.equal(duel.sorcier.creatures.length, 5);
  // Dans ce contexte différent, ne pas imposer la décision du champ non plein.
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel)?.cibleId, tour.id);
});

test('classique : une réponse qui gèle la Tour change l’évaluation de l’attaque suivante', () => {
  const { duel, tour, allie } = partie('ashigaru-des-braises', 'tour-de-braise');
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  duel.sorcier.main = ['poigne-de-givre'];
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'poigne-de-givre', tour.id).ok);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: allie.id, cibleId: tour.id });
});

test('classique : l’attaque imposée reste possible contre la Tour de Braise', () => {
  const { duel, tour, allie } = partie('ashigaru-des-braises', 'tour-de-braise');
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', allie.id), { attaquantId: allie.id, cibleId: tour.id });
});

test('classique : une réponse ennemie après déclaration peut sauver le Défenseur', () => {
  const { duel, tour, allie } = partie('chasseuse-de-braise', 'tour-de-braise');
  assert.ok(rpgBlesserCreature(duel, 'joueur', tour.id, 3).ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: tour.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  duel.joueur.main = ['rempart-de-dunes'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.joueur.creatures.includes(tour));
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
});
