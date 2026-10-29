import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/**
 * Refonte de la page d'accueil « Jouer » — `tests/rpg-mode-cards.test.js`
 *
 * Inspirée de l'accueil MTG Arena :
 * - À gauche en haut : grande vitrine illustrée du Sablier de Bab El.
 * - À droite en haut : les quatre modes (« Mode histoire », « Duel en ligne »,
 *   « Jouer », « Conquête ») empilés verticalement l'un au-dessus de l'autre en
 *   largeur, chacun illustré d'une miniature tirée des cartes du jeu et ne
 *   portant que son titre.
 * - En dessous sur toute la largeur : la rampe horizontale des quêtes du jour
 *   en médaillons dorés + capsules d'objectif.
 * - La page d'accueil reste non scrollable (`100dvh`, `overflow: hidden`), la
 *   progression d'XP vit dans son onglet dédié, et la barre verticale à gauche
 *   conserve ses boutons 3D et son bouton « Jouer » à dégradé animé.
 */
const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

const page = lire('../src/games/RpgDuelPage.jsx');
const icones = lire('../src/games/RpgModeIcon.jsx');
const battleCss = lire('../src/games/rpg-battle.css');
const tutorialCss = lire('../src/games/rpg-tutorial.css');
const quetesCss = lire('../src/games/rpg-quetes-jour.css');

