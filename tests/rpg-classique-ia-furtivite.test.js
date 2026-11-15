import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgBlesserCreature, rpgFermerFenetreReponse, rpgFinDeTour, rpgJouerArme, rpgJouerCreature, rpgLancerMagie, rpgNoterCompteurEntites, rpgNouveauDuel, rpgOuvrirFenetreReponse, rpgReglerHasard, rpgResoudreDestructionCiblee, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce } from '../src/games/rpgDuel.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { choisirCarteIA } from '../src/games/rpgAI.js';

function partie(cible = 'gardienne-des-portes-de-sable', attaquant = 'djinn-de-la-premiere-etincelle', poseForcee = false) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = [cible];
  const ennemie = rpgJouerCreature(duel, 'joueur', cible).entite;
  assert.ok(ennemie); rpgFinDeTour(duel);
  duel.sorcier.main = [attaquant];
  let resultat;
  if (poseForcee) {
    // Tester les décisions de combat même si la pose n'est plus conseillée.
    resultat = rpgJouerCreature(duel, 'sorcier', attaquant);
  } else {
    const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
    assert.equal(annonce?.carteId, attaquant);
    resultat = rpgSorcierResoudreAnnonce(duel);
  }
  assert.ok(resultat.ok, JSON.stringify(resultat));
  const allie = resultat.entite;
  assert.ok(allie && allie.detruireFinDuTour);
  return { duel, ennemie, allie };
}

for (const cible of ['gardienne-des-portes-de-sable', 'pourfendeur-des-djinns']) {
  test(`classique : le Djinn déjà condamné attaque ${cible} pour la blesser`, () => {
    const { duel, ennemie, allie } = partie(cible);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
    assert.deepEqual(choix, { attaquantId: allie.id, cibleId: ennemie.id });
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
    assert.equal(rpgNoterCompteurEntites(duel), uid);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
    assert.equal(ennemie.pv, 2); assert.ok(!duel.sorcier.creatures.includes(allie));
    rpgFinDeTour(duel);
    assert.ok(duel.sorcier.cimetiere.includes(allie.carteId));
  });
}

test('classique : un Djinn normal n’est pas joué après la phase d’attaque', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.phase = 'principale2';
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5), null);
  assert.ok(duel.sorcier.main.includes('djinn-de-la-premiere-etincelle'));
});

test('classique : la Flamme mourante peut être jouée après l’attaque pour sa pioche', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.phase = 'principale2';
  duel.sorcier.main = ['djinn-de-la-flamme-mourante'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-flamme-mourante');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(duel.sorcier.main.length, 1);
});

test('classique : le renvoi de la Tour des Flots sauve le Djinn plutôt que le laisser disparaître', () => {
  const { duel, ennemie, allie } = partie('tour-des-flots');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: ennemie.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(ennemie.pv, 2);
  assert.ok(duel.sorcier.main.includes(allie.carteId));
  rpgFinDeTour(duel);
  assert.ok(duel.sorcier.main.includes(allie.carteId));
  assert.ok(!duel.sorcier.cimetiere.includes(allie.carteId));
});

test('classique : ne pas jeter le Djinn contre la Tour de Braise sans gain', () => {
  const { duel, ennemie, allie } = partie('tour-de-braise', 'djinn-de-la-premiere-etincelle', true);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(ennemie.pv, 4);
  rpgFinDeTour(duel);
  assert.ok(duel.sorcier.cimetiere.includes(allie.carteId));
});

test('classique : même main pleine, le Djinn peut blesser la Tour avant le renvoi', () => {
  const { duel, allie, ennemie } = partie('tour-des-flots');
  duel.sorcier.main = Array(6).fill('ashigaru-des-braises');
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: allie.id, cibleId: ennemie.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, ennemie.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(ennemie.pv, 2);
});

