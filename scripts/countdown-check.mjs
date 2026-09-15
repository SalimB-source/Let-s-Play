/**
 * Vérification du compte à rebours « le plus attendu » et du calendrier —
 * `npm run check:countdown`.
 *
 * Le bloc de la page Actus ne cite aucun jeu en dur : il prend le premier de la
 * file `awaitedRank` (src/releasesData.js) qui n'est pas encore sorti. Ce script
 * rejoue les dates clés du calendrier de septembre 2026, plus deux cas
 * synthétiques (calendrier multi-mois, `releaseAt` à l'heure près), pour garantir
 * que la bascule reste automatique — y compris l'ordre éditorial, la mention
 * « sorti aujourd'hui », le mois affiché et l'état « calendrier à jour ».
 */
import assert from 'node:assert/strict';
import {
  gameReleases,
  sortAwaited,
  nextAwaitedRelease,
  todaysReleases,
  countdownParts,
  activeMonth,
  monthLabel,
  monthHeadline,
  releaseDay,
  releaseDayLabel,
  releaseDate,
  releaseDateLabel,
  findRelease,
} from '../src/releasesData.js';

// Dates volontairement sans fuseau : elles se lisent en heure locale, comme les
// entrées `day` du calendrier. Les cas `releaseAt` en utilisent un, lui.
const at = (local) => new Date(local);
const name = (release) => (release ? release.title : '—');

