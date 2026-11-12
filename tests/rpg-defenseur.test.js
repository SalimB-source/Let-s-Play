import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, RPG_TOUR_CARDS, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { effetsDetailles } from '../src/games/effetIcons.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgCiblesAttaqueRapide, rpgBlesserCreature } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';
import { RPG_REVELATIONS_PAR_ETAGE } from '../src/games/rpgCollection.js';
import { existsSync } from 'node:fs';

function scene(rng = () => 0.5) {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  duel.phase = 'principale'; duel.tour = 'joueur';
  duel.mulliganFait = { joueur: true, sorcier: true };
  duel.joueur.creatures.push({ id: 'a', carteId: 'feriel', name: 'Fériel', coupRapide: true, ready: true, attaquee: false, atk: 3, pv: 3 });
  duel.sorcier.creatures.push(
    { id: 'normal', carteId: 'chien-du-guet', name: 'Chien', ready: true, atk: 2, pv: 2 },
    { id: 'mur', carteId: 'tour-de-sable', name: 'Tour', prioriteAttaqueRapide: true, attaquee: true, atk: 1, pv: 6 },
    { id: 'chevalier', carteId: 'pourfendeur-des-djinns', name: 'Pourfendeur', defenseur: true, gelToursRestants: 1, atk: 3, pv: 3 },
  );
  return duel;
}
const attaquer = (duel, cible) => rpgLancerAttaque(duel, 'joueur', ['a'], null, null, null, { a: cible });
const declarer = (duel, cible) => rpgPvpAppliquer(duel, 'joueur', { type: 'attaquer', declarer: true, attaquants: ['a'], ciblesAttaque: { a: cible } });

test('le catalogue présente les cinq Tours et le Pourfendeur avec Défenseur et une bulle', () => {
  for (const carte of [...RPG_TOUR_CARDS, cardById('pourfendeur-des-djinns')]) {
    assert.equal(carte.defenseur, true, carte.id);
    const { pastilles, texte } = effetsDetailles(carte);
    const pastille = pastilles.find(p => p.cle === 'defenseur');
    assert.equal(pastille?.label, 'Défenseur');
    assert.match(pastille.description, /attaque adverse.*priorité/i);
    assert.match(pastille.description, /ne force pas à attaquer/i);
    if (carte.mur) { assert.match(texte, /ne peut ni attaquer ni être équipée/i); assert.doesNotMatch(carte.text, /Priorité d’attaque rapide/); }
  }
  const chevalier = cardById('pourfendeur-des-djinns');
  assert.deepEqual([chevalier.element, chevalier.cost, chevalier.atk, chevalier.def, chevalier.contreAttaque], ['sable', 4, 3, 4, true]);
  assert.ok(!effetsDetailles(chevalier).pastilles.some(p => p.cle === 'bouclier'));
  assert.ok(RPG_REVELATIONS_PAR_ETAGE['souk-1'].includes(chevalier.id));
  assert.ok(existsSync('public/cards/pourfendeur-des-djinns.jpg'));
});

test('solo : un Défenseur attire les tirs même engagé ou gelé, et ne force pas à attaquer', () => {
  let duel = scene();
  const avant = JSON.stringify(duel);
  assert.equal(attaquer(duel, 'normal').raison, 'defenseur');
  assert.equal(JSON.stringify(duel), avant);
  assert.equal(attaquer(duel, 'chevalier').ok, true, 'choix libre entre Défenseurs');
  duel = scene();
  assert.equal(attaquer(duel, 'mur').ok, true, 'ancienne propriété des sauvegardes');
  duel = scene();
  duel.sorcier.creatures = duel.sorcier.creatures.filter(e => e.id === 'normal');
  assert.equal(attaquer(duel, 'normal').ok, true, 'sans Défenseur les règles restent inchangées');
});