test('classique : une créature durable n’est pas traitée comme un Djinn éphémère', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  assert.ok(rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').ok);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['chacal-du-seuil'];
  const allie = rpgJouerCreature(duel, 'sorcier', 'chacal-du-seuil').entite;
  assert.ok(allie && !allie.detruireFinDuTour);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
});

test('classique : une synergie de mort peut rendre une pose tardive utile', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel);
  duel.sorcier.main = ['djinn-des-cendres-vengeresses'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'djinn-des-cendres-vengeresses').ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.phase = 'principale2'; duel.sorcier.main = ['djinn-de-la-premiere-etincelle'];
  const pv = duel.joueur.pv;
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.pv, pv - 1);
});

for (const carte of ['djinn-des-braises-voilees', 'djinn-de-la-fleche-ardente', 'djinn-de-foudre', 'djinn-du-dernier-brasier', 'djinn-des-ailes-de-cendre']) {
  test(`classique : ne pas gaspiller ${carte} après la phase d’attaque`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    rpgFinDeTour(duel); duel.phase = 'principale2'; duel.sorcier.main = [carte];
    assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5), null);
  });
}

for (const jet of [.5, .01]) test(`classique : le Djinn de la flèche tente sa frappe ciblée malgré la riposte (jet ${jet})`, () => {
  const { duel, ennemie, allie } = partie('pourfendeur-des-djinns', 'djinn-de-la-fleche-ardente');
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return jet; });
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: ennemie.id });
  assert.equal(jets, 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(ennemie.pv, jet === .01 ? 4 : 1);
  rpgFinDeTour(duel);
  assert.ok(duel.sorcier.cimetiere.includes(allie.carteId));
});

test('classique joueur : un Djinn éphémère utilise aussi son attaque avant de disparaître', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel);
  duel.sorcier.main = ['gardienne-des-portes-de-sable'];
  const cible = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  assert.ok(cible); rpgFinDeTour(duel);
  duel.joueur.main = ['djinn-de-la-premiere-etincelle'];
  const djinn = rpgJouerCreature(duel, 'joueur', 'djinn-de-la-premiere-etincelle').entite;
  assert.ok(djinn && djinn.detruireFinDuTour);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'joueur');
  assert.deepEqual(choix, { attaquantId: djinn.id, cibleId: cible.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'joueur', djinn.id, cible.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'joueur').ok);
  assert.equal(cible.pv, 2);
});

test('classique : le Djinn récupéré par la Tour des Flots reste rejouable au tour suivant', () => {
  const { duel, ennemie, allie } = partie('tour-des-flots');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: ennemie.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.ok(duel.sorcier.main.includes(allie.carteId));
  const rejoue = rpgJouerCreature(duel, 'sorcier', allie.carteId);
  assert.ok(rejoue.ok);
  assert.ok(rejoue.entite && rejoue.entite.id !== allie.id);
});

for (const carte of ['djinn-des-braises-voilees', 'djinn-de-la-flamme-mourante', 'djinn-du-dernier-brasier', 'djinn-de-la-premiere-etincelle', 'djinn-de-la-fleche-ardente', 'djinn-des-ailes-de-cendre', 'djinn-de-foudre']) {
  test(`classique : ${carte} peut être annoncé et frappe pendant son tour`, () => {
    const deck = Array(30).fill('ashigaru-des-braises');
    const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
    rpgFinDeTour(duel); duel.sorcier.main = [carte];
    assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, carte);
    const pose = rpgSorcierResoudreAnnonce(duel);
    assert.ok(pose.ok, JSON.stringify(pose));
    const djinn = pose.entite; const vie = duel.joueur.pv;
    const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
    assert.deepEqual(choix, { attaquantId: djinn.id, cibleId: null });
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, null).ok);
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
    assert.equal(duel.joueur.pv, vie - djinn.atk);
    rpgFinDeTour(duel);
    assert.ok(duel.sorcier.cimetiere.includes(carte));
  });
}

