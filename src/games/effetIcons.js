/**
 * Le sprite des icônes d’effets du duel — les symboles validés
 * (`preview-effets-icone.html`), monochromes, dessin 24×24. Les silhouettes
 * pleines utilisent explicitement `fill="currentColor"` et `stroke="none"`.
 *
 * Deux usages :
 * 1. Injecter `EFFETS_SPRITE` une fois dans le DOM (idéalement dans le `<body>`
 *    de la page du duel) — les `<use href="#i-…">` le référencent ensuite sans
 *    coût ;
 * 2. Demander une icône avec `effetIcon()` — un `<svg>` déjà câblé.
 *
 * Grammaire visuelle (voir le HTML de preview) : les **pastilles** (mots-clés
 * passifs sous la ligne de type) montrent l’icône seule ; les effets de texte
 * sont **interlinéaires** — l’icône précède la règle qu’elle annonce.
 */

import { libelleModificationStats, modificationStats } from './rpgCards.js';
import { estLigneDeLien } from './rpgLienTexte.js';

/** Les symboles, à injecter une seule fois par page. */
export const EFFETS_SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-embuscade" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 11 12 1l10 10v11h-7v-8H9v8H2Z"/></symbol>
  <symbol id="i-butin" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M6 2h12l-3 5H9ZM8 9h8c2 3 6 5 6 9 0 4-4 5-10 5S2 22 2 18c0-4 4-6 6-9Zm4 3-3 4 3 4 3-4Z"/></symbol>
  <symbol id="i-furie" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M5 12V7a2 2 0 0 1 4 0V5a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v6l-4 7H8l-5-7V11a2 2 0 0 1 2 1Z"/></symbol>
  <symbol id="i-esquive" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M16 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 8l5 2 4-1 1 3-6 2-2 4 5 3-2 3-8-5 2-6-4 2-1-3ZM1 7h8v3H1ZM2 17h5v3H2Z"/></symbol>
  <symbol id="i-contre-attaque" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 2l8 3-3 3 15 12-2 2L8 7 5 10ZM22 2l-3 8-3-3-4 4-3-3 4-4-3-3Z"/></symbol>
  <symbol id="i-envol" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 13 8 6 1 3l2 8 7 8h4l7-8 2-8-7 3Z"/></symbol>
  <symbol id="i-rapidite" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 2 3 14h7l-1 8 12-13h-9l3-7Z"/></symbol>
  <symbol id="i-coup-rapide" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M1 6h9v3H1ZM3 12h5v3H3ZM16 2 9 13h6l-2 9 10-13h-7Z"/></symbol>
  <symbol id="i-traque" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M10 1h4v8h-4ZM3 13l7 4-2 4-7-4ZM21 13l2 4-7 4-2-4ZM12 10a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></symbol>
  <symbol id="i-coup-critique" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 1 15 9 23 12 15 15 12 23 9 15 1 12 9 9Z"/></symbol>
  <symbol id="i-defenseur" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 4 12 1l10 3v8c0 5-6 9-10 11C8 21 2 17 2 12Zm8 2v6H6v4h12v-4h-4V6Z"/></symbol>
  <symbol id="i-provocation" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 9h5L21 2v20L7 15H2ZM8 17h5v6H8Z"/></symbol>
  <symbol id="i-tenacite" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M6 3 13 1 10 8l5 4-3 5 5 6H4L1 14ZM16 2l5 5 2 12-4 4-3-6 3-6-5-4Z"/></symbol>
  <symbol id="i-vol-de-vie" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 6C3-4-4 9 12 23 28 9 21-4 12 6Zm0 2c-6 7-4 10 0 10s6-3 0-10Z"/></symbol>
  <symbol id="i-infiltration" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M1 12C7 2 17 2 23 12c-6 10-16 10-22 0Zm11-5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM1 1l22 20-2 2L0 3Z"/></symbol>
  <symbol id="i-protection" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M3 4 12 1 21 4v6l-5-2v5h4c-1 4-4 7-8 10-6-4-9-8-9-13Z"/></symbol>
  <symbol id="i-bouclier" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 3 9 1l7 2v7c0 5-4 9-7 11-4-3-7-6-7-11ZM18 5l4 1v8c0 4-3 7-7 9l-2-2c4-3 6-7 6-11Z"/></symbol>
  <symbol id="i-aura" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 1 15 6l6-1-1 6 4 4-6 2-2 6-5-4-6 2 1-6-5-4 6-2Zm0 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></symbol>
  <symbol id="i-resonance" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M5 2h4v9a3 3 0 0 0 6 0V2h4v9c0 4-2 6-5 7v5h-4v-5c-3-1-5-3-5-7Z"/></symbol>
  <symbol id="i-honneur" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 1a8 8 0 1 1 0 16 8 8 0 0 1 0-16ZM5 16l5 3-3 5-2-3-4 1ZM19 16l4 6-4-1-2 3-3-5Z"/></symbol>
  <symbol id="i-pioche" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 1h14v4H6v14H2ZM9 8h14v16H9Z"/></symbol>
  <symbol id="i-soin" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6Z"/></symbol>
  <symbol id="i-degats" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M14 2 3 13h8l-2 9 12-13h-8Z"/></symbol>
  <symbol id="i-contresort" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 4a7 7 0 0 1 6 11L8 6a7 7 0 0 1 4-1Zm-6 3 10 10A7 7 0 0 1 6 8Z"/></symbol>
  <symbol id="i-rebond" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M10 1 1 9l9 8v-6h5c3 0 4 2 4 5v6h4v-6c0-6-3-9-8-9h-5Z"/></symbol>
  <symbol id="i-recyclage" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M20 2v9h-9l3-3a6 6 0 0 0-9 4H1A10 10 0 0 1 17 5ZM4 22v-9h9l-3 3a6 6 0 0 0 9-4h4A10 10 0 0 1 7 19Z"/></symbol>
  <symbol id="i-reanimation" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 1 1 12h7v7h8v-7h7ZM2 21h20v3H2Z"/></symbol>
  <symbol id="i-heures" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm-2 4h4v6l5 3-2 3-7-4Z"/></symbol>
  <symbol id="i-tribut" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M10 1h4v5h8v3h-8v11h5v3H5v-3h5V9H2V6h8ZM4 10 0 17h8ZM20 10l-4 7h8Z"/></symbol>
  <symbol id="i-transfert" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M16 1l8 6-8 6V9H2V5h14ZM8 11v4h14v4H8v4l-8-6Z"/></symbol>
  <symbol id="i-overkill" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 2v6H1v8h11v6l10-10ZM21 1h3v6h-3ZM21 17h3v6h-3Z"/></symbol>
  <symbol id="i-defausse" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 1h12v16H2ZM17 7h4v8h3l-5 7-5-7h3ZM2 20h10v3H2Z"/></symbol>
  <symbol id="i-paquet" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M2 2h15v11H2ZM4 16h9v5H4ZM18 13h3v6h3l-5 5-5-5h4Z"/></symbol>
  <symbol id="i-malediction" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M3 11a9 9 0 0 1 18 0v5l-3 2v5H6v-5l-3-2Zm3-3v5h4v-3Zm12 0-4 2v3h4Z"/></symbol>
  <symbol id="i-abordage" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M5 8a7 7 0 1 1 14 0v5l-4 2H9l-4-2Zm3-2v4h3V6Zm5 0v4h3V6ZM1 17l2-3 20 7-1 3ZM23 17l-1-3L1 21l1 3Z"/></symbol>
  <symbol id="i-cargaison" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M6 7a6 6 0 0 1 12 0h5v16H1V7Zm3 0h6a3 3 0 0 0-6 0Zm1 4v7h4v-7Z"/></symbol>
  <symbol id="i-furtif" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M3 10a9 9 0 0 1 18 0v13l-4-3-5 3-5-3-4 3Zm4-3v6h3V7Zm7 0v6h3V7Z"/></symbol>
  <symbol id="i-mana" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 1 15 8 12 12 9 8ZM2 13l7-1 3 4-5 4ZM22 13l-5 7-5-4 3-4Z"/></symbol>
  <symbol id="i-recherche" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M1 1h14v4H5v14h6v4H1ZM15 7a7 7 0 1 0 4 13l4 4 2-3-4-4a7 7 0 0 0-6-10Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></symbol>
  <symbol id="i-lien" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M9 1H5a5 5 0 0 0-5 5v7a5 5 0 0 0 5 5h4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4ZM15 6h4a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-4v-4h4a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-4ZM6 10h12v4H6Z"/></symbol>
