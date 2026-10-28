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
  rpgFinDeTour,
  rpgSorcierResoudreAnnonce,
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
const poser = (duel, cote, id, cibleId = null) => {
  donner(duel, cote, id);
  manaPlein(duel, cote);
  const res = rpgJouerCreature(duel, cote, id, cibleId);
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

const lancer = (duel, cote, carteId, cibleId = null, cibleAllieeId = null) => {
  donner(duel, cote, carteId);
  manaPlein(duel, cote);
  const res = rpgLancerMagie(duel, cote, carteId, cibleId, cibleAllieeId);
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

    // Un Lien porte un effet, un bonus, un déclencheur réécrit — ou il est
    // déclaré **nominal** : la paire tient par une autre règle du jeu et le
    // Lien ne fait que la nommer. Jamais un Lien vide par oubli.
    if (lien.nominal) {
      assert.equal(lien.bonus, undefined, `${carte.id} : un Lien nominal n’ajoute pas de bonus`);
      assert.equal(lien.effet, undefined, `${carte.id} : un Lien nominal n’ajoute pas d’effet`);
      continue;
    }
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

test('Brise-lame : pioche 1 sans Orochi, pioche 2 avec lui — la lame tombe dans les deux cas', () => {
  const monter = () => {
    const duel = duelVide();
    duel.joueur.deck = ['chacal-du-seuil', 'chacal-du-seuil', 'chacal-du-seuil', 'chacal-du-seuil'];
    const porteur = poser(duel, 'sorcier', 'gardienne-de-la-balance');
    equiper(duel, 'sorcier', 'javelot-du-beffroi', porteur);
    return { duel, porteur };
  };

  const sans = monter();
  lancer(sans.duel, 'joueur', 'brise-lame', sans.porteur.id);
  assert.equal(sans.duel.joueur.main.length, 1, 'sans ancre : une carte piochée');
  assert.equal(sans.porteur.arme, null, 'la lame est brisée quand même');

  const avec = monter();
  poser(avec.duel, 'joueur', 'orochi');
  lancer(avec.duel, 'joueur', 'brise-lame', avec.porteur.id);
  assert.equal(avec.duel.joueur.main.length, 2, 'avec Orochi : deux cartes piochées');
  assert.equal(avec.porteur.arme, null, 'et la lame tombe toujours');
});

test('Braise et sable : +1/+0 seule, +2/+0 avec le Cavalier — Attaque ciblée intacte', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'joueur', 'ashigaru-des-braises');
  const atkNu = porteur.atk;
  donner(duel, 'joueur', 'braise-et-sable');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'braise-et-sable', porteur.id).ok, true,
    'l’arme-sort s’attache à l’allié');
  assert.equal(porteur.atk, atkNu + 1, 'sans ancre : +1/+0');
  assert.equal(porteur.coupRapide, true, 'Attaque ciblée est toujours donnée');

  poser(duel, 'joueur', 'cavalier-des-deux-sabres');
  assert.equal(porteur.atk, atkNu + 2, 'avec le Cavalier : +2/+0');
  assert.equal(porteur.coupRapide, true, 'et le Lien ne retire pas Attaque ciblée');

  // Le Lien suit son ancre : le Cavalier tombe, la lame redevient +1/+0.
  const cavalier = duel.joueur.creatures.find((entite) => entite.carteId === 'cavalier-des-deux-sabres');
  rpgBlesserCreature(duel, 'joueur', cavalier.id, 99, 'braise');
  assert.equal(porteur.atk, atkNu + 1, 'le Lien d’une arme-sort retombe aussi');
});

