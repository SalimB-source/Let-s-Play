import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-arc-stat-smoke.jsx', outDir: 'node_modules/.cache/rpg-arc-stat', emptyOutDir: true } });
const { rendusArcStat } = await import('../node_modules/.cache/rpg-arc-stat/rpg-arc-stat-smoke.js');
for (const [nom, html] of Object.entries(rendusArcStat())) {
  const document = new JSDOM(html).window.document;
  const attaque = document.querySelector('.rpg-card__stat--atk .rpg-stat-icon');
  const defense = document.querySelector('.rpg-card__pt .rpg-stat-icon');
  assert.equal(attaque?.getAttribute('data-stat-icon'), nom.endsWith('Epee') ? 'attack' : 'arc', nom);
  assert.equal(defense?.getAttribute('data-stat-icon'), 'defense', `${nom} : défense inchangée`);
}
console.log('Arc, épée et défense vérifiés sur table et aperçu.');
