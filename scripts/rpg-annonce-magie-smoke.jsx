import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { rpgJouerCreature } from '../src/games/rpgDuel.js';
import { installerDeckMaisonDeTest, passerMulligan } from './rpg-duel-start.js';

export async function checkAnnonceMagie(assert) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const deck = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons', 'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond', 'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes', 'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap((id) => [id, id]);
  installerDeckMaisonDeTest(deck);
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const click = async (el) => { assert.ok(el, 'commande présente'); assert.equal(el.disabled, false); await act(async () => el.click()); };
  const pause = async (ms = 150) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={deck} sorcierDeck={deck} rng={() => .9} />));
    const onglet = [...container.querySelectorAll('.rpg-mode-menu__switch button')].find(el => el.textContent.trim().endsWith('Deck'));
    await click(onglet); await pause();
    await click(container.querySelector('.rpg-deck-choice__button')); await pause();
    await click(container.querySelector('.rpg-deck-detail__play')); await pause();
    await passerMulligan(container, click); await pause();
    const duel = window.__RPG_DUEL__;
    duel.joueur.main = ['ashigaru-des-braises'];
    const cible = rpgJouerCreature(duel, 'joueur', 'ashigaru-des-braises').entite;
    assert.ok(cible); const pv = cible.pv;
    duel.joueur.main = ['silence-decume']; duel.sorcier.main = []; duel.sorcier.deck = [];
    await act(async () => window.__RPG_FORCE__());
    await click(container.querySelector('.rpg-btn--endturn'));
    for (let i = 0; i < 20 && duel.tour !== 'sorcier'; i++) await pause(100);
    assert.equal(duel.tour, 'sorcier');
    duel.sorcier.main = ['trait-de-braise'];
    await act(async () => window.__RPG_FORCE__());
    for (let i = 0; i < 40 && !container.querySelector('.rpg-annonce-sort'); i++) await pause(150);
    const modal = container.querySelector('.rpg-annonce-sort');
    assert.ok(modal?.classList.contains('rpg-annonce-sort--magie'), 'le sort adverse ouvre la fenêtre compacte');
    assert.match(modal.textContent, /Trait de braise/);
    assert.match(modal.textContent, /Ashigaru des braises/);
    assert.equal(cible.pv, pv, 'le sort reste en attente avant la décision');
    assert.ok(duel.sorcier.main.includes('trait-de-braise'));
    assert.ok(modal.querySelector('.rpg-annonce-sort__respond.is-response-available'), 'un contre jouable est proposé');
    await click(modal.querySelector('.rpg-annonce-sort__respond'));
    assert.ok(duel.annonce, 'répondre ne résout pas le sort');
    assert.equal(container.querySelector('.rpg-annonce-sort'), null);
    await click(container.querySelector('.rpg-annonce-sort__compact-preview'));
    assert.ok(container.querySelector('.rpg-annonce-sort--magie'), 'la fenêtre se rouvre');
    await click(container.querySelector('.rpg-annonce-sort__pass'));
    assert.equal(duel.annonce, null);
    assert.ok(!duel.sorcier.main.includes('trait-de-braise'));
    assert.ok(!duel.joueur.creatures.some((e) => e.id === cible.id), 'laisser passer résout le sort');
    // Une autre annonce peut être contrée réellement, sans subir ses dégâts.
    duel.sorcier.main = ['trait-de-braise'];
    duel.annonce = { cote: 'sorcier', carteId: 'trait-de-braise', cibleId: 'sorcier', cibleAllieeId: null };
    duel.fenetreReponse = true;
    const vie = duel.joueur.pv;
    await act(async () => window.__RPG_FORCE__());
    await click(container.querySelector('.rpg-annonce-sort--magie .rpg-annonce-sort__respond'));
    await click(container.querySelector('.rpg-hand__card[data-card-id="silence-decume"]'));
    await click(container.querySelector('.rpg-spell-confirm .rpg-btn--primary'));
    assert.equal(duel.annonce, null, 'le contre défait le sort en attente');
    assert.equal(duel.joueur.pv, vie);
    assert.ok(duel.sorcier.cimetiere.includes('trait-de-braise'));
    // L'aperçu des créatures reste inchangé.
    duel.sorcier.main = ['ashigaru-des-braises'];
    duel.annonce = { cote: 'sorcier', carteId: 'ashigaru-des-braises', cibleId: null };
    duel.fenetreReponse = true;
    await act(async () => window.__RPG_FORCE__());
    assert.ok(container.querySelector('.rpg-annonce-sort'));
    assert.equal(container.querySelector('.rpg-annonce-sort--magie'), null);
  } finally { await act(async () => root.unmount()); container.remove(); }
}
