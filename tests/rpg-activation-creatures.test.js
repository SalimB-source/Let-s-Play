import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById } from '../src/games/rpgCards.js';
import { retoursAuDeckInvocation } from '../src/games/rpgInvocation.js';
import {
  rpgActiverCapacite, rpgCiblesActivationLegales, rpgConsommerSoins, rpgFinDeTour,
  rpgJouerCreature, rpgNouveauDuel, rpgPeutActiverCapacite,
} from '../src/games/rpgDuel.js';
import { texteActivation } from '../src/games/rpgActivationTexte.js';
import { choisirActivationIA } from '../src/games/rpgAI.js';

const hotes = RPG_DUEL_CARDS.filter((carte) => carte.activation);

function duel(rng = () => 0.9) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  for (const c of ['joueur', 'sorcier']) {
    d[c].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 20]));
    d[c].deck = Array(12).fill('gerboise-des-ruines');
  }
  return d;
}

function poser(d, cote, id, { malade = false } = {}) {
  const tour = d.tour; d.tour = cote; d[cote].invocationNormaleJouee = false;
  d[cote].main.push(id);
  const monnaie = ['chien-du-guet', 'porteuse-de-cruches', 'gerboise-des-ruines'];
  const retourIds = [];
  for (let i = 0; i < retoursAuDeckInvocation(cardById(id)); i++) { d[cote].main.push(monnaie[i]); retourIds.push(monnaie[i]); }
  const res = rpgJouerCreature(d, cote, id, null, retourIds.length ? { retourIds } : {});
  d.tour = tour;
  assert.equal(res.ok, true, `pose ${id} : ${res.raison}`);
  res.entite.ready = !malade; res.entite.malInvocation = malade;
  return res.entite;
}

function activer(d, sourceId, cibleId = null) {
  const avant = Number(d.combatAnimationSeq) || 0;
  rpgConsommerSoins(d);
  const res = rpgActiverCapacite(d, 'joueur', sourceId, cibleId);
  const tirs = (d.combatAnimations ?? []).filter((a) => a.id > avant && a.type === 'projectile-combat');
  return { res, tirs: tirs.map((t) => ({ v: t.variante, c: t.cible })) };
}

// ── Demande 3 : le mal d'invocation tient aussi l'effet activé ──────────────

test('une créature qui vient d’arriver n’active pas son effet', () => {
  const d = duel();
  d.tour = 'joueur';
  const scribe = poser(d, 'joueur', 'scribe-de-la-liste', { malade: true });
  poser(d, 'sorcier', 'dune-marchante');
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', scribe.id), false,
    'le bouton ne se propose pas');
  assert.equal(rpgActiverCapacite(d, 'joueur', scribe.id).raison, 'mal-invocation',
    'le moteur refuse pour la même raison que l’attaque');
  assert.equal(d.joueur.main.length, 0, 'rien n’est pioché');

  scribe.ready = true; scribe.malInvocation = false;   // le tour suivant
  assert.equal(rpgPeutActiverCapacite(d, 'joueur', scribe.id), true);
  assert.equal(activer(d, scribe.id).res.ok, true);
  assert.equal(d.joueur.main.length, 1, 'l’effet part une fois la créature dégagée');
});

// ── Demande 2 : les sorts confiés à des créatures ───────────────────────────

