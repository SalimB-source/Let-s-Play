import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cardById, cardColors, cardFrameInfo, cardHasPrintedType } from '../src/games/rpgCards.js';
import { cardArt } from '../src/games/rpgCardArt.js';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { vivierRayon } from '../src/games/rpgBoosters.js';
import { validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { pastillesPourCarte } from '../src/games/effetIcons.js';
import { classeBouclier } from '../src/games/rpgBouclier.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaValiderDeck, MOBA_CARTES_AUTORISEES } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

const ID = 'griffon-des-dunes-gelees';
const deck = Array(30).fill('ashigaru-des-braises');
function partie(moba) {
  const opts = { joueurDeck: deck, sorcierDeck: deck, rng: () => .9 };
  const d = moba ? rpgMobaNouveauDuel(opts) : rpgNouveauDuel({ ...opts, modeMana: 'essai', pvp: true });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  return d;
}
function poser(d, id, moba, sacrificeIds = null) {
  d.joueur.main = [id];
  const r = moba ? rpgMobaJouerCreature(d, 'joueur', id, 'left', 0, { sacrificeIds })
    : rpgJouerCreature(d, 'joueur', id, null, { sacrificeIds });
  assert.ok(r.ok, JSON.stringify(r));
  return r.entite;
}
function installerGriffon(moba) {
  const d = partie(moba);
  const sacrifice = poser(d, 'ashigaru-des-braises', moba);
  if (moba) d.moba.creaturesJouees.joueur = false; else d.joueur.invocationNormaleJouee = false;
  d.joueur.main = [ID];
  const refus = moba ? rpgMobaJouerCreature(d, 'joueur', ID, 'left', 1) : rpgJouerCreature(d, 'joueur', ID);
  assert.equal(refus.ok, false, 'le joueur doit choisir son sacrifice');
  assert.ok(d.joueur.creatures.includes(sacrifice));
  const griffon = poser(d, ID, moba, [sacrifice.id]);
  assert.deepEqual([griffon.atk, griffon.def, griffon.pv, griffon.pvMax], [4, 5, 5, 5]);
  assert.ok(griffon.defenseur && griffon.envol && griffon.volDeVie);
  return { d, griffon };
}

test('fiche bicolore, capacités imprimées et illustration', () => {
  const c = cardById(ID);
  assert.ok(c && c.kind === 'creature');
  assert.deepEqual([c.cost, c.atk, c.def], [5, 4, 5]);
  assert.deepEqual(cardColors(c), ['sable', 'neige']);
  assert.deepEqual(c.colorCost, { sable: 1, neige: 1 });
  assert.equal(cardFrameInfo(c).key, 'hybride-sable-neige');
  assert.ok(cardHasPrintedType(c, 'griffon'));
  assert.deepEqual(new Set(pastillesPourCarte(c).map(p => p.cle)), new Set(['defenseur', 'envol', 'volDeVie']));
  assert.equal(classeBouclier(c), 'rpg-carte-bouclier');
  assert.ok(MOBA_CARTES_AUTORISEES.includes(ID));
  assert.ok(existsSync(new URL('../public/cards/griffon-des-dunes-gelees.jpg', import.meta.url)));
  assert.match(cardArt(ID), /cards\/griffon-des-dunes-gelees\.jpg/);
});
test('disponible dans le Souk et jouable dans un deck Sable/Neige, y compris en MOBA', () => {
  assert.ok(vivierRayon('set-sable').includes(ID));
  const modele = RPG_DECKS_THEMATIQUES.find(d => d.id === 'sable');
  const cardIds = [...modele.cardIds];
  cardIds[0] = ID;
  const deckGriffon = { ...modele, cardIds };
  assert.deepEqual(validerDeckManaEssai(deckGriffon), { ok: true });
  assert.deepEqual(rpgMobaValiderDeck(deckGriffon), { ok: true });
  assert.equal(validerDeckManaEssai({ ...deckGriffon, elements: ['sable'] }).ok, false);
});
for (const moba of [false, true]) {
  test(`${moba ? 'MOBA' : 'duel'} : pose avec sacrifice choisi et Vol de vie`, () => {
    const { d, griffon } = installerGriffon(moba);
    griffon.ready = true; griffon.malInvocation = false;
    if (moba) mobaVoie(d.moba, 'left').hp.joueur = 10; else d.joueur.pv = 10;
    const declare = moba ? rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', griffon.id, null, 'left')
      : rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', griffon.id);
    assert.ok(declare.ok, JSON.stringify(declare));
    const res = moba ? rpgMobaResoudreAttaqueIndividuelle(d, 'joueur') : rpgResoudreAttaqueIndividuelleClassique(d, 'joueur');
    assert.ok(res.ok, JSON.stringify(res));
    assert.equal(moba ? mobaVoie(d.moba, 'left').hp.joueur : d.joueur.pv, 12);
  });
  test(`${moba ? 'MOBA' : 'duel'} : Défenseur volant est prioritaire pour un ennemi capable de l’atteindre`, () => {
    const { d, griffon } = installerGriffon(moba);
    rpgFinDeTour(d);
    d.sorcier.main = ['ashigaru-des-braises'];
    const r = moba ? rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0) : rpgJouerCreature(d, 'sorcier', 'ashigaru-des-braises');
    assert.ok(r.ok, JSON.stringify(r));
    const attaquant = r.entite;
    const cibles = () => moba ? rpgMobaCiblesIndividuelles(d, 'sorcier', attaquant.id, 'left') : rpgCiblesIndividuellesClassique(d, 'sorcier', attaquant.id);
    assert.deepEqual(cibles(), { cibles: [], directe: true });
    attaquant.envol = true;
    assert.deepEqual(cibles(), { cibles: [griffon.id], directe: false });
  });
}

test('le Griffon posé affiche son écu, ses ailes et ses trois pastilles en duel et en MOBA', async () => {
  const [{ createServer }, React, { renderToStaticMarkup }, { JSDOM }] = await Promise.all([
    import('vite'), import('react'), import('react-dom/server'), import('jsdom'),
  ]);
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { TableCard } = await vite.ssrLoadModule('/src/games/RpgDuelPage.jsx');
    for (const moba of [false, true]) {
      const { griffon } = installerGriffon(moba);
      const html = renderToStaticMarkup(React.createElement(TableCard, {
        entite: griffon, cote: 'joueur', ...(moba ? { moba: { className: 'moba__slot' } } : {}),
      }));
      const dom = new JSDOM(html);
      const card = dom.window.document.querySelector('.rpg-card');
      assert.ok(card.classList.contains('rpg-carte-bouclier'));
      assert.ok(card.classList.contains('is-envol'));
      assert.ok(card.querySelector('.rpg-card__resonance--garde'));
      for (const effet of ['defenseur', 'envol', 'volDeVie']) {
        assert.ok(card.querySelector(`[data-effet="${effet}"]`), effet);
      }
      assert.match(card.querySelector('img').getAttribute('src'), /griffon-des-dunes-gelees\.jpg/);
      dom.window.close();
    }
  } finally { await vite.close(); }
});
