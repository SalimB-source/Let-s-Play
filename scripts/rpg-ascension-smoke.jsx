import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { RPG_RENDU_MOBA } from '../src/games/RpgDuelPage.jsx';
import RpgMobaBoard from '../src/games/RpgMobaBoard.jsx';
import { RPG_DECK_SOLEIL_ROUGE_BASE } from '../src/games/rpgCards.js';
import { rpgJouerCreature } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { installerDeckMaisonDeTest, lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const DRAGON = 'samourai-du-dragon-rouge';
const verifierDragon = (assert, entite) => {
  assert.ok(entite, 'Dragon réellement invoqué');
  assert.equal(entite.atk, 7); assert.equal(entite.pv, 7);
  assert.equal(entite.overkill, true); assert.equal(entite.esquive, true);
  assert.equal(entite.esquiveChance, .15); assert.equal(entite.defenseur, true);
};
const pause = (ms = 100) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
const monter = () => { const container = document.createElement('div'); document.body.append(container); return { container, root: createRoot(container) }; };
const outils = (assert, container) => {
  const t = {
    click: async (node) => { assert.ok(node, 'commande présente'); assert.equal(node.disabled, false, 'commande active'); await act(async () => node.click()); },
    zone: (cote = 'joueur') => container.querySelector(`[data-ascension-side="${cote}"]`),
    reserve: () => container.querySelector('.rpg-ascension-popover'),
    face: () => container.querySelector('[data-ascension-reserve-card]'),
    apercu: () => container.querySelector('.rpg-ascension-card-preview'),
    preparer: () => container.querySelector('.rpg-ascension-prepare'),
    rituel: () => container.querySelector('.rpg-ascension-ritual'),
    materiau: (id) => container.querySelector(`[data-ascension-material="${id}"]`),
    invoquer: () => container.querySelector('.rpg-ascension-invoke'),
    echapper: async (node = document.activeElement) => { await act(async () => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))); await pause(20); },
  };
  t.ouvrirRituel = async () => { await t.click(t.zone()); await t.click(t.face()); await t.click(t.preparer()); };
  return t;
};

