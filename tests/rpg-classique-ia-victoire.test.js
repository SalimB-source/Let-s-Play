import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgBlesserCreature, rpgFinDeTour, rpgJouerArme, rpgJouerCreature, rpgLancerMagie, rpgNoterCompteurEntites, rpgNouveauDuel, rpgReglerHasard, rpgVainqueur } from '../src/games/rpgDuel.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';

function partie(defenseur = 'ashigaru-des-braises') {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = [defenseur];
  const ennemi = rpgJouerCreature(duel, 'joueur', defenseur).entite;
  assert.ok(ennemi);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['chasseuse-de-braise'];
  const forte = rpgJouerCreature(duel, 'sorcier', 'chasseuse-de-braise').entite;
  assert.ok(forte);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises'];
  const faible = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  assert.ok(faible);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  return { duel, ennemi, forte, faible };
}

function resoudreChoix(duel, choix) {
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
}

test('classique : deux attaques directes gagnent plutôt que détruire une créature non prioritaire', () => {
  const { duel, ennemi, forte, faible } = partie();
  duel.joueur.pv = 3;
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(choix?.cibleId, null);
  assert.ok([forte.id, faible.id].includes(choix.attaquantId));
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  resoudreChoix(duel, choix);
  assert.ok(duel.joueur.creatures.includes(ennemi));
  const suivant = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(suivant?.cibleId, null);
  assert.notEqual(suivant.attaquantId, choix.attaquantId);
  resoudreChoix(duel, suivant);
  assert.equal(rpgVainqueur(duel), 'sorcier');
});

test('classique : un bouclier du joueur empêche de prétendre à une victoire en deux coups', () => {
  const { duel, ennemi } = partie();
  duel.joueur.pv = 3; duel.joueur.bouclier = 1;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(choix?.cibleId, ennemi.id);
  resoudreChoix(duel, choix);
  assert.equal(duel.joueur.pv, 3);
  assert.equal(duel.joueur.bouclier, 1);
});

test('classique : un Défenseur interdit la séquence de frappes directes', () => {
  const { duel, ennemi } = partie('gardienne-des-portes-de-sable');
  duel.joueur.pv = 3;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(choix?.cibleId, ennemi.id);
  resoudreChoix(duel, choix);
  assert.equal(duel.joueur.pv, 3);
});

test('classique : les simulations de frappes et de jetons ne consomment pas les vrais identifiants', () => {
  const { duel, forte, faible } = partie();
  duel.sorcier.main = ['takouba-de-tin-hinan'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'takouba-de-tin-hinan', forte.id).ok);
  assert.equal(forte.atk, 4, 'la Takouba de Tin Hinan donne +2/+2'); assert.equal(faible.atk, 1);
  duel.joueur.pv = 5;
  const uid = rpgNoterCompteurEntites(duel);
  const avant = JSON.stringify(duel);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(choix?.cibleId, null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.equal(rpgNoterCompteurEntites(duel), uid);
  resoudreChoix(duel, choix);
  assert.ok(duel.sorcier.creatures.some(e => e.carteId === 'chien-de-sable'));
  const suivant = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(suivant?.cibleId, null);
  resoudreChoix(duel, suivant);
  assert.equal(rpgVainqueur(duel), 'sorcier');
});

test('classique : trois attaques séparées peuvent conclure la partie', () => {
  const { duel, faible } = partie();
  duel.sorcier.main = ['ashigaru-des-braises'];
  const troisieme = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  assert.ok(troisieme && troisieme.id !== faible.id);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 4;
  const deja = new Set();
  for (let i = 0; i < 3; i++) {
    const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
    assert.equal(choix?.cibleId, null);
    assert.ok(!deja.has(choix.attaquantId)); deja.add(choix.attaquantId);
    resoudreChoix(duel, choix);
  }
  assert.equal(rpgVainqueur(duel), 'sorcier');
});

test('classique : une réponse adverse interrompt la perspective de victoire et l’IA réévalue', () => {
  const { duel } = partie();
  duel.joueur.pv = 3;
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(premier?.cibleId, null);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', premier.attaquantId, null).ok);
  duel.joueur.main = ['grand-voile-blanc'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 3);
  assert.equal(rpgVainqueur(duel), null);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
});

