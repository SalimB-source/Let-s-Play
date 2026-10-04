/**
 * Analyse statique du moteur 3D de Mirage Rush (`src/games/MirageWorld.jsx`).
 *
 * Pourquoi : un simple identifiant oublié dans ce fichier ne se voit ni au
 * build ni dans les vérifications jsdom (elles remplacent le moteur 3D par une
 * doublure). C'est exactement ce qui est arrivé avec le commit « Fix Snake Way
 * stutter » : `syncSnakewayClouds` était appelé sans être déclaré, le `throw`
 * d'un module ES (mode strict) faisait échouer `makeWorld()`, et **plus aucune
 * partie ne démarrait**, sur tous les terrains — la page restait sur une piste
 * noire. Le même commit laissait `powerStwerUp(...)` dans le Turbo.
 *
 * L'analyse est volontairement simple : elle masque commentaires et littéraux
 * (shaders GLSL compris), puis relève :
 *
 *   - les **affectations** à un identifiant qui n'est déclaré nulle part
 *     (`syncSnakewayClouds = cloudSea.sync;` sans `let`) → `ReferenceError` ;
 *   - les **appels** à un identifiant qui n'est déclaré nulle part
 *     (`powerStwerUp(...)`) → `ReferenceError`.
 *
 * Les faux positifs connus (attributs JSX, méthodes en littéral d'objet,
 * globales du navigateur) sont neutralisés ci-dessous.
 */

/** Globales du navigateur / du langage : jamais déclarées dans le fichier. */
const GLOBALS = new Set([
  'Math', 'Object', 'Array', 'JSON', 'String', 'Number', 'Boolean', 'Date', 'Set', 'Map', 'WeakMap', 'WeakSet',
  'Promise', 'Proxy', 'Symbol', 'RegExp', 'Error', 'TypeError', 'RangeError', 'Infinity', 'NaN', 'undefined', 'null',
  'true', 'false', 'this', 'super', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'structuredClone', 'queueMicrotask',
  'encodeURIComponent', 'decodeURIComponent', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'window', 'document', 'console', 'navigator',
  'localStorage', 'sessionStorage', 'location', 'history', 'screen', 'devicePixelRatio', 'matchMedia', 'getComputedStyle',
  'fetch', 'btoa', 'atob', 'URL', 'Blob', 'Image', 'Audio', 'ImageData', 'Float32Array', 'Float64Array', 'Uint8Array',
  'Uint16Array', 'Uint32Array', 'Int8Array', 'Int16Array', 'Int32Array', 'ArrayBuffer', 'ResizeObserver',
  'MutationObserver', 'IntersectionObserver', 'Event', 'CustomEvent', 'KeyboardEvent', 'HTMLElement',
  'CanvasTexture', 'AudioContext', 'webkitAudioContext',
]);

/** Mots-clés : jamais des identifiants à déclarer. */
const KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'instanceof', 'function', 'new', 'await', 'do', 'else',
  'case', 'in', 'of', 'delete', 'void', 'yield', 'throw', 'class', 'extends', 'import', 'export', 'default', 'try',
  'finally', 'break', 'continue', 'const', 'let', 'var', 'async', 'static', 'get', 'set',
]);

/**
 * Noms d'attributs JSX : `className={...}` n'est pas une affectation (et il n'y
 * a pas de contexte JSX à deviner sans analyseur complet).
 */
const JSX_ATTRIBUTES = new Set([
  'className', 'ref', 'key', 'style', 'id', 'role', 'title', 'src', 'href', 'alt', 'value', 'width', 'height', 'type',
  'name', 'placeholder', 'disabled', 'autoFocus', 'onClick', 'onChange', 'onSubmit', 'onKeyDown', 'ariaLabel',
]);

/** Mots-clés après lesquels un `/` ouvre une expression régulière, pas une division. */
const REGEX_KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'case', 'do', 'else', 'yield', 'await', 'default']);

/**
 * Remplace commentaires, chaînes, gabarits (hors `${…}`) et expressions
 * régulières par des espaces **de même longueur** : les numéros de ligne et les
 * positions restent ceux du fichier d'origine.
 */
