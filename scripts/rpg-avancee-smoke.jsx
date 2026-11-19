import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature } from '../src/games/rpgDuel.js';
import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

/** L'avancée, jouée dans la vraie page : une créature choisie montre ses cases,
 *  un clic la déplace, et elle peut encore frapper de sa nouvelle place. */
export async function checkAvancee(assert) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const deck = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons',
    'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond',
    'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes',
    'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap((id) => [id, id]);
  installerDeckMaisonDeTest(deck);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const click = async (el) => {
    assert.ok(el, 'élément présent');
    assert.equal(el.disabled, false);
    await act(async () => el.click());
  };
  const card = (id) => container.querySelector(`.rpg-card[data-entity-id="${id}"]`);
  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={deck} sorcierDeck={deck} rng={() => .9} />));
    const pause = async () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    const onglet = [...container.querySelectorAll('.rpg-mode-menu__switch button')].find((el) => el.textContent.trim().endsWith('Deck'));
    await click(onglet); await pause();
    await click(container.querySelector('.rpg-deck-choice__button')); await pause();
    await click(container.querySelector('.rpg-deck-detail__play')); await pause();
    await passerMulligan(container, click); await pause();

    const duel = window.__RPG_DUEL__;
    assert.ok(duel, 'le duel est monté');
    assert.equal(duel.lignes, true, 'la page joue toujours sur les deux lignes');
    for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    duel.sorcier.main = [];
    const poser = (cote, id) => {
      duel[cote].invocationNormaleJouee = false;
      duel[cote].main.push(id);
      const tour = duel.tour; duel.tour = cote;
      const res = rpgJouerCreature(duel, cote, id);
      duel.tour = tour;
      assert.ok(res.ok, `${id} doit entrer en jeu : ${res.raison}`);
      res.entite.ready = true;
      res.entite.bouge = false;
      return res.entite;
    };
    const nous = poser('joueur', 'le-renegat');
    const proie = poser('sorcier', 'le-renegat');
    await act(async () => window.__RPG_FORCE__());

    // Choisir la créature ouvre la phase : ses cases d'avancée sont des boutons.
    await click(card(nous.id));
    await act(async () => window.__RPG_FORCE__());
    const cases = [...container.querySelectorAll('.rpg-creature-slot--deplacement')];
    assert.ok(cases.length > 0, 'la créature choisie montre des cases d’avancée');
    assert.ok(cases.every((el) => el.dataset.creatureSlotDeplacement === 'true'));
    // On reste chez soi : la case choisie est dans notre rangée.
    const chezNous = cases.filter((el) => el.closest('.card-row--equipe'));
    assert.ok(chezNous.length > 0, 'elle peut manœuvrer dans son propre camp');
    const avant = nous.emplacement;
    const index = Number(chezNous[0].dataset.caseIndex);
    assert.notEqual(index, avant, 'une case d’avancée n’est jamais celle qu’on occupe');
    await click(chezNous[0]);
    await pause();
    assert.equal(nous.emplacement, index, 'le clic déplace la créature');
    assert.equal(nous.bouge, true, 'une seule case par tour');
    assert.ok(duel.log.some((ligne) => /avance en/.test(ligne)), 'le journal raconte le pas');
    await act(async () => window.__RPG_FORCE__());
    assert.equal(container.querySelectorAll('.rpg-creature-slot--deplacement').length, 0,
      'la créature déplacée ne propose plus de case');
    assert.ok(proie, 'la proie adverse est toujours là');

    // La trouée : le front adverse est vide, la créature passe chez lui — et
    // se dessine dans sa rangée, tout en restant la nôtre pour le clic.
    proie.emplacement = 3;
    proie.avancee = true;
    const perceur = poser('joueur', 'cotre-de-course');
    await act(async () => window.__RPG_FORCE__());
    await click(card(perceur.id));
    await act(async () => window.__RPG_FORCE__());
    const chezLui = [...container.querySelectorAll('.card-row--ennemi .rpg-creature-slot--deplacement')];
    assert.ok(chezLui.length > 0, 'la case du front adverse est libre : la trouée est ouverte');
    await click(chezLui[0]);
    await pause();
    assert.equal(perceur.campPose, 'sorcier', 'elle a franchi la ligne');
    const dessinee = card(perceur.id);
    assert.ok(dessinee, 'elle est toujours dessinée');
    assert.ok(dessinee.closest('.card-row--ennemi'), 'dans la rangée qu’elle occupe');
    assert.ok(dessinee.classList.contains('rpg-card--equipe'), 'avec son camp, pas celui de la rangée');
    assert.ok(!dessinee.classList.contains('rpg-card--ennemi'), 'elle ne prend pas la teinte adverse');
    // Une seule figurine : la créature a **quitté** sa rangée. Sans ce tri,
    // elle restait aussi chez elle et le clic semblait créer une copie.
    assert.equal(container.querySelectorAll(`.rpg-card[data-entity-id="${perceur.id}"]`).length, 1,
      'une créature qui a percé n’est dessinée qu’une fois, dans la rangée qu’elle occupe');
    assert.equal(container.querySelector(`.card-row--equipe .rpg-card[data-entity-id="${perceur.id}"]`), null,
      'elle a quitté la rangée du joueur');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}
