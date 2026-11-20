// La main impaire, dans la vraie page : à trois ou cinq cartes, une carte
// fantôme invisible ouvre la main et les deux moitiés reprennent la même
// largeur — la cale tombe donc au milieu, sous le médaillon du joueur, et plus
// une carte ne vient sur son visage. À deux, quatre ou six cartes, il n'y a
// rien à équilibrer : aucune fantôme.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { installerDeckMaisonDeTest, lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const DECK = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons',
  'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond',
  'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes',
  'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap((id) => [id, id]);

// Des cartes distinctes, pour que la main ne regroupe pas les exemplaires en
// piles : c'est le nombre de cartes affichées qui compte ici.
const CARTES = [...new Set(DECK)];

export async function checkCaleMain(assert) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  installerDeckMaisonDeTest(DECK);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const attendre = async () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 120)); });
  const click = async (el, message = 'la commande existe') => {
    assert.ok(el, message);
    assert.notEqual(el.disabled, true, message);
    await act(async () => el.click());
    await attendre();
  };
  const main = () => container.querySelector('.rpg-hand');
  const enfants = () => [...(main()?.children ?? [])];
  const cale = () => container.querySelector('.rpg-hand__cale-fantome');
  const ecart = () => enfants().findIndex((enfant) => enfant.classList.contains('rpg-hand__ecart'));
  const cartes = () => enfants().filter((enfant) => enfant.classList?.contains('rpg-hand__card'));

  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={DECK} sorcierDeck={DECK} rng={() => 0.9} />));
    await attendre();
    await lancerDuelDepuisMenu(container, click);
    await attendre();
    await passerMulligan(container, click);
    await attendre();

    const duel = window.__RPG_DUEL__;
    assert.ok(duel, 'le duel est monté');

    const poserMain = async (nombre) => {
      duel.joueur.main = CARTES.slice(0, nombre);
      await act(async () => window.__RPG_FORCE__());
      await attendre();
    };

    // 1. Une main paire n'a besoin de rien : la cale est au milieu, sans fantôme.
    for (const nombre of [2, 4, 6]) {
      await poserMain(nombre);
      assert.equal(cartes().length, nombre, `les ${nombre} cartes sont en main`);
      assert.equal(cale(), null, `${nombre} cartes : aucune carte fantôme`);
      assert.equal(main().classList.contains('is-main-impaire'), false, `${nombre} cartes : main paire`);
      assert.equal(ecart(), Math.floor(nombre / 2),
        `${nombre} cartes : la cale tombe après ${nombre / 2} cartes`);
    }

    // 2. Une main impaire ouvre la fantôme : la cale reste au milieu du contenu.
    for (const nombre of [1, 3, 5, 7]) {
      await poserMain(nombre);
      assert.equal(cartes().length, nombre, `les ${nombre} cartes sont en main`);
      const fantome = cale();
      assert.ok(fantome, `${nombre} cartes : la carte fantôme ouvre la main`);
      assert.equal(fantome.getAttribute('aria-hidden'), 'true', 'la fantôme est invisible aux lecteurs d’écran');
      assert.equal(fantome.tagName, 'SPAN', 'la fantôme n’est pas un bouton');
      assert.equal(enfants()[0], fantome, `${nombre} cartes : la fantôme est le premier enfant`);
      assert.equal(main().classList.contains('is-main-impaire'), true, `${nombre} cartes : main impaire`);
      // La cale se pose après la fantôme et la moitié des cartes.
      assert.equal(ecart(), 1 + Math.floor(nombre / 2),
        `${nombre} cartes : la cale tombe après la fantôme et ${Math.floor(nombre / 2)} cartes`);
      // Autant de cartes de part et d'autre de la cale, fantôme comprise.
      const avant = ecart();
      const apres = enfants().length - ecart() - 1; // tout sauf la cale elle-même
      assert.equal(avant, apres, `${nombre} cartes : les deux moitiés sont égales (${avant} / ${apres})`);
    }

    // 3. La carte fantôme n'est jamais cliquable : la main garde ses cartes.
    await poserMain(5);
    assert.equal(cale().onclick, null);
    assert.equal(cale().querySelector('button'), null, 'aucun bouton dans la fantôme');

    // 4. Une main vide ne pose rien.
    await poserMain(0);
    assert.equal(cale(), null, 'main vide : pas de fantôme');
    assert.equal(container.querySelector('.rpg-hand__ecart'), null, 'main vide : pas de cale');
  } finally {
    root.unmount();
    container.remove();
  }
}