test('le Drakkar posé en duel attire les Attaques ciblées', () => {
  const duel = scene();
  duel.sorcier.creatures = duel.sorcier.creatures.filter(e => e.id === 'normal');
  duel.sorcier.mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
  duel.sorcier.main.push('drakkar-a-tete-de-dragon');
  duel.sorcier.creatures.push({ id: 'victime', carteId: 'chien-du-guet', name: 'Chien', atk: 1, def: 1, pv: 1 });
  const pose = rpgJouerCreature(duel, 'sorcier', 'drakkar-a-tete-de-dragon', null, { sacrificeId: 'victime' });
  assert.equal(pose.ok, true, JSON.stringify(pose));
  assert.equal(pose.entite.defenseur, true);
  assert.equal(attaquer(duel, 'normal').raison, 'defenseur');
  assert.equal(attaquer(duel, pose.entite.id).ok, true);
});

test('PvP refuse une autre cible sans mutation puis accepte un Défenseur', () => {
  const duel = scene();
  const avant = JSON.stringify(duel);
  assert.equal(declarer(duel, 'normal').raison, 'defenseur');
  assert.equal(JSON.stringify(duel), avant);
  assert.equal(declarer(duel, 'mur').ok, true);
});

test('l’IA choisit un Défenseur et ne cible les autres que si aucun n’est légal', () => {
  const duel = scene();
  const choix = rpgCiblesAttaqueRapide(duel, 'joueur', ['a']);
  assert.ok(['mur', 'chevalier'].includes(choix.a));
});

test('le Pourfendeur arrive sans bouclier avec Défenseur et Contre-attaque', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
  duel.joueur.mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
  duel.joueur.main.push('pourfendeur-des-djinns');
  const pose = rpgJouerCreature(duel, 'joueur', 'pourfendeur-des-djinns');
  assert.equal(pose.ok, true);
  assert.equal(pose.entite.defenseur, true);
  assert.ok(!pose.entite.bouclier);
  assert.equal(pose.entite.contreAttaque, true);
  assert.equal(pose.entite.pv, 4);
});

test('plusieurs tirs doivent chacun choisir un Défenseur, sans forcer les autres à attaquer', () => {
  const duel = scene();
  duel.joueur.creatures.push({ id: 'b', carteId: 'feriel', name: 'Fériel 2', coupRapide: true, ready: true, attaquee: false, atk: 2, pv: 2 });
  const avant = JSON.stringify(duel);
  const res = rpgPvpAppliquer(duel, 'joueur', { type: 'attaquer', declarer: true, attaquants: ['a', 'b'], ciblesAttaque: { a: 'mur', b: 'normal' } });
  assert.equal(res.raison, 'defenseur');
  assert.equal(JSON.stringify(duel), avant);
  const valide = rpgPvpAppliquer(duel, 'joueur', { type: 'attaquer', declarer: true, attaquants: ['a'], ciblesAttaque: { a: 'chevalier' } });
  assert.equal(valide.ok, true);
  assert.equal(duel.joueur.creatures.find(e => e.id === 'b').attaquee, false);
});

test('un Défenseur arrivé après la déclaration ne change pas la cible déjà désignée', () => {
  const duel = scene();
  const res = rpgLancerAttaque(duel, 'joueur', ['a'], null, null, null, { a: 'normal' }, { attaqueDeclaree: true });
  assert.equal(res.ok, true);
});

test('la fiche et la carte sur table montrent la nouvelle icône Défenseur', async () => {
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { JSDOM } = await import('jsdom');
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { PastillesCarte, IconesCarte } = await vite.ssrLoadModule('/src/games/effetIcons.jsx');
    for (const carte of [cardById('tour-de-sable'), cardById('pourfendeur-des-djinns'), cardById('drakkar-a-tete-de-dragon')]) {
      const rendu = (Composant) => new JSDOM(renderToStaticMarkup(React.createElement(Composant, { carte }))).window.document;
      const pastille = rendu(PastillesCarte).querySelector('[data-pastille="defenseur"]');
      assert.match(pastille?.textContent ?? '', /Défenseur/);
      assert.match(pastille?.getAttribute('aria-label') ?? '', /attaque adverse.*priorité/i);
      assert.ok(rendu(IconesCarte).querySelector('[data-effet="defenseur"] use[href="#i-defenseur"]'));
    }
  } finally { await vite.close(); }
});

