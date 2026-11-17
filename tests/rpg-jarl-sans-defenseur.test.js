import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { cardById } from '../src/games/rpgCards.js';
import { pastillesCarte, pastillesPourCarte } from '../src/games/effetIcons.js';
import { classeBouclier } from '../src/games/rpgBouclier.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';

const ID = 'jarl-au-marteau-de-guerre';
const carte = cardById(ID);
const ancien = { id: 'ancien', carteId: ID, name: carte.name, atk: 3, def: 5, pv: 5, pvMax: 5, ready: true, defenseur: true, provocation: true };

test('la fiche du Jarl conserve ses statistiques, Furie et Overkill sans Défenseur', () => {
  assert.deepEqual([carte.cost, carte.atk, carte.def, carte.furie, carte.overkill], [5, 3, 5, 2, true]);
  assert.equal(carte.defenseur, undefined);
  assert.doesNotMatch(carte.text, /Défenseur|Provocation/i);
  assert.deepEqual(pastillesPourCarte(carte).map(p => p.cle), ['overkill', 'furie']);
  assert.equal(classeBouclier(carte), '');
});

test('les anciennes sauvegardes perdent le Défenseur imprimé mais pas un effet accordé', () => {
  assert.equal(estDefenseur(ancien), false);
  assert.equal(estDefenseur({ ...ancien, defenseurAccorde: true }), true);
  assert.equal(estDefenseur({ ...ancien, prioriteAttaqueRapide: true }), true);
  assert.equal(estDefenseur({ id: ID, defenseur: true }), false);
  assert.doesNotMatch(pastillesCarte({ ...carte, defenseur: true }), /i-defenseur/);
  assert.match(pastillesCarte({ ...carte, defenseur: true, defenseurAccorde: true }), /i-defenseur/);
  assert.equal(classeBouclier(carte, ancien), '');
  assert.notEqual(classeBouclier(carte, { ...ancien, defenseurAccorde: true }), '');
  assert.equal(estDefenseur({ carteId: 'gardien-de-la-porte-ardente', defenseur: true }), true);
});

for (const mode of ['duel', 'PvP', 'MOBA']) for (const side of ['joueur', 'sorcier']) test(`${mode} (${side}) : le Jarl invoqué ne restreint plus les cibles`, () => {
  const moba = mode === 'MOBA';
  const init = moba ? rpgMobaNouveauDuel : rpgNouveauDuel;
  const deck = Array(30).fill('viking-des-neiges');
  const d = init({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5, pvp: mode === 'PvP' });
  d.mulliganFait = { joueur: true, sorcier: true }; d.manaEssaiDemarre = true;
  for (const camp of ['joueur', 'sorcier']) { d[camp].main = []; d[camp].deck = []; d[camp].manaChoixEnAttente = null; }
  const poser = (cote, id, slot, sacrificeIds = []) => {
    d.tour = cote; d[cote].invocationNormaleJouee = false;
    if (moba) d.moba.creaturesJouees[cote] = false;
    d[cote].main.push(id);
    const res = moba ? rpgMobaJouerCreature(d, cote, id, 'left', slot, { sacrificeIds }) : rpgJouerCreature(d, cote, id, null, { sacrificeIds });
    assert.ok(res.ok, `${id} : ${res.raison}`); return res.entite;
  };
  const victime = poser(side, 'viking-des-neiges', 0);
  const jarl = poser(side, ID, 0, [victime.id]);
  const autre = poser(side, 'viking-des-neiges', 1);
  const adverse = side === 'joueur' ? 'sorcier' : 'joueur';
  const attaquant = poser(adverse, 'ashigaru-des-braises', 0);
  const cibles = () => moba ? rpgMobaCiblesIndividuelles(d, adverse, attaquant.id, 'left') : rpgCiblesIndividuellesClassique(d, adverse, attaquant.id);
  assert.equal(estDefenseur(jarl), false);
  assert.deepEqual(cibles(), { cibles: [jarl.id, autre.id], directe: true });
  jarl.defenseur = true; jarl.provocation = true; // instantané d'une ancienne partie
  assert.deepEqual(cibles(), { cibles: [jarl.id, autre.id], directe: true });
  jarl.defenseurAccorde = true;
  assert.deepEqual(cibles(), { cibles: [jarl.id], directe: false });
});

test('la table et l’aperçu reflètent la perte ou le gain de Défenseur', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard, HoverCardPreview } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    const doc = (component, props) => new JSDOM(renderToStaticMarkup(React.createElement(component, props))).window.document;
    for (const moba of [null, { className: 'moba__slot' }]) {
      for (const [entite, defenseur] of [[ancien, false], [{ ...ancien, defenseurAccorde: true }, true]]) {
        const table = doc(TableCard, { entite, cote: 'joueur', moba });
        assert.equal(Boolean(table.querySelector('.rpg-card.has-garde.rpg-carte-bouclier')), defenseur);
        assert.equal(Boolean(table.querySelector('.rpg-card__resonance--garde')), defenseur);
        assert.equal(Boolean(table.querySelector('[data-effet="defenseur"]')), defenseur);
        assert.equal(table.querySelector('.rpg-card__ombre-garde'), null, 'aucune silhouette d’écu');
        assert.equal(table.querySelector('.rpg-card__liseret-garde'), null, 'aucun cadre coloré');
        const apercu = doc(HoverCardPreview, { carte, entite: { ...entite, bouclierVisuel: defenseur }, variante: 'annonce' });
        assert.equal(Boolean(apercu.querySelector('[data-effet="defenseur"]')), defenseur);
        assert.equal(Boolean(apercu.querySelector('.rpg-card__resonance--garde')), defenseur);
        assert.equal(apercu.querySelector('.rpg-card__liseret-garde'), null, 'aperçu sans liseré de Défenseur');
      }
    }
  } finally { await vite.close(); }
});
