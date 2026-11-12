import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { rpgMobaPeutRepondreAttaque } from '../src/games/rpgMobaReponseAttaque.js';

function attaque() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok && rpgMulligan(duel, 'sorcier', []).ok && rpgDemarrerManaEssai(duel).ok);
  duel.joueur.main = ['ashigaru-des-braises'];
  const cible = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.main = ['ashigaru-des-braises'];
  const attaquant = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  attaquant.ready = true;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(duel, 'sorcier', attaquant.id, cible.id).ok);
  duel.joueur.main = [];
  Object.assign(duel.joueur.mana, { braise: 10, sable: 10, eau: 10, neige: 10, tenebres: 10 });
  return { duel, attaquant, cible };
}

test('aucune réponse, magie trop chère et contresort sans cible', () => {
  const { duel } = attaque();
  assert.equal(rpgMobaPeutRepondreAttaque(duel, 'joueur'), false);
  duel.joueur.main = ['ashigaru-des-braises', 'ecueil', 'appat-de-la-meute'];
  assert.equal(rpgMobaPeutRepondreAttaque(duel, 'joueur'), false);
  duel.joueur.main = ['trait-de-braise']; duel.joueur.mobaSansMana = false;
  for (const couleur of Object.keys(duel.joueur.mana)) duel.joueur.mana[couleur] = 0;
  assert.equal(rpgMobaPeutRepondreAttaque(duel, 'joueur'), false);
});

test('une réponse légale conserve la fenêtre sans altérer la partie', () => {
  const { duel } = attaque();
  for (const id of ['trait-de-braise', 'grand-voile-blanc', 'parade-du-verre', 'papyrus', 'le-poids']) {
    duel.joueur.main = [id];
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaPeutRepondreAttaque(duel, 'joueur'), true, id);
    assert.equal(JSON.stringify(duel), avant, `${id} ne modifie pas le duel`);
  }
});

test('une Embuscade ne retient pas la réponse pendant le tour adverse, même si sa condition est remplie', () => {
  const { duel, cible } = attaque();
  cible.pv = cible.pvMax - 1;
  duel.joueur.main = ['garde-du-trone-givre'];
  const avant = JSON.stringify(duel);
  assert.equal(rpgMobaPeutRepondreAttaque(duel, 'joueur'), false);
  assert.equal(JSON.stringify(duel), avant);
});

test('une magie sans cible légale ne retient pas la fenêtre', () => {
  const { duel, cible } = attaque();
  // Un sort allié ne peut cibler une créature protégée contre sa couleur.
  cible.protectionSortsContre = ['eau'];
  duel.joueur.main = ['parade-du-verre'];
  assert.equal(rpgMobaPeutRepondreAttaque(duel, 'joueur'), false);
});
