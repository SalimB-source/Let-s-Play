/**
 * Quelles créatures portent l'**étoile d'invocation** au lieu de l'arc ?
 *
 * La portée « à distance » s'écrit avec deux icônes différentes sur l'ATQ :
 * l'arc et sa flèche quand la créature tire (archères, arquebuse, yumi,
 * navires, armes équipées), l'étoile d'invocation quand elle frappe de loin
 * par sa seule magie — Sahir des braises, les Djinns, l'Ifrit, Kagutsuchi,
 * les déesses et souveraines ailées, l'Ureus.
 *
 * La règle se lit sur la fiche : nature de la carte (typeLine) et mots-clés de
 * son texte. Une carte peut aussi l'imprimer explicitement avec `etoile: true`,
 * et les armes restent toujours des arcs.
 */
import { cardById } from './rpgCards.js';

const NATURES_DE_FEU = /\b(sahir|djinns?|ifrits?|kami|feu|flamme[s]?|braises?|serpent royal|d[ée]esse[ ]?solaire|souveraine ail[ée]e|greffier [àa] t[êe]te|oiseau de feu)\b/i;

export function carteLanceEtoile(carte) {
  if (!carte) return false;
  if (carte.etoile) return true;
  if (carte.kind && carte.kind !== 'creature' && carte.kind !== 'hero') return false;
  if (carte.kind === 'arme' || carte.porteeArme) return false;
  return NATURES_DE_FEU.test(`${carte.typeLine ?? ''} ${carte.text ?? ''}`);
}

/**
 * Même réponse, mais depuis une **créature en jeu** : le plateau ne manipule
 * que des entités (`{ carteId, distance, coupRapide, … }`), sans typeLine ni
 * texte. On lit donc la fiche d'origine dans le catalogue, en retombant sur
 * l'entité elle-même pour les jetons qui portent déjà leur nature.
 */
export function entiteLanceEtoile(entite) {
  if (!entite) return false;
  const carte = (entite.carteId && cardById(entite.carteId)) || entite.carte || entite;
  return carteLanceEtoile(carte) || carteLanceEtoile(entite);
}