const actions = page.slice(
  page.indexOf('className="rpg-mode-menu__hero-actions"'),
  page.indexOf(") : screen === 'tours' ? ("),
);
const grilleModesSeulement = actions.slice(0, actions.indexOf('</section>'));
const navMarkupGlobal = page.slice(
  page.indexOf('<nav className="rpg-mode-menu__switch"'),
  page.indexOf('</nav>') + 6,
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

test('trois bannières larges empilées à droite, miniature tirée des cartes et titre seul sans détails', () => {
  assert.ok(actions.length > 0, 'le bloc d’actions de la page Jouer existe');
  assert.equal((grilleModesSeulement.match(/rpg-mode-carte(?![-\w])/g) ?? []).length, 3,
    'trois bannières de mode exactement (Mode histoire, Duel en ligne, Conquête)');
  assert.equal((grilleModesSeulement.match(/className="rpg-mode-carte__art"/g) ?? []).length, 3,
    'chaque mode porte sa miniature illustrée');
  for (const carteId of ['salem', 'bouchra-guerriere-des-cretes', 'tour-des-tenebres']) {
    assert.match(grilleModesSeulement, new RegExp(`src=\\{cardArt\\('${carteId}'\\)\\}`),
      `le mode utilise la carte « ${carteId} » du jeu comme miniature`);
  }
  assert.doesNotMatch(grilleModesSeulement, /rpg-menu-button--partie-rapide/,
    'le mode « Jouer » a été retiré des modes de jeu à droite');
  assert.doesNotMatch(grilleModesSeulement, /<small>/,
    'aucun détail secondaire (<small>) ne surcharge le texte des modes : seulement un titre');
  assert.doesNotMatch(grilleModesSeulement, /rpg-mode-carte__icone/,
    'les anciennes grandes icônes de mode cèdent la place aux miniatures de cartes');
  assert.match(battleCss, /\.rpg-mode-menu__hero-actions > \.rpg-mode-carte\s*\{[^}]*width:\s*100%;/s,
    'chaque mode s’étire sur toute la largeur de sa colonne');
  assert.match(battleCss, /\.rpg-mode-carte__art\s*\{[^}]*object-fit:\s*cover;/s,
    'la miniature de carte couvre proprement la bannière horizontale');
  assert.doesNotMatch(actions, /rpg-mode-menu__secondary-actions/,
    'les trois modes restent des enfants directs de la pile');
});

test('les trois modes à droite sont « Mode histoire », « Duel en ligne » et « Conquête »', () => {
  assert.doesNotMatch(grilleModesSeulement, />Jouer</, 'la bannière « Jouer » ne figure plus dans les modes à droite');
  assert.doesNotMatch(actions, />Partie rapide</, 'l’ancien libellé a disparu des modes');
  assert.match(actions, /rpg-menu-button--histoire/, 'le Mode histoire reste présent');
  assert.doesNotMatch(grilleModesSeulement, /rpg-menu-button--glow/,
    'aucun reflet animé ::after (rpg-menu-button--glow) ne fait glisser le voile sombre sur Mode histoire');
  assert.match(battleCss, /\.rpg-mode-carte::after[\s\S]{0,240}?animation:\s*none;/,
    'le dégradé de lisibilité ::after des cartes de mode reste fixe et pleine largeur');
  assert.match(actions, /rpg-menu-button--en-ligne/, 'le Duel en ligne reste présent');
  const indexHistoire = actions.indexOf('rpg-menu-button--histoire');
  const indexEnLigne = actions.indexOf('rpg-menu-button--en-ligne');
  const indexConquete = actions.indexOf('rpg-menu-button--conquete');
  assert.ok(indexHistoire > 0 && indexEnLigne > indexHistoire && indexConquete > indexEnLigne,
    'ordre des trois modes empilés : Mode histoire, Duel en ligne, Conquête');
  assert.match(actions, /rpg-menu-button--conquete[\s\S]{0,500}?onChangeScreen\('tours'\)/,
    'la bannière Conquête ouvre les Tours de Bab El');
  assert.match(actions, />Conquête</, 'la bannière porte son titre');
});

test('« Apprendre à jouer » vit dans la barre de navigation, juste au-dessus du trait qui précède Profil', () => {
  assert.doesNotMatch(actions, /rpg-mode-menu__apprendre/,
    'le lien du tutoriel ne vit plus dans le corps de la page Jouer');
  const posProgression = navMarkupGlobal.indexOf('rpg-mode-menu__progression');
  const posApprendre = navMarkupGlobal.indexOf('rpg-mode-menu__apprendre');
  const posProfil = navMarkupGlobal.indexOf('rpg-mode-menu__onglet--groupe-secondaire');
  assert.ok(posProgression > 0 && posApprendre > posProgression && posProfil > posApprendre,
    'le lien du tutoriel se place dans la barre de navigation juste au-dessus de Profil (et donc au-dessus de son trait)');
  assert.match(navMarkupGlobal, /rpg-mode-menu__apprendre rpg-menu-button--tutorial/,
    'le tutoriel garde ses classes de lien dédié');
  assert.match(navMarkupGlobal, />Apprendre à jouer</, 'le lien garde son libellé');
  assert.match(navMarkupGlobal, /<RpgModeIcon nom="tutoriel" className="rpg-mode-menu__apprendre-icone" \/>/,
    'le lien porte la petite icône du tutoriel');
  assert.match(navMarkupGlobal, /rpg-mode-menu__apprendre-arrow[\s\S]{0,80}?↗/,
    'une flèche termine le lien');
  assert.match(navMarkupGlobal, /rpg-mode-menu__apprendre[\s\S]{0,400}?onChangeScreen\('tutoriels'\)/,
    'le lien ouvre toujours les leçons guidées');
  assert.match(tutorialCss, /\.rpg-mode-menu__apprendre-icone\s*\{[^}]*width: 18px;\s*height: 18px;/s,
    'l’icône du lien est petite');
});

test('modes empilés l’un au-dessus de l’autre en largeur et bouton Jouer aligné au niveau des quêtes', () => {
  assert.match(tutorialCss, /\.rpg-mode-menu__hero-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^}]*grid-template-rows:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s,
    'les trois modes sont empilés verticalement sur une seule colonne pleine largeur');
  assert.match(battleCss, /\.rpg-mode-menu--jouer \.rpg-mode-menu__play:not\(\.rpg-mode-menu__play--full\)\s*\{[^}]*padding:\s*clamp\([^)]+\)\s+clamp\([^)]+\)\s+62px;[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto;/s,
    'la grande image conserve sa hauteur extensible (1fr) et les quêtes restent remontées à 62 px');
  assert.match(battleCss, /\.rpg-mode-menu__header \.rpg-mode-menu__switch\s*\{[^}]*padding:\s*12px\s+8px\s+90px;/s,
    'le bloc du bas de la barre latérale (Apprendre à jouer, Profil, Paramètres, Messagerie et Jouer) remonte d’un bloc pour aligner Jouer au niveau des quêtes');
  assert.match(battleCss, /\.rpg-mode-menu--jouer \.rpg-quests-jour\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;\s*grid-row:\s*2;/s,
    'les quêtes du jour sont placées en dessous sur toute la largeur plutôt qu’à droite');
  assert.match(quetesCss, /\.rpg-quests-jour__liste\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s,
    'les trois quêtes du jour s’alignent horizontalement côte à côte');
  assert.match(quetesCss, /\.rpg-quests-jour__medaillon\s*\{[^}]*border-radius:\s*50%;/s,
    'chaque quête s’affiche avec son médaillon circulaire de récompense');
});

