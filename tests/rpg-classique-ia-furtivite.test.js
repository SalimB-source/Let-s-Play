import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgBlesserCreature, rpgFermerFenetreReponse, rpgFinDeTour, rpgJouerArme, rpgJouerCreature, rpgLancerMagie, rpgNoterCompteurEntites, rpgNouveauDuel, rpgOuvrirFenetreReponse, rpgReglerHasard, rpgResoudreDestructionCiblee, rpgSorcierAnnonceSuivante, rpgSorcierResoudreAnnonce } from '../src/games/rpgDuel.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { choisirCarteIA, choisirSacrificesInvocationIA } from '../src/games/rpgAI.js';
import { duelCardById } from '../src/games/rpgCards.js';

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

test('classique : un bouclier ne fait plus choisir entre le Djinn et la Gardienne', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.joueur.pv = 2; duel.joueur.bouclier = 1;
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'gardienne-des-portes-de-sable'];
  // Une invocation par tour faisait préférer la Gardienne durable ; les deux
  // lignes libres posent le Djinn (à distance) puis la Gardienne (mêlée).
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.deepEqual(duel.sorcier.invocationsNormalesLignes, ['distance']);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'gardienne-des-portes-de-sable');
});

test('classique : un Défenseur détourne le Djinn, la mêlée suit sur son quota', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const defenseur = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable').entite;
  assert.ok(defenseur);
  rpgFinDeTour(duel); duel.joueur.pv = 2;
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'gardienne-des-portes-de-sable'];
  // Le Défenseur interdit toujours la victoire directe, mais ne coûte plus la
  // pose : le Djinn frappe la Défenseuse, puis la Gardienne arrive en mêlée.
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: pose.entite.id, cibleId: defenseur.id });
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

test('classique : l’allié déjà présent conclut, les deux lignes se remplissent', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgFinDeTour(duel); duel.sorcier.main = ['chacal-du-seuil'];
  const allie = rpgJouerCreature(duel, 'sorcier', 'chacal-du-seuil').entite;
  assert.ok(allie); rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.joueur.pv = 2;
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'gardienne-des-portes-de-sable'];
  // L'allié déjà présent conclut toujours ; les deux lignes libres permettent
  // en plus de poser le Djinn (distance) puis la Gardienne (mêlée).
  const annonce = rpgSorcierAnnonceSuivante(duel, () => .5);
  assert.equal(annonce?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: allie.id, cibleId: null });
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'gardienne-des-portes-de-sable');
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

function overkillFurtif(cote = 'sorcier', bouclier = 0, { carte = 'djinn-du-dernier-brasier', armeDefenseur = null } = {}) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  const adv = cote === 'sorcier' ? 'joueur' : 'sorcier';
  if (adv === 'sorcier') rpgFinDeTour(duel);
  duel[adv].main = ['pourfendeur-des-djinns'];
  const defenseur = rpgJouerCreature(duel, adv, 'pourfendeur-des-djinns').entite;
  assert.ok(defenseur);
  if (armeDefenseur) {
    duel[adv].main = [armeDefenseur];
    assert.ok(rpgJouerArme(duel, adv, armeDefenseur, defenseur.id).ok);
  }
  const blessures = armeDefenseur === 'cuirasse-de-sel' ? 5 : armeDefenseur === 'sandales-de-tislit' ? 3 : 2;
  assert.ok(rpgBlesserCreature(duel, adv, defenseur.id, blessures).ok);
  duel[adv].bouclier = bouclier;
  rpgFinDeTour(duel);
  if (carte === 'ifrit-des-ergs') {
    duel[cote].main = ['ashigaru-des-braises'];
    assert.ok(rpgJouerCreature(duel, cote, 'ashigaru-des-braises').ok);
    rpgFinDeTour(duel); rpgFinDeTour(duel);
  }
  duel[cote].main = [carte];
  const pose = rpgJouerCreature(duel, cote, carte);
  assert.ok(pose.ok, JSON.stringify(pose));
  const djinn = pose.entite;
  assert.ok(djinn && djinn.detruireFinDuTour && djinn.overkill);
  if (!armeDefenseur) assert.deepEqual([djinn.atk, djinn.pv, defenseur.atk, defenseur.pv], [carte === 'ifrit-des-ergs' ? 5 : 4, 3, 3, 2]);
  return { duel, djinn, defenseur, adv };
}

