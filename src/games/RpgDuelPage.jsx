/**
 * Le Sablier — duel de cartes tactique.
 * Les tours gardent leur liberté d'une partie de cartes à collectionner :
 * poser un terrain, lancer des sorts, déclarer ses attaquants, puis défendre
 * pendant la fenêtre de réponse de l'adversaire.
 */

import { Fragment, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './rpg-battle.css';
import './rpg-mobile.css';
import './rpg-story.css';
import './rpg-deckbox.css';
import './rpg-mana-essai.css';
import { createRpgLandscapeSession } from './rpgLandscape.js';
import FullscreenIcon from './FullscreenIcon.jsx';
import { isFullscreenShortcut, nativeFullscreenElement } from './gameFullscreen.js';
import useGameFullscreen from './useGameFullscreen.js';
import { AuthContext } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import {
  plateauDeRepli,
  plateauParId,
  tirerPlateauDuDuel,
} from './rpgPlateaux.js';
import { groupTerrainStacks } from './rpgTerrainStacks.js';
import {
  RPG_MANA_ESSAI_DECKS,
  RPG_MANA_ESSAI_MAX,
  RPG_MODE_MANA_ESSAI,
  adversaireManaEssai,
  deckManaEssaiParId,
} from './rpgManaEssai.js';
import { armesPortees, groupCartesMain, groupEntitesParCarte } from './rpgCardStacks.js';
import { classeVariationStatCreature, libelleVariationStatCreature } from './rpgCreatureStats.js';
import { peutDemarrerAppuiLong, startRpgLongPress } from './rpgLongPress.js';
import { startRpgTouchDrag } from './rpgTouchDrag.js';
import {
  etageEstDebloque,
  etageEstVaincu,
  resumeTourHistoire,
} from './rpgStory.js';
import {
  deckHistoire,
  etageHistoireParId,
  prochainEtage,
  RPG_STORY_TOURS,
  tourHistoireParId,
} from './rpgStoryTours.js';
import { useRpgStory } from './useRpgStory.js';
import { resumeRecitHistoire } from './rpgStoryFlow.js';
import RpgStoryCampaign from './RpgStoryCampaign.jsx';
import RpgStoryScene from './RpgStoryScene.jsx';
import RpgStoryJournal from './RpgStoryJournal.jsx';
import { personnageEtage, portraitHistoire } from './rpgStoryCast.js';
import { sauverCollectionDistante, possedeCarte } from './rpgCollection.js';
import { RpgAmbientMusic } from './rpgAmbientMusic.js';
import { RpgPlateauMusic, RPG_PLATEAUX_MUSICAUX } from './rpgPlateauMusic.js';
import { RpgAudioPlayer } from './rpgAudio.js';
import { rpgCombatFireSound, rpgFireSoundFor } from './rpgFireAudio.js';
import { rpgWaterSoundFor } from './rpgWaterAudio.js';
import RpgDeckAtelier from './RpgDeckAtelier.jsx';
import RpgCardGuide from './RpgCardGuide.jsx';
import RpgCardRules from './RpgCardRules.jsx';
import { EffetsSprite, PastillesCarte, IconesCarte } from './effetIcons.jsx';
import RpgTutorialOverlay from './RpgTutorialOverlay.jsx';
import RpgStoryTowerPreview from './RpgStoryTowerPreview.jsx';
import RpgTableScene3D from './RpgTableScene3D.jsx';
import { readRpgTable3dPref, writeRpgTable3dPref } from './rpgTableSceneThemes.js';
import { useDecksSablier } from './useDecksSablier.js';
import { useSablierBourse } from './useSablierBourse.js';
import RpgSouk from './RpgSouk.jsx';
import RpgMarketIcon from './RpgMarketIcon.jsx';
import RpgQuetesDuJour from './RpgQuetesDuJour.jsx';
import { creditsLisible } from './rpgCredits.js';
import {
  preparerDuelTutoriel,
  RPG_TUTORIAL_OPPONENT_DECK,
  RPG_TUTORIAL_PLAYER_DECK,
  RPG_TUTORIAL_STEPS,
} from './rpgTutorial.js';
import {
  chargerDeckChoisi,
  deckAdverseParDefaut,
  deckAdversePour,
  deckEstSelectionnable,
  deckParDefaut,
  deckSeJoue,
  sauverDeckChoisi,
} from './rpgDeckChoice.js';
import {
  RPG_DECK_NOM_MAX,
  RPG_DECKS_MAISON_LIMITE,
  nomDeckMaisonParDefaut,
  rpgValiderDeckMaison,
} from './rpgDeckBuilder.js';
import {
  deckColors,
  deckCorrespondCouleur,
  filtrerDecksParCouleur,
  filtresCouleurDecks,
} from './rpgDeckFilter.js';
import {
  arriveeCiblePortee,
  rpgCibleAuto,
  rpgChoisirAttaquants,
  rpgContreJouable,
  rpgDefinirPhase,
  rpgChoisirBloqueurs,
  rpgCiblesAttaqueRapide,
  rpgDefausserCarte,
  rpgChoisirCouleurMana,
  rpgDemarrerManaEssai,
  rpgEngagerTerrain,
  rpgFermerFenetreReponse,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgPeutAttaquer,
  rpgLancerMagie,
  rpgMulligan,
  rpgMulliganSorcier,
  rpgNouveauDuel,
  rpgNombreDestructions,
  rpgDestructionsDepuis,
  rpgOuvrirFenetreReponse,
  rpgOuvrirFinDeTour,
  rpgPeutRepondre,
  rpgSorcierMagieRapide,
  rpgEstProtegee,
  rpgPeutBloquerAttaquant,
  rpgPeutMulligan,
  rpgPeutPayer,
  rpgPoserTerrain,
  rpgResoudreArriveeCiblee,
  rpgActiverArme,
  rpgActiverCapacite,
  rpgJouerArme,
  rpgModesArme,
  rpgPeutActiverArme,
  rpgPeutActiverCapacite,
  rpgSorcierActiverArmes,
  rpgSorcierActiverCapacitesIA,
  rpgSorcierAnnonceSuivante,
  rpgSorcierPrepareTerrain,
  rpgSorcierResoudreAnnonce,
  rpgVainqueur,
} from './rpgDuel.js';
import {
  cardRarityInfo,
  cardFrameClass,
  cardMotifClass,
  cardFrameColor,
  cardColorCost,
  bonusArme,
  carteEstArme,
  cardColors,
  cardHybridGradient,
  terrainManaColors,
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_SORCIER_BASE,
  RPG_DECKS,
  RPG_DUEL_CARDS,
  cardArtId,
  cardById,
  cardTypeLine,
  armeById,
  magieFamille,
  rpgValiderDeck,
} from './rpgCards.js';
// La signature des deux familles de sorts — sceau, socle, ligne teintée — vit
// dans son propre module : l'atelier de decks la partage (voir
// `rpgSortSignature.jsx`).
import { SortSceau, SortSocle, classeLigneFamille } from './rpgSortSignature.jsx';

const TILTS = [-2.4, 1.7, -1.2, 2.3, -1.8, 1.1];
const ELEMENT_GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', hybride: '🔥⏳' };
const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', hybride: 'Sable + Braise' };
const FILTRE_COULEUR_LABELS = { toutes: 'Toutes', sable: 'Sable', braise: 'Braise', eau: 'Eau', neige: 'Neige', hybride: 'Hybride' };
const CARD_ART_CACHE_VERSIONS = {
  'susanoo': 'susanoo-kaiga-couleurs-v1',
  'orochi': 'orochi-kaiga-vert-rouge-v2',
  'petit-orochi': 'petit-orochi-kaiga-couleurs-v1',
  'samourai-du-daimyo': 'samourai-du-daimyo-kaiga-couleurs-v1',
  'cavalier-des-deux-sabres': 'cavalier-deux-sabres-kaiga-champ-ble-v2',
  'sabre-maudit': 'sabre-maudit-kaiga-palais-v1',
  'montagne-du-soleil-rouge': 'montagne-kaiga-soleil-rouge-v1',
  // Soleil rouge uniquement : refonte kaiga / nihonga, personnages en action.
  'ashigaru-des-braises': 'soleil-rouge-kaiga-couleurs-v7',
  'ronin-du-soleil-rouge': 'soleil-rouge-kaiga-couleurs-v7',
  'samourai-du-torii': 'soleil-rouge-kaiga-couleurs-v7',
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
  'djinn-du-souk': 'munch-impressionniste-v3',
  'ifrit-al-ahmar': 'sourire-tempete-huile-v1',
  'trait-de-braise': 'trait-feu-sorcier-appeure-v1',
  'anqa-des-braises': 'anqa-des-braises-huile-v1',
  // Les cinq héros du récit ont été **repeints en nihonga** (pigments
  // minéraux sur feuille d’or) avec une palette algérienne — indigo touareg,
  // safran, henné, vert émeraude, turquoise et or. Mêmes noms de fichiers,
  // mêmes visages et mêmes accessoires : on date donc les cinq images d’un
  // seul geste pour qu’aucun cache ne resserve les huiles précédentes.
  feriel: 'heros-nihonga-algerien-v1',
  salem: 'heros-nihonga-algerien-v1',
  yamina: 'heros-nihonga-algerien-v1',
  tarek: 'heros-nihonga-algerien-v1',
  boualem: 'heros-nihonga-algerien-v1',
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
  'brisure-de-verre': 'plein-art-verre-v2',
  'silence-decume': 'plein-art-bulle-v1',
  'parade-du-verre': 'plein-art-verre-v1',
  'maree-contraire': 'deflection-ultrason-v1',
  ressac: 'djinn-tourbillon-v1',
  'courant-de-retour': 'djinn-tourbillon-v1',
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
const cardArt = (id) => {
  const artId = cardArtId(id);
  const revision = CARD_ART_CACHE_VERSIONS[artId]
    ?? (cardById(artId)?.element === 'neige' ? SET_NEIGE_ART_VERSION : undefined);
  return `${import.meta.env.BASE_URL}cards/${artId}.jpg${revision ? `?v=${revision}` : ''}`;
};
/**
 * Le dos commun à toutes les cartes du duel : la rune du Sablier gravée à l'or
 * sur le rouge sombre de la table. Il habille le paquet, le dessus de la pioche
 * et la main cachée du sorcier. Le chemin dépend de `BASE_URL` (le site vit
 * sous `/Let-s-Play/` hors Vercel) et la feuille de style ne peut pas le
 * calculer : il descend donc en variable CSS depuis la racine du duel, et
 * `rpg-battle.css` le lit avec `var(--rpg-dos-de-carte)`. Objet figé : React
 * garde la même référence d'un rendu à l'autre.
 */
const DOS_DE_CARTE_STYLE = Object.freeze({
  '--rpg-dos-de-carte': `url("${import.meta.env.BASE_URL}dos-de-carte.jpg")`,
});

const couleurLabel = (couleur) => ELEMENT_LABELS[couleur] ?? couleur;

function cardColorLabel(carte) {
  return cardColors(carte).map(couleurLabel).join(' + ') || couleurLabel(carte?.element);
}

function cardColorCostLabel(carte) {
  return Object.entries(cardColorCost(carte))
    .map(([couleur, quantite]) => `${quantite} ${couleurLabel(couleur)}`)
    .join(' et ');
}

function cardCostLabel(carte) {
  const exigences = cardColorCostLabel(carte);
  return `${carte?.cost ?? 0} mana${exigences ? `, dont ${exigences}` : ''}`;
}

function describeAnnouncedMagicTarget(carte, cibleId, duel, sorcierArtId, sorcierPortraitUrl) {
  if (!carte || carte.kind !== 'magie') return null;
  const effet = carte.effet ?? {};

  // Pour une annonce du sorcier, l’identifiant réservé « sorcier » désigne
  // l’adversaire du lanceur : le joueur qui voit l’aperçu.
  if (cibleId === 'sorcier' || effet.cible === 'sorcier' || (carte.cibles?.includes('sorcier') && !cibleId)) {
    return { nom: 'Vous', illustrationId: 'salem' };
  }

  const entite = [...duel.joueur.creatures, ...duel.sorcier.creatures]
    .find((candidate) => candidate.id === cibleId);
  if (entite) return { nom: entite.name, illustrationId: entite.carteId };

  if (effet.cible === 'toutes-creatures') return { nom: 'Toutes vos créatures' };
  if (effet.type === 'buff') return { nom: 'Toutes les créatures du sorcier' };
  if (effet.type === 'contresort') return { nom: 'La carte annoncée' };
  if (effet.cible === 'creature-amie') return { nom: 'Une créature du sorcier', illustrationId: sorcierArtId, illustrationUrl: sorcierPortraitUrl };
  if (effet.type === 'soin' || effet.type === 'pioche' || carte.cibles?.includes('soi')) {
    return { nom: 'Le sorcier', illustrationId: sorcierArtId, illustrationUrl: sorcierPortraitUrl };
  }
  if (effet.cible === 'creature') return { nom: 'Une créature ciblée' };
  return { nom: 'Champ de bataille' };
}

function cardEffectLines(text) {
  if (!text || text === '—') return [];
  return String(text)
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((effet) => effet.trim())
    .filter(Boolean);
}

function deckColorLabel(deck) {
  return deckColors(deck).map(couleurLabel).join(' + ');
}

function deckColorGlyph(deck) {
  return deckColors(deck).map((couleur) => ELEMENT_GLYPHS[couleur] ?? '◇').join('\u00a0');
}

function deckColorModifier(deck) {
  const colors = deckColors(deck);
  return colors.length > 1 ? 'hybride' : colors[0] ?? 'neutre';
}

function mesurerRectangle(element, fallbackWidth = 128, fallbackHeight = 160) {
  if (!element?.getBoundingClientRect) return null;
  const rect = element.getBoundingClientRect();
  return {
    left: Number.isFinite(rect.left) ? rect.left : 0,
    top: Number.isFinite(rect.top) ? rect.top : 0,
    width: rect.width || element.offsetWidth || fallbackWidth,
    height: rect.height || element.offsetHeight || fallbackHeight,
  };
}

/* Une carte de la main se tient inclinée dans l'éventail (voir « L'éventail de
   la main » dans `rpg-battle.css`) : `getBoundingClientRect` rend alors la boîte
   **tournée**, plus large que la carte. Le vol de carte part donc de la boîte
   de mise en page (`offsetWidth`/`offsetHeight`), recentrée sur la boîte
   mesurée — la carte garde exactement sa taille en quittant la main, au lieu de
   grossir du quart de sa hauteur. Sans mise en page (jsdom), la mesure reste
   celle d'avant. */
function mesurerBoiteCarteMain(element, fallbackWidth = 128, fallbackHeight = 160) {
  const rect = mesurerRectangle(element, fallbackWidth, fallbackHeight);
  if (!rect) return null;
  const width = element.offsetWidth || rect.width;
  const height = element.offsetHeight || rect.height;
  const recentrage = (mesure, taille) => (mesure > taille + 1 ? (mesure - taille) / 2 : 0);
  return {
    left: rect.left + recentrage(rect.width, width),
    top: rect.top + recentrage(rect.height, height),
    width,
    height,
  };
}

function mesurerDestinationVol(table, kind, from, carteId) {
  const terrain = kind === 'terrain';
  const zone = table?.querySelector(terrain ? '.rpg-terrains--joueur' : '.card-row--equipe');
  if (!zone) return from;
  const zoneRect = zone.getBoundingClientRect();
  const box = {
    left: Number.isFinite(zoneRect.left) ? zoneRect.left : 0,
    top: Number.isFinite(zoneRect.top) ? zoneRect.top : 0,
    width: zoneRect.width || zone.clientWidth || 0,
    height: zoneRect.height || zone.clientHeight || 0,
    right: Number.isFinite(zoneRect.right) ? zoneRect.right : (zoneRect.left || 0) + (zoneRect.width || 0),
    bottom: Number.isFinite(zoneRect.bottom) ? zoneRect.bottom : (zoneRect.top || 0) + (zoneRect.height || 0),
  };
  const styleOf = (element) => element && window.getComputedStyle?.(element);
  const readPx = (element, property, fallback = 0) => {
    const value = Number.parseFloat(styleOf(element)?.[property] ?? '');
    return Number.isFinite(value) ? value : fallback;
  };
  const paddingLeft = readPx(zone, 'paddingLeft');
  const paddingRight = readPx(zone, 'paddingRight');
  const paddingTop = readPx(zone, 'paddingTop');
  const paddingBottom = readPx(zone, 'paddingBottom');
  const gap = readPx(zone, 'columnGap', readPx(zone, 'gap', terrain ? 5 : 12));

  if (terrain) {
    const existing = [...zone.querySelectorAll('.rpg-terrain--joueur')];
    const stack = existing.find((element) => element.dataset.cardId === carteId);
    if (stack) return mesurerRectangle(stack);
    const last = existing.at(-1);
    const lastRect = last?.getBoundingClientRect();
    const lastWidth = last?.offsetWidth || lastRect?.width || 0;
    const width = lastWidth || readPx(zone.querySelector('.rpg-terrain--joueur'), 'width', table.closest('.rpg-battle--touch') ? 44 : Math.min(from.width, 68));
    const height = last?.offsetHeight || lastRect?.height || width * 1.25;
    if (styleOf(zone)?.display === 'grid') {
      const columns = styleOf(zone).gridTemplateColumns.split(' ').map(Number.parseFloat).filter(Number.isFinite);
      const column = existing.length % Math.max(1, columns.length);
      const row = Math.floor(existing.length / Math.max(1, columns.length));
      const rowHeight = readPx(zone, 'gridAutoRows', height + 16);
      return {
        left: box.left + paddingLeft + columns.slice(0, column).reduce((a, b) => a + b, 0)
          + column * gap + ((columns[column] || width) - width) / 2 - zone.scrollLeft,
        top: Math.max(box.top + paddingTop, Math.min(box.bottom - paddingBottom - height,
          box.top + paddingTop + row * (rowHeight + readPx(zone, 'rowGap', gap)) + (rowHeight - height) / 2 - zone.scrollTop)),
        width, height,
      };
    }
    return {
      left: last ? (lastRect?.right ?? box.left + paddingLeft + width) + gap : box.left + paddingLeft,
      top: last ? (lastRect?.top ?? box.top + paddingTop) : box.top + paddingTop,
      width,
      height,
    };
  }

  const cards = [...zone.querySelectorAll('.rpg-card--equipe')];
  const example = cards[0];
  const exampleRect = example?.getBoundingClientRect();
  const width = example?.offsetWidth || exampleRect?.width || readPx(example, 'width', Math.min(from.width, 142));
  const height = example?.offsetHeight || exampleRect?.height || width * 1.25;
  const countAfterPlay = cards.length + 1;
  const available = Math.max(0, box.width - paddingLeft - paddingRight);
  const distributedSpace = Math.max(0, (available - countAfterPlay * width - (countAfterPlay - 1) * gap) / (countAfterPlay + 1));
  return {
    left: box.left + paddingLeft + distributedSpace + cards.length * (width + gap + distributedSpace),
    top: box.top + box.height - paddingBottom - height,
    width,
    height,
  };
}

/* L'aperçu au survol se colle à la carte survolée. Plutôt que d'estimer la
   taille du panneau (680 × 400, toujours fausse : le vrai panneau varie avec
   la carte lue), on le laisse se rendre puis on le repose d'après sa **boîte
   réelle**. La boîte inclut le rembourrage du panneau : on retire cette marge
   intérieure, pour que ce soit la face — pas le bord du panneau — qui se
   colle à la carte. Le panneau choisit le côté qui a la place, à droite
   d'abord ; si son bord déborderait de la fenêtre, il bascule à gauche. En
   hauteur, le haut de la face s'aligne sur celui de la carte, et le panneau
   remonte si son bas déborde. */
function placerApercuSurvol(rectangle, panneau) {
  const largeurVue = Math.max(1, window.innerWidth || document.documentElement?.clientWidth || 1024);
  const hauteurVue = Math.max(1, window.innerHeight || document.documentElement?.clientHeight || 768);
  const marge = 10;
  const espace = 12;
  const boite = panneau?.getBoundingClientRect?.();
  const largeur = boite?.width || panneau?.offsetWidth || Math.min(680, Math.max(180, largeurVue - 20));
  const hauteur = boite?.height || panneau?.offsetHeight || Math.min(400, Math.max(150, hauteurVue - 20));
  const stylePanneau = panneau && typeof window.getComputedStyle === 'function' ? window.getComputedStyle(panneau) : null;
  const lireMargeInterieure = (propriete) => {
    const valeur = Number.parseFloat(stylePanneau?.[propriete] ?? '');
    return Number.isFinite(valeur) ? valeur : 0;
  };
  const margeGauche = lireMargeInterieure('paddingLeft');
  const margeDroite = lireMargeInterieure('paddingRight');
  const margeHaute = lireMargeInterieure('paddingTop');
  let left = rectangle.right + espace - margeGauche;
  if (left + largeur > largeurVue - marge) {
    left = rectangle.left - largeur - espace + margeDroite;
  }
  left = Math.max(marge, Math.min(left, Math.max(marge, largeurVue - largeur - marge)));
  let top = rectangle.top - margeHaute;
  if (top + hauteur > hauteurVue - marge) top = hauteurVue - marge - hauteur;
  top = Math.max(marge, Math.min(top, Math.max(marge, hauteurVue - hauteur - marge)));
  return { left: `${left}px`, top: `${top}px` };
}

function ManaCost({ carte, compact = false, showElement = true }) {
  if (!carte || carte.kind === 'terrain') return null;
  const colors = cardColors(carte);
  const hybrid = colors.length > 1;
  return (
    <span
      className={`rpg-mana-cost rpg-mana-cost--${hybrid ? 'hybride' : carte.element}${compact ? ' is-compact' : ''}`}
      style={hybrid ? { '--rpg-hybrid-cost-bg': cardHybridGradient(carte) } : undefined}
      aria-label={`Coût : ${cardCostLabel(carte)}`}
    >
      <b>{carte.cost}</b>
      {!hybrid && showElement && <i aria-hidden="true">{ELEMENT_GLYPHS[carte.element] ?? '◇'}</i>}
    </span>
  );
}

function WizardManaCounters({ mana }) {
  const resources = [
    ['braise', 'Mana braise'],
    ['eau', 'Mana eau'],
    ['sable', 'Mana sable'],
    ['neige', 'Mana neige'],
  ];
  const available = resources.filter(([color]) => Number(mana?.[color]) > 0);
  if (!available.length) return null;
  return (
    <span className="rpg-wizard-plate__sable">
      {available.map(([color, label]) => (
        <i key={color} className={`mana mana--${color}`} title={label}>{mana[color]}</i>
      ))}
    </span>
  );
}

export function FluxManaTrack({ camp, cote }) {
  const capacite = camp.manaMax ?? {};
  const maximum = Object.values(capacite).reduce((total, valeur) => total + valeur, 0);
  const disponible = Object.values(camp.mana).reduce((total, valeur) => total + valeur, 0);
  // Dix orbes fixes, dans l'ordre d'acquisition. Un mana dépensé s'assombrit
  // mais garde sa couleur ; il se rallume quand la réserve se recharge.
  const restants = { ...camp.mana };
  const slots = Array.from({ length: RPG_MANA_ESSAI_MAX }, (_, index) => {
    const couleur = camp.manaSources?.[index] ?? null;
    const allumee = Boolean(couleur && restants[couleur] > 0);
    if (allumee) restants[couleur] -= 1;
    return { index, couleur, etat: !couleur ? 'vide' : allumee ? 'disponible' : 'depense' };
  });
  return (
    <div
      className={`rpg-terrains rpg-terrains--${cote} rpg-flux-track rpg-flux-track--${cote}`}
      data-mana-capacite={maximum}
      data-mana-disponible={disponible}
      role="status"
      aria-label={`${cote === 'joueur' ? 'Votre mana' : 'Mana du sorcier'} : ${disponible} disponible sur ${maximum} acquis, maximum ${RPG_MANA_ESSAI_MAX}. ${Object.entries(capacite).filter(([, n]) => n > 0).map(([couleur, n]) => `${couleurLabel(couleur)} ${camp.mana[couleur] ?? 0} sur ${n}`).join(', ')}`}
    >
      <span className="rpg-flux-track__bar">
        <b className="rpg-flux-track__reserve" aria-hidden="true">{disponible}<span>/</span>{maximum}</b>
        <span className="rpg-flux-track__slots" aria-hidden="true">
          {slots.map(({ index, couleur, etat }) => (
            <i
              key={index}
              className={`rpg-flux-track__slot${couleur ? ` rpg-flux-track__slot--${couleur}` : ''} ${etat === 'vide' ? 'is-empty' : etat === 'disponible' ? 'is-lit' : 'is-spent'}`}
              data-mana-slot={index + 1}
              data-mana-etat={etat}
              title={couleur ? `${couleurLabel(couleur)} — ${etat === 'disponible' ? 'disponible' : 'dépensé'}` : `Mana ${index + 1} non acquis`}
            >{couleur ? <ElementEmblem element={couleur} /> : '◇'}</i>
          ))}
        </span>
      </span>
    </div>
  );
}

function profileNameFallback(user) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [
    metadata.display_name,
    user?.display_name,
    metadata.username,
    user?.username,
    metadata.full_name,
    metadata.gamertag,
    user?.id ? String(user.id).slice(0, 8) : null,
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || 'Vous';
}

function CardElementBadge({ carte }) {
  if (!carte?.element || carte.kind === 'terrain') return null;
  const colors = cardColors(carte);
  const hybrid = colors.length > 1;
  return (
    <span
      className={`rpg-card-element-badge rpg-card-element-badge--${hybrid ? 'hybride' : carte.element}`}
      aria-hidden="true"
    >
      {hybrid
        ? colors.map((couleur) => (
          <i key={couleur} className={`rpg-card-element-badge__pip rpg-card-element-badge__pip--${couleur}`}>
            {ELEMENT_GLYPHS[couleur] ?? '◇'}
          </i>
        ))
        : ELEMENT_GLYPHS[carte.element] ?? '◇'}
    </span>
  );
}

function CombatActionIcon({ type }) {
  const confirmation = type === 'confirm';
  return (
    <span className={`rpg-combat-action-icon rpg-combat-action-icon--${type}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {confirmation ? <path d="m5 12 4.5 4.5L19.5 7" /> : (
          <>
            <path d="m4 4 7.5 7.5M2.5 2.5l5.5 1L7 9l-2.5-2.5M20 4l-7.5 7.5M21.5 2.5 16 3l1 5.5 2.5-2.5M7 13l-4 4 4 4 4-4M17 13l4 4-4 4-4-4" />
          </>
        )}
      </svg>
    </span>
  );
}

// Les six phases d'un tour (voir RPG_PHASES dans rpgDuel.js). `label` est le nom
// court ; `title` le nom complet, lu par les lecteurs d'écran et au survol.
const RPG_PHASE_STEPS = [
  { id: 'debut', label: 'Début', title: 'Début de tour' },
  { id: 'principale', label: 'Principale', title: 'Phase principale' },
  { id: 'attaque', label: 'Attaque', title: 'Phase d’attaque' },
  { id: 'blocage', label: 'Blocage', title: 'Phase de blocage' },
  { id: 'principale2', label: '2ᵉ principale', title: 'Deuxième phase principale' },
  { id: 'fin', label: 'Fin', title: 'Fin de tour' },
];

function PhaseGlyph({ phase }) {
  const drawing = phase === 'debut' ? (
    <>
      <path d="M12 3v9m0 0-3-3m3 3 3-3" />
      <rect x="5" y="15" width="14" height="6" rx="1.5" />
    </>
  ) : phase === 'principale' ? (
    <>
      <rect x="6" y="3.5" width="12" height="15" rx="1.5" />
      <path d="M9 8h6M9 11h6M9 14h4M4 7v13a1 1 0 0 0 1 1h11" />
    </>
  ) : phase === 'principale2' ? (
    <>
      <rect x="8" y="3.5" width="12" height="15" rx="1.5" />
      <path d="M11 8h6M11 11h6M11 14h4M4 3.5v17.5a1 1 0 0 0 1 1h11M7 7v10" />
    </>
  ) : phase === 'attaque' ? (
    <>
      <path d="m5 19 13-13M14.5 4.5l5 5M4 16l4 4M8 14l2 2" />
      <path d="m4 5 4 4M5 4 4 8m0 0 4-1" />
    </>
  ) : phase === 'blocage' ? (
    <>
      <path d="m12 3 7 3v5c0 4-2.7 7.3-7 10-4.3-2.7-7-6-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ) : (
    <>
      <path d="M6 21V4m1 1h11l-3 3 3 3H7" />
      <path d="m9 15 2 2 4-4" />
    </>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {drawing}
    </svg>
  );
}

// `jouees` : les phases déjà passées que le tour ne rouvre pas — la phase
// d'attaque d'un camp est unique (voir `duel.attaqueJouee`).
function PhaseTrack({ current, jouees = [] }) {
  return (
    <ol className="rpg-phase-track" aria-label="Phases du duel">
      {RPG_PHASE_STEPS.map((step) => {
        const active = current === step.id;
        const jouee = jouees.includes(step.id);
        const title = active ? `${step.title} · phase actuelle` : jouee ? `${step.title} · jouée` : step.title;
        return (
          <li
            key={step.id}
            className={`rpg-phase-step${active ? ' is-active' : ''}${jouee ? ' is-jouee' : ''}`}
            data-phase={step.id}
            aria-current={active ? 'step' : undefined}
            title={title}
          >
            <span className="rpg-phase-step__icon"><PhaseGlyph phase={step.id} /></span>
            <span className="rpg-phase-step__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * La ligne de type imprimée sur la face d'une carte. Les créatures (héros
 * compris) n'en portent plus en duel — ni en main, ni posées, ni dans l'aperçu :
 * leur cadre, leurs statistiques et leur illustration disent déjà ce qu'elles
 * sont. La ligne reste pour les magies (Magie Rapide, Sorcellerie) et les
 * terrains, qui n'ont ni attaque ni défense pour se présenter, et au catalogue
 * comme dans les listes de deck, où l'on vient justement lire les fiches.
 */
function cardFaceTypeLine(carte) {
  return cardTypeLine(carte).replace(/^Créature(?: légendaire)?(?=\s|$)/u, 'Type');
}

/** La famille d'une carte en un mot : celle du catalogue et de ses filtres —
 * « Terrain », « Arme », « Magie », « Héros », « Créature ». La fiche ouverte
 * d'un clic la reprend en sur-titre, la grille s'en sert pour ses libellés. */
function carteFamille(carte) {
  if (carte?.kind === 'terrain') return 'Terrain';
  if (carteEstArme(carte)) return 'Arme';
  if (carte?.kind === 'magie') return 'Magie';
  if (carte?.kind === 'hero') return 'Héros';
  return 'Créature';
}

/** La couleur d'une carte, telle que le catalogue l'écrit : le ou les glyphes
 * d'élément puis leur nom — « ⏳ Sable · Désert », « 🔥 Braise + Eau » pour une
 * hybride, et les deux manas d'un terrain qui les produit au choix. */
function cardColorLine(carte) {
  if (carte?.kind === 'terrain') {
    return terrainManaColors(carte).length > 1
      ? '🔥 Braise ou ⏳ Sable'
      : `${ELEMENT_GLYPHS[carte.element] ?? '◇'} ${cardColorLabel(carte)}`;
  }
  const colors = cardColors(carte);
  return `${deckColorGlyph({ element: carte?.element, elements: colors })} ${cardColorLabel(carte)}${colors.includes('sable') ? ' · Désert' : ''}`;
}

function cardFrameType(carte) {
  if (carte?.kind === 'terrain') return 'terrain';
  if (carteEstArme(carte)) return 'arme';
  if (carte?.kind === 'magie') return 'magie';
  return 'creature';
}

/** La rareté ne colore plus rien : elle ne sert qu'au badge de l'aperçu. */
function cardRarityStyle(carte) {
  const { color } = cardRarityInfo(carte);
  return { '--rarity-color': color };
}

/** La même couleur d'élément habille le duel, le catalogue et l'atelier. */
function cardFrameStyle(carte) {
  return { '--rpg-frame-color': cardFrameColor(carte) };
}

/** Fiches des cartes d'arme portées, à partir de leurs identifiants. */
function cartesDesIds(ids = []) {
  return ids.map((id) => cardById(id)).filter(Boolean);
}

/** Le mot du sur-titre de la fiche : l'écran qui l'a ouverte — la table du
 *  duel, le catalogue — ou le jeu lui-même pour les autres (deck, guide,
 *  récit), que le clic droit ouvre aussi. */
const SURFACE_FICHE = { partie: 'DUEL', catalogue: 'CATALOGUE' };

/** Un bonus signé : « +2 », ou « -2 » pour le malus du Sabre maudit. */
function signeBonus(valeur = 0) {
  return valeur >= 0 ? `+${valeur}` : `${valeur}`;
}

/** Bonus d'une arme, « +2/+0 » : celui de l'arme du prototype, ou l'effet
 *  « arme » d'une magie (le Sabre maudit). */
function bonusArmeTexte(arme) {
  const bonus = bonusArme(arme);
  if (!bonus) return '';
  return `${signeBonus(bonus.atk ?? 0)}/${signeBonus(bonus.def ?? 0)}`;
}

/** Bonus et mots-clés qu'une arme confère directement à son porteur.
 *  La ligne n'affiche jamais le nom de l'arme : elle rejoint le texte d'effet
 *  de la créature, en bleu, pour que son équipement se lise comme un effet. */
function effetsAccordesParArme(arme) {
  const bonus = bonusArme(arme);
  if (!bonus) return '';
  const donne = arme.donne ?? (arme.effet?.type === 'arme' ? arme.effet : {});
  const effets = [];
  if (donne.infiltration) effets.push('Infiltration (ne peut pas être bloquée)');
  if (donne.rapidite) effets.push('Rapidité');
  if (donne.envol) effets.push('Envol');
  if (donne.coupRapide) effets.push('Coup rapide');
  if (donne.esquive) effets.push(`Esquive ${donne.esquive}`);
  if (donne.immunite) effets.push(`Immunité contre ${ELEMENT_LABELS[donne.immunite] ?? donne.immunite}`);
  if (donne.furie) effets.push(`Furie ${donne.furie}`);
  return `Bonus d’équipement : ${bonusArmeTexte(arme)}${effets.length ? ` · ${effets.join(' · ')}` : ''}`;
}

function deckStats(deck) {
  return deck.cardIds.reduce((stats, id) => {
    const carte = cardById(id);
    if (!carte) return stats;
    if (carte.kind === 'terrain') stats.terrains += 1;
    else if (carte.kind === 'arme' || carteEstArme(carte)) stats.armes += 1;
    else if (carte.kind === 'magie') stats.magies += 1;
    else stats.creatures += 1;
    return stats;
  }, { terrains: 0, creatures: 0, magies: 0, armes: 0 });
}

function deckCardList(deck) {
  const counts = new Map();
  deck.cardIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  return [...counts.entries()].map(([id, count]) => ({ carte: cardById(id), count })).filter((entry) => entry.carte);
}

/** Les trois familles de la fiche d'un deck : créatures, sorts, terrains.
 * Les héros comptent parmi les créatures — c'est déjà le découpage de
 * `deckStats`, donc la liste et les statistiques ne peuvent pas se contredire. */
function familleDeCarte(carte) {
  if (carte?.kind === 'terrain') return 'terrains';
  if (carteEstArme(carte)) return 'armes';
  if (carte?.kind === 'magie') return 'sorts';
  return 'creatures';
}

const RPG_DECK_FAMILLES = [
  { id: 'creatures', nom: 'Créatures', note: 'Les créatures et héros invoqués en jeu' },
  { id: 'sorts', nom: 'Sorts', note: 'Les magies, lancées depuis la main' },
  { id: 'armes', nom: 'Armes', note: 'Les armes, attachées à une créature alliée' },
  { id: 'terrains', nom: 'Terrains', note: 'Les sources de mana du deck' },
];

function targetMode(carte) {
  // Une arrivée en jeu qui désigne sa cible : sa portée vient du moteur
  // (`arriveeCiblePortee`), la même règle que celle qui exige et valide la
  // désignation — l'exil du Susanoo choisit dans les deux camps, le duel du
  // Cavalier chez l'adversaire. La créature qui la porte est **déjà posée** :
  // c'est la table qui s'allume, pas la main (voir `finaliserPoseCreature`).
  const porteeArrivee = arriveeCiblePortee(carte);
  if (porteeArrivee) return porteeArrivee;
  // Une arme se joue sur une créature alliée : c'est elle qu'on désigne.
  if (carteEstArme(carte)) return 'allie';
  if (carte?.effet?.type === 'degats' && carte.effet.cible === 'creature') return 'ennemi';
  if (['debuff', 'empeche-blocage', 'blocage-force'].includes(carte?.effet?.type)) return 'ennemi';
  // Renvoi en main : le joueur choisit la créature qui repart dans une main.
  if (carte?.effet?.type === 'retour-main') return carte.effet.cible === 'creature-amie' ? 'allie' : 'ennemi';
  if (['bouclier', 'arme'].includes(carte?.effet?.type) && carte.effet.cible === 'creature-amie') return 'allie';
  // Le Défi du Jarl se joue en deux désignations : le champion allié d'abord
  // (l'étape adverse est dérivée dans `modeCible`, une fois le champion choisi).
  if (carte?.effet?.type === 'combat' && carte.effet?.sourceCible === 'creature-amie') return 'allie';
  return null;
}

function FaceDownHand({ count, drawAnimations = [] }) {
  const visible = Math.min(count, 7);
  return (
    <div className="rpg-hidden-hand" aria-label={`Main adverse : ${count} cartes, faces cachées`}>
      <div className="rpg-hidden-hand__cards" aria-hidden="true">
        {Array.from({ length: visible }, (_, index) => {
          const draw = drawAnimations.find((animation) => animation.handIndex === index)
            ?? (index === visible - 1 ? drawAnimations.find((animation) => animation.handIndex >= visible) : null);
          return (
            <span
              key={index}
              className={`rpg-hidden-hand__card${draw ? ' rpg-hand-card--drawing' : ''}`}
              style={{
                '--card-angle': `${(index - (visible - 1) / 2) * 4}deg`,
                '--card-rise': `${Math.abs(index - (visible - 1) / 2) * 3}px`,
                '--rpg-draw-delay': `${draw?.delay ?? 0}ms`,
              }}
              data-draw-token={draw?.token}
            />
          );
        })}
      </div>
      <span className="rpg-hidden-hand__count">Main adverse · {count}</span>
    </div>
  );
}

function CardPile({ count, label, variant, topCard = null, drawing = false, drawToken = null, onHoverCard, onLeaveHoverCard }) {
  const carteDuDessus = topCard ? cardById(topCard) : null;
  return (
    <div
      className={`rpg-card-pile rpg-card-pile--${variant}${drawing ? ' is-drawing' : ''}`}
      aria-label={`${label} : ${count} carte${count === 1 ? '' : 's'}`}
      data-draw-token={drawing ? drawToken : undefined}
    >
      <span className="rpg-card-pile__stack" aria-hidden="true">
        <span className="rpg-card-pile__card rpg-card-pile__card--back" />
        <span className="rpg-card-pile__card rpg-card-pile__card--back" />
        {topCard
          ? <img
              className={`rpg-card-pile__card rpg-card-pile__card--top ${cardFrameClass(carteDuDessus)} ${cardMotifClass(carteDuDessus)}`}
              style={cardFrameStyle(carteDuDessus)}
              src={cardArt(topCard)}
              alt=""
              data-card-id={carteDuDessus?.id}
              onMouseEnter={(event) => onHoverCard?.(carteDuDessus, event)}
              onMouseLeave={onLeaveHoverCard}
            />
          : <span key={drawToken ?? 'deck-top'} className="rpg-card-pile__card rpg-card-pile__card--top rpg-card-pile__card--back" />}
      </span>
      <b>{count}</b>
      <small>{label}</small>
    </div>
  );
}

/** Vector stat symbols remain legible even on WebViews without emoji fonts. */
function CardStatIcon({ type }) {
  return <svg className="rpg-stat-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {type === 'attack'
      ? <><path d="M15 3h6v6L11 19l-6-6L15 3Z" /><path d="m3 11 10 10M8 16l-5 5" /></>
      : <path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z" />}
  </svg>;
}

/** Face full art : couleur, coût, type et statistiques des créatures. */
const BLOCKER_DRAG_TYPE = 'application/x-bab-el-blocker';

/** Une créature équipée se présente comme une pile : son arme glisse sous elle,
 *  décalée vers le haut et la droite, comme une carte posée dessous. La pile
 *  ne change rien au jeu — la créature reste l'unique cible et la seule carte
 *  qui agit ; seul le bord de l'arme dit qu'elle est équipée. */
function PileArmee({ armes = [], children }) {
  const arme = cardById(armes[0]);
  if (!arme) return children;
  return (
    <span className="rpg-card-stack rpg-card-stack--arme">
      <span className="rpg-card-stack__arme" aria-hidden="true" style={cardFrameStyle(arme)}>
        <img src={cardArt(arme)} alt="" />
      </span>
      {children}
    </span>
  );
}

export function TableCard({
  entite,
  cote,
  active,
  selected,
  blocking,
  canTarget,
  spellTarget = false,
  coupRapideCible = false,
  declaredAttacker = false,
  onClick,
  tilt,
  canDragBlocker = false,
  canReceiveBlocker = false,
  draggedBlocker = false,
  selectedBlocker = false,
  onStartBlockerDrag,
  onEndBlockerDrag,
  onAssignBlocker,
  actionFx = null,
  playerTurn = false,
  activationDispo = false,
  onActiver = null,
  tutorialTarget,
  onHoverCard,
  onLeaveHoverCard,
}) {
  const carte = cardById(entite.carteId);
  const hybride = cardColors(carte).length > 1;
  const nom = entite.name;
  const armeCarte = entite.arme ? cardById(entite.arme.carteId) : null;
  const armes = armesPortees(entite);
  const effetsArmesEquipees = cartesDesIds(armes).map(effetsAccordesParArme).filter(Boolean);
  const protectionActive = entite.protection?.toursRestants > 0;
  const protectionLabel = protectionActive
    ? ELEMENT_LABELS[entite.protection.contre] ?? entite.protection.contre
    : null;
  const gelee = (entite.gelToursRestants ?? 0) > 0;
  const blessee = entite.pv < (entite.pvMax ?? carte?.def ?? entite.pv);
  // La valeur imprimée reste le point neutre : chaque statistique peut ainsi
  // signaler séparément un bonus (bleu clair) ou un malus (rouge). Pour la
  // défense, on compare la valeur réellement montrée — les PV restants.
  const classeAttaque = classeVariationStatCreature(entite.atk, carte?.atk);
  const classeDefense = classeVariationStatCreature(entite.pv, carte?.def);
  const libelleAttaque = libelleVariationStatCreature(classeAttaque);
  const libelleDefense = libelleVariationStatCreature(classeDefense);
  const variationsStats = [
    libelleAttaque && `attaque ${libelleAttaque}`,
    libelleDefense && `défense ${libelleDefense}`,
  ].filter(Boolean).join(', ');
  const annonceVariationsStats = variationsStats
    ? `, ${variationsStats}`
    : actionFx?.statsUp ? ', attaque ou défense augmentée' : '';
  const activation = carte?.activation;
  const malInvocation = cote === 'joueur' && playerTurn && !entite.ready && !entite.attaquee;
  const [blockDropHover, setBlockDropHover] = useState(false);
  const [entreeEnCours, setEntreeEnCours] = useState(true);
  const cardRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntreeEnCours(false), 620);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const element = cardRef.current;
    const mouvementReduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!entite.envol || mouvementReduit || typeof element?.animate !== 'function') return undefined;

    // Un léger va-et-vient sur `left` garde l'inclinaison, l'élévation et les
    // animations CSS d'attaque indépendantes ; position:relative ne redistribue
    // pas la place de la carte dans la rangée.
    const balancement = element.animate(
      [{ left: '-2px' }, { left: '2px' }],
      { duration: 2800, direction: 'alternate', easing: 'ease-in-out', iterations: Infinity },
    );
    return () => balancement.cancel();
  }, [entite.envol]);

  const commencerGlisserBloqueur = (event) => {
    if (!canDragBlocker) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData(BLOCKER_DRAG_TYPE, entite.id);
    event.dataTransfer?.setData('text/plain', entite.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    onStartBlockerDrag?.(entite.id);
  };

  const survolerCibleBlocage = (event) => {
    if (!canReceiveBlocker) return;
    const types = Array.from(event.dataTransfer?.types ?? []);
    if (!types.includes(BLOCKER_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setBlockDropHover(true);
  };

  const quitterCibleBlocage = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setBlockDropHover(false);
  };

  const deposerBloqueur = (event) => {
    const bloqueurId = event.dataTransfer?.getData(BLOCKER_DRAG_TYPE);
    if (!canReceiveBlocker || !bloqueurId) return;
    event.preventDefault();
    event.stopPropagation();
    setBlockDropHover(false);
    onAssignBlocker?.(entite.id, bloqueurId);
  };

  return (
    <button
      ref={cardRef}
      type="button"
      className={[
        `rpg-card rpg-card--img rpg-card--elem-${carte?.element ?? 'sable'} rpg-card--type-${cardFrameType(carte)}`,
        cote === 'ennemi' ? 'rpg-card--ennemi' : 'rpg-card--equipe',
        cardFrameClass(carte),
        cardMotifClass(carte),
        carte?.kind === 'hero' ? 'rpg-card--legendaire' : '',
        entite.envol ? 'is-envol' : '',
        gelee ? 'is-frozen' : '',
        active ? 'is-active' : '',
        selected ? 'is-selected' : '',
        selectedBlocker ? 'is-blocker-selected' : '',
        blocking ? 'is-blocking' : '',
        entite.attaquee ? 'is-attacked' : '',
        declaredAttacker && !entite.attaquee ? 'is-declared-attacker' : '',
        rpgPeutAttaquer(entite) ? 'is-pret' : '',
        malInvocation ? 'is-summoning-sick' : '',
        blessee ? 'is-wounded' : '',
        canTarget ? 'is-ciblable' : '',
        spellTarget ? 'is-spell-target' : '',
        coupRapideCible ? 'is-coup-rapide-cible' : '',
        canDragBlocker ? 'is-blocker-draggable' : '',
        blocking ? 'is-blocker-assigned' : '',
        draggedBlocker ? 'is-blocker-dragging' : '',
        canReceiveBlocker ? 'is-blocker-target' : '',
        blockDropHover ? 'is-blocker-target-hover' : '',
        entreeEnCours ? 'fx-enter' : '',
        actionFx?.type === 'attack' ? 'fx-lunge' : '',
        actionFx?.type === 'hit' ? 'fx-hit' : '',
        actionFx?.type === 'glow' ? 'fx-glow' : '',
        actionFx?.type === 'block' ? 'fx-block' : '',
        actionFx?.type === 'unblock' ? 'fx-unblock' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--tilt': `${tilt}deg`, ...cardFrameStyle(carte) }}
      data-combat-tilted={declaredAttacker || entite.attaquee ? 'true' : 'false'}
      data-entity-id={entite.id}
      data-card-id={carte?.id}
      data-armes={armes.length ? armes.join(' ') : undefined}
      data-tutorial-target={tutorialTarget}
      draggable={canDragBlocker}
      onClick={onClick}
      onMouseEnter={(event) => onHoverCard?.(carte, event, armes)}
      onMouseLeave={onLeaveHoverCard}
      onFocus={(event) => onHoverCard?.(carte, event, armes)}
      onBlur={onLeaveHoverCard}
      onDragStart={commencerGlisserBloqueur}
      onDragEnd={() => onEndBlockerDrag?.(entite.id)}
      onDragOver={survolerCibleBlocage}
      onDragLeave={quitterCibleBlocage}
      onDrop={deposerBloqueur}
      aria-label={`${nom}, ${cardFaceTypeLine(carte)}, couleur ${carte?.element ?? 'inconnue'}, coût ${carte?.cost ?? 0}, attaque ${entite.atk}, défense ${entite.pv}${annonceVariationsStats}${carte?.honneur ? `, honneur ${carte.honneur} : à sa mort, inflige ${carte.honneur} dégâts à une créature adverse au hasard` : ''}${carte?.resonance ? `, ${carte.resonanceTribu === 'samourai' ? 'résonance samouraï : seules les créatures de type Samouraï' : `résonance : toutes les créatures ${ELEMENT_LABELS[carte.element]}`} des deux camps gagnent +${carte.resonance}/+${carte.resonance}` : ''}${carte?.banniere ? `, bannière : chaque fois qu’un Samouraï du camp de la source attaque, il gagne +${carte.banniere.atk}/+${carte.banniere.def}` : ''}${carte?.aura?.type === 'buff-tribu' ? `, aura de forge : les autres créatures de type Samouraï des deux camps gagnent +${carte.aura.atk}/+${carte.aura.def}` : ''}${carte?.butin ? ', Butin : toucher le sorcier adverse fait piocher puis défausser une carte' : ''}${entite.coupRapide ? ', Coup rapide : peut frapper une créature adverse avant le combat et arrêter là son attaque, sinon elle attaque normalement' : ''}${effetsArmesEquipees.length ? `, ${effetsArmesEquipees.join(', ')}` : ''}${entite.rapidite ? ', rapidité, peut attaquer le tour où elle arrive' : ''}${entite.envol ? ', envol, ne peut être bloquée que par une créature avec envol' : ''}${entite.infiltration ? ', infiltration, ne peut pas être bloquée' : ''}${entite.tenaciteDisponible ? ', tenacité : survivra une fois à une destruction avec 1 de défense' : ''}${activation ? `, capacité activée : payer ${activation.cout} mana de glace, inflige ${activation.effet?.amount ?? 0} blessures à une créature au choix` : ''}${protectionActive ? `, protection contre ${protectionLabel} pendant encore ${entite.protection.toursRestants} tour${entite.protection.toursRestants > 1 ? 's' : ''}` : ''}${entite.esquive ? `, esquive ${entite.esquive} contre les attaques et magies` : ''}${entite.attaquee ? `, engagée, elle se dégagera au début du prochain tour ${cote === 'ennemi' ? 'du sorcier' : 'du joueur'}` : ''}${gelee ? ', gelée : ne peut ni attaquer ni bloquer, aucune blessure infligée pendant ce combat' : ''}${entite.empecheAttaqueToursRestants > 0 ? ', venin : ne peut pas attaquer jusqu’à la fin de son prochain tour' : ''}${blessee ? ', blessée' : ''}${malInvocation ? ', mal d’invocation' : ''}${entite.heures?.restants ? `, ${entite.heures.restants} compteur${entite.heures.restants > 1 ? 's' : ''} d’Heures sur la créature` : ''}${entite.arme?.compteurs ? `, ${entite.arme.compteurs} compteur${entite.arme.compteurs > 1 ? 's' : ''} de sable sur son arme` : ''}${entite.bouclier ? `, bouclier ${entite.bouclier}` : ''}${blocking ? ', bloqueur assigné, flèche jaune vers son attaquant' : ''}${canDragBlocker ? ', bloqueur disponible, glisser sur une créature attaquante' : ''}${selectedBlocker ? ', bloqueur sélectionné, cliquez une créature attaquante pour lui assigner le blocage' : ''}${spellTarget ? ', ciblée par le sort annoncé, lueur rouge' : ''}${coupRapideCible ? ', ciblée par Coup rapide, lueur rouge' : ''}`}
      aria-pressed={Boolean(selected || selectedBlocker)}
    >
      <img className="rpg-card__img" src={cardArt(carte)} alt="" aria-hidden="true" />
      {blessee && <span className="rpg-card__blood" aria-hidden="true" />}
      {gelee && <span className="rpg-card__frost" aria-hidden="true">
        <span className="rpg-card__frost-crystals" />
        <span className="rpg-card__frozen-label">❄ Gelée</span>
      </span>}
      {!!entite.armes?.length && <span className="rpg-card__weapons" title="Arme équipée" aria-hidden="true">
        {entite.armes.map((id, index) => <img key={`${id}-${index}`} src={cardArt(id)} alt="" />)}
      </span>}
      <CardElementBadge carte={carte} />
      {/* Les losanges de compteurs sont sous la couleur d'une carte mono,
          sous le coût d'une hybride (ses deux pastilles occupent la gauche).
          Ceux de la Jitte restent sur l'arme dans le moteur ; sa créature
          porteuse les montre ici, sans texte ni bonus d'arme. */}
      {(entite.heures?.restants > 0 || (armeCarte && entite.arme?.compteurs > 0)) && (
        <span className={`rpg-card__compteurs${hybride ? ' rpg-card__compteurs--hybride' : ''}`} aria-hidden="true">
          {entite.heures?.restants > 0 && (
            <span className="rpg-card__compteur rpg-card__compteur--heures" data-compteur="heures">
              <span>{entite.heures.restants}</span>
            </span>
          )}
          {armeCarte && entite.arme?.compteurs > 0 && (
            <span className="rpg-card__compteur rpg-card__compteur--sable" data-compteur="sable">
              <span>{entite.arme.compteurs}</span>
            </span>
          )}
        </span>
      )}
      <header className="rpg-card__title">
        <ManaCost carte={carte} compact showElement={false} />
      </header>
      {activation && cote === 'joueur' && onActiver && (
        <span
          className={`rpg-card__activation${activationDispo ? ' is-pret' : ''}`}
          role="button"
          tabIndex={activationDispo ? 0 : -1}
          aria-label={`Activé — payer ${activation.cout} mana de glace : inflige ${activation.effet?.amount ?? 0} blessures à une créature au choix${activationDispo ? '' : ' (indisponible pour le moment)'}`}
          onClick={(event) => { event.stopPropagation(); onActiver(); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onActiver();
            }
          }}
        >
          <span className="rpg-mana-cost rpg-mana-cost--neige is-compact" aria-hidden="true">
            <b>{activation.cout}</b>
            <i>{ELEMENT_GLYPHS.neige ?? '◇'}</i>
          </span>
        </span>
      )}
        <footer className="rpg-card__foot" aria-label={`Attaque ${entite.atk}, défense ${entite.pv}${annonceVariationsStats}${entite.empecheAttaqueToursRestants > 0 ? ', venin : ne peut pas attaquer jusqu’à la fin de son prochain tour' : ''}${blessee ? ', blessée' : ''}`}>
          <span
            className={`rpg-card__stat--atk${classeAttaque ? ` ${classeAttaque}` : ''}`}
            data-stat-variation={classeAttaque === 'is-buffed' ? 'buff' : classeAttaque === 'is-debuffed' ? 'debuff' : undefined}
          >
            <CardStatIcon type="attack" /><span className="rpg-stat-value">{entite.atk}</span>
          </span>
          <span
            className={`rpg-card__pt${blessee ? ' is-wounded' : ''}${classeDefense ? ` ${classeDefense}` : ''}`}
            data-stat-variation={classeDefense === 'is-buffed' ? 'buff' : classeDefense === 'is-debuffed' ? 'debuff' : undefined}
          >
            <CardStatIcon type="defense" /><span className="rpg-stat-value">{entite.pv}</span>
          </span>
        </footer>
      </button>
  );
}

function BlockerArrows({ tableRef, assignments }) {
  const [layout, setLayout] = useState({ width: 0, height: 0, arrows: [] });
  const arrowCount = Object.values(assignments ?? {}).reduce((total, ids) => total + (ids?.length ?? 0), 0);

  useEffect(() => {
    if (!arrowCount) {
      setLayout((previous) => previous.arrows.length ? { width: 0, height: 0, arrows: [] } : previous);
      return undefined;
    }

    const update = () => {
      const table = tableRef.current;
      if (!table) return;
      const tableRect = table.getBoundingClientRect();
      const width = tableRect.width || table.clientWidth;
      const height = tableRect.height || table.clientHeight;
      if (!width || !height) return;

      const cards = [...table.querySelectorAll('[data-entity-id]')];
      const findCard = (id) => cards.find((card) => card.dataset.entityId === id);
      const arrows = [];
      const point = (rect) => ({
        x: rect.left + rect.width / 2 - tableRect.left + table.scrollLeft,
        y: rect.top + rect.height / 2 - tableRect.top + table.scrollTop,
      });
      const cardGeometry = (card) => {
        const rect = card.getBoundingClientRect();
        const transform = window.getComputedStyle?.(card)?.transform ?? 'none';
        const matrixValues = transform.match(/^matrix(?:3d)?\(([^)]+)\)$/)?.[1]
          ?.split(',').map((value) => Number.parseFloat(value.trim()));
        const angle = matrixValues?.length >= 2
          ? Math.atan2(matrixValues[1], matrixValues[0])
          : 0;
        return {
          center: point(rect),
          width: card.offsetWidth || rect.width,
          height: card.offsetHeight || rect.height,
          angle,
        };
      };
      const edgePoint = (shape, dx, dy) => {
        const cos = Math.cos(shape.angle);
        const sin = Math.sin(shape.angle);
        const localX = cos * dx + sin * dy;
        const localY = -sin * dx + cos * dy;
        const length = Math.hypot(localX, localY) || 1;
        const ux = localX / length;
        const uy = localY / length;
        const scale = 1 / Math.max(Math.abs(ux) / Math.max(shape.width / 2, 1), Math.abs(uy) / Math.max(shape.height / 2, 1));
        const localEdgeX = ux * scale;
        const localEdgeY = uy * scale;
        return {
          x: shape.center.x + cos * localEdgeX - sin * localEdgeY,
          y: shape.center.y + sin * localEdgeX + cos * localEdgeY,
        };
      };
      const format = (value) => Number(value.toFixed(1));

      Object.entries(assignments ?? {}).forEach(([attackerId, blockerIds]) => {
        const attackerCard = findCard(attackerId);
        if (!attackerCard || !blockerIds?.length) return;
        const attackerShape = cardGeometry(attackerCard);
        const attackerCenter = attackerShape.center;
        blockerIds.forEach((blockerId, index) => {
          const blockerCard = findCard(blockerId);
          if (!blockerCard) return;
          const blockerShape = cardGeometry(blockerCard);
          const blockerCenter = blockerShape.center;
          const dx = attackerCenter.x - blockerCenter.x;
          const dy = attackerCenter.y - blockerCenter.y;
          const start = edgePoint(blockerShape, dx, dy);
          const end = edgePoint(attackerShape, -dx, -dy);
          const length = Math.hypot(dx, dy) || 1;
          const normalX = -dy / length;
          const normalY = dx / length;
          const spread = (index - (blockerIds.length - 1) / 2) * 18;
          const controlX = (start.x + end.x) / 2 + normalX * spread;
          const controlY = (start.y + end.y) / 2 + normalY * spread;
          const path = `M ${format(start.x)} ${format(start.y)} Q ${format(controlX)} ${format(controlY)} ${format(end.x)} ${format(end.y)}`;
          arrows.push({ key: `${attackerId}:${blockerId}`, path });
        });
      });

      setLayout((previous) => {
        const sameArrows = previous.arrows.length === arrows.length
          && previous.arrows.every((arrow, index) => arrow.key === arrows[index]?.key && arrow.path === arrows[index]?.path);
        return previous.width === width && previous.height === height && sameArrows
          ? previous
          : { width, height, arrows };
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const Observer = window.ResizeObserver ?? globalThis.ResizeObserver;
    const observer = Observer ? new Observer(update) : null;
    const table = tableRef.current;
    if (observer && table) {
      observer.observe(table);
      table.querySelectorAll('[data-entity-id]').forEach((card) => observer.observe(card));
    }
    const frame = window.requestAnimationFrame?.(update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      observer?.disconnect();
      if (frame !== undefined) window.cancelAnimationFrame?.(frame);
    };
  }, [assignments, arrowCount, tableRef]);

  if (!arrowCount) return null;
  return (
    <svg
      className="rpg-blocker-arrows"
      viewBox={`0 0 ${layout.width || 1} ${layout.height || 1}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      data-arrow-count={arrowCount}
    >
      <defs>
        <marker id="rpg-blocker-arrow-tip" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 12 6 L 0 12 Z" className="rpg-blocker-arrow__tip" />
        </marker>
      </defs>
      {layout.arrows.map((arrow) => (
        <g key={arrow.key}>
          <path d={arrow.path} className="rpg-blocker-arrow__glow" />
          <path d={arrow.path} className="rpg-blocker-arrow__shaft" markerEnd="url(#rpg-blocker-arrow-tip)" />
        </g>
      ))}
    </svg>
  );
}

/**
 * La lumière du Sablier — l'angle sous lequel on regarde le plateau.
 *
 * Une carte brillante n'a pas de reflet qui tourne tout seul : le reflet bouge
 * quand la carte bouge, parce qu'on la regarde sous un autre angle. On pose donc
 * ici un seul angle de vue pour tout le plateau, lu sur le curseur, et toutes
 * les faces en héritent. Une seule écoute pour des centaines de cartes, et deux
 * variables sur `<html>` — les faces se contentent de les lire.
 *
 * Rien au doigt : là il n'y a pas de curseur, et le reflet d'une carte qu'on
 * touche n'a personne à suivre.
 */
function useLumiereCartes() {
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches) return undefined;
    const racine = document.documentElement;
    let frame = 0;
    let point = null;
    const appliquer = () => {
      frame = 0;
      if (!point) return;
      racine.style.setProperty('--rpg-foil-cx', `${point.x}%`);
      racine.style.setProperty('--rpg-foil-cy', `${point.y}%`);
    };
    const suivre = (event) => {
      if (event.pointerType === 'touch') return;
      // ±38 % : assez pour que la face s'écarte franchement du reflet, assez
      // peu pour qu'aucune tache ne quitte la carte.
      const x = ((event.clientX / Math.max(window.innerWidth, 1)) - 0.5) * 2;
      const y = ((event.clientY / Math.max(window.innerHeight, 1)) - 0.5) * 2;
      point = { x: (x * 38).toFixed(1), y: (y * 38).toFixed(1) };
      if (!frame) frame = window.requestAnimationFrame(appliquer);
    };
    window.addEventListener('pointermove', suivre, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', suivre);
      racine.style.removeProperty('--rpg-foil-cx');
      racine.style.removeProperty('--rpg-foil-cy');
    };
  }, []);
}

function HoverCardPreview({ carte, style = null, spellPlayed = false, variante = '', cible = null, controls = null, panelRef = null, armes = [], surface = null }) {
  const faceRef = useRef(null);
  const carteId = carte?.id ?? null;

  // L'aperçu est la seule carte qui suit le curseur : sa face s'incline vers
  // lui, et revient au repos par inertie dès qu'il s'en éloigne.
  //
  // L'écoute est portée par la fenêtre, pas par le panneau : l'aperçu est posé
  // en `pointer-events: none` pour ne pas voler le survol à la carte qu'il
  // commente. On ne penche donc que quand le curseur est vraiment sur la face —
  // une marge de quelques pixels autour, le temps que le volet se place.
  //
  // Rien au doigt : là il n'y a pas de curseur à suivre, et le volet se referme
  // d'un toucher — incliner une fiche qu'on referme n'aurait pas de sens.
  useEffect(() => {
    const face = faceRef.current;
    if (!face) return undefined;
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches) return undefined;
    const MAX = 9;
    const MARGE = 28;
    let frame = 0;
    let point = null;
    let pose = false;
    const borne = (valeur) => Math.max(-1, Math.min(1, valeur));
    const focale = Number.parseFloat(
      window.getComputedStyle(face).getPropertyValue('--rpg-face-3d-focale'),
    ) || 880;
    /* La perspective agrandit le côté qui vient vers le pointeur : penchée, la
       carte déborde de sa propre boîte, et le volet — qui masque ce qui dépasse —
       lui rognerait les bords. On annule exactement cette agrandissement par un
       facteur d'échelle calculé sur la taille réelle de la face. La carte garde
       donc son gabarit et ne sort plus de son cadre. */
    const facteurCadre = (point) => {
      const tx = (point.inclineX * Math.PI) / 180;
      const ty = (point.inclineY * Math.PI) / 180;
      const z = (point.demiA * Math.abs(Math.sin(ty))) + (point.demiB * Math.abs(Math.sin(tx)));
      const k = focale / Math.max(focale - z, 1);
      return Math.min(1, 1 / (Math.cos(ty) * k), 1 / (Math.cos(tx) * k)) * 0.995;
    };
    const appliquer = () => {
      frame = 0;
      if (!point) return;
      face.style.setProperty('--rpg-face-3d-x', `${point.inclineX.toFixed(2)}deg`);
      face.style.setProperty('--rpg-face-3d-y', `${point.inclineY.toFixed(2)}deg`);
      face.style.setProperty('--rpg-face-3d-s', `${facteurCadre(point).toFixed(4)}`);
      // Le reflet part de la même inclinaison : c'est ce qui fait lire la face
      // comme une carte brillante tenue à la main — on la tourne, et les
      // taches d'arc-en-ciel glissent avec elle au lieu de tourner seules.
      face.style.setProperty('--rpg-foil-cx', `${(point.nx * 46).toFixed(1)}%`);
      face.style.setProperty('--rpg-foil-cy', `${(point.ny * 46).toFixed(1)}%`);
      face.classList.add('is-suit-la-souris');
      pose = true;
    };
    const figer = () => {
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      point = null;
      if (!pose) return;
      pose = false;
      face.classList.remove('is-suit-la-souris');
      face.style.setProperty('--rpg-face-3d-x', '0deg');
      face.style.setProperty('--rpg-face-3d-y', '0deg');
      face.style.setProperty('--rpg-face-3d-s', '1');
      // Le reflet rend la main à la lumière du plateau.
      face.style.removeProperty('--rpg-foil-cx');
      face.style.removeProperty('--rpg-foil-cy');
    };
    const suivre = (event) => {
      if (event.pointerType === 'touch') return;
      const boite = face.getBoundingClientRect();
      if (!boite.width || !boite.height) return;
      const dx = event.clientX - boite.left;
      const dy = event.clientY - boite.top;
      const surLaFace = dx >= -MARGE && dx <= boite.width + MARGE
        && dy >= -MARGE && dy <= boite.height + MARGE;
      if (!surLaFace) { figer(); return; }
      const nx = borne(((dy / boite.height) - 0.5) * 2);
      const ny = borne(((dx / boite.width) - 0.5) * -2);
      point = {
        nx,
        ny,
        inclineX: nx * MAX,
        inclineY: ny * MAX,
        demiA: boite.width / 2,
        demiB: boite.height / 2,
      };
      // Un `pointermove` par image : la face suit le curseur sans qu'on
      // réécrive ses variables une fois par pixel parcouru.
      if (!frame) frame = window.requestAnimationFrame(appliquer);
    };
    window.addEventListener('pointermove', suivre, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', suivre);
      figer();
    };
  }, [carteId]);

  if (!carte) return null;
  const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
  const estTerrain = carte.kind === 'terrain';
  // La même signature que celle de la main : la face de l'aperçu — survol,
  // appui long, fiche du catalogue, annonce — porte le socle de la famille, et
  // sa ligne de type prend la teinte de cette famille.
  const ligneFamille = classeLigneFamille(carte);
  const effet = carte.text && carte.text !== '—' ? carte.text : null;
  const effets = cardEffectLines(effet);
  const cibleAnnoncee = variante === 'annonce' ? cible : null;
  const cibleLabel = cibleAnnoncee?.nom ? `, cible ${cibleAnnoncee.nom}` : '';
  // La fiche du catalogue : la carte ouverte d'un clic, en grand. Elle se lit
  // comme une fiche de collection — sur-titre, nom, famille, couleur — là où
  // l'aperçu de jeu va droit au coût et aux effets.
  const estFiche = variante === 'catalogue';
  // La petite carte montre le nom et l'effet complet de chaque arme portée.
  // Ses bonus directs **ouvrent** aussi le texte d'effet de la créature : en
  // bleu, sans répéter le nom, avant les propres lignes de la créature.
  const armesEquipees = estCreature ? armes.filter(Boolean) : [];
  const effetsArmesEquipees = armesEquipees.map(effetsAccordesParArme).filter(Boolean);
  const details = (
    <>
      {variante === 'annonce' && <span className="rpg-hover-card-preview__eyebrow">CARTE ANNONCÉE</span>}
      {estFiche && <span className="rpg-hover-card-preview__eyebrow">{surface ? `${surface} · ` : ''}{carteFamille(carte).toUpperCase()}</span>}
      {(variante === 'annonce' || estFiche) && <strong className="rpg-hover-card-preview__name">{carte.name}</strong>}
      {(estFiche || !estCreature) && <p className={`rpg-hover-card-preview__type${ligneFamille}`}>{cardFaceTypeLine(carte)}</p>}
      <PastillesCarte carte={carte} className="rpg-hover-card-preview__pastilles" />
      {estFiche && <p className="rpg-hover-card-preview__color">{cardColorLine(carte)}</p>}
      {cibleAnnoncee && (
        <div className="rpg-spell-played__target rpg-hover-card-preview__target">
          {(cibleAnnoncee.illustrationUrl || cibleAnnoncee.illustrationId)
            ? <img src={cibleAnnoncee.illustrationUrl ?? cardArt(cibleAnnoncee.illustrationId)} alt="" />
            : <span className="rpg-spell-played__target-mark" aria-hidden="true">⌖</span>}
          <span><small>CIBLE</small><b>{cibleAnnoncee.nom}</b></span>
        </div>
      )}
      {!estTerrain && <p className="rpg-hover-card-preview__cost"><span>Coût</span><b>{carte.cost}</b>{cardColors(carte).length > 1 && <small>{cardColorCostLabel(carte)}</small>}</p>}
      {armesEquipees.length > 0 && (
        <div className="rpg-hover-card-preview__weapons" role="group" aria-label="Armes équipées">
          {armesEquipees.map((arme, index) => (
            <figure className="rpg-hover-card-preview__weapon" data-arme-equipee={arme.id} key={`${arme.id}-${index}`}>
              <span className="rpg-hover-card-preview__weapon-art" aria-hidden="true">
                <img src={cardArt(arme)} alt="" />
                <span className="rpg-hover-card-preview__weapon-cost">{arme.cost}</span>
              </span>
              <figcaption>
                <strong>{arme.name}</strong>
                {arme.text && arme.text !== '—' && <small>{arme.text}</small>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {(effet || effetsArmesEquipees.length > 0) && (
        <div className="rpg-hover-card-preview__rules" aria-label="Effets">
          {/* La ligne bleue de l'équipement passe en tête : elle dit ce que le
              porteur devient, avant les effets propres de sa carte. */}
          {effetsArmesEquipees.map((ligne, index) => (
            <span
              key={`equipement-${index}-${ligne}`}
              className="rpg-hover-card-preview__rule--equipment"
              data-effet-equipement
            >
              {ligne}
            </span>
          ))}
          {effets.map((ligne, index) => <span key={`${index}-${ligne}`}><RpgCardRules carte={carte} text={ligne} /></span>)}
        </div>
      )}
      {carteEstArme(carte) && <p className="rpg-hover-card-preview__stats">Porteur : {signeBonus(bonusArme(carte)?.atk)} ⚔ <span>·</span> {signeBonus(bonusArme(carte)?.def)} 🛡</p>}
    </>
  );
  const face = (
    <div
      ref={faceRef}
      className={`rpg-hover-card-preview__face ${cardFrameClass(carte)} ${cardMotifClass(carte)}`}
      style={cardFrameStyle(carte)}
      aria-hidden="true"
    >
      <img src={cardArt(carte)} alt="" />
      <CardElementBadge carte={carte} />
      <ManaCost carte={carte} showElement={false} />
      <SortSceau carte={carte} className="rpg-hover-card-preview__sceau rpg-hover-card-preview__sort" />
      {estCreature && (
        <footer className="rpg-card__foot" aria-label={`Attaque ${carte.atk}, défense ${carte.def}`}>
          <span className="rpg-card__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{carte.atk}</span></span>
          <span className="rpg-card__pt"><CardStatIcon type="defense" /><span className="rpg-stat-value">{carte.def}</span></span>
        </footer>
      )}
    </div>
  );
  return (
    <aside
      ref={panelRef}
      className={`rpg-hover-card-preview${variante ? ` rpg-hover-card-preview--${variante}` : ''} rpg-hover-card-preview--${carte.element} rpg-hover-card-preview--type-${cardFrameType(carte)} ${cardFrameClass(carte)}${estTerrain ? ' rpg-hover-card-preview--terrain' : ''}${spellPlayed ? ' is-spell-preview' : ''}`}
      role={variante === 'annonce' ? 'group' : 'tooltip'}
      aria-label={`Aperçu de ${carte.name} : ${cardFaceTypeLine(carte)}${estTerrain ? '' : `, coût ${cardCostLabel(carte)}`}${armesEquipees.length ? `, armes équipées ${armesEquipees.map((arme) => arme.name).join(', ')}` : ''}${effetsArmesEquipees.length ? `, effets d’équipement ${effetsArmesEquipees.join(', ')}` : ''}${effet ? `, effet ${effet}` : ''}${estCreature ? `, attaque ${carte.atk}, défense ${carte.def}` : ''}${cibleLabel}`}
      style={{ ...style, ...cardFrameStyle(carte) }}
    >
      {variante === 'annonce' ? (
        <div className="rpg-hover-card-preview__layout">
          {face}
          <div className="rpg-hover-card-preview__details-column">
            <div className="rpg-hover-card-preview__details">{details}</div>
            {controls}
          </div>
        </div>
      ) : (
        <>
          {face}
          <div className="rpg-hover-card-preview__details">{details}</div>
        </>
      )}
    </aside>
  );
}

/** L'aperçu au doigt : une seconde d'appui sur une carte ouvre le même contenu
 * que le survol de la souris, posé sur un volet sombre qui l'isole du plateau.
 * N'importe quel toucher — le volet ou le bouton — le referme. L'appui long ne
 * joue jamais la carte : c'est une consultation, pas une action. */
function ApercuCarteAppuiLong({ carte, armes = [], onFermer }) {
  const boutonFermerRef = useRef(null);
  // Le focus arrive sur « Fermer l'aperçu » sans faire défiler la page :
  // un `scroll` même minuscule interromptrait un appui long encore en cours —
  // ou aurait laissé passer le clic qui suit la levée du doigt et refermé le
  // volet à peine ouvert (`rpgLongPress.js`).
  useEffect(() => {
    boutonFermerRef.current?.focus({ preventScroll: true });
  }, []);
  if (!carte) return null;
  return (
    <div
      className="rpg-card-peek"
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${carte.name}`}
      onClick={onFermer}
    >
      <div className="rpg-card-peek__backdrop" aria-hidden="true" />
      <div className="rpg-card-peek__panel">
        <HoverCardPreview carte={carte} armes={armes} variante="appui-long" />
      </div>
      <button type="button" ref={boutonFermerRef} className="rpg-btn rpg-btn--ghost rpg-card-peek__close" onClick={onFermer}>
        Fermer l’aperçu
      </button>
    </div>
  );
}

/** La fiche d'une carte : une carte **cliquée** s'ouvre en grand sur le même
 * volet sombre que l'appui long — l'illustration entière dans son cadre
 * d'élément, puis le nom, la famille, la couleur, le coût, les effets ligne par
 * ligne et les statistiques. Elle est née au catalogue, où le clic l'ouvre
 * depuis toujours, et c'est aussi elle que le **clic droit** ouvre partout
 * ailleurs dans le jeu (`surMenuContextuel`) : la table du duel, la liste d'un
 * deck, le guide. Consulter ne joue rien : le clic ne touche ni aux filtres ni
 * à la grille, ne quitte pas l'onglet, et ne déclare aucune attaque. Le volet,
 * Échap ou le bouton Fermer referment la fiche.
 *
 * **Une carte, une fiche.** Le volet ne montre que la carte désignée — celle
 * qu'on a cliquée, ou celle qu'on a cliquée droit : pas de flèches sur les
 * côtés, pas de compteur, pas de balayage, rien à feuilleter. On y lit ce qu'on
 * a ouvert ; pour lire une autre carte, on ouvre la sienne.
 *
 * `surface` est le mot du sur-titre — l'écran qui a ouvert la fiche ; `armes`
 * sont celles que porte la créature ouverte, quand le duel les connaît. */
function ApercuCarteCatalogue({ carte, armes = [], surface = 'CATALOGUE', onFermer }) {
  const boutonFermerRef = useRef(null);
  // Le focus va au bouton Fermer sans faire défiler la grille : le catalogue
  // reste où le joueur l'avait laissé, et Échap referme depuis là.
  useEffect(() => {
    boutonFermerRef.current?.focus({ preventScroll: true });
  }, []);
  if (!carte) return null;
  return (
    <div
      className="rpg-card-peek rpg-card-peek--catalogue"
      role="dialog"
      aria-modal="true"
      aria-label={`Fiche de ${carte.name}`}
      data-catalogue-preview={carte.id}
      onClick={onFermer}
    >
      <div className="rpg-card-peek__backdrop" aria-hidden="true" />
      <div className="rpg-card-peek__panel">
        <HoverCardPreview carte={carte} variante="catalogue" armes={armes} surface={surface} />
      </div>
      <div className="rpg-card-peek__bar">
        <button
          type="button"
          ref={boutonFermerRef}
          className="rpg-btn rpg-btn--ghost rpg-card-peek__close"
          onClick={(event) => { event.stopPropagation(); onFermer(); }}
        >
          Fermer la fiche
        </button>
      </div>
    </div>
  );
}

/* ── Le mulligan : la main de départ, nue — l'aperçu dit le reste ─────────────
   Avant le premier tour, chaque camp voit ses cartes piochées : des **faces
   4:5** comme sur la table, sans un mot d'interface — l'illustration, la couleur
   en haut à gauche, le coût en haut à droite, et en bas les plaques d'attaque et
   de défense du jeu — plus la ligne de type pour les terrains et les sorts, la
   face d'une créature n'ayant pas besoin de l'annoncer. Le reste du texte (nom, effets) se
   lit dans l'**aperçu rapide** : au survol d'une carte à la souris, à l'appui
   long d'une seconde au doigt. Toucher une carte la met de côté (liseré doré),
   la retoucher la reprend : elles repartent dans le paquet, qui est battu, et
   le camp pioche autant de cartes qu'il en a écartées. Un seul échange, et la
   main ne diminue jamais : c'est une décision, pas une punition. */
function CarteMulligan({ carte, index, selectionnee, nouvelle, survol, onBasculer, onSurvol, onQuitterSurvol }) {
  if (!carte) return null;
  const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
  // Le mulligan montre la même main que le duel : un sort y reçoit donc le
  // sceau de sa famille, au-dessus de sa ligne de type — qui prend sa teinte.
  const familleSort = magieFamille(carte);
  return (
    <button
      type="button"
      onClick={() => onBasculer(index)}
      // Le survol ouvre l'aperçu rapide ; le doigt garde l'appui long d'une
      // seconde, que la page arme depuis la table (`demarrerAppuiLongCarte`) :
      // la carte porte un `data-card-id`, comme toutes celles du jeu.
      onMouseEnter={survol ? (event) => onSurvol(carte, event) : undefined}
      onMouseLeave={survol ? onQuitterSurvol : undefined}
      onFocus={survol ? (event) => onSurvol(carte, event) : undefined}
      onBlur={survol ? onQuitterSurvol : undefined}
      className={[
        'rpg-mulligan__card',
        `rpg-mulligan__card--type-${cardFrameType(carte)}`,
        `rpg-mulligan__card--elem-${carte.element}`,
        cardFrameClass(carte),
        cardMotifClass(carte),
        selectionnee ? 'is-selected' : '',
        nouvelle ? 'is-new' : '',
      ].filter(Boolean).join(' ')}
      style={cardFrameStyle(carte)}
      data-card-id={carte.id}
      data-mulligan-index={index}
      aria-pressed={selectionnee}
      aria-label={`${carte.name} — ${cardFaceTypeLine(carte)}${carte.kind === 'terrain' ? '' : ` — coût ${cardCostLabel(carte)}`}${carte.text && carte.text !== '—' ? ` — ${carte.text}` : ''}${estCreature ? ` — attaque ${carte.atk}, défense ${carte.def}` : ''} — ${selectionnee ? 'carte à changer, toucher pour la garder' : 'toucher pour la changer'}`}
    >
      <img className="rpg-mulligan__img" src={cardArt(carte)} alt="" aria-hidden="true" />
      <CardElementBadge carte={carte} />
      <IconesCarte carte={carte} className="rpg-card-icones--main" />
      <ManaCost carte={carte} showElement={false} />
      {/* Le bas de la carte : la ligne de type pour les terrains et les sorts —
          pour une créature, elle n'apprendrait rien, la face du jeu s'en passe —
          puis les deux plaques du jeu : l'épée d'or à gauche, le bouclier
          d'acier à droite, chacune sur son bord. */}
      <span className="rpg-mulligan__bas">
        {!estCreature && (
          <>
            <SortSceau carte={carte} className="rpg-mulligan__sceau" />
            <span className={`rpg-mulligan__type${familleSort ? ` rpg-mulligan__type--${familleSort}` : ''}`} aria-hidden="true">{cardFaceTypeLine(carte)}</span>
          </>
        )}
        {estCreature && (
          <span className="rpg-mulligan__stats" aria-hidden="true">
            <span className="rpg-card__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{carte.atk}</span></span>
            <span className="rpg-card__pt"><CardStatIcon type="defense" /><span className="rpg-stat-value">{carte.def}</span></span>
          </span>
        )}
      </span>
    </button>
  );
}

function VoletMulligan({
  main, etape, choix, nouveau, bilan, apercu, survol, essaiMana = false, panelRef = null,
  onBasculer, onValider, onAnnulerSelection, onContinuer, onSurvol, onQuitterSurvol,
}) {
  const nombre = choix.size;
  const enChoix = etape === 'choix';
  const pluriel = (n) => (n > 1 ? 's' : '');
  return (
    <div
      className={`rpg-mulligan rpg-mulligan--${etape}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Mulligan — ${enChoix ? 'choisissez les cartes à changer' : 'votre main après l’échange'}`}
    >
      <div className="rpg-mulligan__backdrop" aria-hidden="true" />
      <div className="rpg-mulligan__panel">
        <header className="rpg-mulligan__head">
          <span className="rpg-mulligan__eyebrow">Mulligan · main de départ</span>
          <h2>{enChoix ? 'Gardez votre main, ou changez des cartes' : (nouveau.length ? 'Voici votre nouvelle main' : 'Main de départ gardée')}</h2>
          <p>{enChoix
            ? `Touchez une carte pour la mettre de côté : elle repart dans le paquet battu, et vous en piochez une nouvelle. Un seul échange, ${main.length} cartes en main. ${survol ? 'Survolez une carte pour la lire en entier.' : 'Appui long d’une seconde sur une carte pour la lire en entier.'}`
            : bilan}</p>
          {essaiMana && <p className="rpg-mulligan__mana-note">Sans terrains : votre premier mana arrive après cet échange. Chaque nouveau tour en ajoute un, jusqu’à 10.</p>}
        </header>
        {/* La scène donne à la rangée une place mesurable, et c'est elle que
            les cartes interrogent : les cinq tiennent dans le volet. */}
        <div className="rpg-mulligan__stage">
          <div className="rpg-mulligan__cards">
            {main.map((carteId, index) => (
              <CarteMulligan
                key={`${carteId}-${index}`}
                carte={cardById(carteId)}
                index={index}
                selectionnee={choix.has(index)}
                nouvelle={nouveau.includes(index)}
                survol={survol}
                onBasculer={onBasculer}
                onSurvol={onSurvol}
                onQuitterSurvol={onQuitterSurvol}
              />
            ))}
          </div>
        </div>
        <footer className="rpg-mulligan__actions">
          {enChoix ? (
            <>
              <button type="button" autoFocus className="rpg-btn rpg-btn--primary rpg-mulligan__valider" onClick={onValider}>
                {nombre ? `Changer ${nombre} carte${pluriel(nombre)}` : 'Garder cette main'}
              </button>
              {nombre > 0 && (
                <button type="button" className="rpg-btn rpg-btn--ghost rpg-mulligan__tout" onClick={onAnnulerSelection}>
                  Annuler la sélection
                </button>
              )}
              <span className="rpg-mulligan__compteur" aria-live="polite">
                {nombre ? `${nombre} carte${pluriel(nombre)} à changer` : 'Aucune carte choisie'}
              </span>
            </>
          ) : (
            <button type="button" autoFocus className="rpg-btn rpg-btn--primary rpg-mulligan__commencer" onClick={onContinuer}>
              Commencer le duel
            </button>
          )}
        </footer>
      </div>
      {/* L'aperçu rapide vit dans le volet : il passe au-dessus de lui, et il
          est le seul à s'afficher tant que la main de départ est ouverte. */}
      {apercu && (
        <HoverCardPreview
          carte={cardById(apercu.carteId)}
          style={apercu.style}
          panelRef={panelRef}
          variante="mulligan"
        />
      )}
    </div>
  );
}

function ConfirmationSort({ carte, onConfirmer, onAnnuler }) {
  if (!carte) return null;
  const effets = cardEffectLines(carte.text);
  return (
    <div
      className="rpg-spell-confirm-backdrop"
      role="presentation"
      onClick={(event) => { if (event.target === event.currentTarget) onAnnuler(); }}
    >
      <section
        className="rpg-spell-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rpg-spell-confirm-title"
      >
        <h2 id="rpg-spell-confirm-title">Lancer {carte.name} ?</h2>
        <p className="rpg-spell-confirm__type">{cardFaceTypeLine(carte)}</p>
        <div className="rpg-spell-confirm__rules" aria-label="Effets">
          {effets.length
            ? effets.map((ligne, index) => <span key={`${index}-${ligne}`}>{ligne}</span>)
            : <span>Aucune capacité.</span>}
        </div>
        <div className="rpg-spell-confirm__actions">
          <button type="button" className="rpg-btn rpg-btn--primary" onClick={onConfirmer}>Lancer le sort</button>
          <button type="button" className="rpg-btn rpg-btn--ghost" onClick={onAnnuler}>Annuler</button>
        </div>
      </section>
    </div>
  );
}

function SpellAnnouncement({ annonce }) {
  const carte = cardById(annonce?.carteId);
  if (!carte) return null;
  const contre = Boolean(annonce.contre);
  return (
    <section
      className={`rpg-spell-played${contre ? ' rpg-spell-played--contre' : ''}`}
      role="status"
      aria-label={contre
        ? `Contre : ${carte.name} défait ${annonce.cible.nom}.`
        : `Magie jouée : ${carte.name}. Cible : ${annonce.cible.nom}.`}
    >
      <img
        className={`rpg-spell-played__art ${cardFrameClass(carte)} ${cardMotifClass(carte)}`}
        style={cardFrameStyle(carte)}
        src={cardArt(carte)}
        alt=""
      />
      <div className="rpg-spell-played__details">
        {/* Le sur-titre prend la teinte de la famille du sort annoncé. Un
            contre garde son or : sa règle est plus spécifique (voir
            `rpg-battle.css`). */}
        <span className={`rpg-spell-played__eyebrow${contre ? '' : classeLigneFamille(carte)}`}>{contre ? 'CONTRE DU SORCIER' : 'MAGIE JOUÉE'}</span>
        <strong>{carte.name}</strong>
        <p>{carte.text}</p>
        <div className="rpg-spell-played__target">
          {(annonce.cible.illustrationUrl || annonce.cible.illustrationId)
            ? <img src={annonce.cible.illustrationUrl ?? cardArt(annonce.cible.illustrationId)} alt="" />
            : <span className="rpg-spell-played__target-mark" aria-hidden="true">⌖</span>}
          <span><small>{contre ? 'CARTE CONTRÉE' : 'CIBLE'}</small><b>{annonce.cible.nom}</b></span>
        </div>
      </div>
    </section>
  );
}

/** Bandeau d'ouverture de tour : « Votre tour » / « Tour de l'adversaire ».
 *
 *  Purement informatif, il ne capte aucun geste (`pointer-events: none`) et
 *  s'efface tout seul après `RPG_ANNONCE_TOUR_DUREE` — valeur transmise à la
 *  feuille par `--rpg-annonce-tour-duree`, pour que le fondu de sortie et le
 *  retrait de l'élément finissent ensemble. La zone d'état existe même quand
 *  rien n'est annoncé : les lecteurs d'écran suivent alors chaque annonce
 *  (`aria-live`), chaque bandeau neuf portant sa propre clé. */
function AnnonceTour({ annonce }) {
  const joueur = annonce?.camp === 'joueur';
  return (
    <div
      className="rpg-annonce-tour"
      style={{ '--rpg-annonce-tour-duree': `${RPG_ANNONCE_TOUR_DUREE}ms` }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {annonce && (
        <p key={annonce.token} className={`rpg-annonce-tour__bandeau is-${joueur ? 'joueur' : 'sorcier'}`}>
          <span className="rpg-annonce-tour__lamp" aria-hidden="true" />
          <strong>{joueur ? 'Votre tour' : 'Tour de l’adversaire'}</strong>
          <span className="rpg-annonce-tour__lamp" aria-hidden="true" />
        </p>
      )}
    </div>
  );
}

/* ── Boîtier de deck en 3D (onglet Deck) ──────────────────────────────────────
   Décor pur : le clic est porté par le bouton voisin (voir `GameModeMenu`), et le
   nom du deck y figure en clair — tout ce qui est dessiné ici est `aria-hidden`. */
const EMBLEMS = {
  sable: <><path d="M6 2.6h12v2.1H6zM6 19.3h12v2.1H6z" /><path d="M7.7 4.7h8.6c0 3.5-2.5 5-3.3 7.3.8 2.3 3.3 3.8 3.3 7.3H7.7c0-3.5 2.5-5 3.3-7.3-.8-2.3-3.3-3.8-3.3-7.3z" /></>,
  braise: <path d="M12.6 1.6c.2 2.7 1.6 3.9 3 5.5 1.7 1.9 3.2 3.9 3.2 6.7a6.8 6.8 0 0 1-13.6 0c0-2.6 1.3-4.3 2.6-5.7.2 1.6.9 2.5 1.9 2.9C9.3 7.8 10.1 4.2 12.6 1.6z" />,
  eau: <path d="M12 2.6c3.5 4.3 6 7.4 6 10.9a6 6 0 0 1-12 0c0-3.5 2.5-6.6 6-10.9z" />,
  // Neige : un cristal de glace taillé — prisme hexagonal et ses arêtes.
  neige: (
    <>
      <path d="M12 1.3 4.9 5.6v9.6L12 22.7l7.1-7.5V5.6z" />
      <path d="M12 1.3v21.4M4.9 5.6 12 11.8l7.1-6.2" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
    </>
  ),
};

function ElementEmblem({ element }) {
  return <svg className={`rpg-emblem rpg-emblem--${element}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{EMBLEMS[element] ?? EMBLEMS.sable}</svg>;
}

/** Illustration imprimée sur le boîtier : `boxArt` du deck, sinon sa première carte non-terrain. */
function deckBoxArtUrl(deck) {
  const fallbackId = deck?.cardIds.find((id) => cardById(id)?.kind !== 'terrain') ?? deck?.cardIds[0];
  const artId = deck?.boxArt ?? fallbackId;
  return artId ? cardArt(artId) : '';
}

/** `size` : « shelf » (étagère, grand), « mini » (colonne de gauche) ou « showcase » (en-tête du deck ouvert). */
function DeckBox({ deck, index = 0, size = 'shelf' }) {
  const modifier = deckColorModifier(deck);
  const emblems = deckColors(deck);
  const medals = emblems.map((couleur) => <span className="rpg-deckbox__medal" key={couleur}><ElementEmblem element={couleur} /></span>);
  return (
    <span className={`rpg-deckbox rpg-deckbox--${size} rpg-deckbox--${modifier}`} style={{ '--i': index }} aria-hidden="true">
      <span className="rpg-deckbox__shadow" />
      <span className="rpg-deckbox__sway">
        <span className="rpg-deckbox__body">
          <span className="rpg-deckbox__face rpg-deckbox__face--back"><span className="rpg-deckbox__crest"><ElementEmblem element={emblems[0]} /></span></span>
          <span className="rpg-deckbox__face rpg-deckbox__face--bottom" />
          <span className="rpg-deckbox__face rpg-deckbox__face--right"><span className="rpg-deckbox__medals">{medals}</span></span>
          <span className="rpg-deckbox__face rpg-deckbox__face--top" />
          <span className="rpg-deckbox__face rpg-deckbox__face--left">
            <span className="rpg-deckbox__medals">{medals}</span>
            <span className="rpg-deckbox__title">{deck.name}</span>
            <span className="rpg-deckbox__count">{deck.cardIds.length}</span>
          </span>
          <span className="rpg-deckbox__face rpg-deckbox__face--front">
            <span className="rpg-deckbox__art" style={{ backgroundImage: `url("${deckBoxArtUrl(deck)}")` }} />
            <span className="rpg-deckbox__lid"><span className="rpg-deckbox__medals">{medals}</span></span>
            <span className="rpg-deckbox__latch" />
            <span className="rpg-deckbox__plate">{deck.name}</span>
            <span className="rpg-deckbox__gloss" />
          </span>
        </span>
      </span>
    </span>
  );
}

/** Le boîtier se tourne vers le curseur (souris seulement : au doigt, on laisse la page défiler). */
function inclinerBoitier(event) {
  if (event.pointerType !== 'mouse') return;
  const boitier = event.currentTarget.querySelector('.rpg-deckbox');
  if (!boitier) return;
  const zone = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - zone.left) / (zone.width || 1) - 0.5;
  const y = (event.clientY - zone.top) / (zone.height || 1) - 0.5;
  boitier.style.setProperty('--ry', `${(16 + x * 52).toFixed(1)}deg`);
  boitier.style.setProperty('--rx', `${(-9 - y * 18).toFixed(1)}deg`);
}

function redresserBoitier(event) {
  const boitier = event.currentTarget.querySelector('.rpg-deckbox');
  boitier?.style.removeProperty('--ry');
  boitier?.style.removeProperty('--rx');
}

/** La table posée avant le premier tirage, et le repli si un identifiant se perd. */
const PLATEAU_PAR_DEFAUT = plateauDeRepli();

// Durée du bandeau d'ouverture de tour — « Votre tour » / « Tour de
// l'adversaire » (voir `AnnonceTour`). La feuille de style reçoit cette valeur
// par `--rpg-annonce-tour-duree` : le fondu de sortie et le retrait du bandeau
// finissent donc ensemble. Le repli `1.5s` de la feuille ne sert qu'à une page
// sans React.
const RPG_ANNONCE_TOUR_DUREE = 1500;

// Le réglage sonore (musique et bruitages) reste mémorisé sur l'appareil ;
// au prochain passage, le son revient par défaut.
const RPG_SOUND_KEY = 'letsplay_sablier_sound_v1';
function readRpgSoundPref() {
  try { return window.localStorage.getItem(RPG_SOUND_KEY) !== 'off'; } catch { return true; }
}
function writeRpgSoundPref(value) {
  try { window.localStorage.setItem(RPG_SOUND_KEY, value ? 'on' : 'off'); } catch { /* stockage indisponible */ }
}

function GameModeMenu({ screen, selectedDeckId, onSelectDeck, onChangeScreen, onStartGame, onStartManaEssai, onStartTutorial, onStartCardGuide, onResumeGame, hasGame, progressionHistoire, onStartEtage, onResetHistoire, onContinueRecit, onJournalRecit, onRestartRecit, sauvegardeHistoireOk, duelEnCours, campagneEnCours, decksMaison, collection, statutSync, onEnregistrerDeckMaison, onSupprimerDeckMaison, onHoverCard, onLeaveHoverCard, onOpenCardPreview, onPlaySfx, fullscreen, onToggleFullscreen, credits, aReclamer, quetes, onReclamerQuete, onReclamerCachet, onReclamerSemaine, portefeuille, progression, ouverture, onOuvrirBooster, onOuvrirCoffret, onFermerOuverture }) {
  const [catalogueCouleur, setCatalogueCouleur] = useState('toutes');
  const [catalogueType, setCatalogueType] = useState('tous');
  const [openDeckId, setOpenDeckId] = useState(null);
  const [deckCouleur, setDeckCouleur] = useState('toutes');
  const [confirmation, setConfirmation] = useState(null);
  // Mode Histoire : la galerie des tours d'abord (`null`), la page d'une tour
  // — ses étages dévoilés — ensuite. Le clic sur une maquette ouvre la tour.
  const [tourOuverteId, setTourOuverteId] = useState(null);
  // Mode Tours : galerie puis détail d'une tour sélectionnée.
  const [tourLibreOuverteId, setTourLibreOuverteId] = useState(null);
  const [confirmerResetHistoire, setConfirmerResetHistoire] = useState(false);
  const [erreurResetHistoire, setErreurResetHistoire] = useState(false);
  const storyRef = useRef(null);
  const libreRef = useRef(null);
  const derniereTourRef = useRef(null);
  const derniereTourLibreRef = useRef(null);
  // La suppression d'un deck maison se confirme en deux temps (jamais de `window.confirm`).
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  // L'atelier : `null` (fermé), `{ mode: 'nouveau' }`, `{ mode: 'edition', id }`
  // ou `{ mode: 'copie', deck }` — partir d'un deck du catalogue pour l'adapter.
  const [atelier, setAtelier] = useState(null);
  const detailRef = useRef(null);
  const play = (n) => { try { onPlaySfx?.(n); } catch {} };
  // L'étagère : les six decks du catalogue, puis les boîtiers maison.
  const decksTous = [...RPG_DECKS, ...decksMaison];
  const selectedDeck = decksTous.find((deck) => deck.id === selectedDeckId) ?? RPG_DECKS[0];
  const playerDeck = deckSeJoue(selectedDeck, collection) ? selectedDeck : deckParDefaut();
  // Le sorcier joue la Cour des Djinns — sauf si c'est le deck du joueur : il prend alors un autre deck.
  const opponentDeck = deckAdversePour(playerDeck);
  // Filtre par couleur de l'étagère : un deck écarté n'est pas dessiné et ne peut pas rester ouvert.
  const filtresCouleur = filtresCouleurDecks(decksTous);
  const decksVisibles = filtrerDecksParCouleur(decksTous, deckCouleur);
  // La liste des cartes n'existe qu'une fois un deck cliqué : `openDeck` reste nul
  // (et la liste n'est même pas calculée) tant que le joueur n'a rien ouvert.
  const openDeck = decksVisibles.find((deck) => deck.id === openDeckId) ?? null;
  const openJouable = openDeck ? deckSeJoue(openDeck, collection) : false;
  const openStats = openDeck ? deckStats(openDeck) : { terrains: 0, creatures: 0, magies: 0, armes: 0 };
  const openCards = openDeck ? deckCardList(openDeck) : [];
  // La liste se lit par familles : créatures, puis sorts, puis terrains. Une
  // famille sans carte ne s'affiche pas, et les totaux additionnent les
  // exemplaires (« ×4 » compte pour quatre cartes dans le deck).
  const openFamilles = openDeck
    ? RPG_DECK_FAMILLES
      .map((famille) => {
        const cartes = openCards.filter(({ carte }) => familleDeCarte(carte) === famille.id);
        return { ...famille, cartes, total: cartes.reduce((somme, { count }) => somme + count, 0) };
      })
      .filter((famille) => famille.cartes.length > 0)
    : [];
  const openValidation = openDeck
    ? (openDeck.maison ? rpgValiderDeckMaison(openDeck.cardIds, collection) : rpgValiderDeck(openDeck.cardIds))
    : { ok: false, raisons: ['Aucun deck ouvert.'] };
  const cartesCatalogue = RPG_DUEL_CARDS.filter((carte) => {
    const colors = cardColors(carte);
    const couleurCorrespond = catalogueCouleur === 'toutes'
      || (catalogueCouleur === 'hybride' ? colors.length > 1 : colors.includes(catalogueCouleur));
    return couleurCorrespond && (catalogueType === 'tous' || carte.kind === catalogueType);
  });
  // La tour ouverte dans le mode Histoire (page d'étages), ou null (galerie).
  const tourOuverte = tourOuverteId ? tourHistoireParId(tourOuverteId) : null;
  const resumeTourOuverte = tourOuverte ? resumeTourHistoire(tourOuverte.id, progressionHistoire) : null;
  // Voile noir volontairement léger : le keyart de Bab El reste lisible derrière
  // les menus, le côté gauche garde assez d'ombre pour porter les textes.
  const menuBackground = `linear-gradient(105deg, rgba(8, 7, 13, .80) 0%, rgba(8, 7, 13, .58) 48%, rgba(8, 7, 13, .40) 100%), url("${import.meta.env.BASE_URL}sablier-de-bab-el-keyart.jpg")`;
  // Quitter l'onglet Deck referme l'étagère et l'atelier : le prochain passage repart sans liste.
  useEffect(() => { if (screen !== 'decks') { setOpenDeckId(null); setAtelier(null); } }, [screen]);
  // Quitter l'onglet Histoire referme la tour ouverte : le prochain passage sur
  // l'onglet retrouve la galerie des maquettes, jamais les étages d'emblée.
  useEffect(() => { if (screen !== 'histoire') setTourOuverteId(null); }, [screen]);
  // Quitter l'onglet Tours referme la tour libre ouverte : la galerie réapparaît.
  useEffect(() => { if (screen !== 'tours') setTourLibreOuverteId(null); }, [screen]);
  // Scroll vers la tour libre ouverte comme pour le mode Histoire.
  useLayoutEffect(() => {
    if (screen !== 'tours') { derniereTourLibreRef.current = null; return; }
    if (tourLibreOuverteId) {
      derniereTourLibreRef.current = tourLibreOuverteId;
      const detail = libreRef.current?.querySelector('.rpg-story__detail');
      detail?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
      detail?.querySelector('.rpg-story__back')?.focus?.({ preventScroll: true });
    } else if (derniereTourLibreRef.current) {
      const carte = libreRef.current?.querySelector(`[data-tour-libre="${derniereTourLibreRef.current}"]`);
      carte?.focus?.({ preventScroll: true });
      carte?.scrollIntoView?.({ behavior: 'auto', block: 'nearest' });
    }
  }, [screen, tourLibreOuverteId]);
  // Une tour choisie en bas de la galerie doit s'ouvrir depuis son sommet,
  // pas conserver le défilement de la cinquième carte et couper sa maquette.
  // Au retour, clavier et défilement retrouvent la carte que l'on consultait.
  useLayoutEffect(() => {
    if (screen !== 'histoire') { derniereTourRef.current = null; return; }
    if (tourOuverteId) {
      derniereTourRef.current = tourOuverteId;
      const detail = storyRef.current?.querySelector('.rpg-story__detail');
      detail?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
      detail?.querySelector('.rpg-story__back')?.focus?.({ preventScroll: true });
    } else if (derniereTourRef.current) {
      const carte = storyRef.current?.querySelector(`[data-tour="${derniereTourRef.current}"]`);
      carte?.focus?.({ preventScroll: true });
      carte?.scrollIntoView?.({ behavior: 'auto', block: 'nearest' });
    }
  }, [screen, tourOuverteId]);
  // Le rail « Vos decks » s'efface dès qu'un deck s'ouvre : le boîtier cliqué
  // disparaît avec lui et le focus se perdrait. On le repose sur la fiche dont
  // « ✕ Fermer le deck » est la sortie, puis on l'amène à l'écran.
  useEffect(() => {
    const fiche = detailRef.current;
    if (!openDeckId || atelier || !fiche) return;
    if (document.activeElement === document.body) {
      fiche.querySelector('.rpg-deck-detail__close')?.focus?.({ preventScroll: true });
    }
    if (!fiche.scrollIntoView) return;
    if (fiche.getBoundingClientRect().top <= window.innerHeight * 0.55) return;
    const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    fiche.scrollIntoView({ behavior: calme ? 'auto' : 'smooth', block: 'start' });
  }, [openDeckId, atelier]);
  // « Sélectionner » : le deck devient le deck de jeu (le parent le mémorise sur l'appareil).
  // Ouvrir un boîtier, lui, ne fait que montrer la liste de ses cartes.
  const choisirDeck = (deck) => {
    if (!deckSeJoue(deck, collection) || deck.id === playerDeck?.id) return;
    setConfirmation({ deckId: deck.id, enregistre: onSelectDeck(deck.id) === true });
  };
  // Jouer avec un deck en fait le deck de jeu ; le duel démarre avec lui sans attendre le rendu.
  const jouerAvec = (deck) => {
    if (!deckSeJoue(deck, collection)) return;
    onSelectDeck(deck.id);
    onStartGame(deck.id);
  };
  const changerCouleur = (couleur) => {
    setDeckCouleur(couleur);
    if (openDeck && !deckCorrespondCouleur(openDeck, couleur)) setOpenDeckId(null);
  };
  // L'enregistrement de l'atelier passe par le parent (casier + synchronisation) ;
  // succès : l'atelier se referme et l'étagère confirme sur le boîtier neuf.
  const enregistrerAtelier = (enregistrement) => {
    const resultat = onEnregistrerDeckMaison(enregistrement);
    if (resultat?.ok) {
      setAtelier(null);
      setConfirmation({ deckId: resultat.deck.id, enregistre: resultat.enregistre === true });
      setOpenDeckId(resultat.deck.id);
    }
    return resultat;
  };

  return (
    <section
      className={`rpg-mode-menu rpg-mode-menu--${screen}${hasGame ? ' rpg-mode-menu--reprise' : ''}`}
      style={{ backgroundImage: menuBackground }}
      // L'aperçu au survol est placé d'après la position de la carte au moment
      // du survol : dès que l'écran défile, il désignerait la mauvaise ligne.
      onScroll={onLeaveHoverCard}
    >
      <div className="rpg-mode-menu__content">
        <header className="rpg-mode-menu__header">
          <div className="rpg-mode-menu__brand">
            <span className="rpg-mode-menu__eyebrow">DUEL TACTIQUE · ALGÉRIE FANTASTIQUE</span>
            <h1>Le <span>Sablier</span></h1>
            <p>Les portes de la ville attendent leur prochain gardien.</p>
          </div>
          <button
            type="button"
            className={`rpg-mode-menu__fullscreen${fullscreen ? ' is-on' : ''}`}
            onClick={() => { play('menu'); onToggleFullscreen?.(); }}
            aria-pressed={Boolean(fullscreen)}
            title={fullscreen ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
            aria-label={fullscreen ? 'Quitter le plein écran' : 'Jouer en plein écran'}
          >
            <FullscreenIcon exit={Boolean(fullscreen)} className="rpg-fullscreen-icon" />
          </button>
          <nav className="rpg-mode-menu__switch" aria-label="Modes de jeu">
            <button type="button" className={screen === 'jouer' ? 'is-active' : ''} aria-current={screen === 'jouer' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('jouer'); }}>
              <span aria-hidden="true">⚔</span> Jouer
            </button>
            <button type="button" className={screen === 'histoire' ? 'is-active' : ''} aria-current={screen === 'histoire' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('histoire'); }}>
              <span aria-hidden="true">⌛</span> Histoire
            </button>
            <button type="button" className={screen === 'tours' ? 'is-active' : ''} aria-current={screen === 'tours' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('tours'); }}>
              <span aria-hidden="true">🗼</span> Tours
            </button>
            <button type="button" className={screen === 'decks' ? 'is-active' : ''} aria-current={screen === 'decks' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('decks'); }}>
              <span aria-hidden="true">▤</span> Deck
            </button>
            {/* Le jeton de la bourse vit sur l'onglet du Souk : le solde ◈ et
                ce qui attend d'être réclamé sont lisibles sans ouvrir l'écran,
                et l'onglet mène au reste. */}
            <button
              type="button"
              className={`rpg-mode-menu__souk${screen === 'souk' ? ' is-active' : ''}`}
              aria-current={screen === 'souk' ? 'page' : undefined}
              aria-label={`Le Souk — ${credits} crédits${aReclamer > 0 ? `, ${aReclamer} à réclamer` : ''}`}
              data-souk-onglet={credits}
              onClick={() => { play('menu'); onChangeScreen('souk'); }}
            >
              <RpgMarketIcon className="rpg-mode-menu__souk-piece" />
              <span className="rpg-mode-menu__onglet-libelle">Souk</span>
              <span className="rpg-mode-menu__bourse-solde" data-souk-bourse={credits}>
                {creditsLisible(credits)}
              </span>
              {aReclamer > 0 && (
                <span className="rpg-mode-menu__bourse-pastille" data-souk-a-reclamer={aReclamer} aria-hidden="true">
                  {aReclamer}
                </span>
              )}
            </button>
            <button type="button" className={screen === 'catalogue' ? 'is-active' : ''} aria-current={screen === 'catalogue' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('catalogue'); }}>
              <span aria-hidden="true">▧</span> Catalogue
            </button>
          </nav>
        </header>

        {screen === 'jouer' ? (
          <main className="rpg-mode-menu__play">
            {/* Pas de fond : le titre et les boutons posent sur le décor de la page. */}
            <section className="rpg-mode-menu__hero">
              {/* Effet visuel thématique : grains de sable qui tombent */}
              <div className="rpg-sand-fx" aria-hidden="true">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span key={i} className="rpg-sand-grain" style={{ '--delay': `${i * 0.21}s`, '--left': `${5 + Math.random() * 90}%`, '--duration': `${4 + Math.random() * 5}s`, '--size': `${1 + Math.random() * 2}px` }} />
                ))}
              </div>
              <div className="rpg-mode-menu__hero-copy">
                <span className="rpg-mode-menu__eyebrow">
                  <span className="rpg-eyebrow-dot" />
                  UN DUEL · DEUX DECKS · 40 CARTES
                </span>
                <h2>Le sable se souvient.<br /><em>À vous d’écrire la suite.</em></h2>
                <p>Déclarez vos attaques, choisissez vos bloqueurs et remportez la bataille des portes de Bab El. Chaque carte compte, chaque mana compte, chaque choix façonne votre victoire.</p>
                <div className="rpg-mode-menu__hero-actions">
                  {/* Le bouton principal ouvre le mode Histoire (reprend ou débute
                      le récit) ; le duel rapide reste dispo via l'onglet Deck. */}
                  <button type="button" className="rpg-menu-button rpg-menu-button--primary rpg-menu-button--histoire rpg-menu-button--glow" onClick={() => { play('select'); onContinueRecit?.(); }}>
                    <span className="rpg-menu-button__icon">⌛</span>
                    <span className="rpg-menu-button__text">
                      <strong>Mode histoire</strong>
                      <small>La campagne des Tours de Bab El</small>
                    </span>
                    <span className="rpg-menu-button__arrow" aria-hidden="true">→</span>
                  </button>
                  <div className="rpg-mode-menu__secondary-actions">
                    <button type="button" className="rpg-menu-button rpg-menu-button--tutorial" onClick={() => { play('select'); onStartTutorial?.(); }}>
                      <span className="rpg-menu-button__icon">⌛</span>
                      <span className="rpg-menu-button__text">
                        <strong>Apprendre à jouer</strong>
                        <small>Partie guidée en 5 étapes</small>
                      </span>
                    </button>
                    <button type="button" className="rpg-menu-button rpg-menu-button--card-guide" onClick={() => { play('select'); onStartCardGuide?.(); }}>
                      <span className="rpg-menu-button__icon">◇</span>
                      <span className="rpg-menu-button__text">
                        <strong>Cartes & effets</strong>
                        <small>Guide complet des règles</small>
                      </span>
                    </button>
                  </div>
                </div>
                <section className="rpg-flux-menu" aria-label="Essayer le mana sans terrains">
                  <span className="rpg-flux-menu__eyebrow">LABORATOIRE · DUEL LIBRE SANS RÉCOMPENSE</span>
                  <h3>Et si le mana remplaçait les terrains ?</h3>
                  <p>30 cartes à jouer, aucun terrain à piocher. Gagnez un mana coloré à chaque tour jusqu’à 10 ; choisissez sa couleur si votre deck en a plusieurs.</p>
                  <div className="rpg-flux-menu__decks">
                    {RPG_MANA_ESSAI_DECKS.map((deck) => (
                      <button key={deck.id} type="button" onClick={() => { play('select'); onStartManaEssai(deck.id); }}>
                        <span className="rpg-flux-menu__emblems" aria-hidden="true">{deck.elements.map((couleur) => ELEMENT_GLYPHS[couleur]).join(' ')}</span>
                        <strong>{deck.elements.length} couleur{deck.elements.length > 1 ? 's' : ''}</strong>
                        <small>{deck.name}</small>
                      </button>
                    ))}
                  </div>
                  <small className="rpg-flux-menu__note">Essai isolé : vos decks, cartes, crédits et progression restent inchangés.</small>
                </section>
              </div>
              {/* Le halo doré reste : simple lumière, pas un fond. */}
              <div className="rpg-mode-menu__hero-glow" aria-hidden="true" />
            </section>
            {/* La colonne de droite du menu : ce qu'il y a à gagner aujourd'hui,
                avec de quoi l'encaisser sans quitter l'écran. */}
            <RpgQuetesDuJour
              quetes={quetes}
              credits={credits}
              onReclamerQuete={onReclamerQuete}
              onReclamerCachet={onReclamerCachet}
              onReclamerSemaine={onReclamerSemaine}
              onOuvrirSouk={() => { onChangeScreen('souk'); }}
              onPlaySfx={play}
            />
          </main>
        ) : screen === 'tours' ? (
          <main className="rpg-mode-menu__play rpg-mode-menu__play--full" ref={libreRef}>
            {tourLibreOuverteId ? (
              <div className="rpg-story__detail">
                <button type="button" className="rpg-story__back" onClick={() => { play('menu'); setTourLibreOuverteId(null); }}>
                  <span aria-hidden="true">←</span> Retour aux tours
                </button>
                {(() => {
                  const tourLibre = tourHistoireParId(tourLibreOuverteId);
                  const resumeLibre = resumeTourHistoire(tourLibre.id, progressionHistoire);
                  return (
                    <section key={tourLibre.id} className="rpg-story-tour">
                      <header className="rpg-story-tour__header">
                        <RpgStoryTowerPreview tour={tourLibre} className="rpg-story-tour__banner" detail />
                        <div className="rpg-story-tour__heading">
                          <span className="rpg-mode-menu__eyebrow">PARTIE LIBRE · {resumeLibre.vaincus} / {resumeLibre.total} ÉTAGES DÉBLAYÉS</span>
                          <h3>{tourLibre.nom}</h3>
                          <p>{tourLibre.resume}</p>
                        </div>
                      </header>
                      <div className="rpg-story-tour__progress" aria-hidden="true">
                        <span style={{ width: `${resumeLibre.total ? (resumeLibre.vaincus / resumeLibre.total) * 100 : 0}%` }} />
                      </div>
                      <ul className="rpg-story-tour__floors">
                        {tourLibre.etages.map((etage, index) => {
                          const vaincu = etageEstVaincu(progressionHistoire, etage.id);
                          const debloque = etageEstDebloque(progressionHistoire, etage.id); // Progression dans les tours
                          return (
                            <li key={etage.id}>
                              <button
                                type="button"
                                className={`rpg-story-floor${vaincu ? ' is-cleared' : debloque ? ' is-next' : ''}`}
                                disabled={!debloque}
                                data-etage={etage.id}
                                onClick={() => { play('select'); onStartEtage(etage.id); }}
                              >
                                <span className="rpg-story-floor__step" aria-hidden="true">{vaincu ? '✓' : index + 1}</span>
                                <span className="rpg-story-floor__copy">
                                  <strong>{etage.nom}</strong>
                                  <small>{etage.note}</small>
                                </span>
                                <span className="rpg-story-floor__badge">
                                  {vaincu ? 'déblayé' : debloque ? `puissance ${etage.puissance}` : 'verrouillé'}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })()}
              </div>
            ) : (
              <section className="rpg-free-tours">
                <header className="rpg-free-tours__heading">
                  <div>
                    <span className="rpg-mode-menu__eyebrow">LES TOURS DE BAB EL</span>
                    <h2>Choisissez votre défi</h2>
                    <p>Gravissez les tours étage par étage. Chaque victoire débloque l'étage suivant. Deck complet et PV pleins à chaque duel.</p>
                  </div>
                </header>
                <div className="rpg-story__tours">
                  {RPG_STORY_TOURS.map((tour) => {
                    const resume = resumeTourHistoire(tour.id, progressionHistoire);
                    return (
                      <button
                        key={tour.id}
                        type="button"
                        className="rpg-story-tower"
                        data-tour-libre={tour.id}
                        onClick={() => { play('select'); setTourLibreOuverteId(tour.id); }}
                      >
                        <RpgStoryTowerPreview tour={tour} className="rpg-story-tower__art" />
                        <span className="rpg-story-tower__body">
                          <span className="rpg-mode-menu__eyebrow">{resume.vaincus} / {resume.total} ÉTAGES DÉBLAYÉS</span>
                          <strong className="rpg-story-tower__name">{tour.nom}</strong>
                          <small className="rpg-story-tower__resume">{tour.resume}</small>
                          <span className="rpg-story-tower__progress" aria-hidden="true">
                            <span style={{ width: `${resume.total ? (resume.vaincus / resume.total) * 100 : 0}%` }} />
                          </span>
                          <span className="rpg-story-tower__cta">Voir les étages <span aria-hidden="true">→</span></span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </main>
        ) : screen === 'histoire' ? (
          <main ref={storyRef} className="rpg-story" aria-label="Mode Histoire — les Tours de Bab El">
            <RpgStoryCampaign
              recit={progressionHistoire.recit}
              etagesVaincus={progressionHistoire.etagesVaincus}
              cardArt={cardArt}
              onContinue={onContinueRecit}
              onJournal={onJournalRecit}
              onRestart={onRestartRecit}
              sauvegardeOk={sauvegardeHistoireOk}
              duelEnCours={duelEnCours} campagneEnCours={campagneEnCours}
            />
            <header className="rpg-story__free-heading">
              <div>
                <span className="rpg-mode-menu__eyebrow">LES TOURS DE BAB EL · TOURS LIBRES</span>
                <h2>Gravissez les tours</h2>
                <p>Chaque victoire débloque l’étage suivant. Deck complet et PV pleins à chaque duel.</p>
              </div>
              {!confirmerResetHistoire && (
                <button
                  type="button"
                  className="rpg-story__reset"
                  onClick={() => { play('menu'); setErreurResetHistoire(false); setConfirmerResetHistoire(true); }}
                >
                  Effacer la progression
                </button>
              )}
            </header>
            {confirmerResetHistoire && <div className="rpg-story__reset-confirm" role="group" aria-label="Confirmer l’effacement de la progression">
              {erreurResetHistoire && <p role="status">La progression n’a pas été effacée : impossible de conserver vos cartes sur cet appareil. Libérez de l’espace avant de réessayer.</p>}
              <p>Effacer le récit et les victoires sur cet appareil ? Les étages seront verrouillés de nouveau. Vos cartes et decks seront conservés.</p>
              <button type="button" className="rpg-narrative-button" onClick={() => { play('annuler'); const ok = onResetHistoire(); setErreurResetHistoire(!ok); if (ok) setConfirmerResetHistoire(false); }}>Confirmer l’effacement</button>
              <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={() => setConfirmerResetHistoire(false)}>Annuler</button>
            </div>}
            {tourOuverte ? (
              <div className="rpg-story__detail">
                <button type="button" className="rpg-story__back" onClick={() => { play('menu'); setTourOuverteId(null); }}>
                  <span aria-hidden="true">←</span> Retour aux tours
                </button>
                <section key={tourOuverte.id} className="rpg-story-tour">
                  <header className="rpg-story-tour__header">
                    <RpgStoryTowerPreview tour={tourOuverte} className="rpg-story-tour__banner" detail />
                    <div className="rpg-story-tour__heading">
                      <span className="rpg-mode-menu__eyebrow">PARTIE LIBRE · {resumeTourOuverte.vaincus} / {resumeTourOuverte.total} ÉTAGES DÉBLAYÉS</span>
                      <h3>{tourOuverte.nom}</h3>
                      <p>{tourOuverte.resume}</p>
                    </div>
                  </header>
                  <div className="rpg-story-tour__progress" aria-hidden="true">
                    <span style={{ width: `${resumeTourOuverte.total ? (resumeTourOuverte.vaincus / resumeTourOuverte.total) * 100 : 0}%` }} />
                  </div>
                  <ul className="rpg-story-tour__floors">
                    {tourOuverte.etages.map((etage, index) => {
                      const vaincu = etageEstVaincu(progressionHistoire, etage.id);
                      const debloque = etageEstDebloque(progressionHistoire, etage.id);
                      return (
                        <li key={etage.id}>
                          <button
                            type="button"
                            className={`rpg-story-floor${vaincu ? ' is-cleared' : debloque ? ' is-next' : ''}`}
                            disabled={!debloque}
                            data-etage={etage.id}
                            onClick={() => { play('select'); onStartEtage(etage.id); }}
                          >
                            <span className="rpg-story-floor__step" aria-hidden="true">{vaincu ? '✓' : index + 1}</span>
                            <span className="rpg-story-floor__copy">
                              <strong>{etage.nom}</strong>
                              <small>{etage.note}</small>
                            </span>
                            <span className="rpg-story-floor__badge">
                              {vaincu ? 'déblayé' : debloque ? `puissance ${etage.puissance}` : 'verrouillé'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            ) : (
              <div className="rpg-story__tours">
                {RPG_STORY_TOURS.map((tour) => {
                  const resume = resumeTourHistoire(tour.id, progressionHistoire);
                  return (
                    <button
                      key={tour.id}
                      type="button"
                      className="rpg-story-tower"
                      data-tour={tour.id}
                      onClick={() => { play('select'); setTourOuverteId(tour.id); }}
                    >
                      <RpgStoryTowerPreview tour={tour} className="rpg-story-tower__art" />
                      <span className="rpg-story-tower__body">
                        <span className="rpg-mode-menu__eyebrow">{resume.vaincus} / {resume.total} ÉTAGES DÉBLAYÉS</span>
                        <strong className="rpg-story-tower__name">{tour.nom}</strong>
                        <small className="rpg-story-tower__resume">{tour.resume}</small>
                        <span className="rpg-story-tower__progress" aria-hidden="true">
                          <span style={{ width: `${resume.total ? (resume.vaincus / resume.total) * 100 : 0}%` }} />
                        </span>
                        <span className="rpg-story-tower__cta">Voir les étages <span aria-hidden="true">→</span></span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        ) : screen === 'decks' ? (atelier ? (
          <main className="rpg-deck-catalog rpg-deck-catalog--atelier" aria-label="Atelier de deck">
            <RpgDeckAtelier
              deckInitial={atelier.mode === 'edition'
                ? decksMaison.find((deck) => deck.id === atelier.id) ?? null
                : null}
              nomInitial={atelier.mode === 'copie'
                ? `${atelier.deck.nom ?? atelier.deck.name} (copie)`.slice(0, RPG_DECK_NOM_MAX)
                : nomDeckMaisonParDefaut(decksMaison)}
              cardIdsInitiaux={atelier.mode === 'copie'
                // Les cartes non possédées d'un deck copié sont retirées d'office :
                // l'atelier ne compose qu'avec ce que la collection autorise.
                ? atelier.deck.cardIds.filter((id) => collection.includes(id))
                : []}
              collection={collection}
              artUrl={cardArt}
              onEnregistrer={enregistrerAtelier}
              onAnnuler={() => setAtelier(null)}
              onSupprimer={(id) => { onSupprimerDeckMaison(id); setAtelier(null); setConfirmation({ supprime: true }); }}
              onHoverCard={onHoverCard}
              onLeaveHoverCard={onLeaveHoverCard}
              surSfx={play}
            />
          </main>
        ) : (
          <main className={`rpg-deck-catalog ${openDeck ? 'rpg-deck-catalog--open' : 'rpg-deck-catalog--closed'}`}>
            {/* La liste des cartes d'un deck occupe toute la largeur : le rail
                « Vos decks » s'efface tant qu'un deck est ouvert. « ✕ Fermer
                le deck » le ramène, avec ses boîtiers et ses filtres. */}
            {!openDeck && (
              <aside className="rpg-deck-catalog__rail">
              <div className="rpg-deck-catalog__intro">
                <span className="rpg-mode-menu__eyebrow">COLLECTION</span>
                <h2>Vos decks</h2>
                <p>Cliquez un boîtier pour voir ses cartes ; «\u00a0Sélectionner\u00a0» le retient pour vos prochaines parties. Le boîtier « Nouveau deck » ouvre l’atelier.</p>
                <p className="rpg-deck-catalog__sync" role="status">
                  {statutSync === 'synchronise'
                    ? '☁ Synchronisé avec votre compte'
                    : statutSync === 'attente'
                      ? '☁ Synchronisation du compte…'
                      : statutSync === 'horsligne'
                        ? '☁ Compte non rejoint : decks gardés sur cet appareil'
                        : 'Decks gardés sur cet appareil'}
                </p>
              </div>
              <div className="rpg-deck-filter" role="group" aria-label="Filtrer les decks par couleur">
                <span className="rpg-deck-filter__label" aria-hidden="true">Couleur</span>
                <div className="rpg-deck-filter__chips">
                  {filtresCouleur.map((filtre) => {
                    const actif = deckCouleur === filtre.id;
                    return (
                      <button
                        key={filtre.id}
                        type="button"
                        className={`rpg-deck-filter__chip rpg-deck-filter__chip--${filtre.id}${actif ? ' is-active' : ''}`}
                        aria-pressed={actif}
                        onClick={() => { play('menu'); changerCouleur(filtre.id); }}
                      >
                        {filtre.couleurs.length > 0 && (
                          <span className="rpg-deck-filter__emblems" aria-hidden="true">
                            {filtre.couleurs.map((couleur) => <ElementEmblem key={couleur} element={couleur} />)}
                          </span>
                        )}
                        {FILTRE_COULEUR_LABELS[filtre.id] ?? filtre.id}
                      </button>
                    );
                  })}
                </div>
                <p className="rpg-deck-filter__count" aria-live="polite">{decksVisibles.length} / {RPG_DECKS.length} deck{RPG_DECKS.length === 1 ? '' : 's'}</p>
              </div>
              <div className="rpg-deck-catalog__choices">
                <button
                  type="button"
                  className="rpg-deck-choice rpg-deck-choice--neuf"
                  disabled={decksMaison.length >= RPG_DECKS_MAISON_LIMITE}
                  aria-label={decksMaison.length >= RPG_DECKS_MAISON_LIMITE
                    ? `Étagère maison pleine (${RPG_DECKS_MAISON_LIMITE} decks) : supprimez un deck pour en créer un autre`
                    : 'Créer un nouveau deck dans l’atelier'}
                  onClick={() => { play('select'); setAtelier({ mode: 'nouveau' }); }}
                >
                  <span className="rpg-deck-choice__neuf-crate" aria-hidden="true"><b>+</b></span>
                  <span className="rpg-deck-choice__text">
                    <small>ATELIER</small>
                    <strong>Nouveau deck</strong>
                    <span className="rpg-deck-choice__meta">
                      <b>{decksMaison.length} / {RPG_DECKS_MAISON_LIMITE} maison{decksMaison.length > 1 ? 's' : ''}</b>
                      <span className="rpg-deck-choice__cta">Composer →</span>
                    </span>
                  </span>
                </button>
                {decksVisibles.map((deck) => {
                  if (!deckCorrespondCouleur(deck, deckCouleur)) return null; // écarté par le filtre de couleur
                  const ouvert = openDeck?.id === deck.id;
                  const actif = playerDeck?.id === deck.id;
                  const jouable = deckSeJoue(deck, collection);
                  return (
                    <div
                      key={deck.id}
                      className={`rpg-deck-choice rpg-deck-choice--${deckColorModifier(deck)}${ouvert ? ' is-open' : ''}${actif ? ' is-active' : ''}`}
                      onPointerMove={inclinerBoitier}
                      onPointerLeave={redresserBoitier}
                    >
                      <DeckBox deck={deck} index={decksTous.indexOf(deck)} size={openDeck ? 'mini' : 'shelf'} />
                      <button
                        type="button"
                        className="rpg-deck-choice__button"
                        aria-pressed={ouvert}
                        aria-controls={openDeck ? 'rpg-deck-detail' : undefined}
                        onClick={() => { play(ouvert ? 'annuler' : 'select'); setSuppressionEnCours(false); setOpenDeckId(ouvert ? null : deck.id); }}
                      >
                        <span className="rpg-deck-choice__text">
                          <small>{deck.maison ? 'DECK MAISON' : jouable ? 'DECK JOUEUR' : 'DECK INCOMPLET'}</small>
                          <strong>{deck.name}</strong>
                          <em>{deckColorGlyph(deck)} {deckColorLabel(deck)}{deckColors(deck).length > 1 ? ' · Hybride' : ' · Mono'}</em>
                          <span className="rpg-deck-choice__meta">
                            <b>{deck.cardIds.length} cartes</b>
                            <span className="rpg-deck-choice__cta">{ouvert ? 'Deck ouvert' : 'Voir la liste →'}</span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`rpg-deck-choice__select${actif ? ' is-selected' : ''}`}
                        disabled={!jouable}
                        aria-disabled={actif ? 'true' : undefined}
                        aria-label={!jouable ? `Indisponible : ${deck.name}` : actif ? `Sélectionné : ${deck.name}` : `Sélectionner ${deck.name}`}
                        onClick={() => { play(actif ? 'annuler' : 'select'); choisirDeck(deck); }}
                      >
                        {!jouable ? 'Indisponible' : actif ? <><span aria-hidden="true">✓</span> Sélectionné</> : 'Sélectionner'}
                      </button>
                    </div>
                  );
                })}
                {decksTous.length === 0 && <p className="rpg-deck-catalog__empty">Aucun deck n’est encore disponible.</p>}
                {decksTous.length > 0 && decksVisibles.length === 0 && <p className="rpg-deck-catalog__empty">Aucun deck de cette couleur.</p>}
              </div>
              {playerDeck && (
                <p className="rpg-deck-catalog__status" role="status">
                  <span>Deck de jeu : <strong>{playerDeck.name}</strong></span>
                  {confirmation?.deckId === playerDeck.id && (
                    <span className={confirmation.enregistre ? 'is-saved' : 'is-unsaved'}>
                      {confirmation.enregistre
                        ? '✓ Mémorisé sur cet appareil pour vos prochaines parties.'
                        : 'Non mémorisé : le stockage du navigateur est indisponible.'}
                    </span>
                  )}
                  {hasGame && confirmation?.deckId === playerDeck.id && <span>Le duel en cours garde son deck : ce choix vaudra pour le prochain.</span>}
                  {confirmation?.deckId && confirmation.deckId !== playerDeck?.id && (
                    <span className={confirmation.enregistre ? 'is-saved' : 'is-unsaved'}>
                      {confirmation.enregistre
                        ? '✓ Mémorisé sur cet appareil.'
                        : 'Deck enregistré pour la session : le stockage du navigateur est indisponible.'}
                    </span>
                  )}
                  {confirmation?.supprime && <span className="is-unsaved">Deck supprimé de l'étagère.</span>}
                </p>
              )}
              </aside>
            )}

            {openDeck && (
              <section id="rpg-deck-detail" ref={detailRef} className={`rpg-deck-detail rpg-deck-detail--${deckColorModifier(openDeck)}`} aria-label={`Détails du deck ${openDeck.name}`}>
                <button type="button" className="rpg-menu-link rpg-deck-detail__close" onClick={() => { play('annuler'); setOpenDeckId(null); }}>✕ Fermer le deck</button>
                <header className="rpg-deck-detail__header">
                  <DeckBox deck={openDeck} size="showcase" />
                  <div><span className="rpg-mode-menu__eyebrow">{openDeck.maison ? 'DECK MAISON' : openJouable ? 'VOTRE DECK' : 'DECK INCOMPLET'} · {deckColorGlyph(openDeck)} {deckColorLabel(openDeck).toUpperCase()} · {deckColors(openDeck).length > 1 ? 'HYBRIDE' : 'MONO'}</span><h2>{openDeck.name}</h2><p>{openDeck.archetype ?? (openDeck.maison ? 'Composé dans votre atelier.' : null)}</p></div>
                </header>
                <p className="rpg-deck-detail__description">{openDeck.description}</p>
                <div className="rpg-deck-detail__stats" aria-label="Répartition du deck">
                  <span><b>{openDeck.cardIds.length}</b><small>cartes</small></span>
                  <span><b>{openStats.terrains}</b><small>terrains</small></span>
                  <span><b>{openStats.creatures}</b><small>créatures</small></span>
                  <span><b>{openStats.magies}</b><small>magies</small></span>
                  <span><b>{openStats.armes ?? 0}</b><small>armes</small></span>
                  <span className={openValidation.ok ? 'is-valid' : 'is-invalid'}><b>{openValidation.ok ? '✓' : '!'}</b><small>{openValidation.ok ? 'validé' : (openValidation.raisons ?? [openValidation.raison]).filter(Boolean).join(' · ')}</small></span>
                </div>
                <div className="rpg-deck-detail__list-heading"><h3>Liste des cartes</h3><span>{openCards.length} références · quantités incluses</span></div>
                <div className="rpg-deck-list-panel">
                  {openFamilles.map((famille) => (
                    <section key={famille.id} className="rpg-deck-list-family" data-famille={famille.id}>
                      <h4 className="rpg-deck-list-family__heading">
                        <strong>{famille.nom}</strong>
                        <em>{famille.note}</em>
                        <small>
                          {famille.cartes.length} référence{famille.cartes.length > 1 ? 's' : ''}
                          {' · '}
                          {famille.total} carte{famille.total > 1 ? 's' : ''}
                        </small>
                      </h4>
                      <ul className="rpg-deck-list">
                        {famille.cartes.map(({ carte, count }) => (
                          <li key={carte.id} data-card-id={carte.id}
                            onMouseEnter={(event) => onHoverCard?.(carte, event)}
                            onMouseLeave={onLeaveHoverCard}>
                            <img src={cardArt(carte)} alt="" />
                            <span><strong>{carte.name}</strong><small className={classeLigneFamille(carte).trim() || undefined}>{cardFaceTypeLine(carte)}{carte.kind === 'terrain' ? '' : ` · ${cardCostLabel(carte)}`}</small></span>
                            <b>×{count}</b>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
                <div className="rpg-deck-detail__actions">
                  {openDeck.maison ? (
                    <>
                      <button type="button" className="rpg-menu-button" onClick={() => { play('menu'); setAtelier({ mode: 'edition', id: openDeck.id }); }}>
                        ✎ Modifier dans l'atelier
                      </button>
                      <button type="button" className="rpg-menu-button" onClick={() => { play('menu'); setAtelier({ mode: 'copie', deck: openDeck }); }}>
                        ⧉ Dupliquer
                      </button>
                      <button
                        type="button"
                        className="rpg-menu-button rpg-deck-detail__delete"
                        onClick={() => {
                          if (!suppressionEnCours) { setSuppressionEnCours(true); return; }
                          play('erreur');
                          onSupprimerDeckMaison(openDeck.id);
                          setSuppressionEnCours(false);
                          setOpenDeckId(null);
                          setConfirmation({ supprime: true });
                        }}
                      >
                        {suppressionEnCours ? 'Confirmer la suppression' : 'Supprimer'}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="rpg-menu-button" onClick={() => { play('menu'); setAtelier({ mode: 'copie', deck: openDeck }); }}>
                      ⧉ Copier pour l'adapter dans l'atelier
                    </button>
                  )}
                </div>
                {openJouable ? (
                  <button type="button" className="rpg-menu-button rpg-menu-button--primary rpg-deck-detail__play" onClick={() => { play('select'); jouerAvec(openDeck); }}>
                    ⚔ Jouer avec ce deck <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <p className="rpg-deck-detail__note">Ce deck n’est pas jouable ({(openValidation.raisons ?? [openValidation.raison]).filter(Boolean).join(' · ')}) : il ne peut pas être sélectionné ni joué.</p>
                )}
              </section>
            )}
          </main>
        )) : screen === 'guide' ? (
          <RpgCardGuide
            cardArt={cardArt}
            hasGame={hasGame}
            onResumeGame={onResumeGame}
            onPlaySfx={play}
            onExit={() => onChangeScreen('jouer')}
          />
        ) : screen === 'souk' ? (
          <RpgSouk
            quetes={quetes}
            credits={credits}
            aReclamer={aReclamer}
            statutSync={statutSync}
            portefeuille={portefeuille}
            progression={progression}
            collection={collection}
            ouverture={ouverture}
            cardArt={cardArt}
            onReclamerQuete={onReclamerQuete}
            onReclamerCachet={onReclamerCachet}
            onReclamerSemaine={onReclamerSemaine}
            onOuvrirBooster={onOuvrirBooster}
            onOuvrirCoffret={onOuvrirCoffret}
            onFermerOuverture={onFermerOuverture}
            onPlaySfx={play}
            onExit={() => onChangeScreen('jouer')}
          />
        ) : (
          <main className="rpg-card-catalogue" aria-label="Catalogue complet des cartes">
            <header className="rpg-card-catalogue__header">
              <div>
                <span className="rpg-mode-menu__eyebrow">COLLECTION COMPLÈTE · {RPG_DUEL_CARDS.length} CARTES</span>
                <h2>Catalogue</h2>
                <p>Parcourez les créatures, héros, terrains, magies et armes de Bab El — cliquez une carte pour l’ouvrir en grand, illustration et effets.</p>
              </div>
            </header>
            <div className="rpg-card-catalogue__filters" aria-label="Filtres du catalogue">
              <label>
                <span>Couleur</span>
                <select aria-label="Filtrer par couleur" value={catalogueCouleur} onChange={(event) => { play('menu'); setCatalogueCouleur(event.target.value); }}>
                  <option value="toutes">Toutes les couleurs</option>
                  <option value="braise">Braise</option>
                  <option value="eau">Eau</option>
                  <option value="sable">Sable · Désert</option>
                  <option value="neige">Neige · Glacier</option>
                  <option value="hybride">Hybrides · deux couleurs ou plus</option>
                </select>
              </label>
              <label>
                <span>Type</span>
                <select aria-label="Filtrer par type" value={catalogueType} onChange={(event) => { play('menu'); setCatalogueType(event.target.value); }}>
                  <option value="tous">Tous les types</option>
                  <option value="creature">Créatures</option>
                  <option value="hero">Héros</option>
                  <option value="terrain">Terrains</option>
                  <option value="magie">Magies</option>
                  <option value="arme">Armes</option>
                </select>
              </label>
              <p className="rpg-card-catalogue__count" aria-live="polite">
                {cartesCatalogue.length} / {RPG_DUEL_CARDS.length} carte{RPG_DUEL_CARDS.length === 1 ? '' : 's'}
              </p>
            </div>
            {cartesCatalogue.length ? (
              <div className="rpg-card-catalogue__grid">
                {cartesCatalogue.map((carte) => {
                  const estTerrain = carte.kind === 'terrain';
                  const estCreature = ['creature', 'hero'].includes(carte.kind);
                  const degradeCout = estTerrain ? null : cardHybridGradient(carte);
                  const famille = carteFamille(carte);
                  const verrouillee = !possedeCarte(collection, carte.id);
                  // Le sceau de la famille au coin libre de la vignette : c'est
                  // là qu'on feuillette la collection, et c'est là qu'il faut
                  // repérer un sort sans ouvrir sa fiche.
                  return (
                    <article
                      key={carte.id}
                      className={`rpg-card-catalogue__card rpg-card-catalogue__card--${carte.kind}${verrouillee ? ' is-locked' : ''}`}
                      data-card-id={carte.id}
                      data-locked={verrouillee}
                      data-color={carte.element}
                      data-colors={cardColors(carte).join(' ')}
                      data-type={carte.kind}
                      style={cardFrameStyle(carte)}
                    >
                      {/* Toute la fiche est un bouton étiré : le clic — souris ou
                          doigt — ouvre la carte en grand, illustration et effets,
                          sans rien jouer. Pas d'aperçu au survol ici : la fiche
                          montre déjà l'illustration, le nom, la famille, la
                          couleur, le coût et les effets — un aperçu par-dessus
                          ne ferait que répéter ce qu'on a sous les yeux. Le clic
                          et l'appui long d'une seconde, eux, restent. */}
                      <button
                        type="button"
                        className="rpg-card-catalogue__ouvrir"
                        data-catalogue-open={carte.id}
                        aria-label={`Agrandir ${carte.name} — ${famille}${estTerrain ? '' : `, coût ${cardCostLabel(carte)}`}${verrouillee ? ', carte verrouillée' : ''}`}
                        onClick={() => onOpenCardPreview?.(carte)}
                      />
                      <div className={`rpg-card-catalogue__art ${cardFrameClass(carte)} ${cardMotifClass(carte)}`}>
                        <img src={cardArt(carte)} alt={`Illustration de ${carte.name}`} loading="lazy" />
                        <CardElementBadge carte={carte} />
                        {!estTerrain && <span
                          className={`rpg-card-catalogue__cost${degradeCout ? ' rpg-card-catalogue__cost--hybride' : ''}`}
                          style={degradeCout ? { '--rpg-hybrid-cost-bg': degradeCout } : undefined}
                          aria-label={`Coût ${cardCostLabel(carte)}`}
                        >{carte.cost}</span>}
                        <SortSceau carte={carte} className="rpg-card-catalogue__sort" />
                        <IconesCarte carte={carte} className="rpg-card-icones--catalogue" />
                        {verrouillee && <span className="rpg-card-catalogue__lock" aria-hidden="true">🔒</span>}
                        <span className="rpg-card-catalogue__zoom" aria-hidden="true">⤢</span>
                      </div>
                      <div className="rpg-card-catalogue__details">
                        <div className="rpg-card-catalogue__title">
                          <h3>{carte.name}</h3>
                        </div>
                        <p className={`rpg-card-catalogue__type${classeLigneFamille(carte)}`}>{cardFaceTypeLine(carte)}</p>
                        <PastillesCarte carte={carte} className="rpg-card-catalogue__pastilles" />
                        <div className="rpg-card-catalogue__meta">
                          <span className={estTerrain ? 'is-terrain' : cardColors(carte).length > 1 ? 'is-hybrid' : ''}>
                            {cardColorLine(carte)}
                          </span>
                          {estCreature && <b>⚔ {carte.atk} · 🛡 {carte.def}</b>}
                          {carteEstArme(carte) && <b>⚔ {signeBonus(bonusArme(carte)?.atk)} · 🛡 {signeBonus(bonusArme(carte)?.def)}</b>}
                        </div>
                        <p className="rpg-card-catalogue__rules"><RpgCardRules carte={carte} /></p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rpg-card-catalogue__empty">Aucune carte ne correspond à ces filtres.</p>
            )}
          </main>
        )}
        <footer className="rpg-mode-menu__footer"><span>LE SABLIER</span><span>STRATÉGIE · CRÉATURES · MAGIE</span></footer>
      </div>
      {/* Partie en cours : le bouton de reprise flotte en bas au centre, visible
          sans défiler quel que soit l'onglet du menu. */}
      {hasGame && (
        <button type="button" className="rpg-menu-button rpg-menu-button--resume rpg-menu-button--floating rpg-menu-button--resume-pulse" onClick={() => { play('select'); onResumeGame(); }}>
          <span className="rpg-menu-button__icon">↩</span>
          <span className="rpg-menu-button__text">
            <strong>Reprendre le duel en cours</strong>
            <small>Une partie n'est pas terminée</small>
          </span>
          <span className="rpg-resume-badge" aria-hidden="true">!</span>
        </button>
      )}
    </section>
  );
}

/**
 * Ménage des images de cartes détruites : tout fantôme dont l'animation est
 * terminée depuis longtemps disparaît. Une minuterie perdue — onglet mis en
 * veille par le téléphone, application repassée en arrière-plan — ne peut
 * donc plus laisser une carte morte posée sur le champ de bataille.
 */
function nettoyerFantomes(effets, maintenant = Date.now()) {
  const restants = effets.filter((effet) => !effet.expireA || effet.expireA > maintenant);
  return restants.length === effets.length ? effets : restants;
}

/** Le joueur a demandé moins d'animations : on les lui épargne. */
function animationsReduites() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Vrai quand le geste part d'un champ de saisie : le nom d'un deck maison, un
 * filtre du catalogue. Ni la touche F ni la demande de plein écran ne doivent
 * voler ce que le joueur est en train d'écrire. */
function vientDunChampDeSaisie(cible) {
  const balise = cible?.tagName;
  return balise === 'INPUT' || balise === 'TEXTAREA' || balise === 'SELECT' || Boolean(cible?.isContentEditable);
}

// ── SFX réactifs du duel : pioche, destruction, impact, victoire/défaite, phases ──
// Monté seulement pendant la partie : ses hooks ne doivent pas passer après les
// retours anticipés de RpgDuelPage (menu, duel absent), sinon l'ordre des hooks
// change d'un rendu à l'autre et la page plante au lancement.
function SfxReactifsDuel({ vainqueur, phaseDuelActive, cartesEnDestruction, impactEcran, jouerSfx }) {
  const prevVainqueurRef = useRef(null);
  const prevPhaseRef = useRef(null);
  const prevDestructionCountRef = useRef(0);
  useEffect(() => {
    if (vainqueur && prevVainqueurRef.current !== vainqueur) {
      jouerSfx(vainqueur === 'joueur' ? 'victoire' : 'defaite');
    }
    prevVainqueurRef.current = vainqueur;
  }, [vainqueur]);
  useEffect(() => {
    if (phaseDuelActive && prevPhaseRef.current && prevPhaseRef.current !== phaseDuelActive) {
      if (phaseDuelActive === 'attaque') jouerSfx('phase');
      else if (phaseDuelActive === 'blocage') jouerSfx('page_turn');
    }
    prevPhaseRef.current = phaseDuelActive;
  }, [phaseDuelActive]);
  useEffect(() => {
    if (cartesEnDestruction.length > prevDestructionCountRef.current) {
      const nouvellesDestructions = cartesEnDestruction.slice(prevDestructionCountRef.current);
      jouerSfx(nouvellesDestructions.some((effet) => effet.bruleeParBraise)
        ? 'flame_gust'
        : 'destruction_hit');
    }
    prevDestructionCountRef.current = cartesEnDestruction.length;
  }, [cartesEnDestruction]);
  useEffect(() => {
    if (impactEcran) {
      jouerSfx(impactEcran.mode === 'received' ? 'degats' : 'degats_sorcier');
      jouerSfx('impact', 0.08);
    }
  }, [impactEcran?.token]);
  return null;
}

export default function RpgDuelPage({ joueurDeck, sorcierDeck, sorcierPuissance = 2, rng = Math.random, variantesPlateaux = false } = {}) {
  useLumiereCartes();
  const authContext = useContext(AuthContext);
  const authUser = authContext?.user ?? null;
  const [nomProfilJoueur, setNomProfilJoueur] = useState(() => profileNameFallback(authUser));
  useEffect(() => {
    let vivant = true;
    setNomProfilJoueur(profileNameFallback(authUser));
    if (!authUser?.id || authContext?.isDemo || !supabase) return undefined;
    supabase.from('profiles').select('display_name, username').eq('id', authUser.id).maybeSingle()
      .then(({ data, error }) => {
        if (!vivant || error) return;
        const name = [data?.display_name, data?.username, String(authUser.id).slice(0, 8)]
          .find((value) => typeof value === 'string' && value.trim())?.trim();
        if (name) setNomProfilJoueur(name);
      })
      .catch(() => {});
    return () => { vivant = false; };
  }, [authUser, authContext?.isDemo]);

  const [ecran, setEcran] = useState('jouer');
  const [tutorielActif, setTutorielActif] = useState(false);
  const [etapeTutorielId, setEtapeTutorielId] = useState(null);
  const landscapeRef = useRef(null);
  // La coque du jeu (`.rpg-battle`) : menu, catalogues et duel partagent le même
  // élément — React garde le nœud d'un écran à l'autre —, donc le plein écran
  // survit au lancement d'une partie comme au retour au menu.
  const shellRef = useRef(null);
  const {
    active: pleinEcran,
    enter: entrerPleinEcran,
    toggle: basculerPleinEcran,
  } = useGameFullscreen(shellRef);
  // `survol` : le volet du mulligan y lit si la souris sait survoler.
  const [viewport, setViewport] = useState({ mobile: false, portrait: false, survol: true });
  useEffect(() => {
    landscapeRef.current = createRpgLandscapeSession();
    const update = () => {
      const mobile = Boolean(window.LetsPlayAndroid) || Boolean(window.matchMedia?.('(pointer: coarse), (max-width: 1100px)').matches);
      // Le survol n'existe pas au doigt : là, l'aperçu rapide passe par l'appui
      // long d'une seconde. `matchMedia` absent (WebView ancienne) : on suppose
      // la souris, et l'appui long reste armé de toute façon.
      const survol = typeof window.matchMedia === 'function' ? window.matchMedia('(hover: hover)').matches : true;
      setViewport({ mobile, portrait: mobile && window.innerHeight > window.innerWidth, survol });
    };
    update();
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); landscapeRef.current?.leave(); };
  }, []);
  useEffect(() => {
    if (ecran !== 'partie') landscapeRef.current?.leave();
  }, [ecran]);

  // ── Plein écran ──────────────────────────────────────────────────────────
  // Le Sablier SE LANCE EN PLEIN ÉCRAN, sur ordinateur comme sur téléphone, et
  // son interface d'avant-partie en fait partie : le menu Jouer, le mode
  // Histoire, les decks et le catalogue s'affichent déjà plein écran, le duel
  // n'a plus qu'à continuer dans le même espace. Le mécanisme (Fullscreen API,
  // couche fixe en repli, verrou de défilement) est celui des jeux d'arcade —
  // `gameFullscreen.js` / `useGameFullscreen.js` ; ici, les règles du jeu :
  //   - la coque est une couche fixe qui couvre tout le viewport : elle est
  //     posée dès le montage de la page, sans geste, et le choix est
  //     « épinglé » — il traverse les écrans jusqu'à ce que le joueur le quitte
  //     (bouton du menu ou de la barre du duel, touche F, Échap, geste
  //     « retour » d'Android) ;
  //   - le navigateur exige un geste pour le plein écran natif : le premier
  //     clic ou la première touche du joueur le demande (effet suivant) ;
  //   - lancer une partie (duel libre, étage de l'Histoire, « Reprendre »,
  //     « Activer le paysage ») le redemande dans le geste du bouton, ce qui
  //     rouvre un plein écran quitté depuis le menu ;
  //   - la session de paysage ne possède plus le plein écran
  //     (`enter({ fullscreen: false })`) : un seul propriétaire, sinon le
  //     retour au menu refermait l'écran demandé.
  useEffect(() => {
    // Plein écran « de base » : la couche fixe se pose sans geste. `native` est
    // faux car le navigateur refuserait une demande hors geste — le natif part
    // au premier geste du joueur.
    entrerPleinEcran({ pinned: true, native: false });
  }, [entrerPleinEcran]);

  // Le navigateur exige un geste pour le vrai plein écran : le premier clic ou
  // la première touche (hors champ de saisie) le demande, au menu comme en duel.
  // Le natif posé — ou le plein écran quitté — l'écoute s'arrête d'elle-même.
  useEffect(() => {
    if (!pleinEcran) return undefined;
    const upgrade = (event) => {
      if (nativeFullscreenElement()) return;
      if (vientDunChampDeSaisie(event.target)) return;
      // Échap (ou le geste « retour ») referme le plein écran dans le
      // navigateur : si la touche nous parvient quand même, elle ne doit pas le
      // rouvrir aussitôt — la sortie appartient au joueur.
      if (String(event.key || '').toLowerCase() === 'escape') return;
      entrerPleinEcran({ pinned: true });
    };
    window.addEventListener('pointerdown', upgrade, true);
    window.addEventListener('keydown', upgrade, true);
    return () => {
      window.removeEventListener('pointerdown', upgrade, true);
      window.removeEventListener('keydown', upgrade, true);
    };
  }, [pleinEcran, entrerPleinEcran]);

  // « F » bascule le plein écran, sur tous les écrans du jeu. Ni Ctrl/Cmd+F (la
  // recherche du navigateur), ni Alt+F, ni une touche maintenue, ni un « f »
  // tapé dans un champ de saisie.
  useEffect(() => {
    const surTouche = (event) => {
      if (!isFullscreenShortcut(event)) return;
      if (vientDunChampDeSaisie(event.target)) return;
      event.preventDefault();
      basculerPleinEcran();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [basculerPleinEcran]);

  // Un résultat est traité UNE fois par session. Le récit et la victoire sont
  // sauvegardés atomiquement avant d'afficher l'après-duel ; la collection garde
  // son chemin habituel. Un duel libre n'avance jamais le récit par accident.
  useEffect(() => {
    const duelCourant = duelRef.current;
    if (!duelCourant || duelCourant.modeMana === RPG_MODE_MANA_ESSAI || !histoireEtageId || rpgVainqueur(duelCourant) !== 'joueur') return;
    const session = sessionDuelRef.current;
    if (histoireVictoireMarqueeRef.current === session) return;
    histoireVictoireMarqueeRef.current = session;
    const contexte = campagneDuelRef.current;
    const campagne = contexte?.session === session && contexte.etageId === histoireEtageId;
    // Le premier déblayage est celui qui paie : l'état de la tour est lu AVANT
    // `enregistrerVictoire`, sinon tout étage paraîtrait déjà conquis.
    const premiere = !etageEstVaincu(progressionHistoireRef.current, histoireEtageId);
    const tourId = etageHistoireParId(histoireEtageId)?.tour?.id ?? null;
    const maj = enregistrerVictoire(histoireEtageId, campagne ? contexte.curseur : null);
    // Depuis le Souk (dossier 13), une victoire ne donne plus de cartes : elle
    // **ouvre** celles de l'étage au Souk — et elle paie (50 ◈ au premier
    // déblayage, 10 ◈ au rejeu). Les deux événements du contrat font avancer
    // les quêtes du jour ; `etage-deblaye` porte la garde « premier déblayage »
    // de la quête du palier suivant, et c'est `duel-gagne` qui paie.
    noterVictoireEtage(histoireEtageId, maj);
    noterEvenementDuel({ type: 'duel-gagne', mode: 'histoire', etageId: histoireEtageId, tourId, premiere });
    if (premiere) noterEvenementDuel({ type: 'etage-deblaye', etageId: histoireEtageId, tourId, premiere: true });
    if (campagne) {
      annulerMinuteriesDuTour();
      sessionDuelRef.current += 1;
      campagneDuelRef.current = null;
      duelRef.current = null;
      setHistoireEtageId(null);
      // Au menu, une victoire arrivée juste après le clic reste sauvegardée
      // sans arracher au joueur l'écran qu'il est en train de consulter.
      setEcran((courant) => courant === 'partie' ? 'recit' : courant);
    }
  });
  // Un **duel libre** gagné paie 8 ◈ — une fois par session, comme les étages :
  // « Nouvelle partie » incrémente la session, et le duel suivant sera compté.
  useEffect(() => {
    const duelCourant = duelRef.current;
    if (!duelCourant || duelCourant.modeMana === RPG_MODE_MANA_ESSAI || histoireEtageId || rpgVainqueur(duelCourant) !== 'joueur') return;
    const session = sessionDuelRef.current;
    if (libreVictoireMarqueeRef.current === session) return;
    libreVictoireMarqueeRef.current = session;
    noterEvenementDuel({ type: 'duel-gagne', mode: 'libre', premiere: false });
  });

  // « Le sorcier saigne » se compte sur les **PV du sorcier**, pas au point
  // d'appel : toutes les sources y passent — attaques directes, sorts,
  // capacités d'arrivée, échos différés de la Braise — et une action annulée
  // puis rejouée ne compte pas deux fois, puisque l'on émet l'écart entre les
  // dégâts cumulés et ceux déjà annoncés. Un duel neuf remet le compteur à son
  // état de départ sans rien annoncer.
  useEffect(() => {
    const duelCourant = duelRef.current;
    if (!duelCourant) return;
    const cumules = Math.max(0, (duelCourant.sorcier.pvMax ?? 0) - duelCourant.sorcier.pv);
    const memo = degatsSorcierRef.current;
    if (memo.duel !== duelCourant) {
      degatsSorcierRef.current = { duel: duelCourant, annonces: cumules };
      return;
    }
    if (cumules > memo.annonces) {
      const montant = cumules - memo.annonces;
      memo.annonces = cumules;
      noterEvenementDuel({ type: 'degats-infliges', montant });
    }
  });

  // Lancer (ou reprendre) une partie : le plein écran natif est demandé ici,
  // dans le geste du bouton — le navigateur le refuse ailleurs. La session de
  // paysage garde l'orientation et le pont Android, pas le plein écran.
  const demanderPleinEcranEtPaysage = () => {
    entrerPleinEcran({ pinned: true });
    landscapeRef.current?.enter({ fullscreen: false });
  };
  const reprendrePartie = () => {
    demanderPleinEcranEtPaysage();
    setEcran('partie');
  };
  // Decks maison et collection : l'atelier écrit dans le casier local, le compte
  // connecté synchronise le tout en tâche de fond (`useDecksSablier.js`).
  const {
    decksMaison,
    collection,
    statutSync,
    rafraichirCollection,
    enregistrerDeckMaison,
    supprimerDeckMaison,
    noterVictoireEtage,
  } = useDecksSablier();
  const decksTous = [...RPG_DECKS, ...decksMaison];
  // Le deck de jeu : celui que le joueur a sélectionné lors d'un lancement précédent
  // (mémorisé sur l'appareil), sinon le deck par défaut.
  const [deckSelectionneId, setDeckSelectionneId] = useState(() => chargerDeckChoisi(decksMaison, collection) ?? deckParDefaut()?.id ?? '');
  // Le deck du duel en cours : changer de sélection dans le menu ne change pas un duel déjà lancé.
  const [deckDuelId, setDeckDuelId] = useState(null);
  // Le deck du sorcier en duel libre (null : celui par défaut, ou un étage du mode Histoire).
  const [deckAdverseId, setDeckAdverseId] = useState(null);
  const choisirDeck = (deckId) => {
    const deck = decksTous.find((candidat) => candidat.id === deckId);
    if (!deckSeJoue(deck, collection)) return false;
    setDeckSelectionneId(deck.id);
    return sauverDeckChoisi(deck.id, decksMaison, collection);
  };
  // Plateau du duel : en duel libre, le deck du joueur impose son terrain ;
  // l'Histoire et le tutoriel gardent le tirage entre les deux camps. Avant la
  // première partie, la table d'origine de Bab El sert de décor.
  const [plateauId, setPlateauId] = useState(PLATEAU_PAR_DEFAUT.id);
  // Mode Histoire : l'étage en cours (null = duel libre).
  const [histoireEtageId, setHistoireEtageId] = useState(null);
  const {
    progression: progressionHistoire, progressionRef: progressionHistoireRef,
    sauvegardeOk: sauvegardeHistoireOk, ouvrirRecit, agirRecit,
    enregistrerVictoire, recommencerRecit, effacerProgression,
  } = useRpgStory();
  // La bourse du Souk (dossier 13, lot 2) : les gestes du duel l'alimentent par
  // `noterEvenementDuel`, le solde et les quêtes du jour en sortent. Aucun écran
  // du Souk n'existe encore — l'onglet et la pastille viennent au lot 3 —, mais
  // la boucle tourne déjà : jouer paie, et les quêtes du jour avancent.
  //
  // Elle est branchée APRÈS `useRpgStory` : ses quêtes du jour lisent la
  // progression, pour ne pas proposer « ouvrir le comptoir » tant que le Souk
  // est fermé — y compris au tout premier rendu.
  const {
    credits, aReclamer: soukAReclamer, quetes: quetesSouk, bourse: portefeuilleSouk,
    noterEvenementDuel: noterEvenementDuelReel, reclamerUneQuete, reclamerLeCachet, reclamerLeCachetDeLaSemaine,
    acheterBooster, acheterCoffret, fermerOuverture, ouverture: ouvertureSouk,
  } = useSablierBourse({
    progression: progressionHistoireRef.current,
    // Un achat range ses cartes dans la collection : l'atelier de decks doit
    // les voir tout de suite, sans qu'on recharge la page.
    onCartesRangees: rafraichirCollection,
  });
  // Les duels du laboratoire ne paient ni crédits, ni quêtes, ni trophées.
  // Le témoin est celui du duel actif, pas le deck sélectionné dans l'atelier.
  const noterEvenementDuel = (evenement) => {
    if (duelRef.current?.modeMana === RPG_MODE_MANA_ESSAI) return;
    noterEvenementDuelReel(evenement);
  };
  const histoireVictoireMarqueeRef = useRef(null);
  // Un duel libre ne passe pas par la session du récit : il a son propre témoin.
  const libreVictoireMarqueeRef = useRef(null);
  // Dégâts cumulés annoncés au Souk pour le duel en cours (voir l'effet dédié).
  const degatsSorcierRef = useRef({ duel: null, annonces: 0 });
  const campagneDuelRef = useRef(null);
  // Son du jeu en deux couches : le mode Histoire porte une boucle par tour
  // (`rpgAmbientMusic.js`), tandis que les bruitages tactiles (`rpgAudio.js`)
  // restent disponibles dans tous les duels. Les deux lecteurs partagent le
  // même réglage et sont libérés au démontage.
  const musiqueRef = useRef(null);
  const musiquePlateauRef = useRef(null);
  const sfxRef = useRef(null);
  const [sonActif, setSonActif] = useState(readRpgSoundPref);
  // Le décor 3D de la table (relief, lumière, particules) : mémorisé sur l'appareil.
  const [decor3dActif, setDecor3dActif] = useState(readRpgTable3dPref);
  const basculerDecor3d = () => setDecor3dActif((actif) => { writeRpgTable3dPref(!actif); return !actif; });
  useEffect(() => { writeRpgSoundPref(sonActif); }, [sonActif]);
  useEffect(() => {
    musiqueRef.current = new RpgAmbientMusic();
    musiquePlateauRef.current = new RpgPlateauMusic();
    sfxRef.current = new RpgAudioPlayer();
    sfxRef.current.setMuted(!sonActif);
    return () => {
      musiqueRef.current?.destroy();
      musiqueRef.current = null;
      musiquePlateauRef.current?.destroy();
      musiquePlateauRef.current = null;
      sfxRef.current?.destroy();
      sfxRef.current = null;
    };
  }, []);
  useEffect(() => {
    sfxRef.current?.setMuted(!sonActif);
    musiqueRef.current?.setMuted(!sonActif);
    musiquePlateauRef.current?.setMuted(!sonActif);
  }, [sonActif]);
  // La tour de l'étage en cours commande la boucle (null : duel libre).
  const lectureHistoire = ecran === 'recit' || ecran === 'journal';
  const tourHistoireId = lectureHistoire
    ? (resumeRecitHistoire(progressionHistoire.recit)?.acte?.tourId ?? 'tour-des-listes')
    : histoireEtageId
      ? etageHistoireParId(histoireEtageId)?.tour?.id ?? null
      : null;
  useEffect(() => { musiqueRef.current?.setTour(tourHistoireId); }, [tourHistoireId]);
  useEffect(() => {
    const musique = musiqueRef.current;
    if (!musique) return;
    const plateauMusical = RPG_PLATEAUX_MUSICAUX.has(plateauId);
    if ((ecran === 'partie' || lectureHistoire) && tourHistoireId && sonActif && !plateauMusical) musique.start();
    else musique.stop();
  }, [ecran, lectureHistoire, tourHistoireId, plateauId, sonActif]);
  useEffect(() => {
    const musique = musiquePlateauRef.current;
    if (!musique) return;
    musique.setPlateau(plateauId);
    if (ecran === 'partie' && sonActif) musique.start();
    else musique.stop();
  }, [plateauId, ecran, sonActif]);
  // Un onglet mis de côté ne laisse pas la boucle tourner dans le vide ;
  // au retour, elle reprend où le duel en est.
  useEffect(() => {
    const surVisibilite = () => {
      const musique = musiqueRef.current;
      if (musique) {
        if (document.hidden) musique.pause();
        else if ((ecran === 'partie' || lectureHistoire) && tourHistoireId && sonActif && !RPG_PLATEAUX_MUSICAUX.has(plateauId)) musique.resume();
      }
      const musiquePlateau = musiquePlateauRef.current;
      if (musiquePlateau) {
        if (document.hidden) musiquePlateau.pause();
        else if (ecran === 'partie' && sonActif) musiquePlateau.resume();
      }
    };
    document.addEventListener('visibilitychange', surVisibilite);
    return () => document.removeEventListener('visibilitychange', surVisibilite);
  }, [ecran, lectureHistoire, tourHistoireId, plateauId, sonActif]);
  const basculerSon = () => setSonActif((actif) => !actif);
  const jouerSfx = (nom, delai = 0) => {
    try {
      const p = sfxRef.current;
      if (!p) return;
      p.unlock();
      p.play(nom, delai);
    } catch { /* audio indisponible */ }
  };
  const unlockSfx = () => {
    try { sfxRef.current?.unlock(); } catch { /* ignore */ }
  };
  const duelRef = useRef(null);
  const tableRef = useRef(null);
  const touchDragRef = useRef(null);
  // Aperçu au doigt : sur écran tactile le survol n'existe pas, un appui long
  // d'une seconde sur une carte ouvre donc le même aperçu (voir
  // `rpgLongPress.js`). C'est une consultation : la carte n'est jamais jouée.
  const [apercuAppui, setApercuAppui] = useState(null);
  // Armes portées par la créature pressée (vides pour toute autre carte).
  const [apercuAppuiArmes, setApercuAppuiArmes] = useState([]);
  // La fiche : là où le doigt tient une seconde, la souris **clique** — au
  // catalogue depuis toujours, et par un clic droit partout ailleurs dans le
  // jeu : la carte s'ouvre en grand, illustration et effets, sans être jouée.
  const [apercuCatalogue, setApercuCatalogue] = useState(null);
  // Les armes portées par la créature ouverte (vides partout ailleurs que sur
  // la table du duel) et le mot du sur-titre : l'écran qui a ouvert la fiche.
  const [apercuCatalogueArmes, setApercuCatalogueArmes] = useState([]);
  const [apercuCatalogueSurface, setApercuCatalogueSurface] = useState('CATALOGUE');
  const appuiLongRef = useRef(null);
  useEffect(() => {
    // Changer d'écran (menu, deck, catalogue, duel) referme l'aperçu au doigt
    // comme la fiche ouverte d'un clic, et désarme les gestes en cours.
    setApercuAppui(null);
    setApercuCatalogue(null);
    return () => {
      touchDragRef.current?.();
      touchDragRef.current = null;
      appuiLongRef.current?.();
      appuiLongRef.current = null;
    };
  }, [ecran]);
  const clicApresGlisserBloqueurRef = useRef(null);
  const animationsVisuellesTimersRef = useRef([]);
  const sequenceAnimationRef = useRef(0);
  const [, setVersion] = useState(0);
  const force = () => setVersion((v) => v + 1);
  const avancerTutoriel = (etapeActuelle, etapeSuivante) => {
    if (tutorielActif && etapeTutorielId === etapeActuelle) setEtapeTutorielId(etapeSuivante);
  };
  const continuerTutoriel = () => {
    const index = RPG_TUTORIAL_STEPS.findIndex((step) => step.id === etapeTutorielId);
    if (index >= 0 && index < RPG_TUTORIAL_STEPS.length - 1) {
      setEtapeTutorielId(RPG_TUTORIAL_STEPS[index + 1].id);
    }
  };
  const fermerTutoriel = () => setEtapeTutorielId(null);
  const terminerTutoriel = () => setEtapeTutorielId(null);
  const [animationsEntites, setAnimationsEntites] = useState({});
  const [cartesEnDestruction, setCartesEnDestruction] = useState([]);
  const [carteEnVol, setCarteEnVol] = useState(null);
  const [impactEcran, setImpactEcran] = useState(null);
  const [animationsPioche, setAnimationsPioche] = useState([]);
  const instantanePiocheRef = useRef(null);
  // Compteur de séquence pour les animations de pioche.
  const sequencePiocheRef = useRef(0);
  const carteOrigineVolRef = useRef(null);
  const actionVolRef = useRef(null);
  const sequenceVolRef = useRef(0);
  const carteCibleeHandIndexRef = useRef(null);
  const timerVolRef = useRef(null);
  const sequenceImpactRef = useRef(0);
  const timerImpactRef = useRef(null);
  const [phase, setPhase] = useState(false);
  // Début de tour : la phase s'allume le temps de la pioche, avant la phase principale.
  const [debutVisible, setDebutVisible] = useState(false);
  // Le sorcier est en deuxième phase principale (après son combat).
  const sorcierApresCombatRef = useRef(false);
  const [attaquants, setAttaquants] = useState([]);
  const [ciblesAttaque, setCiblesAttaque] = useState({});
  const [combatEntrant, setCombatEntrant] = useState(null);
  const [bloqueurGlisse, setBloqueurGlisse] = useState(null);
  const [bloqueurSelectionne, setBloqueurSelectionne] = useState(null);
  const [cibleEnCours, setCibleEnCours] = useState(null);
  // Le Défi du Jarl : après avoir désigné votre champion, il reste la créature
  // adverse à choisir — ce champ garde le champion entre les deux clics.
  const [cibleAllieeMagie, setCibleAllieeMagie] = useState(null);
  const [activationEnCours, setActivationEnCours] = useState(null);
  // Le lot du Sable : un mode d'arme qui désigne une proie (le Trait de sable
  // de la Jitte) se joue en deux clics — le bouton, puis la créature adverse.
  const [cibleArmeEnCours, setCibleArmeEnCours] = useState(null);

  // La foudre activée se désigne avec Échap, comme les autres ciblages ; la
  // proie d'un mode d'arme aussi.
  useEffect(() => {
    if (!activationEnCours) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setActivationEnCours(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activationEnCours]);
  const [terrainManaChoix, setTerrainManaChoix] = useState(null);
  const [confirmationSort, setConfirmationSort] = useState(null);
  const [annonceApercueFermeePour, setAnnonceApercueFermeePour] = useState(null);
  // Mulligan : à l'ouverture du duel, la main de départ se découvre en grand
  // et le joueur choisit les cartes qu'il renvoie dans le paquet. `null` dès
  // que l'échange est validé (ou impossible) : la partie est à lui.
  const [mulligan, setMulligan] = useState(null);
  const [apercuSurvol, setApercuSurvol] = useState(null);
  // Le panneau de l'aperçu au survol — celui du duel comme celui du
  // mulligan : sa boîte réelle sert à le coller à la carte survolée, reposé
  // avant peinture par `placerApercuSurvol`.
  const panelRef = useRef(null);
  const [carteGlissee, setCarteGlissee] = useState(null);
  const [surZoneDepot, setSurZoneDepot] = useState(false);
  const [annulationDisponible, setAnnulationDisponible] = useState(false);
  const [sortJoue, setSortJoue] = useState(null);
  const [apercuMagie, setApercuMagie] = useState(null);
  // Piles de cartes homonymes (tactile) : les groupes que le joueur a dépliés.
  const [pilesDeployees, setPilesDeployees] = useState(() => new Set());
  // Bandeau d'ouverture de tour : `{ camp, token }` tant qu'il est affiché,
  // `null` le reste du temps. Il ne dure que `RPG_ANNONCE_TOUR_DUREE`.
  const [annonceTour, setAnnonceTour] = useState(null);
  // Le camp déjà annoncé, et pour quelle session de duel : une partie neuve se
  // signale même si elle s'ouvre sur le camp de la précédente.
  const annonceTourRef = useRef({ session: 0, camp: null });
  const sequenceAnnonceTourRef = useRef(0);
  const carteGlisseeRef = useRef(null);
  const clicApresGlisserRef = useRef(false);
  const annulationRef = useRef(null);
  const timerSortRef = useRef(null);
  const timerApercuMagieRef = useRef(null);
  const timersRef = useRef([]);
  // Chaque partie a son numéro. Les minuteries du tour du sorcier (annonces,
  // attaque, animations) le portent : une partie relancée — ou quittée puis
  // reprise ailleurs — ne peut donc plus recevoir le tour de la précédente,
  // qui laissait un combat fantôme sur la table et figeait les cartes dans
  // leur dernier état (créatures mortes comprises).
  const sessionDuelRef = useRef(0);
  const later = (fn, ms) => {
    const session = sessionDuelRef.current;
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((timer) => timer !== id);
      if (sessionDuelRef.current !== session) return;
      fn();
    }, ms);
    timersRef.current.push(id);
  };
  const annulerMinuteriesDuTour = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };
  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    animationsVisuellesTimersRef.current.forEach((id) => window.clearTimeout(id));
    if (timerSortRef.current) window.clearTimeout(timerSortRef.current);
    if (timerApercuMagieRef.current) window.clearTimeout(timerApercuMagieRef.current);
    if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
    if (timerImpactRef.current) window.clearTimeout(timerImpactRef.current);
  }, []);

  // Chien de garde des images d'adieu : réarmé par React à chaque changement de
  // la liste, il retire les fantômes périmés même si la minuterie d'animation
  // qui devait s'en charger a été perdue en route.
  useEffect(() => {
    if (!cartesEnDestruction.length) return undefined;
    const derniere = Math.max(...cartesEnDestruction.map((effet) => effet.expireA ?? 0));
    const delai = Math.max(80, derniere - Date.now() + 80);
    const id = window.setTimeout(() => setCartesEnDestruction((current) => nettoyerFantomes(current)), delai);
    return () => window.clearTimeout(id);
  }, [cartesEnDestruction]);

  // Retour d'arrière-plan : un téléphone qui met l'onglet en veille peut avaler
  // les minuteries d'animation. On rattrape alors à la main tout ce qui serait
  // resté figé — image de carte détruite, carte en vol, halos de combat — pour
  // que la table retrouve exactement l'état du duel.
  useEffect(() => {
    const rattraperAnimations = () => {
      if (document.visibilityState !== 'visible') return;
      setCartesEnDestruction((current) => {
        const restants = nettoyerFantomes(current);
        return restants.length === current.length ? current : restants;
      });
      setAnimationsEntites((current) => (Object.keys(current).length ? {} : current));
      const action = actionVolRef.current;
      if (action) {
        if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
        timerVolRef.current = null;
        actionVolRef.current = null;
        setCarteEnVol(null);
        action.resoudre();
      }
    };
    document.addEventListener('visibilitychange', rattraperAnimations);
    window.addEventListener('pageshow', rattraperAnimations);
    return () => {
      document.removeEventListener('visibilitychange', rattraperAnimations);
      window.removeEventListener('pageshow', rattraperAnimations);
    };
  }, []);

  useEffect(() => {
    if (!terrainManaChoix) return undefined;
    const fermerAvecEchap = (event) => {
      if (event.key === 'Escape') setTerrainManaChoix(null);
    };
    window.addEventListener('keydown', fermerAvecEchap);
    return () => window.removeEventListener('keydown', fermerAvecEchap);
  }, [terrainManaChoix]);

  // Sécurité : si un glisser-déposer échoue, l'état ne reste jamais figé
  // (le cadre jaune a été retiré, mais on purge aussi l'état pour éviter un
  // écran qui semble bloqué).
  useEffect(() => {
    if (!carteGlissee) return undefined;
    const purgeGlisser = () => {
      // Le glisser-déposer tactile lui aussi se range de force : son fantôme et
      // ses écouteurs ne survivent jamais à une purge (nettoyage idempotent).
      touchDragRef.current?.();
      touchDragRef.current = null;
      carteGlisseeRef.current = null;
      setCarteGlissee(null);
      setSurZoneDepot(false);
      if (carteOrigineVolRef.current?.carteId === carteGlissee) carteOrigineVolRef.current = null;
      clicApresGlisserRef.current = false;
    };
    const onKey = (event) => { if (event.key === 'Escape') purgeGlisser(); };
    window.addEventListener('pointerup', purgeGlisser);
    window.addEventListener('pointercancel', purgeGlisser);
    window.addEventListener('dragend', purgeGlisser);
    window.addEventListener('blur', purgeGlisser);
    window.addEventListener('keydown', onKey);
    // Sur certains WebView le dragend ne part pas : purge automatique après 3 s
    const safety = window.setTimeout(purgeGlisser, 3000);
    return () => {
      window.removeEventListener('pointerup', purgeGlisser);
      window.removeEventListener('pointercancel', purgeGlisser);
      window.removeEventListener('dragend', purgeGlisser);
      window.removeEventListener('blur', purgeGlisser);
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(safety);
    };
  }, [carteGlissee]);

  // Chien de garde du vol de carte : sa minuterie de 720 ms résout l'action et
  // range la carte en vol, mais une minuterie avalée (WebView mise en arrière-
  // plan, onglet réveillé en route) laisserait la table `is-card-flight-active`
  // — donc totalement muette (`pointer-events: none`) : plus un geste ne passe,
  // ni carte, ni commande, ni appui long. Au bout de 2,5 s, le vol se résout
  // de force, exactement comme `purgeGlisser` purge un glisser figé.
  useEffect(() => {
    if (!carteEnVol) return undefined;
    const secours = window.setTimeout(() => {
      if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
      timerVolRef.current = null;
      const action = actionVolRef.current;
      actionVolRef.current = null;
      setCarteEnVol((current) => (current ? null : current));
      action?.resoudre();
    }, 2500);
    return () => window.clearTimeout(secours);
  }, [carteEnVol?.token]);

  useLayoutEffect(() => {
    if (carteEnVol?.phase !== 'pending') return;
    const table = tableRef.current;
    if (!table) return;
    const source = [...table.querySelectorAll('.rpg-hand__card')].find((element) => (
      element.dataset.cardId === carteEnVol.carteId
      && element.dataset.handIndex === String(carteEnVol.handIndex)
    ));
    if (!source) {
      setCarteEnVol((current) => current?.token === carteEnVol.token ? null : current);
      return;
    }
    const from = mesurerBoiteCarteMain(source, 128, 160);
    const to = mesurerDestinationVol(table, carteEnVol.kind, from, carteEnVol.carteId);
    const slotWidth = source.offsetWidth || from.width;
    const slotHeight = source.offsetHeight || from.height;
    setCarteEnVol((current) => current?.token === carteEnVol.token && current.phase === 'pending'
      ? { ...current, from, to, slotWidth, slotHeight, phase: 'flying' }
      : current);
  }, [carteEnVol?.token]);

  const nouvellePartie = (options = {}) => {
    // Nouvelle partie : la précédente perd la parole. Sans ça, une annonce ou
    // une attaque du sorcier encore en vol atterrissait sur la table neuve.
    sessionDuelRef.current += 1;
    annulerMinuteriesDuTour();
    const modeTutoriel = options.tutoriel === true;
    const deckEssai = deckManaEssaiParId(options.essaiManaId);
    const adversaireEssai = deckEssai ? adversaireManaEssai(deckEssai) : null;
    const etageId = deckEssai ? null : options.etageId !== undefined ? options.etageId : histoireEtageId;
    const etageCourant = etageId ? etageHistoireParId(etageId)?.etage ?? null : null;
    const deckChoisiId = modeTutoriel ? 'veilleurs-du-desert' : options.deckId ?? deckSelectionneId;
    const deckJoueurSelectionne = decksTous.find((deck) => deck.id === deckChoisiId && deckSeJoue(deck, collection));
    // Duel libre : le sorcier joue la Cour des Djinns, ou un autre deck si le joueur joue déjà la Cour.
    // Dans le tutoriel, son paquet de Montagnes est volontairement passif.
    const deckAdverse = modeTutoriel || etageCourant || sorcierDeck || deckEssai ? null : deckAdversePour(deckJoueurSelectionne);
    setTutorielActif(modeTutoriel);
    setEtapeTutorielId(modeTutoriel ? 'bienvenue' : null);
    setDeckDuelId(deckEssai?.id ?? (modeTutoriel ? deckJoueurSelectionne?.id ?? 'veilleurs-du-desert' : joueurDeck ? null : deckJoueurSelectionne?.id ?? null));
    setDeckAdverseId(adversaireEssai?.id ?? deckAdverse?.id ?? null);
    // En duel libre, le deck du joueur impose toujours le terrain. L'Histoire
    // et le tutoriel gardent le tirage entre les deux camps. Les paquets joués
    // sont exactement ceux du duel — une prop brute parle par sa couleur
    // dominante, un étage d'Histoire par la clé de son deck de campagne. En
    // partie réelle (`variantesPlateaux`), le tirage peut échanger le terrain
    // contre son double merveilleux ; sans la prop (tests, scénarios), le
    // classique est gardé.
    const modeLibre = !modeTutoriel && !etageCourant;
    const tiragePlateau = tirerPlateauDuDuel({
      deckJoueur: deckEssai ?? (modeTutoriel ? deckJoueurSelectionne : joueurDeck ?? deckJoueurSelectionne),
      deckAdverse: adversaireEssai ?? (modeTutoriel
        ? RPG_TUTORIAL_OPPONENT_DECK
        : etageCourant ? etageCourant.deck : sorcierDeck ?? deckAdverse),
      rng,
      variantesFantaisistes: variantesPlateaux,
      campImpose: modeLibre ? 'joueur' : null,
    });
    const plateau = tiragePlateau.plateau;
    setPlateauId(plateau.id);
    // `play()` doit partir directement du geste qui lance le duel : un effet
    // React différé peut être refusé par la politique d'autoplay du navigateur.
    const musiquePlateau = musiquePlateauRef.current;
    musiquePlateau?.setPlateau(plateau.id);
    if (modeLibre && sonActif && RPG_PLATEAUX_MUSICAUX.has(plateau.id)) {
      void musiquePlateau?.start();
    }
    duelRef.current = rpgNouveauDuel({
      joueurDeck: deckEssai?.cardIds ?? (modeTutoriel
        ? RPG_TUTORIAL_PLAYER_DECK
        : joueurDeck ?? deckJoueurSelectionne?.cardIds ?? RPG_DECK_JOUEUR_BASE),
      sorcierDeck: adversaireEssai?.cardIds ?? (modeTutoriel
        ? RPG_TUTORIAL_OPPONENT_DECK
        : etageCourant ? deckHistoire(etageCourant.deck) : sorcierDeck ?? deckAdverse?.cardIds ?? RPG_DECK_SORCIER_BASE),
      sorcierPuissance: modeTutoriel ? 0 : etageCourant ? etageCourant.puissance : sorcierPuissance,
      sorcierIA: etageCourant ? etageCourant.ia : undefined,
      modeMana: deckEssai ? RPG_MODE_MANA_ESSAI : null,
      joueurCouleurs: deckEssai?.elements,
      sorcierCouleurs: adversaireEssai?.elements,
      rng,
    });
    if (deckEssai) duelRef.current.essaiDeckId = deckEssai.id;
    if (modeTutoriel) preparerDuelTutoriel(duelRef.current);
    histoireVictoireMarqueeRef.current = null;
    campagneDuelRef.current = options.campagne ? {
      session: sessionDuelRef.current, etageId,
      curseur: progressionHistoireRef.current.recit?.curseur,
    } : null;
    instantanePiocheRef.current = {
      joueur: { deck: duelRef.current.joueur.deck.length + duelRef.current.joueur.main.length, main: 0 },
      sorcier: { deck: duelRef.current.sorcier.deck.length + duelRef.current.sorcier.main.length, main: 0 },
    };
    // Le volet du mulligan s'ouvre sur la main qui vient d'être piochée — tant
    // qu'il y a une main à montrer, et tant que le moteur autorise l'échange.
    setMulligan(!modeTutoriel && rpgPeutMulligan(duelRef.current, 'joueur') && duelRef.current.joueur.main.length
      ? { etape: 'choix', choix: new Set(), nouveau: [], bilan: '' }
      : null);
    setAnimationsPioche([]);
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCombatEntrant(null);
    setBloqueurGlisse(null);
    setBloqueurSelectionne(null);
    clicApresGlisserBloqueurRef.current = null;
    setCibleEnCours(null);
    setConfirmationSort(null);
    setApercuSurvol(null);
    appuiLongRef.current?.();
    appuiLongRef.current = null;
    setApercuAppui(null);
    setCarteGlissee(null);
    setSurZoneDepot(false);
    setAnnulationDisponible(false);
    setSortJoue(null);
    setApercuMagie(null);
    setAnimationsEntites({});
    setCartesEnDestruction([]);
    setCarteEnVol(null);
    setImpactEcran(null);
    carteOrigineVolRef.current = null;
    carteCibleeHandIndexRef.current = null;
    actionVolRef.current = null;
    if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
    if (timerImpactRef.current) window.clearTimeout(timerImpactRef.current);
    timerVolRef.current = null;
    timerImpactRef.current = null;
    animationsVisuellesTimersRef.current.forEach((id) => window.clearTimeout(id));
    animationsVisuellesTimersRef.current = [];
    annulationRef.current = null;
    if (timerSortRef.current) window.clearTimeout(timerSortRef.current);
    if (timerApercuMagieRef.current) window.clearTimeout(timerApercuMagieRef.current);
    timerApercuMagieRef.current = null;
    carteGlisseeRef.current = null;
    clicApresGlisserRef.current = false;
    jouerSfx('apparition');
    force();
  };

  /* ── Mulligan : la main de départ se lit en grand, puis s'échange une fois ─ */
  const basculerCarteMulligan = (index) => {
    unlockSfx();
    setMulligan((current) => {
      if (!current || current.etape !== 'choix') return current;
      const choix = new Set(current.choix);
      if (choix.has(index)) choix.delete(index);
      else choix.add(index);
      return { ...current, choix };
    });
    jouerSfx('hover');
  };
  const viderSelectionMulligan = () => {
    jouerSfx('annuler');
    setMulligan((current) => (current ? { ...current, choix: new Set() } : current));
  };
  const validerMulligan = () => {
    const duelCourant = duelRef.current;
    if (!duelCourant || !mulligan || mulligan.etape !== 'choix') return;
    const mainAvant = duelCourant.joueur.main.length;
    masquerApercuSurvol();
    const { ecartees, piochees } = rpgMulligan(duelCourant, 'joueur', [...mulligan.choix], rng);
    // Le sorcier profite du même droit, avec sa propre lecture de sa main.
    const adverse = rpgMulliganSorcier(duelCourant, rng);
    const pluriel = (n) => (n > 1 ? 's' : '');
    force();
    if (!ecartees.length) {
      // Rien n'a bougé : pas de nouvelle main à relire, le volet se referme sur
      // la table. Ce que le sorcier a fait de sa main se lit à son compteur.
      if (duelCourant.modeMana === RPG_MODE_MANA_ESSAI) rpgDemarrerManaEssai(duelCourant);
      setMulligan(null);
      return;
    }
    jouerSfx('card_draw', 0.05);
    // Une étape de résultat : la main neuve se relit en grand, ce qui entre est
    // signalé, et le geste qui referme le volet est celui qui ouvre le duel.
    setMulligan({
      etape: 'resultat',
      choix: new Set(),
      // Les cartes qui viennent d'entrer en main : le volet les signale.
      nouveau: piochees.map((carte, offset) => mainAvant - ecartees.length + offset),
      bilan: `Vous écartez ${ecartees.length} carte${pluriel(ecartees.length)} et piochez ${piochees.length} carte${pluriel(piochees.length)} · le sorcier ${adverse.ecartees.length ? `en change ${adverse.ecartees.length}` : 'garde sa main'}.`,
    });
  };
  const terminerMulligan = () => {
    masquerApercuSurvol();
    // Le volet se ferme après le choix ; le tour 1 démarre seulement alors.
    if (duelRef.current?.modeMana === RPG_MODE_MANA_ESSAI) rpgDemarrerManaEssai(duelRef.current);
    setMulligan(null);
    force();
  };
  const choisirNouveauManaEssai = (couleur) => {
    if (mulligan || !duelRef.current?.manaEssaiDemarre) return;
    const resultat = rpgChoisirCouleurMana(duelRef.current, 'joueur', couleur);
    if (!resultat.ok) { jouerSfx('erreur'); return; }
    jouerSfx('select');
    force();
  };

  const duel = duelRef.current;
  const plateau = plateauParId(plateauId) ?? PLATEAU_PAR_DEFAUT;
  // Bandeau d'ouverture de tour : chaque bascule de `duel.tour` — le tour du
  // joueur rendu, celui du sorcier rendu, une partie neuve, une reprise —
  // annonce 1,5 s en grand le camp qui prend la main, puis s'efface.
  //
  // Trois silences possibles : pas de duel, écran autre que la table (menu,
  // atelier, récit), volet de mulligan ouvert — la table n'est encore à
  // personne — et duel terminé, où il n'y a plus de tour à annoncer. Le témoin
  // garde la **session** et le camp déjà annoncés : une partie relancée se
  // signale même si elle s'ouvre sur le camp de la précédente, tandis qu'un
  // aller-retour par le menu ne rejoue pas le bandeau du tour en cours.
  const campDuTour = duel?.tour ?? null;
  const duelTermine = duel ? Boolean(rpgVainqueur(duel)) : false;
  // Le volet du mulligan tient la table avant les retours anticipés de la page,
  // comme `mulliganOuvert` plus bas : deux lectures d'un même état.
  const voletMulliganOuvert = Boolean(mulligan);
  useEffect(() => {
    if (!campDuTour || ecran !== 'partie' || voletMulliganOuvert || duelTermine) {
      setAnnonceTour(null);
      return undefined;
    }
    const session = sessionDuelRef.current;
    const dejaAnnonce = annonceTourRef.current;
    if (dejaAnnonce.session === session && dejaAnnonce.camp === campDuTour) return undefined;
    annonceTourRef.current = { session, camp: campDuTour };
    const token = ++sequenceAnnonceTourRef.current;
    setAnnonceTour({ camp: campDuTour, token });
    const minuterie = window.setTimeout(() => {
      // Seul le dernier bandeau se retire : un tour qui bascule pendant les
      // 1,5 s de l'autre ne laisse pas la minuterie précédente effacer le sien.
      setAnnonceTour((courant) => (courant?.token === token ? null : courant));
    }, RPG_ANNONCE_TOUR_DUREE);
    return () => window.clearTimeout(minuterie);
  }, [campDuTour, ecran, voletMulliganOuvert, duelTermine]);

  useEffect(() => {
    if (!tutorielActif || etapeTutorielId !== 'tour-adverse' || !duel || duel.tour !== 'joueur' || duel.annonce || combatEntrant) return;
    setEtapeTutorielId('attaque');
  }, [tutorielActif, etapeTutorielId, duel?.tour, duel?.annonce, combatEntrant]);
  useLayoutEffect(() => {
    if (!duel) return;
    const instantaneActuel = {
      joueur: { deck: duel.joueur.deck.length, main: duel.joueur.main.length },
      sorcier: { deck: duel.sorcier.deck.length, main: duel.sorcier.main.length },
    };
    const instantanePrecedent = instantanePiocheRef.current;
    instantanePiocheRef.current = instantaneActuel;
    if (!instantanePrecedent) return;

    const animations = [];
    for (const side of ['joueur', 'sorcier']) {
      const camp = duel[side];
      const nombrePioches = Math.min(8, Math.max(0, instantanePrecedent[side].deck - camp.deck.length));
      if (!nombrePioches) continue;
      const indexPremierePioche = Math.max(0, camp.main.length - nombrePioches);
      for (let index = 0; index < nombrePioches; index += 1) {
        animations.push({
          token: ++sequencePiocheRef.current,
          side,
          handIndex: indexPremierePioche + index,
          delay: index * 110,
        });
      }
    }
    if (!animations.length) return;
    animations.forEach((a, idx) => { jouerSfx('card_draw', idx * 0.08); });
    setAnimationsPioche((current) => [...current, ...animations].slice(-12));
    animations.forEach((animation) => {
      const timer = window.setTimeout(() => {
        setAnimationsPioche((current) => current.filter((active) => active.token !== animation.token));
      }, 1050 + animation.delay);
      timersRef.current.push(timer);
    });
  }, [duel, duel?.joueur.deck.length, duel?.joueur.main.length, duel?.sorcier.deck.length, duel?.sorcier.main.length]);

  useLayoutEffect(() => {
    if (!duel) return;
    const terrains = tableRef.current?.querySelector('.rpg-terrains--joueur');
    if (terrains) {
      terrains.scrollLeft = terrains.scrollWidth;
      terrains.scrollTop = terrains.scrollHeight;
    }
  }, [duel?.joueur.terrains.length]);

  const afficherApercuSurvol = (carte, event, armes = []) => {
    if (!carte || !event?.currentTarget) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    // Première pose, au bord de la carte : le panneau n'existe pas encore,
    // sa taille est inconnue. L'effet de mise en page ci-dessous le repose
    // d'après sa boîte réelle, avant la première peinture.
    setApercuSurvol({
      carteId: carte.id,
      armesIds: armes,
      rectangle: {
        left: rectangle.left,
        right: rectangle.right,
        top: rectangle.top,
        bottom: rectangle.bottom,
        width: rectangle.width,
        height: rectangle.height,
      },
      style: { left: `${rectangle.right + 12}px`, top: `${rectangle.top}px` },
    });
    if (!viewport.mobile) jouerSfx('hover');
  };
  const masquerApercuSurvol = () => setApercuSurvol(null);

  // Reposé avant peinture : dès que le panneau de l'aperçu est rendu, sa
  // boîte réelle remplace la première pose et le colle à la carte survolée —
  // le joueur ne voit jamais l'aperçu sauter d'une place à l'autre.
  useLayoutEffect(() => {
    if (!apercuSurvol?.rectangle || !panelRef.current) return;
    const style = placerApercuSurvol(apercuSurvol.rectangle, panelRef.current);
    setApercuSurvol((current) => {
      if (!current?.rectangle) return current;
      if (current.style?.left === style.left && current.style?.top === style.top) return current;
      return { ...current, style };
    });
  }, [apercuSurvol]);

  // ── L'aperçu au doigt : appui long d'une seconde sur une carte ────────────
  const annulerAppuiLong = () => {
    appuiLongRef.current?.();
    appuiLongRef.current = null;
  };
  const fermerApercuAppui = () => {
    annulerAppuiLong();
    jouerSfx('annuler');
    setApercuAppui(null);
  };
  /** Un seul geste pour toute la page : toute carte affichée porte un
   * `data-card-id`, en main, sur la table, dans un rail de terrains, sur le
   * dessus d'un cimetière, au catalogue et dans la liste d'un deck. */
  const demarrerAppuiLongCarte = (event) => {
    const hote = event.target?.closest?.('[data-card-id]');
    const carte = cardById(hote?.dataset?.cardId);
    if (!hote || !carte) return;
    // Un second doigt, une souris ou un clic droit ne doit pas désarmer l'appui
    // déjà en cours du premier doigt : seul un geste qui armerait vraiment un
    // appui long reprend la main.
    if (!peutDemarrerAppuiLong(event)) return;
    annulerAppuiLong();
    const armesDeLaCarte = (hote.dataset.armes ?? '').split(' ').filter(Boolean);
    appuiLongRef.current = startRpgLongPress(event, {
      source: hote,
      onTrigger: () => {
        // Le même `pointerdown` a pu armer un glisser-déposer tactile : consulter
        // une carte ne la déplace pas. Le survol éventuel s'efface aussi.
        touchDragRef.current?.();
        touchDragRef.current = null;
        masquerApercuSurvol();
        unlockSfx();
        jouerSfx('hover');
        setApercuAppuiArmes(armesDeLaCarte);
        setApercuAppui(carte.id);
      },
    });
  };
  // ── La fiche du catalogue : la carte cliquée s'ouvre en grand ─────────────
  const fermerApercuCatalogue = () => {
    jouerSfx('annuler');
    setApercuCatalogue(null);
  };
  /** Le jeu est une surface de lecture : cliquer ou cliquer droit une carte
   * l'agrandit — illustration entière et effets — sans rien jouer ni quitter
   * l'onglet. Le survol de la souris, qui montrait déjà l'aperçu rapide,
   * s'efface : une seule lecture à la fois.
   *
   * **Une carte, une fiche** : le volet ne montre que la carte désignée — ni
   * flèches, ni compteur, ni pas de page. Pour lire une autre carte, on ouvre
   * la sienne. `armes` dit ce que porte la créature ouverte (duel), `surface`
   * le mot du sur-titre : l'écran qui a ouvert la fiche. */
  const ouvrirApercuCatalogue = (carte, { armes = [], surface = 'CATALOGUE' } = {}) => {
    if (!carte) return;
    annulerAppuiLong();
    masquerApercuSurvol();
    unlockSfx();
    jouerSfx('hover');
    setApercuCatalogueArmes(armes);
    setApercuCatalogueSurface(surface);
    setApercuCatalogue(carte.id);
  };
  // Échap referme l'aperçu au doigt comme la fiche, à l'égal du volet et du
  // bouton Fermer. Il n'y a rien d'autre à faire au clavier : la fiche ne
  // montre qu'une carte, elle n'a ni flèches ni pas de page.
  useEffect(() => {
    if (!apercuAppui && !apercuCatalogue) return undefined;
    const surClavier = (event) => {
      if (event.key !== 'Escape') return;
      if (apercuCatalogue) fermerApercuCatalogue();
      else fermerApercuAppui();
    };
    window.addEventListener('keydown', surClavier);
    return () => window.removeEventListener('keydown', surClavier);
  }, [apercuAppui, apercuCatalogue]);
  // Le menu contextuel natif (callout iOS, « enregistrer l'image » / sélection
  // Android) n'appartient à aucun geste de la table : étouffé sur toute la
  // coque du jeu, pas seulement pendant un appui long armé. Sans ça, une seule
  // longue pression qui échappe à `rpgLongPress.js` ouvre le menu système, qui
  // casse à son tour la chaîne tactile de la WebView — le jeu devient sourd.
  const neutraliserMenuContextuel = (event) => event.preventDefault();
  // Le clic droit, lui, est un geste de **consultation** : sur une carte — tout
  // élément qui porte un `data-card-id`, en main, sur la table, dans un rail de
  // terrains, la liste d'un deck, le guide ou la grille du catalogue —, il
  // ouvre la fiche en grand sans rien jouer. **Une carte, une fiche** : ce que
  // le bouton droit montre, c'est la carte qu'il désigne, et rien d'autre —
  // pas de flèches, pas de compteur, pas de voisine. Son sur-titre dit d'où
  // elle vient : la table du duel, le catalogue, ou le jeu lui-même. Ailleurs —
  // la table nue, un bouton, une rangée vide —, il n'ouvre rien et se contente
  // d'étouffer le menu du navigateur, comme avant.
  //
  // Une carte qui a déjà un sens pour son clic droit garde le sien à elle : le
  // clic droit de l'atelier retire un exemplaire du deck
  // (`RpgDeckAtelier.jsx`), et l'atelier ne laisse pas son geste remonter
  // jusqu'ici.
  const surMenuContextuel = (event) => {
    event.preventDefault();
    const hote = event.target?.closest?.('[data-card-id]');
    const carte = cardById(hote?.dataset?.cardId);
    if (!hote || !carte) return;
    ouvrirApercuCatalogue(carte, {
      armes: (hote.dataset.armes ?? '').split(' ').filter(Boolean),
      surface: SURFACE_FICHE[ecran] ?? 'LE SABLIER',
    });
  };
  // En portrait, l'écran de rotation reprend la main : plus rien à consulter.
  useEffect(() => {
    if (viewport.portrait && apercuAppui) fermerApercuAppui();
  }, [viewport.portrait, apercuAppui]);

  // « M » coupe ou rend la musique d'ambiance, comme sur la course.
  useEffect(() => {
    if (ecran !== 'partie') return undefined;
    const surTouche = (event) => {
      const cible = event.target?.tagName;
      if (cible === 'INPUT' || cible === 'TEXTAREA' || cible === 'SELECT') return;
      if (event.key?.toLowerCase() !== 'm') return;
      basculerSon();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ecran]);

  const demarrerEtage = (etageId, { campagne = false } = {}) => {
    if (!etageEstDebloque(progressionHistoireRef.current, etageId)) return;
    if (campagne) {
      const curseur = progressionHistoireRef.current.recit?.curseur;
      if (curseur?.type !== 'duel' || curseur.etageId !== etageId) return;
    }
    unlockSfx();
    jouerSfx('select');
    setHistoireEtageId(etageId);
    nouvellePartie({ etageId, campagne });
    reprendrePartie();
    // Le contexte audio naît dans le geste qui lance l'étage : les navigateurs
    // n'accordent le son qu'à un tel geste, l'effet ci-dessus ne sert qu'aux
    // reprises (retour au duel, préférence rendue).
    musiqueRef.current?.setTour(etageHistoireParId(etageId)?.tour?.id ?? null);
    musiqueRef.current?.start();
    sfxRef.current?.unlock();
  };

  const demarrerPartie = (deckId) => {
    unlockSfx();
    jouerSfx('select');
    setHistoireEtageId(null);
    nouvellePartie({ etageId: null, deckId: typeof deckId === 'string' ? deckId : undefined });
    reprendrePartie();
    sfxRef.current?.unlock();
  };

  const demarrerEssaiMana = (deckId) => {
    if (!deckManaEssaiParId(deckId)) return;
    unlockSfx();
    jouerSfx('select');
    setHistoireEtageId(null);
    nouvellePartie({ etageId: null, essaiManaId: deckId });
    reprendrePartie();
    sfxRef.current?.unlock();
  };

  const demarrerTutoriel = () => {
    unlockSfx();
    jouerSfx('select');
    setHistoireEtageId(null);
    nouvellePartie({ etageId: null, tutoriel: true, deckId: 'veilleurs-du-desert' });
    reprendrePartie();
    sfxRef.current?.unlock();
  };

  // Le lecteur ne laisse ni ancien tour adverse, ni sort en vol s'exécuter
  // derrière une scène. Le plateau n'est pas une sauvegarde du récit.
  const libererDuelPourLecture = () => {
    sessionDuelRef.current += 1;
    annulerMinuteriesDuTour();
    campagneDuelRef.current = null;
    duelRef.current = null;
    actionVolRef.current = null;
    if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
    if (timerSortRef.current) window.clearTimeout(timerSortRef.current);
    if (timerApercuMagieRef.current) window.clearTimeout(timerApercuMagieRef.current);
    // Aucun état de geste ne survit au départ pour la lecture : un vol de carte
    // ou un glisser laissé en arrière rendrait la table `is-card-flight-active`
    // — donc muette (`pointer-events: none`) — au retour du duel.
    timerVolRef.current = null;
    timerSortRef.current = null;
    timerApercuMagieRef.current = null;
    setCarteEnVol(null);
    carteOrigineVolRef.current = null;
    setCarteGlissee(null);
    carteGlisseeRef.current = null;
    setSurZoneDepot(false);
    clicApresGlisserRef.current = false;
    clicApresGlisserBloqueurRef.current = null;
    setBloqueurGlisse(null);
    setMulligan(null);
    setTutorielActif(false);
    setHistoireEtageId(null);
    setApercuSurvol(null);
    setApercuAppui(null);
  };
  const sonLecture = () => {
    unlockSfx();
    musiqueRef.current?.setTour('tour-des-listes');
    if (sonActif) musiqueRef.current?.start();
  };
  const continuerCampagne = () => {
    // Un duel encore en mémoire se reprend normalement depuis le menu.
    if (campagneDuelRef.current?.session === sessionDuelRef.current
      && duelRef.current && !rpgVainqueur(duelRef.current)) {
      reprendrePartie();
      return;
    }
    libererDuelPourLecture();
    ouvrirRecit();
    sonLecture();
    setEcran('recit');
  };
  const ouvrirJournal = () => {
    libererDuelPourLecture();
    sonLecture();
    setEcran('journal');
  };
  const nouveauRecit = () => {
    libererDuelPourLecture();
    recommencerRecit();
    sonLecture();
    setEcran('recit');
  };

  if (lectureHistoire) {
    const decksJouablesHistoire = decksTous.filter((deck) => deckSeJoue(deck, collection));
    const deckActifHistoire = decksJouablesHistoire.find((deck) => deck.id === deckSelectionneId) ?? decksJouablesHistoire[0] ?? deckParDefaut();
    return (
      <div ref={shellRef} className={`rpg-battle rpg-battle--menu${pleinEcran ? ' is-immersive' : ''}`} data-scene={ecran} onContextMenu={neutraliserMenuContextuel}>
        {ecran === 'journal' ? (
          <RpgStoryJournal recit={progressionHistoire.recit} cardArt={cardArt}
            onExit={() => setEcran('histoire')} onContinue={continuerCampagne}
            sauvegardeOk={sauvegardeHistoireOk} sonActif={sonActif} onToggleSound={basculerSon} />
        ) : (
          <RpgStoryScene recit={progressionHistoire.recit} etagesVaincus={progressionHistoire.etagesVaincus}
            deckNom={deckActifHistoire?.name ?? deckActifHistoire?.nom ?? 'Veilleurs du Désert'}
            deckActifId={deckActifHistoire?.id ?? null}
            decksJouables={decksJouablesHistoire}
            onSelectDeck={choisirDeck}
            cardArt={cardArt} onEvent={agirRecit} onStartDuel={(id) => demarrerEtage(id, { campagne: true })}
            onExit={() => setEcran('histoire')} onJournal={ouvrirJournal}
            sauvegardeOk={sauvegardeHistoireOk} sonActif={sonActif} onToggleSound={basculerSon}
            onSfx={jouerSfx} />
        )}
      </div>
    );
  }

  if (ecran !== 'partie') {
    return (
      <div ref={shellRef} className={`rpg-battle rpg-battle--menu${pleinEcran ? ' is-immersive' : ''}`} data-scene="menu" onPointerDown={demarrerAppuiLongCarte} onContextMenu={surMenuContextuel}>
        <EffetsSprite />
        <GameModeMenu
          screen={ecran}
          selectedDeckId={deckSelectionneId}
          onSelectDeck={choisirDeck}
          onChangeScreen={setEcran}
          onStartGame={demarrerPartie}
          onStartManaEssai={demarrerEssaiMana}
          onStartTutorial={demarrerTutoriel}
          onStartCardGuide={() => setEcran('guide')}
          onResumeGame={reprendrePartie}
          hasGame={Boolean(duel)}
          progressionHistoire={progressionHistoire}
          onStartEtage={demarrerEtage}
          onResetHistoire={() => {
            // Les cartes déjà acquises ne disparaissent pas en réinitialisant
            // les verrous des tours (la collection locale est sinon dérivée).
            if (!sauverCollectionDistante(collection)) return false;
            libererDuelPourLecture();
            effacerProgression();
            return true;
          }}
          onContinueRecit={continuerCampagne}
          onJournalRecit={ouvrirJournal}
          onRestartRecit={nouveauRecit}
          sauvegardeHistoireOk={sauvegardeHistoireOk}
          duelEnCours={Boolean(duel && !rpgVainqueur(duel))}
          campagneEnCours={Boolean(campagneDuelRef.current)}
          decksMaison={decksMaison}
          collection={collection}
          credits={credits}
          aReclamer={soukAReclamer}
          quetes={quetesSouk}
          onReclamerQuete={reclamerUneQuete}
          onReclamerCachet={reclamerLeCachet}
          onReclamerSemaine={reclamerLeCachetDeLaSemaine}
          portefeuille={portefeuilleSouk}
          progression={progressionHistoire}
          ouverture={ouvertureSouk}
          onOuvrirBooster={acheterBooster}
          onOuvrirCoffret={acheterCoffret}
          onFermerOuverture={fermerOuverture}
          statutSync={statutSync}
          onEnregistrerDeckMaison={enregistrerDeckMaison}
          onSupprimerDeckMaison={supprimerDeckMaison}
          onHoverCard={afficherApercuSurvol}
          onLeaveHoverCard={masquerApercuSurvol}
          onOpenCardPreview={ouvrirApercuCatalogue}
          onPlaySfx={jouerSfx}
          fullscreen={pleinEcran}
          onToggleFullscreen={basculerPleinEcran}
        />
        {apercuSurvol && (
          <HoverCardPreview
            carte={cardById(apercuSurvol.carteId)}
            style={apercuSurvol.style}
            panelRef={panelRef}
          />
        )}
        {apercuAppui && <ApercuCarteAppuiLong carte={cardById(apercuAppui)} onFermer={fermerApercuAppui} />}
        {apercuCatalogue && (
          <ApercuCarteCatalogue
            carte={cardById(apercuCatalogue)}
            armes={cartesDesIds(apercuCatalogueArmes)}
            surface={apercuCatalogueSurface}
            onFermer={fermerApercuCatalogue}
          />
        )}
      </div>
    );
  }
  if (!duel) return null;
  const vainqueur = rpgVainqueur(duel);
  const etageHistoire = histoireEtageId ? etageHistoireParId(histoireEtageId)?.etage ?? null : null;
  const etageSuivant = histoireEtageId ? prochainEtage(histoireEtageId) : null;
  const tourDuJoueur = duel.tour === 'joueur' && !vainqueur;
  // Fin de tour : le camp qui a fini ne joue plus ; l'AUTRE a la main pour une magie rapide.
  const finTourJoueur = Boolean(duel.finDeTour?.cote === 'joueur' && !vainqueur);
  const fenetreFinTour = Boolean(duel.finDeTour?.cote === 'sorcier' && !vainqueur);
  const monTour = tourDuJoueur && !finTourJoueur;
  // Tant que le volet de mulligan est ouvert, la table attend : rien ne se
  // joue, rien ne s'engage, et le tour ne peut pas être rendu.
  const mulliganOuvert = Boolean(mulligan);
  const choixManaEssaiOuvert = duel.modeMana === RPG_MODE_MANA_ESSAI
    && Boolean(duel.joueur.manaChoixEnAttente) && !mulliganOuvert && !vainqueur;
  const etapeTutoriel = RPG_TUTORIAL_STEPS.find((step) => step.id === etapeTutorielId) ?? null;
  const indexEtapeTutoriel = etapeTutoriel ? RPG_TUTORIAL_STEPS.findIndex((step) => step.id === etapeTutoriel.id) : -1;
  const deckJoueurAffiche = (duel.modeMana === RPG_MODE_MANA_ESSAI ? deckManaEssaiParId(duel.essaiDeckId) : null)
    ?? decksTous.find((deck) => deck.id === (deckDuelId ?? deckSelectionneId) && deckSeJoue(deck, collection)) ?? RPG_DECKS[0];
  const deckAdverseAffiche = (duel.modeMana === RPG_MODE_MANA_ESSAI ? deckManaEssaiParId(deckAdverseId) : null)
    ?? RPG_DECKS.find((deck) => deck.id === deckAdverseId) ?? deckAdverseParDefaut() ?? RPG_DECKS[0];
  const nomSorcierAdverse = etageHistoire?.nom ?? (tutorielActif ? 'Sorcier d’entraînement' : duel.modeMana === RPG_MODE_MANA_ESSAI ? 'Sorcier d’essai' : 'Ifrit al-Ahmar');
  // Fenêtre de réponse : pendant une attaque, ou quand le sorcier vient d'annoncer une carte.
  const fenetreSort = Boolean(duel.annonce && !vainqueur);
  const apercuAnnonceOuvert = Boolean(fenetreSort && annonceApercueFermeePour !== duel.annonce);
  const carteAnnoncee = fenetreSort ? cardById(duel.annonce.carteId) : null;
  const sorcierArtId = etageHistoire
    ? 'ifrit-al-ahmar'
    : (
      deckAdverseAffiche.boxArt
      ?? deckAdverseAffiche.cardIds.find((id) => cardById(id)?.kind !== 'terrain')
      ?? 'djinn-du-souk'
    );
  const personnageSorcier = personnageEtage(histoireEtageId);
  const portraitSorcierAdverse = (personnageSorcier && portraitHistoire(personnageSorcier, import.meta.env.BASE_URL, cardArt))
    || cardArt(etageHistoire ? etageHistoire.avatar ?? 'ifrit-al-ahmar' : deckBoxArtUrl(deckAdverseAffiche));
  const cibleAnnoncee = carteAnnoncee?.kind === 'magie'
    ? describeAnnouncedMagicTarget(carteAnnoncee, duel.annonce.cibleId, duel, sorcierArtId, portraitSorcierAdverse)
    : carteAnnoncee?.kind === 'arme'
      ? (() => {
        // L'annonce d'une arme désigne son futur porteur, dans le camp du sorcier.
        const porteur = duel.sorcier.creatures.find((entite) => entite.id === duel.annonce.cibleId);
        return porteur ? { nom: porteur.name, illustrationId: porteur.carteId } : { nom: 'Une créature du sorcier' };
      })()
      : null;
  /* La lueur rouge de « visée » s'allume dès l'annonce : pendant la fenêtre de
     réponse, les créatures que la carte du sorcier désigne brillent déjà —
     c'est le moment décisif, celui où voir la cible dit s'il faut contrer.
     Les effets de zone allument toutes les créatures du camp frappé, l'arme
     son futur porteur, et l'identifiant réservé « sorcier » (l'adversaire du
     lanceur) votre propre plaque. Même langue que le bandeau d'annonce : ce
     que `cibleAnnoncee` nomme, la table le montre. */
  const idsVisesParAnnonce = new Set();
  let annonceViseVotrePlate = false;
  if (fenetreSort && carteAnnoncee) {
    const { cibleId, cibleAllieeId } = duel.annonce;
    const effetAnnonce = carteAnnoncee.effet ?? {};
    const arriveeAnnonce = carteAnnoncee.arrivee ?? {};
    // L'identifiant réservé « sorcier » désigne l'adversaire du lanceur : vous.
    // Même lecture que le bandeau (`describeAnnouncedMagicTarget`) — la plaque
    // s'allume et aucune créature ne s'allume avec elle. Une arrivée qui frappe
    // le sorcier adverse (l'Ifrit des ergs) ne porte aucun `cibleId` : le
    // moteur déduit la cible, l'annonce la montre quand même.
    annonceViseVotrePlate = cibleId === 'sorcier'
      || Boolean(carteAnnoncee.kind === 'magie'
        && (effetAnnonce.cible === 'sorcier'
          || (carteAnnoncee.cibles?.includes('sorcier') && !cibleId)))
      || Boolean(arriveeAnnonce.cible === 'sorcier' && (!cibleId || cibleId === 'sorcier'));
    if (!annonceViseVotrePlate && cibleId) idsVisesParAnnonce.add(cibleId);
    if (cibleAllieeId) idsVisesParAnnonce.add(cibleAllieeId);
    if (effetAnnonce.cible === 'toutes-creatures' || arriveeAnnonce.cible === 'toutes-creatures') {
      duel.joueur.creatures.forEach((entite) => idsVisesParAnnonce.add(entite.id));
    }
    if (carteAnnoncee.kind === 'magie' && effetAnnonce.type === 'buff') {
      duel.sorcier.creatures.forEach((entite) => idsVisesParAnnonce.add(entite.id));
    }
  }
  const reponseActive = Boolean((combatEntrant && duel.fenetreReponse && !vainqueur) || fenetreSort || fenetreFinTour);
  const reponseApresBlocage = Boolean(reponseActive && combatEntrant?.coteAttaquant === 'joueur');
  const defausseOuverte = Boolean(duel.defausseEnAttente?.cote === 'joueur' && duel.defausseEnAttente.restant > 0);
  const indicateurTour = vainqueur
    ? 'DUEL TERMINÉ'
    : choixManaEssaiOuvert
      ? 'CHOISISSEZ UN MANA'
    : defausseOuverte
      ? 'À VOUS · DÉFAUSSE'
    : fenetreSort
      ? apercuAnnonceOuvert ? 'SORT ANNONCÉ' : 'À VOUS · RÉPONSE'
    : finTourJoueur
      ? 'FIN DE TOUR'
    : fenetreFinTour
      ? 'FIN DE TOUR · RÉPONSE'
    : reponseActive
      ? reponseApresBlocage ? 'À VOUS · RÉPONSE' : 'À VOUS · DÉFENSE'
      : phase ? 'À VOUS · ATTAQUE' : monTour ? 'À VOTRE TOUR' : 'TOUR DU SORCIER';
  const classeIndicateurTour = vainqueur ? 'is-finished' : reponseActive ? 'is-response' : phase ? 'is-player is-attacking' : monTour ? 'is-player' : 'is-opponent';
  // La phase allumée dans le rail : l'écran du joueur (sélection d'attaquants,
  // blocage en cours) prime, sinon on lit la phase enregistrée par le moteur.
  const phaseDuelActive = vainqueur
    ? 'fin'
    : finTourJoueur || fenetreFinTour
      ? 'fin'
      : combatEntrant
        ? 'blocage'
        : phase
          ? 'attaque'
          : debutVisible
            ? 'debut'
            : duel.phase ?? 'principale';
  const prets = duel.joueur.creatures.filter((e) => rpgPeutAttaquer(e));
  const carteCiblee = cibleEnCours ? cardById(cibleEnCours) : null;
  const modeCible = (carteCiblee?.effet?.type === 'combat' && carteCiblee?.effet?.sourceCible === 'creature-amie')
    ? (cibleAllieeMagie ? 'ennemi' : 'allie')
    : targetMode(carteCiblee);
  const ciblesCoupRapideLegales = (attaquant, cote = 'joueur') => {
    const carte = cardById(attaquant?.carteId);
    if (!attaquant?.coupRapide) return [];
    const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
    return duel[adv].creatures.filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
  };
  // L'attaquant rapide invité à désigner sa proie : le premier de la sélection
  // qui a des cibles légales et rien de désigné. La frappe reste un CHOIX — on
  // peut confirmer sans rien désigner, l'attaquant part alors vers le sorcier —
  // l'invitation n'existe donc que pour allumer les proies possibles.
  const prochainCoupRapideSansCible = (ids, selections = ciblesAttaque) => ids.find((id) => {
    const attaquant = duel.joueur.creatures.find((entite) => entite.id === id);
    const ciblesLegales = ciblesCoupRapideLegales(attaquant, 'joueur');
    return ciblesLegales.length > 0 && !ciblesLegales.some((cible) => cible.id === selections?.[id]);
  }) ?? null;
  const cibleAttaqueEnCours = phase ? prochainCoupRapideSansCible(attaquants) : null;
  // Une seule phase d'attaque par tour : le moteur note le camp qui a déjà joué
  // la sienne (`duel.attaqueJouee`) et refuse la déclaration suivante. Une
  // attaque déjà déclarée, en attente de blocage, la consomme aussi.
  const attaqueJouee = duel.attaqueJouee === 'joueur' || combatEntrant?.coteAttaquant === 'joueur';
  const repartitionValide = !combatEntrant || combatEntrant.attaquants.every((id) => {
    const coteAttaquant = combatEntrant.coteAttaquant === 'joueur' ? 'joueur' : 'sorcier';
    const attaquant = duel[coteAttaquant].creatures.find((entite) => entite.id === id);
    const idsBloqueurs = combatEntrant.blocages[id] ?? [];
    if (!attaquant || idsBloqueurs.length <= 1) return true;
    const somme = Object.values(combatEntrant.repartitions[id] ?? {})
      .reduce((total, amount) => total + Number(amount || 0), 0);
    return somme === attaquant.atk;
  });




  const programmerNettoyageVisuel = (callback, duree) => {
    const timer = window.setTimeout(() => {
      animationsVisuellesTimersRef.current = animationsVisuellesTimersRef.current.filter((id) => id !== timer);
      callback();
    }, duree);
    animationsVisuellesTimersRef.current.push(timer);
  };

  const animerEntites = (ids, type, duree = 720, statsUpIds = []) => {
    const entites = [...new Set((ids ?? []).filter(Boolean))];
    if (!entites.length) return;
    const statsAugmentees = new Set(statsUpIds);
    const token = ++sequenceAnimationRef.current;
    setAnimationsEntites((current) => ({
      ...current,
      ...Object.fromEntries(entites.map((id) => [id, { type, token, statsUp: statsAugmentees.has(id) }])),
    }));
    programmerNettoyageVisuel(() => {
      setAnimationsEntites((current) => {
        const next = { ...current };
        entites.forEach((id) => { if (next[id]?.token === token) delete next[id]; });
        return next;
      });
    }, duree);
  };

  const demarrerVolCarte = (carte, handIndex, resoudreAction) => {
    if (!carte || !resoudreAction) return;
    const origine = carteOrigineVolRef.current;
    const source = [...(tableRef.current?.querySelectorAll('.rpg-hand__card') ?? [])]
      .find((element) => element.dataset.cardId === carte.id);
    const index = origine?.carteId === carte.id
      ? origine.handIndex
      : Number.isInteger(handIndex) ? handIndex : Number(source?.dataset.handIndex);
    carteOrigineVolRef.current = null;
    if (!Number.isInteger(index) || index < 0 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      resoudreAction();
      return;
    }

    if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
    if (timerImpactRef.current) window.clearTimeout(timerImpactRef.current);
    timerImpactRef.current = null;
    setImpactEcran(null);
    const token = ++sequenceVolRef.current;
    actionVolRef.current = { token, resoudre: resoudreAction };
    jouerSfx('whoosh');
    setCarteEnVol({ token, carteId: carte.id, kind: carte.kind === 'terrain' ? 'terrain' : 'creature', handIndex: index, phase: 'pending' });
    const timer = window.setTimeout(() => {
      if (timerVolRef.current !== timer) return;
      timerVolRef.current = null;
      const action = actionVolRef.current;
      actionVolRef.current = null;
      setCarteEnVol((current) => current?.token === token ? null : current);
      if (action?.token === token) action.resoudre();
    }, 720);
    timerVolRef.current = timer;
  };

  const declencherImpactEcran = (mode) => {
    if (timerImpactRef.current) window.clearTimeout(timerImpactRef.current);
    const token = ++sequenceImpactRef.current;
    setImpactEcran({ mode, variante: token % 2 ? 'a' : 'b', token });
    const timer = window.setTimeout(() => {
      if (timerImpactRef.current !== timer) return;
      timerImpactRef.current = null;
      setImpactEcran((current) => current?.token === token ? null : current);
    }, 900);
    timerImpactRef.current = timer;
  };

  // Une blessure qui entame le bouclier reste un coup reçu, même si les PV
  // sont entièrement protégés. Ce relevé couvre les dégâts directs des sorts
  // et des capacités d’arrivée des créatures adverses.
  const prendreInstantaneDegatsJoueur = () => ({
    pv: duel.joueur.pv,
    bouclier: duel.joueur.bouclier ?? 0,
  });
  const joueurToucheDepuis = (instantane) => (
    duel.joueur.pv < instantane.pv
    || (duel.joueur.bouclier ?? 0) < instantane.bouclier
  );
  // Le tour qui s'ouvre peut porter un écho différé (Nuage de cendres) : les
  // blessures et les morts qu'il cause s'animent comme les autres, au lieu de
  // se contenter d'un chiffre qui change sur la carte.
  const terminerTourEtDetecterDegatsJoueur = () => {
    const instantane = prendreInstantaneDegatsJoueur();
    const champAvantFinDeTour = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    rpgFinDeTour(duel);
    // Début de tour : le rail allume la phase le temps de la pioche.
    setDebutVisible(true);
    later(() => setDebutVisible(false), 800);
    animerModificationsChamp(champAvantFinDeTour, [], debutJournalDestructions);
    return joueurToucheDepuis(instantane);
  };

  const prendreInstantaneChamp = () => {
    const table = tableRef.current;
    const tableRect = table?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const elements = new Map([...(table?.querySelectorAll('[data-entity-id], [data-terrain-id]') ?? [])]
      .map((element) => [element.dataset.entityId ?? element.dataset.terrainId, element]));
    const cartesEnJeu = [
      ...duel.joueur.creatures.map((entite) => ({ ...entite, isTerrain: false })),
      ...duel.sorcier.creatures.map((entite) => ({ ...entite, isTerrain: false })),
      ...duel.joueur.terrains.map((terrain) => ({
        ...terrain,
        name: cardById(terrain.carteId)?.name ?? terrain.carteId,
        isTerrain: true,
      })),
      ...duel.sorcier.terrains.map((terrain) => ({
        ...terrain,
        name: cardById(terrain.carteId)?.name ?? terrain.carteId,
        isTerrain: true,
      })),
    ];
    return cartesEnJeu.map((entite) => {
      // Pile d'homonymes repliée : l'exemplaire masqué n'a pas d'élément, il
      // emprunte la place de sa pile visible pour que l'effet de destruction
      // parte du bon endroit au lieu du coin de la table.
      const element = elements.get(entite.id)
        ?? table?.querySelector(`.card-row [data-card-id="${entite.carteId}"], .rpg-terrains [data-card-id="${entite.carteId}"]`);
      const rect = element?.getBoundingClientRect() ?? { left: tableRect.left, top: tableRect.top, width: 0, height: 0 };
      const width = element?.offsetWidth || rect.width || 120;
      const height = element?.offsetHeight || rect.height || 150;
      const matrix = element ? window.getComputedStyle?.(element)?.transform ?? 'none' : 'none';
      const values = matrix.startsWith('matrix(')
        ? matrix.slice(7, -1).split(',').map((value) => Number.parseFloat(value.trim()))
        : matrix.startsWith('matrix3d(')
          ? matrix.slice(9, -1).split(',').map((value) => Number.parseFloat(value.trim()))
          : [];
      const angle = values?.length >= 2 ? Math.atan2(values[1], values[0]) : 0;
      const centerX = rect.left + rect.width / 2 - tableRect.left;
      const centerY = rect.top + rect.height / 2 - tableRect.top;
      return {
        entityId: entite.id,
        cardId: entite.carteId,
        name: entite.name,
        isTerrain: entite.isTerrain,
        atk: entite.atk,
        def: entite.def,
        pv: entite.pv,
        bouclier: entite.bouclier ?? 0,
        left: centerX - width / 2,
        top: centerY - height / 2,
        width,
        height,
        angle,
      };
    });
  };

  const animerModificationsChamp = (avant, attaquantsIds = [], debutJournalDestructions = null, entitesRenvoyees = []) => {
    if (!avant?.length) return;
    const vivants = new Map([
      ...duel.joueur.creatures,
      ...duel.sorcier.creatures,
      ...duel.joueur.terrains,
      ...duel.sorcier.terrains,
    ].map((entite) => [entite.id, entite]));
    const renvoyees = new Set(entitesRenvoyees.filter(Boolean));
    const cartesDisparues = avant.filter((entite) => !vivants.has(entite.entityId)
      && !renvoyees.has(entite.entityId));
    const mouvementReduit = animationsReduites();
    const disparues = mouvementReduit ? [] : cartesDisparues;
    const evenementsDestruction = Number.isInteger(debutJournalDestructions)
      ? rpgDestructionsDepuis(duel, debutJournalDestructions)
      : [];
    const idsDetruits = new Set(evenementsDestruction.map((evenement) => evenement.entityId));
    const entitesBrulees = new Set(evenementsDestruction
      .filter((evenement) => evenement.sourceElements.includes('braise'))
      .map((evenement) => evenement.entityId));
    // Une créature Braise garde son bruit de capacité de destruction quand
    // elle est tuée par une autre couleur : l'effet vient bien de sa capacité.
    for (const entite of cartesDisparues) {
      if (idsDetruits.has(entite.entityId)
        && rpgFireSoundFor(cardById(entite.cardId), 'destruction')) {
        entitesBrulees.add(entite.entityId);
      }
    }
    // Les animations réduites ne coupent pas les bruitages élémentaires.
    if (mouvementReduit && entitesBrulees.size) jouerSfx('flame_gust');
    if (disparues.length) {
      const token = ++sequenceAnimationRef.current;
      const duree = disparues.some((entite) => entitesBrulees.has(entite.entityId)) ? 1050 : 760;
      const effets = disparues.map((entite) => ({
        ...entite,
        token,
        effectId: `${token}-${entite.entityId}`,
        bruleeParBraise: entitesBrulees.has(entite.entityId),
        // Date de péremption : l'image d'une carte détruite n'est qu'un adieu.
        // Trois voies la retirent (fin d'animation, minuterie, ménage), la
        // dernière servant de filet si l'onglet dort pendant l'animation.
        expireA: Date.now() + duree + 400,
      }));
      setCartesEnDestruction((current) => [...nettoyerFantomes(current), ...effets]);
      programmerNettoyageVisuel(() => {
        const ids = new Set(effets.map((effect) => effect.effectId));
        setCartesEnDestruction((current) => current.filter((effect) => !ids.has(effect.effectId)));
      }, duree);
    }

    const attaquants = new Set(attaquantsIds);
    const attaquesVivantes = attaquantsIds.filter((id) => vivants.has(id));
    const touches = [];
    const renforcees = [];
    const statsAugmentees = [];
    avant.forEach((entite) => {
      const apres = vivants.get(entite.entityId);
      if (!apres || entite.isTerrain) return;
      if (apres.pv < entite.pv || (apres.bouclier ?? 0) < entite.bouclier || apres.def < entite.def) {
        if (!attaquants.has(entite.entityId)) touches.push(entite.entityId);
      } else if (apres.pv > entite.pv || (apres.bouclier ?? 0) > entite.bouclier || apres.atk > entite.atk || apres.def > entite.def) {
        renforcees.push(entite.entityId);
        if (apres.atk > entite.atk || apres.def > entite.def) statsAugmentees.push(entite.entityId);
      }
    });
    animerEntites(attaquesVivantes, 'attack', 650);
    animerEntites(touches, 'hit', 620);
    animerEntites(renforcees, 'glow', 1100, statsAugmentees);
  };

  const conserverAnnulation = (etatAvantAction) => {
    annulationRef.current = etatAvantAction;
    setAnnulationDisponible(true);
  };

  const invaliderAnnulation = () => {
    annulationRef.current = null;
    setAnnulationDisponible(false);
  };

  const annulerDerniereAction = () => {
    if (!annulationDisponible || !annulationRef.current || !monTour || phase || cibleEnCours || combatEntrant) { jouerSfx('erreur'); return; }
    jouerSfx('annuler');
    duelRef.current = JSON.parse(annulationRef.current);
    invaliderAnnulation();
    if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
    timerVolRef.current = null;
    setCarteEnVol(null);
    carteOrigineVolRef.current = null;
    actionVolRef.current = null;
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleEnCours(null);
    setConfirmationSort(null);
    setApercuSurvol(null);
    force();
  };

  const peutJouerCarte = (carte) => {
    if (!carte || !duel.joueur.main.includes(carte.id)) return false;
    // Le mulligan d'abord : tant que la main de départ n'est pas validée, rien
    // ne quitte la main — ni clic, ni glisser, ni sort en réponse.
    if (mulliganOuvert) return false;
    if (choixManaEssaiOuvert) return false;
    if (defausseOuverte) return false;
    // Un contre sans annonce à contrer n'est pas jouable : l'allumer enfermait
    // le joueur dans une confirmation qui ne menait à rien.
    if (!rpgContreJouable(duel, 'joueur', carte)) return false;
    if (reponseApresBlocage && !carte.instant) return false;
    if (carte.kind === 'terrain') return monTour && !reponseApresBlocage && !duel.joueur.terrainPose;
    // Une arme sans créature alliée à équiper reste éteinte dans la main —
    // sauf arme vivante (la Lame des ergs), qui fait naître son porteur.
    if (carte.kind === 'arme' && !duel.joueur.creatures.length && !carte.armeVivante) return false;
    return (reponseApresBlocage ? carte.instant : monTour || (reponseActive && carte.instant))
      && rpgPeutPayer(duel.joueur, carte);
  };
  const aReponseJouableEnMain = Boolean(apercuAnnonceOuvert && duel.joueur.main.some((carteId) => {
    const carte = cardById(carteId);
    return Boolean(carte?.instant && peutJouerCarte(carte));
  }));

  const commencerGlisserCarte = (event, carte) => {
    if (!peutJouerCarte(carte)) {
      event.preventDefault();
      return;
    }
    masquerApercuSurvol();
    carteGlisseeRef.current = carte.id;
    carteOrigineVolRef.current = {
      carteId: carte.id,
      handIndex: Number(event.currentTarget.dataset.handIndex),
    };
    clicApresGlisserRef.current = true;
    event.dataTransfer?.setData('text/plain', carte.id);
    event.dataTransfer?.setData('application/x-bab-el-card', carte.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    setCarteGlissee(carte.id);
  };

  const terminerGlisserCarte = () => {
    const carteId = carteGlisseeRef.current;
    carteGlisseeRef.current = null;
    if (carteOrigineVolRef.current?.carteId === carteId) carteOrigineVolRef.current = null;
    setCarteGlissee(null);
    setSurZoneDepot(false);
    window.setTimeout(() => { clicApresGlisserRef.current = false; }, 300);
  };

  const survolerTablePourDepot = (event) => {
    if (!carteGlisseeRef.current) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setSurZoneDepot(true);
  };

  const quitterZoneDepot = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setSurZoneDepot(false);
  };

  const poserTerrain = (carteId) => {
    if (!monTour || reponseApresBlocage || mulliganOuvert) { jouerSfx('erreur'); return; }
    const etatAvantAction = JSON.stringify(duel);
    const res = rpgPoserTerrain(duel, 'joueur', carteId);
    if (res.ok) {
      conserverAnnulation(etatAvantAction);
      jouerSfx('card_place');
      avancerTutoriel('terrain', 'mana');
    } else { jouerSfx('erreur'); }
    force();
    // Le Souk est prévenu **après** le rendu du plateau : `noterEvenementDuel`
    // met à jour la bourse, qui vit dans la même page — un état de bourse mis à
    // jour avant `force()` fait passer le rendu du champ en tâche de fond, et la
    // table montre encore l'ancien état juste après le geste (vu par
    // `check:rpg-preview` : `rpgJouerCreature` rendait `ok: true` et la créature
    // n'apparaissait qu'à la macrotâche suivante).
    if (res.ok) {
      noterEvenementDuel({ type: 'terrain-pose', cardId: carteId });
      noterEvenementDuel({ type: 'carte-jouee', cardId: carteId });
    }
  };

  const engager = (terrainId, couleurChoisie = null) => {
    if ((!monTour && !reponseActive) || mulliganOuvert) { jouerSfx('erreur'); return; }
    const etatAvantAction = monTour ? JSON.stringify(duel) : null;
    const res = rpgEngagerTerrain(duel, 'joueur', terrainId, couleurChoisie);
    if (res.ok) {
      if (etatAvantAction) conserverAnnulation(etatAvantAction);
      jouerSfx('terrain_tap');
      avancerTutoriel('mana', 'creature');
    } else { jouerSfx('erreur'); }
    force();
  };

  const demanderCouleurMana = (event, terrain) => {
    const couleurs = terrainManaColors(terrain.carteId);
    if (!couleurs.length) return;
    if (couleurs.length === 1) {
      engager(terrain.id, couleurs[0]);
      return;
    }
    const tableRect = tableRef.current?.getBoundingClientRect();
    const terrainRect = event.currentTarget.getBoundingClientRect();
    if (!tableRect) return;
    const left = Math.min(tableRect.width - 128, Math.max(128, terrainRect.left + terrainRect.width / 2 - tableRect.left));
    const top = Math.min(tableRect.height - 84, Math.max(82, terrainRect.top - tableRect.top - 72));
    setTerrainManaChoix({ terrainId: terrain.id, nom: cardById(terrain.carteId)?.name ?? 'Terrain', couleurs, left, top });
  };

  const decrireCibleMagie = (carte, cibleId, cibleAllieeId = null) => {
    // Le Défi du Jarl : les deux champions du duel.
    if (carte?.effet?.type === 'combat' && carte.effet?.sourceCible === 'creature-amie') {
      const champion = duel.joueur.creatures.find((entite) => entite.id === cibleAllieeId);
      const adverse = duel.sorcier.creatures.find((entite) => entite.id === cibleId);
      return {
        nom: `${champion?.name ?? 'Votre champion'} se bat avec ${adverse?.name ?? 'la créature adverse'}`,
        illustrationId: champion?.carteId,
        targetPlate: 'sorcier',
        targetIds: [cibleAllieeId, cibleId].filter(Boolean),
      };
    }
    if (cibleId === 'sorcier' || carte.effet?.cible === 'sorcier') {
      return { nom: nomSorcierAdverse, illustrationUrl: portraitSorcierAdverse, targetPlate: 'sorcier', targetIds: [] };
    }
    const entiteEnnemie = duel.sorcier.creatures.find((entite) => entite.id === cibleId);
    if (entiteEnnemie) {
      return { nom: entiteEnnemie.name, illustrationId: entiteEnnemie.carteId, targetPlate: 'sorcier', targetIds: [entiteEnnemie.id] };
    }
    const entiteAlliee = duel.joueur.creatures.find((entite) => entite.id === cibleId);
    if (entiteAlliee) {
      return { nom: entiteAlliee.name, illustrationId: entiteAlliee.carteId, targetPlate: null, targetIds: [entiteAlliee.id] };
    }
    if (carte.effet?.cible === 'toutes-creatures') {
      return {
        nom: 'Toutes les créatures adverses',
        targetPlate: 'sorcier',
        targetIds: duel.sorcier.creatures.map((entite) => entite.id),
      };
    }
    if (carte.effet?.type === 'buff') {
      return {
        nom: 'Toutes vos créatures',
        targetIds: duel.joueur.creatures.map((entite) => entite.id),
      };
    }
    if (carte.cibles?.includes('soi') || ['soin', 'pioche'].includes(carte.effet?.type)) {
      return { nom: 'Vous', illustrationId: 'salem', targetPlate: 'joueur', targetIds: [] };
    }
    if (carte.effet?.cible === 'creature-amie') return { nom: 'Une créature alliée', targetIds: [] };
    if (carte.effet?.cible === 'creature') return { nom: 'Une créature adverse', targetIds: [] };
    return { nom: 'Le champ de bataille', targetIds: [] };
  };

  // `contre` : la carte est un contresort (joué par le joueur ou par le sorcier)
  // qui défait la carte visée — le bandeau le dit au lieu de « Magie jouée ».
  const annoncerMagie = (carte, cible, { contre = false, sonForce = null } = {}) => {
    if (contre) {
      jouerSfx('card_countered');
    } else {
      const son = sonForce
        ?? rpgWaterSoundFor(carte, 'spell')
        ?? rpgFireSoundFor(carte, 'spell')
        ?? (carte?.effet?.type === 'soin' ? 'soin_long'
          : carte?.effet?.type === 'bouclier' ? 'bouclier' : 'magie');
      jouerSfx(son);
    }
    if (timerSortRef.current) window.clearTimeout(timerSortRef.current);
    if (timerApercuMagieRef.current) window.clearTimeout(timerApercuMagieRef.current);
    setSortJoue({ carteId: carte.id, cible, contre });
    setApercuMagie(carte.id);
    timerApercuMagieRef.current = window.setTimeout(() => {
      timerApercuMagieRef.current = null;
      setApercuMagie(null);
    }, 1800);
    timerSortRef.current = window.setTimeout(() => {
      timerSortRef.current = null;
      setSortJoue(null);
    }, 3600);
  };

  // Le sorcier contre une carte du joueur : sa carte de contre s'affiche,
  // ciblant la carte défaite. Sans ce bandeau, la carte du joueur disparaissait
  // sans qu'on sache qui l'avait arrêtée ni avec quoi.
  const annoncerContreSorcier = (res) => {
    const contre = cardById(res.carteContre);
    if (!contre) return;
    const contree = cardById(res.carteContree);
    annoncerMagie(contre, {
      nom: contree?.name ?? 'Votre carte',
      illustrationId: contree?.id,
      targetPlate: null,
      targetIds: [],
    }, { contre: true });
  };

  const lancerMagie = (carteId, cibleId = null, cibleAllieeId = null) => {
    const carte = cardById(carteId);
    const cibleEffective = cibleId ?? rpgCibleAuto(duel, 'joueur', carte);
    const cibleDecrite = decrireCibleMagie(carte, cibleEffective, cibleAllieeId ?? cibleAllieeMagie);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    setCibleAllieeMagie(null);
    const res = rpgLancerMagie(duel, 'joueur', carteId, cibleEffective, cibleAllieeId ?? null);
    // Le sort a-t-il été lancé ? Le Souk n'est prévenu qu'après `force()`.
    let lancee = false;
    if (res.ok && res.contre && res.parIA) {
      // Le sorcier contre la carte du joueur : elle est défaussée, le tour du joueur continue.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      invaliderAnnulation();
      annoncerContreSorcier(res);
      setCibleEnCours(null);
      force();
      return;
    }
    if (res.ok && res.contre) {
      // Le contre a défait l'annonce du sorcier : il reprend son tour, carte suivante.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      invaliderAnnulation();
      annoncerMagie(carte, cibleDecrite, { contre: true });
      setCibleEnCours(null);
      force();
      later(annoncerSuivantSorcier, 900);
      return;
    }
    if (res.ok) {
      jouerSfx('card_place');
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions,
        [res.renvoiEntityId]);
      invaliderAnnulation();
      annoncerMagie(carte, cibleDecrite, {
        sonForce: res.renvoiMain ? 'creature_return' : null,
      });
      setCibleEnCours(null);
      lancee = true;
      if (reponseActive && combatEntrant?.coteAttaquant === 'joueur') {
        const attaquantsVivants = combatEntrant.attaquants
          .filter((id) => duel.joueur.creatures.some((entite) => entite.id === id));
        if (!attaquantsVivants.length) {
          rpgFermerFenetreReponse(duel);
          setCombatEntrant(null);
        } else {
          const attaquantsVivantsSet = new Set(attaquantsVivants);
          const bloqueursVivants = new Set(duel.sorcier.creatures
            .filter((entite) => !entite.attaquee)
            .map((entite) => entite.id));
          const blocages = Object.fromEntries(attaquantsVivants.map((id) => [
            id,
            (combatEntrant.blocages[id] ?? []).filter((bloqueurId) => bloqueursVivants.has(bloqueurId)),
          ]));
          const attaquantsBloques = combatEntrant.attaquantsBloques
            ?? combatEntrant.attaquants.filter((id) => combatEntrant.blocages[id]?.length);
          setCombatEntrant((courant) => courant && ({
            ...courant,
            attaquants: attaquantsVivants,
            blocages,
            attaquantsBloques: attaquantsBloques.filter((id) => attaquantsVivantsSet.has(id)),
            repartitions: recalculerRepartitions(attaquantsVivants, blocages),
          }));
        }
      } else if (reponseActive && combatEntrant) {
        const vainqueurApresSort = rpgVainqueur(duel);
        if (vainqueurApresSort) {
          rpgFermerFenetreReponse(duel);
          setCombatEntrant(null);
        } else {
          const attaquantsVivants = combatEntrant.attaquants
            .filter((id) => duel.sorcier.creatures.some((entite) => entite.id === id));
          if (!attaquantsVivants.length) {
            rpgFermerFenetreReponse(duel);
            setCombatEntrant(null);
            apresCombatSorcier();
          } else {
            const vivants = new Set(attaquantsVivants);
            setCombatEntrant((courant) => courant && ({
              ...courant,
              attaquants: attaquantsVivants,
              blocages: Object.fromEntries(Object.entries(courant.blocages).filter(([id]) => vivants.has(id))),
              repartitions: Object.fromEntries(Object.entries(courant.repartitions).filter(([id]) => vivants.has(id))),
            }));
          }
        }
      }
    }
    force();
    // Le Souk est prévenu **après** le rendu du plateau : `noterEvenementDuel`
    // met à jour la bourse, qui vit dans la même page — un état de bourse mis à
    // jour avant `force()` fait passer le rendu du champ en tâche de fond, et la
    // table montre encore l'ancien état juste après le geste (vu par
    // `check:rpg-preview` : `rpgJouerCreature` rendait `ok: true` et la créature
    // n'apparaissait qu'à la macrotâche suivante).
    if (lancee) {
      noterEvenementDuel({ type: 'magie-lancee', cardId: carteId });
      noterEvenementDuel({ type: 'carte-jouee', cardId: carteId });
    }
  };

  /**
   * La pose d'une créature ou d'un héros, une fois la carte arrivée au bout de
   * son vol.
   *
   * **L'arrivée qui désigne sa cible se choisit sur la table** : la créature
   * entre en jeu ici (`cibleDifferee`), et la désignation ne s'ouvre
   * qu'ensuite — le moteur retient ce qu'il reste à désigner
   * (`duel.arriveeEnAttente`), la page allume les cibles légales, et le clic
   * referme l'attente (`resoudreCible`). Une arrivée qui ne désigne rien —
   * pioche, jetons, dégâts de zone — se résout avec la pose, comme avant.
   */
  const finaliserPoseCreature = (carteId) => {
    const carte = cardById(carteId);
    carteCibleeHandIndexRef.current = null;
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgJouerCreature(duel, 'joueur', carteId, null, { cibleDifferee: true });
    if (res.ok && res.contre && res.parIA) {
      // Le sorcier contre la créature : elle n'entre pas en jeu.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      annoncerContreSorcier(res);
    } else if (res.ok) {
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      jouerSfx('card_place');
      const sonEffetBraise = rpgFireSoundFor(carte, 'arrival');
      if (sonEffetBraise) jouerSfx(sonEffetBraise);
      avancerTutoriel('creature', 'invocation');
      // La créature attend sa victime : la table s'allume, la main est close.
      if (res.arriveeEnAttente) setCibleEnCours(carteId);
    }
    force();
    // Le Souk est prévenu **après** le rendu du plateau : `noterEvenementDuel`
    // met à jour la bourse, qui vit dans la même page — un état de bourse mis à
    // jour avant `force()` fait passer le rendu du champ en tâche de fond, et la
    // table montre encore l'ancien état juste après le geste (vu par
    // `check:rpg-preview` : `rpgJouerCreature` rendait `ok: true` et la créature
    // n'apparaissait qu'à la macrotâche suivante).
    if (res.ok && !(res.contre && res.parIA)) {
      noterEvenementDuel({ type: 'creature-invoquee', cardId: carteId });
      noterEvenementDuel({ type: 'carte-jouee', cardId: carteId });
    }
  };

  const equiperArme = (carteId, cibleId) => {
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgJouerArme(duel, 'joueur', carteId, cibleId);
    if (res.ok && res.contre && res.parIA) {
      // Le sorcier contre l'arme : elle part au cimetière sans être portée.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      invaliderAnnulation();
      annoncerContreSorcier(res);
    } else if (res.ok) {
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      jouerSfx('card_place');
    } else {
      jouerSfx('erreur');
    }
    force();
    // Le Souk est prévenu **après** le rendu du plateau : `noterEvenementDuel`
    // met à jour la bourse, qui vit dans la même page — un état de bourse mis à
    // jour avant `force()` fait passer le rendu du champ en tâche de fond, et la
    // table montre encore l'ancien état juste après le geste (vu par
    // `check:rpg-preview` : `rpgJouerCreature` rendait `ok: true` et la créature
    // n'apparaissait qu'à la macrotâche suivante).
    if (res.ok && !(res.contre && res.parIA)) {
      noterEvenementDuel({ type: 'arme-jouee', cardId: carteId });
      noterEvenementDuel({ type: 'carte-jouee', cardId: carteId });
    }
  };

  /** Capacité activée d'une arme portée (le Bâton des citernes, et les trois
   *  modes de la Jitte d’Amayas payés en compteurs de sable) : même patron que
   *  les autres actions payées — instantané d'annulation pris avant, animation
   *  du champ après. Un mode qui désigne une proie (le Trait de sable) ne se
   *  résout pas tout de suite : il attend le clic sur la créature adverse. */
  const activerArmePorteur = (entite, mode = null) => {
    if (!monTour || phase || combatEntrant || cibleEnCours || mulliganOuvert) { jouerSfx('erreur'); return; }
    if (mode?.effet?.type === 'degats') {
      if (!duel.sorcier.creatures.some((cible) => !rpgEstProtegee(cible, cardColors(armeById(entite.arme.carteId))))) {
        jouerSfx('erreur');
        force();
        return;
      }
      // Déjà en désignation sur la même arme ? Le second clic annule.
      if (cibleArmeEnCours?.entiteId === entite.id && cibleArmeEnCours?.mode === mode.id) {
        setCibleArmeEnCours(null);
        jouerSfx('annuler');
        force();
        return;
      }
      setCibleArmeEnCours({ entiteId: entite.id, mode: mode.id });
      jouerSfx('select');
      force();
      return;
    }
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgActiverArme(duel, 'joueur', entite.id, { mode: mode?.id ?? null });
    if (res.ok) {
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      jouerSfx('apparition');
    } else {
      jouerSfx('erreur');
    }
    force();
  };

  /** La proie d'un mode d'arme est désignée : le Trait de sable tombe. */
  const resoudreActivationArme = (entite) => {
    const { entiteId, mode } = cibleArmeEnCours ?? {};
    setCibleArmeEnCours(null);
    const porteur = duel.joueur.creatures.find((candidate) => candidate.id === entiteId);
    if (!porteur) { jouerSfx('erreur'); force(); return; }
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgActiverArme(duel, 'joueur', porteur.id, { mode, cibleId: entite.id });
    if (res.ok) {
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      jouerSfx('player_attack_hit');
    } else {
      jouerSfx('erreur');
    }
    force();
  };

  const poserCarte = (carteId) => {
    const carte = cardById(carteId);
    const peutRepondre = reponseActive && carte.instant;
    if (reponseApresBlocage && !carte.instant) return;
    if (!monTour && !peutRepondre) return;
    if (carte.kind === 'arme') {
      // On désigne la créature alliée qui portera l'arme. Une arme vivante
      // n'a besoin de personne : jouée la table vide, elle crée son porteur
      // et s'y attache.
      if (!duel.joueur.creatures.length) {
        if (!carte.armeVivante) { jouerSfx('erreur'); force(); return; }
        equiperArme(carteId, null);
        return;
      }
      setCibleEnCours(carteId);
      force();
      return;
    }
    if (carte.kind === 'magie') {
      const cible = targetMode(carte);
      if (cible) {
        setCibleAllieeMagie(null);
        const duelDejarl = carte.effet?.type === 'combat' && carte.effet?.sourceCible === 'creature-amie';
        const aUneCible = cible === 'ennemi'
          ? duel.sorcier.creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte))) || carte.cibles?.includes('sorcier')
          : duel.joueur.creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte)))
            // Le Défi du Jarl exige les deux champions : sans adversaire en
            // face, le duel ne commence même pas.
            && (!duelDejarl || duel.sorcier.creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte))));
        if (aUneCible) setCibleEnCours(carteId);
        force();
        return;
      }
      lancerMagie(carteId);
      return;
    }
    // Une créature : elle se **pose d'abord**, son arrivée ciblée se désigne
    // ensuite sur la table (voir `finaliserPoseCreature`). Le vol, lui, a déjà
    // eu lieu : `jouerCarteDepuisMain` ne rappelle `poserCarte` qu'une fois la
    // carte arrivée au bout de son animation — on n'en relance donc pas une
    // seconde, la pose se termine ici.
    if (!monTour) return;
    finaliserPoseCreature(carteId);
  };

  const jouerCarteDepuisMain = (carteId, handIndex = null) => {
    const carte = cardById(carteId);
    if (carteEnVol) return;
    if (!carte || !duel.joueur.main.includes(carteId)) return;
    if (!peutJouerCarte(carte)) {
      jouerSfx('erreur');
      force();
      return;
    }
    if (carte.kind !== 'terrain') { unlockSfx(); }
    const index = Number.isInteger(handIndex) && duel.joueur.main[handIndex] === carteId
      ? handIndex : duel.joueur.main.indexOf(carteId);
    if (carte.kind === 'terrain') {
      demarrerVolCarte(carte, index, () => poserTerrain(carteId));
    } else if (carte.kind === 'magie') {
      poserCarte(carteId);
    } else if (carte.kind === 'arme') {
      carteCibleeHandIndexRef.current = index;
      poserCarte(carteId);
    } else {
      demarrerVolCarte(carte, index, () => poserCarte(carteId));
    }
  };

  const deposerCarteSurTable = (event) => {
    event.preventDefault();
    if (carteEnVol) return;
    const carteId = event.dataTransfer?.getData('text/plain')
      || event.dataTransfer?.getData('application/x-bab-el-card')
      || carteGlisseeRef.current;
    const handIndex = carteOrigineVolRef.current?.carteId === carteId
      ? carteOrigineVolRef.current.handIndex : null;
    carteGlisseeRef.current = null;
    carteOrigineVolRef.current = null;
    setCarteGlissee(null);
    setSurZoneDepot(false);
    if (!carteId) return;
    jouerCarteDepuisMain(carteId, handIndex);
  };

  const cliquerCarteMain = (carteId, handIndex) => {
    if (clicApresGlisserRef.current) {
      clicApresGlisserRef.current = false;
      return;
    }
    masquerApercuSurvol();
    unlockSfx();
    const carte = cardById(carteId);
    if (!carte) return;
    if (carteEnVol || cibleEnCours || cibleAttaqueEnCours) return;
    if (defausseOuverte) {
      const res = rpgDefausserCarte(duel, 'joueur', Number.isInteger(handIndex) ? handIndex : carteId);
      jouerSfx(res.ok ? 'annuler' : 'erreur');
      force();
      return;
    }
    if (carte.kind === 'magie' && peutJouerCarte(carte)) {
      setConfirmationSort({ carteId, handIndex });
      return;
    }
    jouerCarteDepuisMain(carteId, handIndex);
  };

  const confirmerSort = () => {
    const confirmation = confirmationSort;
    setConfirmationSort(null);
    if (!confirmation) return;
    jouerCarteDepuisMain(confirmation.carteId, confirmation.handIndex);
  };

  const resoudreCible = (entite, cote) => {
    if (!cibleEnCours) return false;
    if (modeCible === 'allie' && cote !== 'joueur') {
      jouerSfx('erreur');
      force();
      return true;
    }
    if (modeCible === 'ennemi' && cote !== 'ennemi') {
      jouerSfx('erreur');
      force();
      return true;
    }
    const carteSource = cardById(cibleEnCours);
    if (rpgEstProtegee(entite, cardColors(carteSource))) {
      jouerSfx('erreur');
      force();
      return true;
    }
    // L'arrivée ciblée d'une créature **déjà posée** : la table vient de
    // désigner sa victime, on referme l'attente ouverte à la pose — la carte
    // n'est plus en main, il n'y a donc pas de vol à relancer.
    if (arriveeCiblePortee(carteSource) && duel.arriveeEnAttente?.carteId === cibleEnCours) {
      const champAvantAction = prendreInstantaneChamp();
      const debutJournalDestructions = rpgNombreDestructions(duel);
      const res = rpgResoudreArriveeCiblee(duel, 'joueur', entite.id);
      if (!res.ok) {
        jouerSfx('erreur');
        force();
        return true;
      }
      setCibleEnCours(null);
      jouerSfx('select');
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      force();
      return true;
    }
    if (carteSource?.kind === 'arme') {
      const carteId = cibleEnCours;
      carteCibleeHandIndexRef.current = null;
      setCibleEnCours(null);
      equiperArme(carteId, entite.id);
      return true;
    }
    // Le Défi du Jarl : deux désignations — votre champion, puis la créature
    // adverse qui devra lui tenir tête.
    if (carteSource?.effet?.type === 'combat' && carteSource?.effet?.sourceCible === 'creature-amie') {
      if (cote === 'joueur') {
        setCibleAllieeMagie(entite.id);
        jouerSfx('select');
        force();
        return true;
      }
      const carteId = cibleEnCours;
      const championId = cibleAllieeMagie;
      setCibleEnCours(null);
      setCibleAllieeMagie(null);
      lancerMagie(carteId, entite.id, championId);
      return true;
    }
    lancerMagie(cibleEnCours, entite.id);
    return true;
  };

  // Capacité activée (la foudre du Père des corbeaux) : on désigne la
  // créature porteuse, puis la proie — alliée ou adverse (« au choix »).
  const activerCapacite = (entite) => {
    if (!monTour || phase || cibleEnCours || cibleAttaqueEnCours || combatEntrant || reponseActive) {
      jouerSfx('erreur');
      force();
      return;
    }
    if (activationEnCours === entite.id) {
      setActivationEnCours(null);
      jouerSfx('annuler');
      force();
      return;
    }
    if (!rpgPeutActiverCapacite(duel, 'joueur', entite.id)) {
      jouerSfx('erreur');
      force();
      return;
    }
    setActivationEnCours(entite.id);
    jouerSfx('select');
    force();
  };

  const resoudreActivation = (entite) => {
    const sourceId = activationEnCours;
    setActivationEnCours(null);
    const res = rpgActiverCapacite(duel, 'joueur', sourceId, entite.id);
    jouerSfx(res.ok ? 'player_attack_hit' : 'erreur');
    force();
  };

  const basculerAttaquant = (entite) => {
    if (attaqueJouee || !rpgPeutAttaquer(entite)) {
      jouerSfx('erreur');
      force();
      return;
    }
    jouerSfx(attaquants.includes(entite.id) ? 'annuler' : 'attaque_declaree');
    const dejaSelectionnee = attaquants.includes(entite.id);
    const ids = dejaSelectionnee
      ? attaquants.filter((id) => id !== entite.id)
      : [...attaquants, entite.id];
    const cibles = { ...ciblesAttaque };
    if (dejaSelectionnee) delete cibles[entite.id];
    setAttaquants(ids);
    setCiblesAttaque(cibles);
    force();
  };

  const cliquerCreatureJoueur = (entite) => {
    if (clicApresGlisserBloqueurRef.current === entite.id) {
      clicApresGlisserBloqueurRef.current = null;
      return;
    }
    if (cibleEnCours) {
      resoudreCible(entite, 'joueur');
      return;
    }
    if (activationEnCours) {
      resoudreActivation(entite);
      return;
    }
    if (reponseActive && combatEntrant?.coteAttaquant === 'sorcier') {
      if (!bloqueursDisponibles.some((bloqueur) => bloqueur.id === entite.id)) {
        jouerSfx('erreur');
      } else if (bloqueurSelectionne === entite.id) {
        jouerSfx('annuler');
        setBloqueurSelectionne(null);
      } else {
        jouerSfx('block_impact');
        setBloqueurSelectionne(entite.id);
      }
      force();
      return;
    }
    if (reponseApresBlocage || !monTour) return;
    if (!phase) {
      // Une seule phase d'attaque par tour : celle du camp est jouée, on ne
      // rouvre plus la sélection d'attaquants de ce tour.
      if (attaqueJouee) {
        jouerSfx('erreur');
        force();
        return;
      }
      setPhase(true);
      if (rpgPeutAttaquer(entite)) {
        setAttaquants([entite.id]);
        setCiblesAttaque({});
      } else {
        setAttaquants([]);
        setCiblesAttaque({});
      }
      force();
      return;
    }
    basculerAttaquant(entite);
  };

  const cliquerCreatureEnnemie = (entite) => {
    if (cibleEnCours) {
      resoudreCible(entite, 'ennemi');
      return;
    }
    if (activationEnCours) {
      resoudreActivation(entite);
      return;
    }
    if (cibleArmeEnCours) {
      resoudreActivationArme(entite);
      return;
    }
    // Déclaration d'attaque en cours : la frappe du Coup rapide ne tombe qu'à
    // la résolution du combat — ici, seul le retour de sélection se fait
    // entendre. Cliquer une proie légale la désigne au premier attaquant qui en
    // a besoin ; un second clic sur la même créature retire sa désignation :
    // l'attaquant repart vers le sorcier, la frappe étant un choix.
    if (phase) {
      const candidats = attaquants
        .map((id) => duel.joueur.creatures.find((candidate) => candidate.id === id))
        .filter((candidate) => ciblesCoupRapideLegales(candidate, 'joueur')
          .some((cible) => cible.id === entite.id));
      const dejaVisee = candidats.find((candidate) => ciblesAttaque[candidate.id] === entite.id);
      const libre = dejaVisee ? null : candidats.find((candidate) => !ciblesAttaque[candidate.id]);
      if (!dejaVisee && !libre) {
        jouerSfx('erreur');
        force();
        return;
      }
      const cibles = { ...ciblesAttaque };
      if (dejaVisee) delete cibles[dejaVisee.id];
      else cibles[libre.id] = entite.id;
      jouerSfx(dejaVisee ? 'annuler' : 'select');
      setCiblesAttaque(cibles);
      force();
      return;
    }
    if (reponseActive && combatEntrant?.coteAttaquant === 'sorcier' && combatEntrant.attaquants.includes(entite.id)) {
      if (bloqueurSelectionne) {
        assignerBloqueur(entite.id, bloqueurSelectionne);
      } else {
        force();
      }
      return;
    }
    if (!monTour) return;
    force();
  };

  const lancerAttaque = () => {
    const ids = [...new Set(attaquants)];
    const attaquantsValides = ids.length && ids.every((id) => duel.joueur.creatures
      .some((entite) => entite.id === id && rpgPeutAttaquer(entite)));
    if (!attaquantsValides) {
      jouerSfx('erreur');
      setPhase(false);
      setAttaquants([]);
      setCiblesAttaque({});
      force();
      return;
    }

    jouerSfx('attackers_confirm');
    // Le Coup rapide est un choix : seules les proies réellement désignées
    // arrêtent leur attaquant, les autres créatures partent vers le sorcier.
    const ciblesFinales = Object.fromEntries(ids.flatMap((id) => {
      const attaquant = duel.joueur.creatures.find((entite) => entite.id === id);
      const cible = ciblesCoupRapideLegales(attaquant, 'joueur')
        .find((entite) => entite.id === ciblesAttaque[id]);
      return cible ? [[id, cible.id]] : [];
    }));

    if (!rpgOuvrirFenetreReponse(duel, 'joueur')) {
      return;
    }
    const blocages = rpgChoisirBloqueurs(duel, 'joueur', ids, ciblesFinales);
    const attaquantsBloques = Object.entries(blocages)
      .filter(([, bloqueurs]) => bloqueurs.length > 0)
      .map(([id]) => id);
    const combat = {
      coteAttaquant: 'joueur',
      attaquants: ids,
      blocages,
      attaquantsBloques,
      repartitions: {},
      ciblesAttaque: ciblesFinales,
    };
    invaliderAnnulation();
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    if (!attaquantsBloques.length) {
      resoudreAttaqueJoueur(combat);
      return;
    }
    animerEntites(ids, 'attack', 650);
    setCombatEntrant(combat);
    force();
  };

  const declarerAttaqueAvecTous = () => {
    const ids = prets.map((entite) => entite.id);
    if (!ids.length || attaqueJouee) { jouerSfx('erreur'); return; }
    jouerSfx('attackers_confirm');
    setPhase(true);
    avancerTutoriel('attaque', 'confirmer-attaque');
    setAttaquants(ids);
    setCiblesAttaque({});
    force();
  };

  const annulerAttaque = () => {
    jouerSfx('annuler');
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    force();
  };

  const cliquerSorcier = () => {
    if (cibleEnCours && carteCiblee?.cibles?.includes('sorcier')) {
      jouerSfx('select');
      lancerMagie(cibleEnCours, 'sorcier');
      return;
    }
    if (!monTour) return;
    // Pendant la déclaration d'attaque, désigner le sorcier est le geste du
    // Coup rapide qui y renonce : les proies désignées s'effacent et toutes les
    // créatures déclarées attaquent normalement.
    if (phase && Object.keys(ciblesAttaque).length) {
      jouerSfx('annuler');
      setCiblesAttaque({});
      force();
      return;
    }
    jouerSfx('menu');
    force();
  };

  const recalculerRepartitions = (attaquantsIds, blocages) => Object.fromEntries(attaquantsIds.map((attaquantId) => {
    const coteAttaquant = combatEntrant?.coteAttaquant === 'joueur' ? 'joueur' : 'sorcier';
    const attaquant = duel[coteAttaquant].creatures.find((entite) => entite.id === attaquantId);
    const idsBloqueurs = blocages[attaquantId] ?? [];
    if (!attaquant || !idsBloqueurs.length) return [attaquantId, {}];
    const quotient = Math.floor(attaquant.atk / idsBloqueurs.length);
    let reste = attaquant.atk - quotient * idsBloqueurs.length;
    return [attaquantId, Object.fromEntries(idsBloqueurs.map((bloqueurId) => {
      const amount = quotient + (reste > 0 ? 1 : 0);
      if (reste > 0) reste -= 1;
      return [bloqueurId, amount];
    }))];
  }));

  const assignerBloqueur = (attaquantId, bloqueurId) => {
    const attaquant = duel.sorcier.creatures.find((entite) => entite.id === attaquantId);
    const bloqueur = duel.joueur.creatures.find((entite) => entite.id === bloqueurId && !entite.attaquee);
    if (!reponseActive || combatEntrant?.coteAttaquant === 'joueur' || !attaquant || !bloqueur) return;
    const retireDeCetteAttaque = (combatEntrant?.blocages[attaquantId] ?? []).includes(bloqueurId);
    // Un attaquant qui frappe une créature au Coup rapide n'est pas bloquable :
    // sa frappe a clos son attaque.
    const frappeRapide = Boolean(combatEntrant?.ciblesAttaque?.[attaquantId]);
    if (!retireDeCetteAttaque && !rpgPeutBloquerAttaquant(bloqueur, attaquant, frappeRapide)) {
      setBloqueurSelectionne(null);
      jouerSfx('erreur');
      force();
      return;
    }
    const couleursBloqueur = cardColors(cardById(bloqueur.carteId));
    if (!retireDeCetteAttaque && rpgEstProtegee(attaquant, couleursBloqueur)) {
      setBloqueurSelectionne(null);
      jouerSfx('erreur');
      force();
      return;
    }
    jouerSfx(retireDeCetteAttaque ? 'annuler' : 'block_impact');
    setBloqueurSelectionne(null);
    setCombatEntrant((courant) => {
      if (!courant?.attaquants.includes(attaquantId)) return courant;
      const blocages = Object.fromEntries(courant.attaquants.map((id) => [
        id,
        (courant.blocages[id] ?? []).filter((idBloqueur) => idBloqueur !== bloqueurId),
      ]));
      if (!retireDeCetteAttaque) blocages[attaquantId].push(bloqueurId);
      return {
        ...courant,
        blocages,
        repartitions: recalculerRepartitions(courant.attaquants, blocages),
      };
    });
    animerEntites([attaquantId, bloqueurId], retireDeCetteAttaque ? 'unblock' : 'block', 700);
  };

  const commencerGlisserBloqueur = (bloqueurId) => {
    clicApresGlisserBloqueurRef.current = bloqueurId;
    setBloqueurSelectionne(null);
    setBloqueurGlisse(bloqueurId);
  };

  const terminerGlisserBloqueur = (bloqueurId) => {
    setBloqueurGlisse(null);
    window.setTimeout(() => {
      if (clicApresGlisserBloqueurRef.current === bloqueurId) clicApresGlisserBloqueurRef.current = null;
    }, 300);
  };

  const resoudreAttaqueEnnemie = () => {
    if (!combatEntrant) return;
    const attaquantsVivants = combatEntrant.attaquants
      .filter((id) => duel.sorcier.creatures.some((entite) => entite.id === id));
    if (!attaquantsVivants.length) {
      rpgFermerFenetreReponse(duel);
      setCombatEntrant(null);
      apresCombatSorcier();
      force();
      return;
    }
    const vivants = new Set(attaquantsVivants);
    // Un attaquant rapide qui frappe une créature ne reçoit pas de bloqueur :
    // sa frappe a déjà clos son attaque.
    const blocages = Object.fromEntries(Object.entries(combatEntrant.blocages)
      .filter(([id]) => vivants.has(id))
      .map(([id, idsBloqueurs]) => [id, combatEntrant.ciblesAttaque?.[id] ? [] : idsBloqueurs]));
    const sonAttaqueBraise = rpgCombatFireSound(duel, attaquantsVivants, blocages);
    const sonFrappeDirecteBraise = rpgCombatFireSound(duel, attaquantsVivants);
    const champAvantAttaque = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgLancerAttaque(
      duel,
      'sorcier',
      attaquantsVivants,
      blocages,
      null, // Le moteur partage les blessures après les capacités du Sahir.
      null,
      Object.fromEntries(Object.entries(combatEntrant.ciblesAttaque ?? {})
        .filter(([id]) => attaquantsVivants.includes(id))),
      { attaqueDeclaree: true },
    );
    if (!res.ok) {
      jouerSfx('erreur');
      force();
      return;
    }
    const frappeDirecte = res.resume.frappeSorcier > 0;
    const frappeCreature = res.resume.paires.length > 0
      || res.resume.coupsRapides.some((coup) => !coup.annule);
    jouerSfx('combat');
    if (frappeCreature) jouerSfx(sonAttaqueBraise ?? 'player_attack_hit', 0.015);
    if (frappeDirecte) jouerSfx(sonFrappeDirecteBraise ?? 'degats', 0.18);
    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    if (frappeDirecte) declencherImpactEcran('received');
    apresCombatSorcier();
    force();
  };

  const resoudreAttaqueJoueur = (combat = combatEntrant) => {
    if (!combat || combat.coteAttaquant !== 'joueur') return;
    // Phase de blocage : une fois les blocages acceptés, le sorcier a lui aussi
    // la main pour une magie rapide avant les blessures.
    {
      const champAvantReponse = prendreInstantaneChamp();
      const debutJournalReponse = rpgNombreDestructions(duel);
      const reponse = rpgSorcierMagieRapide(duel, rng);
      if (reponse) {
        jouerSfx(rpgWaterSoundFor(cardById(reponse.carteId), 'spell')
          ?? rpgFireSoundFor(cardById(reponse.carteId), 'spell')
          ?? 'magie');
        animerModificationsChamp(champAvantReponse, [], debutJournalReponse);
      }
    }
    const attaquantsVivants = combat.attaquants
      .filter((id) => duel.joueur.creatures.some((entite) => entite.id === id));
    if (!attaquantsVivants.length) {
      rpgFermerFenetreReponse(duel);
      rpgDefinirPhase(duel, 'principale2');
      setCombatEntrant(null);
      force();
      return;
    }

    const bloqueursVivants = new Set(duel.sorcier.creatures
      .filter((entite) => !entite.attaquee)
      .map((entite) => entite.id));
    // Une frappe rapide clôt l'attaque de son attaquant : aucun bloqueur ne
    // s'interpose devant lui, même si une affectation traînait.
    const blocages = Object.fromEntries(attaquantsVivants.map((id) => [
      id,
      combat.ciblesAttaque?.[id]
        ? []
        : (combat.blocages[id] ?? []).filter((bloqueurId) => bloqueursVivants.has(bloqueurId)),
    ]));
    const attaquantsBloques = (combat.attaquantsBloques
      ?? combat.attaquants.filter((id) => combat.blocages[id]?.length))
      .filter((id) => attaquantsVivants.includes(id));
    const sonAttaqueBraise = rpgCombatFireSound(duel, attaquantsVivants, blocages);
    const sonFrappeDirecteBraise = rpgCombatFireSound(duel, attaquantsVivants);
    const champAvantAttaque = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgLancerAttaque(
      duel,
      'joueur',
      attaquantsVivants,
      blocages,
      null, // Ne pas figer un partage calculé avant les dégâts préalables.
      attaquantsBloques,
      Object.fromEntries(Object.entries(combat.ciblesAttaque ?? {})
        .filter(([id]) => attaquantsVivants.includes(id))),
      { attaqueDeclaree: true },
    );
    if (!res.ok) {
      jouerSfx('erreur');
      force();
      return;
    }

    const frappeCreature = res.resume.paires.length > 0
      || res.resume.coupsRapides.some((coup) => !coup.annule);
    jouerSfx('combat');
    if (frappeCreature) jouerSfx(sonAttaqueBraise ?? 'player_attack_hit', 0.015);
    if (res.resume.frappeSorcier > 0) {
      jouerSfx(sonFrappeDirecteBraise ?? 'player_attack_hit', 0.18);
    } else if (!frappeCreature) {
      jouerSfx('block_impact', 0.2);
    }
    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    if (res.resume.frappeSorcier > 0) declencherImpactEcran('dealt');
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    avancerTutoriel('confirmer-attaque', 'combat');
    force();
  };

  const resoudreCombat = () => {
    if (combatEntrant?.coteAttaquant === 'joueur') resoudreAttaqueJoueur();
    else resoudreAttaqueEnnemie();
  };

  // Fin de tour du joueur : phase de fin. Le sorcier peut y jouer une magie
  // rapide (il garde son mana d'un tour à l'autre) ; puis le tour se ferme.
  const finDuTour = () => {
    if (!monTour || combatEntrant || mulliganOuvert) { jouerSfx('erreur'); return; }
    if (choixManaEssaiOuvert) { jouerSfx('erreur'); return; }
    invaliderAnnulation();
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleEnCours(null);
    setActivationEnCours(null);
    rpgOuvrirFinDeTour(duel);

    const fermerTour = () => {
      if (rpgVainqueur(duel)) { force(); return; }
      sorcierApresCombatRef.current = false;
      if (terminerTourEtDetecterDegatsJoueur()) declencherImpactEcran('received');
      avancerTutoriel('fin-tour', 'tour-adverse');
      force();
      later(() => {
        const champAvantIA = prendreInstantaneChamp();
        const debutJournalDestructions = rpgNombreDestructions(duel);
        rpgSorcierPrepareTerrain(duel);
        animerModificationsChamp(champAvantIA, [], debutJournalDestructions);
        annoncerSuivantSorcier();
      }, 700);
    };

    if (!rpgPeutRepondre(duel, 'sorcier')) {
      fermerTour();
      return;
    }
    force();
    later(() => {
      const champAvant = prendreInstantaneChamp();
      const debutJournalDestructions = rpgNombreDestructions(duel);
      const degatsAvant = prendreInstantaneDegatsJoueur();
      const reponse = rpgSorcierMagieRapide(duel, rng);
      if (reponse) {
        const carte = cardById(reponse.carteId);
        jouerSfx(reponse.renvoiMain
          ? 'creature_return'
          : rpgWaterSoundFor(carte, 'spell') ?? rpgFireSoundFor(carte, 'spell') ?? 'magie');
        animerModificationsChamp(champAvant, [], debutJournalDestructions,
          [reponse.renvoiEntityId]);
        if (joueurToucheDepuis(degatsAvant)) declencherImpactEcran('received');
      }
      force();
      later(fermerTour, reponse ? 1100 : 300);
    }, 600);
  };

  // Fin de tour du sorcier : le joueur peut répondre par une magie rapide, ou
  // passer. Sans magie rapide jouable en main, la fenêtre se referme d'elle-même.
  const passerFinTourSorcier = () => {
    if (duel.finDeTour?.cote !== 'sorcier') return;
    if (terminerTourEtDetecterDegatsJoueur()) declencherImpactEcran('received');
    force();
  };

  const finirTourSorcier = () => {
    sorcierApresCombatRef.current = false;
    if (rpgVainqueur(duel)) { force(); return; }
    rpgOuvrirFinDeTour(duel);
    if (!rpgPeutRepondre(duel, 'joueur')) {
      passerFinTourSorcier();
      return;
    }
    force();
  };

  // Après le combat du sorcier : deuxième phase principale (il peut encore
  // annoncer des cartes, le joueur répond comme d'habitude), puis fin de tour.
  const apresCombatSorcier = () => {
    if (rpgVainqueur(duel)) { force(); return; }
    rpgDefinirPhase(duel, 'principale2');
    sorcierApresCombatRef.current = true;
    annoncerSuivantSorcier();
  };

  // Le sorcier annonce sa carte suivante. Le joueur répond avec une magie rapide, ou laisse passer.
  const annoncerSuivantSorcier = () => {
    if (rpgVainqueur(duel)) {
      force();
      return;
    }
    const annonce = rpgSorcierAnnonceSuivante(duel, rng);
    if (!annonce && sorcierApresCombatRef.current) {
      finirTourSorcier();
      return;
    }
    if (!annonce) {
      // Cartes épuisées : le sorcier dépense son mana restant avant de
      // déclarer ses attaques — d'abord ses armes activables (le Bâton des
      // citernes appelle ses serpents), puis ses capacités activées (la
      // foudre du Père des corbeaux).
      const champAvantActivation = prendreInstantaneChamp();
      const debutJournalActivation = rpgNombreDestructions(duel);
      const armesActivees = rpgSorcierActiverArmes(duel).length;
      const capacitesActivees = rpgSorcierActiverCapacitesIA(duel, rng).length;
      if (armesActivees || capacitesActivees) {
        animerModificationsChamp(champAvantActivation, [], debutJournalActivation);
        if (armesActivees) jouerSfx('apparition');
        force();
        later(declarerAttaqueSorcier, 900);
        return;
      }
      declarerAttaqueSorcier();
      return;
    }
    // L'annonce prend la scène : un aperçu déjà ouvert se range, un glisser en
    // cours ne lâche pas sa carte. Un appui long encore en cours, lui, garde sa
    // chance de s'ouvrir — l'annonce ne doit jamais rendre « muet » le geste du
    // joueur ; son volet s'affichera au-dessus du voile de l'annonce.
    touchDragRef.current?.();
    touchDragRef.current = null;
    setApercuAppui(null);
    setApercuSurvol(null);
    force();
  };

  // « Répondre » ferme uniquement l’aperçu : l’annonce reste en attente et
  // les magies rapides de la main restent jouables.
  const repondreAAnnonce = () => {
    if (!duel.annonce) { jouerSfx('erreur'); return; }
    setApercuSurvol(null);
    setAnnonceApercueFermeePour(duel.annonce);
  };

  const rouvrirApercuAnnonce = () => {
    if (!duel.annonce) return;
    setApercuSurvol(null);
    setAnnonceApercueFermeePour(null);
  };

  // « Laisser passer » : la carte annoncée se résout (un contre du joueur peut la défaire).
  const laisserPasser = () => {
    if (!duel.annonce) { jouerSfx('erreur'); return; }
    const carteAnnoncee = cardById(duel.annonce.carteId);
    setApercuSurvol(null);
    jouerSfx('pass');
    const champAvant = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const degatsJoueurAvantResolution = prendreInstantaneDegatsJoueur();
    const res = rpgSorcierResoudreAnnonce(duel);
    if (res.ok) {
      const sonEffetBraise = res.renvoiMain
        ? 'creature_return'
        : rpgWaterSoundFor(carteAnnoncee, 'spell')
          ?? rpgFireSoundFor(carteAnnoncee, 'spell')
          ?? rpgFireSoundFor(carteAnnoncee, 'arrival');
      if (sonEffetBraise) jouerSfx(sonEffetBraise);
    }
    if (res.ok && joueurToucheDepuis(degatsJoueurAvantResolution)) {
      declencherImpactEcran('received');
    }
    animerModificationsChamp(champAvant, [], debutJournalDestructions,
      [res.renvoiEntityId]);
    force();
    later(annoncerSuivantSorcier, 900);
  };

  // Phase d'attaque du sorcier, une fois toutes ses cartes annoncées et résolues.
  const declarerAttaqueSorcier = () => {
      const ids = rpgChoisirAttaquants(duel, 'sorcier', { ia: duel.sorcier.ia, rng });
      if (!ids.length) {
        finirTourSorcier();
        return;
      }
      rpgDefinirPhase(duel, 'attaque');
      rpgOuvrirFenetreReponse(duel);
      const ciblesRapides = rpgCiblesAttaqueRapide(duel, 'sorcier', ids);
      setCombatEntrant({
        coteAttaquant: 'sorcier',
        attaquants: ids,
        blocages: {},
        repartitions: {},
        ciblesAttaque: ciblesRapides,
      });
      force();
  };

  const commencerGlisserTactile = (event) => {
    if (!['touch', 'pen'].includes(event.pointerType) || event.isPrimary === false || carteEnVol) return;
    const source = event.target.closest('.rpg-hand__card.is-playable, .rpg-card.is-blocker-draggable');
    if (!source) return;
    const depuisMain = source.classList.contains('rpg-hand__card');
    const carte = cardById(source.dataset.cardId);
    if (depuisMain && !peutJouerCarte(carte)) return;
    touchDragRef.current?.();
    const bloqueurId = source.dataset.entityId;
    touchDragRef.current = startRpgTouchDrag(event, {
      source,
      targetAt: (x, y) => {
        const element = document.elementFromPoint(x, y);
        if (!element || !tableRef.current?.contains(element)) return null;
        if (!depuisMain) return element.closest('.is-blocker-target');
        // Dropping back in the hand or on HUD/overlays must not play a card.
        if (element.closest('.rpg-hand-dock, button:not(.rpg-card), nav, [role="dialog"], .rpg-controls, .rpg-bottombar, .rpg-combat-window')) return null;
        return element.closest('.card-table');
      },
      onStart: () => {
        masquerApercuSurvol();
        if (depuisMain) commencerGlisserCarte({ currentTarget: source, preventDefault() {} }, carte);
        else commencerGlisserBloqueur(bloqueurId);
      },
      onHover: (over) => { if (depuisMain) setSurZoneDepot(over); },
      onDrop: (target) => {
        if (depuisMain) deposerCarteSurTable({ preventDefault() {} });
        else assignerBloqueur(target.dataset.entityId, bloqueurId);
      },
      onEnd: () => {
        if (depuisMain) terminerGlisserCarte();
        else terminerGlisserBloqueur(bloqueurId);
      },
    });
  };

  const bloqueursDisponibles = duel.joueur.creatures.filter((e) => !e.attaquee && !(e.gelToursRestants > 0));
  const bloqueursSelectionnes = new Set(Object.values(combatEntrant?.blocages ?? {}).flat());
  const piochesJoueur = animationsPioche.filter((animation) => animation.side === 'joueur');
  const piochesSorcier = animationsPioche.filter((animation) => animation.side === 'sorcier');
  const tokenPiocheJoueur = piochesJoueur.at(-1)?.token ?? null;
  const tokenPiocheSorcier = piochesSorcier.at(-1)?.token ?? null;

  /* ── Piles de cartes homonymes (au doigt seulement) ─────────────────────────
     La zone de jeu tactile est étroite : deux exemplaires identiques y coûtent
     deux emplacements pour une seule décision. Comme les terrains, les cartes
     qui partagent un nom forment une pile unique avec son compteur ×N. La pile
     agit sur l'exemplaire pertinent — le premier prêt, disponible, ciblé,
     attaquant ou bloqueur — ; toucher le compteur déplie le groupe pour
     choisir soi-même, et tout groupe dont un exemplaire participe à l'action
     en cours se déplie de lui-même afin que les flèches de blocage, les halos
     de cible et les destructions retrouvent leur carte.
     Sur grand écran rien ne change : chaque carte garde son emplacement. */
  const empilerCartes = viewport.mobile;
  const groupesMain = empilerCartes
    ? groupCartesMain(duel.joueur.main)
    : duel.joueur.main.map((carteId, index) => ({ carteId, indices: [index] }));
  // Exemplaires impliqués dans l'action en cours : leur groupe se déplie seul,
  // pour que le joueur voie chaque carte concernée (et que les flèches de
  // blocage, les halos de cible et les destructions trouvent leur élément).
  const idsActionEnCours = new Set([
    ...attaquants,
    ...(combatEntrant?.attaquants ?? []),
    ...Object.values(combatEntrant?.blocages ?? {}).flat(),
    ...Object.values(combatEntrant?.ciblesAttaque ?? {}),
    // La proie d'un Coup rapide brille en rouge dès sa désignation, avant le
    // lancement de l'attaque : sa pile doit se déplier comme les autres.
    ...Object.values(ciblesAttaque),
    ...(sortJoue?.cible?.targetIds ?? []),
    ...idsVisesParAnnonce,
    ...(bloqueurSelectionne ? [bloqueurSelectionne] : []),
    ...(cibleAttaqueEnCours ? [cibleAttaqueEnCours] : []),
    ...Object.keys(animationsEntites ?? {}),
  ]);
  // Au doigt, la clé identifie une pile ; sur grand écran, elle identifie
  // un exemplaire. Partager la clé carteId entre deux exemplaires laisserait
  // des cartes fantômes (avec leur ancien état engagé) après une destruction.
  const champEnPiles = (entites) => ({
    indexParId: new Map(entites.map((entite, index) => [entite.id, index])),
    piles: empilerCartes
      ? groupEntitesParCarte(entites)
      : entites.map((entite) => ({ carteId: entite.carteId, entites: [entite] })),
  });
  const clePile = (cote, carteId) => `${cote}:${carteId}`;
  // Une pile homonyme se garde par son nom et son engagement ; une créature armée, seule dans sa
  // pile, par son identifiant — deux créatures armées identiques restent deux
  // clés distinctes.
  const clePileRendu = (pile) => (empilerCartes && !armesPortees(pile.entites[0]).length
    ? `${pile.carteId}:${pile.entites[0].attaquee ? "engagee" : "degagee"}`
    : pile.entites[0].id);
  const basculerPile = (cle) => {
    jouerSfx('pile');
    setPilesDeployees((actuel) => {
      const suivant = new Set(actuel);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  };
  const pileDeployee = (cote, pile) => pile.entites.length < 2
    || pile.entites.some((entite) => idsActionEnCours.has(entite.id))
    || pilesDeployees.has(clePile(cote, pile.carteId));
  const teteDePile = (cote, pile) => {
    const liste = pile.entites;
    if (liste.length < 2) return liste[0];
    if (cote === 'joueur') {
      if (reponseActive && !reponseApresBlocage) {
        const bloqueur = liste.find((entite) => bloqueursDisponibles.some((disponible) => disponible.id === entite.id));
        if (bloqueur) return bloqueur;
      }
      if (cibleEnCours && ['allie', 'tous'].includes(modeCible)) {
        const cible = liste.find((entite) => !rpgEstProtegee(entite, cardColors(carteCiblee)));
        if (cible) return cible;
      }
      const prete = liste.find((entite) => entite.ready && !entite.attaquee && !attaquants.includes(entite.id));
      return prete
        ?? liste.find((entite) => !entite.attaquee && !attaquants.includes(entite.id))
        ?? liste[0];
    }
    if (cibleEnCours && ['ennemi', 'tous'].includes(modeCible)) {
      return liste.find((entite) => !rpgEstProtegee(entite, cardColors(carteCiblee))) ?? liste[0];
    }
    if (cibleAttaqueEnCours) {
      const legales = ciblesCoupRapideLegales(
        duel.joueur.creatures.find((attaquant) => attaquant.id === cibleAttaqueEnCours),
        'joueur',
      );
      return liste.find((entite) => legales.some((cible) => cible.id === entite.id)) ?? liste[0];
    }
    if (combatEntrant && combatEntrant.coteAttaquant !== 'joueur') {
      return liste.find((entite) => combatEntrant.attaquants.includes(entite.id)) ?? liste[0];
    }
    if (combatEntrant) {
      return liste.find((entite) => combatEntrant.attaquants.includes(entite.id)) ?? liste[0];
    }
    return liste[0];
  };
  const campEnnemi = champEnPiles(duel.sorcier.creatures);
  const campJoueur = champEnPiles(duel.joueur.creatures);

  return (
    <div
      ref={shellRef}
      className={`rpg-battle${viewport.mobile ? ' rpg-battle--touch' : ''}${pleinEcran ? ' is-immersive' : ''}`}
      data-scene="duel"
      style={DOS_DE_CARTE_STYLE}
      onPointerDown={demarrerAppuiLongCarte}
      data-mode-mana={duel.modeMana ?? undefined}
      onContextMenu={surMenuContextuel}
    >
      <EffetsSprite />
      <SfxReactifsDuel
        vainqueur={vainqueur}
        phaseDuelActive={phaseDuelActive}
        cartesEnDestruction={cartesEnDestruction}
        impactEcran={impactEcran}
        jouerSfx={jouerSfx}
      />
      {viewport.portrait && <div className="rpg-rotate-prompt" role="dialog" aria-modal="true" aria-label="Jouer en paysage">
        <span className="rpg-rotate-prompt__icon" aria-hidden="true">↻</span>
        <h2>Le duel se joue en paysage</h2>
        <p>Tournez votre téléphone pour retrouver toute la largeur du plateau.</p>
        <button type="button" className="rpg-btn rpg-btn--primary" onClick={demanderPleinEcranEtPaysage}>Activer le paysage</button>
        <small>Si votre navigateur refuse la rotation automatique, tournez l’appareil et désactivez son verrouillage d’orientation.</small>
        <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => setEcran('jouer')}>Retour au menu</button>
      </div>}

      <div
        ref={tableRef}
        inert={viewport.portrait || mulliganOuvert || choixManaEssaiOuvert ? true : undefined}
        onPointerDownCapture={() => unlockSfx()}
        className={`card-table card-table--plateau-${plateau.id}${carteGlissee ? ' is-card-dragging' : ''}${surZoneDepot ? ' is-drop-target' : ''}${bloqueurGlisse ? ' is-blocker-dragging' : ''}${carteEnVol ? ' is-card-flight-active' : ''}${impactEcran ? ` rpg-screen-shake--${impactEcran.variante}` : ''}${impactEcran?.mode === 'received' ? ` rpg-screen-hit--${impactEcran.variante}` : ''}`}
        data-screen-impact={impactEcran?.mode ?? undefined}
        data-screen-impact-token={impactEcran?.token ?? undefined}
        aria-busy={carteEnVol ? 'true' : undefined}
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${plateau.fichier})` }}
        aria-label={`Table de jeu du duel de sorciers — ${plateau.nom}`}
        onPointerDown={commencerGlisserTactile}
        onDragOver={survolerTablePourDepot}
        onDragLeave={quitterZoneDepot}
        onDrop={deposerCarteSurTable}
      >
        <RpgTableScene3D plateau={plateau} enabled={decor3dActif} paused={Boolean(carteGlissee || carteEnVol || bloqueurGlisse)} />
        <nav className="rpg-duel-nav" aria-label="Navigation du duel">
          <strong>LE SABLIER</strong>
          {tutorielActif && <span className="rpg-duel-nav__tutorial">PARTIE D’ENTRAÎNEMENT</span>}
          {duel.modeMana === RPG_MODE_MANA_ESSAI && <span className="rpg-duel-nav__tutorial rpg-duel-nav__mana-essai">ESSAI · 30 CARTES · MANA 0–10 · SANS GAIN</span>}
          {etageHistoire && (
            <span className="rpg-duel-nav__story">
              <span className="rpg-duel-nav__story-mode">MODE </span>HISTOIRE<span className="rpg-duel-nav__story-floor"> · {etageHistoire.nom}</span>
            </span>
          )}
          <button type="button" onClick={() => setEcran(histoireEtageId ? 'histoire' : 'jouer')}>Menu</button>
          <button type="button" onClick={() => setEcran('decks')}>Deck</button>
          <button type="button" onClick={() => setEcran('catalogue')}>Catalogue</button>
          <button
            type="button"
            className={`rpg-duel-nav__sound${sonActif ? ' is-on' : ''}`}
            onClick={basculerSon}
            aria-pressed={sonActif}
            title={sonActif ? 'Couper le son (M)' : 'Activer le son (M)'}
            aria-label={sonActif ? 'Couper tous les sons' : 'Activer tous les sons'}
          >
            <span aria-hidden="true">{sonActif ? '♫' : '♪'}</span>
          </button>
          <button
            type="button"
            className={`rpg-duel-nav__decor3d${decor3dActif ? ' is-on' : ''}`}
            onClick={basculerDecor3d}
            aria-pressed={decor3dActif}
            title={decor3dActif ? 'Désactiver le décor 3D de la table' : 'Activer le décor 3D de la table'}
            aria-label={decor3dActif ? 'Désactiver le décor 3D de la table' : 'Activer le décor 3D de la table'}
          >
            <span aria-hidden="true">3D</span>
          </button>
          <button
            type="button"
            className={`rpg-duel-nav__fullscreen${pleinEcran ? ' is-on' : ''}`}
            onClick={basculerPleinEcran}
            aria-pressed={pleinEcran}
            title={pleinEcran ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
            aria-label={pleinEcran ? 'Quitter le plein écran' : 'Jouer en plein écran'}
          >
            <FullscreenIcon exit={pleinEcran} className="rpg-fullscreen-icon" />
          </button>
        </nav>

        {/* Bandeau d'ouverture de tour : le camp qui prend la main se nomme au
            centre de la table pendant 1,5 s, puis s'efface (`AnnonceTour`). */}
        <AnnonceTour annonce={annonceTour} />

        {combatEntrant && <BlockerArrows tableRef={tableRef} assignments={combatEntrant.blocages} />}
        <FaceDownHand count={duel.sorcier.main.length} drawAnimations={piochesSorcier} />

        <div className="rpg-card-piles rpg-card-piles--opponent" aria-label="Zones du sorcier">
          <CardPile count={duel.sorcier.deck.length} label="Paquet" variant="deck" drawing={piochesSorcier.length > 0} drawToken={tokenPiocheSorcier} />
          <CardPile
            count={duel.sorcier.cimetiere.length}
            label="Cimetière"
            variant="graveyard"
            topCard={duel.sorcier.cimetiere.at(-1)}
            onHoverCard={afficherApercuSurvol}
            onLeaveHoverCard={masquerApercuSurvol}
          />
        </div>

        <button type="button" className={`rpg-wizard-plate rpg-wizard-plate--ennemi${cibleEnCours && carteCiblee?.cibles?.includes('sorcier') ? ' is-ciblable' : ''}${sortJoue?.cible.targetPlate === 'sorcier' ? ' is-spell-target' : ''}`} onClick={cliquerSorcier}
          data-tutorial-target={tutorielActif && ['bienvenue', 'combat'].includes(etapeTutorielId) ? 'opponent-health' : undefined}
          title="Le sorcier adverse">
          <span className="rpg-wizard-plate__avatar rpg-wizard-plate__avatar--ennemi" aria-hidden="true"><img src={portraitSorcierAdverse} data-personnage={personnageSorcier ?? undefined} alt="" /></span>
          <span className="rpg-wizard-plate__enemy-name">{nomSorcierAdverse}</span>
          <span className="rpg-wizard-plate__identity">
            <strong>{etageHistoire ? etageHistoire.nom : tutorielActif ? 'SORCIER D’ENTRAÎNEMENT' : 'LE SORCIER'}</strong>
            <small>{etageHistoire ? etageHistoire.fonction : tutorielActif ? 'Partie guidée · sans pression' : `${deckAdverseAffiche.name} · ${deckColorLabel(deckAdverseAffiche)}`}</small>
          </span>
          <span className="rpg-wizard-plate__pv">
            <span className="rpg-wizard-plate__hp-icon rpg-wizard-plate__hp-icon--shield" aria-hidden="true">🛡</span>
            <span className="rpg-wizard-plate__hp-icon rpg-wizard-plate__hp-icon--heart" aria-hidden="true">♥</span>
            <span className="rpg-wizard-plate__hp-value">{duel.sorcier.pv}</span>
            {duel.sorcier.bouclier > 0 && <span className="rpg-wizard-plate__shield-value">· ◇ {duel.sorcier.bouclier}</span>}
          </span>
          <WizardManaCounters mana={duel.sorcier.mana} />
          <span className="rpg-wizard-plate__zones">Main · {duel.sorcier.main.length}<span className="rpg-mobile-zones"> · Paquet {duel.sorcier.deck.length} · Cimetière {duel.sorcier.cimetiere.length}</span></span>
        </button>

        {duel.modeMana === RPG_MODE_MANA_ESSAI ? (
          <FluxManaTrack camp={duel.sorcier} cote="ennemi" />
        ) : (
        <div className="rpg-terrains rpg-terrains--ennemi" aria-label="Terrains du sorcier">
          {groupTerrainStacks(duel.sorcier.terrains).map((groupe) => {
            const terrain = groupe.terrain;
            const carte = cardById(terrain.carteId);
            return (
              <button
                type="button"
                key={groupe.carteId}
                aria-label={`${carte?.name ?? 'Terrain adverse'}, ${groupe.count} terrain${groupe.count > 1 ? 's' : ''}, ${groupe.available} disponible${groupe.available > 1 ? 's' : ''}, ${groupe.tapped} engagé${groupe.tapped > 1 ? 's' : ''}`}
                className={`rpg-terrain rpg-terrain-stack${groupe.count > 1 ? ' is-stacked' : ''}${groupe.tapped > 0 && groupe.available > 0 ? ' is-partially-tapped' : ''} rpg-terrain--type-terrain rpg-terrain--elem-${carte?.element ?? 'sable'} ${cardFrameClass(carte)} ${cardMotifClass(carte)}${groupe.available === 0 && groupe.tapped > 0 ? ' is-tapped' : ''}`}
                style={cardFrameStyle(carte)}
                data-card-id={terrain.carteId}
                data-terrain-id={terrain.id}
                data-terrain-count={groupe.count}
                data-available-count={groupe.available}
                data-tapped-count={groupe.tapped}
                onMouseEnter={(event) => afficherApercuSurvol(carte, event)}
                onMouseLeave={masquerApercuSurvol}
              >
                <img src={cardArt(terrain.carteId)} alt="" />
                {groupe.count > 1 && <span className="rpg-terrain-stack__count" aria-hidden="true">×{groupe.count}</span>}
                {groupe.count > 1 && groupe.tapped > 0 && (
                  <span className="rpg-terrain-stack__engagement" aria-hidden="true">↻{groupe.tapped}</span>
                )}
              </button>
            );
          })}
        </div>
        )}

        <div className="card-row card-row--ennemi" aria-label="Champ du sorcier"
          data-tutorial-target={tutorielActif && etapeTutorielId === 'tour-adverse' ? 'enemy-field' : undefined}>
          {duel.sorcier.creatures.length ? campEnnemi.piles.map((pile) => {
            const cle = clePile('ennemi', pile.carteId);
            const deployee = pileDeployee('ennemi', pile);
            const affichees = deployee ? pile.entites : [teteDePile('ennemi', pile)];
            const nom = cardById(pile.carteId)?.name ?? 'ces créatures';
            return (
              <Fragment key={clePileRendu(pile)}>
                {deployee && pile.entites.length > 1 && (
                  <button
                    type="button"
                    className="rpg-card-stack__toggle"
                    onClick={() => basculerPile(cle)}
                    aria-label={`Replier les ${pile.entites.length} ${nom} identiques`}
                  >
                    ×{pile.entites.length}
                  </button>
                )}
                {affichees.map((entite) => {
                  const i = campEnnemi.indexParId.get(entite.id) ?? 0;
                  const carte = (
                    <TableCard
                      key={entite.id}
                      entite={entite}
                      cote="ennemi"
                      active={Boolean(combatEntrant?.coteAttaquant !== 'joueur' && combatEntrant?.attaquants.includes(entite.id))}
                      declaredAttacker={Boolean(combatEntrant?.coteAttaquant !== 'joueur' && combatEntrant?.attaquants.includes(entite.id))}
                      blocking={bloqueursSelectionnes.has(entite.id)}
                      spellTarget={Boolean(sortJoue?.cible.targetIds.includes(entite.id)) || idsVisesParAnnonce.has(entite.id)}
                      coupRapideCible={Object.values(combatEntrant?.ciblesAttaque ?? {}).includes(entite.id) || Object.values(ciblesAttaque).includes(entite.id)}
                      canTarget={Boolean(
                        (cibleEnCours && ['ennemi', 'tous'].includes(modeCible) && !rpgEstProtegee(entite, cardColors(carteCiblee)))
                        || (activationEnCours && !rpgEstProtegee(entite, 'neige'))
                        || (cibleAttaqueEnCours && ciblesCoupRapideLegales(
                          duel.joueur.creatures.find((attaquant) => attaquant.id === cibleAttaqueEnCours),
                          'joueur',
                        ).some((cible) => cible.id === entite.id))
                      )}
                      canReceiveBlocker={Boolean(reponseActive && combatEntrant?.coteAttaquant !== 'joueur' && combatEntrant?.attaquants.includes(entite.id) && !combatEntrant?.ciblesAttaque?.[entite.id] && !entite.infiltration)}
                      onAssignBlocker={assignerBloqueur}
                      actionFx={animationsEntites[entite.id]}
                      tilt={TILTS[i % TILTS.length]}
                      onHoverCard={afficherApercuSurvol}
                      onLeaveHoverCard={masquerApercuSurvol}
                      onClick={() => cliquerCreatureEnnemie(entite)}
                    />
                  );
                  if (deployee || pile.entites.length < 2) {
                    return <PileArmee key={entite.id} armes={armesPortees(entite)}>{carte}</PileArmee>;
                  }
                  return (
                    <span
                      className="rpg-card-stack"
                      key={entite.id}
                      style={cardFrameStyle(cardById(pile.carteId))}
                    >
                      {carte}
                      <button
                        type="button"
                        className="rpg-card-stack__count"
                        onClick={() => basculerPile(cle)}
                        aria-label={`Déplier les ${pile.entites.length} ${nom} identiques`}
                      >
                        ×{pile.entites.length}
                      </button>
                    </span>
                  );
                })}
              </Fragment>
            );
          }) : null}
        </div>
        <div className="card-row card-row--equipe" aria-label="Votre champ de bataille"
          data-tutorial-target={tutorielActif && etapeTutorielId === 'termine' ? 'player-field' : undefined}>
          {duel.joueur.creatures.length ? campJoueur.piles.map((pile) => {
            const cle = clePile('joueur', pile.carteId);
            const deployee = pileDeployee('joueur', pile);
            const affichees = deployee ? pile.entites : [teteDePile('joueur', pile)];
            const nom = cardById(pile.carteId)?.name ?? 'ces créatures';
            return (
              <Fragment key={clePileRendu(pile)}>
                {deployee && pile.entites.length > 1 && (
                  <button
                    type="button"
                    className="rpg-card-stack__toggle"
                    onClick={() => basculerPile(cle)}
                    aria-label={`Replier les ${pile.entites.length} ${nom} identiques`}
                  >
                    ×{pile.entites.length}
                  </button>
                )}
                {affichees.map((entite) => {
                  const i = campJoueur.indexParId.get(entite.id) ?? 0;
                  const carte = (
                    <TableCard
                      key={entite.id}
                      entite={entite}
                      cote="joueur"
                      active={attaquants.includes(entite.id) || Boolean(reponseApresBlocage && combatEntrant?.attaquants.includes(entite.id))}
                      selected={attaquants.includes(entite.id) || Boolean(reponseApresBlocage && combatEntrant?.attaquants.includes(entite.id))}
                      declaredAttacker={Boolean((phase && attaquants.includes(entite.id)) || (reponseApresBlocage && combatEntrant?.attaquants.includes(entite.id)))}
                      spellTarget={Boolean(sortJoue?.cible.targetIds.includes(entite.id)) || idsVisesParAnnonce.has(entite.id)}
                      blocking={bloqueursSelectionnes.has(entite.id)}
                      selectedBlocker={bloqueurSelectionne === entite.id}
                      coupRapideCible={Object.values(combatEntrant?.ciblesAttaque ?? {}).includes(entite.id)}
                      canTarget={Boolean((cibleEnCours && ['allie', 'tous'].includes(modeCible)
                          && entite.id !== duel.arriveeEnAttente?.entiteId
                          && !rpgEstProtegee(entite, cardColors(carteCiblee)))
                        || (activationEnCours && !rpgEstProtegee(entite, 'neige')))}
                      activationDispo={Boolean(monTour && !phase && !cibleEnCours && !cibleAttaqueEnCours
                        && !combatEntrant && !reponseActive
                        && (activationEnCours === entite.id || rpgPeutActiverCapacite(duel, 'joueur', entite.id)))}
                      onActiver={() => activerCapacite(entite)}
                      canDragBlocker={Boolean(reponseActive && !reponseApresBlocage && bloqueursDisponibles.some((bloqueur) => bloqueur.id === entite.id))}
                      draggedBlocker={bloqueurGlisse === entite.id}
                      onStartBlockerDrag={commencerGlisserBloqueur}
                      onEndBlockerDrag={terminerGlisserBloqueur}
                      actionFx={animationsEntites[entite.id]}
                      playerTurn={tourDuJoueur}
                      tutorialTarget={tutorielActif && etapeTutorielId === 'invocation' && entite.carteId === 'tislit-des-aures'
                        ? 'played-creature'
                        : undefined}
                      tilt={TILTS[(i + 2) % TILTS.length]}
                      onHoverCard={afficherApercuSurvol}
                      onLeaveHoverCard={masquerApercuSurvol}
                      onClick={() => cliquerCreatureJoueur(entite)}
                    />
                  );
                  if (deployee || pile.entites.length < 2) {
                    return <PileArmee key={entite.id} armes={armesPortees(entite)}>{carte}</PileArmee>;
                  }
                  return (
                    <span
                      className="rpg-card-stack"
                      key={entite.id}
                      style={cardFrameStyle(cardById(pile.carteId))}
                    >
                      {carte}
                      <button
                        type="button"
                        className="rpg-card-stack__count"
                        onClick={() => basculerPile(cle)}
                        aria-label={`Déplier les ${pile.entites.length} ${nom} identiques`}
                      >
                        ×{pile.entites.length}
                      </button>
                    </span>
                  );
                })}
              </Fragment>
            );
          }) : null}
        </div>

        {cartesEnDestruction.map((effet) => {
          const carteDetruite = cardById(effet.cardId);
          return (
            <div
              key={effet.effectId}
              className={`rpg-card-destruction-fx ${cardFrameClass(carteDetruite)} ${cardMotifClass(carteDetruite)}${effet.bruleeParBraise ? ' is-burning' : ''}`}
              data-rpg-destroyed-id={effet.entityId}
              data-destruction-source={effet.bruleeParBraise ? 'braise' : undefined}
              aria-hidden="true"
              // L'adieu se retire de lui-même dès la dernière image de son
              // animation, sans dépendre d'une minuterie. On ignore les
              // animations des enfants (l'illustration qui brûle) et des
              // pseudo-éléments, qui se terminent avant la carte.
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget || event.pseudoElement) return;
                setCartesEnDestruction((current) => current.filter((autre) => autre.effectId !== effet.effectId));
              }}
              style={{
                ...cardFrameStyle(carteDetruite),
                left: `${effet.left}px`,
                top: `${effet.top}px`,
                width: `${effet.width}px`,
                height: `${effet.height}px`,
                '--rpg-fx-rotation': `${effet.angle}rad`,
              }}
            >
              <img src={cardArt(effet.cardId)} alt="" />
              <b>{effet.name}</b>
            </div>
          );
        })}

        {duel.modeMana === RPG_MODE_MANA_ESSAI ? (
          <FluxManaTrack camp={duel.joueur} cote="joueur" />
        ) : (
        <div className="rpg-terrains rpg-terrains--joueur" aria-label="Vos terrains : clic manuel pour produire du mana, ou engagement automatique au paiement">
          {groupTerrainStacks(duel.joueur.terrains).map((groupe) => {
            const terrain = groupe.terrain;
            const carte = cardById(terrain.carteId);
            const couleursProduites = terrainManaColors(terrain.carteId);
            const terrainInactif = (!monTour && !reponseActive) || groupe.available === 0;
            const choixOuvert = terrainManaChoix?.terrainId === terrain.id;
            const production = couleursProduites.map(couleurLabel).join(' ou ');
            return (
              <button
                key={groupe.carteId}
                type="button"
                className={`rpg-terrain rpg-terrain-stack${groupe.count > 1 ? ' is-stacked' : ''}${groupe.tapped > 0 && groupe.available > 0 ? ' is-partially-tapped' : ''} rpg-terrain--joueur rpg-terrain--type-terrain rpg-terrain--elem-${carte?.element ?? 'sable'} ${cardFrameClass(carte)} ${cardMotifClass(carte)}${groupe.available === 0 && groupe.tapped > 0 ? ' is-tapped' : ''}${couleursProduites.length > 1 ? ' is-flexible-mana' : ''}`}
                style={cardFrameStyle(carte)}
                data-card-id={terrain.carteId}
                data-terrain-id={terrain.id}
                data-terrain-count={groupe.count}
                data-available-count={groupe.available}
                data-tapped-count={groupe.tapped}
                data-mana-colors={couleursProduites.join(' ')}
                data-tutorial-target={tutorielActif && etapeTutorielId === 'mana' ? 'mana-terrain' : undefined}
                aria-disabled={terrainInactif}
                aria-haspopup={couleursProduites.length > 1 ? 'dialog' : undefined}
                aria-expanded={couleursProduites.length > 1 ? choixOuvert : undefined}
                aria-controls={couleursProduites.length > 1 ? 'rpg-terrain-mana-choice' : undefined}
                aria-label={`${carte?.name ?? 'Terrain'}, ${groupe.count} terrain${groupe.count > 1 ? 's' : ''}, ${groupe.available} disponible${groupe.available > 1 ? 's' : ''}, ${groupe.tapped} engagé${groupe.tapped > 1 ? 's' : ''}${terrainInactif ? ', indisponible' : couleursProduites.length > 1 ? `, cliquer pour choisir un mana ${production}` : `, disponible pour produire un mana ${production}`}`}
                onClick={(event) => {
                  if (!terrainInactif) demanderCouleurMana(event, terrain);
                }}
                onMouseEnter={(event) => afficherApercuSurvol(carte, event)}
                onMouseLeave={masquerApercuSurvol}
                onFocus={(event) => afficherApercuSurvol(carte, event)}
                onBlur={masquerApercuSurvol}
              >
                <img src={cardArt(terrain.carteId)} alt="" />
                {groupe.count > 1 && <span className="rpg-terrain-stack__count" aria-hidden="true">×{groupe.count}</span>}
                {groupe.count > 1 && groupe.tapped > 0 && (
                  <span className="rpg-terrain-stack__engagement" aria-hidden="true">↻{groupe.tapped}</span>
                )}
              </button>
            );
          })}
        </div>
        )}
        {terrainManaChoix && (
          <div
            id="rpg-terrain-mana-choice"
            className="rpg-terrain-mana-choice"
            role="dialog"
            aria-label={`Choisir le mana produit par ${terrainManaChoix.nom}`}
            style={{ left: `${terrainManaChoix.left}px`, top: `${terrainManaChoix.top}px` }}
          >
            <strong>{terrainManaChoix.nom} · choisir un mana</strong>
            <div className="rpg-terrain-mana-choice__options">
              {terrainManaChoix.couleurs.map((couleur, index) => (
                <button
                  key={couleur}
                  type="button"
                  autoFocus={index === 0}
                  className={`rpg-terrain-mana-choice__option rpg-terrain-mana-choice__option--${couleur}`}
                  onClick={() => {
                    const terrainId = terrainManaChoix.terrainId;
                    setTerrainManaChoix(null);
                    engager(terrainId, couleur);
                  }}
                >
                  <i aria-hidden="true">{ELEMENT_GLYPHS[couleur] ?? '◇'}</i>{couleurLabel(couleur)}
                </button>
              ))}
            </div>
            <button type="button" className="rpg-terrain-mana-choice__cancel" onClick={() => setTerrainManaChoix(null)}>Annuler</button>
          </div>
        )}

        <div className="rpg-card-piles rpg-card-piles--player" aria-label="Vos zones de cartes">
          <CardPile
            count={duel.joueur.cimetiere.length}
            label="Cimetière"
            variant="graveyard"
            topCard={duel.joueur.cimetiere.at(-1)}
            onHoverCard={afficherApercuSurvol}
            onLeaveHoverCard={masquerApercuSurvol}
          />
          <CardPile count={duel.joueur.deck.length} label="Paquet" variant="deck" drawing={piochesJoueur.length > 0} drawToken={tokenPiocheJoueur} />
        </div>

        <div className={`rpg-wizard-plate rpg-wizard-plate--joueur${sortJoue?.cible.targetPlate === 'joueur' || annonceViseVotrePlate ? ' is-spell-target' : ''}`} title="Vous">
          <span className="rpg-wizard-plate__avatar rpg-wizard-plate__avatar--joueur" aria-hidden="true"><img src={cardArt('tin-hinan')} alt="" /></span>
          <span className="rpg-wizard-plate__profile-name">{nomProfilJoueur}</span>
          <span className="rpg-wizard-plate__identity"><strong>VOUS</strong><small>{deckJoueurAffiche.name} · {deckColorGlyph(deckJoueurAffiche)} {deckColorLabel(deckJoueurAffiche)}</small></span>
          <span className="rpg-wizard-plate__pv">
            <span className="rpg-wizard-plate__hp-icon rpg-wizard-plate__hp-icon--shield" aria-hidden="true">🛡</span>
            <span className="rpg-wizard-plate__hp-icon rpg-wizard-plate__hp-icon--heart" aria-hidden="true">♥</span>
            <span className="rpg-wizard-plate__hp-value">{duel.joueur.pv}</span>
            {duel.joueur.bouclier > 0 && <span className="rpg-wizard-plate__shield-value">· ◇ {duel.joueur.bouclier}</span>}
          </span>
          <WizardManaCounters mana={duel.joueur.mana} />
          <span className="rpg-wizard-plate__zones">Main · {duel.joueur.main.length}<span className="rpg-mobile-zones"> · Paquet {duel.joueur.deck.length} · Cimetière {duel.joueur.cimetiere.length}</span></span>
        </div>

        <div className="rpg-bottombar">
          <ol className="rpg-log" aria-live="polite">
            {duel.log.slice(-6).map((line, index) => (
              <li key={`${duel.log.length}-${index}-${line}`} className="rpg-log__line">{line}</li>
            ))}
          </ol>
          <div className="rpg-actions">
            <div className="rpg-actions__row">
              <div className="rpg-actions__combat" role="group" aria-label="Actions de combat">
                {phase && (
                  <>
                    <button type="button" className="rpg-btn rpg-btn--attaque rpg-btn--confirmer-attaque"
                      data-tutorial-target={tutorielActif && etapeTutorielId === 'confirmer-attaque' ? 'confirm-attack' : undefined}
                      disabled={!attaquants.length} onClick={() => lancerAttaque()}>
                      <CombatActionIcon type="confirm" /> Confirmer l’attaque ({attaquants.length})
                    </button>
                    <button type="button" className="rpg-btn rpg-btn--ghost rpg-btn--cancel-attack" onClick={annulerAttaque}>
                      Annuler l’attaque
                    </button>
                  </>
                )}
                {combatEntrant && (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--attaque rpg-btn--resolve-combat"
                    onClick={resoudreCombat}
                    disabled={!repartitionValide}
                  >
                    {combatEntrant.coteAttaquant === 'joueur' ? '✓ Accepter les blocages' : '⚔ Résoudre le combat'}
                  </button>
                )}
                {cibleEnCours && (
                  <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => {
                    // « Annuler la cible » n'annule que la **désignation** : une
                    // créature déjà posée reste en jeu, son arrivée ciblée
                    // renonce simplement à sa victime. Le bouton d'annulation
                    // de la dernière action, lui, défait la pose entière.
                    setCibleEnCours(null);
                    carteCibleeHandIndexRef.current = null;
                    if (duel.arriveeEnAttente?.cote === 'joueur') duel.arriveeEnAttente = null;
                    force();
                  }}>
                    {duel.arriveeEnAttente?.cote === 'joueur' ? 'Renoncer à la cible' : 'Annuler la cible'}
                  </button>
                )}
                {monTour && !phase && !combatEntrant && !cibleEnCours && !defausseOuverte && duel.joueur.creatures
                  .filter((entite) => armeById(entite.arme?.carteId ?? '')?.activation)
                  .flatMap((entite) => {
                    const carteArme = armeById(entite.arme.carteId);
                    const compteurs = Math.max(0, Number(carteArme.activation.compteurs) || 0);
                    const dispo = rpgPeutActiverArme(duel, 'joueur', entite.id);
                    const prix = compteurs
                      ? `${compteurs} compteur${compteurs > 1 ? 's' : ''} de sable`
                      : `${carteArme.activation.cout ?? 0} manas`;
                    const reserve = entite.arme?.compteurs ?? 0;
                    // Un bouton par mode : la Jitte d’Amayas en propose trois,
                    // le Bâton des citernes un seul (sans libellé).
                    return rpgModesArme(duel, 'joueur', entite.id).map((mode) => {
                      const enCours = cibleArmeEnCours?.entiteId === entite.id
                        && cibleArmeEnCours?.mode === mode.id;
                      return (
                        <button
                          key={`${entite.id}-${mode.id ?? 'seul'}`}
                          type="button"
                          className="rpg-btn rpg-btn--activation"
                          aria-pressed={enCours}
                          disabled={!dispo}
                          aria-label={`Activer ${carteArme.name}, portée par ${entite.name}, pour ${prix}${mode.label ? ` : ${mode.label}, ${mode.description ?? ''}` : ''}`}
                          onClick={() => activerArmePorteur(entite, mode.id ? mode : null)}
                        >
                          {compteurs ? '⚔' : '🐍'} {carteArme.name}{mode.label ? ` · ${mode.label}` : ''}
                          {' '}({compteurs ? `${reserve}●` : carteArme.activation.cout ?? 0})
                        </button>
                      );
                    });
                  })}
                {defausseOuverte && (
                  <span className="rpg-discard-prompt" role="status" aria-live="polite">
                    Cliquez une carte de votre main pour la défausser ({duel.defausseEnAttente.restant}).
                  </span>
                )}
              </div>
            </div>
            {fenetreSort && !apercuAnnonceOuvert && (
              <div
                className="rpg-annonce-sort__compact"
                role="group"
                aria-label={`Réponse à la carte annoncée : ${carteAnnoncee?.name ?? 'carte inconnue'}`}
              >
                <span className="rpg-annonce-sort__compact-label">
                  <span>En attente</span>
                  <b>{carteAnnoncee?.name ?? 'Carte annoncée'}</b>
                </span>
                <button
                  type="button"
                  className="rpg-btn rpg-annonce-sort__compact-preview"
                  aria-label={`Voir l’aperçu de ${carteAnnoncee?.name ?? 'la carte annoncée'}`}
                  onClick={rouvrirApercuAnnonce}
                >
                  Voir l’aperçu
                </button>
                <button
                  type="button"
                  className="rpg-btn rpg-annonce-sort__pass rpg-annonce-sort__compact-pass"
                  aria-label={`Laisser passer ${carteAnnoncee?.name ?? 'la carte annoncée'}`}
                  onClick={laisserPasser}
                >
                  <span aria-hidden="true">➜</span>
                  <span>Laisser passer</span>
                </button>
              </div>
            )}
            {/* Fin du tour du sorcier : même colonne d'actions que la réponse ci-dessus,
                au-dessus de la main — et non en tête de table, où le bloc tombait. */}
            {fenetreFinTour && (
              <div className="rpg-annonce-sort__compact rpg-fin-tour" role="group"
                aria-label="Fin du tour du sorcier : jouez une magie rapide ou passez">
                <span className="rpg-annonce-sort__compact-label">
                  <span>Fin du tour du sorcier</span>
                  <b>Magie rapide ?</b>
                </span>
                <button
                  type="button"
                  className="rpg-btn rpg-annonce-sort__pass rpg-annonce-sort__compact-pass"
                  aria-label="Passer : ne pas jouer de magie rapide"
                  onClick={() => { jouerSfx('pass'); passerFinTourSorcier(); }}
                >
                  <span aria-hidden="true">➜</span>
                  <span>Passer</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {apercuAnnonceOuvert && (
          <section
            className="rpg-annonce-sort"
            role="status"
            aria-live="polite"
            aria-label={`Le sorcier annonce ${carteAnnoncee?.name ?? 'une carte'}${cibleAnnoncee ? `. Cible : ${cibleAnnoncee.nom}` : ''}.`}
          >
            <div className="rpg-annonce-sort__panel">
              <HoverCardPreview
                carte={carteAnnoncee}
                cible={cibleAnnoncee}
                variante="annonce"
                controls={(
                  <div className="rpg-annonce-sort__controls">
                    <button
                      type="button"
                      className={`rpg-btn rpg-annonce-sort__respond${aReponseJouableEnMain ? ' is-response-available' : ''}`}
                      aria-label={`Répondre à ${carteAnnoncee?.name ?? 'la carte annoncée'} avec une magie rapide`}
                      onClick={repondreAAnnonce}
                    >
                      <span aria-hidden="true">✦</span>
                      <span>Répondre</span>
                    </button>
                    <button
                      type="button"
                      className="rpg-btn rpg-annonce-sort__pass"
                      aria-label={`Laisser passer ${carteAnnoncee?.name ?? 'la carte annoncée'}`}
                      onClick={laisserPasser}
                    >
                      <span aria-hidden="true">➜</span>
                      <span>Laisser passer</span>
                    </button>
                  </div>
                )}
              />
            </div>
          </section>
        )}

        {/* Phases et commandes de tour réunies à droite du plateau. */}
        <div className="rpg-turn-rail" role="group" aria-label="Déroulé du tour">
          <div className={`rpg-turn-indicator ${classeIndicateurTour}`} role="status" aria-live="polite">
            <span className="rpg-turn-indicator__lamp" aria-hidden="true" />
            <strong>{indicateurTour}</strong>
          </div>
          <PhaseTrack current={phaseDuelActive} jouees={attaqueJouee ? ['attaque'] : []} />
          <div className="rpg-actions__turn" role="group" aria-label="Actions de tour">
            {!phase && (
                  <button
                    type="button"
                    className={`rpg-btn rpg-btn--attaque rpg-btn--attaque-tous${attaqueJouee ? ' is-jouee' : ''}`}
                    data-tutorial-target={tutorielActif && etapeTutorielId === 'attaque' ? 'attack-all' : undefined}
                    disabled={!monTour || attaqueJouee || !prets.length || Boolean(combatEntrant) || defausseOuverte}
                    onClick={declarerAttaqueAvecTous}
                  >
                    <CombatActionIcon type="attack-all" /> {attaqueJouee ? 'Attaque jouée ce tour' : `Attaquer avec tous (${prets.length})`}
                  </button>
            )}
            {annulationDisponible && monTour && !phase && !cibleEnCours && !combatEntrant && !defausseOuverte && (
              <button
                type="button"
                className="rpg-btn rpg-btn--undo"
                aria-label="Annuler la dernière action"
                onClick={annulerDerniereAction}
              >
                ↶ Annuler la dernière action
              </button>
            )}
            <button type="button" className="rpg-btn rpg-btn--endturn"
              data-tutorial-target={tutorielActif && etapeTutorielId === 'fin-tour' ? 'end-turn' : undefined}
              onClick={finDuTour}
              disabled={!monTour || phase || Boolean(cibleEnCours) || Boolean(combatEntrant) || mulliganOuvert || choixManaEssaiOuvert}>
              ⧗ Fin du tour
            </button>
          </div>
        </div>

        <div
          className={`rpg-hand-dock${combatEntrant || fenetreSort || fenetreFinTour ? ' is-open' : ''}`}
          aria-label="Votre main"
          inert={apercuAnnonceOuvert ? true : undefined}
          data-tutorial-target={tutorielActif && ['main', 'magies'].includes(etapeTutorielId) ? 'hand' : undefined}
        >
          <div className="rpg-hand" style={{ '--hand-count': Math.max(1, groupesMain.length) }}>
            {groupesMain.map((groupe, position) => {
              const carteId = groupe.carteId;
              const i = groupe.indices[0];
              const exemplaires = groupe.indices.length;
              const carte = cardById(carteId);
              if (!carte) return null;
              // L'éventail : la carte connaît sa place dans la rangée — un
              // nombre signé, nul au centre — et son carré, qui donne la
              // descente en arc des bords. La feuille de style en fait un
              // angle, une ouverture et une inclinaison (voir « L'éventail de
              // la main » dans `rpg-battle.css`).
              const eventail = position - (groupesMain.length - 1) / 2;
              const estTerrain = carte.kind === 'terrain';
              const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
              // Les sorts portent le socle de leur famille au bas de la face —
              // la Magie Rapide comme la Sorcellerie — et n'impriment donc plus
              // la petite ligne de type du haut (voir « Les familles de sorts »
              // dans `rpg-battle.css`). Les créatures, elles, se lisent à leurs
              // statistiques, et les terrains gardent leur ligne.
              const familleSort = magieFamille(carte);
              const peutRepondre = reponseActive && carte.instant;
              // Une seule règle pour le halo de jouabilité — bleu pour ce qui se
              // pose, la teinte de la famille pour un sort (voir « La lueur de
              // jouabilité d'un sort », dans `rpg-battle.css`) —, le
              // glisser-déposer et le clic : deux copies de la règle
              // finissaient par diverger, et une carte allumée mais injouable
              // enferme le joueur.
              const jouable = defausseOuverte || peutJouerCarte(carte);
              const enVol = carteEnVol?.phase === 'flying'
                && carteEnVol.carteId === carteId
                && groupe.indices.includes(carteEnVol.handIndex);
              const piocheEnCours = enVol ? null
                : piochesJoueur.find((animation) => groupe.indices.includes(animation.handIndex));
              const styleVol = enVol ? {
                left: `${carteEnVol.from.left}px`,
                top: `${carteEnVol.from.top}px`,
                width: `${carteEnVol.from.width}px`,
                height: `${carteEnVol.from.height}px`,
                '--rpg-flight-dx': `${carteEnVol.to.left - carteEnVol.from.left}px`,
                '--rpg-flight-dy': `${carteEnVol.to.top - carteEnVol.from.top}px`,
                '--rpg-flight-scale-x': carteEnVol.to.width / Math.max(1, carteEnVol.from.width),
                '--rpg-flight-scale-y': carteEnVol.to.height / Math.max(1, carteEnVol.from.height),
              } : {};

              const contenu = (
                <>
                <button
                  type="button"
                  draggable={jouable && !defausseOuverte}
                  onClick={() => cliquerCarteMain(carteId, i)}
                  onMouseEnter={(event) => afficherApercuSurvol(carte, event)}
                  onMouseLeave={masquerApercuSurvol}
                  onFocus={(event) => afficherApercuSurvol(carte, event)}
                  onBlur={masquerApercuSurvol}
                  onDragStart={(event) => commencerGlisserCarte(event, carte)}
                  onDragEnd={terminerGlisserCarte}
                  className={[
                    'rpg-hand__card rpg-hand__card--img',
                    estTerrain ? 'rpg-hand__card--terrain' : '',
                    `rpg-hand__card--type-${cardFrameType(carte)}`,
                    `rpg-hand__card--elem-${carte.element}`,
                    familleSort ? `rpg-hand__card--famille-${familleSort}` : '',
                    cardFrameClass(carte),
                    cardMotifClass(carte),
                    piocheEnCours ? 'rpg-hand-card--drawing' : '',
                    carte.instant ? 'is-instant' : '',
                    cibleEnCours === carteId ? 'is-targeting' : '',
                    jouable ? 'is-playable' : 'is-unplayable',
                    carteGlissee === carteId ? 'is-dragging' : '',
                    enVol ? `rpg-card-flight is-flying${estTerrain ? ' rpg-card-flight--terrain' : ''}` : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    '--tilt': `${TILTS[i % TILTS.length]}deg`,
                    '--hand-fan': eventail,
                    '--hand-fan-arc': eventail * eventail,
                    ...cardFrameStyle(carte),
                    ...(piocheEnCours ? { '--rpg-draw-delay': `${piocheEnCours.delay}ms` } : {}),
                    ...styleVol,
                  }}
                  data-draw-token={piocheEnCours?.token}
                  data-card-id={carteId}
                  data-hand-index={i}
                  data-tutorial-target={tutorielActif && etapeTutorielId === 'terrain' && carteId === 'desert'
                    ? 'terrain-card'
                    : tutorielActif && etapeTutorielId === 'creature' && carteId === 'tislit-des-aures'
                      ? 'creature-card'
                      : undefined}
                  data-pile-count={exemplaires}
                  data-rpg-card-flight={enVol ? (estTerrain ? 'terrain' : 'creature') : undefined}
                  data-rpg-flight-card-id={enVol ? carteId : undefined}
                  data-jouable={jouable ? 'true' : 'false'}
                  aria-label={`${carte.name}${exemplaires > 1 ? ` — pile de ${exemplaires} exemplaires identiques` : ''} — ${cardFaceTypeLine(carte)} — couleur ${cardColorLabel(carte)}${estTerrain ? '' : ` — coût ${cardCostLabel(carte)}`}${carte.text ? ` — ${carte.text}` : ''} — cliquer pour ${defausseOuverte ? 'défausser cette carte' : carte.kind === 'magie' ? 'demander le lancement du sort' : 'la jouer'}${defausseOuverte ? '' : jouable ? ', paiement automatique (ou glisser-déposer)' : ', indisponible pour le moment'}`}
                >
                  <img className="rpg-hand__img" src={cardArt(carte)} alt="" aria-hidden="true" />
                  <CardElementBadge carte={carte} />
                  <IconesCarte carte={carte} className="rpg-card-icones--main" />
                  <span className="rpg-hand__title">
                    <ManaCost carte={carte} showElement={false} />
                  </span>
                  {familleSort && <SortSceau carte={carte} className="rpg-hand__sceau rpg-hand__sort" />}
                  {!estCreature && !familleSort && <span className="rpg-hand__type">{cardFaceTypeLine(carte)}</span>}
                  {estCreature && (
                    <span className="rpg-hand__stats" aria-label={`Attaque ${carte.atk}, défense ${carte.def}`}>
                      <span className="rpg-hand__stat rpg-hand__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{carte.atk}</span></span>
                      <span className="rpg-hand__stat rpg-hand__stat--def"><CardStatIcon type="defense" /><span className="rpg-stat-value">{carte.def}</span></span>
                    </span>
                  )}
                  {carteEstArme(carte) && (
                    <span className="rpg-hand__stats" aria-label={`Porteur : ${signeBonus(bonusArme(carte)?.atk)} attaque, ${signeBonus(bonusArme(carte)?.def)} défense`}>
                      <span className="rpg-hand__stat rpg-hand__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{signeBonus(bonusArme(carte)?.atk)}</span></span>
                      <span className="rpg-hand__stat rpg-hand__stat--def"><CardStatIcon type="defense" /><span className="rpg-stat-value">{signeBonus(bonusArme(carte)?.def)}</span></span>
                    </span>
                  )}
                </button>
                {exemplaires > 1 && (
                  <span className="rpg-hand__pile-count" aria-hidden="true">×{exemplaires}</span>
                )}
                {enVol && (
                  <span
                    className="rpg-hand__flight-placeholder"
                    style={{ width: `${carteEnVol.slotWidth}px`, height: `${carteEnVol.slotHeight}px` }}
                    aria-hidden="true"
                  />
                )}
                </>
              );
              // Au doigt, chaque pile forme un bloc : le compteur flotte sur son
              // coin sans masquer le nom ni le coût. À la souris, le DOM reste
              // exactement celui d'origine (une carte = un bouton).
              return empilerCartes
                ? <span className="rpg-hand__pile" key={`${carteId}-${i}`}>{contenu}</span>
                : <Fragment key={`${carteId}-${i}`}>{contenu}</Fragment>;
            })}
          </div>
        </div>

        {sortJoue && <SpellAnnouncement annonce={sortJoue} />}
        {apercuSurvol && !apercuMagie && !mulligan && !apercuAnnonceOuvert && (
          <HoverCardPreview
            carte={cardById(apercuSurvol.carteId)}
            armes={cartesDesIds(apercuSurvol.armesIds)}
            style={apercuSurvol.style}
            panelRef={panelRef}
          />
        )}
        {apercuMagie && (
          <HoverCardPreview
            carte={cardById(apercuMagie)}
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            spellPlayed
          />
        )}

        {confirmationSort && (
          <ConfirmationSort
            carte={cardById(confirmationSort.carteId)}
            onConfirmer={confirmerSort}
            onAnnuler={() => setConfirmationSort(null)}
          />
        )}
        {vainqueur && (
          <div className={`rpg-overlay${vainqueur === 'joueur' ? '' : ' rpg-overlay--loss'}`}>
            <h2>
              {etageHistoire
                ? vainqueur === 'joueur' ? 'Étage déblayé !' : 'L’étage vous repousse…'
                : vainqueur === 'joueur' ? 'Le sorcier s’effondre !' : vainqueur === 'sorcier' ? 'Vous êtes tombé…' : 'Double chute…'}
            </h2>
            <p>
              {etageHistoire
                ? vainqueur === 'joueur'
                  ? `${etageHistoire.nom} ne tient plus son palier. La suite de la tour vous attend.`
                  : `${etageHistoire.nom} vous attend au même étage : chaque duel repart à zéro.`
                : duel.modeMana === RPG_MODE_MANA_ESSAI
                  ? 'Fin du duel d’essai : aucun crédit ni progrès enregistré. Rejouez ou changez de deck depuis le menu.'
                  : vainqueur === 'joueur'
                    ? 'Bab El respire : le cycle tient encore un soir.'
                    : 'Le sable recouvre votre Nom. L’Astrolabe sonne pour quelqu’un d’autre.'}
            </p>
            {etageHistoire ? (
              <div className="rpg-overlay__actions">
                {vainqueur === 'joueur' && etageSuivant && !campagneDuelRef.current && (
                  <button type="button" className="rpg-btn rpg-btn--primary" onClick={() => demarrerEtage(etageSuivant.id)}>
                    Étage suivant : {etageSuivant.nom} <span aria-hidden="true">→</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`rpg-btn ${vainqueur === 'joueur' && !etageSuivant ? 'rpg-btn--primary' : 'rpg-btn--ghost'}`}
                  onClick={() => demarrerEtage(etageHistoire.id, { campagne: Boolean(campagneDuelRef.current) })}
                >
                  {vainqueur === 'joueur' ? 'Rejouer l’étage' : 'Recommencer l’étage'}
                </button>
                <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => setEcran('histoire')}>
                  {vainqueur === 'joueur' && !etageSuivant ? 'Tour terminée — retour aux tours' : 'Retour aux tours'}
                </button>
              </div>
            ) : (
              <button type="button" className="rpg-btn rpg-btn--primary" onClick={() => nouvellePartie(duel.modeMana === RPG_MODE_MANA_ESSAI ? { etageId: null, essaiManaId: duel.essaiDeckId } : {})}>
                {duel.modeMana === RPG_MODE_MANA_ESSAI ? 'Rejouer l’essai' : 'Nouvelle partie'}
              </button>
            )}
          </div>
        )}
      </div>
      {choixManaEssaiOuvert && !viewport.portrait && (
        <div className="rpg-flux-choix" role="dialog" aria-modal="true" aria-labelledby="rpg-flux-choix-titre">
          <div className="rpg-flux-choix__panel">
            <h2 id="rpg-flux-choix-titre" className="rpg-flux-choix__titre">Choisis ton mana</h2>
            <div className="rpg-flux-choix__options">
              {duel.joueur.couleurs.map((couleur, index) => (
                <button
                  key={couleur}
                  type="button"
                  autoFocus={index === 0}
                  className={`rpg-flux-choix__option rpg-flux-choix__option--${couleur}`}
                  onClick={() => choisirNouveauManaEssai(couleur)}
                  aria-label={`Choisir le mana ${couleurLabel(couleur)}`}
                >
                  <span aria-hidden="true"><ElementEmblem element={couleur} /></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {tutorielActif && etapeTutoriel && !viewport.portrait && !mulliganOuvert && (
        <RpgTutorialOverlay
          key={etapeTutoriel.id}
          step={etapeTutoriel}
          stepIndex={indexEtapeTutoriel}
          totalSteps={RPG_TUTORIAL_STEPS.length}
          onNext={continuerTutoriel}
          onFinish={terminerTutoriel}
          onClose={fermerTutoriel}
        />
      )}
      {apercuAppui && <ApercuCarteAppuiLong carte={cardById(apercuAppui)} armes={cartesDesIds(apercuAppuiArmes)} onFermer={fermerApercuAppui} />}
      {/* La même fiche que le catalogue : le clic droit l'ouvre sur la table,
          en main, sur les terrains ou sur une pile — sans rien jouer. */}
      {apercuCatalogue && (
        <ApercuCarteCatalogue
          carte={cardById(apercuCatalogue)}
          armes={cartesDesIds(apercuCatalogueArmes)}
          surface={apercuCatalogueSurface}
          onFermer={fermerApercuCatalogue}
        />
      )}
      {mulligan && (
        <VoletMulligan
          main={duel.joueur.main}
          etape={mulligan.etape}
          choix={mulligan.choix}
          nouveau={mulligan.nouveau}
          bilan={mulligan.bilan}
          apercu={apercuSurvol}
          survol={viewport.survol}
          essaiMana={duel.modeMana === RPG_MODE_MANA_ESSAI}
          panelRef={panelRef}
          onBasculer={basculerCarteMulligan}
          onValider={validerMulligan}
          onAnnulerSelection={viderSelectionMulligan}
          onContinuer={terminerMulligan}
          onSurvol={afficherApercuSurvol}
          onQuitterSurvol={masquerApercuSurvol}
        />
      )}
    </div>
  );
}
