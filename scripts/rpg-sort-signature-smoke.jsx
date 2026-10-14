// La signature des familles de sorts dans le jeu réel : le socle d'une Magie
// Rapide et d'une Sorcellerie sur la main, leur sceau dans le mulligan et dans
// la grille du catalogue, la teinte de leur ligne de type dans l'aperçu — et
// rien de tout cela sur une créature, un terrain ou une arme.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import {
  RPG_DUEL_CARDS,
  RPG_SORT_FAMILIES,
  cardById,
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
  const socle = face.querySelector('.rpg-sort-socle');
  assert.equal(Boolean(socle), Boolean(famille),
    `${contexte} : le socle est là si et seulement si ${carte.id} est un sort`);
  if (!famille) return null;
  assert.equal(socle.classList.contains(`rpg-sort-socle--${famille}`), true,
    `${contexte} : le socle de ${carte.id} porte la famille ${famille}`);
  assert.equal(socle.textContent.trim(), RPG_SORT_FAMILIES[famille].label,
    `${contexte} : le mot écrit est « ${RPG_SORT_FAMILIES[famille].label} »`);
  assert.ok(socle.querySelector('.rpg-sort-sigil'), `${contexte} : le sigle est dessiné, pas emprunté à une police`);
  return famille;
}

/** La main du duel : les sorts portent le socle, et plus la petite ligne de type. */
function verifierMain(assert, container) {
  const faces = [...container.querySelectorAll('.rpg-hand__card')];
  assert.equal(faces.length, DECK_SIGNATURE.length, 'toute la main de cinq cartes est servie');
  const familles = faces.map((face) => verifierFaceDeSort(assert, face, 'main'));
  faces.forEach((face, index) => {
    const carte = cardById(face.dataset.cardId);
    const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
    const ligne = face.querySelector('.rpg-hand__type');
    assert.equal(Boolean(ligne), !estCreature && !familles[index],
      `main : la ligne de type reste aux cartes qui ne se présentent pas autrement — ${carte.id} en ${ligne ? 'porte une' : 'n’en porte pas'}`);
    assert.equal(face.classList.contains(`rpg-hand__card--famille-${familles[index]}`), Boolean(familles[index]),
      `main : la face de ${carte.id} porte la classe de sa famille`);
    assert.equal(face.querySelector('.rpg-card-element-badge') === null, carte.kind === 'terrain',
      `main : la pastille d'élément reste le repère de couleur des cartes non-terrain (${carte.id})`);
    assert.equal(Boolean(face.querySelector('.rpg-hand__stats')), estCreature || carte.id === 'sabre-maudit',
      `main : ${carte.id} garde ses statistiques dessinées`);
  });
  assert.deepEqual(familles.filter(Boolean).sort(), ['rapide', 'sorcellerie'],
    'la main du scénario porte une Magie Rapide et une Sorcellerie, chacune avec son socle');
  return familles;
}

