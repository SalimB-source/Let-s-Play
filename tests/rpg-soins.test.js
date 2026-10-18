import test from 'node:test';
import assert from 'node:assert/strict';

import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import {
  RPG_PV_JOUEUR,
  rpgAttaquerSorcier,
  rpgBlesserCreature,
  rpgConsommerSoins,
  rpgDemarrerManaEssai,
  rpgJouerCreature,
  rpgLancerMagie,
  rpgMulligan,
  rpgMulliganSorcier,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';
import { RPG_MANA_ESSAI_DECKS, RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import {
  RPG_SOIN_ADVERSE_SFX,
  RPG_SOIN_DUREE,
  RPG_SOIN_SFX,
  annonceSoins,
  cleSoin,
  regrouperSoins,
  sonDuSoin,
} from '../src/games/rpgSoins.js';
import { RPG_SFX_NAMES, hz, rpgSfx } from '../src/games/rpgAudio.js';

/* ── Le journal des soins du moteur ──────────────────────────────────────────
   Chaque gain de vie RÉEL laisse `{ cote, entityId, montant }` — l'éclat vert
   et le son du soin en sont tirés à la table. Le journal observe sans rien
   décider : les règles ne le lisent jamais. */

const duelClassique = () => rpgNouveauDuel({
  joueurDeck: Array(12).fill('chien-du-guet'),
  sorcierDeck: Array(8).fill('chien-du-guet'),
  rng: () => 0.5,
});
const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);
const donnerMana = (duel, cote, n) => { duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, n])); };

const rngEssai = () => 0.5;
const deckTenebres = RPG_MANA_ESSAI_DECKS.find((candidate) => candidate.id === 'essai-mana-tenebres');
const duelTenebres = () => {
  const duel = rpgNouveauDuel({
    joueurDeck: deckTenebres.cardIds,
    sorcierDeck: deckTenebres.cardIds,
    joueurCouleurs: ['tenebres'],
    sorcierCouleurs: ['tenebres'],
    modeMana: RPG_MODE_MANA_ESSAI,
    rng: rngEssai,
  });
  assert.equal(rpgMulligan(duel, 'joueur', [], rngEssai).ok, true);
  assert.equal(rpgMulliganSorcier(duel, rngEssai).ok, true);
  rpgDemarrerManaEssai(duel);
  duel.joueur.mana.tenebres = 50;
  duel.joueur.manaMax.tenebres = Math.max(duel.joueur.manaMax.tenebres ?? 0, 50);
  rpgConsommerSoins(duel);
  return duel;
};

test('journal : un duel neuf n’a rien à montrer, et un duel absent non plus', () => {
  const duel = duelClassique();
  assert.deepEqual(rpgConsommerSoins(duel), []);
  assert.deepEqual(rpgConsommerSoins(null), []);
  assert.deepEqual(rpgConsommerSoins(undefined), []);
});

test('journal : une magie de soin note le vrai gain, et la vie passe au-dessus de 25', () => {
  const duel = duelClassique();
  donner(duel, 'joueur', 'eau-de-la-source');
  duel.joueur.terrains.push({ id: 'mer-soin', carteId: 'mer', tapped: false });
  duel.joueur.pv = RPG_PV_JOUEUR - 3;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eau-de-la-source').ok, true);
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR + 1, 'l’Eau de la source (4) porte la vie au-dessus de 25');
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: null, montant: 4 }],
    'le journal garde le gain réel (4)');
  assert.deepEqual(rpgConsommerSoins(duel), [], 'un soin ne se relève qu’une fois');
});

test('journal : à pleine vie, un soin fait grimper la vie — 25 n’est plus un plafond', () => {
  const duel = duelClassique();
  donner(duel, 'joueur', 'eau-de-la-source');
  duel.joueur.terrains.push({ id: 'mer-plein', carteId: 'mer', tapped: false });
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR);
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eau-de-la-source').ok, true, 'le sort reste jouable à pleine vie');
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR + 4, 'la réserve de vie s’ouvre');
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: null, montant: 4 }],
    'le gain s’illumine et se fait entendre');
});