test('classique : ne pas traiter comme échange simple une blessure qui active Furie', () => {
  const { duel, ennemie } = partie('gardien-viking-du-fjord');
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(ennemie.pv, 4); assert.equal(ennemie.furieBonusAtk, 0);
});

test('classique : une réponse adverse à l’attaque du Djinn est résolue normalement', () => {
  const { duel, ennemie, allie } = partie();
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: ennemie.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  duel.joueur.main = ['grand-voile-blanc'];
  // Le joueur peut encore empêcher les blessures après l'annonce.
  assert.ok(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(ennemie.pv, 4);
  rpgFinDeTour(duel);
  assert.ok(duel.sorcier.cimetiere.includes(allie.carteId));
});

for (const inverse of [false, true]) test(`classique : invoquer le Djinn qui gagne immédiatement plutôt qu’une Gardienne (ordre ${inverse})`, () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.joueur.pv = 2;
  duel.sorcier.main = inverse
    ? ['gardienne-des-portes-de-sable', 'djinn-de-la-premiere-etincelle']
    : ['djinn-de-la-premiere-etincelle', 'gardienne-des-portes-de-sable'];
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'djinn-de-la-premiere-etincelle');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: pose.entite.id, cibleId: null });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.joueur.pv <= 0);
});

test('classique : un bouclier empêche de présumer la victoire du Djinn', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.joueur.pv = 2; duel.joueur.bouclier = 1;
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'gardienne-des-portes-de-sable'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'gardienne-des-portes-de-sable');
});

test('classique : un Défenseur empêche de présumer la victoire directe du Djinn', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  assert.ok(rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').ok);
  rpgFinDeTour(duel); duel.joueur.pv = 2;
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'gardienne-des-portes-de-sable'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'gardienne-des-portes-de-sable');
});

test('classique : la recherche d’invocation gagnante ne modifie ni duel ni hasard ni identifiants', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.joueur.pv = 2;
  duel.sorcier.main = ['gardienne-des-portes-de-sable', 'djinn-de-la-premiere-etincelle'];
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.equal(rpgNoterCompteurEntites(duel), uid);
});

test('classique : pas besoin de dépenser un Djinn si un allié déjà présent peut conclure', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.sorcier.main = ['chacal-du-seuil'];
  const allie = rpgJouerCreature(duel, 'sorcier', 'chacal-du-seuil').entite;
  assert.ok(allie); rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 2;
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'gardienne-des-portes-de-sable'];
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'gardienne-des-portes-de-sable');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: null });
});

test('classique : le Djinn de la flamme mourante peut gagner dès son arrivée malgré sa pioche', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.joueur.pv = 2;
  duel.sorcier.main = ['gardienne-des-portes-de-sable', 'djinn-de-la-flamme-mourante'];
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'djinn-de-la-flamme-mourante');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: pose.entite.id, cibleId: null });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.joueur.pv <= 0);
});

test('classique : une réponse à l’annonce peut empêcher la victoire du Djinn', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.joueur.pv = 2;
  duel.sorcier.main = ['gardienne-des-portes-de-sable', 'djinn-de-la-premiere-etincelle'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  duel.joueur.main = ['grand-voile-blanc'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(duel.joueur.pv, 2);
});

function avantInvocationFurtive(defenseur = null, voile = false) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  let ennemi = null;
  if (defenseur) {
    duel.joueur.main = [defenseur];
    ennemi = rpgJouerCreature(duel, 'joueur', defenseur).entite;
    assert.ok(ennemi);
  }
  rpgFinDeTour(duel);
  if (voile) {
    duel.joueur.main = ['grand-voile-blanc'];
    assert.ok(rpgOuvrirFenetreReponse(duel, 'sorcier'));
    assert.ok(rpgLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok);
    rpgFermerFenetreReponse(duel);
    assert.equal(duel.brouillardCombat, true);
  }
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle'];
  return { duel, ennemi };
}

