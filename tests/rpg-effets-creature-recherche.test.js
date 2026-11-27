import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, carteAvecEffetCreature, armeById, magieById, RPG_MAGIE_CARDS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgJouerArme, rpgCartesRenfortChoisi, rpgResoudreRenfortChoisi, rpgMulligan, rpgDemarrerManaEssai, rpgAttaquerSorcier, rpgLancerAttaque } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaCandidatsRecherche, rpgMobaResoudreRecherche, rpgMobaJouerArme, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgCandidatsCoutInvocationSpeciale, rpgPayerCoutInvocationSpeciale, rpgMobaConditionImprimee } from '../src/games/rpgMobaEmbuscadesImprimees.js';

function partie() { return rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .5 }); }
function moba() {
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d); return d;
}

test('le Sabre maudit est uniquement une arme du catalogue et garde ses bonus', () => {
  assert.equal(cardById('sabre-maudit').kind, 'arme'); assert.ok(armeById('sabre-maudit'));
  assert.equal(magieById('sabre-maudit'), null); assert.equal(RPG_MAGIE_CARDS.some(c => c.id === 'sabre-maudit'), false);
  const d = partie(); d.joueur.main = ['chien-du-guet'];
  const e = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite; assert.ok(e);
  const atk = e.atk, pv = e.pv; d.joueur.main.push('sabre-maudit');
  const result = rpgJouerArme(d, 'joueur', 'sabre-maudit', e.id);
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(e.atk, atk + 2); assert.equal(e.pv, pv - 1);
  assert.equal(e.arme.carteId, 'sabre-maudit'); assert.equal(e.volDeVie, true); assert.ok(e.coupCritique);
});

test('Dune et Tiziri recherchent seulement une créature avec un effet', () => {
  for (const id of ['dune-marchante', 'tiziri-du-djurdjura']) {
    const d = partie(); d.joueur.main = [id]; d.joueur.deck = ['chien-du-guet', 'sabre-maudit', 'garde-du-voile'];
    const result = rpgJouerCreature(d, 'joueur', id); assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(d.renfortChoixEnAttente?.sourceCarteId, id);
    const candidats = rpgCartesRenfortChoisi(d, 'joueur');
    assert.deepEqual(candidats.map(c => c.id), ['garde-du-voile']);
    assert.equal(rpgResoudreRenfortChoisi(d, 'joueur', candidats[0].index).ok, true);
    assert.ok(d.joueur.main.includes('garde-du-voile'));
  }
  assert.equal(carteAvecEffetCreature('sabre-maudit'), false);
  assert.equal(carteAvecEffetCreature('garde-du-voile'), true);
});

test('le Ressac exige et exile la créature explicitement choisie', () => {
  const d = partie(); d.joueur.cimetiere = ['sabre-maudit', 'chien-du-guet'];
  assert.equal(rpgMobaConditionImprimee(d, 'joueur', 'sorcier-du-ressac-noir'), true);
  assert.deepEqual(rpgCandidatsCoutInvocationSpeciale(d, 'joueur', 'sorcier-du-ressac-noir'), ['chien-du-guet']);
  assert.equal(rpgPayerCoutInvocationSpeciale(d, 'joueur', 'sorcier-du-ressac-noir', 'sabre-maudit'), false);
  assert.equal(rpgPayerCoutInvocationSpeciale(d, 'joueur', 'sorcier-du-ressac-noir', 'chien-du-guet'), true);
  assert.deepEqual(d.joueur.exil, ['chien-du-guet']); assert.deepEqual(d.joueur.cimetiere, ['sabre-maudit']);
});

test('en Conquête la recherche propose la même sélection', () => {
  const d = moba(); d.joueur.main = ['dune-marchante']; d.joueur.deck = ['chien-du-guet', 'sabre-maudit', 'garde-du-voile'];
  const result = rpgMobaJouerCreature(d, 'joueur', 'dune-marchante', 'right', 0);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(rpgMobaCandidatsRecherche(d, 'joueur'), ['garde-du-voile']);
  assert.equal(rpgMobaResoudreRecherche(d, 'joueur', 'garde-du-voile').ok, true);
});

