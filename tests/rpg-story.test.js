import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  RPG_ART_PROVISOIRE,
  cardArtId,
  cardById,
  cardColors,
  rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { RPG_NIVEAUX_IA, RPG_STYLES_IA } from '../src/games/rpgAI.js';
import {
  chargerProgressionHistoire,
  etageEstDebloque,
  etageEstVaincu,
  marquerEtageVaincu,
  normaliserProgressionHistoire,
  progressionHistoireVide,
  reinitialiserProgressionHistoire,
  resumeTourHistoire,
  RPG_STORY_STORAGE_KEY,
  sauverProgressionHistoire,
} from '../src/games/rpgStory.js';
import {
  deckHistoire,
  etageHistoireParId,
  etagePrecedent,
  prochainEtage,
  RPG_STORY_DECKS,
  RPG_STORY_TOURS,
  tourHistoireParId,
  tousLesEtages,
} from '../src/games/rpgStoryTours.js';

// ── Données des tours ───────────────────────────────────────────────────────

test('chaque deck de campagne est un deck valide de 40 cartes', () => {
  for (const [deckId, cartes] of Object.entries(RPG_STORY_DECKS)) {
    const validation = rpgValiderDeck(cartes);
    assert.equal(validation.ok, true, `deck ${deckId} : ${validation.raison}`);
    assert.equal(deckHistoire(deckId), cartes);
  }
  assert.equal(deckHistoire('deck-inconnu'), null);
});

test('les decks de campagne ne contiennent plus de terrain ni de variante', () => {
  for (const [deckId, cartes] of Object.entries(RPG_STORY_DECKS)) {
    assert.equal(cartes.length, 30, deckId);
    assert.ok(cartes.every((id) => cardById(id)?.kind !== 'terrain'), deckId);
  }
});

test('les cartes retirées du jeu ne subsistent dans aucun deck de campagne', () => {
  // Rafale du minaret, Sentence de la Liste et Fureur du souk ont quitté le
  // catalogue : la campagne, qui compose ses propres listes, ne doit plus les
  // jouer.
  for (const [deckId, cartes] of Object.entries(RPG_STORY_DECKS)) {
    for (const idRetire of ['rafale-du-minaret', 'sentence-de-la-liste', 'fureur-du-souk']) {
      assert.equal(cartes.includes(idRetire), false, `${idRetire} a quitté le deck ${deckId}`);
    }
  }
});

test('les étages ont identifiants uniques, profils IA et puissances lisibles', () => {
  const vus = new Set();
  for (const { tour, etage } of tousLesEtages()) {
    assert.ok(!vus.has(etage.id), `identifiant dupliqué : ${etage.id}`);
    vus.add(etage.id);
    assert.equal(typeof etage.nom, 'string');
    assert.ok(etage.nom.length > 0, `${etage.id} : nom vide`);
    assert.ok(RPG_STORY_DECKS[etage.deck], `${etage.id} : deck inconnu ${etage.deck}`);
    assert.ok(Number.isInteger(etage.puissance) && etage.puissance >= 0, `${etage.id} : puissance invalide`);
    assert.ok(RPG_NIVEAUX_IA.includes(etage.ia.niveau), `${etage.id} : niveau IA inconnu`);
    assert.ok(RPG_STYLES_IA.includes(etage.ia.style), `${etage.id} : style IA inconnu`);
    assert.equal(etageHistoireParId(etage.id).tour.id, tour.id);
  }
  assert.ok(vus.size >= 9, 'la campagne compte au moins neuf étages');
});