export async function checkAscensionDuel(assert, tactile = false) {
  Object.defineProperties(window, { innerWidth: { value: tactile ? 844 : 1440, configurable: true }, innerHeight: { value: tactile ? 390 : 900, configurable: true } });
  window.matchMedia = (query) => ({ matches: query.includes('reduced-motion') || (tactile && !query.includes('hover')), addEventListener() {}, removeEventListener() {} });
  if (tactile) window.LetsPlayAndroid = {};
  window.localStorage.setItem('letsplay_sablier_anim_reduite_v1', 'on');
  installerDeckMaisonDeTest(RPG_DECK_SOLEIL_ROUGE_BASE);
  const { container, root } = monter(); const t = outils(assert, container);
  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={RPG_DECK_SOLEIL_ROUGE_BASE} sorcierDeck={RPG_DECK_SOLEIL_ROUGE_BASE} rng={() => .9} />));
    await lancerDuelDepuisMenu(container, t.click); await pause(); await passerMulligan(container, t.click); await pause();
    const duel = window.__RPG_DUEL__; assert.ok(duel);
    duel.joueur.reserveAscension = [DRAGON]; duel.sorcier.reserveAscension = [DRAGON];
    duel.joueur.manaChoixEnAttente = null; duel.sorcier.main = []; duel.sorcier.deck = [];
    const corps = ['ronin-du-soleil-rouge', 'onna-musha-des-cendres', 'hatamoto-des-cendres'].map((id) => {
      duel.joueur.invocationNormaleJouee = false; duel.joueur.main.push(id);
      const res = rpgJouerCreature(duel, 'joueur', id); assert.ok(res.ok, res.raison); return res.entite;
    });
    duel.joueur.main = []; await act(async () => window.__RPG_FORCE__());
    assert.equal(container.querySelectorAll('[data-ascension-side]').length, 2);
    assert.equal(Boolean(container.querySelector('.rpg-battle--touch')), tactile);
    const avant = JSON.stringify(duel);
    await t.click(t.zone());
    assert.ok(t.reserve()); assert.equal(t.reserve().getAttribute('aria-modal'), 'false');
    assert.equal(t.zone().getAttribute('aria-expanded'), 'true');
    assert.ok(t.face().classList.contains('rpg-card'), 'vrai rendu TableCard');
    assert.ok(document.activeElement === t.face(), 'la carte de réserve reçoit le focus à l’ouverture');
    assert.equal(t.face().hasAttribute('data-entity-id'), false, 'une face de réserve n’est pas une présence du champ');
    assert.equal(t.face().querySelector('.rpg-card__foot').textContent.replace(/\s/g, ''), '77');
    assert.match(t.face().querySelector('.rpg-card__img').getAttribute('src'), /ascension-dragon-humanoide-v2/);
    for (const cle of ['overkill', 'esquive', 'defenseur']) assert.ok(t.face().querySelector(`[data-effet="${cle}"]`), cle);
    assert.equal(container.querySelectorAll('[data-ascension-material]').length, 0, 'ouvrir la réserve ne sélectionne aucun sacrifice');
    assert.equal(t.invoquer(), null, 'un clic sur une carte ne peut pas invoquer directement');
    await t.click(t.face());
    assert.ok(t.apercu()); assert.equal(t.preparer().disabled, false);
    for (const cle of ['overkill', 'esquive', 'defenseur']) assert.ok(t.apercu().querySelector(`[data-pastille="${cle}"]`), cle);
    assert.equal(container.querySelector('.card-table').hasAttribute('inert'), true, 'seul l’aperçu modal neutralise le plateau');
    assert.equal(JSON.stringify(duel), avant, 'consultation sans mutation');
    await t.echapper();
    assert.equal(t.apercu(), null); assert.ok(t.reserve()); assert.ok(document.activeElement === t.face(), 'retour à la face cliquée');
    if (tactile) {
      await t.click(t.face());
      await act(async () => { assert.equal(window.letsPlayGameBack(), true); }); await pause(20);
      assert.ok(!t.apercu() && t.reserve(), 'Retour Android ferme d’abord l’aperçu');
      await act(async () => { assert.equal(window.letsPlayGameBack(), true); }); await pause(20);
    } else await t.echapper();
    assert.equal(t.reserve(), null); assert.ok(document.activeElement === t.zone());
    await t.click(t.zone('sorcier')); await t.click(t.face());
    assert.ok(t.apercu()); assert.equal(t.preparer(), null, 'consultation adverse uniquement');
    await t.click(t.apercu().querySelector('.rpg-ascension-preview-close')); await pause(20); await t.echapper();
    await t.ouvrirRituel();
    assert.equal(t.reserve(), null); assert.ok(t.rituel());
    assert.equal(container.querySelector('.card-table').hasAttribute('inert'), false, 'plateau accessible pendant le choix');
    assert.ok(t.materiau(corps[0].id).closest('.card-row--equipe'), 'sélection sur les vrais corps');
    await t.click(t.materiau(corps[0].id)); await t.click(t.materiau(corps[2].id));
    assert.ok(t.rituel().querySelector('.rpg-ascension-total.is-invalid')); assert.equal(t.invoquer().disabled, true);
    assert.equal(t.materiau(corps[1].id).disabled, true, 'pas de troisième sacrifice');
    await t.click(t.materiau(corps[2].id)); await t.click(t.materiau(corps[1].id));
    assert.ok(t.rituel().querySelector('.rpg-ascension-total.is-exact')); assert.equal(t.invoquer().disabled, false);
    await t.click(container.querySelector('.rpg-btn--endturn'));
    assert.equal(JSON.stringify(duel), avant, 'aucune attaque ni fin de tour pendant la sélection');
    const presences = duel.joueur.creatures;
    duel.joueur.creatures = presences.filter((e) => e.id !== corps[0].id);
    const sansVictime = JSON.stringify(duel); await t.click(t.invoquer());
    assert.ok(t.rituel()); assert.equal(JSON.stringify(duel), sansVictime, 'revalidation sans paiement partiel');
    duel.joueur.creatures = presences; await act(async () => window.__RPG_FORCE__());
    await t.echapper(t.materiau(corps[0].id));
    assert.equal(t.rituel(), null); assert.equal(JSON.stringify(duel), avant, 'annulation sans paiement');
    assert.ok(document.activeElement === t.zone());
    await t.ouvrirRituel(); await t.click(t.materiau(corps[0].id)); await t.click(t.materiau(corps[1].id));
    await t.click(t.invoquer()); await pause(220);
    assert.equal(t.rituel(), null); assert.deepEqual(duel.joueur.reserveAscension, []);
    verifierDragon(assert, duel.joueur.creatures.find((e) => e.carteId === DRAGON)); assert.equal(duel.joueur.creatures.length, 2);
    assert.equal(duel.joueur.invocationNormaleJouee, true, 'quota conservé');
    await t.click(t.zone()); assert.ok(t.reserve().querySelector('.rpg-ascension-empty')); assert.equal(t.face(), null);
    console.log(`Ascension Duel ${tactile ? 'tactile' : 'souris'} : réserve compacte, faces plateau, aperçu, Retour/focus, choix et invocation vérifiés.`);
  } finally {
    await act(async () => root.unmount()); container.remove();
    delete window.__RPG_DUEL__; delete window.__RPG_FORCE__; delete window.LetsPlayAndroid;
  }
}

