import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_CARD_LESSONS } from '../src/games/rpgCardLessons.js';
import {
  rpgNouveauDuel, rpgJouerCreature, rpgLancerMagie,
  rpgResoudreContresortBoualem, rpgDissiperContresortBoualem,
} from '../src/games/rpgDuel.js';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

function duel({ pvp = false } = {}) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = { eau: 50, sable: 50, braise: 50, neige: 50, tenebres: 50 };
  if (pvp) d.pvp = true;
  return d;
}
function poser(d, camp, id, cibleId = null) {
  d[camp].main.push(id);
  const resultat = rpgJouerCreature(d, camp, id, cibleId);
  assert.equal(resultat.ok, true, `${id} se joue`);
  return resultat.entite;
}

/**
 * La règle de la carte : quand un sort ou un effet adverse cible Boualem,
 * c'est **celui qui joue Boualem** qui choisit la nouvelle cible — jamais le
 * lanceur, qui n'a aucun mot à dire sur ce relancement.
 */
test('la carte et la leçon disent que c’est celui qui joue Boualem qui choisit', () => {
  const carte = cardById('boualem');
  assert.match(carte.text, /celui qui joue Boualem/, 'la carte nomme le joueur de Boualem');
  assert.match(carte.text, /jamais le lanceur/, 'la carte écarte explicitement le lanceur');
  assert.doesNotMatch(carte.text, /son lanceur le relance/, 'l’ancienne règle — le lanceur choisit — a disparu');
  const lecon = RPG_CARD_LESSONS.find((entree) => entree.id === 'capacite-de-boualem');
  assert.match(lecon.text, /celui qui JOUE Boualem/i, 'la leçon suit la même règle');
  assert.match(lecon.text, /jamais son adversaire lanceur/, 'la leçon ne laisse pas le choix au lanceur');
});

test('le sort du sorcier sur Boualem attend le choix du joueur, qui seul le résout', () => {
  const d = duel();
  const boualem = poser(d, 'joueur', 'boualem');
  const temoin = poser(d, 'joueur', 'dune-marchante');
  d.sorcier.main.push('poigne-de-givre');
  d.tour = 'sorcier';
  const res = rpgLancerMagie(d, 'sorcier', 'poigne-de-givre', boualem.id);
  assert.equal(res.ok, true, 'le sort est bien lancé et payé');
  assert.equal(boualem.boualemContresortDisponible, false, 'le contresort est consommé');
  assert.equal(boualem.pv, boualem.pvMax, 'Boualem ne subit rien');
  assert.equal(temoin.pv, temoin.pvMax, 'rien n’est encore relancé : la victime n’est pas choisie');
  assert.equal(d.boualemEnAttente?.cote, 'joueur', 'l’attente appartient au camp qui joue Boualem');
  assert.equal(d.boualemEnAttente?.cibleId, boualem.id);
  assert.equal(d.boualemEnAttente?.sourceCarteId, 'poigne-de-givre', 'l’effet en attente garde sa source');

  // Le lanceur ne peut pas trancher à la place du camp de Boualem.
  assert.equal(rpgResoudreContresortBoualem(d, 'sorcier', temoin.id).raison, 'aucune-attente');
  // Boualem lui-même n’est jamais la nouvelle cible.
  assert.equal(rpgResoudreContresortBoualem(d, 'joueur', boualem.id).raison, 'cible');

  const choix = rpgResoudreContresortBoualem(d, 'joueur', temoin.id);
  assert.equal(choix.ok, true);
  assert.equal(d.boualemEnAttente, null, 'l’attente se referme');
  assert.equal(temoin.pv, temoin.pvMax - 2, 'l’effet repart exactement tel qu’il avait été lancé');
});

test('quand Boualem appartient au sorcier, l’IA choisit sa nouvelle cible toute seule', () => {
  const d = duel();
  const boualem = poser(d, 'sorcier', 'boualem');
  const autre = poser(d, 'sorcier', 'chien-du-guet');
  d.joueur.main.push('poigne-de-givre');
  d.tour = 'joueur';
  const res = rpgLancerMagie(d, 'joueur', 'poigne-de-givre', boualem.id);
  assert.equal(res.ok, true);
  assert.equal(d.boualemEnAttente, undefined, 'aucune attente : le sorcier n’attend pas le joueur');
  assert.equal(boualem.pv, boualem.pvMax, 'Boualem est contré');
  assert.equal(autre.pv, autre.pvMax - 2, 'le sort est relancé sur la seule autre créature du sorcier');
  assert.match(d.log.join('\n'), /il est relancé sur Chien du guet/, 'le journal nomme la cible retenue par l’IA');
});

