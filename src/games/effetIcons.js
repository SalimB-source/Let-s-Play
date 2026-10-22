/**
 * Le sprite des icônes d’effets du duel — les 26 symboles validés
 * (`preview-effets-icone.html`), monochromes, tracé 24×24, `stroke: currentColor`.
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

/** Les 26 symboles, à injecter une seule fois par page. */
export const EFFETS_SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-butin" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></symbol>
  <symbol id="i-furie" viewBox="0 0 24 24"><path d="M7.1 11.3C5.3 10.3 3.8 8.2 3.1 5.4c1.6 1.9 3.1 3.2 4.8 4"/><path d="M16.9 11.3c1.8-1 3.3-3.1 4-5.9C19.3 7.3 17.8 8.6 16.1 9.4"/><path d="M6.7 15.2v-2.7c0-3 2.4-5.4 5.3-5.4s5.3 2.4 5.3 5.4v2.7"/><path d="M5.4 15.2h13.2"/><path d="M12 7.1v8.1"/><path d="M10.9 15.2h2.2l-.4 4.2h-1.4z"/><path d="M7 15.2v3M17 15.2v3"/></symbol>
  <symbol id="i-esquive" viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M12.59 19.41A2 2 0 1 0 14 16H2"/><path d="M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2"/></symbol>
  <symbol id="i-envol" viewBox="0 0 24 24"><path d="M2 10.5c3.2.4 5.8 2.2 7.2 5.2h5.6c1.4-3 4-4.8 7.2-5.2"/><path d="M12 15.7c-.6 2-.6 3.6 0 5.3"/></symbol>
  <symbol id="i-rapidite" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></symbol>
  <symbol id="i-coup-rapide" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/></symbol>
  <symbol id="i-provocation" viewBox="0 0 24 24"><path d="M3 10v4l3 .4V9.6z"/><path d="M6 9.6 18 4v16L6 14.4"/><path d="M8.2 14.7v4.3h3v-5"/><path d="M20 9a4.2 4.2 0 0 1 0 6"/></symbol>
  <symbol id="i-tenacite" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><path d="M12 22V7.5"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></symbol>
  <symbol id="i-infiltration" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/></symbol>
  <symbol id="i-protection" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
  <symbol id="i-bouclier" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8.5v5M9.5 11h5"/></symbol>
  <symbol id="i-aura" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/></symbol>
  <symbol id="i-resonance" viewBox="0 0 24 24"><path d="M8 3v9a4 4 0 0 0 8 0V3"/><path d="M12 16v5"/><path d="M5 7a6 6 0 0 0 0 8"/><path d="M19 7a6 6 0 0 1 0 8"/></symbol>
  <symbol id="i-honneur" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M8.2 13.9 7 23l5-3 5 3-1.2-9.12"/></symbol>
  <symbol id="i-pioche" viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"/></symbol>
  <symbol id="i-soin" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></symbol>
  <symbol id="i-degats" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></symbol>
  <symbol id="i-contresort" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></symbol>
  <symbol id="i-rebond" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></symbol>
  <symbol id="i-recyclage" viewBox="0 0 24 24"><path d="M21 4v6h-6"/><path d="M3 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L21 8"/><path d="M21 15a9 9 0 0 1-14.9 3.4L3 16"/></symbol>
  <symbol id="i-reanimation" viewBox="0 0 24 24"><path d="M12 20V4"/><path d="M6 10l6-6 6 6"/><path d="M4 22h16"/></symbol>
  <symbol id="i-heures" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></symbol>
  <symbol id="i-tribut" viewBox="0 0 24 24"><path d="M4 8h16M12 8v11M8 21h8"/><path d="M4 8 1.5 13.5h5L4 8zm16 0-2.5 5.5h5L20 8z"/><path d="M12 5.4c0 0-2-1.4-2-2.7A1.1 1.1 0 0 1 12 2a1.1 1.1 0 0 1 2 .7c0 1.3-2 2.7-2 2.7z"/></symbol>
  <symbol id="i-transfert" viewBox="0 0 24 24"><path d="M3.5 8.5h13.5"/><path d="M13.5 5.5 17 8.5l-3.5 3"/><path d="M20.5 15.5H7"/><path d="M10.5 12.5 7 15.5l3.5 3"/></symbol>
  <symbol id="i-overkill" viewBox="0 0 24 24"><path d="M2.5 12h12"/><path d="M10.5 7.5 15 12l-4.5 4.5"/><path d="M18.5 3.5V9"/><path d="M18.5 15v5.5"/><path d="M15 12h6.5"/></symbol>
  <symbol id="i-defausse" viewBox="0 0 24 24"><rect x="4" y="3" width="10" height="14" rx="1.5"/><path d="M17 8v8m0 0-3-3m3 3 3-3"/><path d="M7 19h10"/></symbol>
  <symbol id="i-paquet" viewBox="0 0 24 24"><rect x="5" y="3" width="12" height="9" rx="1.5"/><path d="M8 6.5h6M8 9h4"/><path d="M19 13v6m0 0-2.5-2.5M19 19l2.5-2.5"/></symbol>
  <symbol id="i-visages" viewBox="0 0 24 24"><path d="M11 3.5C8 3.5 5.8 5.6 5.8 8.2c0 2 1.4 3.3 1.4 3.3s-1.7 1.6-1.7 4.3c0 2.6 2.4 4.7 5.5 4.7"/><path d="M13 3.5c3 0 5.2 2.1 5.2 4.7 0 2-1.4 3.3-1.4 3.3s1.7 1.6 1.7 4.3c0 2.6-2.4 4.7-5.5 4.7"/><path d="M8.2 8.2h1.6M14.2 8.2h1.6"/></symbol>
  <symbol id="i-abordage" viewBox="0 0 24 24"><circle cx="12" cy="9.6" r="6.5"/><path d="M9.4 15.9v2.4c0 .9.7 1.6 1.6 1.6h2c.9 0 1.6-.7 1.6-1.6v-2.4"/><circle cx="9.5" cy="9.4" r="1.5"/><circle cx="14.5" cy="9.4" r="1.5"/><path d="M3.1 20.9 8.6 15.4"/><path d="M2.29 20.09 3.91 21.71"/><path d="M7.79 14.59 9.41 16.21"/><path d="M15.4 15.4 20.9 20.9"/><path d="M16.21 14.59 14.59 16.21"/><path d="M21.71 20.09 20.09 21.71"/><path d="M3.1 3.1 8.6 8.6"/><path d="M3.91 2.29 2.29 3.91"/><path d="M9.41 7.79 7.79 9.41"/><path d="M15.4 8.6 20.9 3.1"/><path d="M14.59 7.79 16.21 9.41"/><path d="M20.09 2.29 21.71 3.91"/></symbol>
  <symbol id="i-cargaison" viewBox="0 0 24 24"><path d="M6.5 9V7.5a5.5 5.5 0 0 1 11 0V9"/><rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M9 9v11M15 9v11"/><path d="M12 13v3"/></symbol>
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
  const contre = carte?.protection?.contre ?? carte?.donne?.protection?.contre;
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
  butin: 'i-butin',
  abordage: 'i-abordage',
  visages: 'i-visages',
  cargaison: 'i-cargaison',
  prise: 'i-abordage',
  cale: 'i-cargaison',
  furie: 'i-furie',
  esquive: 'i-esquive',
  envol: 'i-envol',
  rapidite: 'i-rapidite',
  coupRapide: 'i-coup-rapide',
  traque: 'i-coup-rapide',
  traquePirates: 'i-coup-rapide',
  provocation: 'i-provocation',
  tenacite: 'i-tenacite',
  infiltration: 'i-infiltration',
  protection: 'i-protection',
  protectionSorts: 'i-protection',
  overkill: 'i-overkill',
  bouclier: 'i-bouclier',
  'bouclier-lumiere': 'i-bouclier',
  aura: 'i-aura',
  resonance: 'i-resonance',
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
  heures: 'i-heures',
  debuff: 'i-degats',
  'empeche-blocage': 'i-esquive',
  'empeche-attaque': 'i-esquive',
  buff: 'i-aura',
  banniere: 'i-aura',
  jetons: 'i-aura',
  exil: 'i-rebond',
  'destruction-totale': 'i-degats',
  'retour-apres-tours': 'i-rebond',
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
 * (type de combat d’abord, puis les protections et l’honneur).
 */
