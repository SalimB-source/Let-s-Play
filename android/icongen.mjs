// Génère toutes les icônes Android de l'APK Let's Play
// à partir du logo officiel (public/Logo Let's Play.png).
// Usage : node gen.mjs <logo.png> <dossier_res_sortie>
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [logo, resDir] = process.argv.slice(2);
if (!logo || !resDir) { console.error('usage: node gen.mjs <logo> <resDir>'); process.exit(1); }

const meta = await sharp(logo).metadata();
console.log(`logo source : ${meta.width}x${meta.height}`);

const DPI = [
  ['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4],
];

for (const [dpi, scale] of DPI) {
  // 1) Icône héritée (API < 26) : le logo est déjà un carré plein fond noir,
  //    un simple redimensionnement suffit.
  const legacyDir = join(resDir, `mipmap-${dpi}`);
  mkdirSync(legacyDir, { recursive: true });
  await sharp(logo)
    .resize(48 * scale, 48 * scale)
    .png()
    .toFile(join(legacyDir, 'ic_launcher.png'));

  // 2) Calque « foreground » de l'icône adaptative (108dp de canvas) :
  //    le logo est réduit à 60 % pour rester dans la zone sûre du masque
  //    circulaire des lanceurs, centré sur fond noir.
  const s = Math.round(108 * scale);
  const logoSize = Math.round(s * 0.6);
  const fg = await sharp(logo).resize(logoSize, logoSize).png().toBuffer();
  await sharp({ create: { width: s, height: s, channels: 4, background: '#000000' } })
    .composite([{ input: fg, left: Math.round((s - logoSize) / 2), top: Math.round((s - logoSize) / 2) }])
    .png()
    .toFile(join(legacyDir, 'ic_launcher_foreground.png'));

  // 3) Calque « monochrome » (icônes thémées Android 13+) : silhouette blanche
  //    du mot-symbole sur fond transparent (alpha = luminance du logo).
  const gray = await sharp(logo).resize(s, s, { fit: 'contain', background: '#000000' })
    .greyscale().raw().toBuffer();
  const rgba = Buffer.alloc(s * s * 4);
  for (let i = 0; i < s * s; i++) {
    rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = gray[i];
  }
  await sharp(rgba, { raw: { width: s, height: s, channels: 4 } })
    .png()
    .toFile(join(legacyDir, 'ic_launcher_monochrome.png'));

  console.log(`mipmap-${dpi} ✓`);
}
console.log('Icônes générées.');
