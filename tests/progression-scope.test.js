/**
 * Progression rangée par JOUEUR, pas par appareil.
 * ------------------------------------------------
 * Les jeux écrivent leur progression dans Supabase (une ligne privée par
 * compte) et n'en gardent qu'une copie de travail sur l'appareil. Ce fichier
 * vérifie la règle qui rend cette copie inoffensive sur une machine partagée
 * — le PC de la maison, la coque PC installée, un ordinateur de cybercafé :
 *
 *   - visiteur : clé nue (`letsplay_sablier_bourse_v1`) ;
 *   - compte   : clé suffixée (`letsplay_sablier_bourse_v1:user:<id>`).
 *
 * Deux comptes qui se connectent tour à tour sur le MÊME appareil ne lisent
 * donc jamais la progression l'un de l'autre, et la partie commencée hors
 * ligne est reprise UNE seule fois par le premier compte qui se connecte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleProgression,
  definirProprietaireProgression,
  definirSessionPrete,
  effacerProgression,
  ecrireProgression,
  lireProgression,
  normaliserProprietaire,
  proprietaireProgression,
} from '../src/lib/progressionScope.js';
import {
  RPG_BOURSE_STORAGE_KEY,
  chargerPortefeuille,
  crediterCredits,
  portefeuilleVide,
  sauverPortefeuille,
} from '../src/games/rpgCredits.js';
import {
  RPG_STORY_STORAGE_KEY,
  chargerProgressionHistoire,
  marquerEtageVaincu,
  progressionHistoireVide,
  sauverProgressionHistoire,
} from '../src/games/rpgStory.js';
import { chargerGraine } from '../src/games/rpgQuetes.js';
import { LEVELS_KEY, readLocalProgress, saveLocalProgress } from '../src/quizzes/quizProgress.js';
import { tousLesEtages } from '../src/games/rpgStoryTours.js';

/** Deux étages réels du catalogue (un identifiant inconnu est normalisé en « rien »). */
const [PREMIER_ETAGE, SECOND_ETAGE] = tousLesEtages().map((entree) => entree.etage.id);

const COMPTE_A = '11111111-1111-1111-1111-111111111111';
const COMPTE_B = '22222222-2222-2222-2222-222222222222';

/** `localStorage` en mémoire, remplacé le temps d'un test puis rétabli. */
function withStockage(test) {
  const donnees = new Map();
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (cle) => (donnees.has(cle) ? donnees.get(cle) : null),
      setItem: (cle, valeur) => donnees.set(cle, String(valeur)),
      removeItem: (cle) => donnees.delete(cle),
      get length() { return donnees.size; },
      key: (index) => [...donnees.keys()][index] ?? null,
    },
  });
  // Les modules de quizz gardent le garde-fou `typeof window !== 'undefined'` :
  // on leur donne une fenêtre minimale, comme un navigateur.
  const fenetrePrecedente = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: globalThis.localStorage },
  });
  try {
    return test(donnees);
  } finally {
    definirProprietaireProgression(null);
    definirSessionPrete(true);
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
}

test('les clés portent le compte du joueur, et la clé nue reste celle du visiteur', () => {
  assert.equal(cleProgression('letsplay_test_v1', null), 'letsplay_test_v1');
  assert.equal(cleProgression('letsplay_test_v1', COMPTE_A), `letsplay_test_v1:user:${COMPTE_A}`);
  assert.equal(cleProgression('letsplay_test_v1', '  '), 'letsplay_test_v1');
  assert.equal(normaliserProprietaire('  '), null);
  assert.equal(normaliserProprietaire(42), null);
});

test('la portée suit la connexion : le propriétaire se pose et se retire', () => {
  withStockage(() => {
    assert.equal(proprietaireProgression(), null);
    assert.equal(definirProprietaireProgression(COMPTE_A), true, 'changement de joueur');
    assert.equal(proprietaireProgression(), COMPTE_A);
    assert.equal(definirProprietaireProgression(COMPTE_A), false, 'même joueur : rien ne bouge');
    definirProprietaireProgression(null);
    assert.equal(proprietaireProgression(), null, 'déconnexion : retour aux clés invité');
  });
});