export const MOTS_CLES_PASTILLES = [
  'envol', 'infiltration', 'rapidite', 'coupRapide', 'traquePirates', 'provocation', 'overkill', 'furie', 'esquive',
  'tenacite', 'resonance', 'protection', 'protectionSorts', 'bouclier', 'aura', 'honneur', 'butin',
  'abordage', 'visages', 'cargaison',
];

/** Les pastilles d’une carte, en HTML — `carte` = fiche `rpgCards.js`. */
export function pastillesCarte(carte, { size = 15, classe = 'rpg-chip' } = {}) {
  return MOTS_CLES_PASTILLES
    .filter((cle) => Boolean(carte?.[cle]))
    .flatMap((cle) => {
      if (cle !== 'protection') return [`<span class="${classe}">${effetIcon(cle, { size })}</span>`];
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
  butin: 'Butin',
  abordage: 'Abordage',
  visages: 'Deux Visages',
  cargaison: 'Cargaison',
  prise: 'Prise',
  cale: 'Cale',
  furie: 'Furie',
  furie: 'Furie',
  esquive: 'Esquive',
  envol: 'Envol',
  rapidite: 'Rapidité',
  coupRapide: 'Coup rapide',
  traque: 'Traque',
  traquePirates: 'Traque',
  provocation: 'Provocation',
  tenacite: 'Tenacité',
  infiltration: 'Infiltration',
  protection: 'Protection',
  protectionSorts: 'Protection anti-magie',
  overkill: 'Overkill',
  bouclier: 'Bouclier',
  aura: 'Aura',
  banniere: 'Bannière',
  resonance: 'Résonance',
  honneur: 'Honneur',
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
  'destruction-totale': 'Destruction totale',
};

const capitaliser = (mot = '') => (mot ? mot.charAt(0).toUpperCase() + mot.slice(1) : mot);

/**
 * Les pastilles d’une fiche, structurées : `[{ cle, icone, label, valeur }]`.
 * Les mots-clés passifs d’abord (l’ordre de lecture validé sur la preview :
 * combat, protections, honneur, butin), puis — pour les sorts et les arrivées
 * signées — la pastille de l’effet principal (Contresort, Réanimation…).
 */
export function pastillesPourCarte(carte) {
  if (!carte) return [];
  const pastilles = [];
  const ajouter = (cle, label, valeur = null, details = {}) => {
    if (pastilles.some((pastille) => pastille.cle === cle)) return;
    pastilles.push({ cle, icone: EFFET_ICONE[cle] ?? 'i-degats', label, valeur, ...details });
  };

  if (carte.envol) ajouter('envol', 'Envol');
  if (carte.infiltration || carte.arrivee?.type === 'infiltration') ajouter('infiltration', 'Infiltration');
  if (carte.rapidite) ajouter('rapidite', 'Rapidité');
  if (carte.coupRapide) ajouter('coupRapide', 'Coup rapide');
  if (carte.traquePirates) ajouter('traque', 'Traque', Number(carte.traquePirates) || null);
  if (carte.provocation) ajouter('provocation', 'Provocation');
  // L'Overkill peut être imprimé, prêté par une arme, ou accordé par un sort
  // (le Mur de boucliers) : la pastille suit l'effet, pas seulement la fiche.
  if (carte.overkill || carte.effet?.overkill || carte.arrivee?.overkill || carte.donne?.overkill) {
    ajouter('overkill', 'Overkill');
  }
  if (carte.furie) ajouter('furie', 'Furie', Number(carte.furie) || null);
  if (carte.esquive) ajouter('esquive', 'Esquive', null);
  if (carte.tenacite) ajouter('tenacite', 'Tenacité');
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
    ajouter('protection', `Protection ${contre}`, null, { contres });
  }
  if (carte.protectionSorts) {
    ajouter('protectionSorts', 'Protection contre les magies et les sorcelleries');
  }
  if (carte.aura) ajouter('aura', 'Aura');
  if (carte.banniere) ajouter('banniere', 'Bannière');
  if (carte.honneur) ajouter('honneur', 'Honneur', Number(carte.honneur) || null);
  if (carte.butin) ajouter('butin', 'Butin');
  if (carte.tribut) ajouter('tribut', 'Tribut', Number(carte.tribut) || null);
  // Les Lettres de Marque : l'Abordage imprimé (créature au seuil « coût − 1 »,
  // Grappin à l'attachement — la pastille porte le seuil), la Cargaison du
  // convoi, et le déclencheur de prise du Négociant.
  if (carte.abordage) ajouter('abordage', 'Abordage', Number.isFinite(carte.abordage) ? carte.abordage : null);
  // Le Grappin dynamique : son seuil se lit sur le porteur, pas sur la fiche —
  // la pastille nomme le mot-clé sans chiffre.
  if (carte.abordageDynamique) ajouter('abordage', 'Abordage');
  // Les Deux Visages (La Barbe Noire) : le mot-clé du dédoublement.
  if (carte.alternance) ajouter('visages', 'Deux Visages');
  if (carte.cargaison) ajouter('cargaison', 'Cargaison', Number(carte.cargaison) || null);
  if (carte.declenchePrise) ajouter('prise', 'Prise', Number(carte.declenchePrise) || null);
  // Une arme peut accorder un bouclier à son porteur (la Hache de la
  // banquise) : la pastille se lit sur la fiche de l'arme comme sur celle
  // d'une créature qui arrive avec un bouclier.
  if (carte.donne?.bouclier) ajouter('bouclier', 'Bouclier', Number(carte.donne.bouclier) || null);
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
    'destruction-totale': ['destruction-totale', 'Destruction totale'],
    'empeche-blocage': ['empeche-blocage', 'Blocage interdit'],
    transfert: ['transfert', 'Transfert'],
    'defausse-adverse': ['defausse-adverse', 'Défausse adverse'],
    defaussePaquet: ['defaussePaquet', 'Défausse de paquet'],
    // Les sceaux qui arment les arrivées (Lettre de marque, Pilote) se
    // lisent « Abordage » sur la face : c’est ce que gagne la créature
    // suivante, même si le seuil n’existe qu’à sa pose.
    'arrivees-abordage': ['abordage', 'Abordage'],
    'prochaine-arrivee-abordage': ['abordage', 'Abordage'],
  }[typeEffet];
  if (pastilleEffet) ajouter(...pastilleEffet);
  if (typeEffet === 'bouclier') {
    ajouter('bouclier', 'Bouclier', Number(carte.effet?.amount ?? carte.arrivee?.amount) || null);
  }

  // La modification de statistiques, écrite en clair : « Lame de mer » porte
  // « Affaiblissement -2/-2 », l'Embuscade autant, le Colosse « Renfort
  // +1/+1 ». Sans elle, le chiffre ne se lisait que dans la règle imprimée —
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
 * Les effets imprimés qu'une créature posée a déjà dépensés : sa Tenacité
 * quand elle l'a sauvée une fois, son Bouclier quand il a absorbé son dernier
 * point (ou que son bouclier de lumière a été touché). L'aperçu grise alors
 * la pastille, son explication et les lignes de règle de cet effet. Une carte
 * en main ou au catalogue n'a pas d'entité : rien n'y est jamais épuisé. Un
 * nouveau bouclier réarme l'état — tant qu'il tient, rien n'est grisé.
 */
export function effetsEpuisesPourEntite(carte, entite) {
  if (!carte || !entite) return [];
  const epuises = [];
  if (carte.tenacite && entite.tenaciteDisponible === false) epuises.push('tenacite');
  const bouclierImprime = [carte.arrivee?.type, carte.effet?.type]
    .some((type) => type === 'bouclier' || type === 'bouclier-lumiere')
    || Boolean(carte.donne?.bouclier);
  const bouclierActif = Number(entite.bouclier) > 0 || Boolean(entite.bouclierLumiere);
  // Les entités du moteur portent `bouclierEpuise` ; les fixtures anciennes
  // qui ne le portent pas retombent sur la simple absence de bouclier.
  const bouclierTombe = entite.bouclierEpuise === true || entite.bouclierEpuise === undefined;
  if (bouclierImprime && !bouclierActif && bouclierTombe) epuises.push('bouclier');
  return epuises;
}

/** Les motifs qui font reconnaître une ligne de règle, dans le texte français. */
const MOTIFS_LIGNE = [
  ['traque', /\btraque\b/iu],
  ['butin', /\bbutin\b/iu],
  ['abordage', /\babordage\b/iu],
  ['visages', /\bdeux visages\b/iu],
  ['cargaison', /\bcargaison\b/iu],
  ['prise', /\bprises? en cale\b/iu],
  ['cale', /\bcale\b/iu],
  ['furie', /\bfurie\b/iu],
  ['esquive', /\besquive/iu],
  ['envol', /\benvol\b/iu],
  ['rapidite', /\brapidité/iu],
  ['coupRapide', /\bcoup rapide/iu],
  ['provocation', /\bprovocation\b/iu],
  ['overkill', /\boverkill\b/iu],
  ['tenacite', /\bténacité/iu],
  ['infiltration', /\binfiltration/iu],
  ['resonance', /\brésonance/iu],
  ['honneur', /\bhonneur\b/iu],
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
  ['jetons', /\bcré(?:e|ez|éent|er)\b[^.]*\b(?:créatures?-jetons?|jetons?|chiens? de sable)\b|\bcréatures?-jetons?\b/iu],
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
  }
  if (carte?.butin && /touche le sorcier/iu.test(phrase)) return 'butin';
  return null;
}

