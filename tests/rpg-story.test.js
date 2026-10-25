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
import { RPG_STORY_CAMPAIGN_MINIATURE } from '../src/games/rpgStoryScenes.js';
import { RPG_RECETTES_HISTOIRE } from '../src/games/rpgDeckRecipes.js';

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

test('la Tour du Soleil rouge fait monter les Samouraïs : quatre étages mono-Braise, boss compris', () => {
  const tour = tourHistoireParId('tour-du-soleil-rouge');
  assert.ok(tour, 'la Tour du Soleil rouge fait partie de la campagne');
  assert.match(tour.resume, /soleil|samouraï|ardent|écarlate/i);
  assert.ok(tour.etages.length >= 4);

  for (const etage of tour.etages) {
    const deck = deckHistoire(etage.deck);
    const validation = rpgValiderDeck(deck);
    assert.equal(validation.ok, true, `${etage.id} : ${validation.raison}`);
    for (const id of new Set(deck)) {
      assert.deepEqual(cardColors(cardById(id)), ['braise'],
        `${etage.id} reste mono-Braise (${id} fait exception)`);
    }
  }

  const puissances = tour.etages.map((etage) => etage.puissance);
  assert.deepEqual(puissances, [...puissances].sort((a, b) => a - b));
  assert.equal(tour.etages.at(-1).ia.niveau, 'veilleur');

  const boss = deckHistoire(tour.etages.at(-1).deck);
  assert.ok(boss.includes('daimyo-du-soleil-rouge') && boss.includes('kagutsuchi-flamme-originelle'));
});

test('la Tour de la Nécropole fait peser les Ténèbres : quatre étages mono-Ténèbres, boss compris', () => {
  const tour = tourHistoireParId('tour-de-la-necropole');
  assert.ok(tour, 'la Tour de la Nécropole fait partie de la campagne');
  assert.match(tour.resume, /nécropole|ténèbres|prix|tribut|lin/i);
  assert.ok(tour.etages.length >= 4);

  for (const etage of tour.etages) {
    const deck = deckHistoire(etage.deck);
    const validation = rpgValiderDeck(deck);
    assert.equal(validation.ok, true, `${etage.id} : ${validation.raison}`);
    for (const id of new Set(deck)) {
      assert.deepEqual(cardColors(cardById(id)), ['tenebres'],
        `${etage.id} reste mono-Ténèbres (${id} fait exception)`);
    }
  }

  const puissances = tour.etages.map((etage) => etage.puissance);
  assert.deepEqual(puissances, [...puissances].sort((a, b) => a - b));
  assert.equal(tour.etages.at(-1).ia.niveau, 'veilleur');

  const boss = deckHistoire(tour.etages.at(-1).deck);
  assert.ok(boss.includes('la-devoreuse') && boss.includes('celui-qui-juge'));
});

