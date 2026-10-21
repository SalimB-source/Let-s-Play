import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/**
 * L'accueil du Sablier et le salon en ligne — la mise en page, sans navigateur.
 * ---------------------------------------------------------------------------
 * Deux écrans ont été réarrangés :
 *
 *   - **onglet Jouer** : les quatre portes forment une grille 2 × 2 (le récit et
 *     le duel en ligne en tête, la partie rapide et le tutoriel en dessous), et
 *     sur téléphone les sept onglets passent sur deux rangées au lieu de
 *     défiler hors champ ;
 *   - **duel en ligne** : le salon vit dans le même cadre plein écran que le
 *     duel (barre de retour vers le hub, key art de Bab El), au lieu de se
 *     glisser sous la barre fixe du site.
 *
 * Les règles sont lues dans les feuilles réelles et appliquées par jsdom à un
 * fragment du même balisage que le composant : si une règle disparaît ou
 * change de valeur, le check tombe. Lancer `npm run check:rpg-accueil`.
 */

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const page = read('../src/games/RpgDuelPage.jsx');
const salon = read('../src/games/RpgPvpSalon.jsx');
const battleCss = read('../src/games/rpg-battle.css');
const pvpCss = read('../src/games/rpg-pvp.css');
const tutorialCss = read('../src/games/rpg-tutorial.css');

/* ----------------------------- le balisage ------------------------------- */

// Les quatre portes, dans l'ordre : récit, duel en ligne, puis les deux
// raccourcis groupés.
const actions = page.slice(
  page.indexOf('className="rpg-mode-menu__hero-actions"'),
  page.indexOf('className="rpg-flux-menu"'),
);
assert.ok(actions.length > 0, 'l’onglet Jouer garde son bloc d’actions');
const ordre = [
  ['Mode histoire', actions.indexOf('rpg-menu-button--histoire')],
  ['Duel en ligne', actions.indexOf('rpg-menu-button--en-ligne')],
  ['les raccourcis', actions.indexOf('rpg-mode-menu__secondary-actions')],
  ['Partie rapide', actions.indexOf('rpg-menu-button--partie-rapide')],
  ['Apprendre à jouer', actions.indexOf('rpg-menu-button--tutorial')],
];
for (const [nom, index] of ordre) assert.ok(index > 0, `« ${nom} » est présent dans les portes`);
assert.ok(
  ordre[0][1] < ordre[1][1] && ordre[1][1] < ordre[2][1],
  'le duel en ligne monte au même rang que le récit, devant les raccourcis',
);
assert.ok(
  ordre[2][1] < ordre[3][1] && ordre[3][1] < ordre[4][1],
  'les deux raccourcis restent groupés, dans l’ordre partie rapide puis tutoriel',
);
assert.match(
  actions,
  /<a className="rpg-menu-button rpg-menu-button--en-ligne" href=\{`\$\{import\.meta\.env\.BASE_URL\}jeu\/sablier-de-bab-el\/defi`\}/,
  'le duel en ligne reste un lien réel vers le salon (partageable, ouvert dans un nouvel onglet)',
);
assert.match(actions, /rpg-menu-button__live/, 'la pastille « en ligne » signale le mode vivant');
assert.match(actions, /<span className="sr-only">\(en ligne\)<\/span>/, 'la pastille est aussi lisible par un lecteur d’écran');

