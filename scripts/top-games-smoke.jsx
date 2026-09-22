import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PlayerGearEditor } from '../src/pages/Auth';
import { TESTED_GAMES_CATALOG } from '../src/lib/gameLibrary';

export async function checkTopGames(assert) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  // 10 jeux déjà testés : le draft est propre à l'ouverture (au-delà du cap de
  // 10, l'éditeur serait « dirty » dès le premier rendu).
  const games = TESTED_GAMES_CATALOG.slice(0, 10).map(g => g.title);
  let saved;
  const t = {
    testedGamesHeading: 'Ton TOP 10 des jeux all-time',
    editTopGames: 'Modifier',
    closeTopGames: 'Fermer',
    saveGear: 'Enregistrer',
    saving: 'Enregistrement…',
    removeGame: 'Retirer',
    addGame: 'Ajouter',
    gameTested: 'Testé',
    gamesSearchPlaceholder: 'Rechercher',
    profileSaved: 'Profil enregistré',
    profileSaveError: 'Erreur',
    filterAll: 'Toutes',
    filterByConsole: 'Filtrer par console',
  };
  // Hôte « démo » : comme le hub authentique, les métadonnées du profil sont
  // rafraîchies après chaque sauvegarde (sinon le draft resterait marqué
  // « sale » et ENREGISTRER ne disparaîtrait jamais après l'enregistrement).
  const DemoHost = () => {
    const [demoProfile, setDemoProfile] = React.useState({ user_metadata: { testedGames: games } });
    return (
      <PlayerGearEditor
        t={t}
        isDemo
        meta={demoProfile.user_metadata}
        updateDemoProfile={(fn) => setDemoProfile((prev) => { saved = fn(prev); return saved; })}
      />
    );
  };
  await act(async () => root.render(<DemoHost />));

  const click = async el => { assert.ok(el); await act(async () => el.click()); };
  const button = text => [...node.querySelectorAll('button')].find(el => el.textContent === text);
  const saveButtons = () => [...node.querySelectorAll('.player-gear-save-row button')];
  const gameRow = title => [...node.querySelectorAll('.player-game-row')]
    .find(row => row.querySelector('.player-game-row-title')?.textContent === title)
    ?.querySelector('.player-game-row-btn');
  const chipRemove = index => node.querySelectorAll('.player-game-chip-remove')[index];
  const pillTitles = () => [...node.querySelectorAll('.player-game-pill-title')].map(el => el.textContent);

  assert.equal(node.querySelectorAll('.player-game-pill').length, 10);
  for (let rank = 1; rank <= 3; rank++) assert.equal(node.querySelectorAll(`.player-game-pill-top-${rank}`).length, 1);
  assert.equal(node.querySelectorAll('.player-game-pill:not([class*="player-game-pill-top-"])').length, 7);
  assert.deepEqual(pillTitles(), games);
  assert.equal(node.querySelector('.player-games-filter-container'), null);
  assert.equal(node.querySelector('.player-games-list'), null);
  // Plus de bouton Reset : une seule action Modifier/Fermer dans l'en-tête, et
  // ENREGISTRER n'apparaît hors filtre que si une liste a été modifiée.
  assert.equal(button('Reset'), undefined);
  assert.equal(node.querySelectorAll('.player-games-action-btn').length, 1);
  assert.equal(saveButtons().length, 0);

  await click(button('Modifier'));
  assert.equal(button('Fermer').getAttribute('aria-expanded'), 'true');
  assert.ok(node.querySelector('.player-games-filter-container'));
  assert.ok(node.querySelector('.player-games-search'));
  assert.ok([...node.querySelectorAll('.player-game-row-btn:not(.added)')].every(el => el.disabled));
  // ENREGISTRER reste visible dès l'ouverture du filtre, même sans modification.
  assert.equal(saveButtons().length, 1);
  assert.equal(saveButtons()[0].textContent, 'Enregistrer');
  assert.equal(saveButtons()[0].disabled, false);

  // Filtre console actif mais draft inchangé -> ENREGISTRER ferme le filtre
  // sans rien écrire (il remplace l'ancien Reset).
  await click(node.querySelectorAll('.player-games-filter-btn')[1]);
  assert.equal(node.querySelectorAll('.player-games-filter-btn')[1].getAttribute('aria-pressed'), 'true');
  assert.ok(node.querySelector('.player-games-list'));
  assert.equal(saveButtons().length, 1);
  await click(button('Enregistrer'));
  assert.equal(saved, undefined);
  assert.equal(node.querySelector('.player-games-list'), null);
  assert.equal(saveButtons().length, 0);
  assert.equal(button('Modifier').getAttribute('aria-expanded'), 'false');

  await click(button('Modifier'));
  assert.equal(node.querySelector('.player-games-filter-btn').getAttribute('aria-pressed'), 'true');
  assert.equal(node.querySelector('input[type="search"]').value, '');
  assert.equal(saveButtons().length, 1);

  // Cap atteint : retirer puis réajouter déplace le jeu en fin de TOP 10.
  await click(chipRemove(0));
  assert.equal(node.querySelectorAll('.player-game-pill').length, 9);
  await click(gameRow(games[0]));
  assert.equal(node.querySelectorAll('.player-game-pill').length, 10);
  assert.deepEqual(pillTitles(), [...games.slice(1), games[0]]);

  // Draft modifié -> ENREGISTRER sauvegarde (démo) puis ferme le filtre.
  await click(button('Enregistrer'));
  assert.equal(saved.user_metadata.testedGames.length, 10);
  assert.deepEqual(saved.user_metadata.testedGames, [...games.slice(1), games[0]]);
  assert.equal(node.querySelector('.player-games-list'), null);
  assert.equal(saveButtons().length, 0);
  assert.equal(button('Modifier').getAttribute('aria-expanded'), 'false');

  await act(async () => root.unmount());
  console.log('TOP 10: podium, cap, editor, ENREGISTRER visible + ferme le filtre, and demo persistence passed.');
}
