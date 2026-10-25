/**
 * L'illustration des cartes du Sablier — un seul endroit pour les URL.
 * -------------------------------------------------------------------
 * `cardArt(id)` donne le chemin de la peinture d'une carte, `cardArtFurie(id)`
 * celui de sa face « furie ». Le module vit à part parce que le coffret de
 * deck (`RpgDeckBox.jsx`) et le salon du duel en ligne peignent les mêmes
 * images que le menu : une seule révision de cache, décidée ici.
 */

import { cardArtId, cardById } from './rpgCards.js';

const CARD_ART_BASE_URL = import.meta.env?.BASE_URL ?? '/';

const CARD_ART_CACHE_VERSIONS = {
  // Lettres de Marque : les Sites changent de peinture à chaque Heure.
  // Devenue « La légende du Hollandais volant » : vaisseau fantôme
  // photoréaliste, repeint sous son ancien nom de fichier.
  'la-vengeance-de-la-reine-anne': 'hollandais-volant-photorealiste-v2',
  // La Barbe-Rousse repeint : jeune amiral en plein abordage, vue cinéma.
  'la-barbe-rousse': 'barbe-rousse-jeune-abordage-v1',
  'le-chasseur-d-ocracoke': 'pirates-v1',
  'source-de-bimini': 'pirates-v1',
  'source-de-bimini-2': 'pirates-v1',
  'source-de-bimini-1': 'pirates-v1',
  'source-de-bimini-0': 'pirates-v1',
  'le-tresor-de-lima': 'pirates-v2',
  'le-tresor-de-lima-1': 'pirates-v2',
  'le-tresor-de-lima-0': 'pirates-v2',
  'susanoo': 'susanoo-kaiga-couleurs-v1',
  'orochi': 'orochi-kaiga-vert-rouge-v2',
  'petit-orochi': 'petit-orochi-kaiga-couleurs-v1',
  'samourai-du-daimyo': 'samourai-du-daimyo-kaiga-couleurs-v1',
  'cavalier-des-deux-sabres': 'cavalier-deux-sabres-kaiga-champ-ble-v2',
  // Le Pourfendeur repeint en peinture japonaise nihonga, même composition
  // mais en pigments minéraux (octobre 2025) : révision dédiée pour le cache.
  'tojiro-le-pourfendeur': 'tojiro-nihonga-compo-identique-v1',
  'sabre-maudit': 'sabre-maudit-kaiga-palais-v1',
  'montagne-du-soleil-rouge': 'montagne-kaiga-soleil-rouge-v1',
  // Soleil rouge uniquement : refonte kaiga / nihonga, personnages en action.
  'ashigaru-des-braises': 'soleil-rouge-kaiga-couleurs-v7',
  'ronin-du-soleil-rouge': 'soleil-rouge-kaiga-couleurs-v7',
  'samourai-du-torii': 'chef-samourai-strategie-sous-la-tente-v1',
  'onna-musha-des-cendres': 'soleil-rouge-kaiga-couleurs-v7',
  'hatamoto-des-cendres': 'soleil-rouge-kaiga-couleurs-v7',
  'kenshi-de-la-forge': 'soleil-rouge-kaiga-couleurs-v7',
  'daimyo-du-soleil-rouge': 'soleil-rouge-kaiga-couleurs-v7',
  'tengu-du-mont-ardent': 'soleil-rouge-kaiga-couleurs-v7',
  'oni-de-la-fournaise': 'soleil-rouge-kaiga-couleurs-v7',
  'kagutsuchi-flamme-originelle': 'soleil-rouge-kaiga-couleurs-v7',
  'frappe-iaijutsu': 'iaijutsu-kaiga-couleurs-sans-jambes-v10',
  'feux-de-kitsune': 'kitsune-kaiga-couleurs-v4',
  'serment-de-la-forge': 'soleil-rouge-kaiga-couleurs-v7',
  'pere-des-corbeaux': 'odin-photoreal-v1',
  'ifrit-al-ahmar': 'minotaure-demon-photorealiste-v1',
  'la-devoreuse': 'devoreuse-nihonga-visage-v1',
  'ifrit-des-ergs': 'ifrit-ergs-photorealiste-v1',
  'trait-de-braise': 'trait-feu-sorcier-appeure-v1',
  'anqa-des-braises': 'anqa-des-braises-huile-v1',
  // Les cinq héros du récit ont été **repeints en nihonga** (pigments
  // minéraux sur feuille d’or) avec une palette algérienne — indigo touareg,
  // safran, henné, vert émeraude, turquoise et or. Mêmes noms de fichiers,
  // mêmes visages et mêmes accessoires : les quatre portraits dont la
  // composition est inchangée partagent une révision, pour qu’aucun cache ne
  // resserve les huiles précédentes. Fériel a une nouvelle composition :
  // archère au sommet d’une tour, une flèche électrique encochée, et donc
  // une révision dédiée.
  feriel: 'feriel-tour-fleche-electrique-v1',
  salem: 'heros-nihonga-algerien-v1',
  yamina: 'heros-nihonga-algerien-v1',
  tarek: 'heros-nihonga-algerien-v1',
  boualem: 'heros-nihonga-algerien-v1',
  // Le Corbeau des neuf nuits — le set hybride Neige + Ténèbres (doc 22).
  // Cinq peintures neuves et la figure retournée du Père des corbeaux :
  // toutes partagent la révision du set, décidée ici une seule fois.
  'corbeau-de-givre': 'corbeau-neuf-nuits-v1',
  'veilleuse-au-corbeau-noir': 'corbeau-neuf-nuits-v1',
  'berserk-du-crepuscule': 'corbeau-neuf-nuits-v1',
  'valkyrie-des-neuf-nuits': 'corbeau-neuf-nuits-v1',
  'neige-noire': 'corbeau-neuf-nuits-v1',
  'maitre-des-corbeaux': 'corbeau-neuf-nuits-v1',
  // Le Serpent du monde garde la facture nihonga, mais sa composition est
  // repensée : un serpent unique et anatomiquement cohérent encercle le globe.
  // Sa révision dédiée l’emporte sur celle du set Neige.
  'serpent-du-monde': 'serpent-terre-nihonga-v1',
  // L'Armure de cendres quitte le lot photoréaliste : son dessin d'origine
  // est conservé trait pour trait et simplement repeint en nihonga.
  'armure-de-cendres': 'armure-nihonga-v1',
  // Le Bâton des citernes quitte le lot photoréaliste à son tour : le bâton
  // seul derrière la glace d'une vitrine, les serpents dehors.
  'baton-des-citernes': 'baton-nihonga-vitrine-dehors-v2',
  'djinn-de-foudre': 'plein-art-foudre-v1',
  'sonneur-fele': 'plein-art-cloche-v1',
  'dame-aux-ailes-d-or': 'nihonga-v1',
  'lionne-du-midi-ardent': 'nihonga-v1',
  'brisure-de-verre': 'plein-art-verre-v2',
  'silence-decume': 'plein-art-bulle-v1',
  'parade-du-verre': 'plein-art-verre-v1',
  'maree-contraire': 'deflection-ultrason-v1',
  ressac: 'djinn-tourbillon-v1',
  'courant-de-retour': 'djinn-tourbillon-v1',
  // Les quatre porteurs humains de Furie ont été repeints en photoréaliste
  // fantaisiste : chaque face intacte a son double ensanglanté, armure ou
  // casque brisé et visage en furie. On date les huit images ensemble pour
  // qu’aucun cache ne resserve les anciennes huiles sous les mêmes noms.
  'guerrier-au-bouclier-rond': 'furie-photorealiste-v1',
  // La face de base du Berserk a depuis été repeinte seule : même visage et
  // même rendu photoréaliste que son double, mais avant la Furie — debout,
  // calme et sans aucune trace de sang. Le double garde la révision commune.
  'berserk-des-trois-hivers': 'berserk-meme-visage-sans-sang-v1',
  'jarl-au-marteau-de-guerre': 'furie-photorealiste-v1',
  'maitre-du-marteau': 'furie-photorealiste-v1',
  'guerrier-au-bouclier-rond-furie': 'furie-photorealiste-v1',
  'berserk-des-trois-hivers-furie': 'furie-photorealiste-v1',
  'jarl-au-marteau-de-guerre-furie': 'furie-photorealiste-v1',
  'maitre-du-marteau-furie': 'furie-photorealiste-v1',
  // Le Loup garde, lui, la peinture à l’huile de sa meute : même composition,
  // chef ensanglanté et crocs dehors dans l’état Furie.
  'loup-des-neiges-furie': 'loup-furie-huile-v1',
  // La Valkyrie repart de sa scène d'origine : enragée et ensanglantée, elle
  // vole dans le ciel et fond sur sa cible avec son corbeau noir, épée levée.
  'valkyrie-au-corbeau-furie': 'valkyrie-vol-plongeon-enragee-v4',
  // Le Corbeau des neuf nuits prête à son tour sa face de Furie à deux de ses
  // cartes — le Berserk du crépuscule et la Valkyrie des neuf nuits. Chacune
  // reprend trait pour trait la composition de sa peinture intacte, mais
  // ensanglantée et enragée ; deux révisions dédiées, comme pour les porteurs
  // du Serment, afin qu’aucun cache ne resserve la face calme.
  'berserk-du-crepuscule-furie': 'corbeau-furie-crepuscule-v1',
  'valkyrie-des-neuf-nuits-furie': 'corbeau-furie-neuf-nuits-v1',
  // Repeints sous leurs anciens noms : charge frontale pour le Mur, marteau
  // d’électricité fonçant sur une cible pour l’Éclair, soldats gelés dans la
  // brume pour la Brume du fjord et grizzli prisonnier de la glace pour le
  // Hurlement du blizzard.
  'mur-de-boucliers': 'mur-boucliers-charge-v1',
  'eclair-du-marteau': 'eclair-marteau-electrique-cible-v1',
  'brume-du-fjord': 'brume-personnes-gelees-v2',
  'hurlement-du-blizzard': 'hurlement-grizzli-gele-v1',
  // La Hache est seule, sa lame plantée dans la banquise : aucun porteur
  // ne vient concurrencer l’arme dans la nouvelle illustration.
  'hache-de-la-banquise': 'hache-plantee-glace-v2',
};
/**
 * Le set Neige a été peint en plusieurs passes : les esquisses ont cédé la
 * place aux peintures définitives **sous les mêmes noms de fichiers**, et deux
 * figures (le Maître du marteau, le Père des corbeaux) ont ensuite été
 * repeintes. On date donc ses images : le `?v=` change l'URL, si bien qu'aucun
 * cache — celui du navigateur comme celui d'un intermédiaire — ne peut plus
 * resservir une ancienne peinture sous le nom d'une nouvelle. Incrémenter la
 * version à chaque repeint du set.
 */
