/**
 * Vérification des succès — `npm run check:achievements`.
 *
 * Cinq niveaux de contrôle :
 *
 *   1. le catalogue est cohérent (identifiants uniques, trois langues,
 *      métrique connue, cible atteignable, XP et rareté valides) ;
 *   2. le moteur se comporte comme annoncé (contenus distincts, lecture de
 *      nuit, séries de jours, fusion appareil ↔ compte, données corrompues) ;
 *   3. tous les succès du catalogue sont réellement débloquables : un
 *      scénario complet (lecture, vidéos, commentaires, recherches, langues,
 *      fidélité, compte) les ouvre un par un ;
 *   4. le rendu réel du profil joueur (SSR) montre ces succès dans les trois
 *      langues, y compris avec une progression déjà enregistrée — et les
 *      actions du site sont bien branchées sur le moteur. Le niveau et la
 *      barre d'XP ne sont affichés qu'une fois, dans la carte du joueur :
 *      la section « succès » ne les répète pas ;
 *   5. la bulle d'information d'un succès reste dans l'écran (jsdom, avec une
 *      géométrie de téléphone simulée) : elle est décalée pour ne pas être
 *      rognée, et passe sous la carte quand il n'y a pas la place au-dessus.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import React from 'react';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  METRICS,
  createState,
  dayKey,
  evaluate,
  levelFromXp,
  levelUpBetween,
  mergeStates,
  metricValue,
  normalizeState,
  reduce,
  summarize,
  totalXp,
} from '../src/achievements/engine.js';
import { ACHIEVEMENTS, GROUPS, RARITIES, TIER_ORDER, achievementLabel, levelTitle, rarityLabel, tierRank } from '../src/achievements/catalog.js';
import { describeRoute, linkedProviders } from '../src/achievements/routeActions.js';
import { GUEST_SCOPE, REMOTE_META_KEY, STORAGE_KEY, clearStorage, readStorage, scopeForUser, storageKeyForScope, writeStorage } from '../src/achievements/storage.js';
// Les personas de démonstration ne sont plus livrées dans l'application
// (`src/auth/demoProfiles.js` est vide) : ce sont des fixtures de test, semées
// dans l'entrée SSR par scripts/demoFixtures.js.
import { DEMO_PROFILE_FIXTURES } from './demoFixtures.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'fr', 'ar'];

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? ` → ${actual}` : ` → ${actual} (attendu : ${expected})`}`);
}
function ok(label, condition, detail = '') {
  check(`${label}${detail ? ` (${detail})` : ''}`, Boolean(condition), true);
}

/* ------------------------------------------------------- 1. Catalogue */

console.log(`\n[1/4] catalogue : ${ACHIEVEMENTS.length} succès, trois langues\n`);

const ids = ACHIEVEMENTS.map((entry) => entry.id);
check('identifiants uniques', new Set(ids).size, ids.length);

const unknownMetrics = ACHIEVEMENTS.filter((entry) => typeof METRICS[entry.metric] !== 'function').map((entry) => `${entry.id}→${entry.metric}`);
check('chaque succès utilise une métrique du moteur', unknownMetrics.join(', ') || 'aucune', 'aucune');

const badTargets = ACHIEVEMENTS.filter((entry) => !Number.isFinite(entry.target) || entry.target < 1).map((entry) => entry.id);
check('chaque succès a une cible ≥ 1', badTargets.join(', ') || 'aucune', 'aucune');

const badXp = ACHIEVEMENTS.filter((entry) => !Number.isFinite(entry.xp) || entry.xp <= 0).map((entry) => entry.id);
check('chaque succès donne de l’XP', badXp.join(', ') || 'aucun', 'aucun');

const badRarity = ACHIEVEMENTS.filter((entry) => !RARITIES[entry.rarity]).map((entry) => entry.id);
check('raretés valides (grades bronze → platine)', badRarity.join(', ') || 'aucune', 'aucune');

// Grades : trois langues complètes pour chaque grade, et un ordre clair.
const badTierLabels = [];
for (const tier of Object.values(RARITIES)) {
  for (const lang of LANGS) {
    if (!tier.labels?.[lang]?.trim()) badTierLabels.push(`${tier.id}/${lang}`);
  }
}
check('grades libellés en FR / EN / AR', badTierLabels.join(', ') || 'aucun', 'aucun');
check('ordre des grades', TIER_ORDER.join('<'), 'bronze<silver<gold<platinum');
check('rang des grades croissant', TIER_ORDER.every((tier, index) => tierRank(tier) === index), true);
check('grade inconnu replié en bas de l’échelle', tierRank('mithril'), 0);

// Un grade plus rare se mérite : l’XP maximum d’un grade reste sous l’XP
// minimum du grade supérieur (sinon le grade ne raconterait rien).
const tierXpMonotonic = TIER_ORDER.slice(0, -1).every((tier, index) => {
  const maxOfTier = Math.max(...ACHIEVEMENTS.filter((entry) => entry.rarity === tier).map((entry) => entry.xp));
  const next = TIER_ORDER[index + 1];
  const minOfNext = Math.min(...ACHIEVEMENTS.filter((entry) => entry.rarity === next).map((entry) => entry.xp));
  return maxOfTier < minOfNext;
});
ok('l’XP croît avec le grade (bronze < argent < or < platine)', tierXpMonotonic,
  TIER_ORDER.map((tier) => {
    const values = ACHIEVEMENTS.filter((entry) => entry.rarity === tier).map((entry) => entry.xp);
    return `${tier} ${Math.min(...values)}–${Math.max(...values)}`;
  }).join(', '));

