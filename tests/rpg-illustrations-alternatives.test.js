/**
 * Les illustrations alternatives — les anciennes peintures des sets Braise et
 * Sable. Elles se gagnent à l'échelle d'XP (une tous les quatre niveaux) ou
 * s'achètent à la boutique du Catalogue, et se montrent dans la fiche de la
 * carte qu'elles doublent.
 *
 * Ce que ces tests protègent :
 *
 * 1. **la fiche** — une entrée par carte, aucune orpheline, une source et un
 *    prix cohérents ;
 * 2. **le fichier** — chaque peinture est réellement livrée dans
 *    `public/cards/alt/`, au ratio 4:5 de la face, et **diffère** de la
 *    peinture actuelle de la carte (archiver la nouvelle par erreur ne
 *    s'appelle plus une alternative) ;
 * 3. **les deux règles** — l'échelle monte d'un palier tous les quatre niveaux
 *    et se boucle au plafond ; la boutique vend le reste au prix de la rareté ;
 * 4. **les écrans** — le Catalogue monte la vignette, la fiche ouvre la
 *    vitrine, la fin de duel montre les gains.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ALTERNATIVES_DE_BOUTIQUE,
  ALTERNATIVES_DE_L_ECHELLE,
  ALTERNATIVES_DE_ECHELLE,
  NIVEAUX_PAR_PALIER,
  NIVEAU_PREMIERE_ALTERNATIVE,
  PAS_DES_ALTERNATIVES,
  PRIX_ILLUSTRATION,
  RPG_ILLUSTRATIONS_ALTERNATIVES,
  alternativeDeCarte,
  alternativeDebloquee,
  alternativeOuverte,
  alternativesDebloquees,
  alternativesGagneesEntre,
  alternativesRestantes,
  illustrationAlternativeUrl,
  nomDeLaCarte,
  prixIllustration,
  prochaineAlternative,
} from '../src/games/rpgCardArtAlternatives.js';
import { RPG_DUEL_CARDS, cardArtId, cardById, cardRarityInfo } from '../src/games/rpgCards.js';
import { COURBE } from '../src/games/rpgProfil.js';

/**
 * Les dimensions d'un JPEG, lues dans son en-tête — le dépôt n'a pas de
 * bibliothèque d'images côté tests, et ce parseur suffit pour un SOF.
 */
function dimensionsJpeg(chemin) {
  const octets = readFileSync(chemin);
  let i = 2;
  while (i < octets.length - 1) {
    if (octets[i] !== 0xff) { i += 1; continue; }
    const marqueur = octets[i + 1];
    if (marqueur === 0xd8 || marqueur === 0xd9 || (marqueur >= 0xd0 && marqueur <= 0xd7)) { i += 2; continue; }
    const longueur = octets.readUInt16BE(i + 2);
    const estSof = marqueur >= 0xc0 && marqueur <= 0xcf
      && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc;
    if (estSof) return [octets.readUInt16BE(i + 7), octets.readUInt16BE(i + 5)];
    i += 2 + longueur;
  }
  return null;
}

const cheminAlt = (entree) => fileURLToPath(new URL(`../public/cards/alt/${entree.carteId}.jpg`, import.meta.url));
const cheminActuel = (entree) => fileURLToPath(new URL(`../public/cards/${cardArtId(entree.carteId)}.jpg`, import.meta.url));

