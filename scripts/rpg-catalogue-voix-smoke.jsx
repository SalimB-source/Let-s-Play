import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RpgAudioPlayer } from '../src/games/rpgAudio.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Un deck valide quelconque : la page s'ouvre sur le menu, le catalogue est
// l'onglet qu'on va visiter. Aucune carte n'est jouée.
const DECK = [
  'tercio-de-cuivre',
  'pilote-de-la-carreira',
  'le-renegat',
  'negociant-des-ranscons',
  'galion-de-la-flotte',
  'le-routier',
  'le-grand-debarquement',
  'haut-fond',
  'vipere-de-verre',
  'lettre-de-marque',
  'grappin-d-abordage',
  'baton-des-citernes',
  'cotre-de-course',
].flatMap((id) => [id, id]);

/**
 * Le catalogue tel que le joueur le feuillette : ouvrir la fiche d'une créature
 * qui a une voix la fait parler, les cartes muettes gardent l'effleurement.
 */
export async function checkRpgCatalogueVoix(assert, fichiersLus = []) {
  const sonsJoues = [];
  const jouerOriginal = RpgAudioPlayer.prototype.play;
  RpgAudioPlayer.prototype.play = function espionCatalogue(nom, delai) {
    sonsJoues.push({ nom, delai });
    return jouerOriginal.call(this, nom, delai);
  };

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  const cliquer = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const attendre = async (condition, message, maxMs = 6000) => {
    for (let ecoule = 0; ecoule <= maxMs; ecoule += 50) {
      if (condition()) return;
      await act(async () => { await wait(50); });
    }
    assert.fail(message);
  };
  const ongletCatalogue = () => [...container.querySelectorAll('.rpg-mode-menu__switch button')]
    .find((bouton) => bouton.getAttribute('aria-label') === 'Catalogue');
  const carteCatalogue = (carteId) => container.querySelector(`[data-catalogue-open="${carteId}"]`);
  const ficheOuverte = (carteId) => container.querySelector(`.rpg-card-peek[data-catalogue-preview="${carteId}"]`);
  const fermerFiche = async (carteId) => {
    await cliquer(ficheOuverte(carteId)?.querySelector('.rpg-card-peek__close'), `la fiche de ${carteId} se referme`);
    await attendre(() => !ficheOuverte(carteId), `la fiche de ${carteId} est refermée`);
  };

  try {
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK} sorcierDeck={DECK} rng={() => 0.999} />);
    });
    await cliquer(ongletCatalogue(), 'l’onglet Catalogue est dans le menu');
    await attendre(() => carteCatalogue('susanoo'), 'la grille du catalogue est affichée', 8000);

    // ── 1 · Une créature qui a une voix parle ──────────────────────────────
    sonsJoues.length = 0;
    let marque = fichiersLus.length;
    await cliquer(carteCatalogue('susanoo'), 'Susanoo s’ouvre depuis le catalogue');
    await attendre(() => ficheOuverte('susanoo'), 'la fiche de Susanoo est ouverte');
    assert.ok(fichiersLus.slice(marque).some((src) => src.includes('Susanoo.mp3')),
      `la fiche joue la voix de la créature (fichiers : ${fichiersLus.slice(marque).join(', ') || 'aucun'})`);
    assert.ok(!sonsJoues.some((son) => son.nom === 'hover'),
      'la voix remplace l’effleurement de survol');
    await fermerFiche('susanoo');

    // ── 2 · Une créature sans voix garde l'effleurement ────────────────────
    sonsJoues.length = 0;
    marque = fichiersLus.length;
    await cliquer(carteCatalogue('tercio-de-cuivre'), 'le Tercio de cuivre s’ouvre');
    await attendre(() => ficheOuverte('tercio-de-cuivre'), 'la fiche du Tercio est ouverte');
    assert.ok(sonsJoues.some((son) => son.nom === 'hover'),
      'une créature sans échantillon garde l’effleurement');
    assert.deepEqual(fichiersLus.slice(marque), [],
      'aucune voix n’est lancée pour une créature muette');
    await fermerFiche('tercio-de-cuivre');

    // ── 3 · Une magie ne parle jamais, même malgré son nom ────────────────
    sonsJoues.length = 0;
    marque = fichiersLus.length;
    await cliquer(carteCatalogue('haut-fond'), 'Haut-fond s’ouvre');
    await attendre(() => ficheOuverte('haut-fond'), 'la fiche de Haut-fond est ouverte');
    assert.ok(sonsJoues.some((son) => son.nom === 'hover'),
      'une magie garde l’effleurement');
    assert.deepEqual(fichiersLus.slice(marque), [], 'une magie ne joue aucune voix');
    await fermerFiche('haut-fond');

    // ── 4 · La Vipère de verre parle « Serpent de verre » ─────────────────
    sonsJoues.length = 0;
    marque = fichiersLus.length;
    await cliquer(carteCatalogue('vipere-de-verre'), 'la Vipère de verre s’ouvre');
    await attendre(() => ficheOuverte('vipere-de-verre'), 'la fiche de la Vipère est ouverte');
    assert.ok(fichiersLus.slice(marque).some((src) => src.includes('Serpent')),
      'le fichier au nom de la carte est bien celui qui sonne');
    await fermerFiche('vipere-de-verre');

    // ── 5 · Le second lot de voix arrive aussi jusqu'à la fiche ───────────
    sonsJoues.length = 0;
    marque = fichiersLus.length;
    await cliquer(carteCatalogue('ibis-des-comptes'), 'l’Ibis des comptes s’ouvre');
    await attendre(() => ficheOuverte('ibis-des-comptes'), 'la fiche de l’Ibis est ouverte');
    // L'adresse est encodée (`Ibis%20des%20comptes.mp3`) : on la décode avant
    // de la comparer au nom du fichier.
    assert.ok(fichiersLus.slice(marque).some((src) => decodeURIComponent(src).includes('Ibis des comptes.mp3')),
      'la voix du second lot est lue par la fiche');
    assert.ok(!sonsJoues.some((son) => son.nom === 'hover'), 'et elle remplace l’effleurement');
    await fermerFiche('ibis-des-comptes');
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
