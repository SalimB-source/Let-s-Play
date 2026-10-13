import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_LONG_PRESS_MS } from '../src/games/rpgLongPress.js';
import { passerMulligan } from './rpg-duel-start.js';

export async function checkRpgPreviewActions(assert) {
  const originalMatchMedia = window.matchMedia;
  // Landscape touch device; reduced motion makes card plays synchronous.
  window.matchMedia = () => ({ matches: true });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const click = async (element) => { assert.ok(element, 'action exists'); await act(async () => element.click()); };
  const hand = (id) => container.querySelector(`.rpg-hand__card[data-card-id="${id}"]`);
  const handCards = () => [...container.querySelectorAll('.rpg-hand__card')];
  // Au doigt, les exemplaires identiques forment une pile : le nombre de cartes
  // en main est la somme des compteurs ×N, pas le nombre d'emplacements.
  const totalMain = () => handCards().reduce((total, slot) => total + Number(slot.dataset.pileCount ?? 1), 0);
  const pileDe = (id) => hand(id)?.closest('.rpg-hand__pile');
  const terrain = () => container.querySelector('.rpg-terrain--joueur');
  const terrainsJoueurs = () => container.querySelectorAll('.rpg-terrain--joueur');
  const confirmDialog = () => container.querySelector('.rpg-spell-confirm[role="dialog"]');
  const confirmButton = (label) => [...(confirmDialog()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === label);
  const fennec = () => container.querySelector('.rpg-card--equipe[data-card-id="fennec-des-decombres"]');
  // Le geste tactile : `pointerdown` tenu une seconde, puis levé — exactement ce
  // qu'envoie un doigt sur l'APK ou le navigateur mobile.
  const peek = () => container.querySelector('.rpg-card-peek');
  const attendre = (ms) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));
  const envoyerPointeur = async (element, type, props = {}) => {
    assert.ok(element, 'la carte existe');
    await act(async () => {
      const evenement = new window.Event(type, { bubbles: true, cancelable: true });
      Object.assign(evenement, {
        pointerType: 'touch', pointerId: 7, clientX: 30, clientY: 30, isPrimary: true, button: 0, ...props,
      });
      element.dispatchEvent(evenement);
    });
  };
  const appuiLong = async (element) => {
    await envoyerPointeur(element, 'pointerdown');
    await attendre(RPG_LONG_PRESS_MS + 120);
    await envoyerPointeur(element, 'pointerup');
  };
  const changerEcran = async (libelle) => {
    await act(async () => {
      [...container.querySelectorAll('.rpg-mode-menu__switch button')]
        .find((button) => button.textContent.includes(libelle)).click();
    });
  };
  try {
    await act(async () => root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'rapport-du-greffier', 'fennec-des-decombres', 'desert', 'chien-du-guet', 'desert']}
      sorcierDeck={Array(15).fill('desert')} rng={() => .999}
    />));
    // ── Hors duel : le catalogue répond au même appui long ──────────────────
    await changerEcran('Catalogue');
    const carteCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="fennec-des-decombres"]');
    await appuiLong(carteCatalogue);
    assert.ok(peek(), 'une carte du catalogue s’aperçoit aussi par appui long');
    assert.ok(peek().getAttribute('aria-label').includes('Fennec'), 'le volet nomme la carte du catalogue');
    await attendre(460);
    await click(peek());
    assert.ok(peek() === null, 'le volet se referme au toucher');

    // ── Le créateur de deck répond au même geste ────────────────────────────
    await changerEcran('Deck');
    await click(container.querySelector('.rpg-deck-choice--neuf'), 'ouvrir l’atelier');
    assert.ok(container.querySelector('.rpg-atelier'), 'l’atelier de deck est ouvert');
    assert.match(container.querySelector('.rpg-atelier__astuce').textContent, /Appui long d’une seconde/,
      'l’atelier annonce le geste, comme la barre du duel');
    const carteAtelier = container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]');
    const lignesAtelier = () => container.querySelectorAll('.rpg-atelier__ligne').length;
    await appuiLong(carteAtelier);
    assert.ok(peek(), 'une carte de la bibliothèque de l’atelier s’aperçoit par appui long');
    assert.ok(peek().getAttribute('aria-label').includes('Chien du guet'),
      'le volet nomme la carte tenue dans la bibliothèque');
    assert.equal(lignesAtelier(), 0, 'consulter une carte de la bibliothèque ne l’ajoute pas au deck');
    await attendre(460);
    await click(peek());
    assert.ok(peek() === null, 'le volet se referme au toucher, dans l’atelier aussi');
    // Un appui long sur le bouton « + » consulte la carte sans l’ajouter ; le
    // clic simple, lui, garde son action d’atelier.
    await appuiLong(carteAtelier.querySelector('.rpg-atelier__carte-ajout'));
    assert.ok(peek(), 'le bouton « + » tenu une seconde ouvre l’aperçu de sa carte');
    assert.equal(lignesAtelier(), 0, 'l’appui long sur « + » n’ajoute pas la carte au deck');
    await attendre(460);
    await click(peek());
    await click(carteAtelier.querySelector('.rpg-atelier__carte-ajout'), 'ajouter Chien du guet');
    assert.equal(lignesAtelier(), 1, 'le clic simple ajoute bien la carte au deck en cours');
    const ligneAtelier = container.querySelector('.rpg-atelier__ligne[data-card-id="chien-du-guet"]');
    await appuiLong(ligneAtelier);
    assert.ok(peek(), 'la ligne du deck en cours s’aperçoit aussi par appui long');
    assert.ok(peek().getAttribute('aria-label').includes('Chien du guet'), 'le volet nomme la carte du deck en cours');
    assert.equal(lignesAtelier(), 1, 'consulter une ligne du deck ne la retire pas');
    await appuiLong(ligneAtelier.querySelector('.rpg-atelier__ligne-compte button'));
    assert.ok(peek(), 'le bouton « − » tenu une seconde ouvre l’aperçu de sa carte');
    assert.equal(lignesAtelier(), 1, 'l’appui long sur « − » ne retire pas la carte');
    await attendre(460);
    await click(peek());
    assert.ok(peek() === null, 'le volet se referme, et le deck en cours est intact');
    await changerEcran('Jouer');

    await click(container.querySelector('.rpg-menu-button--primary'));
    await passerMulligan(container, click);
    assert.ok(container.querySelector('.rpg-battle--touch'));

    // ── Au doigt, les exemplaires identiques de la main forment une pile ────
    assert.equal(totalMain(), 5, 'la main de départ compte cinq cartes');
    assert.equal(handCards().length, 4, 'les deux Désert identiques n’occupent qu’un emplacement');
    assert.equal(hand('desert').dataset.pileCount, '2', 'la pile annonce ses deux exemplaires');
    assert.equal(pileDe('desert').querySelector('.rpg-hand__pile-count').textContent, '×2',
      'le compteur ×N flotte sur la pile');
    assert.equal(pileDe('chien-du-guet').querySelector('.rpg-hand__pile-count'), null,
      'une carte seule n’affiche pas de compteur');
    assert.ok(hand('desert').getAttribute('aria-label').includes('pile de 2 exemplaires identiques'),
      'le libellé accessible dit combien d’exemplaires la pile contient');

    // ── Cliquer une carte non jouable ne lance rien, et ne dit rien ───────
    await click(hand('fennec-des-decombres'));
    assert.equal(hand('fennec-des-decombres').dataset.jouable, 'false',
      'une créature non payable reste éteinte : le refus se lit au halo, sans phrase');
    assert.ok(hand('fennec-des-decombres'), 'la créature non payable reste en main');
    assert.equal(terrainsJoueurs().length, 0, 'aucune carte n’est posée');
    assert.equal(confirmDialog(), null, 'aucune boîte de confirmation pour une créature');

    // ── Cliquer un terrain le pose immédiatement ; limite à un par tour ────
    await click(hand('desert'));
    assert.equal(terrainsJoueurs().length, 1, 'le clic pose le terrain sur la table');
    assert.equal(hand('desert').dataset.pileCount, '1',
      'poser un Désert retire un seul exemplaire de la pile');
    assert.equal(pileDe('desert').querySelector('.rpg-hand__pile-count'), null,
      'la pile redevenue seule perd son compteur');
    await click(hand('desert'));
    assert.equal(hand('desert').dataset.jouable, 'false',
      'le second terrain du tour s’éteint en main : le refus se lit au halo, sans phrase');
    assert.equal(terrainsJoueurs().length, 1, 'le terrain refusé reste en main');
    assert.equal(confirmDialog(), null, 'la limite de terrain ne demande pas de confirmation');

    // ── Une seule étape d’annulation restaure le terrain posé ──────────────
    await click(container.querySelector('.rpg-actions__turn .rpg-btn--undo'));
    assert.equal(terrainsJoueurs().length, 0, 'l’annulation retire le terrain posé');

    // ── Les magies demandent confirmation avant le lancement ──────────────
    // Le Rapport du greffier se paie trois manas : le scénario laisse donc le
    // joueur poser un terrain par tour pendant trois tours avant de le lancer.
    await click(hand('desert'));
    await click(container.querySelector('.rpg-btn--endturn'));
    await attendre(800);
    await click(hand('desert'));
    await click(container.querySelector('.rpg-btn--endturn'));
    await attendre(800);
    await click(hand('desert'));
    const mainAvantSort = totalMain();
    await click(hand('rapport-du-greffier'));
    assert.ok(confirmDialog(), 'cliquer une magie ouvre la confirmation de lancement');
    assert.ok(confirmDialog().textContent.includes('Lancer Rapport du greffier ?'),
      'la confirmation nomme le sort à lancer');
    assert.equal(confirmDialog().querySelectorAll('.rpg-spell-confirm__rules > span').length, 1,
      'la confirmation montre les effets du sort, un par ligne');
    await click(confirmButton('Annuler'));
    assert.equal(confirmDialog(), null, 'Annuler ferme la confirmation');
    assert.equal(totalMain(), mainAvantSort, 'le sort annulé reste en main');
    await click(hand('rapport-du-greffier'));
    await click(confirmButton('Lancer le sort'));
    assert.equal(confirmDialog(), null, 'confirmer ferme la boîte de lancement');
    assert.equal(totalMain(), mainAvantSort + 1,
      'le sort se lance : il quitte la main et pioche deux cartes');
    assert.equal(hand('desert').dataset.pileCount, '3',
      'les deux Désert piochés rejoignent la pile existante');
    assert.equal(handCards().length, 3,
      '… sans ajouter d’emplacement : la main reste courte au doigt');

    // ── Le tour suivant empile le second terrain, la créature se paie seule ─
    await click(container.querySelector('.rpg-btn--endturn'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 800)));
    await click(hand('desert'));
    assert.equal(terrainsJoueurs().length, 1, 'les terrains identiques forment une seule pile');
    assert.equal(terrain().dataset.terrainCount, '4');
    assert.equal(hand('desert').dataset.pileCount, '3',
      'le Désert posé quitte la pile, les autres exemplaires restent groupés');
    await click(hand('fennec-des-decombres'));
    assert.ok(fennec(), 'cliquer une créature payable la pose sur la table');
    assert.equal(terrain().dataset.tappedCount, '2',
      'le paiement automatique engage deux instances de la pile, pas la carte affichée deux fois');
    assert.equal(terrain().dataset.availableCount, '2',
      'les deux terrains de trop restent dégagés après le paiement');

    // ── La sélection d’attaque est directe, avec annulation et confirmation ─
    await click(container.querySelector('.rpg-btn--attaque-tous'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 1,
      'attaque en masse : les créatures prêtes sont sélectionnées depuis la table');
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'combat');
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, true);
    await click(container.querySelector('.rpg-btn--cancel-attack'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 0);
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'principal');
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, false);

    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), true,
      'cliquer la créature la déclare attaquante directement');
    assert.equal(fennec().dataset.combatTilted, 'true');
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), false,
      'recliquer la retire de l’attaque');
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), true);
    await click(container.querySelector('.rpg-btn--confirmer-attaque'));
    assert.equal(fennec().classList.contains('is-attacked'), true,
      'la confirmation résout l’attaque sans bloqueur');
    assert.equal(fennec().dataset.combatTilted, 'true');

    // ── Les gardes de cartes engagées restent actives sans aperçu ──────────
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), false,
      'une créature engagée ne peut pas attaquer deux fois');
    assert.equal(fennec().classList.contains('is-pret'), false,
      'la créature engagée perd son halo de disponibilité : le refus se voit sur la carte');
    // Les terrains que le paiement du Fennec a laissés dégagés produisent bien
    // leur mana au toucher, un exemplaire par clic ; une pile entièrement
    // engagée, elle, ne donne plus rien.
    await click(terrain());
    await click(terrain());
    const comptes = { available: terrain().dataset.availableCount, tapped: terrain().dataset.tappedCount };
    assert.deepEqual(comptes, { available: '0', tapped: '4' },
      'deux touches engagent les deux terrains restés libres de la pile');
    await click(terrain());
    assert.deepEqual(
      { available: terrain().dataset.availableCount, tapped: terrain().dataset.tappedCount }, comptes,
      'cliquer un terrain engagé ne produit pas de mana');

    // ── L'appui long d'une seconde ouvre l'aperçu de la carte, sans la jouer ─
    const carteMain = handCards().at(-1);
    const attendue = cardById(carteMain.dataset.cardId);
    const mainAvantAppui = totalMain();
    const terrainsAvantAppui = terrainsJoueurs().length;
    await appuiLong(carteMain);
    assert.ok(peek(), 'une seconde d’appui sur une carte en main ouvre son aperçu');
    assert.equal(peek().getAttribute('role'), 'dialog', 'l’aperçu au doigt est annoncé comme un volet');
    assert.ok(peek().getAttribute('aria-label').includes(attendue.name),
      'le volet nomme la carte tenue');
    const apercuAppui = peek().querySelector('.rpg-hover-card-preview--appui-long');
    assert.ok(apercuAppui, 'l’aperçu au doigt est bien l’aperçu instantané, dans sa variante tactile');
    const typeAppui = apercuAppui.querySelector('.rpg-hover-card-preview__type');
    const creatureAppui = ['creature', 'hero'].includes(attendue.kind);
    assert.equal(Boolean(typeAppui), !creatureAppui,
      'le volet imprime la ligne de type des magies et des terrains, et la tait pour une créature');
    const glyphesMana = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️' };
    const texteAttendu = attendue.kind === 'terrain'
      ? attendue.text?.replace(/\b(braise|eau|sable|neige)\b/giu, (couleur) => glyphesMana[couleur.toLowerCase()])
      : attendue.text;
    const lignesAttendues = texteAttendu && texteAttendu !== '—'
      ? texteAttendu.split(/\n+|(?<=[.!?])\s+/u).map((ligne) => ligne.trim()).filter(Boolean)
      : [];
    assert.deepEqual(
      [...apercuAppui.querySelectorAll('.rpg-hover-card-preview__rules > span')].map((node) => node.textContent),
      lignesAttendues,
      'les effets de la carte tiennent dans l’aperçu, un par ligne');
    if (attendue.kind === 'creature' || attendue.kind === 'hero') {
      assert.equal(apercuAppui.querySelector('.rpg-hover-card-preview__stats')?.textContent.trim(),
        `⚔ ${attendue.atk} · 🛡 ${attendue.def}`, 'l’attaque et la défense restent lisibles au doigt');
    }
    assert.equal(totalMain(), mainAvantAppui, 'l’appui long ne joue pas la carte');
    assert.equal(terrainsJoueurs().length, terrainsAvantAppui, 'l’appui long ne pose rien sur la table');
    assert.ok(confirmDialog() === null, 'consulter une carte ne demande pas de confirmation');
    // Le clic synthétique qui suit le lever du doigt est avalé.
    await click(carteMain);
    assert.ok(peek(), 'le clic qui suit l’appui long ne referme pas l’aperçu');
    assert.equal(totalMain(), mainAvantAppui, '… et ne joue pas la carte non plus');
    // La fenêtre qui avale le clic synthétique est passée : le volet répond.
    await attendre(460);
    await click(peek());
    assert.ok(peek() === null, 'toucher le volet referme l’aperçu');

    // ── Interrompu entre le déclenchement et la levée, l'aperçu tient ──────
    // Un `scroll` (autoFocus du volet, rail de main qui remue) ou un
    // `pointercancel` de WebView peut arriver pendant que le doigt tient
    // encore : l'aperçu venait de s'ouvrir, le clic qui suit la levée doit
    // être avalé quand même — sinon le volet se referme à peine ouvert et le
    // joueur ne voit « rien ne se passe ».
    for (const interruption of ['scroll', 'pointercancel']) {
      await envoyerPointeur(carteMain, 'pointerdown');
      await attendre(RPG_LONG_PRESS_MS + 120);
      assert.ok(peek(), `${interruption} : l’aperçu s’ouvre avant l’interruption`);
      await act(async () => {
        const evenement = new window.Event(interruption, { bubbles: true, cancelable: true });
        Object.assign(evenement, { pointerId: 7, clientX: 30, clientY: 30 });
        window.dispatchEvent(evenement);
      });
      await envoyerPointeur(carteMain, 'pointerup');
      assert.ok(peek(), `${interruption} : l’aperçu reste ouvert après la levée du doigt`);
      await click(carteMain);
      assert.ok(peek(), `${interruption} : le clic qui suit ne referme pas l’aperçu`);
      assert.equal(totalMain(), mainAvantAppui, `${interruption} : … et ne joue pas la carte`);
      await attendre(460);
      await click(peek());
      assert.ok(peek() === null, `${interruption} : le volet répond ensuite normalement`);
    }

    // ── Sur la table : l'aperçu ne déclare ni attaque ni mana ───────────────
    await appuiLong(fennec());
    assert.ok(peek(), 'une créature en jeu s’aperçoit aussi par appui long');
    assert.ok(peek().getAttribute('aria-label').includes('Fennec'), 'l’aperçu nomme la créature tenue');
    assert.equal(fennec().classList.contains('is-selected'), false,
      'l’appui long ne déclare pas la créature attaquante');
    assert.equal(fennec().dataset.combatTilted, 'true', 'son état de combat ne change pas');
    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    assert.ok(peek() === null, 'Échap referme l’aperçu au doigt');

    // ── Un doigt qui glisse consulte autre chose : la main qui défile ───────
    await envoyerPointeur(carteMain, 'pointerdown');
    await envoyerPointeur(window.document.body, 'pointermove', { clientX: 90, clientY: 30 });
    await attendre(RPG_LONG_PRESS_MS + 120);
    assert.ok(peek() === null, 'un appui qui défile n’ouvre pas d’aperçu');
    await envoyerPointeur(carteMain, 'pointerup');

    // ── Un appui court reste un clic : la carte agit, l'aperçu ne s'ouvre pas ─
    const carteCourte = handCards()[0];
    let clicRecu = false;
    const noterClic = () => { clicRecu = true; };
    carteCourte.addEventListener('click', noterClic);
    await envoyerPointeur(carteCourte, 'pointerdown');
    await attendre(140);
    await envoyerPointeur(carteCourte, 'pointerup');
    assert.ok(peek() === null, 'un appui court n’ouvre pas l’aperçu');
    await click(carteCourte);
    carteCourte.removeEventListener('click', noterClic);
    assert.ok(clicRecu, 'un appui court laisse passer le clic : la carte garde son action de jeu');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.matchMedia = originalMatchMedia;
  }
}