test('le catalogue des illustrations alternatives : une entrée par carte, aucune orpheline', () => {
  assert.ok(RPG_ILLUSTRATIONS_ALTERNATIVES.length >= 20,
    'les lots des sets Braise et Sable tiennent dans le catalogue');
  const vues = new Set();
  for (const entree of RPG_ILLUSTRATIONS_ALTERNATIVES) {
    assert.equal(typeof entree.carteId, 'string');
    assert.ok(entree.carteId.trim(), 'une alternative porte toujours un identifiant de carte');
    assert.equal(vues.has(entree.carteId), false, `${entree.carteId} n’apparaît qu’une fois`);
    vues.add(entree.carteId);
    assert.ok(cardById(entree.carteId), `${entree.carteId} existe au catalogue des cartes`);
    assert.ok(entree.nom.trim(), `${entree.carteId} porte un nom lisible`);
    assert.equal(entree.fichier, `cards/alt/${entree.carteId}.jpg`);
    // Une source, et une seule : l'échelle donne un niveau, la boutique un prix.
    assert.ok(entree.source === 'echelle' || entree.source === 'boutique', `${entree.carteId} : source connue`);
    if (entree.source === 'echelle') {
      assert.equal(entree.prix, null, `${entree.carteId} : ce qui se gagne ne se vend pas`);
      assert.ok(Number.isInteger(entree.niveau), `${entree.carteId} : un palier entier`);
    } else {
      assert.equal(entree.niveau, null, `${entree.carteId} : la boutique n’a pas de palier`);
      assert.ok(entree.prix > 0, `${entree.carteId} : un prix positif`);
    }
  }
  // Le catalogue des cartes jouables ne contient aucune alternative en double.
  const ids = new Set(RPG_DUEL_CARDS.map((carte) => carte.id));
  for (const carteId of vues) assert.ok(ids.has(carteId), `${carteId} est une carte jouable`);
});

test('l’échelle : une illustration tous les quatre niveaux, de 4 au plafond', () => {
  assert.equal(NIVEAUX_PAR_PALIER, 4, 'un palier tous les quatre niveaux');
  assert.equal(PAS_DES_ALTERNATIVES, NIVEAUX_PAR_PALIER, 'le pas reste le nombre de niveaux par palier');
  assert.equal(NIVEAU_PREMIERE_ALTERNATIVE, 4, 'la première tombe au niveau 4');
  assert.equal(ALTERNATIVES_DE_L_ECHELLE.length, ALTERNATIVES_DE_ECHELLE,
    'l’échelle porte exactement le nombre annoncé');

  const niveaux = ALTERNATIVES_DE_L_ECHELLE.map((entree) => entree.niveau);
  assert.deepEqual(niveaux, [...niveaux].sort((a, b) => a - b), 'l’ordre de l’échelle est l’ordre des niveaux');
  assert.equal(new Set(niveaux).size, niveaux.length, 'une seule illustration par palier');
  niveaux.forEach((niveau, index) => {
    assert.equal(niveau, NIVEAU_PREMIERE_ALTERNATIVE + index * NIVEAUX_PAR_PALIER,
      'chaque palier est à quatre niveaux du précédent');
    assert.ok(niveau <= COURBE.niveauMax, `${niveau} reste dans la courbe`);
  });
  assert.equal(niveaux.at(-1), COURBE.niveauMax, 'le dernier palier tombe pile au plafond');

  // L'échelle est celle des cartes mythiques : ce sont elles qui paient.
  for (const entree of ALTERNATIVES_DE_L_ECHELLE) {
    assert.equal(cardRarityInfo(cardById(entree.carteId)).key, 'mythique',
      `${entree.carteId} : l’échelle est réservée aux mythiques`);
  }
});

test('la boutique : tout le reste, au prix de la rareté de la carte', () => {
  const total = RPG_ILLUSTRATIONS_ALTERNATIVES.length;
  assert.equal(ALTERNATIVES_DE_L_ECHELLE.length + ALTERNATIVES_DE_BOUTIQUE.length, total,
    'chaque illustration a une source, et une seule');
  assert.ok(ALTERNATIVES_DE_BOUTIQUE.length > 0, 'la boutique a de quoi vendre');

  for (const entree of ALTERNATIVES_DE_BOUTIQUE) {
    const rarete = cardRarityInfo(cardById(entree.carteId)).key;
    assert.equal(entree.prix, PRIX_ILLUSTRATION[rarete], `${entree.carteId} : prix de sa rareté`);
    assert.equal(prixIllustration(entree.carteId), entree.prix, 'le prix se recalcule à l’identique');
  }
  // Les quatre raretés ont un prix, croissant avec la rareté.
  const prix = ['commune', 'inhabituelle', 'rare', 'mythique'].map((rarete) => PRIX_ILLUSTRATION[rarete]);
  assert.deepEqual(prix, [...prix].sort((a, b) => a - b), 'plus la carte est rare, plus la peinture est chère');
  assert.ok(prix.every((montant) => Number.isInteger(montant) && montant > 0));
  // Un prix reste dans l'ordre de grandeur de la maison : un paquet coûte 140.
  assert.ok(prix[0] < 140 && prix.at(-1) > 140, 'la boutique encadre le prix d’un paquet');
});