test('classique : le bouclier est pris en compte quand les deux attaques suffisent malgré lui', () => {
  const { duel, forte } = partie();
  duel.sorcier.main = ['lance-de-givre'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'lance-de-givre', forte.id).ok);
  assert.equal(forte.atk, 3);
  duel.joueur.pv = 3; duel.joueur.bouclier = 1;
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(premier?.cibleId, null);
  resoudreChoix(duel, premier);
  const second = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(second?.cibleId, null);
  resoudreChoix(duel, second);
  assert.equal(rpgVainqueur(duel), 'sorcier');
});

test('classique : une créature qui ne peut pas encore attaquer ne crée pas de faux létal', () => {
  const { duel, ennemi } = partie();
  duel.sorcier.main = ['ashigaru-des-braises'];
  const malade = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  assert.ok(malade && malade.malInvocation);
  // L'autre Ashigaru a déjà attaqué : seule la Chasseuse est prête.
  const ancien = duel.sorcier.creatures.find((e) => e.carteId === 'ashigaru-des-braises' && e.id !== malade.id);
  ancien.attaquee = true;
  duel.joueur.pv = 3;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(choix?.cibleId, ennemi.id);
});

test('classique : une attaque imposée conserve son choix de cible après interruption', () => {
  const { duel, ennemi, forte } = partie();
  duel.joueur.pv = 3;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', forte.id);
  assert.equal(choix?.attaquantId, forte.id);
  assert.equal(choix?.cibleId, ennemi.id);
});

test('classique : deux petits attaquants écartent le Défenseur pour libérer le coup gagnant', () => {
  const { duel, ennemi, forte } = partie('gardienne-des-portes-de-sable');
  assert.ok(rpgBlesserCreature(duel, 'joueur', ennemi.id, 2).ok);
  duel.sorcier.main = ['ashigaru-des-braises'];
  const renfort = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  assert.ok(renfort);
  duel.sorcier.main = ['takouba-des-pistes'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', forte.id).ok);
  assert.equal(forte.atk, 4);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 4;
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(premier?.cibleId, ennemi.id);
  assert.notEqual(premier.attaquantId, forte.id);
  resoudreChoix(duel, premier);
  assert.equal(ennemi.pv, 1);
  const deuxieme = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(deuxieme?.cibleId, ennemi.id);
  assert.notEqual(deuxieme.attaquantId, forte.id);
  resoudreChoix(duel, deuxieme);
  assert.equal(duel.joueur.creatures.includes(ennemi), false);
  const dernier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(dernier, { attaquantId: forte.id, cibleId: null });
  resoudreChoix(duel, dernier);
  assert.equal(rpgVainqueur(duel), 'sorcier');
});

function preparerVoieGardee(id) {
  const { duel, ennemi, forte } = partie(id);
  assert.ok(rpgBlesserCreature(duel, 'joueur', ennemi.id, 2).ok);
  duel.sorcier.main = ['ashigaru-des-braises'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').ok);
  duel.sorcier.main = ['takouba-des-pistes'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', forte.id).ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 4;
  return { duel, ennemi, forte };
}

test('classique : les dégâts avant combat de la Tour empêchent un faux plan de victoire', () => {
  const { duel, ennemi, forte } = preparerVoieGardee('tour-de-braise');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: forte.id, cibleId: ennemi.id });
  resoudreChoix(duel, choix);
  assert.equal(duel.joueur.creatures.includes(ennemi), false);
  assert.equal(duel.joueur.pv, 4);
  assert.equal(rpgVainqueur(duel), null);
});

test('classique : une réponse qui renforce le Défenseur oblige à réévaluer le plan', () => {
  const { duel, ennemi, forte } = preparerVoieGardee('gardienne-des-portes-de-sable');
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.equal(premier?.cibleId, ennemi.id);
  assert.notEqual(premier.attaquantId, forte.id);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', premier.attaquantId, premier.cibleId).ok);
  duel.joueur.main = ['rempart-de-dunes'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(ennemi.pv, 4);
  const suivant = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(suivant, { attaquantId: forte.id, cibleId: ennemi.id });
  resoudreChoix(duel, suivant);
  assert.equal(duel.joueur.pv, 4);
  assert.equal(rpgVainqueur(duel), null);
});

test('classique : une Attaque ciblée qui peut rater ne garantit pas la victoire', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const gardienne = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.ok(gardienne && rpgBlesserCreature(duel, 'joueur', gardienne.id, 3).ok);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['chasseuse-de-braise'];
  const forte = rpgJouerCreature(duel, 'sorcier', 'chasseuse-de-braise').entite;
  duel.sorcier.main = ['takouba-des-pistes'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', forte.id).ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['tislit-des-aures'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'tislit-des-aures').ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 4;
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: forte.id, cibleId: gardienne.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
});

function partieTribut(cote = 'sorcier') {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  const adv = cote === 'sorcier' ? 'joueur' : 'sorcier';
  if (cote === 'sorcier') {
    duel.joueur.main = ['porteuse-de-cruches'];
    assert.ok(rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').ok);
    rpgFinDeTour(duel);
  }
  duel[cote].main = ['chacal-du-seuil'];
  const allie = rpgJouerCreature(duel, cote, 'chacal-du-seuil').entite;
  assert.ok(allie);
  if (cote === 'joueur') {
    rpgFinDeTour(duel);
    duel.sorcier.main = ['porteuse-de-cruches'];
    assert.ok(rpgJouerCreature(duel, 'sorcier', 'porteuse-de-cruches').ok);
    rpgFinDeTour(duel);
  }
  const ennemi = duel[adv].creatures[0];
  assert.ok(rpgBlesserCreature(duel, adv, ennemi.id, 1).ok);
  return { duel, allie, ennemi, adv };
}

for (const cote of ['joueur', 'sorcier']) test(`classique ${cote} : une attaque gagnante avec Tribut prime sur un échange`, () => {
  const { duel, allie, ennemi, adv } = partieTribut(cote);
  duel[adv].pv = 3;
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel, cote);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: null });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, cote, choix.attaquantId, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, cote).ok);
  assert.equal(rpgVainqueur(duel), cote);
  assert.ok(duel[adv].creatures.includes(ennemi));
});