test('Lettre de marque : le seuil d’Abordage passe au coût plein sous Le Chasseur d’Ocracoke', () => {
  const monter = (avecChasseur) => {
    const duel = duelVide();
    // Une proie de coût 5, hors de portée du barème ordinaire (coût − 1 : 4).
    const proie = poser(duel, 'sorcier', 'jarl-au-marteau-de-guerre');
    if (avecChasseur) poser(duel, 'joueur', 'le-chasseur-d-ocracoke');
    lancer(duel, 'joueur', 'lettre-de-marque');
    // Le capteur coûte 5 : seuil 4 sans le Lien, 5 avec.
    const preneur = poser(duel, 'joueur', 'jarl-au-marteau-de-guerre');
    return { duel, proie, preneur };
  };

  const sans = monter(false);
  assert.equal(sans.preneur.enCale ?? null, null,
    'sans le Chasseur : la proie de coût 5 échappe au seuil de 4');
  assert.equal(sans.duel.sorcier.creatures.includes(sans.proie), true, 'elle reste sur la table');

  const avec = monter(true);
  assert.equal(avec.preneur.enCale?.carteId, 'jarl-au-marteau-de-guerre',
    'avec le Chasseur : le seuil au coût plein la met en cale');
  assert.equal(avec.duel.sorcier.creatures.includes(avec.proie), false, 'la proie a quitté la table');

  const carte = cardById('lettre-de-marque');
  assert.equal(carte.cost, 2, 'le Lien n’escompte jamais le coût');
  assert.deepEqual(carte.lien, { ancre: 'le-chasseur-d-ocracoke', effet: { seuilPlein: true } });
});

test('Lame de mer : -3/-3, -4/-4 avec Le Seigneur des mâchoires — l’exil inchangé', () => {
  const monter = (avecSeigneur) => {
    const duel = duelVide();
    if (avecSeigneur) poser(duel, 'joueur', 'seigneur-des-machoires');
    const cible = poser(duel, 'sorcier', 'momie-de-lin');
    return { duel, cible };
  };

  const sans = monter(false);
  lancer(sans.duel, 'joueur', 'lame-de-mer', sans.cible.id);
  assert.deepEqual([sans.cible.atk, sans.cible.def], [0, 1], 'sans ancre : 2/4 devient 0/1');
  assert.equal(sans.duel.sorcier.creatures.length, 1, 'elle survit à la morsure');

  const avec = monter(true);
  lancer(avec.duel, 'joueur', 'lame-de-mer', avec.cible.id);
  assert.equal(avec.duel.sorcier.creatures.length, 0, 'avec les Mâchoires : la défense tombe à 0, elle est détruite');
  assert.equal(avec.duel.sorcier.exil.includes('momie-de-lin'), true,
    'et elle est exilée, pas enterrée — l’exil ne bouge pas');
  assert.equal(avec.duel.sorcier.cimetiere.includes('momie-de-lin'), false);

  const carte = cardById('lame-de-mer');
  assert.equal(carte.cost, 3, 'le Lien n’escompte jamais le coût');
  assert.equal(carte.effet.exilEnMourant, true, 'le Lien ne retire pas l’exil');
  assert.deepEqual(carte.lien, { ancre: 'seigneur-des-machoires', effet: { atk: -4, def: -4 } });
});

