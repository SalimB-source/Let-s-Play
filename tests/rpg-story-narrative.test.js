import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cardById } from '../src/games/rpgCards.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { RPG_STORY_CAST, RPG_STORY_DECORS, SITUATIONS_POSE_HISTOIRE, personnageEtage, personnageHistoire, portraitHistoire, poseHistoire, situationsPoseHistoire, standHistoire } from '../src/games/rpgStoryCast.js';
import { RPG_STORY_ACTES, RPG_STORY_ALL_SCENES, RPG_STORY_CAMPAIGN_FLOORS, RPG_STORY_CHOICES, RPG_STORY_REGISTRES, RPG_STORY_SCENES, RPG_STORY_SURVIVANTS, RPG_STORY_LIST_CHOICE, registresDebloques, sceneHistoire, statutSurvivantsHistoire, texteEpilogueActe, texteRegistre, texteReplique } from '../src/games/rpgStoryScenes.js';
import { acteCourantRecit, etapesRecitHistoire, recitHistoireVide, resumeActesHistoire, normaliserRecitHistoire, transitionRecitHistoire, resumeRecitHistoire } from '../src/games/rpgStoryFlow.js';
import { RPG_STORY_STORAGE_KEY, RPG_STORY_LEGACY_STORAGE_KEY, progressionHistoireVide, normaliserProgressionHistoire, marquerEtageVaincu, chargerProgressionHistoire, sauverProgressionHistoire, reinitialiserProgressionHistoire } from '../src/games/rpgStory.js';
import { RPG_STORY_TOURS, etageHistoireParId } from '../src/games/rpgStoryTours.js';

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

test('tout personnage qui parle a son sprite détouré, livré et daté', () => {
  // Le plateau du récit ne montre plus de portrait encadré : chaque figure du
  // casting — héros, antagonistes des cinq tours, figurants du Souk — a son
  // sprite à fond transparent, dérivé de sa peinture canonique.
  const sansSprite = [];
  for (const personnage of Object.values(RPG_STORY_CAST)) {
    if (!personnage.portrait) continue;
    const stand = standHistoire(personnage.id, '/Let-s-Play/');
    if (!stand) {
      sansSprite.push(personnage.id);
      continue;
    }
    assert.equal(stand.split('?')[0], `/Let-s-Play/${personnage.stand}`,
      `${personnage.id} : le sprite suit la racine de l’application`);
    assert.match(stand, /\?v=/, `${personnage.id} : le sprite est daté (aucun cache ne peut resservir un ancien détourage)`);
    assert.ok(existsSync(fileURLToPath(new URL(`../public/${personnage.stand}`, import.meta.url))),
      `${personnage.id} : le sprite est livré dans public/${personnage.stand}`);
  }
  assert.deepEqual(sansSprite, [], 'aucun personnage joué ne retombe sur le portrait encadré');
  assert.equal(standHistoire('narrateur', '/'), null, 'la ville parle sans sprite : le décor porte la scène');
  assert.equal(standHistoire('absent', '/'), null);
  assert.equal(standHistoire('__proto__', '/'), null, 'un identifiant inconnu ne peut pas atteindre le prototype');
});

test('les sprites du casting portent bien un fond transparent', () => {
  // Un sprite opaque trahirait un détourage raté (fond magenta resté collé).
  for (const personnage of Object.values(RPG_STORY_CAST)) {
    if (!personnage.stand) continue;
    const chemin = fileURLToPath(new URL(`../public/${personnage.stand}`, import.meta.url));
    const octets = readFileSync(chemin);
    assert.equal(octets.subarray(0, 4).toString('ascii'), 'RIFF', `${personnage.id} : conteneur WebP`);
    assert.equal(octets.subarray(8, 12).toString('ascii'), 'WEBP', `${personnage.id} : conteneur WebP`);
    assert.ok(octets.includes(Buffer.from('ALPH')), `${personnage.id} : le sprite déclare un canal alpha`);
  }
});

