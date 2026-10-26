import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Refonte de la page Jouer — `tests/rpg-mode-cards.test.js`
 *
 * La barre ne porte plus la Conquête : elle reste une carte dans Jouer. Quatre
 * modes y sont des cartes carrées, en quatre colonnes sur PC et deux sur
 * téléphone. « Apprendre à jouer » quitte la grille : c'est un lien texte
 * séparé, avec une petite icône et une flèche. Profil, Paramètres et
 * Messagerie forment un groupe visuellement séparé dans la barre, qui reste
 * plus haute sur PC avec de l'air au-dessus.
 */
const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

const page = lire('../src/games/RpgDuelPage.jsx');
const icones = lire('../src/games/RpgModeIcon.jsx');
const battleCss = lire('../src/games/rpg-battle.css');
const tutorialCss = lire('../src/games/rpg-tutorial.css');

const actions = page.slice(
  page.indexOf('className="rpg-mode-menu__hero-actions"'),
  page.indexOf(") : screen === 'tours' ? ("),
);

test('la barre garde Jouer, mais plus la Conquête ; le sablier reste un raccourci', () => {
  assert.match(page, /<button[^>]*aria-label="Jouer"[\s\S]{0,400}?onChangeScreen\('jouer'\)/,
    'l’onglet Jouer ramène à la page d’accueil');
  assert.doesNotMatch(page, /<button[^>]*aria-label="Histoire"/, 'l’onglet Histoire reste retiré');
  assert.doesNotMatch(page, /<button[^>]*aria-label="Conquête"/,
    'la Conquête n’est plus un onglet de la barre de navigation');
  assert.match(page, /import RpgModeIcon from '\.\/RpgModeIcon\.jsx';/,
    'le composant des grandes icônes est importé');
  assert.match(page, /className="rpg-mode-menu__accueil"/,
    'le bouton d’accueil existe toujours');
  assert.match(page, /aria-label="Accueil — Jouer"/,
    'le bouton d’accueil est nommé pour les lecteurs d’écran');
  assert.match(page, /<RpgModeIcon nom="accueil"/,
    'le bouton d’accueil porte le sablier dessiné');
});

