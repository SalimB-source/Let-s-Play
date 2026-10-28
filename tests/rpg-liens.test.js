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
  rpgAttaquerSorcier,
} from '../src/games/rpgDuel.js';
import {
  RPG_DUEL_CARDS,
  bonusArmeLie,
  cardById,
  carteLiee,
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
  assert.deepEqual(bonusArmeLie(takouba, true), { atk: 3, def: 1 });
});

test('le Lien d’un sort remplace les champs de l’effet, sans toucher au reste', () => {
  const ventRouge = cardById('vent-rouge');
  assert.deepEqual(effetLie(ventRouge, false), { type: 'degats', amount: 2, cible: 'toutes-creatures' });
  assert.deepEqual(effetLie(ventRouge, true), { type: 'degats', amount: 3, cible: 'toutes-creatures' });
  // Le Serment de la forge garde sa durée et son Attaque ciblée.
  const serment = cardById('serment-de-la-forge');
  const lie = effetLie(serment, true);
  assert.equal(lie.atk, 3);
  assert.equal(lie.def, 1);
  assert.equal(lie.tours, 1);
  assert.equal(lie.coupRapide, true);
});

// ── Le moteur : les sorts ───────────────────────────────────────────────────

test('Vent rouge : 2 dégâts sans le Daimyō, 3 avec lui', () => {
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
  assert.equal(cibleLiee.pv, pvLie - 3, 'avec le Daimyō en jeu, le sort en inflige 3');
});

test('Eau de la source : 4 PV sans la Source, 6 avec elle', () => {
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
  assert.equal(avec.joueur.pv, 16);
});

test('Serment de la forge : +2/+1 sans le Daimyō, +3/+1 avec lui', () => {
  const sans = duelVide();
  const troupes = poser(sans, 'joueur', 'chacal-du-seuil');
  const atkNu = troupes.atk;
  lancer(sans, 'joueur', 'serment-de-la-forge');
  assert.equal(troupes.atk, atkNu + 2);

  const avec = duelVide();
  const troupesLiees = poser(avec, 'joueur', 'chacal-du-seuil');
  poser(avec, 'joueur', 'daimyo-du-soleil-rouge');
  const atkLie = troupesLiees.atk;
  lancer(avec, 'joueur', 'serment-de-la-forge');
  assert.equal(troupesLiees.atk, atkLie + 3);
});

// ── Le moteur : les armes ───────────────────────────────────────────────────

test('Takouba : +2/+0 seule, +3/+1 avec Tin Hinan, et le Lien retombe à sa mort', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chacal-du-seuil');
  const { atk: atkNu, def: defNu } = porteur;
  equiper(duel, 'joueur', 'takouba-des-pistes', porteur);
  assert.equal(porteur.atk, atkNu + 2);
  assert.equal(porteur.def, defNu, 'sans ancre, la Takouba ne donne pas de défense');

  const tinHinan = poser(duel, 'joueur', 'tin-hinan');
  // Une arrivée suffit : le rafraîchissement des auras relève le Lien.
  assert.equal(porteur.atk, atkNu + 3, 'avec Tin Hinan, +3 ATQ');
  assert.equal(porteur.def, defNu + 1, 'avec Tin Hinan, +1 DEF');

  rpgBlesserCreature(duel, 'joueur', tinHinan.id, 99, 'braise');
  assert.equal(duel.joueur.creatures.some((entite) => entite.id === tinHinan.id), false, 'Tin Hinan est tombée');
  assert.equal(porteur.atk, atkNu + 2, 'le Lien retombe avec son ancre');
  assert.equal(porteur.def, defNu, 'la défense rendue ne tue pas le porteur');
});

test('Masque du guetteur : +1/+1 seul, +2/+2 avec le Passeur', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chacal-du-seuil');
  const { atk, def } = porteur;
  equiper(duel, 'joueur', 'masque-du-guetteur', porteur);
  assert.equal(porteur.atk, atk + 1);
  assert.equal(porteur.def, def + 1);

  poser(duel, 'joueur', 'passeur-au-masque-de-chacal');
  assert.equal(porteur.atk, atk + 2);
  assert.equal(porteur.def, def + 2);
});

