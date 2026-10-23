/**
 * La piste des gains (`rpgProfilGains.js`) : ce que rapporte chaque niveau, et
 * le chemin qui le dit. Tout est pur — aucun composant, aucun DOM.
 *
 * Les quatre promesses vérifiées, dans l'ordre :
 *
 *   1. **chaque niveau rapporte quelque chose** — un paquet du Souk tombe à tous
 *      les niveaux, les rangs de Bab El aux leurs, et les cosmétiques aux leurs ;
 *   2. **ce qui est gagné se calcule** — rien ne s'écrit comme une possession :
 *      le niveau vient de l'XP, donc une sauvegarde retouchée ne pare personne
 *      de l'Éclipse au niveau 3 ;
 *   3. **la piste a la forme demandée** — du niveau en cours jusqu'au prochain
 *      rang, puis huit niveaux au-delà, le rang en jalon, le plafond en
 *      rétrospective ;
 *   4. **le filet dit la barre** — plein derrière soi, au pourcentage devant soi,
 *      vide au-delà.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CADRES,
  TITRES,
  cadreDeProfil,
  cadreParId,
  cadrePortable,
  cadresGagnes,
  gainsDuNiveau,
  pisteDesGains,
  titreDeProfil,
  titreParId,
  titrePortable,
  titresGagnes,
} from '../src/games/rpgProfilGains.js';
import { COURBE, RANGS, progressionDuProfil, xpTotalDuNiveau } from '../src/games/rpgProfil.js';

/** Un profil posé exactement au niveau voulu — l'XP, jamais un champ niveau. */
const auNiveau = (niveau, reste = {}) => ({ xp: xpTotalDuNiveau(niveau), ...reste });

test('les catalogues de gains se tiennent : uniques, croissants, dans la courbe', () => {
  for (const [nom, liste] of [['cadres', CADRES], ['titres', TITRES]]) {
    assert.ok(liste.length >= 5, `il y a plusieurs ${nom}`);
    assert.equal(new Set(liste.map((un) => un.id)).size, liste.length, `aucun ${nom} en double`);
    for (const gain of liste) {
      assert.ok(gain.niveau >= 1 && gain.niveau <= COURBE.niveauMax,
        `${gain.id} se gagne dans la courbe (1 → ${COURBE.niveauMax})`);
      assert.ok(typeof gain.nom === 'string' && gain.nom.length > 1, `${gain.id} a un nom`);
      assert.ok(typeof gain.detail === 'string' && gain.detail.length > 8, `${gain.id} se raconte`);
      assert.ok(typeof gain.glyphe === 'string' && gain.glyphe.length <= 2, `${gain.id} a un glyphe`);
    }
    const niveaux = liste.map((un) => un.niveau);
    assert.deepEqual(niveaux, [...niveaux].sort((a, b) => a - b), `${nom} : les niveaux croissent`);
  }
  assert.equal(CADRES[0].niveau, 1, 'le cadre du départ n’est jamais verrouillé');
  assert.equal(cadreParId(CADRES[0].id), CADRES[0], 'un cadre se retrouve par son identifiant');
  assert.equal(titreParId(TITRES[0].id), TITRES[0], 'un titre aussi');
  assert.equal(cadreParId('introuvable'), null, 'un cadre inconnu rend null');
  assert.equal(titreParId(null), null, 'un titre absent rend null');

  // Les titres ne doublent pas les rangs : les rangs disent ce que la Chambre
  // fait de vous, les titres ce qu'on en pense tout bas.
  const rangs = new Set(RANGS.map((un) => un.nom.toLowerCase()));
  for (const titre of TITRES) {
    assert.ok(!rangs.has(titre.nom.toLowerCase().replace(/^l[ae] /, '')),
      `${titre.id} n’est pas un rang déguisé`);
  }
  // Un cadre et un titre ne tombent jamais au même niveau : la tuile n'a qu'une
  // place, et la pastille ne sert qu'aux deux niveaux qui portent un rang.
  for (const cadre of CADRES) {
    assert.ok(!TITRES.some((titre) => titre.niveau === cadre.niveau),
      `le niveau ${cadre.niveau} ne gagne pas deux cosmétiques à la fois`);
  }
});

