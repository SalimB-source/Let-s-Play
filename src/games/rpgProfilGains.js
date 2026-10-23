/**
 * Les gains de palier — src/games/rpgProfilGains.js
 * --------------------------------------------------
 * Ce que rapporte chaque niveau franchi au Sablier, et la **piste** qui le dit :
 * un chemin de paliers à faire défiler, du niveau en cours jusqu'au prochain
 * rang, puis huit niveaux au-delà.
 *
 * ## Trois sortes de gains
 *
 * 1. **le paquet** — un booster du Souk offert, à *chaque* niveau. C'est la
 *    dette de `rpgProfil.js` (`boostersDus`) : elle existe déjà, la piste ne
 *    fait que l'écrire ;
 * 2. **le rang** — les dix rangs de Bab El (`RANGS`), à leur niveau exact. Le
 *    rang n'est pas une récompense à réclamer : il tombe avec le niveau, et la
 *    piste le montre comme un jalon ;
 * 3. **les cosmétiques** — deux familles créées ici, gagnées au niveau et
 *    **portables** ensuite : les *cadres* du médaillon et les *titres* sous le
 *    pseudo. Rien à réclamer non plus : un niveau atteint les débloque, y
 *    compris rétroactivement (une sauvegarde qui arrive au niveau 26 porte déjà
 *    tout ce qui est sous 26).
 *
 * ## Le niveau n'est pas un champ
 *
 * Comme partout dans le profil (`rpgProfil.js`, P2), le niveau se **déduit** de
 * l'XP : `progressionDuProfil(profil).niveau`. Aucune sauvegarde ne peut donc
 * mentir sur ses gains — débloquer un cosmétique ne s'écrit nulle part, ça se
 * calcule. Le profil ne garde que ce qui se *choisit* : `cadre` et `titre`, deux
 * chaînes propres validées par ce catalogue à la lecture, exactement comme
 * `avatar` et `plateau`.
 *
 * ## Ce module connaît les règles, pas le rendu
 *
 * Il ne touche ni au DOM ni aux styles : les cadres sont des noms, leur peinture
 * vit dans `rpg-profil-piste.css`. Un cadre retiré du catalogue retombe sur
 * `CADRES[0]`, un titre retiré retombe sur `null` — rien ne casse, rien ne ment.
 */

import { COURBE, RANGS, progressionDuProfil, rangDeNiveau, seuilDuNiveau } from './rpgProfil.js';

/**
 * Les cadres du médaillon — ce qui cerne le visage. `niveau: 1` pour celui du
 * départ, qui n'est jamais verrouillé. Le glyphe est celui de la tuile sur la
 * piste ; la peinture est un attribut CSS (`data-profil-cadre`).
 */
export const CADRES = Object.freeze([
  Object.freeze({
    id: 'laiton', niveau: 1, glyphe: '◯', nom: 'Laiton de Bab El',
    detail: 'Le cercle du départ, celui que la Chambre donne à qui descend.',
  }),
  Object.freeze({
    id: 'chanvre', niveau: 4, glyphe: '◍', nom: 'Corde de chanvre',
    detail: 'Deux tours de corde mate, comme les poulies du beffroi.',
  }),
  Object.freeze({
    id: 'argent', niveau: 8, glyphe: '◎', nom: 'Argent du beffroi',
    detail: 'Un cercle froid, poli par les cloches.',
  }),
  Object.freeze({
    id: 'verre', niveau: 14, glyphe: '◈', nom: 'Verre soufflé',
    detail: 'Un halo de verre vert, encore tiède de l’atelier.',
  }),
  Object.freeze({
    id: 'pourpre', niveau: 25, glyphe: '❂', nom: 'Fil de pourpre',
    detail: 'Le fil rouge de la Liste, serré autour du visage.',
  }),
  Object.freeze({
    id: 'astrolabe', niveau: 45, glyphe: '✧', nom: 'Astrolabe',
    detail: 'Un limbe gradué qui tourne lentement, comme l’horloge du ciel.',
  }),
  Object.freeze({
    id: 'eclipse', niveau: 60, glyphe: '☀', nom: 'Éclipse',
    detail: 'Le disque noir et son liseré de feu — le plafond de la courbe.',
  }),
]);

/**
 * Les titres — une ligne sous le pseudo, choisie parmi celles qu'on a gagnées.
 * Aucun ne reprend le nom d'un rang : les rangs disent ce que la Chambre fait de
 * vous, les titres disent ce qu'on en pense tout bas.
 */
