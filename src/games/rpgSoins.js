/**
 * Les soins du Sablier, côté table.
 * ---------------------------------
 * Le moteur note chaque gain de vie réel dans un journal hors de l'état
 * sauvegardé (`rpgConsommerSoins`, voir rpgDuel.js) :
 * `{ cote, entityId, montant }`, `entityId` nul quand c'est le sorcier
 * lui-même qui regagne des PV. Après chaque rendu, la page relève ce journal ;
 * ce module en fait ce que la table montre et fait entendre :
 *   - un lot d'événements regroupé par cible — deux Tributs portés dans le
 *     même combat donnent un seul « +2 » sur la plaque ;
 *   - le bruitage du lot : un arpège clair qui monte pour votre camp, son
 *     double plus grave et plus sombre quand c'est l'adversaire qui se soigne ;
 *   - la phrase lue par les lecteurs d'écran.
 */

/** Durée de l'éclat de soin (plaque ou créature), minuterie de nettoyage comprise. */
export const RPG_SOIN_DUREE = 1700;
/** Bruitages du catalogue `rpgSfx` (rpgAudio.js). */
export const RPG_SOIN_SFX = 'soin_vie';
export const RPG_SOIN_ADVERSE_SFX = 'soin_vie_adverse';

const CAMPS = new Set(['joueur', 'sorcier']);

/** La clé d'affichage d'un soin : l'entité soignée, ou le camp pour son sorcier. */
export function cleSoin(soin) {
  if (!soin || !CAMPS.has(soin.cote)) return null;
  return soin.entityId ?? soin.cote;
}

/**
 * Regroupe un lot de soins par cible, dans l'ordre de leur premier gain.
 * Les montants nuls, négatifs ou illisibles sont ignorés : seul un vrai gain
 * de vie s'anime.
 */
export function regrouperSoins(soins = []) {
  const parCle = new Map();
  for (const soin of Array.isArray(soins) ? soins : []) {
    const cle = cleSoin(soin);
    const montant = Number(soin?.montant) || 0;
    if (!cle || !(montant > 0)) continue;
    const courant = parCle.get(cle);
    if (courant) courant.montant += montant;
    else parCle.set(cle, { cle, cote: soin.cote, entityId: soin.entityId ?? null, montant });
  }
  return [...parCle.values()];
}

/**
 * Le bruitage d'un lot de soins : un seul par lot, celui de votre camp quand
 * les deux camps regagnent des PV en même temps. `null` sans gain réel.
 */
export function sonDuSoin(soins = []) {
  const cibles = regrouperSoins(soins);
  if (!cibles.length) return null;
  return cibles.some((soin) => soin.cote === 'joueur') ? RPG_SOIN_SFX : RPG_SOIN_ADVERSE_SFX;
}

/**
 * La phrase annoncée aux lecteurs d'écran pour les soins visibles
 * (`{ [cle]: { montant } }`). `nomCreature(cle)` rend le nom d'une créature
 * encore sur la table, ou rien si elle n'y est plus.
 */
export function annonceSoins(soinsVisibles = {}, { nomAdversaire = 'Le sorcier', nomCreature = () => null } = {}) {
  return Object.entries(soinsVisibles ?? {})
    .map(([cle, soin]) => {
      const montant = Number(soin?.montant) || 0;
      if (!(montant > 0)) return null;
      if (cle === 'joueur') return `Vous regagnez ${montant} PV`;
      if (cle === 'sorcier') return `${nomAdversaire} regagne ${montant} PV`;
      const nom = nomCreature(cle);
      return nom ? `${nom} regagne ${montant} PV` : null;
    })
    .filter(Boolean)
    .join(' · ');
}