test('chaque ancienne peinture est livrée dans public/cards/alt, en 4:5 et différente de la nouvelle', () => {
  for (const entree of RPG_ILLUSTRATIONS_ALTERNATIVES) {
    const chemin = cheminAlt(entree);
    assert.ok(existsSync(chemin), `${entree.carteId} : public/cards/alt est livré`);
    const [largeur, hauteur] = dimensionsJpeg(chemin);
    assert.ok(Math.abs(largeur / hauteur - 4 / 5) < 0.01,
      `${entree.carteId} : l’alternative garde le ratio 4:5 de la face (${largeur}×${hauteur})`);
    assert.ok(largeur >= 512, `${entree.carteId} : la vignette reste lisible (${largeur}px)`);

    const actuelle = cheminActuel(entree);
    assert.ok(existsSync(actuelle), `${entree.carteId} : la peinture actuelle existe`);
    // Deux peintures identiques ne seraient pas une alternative : c'est la
    // comparaison des octets, pas celle des noms, qui le dit.
    assert.notEqual(
      readFileSync(chemin).equals(readFileSync(actuelle)),
      true,
      `${entree.carteId} : l’alternative n’est pas une copie de la peinture en place`,
    );
  }
});

test('le déblocage suit la barre d’XP, du niveau 1 au dernier palier', () => {
  const total = ALTERNATIVES_DE_L_ECHELLE.length;
  assert.equal(alternativesDebloquees(1).length, 0, 'un joueur neuf n’a rien gagné');
  assert.equal(alternativesRestantes(1), total);
  assert.equal(alternativesDebloquees(NIVEAU_PREMIERE_ALTERNATIVE - 1).length, 0,
    'rien ne s’ouvre avant le premier palier');
  assert.equal(alternativesDebloquees(NIVEAU_PREMIERE_ALTERNATIVE).length, 1,
    'le niveau 4 ouvre la première');
  assert.equal(alternativesDebloquees(NIVEAU_PREMIERE_ALTERNATIVE + NIVEAUX_PAR_PALIER).length, 2,
    'le niveau 8 ouvre la suivante');
  assert.equal(prochaineAlternative(1)?.niveau, NIVEAU_PREMIERE_ALTERNATIVE);

  for (const entree of ALTERNATIVES_DE_L_ECHELLE) {
    assert.equal(alternativeDebloquee(entree, entree.niveau - 1), false, `${entree.carteId} reste fermée un niveau avant`);
    assert.equal(alternativeDebloquee(entree, entree.niveau), true, `${entree.carteId} s’ouvre à son niveau`);
  }

  // Une illustration de boutique ne s'ouvre jamais par le niveau : elle s'achète.
  for (const entree of ALTERNATIVES_DE_BOUTIQUE.slice(0, 5)) {
    assert.equal(alternativeDebloquee(entree, COURBE.niveauMax), false,
      `${entree.carteId} : le niveau ne l’ouvre pas`);
    assert.equal(alternativeOuverte(entree, COURBE.niveauMax, []), false, 'ni sans achat');
    assert.equal(alternativeOuverte(entree, 1, [entree.carteId]), true, 'mais l’achat l’ouvre');
  }

  // Le nombre d’ouvertures suit le niveau, sans jamais redescendre.
  let precedent = 0;
  for (let niveau = 1; niveau <= COURBE.niveauMax; niveau += 1) {
    const ouvertes = alternativesDebloquees(niveau).length;
    assert.ok(ouvertes >= precedent, 'la barre ne reprend jamais une illustration');
    precedent = ouvertes;
  }
  assert.equal(alternativesDebloquees(COURBE.niveauMax).length, total, 'tout est ouvert au plafond');
  assert.equal(prochaineAlternative(COURBE.niveauMax), null);
  assert.equal(alternativesRestantes(COURBE.niveauMax), 0);
  // Le lot se boucle exactement au plafond : l'échelle ne déborde pas.
  const dernierNiveau = ALTERNATIVES_DE_L_ECHELLE.at(-1).niveau;
  assert.equal(dernierNiveau, COURBE.niveauMax, 'le dernier palier est le plafond');
  assert.equal(alternativesRestantes(dernierNiveau - 1), 1, 'il reste une illustration juste avant');
});

