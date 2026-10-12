import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cardById } from '../src/games/rpgCards.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { RPG_STORY_CAST, RPG_STORY_DECORS, personnageEtage, personnageHistoire, portraitHistoire } from '../src/games/rpgStoryCast.js';
import { RPG_STORY_CAMPAIGN_FLOORS, RPG_STORY_SCENES, RPG_STORY_SURVIVANTS, RPG_STORY_LIST_CHOICE, sceneHistoire, texteReplique } from '../src/games/rpgStoryScenes.js';
import { recitHistoireVide, normaliserRecitHistoire, transitionRecitHistoire, resumeRecitHistoire } from '../src/games/rpgStoryFlow.js';
import { RPG_STORY_STORAGE_KEY, RPG_STORY_LEGACY_STORAGE_KEY, progressionHistoireVide, normaliserProgressionHistoire, marquerEtageVaincu, chargerProgressionHistoire, sauverProgressionHistoire, reinitialiserProgressionHistoire } from '../src/games/rpgStory.js';
import { etageHistoireParId } from '../src/games/rpgStoryTours.js';

function agir(recit, type, extra = {}, victoires = RPG_STORY_CAMPAIGN_FLOORS) {
  return transitionRecitHistoire(recit, { type, curseur: recit.curseur, ...extra }, victoires);
}
function finirScene(recit) {
  return agir(agir(recit, 'resumer'), 'continuer');
}
function jusquAuChoix() {
  let recit = finirScene(recitHistoireVide());
  recit = agir(recit, 'deja-vaincu', { etageId: 'listes-1' });
  recit = finirScene(recit);
  recit = finirScene(recit);
  recit = agir(recit, 'deja-vaincu', { etageId: 'listes-2' });
  return agir(recit, 'resumer');
}
function avecStockage(fn) {
  const donnees = new Map();
  const avant = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => donnees.get(key) ?? null,
    setItem: (key, value) => donnees.set(key, value),
    removeItem: (key) => donnees.delete(key),
  } });
  try { fn(donnees); } finally {
    if (avant) Object.defineProperty(globalThis, 'localStorage', avant);
    else delete globalThis.localStorage;
  }
}

test('l’épisode relie cinq duels existants à dix scènes, sans modifier leurs règles', () => {
  assert.equal(RPG_STORY_SCENES.length, 10);
  assert.equal(new Set(RPG_STORY_SCENES.map((s) => s.id)).size, 10);
  assert.equal(new Set(RPG_STORY_SURVIVANTS).size, 12);
  for (const id of RPG_STORY_CAMPAIGN_FLOORS) {
    assert.ok(etageHistoireParId(id));
    assert.equal(sceneHistoire(`${id}-avant`).moment, 'avant');
    assert.equal(sceneHistoire(`${id}-apres`).moment, 'apres');
    assert.ok(personnageEtage(id));
  }
  for (const scene of RPG_STORY_SCENES) {
    assert.ok(RPG_STORY_DECORS[scene.decor]);
    assert.ok(RPG_STORY_CAST[scene.figure]);
    assert.ok(scene.resume.length > 20);
    assert.ok(scene.repliques.length > 0);
    assert.equal(scene.portrait, undefined, 'une scène ne peut redessiner un personnage');
    assert.equal(scene.deck, undefined, 'aucun changement de deck dissimulé dans une scène');
    for (const ligne of scene.repliques) {
      assert.ok(RPG_STORY_CAST[ligne.personnage]);
      assert.equal(ligne.portrait, undefined);
      for (const option of ['publique', 'confiee']) {
        assert.ok(texteReplique(ligne, { 'diffusion-liste': option }).length > 0);
      }
    }
  }
});

