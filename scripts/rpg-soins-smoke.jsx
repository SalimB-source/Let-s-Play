// Les soins du Sablier rendus dans jsdom. Un gain de vie réel s'entend et se
// voit : la plaque du sorcier soigné s'illumine (halo, voile, motes), son
// « +N » monte du chiffre des PV, les bords de la table verdissent et la zone
// d'état le dit. Une créature soignée porte le même éclat, son « +N » au cœur
// de la carte. Un soin ne se plafonne plus à 25 : il monte toujours, et la
// réserve de vie s'ouvre.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RpgDuelPage, { TableCard } from '../src/games/RpgDuelPage.jsx';
import { RpgAudioPlayer } from '../src/games/rpgAudio.js';
import { RPG_PV_JOUEUR } from '../src/games/rpgDuel.js';
import { RPG_SOIN_DUREE } from '../src/games/rpgSoins.js';
import { lancerDuelDepuisMenu, passerMulligan } from './rpg-duel-start.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Le paquet se pioche par la fin de la liste : la main de départ réunit quatre
// Mers et la Porteuse de cruches (arrivée : soin 3), et la première pioche
// apporte l'Eau de la source (Sorcellerie, soin 4).
const DECK_JOUEUR = ['mer', 'mer', 'mer', 'mer', 'eau-de-la-source', 'porteuse-de-cruches', 'mer', 'mer', 'mer', 'mer'];
// Le sorcier tient un Trait de braise (3 dégâts), lancé dès sa seconde Montagne.
const DECK_SORCIER = [...Array(9).fill('montagne'), 'trait-de-braise'];

function creerTransfert() {
  const values = new Map();
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    types: [],
    setData(type, value) { values.set(type, value); this.types = [...values.keys()]; },
    getData(type) { return values.get(type) ?? ''; },
  };
}

function envoyerEvenementGlisser(target, type, dataTransfer) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(event);
}