test('Rempart de dunes : +0/+3, et un bouclier avec La Dame aux ailes d’or', () => {
  const monter = (avecDame) => {
    const duel = duelVide();
    if (avecDame) poser(duel, 'joueur', 'dame-aux-ailes-d-or');
    const cible = poser(duel, 'joueur', 'momie-de-lin');
    return { duel, cible };
  };

  const sans = monter(false);
  lancer(sans.duel, 'joueur', 'rempart-de-dunes');
  assert.deepEqual([sans.cible.atk, sans.cible.def], [2, 7], 'sans ancre : +0/+3, sur 2/4');
  assert.equal(sans.cible.bouclier ?? 0, 0, 'et aucun bouclier');

  const avec = monter(true);
  lancer(avec.duel, 'joueur', 'rempart-de-dunes');
  assert.deepEqual([avec.cible.atk, avec.cible.def], [2, 7], 'avec les Ailes d’or : le rempart garde sa taille');
  assert.equal(avec.cible.bouclier, 1, 'mais la créature reçoit un bouclier');

  // Le bouclier est la parade anti-sort : il bloque la Magie Rapide adverse
  // jouée en fenêtre de réponse, et tombe.
  const riposte = monter(true);
  lancer(riposte.duel, 'joueur', 'rempart-de-dunes');
  const avant = riposte.cible.pv;
  donner(riposte.duel, 'sorcier', 'poigne-de-givre');
  manaPlein(riposte.duel, 'sorcier');
  riposte.duel.fenetreReponse = true;
  const res = rpgLancerMagie(riposte.duel, 'sorcier', 'poigne-de-givre', riposte.cible.id);
  assert.equal(res.ok, true);
  assert.equal(res.bouclierBloque, true, 'le sort est bloqué, pas encaissé');
  assert.equal(riposte.cible.pv, avant, 'et la créature ne perd aucun PV');
  assert.equal(riposte.cible.bouclier, 0, 'le bouclier tombe en bloquant');

  // Le cas qui fait vivre la carte : le sorcier ANNONCE un sort de dégâts sur
  // une de vos créatures, et vous répondez par le Rempart pendant la fenêtre
  // de réponse. Le bouclier arrive avant la résolution — le sort est bloqué,
  // et le +0/+3 rend même les PV que la créature n'a pas perdus.
  const reponse = monter(true);
  const pvAvant = reponse.cible.pv;
  reponse.duel.tour = 'sorcier';
  donner(reponse.duel, 'sorcier', 'poigne-de-givre');
  manaPlein(reponse.duel, 'sorcier');
  reponse.duel.annonce = { cote: 'sorcier', carteId: 'poigne-de-givre', cibleId: reponse.cible.id };
  donner(reponse.duel, 'joueur', 'rempart-de-dunes');
  manaPlein(reponse.duel, 'joueur');
  reponse.duel.fenetreReponse = true;
  assert.equal(rpgLancerMagie(reponse.duel, 'joueur', 'rempart-de-dunes').ok, true,
    'le Rempart se joue en réponse, hors de son tour');
  assert.equal(reponse.cible.bouclier, 1, 'le bouclier est posé avant la résolution');
  const resolution = rpgSorcierResoudreAnnonce(reponse.duel);
  assert.equal(resolution.bouclierBloque, true, 'le sort annoncé est bloqué');
  assert.equal(reponse.cible.pv, pvAvant + 3, 'la créature gagne les 3 PV du rempart, sans encaisser le sort');

  // Non consommé, il repart avec le tour, comme le +0/+3.
  const expire = monter(true);
  lancer(expire.duel, 'joueur', 'rempart-de-dunes');
  rpgFinDeTour(expire.duel);
  assert.equal(expire.cible.bouclier, 0, 'le bouclier prêté ne survit pas au tour');
  assert.equal(expire.cible.def, 4, 'ni le rempart');

  const carte = cardById('rempart-de-dunes');
  assert.equal(carte.cost, 2, 'le Lien n’escompte jamais le coût');
  assert.deepEqual(carte.lien, { ancre: 'dame-aux-ailes-d-or', effet: { bouclier: 1 } });
});

test('Trait de braise : 3 dégâts, 4 avec La Lionne du midi ardent — le chiffre de son souffle', () => {
  const monter = (avecLionne) => {
    const duel = duelVide();
    // La Lionne frappe à l'arrivée : on la pose avant toute proie adverse.
    if (avecLionne) poser(duel, 'joueur', 'lionne-du-midi-ardent');
    const cible = poser(duel, 'sorcier', 'momie-de-lin');
    return { duel, cible, avant: cible.pv };
  };

  const sans = monter(false);
  lancer(sans.duel, 'joueur', 'trait-de-braise', sans.cible.id);
  assert.equal(sans.avant - sans.cible.pv, 3, 'sans ancre : 3 dégâts');

  const avec = monter(true);
  lancer(avec.duel, 'joueur', 'trait-de-braise', avec.cible.id);
  assert.equal(avec.avant - avec.cible.pv, 4, 'avec la Lionne : 4 dégâts, son souffle');

  const carte = cardById('trait-de-braise');
  assert.equal(carte.cost, 3, 'le Lien n’escompte jamais le coût');
  assert.deepEqual(carte.lien, { ancre: 'lionne-du-midi-ardent', effet: { amount: 4 } });
});

test('Tempête de sable : 3 dégâts à toute la rangée, 4 avec Le Faucon du zénith', () => {
  const monter = (avecFaucon) => {
    const duel = duelVide();
    const a = poser(duel, 'sorcier', 'momie-de-lin');
    const b = poser(duel, 'sorcier', 'momie-de-lin');
    if (avecFaucon) poser(duel, 'joueur', 'faucon-du-zenith');
    return { duel, a, b };
  };

  const sans = monter(false);
  lancer(sans.duel, 'joueur', 'tempete-de-sable');
  assert.deepEqual([sans.a.pv, sans.b.pv], [1, 1], 'sans ancre : 3 dégâts sur 4 PV');

  const avec = monter(true);
  lancer(avec.duel, 'joueur', 'tempete-de-sable');
  assert.deepEqual([avec.a.pv, avec.b.pv], [0, 0], 'avec le Zénith : 4 dégâts, elles tombent');

  const carte = cardById('tempete-de-sable');
  assert.equal(carte.cost, 5, 'le Lien n’escompte jamais le coût');
  assert.deepEqual(carte.lien, { ancre: 'faucon-du-zenith', effet: { amount: 4 } });
});