test('la fiche se relit par identifiant de carte, et son URL pointe sous public/', () => {
  const entree = RPG_ILLUSTRATIONS_ALTERNATIVES[0];
  assert.equal(alternativeDeCarte(entree.carteId), entree);
  assert.equal(alternativeDeCarte('carte-qui-n-existe-pas'), null);
  assert.equal(alternativeDeCarte(undefined), null);
  const url = illustrationAlternativeUrl(entree);
  assert.ok(url.startsWith('/'), `${url} : un chemin servi commence par « / »`);
  assert.ok(url.includes(`cards/alt/${entree.carteId}.jpg`), url);
  assert.equal(nomDeLaCarte(entree.carteId), cardById(entree.carteId).name);
});

test('le Catalogue monte la vignette alternative et la fiche ouvre sa vitrine', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /function CarteIllustrationAlternative\(/,
    'le composant de la vignette existe');
  assert.match(page, /<CarteIllustrationAlternative[\s\S]{0,120}niveau=\{niveauOnglet\}/,
    'la fiche du catalogue le monte avec le niveau du joueur');
  assert.match(page, /data-alternative-source=\{alternative\.source\}/,
    'la vignette dit d’où vient la peinture : échelle ou boutique');
  assert.match(page, /alternativesRestantes\(niveauOnglet\)/,
    'l’en-tête du catalogue compte les illustrations gagnées');
  assert.match(page, /ALTERNATIVES_DE_BOUTIQUE\.filter/,
    'l’en-tête compte aussi les acquisitions de la boutique');
  // Le libellé demandé pour l'échelle, mot pour mot.
  assert.match(page, /Gagnez cette carte en montant au niveau/,
    'l’échelle s’annonce « Gagnez cette carte en montant au niveau N »');
  // Aucune image n'est chargée pour une tuile d'échelle non gagnée : la
  // récompense se mérite. La boutique, elle, est une devanture.
  assert.match(page, /const montreImage = alternative\.source === 'boutique' \|\| ouverte;/,
    'la boutique montre ce qu’elle vend, l’échelle cache ce qu’elle donnera');

  // La vitrine vit dans la fiche, avec son bouton d'achat et sa bascule.
  assert.match(page, /function VitrineIllustration\(/, 'la vitrine existe');
  assert.match(page, /data-vitrine-acheter=\{alternative\.prix\}/, 'la vitrine porte le bouton d’achat');
  assert.match(page, /data-vitrine-basculer=\{affichee \? 'retirer' : 'afficher'\}/, 'la vitrine bascule l’affichage sur la carte');
  assert.match(page, /<VitrineIllustration[\s\S]{0,200}niveau=\{niveau\}/, 'la fiche passe le niveau à la vitrine');
});