test('en Conquête le Sabre est équipé comme une arme', () => {
  const d = moba(); d.joueur.main = ['chien-du-guet'];
  const e = rpgMobaJouerCreature(d, 'joueur', 'chien-du-guet', 'right', 0).entite; assert.ok(e);
  d.joueur.main = ['sabre-maudit'];
  const result = rpgMobaJouerArme(d, 'joueur', 'sabre-maudit', e.id);
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(e.arme?.carteId, 'sabre-maudit'); assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('le Sabre remplacé rend ses bonus et rejoint le cimetière', () => {
  const d = partie(); d.joueur.main = ['chien-du-guet'];
  const e = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite;
  const avant = { atk: e.atk, pv: e.pv, pvMax: e.pvMax };
  d.joueur.main.push('sabre-maudit', 'takouba-des-pistes');
  assert.equal(rpgJouerArme(d, 'joueur', 'sabre-maudit', e.id).ok, true);
  assert.equal(e.arme.durabilite, 2);
  assert.equal(rpgJouerArme(d, 'joueur', 'takouba-des-pistes', e.id).ok, true);
  assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
  assert.equal(e.volDeVie, false);
  const autreArme = armeById('takouba-des-pistes');
  assert.equal(e.atk, avant.atk + autreArme.bonus.atk);
  assert.equal(e.pv, avant.pv + autreArme.bonus.def);
});

test('sans créature admissible Dune et Tiziri ne bloquent pas la partie', () => {
  for (const id of ['dune-marchante', 'tiziri-du-djurdjura']) {
    const d = partie(); d.joueur.main = [id]; d.joueur.deck = ['chien-du-guet', 'sabre-maudit'];
    assert.equal(rpgJouerCreature(d, 'joueur', id).ok, true);
    assert.equal(Boolean(d.renfortChoixEnAttente), false);
    assert.deepEqual(d.joueur.deck, ['chien-du-guet', 'sabre-maudit']);
  }
});

test('la recherche conserve les exemplaires identiques et refuse les autres cartes', () => {
  const d = partie(); d.joueur.main = ['dune-marchante']; d.joueur.deck = ['garde-du-voile', 'chien-du-guet', 'garde-du-voile'];
  assert.equal(rpgJouerCreature(d, 'joueur', 'dune-marchante').ok, true);
  assert.deepEqual(rpgCartesRenfortChoisi(d, 'joueur').map(c => c.index), [0, 2]);
  assert.equal(rpgResoudreRenfortChoisi(d, 'joueur', 1).ok, false);
  assert.equal(rpgResoudreRenfortChoisi(d, 'joueur', 2).ok, true);
  assert.deepEqual(d.joueur.deck, ['garde-du-voile', 'chien-du-guet']);
});


test('le Sabre perd son endurance et ses effets après deux attaques', () => {
  const d = partie(); d.joueur.main = ['chien-du-guet'];
  const e = rpgJouerCreature(d, 'joueur', 'chien-du-guet').entite;
  const base = { atk: e.atk, pv: e.pv };
  d.joueur.main = ['sabre-maudit']; assert.equal(rpgJouerArme(d, 'joueur', 'sabre-maudit', e.id).ok, true);
  for (let i = 1; i >= 0; i--) {
    Object.assign(e, { ready: true, attaquee: false, malInvocation: false }); d.attaqueJouee = null;
    assert.equal(rpgLancerAttaque(d, 'joueur', [e.id], {}).ok, true);
    if (i) assert.equal(e.arme.durabilite, i);
  }
  assert.equal(e.arme, null); assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
  assert.equal(e.atk, base.atk); assert.equal(e.pv, base.pv); assert.equal(e.volDeVie, false);
});

test('une ancienne sauvegarde avec le Sabre attaché conserve son usure', () => {
  const d = partie(); d.joueur.main = ['tislit-des-aures'];
  const e = rpgJouerCreature(d, 'joueur', 'tislit-des-aures').entite;
  const base = { atk: e.atk, pv: e.pv };
  e.atk += 2; e.pv -= 1; e.def -= 1; e.pvMax -= 1;
  e.armes = ['sabre-maudit']; e.durabilitesArmes = [1]; e.volDeVie = true;
  Object.assign(e, { ready: true, attaquee: false, malInvocation: false });
  assert.equal(rpgAttaquerSorcier(d, 'joueur', e.id).ok, true);
  assert.deepEqual(e.armes, []); assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
  assert.equal(e.atk, base.atk); assert.equal(e.pv, base.pv); assert.equal(e.volDeVie, false);
});