async function avecDuel(assert, scenario, { lancerDuel = true } = {}) {
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
      root.render(<RpgDuelPage joueurDeck={[...DECK_SIGNATURE]} sorcierDeck={[...DECK_ADVERSE]} sorcierPuissance={0} rng={() => 0.999} />);
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
    // ── 1. Le mulligan : le sceau de la famille au-dessus de la ligne de type ──
    const cartesMulligan = [...container.querySelectorAll('.rpg-mulligan__card')];
    assert.equal(cartesMulligan.length, DECK_SIGNATURE.length, 'le mulligan présente la main de départ');
    for (const carte of cartesMulligan) {
      const fiche = cardById(carte.dataset.cardId);
      const famille = magieFamille(fiche);
      const sceau = carte.querySelector('.rpg-mulligan__bas .rpg-mulligan__sceau');
      assert.equal(Boolean(sceau), Boolean(famille),
        `mulligan : le sceau est là si et seulement si ${fiche.id} est un sort`);
      const ligne = carte.querySelector('.rpg-mulligan__bas .rpg-mulligan__type');
      assert.equal(Boolean(ligne), fiche.kind !== 'creature' && fiche.kind !== 'hero',
        `mulligan : la ligne de type reste écrite pour un terrain ou un sort (${fiche.id})`);
      if (famille) {
        assert.equal(sceau.classList.contains(`rpg-sort-sceau--${famille}`), true,
          `mulligan : le sceau de ${fiche.id} porte la famille ${famille}`);
        assert.equal(ligne.classList.contains(`rpg-mulligan__type--${famille}`), true,
          `mulligan : la ligne de type de ${fiche.id} prend la teinte de sa famille`);
        assert.match(ligne.textContent, new RegExp(`^${RPG_SORT_FAMILIES[famille].label}`),
          `mulligan : ${fiche.id} écrit toujours le mot de sa famille`);
      } else {
        assert.equal(sceau, null, `mulligan : ${fiche.id} ne porte aucun sceau de sort`);
        assert.equal(Boolean(ligne?.className.includes('rpg-mulligan__type--')), false,
          `mulligan : ${fiche.id} garde la teinte neutre du bandeau`);
      }
    }
    await passerMulligan(container, cliquer);

    // ── 2. La main du duel : le socle remplace la ligne de type des sorts ─────
    verifierMain(assert, container);

    // ── 3. L'aperçu : la même face, le même socle, la ligne de type teintée ───
    const rapide = container.querySelector('.rpg-hand__card[data-card-id="trait-de-braise"]');
    await survoler(rapide);
    const apercu = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
    assert.ok(apercu, 'survoler une Magie Rapide ouvre son aperçu');
    const socleApercu = apercu.querySelector('.rpg-hover-card-preview__face .rpg-sort-socle--rapide');
    assert.ok(socleApercu, 'la face de l’aperçu porte le socle de la Magie Rapide');
    assert.equal(socleApercu.textContent.trim(), RPG_SORT_FAMILIES.rapide.label, 'le socle de l’aperçu écrit le mot de la famille');
    assert.equal(apercu.querySelector('.rpg-hover-card-preview__type')?.classList.contains('rpg-sort-ligne--rapide'), true,
      'la ligne de type de l’aperçu prend la teinte de la Magie Rapide');
    await survoler(rapide, 'mouseout');
    assert.equal(container.querySelector('.rpg-hover-card-preview'), null, 'quitter la carte referme l’aperçu');

    const sorcellerie = container.querySelector('.rpg-hand__card[data-card-id="rapport-du-greffier"]');
    await survoler(sorcellerie);
    const apercuSorcellerie = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
    const socleSorcellerie = apercuSorcellerie?.querySelector('.rpg-hover-card-preview__face .rpg-sort-socle--sorcellerie');
    assert.ok(socleSorcellerie, 'la face de l’aperçu porte le socle de la Sorcellerie');
    assert.equal(socleSorcellerie.textContent.trim(), RPG_SORT_FAMILIES.sorcellerie.label,
      'le socle de la Sorcellerie écrit le mot de sa famille');
    assert.equal(apercuSorcellerie.querySelector('.rpg-hover-card-preview__type')?.classList.contains('rpg-sort-ligne--sorcellerie'), true,
      'la ligne de type de l’aperçu prend la teinte de la Sorcellerie');
    await survoler(sorcellerie, 'mouseout');

    // ── 4. La créature, le terrain et l'arme : aucune signature de sort ───────
    for (const id of ['chien-du-guet', 'desert', 'sabre-maudit']) {
      const face = container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`);
      assert.equal(face.querySelector('.rpg-sort-socle'), null, `main : ${id} ne porte aucun socle de sort`);
      await survoler(face);
      const fiche = cardById(id);
      assert.equal(container.querySelector('.rpg-hover-card-preview__face .rpg-sort-socle'), null,
        `aperçu : la face de ${fiche.name} ne porte aucun socle`);
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
        assert.equal(sceau.classList.contains(`rpg-sort-sceau--${famille}`), true,
          `catalogue : le sceau de ${carte.id} porte la famille ${famille}`);
      }
    }
    assert.ok(sceaux >= 10, `catalogue : les deux familles de sorts se repèrent au sceau (${sceaux} vignettes)`);
  }, { lancerDuel: false });

  console.log('✓ Familles de sorts : la voûte du socle (liseré d’or ou d’améthyste) et le jeton (chanfreiné ou rond) marquent les magies rapides et les sorcelleries sur la main, dans le mulligan, dans l’aperçu et dans le catalogue — créatures, terrains et armes n’en portent aucun.');
}