export function maskLiterals(code) {
  const out = [...code];
  const hide = (from, to) => {
    for (let k = from; k < to && k < out.length; k += 1) {
      if (out[k] !== '\n') out[k] = ' ';
    }
  };
  const n = code.length;
  let i = 0;
  let prev = '';
  let lastWord = '';
  while (i < n) {
    const c = code[i];
    const next = code[i + 1];
    if (c === '/' && next === '/') {
      let end = i;
      while (end < n && code[end] !== '\n') end += 1;
      hide(i, end);
      i = end;
      continue;
    }
    if (c === '/' && next === '*') {
      let end = i + 2;
      while (end < n && !(code[end] === '*' && code[end + 1] === '/')) end += 1;
      end = Math.min(n, end + 2);
      hide(i, end);
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      let end = i + 1;
      while (end < n && code[end] !== c) {
        if (code[end] === '\\') end += 1;
        end += 1;
      }
      end += 1;
      hide(i, end);
      i = end;
      prev = '"';
      continue;
    }
    if (c === '`') {
      i += 1;
      while (i < n) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === '`') { hide(i, i + 1); i += 1; break; }
        if (code[i] === '$' && code[i + 1] === '{') {
          // Interpolation : on garde le code, on masque les littéraux qu'il contient.
          let depth = 1;
          let end = i + 2;
          while (end < n && depth > 0) {
            if (code[end] === '{') depth += 1;
            else if (code[end] === '}') depth -= 1;
            if (depth > 0) end += 1;
          }
          const inner = maskLiterals(code.slice(i + 2, end));
          for (let k = 0; k < inner.length; k += 1) out[i + 2 + k] = inner[k];
          hide(i, i + 2);
          hide(end, end + 1);
          i = end + 1;
          continue;
        }
        hide(i, i + 1);
        i += 1;
      }
      prev = '`';
      continue;
    }
    if (c === '/' && !divisionContext(prev, lastWord)) {
      let end = i + 1;
      let inClass = false;
      while (end < n) {
        const d = code[end];
        if (d === '\\') { end += 2; continue; }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { end += 1; break; }
        else if (d === '\n') break;
        end += 1;
      }
      while (end < n && /[a-z]/i.test(code[end])) end += 1;
      hide(i, end);
      i = end;
      prev = '/';
      continue;
    }
    if (!/\s/.test(c)) {
      prev = c;
      if (/[A-Za-z0-9_$]/.test(c)) {
        let start = i;
        while (start > 0 && /[A-Za-z0-9_$]/.test(code[start - 1])) start -= 1;
        let stop = i;
        while (stop < n - 1 && /[A-Za-z0-9_$]/.test(code[stop + 1])) stop += 1;
        lastWord = code.slice(start, stop + 1);
      }
    }
    i += 1;
  }
  return out.join('');
}

/** Le `/` courant est-il une division ? (après un identifiant, `)`, `]`, `}`…) */
function divisionContext(prev, lastWord) {
  if (prev === ')' || prev === ']' || prev === '}' || prev === '"' || prev === "'" || prev === '`') return true;
  if (/[A-Za-z0-9_$]/.test(prev)) return !REGEX_KEYWORDS.has(lastWord);
  return false;
}

/** Tous les identifiants *déclarés* du fichier (liaisons, paramètres, import). */
function declaredNames(code) {
  const declared = new Set();
  for (const m of code.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  for (const m of code.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  for (const m of code.matchAll(/\bimport\s+([\s\S]*?)\s+from\s/g)) {
    for (const part of m[1].replace(/[{}]/g, ',').split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
    }
  }
  // Paramètres de fonction / fléchée, destructuration comprise.
  for (const m of code.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/=[\s\S]*$/, '').replace(/^\.\.\./, '').replace(/[:{][\s\S]*$/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
    }
  }
  for (const m of code.matchAll(/(?:^|[\s,(])([A-Za-z_$][\w$]*)\s*=>/g)) declared.add(m[1]);
  // `const { a, b: c } = …` et `const [a, b] = …`
  for (const m of code.matchAll(/\b(?:const|let|var)\s*(\{[^}]*\}|\[[^\]]*\])\s*=/g)) {
    for (const part of m[1].replace(/[{}[\]]/g, ',').split(',')) {
      const name = part.trim().split(':').pop().trim().replace(/^\.\.\./, '').replace(/=[\s\S]*$/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
    }
  }
  // Méthodes en littéral d'objet : `return { destroy() { … } }` — ce sont des définitions.
  for (const m of code.matchAll(/(?:^|[\s{,;])([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/g)) declared.add(m[1]);
  return declared;
}

const lineOf = (code, index) => code.slice(0, index).split('\n').length;
const snippetOf = (code, index) => code.slice(index, index + 90).split('\n')[0].trim();

/**
 * Relève les identifiants utilisés sans déclaration : affectations et appels.
 * Renvoie `{ undeclaredAssignments, undeclaredCalls }` (chaque entrée :
 * `{ name, line, snippet }`), tableaux vides quand le fichier est sain.
 */
export function scanEngineSource(code) {
  const masked = maskLiterals(code);
  const declared = declaredNames(masked);
  const known = (name) => declared.has(name) || GLOBALS.has(name) || KEYWORDS.has(name);
  const undeclaredAssignments = [];
  const undeclaredCalls = [];
  const seenAssignment = new Set();
  const seenCall = new Set();

  const assignment = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*(?:\+\+|--|\*\*=|<<=|>>=|>>>=|&&=|\|\|=|\?\?=|[+\-*/%&|^]=|=(?![=>]))/g;
  for (const m of masked.matchAll(assignment)) {
    const name = m[2];
    if (known(name) || JSX_ATTRIBUTES.has(name) || seenAssignment.has(name)) continue;
    seenAssignment.add(name);
    const index = m.index + m[1].length;
    undeclaredAssignments.push({ name, line: lineOf(masked, index), snippet: snippetOf(code, index) });
  }

  const call = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
  for (const m of masked.matchAll(call)) {
    const name = m[2];
    if (known(name) || seenCall.has(name)) continue;
    seenCall.add(name);
    const index = m.index + m[1].length;
    undeclaredCalls.push({ name, line: lineOf(masked, index), snippet: snippetOf(code, index) });
  }
  return { undeclaredAssignments, undeclaredCalls };
}

/** Message lisible pour une vérification (`node --test`) ou un script de check. */
export function describeFindings({ undeclaredAssignments, undeclaredCalls }) {
  const lines = [];
  for (const f of undeclaredAssignments) lines.push(`ligne ${f.line} : « ${f.name} » est affecté sans être déclaré — ${f.snippet}`);
  for (const f of undeclaredCalls) lines.push(`ligne ${f.line} : « ${f.name} » est appelé sans être déclaré — ${f.snippet}`);
  return lines;
}
