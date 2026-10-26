import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/**
 * L'accueil du Sablier et le salon en ligne — la mise en page, sans navigateur.
 * ---------------------------------------------------------------------------
 * Deux écrans ont été réarrangés :
 *
 *   - **page Jouer** : l'onglet « Jouer » est de retour dans la barre ; le
 *     sablier de la marque reste un raccourci d'accueil. Les quatre modes sont
 *     des cartes carrées, en quatre colonnes sur PC et deux sur téléphone, avec
 *     une grande icône. « Conquête » est la quatrième carte, la barre ne la
 *     porte plus comme onglet. « Apprendre à jouer » quitte la grille : c'est
 *     un lien texte séparé, avec une petite icône et une flèche. Profil,
 *     Paramètres et Messagerie forment un groupe visuellement séparé. Sur PC,
 *     la barre de navigation prend sa propre rangée, plus haute, avec un peu
 *     d'air au-dessus ; sur téléphone, elle se réduit à ses icônes, côte à côte
 *     sur une seule rangée à parts égales (les libellés restent au bureau et
 *     dans le DOM, l'`aria-label` garde le nom audible) ;
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
const soukCss = read('../src/games/rpg-souk.css');
const storyCss = read('../src/games/rpg-story.css');
const deckCss = read('../src/games/rpg-deckbox.css');
const deckBox = read('../src/games/RpgDeckBox.jsx');
const cardArt = read('../src/games/rpgCardArt.js');

/* ----------------------------- le balisage ------------------------------- */

// Les quatre cartes de l'accueil, dans l'ordre : récit, duel en ligne, Jouer,
// puis Conquête. « Apprendre à jouer » est un lien séparé, sous la grille.
const actions = page.slice(
  page.indexOf('className="rpg-mode-menu__hero-actions"'),
  page.indexOf(") : screen === 'tours' ? ("),
);
assert.ok(actions.length > 0, 'la page Jouer garde son bloc de cartes');
const ordre = [
  ['Mode histoire', actions.indexOf('rpg-menu-button--histoire')],
  ['Duel en ligne', actions.indexOf('rpg-menu-button--en-ligne')],
  ['Jouer', actions.indexOf('rpg-menu-button--partie-rapide')],
  ['Conquête', actions.indexOf('rpg-menu-button--conquete')],
];
for (const [nom, index] of ordre) assert.ok(index > 0, `« ${nom} » est présent dans les cartes`);
assert.ok(
  ordre[0][1] < ordre[1][1] && ordre[1][1] < ordre[2][1]
    && ordre[2][1] < ordre[3][1],
  'les quatre cartes suivent l’ordre récit, duel, Jouer, Conquête',
);
assert.equal((actions.match(/rpg-mode-carte\b/g) ?? []).length, 4,
  'quatre cartes de mode seulement : le tutoriel n’est plus une carte');
assert.match(actions, />Jouer</, 'la carte « Jouer » a remplacé « Partie rapide »');
assert.doesNotMatch(actions, />Partie rapide</, 'l’ancien libell « Partie rapide » a disparu');
assert.match(actions, />Conquête</, 'la quatrième carte s’appelle Conquête');
assert.match(actions, /rpg-menu-button--conquete[\s\S]{0,400}?onChangeScreen\('tours'\)/,
  'la carte Conquête ouvre les Tours de Bab El');
for (const nom of ['histoire', 'en-ligne', 'jouer', 'conquete']) {
  assert.match(actions, new RegExp(`<RpgModeIcon nom="${nom}"`),
    `la carte ${nom} porte sa grande icône`);
}
const fermetureGrille = actions.indexOf('</div>');
const indexApprendre = actions.indexOf('rpg-mode-menu__apprendre');
assert.ok(fermetureGrille > 0 && indexApprendre > fermetureGrille,
  '« Apprendre à jouer » est sous la grille, pas dedans');
assert.match(actions, /className="rpg-mode-menu__apprendre rpg-menu-button--tutorial"/,
  'le tutoriel est un lien texte séparé');
assert.match(actions, /<RpgModeIcon nom="tutoriel" className="rpg-mode-menu__apprendre-icone" \/>/,
  'le lien porte une petite icône');
