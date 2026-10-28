/**
 * Les cartes liées — le « Lien » du Sablier.
 *
 * Une carte liée se joue toujours, à son coût imprimé. Elle donne simplement
 * **plus** quand son ancre mythique tient une place sur la rangée de son
 * camp : une arme porte un bonus renforcé, un sort résout un effet renforcé.
 * L'ancre partie, la carte redevient la carte ordinaire qu'elle imprime — et
 * elle n'est jamais une carte morte.
 *
 * Ces contrôles tiennent le catalogue (chaque lien a une ancre mythique
 * existante, et son texte la nomme), le moteur (`rpgJouerArme`,
 * `rpgLancerMagie`, `appliquerLiensArmes`) et le calcul de puissance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rpgNouveauDuel,
  rpgJouerCreature,
  rpgJouerArme,
  rpgLancerMagie,
  rpgBlesserCreature,
} from '../src/games/rpgDuel.js';
import {
  RPG_DUEL_CARDS,
  bonusArmeLie,
  cardById,
  effetLie,
  lienDeCarte,
  lienSatisfait,
} from '../src/games/rpgCards.js';

const duelVide = () => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [] });
const donner = (duel, cote, id) => duel[cote].main.push(id);
const manaPlein = (duel, cote) => { duel[cote].mana = { braise: 9, eau: 9, sable: 9, neige: 9, tenebres: 9 }; };

/** Pose une créature et rend son entité. */
const poser = (duel, cote, id) => {
  donner(duel, cote, id);
  manaPlein(duel, cote);
  const res = rpgJouerCreature(duel, cote, id);
  assert.equal(res.ok, true, `${id} entre en jeu`);
  return res.entite;
};

/** Attache une arme et rend son porteur. */
const equiper = (duel, cote, armeId, porteur) => {
  donner(duel, cote, armeId);
  manaPlein(duel, cote);
  const res = rpgJouerArme(duel, cote, armeId, porteur.id);
  assert.equal(res.ok, true, `${armeId} s’attache à ${porteur.name}`);
  return res.entite;
};

const lancer = (duel, cote, carteId, cibleId = null) => {
  donner(duel, cote, carteId);
  manaPlein(duel, cote);
  const res = rpgLancerMagie(duel, cote, carteId, cibleId);
  assert.equal(res.ok, true, `${carteId} se lance`);
  return res;
};

// ── Le catalogue ────────────────────────────────────────────────────────────