for (const cote of ['sorcier', 'joueur']) for (const bouclier of [0, 3]) {
  test(`classique ${cote} : le Djinn échange avec le Défenseur et son Overkill perce (${bouclier} bouclier)`, () => {
    const { duel, djinn, defenseur, adv } = overkillFurtif(cote, bouclier);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, cote), { attaquantId: djinn.id, cibleId: defenseur.id });
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, cote, djinn.id, defenseur.id).ok);
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, cote).ok);
    assert.ok(!duel[cote].creatures.includes(djinn)); assert.ok(!duel[adv].creatures.includes(defenseur));
    assert.equal(duel[adv].pv, 25 - Math.max(0, 2 - bouclier));
    assert.equal(duel[adv].bouclier, Math.max(0, bouclier - 2));
  });
}

test('classique : le moteur applique bien l’Overkill malgré la mort simultanée du Djinn', () => {
  const { duel, djinn, defenseur, adv } = overkillFurtif();
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel[adv].pv, 23);
  assert.ok(!duel.sorcier.creatures.includes(djinn));
  assert.ok(!duel.joueur.creatures.includes(defenseur));
});

test('classique : l’Ifrit furtif reconnaît aussi son échange avec Overkill', () => {
  const { duel, djinn, defenseur } = overkillFurtif('sorcier', 0, { carte: 'ifrit-des-ergs' });
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 22);
  assert.ok(!duel.joueur.creatures.includes(defenseur)); assert.ok(!duel.sorcier.creatures.includes(djinn));
});

test('classique : une réponse à l’Overkill peut sauver le Défenseur', () => {
  const { duel, djinn, defenseur } = overkillFurtif();
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, defenseur.id).ok);
  duel.joueur.main = ['rempart-de-dunes'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.joueur.creatures.includes(defenseur));
  assert.equal(defenseur.pv, 1); assert.equal(duel.joueur.pv, 25);
  assert.ok(!duel.sorcier.creatures.includes(djinn));
});

test('classique : une Esquive ne rend pas l’échange avec Overkill certain', () => {
  const { duel, djinn, defenseur } = overkillFurtif('sorcier', 0, { armeDefenseur: 'cuirasse-de-sel' });
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .01; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(jets > 0); assert.ok(duel.joueur.creatures.includes(defenseur)); assert.equal(duel.joueur.pv, 25);
});

test('classique : l’Overkill ne fait pas ignorer la pioche à la mort du Défenseur équipé', () => {
  const { duel, djinn, defenseur } = overkillFurtif('sorcier', 0, { armeDefenseur: 'licou-du-chien-de-sable' });
  const paquet = duel.joueur.deck.length;
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.deck.length, paquet - 1);
});

test('classique : l’attaquant imposé conserve sa cible avec Overkill', () => {
  const { duel, djinn, defenseur } = overkillFurtif();
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', djinn.id),
    { attaquantId: djinn.id, cibleId: defenseur.id });
});

for (const cote of ['sorcier', 'joueur']) for (const bouclier of [0, 3]) test(`classique ${cote} : l’Overkill élimine un Défenseur équipé des Sandales (${bouclier} bouclier)`, () => {
  const { duel, djinn, defenseur, adv } = overkillFurtif(cote, bouclier, { armeDefenseur: 'sandales-de-tislit' });
  assert.deepEqual([defenseur.atk, defenseur.pv], [3, 2]);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, cote), { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, cote, djinn.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, cote).ok);
  assert.ok(!duel[cote].creatures.includes(djinn)); assert.ok(!duel[adv].creatures.includes(defenseur));
  assert.equal(duel[adv].pv, 25 - Math.max(0, 2 - bouclier));
  assert.equal(duel[adv].bouclier, Math.max(0, bouclier - 2));
  assert.ok(duel[adv].cimetiere.includes('sandales-de-tislit'));
});

test('classique : les Sandales ne garantissent pas l’échange si une réponse renforce le Défenseur', () => {
  const { duel, djinn, defenseur } = overkillFurtif('sorcier', 0, { armeDefenseur: 'sandales-de-tislit' });
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, defenseur.id).ok);
  duel.joueur.main = ['rempart-de-dunes'];
  assert.ok(rpgLancerMagie(duel, 'joueur', 'rempart-de-dunes').ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(defenseur.pv, 1); assert.ok(duel.joueur.creatures.includes(defenseur));
  assert.equal(duel.joueur.pv, 25); assert.equal(defenseur.arme.carteId, 'sandales-de-tislit');
});

test('classique : l’Ifrit utilise son Overkill aussi contre les Sandales', () => {
  const { duel, djinn, defenseur } = overkillFurtif('sorcier', 0, { carte: 'ifrit-des-ergs', armeDefenseur: 'sandales-de-tislit' });
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: djinn.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', djinn.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.pv, 22);
  assert.ok(duel.joueur.cimetiere.includes('sandales-de-tislit'));
});

