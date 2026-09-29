import { POWER_UPS } from './mirageRules';

const asset = (name) => `${import.meta.env.BASE_URL}icons/mirage-rush/${name}.webp`;

/**
 * Local copies of the CC0 3Dicons used by Mirage Rush.
 *
 * The game keeps a local asset instead of hotlinking 3dicons.co so a race
 * still works offline and the icon cannot disappear if the catalogue changes.
 * `source` and `license` are deliberately exposed for the credits panel and
 * for future asset audits.
 */
export const MIRAGE_POWER_ICONS = Object.freeze({
  [POWER_UPS.SHIELD]: Object.freeze({
    src: asset('shield'),
    alt: 'Icône 3D de bouclier',
    source: 'https://3dicons.co/icons/b91186-shield',
    license: 'CC0',
  }),
  [POWER_UPS.LASSO]: Object.freeze({
    src: asset('link'),
    alt: 'Icône 3D de maillons rouges pour le lasso',
    source: 'https://3dicons.co/icons/2d9fa2-link',
    license: 'CC0',
  }),
  [POWER_UPS.PISTOL]: Object.freeze({
    src: asset('target'),
    alt: 'Icône 3D de cible et flèche pour le pistolet',
    source: 'https://3dicons.co/icons/49b6f4-target',
    license: 'CC0',
  }),
});

export function miragePowerIcon(type) {
  return MIRAGE_POWER_ICONS[type] || MIRAGE_POWER_ICONS[POWER_UPS.SHIELD];
}