</svg>`.trim();

/**
 * La couleur du bouclier de Protection selon l'élément tenu à distance.
 * `sable: null` est volontaire : sa Protection garde l'encre dorée ordinaire
 * des icônes, sans teinte spéciale.
 */
export const PROTECTION_COULEURS = Object.freeze({
  braise: '#ff3b30',
  eau: '#2f7bff',
  sable: null,
  tenebres: '#a855f7',
  neige: '#8fd8ff',
});

/** Les éléments contre lesquels une fiche est protégée, imprimés ou donnés par son arme. */
export function couleursProtectionCarte(carte) {
  const contre = carte?.protection?.contre ?? carte?.protectionSortsContre ?? carte?.donne?.protection?.contre;
  return [...new Set([contre].flat(Infinity).filter(Boolean))];
}

/** La couleur d'une Protection élémentaire, ou `null` quand l'encre ordinaire reste. */
export function couleurProtection(contre) {
  return PROTECTION_COULEURS[contre] ?? null;
}

/**
 * Du vocabulaire de jeu à l’id de symbole. Les clés couvrent les mots-clés
 * (drapeaux de fiche) et les types d’effet (`appliquer`, `valeurEffet`) ;
 * les ids interlinéaires servent aussi aux libellés de texte de carte.
 */
export const EFFET_ICONE = {
  reactionTourAdverse: 'i-embuscade',
  butin: 'i-butin',
  abordage: 'i-abordage',
  malediction: 'i-malediction',
  cargaison: 'i-cargaison',
  prise: 'i-abordage',
  cale: 'i-cargaison',
  furie: 'i-furie',
  esquive: 'i-esquive',
  contreAttaque: 'i-contre-attaque',
  envol: 'i-envol',
  rapidite: 'i-rapidite',
  coupRapide: 'i-coup-rapide',
  coupCritique: 'i-coup-critique',
  traque: 'i-traque',
  traquePirates: 'i-traque',
  provocation: 'i-provocation',
  defenseur: 'i-defenseur',
  tenacite: 'i-tenacite',
  infiltration: 'i-infiltration',
  volDeVie: 'i-vol-de-vie',
  protection: 'i-protection',
  protectionSorts: 'i-protection',
  protectionSortsContre: 'i-protection',
  overkill: 'i-overkill',
  bouclier: 'i-bouclier',
  'bouclier-lumiere': 'i-bouclier',
  aura: 'i-aura',
  resonance: 'i-resonance',
  // La Compagnie grandit avec sa tribu, comme la Résonance la renforce : même
  // symbole, un effet de présence qui se lit sur le type imprimé.
  compagnie: 'i-resonance',
  honneur: 'i-honneur',
  tribut: 'i-tribut',
  defausse: 'i-defausse',
  transfert: 'i-transfert',
  'defausse-adverse': 'i-defausse',
  defaussePaquet: 'i-paquet',
  pioche: 'i-pioche',
  'pioche-defausse': 'i-pioche',
  soin: 'i-soin',
  'soin-creatures': 'i-soin',
  degats: 'i-degats',
  contresort: 'i-contresort',
  'retour-main': 'i-rebond',
  recyclage: 'i-recyclage',
  reanimation: 'i-reanimation',
  // Le Lien : la seule icône qui ne décrit PAS un effet de la carte, mais le
  // fait que sa phrase nomme une ancre. Deux maillons.
  lien: 'i-lien',
  heures: 'i-heures',
  debuff: 'i-degats',
  'empeche-blocage': 'i-esquive',
  'empeche-attaque': 'i-esquive',
  buff: 'i-aura',
  banniere: 'i-aura',
  jetons: 'i-aura',
  exil: 'i-rebond',
  'destruction-cible': 'i-degats',
  'destruction-totale': 'i-degats',
  'retour-apres-tours': 'i-rebond',
  furtif: 'i-furtif',
  manaEngagement: 'i-mana',
  recherche: 'i-recherche',
  'recherche-deck': 'i-recherche',
  'destruction-navire': 'i-degats',
  'destruction-arme': 'i-degats',
  'mue-mondiale': 'i-defausse',
};

/**
 * Un `<svg>` d’icône prêt à poser.
 *
 * @param {string} cle — une clé d’`EFFET_ICONE` ou un id `i-…` déjà résolu ;
 * @param {{ size?: number, classe?: string, titre?: string }} [options]
 */
export function effetIcon(cle, { size = 16, classe = '', titre = '' } = {}) {
  const id = cle.startsWith('i-') ? cle : (EFFET_ICONE[cle] ?? 'i-degats');
  const aria = titre ? ` role="img" aria-label="${titre}"` : ' aria-hidden="true"';
  return `<svg class="rpg-effet-icone${classe ? ` ${classe}` : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"${aria}><use href="#${id}"/></svg>`;
}

/**
 * Les pastilles d’une fiche : ses mots-clés passifs, dans l’ordre de lecture
 * (type de combat d’abord, puis les protections et le Harakiri).
 */
export const MOTS_CLES_PASTILLES = [
  'reactionTourAdverse', 'envol', 'infiltration', 'volDeVie', 'rapidite', 'coupRapide', 'coupCritique', 'traquePirates', 'provocation', 'defenseur', 'overkill', 'furie', 'esquive',
  'contreAttaque',
  'tenacite', 'resonance', 'protection', 'protectionSorts', 'protectionSortsContre', 'bouclier', 'aura', 'honneur', 'butin',
  'abordage', 'malediction', 'cargaison', 'furtif', 'manaEngagement',
];

/** Les pastilles d’une carte, en HTML — `carte` = fiche `rpgCards.js`. */
export function pastillesCarte(carte, { size = 15, classe = 'rpg-chip' } = {}) {
  return MOTS_CLES_PASTILLES
    .filter((cle) => Boolean(carte?.[cle]) || (cle === 'bouclier' && carte?.bouclierInitial))
    .flatMap((cle) => {
      if (cle !== 'protection' && cle !== 'protectionSortsContre') return [`<span class="${classe}">${effetIcon(cle, { size })}</span>`];
      const contres = couleursProtectionCarte(carte);
      if (!contres.length) return [`<span class="${classe}">${effetIcon(cle, { size })}</span>`];
      return contres.map((contre) => {
        const couleur = couleurProtection(contre);
        const style = couleur ? ` style="color:${couleur};border-color:${couleur}"` : '';
        return `<span class="${classe}" data-protection-contre="${contre}"${style}>${effetIcon(cle, { size })}</span>`;
      });
    })
    .join('');
}

/* ── La lecture structurée des pastilles et des lignes de règle ──────────────
   Les composants React (`effetIcons.jsx`) consomment ces deux fonctions pures :
   elles disent QUELLES pastilles une fiche porte, et QUELLE icône précède une
   ligne de règle — sans aucun DOM, donc testables telles quelles. */

/** Le libellé français de chaque clé d’icône. */
export const EFFET_LIBELLES = {
  reactionTourAdverse: 'Embuscade',
  butin: 'Butin',
  abordage: 'Abordage',
  malediction: 'Malédiction',
  cargaison: 'Cargaison',
  prise: 'Prise',
  cale: 'Cale',
  furie: 'Furie',
  furie: 'Furie',
  esquive: 'Esquive',
  contreAttaque: 'Contre-attaque',
  envol: 'Envol',
  rapidite: 'Rapidité',
  coupRapide: 'Attaque ciblée',
  coupCritique: 'Coup critique',
  traque: 'Traque',
  traquePirates: 'Traque',
  provocation: 'Provocation',
  defenseur: 'Défenseur',
  tenacite: 'Tenacité',
  infiltration: 'Infiltration',
  volDeVie: 'Vol de vie',
  protection: 'Bouclier',
  protectionSorts: 'Protection anti-magie',
  protectionSortsContre: 'Protection contre les sorts',
  overkill: 'Overkill',
  bouclier: 'Bouclier',
  aura: 'Aura',
  banniere: 'Bannière',
  resonance: 'Résonance',
  // Le mot-clé du set Soleil rouge se nomme Harakiri : un mot, pas une
  // statistique — la pastille ne porte donc aucun chiffre derrière elle.
  honneur: 'Harakiri',
  tribut: 'Tribut',
  defausse: 'Défausse',
  transfert: 'Transfert',
  'defausse-adverse': 'Défausse adverse',
  defaussePaquet: 'Défausse de paquet',
  pioche: 'Pioche',
  soin: 'Soin',
  degats: 'Dégâts',
  contresort: 'Contresort',
  'retour-main': 'Rebond',
  recyclage: 'Recyclage',
  reanimation: 'Réanimation',
  heures: 'Heures',
  buff: 'Renfort',
  debuff: 'Affaiblissement',
  'empeche-blocage': 'Blocage interdit',
  exil: 'Exil',
  'destruction-cible': 'Destruction',
  'destruction-totale': 'Destruction totale',
  furtif: 'Furtivité',
  manaEngagement: 'Mana',
  recherche: 'Recherche',
  'recherche-deck': 'Recherche',
  'destruction-navire': 'Destruction de navire',
  'destruction-arme': 'Destruction d’arme',
  'mue-mondiale': 'Mue mondiale',
  // Les effets qui n'avaient pas encore de nom lisible : la planche de revue
  // les affichait par leur clé de code, ce qui n'est pas un libellé de carte.
  'bouclier-lumiere': 'Bouclier de lumière',
  compagnie: 'Compagnie',
  'pioche-defausse': 'Pioche et défausse',
  'soin-creatures': 'Soin des créatures',
  lien: 'Lien',
  'empeche-attaque': 'Attaque interdite',
  jetons: 'Jetons',
  'retour-apres-tours': 'Retour différé',
};

const capitaliser = (mot = '') => (mot ? mot.charAt(0).toUpperCase() + mot.slice(1) : mot);

/**
 * Les pastilles d’une fiche, structurées : `[{ cle, icone, label, valeur }]`.
 * Les mots-clés passifs d’abord (l’ordre de lecture validé sur la preview :
 * combat, protections, Harakiri, butin), puis — pour les sorts et les arrivées
 * signées — la pastille de l’effet principal (Contresort, Réanimation…).
 */
export function pastillesPourCarte(carte) {
  if (!carte) return [];
  const pastilles = [];
  const ajouter = (cle, label, valeur = null, details = {}) => {
    if (pastilles.some((pastille) => pastille.cle === cle)) return;
    pastilles.push({ cle, icone: EFFET_ICONE[cle] ?? 'i-degats', label, valeur, ...details });
  };

  if (carte.reactionTourAdverse) ajouter('reactionTourAdverse', 'Embuscade');
  if (carte.envol) ajouter('envol', 'Envol');
  // L'Envol que la Furie prête (le Maître du marteau) ne s'imprime pas : la
  // pastille dit d'où il vient, tant que la Furie n'est pas allumée.
  if (carte.furieGains?.envol) ajouter('envol', 'Envol (furie)');
  if (carte.infiltration || carte.arrivee?.type === 'infiltration') ajouter('infiltration', 'Infiltration');
  if (carte.volDeVie || carte.donne?.volDeVie || carte.effet?.volDeVie) ajouter('volDeVie', 'Vol de vie');
  if (carte.rapidite) ajouter('rapidite', 'Rapidité');
  if (carte.coupRapide) ajouter('coupRapide', 'Attaque ciblée');
  if (carte.coupCritique) ajouter('coupCritique', 'Coup critique');
  if (carte.traquePirates) ajouter('traque', 'Traque', Number(carte.traquePirates) || null);
  if (carte.provocation) ajouter('provocation', 'Provocation');
  if (carte.defenseur || carte.prioriteAttaqueRapide) ajouter('defenseur', 'Défenseur');
  // Les Lettres de Marque : l'Abordage imprimé (créature au seuil « coût − 1 »,
  // Grappin à l'attachement — la pastille porte le seuil), la Cargaison du
  // convoi, et le déclencheur de prise du Négociant.
  if (carte.abordage) ajouter('abordage', 'Abordage', Number.isFinite(carte.abordage) ? carte.abordage : null);
  // Le Grappin dynamique : son seuil se lit sur le porteur, pas sur la fiche —
  // la pastille nomme le mot-clé sans chiffre.
  if (carte.abordageDynamique) ajouter('abordage', 'Abordage');
  // L'Overkill peut être imprimé, prêté par une arme, accordé par un sort
  // (le Mur de boucliers) ou par la Furie (le Maître du marteau) : la pastille
  // suit l'effet, pas seulement la fiche.
  const overkillImprime = carte.overkill || carte.effet?.overkill
    || carte.arrivee?.overkill || carte.donne?.overkill;
  if (overkillImprime) ajouter('overkill', 'Overkill');
  else if (carte.furieGains?.overkill) ajouter('overkill', 'Overkill (furie)');
  if (carte.furie) ajouter('furie', 'Furie', Number(carte.furie) || null);
  if (carte.esquive) ajouter('esquive', 'Esquive', null);
  if (carte.contreAttaque || carte.donne?.contreAttaque) ajouter('contreAttaque', 'Contre-attaque');
  if (carte.tenacite) ajouter('tenacite', 'Tenacité');
  if (carte.compagnie) {
    // La Compagnie se nomme par la tribu qu'elle compte : « Compagnie viking ».
    const tribus = { samourai: 'samouraï', viking: 'viking' };
    ajouter('compagnie', `Compagnie ${tribus[carte.compagnie.tribu] ?? carte.compagnie.tribu}`);
  }
  if (carte.resonance) {
    // La Résonance se nomme par le TYPE imprimé de la carte : aujourd’hui,
    // « Résonance samouraï ».
    const tribus = { samourai: 'samouraï', viking: 'viking' };
    ajouter('resonance', carte.resonanceTribu
      ? `Résonance ${tribus[carte.resonanceTribu] ?? carte.resonanceTribu}`
      : 'Résonance');
  }
  if (carte.protection?.contre) {
    // Libellés accentués des couleurs (« Ténèbres », pas « Tenebres »).
    const labels = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
    const contres = couleursProtectionCarte(carte);
    const contre = contres
      .map((couleur) => labels[couleur] ?? capitaliser(couleur)).join(' et ');
    ajouter('protection', `Bouclier ${contre}`, null, { contres });
  }
  if (carte.protectionSorts) {
    ajouter('protectionSorts', 'Protection contre les magies et les sorcelleries');
  }
  if (carte.protectionSortsContre) {
    const labels = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
    const contres = [carte.protectionSortsContre].flat(Infinity).filter(Boolean);
    const contre = contres.map((couleur) => labels[couleur] ?? capitaliser(couleur)).join(' et ');
    ajouter('protectionSortsContre', `Protection contre les sorts de ${contre}`, null, { contres });
  }
  if (carte.aura) ajouter('aura', 'Aura');
  if (carte.banniere) ajouter('banniere', 'Bannière');
  // Le Harakiri est un mot-clé, pas une statistique : le chiffre de dégâts
  // reste dans la donnée (le glossaire s'en sert) mais ne s'imprime pas
  // derrière le nom.
  if (carte.honneur) {
    ajouter('honneur', 'Harakiri', Number(carte.honneur) || null, { valeurMasquee: true });
  }
  if (carte.butin) ajouter('butin', 'Butin');
  if (carte.tribut) ajouter('tribut', 'Tribut', Number(carte.tribut) || null);
  // La Malédiction (La Barbe Noire) : -2/-0 à toutes les créatures adverses
  // tant que la source reste en jeu — sans adjacence, contrairement à l'Aura.
  if (carte.malediction) ajouter('malediction', 'Malédiction');
  if (carte.cargaison) ajouter('cargaison', 'Cargaison', Number(carte.cargaison) || null);
  if (carte.declenchePrise) ajouter('prise', 'Prise', Number(carte.declenchePrise) || null);
  // L'Ifrit furtif : sa présence s'éteint à la fin du tour — la pastille
  // annonce ce caractère éphémère, distinct de la Rapidité qu'il garde.
  if (carte.furtif) ajouter('furtif', 'Furtivité');
  // Tiziri s'engage pour produire du mana : la pastille nomme l'élément et
  // la quantité (« Mana d'eau 1 »), la goutte restant monochrome sur la face.
  if (carte.manaEngagement) {
    const libellesMana = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
    const nom = libellesMana[carte.manaEngagement.couleur] ?? capitaliser(carte.manaEngagement.couleur);
    ajouter('manaEngagement', `Mana de ${nom}`, Number(carte.manaEngagement.amount) || 1, {
      couleurMana: carte.manaEngagement.couleur,
    });
  }
  // Une arme peut accorder un bouclier à son porteur (la Hache de la
  // banquise) : la pastille se lit sur la fiche de l'arme comme sur celle
  // d'une créature qui arrive avec un bouclier.
  if (carte.bouclierInitial) ajouter('bouclier', 'Bouclier');
  if (carte.donne?.bouclier) ajouter('bouclier', 'Bouclier', Number(carte.donne.bouclier) || null, { valeurMasquee: true });
  if (carte.porteurMeurt?.type === 'reanimation-porteur') ajouter('reanimation', 'Réanimation');

  // L’effet signé des sorts (et des arrivées qui se lisent d’un coup d’œil).
  const typeEffet = carte.effet?.type ?? carte.arrivee?.type;
  const pastilleEffet = {
    contresort: ['contresort', 'Contresort'],
    reanimation: ['reanimation', 'Réanimation'],
    recyclage: ['recyclage', 'Recyclage'],
    heures: ['heures', 'Heures'],
    'retour-main': ['retour-main', 'Rebond'],
    exil: ['exil', 'Exil'],
    'destruction-cible': ['destruction-cible', 'Destruction'],
    'destruction-totale': ['destruction-totale', 'Destruction totale'],
    'empeche-blocage': ['empeche-blocage', 'Blocage interdit'],
    transfert: ['transfert', 'Transfert'],
    'defausse-adverse': ['defausse-adverse', 'Défausse adverse'],
    defaussePaquet: ['defaussePaquet', 'Défausse de paquet'],
    // Le sceau de la Lettre de marque se lit « Abordage » sur la face :
    // c’est ce que gagne la prochaine créature, même si le seuil n’existe
    // qu’à sa pose. Le Pilote, lui, cherche désormais un Navire au deck.
    'arrivees-abordage': ['abordage', 'Abordage'],
    'prochaine-arrivee-abordage': ['abordage', 'Abordage'],
    'recherche-deck': ['recherche', 'Recherche'],
    'destruction-navire': ['destruction-navire', 'Destruction de navire'],
    'destruction-arme': ['destruction-arme', 'Destruction d’arme'],
    'mue-mondiale': ['mue-mondiale', 'Mue mondiale'],
  }[typeEffet];
  if (pastilleEffet) ajouter(...pastilleEffet);
  if (typeEffet === 'bouclier') {
    ajouter('bouclier', 'Bouclier', Number(carte.effet?.amount ?? carte.arrivee?.amount) || null, { valeurMasquee: true });
  }

  // La modification de statistiques, écrite en clair : « Lame de mer » porte
  // « Affaiblissement -2/-2 », l'Embuscade autant, le Serment de la forge
  // « Renfort +2/+1 ». Sans elle, le chiffre ne se lisait que dans la règle —
  // que les faces de cartes n'affichent pas.
  const modif = modificationStats(carte);
  if (modif) {
    const cle = modif.atk < 0 || modif.def < 0 ? 'debuff' : 'buff';
    ajouter(cle, EFFET_LIBELLES[cle], libelleModificationStats(carte));
    // Les deux chiffres restent lisibles séparément : la bulle écrit « perd 2
    // en attaque » plutôt que de répéter un « -2/0 » trompeur en défense.
    const pastille = pastilles.find((candidate) => candidate.cle === cle);
    if (pastille) pastille.stats = modif;
  }

  return pastilles;
}

/**
 * Les mots-clés que la Furie prête, mais qui ne sont pas encore actifs.
 * L'état réel de l'entité décide : Envol et Overkill restent visibles sur le
 * Maître, grisés tant qu'il ne les possède pas, puis se colorent dès que sa
 * Furie les lui donne. Sans entité (main, catalogue), ils sont évidemment
 * encore en attente. Une autre source peut n'en activer qu'un : chaque icône
 * suit alors son propre état au lieu de regarder seulement le drapeau Furie.
 */
export function effetsFurieInactifs(carte, entite = null) {
  if (!carte?.furieGains) return [];
  return ['envol', 'overkill'].filter((cle) => carte.furieGains[cle] && !entite?.[cle]);
}

/**
 * Les effets d'une créature posée qu'elle a déjà dépensés : sa Tenacité
 * quand elle l'a sauvée une fois, son Bouclier quand il a bloqué son sort
 * (Salem, Guerrier, Parade de verre…) ou que le bouclier de lumière de la
 * Dame aux ailes d'or a été touché. L'aperçu grise alors
 * la pastille, son explication et les lignes de règle de cet effet. Une carte
 * en main ou au catalogue n'a pas d'entité : rien n'y est jamais épuisé. Un
 * nouveau bouclier réarme l'état — tant qu'il tient, rien n'est grisé.
 *
 * Le bouclier **prêté** compte comme les autres : une Parade de verre ou la
 * Hache de la banquise ne s'impriment pas sur la fiche de la créature, mais
 * `bouclierEpuise` garde la trace de la parade tombée, pour que son icône
 * violette reste affichée en gris au lieu de s'évaporer sans laisser de trace.
 */
export function effetsEpuisesPourEntite(carte, entite) {
  if (!carte || !entite) return [];
  const epuises = [];
  if (carte.tenacite && entite.tenaciteDisponible === false) epuises.push('tenacite');
  if (carte.protection && !entite.protection) epuises.push('protection');
  const bouclierImprime = [carte.arrivee?.type, carte.effet?.type]
    .some((type) => type === 'bouclier' || type === 'bouclier-lumiere')
    || Boolean(carte.donne?.bouclier) || Boolean(carte.bouclierInitial);
  const bouclierActif = Number(entite.bouclier) > 0 || Boolean(entite.bouclierLumiere);
  // Les entités du moteur portent `bouclierEpuise` ; les fixtures anciennes
  // qui ne le portent pas retombent sur la simple absence de bouclier d'une
  // carte qui en imprime un. Sans bouclier imprimé, seul `bouclierEpuise`
  // témoigne qu'une parade a existé — c'est le cas d'un bouclier prêté.
  const bouclierTombe = entite.bouclierEpuise === true
    || (bouclierImprime && entite.bouclierEpuise === undefined);
  if (!bouclierActif && bouclierTombe) epuises.push('bouclier');
  return epuises;
}

/** Les motifs qui font reconnaître une ligne de règle, dans le texte français. */
const MOTIFS_LIGNE = [
  ['reactionTourAdverse', /\bembuscade\b/iu],
  ['traque', /\btraque\b/iu],
  ['butin', /\bbutin\b/iu],
  ['abordage', /\babordage\b/iu],
  ['malediction', /\bmalédiction\b/iu],
  ['cargaison', /\bcargaison\b/iu],
  ['prise', /\bprises? en cale\b/iu],
  ['cale', /\bcale\b/iu],
  ['furtif', /\bfurtif\b|\bfurtivit[ée]/iu],
  ['furie', /\bfurie\b/iu],
  ['esquive', /\besquive/iu],
  ['contreAttaque', /\bcontre[- ]attaque/iu],
  ['envol', /\benvol\b/iu],
  ['rapidite', /\brapidité/iu],
  ['coupRapide', /\battaque ciblée/iu],
  ['coupCritique', /\bcoup critique/iu],
  ['provocation', /\bprovocation\b/iu],
  ['defenseur', /\bd[ée]fenseur/iu],
  ['overkill', /\boverkill\b/iu],
  ['tenacite', /\bténacité/iu],
  ['infiltration', /\binfiltration/iu],
  ['volDeVie', /\bvol de vie\b/iu],
  ['resonance', /\brésonance/iu],
  ['honneur', /\bharakiri\b|\bhonneur\b/iu],
  ['tribut', /\btribut\b/iu],
  ['transfert', /\bperd\s+\d+\s*PV\b[^.]*\bgagnez\b|\btransfert\b/iu],
  ['contresort', /(?:^|[—:]\s*)contre(?:z|s)?\b|\bcontresort\b|\bcontrez\b/iu],
  ['reanimation', /\bréanimation|fait revenir|cimetière[^.]*en jeu/iu],
  ['recyclage', /\brecycl|cimetière[^.]*\b(?:dans|en)\b[^.]*\bmain\b/iu],
  ['heures', /\bheures\b|\bcompteur/iu],
  ['retour-main', /\brenvoy|retour[^.]*\bmain\b|revient en main/iu],
  ['exil', /\bexil|retire[rz]?\s+de la partie|retirée?\s+de la partie/iu],
  ['defaussePaquet', /dessus du paquet[^.]*cimetière|paquet adverse[^.]*cimetière/iu],
  ['empeche-blocage', /empêche de bloquer|ne pourra pas bloquer|ne peut pas bloquer/iu],
  ['destruction-totale', /détruisez toutes les créatures/iu],
  ['destruction-arme', /d[ée]truis(?:ez|ent|ons)?[^.]*\barme\b/iu],
  ['jetons', /\bcré(?:e|ez|éent|er)\b[^.]*\b(?:créatures?-jetons?|jetons?|chiens? de sable)\b|\bcréatures?-jetons?\b/iu],
  ['protectionSortsContre', /\bprotection contre les sorts\b/iu],
  ['protection', /\bprotection\b|\bprot[ée]g/iu],
  ['bouclier', /\bbouclier/iu],
  ['pioche', /\bpioch/iu],
  ['soin', /\bsoign|\bsoin\b|récupérez|regagnez|gagnez\s+\d+\s*PV|points de vie/iu],
  ['debuff', /retire\s+\d+\s+attaques?|perdent\s+\d+\s+attaque|donne\s+-\d+\s*\/\s*-\d+|gagnent\s+-\d+\s*\/\s*-\d+/iu],
  ['degats', /\bd[ée]g[âa]ts|\binflige/iu],
  ['defausse', /\bd[ée]fauss/iu],
];

const TYPES_SANS_ICONE_LIGNE = new Set(['brouillard', 'combat', 'blocage-force']);

function motifPourTexte(texte) {
  let meilleure = null;
  for (const [cle, motif] of MOTIFS_LIGNE) {
    const correspondance = motif.exec(texte);
    if (correspondance && (meilleure === null || correspondance.index < meilleure.index)) {
      meilleure = { cle, index: correspondance.index };
    }
  }
  return meilleure?.cle ?? null;
}

function iconeEffetStructure(effet) {
  if (!effet?.type || TYPES_SANS_ICONE_LIGNE.has(effet.type)) return null;
  if (effet.type === 'buff'
    && (effet.cible === 'creatures-adverses' || (Number(effet.atk) || 0) < 0 || (Number(effet.def) || 0) < 0)) {
    return 'debuff';
  }
  return EFFET_ICONE[effet.type] ? effet.type : null;
}

/**
 * L’icône qui précède une ligne de règle : celle de l'action écrite dans
 * CETTE phrase, jamais un tampon appliqué à toute la fiche.
 *
 * Trois lectures, dans l'ordre :
 * 1. les cas où un mot seul induirait en erreur — prévenir des dégâts n'est
 *    pas en infliger, un brouillard qui les annule ne porte aucune icône,
 *    un retour du cimetière vers la main est un recyclage et pas un rebond ;
 * 2. pour un déclencheur, l'action après les deux-points (« Quand le porteur
 *    inflige… : piochez » se lit Pioche), sinon le motif le plus tôt ;
 * 3. à défaut de motif, l'effet structuré correspondant au déclencheur de la
 *    phrase — jamais l'arrivée d'une créature collée sur ses mots-clés, ni
 *    son effet de mort. Certaines magies (`brouillard`, combat entre deux
 *    créatures, blocage forcé) n'ont pas d'icône qui les dise : `null`.
 */
export function iconePourLigne(carte, ligne = '') {
  // « Magie Rapide » nomme la famille du sort, pas le mot-clé Rapidité.
  const texte = String(ligne).replace(/magie rapide/giu, ' ');
  const phrase = texte.trim();

  // La phrase d'un LIEN — « Avec <ancre> en jeu : … » — ne porte pas le
  // pictogramme d'un effet : elle ne décrit pas ce que fait la carte, elle dit
  // ce que son ancre y ajoute. Elle a donc son propre symbole, les deux
  // maillons du Lien — et jamais celui de la ligne du dessus, qui annonçait
  // des dégâts sur une phrase conditionnelle.
  if (estLigneDeLien(phrase)) return 'lien';
  if (carte?.kind === 'magie' && TYPES_SANS_ICONE_LIGNE.has(carte.effet?.type)) return null;
  if (/^(?:Mur|Doit bloquer|Priorité d’attaque rapide)\s*—/u.test(phrase)) return null;
  if (/^Si\b/u.test(phrase)) return null;
  if (/\bne peut pas attaquer\.?$/u.test(phrase)) return null;
  if (/prévient les [^.]*dégâts|ne peut pas subir de dégâts/iu.test(phrase)) return 'bouclier';
  if (/cimetière[^.]*\b(?:dans|en)\b[^.]*\bmain\b/iu.test(phrase)) return 'recyclage';

  const declencheur = phrase.match(/^(?:Quand|Lorsque|Au début)\b[^:]*:\s*(.+)$/u);
  if (declencheur) {
    const consequence = motifPourTexte(declencheur[1]);
    if (consequence) return consequence;
  }

  const motif = motifPourTexte(phrase);
  if (motif) return motif;

  if (carte?.kind === 'magie') return iconeEffetStructure(carte.effet);

  if (/\bporteur\b[^.]*\b(?:meurt|détruit)\b/iu.test(phrase)) {
    return iconeEffetStructure(carte?.porteurMeurt);
  }
  if (/\bporteur\b[^.]*blessures de combat[^.]*sorcier/iu.test(phrase)) {
    return iconeEffetStructure(carte?.porteurBlesseSorcier ?? carte?.porteurBlesse);
  }
  if (/\bporteur\b[^.]*blessures de combat[^.]*créature/iu.test(phrase)) {
    return iconeEffetStructure(carte?.porteurBlesseCreature ?? carte?.porteurBlesse);
  }
  if (/\bporteur\b[^.]*\battaque\b/iu.test(phrase)) {
    return iconeEffetStructure(carte?.porteurAttaque);
  }
  if (/\b(?:meurt|détruite?|est détruit)\b/iu.test(phrase)) {
    return iconeEffetStructure(carte?.destruction);
  }
  if (/\b(?:arrive|arrivée)\b/iu.test(phrase)) {
    return iconeEffetStructure(carte?.arrivee);
  }
  if (/^Tant qu/iu.test(phrase)) {
    if (carte?.banniere) return 'banniere';
    if (carte?.aura) return 'aura';
    if (carte?.malediction) return 'malediction';
  }
  if (carte?.butin && /touche le sorcier/iu.test(phrase)) return 'butin';
  return null;
}

/* ── Ce que fait chaque effet : l’explication de la pastille ──────────────────
   Dans un aperçu de carte la pastille se **déplie** : son détail s’écrit sous le
   mot, parce que le volet ne se survole pas. Ailleurs (grille du catalogue,
   guide), elle reste une puce et son détail s’ouvre au survol (ou au toucher).
   Le texte imprimé de la carte prime toujours : quand
   la fiche écrit « Attaque ciblée — … », c’est cette phrase qui remplit la bulle.
   Le glossaire ci-dessous ne sert que lorsque la carte nomme le mot-clé sans
   l’expliquer (« Rapidité. ») ou ne le nomme pas du tout (Exil, Contresort…). */

/** La définition de chaque effet, au féminin de « la créature » (ou de la carte). */
export const EFFET_DEFINITIONS = {
  reactionTourAdverse: 'Vous pouvez jouer cette carte pendant le tour adverse, en respectant les fenêtres de réponse.',
  envol: 'Ne peut être bloquée que par une créature avec Envol.',
  infiltration: 'Ne peut pas être bloquée.',
  volDeVie: 'Chaque fois que cette créature inflige des dégâts, son contrôleur gagne la moitié de ces dégâts en points de vie, arrondie à l’entier supérieur.',
  rapidite: 'Peut attaquer le tour où elle arrive.',
  furtif: 'Cette créature est détruite à la fin du tour où elle arrive en jeu.',
  coupRapide: 'Quand elle attaque, elle doit viser une créature adverse s’il y en a une. Elle lui inflige ses dégâts d’attaque sans riposte, avec 15 % de chances de rater. Si aucune créature adverse n’est en jeu, elle peut attaquer le sorcier normalement.',
  coupCritique: 'En combat, 15 % de chances de frapper 4 fois la créature adverse.',
  traque: (n) => `Quand elle attaque une créature avec Abordage, Butin ou une cale occupée, elle gagne +${n ?? 'N'}/+0 contre elle pour ce combat.`,
  defenseur: 'Quand une créature adverse avec Attaque ciblée attaque, elle doit choisir un Défenseur adverse comme cible si elle peut en viser un. S’il y en a plusieurs, l’attaquant choisit lequel. Défenseur ne force pas à attaquer.',
  provocation: 'Quand elle attaque, elle doit être bloquée par au moins une créature si un blocage légal est possible.',
  furie: (n) => `Tant que sa défense actuelle est inférieure à sa DEF de base, elle gagne +${n ?? 'X'}/+0.`,
  overkill: 'Quand elle est bloquée, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier défenseur.',
  esquive: () => '15 % de chance d’esquiver une attaque, une Magie ou une Sorcellerie : leur effet sur elle ne porte pas du tout. Les capacités ne s’esquivent pas.',
  contreAttaque: 'Quand une créature adverse la frappe avec Attaque ciblée ou la cible avec une capacité, elle lui inflige ses dégâts d’attaque ; quand c’est un sort — ciblé ou de zone — qui l’atteint, la riposte frappe le sorcier adverse. Elle riposte même si le coup la détruit ou si elle l’esquive.',
  tenacite: 'Une fois par partie, quand elle meurt (sauf exilée), elle revient en jeu au prochain tour de son propriétaire avec 1 point de défense — son effet d’arrivée se déclenche de nouveau.',
  resonance: 'Tant qu’elle est en jeu, les créatures de sa famille gagnent le bonus indiqué sur la carte.',
  compagnie: (n) => `Tant qu’elle est en jeu, elle gagne +${n ?? 1}/+${n ?? 1} pour chaque AUTRE créature de sa tribu dans son camp. Elle ne se compte pas elle-même, et une créature de la même tribu dans le camp adverse ne compte pas non plus : perdre un frère d’armes fait redescendre le bonus, jamais sous 1 PV.`,
  protection: (couleur) => `Bouclier de ${couleur ?? 'cette couleur'} : bloque le prochain sort adverse de cette couleur, puis se brise. Les attaques, capacités et sorts alliés passent.`,
  protectionSortsContre: (couleur) => `Les Magies Rapides et Sorcelleries de ${couleur ?? 'cette couleur'} ne peuvent ni la cibler ni la blesser. Les créatures et leurs capacités fonctionnent normalement.`,
  bouclier: () => 'Bloque le premier sort ou effet de créature adverse qui atteint cette créature, même en zone : elle seule est épargnée, puis le bouclier tombe. Les attaques et les effets alliés passent normalement.',
  aura: () => 'Tant qu’elle est en jeu, seules les créatures adjacentes de son camp reçoivent son renfort : celles des deux cases qui entourent la sienne. Une case vide coupe le voisinage, et la source ne se renforce jamais elle-même. Si elle quitte la table, le bonus disparaît.',
  banniere: 'Tant qu’elle est en jeu, les créatures de sa tribu gagnent un bonus.',
  honneur: (n) => `Quand cette créature meurt, elle inflige ${n ?? 'X'} dégât${n > 1 ? 's' : ''} à une créature adverse choisie au hasard, ou au sorcier adverse s’il n’y en a aucune.`,
  butin: 'Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.',
  abordage: (n) => `Quand cette créature arrive en jeu, la créature adverse ciblée de coût ${n ?? 'N'} ou moins est prise en sa cale — détenue face visible, une seule place — au lieu d’être détruite : elle ne déclenche rien. Son propriétaire peut la racheter en main au prix imprimé ; si le capteur meurt, elle revient en jeu avec l’attaque et la défense qu’elle avait à la prise, sans effet d’arrivée — renvoyé ou exilé, il la rend en main.`,
  malediction: () => 'Tant qu’elle est en jeu, TOUTES les créatures du camp adverse perdent 2 points d’attaque (et aucun de défense). Aucune adjacence : une créature qui arrive après elle est maudite aussi. Le malus se lève si la dernière source quitte la table, et deux sources cumulent leurs malédictions.',
  cargaison: (n) => `Quand cette créature meurt ou est prise en cale, son propriétaire pioche ${n ?? 'N'} carte${n > 1 ? 's' : ''} : le convoi est assuré.`,
  prise: (n) => `Chaque fois qu’une créature est prise en cale, vous piochez ${n ?? 1} carte${n > 1 ? 's' : ''} : la commission du négociant.`,
  cale: 'La créature détenue par ce capteur. Elle ne se rachète pas : il faut détruire le capteur (elle revient alors en jeu avec ses statistiques de prise, sans effet d’arrivée), ou l’exiler, ou le renvoyer en main (elle revient en main).',
  tribut: (n) => `Quand cette créature touche le sorcier adverse, il perd ${n ?? 'N'} PV et vous en gagnez ${n ?? 'N'}.`,
  transfert: (n) => `Le sorcier adverse perd ${n ?? 'X'} PV et vous en gagnez ${n ?? 'X'}.`,
  'defausse-adverse': 'L’adversaire défausse une carte : il en choisit une, sa moins utile.',
  defaussePaquet: 'Les cartes du dessus du paquet adverse partent au cimetière.',
  contresort: 'Annule une carte annoncée par l’adversaire, avant qu’elle ne se résolve.',
  reanimation: 'Fait revenir en jeu une créature de votre cimetière.',
  recyclage: 'Renvoie une carte de votre cimetière dans votre main.',
  heures: 'Porte des compteurs d’Heures : on en retire un au début de chacun de vos tours ; quand le dernier part, l’effet se déclenche.',
  'retour-main': 'Renvoie une créature dans la main de son propriétaire : elle n’est pas détruite et pourra être rejouée.',
  'destruction-cible': 'Détruit une créature ciblée respectant le coût indiqué, sans infliger de dégâts ; ses capacités de mort se déclenchent.',
  'destruction-totale': 'Détruit les créatures des deux camps, sans infliger de dégâts. Les capacités de mort se déclenchent.',
  'destruction-arme': 'Détruit une arme équipée à une créature adverse : ses bonus et ses mots-clés quittent le porteur, et l’arme rejoint le cimetière.',
  exil: 'Retire une créature de la partie : elle ne va pas au cimetière.',
  'empeche-blocage': 'La créature visée ne peut pas bloquer pendant la durée indiquée.',
  debuff: (valeur) => `La créature visée encaisse un malus de ${valeur ?? '-X/-X'} : son attaque frappe moins fort et sa réserve de vie fond. Si sa défense tombe à 0, elle est détruite.`,
  buff: (valeur) => `La cible gagne un bonus de ${valeur ?? '+X/+X'} en attaque et en défense.`,
};

/** Les libellés tels qu’ils s’impriment en tête de phrase sur les fiches. */
const LIBELLES_IMPRIMES = [
  ['reactionTourAdverse', 'Embuscade'],
  ['coupRapide', 'Attaque ciblée'],
  ['coupCritique', 'Coup critique'],
  ['traque', 'Traque'],
  ['provocation', 'Provocation'],
  ['defenseur', 'D[ée]fenseur'],
  ['overkill', 'Overkill'],
  ['envol', 'Envol'],
  ['infiltration', 'Infiltration'],
  ['volDeVie', 'Vol de vie'],
  ['rapidite', 'Rapidité'],
  ['furtif', 'Furtivit[ée]|Furtif'],
  ['furie', 'Furie(?: \\d+)?'],
  ['esquive', 'Esquive'],
  ['contreAttaque', 'Contre-attaque'],
  ['tenacite', 'T[ée]nacité'],
  ['resonance', 'Résonance(?: samouraï|viking| vampire| djinn)?'],
  ['compagnie', 'Compagnie(?: viking| samouraï)?'],
  ['honneur', 'Harakiri(?: \\d+)?'],
  ['butin', 'Butin'],
  ['tribut', 'Tribut(?: \\d+)?'],
  ['abordage', 'Abordage(?: \\d+)?'],
  ['protection', 'Bouclier d[’\'](?:Eau|Neige|Braise|Sable|Ténèbres)(?: et de (?:Eau|Neige|Braise|Sable|Ténèbres))?'],
  ['bouclier', 'Bouclier'],
  ['malediction', 'Malédiction'],
  ['cargaison', 'Cargaison(?: \\d+)?'],
  ['banniere', 'Bannière'],
  ['aura', 'Aura'],
  ['retour-main', 'Rebond'],
];

/**
 * Un mot-clé imprimé **en tête de phrase**, suivi soit d’un point
 * (« Rapidité. »), soit d’un tiret qui ouvre son explication
 * (« Attaque ciblée — … »). Le mot-clé cité au milieu d’une phrase (« sa Furie 3
 * s’enflamme ») n’est pas une tête de section : il reste dans le texte.
 */
const TETE_DE_SECTION = new RegExp(
  `(?:^|(?<=[.!?…]\\s+))(${LIBELLES_IMPRIMES.map(([, source]) => source).join('|')})(?:\\s*—\\s*|\\.(?=\\s|$))`,
  'gu',
);

/**
 * Où s’arrête l’explication d’un mot-clé : à la fin de sa phrase — plus les
 * phrases qui la précisent (« Si vous ne désignez personne, elle attaque
 * normalement. »). Une phrase qui ouvre un autre déclencheur (« Quand le
 * Faussoyeur arrive : … ») n’appartient pas au mot-clé : elle reste écrite.
 */
const PRECISION = /^(?:Si|Sinon|Sans)\b/u;
function finDeSection(texte, depuis, limite) {
  const finDePhrase = (debut) => {
    const reste = texte.slice(debut, limite);
    const point = /[.!?…](?=\s|$)/u.exec(reste);
    return point ? debut + point.index + 1 : limite;
  };
  let fin = finDePhrase(depuis);
  while (fin < limite) {
    const suite = texte.slice(fin, limite);
    const blancs = suite.length - suite.trimStart().length;
    if (!PRECISION.test(suite.trimStart())) break;
    fin = finDePhrase(fin + blancs);
  }
  return fin;
}

const cleDuLibelle = (libelle) => LIBELLES_IMPRIMES
  .find(([, source]) => new RegExp(`^(?:${source})$`, 'u').test(libelle))?.[0] ?? null;

/** La définition générique d’une pastille (valeur et couleur comprises). */
export function definitionPastille(pastille) {
  if (pastille.cle === 'debuff' || pastille.cle === 'buff') {
    // Un malus se lit par ce qu'il retire, statistique par statistique : la
    // vipère (-2/0) ne touche pas la défense, et la bulle ne doit pas le dire.
    const stats = pastille.stats ?? {};
    const atk = Math.abs(Number(stats.atk) || 0);
    const def = Math.abs(Number(stats.def) || 0);
    const genre = pastille.cle === 'debuff' ? 'perd' : 'gagne';
    const morceaux = [atk ? `${atk} en attaque` : null, def ? `${def} en défense` : null].filter(Boolean);
    const regle = morceaux.length
      ? `La cible ${genre} ${morceaux.join(' et ')}.`
      : EFFET_DEFINITIONS[pastille.cle](pastille.valeur ?? null);
    return pastille.cle === 'debuff'
      ? `${regle} Si sa défense tombe à 0, elle est détruite.`
      : regle;
  }
  const definition = EFFET_DEFINITIONS[pastille?.cle];
  if (typeof definition !== 'function') return definition ?? '';
  if (pastille.cle === 'protection') {
    const couleur = String(pastille.label ?? '').replace(/^(?:Protection|Bouclier)\s*/u, '');
    return definition(couleur || null);
  }
  if (pastille.cle === 'protectionSortsContre') {
    const couleurs = pastille.contres?.map((couleur) => capitaliser(couleur)).join(' et ');
    return definition(couleurs || null);
  }
  return definition(pastille.valeur ?? null);
}

/**
 * La lecture d’une fiche pour ses pastilles : chacune **avec ce qu’elle fait**
 * (`description`), et le texte de règle qui reste une fois les sections de
 * mots-clés passées aux pastilles.
 *
 * La `description` s’ouvre au survol ou au toucher de la pastille. Dans les
 * previews (`HoverCardPreview`), seuls les déclencheurs et précisions non
 * expliqués par ces bulles restent dans le bloc « Effets ».
 *
 * - « Attaque ciblée — Sélectionnée pour attaquer… » : la section court jusqu’à
 *   la fin de sa phrase (et des phrases qui la précisent, « Si vous ne
 *   désignez personne… ») ; elle devient l’explication de la pastille Coup
 *   rapide et quitte le texte ;
 * - « Rapidité. » : la pastille prend la définition du glossaire, le mot
 *   quitte le texte ;
 * - tout ce qui n’est pas une section de mot-clé (arrivées, morts, sorts…)
 *   reste écrit — aucune règle ne se cache derrière une pastille qui ne la
 *   nommerait pas.
 *
 * @returns {{ pastilles: Array<{ cle, icone, label, valeur, description }>, texte: string }}
 */
export function effetsDetailles(carte) {
  const pastilles = pastillesPourCarte(carte).map((pastille) => ({ ...pastille, description: '' }));
  const brut = carte?.text && carte.text !== '—' ? String(carte.text) : '';
  if (!brut || carte?.kind === 'terrain') {
    for (const pastille of pastilles) pastille.description = definitionPastille(pastille);
    return { pastilles, texte: brut };
  }

  const sections = [...brut.matchAll(TETE_DE_SECTION)].map((correspondance) => ({
    cle: cleDuLibelle(correspondance[1]),
    debut: correspondance.index,
    finTete: correspondance.index + correspondance[0].length,
    tiret: correspondance[0].includes('—'),
  }));
  const retirees = [];
  sections.forEach((section, index) => {
    const pastille = pastilles.find((candidate) => candidate.cle === section.cle);
    if (!pastille) return;
    const fin = section.tiret
      ? finDeSection(brut, section.finTete, sections[index + 1]?.debut ?? brut.length)
      : section.finTete;
    if (section.tiret) {
      const explication = brut.slice(section.finTete, fin).trim();
      if (explication && !pastille.description) pastille.description = explication;
    }
    retirees.push([section.debut, fin]);
  });

  for (const pastille of pastilles) {
    if (!pastille.description) pastille.description = definitionPastille(pastille);
    if (pastille.cle === 'coupRapide' && !pastille.description.includes('créature adverse est en jeu')
      && !pastille.description.includes('doit viser')) {
      pastille.description += ' Si une créature adverse est en jeu, elle doit la viser ; sinon elle peut attaquer le sorcier.';
    }
  }

  let texte = '';
  let curseur = 0;
  for (const [debut, fin] of retirees) {
    texte += `${brut.slice(curseur, debut)} `;
    curseur = fin;
  }
  texte += brut.slice(curseur);
  return { pastilles, texte: texte.replace(/\s+/gu, ' ').trim() };
}