test('les personnages ont un portrait unique livré et commun aux scènes et aux duels', () => {
  for (const personnage of Object.values(RPG_STORY_CAST)) {
    assert.ok(Object.isFrozen(personnage));
    if (!personnage.portrait) continue;
    assert.ok(existsSync(fileURLToPath(new URL(`../public/${personnage.portrait}`, import.meta.url))), personnage.id);
    assert.equal(portraitHistoire(personnage.id, '/Let-s-Play/').split('?')[0], `/Let-s-Play/${personnage.portrait}`);
    if (personnage.carte) {
      assert.ok(cardById(personnage.carte));
      assert.equal(portraitHistoire(personnage.id, '/base/', (id) => `carte:${id}`), `carte:${personnage.carte}`);
    }
  }
  for (const decor of Object.values(RPG_STORY_DECORS)) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/${decor.fichier}`, import.meta.url))));
  }
  assert.equal(personnageEtage('listes-4'), 'feriel');
  assert.equal(personnageEtage('listes-5'), 'mahieddine');
  assert.equal(personnageEtage('inconnu'), null);
  assert.equal(personnageHistoire('__proto__').id, 'narrateur');
  assert.equal(portraitHistoire('absent'), null);
});

test('ouvrir une scène ne la marque pas lue ; sa position est persistante', () => {
  const initial = recitHistoireVide();
  const suite = agir(initial, 'continuer');
  assert.equal(initial.curseur.replique, 0);
  assert.equal(suite.curseur.replique, 1);
  assert.deepEqual(suite.scenesVues, []);
  assert.deepEqual(normaliserRecitHistoire(suite), suite);
});

test('double clic, bouton périmé et événement sans curseur sont sans effet', () => {
  const recit = recitHistoireVide();
  const evenement = { type: 'continuer', curseur: recit.curseur };
  const suite = transitionRecitHistoire(recit, evenement);
  assert.equal(transitionRecitHistoire(suite, evenement), suite);
  assert.equal(transitionRecitHistoire(recit, { type: 'continuer' }), recit);
  assert.equal(transitionRecitHistoire(null, evenement), null);
});

test('défaite et égalité n’avancent pas le récit ; une victoire attend le bon étage', () => {
  const duel = finirScene(recitHistoireVide());
  assert.equal(duel.curseur.type, 'duel');
  for (const type of ['defaite', 'egalite', 'continuer']) assert.equal(agir(duel, type), duel);
  assert.equal(agir(duel, 'victoire', { etageId: 'souk-1' }), duel);
  assert.equal(agir(duel, 'victoire', { etageId: 'listes-1' }, []), duel);
  assert.equal(agir(duel, 'deja-vaincu', { etageId: 'listes-1' }, []), duel);
  const suite = agir(duel, 'victoire', { etageId: 'listes-1' }, ['listes-1']);
  assert.equal(suite.curseur.id, 'listes-1-apres');
  assert.equal(transitionRecitHistoire(suite, { type: 'victoire', etageId: 'listes-1', curseur: duel.curseur }, ['listes-1']), suite);
});

test('résumer s’arrête au choix : aucune sélection automatique ou option inconnue', () => {
  const choix = jusquAuChoix();
  assert.equal(choix.curseur.id, 'listes-2-apres');
  assert.equal(agir(choix, 'continuer'), choix);
  assert.equal(agir(choix, 'resumer'), choix);
  assert.equal(agir(choix, 'choisir', { optionId: 'autre' }), choix);
  const debut = { ...choix, curseur: { ...choix.curseur, replique: 0, resume: false } };
  assert.equal(agir(debut, 'choisir', { optionId: 'publique' }), debut);
});

for (const optionId of ['publique', 'confiee']) {
  test(`trajet complet ${optionId} : chaque sortie est atteignable et survit à la normalisation`, () => {
    let recit = recitHistoireVide();
    let etat = { ...progressionHistoireVide(), recit };
    let etapes = 0;
    while (recit.curseur.type !== 'fin' && etapes++ < 80) {
      if (recit.curseur.type === 'duel') {
        etat = marquerEtageVaincu({ ...etat, recit }, recit.curseur.etageId);
        recit = agir(recit, 'victoire', { etageId: recit.curseur.etageId }, etat.etagesVaincus);
      } else {
        const scene = sceneHistoire(recit.curseur.id);
        const fin = recit.curseur.replique === scene.repliques.length - 1;
        recit = agir(recit, fin && scene.choix ? 'choisir' : 'continuer', { optionId }, etat.etagesVaincus);
      }
      etat = { ...etat, recit };
      assert.deepEqual(normaliserProgressionHistoire(etat), etat);
    }
    assert.ok(etapes < 80, 'pas de boucle ou d’impasse');
    assert.equal(recit.curseur.type, 'fin');
    assert.deepEqual(recit.scenesVues, RPG_STORY_SCENES.map((s) => s.id));
    assert.deepEqual(etat.etagesVaincus, [...RPG_STORY_CAMPAIGN_FLOORS]);
    assert.equal(recit.choix['diffusion-liste'], optionId);
    assert.equal(resumeRecitHistoire(recit).termine, true);
    assert.equal(agir(recit, 'continuer'), recit);
    const epilogue = sceneHistoire('listes-5-apres').repliques.map((ligne) => texteReplique(ligne, recit.choix)).join(' ');
    assert.match(epilogue, optionId === 'publique' ? /Tout le Souk les accompagne/ : /porte de service/);
  });
}

test('un choix ne peut être remplacé par un ancien événement', () => {
  const avant = jusquAuChoix();
  const apres = agir(avant, 'choisir', { optionId: 'publique' });
  assert.equal(apres.curseur.id, 'listes-3-avant');
  assert.equal(transitionRecitHistoire(apres, { type: 'choisir', curseur: avant.curseur, optionId: 'confiee' }, RPG_STORY_CAMPAIGN_FLOORS), apres);
});

test('les deux branches rejoignent le même étage et ouvrent les mêmes cartes', () => {
  const avant = jusquAuChoix();
  const branches = RPG_STORY_LIST_CHOICE.options.map((option) => agir(avant, 'choisir', { optionId: option.id }));
  assert.deepEqual(branches[0].curseur, branches[1].curseur);
  assert.deepEqual(branches[0].scenesVues, branches[1].scenesVues);
  assert.deepEqual(collectionJoueur({ progression: { etagesVaincus: ['listes-1', 'listes-2'], recit: branches[0] } }), collectionJoueur({ progression: { etagesVaincus: ['listes-1', 'listes-2'], recit: branches[1] } }));
});

test('une victoire libre préserve le récit et ses décisions sans le faire avancer', () => {
  const recit = agir(jusquAuChoix(), 'choisir', { optionId: 'confiee' });
  const etat = { version: 2, etagesVaincus: ['listes-1', 'listes-2'], recit };
  const maj = marquerEtageVaincu(etat, 'souk-1');
  assert.deepEqual(maj.recit, recit);
  assert.equal(marquerEtageVaincu(maj, 'souk-1'), maj);
});

test('normalisation : scène inconnue, positions invalides et faux progrès ne cassent pas le lecteur', () => {
  assert.equal(normaliserRecitHistoire(null), null);
  assert.equal(normaliserRecitHistoire({ campagneId: 'autre' }), null);
  const neuf = recitHistoireVide();
  assert.deepEqual(normaliserRecitHistoire({ ...neuf, curseur: { type: 'fin' }, scenesVues: ['listes-5-apres'] }), neuf);
  assert.equal(normaliserRecitHistoire({ ...neuf, curseur: { ...neuf.curseur, replique: 1000 } }).curseur.replique, sceneHistoire('listes-1-avant').repliques.length - 1);
  assert.equal(normaliserRecitHistoire({ ...neuf, curseur: { ...neuf.curseur, replique: -4 } }).curseur.replique, 0);
  assert.equal(normaliserRecitHistoire({ ...neuf, curseur: { ...neuf.curseur, replique: '2' } }).curseur.replique, 0);
  const faux = { ...neuf, curseur: { type: 'fin' }, scenesVues: RPG_STORY_SCENES.map((s) => s.id) };
  const bloque = normaliserRecitHistoire(faux, RPG_STORY_CAMPAIGN_FLOORS);
  assert.equal(bloque.scenesVues.length, 3, 'pas de passage de la Scribe sans décision');
  assert.deepEqual(bloque.choix, {});
});

test('migration v1 : toutes les victoires sont gardées, aucun choix ni lecture inventés', () => avecStockage((stockage) => {
  const ancien = JSON.stringify({ etagesVaincus: ['listes-1', 'souk-1', 'listes-1', 'obsolete'] });
  stockage.set(RPG_STORY_LEGACY_STORAGE_KEY, ancien);
  const migree = chargerProgressionHistoire();
  assert.deepEqual(migree, { version: 2, etagesVaincus: ['listes-1', 'souk-1'], recit: null });
  assert.equal(sauverProgressionHistoire(migree), true);
  assert.equal(stockage.get(RPG_STORY_LEGACY_STORAGE_KEY), ancien, 'copie v1 intacte');
  assert.deepEqual(chargerProgressionHistoire(), migree);
}));

test('une v2 vide valide prime sur v1 ; une v2 illisible utilise le secours v1', () => avecStockage((stockage) => {
  stockage.set(RPG_STORY_LEGACY_STORAGE_KEY, JSON.stringify({ etagesVaincus: ['listes-1'] }));
  sauverProgressionHistoire(progressionHistoireVide());
  assert.deepEqual(chargerProgressionHistoire(), progressionHistoireVide());
  for (const invalide of ['{corrompu', 'null', '{}', '[]', '"texte"']) {
    stockage.set(RPG_STORY_STORAGE_KEY, invalide);
    assert.deepEqual(chargerProgressionHistoire().etagesVaincus, ['listes-1']);
  }
}));

test('victoire et scène après-duel reprennent ensemble, puis décision et position', () => avecStockage(() => {
  let etat = { ...progressionHistoireVide(), recit: finirScene(recitHistoireVide()) };
  etat = marquerEtageVaincu(etat, 'listes-1');
  etat.recit = agir(etat.recit, 'victoire', { etageId: 'listes-1' }, etat.etagesVaincus);
  sauverProgressionHistoire(etat);
  const reprise = chargerProgressionHistoire();
  assert.deepEqual(reprise, etat);
  assert.equal(reprise.recit.curseur.id, 'listes-1-apres');
  etat = { ...etat, etagesVaincus: ['listes-1', 'listes-2'], recit: agir(jusquAuChoix(), 'choisir', { optionId: 'publique' }) };
  etat.recit = agir(etat.recit, 'continuer');
  sauverProgressionHistoire(etat);
  assert.deepEqual(chargerProgressionHistoire(), etat);
}));

test('recommencer le récit préserve victoires et collection ; l’effacement complet enlève les deux clés', () => avecStockage((stockage) => {
  const ancien = { version: 2, etagesVaincus: ['listes-1', 'listes-2'], recit: jusquAuChoix() };
  const neuf = { ...ancien, recit: recitHistoireVide() };
  assert.deepEqual(collectionJoueur({ progression: ancien }), collectionJoueur({ progression: neuf }));
  stockage.set(RPG_STORY_LEGACY_STORAGE_KEY, JSON.stringify(ancien));
  sauverProgressionHistoire(neuf);
  reinitialiserProgressionHistoire();
  assert.equal(stockage.has(RPG_STORY_STORAGE_KEY), false);
  assert.equal(stockage.has(RPG_STORY_LEGACY_STORAGE_KEY), false);
  assert.deepEqual(chargerProgressionHistoire(), progressionHistoireVide());
}));

test('le résumé ne prétend pas que les autres tours sont scénarisées', () => {
  assert.equal(resumeRecitHistoire(null).total, 10);
  assert.equal(resumeRecitHistoire(null).commence, false);
});