test('groupes échangés, onglet dédié Progression d’XP, accueil non scrollable et bouton « Jouer » texte seul à dégradé animé', () => {
  assert.equal((page.match(/rpg-mode-menu__onglet--secondaire\b/g) ?? []).length, 3,
    'trois onglets portent la classe du groupe secondaire (Profil, Paramètres, Messagerie)');
  assert.equal((page.match(/rpg-mode-menu__onglet--groupe-secondaire\b/g) ?? []).length, 1,
    'Profil ouvre le groupe secondaire en bas de la colonne');

  const navMarkup = page.slice(
    page.indexOf('<nav className="rpg-mode-menu__switch"'),
    page.indexOf('</nav>') + 6,
  );
  const posDeck = navMarkup.indexOf('aria-label="Deck"');
  const posSouk = navMarkup.indexOf('rpg-mode-menu__souk');
  const posCatalogue = navMarkup.indexOf('aria-label="Catalogue"');
  const posProgression = navMarkup.indexOf('rpg-mode-menu__progression');
  const posApprendre = navMarkup.indexOf('rpg-mode-menu__apprendre');
  const posProfil = navMarkup.indexOf('rpg-mode-menu__profil');
  const posParametres = navMarkup.indexOf('aria-label="Paramètres"');
  const posMessagerie = navMarkup.indexOf('rpg-mode-menu__messagerie');
  const posJouer = navMarkup.indexOf('rpg-mode-menu__jouer');
  assert.ok(
    posDeck > 0
      && posSouk > posDeck
      && posCatalogue > posSouk
      && posProgression > posCatalogue
      && posApprendre > posProgression
      && posProfil > posApprendre
      && posParametres > posProfil
      && posMessagerie > posParametres
      && posJouer > posMessagerie,
    'Deck/Souk/Catalogue/Progression en haut, puis Apprendre à jouer au-dessus du trait de Profil, puis Profil/Paramètres/Messagerie et Jouer',
  );

  const boutonJouerMarkup = navMarkup.slice(posJouer);
  assert.doesNotMatch(boutonJouerMarkup, /RpgModeIcon|rpg-mode-menu__onglet-icone|rpg-mode-menu__icone-3d/,
    'le bouton « Jouer » de la barre ne porte plus d’icône de deck');
  assert.match(boutonJouerMarkup, /<span className="rpg-mode-menu__onglet-libelle">Jouer<\/span>/,
    'le bouton « Jouer » garde uniquement son texte');

  assert.equal((navMarkup.match(/rpg-mode-menu__icone-3d(?![-\w])/g) ?? []).length, 7,
    'les sept onglets au-dessus de Jouer portent chacun un bouton 3D pour leur icône');
  for (const variante of ['deck', 'souk', 'catalogue', 'progression', 'profil', 'parametres', 'messagerie']) {
    assert.match(navMarkup, new RegExp(`rpg-mode-menu__icone-3d--${variante}\\b`),
      `l’onglet ${variante} a sa variante de bouton 3D`);
  }
  for (const nom of ['deck', 'catalogue', 'parametres', 'progression']) {
    assert.match(icones, new RegExp(`\\b${nom}:\\s*\\(`),
      `RpgModeIcon fournit le dessin vectoriel « ${nom} »`);
    assert.match(navMarkup, new RegExp(`<RpgModeIcon nom="${nom}" \\/>`),
      `l’onglet ${nom} utilise son icône dessinée`);
  }

  assert.match(actions, /<RpgQuetesDuJour\b/, 'l’accueil conserve les quêtes du jour');
  assert.doesNotMatch(actions, /<RpgPisteGains\b/, 'la progression d’XP n’encombre plus la page d’accueil');
  const ecranProgression = page.slice(
    page.indexOf(") : screen === 'progression' ? ("),
    page.indexOf(") : screen === 'souk' ? ("),
  );
  assert.ok(ecranProgression.length > 0, 'l’écran dédié à la progression d’XP existe');
  assert.match(ecranProgression, /<RpgPisteGains\b/, 'RpgPisteGains est monté dans l’onglet dédié Progression');
  assert.match(ecranProgression, /rpg-xp-screen__barre/, 'l’onglet Progression affiche la jauge d’XP');

  const navVerticale = battleCss.slice(battleCss.indexOf('BARRE DE NAVIGATION VERTICALE À GAUCHE'));
  assert.ok(navVerticale.length > 0, 'la section dédiée à la barre verticale à gauche existe');
  assert.match(navVerticale, /\.rpg-mode-menu__header \.rpg-mode-menu__switch button\.rpg-mode-menu__apprendre\s*\{[^}]*margin-top:\s*auto;/s,
    'le lien du tutoriel absorbe l’écart central pour se poser juste au-dessus du trait de Profil');
  assert.match(navVerticale, /\.rpg-mode-menu__header \.rpg-mode-menu__switch button\.rpg-mode-menu__onglet--groupe-secondaire::before\s*\{[^}]*height:\s*1px;/s,
    'le trait horizontal demeure juste au-dessus de Profil');
  assert.match(navVerticale, /@keyframes rpg-jouer-degrade-mouvement\s*\{/,
    'l’animation du dégradé du bouton « Jouer » est déclarée');
  assert.match(navVerticale, /\.rpg-mode-menu__header \.rpg-mode-menu__switch button\.rpg-mode-menu__jouer\s*\{[^}]*background-size:\s*260%\s+260%;[^}]*animation:\s*rpg-jouer-degrade-mouvement/s,
    'le bouton « Jouer » anime son dégradé en continu');
  assert.match(navVerticale, /\.rpg-mode-menu\.rpg-mode-menu--jouer\s*\{[^}]*max-height:\s*100dvh;[^}]*overflow:\s*hidden;/s,
    'la page d’accueil est verrouillée sur 100dvh et non scrollable');
});