test('journal : le soin du sorcier adverse est noté de son côté', () => {
  const duel = duelClassique();
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'eau-de-la-source');
  donnerMana(duel, 'sorcier', 3);
  duel.sorcier.pv = duel.sorcier.pvMax - 6;
  assert.equal(rpgLancerMagie(duel, 'sorcier', 'eau-de-la-source').ok, true);
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'sorcier', entityId: null, montant: 4 }]);
});

test('journal : une capacité d’arrivée qui soigne est notée comme une magie', () => {
  const duel = duelClassique();
  donner(duel, 'joueur', 'porteuse-de-cruches');
  donnerMana(duel, 'joueur', 3);
  duel.joueur.pv = RPG_PV_JOUEUR - 2;
  assert.equal(rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').ok, true);
  assert.equal(duel.joueur.pv, RPG_PV_JOUEUR + 1, 'la Porteuse (+3) porte la vie au-dessus de 25');
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: null, montant: 3 }]);
});

test('journal : Yamina soigne ses créatures blessées — chacune la sienne, et seulement les blessées', () => {
  const duel = duelClassique();
  donner(duel, 'joueur', 'porteuse-de-cruches');
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'yamina');
  donnerMana(duel, 'joueur', 9);
  const porteuse = rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches').entite;
  const chien = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assert.ok(porteuse && chien);
  assert.equal(rpgBlesserCreature(duel, 'joueur', porteuse.id, 2, 'braise').ok, true);
  assert.equal(porteuse.pv, 1, 'la Porteuse ne tient plus qu’à 1 PV');
  rpgConsommerSoins(duel);
  donnerMana(duel, 'joueur', 9);
  assert.equal(rpgJouerCreature(duel, 'joueur', 'yamina').ok, true);
  assert.equal(porteuse.pv, 3, 'la Porteuse remonte de 2');
  assert.equal(chien.pv, chien.pvMax, 'le Chien, intact, n’a rien à regagner');
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: porteuse.id, montant: 2 }],
    'seule la créature réellement soignée s’illumine');
});

test('journal : Le Poids (transfert) note les PV gagnés par le lanceur', () => {
  const duel = duelTenebres();
  duel.joueur.main.push('le-poids');
  duel.joueur.pv = 20;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'le-poids').ok, true);
  assert.equal(duel.joueur.pv, 22);
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: null, montant: 2 }]);
});

test('journal : La Grande Pesée — payer 3 PV puis en regagner 3 reste un soin visible', () => {
  const duel = duelTenebres();
  duel.joueur.main.push('la-grande-pesee');
  duel.joueur.pv = 20;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'la-grande-pesee').ok, true);
  assert.equal(duel.joueur.pv, 20, 'le Prix et le gain s’annulent sur le compteur…');
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: null, montant: 3 }],
    '…mais le gain de 3 PV a bien eu lieu : il s’anime et s’entend');
});

test('journal : le Tribut, porté par une attaque, note le gain de son contrôleur', () => {
  const duel = duelTenebres();
  duel.joueur.pv = 18;
  duel.joueur.creatures.push({
    id: 'tribut-soin',
    carteId: 'chacal-du-seuil',
    name: 'Chacal du seuil',
    atk: 1,
    pv: 1,
    pvMax: 1,
    tribut: 1,
    ready: true,
    attaquee: false,
    jeton: false,
    armes: [],
    emplacement: 0,
  });
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', 'tribut-soin').ok, true);
  assert.equal(duel.joueur.pv, 19);
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: null, montant: 1 }]);
});