test('les nouveaux Défenseurs Braise et Sable sont jouables et disponibles', async () => {
  const { COLLECTION_DEPART } = await import('../src/games/rpgCollection.js');
  for (const [id, element, cost, atk, def, provocation] of [
    ['gardien-de-la-porte-ardente', 'braise', 3, 2, 4, true],
    ['gardienne-des-portes-de-sable', 'sable', 2, 1, 4, false],
  ]) {
    const carte = cardById(id);
    assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def, carte.defenseur, !!carte.provocation], [element, cost, atk, def, true, provocation]);
    if (id === 'gardien-de-la-porte-ardente') {
      assert.equal(carte.riposteAttaqueCiblee, 1);
      assert.match(carte.text, /Attaque ciblée.*1 dégât/);
    }
    assert.ok(COLLECTION_DEPART.includes(id));
    assert.ok(existsSync(`public/cards/${id}.jpg`));
    assert.ok(effetsDetailles(carte).pastilles.some(p => p.cle === 'defenseur'));
    for (const cote of ['joueur', 'sorcier']) {
      const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
      d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
      d[cote].main.push(id);
      const r = rpgJouerCreature(d, cote, id);
      assert.ok(r.ok, `${id}: ${r.raison}`);
      assert.equal(r.entite.atk, atk, `${id} : attaque sur le plateau`);
      assert.equal(r.entite.pv, def, `${id} : points de vie sur le plateau`);
      assert.equal(r.entite.defenseur, true);
      assert.equal(!!r.entite.provocation, provocation);
    }
  }
});

test('les nouveaux Défenseurs protègent les autres créatures des Attaques ciblées', () => {
  for (const id of ['gardien-de-la-porte-ardente', 'gardienne-des-portes-de-sable']) {
    const d = scene();
    d.sorcier.creatures = d.sorcier.creatures.filter(e => e.id === 'normal');
    d.sorcier.mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
    d.sorcier.main.push(id);
    const defenseur = rpgJouerCreature(d, 'sorcier', id).entite;
    assert.equal(attaquer(d, 'normal').raison, 'defenseur');
    assert.equal(attaquer(d, defenseur.id).ok, true);
  }
});

const poserGardienBraise = (duel) => {
  duel.sorcier.creatures = [];
  duel.sorcier.mana = Object.fromEntries(RPG_ELEMENTS.map((element) => [element, 30]));
  duel.sorcier.main.push('gardien-de-la-porte-ardente');
  return rpgJouerCreature(duel, 'sorcier', 'gardien-de-la-porte-ardente').entite;
};

test('le Gardien 2/4 inflige exactement 1 dégât à la créature qui le vise avec Attaque ciblée', () => {
  const duel = scene();
  const gardien = poserGardienBraise(duel);
  const attaquant = duel.joueur.creatures[0];
  assert.equal(attaquer(duel, gardien.id).ok, true);
  assert.equal(gardien.pv, 1, 'il encaisse la frappe de 3 sur ses 4 PV');
  assert.equal(attaquant.pv, 2, 'la réplique retire 1 PV, pas les 2 ATQ du Gardien');
  assert.match(duel.log.join(' '), /Gardien de la porte ardente réplique à l’Attaque ciblée.*1 dégât/);
});

test('le Gardien réplique même si l’Attaque ciblée rate ou le détruit', () => {
  const rate = scene(() => 0);
  const gardienRate = poserGardienBraise(rate);
  const attaquantRate = rate.joueur.creatures[0];
  assert.equal(attaquer(rate, gardienRate.id).ok, true);
  assert.equal(gardienRate.pv, 4);
  assert.equal(attaquantRate.pv, 2, 'être ciblé suffit à déclencher la réplique');

  const mortel = scene();
  const gardienMortel = poserGardienBraise(mortel);
  const attaquantMortel = mortel.joueur.creatures[0];
  attaquantMortel.atk = 5;
  assert.equal(attaquer(mortel, gardienMortel.id).ok, true);
  assert.ok(!mortel.sorcier.creatures.includes(gardienMortel));
  assert.equal(attaquantMortel.pv, 2, 'la cible détruite répond quand même');
});