test('classique : sous le Grand Voile, les Sandales ne rendent pas l’attaque du Djinn utile', () => {
  const { duel } = overkillFurtif('sorcier', 0, { armeDefenseur: 'sandales-de-tislit' });
  duel.brouillardCombat = true;
  const avant = JSON.stringify(duel);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(JSON.stringify(duel), avant);
});

function furtifAvecAllie(cote = 'sorcier', { voile = true, allieId = 'gardienne-des-portes-de-sable', arme = null, ennemiId = null } = {}) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
  if (ennemiId) {
    if (adv === 'sorcier') rpgFinDeTour(duel);
    duel[adv].main = [ennemiId];
    assert.ok(rpgJouerCreature(duel, adv, ennemiId).ok);
  }
  if (duel.tour !== cote) rpgFinDeTour(duel);
  duel[cote].main = [allieId];
  const allie = rpgJouerCreature(duel, cote, allieId).entite;
  assert.ok(allie);
  if (arme) {
    duel[cote].main = [arme];
    assert.ok(rpgJouerArme(duel, cote, arme, allie.id).ok);
  }
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  if (voile) {
    duel[adv].main = ['grand-voile-blanc'];
    assert.ok(rpgOuvrirFenetreReponse(duel, cote));
    assert.ok(rpgLancerMagie(duel, adv, 'grand-voile-blanc').ok);
    rpgFermerFenetreReponse(duel);
    assert.equal(duel.brouillardCombat, true);
  }
  duel[cote].main = ['djinn-de-la-premiere-etincelle'];
  return { duel, allie, adv };
}

for (const cote of ['sorcier', 'joueur']) test(`classique ${cote} : conserver le Djinn sous le Voile avec une Gardienne alliée`, () => {
  const { duel, allie } = furtifAvecAllie(cote);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.equal(choisirCarteIA(duel, cote, { rng: () => .5 }), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(duel[cote].creatures.includes(allie));
});

test('classique : sous le Voile, l’IA garde en main le Djinn et son invocation avec une Gardienne seule', () => {
  const { duel, allie } = furtifAvecAllie();
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5), null);
  assert.equal(duel.sorcier.invocationNormaleJouee, false);
  rpgFinDeTour(duel);
  assert.ok(duel.sorcier.main.includes('djinn-de-la-premiere-etincelle'));
  assert.ok(duel.sorcier.creatures.includes(allie));
  assert.ok(!duel.sorcier.cimetiere.includes('djinn-de-la-premiere-etincelle'));
});

test('classique : sans le Voile, une Gardienne alliée n’empêche pas la frappe du Djinn', () => {
  const { duel, adv } = furtifAvecAllie('sorcier', { voile: false });
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', pose.entite.id, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel[adv].pv, 23);
});

test('classique : sous le Voile, une autre créature durable est préférée au Djinn inutile', () => {
  const { duel } = furtifAvecAllie();
  duel.sorcier.main.push('ashigaru-des-braises');
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'ashigaru-des-braises');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.ok(duel.sorcier.main.includes('djinn-de-la-premiere-etincelle'));
});

