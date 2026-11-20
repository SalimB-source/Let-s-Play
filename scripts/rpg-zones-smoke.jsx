// La zone d'un sort de masse, jouée dans la vraie page : le clic sur la carte
// ouvre la désignation, les cases du champ s'allument en bleu (relief), le clic
// pose l'ancre — les cases de la zone passent en bleu plein —, et « Lancer »
// fait partir le sort avec SA zone. Le bandeau dit la zone en toutes lettres.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage from '../src/games/RpgDuelPage.jsx';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgJouerCreature } from '../src/games/rpgDuel.js';
import { installerDeckMaisonDeTest, lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

// Le deck de la leçon d'avancée : trente cartes jouables, un duel qui démarre
// sans histoire. Les sorts de zone, eux, entrent en main à la main — c'est la
// désignation qu'on éprouve ici, pas la composition d'un deck.
const DECK = ['tercio-de-cuivre', 'pilote-de-la-carreira', 'le-renegat', 'negociant-des-ranscons',
  'galion-de-la-flotte', 'le-routier', 'le-grand-debarquement', 'haut-fond',
  'vipere-de-verre', 'lettre-de-marque', 'grappin-d-abordage', 'baton-des-citernes',
  'cotre-de-course', 'tislit-des-aures', 'mousse-des-galiotes'].flatMap((id) => [id, id]);

export async function checkZones(assert) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  installerDeckMaisonDeTest(DECK);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const attendre = async () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 120)); });
  const click = async (el, message = 'la commande existe') => {
    assert.ok(el, message);
    assert.notEqual(el.disabled, true, message);
    await act(async () => el.click());
    await attendre();
  };
  try {
    await act(async () => root.render(<RpgDuelPage joueurDeck={DECK} sorcierDeck={DECK} rng={() => 0.9} />));
    await attendre();
    await lancerDuelDepuisMenu(container, click);
    await attendre();
    await passerMulligan(container, click);
    await attendre();

    const duel = window.__RPG_DUEL__;
    assert.ok(duel, 'le duel est monté');
    assert.equal(duel.lignes, true, 'la page joue sur les deux lignes');
    for (const cote of ['joueur', 'sorcier']) duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
    duel.sorcier.main = [];
    duel.joueur.main = [];
    const poser = (cote, id) => {
      duel[cote].invocationNormaleJouee = false;
      duel[cote].main.push(id);
      const tour = duel.tour;
      duel.tour = cote;
      const res = rpgJouerCreature(duel, cote, id);
      duel.tour = tour;
      assert.ok(res.ok, `${id} doit entrer en jeu : ${res.raison}`);
      res.entite.pv = res.entite.pvMax = res.entite.def = 10;
      res.entite.ready = false;
      return res.entite;
    };
    const proie = poser('sorcier', 'novice-des-cendres');
    poser('joueur', 'novice-des-cendres');
    duel.joueur.main = ['tempete-de-sable'];
    await act(async () => window.__RPG_FORCE__());
    await attendre();

    // 1. Le clic sur la carte ouvre la désignation — rien ne part encore.
    const carteEnMain = container.querySelector('.rpg-hand__card[data-card-id="tempete-de-sable"]')
      ?? [...container.querySelectorAll('button.rpg-hand__card')]
        .find((carte) => carte.getAttribute('aria-label')?.includes('Tempête de sable'));
    await click(carteEnMain, 'la Tempête de sable est en main');
    const bandeau = container.querySelector('.rpg-zone-sort');
    assert.ok(bandeau, 'le bandeau de zone s’ouvre');
    assert.match(bandeau.textContent, /Tempête de sable/);
    assert.match(bandeau.textContent, /touchez une case/i, 'la zone n’est pas encore posée');
    assert.ok(duel.joueur.main.includes('tempete-de-sable'), 'la carte n’a pas quitté la main');
    const cases = [...container.querySelectorAll('.rpg-creature-slot--zone-sort')];
    assert.ok(cases.length >= 10, `les cases du champ s’allument en bleu : ${cases.length}`);
    // La table porte l'état de désignation : c'est lui qui fait passer le
    // calque des cases devant les cartes et rend les pointeurs aux cases
    // (voir `tests/rpg-zones-ui-css.test.js` — sans ça, le clic n'atteint
    // jamais l'ancre et le sort ne part pas).
    const table = container.querySelector('.card-table');
    assert.equal(table.classList.contains('is-choix-zone'), true, 'la table signale la zone');
    assert.equal(cases.every((c) => c.tagName === 'BUTTON' && !c.disabled), true,
      'chaque case de zone est un bouton actif');

    // 2. Le clic sur une case du front adverse pose l'ancre : cinq cases bleues.
    const caseFront = container.querySelector('.card-row--ennemi .rpg-creature-slot--zone-sort[data-case-index="0"]');
    assert.ok(caseFront, 'la case du front adverse est une ancre');
    await click(caseFront);
    const allumees = [...container.querySelectorAll('.rpg-creature-slot--zone-sort.is-dans-zone-sort')];
    assert.equal(allumees.length, 5, 'la rangée du front adverse compte cinq cases');
    const libelle = container.querySelector('.rpg-zone-sort__libelle');
    assert.match(libelle.textContent, /rangée/, libelle.textContent);
    assert.match(libelle.textContent, /front/, libelle.textContent);
    assert.match(libelle.textContent, /camp adverse/, libelle.textContent);
    assert.equal(duel.joueur.main.includes('tempete-de-sable'), true, 'rien ne part sans validation');

    // 3. « Lancer » fait partir le sort, avec sa zone, et le journal la nomme.
    await click(container.querySelector('.rpg-zone-sort__valider'), 'le bouton Lancer existe');
    assert.equal(container.querySelector('.card-table').classList.contains('is-choix-zone'), false,
      'la table quitte l’état de zone après le lancement');
    assert.equal(duel.joueur.main.includes('tempete-de-sable'), false, 'la carte a quitté la main');
    assert.equal(container.querySelector('.rpg-zone-sort'), null, 'le bandeau se referme');
    assert.ok(duel.log.some((ligne) => /Tempête de sable couvre la rangée du front du camp adverse/.test(ligne)),
      duel.log.slice(-4).join(' | '));
    assert.equal(proie.pv, 7, 'la créature du front adverse encaisse les trois dégâts');

    // 3 bis. Sans ancre, « Lancer » reste possible : le moteur couvre la zone
    // la plus rentable, et le journal dit laquelle. C'est le filet de sécurité
    // du joueur qui valide sans avoir touché le champ.
    duel.joueur.main = ['verglas'];
    await act(async () => window.__RPG_FORCE__());
    await attendre();
    const verglas = [...container.querySelectorAll('button.rpg-hand__card')]
      .find((carte) => carte.getAttribute('aria-label')?.includes('Verglas'));
    assert.ok(verglas, 'le Verglas est en main');
    await click(verglas);
    const libre = container.querySelector('.rpg-zone-sort__valider');
    assert.ok(libre, 'Lancer est offert même sans ancre');
    assert.match(container.querySelector('.rpg-zone-sort__libelle').textContent, /meilleur endroit/);
    await click(libre);
    assert.equal(duel.joueur.main.includes('verglas'), false, 'la carte part sans ancre posée');
    assert.ok(duel.log.some((ligne) => /Verglas couvre /.test(ligne)),
      duel.log.slice(-3).join(' | '));
    assert.equal(container.querySelector('.rpg-zone-sort'), null);

    // 4. « Renoncer » referme la désignation sans rien dépenser.
    duel.joueur.main = ['vent-rouge'];
    await act(async () => window.__RPG_FORCE__());
    await attendre();
    const rouge = [...container.querySelectorAll('button.rpg-hand__card')]
      .find((carte) => carte.getAttribute('aria-label')?.includes('Vent rouge'));
    assert.ok(rouge, 'le Vent rouge est en main');
    await click(rouge);
    assert.ok(container.querySelector('.rpg-zone-sort'), 'le bandeau s’ouvre pour une colonne');
    await click(container.querySelector('.rpg-zone-sort__annuler'), 'le bouton Renoncer existe');
    assert.equal(container.querySelector('.rpg-zone-sort'), null, 'la désignation se referme');
    assert.equal(duel.joueur.main.includes('vent-rouge'), true, 'Renoncer rend la carte à la main');
  } finally {
    root.unmount();
    container.remove();
  }
}