test('quatre cartes carrées, une grande icône dessinée par mode', () => {
  assert.ok(actions.length > 0, 'le bloc d’actions de la page Jouer existe');
  assert.equal((actions.match(/rpg-mode-carte\b/g) ?? []).length, 4,
    'quatre cartes de mode seulement');
  for (const nom of ['histoire', 'en-ligne', 'jouer', 'conquete']) {
    assert.match(actions, new RegExp(`<RpgModeIcon nom="${nom}"`),
      `la carte ${nom} a sa grande icône`);
  }
  assert.match(icones, /\bconquete:\s*\(/, 'le dessin de la Conquête est partagé');
  assert.match(battleCss, /\.rpg-mode-menu__hero-actions > \.rpg-menu-button\s*\{[^}]*aspect-ratio: 1;/s,
    'les cartes sont carrées');
  assert.match(battleCss, /\.rpg-mode-carte__icone\s*\{[^}]*width:\s*clamp\(42px/,
    'l’icône mesure au moins 42 px sur bureau');
  assert.match(icones, /viewBox="0 0 64 64"/,
    'les icônes sont dessinées sur une grille de 64 px');
  assert.doesNotMatch(page, /function IconePorte\(/,
    'les anciennes petites icônes de porte ont été retirées');
  assert.doesNotMatch(actions, /rpg-mode-menu__secondary-actions/,
    'les quatre cartes restent des enfants directs de la grille');
});

test('« Jouer » garde son action et « Conquête » est la quatrième carte', () => {
  assert.match(actions, />Jouer</, 'la carte s’appelle Jouer');
  assert.doesNotMatch(actions, />Partie rapide</, 'l’ancien libellé a disparu des cartes');
  assert.match(actions, /rpg-menu-button--partie-rapide[\s\S]{0,400}?setPartieRapideOuverte\(true\)/,
    'la carte ouvre toujours le choix du deck contre l’ordinateur');
  assert.match(actions, /rpg-menu-button--histoire/, 'le Mode histoire reste une carte');
  assert.match(actions, /rpg-menu-button--en-ligne/, 'le Duel en ligne reste une carte');
  const indexJouer = actions.indexOf('rpg-menu-button--partie-rapide');
  const indexConquete = actions.indexOf('rpg-menu-button--conquete');
  assert.ok(indexJouer > 0 && indexConquete > indexJouer,
    'la Conquête arrive après Jouer : c’est la quatrième carte');
  assert.match(actions, /rpg-menu-button--conquete[\s\S]{0,400}?onChangeScreen\('tours'\)/,
    'la carte Conquête ouvre les Tours de Bab El');
  assert.match(actions, />Conquête</, 'la carte porte son nom');
});

test('« Apprendre à jouer » est un lien séparé, avec petite icône et flèche', () => {
  const fermetureGrille = actions.indexOf('</div>');
  const indexLien = actions.indexOf('rpg-mode-menu__apprendre');
  assert.ok(fermetureGrille > 0 && indexLien > fermetureGrille,
    'le lien est placé sous la grille des quatre cartes, pas dedans');
  assert.match(actions, /className="rpg-mode-menu__apprendre rpg-menu-button--tutorial"/,
    'le tutoriel n’est plus une carte carrée');
  assert.match(actions, />Apprendre à jouer</, 'le lien garde son libellé');
  assert.match(actions, /<RpgModeIcon nom="tutoriel" className="rpg-mode-menu__apprendre-icone" \/>/,
    'le lien porte la petite icône du tutoriel');
  assert.match(actions, /rpg-mode-menu__apprendre-arrow[\s\S]{0,80}?↗/,
    'une flèche termine le lien');
  assert.match(actions, /rpg-mode-menu__apprendre[\s\S]{0,400}?onChangeScreen\('tutoriels'\)/,
    'le lien ouvre toujours les leçons guidées');
  assert.match(tutorialCss, /\.rpg-mode-menu__apprendre-icone\s*\{[^}]*width: 18px;\s*height: 18px;/s,
    'l’icône du lien est petite');
});

test('quatre colonnes sur PC, deux sur téléphone', () => {
  assert.match(tutorialCss, /\.rpg-mode-menu__hero-actions\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/s,
    'la grille de base est à quatre colonnes');
  assert.match(tutorialCss, /@media \(max-width: 620px\)\s*\{\s*\.rpg-mode-menu__hero-actions\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s,
    'le téléphone repasse à deux colonnes');
  assert.doesNotMatch(tutorialCss, /:nth-child\(5\)/,
    'plus de cinquième carte à centrer sur le téléphone');
});

test('Profil, Paramètres et Messagerie sont séparés ; la barre PC reste haute', () => {
  assert.equal((page.match(/rpg-mode-menu__onglet--secondaire\b/g) ?? []).length, 3,
    'trois onglets portent la classe du groupe secondaire');
  assert.equal((page.match(/rpg-mode-menu__onglet--groupe-secondaire\b/g) ?? []).length, 1,
    'un seul onglet ouvre le groupe secondaire');
  const navPc = battleCss.slice(battleCss.indexOf('@media (min-width: 821px)'));
  assert.ok(navPc.length > 0, 'une règle dédiée au PC existe');
  assert.match(navPc, /\.rpg-mode-menu__content \{ padding-top: 12px; \}/,
    'un peu d’air est laissé au-dessus de la barre');
  assert.match(navPc, /\.rpg-mode-menu__header \{[^}]*top: 12px;[^}]*min-height: 104px;/s,
    'la barre sticky garde cet espace et gagne en hauteur');
  assert.match(navPc, /\.rpg-mode-menu__switch \{[^}]*order: 3;[^}]*width: 100%;[^}]*min-height: 56px;/s,
    'les sept onglets prennent leur propre rangée pleine largeur');
  assert.match(navPc, /\.rpg-mode-menu__switch button\.rpg-mode-menu__onglet--groupe-secondaire\s*\{[^}]*margin-left: auto;[^}]*box-shadow: -1px 0 0/s,
    'le groupe secondaire est poussé à droite derrière un filet');
  assert.match(battleCss, /ONGLETS DES MODES — TÉLÉPHONE[\s\S]*?\.rpg-mode-menu__header \.rpg-mode-menu__switch button\.rpg-mode-menu__onglet--secondaire\s*\{[^}]*background: rgba\(255, 255, 255, \.035\);/s,
    'la séparation reste visible sur téléphone, avec un léger fond');
  assert.match(navPc, /\.rpg-mode-menu__switch button,[\s\S]{0,200}?font-size: clamp\(13px, 1\.15vw, 16px\);/,
    'les libellés des onglets grandissent sur PC');
});