test('la réplique du Gardien ne part ni sur une magie ni sur un combat bloqué ordinaire', () => {
  const duel = scene();
  const gardien = poserGardienBraise(duel);
  const attaquant = duel.joueur.creatures[0];
  rpgBlesserCreature(duel, 'sorcier', gardien.id, 1, ['sable'], null, 'magie');
  assert.equal(attaquant.pv, 3);
  attaquant.coupRapide = false;
  attaquant.atk = 1;
  assert.equal(rpgLancerAttaque(duel, 'joueur', [attaquant.id], { [attaquant.id]: [gardien.id] }).ok, true);
  assert.equal(attaquant.pv, 1, 'seuls les 2 dégâts du blocage normal sont subis');
});

test('le gardien Braise attire un bloqueur quand il attaque, sans obligation d’attaquer', () => {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.9 });
  for (const c of ['joueur', 'sorcier']) d[c].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
  d.joueur.main.push('gardien-de-la-porte-ardente');
  d.sorcier.main.push('dune-marchante');
  const a = rpgJouerCreature(d, 'joueur', 'gardien-de-la-porte-ardente').entite;
  const b = rpgJouerCreature(d, 'sorcier', 'dune-marchante').entite;
  a.ready = true;
  assert.equal(rpgLancerAttaque(d, 'joueur', [a.id], {}).raison, 'provocation');
  assert.equal(rpgLancerAttaque(d, 'joueur', [a.id], { [a.id]: [b.id] }).ok, true);
});

test('le Gardien viking du fjord protège ses alliés et soutient la Compagnie viking', async () => {
  const { cardHasPrintedType } = await import('../src/games/rpgCards.js');
  const { COLLECTION_DEPART } = await import('../src/games/rpgCollection.js');
  const id = 'gardien-viking-du-fjord', carte = cardById(id);
  assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def, carte.defenseur], ['neige', 3, 2, 4, true]);
  assert.ok(cardHasPrintedType(carte, 'viking'));
  assert.equal(carte.furie, 1);
  assert.ok(effetsDetailles(carte).pastilles.some(p => p.cle === 'furie'));
  assert.ok(COLLECTION_DEPART.includes(id));
  assert.ok(existsSync(`public/cards/${id}.jpg`));
  assert.ok(effetsDetailles(carte).pastilles.some(p => p.cle === 'defenseur'));
  const d = scene();
  d.sorcier.creatures = d.sorcier.creatures.filter(e => e.id === 'normal');
  d.sorcier.mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 30]));
  d.sorcier.main.push('eirik-du-premier-serment', id);
  const eirik = rpgJouerCreature(d, 'sorcier', 'eirik-du-premier-serment').entite;
  const gardien = rpgJouerCreature(d, 'sorcier', id).entite;
  assert.equal(gardien.defenseur, true);
  assert.deepEqual([eirik.atk, eirik.def], [2, 2]);
  assert.equal(gardien.atk, 2);
  rpgBlesserCreature(d, 'sorcier', gardien.id, 1);
  assert.equal(gardien.atk, 3, 'Furie 1 augmente son attaque lorsqu’il est blessé');
  assert.equal(attaquer(d, 'normal').raison, 'defenseur');
  assert.equal(attaquer(d, gardien.id).ok, true);
});

test('Tour des Ténèbres : la vague respecte le coût en jeu modifié par le Grappin', () => {
  const d=rpgNouveauDuel({joueurDeck:[],sorcierDeck:[]});d.joueur.mana=Object.fromEntries(RPG_ELEMENTS.map(e=>[e,30]));
  d.sorcier.creatures.push({id:'cher',carteId:'gardienne-des-portes-de-sable',name:'Gardienne armée',atk:1,pv:4,def:4,pvMax:4,coutBonusArme:1}, {id:'faible',carteId:'mousse-des-galiotes',name:'Mousse',atk:1,pv:1,def:1,pvMax:1});
  d.joueur.main.push('tour-des-tenebres');assert.equal(rpgJouerCreature(d,'joueur','tour-des-tenebres').ok,true);
  assert.ok(d.sorcier.creatures.some(e=>e.id==='cher'));assert.ok(!d.sorcier.creatures.some(e=>e.id==='faible'));
});
