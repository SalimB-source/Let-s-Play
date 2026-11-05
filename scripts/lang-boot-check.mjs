// Langue posée avant le premier rendu — `npm run check:lang-boot`.
//
// Pourquoi ce contrôle existe : la langue et le sens de lecture sont décidés
// deux fois, exprès. Une fois par le script inline d'`index.html` (avant le
// premier paint : sinon un visiteur arabophone voit la page en français, de
// gauche à droite, puis un saut vers la droite), une fois par
// `src/i18n/LanguageContext.jsx` (une fois React monté).
//
// Deux implémentations, c'est une de trop pour rester d'accord toute seule. Ce
// contrôle rejoue le VRAI script d'`index.html` dans jsdom, sur le HTML de
// production, et vérifie quatre choses :
//   1. la langue de l'appareil est respectée (`ar-DZ` → `ar` + `dir=rtl`) ;
//   2. le choix explicite du visiteur (`letsplay-lang`) prime sur l'appareil ;
//   3. une langue inconnue (`de-DE`) retombe sur le français ;
//   4. les résultats sont identiques à `matchDeviceLanguage()` — la fonction
//      que le contexte React utilise, donc les deux chemins ne peuvent pas
//      diverger sans faire rougir ce contrôle.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { LANGUAGE_CODES, matchDeviceLanguage } from '../src/i18n/languages.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Le script inline doit rester écrit en ES5 : il tourne avant tout le reste et
// ne doit dépendre d'aucune étape de compilation.
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const boot = inlineScripts.find((code) => code.includes('letsplay-lang'));
assert.ok(boot, 'index.html : le script inline qui pose la langue avant le premier rendu');
assert.doesNotMatch(boot, /=>|\bconst\b|\blet\b|`/, 'index.html : script de langue en ES5 (aucune flèche, const, let ni gabarit)');

// Le HTML doit rester écrit en français pour les robots et pour un navigateur
// sans JavaScript : c'est le script qui corrige.
assert.match(html, /<html lang="fr">/, 'index.html : langue de repli écrite en dur pour les robots');

function bootLanguage({ languages, stored }) {
  const dom = new JSDOM(html, { url: 'https://letsplay.test/Let-s-Play/', runScripts: 'outside-only' });
  Object.defineProperty(dom.window.navigator, 'languages', { value: languages, configurable: true });
  if (stored) dom.window.localStorage.setItem('letsplay-lang', stored);
  try {
    dom.window.eval(boot);
  } finally {
    // On lit AVANT de fermer la fenêtre.
    const documentElement = dom.window.document.documentElement;
    const result = { lang: documentElement.getAttribute('lang'), dir: documentElement.getAttribute('dir') };
    dom.window.close();
    return result;
  }
}

const dirOf = (lang) => (lang === 'ar' ? 'rtl' : 'ltr');
const cases = [
  { languages: ['ar-DZ', 'fr'], stored: null, lang: 'ar', why: 'appareil arabophone → arabe, de droite à gauche' },
  { languages: ['en-US', 'fr'], stored: null, lang: 'en', why: 'appareil anglophone → anglais' },
  { languages: ['fr-FR'], stored: null, lang: 'fr', why: 'appareil francophone → français' },
  { languages: ['de-DE', 'it-IT'], stored: null, lang: 'fr', why: 'langue inconnue → repli français' },
  { languages: ['de-DE', 'ar-EG'], stored: null, lang: 'ar', why: 'premier code reconnu de la liste, pas la première entrée' },
  { languages: ['ar-DZ'], stored: 'en', lang: 'en', why: 'choix mémorisé prioritaire sur l’appareil' },
  { languages: ['fr-FR'], stored: 'ar', lang: 'ar', why: 'choix mémorisé de l’arabe, même sur un appareil français' },
  { languages: ['fr-FR'], stored: 'de', lang: 'fr', why: 'valeur mémorisée invalide ignorée' },
];

for (const testCase of cases) {
  const before = bootLanguage(testCase);
  assert.equal(before.lang, testCase.lang, `index.html : ${testCase.why}`);
  assert.equal(before.dir, dirOf(testCase.lang), `index.html : sens de lecture de ${testCase.lang}`);
  // Même décision que le contexte React : choix mémorisé VALIDE prioritaire,
  // sinon `matchDeviceLanguage()` sur la liste de l'appareil.
  const storedIsKnown = LANGUAGE_CODES.includes(testCase.stored);
  const expected = storedIsKnown ? testCase.stored : matchDeviceLanguage(testCase.languages);
  assert.equal(before.lang, expected, `index.html et LanguageContext sont d’accord (${testCase.why})`);
}

// Les trois langues du site doivent être exactement celles connues du script.
for (const code of LANGUAGE_CODES) {
  assert.ok(boot.includes(`'${code}'`), `index.html : la langue ${code} est acceptée par le script`);
}

console.log(`OK — langue posée avant le premier rendu : ${cases.length} cas, alignés sur matchDeviceLanguage().\n`);
