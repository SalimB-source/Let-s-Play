/**
 * Le motif gravé dans le cadre des magies et des terrains.
 * node scripts/rpg-card-motif-check.mjs
 *
 * La résille commune est posée une fois, sur `.rpg-battle` ; la mythique met
 * son zellige, les armes leur guilloché. Ce contrôle tient les trois motifs de
 * type qui s'y ajoutent — le losange de la Magie Rapide, l'étincelle de la
 * Sorcellerie, les strates du terrain : leur image — décodée puis relue par un
 * analyseur XML, parce qu'une URI mal échappée ne peindrait simplement rien —,
 * le dessin du sigle qu'elle doit reprendre, la tuile qui les répète le long de
 * l'anneau, et les surfaces qui les portent. Il vérifie aussi ce qu'ils ne
 * touchent pas : l'épaisseur, la couleur et la matière du cadre ne changent
 * pas, le zellige des mythiques reste au-dessus, et le Sabre maudit — une magie
 * au cadre d'acier — n'en reçoit aucun.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { cardMotifClass, magieFamille, motifCarte, motifInfo, RPG_CARD_MOTIFS } from '../src/games/rpgCards.js';

const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const battleCss = lire('rpg-battle.css');
const duel = lire('RpgDuelPage.jsx');
const guide = lire('RpgCardGuide.jsx');
const atelier = lire('RpgDeckAtelier.jsx');

// ── 1. Le catalogue ne nomme que deux motifs, et dit lesquels ────────────────
assert.deepEqual(Object.keys(RPG_CARD_MOTIFS).sort(), ['etincelle', 'losange', 'terrain'],
  'trois types portent un motif propre : la Magie Rapide, la Sorcellerie et le terrain');

// ── 2. Qui en porte un, qui n’en porte pas ──────────────────────────────────
const carte = (props) => ({ id: 'carte-de-test', name: 'Carte de test', ...props });
assert.equal(motifCarte(carte({ kind: 'magie', instant: true })), 'losange',
  'une Magie Rapide porte le losange taillé');
assert.equal(motifCarte(carte({ kind: 'magie' })), 'etincelle', 'une Sorcellerie porte l’étincelle');
assert.equal(motifCarte(carte({ kind: 'terrain' })), 'terrain', 'un terrain porte les strates');
for (const kind of ['creature', 'hero', 'arme', 'statut']) {
  assert.equal(motifCarte(carte({ kind })), null, `un ${kind} garde la résille commune`);
}
assert.equal(motifCarte(carte({ kind: 'magie', effet: { type: 'arme' } })), null,
  'le Sabre maudit — une magie au cadre d’acier — n’a pas le motif des magies');
assert.equal(magieFamille(carte({ kind: 'magie', effet: { type: 'arme' } })), null,
  'et c’est la même règle que le socle des familles : le Sabre maudit n’est pas un sort');
assert.equal(cardMotifClass(carte({ kind: 'magie', instant: true })), 'rpg-card--motif-losange');
assert.equal(cardMotifClass(carte({ kind: 'magie' })), 'rpg-card--motif-etincelle');
assert.equal(cardMotifClass(carte({ kind: 'terrain' })), 'rpg-card--motif-terrain');
assert.equal(cardMotifClass(carte({ kind: 'hero' })), '', 'aucun héros ne porte de classe de motif');
assert.equal(motifInfo(carte({ kind: 'terrain' })).motif, RPG_CARD_MOTIFS.terrain.motif,
  'le catalogue nomme le dessin du terrain');
assert.equal(motifInfo(carte({ kind: 'magie' })).label, 'Sorcellerie',
  'et il nomme la famille dont l’étincelle est gravée');
assert.equal(motifInfo(carte({ kind: 'magie', instant: true })).motif,
  RPG_CARD_MOTIFS.losange.motif, 'le losange se nomme comme celui de la Magie Rapide');

// ── 3. Les deux règles : seulement l’image, et le zellige au-dessus ─────────
const motifDe = (cle) => {
  const regle = battleCss.match(new RegExp(`\\.rpg-card--motif-${cle}:not\\(\\.rpg-card--mythique\\)\\s*\\{([^}]*)\\}`));
  assert.ok(regle, `la règle du motif ${cle} existe et laisse son zellige à la carte mythique`);
  const corps = regle[1];
  assert.doesNotMatch(corps, /border|background-color|--rpg-frame-color|--rpg-frame-gradient|--rpg-frame-fill/,
    `le motif ${cle} ne touche ni l’épaisseur, ni la couleur, ni la matière du cadre : il ne change que l’image`);
  const image = corps.match(/--rpg-frame-motif:\s*url\("([^"]+)"\)/);
  assert.ok(image, `le cadre des ${cle}s porte son motif`);
  assert.match(image[1], /^data:image\/svg\+xml,%3Csvg /, `le motif ${cle} est un SVG en ligne`);
  const dom = new JSDOM('<!doctype html><body></body>');
  const doc = new dom.window.DOMParser().parseFromString(
    decodeURIComponent(image[1].replace(/^data:image\/svg\+xml,/, '')), 'image/svg+xml');
  assert.equal(doc.querySelector('parsererror'), null, `le SVG du motif ${cle} est bien formé une fois décodé`);
  const traces = [...doc.querySelectorAll('path, circle')];
  assert.ok(traces.length >= 4, `le motif ${cle} est gravé : au moins quatre tracés — l’ombre et son reflet`);
  const encre = (noeud) => noeud.getAttribute('stroke') ?? noeud.getAttribute('fill');
  assert.ok(traces.some((noeud) => encre(noeud) === '#000') && traces.some((noeud) => encre(noeud) === '#fff'),
    `le motif ${cle} se lit sur toute couleur de cadre : une ombre et un reflet translucides, comme la résille`);
  assert.ok(traces.every((noeud) => {
    const opacite = noeud.getAttribute('stroke-opacity') ?? noeud.getAttribute('fill-opacity');
    return Number(opacite) > 0 && Number(opacite) < 1;
  }), `chaque tracé du motif ${cle} est translucide`);
  dom.window.close();
  return image[1];
};
const motifLosange = motifDe('losange');
const motifEtincelle = motifDe('etincelle');
const motifTerrain = motifDe('terrain');
assert.match(battleCss, /\.rpg-card--motif-losange:not\(\.rpg-card--mythique\)\s*\{[^}]*--rpg-frame-motif-size:\s*8px 8px;/s,
  'le losange se répète tous les 8 × 8 px le long de l’anneau');
assert.match(battleCss, /\.rpg-card--motif-etincelle:not\(\.rpg-card--mythique\)\s*\{[^}]*--rpg-frame-motif-size:\s*12px 12px;/s,
  'l’étincelle aussi');
assert.match(battleCss, /\.rpg-card--motif-terrain:not\(\.rpg-card--mythique\)\s*\{[^}]*--rpg-frame-motif-size:\s*8px 8px;/s,
  'les strates se répètent tous les 8 × 8 px le long de l’anneau');

// ── 3 bis. La gravure : le sigle pour la Sorcellerie, la taille pour le losange
const sigles = readFileSync(new URL('../src/games/rpgSortSignature.jsx', import.meta.url), 'utf8');
const chemins = [...sigles.matchAll(/<path d="([^"]+)" \/>/g)].map(([, chemin]) => chemin);
assert.equal(chemins.length, 2, 'le sigle des familles dessine deux formes : l’éclair et l’étincelle');
const [cheminEclair, cheminEtincelle] = chemins;
const dessin = (motif) => decodeURIComponent(motif.replace(/^data:image\/svg\+xml,/, ''));
assert.ok(dessin(motifEtincelle).includes(cheminEtincelle),
  'l’étincelle du cadre est celle du sigle de la Sorcellerie');
assert.ok(!dessin(motifEtincelle).includes(cheminEclair), 'et l’éclair reste au socle de la Magie Rapide');
const losange = 'M4 1.7 5.9 4 4 6.3 2.1 4Z';
assert.ok(dessin(motifLosange).includes(losange),
  'le losange des magies rapides est taillé : ses quatre arêtes sont dans l’anneau');
const taille = dessin(motifLosange);
assert.ok(taille.includes('M4 1.7 5.9 4 2.1 4Z') && taille.includes('M4 6.3 5.9 4 2.1 4Z'),
  'la table et le pavillon du losange se lisent : deux moitiés claires sous la même arête');

// ── 4. Six cadres, six images : aucune ne recopie une autre ─────────────────
const toutes = [...battleCss.matchAll(/--rpg-frame-motif:\s*url\("([^"]+)"\)/g)].map(([, image]) => image);
assert.equal(toutes.length, 6,
  'six motifs en tout : la résille commune, le zellige mythique, le guilloché des armes, le losange, l’étincelle et les strates');
assert.equal(new Set(toutes).size, toutes.length, 'aucun motif ne recopie l’image d’un autre cadre');
assert.ok(toutes.includes(motifLosange) && toutes.includes(motifEtincelle) && toutes.includes(motifTerrain),
  'les trois motifs de type sont bien dans la feuille');
assert.ok(toutes.some((image) => /width='18' height='12'/.test(decodeURIComponent(image))),
  'le guilloché des armes garde son onde de 18 × 12 px');
assert.match(battleCss, /\.rpg-battle\s*\{\s*--rpg-frame-motif:\s*url\("data:image\/svg\+xml,%3Csvg /,
  'la résille commune reste posée une seule fois, sur `.rpg-battle`');
assert.match(battleCss, /\.rpg-card--mythique\s*\{[^}]*--rpg-frame-motif:\s*url\("data:image\/svg\+xml,%3Csvg [^}]*--rpg-frame-motif-size:\s*12px 12px;/s,
  'le zellige des mythiques est intact — il passe avant le motif du type');

// ── 5. Le motif est posé sur toutes les faces d’une carte ───────────────────
for (const [source, nom] of [[duel, 'le duel'], [guide, 'le guide des cartes'], [atelier, 'l’atelier de deck']]) {
  assert.match(source, /import[\s\S]{0,400}cardMotifClass/, `${nom} importe la fabrique de classe`);
}
const surfaces = [
  [duel, 'la carte du dessus d’une pile', '${cardFrameClass(carteDuDessus)} ${cardMotifClass(carteDuDessus)}'],
  [duel, 'la carte posée sur la table', 'cardFrameClass(carte),\n        cardMotifClass(carte),'],
  [duel, 'la face de l’aperçu rapide', 'rpg-hover-card-preview__face ${cardFrameClass(carte)} ${cardMotifClass(carte)}'],
  [duel, 'la carte du mulligan', '`rpg-mulligan__card--elem-${carte.element}`,\n        cardFrameClass(carte),\n        cardMotifClass(carte),'],
  [duel, 'la vignette d’un sort joué', 'rpg-spell-played__art ${cardFrameClass(carte)} ${cardMotifClass(carte)}'],
  [duel, 'la vignette du catalogue', 'rpg-card-catalogue__art ${cardFrameClass(carte)} ${cardMotifClass(carte)}'],
  [duel, 'les piles de terrains', '${cardFrameClass(carte)} ${cardMotifClass(carte)}${groupe.available'],
  [duel, 'l’adieu d’une carte détruite', '${cardFrameClass(carteDetruite)} ${cardMotifClass(carteDetruite)}'],
  [duel, 'la carte en main', 'cardFrameClass(carte),\n                    cardMotifClass(carte),'],
  [duel, 'la carte emportée par le tourbillon de renvoi', 'cardFrameClass(cardById(effet.cardId))} ${cardMotifClass(cardById(effet.cardId))}'],
  [guide, 'la fiche du guide', 'rpg-card-guide__example--${carte.kind} ${cardFrameClass(carte)} ${cardMotifClass(carte)}'],
  [atelier, 'la vignette de l’atelier', 'rpg-atelier__carte-art ${cardFrameClass(carte)} ${cardMotifClass(carte)}'],
];
for (const [source, surface, attendu] of surfaces) {
  assert.ok(source.includes(attendu), `${surface} prend le motif de son type`);
}
assert.equal((duel.match(/cardMotifClass\(/g) ?? []).length, 12, 'les douze faces du duel portent le motif (dont la carte déchirée du sacrifice et celle emportée par l’eau ; la roue de feu ne redessine plus la carte, son adieu s’en charge)');
assert.equal((duel.match(/cardMotifClass\(carte\)/g) ?? []).length, 8, 'huit d’entre elles suivent la carte affichée');

console.log('✓ Le cadre des magies rapides taille un losange, celui des sorcelleries grave l’étincelle de son sigle, celui des terrains ses strates : six images distinctes, les mythiques gardent leur zellige, les armes leur guilloché, et rien ne change d’épaisseur ni de couleur.');
