// Online / duel characters occupy the original four free slots; Cloud (slot 5)
// is temporarily available to everyone and Link & Épona (slot 6) are offered
// for three days (see LINK_EPONA_FREE_UNTIL in mirageProgression.js).
// Gyro (slot 4) remains shop-only.
// Slots: [coat, mane, cloth, trim, head, hat, markings] — see mirageExplorer.js.
export const GYRO_ZEPPELI_INDEX = 4;
export const CLOUD_CHOCOBO_INDEX = 5;
export const LINK_EPONA_INDEX = 6;
export const LOBBY_CHARACTER_INDICES = Object.freeze([0, 1, 2, 3, CLOUD_CHOCOBO_INDEX, LINK_EPONA_INDEX]);
export const LOBBY_CHARACTER_COUNT = LOBBY_CHARACTER_INDICES.length;

export const CHARACTER_PALETTES = [
  [0xb0642e, 0x3b2216, 0x285e79, 0xffce68, 0xffe3b3, 0x6b3f1f, 0xf3ece0], // alezan, chapeau cuir
  [0x23222a, 0xd5dde1, 0xad3756, 0x8ce7e0, 0x34293d, 0x131117, 0x23222a], // moreau, chapeau noir
  [0xece3cf, 0x684532, 0x387649, 0xffdc87, 0x624132, 0xfaf6ec, 0xece3cf], // ivoire, chapeau blanc
  [0x5e3522, 0x16110f, 0x7951aa, 0xffa85c, 0x392947, 0xcfb58c, 0xefe5d5], // bai, chapeau sable
  // Gyro Zeppeli (boutique) : palomino, crins blonds, veste indigo, liseré or, fedora fauve.
  [0xe0a83a, 0xf2d48a, 0x2b2a6e, 0xf5d56e, 0xffd0a8, 0xc4963c, 0xf4e4c0],
  // Cloud et son chocobo : monture dorée, tenue bleue, métal clair et cheveux blonds.
  [0xffd43b, 0xe99a2d, 0x244f9b, 0xc8d8ea, 0xf0c6a4, 0xffe27a, 0xffef9b],
  // Link & Épona : jument baie (robe gérée par la monture dédiée), tunique et
  // casquette vertes, bottes cuir, balzanes et liste crème.
  [0x8a4a23, 0x6b4324, 0x3d8f3f, 0xd9a84e, 0xf6d2a8, 0x2f8f3a, 0xfaf3e4],
];

export const CHARACTER_NAMES = [
  "Sillage · bleu / alezan",
  "L’Ombre · rouge / moreau",
  "Sauge · vert / ivoire",
  "Améthyste · violet / bai",
  "Gyro Zeppeli · steel balls",
  "Cloud · chocobo doré",
  "Link · Épona & épée de légende",
];

// Accessoires et montures 3D branchés sur le modèle voxel (voir mirageExplorer.js).
export const CHARACTER_ACCESSORIES = [null, null, null, null, 'gyro', 'cloud-chocobo', 'link-epona'];

export const CHARACTER_PRICES = {
  // price in coins; index matches position in CHARACTER_NAMES/CHARACTER_PALETTES
  0: 0, // alezan (default)
  1: 0,
  2: 0,
  3: 0,
  4: 200, // Gyro Zeppeli coûte 200 pièces
  5: 280, // Prix habituel de Cloud, conservé pour une réactivation future de l’achat
  6: 320, // Prix habituel de Link & Épona, conservé pendant l’essai gratuit de 3 jours
};