test('la preview en jeu ne montre aucune vitrine d’illustration alternative', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

  // La fiche est la même partout, mais la vitrine se commande : le catalogue la
  // garde, la table du duel la coupe.
  assert.match(page, /avecVitrine = true,/, 'la fiche accepte de se passer de vitrine');
  assert.match(
    page,
    /\{avecVitrine \? \([\s\S]{0,400}?<VitrineIllustration[\s\S]{0,400}?: null\}/,
    'la vitrine n’est montée que si la fiche la demande',
  );

  // Le clic droit sur la table — « le clic droit l'ouvre sur la table » — est le
  // seul point d'appel en jeu : il coupe la vitrine et ne reçoit aucun rappel
  // d'achat ni de bascule.
  const blocJeu = page.match(
    /\{apercuCatalogue && \(\s*<ApercuCarteCatalogue[\s\S]*?\/>\s*\)\}/g,
  ) ?? [];
  assert.equal(blocJeu.length, 3, 'trois fiches : catalogue, collection et table');
  const ficheEnJeu = blocJeu.filter((bloc) => bloc.includes('avecVitrine={false}'));
  assert.equal(ficheEnJeu.length, 1, 'une seule fiche tourne en jeu, et elle coupe la vitrine');
  assert.doesNotMatch(ficheEnJeu[0], /onAcheterIllustration/, 'la fiche en jeu ne reçoit pas le rappel d’achat');
  assert.doesNotMatch(ficheEnJeu[0], /onBasculerIllustration/, 'la fiche en jeu ne reçoit pas le rappel de bascule');

  // Les fiches hors jeu — catalogue et collection — gardent la leur.
  const fichesHorsJeu = blocJeu.filter((bloc) => !bloc.includes('avecVitrine={false}'));
  assert.equal(fichesHorsJeu.length, 2, 'catalogue et collection gardent la vitrine');
  for (const fiche of fichesHorsJeu) {
    assert.match(fiche, /onAcheterIllustration=\{acheterIllustration\}/,
      'hors jeu, la fiche garde son bouton d’achat');
  }
});

test('l’illustration achetée peut habiller la carte elle-même', () => {
  const art = readFileSync(new URL('../src/games/rpgCardArt.js', import.meta.url), 'utf8');
  assert.match(art, /export function definirIllustrationsAffichees\(/, 'la table d’affichage se pose depuis la bourse');
  assert.match(art, /const alternative = ILLUSTRATIONS_AFFICHEES\.get\(artId\);\s*\n\s*if \(alternative\) return illustrationAlternativeUrl\(alternative\);/,
    'cardArt rend la peinture choisie avant la peinture de la passe');

  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /definirIllustrationsAffichees\(choisies\)/,
    'la page repose les choix à chaque changement de bourse');
  assert.match(page, /alternativeOuverte\(alternative, niveauDuJoueur, achetees\)/,
    'seules les peintures vraiment possédées sont affichées');
});

test('les illustrations tombées pendant la partie s’affichent en fin de duel', async () => {
  const total = ALTERNATIVES_DE_L_ECHELLE.length;
  // Rien de gagné : rien à montrer.
  assert.deepEqual(alternativesGagneesEntre(1, 1), []);
  assert.deepEqual(alternativesGagneesEntre(5, 3), [], 'un niveau qui ne monte pas ne rend rien');
  // Un palier franchi rend exactement son illustration, dans l'ordre.
  const gagnees = alternativesGagneesEntre(3, 5);
  assert.equal(gagnees.length, 1);
  assert.equal(gagnees[0].carteId, ALTERNATIVES_DE_L_ECHELLE[0].carteId);
  // Un saut de plusieurs paliers (grosse victoire, retour sur un appareil)
  // rend tout ce qu'il a ouvert.
  assert.equal(alternativesGagneesEntre(1, 9).length, 2);
  assert.equal(alternativesGagneesEntre(1, COURBE.niveauMax).length, total, 'le plafond rend tout le lot');
  // Aucun doublon : chaque illustration ne tombe qu'une fois.
  const ids = alternativesGagneesEntre(1, COURBE.niveauMax).map((entree) => entree.carteId);
  assert.equal(new Set(ids).size, ids.length);

  // Et l'écran de fin de duel les monte vraiment, avec leur image.
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /alternativesGagneesEntre\(niveauDeXp\(xpFinDeDuel\.depart\), niveauDeXp\(xpFinDeDuel\.arrivee\)\)/,
    'la fin de duel compare le niveau d’avant et d’après');
  assert.match(page, /data-alternatives-gagnees=\{illustrationsGagnees\.length\}/,
    'le bloc des gains porte son compte');
  assert.match(page, /<img[\s\S]{0,200}illustrationAlternativeUrl\(alternative\)/,
    'chaque illustration gagnée montre sa peinture, pas seulement son nom');
  assert.match(page, /nomDeLaCarte\(alternative\.carteId\)/,
    'la vignette nomme aussi la carte doublée');
});
