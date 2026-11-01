/**
 * Le son d'un sort au lancement.
 *
 * Un sort ne joue plus le souffle de son élément. Le « ressac » d'Eau
 * (`water_wave`) tombait sur quatorze magies — dont des cartes hybrides Sable
 * qui n'ont rien d'aquatique, la Lettre de marque ou le Grand Débarquement — et
 * le vent de Braise (`flame_gust`) couvrait le sort qu'on venait de lancer :
 * deux nappes de bruit, perçues comme un son d'interface synthétique, posées
 * sur chaque magie avant même que son effet se lise.
 *
 * Ces souffles restent aux **créatures** : l'arrivée qui blesse et la capacité
 * de combat de Braise (`rpgArriveeAudio.js`, `rpgFireAudio.js`). Au lancement
 * d'un sort, il ne reste que le tonnerre de l'Éclair du marteau — il *est* le
 * sort, pas son habillage.
 *
 * `sonForce` laisse un appelant imposer un son : un renvoi en main garde son
 * froissement de carte, un contre garde `card_countered` (joué à part).
 */
import { rpgFoudreSoundFor } from './rpgFoudreAudio.js';
import { RPG_WEAPON_BREAK_SFX } from './rpgAudio.js';

/** Le son d'un sort au lancement, `null` quand le sort n'en a pas. */
export function sonSortAuLancement(carte, { sonForce = null } = {}) {
  if (sonForce) return sonForce;
  if (carte?.id === 'brise-lame') return RPG_WEAPON_BREAK_SFX;
  return rpgFoudreSoundFor(carte, 'spell');
}