test('chaque niveau rapporte au moins un paquet, et le paquet ferme la liste', () => {
  for (let niveau = 1; niveau <= COURBE.niveauMax; niveau += 1) {
    const gains = gainsDuNiveau(niveau);
    assert.ok(gains.length >= 1, `le niveau ${niveau} rapporte quelque chose`);
    assert.equal(gains[gains.length - 1].sorte, 'paquet', `le niveau ${niveau} paie son paquet`);
    assert.equal(gains.filter((un) => un.sorte === 'paquet').length, 1, 'un seul paquet par niveau');
    const rang = RANGS.find((un) => un.niveau === niveau);
    if (rang) {
      assert.equal(gains[0].sorte, 'rang', `le niveau ${niveau} met son rang d’abord`);
      assert.equal(gains[0].nom, rang.nom, `et c’est ${rang.nom}`);
      assert.equal(gains[0].detail, rang.phrase, 'avec sa phrase');
    } else {
      assert.ok(!gains.some((un) => un.sorte === 'rang'), `le niveau ${niveau} n’invente pas de rang`);
    }
    for (const gain of gains) assert.equal(gain.niveau, niveau, `${gain.sorte} porte son niveau`);
    assert.ok(Object.isFrozen(gains), 'les gains d’un niveau ne se retouchent pas');
  }
  // Les trois familles existent vraiment dans la courbe, pas seulement en théorie.
  const tout = Array.from({ length: COURBE.niveauMax }, (_, index) => gainsDuNiveau(index + 1)).flat();
  for (const sorte of ['paquet', 'rang', 'cadre', 'titre']) {
    assert.ok(tout.some((un) => un.sorte === sorte), `la piste montre au moins un ${sorte}`);
  }
  assert.equal(gainsDuNiveau(0)[0].niveau, 1, 'un niveau absurde retombe dans la courbe');
  assert.equal(gainsDuNiveau(999)[0].niveau, COURBE.niveauMax, 'dans les deux sens');
});

test('ce qui est gagné se calcule depuis l’XP — une sauvegarde ne pare personne', () => {
  assert.equal(cadreDeProfil(null).id, CADRES[0].id, 'un profil vide porte le cadre du départ');
  assert.equal(titreDeProfil(null), null, 'et aucun titre');

  const cadre = CADRES.find((un) => un.niveau > 3);
  assert.equal(cadrePortable(auNiveau(1), cadre.id), false, `${cadre.id} est verrouillé au niveau 1`);
  assert.equal(cadrePortable(auNiveau(cadre.niveau), cadre.id), true, `et gagné au niveau ${cadre.niveau}`);
  assert.equal(cadrePortable(auNiveau(cadre.niveau - 1), cadre.id), false, 'pas un niveau avant');
  assert.equal(cadrePortable(auNiveau(1), null), true, 'revenir au cadre du départ est toujours permis');
  assert.equal(cadrePortable(auNiveau(60), 'introuvable'), false, 'un cadre inconnu ne se porte pas');

  const titre = TITRES.find((un) => un.niveau > 3);
  assert.equal(titrePortable(auNiveau(1), titre.id), false, `${titre.id} est verrouillé au niveau 1`);
  assert.equal(titrePortable(auNiveau(titre.niveau), titre.id), true, `et gagné au niveau ${titre.niveau}`);
  assert.equal(titrePortable(auNiveau(60), 'introuvable'), false, 'un titre inconnu ne se porte pas');

  // Écrit dans le profil mais pas gagné par l'XP : la lecture le refuse.
  assert.equal(cadreDeProfil(auNiveau(2, { cadre: cadre.id })).id, CADRES[0].id,
    'un cadre volé retombe sur celui du départ');
  assert.equal(titreDeProfil(auNiveau(2, { titre: titre.id })), null,
    'un titre volé retombe sur aucun titre');
  assert.equal(cadreDeProfil(auNiveau(cadre.niveau, { cadre: cadre.id })).id, cadre.id,
    'un cadre gagné et choisi se porte');
  assert.equal(cadreDeProfil(auNiveau(60, { cadre: 'retire-du-jeu' })).id, CADRES[0].id,
    'un cadre retiré d’une version à l’autre ne casse rien');

  // Rétroactif : qui arrive au niveau 26 porte déjà tout ce qui est en dessous.
  assert.deepEqual(cadresGagnes(auNiveau(26)).map((un) => un.niveau),
    CADRES.filter((un) => un.niveau <= 26).map((un) => un.niveau), 'les cadres gagnés sont ceux du niveau');
  assert.deepEqual(titresGagnes(auNiveau(26)).map((un) => un.niveau),
    TITRES.filter((un) => un.niveau <= 26).map((un) => un.niveau), 'les titres aussi');
  assert.ok(cadresGagnes(auNiveau(60)).length > cadresGagnes(auNiveau(2)).length, 'et la liste grandit');
});