test('chaque effet activé est annoncé, jouable et dit ce qu’il fait', () => {
  assert.ok(hotes.length >= 19, `${hotes.length} créatures portent un effet activé`);
  for (const carte of hotes) {
    const { activation } = carte;
    assert.equal(activation.uneFoisParTour, true, `${carte.id} : une fois par tour`);
    assert.ok(['aucune', 'creature', 'creature-amie'].includes(activation.cible),
      `${carte.id} : portée lisible (${activation.cible})`);
    assert.ok(activation.effet?.type, `${carte.id} : un effet, pas seulement un coût`);

    const phrase = texteActivation(carte);
    assert.match(phrase, /^1\/tour — .+\.$/u, `${carte.id} : « ${phrase} »`);
    assert.doesNotMatch(phrase, /undefined|NaN|\[object/u, `${carte.id} : « ${phrase} »`);

    // La liste de cibles suit la portée : rien à désigner, ou des identifiants.
    const d = duel();
    d.tour = 'joueur';
    const source = poser(d, 'joueur', carte.id);
    poser(d, 'sorcier', 'dune-marchante');
    const legales = rpgCiblesActivationLegales(d, 'joueur', source.id);
    if (activation.cible === 'aucune') assert.equal(legales, null, `${carte.id} ne désigne personne`);
    else assert.ok(Array.isArray(legales), `${carte.id} : une liste de cibles`);
  }
});

test('la Dévoreuse mange sous son seuil, et rien au-dessus', () => {
  const d = duel();
  d.tour = 'joueur';
  const devoreuse = poser(d, 'joueur', 'la-devoreuse');
  const proie = poser(d, 'sorcier', 'chien-du-guet');          // coût 2
  const tropGrosse = poser(d, 'sorcier', 'dune-marchante');    // coût 3
  const legales = rpgCiblesActivationLegales(d, 'joueur', devoreuse.id);
  assert.deepEqual(legales, [proie.id], 'le seuil de coût est lu comme pour le sort');
  assert.equal(rpgActiverCapacite(d, 'joueur', devoreuse.id, tropGrosse.id).raison, 'cible');

  const { res, tirs } = activer(d, devoreuse.id, proie.id);
  assert.equal(res.ok, true);
  assert.equal(d.sorcier.creatures.length, 1, 'la proie tombe');
  assert.equal(d.sorcier.cimetiere.length, 1);
  assert.deepEqual(tirs.map((t) => t.v), ['ruine'], 'la tête de ce qui tombe');
});

test('le Lecteur du dernier nom vide une carte de la main adverse', () => {
  const d = duel();
  d.tour = 'joueur';
  const lecteur = poser(d, 'joueur', 'lecteur-du-dernier-nom');
  d.sorcier.main.push('chien-du-guet', 'gerboise-des-ruines');
  assert.equal(rpgCiblesActivationLegales(d, 'joueur', lecteur.id), null);
  const { res, tirs } = activer(d, lecteur.id);
  assert.equal(res.ok, true);
  assert.equal(d.sorcier.main.length, 1);
  assert.equal(d.sorcier.cimetiere.length, 1);
  assert.deepEqual(tirs.map((t) => t.c.type), ['sorcier'], 'la plume part au sorcier adverse');
});

test('l’Embuscade du Gardien maigrit la table adverse jusqu’à la fin du tour', () => {
  const d = duel();
  d.tour = 'joueur';
  const gardien = poser(d, 'joueur', 'gardien-viking-du-fjord');
  const adverse = poser(d, 'sorcier', 'dune-marchante');       // 2/4
  const { res } = activer(d, gardien.id);
  assert.equal(res.ok, true);
  assert.equal(adverse.atk, 1, '-2/+0, sans descendre sous 1');
  assert.equal(adverse.def, 2, '0/+2');
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(adverse.atk, 2, 'le maléfice tombe avec le tour');
});

test('l’Ifrit brise une arme équipée, puis pioche', () => {
  const d = duel();
  d.tour = 'joueur';
  const ifrit = poser(d, 'joueur', 'ifrit-des-ergs');
  const porteur = poser(d, 'sorcier', 'dune-marchante');
  const nu = poser(d, 'sorcier', 'chien-du-guet');
  porteur.arme = { carteId: 'lame-de-mer', restant: 2 };
  assert.deepEqual(rpgCiblesActivationLegales(d, 'joueur', ifrit.id), [porteur.id],
    'seule une créature équipée se brise');
  const avant = d.joueur.main.length;
  const { res } = activer(d, ifrit.id, porteur.id);
  assert.equal(res.ok, true);
  assert.equal(porteur.arme, null);
  assert.equal(d.joueur.main.length, avant + 1);
  assert.ok(nu, 'le porteur reste en jeu, son arme non');
});

test('Kagutsuchi brûle toutes les autres créatures, les deux camps compris', () => {
  const d = duel();
  d.tour = 'joueur';
  const kagutsuchi = poser(d, 'joueur', 'kagutsuchi-flamme-originelle');
  const allie = poser(d, 'joueur', 'dune-marchante');
  const adverse = poser(d, 'sorcier', 'dune-marchante');
  const pvAllie = allie.pv; const pvAdverse = adverse.pv;
  const { res, tirs } = activer(d, kagutsuchi.id);
  assert.equal(res.ok, true);
  assert.equal(allie.pv, pvAllie - 2);
  assert.equal(adverse.pv, pvAdverse - 2);
  assert.equal(kagutsuchi.pv, kagutsuchi.pvMax, 'elle s’épargne');
  assert.ok(tirs.every((t) => t.v === 'feu'), 'la braise de l’élément');
});

test('l’annonce de l’effet précède son résultat dans le journal', () => {
  const d = duel();
  d.tour = 'joueur';
  const devoreuse = poser(d, 'joueur', 'la-devoreuse');
  const proie = poser(d, 'sorcier', 'chien-du-guet');
  d.log.length = 0;
  activer(d, devoreuse.id, proie.id);
  const annonce = d.log.findIndex((ligne) => ligne.includes('active son effet'));
  assert.ok(annonce >= 0, `journal : ${JSON.stringify(d.log)}`);
  assert.equal(annonce, 0, 'l’effet n’est pas annoncé après son propre résultat');
});

test('l’IA active ses créatures, et jamais une créature qui vient d’arriver', () => {
  const d = duel();
  d.tour = 'sorcier';
  const devoreuse = poser(d, 'sorcier', 'la-devoreuse', { malade: true });
  const proie = poser(d, 'joueur', 'chien-du-guet');
  assert.equal(choisirActivationIA(d, 'sorcier', { rng: () => 0.9 }), null,
    'le mal d’invocation retient aussi l’IA');

  devoreuse.ready = true; devoreuse.malInvocation = false;
  assert.deepEqual(choisirActivationIA(d, 'sorcier', { rng: () => 0.9 }),
    { entiteId: devoreuse.id, cibleId: proie.id }, 'elle mange ce qui passe sous son seuil');

  // Une main pleine n’appelle pas la pioche, et un sorcier intact n’appelle
  // pas le soin : l’effet se paie d’une attaque, l’IA ne le dépense pas pour rien.
  const d2 = duel();
  d2.tour = 'sorcier';
  poser(d2, 'sorcier', 'scribe-de-la-liste');
  d2.sorcier.main = Array(7).fill('chien-du-guet');
  poser(d2, 'joueur', 'dune-marchante');
  assert.equal(choisirActivationIA(d2, 'sorcier', { rng: () => 0.9 }), null);
});

// ── Demande 1 : les boutons passent au-dessus de la carte ───────────────────

test('attaquer et effet activé s’ouvrent au-dessus de la carte, plus grands et centrés', () => {
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  const blocs = (selecteur) => css.match(new RegExp(`${selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`, 'gu')) ?? [];

  const bouton = blocs('.rpg-card__effet-btn')[0];
  assert.ok(bouton, 'le bouton d’effet a sa règle');
  assert.match(bouton, /bottom:\s*calc\(100% \+ 10px\)/u, 'au-dessus de la carte');
  assert.match(bouton, /top:\s*auto/u, 'plus rien ne le pend en dessous');
  assert.match(bouton, /left:\s*50%/u);
  assert.match(bouton, /transform:\s*translateX\(-50%\)/u, 'centré sur la carte');

  const menus = blocs('.rpg-card__effet-menu');
  assert.equal(menus.length, 2, 'les deux définitions du menu suivent la même place');
  for (const menu of menus) {
    assert.match(menu, /bottom:\s*calc\(100% \+ 10px\)/u);
    assert.match(menu, /top:\s*auto/u);
    assert.match(menu, /left:\s*50%/u);
    assert.match(menu, /transform:\s*translateX\(-50%\)/u);
  }
  // Les deux boutons du menu (⚔ et ⚡) grandissent ensemble.
  for (const regle of blocs('.rpg-card__effet-menu .rpg-card__effet-btn')) {
    assert.match(regle, /width:\s*46px/u);
    assert.match(regle, /height:\s*46px/u);
    assert.match(regle, /font-size:\s*22px/u);
  }
  // Un menu au-dessus se rogne sinon sur le haut du cadre : le rognage s’ouvre.
  assert.match(css, /\.rpg-card\.is-effet-menu\s*\{[^}]*overflow-clip-margin:\s*58px/u);
});