assert.match(actions, /rpg-mode-menu__apprendre-arrow[\s\S]{0,80}?↗/,
  'le lien se termine par une flèche');
assert.match(actions, />Apprendre à jouer</, 'le lien garde son libellé');
assert.match(actions, /rpg-mode-menu__apprendre[\s\S]{0,400}?onChangeScreen\('tutoriels'\)/,
  'le lien ouvre les leçons guidées');
assert.match(
  actions,
  /<a className="[^"]*rpg-menu-button--en-ligne" href=\{`\$\{import\.meta\.env\.BASE_URL\}jeu\/sablier-de-bab-el\/defi`\}/,
  'le duel en ligne reste un lien réel vers le salon (partageable, ouvert dans un nouvel onglet)',
);
assert.match(actions, /rpg-menu-button__live/, 'la pastille « en ligne » signale le mode vivant');
assert.match(actions, /<span className="sr-only">\(en ligne\)<\/span>/, 'la pastille est aussi lisible par un lecteur d’écran');
assert.match(page, /import RpgModeIcon from '\.\/RpgModeIcon\.jsx';/,
  'les grandes icônes viennent du composant partagé');
assert.match(page, /rpg-mode-menu__accueil/, 'le sablier de la marque sert de bouton d’accueil');
assert.match(page, /<button[^>]*aria-label="Jouer"/, 'l’onglet Jouer est de retour dans la barre');
assert.doesNotMatch(page, /<button[^>]*aria-label="Histoire"/, 'l’onglet Histoire reste retiré de la barre');
assert.doesNotMatch(page, /<button[^>]*aria-label="Conquête"/, 'la Conquête a quitté la barre de navigation');
assert.equal((page.match(/rpg-mode-menu__onglet--secondaire\b/g) ?? []).length, 3,
  'Profil, Paramètres et Messagerie portent la classe du groupe secondaire');
assert.equal((page.match(/rpg-mode-menu__onglet--groupe-secondaire\b/g) ?? []).length, 1,
  'un seul onglet ouvre visuellement ce groupe');
assert.doesNotMatch(page, /rpg-mode-menu__secondary-actions/,
  'les quatre cartes sont des enfants directs de la grille');

// L'encadré sous les quatre portes racontait l'histoire de Bab El, à la place
// de l'ancien rappel des règles : le bloc « L'histoire · Bab El » est parti au
// lancement du mode Histoire, et le récit mot pour mot vit dans `RpgStoryBabEl`
// (monté par l'onglet Histoire avant la campagne).
const storyBabEl = read('../src/games/RpgStoryBabEl.jsx');
const presentation = storyBabEl;
for (const repere of ['Bab El', 'Astrolabe', 'Chambre des Heures', 'Salem', 'douze survivants', 'Yamina']) {
  assert.ok(presentation.includes(repere), `la présentation de l’histoire mentionne « ${repere} »`);
}
assert.doesNotMatch(presentation, /Le mana remplace les terrains/i,
  'l’ancien encadré des règles a laissé sa place à la présentation de l’histoire');

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

