/**
 * Entrée SSR utilisée par scripts/nav-check.mjs — `npm run check:nav`.
 *
 * La barre de navigation a deux responsabilités fragiles, vérifiées ici dans
 * le navigateur simulé (jsdom) avec la vraie pile de l'application :
 *
 *   1. le logo — le fichier est un lockup empilé « Let's / Play » (1248 × 905).
 *      La barre doit lui laisser son ratio (attributs `width` / `height` +
 *      `aspect-ratio` dans la feuille) : un logo écrasé en largeur est
 *      exactement ce qu'on ne veut plus voir ;
 *   2. le sous-menu « Jeux » — une entrée de section qui ouvre deux pages,
 *      Jeux-vidéo (`/jeu`) et Quizz (`/quizz`). L'entrée reste active sur les
 *      sous-pages (`/jeu/mirage-rush`, `/quizz/survival`), le panneau s'ouvre
 *      au clic sur le chevron, se ferme par Échap, par un clic à l'extérieur et
 *      à chaque changement de route, et la sous-page courante est signalée
 *      (`is-current`) sans jamais prendre la classe `active` — la pastille
 *      jaune qui glisse se mesure sur l'entrée, pas sur ses enfants.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import Layout from '../src/components/Layout';

/** Monte la barre (Layout + une page vide) sur une route donnée. */
async function mountAt(path) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(
    <LanguageProvider>
      <AuthProvider>
        <AchievementProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="*" element={<Layout><div /></Layout>} />
            </Routes>
          </MemoryRouter>
        </AchievementProvider>
      </AuthProvider>
    </LanguageProvider>,
  ));
  return { node, root, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

const click = async (el) => { await act(async () => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); };
const pressEscape = async () => {
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
};
const clickOutside = async () => {
  await act(async () => document.body.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true })));
};

export async function checkNav(assert) {
  /* ------------------------------- 1. Logo -------------------------------- */
  const home = await mountAt('/');
  const logo = home.node.querySelector('.nav .brand-logo');
  assert.ok(logo, 'le logo est présent dans la barre');
  assert.equal(logo.getAttribute('width'), '1248', 'le logo déclare sa largeur native');
  assert.equal(logo.getAttribute('height'), '905', 'le logo déclare sa hauteur native');
  assert.equal(logo.getAttribute('src').endsWith('lets-play-logo.png'), true, 'le logo servi est bien le PNG officiel');

  /* ------------------- 2. Sous-menu « Jeux » (2 pages) -------------------- */
  const gamesMenu = home.node.querySelector('.nav-item--menu');
  assert.ok(gamesMenu, 'l’entrée Jeux est une entrée de section');
  const entries = [...gamesMenu.querySelectorAll('.nav-submenu a')];
  assert.deepEqual(
    entries.map((a) => a.getAttribute('href')),
    ['/jeu', '/quizz'],
    'les deux pages du sous-menu : Jeux-vidéo puis Quizz',
  );
  assert.deepEqual(
    entries.map((a) => a.querySelector('.nav-submenu-label').textContent),
    ['Jeux-vidéo', 'Quizz'],
    'les libellés des deux pages',
  );
  assert.deepEqual(
    entries.map((a) => a.querySelector('.nav-submenu-desc').textContent),
    ['ARCADE / MIRAGE RUSH', 'QUIZZ / SURVIVAL'],
    'le rappel de chaque page sous son libellé',
  );

  // Plus de pastille « Quizz » à part : la section ne prend qu'une entrée.
  assert.equal(home.node.querySelector('.nav-primary > a[href="/quizz"]'), null, 'plus d’entrée Quizz isolée dans la barre');

  // Sur l'accueil, l'entrée Jeux est au repos.
  assert.equal(gamesMenu.classList.contains('active'), false, 'entrée Jeux au repos sur l’accueil');
  assert.equal(entries.some((a) => a.classList.contains('is-current')), false, 'aucune page courante sur l’accueil');

  // Le panneau se déplie au clic sur le chevron, se referme au second clic.
  const toggle = gamesMenu.querySelector('.nav-submenu-toggle');
  assert.ok(toggle, 'le chevron du sous-menu est présent');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false', 'panneau fermé au départ');
  assert.equal(toggle.getAttribute('aria-controls'), gamesMenu.querySelector('.nav-submenu').id, 'le chevron pilote bien le panneau');
  await click(toggle);
  assert.equal(gamesMenu.classList.contains('is-open'), true, 'le chevron ouvre le panneau');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true', 'l’état est annoncé aux lecteurs d’écran');
  await pressEscape();
  await act(async () => {});
  assert.equal(gamesMenu.classList.contains('is-open'), false, 'Échap referme le panneau');
  await click(toggle);
  await clickOutside();
  await act(async () => {});
  assert.equal(gamesMenu.classList.contains('is-open'), false, 'un clic à l’extérieur referme le panneau');

  // L'accès rapide de la palette (⌘K / Ctrl+K) garde les deux pages de la
  // section : les quizz ne disparaissent pas avec la pastille.
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  const quick = [...home.node.querySelectorAll('.cmd-palette-quick a')].map((a) => a.getAttribute('href'));
  assert.ok(quick.includes('/jeu'), 'la palette garde le raccourci Jeux-vidéo');
  assert.ok(quick.includes('/quizz'), 'la palette garde le raccourci Quizz');
  await pressEscape();
  await act(async () => {});
  await home.unmount();

  /* ------------- 3. Entrée active sur les pages de la section ------------- */
  const grid = await mountAt('/quizz');
  const gridMenu = grid.node.querySelector('.nav-item--menu');
  assert.equal(gridMenu.classList.contains('active'), true, 'la grille des quizz allume l’entrée Jeux');
  const quizLink = subLink(gridMenu.querySelectorAll('.nav-submenu a'), '/quizz');
  assert.equal(quizLink.classList.contains('is-current'), true, 'la page courante est signalée dans le panneau');
  assert.equal(quizLink.classList.contains('active'), false, 'la pastille qui glisse se mesure sur l’entrée, pas sur la sous-page');
  assert.equal(quizLink.getAttribute('aria-current'), 'page', 'la page courante est annoncée');
  await grid.unmount();

  const player = await mountAt('/quizz/survival');
  const playerMenu = player.node.querySelector('.nav-item--menu');
  assert.equal(playerMenu.classList.contains('active'), true, 'une partie de quizz garde l’entrée Jeux active');
  await player.unmount();

  const arcade = await mountAt('/jeu/mirage-rush');
  const arcadeMenu = arcade.node.querySelector('.nav-item--menu');
  assert.equal(arcadeMenu.classList.contains('active'), true, 'un jeu de l’arcade garde l’entrée Jeux active');
  assert.equal(
    subLink(arcadeMenu.querySelectorAll('.nav-submenu a'), '/jeu').classList.contains('is-current'),
    true,
    'la page Jeux-vidéo est signalée',
  );
  await arcade.unmount();

  const news = await mountAt('/news');
  assert.equal(news.node.querySelector('.nav-item--menu').classList.contains('active'), false, 'l’entrée Jeux reste éteinte ailleurs');
  await news.unmount();
}

/** Le lien du panneau qui pointe vers `href` (aide de lecture). */
function subLink(list, href) {
  return [...list].find((a) => a.getAttribute('href') === href);
}