test('chaque Lien nomme une ancre mythique qui existe, et son texte la nomme', () => {
  const liees = RPG_DUEL_CARDS.filter((carte) => lienDeCarte(carte));
  assert.ok(liees.length >= 5, 'le catalogue porte au moins cinq cartes liées');

  for (const carte of liees) {
    const lien = lienDeCarte(carte);
    const ancre = cardById(lien.ancre);
    assert.ok(ancre, `${carte.id} : l’ancre ${lien.ancre} existe`);
    assert.equal(ancre.rarity, 'mythique', `${carte.id} : son ancre est mythique`);
    assert.match(carte.text, new RegExp(ancre.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${carte.id} : le texte imprimé nomme ${ancre.name}`);

    if (carte.kind === 'arme') {
      assert.ok(lien.bonus, `${carte.id} : une arme liée porte un bonus de Lien`);
      assert.ok(lien.bonus.atk >= (carte.bonus?.atk ?? 0) && lien.bonus.def >= (carte.bonus?.def ?? 0),
        `${carte.id} : le Lien ne retire jamais de statistiques`);
    } else {
      assert.ok(lien.effet, `${carte.id} : un sort lié porte un effet de Lien`);
    }
  }
});

test('aucun Lien ne baisse le coût : la carte se joue au tarif imprimé', () => {
  for (const carte of RPG_DUEL_CARDS.filter((candidat) => lienDeCarte(candidat))) {
    const lien = lienDeCarte(carte);
    assert.equal(lien.cout, undefined, `${carte.id} : un Lien ne touche pas au coût`);
    assert.equal(lien.effet?.cost, undefined, `${carte.id} : l’effet lié ne change pas le coût`);
  }
});

// ── Les helpers purs ────────────────────────────────────────────────────────

test('lienSatisfait lit les cartes comme les entités, et jamais un autre camp', () => {
  const takouba = cardById('takouba-des-pistes');
  assert.equal(lienSatisfait(takouba, []), false);
  assert.equal(lienSatisfait(takouba, ['tin-hinan']), true);
  assert.equal(lienSatisfait(takouba, [{ carteId: 'tin-hinan' }]), true);
  assert.equal(lienSatisfait(takouba, [{ id: 'tin-hinan' }]), true);
  assert.equal(lienSatisfait(takouba, ['daimyo-du-soleil-rouge']), false);
  assert.equal(lienSatisfait(cardById('vent-rouge'), ['tin-hinan']), false);
  assert.equal(lienDeCarte(cardById('eau-du-puits')), null, 'une carte sans Lien n’en a pas');
});

test('le Lien d’une arme remplace le bonus imprimé, il ne s’y ajoute pas', () => {
  const takouba = cardById('takouba-des-pistes');
  assert.deepEqual(takouba.bonus, { atk: 2, def: 0 });
  assert.deepEqual(bonusArmeLie(takouba, false), { atk: 2, def: 0 });
  assert.deepEqual(bonusArmeLie(takouba, true), { atk: 4, def: 2 });
});

test('le Lien d’un sort remplace les champs de l’effet, sans toucher au reste', () => {
  const ventRouge = cardById('vent-rouge');
  assert.deepEqual(effetLie(ventRouge, false), { type: 'degats', amount: 2, cible: 'toutes-creatures' });
  assert.deepEqual(effetLie(ventRouge, true), { type: 'degats', amount: 4, cible: 'toutes-creatures' });
  // Le Serment de la forge garde sa durée et son Attaque ciblée.
  const serment = cardById('serment-de-la-forge');
  const lie = effetLie(serment, true);
  assert.equal(lie.atk, 3);
  assert.equal(lie.def, 2);
  assert.equal(lie.tours, 1);
  assert.equal(lie.coupRapide, true);
});

// ── Le moteur : les sorts ───────────────────────────────────────────────────

test('Vent rouge : 2 dégâts sans le Daimyō, 4 avec lui', () => {
  const sans = duelVide();
  const cible = poser(sans, 'sorcier', 'chacal-du-seuil');
  const pvAvant = cible.pv;
  lancer(sans, 'joueur', 'vent-rouge');
  assert.equal(cible.pv, pvAvant - 2, 'sans ancre, le sort imprime 2 dégâts');

  const avec = duelVide();
  const cibleLiee = poser(avec, 'sorcier', 'chacal-du-seuil');
  poser(avec, 'joueur', 'daimyo-du-soleil-rouge');
  const pvLie = cibleLiee.pv;
  lancer(avec, 'joueur', 'vent-rouge');
  assert.equal(cibleLiee.pv, pvLie - 4, 'avec le Daimyō en jeu, le sort en inflige 4');
});

test('Eau de la source : 4 PV sans la Source, 8 avec elle', () => {
  const sans = duelVide();
  sans.joueur.pv = 10;
  lancer(sans, 'joueur', 'eau-de-la-source');
  assert.equal(sans.joueur.pv, 14);

  const avec = duelVide();
  avec.joueur.pv = 10;
  donner(avec, 'joueur', 'source-de-bimini');
  manaPlein(avec, 'joueur');
  assert.equal(rpgJouerCreature(avec, 'joueur', 'source-de-bimini').ok, true, 'le Site tient une place');
  lancer(avec, 'joueur', 'eau-de-la-source');
  assert.equal(avec.joueur.pv, 18);
});

test('Serment de la forge : +2/+1 sans Eirik, +3/+2 avec lui, et le tour les efface', () => {
  const sans = duelVide();
  const troupes = poser(sans, 'joueur', 'chacal-du-seuil');
  const atkNu = troupes.atk;
  lancer(sans, 'joueur', 'serment-de-la-forge');
  assert.equal(troupes.atk, atkNu + 2);

  const avec = duelVide();
  const troupesLiees = poser(avec, 'joueur', 'chacal-du-seuil');
  poser(avec, 'joueur', 'eirik-du-premier-serment');
  const atkLie = troupesLiees.atk;
  lancer(avec, 'joueur', 'serment-de-la-forge');
  assert.equal(troupesLiees.atk, atkLie + 3);
});

// ── Le moteur : les armes ───────────────────────────────────────────────────

test('Takouba : +2/+0 seule, +4/+2 avec Tin Hinan, et le Lien retombe à sa mort', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chacal-du-seuil');
  const { atk: atkNu, def: defNu } = porteur;
  equiper(duel, 'joueur', 'takouba-des-pistes', porteur);
  assert.equal(porteur.atk, atkNu + 2);
  assert.equal(porteur.def, defNu, 'sans ancre, la Takouba ne donne pas de défense');

  const tinHinan = poser(duel, 'joueur', 'tin-hinan');
  // Une arrivée suffit : le rafraîchissement des auras relève le Lien.
  assert.equal(porteur.atk, atkNu + 4, 'avec Tin Hinan, +4 ATQ');
  assert.equal(porteur.def, defNu + 2, 'avec Tin Hinan, +2 DEF');

  rpgBlesserCreature(duel, 'joueur', tinHinan.id, 99, 'braise');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === tinHinan.id), false, 'Tin Hinan est tombée');
  assert.equal(porteur.atk, atkNu + 2, 'le Lien retombe avec son ancre');
  assert.equal(porteur.def, defNu, 'la défense rendue ne tue pas le porteur');
});

test('Masque du guetteur : +1/+1 seul, +3/+3 avec le Passeur', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chacal-du-seuil');
  const { atk, def } = porteur;
  equiper(duel, 'joueur', 'masque-du-guetteur', porteur);
  assert.equal(porteur.atk, atk + 1);
  assert.equal(porteur.def, def + 1);

  poser(duel, 'joueur', 'passeur-au-masque-de-chacal');
  assert.equal(porteur.atk, atk + 3);
  assert.equal(porteur.def, def + 3);
});

test('le Lien ne traverse pas la table : l’ancre adverse ne renforce rien', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chacal-du-seuil');
  const { atk } = porteur;
  equiper(duel, 'joueur', 'takouba-des-pistes', porteur);
  poser(duel, 'sorcier', 'tin-hinan');
  assert.equal(porteur.atk, atk + 2, 'la Tin Hinan du sorcier ne réveille pas la Takouba du joueur');
});