/* ── Ce que fait chaque effet : l’explication de la pastille ──────────────────
   Dans un aperçu de carte la pastille se **déplie** : son détail s’écrit sous le
   mot, parce que le volet ne se survole pas. Ailleurs (grille du catalogue,
   guide), elle reste une puce et son détail s’ouvre au survol (ou au toucher).
   Le texte imprimé de la carte prime toujours : quand
   la fiche écrit « Coup rapide — … », c’est cette phrase qui remplit la bulle.
   Le glossaire ci-dessous ne sert que lorsque la carte nomme le mot-clé sans
   l’expliquer (« Rapidité. ») ou ne le nomme pas du tout (Exil, Contresort…). */

/** La définition de chaque effet, au féminin de « la créature » (ou de la carte). */
export const EFFET_DEFINITIONS = {
  envol: 'Ne peut être bloquée que par une créature avec Envol.',
  infiltration: 'Ne peut pas être bloquée.',
  rapidite: 'Peut attaquer le tour où elle arrive.',
  coupRapide: 'Sélectionnée pour attaquer, elle peut frapper une créature adverse de votre choix (30 % de chances de rater, 100 % de chances de toucher si elle attaque l’adversaire) : elle lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, elle attaque normalement.',
  traque: (n) => `Quand elle attaque une créature avec Abordage, Butin ou une cale occupée, elle gagne +${n ?? 'N'}/+0 contre elle pour ce combat.`,
  provocation: 'Quand elle attaque, elle doit être bloquée par au moins une créature si un blocage légal est possible.',
  furie: (n) => `Tant que sa défense actuelle est inférieure à sa DEF de base, elle gagne +${n ?? 'X'}/+0.`,
  overkill: 'Quand elle est bloquée, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier défenseur.',
  esquive: () => '30 % de chance d’esquiver une attaque : elle ne porte pas du tout.',
  tenacite: 'Une fois par partie, quand elle meurt (sauf exilée), elle revient en jeu au prochain tour de son propriétaire avec 1 point de défense.',
  resonance: 'Tant qu’elle est en jeu, les créatures de sa famille gagnent +1/+1.',
  protection: (couleur) => `Ne peut être ni ciblée ni touchée par les cartes ${couleur ?? 'de cette couleur'}.`,
  bouclier: (n) => {
    if (n === 1) return 'Absorbe le prochain dégât reçu, quelle que soit sa provenance.';
    return n ? `Absorbe les ${n} prochains dégâts reçus, quelle que soit leur provenance.` : 'Absorbe les prochains dégâts reçus.';
  },
  aura: 'Tant qu’elle est en jeu, elle renforce d’autres créatures de son camp.',
  banniere: 'Tant qu’elle est en jeu, les créatures de sa tribu gagnent un bonus.',
  honneur: (n) => `Quand cette créature meurt, elle inflige ${n ?? 'X'} dégât${n > 1 ? 's' : ''} à une créature adverse choisie au hasard, ou au sorcier adverse s’il n’y en a aucune.`,
  butin: 'Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.',
  abordage: (n) => `Quand cette créature arrive en jeu, la créature adverse ciblée de coût ${n ?? 'N'} ou moins est prise en sa cale — détenue face visible, une seule place — au lieu d’être détruite : elle ne déclenche rien. Son propriétaire peut la racheter en main au prix imprimé ; si le capteur meurt, elle revient en jeu avec l’attaque et la défense qu’elle avait à la prise, sans effet d’arrivée — renvoyé ou exilé, il la rend en main.`,
  visages: 'Au début de chacun des tours de son camp, cette créature change de visage : la légende frappe, l’homme tient le rempart. Ses blessures la suivent d’un visage à l’autre, et changer de visage ne la tue jamais.',
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
  'destruction-totale': 'Détruit les créatures des deux camps, sans infliger de dégâts. Les capacités de mort se déclenchent.',
  exil: 'Retire une créature de la partie : elle ne va pas au cimetière.',
  'empeche-blocage': 'La créature visée ne peut pas bloquer pendant la durée indiquée.',
  debuff: (valeur) => `La créature visée encaisse un malus de ${valeur ?? '-X/-X'} : son attaque frappe moins fort et sa réserve de vie fond. Si sa défense tombe à 0, elle est détruite.`,
  buff: (valeur) => `La cible gagne un bonus de ${valeur ?? '+X/+X'} en attaque et en défense.`,
};

