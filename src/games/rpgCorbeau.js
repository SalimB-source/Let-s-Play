/**
 * Le Corbeau des neuf nuits — le set hybride Neige + Ténèbres du Sablier.
 *
 * Là où la Tour du Fjord jure ses Neuf Hivers dans la glace, et où la Nécropole
 * pèse les âmes dans l'ébène, ce set tient les deux à la fois : **la neige qui
 * tombe sur la balance**. Le Père des corbeaux, figure du Nord, s'y retourne —
 * il devient le Maître des corbeaux, moitié givre, moitié nuit. Ses cartes
 * mêlent les deux vocabulaires imprimés :
 *
 *   - la Neige : **Envol**, **Furie**, **Tenacité**, le gel et les boucliers ;
 *   - les Ténèbres : le **Tribut** (la vie qui change de camp), l'**exil**
 *     (les corbeaux emportent ce qui est trop petit pour la balance) et les
 *     morts qui déclenchent.
 *
 * Les figures du Nord ne sont jamais nommées « dieux » : la fiche nomme le
 * titre, la saveur raconte l'oiseau. Aucune carte ne frappe « nu » — les pertes
 * et gains de PV s'écrivent « perd / gagne des PV », comme dans La Balance des
 * Heures (règle de direction de `docs/rpg/05-concept-cartes.md`, §11).
 *
 * Fiche de design : `docs/rpg/22-tour-du-corbeau.md`.
 */
export const RPG_CORBEAU_SET_ID = 'corbeau-des-neuf-nuits';

const carte = (definition) => ({
  ...definition,
  // L'élément moteur (protection, sources) est la Nuit ; l'identité de la
  // carte est bien hybride : le cadre, le coût et le deck lisent `colors`.
  element: definition.element ?? 'tenebres',
  colors: definition.colors ?? ['neige', 'tenebres'],
  colorCost: definition.colorCost ?? { neige: 1, tenebres: 1 },
  set: RPG_CORBEAU_SET_ID,
  art: definition.id,
});

/** Les créatures du set — quatre corps, quatre manières de tenir la nuit. */
export const RPG_CORBEAU_CREATURES = [
  carte({
    id: 'corbeau-de-givre',
    name: 'Corbeau de givre',
    cost: 2,
    atk: 1,
    def: 2,
    rarity: 'commune',
    envol: true,
    arrivee: { type: 'gel', cible: 'creature', coutMax: 3 },
    typeLine: 'Créature — Corbeau',
    text: 'Envol — Ne peut être bloqué que par une créature avec Envol. Quand il arrive : son cri gèle une créature adverse de coût 3 ou moins — ni attaque ni blocage jusqu’à la fin de son prochain tour.',
    flavor: 'Il se pose sur l’épaule, et le bras qui le porte ne se relève plus.',
  }),
  carte({
    id: 'veilleuse-au-corbeau-noir',
    name: 'Veilleuse au corbeau noir',
    cost: 3,
    atk: 2,
    def: 3,
    rarity: 'inhabituelle',
    rapidite: true,
    tribut: 1,
    typeLine: 'Créature — Veilleuse',
    text: 'Rapidité — Peut attaquer le tour où elle arrive. Tribut 1 — Quand cette créature touche le sorcier adverse, il perd 1 PV et vous en gagnez 1.',
    flavor: 'Elle compte les morts à voix basse ; l’oiseau, lui, les compte dans le noir.',
  }),
  carte({
    id: 'berserk-du-crepuscule',
    name: 'Berserk du crépuscule',
    cost: 4,
    atk: 3,
    def: 5,
    rarity: 'rare',
    provocation: true,
    furie: 2,
    tribut: 2,
    typeLine: 'Créature — Berserk viking',
    text: 'Provocation — Quand cette créature attaque, elle doit être bloquée par au moins une créature si possible. Furie 2 — Quand il survit à des blessures, il gagne +2 ATQ. Tribut 2 — Quand il touche le sorcier adverse, il perd 2 PV et vous en gagnez 2.',
    flavor: 'Il ne cherche pas la brèche : il l’ouvre, et la nuit passe derrière lui.',
  }),
  carte({
    id: 'valkyrie-des-neuf-nuits',
    name: 'Valkyrie des neuf nuits',
    cost: 5,
    atk: 3,
    def: 4,
    rarity: 'rare',
    envol: true,
    furie: 2,
    arrivee: { type: 'exil', cible: 'creature', coutMax: 2 },
    typeLine: 'Créature — Valkyrie viking',
    text: 'Envol — Ne peut être bloquée que par une créature avec Envol. Furie 2. Quand elle arrive : ses corbeaux emportent une créature de coût 2 ou moins — elle est exilée, retirée de la partie.',
    flavor: 'Elle ne choisit plus les héros : elle choisit ceux que la balance oublie.',
  }),
];

/** Les sorts du set. */
export const RPG_CORBEAU_MAGIES = [
  carte({
    id: 'neige-noire',
    name: 'Neige noire',
    kind: 'magie',
    cost: 6,
    rarity: 'rare',
    prixPv: 3,
    typeLine: 'Sorcellerie — Neige · Ténèbres',
    cibles: ['soi'],
    // La vague brise les petites créatures du camp adverse, puis fige ce qui
    // reste : le froid prend ce que la glace n'a pas cassé. Un seul camp est
    // visé — la Neige noire ne tombe jamais sur les siens.
    effet: { type: 'destruction-coutmax', coutMax: 3, cible: 'creatures-adverses', gel: true },
    text: 'Payez 3 PV : la neige noire tombe sur la table adverse. Les créatures adverses de coût 3 ou moins sont détruites ; toutes les survivantes sont gelées — ni attaque ni blocage jusqu’à la fin de leur prochain tour.',
    flavor: 'Le givre a la couleur de l’encre, et la nuit, celle du deuil.',
  }),
];

/**
 * La figure du set : le Père des corbeaux **retourné**. Même oiseau, même
 * œil, mais la neige est entrée dans la nuit — la carte réunit les mots-clés
 * des deux identités et demande les deux couleurs.
 */
export const RPG_CORBEAU_FIGURES = [
  carte({
    id: 'maitre-des-corbeaux',
    name: 'LE MAÎTRE DES CORBEAUX',
    role: 'Celui qui voit dans la nuit',
    cost: 7,
    atk: 5,
    def: 6,
    rarity: 'mythique',
    kind: 'hero',
    envol: true,
    tenacite: true,
    tribut: 1,
    arrivee: { type: 'exil', cible: 'creature', coutMax: 4 },
    typeLine: 'Créature légendaire — Héros',
    text: 'Envol — Ne peut être bloqué que par une créature avec Envol. Tenacité — Une fois par partie, quand il meurt (sauf exilé), il revient en jeu au début de votre prochain tour avec 1 point de défense. Tribut 1 — Quand il touche le sorcier adverse, il perd 1 PV et vous en gagnez 1. Quand il arrive : ses corbeaux emportent une créature de coût 4 ou moins — elle est exilée, retirée de la partie.',
    flavor: 'Il a donné un œil pour savoir. La neige est entrée dans l’autre, et la nuit lui a rendu la vue.',
  }),
];

/** Toutes les fiches jouables du set, dans l'ordre de lecture du catalogue. */
export const RPG_CORBEAU_CARDS = [
  ...RPG_CORBEAU_CREATURES,
  ...RPG_CORBEAU_FIGURES,
  ...RPG_CORBEAU_MAGIES,
];

/** Une carte du set par son identifiant, ou null. */
export function carteDuCorbeauParId(id) {
  return RPG_CORBEAU_CARDS.find((carte) => carte.id === id) ?? null;
}
