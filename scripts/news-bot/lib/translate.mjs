// Traduction des articles à la publication — `scripts/news-bot/lib/translate.mjs`.
//
// Le site publie en FR / EN / AR, mais un article est rédigé UNE fois, en
// français (langue de référence). Ce module produit ses versions anglaise et
// arabe juste après la rédaction, et les écrit dans
// `src/news/localized/<langue>/` :
//
//   - `index.js`     — les métadonnées de liste (titre, chapô) de tous les
//                      articles, chargées avec les pages d'actualités ;
//   - `<slug>.js`    — le corps complet d'un article, chargé seulement quand un
//                      visiteur l'ouvre dans cette langue.
//
// Choix assumés :
//
//   - **le fournisseur est celui de la rédaction** (`lib/llm.mjs`) : pas de clé
//     en plus à configurer, et une seule variable pour tout couper ;
//   - **sans clé IA, on ne traduit pas** : le site affiche alors l'article en
//     français avec la mention « Version française ». On ne fabrique jamais un
//     faux texte ;
//   - **la traduction ne bloque jamais la publication** : un échec (réseau,
//     quota, réponse hors schéma) laisse l'article en ligne, en français, et le
//     prochain `npm run news:translate` le rattrape ;
//   - **les faits ne bougent pas** : noms de jeux, studios, dates et chiffres
//     sont recopiés tels quels, et le prompt l'exige explicitement.

import fs from 'node:fs';
import path from 'node:path';
import { callProvider, detectLlm } from './llm.mjs';
import { LOCALIZED_FIELDS } from '../../../src/news/localized/index.js';

export const TRANSLATE_LANGS = ['en', 'ar'];

const LANG_NAMES = {
  en: 'anglais (English)',
  ar: 'arabe standard moderne (العربية الفصحى)',
};

// Champs réellement traduits : les métadonnées non textuelles (dates, URLs,
// visuels) restent celles de l'article français — seuls les textes passent.
const TRANSLATABLE = LOCALIZED_FIELDS;

const STYLE = `Tu es traducteur éditorial pour « Let’s Play », média algérien de gaming, tech et pop culture.
Tu traduis un article français vers la langue demandée, sans le réécrire.

Règles absolues :
- Fidélité factuelle : aucun fait ajouté, retiré ou modifié. Noms de jeux, studios, personnes, plateformes, dates, prix et chiffres sont recopiés tels quels (les titres de jeux restent dans leur langue d’origine).
- Ton : journalisme gaming exigeant, factuel, jamais familier. Même longueur à quelques phrases près.
- Titres : « title » en MAJUSCULES (1 à 3 mots forts), « accent » est la chute et se termine TOUJOURS par un point. Ensemble, ils tiennent dans ~40 caractères pour l’anglais, ~44 pour l’arabe.
- Apostrophes typographiques (’), guillemets selon la langue, pas d’emoji, pas de markdown, texte brut.
- « p4 » garde sa question finale adressée aux lecteurs.
- « take » est le libellé de l’encadré de fin (« À RETENIR ») : rends-le dans la langue cible.
- « sourceDetail » et « credit » restent des phrases courtes et neutres.
- Si un champ est vide en français, laisse-le vide.

Réponds UNIQUEMENT par un objet JSON dont les clés sont exactement les mêmes que celles fournies.`;

function fieldsFor(story) {
  const out = {};
  for (const field of TRANSLATABLE) {
    const value = story[field];
    if (typeof value === 'string' && value.trim()) out[field] = value;
  }
  return out;
}

function buildPrompt(fields, lang) {
  return `Langue cible : ${LANG_NAMES[lang]}.

Voici les champs d’un article, en français. Traduis-les en ${LANG_NAMES[lang]} en respectant les règles, et renvoie le même objet JSON, mêmes clés, mêmes champs vides le cas échéant.

${JSON.stringify(fields, null, 2)}`;
}