test('la Tour du Fjord fait monter la Neige : quatre étages mono-Neige, boss compris', () => {
  const tour = tourHistoireParId('tour-du-fjord');
  assert.ok(tour, 'la Tour du Fjord fait partie de la campagne');
  assert.match(tour.resume, /glace|hiver|fjord/i, 'son résumé annonce le froid');
  assert.ok(tour.etages.length >= 3, 'la tour a ses étages');

  for (const etage of tour.etages) {
    const deck = deckHistoire(etage.deck);
    const validation = rpgValiderDeck(deck);
    assert.equal(validation.ok, true, `${etage.id} : ${validation.raison}`);
    assert.equal(validation.terrains, deck.filter((id) => cardById(id)?.kind === 'terrain').length,
      `${etage.id} pose ses terrains Neige, variantes comprises`);
    for (const id of new Set(deck)) {
      assert.deepEqual(cardColors(cardById(id)), ['neige'],
        `${etage.id} reste mono-Neige (${id} fait exception)`);
    }
  }

  // La difficulté monte d'étage en étage, et le sommet est le boss.
  const puissances = tour.etages.map((etage) => etage.puissance);
  assert.deepEqual(puissances, [...puissances].sort((a, b) => a - b), 'les étages montent en puissance');
  assert.equal(tour.etages.at(-1).ia.niveau, 'veilleur', 'le sommet se joue contre un Veilleur');

  // Le boss réunit les figures du Nord — sans jamais les appeler dieux.
  const boss = deckHistoire(tour.etages.at(-1).deck);
  assert.ok(boss.includes('pere-des-corbeaux') && boss.includes('maitre-du-marteau'),
    'le Maître des Neuf Hivers a ses deux figures');
  for (const id of new Set(boss)) {
    const carte = cardById(id);
    assert.doesNotMatch(`${carte.name} ${carte.text ?? ''} ${carte.flavor ?? ''}`, /\bdieu(x)?\b/i,
      `${id} ne nomme pas de divinité`);
  }

  // Chaque sorcier de la campagne qui porte un portrait le voit livré avec le jeu.
  for (const { etage } of tousLesEtages()) {
    if (!etage.avatar) continue;
    const carte = cardById(etage.avatar);
    assert.ok(carte, `${etage.id} : l’avatar ${etage.avatar} est une carte du catalogue`);
    assert.ok(!RPG_ART_PROVISOIRE.includes(etage.avatar),
      `${etage.id} : le portrait ${etage.avatar} est une peinture définitive`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/cards/${cardArtId(carte)}.jpg`, import.meta.url))),
      `${etage.id} : le portrait ${etage.avatar} est livré dans public/cards/`);
  }
});

test('chaque tour garde une peinture de repli livrée pour les appareils sans WebGL', () => {
  const vus = new Set();
  for (const tour of RPG_STORY_TOURS) {
    assert.ok(tour.miniature, `${tour.id} : miniature absente`);
    assert.ok(!vus.has(tour.miniature), `miniature dupliquée : ${tour.miniature}`);
    vus.add(tour.miniature);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/sablier-tours/${tour.miniature}`, import.meta.url))),
      `${tour.id} : la miniature ${tour.miniature} est livrée dans public/sablier-tours/`);
  }
  assert.equal(vus.size, RPG_STORY_TOURS.length, 'chaque tour a la sienne');
});

test('les tours s’enchaînent étage par étage', () => {
  for (const tour of RPG_STORY_TOURS) {
    assert.ok(tour.etages.length >= 3, `tour ${tour.id} : au moins trois étages`);
    tour.etages.forEach((etage, index) => {
      const precedent = etagePrecedent(etage.id);
      if (index === 0) assert.equal(precedent, null, `${etage.id} est le premier étage`);
      else assert.equal(precedent.id, tour.etages[index - 1].id);
      const suivant = prochainEtage(etage.id);
      if (index === tour.etages.length - 1) assert.equal(suivant, null, `${etage.id} est le sommet`);
      else assert.equal(suivant.id, tour.etages[index + 1].id);
    });
    assert.equal(tourHistoireParId(tour.id).id, tour.id);
  }
  assert.equal(etageHistoireParId('inconnu'), null);
  assert.equal(prochainEtage('inconnu'), null);
});

// ── Progression ─────────────────────────────────────────────────────────────

test('la progression normalise les étages inconnus et les doublons', () => {
  const normalisee = normaliserProgressionHistoire({ etagesVaincus: ['listes-1', 'inconnu', 'listes-1', 42, 'listes-2'] });
  assert.deepEqual(normalisee, { ...progressionHistoireVide(), etagesVaincus: ['listes-1', 'listes-2'] });
  assert.deepEqual(normaliserProgressionHistoire(null), progressionHistoireVide());
  assert.deepEqual(normaliserProgressionHistoire('n’importe quoi'), progressionHistoireVide());
});