test('journal : la Gardienne de la balance soigne en mourant (capacité de destruction)', () => {
  const duel = duelTenebres();
  duel.joueur.pv = 20;
  duel.joueur.main.push('gardienne-de-la-balance');
  const pose = rpgJouerCreature(duel, 'joueur', 'gardienne-de-la-balance');
  assert.equal(pose.ok, true, JSON.stringify(pose));
  rpgConsommerSoins(duel);
  assert.equal(rpgBlesserCreature(duel, 'joueur', pose.entite.id, 100, 'braise').ok, true);
  assert.equal(duel.joueur.pv, 22);
  assert.deepEqual(rpgConsommerSoins(duel), [{ cote: 'joueur', entityId: null, montant: 2 }]);
});

test('journal : hors de l’état sauvegardé — une copie du duel (annulation) repart vide', () => {
  const duel = duelClassique();
  donner(duel, 'joueur', 'eau-de-la-source');
  duel.joueur.terrains.push({ id: 'mer-copie', carteId: 'mer', tapped: false });
  duel.joueur.pv = 10;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'eau-de-la-source').ok, true);
  const copie = structuredClone(duel);
  assert.deepEqual(rpgConsommerSoins(copie), [], 'un duel restauré ne rejoue pas un ancien soin');
  assert.equal(rpgConsommerSoins(duel).length, 1, 'l’original garde son relevé');
});

/* ── La présentation : regrouper, choisir le son, annoncer ─────────────────── */

test('présentation : la clé d’un soin est la créature soignée, ou le camp pour son sorcier', () => {
  assert.equal(cleSoin({ cote: 'joueur', entityId: null, montant: 2 }), 'joueur');
  assert.equal(cleSoin({ cote: 'sorcier', entityId: null, montant: 2 }), 'sorcier');
  assert.equal(cleSoin({ cote: 'sorcier', entityId: 'entite-7', montant: 2 }), 'entite-7');
  assert.equal(cleSoin({ cote: 'arbitre', entityId: null, montant: 2 }), null);
  assert.equal(cleSoin(null), null);
});

test('présentation : un lot se regroupe par cible, sans les gains nuls ou illisibles', () => {
  assert.deepEqual(regrouperSoins([
    { cote: 'joueur', entityId: null, montant: 1 },
    { cote: 'sorcier', entityId: 'entite-3', montant: 2 },
    { cote: 'joueur', entityId: null, montant: 1 },
    { cote: 'joueur', entityId: null, montant: 0 },
    { cote: 'joueur', entityId: 'entite-4', montant: -2 },
    { cote: 'joueur', entityId: 'entite-5', montant: 'beaucoup' },
    { cote: 'personne', entityId: null, montant: 3 },
    null,
  ]), [
    { cle: 'joueur', cote: 'joueur', entityId: null, montant: 2 },
    { cle: 'entite-3', cote: 'sorcier', entityId: 'entite-3', montant: 2 },
  ], 'deux Tributs du même combat font un seul « +2 » sur la plaque');
  assert.deepEqual(regrouperSoins(), []);
  assert.deepEqual(regrouperSoins('rien'), []);
});

test('présentation : un seul son par lot — le vôtre d’abord, celui de l’adversaire sinon', () => {
  assert.equal(sonDuSoin([{ cote: 'joueur', entityId: null, montant: 3 }]), RPG_SOIN_SFX);
  assert.equal(sonDuSoin([{ cote: 'joueur', entityId: 'entite-2', montant: 2 }]), RPG_SOIN_SFX,
    'vos créatures soignées sonnent comme vous');
  assert.equal(sonDuSoin([{ cote: 'sorcier', entityId: null, montant: 3 }]), RPG_SOIN_ADVERSE_SFX);
  assert.equal(sonDuSoin([
    { cote: 'sorcier', entityId: null, montant: 1 },
    { cote: 'joueur', entityId: null, montant: 1 },
  ]), RPG_SOIN_SFX, 'deux camps soignés ensemble : votre son l’emporte');
  assert.equal(sonDuSoin([]), null);
  assert.equal(sonDuSoin([{ cote: 'joueur', entityId: null, montant: 0 }]), null, 'pas de gain, pas de son');
});

