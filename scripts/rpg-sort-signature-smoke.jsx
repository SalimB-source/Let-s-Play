// La signature des familles de sorts dans le jeu réel : losange rapide ou
// rond de sorcellerie teint comme la carte, sur la main, dans le mulligan,
// l'aperçu et le catalogue ; ligne de type et lueur jouable gardent la couleur
// de la famille. Rien de tout cela sur une créature, un terrain ou une arme.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import {
  CARD_FRAME_COLORS,
  RPG_DUEL_CARDS,
  RPG_SORT_FAMILIES,
  cardById,
  cardColors,
  cardFrameColor,
  cardTypeLine,
  carteEstArme,
  magieFamille,
  magieFamilleInfo,
} from '../src/games/rpgCards.js';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

/**
 * La main de départ du scénario : une Magie Rapide, une Sorcellerie, un
 * terrain, une créature, et le Sabre maudit — une magie pour le moteur, mais
 * une arme sur la face, qui ne doit donc porter aucune signature de sort. Le
 * paquet tient en cinq cartes : toute la pioche part dans la main, et le
 * scénario ne dépend pas de l'ordre du battage.
 */
const DECK_SIGNATURE = ['trait-de-braise', 'rapport-du-greffier', 'desert', 'chien-du-guet', 'sabre-maudit'];
const DECK_ADVERSE = ['desert', 'desert', 'desert', 'desert', 'desert'];

/**
 * La main de la lueur de jouabilité : une Magie Rapide et une Sorcellerie qui
 * coûtent **un mana eau** chacune (Ressac et Eau de la source), et les terrains
 * qui les paient. Un seul terrain posé — un mana — suffit donc à allumer les
 * deux, ce qui rend le scénario indépendant de l'ordre du battage : les cinq
 * cartes partent en main, et la question « assez de mana ? » se pose et se
 * résout dans la même partie.
 */
const DECK_LUEUR = ['ressac', 'eau-de-la-source', 'mer', 'mer', 'mer'];

/** Le catalogue dit-il la même famille que le drapeau du moteur ? */
function verifierCatalogueDeCartes(assert) {
  const familles = { rapide: 0, sorcellerie: 0, aucune: 0 };
  for (const carte of RPG_DUEL_CARDS) {
    const famille = magieFamille(carte);
    const ligne = cardTypeLine(carte);
    if (famille) {
      familles[famille] += 1;
      assert.equal(ligne.startsWith(RPG_SORT_FAMILIES[famille].label), true,
        `${carte.id} : « ${RPG_SORT_FAMILIES[famille].label} » est bien le mot imprimé (${ligne})`);
      assert.equal(magieFamilleInfo(carte).key, famille, `${carte.id} : la famille rend son libellé et sa teinte`);
    } else {
      familles.aucune += 1;
      assert.equal(/^(Magie Rapide|Sorcellerie)/.test(ligne), false,
        `${carte.id} : hors sort, aucune ligne ne réclame une famille (${ligne})`);
    }
  }
  assert.ok(familles.rapide >= 5 && familles.sorcellerie >= 5,
    `le catalogue porte les deux familles (${familles.rapide} rapides, ${familles.sorcellerie} sorcelleries)`);
  assert.equal(magieFamille(cardById('sabre-maudit')), null,
    'le Sabre maudit est une magie pour le moteur, mais sa face est celle d’une arme : pas de signature de sort');
  assert.equal(carteEstArme(cardById('sabre-maudit')), true, 'le Sabre maudit se présente bien comme une arme');
}