for (const [defenseur, voile, description] of [
  ['tour-de-braise', false, 'la Tour de Braise détruit le Djinn sans être blessée'],
  [null, true, 'le Grand Voile bloque son unique attaque directe'],
]) test(`classique : conserver le Djinn en main quand ${description}`, () => {
  const { duel } = avantInvocationFurtive(defenseur, voile);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5), null);
  rpgFinDeTour(duel);
  assert.ok(duel.sorcier.main.includes('djinn-de-la-premiere-etincelle'));
});

test('classique : invoquer le Djinn si la Tour a été gelée', () => {
  const { duel, ennemi } = avantInvocationFurtive('tour-de-braise');
  duel.sorcier.main.unshift('poigne-de-givre');
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'poigne-de-givre', ennemi.id).ok);
  assert.ok(ennemi.gelToursRestants > 0);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: pose.entite.id, cibleId: ennemi.id });
});

test('classique : la Flamme mourante peut être invoquée pour sa pioche même contre la Tour', () => {
  const { duel } = avantInvocationFurtive('tour-de-braise');
  duel.sorcier.main = ['djinn-de-la-flamme-mourante'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-flamme-mourante');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(duel.sorcier.main.length, 1);
});

test('classique : une arme en main peut préparer une attaque sous le Voile', () => {
  const { duel } = avantInvocationFurtive(null, true);
  duel.sorcier.main.push('takouba-de-tin-hinan');
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'djinn-de-la-premiere-etincelle');
});

test('classique : sous le Voile, préférer une Gardienne durable au Djinn sans effet', () => {
  const { duel } = avantInvocationFurtive(null, true);
  duel.sorcier.main.push('gardienne-des-portes-de-sable');
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'gardienne-des-portes-de-sable');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.ok(duel.sorcier.main.includes('djinn-de-la-premiere-etincelle'));
  assert.ok(duel.sorcier.creatures.some((e) => e.carteId === 'gardienne-des-portes-de-sable'));
});

test('classique : sous le Voile, la Tour des Flots peut encore renvoyer le Djinn', () => {
  const { duel, ennemi } = avantInvocationFurtive('tour-des-flots', true);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: pose.entite.id, cibleId: ennemi.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.sorcier.main.includes(pose.entite.carteId));
});

test('classique : le Djinn vengeur peut rendre utile la mort du furtif contre la Tour', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['tour-de-braise'];
  assert.ok(rpgJouerCreature(duel, 'joueur', 'tour-de-braise').ok); rpgFinDeTour(duel);
  duel.sorcier.main = ['djinn-des-cendres-vengeresses'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'djinn-des-cendres-vengeresses').ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  const vie = duel.joueur.pv;
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.pv, vie - 1);
});

test('classique joueur : conserver le Djinn quand la Tour rend son attaque sans effet', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.sorcier.main = ['tour-de-braise'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'tour-de-braise').ok); rpgFinDeTour(duel);
  duel.joueur.main = ['djinn-de-la-premiere-etincelle'];
  assert.equal(choisirCarteIA(duel, 'joueur', { rng: () => .5 }), null);
});

test('classique : avec Poigne de givre en main, l’IA peut préparer la frappe du Djinn', () => {
  const { duel, ennemi } = avantInvocationFurtive('tour-de-braise');
  duel.sorcier.main.push('poigne-de-givre');
  const jouees = new Set();
  for (let i = 0; i < 2; i++) {
    const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
    assert.ok(annonce); jouees.add(annonce.carteId);
    assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  }
  assert.deepEqual([...jouees].sort(), ['djinn-de-la-premiere-etincelle', 'poigne-de-givre']);
  assert.ok(ennemi.gelToursRestants > 0);
  const djinn = duel.sorcier.creatures.find((e) => e.carteId === 'djinn-de-la-premiere-etincelle');
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: djinn.id, cibleId: ennemi.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(!duel.joueur.creatures.includes(ennemi));
});

