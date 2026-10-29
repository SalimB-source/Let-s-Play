import React, { act } from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

/**
 * Refonte de la création de deck façon MTG Arena — `tests/rpg-deck-atelier-mtga.test.js`
 *
 * Vérifie à la fois :
 * 1. Les contrats statiques et CSS historiques de l'atelier (stock, validation,
 *    cadres de 2 px, dégradé unique de `.rpg-atelier__carte-art::after`, astuce
 *    tactile).
 * 2. La nouvelle ergonomie inspirée du Deck Builder de MTG Arena :
 *    - Espace scindé plein écran en deux colonnes indépendantes (collection à
 *      gauche, colonne du deck à droite avec bouton « Enregistrer » ancré en bas) ;
 *    - Barre d'outils unique en haut avec recherche effaçable, 5 médaillons
 *      d'éléments circulaires (`ElementEmblem`), « Possédées » et « Filtres » ;
 *    - Vraies cartes lisibles dans la grille (titre, coût, illustration, type,
 *      gemme de rareté, texte d'effet résumé, ATQ/DÉF) surmontées de losanges
 *      d'exemplaires (`is-pris`, `is-dispo`, `is-manquant`) ;
 *    - Colonne de droite avec couverture miniature + nom éditable + compteur
 *      `N / 30 cartes` + mini-courbe de mana intégrée en tête, pile verticale de
 *      barres horizontales triées par coût (`1x` · Nom · −/+ · Coût), et bascule
 *      instantanée « Par coût » / « Par type ».
 */

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

const atelierSource = lire('../src/games/RpgDeckAtelier.jsx');
const atelierCss = lire('../src/games/rpg-deck-atelier.css');

