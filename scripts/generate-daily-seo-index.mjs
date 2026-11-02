import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dailyDir = path.join(root, 'src', 'news', 'daily');
const output = path.join(dailyDir, 'seo-index.js');
const files = fs.readdirSync(dailyDir)
  .filter((file) => /^\d{4}-\d{2}-\d{2}(?:-[a-z-]+)?\.js$/.test(file))
  .sort();
const entries = {};

for (const file of files) {
  const module = await import(pathToFileURL(path.join(dailyDir, file)).href);
  Object.assign(entries, module.dailySeoEntries || {});
}

const source = `// Généré par scripts/generate-daily-seo-index.mjs — ne pas éditer à la main.\nexport const dailySeoEntries = ${JSON.stringify(entries, null, 2)};\n`;
fs.writeFileSync(output, source);
console.log(`Index SEO quotidien : ${Object.keys(entries).length} routes depuis ${files.length} édition(s).`);