// Le jeu couvre l'écran : une sortie vers les jeux vit dans la barre du Sablier.
assert.match(
  page,
  /className="rpg-mode-menu__quitter"[\s\S]{0,200}href=\{`\$\{import\.meta\.env\.BASE_URL\}jeu`\}/,
  'la barre des onglets porte une sortie vers les jeux (le jeu masque le menu du site)',
);
assert.match(
  page,
  /Sélectionner\{'\\u00a0'\}/,
  'la phrase du Deck pose ses espaces insécables en JSX, sans les afficher en clair',
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
          <button type="button">Jouer</button>
          <button type="button">Deck</button>
          <button type="button" class="rpg-mode-menu__souk">Souk</button>
          <button type="button">Catalogue</button>
          <button type="button" class="rpg-mode-menu__onglet--secondaire rpg-mode-menu__onglet--groupe-secondaire">Profil</button>
          <button type="button" class="rpg-mode-menu__onglet--secondaire">Paramètres</button>
          <button type="button" class="rpg-mode-menu__messagerie rpg-mode-menu__onglet--secondaire"><span class="rpg-mode-menu__onglet-libelle">Messagerie</span></button>
        </nav>
      </header>
      <main class="rpg-mode-menu__play">
        <section class="rpg-mode-menu__hero"><div class="rpg-mode-menu__hero-copy">
          <div class="rpg-mode-menu__hero-actions">
            <button type="button" class="rpg-mode-carte rpg-menu-button rpg-menu-button--primary rpg-menu-button--histoire">
              <svg class="rpg-mode-icone rpg-mode-carte__icone"></svg>
              <span class="rpg-mode-carte__texte rpg-menu-button__text"><strong>Mode histoire</strong></span>
            </button>
            <a class="rpg-mode-carte rpg-menu-button rpg-menu-button--en-ligne" href="#">
              <svg class="rpg-mode-icone rpg-mode-carte__icone"></svg>
              <span class="rpg-mode-carte__texte rpg-menu-button__text"><strong>Duel en ligne<span class="rpg-menu-button__live"></span><span class="sr-only">(en ligne)</span></strong></span>
            </a>
            <button type="button" class="rpg-mode-carte rpg-menu-button rpg-menu-button--partie-rapide">
              <svg class="rpg-mode-icone rpg-mode-carte__icone"></svg>
              <span class="rpg-mode-carte__texte rpg-menu-button__text"><strong>Jouer</strong></span>
            </button>
            <button type="button" class="rpg-mode-carte rpg-menu-button rpg-menu-button--conquete">
              <svg class="rpg-mode-icone rpg-mode-carte__icone"></svg>
              <span class="rpg-mode-carte__texte rpg-menu-button__text"><strong>Conquête</strong></span>
            </button>
          </div>
          <button type="button" class="rpg-mode-menu__apprendre rpg-menu-button--tutorial">
            <svg class="rpg-mode-icone rpg-mode-menu__apprendre-icone"></svg>
            <span>Apprendre à jouer</span>
            <small>leçons guidées</small>
            <span class="rpg-mode-menu__apprendre-arrow">↗</span>
          </button>
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
  assert.equal(actionsGrid.gridTemplateColumns, 'repeat(4, minmax(0, 1fr))',
    'quatre colonnes égales sur ordinateur');
  assert.equal(
    dom.window.document.querySelectorAll('.rpg-mode-menu__hero-actions > .rpg-menu-button').length,
    4,
    'les quatre cartes sont des enfants directs de la grille',
  );
  assert.equal(style('.rpg-mode-menu__apprendre').display, 'inline-flex',
    '« Apprendre à jouer » est un lien en ligne, hors de la grille');
  assert.equal(style('.rpg-mode-menu__apprendre-icone').width, '18px',
    'le lien porte une petite icône de 18 px');

  const enLigne = style('.rpg-menu-button--en-ligne');
  assert.match(enLigne.backgroundImage, /linear-gradient/, 'le duel en ligne prend le laiton du jeu');
  assert.equal(enLigne.color, 'rgb(36, 26, 6)', 'son texte est sombre, lisible sur l’or');
  assert.match(battleCss, /\.rpg-mode-carte__icone\s*\{[^}]*width:\s*clamp\(42px/,
    'chaque carte porte une grande icône (42 px au minimum)');
  assert.match(battleCss, /\.rpg-mode-menu__hero-actions > \.rpg-menu-button\s*\{[^}]*aspect-ratio: 1;/s,
    'les quatre cartes sont carrées');
  assert.notEqual(style('.rpg-menu-button--partie-rapide').backgroundImage, enLigne.backgroundImage,
    'la carte Jouer ne copie pas l’aplat du duel en ligne');
  assert.match(style('.rpg-menu-button--conquete').backgroundImage, /linear-gradient/,
    'la carte Conquête a sa propre identité visuelle');
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

/* --------------------- téléphone : icônes seules, côte à côte ----------------- */

const tel = new JSDOM(`<!doctype html><html><head><style>${battleCss}\n${tutorialCss}</style></head><body>
  <section class="rpg-mode-menu"><div class="rpg-mode-menu__content">
    <header class="rpg-mode-menu__header">
      <div class="rpg-mode-menu__brand"><h1>Le Sablier</h1></div>
      <nav class="rpg-mode-menu__switch">
        <button type="button">Jouer</button><button type="button">Deck</button>
        <button type="button" class="rpg-mode-menu__souk">Souk</button>
        <button type="button">Catalogue</button>
        <button type="button" class="rpg-mode-menu__onglet--secondaire rpg-mode-menu__onglet--groupe-secondaire">Profil</button>
        <button type="button" class="rpg-mode-menu__onglet--secondaire">Paramètres</button>
        <button type="button" class="rpg-mode-menu__messagerie rpg-mode-menu__onglet--secondaire"><span class="rpg-mode-menu__onglet-libelle">Messagerie</span></button>
      </nav>
    </header>
    <main class="rpg-mode-menu__play"><section class="rpg-mode-menu__hero">
      <div class="rpg-mode-menu__hero-copy">
        <div class="rpg-mode-menu__hero-actions">
          <button type="button" class="rpg-mode-carte rpg-menu-button">Histoire</button>
          <a class="rpg-mode-carte rpg-menu-button rpg-menu-button--en-ligne" href="#">Duel</a>
          <button type="button" class="rpg-mode-carte rpg-menu-button">Jouer</button>
          <button type="button" class="rpg-mode-carte rpg-menu-button">Conquête</button>
        </div>
        <button type="button" class="rpg-mode-menu__apprendre rpg-menu-button--tutorial">
          <svg class="rpg-mode-icone rpg-mode-menu__apprendre-icone"></svg>
          <span>Apprendre à jouer</span>
          <span class="rpg-mode-menu__apprendre-arrow">↗</span>
        </button>
      </div></section></main>
  </div></section>
</body></html>`, { pretendToBeVisual: true });

try {
  // jsdom n'évalue pas les media queries : on vérifie la règle elle-même, ses
  // bornes et ses déclarations, plutôt que le style calculé d'un écran large.
  // Sur téléphone, la barre des modes ne garde que ses icônes : les libellés
  // partent, les icônes grandissent, et les sept onglets se rangent côte à côte
  // sur une seule rangée à parts égales.
  assert.match(
    battleCss,
    /@media \(max-width: 820px\), \(hover:none\) and \(pointer:coarse\) and \(max-device-width:600px\) \{[\s\S]{0,700}?\.rpg-mode-menu__header \.rpg-mode-menu__switch \{[\s\S]{0,300}?flex-wrap: nowrap;/,
    'sur téléphone, la barre des onglets reste sur une seule rangée (côte à côte)',
  );
  assert.match(
    battleCss,
    /\.rpg-mode-menu__header \.rpg-mode-menu__switch button,[\s\S]{0,400}?flex: 1 1 0;/,
    'les onglets se partagent la barre à parts égales',
  );
  assert.match(
    battleCss,
    /\.rpg-mode-menu__header \.rpg-mode-menu__switch button span\.rpg-mode-menu__onglet-libelle,[\s\S]{0,500}?display: none;/,
    'sur téléphone, les libellés des onglets disparaissent : seules les icônes restent',
  );
  assert.match(
    battleCss,
    /\.rpg-mode-menu__content \{ padding-top: 12px; \}/,
    'un peu d’air en haut laisse respirer la barre de navigation avant le bord de l’écran',
  );
  assert.match(
    battleCss,
    /@media \(min-width: 701px\) and \(max-width: 1100px\) \{[\s\S]{0,700}?\.rpg-mode-menu__switch \{[\s\S]{0,500}?flex-wrap: wrap;/,
    'en paysage et sur petite tablette, la barre d’onglets passe à la ligne au lieu de couper le dernier onglet',
  );
  assert.match(
    battleCss,
    /@media \(min-width: 701px\) and \(max-width: 1100px\) \{[\s\S]{0,700}?\.rpg-mode-menu__switch button,\s*\.rpg-mode-menu__switch button\.rpg-mode-menu__souk \{\s*flex: 1 1 auto;/,
    'les onglets de cette barre se partagent la place et se replient au lieu de déborder',
  );
  assert.match(
    tutorialCss,
    /@media \(max-width: 620px\)\s*\{\s*\.rpg-mode-menu__hero-actions\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s,
    'sur téléphone, les quatre cartes repassent en deux colonnes',
  );
  assert.doesNotMatch(
    tutorialCss,
    /:nth-child\(5\)/,
    'plus de cinquième carte à centrer : le tutoriel est un lien séparé',
  );
  assert.match(
    battleCss,
    /\.rpg-mode-menu__hero-actions > \.rpg-menu-button\s*\{[^}]*aspect-ratio: 1;/s,
    'le carré des cartes est porté par la feuille de combat',
  );

  // PC : la barre de navigation prend sa propre rangée, plus haute, avec un
  // espace au-dessus du header sticky.
  const navPc = battleCss.slice(battleCss.indexOf('@media (min-width: 821px)'));
  assert.ok(navPc.length > 0, 'une règle dédiée au PC existe');
  assert.match(navPc, /\.rpg-mode-menu__content \{ padding-top: 12px; \}/,
    'le PC laisse aussi de l’air au-dessus de la barre');
  assert.match(navPc, /\.rpg-mode-menu__header \{[^}]*min-height: 104px;/s,
    'la barre PC est plus haute');
  assert.match(navPc, /\.rpg-mode-menu__switch \{[^}]*order: 3;[^}]*width: 100%;/s,
    'les sept onglets prennent une rangée pleine largeur');
  assert.match(navPc, /\.rpg-mode-menu__switch button\.rpg-mode-menu__onglet--groupe-secondaire\s*\{[^}]*margin-left: auto;[^}]*box-shadow: -1px 0 0/s,
    'le groupe Profil / Paramètres / Messagerie est séparé par un filet sur PC');
  assert.match(battleCss, /ONGLETS DES MODES — TÉLÉPHONE[\s\S]*?\.rpg-mode-menu__header \.rpg-mode-menu__switch button\.rpg-mode-menu__onglet--secondaire\s*\{[^}]*background: rgba\(255, 255, 255, \.035\);/s,
    'la séparation reste visible sur téléphone');

  // Sur mobile en mode vertical, `.rpg-mode-menu__play:not(.rpg-mode-menu__play--full)`
  // (spécificité 0,2,0) doit repasser à une seule colonne après la règle 2 colonnes
  // du bureau — sinon la colonne de droite (280 px) écrase le héros de l'onglet Jouer.
  const derniereGrilleDeuxColonnes = battleCss.lastIndexOf('minmax(0, 1.8fr) minmax(280px, .9fr)');
  const repliPortrait = battleCss.indexOf(
    '.rpg-mode-menu__play:not(.rpg-mode-menu__play--full)',
    derniereGrilleDeuxColonnes,
  );
  assert.ok(
    derniereGrilleDeuxColonnes > 0 && repliPortrait > derniereGrilleDeuxColonnes,
    'la surcharge mobile/portrait reprend la même spécificité `:not(.rpg-mode-menu__play--full)` après la grille bureau',
  );
  assert.match(
    battleCss.slice(repliPortrait, repliPortrait + 220),
    /grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    'en mode vertical sur mobile, l’onglet Jouer passe réellement sur une seule colonne pleine largeur',
  );
} finally {
  tel.window.close();
}

/* ----------------- le cadre plein écran des autres onglets ------------ */

// Une seule scène : l'artwork se tamise derrière le contenu de tous les onglets
// sauf « Jouer », qui reste le tableau de bord d'entrée.
assert.match(
  battleCss,
  /\.rpg-mode-menu:not\(\.rpg-mode-menu--jouer\)::after \{\s*content: '';\s*position: fixed;\s*inset: 0;\s*z-index: -1;/,
  'les onglets autres que Jouer tamisent l’artwork derrière leur contenu',
);

// La même gouttière partout (sauf Decks qui s'étale plein large) : chaque écran garde sa colonne, pas sa marge.
const regleGouttiere = battleCss.match(/\.rpg-mode-menu--histoire \.rpg-story,[\s\S]*?\n\}/);
assert.ok(regleGouttiere, 'la gouttière des onglets est posée par une règle commune');
for (const ecran of [
  'rpg-mode-menu--histoire .rpg-story',
  'rpg-mode-menu--tours .rpg-story',
  'rpg-mode-menu--catalogue .rpg-card-catalogue',
  'rpg-mode-menu--parametres .rpg-settings',
  'rpg-mode-menu--souk .rpg-souk',
]) {
  assert.ok(regleGouttiere[0].includes(ecran), `l’onglet ${ecran.split('--')[1].split(' ')[0]} prend la gouttière commune`);
}
assert.match(battleCss, /\.rpg-mode-menu--decks \.rpg-deck-catalog \{/, 'l’onglet decks prend le plein large');
assert.match(
  regleGouttiere[0],
  /padding:\s*clamp\(14px, 2\.1vw, 26px\)\s*clamp\(14px, 3\.8vw, 56px\)\s*clamp\(24px, 4\.2vh, 46px\);/,
  '14 px de marge au téléphone, 56 px au plus large, et le même retrait sous la barre',
);

// Dans l'onglet, la barre de modes remplace le « ← Menu » du Souk.
assert.match(
  battleCss,
  /\.rpg-mode-menu--souk \.rpg-souk__retour \{ display: none; \}/,
  'le Souk ne répète pas son retour au menu quand il vit dans les onglets',
);
assert.match(
  soukCss,
  /\.rpg-souk__retour \{/,
  'la page du Souk seule garde son bouton de retour',
);

/* ------------- les coffrets du Deck servent aussi au duel en ligne -------- */

// Un seul coffret pour tout le jeu : le module partagé, importé des deux côtés.
for (const nom of ['DeckBox', 'ElementEmblem', 'deckBoxArtUrl', 'deckColorModifier', 'inclinerBoitier', 'redresserBoitier']) {
  assert.match(deckBox, new RegExp(`export function ${nom}\\(`), `le module des coffrets exporte ${nom}`);
}
assert.match(deckBox, /import '\.\/rpg-deckbox\.css';/, 'le coffret emporte sa feuille de style partout où il est monté');
assert.match(cardArt, /export const cardArt = \(id\) =>/, 'les URL d’illustration vivent dans un module partagé');
assert.match(
  page,
  /} from '\.\/RpgDeckBox\.jsx';/,
  'l’onglet Deck importe les coffrets au lieu de les redéfinir',
);
assert.doesNotMatch(page, /function DeckBox\(/, 'le coffret n’est plus dupliqué dans la page du duel');
assert.doesNotMatch(page, /function ElementEmblem\(/, 'les emblèmes non plus');
assert.match(
  salon,
  /import \{ DeckBox, deckColorModifier, inclinerBoitier, redresserBoitier \} from '\.\/RpgDeckBox\.jsx';/,
  'le salon du duel en ligne monte les mêmes coffrets',
);
assert.match(
  salon,
  /<DeckBox deck=\{deck\} index=\{index\} size="shelf" \/>/,
  'chaque deck du salon est un boîtier 3D',
);
assert.doesNotMatch(salon, /rpg-pvp-deck__entete/, 'l’ancienne grille de cartes plates a disparu du salon');
assert.match(
  salon,
  /onPointerMove=\{inclinerBoitier\}[\s\S]{0,80}onPointerLeave=\{redresserBoitier\}/,
  'le boîtier du salon se tourne vers le curseur comme sur l’étagère',
);
assert.match(pvpCss, /\.rpg-pvp-decks \{[^}]*display: flex;[^}]*justify-content: center;/,
  'l’étagère du salon se centre, quel que soit le nombre de decks');
assert.match(pvpCss, /\.rpg-pvp-deckbox\.is-selected \{/, 'le coffret choisi s’allume d’un liseré');
assert.doesNotMatch(pvpCss, /\.rpg-pvp-deck \{/, 'les règles de l’ancienne carte plate sont retirées');

// Conquête : l'écran prend toute la largeur et range les tours quatre de front.
// La règle à deux colonnes du hub ne doit pas écraser `--full`.
assert.match(
  battleCss,
  /\.rpg-mode-menu__play:not\(\.rpg-mode-menu__play--full\) \{ grid-template-columns:/,
  'la grille à deux colonnes du tableau de bord épargne les écrans pleine largeur',
);
assert.doesNotMatch(
  battleCss,
  /^\.rpg-mode-menu__play \{ grid-template-columns:/m,
  'aucune règle nue ne vient rouvrir une colonne vide à côté de la Conquête',
);
assert.match(
  storyCss,
  /\.rpg-story__tours \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 250px\), 1fr\)\);/,
  'les tours de Bab El se rangent en quatre colonnes sur ordinateur, une au téléphone',
);
assert.match(
  storyCss,
  /\.rpg-story-tower__cta \{ align-self: end;/,
  'sur une rangée de quatre, les pieds de carte s’alignent en bas',
);

const pvpBoard = read('../src/games/RpgPvpBoard.jsx');
assert.match(
  pvpBoard,
  /import RpgDuelPage from '\.\/RpgDuelPage\.jsx';[\s\S]*<RpgDuelPage[\s\S]*pvp=\{\{/,
  'le plateau PvP monte la vraie table plein écran RpgDuelPage au lieu d’un résumé textuel',
);
assert.doesNotMatch(
  pvpBoard,
  /rpg-pvp--duel/,
  'le vieux prototype textuel du duel en ligne a disparu de RpgPvpBoard',
);

// L'étagère du Deck : boîtiers fluides auto-fit, et l'atelier à la même taille.
assert.match(
  deckCss,
  /\.rpg-deck-catalog--closed \.rpg-deck-catalog__choices \{\s*display: grid;\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 200px\), 1fr\)\);/,
  'l’étagère du Deck range les coffrets en grille auto-fit',
);
assert.match(
  deckCss,
  /\.rpg-deck-catalog--closed \.rpg-deck-choice \{ width: 100%; height: 100%;/,
  'chaque carte remplit sa colonne et prend la hauteur de la rangée',
);
assert.match(
  deckCss,
  /\.rpg-deck-choice--neuf \{[^}]*height: 100%;/,
  'la carte « Nouveau deck » a la taille des autres cartes',
);

const cadre = new JSDOM(`<!doctype html><html><head><style>${battleCss}\n${soukCss}</style></head><body>
  <section class="rpg-mode-menu rpg-mode-menu--souk"><div class="rpg-mode-menu__content">
    <header class="rpg-mode-menu__header">
      <div class="rpg-mode-menu__brand"><h1>Le Sablier</h1></div>
      <button type="button" class="rpg-mode-menu__fullscreen"><svg viewBox="0 0 24 24"></svg></button>
      <a class="rpg-mode-menu__quitter" href="/jeu" aria-label="Quitter le Sablier"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></a>
    </header>
    <main class="rpg-souk">
      <header class="rpg-souk__header">
        <div class="rpg-souk__titre"><h2>Le Souk</h2></div>
        <button type="button" class="rpg-menu-button rpg-souk__retour">← Menu</button>
      </header>
    </main>
  </div></section>
</body></html>`, { pretendToBeVisual: true });

try {
  const styleCadre = (selector) => cadre.window.getComputedStyle(cadre.window.document.querySelector(selector));
  const quitter = styleCadre('.rpg-mode-menu__quitter');
  assert.equal(quitter.display, 'inline-flex', 'la sortie du Sablier est une pastille alignée sur le plein écran');
  assert.equal(quitter.borderRadius, '50%', 'ronde comme le bouton plein écran');
  assert.equal(quitter.minWidth, '38px', '38 px de côté, la taille du bouton voisin');
  assert.equal(quitter.marginLeft, '8px', 'elle se détache du bouton plein écran');
  assert.equal(quitter.order, '2', 'elle reste sur la ligne du titre, après le plein écran');
  assert.equal(styleCadre('.rpg-souk__retour').display, 'none',
    'dans l’onglet, le retour au menu du Souk disparaît (la barre d’onglets le remplace)');
} finally {
  cadre.window.close();
}

console.log(
  'check:rpg-accueil ✓ — la page Jouer range ses quatre cartes carrées en quatre colonnes sur PC (récit, duel en ligne, Jouer, Conquête), '
  + 'deux colonnes sur téléphone, avec « Apprendre à jouer » en lien texte séparé ; '
  + 'la Conquête a quitté la barre, Profil / Paramètres / Messagerie y forment un groupe à part, '
  + 'et l’onglet Jouer est de retour. La barre PC prend sa propre rangée, plus haute, avec de l’air au-dessus, '
  + 'tandis que le téléphone garde ses icônes côte à côte (libellés au bureau, aria-label partout). '
  + 'Le salon en ligne vit dans le cadre plein écran du jeu, et les sept onglets reprennent cette même scène : artwork tamisé, gouttière unique, retour au menu rangé. '
  + 'Le salon choisit son deck sur les coffrets du menu.',
);
process.exit(0);
