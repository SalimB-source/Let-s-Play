import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RPG_COMPTEUR_DUREE,
  RPG_VIE_DUREE,
  RPG_VIE_GRAINS,
  RPG_VIE_ROULAGE_MAX,
  RPG_VIE_ROULAGE_MIN,
  RPG_VIE_SEUIL_CRITIQUE,
  assouplirVie,
  classesVariation,
  dureeRoulageVie,
  etatJaugeVie,
  prefererMouvementReduit,
  sensVariation,
  valeurRouleeVie,
  varianteVariation,
} from '../src/games/rpgVieCompteurs.js';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const composant = lire('../src/games/RpgVieCompteurs.jsx');
const feuille = lire('../src/games/rpg-vie-compteurs.css');
const page = lire('../src/games/RpgDuelPage.jsx');

// ── Le roulage du nombre ────────────────────────────────────────────────────

test('le roulage part vite et se pose : les bornes et les extrémités tiennent', () => {
  assert.equal(assouplirVie(0), 0);
  assert.equal(assouplirVie(1), 1);
  assert.equal(assouplirVie(-3), 0, 'hors bornes, on ne sort pas du segment');
  assert.equal(assouplirVie(4), 1);
  assert.ok(assouplirVie(0.5) > 0.5, 'l’assouplissement avance plus vite que la droite');
  assert.ok(assouplirVie(0.3) > assouplirVie(0.2), 'la courbe reste monotone');
});

test('la durée du roulage suit l’écart, sans jamais sortir de ses bornes', () => {
  assert.equal(dureeRoulageVie(0), RPG_VIE_ROULAGE_MIN, 'un écart nul ne prend pas de temps');
  assert.ok(dureeRoulageVie(1) >= RPG_VIE_ROULAGE_MIN);
  assert.ok(dureeRoulageVie(3) > dureeRoulageVie(1), 'un plus gros coup se lit plus longtemps');
  assert.equal(dureeRoulageVie(500), RPG_VIE_ROULAGE_MAX, 'un coup démesuré est plafonné');
  assert.equal(dureeRoulageVie(-30), dureeRoulageVie(30), 'le sens ne change pas la durée');
});

test('la valeur roulée va d’un entier à l’autre, et s’arrête exactement sur la cible', () => {
  assert.equal(valeurRouleeVie(25, 22, 0), 25);
  assert.equal(valeurRouleeVie(25, 22, 1), 22);
  assert.equal(valeurRouleeVie(22, 26, 1), 26);
  assert.equal(valeurRouleeVie(25, 25, 0.4), 25, 'sans écart, le nombre ne bouge pas');
  const milieu = valeurRouleeVie(25, 15, 0.5);
  assert.ok(milieu < 25 && milieu > 15, 'entre les deux, la valeur est intermédiaire');
  assert.equal(milieu, Math.round(milieu), 'une vie s’affiche en points entiers');
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const v = valeurRouleeVie(25, 10, t);
    assert.ok(v <= 25 && v >= 10, 'aucune valeur ne sort de l’intervalle');
  }
});

// ── La jauge de vie ────────────────────────────────────────────────────────

test('la jauge est pleine à la vie de base, sans dépendre des PV bonus', () => {
  const pleine = etatJaugeVie({ pv: 25, pvMax: 25, base: 25 });
  assert.equal(pleine.part, 1);
  assert.equal(pleine.basePart, 1);
  assert.equal(pleine.reserve, 0, 'à 25/25, aucune réserve');
  assert.equal(pleine.critique, false);

  const entamee = etatJaugeVie({ pv: 5, pvMax: 25, base: 25 });
  assert.equal(entamee.part, 0.2);
  assert.equal(entamee.reserve, 0);
  assert.equal(entamee.critique, true);

  for (const pvMax of [25, 30, 50, 100]) {
    for (const pv of [25, 28, 30, 50, 100]) {
      const bonus = etatJaugeVie({ pv, pvMax, base: 25 });
      assert.equal(bonus.part, 1, `${pv} PV : le rond reste plein, même avec un record de ${pvMax}`);
      assert.equal(bonus.basePart, 1);
      assert.equal(bonus.reserve, 0, 'les PV bonus ne changent pas le visuel plein');
    }
    assert.equal(etatJaugeVie({ pv: 20, pvMax, base: 25 }).part, .8,
      'après un bonus, la jauge ne descend que sous 25 PV');
  }
  assert.equal(etatJaugeVie({ pv: 30, pvMax: 60, base: 30 }).part, 1,
    'une base personnalisée reste prise en compte');
});