async function scenarioDuel(assert, sons) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const cliquer = async (element, message = 'la commande existe') => {
    assert.ok(element, message);
    await act(async () => { element.click(); });
  };
  const attendre = async (condition, message, maxMs = 4000) => {
    for (let ecoule = 0; ecoule <= maxMs; ecoule += 50) {
      if (condition()) return;
      await act(async () => { await wait(50); });
    }
    assert.fail(message);
  };
  const main = () => [...container.querySelectorAll('button.rpg-hand__card')];
  const carteEnMain = (nom) => main().find((carte) => carte.getAttribute('aria-label')?.includes(nom));
  const estJouable = (carte) => carte?.getAttribute('data-jouable') === 'true';
  const plaqueJoueur = () => container.querySelector('.rpg-wizard-plate--joueur');
  const plaqueSorcier = () => container.querySelector('.rpg-wizard-plate--ennemi');
  const pvJoueur = () => Number(plaqueJoueur()?.querySelector('.rpg-wizard-plate__hp-value')?.textContent.trim());
  const zonesEtat = () => [...container.querySelectorAll('.card-table > [role="status"].sr-only')];
  const glisserSurTable = async (carte) => {
    const dataTransfer = creerTransfert();
    const table = container.querySelector('.card-table');
    assert.equal(carte?.getAttribute('draggable'), 'true', 'une carte jouable doit pouvoir être glissée');
    await act(async () => {
      envoyerEvenementGlisser(carte, 'dragstart', dataTransfer);
      envoyerEvenementGlisser(table, 'dragover', dataTransfer);
      envoyerEvenementGlisser(table, 'drop', dataTransfer);
      envoyerEvenementGlisser(carte, 'dragend', dataTransfer);
    });
  };
  const jouerUneMer = async () => {
    const mer = main().find((carte) => carte.classList.contains('rpg-hand__card--terrain') && estJouable(carte));
    assert.ok(mer, 'une Mer est prête à être posée');
    await glisserSurTable(mer);
    await act(async () => { await wait(800); });
  };
  const passerTourSorcier = async () => {
    await cliquer(container.querySelector('.rpg-btn--endturn'), 'le joueur peut finir son tour');
    await act(async () => { await wait(900); });
    for (let essai = 0; essai < 12; essai += 1) {
      const laisser = [...container.querySelectorAll('.rpg-annonce-sort button')]
        .find((bouton) => bouton.textContent.includes('Laisser passer'));
      if (laisser) {
        await cliquer(laisser);
        await act(async () => { await wait(1100); });
        continue;
      }
      const finTour = container.querySelector('.rpg-fin-tour button');
      if (finTour) {
        await cliquer(finTour);
        await act(async () => { await wait(300); });
        continue;
      }
      if (container.querySelector('.rpg-btn--endturn:not(:disabled)')) break;
      await act(async () => { await wait(300); });
    }
  };

  try {
    await act(async () => {
      root.render(<RpgDuelPage joueurDeck={DECK_JOUEUR} sorcierDeck={DECK_SORCIER} rng={() => 0.999} />);
    });
    assert.ok(await lancerDuelDepuisMenu(container, (element) => cliquer(element, 'le menu mène au duel')),
      'l’onglet Deck lance le duel');
    await passerMulligan(container, cliquer);
    await act(async () => { await wait(120); });

    // ── 0. Au départ, rien ne brille ─────────────────────────────────────────
    assert.equal(pvJoueur(), RPG_PV_JOUEUR, 'le joueur commence à pleine vie');
    assert.equal(plaqueJoueur()?.querySelector('.rpg-wizard-plate__hp-max'), null,
      'à 25 PV, la plaque n’affiche aucun maximum : il n’y a pas encore de réserve');
    assert.equal(container.querySelector('.is-healing, .rpg-soin, .rpg-soin-ecran'), null,
      'aucun éclat de soin sur une table neuve');
    assert.equal(zonesEtat().length, 1, 'la table porte une zone d’état (lecteurs d’écran) pour les soins');
    assert.equal(zonesEtat()[0].getAttribute('aria-live'), 'polite', 'les soins s’annoncent poliment');
    assert.equal(zonesEtat()[0].textContent, '', 'la zone d’état des soins reste vide sans soin');

    // ── 1. Deux tours de Mers ; le Trait de braise du sorcier ôte 3 PV ──────
    await jouerUneMer();
    await passerTourSorcier();
    await jouerUneMer();
    assert.ok(carteEnMain('Eau de la source'), 'la première pioche apporte l’Eau de la source');
    await passerTourSorcier();
    await attendre(() => pvJoueur() === RPG_PV_JOUEUR - 3, 'le Trait de braise du sorcier retire 3 PV au joueur', 6000);
    assert.equal(container.querySelector('.is-healing'), null, 'des dégâts ne passent jamais pour un soin');
    assert.ok(!sons.includes('soin_vie') && !sons.includes('soin_vie_adverse'), 'aucun son de soin avant le premier soin');

    // ── 2. L'Eau de la source rend 4 PV — la vie passe au-dessus de 25 ──────
    await jouerUneMer();
    const eau = carteEnMain('Eau de la source');
    await attendre(() => estJouable(carteEnMain('Eau de la source')), 'l’Eau de la source devient jouable au tour du joueur');
    sons.length = 0;
    await glisserSurTable(eau);
    await attendre(() => plaqueJoueur()?.classList.contains('is-healing'), 'la plaque du joueur s’illumine quand ses PV remontent');
    assert.equal(pvJoueur(), RPG_PV_JOUEUR + 1, 'le soin n’est plus plafonné (22 + 4 → 26)');
    const plaque = plaqueJoueur();
    assert.match(plaque.className, /\bis-healing--[ab]\b/, 'la plaque porte la variante qui rejoue le battement du chiffre');
    assert.equal(plaque.dataset.soin, '4', 'la plaque note le vrai gain (4)');
    assert.equal(plaque.querySelector('.rpg-wizard-plate__pv .rpg-soin-montant')?.textContent, '+4',
      'le « +4 » monte du chiffre des PV');
    const eclat = plaque.querySelector(':scope > .rpg-soin.rpg-soin--plaque');
    assert.ok(eclat, 'l’éclat du soin se pose par-dessus la plaque');
    assert.equal(eclat.getAttribute('aria-hidden'), 'true', 'l’éclat est décoratif');
    assert.ok(eclat.querySelector('.rpg-soin__halo') && eclat.querySelector('.rpg-soin__voile'),
      'l’éclat réunit le halo et le voile de lumière');
    assert.equal(eclat.querySelectorAll('.rpg-soin__mote').length, 7, 'sept motes de lumière s’élèvent');
    assert.equal(eclat.querySelectorAll('.rpg-soin__mote--croix').length, 3, 'dont trois petites croix, signe du soin');
    assert.ok(container.querySelector('.card-table > .rpg-soin-ecran'),
      'les bords de la table verdissent quand ce sont VOS PV qui remontent');
    assert.match(zonesEtat()[0].textContent, /Vous regagnez 4 PV/, 'la zone d’état dit le soin aux lecteurs d’écran');
    assert.equal(plaqueSorcier()?.classList.contains('is-healing'), false, 'la plaque adverse reste éteinte');
    assert.ok(sons.includes('soin_vie'), 'le soin du joueur se fait entendre (soin_vie)');
    assert.equal(sons.filter((nom) => nom === 'soin_vie').length, 1, 'un seul carillon pour un seul soin');
    assert.ok(!sons.includes('soin_long'), 'le sort ne rejoue plus l’ancien son de soin par-dessus le carillon');
    assert.ok(sons.includes('water_wave'), 'une magie d’Eau garde son bruit de vague au lancement');

    // ── 3. L'éclat s'éteint de lui-même ─────────────────────────────────────
    await act(async () => { await wait(RPG_SOIN_DUREE + 150); });
    assert.equal(plaqueJoueur().classList.contains('is-healing'), false, 'la plaque redevient normale après l’éclat');
    assert.equal(container.querySelector('.rpg-soin, .rpg-soin-montant, .rpg-soin-ecran'), null,
      'halo, « +N » et voile d’écran quittent la table');
    assert.equal(zonesEtat()[0].textContent, '', 'la zone d’état se vide une fois le soin passé');

    // ── 4. À pleine vie, la Porteuse ouvre la réserve : la vie dépasse 25 ────
    const porteuse = carteEnMain('Porteuse de cruches');
    assert.ok(estJouable(porteuse), 'la Porteuse de cruches est jouable avec les deux Mers restantes');
    sons.length = 0;
    await glisserSurTable(porteuse);
    await attendre(() => container.querySelector('.rpg-card--equipe[data-card-id="porteuse-de-cruches"]'),
      'la Porteuse arrive sur la table');
    await act(async () => { await wait(400); });
    assert.equal(pvJoueur(), RPG_PV_JOUEUR + 4, 'pleine vie, la Porteuse (+3) fait grimper la vie : 26 → 29');
    assert.equal(plaqueJoueur().dataset.soin, '3', 'la plaque note le gain de la Porteuse');
    assert.equal(plaqueJoueur().querySelector('.rpg-wizard-plate__hp-max')?.textContent, '/29',
      'la plaque annonce le maximum : la réserve se lit');
    assert.ok(sons.includes('soin_vie'), 'le soin se fait entendre comme les autres');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

async function scenarioCarte(assert) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const entite = {
    id: 'entite-soin',
    carteId: 'chien-du-guet',
    name: 'Chien du guet',
    atk: 2,
    def: 2,
    pv: 2,
    pvMax: 2,
    ready: true,
    attaquee: false,
  };
  try {
    await act(async () => root.render(
      <div>
        <TableCard entite={entite} cote="joueur" tilt={0} soin={{ montant: 2, token: 3 }} />
        <TableCard entite={{ ...entite, id: 'entite-calme' }} cote="joueur" tilt={0} />
      </div>,
    ));
    const soignee = container.querySelector('[data-entity-id="entite-soin"]');
    const calme = container.querySelector('[data-entity-id="entite-calme"]');
    assert.ok(soignee.classList.contains('is-healing') && soignee.classList.contains('is-healing--a'),
      'la créature soignée porte l’état is-healing et sa variante');
    assert.equal(soignee.dataset.soin, '2', 'la créature note son gain');
    const eclat = soignee.querySelector(':scope > .rpg-soin.rpg-soin--carte');
    assert.ok(eclat, 'l’éclat se pose par-dessus la carte, après son pied');
    assert.equal(eclat.previousElementSibling?.classList.contains('rpg-card__foot'), true,
      'l’éclat suit le pied de la carte, au-dessus de son contenu');
    assert.equal(eclat.querySelector('.rpg-soin__montant')?.textContent, '+2', 'le « +2 » s’affiche au cœur de la carte');
    assert.equal(eclat.querySelectorAll('.rpg-soin__mote').length, 7, 'les motes montent aussi sur la carte');
    assert.match(soignee.getAttribute('aria-label') ?? '', /, vient de regagner 2 PV$/,
      'le nom accessible de la carte dit le soin');
    assert.equal(calme.classList.contains('is-healing'), false, 'une créature non soignée reste calme');
    assert.equal(calme.querySelector('.rpg-soin'), null, 'sans soin, aucun calque d’éclat');
    assert.doesNotMatch(calme.getAttribute('aria-label') ?? '', /regagner/, 'ni mention du soin');

    // Un second soin sur la même créature rejoue l'éclat (nouvelle clé, autre variante).
    const premierEclat = eclat;
    await act(async () => root.render(
      <div>
        <TableCard entite={entite} cote="joueur" tilt={0} soin={{ montant: 1, token: 4 }} />
      </div>,
    ));
    const rejoue = container.querySelector('[data-entity-id="entite-soin"]');
    assert.ok(rejoue.classList.contains('is-healing--b'), 'le soin suivant bascule sur l’autre variante');
    assert.notEqual(rejoue.querySelector('.rpg-soin'), premierEclat, 'un soin neuf remonte un éclat neuf');
    assert.equal(rejoue.querySelector('.rpg-soin__montant')?.textContent, '+1', 'avec son propre montant');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

export async function checkRpgSoins(assert) {
  const sons = [];
  const jouerOriginal = RpgAudioPlayer.prototype.play;
  RpgAudioPlayer.prototype.play = function espionSoins(nom, delai) {
    sons.push(nom);
    return jouerOriginal.call(this, nom, delai);
  };
  try {
    await scenarioCarte(assert);
    await scenarioDuel(assert, sons);
  } finally {
    RpgAudioPlayer.prototype.play = jouerOriginal;
  }
}
