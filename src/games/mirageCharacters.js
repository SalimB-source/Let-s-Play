// Online / duel characters occupy slots 0–3 (also the duel rivals:
// 1 = L’Ombre, 2 = Sauge, 3 = Améthyste). Slot 4 is the Gyro Zeppeli shop skin.
// Slots: [coat, mane, cloth, trim, head, hat, markings] — see mirageExplorer.js.
export const LOBBY_CHARACTER_COUNT = 4;

export const CHARACTER_PALETTES = [
  [0xb0642e, 0x3b2216, 0x285e79, 0xffce68, 0xffe3b3, 0x6b3f1f, 0xf3ece0], // alezan, chapeau cuir
  [0x23222a, 0xd5dde1, 0xad3756, 0x8ce7e0, 0x34293d, 0x131117, 0x23222a], // moreau, chapeau noir
  [0xece3cf, 0x684532, 0x387649, 0xffdc87, 0x624132, 0xfaf6ec, 0xece3cf], // ivoire, chapeau blanc
  [0x5e3522, 0x16110f, 0x7951aa, 0xffa85c, 0x392947, 0xcfb58c, 0xefe5d5], // bai, chapeau sable
  // Gyro Zeppeli (boutique) : palomino, crins blonds, veste indigo, liseré or, fedora fauve.
  [0xe0a83a, 0xf2d48a, 0x2b2a6e, 0xf5d56e, 0xffd0a8, 0xc4963c, 0xf4e4c0],
];

export const CHARACTER_NAMES = [
  "Sillage · bleu / alezan",
  "L’Ombre · rouge / moreau",
  "Sauge · vert / ivoire",
  "Améthyste · violet / bai",
  "Gyro Zeppeli · steel balls",
];

// Accessoires 3D branchés sur le modèle voxel (voir mirageExplorer.js).
export const CHARACTER_ACCESSORIES = [null, null, null, null, 'gyro'];


export const CHARACTER_PRICES = {
  // price in coins; index matches position in CHARACTER_NAMES/CHARACTER_PALETTES
  0: 0, // alezan (default)
  1: 0,
  2: 0,
  3: 0,
  4: 200, // Gyro Zeppeli coûte 200 pièces
};