// Le duel en ligne vit dans le cadre du jeu, avec un retour vers le hub.
assert.match(salon, /function Cadre\(/, 'le salon se rend dans un cadre propre');
assert.match(
  salon,
  /className=\{`rpg-pvp-page[^`]*`\}[\s\S]{0,40}backgroundImage: FOND_EN_LIGNE/,
  'le cadre porte le key art de Bab El',
);
assert.match(
  salon,
  /<Link[\s\S]{0,120}to=\{retour\?\.href \?\? '\/jeu\/sablier-de-bab-el'\}/,
  'la barre du cadre ramène au hub du Sablier sans recharger la page',
);
assert.match(salon, /body\.classList\.add\('rpg-pvp-lock'\)/, 'la page du site ne défile pas derrière le salon');
assert.doesNotMatch(
  salon,
  /<main className="rpg-pvp rpg-pvp--duel"[\s\S]{0,40}<Cadre/,
  'le plateau du duel garde son propre cadre (il ne s’emboîte pas deux fois)',
);

/* ------------------------------ les styles ------------------------------- */

const dom = new JSDOM(`<!doctype html><html><head><style>${battleCss}\n${tutorialCss}\n${pvpCss}</style></head><body>
  <nav class="nav"></nav>
  <section class="rpg-mode-menu rpg-mode-menu--jouer">
    <div class="rpg-mode-menu__content">
      <header class="rpg-mode-menu__header">
        <div class="rpg-mode-menu__brand"><h1>Le <span>Sablier</span></h1></div>
        <button type="button" class="rpg-mode-menu__fullscreen">⛶</button>
        <nav class="rpg-mode-menu__switch">
          <button type="button" class="is-active">Jouer</button>
          <button type="button">Histoire</button>
          <button type="button">Jeu Solo</button>
          <button type="button">Deck</button>
          <button type="button" class="rpg-mode-menu__souk">Souk</button>
          <button type="button">Catalogue</button>
          <button type="button">Paramètres</button>
        </nav>
      </header>
      <main class="rpg-mode-menu__play">
        <section class="rpg-mode-menu__hero"><div class="rpg-mode-menu__hero-copy">
          <div class="rpg-mode-menu__hero-actions">
            <button type="button" class="rpg-menu-button rpg-menu-button--primary rpg-menu-button--histoire">
              <span class="rpg-menu-button__text"><strong>Mode histoire</strong></span>
            </button>
            <a class="rpg-menu-button rpg-menu-button--en-ligne" href="#">
              <span class="rpg-menu-button__icon"><svg viewBox="0 0 24 24"><path d="M6.5 21V3.5"/></svg></span>
              <span class="rpg-menu-button__text"><strong>Duel en ligne<span class="rpg-menu-button__live"></span><span class="sr-only">(en ligne)</span></strong></span>
            </a>
            <div class="rpg-mode-menu__secondary-actions">
              <button type="button" class="rpg-menu-button rpg-menu-button--partie-rapide">
                <span class="rpg-menu-button__icon"><svg viewBox="0 0 24 24"><path d="M12 2 5 13h5l-1 9 8-11h-5l1-9Z"/></svg></span>
                <span class="rpg-menu-button__text"><strong>Partie rapide</strong></span>
              </button>
              <button type="button" class="rpg-menu-button rpg-menu-button--tutorial">
                <span class="rpg-menu-button__icon"><svg viewBox="0 0 24 24"><path d="M7.5 3h9"/></svg></span>
                <span class="rpg-menu-button__text"><strong>Apprendre à jouer</strong></span>
              </button>
            </div>
          </div>
        </div></section>
      </main>
    </div>
  </section>
  <div class="rpg-pvp-page" style="background-image:none">
    <header class="rpg-pvp-page__barre">
      <a class="rpg-pvp-page__retour" href="#">← Le Sablier</a>
      <span class="rpg-pvp-page__statut"><span class="rpg-pvp-page__point"></span>Duel en ligne</span>
    </header>
    <div class="rpg-pvp-page__contenu"><main class="rpg-pvp"></main></div>
  </div>
</body></html>`, { pretendToBeVisual: true });

const style = (selector) => dom.window.getComputedStyle(dom.window.document.querySelector(selector));

try {
  const actionsGrid = style('.rpg-mode-menu__hero-actions');
  assert.equal(actionsGrid.display, 'grid', 'les quatre portes sont une grille');
  assert.equal(actionsGrid.gridTemplateColumns, 'repeat(2, minmax(0, 1fr))',
    'deux colonnes égales sur ordinateur : plus de bouton orphelin sous la paire');
  const raccourcis = style('.rpg-mode-menu__secondary-actions');
  assert.equal(raccourcis.display, 'grid', 'les raccourcis restent une grille');
  assert.equal(raccourcis.gridColumn, '1 / -1', 'les raccourcis occupent toute la largeur des quatre portes');

  const enLigne = style('.rpg-menu-button--en-ligne');
  assert.match(enLigne.backgroundImage, /linear-gradient/, 'le duel en ligne prend le laiton du jeu');
  assert.equal(enLigne.color, 'rgb(36, 26, 6)', 'son texte est sombre, lisible sur l’or');
  assert.equal(style('.rpg-menu-button--en-ligne .rpg-menu-button__icon').width, '36px',
    'l’icône du duel en ligne est un médaillon de 36 px');
  assert.notEqual(style('.rpg-menu-button--partie-rapide').backgroundImage, enLigne.backgroundImage,
    'la partie rapide ne copie pas l’aplat du duel en ligne');
  assert.equal(style('.rpg-menu-button__live').width, '7px', 'la pastille « en ligne » est un point de 7 px');

  // Le salon : plein écran par-dessus la barre du site, avec son liseré.
  const cadre = style('.rpg-pvp-page');
  assert.equal(cadre.position, 'fixed', 'le salon prend la couche plein écran du jeu');
  assert.equal(cadre.zIndex, '1500', 'il passe par-dessus la barre du site (z-index 1000)');
  assert.equal(cadre.overflowY, 'auto', 'le salon défile dans son cadre');
  assert.equal(style('.rpg-pvp-page__barre').position, 'sticky', 'la barre de retour reste visible');
  assert.match(pvpCss, /body\.rpg-pvp-lock \{ overflow: hidden; \}/,
    'le verrou de défilement de la page est posé par une classe, que React ajoute au montage');
} finally {
  dom.window.close();
}

/* --------------------- téléphone : deux rangées d'onglets ----------------- */

const tel = new JSDOM(`<!doctype html><html><head><style>${battleCss}\n${tutorialCss}</style></head><body>
  <section class="rpg-mode-menu"><div class="rpg-mode-menu__content">
    <header class="rpg-mode-menu__header">
      <div class="rpg-mode-menu__brand"><h1>Le Sablier</h1></div>
      <nav class="rpg-mode-menu__switch">
        <button type="button">Jouer</button><button type="button">Histoire</button>
        <button type="button">Jeu Solo</button><button type="button">Deck</button>
        <button type="button" class="rpg-mode-menu__souk">Souk</button>
        <button type="button">Catalogue</button><button type="button">Paramètres</button>
      </nav>
    </header>
    <main class="rpg-mode-menu__play"><section class="rpg-mode-menu__hero">
      <div class="rpg-mode-menu__hero-copy">
        <div class="rpg-mode-menu__hero-actions">
          <button type="button" class="rpg-menu-button">Histoire</button>
          <a class="rpg-menu-button rpg-menu-button--en-ligne" href="#">Duel</a>
          <div class="rpg-mode-menu__secondary-actions"><button type="button" class="rpg-menu-button">Rapide</button><button type="button" class="rpg-menu-button">Tutoriel</button></div>
        </div>
      </div></section></main>
  </div></section>
</body></html>`, { pretendToBeVisual: true });

try {
  // jsdom n'évalue pas les media queries : on vérifie la règle elle-même, ses
  // bornes et ses déclarations, plutôt que le style calculé d'un écran large.
  assert.match(
    battleCss,
    /@media \(max-width: 700px\) \{\s*\.rpg-mode-menu__switch \{\s*display: flex;\s*flex-wrap: wrap;/,
    'au téléphone, la barre des sept onglets passe en deux rangées (flex-wrap)',
  );
  assert.match(
    battleCss,
    /\.rpg-mode-menu__switch button,\s*\.rpg-mode-menu__switch button\.rpg-mode-menu__souk \{\s*flex: 1 1 calc\(25% - 6px\);/,
    'quatre onglets par rangée, à parts égales',
  );
  assert.match(
    tutorialCss,
    /@media \(max-width: 620px\) \{\s*\.rpg-mode-menu__hero-actions \{ grid-template-columns: minmax\(0, 1fr\); \}/,
    'sur téléphone, les quatre portes s’empilent en une colonne',
  );
} finally {
  tel.window.close();
}

console.log(
  'check:rpg-accueil ✓ — l’onglet Jouer range ses quatre portes en grille (récit et duel en ligne en tête), '
  + 'la barre des sept onglets passe sur deux rangées au téléphone, et le salon en ligne vit dans le cadre plein écran du jeu.',
);
process.exit(0);