test('la piste va du niveau en cours au prochain rang, puis huit niveaux au-delà', () => {
  for (let niveau = 1; niveau < COURBE.niveauMax; niveau += 1) {
    const piste = pisteDesGains(auNiveau(niveau));
    const barre = progressionDuProfil(auNiveau(niveau));
    assert.equal(piste.niveau, niveau, `au niveau ${niveau}, la piste parle de ce niveau`);
    assert.equal(piste.debut, niveau, 'et part de là — pas de rétrospective');

    const finAttendue = piste.prochainRang
      ? Math.min(COURBE.niveauMax, piste.prochainRang.niveau + 8)
      : COURBE.niveauMax;
    assert.equal(piste.fin, finAttendue, `le niveau ${niveau} s’arrête au prochain rang plus huit`);
    assert.equal(piste.paliers.length, finAttendue - niveau + 1, 'un palier par niveau montré');
    assert.ok(piste.paliers.length <= 19, `la piste reste lisible (${piste.paliers.length} paliers)`);
    assert.deepEqual(piste.paliers.map((un) => un.niveau),
      Array.from({ length: finAttendue - niveau + 1 }, (_, index) => niveau + index),
      'les paliers se suivent, sans trou ni doublon');

    // Le jalon : le prochain rang, et lui seul.
    const jalons = piste.paliers.filter((un) => un.estJalon);
    assert.equal(jalons.length, piste.prochainRang ? 1 : 0, `un seul jalon au niveau ${niveau}`);
    if (piste.prochainRang) {
      assert.equal(jalons[0].niveau, piste.prochainRang.niveau, 'le jalon est le prochain rang');
      assert.ok(jalons[0].estRang, 'et c’est bien un palier de rang');
      assert.ok(piste.fin >= piste.prochainRang.niveau, 'le rang est toujours dans la piste');
    }

    // Les états, dans l'ordre : gagnés, puis le courant, puis les verrouillés.
    const etats = piste.paliers.map((un) => un.etat);
    assert.equal(etats.filter((etat) => etat === 'courant').length, 1, 'un seul palier en cours');
    assert.equal(piste.paliers[0].etat, 'courant', 'le premier palier est celui où l’on est');
    assert.deepEqual(etats, ['courant', ...etats.slice(1).map((etat) => (etat === 'verrouille' ? 'verrouille' : etat))],
      'rien de gagné devant soi');
    for (const palier of piste.paliers) {
      assert.ok(['gagne', 'courant', 'verrouille'].includes(palier.etat), `${palier.niveau} a un état connu`);
      assert.equal(palier.etat === 'verrouille', palier.niveau > niveau, 'verrouillé veut dire plus haut');
      assert.ok(palier.principal, `${palier.niveau} a un gain à peindre`);
      assert.ok(palier.cosmetiques.length <= 1, `${palier.niveau} porte au plus un cosmétique`);
      assert.ok(palier.seuil >= 0, `${palier.niveau} a un prix`);
      assert.equal(palier.seuil, progressionDuProfil(auNiveau(palier.niveau)).need,
        `le prix du niveau ${palier.niveau} est celui de la courbe`);
    }
    assert.equal(piste.percent, barre.percent, 'la piste lit la même barre que la carte');
  }
});