// Chaque icône du catalogue est livrée dans public/icons/achievements/.
const availableIcons = new Set(readdirSync(path.join(root, 'public', 'icons', 'achievements')));
const missingIcons = ACHIEVEMENTS.filter((entry) => !availableIcons.has(path.basename(entry.icon))).map((entry) => entry.id);
check('icône livrée pour chaque succès', missingIcons.join(', ') || 'aucune', 'aucune');

// Chaque grade du catalogue a au moins un succès (aucun filtre à vide).
const emptyTiers = TIER_ORDER.filter((tier) => !ACHIEVEMENTS.some((entry) => entry.rarity === tier));
check('chaque grade porte au moins un succès', emptyTiers.join(', ') || 'aucun', 'aucun');

const groups = new Set(GROUPS.map((group) => group.id));
const badGroup = ACHIEVEMENTS.filter((entry) => !groups.has(entry.group)).map((entry) => entry.id);
check('familles valides', badGroup.join(', ') || 'aucune', 'aucune');

const missingLabels = [];
for (const entry of ACHIEVEMENTS) {
  for (const lang of LANGS) {
    const label = achievementLabel(entry, lang);
    if (!label.name?.trim() || !label.desc?.trim() || label.name === entry.id) missingLabels.push(`${entry.id}/${lang}`);
  }
}
check('nom + description dans FR / EN / AR', missingLabels.join(', ') || 'aucun', 'aucun');

const usedMetrics = new Set(ACHIEVEMENTS.map((entry) => entry.metric));
const unusedMetrics = Object.keys(METRICS).filter((metric) => !usedMetrics.has(metric));
console.log(`  info métriques suivies sans succès : ${unusedMetrics.join(', ') || 'aucune'}`);

/* --------------------------------------------------------- 2. Moteur */

console.log('\n[2/4] moteur : comptage, séries, fusion, robustesse\n');

const at = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour, 30).toISOString();

// Deux lectures du même article ne comptent qu'une fois.
let run = createState(new Date(at(2026, 9, 20)));
let step = reduce(run, { type: 'article_read', kind: 'news', id: 'metroid-ravenous', at: at(2026, 9, 20) });
const firstReadUnlocked = step.unlocked.includes('first-read');
const doubleRead = reduce(step.state, { type: 'article_read', kind: 'news', id: 'metroid-ravenous', at: at(2026, 9, 21) });
check('un article déjà lu ne compte pas deux fois', metricValue(doubleRead.state, 'articlesRead'), 1);
check('le premier article débloque « Première page »', firstReadUnlocked, true);

// Lecture de nuit : un article lu à 2 h fait basculer le drapeau.
const night = reduce(createState(), { type: 'article_read', kind: 'news', id: 'night-owl', at: at(2026, 9, 20, 2) });
check('lecture entre minuit et 5 h reconnue', metricValue(night.state, 'nightReading'), 1);
const day = reduce(createState(), { type: 'article_read', kind: 'news', id: 'day-owl', at: at(2026, 9, 20, 14) });
check('lecture en journée : pas de succès de nuit', metricValue(day.state, 'nightReading'), 0);

// Nuits distinctes : trois lectures la même nuit ne comptent qu'une nuit ;
// le succès platine exige trois nuits différentes.
const sameNight = reduce(reduce(
  reduce(createState(), { type: 'article_read', kind: 'news', id: 'a', at: at(2026, 9, 20, 1) }).state,
  { type: 'article_read', kind: 'news', id: 'b', at: at(2026, 9, 20, 2) }),
  { type: 'article_read', kind: 'news', id: 'c', at: at(2026, 9, 20, 4) }).state;
check('trois lectures la même nuit = une seule nuit', metricValue(sameNight, 'nightReadingDays'), 1);
const threeNights = reduce(reduce(
  sameNight,
  { type: 'article_read', kind: 'news', id: 'd', at: at(2026, 9, 21, 3) }).state,
  { type: 'article_read', kind: 'news', id: 'e', at: at(2026, 9, 22, 3) }).state;
check('trois nuits différentes reconnues', metricValue(threeNights, 'nightReadingDays'), 3);

// Lecture matinale (5 h – 8 h) : autre geste rare, succès or.
const morning = reduce(createState(), { type: 'article_read', kind: 'news', id: 'lève-tôt', at: at(2026, 9, 20, 6) });
check('lecture entre 5 h et 8 h reconnue', metricValue(morning.state, 'earlyReading'), 1);
const tooLate = reduce(createState(), { type: 'article_read', kind: 'news', id: 'grasse matinée', at: at(2026, 9, 20, 9) });
check('lecture après 8 h : pas de succès du matin', metricValue(tooLate.state, 'earlyReading'), 0);

// Les trois familles éditoriales : le compteur ne s'allume qu'une fois les
// trois touchées (actu + test + dossier).
let kinds = createState();
kinds = reduce(kinds, { type: 'article_read', kind: 'news', id: 'n1' }).state;
check('une seule famille : pas de trinité', metricValue(kinds, 'readAllKinds'), 0);
kinds = reduce(kinds, { type: 'article_read', kind: 'review', id: 'r1' }).state;
check('deux familles : toujours pas', metricValue(kinds, 'readAllKinds'), 0);
kinds = reduce(kinds, { type: 'article_read', kind: 'dossier', id: 'd1' }).state;
check('trois familles : trinité validée', metricValue(kinds, 'readAllKinds'), 1);