test('le portefeuille d’un compte n’est jamais celui d’un autre sur le même appareil', () => {
  withStockage((donnees) => {
    // Le joueur A se connecte, joue, encaisse.
    definirProprietaireProgression(COMPTE_A);
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 500).portefeuille);
    assert.equal(chargerPortefeuille().credits, 500);
    assert.ok(donnees.has(`${RPG_BOURSE_STORAGE_KEY}:user:${COMPTE_A}`), 'clé du compte A');

    // Le joueur B se connecte sur le MÊME appareil : il part de zéro.
    definirProprietaireProgression(COMPTE_B);
    assert.equal(chargerPortefeuille().credits, 0, 'aucun héritage du compte A');
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 90).portefeuille);
    assert.equal(chargerPortefeuille().credits, 90);

    // A revient : sa progression est intacte.
    definirProprietaireProgression(COMPTE_A);
    assert.equal(chargerPortefeuille().credits, 500, 'le compte A retrouve sa bourse');

    // Un visiteur (déconnecté) ne voit la bourse de personne.
    definirProprietaireProgression(null);
    assert.equal(chargerPortefeuille().credits, 0, 'la clé nue reste celle du visiteur');
  });
});

test('la progression Histoire et les niveaux de quizz suivent le même cloisonnement', () => {
  withStockage(() => {
    definirProprietaireProgression(COMPTE_A);
    const gagne = marquerEtageVaincu(progressionHistoireVide(), PREMIER_ETAGE);
    sauverProgressionHistoire(gagne);
    saveLocalProgress({ 'culture-gaming': { easy: true } });

    definirProprietaireProgression(COMPTE_B);
    assert.deepEqual(chargerProgressionHistoire().etagesVaincus, [], 'B ne voit pas les étages de A');
    assert.deepEqual(readLocalProgress(), {}, 'B ne voit pas les niveaux terminés par A');

    definirProprietaireProgression(COMPTE_A);
    assert.ok(chargerProgressionHistoire().etagesVaincus.includes(PREMIER_ETAGE));
    assert.equal(readLocalProgress()['culture-gaming'].easy, true);
  });
});

test('la partie commencée hors ligne est reprise UNE fois par le premier compte connecté', () => {
  withStockage((donnees) => {
    // Visiteur : il joue avant d'avoir un compte.
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 240).portefeuille);
    assert.ok(donnees.has(RPG_BOURSE_STORAGE_KEY));

    // Première connexion : sa bourse rejoint le compte A…
    definirProprietaireProgression(COMPTE_A);
    assert.equal(chargerPortefeuille().credits, 240, 'rien de perdu à la connexion');
    assert.ok(donnees.has(`${RPG_BOURSE_STORAGE_KEY}:user:${COMPTE_A}`));
    assert.equal(donnees.has(RPG_BOURSE_STORAGE_KEY), false, 'la clé invité est retirée');

    // …et B, qui se connecte ensuite sur la même machine, ne l'hérite pas.
    definirProprietaireProgression(COMPTE_B);
    assert.equal(chargerPortefeuille().credits, 0, 'aucune fuite vers le compte suivant');
  });
});

test('une copie invité écrite avant la résolution de la session n’est jamais reprise', () => {
  withStockage((donnees) => {
    // Ce que fait un joueur CONNECTÉ dont la session n'est pas encore résolue :
    // la page rend avec un propriétaire nul et écrit sous les clés invité.
    definirSessionPrete(false);
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 500).portefeuille);
    assert.ok(donnees.has(`${RPG_BOURSE_STORAGE_KEY}:invite-en-attente`),
      'la copie visiteur est marquée « écrite pendant l’attente »');

    // La session se résout : c'est le compte A. Il ne doit pas hériter.
    definirSessionPrete(true);
    definirProprietaireProgression(COMPTE_A);
    assert.equal(chargerPortefeuille().credits, 0,
      'aucune reprise d’une copie écrite avant la résolution');

    // Un vrai visiteur, lui, reste reprenable : session résolue, pas de compte.
    definirProprietaireProgression(null);
    definirSessionPrete(true);
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 90).portefeuille);
    assert.equal(donnees.has(`${RPG_BOURSE_STORAGE_KEY}:invite-en-attente`), false,
      'une écriture visiteur après résolution retire la marque');
    definirProprietaireProgression(COMPTE_A);
    assert.equal(chargerPortefeuille().credits, 90, 'la reprise unique tient toujours');
  });
});