test('au plafond, la piste montre le chemin parcouru, tout gagné', () => {
  const piste = pisteDesGains(auNiveau(COURBE.niveauMax));
  assert.equal(piste.maximal, true, 'le niveau maximal se dit');
  assert.equal(piste.prochainRang, null, 'il n’y a plus de rang à venir');
  assert.equal(piste.fin, COURBE.niveauMax, 'la piste s’arrête au plafond');
  assert.equal(piste.debut, COURBE.niveauMax - 4, 'et regarde les cinq derniers niveaux');
  assert.ok(piste.paliers.every((un) => un.etat === 'gagne'), 'plus rien n’est en cours ni verrouillé');
  assert.ok(piste.paliers.every((un) => un.filet.droite === (un.niveau === COURBE.niveauMax ? 0 : 100)),
    'le filet est plein jusqu’au dernier palier, et s’arrête là');
  assert.equal(pisteDesGains({ xp: 999999 }).fin, COURBE.niveauMax, 'une XP absurde reste au plafond');
});

test('le filet dit la barre : plein derrière, au pourcentage devant, vide au-delà', () => {
  const niveau = 4;
  const profil = { xp: xpTotalDuNiveau(niveau) + 40 };
  const barre = progressionDuProfil(profil);
  const piste = pisteDesGains(profil);
  assert.ok(barre.percent > 0 && barre.percent < 100, 'le profil est en route entre deux niveaux');

  const courant = piste.paliers.find((un) => un.niveau === niveau);
  assert.equal(courant.etat, 'courant', 'le palier en cours est celui où l’on est');
  assert.equal(courant.filet.droite, barre.percent, 'sa moitié droite se remplit au pourcentage de la barre');
  assert.equal(courant.filet.gauche, 0, 'et rien ne dépasse avant le premier palier montré');

  const suivant = piste.paliers.find((un) => un.niveau === niveau + 1);
  assert.equal(suivant.filet.gauche, 0, 'le palier suivant n’est pas encore rejoint');
  assert.equal(suivant.filet.droite, 0, 'ni dépassé');

  // Derrière soi, tout est plein : la piste d'un niveau 9 montre ses acquis.
  const arriere = pisteDesGains(auNiveau(COURBE.niveauMax));
  assert.ok(arriere.paliers.slice(1).every((un) => un.filet.gauche === 100),
    'les paliers déjà franchis ont leur moitié gauche pleine');
});

test('la piste ne ment jamais sur un profil abîmé', () => {
  for (const abime of [null, undefined, {}, { xp: -5 }, { xp: 'beaucoup' }, { xp: NaN }]) {
    const piste = pisteDesGains(abime);
    assert.ok(piste.paliers.length >= 1, 'il reste au moins un palier à montrer');
    assert.equal(piste.debut, 1, 'un profil illisible repart du niveau 1');
    assert.ok(piste.fin <= COURBE.niveauMax, 'et ne dépasse pas la courbe');
    assert.ok(piste.paliers.every((un) => Number.isFinite(un.seuil)), 'chaque prix est un nombre');
  }
  assert.deepEqual(pisteDesGains(null, { apres: 0 }).paliers.map((un) => un.niveau), [1, 2, 3],
    'sans niveau d’avance, la piste s’arrête au prochain rang');
  assert.ok(pisteDesGains(null, { apres: 40 }).paliers.length <= COURBE.niveauMax,
    'et une avance absurde ne déborde pas la courbe');
});
