import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations } from '../src/i18n/translations.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src', 'i18n', 'translations-fr-site.js');
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function withBaseFallback(dict, base) {
  if (!isPlainObject(dict)) return dict;
  const merged = {};
  const keys = new Set([...Object.keys(dict), ...(isPlainObject(base) ? Object.keys(base) : [])]);
  for (const key of keys) {
    const value = dict[key];
    const fallback = isPlainObject(base) ? base[key] : undefined;
    if (isPlainObject(value) && isPlainObject(fallback)) {
      merged[key] = withBaseFallback(value, fallback);
    } else if (value === undefined || value === null || value === '') {
      merged[key] = fallback === undefined ? value : fallback;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

const dictionary = withBaseFallback(translations.fr, translations.en);
const source = `// Généré par scripts/generate-french-site-dictionary.mjs — ne pas éditer à la main.\nexport const frenchSiteDictionary = ${JSON.stringify(dictionary, null, 2)};\n`;
fs.writeFileSync(output, source);
console.log(`Dictionnaire français autonome : ${Buffer.byteLength(source)} octets.`);