test('styles calculés : bannières empilées, quêtes en bas, barre verticale 3D et bouton Jouer animé', () => {
  const profilCss = lire('../src/games/rpg-profil.css');
  const dom = new JSDOM(`<!doctype html><html><head><style>${battleCss}\n${profilCss}\n${tutorialCss}\n${quetesCss}</style></head><body>
    <section class="rpg-mode-menu rpg-mode-menu--jouer">
      <div class="rpg-mode-menu__content">
        <header class="rpg-mode-menu__header">
          <div class="rpg-mode-menu__brand">
            <button type="button" class="rpg-mode-menu__accueil">⌛</button>
            <div class="rpg-mode-menu__brand-copy"><h1>Le <span>Sablier</span></h1></div>
          </div>
          <button type="button" class="rpg-mode-menu__fullscreen">⛶</button>
          <a class="rpg-mode-menu__quitter" href="/jeu">✕</a>
          <nav class="rpg-mode-menu__switch" aria-label="Modes de jeu">
            <button type="button" aria-label="Deck"><span class="rpg-mode-menu__onglet-icone rpg-mode-menu__icone-3d rpg-mode-menu__icone-3d--deck"><svg class="rpg-mode-icone"></svg></span><span class="rpg-mode-menu__onglet-libelle">Deck</span></button>
            <button type="button" class="rpg-mode-menu__souk" aria-label="Le Souk"><span class="rpg-mode-menu__icone-3d rpg-mode-menu__icone-3d--souk"><span class="rpg-mode-menu__souk-piece">◈</span></span><span class="rpg-mode-menu__onglet-libelle">Souk</span><span class="rpg-mode-menu__bourse-solde">250</span></button>
            <button type="button" aria-label="Catalogue"><span class="rpg-mode-menu__onglet-icone rpg-mode-menu__icone-3d rpg-mode-menu__icone-3d--catalogue"><svg class="rpg-mode-icone"></svg></span><span class="rpg-mode-menu__onglet-libelle">Catalogue</span></button>
            <button type="button" class="rpg-mode-menu__progression" aria-label="Progression"><span class="rpg-mode-menu__onglet-icone rpg-mode-menu__icone-3d rpg-mode-menu__icone-3d--progression"><svg class="rpg-mode-icone"></svg></span><span class="rpg-mode-menu__onglet-libelle">Progression</span><span class="rpg-mode-menu__progression-xp">42%</span></button>
            <button type="button" class="rpg-mode-menu__apprendre rpg-menu-button--tutorial" aria-label="Apprendre à jouer"><svg class="rpg-mode-icone rpg-mode-menu__apprendre-icone"></svg><span class="rpg-mode-menu__apprendre-texte">Apprendre à jouer</span><span class="rpg-mode-menu__apprendre-arrow">↗</span></button>
            <button type="button" class="rpg-mode-menu__profil rpg-mode-menu__onglet--secondaire rpg-mode-menu__onglet--groupe-secondaire" aria-label="Profil"><span class="rpg-mode-menu__icone-3d rpg-mode-menu__icone-3d--profil"><span class="rpg-mode-menu__profil-embleme">✦</span></span><span class="rpg-mode-menu__onglet-libelle">Profil</span><span class="rpg-mode-menu__profil-niveau">NIV. 3</span><span class="rpg-mode-menu__profil-xp"><i></i></span></button>
            <button type="button" class="rpg-mode-menu__onglet--secondaire" aria-label="Paramètres"><span class="rpg-mode-menu__onglet-icone rpg-mode-menu__icone-3d rpg-mode-menu__icone-3d--parametres"><svg class="rpg-mode-icone"></svg></span><span class="rpg-mode-menu__onglet-libelle">Paramètres</span></button>
            <button type="button" class="rpg-mode-menu__messagerie rpg-mode-menu__onglet--secondaire" aria-label="Messagerie"><span class="rpg-mode-menu__icone-3d rpg-mode-menu__icone-3d--messagerie"><span class="rpg-mode-menu__messagerie-mark">💬</span></span><span class="rpg-mode-menu__onglet-libelle">Messagerie</span></button>
            <button type="button" class="rpg-mode-menu__jouer is-active" aria-label="Jouer"><span class="rpg-mode-menu__onglet-libelle">Jouer</span></button>
          </nav>
        </header>
        <main class="rpg-mode-menu__play">
          <section class="rpg-mode-menu__hero"><img class="rpg-mode-menu__hero-keyart" src="/sablier-de-bab-el-keyart.jpg" alt="" /></section>
          <section class="rpg-mode-menu__modes-col">
            <div class="rpg-mode-menu__hero-actions">
              <button type="button" class="rpg-mode-carte rpg-menu-button rpg-menu-button--histoire"><img class="rpg-mode-carte__art" src="/cards/salem.jpg" alt="" /><span class="rpg-mode-carte__texte rpg-menu-button__text"><strong>Mode histoire</strong></span></button>
              <a class="rpg-mode-carte rpg-menu-button rpg-menu-button--en-ligne" href="/jeu/sablier-de-bab-el/defi"><img class="rpg-mode-carte__art" src="/cards/bouchra-guerriere-des-cretes.jpg" alt="" /><span class="rpg-mode-carte__texte rpg-menu-button__text"><strong>Duel en ligne</strong></span></a>
              <button type="button" class="rpg-mode-carte rpg-menu-button rpg-menu-button--conquete"><img class="rpg-mode-carte__art" src="/cards/tour-des-tenebres.jpg" alt="" /><span class="rpg-mode-carte__texte rpg-menu-button__text"><strong>Conquête</strong></span></button>
            </div>
          </section>
          <aside class="rpg-quests-jour">
            <div class="rpg-quests-jour__rail">
              <ul class="rpg-quests-jour__liste">
                <li class="rpg-quests-jour__quete is-encours"><div class="rpg-quests-jour__corps"><div class="rpg-quests-jour__medaillon"></div><div class="rpg-quests-jour__capsule"></div></div></li>
              </ul>
            </div>
          </aside>
        </main>
        <footer class="rpg-mode-menu__footer"><span>LE SABLIER</span></footer>
      </div>
    </section>
  </body></html>`, { pretendToBeVisual: true });

  try {
    const doc = dom.window.document;
    const style = (sel) => dom.window.getComputedStyle(doc.querySelector(sel));

    assert.equal(style('.rpg-mode-menu--jouer').overflow, 'hidden');
    assert.equal(style('.rpg-mode-menu--jouer .rpg-mode-menu__content').overflow, 'hidden');
    assert.equal(style('.rpg-mode-menu__header').position, 'sticky');
    assert.equal(style('.rpg-mode-menu__switch').flexDirection, 'column');

    // Colonne des modes à droite, empilée en largeur, et quêtes en dessous sur toute la largeur
    assert.equal(style('.rpg-mode-menu__modes-col').gridColumn, '2');
    assert.equal(style('.rpg-mode-menu__modes-col').gridRow, '1');
    assert.equal(style('.rpg-mode-menu__hero-actions').gridTemplateColumns, 'minmax(0, 1fr)');
    assert.equal(style('.rpg-mode-carte').width, '100%');
    assert.equal(style('.rpg-mode-carte__art').objectFit, 'cover');
    assert.equal(style('.rpg-quests-jour').gridColumn, '1 / -1');
    assert.equal(style('.rpg-quests-jour').gridRow, '2');
    assert.ok(
      style('.rpg-quests-jour').backgroundColor === 'transparent'
      || style('.rpg-quests-jour').backgroundColor === 'rgba(0, 0, 0, 0)',
      'les quêtes flottent sans fond derrière le conteneur',
    );
    assert.equal(style('.rpg-quests-jour').backgroundImage, 'none');
    assert.equal(style('.rpg-quests-jour__medaillon').borderRadius, '50%');

    const boutons = [...doc.querySelectorAll('.rpg-mode-menu__switch > button')];
    assert.deepEqual(
      boutons.map((b) => (b.querySelector('.rpg-mode-menu__onglet-libelle') ?? b.querySelector('.rpg-mode-menu__apprendre-texte'))?.textContent),
      ['Deck', 'Souk', 'Catalogue', 'Progression', 'Apprendre à jouer', 'Profil', 'Paramètres', 'Messagerie', 'Jouer'],
    );

    const apprendreStyle = style('.rpg-mode-menu__apprendre');
    assert.equal(apprendreStyle.marginTop, 'auto');
    const profilGroupeStyle = style('.rpg-mode-menu__onglet--groupe-secondaire');
    assert.equal(profilGroupeStyle.marginTop, '10px');

    const icone3dStyle = style('.rpg-mode-menu__icone-3d--progression');
    assert.equal(icone3dStyle.width, '36px');
    assert.equal(icone3dStyle.height, '36px');
    assert.equal(icone3dStyle.borderRadius, '10px');
    assert.match(icone3dStyle.boxShadow, /0(?:px)? 4px 0(?:px)?/);

    const jouerBtn = doc.querySelector('.rpg-mode-menu__jouer');
    assert.equal(jouerBtn.children.length, 1, 'le bouton Jouer ne contient que son libellé');
    const jouerStyle = style('.rpg-mode-menu__jouer');
    assert.equal(jouerStyle.marginTop, '8px');
    assert.equal(jouerStyle.position, 'relative');
    assert.equal(jouerStyle.textTransform, 'uppercase');
    assert.match(jouerStyle.backgroundImage, /linear-gradient/);
    assert.equal(jouerStyle.backgroundSize, '260% 260%');
    assert.match(jouerStyle.animation, /rpg-jouer-degrade-mouvement/);
    assert.equal(style('.rpg-mode-menu__switch').paddingBottom, '90px',
      'le bouton Jouer et le bloc d’onglets juste au-dessus remontent au niveau des quêtes du jour');

    const profilLibelleStyle = style('.rpg-mode-menu__profil .rpg-mode-menu__onglet-libelle');
    assert.equal(profilLibelleStyle.display, 'inline');
  } finally {
    dom.window.close();
  }
});