// Séries de jours : même jour, jours consécutifs, puis rupture.
let streakState = createState();
streakState = reduce(streakState, { type: 'visit', day: '2026-09-20' }).state;
streakState = reduce(streakState, { type: 'visit', day: '2026-09-20' }).state;
check('deux visites le même jour = une seule journée', metricValue(streakState, 'bestStreak'), 1);
streakState = reduce(streakState, { type: 'visit', day: '2026-09-21' }).state;
streakState = reduce(streakState, { type: 'visit', day: '2026-09-22' }).state;
check('trois jours consécutifs', metricValue(streakState, 'bestStreak'), 3);
const afterGap = reduce(streakState, { type: 'visit', day: '2026-09-25' }).state;
check('une journée manquée relance la série', metricValue(afterGap, 'bestStreak'), 3);
check('… mais le jour est compté', metricValue(afterGap, 'visitDays'), 4);

// Une action inconnue ne casse rien et n’attribue rien.
const ghost = reduce(createState(), { type: 'teleport', at: at(2026, 9, 20) });
check('action inconnue ignorée', ghost.unlocked.length, 0);

// Données corrompues : état valide malgré tout.
const broken = normalizeState({ counters: { comments_posted: 'beaucoup' }, sets: { articles_read: 'nope' }, unlocked: null, days: [1, '2026-09-20'] });
check('état corrompu réparé (compteurs)', metricValue(broken, 'commentsPosted'), 0);
check('état corrompu réparé (ensembles)', metricValue(broken, 'articlesRead'), 0);
check('état corrompu réparé (jours)', metricValue(broken, 'visitDays'), 1);

// Fusion appareil ↔ compte : rien n’est perdu.
const laptop = reduce(createState(), { type: 'search_performed', query: 'zelda', at: at(2026, 9, 20) }).state;
const phone = reduce(createState(), { type: 'comment_posted', at: at(2026, 9, 20) }).state;
const merged = mergeStates(laptop, phone);
check('fusion : recherches conservées', metricValue(merged, 'searchesPerformed'), 1);
check('fusion : commentaires conservés', metricValue(merged, 'commentsPosted'), 1);
check('fusion : c’est idempotent', metricValue(mergeStates(merged, merged), 'searchesPerformed'), 1);

// Courbe de niveau : jamais de niveau 0, XP restant cohérent.
check('0 XP = niveau 1', levelFromXp(0).level, 1);
check('niveau 2 à 150 XP', levelFromXp(150).level, 2);
check('XP restant dans le niveau', levelFromXp(150).xpInLevel, 0);
ok('progression du niveau croissante', levelFromXp(2000).level > levelFromXp(400).level, `${levelFromXp(400).level} → ${levelFromXp(2000).level}`);

// Passage de niveau : la fenêtre de déblocage l'annonce avec le succès qui l'a
// déclenché (comparaison avant / après de l'XP des succès obtenus).
const beforeLevel = createState();
const afterLevel = reduce(beforeLevel, { type: 'comment_posted' }).state;
check('aucun niveau gagné au premier succès commun', levelUpBetween(beforeLevel, afterLevel), null);
const rewarded = evaluate(normalizeState({
  ...createState(),
  sets: {
    articles_read: ['a', 'b', 'c', 'd', 'e'],
    news_read: ['a', 'b', 'c', 'd', 'e'],
    videos_watched: ['v1', 'v2', 'v3', 'v4', 'v5'],
    sections_visited: ['home', 'news', 'reviews'],
    languages_used: ['fr', 'en', 'ar'],
    providers_linked: ['google'],
  },
})).state;
const expectedXp = ['first-read', 'page-turner', 'news-wire', 'explorer', 'prime-time', 'binge-watcher', 'polyglot', 'trilingual', 'linked-player']
  .reduce((sum, id) => sum + ACHIEVEMENTS.find((entry) => entry.id === id).xp, 0);
check('l’XP total est la somme des succès obtenus', totalXp(rewarded), expectedXp);
check('niveau gagné détecté entre deux états', levelUpBetween(beforeLevel, rewarded)?.from, 1);
check('… avec les paliers franchis', levelUpBetween(beforeLevel, rewarded)?.to, levelFromXp(expectedXp).level);
ok('… et un vrai saut de niveau', levelUpBetween(beforeLevel, rewarded)?.to > 1, `niveau ${levelUpBetween(beforeLevel, rewarded)?.to}`);

// Navigation : chaque route du site doit se traduire en actions, sinon un
// succès reste inaccessible même en visitant les bonnes pages.
const routeCases = [
  ['/', { section: 'home', article: null }],
  ['/news', { section: 'news', article: null }],
  ['/news/zelda-ocarina', { section: 'news', article: { kind: 'news', id: 'zelda-ocarina' } }],
  ['/reviews/onimusha', { section: 'reviews', article: { kind: 'review', id: 'onimusha' } }],
  ['/dossiers/pourquoi-les-souls', { section: 'dossiers', article: { kind: 'dossier', id: 'pourquoi-les-souls' } }],
  ['/events/7ouma-arena', { section: 'events', article: null }],
  ['/partenaires', { section: 'events', article: null }],
  ['/calendrier', { section: 'calendrier', article: null }],
  ['/calendar', { section: 'calendrier', article: null }],
  ['/search', { section: 'search', article: null }],
  ['/auth', { section: 'account', article: null }],
  ['/profile/player-1', { section: 'account', article: null }],
  ['/profil/player-1', { section: 'account', article: null }],
  ['/u/player-1', { section: 'account', article: null }],
  ['/unknown-page', { section: null, article: null }],
  ['/news/', { section: 'news', article: null }],
];
const badRoutes = routeCases.filter(([route, expected]) => JSON.stringify(describeRoute(route)) !== JSON.stringify(expected)).map(([route]) => route);
check('chaque route se traduit en actions de succès', badRoutes.join(', ') || 'aucune', 'aucune');