test('une jauge ne ment jamais : les états partiels, vides ou absurdes retombent juste', () => {
  assert.deepEqual(etatJaugeVie({ pv: 0, pvMax: 25, base: 25 }).vide, true);
  assert.equal(etatJaugeVie({ pv: 0, pvMax: 25 }).critique, true);
  assert.equal(etatJaugeVie({ pv: 25, pvMax: 0 }).part, 1, 'un maximum nul ne divise pas par zéro');
  assert.equal(etatJaugeVie({ pv: 25 }).part, 1);
  assert.equal(etatJaugeVie({}).part, 0);
  assert.equal(etatJaugeVie({ pv: -4, pvMax: 25, base: 25 }).part, 0, 'la part reste dans [0, 1]');
  assert.equal(etatJaugeVie({ pv: 40, pvMax: 25, base: 25 }).part, 1, 'la part est bornée en haut');
  assert.equal(etatJaugeVie({ pv: '22', pvMax: '25', base: 25 }).part, 22 / 25,
    'les nombres en texte du journal sont acceptés');
  assert.ok(etatJaugeVie({ pv: 25, pvMax: 25, base: 900 }).basePart <= 1,
    'un maximum d’origine aberrant ne sort pas de la jauge');
});

test('le seuil critique est celui du jeu : cinq points de vie', () => {
  assert.equal(RPG_VIE_SEUIL_CRITIQUE, 5);
  assert.equal(etatJaugeVie({ pv: 5, pvMax: 25, base: 25 }).critique, true);
  assert.equal(etatJaugeVie({ pv: 6, pvMax: 25, base: 25 }).critique, false);
});

// ── Les variations et leurs variantes ──────────────────────────────────────

test('le sens d’une variation ne s’invente pas', () => {
  assert.equal(sensVariation(25, 22), 'perte');
  assert.equal(sensVariation(22, 26), 'gain');
  assert.equal(sensVariation(25, 25), 'stable');
  assert.equal(sensVariation(undefined, 25), 'stable');
  assert.equal(sensVariation('x', 25), 'stable');
  assert.equal(sensVariation(3, 3), 'stable');
});

test('les variantes alternent : deux coups rapprochés rejouent tous les deux', () => {
  assert.equal(varianteVariation(0), 'a');
  assert.equal(varianteVariation(1), 'b');
  assert.equal(varianteVariation(2), 'a');
  assert.equal(varianteVariation(-1), 'b');
  assert.equal(varianteVariation('3'), 'b');
  assert.equal(classesVariation('perte', 1), 'is-perte is-perte--b');
  assert.equal(classesVariation('gain', 2), 'is-gain is-gain--a');
  assert.equal(classesVariation('pose', 0), 'is-pose');
  assert.equal(classesVariation('stable', 0), '', 'le repos ne pose aucune classe');
  assert.equal(classesVariation('autre', 0), '');
});

test('le mouvement réduit se lit sans planter hors navigateur', () => {
  assert.equal(prefererMouvementReduit(null), false);
  assert.equal(prefererMouvementReduit({}), false);
  assert.equal(prefererMouvementReduit({ matchMedia: () => ({ matches: true }) }), true);
  assert.equal(prefererMouvementReduit({ matchMedia: () => ({ matches: false }) }), false);
  assert.equal(prefererMouvementReduit({ matchMedia: () => ({ matches: true }), autre: 1 }), true);
});

test('les durées restent dans le budget du duel', () => {
  assert.ok(RPG_COMPTEUR_DUREE > 0 && RPG_COMPTEUR_DUREE <= 700, 'un compteur de carte reste sous 700 ms');
  assert.ok(RPG_VIE_DUREE > 0 && RPG_VIE_DUREE <= 900, 'la jauge de vie reste sous la seconde');
  assert.equal(RPG_VIE_GRAINS, 6);
});

// ── Le composant : la vérité reste la valeur vraie ─────────────────────────

test('le chiffre vrai n’est jamais remplacé par le roulage', () => {
  assert.match(composant, /<span className="rpg-wizard-plate__hp-value">\{pv\}<\/span>/,
    'la valeur vraie reste rendue telle quelle, avec sa classe d’origine');
  assert.match(composant, /\{roule && <span className="rpg-jauge-vie__roule" aria-hidden="true">\{affichee\}<\/span>\}/,
    'le roulage est un calque séparé, décoratif et aria-hidden');
  assert.match(composant, /const roule = affichee !== pv;/,
    'le calque n’existe que pendant le roulage');
  assert.match(composant, /if \(reduit\) \{\s*afficheeRef\.current = valeur;\s*setAffichee\(valeur\);\s*return undefined;\s*\}/,
    'en mouvement réduit, le nombre saute directement à sa valeur');
  assert.match(composant, /return \(\) => window\.cancelAnimationFrame\(frameRef\.current\);/,
    'le roulage s’annule au démontage : aucun état ne survit à la table');
  assert.doesNotMatch(composant, /setInterval/, 'aucune minuterie qui tourne en boucle');
});

test('la plaque garde la structure et les classes attendues par la feuille', () => {
  for (const classe of [
    'rpg-wizard-plate__pv',
    'rpg-wizard-plate__hp-icon--shield',
    'rpg-wizard-plate__hp-icon--heart',
    'rpg-wizard-plate__shield-value',
    'rpg-soin-montant',
  ]) {
    assert.ok(composant.includes(classe), `la plaque réutilise ${classe}`);
  }
  assert.doesNotMatch(composant, /className="rpg-wizard-plate__hp-max"/,
    'le record de PV ne rajoute aucun texte qui élargit le rond');
  assert.match(composant, /data-vie-sens=\{sens\}/, 'la plaque expose son sens de variation');
});

