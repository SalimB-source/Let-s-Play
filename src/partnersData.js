// Partenaires & collaborations de Let's Play.
//
// Chaque entrée porte les liens réels (site officiel, épisodes YouTube) et une
// clé `tag` qui pointe vers les textes traduits dans src/i18n/translations.js
// (`t.partners.items[tag]`). Pour utiliser un logo officiel, déposez le fichier
// dans public/partners/ et renseignez le champ `logo` (ex. 'partners/tcl.png').

const base = import.meta.env.BASE_URL;

export const partners = [
  {
    id: 'algerie-telecom',
    tag: 'show',
    name: 'Algérie Télécom',
    nameNative: 'إتصالات الجزائر',
    mark: 'AT',
    tone: 'telecom',
    logo: null,
    external: 'https://www.algerietelecom.dz/',
    externalLabel: 'algerietelecom.dz',
    media: 'https://www.youtube.com/watch?v=aTs0zhm6Leg',
    mediaLabel: 'Épisode · Journal du Geek',
    extra: 'https://idoom-market.com.dz/fr',
    extraLabel: 'Idoom Market',
    cta: 'https://www.youtube.com/watch?v=aTs0zhm6Leg',
  },
  {
    id: 'tcl',
    tag: 'screen',
    name: 'TCL',
    nameNative: '',
    mark: 'TCL',
    tone: 'tcl',
    logo: null,
    external: 'https://www.tcl.com/',
    externalLabel: 'tcl.com',
    media: null,
    mediaLabel: null,
    extra: null,
    extraLabel: null,
    cta: 'https://www.tcl.com/',
  },
  {
    id: 'gccdz-2026',
    tag: 'event',
    name: 'GCC Dzaïr',
    nameNative: '2026',
    mark: 'GCC',
    tone: 'gccdz',
    logo: null,
    external: 'https://www.gccdz.com/',
    externalLabel: 'gccdz.com',
    media: 'https://www.youtube.com/watch?v=HzigJZOxz2o',
    mediaLabel: 'Notre couverture',
    extra: null,
    extraLabel: null,
    cta: 'https://www.youtube.com/watch?v=HzigJZOxz2o',
  },
];

export const partnerByTag = partners.reduce((acc, partner) => {
  acc[partner.tag] = partner;
  return acc;
}, {});

export const partnerUrls = {
  instagram: 'https://www.instagram.com/letsplay.officiel/',
  youtube: 'https://www.youtube.com/@letsplay.officiel',
  gccdz: 'https://www.gccdz.com/',
  telecom: 'https://www.algerietelecom.dz/',
  idoom: 'https://idoom-market.com.dz/fr',
  tcl: 'https://www.tcl.com/',
  heroVisual: `${base}hero-lets-play.png`,
};
