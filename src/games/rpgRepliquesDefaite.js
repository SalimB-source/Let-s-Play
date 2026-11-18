/** Les dernières paroles d'un avatar qui éclate, à la fin d'un duel.
 *
 * Une seule réplique courte par personnage, dite **avant** l'éclatement : le
 * texte s'affiche au-dessus (ou sous) le médaillon, le temps d'être lu, puis
 * l'avatar se brise. Les identifiants sont ceux des têtes détourées du plateau
 * (`rpgDuelAvatars.js`) — donc ceux du récit (`rpgStoryCast.js`) pour la tour,
 * et ceux des profils pour le PvP. Trois règles ont guidé l'écriture :
 *
 *  - **très court** : la réplique tient en une ou deux lignes de bulle, sinon
 *    la fin de duel s'étire et le joueur attend ;
 *  - **au présent, sans pathos** : le personnage constate, il ne se lamente
 *    pas ; la mort est déjà dans l'image, le texte n'a pas à la commenter ;
 *  - **fidèle à sa fonction** : chaque phrase reprend le métier ou le lieu du
 *    personnage (la porte, le registre, la balance, la cloche…), jamais son nom
 *    que la plaque affiche déjà.
 *
 * Un identifiant inconnu — un avatar de profil venu d'ailleurs, une figure
 * ajoutée au récit avant sa réplique — retombe sur une phrase générique : le
 * geste ne dépend donc jamais d'une table complète.
 */

/** La phrase d'un avatar sans réplique dédiée : elle marche pour les deux camps. */
export const REPLIQUE_DEFAITE_GENERIQUE = 'Le sable reprend ce qu’il m’a prêté.';

/** Répliques par identifiant d'avatar du plateau. */
export const REPLIQUES_DEFAITE = Object.freeze({
  // ── La tour : les figures du récit ──────────────────────────────────────
  salem: 'J’ai sondé plus bas que moi. Ça ne pardonne pas.',
  yamina: 'L’aiguille tourne sans moi, désormais.',
  feriel: 'Mon verre aura tenu jusqu’au dernier souffle.',
  tarek: 'J’ai porté plus lourd. Je ne suis pas allé plus loin.',
  boualem: 'Le puits me reprend. C’est dans l’ordre.',
  guetteur: 'Je l’avais vu venir. Je n’ai pas reculé.',
  scribe: 'Rayez mon nom. Proprement, s’il vous plaît.',
  puisatier: 'Un nom de plus sur le registre de passage.',
  mahieddine: 'Le Zénith sonne pour un autre que moi.',
  marchand: 'La marchandise s’arrête à cet étal.',
  amani: 'La porte se referme derrière moi.',
  'djinn-souk': 'Le tournant m’a pris. C’était le jeu.',
  'reine-etals': 'Le souk se souviendra de l’étal, pas de moi.',
  pecheur: 'La citerne rend toujours ce qu’elle prend.',
  nageuse: 'L’eau ne m’a pas suivi jusqu’ici.',
  sonneur: 'La cloche sonnera sans mes mains.',
  devoreur: 'J’ai avalé pire que toi, étranger.',
  'garde-fjord': 'Le passage tient encore. Moi, non.',
  'meute-neiges': 'La meute chasse sans sa voix.',
  'valkyrie-fjord': 'Le corbeau choisira un autre bras.',
  'maitre-hivers': 'Le serment tombe avec moi.',
  'dernier-fennec': 'L’étage était plus haut que mes pattes.',
  'ifrit-ergs': 'La braise s’éteint où elle est née.',
  'horloger-zenith': 'Le ciel corrige ses heures sans prévenir.',
  'corsaire-mousse': 'Le chenal se referme. Tant pis pour la route.',
  'corsaire-negociant': 'Un compte de moins sur la page.',
  'corsaire-rais': 'La galiote garde son cap sans moi.',
  'corsaire-barbe-rousse': 'Le Hollandais n’a pas voulu de moi.',
  'samurai-ashigaru': 'La palissade est plus loin que mes pas.',
  'samurai-ronin': 'Sans seigneur, une fin de plus, comme une autre.',
  'samurai-kenshi': 'J’ai rendu le sabre au torii.',
  'samurai-daimyo': 'Le Soleil rouge se couche sans moi.',
  'necro-ouvrier': 'Le natron m’embaumera le premier.',
  'necro-chacal': 'Le seuil garde son gardien.',
  'necro-peseuse': 'La balance penche. Je m’y range.',
  'necro-devoreuse': 'J’ai mangé des âmes plus rassises.',
});

/** La réplique d'un avatar, ou la phrase générique s'il n'en a pas. */
export function repliqueDefaite(idAvatar) {
  return REPLIQUES_DEFAITE[idAvatar] ?? REPLIQUE_DEFAITE_GENERIQUE;
}
