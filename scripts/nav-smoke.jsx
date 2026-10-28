/**
 * Entrée SSR utilisée par scripts/nav-check.mjs — `npm run check:nav`.
 * Vérifie le logo, le nouveau menu Actus et les accès de navigation.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import Layout from '../src/components/Layout';

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
const submenuLink = (menu, href) => [...menu.querySelectorAll('.nav-submenu a')].find((a) => a.getAttribute('href') === href);

export async function checkNav(assert) {
  const home = await mountAt('/');
  const logo = home.node.querySelector('.nav .brand-logo');
  assert.ok(logo, 'le logo est présent dans la barre');
  assert.equal(logo.getAttribute('width'), '1248', 'le logo déclare sa largeur native');
  assert.equal(logo.getAttribute('height'), '905', 'le logo déclare sa hauteur native');
  assert.equal(logo.getAttribute('src').endsWith('lets-play-logo.png'), true, 'le logo servi est bien le PNG officiel');

  const menu = home.node.querySelector('.nav-item--menu');
  assert.ok(menu, 'Actus est une entrée de menu déroulant');
  assert.equal(menu.querySelector(':scope > a .nav-link-label').textContent, 'Actus', 'le déclencheur s’appelle Actus');
  const entries = [...menu.querySelectorAll('.nav-submenu a')];
  assert.deepEqual(
    entries.map((a) => a.getAttribute('href')),
    ['/news', '/reviews', '/dossiers', '/dz-dev'],
    'Actus rassemble News, Tests, Dossiers et DZ Dev',
  );
  assert.deepEqual(
    entries.map((a) => a.querySelector('.nav-submenu-label').textContent),
    ['News', 'Tests', 'Dossiers', 'Dz DEV'],
    'les intitulés du menu éditorial',
  );
  assert.equal(entries.some((a) => a.querySelector('.nav-submenu-mark, .nav-submenu-desc')), false, 'les liens dropdown affichent uniquement leur intitulé, sans flèche ni texte secondaire');
  assert.equal(home.node.querySelector('.nav-primary > a[href="/reviews"]'), null, 'Tests n’est plus une entrée séparée');
  assert.equal(home.node.querySelector('.nav-primary > a[href="/dossiers"]'), null, 'Dossiers n’est plus une entrée séparée');
  assert.equal(home.node.querySelector('.nav-primary > a[href="/dz-dev"]'), null, 'DZ Dev n’est plus une entrée séparée');
  assert.equal(home.node.querySelector('.nav-primary > a[href="/jeu"] .nav-link-label').textContent, 'Nos jeux', 'le lien Let’s Play est renommé Nos jeux');
  assert.equal(home.node.querySelector('.nav-primary > a[href="/quizz"]')?.textContent.includes('Quizz'), true, 'Quizz reste un accès indépendant');
  assert.equal(menu.classList.contains('active'), false, 'Actus est au repos sur l’accueil');

  const toggle = menu.querySelector('.nav-submenu-toggle');
  assert.ok(toggle, 'le chevron du menu Actus est présent');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false', 'panneau fermé au départ');
  assert.equal(toggle.getAttribute('aria-controls'), menu.querySelector('.nav-submenu').id, 'le chevron pilote le bon panneau');
  await click(toggle);
  assert.equal(menu.classList.contains('is-open'), true, 'le chevron ouvre le panneau');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true', 'l’ouverture est annoncée aux lecteurs d’écran');
  await pressEscape();
  await act(async () => {});
  assert.equal(menu.classList.contains('is-open'), false, 'Échap referme le panneau');
  await click(toggle);
  await clickOutside();
  await act(async () => {});
  assert.equal(menu.classList.contains('is-open'), false, 'un clic extérieur referme le panneau');

  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  const quickRoutes = [...home.node.querySelectorAll('.cmd-palette-quick a')].map((a) => a.getAttribute('href'));
  for (const route of ['/news', '/reviews', '/dossiers', '/dz-dev']) {
    assert.ok(quickRoutes.includes(route), `la palette conserve l’accès rapide ${route}`);
  }
  await pressEscape();
  await act(async () => {});
  await home.unmount();

  for (const [path, expectedRoute] of [
    ['/news', '/news'],
    ['/reviews', '/reviews'],
    ['/dossiers', '/dossiers'],
    ['/dz-dev/hicosoft', '/dz-dev'],
  ]) {
    const page = await mountAt(path);
    const activeMenu = page.node.querySelector('.nav-item--menu');
    assert.equal(activeMenu.classList.contains('active'), true, `${path} active le menu Actus`);
    assert.equal(submenuLink(activeMenu, expectedRoute)?.classList.contains('is-current'), true, `${path} marque la rubrique courante`);
    await page.unmount();
  }

  const games = await mountAt('/jeu');
  assert.equal(games.node.querySelector('.nav-item--menu').classList.contains('active'), false, 'Actus reste éteint dans Nos jeux');
  await games.unmount();
}
