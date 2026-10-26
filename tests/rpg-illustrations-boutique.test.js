/**
 * La boutique des illustrations alternatives — acheter une ancienne peinture
 * en crédits ◈, puis l'afficher sur sa carte.
 *
 * Ce que ces tests protègent :
 *
 * 1. **la bourse** — un achat débite une fois, refuse proprement (solde court,
 *    double achat), et ne se perd jamais à la fusion de deux appareils ;
 * 2. **l'affichage** — on n'affiche que ce qu'on possède : acheté, ou gagné à
 *    l'échelle (`gagnee`) ;
 * 3. **le branchement** — le hook de la bourse, la vitrine et `cardArt` se
 *    répondent : un achat se voit sur la carte.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  acheterIllustration,
  basculerIllustrationAffichee,
  fusionnerPortefeuilles,
  illustrationAffichee,
  illustrationsAffichees,
  illustrationsVides,
  normaliserIllustrations,
  normaliserPortefeuille,
  portefeuilleVide,
  possedeIllustration,
} from '../src/games/rpgCredits.js';
import {
  ALTERNATIVES_DE_BOUTIQUE,
  ALTERNATIVES_DE_L_ECHELLE,
  PRIX_ILLUSTRATION,
  prixIllustration,
  rareteDeLaCarte,
} from '../src/games/rpgCardArtAlternatives.js';

const bourse = (credits = 0) => ({ ...portefeuilleVide(), credits });
const achetable = ALTERNATIVES_DE_BOUTIQUE[0];
const gagnable = ALTERNATIVES_DE_L_ECHELLE[0];

test('le portefeuille d’un joueur neuf n’a aucune illustration', () => {
  const vide = portefeuilleVide();
  assert.deepEqual(vide.illustrations, illustrationsVides());
  assert.deepEqual(normaliserPortefeuille(null).illustrations, { achetees: [], affichees: [] });
  assert.deepEqual(normaliserIllustrations({ achetees: ['a', 'a', '', 3, null] }).achetees, ['a'],
    'les listes sont propres : chaînes non vides, sans doublon');
  assert.deepEqual(normaliserIllustrations(undefined), { achetees: [], affichees: [] },
    'une sauvegarde d’avant la boutique ne casse rien');
  // Les deux listes sont indépendantes : une peinture gagnée à l'échelle
  // s'affiche sans avoir été achetée.
  assert.deepEqual(normaliserIllustrations({ affichees: ['susanoo'] }).affichees, ['susanoo']);
});

test('acheter une illustration débite une fois et se refuse proprement', () => {
  const prix = prixIllustration(achetable.carteId);
  assert.equal(prix, achetable.prix, 'le prix de la vitrine est celui de la table');

  // Solde court : rien n'est débité, le manque est annoncé.
  const pauvre = bourse(prix - 10);
  const refus = acheterIllustration(pauvre, { carteId: achetable.carteId, prix });
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'credits-insuffisants');
  assert.equal(refus.manque, 10);
  assert.equal(refus.portefeuille.credits, prix - 10, 'un refus n’ampute pas la bourse');
  assert.deepEqual(refus.portefeuille.illustrations.achetees, []);

  // Achat : débit exact, peinture acquise et affichée d'emblée.
  const achat = acheterIllustration(bourse(prix), { carteId: achetable.carteId, prix });
  assert.equal(achat.ok, true);
  assert.equal(achat.portefeuille.credits, 0);
  assert.deepEqual(achat.portefeuille.illustrations.achetees, [achetable.carteId]);
  assert.equal(achat.portefeuille.illustrations.affichees.includes(achetable.carteId), true,
    'ce qu’on vient de payer s’affiche aussitôt');
  assert.equal(possedeIllustration(achat.portefeuille, achetable.carteId), true);

  // Double achat : refusé, et sans débit.
  const double = acheterIllustration({ ...achat.portefeuille, credits: 999 }, { carteId: achetable.carteId, prix });
  assert.equal(double.ok, false);
  assert.equal(double.raison, 'deja-acquise');
  assert.equal(double.portefeuille.credits, 999);

  // Prix nul ou carte absente : refus explicites.
  assert.equal(acheterIllustration(bourse(999), { carteId: achetable.carteId, prix: 0 }).raison, 'prix-invalide');
  assert.equal(acheterIllustration(bourse(999), { carteId: '', prix }).raison, 'carte-inconnue');
});

test('on n’achète pas la peinture d’une carte qu’on ne possède pas', () => {
  const prix = prixIllustration(achetable.carteId);

  // Sans la carte originale, la bourse riche est quand même refusée.
  const refus = acheterIllustration(bourse(999), {
    carteId: achetable.carteId,
    prix,
    possedee: false,
  });
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'carte-non-possédée');
  assert.equal(refus.prix, prix, 'le refus annonce le prix de la vitrine');
  assert.equal(refus.portefeuille.credits, 999, 'un refus n’ampute pas la bourse');
  assert.deepEqual(refus.portefeuille.illustrations.achetees, [], 'rien n’est acquis');

  // La même bourse, la carte possédée : l'achat passe.
  const achat = acheterIllustration(bourse(999), {
    carteId: achetable.carteId,
    prix,
    possedee: true,
  });
  assert.equal(achat.ok, true, 'la possession ouvre l’achat');
  assert.equal(achat.portefeuille.credits, 999 - prix);

  // Le défaut ne change pas la bourse : ce module ne connaît pas la collection,
  // c'est l'appelant qui sait. Les appels historiques restent valides.
  assert.equal(acheterIllustration(bourse(999), { carteId: achetable.carteId, prix }).ok, true);
});

test('la bourse relit la collection avant de vendre une illustration', () => {
  const hook = readFileSync(new URL('../src/games/useSablierBourse.js', import.meta.url), 'utf8');
  // La collection est reconstruite sur l'état courant, dans le geste d'achat :
  // l'écran ne peut pas la lui souffler, ni la contourner.
  const geste = hook.match(/const acheterIllustration = useCallback[\s\S]*?\}, \[appliquer, pousser\]\);/);
  assert.ok(geste, 'le geste d’achat d’illustration existe');
  assert.match(geste[0], /collectionJoueur\(\{/, 'la collection est relue au moment du geste');
  assert.match(geste[0], /possedee: possedeCarte\(collection, cardId\)/, 'la possession entre dans l’achat');
});

test('chaque prix suit la rareté de la carte doublée', () => {
  for (const entree of ALTERNATIVES_DE_BOUTIQUE) {
    assert.equal(entree.prix, PRIX_ILLUSTRATION[rareteDeLaCarte(entree.carteId)]);
  }
  // La table couvre les quatre raretés du catalogue.
  for (const rarete of ['commune', 'inhabituelle', 'rare', 'mythique']) {
    assert.ok(Number.isInteger(PRIX_ILLUSTRATION[rarete]) && PRIX_ILLUSTRATION[rarete] > 0, `${rarete} a son prix`);
  }
});

test('on n’affiche sur une carte que ce qu’on possède', () => {
  const prix = prixIllustration(achetable.carteId);
  const achat = acheterIllustration(bourse(prix), { carteId: achetable.carteId, prix });

  // Bascule : on remet la peinture de la passe, puis on la remet en place.
  const retiree = basculerIllustrationAffichee(achat.portefeuille, achetable.carteId);
  assert.equal(retiree.ok, true);
  assert.equal(retiree.affichee, false);
  assert.equal(illustrationAffichee(retiree.portefeuille, achetable.carteId), false);
  assert.equal(possedeIllustration(retiree.portefeuille, achetable.carteId), true, 'retirer l’affichage ne rend pas la peinture');
  const remise = basculerIllustrationAffichee(retiree.portefeuille, achetable.carteId);
  assert.equal(remise.affichee, true);
  assert.deepEqual(illustrationsAffichees(remise.portefeuille), [achetable.carteId]);

  // Une peinture qui n'est ni achetée ni gagnée ne s'affiche pas.
  const refus = basculerIllustrationAffichee(portefeuilleVide(), achetable.carteId);
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'non-acquise');
  assert.deepEqual(refus.portefeuille.illustrations.affichees, []);

  // Une peinture gagnée à l'échelle s'affiche sans achat — l'écran le déclare.
  const gagnee = basculerIllustrationAffichee(portefeuilleVide(), gagnable.carteId, { gagnee: true });
  assert.equal(gagnee.ok, true);
  assert.equal(gagnee.affichee, true);
  assert.deepEqual(gagnee.portefeuille.illustrations.affichees, [gagnable.carteId]);
  assert.deepEqual(gagnee.portefeuille.illustrations.achetees, [], 'et sans être marquée comme achetée');
});

test('les achats survivent à la fusion de deux appareils', () => {
  const prix = prixIllustration(achetable.carteId);
  const telephone = acheterIllustration(bourse(prix), { carteId: achetable.carteId, prix }).portefeuille;
  const autre = ALTERNATIVES_DE_BOUTIQUE[1];
  const bureau = acheterIllustration(bourse(prixIllustration(autre.carteId)), {
    carteId: autre.carteId,
    prix: prixIllustration(autre.carteId),
  }).portefeuille;

  const fusion = fusionnerPortefeuilles(telephone, bureau);
  assert.deepEqual(
    [...fusion.portefeuille.illustrations.achetees].sort(),
    [achetable.carteId, autre.carteId].sort(),
    'aucun achat ne se perd dans la fusion',
  );
  assert.equal(fusion.modifie, true);
  // Fusionner deux fois la même bourse ne change plus rien.
  assert.equal(fusionnerPortefeuilles(fusion.portefeuille, fusion.portefeuille).modifie, false);
});

test('la vitrine, le hook et cardArt se répondent', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  // La vitrine dit son prix et son manque, et propose les deux gestes.
  assert.match(page, /Acheter · \{creditsLisible\(alternative\.prix\)\} ◈/, 'le bouton d’achat écrit son prix');
  assert.match(page, /Il manque \$\{creditsLisible\(manque\)\} ◈/, 'le manque se dit en toutes lettres');
  assert.match(page, /onAcheter\?\.\(carte\.id\)/, 'le bouton appelle l’achat de la bourse');
  assert.match(page, /onBasculer\?\.\(carte\.id, \{ gagnee \}\)/, 'la bascule dit si la peinture est gagnée');

  const hook = readFileSync(new URL('../src/games/useSablierBourse.js', import.meta.url), 'utf8');
  assert.match(hook, /acheterIllustrationAuxCredits\(avant\.bourse/, 'le hook débite depuis la bourse courante');
  assert.match(hook, /prix: prixIllustration\(cardId\)/, 'le prix vient de la table, pas de l’écran');
  assert.match(hook, /acheterIllustration,\n\s*basculerIllustration,/, 'les deux gestes sont rendus à la page');
  assert.match(hook, /appliquer\(achat\.portefeuille, avant\.quetes, avant\.profil\);/, 'l’achat est écrit et poussé au compte');

  const art = readFileSync(new URL('../src/games/rpgCardArt.js', import.meta.url), 'utf8');
  assert.match(art, /ILLUSTRATIONS_AFFICHEES\.set\(alternative\.carteId, alternative\)/, 'la table d’affichage se remplit par carte');
});