test('contrats statiques et invariants CSS de RpgDeckAtelier', () => {
  assert.doesNotMatch(
    atelierSource,
    /RpgDeckAssistant|genererDeckAssiste/,
    'RpgDeckAtelier reste découplé du wizard de création assistée',
  );
  assert.match(
    atelierSource,
    /const validation = useMemo\(\(\) => rpgValiderDeckMaison\(cardIds, collection, exemplaires\)/,
    'la validation lit le stock d’exemplaires',
  );
  assert.equal(
    (atelierSource.match(/peutAjouterCarte\(carte\.id, cardIds, collection, exemplaires\)/g) ?? []).length,
    3,
    'les trois points d’ajout passent le stock d’exemplaires',
  );
  assert.match(
    atelierSource,
    /const limite = plafondVisible\(collection, carte\.id, exemplaires\)/,
    'le plafond affiché passe par plafondVisible',
  );
  assert.equal(
    (atelierSource.match(/data-card-id=/g) ?? []).length,
    2,
    'exactement deux points portent data-card-id (grille et pile du deck)',
  );

  // Dégradé unique sur l'illustration de la carte.
  const blocAfter = atelierCss.match(/\.rpg-atelier__carte-art::after\s*\{([^}]*)\}/);
  assert.ok(blocAfter, 'la vignette garde son pseudo-élément de pied');
  assert.match(blocAfter[1], /linear-gradient\(0deg,\s*rgba\(5,\s*4,\s*7,\s*\.55\)/);
  assert.equal((blocAfter[1].match(/linear-gradient\(/g) ?? []).length, 1);
  assert.doesNotMatch(
    blocAfter[1],
    /radial-gradient|conic-gradient|color-mix|rgba\(255,\s*255,\s*255|repeating-linear-gradient|--rpg-foil-/,
  );

  // Astuce tactile cachée par défaut et révélée sur pointeur grossier.
  assert.match(atelierCss, /\.rpg-atelier__astuce\s*\{[^}]*display:\s*none;/);
  assert.match(atelierCss, /@media\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\.rpg-atelier__astuce\s*\{\s*display:\s*block;\s*\}/);
});

test('styles calculés JSDOM : layout scindé MTGA, médaillons ronds, cartes lisibles et CTA ancré', () => {
  const cssNettoye = atelierCss.replace(/@media[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const dom = new JSDOM(`<!doctype html><html><head><style>${cssNettoye}</style></head><body>
    <section class="rpg-atelier">
      <div class="rpg-atelier__panneaux">
        <div class="rpg-atelier__biblio">
          <div class="rpg-atelier__toolbar rpg-atelier__toolbar--simple">
            <button class="rpg-atelier__toggle rpg-atelier__toggle--pip rpg-atelier__toggle--sable"></button>
          </div>
          <p class="rpg-atelier__astuce">Astuce</p>
          <ul class="rpg-atelier__cartes">
            <li class="rpg-atelier__carte">
              <span class="rpg-atelier__losanges"><i class="rpg-atelier__losange is-pris"></i></span>
              <button class="rpg-atelier__carte-ajout">
                <span class="rpg-atelier__carte-art rpg-card--frame-sable"><img src="/x.jpg" alt="" /></span>
                <span class="rpg-atelier__carte-corps"><span class="rpg-atelier__carte-regle">Effet</span></span>
              </button>
            </li>
          </ul>
        </div>
        <aside class="rpg-atelier__deck">
          <div class="rpg-atelier__state"></div>
          <div class="rpg-atelier__liste">
            <ul class="rpg-atelier__pile">
              <li class="rpg-atelier__ligne"><span class="rpg-atelier__ligne-qte">2x</span></li>
            </ul>
          </div>
          <footer class="rpg-atelier__actions">
            <button class="rpg-menu-button rpg-menu-button--primary rpg-atelier__btn-done">Enregistrer le brouillon</button>
            <div class="rpg-atelier__actions-secondaires">
              <button class="rpg-menu-button rpg-atelier__btn-secondaire">Annuler</button>
            </div>
          </footer>
        </aside>
      </div>
    </section>
  </body></html>`);

  assert.doesNotMatch(atelierCss, /system-ui/, 'toute l’atelier emploie les polices du Sablier (mono et Georgia)');

  const { window } = dom;
  const panneaux = window.getComputedStyle(window.document.querySelector('.rpg-atelier__panneaux'));
  assert.equal(panneaux.display, 'grid');
  assert.equal(panneaux.overflow, 'hidden', 'pas de double défilement sur le conteneur scindé');

  const pip = window.getComputedStyle(window.document.querySelector('.rpg-atelier__toggle--pip'));
  assert.equal(pip.borderRadius, '50%', 'les filtres d’éléments sont des médaillons circulaires');

  const art = window.getComputedStyle(window.document.querySelector('.rpg-atelier__carte-art'));
  assert.match(art.backgroundSize, /^100% 100%,/, 'background-size longhand préservé sur la vignette');

  const astuce = window.getComputedStyle(window.document.querySelector('.rpg-atelier__astuce'));
  assert.equal(astuce.display, 'none', 'l’astuce tactile est masquée sur souris');

  const deck = window.getComputedStyle(window.document.querySelector('.rpg-atelier__deck'));
  assert.equal(deck.display, 'flex');
  assert.equal(deck.flexDirection, 'column');

  const liste = window.getComputedStyle(window.document.querySelector('.rpg-atelier__liste'));
  assert.equal(liste.overflowY, 'auto', 'la pile de barres du deck défile indépendamment');

  const actions = window.getComputedStyle(window.document.querySelector('.rpg-atelier__actions'));
  assert.equal(actions.marginTop, 'auto', 'le bouton Enregistrer est ancré tout en bas de la colonne du deck');

  const btnDone = window.getComputedStyle(window.document.querySelector('.rpg-atelier__btn-done'));
  const btnSec = window.getComputedStyle(window.document.querySelector('.rpg-atelier__btn-secondaire'));
  assert.equal(btnDone.fontSize, '10px', 'le bouton Enregistrer le brouillon reprend la taille sobre des boutons du jeu');
  assert.equal(btnDone.fontSize, btnSec.fontSize, 'même corps de texte que Annuler juste en dessous');
  assert.equal(btnDone.fontFamily, btnSec.fontFamily, 'même police monospace que les autres boutons du jeu');
});

test('rendu interactif : losanges d’exemplaires, texte lisible sur les cartes et pile MTGA triée par coût', async () => {
  const previousEnv = process.env.NODE_ENV;
  await build({
    logLevel: 'error',
    build: {
      ssr: 'src/games/RpgDeckAtelier.jsx',
      outDir: 'node_modules/.cache/rpg-deck-atelier-mtga',
      emptyOutDir: true,
    },
  });
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;

  const dom = new JSDOM('<!doctype html><html lang="fr"><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/jeu/sablier-de-bab-el',
    pretendToBeVisual: true,
  });

  const globals = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLSelectElement',
    'HTMLButtonElement',
    'SVGElement',
    'Node',
    'Event',
    'MouseEvent',
  ];
  const sauvegarde = Object.fromEntries(globals.map((k) => [k, globalThis[k]]));
  for (const k of globals) {
    Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const { createRoot } = await import('react-dom/client');
    const { RpgDeckAtelier } = await import('../node_modules/.cache/rpg-deck-atelier-mtga/RpgDeckAtelier.js');
    const { collectionJoueur } = await import('../src/games/rpgCollection.js');
    const { cardById, cardCost } = await import('../src/games/rpgCards.js');

    const collection = collectionJoueur();
    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(RpgDeckAtelier, {
          nomInitial: 'Grimoire d’essai',
          collection,
          artUrl: (id) => `/cards/${id}.jpg`,
          onEnregistrer: () => ({ ok: true }),
          onAnnuler: () => {},
        }),
      );
    });

    // 1. Les 5 médaillons circulaires portent chacun l'emblème SVG officiel de l'élément.
    const pips = [...container.querySelectorAll('.rpg-atelier__toggle--pip')];
    assert.equal(pips.length, 5);
    assert.ok(pips.every((btn) => btn.querySelector('svg.rpg-emblem')), 'chaque filtre couleur affiche son emblème SVG');

    // 2. Chaque carte de la grille expose son texte d'effet lisible et ses losanges de quota.
    const carteChien = container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]');
    assert.ok(carteChien, 'Chien du guet présent dans la grille');
    assert.ok(carteChien.querySelector('.rpg-atelier__carte-regle')?.textContent.trim().length > 0,
      'le texte d’effet est directement lisible sur la carte sans survol');
    assert.equal(carteChien.querySelectorAll('.rpg-atelier__losange.is-dispo').length, 2,
      'deux losanges disponibles avant ajout');
    assert.equal(carteChien.querySelectorAll('.rpg-atelier__losange.is-pris').length, 0);

    const carteMythiqueVerrouillee = container.querySelector('.rpg-atelier__carte[data-card-id="kraken"]');
    assert.equal(carteMythiqueVerrouillee.querySelectorAll('.rpg-atelier__losange').length, 1,
      'une mythique n’affiche qu’un seul losange de quota');
    assert.equal(carteMythiqueVerrouillee.querySelectorAll('.rpg-atelier__losange.is-manquant').length, 1,
      'une carte non possédée affiche son losange comme manquant');

    // 3. Ajout de plusieurs cartes de coûts différents : les losanges s'allument et la pile droite trie par coût croissant.
    const cartesSablePossedees = [...container.querySelectorAll('.rpg-atelier__carte:not(.is-locked)')];
    const carteChere = cartesSablePossedees.find((el) => cardCost(cardById(el.dataset.cardId)) >= 4);
    assert.ok(carteChere, 'au moins une carte possédée de coût >= 4');

    // On ajoute d'abord la carte chère, puis deux exemplaires de Chien du guet (coût 2).
    await act(async () => {
      carteChere.querySelector('.rpg-atelier__carte-ajout').click();
    });
    await act(async () => {
      container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"] .rpg-atelier__carte-ajout').click();
    });
    await act(async () => {
      container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"] .rpg-atelier__carte-ajout').click();
    });

    const chienApres = container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]');
    assert.equal(chienApres.querySelectorAll('.rpg-atelier__losange.is-pris').length, 2,
      'les deux losanges s’allument quand les deux exemplaires sont dans le deck');

    // Vérification de la pile MTGA à droite : triée par coût croissant, avec badge "2x" et "1x".
    const lignes = [...container.querySelectorAll('.rpg-atelier__pile .rpg-atelier__ligne')];
    assert.equal(lignes.length, 2);
    const coutsLignes = lignes.map((l) => cardCost(cardById(l.dataset.cardId)));
    assert.ok(coutsLignes[0] <= coutsLignes[1], 'la pile du deck trie les barres par coût de mana croissant');
    assert.equal(lignes[0].dataset.cardId, 'chien-du-guet');
    assert.equal(lignes[0].querySelector('.rpg-atelier__ligne-qte')?.textContent, '2x');
    assert.equal(lignes[1].querySelector('.rpg-atelier__ligne-qte')?.textContent, '1x');

    // 4. Bascule « Par type » puis retour « Par coût ».
    const btnParType = [...container.querySelectorAll('.rpg-atelier__vue-btn')].find((b) => b.textContent.includes('Par type'));
    await act(async () => {
      btnParType.click();
    });
    assert.ok(container.querySelectorAll('.rpg-atelier__groupe').length >= 1, 'la vue Par type regroupe par famille');

    // 5. La recherche affiche un bouton d'effacement rapide `✕`.
    const champSearch = container.querySelector('.rpg-atelier__search input');
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      setter.call(champSearch, 'chien');
      champSearch.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    const clearBtn = container.querySelector('.rpg-atelier__search-clear');
    assert.ok(clearBtn, 'un bouton ✕ apparaît pour vider la recherche d’un clic');
    await act(async () => {
      clearBtn.click();
    });
    assert.equal(champSearch.value, '', 'cliquer ✕ efface instantanément la recherche');

    await act(async () => {
      root.unmount();
    });
  } finally {
    for (const k of globals) {
      if (sauvegarde[k] === undefined) delete globalThis[k];
      else Object.defineProperty(globalThis, k, { value: sauvegarde[k], configurable: true, writable: true });
    }
  }
});
