/**
 * Le sprite des icônes d’effets du duel — les 25 symboles validés
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

/** Les 25 symboles, à injecter une seule fois par page. */
export const EFFETS_SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-butin" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></symbol>
  <symbol id="i-furie" viewBox="0 0 24 24"><path d="M7 4c2.6 4.4 3.2 10.6 1.2 16"/><path d="M13.2 4c2.6 4.4 3.2 10.6 1.2 16"/></symbol>
  <symbol id="i-esquive" viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M12.59 19.41A2 2 0 1 0 14 16H2"/><path d="M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2"/></symbol>
  <symbol id="i-envol" viewBox="0 0 24 24"><path d="M2 10.5c3.2.4 5.8 2.2 7.2 5.2h5.6c1.4-3 4-4.8 7.2-5.2"/><path d="M12 15.7c-.6 2-.6 3.6 0 5.3"/></symbol>
  <symbol id="i-rapidite" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></symbol>
  <symbol id="i-coup-rapide" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/></symbol>
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
  <symbol id="i-overkill" viewBox="0 0 24 24"><path d="M2.5 12h12"/><path d="M10.5 7.5 15 12l-4.5 4.5"/><path d="M18.5 3.5V9"/><path d="M18.5 15v5.5"/><path d="M15 12h6.5"/></symbol>
  <symbol id="i-defausse" viewBox="0 0 24 24"><rect x="4" y="3" width="10" height="14" rx="1.5"/><path d="M17 8v8m0 0-3-3m3 3 3-3"/><path d="M7 19h10"/></symbol>
  <symbol id="i-paquet" viewBox="0 0 24 24"><rect x="5" y="3" width="12" height="9" rx="1.5"/><path d="M8 6.5h6M8 9h4"/><path d="M19 13v6m0 0-2.5-2.5M19 19l2.5-2.5"/></symbol>
