import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie, rpgAttaquerSorcier, rpgAttaquerCreature, rpgLancerAttaque } from '../src/games/rpgDuel.js';

const nouveau = (rng = () => .99) => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
function poser(d, cote, id) {
  d[cote].main.push(id);
  d[cote].mana = { braise: 30, eau: 30, sable: 30, neige: 30, tenebres: 30 };
  const r = rpgJouerCreature(d, cote, id);
  assert.equal(r.ok, true);
  return r.entite;
}
function sabre(d, cote, e) {
  d[cote].main.push('sabre-maudit');
  d[cote].mana.braise = 30;
  const tour = d.tour;
  d.tour = cote;
  const resultat = rpgLancerMagie(d, cote, 'sabre-maudit', e.id);
  d.tour = tour;
  assert.equal(resultat.ok, true, resultat.raison);
}
function pret(d, e) {
  Object.assign(e, { ready: true, attaquee: false });
  d.attaqueJouee = null;
}

test('Sabre maudit : deux Attaques ciblées épuisent le sabre, sans retirer le mot-clé natif', () => {
  const d = nouveau();
  const e = poser(d, 'joueur', 'tislit-des-aures');
  const base = { atk: e.atk, pv: e.pv, critique: e.coupCritique };
  sabre(d, 'joueur', e);
  assert.deepEqual(e.durabilitesArmes, [2]);
  pret(d, e);
  assert.equal(rpgAttaquerSorcier(d, 'joueur', e.id).ok, true);
  assert.deepEqual(e.durabilitesArmes, [1]);
  assert.equal(e.volDeVie, true);
  pret(d, e);
  assert.equal(rpgAttaquerSorcier(d, 'joueur', e.id).ok, true);
  assert.deepEqual(e.armes, []);
  assert.deepEqual(e.durabilitesArmes, []);
  assert.equal(d.joueur.cimetiere.filter(id => id === 'sabre-maudit').length, 1);
  assert.equal(e.atk, base.atk);
  assert.equal(e.pv, base.pv);
  assert.equal(e.volDeVie, false);
  assert.equal(e.coupRapide, true);
});

test('une arme-sort chargée sans compteur perd aussi de la durabilité', () => {
  const d = nouveau();
  const e = poser(d, 'joueur', 'tislit-des-aures');
  sabre(d, 'joueur', e);
  delete e.durabilitesArmes;
  pret(d, e);
  assert.equal(rpgAttaquerSorcier(d, 'joueur', e.id).ok, true);
  assert.deepEqual(e.durabilitesArmes, [1]);
});

test('le sabre s’use aussi en défense et ne retire pas l’armure déjà blessée deux fois', () => {
  const d = nouveau();
  const e = poser(d, 'sorcier', 'dune-marchante');
  const pvBase = e.pv;
  sabre(d, 'sorcier', e);
  for (let i = 0; i < 2; i++) {
    const attaquant = poser(d, 'joueur', 'chien-du-guet');
    pret(d, attaquant);
    assert.equal(rpgLancerAttaque(d, 'joueur', [attaquant.id], { [attaquant.id]: [e.id] }).ok, true);
    if (i === 0) assert.deepEqual(e.durabilitesArmes, [1]);
  }
  assert.deepEqual(e.armes, []);
  assert.ok(e.pv > 0 && e.pv <= pvBase);
  assert.equal(d.sorcier.cimetiere.filter(id => id === 'sabre-maudit').length, 1);
});


test('Attaque ciblée sur une créature : le sabre perd son dernier compteur', () => {
  const d = nouveau();
  const e = poser(d, 'joueur', 'tislit-des-aures');
  const cible = poser(d, 'sorcier', 'dune-marchante');
  Object.assign(cible, { pv: 50, pvMax: 50, def: 50, atk: 0 });
  sabre(d, 'joueur', e);
  e.durabilitesArmes = [1];
  pret(d, e);
  assert.equal(rpgAttaquerCreature(d, 'joueur', e.id, cible.id).ok, true);
  assert.deepEqual(e.armes, []);
  assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
  assert.equal(e.coupRapide, true);
});

test('deux sabres identiques gardent des compteurs indépendants', () => {
  const d = nouveau();
  const e = poser(d, 'joueur', 'tislit-des-aures');
  const atk = e.atk;
  sabre(d, 'joueur', e);
  pret(d, e);
  assert.equal(rpgAttaquerSorcier(d, 'joueur', e.id).ok, true);
  sabre(d, 'joueur', e);
  assert.deepEqual(e.durabilitesArmes, [1, 2]);
  pret(d, e);
  assert.equal(rpgAttaquerSorcier(d, 'joueur', e.id).ok, true);
  assert.deepEqual(e.armes, ['sabre-maudit']);
  assert.deepEqual(e.durabilitesArmes, [1]);
  assert.equal(e.atk, atk + 2);
  assert.equal(e.volDeVie, true);
});


for (const hasard of [.99, .01]) {
  test(`résolution réelle d’Attaque ciblée (${hasard === .99 ? 'touche' : 'rate'}) : le sabre s’use`, () => {
    const d = nouveau(() => hasard);
    const e = poser(d, 'joueur', 'tislit-des-aures');
    const cible = poser(d, 'sorcier', 'dune-marchante');
    Object.assign(cible, { pv: 50, pvMax: 50, def: 50, atk: 0 });
    sabre(d, 'joueur', e);
    e.durabilitesArmes = [1];
    pret(d, e);
    const r = rpgLancerAttaque(d, 'joueur', [e.id], {}, null, null, { [e.id]: cible.id });
    assert.equal(r.ok, true, r.raison);
    assert.deepEqual(e.armes, []);
    assert.ok(d.joueur.cimetiere.includes('sabre-maudit'));
    assert.equal(e.coupRapide, true);
  });
}
