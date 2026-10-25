import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { cardById } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { RPG_LONG_PRESS_MS } from '../src/games/rpgLongPress.js';
import { crediterCredits, portefeuilleVide, sauverPortefeuille } from '../src/games/rpgCredits.js';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

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
  const caseLibre = (numero) => container.querySelector(`.rpg-creature-slot--choix[data-creature-slot="${numero}"]`);
  const poserSurCase = async (numero = 1) => {
    assert.ok(caseLibre(numero), `la case libre ${numero} attend la créature choisie`);
    await click(caseLibre(numero));
  };
  // Le geste tactile : `pointerdown` tenu une seconde, puis levé — exactement ce
  // qu'envoie un doigt sur l'APK ou le navigateur mobile.
  const peek = () => container.querySelector('.rpg-card-peek');
  const attendre = (ms) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));
  // Le sorcier (IA Veilleur) joue son tour avec ses propres cadences : le
  // scénario attend le retour de parole plutôt qu'un temps fixe.
  const attendreTourJoueur = async () => {
    for (let essai = 0; essai < 40; essai += 1) {
      if (container.querySelector('.rpg-turn-indicator')?.textContent.includes('À VOTRE TOUR')) {
        // Le surlignage « début de tour » dure encore 800 ms après la reprise
        // de la parole : la piste de phase ne se lit qu'une fois retombé.
        await attendre(820);
        return;
      }
      await attendre(100);
    }
    assert.fail('le tour du sorcier ne rend jamais la parole au joueur');
  };
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
  // Le clic droit de la souris : `contextmenu`, bouton 2, exactement ce
  // qu'envoie le navigateur. Le scénario le veut étouffé partout — le menu du
  // navigateur n'appartient à aucun geste du jeu — et porteur d'un sens sur
  // une carte : la fiche s'ouvre.
  const clicDroit = async (element) => {
    assert.ok(element, 'la cible du clic droit existe');
    let envoye = null;
    await act(async () => {
      envoye = new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, buttons: 2 });
      element.dispatchEvent(envoye);
    });
    return envoye;
  };
  const changerEcran = async (libelle) => {
    await act(async () => {
      [...container.querySelectorAll('.rpg-mode-menu__switch button')]
        .find((button) => button.textContent.includes(libelle)).click();
    });
  };
  try {
    // Le parcours mobile ouvre un vrai paquet : la bourse est financée par la
    // règle de crédit, puis relue par le même hook que dans l'application.
    sauverPortefeuille(crediterCredits(portefeuilleVide(), 1000).portefeuille);
    await act(async () => root.render(<RpgDuelPage
      joueurDeck={[
        // Trente cartes mono-Sable, dans l'ordre : la pioche tire depuis la
        // fin — main de départ [Rapport, Chien, Chien], tour 2 le Fennec,
        // Butin la Tislit (défaussée au choix), tour 3 le Cavalier, et le
        // Rapport les deux suivants. Trente cartes : aucun remplissage auto.
        'faucon-du-zenith', 'dame-aux-ailes-d-or', 'mousse-des-galiotes', 'mousse-des-galiotes',
        'tercio-de-cuivre', 'tercio-de-cuivre', 'negociant-des-ranscons', 'negociant-des-ranscons',
        'guetteur-du-beffroi', 'guetteur-du-beffroi', 'dune-marchante', 'dune-marchante',
        'faussoyeur-des-dunes', 'faussoyeur-des-dunes', 'scribe-de-la-liste', 'scribe-de-la-liste',
        'tiziri-du-djurdjura', 'tiziri-du-djurdjura', 'amani-des-ksour', 'amani-des-ksour',
        'amayas-du-hoggar', 'amayas-du-hoggar', 'tour-de-sable',
        'faiseur-de-passage', 'cavalier-amazigh-du-desert', 'tislit-des-aures',
        'fennec-des-decombres', 'chien-du-guet', 'chien-du-guet', 'rapport-du-greffier',
      ]}
      sorcierDeck={[
        // Trente cartes à trois manas ou plus : la réserve des deux premiers
        // tours du sorcier ne peut rien payer — il regarde la table, passif.
        'susanoo', 'orochi', 'cavalier-des-deux-sabres', 'ronin-du-soleil-rouge',
        'ronin-du-soleil-rouge', 'samourai-du-torii', 'samourai-du-torii',
        'onna-musha-des-cendres', 'onna-musha-des-cendres', 'tengu-du-mont-ardent',
        'tengu-du-mont-ardent', 'oni-de-la-fournaise', 'kagutsuchi-flamme-originelle',
        'kenshi-de-la-forge', 'kenshi-de-la-forge', 'tojiro-le-pourfendeur',
        'daimyo-du-soleil-rouge', 'ureus-du-seuil', 'ureus-du-seuil', 'momie-de-lin',
        'momie-de-lin', 'ibis-des-comptes', 'ibis-des-comptes', 'celle-qui-pese',
        'celle-qui-pese', 'la-devoreuse', 'celui-qui-juge', 'celui-qui-juge',
        'passeur-au-masque-de-chacal', 'maitre-des-hieroglyphes',
      ]}
      rng={() => .999}
    />));
    // ── Hors duel : le catalogue se clique, la carte s'ouvre en grand ───────
    await changerEcran('Catalogue');
    const FENNEC = 'fennec-des-decombres';
    const carteDe = (id) => container.querySelector(`.rpg-card-catalogue__card[data-card-id="${id}"]`);
    const ouvrirDe = (id) => carteDe(id)?.querySelector('.rpg-card-catalogue__ouvrir');
    const ordreGrille = () => [...container.querySelectorAll('.rpg-card-catalogue__card')].map((carte) => carte.dataset.cardId);
    const compteCatalogue = () => container.querySelector('.rpg-card-catalogue__count').textContent;
    const cartesAffichees = () => container.querySelectorAll('.rpg-card-catalogue__card').length;
    const fiche = () => container.querySelector('.rpg-card-peek--catalogue');
    const carteOuverte = () => fiche()?.dataset.cataloguePreview;
    const nomOuvert = () => fiche()?.querySelector('.rpg-hover-card-preview__name').textContent;
    // Ce que la fiche ne porte jamais : ni flèches sur les côtés, ni compteur
    // de position — une carte, une fiche, rien à feuilleter.
    const feuillets = () => fiche()?.querySelector('.rpg-card-peek__nav') ?? null;
    const compteurFiche = () => fiche()?.querySelector('.rpg-card-peek__position') ?? null;
    const touche = (key) => act(async () => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
    });
    const filtrer = async (libelle, valeur) => act(async () => {
      const select = container.querySelector(`.rpg-card-catalogue__filters select[aria-label="${libelle}"]`);
      assert.ok(select, `le filtre « ${libelle} » existe`);
      select.value = valeur;
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    const compteAvantFiche = compteCatalogue();
    const cartesAvantFiche = cartesAffichees();
    assert.ok(ordreGrille().length > 3, 'la grille du catalogue est bien remplie');
    assert.ok(ouvrirDe(FENNEC), 'chaque carte du catalogue porte son bouton d’ouverture');
    assert.match(ouvrirDe(FENNEC).getAttribute('aria-label'), /^Agrandir Fennec des décombres — Créature, coût 2 mana/u,
      'le bouton dit ce qu’il ouvre, et que le clic n’agit pas sur la partie');
    await click(ouvrirDe(FENNEC));
    assert.ok(fiche(), 'un clic sur une carte du catalogue ouvre sa fiche');
    assert.equal(carteOuverte(), FENNEC, 'la fiche est celle de la carte cliquée');
    assert.equal(fiche().getAttribute('aria-label'), 'Fiche de Fennec des décombres', 'le volet nomme la carte ouverte');
    assert.equal(fiche().getAttribute('role'), 'dialog', 'la fiche est une boîte de dialogue');
    assert.match(fiche().querySelector('.rpg-hover-card-preview__face img').getAttribute('src'),
      /cards\/fennec-des-decombres\.jpg/u, 'la fiche montre l’illustration de la carte, en grand');
    assert.equal(nomOuvert(), 'Fennec des décombres', 'la fiche porte le nom de la carte');
    assert.equal(fiche().querySelector('.rpg-hover-card-preview__eyebrow').textContent, 'CATALOGUE · CRÉATURE',
      'la fiche dit d’où elle vient et la famille de la carte');
    assert.equal(fiche().querySelector('.rpg-hover-card-preview__type').textContent, 'Type — Fennec',
      'la ligne de type reste lisible sur la fiche d’une créature');
    assert.match(fiche().querySelector('.rpg-hover-card-preview__color').textContent, /Sable · Désert/u,
      'la fiche écrit la couleur comme la grille du catalogue');
    // Les deux capacités du Fennec sont des mots-clés : la fiche les nomme en
    // pastilles — le mot seul, son « ? » de survol au bout — et chacune ouvre
    // sa bulle : plus aucune règle imprimée dans la fiche.
    const pastillesFiche = [...fiche().querySelectorAll('.rpg-hover-card-preview__pastilles .rpg-pastille')];
    assert.deepEqual(pastillesFiche.map((pastille) => pastille.textContent),
      ['Rapidité', 'Butin'], 'les deux capacités du Fennec sont nommées en pastilles, sans explication dessous');
    assert.equal(fiche().querySelector('.rpg-hover-card-preview__pastilles .rpg-pastille__explication'), null,
      'aucune explication ne s’écrit sous un mot-clé');
    assert.match(pastillesFiche[1].getAttribute('aria-label') ?? '', /Quand cette créature touche le sorcier adverse/,
      'la pastille annonce sa description complète aux lecteurs d’écran');
    assert.equal(pastillesFiche[0].getAttribute('tabindex'), '0',
      'le mot-clé attend le survol, le toucher ou le focus clavier');
    assert.equal(fiche().querySelector('.rpg-hover-card-preview__rules'), null,
      'la fiche n’imprime plus la règle : les mots-clés la portent seuls');
    assert.match(fiche().querySelector('.rpg-hover-card-preview__hint')?.textContent ?? '', /Survolez un mot-clé pour lire son effet/,
      'la fiche indique que chaque mot-clé s’explique au survol');
    assert.equal(document.querySelector('.rpg-pastille-bulle'), null,
      'aucune bulle n’est ouverte tant qu’aucun mot-clé n’est survolé');
    await act(async () => {
      const entre = new window.MouseEvent('pointerover', { bubbles: true, relatedTarget: document.body });
      Object.defineProperty(entre, 'pointerType', { value: 'mouse' });
      pastillesFiche[1].dispatchEvent(entre);
    });
    const bulleFiche = document.querySelector('.rpg-pastille-bulle');
    assert.ok(bulleFiche, 'survoler le mot-clé de la fiche ouvre sa bulle');
    assert.match(bulleFiche?.textContent ?? '', /Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une\./u,
      'la bulle porte la description complète de l’effet');
    await act(async () => {
      const sortie = new window.MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body });
      Object.defineProperty(sortie, 'pointerType', { value: 'mouse' });
      pastillesFiche[1].dispatchEvent(sortie);
    });
    assert.equal(document.querySelector('.rpg-pastille-bulle'), null,
      'la bulle se referme quand la souris quitte le mot-clé');
    assert.equal(fiche().querySelector('.rpg-hover-card-preview__face .rpg-card__stat--atk .rpg-stat-value')?.textContent, '3',
      'la fiche imprime l’attaque sur la carte');
    assert.equal(fiche().querySelector('.rpg-hover-card-preview__face .rpg-card__pt .rpg-stat-value')?.textContent, '1',
      'la fiche imprime la défense sur la carte');
    assert.ok(container.querySelector('.rpg-card-catalogue'), 'le catalogue reste ouvert sous la fiche');

    assert.ok(container.querySelector('.rpg-card-catalogue'), 'le catalogue reste ouvert sous la fiche');

    // ── **Une carte, une fiche** : rien à feuilleter, nulle part ────────────
    // Le volet ne montre que la carte ouverte : pas de flèches sur les côtés,
    // pas de compteur, pas de balayage, pas de flèches au clavier. Pour lire
    // une autre carte, on ouvre la sienne.
    assert.equal(feuillets(), null, 'la fiche n’a pas de flèches : elle ne montre que la carte ouverte');
    assert.equal(compteurFiche(), null, 'et pas de compteur de position : il n’y a rien à compter');
    await touche('ArrowRight');
    assert.equal(carteOuverte(), FENNEC, 'la flèche droite du clavier ne change pas de carte : il n’y a pas de page suivante');
    await touche('Home');
    assert.equal(carteOuverte(), FENNEC, 'Début non plus : la fiche reste sur la carte ouverte');
    assert.equal(compteCatalogue(), compteAvantFiche, 'consulter une carte ne change pas les filtres du catalogue');
    assert.equal(cartesAffichees(), cartesAvantFiche, 'la grille garde toutes ses cartes : rien n’a été joué ni retiré');

    // ── Ses trois fermetures : le bouton, Échap, le volet ───────────────────
    await click(fiche().querySelector('.rpg-card-peek__close'));
    assert.equal(fiche(), null, 'le bouton Fermer referme la fiche');
    await click(ouvrirDe(FENNEC));
    assert.equal(carteOuverte(), FENNEC, 'rouvrir la carte rouvre la même fiche');
    await touche('Escape');
    assert.equal(fiche(), null, 'Échap referme la fiche');
    await click(ouvrirDe(FENNEC));
    await click(fiche());
    assert.equal(fiche(), null, 'toucher le volet referme la fiche, comme l’aperçu au doigt');

    // ── Verrouillée, la carte garde sa fiche et son aperçu ──────────────────
    const KRAKEN = 'kraken';
    const kraken = carteDe(KRAKEN);
    assert.ok(kraken?.classList.contains('is-locked'), 'le Kraken, absent de la collection de départ, est marqué verrouillé');
    assert.equal(kraken.dataset.locked, 'true', 'l’état verrouillé est aussi exposé sur la vignette');
    assert.equal(kraken.querySelector('.rpg-card-catalogue__lock')?.textContent, '🔒',
      'la carte verrouillée montre un cadenas au milieu de son illustration');
    assert.equal(ouvrirDe(KRAKEN).disabled, false, 'le bouton d’aperçu de la carte verrouillée reste actif');
    assert.match(ouvrirDe(KRAKEN).getAttribute('aria-label'), /carte verrouillée/u,
      'le libellé accessible annonce le verrou sans masquer l’action de consulter');
    await click(ouvrirDe(KRAKEN));
    assert.equal(carteOuverte(), KRAKEN, 'cliquer une carte verrouillée ouvre toujours sa fiche complète');
    assert.match(fiche().querySelector('.rpg-hover-card-preview__face img').getAttribute('src'),
      /cards\/kraken\.jpg/u, 'la fiche de la carte verrouillée garde son illustration');
    await click(fiche().querySelector('.rpg-card-peek__close'));
    assert.equal(fiche(), null, 'la fiche de la carte verrouillée se ferme normalement');

    // ── Filtrer ne change rien au geste : la fiche ouvre la carte cliquée ───
    await filtrer('Filtrer par type', 'magie');
    const magies = ordreGrille();
    assert.ok(magies.length > 2 && magies.every((id) => cardById(id).kind === 'magie'),
      'le filtre de type ne laisse que des magies dans la grille');
    await click(ouvrirDe(magies[1]));
    assert.equal(carteOuverte(), magies[1], 'la fiche s’ouvre sur la magie cliquée');
    assert.equal(fiche().querySelector('.rpg-card-peek__nav'), null,
      'une magie ouverte garde la même fiche : une carte, aucune flèche');
    await click(fiche().querySelector('.rpg-card-peek__close'));
    assert.equal(fiche(), null, 'le bouton Fermer referme la fiche ouverte depuis la grille filtrée');
    await filtrer('Filtrer par type', 'tous');
    assert.equal(cartesAffichees(), cartesAvantFiche, 'le filtre remis à « tous », la grille est de nouveau complète');

    // ── Le catalogue répond aussi à l'appui long, qui garde son aperçu rapide ─
    await appuiLong(carteDe(FENNEC));
    assert.ok(peek(), 'une carte du catalogue s’aperçoit aussi par appui long');
    assert.ok(peek().getAttribute('aria-label').includes('Fennec'), 'le volet nomme la carte du catalogue');
    assert.equal(fiche(), null, 'l’appui long ouvre l’aperçu rapide, pas la fiche du clic — et le clic avalé ne l’ouvre pas non plus');
    assert.equal(peek().querySelector('.rpg-card-peek__nav'), null,
      'l’aperçu de l’appui long n’a pas de flèches : il ne feuillette pas, il consulte');
    await attendre(460);
    await click(peek());
    assert.ok(peek() === null, 'le volet se referme au toucher');
    assert.equal(fiche(), null, 'le clic qui suit la levée du doigt n’ouvre pas la fiche');

    // ── Le clic droit ouvre la fiche, sans passer par le bouton étiré ───────
    // La souris a le survol et le clic ; le bouton droit, lui, est le seul
    // geste qui consulte sans risquer d'agir : il ouvre la fiche du catalogue
    // comme il l'ouvrira sur la table du duel. **Une carte, une fiche** : le
    // clic droit ne montre que la carte qu'il désigne — pas de flèches, pas de
    // compteur, pas de voisine, rien à feuilleter.
    const menuCatalogue = await clicDroit(carteDe(FENNEC));
    assert.equal(menuCatalogue.defaultPrevented, true,
      'le menu du navigateur ne s’ouvre pas sur une carte du catalogue');
    assert.ok(fiche(), 'le clic droit ouvre la fiche de la carte');
    assert.equal(carteOuverte(), FENNEC, 'la fiche est celle de la carte cliquée à droite');
    assert.equal(fiche().querySelector('.rpg-hover-card-preview__eyebrow').textContent, 'CATALOGUE · CRÉATURE',
      'la fiche dit toujours d’où elle vient quand le catalogue l’ouvre');
    assert.equal(feuillets(), null, 'la fiche du clic droit n’a aucune flèche');
    assert.equal(compteurFiche(), null, 'ni de compteur : elle ne montre que la carte désignée');
    await clicDroit(fiche());
    assert.equal(carteOuverte(), FENNEC,
      'cliquer droit le volet lui-même ne change pas de carte — et n’ouvre rien d’autre');
    await touche('Escape');
    assert.equal(fiche(), null, 'Échap referme la fiche ouverte au clic droit');
    assert.equal(compteCatalogue(), compteAvantFiche, 'et le catalogue n’a pas bougé');
    // Le clic du catalogue ouvre exactement la même fiche, sans flèches non
    // plus : les deux gestes se rejoignent — une carte, une fiche.
    await click(ouvrirDe(FENNEC));
    assert.equal(feuillets(), null, 'la fiche ouverte au clic n’a pas de flèches elle non plus');
    await touche('Escape');

    // ── Le Souk garde son aperçu tactile sur un téléphone en portrait ──────
    // La rotation forcée ne concerne que la table du duel. Ici, le viewport et
    // le geste sont ceux d'un téléphone : la fiche doit survivre à l'effet qui
    // ferme les aperçus quand l'écran de rotation d'un duel prend la main.
    await changerEcran('Souk');
    const largeurAvantPortrait = window.innerWidth;
    const hauteurAvantPortrait = window.innerHeight;
    await act(async () => {
      window.innerWidth = 390;
      window.innerHeight = 844;
      window.dispatchEvent(new window.Event('resize'));
    });
    const paquetSouk = container.querySelector('[data-souk-ouvrir="souk"]');
    assert.ok(paquetSouk && !paquetSouk.disabled, 'le paquet du Souk est ouvert sur le téléphone');
    await click(paquetSouk);
    assert.ok(container.querySelector('[data-souk-ceremonie]'), 'le paquet ouvre sa cérémonie en portrait');
    const carteCachee = container.querySelector('.rpg-souk__carte-retourne:not(.is-revelee) > .rpg-souk__carte[data-card-id]');
    if (carteCachee) {
      await clicDroit(carteCachee);
      assert.equal(fiche(), null, 'une carte encore face cachée ne dévoile pas sa fiche au clic droit');
    }
    const passerRevelation = container.querySelector('[data-souk-ceremonie-passer]');
    if (passerRevelation) await click(passerRevelation);
    const carteBooster = container.querySelector('[data-souk-carte][data-card-id]');
    assert.ok(carteBooster, 'une carte révélée du booster peut recevoir le geste tactile');
    const menuBooster = await clicDroit(carteBooster.querySelector('img') ?? carteBooster);
    assert.equal(menuBooster.defaultPrevented, true, 'le menu natif est étouffé sur une carte ouverte du booster');
    assert.ok(fiche(), 'le clic droit sur l’illustration ouvre la fiche d’une carte ouverte dans un booster du Souk');
    assert.equal(fiche().dataset.cataloguePreview, carteBooster.dataset.cardId,
      'la fiche du booster montre bien la carte cliquée droit');
    assert.match(fiche().querySelector('.rpg-hover-card-preview__eyebrow').textContent, /^LE SOUK · /u,
      'le sur-titre de la fiche rappelle l’ouverture au Souk');
    assert.ok(container.querySelector('[data-souk-ceremonie]'), 'le clic droit ne ferme pas la cérémonie du booster');
    await click(fiche().querySelector('.rpg-card-peek__close'));
    assert.equal(fiche(), null, 'la fiche du clic droit se referme sans quitter le booster');
    const placeBooster = carteBooster.closest('.rpg-souk__carte-place');
    await clicDroit(placeBooster);
    assert.ok(fiche(), 'même un clic droit reçu par l’emplacement 2D (.rpg-souk__carte-place) ouvre la fiche de la carte');
    await click(fiche().querySelector('.rpg-card-peek__close'));
    assert.equal(fiche(), null, 'la fiche ouverte depuis l’emplacement se referme proprement');
    await appuiLong(carteBooster);
    assert.ok(peek(), 'l’appui long ouvre la preview du booster sur téléphone portrait');
    assert.ok(peek().getAttribute('aria-label').includes(cardById(carteBooster.dataset.cardId).name),
      'la preview mobile nomme la carte réellement tenue');
    await attendre(100);
    assert.ok(peek(), 'la preview du Souk reste ouverte après sa première frame en portrait');
    assert.ok(container.querySelector('[data-souk-ceremonie]'), 'consulter la carte ne ferme pas la cérémonie');
    await attendre(460);
    await click(peek());
    assert.equal(peek(), null, 'le volet tactile du Souk se referme au toucher');
    await click(container.querySelector('[data-souk-ceremonie-ranger]'));
    assert.equal(container.querySelector('[data-souk-ceremonie]'), null, 'la cérémonie rend la main après consultation');
    await act(async () => {
      window.innerWidth = largeurAvantPortrait;
      window.innerHeight = hauteurAvantPortrait;
      window.dispatchEvent(new window.Event('resize'));
    });

    // ── Le créateur de deck répond au même geste ────────────────────────────
    await changerEcran('Deck');
    await click(container.querySelector('.rpg-deck-choice--neuf'), 'ouvrir l’atelier');
    assert.ok(container.querySelector('.rpg-atelier'), 'l’atelier de deck est ouvert');
    assert.match(container.querySelector('.rpg-atelier__astuce').textContent, /Appui long d’une seconde/,
      'l’atelier annonce le geste, comme la barre du duel');
    const carteAtelier = container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]');
    const lignesAtelier = () => container.querySelectorAll('.rpg-atelier__ligne').length;
    // Le clic droit, lui, a déjà son sens dans l'atelier : il retire un
    // exemplaire. Il ne remonte donc pas jusqu'à la page, qui aurait ouvert la
    // fiche en plus — les deux gestes ne se marchent pas dessus.
    const menuAtelier = await clicDroit(carteAtelier);
    assert.equal(menuAtelier.defaultPrevented, true,
      'le menu du navigateur reste étouffé sur une carte de l’atelier');
    assert.equal(fiche(), null, 'et le clic droit de l’atelier n’ouvre pas la fiche : il a son sens à lui');
    assert.equal(lignesAtelier(), 0, 'il ne retire rien d’un deck où la carte n’est pas encore');
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
    // Le clic droit d'une ligne du deck retire son exemplaire, et rien d'autre.
    await clicDroit(ligneAtelier);
    assert.equal(fiche(), null, 'le clic droit d’une ligne du deck n’ouvre pas la fiche');
    assert.equal(lignesAtelier(), 0, 'il retire bien l’exemplaire, comme le veut l’atelier');
    await click(carteAtelier.querySelector('.rpg-atelier__carte-ajout'), 'remettre Chien du guet');
    assert.equal(lignesAtelier(), 1, 'le deck en cours est comme avant');
    await changerEcran('Jouer');

    await lancerDuelDepuisMenu(container, click);
    await passerMulligan(container, click);
    assert.ok(container.querySelector('.rpg-battle--touch'));

    // ── Au doigt, chaque carte garde sa place : le mode essai refuse les piles ─
    assert.equal(totalMain(), 3, 'la main de départ en compte trois');
    assert.equal(handCards().length, 3, 'deux Chiens du guet identiques gardent chacun leur emplacement');
    assert.equal(hand('chien-du-guet').dataset.pileCount, '1',
      'aucun compteur ×N : chaque exemplaire reste sa propre carte');
    assert.equal(container.querySelector('.rpg-hand__pile'), null,
      'aucune pile ne se forme, même pour des exemplaires identiques');
    assert.ok(hand('chien-du-guet').getAttribute('aria-label').includes('Chien du guet'),
      'le libellé accessible nomme la carte tenue');

    // ── Cliquer une carte non jouable ne lance rien, et ne dit rien ───────
    await click(hand('chien-du-guet'));
    assert.equal(hand('chien-du-guet').dataset.jouable, 'false',
      'une créature non payable reste éteinte : le refus se lit au halo, sans phrase');
    assert.ok(hand('chien-du-guet'), 'la créature non payable reste en main');
    assert.equal(container.querySelector('.rpg-card--equipe'), null, 'aucune créature n’est posée');
    assert.equal(confirmDialog(), null, 'aucune boîte de confirmation pour une créature');

    // ── Tour 2 : la créature payable se paie seule, et l’annulation revient ─
    // Le mode essai paie sans terrains : la réserve grandit d’un mana par tour.
    // Au second tour, le Fennec de deux manas se paie d’un simple clic.
    await click(container.querySelector('.rpg-btn--endturn'));
    await attendreTourJoueur();
    console.log('DEBUG t2 apres attente:', handCards().map((s) => s.dataset.cardId));
    await click(hand('fennec-des-decombres'));
    assert.equal(fennec(), null, 'cliquer une créature payable ouvre le choix de sa case, sans la poser');
    assert.ok(container.querySelector('.rpg-target-prompt')?.textContent.includes('Choisissez l’emplacement'),
      'la table demande sur quel emplacement poser la créature');
    await poserSurCase(4);
    assert.ok(fennec(), 'cliquer une case libre pose la créature sur la table');
    assert.equal(fennec().dataset.caseEssai, '4', 'la créature occupe la case choisie, pas la première libre');
    assert.ok(container.querySelector('.rpg-actions__turn .rpg-btn--undo'),
      'jouer une carte ouvre un retour en arrière d’un pas');
    await click(container.querySelector('.rpg-actions__turn .rpg-btn--undo'));
    assert.equal(fennec(), null, 'l’annulation retire la créature posée');
    assert.ok(hand('fennec-des-decombres'), 'et la rend à la main');
    await click(hand('fennec-des-decombres'));
    await poserSurCase(4);
    assert.ok(fennec(), 'rejouée, la créature regagne la table');

    // ── La sélection d’attaque est directe, avec annulation et confirmation ─
    await click(container.querySelector('.rpg-btn--attaque-tous'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 1,
      'attaque en masse : les créatures prêtes sont sélectionnées depuis la table');
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'attaque');
    assert.equal(container.querySelector('.rpg-btn--endturn').disabled, true);
    await click(container.querySelector('.rpg-btn--cancel-attack'));
    assert.equal(container.querySelectorAll('.rpg-card--equipe.is-selected').length, 0);
    assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'principale');
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

    // ── Le Butin pioche une carte, puis sa défausse attend le choix du joueur ─
    assert.ok(hand('tislit-des-aures'), 'toucher le sorcier déclenche le Butin : une carte piochée');
    assert.equal(totalMain(), 4, 'le Butin pioche, et sa défausse reste en attente');
    assert.equal(container.querySelector('.rpg-btn--discard-confirm'), null,
      'aucune validation de défausse avant d’avoir choisi la carte');
    await click(hand('tislit-des-aures'));
    assert.ok(container.querySelector('.rpg-btn--discard-confirm'),
      'choisir une carte de la main ouvre la validation de la défausse');
    await click(container.querySelector('.rpg-btn--discard-confirm'));
    assert.equal(hand('tislit-des-aures'), null, 'la carte choisie part à la défausse');
    assert.equal(totalMain(), 3, 'le Butin laisse la main là où elle était');

    // ── Les gardes de cartes engagées restent actives sans aperçu ──────────
    await click(fennec());
    assert.equal(fennec().classList.contains('is-selected'), false,
      'une créature engagée ne peut pas attaquer deux fois');
    assert.equal(fennec().classList.contains('is-pret'), false,
      'la créature engagée perd son halo de disponibilité : le refus se voit sur la carte');

    // ── Les magies demandent confirmation avant le lancement ──────────────
    // Le Rapport du greffier se paie trois manas : le troisième tour ouvre
    // enfin assez de réserve pour le lancer.
    await click(container.querySelector('.rpg-btn--endturn'));
    await attendreTourJoueur();
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
    assert.ok(hand('faiseur-de-passage') && hand('tour-de-sable'),
      'les deux cartes piochées atterrissent en main');
    assert.equal(handCards().length, 5,
      'une carte, une place : chaque pioche prend son emplacement');


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
    assert.equal(apercuAppui.querySelectorAll('.rpg-hover-card-preview__rules').length, 0,
      'l’aperçu au doigt n’imprime plus la règle : ses mots-clés la portent');
    const pastillesAttendues = effetsDetailles(attendue).pastilles
      .map((pastille) => (pastille.valeur != null && !pastille.valeurMasquee
        ? `${pastille.label} ${pastille.valeur}`
        : pastille.label));
    assert.deepEqual(
      [...apercuAppui.querySelectorAll('.rpg-hover-card-preview__pastilles .rpg-pastille')].map((node) => node.textContent),
      pastillesAttendues,
      'les mots-clés de la carte tiennent seuls dans l’aperçu, en pastilles fermées');
    // L'aperçu au doigt montre la carte elle-même : sa face illustrée ouvre le
    // volet — cadre de famille, coût, statistiques imprimées — comme la fiche.
    const faceAppui = apercuAppui.querySelector('.rpg-hover-card-preview__face');
    assert.ok(faceAppui, 'l’aperçu au doigt montre la face de la carte');
    assert.match(faceAppui.querySelector('img')?.getAttribute('src') ?? '', /cards\/.+\.jpg/,
      'et son illustration, en grand');
    if (attendue.kind === 'creature' || attendue.kind === 'hero') {
      // Les statistiques se lisent sur la face imprimée et dans le libellé.
      assert.ok(faceAppui.querySelector('.rpg-card__stat--atk .rpg-stat-value'),
        'la face porte les plaques d’attaque et de défense');
      assert.ok(apercuAppui.getAttribute('aria-label').includes(`attaque ${attendue.atk}, défense ${attendue.def}`),
        'l’attaque et la défense restent lisibles sur la carte au doigt');
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
    const inclinaisonAvantAppui = fennec().dataset.combatTilted;
    await appuiLong(fennec());
    assert.ok(peek(), 'une créature en jeu s’aperçoit aussi par appui long');
    assert.ok(peek().getAttribute('aria-label').includes('Fennec'), 'l’aperçu nomme la créature tenue');
    assert.equal(fennec().classList.contains('is-selected'), false,
      'l’appui long ne déclare pas la créature attaquante');
    assert.equal(fennec().dataset.combatTilted, inclinaisonAvantAppui, 'son état de combat ne change pas');
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

    // ── Le clic droit : la fiche en grand, sans rien jouer ──────────────────
    // Le clic gauche agit (poser, attaquer, payer) ; le bouton droit, lui,
    // consulte — sur la table comme au catalogue, où le clic ouvre la fiche.
    const mainAvantDroit = totalMain();
    const terrainsAvantDroit = terrainsJoueurs().length;
    const carteDuDroit = handCards()[0];
    const idDuDroit = carteDuDroit.dataset.cardId;
    const menuTable = await clicDroit(carteDuDroit);
    assert.equal(menuTable.defaultPrevented, true, 'le menu du navigateur ne s’ouvre pas sur la table');
    assert.ok(fiche(), 'le clic droit ouvre la fiche d’une carte en main');
    assert.equal(carteOuverte(), idDuDroit, 'la fiche est celle de la carte cliquée à droite');
    assert.equal(fiche().getAttribute('aria-label'), `Fiche de ${cardById(idDuDroit).name}`,
      'la fiche nomme la carte ouverte');
    assert.match(fiche().querySelector('.rpg-hover-card-preview__eyebrow').textContent, /^DUEL · /u,
      'la fiche dit qu’elle vient de la table du duel, pas du catalogue');
    assert.ok(fiche().querySelector('.rpg-hover-card-preview__name'),
      'la fiche du duel imprime le nom de la carte, comme celle du catalogue');
    assert.equal(totalMain(), mainAvantDroit, 'consulter une carte ne la joue pas');
    assert.equal(terrainsJoueurs().length, terrainsAvantDroit, 'et ne pose rien sur la table');
    assert.ok(confirmDialog() === null, 'consulter une magie ne demande pas confirmation');
    // Aucune flèche, aucun compteur : le clic droit ne montre que la carte
    // qu'il désigne, il ne feuillette pas la main.
    assert.equal(feuillets(), null, 'aucune flèche sur la fiche du duel');
    assert.equal(compteurFiche(), null, 'aucun compteur : une carte, une fiche');
    await touche('Escape');
    assert.equal(fiche(), null, 'Échap referme la fiche ouverte au clic droit');
    // Sur le champ : la créature s'ouvre en grand sans être déclarée attaquante.
    const inclinaisonAvantDroit = fennec().dataset.combatTilted;
    await clicDroit(fennec());
    assert.ok(fiche(), 'une créature en jeu s’ouvre en grand au clic droit');
    assert.equal(carteOuverte(), 'fennec-des-decombres');
    assert.equal(fennec().classList.contains('is-selected'), false,
      'le clic droit ne déclare pas la créature attaquante');
    assert.equal(fennec().dataset.combatTilted, inclinaisonAvantDroit, 'son état de combat ne change pas');
    await click(fiche().querySelector('.rpg-card-peek__close'));
    assert.equal(fiche(), null, 'le bouton Fermer referme la fiche du duel');
    // La table nue n'ouvre rien : le menu du navigateur reste étouffé, c'est tout.
    const menuTableNue = await clicDroit(container.querySelector('.card-table'));
    assert.equal(menuTableNue.defaultPrevented, true, 'le menu du navigateur reste étouffé sur la table nue');
    assert.equal(fiche(), null, 'et cliquer droit la table nue n’ouvre aucune fiche');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.matchMedia = originalMatchMedia;
  }
}