export async function checkAscensionMoba(assert) {
  const { container, root } = monter(); const t = outils(assert, container); let duel;
  const initialiser = () => (duel = rpgMobaNouveauDuel({ joueurDeck: RPG_DECK_SOLEIL_ROUGE_BASE, sorcierDeck: RPG_DECK_SOLEIL_ROUGE_BASE, rng: () => .9, joueurReserveAscension: [DRAGON], sorcierReserveAscension: [DRAGON] }));
  const retour = { current: null };
  const props = { initialiser, onQuitter() {}, onBackRef: retour, rendu: RPG_RENDU_MOBA, sonActif: false };
  try {
    await act(async () => root.render(<RpgMobaBoard {...props} />));
    await t.click(container.querySelector('.moba__mulligan .moba__primary'));
    duel.sorcier.main = []; duel.sorcier.deck = [];
    const sansMateriaux = JSON.stringify(duel);
    await t.click(t.zone()); await t.click(t.face());
    assert.ok(t.apercu()); assert.equal(t.preparer().disabled, true, 'une carte reste consultable sans sacrifices disponibles');
    assert.equal(JSON.stringify(duel), sansMateriaux);
    await t.echapper(); await t.echapper();
    const corps = [['ronin-du-soleil-rouge', 'left', 0], ['onna-musha-des-cendres', 'right', 1]].map(([id, lane, slot]) => {
      duel.moba.creaturesJouees.joueur = false; duel.joueur.main.push(id);
      const res = rpgMobaJouerCreature(duel, 'joueur', id, lane, slot); assert.ok(res.ok, res.raison); return res.entite;
    });
    await act(async () => root.render(<RpgMobaBoard {...props} />)); const avant = JSON.stringify(duel);
    await t.click(t.zone()); await t.click(t.face()); assert.ok(t.apercu());
    await act(async () => { assert.equal(retour.current(), true); }); await pause(20);
    assert.ok(!t.apercu() && t.reserve(), 'Retour ferme d’abord la fiche MOBA');
    await act(async () => { assert.equal(retour.current(), true); }); await pause(20);
    assert.ok(!t.reserve() && document.activeElement === t.zone());
    await t.ouvrirRituel(); await t.click(t.materiau(corps[0].id)); await t.click(t.materiau(corps[1].id));
    assert.equal(container.querySelector('.moba__surface').hasAttribute('inert'), false);
    assert.ok(t.materiau(corps[0].id).closest('[data-moba-position]'));
    await t.click(container.querySelector('.moba__buttons > .moba__primary'));
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(t.invoquer().textContent.trim(), 'Préparer l’Ascension'); await t.click(t.invoquer());
    assert.equal(t.rituel(), null); assert.equal(JSON.stringify(duel), avant, 'préparation sans paiement');
    assert.match(container.querySelector('.moba__sacrifice-hint').textContent, /Ascension prête/);
    const slot = (lane, index) => container.querySelector(`[data-moba-lane="${lane}"][data-moba-side="joueur"][data-moba-slot="${index}"] button`);
    assert.equal(slot('center', 0).disabled, true);
    await t.click(container.querySelector('.moba__cancel-choice')); assert.equal(JSON.stringify(duel), avant);
    await t.ouvrirRituel(); await t.click(t.materiau(corps[0].id)); await t.click(t.materiau(corps[1].id)); await t.click(t.invoquer());
    await t.click(slot('right', 1)); await pause(650);
    assert.equal(duel.mobaCreatureEnAttente, null); assert.deepEqual(duel.joueur.reserveAscension, []);
    const dragon = duel.joueur.creatures.find((e) => e.carteId === DRAGON); verifierDragon(assert, dragon); assert.equal(dragon.mobaLane, 'right');
    assert.equal(duel.moba.creaturesJouees.joueur, true); assert.equal(duel.moba.embuscadesJouees.joueur, false);
    console.log('Ascension MOBA : réserve, aperçu, Retour/focus, préparation, annulation et invocation vérifiés.');
  } finally { await act(async () => root.unmount()); container.remove(); }
}