function extractJson(text) {
  const cleaned = String(text).replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('réponse sans JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Les traductions ne doivent pas dépasser le budget de titrage : on refuse une
// réponse qui déborde plutôt que de couper un titre à l’affichage.
function validateTranslated(fields, source, lang) {
  const problems = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value !== 'string') { problems.push(`${key} : pas une chaîne`); continue; }
    if (!value.trim() && source[key]) problems.push(`${key} : vide alors que la source ne l’est pas`);
    if (/[<>]/.test(value) && !/<br\s*\/?>/i.test(value)) problems.push(`${key} : HTML non autorisé`);
  }
  const title = (fields.title || '').trim();
  const accent = (fields.accent || '').trim();
  if (!title || !accent) problems.push('title/accent manquant');
  const budget = lang === 'ar' ? 46 : 40;
  if (`${title} ${accent}`.length > budget + 8) problems.push(`titrage trop long (${`${title} ${accent}`.length} > ${budget})`);
  if (accent && !/[.!?]$/.test(accent)) problems.push('accent ne finit pas par un point');
  if (lang === 'en' && /[éèêàçœ’']{1,}/i.test(title) && /\b(LE|LA|LES|DES|DU)\b/.test(title)) {
    // garde-fou grossier : un titre resté en français
    problems.push('titre probablement resté en français');
  }
  return problems;
}

/** Traduit un article vers une langue. Résout avec les champs, ou `null`. */
export async function translateStory(story, lang, llm = detectLlm()) {
  if (!llm) return { fields: null, reason: 'pas de clé IA configurée' };
  const fields = fieldsFor(story);
  if (!fields.title || !fields.dek || !fields.lead) return { fields: null, reason: 'article source incomplet' };
  try {
    const raw = await callProvider(llm, buildPrompt(fields, lang), STYLE);
    const translated = extractJson(raw);
    // On ne garde QUE les clés fournies : un modèle bavard ne peut pas injecter
    // de champ (route, image, video…) dans l’article publié.
    const kept = {};
    for (const key of Object.keys(fields)) {
      if (typeof translated[key] === 'string') kept[key] = translated[key].trim().replace(/\s+/g, ' ');
    }
    const problems = validateTranslated(kept, fields, lang);
    if (problems.length) return { fields: null, reason: `réponse refusée (${problems.slice(0, 2).join('; ')})` };
    return { fields: kept, reason: null };
  } catch (error) {
    return { fields: null, reason: error.message };
  }
}

// ------------------------------------------------------------------ écriture

/** `/news/cinema/foo` → `cinema/foo` (chemin de fichier sous la langue). */
export function localizedSlug(storyOrKey) {
  const raw = typeof storyOrKey === 'string' ? storyOrKey : `/news/${storyOrKey.slug}`;
  return String(raw)
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/^news\//, '')
    .replace(/\.js$/, '')
    .replace(/\/+$/, '');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Écrit (ou met à jour) les traductions d'un article dans `src/news/localized/`.
 * `fieldsByLang` : `{ en: {…}, ar: {…} }` — les langues absentes sont ignorées.
 */
export function writeTranslations(root, story, fieldsByLang) {
  const slug = localizedSlug(story);
  const written = [];
  for (const [lang, fields] of Object.entries(fieldsByLang)) {
    if (!TRANSLATE_LANGS.includes(lang) || !fields) continue;
    const dir = path.join(root, 'src/news/localized', lang);
    ensureDir(dir);
    const file = path.join(dir, `${slug}.js`);
    ensureDir(path.dirname(file));
    const body = `// Traduction ${lang} de l’article /news/${slug} — générée par scripts/news-bot/\n// (ou \`npm run news:translate\`). Ne pas éditer à la main : relancer la commande.\nconst fields = ${JSON.stringify(fields, null, 2)};\nexport default fields;\n`;
    fs.writeFileSync(file, body);
    written.push(path.relative(root, file));
  }
  return written;
}

/**
 * Régénère `<lang>/index.js` — les métadonnées de liste — à partir des fichiers
 * de corps présents sur le disque. Source de vérité : le contenu des fichiers,
 * jamais un index tenu à la main.
 */
export function regenerateLocalizedIndex(root, lang) {
  const dir = path.join(root, 'src/news/localized', lang);
  const listings = {};
  if (fs.existsSync(dir)) {
    const walk = (current, prefix = '') => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        // `media/` porte les phrases des blocs vidéo (note, crédit, mention
        // d'absence), pas un article : aucun listing à en tirer.
        if (entry.isDirectory()) {
          if (prefix === '' && entry.name === 'media') continue;
          walk(full, `${prefix}${entry.name}/`);
          continue;
        }
        if (!entry.name.endsWith('.js') || entry.name === 'index.js') continue;
        const slug = `${prefix}${entry.name.replace(/\.js$/, '')}`;
        try {
          const source = fs.readFileSync(full, 'utf8');
          const match = source.match(/const fields = (\{[\s\S]*?\});\s*\nexport default/);
          if (!match) continue;
          const fields = JSON.parse(match[1]);
          // Un fichier de `media/` (protégé plus haut) ou d'un autre format ne
          // décrit pas un article : on ne crée pas de listing fantôme.
          if (typeof fields?.title !== 'string' || !fields.title.trim()) continue;
          const entryFields = {};
          for (const key of ['title', 'accent', 'dek', 'imageAlt', 'category', 'readTime']) {
            if (typeof fields[key] === 'string' && fields[key].trim()) entryFields[key] = fields[key];
          }
          listings[`/news/${slug}`] = entryFields;
        } catch (error) {
          console.warn(`  ⚠️ traduction illisible (${lang}/${slug}) : ${error.message}`);
        }
      }
    };
    walk(dir);
  }
  // Ordre stable : les diffs Git restent lisibles d’un run à l’autre.
  const sorted = Object.fromEntries(Object.entries(listings).sort(([a], [b]) => a.localeCompare(b)));
  const file = path.join(dir, 'index.js');
  ensureDir(dir);
  const body = `// Traductions ${lang} — métadonnées de liste (titre, chapô) de chaque article.\n// Fichier généré par scripts/news-bot (ou \`npm run news:translate\`) : ne pas\n// éditer à la main. Le corps complet de chaque article vit dans ./<slug>.js et\n// n’est chargé qu’à son ouverture.\nexport const listings = ${JSON.stringify(sorted, null, 2)};\nexport default listings;\n`;
  fs.writeFileSync(file, body);
  return Object.keys(sorted).length;
}

/** Compte les articles déjà traduits sur le disque, pour une langue. */
export function countLocalized(root, lang) {
  const dir = path.join(root, 'src/news/localized', lang);
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const walk = (current, depth = 0) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      // `media/` n'est pas un article (voir regenerateLocalizedIndex).
      if (entry.isDirectory()) {
        if (depth === 0 && entry.name === 'media') continue;
        walk(path.join(current, entry.name), depth + 1);
        continue;
      }
      if (entry.name.endsWith('.js') && entry.name !== 'index.js') count += 1;
    }
  };
  walk(dir);
  return count;
}

/** Vrai si l’article a déjà sa traduction dans cette langue. */
export function hasTranslation(root, story, lang) {
  const file = path.join(root, 'src/news/localized', lang, `${localizedSlug(story)}.js`);
  return fs.existsSync(file);
}