let failures = 0;
function check(label, actual, expected){
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? ` → ${actual}` : ` → ${actual} (attendu : ${expected})`}`);
}

console.log('\n[1/6] le bloc suit le rang éditorial, puis bascule sur la sortie suivante\n');
check('14.09 — la veille', name(nextAwaitedRelease(at('2026-09-14T18:00:00'))), 'Marvel’s Wolverine');
check('15.09 00:00:01 — Wolverine vient de sortir', name(nextAwaitedRelease(at('2026-09-15T00:00:01'))), 'Fire Emblem: Fortune’s Weave');
check('16.09 — on garde le rang 2', name(nextAwaitedRelease(at('2026-09-16T09:00:00'))), 'Fire Emblem: Fortune’s Weave');
check('17.09 — Fire Emblem sorti, rang 3', name(nextAwaitedRelease(at('2026-09-17T12:00:00'))), 'Silent Hill Townfall');
check('18.09 — LEGO Batman sorti avant nous', name(nextAwaitedRelease(at('2026-09-18T12:00:00'))), 'Silent Hill Townfall');
check('24.09 — 2 sorties le même jour, rang 5 devant rang 6', name(nextAwaitedRelease(at('2026-09-24T12:00:00'))), 'The Witcher 3: Wild Hunt – Remastered');
check('30.09 — plus rien à décompter en septembre', name(nextAwaitedRelease(at('2026-09-30T12:00:00'))), '—');

console.log('\n[2/6] mention « sorti aujourd’hui » (le jour J, le bloc prévient)\n');
check('15.09 — sortie du jour', name(todaysReleases(at('2026-09-15T08:00:00'))[0]), 'Marvel’s Wolverine');
check('16.09 — plus de sortie du jour', name(todaysReleases(at('2026-09-16T08:00:00'))[0]), '—');
check('24.09 — les deux sorties du jour, dans l’ordre des rangs', todaysReleases(at('2026-09-24T20:00:00')).map((r) => r.slug).join(' → '), 'silent-hill-townfall → control-resonant');

console.log('\n[3/6] décompte + règles de tri\n');
check('restant à J-1 12h', JSON.stringify(countdownParts(findRelease('marvels-wolverine'), at('2026-09-14T12:00:00'))), JSON.stringify({ days: 0, hours: 12, minutes: 0, seconds: 0 }));
check('jamais négatif après la sortie', JSON.stringify(countdownParts(findRelease('marvels-wolverine'), at('2026-09-20T12:00:00'))), JSON.stringify({ days: 0, hours: 0, minutes: 0, seconds: 0 }));
check('rang 3 avant un jeu non classé', sortAwaited([{ slug: 'late-ranked', day: 29, awaitedRank: 3 }, { slug: 'early-unranked', day: 5 }]).map((r) => r.slug).join(' → '), 'late-ranked → early-unranked');
check('à rang égal, la date la plus proche gagne', sortAwaited([{ slug: 'later', day: 24, awaitedRank: 1 }, { slug: 'sooner', day: 10, awaitedRank: 1 }]).map((r) => r.slug).join(' → '), 'sooner → later');

console.log('\n[4/6] calendrier multi-mois : la file continue sur le mois suivant\n');
const crossMonth = [
  { slug: 'sep-last', day: 29, title: 'Sep Last', platforms: 'PC' },
  { slug: 'oct-first', day: 6, month: 10, title: 'Oct First', platforms: 'PC', awaitedRank: 1 },
  { slug: 'oct-second', day: 20, month: 10, title: 'Oct Second', platforms: 'PC', awaitedRank: 2 },
];
check('30.09 — le relais passe à octobre', name(nextAwaitedRelease(at('2026-09-30T12:00:00'), crossMonth)), 'Oct First');
check('06.10 — puis le rang 2', name(nextAwaitedRelease(at('2026-10-06T12:00:00'), crossMonth)), 'Oct Second');
check('mois affiché pendant septembre', activeMonth(at('2026-09-14T12:00:00'), gameReleases).key, '2026-09');
check('après le 30.09, la grille bascule sur le mois des prochaines sorties', activeMonth(at('2026-10-12T12:00:00'), crossMonth).key, '2026-10');
check('calendrier entamé seulement en septembre : octobre montre déjà septembre', activeMonth(at('2026-08-05T12:00:00'), gameReleases).key, '2026-09');
check('calendrier épuisé : on garde le dernier mois connu', activeMonth(at('2026-10-12T12:00:00'), gameReleases).key, '2026-09');
check('repère « aujourd’hui » dans le mois courant', activeMonth(at('2026-09-14T12:00:00'), gameReleases).todayDay, 14);
check('pas de repère « aujourd’hui » sur un mois passé', activeMonth(at('2026-10-12T12:00:00'), gameReleases).todayDay, null);
check('frise calée sur les jours réels du mois', activeMonth(at('2027-02-10T12:00:00'), [{ slug: 'feb', year: 2027, month: 2, day: 27, title: 'Feb Game' }]).days, 28);

console.log('\n[5/6] releaseAt : un instant de lancement précis pour tout le monde\n');
const timed = [
  { slug: 'timed-hero', title: 'Timed Hero', releaseAt: '2026-09-15T00:00:00Z', awaitedRank: 1 },
  { slug: 'timed-next', title: 'Timed Next', day: 17, awaitedRank: 2 },
];
check('1 s avant l’instant, on compte encore le jeu 1', name(nextAwaitedRelease(new Date('2026-09-14T23:59:59Z'), timed)), 'Timed Hero');
check('1 s après, on a basculé sur le jeu 2', name(nextAwaitedRelease(new Date('2026-09-15T00:00:01Z'), timed)), 'Timed Next');
check('jour déduit de releaseAt pour la grille', releaseDay({ slug: 'x', releaseAt: '2026-09-15T23:30:00+02:00' }), 15);
check('mois déduit de releaseAt pour la frise', activeMonth(new Date('2026-10-01T00:00:00Z'), [{ slug: 'x', releaseAt: '2026-10-05T08:00:00Z', title: 'X' }]).key, '2026-10');

console.log('\n[6/6] libellés localisés + cohérence du calendrier\n');
check('date FR', releaseDateLabel(findRelease('marvels-wolverine'), 'fr'), '15 septembre 2026');
check('date EN', releaseDateLabel(findRelease('marvels-wolverine'), 'en'), 'September 15, 2026');
check('mois + année FR', monthLabel(2026, 9, 'fr'), 'SEPTEMBRE 2026');
check('mois + année EN', monthLabel(2026, 10, 'en'), 'OCTOBER 2026');
check('titre de section (sans année)', monthHeadline(2026, 9, 'fr'), 'SEPTEMBRE');
check('badge de carte', releaseDayLabel(findRelease('marvels-wolverine'), 'en'), '15 SEP');
check('badge d’une autre entrée du calendrier', releaseDayLabel({ slug: 'oct', day: 6, month: 10 }, 'fr'), '06 OCT');
assert.match(releaseDateLabel(findRelease('marvels-wolverine'), 'ar'), /2026/, 'la date arabe doit rester lisible');
assert.match(releaseDateLabel(findRelease('marvels-wolverine'), 'xx'), /2026/, 'une langue inconnue retombe sur la date FR');

const ranks = gameReleases.map((release) => release.awaitedRank).filter((rank) => typeof rank === 'number');
check('rangs sans doublon', new Set(ranks).size, ranks.length);
check('chaque sortie a un visuel + une alternative', gameReleases.every((release) => typeof release.image === 'string' && typeof release.alt === 'string'), true);
check('chaque slug est unique', new Set(gameReleases.map((release) => release.slug)).size, gameReleases.length);
check('le calendrier est trié du plus proche au plus lointain', gameReleases.every((release, index) => index === 0 || releaseDate(gameReleases[index - 1]).getTime() <= releaseDate(release).getTime()), true);

console.log(`\n  ${failures === 0 ? 'OK' : `${failures} échec(s)`} — bascule automatique du compte à rebours\n`);
if (failures > 0) process.exitCode = 1;
