/**
 * Vérification des groupes et commentaires communautaires — npm run check:community.
 * Rendu DOM avec le stockage local : groupe de démonstration, création,
 * commentaire, puis persistance après remontage du composant.
 */
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'community-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/community-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { exerciseCommunity } = await import(path.join(outDir, 'community-smoke.js'));
await exerciseCommunity(assert);
console.log('\nCommunauté : exemple, création, commentaire et persistance OK.');
dom.window.close();
