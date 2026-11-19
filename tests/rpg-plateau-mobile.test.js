/** Le plateau à deux lignes, au doigt — la géométrie du téléphone paysage.
 *
 *  Le champ tient en deux bandes (une par camp) sous le bandeau d'avatar et
 *  au-dessus de la main. En paysage, ces deux bandes ne mesurent que la moitié
 *  de la table : la colonne d'une case ne peut donc pas se contenter d'être
 *  « 72 % d'une carte », sinon les deux rangées du joueur débordent de leur
 *  bande, passent par-dessus l'avatar et poussent la main hors de l'écran.
 *
 *  Deux vérifications : les feuilles de style portent bien le plafond (regex,
 *  pour qu'une refonte accidentelle le perde), et l'arithmétique du modèle
 *  tient sur les tailles réelles (iPhone SE au téléphone pliable, paysage).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, '');

const essai = sansCommentaires(css('rpg-mana-essai.css'));
const avatars = sansCommentaires(css('rpg-avatars-plateau.css'));

// ── Les constantes du CSS tactile ───────────────────────────────────────────
// Chacune vient d'une règle précise ; le test les rejoue en JavaScript pour
// mesurer le plateau sans navigateur.
const PAD = 6;              // --rpg-touch-pad (rpg-mobile.css)
const GAP = 4;              // --rpg-touch-gap
const VIE = 20;             // --rpg-vie-bar-height au doigt
const clamp = (min, valeur, max) => Math.max(min, Math.min(valeur, max));

function mesures(largeur, hauteur) {
  const carte = clamp(44, 0.1555 * hauteur, 104);         // --duel-card
  const avatar = clamp(56, 1.2 * carte, 96);              // --rpg-avatar-height
  const nav = avatar + VIE + 4;                           // --rpg-avatar-nav
  const main = Math.max(44, 0.82 * carte) * 1.38;         // --rpg-touch-hand
  const champ = Math.min(1.05 * carte,                    // --rpg-field-card
    Math.max(34, (0.5 * hauteur - avatar - VIE - 18) * 0.8));
  // 50 % de la table, moins la marge, le bandeau d'avatar et une gouttière et
  // demie : c'est le maximum de la bande adverse (`grid-template-rows`).
  const libre = hauteur - 2 * PAD - 3 * GAP - nav - main;
  const bande = Math.min(0.5 * hauteur - PAD - nav - 1.5 * GAP, libre / 2); // --rpg-board-band
  const colonne = clamp(24,
    Math.min(champ * 0.72, (bande - 16) / 2.5),           // --essai-colonne (doigt)
    champ);
  // Une rangée : deux hauteurs de carte (4/5), la gouttière des deux rangées
  // et sa marge intérieure haute et basse (4 px chacune).
  const contenu = colonne * 2.5 + GAP + 8;
  return { carte, avatar, nav, main, champ, bande, colonne, contenu, libre, largeur };
}

const PAYSAGES = [
  [568, 320, 'iPhone SE, le plus court'],
  [667, 375, 'iPhone 8'],
  [740, 360, 'Android bas de gamme'],
  [844, 390, 'iPhone 12-15'],
  [926, 428, 'iPhone Max'],
  [1024, 768, 'iPad en paysage'],
];

test('la colonne du plateau au doigt est plafonnée par la bande, pas par la carte', () => {
  const regle = essai.match(/\.rpg-battle--touch\[data-mode-mana="essai"\] \.card-row\[data-lignes="true"\] \{([^}]*)\}/);
  assert.ok(regle, 'la règle tactile du plateau à deux lignes existe');
  const corps = regle[1];
  assert.match(corps, /--essai-colonne: clamp\(24px,/, 'un plancher de 24 px');
  assert.match(corps, /var\(--rpg-field-card[^}]*\* \.72\)/, 'la mesure de la carte reste la borne de départ');
  assert.match(corps, /var\(--rpg-board-band, 120px\)/, 'la hauteur de la bande plafonne la colonne');
  assert.match(corps, /min-height: calc\(var\(--essai-colonne\) \* 2\.5 \+ 4px\)/, 'la rangée garde la hauteur de ses deux lignes');
});

test('la table mesure la bande dont deux lignes disposent, svh compris', () => {
  const dvh = avatars.match(/\.card-table:has\(\.card-row\[data-lignes="true"\]\) \{([\s\S]*?)\n\}/);
  assert.ok(dvh, 'la table porte la mesure des deux lignes');
  assert.match(dvh[1], /--rpg-board-band: min\(/, 'la plus petite des deux bornes');
  assert.match(dvh[1], /calc\(50dvh - var\(--rpg-touch-pad\) - var\(--rpg-avatar-nav\)/, 'la moitié de la table, moins le bandeau');
  assert.match(dvh[1], /--rpg-touch-hand\)\) \/ 2\)\)/, 'et la moitié de ce qui reste sous le bandeau');
  assert.match(avatars, /@supports \(height: 100svh\) \{[\s\S]*--rpg-board-band: min\(\s*calc\(50svh -/,
    'la même mesure en `svh`, stable pendant la partie');
});

test('les deux rangées tiennent dans leur bande, à toutes les tailles de téléphone', () => {
  for (const [largeur, hauteur, nom] of PAYSAGES) {
    const m = mesures(largeur, hauteur);
    assert.ok(m.contenu <= m.bande + 1e-9 || m.contenu <= m.libre / 2 + 1e-9,
      `${nom} (${largeur}×${hauteur}) : deux rangées de ${m.contenu.toFixed(1)} px dans une bande de ${m.bande.toFixed(1)} px`);
    assert.ok(m.contenu <= m.libre / 2 + 1e-9,
      `${nom} : les deux camps se partagent les ${m.libre.toFixed(1)} px libres (deux fois ${m.contenu.toFixed(1)} px)`);
    assert.ok(m.colonne >= 24, `${nom} : la colonne garde son plancher de 24 px`);
    // Le reste de la table n'est pas comprimé : la bande du joueur reçoit ce
    // que la bande adverse laisse, et elle suffit à ses deux rangées.
    const adverse = Math.min(m.contenu, m.bande);
    assert.ok(m.libre - adverse >= m.contenu - 1e-9,
      `${nom} : la bande du joueur (${(m.libre - adverse).toFixed(1)} px) porte ses deux rangées`);
    // Et rien ne dépasse de la table : bandeau, deux bandes, main, marges.
    const total = m.nav + adverse + (m.libre - adverse) + m.main + 2 * PAD + 3 * GAP;
    assert.ok(total <= hauteur + 1e-9, `${nom} : la table tient dans l'écran`);
  }
});

test('les cases restent dans la largeur du champ, même sur le plus petit écran', () => {
  for (const [largeur, hauteur, nom] of PAYSAGES) {
    const m = mesures(largeur, hauteur);
    const gouttiere = Math.max(6, m.carte * 0.12);
    // Les rangées débordent volontairement de la colonne centrale (les cinq
    // cases passent sur les rails, dont le milieu est vide) : ce qui compte,
    // c'est que les dix cases ne traversent pas la table d'un bord à l'autre.
    const largeurRangee = 5 * m.colonne + 4 * gouttiere + 2 * Math.max(8, m.carte * 0.12);
    assert.ok(largeurRangee <= largeur,
      `${nom} : cinq cases (${largeurRangee.toFixed(0)} px) tiennent dans ${largeur} px`);
  }
});