test('la Tour du Sablier renversé aligne sept étages de types différents, au-dessus de toutes les tours', () => {
  const tour = tourHistoireParId('tour-du-sablier-renverse');
  assert.ok(tour, 'la Tour du Sablier renversé fait partie des tours de Bab El');
  // Depuis la Tour Oubliée (dossier 23), le Sablier n'est plus la dernière
  // carte de la galerie : c'est l'avant-dernière, et la tour secrète se dresse
  // après lui, comme l'épreuve d'après le sommet.
  assert.equal(RPG_STORY_TOURS.at(-2).id, tour.id, 'elle se dresse après les neuf tours du récit');
  assert.equal(RPG_STORY_TOURS.at(-1).id, 'tour-oubliee', 'la Tour Oubliée la suit');
  assert.equal(tour.etages.length, 7, 'sept étages');
  assert.match(tour.resume, /Sablier|sept|maîtres/i, 'son résumé annonce le retour des maîtres');

  // La difficulté dépasse l'échelle historique (0 à 7) dès le premier
  // palier, monte à chaque étage et culmine au Sablier lui-même.
  const puissances = tour.etages.map((etage) => etage.puissance);
  assert.deepEqual(puissances, [8, 9, 10, 11, 12, 13, 14]);
  const maxAutres = Math.max(...tousLesEtages()
    .filter(({ tour: autre }) => autre.id !== tour.id && autre.id !== 'tour-oubliee')
    .map(({ etage }) => etage.puissance));
  assert.ok(puissances[0] > maxAutres, `son premier étage (${puissances[0]}) dépasse le boss le plus fort des autres tours (${maxAutres})`);

  // Tous les gardiens jouent au niveau Sablier — le plus fort du jeu —
  // et les quatre styles tactiques passent sur la montée.
  for (const etage of tour.etages) {
    assert.equal(etage.ia.niveau, 'sablier', `${etage.id} se joue contre un maître absolu`);
  }
  assert.deepEqual(new Set(tour.etages.map((etage) => etage.ia.style)), new Set(RPG_STYLES_IA),
    'les quatre manières de jouer sont représentées');

  // Chaque étage a son paquet et son identité : les cinq couleurs pures,
  // la Course Sable + Eau, puis le tricolore du sommet.
  const identites = tour.etages.map((etage) => {
    const deck = deckHistoire(etage.deck);
    const validation = rpgValiderDeck(deck);
    assert.equal(validation.ok, true, `${etage.id} : ${validation.raison}`);
    return [...new Set(deck.flatMap((id) => cardColors(cardById(id))))].sort().join('+');
  });
  assert.equal(new Set(tour.etages.map((etage) => etage.deck)).size, 7, 'aucun paquet ne se répète');
  assert.equal(new Set(identites).size, 7, 'aucune identité chromatique ne se répète');
  assert.deepEqual(new Set(identites.slice(0, 5)), new Set(['sable', 'braise', 'eau', 'neige', 'tenebres']),
    'les cinq couleurs pures ouvrent la tour');
  assert.equal(identites[5], 'eau+sable', 'le sixième étage est la Course');
  assert.equal(identites[6].split('+').length, 3, 'le sommet joue trois couleurs');
  const manieres = tour.etages.map((etage, i) => `${identites[i]}/${etage.ia.style}`);
  assert.equal(new Set(manieres).size, 7, 'chaque étage est un type de duel différent');

  // « L'IA a les meilleures cartes » : les recettes absolues n'ont aucun
  // plafond de rareté, et le résultat se lit dans les listes — chaque
  // paquet absolu aligne au moins autant de mythiques que le paquet de
  // campagne le plus fourni d'avant, et le Sablier les écrase tous.
  const mythiques = (deckId) => deckHistoire(deckId)
    .filter((id) => cardById(id).rarity === 'mythique').length;
  const absolus = new Set(tour.etages.map((etage) => etage.deck));
  const maxAvant = Math.max(...Object.keys(RPG_STORY_DECKS)
    .filter((deckId) => !absolus.has(deckId)).map(mythiques));
  for (const etage of tour.etages) {
    const recette = RPG_RECETTES_HISTOIRE[etage.deck];
    assert.ok(recette, `${etage.deck} a sa recette`);
    assert.equal(recette.mythiquesMax, undefined, `${etage.deck} : aucun plafond de mythiques`);
    assert.equal(recette.raresMax, undefined, `${etage.deck} : aucun plafond de rares`);
    assert.ok(mythiques(etage.deck) >= maxAvant,
      `${etage.deck} aligne ${mythiques(etage.deck)} mythiques, au moins le maximum d'avant (${maxAvant})`);
  }
  assert.ok(mythiques('le-sablier') >= 20, 'le Sablier verse plus de vingt mythiques dans trente cartes');
  assert.ok(deckHistoire('flamme-absolue').includes('kagutsuchi-flamme-originelle')
    && deckHistoire('flamme-absolue').includes('orochi'), 'la Braise absolue a ses deux plus grandes figures');
  assert.ok(deckHistoire('hiver-absolu').includes('pere-des-corbeaux')
    && deckHistoire('hiver-absolu').includes('serpent-du-monde'), 'la Neige absolue réunit les figures du Nord');

  // Les six premiers gardiens portent le portrait de leur figure, qui
  // joue dans leur paquet ; le Sablier, lui, n'a pas de visage.
  for (const etage of tour.etages.slice(0, 6)) {
    assert.ok(etage.avatar, `${etage.id} a son portrait`);
    assert.equal(cardById(etage.avatar).rarity, 'mythique', `${etage.id} : un maître, une figure mythique`);
    assert.ok(deckHistoire(etage.deck).includes(etage.avatar), `${etage.id} : sa figure joue dans son paquet`);
  }
  assert.equal(tour.etages.at(-1).avatar, null, 'le Sablier n’a pas de visage');
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

test('le mode histoire dispose de sa propre miniature dédiée livrée dans public/sablier-story/', () => {
  assert.ok(RPG_STORY_CAMPAIGN_MINIATURE, 'miniature déclarée pour le mode histoire');
  assert.ok(
    existsSync(fileURLToPath(new URL(`../public/${RPG_STORY_CAMPAIGN_MINIATURE}`, import.meta.url))),
    `${RPG_STORY_CAMPAIGN_MINIATURE} est livrée dans public/`,
  );
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
