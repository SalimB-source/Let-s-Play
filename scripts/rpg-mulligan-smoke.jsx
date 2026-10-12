// Le mulligan du Sablier, rendu dans jsdom : la main de départ s'affiche en
// entier — des faces 4:5, leurs plaques d'attaque et de défense (et la ligne de
// type des terrains et des sorts), tout le reste passant par l'aperçu rapide du
// survol — le joueur choisit ce qu'il change, valide, relit sa nouvelle main, et
// la table ne s'ouvre qu'ensuite.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { rpgPeutMulligan } from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Les decks du scénario : 5 premiers cartes en main, le reste au paquet. */
const DECK_JOUER = ['desert', 'chien-du-guet', 'fennec-des-decombres', 'mer', 'montagne', 'ressac', 'parade-du-verre', 'veilleur-du-couchant', 'desert', 'desert'];
const DECK_SORCIER = ['montagne', 'desert', 'chien-du-guet', 'fennec-des-decombres', 'dune-marchante', 'montagne', 'chien-du-guet', 'desert', 'djinn-du-souk', 'vipere-de-verre'];

export async function checkRpgMulligan(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const q = (selector) => container.querySelector(selector);
  const qa = (selector) => [...container.querySelectorAll(selector)];
  const click = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const volet = () => q('.rpg-mulligan');
  const cartes = () => qa('.rpg-mulligan__card');
  const titre = () => q('.rpg-mulligan__head h2')?.textContent ?? '';
  const main = () => qa('.rpg-hand__card').map((carte) => carte.dataset.cardId);

  // jsdom n'expose pas `matchMedia` : sans lui, la page suppose la souris (le
  // repli documenté de `viewport.survol`), et le volet arme donc l'aperçu
  // rapide — c'est le geste qu'on vérifie ici.
  assert.equal(typeof window.matchMedia, 'undefined', 'jsdom ne connaît pas le survol, la page le suppose');

  await act(async () => {
    root.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.5} />);
  });
  await click(q('.rpg-mode-menu__play .rpg-menu-button--primary'), 'le menu Jouer lance le duel');
  await act(async () => { await wait(120); });

  // ── 1. L'ouverture du duel est tenue par le volet, pas par la table ──────
  assert.ok(volet(), 'le duel s’ouvre sur le volet du mulligan');
  assert.equal(volet().getAttribute('role'), 'dialog', 'le volet est une boîte de dialogue modale');
  assert.match(volet().getAttribute('aria-label'), /Mulligan/, 'le volet se nomme pour les lecteurs d’écran');
  assert.equal(q('.card-table').hasAttribute('inert'), true, 'la table est close tant que la main n’est pas validée');
  assert.equal(cartes().length, 5, 'les cinq cartes piochées sont toutes présentées');
  assert.deepEqual(cartes().map((carte) => carte.dataset.cardId), main(),
    'le volet montre exactement la main de départ, dans le même ordre');
  assert.equal(q('.rpg-mulligan__stage > .rpg-mulligan__cards')?.children.length, 5,
    'les cinq cartes forment une seule rangée, dans la scène que la feuille mesure');
  for (const carte of cartes()) {
    const id = carte.dataset.cardId;
    const attendue = cardById(id);
    assert.equal(carte.querySelector('img')?.getAttribute('src')?.includes(`/cards/${id}.jpg`) ?? false, true,
      `la carte ${id} montre son illustration`);
    // Aucun texte imprimé sur la carte : ni nom, ni type, ni effets, ni drapeau.
    // Il ne reste que l'illustration et les repères du jeu (coût, badge, stats).
    const reperes = (noeud) => noeud.classList?.contains('rpg-card-element-badge')
      || noeud.classList?.contains('rpg-mana-cost')
      || noeud.classList?.contains('rpg-mulligan__bas');
    for (const noeud of carte.childNodes) {
      if (noeud.nodeType === 3) {
        assert.equal(noeud.textContent.trim(), '', `aucun texte n’est posé sur la carte ${id}`);
      } else if (noeud.nodeType === 1) {
        assert.ok(noeud.tagName === 'IMG' || reperes(noeud),
          `la carte ${id} ne porte que son illustration et ses repères (${noeud.className})`);
      }
    }
    assert.equal(Boolean(carte.querySelector('.rpg-mulligan__name, .rpg-mulligan__rules, .rpg-mulligan__flag')), false,
      `rien du texte d’interface n’est rendu sur la carte ${id}, hors la ligne de type`);
    // Les repères du jeu, eux, restent : le coût, le badge d’élément, les stats.
    assert.equal(Boolean(carte.querySelector('.rpg-mana-cost')) || attendue.kind === 'terrain', true,
      `la carte ${id} montre son coût (ou est un terrain, qui n’en a pas)`);
    const creature = attendue.kind === 'creature' || attendue.kind === 'hero';
    assert.equal(Boolean(carte.querySelector('.rpg-mulligan__stats')), creature,
      `la carte ${id} montre son attaque et sa défense si c’est une créature`);
    const plaques = carte.querySelectorAll('.rpg-mulligan__stats .rpg-stat-icon');
    if (creature) {
      // Les plaques du jeu : l'épée sur fond d'or, le bouclier sur fond d'acier.
      assert.equal(plaques.length, 2, `l’attaque et la défense de ${id} portent les icônes du jeu`);
      assert.equal(carte.querySelector('.rpg-mulligan__stats .rpg-card__stat--atk .rpg-stat-value')?.textContent,
        String(attendue.atk), `la plaque d’attaque de ${id} affiche sa valeur`);
      assert.equal(carte.querySelector('.rpg-mulligan__stats .rpg-card__pt .rpg-stat-value')?.textContent,
        String(attendue.def), `la plaque de défense de ${id} affiche sa valeur`);
      assert.equal(/⚔|🛡/.test(carte.textContent), false,
        `la carte ${id} n’écrit plus ⚔/🛡 : elle porte les plaques du jeu`);
      // L'attaque ouvre la rangée, la défense la ferme : chacune sur son bord.
      const rangee = carte.querySelector('.rpg-mulligan__stats');
      assert.equal(rangee.firstElementChild?.classList.contains('rpg-card__stat--atk'), true,
        `l’attaque de ${id} est la première plaque — à gauche`);
      assert.equal(rangee.lastElementChild?.classList.contains('rpg-card__pt'), true,
        `la défense de ${id} est la dernière plaque — à droite`);
    }
    // La ligne de type n'est écrite que hors créature — un terrain, un sort.
    const ligneType = carte.querySelector('.rpg-mulligan__bas .rpg-mulligan__type');
    assert.equal(Boolean(ligneType), !creature,
      creature
        ? `la créature ${id} n’écrit pas de ligne de type : ses plaques suffisent`
        : `le terrain ou le sort ${id} écrit sa ligne de type`);
    if (!creature) {
      const motAttendu = attendue.kind === 'terrain' ? /^Terrain/ : /^(Rituel|Éphémère)/;
      assert.match(ligneType?.textContent ?? '', motAttendu,
        `la carte ${id} affiche son type — le mot de sa famille, imprimé sur la face`);
    }
    const stats = carte.querySelector('.rpg-mulligan__stats');
    if (stats) {
      assert.equal(stats.previousElementSibling === ligneType, true,
        ligneType
          ? `le type de ${id} précède immédiatement l’attaque et la défense`
          : `pour la créature ${id}, les plaques ouvrent la pile du bas`);
      assert.equal(stats.parentElement?.classList.contains('rpg-mulligan__bas'), true,
        `les plaques de ${id} vivent dans la pile du bas de la carte`);
    }
    assert.equal(carte.getAttribute('aria-pressed'), 'false', 'aucune carte n’est choisie à l’ouverture');
  }
  assert.match(q('.rpg-mulligan__head p').textContent, /Survolez une carte pour la lire en entier/,
    'le volet annonce le geste de lecture quand la souris sait survoler');

  // ── 1 bis. Le survol d'une carte ouvre l'aperçu rapide, et lui seul ───────
  const survoler = async (element) => {
    await act(async () => {
      element.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
    });
  };
  assert.equal(q('.rpg-hover-card-preview'), null, 'aucun aperçu tant que rien n’est survolé');
  await survoler(cartes()[2]);
  const apercu = q('.rpg-hover-card-preview');
  assert.ok(apercu, 'survoler une carte du mulligan ouvre l’aperçu rapide');
  assert.match(apercu.className, /rpg-hover-card-preview--mulligan/,
    'l’aperçu du mulligan se nomme, pour passer au-dessus du volet');
  const carteSurvolee = cardById(cartes()[2].dataset.cardId);
  assert.match(apercu.getAttribute('aria-label'), new RegExp(carteSurvolee.name),
    'l’aperçu décrit la carte survolée');
  assert.match(apercu.textContent, new RegExp(carteSurvolee.name),
    'et il porte le nom que la carte, elle, n’imprime plus');
  if (carteSurvolee.text && carteSurvolee.text !== '—') {
    assert.ok(apercu.querySelector('.rpg-hover-card-preview__rules')?.textContent.length > 8,
      'les effets de la carte se lisent dans l’aperçu');
  }
  await act(async () => {
    cartes()[2].dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
  });
  assert.equal(q('.rpg-hover-card-preview'), null, 'quitter la carte referme l’aperçu');

  assert.match(titre(), /Gardez votre main/, 'le titre invite au choix');
  assert.match(q('.rpg-mulligan__head p').textContent, /Un seul échange/, 'le volet dit que le droit est unique');
  assert.match(q('.rpg-mulligan__valider').textContent, /Garder cette main/,
    'sans choix, valider revient à garder sa main');
  assert.equal(q('.rpg-mulligan__tout'), null, 'pas de bouton d’annulation tant que rien n’est choisi');

  // ── 2. Rien ne se joue pendant la lecture de la main ─────────────────────
  assert.equal(q('.rpg-btn--endturn')?.disabled, true, 'le tour ne peut pas être rendu avant la validation');
  assert.equal(qa('.rpg-hand__card[data-jouable="true"]').length, 0, 'aucune carte de la main n’est jouable');
  assert.equal(qa('.rpg-hand__card').every((carte) => carte.getAttribute('draggable') === 'false'), true,
    'aucune carte ne se glisse : le halo doré est éteint, la poignée aussi');
  assert.equal(q('.rpg-terrains--joueur .rpg-terrain'), null, 'rien n’est posé sur la table pendant le mulligan');

  // ── 3. Le choix des cartes à changer ─────────────────────────────────────
  await click(cartes()[1], 'toucher une carte la marque');
  assert.equal(cartes()[1].getAttribute('aria-pressed'), 'true', 'la carte choisie est pressée');
  assert.equal(cartes()[1].classList.contains('is-selected'), true, 'la carte choisie prend le liseré doré');
  assert.equal(cartes()[1].querySelector('.rpg-mulligan__flag'), null,
    'aucun mot n’est imprimé : le liseré doré dit « à changer », et le compteur le chiffre');
  await click(cartes()[2], 'toucher une seconde carte la marque aussi');
  assert.match(q('.rpg-mulligan__compteur').textContent, /2 cartes à changer/, 'le compteur suit la sélection');
  assert.match(q('.rpg-mulligan__valider').textContent, /Changer 2 cartes/, 'le bouton primary nomme l’échange');
  await click(cartes()[1], 're-toucher la carte la libère');
  assert.equal(cartes()[1].getAttribute('aria-pressed'), 'false', 'le choix se défait au second toucher');
  assert.match(q('.rpg-mulligan__valider').textContent, /Changer 1 carte$/, 'un seul exemplaire reste choisi');
  await click(q('.rpg-mulligan__tout'), 'annuler la sélection');
  assert.equal(cartes().filter((carte) => carte.getAttribute('aria-pressed') === 'true').length, 0,
    '« Annuler la sélection » vide les choix sans fermer le volet');
  await click(cartes()[1], 'la carte du milieu est choisie');
  await click(cartes()[2], 'et la suivante aussi');

  // ── 4. Validation : ce qui sort, ce qui entre, et la main qui ne fond pas ─
  const duel = window.__RPG_DUEL__;
  const mainAvant = [...duel.joueur.main];
  const paquetAvant = [...duel.joueur.deck];
  const sorcierAvant = [...duel.sorcier.main];
  const sorcierPaquetAvant = [...duel.sorcier.deck];
  await click(q('.rpg-mulligan__valider'), 'valider l’échange');
  await act(async () => { await wait(120); });

  assert.equal(duel.joueur.main.length, 5, 'la main compte toujours cinq cartes après l’échange');
  assert.deepEqual(duel.joueur.main.slice(0, 3), [mainAvant[0], mainAvant[3], mainAvant[4]],
    'les cartes gardées restent en main, dans leur ordre');
  assert.equal([...duel.joueur.main, ...duel.joueur.deck].sort().join('|'),
    [...mainAvant, ...paquetAvant].sort().join('|'),
    'les deux cartes écartées sont retournées dans le paquet, aucune carte perdue');
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false, 'le droit au mulligan est consommé');
  assert.match(duel.log.join('\n'), /Vous écartez .* et piochez 2 cartes/, 'le journal raconte l’échange');

  // Le volet reste ouvert sur la nouvelle main, avec les étapes du bilan.
  assert.match(volet()?.className ?? '', /rpg-mulligan--resultat/, 'le volet passe à l’étape du résultat');
  assert.match(titre(), /nouvelle main/, 'le titre annonce la main qui vient d’être piochée');
  assert.equal(cartes().length, 5, 'la nouvelle main se relit en grand');
  assert.equal(cartes().filter((carte) => carte.classList.contains('is-new')).length, 2,
    'les deux cartes piochées sont signalées');
  assert.deepEqual(cartes().filter((carte) => carte.classList.contains('is-new')).map((carte) => carte.dataset.cardId),
    duel.joueur.main.slice(3), 'ce sont bien les cartes qui viennent d’entrer en main');
  assert.match(q('.rpg-mulligan__head p').textContent, /Vous écartez 2 cartes et piochez 2 cartes/,
    'le bilan résume l’échange');
  assert.match(q('.rpg-mulligan__head p').textContent, /le sorcier (en change \d|garde la sienne)/,
    'le bilan dit aussi ce qu’a fait le sorcier');
  assert.equal(q('.rpg-mulligan__valider'), null, 'plus de second échange possible');

  // ── 5. Le sorcier a eu le même droit ─────────────────────────────────────
  assert.equal(duel.sorcier.main.length, 5, 'la main du sorcier garde cinq cartes');
  assert.equal([...duel.sorcier.main, ...duel.sorcier.deck].sort().join('|'),
    [...sorcierAvant, ...sorcierPaquetAvant].sort().join('|'),
    'le sorcier non plus ne perd pas de carte en route');

  // ── 6. « Commencer le duel » rend la table au joueur ─────────────────────
  await click(q('.rpg-mulligan__commencer'), 'commencer le duel');
  await act(async () => { await wait(120); });
  assert.equal(volet(), null, 'le volet est fermé');
  assert.equal(q('.card-table').hasAttribute('inert'), false, 'la table n’est plus close');
  assert.match(q('.rpg-actions__wait').textContent, /Plateau :/,
    'le message d’ouverture du plateau survit au mulligan');
  assert.equal(q('.rpg-btn--endturn')?.disabled, false, 'le tour est maintenant au joueur');
  const terrainId = duel.joueur.main.find((id) => cardById(id)?.kind === 'terrain');
  assert.ok(terrainId, 'la main de départ gardée contient bien un terrain');
  const terrain = q(`.rpg-hand__card[data-card-id="${terrainId}"]`);
  assert.equal(terrain?.dataset.jouable, 'true', 'un terrain devient jouable dès la table rendue');
  await click(terrain, 'poser le terrain');
  // La carte vole vers la table : le geste n'est résolu qu'à l'atterrissage.
  await act(async () => { await wait(900); });
  assert.ok(q('.rpg-terrains--joueur .rpg-terrain'), 'le terrain est posé sur la table');

  await act(async () => { root.unmount(); });
  container.remove();

  // ── 7. Table neuve, droit rendu : la partie suivante a son propre mulligan ─
  const deuxieme = document.createElement('div');
  document.body.append(deuxieme);
  const secondRoot = createRoot(deuxieme);
  await act(async () => {
    secondRoot.render(<RpgDuelPage joueurDeck={DECK_JOUER} sorcierDeck={DECK_SORCIER} rng={() => 0.5} />);
  });
  await act(async () => {
    deuxieme.querySelector('.rpg-mode-menu__play .rpg-menu-button--primary').click();
  });
  await act(async () => { await wait(120); });
  assert.ok(deuxieme.querySelector('.rpg-mulligan'), 'une partie neuve rouvre son mulligan');
  assert.equal(rpgPeutMulligan(window.__RPG_DUEL__, 'joueur'), true, 'le droit est rendu avec la table neuve');
  // Le joueur qui n'a rien à changer n'a pas de nouvelle main à relire : un
  // seul geste suffit, et le message du plateau reste celui du duel.
  await act(async () => { deuxieme.querySelector('.rpg-mulligan__valider').click(); });
  assert.equal(deuxieme.querySelector('.rpg-mulligan'), null, 'un volet sans choix se referme d’un geste');
  assert.equal(deuxieme.querySelector('.card-table').hasAttribute('inert'), false, 'la table est rendue');
  assert.match(deuxieme.querySelector('.rpg-actions__wait').textContent, /Plateau :/,
    'garder sa main n’écrit pas un nouveau message par-dessus l’ouverture');
  await act(async () => { secondRoot.unmount(); });
  deuxieme.remove();
}