/** Ce qu'une face de sort porte — et ce que les autres ne portent pas. */
function verifierFaceDeSort(assert, face, contexte) {
  const carte = cardById(face.dataset.cardId);
  const famille = magieFamille(carte);
  const sceau = face.querySelector('.rpg-sort-sceau');
  assert.equal(Boolean(sceau), Boolean(famille),
    `${contexte} : le sceau est là si et seulement si ${carte.id} est un sort`);
  if (!famille) return null;
  assert.equal(sceau.classList.contains(`rpg-sort-sceau--${famille}`), true,
    `${contexte} : le sceau de ${carte.id} garde la forme de sa famille`);
  assert.equal(sceau.classList.contains(`rpg-sort-sceau--element-${cardColors(carte)[0]}`), true,
    `${contexte} : le sceau de ${carte.id} suit la couleur de la carte`);
  assert.ok(sceau.querySelector('.rpg-sort-sigil'), `${contexte} : le sigle est dessiné, pas emprunté à une police`);
  assert.match(face.getAttribute('aria-label'), new RegExp(RPG_SORT_FAMILIES[famille].label),
    `${contexte} : le nom de la famille demeure accessible sans texte sur la face`);
  return famille;
}

/** La main du duel : les sorts portent le sceau, et aucune carte n'imprime de texte de type. */
function verifierMain(assert, container) {
  const faces = [...container.querySelectorAll('.rpg-hand__card')];
  assert.equal(faces.length, DECK_SIGNATURE.length, 'toute la main de cinq cartes est servie');
  const familles = faces.map((face) => verifierFaceDeSort(assert, face, 'main'));
  faces.forEach((face, index) => {
    const carte = cardById(face.dataset.cardId);
    const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
    const ligne = face.querySelector('.rpg-hand__type');
    assert.equal(ligne, null,
      `main : aucune carte en main n'imprime de ligne de type sur sa face (${carte.id})`);
    assert.equal(face.classList.contains(`rpg-hand__card--famille-${familles[index]}`), Boolean(familles[index]),
      `main : la face de ${carte.id} porte la classe de sa famille`);
    assert.equal(face.querySelector('.rpg-card-element-badge') === null, carte.kind === 'terrain',
      `main : la pastille d'élément reste le repère de couleur des cartes non-terrain (${carte.id})`);
    assert.equal(Boolean(face.querySelector('.rpg-hand__stats')), estCreature || carte.id === 'sabre-maudit',
      `main : ${carte.id} garde ses statistiques dessinées`);
  });
  assert.deepEqual(familles.filter(Boolean).sort(), ['rapide', 'sorcellerie'],
    'la main du scénario porte une Magie Rapide et une Sorcellerie, chacune avec son sceau');
  return familles;
}

async function avecDuel(assert, scenario, { lancerDuel = true, deck = DECK_SIGNATURE, deckAdverse = DECK_ADVERSE } = {}) {
  const originalMatchMedia = window.matchMedia;
  // Le survol doit être constaté comme disponible : c'est lui qui ouvre l'aperçu.
  window.matchMedia = (query) => ({
    matches: query.includes('(hover: hover)') || query.includes('prefers-reduced-motion'),
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const cliquer = async (element) => {
    assert.ok(element, 'la commande existe');
    await act(async () => { element.click(); });
  };
  const survoler = async (element, type = 'mouseover') => {
    await act(async () => {
      element.dispatchEvent(new window.MouseEvent(type, { bubbles: true, relatedTarget: document.body }));
    });
  };
  try {
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={[...deck]} sorcierDeck={[...deckAdverse]} sorcierPuissance={0} rng={() => 0.999} />);
    });
    // Le duel s'ouvre depuis l'onglet Deck (« Jouer avec ce deck ») : le
    // volet de mulligan suit le lancement, pas le rendu.
    if (lancerDuel) await lancerDuelDepuisMenu(container, cliquer);
    await scenario({ container, cliquer, survoler });
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.matchMedia = originalMatchMedia;
  }
}