test('un étage se débloque après l’étage précédent de sa tour', () => {
  const vide = progressionHistoireVide();
  assert.equal(etageEstDebloque(vide, 'listes-1'), true, 'le premier étage est toujours ouvert');
  assert.equal(etageEstDebloque(vide, 'listes-2'), false);
  assert.equal(etageEstDebloque(vide, 'souk-1'), true, 'chaque tour démarre libre');

  const uneVictoire = marquerEtageVaincu(vide, 'listes-1');
  assert.equal(etageEstDebloque(uneVictoire, 'listes-2'), true);
  assert.equal(etageEstDebloque(uneVictoire, 'listes-3'), false, 'pas de saut d’étage');
  assert.equal(etageEstDebloque(uneVictoire, 'souk-2'), false, 'les tours sont indépendantes');
  assert.equal(etageEstDebloque(uneVictoire, 'inconnu'), false);
});

test('marquer un étage vaincu est immuable et idempotent', () => {
  const vide = progressionHistoireVide();
  const premiere = marquerEtageVaincu(vide, 'listes-1');
  const seconde = marquerEtageVaincu(premiere, 'listes-1');
  assert.deepEqual(vide, progressionHistoireVide(), 'la progression d’origine n’est pas mutée');
  assert.deepEqual(premiere.etagesVaincus, ['listes-1']);
  assert.equal(seconde, premiere, 'rejouer un étage déjà déblayé ne change rien');
  assert.deepEqual(marquerEtageVaincu(premiere, 'inconnu'), premiere);
});

test('le résumé de tour compte les déblayés et propose le prochain étage', () => {
  let progression = progressionHistoireVide();
  assert.deepEqual(resumeTourHistoire('tour-des-listes', progression),
    { total: 5, vaincus: 0, prochainId: 'listes-1' });
  progression = marquerEtageVaincu(progression, 'listes-1');
  progression = marquerEtageVaincu(progression, 'listes-2');
  assert.deepEqual(resumeTourHistoire('tour-des-listes', progression),
    { total: 5, vaincus: 2, prochainId: 'listes-3' });
  for (const id of ['listes-3', 'listes-4', 'listes-5']) progression = marquerEtageVaincu(progression, id);
  assert.deepEqual(resumeTourHistoire('tour-des-listes', progression),
    { total: 5, vaincus: 5, prochainId: null });
  assert.deepEqual(resumeTourHistoire('tour-inconnu', progression),
    { total: 0, vaincus: 0, prochainId: null });
});

test('la progression survit à un aller-retour de sauvegarde', () => {
  const donnees = new Map();
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (cle) => donnees.get(cle) ?? null,
      setItem: (cle, valeur) => donnees.set(cle, valeur),
      removeItem: (cle) => donnees.delete(cle),
    },
  });
  try {
    let progression = marquerEtageVaincu(progressionHistoireVide(), 'listes-1');
    progression = marquerEtageVaincu(progression, 'listes-2');
    assert.equal(sauverProgressionHistoire(progression), true);
    assert.deepEqual(chargerProgressionHistoire(), progression, 'la sauvegarde est relue fidèlement');

    donnees.set(RPG_STORY_STORAGE_KEY, '{corrompu');
    assert.deepEqual(chargerProgressionHistoire(), progressionHistoireVide(),
      'une sauvegarde illisible retombe sur une progression vide');

    assert.deepEqual(reinitialiserProgressionHistoire(), progressionHistoireVide());
    assert.equal(donnees.has(RPG_STORY_STORAGE_KEY), false);
    assert.deepEqual(chargerProgressionHistoire(), progressionHistoireVide());
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
});

test('la progression se lit aussi sans aucun stockage disponible', () => {
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('mode privé'); },
  });
  try {
    assert.deepEqual(chargerProgressionHistoire(), progressionHistoireVide());
    assert.equal(sauverProgressionHistoire(progressionHistoireVide()), false);
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
});
