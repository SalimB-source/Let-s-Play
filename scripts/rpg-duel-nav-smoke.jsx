/**
 * Entrée SSR de `scripts/rpg-duel-nav-check.mjs` — `npm run check:rpg-duel-nav`.
 *
 * La barre du duel au doigt : `rpg-mobile.css` replie ses six commandes dans
 * un seul bouton hamburger et ne déplie le panneau que sur `.is-open`. Ce
 * scénario monte la page réelle avec un pointeur grossier. Avant de lancer un
 * duel, il vérifie aussi que Paramètres et la déconnexion PC sont utilisables
 * depuis le menu principal ; il joue ensuite le geste :
 *
 *   1. le hamburger s'affiche, le panneau reste replié et `aria-expanded` est
 *      à `false` ;
 *   2. un appui sur le hamburger déplie le panneau — la classe `is-open` que
 *      la feuille attend — et l'icône passe de ☰ à ✕ ;
 *   3. le panneau porte bien les trois modes (Menu, Deck, Catalogue), les
 *      réglages (son, 3D, plein écran) et l’entrée Messagerie — le canal des
 *      défis du duel en ligne, ouverte en voile au-dessus de la table ;
 *   4. un geste hors de la barre referme le panneau ;
 *   5. rouvert, le mode Deck s'ouvre depuis le panneau : la barre du duel
 *      disparaît avec la table et l'écran des decks prend la place.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthContext } from '../src/auth/AuthContext.jsx';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkRpgDuelNav(assert, { sonSeulement = false } = {}) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  const click = (element) => act(async () => { element.click(); });
  const settle = (ms = 20) => act(async () => { await sleep(ms); });
  let deconnexions = 0;
  const comptePc = {
    id: 'compte-pc-test',
    email: 'joueur@example.com',
    user_metadata: { gamertag: 'Joueur PC' },
  };
  try {
    window.letsPlayDesktop = {};
    window.localStorage.setItem('letsplay_sablier_sfx_volume_v1', '0.35');
    window.localStorage.removeItem('letsplay_sablier_voice_volume_v1');
    await act(async () => root.render(
      <AuthContext.Provider value={{
        user: comptePc,
        session: { user: comptePc },
        isDemo: false,
        signOut: async () => { deconnexions += 1; },
      }}>
        <RpgDuelPage rng={() => 0.999} />
      </AuthContext.Provider>,
    ));
    await settle();

    // Paramètres doit être disponible depuis le menu, avant qu'aucune partie ne
    // soit lancée : l'écran et ses commandes ne dépendent pas du duel.
    assert.equal(node.querySelector('.rpg-battle')?.dataset.scene, 'menu', 'le test commence hors partie');
    // La messagerie du site apparaît dans le jeu dès le menu, dans son propre
    // onglet : c’est elle qui permet de se lancer des duels en ligne (carte
    // « Défi du Sablier »), et la fenêtre sociale du site reste peinte sous la
    // couche plein écran du jeu.
    const ongletMessagerie = [...node.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.includes('Messagerie'));
    assert.ok(ongletMessagerie, 'la barre des modes du menu porte l’onglet Messagerie');
    assert.ok(ongletMessagerie.querySelector('.rpg-mode-menu__messagerie-mark'),
      'l’onglet porte la bulle « Let’s Talk »');
    // L’onglet doit SE LIRE : un onglet réduit à sa bulle, sans le mot, ne se
    // reconnaît pas — la barre des modes est écrite pour sept onglets et le
    // dernier disparaissait derrière le bord de l’écran (701 – 1100 px).
    assert.ok(ongletMessagerie.querySelector('.rpg-mode-menu__onglet-libelle')?.textContent.includes('Messagerie'),
      'l’onglet Messagerie porte son libellé : un onglet sans mot ne se reconnaît pas');
    assert.ok(ongletMessagerie.querySelector('.rpg-mode-menu__messagerie-pastille') === null
      || ongletMessagerie.getAttribute('aria-label')?.includes('Messagerie'),
      'la pastille des non-lus de l’onglet est annoncée par son aria-label');
    const ongletsSecondaires = [...node.querySelectorAll('.rpg-mode-menu__switch button.rpg-mode-menu__onglet--secondaire')];
    assert.equal(ongletsSecondaires.length, 3,
      'Profil, Paramètres et Messagerie forment le groupe secondaire de la barre');
    assert.equal(node.querySelectorAll('.rpg-mode-menu__switch button.rpg-mode-menu__onglet--groupe-secondaire').length, 1,
      'un seul onglet ouvre visuellement ce groupe');
    const settingsHorsPartie = [...node.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.includes('Paramètres'));
    assert.ok(settingsHorsPartie, 'le menu principal expose Paramètres avant une partie');
    await click(settingsHorsPartie);
    let ecranSettingsHorsPartie = node.querySelector('.rpg-settings');
    assert.ok(ecranSettingsHorsPartie, 'l’onglet ouvre son écran hors partie');
    assert.equal(node.querySelector('.rpg-card-catalogue'), null,
      'Paramètres affiche son propre écran, sans rendre le Catalogue en arrière-plan');
    const ongletCatalogue = [...node.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.includes('Catalogue'));
    assert.ok(ongletCatalogue, 'le menu principal expose Catalogue');
    await click(ongletCatalogue);
    assert.ok(node.querySelector('.rpg-card-catalogue'), 'le catalogue reste visible depuis son propre onglet');
    await click(settingsHorsPartie);
    ecranSettingsHorsPartie = node.querySelector('.rpg-settings');
    const reglageVoix = ecranSettingsHorsPartie.querySelector('#rpg-settings-voice-volume');
    const reglageSons = ecranSettingsHorsPartie.querySelector('#rpg-settings-sfx-volume');
    assert.ok(reglageVoix && reglageSons, 'les voix et les bruitages ont chacun leur curseur');
    assert.equal(reglageVoix.value, '35', 'le volume des voix reprend l’ancien réglage des sons');
    assert.equal(window.localStorage.getItem('letsplay_sablier_voice_volume_v1'), '0.35');
    const boutonVoix = ecranSettingsHorsPartie.querySelector('[aria-label="Couper les voix des personnages"]');
    await click(boutonVoix);
    assert.equal(reglageVoix.value, '0');
    assert.equal(reglageSons.value, '35', 'couper les voix ne change pas les bruitages');
    assert.equal(window.localStorage.getItem('letsplay_sablier_voice_volume_v1'), '0');
    await click(boutonVoix);
    assert.equal(reglageVoix.value, '35', 'réactiver les voix restaure leur volume précédent');
    if (sonSeulement) return;
    const decorHorsPartie = ecranSettingsHorsPartie.querySelector('.rpg-settings__decor3d');
    const sonHorsPartie = ecranSettingsHorsPartie.querySelector('.rpg-settings__mute-all');
    assert.ok(decorHorsPartie && sonHorsPartie, 'les réglages 3D et son sont disponibles hors partie');
    const decorAvant = decorHorsPartie.getAttribute('aria-pressed');
    await click(decorHorsPartie);
    assert.notEqual(decorHorsPartie.getAttribute('aria-pressed'), decorAvant, 'le réglage 3D réagit hors partie');
    const sonAvant = sonHorsPartie.getAttribute('aria-pressed');
    await click(sonHorsPartie);
    assert.notEqual(sonHorsPartie.getAttribute('aria-pressed'), sonAvant, 'le réglage audio réagit hors partie');
    await click(sonHorsPartie);
    await click(decorHorsPartie);

    const carteCompte = ecranSettingsHorsPartie.querySelector('.rpg-settings__account');
    assert.ok(carteCompte, 'la version PC affiche les actions de compte dans Paramètres');
    const boutonDeconnexion = carteCompte.querySelector('.rpg-settings__signout');
    assert.ok(boutonDeconnexion, 'Paramètres PC contient le bouton Se déconnecter');
    await click(boutonDeconnexion);
    await settle();
    assert.equal(deconnexions, 1, 'le bouton appelle la déconnexion du compte');

    // L’onglet Messagerie ouvre le panneau de messagerie du jeu : sans compte
    // (ce scénario), l’invitation à se connecter — comme la page /messages.
    await click(ongletMessagerie);
    assert.ok(node.querySelector('.rpg-messagerie--ecran'),
      'l’onglet Messagerie ouvre son panneau dans le jeu, sans quitter la page');

    // L'onglet Jouer est de retour : il ramène à l'accueil depuis l'écran
    // Messagerie, puis le scénario lance un duel depuis le Deck.
    const ongletJouer = [...node.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.getAttribute('aria-label') === 'Jouer');
    assert.ok(ongletJouer, 'l’onglet Jouer est de retour dans la barre');
    await click(ongletJouer);
    await lancerDuelDepuisMenu(node, click);
    await passerMulligan(node, click);
    await settle(50);

    const shell = node.querySelector('.rpg-battle');
    assert.ok(shell.classList.contains('rpg-battle--touch'),
      'la page montée avec un pointeur grossier prend la présentation tactile');
    const burger = node.querySelector('.rpg-duel-nav__burger');
    const menu = node.querySelector('.rpg-duel-nav__menu');
    assert.ok(burger && menu, 'la barre du duel porte son bouton hamburger et son panneau');
    assert.equal(burger.getAttribute('aria-expanded'), 'false', 'le panneau est annoncé replié au départ');
    assert.equal(menu.classList.contains('is-open'), false, 'le panneau ne s’ouvre pas avant le geste');

    await click(burger);
    assert.equal(burger.getAttribute('aria-expanded'), 'true', 'le hamburger annonce le panneau ouvert');
    assert.equal(menu.classList.contains('is-open'), true,
      'le hamburger pose `is-open` : c’est la classe que `rpg-mobile.css` déplie en panneau');
    assert.equal(burger.querySelector('.rpg-duel-nav__burger-icon').textContent, '✕',
      'le hamburger devient une croix une fois le panneau ouvert');
    const commandesDirectes = [...menu.querySelectorAll(':scope > button')];
    assert.deepEqual(commandesDirectes.slice(0, 4).map((bouton) => bouton.textContent.trim()),
      ['Menu', 'Deck', 'Catalogue', 'Paramètres'],
      'le panneau porte les trois modes du duel et l’onglet Paramètres');
    assert.equal(commandesDirectes.length, 6,
      'les boutons directs du panneau sont Menu, Deck, Catalogue, Paramètres, Messagerie et Plein écran');
    // La messagerie du site fait partie du panneau : c’est par elle que les
    // défis du Sablier se lancent. Sans fournisseur de messagerie (ce
    // scénario), elle ouvre le voile du jeu ; avec un compte, le même
    // emplacement montre la liste des discussions.
    const entreeMessagerie = menu.querySelector(':scope > [data-rpg-messagerie="duel"]');
    assert.ok(entreeMessagerie, 'le panneau porte l’entrée Messagerie (les défis passent par elle)');
    assert.match(entreeMessagerie.textContent, /Messagerie/, 'l’entrée Messagerie est libellée');
    // Le voile s’ouvre au-dessus de la table et se referme sans quitter le duel.
    await click(entreeMessagerie);
    assert.ok(node.querySelector('.rpg-messagerie--volet'),
      'l’entrée Messagerie du duel ouvre le voile du jeu au-dessus de la table');
    assert.ok(node.querySelector('.card-table'), 'la table reste montée sous le voile : le duel n’est pas quitté');
    await click(node.querySelector('.rpg-messagerie--volet [aria-label="Fermer"]'));
    assert.equal(node.querySelector('.rpg-messagerie--volet'), null,
      'le bouton Fermer rend la table au joueur');

    // L'onglet Paramètres déplie l'option 3D et le contrôle du volume des sons et musiques.
    const ongletParametres = menu.querySelector('.rpg-duel-nav__settings-tab');
    const panneauParametres = menu.querySelector('.rpg-duel-nav__settings');
    assert.ok(panneauParametres.querySelector('.rpg-duel-nav__slider--voice'), 'le duel dispose aussi du réglage des voix');
    assert.ok(ongletParametres && panneauParametres, 'le menu porte l’onglet et le panneau Paramètres');
    assert.equal(ongletParametres.getAttribute('aria-expanded'), 'false', 'l’onglet Paramètres est replié au départ');
    assert.equal(panneauParametres.classList.contains('is-open'), false, 'le panneau Paramètres attend l’ouverture');
    await click(ongletParametres);
    assert.equal(ongletParametres.getAttribute('aria-expanded'), 'true', 'l’onglet Paramètres annonce son ouverture');
    assert.equal(panneauParametres.classList.contains('is-open'), true, 'le panneau Paramètres se déplie');
    assert.ok(panneauParametres.querySelector('.rpg-duel-nav__decor3d'), 'l’option 3D est rangée dans l’onglet Paramètres');
    assert.ok(panneauParametres.querySelector('.rpg-duel-nav__slider--sfx'), 'le contrôle du volume des sons du jeu est dans Paramètres');
    assert.ok(panneauParametres.querySelector('.rpg-duel-nav__slider--music'), 'le contrôle du volume des musiques est dans Paramètres');
    assert.ok(panneauParametres.querySelector('.rpg-duel-nav__sound'), 'la coupure générale du son est dans Paramètres');
    const boutonDeconnexionEnPartie = panneauParametres.querySelector('.rpg-duel-nav__signout');
    assert.ok(boutonDeconnexionEnPartie, 'Paramètres dans le duel PC contient aussi la déconnexion');
    await click(boutonDeconnexionEnPartie);
    await settle();
    assert.equal(deconnexions, 2, 'le panneau Paramètres du duel appelle la déconnexion du compte');

    // Le premier geste hors de la barre referme le panneau (le fond de table
    // est un `pointerdown` comme un autre).
    await act(async () => {
      node.querySelector('.card-table').dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
    });
    assert.equal(menu.classList.contains('is-open'), false, 'un geste hors de la barre referme le panneau');
    assert.equal(panneauParametres.classList.contains('is-open'), false, 'un geste hors de la barre referme aussi Paramètres');

    // Rouvert, le mode Deck mène à son écran : la table et sa barre s'effacent.
    await click(burger);
    const deck = [...menu.querySelectorAll('button')].find((bouton) => bouton.textContent.trim() === 'Deck');
    await click(deck);
    assert.equal(node.querySelector('.rpg-duel-nav'), null, 'quitter le duel retire sa barre de navigation');
    assert.ok(node.querySelector('.rpg-mode-menu--decks'),
      'le mode Deck s’ouvre depuis le panneau du hamburger');

    // Le menu principal porte aussi un onglet Paramètres avec l'option 3D et les volumes.
    const boutonMenuParametres = [...node.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.includes('Paramètres'));
    assert.ok(boutonMenuParametres, 'la barre des modes porte l’onglet Paramètres');
    await click(boutonMenuParametres);
    const ecranParametres = node.querySelector('.rpg-settings');
    assert.ok(ecranParametres, 'l’onglet Paramètres affiche son écran');
    assert.ok(ecranParametres.querySelector('.rpg-settings__decor3d'), 'l’écran Paramètres contient l’option 3D');
    assert.ok(ecranParametres.querySelector('.rpg-settings__slider--sfx'), 'l’écran Paramètres contient le volume des sons du jeu');
    assert.ok(ecranParametres.querySelector('.rpg-settings__slider--voice'), 'l’écran Paramètres contient le volume des voix');
    assert.ok(ecranParametres.querySelector('.rpg-settings__slider--music'), 'l’écran Paramètres contient le volume des musiques');
  } finally {
    await act(async () => root.unmount());
    node.remove();
  }
}