test('présentation : la phrase des lecteurs d’écran nomme qui regagne combien', () => {
  const noms = { 'entite-9': 'Porteuse de cruches' };
  const annonce = annonceSoins({
    joueur: { montant: 3, token: 1 },
    sorcier: { montant: 2, token: 1 },
    'entite-9': { montant: 2, token: 1 },
    'entite-disparue': { montant: 1, token: 1 },
  }, { nomAdversaire: 'Ifrit al-Ahmar', nomCreature: (id) => noms[id] ?? null });
  assert.equal(annonce, 'Vous regagnez 3 PV · Ifrit al-Ahmar regagne 2 PV · Porteuse de cruches regagne 2 PV');
  assert.equal(annonceSoins({}), '');
  assert.equal(annonceSoins({ sorcier: { montant: 1 } }), 'Le sorcier regagne 1 PV');
});

test('présentation : l’éclat dure le temps de ses animations', () => {
  assert.ok(RPG_SOIN_DUREE >= 1600 && RPG_SOIN_DUREE <= 2500,
    'assez long pour lire le « +N » (1,55 s d’animation), assez court pour ne pas encombrer la table');
});

/* ── Les sons du soin ─────────────────────────────────────────────────────── */

test('sons : soin_vie et soin_vie_adverse sont au catalogue', () => {
  assert.ok(RPG_SFX_NAMES.includes(RPG_SOIN_SFX));
  assert.ok(RPG_SFX_NAMES.includes(RPG_SOIN_ADVERSE_SFX));
  assert.ok(RPG_SFX_NAMES.includes('soin_long'), 'l’ancien son reste au catalogue');
});

const cloches = (nom) => rpgSfx(nom).filter((event) => event.kind === 'bell').sort((a, b) => a.at - b.at);

test('sons : le soin du joueur monte — un arpège de cloches ascendant, de gauche à droite', () => {
  const sequence = rpgSfx(RPG_SOIN_SFX);
  const arpege = cloches(RPG_SOIN_SFX);
  assert.ok(arpege.length >= 4, 'au moins quatre cloches');
  for (let i = 1; i < arpege.length; i += 1) {
    assert.ok(hz(arpege[i].n) > hz(arpege[i - 1].n), 'chaque cloche sonne plus haut que la précédente');
    assert.ok(arpege[i].pan > arpege[i - 1].pan, 'l’arpège traverse la stéréo de gauche à droite');
  }
  assert.ok(sequence.some((event) => event.kind === 'noise' && event.filterTo > event.filter),
    'un souffle qui s’ouvre vers l’aigu');
  assert.ok(sequence.some((event) => event.kind === 'tone' && hz(event.slideTo) > hz(event.n)),
    'une nappe qui glisse vers le haut');
  assert.ok(!sequence.some((event) => event.kind === 'thud'), 'aucun impact grave : un soin n’est pas un coup');
});

test('sons : le soin adverse est le même geste, plus grave et plus discret', () => {
  const joueur = cloches(RPG_SOIN_SFX);
  const adverse = cloches(RPG_SOIN_ADVERSE_SFX);
  assert.ok(adverse.length >= 3 && adverse.length < joueur.length, 'moins de cloches');
  for (let i = 1; i < adverse.length; i += 1) {
    assert.ok(hz(adverse[i].n) > hz(adverse[i - 1].n), 'l’arpège adverse monte lui aussi');
  }
  assert.ok(hz(adverse[0].n) < hz(joueur[0].n), 'il part plus bas');
  assert.ok(hz(adverse.at(-1).n) < hz(joueur.at(-1).n), 'il culmine plus bas');
  const crete = (nom) => Math.max(...rpgSfx(nom).map((event) => event.g));
  assert.ok(crete(RPG_SOIN_ADVERSE_SFX) < crete(RPG_SOIN_SFX), 'il sonne moins fort');
});