export const TITRES = Object.freeze([
  Object.freeze({
    id: 'arpenteur', niveau: 2, glyphe: '❧', nom: 'l’Arpenteur',
    detail: 'Pour avoir compté les marches avant de les descendre.',
  }),
  Object.freeze({
    id: 'main-sure', niveau: 5, glyphe: '❧', nom: 'la Main sûre',
    detail: 'Aucune carte posée de travers, aucun sablier renversé.',
  }),
  Object.freeze({
    id: 'noctambule', niveau: 9, glyphe: '❧', nom: 'le Noctambule',
    detail: 'Les étages du bas se jouent après minuit.',
  }),
  Object.freeze({
    id: 'compteur', niveau: 12, glyphe: '❧', nom: 'le Compteur de sable',
    detail: 'Vous savez ce qui reste, au grain près.',
  }),
  Object.freeze({
    id: 'ombre', niveau: 18, glyphe: '❧', nom: 'l’Ombre de la Chambre',
    detail: 'On vous entend arriver sans vous voir entrer.',
  }),
  Object.freeze({
    id: 'doreur', niveau: 26, glyphe: '❧', nom: 'le Doreur',
    detail: 'Ce que vous touchez prend la couleur du laiton.',
  }),
  Object.freeze({
    id: 'voix-basse', niveau: 35, glyphe: '❧', nom: 'la Voix basse',
    detail: 'Le marché se tait quand vous parlez tout bas.',
  }),
  Object.freeze({
    id: 'marcheur', niveau: 44, glyphe: '❧', nom: 'le Marcheur d’étages',
    detail: 'Neuf étages, et jamais un seul escalier évité.',
  }),
  Object.freeze({
    id: 'heure-exacte', niveau: 55, glyphe: '❧', nom: 'l’Heure exacte',
    detail: 'Votre sablier tombe juste, à la seconde.',
  }),
]);

/**
 * La miniature du **dos de carte** peinte sur la piste : un paquet rapporte cinq
 * cartes face cachée, et c'est ce dos qu'on montre — jamais une carte précise,
 * puisque le tirage n'a pas encore eu lieu. Découpée dans `dos-de-carte.jpg`
 * (640 × 917) par `tools/make-profil-vignettes.mjs` : 130 Ko deviennent quelques
 * kilo-octets, répétés quatorze fois sur la piste.
 */
export const DOS_DE_CARTE_SOURCE = 'dos-de-carte.jpg';

/** Une révision de cache pour la famille, comme les visages et les tables. */
export const DOS_DE_CARTE_REVISION = 'piste-dos-1';

/** La largeur de la miniature : 4:5 comme une carte en jeu, 26 px nets à 2×. */
export const DOS_DE_CARTE_LARGEUR = 120;

/** Le chemin relatif (dans `public/`) de la miniature. */
export function vignetteDosRelative() {
  return 'profil/dos-de-carte.webp';
}

/** L'URL servie de la miniature, `baseUrl` étant celui du build. */
export function vignetteDosDeCarte(baseUrl = '/') {
  return `${baseUrl}${vignetteDosRelative()}?v=${DOS_DE_CARTE_REVISION}`;
}

/** Ce que vaut un gain sur la piste : une sorte, un glyphe, un nom, un détail. */
const GAIN_PAQUET = Object.freeze({
  sorte: 'paquet', glyphe: '✦', nom: 'Un paquet du Souk',
  detail: 'Offert à chaque niveau franchi — il vous attend au comptoir.',
});

/** Un cadre par identifiant, ou `null`. */
export function cadreParId(cadreId) {
  if (typeof cadreId !== 'string' || !cadreId) return null;
  return CADRES.find((cadre) => cadre.id === cadreId) ?? null;
}

/** Un titre par identifiant, ou `null`. */
export function titreParId(titreId) {
  if (typeof titreId !== 'string' || !titreId) return null;
  return TITRES.find((titre) => titre.id === titreId) ?? null;
}

/**
 * Le cadre porté : celui du profil s'il existe **et** s'il est gagné, sinon
 * celui du départ. Un cadre verrouillé par une sauvegarde retouchée ne se porte
 * pas — la lecture retombe sur le laiton, comme le médaillon retombe sur le
 * glyphe pour un visage inconnu.
 */
export function cadreDeProfil(profil) {
  const cadre = cadreParId(profil?.cadre);
  if (!cadre) return CADRES[0];
  return niveauDe(profil) >= cadre.niveau ? cadre : CADRES[0];
}

/** Le titre porté, ou `null` : aucun titre choisi, ou un titre pas encore gagné. */
export function titreDeProfil(profil) {
  const titre = titreParId(profil?.titre);
  if (!titre) return null;
  return niveauDe(profil) >= titre.niveau ? titre : null;
}

/** Le niveau d'un profil, déduit de l'XP — jamais lu dans un champ. */
function niveauDe(profil) {
  return progressionDuProfil(profil ?? null).niveau;
}

/** Un gain est-il gagné à ce niveau ? */
function gagne(gain, niveau) {
  return gain.niveau <= niveau;
}

/** Les cadres gagnés, du plus ancien au plus récent. */
export function cadresGagnes(profil) {
  const niveau = niveauDe(profil);
  return CADRES.filter((cadre) => gagne(cadre, niveau));
}