test('classique : sous le Voile avec une Gardienne, la Flamme mourante reste utile pour sa pioche', () => {
  const { duel } = furtifAvecAllie();
  duel.sorcier.main = ['djinn-de-la-flamme-mourante'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-flamme-mourante');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(duel.sorcier.main.length, 1);
});

test('classique : sous le Voile, la mort du furtif peut alimenter le Djinn vengeur allié', () => {
  const { duel, adv } = furtifAvecAllie('sorcier', { allieId: 'djinn-des-cendres-vengeresses' });
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  const vie = duel[adv].pv;
  rpgFinDeTour(duel);
  assert.equal(duel[adv].pv, vie - 1);
});

test('classique : une Gardienne équipée sort du cas simple de pose sous le Voile', () => {
  const { duel } = furtifAvecAllie('sorcier', { arme: 'takouba-de-tin-hinan' });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
});

test('classique : le filtre de pose sous le Voile ne dépend pas des cartes cachées adverses', () => {
  const { duel } = furtifAvecAllie();
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  for (const [main, paquet] of [
    [['rempart-de-dunes'], ['takouba-de-tin-hinan', 'ashigaru-des-braises']],
    [['poigne-de-givre'], ['djinn-des-cendres-vengeresses', 'ghul-des-cendres']],
  ]) {
    duel.joueur.main = main; duel.joueur.deck = paquet;
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  }
});

test('classique : avec une Gardienne alliée, la Tour des Flots sous le Voile peut récupérer le Djinn', () => {
  const { duel } = furtifAvecAllie('sorcier', { ennemiId: 'tour-des-flots' });
  const tour = duel.joueur.creatures.find((e) => e.carteId === 'tour-des-flots');
  assert.ok(tour);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', pose.entite.id, tour.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.sorcier.main.includes(pose.entite.carteId));
  assert.equal(tour.pv, 4);
});

for (const cote of ['sorcier', 'joueur']) test(`classique ${cote} : conserver le Djinn sous le Voile avec un Ashigaru allié`, () => {
  const { duel, allie } = furtifAvecAllie(cote, { allieId: 'ashigaru-des-braises' });
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.equal(choisirCarteIA(duel, cote, { rng: () => .5 }), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  assert.ok(duel[cote].creatures.includes(allie));
});

test('classique : sous le Voile, l’Ashigaru ne profite pas d’une attaque directe', () => {
  const { duel, allie, adv } = furtifAvecAllie('sorcier', { allieId: 'ashigaru-des-braises' });
  const pv = duel[adv].pv;
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel[adv].pv, pv);
  assert.deepEqual([allie.atk, allie.pv], [1, 1]);
});

test('classique : sans le Voile, le Djinn frappe même avec un Ashigaru allié', () => {
  const { duel, adv } = furtifAvecAllie('sorcier', { voile: false, allieId: 'ashigaru-des-braises' });
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  const pose = rpgSorcierResoudreAnnonce(duel); assert.ok(pose.ok);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', pose.entite.id, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel[adv].pv, 23);
});

test('classique : le Djinn sous le Voile consomme désormais l’invocation normale', () => {
  const { duel } = furtifAvecAllie('sorcier', { allieId: 'ashigaru-des-braises' });
  assert.equal(duel.sorcier.invocationNormaleJouee, false);
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'djinn-de-la-premiere-etincelle').ok);
  // Le Djinn des braises voilées n’a plus d’Invocation spéciale : sa pose
  // consomme l’invocation normale du tour.
  assert.equal(duel.sorcier.invocationNormaleJouee, true);
  duel.sorcier.invocationNormaleJouee = false;
  duel.sorcier.main = ['djinn-des-cendres-vengeresses'];
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'djinn-des-cendres-vengeresses').ok);
  const pv = duel.joueur.pv;
  rpgFinDeTour(duel);
  assert.equal(duel.joueur.pv, pv - 1);
});

test('classique : le Djinn des braises voilées n’est plus une carte à Invocation spéciale', async () => {
  const { rpgCarteEmbuscade } = await import('../src/games/rpgEmbuscade.js');
  assert.equal(rpgCarteEmbuscade('djinn-de-la-premiere-etincelle'), false);
  assert.equal(rpgCarteEmbuscade('djinn-des-cendres-vengeresses'), false);
});

test('classique : une arme sur l’Ashigaru sort du cas simple sous le Voile', () => {
  const { duel } = furtifAvecAllie('sorcier', { allieId: 'ashigaru-des-braises', arme: 'takouba-de-tin-hinan' });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
});

test('classique : l’invocation spéciale reste inutile même après consommation du quota normal', () => {
  const { duel } = furtifAvecAllie('sorcier', { allieId: 'ashigaru-des-braises' });
  duel.sorcier.invocationNormaleJouee = true;
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : l’IA garde le Djinn spécial sous le Voile et peut le jouer au tour suivant', () => {
  const { duel, allie } = furtifAvecAllie('sorcier', { allieId: 'ashigaru-des-braises' });
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5), null);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(duel.brouillardCombat, false);
  assert.ok(duel.sorcier.creatures.includes(allie));
  assert.ok(duel.sorcier.main.includes('djinn-de-la-premiere-etincelle'));
  assert.ok(!duel.sorcier.cimetiere.includes('djinn-de-la-premiere-etincelle'));
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
});

test('classique : l’effet du filtre avec l’Ashigaru ne dépend pas des cartes cachées', () => {
  const { duel } = furtifAvecAllie('sorcier', { allieId: 'ashigaru-des-braises' });
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  for (const [main, paquet] of [
    [['rempart-de-dunes'], ['takouba-de-tin-hinan', 'ashigaru-des-braises']],
    [['poigne-de-givre'], ['djinn-des-cendres-vengeresses', 'ghul-des-cendres']],
  ]) {
    duel.joueur.main = main; duel.joueur.deck = paquet;
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  }
});


function sacrificesApresAttaque(cote = 'sorcier', { poserDjinn = true, allieId = 'ashigaru-des-braises', carteSacrifice = 'orochi', ennemiId = 'ashigaru-des-braises' } = {}) {
  const { duel, allie } = furtifAvecAllie(cote, { voile: false, allieId, ennemiId });
  // Une attaque réellement résolue, puis la seconde principale : le Djinn
  // arrive prêt, mais la fenêtre où il aurait pu attaquer est passée.
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, cote, allie.id, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, cote).ok);
  duel.phase = 'principale2';
  if (!poserDjinn) {
    duel[cote].main.push(carteSacrifice);
    return { duel, allie };
  }
  const pose = rpgJouerCreature(duel, cote, 'djinn-de-la-premiere-etincelle');
  assert.ok(pose.ok); assert.equal(duel[cote].invocationNormaleJouee, false);
  duel[cote].main = ['orochi'];
  return { duel, allie, djinn: pose.entite };
}

