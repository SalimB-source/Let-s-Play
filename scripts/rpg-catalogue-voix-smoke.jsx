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
 * Le catalogue tel que le joueur le feuillette : les aperçus ne jouent jamais
 * les voix d'arrivée, mais gardent l'effleurement pour confirmer l'ouverture.
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

    // Les voix de créatures sont réservées à leur arrivée réelle en jeu :
    // même les cartes qui ont une piste gardent ici le simple effleurement.
    let marque = fichiersLus.length;
    const verifierFicheSilencieuse = async (carteId, nom) => {
      sonsJoues.length = 0;
      marque = fichiersLus.length;
      await cliquer(carteCatalogue(carteId), `${nom} s’ouvre depuis le catalogue`);
      await attendre(() => ficheOuverte(carteId), `la fiche de ${nom} est ouverte`);
      assert.deepEqual(voixLancees(marque), [], `${nom} n’émet aucune voix dans son aperçu`);
      assert.ok(sonsJoues.some((son) => son.nom === 'hover'),
        `${nom} conserve l’effleurement de confirmation`);
      await fermerFiche(carteId);
    };
    await verifierFicheSilencieuse('susanoo', 'Susanoo, qui a une voix');
    await verifierFicheSilencieuse('tercio-de-cuivre', 'le Tercio de cuivre');
    await verifierFicheSilencieuse('haut-fond', 'Haut-fond');
    await verifierFicheSilencieuse('vipere-de-verre', 'la Vipère de verre, qui a une voix');
    await verifierFicheSilencieuse('ibis-des-comptes', 'l’Ibis des comptes, qui a une voix');
    await verifierFicheSilencieuse('volva-soigneuse', 'la Völva soigneuse, qui a une voix');
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
    await act(async () => { root.unmount(); });
    container.remove();
  }
}