test('Les feuillets : 3 cartes au cimetière adverse, 4 avec le Maître des hiéroglyphes', () => {
  const monter = (avecMaitre) => {
    const duel = duelVide();
    duel.sorcier.deck = Array.from({ length: 8 }, () => 'poigne-de-givre');
    if (avecMaitre) poser(duel, 'joueur', 'maitre-des-hieroglyphes');
    return duel;
  };

  const sans = monter(false);
  lancer(sans, 'joueur', 'les-feuillets');
  assert.equal(sans.sorcier.cimetiere.length, 3, 'sans ancre : 3 cartes');
  assert.equal(sans.sorcier.deck.length, 5, 'le paquet adverse s’allège d’autant');

  const avec = monter(true);
  lancer(avec, 'joueur', 'les-feuillets');
  assert.equal(avec.sorcier.cimetiere.length, 4, 'avec le Greffier : 4 cartes');
  assert.equal(avec.sorcier.deck.length, 4);

  const carte = cardById('les-feuillets');
  assert.equal(carte.cost, 4, 'le Lien n’escompte jamais le coût');
  assert.deepEqual(carte.lien, { ancre: 'maitre-des-hieroglyphes', effet: { amount: 4 } });
});

test('La Grande Pesée : 3 PV, 4 avec La Dévoreuse — la pioche ne bouge pas', () => {
  const monter = (avecDevoreuse) => {
    const duel = duelVide();
    duel.joueur.pvMax = 20;
    duel.joueur.pv = 20;
    duel.sorcier.pvMax = 20;
    duel.sorcier.pv = 20;
    // La Dévoreuse exile une créature à l'arrivée : on la pose avant toute
    // proie adverse, elle entre alors sans cible à désigner.
    if (avecDevoreuse) poser(duel, 'joueur', 'la-devoreuse');
    for (let i = 0; i < 4; i += 1) duel.joueur.deck.push('poigne-de-givre');
    return duel;
  };

  const sans = monter(false);
  lancer(sans, 'joueur', 'la-grande-pesee');
  assert.equal(sans.sorcier.pv, 17, 'sans ancre : le sorcier adverse perd 3 PV');
  assert.equal(sans.joueur.pv, 22, 'et vous en gagnez 3, après le 1 PV payé');
  assert.equal(sans.joueur.main.length, 2, 'puis deux cartes piochées');

  const avec = monter(true);
  lancer(avec, 'joueur', 'la-grande-pesee');
  assert.equal(avec.sorcier.pv, 16, 'avec La Dévoreuse : 4 PV');
  assert.equal(avec.joueur.pv, 23, 'et vous en gagnez 4');
  assert.equal(avec.joueur.main.length, 2, 'la pioche reste à deux cartes');

  const carte = cardById('la-grande-pesee');
  assert.equal(carte.cost, 5, 'le Lien n’escompte jamais le coût');
  assert.equal(carte.prixPv, 1, 'ni le prix en PV');
  assert.deepEqual(carte.lien, { ancre: 'la-devoreuse', effet: { amount: 4 } });
});

test('Poigne de givre : 2 dégâts, 3 avec la Valkyrie des glaces, le gel inchangé', () => {
  const monter = (avecValkyrie) => {
    const duel = duelVide();
    if (avecValkyrie) poser(duel, 'joueur', 'valkyrie-des-glaces');
    const cible = poser(duel, 'sorcier', 'momie-de-lin');
    return { duel, cible, avant: cible.pv };
  };

  const sans = monter(false);
  lancer(sans.duel, 'joueur', 'poigne-de-givre', sans.cible.id);
  assert.equal(sans.avant - sans.cible.pv, 2, 'sans ancre : 2 dégâts');
  assert.equal(sans.cible.gelToursRestants, 1, 'et le gel, à son coût plein');

  const avec = monter(true);
  lancer(avec.duel, 'joueur', 'poigne-de-givre', avec.cible.id);
  assert.equal(avec.avant - avec.cible.pv, 3, 'avec la Valkyrie : 3 dégâts');
  assert.equal(avec.cible.gelToursRestants, 1, 'le gel, lui, ne bouge pas d’un cran');

  const carte = cardById('poigne-de-givre');
  assert.equal(carte.cost, 2, 'le Lien n’escompte jamais le coût');
  assert.deepEqual(carte.lien, { ancre: 'valkyrie-des-glaces', effet: { amount: 3 } });
});