test('les poses alternatives suivent la situation et livrent leur propre sprite', () => {
  // Trois situations, toutes définies au même endroit que le casting.
  assert.deepEqual(Object.keys(SITUATIONS_POSE_HISTOIRE), ['duel', 'choix', 'apres']);
  for (const situation of Object.values(SITUATIONS_POSE_HISTOIRE)) {
    assert.ok(Object.isFrozen(situation));
    assert.equal(Object.hasOwn(SITUATIONS_POSE_HISTOIRE, situation.id), true);
    assert.ok(situation.nom.length > 2 && situation.description.length > 8);
    assert.match(situation.suffixe, /^[a-z]+$/, 'le suffixe nomme le fichier de la variante');
  }

  for (const personnage of Object.values(RPG_STORY_CAST)) {
    for (const [situation, fichier] of Object.entries(personnage.poses ?? {})) {
      assert.ok(Object.hasOwn(SITUATIONS_POSE_HISTOIRE, situation),
        `${personnage.id} : « ${situation} » n’est pas une situation connue`);
      assert.ok(personnage.stand, `${personnage.id} : une variante sans sprite de référence n’a aucun sens`);
      // Le nom du fichier dit la situation : stand-<id>-<suffixe>.webp.
      assert.equal(fichier,
        `sablier-story/stands/stand-${personnage.id}-${SITUATIONS_POSE_HISTOIRE[situation].suffixe}.webp`,
        `${personnage.id} : la variante « ${situation} » doit porter le suffixe de sa situation`);
      assert.notEqual(fichier, personnage.stand, `${personnage.id} : la variante ${situation} doit différer de la référence`);
      const octets = readFileSync(fileURLToPath(new URL(`../public/${fichier}`, import.meta.url)));
      assert.equal(octets.subarray(0, 4).toString('ascii'), 'RIFF', `${personnage.id} (${situation}) : conteneur WebP`);
      assert.ok(octets.includes(Buffer.from('ALPH')), `${personnage.id} (${situation}) : fond transparent attendu`);
      assert.equal(poseHistoire(personnage.id, situation, '/base/').split('?')[0], `/base/${fichier}`);
      assert.ok(situationsPoseHistoire(personnage.id).includes(situation));
    }
  }

  // Les vingt-quatre figures du casting ont leurs deux postures : les cinq
  // héros, les figures de la Chambre et tous les antagonistes des actes I à V.
  const FIGURES_POSE = ['salem', 'yamina', 'feriel', 'tarek', 'boualem', 'mahieddine',
    'scribe', 'guetteur', 'puisatier', 'marchand', 'amani', 'djinn-souk', 'reine-etals',
    'pecheur', 'nageuse', 'sonneur', 'devoreur', 'garde-fjord', 'meute-neiges',
    'valkyrie-fjord', 'maitre-hivers', 'dernier-fennec', 'ifrit-ergs', 'horloger-zenith'];
  // Celles qui posent une décision au lecteur ont en plus leur posture de
  // décision — les deux figures de chaque scène de décision, sauf l'Horloger
  // du Zénith, dont la décision retombe sur sa référence.
  const FIGURES_DECISION = ['salem', 'yamina', 'scribe', 'djinn-souk', 'boualem',
    'mahieddine', 'valkyrie-fjord'];
  const avecVariante = Object.values(RPG_STORY_CAST).filter((p) => p.poses);
  assert.equal(avecVariante.length, FIGURES_POSE.length,
    'toute figure détourée porte ses variantes — le narrateur excepté');
  for (const id of FIGURES_POSE) {
    assert.deepEqual(situationsPoseHistoire(id),
      FIGURES_DECISION.includes(id) ? ['duel', 'choix', 'apres'] : ['duel', 'apres'], id);
    assert.equal(poseHistoire(id, 'duel', '/base/').split('?')[0],
      `/base/sablier-story/stands/stand-${id}-affrontement.webp`, id);
    assert.equal(poseHistoire(id, 'apres', '/base/').split('?')[0],
      `/base/sablier-story/stands/stand-${id}-apaisement.webp`, id);
    assert.match(poseHistoire(id, 'duel', '/base/'), /\?v=[\w-]+$/, `${id} : la variante est datée comme la référence`);
    if (FIGURES_DECISION.includes(id)) {
      assert.equal(poseHistoire(id, 'choix', '/base/').split('?')[0],
        `/base/sablier-story/stands/stand-${id}-decision.webp`, id);
    }
  }

  // Une situation non déclarée pour une figure donnée retombe sur sa référence :
  // à la dernière décision du récit, l'Horloger du Zénith n'en a pas.
  assert.equal(poseHistoire('horloger-zenith', 'choix', '/base/'), standHistoire('horloger-zenith', '/base/'),
    'une situation non déclarée retombe sur la référence de la figure');
  assert.equal(poseHistoire('guetteur', 'choix', '/base/'), standHistoire('guetteur', '/base/'));

  // Une situation inconnue ou absente retombe sur la référence.
  assert.equal(poseHistoire('salem', 'inconnue', '/base/'), standHistoire('salem', '/base/'));
  assert.equal(poseHistoire('salem', null, '/base/'), standHistoire('salem', '/base/'));
  assert.deepEqual(situationsPoseHistoire('narrateur'), []);
  assert.equal(poseHistoire('narrateur', 'duel', '/base/'), null, 'la ville n’a pas de corps');
  assert.equal(poseHistoire('absent', 'duel', '/base/'), null);
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
  // La collection ne dépend plus de la progression : ni du récit, ni des étages
  // (les cartes s’acquièrent au Souk et dans les acquis figés — dossier 13).
  assert.deepEqual(collectionJoueur(), collectionJoueur({ distante: null }));
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
  assert.deepEqual(collectionJoueur(), collectionJoueur(), 'la collection ignore le récit');
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

test('les cinq paliers et pièces du dossier suivent l’avancement réel sans rien dévoiler d’avance', () => {
  assert.equal(RPG_STORY_REGISTRES.length, 9);
  assert.deepEqual(registresDebloques(null), []);
  assert.equal(statutSurvivantsHistoire(null).etape, 'Au seuil de la Tour des Listes');
  const etapesInitiales = etapesRecitHistoire(null, []);
  assert.equal(etapesInitiales.length, 5);
  assert.ok(etapesInitiales.every((e) => e.statut === 'a-venir'));

  const debut = recitHistoireVide();
  assert.equal(etapesRecitHistoire(debut)[0].statut, 'en-cours');

  const apresDeuxieme = agir(jusquAuChoix(), 'choisir', { optionId: 'publique' });
  const etapesMilieu = etapesRecitHistoire(apresDeuxieme, ['listes-1', 'listes-2']);
  assert.equal(etapesMilieu[0].statut, 'termine');
  assert.equal(etapesMilieu[1].statut, 'termine');
  assert.equal(etapesMilieu[2].statut, 'en-cours');
  assert.equal(etapesMilieu[3].statut, 'a-venir');

  const pieces = registresDebloques(apresDeuxieme);
  assert.deepEqual(pieces.map((r) => r.id), ['registre-ecrou-4sud', 'registre-bordereau-article9']);
  assert.match(texteRegistre(pieces[1], apresDeuxieme.choix), /piliers du Souk/);
  assert.match(texteRegistre(pieces[1], { 'diffusion-liste': 'confiee' }), /pli scellé à Tarek/);
  assert.equal(statutSurvivantsHistoire(apresDeuxieme).etape, 'Sous la voûte du premier palier');
});

test('les cinq actes couvrent les vingt duels des cinq tours, neuf registres et les trois fins du Portail', () => {
  const tousLesEtages = RPG_STORY_TOURS.flatMap((tour) => tour.etages.map((etage) => etage.id));
  assert.equal(RPG_STORY_ACTES.length, 5);
  assert.equal(RPG_STORY_ALL_SCENES.length, 40);
  assert.equal(Object.keys(RPG_STORY_CHOICES).length, 5);
  assert.equal(RPG_STORY_ACTES.flatMap((acte) => acte.etages).length, 20);
  assert.deepEqual(
    new Set(RPG_STORY_ACTES.flatMap((acte) => acte.etages)),
    new Set(tousLesEtages),
  );

  function parcourirCampagneComplete(choixParQuestion) {
    let recit = recitHistoireVide();
    for (let idxActe = 0; idxActe < RPG_STORY_ACTES.length; idxActe += 1) {
      const acte = RPG_STORY_ACTES[idxActe];
      assert.equal(acteCourantRecit(recit), acte.id);
      while (recit.curseur.type !== 'fin') {
        if (recit.curseur.type === 'duel') {
          recit = transitionRecitHistoire(recit, { type: 'victoire', curseur: recit.curseur, etageId: recit.curseur.etageId }, tousLesEtages);
        } else {
          const scene = sceneHistoire(recit.curseur.id);
          recit = transitionRecitHistoire(recit, { type: 'resumer', curseur: recit.curseur }, tousLesEtages);
          if (scene.choix) {
            recit = transitionRecitHistoire(recit, {
              type: 'choisir',
              curseur: recit.curseur,
              optionId: choixParQuestion[scene.choix],
            }, tousLesEtages);
          } else {
            recit = transitionRecitHistoire(recit, { type: 'continuer', curseur: recit.curseur }, tousLesEtages);
          }
        }
        assert.deepEqual(normaliserRecitHistoire(recit, tousLesEtages), recit);
      }
      assert.equal(acteCourantRecit(recit), acte.id);
      assert.deepEqual(normaliserRecitHistoire(recit, tousLesEtages), recit);
      const resume = resumeRecitHistoire(recit);
      assert.equal(resume.termine, true);
      if (idxActe < RPG_STORY_ACTES.length - 1) {
        const suivant = RPG_STORY_ACTES[idxActe + 1];
        assert.equal(resume.campagneTerminee, false);
        assert.equal(resume.acteSuivant?.id, suivant.id);
        recit = transitionRecitHistoire(recit, { type: 'ouvrir-acte', curseur: recit.curseur, acteId: suivant.id }, tousLesEtages);
        assert.equal(recit.curseur.type, 'scene');
        assert.equal(acteCourantRecit(recit), suivant.id);
        assert.deepEqual(normaliserRecitHistoire(recit, tousLesEtages), recit);
      } else {
        assert.equal(resume.campagneTerminee, true);
        assert.equal(resume.acteSuivant, null);
      }
    }
    return recit;
  }

  for (const finPortail of ['ouvrir', 'tenir', 'prendre-la-place']) {
    const recitFin = parcourirCampagneComplete({
      'diffusion-liste': finPortail === 'ouvrir' ? 'publique' : 'confiee',
      'dette-souk': finPortail === 'ouvrir' ? 'denoncer' : 'racheter',
      'aveu-boualem': finPortail === 'tenir' ? 'pardonner' : 'exiger-temoignage',
      'serment-archives': finPortail === 'prendre-la-place' ? 'lire-tout' : 'sceller',
      'choix-portail': finPortail,
    });
    assert.equal(recitFin.scenesVues.length, 40);
    assert.equal(registresDebloques(recitFin).length, 9);
    const actesResumes = resumeActesHistoire(recitFin);
    assert.ok(actesResumes.every((a) => a.statut === 'termine'));
    const epilogue = texteEpilogueActe('acte-5', recitFin.choix);
    if (finPortail === 'ouvrir') {
      assert.match(epilogue.titre, /Ouvrir/);
      assert.match(statutSurvivantsHistoire(recitFin).etape, /Portail ouvert/);
    } else if (finPortail === 'tenir') {
      assert.match(epilogue.titre, /Tenir/);
      assert.match(statutSurvivantsHistoire(recitFin).etape, /Montée collective/);
    } else {
      assert.match(epilogue.titre, /Prendre la place/);
      assert.match(statutSurvivantsHistoire(recitFin).etape, /Astrolabe arrêté/);
    }
  }
});
