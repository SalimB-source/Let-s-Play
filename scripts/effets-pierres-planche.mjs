/**
 * La planche de revue des pierres d'effets — `scripts/effets-pierres-planche.mjs`
 *
 * Assemble, sans navigateur ni React, une planche unique avec le balisage réel
 * des emblèmes (`plaqueSvg`, sprite des symboles et données des fiches) :
 * avant/après, faces de cartes, pastilles, les 64 pierres rangées par famille,
 * l'échelle des tailles et les états.
 *
 *   node scripts/effets-pierres-planche.mjs
 *   node scripts/effets-pierres-planche.mjs --out /tmp/planche.svg
 *
 * Par défaut la planche s'écrit — en SVG, net à toutes les tailles — dans
 * `docs/rpg/assets/pierres-effets.svg`, où la doc 28 la reprend. Pour en faire
 * un PNG (revue dans un ticket, par exemple) :
 *
 *   node scripts/effets-pierres-planche.mjs --out /tmp/planche.svg
 *   python3 -c "import resvg_py, sys; open('/tmp/planche.png','wb').write(bytes(resvg_py.svg_to_bytes(svg_path='/tmp/planche.svg', zoom=2)))"
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { EFFETS_SPRITE, EFFET_LIBELLES, pastillesPourCarte } from '../src/games/effetIcons.js';
import { cardById } from '../src/games/rpgCards.js';
import {
  PLAQUE_FAMILLES,
  PLAQUE_FAMILLE_EFFET,
  PLAQUE_PIERRES,
  plaqueSvg,
} from '../src/games/effetPlaques.js';

const racine = new URL('../', import.meta.url);
const argument = process.argv.indexOf('--out');
const sortie = argument > -1
  ? process.argv[argument + 1]
  : fileURLToPath(new URL('docs/rpg/assets/pierres-effets.svg', racine));

const sprite = EFFETS_SPRITE.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const pierre = (cle, taille, protection) => plaqueSvg(cle, { size: taille, ...(protection ? { protectionContre: protection } : {}) })
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>$/, '');
/** Une pierre posée à (x, y). */
const poser = (x, y, cle, taille) => `<g transform="translate(${x},${y})">${pierre(cle, taille)}</g>`;
const texte = (x, y, contenu, { size = 14, fill = '#efe4cf', weight = 400, anchor = 'start', ls = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${contenu}</text>`;

const LARGEUR = 1080;
const parts = [];
let y = 0;

/* ── Le titre ──────────────────────────────────────────────────────────────── */
y = 62;
parts.push(texte(48, y, 'Les pierres d’effets', { size: 34, weight: 700, ls: -0.5 }));
parts.push(texte(48, y + 26,
  'Chaque effet du Sablier se pose sur un emblème taillé — forme = famille d’action, pierre = registre, pictogramme blanc.',
  { size: 13.5, fill: '#b7a98f' }));

/* ── Avant / après ─────────────────────────────────────────────────────────── */
y += 46;
parts.push(`<rect x="48" y="${y}" width="480" height="76" rx="11" fill="#090b0e" fill-opacity=".55" stroke="#edcb8b" stroke-opacity=".14"/>`);
parts.push(`<rect x="552" y="${y}" width="480" height="76" rx="11" fill="#090b0e" fill-opacity=".55" stroke="#edcb8b" stroke-opacity=".3"/>`);
parts.push(texte(64, y + 20, 'AVANT', { size: 10, weight: 700, fill: '#8d8171', ls: 1.4 }));
parts.push(texte(568, y + 20, 'APRÈS', { size: 10, weight: 700, fill: '#edcb8b', ls: 1.4 }));
const exemples = [['furie', 'Furie 2'], ['bouclier', 'Bouclier'], ['malediction', 'Malédiction']];
let curseur = 64;
for (const [cle, libelle] of exemples) {
  const largeur = 34 + libelle.length * 6.2;
  parts.push(`<rect x="${curseur}" y="${y + 30}" width="${largeur}" height="30" rx="15" fill="#05080b" fill-opacity=".8" stroke="#edcb8b" stroke-opacity=".45"/>`);
  // L'ancienne icône : le trait doré monochrome, tel qu'il s'imprimait avant.
  parts.push(`<svg x="${curseur + 6}" y="${y + 38}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#edcb8b" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><use href="#${plaqueSvg(cle).match(/data-symbole="([^"]+)"/)[1]}"/></svg>`);
  parts.push(texte(curseur + 27, y + 49.5, libelle, { size: 11.5, weight: 600, fill: '#ffeec2' }));
  curseur += largeur + 10;
}
curseur = 568;
for (const [cle, libelle] of exemples) {
  const largeur = 34 + libelle.length * 6.2;
  parts.push(`<rect x="${curseur}" y="${y + 30}" width="${largeur}" height="30" rx="15" fill="#05080b" fill-opacity=".8" stroke="#edcb8b" stroke-opacity=".45"/>`);
  parts.push(poser(curseur + 5, y + 35, cle, 20));
  parts.push(texte(curseur + 30, y + 49.5, libelle, { size: 11.5, weight: 600, fill: '#ffeec2' }));
  curseur += largeur + 10;
}

/* ── Sur une face de carte ─────────────────────────────────────────────────── */
y += 92;
parts.push(texte(48, y, 'SUR UNE FACE DE CARTE', { size: 12, weight: 600, fill: '#edcb8b', ls: 1.6 }));
parts.push(texte(300, y, 'la pierre est le badge : plus de pastille ronde, seul le chiffre garde la sienne', { size: 12, fill: '#8d8171' }));
const faces = [
  ['Jarl au marteau de guerre', [['provocation'], ['overkill'], ['furie', 2]]],
  ['Maître du marteau', [['envol'], ['overkill'], ['furie', 3], ['tenacite']]],
  ['Maître — gains en attente', [['envol', null, true], ['overkill', null, true], ['furie', 3]]],
];
faces.forEach(([nom, badges], index) => {
  const x = 48 + index * 248;
  const haut = y + 18;
  const largeur = 224;
  const hauteur = 158;
  parts.push(`<defs><linearGradient id="face-${index}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3a29"/><stop offset=".55" stop-color="#2a211a"/><stop offset="1" stop-color="#14100e"/></linearGradient></defs>`);
  parts.push(`<rect x="${x}" y="${haut}" width="${largeur}" height="${hauteur}" rx="12" fill="url(#face-${index})" stroke="#edcb8b" stroke-opacity=".32"/>`);
  parts.push(`<rect x="${x + 12}" y="${haut + 12}" width="22" height="28" rx="5" fill="#1d1712" stroke="#edcb8b" stroke-opacity=".22"/>`);
  parts.push(texte(x + largeur / 2, haut + hauteur - 58, nom.toUpperCase(), { size: 9.5, weight: 700, fill: '#f3e7cf', anchor: 'middle', ls: .6 }));
  let bx = x + 14;
  const by = haut + hauteur - 44;
  for (const [cle, valeur, enAttente] of badges) {
    parts.push(`<g${enAttente ? ' opacity="0.5" style="filter:grayscale(1)"' : ''}>${poser(bx, by, cle, 18)}</g>`);
    if (valeur != null) {
      parts.push(`<rect x="${bx + 18}" y="${by + 11}" width="15" height="11" rx="5.5" fill="#0b0908" stroke="#edcb8b" stroke-opacity=".5"/>`);
      parts.push(texte(bx + 25.5, by + 19.5, String(valeur), { size: 8, weight: 700, fill: '#ffe9a0', anchor: 'middle' }));
    }
    bx += 34;
  }
});

/* ── Les pastilles d'une fiche ─────────────────────────────────────────────── */
y += 210;
parts.push(texte(48, y, 'LES PASTILLES D’UNE FICHE', { size: 12, weight: 600, fill: '#edcb8b', ls: 1.6 }));
parts.push(texte(330, y, 'l’emblème ouvre le mot, le mot reste écrit', { size: 12, fill: '#8d8171' }));
['jarl-au-marteau-de-guerre', 'salem', 'lionne-du-midi-ardent', 'onna-musha-des-cendres'].forEach((id, index) => {
  const x = 48 + (index % 2) * 502;
  const haut = y + 16 + Math.floor(index / 2) * 92;
  parts.push(`<rect x="${x}" y="${haut}" width="480" height="78" rx="11" fill="#0a0c0f" fill-opacity=".8" stroke="#edcb8b" stroke-opacity=".2"/>`);
  parts.push(texte(x + 14, haut + 22, (cardById(id)?.name ?? id).toUpperCase(), { size: 10, weight: 700, fill: '#edcb8b', ls: .8 }));
  let px = x + 14;
  for (const pastille of pastillesPourCarte(cardById(id)).slice(0, 3)) {
    const libelle = `${pastille.label}${pastille.valeur != null && !pastille.valeurMasquee && pastille.cle !== 'bouclier' ? ` ${pastille.valeur}` : ''}`;
    const largeur = 30 + libelle.length * 6.2;
    parts.push(`<rect x="${px}" y="${haut + 36}" width="${largeur}" height="30" rx="15" fill="#05080b" fill-opacity=".8" stroke="#edcb8b" stroke-opacity=".45"/>`);
    parts.push(poser(px + 5, haut + 41, pastille.cle, 20));
    parts.push(texte(px + 30, haut + 55.5, libelle, { size: 11.5, weight: 600, fill: '#ffeec2' }));
    px += largeur + 10;
  }
});

/* ── Toutes les pierres, par famille ───────────────────────────────────────── */
y += 210;
parts.push(texte(48, y, 'TOUTES LES PIERRES', { size: 12, weight: 600, fill: '#edcb8b', ls: 1.6 }));
parts.push(texte(300, y, 'rangées par famille, avec leur registre', { size: 12, fill: '#8d8171' }));
y += 14;
for (const [famille, { forme, pierre: nomPierre, libelle }] of Object.entries(PLAQUE_FAMILLES)) {
  const cles = Object.keys(PLAQUE_FAMILLE_EFFET).filter((cle) => PLAQUE_FAMILLE_EFFET[cle] === famille);
  const lignes = Math.ceil(cles.length / 12);
  const hauteur = 30 + lignes * 70;
  const teinte = PLAQUE_PIERRES[nomPierre];
  parts.push(`<rect x="48" y="${y}" width="${LARGEUR - 96}" height="${hauteur}" rx="12" fill="#090b0e" fill-opacity=".55" stroke="#edcb8b" stroke-opacity=".14"/>`);
  parts.push(`<rect x="64" y="${y + 16}" width="12" height="12" rx="3" fill="${teinte.fond}" stroke="${teinte.lueur}" stroke-opacity=".6"/>`);
  parts.push(texte(84, y + 26, libelle, { size: 14, weight: 700, fill: '#f0e6d3' }));
  parts.push(texte(LARGEUR - 64, y + 26, `${forme} · ${nomPierre} · ${cles.length} effets`, { size: 10.5, fill: '#8d8171', anchor: 'end' }));
  cles.forEach((cle, index) => {
    const x = 66 + (index % 12) * 84;
    const haut = y + 44 + Math.floor(index / 12) * 70;
    parts.push(poser(x, haut, cle, 36));
    const libelleCle = EFFET_LIBELLES[cle];
    const affiche = !libelleCle ? cle : (libelleCle.length > 17 ? `${libelleCle.slice(0, 16)}…` : libelleCle);
    parts.push(texte(x + 18, haut + 54, affiche, {
      size: 8.8,
      fill: libelleCle ? '#c9bda8' : '#7d7365',
      anchor: 'middle',
    }));
  });
  y += hauteur + 12;
}

/* ── L'échelle et les états ────────────────────────────────────────────────── */
y += 6;
parts.push(texte(48, y, 'L’ÉCHELLE ET LES ÉTATS', { size: 12, weight: 600, fill: '#edcb8b', ls: 1.6 }));
y += 14;
parts.push(`<rect x="48" y="${y}" width="${LARGEUR - 96}" height="170" rx="12" fill="#090b0e" fill-opacity=".55" stroke="#edcb8b" stroke-opacity=".14"/>`);
parts.push(texte(66, y + 22, 'Échelle', { size: 10.5, weight: 600, fill: '#8d8171', ls: 1.2 }));
let sx = 66;
for (const taille of [12, 14, 16, 18, 20, 24, 32]) {
  parts.push(poser(sx, y + 34, 'furie', taille));
  parts.push(poser(sx + 36, y + 34, 'bouclier', taille));
  parts.push(poser(sx + 72, y + 34, 'pioche', taille));
  parts.push(texte(sx + 30, y + 86, `${taille} px`, { size: 9.5, fill: '#8d8171', anchor: 'middle' }));
  sx += 144;
}
parts.push(`<line x1="66" y1="${y + 102}" x2="${LARGEUR - 66}" y2="${y + 102}" stroke="#edcb8b" stroke-opacity=".12"/>`);
parts.push(texte(66, y + 126, 'États', { size: 10.5, weight: 600, fill: '#8d8171', ls: 1.2 }));
const etats = [
  ['Ténacité prête', 'tenacite', false],
  ['Ténacité dépensée', 'tenacite', true],
  ['Parade en place', 'bouclier', false],
  ['Parade tombée', 'bouclier', true],
  ['Gain de Furie actif', 'envol', false],
  ['Gain en attente', 'envol', true],
];
let ex = 132;
for (const [libelle, cle, eteinte] of etats) {
  parts.push(`<g${eteinte ? ' opacity="0.5" style="filter:grayscale(1)"' : ''}>${poser(ex, y + 140, cle, 20)}</g>`);
  parts.push(texte(ex + 26, y + 154, libelle, { size: 10.5, fill: eteinte ? '#8d8171' : '#c9bda8' }));
  ex += 152;
}
y += 170 + 44;

const hauteur = y;
const planche = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${hauteur}" viewBox="0 0 ${LARGEUR} ${hauteur}">
<title>Le Sablier — les pierres d'effets</title>
<defs><radialGradient id="fond" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#241c15"/><stop offset=".6" stop-color="#14100e"/><stop offset="1" stop-color="#0b0908"/></radialGradient>${sprite}</defs>
<rect width="100%" height="100%" fill="url(#fond)"/>
${parts.join('\n')}
</svg>
`;

writeFileSync(sortie, planche);
console.log(`✓ Planche des pierres : ${Object.keys(PLAQUE_FAMILLE_EFFET).length} effets, `
  + `${Object.keys(PLAQUE_FAMILLES).length} familles — ${LARGEUR}×${hauteur}, écrite dans ${sortie}`);