for (const cote of ['sorcier', 'joueur']) test(`classique ${cote} : après l’attaque, ne pas surévaluer une frappe impossible en choisissant des sacrifices`, () => {
  const { duel, allie, djinn } = sacrificesApresAttaque(cote);
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  const choix = choisirCarteIA(duel, cote, { rng: () => .5 });
  assert.equal(choix?.carteId, 'orochi');
  assert.deepEqual(new Set(choix.sacrificeIds), new Set([allie.id, djinn.id]));
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  let pose;
  if (cote === 'sorcier') {
    assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'orochi');
    pose = rpgSorcierResoudreAnnonce(duel);
  } else pose = rpgJouerCreature(duel, cote, 'orochi', null, { sacrificeIds: choix.sacrificeIds });
  assert.ok(pose.ok, JSON.stringify(pose));
  assert.deepEqual(new Set(pose.sacrificeIds), new Set([allie.id, djinn.id]));
  assert.equal(pose.entite.carteId, 'orochi');
  assert.equal(pose.entite.id, `entite-${uid + 1}`);
});

test('classique : avant les attaques, la frappe encore disponible entre dans le coût des sacrifices', () => {
  const { duel } = sacrificesApresAttaque();
  duel.phase = 'principale';
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : après les attaques, l’IA refuse toujours de sacrifier une alliée trop précieuse', () => {
  const { duel, allie } = sacrificesApresAttaque();
  Object.assign(allie, { atk: 15, pv: 15, def: 15, pvMax: 15 });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : la recherche directe de sacrifices ne consomme pas les identifiants réels', () => {
  const { duel, allie, djinn } = sacrificesApresAttaque();
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  for (let i = 0; i < 3; i++) {
    const ids = choisirSacrificesInvocationIA(duel, 'sorcier', duelCardById('orochi'));
    assert.deepEqual(new Set(ids), new Set([allie.id, djinn.id]));
    assert.equal(rpgNoterCompteurEntites(duel), uid); assert.equal(JSON.stringify(duel), avant);
  }
  const pose = rpgJouerCreature(duel, 'sorcier', 'orochi', null, { sacrificeIds: [allie.id, djinn.id] });
  assert.ok(pose.ok); assert.equal(pose.entite.id, `entite-${uid + 1}`);
});

for (const cote of ['sorcier', 'joueur']) test(`classique ${cote} : après l’attaque, préparer Orochi avec le Djinn spécial`, () => {
  const { duel, allie } = sacrificesApresAttaque(cote, { poserDjinn: false });
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  const choix = choisirCarteIA(duel, cote, { rng: () => .5 });
  assert.equal(choix?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  let pose;
  if (cote === 'sorcier') {
    assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
    pose = rpgSorcierResoudreAnnonce(duel);
  } else pose = rpgJouerCreature(duel, cote, choix.carteId);
  assert.ok(pose.ok); assert.equal(pose.entite.id, `entite-${uid + 1}`);
  assert.equal(duel[cote].invocationNormaleJouee, false);
  const suivant = choisirCarteIA(duel, cote, { rng: () => .5 });
  assert.equal(suivant?.carteId, 'orochi');
  assert.deepEqual(new Set(suivant.sacrificeIds), new Set([allie.id, pose.entite.id]));
  let orochi;
  if (cote === 'sorcier') {
    assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'orochi');
    orochi = rpgSorcierResoudreAnnonce(duel);
  } else orochi = rpgJouerCreature(duel, cote, 'orochi', null, { sacrificeIds: suivant.sacrificeIds });
  assert.ok(orochi.ok); assert.equal(orochi.entite.carteId, 'orochi');
  assert.ok(duel[cote].cimetiere.includes('djinn-de-la-premiere-etincelle'));
});

test('classique : ne pas préparer Orochi si le quota normal est déjà utilisé', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false });
  duel.sorcier.invocationNormaleJouee = true;
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : ne pas préparer Orochi si sacrifier l’Ashigaru serait trop coûteux', () => {
  const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false });
  Object.assign(allie, { atk: 15, pv: 15, def: 15, pvMax: 15 });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : ne pas poser le Djinn en seconde principale sans Orochi à préparer', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false });
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle'];
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : la préparation d’Orochi ne lit pas les cartes cachées adverses', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false });
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  for (const [main, deck] of [
    [['rempart-de-dunes'], ['takouba-de-tin-hinan', 'ashigaru-des-braises']],
    [['poigne-de-givre'], ['djinn-des-cendres-vengeresses', 'ghul-des-cendres']],
  ]) {
    duel.joueur.main = main; duel.joueur.deck = deck;
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0); assert.equal(rpgNoterCompteurEntites(duel), uid);
  }
});

