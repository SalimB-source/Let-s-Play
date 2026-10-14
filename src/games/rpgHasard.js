/**
 * Le hasard semé du Sablier — tirages reproductibles.
 *
 * Deux besoins, un seul module. Les **quêtes du jour** doivent être identiques
 * pour un même couple (jour, graine) : deux appareils d'un même compte tirent
 * les mêmes trois quêtes le même jour, et vider le stockage ne relance pas le
 * dé. Les **boosters**, eux, doivent pouvoir être vérifiés par les tests et par
 * les vérifications d'interface : comme partout dans le jeu (`nouvellePartie`,
 * `rpgAI`), le générateur est **injectable** (`rng = Math.random` par défaut).
 *
 * Aucune dépendance, aucun stockage, aucun DOM : du calcul pur.
 */

/**
 * Empreinte numérique stable d'un texte (FNV-1a, 32 bits). Deux textes égaux
 * donnent la même graine, sur toutes les machines et dans toutes les versions.
 */
export function graineNumerique(texte) {
  let empreinte = 0x811c9dc5;
  const chaine = String(texte ?? '');
  for (let index = 0; index < chaine.length; index += 1) {
    empreinte ^= chaine.charCodeAt(index);
    empreinte = Math.imul(empreinte, 0x01000193);
  }
  return empreinte >>> 0;
}

/**
 * Générateur semé (mulberry32) : rend une fonction `() => nombre dans [0, 1[`.
 * Même graine, même suite — c'est tout ce qu'on lui demande.
 */
export function rngSeme(graine) {
  let etat = (Number(graine) || 0) >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let tirage = etat;
    tirage = Math.imul(tirage ^ (tirage >>> 15), tirage | 1);
    tirage ^= tirage + Math.imul(tirage ^ (tirage >>> 7), tirage | 61);
    return ((tirage ^ (tirage >>> 14)) >>> 0) / 4294967296;
  };
}

/** Index tiré au hasard dans une liste (liste vide : `-1`). */
export function tirerIndex(liste, rng = Math.random) {
  const taille = Array.isArray(liste) ? liste.length : 0;
  if (!taille) return -1;
  return Math.min(taille - 1, Math.floor(rng() * taille));
}

/** Élément tiré au hasard dans une liste (liste vide : `null`). */
export function tirerParmi(liste, rng = Math.random) {
  const index = tirerIndex(liste, rng);
  return index < 0 ? null : liste[index];
}

/**
 * Tirage pondéré : `paires` est une liste de `[valeur, poids]`. Le défaut sert
 * quand la somme des poids est nulle (ou la liste vide) — jamais de `undefined`
 * silencieux. Les poids négatifs sont ignorés.
 */
export function choixPondere(paires, rng = Math.random, defaut = null) {
  const liste = (Array.isArray(paires) ? paires : []).filter(([, poids]) => Number(poids) > 0);
  const total = liste.reduce((somme, [, poids]) => somme + Number(poids), 0);
  if (!total) return defaut;
  let reste = rng() * total;
  for (const [valeur, poids] of liste) {
    reste -= Number(poids);
    if (reste < 0) return valeur;
  }
  return liste[liste.length - 1][0];
}

/** Copie mélangée d'une liste (l'originale n'est jamais touchée). */
export function melanger(liste, rng = Math.random) {
  const copie = [...(Array.isArray(liste) ? liste : [])];
  for (let index = copie.length - 1; index > 0; index -= 1) {
    const autre = Math.floor(rng() * (index + 1));
    [copie[index], copie[autre]] = [copie[autre], copie[index]];
  }
  return copie;
}