test('classique : un bouclier absorbe les dégâts et peut empêcher le Tribut gagnant', () => {
  const { duel, allie, ennemi, adv } = partieTribut();
  duel[adv].pv = 3; duel[adv].bouclier = 2;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: ennemi.id });
  resoudreChoix(duel, choix);
  assert.equal(rpgVainqueur(duel), null);
  assert.equal(duel[adv].pv, 3);
});

test('classique : une reprise imposée peut choisir la frappe gagnante avec Tribut', () => {
  const { duel, allie, adv } = partieTribut();
  duel[adv].pv = 3;
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', allie.id), { attaquantId: allie.id, cibleId: null });
});

test('classique : Tribut peut conclure même après absorption partielle du bouclier', () => {
  const { duel, allie, adv } = partieTribut();
  duel[adv].pv = 2; duel[adv].bouclier = 1;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: null });
  resoudreChoix(duel, choix);
  assert.equal(rpgVainqueur(duel), 'sorcier');
});

test('classique : une réponse adverse peut empêcher la victoire au Tribut', () => {
  const { duel, allie, adv } = partieTribut();
  duel[adv].pv = 3;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: null });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, null).ok);
  duel.joueur.main = ['grand-voile-blanc'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel[adv].pv, 3); assert.equal(rpgVainqueur(duel), null);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
});

test('classique : un seul attaquant choisit le Défenseur qui permet une victoire par Overkill', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const gardienne = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.ok(gardienne && rpgBlesserCreature(duel, 'joueur', gardienne.id, 3).ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.main = ['pourfendeur-des-djinns'];
  const pourfendeur = rpgJouerCreature(duel, 'joueur', 'pourfendeur-des-djinns').entite;
  assert.ok(pourfendeur); rpgFinDeTour(duel);
  duel.sorcier.main = ['chacal-du-seuil'];
  const allie = rpgJouerCreature(duel, 'sorcier', 'chacal-du-seuil').entite;
  assert.ok(allie);
  duel.sorcier.main = ['armure-de-cendres', 'mur-de-boucliers'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'armure-de-cendres', allie.id).ok);
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'mur-de-boucliers').ok);
  assert.equal(allie.atk, 4); assert.ok(allie.overkill);
  duel.joueur.pv = 2;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: gardienne.id });
  resoudreChoix(duel, choix);
  assert.equal(rpgVainqueur(duel), 'sorcier');
  assert.ok(duel.joueur.creatures.includes(pourfendeur));
});

test('classique : une reprise imposée ne choisit pas un autre attaquant gagnant', () => {
  const { duel, allie, adv } = partieTribut();
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises'];
  const impose = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  assert.ok(impose); rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel[adv].pv = 3;
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: allie.id, cibleId: null });
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', impose.id);
  assert.equal(choix?.attaquantId, impose.id);
});
