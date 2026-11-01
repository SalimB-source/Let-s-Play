// Rendu réel du nouveau parcours de création de deck dans jsdom :
// « Nouveau deck » ouvre un seuil à deux portes (assistée / manuelle) ;
// l'assistant s'ouvre sur une **invite de texte** — la demande du joueur est
// lue par l'IA de l'atelier (`rpgDeckIntention.js`), qui pré-remplit les
// couleurs et le style (aggro, contrôle, mix) et génère un deck de 30 cartes
// possédées ; l'atelier manuel est minimaliste (filtres fins repliés,
// recherche / couleurs / Possédées de premier niveau).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_DUEL_CARDS, cardById, cardColors, carteJouableSansTerrain } from '../src/games/rpgCards.js';
import { collectionJoueur } from '../src/games/rpgCollection.js';
import { familleDeCarte } from '../src/games/rpgDeckAuto.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const texte = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
const bouton = (racine, contenu) => [...racine.querySelectorAll('.rpg-menu-button')]
  .find((element) => texte(element).includes(contenu));

/** Écrit dans un champ React : la valeur passe par le setter natif, puis l'événement. */
async function ecrire(assert, champ, valeur) {
  assert.ok(champ, 'le champ à remplir existe');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  await act(async () => {
    setter.call(champ, valeur);
    champ.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await wait(30);
}

async function monter(assert) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<RpgDuelPage rng={() => 0.999} />);
  });
  const settle = async () => {
    for (let i = 0; i < 4; i += 1) {
      await act(async () => { });
      await wait(30);
    }
  };
  const click = async (element, hint = '?') => {
    assert.ok(element, `l’élément attendu existe (${hint})`);
    await act(async () => { element.click(); });
    await settle();
  };
  return {
    container,
    settle,
    click,
    onglet: (label) => [...container.querySelectorAll('.rpg-mode-menu__switch button')]
      .find((bouton) => bouton.textContent.includes(label)),
    demonter: async () => {
      await act(async () => { root.unmount(); });
      container.remove();
    },
  };
}

