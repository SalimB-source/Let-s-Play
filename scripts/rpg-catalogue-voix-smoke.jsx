import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RpgAudioPlayer } from '../src/games/rpgAudio.js';
import { rpgArrivalVoiceUrl } from '../src/games/rpgArrivalVoices.js';

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
 * Le catalogue joue les voix disponibles et respecte les réglages sonores.
 */
export async function checkRpgCatalogueVoix(assert, fichiersLus = []) {
  const sonsJoues = [];
  // Le survol est désormais un fichier comme les autres (`hover.wav`) : une
  // « voix » est donc tout fichier lu *sauf* l'effleurement.
  const voixLancees = (depuis) => fichiersLus.slice(depuis).filter((src) => !src.includes('hover.wav'));
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

    // ── 0 · Grille épurée : nom, type, couleur et ATQ/DÉF sans description ─
    const mousse = container.querySelector('.rpg-card-catalogue__card[data-card-id="mousse-des-galiotes"]');
    assert.ok(mousse, 'Mousse des galiotes figure dans la grille du catalogue');
    assert.equal(mousse.querySelector('.rpg-card-catalogue__title h3')?.textContent.trim(), 'Mousse des galiotes',
      'la vignette garde le nom de la carte');
    assert.match(mousse.querySelector('.rpg-card-catalogue__type')?.textContent ?? '', /Humain · Mousse/,
      'la vignette garde la ligne de type');
    assert.match(mousse.querySelector('.rpg-card-catalogue__meta')?.textContent ?? '', /Sable · Désert[\s\S]*⚔\s*1\s*·\s*🛡\s*2/,
      'la vignette garde la couleur et l’ATQ/DÉF');
    assert.equal(container.querySelector('.rpg-card-catalogue__rules'), null,
      'aucune description de règle n’est imprimée dans la grille du catalogue');
    assert.equal(container.querySelector('.rpg-card-catalogue__pastilles'), null,
      'aucune pastille de description n’est imprimée dans la grille du catalogue');
    assert.ok(!mousse.textContent.includes('Aucune capacité'),
      'Mousse des galiotes n’affiche plus « Aucune capacité. »');

    // Une carte avec voix fait entendre son fichier ; les cartes sans voix
    // gardent l'effleurement de confirmation.
    let marque = fichiersLus.length;
    const verifierFiche = async (carteId, avecVoix) => {
      sonsJoues.length = 0;
      marque = fichiersLus.length;
      await cliquer(carteCatalogue(carteId), `${carteId} s’ouvre depuis le catalogue`);
      await attendre(() => ficheOuverte(carteId), `la fiche de ${carteId} est ouverte`);
      const voix = voixLancees(marque);
      if (avecVoix) {
        assert.equal(voix.length, 1, `${carteId} joue une seule voix`);
        assert.equal(new URL(voix[0]).pathname, new URL(rpgArrivalVoiceUrl(carteId), window.location.href).pathname);
      } else {
        assert.deepEqual(voix, [], `${carteId} ne joue aucune voix`);
        assert.ok(sonsJoues.some((son) => son.nom === 'hover'), 'l’effleurement est conservé');
      }
      await fermerFiche(carteId);
    };
    await verifierFiche('susanoo', true);
    await verifierFiche('tercio-de-cuivre', false);
    await verifierFiche('haut-fond', false);
    await verifierFiche('vipere-de-verre', true);
    await verifierFiche('ibis-des-comptes', true);
    await verifierFiche('volva-soigneuse', true);

    // Le clic droit utilise la même fiche de catalogue.
    marque = fichiersLus.length;
    await act(async () => {
      carteCatalogue('susanoo').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    await attendre(() => ficheOuverte('susanoo'), 'la fiche s’ouvre au clic droit');
    assert.equal(voixLancees(marque).length, 1, 'la fiche au clic droit joue aussi la voix');
    await fermerFiche('susanoo');

    // Couper les voix ne coupe pas les bruitages, et couper les bruitages ne
    // coupe pas les voix : les préférences des paramètres restent respectées.
    const onglet = (nom) => [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.getAttribute('aria-label') === nom);
    await cliquer(onglet('Paramètres'));
    await cliquer(container.querySelector('[aria-label="Couper les voix des personnages"]'));
    await cliquer(onglet('Catalogue'));
    await verifierFiche('susanoo', false);
    await cliquer(onglet('Paramètres'));
    await cliquer(container.querySelector('[aria-label="Activer les voix des personnages"]'));
    await cliquer(container.querySelector('[aria-label="Couper les sons du jeu"]'));
    await cliquer(onglet('Catalogue'));
    await verifierFiche('susanoo', true);
    await cliquer(onglet('Paramètres'));
    await cliquer(container.querySelector('[aria-label="Couper tous les sons"]'));
    await cliquer(onglet('Catalogue'));
    marque = fichiersLus.length;
    await cliquer(carteCatalogue('susanoo'));
    await attendre(() => ficheOuverte('susanoo'), 'la fiche reste accessible son coupé');
    assert.deepEqual(voixLancees(marque), [], 'la coupure générale réduit la voix au silence');
    await fermerFiche('susanoo');
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