test('le Lien ne traverse pas la table : l’ancre adverse ne renforce rien', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'chacal-du-seuil');
  const { atk } = porteur;
  equiper(duel, 'joueur', 'takouba-des-pistes', porteur);
  poser(duel, 'sorcier', 'tin-hinan');
  assert.equal(porteur.atk, atk + 2, 'la Tin Hinan du sorcier ne réveille pas la Takouba du joueur');
});

test('Masque du guetteur : le Lien réécrit le déclencheur — pioche sans défausse', () => {
  // Sans le Passeur : le porteur blesse le sorcier, le Masque pioche puis
  // défausse — la main ne bouge pas.
  // L'Ashigaru n'a ni Butin ni Tribut : la seule défausse possible vient du
  // Masque, ce qui rend le contrôle lisible.
  const sans = duelVide();
  sans.joueur.deck = ['chacal-du-seuil', 'chacal-du-seuil', 'chacal-du-seuil'];
  const porteur = poser(sans, 'joueur', 'ashigaru-des-braises');
  equiper(sans, 'joueur', 'masque-du-guetteur', porteur);
  porteur.ready = true;
  assert.equal(rpgAttaquerSorcier(sans, 'joueur', porteur.id).ok, true);
  assert.equal(sans.defausseEnAttente?.restant, 1,
    'sans ancre : la pioche du Masque ouvre la défausse (choisie par le joueur)');

  // Avec le Passeur : la même attaque pioche sans rien défausser.
  const avec = duelVide();
  avec.joueur.deck = ['chacal-du-seuil', 'chacal-du-seuil', 'chacal-du-seuil'];
  const porteurLie = poser(avec, 'joueur', 'ashigaru-des-braises');
  equiper(avec, 'joueur', 'masque-du-guetteur', porteurLie);
  poser(avec, 'joueur', 'passeur-au-masque-de-chacal');
  porteurLie.ready = true;
  const mainLiee = avec.joueur.main.length;
  assert.equal(rpgAttaquerSorcier(avec, 'joueur', porteurLie.id).ok, true);
  assert.equal(avec.joueur.main.length, mainLiee + 1, 'avec l’ancre : la pioche ne défausse plus');
  assert.ok(!avec.defausseEnAttente, 'aucune fenêtre de défausse ne s’ouvre');
});

test('carteLiee ne touche à rien quand le Lien est muet ou l’ancre absente', () => {
  const takouba = cardById('takouba-des-pistes');
  assert.equal(carteLiee(takouba, true), takouba, 'pas de `remplace` : la fiche est rendue telle quelle');
  const masque = cardById('masque-du-guetteur');
  assert.equal(carteLiee(masque, false), masque);
  assert.equal(carteLiee(masque, true).porteurBlesseSorcier.defausse, 0);
  assert.equal(masque.porteurBlesseSorcier.defausse, 1, 'la fiche imprimée n’est jamais mutée');
});

test('Nuage de cendres : 2 dégâts sans Susanoo, 3 avec — et l’écho reste à 1', () => {
  // Une 0/3 : elle survit à 2 dégâts, elle meurt à 3.
  const sans = duelVide();
  const cible = poser(sans, 'sorcier', 'gardienne-de-la-balance');
  lancer(sans, 'joueur', 'nuage-de-cendres');
  assert.equal(cible.pv, 1, 'sans ancre : 2 dégâts, la Gardienne survit à 1 PV');
  // La promesse d'écho n'est pas alourdie par le Lien.
  assert.equal(sans.sorcier.degatsEchos?.at(-1)?.amount, 1);

  const avec = duelVide();
  const victime = poser(avec, 'sorcier', 'gardienne-de-la-balance');
  poser(avec, 'joueur', 'susanoo');
  lancer(avec, 'joueur', 'nuage-de-cendres');
  assert.equal(avec.sorcier.creatures.some((entite) => entite.id === victime.id), false,
    'avec Susanoo : 3 dégâts, la Gardienne est détruite');
  assert.equal(avec.sorcier.degatsEchos?.at(-1)?.amount, 1,
    'l’écho garde son dégât : le Lien ne touche que la première vague');
});