test('classique : une Esquive incertaine ne prouve pas que la pose du Djinn est inutile', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable', 'cuirasse-de-sel'];
  const gardienne = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.ok(gardienne && rpgJouerArme(duel, 'joueur', 'cuirasse-de-sel', gardienne.id).ok);
  assert.ok(gardienne.esquive);
  rpgFinDeTour(duel); duel.sorcier.main = ['djinn-de-la-premiere-etincelle'];
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.equal(jets, 0);
});

function defenseurEtFurtif(blessure = 2, arme = 'takouba-des-pistes') {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const defenseur = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.ok(defenseur && rpgBlesserCreature(duel, 'joueur', defenseur.id, blessure).ok);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['gardienne-des-portes-de-sable'];
  const gardienne = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  assert.ok(gardienne);
  duel.sorcier.main = [arme];
  assert.ok(rpgJouerArme(duel, 'sorcier', arme, gardienne.id).ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle'];
  const djinn = rpgJouerCreature(duel, 'sorcier', 'djinn-de-la-premiere-etincelle').entite;
  assert.ok(djinn); assert.ok(gardienne.atk > 2); assert.equal(djinn.atk, 2);
  return { duel, defenseur, gardienne, djinn };
}

test('classique : utiliser le Djinn pour dégager le Défenseur et garder la Gardienne pour le sorcier', () => {
  const { duel, defenseur, gardienne, djinn } = defenseurEtFurtif();
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(premier, { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', premier.attaquantId, premier.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(!duel.joueur.creatures.includes(defenseur)); assert.ok(!duel.sorcier.creatures.includes(djinn));
  const second = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(second, { attaquantId: gardienne.id, cibleId: null });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', second.attaquantId, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 22); assert.equal(gardienne.pv, 4);
});

test('classique : ne pas envoyer le Djinn en premier s’il ne peut pas éliminer le Défenseur', () => {
  const { duel, defenseur, gardienne } = defenseurEtFurtif(1);
  assert.equal(defenseur.pv, 3);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: gardienne.id, cibleId: defenseur.id });
});

test('classique : une réponse qui renforce le Défenseur oblige à réévaluer la suite', () => {
  const { duel, defenseur, gardienne, djinn } = defenseurEtFurtif();
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(premier, { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', premier.attaquantId, premier.cibleId).ok);
  duel.joueur.main = ['rempart-de-dunes'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.joueur.creatures.includes(defenseur));
  assert.equal(duel.joueur.pv, 25);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: gardienne.id, cibleId: defenseur.id });
});

for (const bouclier of [1, 3]) test(`classique : choisir l’ordre qui perce le plus de bouclier (${bouclier})`, () => {
  const { duel, defenseur, gardienne, djinn } = defenseurEtFurtif();
  duel.joueur.bouclier = bouclier;
  const premier = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(premier, { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', premier.attaquantId, premier.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  const second = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(second, { attaquantId: gardienne.id, cibleId: null });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', second.attaquantId, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.bouclier, 0);
  assert.equal(duel.joueur.pv, 25 - (3 - bouclier));
});

test('classique : un attaquant imposé reste prioritaire sur le plan avec le Djinn', () => {
  const { duel, defenseur, gardienne } = defenseurEtFurtif();
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', gardienne.id),
    { attaquantId: gardienne.id, cibleId: defenseur.id });
});

test('classique : ne pas comparer comme simples deux attaques avec pioche et jeton', () => {
  const { duel, defenseur, gardienne } = defenseurEtFurtif(2, 'takouba-de-tin-hinan');
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: gardienne.id, cibleId: defenseur.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.sorcier.main.length, 1);
});