test('Frappe d’iaijutsu : 2 dégâts, 3 avec Tojiro le pourfendeur', () => {
  const monter = (avecTojiro) => {
    const duel = duelVide();
    const cible = poser(duel, 'sorcier', 'bakunawa');
    if (avecTojiro) poser(duel, 'joueur', 'tojiro-le-pourfendeur');
    return { duel, cible, avant: cible.pv };
  };

  const sans = monter(false);
  lancer(sans.duel, 'joueur', 'frappe-iaijutsu', sans.cible.id);
  assert.equal(sans.avant - sans.cible.pv, 2, 'sans ancre : 2 dégâts, la carte à son coût plein');

  const avec = monter(true);
  lancer(avec.duel, 'joueur', 'frappe-iaijutsu', avec.cible.id);
  assert.equal(avec.avant - avec.cible.pv, 3, 'avec le Pourfendeur : 3 dégâts');

  const carte = cardById('frappe-iaijutsu');
  assert.equal(carte.cost, 1, 'le Lien n’escompte jamais le coût');
  assert.deepEqual(carte.lien, { ancre: 'tojiro-le-pourfendeur', effet: { amount: 3 } });
});

test('Feux de kitsune : 4 sur une cible ou 2 et 2 ; 5 ou 3 et 3 avec l’Oni', () => {
  // Une 3/6 encaisse les deux modes sans mourir : on lit les dégâts exacts.
  // L'Oni frappe aussi à l'arrivée, donc on mesure toujours le **delta**.
  const monter = (avecOni) => {
    const duel = duelVide();
    const a = poser(duel, 'sorcier', 'bakunawa');
    const b = poser(duel, 'sorcier', 'bakunawa');
    if (avecOni) poser(duel, 'joueur', 'oni-de-la-fournaise', a.id);
    return { duel, a, b, avantA: a.pv, avantB: b.pv };
  };

  const sans = monter(false);
  lancer(sans.duel, 'joueur', 'feux-de-kitsune', sans.a.id);
  assert.equal(sans.avantA - sans.a.pv, 4, 'sans ancre : 4 dégâts sur une seule cible');
  assert.equal(sans.b.pv, sans.avantB, 'la seconde créature reste intacte');

  const partage = monter(false);
  lancer(partage.duel, 'joueur', 'feux-de-kitsune', partage.a.id, partage.b.id);
  assert.equal(partage.avantA - partage.a.pv, 2, 'sans ancre, en deux cibles : 2 dégâts');
  assert.equal(partage.avantB - partage.b.pv, 2, 'sans ancre, en deux cibles : 2 dégâts');

  const avec = monter(true);
  lancer(avec.duel, 'joueur', 'feux-de-kitsune', avec.a.id);
  assert.equal(avec.avantA - avec.a.pv, 5, 'avec l’Oni : 5 dégâts sur une seule cible');

  const avecPartage = monter(true);
  lancer(avecPartage.duel, 'joueur', 'feux-de-kitsune', avecPartage.a.id, avecPartage.b.id);
  assert.equal(avecPartage.avantA - avecPartage.a.pv, 3, 'avec l’Oni, en deux cibles : 3 dégâts');
  assert.equal(avecPartage.avantB - avecPartage.b.pv, 3, 'avec l’Oni, en deux cibles : 3 dégâts');
});