/** Les titres gagnés, du plus ancien au plus récent. */
export function titresGagnes(profil) {
  const niveau = niveauDe(profil);
  return TITRES.filter((titre) => gagne(titre, niveau));
}

/**
 * Un cadre peut-il être porté maintenant ? `null` (revenir au laiton) est
 * toujours permis ; un identifiant inconnu ou un niveau trop bas, non.
 */
export function cadrePortable(profil, cadreId) {
  if (cadreId == null || cadreId === '') return true;
  const cadre = cadreParId(cadreId);
  return Boolean(cadre) && gagne(cadre, niveauDe(profil));
}

/** Un titre peut-il être porté maintenant ? Même règle que le cadre. */
export function titrePortable(profil, titreId) {
  if (titreId == null || titreId === '') return true;
  const titre = titreParId(titreId);
  return Boolean(titre) && gagne(titre, niveauDe(profil));
}

/**
 * Tout ce qu'un niveau rapporte, dans l'ordre d'importance : le rang d'abord
 * (c'est un jalon), puis le cosmétique du niveau, puis le paquet — qui tombe à
 * chaque niveau et ferme donc toujours la liste.
 */
export function gainsDuNiveau(niveau) {
  const n = Math.max(1, Math.min(COURBE.niveauMax, Math.floor(Number(niveau) || 1)));
  const gains = [];
  const rang = RANGS.find((un) => un.niveau === n);
  if (rang) {
    gains.push({
      sorte: 'rang', id: rang.id, glyphe: '◆', nom: rang.nom, detail: rang.phrase, niveau: n,
    });
  }
  const cadre = CADRES.find((un) => un.niveau === n);
  if (cadre) gains.push({ ...cadre, sorte: 'cadre' });
  const titre = TITRES.find((un) => un.niveau === n);
  if (titre) gains.push({ ...titre, sorte: 'titre' });
  gains.push({ ...GAIN_PAQUET, sorte: 'paquet', niveau: n });
  return Object.freeze(gains);
}

/**
 * La piste : du niveau en cours jusqu'au **prochain rang**, puis `apres` niveaux
 * au-delà — le rang est le jalon qui donne sa forme au chemin. Au plafond, la
 * piste montre les derniers niveaux parcourus, tous gagnés.
 *
 * Chaque palier porte son état (`gagne`, `courant`, `verrouille`), ses gains, le
 * gain principal à peindre sur la tuile, et les deux moitiés du filet qui le
 * relie à ses voisins — la moitié droite du niveau en cours se remplit au
 * pourcentage de la barre.
 */
export function pisteDesGains(profil, { apres = 8, arriere = 5 } = {}) {
  const barre = progressionDuProfil(profil ?? null);
  const niveau = barre.niveau;
  const { rang, prochain } = rangDeNiveau(niveau);
  const suite = Math.max(0, Math.floor(Number(apres) ?? 0));
  const derriere = Math.max(1, Math.floor(Number(arriere) ?? 1));
  const maximal = barre.maximal;

  const fin = maximal
    ? COURBE.niveauMax
    : Math.min(COURBE.niveauMax, (prochain ? prochain.niveau : niveau + suite) + suite);
  const debut = maximal
    ? Math.max(1, COURBE.niveauMax - derriere + 1)
    : niveau;

  const paliers = [];
  for (let n = debut; n <= fin; n += 1) {
    const gains = gainsDuNiveau(n);
    const principal = gains[0];
    // Au plafond, plus rien n'est « en cours » : le dernier palier est gagné,
    // comme tous ceux qui le précèdent.
    const etat = maximal || n < niveau ? 'gagne' : n === niveau ? 'courant' : 'verrouille';
    paliers.push(Object.freeze({
      niveau: n,
      seuil: seuilDuNiveau(n),
      etat,
      gains,
      principal,
      estRang: gains.some((un) => un.sorte === 'rang'),
      estJalon: Boolean(prochain) && n === prochain.niveau,
      cosmetiques: gains.filter((un) => un.sorte === 'cadre' || un.sorte === 'titre'),
      filet: Object.freeze({
        // La moitié gauche dit d'où l'on vient : pleine dès qu'on est arrivé là,
        // vide avant le premier palier montré — pas de tronçon qui ne mène nulle
        // part.
        gauche: n === debut ? 0 : (n <= niveau ? 100 : 0),
        // La moitié droite dit où l'on va : le niveau en cours se remplit en
        // route, les autres attendent leur tour.
        droite: n < niveau || (maximal && n <= COURBE.niveauMax - 1)
          ? 100
          : n === niveau && !maximal
            ? barre.percent
            : 0,
      }),
    }));
  }

  return Object.freeze({
    niveau,
    percent: barre.percent,
    maximal,
    into: barre.into,
    need: barre.need,
    reste: barre.reste,
    rang,
    prochainRang: prochain,
    debut,
    fin,
    paliers: Object.freeze(paliers),
  });
}
