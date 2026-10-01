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

  try {
    await act(async () => root.render(createCommunityApp('fr')));
    assert.ok(node.textContent.includes('Les joueurs de soulslike'), 'le groupe exemple Soulslike est affiché');
    assert.ok(node.textContent.includes('Boss impossibles'), 'la description du groupe exemple est affichée');
    assert.equal(node.querySelectorAll('.community-comment').length, 3, 'les commentaires de départ sont visibles');

    await click(node.querySelector('.community-hero-actions .community-button-primary'));
    const name = 'Les explorateurs du Rift';
    await fill(node.querySelector('.community-create-form input[type="text"]'), name);
    await fill(node.querySelector('.community-create-form textarea'), 'Un groupe pour partager nos builds, nos découvertes et nos astuces de jeu.');
    await fill(node.querySelector('.community-create-row input'), 'Rift, coop');
    await click(node.querySelector('.community-modal-actions button[type="submit"]'));

    const createdCard = [...node.querySelectorAll('.community-group-card')].find((card) => card.textContent.includes(name));
    assert.ok(createdCard, 'le groupe créé rejoint la liste');
    assert.ok(node.querySelector('.community-discussion-title h3')?.textContent.includes(name), 'le nouveau groupe devient actif');

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