test('Coup critique : 25 % sur toutes les cartes, et les sources se cumulent', () => {
  // Les trois cartes à critique du catalogue portent le même 25 %.
  const kagutsuchi = cardById('kagutsuchi-flamme-originelle');
  const sabre = cardById('sabre-maudit');
  const braise = cardById('braise-et-sable');
  assert.deepEqual(kagutsuchi.coupCritique, { chance: 0.25, fois: 4 });
  assert.equal(sabre.effet.coupCritique, 0.25);
  assert.equal(braise.effet.coupCritique, 0.25);

  const duel = duelVide();
  const k = poser(duel, 'joueur', 'kagutsuchi-flamme-originelle');
  assert.deepEqual(k.coupCritique, { chance: 0.25, fois: 4 }, 'seule : 25 % ×4');

  // Une arme-sort ADDITIONNE sa chance, sans écraser le multiplicateur ×4.
  donner(duel, 'joueur', 'sabre-maudit');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', k.id).ok, true);
  assert.deepEqual(k.coupCritique, { chance: 0.5, fois: 4 }, 'avec le Sabre : 50 % ×4');

  donner(duel, 'joueur', 'braise-et-sable');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'braise-et-sable', k.id).ok, true);
  assert.deepEqual(k.coupCritique, { chance: 0.75, fois: 4 }, 'deux armes : 75 % ×4');

  // Une créature sans critique imprimé ne reçoit que celui de l'arme.
  const simple = poser(duel, 'joueur', 'ashigaru-des-braises');
  donner(duel, 'joueur', 'sabre-maudit');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', simple.id).ok, true);
  assert.deepEqual(simple.coupCritique, { chance: 0.25, fois: 2 });
});

test('Le Sabre maudit sur Kagutsuchi : le poison tombe, le sabre donne +2/+0', () => {
  const sabre = cardById('sabre-maudit');
  assert.deepEqual(sabre.lien, { ancre: 'kagutsuchi-flamme-originelle', effet: { def: 0 }, porteur: true },
    'Lien de porteur : la défense rendue à zéro, et seulement entre ses mains');
  assert.equal(cardById('kagutsuchi-flamme-originelle').rarity, 'mythique');
  // Lien de porteur : l'ancre en jeu ne suffit pas, c'est ELLE qui doit tenir
  // le sabre.
  assert.equal(lienSatisfait(sabre, ['kagutsuchi-flamme-originelle']), false,
    'un Lien de porteur ne se satisfait pas de l’ancre présente sur la rangée');
  assert.equal(lienSatisfait(sabre, ['kagutsuchi-flamme-originelle'], 'kagutsuchi-flamme-originelle'), true);
  assert.equal(lienSatisfait(sabre, ['kagutsuchi-flamme-originelle'], 'ashigaru-des-braises'), false);
  assert.match(sabre.text, /\+2\/\+0 au lieu de \+2\/-2/);

  const duel = duelVide();
  const k = poser(duel, 'joueur', 'kagutsuchi-flamme-originelle');
  assert.deepEqual([k.atk, k.def], [2, 6]);
  donner(duel, 'joueur', 'sabre-maudit');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', k.id).ok, true);
  assert.deepEqual([k.atk, k.def], [4, 6], 'avec le Lien : +2/+0, la défense est intacte');
  assert.equal(k.pv, 6, 'et le porteur ne paie pas le poison en PV');
  // Le cumul des critiques reste acquis, sans que le Lien ait à l'écrire.
  assert.deepEqual(k.coupCritique, { chance: 0.5, fois: 4 });

  // Une autre créature garde le poison : le Lien ne vaut que pour la Flamme.
  const simple = poser(duel, 'joueur', 'momie-de-lin');
  assert.deepEqual([simple.atk, simple.def, simple.pv], [2, 4, 4]);
  donner(duel, 'joueur', 'sabre-maudit');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', simple.id).ok, true);
  assert.deepEqual([simple.atk, simple.def, simple.pv], [4, 2, 2],
    'sans Lien : +2/-2, il paie le poison en PV');
  assert.deepEqual(simple.coupCritique, { chance: 0.25, fois: 2 });

  // Et la malédiction tue : c'est elle, le prix du sabre. Un 1/1 tombe en
  // s'attachant, et le sabre le suit au cimetière.
  const fragile = poser(duel, 'joueur', 'ashigaru-des-braises');
  assert.deepEqual([fragile.atk, fragile.def, fragile.pv], [1, 1, 1]);
  donner(duel, 'joueur', 'sabre-maudit');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'sabre-maudit', fragile.id).ok, true);
  assert.equal(duel.joueur.creatures.some((e) => e.id === fragile.id), false,
    'un 1/1 meurt en s’attachant le sabre : c’est la malédiction');
  assert.ok(duel.joueur.cimetiere.includes('sabre-maudit'),
    'et l’arme ne reste pas sur un cadavre');
});