test('classique : une réponse détruisant l’Ashigaru interrompt le plan Orochi', () => {
  const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false });
  duel.joueur.main = ['trait-de-braise'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', allie.id).ok);
  assert.ok(!duel.sorcier.creatures.includes(allie));
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5), null);
  assert.ok(duel.sorcier.main.includes('orochi'));
});

test('classique : ne pas préparer une invocation explicitement exclue', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5, exclus: new Set(['orochi']) }), null);
});

test('classique : une carte supplémentaire laisse la recherche tardive prudente', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false });
  duel.sorcier.main.push('ashigaru-des-braises');
  const choix = choisirCarteIA(duel, 'sorcier', { rng: () => .5 });
  assert.notEqual(choix?.carteId, 'djinn-de-la-premiere-etincelle');
});

for (const allieId of ['novice-des-cendres', 'messagere-des-cendres']) for (const cote of ['sorcier', 'joueur']) {
  test(`classique ${cote} : ${allieId} peut aussi aider à préparer Orochi`, () => {
    const { duel, allie } = sacrificesApresAttaque(cote, { poserDjinn: false, allieId });
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    assert.equal(choisirCarteIA(duel, cote, { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
    assert.equal(JSON.stringify(duel), avant); assert.equal(rpgNoterCompteurEntites(duel), uid); assert.equal(jets, 0);
    let resultatDjinn;
    if (cote === 'sorcier') {
      assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
      resultatDjinn = rpgSorcierResoudreAnnonce(duel);
    } else resultatDjinn = rpgJouerCreature(duel, cote, 'djinn-de-la-premiere-etincelle');
    assert.ok(resultatDjinn.ok); const djinn = resultatDjinn.entite;
    assert.equal(djinn.id, `entite-${uid + 1}`);
    const choix = choisirCarteIA(duel, cote, { rng: () => .5 });
    assert.equal(choix?.carteId, 'orochi');
    assert.deepEqual(new Set(choix.sacrificeIds), new Set([allie.id, djinn.id]));
    let pose;
    if (cote === 'sorcier') {
      assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'orochi');
      pose = rpgSorcierResoudreAnnonce(duel);
    } else pose = rpgJouerCreature(duel, cote, 'orochi', null, { sacrificeIds: choix.sacrificeIds });
    assert.ok(pose.ok); assert.equal(pose.entite.carteId, 'orochi');
  });
}

for (const allieId of ['novice-des-cendres', 'messagere-des-cendres']) {
  test(`classique : une ${allieId} équipée ne relève pas du plan simple`, () => {
    const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false, allieId });
    duel.sorcier.main = ['takouba-de-tin-hinan'];
    assert.ok(rpgJouerArme(duel, 'sorcier', 'takouba-de-tin-hinan', allie.id).ok);
    duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'orochi'];
    assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
  });
  test(`classique : ne pas sacrifier une ${allieId} trop renforcée pour préparer Orochi`, () => {
    const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false, allieId });
    Object.assign(allie, { atk: 15, pv: 15, def: 15, pvMax: 15 });
    assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
  });
}

test('classique : le Ghul et sa destruction ciblée restent hors du plan simple', () => {
  const { duel, allie } = sacrificesApresAttaque('joueur', { poserDjinn: false, allieId: 'ghul-des-cendres' });
  assert.equal(choisirCarteIA(duel, 'joueur', { rng: () => .5 }), null);
  const djinn = rpgJouerCreature(duel, 'joueur', 'djinn-de-la-premiere-etincelle').entite;
  assert.ok(djinn);
  assert.ok(rpgJouerCreature(duel, 'joueur', 'orochi', null, { sacrificeIds: [allie.id, djinn.id] }).ok);
  assert.equal(duel.destructionsEnAttente?.[0]?.carteId, 'ghul-des-cendres');
  const ennemi = duel.sorcier.creatures[0];
  assert.ok(rpgResoudreDestructionCiblee(duel, 'joueur', ennemi.id).ok);
  assert.ok(!duel.sorcier.creatures.includes(ennemi));
});

test('classique : la réponse adverse peut interrompre le plan avec la Messagère', () => {
  const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false, allieId: 'messagere-des-cendres' });
  duel.joueur.main = ['trait-de-braise'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', allie.id).ok);
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5), null);
  assert.ok(duel.sorcier.main.includes('orochi'));
});