test('classique joueur : dégager le Défenseur avec le Djinn laisse la meilleure frappe directe', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable', 'takouba-des-pistes'];
  const gardienne = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.ok(gardienne && rpgJouerArme(duel, 'joueur', 'takouba-des-pistes', gardienne.id).ok);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['gardienne-des-portes-de-sable'];
  const defenseur = rpgJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable').entite;
  assert.ok(defenseur && rpgBlesserCreature(duel, 'sorcier', defenseur.id, 2).ok);
  rpgFinDeTour(duel);
  duel.joueur.main = ['djinn-de-la-premiere-etincelle'];
  const djinn = rpgJouerCreature(duel, 'joueur', 'djinn-de-la-premiere-etincelle').entite;
  assert.ok(djinn);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'joueur'),
    { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'joueur', djinn.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'joueur').ok);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'joueur'),
    { attaquantId: gardienne.id, cibleId: null });
});

function deuxCiblesFleche(ghulPremier = true, { allie = 'chasseuse-de-braise', blesserAllie = true, allieSupplementaire = null } = {}) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  const poserEnnemi = (id) => {
    duel.joueur.main = [id];
    const entite = rpgJouerCreature(duel, 'joueur', id).entite;
    assert.ok(entite);
    if (id === 'ghul-des-cendres') {
      duel.joueur.main = ['sandales-de-tislit'];
      assert.ok(rpgJouerArme(duel, 'joueur', 'sandales-de-tislit', entite.id).ok);
    } else {
      assert.ok(rpgBlesserCreature(duel, 'joueur', entite.id, 1).ok);
    }
    return entite;
  };
  const premier = poserEnnemi(ghulPremier ? 'ghul-des-cendres' : 'chien-du-guet');
  rpgFinDeTour(duel);
  if (allieSupplementaire) {
    duel.sorcier.main = [allieSupplementaire];
    assert.ok(rpgJouerCreature(duel, 'sorcier', allieSupplementaire).ok);
    rpgFinDeTour(duel); rpgFinDeTour(duel);
  }
  duel.sorcier.main = [allie];
  const durable = rpgJouerCreature(duel, 'sorcier', allie).entite;
  assert.ok(durable);
  if (blesserAllie) assert.ok(rpgBlesserCreature(duel, 'sorcier', durable.id, 1).ok);
  rpgFinDeTour(duel);
  const second = poserEnnemi(ghulPremier ? 'chien-du-guet' : 'ghul-des-cendres');
  rpgFinDeTour(duel);
  duel.sorcier.main = ['djinn-de-la-fleche-ardente'];
  const djinn = rpgJouerCreature(duel, 'sorcier', 'djinn-de-la-fleche-ardente').entite;
  assert.ok(djinn);
  const ghul = ghulPremier ? premier : second;
  const chien = ghulPremier ? second : premier;
  assert.deepEqual([ghul.atk, ghul.pv, chien.atk, chien.pv], [1, 2, 2, 1]);
  return { duel, ghul, chien, durable, djinn };
}

for (const ghulPremier of [true, false]) test(`classique : la Flèche choisit le Chien plutôt que le Ghul dangereux (${ghulPremier ? 'Ghul' : 'Chien'} en premier)`, () => {
  const { duel, ghul, chien, durable, djinn } = deuxCiblesFleche(ghulPremier);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: djinn.id, cibleId: chien.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(!duel.joueur.creatures.includes(chien)); assert.ok(duel.joueur.creatures.includes(ghul));
  assert.ok(duel.sorcier.creatures.includes(durable));
});

test('classique : le Ghul peut effectivement tuer l’alliée durable en réponse à sa destruction', () => {
  const { duel, ghul, durable, djinn } = deuxCiblesFleche();
  rpgReglerHasard(duel, () => .5);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, ghul.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.destructionsEnAttente?.[0]?.cote, 'joueur');
  assert.ok(rpgResoudreDestructionCiblee(duel, 'joueur', durable.id).ok);
  assert.ok(!duel.sorcier.creatures.includes(durable));
});

