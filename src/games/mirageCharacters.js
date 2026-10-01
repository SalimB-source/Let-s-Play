// Online characters (also the duel rivals: 1 = L’Ombre, 2 = Sauge, 3 = Améthyste).
// Slots: [coat, mane, cloth, trim, head, hat, markings] — see mirageExplorer.js.
export const CHARACTER_PALETTES = [
  [0xb0642e, 0x3b2216, 0x285e79, 0xffce68, 0xffe3b3, 0x6b3f1f, 0xf3ece0], // alezan, chapeau cuir
  [0x23222a, 0xd5dde1, 0xad3756, 0x8ce7e0, 0x34293d, 0x131117, 0x23222a], // moreau, chapeau noir
  [0xece3cf, 0x684532, 0x387649, 0xffdc87, 0x624132, 0xfaf6ec, 0xece3cf], // ivoire, chapeau blanc
  [0x5e3522, 0x16110f, 0x7951aa, 0xffa85c, 0x392947, 0xcfb58c, 0xefe5d5], // bai, chapeau sable
  [0xffd700, 0x8b4513, 0xffffff, 0xff0000, 0xffdab3, 0x000000, 0xffd700], // Gyro Zeppeli : manteau or, crins marron, toile blanche, ruban rouge, peau pechaud, chapeau fedora noir, marquages or
];

export const CHARACTER_NAMES = [
  "Sillage · bleu / alezan",
  "L’Ombre · rouge / moreau",
  "Sauge · vert / ivoire",
  "Améthyste · violet / bai",
  "Gyro Zeppeli · or et violet",
];


export const CHARACTER_PRICES = {
  // price in coins; index matches position in CHARACTER_NAMES/CHARACTER_PALETTES
  0: 0, // alezan (default)
  1: 0,
  2: 0,
  3: 0,
  4: 200, // Gyro Zeppeli coûte 200 pièces
};