// Comptes tiers : reconnus depuis une session Supabase (azure → microsoft).
check('OAuth Google reconnu', linkedProviders({ app_metadata: { provider: 'google' } }).join(','), 'google');
check('OAuth Azure reconnu comme Microsoft', linkedProviders({ identities: [{ provider: 'azure' }] }).join(','), 'microsoft');
check('connexion e-mail : aucun compte tiers', linkedProviders({ app_metadata: { provider: 'email' } }).length, 0);

// Clé de stockage distante attendue côté Supabase.
check('clé de progression du compte', REMOTE_META_KEY, 'achievements');

// Progression par joueur : clés locales séparées (invité / cache par compte),
// avec reprise de l'ancienne clé unique comme progression invité.
const fakeStore = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (fakeStore.has(key) ? fakeStore.get(key) : null),
    setItem: (key, value) => fakeStore.set(key, String(value)),
    removeItem: (key) => fakeStore.delete(key),
  },
};
// Ancien format (une seule clé pour tout le monde) : relu comme progression invité.
const legacyProgress = reduce(createState(), { type: 'search_performed', query: 'legacy' }).state;
fakeStore.set(STORAGE_KEY, JSON.stringify(legacyProgress));
check('l’ancienne clé unique est reprise comme progression invité', metricValue(readStorage(GUEST_SCOPE), 'searchesPerformed'), 1);
// Nouvelle clé invité : prioritaire dès qu'elle existe.
const guestProgress = reduce(createState(), { type: 'comment_posted' }).state;
check('la progression invité a sa propre clé', writeStorage(guestProgress, GUEST_SCOPE) && fakeStore.has(storageKeyForScope(GUEST_SCOPE)), true);
check('… et prime sur l’ancienne clé unique', metricValue(readStorage(GUEST_SCOPE), 'commentsPosted'), 1);
// Chaque compte a SON cache local ; un autre compte n'y voit rien.
const scopeA = scopeForUser('compte-a');
check('le cache d’un compte a sa propre clé', writeStorage(guestProgress, scopeA) && fakeStore.has(storageKeyForScope(scopeA)), true);
check('un autre compte ne lit pas ce cache', readStorage(scopeForUser('compte-b')), null);
check('… et démarre de zéro', metricValue(evaluate(readStorage(scopeForUser('compte-b'))).state, 'commentsPosted'), 0);
// Effacer le cache d'un compte ne touche ni les autres ni l'invité.
clearStorage(scopeA);
check('effacer un cache ne touche pas l’invité', fakeStore.has(storageKeyForScope(scopeA)) === false && metricValue(readStorage(GUEST_SCOPE), 'commentsPosted'), 1);

/* ------------------------------- 3. Tous les succès sont débloquables */

console.log('\n[3/4] scénario complet : chaque succès du catalogue peut être obtenu\n');

let scenario = createState(new Date(at(2026, 9, 1)));
const play = (type, payload = {}) => {
  const result = reduce(scenario, { type, ...payload });
  scenario = result.state;
  return result.unlocked;
};

const unlockedOrder = [];
const record = (ids) => unlockedOrder.push(...ids);

// Visite datée + navigation : les huit sections, y compris recherche
// et compte (passeport complet).
record(play('visit', { day: dayKey(new Date(at(2026, 9, 1))) }));
record(play('page_view'));
['home', 'news', 'reviews', 'dossiers', 'events', 'calendrier', 'search', 'account'].forEach((section) => {
  record(play('page_view'));
  record(play('section_visited', { id: section }));
});

// Lecture : 31 articles réels du site — 22 actus, 3 tests et 6 dossiers —
// de quoi pousser jusqu'au succès platine « Bibliothécaire » (30).
const newsIds = [
  'metroid-ravenous', 'zelda-ocarina', 'physint', 'wardogs', 'diablo-v', 'gta6-dualsense',
  'onimusha-million', 'zelda-40th', 'monster-hunter-wilds', 'starcraft-fps', 'diablo-switch-2',
  'diablo-netflix', 'persona-6-switch-2', 'last-of-us-ii-mod', 'cyberpunk-2077-battlenet',
  'rayman-legends-retold', 'fire-emblem-fortunes-weave', 'wolverine-exclu-ps5',
  'kingdom-hearts-4-coco', 'tokyo-game-show-2026-annulation', 'eshop-switch-2-20-septembre',
  'sony-licence-jeux-numeriques',
];
const reviewIds = ['onimusha', 'wolverine', 'orbitals'];
const dossierIds = [
  'pourquoi-les-souls', 'goya-hicosoft', 'heritage-playstation-1',
  'choc-generations-gaming', '20-ans-xbox-360', '25-ans-playstation-2',
];
newsIds.forEach((id) => record(play('article_read', { kind: 'news', id })));
reviewIds.forEach((id) => record(play('article_read', { kind: 'review', id })));
dossierIds.forEach((id) => record(play('article_read', { kind: 'dossier', id })));

