import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { diapoSuivante } from '../src/games/rpgDiaporama.js';
import { RPG_OFFRE_DIAPO, RPG_PROMO_DEBUT, RPG_PROMO_SLIDES } from '../src/games/rpgPromoSlides.js';
import { RAYONS, carteFavoriseeRayon } from '../src/games/rpgBoosters.js';
import { cardById } from '../src/games/rpgCards.js';

const lire = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('le diaporama présente les sets et le comptoir vend leurs boosters au même tarif', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const souk = lire('../src/games/RpgSouk.jsx');
  const css = lire('../src/games/rpg-souk.css');
  assert.ok(existsSync(new URL('../public/sablier-promo/booster-vampires.webp', import.meta.url)));
  assert.equal(RPG_PROMO_SLIDES[0].fond, 'fond-vampires.webp');
  assert.equal(RPG_PROMO_SLIDES[0].paquet, 'paquet-vampires.webp');
  assert.match(page, /RPG_PROMO_SLIDES\.map\(\(slide, index\) =>/);
  assert.match(page, /diapoAffichee === RPG_OFFRE_DIAPO[^\n]*RpgOffreLancement/);
  assert.match(souk, /rayons\.map\(/);
  assert.match(css, /\.rpg-souk__rayon--set-pirates/);
  assert.match(souk, /Thème \{etat\.rayon\.nom\} favorisé ×10/);
});

test('les six slides ont un décor plein cadre et un sachet séparé aux bonnes dimensions', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const css = lire('../src/games/rpg-battle.css');
  assert.equal(RPG_PROMO_DEBUT, 3);
  assert.deepEqual(RPG_PROMO_SLIDES.map((slide) => slide.id),
    ['vampires', 'pirates', 'vikings', 'samourais', 'sable', 'egyptiens']);
  assert.equal(RPG_OFFRE_DIAPO, 9);
  assert.equal(RAYONS.length, RPG_PROMO_SLIDES.length + 1, 'un paquet ordinaire et les six boosters des slides');
  for (const [index, slide] of RPG_PROMO_SLIDES.entries()) {
    const rayon = RAYONS.find((entree) => entree.id === (slide.id === 'vampires' ? 'vampires' : `set-${slide.id}`));
    assert.ok(rayon, `${slide.id} est un paquet achetable`);
    assert.equal(rayon.prix, 140);
    assert.match(slide.description, /140 crédits/);
    for (const [fichier, dimensions] of [[slide.fond, [1264, 848]], [slide.paquet, [292, 566]]]) {
      const visuel = readFileSync(new URL(`../public/sablier-promo/${fichier}`, import.meta.url));
      assert.equal(visuel.toString('ascii', 0, 4), 'RIFF', fichier);
      assert.equal(visuel.toString('ascii', 8, 12), 'WEBP', fichier);
      assert.equal(visuel.toString('ascii', 12, 16), 'VP8 ', fichier);
      assert.deepEqual([visuel.readUInt16LE(26) & 0x3fff, visuel.readUInt16LE(28) & 0x3fff], dimensions, fichier);
      assert.ok(visuel.byteLength < 500_000, `visuel léger : ${fichier}`);
    }
    assert.ok(slide.description.includes(['Embuscade', 'Abordage', 'Furie', 'Harakiri', 'Butin', 'Tribut'][index]), slide.id);
    assert.ok(slide.titre.length === 2 && slide.capacite && slide.texte && slide.accent, `texte du slide ${slide.id}`);
  }
  assert.match(page, /sablier-promo\/\$\{slide\.fond\}/);
  assert.match(page, /sablier-promo\/\$\{slide\.paquet\}/);
  assert.match(page, /className="rpg-mode-menu__promo-texte"/);
  assert.match(page, /promoAffichee && <p className="sr-only">\{promoAffichee\.description\}<\/p>/);
  assert.match(page, /data-promo-visible=\{promoAffichee \? 'true' : undefined\}/);
  assert.match(page, /promoAffichee \|\| \(offreActive && diapoAffichee === RPG_OFFRE_DIAPO\) \? 9000 : 6000/);
  assert.match(css, /\.rpg-mode-menu__promo-fond \{[^}]*object-fit: cover;/s,
    'seul le décor est recadré pour remplir la vitrine');
  assert.match(css, /\.rpg-mode-menu__promo-paquet \{[^}]*object-fit: contain;/s,
    'le sachet entier tient dans sa colonne');
  assert.doesNotMatch(css, /\.rpg-mode-menu__promo-affiche \{ object-fit: contain; \}/,
    'plus de grande affiche au texte incrusté ni de bandes vides');
  assert.match(css, /\.rpg-mode-menu__hero\[data-promo-visible="true"\] \{ min-height: 270px/);
});

test('les cinq sets reprennent le vrai sachet scellé du booster Vampires', () => {
  const rendu = lire('../tools/render-rpg-set-banners.py');
  assert.match(rendu, /original = Image\.open\(OUTPUT \/ 'booster-vampires\.webp'\)/);
  assert.match(rendu, /original\.crop\(\(251, 146, 768, 1147\)\)/);
  assert.match(rendu, /Keep the photographed gold heat seals, crimped edges/);
  assert.doesNotMatch(rendu, /rounded_rectangle/);
});

test('les cinq nouveaux boosters montrent la même figure emblématique au Souk et sur leur sachet', () => {
  const rendu = lire('../tools/render-rpg-set-banners.py');
  const css = lire('../src/games/rpg-souk.css');
  const figures = {
    pirates: 'la-barbe-noire',
    vikings: 'jarl-au-marteau-de-guerre',
    samourais: 'onna-musha-des-cendres',
    sable: 'kusayla-roi-des-imazighen',
    egyptiens: 'seigneur-des-machoires',
  };
  for (const [set, artId] of Object.entries(figures)) {
    const rayonId = `set-${set}`;
    assert.equal(RAYONS.find((rayon) => rayon.id === rayonId)?.vitrine, artId, rayonId);
    assert.ok(carteFavoriseeRayon(rayonId, cardById(artId)), `${artId} appartient au thème du paquet`);
    assert.ok(existsSync(new URL(`../public/cards/${artId}.jpg`, import.meta.url)), artId);
    assert.match(rendu, new RegExp(`'${set}': \\{[^}]*'art': '${artId}'`), `${rayonId} reprend cette figure sur le sachet`);
  }
  assert.match(css, /data-souk-rayon\^="set-"\] \{ --paquet-art-scale: 1\.16; \}/,
    'les personnages restent visibles en entier sur les sachets du Souk');
  assert.match(css, /scale\(var\(--paquet-art-scale, 1\.58\)\)/,
    'Salem et Vampires gardent leur ancien cadrage');
  assert.match(rendu, /def render_responsive_assets\(\):/);
  assert.match(rendu, /OUTPUT \/ f'paquet-\{slug\}\.webp'/);
});

test('les flèches parcourent tous les sets avant l’offre, avec et sans elle', () => {
  const sansOffre = RPG_OFFRE_DIAPO;
  assert.equal(diapoSuivante(RPG_PROMO_DEBUT, 1, sansOffre), RPG_PROMO_DEBUT + 1);
  assert.equal(diapoSuivante(0, -1, sansOffre), RPG_OFFRE_DIAPO - 1);
  assert.equal(diapoSuivante(RPG_OFFRE_DIAPO - 1, 1, sansOffre), 0);
  assert.equal(diapoSuivante(RPG_OFFRE_DIAPO - 1, 1, sansOffre + 1), RPG_OFFRE_DIAPO);
  assert.equal(diapoSuivante(RPG_OFFRE_DIAPO, 1, sansOffre + 1), 0);
});