test('classique : un bouclier empêche le Ghul de tuer la seule alliée durable', () => {
  const { duel, ghul, durable, djinn } = deuxCiblesFleche();
  duel.sorcier.main = ['voile-de-la-lune-noire'];
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'voile-de-la-lune-noire', durable.id).ok);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: djinn.id, cibleId: ghul.id });
  rpgReglerHasard(duel, () => .5);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, ghul.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(rpgResoudreDestructionCiblee(duel, 'joueur', durable.id).ok);
  assert.ok(duel.sorcier.creatures.includes(durable));
});

test('classique : ne pas départager quand le Ghul ne peut tuer une alliée durable', () => {
  const { duel, ghul, djinn } = deuxCiblesFleche(true, { blesserAllie: false });
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', djinn.id), { attaquantId: djinn.id, cibleId: ghul.id });
});

test('classique : ne pas supposer inutile la mort d’une alliée dotée d’un effet de destruction', () => {
  const { duel, ghul, durable, djinn } = deuxCiblesFleche(true, { allie: 'ghul-des-cendres', blesserAllie: false });
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: djinn.id, cibleId: ghul.id });
  rpgReglerHasard(duel, () => .5);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, ghul.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(rpgResoudreDestructionCiblee(duel, 'joueur', durable.id).ok);
  assert.equal(duel.joueur.creatures.length, 0);
});

test('classique : départager les cibles même avec la Flèche imposée', () => {
  const { duel, chien, djinn } = deuxCiblesFleche();
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', djinn.id),
    { attaquantId: djinn.id, cibleId: chien.id });
});

test('classique : le tir conseillé peut rater sans consommer de hasard lors du choix', () => {
  const { duel, ghul, chien, durable, djinn } = deuxCiblesFleche();
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return 0; });
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: djinn.id, cibleId: chien.id });
  assert.equal(jets, 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, chien.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(jets > 0); assert.ok(duel.joueur.creatures.includes(chien));
  assert.ok(duel.joueur.creatures.includes(ghul)); assert.ok(duel.sorcier.creatures.includes(durable));
});

test('classique : ne pas ignorer un gain déclenché par la mort de l’alliée', () => {
  const { duel, ghul, durable, djinn } = deuxCiblesFleche(true, { allieSupplementaire: 'djinn-des-cendres-vengeresses' });
  const pv = duel.joueur.pv;
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', djinn.id),
    { attaquantId: djinn.id, cibleId: ghul.id });
  rpgReglerHasard(duel, () => .5);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, ghul.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(rpgResoudreDestructionCiblee(duel, 'joueur', durable.id).ok);
  assert.equal(duel.joueur.pv, pv - 1);
});

test('classique joueur : le départage prudent ne présume pas la réponse automatique du sorcier', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['chasseuse-de-braise'];
  const durable = rpgJouerCreature(duel, 'joueur', 'chasseuse-de-braise').entite;
  assert.ok(durable && rpgBlesserCreature(duel, 'joueur', durable.id, 1).ok);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['ghul-des-cendres'];
  const ghul = rpgJouerCreature(duel, 'sorcier', 'ghul-des-cendres').entite;
  assert.ok(ghul);
  duel.sorcier.main = ['sandales-de-tislit'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'sandales-de-tislit', ghul.id).ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main = ['chien-du-guet'];
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.ok(chien && rpgBlesserCreature(duel, 'sorcier', chien.id, 1).ok);
  rpgFinDeTour(duel);
  duel.joueur.main = ['djinn-de-la-fleche-ardente'];
  const djinn = rpgJouerCreature(duel, 'joueur', 'djinn-de-la-fleche-ardente').entite;
  assert.ok(djinn);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'joueur', djinn.id),
    { attaquantId: djinn.id, cibleId: ghul.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
});

test('classique : une Flèche équipée ne suit pas le départage des tirs simples', () => {
  const { duel, ghul, djinn } = deuxCiblesFleche();
  duel.sorcier.main = ['armure-de-cendres'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'armure-de-cendres', djinn.id).ok);
  assert.ok(djinn.contreAttaque);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', djinn.id),
    { attaquantId: djinn.id, cibleId: ghul.id });
});