// Lectures inhabituelles : une à 3 h du matin (nuit n°1), une autre à 6 h 45.
record(play('article_read', { kind: 'news', id: 'eshop-switch-2-20-septembre', at: at(2026, 9, 2, 3) }));
record(play('article_read', { kind: 'news', id: 'sony-licence-jeux-numeriques', at: at(2026, 9, 3, 6, 45) }));
// … et deux nuits supplémentaires, plus tard (trois nuits différentes au total).
record(play('article_read', { kind: 'dossier', id: 'pourquoi-les-souls', at: at(2026, 9, 8, 1, 15) }));
record(play('article_read', { kind: 'review', id: 'wolverine', at: at(2026, 9, 14, 2, 30) }));

// Vidéos : douze vidéos distinctes, dont le direct (marathon ciné).
[
  'aTs0zhm6Leg', '91eqLm2Hy9k', 'twbaM8fiXpo', 'A2VPhWOUMHI', 'live_stream',
  'extra-video-06', 'extra-video-07', 'extra-video-08', 'extra-video-09',
  'extra-video-10', 'extra-video-11', 'extra-video-12',
].forEach((id) => {
  record(play('video_played', { id }));
});

// Communauté : 15 commentaires (pilier) et cinq recherches différentes.
for (let index = 0; index < 15; index += 1) record(play('comment_posted'));
['zelda', 'metroid', 'onimusha', 'switch 2', 'gta'].forEach((query) => record(play('search_performed', { query })));

// Langues et compte.
['fr', 'en', 'ar'].forEach((code) => record(play('language_used', { code })));
['google', 'microsoft'].forEach((provider) => record(play('provider_linked', { provider })));
record(play('account_created'));
record(play('signed_in'));
record(play('profile_updated'));

// Fidélité : trente jours différents, dont quatorze consécutifs (série de fer).
for (let index = 1; index <= 30; index += 1) {
  const date = new Date(at(2026, 9, 1));
  date.setDate(date.getDate() + index - 1);
  record(play('visit', { day: dayKey(date) }));
}

// Quizz : les huit quizz du site joués huit jours consécutifs en « quizz du
// jour » (série de sept jours minimum), dont un sans faute — de quoi ouvrir
// premier quizz, sans faute, tour complet et semaine parfaite.
[
  'culture-gaming', 'consoles-retro', 'souls-fromsoftware', 'rpg-legends',
  'esport-competition', 'studios-legends', 'tech-hardware', 'cinema-pop-culture',
].forEach((id, index) => {
  const date = new Date(at(2026, 9, 20));
  date.setDate(date.getDate() + index);
  record(play('quiz_completed', { id, perfect: index === 0, daily: true, at: date.toISOString() }));
});

// Un défi envoyé à un ami depuis un écran de résultat (rival trouvé).
record(play('quiz_challenge'));

const finalSummary = summarize(scenario);
const unreachable = ACHIEVEMENTS.filter((entry) => !finalSummary.items.find((item) => item.id === entry.id)?.unlocked).map((entry) => entry.id);
check('tous les succès sont débloquables', unreachable.join(', ') || 'aucun', 'aucun');
check('tous les succès sont débloqués par le scénario', finalSummary.unlockedCount, ACHIEVEMENTS.length);
check('aucun succès annoncé deux fois', new Set(unlockedOrder).size, unlockedOrder.length);
ok('le scénario termine à un rang de vétéran ou plus', finalSummary.level.level >= 5, `niveau ${finalSummary.level.level}, ${finalSummary.xp} XP`);
check('100 % = catalogue complet', finalSummary.percent, 100);

// Le catalogue est aussi évalué au chargement (succès rétroactifs) : un joueur
// qui avait déjà lu 5 articles — un état écrit avant l'ajout d'un succès, ou
// synchronisé depuis un autre appareil — les reçoit sans rejouer les actions.
const retroState = normalizeState({ ...createState(), sets: { articles_read: ['a', 'b', 'c', 'd', 'e'], news_read: ['a', 'b', 'c', 'd', 'e'] } });
const retro = evaluate(retroState);
check('évaluation au chargement : succès rétroactifs', retro.unlocked.includes('page-turner') && retro.unlocked.includes('news-wire'), true);
check('… et rien à attribuer une seconde fois', evaluate(retro.state).unlocked.length, 0);

/* ------------------------------------------------- 4. Rendu réel (SSR) */

console.log('\n[4/4] rendu réel du profil + actions branchées\n');

const outDir = path.join(root, 'node_modules', '.cache', 'achievements-smoke');
execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/achievements-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const { profileAchievements, authHub, achievementPopup, freshAccountOnPlayedDevice } = await import(path.join(outDir, 'achievements-smoke.js'));

/**
 * Niveau affiché par la **carte du joueur** du hub : c'est le seul endroit où
 * le hub montre la progression (la section « succès » n'affiche plus ni niveau
 * ni barre d'XP, qui faisaient doublon). `player-xp-level-tag` porte le texte
 * « NIVEAU 3 — … » ; React insère des commentaires entre les nœuds de texte,
 * donc le motif les tolère.
 */