/** Les libellés tels qu’ils s’impriment en tête de phrase sur les fiches. */
const LIBELLES_IMPRIMES = [
  ['coupRapide', 'Coup rapide'],
  ['traque', 'Traque'],
  ['provocation', 'Provocation'],
  ['overkill', 'Overkill'],
  ['envol', 'Envol'],
  ['infiltration', 'Infiltration'],
  ['rapidite', 'Rapidité'],
  ['furie', 'Furie(?: \\d+)?'],
  ['esquive', 'Esquive'],
  ['tenacite', 'T[ée]nacité'],
  ['resonance', 'Résonance(?: samouraï|viking)?'],
  ['honneur', 'Honneur(?: \\d+)?'],
  ['butin', 'Butin'],
  ['tribut', 'Tribut(?: \\d+)?'],
  ['abordage', 'Abordage'],
  ['cargaison', 'Cargaison(?: \\d+)?'],
  ['banniere', 'Bannière'],
  ['aura', 'Aura'],
  ['retour-main', 'Rebond'],
];

/**
 * Un mot-clé imprimé **en tête de phrase**, suivi soit d’un point
 * (« Rapidité. »), soit d’un tiret qui ouvre son explication
 * (« Coup rapide — … »). Le mot-clé cité au milieu d’une phrase (« sa Furie 3
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
    const couleur = String(pastille.label ?? '').replace(/^Protection\s*/u, '');
    return definition(couleur || null);
  }
  return definition(pastille.valeur ?? null);
}

/**
 * La lecture d’une fiche pour ses pastilles : chacune **avec ce qu’elle fait**
 * (`description`), et le texte de règle qui reste une fois les sections de
 * mots-clés passées aux pastilles.
 *
 * La `description` s’ouvre au survol de la puce (grille du catalogue, guide,
 * bulles du Souk) — elle n’est jamais écrite sous le mot : un aperçu de carte
 * montre la pastille fermée, puis la règle entière de la carte dans son bloc
 * « Effets » (`HoverCardPreview`, `effetIcons.jsx`).
 *
 * - « Coup rapide — Sélectionnée pour attaquer… » : la section court jusqu’à
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
