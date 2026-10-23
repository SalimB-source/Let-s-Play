/**
 * Les visages du profil — src/games/rpgAvatars.js
 * ------------------------------------------------
 * Douze personnages emblématiques du Sablier, pris dans la bible visuelle du
 * récit (`rpgStoryCast.js`) : **un portrait canonique par figure**, jamais un
 * second fichier, jamais un visage inventé. Les cinq héros du récit d'abord —
 * Salem, Yamina, Fériel, Tarek, Boualem —, le Grand Horloger qui les envoie,
 * puis une figure par grande famille du catalogue : Tin Hinan pour les sables,
 * l'Ifrit pour la braise, le Maître des Neuf Hivers pour le Nord, le Daimyō
 * pour le Soleil rouge, la Barbe-Rousse pour les corsaires, Celle qui pèse pour
 * les Ténèbres.
 *
 * La carte de profil les propose en **avatar** : le médaillon peint celui que le
 * joueur a choisi, et retombe sur le glyphe de son emblème tant qu'il n'a pas
 * choisi. L'avatar ne remplace pas l'emblème — l'emblème est le cachet de cire
 * du menu (un glyphe de texte, rien à charger), l'avatar est le visage.
 *
 * Les peintures canoniques font de 160 à 590 Ko : douze d'un coup dans un
 * bandeau de choix, c'est plus lourd qu'un booster entier. Chaque avatar a donc
 * sa **vignette** — un carré de 176 px découpé dans la peinture **au même
 * endroit que le jeu la cadre** (`position` de la bible, reproduit à l'octave
 * près par `tools/make-profil-vignettes.mjs`). Une dizaine de kilo-octets par
 * visage : le bandeau entier pèse moins qu'une seule peinture.
 *
 * Les vignettes sont des fichiers du dépôt, comme les sprites du récit
 * (`public/sablier-story/stands/`) : l'outil les régénère quand une figure est
 * repeinte, et `scripts/rpg-profil-check.mjs` vérifie qu'elles existent toutes.
 * `AVATAR_REVISION` date la famille entière — une révision de cache se décide
 * ici, une seule fois.
 */

import { personnageHistoire } from './rpgStoryCast.js';

/** Une seule révision de cache pour toutes les vignettes du profil. */
export const AVATAR_REVISION = 'profil-visages-1';

/** Le côté de la vignette d'avatar, en pixels — un carré, pour un médaillon
 * rond de 96 px CSS net à 2×, et un bandeau de 52 px net partout. */
export const AVATAR_TAILLE = 192;

/**
 * Les douze visages, dans l'ordre du bandeau : les héros du récit d'abord, puis
 * une figure par famille. Les identifiants sont ceux de la bible du récit — un
 * avatar **est** un personnage du cast, il n'a pas sa propre clé.
 */
export const RPG_AVATAR_IDS = Object.freeze([
  'salem',
  'yamina',
  'feriel',
  'tarek',
  'boualem',
  'mahieddine',
  'reine-etals',
  'ifrit-ergs',
  'maitre-hivers',
  'samurai-daimyo',
  'corsaire-barbe-rousse',
  'necro-peseuse',
]);

/**
 * Le bandeau tel que l'écran le lit : nom, fonction et couleur viennent de la
 * bible, recopiés au chargement pour que la carte de profil n'importe pas le
 * casting entier.
 */
export const RPG_AVATARS = Object.freeze(RPG_AVATAR_IDS.map((id) => {
  const figure = personnageHistoire(id);
  return Object.freeze({
    id,
    nom: figure.nom,
    fonction: figure.fonction,
    couleur: figure.couleur,
  });
}));

/** L'avatar par son identifiant, ou `null` — un identifiant inconnu ne casse rien. */
export function avatarParId(id) {
  if (typeof id !== 'string') return null;
  return RPG_AVATARS.find((avatar) => avatar.id === id) ?? null;
}

/**
 * L'avatar d'un profil, ou `null` quand le joueur n'a pas choisi de visage. Le
 * module ne connaît pas `normaliserProfil` : il lit une chaîne, et un profil
 * abîmé rend simplement `null` — le médaillon retombe sur le glyphe.
 */
export function avatarDeProfil(profil) {
  return avatarParId(profil?.avatar);
}

/** Le personnage de la bible derrière un avatar — son portrait, son cadrage. */
export function figureDAvatar(id) {
  return avatarParId(id) ? personnageHistoire(id) : null;
}

/**
 * Le chemin relatif (dans `public/`) de la vignette d'un avatar. L'outil de
 * génération écrit exactement là ; un écran ne construit jamais ce chemin
 * lui-même.
 */
export function vignetteAvatarRelative(id) {
  return avatarParId(id) ? `profil/avatars/${id}.webp` : null;
}

/**
 * L'URL servie d'une vignette d'avatar, `baseUrl` étant celui du build
 * (`import.meta.env.BASE_URL` — `/Let-s-Play/` en ligne, `/` sur le bureau).
 */
export function vignetteAvatar(id, baseUrl = '/') {
  const relative = vignetteAvatarRelative(id);
  return relative ? `${baseUrl}${relative}?v=${AVATAR_REVISION}` : null;
}