const shownLevel = (html) => Number(/player-xp-level-tag">(?:<!--[^>]*-->|[^0-9])*(\d+)/.exec(html)?.[1]);

for (const lang of LANGS) {
  const { html } = profileAchievements(lang, null, { demo: true });
  const heading = { en: 'YOUR SITE ACHIEVEMENTS', fr: 'TES SUCCÈS SUR LE SITE', ar: 'إنجازاتك على الموقع' }[lang];
  ok(`[${lang}] le profil expose la section des succès`, html.includes('achievements-panel compact') && html.includes(heading));
  ok(`[${lang}] le profil affiche le niveau dans la carte du joueur`, shownLevel(html) >= 1);
  // La section « succès » ne répète plus le niveau ni la barre d'XP du hub :
  // un seul bloc de progression par page.
  ok(`[${lang}] la section succès ne duplique plus la progression`, !html.includes('achievement-level'));
  ok(`[${lang}] le profil n’a plus de lien vers une page dédiée`, !html.includes('href="/achievements"'));
  check(`[${lang}] rien n’est débloqué sans action`, (html.match(/achievement-card rarity-[a-z]+ unlocked/g) || []).length, 0);
}

// Progression enregistrée sur l'appareil : le panneau intégré au profil doit
// la reprendre telle quelle.
const savedState = reduce(createState(), { type: 'article_read', kind: 'news', id: 'metroid-ravenous', at: '2026-09-01T12:00:00.000Z' }).state;
const saved = reduce(savedState, { type: 'article_read', kind: 'news', id: 'zelda-ocarina', at: '2026-09-01T12:05:00.000Z' }).state;
const withProgress = profileAchievements('fr', saved, { demo: true });
const unlockedCards = (withProgress.html.match(/achievement-card rarity-[a-z]+ unlocked/g) || []).length;
ok('progression enregistrée reprise dans le profil', unlockedCards >= 1, `${unlockedCards} succès affichés comme débloqués`);

// RÉGRESSION : un compte tout juste créé sur un appareil où l'on a déjà joué
// démarre au niveau 1, sans aucun succès — la progression laissée sur
// l'appareil (par un visiteur ou un autre compte) ne lui est pas prêtée.
const freshOnDevice = freshAccountOnPlayedDevice('fr', saved);
check(
  'un compte neuf n’hérite d’aucun succès de l’appareil',
  (freshOnDevice.html.match(/achievement-card rarity-[a-z]+ unlocked/g) || []).length,
  0,
);
check('… il démarre au niveau 1', shownLevel(freshOnDevice.html), 1);
// Le compte connecté retrouve en revanche SA progression (cache de sa copie
// serveur, clé propre au compte) : mêmes succès que ceux enregistrés pour lui.
const ownCache = profileAchievements('fr', saved, { account: true });
check(
  'un compte relit son propre cache local',
  (ownCache.html.match(/achievement-card rarity-[a-z]+ unlocked/g) || []).length,
  1,
);

// Les compteurs d'actions doivent refléter la progression enregistrée
// (un compteur branché sur la mauvaise métrique afficherait 0).
const countersState = normalizeState({
  ...createState(),
  counters: { comments_posted: 3 },
  sets: { articles_read: ['a', 'b'], videos_watched: ['v1'], sections_visited: ['home'] },
});
const counters = profileAchievements('fr', countersState, { demo: true });
ok('le profil reflète la progression enregistrée', counters.html.includes('achievements-panel') && (counters.html.match(/achievement-card rarity-[a-z]+ unlocked/g) || []).length >= 1);

// React insère des commentaires entre les nœuds de texte : on les retire avant
// de chercher une phrase (ou un nombre) dans le rendu.
const noComments = (html) => html.replace(/<!--[^>]*-->/g, '');
/**
 * Largeur d'une barre de progression dans le rendu : le style est porté par
 * l'élément lui-même (barre d'XP du hub) ou par son premier `<span>` (barre de
 * la section succès).
 */
function barFill(html, className) {
  const from = html.indexOf(`class="${className}"`);
  if (from < 0) return Number.NaN;
  const match = /style="width:(\d+)%"/.exec(html.slice(from));
  return match ? Number(match[1]) : Number.NaN;
}

const hub = authHub('fr', saved, { demo: true });
ok('le hub joueur montre les succès du site', hub.html.includes('TES SUCCÈS SUR LE SITE'));
ok('le hub joueur affiche le niveau dans la carte du joueur', shownLevel(hub.html) >= 1);
ok('le hub joueur ne duplique plus la progression dans la section succès', !hub.html.includes('achievement-level'));
ok('le hub joueur conserve les succès dans le profil', hub.html.includes('TES SUCCÈS SUR LE SITE') && !hub.html.includes('VOIR TOUS LES SUCCÈS'));
const vortex = DEMO_PROFILE_FIXTURES.vortex.user_metadata;
check(
  'l’aperçu démo garde ses chiffres scriptés',
  barFill(hub.html, 'player-xp-bar-fill'),
  Math.round((vortex.xp / vortex.nextLevelXp) * 100),
);

// Hub d'un compte réellement connecté : ses métadonnées Supabase ne portent ni
// XP ni niveau (seule la progression des succès y est écrite), la barre
// principale doit donc lire le moteur — sinon elle reste à 0 % pendant que la
// barre de la section « succès » avance.
const realHub = noComments(authHub('fr', scenario, { account: true }).html);
const realSummary = summarize(scenario);
check(
  'la barre d’XP du hub connecté suit le moteur',
  barFill(realHub, 'player-xp-bar-fill'),
  realSummary.level.percent,
);
ok('… et elle se remplit', barFill(realHub, 'player-xp-bar-fill') > 0, `${realSummary.level.percent} % remplis`);
// Une seule barre de progression dans le hub : celle de la carte du joueur.
// La section « succès » ne la répète plus (c'était le doublon à supprimer).
check('le hub ne montre qu’une seule barre d’XP', (realHub.match(/player-xp-bar-bg/g) || []).length, 1);
ok('la section succès ne répète plus la barre d’XP', !realHub.includes('achievement-level-bar'));
check(
  'le niveau affiché dans le hub vient du moteur',
  Number(/player-xp-level-tag">[^0-9]*(\d+)/.exec(realHub)?.[1]),
  realSummary.level.level,
);
ok(
  '… avec le rang de ce niveau',
  realHub.includes(`player-xp-level-tag">NIVEAU ${realSummary.level.level} — ${levelTitle(realSummary.level.level, 'fr')}`),
);
ok(
  'l’XP total gagné est affiché',
  new RegExp(`${realSummary.xp.toLocaleString()} XP gagnés`).test(realHub),
);

// Un compte qui débute remplit aussi la barre (25 XP sur 150 → 17 %).
const beginner = noComments(authHub('fr', saved, { account: true }).html);
check('un compte débutant progresse aussi', barFill(beginner, 'player-xp-bar-fill'), summarize(saved).level.percent);

// Notification de déblocage : elle n'apparaît qu'après une action, on la rend
// donc avec la file qu'un joueur verrait juste après avoir obtenu un succès.
for (const lang of LANGS) {
  const html = noComments(achievementPopup(lang, {
    notifications: [{ id: 'polyglot', levelUp: { from: 1, to: 3 } }, { id: 'first-read' }],
  }));
  const polyglot = ACHIEVEMENTS.find((entry) => entry.id === 'polyglot');
  const label = achievementLabel(polyglot, lang);
  ok(`[${lang}] la notification annonce le succès`, html.includes(label.name) && html.includes(label.desc));
  ok(`[${lang}] … avec son grade et son XP`, html.includes(`rarity-${polyglot.rarity}`) && html.includes(`+${polyglot.xp}`));
  ok(`[${lang}] … le grade est libellé dans la langue du joueur`, html.includes(rarityLabel(polyglot.rarity, lang)));
  ok(`[${lang}] … et le passage de niveau`, html.includes('achievement-toast-level'));
  check(`[${lang}] … les succès d'affilée s'empilent`, (html.match(/class="achievement-toast /g) || []).length, 2);
  ok(`[${lang}] … la pile est ancrée et annoncée aux lecteurs d'écran`, html.includes('achievement-toasts') && html.includes('aria-live="polite"'));
}
const singleToast = noComments(achievementPopup('fr', { notifications: [{ id: 'polyglot' }] }));
check('une seule notification = un seul toast cliquable', (singleToast.match(/<button/g) || []).length, 1);
check('pas de notification sans succès à fêter', achievementPopup('fr', { notifications: [] }), '');

// Les actions du site sont branchées sur le moteur (source du site, comme les
// autres vérifications du dépôt : on lit ce qui est réellement livré).
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');
const sources = [
  ['src/components/Comments.jsx', "track('comment_posted')"],
  ['src/pages/Search.jsx', "track('search_performed'"],
  ['src/components/Layout.jsx', "track('search_performed'"],
  ['src/pages/Auth.jsx', "track('account_created')"],
  ['src/pages/Auth.jsx', "track('profile_updated')"],
  ['src/achievements/AchievementTracker.jsx', "track('article_read'"],
  ['src/achievements/AchievementTracker.jsx', 'stateScope !== scopeForUser(id)'],
  ['src/achievements/AchievementTracker.jsx', "track('video_played'"],
  ['src/achievements/AchievementTracker.jsx', 'VIDEO_PLAYED_EVENT'],
  ['src/quizzes/QuizPlayer.jsx', "track('quiz_completed'"],
  ['src/quizzes/QuizChallenge.jsx', "track('quiz_challenge')"],
  ['src/achievements/AchievementContext.jsx', 'enqueueNotifications(unlocked, levelUpBetween('],
  ['src/achievements/AchievementPopup.jsx', 'dismissNotification(entry.id)'],
  ['src/main.jsx', '<AchievementPopup />'],
];
const unwired = sources.filter(([file, needle]) => !read(file).includes(needle)).map(([file, needle]) => `${file} → ${needle}`);
check('actions branchées sur le moteur', unwired.join(', ') || 'aucune', 'aucune');

// Les toasts ont remplacé l'ancienne fenêtre centrale : aucun reste de modale
// (backdrop, rôle dialog) ne doit traîner dans la source.
const popupSource = read('src/achievements/AchievementPopup.jsx');
ok('plus de fenêtre centrale ni de backdrop', !/achievement-popup-backdrop|aria-modal|role="dialog"/.test(popupSource));

const videoLib = read('src/lib/videoPlayback.js');
ok('un lecteur qui démarre annonce la vidéo', videoLib.includes('dispatchEvent(new CustomEvent(VIDEO_PLAYED_EVENT'));

// Un seul écrivain du stockage : le module de persistance.
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(jsx?|mjs)$/.test(entry.name) ? [full] : [];
  });
}
const writers = sourceFiles(path.join(root, 'src'))
  .filter((file) => !file.endsWith(path.join('achievements', 'storage.js')))
  .filter((file) => /letsplay_achievements/.test(readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file));
check('un seul module écrit la progression locale', writers.join(', ') || 'aucun', 'aucun');

/* ------------------------------------------------------------------------ */
/* 5. Bulle d'information : elle ne doit jamais sortir de l'écran            */
/* ------------------------------------------------------------------------ */

// jsdom n'applique pas le CSS et ne calcule aucune mise en page : on monte la
// carte pour de vrai, puis on décrit nous-mêmes la géométrie d'un téléphone
// (375 × 720) — c'est ce que mesurerait le navigateur. La bulle, elle, est
// ramenée dans l'écran par `--tooltip-shift` (+ bascule sous la carte), ce que
// ces contrôles vérifient : les cartes des bords ne sont plus rognées.
console.log('\n[5/5] bulle d’information des succès : toujours dans l’écran\n');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });

/** Géométrie d'un écran de téléphone, en pixels CSS. */
const VIEWPORT = { width: 375, height: 720 };
const TOOLTIP = { width: 220, height: 150 };
/** Marge gardée entre la bulle et les bords (celle du composant). */
const TOOLTIP_MARGIN = 12;

// Le viewport de jsdom (1024 × 768) ne nous intéresse pas : on impose celui du
// téléphone, comme le ferait une rotation ou une fenêtre étroite.
Object.defineProperty(dom.window, 'innerWidth', { value: VIEWPORT.width, configurable: true });
Object.defineProperty(dom.window, 'innerHeight', { value: VIEWPORT.height, configurable: true });

const { items } = summarize(saved);
const tooltipCards = items.slice(0, 4);

const RECTS = [
  // Colonne de gauche, débordant à gauche (carte à moitié hors écran).
  { left: -30, top: 300, width: 160, height: 140 },
  // Colonne de droite, débordant à droite.
  { left: 245, top: 300, width: 160, height: 140 },
  // Carte centrée : aucun décalage nécessaire.
  { left: 108, top: 300, width: 160, height: 140 },
  // Carte en haut de l'écran : pas la place au-dessus, la bulle passe dessous.
  { left: 108, top: 10, width: 160, height: 140 },
];

