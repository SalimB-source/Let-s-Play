import { POWER_UPS } from './mirageRules.js';

const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
  ? import.meta.env.BASE_URL
  : '/';
const asset = (name) => `${baseUrl}icons/mirage-rush/${name}.svg`;

/** Icônes vectorielles des quatre objets spéciaux de Mirage Rush. */
export const MIRAGE_POWER_ICONS = Object.freeze({
  [POWER_UPS.SHIELD]: Object.freeze({
    id: POWER_UPS.SHIELD,
    label: 'Bouclier',
    gemColor: 'blue',
    accent: '#4ce9df',
    src: asset('shield'),
    alt: 'Icône de Bouclier astral serti d’un diamant bleu',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
  [POWER_UPS.LASSO]: Object.freeze({
    id: POWER_UPS.LASSO,
    label: 'Lasso',
    gemColor: 'yellow',
    accent: '#ffd15c',
    src: asset('lasso'),
    alt: 'Icône de Lasso western tressé et diamant jaune',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
  [POWER_UPS.BOOST]: Object.freeze({
    id: POWER_UPS.BOOST,
    label: 'Turbo',
    gemColor: 'green',
    accent: '#52eda0',
    src: asset('boost'),
    alt: 'Icône de Turbo émeraude à éclair et fer ailé',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
  [POWER_UPS.PISTOL]: Object.freeze({
    id: POWER_UPS.PISTOL,
    label: 'Pistolet',
    gemColor: 'red',
    accent: '#ff6e66',
    src: asset('pistol'),
    alt: 'Icône de Revolver six-coups western et détonation écarlate',
    source: 'Let’s Play Arcade — Mirage Rush original vector icon',
    license: 'CC0',
  }),
});

/** Icônes personnelles de Cloud : onde dorée à l’épée et double entaille en X. */
export const MIRAGE_CLOUD_POWER_ICONS = Object.freeze({
  [POWER_UPS.LASSO]: Object.freeze({
    id: POWER_UPS.LASSO,
    variant: 'cloud',
    label: 'Onde d’épée dorée',
    gemColor: 'yellow',
    accent: '#ffe16b',
    src: asset('cloud-yellow-wave'),
    alt: 'Onde de choc dorée lancée par la grande épée de Cloud',
    source: 'Let’s Play Arcade — icône Cloud Mirage Rush',
    license: 'CC0',
  }),
  [POWER_UPS.PISTOL]: Object.freeze({
    id: POWER_UPS.PISTOL,
    variant: 'cloud',
    label: 'Éclair foudroyant',
    gemColor: 'red',
    accent: '#ff5264',
    src: asset('cloud-lightning'),
    alt: 'Éclair rouge et violet jailli d’une nuée d’orage et frappant un cavalier',
    source: 'Let’s Play Arcade — icône Cloud Mirage Rush',
    license: 'CC0',
  }),
});

/** Icônes personnelles de Link : bombe à mèche, grappin et Triforce. */
export const MIRAGE_LINK_POWER_ICONS = Object.freeze({
  [POWER_UPS.SHIELD]: Object.freeze({
    id: POWER_UPS.SHIELD,
    variant: 'link',
    label: 'Bombe à mèche',
    gemColor: 'blue',
    accent: '#7fe4ff',
    src: asset('link-bomb'),
    alt: 'Bombe ronde noire à mèche allumée posée derrière le cavalier',
    source: 'Let’s Play Arcade — icône Link Mirage Rush',
    license: 'CC0',
  }),
  [POWER_UPS.LASSO]: Object.freeze({
    id: POWER_UPS.LASSO,
    variant: 'link',
    label: 'Grappin',
    gemColor: 'yellow',
    accent: '#ffd15c',
    src: asset('link-hook'),
    alt: 'Grappin à trois dents dont la chaîne accroche un cavalier',
    source: 'Let’s Play Arcade — icône Link Mirage Rush',
    license: 'CC0',
  }),
  [POWER_UPS.PISTOL]: Object.freeze({
    id: POWER_UPS.PISTOL,
    variant: 'link',
    label: 'Triforce',
    gemColor: 'red',
    accent: '#ff8a80',
    src: asset('link-triforce'),
    alt: 'Triforce d’or qui fonce sur l’adversaire devant le cavalier',
    source: 'Let’s Play Arcade — icône Link Mirage Rush',
    license: 'CC0',
  }),
});

export function miragePowerIcon(type, variant = 'standard') {
  if (variant === 'cloud' && MIRAGE_CLOUD_POWER_ICONS[type]) return MIRAGE_CLOUD_POWER_ICONS[type];
  if (variant === 'link' && MIRAGE_LINK_POWER_ICONS[type]) return MIRAGE_LINK_POWER_ICONS[type];
  return MIRAGE_POWER_ICONS[type] || MIRAGE_POWER_ICONS[POWER_UPS.SHIELD];
}