export async function checkRpgDeckCreation(assert) {
  window.localStorage.clear();
  const page = await monter(assert);
  const { container, click } = page;

  await click(page.onglet('Deck'), 'onglet Deck');

  // ── 1. La crate « Nouveau deck » mène au seuil à deux portes ───────────────
  await click(container.querySelector('.rpg-deck-choice--neuf'), 'ouvrir la création');
  const seuil = container.querySelector('.rpg-creation');
  assert.ok(seuil, 'le seuil de création remplace l’étagère');
  assert.ok(!container.querySelector('.rpg-atelier'), 'l’atelier manuel n’est pas encore ouvert');
  assert.ok(!container.querySelector('.rpg-assistant'), 'l’assistant n’est pas encore ouvert');
  const portes = [...container.querySelectorAll('.rpg-creation__carte')];
  assert.equal(portes.length, 2, 'deux portes : assistée et manuelle');
  assert.match(texte(portes[0]), /Création assistée/, 'la première porte est la création assistée');
  assert.match(texte(portes[1]), /Création manuelle/, 'la seconde porte est la création manuelle');

  // ── 2. La porte manuelle ouvre l'atelier minimaliste ───────────────────────
  await click(container.querySelector('.rpg-creation__carte--manuel'), 'création manuelle');
  assert.ok(container.querySelector('.rpg-atelier'), 'l’atelier manuel s’ouvre');
  assert.ok(!container.querySelector('.rpg-creation'), 'le seuil est refermé');
  assert.match(texte(container.querySelector('.rpg-atelier__state')), /0 \/ 30 cartes/, 'le compteur démarre à zéro');
  assert.equal(container.querySelectorAll('.rpg-atelier__carte').length, RPG_DUEL_CARDS.length,
    'la bibliothèque montre tout le catalogue, verrouillées comprises');
  assert.ok(container.querySelectorAll('.rpg-atelier__carte.is-locked').length > 0, 'les cartes hors collection sont verrouillées');
  // Les filtres fins sont repliés par défaut : seul le premier niveau reste visible.
  assert.equal(container.querySelector('.rpg-atelier__filtres-avances'), null,
    'les filtres avancés (coût, type, rareté) sont repliés à l’ouverture');
  const boutonFiltres = container.querySelector('.rpg-atelier__toggle--filtres');
  assert.equal(boutonFiltres.getAttribute('aria-expanded'), 'false', 'le bouton Filtres annonce son état replié');

  // Ajout / retrait d'une carte possédée.
  const carteChien = container.querySelector('.rpg-atelier__carte[data-card-id="chien-du-guet"]');
  assert.ok(carteChien && !carteChien.classList.contains('is-locked'), 'le Chien du guet est une carte de la dotation');
  await click(carteChien.querySelector('.rpg-atelier__carte-ajout'), 'ajouter Chien du guet');
  assert.match(texte(container.querySelector('.rpg-atelier__state')), /1 \/ 30 cartes/, 'le compteur suit l’ajout');
  const ligneChien = container.querySelector('.rpg-atelier__ligne[data-card-id="chien-du-guet"]');
  assert.ok(ligneChien, 'la carte apparaît dans la liste du deck');
  await click(ligneChien.querySelector('.rpg-atelier__ligne-compte button'), 'retirer Chien du guet');
  assert.match(texte(container.querySelector('.rpg-atelier__state')), /0 \/ 30 cartes/, 'le compteur suit le retrait');

  // Les filtres de premier niveau : couleurs et « Possédées ».
  const possedees = [...container.querySelectorAll('.rpg-atelier__toolbar--simple .rpg-atelier__toggle')]
    .find((bouton) => texte(bouton) === 'Possédées');
  await click(possedees, 'basculer Possédées');
  assert.equal(container.querySelectorAll('.rpg-atelier__carte.is-locked').length, 0,
    '« Possédées » masque les cartes verrouillées');
  await click(possedees, 'revenir à toutes les cartes');

  // Les filtres avancés se déploient sur demande et filtrent la grille.
  await click(boutonFiltres, 'déplier les filtres avancés');
  assert.equal(boutonFiltres.getAttribute('aria-expanded'), 'true', 'le bouton Filtres annonce son état déplié');
  const cout2 = [...container.querySelectorAll('.rpg-atelier__toggle--cout')].find((b) => texte(b) === '2');
  await click(cout2, 'filtrer au coût 2');
  assert.ok(container.querySelectorAll('.rpg-atelier__carte').length > 0, 'des cartes de coût 2 restent affichées');
  assert.ok([...container.querySelectorAll('.rpg-atelier__carte')]
    .every((li) => Number(li.querySelector('.rpg-atelier__cout b')?.textContent) === 2),
    'la grille ne montre que des cartes de coût 2');

  // Le vidage demande deux clics.
  await click(carteChien.querySelector('.rpg-atelier__carte-ajout'), 'rajouter Chien du guet');
  const vider = [...container.querySelectorAll('.rpg-atelier__outil')].find((b) => texte(b).includes('Vider'));
  await click(vider, 'Vider (premier clic)');
  assert.match(texte(container.querySelector('.rpg-atelier__state')), /1 \/ 30 cartes/, 'le premier clic ne vide pas');
  await click([...container.querySelectorAll('.rpg-atelier__outil')].find((b) => texte(b).includes('confirmer')), 'Vider (confirmation)');
  assert.match(texte(container.querySelector('.rpg-atelier__state')), /0 \/ 30 cartes/, 'le deck est vide');

  // Retour au seuil, puis à l'étagère.
  await click([...container.querySelectorAll('.rpg-menu-link')].find((b) => texte(b).includes('Fermer')), 'fermer l’atelier');
  assert.ok(!container.querySelector('.rpg-atelier'), 'l’atelier est refermé');
  assert.ok(container.querySelector('.rpg-deck-catalog--closed'), 'retour sur l’étagère');

  // ── 3. La porte assistée : l'invite de texte, puis couleurs et style ───────
  await click(container.querySelector('.rpg-deck-choice--neuf'), 'rouvrir la création');
  await click(container.querySelector('.rpg-creation__carte--assiste'), 'création assistée');
  const assistant = container.querySelector('.rpg-assistant');
  assert.ok(assistant, 'l’assistant remplace le seuil');
  assert.equal(assistant.querySelectorAll('.rpg-assistant__fil li').length, 3,
    'trois étapes : l’idée dictée, puis les couleurs, puis le style');

  // Étape 1 : l'invite de texte — l'IA lit la demande avant de composer.
  const invite = assistant.querySelector('#rpg-assistant-demande');
  assert.ok(invite && invite.tagName === 'TEXTAREA', 'l’assistant s’ouvre sur une invite de texte');
  const interroger = assistant.querySelector('.rpg-assistant__actions .rpg-menu-button--primary');
  assert.match(texte(interroger), /Interroger l’IA/, 'le premier geste est la lecture de la demande');
  assert.equal(interroger.disabled, true, 'rien à lire tant que la demande est vide');
  const exemples = [...assistant.querySelectorAll('.rpg-assistant__exemple')];
  assert.ok(exemples.length >= 3, 'des demandes d’exemple sont proposées');
  await click(exemples[0], 'reprendre un exemple');
  assert.ok(invite.value.length > 10, 'l’exemple remplit l’invite');
  await ecrire(assert, invite, 'un deck amazigh du désert, très rapide, avec des armes');
  assert.equal(interroger.disabled, false, 'la demande écrite débloque la lecture');
  await click(interroger, 'interroger l’IA');

  // La lecture est montrée avant toute génération : couleurs, thème, style, familles.
  const lecture = assistant.querySelector('.rpg-assistant__lecture');
  assert.ok(lecture, 'l’assistant montre ce qu’il a compris');
  const puces = [...lecture.querySelectorAll('.rpg-assistant__puce')].map(texte);
  assert.ok(puces.some((puce) => puce.includes('Sable')), 'la couleur dite est reconnue');
  assert.ok(puces.some((puce) => puce.includes('Amazighs')), 'le thème amazigh est reconnu');
  assert.ok(puces.some((puce) => puce.includes('Aggro')), '« très rapide » est lu comme un plan aggro');
  assert.ok(puces.some((puce) => puce.includes('armes')), 'les armes demandées sont retenues');
  assert.ok(!assistant.querySelector('.rpg-atelier'), 'rien n’est généré avant que le joueur le demande');

  // « Ajuster » mène aux couleurs et au style, déjà remplis par la lecture.
  await click(bouton(assistant, 'Ajuster'), 'ajuster la lecture');
  const pipSable = [...assistant.querySelectorAll('.rpg-assistant__couleur')]
    .find((element) => element.getAttribute('aria-label') === 'Couleur Sable');
  assert.equal(pipSable.getAttribute('aria-pressed'), 'true', 'la couleur lue est pré-retenue');
  await click(assistant.querySelector('.rpg-assistant__actions .rpg-menu-button--primary'),
    'passer à l’étape du style');

  // Étape 3 : le style de jeu, pré-rempli mais retouchable.
  const styles = [...assistant.querySelectorAll('.rpg-assistant__style')];
  assert.equal(styles.length, 3, 'trois styles proposés');
  assert.deepEqual(styles.map((element) => texte(element.querySelector('strong'))), ['Aggro', 'Contrôle', 'Mix'],
    'les styles sont Aggro, Contrôle, Mix');
  assert.equal(styles[0].getAttribute('aria-pressed'), 'true', 'le style lu (Aggro) est pré-sélectionné');
  assert.match(texte(assistant), /Demande lue/, 'le rappel de la demande suit jusqu’au style');
  const generer = assistant.querySelector('.rpg-assistant__actions .rpg-menu-button--primary');
  assert.equal(generer.disabled, false, 'le bouton Générer est prêt');
  await click(generer, 'générer le deck');

  // Le deck généré atterrit dans l'atelier manuel, prêt à jouer et retouchable.
  assert.ok(!container.querySelector('.rpg-assistant'), 'l’assistant se referme sur la génération');
  assert.ok(container.querySelector('.rpg-atelier'), 'l’atelier manuel reçoit le deck généré');
  assert.match(texte(container.querySelector('.rpg-atelier__state')), /30 \/ 30 cartes/, 'le deck généré est complet');
  assert.match(texte(container.querySelector('.rpg-atelier__verdict')), /prêt à jouer/, 'le verdict est vert');
  const idsGeneres = [...container.querySelectorAll('.rpg-atelier__ligne')]
    .map((ligne) => ligne.dataset.cardId);
  const collection = new Set(collectionJoueur());
  assert.ok(idsGeneres.every((id) => collection.has(id)), 'toutes les cartes générées sont possédées');
  assert.ok(idsGeneres.every((id) => cardColors(cardById(id)).every((c) => c === 'sable')),
    'le deck respecte l’identité Sable');
  assert.ok(idsGeneres.some((id) => familleDeCarte(cardById(id)) === 'arme'),
    'les armes demandées dans la phrase sont bien dans le deck');

  // ── 4. L'enregistrement passe par le nommage puis rejoint l'étagère ────────
  await click(container.querySelector('.rpg-atelier__actions .rpg-menu-button--primary'), 'enregistrer');
  const nommage = container.querySelector('.rpg-atelier__nommage');
  assert.ok(nommage, 'l’enregistrement propose d’abord de nommer le deck');
  const champ = nommage.querySelector('input[type="text"]');
  assert.ok(champ.value.length > 0, 'le champ est prérempli d’une proposition');
  await click(nommage.querySelector('.rpg-menu-button--primary'), 'confirmer l’enregistrement');
  assert.ok(!container.querySelector('.rpg-atelier'), 'l’atelier se referme après enregistrement');
  const casier = JSON.parse(window.localStorage.getItem('letsplay_sablier_decks_maison_v1'));
  assert.equal(casier.decks.length, 1, 'le deck est bien dans le casier maison');
  assert.equal(casier.decks[0].cardIds.length, 30, 'avec ses 30 cartes');

  await page.demonter();

  // ── 5. Annuler l'assistant ramène au seuil, pas à l'étagère ───────────────
  window.localStorage.clear();
  const reprise = await monter(assert);
  await reprise.click(reprise.onglet('Deck'), 'onglet Deck');
  await reprise.click(reprise.container.querySelector('.rpg-deck-choice--neuf'), 'rouvrir la création');
  await reprise.click(reprise.container.querySelector('.rpg-creation__carte--assiste'), 'création assistée');
  assert.ok(reprise.container.querySelector('.rpg-assistant'), 'l’assistant est ouvert');
  await reprise.click(reprise.container.querySelector('.rpg-assistant .rpg-menu-link'), 'annuler l’assistant');
  assert.ok(reprise.container.querySelector('.rpg-creation'), 'l’annulation ramène au seuil de création');
  assert.ok(!reprise.container.querySelector('.rpg-assistant'), 'l’assistant est refermé');
  await reprise.click([...reprise.container.querySelectorAll('.rpg-menu-link')]
    .find((b) => texte(b).includes('étagère')), 'retour à l’étagère');
  assert.ok(reprise.container.querySelector('.rpg-deck-catalog--closed'), 'le seuil renvoie bien à l’étagère');
  await reprise.demonter();

  // ── 6. Une couleur sans carte possédée prévient et produit un brouillon ─────────────────────
  const manque = await monter(assert);
  await manque.click(manque.onglet('Deck'), 'onglet Deck (collection juste)');
  await manque.click(manque.container.querySelector('.rpg-deck-choice--neuf'), 'ouvrir la création');
  await manque.click(manque.container.querySelector('.rpg-creation__carte--assiste'), 'création assistée');
  const assistantManque = manque.container.querySelector('.rpg-assistant');
  // L'invite peut être passée : le parcours couleurs → style reste entier.
  await manque.click(bouton(assistantManque, 'Choisir moi-même'), 'ignorer l’invite de texte');
  assert.ok(!assistantManque.querySelector('.rpg-assistant__lecture'),
    'sans demande, aucune lecture n’est affichée');
  const pipTenebres = [...assistantManque.querySelectorAll('.rpg-assistant__couleur')]
    .find((element) => element.getAttribute('aria-label') === 'Couleur Ténèbres');
  await manque.click(pipTenebres, 'choisir les Ténèbres (aucune carte possédée au départ)');
  await manque.click(assistantManque.querySelector('.rpg-assistant__actions .rpg-menu-button--primary'), 'continuer');
  const alerte = assistantManque.querySelector('.rpg-assistant__message--alerte');
  assert.ok(alerte && /brouillon incomplet/.test(texte(alerte)), 'le jeu prévient que la collection ne suffit pas');
  await manque.click([...assistantManque.querySelectorAll('.rpg-assistant__style')]
    .find((bouton) => texte(bouton).includes('Mix')), 'choisir le style Mix');
  await manque.click(assistantManque.querySelector('.rpg-assistant__actions .rpg-menu-button--primary'), 'générer quand même');
  assert.ok(manque.container.querySelector('.rpg-atelier'), 'l’atelier s’ouvre même sans deck complet');
  assert.match(texte(manque.container.querySelector('.rpg-atelier__verdict')), /invalide|30|carte/,
    'le verdict annonce honnêtement un deck non jouable');
  await manque.demonter();

  // ── 7. Générer droit depuis l'invite : la lecture suffit ───────────────────
  const dictee = await monter(assert);
  await dictee.click(dictee.onglet('Deck'), 'onglet Deck (génération directe)');
  await dictee.click(dictee.container.querySelector('.rpg-deck-choice--neuf'), 'ouvrir la création');
  await dictee.click(dictee.container.querySelector('.rpg-creation__carte--assiste'), 'création assistée');
  const assistantDictee = dictee.container.querySelector('.rpg-assistant');
  await ecrire(assert, assistantDictee.querySelector('#rpg-assistant-demande'),
    'un deck du désert, rapide, avec des armes et des sorts');
  await dictee.click(assistantDictee.querySelector('.rpg-assistant__actions .rpg-menu-button--primary'),
    'interroger l’IA');
  assert.ok(assistantDictee.querySelector('.rpg-assistant__lecture'), 'la demande est lue');
  await dictee.click(assistantDictee.querySelector('.rpg-assistant__actions .rpg-menu-button--primary'),
    'générer directement depuis l’invite');
  assert.ok(!dictee.container.querySelector('.rpg-assistant'), 'l’assistant se referme');
  assert.match(texte(dictee.container.querySelector('.rpg-atelier__state')), /30 \/ 30 cartes/,
    'le deck dicté est complet sans passer par les étapes');
  await dictee.demonter();

  // Garde-fou : le catalogue réel permet de générer les trois styles en Sable.
  const jeu = RPG_DUEL_CARDS.filter((carte) => carteJouableSansTerrain(carte)
    && collectionJoueur().includes(carte.id)
    && cardColors(carte).every((couleur) => couleur === 'sable'));
  assert.ok(jeu.length >= 15, 'la dotation Sable offre assez de références pour générer un deck');
}
