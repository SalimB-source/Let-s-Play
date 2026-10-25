/**
 * Voix d'arrivée des guerriers du Nord : « My axe shall speak for me ».
 * Le dialogue accompagne uniquement les quatre créatures explicitement
 * associées à cette réplique, lorsqu'elles entrent en jeu — jamais en aperçu.
 */
export const RPG_DWARF_DIALOGUE_SFX = 'dwarf_dialogue';

export const RPG_DWARF_DIALOGUE_CARD_IDS = Object.freeze([
  'guerrier-au-bouclier-rond',
  'berserk-des-trois-hivers',
  'jarl-au-marteau-de-guerre',
  'berserk-du-crepuscule',
]);

const CARTES_AVEC_DIALOGUE_DWARF = new Set(RPG_DWARF_DIALOGUE_CARD_IDS);

/** La réplique naine est réservée aux arrivées de ces quatre cartes. */
export function rpgDwarfSoundFor(cardOrId, action) {
  const cardId = typeof cardOrId === 'string'
    ? cardOrId
    : (cardOrId?.id ?? cardOrId?.carteId);
  if (action !== 'arrival' || !CARTES_AVEC_DIALOGUE_DWARF.has(cardId)) return null;
  return RPG_DWARF_DIALOGUE_SFX;
}
