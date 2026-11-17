import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour, rpgAttaquerSorcier } from '../src/games/rpgDuel.js';
import { rpgCiblesIndividuellesClassique, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique, rpgChoisirAttaqueIndividuelleClassiqueIA } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle } from '../src/games/rpgMobaLocal.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { mobaVoie } from '../src/games/rpgMoba.js';

function classique(side, pvp = false) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => .9 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  d.pvp = pvp; d.tour = side;
  const poser = (camp, id = 'ashigaru-des-braises') => {
    d[camp].invocationNormaleJouee = false; d[camp].main.push(id);
    const avant = d.tour; d.tour = camp;
    const result = rpgJouerCreature(d, camp, id); d.tour = avant;
    assert.ok(result.ok, result.raison); result.entite.ready = true; result.entite.malInvocation = false;
    return result.entite;
  };
  return { d, poser };
}

for (const side of ['joueur', 'sorcier']) for (const pvp of [false, true]) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} ${pvp ? 'PvP' : 'duel'} : champ vide, créatures, Envol et Défenseur`, () => {
    const { d, poser } = classique(side, pvp), a = poser(side);
    const choix = () => rpgCiblesIndividuellesClassique(d, side, a.id);
    assert.equal(choix().directe, true);
    const c = poser(enemy); c.envol = true; c.infiltration = true; c.gelToursRestants = 1; c.attaquee = true;
    assert.equal(choix().directe, false, 'une créature inaccessible ou engagée protège aussi');
    a.coupRapide = true; a.infiltration = true;
    assert.equal(choix().directe, false, 'Infiltration et Attaque ciblée ne contournent pas la règle');
    assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, side, a.id, null).raison, 'cible');
    a.envol = true;
    assert.equal(choix().directe, true, 'un ennemi volant ne bloque pas Envol');
    c.defenseurAccorde = true;
    assert.equal(choix().directe, false, 'tout Défenseur bloque, même inaccessible et contre Infiltration');
    assert.equal(rpgDeclarerAttaqueIndividuelleClassique(d, side, a.id, null).raison, 'cible');
    c.defenseurAccorde = false;
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, side, a.id, null).ok);
    const pv = d[enemy].pv;
    assert.ok(rpgResoudreAttaqueIndividuelleClassique(d, side).ok);
    assert.equal(d[enemy].pv, pv - a.atk);
  });
}

test('une réponse modifiant le terrain rend la frappe directe illégale sans la rediriger', () => {
  for (const volant of [false, true]) {
    const { d, poser } = classique('joueur'), a = poser('joueur'); a.envol = volant;
    assert.ok(rpgDeclarerAttaqueIndividuelleClassique(d, 'joueur', a.id).ok);
    // Une créature arrive pendant la fenêtre de réponse.
    const c = { id: 'nouveau', carteId: 'ashigaru-des-braises', pv: 2, def: 2, ...(volant ? { defenseurAccorde: true } : {}) };
    d.sorcier.creatures.push(c);
    const pv = d.sorcier.pv;
    assert.equal(rpgResoudreAttaqueIndividuelleClassique(d, 'joueur').annule, true);
    assert.equal(d.sorcier.pv, pv);
  }
});

test('raccourci historique et IA ne contournent pas les nouvelles règles', () => {
  const { d, poser } = classique('sorcier'), a = poser('sorcier');
  poser('joueur'); d.joueur.pv = 1;
  assert.equal(rpgAttaquerSorcier(d, 'sorcier', a.id).raison, 'cible-obligatoire');
  const action = rpgChoisirAttaqueIndividuelleClassiqueIA(d);
  assert.ok(!action || action.cibleId !== null);
});

function moba(side, voieEnnemie = 'left') {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  rpgMulligan(d, 'joueur', []); rpgMulligan(d, 'sorcier', []); rpgDemarrerManaEssai(d);
  if (d.tour !== enemy) rpgFinDeTour(d);
  d[enemy].main = ['ashigaru-des-braises'];
  const c = rpgMobaJouerCreature(d, enemy, 'ashigaru-des-braises', voieEnnemie, 0).entite;
  rpgFinDeTour(d); d[side].main = ['ashigaru-des-braises'];
  const a = rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(a && c); a.ready = true; a.malInvocation = false;
  return { d, a, c, enemy };
}
for (const side of ['joueur', 'sorcier']) {
  test(`${side} en Conquête : règle par voie et défenseur même inaccessible`, () => {
    const { d, a, c, enemy } = moba(side);
    const choix = () => rpgMobaCiblesIndividuelles(d, side, a.id, 'left');
    assert.equal(choix().directe, false);
    a.infiltration = true; a.coupRapide = true;
    assert.equal(choix().directe, false);
    a.envol = true; c.envol = true; c.infiltration = true;
    assert.equal(choix().directe, true);
    c.defenseurAccorde = true;
    assert.equal(choix().directe, false);
    assert.equal(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').raison, 'cible');
    c.defenseurAccorde = false;
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, side, a.id, null, 'left').ok);
    const pv = mobaVoie(d.moba, 'left').hp[enemy];
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, side).ok);
    assert.equal(mobaVoie(d.moba, 'left').hp[enemy], pv - a.atk);
  });
}

test('un Site ne compte pas comme une créature pour la frappe directe', () => {
  const { d, poser } = classique('joueur'); const a = poser('joueur');
  d.sorcier.creatures.push({ id: 'site', carteId: 'source-de-bimini' });
  assert.equal(rpgCiblesIndividuellesClassique(d, 'joueur', a.id).directe, true);
});

test('Conquête : une créature dans une autre voie ne protège pas la voie attaquée', () => {
  const { d, a, c } = moba('joueur', 'right');
  c.defenseurAccorde = true;
  assert.equal(rpgMobaCiblesIndividuelles(d, 'joueur', a.id, 'left').directe, true);
  const result = rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, null, 'left');
  assert.ok(result.ok, JSON.stringify(result));
  assert.ok(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').ok);
});

test('Conquête : un Défenseur apparu en réponse annule la frappe volante', () => {
  const { d, a, c } = moba('joueur'); a.envol = true;
  assert.ok(rpgMobaDeclarerAttaqueIndividuelle(d, 'joueur', a.id, null, 'left').ok);
  c.defenseurAccorde = true;
  const pv = mobaVoie(d.moba, 'left').hp.sorcier;
  assert.equal(rpgMobaResoudreAttaqueIndividuelle(d, 'joueur').annule, true);
  assert.equal(mobaVoie(d.moba, 'left').hp.sorcier, pv);
});