test('sans cible légale, l’effet contré se dissipe au lieu de suspendre la partie', () => {
  const d = duel();
  const boualem = poser(d, 'joueur', 'boualem');
  d.sorcier.main.push('poigne-de-givre');
  d.tour = 'sorcier';
  rpgLancerMagie(d, 'sorcier', 'poigne-de-givre', boualem.id);
  assert.equal(d.boualemEnAttente, undefined, 'aucune attente ouverte : il n’y a personne à désigner');
  assert.equal(boualem.pv, boualem.pvMax);
  assert.match(d.log.join('\n'), /aucune nouvelle cible légale, l’effet est annulé/);
  assert.equal(rpgDissiperContresortBoualem(d), false, 'rien à dissiper');
});

test('une attente devenue impossible se dissipe et rend la main', () => {
  const d = duel();
  const boualem = poser(d, 'joueur', 'boualem');
  const temoin = poser(d, 'joueur', 'dune-marchante');
  d.sorcier.main.push('poigne-de-givre');
  d.tour = 'sorcier';
  rpgLancerMagie(d, 'sorcier', 'poigne-de-givre', boualem.id);
  assert.equal(d.boualemEnAttente?.cote, 'joueur');
  // Le témoin quitte la table avant le clic : plus aucune cible légale.
  d.joueur.creatures = d.joueur.creatures.filter((entite) => entite.id !== temoin.id);
  assert.equal(rpgDissiperContresortBoualem(d), true, 'l’attente se dissipe');
  assert.equal(d.boualemEnAttente, null);
  assert.match(d.log.at(-1), /aucune nouvelle cible légale/);
});

test('le protocole PvP transporte l’attente et laisse le bon siège répondre', async () => {
  const pvp = await import('../src/games/rpgPvp.js');
  assert.ok(pvp.RPG_PVP_INTENTIONS.includes('resoudre-boualem'), 'l’intention de résolution est reconnue');
  const d = duel({ pvp: true });
  d.mulliganFait = { joueur: true, sorcier: true };
  const boualemSorcier = poser(d, 'sorcier', 'boualem');
  const temoin = poser(d, 'sorcier', 'chien-du-guet');
  d.tour = 'joueur';
  d.joueur.main.push('poigne-de-givre');
  rpgLancerMagie(d, 'joueur', 'poigne-de-givre', boualemSorcier.id);
  assert.equal(d.boualemEnAttente?.cote, 'sorcier');
  assert.equal(pvp.rpgPvpCoteActif(d), 'sorcier', 'la main passe au camp de Boualem le temps du choix');
  // Le siège « sorcier » voit l'attente de son côté, le joueur la voit en face.
  const vueAdverse = pvp.rpgPvpVue(d, 'sorcier');
  assert.equal(vueAdverse.boualemEnAttente?.cote, 'joueur', 'la vue retournée ramène l’attente chez son contrôleur');
  assert.equal(pvp.rpgPvpVue(d, 'joueur').boualemEnAttente?.cote, 'sorcier');
  const applique = pvp.rpgPvpAppliquer(d, 'sorcier', { type: 'resoudre-boualem', cibleId: temoin.id });
  assert.equal(applique.ok, true);
  assert.equal(d.boualemEnAttente, null);
  assert.equal(temoin.pv, temoin.pvMax - 2);
});

test('en PvP, les deux sièges sont humains : chacun choisit pour son Boualem', () => {
  const d = duel({ pvp: true });
  poser(d, 'joueur', 'boualem');
  poser(d, 'sorcier', 'boualem');
  const cible = poser(d, 'sorcier', 'chien-du-guet');
  const boualemJoueur = d.joueur.creatures.find((entite) => entite.carteId === 'boualem');
  d.tour = 'joueur';
  d.joueur.main.push('poigne-de-givre');
  rpgLancerMagie(d, 'joueur', 'poigne-de-givre', d.sorcier.creatures[0].id);
  assert.equal(d.boualemEnAttente?.cote, 'sorcier', 'le siège adverse doit répondre de son Boualem');
  assert.notEqual(cible.id, d.sorcier.creatures[0].id);
  assert.equal(rpgResoudreContresortBoualem(d, 'sorcier', cible.id).ok, true);
  assert.equal(d.boualemEnAttente, null);
  assert.ok(boualemJoueur, 'le Boualem de l’autre camp n’a pas bougé');
});

test('la page ne fait plus choisir la nouvelle cible au lanceur du sort', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  assert.doesNotMatch(page, /boualemProtege/, 'le vieux détour qui faisait cliquer le lanceur a disparu');
  assert.doesNotMatch(page, /choisissez une nouvelle cible légale pour le relancer/,
    'l’invite du lanceur a disparu');
  assert.match(page, /duel\.boualemEnAttente\?\.cote === 'joueur'/,
    'la page affiche l’attente du camp qui joue Boualem');
  assert.match(page, /rpgResoudreContresortBoualem\(duel, 'joueur', entite\.id\)/,
    'le clic du contrôleur résout l’attente');
  assert.match(page, /type: 'resoudre-boualem'/, 'le clic est transmis au serveur en PvP');
  assert.match(page, /c’est vous qui choisissez, pas le lanceur/, 'le bandeau dit qui choisit');
});