test('le compteur de carte reste un losange chiffré de la feuille du duel', () => {
  assert.match(composant, /className=\{classes\}\s*\n\s*data-compteur=\{type\}/,
    'le losange porte son repère data-compteur');
  assert.match(composant, /`rpg-card__compteur--\$\{type\}`/, 'la couleur du losange suit son type');
  assert.match(composant, /const derniere = \['heures', 'sable', 'durabilite'\]\.includes\(type\) \&\& Number\(valeur\) === 1;/,
    'la dernière unité de tout compteur, y compris la durabilité, est reconnue');
  assert.match(composant, /derniere \? 'is-derniere' : ''/, 'elle reçoit son état de veille');
  assert.match(composant, /<span>\{valeur\}<\/span>/, 'le chiffre du losange reste un simple span');
});

// ── La feuille : le sable, les grains, et le mouvement réduit ──────────────

test('la jauge de sable est pilotée par une variable, pas par une minuterie', () => {
  assert.match(feuille, /\.rpg-jauge-vie__sable\s*\{[^}]*height:\s*calc\(var\(--rpg-jauge-part, 1\) \* 100%\);/s,
    'la hauteur du sable suit la part de vie');
  assert.match(feuille, /\.rpg-jauge-vie__reserve\s*\{[^}]*bottom:\s*calc\(var\(--rpg-jauge-base, 0\) \* 100%\);[^}]*height:\s*calc\(var\(--rpg-jauge-reserve, 0\) \* 100%\);/s,
    'la bande d’or commence au maximum d’origine');
  assert.match(feuille, /\.rpg-jauge-vie__sable\s*\{[^}]*transition:\s*height 420ms/s,
    'le sable coule au lieu de sauter');
  assert.match(feuille, /\.rpg-jauge-vie__nappe\s*\{[^}]*pointer-events:\s*none;/s,
    'la nappe ne capte aucun geste');
});

test('les grains tombent, et la perte se rejoue en deux variantes', () => {
  assert.match(feuille, /@keyframes rpg-vie-grain\s*\{/);
  assert.match(feuille, /\.rpg-jauge-vie\.is-perte--a \.rpg-jauge-vie__nappe \{ animation: rpg-vie-nappe-perte-a/);
  assert.match(feuille, /\.rpg-jauge-vie\.is-perte--b \.rpg-jauge-vie__nappe \{ animation: rpg-vie-nappe-perte-b/);
  assert.match(feuille, /\.rpg-card__compteur\.is-perte--a > span \{ animation: rpg-compteur-chiffre-a/);
  assert.match(feuille, /\.rpg-card__compteur--heures\.is-derniere::after/,
    'la dernière Heure a son liseré qui veille');
  assert.match(feuille, /@keyframes rpg-compteur-veille/);
});

test('en mouvement réduit, l’information reste mais le geste s’arrête', () => {
  assert.match(feuille, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-jauge-vie__sable,[\s\S]*?transition:\s*none;[\s\S]*?\}/,
    'le sable ne coule plus');
  assert.match(feuille, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-jauge-vie__grain \{ display: none; \}/,
    'plus de grains');
  assert.match(feuille, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?animation: none !important;/,
    'plus aucune pulsation ni aucun roulage CSS');
  assert.match(feuille, /\.rpg-jauge-vie\.is-roulage \.rpg-wizard-plate__hp-value \{ visibility: visible; \}/,
    'le chiffre vrai redevient visible : jamais de trou dans la plaque');
});

test('la page du duel emploie les deux animations, sans changer la structure', () => {
  assert.match(page, /import '\.\/rpg-vie-compteurs\.css';/, 'la feuille est chargée par la page du duel');
  assert.match(page, /import \{ CompteurCarte, PlaqueVie \} from '\.\/RpgVieCompteurs\.jsx';/);
  assert.match(page, /<PlaqueVie\n\s*pv=\{duel\.sorcier\.pv\}/, 'la plaque adverse passe par PlaqueVie');
  assert.match(page, /<PlaqueVie\n\s*pv=\{duel\.joueur\.pv\}/, 'la plaque du joueur passe par PlaqueVie');
  assert.match(page, /base=\{RPG_PV_SORCIER_BASE\}/, 'le maximum d’origine du sorcier est transmis');
  assert.match(page, /base=\{RPG_PV_JOUEUR\}/, 'celui du joueur aussi');
  assert.match(page, /<CompteurCarte type="heures" valeur=\{entite\.heures\.restants\} \/>/);
  assert.match(page, /type="durabilite"[\s\S]*?valeur=\{entite\.arme\.durabilite\}/,
    'les compteurs de durabilité de l’arme s’affichent');
  assert.match(page, /<CompteurCarte type="sable" valeur=\{entite\.arme\.compteurs\}/,
    'les compteurs de sable de l’arme s’affichent');
  assert.doesNotMatch(page, /<span className="rpg-wizard-plate__hp-value">\{duel\./,
    'la page ne rend plus les chiffres de vie à la main');
});
