import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({
  root,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, fs: { allow: [root] } },
});

try {
  const { default: MiragePowerIcon } = await server.ssrLoadModule('/src/games/MiragePowerIcon.jsx');
  const { POWER_UPS } = await server.ssrLoadModule('/src/games/mirageRules.js');
  const linkIcons = [
    { type: POWER_UPS.SHIELD, filename: 'link-bomb.svg', version: '', id: 'link-shield' },
    { type: POWER_UPS.LASSO, filename: 'link-boomerang.svg', version: '?v=2', id: 'link-lasso' },
    { type: POWER_UPS.PISTOL, filename: 'link-triforce.svg', version: '?v=2', id: 'link-pistol' },
  ];

  for (const { type, filename, version, id } of linkIcons) {
    const html = renderToStaticMarkup(React.createElement(MiragePowerIcon, { type, variant: 'link' }));
    const expectedHref = `${server.config.base}icons/mirage-rush/${filename}${version}`;
    assert.ok(html.includes(`data-power-icon="${id}"`), `${filename}: rendu comme icône de Link`);
    assert.ok(html.includes(`href="${expectedHref}"`), `${filename}: l’élément image charge ${expectedHref}`);
    assert.equal((html.match(/<image\b/g) || []).length, 1, `${filename}: le SVG externe est rendu une fois`);
    assert.doesNotMatch(
      html,
      /<(?:path|rect|circle|ellipse|polygon|defs)\b/,
      `${filename}: l’illustration générique ne recouvre pas l’icône personnalisée`,
    );
  }

  console.log('OK — MiragePowerIcon rend les SVG de Link, sans superposer les illustrations standard.');
} catch (error) {
  console.error('ÉCHEC — rendu des icônes SVG de Link :');
  console.error(error);
  process.exitCode = 1;
} finally {
  await server.close();
}