for (const allieId of ['novice-des-cendres', 'messagere-des-cendres']) {
  test(`classique : le plan avec ${allieId} ne dépend pas de la main adverse ni des paquets`, () => {
    const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false, allieId });
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    for (const [main, deck, paquetAllie] of [
      [['rempart-de-dunes'], ['takouba-de-tin-hinan', 'ashigaru-des-braises'], ['ashigaru-des-braises', 'ghul-des-cendres']],
      [['poigne-de-givre'], ['djinn-des-cendres-vengeresses', 'ghul-des-cendres'], ['trait-de-braise', 'orochi']],
    ]) {
      duel.joueur.main = main; duel.joueur.deck = deck; duel.sorcier.deck = paquetAllie;
      const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
      assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
      assert.equal(JSON.stringify(duel), avant); assert.equal(rpgNoterCompteurEntites(duel), uid); assert.equal(jets, 0);
    }
  });
}

for (const allieId of ['ashigaru-des-braises', 'novice-des-cendres', 'messagere-des-cendres']) for (const cote of ['sorcier', 'joueur']) {
  test(`classique ${cote} : préparer le Fléau avec l’Étincelle et ${allieId}`, () => {
    const { duel, allie } = sacrificesApresAttaque(cote, { poserDjinn: false, allieId, carteSacrifice: 'fleau-de-la-lune-noire' });
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    assert.equal(choisirCarteIA(duel, cote, { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
    assert.equal(JSON.stringify(duel), avant); assert.equal(rpgNoterCompteurEntites(duel), uid); assert.equal(jets, 0);
    let premiere;
    if (cote === 'sorcier') {
      assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
      premiere = rpgSorcierResoudreAnnonce(duel);
    } else premiere = rpgJouerCreature(duel, cote, 'djinn-de-la-premiere-etincelle');
    assert.ok(premiere.ok); assert.equal(premiere.entite.id, `entite-${uid + 1}`);
    const choix = choisirCarteIA(duel, cote, { rng: () => .5 });
    assert.equal(choix?.carteId, 'fleau-de-la-lune-noire');
    assert.deepEqual(new Set(choix.sacrificeIds), new Set([allie.id, premiere.entite.id]));
    let seconde;
    if (cote === 'sorcier') {
      assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'fleau-de-la-lune-noire');
      seconde = rpgSorcierResoudreAnnonce(duel);
    } else seconde = rpgJouerCreature(duel, cote, choix.carteId, null, { sacrificeIds: choix.sacrificeIds });
    assert.ok(seconde.ok, JSON.stringify(seconde)); assert.equal(seconde.entite.carteId, choix.carteId);
    assert.equal(seconde.entite.id, `entite-${uid + 2}`);
    assert.ok(duel[cote].cimetiere.includes('djinn-de-la-premiere-etincelle'));
  });
}

for (const allieId of ['ashigaru-des-braises', 'novice-des-cendres', 'messagere-des-cendres']) {
  test(`classique : conserver une ${allieId} trop précieuse plutôt que préparer le Fléau`, () => {
    const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false, allieId, carteSacrifice: 'fleau-de-la-lune-noire' });
    Object.assign(allie, { atk: 15, pv: 15, def: 15, pvMax: 15 });
    assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
  });
}

test('classique : ne pas préparer le Fléau sans quota normal', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false, carteSacrifice: 'fleau-de-la-lune-noire' });
  duel.sorcier.invocationNormaleJouee = true;
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : ne pas préparer le Fléau explicitement exclu', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false, carteSacrifice: 'fleau-de-la-lune-noire' });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5, exclus: new Set(['fleau-de-la-lune-noire']) }), null);
});

test('classique : le Fléau ne justifie pas le plan si l’alliée est équipée', () => {
  const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false, carteSacrifice: 'fleau-de-la-lune-noire' });
  duel.sorcier.main = ['takouba-de-tin-hinan'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'takouba-de-tin-hinan', allie.id).ok);
  duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'fleau-de-la-lune-noire'];
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : une arrivée ciblée comme le Kraken reste hors du plan simple', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false, carteSacrifice: 'kraken' });
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
});

test('classique : le plan Fléau ne dépend pas des cartes cachées ou de l’aléa réel', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false, carteSacrifice: 'fleau-de-la-lune-noire' });
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  for (const [main, deck, paquetAllie] of [
    [['trait-de-braise'], ['ashigaru-des-braises', 'takouba-de-tin-hinan'], ['ghul-des-cendres', 'ashigaru-des-braises']],
    [['rempart-de-dunes'], ['djinn-des-cendres-vengeresses', 'poigne-de-givre'], ['orochi', 'trait-de-braise']],
  ]) {
    duel.joueur.main = main; duel.joueur.deck = deck; duel.sorcier.deck = paquetAllie;
    const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
    assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 })?.carteId, 'djinn-de-la-premiere-etincelle');
    assert.equal(JSON.stringify(duel), avant); assert.equal(rpgNoterCompteurEntites(duel), uid); assert.equal(jets, 0);
  }
});

