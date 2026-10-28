/**
 * Le salon du Sablier en ligne — les décisions, sans DOM.
 *
 * Ces tests couvrent ce que l'écran ne doit pas se tromper à décider : quel
 * panneau montrer selon le statut d'un défi, qui peut rejoindre, comment se lit
 * une carte de défi reçue dans la messagerie. Lancer avec
 * `npm run check:rpg-pvp`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { RPG_DECKS_ARCHETYPES, rpgValiderDeck } from '../src/games/rpgCards.js';
import {
  SALON_TEXTES,
  cheminSalon,
  decksPourDefi,
  etatSalon,
  invitationDepuisMessage,
  lienSalon,
  messageDefi,
  payloadDefi,
  peutRejoindre,
  resultatSalon,
  suisHote,
  tempsRestant,
} from '../src/games/rpgPvpSalon.js';

const MOI = 'u-moi';
const AUTRE = 'u-autre';

/** Une réponse d'arbitre minimale. */
const vue = (extra = {}) => ({ ok: true, code: 'AB12CD34', siege: null, statut: 'invitation', ...extra });

test('les chemins : salon sans code, lien de défi', () => {
  assert.equal(cheminSalon(), '/jeu/sablier-de-bab-el/defi');
  assert.equal(lienSalon('ab12cd34'), '/jeu/sablier-de-bab-el/defi/AB12CD34');
  assert.equal(lienSalon('ab12cd34', 'https://letsplay.dz/'), 'https://letsplay.dz/jeu/sablier-de-bab-el/defi/AB12CD34');
  assert.equal(lienSalon('n’importe quoi'), '');
});

test('l’écran du salon se déduit du statut, dans l’ordre des urgences', () => {
  assert.equal(etatSalon(null, { disponible: false }), 'connexion');
  assert.equal(etatSalon(null, { disponible: true, chargement: true }), 'chargement');
  assert.equal(etatSalon({ ok: false, raison: 'duel-inconnu' }), 'inconnu');
  assert.equal(etatSalon({ ok: false, raison: 'code-invalide' }), 'inconnu');
  assert.equal(etatSalon({ ok: false, raison: 'pas-participant' }), 'inconnu');
  assert.equal(etatSalon({ ok: false, raison: 'interne' }), 'erreur');
  assert.equal(etatSalon({ ok: true, statut: 'invitation', siege: 'joueur' }), 'attente');
  assert.equal(etatSalon({ ok: true, statut: 'invitation', siege: null }), 'a-rejoindre');
  assert.equal(etatSalon({ ok: true, statut: 'en_cours', siege: 'sorcier' }), 'en-cours');
  assert.equal(etatSalon({ ok: true, statut: 'terminee' }), 'termine');
  assert.equal(etatSalon({ ok: true, statut: 'refusee' }), 'refuse');
  assert.equal(etatSalon({ ok: true, statut: 'expiree' }), 'expire');
  // Chaque écran a une phrase : aucune clé muette.
  for (const cle of ['attente', 'a-rejoindre', 'en-cours', 'termine', 'refuse', 'expire', 'inconnu', 'connexion', 'erreur']) {
    assert.equal(typeof SALON_TEXTES[cle], 'string', `${cle} doit avoir un texte`);
  }
});

test('qui est l’hôte, qui peut rejoindre', () => {
  assert.equal(suisHote({ siege: 'joueur' }), true);
  assert.equal(suisHote({ siege: 'sorcier' }), false);
  assert.equal(suisHote(null), false);

  assert.equal(peutRejoindre(vue({ hote_id: AUTRE }), MOI), true);
  // Déjà assis dedans : plus de bouton.
  assert.equal(peutRejoindre(vue({ siege: 'joueur', hote_id: MOI }), MOI), false);
  // Invitation nominative adressée à quelqu'un d'autre.
  assert.equal(peutRejoindre(vue({ invite_id: AUTRE }), MOI), false);
  assert.equal(peutRejoindre(vue({ invite_id: MOI }), MOI), true);
  // Une partie en cours ou finie ne se rejoint pas.
  assert.equal(peutRejoindre(vue({ statut: 'en_cours' }), MOI), false);
  assert.equal(peutRejoindre({ ok: false }, MOI), false);
});

