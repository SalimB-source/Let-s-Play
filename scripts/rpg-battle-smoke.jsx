// Rendu réel du duel dans jsdom : aperçu, glisser-déposer, attaque en masse,
// icônes élémentaires, réponses, bloqueurs et états visuels du combat.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_DECKS, RPG_DUEL_CARDS, cardById, cardFrameColor, cardFrameInfo, cardRarityInfo } from '../src/games/rpgCards.js';
import { plateauDeDeck, RPG_PLATEAUX } from '../src/games/rpgPlateaux.js';
import { passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Le sorcier annonce chaque carte : le joueur laisse passer (sans réponse dans ces scénarios). */
async function passerAnnoncesSorcier(racine) {
  for (let annonce = 0; annonce < 8; annonce += 1) {
    const passer = [...racine.querySelectorAll('.rpg-annonce-sort button')]
      .find((bouton) => bouton.textContent.includes('Laisser passer'));
    if (!passer) break;
    await act(async () => { passer.click(); });
    await act(async () => { await wait(1100); });
  }
}

export async function checkRpgBattle(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  // Decks déterministes : 5 cartes chacun, tout part dans la main de départ.
  await act(async () => {
    root.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'parade-du-verre', 'mer', 'veilleur-du-couchant', 'fennec-des-decombres', 'desert']}
      sorcierDeck={['chien-du-guet', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });

  const buttons = () => [...container.querySelectorAll('button')];
  const findButton = (label) => buttons().find((button) => button.textContent.includes(label));
  const cliquer = async (element) => { await act(async () => { element.click(); }); };
  const lancerDepuisMenu = async (target) => {
    const button = target.querySelector('.rpg-mode-menu__play .rpg-menu-button--primary');
    assert.ok(button, 'le menu Jouer propose de lancer le duel');
    await act(async () => { button.click(); });
    // Le volet de mulligan ouvre la partie : les scénarios jouent la main
    // qu'on vient de garder, ils valident donc cette première étape.
    await passerMulligan(target, cliquer);
  };
  const handCards = () => buttons().filter((b) => b.className.includes('rpg-hand__card'));
  const assertElementFrame = (element, cardId, context) => {
    const carte = cardById(cardId);
    const frame = cardFrameInfo(carte);
    assert.ok(element.classList.contains(`rpg-card--frame-${frame.key}`),
      `${context} identifie sa couleur ${frame.key}`);
    assert.equal(element.style.getPropertyValue('--rpg-frame-color'), cardFrameColor(carte),
      `${context} utilise la couleur de cadre ${cardFrameColor(carte)}`);
    assert.equal(element.classList.contains('rpg-card--frame-brillant'),
      frame.key.startsWith('hybride-') || cardRarityInfo(carte).key === 'mythique',
      `${context} n'a un cadre brillant que si la carte est bicolore ou mythique`);
  };
  const envoyerSouris = (target, type) => {
    target.dispatchEvent(new window.MouseEvent(type, { bubbles: true, relatedTarget: document.body }));
  };
  const creerTransfert = () => {
    const values = new Map();
    return {
      effectAllowed: 'move',
      dropEffect: 'move',
      types: [],
      setData(type, value) { values.set(type, value); this.types = [...values.keys()]; },
      getData(type) { return values.get(type) ?? ''; },
    };
  };
  const envoyerEvenementGlisser = (target, type, dataTransfer) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    target.dispatchEvent(event);
  };
  const carteEnVol = (targetContainer = container) => targetContainer.querySelector('.rpg-hand__card.rpg-card-flight.is-flying');
  const terminerVol = async (targetContainer = container) => {
    if (!carteEnVol(targetContainer)) return;
    await act(async () => { await wait(760); });
  };
  const glisserSurTable = async (targetContainer, card, attendreArrivee = true) => {
    const dataTransfer = creerTransfert();
    const table = targetContainer.querySelector('.card-table');
    assert.equal(card.getAttribute('draggable'), 'true', 'une carte jouable doit pouvoir être glissée');
    await act(async () => {
      envoyerEvenementGlisser(card, 'dragstart', dataTransfer);
      envoyerEvenementGlisser(table, 'dragover', dataTransfer);
      envoyerEvenementGlisser(table, 'drop', dataTransfer);
      envoyerEvenementGlisser(card, 'dragend', dataTransfer);
    });
    if (attendreArrivee) await terminerVol(targetContainer);
  };
  const glisserBloqueurSurAttaquant = async (bloqueur, attaquant) => {
    const dataTransfer = creerTransfert();
    assert.equal(bloqueur.getAttribute('draggable'), 'true', 'un bloqueur prêt doit pouvoir être glissé');
    await act(async () => {
      envoyerEvenementGlisser(bloqueur, 'dragstart', dataTransfer);
      envoyerEvenementGlisser(attaquant, 'dragover', dataTransfer);
      envoyerEvenementGlisser(attaquant, 'drop', dataTransfer);
      envoyerEvenementGlisser(bloqueur, 'dragend', dataTransfer);
    });
  };
  const estJouable = (card) => card.getAttribute('data-jouable') === 'true';
  const resoudreCombat = async () => {
    const bouton = container.querySelector('.rpg-btn--resolve-combat');
    if (bouton) await act(async () => { bouton.click(); });
  };
  const poserTerrainSansEngager = async () => {
    const terrain = handCards().find((b) => b.className.includes('rpg-hand__card--terrain') && estJouable(b));
    if (terrain) {
      await glisserSurTable(container, terrain);
      assert.ok(container.querySelector('.rpg-terrains--joueur .rpg-terrain--type-terrain'),
        'les terrains posés conservent leur classification de type terrain');
    }
  };
  const poserChienPourDefendre = async () => {
    if ([...container.querySelectorAll('.rpg-card--equipe')]
      .some((carte) => carte.getAttribute('aria-label')?.includes('Chien du guet'))) return;
    let chien = handCards().find((b) => b.getAttribute('aria-label')?.includes('Chien du guet'));
    for (let tentative = 0; chien && !estJouable(chien) && tentative < 3; tentative += 1) {
      const terrain = container.querySelector('.rpg-terrain--joueur:not(.is-tapped)');
      if (!terrain) break;
      await act(async () => { terrain.click(); });
      chien = handCards().find((b) => b.getAttribute('aria-label')?.includes('Chien du guet'));
    }
    if (chien && estJouable(chien)) await glisserSurTable(container, chien);
  };

  // ── Menu Jouer / Deck / Catalogue : decks et cartes sont consultables ──
  assert.ok(container.querySelector('.rpg-mode-menu'), 'le jeu s’ouvre sur son menu dédié');
  const modeButtons = [...container.querySelectorAll('.rpg-mode-menu__switch button')];
  assert.ok(modeButtons.some((button) => button.textContent.includes('Jouer'))
    && modeButtons.some((button) => button.textContent.includes('Deck'))
    && modeButtons.some((button) => button.textContent.includes('Catalogue')),
  'le menu expose Jouer, Deck et Catalogue');

  // ── Le plateau n'est plus un choix : le menu ne propose rien ────────────
  assert.equal(container.querySelector('.rpg-mode-menu__boards'), null,
    'le menu Jouer ne présente plus le bloc « Le terrain d’affrontement »');
  assert.equal(container.querySelectorAll('.rpg-mode-menu [data-plateau]').length, 0,
    'aucun bouton de plateau : ni verrou, ni pastille aléatoire');
  assert.equal(container.querySelectorAll('.rpg-board-choice, .rpg-board-grid').length, 0,
    'le sélecteur de plateau a disparu du rendu');
  assert.doesNotMatch(container.querySelector('.rpg-mode-menu__play').textContent, /terrain d’affrontement/i,
    'le menu Jouer ne parle plus de choisir son terrain');
  // Chaque deck du catalogue garde son terrain : c'est lui, pas le joueur, qui décide.
  assert.equal(plateauDeDeck('veilleurs-du-desert').plateau.id, 'erg-du-sahara',
    'les Veilleurs du Désert imposent l’Erg du Sahara');
  assert.equal(plateauDeDeck('cour-des-djinns').plateau.id, 'terre-de-damnation',
    'la Cour des Djinns impose la Terre de Damnation');

  await act(async () => { modeButtons.find((button) => button.textContent.includes('Catalogue')).click(); });
  assert.ok(container.querySelector('.rpg-card-catalogue'), 'le mode Catalogue ouvre le catalogue complet des cartes');
  assert.equal(container.querySelectorAll('.rpg-card-catalogue__card').length, RPG_DUEL_CARDS.length,
    'le catalogue présente toutes les créatures, tous les héros, terrains et magies');
  assert.equal(new Set([...container.querySelectorAll('.rpg-card-catalogue__card')].map((card) => card.dataset.cardId)).size,
    RPG_DUEL_CARDS.length, 'chaque carte apparaît une seule fois dans le catalogue');
  const djinnCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="djinn-du-souk"]');
  assert.match(djinnCatalogue?.querySelector('.rpg-card-catalogue__art img')?.getAttribute('src') ?? '',
    /\/cards\/djinn-du-souk\.jpg\?v=munch-impressionniste-v3$/,
    'le catalogue charge la nouvelle illustration avec une URL versionnée contre le cache');
  const ifritCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="ifrit-al-ahmar"]');
  assert.match(ifritCatalogue?.querySelector('.rpg-card-catalogue__art img')?.getAttribute('src') ?? '',
    /\/cards\/ifrit-al-ahmar\.jpg\?v=sourire-tempete-huile-v1$/,
    'le catalogue charge la nouvelle illustration de l’Ifrit contre le cache');
  const ferielCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="feriel"]');
  assert.match(ferielCatalogue?.querySelector('.rpg-card-catalogue__art img')?.getAttribute('src') ?? '',
    /\/cards\/feriel\.jpg\?v=lance-de-feu-photoreal-v1$/,
    'le catalogue charge la nouvelle illustration de Fériel avec une URL versionnée contre le cache');
  assert.equal(ferielCatalogue?.querySelector('.rpg-card-catalogue__cost')?.textContent, '4',
    'le catalogue affiche le nouveau coût de quatre pour Fériel');
  assert.match(ferielCatalogue?.querySelector('.rpg-card-catalogue__meta b')?.textContent ?? '', /3\s*·\s*🛡\s*1/,
    'le catalogue affiche les nouvelles statistiques 3/1 de Fériel');
  assert.match(ferielCatalogue?.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '', /Rapidité.*Coup rapide/s,
    'le catalogue décrit Rapidité et le ciblage du Coup rapide');
  const traitCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="trait-de-braise"]');
  assert.match(traitCatalogue?.querySelector('.rpg-card-catalogue__art img')?.getAttribute('src') ?? '',
    /\/cards\/trait-de-braise\.jpg\?v=trait-feu-sorcier-appeure-v1$/,
    'le catalogue charge le nouveau Trait de braise vers le sorcier avec une URL versionnée');
  assert.equal(traitCatalogue?.querySelector('.rpg-card-catalogue__cost')?.textContent, '2',
    'le catalogue affiche le coût de deux du Trait de braise');
  assert.match(traitCatalogue?.querySelector('.rpg-card-catalogue__type')?.textContent ?? '', /Magie Rapide/,
    'le catalogue identifie le Trait de braise comme Magie Rapide');
  assert.match(traitCatalogue?.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '', /3 dégâts.*créature.*sorcier/i,
    'le catalogue décrit ses 3 dégâts sur une créature ou un sorcier');
  const anqaCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="anqa-des-braises"]');
  assert.match(anqaCatalogue?.querySelector('.rpg-card-catalogue__art img')?.getAttribute('src') ?? '',
    /\/cards\/anqa-des-braises\.jpg\?v=anqa-des-braises-huile-v1$/,
    'le catalogue charge l’illustration de l’Anqa avec une URL versionnée');
  assert.equal(anqaCatalogue?.querySelector('.rpg-card-catalogue__cost')?.textContent, '4',
    'le catalogue affiche le coût de quatre de l’Anqa');
  assert.match(anqaCatalogue?.querySelector('.rpg-card-catalogue__meta b')?.textContent ?? '', /4\s*·\s*🛡\s*4/,
    'le catalogue affiche les statistiques 4/4 de l’Anqa');
  assert.match(anqaCatalogue?.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '', /revient en jeu après deux tours/i,
    'le catalogue décrit le retour de l’Anqa deux tours après sa destruction');
  assert.match(anqaCatalogue?.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '',
    /Envol — Ne peut être bloquée que par une créature avec Envol/,
    'le catalogue décrit l’Envol de l’Anqa et son blocage réservé aux créatures volantes');
  const fennecCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="fennec-des-decombres"]');
  assert.ok(fennecCatalogue, 'le Fennec apparaît au catalogue');
  assert.equal(fennecCatalogue.querySelector('.rpg-card-catalogue__art .rpg-card-rapidity, .rpg-card-catalogue__art .rpg-card-evasion'), null,
    'le Fennec n’affiche aucune icône d’effet dans le catalogue');
  assert.equal(fennecCatalogue.querySelector('.rpg-card-catalogue__art .rpg-card-element-badge')?.textContent.trim(), '⏳',
    'le badge élémentaire Sable du Fennec reste visible dans le catalogue');
  assert.match(fennecCatalogue.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '', /Rapidité.*Esquive 1/,
    'le catalogue conserve le texte de Rapidité et Esquive');
  // Refonte « plein art 4:5 » des magies d’Eau et de Sable. Une peinture
  // reprise sous le même nom de fichier doit changer d’URL — sinon le cache du
  // navigateur resservirait l’ancien cadrage ; une peinture nouvelle n’a rien à
  // tromper et pointe simplement sur son propre fichier.
  const peinturesReprises = [
    ['brisure-de-verre', 'plein-art-verre-v1'],
    ['parade-du-verre', 'plein-art-verre-v1'],
    ['maree-contraire', 'deflection-ultrason-v1'],
    ['ressac', 'djinn-tourbillon-v1'],
    ['courant-de-retour', 'djinn-tourbillon-v1'],
  ];
  const srcIllustration = (carteId) => container
    .querySelector(`.rpg-card-catalogue__card[data-card-id="${carteId}"]`)
    ?.querySelector('.rpg-card-catalogue__art img')?.getAttribute('src') ?? '';
  for (const [carteId, version] of peinturesReprises) {
    assert.match(srcIllustration(carteId),
      new RegExp(`/cards/${carteId}\\.jpg\\?v=${version}$`),
      `${carteId} charge sa nouvelle peinture plein art avec une URL versionnée contre le cache`);
  }
  for (const carteId of ['eau-de-la-source', 'lame-de-mer', 'maree-contraire', 'ressac', 'courant-de-retour']) {
    assert.match(srcIllustration(carteId), new RegExp(`/cards/${carteId}\\.jpg(\\?|$)`),
      `${carteId} n’emprunte plus l’illustration d’une autre carte`);
  }
  const deflectionCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="maree-contraire"]');
  assert.match(deflectionCatalogue?.querySelector('.rpg-card-catalogue__title h3')?.textContent ?? '', /Déflection/,
    'Marée contraire a rendu son nom : la carte s’appelle Déflection');
  assert.match(srcIllustration('maree-contraire'), /deflection-ultrason/,
    'Déflection est portée par le sorcier en méditation et son anneau d’ultrason bleu');
  const rapportCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="rapport-du-greffier"]');
  assert.equal(rapportCatalogue?.querySelector('.rpg-card-catalogue__cost')?.textContent, '3',
    'le catalogue affiche le nouveau coût de trois du Rapport du greffier');
  const rempartCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="rempart-de-dunes"]');
  assert.match(rempartCatalogue?.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '', /\+0\/\+3.*fin du tour/u,
    'le Rempart de dunes annonce un bonus qui ne dépasse pas le tour');
  const tempeteCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="tempete-de-sable"]');
  assert.match(tempeteCatalogue?.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '', /3 dégâts à toutes les créatures adverses/u,
    'la Tempête de sable annonce ses trois dégâts');
  const nuageCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="nuage-de-cendres"]');
  assert.match(nuageCatalogue?.querySelector('.rpg-card-catalogue__rules')?.textContent ?? '', /puis 2 autres au début du tour suivant/u,
    'le Nuage de cendres annonce sa seconde vague pour le tour suivant');
  const filtresCatalogue = [...container.querySelectorAll('.rpg-card-catalogue__filters select')];
  const filtrerCatalogue = async (select, value) => act(async () => {
    select.value = value;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await filtrerCatalogue(filtresCatalogue[0], 'sable');
  assert.ok([...container.querySelectorAll('.rpg-card-catalogue__card')].every((card) => card.dataset.colors.split(' ').includes('sable')),
    'le filtre Sable inclut aussi les cartes hybrides qui demandent cette couleur');
  await filtrerCatalogue(filtresCatalogue[1], 'terrain');
  const terrainsCatalogue = [...container.querySelectorAll('.rpg-card-catalogue__card')];
  assert.ok(terrainsCatalogue.length && terrainsCatalogue.every((card) => card.dataset.colors.split(' ').includes('sable') && card.dataset.type === 'terrain'),
    'les filtres couleur et type se cumulent, y compris pour Pétra');
  assert.equal(container.querySelectorAll('.rpg-card-catalogue__art .rpg-card-element-badge').length, 0,
    'les terrains du catalogue restent sans badge de couleur');
  assert.equal(container.querySelectorAll('.rpg-card-catalogue__art .rpg-card-catalogue__cost').length, 0,
    'les terrains du catalogue restent sans coût');
  await filtrerCatalogue(filtresCatalogue[1], 'tous');
  await filtrerCatalogue(filtresCatalogue[0], 'hybride');
  const cartesHybridesCatalogue = [...container.querySelectorAll('.rpg-card-catalogue__card')];
  assert.ok(cartesHybridesCatalogue.length >= 3
    && cartesHybridesCatalogue.every((card) => ['sable', 'braise'].every((color) => card.dataset.colors.split(' ').includes(color))),
  'le filtre hybride isole les cartes qui exigent Braise et Sable, terrain de Pétra inclus');
  const veilleurCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="veilleur-du-couchant"]');
  assert.ok(veilleurCatalogue?.querySelector('.rpg-card-catalogue__cost')?.getAttribute('aria-label')?.includes('1 Sable et 1 Braise'),
    'le coût du Veilleur annonce clairement ses deux pips obligatoires');
  await filtrerCatalogue(filtresCatalogue[0], 'toutes');
  await filtrerCatalogue(filtresCatalogue[1], 'creature');
  const cavalierCatalogue = container.querySelector('.rpg-card-catalogue__card[data-card-id="cavalier-amazigh-du-desert"]');
  assert.ok(cavalierCatalogue && cavalierCatalogue.dataset.type === 'creature',
    'le Cavalier rare apparaît comme créature dans le catalogue filtré');
  await act(async () => { envoyerSouris(cavalierCatalogue, 'mouseover'); });
  const apercuCavalierCatalogue = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
  assert.ok(apercuCavalierCatalogue, 'les cartes du catalogue ont aussi un aperçu instantané au survol');
  assert.equal(apercuCavalierCatalogue.querySelector('.rpg-hover-card-preview__cost b')?.textContent, '5',
    'l’aperçu du Cavalier montre son coût de cinq manas');
  await act(async () => { envoyerSouris(cavalierCatalogue, 'mouseout'); });
  await act(async () => {
    [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((button) => button.textContent.includes('Deck')).click();
  });
  assert.ok(container.querySelector('.rpg-deck-catalog'), 'le mode Deck ouvre le catalogue');
  // La crate « Nouveau deck » (au bouton « Composer ») est un choix de plus sur
  // l’étagère : elle ne compte pas parmi les boîtiers du catalogue.
  assert.equal(container.querySelectorAll('.rpg-deck-choice:not(.rpg-deck-choice--neuf)').length, RPG_DECKS.length,
    'chaque deck du catalogue (Sable, Braise, hybride, Eau de la Marée, Neige du Serment) est sélectionnable');
  assert.match(container.textContent, /Veilleurs du Désert/, 'le deck joueur mono-Sable / Désert est présenté');
  assert.match(container.textContent, /Cour des Djinns/, 'le deck adverse mono-Braise est présenté');
  assert.match(container.textContent, /Sentiers de cendre/, 'le deck joueur hybride Sable + Braise est présenté');
  assert.match(container.textContent, /Serment des Neuf Hivers/, 'le deck joueur mono-Neige est présenté');
  assert.equal(container.querySelectorAll('.rpg-deck-list li').length, 0, 'la liste des cartes reste masquée tant qu’aucun deck n’est cliqué');
  // Chaque deck est un boîtier 3D : le clic est porté par le bouton voisin du décor.
  const boutonDeck = (nom) => [...container.querySelectorAll('.rpg-deck-choice__button')]
    .find((button) => button.textContent.includes(nom));
  await act(async () => { boutonDeck('Serment des Neuf Hivers').click(); });
  const ficheNeige = container.querySelector('.rpg-deck-detail');
  assert.match(ficheNeige?.textContent ?? '', /Neige[\s\S]*GLACIER/i,
    'la fiche du Serment annonce son identité Neige et son terrain Glacier');
  assert.match(ficheNeige?.querySelector('.rpg-deck-detail__stats')?.textContent ?? '', /40[\s\S]*17[\s\S]*16[\s\S]*7[\s\S]*validé/,
    'le Serment est validé à 40 cartes : 17 terrains, 16 créatures et héros, 7 magies');
  await act(async () => { boutonDeck('Veilleurs du Désert').click(); });
  assert.equal(container.querySelectorAll('.rpg-deck-list li').length, 12, 'la fiche détaille les références distinctes avec leurs quantités, Cavalier inclus');
  assert.match(container.querySelector('.rpg-deck-detail__stats')?.textContent ?? '', /40[\s\S]*17[\s\S]*18[\s\S]*5/,
    'la fiche indique la taille et la répartition terrain / créature / magie du deck validé');
  await act(async () => { boutonDeck('Cour des Djinns').click(); });
  assert.match(container.querySelector('.rpg-deck-detail')?.textContent ?? '', /Braise/,
    'la sélection affiche les détails du deck de Braise');
  await act(async () => { boutonDeck('Sentiers de cendre').click(); });
  const ficheHybride = container.querySelector('.rpg-deck-detail');
  assert.match(ficheHybride?.textContent ?? '', /Sable \+ Braise[\s\S]*HYBRIDE/i,
    'la fiche précise l’identité bicolore du deck');
  assert.match(ficheHybride?.textContent ?? '', /Pétra[\s\S]*Veilleur du couchant[\s\S]*Vent rouge/,
    'la liste hybride présente son terrain flexible et ses cartes bicolores');
  assert.match(ficheHybride?.querySelector('.rpg-deck-detail__stats')?.textContent ?? '', /40[\s\S]*17[\s\S]*18[\s\S]*5[\s\S]*validé/,
    'le deck hybride est validé à 40 cartes, avec 17 terrains, 18 créatures et 5 magies');
  await act(async () => { boutonDeck('Veilleurs du Désert').click(); });
  assert.ok(findButton('Jouer avec ce deck'), 'la fiche du deck joueur permet de le lancer');
  await act(async () => { findButton('Jouer avec ce deck').click(); });
  await passerMulligan(container, cliquer);

  // ── Nouvelle partie : table vide, 5 cartes, 50 PV face à un sorcier à 60 ─
  assert.ok(container.querySelector('.card-table'), 'la table de jeu doit être montée après le choix de Jouer');
  const tableDuDuel = container.querySelector('.card-table');
  // Les deux paquets de ce scénario sont mono-Sable : quel que soit le camp
  // désigné par le rng (0.999 → l'adversaire), le terrain est l'Erg du Sahara.
  const plateauxMontes = RPG_PLATEAUX.filter(({ id }) => tableDuDuel.classList.contains(`card-table--plateau-${id}`));
  assert.equal(plateauxMontes.length, 1, 'la table porte exactement un plateau du catalogue');
  assert.equal(plateauxMontes[0].id, 'erg-du-sahara',
    'le duel se joue sur le terrain imposé par le deck désigné au lancement');
  assert.match(tableDuDuel.style.backgroundImage, /plateau-erg-du-sahara\.jpg/,
    'le fond de la table est l’image du plateau imposé par le deck');
  assert.match(tableDuDuel.getAttribute('aria-label') ?? '', /L’Erg du Sahara/,
    'la table annonce le plateau sur lequel elle se joue');
  assert.equal(container.querySelector('.rpg-actions__wait'), null,
    'aucun bandeau d’indications ne double la table : le plateau se lit sur le décor');
  assert.ok(container.querySelector('.rpg-actions__combat .rpg-btn--attaque')
    && container.querySelector('.rpg-actions__turn .rpg-btn--endturn'),
  'les commandes de combat et de tour sont rangées dans deux groupes distincts');
  assert.equal(container.querySelector('.rpg-btn--declare-attack'), null,
    'la commande Déclarer l’attaque a été retirée');
  assert.ok(container.querySelector('.rpg-btn--attaque-tous .rpg-combat-action-icon--attack-all'),
    'Attaquer avec tous conserve son icône rouge');
  assert.equal(container.querySelector('.rpg-actions__combat .rpg-btn--endturn'), null,
    'la fin du tour est isolée des commandes d’attaque');
  assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'principal',
    'la phase principale s’allume au début du tour du joueur');
  assert.equal(container.querySelectorAll('.rpg-phase-step[aria-current="step"]').length, 1,
    'une seule phase du duel est annoncée comme active');
  assert.match(container.querySelector('.rpg-wizard-plate--joueur')?.textContent ?? '', /Veilleurs du Désert · ⏳ Sable/,
    'le plateau annonce l’archétype mono-Désert du joueur');
  assert.match(container.querySelector('.rpg-wizard-plate--ennemi')?.textContent ?? '', /Cour des Djinns · Braise/,
    'le plateau annonce l’archétype de feu de l’adversaire');
  assert.ok(container.querySelector('.rpg-hidden-hand'), 'la main adverse est au bord opposé, face cachée');
  assert.equal(container.querySelectorAll('.rpg-hidden-hand__card').length, 5, 'les 5 cartes adverses sont représentées au sommet');
  assert.ok(container.querySelector('.rpg-card-piles--opponent') && container.querySelector('.rpg-card-piles--player'),
    'les piles du paquet et du cimetière encadrent les deux champs');
  assert.ok(container.querySelector('.rpg-card-piles--opponent .rpg-card-pile--deck.is-drawing')
    && container.querySelector('.rpg-card-piles--player .rpg-card-pile--deck.is-drawing'),
  'les paquets des deux camps s’animent à la pioche initiale');
  assert.equal(container.querySelectorAll('.rpg-hand__card.rpg-hand-card--drawing').length, 5,
    'les cinq vraies cartes du joueur apparaissent directement dans sa main à leur taille normale');
  assert.equal(container.querySelectorAll('.rpg-hidden-hand__card.rpg-hand-card--drawing').length, 5,
    'les cartes cachées du sorcier se distribuent elles aussi de gauche à droite dans sa main');
  assert.ok(!container.querySelector('.rpg-table-divider'), 'la table reste continue sans séparation horizontale entre les champs');
  assert.equal(container.querySelectorAll('.rpg-card').length, 0, 'la table démarre sans aucune carte');
  assert.equal(handCards().length, 5, 'chaque camp pioche 5 cartes');
  const visagesMain = handCards();
  visagesMain.forEach((carte) => assertElementFrame(carte, carte.dataset.cardId, 'chaque carte en main'));
  assert.ok(visagesMain.every((carte) => carte.querySelector('.rpg-hand__img')),
    'chaque carte en main montre son illustration');
  assert.ok(visagesMain.every((carte) => Boolean(carte.querySelector('.rpg-hand__type'))
    === !carte.classList.contains('rpg-hand__card--type-creature')),
    'seules les magies et les terrains impriment leur ligne de type en main : une créature se lit à son cadre et à ses statistiques');
  const visageCreatureMain = visagesMain.find((carte) => carte.querySelector('.rpg-hand__stats'));
  assert.ok(visageCreatureMain?.classList.contains('rpg-hand__card--type-creature'),
    'les créatures conservent leur type sans que celui-ci détermine la bordure');
  assert.ok(visageCreatureMain?.querySelector('.rpg-mana-cost') && visageCreatureMain.querySelectorAll('.rpg-hand__stat').length === 2,
    'une créature en main montre son coût, son attaque et sa défense');
  assert.ok(visagesMain.filter((carte) => !carte.classList.contains('rpg-hand__card--terrain'))
    .every((carte) => carte.querySelector('.rpg-card-element-badge')),
  'les cartes non-terrain affichent leur couleur à gauche');
  const fennecMain = visagesMain.find((carte) => carte.dataset.cardId === 'fennec-des-decombres');
  assert.equal(fennecMain?.querySelector('.rpg-card-rapidity, .rpg-card-evasion'), null,
    'le Fennec n’affiche pas d’icône d’effet sur la carte en main');
  assert.match(fennecMain?.getAttribute('aria-label') ?? '', /Rapidité.*attaquer le tour où elle arrive.*Esquive 1/,
    'les deux capacités du Fennec restent annoncées de façon accessible');
  assert.equal(fennecMain?.hasAttribute('title'), false, 'la carte en main n’affiche plus d’aide au survol');
  const veilleurMain = visagesMain.find((carte) => carte.dataset.cardId === 'veilleur-du-couchant');
  assert.ok(veilleurMain, 'la main de test contient une créature hybride');
  assert.equal(veilleurMain.querySelector('.rpg-mana-cost b')?.textContent, '3',
    'le coût hybride conserve son nombre de manas');
  assert.equal(veilleurMain.querySelector('.rpg-mana-cost__hybrid-pips, .rpg-mana-cost__pip'), null,
    'les icônes de couleur sont retirées du coût de la créature hybride');
  assert.match(veilleurMain.querySelector('.rpg-mana-cost')?.getAttribute('aria-label') ?? '', /1 Sable et 1 Braise/,
    'le libellé accessible du coût hybride conserve ses exigences de couleur');
  assert.equal(veilleurMain.querySelector('.rpg-card-element-badge')?.querySelectorAll('.rpg-card-element-badge__pip').length, 2,
    'les deux pastilles de couleur restent sur le badge élémentaire, séparées du coût');
  assert.equal(visageCreatureMain.querySelector('.rpg-hand__type'), null,
    'une créature en main ne porte aucune ligne de type sur sa face');
  assert.match(visageCreatureMain.getAttribute('aria-label') ?? '', /Type\s+—/,
    'le type de la créature reste annoncé aux lecteurs d’écran');
  assert.equal(visageCreatureMain.querySelector('.rpg-card-element-badge')?.textContent.trim(), '⏳',
    'les cartes Sable affichent le sablier lumineux');
  assert.equal(visageCreatureMain.querySelector('.rpg-mana-cost i'), null,
    'la pastille de mana à droite n’affiche que le coût, la couleur est séparée à gauche');
  assert.ok(!visageCreatureMain.querySelector('.rpg-hand__title strong, .rpg-hand__text, .rpg-hand__rarity'),
    'le nom, les règles et la rareté ne sont pas imprimés sur la carte en main');
  const terrainsMain = visagesMain.filter((carte) => carte.classList.contains('rpg-hand__card--terrain'));
  const carteDesertMain = terrainsMain.find((carte) => carte.getAttribute('aria-label')?.startsWith('Désert'));
  assert.ok(carteDesertMain, 'la main présente la nouvelle carte Désert');
  assert.match(carteDesertMain.querySelector('.rpg-hand__img')?.getAttribute('src') ?? '', /cards\/desert\.jpg$/,
    'la carte Désert utilise sa nouvelle illustration');
  assert.ok(terrainsMain.every((carte) => carte.classList.contains('rpg-hand__card--type-terrain')),
    'les terrains conservent leur classification de type, indépendante de la rareté');
  assert.ok(terrainsMain.every((carte) => !carte.querySelector('.rpg-mana-cost')
    && !carte.querySelector('.rpg-card-element-badge')
    && !/coût/i.test(`${carte.getAttribute('aria-label')} ${carte.title}`)),
  'les terrains n’affichent aucun coût de mana, même dans leur libellé accessible');
  assert.match(container.querySelector('.rpg-turn-indicator')?.textContent ?? '', /À VOTRE TOUR/,
    'un indicateur signale que le tour commence chez le joueur');
  assert.match(container.textContent, /🛡 50/, 'le joueur démarre à 50 PV');
  assert.match(container.textContent, /🛡 60/, 'le sorcier (puissance 2) démarre à 60 PV');

  // ── Toutes les cartes de la main sont les images 4:5 générées ──────────
  const srcs = [...container.querySelectorAll('.rpg-hand__card--img img')].map((i) => i.getAttribute('src'));
  assert.equal(srcs.length, 5, 'chaque carte de la main est une image');
  assert.ok(srcs.every((s) => /cards\/[^?]+\.jpg(\?v=[\w-]+)?$/.test(s)), `les cartes pointent vers /cards/ (${srcs.join(', ')})`);

  // ── L’aperçu apparaît immédiatement au survol et reste synthétique ────
  const carteSurvolee = terrainsMain[0];
  assert.equal(carteSurvolee.hasAttribute('title'), false, 'une carte terrain ne porte pas d’infobulle native');
  assert.equal(carteSurvolee.querySelector('[title]'), null, 'aucun badge du terrain ne déclenche d’infobulle');
  await act(async () => { envoyerSouris(carteSurvolee, 'mouseover'); });
  const apercuTerrainSurvol = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
  assert.ok(apercuTerrainSurvol, 'le survol affiche l’aperçu dès le premier événement, sans délai');
  assert.match(apercuTerrainSurvol.querySelector('.rpg-hover-card-preview__type')?.textContent ?? '', /Terrain/,
    'l’aperçu concis affiche le type de la carte');
  assert.equal(apercuTerrainSurvol.querySelector('.rpg-hover-card-preview__cost'), null,
    'un terrain conserve la règle de ne pas afficher de coût');
  assert.match(apercuTerrainSurvol.querySelector('.rpg-hover-card-preview__rules')?.textContent ?? '', /mana sable/,
    'l’aperçu montre l’effet de production de mana du terrain');
  assert.equal(apercuTerrainSurvol.querySelector('.rpg-hover-card-preview__stats'), null,
    'un terrain n’affiche pas de statistiques de créature');
  assert.equal(apercuTerrainSurvol.querySelector('.rpg-hover-card-preview__flavor, .rpg-hover-card-preview__rarity, h2'), null,
    'l’aperçu au survol n’ajoute ni saveur, ni rareté, ni titre redondant');
  await act(async () => { envoyerSouris(carteSurvolee, 'mouseout'); });
  assert.equal(container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)'), null,
    'l’aperçu disparaît lorsque la souris quitte la carte');

  // ── Cliquer une carte la joue ; un refus laisse simplement la carte en main ─
  await act(async () => { fennecMain.click(); });
  assert.equal(fennecMain.dataset.jouable, 'false',
    'une créature non payable reste éteinte : le refus se lit au halo, sans phrase');
  assert.equal(handCards().length, 5, 'la carte refusée reste en main');
  assert.equal(container.querySelector('.rpg-card-preview, .rpg-spell-confirm'), null,
    'le clic n’ouvre ni aperçu ni confirmation');
  await act(async () => { envoyerSouris(fennecMain, 'mouseover'); });
  const apercuFennecMain = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
  assert.ok(apercuFennecMain, 'le survol garde l’aperçu instantané, qui reste le seul moyen de lire la carte');
  assert.equal(apercuFennecMain.querySelector('.rpg-card-rapidity, .rpg-card-evasion, .rpg-card-protection, .rpg-card-stat-boost'), null,
    'l’aperçu au survol ne montre aucune icône d’effet');
  assert.equal(apercuFennecMain.querySelectorAll('.rpg-hover-card-preview__rules > span').length, 2,
    'l’aperçu met Rapidité et Esquive chacune sur leur ligne');
  await act(async () => { envoyerSouris(fennecMain, 'mouseout'); });

  // ── Cliquer le terrain le pose ; une seule étape d'annulation le restaure ─
  const terrainAAnnuler = carteSurvolee;
  const nomTerrainAAnnuler = terrainAAnnuler.getAttribute('aria-label').split(' — ')[0];
  await act(async () => { terrainAAnnuler.click(); });
  const terrainEnVol = carteEnVol();
  assert.ok(terrainEnVol?.matches('.rpg-card-flight[data-rpg-card-flight="terrain"]'),
    'le terrain quitte visiblement la main et vole vers son emplacement sur la table');
  assert.equal(terrainEnVol, terrainAAnnuler,
    'le vol réutilise exactement le bouton et la face du terrain rendus dans la main');
  assert.ok(terrainEnVol.querySelector('.rpg-hand__img') && terrainEnVol.querySelector('.rpg-hand__type'),
    'la carte en vol garde son illustration et son type au lieu d’afficher une représentation reconstruite');
  assert.equal(container.querySelectorAll('.rpg-terrain--joueur').length, 0,
    'le terrain n’est ajouté au champ qu’à la fin du vol de sa vraie carte');
  assert.ok(!container.querySelector('.rpg-btn--undo'), 'l’action n’est validée qu’une fois la carte arrivée');
  await terminerVol();
  assert.equal(terrainEnVol.isConnected, false, 'le bouton volant quitte la main quand la pose est validée');
  assert.equal(container.querySelectorAll('.rpg-terrain--joueur').length, 1, 'le terrain est posé sur le champ à la fin du vol');
  assert.ok(container.querySelector('.rpg-btn--undo'), 'une action réversible propose Annuler la dernière action');
  await act(async () => { container.querySelector('.rpg-btn--undo').click(); });
  assert.equal(container.querySelectorAll('.rpg-terrain--joueur').length, 0, 'l’annulation retire le terrain posé');
  assert.equal(container.querySelector('.rpg-card-flight'), null, 'l’annulation ne laisse aucune carte volante');
  assert.ok(handCards().some((b) => b.getAttribute('aria-label')?.startsWith(nomTerrainAAnnuler)),
    'l’annulation rend la carte à la main');
  assert.ok(!container.querySelector('.rpg-btn--undo'), 'le retour est consommé et ne remonte pas en chaîne');

  // ── Un tour de jeu : terrain et créature se jouent par glisser-déposer ─
  let creatureArriveeId = null;
  const jouerUnTour = async () => {
    const terrainMain = handCards().find((b) => b.className.includes('rpg-hand__card--terrain') && estJouable(b));
    if (terrainMain) await glisserSurTable(container, terrainMain);
    const jouable = handCards().find((b) => estJouable(b)
      && !b.className.includes('rpg-hand__card--terrain')
      && b.querySelector('.rpg-hand__stats'));
    if (jouable) {
      assert.ok(jouable.classList.contains('is-playable'), 'une carte payable brille en jaune dans la main');
      assert.ok(container.querySelector('.rpg-terrain--joueur:not(.is-tapped)'),
        'les terrains restent dégagés avant de jouer la créature');
      await glisserSurTable(container, jouable, false);
      const creatureEnVol = carteEnVol();
      assert.ok(creatureEnVol?.matches('.rpg-card-flight[data-rpg-card-flight="creature"]'),
        'la créature quitte la main et vole vers le champ de bataille');
      assert.equal(creatureEnVol, jouable,
        'la créature animée est bien le même bouton full art que celui qui était dans la main');
      assert.equal(container.querySelectorAll('.rpg-card--equipe').length, 0,
        'la créature n’est pas dupliquée sur la table pendant le vol');
      await terminerVol();
      assert.equal(creatureEnVol.isConnected, false, 'la carte volante quitte ensuite la main et rejoint le champ');
      const creatureArrivee = container.querySelector('.rpg-card--equipe[data-card-id="fennec-des-decombres"]');
      assert.ok(creatureArrivee, 'le Fennec apparaît au champ à la fin de son animation');
      creatureArriveeId = creatureArrivee.dataset.entityId;
      assert.ok(creatureArrivee.classList.contains('is-pret')
        && !creatureArrivee.classList.contains('is-summoning-sick'),
      'Rapidité rend le Fennec immédiatement prêt et évite le gris du mal d’invocation');
      assert.ok(container.querySelector('.rpg-terrain--joueur.is-tapped'),
        'le paiement engage automatiquement les terrains nécessaires, sans clic sur eux');
    }
  };

  let poses = 0;
  for (let tour = 0; tour < 4 && !poses; tour += 1) {
    await jouerUnTour();
    poses = container.querySelectorAll('.rpg-card--equipe').length;
    if (!poses) {
      await act(async () => { findButton('Fin du tour').click(); });
      assert.match(container.querySelector('.rpg-turn-indicator')?.textContent ?? '', /TOUR DU SORCIER/,
        'l’indicateur bascule clairement au tour de l’adversaire');
      if (tour === 0 && creatureArriveeId) {
        const creatureDuJoueur = [...container.querySelectorAll('.rpg-card--equipe')]
          .find((card) => card.dataset.entityId === creatureArriveeId);
        assert.ok(creatureDuJoueur && !creatureDuJoueur.classList.contains('is-summoning-sick'),
          'le mal d’invocation disparaît visuellement dès que le tour passe à l’adversaire');
      }
      await act(async () => { await wait(1800); });
      await resoudreCombat();
    }
  }
  assert.ok(poses >= 1, 'une créature payée au mana doit entrer en jeu');
  const visageTable = container.querySelector('.rpg-card--equipe');
  assertElementFrame(visageTable, visageTable.dataset.cardId, 'la carte posée sur la table');
  assert.ok(!visageTable.classList.contains('rpg-card--mythique')
    && !visageTable.classList.contains('rpg-card--frame-brillant'),
    'une carte monocolore non mythique garde son cadre mat, sans reflet');
  assert.equal(container.querySelectorAll('[class*="rpg-card--rarity-"]').length, 0,
    'aucune carte posée ne porte plus de cadre piloté par la rareté');
  assert.equal(visageTable.dataset.cardId, 'fennec-des-decombres', 'la créature jouée est le Fennec inhabituel du deck');
  assert.equal(visageTable.querySelector('.rpg-card-rapidity, .rpg-card-evasion, .rpg-card-protection, .rpg-card-stat-boost'), null,
    'les icônes d’effets sont absentes de la carte posée sur la table');
  assert.match(visageTable.getAttribute('aria-label') ?? '', /rapidité.*attaquer le tour où elle arrive.*esquive 1 contre les attaques et magies/,
    'Rapidité et Esquive restent annoncées dans le libellé accessible');
  assert.ok(visageTable.querySelector('.rpg-card__img')
    && visageTable.querySelector('.rpg-mana-cost') && visageTable.querySelector('.rpg-card-element-badge')
    && visageTable.querySelector('.rpg-card__foot')?.querySelectorAll(':scope > span').length === 2,
  'une créature posée montre son illustration, sa couleur à gauche, son coût à droite et ses statistiques, sans type imprimé');
  assert.equal(visageTable.querySelectorAll('.rpg-card__foot .rpg-stat-icon').length, 2, 'attaque et défense ont des icônes vectorielles');
  assert.deepEqual([...visageTable.querySelectorAll('.rpg-card__foot .rpg-stat-value')].map(node => node.textContent), ['3', '1']);
  assert.equal(visageTable.querySelector('.rpg-card__type'), null,
    'le type n’est pas imprimé sur la carte posée');
  assert.match(visageTable.getAttribute('aria-label'), /Type\s+—/, 'le type reste accessible');
  assert.equal(visageTable.querySelector('.rpg-mana-cost i'), null, 'le coût sur table reste séparé de son symbole de couleur');
  assert.ok(visageTable.classList.contains('is-pret') && !visageTable.classList.contains('is-summoning-sick'),
    'le Fennec est prêt à attaquer dès son arrivée grâce à Rapidité');
  assert.ok(!visageTable.getAttribute('aria-label')?.includes('mal d’invocation'), 'Rapidite ne reçoit pas le libellé du mal d’invocation');
  assert.ok(visageTable.classList.contains('fx-enter'), 'une créature nouvellement posée entre avec une courte animation');
  assert.equal(visageTable.hasAttribute('title'), false, 'une créature sur table n’affiche pas d’infobulle native');
  assert.equal(visageTable.querySelector('[title]'), null, 'les icônes sur la carte ne déclenchent pas d’infobulle native');
  await act(async () => { envoyerSouris(visageTable, 'mouseover'); });
  const apercuFennecSurvol = container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
  assert.ok(apercuFennecSurvol, 'le survol d’une créature en jeu ouvre immédiatement son aperçu');
  assert.equal(apercuFennecSurvol.querySelector('.rpg-card-rapidity, .rpg-card-evasion, .rpg-card-protection, .rpg-card-stat-boost'), null,
    'l’aperçu au survol n’affiche aucune icône d’effet');
  assert.equal(apercuFennecSurvol.querySelectorAll('.rpg-hover-card-preview__rules > span').length, 2,
    'l’aperçu au survol place Rapidité et Esquive chacune sur sa propre ligne');
  assert.equal(apercuFennecSurvol.querySelector('.rpg-hover-card-preview__type'), null,
    'l’aperçu d’une créature n’imprime pas de ligne de type');
  assert.match(apercuFennecSurvol.getAttribute('aria-label') ?? '', /Fennec/,
    'le type de la créature reste dans le libellé accessible de l’aperçu');
  assert.equal(apercuFennecSurvol.querySelector('.rpg-hover-card-preview__cost b')?.textContent, '2',
    'l’aperçu affiche le coût');
  assert.match(apercuFennecSurvol.querySelector('.rpg-hover-card-preview__rules')?.textContent ?? '', /Rapidité.*Esquive 1/,
    'l’aperçu affiche les effets importants');
  assert.equal(apercuFennecSurvol.querySelector('.rpg-hover-card-preview__stats')?.textContent.trim(), '⚔ 3 · 🛡 1',
    'l’aperçu affiche ATQ et DÉF');
  assert.equal(apercuFennecSurvol.querySelector('.rpg-hover-card-preview__flavor, .rpg-hover-card-preview__rarity, h2'), null,
    'l’aperçu reste concis et ne montre pas de saveur, rareté ou nom redondant');
  await act(async () => { envoyerSouris(visageTable, 'mouseout'); });
  assert.equal(container.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)'), null,
    'l’aperçu de la créature disparaît au départ de la souris');
  assert.ok(!visageTable.querySelector('.rpg-card__title strong, .rpg-card__text, .rpg-card__set'),
    'le nom, les règles et la rareté ne sont pas imprimés sur la carte posée');
  assert.ok(container.querySelectorAll('.rpg-terrain--joueur').length >= 1, 'le terrain posé est visible');
  const terrainPose = container.querySelector('.rpg-terrain--joueur.rpg-terrain--elem-sable');
  assert.ok(terrainPose, 'le terrain Désert est posé sur le champ');
  assertElementFrame(terrainPose, terrainPose.dataset.cardId, 'le terrain posé');
  assert.ok(container.querySelector('.rpg-terrain--joueur.is-tapped'), 'le terrain a été engagé pour son mana');

  // ── Rapidité : le Fennec peut être déclaré attaquant immédiatement ────
  await act(async () => { visageTable.click(); });
  assert.ok(visageTable.classList.contains('is-declared-attacker'),
    'un clic sélectionne le Fennec comme attaquant dès le tour où il arrive');
  assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'combat',
    'la phase de combat s’ouvre immédiatement pour le Fennec rapide');
  assert.ok(container.querySelector('.rpg-btn--confirmer-attaque .rpg-combat-action-icon--confirm'),
    'Confirmer affiche son icône de validation bleu clair');
  assert.equal(container.querySelector('.rpg-actions__turn .rpg-btn--endturn')?.disabled, true,
    'il faut quitter la sélection d’attaque avant de terminer le tour');
  const annulerSelectionAttaque = container.querySelector('.rpg-actions__combat .rpg-btn--ghost');
  assert.ok(annulerSelectionAttaque, 'la sélection du Fennec peut encore être annulée avant confirmation');
  await act(async () => { annulerSelectionAttaque.click(); });

  // Chaque carte annoncée par le sorcier attend la réponse du joueur : ici, on laisse passer.
  const laisserPasserLesAnnonces = async (racine = container) => {
    for (let annonce = 0; annonce < 8; annonce += 1) {
      const passer = [...racine.querySelectorAll('.rpg-annonce-sort button')]
        .find((bouton) => bouton.textContent.includes('Laisser passer'));
      if (!passer) break;
      await act(async () => { passer.click(); });
      await act(async () => { await wait(1100); });
    }
  };

  // ── Le sorcier annonce ses attaquants et ouvre la phase de réponse ────
  let ennemiJoue = 0;
  for (let tour = 0; tour < 6 && !container.querySelector('.rpg-btn--resolve-combat'); tour += 1) {
    await poserTerrainSansEngager();
    await poserChienPourDefendre();
    await act(async () => { findButton('Fin du tour').click(); });
    assert.ok(container.querySelector('.rpg-card-piles--opponent .rpg-card-pile--deck.is-drawing')
      && container.querySelector('.rpg-hidden-hand__card.rpg-hand-card--drawing'),
    'la pioche de début de tour du sorcier s’anime directement dans sa main cachée');
    if (tour === 0 && creatureArriveeId) {
      const creatureDuJoueur = [...container.querySelectorAll('.rpg-card--equipe')]
        .find((card) => card.dataset.entityId === creatureArriveeId);
      assert.ok(creatureDuJoueur && !creatureDuJoueur.classList.contains('is-summoning-sick'),
        'la créature reprend ses couleurs dès que commence le tour adverse');
    }
    await act(async () => { await wait(1800); });
    await laisserPasserLesAnnonces();
    ennemiJoue = container.querySelectorAll('.rpg-card--ennemi').length
      + container.querySelectorAll('.rpg-terrains--ennemi .rpg-terrain').length;
    if (!container.querySelector('.rpg-btn--resolve-combat')) await resoudreCombat();
  }
  assert.ok(ennemiJoue >= 1, 'le sorcier adverse doit poser terrains et cartes');
  assert.ok(container.querySelector('.rpg-btn--resolve-combat'), 'la défense expose une commande de résolution intégrée à la barre d’action');
  assert.match(container.querySelector('.rpg-turn-indicator')?.textContent ?? '', /À VOUS · DÉFENSE/,
    'l’indicateur identifie la phase de défense du joueur');
  assert.equal(container.querySelector('.rpg-combat-window'), null, 'aucune fenêtre de choix des bloqueurs ne recouvre la table');
  assert.ok(container.querySelector('.rpg-card--equipe.is-blocker-draggable'),
    'les bloqueurs se saisissent directement sur la table, sans fenêtre ni consigne écrite');
  const terrainsLibres = [...container.querySelectorAll('.rpg-terrain--joueur:not(.is-tapped)')];
  const mer = terrainsLibres.find((terrain) => terrain.dataset.cardId === 'mer');
  assert.ok(mer, 'le terrain eau est resté dégagé pour payer une magie rapide');
  await act(async () => { mer.click(); });
  const autreTerrain = [...container.querySelectorAll('.rpg-terrain--joueur:not(.is-tapped)')][0];
  assert.ok(autreTerrain, 'un second terrain peut fournir le mana générique');
  await act(async () => { autreTerrain.click(); });
  const parade = handCards().find((b) => b.getAttribute('aria-label')?.includes('Parade de verre'));
  assert.ok(parade?.classList.contains('rpg-hand__card--type-magie'), 'les magies conservent leur classification de type');
  assert.ok(parade && estJouable(parade), 'la magie rapide devient jouable pendant la réponse');
  assert.equal(parade.querySelector('.rpg-card-element-badge')?.textContent.trim(), '💧',
    'les cartes Eau utilisent la goutte d’eau');
  await glisserSurTable(container, parade);
  const cibleParade = [...container.querySelectorAll('.rpg-card--equipe')]
    .find((carte) => carte.getAttribute('aria-label')?.includes('Chien du guet'));
  assert.ok(cibleParade, 'le Chien fournit une cible distincte du Fennec esquiveur');
  const nomCibleParade = cibleParade.getAttribute('aria-label').split(',')[0];
  await act(async () => { cibleParade.click(); });
  assert.match(container.querySelector('.rpg-log')?.textContent ?? '', /Vous lancez Parade de verre/,
    'la carte ciblée se résout en réponse, et le journal en garde la trace');
  assert.ok(container.querySelector('.rpg-spell-played'), 'la magie résolue s’affiche sur la table');
  const apercuMagieJouee = container.querySelector('.rpg-hover-card-preview.is-spell-preview');
  assert.ok(apercuMagieJouee
    && apercuMagieJouee.querySelector('.rpg-hover-card-preview__rules')?.textContent.includes('3 prochains dégâts'),
  'jouer une magie fait apparaître son aperçu concis avec son effet principal');
  assert.match(container.querySelector('.rpg-spell-played__target')?.textContent ?? '', new RegExp(nomCibleParade),
    'l’annonce du sort nomme précisément la carte visée');
  assert.ok(cibleParade.classList.contains('is-spell-target'), 'la carte visée est mise en évidence');
  assert.ok(!container.querySelector('.rpg-btn--undo'), 'une magie jouée ne peut pas être annulée');
  assert.match(cibleParade.getAttribute('aria-label') ?? '', /bouclier 3/, 'le bouclier reste accessible sans être imprimé sur la carte');
  const attaquantPourBloquer = container.querySelector('.rpg-card--ennemi.is-declared-attacker');
  const carteFennec = [...container.querySelectorAll('.rpg-card--equipe')]
    .find((carte) => carte.getAttribute('aria-label')?.includes('Fennec des décombres'));
  const carteChien = [...container.querySelectorAll('.rpg-card--equipe')]
    .find((carte) => carte.getAttribute('aria-label')?.includes('Chien du guet'));
  assert.ok(attaquantPourBloquer && carteFennec && carteChien, 'l’attaquant, le Fennec et le Chien sont visibles comme bloqueurs disponibles');
  await act(async () => { carteFennec.click(); });
  assert.ok(carteFennec.classList.contains('is-blocker-selected'), 'un clic sélectionne un bloqueur disponible');
  await act(async () => { attaquantPourBloquer.click(); });
  assert.equal(container.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count'), '1',
    'un clic sur l’attaquant attribue le bloqueur sélectionné');
  await act(async () => { carteFennec.click(); });
  await act(async () => { attaquantPourBloquer.click(); });
  assert.equal(container.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count') ?? '0', '0',
    'le couple de clics retire aussi une affectation existante');
  await glisserBloqueurSurAttaquant(carteFennec, attaquantPourBloquer);
  await glisserBloqueurSurAttaquant(carteChien, attaquantPourBloquer);
  assert.equal(container.querySelectorAll('.rpg-card.is-blocking').length, 2,
    'les deux bloqueurs déposés sont signalés sur la table');
  assert.equal(container.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count'), '2',
    'deux flèches relient les bloqueurs à la même créature attaquante');
  await glisserBloqueurSurAttaquant(carteFennec, attaquantPourBloquer);
  assert.equal(container.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count'), '1',
    'redéposer un bloqueur sur le même attaquant le retire sans ouvrir de panneau');
  await glisserBloqueurSurAttaquant(carteFennec, attaquantPourBloquer);
  assert.equal(container.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count'), '2',
    'un bloqueur retiré peut être assigné à nouveau par glisser-déposer');
  assert.ok(attaquantPourBloquer.classList.contains('fx-block') && carteFennec.classList.contains('fx-block'),
    'l’attaquant et le bloqueur signalent visuellement le choc de l’assignation');
  const bounds = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  const table = container.querySelector('.card-table');
  table.getBoundingClientRect = () => bounds(0, 0, 1000, 700);
  attaquantPourBloquer.getBoundingClientRect = () => bounds(430, 100, 140, 175);
  carteFennec.getBoundingClientRect = () => bounds(300, 420, 140, 175);
  carteChien.getBoundingClientRect = () => bounds(500, 420, 140, 175);
  await act(async () => { window.dispatchEvent(new window.Event('resize')); });
  const fleches = [...container.querySelectorAll('.rpg-blocker-arrow__shaft')];
  assert.equal(fleches.length, 2, 'chaque assignation dessine une flèche SVG');
  assert.ok(fleches.every((fleche) => /^M [\d.]+ [\d.]+ Q /.test(fleche.getAttribute('d') ?? '')),
    'les flèches jaunes traversent directement la table sans masque ni fenêtre au centre');
  const extremites = fleches[0].getAttribute('d').match(/^M [\d.]+ ([\d.]+) Q [\d.]+ [\d.]+ [\d.]+ ([\d.]+)$/);
  assert.ok(extremites && Number(extremites[1]) > Number(extremites[2]),
    'la flèche part bien du bloqueur situé en bas vers l’attaquant situé en haut');
  assert.equal(container.querySelector('.rpg-combat-window'), null, 'le choix des bloqueurs n’ouvre aucune fenêtre');
  assert.ok(container.querySelector('.rpg-btn--resolve-combat'), 'la résolution reste accessible depuis les commandes en bas de table');
  await resoudreCombat();
  assert.match([...container.querySelectorAll('.rpg-card--equipe')]
    .find((carte) => carte.getAttribute('aria-label')?.startsWith(nomCibleParade))?.getAttribute('aria-label') ?? '',
  /bouclier 2/, 'la Parade absorbe les dégâts répartis automatiquement sans ajouter de texte sur la face de la carte');

  // ── Les attaques passent par une déclaration et le défenseur choisit ses blocs ─
  await act(async () => { container.querySelector('.rpg-wizard-plate--ennemi').click(); });
  assert.ok(container.querySelector('.rpg-btn--attaque-tous'),
    'toucher le sorcier n’affiche aucune consigne : la déclaration reste dans les commandes');

  // ── Au tour suivant, notre créature reste disponible ──────────────────
  await act(async () => { findButton('Fin du tour').click(); });
  await act(async () => { await wait(1800); });
  await laisserPasserLesAnnonces();
  await resoudreCombat();
  assert.ok(container.querySelector('.rpg-card--equipe.is-pret'),
    'notre créature doit être prête à attaquer à notre tour');

  // ── Phase d’attaque : un clic sur une créature ouvre la sélection ──────
  const mesCreatures = [...container.querySelectorAll('.rpg-card--equipe')];
  assert.equal(mesCreatures.length, 2, 'les deux bloqueurs survivants peuvent aussi attaquer');
  await act(async () => { mesCreatures[0].click(); });
  assert.ok(findButton('Confirmer'), 'la phase d’attaque propose de confirmer');
  assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'combat',
    'la phase Combat s’allume après le clic sur une créature');
  assert.equal(container.querySelector('.rpg-actions__turn .rpg-btn--endturn')?.disabled, true,
    'Fin du tour est désactivé pendant la sélection des attaquants');
  await act(async () => { mesCreatures[1].click(); });
  const lancer = findButton('Confirmer');
  assert.match(lancer.textContent, /\(2\)/, 'deux attaquants déclarés');
  assert.equal(container.querySelectorAll('.rpg-card.is-declared-attacker').length, 2,
    'les créatures déclarées s’inclinent à 90° avant la confirmation');
  await act(async () => { lancer.click(); });
  assert.ok(!container.querySelector('.rpg-btn--undo'), 'une attaque confirmée ne peut plus être annulée');
  assert.match(container.querySelector('.rpg-turn-indicator')?.textContent ?? '', /À VOUS · RÉPONSE/,
    'après le choix des bloqueurs adverses, la priorité revient au joueur');
  assert.equal(container.querySelector('.rpg-phase-step.is-active')?.dataset.phase, 'reponse',
    'la phase Réponse s’allume après l’assignation des bloqueurs');
  assert.ok(container.querySelector('.rpg-hand-dock.is-open'),
    'la main revient pour permettre de jouer une magie rapide');
  const accepterBlocages = container.querySelector('.rpg-btn--resolve-combat');
  assert.match(accepterBlocages?.textContent ?? '', /Accepter les blocages/,
    'le joueur peut accepter les bloqueurs choisis par le sorcier tels quels');
  const bloqueursChoisis = container.querySelectorAll('.rpg-card--ennemi.is-blocking').length;
  if (bloqueursChoisis) {
    assert.equal(container.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count'), String(bloqueursChoisis),
      'chaque bloqueur choisi par le sorcier est relié à son attaquant par une flèche jaune');
  }
  assert.ok(container.querySelectorAll('.rpg-card--equipe.is-declared-attacker').length > 0,
    'les attaquants restent inclinés pendant la réponse, avant les dégâts');
  await resoudreCombat();
  assert.match(container.querySelector('.rpg-log')?.textContent ?? '', /Combat :|frappent le sorcier/,
    'accepter les blocages résout ensuite le combat');
  assert.ok(!container.querySelector('.rpg-card--equipe.is-pret'),
    'les attaquants ont frappé : plus personne n’est prêt');
  assert.ok(container.querySelector('.rpg-card--equipe.is-attacked'),
    'une créature attaquante survivante porte l’état grisé et incliné après résolution');
  assert.ok(container.querySelector('.rpg-card--equipe.fx-lunge'),
    'la résolution déclenche un bref mouvement d’attaque visible');

  // ── Attaque express avec toutes les créatures prêtes ──────────────────
  await act(async () => { findButton('Fin du tour').click(); });
  await act(async () => { await wait(1800); });
  await laisserPasserLesAnnonces();
  await resoudreCombat();
  const boutonAttaquerTous = container.querySelector('.rpg-btn--attaque-tous');
  assert.ok(boutonAttaquerTous && !boutonAttaquerTous.disabled,
    'le bouton Attaquer avec tous est disponible dès qu’une créature est prête');
  const nombreAttaquantsDisponibles = container.querySelectorAll('.rpg-card--equipe.is-pret').length;
  assert.ok(nombreAttaquantsDisponibles > 0, 'l’attaque globale porte sur les créatures qui peuvent effectivement attaquer');
  await act(async () => { boutonAttaquerTous.click(); });
  assert.equal(container.querySelectorAll('.rpg-card.is-declared-attacker').length, nombreAttaquantsDisponibles,
    'Attaquer avec tous incline toutes les créatures prêtes avant confirmation');
  const confirmerAttaqueTotale = findButton('Confirmer');
  assert.ok(confirmerAttaqueTotale?.textContent.includes(`(${nombreAttaquantsDisponibles})`),
    'le bouton de confirmation indique le nombre total d’attaquants déclarés');
  await act(async () => { confirmerAttaqueTotale.click(); });
  const bloqueursAttaqueTotale = container.querySelectorAll('.rpg-card--ennemi.is-blocking').length;
  if (bloqueursAttaqueTotale) {
    assert.ok(container.querySelector('.rpg-hand-dock.is-open') && container.querySelector('.rpg-btn--resolve-combat'),
      'la main et la commande d’acceptation reviennent après Attaquer avec tous si des bloqueurs sont assignés');
    await resoudreCombat();
  } else {
    assert.ok(!container.querySelector('.rpg-btn--resolve-combat'),
      'aucune commande d’acceptation n’est affichée quand Attaquer avec tous ne rencontre aucun bloqueur');
  }
  assert.match(container.querySelector('.rpg-log')?.textContent ?? '', /Combat :|frappent le sorcier/,
    'l’attaque globale est résolue après acceptation ou automatiquement sans bloqueur');

  await act(async () => { root.unmount(); });
  container.remove();

  // ── Réponse après les bloqueurs : la magie rapide retire le défenseur, sans dégâts directs ──
  const responseContainer = document.createElement('div');
  document.body.appendChild(responseContainer);
  const responseRoot = createRoot(responseContainer);
  await act(async () => {
    responseRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'chien-du-guet', 'trait-de-braise', 'desert', 'montagne', 'desert']}
      sorcierDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(responseContainer);
  const responseButtons = () => [...responseContainer.querySelectorAll('button')];
  const responseButton = (label) => responseButtons().find((button) => button.textContent.includes(label));
  const responseHand = () => responseButtons().filter((button) => button.className.includes('rpg-hand__card'));
  const jouerTerrainReponse = async (nom) => {
    const terrain = responseHand().find((card) => card.classList.contains('rpg-hand__card--terrain')
      && card.getAttribute('aria-label')?.toLowerCase().includes(nom)
      && estJouable(card));
    assert.ok(terrain, `le terrain ${nom} est disponible pour le test de priorité`);
    await glisserSurTable(responseContainer, terrain);
  };
  const terminerTourReponse = async () => {
    await act(async () => { responseButton('Fin du tour').click(); });
    await act(async () => { await wait(1800); });
    for (let annonce = 0; annonce < 8; annonce += 1) {
      const passer = [...responseContainer.querySelectorAll('.rpg-annonce-sort button')]
        .find((bouton) => bouton.textContent.includes('Laisser passer'));
      if (!passer) break;
      await act(async () => { passer.click(); });
      await act(async () => { await wait(1100); });
    }
    const combat = responseContainer.querySelector('.rpg-btn--resolve-combat');
    if (combat) await act(async () => { combat.click(); });
  };
  assert.ok(responseHand().some((card) => card.getAttribute('aria-label')?.includes('Trait de braise')),
    'Trait de braise est conservé en main jusqu’à la réponse aux bloqueurs');
  await jouerTerrainReponse('désert');
  await terminerTourReponse();
  await jouerTerrainReponse('désert');
  const chienReponse = () => responseHand().find((card) => card.getAttribute('aria-label')?.includes('Chien du guet'));
  assert.ok(chienReponse() && estJouable(chienReponse()), 'deux terrains permettent de poser l’attaquant');
  await glisserSurTable(responseContainer, chienReponse());
  await terminerTourReponse();
  await jouerTerrainReponse('montagne');
  assert.ok(responseContainer.querySelector('.rpg-card--equipe.is-pret'), 'l’attaquant est prêt au tour suivant');
  await act(async () => { responseButton('Attaquer avec tous').click(); });
  await act(async () => { responseButton('Confirmer').click(); });
  assert.equal(responseContainer.querySelectorAll('.rpg-card--ennemi.is-blocking').length, 1,
    'le sorcier choisit un bloqueur avant que le joueur ne reçoive la priorité');
  assert.equal(responseContainer.querySelector('.rpg-blocker-arrows')?.getAttribute('data-arrow-count'), '1',
    'la flèche jaune matérialise le blocage adverse pendant la fenêtre de réponse');
  const traitReponse = responseHand().find((card) => card.getAttribute('aria-label')?.includes('Trait de braise'));
  assert.ok(traitReponse && estJouable(traitReponse), 'Trait de braise, Magie Rapide à 2, est payable pendant la réponse');
  await glisserSurTable(responseContainer, traitReponse);
  const bloqueurTrait = responseContainer.querySelector('.rpg-card--ennemi.is-blocking');
  assert.ok(bloqueurTrait?.classList.contains('is-ciblable'), 'le bloqueur choisi est mis en évidence comme cible du Trait');
  await act(async () => { bloqueurTrait.click(); });
  assert.ok(!responseContainer.querySelector('.rpg-card--ennemi.is-blocking'),
    'les 3 dégâts du Trait détruisent le bloqueur avant la résolution des dégâts de combat');
  assert.equal(responseContainer.querySelector('.rpg-btn--resolve-combat')?.textContent.includes('Accepter les blocages'), true,
    'le joueur garde la commande pour accepter puis résoudre le combat');
  const responseTable = responseContainer.querySelector('.card-table');
  assert.equal(responseTable.dataset.screenImpact, undefined, 'l’attaque ne touche pas directement le sorcier avant acceptation');
  await act(async () => { responseButton('Accepter les blocages').click(); });
  assert.match(responseContainer.querySelector('.rpg-log')?.textContent ?? '', /Combat :|frappent le sorcier/,
    'l’acceptation résout le combat après la magie rapide');
  assert.equal(responseTable.dataset.screenImpact, undefined,
    'un attaquant reste bloqué même si son bloqueur a été détruit en réponse');
  await act(async () => { responseRoot.unmount(); });
  responseContainer.remove();

  // ── Impacts directs : secousse offensive, puis vignette rouge reçue ───
  const impactContainer = document.createElement('div');
  document.body.appendChild(impactContainer);
  const impactRoot = createRoot(impactContainer);
  await act(async () => {
    impactRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert']}
      sorcierDeck={['desert', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(impactContainer);
  const impactHand = () => [...impactContainer.querySelectorAll('button.rpg-hand__card')];
  const impactButton = (label) => [...impactContainer.querySelectorAll('button')]
    .find((button) => button.textContent.includes(label));
  const jouerTerrainImpact = async () => {
    const terrain = impactHand().find((card) => card.classList.contains('rpg-hand__card--terrain') && estJouable(card));
    assert.ok(terrain, 'un terrain est disponible pour préparer le duel de test des impacts');
    await glisserSurTable(impactContainer, terrain);
  };
  const terminerTourImpact = async () => {
    await act(async () => { impactButton('Fin du tour').click(); });
    await act(async () => { await wait(1800); });
    for (let annonce = 0; annonce < 8; annonce += 1) {
      const passer = [...impactContainer.querySelectorAll('.rpg-annonce-sort button')]
        .find((bouton) => bouton.textContent.includes('Laisser passer'));
      if (!passer) break;
      await act(async () => { passer.click(); });
      await act(async () => { await wait(1100); });
    }
  };
  await jouerTerrainImpact();
  await terminerTourImpact();
  const chienImpact = () => impactHand().find((card) => card.getAttribute('aria-label')?.includes('Chien du guet'));
  assert.ok(chienImpact() && !estJouable(chienImpact()), 'le Chien coûte deux terrains avant de pouvoir être joué');
  await jouerTerrainImpact();
  assert.ok(estJouable(chienImpact()), 'le second terrain permet de jouer le Chien');
  const chienImpactAvantVol = chienImpact();
  await glisserSurTable(impactContainer, chienImpactAvantVol, false);
  const chienImpactEnVol = carteEnVol(impactContainer);
  assert.ok(chienImpactEnVol?.matches('.rpg-card-flight[data-rpg-card-flight="creature"]'),
    'la créature de test est également animée depuis la main');
  assert.equal(chienImpactEnVol, chienImpactAvantVol,
    'le vol emploie la vraie carte jouée, pas une seconde carte recréée');
  await terminerVol(impactContainer);
  await terminerTourImpact();
  assert.ok(impactContainer.querySelector('.rpg-card--equipe.is-pret'), 'la créature peut attaquer après son tour d’arrivée');
  assert.equal(impactContainer.querySelector('.rpg-card--ennemi'), null, 'le sorcier n’a pas encore de bloqueur');
  await act(async () => { impactButton('Attaquer avec tous').click(); });
  await act(async () => { impactButton('Confirmer').click(); });
  const tableImpact = impactContainer.querySelector('.card-table');
  assert.equal(impactContainer.querySelector('.rpg-btn--resolve-combat'), null,
    'sans bloqueur adverse, aucune confirmation des blocages n’est demandée');
  assert.equal(tableImpact.dataset.screenImpact, 'dealt',
    'une attaque sans bloqueur se résout automatiquement et déclenche son impact visuel');
  assert.match(impactContainer.querySelector('.rpg-log')?.textContent ?? '', /Combat :|frappent le sorcier/,
    'la résolution automatique confirme immédiatement le résultat du combat');
  assert.match(tableImpact.className, /rpg-screen-shake--[ab]/, 'une attaque directe fait trembler l’écran');
  assert.doesNotMatch(tableImpact.className, /rpg-screen-hit--[ab]/, 'l’attaque donnée ne colore pas l’écran en rouge');

  await terminerTourImpact();
  await terminerTourImpact();
  assert.ok(impactContainer.querySelector('.rpg-btn--resolve-combat'), 'le sorcier finit par envoyer une attaque directe');
  await act(async () => { impactButton('Résoudre le combat').click(); });
  assert.equal(tableImpact.dataset.screenImpact, 'received', 'une attaque directe reçue est distinguée');
  assert.match(tableImpact.className, /rpg-screen-shake--[ab]/, 'l’attaque reçue fait aussi trembler l’écran');
  assert.match(tableImpact.className, /rpg-screen-hit--[ab]/, 'l’attaque reçue ajoute la vignette rouge');
  assert.match(impactContainer.textContent, /🛡 48/, 'les dégâts reçus accompagnent bien l’effet de vignette');
  await act(async () => { impactRoot.unmount(); });
  impactContainer.remove();

  // ── Régression : le Trait de braise élimine l'unique attaquant pendant la réponse ──
  const killContainer = document.createElement('div');
  document.body.appendChild(killContainer);
  const killRoot = createRoot(killContainer);
  await act(async () => {
    killRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'trait-de-braise', 'mer', 'montagne']}
      sorcierDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'fennec-des-decombres']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(killContainer);
  const killHand = () => [...killContainer.querySelectorAll('button.rpg-hand__card')];
  const jouerCarteParGlisser = async (name) => {
    const card = killHand().find((button) => button.getAttribute('aria-label')?.includes(name));
    assert.ok(card && estJouable(card), `${name} doit être jouable`);
    if (name.includes('Trait de braise')) {
      assert.equal(card.querySelector('.rpg-card-element-badge')?.textContent.trim(), '🔥',
        'la magie rapide Braise utilise la flamme');
    }
    await glisserSurTable(killContainer, card);
  };
  await jouerCarteParGlisser('Montagne');
  await act(async () => { [...killContainer.querySelectorAll('.rpg-terrain--joueur:not(.is-tapped)')][0].click(); });
  await act(async () => { killContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(1800); });
  await passerAnnoncesSorcier(killContainer);
  assert.ok(!killContainer.querySelector('.rpg-btn--resolve-combat'), 'le Fennec qui vient d’arriver ne peut pas attaquer');

  await jouerCarteParGlisser('Mer');
  await act(async () => { killContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(1800); });
  await passerAnnoncesSorcier(killContainer);
  assert.ok(killContainer.querySelector('.rpg-btn--resolve-combat'),
    'le Fennec adverse attaque dès son arrivée grâce à Rapidité');
  assert.ok([...killContainer.querySelectorAll('.rpg-card--ennemi')]
    .some((card) => card.getAttribute('aria-label')?.includes('Fennec des décombres')),
  'le Fennec coût 2 est désormais sur le champ');
  await act(async () => { killContainer.querySelector('.rpg-btn--resolve-combat').click(); });
  await act(async () => { killContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(1800); });
  await passerAnnoncesSorcier(killContainer);
  assert.ok(killContainer.querySelector('.rpg-btn--resolve-combat'), 'le Fennec peut aussi attaquer lors du tour adverse suivant');
  assert.ok([...killContainer.querySelectorAll('.rpg-card--ennemi')]
    .some((card) => card.getAttribute('aria-label')?.includes('Fennec des décombres')), 'le Fennec est l’attaquant à éliminer');
  for (const terrain of killContainer.querySelectorAll('.rpg-terrain--joueur:not(.is-tapped)')) {
    await act(async () => { terrain.click(); });
  }
  await jouerCarteParGlisser('Trait de braise');
  await act(async () => { killContainer.querySelector('.rpg-card--ennemi').click(); });
  assert.match(killContainer.querySelector('.rpg-spell-played__target')?.textContent ?? '', /Fennec des décombres/,
    'la carte visée reste identifiable même si le Trait la détruit');
  const destructionTrait = killContainer.querySelector('.rpg-card-destruction-fx[data-rpg-destroyed-id]');
  assert.ok(destructionTrait,
    'une créature détruite reste brièvement visible dans une animation avant de disparaître');
  assert.ok(destructionTrait.classList.contains('is-burning')
    && destructionTrait.dataset.destructionSource === 'braise',
  'une carte éliminée par le Trait de braise reçoit la variante de combustion Braise');
  assert.ok(!killContainer.querySelector('.rpg-btn--undo'), 'le Trait joué reste définitif');
  assert.ok(!killContainer.querySelector('.rpg-btn--resolve-combat'),
    'la commande de résolution disparaît quand le Trait élimine le dernier attaquant');
  assert.match(killContainer.querySelector('.rpg-turn-indicator')?.textContent ?? '', /À VOTRE TOUR/,
    'le tour du joueur reprend après la résolution du Trait');
  await act(async () => { killRoot.unmount(); });
  killContainer.remove();

  // ── Le sort Braise lancé par l'IA brûle aussi sa véritable victime ────
  const aiFireContainer = document.createElement('div');
  document.body.appendChild(aiFireContainer);
  const aiFireRoot = createRoot(aiFireContainer);
  await act(async () => {
    aiFireRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'fennec-des-decombres', 'desert', 'desert', 'desert']}
      sorcierDeck={['trait-de-braise', 'montagne', 'montagne', 'montagne', 'montagne', 'montagne', 'montagne']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(aiFireContainer);
  const aiFireHand = () => [...aiFireContainer.querySelectorAll('button.rpg-hand__card')];
  const jouerCarteAiFire = async (name) => {
    const card = aiFireHand().find((button) => button.getAttribute('aria-label')?.includes(name));
    assert.ok(card && estJouable(card), `${name} doit être jouable avant le tour adverse`);
    await glisserSurTable(aiFireContainer, card);
  };
  await jouerCarteAiFire('Désert');
  await act(async () => { aiFireContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(1800); });
  await passerAnnoncesSorcier(aiFireContainer);
  await jouerCarteAiFire('Désert');
  await jouerCarteAiFire('Fennec des décombres');
  assert.ok(aiFireContainer.querySelector('.rpg-card--equipe'), 'le Fennec est présent avant l’action de l’IA');
  await act(async () => { aiFireContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(900); });
  // Le sort Braise est annoncé : le joueur a la main pour répondre, ou laisser passer.
  assert.match(aiFireContainer.querySelector('.rpg-annonce-sort')?.textContent ?? '', /Trait de braise/,
    'la bannière annonce le sort du sorcier avant sa résolution');
  const previewSortAnnonce = aiFireContainer.querySelector('.rpg-annonce-sort .rpg-hover-card-preview--annonce');
  assert.ok(previewSortAnnonce, 'la carte annoncée reste visible dans son aperçu pendant la fenêtre de réponse');
  assert.match(previewSortAnnonce.querySelector('.rpg-hover-card-preview__face img')?.getAttribute('src') ?? '',
    /\/cards\/trait-de-braise\.jpg(?:\?|$)/,
    'l’aperçu affiche l’illustration de la carte annoncée');
  assert.equal(previewSortAnnonce.querySelector('.rpg-hover-card-preview__name')?.textContent, 'Trait de braise',
    'l’aperçu nomme clairement le sort annoncé');
  const cibleSortAnnonce = previewSortAnnonce.querySelector('.rpg-hover-card-preview__target');
  assert.match(cibleSortAnnonce?.textContent ?? '', /Fennec des décombres/,
    'l’aperçu d’une magie montre la créature choisie comme cible');
  assert.match(cibleSortAnnonce?.querySelector('img')?.getAttribute('src') ?? '',
    /\/cards\/fennec-des-decombres\.jpg(?:\?|$)/,
    'l’aperçu identifie aussi la cible par son illustration');
  const boutonLaisserPasser = aiFireContainer.querySelector('.rpg-annonce-sort__pass');
  assert.ok(boutonLaisserPasser && !boutonLaisserPasser.classList.contains('rpg-btn--endturn'),
    'Laisser passer utilise son propre style compact, pas le gros bouton de fin de tour');
  assert.ok(boutonLaisserPasser.getAttribute('aria-label')?.includes('Trait de braise'),
    'le bouton précise quelle carte laisser passer');
  await act(async () => { boutonLaisserPasser.click(); });
  await act(async () => { await wait(200); });
  const destructionAi = aiFireContainer.querySelector('.rpg-card-destruction-fx[data-rpg-destroyed-id]');
  assert.ok(destructionAi?.classList.contains('is-burning')
    && destructionAi.dataset.destructionSource === 'braise',
  'la destruction par le sort Braise de l’IA reçoit la bonne animation');
  await act(async () => { aiFireRoot.unmount(); });
  aiFireContainer.remove();

  // ── Une destruction Eau garde l’effet générique, sans combustion ───────
  const waterContainer = document.createElement('div');
  document.body.appendChild(waterContainer);
  const waterRoot = createRoot(waterContainer);
  await act(async () => {
    waterRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'lame-de-mer', 'mer', 'montagne']}
      sorcierDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'fennec-des-decombres']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(waterContainer);
  const waterHand = () => [...waterContainer.querySelectorAll('button.rpg-hand__card')];
  const jouerCarteEau = async (name) => {
    const card = waterHand().find((button) => button.getAttribute('aria-label')?.includes(name));
    assert.ok(card && estJouable(card), `${name} doit être jouable`);
    await glisserSurTable(waterContainer, card);
  };
  await jouerCarteEau('Montagne');
  await act(async () => { waterContainer.querySelector('.rpg-terrain--joueur:not(.is-tapped)').click(); });
  await act(async () => { waterContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(1800); });
  await passerAnnoncesSorcier(waterContainer);
  await jouerCarteEau('Mer');
  await act(async () => { waterContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(1800); });
  await passerAnnoncesSorcier(waterContainer);
  const combatRapiditeEau = waterContainer.querySelector('.rpg-btn--resolve-combat');
  if (combatRapiditeEau) await act(async () => { combatRapiditeEau.click(); });
  assert.ok([...waterContainer.querySelectorAll('.rpg-card--ennemi')]
    .some((card) => card.getAttribute('aria-label')?.includes('Fennec des décombres')),
  'le Fennec a reçu son second mana avant d’être ciblé');
  const lameDeMer = waterHand().find((button) => button.getAttribute('aria-label')?.includes('Lame de mer'));
  assert.ok(lameDeMer && estJouable(lameDeMer), 'deux terrains permettent de payer le sort Eau');
  await glisserSurTable(waterContainer, lameDeMer);
  const cibleEau = waterContainer.querySelector('.rpg-card--ennemi');
  assert.ok(cibleEau?.getAttribute('aria-label')?.includes('Fennec des décombres'), 'le Fennec est la cible de Lame de mer');
  await act(async () => { cibleEau.click(); });
  const destructionEau = waterContainer.querySelector('.rpg-card-destruction-fx[data-rpg-destroyed-id]');
  assert.ok(destructionEau, 'le Fennec détruit par Eau conserve le signal générique');
  assert.equal(destructionEau.classList.contains('is-burning'), false,
    'un sort Eau ne reçoit jamais la variante de combustion Braise');
  await act(async () => { waterRoot.unmount(); });
  waterContainer.remove();

  // ── Désert : le bouclier de couleur s’affiche dès qu’Amayas est posée ──
  const protectionContainer = document.createElement('div');
  document.body.appendChild(protectionContainer);
  const protectionRoot = createRoot(protectionContainer);
  await act(async () => {
    protectionRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'amayas-du-hoggar', 'chien-du-guet']}
      sorcierDeck={[]}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(protectionContainer);
  const protectionButtons = () => [...protectionContainer.querySelectorAll('button')];
  const protectionButton = (label) => protectionButtons().find((button) => button.textContent.includes(label));
  const protectionHand = () => protectionButtons().filter((button) => button.className.includes('rpg-hand__card'));
  const poserDesertProtection = async () => {
    const terrain = protectionHand().find((card) => card.classList.contains('rpg-hand__card--terrain')
      && card.getAttribute('aria-label')?.includes('Désert')
      && estJouable(card));
    assert.ok(terrain, 'un Désert est disponible pour le tour de test de protection');
    await glisserSurTable(protectionContainer, terrain);
  };
  const terminerTourProtection = async () => {
    await act(async () => { protectionButton('Fin du tour').click(); });
    await act(async () => { await wait(1800); });
    await laisserPasserLesAnnonces(protectionContainer);
  };
  await poserDesertProtection();
  await terminerTourProtection();
  await poserDesertProtection();
  await terminerTourProtection();
  await poserDesertProtection();
  const amayasMain = protectionHand().find((card) => card.getAttribute('aria-label')?.includes('Amayas, guide du Hoggar'));
  assert.ok(amayasMain && estJouable(amayasMain), 'Amayas devient jouable après la pose de trois terrains Désert');
  await glisserSurTable(protectionContainer, amayasMain);
  const amayasTable = protectionContainer.querySelector('.rpg-card--equipe[data-card-id="amayas-du-hoggar"]');
  assert.equal(amayasTable?.querySelector('.rpg-card-protection--braise'), null,
    'le bouclier de protection n’est pas imprimé sur la carte posée');
  assert.match(amayasTable.getAttribute('aria-label'), /protection contre Braise pendant encore 2 tours/,
    'la couleur et la durée de la protection restent annoncées de façon accessible');
  await act(async () => { envoyerSouris(amayasTable, 'mouseover'); });
  const apercuAmayas = protectionContainer.querySelector('.rpg-hover-card-preview:not(.is-spell-preview)');
  assert.equal(apercuAmayas?.querySelector('.rpg-card-protection--braise, .rpg-card-stat-boost'), null,
    'l’aperçu de la créature n’affiche pas d’icône d’effet');
  assert.equal(apercuAmayas?.querySelectorAll('.rpg-hover-card-preview__rules > span').length, 2,
    'l’aperçu sépare la protection et la capacité de pioche sur deux lignes');
  await act(async () => { protectionRoot.unmount(); });
  protectionContainer.remove();

  // ── Le Cavalier choisit sa cible, puis la vraie carte quitte la main ────
  const cavalryContainer = document.createElement('div');
  document.body.appendChild(cavalryContainer);
  const cavalryRoot = createRoot(cavalryContainer);
  await act(async () => {
    cavalryRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'cavalier-amazigh-du-desert']}
      sorcierDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'chien-du-guet', 'desert', 'desert', 'desert', 'desert']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(cavalryContainer);
  const cavalryHand = () => [...cavalryContainer.querySelectorAll('button.rpg-hand__card')];
  const jouerDesertCavalry = async () => {
    const terrain = cavalryHand().find((card) => card.classList.contains('rpg-hand__card--terrain')
      && card.getAttribute('aria-label')?.includes('Désert')
      && estJouable(card));
    assert.ok(terrain, 'un Désert est disponible pour financer le Cavalier');
    await glisserSurTable(cavalryContainer, terrain);
  };
  for (let tour = 1; tour <= 5; tour += 1) {
    await jouerDesertCavalry();
    if (tour < 5) {
      await act(async () => { cavalryContainer.querySelector('.rpg-btn--endturn').click(); });
      await act(async () => { await wait(1800); });
      await passerAnnoncesSorcier(cavalryContainer);
      const combatSorcier = cavalryContainer.querySelector('.rpg-btn--resolve-combat');
      if (combatSorcier) await act(async () => { combatSorcier.click(); });
    }
  }
  assert.ok([...cavalryContainer.querySelectorAll('.rpg-card--ennemi')]
    .some((card) => card.getAttribute('aria-label')?.includes('Chien du guet')),
  'le Chien adverse est présent pour devenir la cible du combat');
  const cavalryInHand = cavalryHand().find((card) => card.dataset.cardId === 'cavalier-amazigh-du-desert');
  assert.ok(cavalryInHand && estJouable(cavalryInHand), 'le Cavalier est payable avec les cinq Déserts posés');
  await glisserSurTable(cavalryContainer, cavalryInHand, false);
  assert.ok(cavalryInHand.isConnected && !cavalryInHand.classList.contains('rpg-card-flight'),
    'la carte attend le choix de cible avant de quitter la main');
  assert.ok(cavalryInHand.classList.contains('is-targeting')
    && cavalryContainer.querySelector('.rpg-card--ennemi.is-ciblable'),
  'la carte en attente et les cibles légales s’allument : l’effet d’arrivée se choisit sans consigne écrite');
  const cibleCavalier = [...cavalryContainer.querySelectorAll('.rpg-card--ennemi')]
    .find((card) => card.getAttribute('aria-label')?.includes('Chien du guet'));
  assert.ok(cibleCavalier?.classList.contains('is-ciblable'), 'la créature adverse devient une cible cliquable');
  await act(async () => { cibleCavalier.click(); });
  assert.equal(carteEnVol(cavalryContainer), cavalryInHand,
    'après le choix, la véritable carte du Cavalier vole depuis la main');
  await terminerVol(cavalryContainer);
  assert.ok(cavalryContainer.querySelector('.rpg-card--equipe[data-card-id="cavalier-amazigh-du-desert"]'),
    'le Cavalier arrive sur son champ de bataille après l’animation');
  assert.equal(cavalryContainer.querySelector('.rpg-card--ennemi[data-card-id="chien-du-guet"]'), null,
    'les 4 dégâts d’arrivée détruisent bien le Chien 2/2 ciblé');
  assert.match(cavalryContainer.querySelector('.rpg-log')?.textContent ?? '',
    /Cavalier amazigh du Désert se bat contre Chien du guet \(4 \/ 2\)/,
    'le journal du duel garde le résultat de l’affrontement mutuel');
  await act(async () => { cavalryRoot.unmount(); });
  cavalryContainer.remove();

  // ── Pétra : choix manuel de Braise ou Sable à chaque engagement ───────
  const petraContainer = document.createElement('div');
  document.body.appendChild(petraContainer);
  const petraRoot = createRoot(petraContainer);
  await act(async () => {
    petraRoot.render(<RpgDuelPage
      joueurDeck={['petra', 'desert', 'petra', 'montagne', 'petra']}
      sorcierDeck={[]}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(petraContainer);
  const petraMain = () => [...petraContainer.querySelectorAll('button.rpg-hand__card')]
    .find((card) => card.dataset.cardId === 'petra');
  const engagerPetraEn = async (couleur) => {
    const carte = petraMain();
    assert.ok(carte && estJouable(carte), 'Pétra est jouable dans la main');
    await glisserSurTable(petraContainer, carte);
    const terrain = petraContainer.querySelector('.rpg-terrains--joueur .rpg-terrain[data-card-id="petra"]:not(.is-tapped)');
    assert.ok(terrain, 'la vraie carte Pétra rejoint le rail des terrains');
    assertElementFrame(terrain, 'petra', 'le terrain bicolore Pétra');
    assert.ok(terrain.classList.contains('rpg-card--frame-hybride-braise-sable'),
      'une carte Braise + Sable reçoit le cadre rouge-orange de sa combinaison');
    assert.ok(!terrain.classList.contains('rpg-card--mythique'),
      'Pétra est rare, pas mythique : elle ne prend pas le cadre doré');
    const disponiblesAvant = Number(terrain.dataset.availableCount);
    await act(async () => { terrain.click(); });
    const choix = petraContainer.querySelector('[role="dialog"][aria-label^="Choisir le mana produit par Pétra"]');
    assert.ok(choix, 'un choix accessible de couleur s’ouvre au clic sur Pétra');
    assert.match(choix.textContent, /Braise[\s\S]*Sable/,
      'le menu offre les deux productions de Pétra');
    await act(async () => { choix.querySelector(`.rpg-terrain-mana-choice__option--${couleur}`).click(); });
    assert.equal(petraContainer.querySelector(`.rpg-wizard-plate--joueur .mana--${couleur}`)?.textContent, '1',
      `Pétra ajoute un mana ${couleur}`);
    assert.equal(Number(terrain.dataset.availableCount), disponiblesAvant - 1, 'le choix engage une seule Pétra de la pile');
    assert.ok(Number(terrain.dataset.tappedCount) >= 1, 'la pile indique les Pétra engagées');
    assert.equal(petraContainer.querySelector('.rpg-terrain-mana-choice'), null, 'le sélecteur se referme après le choix');
  };
  await engagerPetraEn('sable');
  await act(async () => { petraContainer.querySelector('.rpg-btn--endturn').click(); });
  await act(async () => { await wait(1800); });
  await passerAnnoncesSorcier(petraContainer);
  await engagerPetraEn('braise');
  await act(async () => { petraRoot.unmount(); });
  petraContainer.remove();

  // ── Fériel : Rapidité puis choix manuel de la cible du Coup rapide ──
  const ferielContainer = document.createElement('div');
  document.body.appendChild(ferielContainer);
  const ferielRoot = createRoot(ferielContainer);
  await act(async () => {
    ferielRoot.render(<RpgDuelPage
      joueurDeck={['desert', 'desert', 'desert', 'montagne', 'feriel']}
      sorcierDeck={['desert', 'desert', 'desert', 'desert', 'chien-du-guet']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(ferielContainer);
  const ferielHand = () => [...ferielContainer.querySelectorAll('button.rpg-hand__card')];
  const poserDesertFeriel = async () => {
    const terrain = ferielHand().find((card) => card.classList.contains('rpg-hand__card--terrain') && estJouable(card));
    assert.ok(terrain, 'un terrain est disponible pour financer Fériel');
    await glisserSurTable(ferielContainer, terrain);
  };
  const finirTourFeriel = async () => {
    await act(async () => { ferielContainer.querySelector('.rpg-btn--endturn').click(); });
    await act(async () => { await wait(1800); });
    await passerAnnoncesSorcier(ferielContainer);
    const resolve = ferielContainer.querySelector('.rpg-btn--resolve-combat');
    if (resolve) await act(async () => { resolve.click(); });
  };
  for (let tour = 1; tour <= 3; tour += 1) {
    await poserDesertFeriel();
    await finirTourFeriel();
  }
  await poserDesertFeriel();
  const ferielEnMain = ferielHand().find((card) => card.dataset.cardId === 'feriel');
  assert.ok(ferielEnMain && estJouable(ferielEnMain), 'Fériel devient payable après quatre terrains');
  assert.ok(ferielEnMain.classList.contains('rpg-card--mythique')
    && ferielEnMain.classList.contains('rpg-card--frame-brillant'),
    'Fériel porte son cadre doré brillant dès la main');
  await glisserSurTable(ferielContainer, ferielEnMain);
  const ferielEnJeu = ferielContainer.querySelector('.rpg-card--equipe[data-card-id="feriel"]');
  assert.ok(ferielEnJeu?.classList.contains('is-pret'), 'Rapidité la rend attaquante dès son tour de pose');
  assert.ok(ferielEnJeu.classList.contains('rpg-card--mythique'),
    'Fériel, mythique, garde son cadre doré sur la table');
  assert.equal(ferielContainer.querySelectorAll('.rpg-card__flames, .rpg-card__flames-tongue, .rpg-card__flames-halo').length, 0,
    'aucune flamme n’est rendue autour des cartes mythiques');
  await act(async () => { ferielEnJeu.click(); });
  const confirmerFeriel = ferielContainer.querySelector('.rpg-btn--confirmer-attaque');
  assert.equal(confirmerFeriel.disabled, true, 'la confirmation attend que la cible du Coup rapide soit choisie');
  assert.ok(ferielContainer.querySelector('.rpg-card--ennemi.is-ciblable'),
    'les cibles légales du Coup rapide s’allument sur la table, sans consigne écrite');
  const chienCibleFeriel = [...ferielContainer.querySelectorAll('.rpg-card--ennemi')]
    .find((card) => card.dataset.cardId === 'chien-du-guet');
  assert.ok(chienCibleFeriel?.classList.contains('is-ciblable'), 'le Chien adverse est présenté comme cible légale');
  await act(async () => { chienCibleFeriel.click(); });
  assert.equal(ferielContainer.querySelector('.rpg-btn--confirmer-attaque').disabled, false,
    'la confirmation s’active après le choix de la cible');
  await act(async () => { ferielContainer.querySelector('.rpg-btn--confirmer-attaque').click(); });
  assert.ok(ferielContainer.querySelector('.rpg-card--equipe[data-card-id="feriel"]'),
    'Fériel reste en jeu car la créature ciblée ne riposte pas');
  assert.equal(ferielContainer.querySelector('.rpg-card--ennemi[data-card-id="chien-du-guet"]'), null,
    'le Coup rapide inflige les 3 dégâts d’attaque et détruit le Chien 2/2');
  assert.match(ferielContainer.querySelector('.rpg-log')?.textContent ?? '',
    /FÉRIEL inflige 3 dégâts à Chien du guet avec Coup rapide/i,
    'le journal du duel annonce le montant et la cible de l’attaque ciblée');
  await act(async () => { ferielRoot.unmount(); });
  ferielContainer.remove();

  // ── Ressac : la créature adverse ciblée repart dans la main du sorcier ──
  const bounceContainer = document.createElement('div');
  document.body.appendChild(bounceContainer);
  const bounceRoot = createRoot(bounceContainer);
  await act(async () => {
    bounceRoot.render(<RpgDuelPage
      joueurDeck={['mer', 'mer', 'ressac', 'desert', 'desert']}
      sorcierDeck={['desert', 'desert', 'desert', 'desert', 'desert', 'desert', 'fennec-des-decombres']}
      rng={() => 0.999}
    />);
  });
  await lancerDepuisMenu(bounceContainer);
  const bounceHand = () => [...bounceContainer.querySelectorAll('button.rpg-hand__card')];
  const mainAdverseCount = () => Number(bounceContainer.querySelector('.rpg-hidden-hand__count')
    ?.textContent.replace(/\D+/g, '') ?? NaN);
  const jouerTerrainBounce = async (name) => {
    const terrain = bounceHand().find((card) => card.getAttribute('aria-label')?.includes(name) && estJouable(card));
    assert.ok(terrain, `${name} doit être jouable`);
    await glisserSurTable(bounceContainer, terrain);
  };
  const finirTourBounce = async () => {
    await act(async () => { bounceContainer.querySelector('.rpg-btn--endturn').click(); });
    await act(async () => { await wait(1800); });
    await passerAnnoncesSorcier(bounceContainer);
    const resoudre = bounceContainer.querySelector('.rpg-btn--resolve-combat');
    if (resoudre) await act(async () => { resoudre.click(); });
  };
  await jouerTerrainBounce('Mer');
  await finirTourBounce();
  await jouerTerrainBounce('Mer');
  await finirTourBounce();
  assert.ok([...bounceContainer.querySelectorAll('.rpg-card--ennemi')]
    .some((card) => card.getAttribute('aria-label')?.includes('Fennec des décombres')),
  'le Fennec adverse est en jeu pour devenir la cible du renvoi');
  const mainAdverseAvant = mainAdverseCount();
  await act(async () => { bounceContainer.querySelector('.rpg-terrain--joueur:not(.is-tapped)').click(); });
  const ressac = bounceHand().find((card) => card.getAttribute('aria-label')?.includes('Ressac'));
  assert.ok(ressac && estJouable(ressac), 'le Ressac est payable avec une Mer engagée');
  await glisserSurTable(bounceContainer, ressac);
  assert.ok(bounceContainer.querySelector('.rpg-card--ennemi.is-ciblable')
    && !bounceContainer.querySelector('.rpg-wizard-plate--ennemi.is-ciblable'),
  'le renvoi allume les créatures adverses comme cibles, sans proposer le sorcier');
  const fennecCible = [...bounceContainer.querySelectorAll('.rpg-card--ennemi')]
    .find((card) => card.getAttribute('aria-label')?.includes('Fennec des décombres'));
  assert.ok(fennecCible?.classList.contains('is-ciblable'), 'la créature adverse devient une cible cliquable');
  await act(async () => { fennecCible.click(); });
  assert.equal([...bounceContainer.querySelectorAll('.rpg-card--ennemi')]
    .find((card) => card.getAttribute('aria-label')?.includes('Fennec des décombres')), undefined,
  'le Fennec quitte la table adverse');
  assert.match(bounceContainer.querySelector('.rpg-spell-played__target')?.textContent ?? '', /Fennec des décombres/,
    'l’annonce du sort nomme la créature renvoyée');
  assert.equal(mainAdverseCount(), mainAdverseAvant + 1,
    'la créature renvoyée rejoint la main cachée du sorcier au lieu du cimetière');
  assert.ok(!bounceHand().some((card) => card.getAttribute('aria-label')?.includes('Ressac')),
    'le Ressac a quitté la main du joueur');
  await act(async () => { bounceRoot.unmount(); });
  bounceContainer.remove();
}