globalThis.window = dom.window;
globalThis.document = dom.window.document;
// Node expose un `navigator` en lecture seule : on le remplace par celui de
// jsdom (c'est lui que React lit).
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Composants et textes viennent du même bundle que le rendu SSR (même
// instance de React) ; la liste d'items vient du moteur, importé plus haut.
const { createRoot } = await import('react-dom/client');
const { act } = await import('react');
const { AchievementCard, achievementsCopy } = await import(path.join(outDir, 'achievements-smoke.js'));
const t = achievementsCopy.fr;

const host = dom.window.document.getElementById('root');
const tooltipRoot = createRoot(host);
await act(async () => {
  tooltipRoot.render(
    React.createElement(
      'div',
      null,
      tooltipCards.map((item) => React.createElement(AchievementCard, { key: item.id, item, lang: 'fr', t })),
    ),
  );
});

const cards = [...host.querySelectorAll('.achievement-card')];
check('les cartes de succès sont montées', cards.length, tooltipCards.length);

// La bulle est mesurée (largeur/hauteur) et chaque carte reçoit sa position.
cards.forEach((card, index) => {
  const rect = RECTS[index];
  card.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top });
  const tip = card.querySelector('.achievement-tooltip');
  Object.defineProperty(tip, 'offsetWidth', { value: TOOLTIP.width, configurable: true });
  Object.defineProperty(tip, 'offsetHeight', { value: TOOLTIP.height, configurable: true });
});

/** Ouvre la bulle d'une carte (le focus est aussi ce que fait un appui tactile). */
async function openTooltip(card) {
  await act(async () => {
    card.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
  });
}

/** Décalage horizontal posé par la carte, en pixels. */
function shiftOf(card) {
  return Number.parseFloat(card.style.getPropertyValue('--tooltip-shift')) || 0;
}

/** Bords de la bulle tels qu'ils atterrissent à l'écran, décalage compris. */
const tooltipLeft = (index) => RECTS[index].left + RECTS[index].width / 2 - TOOLTIP.width / 2 + shiftOf(cards[index]);
const tooltipRight = (index) => RECTS[index].left + RECTS[index].width / 2 + TOOLTIP.width / 2 + shiftOf(cards[index]);

await openTooltip(cards[0]);
ok('carte du bord gauche : la bulle est ramenée vers la droite', shiftOf(cards[0]) > 0, `${shiftOf(cards[0])} px`);
ok('… et son bord gauche reste dans l’écran', tooltipLeft(0) >= TOOLTIP_MARGIN, `${Math.round(tooltipLeft(0))} px`);

await openTooltip(cards[1]);
ok('carte du bord droit : la bulle est ramenée vers la gauche', shiftOf(cards[1]) < 0, `${shiftOf(cards[1])} px`);
check(
  '… son bord droit s’arrête à la marge de l’écran',
  Math.round(tooltipRight(1)),
  VIEWPORT.width - TOOLTIP_MARGIN,
);

await openTooltip(cards[2]);
check('carte centrée : aucun décalage', shiftOf(cards[2]), 0);

await openTooltip(cards[3]);
ok('carte en haut de l’écran : la bulle passe sous la carte', cards[3].classList.contains('tooltip-below'));
ok('les autres cartes gardent la bulle au-dessus', !cards[2].classList.contains('tooltip-below'));

// Échap referme la bulle (clavier et lecteurs d'écran).
await act(async () => { cards[3].focus(); });
await act(async () => {
  cards[3].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});
ok('Échap referme la bulle', dom.window.document.activeElement !== cards[3]);

await act(async () => { tooltipRoot.unmount(); });
dom.window.close();

console.log(`\n  ${failures === 0 ? 'OK' : `${failures} échec(s)`} — succès : catalogue, moteur, scénario complet, rendu du profil et bulle d’information\n`);
if (failures > 0) process.exitCode = 1;
