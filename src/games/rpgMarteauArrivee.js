/**
 * L'arrivée du Maître du marteau : le ciel entier répond à son marteau.
 *
 * Cette couche est volontairement indépendante de l'Éclair du marteau (le
 * sort) : ici, l'orage occupe toute la table pendant que la créature arrive.
 * Le slam et l'impact mythique communs restent joués par `playMythicImpact`.
 * Tout est décoratif, mesuré une fois dans le repère de la table et détruit à
 * la fin ; aucun geste n'est intercepté et aucune règle du duel ne change.
 */

import { MAITRE_DU_MARTEAU_ID } from './rpgFoudreAudio.js';

export { MAITRE_DU_MARTEAU_ID };

export const RPG_MARTEAU_ARRIVEE_DUREE = 1950;

const SVG_NS = 'http://www.w3.org/2000/svg';
const IMPACT_RETARD = 348; // l'impact du slam mythique commun (580 ms × 60 %)
const ECLAIR_PRINCIPAL_RETARD = 240; // le trait se dessine jusqu'à cet impact
const NOMBRE_ETINCELLES = 18;

/** Seule cette carte déclenche l'orage — pas les autres mythiques de Neige. */
export function estArriveeMaitreDuMarteau(entity) {
  return entity?.carteId === MAITRE_DU_MARTEAU_ID;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const nombre = (value) => Number(value.toFixed(2));

/** Bruit déterministe : la cinématique ne change pas entre deux rendus. */
function bruit(index, graine) {
  const value = Math.sin((index + 1) * 12.9898 + graine * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Un zigzag franc entre deux points, avec ses coordonnées intermédiaires pour
 * faire naître les fourches depuis le trait lui-même (jamais à côté de lui).
 */
function creerFoudre(depart, arrivee, graine = 1, segments = 13) {
  const dx = arrivee.x - depart.x;
  const dy = arrivee.y - depart.y;
  const longueur = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / longueur;
  const ny = dx / longueur;
  const amplitude = Math.min(46, longueur * 0.047);
  const points = [depart];
  for (let index = 1; index < segments; index += 1) {
    const t = index / segments;
    const enveloppe = Math.sin(Math.PI * t) * 0.75 + 0.25;
    const ecart = (bruit(index, graine) * 2 - 1) * amplitude * enveloppe;
    // Un petit décalage longitudinal casse la régularité du zigzag sans
    // risquer de faire remonter le trait principal vers le ciel.
    const avance = (bruit(index + 31, graine) - 0.5) * (longueur / segments) * 0.22;
    points.push({
      x: depart.x + dx * t + nx * ecart + (dx / longueur) * avance,
      y: depart.y + dy * t + ny * ecart + (dy / longueur) * avance,
    });
  }
  points.push(arrivee);
  const d = points.map((point, index) => `${index ? 'L' : 'M'}${nombre(point.x)} ${nombre(point.y)}`).join('');
  return { d, points, depart, arrivee, longueur };
}

/** Trois fourches latérales, orientées dans le sens général de la décharge. */
function creerFourches(foudre, graine = 1) {
  const dx = foudre.arrivee.x - foudre.depart.x;
  const dy = foudre.arrivee.y - foudre.depart.y;
  const longueur = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / longueur;
  const uy = dy / longueur;
  const nx = -uy;
  const ny = ux;
  return [3, 6, 9].filter((index) => index < foudre.points.length - 1).map((index, ordre) => {
    const depart = foudre.points[index];
    const cote = ordre % 2 ? 1 : -1;
    const portee = foudre.longueur * (0.13 + bruit(index + 8, graine) * 0.08);
    const arrivee = {
      x: depart.x + (ux * 0.48 + nx * cote * 0.88) * portee,
      y: depart.y + (uy * 0.48 + ny * cote * 0.88) * portee,
    };
    return creerFoudre(depart, arrivee, graine + index + 17, 5).d;
  });
}

function element(documentRef, tag, className) {
  const node = documentRef.createElement(tag);
  node.className = className;
  return node;
}

function svgElement(documentRef, tag, className, d = null) {
  const node = documentRef.createElementNS(SVG_NS, tag);
  if (className) node.setAttribute('class', className);
  if (d) node.setAttribute('d', d);
  return node;
}

/**
 * Chaque éclair est peint en trois couches : large halo violet, lueur bleue,
 * puis cœur blanc. `pathLength=1` permet de dessiner n'importe quel tracé à
 * la même vitesse, quelle que soit la taille de l'écran.
 */
function ajouterTrait(documentRef, groupe, d, retard, fourche = false) {
  for (const couche of ['halo', 'ame', 'coeur']) {
    const path = svgElement(
      documentRef,
      'path',
      `rpg-marteau-arrivee__trait rpg-marteau-arrivee__trait--${couche}${fourche ? ' rpg-marteau-arrivee__trait--fourche' : ''}`,
      d,
    );
    path.setAttribute('pathLength', '1');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.style.setProperty('--retard-trait', `${retard}ms`);
    groupe.append(path);
  }
}

function ajouterEclair(documentRef, ciel, { nom, foudre, graine, retard, duree, force }) {
  const groupe = svgElement(
    documentRef,
    'g',
    `rpg-marteau-arrivee__eclair rpg-marteau-arrivee__eclair--${nom}`,
  );
  groupe.dataset.bolt = nom;
  groupe.style.setProperty('--retard', `${retard}ms`);
  groupe.style.setProperty('--duree', `${duree}ms`);
  groupe.style.setProperty('--force', String(force));
  ajouterTrait(documentRef, groupe, foudre.d, retard);
  creerFourches(foudre, graine).forEach((d, index) => {
    ajouterTrait(documentRef, groupe, d, retard + 55 + index * 24, true);
  });
  ciel.append(groupe);
}

/**
 * Joue l'orage au-dessus de la carte qui arrive.
 *
 * @param {HTMLElement} table table de duel, repère de toutes les coordonnées
 * @param {HTMLElement} card carte du Maître qui vient d'entrer en jeu
 * @param {boolean} reduced en mouvement réduit, aucun flash n'est même créé ;
 *   l'éclat non animé du slam mythique commun reste l'unique retour visuel
 * @returns {() => void} annulation idempotente (sortie de duel ou de carte)
 */
export function playMarteauArrivee(table, card, reduced = false) {
  if (reduced) return () => {};
  const documentRef = table.ownerDocument;
  const rect = card.getBoundingClientRect();
  const bounds = table.getBoundingClientRect();
  const width = Math.max(1, table.offsetWidth || bounds.width || 1);
  const height = Math.max(1, table.offsetHeight || bounds.height || 1);
  const sx = width / (bounds.width || width);
  const sy = height / (bounds.height || height);
  const x = (rect.left + rect.width / 2 - bounds.left) * sx;
  const y = (rect.top + rect.height / 2 - bounds.top) * sy;

  const root = element(documentRef, 'div', 'rpg-marteau-arrivee');
  root.dataset.rpgArriveeFx = MAITRE_DU_MARTEAU_ID;
  root.setAttribute('aria-hidden', 'true');
  root.style.setProperty('--marteau-x', `${nombre(x)}px`);
  root.style.setProperty('--marteau-y', `${nombre(y)}px`);

  root.append(
    element(documentRef, 'div', 'rpg-marteau-arrivee__nuit'),
    element(documentRef, 'div', 'rpg-marteau-arrivee__nuages rpg-marteau-arrivee__nuages--loin'),
    element(documentRef, 'div', 'rpg-marteau-arrivee__nuages rpg-marteau-arrivee__nuages--pres'),
    element(documentRef, 'div', 'rpg-marteau-arrivee__pluie rpg-marteau-arrivee__pluie--loin'),
    element(documentRef, 'div', 'rpg-marteau-arrivee__pluie rpg-marteau-arrivee__pluie--pres'),
    element(documentRef, 'div', 'rpg-marteau-arrivee__flash'),
  );

  const ciel = svgElement(documentRef, 'svg', 'rpg-marteau-arrivee__ciel');
  ciel.setAttribute('viewBox', `0 0 ${nombre(width)} ${nombre(height)}`);
  ciel.setAttribute('preserveAspectRatio', 'none');
  ciel.setAttribute('aria-hidden', 'true');
  ciel.setAttribute('focusable', 'false');

  // Deux décharges parcourent toute l'arène comme sur la référence ; une
  // fourche court dans les nuages et la frappe principale rejoint la carte.
  const eclairs = [
    {
      nom: 'nuages',
      foudre: creerFoudre({ x: -width * 0.03, y: height * 0.11 }, { x: width * 0.46, y: height * 0.015 }, 7, 11),
      graine: 7,
      retard: 45,
      duree: 720,
      force: 0.58,
    },
    {
      nom: 'gauche',
      foudre: creerFoudre({ x: width * 0.1, y: -height * 0.04 }, { x: width * 0.34, y: height * 0.76 }, 19, 14),
      graine: 19,
      retard: 120,
      duree: 920,
      force: 0.66,
    },
    {
      nom: 'principal',
      foudre: creerFoudre(
        { x: clamp(x + width * 0.1, width * 0.08, width * 0.92), y: -height * 0.08 },
        { x, y },
        31,
        13,
      ),
      graine: 31,
      retard: ECLAIR_PRINCIPAL_RETARD,
      duree: 800,
      force: 1,
    },
    {
      nom: 'droite',
      foudre: creerFoudre({ x: width * 0.83, y: -height * 0.06 }, { x: width * 0.61, y: height * 0.88 }, 43, 15),
      graine: 43,
      retard: 430,
      duree: 850,
      force: 0.82,
    },
  ];
  eclairs.forEach((eclair) => ajouterEclair(documentRef, ciel, eclair));
  root.append(ciel);

  // Le point d'impact électrique complète — sans les remplacer — les anneaux
  // et les fissures de l'impact mythique commun, synchronisé au même instant.
  const impact = element(documentRef, 'div', 'rpg-marteau-arrivee__impact');
  impact.append(
    element(documentRef, 'i', 'rpg-marteau-arrivee__impact-flash'),
    element(documentRef, 'i', 'rpg-marteau-arrivee__impact-onde'),
    element(documentRef, 'i', 'rpg-marteau-arrivee__impact-onde rpg-marteau-arrivee__impact-onde--echo'),
  );
  for (let index = 0; index < NOMBRE_ETINCELLES; index += 1) {
    const etincelle = element(documentRef, 'i', 'rpg-marteau-arrivee__etincelle');
    const angle = index * 2.39996;
    const portee = 54 + (index % 6) * 17;
    etincelle.style.setProperty('--dx', `${nombre(Math.cos(angle) * portee)}px`);
    etincelle.style.setProperty('--dy', `${nombre(Math.sin(angle) * portee * 0.72 - 22)}px`);
    etincelle.style.setProperty('--rotation', `${nombre(angle * 180 / Math.PI + 90)}deg`);
    etincelle.style.setProperty('--retard-etincelle', `${IMPACT_RETARD + (index % 4) * 18}ms`);
    impact.append(etincelle);
  }
  root.append(impact);
  table.append(root);

  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    root.remove();
  };
  const timer = setTimeout(cleanup, RPG_MARTEAU_ARRIVEE_DUREE);
  return cleanup;
}
