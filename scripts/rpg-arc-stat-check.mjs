import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-arc-stat-smoke.jsx', outDir: 'node_modules/.cache/rpg-arc-stat', emptyOutDir: true } });
const { rendusArcStat } = await import('../node_modules/.cache/rpg-arc-stat/rpg-arc-stat-smoke.js');
for (const [nom, html] of Object.entries(rendusArcStat())) {
  const document = new JSDOM(html).window.document;
  const attaque = document.querySelector('.rpg-card__stat--atk .rpg-stat-icon');
  const defense = document.querySelector('.rpg-card__pt .rpg-stat-icon');
  assert.equal(attaque?.getAttribute('data-stat-icon'), nom.endsWith('Epee') ? 'attack' : 'arc', nom);
  assert.equal(defense?.getAttribute('data-stat-icon'), 'defense', `${nom} : défense inchangée`);
  if (attaque?.getAttribute('data-stat-icon') === 'arc') {
    const coordonnees = (selecteur) => attaque.querySelector(selecteur).getAttribute('d').match(/[\d.]+/g).map(Number);
    const [x1, y1, x2, y2] = coordonnees('[data-arc-corde]');
    const [ax1, ay1, ax2, ay2] = coordonnees('[data-arc-fleche]');
    const milieuX = (x1 + x2) / 2;
    const milieuY = (y1 + y2) / 2;
    const distance = Math.abs((ax2 - ax1) * (milieuY - ay1) - (ay2 - ay1) * (milieuX - ax1)) / Math.hypot(ax2 - ax1, ay2 - ay1);
    assert.ok(distance < 0.15, `${nom} : la flèche traverse le milieu de la corde`);
  }
}
const styles = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');
assert.match(styles, /\.rpg-stat-icon\[data-stat-icon="arc"\]\s*\{\s*color:\s*#ff4545;/, 'la couleur rouge est limitée à l’arc');
console.log('Arc rouge, épée et défense vérifiés sur table et aperçu.');