test('classique : après une réponse au Fléau, l’IA renonce si le Djinn a été détruit', () => {
  const { duel, allie } = sacrificesApresAttaque('sorcier', { poserDjinn: false, carteSacrifice: 'fleau-de-la-lune-noire' });
  duel.joueur.main = ['trait-de-braise'];
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  const djinn = rpgSorcierResoudreAnnonce(duel).entite; assert.ok(djinn);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'fleau-de-la-lune-noire');
  assert.ok(rpgLancerMagie(duel, 'joueur', 'trait-de-braise', djinn.id).ok);
  const resultat = rpgSorcierResoudreAnnonce(duel);
  assert.equal(resultat.ok, false); assert.equal(resultat.raison, 'sacrifice-inutile');
  assert.ok(duel.sorcier.creatures.includes(allie)); assert.ok(duel.sorcier.main.includes('fleau-de-la-lune-noire'));
});

test('classique : le plan Fléau peut rester utile malgré sa Résonance adverse', () => {
  const { duel } = sacrificesApresAttaque('sorcier', { poserDjinn: false, carteSacrifice: 'fleau-de-la-lune-noire', ennemiId: 'novice-des-cendres' });
  const ennemi = duel.joueur.creatures[0];
  assert.deepEqual([ennemi.atk, ennemi.pv], [1, 1]);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'djinn-de-la-premiere-etincelle');
  assert.ok(rpgSorcierResoudreAnnonce(duel).ok);
  assert.equal(rpgSorcierAnnonceSuivante(duel, () => .5)?.carteId, 'fleau-de-la-lune-noire');
  const fleau = rpgSorcierResoudreAnnonce(duel).entite;
  assert.ok(fleau); assert.deepEqual([fleau.atk, fleau.pv], [8, 8]);
  assert.deepEqual([ennemi.atk, ennemi.pv], [2, 2]);
});

test('classique : le plan Fléau est refusé si sa Résonance renforce trop de Vampires adverses', () => {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['novice-des-cendres'];
  assert.ok(rpgJouerCreature(duel, 'joueur', 'novice-des-cendres').ok);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['ashigaru-des-braises'];
  const allie = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite; assert.ok(allie);
  rpgFinDeTour(duel);
  duel.joueur.main = ['messagere-des-cendres', 'chasseuse-de-braise'];
  assert.ok(rpgJouerCreature(duel, 'joueur', 'messagere-des-cendres').ok);
  assert.ok(rpgJouerCreature(duel, 'joueur', 'chasseuse-de-braise').ok);
  rpgFinDeTour(duel);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', allie.id, null).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  duel.phase = 'principale2'; duel.sorcier.main = ['djinn-de-la-premiere-etincelle', 'fleau-de-la-lune-noire'];
  const adversaires = [...duel.joueur.creatures];
  assert.deepEqual(adversaires.map(e => [e.atk, e.pv]), [[1, 1], [1, 1], [2, 2]]);
  const uid = rpgNoterCompteurEntites(duel); const avant = JSON.stringify(duel);
  assert.equal(choisirCarteIA(duel, 'sorcier', { rng: () => .5 }), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(rpgNoterCompteurEntites(duel), uid);
  // Vérifier la conséquence réelle de la ligne refusée.
  const djinn = rpgJouerCreature(duel, 'sorcier', 'djinn-de-la-premiere-etincelle').entite; assert.ok(djinn);
  assert.ok(rpgJouerCreature(duel, 'sorcier', 'fleau-de-la-lune-noire', null, { sacrificeIds: [allie.id, djinn.id] }).ok);
  assert.deepEqual(adversaires.map(e => [e.atk, e.pv]), [[2, 2], [2, 2], [3, 3]]);
});

test('classique : la Flèche ne suppose pas les coups critique et ordinaire équivalents', () => {
  const { duel, ghul, chien, djinn } = deuxCiblesFleche();
  // Seul le critique tuerait le Chien : ce n'est plus un départage entre
  // deux destructions garanties, même si le critique peut y parvenir.
  chien.pv = chien.def = chien.pvMax = 4;
  const avant = JSON.stringify(duel); let jets = 0;
  rpgReglerHasard(duel, () => { jets++; return .5; });
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', djinn.id), { attaquantId: djinn.id, cibleId: ghul.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
});