test('le résultat se lit de mon côté', () => {
  assert.equal(resultatSalon({ ok: true, statut: 'en_cours' }, MOI), null);
  assert.equal(resultatSalon(vue({ statut: 'terminee', gagnant_id: MOI }), MOI), 'gagne');
  assert.equal(resultatSalon(vue({ statut: 'terminee', gagnant_id: AUTRE }), MOI), 'perdu');
  assert.equal(resultatSalon(vue({ statut: 'terminee', gagnant_id: null, fin_raison: 'nul' }), MOI), 'nul');
  assert.equal(resultatSalon(vue({ statut: 'terminee', gagnant_id: null }), MOI), 'nul');
  assert.equal(resultatSalon(null, MOI), null);
});

test('le message d’invitation et son contenu typé', () => {
  assert.match(messageDefi({ nom: 'Salim' }), /Salim te défie au Sablier/);
  assert.match(messageDefi({ nom: 'Salim', mode: 'async' }), /ouvre le défi pour choisir ton deck/);

  assert.deepEqual(payloadDefi({ code: 'ab12cd34', mode: 'async', deckNom: 'Veilleurs du Désert' }), {
    code: 'AB12CD34', mode: 'live', deckNom: 'Veilleurs du Désert',
  });
  assert.equal(payloadDefi({ code: 'trop-court' }), null);
  // Le mode inconnu retombe sur le direct plutôt que de casser la carte.
  assert.equal(payloadDefi({ code: 'AB12CD34', mode: 'zzz' }).mode, 'live');
});

test('une carte de défi se relit, et ne s’invente pas', () => {
  const carte = invitationDepuisMessage({
    kind: 'defi-sablier',
    payload: { code: 'ab12cd34', mode: 'live', deckNom: 'Cour des Djinns' },
  });
  assert.deepEqual(carte, { code: 'AB12CD34', mode: 'live', deckNom: 'Cour des Djinns' });

  // Un message ordinaire n'est pas une carte.
  assert.equal(invitationDepuisMessage({ kind: 'texte', payload: { code: 'AB12CD34' } }), null);
  // Un payload abîmé ne produit pas de carte plutôt qu'une carte fausse.
  assert.equal(invitationDepuisMessage({ kind: 'defi-sablier' }), null);
  assert.equal(invitationDepuisMessage({ kind: 'defi-sablier', payload: { code: 'AB' } }), null);
  assert.equal(invitationDepuisMessage(null), null);
});

test('le compte à rebours reste lisible, sans échéance il ne ment pas', () => {
  const maintenant = Date.parse('2026-10-20T12:00:00Z');
  assert.equal(tempsRestant('2026-10-20T12:01:23Z', maintenant), '01:23');
  assert.equal(tempsRestant('2026-10-20T11:00:00Z', maintenant), '00:00');
  assert.equal(tempsRestant(null, maintenant), '—');
  assert.equal(tempsRestant('pas une date', maintenant), '—');
});

test('les decks proposés au salon sont ceux du joueur, et seulement les valides', () => {
  // Depuis les coffrets de bienvenue, l'étagère du catalogue est vide : le
  // salon propose les decks de la maison — celui du coffret, ceux de l'atelier.
  assert.deepEqual(decksPourDefi(), [], 'sans deck de la maison, le salon ne propose rien');
  const decks = decksPourDefi(RPG_DECKS_ARCHETYPES);
  assert.ok(decks.length >= 4, `${decks.length} decks seulement`);
  for (const deck of decks) {
    assert.equal(rpgValiderDeck(deck.cardIds).ok, true, `${deck.id} doit passer la validation du serveur`);
  }
  // Un deck incomplet est écarté plutôt que proposé puis refusé à l'ouverture.
  const bancal = [...RPG_DECKS_ARCHETYPES, { id: 'bancal', name: 'Bancal', cardIds: ['une-carte'] }];
  assert.equal(decksPourDefi(bancal).some((deck) => deck.id === 'bancal'), false);
  assert.deepEqual(decksPourDefi(null), []);
});
