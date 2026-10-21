/**
 * Routing du bruitage de feu du Sablier.
 *
 * `flame_gust` est réservé aux sorts et effets qui BLESSENT une créature ou
 * un joueur : les sorts de dégâts et la table rase, les arrivées qui
 * frappent, les capacités de combat qui blessent la créature combattue et
 * les effets de mort qui infligent des dégâts. Une Braise qui ne blesse pas
 * (renfort, jetons, pioche, retour parmi les siens…) ne met pas le feu.
 *
 * Les attaques de créatures, elles, ne brûlent pas : toutes les frappes —
 * le Samouraï comme l'Ifrit — partagent `player_attack_hit`, le même
 * échantillon joué par la page quand aucun effet ne s'ajoute au combat.
 */
import { cardById, cardColors } from './rpgCards.js';

export const RPG_FIRE_SFX = 'flame_gust';

const CREATURE_KINDS = new Set(['creature', 'hero']);

/**
 * Les sorts de Braise qui **blessent** : ceux qui infligent des dégâts ou
 * rasent la table. Une magie Braise qui ne fait que renforcer, attacher une
 * arme ou protéger ne met pas le feu — jouer le Sabre maudit ou le Serment
 * de la forge ne blesse rien.
 */
const SORTS_DE_FEU = new Set(['degats', 'destruction-totale']);

/**
 * Les seuls effets d'arrivée qui SONNENT comme le feu : ceux qui blessent
 * réellement la table. Une carte Braise dont l'arrivée crée des jetons, exile,
 * pioche ou détruit un terrain n'a pas de souffle à elle — le Daimyō du Soleil
 * rouge lève ses Samouraïs, il ne met pas le feu ; c'est `card_place` qui
 * l'annonce, comme pour toute créature posée.
 */
const ARRIVEES_DE_FEU = new Set(['degats']);

/**
 * Les capacités de combat qui blessent la créature combattue — le Sahir des
 * braises pique la créature qu'il touche. Le contact seul ne suffit pas.
 */
const COMBATS_DE_FEU = new Set(['degats-creature-combattue']);

/**
 * Les effets de mort qui blessent : le Ghul et l'Ifrit brûlent une dernière
 * fois en tombant, et le Brûlot embrase son tueur avant de sombrer.
 * L'Anqa, qui revient après quatre tours sans blesser personne, s'envole en
 * silence.
 */
const MORTS_DE_FEU = new Set(['degats', 'degats-tueur']);

function resolveCard(cardOrId) {
  return typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
}

/**
 * Le souffle du feu, seulement quand l'action blesse une créature ou un
 * joueur. `attack` ne sonne jamais ici — les frappes de créatures gardent
 * toutes `player_attack_hit`.
 */
export function rpgFireSoundFor(cardOrId, action) {
  const card = resolveCard(cardOrId);
  if (!card || !cardColors(card).includes('braise')) return null;

  switch (action) {
    case 'spell':
      return card.kind === 'magie' && SORTS_DE_FEU.has(card.effet?.type) ? RPG_FIRE_SFX : null;
    case 'arrival':
      return CREATURE_KINDS.has(card.kind) && ARRIVEES_DE_FEU.has(card.arrivee?.type) ? RPG_FIRE_SFX : null;
    case 'combat':
      return CREATURE_KINDS.has(card.kind) && COMBATS_DE_FEU.has(card.combat?.type) ? RPG_FIRE_SFX : null;
    case 'destruction':
      return CREATURE_KINDS.has(card.kind) && MORTS_DE_FEU.has(card.destruction?.type) ? RPG_FIRE_SFX : null;
    default:
      return null;
  }
}

/**
 * Le son d'un combat : le souffle uniquement si une capacité de combat qui
 * blesse (attaquante ou bloqueuse) se déclenche ; `null` sinon — la page
 * joue alors `player_attack_hit`, le coup de frappe commun à toutes les
 * créatures.
 */
export function rpgCombatSound(duel, attackerIds = [], blockersByAttacker = {}) {
  const creatures = new Map([
    ...(duel?.joueur?.creatures ?? []),
    ...(duel?.sorcier?.creatures ?? []),
  ].map((creature) => [creature.id, creature]));
  const blockers = new Set(Object.values(blockersByAttacker ?? {}).flatMap((ids) => (
    Array.isArray(ids) ? ids : []
  )));

  for (const id of attackerIds) {
    if (rpgFireSoundFor(cardById(creatures.get(id)?.carteId), 'combat')) return RPG_FIRE_SFX;
  }
  for (const id of blockers) {
    if (rpgFireSoundFor(cardById(creatures.get(id)?.carteId), 'combat')) return RPG_FIRE_SFX;
  }
  return null;
}