const SET_NEIGE_ART_VERSION = 'peintures-definitives-v3';
export const cardArt = (id) => {
  const artId = cardArtId(id);
  const revision = CARD_ART_CACHE_VERSIONS[artId]
    ?? (cardById(artId)?.element === 'neige' ? SET_NEIGE_ART_VERSION : undefined);
  return `${CARD_ART_BASE_URL}cards/${artId}.jpg${revision ? `?v=${revision}` : ''}`;
};

/**
 * Illustration d'une entité posée. Un Site peut fournir une suite d'arts
 * indexée par ses compteurs d'Heures : Bimini révèle ainsi une nouvelle
 * profondeur de la grotte à chaque retrait. Les autres cartes conservent leur
 * illustration imprimée habituelle.
 */
export const cardArtEntite = (entite) => {
  const carte = cardById(entite?.carteId);
  if (!carte) return '';
  if (carte.kind === 'site' && carte.site?.arts) {
    const restants = Math.max(0, Math.trunc(Number(entite?.heures?.restants) || 0));
    return cardArt(carte.site.arts[restants] ?? carte.art ?? carte.id);
  }
  return cardArt(carte);
};

/**
 * Illustration « furie » d'une créature : tant que son état Furie est actif
 * (`entite.furieDeclenchee === true`), on affiche sa peinture alternative
 * entachée de sang et en colère ; dès qu'il retombe, la face normale revient.
 * Retourne l'URL de l'image `public/cards/<id>-furie.jpg` avec sa révision
 * de cache, ou l'illustration normale si aucune peinture furie n'existe.
 */
export const cardArtFurie = (id) => {
  const artId = `${cardArtId(id)}-furie`;
  const revision = CARD_ART_CACHE_VERSIONS[artId];
  return `${CARD_ART_BASE_URL}cards/${artId}.jpg${revision ? `?v=${revision}` : ''}`;
};