test('une clé peut refuser la reprise : la copie invité reste à l’invité', () => {
  withStockage(() => {
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 240).portefeuille);
    definirProprietaireProgression(COMPTE_A);
    assert.equal(lireProgression(RPG_BOURSE_STORAGE_KEY, undefined, { reprise: false }), null,
      'sans reprise, le compte ne voit rien de l’invité');
    assert.equal(chargerPortefeuille().credits, 240, 'les autres clés reprennent comme avant');
  });
});

test('la graine des quêtes est stable par compte, et propre à l’appareil pour un visiteur', () => {
  withStockage(() => {
    const grainePC = chargerGraine(COMPTE_A);
    const graineMobile = chargerGraine(COMPTE_A);
    assert.equal(grainePC, graineMobile, 'mêmes quêtes du jour sur tous les appareils du joueur');
    assert.ok(grainePC.includes(COMPTE_A), 'la graine dérive du compte');
    assert.notEqual(chargerGraine(COMPTE_B), grainePC, 'deux comptes, deux tirages');

    const invite = chargerGraine();
    assert.ok(invite.startsWith('appareil-'), 'un visiteur garde la graine de l’appareil');
    assert.equal(chargerGraine(), invite, 'et la retrouve à chaque visite');
  });
});

test('l’effacement ne touche que le joueur courant', () => {
  withStockage(() => {
    definirProprietaireProgression(COMPTE_A);
    ecrireProgression('letsplay_test_effacement', 'A');
    definirProprietaireProgression(COMPTE_B);
    ecrireProgression('letsplay_test_effacement', 'B');

    assert.equal(effacerProgression('letsplay_test_effacement'), true);
    assert.equal(lireProgression('letsplay_test_effacement'), null);

    definirProprietaireProgression(COMPTE_A);
    assert.equal(lireProgression('letsplay_test_effacement'), 'A', 'A garde sa valeur');

    definirProprietaireProgression(null);
    assert.equal(lireProgression('letsplay_test_effacement'), null, 'rien sur la clé invité');
  });
});

test('sans stockage utilisable, rien ne casse (mode privé, iframe sandboxée)', () => {
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const fenetrePrecedente = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
  try {
    definirProprietaireProgression(COMPTE_A);
    assert.equal(lireProgression(RPG_BOURSE_STORAGE_KEY), null);
    assert.equal(ecrireProgression(RPG_BOURSE_STORAGE_KEY, 'x'), false);
    assert.equal(chargerPortefeuille().credits, 0);
    assert.equal(chargerGraine(COMPTE_A).includes(COMPTE_A), true, 'la graine du compte ne demande aucun stockage');
  } finally {
    definirProprietaireProgression(null);
    if (fenetrePrecedente) Object.defineProperty(globalThis, 'window', fenetrePrecedente);
    else delete globalThis.window;
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
});

test('la clé de progression Histoire reste lisible dans son ancienne version', () => {
  withStockage((donnees) => {
    // Sauvegarde v2 d'un visiteur, puis connexion : la reprise lit la même clé.
    const ancienne = { version: 2, etagesVaincus: [SECOND_ETAGE], recit: null };
    donnees.set(RPG_STORY_STORAGE_KEY, JSON.stringify(ancienne));
    definirProprietaireProgression(COMPTE_A);
    assert.deepEqual(chargerProgressionHistoire().etagesVaincus, [SECOND_ETAGE]);
    assert.ok(donnees.has(`${RPG_STORY_STORAGE_KEY}:user:${COMPTE_A}`));
  });
});

test('les niveaux de quizz gardent leur ancienne clé invité hors connexion', () => {
  withStockage((donnees) => {
    saveLocalProgress({ 'quiz-test': { easy: true, medium: true } });
    assert.ok(donnees.has(LEVELS_KEY), 'clé nue pour un visiteur');
    assert.deepEqual(readLocalProgress()['quiz-test'], { easy: true, medium: true });
  });
});
