/**
 * Les navigateurs anciens — `src/lib/navigateursAnciens.js`
 * =========================================================
 * Le site tourne dans trois moteurs qui n'évoluent pas ensemble : Chrome sur
 * ordinateur (toujours à jour, mis à jour par son propre APK), les navigateurs
 * de téléphone, et la **WebView Android** — qui a sa propre application de mise
 * à jour, souvent en retard de plusieurs années, et parfois gelée par le
 * fabricant du téléphone (`Android System WebView`).
 *
 * C'est cette dernière qui a fait un écran noir : Chrome affichait le site,
 * l'APK non, sur le même téléphone et le même réseau.
 *
 * `build.target` (voir `vite.config.js`) abaisse la **syntaxe** ; il ne touche
 * pas aux **API**. Celles-ci manquent donc à l'appel sur un moteur d'avant
 * 2021, et un `TypeError` en pleine partie suffit à vider l'écran :
 *
 *   - `Object.hasOwn` (Chrome 93, Safari 15.4) — lu au rendu des cartes ;
 *   - `Array.prototype.at` / `String.prototype.at` (Chrome 92) — piles, pioches ;
 *   - `structuredClone` (Chrome 98) — état du duel PvP ;
 *   - `crypto.randomUUID` (Chrome 92) — commentaires, communauté, appels.
 *
 * On les comble ici, une fois, au tout début de `src/main.jsx` : chaque
 * remplacement n'est posé que si l'API manque, et **rien ne lève** — un
 * navigateur moderne garde ses implémentations natives.
 *
 * Ces comblages sont volontairement simples : ils couvrent les usages réels du
 * site (tableaux, chaînes, objets de données du jeu), pas la spécification
 * entière.
 */

/** Vrai si l'on peut écrire sur `cible[nom]` (certains sont en lecture seule). */
function poser(cible, nom, valeur) {
  try {
    Object.defineProperty(cible, nom, {
      value: valeur,
      writable: true,
      configurable: true,
      enumerable: false,
    });
    return true;
  } catch {
    return false;
  }
}

function comblerAt(prototype) {
  if (!prototype || typeof prototype.at === 'function') return false;
  return poser(prototype, 'at', function at(index) {
    const longueur = this.length >>> 0;
    let position = Number(index) || 0;
    if (!Number.isFinite(position)) position = 0;
    position = Math.trunc(position);
    if (position < 0) position += longueur;
    if (position < 0 || position >= longueur) return undefined;
    return this[position];
  });
}

/**
 * Copie profonde de secours — `structuredClone` pour les données du jeu.
 *
 * On gère ce que le site clone vraiment : objets simples, tableaux, dates,
 * `Map`, `Set`. Les références circulaires sont suivies (`vus`), sans quoi une
 * carte qui se référence elle-même ferait une récursion infinie là où le
 * moteur moderne s'en sort.
 */
function copieProfonde(valeur, vus = new Map()) {
  if (valeur === null || typeof valeur !== 'object') return valeur;
  if (vus.has(valeur)) return vus.get(valeur);
  if (valeur instanceof Date) return new Date(valeur.getTime());
  if (valeur instanceof RegExp) return new RegExp(valeur.source, valeur.flags);
  if (typeof Map !== 'undefined' && valeur instanceof Map) {
    const copie = new Map();
    vus.set(valeur, copie);
    valeur.forEach((v, cle) => copie.set(copieProfonde(cle, vus), copieProfonde(v, vus)));
    return copie;
  }
  if (typeof Set !== 'undefined' && valeur instanceof Set) {
    const copie = new Set();
    vus.set(valeur, copie);
    valeur.forEach((v) => copie.add(copieProfonde(v, vus)));
    return copie;
  }
  const copie = Array.isArray(valeur) ? [] : {};
  vus.set(valeur, copie);
  for (const cle of Object.keys(valeur)) copie[cle] = copieProfonde(valeur[cle], vus);
  return copie;
}

/** Identifiant v4 à partir d'un générateur aléatoire digne de confiance. */
function uuidV4(cryptoObj) {
  const octets = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(octets);
  } else {
    for (let i = 0; i < 16; i += 1) octets[i] = Math.floor(Math.random() * 256);
  }
  octets[6] = (octets[6] & 0x0f) | 0x40; // version 4
  octets[8] = (octets[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = [];
  for (let i = 0; i < 256; i += 1) hex.push((i + 0x100).toString(16).slice(1));
  return `${hex[octets[0]]}${hex[octets[1]]}${hex[octets[2]]}${hex[octets[3]]}`
    + `-${hex[octets[4]]}${hex[octets[5]]}`
    + `-${hex[octets[6]]}${hex[octets[7]]}`
    + `-${hex[octets[8]]}${hex[octets[9]]}`
    + `-${hex[octets[10]]}${hex[octets[11]]}${hex[octets[12]]}${hex[octets[13]]}`
    + `${hex[octets[14]]}${hex[octets[15]]}`;
}

/**
 * Pose les comblages manquants sur `cible` (l'objet global par défaut).
 * Renvoie la liste des noms effectivement posés — les tests s'en servent, et
 * le panneau de secours peut l'afficher.
 */
export function comblerNavigateurAncien(cible = globalThis) {
  if (!cible) return [];
  const poses = [];

  if (typeof cible.Object === 'function' && typeof cible.Object.hasOwn !== 'function') {
    const ok = poser(cible.Object, 'hasOwn', function hasOwn(objet, cle) {
      if (objet === null || objet === undefined) return false;
      return Object.prototype.hasOwnProperty.call(Object(objet), cle);
    });
    if (ok) poses.push('Object.hasOwn');
  }

  if (typeof cible.Array === 'function' && comblerAt(cible.Array.prototype)) {
    poses.push('Array.prototype.at');
  }
  if (typeof cible.String === 'function' && comblerAt(cible.String.prototype)) {
    poses.push('String.prototype.at');
  }

  if (typeof cible.structuredClone !== 'function') {
    if (poser(cible, 'structuredClone', (valeur) => copieProfonde(valeur))) {
      poses.push('structuredClone');
    }
  }

  // `crypto.randomUUID` n'existe que dans un contexte sécurisé (https) : la
  // coque Android et le site le sont, mais un `file://` de test ne l'est pas.
  const cryptoObj = cible.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID !== 'function') {
    if (poser(cryptoObj, 'randomUUID', () => uuidV4(cryptoObj))) poses.push('crypto.randomUUID');
  }

  return poses;
}

// Au chargement du module — importé en PREMIER par `src/main.jsx`, donc avant
// tout module qui se sert de ces API.
comblerNavigateurAncien();
