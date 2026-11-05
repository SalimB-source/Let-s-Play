import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { diapoSuivante } from '../src/games/rpgDiaporama.js';
import { RPG_OFFRE_DIAPO, RPG_PROMO_DEBUT, RPG_PROMO_SLIDES } from '../src/games/rpgPromoSlides.js';

const lire = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('le diaporama et le comptoir gardent le booster Vampires, sans créer de faux rayons', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const souk = lire('../src/games/RpgSouk.jsx');
  const css = lire('../src/games/rpg-souk.css');
  assert.ok(existsSync(new URL('../public/sablier-promo/booster-vampires.webp', import.meta.url)));
  assert.equal(RPG_PROMO_SLIDES[0].affiche, 'booster-vampires-banniere.webp');
  assert.match(page, /RPG_PROMO_SLIDES\.map\(\(slide, index\) =>/);
  assert.match(page, /diapoAffichee === RPG_OFFRE_DIAPO[^\n]*RpgOffreLancement/);
  assert.match(souk, /rayons\.map\(/);
  assert.match(css, /data-souk-rayons-nombre="2"/);
});

test('les six affiches plein cadre portent chacune une description accessible de leur capacité', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const css = lire('../src/games/rpg-battle.css');
  assert.equal(RPG_PROMO_DEBUT, 3);
  assert.deepEqual(RPG_PROMO_SLIDES.map((slide) => slide.id),
    ['vampires', 'pirates', 'vikings', 'samourais', 'sable', 'egyptiens']);
  assert.equal(RPG_OFFRE_DIAPO, 9);
  for (const [index, slide] of RPG_PROMO_SLIDES.entries()) {
    const affiche = readFileSync(new URL(`../public/sablier-promo/${slide.affiche}`, import.meta.url));
    assert.equal(affiche.toString('ascii', 0, 4), 'RIFF', slide.id);
    assert.equal(affiche.toString('ascii', 8, 12), 'WEBP', slide.id);
    assert.ok(affiche.byteLength < 500_000, `affiche légère : ${slide.id}`);
    assert.ok(slide.description.includes(['Embuscade', 'Abordage', 'Furie', 'Harakiri', 'Butin', 'Tribut'][index]), slide.id);
  }
  assert.match(page, /sablier-promo\/\$\{slide\.affiche\}/);
  assert.match(page, /promoAffichee && <p className="sr-only">\{promoAffichee\.description\}<\/p>/);
  assert.match(page, /data-promo-visible=\{promoAffichee \? 'true' : undefined\}/);
  assert.match(page, /promoAffichee \? 9000 : 6000/);
  assert.match(css, /\.rpg-mode-menu__promo-affiche \{[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: cover;/s);
  assert.match(css, /\.rpg-mode-menu__hero\[data-promo-visible="true"\] \{ min-height: 270px/);
  assert.doesNotMatch(page, /rpg-mode-menu__vampires-texte|rpg-mode-menu__vampires-booster/);
});

test('les cinq sets reprennent le vrai sachet scellé du booster Vampires', () => {
  const rendu = lire('../tools/render-rpg-set-banners.py');
  assert.match(rendu, /original = Image\.open\(OUTPUT \/ 'booster-vampires\.webp'\)/);
  assert.match(rendu, /original\.crop\(\(251, 146, 768, 1147\)\)/);
  assert.match(rendu, /Keep the photographed gold heat seals, crimped edges/);
  assert.doesNotMatch(rendu, /rounded_rectangle/);
});

test('les flèches parcourent tous les sets avant l’offre, avec et sans elle', () => {
  const sansOffre = RPG_OFFRE_DIAPO;
  assert.equal(diapoSuivante(RPG_PROMO_DEBUT, 1, sansOffre), RPG_PROMO_DEBUT + 1);
  assert.equal(diapoSuivante(0, -1, sansOffre), RPG_OFFRE_DIAPO - 1);
  assert.equal(diapoSuivante(RPG_OFFRE_DIAPO - 1, 1, sansOffre), 0);
  assert.equal(diapoSuivante(RPG_OFFRE_DIAPO - 1, 1, sansOffre + 1), RPG_OFFRE_DIAPO);
  assert.equal(diapoSuivante(RPG_OFFRE_DIAPO, 1, sansOffre + 1), 0);
});
