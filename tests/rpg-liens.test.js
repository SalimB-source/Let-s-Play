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