export async function checkRpgSortSignature(assert) {
  verifierCatalogueDeCartes(assert);

  await avecDuel(assert, async ({ container, cliquer, survoler }) => {
    // ── 1. Le mulligan : le sceau de la famille aligné en bas à gauche ──
    const cartesMulligan = [...container.querySelectorAll('.rpg-mulligan__card')];
    assert.equal(cartesMulligan.length, DECK_SIGNATURE.length, 'le mulligan présente la main de départ');
    for (const carte of cartesMulligan) {
      const fiche = cardById(carte.dataset.cardId);
      const famille = magieFamille(fiche);
      const sceau = carte.querySelector('.rpg-mulligan__sceau');
      assert.equal(Boolean(sceau), Boolean(famille),
        `mulligan : le sceau est là si et seulement si ${fiche.id} est un sort`);
      assert.equal(carte.querySelector('.rpg-mulligan__type'), null,
        `mulligan : aucune ligne de type n’est imprimée sur la carte (${fiche.id})`);
      if (famille) {
        assert.equal(sceau.classList.contains(`rpg-sort-sceau--${famille}`), true,
          `mulligan : le sceau de ${fiche.id} porte la famille ${famille}`);
        assert.equal(sceau.classList.contains(`rpg-sort-sceau--element-${cardColors(fiche)[0]}`), true,
          `mulligan : son losange ou son rond suit la couleur de ${fiche.id}`);
      } else {
        assert.equal(sceau, null, `mulligan : ${fiche.id} ne porte aucun sceau de sort`);
      }
    }
    await passerMulligan(container, cliquer);

    // ── 2. La main du duel : le sceau sur les sorts, pas de ligne de type ─────
    verifierMain(assert, container);

    // ── 3. L'aperçu : même forme et même élément, ligne de type teintée ──────
    const rapide = container.querySelector('.rpg-hand__card[data-card-id="trait-de-braise"]');
    await survoler(rapide);
    const apercu = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
    assert.ok(apercu, 'survoler une Magie Rapide ouvre son aperçu');
    const sceauApercu = apercu.querySelector('.rpg-hover-card-preview__face .rpg-sort-sceau--rapide');
    assert.ok(sceauApercu, 'la face de l’aperçu porte le losange de la Magie Rapide');
    assert.equal(sceauApercu.classList.contains('rpg-sort-sceau--element-braise'), true,
      'le losange de Braise garde la couleur de sa carte dans l’aperçu');
    assert.equal(apercu.querySelector('.rpg-hover-card-preview__type')?.classList.contains('rpg-sort-ligne--rapide'), true,
      'la ligne de type de l’aperçu prend la teinte de la Magie Rapide');
    await survoler(rapide, 'mouseout');
    assert.equal(container.querySelector('.rpg-hover-card-preview'), null, 'quitter la carte referme l’aperçu');

    const sorcellerie = container.querySelector('.rpg-hand__card[data-card-id="rapport-du-greffier"]');
    await survoler(sorcellerie);
    const apercuSorcellerie = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
    const sceauSorcellerie = apercuSorcellerie?.querySelector('.rpg-hover-card-preview__face .rpg-sort-sceau--sorcellerie');
    assert.ok(sceauSorcellerie, 'la face de l’aperçu porte le médaillon rond de la Sorcellerie');
    assert.equal(sceauSorcellerie.classList.contains('rpg-sort-sceau--element-sable'), true,
      'le médaillon de Sable garde la couleur de sa carte dans l’aperçu');
    assert.equal(apercuSorcellerie.querySelector('.rpg-hover-card-preview__type')?.classList.contains('rpg-sort-ligne--sorcellerie'), true,
      'la ligne de type de l’aperçu prend la teinte de la Sorcellerie');
    await survoler(sorcellerie, 'mouseout');

    // ── 4. La créature, le terrain et l'arme : aucune signature de sort ───────
    for (const id of ['chien-du-guet', 'desert', 'sabre-maudit']) {
      const face = container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`);
      assert.equal(face.querySelector('.rpg-sort-sceau'), null, `main : ${id} ne porte aucun sceau de sort`);
      await survoler(face);
      const fiche = cardById(id);
      assert.equal(container.querySelector('.rpg-hover-card-preview__face .rpg-sort-sceau'), null,
        `aperçu : la face de ${fiche.name} ne porte aucun sceau`);
      const ligne = container.querySelector('.rpg-hover-card-preview__type');
      assert.equal(ligne?.className.includes('rpg-sort-ligne--') ?? false, false,
        `aperçu : la ligne de type de ${fiche.name} garde sa teinte neutre`);
      await survoler(face, 'mouseout');
    }
  });

  // ── 5. La grille du catalogue : le sceau au coin de la vignette ────────────
  await avecDuel(assert, async ({ container, cliquer }) => {
    const onglets = () => [...container.querySelectorAll('.rpg-mode-menu__switch button')];
    const catalogue = onglets().find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().endsWith('Catalogue'));
    if (catalogue) await cliquer(catalogue);
    const vignettes = [...container.querySelectorAll('.rpg-card-catalogue__card')];
    assert.ok(vignettes.length >= 10, 'la grille du catalogue est peinte');
    let sceaux = 0;
    const elementsVus = new Set();
    for (const vignette of vignettes) {
      const carte = cardById(vignette.dataset.cardId);
      const famille = magieFamille(carte);
      const sceau = vignette.querySelector('.rpg-card-catalogue__art .rpg-sort-sceau');
      assert.equal(Boolean(sceau), Boolean(famille),
        `catalogue : le sceau est là si et seulement si ${carte.id} est un sort`);
      assert.equal(Boolean(sceau), Boolean(vignette.querySelector('.rpg-card-catalogue__sort')),
        `catalogue : le sceau de ${carte.id} prend sa place au coin de la vignette`);
      const ligne = vignette.querySelector('.rpg-card-catalogue__type');
      assert.equal(ligne?.className.includes('rpg-sort-ligne--'), Boolean(famille),
        `catalogue : la ligne de type de ${carte.id} suit sa famille`);
      if (famille) {
        sceaux += 1;
        const couleurs = cardColors(carte);
        elementsVus.add(couleurs[0]);
        assert.equal(sceau.classList.contains(`rpg-sort-sceau--${famille}`), true,
          `catalogue : le sceau de ${carte.id} porte la famille ${famille}`);
        assert.equal(sceau.classList.contains(`rpg-sort-sceau--element-${couleurs[0]}`), true,
          `catalogue : le sceau de ${carte.id} suit l’élément de sa carte`);
        assert.equal(sceau.classList.contains('rpg-sort-sceau--hybride'), couleurs.length > 1,
          `catalogue : ${carte.id} partage son sceau uniquement si elle est multicolore`);
        if (couleurs.length > 1) {
          const fond = sceau.style.getPropertyValue('--rpg-sort-sceau-fond-hybride');
          assert.match(fond, /^linear-gradient\(135deg,/u,
            `catalogue : ${carte.id} possède un fond hybride`);
          for (const couleur of couleurs) {
            assert.ok(fond.includes(CARD_FRAME_COLORS[couleur].color),
              `catalogue : l’élément ${couleur} est peint dans le sceau de ${carte.id}`);
          }
          assert.equal(sceau.style.getPropertyValue('--rpg-sort-sceau-couleur'), cardFrameColor(carte),
            'le filet du sceau hybride suit la couleur du cadre');
        }
      }
    }
    assert.ok(sceaux >= 10, `catalogue : les deux familles de sorts se repèrent au sceau (${sceaux} vignettes)`);
    assert.deepEqual([...elementsVus].sort(), ['braise', 'eau', 'neige', 'sable'],
      'les sceaux couvrent les quatre couleurs de carte dans le catalogue');
    const ventRouge = container.querySelector('.rpg-card-catalogue__card[data-card-id="vent-rouge"] .rpg-sort-sceau');
    assert.ok(ventRouge?.classList.contains('rpg-sort-sceau--sorcellerie')
      && ventRouge.classList.contains('rpg-sort-sceau--hybride'),
      'Vent rouge garde son rond de sorcellerie peint de ses deux éléments');
    const [braise, sable] = cardColors(cardById('vent-rouge')).map((couleur) => CARD_FRAME_COLORS[couleur].color);
    assert.equal(ventRouge.style.getPropertyValue('--rpg-sort-sceau-fond-hybride'),
      `linear-gradient(135deg, ${braise} 0% 50%, ${sable} 50% 100%)`,
      'Vent rouge partage visiblement son sceau en deux moitiés Braise et Sable');
    for (const [rapide, sorcellerie] of [
      ['trait-de-braise', 'nuage-de-cendres'],
      ['ressac', 'eau-de-la-source'],
      ['eclair-du-marteau', 'mur-de-boucliers'],
    ]) {
      const couleur = cardColors(cardById(rapide))[0];
      const sceauDe = (id) => container.querySelector(`.rpg-card-catalogue__card[data-card-id="${id}"] .rpg-sort-sceau`);
      assert.ok(sceauDe(rapide)?.classList.contains(`rpg-sort-sceau--element-${couleur}`)
        && sceauDe(sorcellerie)?.classList.contains(`rpg-sort-sceau--element-${couleur}`),
        `le losange et le rond ${couleur} partagent la couleur de leurs cartes, seule leur forme indique la famille`);
    }
  }, { lancerDuel: false });

  // ── 6. La lueur de jouabilité : le mana allume, la famille teinte ──────────
  // La main de ce scénario paie ses deux sorts d'un seul terrain : rien n'est
  // allumé à zéro mana, et les deux s'allument — chacun dans la classe de sa
  // famille, celle qui reçoit l'azur ou l'améthyste — dès que le terrain est
  // posé. Le terrain lui-même, allumé avant d'être posé, ne porte aucune
  // famille : son halo reste l'or du jeu.
  await avecDuel(assert, async ({ container, cliquer }) => {
    const faceDe = (id) => container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`);
    const familleDe = (face) => [...face.classList]
      .find((classe) => classe.startsWith('rpg-hand__card--famille-')) ?? null;
    const allumee = (face) => face.classList.contains('is-playable');
    const terrain = faceDe('mer');
    assert.ok(terrain, 'la main de départ aligne le terrain qui paie les sorts');

    // La main de départ se garde : le volet du mulligan se referme, la table
    // est au joueur et aucune carte n'est encore payable.
    await passerMulligan(container, cliquer);
    assert.equal(container.querySelector('.rpg-mulligan'), null, 'le volet du mulligan est refermé');
    assert.equal(allumee(faceDe('ressac')), false, 'sans mana, la Magie Rapide reste éteinte');
    assert.equal(allumee(faceDe('eau-de-la-source')), false, 'sans mana, la Sorcellerie reste éteinte');
    assert.equal(familleDe(terrain), null, 'un terrain ne porte aucune famille : son halo reste l’or du jeu');
    assert.equal(allumee(terrain), true, 'le terrain se pose sans mana : il est la seule carte allumée');

    await cliquer(terrain);
    assert.equal(container.querySelectorAll('.rpg-hand__card[data-card-id="mer"]').length, 2,
      'le terrain posé a quitté la main — les deux autres attendent leur tour');
    assert.ok(container.querySelector('.rpg-terrain--joueur'), 'son mana attend sur la table');
    assert.equal(allumee(faceDe('mer')), false,
      'un seul terrain par tour : le suivant reste éteint, l’or compris');

    const rapide = faceDe('ressac');
    const sorcellerie = faceDe('eau-de-la-source');
    assert.equal(allumee(rapide), true, 'payable à un mana, la Magie Rapide s’allume');
    assert.equal(familleDe(rapide), 'rpg-hand__card--famille-rapide',
      'la face allumée est celle de la famille que la feuille teinte en azur');
    assert.equal(allumee(sorcellerie), true, 'payable à un mana, la Sorcellerie s’allume');
    assert.equal(familleDe(sorcellerie), 'rpg-hand__card--famille-sorcellerie',
      'la face allumée est celle de la famille que la feuille teinte en améthyste');
  }, { deck: DECK_LUEUR });

  console.log('✓ Familles de sorts : losange rapide et rond de sorcellerie teintés selon la carte (Braise, Eau, Sable, Neige, hybride), sans changer leur forme ; socle et lueur jouable gardent la teinte de famille. Les sceaux suivent la carte dans le mulligan et le catalogue, aucune créature, terrain ou arme n’en porte.');
}
