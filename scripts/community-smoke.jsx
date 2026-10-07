import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { AchievementProvider } from '../src/achievements/AchievementContext';
import CommunityPage from '../src/community/CommunityPage';

export function createCommunityApp(lang = 'fr') {
  return React.createElement(
    LanguageProvider,
    { lang },
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/communaute'] },
        React.createElement(
          AchievementProvider,
          null,
          React.createElement(CommunityPage),
        ),
      ),
    ),
  );
}

export async function exerciseCommunity(assert) {
  window.localStorage.clear();
  window.scrollTo = () => {};
  const node = document.createElement('div');
  document.body.append(node);
  let root = createRoot(node);
  const click = async (element) => {
    assert.ok(element, 'élément interactif présent');
    await act(async () => element.click());
  };
  const fill = async (element, value) => {
    assert.ok(element, 'champ présent');
    const prototype = element instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
    await act(async () => {
      setter.call(element, value);
      element.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  const selectOption = async (element, value) => {
    assert.ok(element, 'liste de thèmes présente');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    await act(async () => {
      setter.call(element, value);
      element.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  };

  try {
    await act(async () => root.render(createCommunityApp('fr')));
    // Plus de groupe exemple : la page ouvre sur les deux invitations à créer
    // le premier groupe (carte du hero et panneau de discussion).
    assert.equal(node.querySelectorAll('.community-group-card').length, 0, 'aucun groupe par défaut');
    assert.ok(node.querySelector('.community-feature-card.is-empty'), 'la carte du hero invite à créer le premier groupe');
    assert.ok(node.querySelector('.community-empty-discussion'), 'le panneau de discussion annonce qu’il n’y a aucun groupe');

    await click(node.querySelector('.community-hero-actions .community-button-primary'));
    const name = 'Les explorateurs du Rift';
    const theme = node.querySelector('.community-create-form select');
    assert.ok(theme, 'le formulaire propose un thème');
    assert.ok(
      [...theme.options].map((option) => option.value).join('|').includes('Gaming'),
      'les thèmes proposés couvrent les univers du site (Gaming…)',
    );
    assert.ok([...theme.options].map((option) => option.value).includes('Tech'), 'les thèmes proposés couvrent Tech');
    await fill(node.querySelector('.community-create-form input[type="text"]'), name);
    await fill(node.querySelector('.community-create-form textarea'), 'Un groupe pour partager nos builds, nos découvertes et nos astuces de jeu.');
    await selectOption(theme, 'Tech');
    await fill(node.querySelector('.community-create-row input'), 'Rift, coop');
    await click(node.querySelector('.community-modal-actions button[type="submit"]'));

    const createdCard = [...node.querySelectorAll('.community-group-card')].find((card) => card.textContent.includes(name));
    assert.ok(createdCard, 'le groupe créé rejoint la liste');
    assert.ok(createdCard.textContent.includes('Tech'), 'la carte affiche le thème choisi');
    assert.ok(node.querySelector('.community-discussion-title h3')?.textContent.includes(name), 'le nouveau groupe devient actif');
    assert.ok(node.querySelector('.community-feature-card h2')?.textContent.includes(name), 'la carte du hero met le groupe à la une');

    const message = 'Quel est votre build favori pour commencer une nouvelle partie ?';
    await fill(node.querySelector('#community-comment-input'), message);
    await click(node.querySelector('.community-post-button'));
    assert.ok(node.textContent.includes(message), 'le commentaire apparaît dans le fil');

    const stored = JSON.parse(window.localStorage.getItem('letsplay_community_v1'));
    assert.equal(stored.groups.length, 1, 'le groupe est enregistré localement');
    assert.equal(stored.comments[stored.groups[0].id]?.length, 1, 'le commentaire est enregistré localement');

    await act(async () => root.unmount());
    root = createRoot(node);
    await act(async () => root.render(createCommunityApp('fr')));
    const restoredCard = [...node.querySelectorAll('.community-group-card')].find((card) => card.textContent.includes(name));
    assert.ok(restoredCard, 'le groupe persiste après remontage');
    await click(restoredCard);
    assert.ok(node.textContent.includes(message), 'le commentaire persiste après remontage');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