</svg>`.trim();

/**
 * Du vocabulaire de jeu à l’id de symbole. Les clés couvrent les mots-clés
 * (drapeaux de fiche) et les types d’effet (`appliquer`, `valeurEffet`) ;
 * les ids interlinéaires servent aussi aux libellés de texte de carte.
 */
export const EFFET_ICONE = {
  butin: 'i-butin',
  furie: 'i-furie',
  esquive: 'i-esquive',
  envol: 'i-envol',
  rapidite: 'i-rapidite',
  coupRapide: 'i-coup-rapide',
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
  transfert: 'i-tribut',
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
  'envol', 'infiltration', 'rapidite', 'coupRapide', 'overkill', 'furie', 'esquive',
  'tenacite', 'resonance', 'protection', 'protectionSorts', 'bouclier', 'aura', 'honneur', 'butin',
];

/** Les pastilles d’une carte, en HTML — `carte` = fiche `rpgCards.js`. */
export function pastillesCarte(carte, { size = 15, classe = 'rpg-chip' } = {}) {
  return MOTS_CLES_PASTILLES
    .filter((cle) => Boolean(carte?.[cle]))
    .map((cle) => `<span class="${classe}">${effetIcon(cle, { size })}</span>`)
    .join('');
}

/* ── La lecture structurée des pastilles et des lignes de règle ──────────────
   Les composants React (`effetIcons.jsx`) consomment ces deux fonctions pures :
   elles disent QUELLES pastilles une fiche porte, et QUELLE icône précède une
   ligne de règle — sans aucun DOM, donc testables telles quelles. */

/** Le libellé français de chaque clé d’icône. */
export const EFFET_LIBELLES = {
  butin: 'Butin',
  furie: 'Furie',
  esquive: 'Esquive',
  envol: 'Envol',
  rapidite: 'Rapidité',
  coupRapide: 'Coup rapide',
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
  const ajouter = (cle, label, valeur = null) => {
    if (pastilles.some((pastille) => pastille.cle === cle)) return;
    pastilles.push({ cle, icone: EFFET_ICONE[cle] ?? 'i-degats', label, valeur });
  };

  if (carte.envol) ajouter('envol', 'Envol');
  if (carte.infiltration || carte.arrivee?.type === 'infiltration') ajouter('infiltration', 'Infiltration');
  if (carte.rapidite) ajouter('rapidite', 'Rapidité');
  if (carte.coupRapide) ajouter('coupRapide', 'Coup rapide');
  if (carte.overkill) ajouter('overkill', 'Overkill');
  if (carte.furie) ajouter('furie', 'Furie', Number(carte.furie) || null);
  if (carte.esquive) ajouter('esquive', 'Esquive', Number(carte.esquive) || null);
  if (carte.tenacite) ajouter('tenacite', 'Tenacité');
  if (carte.resonance) {
    ajouter('resonance', carte.resonanceTribu === 'samourai' ? 'Résonance samouraï' : 'Résonance');
  }
  if (carte.protection?.contre) {
    // Libellés accentués des couleurs (« Ténèbres », pas « Tenebres »).
    const labels = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
    const contre = [carte.protection.contre].flat(Infinity).filter(Boolean)
      .map((couleur) => labels[couleur] ?? capitaliser(couleur)).join(' et ');
    ajouter('protection', `Protection ${contre}`);
  }
  if (carte.protectionSorts) {
    ajouter('protectionSorts', 'Protection contre les magies et les sorcelleries');
  }
  if (carte.aura) ajouter('aura', 'Aura');
  if (carte.banniere) ajouter('banniere', 'Bannière');
  if (carte.honneur) ajouter('honneur', 'Honneur', Number(carte.honneur) || null);
  if (carte.butin) ajouter('butin', 'Butin');
  if (carte.tribut) ajouter('tribut', 'Tribut', Number(carte.tribut) || null);
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
  }[typeEffet];
  if (pastilleEffet) ajouter(...pastilleEffet);
  if (typeEffet === 'bouclier') {
    ajouter('bouclier', 'Bouclier', Number(carte.effet?.amount ?? carte.arrivee?.amount) || null);
  }

  return pastilles;
}

/** Les motifs qui font reconnaître une ligne de règle, dans le texte français. */
const MOTIFS_LIGNE = [
  ['butin', /\bbutin\b/iu],
  ['furie', /\bfurie\b/iu],
  ['esquive', /\besquive/iu],
  ['envol', /\benvol\b/iu],
  ['rapidite', /\brapidité/iu],
  ['coupRapide', /\bcoup rapide/iu],
  ['overkill', /\boverkill\b/iu],
  ['tenacite', /\bténacité/iu],
  ['infiltration', /\binfiltration/iu],
  ['resonance', /\brésonance/iu],
  ['honneur', /\bhonneur\b/iu],
  ['tribut', /\btribut\b/iu],
  ['contresort', /\bcontre(sort|z|s)\b/iu],
  ['reanimation', /\bréanimation|fait revenir|cimetière[^.]*en jeu/iu],
  ['recyclage', /\brecycl|cimetière[^.]*en main/iu],
  ['heures', /\bheures\b|\bcompteur/iu],
  ['retour-main', /\brenvoy|retour[^.]*\bmain\b|revient en main/iu],
  ['exil', /\bexil/iu],
  ['protection', /\bprot[ée]g/iu],
  ['bouclier', /\bbouclier/iu],
  ['pioche', /\bpioch/iu],
  ['soin', /\bsoign|\bsoin\b/iu],
  ['degats', /\bd[ée]g[âa]ts|\binflige/iu],
  ['defausse', /\bd[ée]fauss/iu],
];

/**
 * L’icône qui précède une ligne de règle : le motif reconnu le plus tôt dans
 * la phrase (« Butin — … piochez » se lit Butin, pas Pioche). À défaut de motif,
 * l’effet principal de la fiche tranche ; sinon `null` — pas d’icône forcée.
 */
export function iconePourLigne(carte, ligne = '') {
  // « Magie Rapide » nomme la famille du sort, pas le mot-clé Rapidité.
  const texte = String(ligne).replace(/magie rapide/giu, ' ');
  let meilleure = null;
  for (const [cle, motif] of MOTIFS_LIGNE) {
    const correspondance = motif.exec(texte);
    if (correspondance && (meilleure === null || correspondance.index < meilleure.index)) {
      meilleure = { cle, index: correspondance.index };
    }
  }
  if (meilleure) return meilleure.cle;
  const typePrincipal = carte?.effet?.type ?? carte?.arrivee?.type ?? carte?.destruction?.type;
  if (typePrincipal && EFFET_ICONE[typePrincipal]) return typePrincipal;
  if (carte?.aura) return 'aura';
  if (carte?.banniere) return 'banniere';
  if (carte?.butin) return 'butin';
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
  coupRapide: 'Sélectionnée pour attaquer, elle peut frapper une créature adverse de votre choix : elle lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là.',
  furie: (n) => `La première fois qu’elle est blessée et survit, elle gagne +${n ?? 'X'}/+${n ?? 'X'}.`,
  esquive: (n) => `Réduit de ${n ?? 'X'} les dégâts reçus de chaque attaque ou magie (minimum 0).`,
  tenacite: 'Une fois par partie, si elle doit être détruite, elle survit avec 1 point de défense.',
  resonance: 'Tant qu’elle est en jeu, les créatures de sa famille gagnent +1/+1.',
  protection: (couleur) => `Ne peut être ni ciblée ni touchée par les cartes ${couleur ?? 'de cette couleur'}.`,
  bouclier: (n) => {
    if (n === 1) return 'Absorbe le prochain dégât reçu, quelle que soit sa provenance.';
    return n ? `Absorbe les ${n} prochains dégâts reçus, quelle que soit leur provenance.` : 'Absorbe les prochains dégâts reçus.';
  },
  aura: 'Tant qu’elle est en jeu, elle renforce d’autres créatures de son camp.',
  banniere: 'Tant qu’elle est en jeu, les créatures de sa tribu gagnent un bonus.',
  honneur: (n) => `Quand cette créature meurt, elle inflige ${n ?? 'X'} dégât${n > 1 ? 's' : ''} à une créature adverse choisie au hasard.`,
  butin: 'Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.',
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
};

/** Les libellés tels qu’ils s’impriment en tête de phrase sur les fiches. */
const LIBELLES_IMPRIMES = [
  ['coupRapide', 'Coup rapide'],
  ['envol', 'Envol'],
  ['infiltration', 'Infiltration'],
  ['rapidite', 'Rapidité'],
  ['furie', 'Furie(?: \\d+)?'],
  ['esquive', 'Esquive(?: \\d+)?'],
  ['tenacite', 'T[ée]nacité'],
  ['resonance', 'Résonance(?: samouraï)?'],
  ['honneur', 'Honneur(?: \\d+)?'],
  ['butin', 'Butin'],
  ['tribut', 'Tribut(?: \\d+)?'],
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
  const definition = EFFET_DEFINITIONS[pastille?.cle];
  if (typeof definition !== 'function') return definition ?? '';
  if (pastille.cle === 'protection') {
    const couleur = String(pastille.label ?? '').replace(/^Protection\s*/u, '');
    return definition(couleur || null);
  }
  return definition(pastille.valeur ?? null);
}

/**
 * La lecture d’une fiche pour un aperçu : ses pastilles **avec ce qu’elles
 * font** (`description`), et le texte de règle qui reste une fois les
 * sections de mots-clés passées aux pastilles.
 *
 * La `description` se lit là où la pastille se déplie — un aperçu de carte
 * (`HoverCardPreview`) — et se survole là où elle reste une puce (grille du
 * catalogue, guide, bulles du Souk) : `PastillesCarte` tranche, `effetIcons.jsx`.
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
