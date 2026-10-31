import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-durabilite-smoke.jsx', outDir: 'node_modules/.cache/rpg-durabilite', emptyOutDir: true } });
const { rendre } = await import('../node_modules/.cache/rpg-durabilite/rpg-durabilite-smoke.js');
const documentDe = (html) => new JSDOM(html).window.document;
for (const id of ['chien-du-guet', 'danseuse-des-ombres-de-dune']) {
  const doc = documentDe(rendre(id));
  const compteur = doc.querySelector('[data-compteur="durabilite"]');
  assert.ok(compteur, `${id} porte un compteur de durabilité`);
  assert.ok(compteur.closest('.rpg-card__compteurs:not(.rpg-card__compteurs--hybride)'), 'le compteur se trouve sous la couleur');
  assert.equal(doc.querySelectorAll('[data-compteur="durabilite"]').length, 1);
  assert.match(doc.querySelector('.rpg-card').getAttribute('aria-label'), /1 compteur de durabilité/);
}
const seulementDuree = documentDe(rendre('danseuse-des-ombres-de-dune'));
assert.equal(seulementDuree.querySelector('.rpg-card-icones--sous-compteurs'), null, 'la colonne de droite ne descend pas pour une durabilité à gauche');
const sansDuree = documentDe(rendre('danseuse-des-ombres-de-dune', { arme: { durabilite: 0 } }));
assert.equal(sansDuree.querySelector('[data-compteur="durabilite"]'), null);
const doc = documentDe(rendre('danseuse-des-ombres-de-dune', { enCale: true, heures: true, arme: { compteurs: 2 } }));
const sousCouleurs = doc.querySelector('.rpg-card__compteurs--cale');
assert.ok(sousCouleurs.querySelector('[data-compteur="durabilite"]'));
assert.ok(sousCouleurs.querySelector('[data-compteur="cale"]'));
assert.ok(doc.querySelector('.rpg-card__compteurs--hybride [data-compteur="heures"]'));
assert.ok(doc.querySelector('.rpg-card__compteurs--hybride [data-compteur="sable"]'));
assert.equal(doc.querySelector('.rpg-card__compteurs--hybride [data-compteur="durabilite"]'), null);
const css = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
assert.match(css, /\.rpg-card__compteurs\.rpg-card__compteurs--cale\s*\{\s*top:\s*calc\(5% \+ 19cqw \* 2 \+ 1\.5cqw/);
console.log('Durabilité sous les couleurs : mono, hybride et compteurs combinés OK');
