import { convertirDeckSansTerrain } from './rpgCards.js';
/**
 * Le Sablier — duel de cartes tactique.
 * Les tours gardent leur liberté d'une partie de cartes à collectionner :
 * poser un terrain, lancer des sorts, déclarer ses attaquants, puis défendre
 * pendant la fenêtre de réponse de l'adversaire.
 */

import { Fragment, memo, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './rpg-battle.css';
import './rpg-mobile.css';
import './rpg-story.css';
import './rpg-deckbox.css';
import './rpg-mana-essai.css';
import './rpg-soins.css';
import './rpg-vie-compteurs.css';
import { CompteurCarte, PlaqueVie } from './RpgVieCompteurs.jsx';
import useRpgMythicImpact from './useRpgMythicImpact.js';
import { createRpgLandscapeSession } from './rpgLandscape.js';
import FullscreenIcon from './FullscreenIcon.jsx';
import RpgMessagerieBouton from './RpgMessagerieBouton.jsx';
import RpgMessageriePanel from './RpgMessageriePanel.jsx';
import { isFullscreenShortcut } from './gameFullscreen.js';
import useGameFullscreen from './useGameFullscreen.js';
import { AuthContext } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { useFriends } from '../friends/FriendsContext.jsx';
import { useMessages } from '../messages/MessagesContext.jsx';
import { LetsTalkMark } from '../social/LetsTalkLogo.jsx';
import {
  plateauDeRepli,
  plateauParId,
  resoudrePlateauxDuDuel,
} from './rpgPlateaux.js';
import { territoireDuDuel } from './rpgTerritoire.js';
import { groupTerrainStacks } from './rpgTerrainStacks.js';
import {
  RPG_MANA_ESSAI_CHAMP_MAX,
  RPG_MANA_ESSAI_MAIN_MAX,
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
import { rpgDelaiReflexionIA } from './rpgAI.js';
import { RpgConqueteMusic, campMusicalDuTerritoire, plateauMusicalDuCamp } from './rpgConqueteMusic.js';
import { RpgAmbientMusic } from './rpgAmbientMusic.js';
import {
  RpgMainThemeMusic,
  RPG_PLATEAUX_MUSICAUX,
  reprendreThemePrincipal,
} from './rpgPlateauMusic.js';
import {
  clampRpgVolume,
  RPG_ABORDAGE_SFX,
  RPG_NAVIRE_ARRIVEE_SFX,
  RPG_PIRATE_ARRIVEE_SFX,
  RpgAudioPlayer,
  rpgSonArriveePirate,
} from './rpgAudio.js';
import { rpgEstCartePirate } from './rpgLettresDeMarque.js';
import { rpgCombatSound, rpgFireSoundFor } from './rpgFireAudio.js';
import { rpgWaterSoundFor } from './rpgWaterAudio.js';
import { blessureDuMarteau, rpgFoudreSoundFor } from './rpgFoudreAudio.js';
import { annonceSoins, regrouperSoins, RPG_SOIN_DUREE, sonDuSoin } from './rpgSoins.js';
import RpgDeckAtelier from './RpgDeckAtelier.jsx';
import RpgCardGuide from './RpgCardGuide.jsx';
import RpgCardRules from './RpgCardRules.jsx';
import { EffetsSprite, IconesCarte, PastillesCarte } from './effetIcons.jsx';
import { effetsEpuisesPourEntite } from './effetIcons.js';
import RpgTutorialOverlay from './RpgTutorialOverlay.jsx';
import RpgTutorialMenu from './RpgTutorialMenu.jsx';
import RpgStoryTowerPreview from './RpgStoryTowerPreview.jsx';
import RpgTableScene3D from './RpgTableScene3D.jsx';
import { readRpgTable3dPref, writeRpgTable3dPref } from './rpgTableSceneThemes.js';
import { useDecksSablier } from './useDecksSablier.js';
import { useSablierBourse } from './useSablierBourse.js';
import RpgSouk from './RpgSouk.jsx';
import RpgProfilJoueur from './RpgProfilJoueur.jsx';
import RpgBoosterOuverture from './RpgBoosterOuverture.jsx';
import RpgMarketIcon from './RpgMarketIcon.jsx';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import RpgQuetesDuJour from './RpgQuetesDuJour.jsx';
import { GAINS, creditsLisible, gainsDeTour } from './rpgCredits.js';
import { glypheEmbleme, progressionDeXp, pseudoLisible, xpLisible } from './rpgProfil.js';
import {
  appliquerManaInitialTutoriel,
  preparerDuelTutoriel,
  preparerEtapeTutoriel,
  RPG_TUTORIELS,
  RPG_TUTORIAL_OPPONENT_DECK,
  RPG_TUTORIAL_PLAYER_DECK,
  tutorielParId,
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
  RPG_PV_JOUEUR,
  RPG_PV_SORCIER_BASE,
  arriveeCiblePortee,
  arriveeConsulteDeck,
  rpgCibleAuto,
  rpgChoisirAttaquants,
  rpgContreJouable,
  rpgSortACibleValide,
  rpgDefinirPhase,
  rpgChoisirBloqueurs,
  rpgCiblesAttaqueRapide,
  rpgDefausserCarte,
  rpgExcesMainFinDeTour,
  rpgPreparerDefausseFinDeTour,
  rpgChoisirCouleurMana,
  rpgDemarrerManaEssai,
  rpgEngagerTerrain,
  rpgFermerFenetreReponse,
  rpgFinDeTour,
  rpgConsommerPresentations,
  rpgConsommerPrisesEnCale,
  rpgConsommerArriveesPirate,
  rpgConsommerArriveesNavire,
  rpgConsommerSoins,
  rpgJouerCreature,
  rpgAppliquerBannieresAttaque,
  rpgLancerAttaque,
  rpgPeutAttaquer,
  rpgLancerMagie,
  rpgMulligan,
  rpgMulliganSorcier,
  rpgNouveauDuel,
  rpgNombreDestructions,
  rpgDestructionsDepuis,
  rpgPrisesEnCale,
  rpgRenvoisEnMain,
  rpgNombreBlessures,
  rpgBlessuresDepuis,
  rpgOuvrirFenetreReponse,
  rpgOuvrirFinDeTour,
  rpgPeutRepondre,
  rpgSorcierMagieRapide,
  rpgEmplacementsChamp,
  rpgEstProtegee,
  rpgEstProtegeeDesSorts,
  rpgPeutBloquerAttaquant,
  rpgBlocageForceValide,
  rpgProvocationValide,
  rpgPeutMulligan,
  rpgPeutPayer,
  rpgPoserTerrain,
  rpgResoudreArriveeCiblee,
  rpgResoudreDestructionCiblee,
  rpgResoudreSiteCible,
  rpgDissiperDestructionsSansCible,
  cibleRespecteCoutMax,
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
  rpgSyncCompteurEntites,
  rpgVainqueur,
} from './rpgDuel.js';
import { tempsRestant } from './rpgPvpSalon.js';
import {
  cardRarityInfo,
  cardFrameClass,
  cardMotifClass,
  cardFrameColor,
  cardColorCost,
  cardCostColors,
  bonusArme,
  carteEstArme,
  cardColors,
  cardHybridGradient,
  terrainManaColors,
  RPG_ELEMENTS,
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_SORCIER_BASE,
  RPG_DECKS,
  RPG_DUEL_CARDS,
  cardArtId,
  cardById,
  cardHasPrintedType,
  cardTypeLine,
  cardResonanceGroup,
  resonanceGroupLabel,
  armeById,
  magieFamille,
  modificationStats,
  rpgValiderDeck,
  signeStat,
} from './rpgCards.js';
// La signature des deux familles de sorts — sceau, socle, ligne teintée — vit
// dans son propre module : l'atelier de decks la partage (voir
// `rpgSortSignature.jsx`).
import { SortSceau, SortSocle, classeLigneFamille } from './rpgSortSignature.jsx';
import { cardArt, cardArtEntite, cardArtFurie } from './rpgCardArt.js';
import {
  DeckBox,
  ElementEmblem,
  deckBoxArtUrl,
  deckColorModifier,
  inclinerBoitier,
  redresserBoitier,
} from './RpgDeckBox.jsx';

const ELEMENT_GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', tenebres: '⚖️', hybride: '🔥⏳' };
const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres', hybride: 'Sable + Braise' };
const FILTRE_COULEUR_LABELS = { toutes: 'Toutes', sable: 'Sable', braise: 'Braise', eau: 'Eau', neige: 'Neige', tenebres: 'Ténèbres', hybride: 'Hybride' };
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

  if (effet.type === 'destruction-totale') return { nom: 'Toutes les créatures des deux camps' };
  // Le Grand Hiver : la vague ne choisit pas son camp, la fiche le dit.
  if (effet.type === 'degats' && effet.cible === 'toutes-autres') {
    return { nom: 'Toutes les créatures des deux camps' };
  }
  if (effet.cible === 'toutes-creatures') return { nom: effet.inclutAllies ? 'Toutes les créatures des deux camps' : 'Toutes vos créatures' };
  if (effet.type === 'buff') return { nom: 'Toutes les créatures du sorcier' };
  if (effet.type === 'contresort') return { nom: 'La carte annoncée' };
  if (effet.cible === 'creature-amie') return { nom: 'Une créature du sorcier', illustrationId: sorcierArtId, illustrationUrl: sorcierPortraitUrl };
  if (effet.type === 'soin' || effet.type === 'pioche' || carte.cibles?.includes('soi')) {
    return { nom: 'Le sorcier', illustrationId: sorcierArtId, illustrationUrl: sorcierPortraitUrl };
  }
  // Le set Ténèbres : des sorts sans « créature ciblée », décrits pour ce
  // qu'ils font à chacun des deux camps.
  if (effet.type === 'transfert') return { nom: 'Vous et le sorcier' };
  if (effet.type === 'defausse-adverse') return { nom: 'Votre main' };
  if (effet.type === 'defaussePaquet') return { nom: 'Votre paquet' };
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

function mesurerDestinationVol(table, kind, from, carteId, emplacement = null) {
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
  // Mode sans terrains : la carte jouée prend la place libre dessinée sur le
  // plateau. On vise la case elle-même (la cinquième reste toujours visible)
  // au lieu de répartir les cartes comme dans une rangée flexible.
  const slots = [...zone.querySelectorAll('.rpg-creature-slot')];
  // La case choisie par le joueur quand il en a désigné une ; sinon la
  // première case vide — pas la n-ième : une case libérée par une mort peut
  // se trouver au milieu de la rangée.
  const slotLibre = (Number.isInteger(emplacement) ? slots[emplacement] : null)
    ?? zone.querySelector('.rpg-creature-slot.is-empty') ?? slots[cards.length];
  const slotRect = slotLibre?.getBoundingClientRect();
  if (slotRect && (slotRect.width || slotLibre.offsetWidth) && (slotRect.height || slotLibre.offsetHeight)) {
    const slotWidth = slotRect.width || slotLibre.offsetWidth;
    const slotHeight = slotRect.height || slotLibre.offsetHeight;
    return {
      left: slotRect.left + (slotWidth - width) / 2,
      top: slotRect.top + slotHeight - height,
      width,
      height,
    };
  }
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
  // La couleur du disque suit le **coût** de la carte (les pips à payer), dans
  // le même sens que les bandes de son cadre : en main, la couleur lue sur la
  // carte et celle du coût ne font plus qu'une.
  const colors = cardCostColors(carte);
  const hybrid = colors.length > 1 || colors[0] === 'hybride';
  const teinte = colors[0] ?? carte.element;
  return (
    <span
      className={`rpg-mana-cost rpg-mana-cost--${hybrid ? 'hybride' : teinte}${compact ? ' is-compact' : ''}`}
      style={hybrid ? { '--rpg-hybrid-cost-bg': cardHybridGradient({ colors }) } : undefined}
      aria-label={`Coût : ${cardCostLabel(carte)}`}
    >
      <b>{carte.cost}</b>
      {!hybrid && showElement && <i aria-hidden="true">{ELEMENT_GLYPHS[teinte] ?? '◇'}</i>}
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

export function calculerApercuDepenseMana(camp, carte) {
  if (!camp || !carte) return null;
  const cout = Math.max(0, Number(carte.cost) || 0);
  if (cout <= 0 || !rpgPeutPayer(camp, carte)) return null;
  const dispo = {};
  const depense = {};
  for (const couleur of RPG_ELEMENTS) {
    dispo[couleur] = Math.max(0, Math.floor(Number(camp.mana?.[couleur]) || 0));
    depense[couleur] = 0;
  }
  let reste = cout;
  const coutCouleur = cardColorCost(carte);
  for (const couleur of RPG_ELEMENTS) {
    const requis = Math.max(0, Number(coutCouleur[couleur]) || 0);
    if (!requis) continue;
    const pris = Math.min(dispo[couleur], requis);
    if (pris < requis) return null;
    dispo[couleur] -= pris;
    depense[couleur] += pris;
    reste -= pris;
  }
  const prioriteGenerique = [
    ...RPG_ELEMENTS.filter((couleur) => !coutCouleur[couleur]),
    ...RPG_ELEMENTS.filter((couleur) => coutCouleur[couleur]),
  ];
  for (const couleur of prioriteGenerique) {
    if (reste <= 0) break;
    const pris = Math.min(dispo[couleur], reste);
    dispo[couleur] -= pris;
    depense[couleur] += pris;
    reste -= pris;
  }
  return reste === 0 ? depense : null;
}

export function calculerDeficitMana(camp, carte, slots) {
  if (!camp || !carte || !Array.isArray(slots)) return null;
  const cout = Math.max(0, Number(carte.cost) || 0);
  if (cout <= 0 || rpgPeutPayer(camp, carte)) return null;
  const coutCouleur = cardColorCost(carte);
  const manqueParCouleur = {};
  let totalManqueCouleur = 0;
  let totalDispo = 0;
  for (const couleur of RPG_ELEMENTS) {
    const requis = Math.max(0, Number(coutCouleur[couleur]) || 0);
    const dispo = Math.max(0, Math.floor(Number(camp.mana?.[couleur]) || 0));
    totalDispo += dispo;
    const manque = Math.max(0, requis - dispo);
    manqueParCouleur[couleur] = manque;
    totalManqueCouleur += manque;
  }
  let manqueGenerique = Math.max(0, (cout - totalDispo) - totalManqueCouleur);
  const indicesDeficit = new Set();
  // 1. Sources de la couleur requise déjà dépensées ce tour
  for (const slot of slots) {
    if (slot.etat === 'depense' && slot.couleur && manqueParCouleur[slot.couleur] > 0) {
      indicesDeficit.add(slot.index);
      manqueParCouleur[slot.couleur] -= 1;
    }
  }
  // 2. Déficit générique sur d'autres sources dépensées ce tour
  for (const slot of slots) {
    if (manqueGenerique <= 0) break;
    if (slot.etat === 'depense' && !indicesDeficit.has(slot.index)) {
      indicesDeficit.add(slot.index);
      manqueGenerique -= 1;
    }
  }
  // 3. Sources non encore acquises (emplacements vides) pour les pips ou le coût restant
  let manqueNonAcquis = Object.values(manqueParCouleur).reduce((a, b) => a + b, 0) + manqueGenerique;
  for (const slot of slots) {
    if (manqueNonAcquis <= 0) break;
    if (slot.etat === 'vide' && !indicesDeficit.has(slot.index)) {
      indicesDeficit.add(slot.index);
      manqueNonAcquis -= 1;
    }
  }
  return indicesDeficit.size > 0 ? indicesDeficit : null;
}

export function FluxManaTrack({ camp, cote, carteApercu = null }) {
  const capacite = camp.manaMax ?? {};
  const maximum = Object.values(capacite).reduce((total, valeur) => total + valeur, 0);
  const disponible = Object.values(camp.mana).reduce((total, valeur) => total + valeur, 0);
  const depenseApercu = cote === 'joueur' ? calculerApercuDepenseMana(camp, carteApercu) : null;
  const totalApercu = depenseApercu
    ? Object.values(depenseApercu).reduce((total, valeur) => total + valeur, 0)
    : 0;
  // Dix orbes fixes, dans l'ordre d'acquisition. Un mana dépensé s'assombrit
  // mais garde sa couleur ; il se rallume quand la réserve se recharge.
  const restants = { ...camp.mana };
  const slotsBase = Array.from({ length: RPG_MANA_ESSAI_MAX }, (_, index) => {
    const couleur = camp.manaSources?.[index] ?? null;
    const allumee = Boolean(couleur && restants[couleur] > 0);
    const apercuCout = Boolean(allumee && depenseApercu && restants[couleur] <= (depenseApercu[couleur] ?? 0));
    if (allumee) restants[couleur] -= 1;
    return { index, couleur, etat: !couleur ? 'vide' : allumee ? 'disponible' : 'depense', apercuCout };
  });
  const indicesDeficit = cote === 'joueur' && !depenseApercu
    ? calculerDeficitMana(camp, carteApercu, slotsBase)
    : null;
  const slots = slotsBase.map((slot) => ({
    ...slot,
    deficitCout: Boolean(indicesDeficit?.has(slot.index)),
  }));
  return (
    <div
      className={`rpg-terrains rpg-terrains--${cote} rpg-flux-track rpg-flux-track--${cote}`}
      data-tutorial-target={cote === 'joueur' ? 'mana-track' : undefined}
      data-mana-capacite={maximum}
      data-mana-disponible={disponible}
      data-mana-apercu-cout={totalApercu > 0 ? totalApercu : undefined}
      data-mana-deficit-cout={indicesDeficit ? indicesDeficit.size : undefined}
      role="status"
      aria-label={`${cote === 'joueur' ? 'Votre mana' : 'Mana du sorcier'} : ${disponible} disponible sur ${maximum} acquis, maximum ${RPG_MANA_ESSAI_MAX}. ${Object.entries(capacite).filter(([, n]) => n > 0).map(([couleur, n]) => `${couleurLabel(couleur)} ${camp.mana[couleur] ?? 0} sur ${n}`).join(', ')}`}
    >
      <span className="rpg-flux-track__bar">
        <b className="rpg-flux-track__reserve" aria-hidden="true">{disponible}<span>/</span>{maximum}</b>
        <span className="rpg-flux-track__slots" aria-hidden="true">
          {slots.map(({ index, couleur, etat, apercuCout, deficitCout }) => (
            <i
              key={index}
              className={`rpg-flux-track__slot${couleur ? ` rpg-flux-track__slot--${couleur}` : ''} ${etat === 'vide' ? 'is-empty' : etat === 'disponible' ? 'is-lit' : 'is-spent'}${apercuCout ? ' is-cost-preview' : ''}${deficitCout ? ' is-deficit-preview' : ''}`}
              data-mana-slot={index + 1}
              data-mana-etat={etat}
              data-mana-preview={apercuCout ? 'true' : undefined}
              data-mana-deficit={deficitCout ? 'true' : undefined}
              title={couleur ? `${couleurLabel(couleur)} — ${apercuCout ? 'sera dépensé pour cette carte' : deficitCout ? 'mana manquant pour cette carte' : etat === 'disponible' ? 'disponible' : 'dépensé'}` : `Mana ${index + 1} non acquis${deficitCout ? ' (requis pour cette carte)' : ''}`}
            >{couleur ? <ElementEmblem element={couleur} /> : '◇'}</i>
          ))}
        </span>
      </span>
    </div>
  );
}

/** Les cinq emplacements de créatures du mode sans terrains, dessinés sous
 * la rangée de chaque camp : une case par créature jouable, pleine quand elle
 * est occupée, en pointillés quand elle attend encore sa créature.
 *
 * Quand une pose attend sa case (`choixEmplacement`, côté joueur), les cases
 * libres deviennent de vrais boutons : clic, doigt ou clavier (touches 1 à 5)
 * posent la créature en attente sur la case choisie. Une case occupée ne se
 * désigne jamais : échanger une créature contre une autre passe par le
 * sacrifice du plateau plein (`sacrificeEnCours`), pas par ici. */
export function CreatureSlots({ camp, cote, choixEmplacement = false, nomCartePose = null, onChoisirEmplacement = null, emplacementSurvole = null }) {
  // Chaque créature garde sa case : une case vidée par une mort reste vide
  // au milieu de la rangée, les autres ne glissent pas pour la combler.
  const cases = rpgEmplacementsChamp(camp);
  const occupees = cases.filter(Boolean).length;
  return (
    <div
      className={`rpg-creature-slots rpg-creature-slots--${cote}${choixEmplacement ? ' is-choix-ouvert' : ''}`}
      data-creature-slots={RPG_MANA_ESSAI_CHAMP_MAX}
      data-creature-slots-occupes={occupees}
      data-choix-emplacement={choixEmplacement ? 'true' : undefined}
      aria-label={`Emplacements de créatures ${cote === 'joueur' ? 'de votre camp' : 'du sorcier'} : ${occupees} sur ${RPG_MANA_ESSAI_CHAMP_MAX} occupés`}
      aria-hidden="false"
    >
      {cases.map((occupant, index) => {
        const classes = `rpg-creature-slot${occupant ? ' is-occupied' : ' is-empty'}${emplacementSurvole === index ? ' is-survole' : ''}`;
        if (choixEmplacement && !occupant && onChoisirEmplacement) {
          return (
            <button
              type="button"
              key={index}
              className={`${classes} rpg-creature-slot--choix`}
              data-creature-slot={index + 1}
              data-creature-slot-occupe="false"
              data-creature-slot-choix="true"
              onClick={() => onChoisirEmplacement(index)}
              aria-label={`Poser ${nomCartePose ?? 'la créature choisie'} sur l’emplacement ${index + 1}`}
            >
              <span className="rpg-creature-slot__numero">{index + 1}</span>
            </button>
          );
        }
        return (
          <span
            key={index}
            className={classes}
            data-creature-slot={index + 1}
            data-creature-slot-occupe={occupant ? 'true' : 'false'}
            aria-hidden="true"
          >
            <span className="rpg-creature-slot__numero">{index + 1}</span>
          </span>
        );
      })}
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

function desktopAccountName(user) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [metadata.gamertag, metadata.fullName, metadata.full_name, metadata.display_name, user?.email];
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || 'Joueur';
}

function CardElementBadge({ carte }) {
  if (!carte?.element || carte.kind === 'terrain') return null;
  // Comme le disque de coût : les couleurs affichées sont celles du coût de la
  // carte, dans le même ordre que les bandes de son cadre.
  const colors = cardCostColors(carte);
  const hybrid = colors.length > 1 || colors[0] === 'hybride';
  const teinte = colors[0] ?? carte.element;
  return (
    <span
      className={`rpg-card-element-badge rpg-card-element-badge--${hybrid ? 'hybride' : teinte}`}
      aria-hidden="true"
    >
      {hybrid
        ? colors.map((couleur) => (
          <i key={couleur} className={`rpg-card-element-badge__pip rpg-card-element-badge__pip--${couleur}`}>
            {ELEMENT_GLYPHS[couleur] ?? '◇'}
          </i>
        ))
        : ELEMENT_GLYPHS[teinte] ?? '◇'}
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

/**
 * Les trois portes dessinées du menu Jouer (duel en ligne, partie rapide,
 * tutoriel). Un trait plutôt qu'un glyphe : `⚔`, `⚑` et `⌛` tombent en carré
 * vide sur les systèmes sans police d'émoji, et se colorent chacun à leur façon
 * — ici, l'icône prend la couleur du texte du bouton, comme les autres traits
 * du jeu (`CombatActionIcon`).
 */
function IconePorte({ nom }) {
  const trace = nom === 'en-ligne' ? (
    <>
      {/* Le fanion du défi, planté dans le sable. */}
      <path d="M6.5 21V3.5" />
      <path d="M6.5 4.5h11.5l-3 4.5 3 4.5H6.5" />
    </>
  ) : nom === 'partie-rapide' ? (
    <>
      {/* L'éclair : la partie démarre tout de suite. */}
      <path d="M13.5 3 5 13.5h5.5L10 21l8.5-10.5H13l.5-7.5Z" />
    </>
  ) : (
    <>
      <path d="M7.5 3h9M7.5 21h9" />
      <path d="M9 3v3.4c0 1.5 3 2.7 3 5.6s-3 4.1-3 5.6V21M15 3v3.4c0 1.5-3 2.7-3 5.6s3 4.1 3 5.6V21" />
    </>
  );
  return (
    <span className="rpg-menu-button__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">{trace}</svg>
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
  if (carte?.kind === 'site') return 'Site';
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
  if (carte?.kind === 'site') return 'site';
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

/** L'état Furie porté par une face de créature posée, lu sur son hôte DOM :
 *  la table écrit `data-furie-*` sur la carte, comme elle écrit déjà ses
 *  armes (`data-armes`). Les aperçus ouverts par un geste générique — appui
 *  long, clic droit — n'ont pas l'entité sous la main : ils lisent donc la
 *  même étiquette, avec les statistiques du moment, pour montrer la peinture
 *  que la créature porte réellement. Hors Furie déclenchée : `null`. */
function etatFurieDepuisHote(hote) {
  if (hote?.dataset?.furieDeclenchee !== 'true') return null;
  const atk = Number(hote.dataset.furieAtk);
  const def = Number(hote.dataset.furieDef);
  return {
    atk: Number.isFinite(atk) ? atk : null,
    def: Number.isFinite(def) ? def : null,
  };
}

/** Les effets déjà dépensés d'une créature posée (Tenacité, Bouclier), lus
 *  sur la même étiquette DOM que sa Furie pour traverser survol, appui long
 *  et clic droit. Hors de la table, l'étiquette est absente : rien n'est grisé. */
function effetsEpuisesDepuisHote(hote) {
  return String(hote?.dataset?.effetsEpuises ?? '')
    .split(/\s+/)
    .filter((cle) => cle === 'tenacite' || cle === 'bouclier');
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
  if (donne.bouclier) effets.push(`Bouclier ${donne.bouclier}`);
  if (donne.coupRapide) effets.push('Coup rapide');
  if (donne.esquive) effets.push('Esquive');
  if (donne.immunite) effets.push(`Immunité contre ${ELEMENT_LABELS[donne.immunite] ?? donne.immunite}`);
  if (donne.furie) effets.push(`Furie ${donne.furie}`);
  if (donne.bouclier) effets.push(`Bouclier ${donne.bouclier}`);
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

/**
 * La portée de la désignation EN COURS, attentes du moteur comprises.
 *
 * `targetMode` lit la carte : une arme s'attache à un allié, un sort de dégâts
 * vise l'adversaire. Mais la carte n'est pas toujours ce qu'on est en train de
 * désigner : le **Grappin d'abordage**, une fois ACCROCHÉ, ouvre une attente de
 * prise en cale (`duel.arriveeEnAttente.abordage`) alors que le porteur est
 * déjà choisi. La carte source reste une arme — la relire comme un
 * attachement rallumait les alliés et redemandait « une créature alliée à
 * équiper » : le clic sur la créature adverse visée était refusé, la prise
 * impossible à résoudre. C'est l'attente qui donne la portée, pas la fiche.
 *
 * Le site de Bimini et le Défi du Jarl gardent la leur : leurs deux temps
 * (la case, puis la créature ; le champion, puis l'adversaire) restent décrits
 * ici, à côté de `targetMode`.
 */
export function porteeCibleEnCours({
  carte = null,
  attenteAbordage = false,
  attenteSiteBimini = false,
  cibleAllieeMagie = null,
} = {}) {
  if (attenteSiteBimini) return 'allie';
  // Le Grappin accroché : la cale attend une proie ADVERSE. Seule une arme qui
  // MORD (`abordage` fixe ou dynamique) ouvre ce second temps ; les autres
  // gardent leur porteur allié même si une attente traîne encore.
  const armeQuiMord = carteEstArme(carte)
    && (Number.isFinite(carte?.abordage) || Boolean(carte?.abordageDynamique));
  if (attenteAbordage && armeQuiMord) return 'ennemi';
  if (carte?.effet?.type === 'combat' && carte?.effet?.sourceCible === 'creature-amie') {
    return cibleAllieeMagie ? 'ennemi' : 'allie';
  }
  return targetMode(carte);
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

/** Rapidité : un arc électrique bleu court **sur le bord** de la carte.
 *  Le trait est un rectangle déformé par une turbulence dont la graine change
 *  par à-coups — l'arc ne se fige jamais. Deux passes : un halo bleu épais
 *  et flou, puis un cœur clair et fin. Le calque déborde de la face : il
 *  reprend l'épaisseur du cadre et l'arrondi de la carte (mesurés une fois)
 *  pour que l'arc suive exactement le bord extérieur. Le mouvement réduit
 *  garde l'arc, fixe. */
function ElectriciteRapidite() {
  const id = useId().replace(/:/g, '');
  const calqueRef = useRef(null);
  const [mouvementReduit] = useState(() => (
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  ));
  useLayoutEffect(() => {
    const calque = calqueRef.current;
    const carte = calque?.parentElement;
    if (!carte || typeof window === 'undefined') return;
    const style = window.getComputedStyle(carte);
    calque.style.setProperty('--rpg-elec-bord', style.borderTopWidth || '0px');
    calque.style.setProperty('--rpg-elec-rayon', style.borderTopLeftRadius || '8px');
  }, []);
  // Le hasard est tiré une fois par carte : graines, rythme, amplitude et
  // finesse de l'arc diffèrent d'une créature à l'autre, et les cycles de
  // durées sans commune mesure ne se recalent jamais — l'arc ne se répète pas.
  const [hasard] = useState(() => tirerHasardElectricite());
  const filtre = (suffixe, reglages, flou = 0) => (
    <filter id={`${id}-${suffixe}`} x="-8%" y="-8%" width="116%" height="116%">
      {/* `fractalNoise` oscille autour de 0,5 : l'arc tremble de part et d'autre
          du bord sans glisser d'un côté (la `turbulence` décalait tout vers
          le haut et la gauche). */}
      <feTurbulence type="fractalNoise" baseFrequency={reglages.frequences[0]} numOctaves="2" seed={reglages.graines[0]} result="bruit">
        {!mouvementReduit && (
          <>
            <animate attributeName="seed" values={reglages.graines.join(';')} keyTimes={reglages.instants.join(';')}
              dur={`${reglages.duree}s`} repeatCount="indefinite" calcMode="discrete" />
            <animate attributeName="baseFrequency" values={reglages.frequences.join(';')}
              dur={`${reglages.dureeFrequence}s`} repeatCount="indefinite" calcMode="discrete" />
          </>
        )}
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="bruit" scale={reglages.amplitudes[0]} xChannelSelector="R" yChannelSelector="G">
        {!mouvementReduit && (
          <animate attributeName="scale" values={reglages.amplitudes.join(';')}
            dur={`${reglages.dureeAmplitude}s`} repeatCount="indefinite" calcMode="discrete" />
        )}
      </feDisplacementMap>
      {flou > 0 && <feGaussianBlur stdDeviation={flou} />}
    </filter>
  );
  return (
    <span
      ref={calqueRef}
      className="rpg-card__electricite"
      aria-hidden="true"
      style={{
        '--rpg-elec-vacille-duree': `${hasard.vacille.duree}s`,
        '--rpg-elec-vacille-delai': `${hasard.vacille.delai}s`,
      }}
    >
      <svg focusable="false">
        <defs>
          {filtre('halo', hasard.halo, 1)}
          {filtre('coeur', hasard.coeur)}
          {filtre('eclat', hasard.eclat)}
        </defs>
        <rect className="rpg-card__electricite-halo" filter={`url(#${id}-halo)`} />
        <rect className="rpg-card__electricite-coeur" filter={`url(#${id}-coeur)`} />
        {/* L'éclat : un second fil qui ne s'allume que par moments, au hasard. */}
        <rect className="rpg-card__electricite-coeur rpg-card__electricite-coeur--second" filter={`url(#${id}-eclat)`}>
          {!mouvementReduit && (
            <animate attributeName="opacity" values={hasard.eclats.join(';')}
              dur={`${hasard.dureeEclats}s`} repeatCount="indefinite" calcMode="discrete" />
          )}
        </rect>
      </svg>
    </span>
  );
}

/** Le tirage d'une électricité : tout ce qui rend l'arc imprévisible. */
function tirerHasardElectricite(aleatoire = Math.random) {
  const entre = (min, max) => min + aleatoire() * (max - min);
  const arrondi = (valeur, decimales = 3) => Number(valeur.toFixed(decimales));
  const suite = (n, tirer) => Array.from({ length: n }, tirer);
  // Instants irréguliers (0 au départ, croissants, < 1) : le rythme saccade.
  const instants = (n) => {
    const pas = suite(n, () => entre(.4, 1.6));
    const total = pas.reduce((somme, valeur) => somme + valeur, 0);
    let cumul = 0;
    return pas.map((valeur) => {
      const instant = cumul / total;
      cumul += valeur;
      return arrondi(instant, 4);
    });
  };
  const reglages = ({ frequence, amplitude }) => {
    const n = 14 + Math.floor(aleatoire() * 8);
    return {
      graines: suite(n, () => 1 + Math.floor(aleatoire() * 997)),
      instants: instants(n),
      duree: arrondi(entre(1.1, 2.3), 2),
      frequences: suite(5, () => arrondi(entre(frequence * .7, frequence * 1.4), 4)),
      dureeFrequence: arrondi(entre(1.7, 3.9), 2),
      amplitudes: suite(7, () => arrondi(entre(amplitude * .55, amplitude * 1.35), 1)),
      dureeAmplitude: arrondi(entre(1.3, 3.1), 2),
    };
  };
  return {
    halo: reglages({ frequence: .06, amplitude: 9 }),
    coeur: reglages({ frequence: .08, amplitude: 8 }),
    eclat: reglages({ frequence: .1, amplitude: 11 }),
    // L'éclat reste éteint la plupart du temps et s'allume par à-coups.
    eclats: suite(12, () => (aleatoire() < .3 ? arrondi(entre(.5, 1), 2) : 0)),
    dureeEclats: arrondi(entre(1.6, 3.4), 2),
    vacille: { duree: arrondi(entre(.9, 1.9), 2), delai: arrondi(-entre(0, 2), 2) },
  };
}

/** L'aura de sonar : trois ondes concentriques partent du cœur de la face et
 *  s'élargissent au-delà du cadre en s'effaçant, sur un liseré qui reste
 *  allumé. `variante` ne change que la teinte — bleue pour la résonance,
 *  jaune pour les cartes qui impriment une aura (la forge des Samouraïs, les
 *  Ksour, le héros du sable). Le calque est purement décoratif
 *  (`aria-hidden`) : l'effet est déjà annoncé par l'icône et par la
 *  description lue de la carte. Les ondes sont décalées d'un tiers de cycle
 *  pour qu'une nouvelle vague parte toujours avant que la précédente ne
 *  s'éteigne. */
function AuraOndes({ variante = 'resonance', phase = 0 }) {
  return (
    <span
      className={`rpg-card__resonance${variante === 'aura' ? ' rpg-card__resonance--aura' : ''}`}
      style={{ '--rpg-resonance-phase': `${(-phase).toFixed(2)}s` }}
      aria-hidden="true"
    >
      {[1, 2, 3].map((onde) => (
        <i key={onde} className={`rpg-card__resonance-onde rpg-card__resonance-onde--${onde}`} />
      ))}
    </span>
  );
}

/** La vignette rouge de la Furie déclenchée : un voile écarlate qui serre
 *  les bords de la face et pulse doucement, comme un pouls de rage. Même
 *  calque sur la carte posée et dans sa preview — le changement de visuel
 *  se reconnaît des deux côtés. Purement décoratif (`aria-hidden`) : l'état
 *  est annoncé par l'icône Furie, la ligne « Furie déclenchée » de l'aperçu
 *  et les descriptions lues des cartes. */
function VignetteFurie() {
  return <span className="rpg-furie-vignette" aria-hidden="true" />;
}

/* ── Bouclier : l'égide qui veille, puis le choc qu'elle encaisse ──────────
   Tant qu'un bouclier est en place, la face est cerclée d'une égide glacée :
   un liseré lumineux, un reflet qui balaie l'illustration et un écu à peine
   dessiné en son cœur. Quand un coup l'entame, un second calque rejoue le
   choc — flash, anneaux, écu qui se tend puis se fissure, éclats qui
   s'arrachent — même si le bouclier vient de tomber à zéro : c'est
   précisément ce moment-là qu'il faut voir. Tout est décoratif
   (`aria-hidden`) : la valeur du bouclier vit dans son icône et dans la
   description lue de la carte. */
const DUREE_IMPACT_BOUCLIER = 850;
const ECLATS_BOUCLIER = Object.freeze([
  { dx: -52, dy: -42, r: -42, d: 30 },
  { dx: 48, dy: -56, r: 36, d: 70 },
  { dx: -62, dy: 18, r: 58, d: 105 },
  { dx: 60, dy: 28, r: -64, d: 45 },
  { dx: -30, dy: 58, r: 24, d: 125 },
  { dx: 34, dy: 62, r: -28, d: 90 },
]);

/** L'écu dessiné au cœur de l'égide — le même tracé veille et encaisse. */
function EcuBouclier({ fissure = false }) {
  return (
    <svg className="rpg-bouclier__ecu" viewBox="0 0 48 56" focusable="false" aria-hidden="true">
      <path className="rpg-bouclier__ecu-corps" d="M24 3 42 9v16c0 12-7.5 21.5-18 28C13.5 46.5 6 37 6 25V9Z" />
      <path className="rpg-bouclier__ecu-ligne" d="M24 9l12 4v12c0 8.5-5 15.5-12 21-7-5.5-12-12.5-12-21V13Z" />
      <path className="rpg-bouclier__ecu-rune" d="M24 16v18M16 25h16" />
      {fissure && (
        <>
          <path className="rpg-bouclier__ecu-fissure" d="M25 7l-4 10 6 5-5 9 4 7-3 10" />
          <path className="rpg-bouclier__ecu-fissure" d="M21 17l-8 5M27 22l8 4M22 31l-7 7" />
        </>
      )}
    </svg>
  );
}

/** Le bouclier en place : il se forme en entrant, puis veille en pulsant. */
function EgideBouclier({ montant = 0, lumiere = false }) {
  return (
    <span
      className={`rpg-bouclier-egide${lumiere ? ' rpg-bouclier-egide--lumiere' : ''}`}
      data-bouclier={lumiere ? 'lumiere' : montant}
      aria-hidden="true"
    >
      <span className="rpg-bouclier-egide__reflet" />
      <EcuBouclier />
    </span>
  );
}

/** Le choc d'un bouclier qui vient d'absorber : il survit à sa propre chute
 *  le temps de l'animation, porté par l'état éphémère de la page. */
function ImpactBouclier({ montant = 0, restant = 0, lumiere = false }) {
  const brise = lumiere || restant <= 0;
  return (
    <span
      className={`rpg-bouclier-impact${lumiere ? ' rpg-bouclier-impact--lumiere' : ''}${brise ? ' is-brise' : ''}`}
      data-bouclier-absorbe={montant || undefined}
      data-bouclier-restant={restant}
      data-bouclier-lumiere={lumiere ? 'true' : undefined}
      aria-hidden="true"
    >
      <span className="rpg-bouclier-impact__flash" />
      <span className="rpg-bouclier-impact__anneau rpg-bouclier-impact__anneau--a" />
      <span className="rpg-bouclier-impact__anneau rpg-bouclier-impact__anneau--b" />
      <EcuBouclier fissure={brise} />
      {ECLATS_BOUCLIER.map((eclat) => (
        <i
          key={`${eclat.dx}-${eclat.dy}`}
          className="rpg-bouclier-impact__eclat"
          style={{
            '--dx': `${eclat.dx}px`,
            '--dy': `${eclat.dy}px`,
            '--r': `${eclat.r}deg`,
            '--d': `${eclat.d}ms`,
          }}
        />
      ))}
    </span>
  );
}

/** L'empreinte stable d'une entité : même identifiant, même phase — jamais un
 *  tirage au rendu. Elle désynchronise les auras et les vols des voisines. */
function empreinteEntite(entite) {
  const cle = String(entite?.id ?? '');
  let empreinte = 0;
  for (let index = 0; index < cle.length; index += 1) {
    empreinte = (empreinte * 31 + cle.charCodeAt(index)) % 9973;
  }
  return empreinte;
}

/** Le décalage d'une aura de sonar, dans son cycle de 3,6 s : deux créatures
 *  auréolées ne battent jamais exactement à l'unisson. */
function phaseAura(entite) {
  return (empreinteEntite(entite) % 360) / 100;
}

/* ── Vol : la créature avec Envol lévite au-dessus de la table ───────────────
   La lévitation est une animation CSS (`rpg-envol-levite`, voir
   `rpg-battle.css`) sur les trois propriétés de transformation indépendantes
   de `transform` : `translate`, `rotate`, `scale`. Elle n'est PAS jouée par
   Web Animations : une animation d'API passe devant TOUTES les animations CSS
   du même élément — elle masquait l'arrivée en jeu (`fx-enter`), le bond
   d'attaque (`fx-lunge`) et le choc de blocage (`fx-block`), qui animent
   justement `translate` et `scale`. En CSS, ces cinématiques sont déclarées
   plus bas dans la feuille : elles remplacent la lévitation le temps de leur
   geste, puis celle-ci reprend — de son point de départ, qui est aussi sa
   position de repos, donc sans saut.

   Chaque créature reçoit sa propre durée (4,8 → 5,5 s, tirée de
   l'identifiant de l'entité) : deux voisines ne montent jamais à l'unisson,
   et elles se décalent d'elles-mêmes au fil du temps. */

/** La phase d'une créature avec Envol (0 → 1), tirée de son identifiant. */
const phaseVol = (entite) => (empreinteEntite(entite) % 1000) / 1000;

/** La durée de la lévitation d'une créature, en secondes : jamais la même
 *  d'une carte à l'autre, pour qu'aucune rangée ne batte à l'unisson. */
const dureeVol = (entite) => (4.8 + phaseVol(entite) * 0.7).toFixed(2);

/** La durée du souffle qui traverse la face, en secondes — la feuille la répète
 *  dans son `animation` : les deux valeurs vont ensemble. */
const SOUFFLE_ENVOL_DUREE = 5.4;

/* ── Soins : l'éclat d'un gain de vie ─────────────────────────────────────── */
// Motes de lumière fixes (position, départ, taille, dérive) : le même éclat à
// chaque soin, sans hasard au rendu. Trois sont de petites croix — le signe du
// soin —, les autres des perles de lumière.
const MOTES_SOIN = [
  { x: 14, d: 0, t: 7, dx: -5, croix: true },
  { x: 27, d: 170, t: 4, dx: 4 },
  { x: 40, d: 80, t: 5, dx: -3 },
  { x: 53, d: 250, t: 8, dx: 5, croix: true },
  { x: 66, d: 120, t: 4, dx: -4 },
  { x: 78, d: 310, t: 5, dx: 3 },
  { x: 89, d: 40, t: 7, dx: -2, croix: true },
];

/**
 * L'éclat d'un soin, posé par-dessus une plaque de sorcier ou une créature :
 * halo vert, voile de lumière qui remonte, motes qui s'élèvent et, sur une
 * créature, le « +N » regagné. Purement décoratif (`aria-hidden`) : la phrase
 * lue aux lecteurs d'écran vit dans la zone d'état de la table. L'appelant
 * passe `key={soin.token}` : chaque nouveau soin rejoue l'éclat depuis le début.
 */
/** Variante d'un soin : `a`/`b` alternent d'un soin à l'autre, pour que le
 *  battement du chiffre (une animation CSS) reparte même sur une cible déjà
 *  en train de briller — le même principe que la secousse de l'écran. */
const varianteSoin = (soin) => (soin.token % 2 ? 'a' : 'b');
/** Les classes d'une plaque de sorcier qui regagne des PV. */
const classeSoinPlaque = (soin) => (soin ? ` is-healing is-healing--${varianteSoin(soin)}` : '');

function EclatSoin({ montant = null, surCarte = false }) {
  return (
    <span className={`rpg-soin ${surCarte ? 'rpg-soin--carte' : 'rpg-soin--plaque'}`} aria-hidden="true">
      <span className="rpg-soin__halo" />
      <span className="rpg-soin__voile" />
      {MOTES_SOIN.map((mote) => (
        <span
          key={mote.x}
          className={`rpg-soin__mote${mote.croix ? ' rpg-soin__mote--croix' : ''}`}
          style={{ '--x': `${mote.x}%`, '--d': `${mote.d}ms`, '--t': `${mote.t}px`, '--dx': `${mote.dx}px` }}
        />
      ))}
      {montant != null && <span className="rpg-soin__montant">+{montant}</span>}
    </span>
  );
}

/**
 * Le tourbillon d'eau d'un renvoi en main.
 *
 * Une magie ou un effet renvoie une créature dans la main de son propriétaire :
 * la carte quitte la table, mais pas sans adieu. À sa place s'enroule une
 * spirale d'eau qui monte et se dissout, deux ondes s'élargissent autour d'elle
 * et quelques gouttes s'arrachent au courant. Le calque est décoratif, posé sur
 * l'emplacement qu'occupait la carte (mesuré avant l'action) et il en garde
 * l'inclinaison de combat. Il s'efface de lui-même à la dernière image ; la
 * minuterie du parent n'est qu'un filet.
 */
// La roue de feu dure juste assez pour que la conséquence attende : une carte
// brûlée à mort ne s'en va qu'après elle.
const DUREE_ROUE_FEU = 900;

// La foudre du marteau : l'impact, puis les arcs qui s'éteignent.
const DUREE_ECLAIR_MARTEAU = 950;

const GOUTTES_TOURBILLON = Object.freeze([
  { dx: -46, dy: -34, d: 0 },
  { dx: 42, dy: -52, d: 90 },
  { dx: -24, dy: -74, d: 170 },
  { dx: 30, dy: -96, d: 250 },
  { dx: 6, dy: -120, d: 330 },
]);

export function TourbillonEau({ effet, onTermine = null }) {
  return (
    <div
      className="rpg-tourbillon-eau"
      data-rpg-bounce-id={effet.entityId}
      data-rpg-bounce-fx="eau"
      aria-hidden="true"
      style={{
        left: `${effet.left}px`,
        top: `${effet.top}px`,
        width: `${effet.width}px`,
        height: `${effet.height}px`,
        '--rpg-fx-rotation': `${effet.angle ?? 0}rad`,
      }}
      // Comme l'adieu d'une carte détruite : on ignore les animations des
      // enfants, qui se terminent avant le calque.
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget || event.pseudoElement) return;
        onTermine?.(effet.effectId);
      }}
    >
      {/* La carte elle-même, encore à sa place : l'eau l'enveloppe, la
          soulève et la dissout — puis elle reparaîtra dans la main. */}
      {effet.cardId && (
        <span
          className={`rpg-tourbillon-eau__carte ${cardFrameClass(cardById(effet.cardId))} ${cardMotifClass(cardById(effet.cardId))}`}
          style={cardFrameStyle(cardById(effet.cardId))}
        >
          <img src={cardArt(effet.cardId)} alt="" />
        </span>
      )}
      <i className="rpg-tourbillon-eau__nappe" />
      <i className="rpg-tourbillon-eau__spirale" />
      <i className="rpg-tourbillon-eau__anneau rpg-tourbillon-eau__anneau--un" />
      <i className="rpg-tourbillon-eau__anneau rpg-tourbillon-eau__anneau--deux" />
      {GOUTTES_TOURBILLON.map((goutte) => (
        <i
          key={goutte.d}
          className="rpg-tourbillon-eau__goutte"
          style={{ '--dx': `${goutte.dx}px`, '--dy': `${goutte.dy}px`, '--d': `${goutte.d}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Cercle magique d'un sacrifice : une créature rendue au sable.
 *
 * Quand le plateau est plein et qu'une créature est sacrifiée pour faire
 * place à la nouvelle, un cercle de runes s'allume à son emplacement :
 * halo qui pulse, anneaux qui tournent en sens contraires, glyphes qui
 * apparaissent et étincelles qui montent. Le calque reprend la place et
 * l'inclinaison de la créature sacrifiée, ne capte aucun geste et ne
 * recalcule aucune mise en page. Il vit le temps de la déchirure
 * (piloté par le timer de `sacrificeFx`) puis s'efface avant que la
 * nouvelle créature ne soit posée.
 */
export function CercleMagique({ effet, onTermine = null }) {
  return (
    <div
      className="rpg-cercle-magique"
      data-rpg-sacrifice-id={effet.entityId}
      aria-hidden="true"
      style={{
        left: `${effet.left}px`,
        top: `${effet.top}px`,
        width: `${effet.width}px`,
        height: `${effet.height}px`,
        '--rpg-fx-rotation': `${effet.angle ?? 0}rad`,
      }}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget || event.pseudoElement) return;
        onTermine?.(effet.effectId);
      }}
    >
      {/* Halo central qui pulse. */}
      <span className="rpg-cercle-magique__soleil" />
      {/* Anneaux de runes qui tournent en sens contraires. */}
      <span className="rpg-cercle-magique__anneau rpg-cercle-magique__anneau--externe" />
      <span className="rpg-cercle-magique__anneau rpg-cercle-magique__anneau--interne" />
      {/* Glyphes disposés sur le cercle, chacun à son angle et son retard. */}
      <span className="rpg-cercle-magique__glyphe" style={{ '--r': '0deg', '--d': '120ms' }} />
      <span className="rpg-cercle-magique__glyphe" style={{ '--r': '72deg', '--d': '240ms' }} />
      <span className="rpg-cercle-magique__glyphe" style={{ '--r': '144deg', '--d': '360ms' }} />
      <span className="rpg-cercle-magique__glyphe" style={{ '--r': '216deg', '--d': '480ms' }} />
      <span className="rpg-cercle-magique__glyphe" style={{ '--r': '288deg', '--d': '600ms' }} />
      {/* Étincelles qui s'élèvent du cercle. */}
      { [0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="rpg-cercle-magique__etincelle"
          style={{
            '--i': i,
            '--d': `${700 + i * 110}ms`,
            '--tx': `${(i % 2 === 0 ? -1 : 1) * (14 + i * 6)}px`,
            '--ty': `-${26 + i * 10}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * La roue de feu d'une créature brûlée par la Braise.
 *
 * Une magie, une sorcellerie ou l'effet d'une créature de Braise vient de
 * mordre : autour de la carte s'allument deux cercles de flammes qui tournent
 * en sens contraires, et quelques braises montent. Comme le tourbillon d'eau,
 * le calque se pose sur l'emplacement mesuré avant l'action — mais la roue
 * joue **avant** la conséquence : une créature qui meurt de ce coup ne s'en va
 * qu'une fois la roue refermée, et sa carte reste visible dans le feu jusque-là.
 * Rien n'est intercepté, rien ne bouge dans la mise en page.
 */
/**
 * Les langues de la roue : leur place autour de la face (unités de la carte,
 * x de 0 à 100 de gauche à droite, y de 0 en haut à 100 en bas), leur taille
 * et leur retard de battement. Le feu monte : les langues du bas sont les plus
 * hautes, celles des flancs lèchent les bords, celles du haut dépassent le
 * cadre. Les retards sont premiers entre eux, pour que deux langues voisines
 * ne battent jamais ensemble.
 */
const LANGUES_ROUE_FEU = Object.freeze([
  // Le bas : le foyer, les flammes les plus hautes.
  { x: 8, y: 101, s: 1.05, d: 40, r: -7 },
  { x: 22, y: 102, s: 1.32, d: 0, r: 4 },
  { x: 37, y: 101, s: 1.15, d: 110, r: -3 },
  { x: 50, y: 103, s: 1.5, d: 60, r: 2 },
  { x: 63, y: 101, s: 1.18, d: 20, r: 6 },
  { x: 77, y: 102, s: 1.36, d: 150, r: -5 },
  { x: 91, y: 101, s: 1.02, d: 90, r: 3 },
  // Les flancs : elles montent le long du cadre, penchées vers l'intérieur.
  { x: 1, y: 88, s: 0.92, d: 70, r: 12 },
  { x: 0, y: 68, s: 1.02, d: 170, r: 9 },
  { x: 1, y: 48, s: 0.84, d: 30, r: 14 },
  { x: 99, y: 88, s: 0.92, d: 120, r: -12 },
  { x: 100, y: 68, s: 1.02, d: 10, r: -9 },
  { x: 99, y: 48, s: 0.84, d: 160, r: -14 },
  // Le haut : de petites langues qui lèchent le cadre.
  { x: 14, y: 3, s: 0.68, d: 50, r: -8 },
  { x: 34, y: 1, s: 0.78, d: 130, r: 5 },
  { x: 50, y: 0, s: 0.88, d: 20, r: -2 },
  { x: 66, y: 1, s: 0.76, d: 100, r: 7 },
  { x: 86, y: 3, s: 0.66, d: 170, r: -6 },
]);

/**
 * Le tracé d'une langue : une base large, une taille qui s'amincit, une pointe
 * qui se recourbe et une encoche sur le flanc — deux langues qui se touchent,
 * comme une flamme qui se dédouble. C'est ce tracé qui donne au feu son dessin
 * net : le dégradé conique de l'ancienne roue ne montrait aucune flamme.
 */
const CHEMIN_LANGUE = 'M0 0C-4.6-1.4-7.2-5.4-6.6-9.8C-6.1-13.4-3.4-15.2-2.6-19.2C-1.4-17-0.2-16.4.6-14.4C2.4-17.4 3.2-20.4 2.4-23.4C5.6-19.4 7-14.2 6-9C5.2-4 3-.8 0 0Z';

/** Les trois couches d'une langue : la braise rouge qui éclaire, la flamme
 *  orange qui se voit, le cœur blanc qui brûle. Chacune bat à sa cadence. */
const COUCHES_FLAMME = Object.freeze([
  { nom: 'externe', dur: 620, retard: 0 },
  { nom: 'moyenne', dur: 480, retard: 45 },
  { nom: 'coeur', dur: 360, retard: 95 },
]);

const BRAISES_ROUE_FEU = Object.freeze([
  { dx: -44, dy: -70, d: 0, t: 1 },
  { dx: 26, dy: -96, d: 60, t: 0.7 },
  { dx: -12, dy: -118, d: 140, t: 1.15 },
  { dx: 47, dy: -140, d: 210, t: 0.85 },
  { dx: 3, dy: -164, d: 280, t: 1.25 },
  { dx: -34, dy: -146, d: 330, t: 0.6 },
  { dx: 62, dy: -104, d: 90, t: 0.75 },
  { dx: -60, dy: -104, d: 190, t: 0.9 },
  { dx: 16, dy: -186, d: 360, t: 0.65 },
]);

/**
 * La translation animée d’une carte, telle que son style calculé la donne :
 * `translate: 0 24px` quand elle entre en jeu (`fx-enter`), `0 -14px` quand
 * elle lévite (Envol). La boîte rendue par `getBoundingClientRect` l’inclut ;
 * l’adresse de la carte, elle, ne bouge pas — c’est cette adresse que la
 * chaîne doit viser.
 */
function translationsDeCarte(valeur) {
  if (!valeur || valeur === 'none') return { x: 0, y: 0 };
  const parts = String(valeur).trim().split(/\s+/);
  const enPixels = (texte) => {
    const nombre = Number.parseFloat(texte);
    return Number.isFinite(nombre) && !String(texte).includes('%') ? nombre : 0;
  };
  return { x: enPixels(parts[0]), y: parts.length > 1 ? enPixels(parts[1]) : 0 };
}

/**
 * Le vecteur de l’Abordage : du centre de la carte prise au centre de son
 * **capteur**, en coordonnées de table. Il se lit sur la table RÉELLE, pas
 * dans l’instantané d’avant l’action : le sorcier pose sa créature et prend
 * sa prise dans le même geste, si bien qu’au moment du calcul elle n’a pas
 * encore d’élément — la chaîne partait alors du centre de sa rangée, en
 * plein milieu de la table. `null` tant que le capteur n’est pas rendu (on
 * remesure à l’image suivante).
 */
export function vecteurVersCapteur({ table, capteurId, effet }) {
  if (!table || !capteurId || !effet) return null;
  const capteur = [...(table.querySelectorAll('[data-entity-id]') ?? [])]
    .find((carte) => carte.dataset.entityId === String(capteurId));
  if (!capteur) return null;
  const tableRect = table.getBoundingClientRect();
  const rect = capteur.getBoundingClientRect();
  const translation = translationsDeCarte(window.getComputedStyle?.(capteur)?.translate);
  const centreX = rect.left + rect.width / 2 - tableRect.left - translation.x;
  const centreY = rect.top + rect.height / 2 - tableRect.top - translation.y;
  return {
    dx: centreX - (effet.left + effet.width / 2),
    dy: centreY - (effet.top + effet.height / 2),
  };
}

/**
 * Le fantôme d’une carte qui quitte la table : sa dernière image s’efface sur
 * place — ou, **prise en cale** (Abordage), rejoint son capteur au bout de la
 * chaîne. `left`/`top` viennent de l’instantané : c’est la place qu’elle
 * occupait avant de disparaître. Le vecteur de la prise, lui, se **mesure
 * après le rendu** : le capteur que le sorcier vient de poser n’existait pas
 * encore quand l’action s’est résolue. L’instantané fournit une première
 * estimation (`effet.abordage`), corrigée dès la première image.
 */
export function FantomeCarteDetruite({ effet, tableRef, onTermine = null }) {
  const carteDetruite = cardById(effet.cardId);
  const [vecteur, setVecteur] = useState(effet.abordage ?? null);
  // Une prise est une prise, même sans vecteur encore mesuré : la carte
  // attend son capteur au lieu de s’effacer comme une morte.
  const prise = Boolean(effet.capteurId);
  useLayoutEffect(() => {
    if (!effet.capteurId) return undefined;
    const mesurer = () => {
      const mesure = vecteurVersCapteur({
        table: tableRef?.current,
        capteurId: effet.capteurId,
        effet,
      });
      if (!mesure) return false;
      // Même adresse que l'estimation ? Pas de rendu pour rien : la chaîne et
      // la carte sont déjà sur le bon cap.
      setVecteur((actuel) => (actuel
        && Math.abs(actuel.dx - mesure.dx) < 0.5
        && Math.abs(actuel.dy - mesure.dy) < 0.5
        ? actuel : mesure));
      return true;
    };
    if (mesurer()) return undefined;
    // Le capteur arrive avec le rendu de l’action (le sorcier pose et prend
    // dans le même geste). Quelques images d’attente, puis on garde
    // l’estimation de l’instantané : la carte est déjà en route.
    const raf = window.requestAnimationFrame ?? ((rappel) => window.setTimeout(rappel, 16));
    const annuler = window.cancelAnimationFrame ?? window.clearTimeout;
    let handle = null;
    let images = 0;
    const encore = () => {
      images += 1;
      if (mesurer() || images >= 12) return;
      handle = raf(encore);
    };
    handle = raf(encore);
    return () => {
      if (handle !== null) annuler?.call(window, handle);
    };
  }, [effet, tableRef]);
  return (
    <Fragment>
      {prise && vecteur && (
        <ChaineAbordage effet={{ ...effet, abordage: vecteur }} />
      )}
      <div
        className={`rpg-card-destruction-fx${prise ? ' is-abordage' : ''} ${cardFrameClass(carteDetruite)} ${cardMotifClass(carteDetruite)}${effet.bruleeParBraise ? ' is-burning' : ''}`}
        data-rpg-destroyed-id={effet.entityId}
        data-destruction-source={effet.bruleeParBraise ? 'braise' : undefined}
        aria-hidden="true"
        // L’adieu se retire de lui-même dès la dernière image de son
        // animation, sans dépendre d’une minuterie. On ignore les animations
        // des enfants (l’illustration qui brûle) et des pseudo-éléments, qui
        // se terminent avant la carte.
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget || event.pseudoElement) return;
          onTermine?.(effet.effectId);
        }}
        style={{
          ...cardFrameStyle(carteDetruite),
          left: `${effet.left}px`,
          top: `${effet.top}px`,
          width: `${effet.width}px`,
          height: `${effet.height}px`,
          '--rpg-fx-rotation': `${effet.angle}rad`,
          '--rpg-abordage-x': `${vecteur?.dx ?? 0}px`,
          '--rpg-abordage-y': `${vecteur?.dy ?? 0}px`,
        }}
      >
        <img src={cardArt(effet.cardId)} alt="" />
        <b>{effet.name}</b>
        {prise && <LiensAbordageCarte effet={effet} />}
      </div>
    </Fragment>
  );
}

/**
 * Une **torsade** d’acier : deux brins qui s’enroulent l’un autour de l’autre,
 * comme une corde. Les deux brins suivent la MÊME onde, en opposition de
 * phase : l’un bombe au-dessus de l’axe pendant que l’autre bombe en dessous,
 * et ils se croisent sur l’axe à chaque demi-longueur d’onde.
 *
 * Le dessus/dessous ne se devine pas : il se **peint**. Chaque demi-onde est
 * un segment continu de l’onde — prolongé d’un peu plus que le croisement,
 * pour que le brin qui passe devant recouvre réellement l’autre. Les segments
 * sont versés dans deux calques (`{ arriere, avant }`) qui alternent : au
 * premier croisement c’est le brin montant qui passe devant, au suivant c’est
 * le brin plongeant. La torsade tourne, elle ne reste pas plate.
 *
 * Coordonnées locales : l’axe de la chaîne est la ligne y = 28 ; `sag(x)` est
 * le **mou** — la chaîne pend sous son poids tant qu’elle n’est pas tendue.
 */
function brinsDeTorsade({ longueur, flottement, signeMou }) {
  // Trois à quatre enroulements selon la portée : lisible de loin, serré de
  // près. L’amplitude reste modeste — une chaîne, pas un ressort.
  const longueurOnde = Math.max(17, Math.min(30, longueur / 13));
  const amplitude = Math.max(4, Math.min(6.2, longueurOnde * 0.26));
  const demi = longueurOnde / 2;
  const debord = demi * 0.16;
  const sag = (x) => Math.sin(Math.PI * Math.min(1, Math.max(0, x / longueur))) * flottement * signeMou;
  // L’onde continue du brin : `phase` = 0 (monte d’abord) ou π (plonge).
  const onde = (x, phase) => Math.sin((2 * Math.PI * x) / longueurOnde + phase) * amplitude;
  const nombreDemiOndes = Math.max(4, Math.ceil(longueur / demi));
  const arriere = [];
  const avant = [];
  for (let index = 0; index < nombreDemiOndes; index += 1) {
    const x0 = index * demi;
    const x1 = x0 + demi;
    const a = Math.max(0, x0 - debord);
    const b = Math.min(longueur, x1 + debord);
    const mou = sag((x0 + x1) / 2);
    // Le tracé d’un brin sur ce demi-segment : l’onde échantillonnée fin, le
    // prolongement suit la même courbe — rien ne casse au croisement.
    const trace = (phase) => {
      const points = 10;
      let d = '';
      for (let i = 0; i <= points; i += 1) {
        const x = a + (b - a) * (i / points);
        const y = 28 + sag(x) + onde(x, phase);
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
      }
      return d.trim();
    };
    // Au croisement, l’un des deux brins passe devant : celui qui MONTE aux
    // croisements pairs, celui qui PLONGE aux impairs.
    const devantMonte = index % 2 === 0;
    arriere.push({ d: trace(devantMonte ? Math.PI : 0), mou });
    avant.push({ d: trace(devantMonte ? 0 : Math.PI), mou });
  }
  return { arriere, avant };
}

/**
 * Les liens qui entravent la carte prise : deux chaînes rivetées en croix sur
 * les deux diagonales. Elles restent invisibles pendant le vol du grappin, se
 * verrouillent sur la carte au contact (28 %–40 % de la course de 1400 ms,
 * calées sur `rpg-abordage-grappin`) puis l’accompagnent jusqu’au capteur. Le
 * SVG vit DANS la carte : il rétrécit et s’efface avec elle, sans calcul de
 * position. Chaque maillon est une ellipse d’acier peinte deux fois (creux
 * sombre, fil de lumière), comme la torsade de la chaîne de traction.
 */
export function LiensAbordageCarte({ effet }) {
  const gradientId = `rpg-abordage-eclair-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = Number(effet.width) || 1;
  const height = Number(effet.height) || 1;
  const diagonales = [
    { x1: 0, y1: 0, x2: width, y2: height, sens: 'descendante' },
    { x1: width, y1: 0, x2: 0, y2: height, sens: 'montante' },
  ];
  let totalMaillons = 0;
  const chapelets = diagonales.map((d, di) => {
    const longueur = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
    const angle = (Math.atan2(d.y2 - d.y1, d.x2 - d.x1) * 180) / Math.PI;
    // Un maillon tous les ~22 px, au moins quatre par diagonale.
    const nb = Math.max(4, Math.round(longueur / 22));
    totalMaillons += nb;
    const maillons = [];
    for (let k = 1; k <= nb; k += 1) {
      const t = k / (nb + 1);
      const cx = d.x1 + (d.x2 - d.x1) * t;
      const cy = d.y1 + (d.y2 - d.y1) * t;
      const central = Math.abs(t - 0.5) < 0.55 / nb;
      maillons.push(
        <g
          key={k}
          className="rpg-abordage-liens__chapelet"
          transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${angle.toFixed(2)})`}
          data-central={central ? 'true' : undefined}
        >
          <ellipse
            className="rpg-abordage-liens__anneau rpg-abordage-liens__anneau--creux"
            rx={central ? 7.6 : 6.3}
            ry={central ? 5 : 4}
          />
          <ellipse
            className="rpg-abordage-liens__anneau rpg-abordage-liens__anneau--fil"
            rx={central ? 7.6 : 6.3}
            ry={central ? 5 : 4}
          />
        </g>,
      );
    }
    return (
      <g key={di} className="rpg-abordage-liens__diagonale" data-diagonale={d.sens}>
        {maillons}
      </g>
    );
  });
  return (
    <svg
      className="rpg-abordage-liens"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      data-rpg-abordage-liens={totalMaillons}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4d6" stopOpacity=".95" />
          <stop offset="55%" stopColor="#ffb84d" stopOpacity=".45" />
          <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        className="rpg-abordage-liens__eclair"
        cx={width / 2}
        cy={height / 2}
        r={Math.min(width, height) * 0.3}
        fill={`url(#${gradientId})`}
      />
      <g className="rpg-abordage-liens__chaines">{chapelets}</g>
    </svg>
  );
}

/**
 * La chaîne de l’Abordage : une **chaîne tressée** de deux brins d’acier
 * enroulés, lancée depuis le capteur, un **grappin** à trois dents à son
 * extrémité. Elle part **détendue** — la torsade pend sur une courbe molle,
 * sous son poids — puis **revient tendue** : quand la prise est ramenée en
 * cale, chaque lobe remonte sur la ligne droite de la traction
 * (`--anneau-retour`).
 *
 * Chaque lobe est peint deux fois : le creux du brin (trait sombre, large)
 * puis le fil de lumière qui court au cœur de l’acier (trait clair, fin). Les
 * lobes alternent entre deux calques (`__arriere` / `__avant`) : c’est l’ordre
 * de peinture, et lui seul, qui donne le tressage.
 *
 * Le dévoilement (lancer puis retrait) reste porté par le `clip-path` du SVG ;
 * le grappin voyage le long de la chaîne, accroche, puis repart avec la prise.
 * Coordonnées locales : le capteur est à x = 0, la prise à x = longueur, la
 * ligne de traction à y = 28.
 */
export function ChaineAbordage({ effet }) {
  const dx = effet.abordage?.dx ?? 0;
  const dy = effet.abordage?.dy ?? 0;
  const longueur = Math.max(24, Math.hypot(dx, dy));
  const flottement = Math.min(24, longueur * 0.18);
  // Le mou pend **vers le bas** de l’écran : le signe dépend de l’orientation
  // de la chaîne (son axe local y pointe parfois vers le haut du monde).
  const signeMou = -dx >= 0 ? 1 : -1;
  const torsade = brinsDeTorsade({ longueur, flottement, signeMou });
  const lobeSvg = (lobe, index, calque) => (
    <g key={`${calque}-${index}`}>
      <path
        className={`rpg-abordage-chaine__brin rpg-abordage-chaine__brin--${calque}`}
        d={lobe.d}
        style={{ '--anneau-retour': `${-lobe.mou}px` }}
      />
      <path
        className={`rpg-abordage-chaine__fil rpg-abordage-chaine__fil--${calque}`}
        d={lobe.d}
        style={{ '--anneau-retour': `${-lobe.mou}px` }}
      />
    </g>
  );
  return (
    <svg
      className="rpg-abordage-chaine"
      aria-hidden="true"
      data-rpg-abordage-chaine="tressee"
      data-rpg-abordage-lobes={torsade.arriere.length + torsade.avant.length}
      style={{
        left: effet.left + effet.width / 2 + dx,
        top: effet.top + effet.height / 2 + dy,
        width: longueur,
        transform: `rotate(${Math.atan2(-dy, -dx)}rad)`,
        '--chaine-lon': `${longueur}px`,
        '--chaine-mou': `${flottement * signeMou}px`,
      }}
    >
      {/* 1. L’ombre portée de la torsade, sous l’acier. */}
      <g className="rpg-abordage-chaine__ombre">
        {[...torsade.arriere, ...torsade.avant].map((lobe, index) => (
          <path key={index} d={lobe.d} style={{ '--anneau-retour': `${-lobe.mou}px` }} />
        ))}
      </g>
      {/* 2. Les lobes ARRIÈRE : le brin qui plonge passe sous l’autre. */}
      <g className="rpg-abordage-chaine__brins rpg-abordage-chaine__brins--arriere">
        {torsade.arriere.map((lobe, index) => lobeSvg(lobe, index, 'arriere'))}
      </g>
      {/* 3. Les lobes AVANT : le brin qui monte couvre le croisement. */}
      <g className="rpg-abordage-chaine__brins rpg-abordage-chaine__brins--avant">
        {torsade.avant.map((lobe, index) => lobeSvg(lobe, index, 'avant'))}
      </g>
      {/* 4. La manille du capteur, puis le grappin de la prise. */}
      <ellipse
        className="rpg-abordage-chaine__manille"
        cx="1.2"
        cy="28"
        rx="3.6"
        ry="5.2"
      />
      <g className="rpg-abordage-chaine__grappin">
        {/* La tige, puis les trois dents recourbées vers l’arrière. */}
        <path className="rpg-abordage-chaine__grappin-ombre" d="M-13 28 H7 M7 28 L13 28" />
        <path className="rpg-abordage-chaine__grappin-ombre" d="M6 28 C2 20 -4 15 -11 15 M6 28 C2 36 -4 41 -11 41" />
        <path className="rpg-abordage-chaine__grappin-acier" d="M-13 28 H9 M9 28 L15 28" />
        <path className="rpg-abordage-chaine__grappin-acier" d="M8 28 C4 20 -2 15 -9 15 M8 28 C4 36 -2 41 -9 41" />
        <path className="rpg-abordage-chaine__grappin-acier" d="M-9 15 l-4 -1 M-9 41 l-4 1" />
      </g>
    </svg>
  );
}

export function RoueDeFeu({ effet, onTermine = null }) {
  // Un identifiant par roue : deux créatures brûlées dans le même geste ne
  // partagent pas le tracé de leurs langues.
  const idLangue = `rpg-langue-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <div
      className="rpg-roue-feu"
      data-rpg-burn-id={effet.entityId}
      data-rpg-burn-fx="braise"
      aria-hidden="true"
      style={{
        left: `${effet.left}px`,
        top: `${effet.top}px`,
        width: `${effet.width}px`,
        height: `${effet.height}px`,
        '--rpg-fx-rotation': `${effet.angle ?? 0}rad`,
      }}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget || event.pseudoElement) return;
        onTermine?.(effet.effectId);
      }}
    >
      <i className="rpg-roue-feu__lueur" />
      {/* Les flammes, dessinées : chaque langue est un tracé vectoriel en trois
          couches (braise, flamme, cœur), posée autour de la face. */}
      <svg
        className="rpg-roue-feu__flammes"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <path id={idLangue} d={CHEMIN_LANGUE} />
        </defs>
        {LANGUES_ROUE_FEU.map((langue, index) => (
          <g
            key={index}
            transform={`translate(${langue.x} ${langue.y}) scale(${langue.s}) rotate(${langue.r ?? 0})`}
          >
            {COUCHES_FLAMME.map((couche) => (
              <g
                key={couche.nom}
                className={`rpg-roue-feu__flamme rpg-roue-feu__flamme--${couche.nom}`}
                style={{ '--d': `${langue.d + couche.retard}ms`, '--dur': `${couche.dur}ms` }}
              >
                <use href={`#${idLangue}`} />
              </g>
            ))}
          </g>
        ))}
      </svg>
      {BRAISES_ROUE_FEU.map((braise) => (
        <i
          key={braise.d}
          className="rpg-roue-feu__braise"
          style={{
            '--dx': `${braise.dx}px`,
            '--dy': `${braise.dy}px`,
            '--d': `${braise.d}ms`,
            '--taille': braise.t,
          }}
        />
      ))}
    </div>
  );
}

/**
 * La foudre de l'Éclair du marteau sur une créature touchée.
 *
 * Le ciel se fend au-dessus de la carte : l'éclair principal descend du ciel
 * et frappe — flash, onde au sol, étincelles, fissures qui courent sous la
 * carte — puis des arcs résiduels rampent encore sur les bords. La créature,
 * elle, encaisse la secousse (`fx-foudre`) : les deux cinématiques partent
 * ensemble et l'impact tombe au même tiers de chacune.
 *
 * Comme la roue de feu, le calque se pose sur l'emplacement mesuré avant
 * l'action, garde l'inclinaison de la carte, ne capte rien et ne déplace
 * rien : une créature tuée par la foudre reçoit son adieu en dessous pendant
 * que l'éclair finit de tomber là où elle se tenait.
 */
/** Le tracé de l'éclair principal : il descend du ciel — hors de la face,
 *  le calque SVG déborde — en zigzags serrés jusqu'au point d'impact
 *  (50, 30). */
const CHEMIN_ECLAIR_PRINCIPAL = 'M64-72L55-44L61-41L50-14L57-10L47 12L53 16L50 30';
/** La décharge traverse la créature et gagne le sol sous la carte. */
const CHEMIN_ECLAIR_DECHARGE = 'M50 30L47 52L53 66L48 84L51 100';
/** Les fourches : des éclairs secondaires qui se détachent du principal. */
const CHEMINS_ECLAIR_FOURCHES = Object.freeze([
  'M50-14L38-4L43-1L30 10',
  'M47 12L36 20L40 24L29 34',
  'M53 16L64 24L60 28L71 38',
]);
/** Les fissures : la table se fend sous la carte, comme le sol de
 *  l'illustration — elles vivent un peu plus longtemps que l'éclair. */
const CHEMINS_ECLAIR_FISSURES = Object.freeze([
  'M51 100L40 105L29 103L20 108',
  'M51 100L63 106L75 104L84 109',
  'M51 100L49 108L54 115',
]);
/** Les arcs résiduels : de courts zigzags posés sur les bords de la face.
 *  Chacun clignote à son retard (`--d`) — l'électricité rampe, elle ne
 *  s'allume jamais partout à la fois. */
const ARCS_ECLAIR_MARTEAU = Object.freeze([
  { d: 'M4 18L10 12L7 7L14 2', retard: 330 },
  { d: 'M96 30L90 38L95 44L89 52', retard: 410 },
  { d: 'M3 58L10 64L5 70L12 77', retard: 470 },
  { d: 'M30 97L38 91L44 96L52 90', retard: 540 },
  { d: 'M84 4L89 11L83 15L90 21', retard: 380 },
]);
/** Les étincelles arrachées à l'impact : direction, retard, taille et
 *  inclinaison de la traînée — elles partent en gerbe et retombent. */
const ETINCELLES_MARTEAU = Object.freeze([
  { dx: -58, dy: -30, d: 260, t: 1, r: -58 },
  { dx: 44, dy: -38, d: 280, t: 0.8, r: 48 },
  { dx: -38, dy: 18, d: 300, t: 0.9, r: -104 },
  { dx: 62, dy: 10, d: 330, t: 1.1, r: 82 },
  { dx: 12, dy: -64, d: 290, t: 0.7, r: 8 },
  { dx: -70, dy: 26, d: 370, t: 0.85, r: -112 },
  { dx: 28, dy: 44, d: 350, t: 1, r: 124 },
  { dx: -16, dy: 58, d: 390, t: 0.75, r: 168 },
  { dx: -44, dy: -52, d: 320, t: 0.65, r: -38 },
  { dx: 70, dy: 38, d: 410, t: 0.95, r: 112 },
]);

export function EclairDuMarteau({ effet, onTermine = null }) {
  return (
    <div
      className="rpg-eclair-marteau"
      data-rpg-foudre-id={effet.entityId}
      data-rpg-foudre-fx="eclair-du-marteau"
      aria-hidden="true"
      style={{
        left: `${effet.left}px`,
        top: `${effet.top}px`,
        width: `${effet.width}px`,
        height: `${effet.height}px`,
        '--rpg-fx-rotation': `${effet.angle ?? 0}rad`,
      }}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget || event.pseudoElement) return;
        onTermine?.(effet.effectId);
      }}
    >
      <i className="rpg-eclair-marteau__flash" />
      <i className="rpg-eclair-marteau__onde" />
      {/* Le ciel fendu et les arcs, dessinés : un seul calque SVG posé sur
          la face, qui déborde vers le haut d'où tombe la foudre. */}
      <svg
        className="rpg-eclair-marteau__ciel"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* L'éclair principal et la décharge, en deux couches : le halo bleu
            qui éclaire, le cœur blanc qui se voit — comme les langues de feu. */}
        <path className="rpg-eclair-marteau__eclair rpg-eclair-marteau__eclair--halo" d={CHEMIN_ECLAIR_PRINCIPAL} />
        <path className="rpg-eclair-marteau__eclair rpg-eclair-marteau__eclair--coeur" d={CHEMIN_ECLAIR_PRINCIPAL} />
        <path className="rpg-eclair-marteau__eclair rpg-eclair-marteau__eclair--halo" d={CHEMIN_ECLAIR_DECHARGE} />
        <path className="rpg-eclair-marteau__eclair rpg-eclair-marteau__eclair--coeur" d={CHEMIN_ECLAIR_DECHARGE} />
        {CHEMINS_ECLAIR_FOURCHES.map((chemin) => (
          <path key={chemin} className="rpg-eclair-marteau__fourche" d={chemin} />
        ))}
        {CHEMINS_ECLAIR_FISSURES.map((chemin) => (
          <path key={chemin} className="rpg-eclair-marteau__fissure" d={chemin} />
        ))}
        {ARCS_ECLAIR_MARTEAU.map((arc) => (
          <path
            key={arc.d}
            className="rpg-eclair-marteau__arc"
            d={arc.d}
            style={{ '--d': `${arc.retard}ms` }}
          />
        ))}
      </svg>
      {ETINCELLES_MARTEAU.map((etincelle) => (
        <i
          key={etincelle.d}
          className="rpg-eclair-marteau__etincelle"
          style={{
            '--dx': `${etincelle.dx}px`,
            '--dy': `${etincelle.dy}px`,
            '--d': `${etincelle.d}ms`,
            '--taille': etincelle.t,
            '--r': `${etincelle.r}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function RpgMassFreezeFx({ effet }) {
  if (!effet) return null;
  const { type, camp, token } = effet;
  const label = type === 'brume' ? 'Brume du fjord — souffle léger'
    : type === 'blizzard' ? 'Hurlement du blizzard — souffle froid'
    : type === 'geant' ? 'Géant des banquises — souffle polaire'
    : 'Verglas — souffle givrant';
  const intensity = type === 'brume' ? 'light' : 'heavy';
  // camp = lanceur ; le souffle descend sur les créatures de l'adversaire
  const target = camp === 'joueur' ? 'ennemi' : 'joueur';
  const count = intensity === 'light' ? 5 : 8;
  const iceCount = intensity === 'light' ? 3 : 5;
  return (
    <div
      key={`cold-breath-${token}`}
      className={`rpg-cold-breath rpg-cold-breath--${target} rpg-cold-breath--${intensity} rpg-cold-breath--${type} rpg-mass-freeze rpg-mass-freeze--${type} rpg-mass-freeze--${camp}`}
      data-rpg-cold-breath={type}
      data-rpg-mass-freeze={type}
      data-rpg-mass-freeze-camp={camp}
      role="status"
      aria-label={label}
    >
      <span className="rpg-cold-breath__flow rpg-mass-freeze__veil" aria-hidden="true" />
      <span className="rpg-cold-breath__particles rpg-mass-freeze__snow" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <i key={i} className="rpg-cold-breath__particle rpg-mass-freeze__flake" style={{ '--i': i }} />
        ))}
      </span>
      <span className="rpg-cold-breath__ice-flakes" aria-hidden="true">
        {Array.from({ length: iceCount }, (_, i) => (
          <i key={`ice-${i}`} className="rpg-cold-breath__ice-flake" style={{ '--i': i, '--j': i * 1.7 }} >
            {i % 3 === 0 ? '❄' : i % 3 === 1 ? '❅' : '❆'}
          </i>
        ))}
      </span>
    </div>
  );
}

export function TableCard({
  entite,
  cote,
  active,
  selected,
  blocking,
  canTarget,
  sacrificeTarget = false,
  spellTarget = false,
  coupRapideCible = false,
  declaredAttacker = false,
  onClick,
  canDragBlocker = false,
  canReceiveBlocker = false,
  draggedBlocker = false,
  selectedBlocker = false,
  onStartBlockerDrag,
  onEndBlockerDrag,
  onAssignBlocker,
  actionFx = null,
  // `{ montant, token }` le temps de l'éclat d'un soin (`EclatSoin`), sinon null.
  soin = null,
  // `{ token }` le temps d'afficher « MISS » au-dessus de l'attaquant qui rate son Coup rapide.
  miss = null,
  // `{ montant, restant, lumiere, token }` le temps du choc d'un bouclier qui
  // vient d'absorber un coup (`ImpactBouclier`), sinon null.
  bouclierFx = null,
  playerTurn = false,
  activationDispo = false,
  onActiver = null,
  tutorialTarget,
  onHoverCard,
  onLeaveHoverCard,
  iconesEffets = true,
  caseEssai = null,
}) {
  const carte = cardById(entite.carteId);
  const estSite = carte?.kind === 'site';
  const hybride = cardColors(carte).length > 1;
  const nom = entite.name;
  const armeCarte = entite.arme ? cardById(entite.arme.carteId) : null;
  const armes = armesPortees(entite);
  const effetsArmesEquipees = cartesDesIds(armes).map(effetsAccordesParArme).filter(Boolean);
  const effetsEpuises = effetsEpuisesPourEntite(carte, entite);
  const protectionActive = entite.protection?.toursRestants > 0;
  const protectionLabel = protectionActive
    ? [entite.protection.contre].flat(Infinity).filter(Boolean)
      .map((couleur) => ELEMENT_LABELS[couleur] ?? couleur).join(' et ')
    : null;
  const gelee = !estSite && (entite.gelToursRestants ?? 0) > 0;
  const blessee = !estSite && entite.pv < (entite.pvMax ?? carte?.def ?? entite.pv);
  // Les Deux Visages (La Barbe Noire) : le visage que la créature porte
  // MAINTENANT — la fiche imprime celui d'arrivée, la table montre le courant.
  const visageActuel = entite.visage != null
    ? carte?.alternance?.visages?.[entite.visage] ?? null
    : null;
  // La prisonnière de la cale (Abordage) : sa fiche, pour la mini-face qui
  // se glisse sous le coin du capteur — on voit QUI est détenu, pas
  // seulement un losange de chaîne.
  const prisonniereCarte = entite.enCale ? cardById(entite.enCale.carteId) : null;
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

  const carteRendue = (
    <button
      ref={cardRef}
      type="button"
      data-prisonniere={entite.enCale?.carteId}
      className={[
        `rpg-card rpg-card--img rpg-card--elem-${carte?.element ?? 'sable'} rpg-card--type-${cardFrameType(carte)}`,
        cote === 'ennemi' ? 'rpg-card--ennemi' : 'rpg-card--equipe',
        entite.furieDeclenchee ? '' : cardFrameClass(carte),
        cardMotifClass(carte),
        carte?.kind === 'hero' ? 'rpg-card--legendaire' : '',
        estSite ? 'rpg-card--site' : '',
        entite.envol ? 'is-envol' : '',
        entite.rapidite ? 'has-rapidite' : '',
        entite.infiltration ? 'has-infiltration' : '',
        (entite.bouclier ?? 0) > 0 || entite.bouclierLumiere ? 'has-bouclier' : '',
        entite.bouclierLumiere ? 'has-bouclier-lumiere' : '',
        carte?.resonance ? 'has-resonance' : '',
        carte?.aura ? 'has-aura' : '',
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
        entite.furieDeclenchee ? 'is-furie' : '',
        canTarget ? 'is-ciblable' : '',
        sacrificeTarget ? 'is-sacrifice-target' : '',
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
        actionFx?.type === 'foudre' ? 'fx-foudre' : '', 
        actionFx?.type === 'glow' ? 'fx-glow' : '',
        actionFx?.type === 'block' ? 'fx-block' : '',
        actionFx?.type === 'unblock' ? 'fx-unblock' : '',
        // L'éclat du soin vit dans ses propres calques (`EclatSoin`) : la carte
        // elle-même n'est pas animée, ses cinématiques `fx-*` restent libres.
        soin ? `is-healing is-healing--${varianteSoin(soin)}` : '',
        miss ? 'is-miss' : '',
      ].filter(Boolean).join(' ')}
      /* Une carte POSÉE sur la table est toujours droite : l'éventail et ses
         inclinaisons n'appartiennent qu'à la main. Seuls les états de combat
         (attaquant déclaré, créature engagée) la font pencher, et ils sont
         écrits dans la feuille (`data-combat-tilted`). */
      style={{
        // Quand la créature est en furie, l'illustration occupe tout l'espace :
        // aucun cadre ni bordure ne vient rogner la peinture pleine page.
        ...(entite.furieDeclenchee ? {} : cardFrameStyle(carte)),
        ...(caseEssai ? { '--case-essai': caseEssai } : {}),
        // Chaque créature avec Envol a sa propre durée de lévitation : la
        // feuille anime `translate`, `rotate` et `scale`, et cette durée lui
        // suffit pour que deux voisines ne battent jamais ensemble.
        ...(entite.envol ? { '--rpg-envol-duree': `${dureeVol(entite)}s` } : {}),
      }}
      data-case-essai={caseEssai ?? undefined}
      data-combat-tilted={declaredAttacker || entite.attaquee ? 'true' : 'false'}
      data-entity-id={entite.id}
      data-card-id={carte?.id}
      data-soin={soin ? soin.montant : undefined}
      data-miss={miss ? 'true' : undefined}
      data-bouclier={(entite.bouclier ?? 0) > 0 ? entite.bouclier : undefined}
      data-bouclier-lumiere={entite.bouclierLumiere ? 'true' : undefined}
      data-armes={armes.length ? armes.join(' ') : undefined}
      data-furie-declenchee={entite.furieDeclenchee ? 'true' : undefined}
      data-furie-atk={entite.furieDeclenchee ? entite.atk : undefined}
      data-furie-def={entite.furieDeclenchee ? entite.pv : undefined}
      data-effets-epuises={effetsEpuises.length ? effetsEpuises.join(' ') : undefined}
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
      aria-label={`${nom}, ${cardFaceTypeLine(carte)}, couleur ${carte?.element ?? 'inconnue'}, coût ${carte?.cost ?? 0}${estSite ? ', site indestructible occupant un emplacement du champ' : `, attaque ${entite.atk}, défense ${entite.pv}${annonceVariationsStats}`}${carte?.honneur ? `, Harakiri : à sa mort, inflige ${carte.honneur} dégât${carte.honneur > 1 ? 's' : ''} à une créature adverse au hasard, ou au sorcier adverse s’il n’y en a aucune` : ''}${carte?.resonance ? `, résonance ${resonanceGroupLabel(cardResonanceGroup(carte)).toLowerCase()} : ${carte.resonanceExclutSource ? 'seules les autres ' : 'toutes les '}créatures de type ${resonanceGroupLabel(cardResonanceGroup(carte))} des deux camps gagnent +${carte.resonance}/+${carte.resonance}` : ''}${carte?.banniere ? `, bannière : chaque fois qu’un Samouraï du camp de la source attaque, il gagne +${carte.banniere.atk}/+${carte.banniere.def}` : ''}${carte?.aura?.type === 'buff-tribu' ? `, aura : les autres créatures de type ${resonanceGroupLabel(carte.aura.tribu)} de votre camp gagnent +${carte.aura.atk}/+${carte.aura.def}` : carte?.aura?.type === 'buff-autres' ? `, aura : toutes vos autres créatures gagnent +${carte.aura.atk}/+${carte.aura.def}` : ''}${(entite.butin ?? carte?.butin) ? ', Butin : toucher le sorcier adverse fait piocher puis défausser une carte' : ''}${visageActuel ? `, deux visages : ${visageActuel.nom} pour ce tour (${visageActuel.atk ?? 0}/${visageActuel.def ?? 0}${visageActuel.provocation ? ', Provocation' : ''}), elle change au début de chaque tour` : ''}${carte?.insaisissable ? ', le dédoublement : ne peut pas être prise en cale' : ''}${entite.enCale ? `, cale : détient ${entite.enCale.name} — la cale s’ouvre quand ${entite.name} quitte la table` : ''}${entite.coupRapide ? ', Coup rapide : peut frapper une créature adverse avant le combat avec 30 % de chances de rater et arrêter là son attaque, sinon elle attaque l’adversaire normalement (100 %)' : ''}${entite.provocation ? ', Provocation : quand elle attaque, elle doit être bloquée par au moins une créature si possible' : ''}${entite.nePeutPasAttaquer ? ', ne peut pas attaquer' : ''}${effetsArmesEquipees.length ? `, ${effetsArmesEquipees.join(', ')}` : ''}${entite.rapidite ? ', rapidité, peut attaquer le tour où elle arrive' : ''}${entite.envol ? ', envol, ne peut être bloquée que par une créature avec envol' : ''}${entite.infiltration ? ', infiltration, ne peut pas être bloquée' : ''}${entite.tenaciteDisponible ? ', tenacité : une fois par partie, quand elle meurt (sauf exilée), elle revient en jeu au prochain tour de son camp avec 1 de défense' : effetsEpuises.includes('tenacite') ? ', tenacité déjà utilisée' : ''}${activation ? `, capacité activée : payer ${activation.cout} mana de glace, inflige ${activation.effet?.amount ?? 0} blessures à une créature au choix` : ''}${protectionActive ? `, protection contre ${protectionLabel} pendant encore ${entite.protection.toursRestants} tour${entite.protection.toursRestants > 1 ? 's' : ''}` : ''}${entite.esquive ? ', esquive : 30 % de chance d’esquiver une attaque, une Magie ou une Sorcellerie, mais pas une capacité' : ''}${entite.contreAttaque ? ', contre-attaque : quand une créature adverse la frappe avec Coup rapide ou la cible avec une capacité, elle lui inflige ses dégâts d’attaque ; quand un sort la cible, elle frappe le sorcier adverse — même si elle a esquivé' : ''}${entite.attaquee ? `, engagée, elle se dégagera au début du prochain tour ${cote === 'ennemi' ? 'du sorcier' : 'du joueur'}` : ''}${gelee ? ', gelée : ne peut ni attaquer ni bloquer, aucune blessure infligée pendant ce combat' : ''}${entite.empecheAttaqueToursRestants > 0 ? ', venin : ne peut pas attaquer jusqu’à la fin de son prochain tour' : ''}${blessee ? ', blessée' : ''}${malInvocation ? ', mal d’invocation' : ''}${entite.heures?.restants ? `, ${entite.heures.restants} compteur${entite.heures.restants > 1 ? 's' : ''} d’Heures sur ${estSite ? 'le site' : 'la créature'}` : ''}${entite.arme?.compteurs ? `, ${entite.arme.compteurs} compteur${entite.arme.compteurs > 1 ? 's' : ''} de sable sur son arme` : ''}${entite.bouclier ? `, bouclier ${entite.bouclier}` : ''}${effetsEpuises.includes('bouclier') ? ', bouclier tombé' : ''}${blocking ? ', bloqueur assigné, flèche jaune vers son attaquant' : ''}${canDragBlocker ? ', bloqueur disponible, glisser sur une créature attaquante' : ''}${selectedBlocker ? ', bloqueur sélectionné, cliquez une créature attaquante pour lui assigner le blocage' : ''}${spellTarget ? ', ciblée par le sort annoncé, lueur rouge' : ''}${coupRapideCible ? ', ciblée par Coup rapide, lueur rouge' : ''}${sacrificeTarget ? ', cliquer pour sacrifier cette créature et libérer son emplacement' : ''}${soin ? `, vient de regagner ${soin.montant} PV` : ''}${miss ? ', attaque ratée (MISS)' : ''}`}
      aria-pressed={Boolean(selected || selectedBlocker)}
    >
      <img
        key={entite.furieDeclenchee ? `${carte?.id}-furie` : cardArtEntite(entite)}
        className={`rpg-card__img${estSite ? ' rpg-card__img--site-stage' : ''}`}
        src={entite.furieDeclenchee ? cardArtFurie(carte) : cardArtEntite(entite)}
        alt=""
        aria-hidden="true"
      />
      {entite.furieDeclenchee && <VignetteFurie />}
      {((entite.bouclier ?? 0) > 0 || entite.bouclierLumiere) && (
        <EgideBouclier montant={entite.bouclier ?? 0} lumiere={Boolean(entite.bouclierLumiere)} />
      )}
      {carte?.resonance ? <AuraOndes phase={phaseAura(entite)} /> : null}
      {carte?.aura ? <AuraOndes variante="aura" phase={phaseAura(entite)} /> : null}
      {/* Envol : un souffle de lumière traverse lentement la face, comme une
          aile qui passe — décalé lui aussi par entité. */}
      {entite.envol && (
        <span
          className="rpg-card__envol"
          style={{ '--rpg-envol-phase': `${(-phaseVol(entite) * SOUFFLE_ENVOL_DUREE).toFixed(2)}s` }}
          aria-hidden="true"
        >
          <span className="rpg-card__envol-souffle" />
        </span>
      )}
      {entite.rapidite && <ElectriciteRapidite />}
      {/* Infiltration : la carte devient une silhouette de brume — à demi
          transparente, traversée de nuages gris qui défilent. */}
      {entite.infiltration && (
        <span className="rpg-card__brume" aria-hidden="true">
          <span className="rpg-card__brume-nappe rpg-card__brume-nappe--a" />
          <span className="rpg-card__brume-nappe rpg-card__brume-nappe--b" />
        </span>
      )}
      {blessee && <span className="rpg-card__blood" aria-hidden="true" />}
      {gelee && <span className="rpg-card__frost" aria-hidden="true">
        <span className="rpg-card__frost-ice" />
        <span className="rpg-card__frost-cracks" />
        <span className="rpg-card__frost-crystals" />
        <span className="rpg-card__frost-snow" />
        <span className="rpg-card__frost-shimmer" />
        <span className="rpg-card__frost-glow" />
      </span>}
      <CardElementBadge carte={carte} />
      {/* Les losanges de compteurs sont sous la couleur d'une carte mono,
          sous le coût d'une hybride (ses deux pastilles occupent la gauche).
          Ceux de la Jitte restent sur l'arme dans le moteur ; sa créature
          porteuse les montre ici, sans texte ni bonus d'arme.
          La cale, elle, ne suit pas ce partage : le prisonnier se lit SOUS les
          couleurs, sur une hybride aussi (voir le losange ⛓ juste après). */}
      {(entite.heures?.restants > 0 || (armeCarte && entite.arme?.compteurs > 0) || (entite.enCale && !hybride)) && (
        <span className={`rpg-card__compteurs${hybride ? ' rpg-card__compteurs--hybride' : ''}`} aria-hidden="true">
          {entite.heures?.restants > 0 && (
            <CompteurCarte type="heures" valeur={entite.heures.restants} />
          )}
          {armeCarte && entite.arme?.compteurs > 0 && (
            <CompteurCarte type="sable" valeur={entite.arme.compteurs} />
          )}
          {entite.enCale && !hybride && (
            <span className="rpg-card__compteur rpg-card__compteur--cale" data-compteur="cale" title={`Cale : ${entite.enCale.name}`}>
              <span>⛓</span>
            </span>
          )}
          {visageActuel && (
            <span
              className="rpg-card__compteur rpg-card__compteur--visage"
              data-compteur="visage"
              title={`Deux Visages : ${visageActuel.nom} (${visageActuel.atk ?? 0}/${visageActuel.def ?? 0}${visageActuel.provocation ? ' · Provocation' : ''}) — change au début de chaque tour`}
            >
              <span>🎭</span>
            </span>
          )}
        </span>
      )}
      {/* La cale d'une créature hybride : son bloc de couleur empile deux
          pastilles à gauche, et le losange ⛓ se range dessous — le prisonnier
          se lit avec les couleurs de son capteur, jamais avec son coût. */}
      {entite.enCale && hybride && (
        <span className="rpg-card__compteurs rpg-card__compteurs--cale" aria-hidden="true">
          <span className="rpg-card__compteur rpg-card__compteur--cale" data-compteur="cale" title={`Cale : ${entite.enCale.name}`}>
            <span>⛓</span>
          </span>
        </span>
      )}
      <header className="rpg-card__title">
        <ManaCost carte={carte} compact showElement={false} />
      </header>
      {/* Sur la table, les icônes d'effets de la créature se rangent en colonne
          à la place du coût (qui ne s'imprime plus sur une carte posée), sur le
          même axe. Si le coin est pris — losanges de compteurs d'une hybride,
          bouton de capacité activée —, la colonne descend pour les laisser
          lisibles. */}
      {iconesEffets && (
        <IconesCarte
          carte={carte}
          entite={entite}
          className={`rpg-card-icones--colonne${hybride && (entite.heures?.restants > 0 || (armeCarte && entite.arme?.compteurs > 0))
            ? ' rpg-card-icones--sous-compteurs'
            : activation && cote === 'joueur' && onActiver ? ' rpg-card-icones--sous-activation' : ''}`}
        />
      )}
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
        {!estSite && (
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
        )}
        {soin && <EclatSoin key={soin.token} montant={soin.montant} surCarte />}
        {bouclierFx && (
          <ImpactBouclier
            key={bouclierFx.token}
            montant={bouclierFx.montant}
            restant={bouclierFx.restant}
            lumiere={Boolean(bouclierFx.lumiere)}
          />
        )}
        {miss && (
          <span key={miss.token} className="rpg-card__miss" aria-hidden="true">
            MISS
          </span>
        )}
      </button>
  );

  // La carte prisonnière, DERRIÈRE son capteur : la créature prise en cale
  // reste sur la table, glissée sous le ravisseur — elle dépasse par le haut
  // et la droite, inclinée, assombrie, derrière les chaînes, son nom en haut
  // de la carte visible. Décorative (pointer-events none, aria-hidden) : la
  // cale se lit dans l'aria du capteur et dans sa fiche, qui empile les deux
  // créatures en perspective. Le wrapper
  // n'existe qu'avec une prisonnière : sans prise, le DOM reste celui
  // d'avant, une carte = un bouton. Le wrapper reste une CARTE de la rangée :
  // il reçoit la case du mode sans terrains (la grille de cinq colonnes le
  // placerait sinon au hasard) et se laisse mesurer comme ses voisines.
  if (!prisonniereCarte) return carteRendue;
  return (
    <span
      className="rpg-card-prison"
      style={caseEssai ? { '--case-essai': caseEssai } : undefined}
      data-case-essai={caseEssai ?? undefined}
    >
      <span className="rpg-card__prisonniere" aria-hidden="true">
        <span className="rpg-card__prisonniere-nom">{entite.enCale.name}</span>
        <img className="rpg-card__prisonniere-art" src={cardArt(prisonniereCarte)} alt="" />
        <span className="rpg-card__prisonniere-chaine">⛓</span>
      </span>
      {carteRendue}
    </span>
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
 * La lumière commune aux surfaces foil du Sablier.
 *
 * Le reflet bouge avec l'angle de vue, au lieu de tourner tout seul. On pose
 * donc ici un seul angle, lu sur le curseur, que les surfaces foil partagent.
 * Les aperçus de cartes n'en portent pas : leur inclinaison 3D est indépendante
 * de cette lumière.
 *
 * Rien au doigt : là il n'y a pas de curseur, et le reflet n'a personne à suivre.
 */
function useLumiereCartes(actif = true) {
  useEffect(() => {
    if (!actif) return undefined;
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
      // ±38 % : déplace franchement les reflets sans faire sortir les taches
      // des cartes du cadre.
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
  }, [actif]);
}

export function HoverCardPreview({ carte, style = null, variante = '', cible = null, controls = null, panelRef = null, armes = [], furieDeclenchee = false, statsFurie = null, effetsEpuises = [], surface = null, interactif = false, onPointerEnter = null, onPointerLeave = null, prisonniere = null }) {
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
  // Une créature en Furie ne se consulte pas sous sa peinture d'avant la
  // blessure : l'aperçu montre le visuel qu'elle porte sur la table —
  // illustration « furie » pleine page, sans cadre — et ses statistiques du
  // moment. Sans statistiques transmises, seule l'attaque reçoit le bonus
  // imprimé : la Furie ne donne aucune défense.
  const estEnFurie = estCreature && Boolean(furieDeclenchee);
  const bonusFurie = Math.max(0, Number(carte.furie) || 0);
  const statFurie = (valeur, repli) => (valeur == null || valeur === '' || !Number.isFinite(Number(valeur)) ? repli : Number(valeur));
  const attaqueAffichee = estEnFurie ? statFurie(statsFurie?.atk, (carte.atk ?? 0) + bonusFurie) : carte.atk;
  const defenseAffichee = estEnFurie ? statFurie(statsFurie?.def, carte.def ?? 0) : carte.def;
  // La même signature que celle de la main : la face de l'aperçu — survol,
  // appui long, fiche du catalogue, annonce — porte le socle de la famille, et
  // sa ligne de type prend la teinte de cette famille.
  const ligneFamille = classeLigneFamille(carte);
  const effet = carte.text && carte.text !== '—' ? carte.text : null;
  // Les mots-clés passent en pastilles — le mot seul, sous la ligne de type,
  // comme sur les cartes en main et au catalogue. L'aperçu n'écrit aucune
  // explication sous le mot : la règle imprimée de la carte se lit entière
  // dans le bloc « Effets », juste en dessous.
  const effets = cardEffectLines(effet);
  const effetsEpuisesActifs = [...new Set(effetsEpuises ?? [])]
    .filter((cle) => cle === 'tenacite' || cle === 'bouclier');
  const mentionsEffetsEpuises = [
    effetsEpuisesActifs.includes('tenacite') && 'Tenacité déjà utilisée',
    effetsEpuisesActifs.includes('bouclier') && 'Bouclier tombé',
  ].filter(Boolean);
  // La modification chiffrée que la carte inflige (-2/-2 pour la Lame de mer).
  const modifCarte = modificationStats(carte);
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
  const prisonniereCarte = prisonniere && prisonniere.id !== carte.id ? prisonniere : null;
  const details = (
    <>
      {variante === 'annonce' && <span className="rpg-hover-card-preview__eyebrow">CARTE ANNONCÉE</span>}
      {estFiche && <span className="rpg-hover-card-preview__eyebrow">{surface ? `${surface} · ` : ''}{carteFamille(carte).toUpperCase()}</span>}
      {(variante === 'annonce' || estFiche) && <strong className="rpg-hover-card-preview__name">{carte.name}</strong>}
      {(estFiche || !estCreature) && <p className={`rpg-hover-card-preview__type${ligneFamille}`}>{cardFaceTypeLine(carte)}</p>}
      <PastillesCarte
        carte={carte}
        className="rpg-hover-card-preview__pastilles"
        effetsEpuises={effetsEpuisesActifs}
        muettes
      />
      {estFiche && <p className="rpg-hover-card-preview__color">{cardColorLine(carte)}</p>}
      {estEnFurie && (
        <p className="rpg-hover-card-preview__furie" data-furie-declenchee="true">
          Furie déclenchée — {attaqueAffichee}/{defenseAffichee}
        </p>
      )}
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
      {prisonniereCarte && (
        <div className="rpg-hover-card-preview__weapons" role="group" aria-label="Créature en cale">
          <figure
            className="rpg-hover-card-preview__weapon rpg-hover-card-preview__prisonniere"
            data-creature-en-cale={prisonniereCarte.id}
          >
            <span className="rpg-hover-card-preview__weapon-art" aria-hidden="true">
              <img src={cardArt(prisonniereCarte)} alt="" />
              <span className="rpg-hover-card-preview__weapon-cost">{prisonniereCarte.cost}</span>
            </span>
            <figcaption>
              <small className="rpg-hover-card-preview__prisonniere-label">En cale</small>
              <strong>{prisonniereCarte.name}</strong>
              {prisonniereCarte.text && prisonniereCarte.text !== '—' && <small>{prisonniereCarte.text}</small>}
            </figcaption>
          </figure>
        </div>
      )}
      {(effets.length > 0 || effetsArmesEquipees.length > 0) && (
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
          {effets.map((ligne, index) => (
            <span key={`${index}-${ligne}`}>
              <RpgCardRules carte={carte} text={ligne} effetsEpuises={effetsEpuisesActifs} />
            </span>
          ))}
        </div>
      )}
      {carteEstArme(carte) && <p className="rpg-hover-card-preview__stats">Porteur : {signeBonus(bonusArme(carte)?.atk)} ⚔ <span>·</span> {signeBonus(bonusArme(carte)?.def)} 🛡</p>}
      {modifCarte && !carteEstArme(carte) && (
        <p className={`rpg-hover-card-preview__stats rpg-hover-card-preview__stats--modif${modifCarte.atk < 0 || modifCarte.def < 0 ? ' is-malus' : ' is-bonus'}`}>
          Statistiques : {signeStat(modifCarte.atk)} ⚔ <span>·</span> {signeStat(modifCarte.def)} 🛡
        </p>
      )}
    </>
  );
  // Le survol à la souris reste un aperçu « texte-seul » : seul l'encadré de
  // texte (coût, mots-clés, effets) s'affiche, compact, sous le curseur.
  // L'appui long au doigt, lui, montre la carte entière — sa face illustrée
  // comprise, comme la fiche — son volet sombre isolant déjà la lecture du
  // plateau. Une Furie déclenchée a changé de peinture, et ce changement se
  // voit dès la preview, où qu'elle s'ouvre. La fiche du catalogue, l'annonce
  // et les présentations centrées (magie jouée, effet activé) gardent la leur.
  const estApercuRapide = variante === '' && !estEnFurie;
  // L'Abordage se lit dans les détails : la créature captive est montrée en
  // vignette, comme une arme portée, sans doubler la face principale.
  const face = (
    <div className="rpg-hover-card-preview__empile">
    <div
      ref={faceRef}
      className={`rpg-hover-card-preview__face ${estEnFurie ? 'is-furie' : cardFrameClass(carte)} ${cardMotifClass(carte)}`}
      style={estEnFurie ? undefined : cardFrameStyle(carte)}
      data-furie-declenchee={estEnFurie ? 'true' : undefined}
      aria-hidden="true"
    >
      <img src={estEnFurie ? cardArtFurie(carte) : cardArt(carte)} alt="" />
      {estEnFurie && <VignetteFurie />}
      <CardElementBadge carte={carte} />
      <ManaCost carte={carte} showElement={false} />
      <SortSceau carte={carte} className="rpg-hover-card-preview__sceau rpg-hover-card-preview__sort" />
      {estCreature && (
        <footer className="rpg-card__foot" aria-label={`Attaque ${attaqueAffichee}, défense ${defenseAffichee}`}>
          <span className="rpg-card__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{attaqueAffichee}</span></span>
          <span className="rpg-card__pt"><CardStatIcon type="defense" /><span className="rpg-stat-value">{defenseAffichee}</span></span>
        </footer>
      )}
    </div>
    </div>
  );
  return (
    <aside
      ref={panelRef}
      className={`rpg-hover-card-preview${variante ? ` rpg-hover-card-preview--${variante}` : ''} rpg-hover-card-preview--${carte.element} rpg-hover-card-preview--type-${cardFrameType(carte)} ${estEnFurie ? 'rpg-hover-card-preview--furie' : cardFrameClass(carte)}${estTerrain ? ' rpg-hover-card-preview--terrain' : ''}${interactif ? ' is-interactif' : ''}${estApercuRapide ? ' rpg-hover-card-preview--texte-seul' : ''}`}
      onPointerEnter={onPointerEnter ?? undefined}
      onPointerLeave={onPointerLeave ?? undefined}
      role={variante === 'annonce' ? 'group' : 'tooltip'}
      data-effets-epuises={effetsEpuisesActifs.length ? effetsEpuisesActifs.join(' ') : undefined}
      aria-label={`Aperçu de ${carte.name} : ${cardFaceTypeLine(carte)}${estTerrain ? '' : `, coût ${cardCostLabel(carte)}`}${armesEquipees.length ? `, armes équipées ${armesEquipees.map((arme) => arme.name).join(', ')}` : ''}${effetsArmesEquipees.length ? `, effets d’équipement ${effetsArmesEquipees.join(', ')}` : ''}${effet ? `, effet ${effet}` : ''}${mentionsEffetsEpuises.length ? `, ${mentionsEffetsEpuises.join(', ')}` : ''}${estEnFurie ? ', Furie déclenchée' : ''}${estCreature ? `, attaque ${attaqueAffichee}, défense ${defenseAffichee}` : ''}${modifCarte && !carteEstArme(carte) ? `, modifie les statistiques de ${signeStat(modifCarte.atk)} attaque et ${signeStat(modifCarte.def)} défense` : ''}${prisonniereCarte ? `, détient ${prisonniereCarte.name} en sa cale` : ''}${cibleLabel}`}
      style={{ ...style, ...(estEnFurie ? {} : cardFrameStyle(carte)) }}
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
          {!estApercuRapide && face}
          <div className="rpg-hover-card-preview__details">{details}</div>
        </>
      )}
    </aside>
  );
}

/** L'aperçu au doigt : une seconde d'appui sur une carte la montre entière —
 * face illustrée comprise, comme la fiche — sur un volet sombre qui l'isole du
 * plateau. N'importe quel toucher — le volet ou le bouton — le referme. L'appui
 * long ne joue jamais la carte : c'est une consultation, pas une action. */
function ApercuCarteAppuiLong({ carte, armes = [], furieDeclenchee = false, statsFurie = null, effetsEpuises = [], onFermer }) {
  const boutonFermerRef = useRef(null);
  const [coteOppose, setCoteOppose] = useState(null);
  // Le focus arrive sur « Fermer l'aperçu » sans faire défiler la page :
  // un `scroll` même minuscule interromptrait un appui long encore en cours —
  // ou aurait laissé passer le clic qui suit la levée du doigt et refermé le
  // volet à peine ouvert (`rpgLongPress.js`).
  // Sur téléphone en paysage, l'aperçu se décale vers la moitié opposée au
  // doigt (`data-apercu-cote`) pour que la main qui tient la carte ne masque
  // ni la carte source ni sa fiche de lecture.
  useEffect(() => {
    boutonFermerRef.current?.focus({ preventScroll: true });
    const source = typeof document !== 'undefined' ? document.querySelector('[data-apercu-source]') : null;
    const rect = source?.getBoundingClientRect?.();
    const largeurVue = typeof window !== 'undefined' ? (window.innerWidth || 0) : 0;
    if (rect && rect.width > 0 && largeurVue > 0) {
      const centreX = rect.left + rect.width / 2;
      setCoteOppose(centreX > largeurVue * 0.56 ? 'gauche' : centreX < largeurVue * 0.44 ? 'droite' : 'centre');
    } else {
      setCoteOppose(null);
    }
  }, [carte?.id]);
  if (!carte) return null;
  return (
    <div
      className="rpg-card-peek"
      data-apercu-cote={coteOppose || undefined}
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${carte.name}`}
      onClick={onFermer}
    >
      <div className="rpg-card-peek__backdrop" aria-hidden="true" />
      <div className="rpg-card-peek__panel">
        <HoverCardPreview carte={carte} armes={armes} furieDeclenchee={furieDeclenchee} statsFurie={statsFurie} effetsEpuises={effetsEpuises} variante="appui-long" />
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
function ApercuCarteCatalogue({ carte, armes = [], furieDeclenchee = false, statsFurie = null, effetsEpuises = [], prisonniere = null, surface = 'CATALOGUE', onFermer }) {
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
        <HoverCardPreview carte={carte} variante="catalogue" armes={armes} furieDeclenchee={furieDeclenchee} statsFurie={statsFurie} effetsEpuises={effetsEpuises} prisonniere={prisonniere} surface={surface} />
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
   long d'une seconde au doigt. Toucher une carte la met de côté : son
   illustration passe en niveaux de gris et son cadre luit en rouge. La retoucher
   la reprend : elle repart dans le paquet, qui est battu, et le camp pioche
   autant de cartes qu'il en a écartées. Un seul échange, et la main ne diminue
   jamais : c'est une décision, pas une punition. */
function CarteMulligan({ carte, index, selectionnee, nouvelle, onBasculer }) {
  if (!carte) return null;
  const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
  return (
    <button
      type="button"
      onClick={() => onBasculer(index)}
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
      <ManaCost carte={carte} showElement={false} />
      <SortSceau carte={carte} className="rpg-mulligan__sceau rpg-mulligan__sort" />
      {estCreature && (
        <footer className="rpg-card__foot rpg-mulligan__stats" aria-hidden="true">
          <span className="rpg-card__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{carte.atk}</span></span>
          <span className="rpg-card__pt"><CardStatIcon type="defense" /><span className="rpg-stat-value">{carte.def}</span></span>
        </footer>
      )}
    </button>
  );
}

function VoletMulligan({
  main, etape, choix, nouveau, bilan, essaiMana = false,
  onBasculer, onValider, onAnnulerSelection, onContinuer,
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
            ? `Touchez une carte pour la mettre de côté : elle repart dans le paquet battu, et vous en piochez une nouvelle. Un seul échange, ${main.length} cartes en main.`
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
                onBasculer={onBasculer}
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

/**
 * La fiche compacte d'une magie qui vient d'être jouée.
 *
 * Quel que soit le lanceur, elle se pose au **milieu du plateau** (la pile
 * centrale `.rpg-spell-played-stack`, voir `rpg-battle.css`) : le regard est
 * déjà au centre de la table, là où le sort fait son effet. C'est la couleur
 * qui dit le camp — turquoise de la magie pour le joueur, rouge de
 * l'adversaire pour le sorcier (`camp="sorcier"`) — et le sur-titre le nomme
 * (« MAGIE JOUÉE » / « SORT DU SORCIER ») : on lit d'un coup d'œil qui a
 * lancé le sort, sans quitter la table des yeux.
 */
function SpellAnnouncement({ annonce, camp = 'joueur' }) {
  const carte = cardById(annonce?.carteId);
  if (!carte) return null;
  const sorcier = camp === 'sorcier';
  const contre = Boolean(annonce.contre);
  // La vague d'un sort à écho (le Nuage de cendres) : au début du tour
  // suivant de son lanceur, la carte se réaffiche en preview et le bandeau
  // nomme la vague au lieu d'une magie qui partirait pour la première fois.
  const vague = Boolean(annonce.vague);
  return (
    <section
      className={`rpg-spell-played${sorcier ? ' rpg-spell-played--sorcier' : ''}${contre ? ' rpg-spell-played--contre' : ''}${vague ? ' rpg-spell-played--vague' : ''}`}
      role="status"
      aria-label={contre
        ? `Contre : ${carte.name} défait ${annonce.cible.nom}.`
        : vague
          ? `Seconde vague : ${carte.name}. Cible : ${annonce.cible.nom}.`
          : `${sorcier ? 'Magie du sorcier' : 'Magie jouée'} : ${carte.name}. Cible : ${annonce.cible.nom}.`}
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
            `rpg-battle.css`). Une vague reprend la teinte du sort : elle est
            le même sort qui retombe, pas une nouvelle magie. */}
        <span className={`rpg-spell-played__eyebrow${contre ? '' : classeLigneFamille(carte)}`}>{contre ? 'CONTRE DU SORCIER' : vague ? 'SECONDE VAGUE' : sorcier ? 'SORT DU SORCIER' : 'MAGIE JOUÉE'}</span>
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

/** Bandeau d'attente d'un choix ou d'une action du joueur, affiché au centre
 *  de la table dans le même style que « Votre tour » (`AnnonceTour`). */
function AnnonceActionJoueur({ invite, decalee = false }) {
  return (
    <div
      className={`rpg-annonce-action${decalee ? ' is-avec-annonce-tour' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {invite && (
        <p key={invite.cle} className={`rpg-annonce-action__bandeau is-joueur${invite.classe ? ` ${invite.classe}` : ''}`}>
          <span className="rpg-annonce-tour__lamp" aria-hidden="true" />
          <strong>{invite.texte}</strong>
          <span className="rpg-annonce-tour__lamp" aria-hidden="true" />
        </p>
      )}
    </div>
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

/** Le journal visuel du duel — les échanges et morts récents, avec les cartes
 * impliquées —, dans l’esprit du journal de combat de MTG Arena, mais **replié
 * en onglet**. Il restait auparavant déplié en permanence dans l’angle
 * inférieur gauche : quatre événements, vignettes comprises, sur 286 × 154 px.
 * Au doigt (784 × 356), ce panneau recouvrait la plaque du sorcier joueur — la
 * vie, la main, le paquet, le cimetière — et la première carte de la main. Le
 * journal devient une capsule dans le coin libre de la table, qui ne dit que
 * les faits non lus ; le récit s’ouvre par-dessus le champ, sur demande, et
 * jamais dessous. */
export function CombatFeed({ events = [] }) {
  const evenements = Array.isArray(events) ? events : [];
  const panneauId = useId();
  const [ouvert, setOuvert] = useState(false);
  // L’identifiant du dernier fait lu : panneau ouvert, les événements qui
  // arrivent sont lus au fil de l’eau ; refermé, chacun rallume le badge.
  const [vuJusqua, setVuJusqua] = useState(null);
  const racineRef = useRef(null);
  const dernierId = evenements.length ? evenements[evenements.length - 1].id : null;
  useEffect(() => {
    if (ouvert) setVuJusqua(dernierId);
  }, [ouvert, dernierId]);
  // Le panneau se referme comme une infobulle : un toucher ailleurs sur la
  // table (le geste de jeu passe, lui, sans être avalé) ou Échap. L’onglet et
  // la croix restent les deux sorties évidentes.
  useEffect(() => {
    if (!ouvert) return undefined;
    const fermerHors = (event) => {
      if (!racineRef.current?.contains(event.target)) setOuvert(false);
    };
    const fermerEchap = (event) => {
      if (event.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('pointerdown', fermerHors, true);
    window.addEventListener('keydown', fermerEchap);
    return () => {
      document.removeEventListener('pointerdown', fermerHors, true);
      window.removeEventListener('keydown', fermerEchap);
    };
  }, [ouvert]);
  if (!evenements.length) return null;
  const recentes = evenements.slice(-4).reverse();
  const indexVu = vuJusqua === null ? -1 : evenements.findIndex((evenement) => evenement.id === vuJusqua);
  const nonVus = indexVu < 0 ? evenements.length : evenements.length - indexVu - 1;
  const lu = nonVus > 0 ? `, ${nonVus} fait${nonVus > 1 ? 's' : ''} non lu${nonVus > 1 ? 's' : ''}` : '';
  return (
    <aside ref={racineRef} className={`rpg-combat-feed${ouvert ? ' is-open' : ''}`} aria-label="Journal des actions du duel">
      <button
        type="button"
        className="rpg-combat-feed__toggle"
        aria-expanded={ouvert}
        aria-controls={panneauId}
        aria-label={`${ouvert ? 'Fermer' : 'Ouvrir'} le journal du duel${lu}`}
        title="Journal du duel"
        onClick={() => setOuvert((etaitOuvert) => !etaitOuvert)}
      >
        <span className="rpg-combat-feed__crest" aria-hidden="true">⚔</span>
        <span className="rpg-combat-feed__label">Journal</span>
        {!ouvert && nonVus > 0 && (
          <span className="rpg-combat-feed__badge" key={nonVus} aria-hidden="true">{nonVus > 9 ? '9+' : nonVus}</span>
        )}
        <span className="rpg-combat-feed__chevron" aria-hidden="true" />
      </button>
      <div className="rpg-combat-feed__panel" id={panneauId} hidden={!ouvert}>
        <div className="rpg-combat-feed__heading">
          <span aria-hidden="true">⚔</span>
          <strong>Journal du duel</strong>
          <button type="button" className="rpg-combat-feed__close" onClick={() => setOuvert(false)} aria-label="Fermer le journal du duel">✕</button>
        </div>
        <ol className="rpg-combat-feed__list" aria-live="polite" aria-relevant="additions">
          {recentes.map((event) => {
            const killers = event.killers ?? [];
            return (
              <li className={`rpg-combat-feed__event${event.type === 'hit' ? ' is-hit' : event.type === 'prise' ? ' is-prise' : ' is-death'}`} key={event.id}>
                <div className="rpg-combat-feed__participants">
                  {killers.length ? killers.slice(0, 2).map((killer) => (
                    <span className="rpg-combat-feed__card" key={killer.id} title={killer.name}>
                      <img src={cardArt(killer.carteId)} alt="" />
                      <span>{killer.name}</span>
                    </span>
                  )) : <span className="rpg-combat-feed__cause">Effet de jeu</span>}
                  <span className="rpg-combat-feed__arrow" aria-hidden="true">➜</span>
                  <span className="rpg-combat-feed__card rpg-combat-feed__card--victim" title={event.victim.name}>
                    <img src={cardArt(event.victim.carteId)} alt="" />
                    <span>{event.victim.name}</span>
                  </span>
                  {event.type === 'death'
                    ? <span className="rpg-combat-feed__skull" aria-label="détruite">☠</span>
                    : event.type === 'prise'
                      ? <span className="rpg-combat-feed__skull" aria-label="prise en cale">⛓</span>
                      : <span className="rpg-combat-feed__damage" aria-label={`${event.amount} dégâts`}>−{event.amount}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
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
const RPG_SFX_VOLUME_KEY = 'letsplay_sablier_sfx_volume_v1';
const RPG_MUSIC_VOLUME_KEY = 'letsplay_sablier_music_volume_v1';
function readRpgSoundPref() {
  try { return window.localStorage.getItem(RPG_SOUND_KEY) !== 'off'; } catch { return true; }
}
function writeRpgSoundPref(value) {
  try { window.localStorage.setItem(RPG_SOUND_KEY, value ? 'on' : 'off'); } catch { /* stockage indisponible */ }
}
function readRpgVolumePref(key, fallback = 1) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === '') return fallback;
    return clampRpgVolume(raw);
  } catch { return fallback; }
}
function writeRpgVolumePref(key, value) {
  try { window.localStorage.setItem(key, String(clampRpgVolume(value))); } catch { /* stockage indisponible */ }
}

/**
 * Le palier qui sonne — `monteeNiveau`, posé par `useSablierBourse.js`.
 *
 * Deux visages, jamais les deux à la fois :
 *
 *   - **le paquet offert** : la même cérémonie qu'au Souk (`RpgBoosterOuverture`),
 *     montée par la page et non par l'écran du Souk, parce qu'un niveau tombe
 *     aussi en plein duel — et qu'une cérémonie `position: fixed` passe
 *     au-dessus de la table (`rpg-profil.css`) ;
 *   - **l'annonce seule** : quand le comptoir ne peut pas encore tirer, la dette
 *     reste au profil (`boostersDus`) et le joueur lit son niveau, sans paquet.
 *
 * Les cartes sont déjà rangées dans la collection avant l'affichage : fermer
 * l'onglet au milieu d'un retournement ne coûte rien, comme au Souk.
 */
function MonteeDeNiveau({ montee, profil, cardArt, onFermer, onPlaySfx }) {
  if (!montee) return null;
  if (montee.ouverture) {
    return (
      <RpgBoosterOuverture
        key={montee.token}
        ouverture={montee.ouverture}
        cardArt={cardArt}
        onFermer={onFermer}
        onPlaySfx={onPlaySfx}
      />
    );
  }
  const dus = montee.dus ?? 0;
  return (
    <div className="rpg-niveau-toast" role="status" aria-live="polite" data-niveau-toast={montee.vers} data-niveau-dus={dus}>
      <span className="rpg-niveau-toast__glyphe" aria-hidden="true">{glypheEmbleme(profil)}</span>
      <strong>Niveau {montee.vers}</strong>
      <span>
        {dus > 0
          ? `${dus} paquet${dus > 1 ? 's' : ''} de palier ${dus > 1 ? 'vous attendent' : 'vous attend'} au comptoir`
          : 'la barre a monté'}
      </span>
      <button
        type="button"
        className="rpg-niveau-toast__fermer"
        onClick={() => { try { onPlaySfx?.('menu'); } catch {} onFermer?.(); }}
        aria-label="Fermer l’annonce du niveau"
      >
        ✕
      </button>
    </div>
  );
}

function GameModeMenu({ screen, selectedDeckId, onSelectDeck, onChangeScreen, onStartGame, onStartManaEssai, onStartTutorial, onStartCardGuide, onResumeGame, hasGame, progressionHistoire, onStartEtage, onResetHistoire, onContinueRecit, onJournalRecit, onRestartRecit, sauvegardeHistoireOk, duelEnCours, campagneEnCours, decksMaison, collection, statutSync, onEnregistrerDeckMaison, onSupprimerDeckMaison, onHoverCard, onLeaveHoverCard, onOpenCardPreview, onPlaySfx, fullscreen, onToggleFullscreen, credits, aReclamer, quetes, onReclamerQuete, onReclamerCachet, onReclamerSemaine, portefeuille, progression, ouverture, onOuvrirBooster, onOuvrirCoffret, onFermerOuverture, profil = null, barreXp = null, paquetsDePalierEnAttente = 0, nomCompte = null, onRenommerProfil = null, onChoisirEmbleme = null, decor3dActif = true, onToggleDecor3d, sonActif = true, onToggleSound, volumeSfx = 1, onChangeVolumeSfx, onToggleSfxMute, volumeMusique = 1, onChangeVolumeMusique, onToggleMusicMute, desktopMode = false, desktopAccount = null, onSignOut }) {
  const [catalogueCouleur, setCatalogueCouleur] = useState('toutes');
  const [catalogueType, setCatalogueType] = useState('tous');
  const [catalogueRarete, setCatalogueRarete] = useState('toutes');
  const [catalogueCollection, setCatalogueCollection] = useState('toutes');
  const [catalogueCout, setCatalogueCout] = useState('tous');
  const [catalogueRecherche, setCatalogueRecherche] = useState('');
  const [openDeckId, setOpenDeckId] = useState(null);
  const [deckCouleur, setDeckCouleur] = useState('toutes');
  const [confirmation, setConfirmation] = useState(null);
  // Mode Tours (Jeu Solo) : galerie puis détail d'une tour sélectionnée.
  const [tourLibreOuverteId, setTourLibreOuverteId] = useState(null);
  const [confirmerResetHistoire, setConfirmerResetHistoire] = useState(false);
  const [erreurResetHistoire, setErreurResetHistoire] = useState(false);
  const storyRef = useRef(null);
  const libreRef = useRef(null);
  const derniereTourLibreRef = useRef(null);
  // La suppression d'un deck maison se confirme en deux temps (jamais de `window.confirm`).
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  // L'atelier : `null` (fermé), `{ mode: 'nouveau' }`, `{ mode: 'edition', id }`
  // ou `{ mode: 'copie', deck }` — partir d'un deck du catalogue pour l'adapter.
  const [atelier, setAtelier] = useState(null);
  const [partieRapideOuverte, setPartieRapideOuverte] = useState(false);
  const [partieRapideChoix, setPartieRapideChoix] = useState(null);
  const detailRef = useRef(null);
  // L’onglet Messagerie porte la pastille du site : les messages non lus
  // d’abord, les demandes d’amis sinon — le détail est dans l’`aria-label`.
  // `?? {}` : sans fournisseur (vérifications jsdom), le contexte est inerte.
  const messagesContexte = useMessages() ?? {};
  const friendsContexte = useFriends() ?? {};
  const messagerieNonLus = messagesContexte.unreadTotal ?? 0;
  const messagerieDemandes = friendsContexte.pendingCount ?? 0;
  const messageriePastille = messagerieNonLus > 0 ? messagerieNonLus : messagerieDemandes;
  const play = (n) => { try { onPlaySfx?.(n); } catch {} };
  // La barre de l'onglet Profil : celle que le hook a déjà calculée, ou sa
  // recopie locale quand la page est montée sans lui (vérifications jsdom).
  // Un profil absent se lit « niveau 1, 0 XP » — l'onglet ne casse jamais.
  const barreOnglet = barreXp ?? progressionDeXp(profil?.xp ?? 0);
  const niveauOnglet = barreOnglet.niveau;
  const resteOnglet = xpLisible(barreOnglet.reste);
  // L'onglet ne peut pas écrire ses chiffres : c'est l'`aria-label` qui les dit,
  // en une phrase — construite ici, hors du gabarit, pour qu'aucun retour à la
  // ligne d'indentation ne se glisse dans la lecture d'écran.
  const ariaOngletProfil = [
    `Profil du joueur — niveau ${niveauOnglet}`,
    barreOnglet.maximal
      ? 'niveau maximal atteint'
      : `${resteOnglet} XP avant le niveau ${barreOnglet.suivant}`,
    paquetsDePalierEnAttente > 0
      ? `${paquetsDePalierEnAttente} paquet${paquetsDePalierEnAttente > 1 ? 's' : ''} de palier à ouvrir`
      : null,
  ].filter(Boolean).join(', ');
  const compteDesktopLabel = desktopAccountName(desktopAccount);
  const deconnecterCompteDesktop = async () => {
    play('menu');
    try { await onSignOut?.(); } catch { /* la session locale est déjà coupée */ }
  };
  // L'étagère : les sept decks du catalogue, puis les boîtiers maison.
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
  // Le Catalogue est une encyclopédie : il montre vraiment toutes les cartes,
  // y compris les terrains et les cartes archivées hors du format de deck.
  // L’atelier, lui, conserve son filtre de jouabilité.
  const rechercheCatalogueNormalisee = catalogueRecherche
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
  const filtresCatalogueActifs = Boolean(rechercheCatalogueNormalisee)
    || catalogueCouleur !== 'toutes'
    || catalogueType !== 'tous'
    || catalogueRarete !== 'toutes'
    || catalogueCollection !== 'toutes'
    || catalogueCout !== 'tous';
  const reinitialiserFiltresCatalogue = () => {
    setCatalogueCouleur('toutes');
    setCatalogueType('tous');
    setCatalogueRarete('toutes');
    setCatalogueCollection('toutes');
    setCatalogueCout('tous');
    setCatalogueRecherche('');
  };
  const cartesCatalogue = RPG_DUEL_CARDS.filter((carte) => {
    const colors = cardColors(carte);
    const couleurCorrespond = catalogueCouleur === 'toutes'
      || (catalogueCouleur === 'hybride' ? colors.length > 1 : colors.includes(catalogueCouleur));
    const rareteCorrespond = catalogueRarete === 'toutes' || cardRarityInfo(carte).key === catalogueRarete;
    const estPossedee = possedeCarte(collection, carte.id);
    const collectionCorrespond = catalogueCollection === 'toutes'
      || (catalogueCollection === 'possedees' ? estPossedee : !estPossedee);
    const cout = Number(carte.cost);
    const coutCorrespond = catalogueCout === 'tous'
      || (catalogueCout === 'terrain' ? carte.kind === 'terrain'
        : carte.kind !== 'terrain' && (catalogueCout === '0-2' ? cout <= 2
          : catalogueCout === '3-4' ? cout >= 3 && cout <= 4
            : cout >= 5));
    const texteCarte = [
      carte.name,
      carte.typeLine,
      carte.text,
      carte.element,
      ...colors,
      carteFamille(carte),
      cardRarityInfo(carte).label,
    ].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
    const rechercheCorrespond = !rechercheCatalogueNormalisee || texteCarte.includes(rechercheCatalogueNormalisee);
    return couleurCorrespond
      && (catalogueType === 'tous' || carte.kind === catalogueType)
      && rareteCorrespond
      && collectionCorrespond
      && coutCorrespond
      && rechercheCorrespond;
  });
  // Voile noir volontairement léger : le keyart de Bab El reste lisible derrière
  // les menus, le côté gauche garde assez d'ombre pour porter les textes.
  const menuBackground = `linear-gradient(105deg, rgba(8, 7, 13, .80) 0%, rgba(8, 7, 13, .58) 48%, rgba(8, 7, 13, .40) 100%), url("${import.meta.env.BASE_URL}sablier-de-bab-el-keyart.jpg")`;
  // Quitter l'onglet Deck referme l'étagère et l'atelier : le prochain passage repart sans liste.
  useEffect(() => { if (screen !== 'decks') { setOpenDeckId(null); setAtelier(null); } }, [screen]);
  useEffect(() => { if (screen !== 'jouer') setPartieRapideOuverte(false); }, [screen]);
  useEffect(() => {
    if (!partieRapideOuverte) return;
    const onKey = (event) => { if (event.key === 'Escape') setPartieRapideOuverte(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [partieRapideOuverte]);
  // Quitter l'onglet Tours / Jeu Solo referme la tour libre ouverte : la galerie réapparaît.
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
      const carte = libreRef.current?.querySelector(`[data-tour="${derniereTourLibreRef.current}"]`) || libreRef.current?.querySelector(`[data-tour-libre="${derniereTourLibreRef.current}"]`);
      carte?.focus?.({ preventScroll: true });
      carte?.scrollIntoView?.({ behavior: 'auto', block: 'nearest' });
    }
  }, [screen, tourLibreOuverteId]);
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
          {/* Le jeu couvre tout l'écran, barre du site comprise : sans cette
              sortie, on ne quittait le Sablier qu'avec le bouton « retour » du
              navigateur. Un lien simple (pas de routeur) : la page se monte
              aussi hors `<BrowserRouter>` dans les vérifications jsdom. */}
          <a
            className="rpg-mode-menu__quitter"
            href={`${import.meta.env.BASE_URL}jeu`}
            onClick={() => play('menu')}
            title="Quitter le Sablier — retour aux jeux"
            aria-label="Quitter le Sablier — retour aux jeux"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </a>
          <nav className="rpg-mode-menu__switch" aria-label="Modes de jeu">
            {/* Le profil ouvre la barre, comme une pièce d'identité : l'emblème,
                le niveau, et la barre d'XP en miniature — le palier qui attend
                son paquet porte une pastille. L'aria-label dit le chiffre que la
                miniature ne peut pas écrire. */}
            <button
              type="button"
              className={`rpg-mode-menu__profil${screen === 'profil' ? ' is-active' : ''}`}
              aria-current={screen === 'profil' ? 'page' : undefined}
              aria-label={ariaOngletProfil}
              data-profil-onglet={niveauOnglet}
              onClick={() => { play('menu'); onChangeScreen('profil'); }}
            >
              <span className="rpg-mode-menu__profil-embleme" aria-hidden="true">{glypheEmbleme(profil)}</span>
              <span className="rpg-mode-menu__onglet-libelle">Profil</span>
              <span className="rpg-mode-menu__profil-niveau" data-profil-niveau={niveauOnglet}>NIV. {niveauOnglet}</span>
              <span className="rpg-mode-menu__profil-xp" aria-hidden="true">
                <i style={{ width: `${barreOnglet.percent}%` }} data-profil-xp-onglet={barreOnglet.percent} />
              </span>
              {paquetsDePalierEnAttente > 0 && (
                <span className="rpg-mode-menu__profil-pastille" data-profil-pastille={paquetsDePalierEnAttente} aria-hidden="true">
                  {paquetsDePalierEnAttente}
                </span>
              )}
            </button>
            <button type="button" className={screen === 'jouer' ? 'is-active' : ''} aria-current={screen === 'jouer' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('jouer'); }}>
              <span aria-hidden="true">⚔</span> Jouer
            </button>
            <button type="button" className={screen === 'histoire' ? 'is-active' : ''} aria-current={screen === 'histoire' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('histoire'); }}>
              <span aria-hidden="true">⌛</span> Histoire
            </button>
            <button type="button" className={screen === 'tours' ? 'is-active' : ''} aria-current={screen === 'tours' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('tours'); }}>
              <span aria-hidden="true">🗼</span> Jeu Solo
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
            <button type="button" className={screen === 'parametres' ? 'is-active' : ''} aria-current={screen === 'parametres' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('parametres'); }}>
              <span aria-hidden="true">⚙</span> Paramètres
            </button>
            {/* La messagerie a son onglet, comme le Souk ou le Catalogue : la
                fenêtre sociale du site flotte en bas de l’écran, mais le jeu
                est une couche plein écran (surtout en plein écran natif de
                l’APK) qui la recouvre — sur mobile, la messagerie n’apparaît
                pas en bas de l’écran. Elle vit donc DANS le jeu, dans son
                propre onglet, avec la bulle « Let’s Talk » et la pastille des
                non-lus (les défis du duel en ligne passent par elle). */}
            <button
              type="button"
              className={`rpg-mode-menu__messagerie${screen === 'messagerie' ? ' is-active' : ''}`}
              aria-current={screen === 'messagerie' ? 'page' : undefined}
              aria-label={`Messagerie Let’s Talk — défis du Sablier${messageriePastille > 0 ? ` (${messageriePastille} en attente)` : ''}`}
              data-rpg-messagerie-onglet={messageriePastille}
              onClick={() => { play('menu'); onChangeScreen('messagerie'); }}
            >
              <LetsTalkMark className="rpg-mode-menu__messagerie-mark" typing={messagerieNonLus > 0} />
              <span className="rpg-mode-menu__onglet-libelle">Messagerie</span>
              {messageriePastille > 0 && (
                <span className="rpg-mode-menu__messagerie-pastille" aria-hidden="true">
                  {messageriePastille}
                </span>
              )}
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
                  UN DUEL · DEUX DECKS · 30 CARTES · SANS TERRAIN
                </span>
                <h2>Le sable se souvient.<br /><em>À vous d’écrire la suite.</em></h2>
                <p>Déclarez vos attaques, choisissez vos bloqueurs et remportez la bataille des portes de Bab El. Chaque carte compte, chaque mana compte, chaque choix façonne votre victoire.</p>
                <div className="rpg-mode-menu__hero-actions">
                  {/* Deux entrées de tête — le récit et le duel en ligne — puis
                      deux raccourcis (partie rapide, tutoriel). La grille 2 × 2
                      remplace l'ancien empilement : le duel en ligne n'est plus
                      un troisième bouton orphelin sous une paire, et il passe
                      au même rang que le mode Histoire. */}
                  <button type="button" className="rpg-menu-button rpg-menu-button--primary rpg-menu-button--histoire rpg-menu-button--glow" onClick={() => { play('select'); onContinueRecit?.(); }}>
                    <span className="rpg-menu-button__thumb" aria-hidden="true">
                      <img src={`${import.meta.env.BASE_URL}sablier-story/mode-histoire.jpg`} alt="" />
                    </span>
                    <span className="rpg-menu-button__text">
                      <strong>Mode histoire</strong>
                      <small>La campagne des Tours de Bab El</small>
                    </span>
                    <span className="rpg-menu-button__arrow" aria-hidden="true">→</span>
                  </button>
                  <a className="rpg-menu-button rpg-menu-button--en-ligne" href={`${import.meta.env.BASE_URL}jeu/sablier-de-bab-el/defi`} onClick={() => play('select')}>
                    <IconePorte nom="en-ligne" />
                    <span className="rpg-menu-button__text">
                      <strong>
                        Duel en ligne
                        <span className="rpg-menu-button__live" aria-hidden="true" />
                        <span className="sr-only">(en ligne)</span>
                      </strong>
                      <small>Défier un ami par lien, ou entrer un code</small>
                    </span>
                    <span className="rpg-menu-button__arrow" aria-hidden="true">→</span>
                  </a>
                  <div className="rpg-mode-menu__secondary-actions">
                    <button type="button" className="rpg-menu-button rpg-menu-button--partie-rapide" onClick={() => { play('select'); setPartieRapideChoix(playerDeck?.id ?? decksTous.filter((deck) => deckSeJoue(deck, collection))[0]?.id ?? ''); setPartieRapideOuverte(true); }}>
                      <IconePorte nom="partie-rapide" />
                      <span className="rpg-menu-button__text">
                        <strong>Partie rapide</strong>
                        <small>Choisir un deck et affronter l’ordinateur</small>
                      </span>
                    </button>
                    <button type="button" className="rpg-menu-button rpg-menu-button--tutorial" onClick={() => { play('select'); onChangeScreen('tutoriels'); }}>
                      <IconePorte nom="tutoriels" />
                      <span className="rpg-menu-button__text">
                        <strong>Apprendre à jouer</strong>
                        <small>{RPG_TUTORIELS.length} leçons guidées · récompenses en <RpgCreditIcon /></small>
                      </span>
                    </button>
                  </div>
                </div>
                <section className="rpg-flux-menu" aria-label="Présentation de l’histoire du Sablier">
                  <span className="rpg-flux-menu__eyebrow">L’HISTOIRE · BAB EL</span>
                  <h3>Une cité verticale face au désert qui monte.</h3>
                  <p>
                    <em>Le Sablier</em> se passe à Bab El, une cité verticale de neuf étages construite autour d’un portail scellé, au-dessus d’un désert dont le sable monte inexorablement. À chaque cycle d’une horloge géante — l’Astrolabe —, l’étage du bas est englouti, et une administration très polie mais implacable, la Chambre des Heures, publie <em>la Liste</em> de ceux qui ont le droit de monter… et de ceux qu’on abandonne.
                  </p>
                  <p>
                    L’histoire démarre quand Salem, un sauveteur qui fouille les étages condamnés, remonte douze survivants d’un quartier officiellement déclaré vide : sur le papier, ils n’existent plus, donc personne ne veut les loger. Avec Yamina, une ancienne horlogère repentie, et quelques alliés, il invoque un ancien droit de contestation — qui se règle par des duels de cartes faites de mémoire et de pactes — pour forcer la Chambre à réinscrire ces douze oubliés… avant de découvrir que ces effacements cachent le vrai secret du portail de Bab El.
                  </p>
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
          <main className="rpg-mode-menu__play rpg-mode-menu__play--full rpg-story rpg-story--solo" ref={libreRef} aria-label="Jeu Solo — les Tours de Bab El">
            {tourLibreOuverteId ? (
              <div className="rpg-story__detail">
                <button type="button" className="rpg-story__back" onClick={() => { play('menu'); setTourLibreOuverteId(null); }}>
                  <span aria-hidden="true">←</span> Retour aux tours
                </button>
                {(() => {
                  const tourLibre = tourHistoireParId(tourLibreOuverteId);
                  const resumeLibre = resumeTourHistoire(tourLibre.id, progressionHistoire);
                  // L'affiche des gains de la tour : le barème de chaque étage,
                  // le butin du sommet, et ce qui est déjà en poche.
                  const gainsLibre = gainsDeTour(tourLibre.id, {
                    etagesVaincus: progressionHistoire?.etagesVaincus,
                    toursPayees: portefeuille?.toursPayees,
                  });
                  return (
                    <section key={tourLibre.id} className="rpg-story-tour">
                      <header className="rpg-story-tour__header">
                        <RpgStoryTowerPreview tour={tourLibre} className="rpg-story-tour__banner" detail />
                        <div className="rpg-story-tour__heading">
                          <span className="rpg-mode-menu__eyebrow">JEU SOLO · {resumeLibre.vaincus} / {resumeLibre.total} ÉTAGES DÉBLAYÉS</span>
                          <h3>{tourLibre.nom}</h3>
                          <p>{tourLibre.resume}</p>
                        </div>
                      </header>
                      <div className="rpg-story-tour__progress" aria-hidden="true">
                        <span style={{ width: `${resumeLibre.total ? (resumeLibre.vaincus / resumeLibre.total) * 100 : 0}%` }} />
                      </div>
                      {gainsLibre && (
                        <div className="rpg-story-tour__gains" data-tour-butin={tourLibre.id} data-butin-gagne={gainsLibre.butinGagne ? 'oui' : 'non'}>
                          <span className="rpg-story-tour__gains-total">
                            <RpgCreditIcon />
                            <b>{creditsLisible(gainsLibre.dejaGagne)}</b> / {creditsLisible(gainsLibre.total)} crédits gagnés sur cette tour
                          </span>
                          <span className={`rpg-story-tour__gains-butin${gainsLibre.butinGagne ? ' is-gagne' : gainsLibre.complete ? ' is-due' : ''}`}>
                            <b>Butin de la tour : +{creditsLisible(gainsLibre.butin)} crédits</b>
                            {gainsLibre.butinGagne
                              ? ' — encaissé ✓'
                              : gainsLibre.complete
                                ? ' — tous les étages sont déblayés : il tombera à votre prochaine victoire ici'
                                : ' — versé quand tous les étages seront déblayés'}
                          </span>
                        </div>
                      )}
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
                                <span className="rpg-story-floor__gain" data-etage-gain={etage.id}>
                                  <RpgCreditIcon />
                                  {vaincu
                                    ? <>+{creditsLisible(GAINS.etagePremiere)} crédits gagnés · rejeu +{creditsLisible(GAINS.etageRejoue)}</>
                                    : <>+{creditsLisible(GAINS.etagePremiere)} crédits au premier déblayage</>}
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
                    <span className="rpg-mode-menu__eyebrow">JEU SOLO · LES TOURS DE BAB EL</span>
                    <h2>Choisissez votre défi</h2>
                    <p>Gravissez les tours étage par étage. Chaque victoire débloque l'étage suivant. Deck complet et PV pleins à chaque duel.</p>
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
                  <p>Effacer les victoires d’étages sur cet appareil ? Les étages seront verrouillés de nouveau. Vos cartes et decks seront conservés.</p>
                  <button type="button" className="rpg-narrative-button" onClick={() => { play('annuler'); const ok = onResetHistoire(); setErreurResetHistoire(!ok); if (ok) setConfirmerResetHistoire(false); }}>Confirmer l’effacement</button>
                  <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={() => setConfirmerResetHistoire(false)}>Annuler</button>
                </div>}
                <div className="rpg-story__tours">
                  {RPG_STORY_TOURS.map((tour) => {
                    const resume = resumeTourHistoire(tour.id, progressionHistoire);
                    // Ce que la tour rapporte — étages et butin du sommet — et
                    // ce qui est déjà en poche : les deux se lisent sur la carte.
                    const gains = gainsDeTour(tour.id, {
                      etagesVaincus: progressionHistoire?.etagesVaincus,
                      toursPayees: portefeuille?.toursPayees,
                    });
                    return (
                      <button
                        key={tour.id}
                        type="button"
                        className="rpg-story-tower"
                        data-tour={tour.id}
                        data-tour-libre={tour.id}
                        onClick={() => { play('select'); setTourLibreOuverteId(tour.id); }}
                      >
                        <RpgStoryTowerPreview tour={tour} className="rpg-story-tower__art" />
                        <span className="rpg-story-tower__body">
                          <span className="rpg-mode-menu__eyebrow">{resume.vaincus} / {resume.total} ÉTAGES DÉBLAYÉS</span>
                          <strong className="rpg-story-tower__name">{tour.nom}</strong>
                          <small className="rpg-story-tower__resume">{tour.resume}</small>
                          {gains && (
                            <span
                              className={`rpg-story-tower__loot${gains.reste === 0 ? ' is-complet' : ''}`}
                              data-tour-gains={tour.id}
                              data-gains-gagnes={gains.dejaGagne}
                              data-gains-total={gains.total}
                            >
                              <RpgCreditIcon />
                              <b>{creditsLisible(gains.dejaGagne)}</b> / {creditsLisible(gains.total)} crédits gagnés
                              {gains.reste > 0 && <small>encore {creditsLisible(gains.reste)} à gagner</small>}
                            </span>
                          )}
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
          <main ref={storyRef} className="rpg-story" aria-label="Mode Histoire — La Dernière Liste">
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
            <div className="rpg-story__footer">
              {!confirmerResetHistoire && (
                <button
                  type="button"
                  className="rpg-story__reset"
                  onClick={() => { play('menu'); setErreurResetHistoire(false); setConfirmerResetHistoire(true); }}
                >
                  Effacer la progression
                </button>
              )}
              {confirmerResetHistoire && <div className="rpg-story__reset-confirm" role="group" aria-label="Confirmer l’effacement de la progression">
                {erreurResetHistoire && <p role="status">La progression n’a pas été effacée : impossible de conserver vos cartes sur cet appareil. Libérez de l’espace avant de réessayer.</p>}
                <p>Effacer le récit et les victoires sur cet appareil ? Les étages seront verrouillés de nouveau. Vos cartes et decks seront conservés.</p>
                <button type="button" className="rpg-narrative-button" onClick={() => { play('annuler'); const ok = onResetHistoire(); setErreurResetHistoire(!ok); if (ok) setConfirmerResetHistoire(false); }}>Confirmer l’effacement</button>
                <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={() => setConfirmerResetHistoire(false)}>Annuler</button>
              </div>}
            </div>
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
                <p>Cliquez un boîtier pour voir ses cartes ; «{'\u00a0'}Sélectionner{'\u00a0'}» le retient pour vos prochaines parties. Le boîtier « Nouveau deck » ouvre l’atelier.</p>
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
        )) : screen === 'tutoriels' ? (
          <RpgTutorialMenu
            tutoriels={RPG_TUTORIELS}
            termines={portefeuille?.tutoriels ?? []}
            credits={credits}
            onStart={(tutorielId) => onStartTutorial?.(tutorielId)}
            onExit={() => onChangeScreen('jouer')}
            onPlaySfx={play}
          />
        ) : screen === 'guide' ? (
          <RpgCardGuide
            cardArt={cardArt}
            hasGame={hasGame}
            onResumeGame={onResumeGame}
            onPlaySfx={play}
            onExit={() => onChangeScreen('jouer')}
          />
        ) : screen === 'profil' ? (
          <RpgProfilJoueur
            profil={profil}
            collection={collection}
            portefeuille={portefeuille}
            quetes={quetes}
            statutSync={statutSync}
            nomCompte={nomCompte}
            onRenommer={onRenommerProfil}
            onChoisirEmbleme={onChoisirEmbleme}
            onOuvrirSouk={() => { play('menu'); onChangeScreen('souk'); }}
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
        ) : screen === 'catalogue' ? (
          <main className="rpg-card-catalogue" aria-label="Catalogue complet des cartes">
            <header className="rpg-card-catalogue__header">
              <div>
                <span className="rpg-mode-menu__eyebrow">COLLECTION COMPLÈTE · {RPG_DUEL_CARDS.length} CARTES</span>
                <h2>Catalogue</h2>
                <p>Parcourez les créatures, héros, terrains, magies et armes de Bab El — cliquez une carte pour l’ouvrir en grand, illustration et effets.</p>
              </div>
            </header>
            <div className="rpg-card-catalogue__filters" aria-label="Recherche et filtres du catalogue">
              <label className="rpg-card-catalogue__search">
                <span>Recherche</span>
                <input
                  type="search"
                  aria-label="Rechercher dans le catalogue"
                  placeholder="Nom, capacité, élément…"
                  value={catalogueRecherche}
                  onChange={(event) => setCatalogueRecherche(event.target.value)}
                />
              </label>
              <label>
                <span>Couleur</span>
                <select aria-label="Filtrer par couleur" value={catalogueCouleur} onChange={(event) => { play('menu'); setCatalogueCouleur(event.target.value); }}>
                  <option value="toutes">Toutes les couleurs</option>
                  <option value="braise">Braise</option>
                  <option value="eau">Eau</option>
                  <option value="sable">Sable · Désert</option>
                  <option value="neige">Neige · Glacier</option>
                  <option value="tenebres">Ténèbres</option>
                  <option value="hybride">Hybrides · deux couleurs ou plus</option>
                </select>
              </label>
              <label>
                <span>Type</span>
                <select aria-label="Filtrer par type" value={catalogueType} onChange={(event) => { play('menu'); setCatalogueType(event.target.value); }}>
                  <option value="tous">Tous les types</option>
                  <option value="creature">Créatures</option>
                  <option value="hero">Héros</option>
                  <option value="site">Sites</option>
                  <option value="magie">Magies</option>
                  <option value="arme">Armes</option>
                </select>
              </label>
              <label>
                <span>Rareté</span>
                <select aria-label="Filtrer par rareté" value={catalogueRarete} onChange={(event) => { play('menu'); setCatalogueRarete(event.target.value); }}>
                  <option value="toutes">Toutes les raretés</option>
                  <option value="commune">Commune</option>
                  <option value="inhabituelle">Inhabituelle</option>
                  <option value="rare">Rare</option>
                  <option value="mythique">Mythique</option>
                </select>
              </label>
              <label>
                <span>Coût</span>
                <select aria-label="Filtrer par coût" value={catalogueCout} onChange={(event) => { play('menu'); setCatalogueCout(event.target.value); }}>
                  <option value="tous">Tous les coûts</option>
                  <option value="terrain">Terrains (sans coût)</option>
                  <option value="0-2">0 à 2</option>
                  <option value="3-4">3 à 4</option>
                  <option value="5+">5 et plus</option>
                </select>
              </label>
              <label>
                <span>Collection</span>
                <select aria-label="Filtrer selon ma collection" value={catalogueCollection} onChange={(event) => { play('menu'); setCatalogueCollection(event.target.value); }}>
                  <option value="toutes">Toutes les cartes</option>
                  <option value="possedees">Possédées</option>
                  <option value="manquantes">À découvrir</option>
                </select>
              </label>
              <button
                type="button"
                className="rpg-card-catalogue__reset"
                disabled={!filtresCatalogueActifs}
                onClick={() => { play('menu'); reinitialiserFiltresCatalogue(); }}
              >
                Réinitialiser
              </button>
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
        ) : null}
        {screen === 'parametres' && (
          <main className="rpg-settings" aria-label="Paramètres du jeu">
            <div className="rpg-settings__header">
              <span className="rpg-mode-menu__eyebrow">LE SABLIER · CONFIGURATION</span>
              <h2>Paramètres</h2>
              <p>Ajustez le décor 3D de la table ainsi que le volume des sons du jeu et des musiques.</p>
            </div>
            <div className="rpg-settings__grid">
              <section className="rpg-settings__card" aria-label="Affichage 3D">
                <div className="rpg-settings__card-head">
                  <div>
                    <span className="rpg-settings__eyebrow">AFFICHAGE & TABLE</span>
                    <h3>Option 3D</h3>
                  </div>
                  <span className={`rpg-settings__status${decor3dActif ? ' is-on' : ''}`}>
                    {decor3dActif ? 'Activée' : 'Désactivée'}
                  </span>
                </div>
                <p className="rpg-settings__desc">
                  Active le décor 3D de la table de duel : relief du plateau, éclairage dynamique, ombres portées et particules d’ambiance.
                </p>
                <button
                  type="button"
                  className={`rpg-settings__toggle rpg-settings__decor3d${decor3dActif ? ' is-on' : ''}`}
                  aria-pressed={Boolean(decor3dActif)}
                  aria-label={decor3dActif ? 'Désactiver le décor 3D de la table' : 'Activer le décor 3D de la table'}
                  onClick={() => { play('menu'); onToggleDecor3d?.(); }}
                >
                  <span className="rpg-settings__toggle-badge" aria-hidden="true">3D</span>
                  <span className="rpg-settings__toggle-copy">
                    <strong>Décor 3D de la table</strong>
                    <small>{decor3dActif ? 'Relief, lumière et particules actifs' : 'Table en peinture 2D classique'}</small>
                  </span>
                  <span className="rpg-settings__toggle-pill" aria-hidden="true">{decor3dActif ? 'ON' : 'OFF'}</span>
                </button>
              </section>

              <section className="rpg-settings__card" aria-label="Contrôle du volume">
                <div className="rpg-settings__card-head">
                  <div>
                    <span className="rpg-settings__eyebrow">AUDIO</span>
                    <h3>Volume des sons et musiques</h3>
                  </div>
                  <button
                    type="button"
                    className={`rpg-settings__mute-all${sonActif ? ' is-on' : ''}`}
                    aria-pressed={Boolean(sonActif)}
                    aria-label={sonActif ? 'Couper tous les sons' : 'Activer tous les sons'}
                    onClick={() => { play('menu'); onToggleSound?.(); }}
                  >
                    <span aria-hidden="true">{sonActif ? '♫' : '♪'}</span>
                    <span>{sonActif ? 'Son actif' : 'Son coupé'}</span>
                  </button>
                </div>

                <div className="rpg-settings__volumes">
                  <div className="rpg-settings__volume-row">
                    <div className="rpg-settings__volume-head">
                      <label htmlFor="rpg-settings-sfx-volume" className="rpg-settings__volume-label">
                        <strong>Sons du jeu</strong>
                        <small>Bruitages des cartes, combats, sorts et interface</small>
                      </label>
                      <div className="rpg-settings__volume-actions">
                        <button
                          type="button"
                          className={`rpg-settings__channel-mute${sonActif && volumeSfx > 0 ? ' is-on' : ''}`}
                          aria-pressed={Boolean(sonActif && volumeSfx > 0)}
                          aria-label={sonActif && volumeSfx > 0 ? 'Couper les sons du jeu' : 'Activer les sons du jeu'}
                          onClick={() => onToggleSfxMute?.()}
                        >
                          {sonActif && volumeSfx > 0 ? '🔊' : '🔇'}
                        </button>
                        <output htmlFor="rpg-settings-sfx-volume" className="rpg-settings__volume-value">
                          {sonActif ? Math.round(volumeSfx * 100) : 0} %
                        </output>
                      </div>
                    </div>
                    <input
                      id="rpg-settings-sfx-volume"
                      type="range"
                      className="rpg-settings__slider rpg-settings__slider--sfx"
                      min="0"
                      max="100"
                      step="1"
                      value={sonActif ? Math.round(volumeSfx * 100) : 0}
                      aria-label="Volume des sons du jeu"
                      onChange={(event) => onChangeVolumeSfx?.(Number(event.target.value) / 100)}
                    />
                  </div>

                  <div className="rpg-settings__volume-row">
                    <div className="rpg-settings__volume-head">
                      <label htmlFor="rpg-settings-music-volume" className="rpg-settings__volume-label">
                        <strong>Musiques</strong>
                        <small>Thème principal, musiques des plateaux et ambiances des tours de l’Histoire</small>
                      </label>
                      <div className="rpg-settings__volume-actions">
                        <button
                          type="button"
                          className={`rpg-settings__channel-mute${sonActif && volumeMusique > 0 ? ' is-on' : ''}`}
                          aria-pressed={Boolean(sonActif && volumeMusique > 0)}
                          aria-label={sonActif && volumeMusique > 0 ? 'Couper les musiques' : 'Activer les musiques'}
                          onClick={() => onToggleMusicMute?.()}
                        >
                          {sonActif && volumeMusique > 0 ? '♫' : '🔇'}
                        </button>
                        <output htmlFor="rpg-settings-music-volume" className="rpg-settings__volume-value">
                          {sonActif ? Math.round(volumeMusique * 100) : 0} %
                        </output>
                      </div>
                    </div>
                    <input
                      id="rpg-settings-music-volume"
                      type="range"
                      className="rpg-settings__slider rpg-settings__slider--music"
                      min="0"
                      max="100"
                      step="1"
                      value={sonActif ? Math.round(volumeMusique * 100) : 0}
                      aria-label="Volume des musiques"
                      onChange={(event) => onChangeVolumeMusique?.(Number(event.target.value) / 100)}
                    />
                  </div>
                </div>
              </section>
              {desktopMode && desktopAccount && onSignOut && (
                <section className="rpg-settings__card rpg-settings__account" aria-label="Compte Let's Play">
                  <div className="rpg-settings__card-head">
                    <div>
                      <span className="rpg-settings__eyebrow">COMPTE PC</span>
                      <h3>Compte connecté</h3>
                    </div>
                    <span className="rpg-settings__status is-on">Actif</span>
                  </div>
                  <p className="rpg-settings__desc">
                    Session ouverte avec{' '}
                    <strong>{compteDesktopLabel}</strong>.
                    {' '}Votre progression synchronisée reste liée à ce compte.
                  </p>
                  <button
                    type="button"
                    className="rpg-settings__signout"
                    onClick={deconnecterCompteDesktop}
                  >
                    <span aria-hidden="true">⏻</span> Se déconnecter
                  </button>
                </section>
              )}
            </div>
          </main>
        )}
        {/* L’onglet Messagerie : la messagerie Let’s Talk vit dans le jeu —
            discussions et défis du duel en ligne, sans quitter la table. */}
        {screen === 'messagerie' && (
          <RpgMessageriePanel variante="ecran" />
        )}
        <footer className="rpg-mode-menu__footer"><span>LE SABLIER</span><span>STRATÉGIE · CRÉATURES · MAGIE</span></footer>
      </div>
      {partieRapideOuverte && (
        <div
          className="rpg-partie-rapide__overlay"
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) setPartieRapideOuverte(false); }}
          onKeyDown={(event) => { if (event.key === 'Escape') setPartieRapideOuverte(false); }}
        >
          <div
            className="rpg-partie-rapide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rpg-partie-rapide-title"
            aria-describedby="rpg-partie-rapide-desc"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="rpg-partie-rapide__header">
              <div>
                <span className="rpg-mode-menu__eyebrow">PARTIE RAPIDE · CONTRE L’ORDINATEUR</span>
                <h2 id="rpg-partie-rapide-title">Choisissez votre deck</h2>
                <p id="rpg-partie-rapide-desc">Sélectionnez l’un de vos decks disponibles pour lancer immédiatement un duel contre l’ordinateur. Le sorcier jouera un deck adapté pour vous affronter.</p>
              </div>
              <button type="button" className="rpg-partie-rapide__close" aria-label="Fermer la fenêtre" onClick={() => setPartieRapideOuverte(false)}>✕</button>
            </header>
            <div className="rpg-partie-rapide__grid" role="list">
              {(() => {
                const decksJouables = decksTous.filter((deck) => deckSeJoue(deck, collection));
                if (!decksJouables.length) {
                  return <p className="rpg-partie-rapide__empty">Aucun deck disponible. Construisez un deck dans l’atelier pour débloquer une partie rapide.</p>;
                }
                return decksJouables.map((deck) => {
                  const selectionne = partieRapideChoix === deck.id;
                  const couleurLabel = deckColorLabel(deck);
                  const total = deck.cardIds.length;
                  const stats = deckStats(deck);
                  return (
                    <button
                      key={deck.id}
                      type="button"
                      role="listitem"
                      className={`rpg-partie-rapide__deck${selectionne ? ' is-selected' : ''}`}
                      aria-pressed={selectionne}
                      aria-label={`Deck ${deck.name} : ${couleurLabel}, ${total} cartes`}
                      onClick={() => { play('menu'); setPartieRapideChoix(deck.id); }}
                    >
                      <span className="rpg-partie-rapide__deck-art" aria-hidden="true" style={{ backgroundImage: `url("${deckBoxArtUrl(deck)}")` }} />
                      <span className="rpg-partie-rapide__deck-body">
                        <strong className="rpg-partie-rapide__deck-name">{deck.name}</strong>
                        <small className="rpg-partie-rapide__deck-couleur">{deckColorGlyph(deck)} {couleurLabel}</small>
                        <span className="rpg-partie-rapide__deck-meta">{total} cartes · {stats.creatures} créatures · {stats.magies + stats.armes} sorts & armes</span>
                        {deck.archetype && <span className="rpg-partie-rapide__deck-archetype">{deck.archetype}</span>}
                      </span>
                      {selectionne && <span className="rpg-partie-rapide__check" aria-hidden="true">✓</span>}
                      {deck.id === selectedDeckId && <span className="rpg-partie-rapide__badge">Actuel</span>}
                    </button>
                  );
                });
              })()}
            </div>
            <footer className="rpg-partie-rapide__actions">
              <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => setPartieRapideOuverte(false)}>Annuler</button>
              <button
                type="button"
                className="rpg-btn rpg-btn--primary"
                disabled={!partieRapideChoix || !decksTous.find((deck) => deck.id === partieRapideChoix && deckSeJoue(deck, collection))}
                onClick={() => {
                  const deck = decksTous.find((d) => d.id === partieRapideChoix);
                  if (!deck || !deckSeJoue(deck, collection)) return;
                  play('select');
                  onSelectDeck(deck.id);
                  onStartGame(deck.id);
                  setPartieRapideOuverte(false);
                }}
              >
                Lancer la partie
              </button>
            </footer>
          </div>
        </div>
      )}
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
    // La déclaration d'attaque a son propre repère sonore. La fenêtre de
    // blocage, elle, s'ouvre dans le même geste : aucun bruit de page tournée
    // ne vient par-dessus le clic de l'attaquant.
    if (phaseDuelActive && prevPhaseRef.current && prevPhaseRef.current !== phaseDuelActive
      && phaseDuelActive === 'attaque') {
      jouerSfx('phase');
    }
    prevPhaseRef.current = phaseDuelActive;
  }, [phaseDuelActive]);
  useEffect(() => {
    if (cartesEnDestruction.length > prevDestructionCountRef.current) {
      // Une carte que la roue de feu a consumée garde son adieu mais pas son
      // bruit : le feu a déjà sonné au moment du coup (`flammeJouee`). Une
      // créature prise en cale par Abordage rejoint son capteur par la chaîne
      // sans jamais mourir : c'est le cliquetis de chaînes qui sonne, pas la destruction.
      const nouvellesDestructions = cartesEnDestruction
        .slice(prevDestructionCountRef.current)
        .filter((effet) => !effet.flammeJouee && !effet.priseEnCale && !effet.abordage);
      if (nouvellesDestructions.length) {
        jouerSfx(nouvellesDestructions.some((effet) => effet.bruleeParBraise)
          ? 'flame_gust'
          : 'destruction_hit');
      }
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

// ── Horloge PvP isolée : son tick à la seconde ne redessine que le badge ⏱,
//    jamais les 10 000 lignes du plateau ni les cartes sur table. ──────────
const HorlogePvp = memo(function HorlogePvp({ echeance, statut, vainqueur, pvpRef, pvpHorlogeExpireeRef }) {
  const [maintenantPvp, setMaintenantPvp] = useState(() => Date.now());
  useEffect(() => {
    if (!echeance || statut !== 'en_cours') return undefined;
    setMaintenantPvp(Date.now());
    const id = window.setInterval(() => {
      const t = Date.now();
      setMaintenantPvp(t);
      if (t >= Date.parse(echeance) && pvpHorlogeExpireeRef.current !== echeance) {
        pvpHorlogeExpireeRef.current = echeance;
        pvpRef.current?.onRafraichir?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [echeance, statut]);
  if (!echeance || vainqueur) return null;
  const msRestantesPvp = Math.max(0, Date.parse(echeance) - maintenantPvp);
  const chronoPvp = tempsRestant(echeance, maintenantPvp);
  if (!chronoPvp) return null;
  return (
    <span
      className={`rpg-duel-nav__pvp-clock${msRestantesPvp <= 15000 ? ' is-urgent' : ''}`}
      title="Temps restant pour ce coup"
    >
      ⏱ {chronoPvp}
    </span>
  );
});

export default function RpgDuelPage({ joueurDeck, sorcierDeck, sorcierPuissance = 2, rng = Math.random, variantesPlateaux = false, pvp = null } = {}) {
  const modePvp = Boolean(pvp);
  const pvpRef = useRef(pvp);
  pvpRef.current = pvp;
  const pvpEnVolCountRef = useRef(0);
  const pvpSeqAppliqueRef = useRef(null);
  const pvpHorlogeExpireeRef = useRef(null);
  const [confirmerAbandonPvp, setConfirmerAbandonPvp] = useState(false);
  const [ecran, setEcran] = useState(() => (pvp ? 'partie' : 'jouer'));
  useLumiereCartes(ecran !== 'partie');
  const authContext = useContext(AuthContext);
  const authUser = authContext?.user ?? null;
  const desktopMode = typeof window !== 'undefined' && Boolean(window.letsPlayDesktop);
  const desktopAccount = authContext?.session?.user ?? null;
  const onSignOut = authContext?.signOut;
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
  const [tutorielActif, setTutorielActif] = useState(false);
  const [tutorielId, setTutorielId] = useState(null);
  const [etapeTutorielId, setEtapeTutorielId] = useState(null);
  // La récompense affichée après la dernière étape (le temps d'un toast).
  const [recompenseTutoriel, setRecompenseTutoriel] = useState(null);
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

  // ── Synchronisation temps réel d'un duel PvP (toujours avant tout return conditionnel) ──
  useEffect(() => {
    if (!modePvp || !pvp?.vue) return;
    // Résout les plateaux thématiques et musiques à partir des decks publics.
    const deckJ = (pvp.decks?.joueur?.id ? RPG_DECKS.find((d) => d.id === pvp.decks.joueur.id) : null)
      ?? (pvp.decks?.joueur?.cardIds?.length ? { id: pvp.decks.joueur.id ?? 'pvp-joueur', elements: pvp.vue.joueur?.couleurs, cardIds: pvp.decks.joueur.cardIds } : null)
      ?? (pvp.vue.joueur?.couleurs?.length ? { id: 'pvp-joueur', elements: pvp.vue.joueur.couleurs, cardIds: [] } : null);
    const deckS = (pvp.decks?.sorcier?.id ? RPG_DECKS.find((d) => d.id === pvp.decks.sorcier.id) : null)
      ?? (pvp.decks?.sorcier?.cardIds?.length ? { id: pvp.decks.sorcier.id ?? 'pvp-sorcier', elements: pvp.vue.sorcier?.couleurs, cardIds: pvp.decks.sorcier.cardIds } : null)
      ?? (pvp.vue.sorcier?.couleurs?.length ? { id: 'pvp-sorcier', elements: pvp.vue.sorcier.couleurs, cardIds: [] } : null);
    const plateaux = resoudrePlateauxDuDuel({ deckJoueur: deckJ, deckAdverse: deckS, variantesFantaisistes: variantesPlateaux });
    const prochainPlateauJoueurId = plateaux?.joueur?.plateau?.id;
    const prochainPlateauAdverseId = plateaux?.adversaire?.plateau?.id;
    if (prochainPlateauJoueurId) setPlateauId((actuel) => (actuel === prochainPlateauJoueurId ? actuel : prochainPlateauJoueurId));
    if (prochainPlateauAdverseId) setPlateauAdverseId((actuel) => (actuel === prochainPlateauAdverseId ? actuel : prochainPlateauAdverseId));

    const entrant = structuredClone(pvp.vue);
    if (entrant.phase === 'blocage' && entrant.combatDeclare?.cote === 'sorcier') {
      entrant.fenetreReponse = true;
    }

    // Premier montage (ou reconnexion en cours de duel) : pose l'état tel quel.
    if (!duelRef.current) {
      duelRef.current = entrant;
      pvpSeqAppliqueRef.current = pvp.seq ?? null;
      instantanePiocheRef.current = {
        joueur: { deck: entrant.joueur.deckCount ?? entrant.joueur.deck.length, main: entrant.joueur.mainCount ?? entrant.joueur.main.length },
        sorcier: { deck: entrant.sorcier.deckCount ?? entrant.sorcier.deck.length, main: entrant.sorcier.mainCount ?? entrant.sorcier.main.length },
      };
      setMulligan(rpgPeutMulligan(entrant, 'joueur') && entrant.joueur.main.length
        ? { etape: 'choix', choix: new Set(), nouveau: [], bilan: '' }
        : null);
      if (entrant.phase === 'blocage' && entrant.combatDeclare?.cote === 'sorcier') {
        const ids = entrant.combatDeclare.attaquants ?? [];
        setCombatEntrant({
          coteAttaquant: 'sorcier',
          attaquants: ids,
          blocages: Object.fromEntries(ids.map((id) => [id, []])),
          repartitions: {},
          ciblesAttaque: entrant.combatDeclare.ciblesAttaque ?? {},
          bannieresAppliquees: Boolean(entrant.combatDeclare.bannieresAppliquees),
        });
      }
      jouerSfx('apparition');
      force();
      return;
    }

    if (pvpEnVolCountRef.current > 0) return;
    if (pvp.seq !== undefined && pvp.seq === pvpSeqAppliqueRef.current && entrant.fin?.gagnant === duelRef.current.fin?.gagnant) {
      return;
    }

    const avant = duelRef.current;
    const champAvant = prendreInstantaneChamp();
    duelRef.current = entrant;
    pvpSeqAppliqueRef.current = pvp.seq ?? pvpSeqAppliqueRef.current;

    animerModificationsChamp(champAvant, entrant.combatDeclare?.attaquants ?? [], 0);
    if ((entrant.joueur?.pv ?? 0) < (avant.joueur?.pv ?? 0)) declencherImpactEcran('received');
    if ((entrant.sorcier?.pv ?? 0) < (avant.sorcier?.pv ?? 0)) declencherImpactEcran('dealt');

    const idsAvantAdverse = new Set((avant.sorcier?.creatures ?? []).map((e) => e.id));
    const nouvellesCreaturesAdverses = (entrant.sorcier?.creatures ?? []).filter((e) => !idsAvantAdverse.has(e.id));
    if (nouvellesCreaturesAdverses.length) {
      jouerSfx('card_place');
      const sonFeu = rpgFireSoundFor(cardById(nouvellesCreaturesAdverses[0].carteId), 'arrival');
      if (sonFeu) jouerSfx(sonFeu);
      // Les journaux WeakMap du moteur ne traversent pas l'instantané PvP :
      // l'arrivée d'une créature adverse s'y constate par différence de champ.
      for (const entite of nouvellesCreaturesAdverses) {
        const carteNouvelle = cardById(entite.carteId);
        if (cardHasPrintedType(carteNouvelle, 'Navire')) jouerSfx(RPG_NAVIRE_ARRIVEE_SFX);
        else if (rpgEstCartePirate(carteNouvelle)) jouerArriveePirate();
      }
    }

    const cimetiereAvantLen = avant.sorcier?.cimetiere?.length ?? 0;
    const nouvellesCimetiere = (entrant.sorcier?.cimetiere ?? []).slice(cimetiereAvantLen);
    const magieAdverse = nouvellesCimetiere.map((id) => cardById(id)).find((c) => c?.kind === 'magie');
    if (magieAdverse) {
      annoncerMagieSorcier(magieAdverse, {
        nom: magieAdverse.effet?.cible === 'sorcier' ? (nomProfilJoueur || 'Vous') : 'Le champ de bataille',
        targetPlate: magieAdverse.effet?.cible === 'sorcier' ? 'joueur' : null,
        targetIds: [],
      });
    }

    if (entrant.phase === 'blocage' && entrant.combatDeclare?.cote === 'sorcier') {
      const ids = entrant.combatDeclare.attaquants ?? [];
      setCombatEntrant((courant) => {
        if (courant?.coteAttaquant === 'sorcier') {
          const vivants = new Set(ids);
          return {
            ...courant,
            attaquants: ids,
            blocages: Object.fromEntries(ids.map((id) => [id, courant.blocages?.[id] ?? []]).filter(([id]) => vivants.has(id))),
          };
        }
        jouerSfx('attackers_confirm');
        animerEntites(ids, 'attack', 650);
        return {
          coteAttaquant: 'sorcier',
          attaquants: ids,
          blocages: Object.fromEntries(ids.map((id) => [id, []])),
          repartitions: {},
          ciblesAttaque: entrant.combatDeclare.ciblesAttaque ?? {},
          bannieresAppliquees: Boolean(entrant.combatDeclare.bannieresAppliquees),
        };
      });
    } else if (avant.phase === 'blocage' && entrant.phase !== 'blocage') {
      setCombatEntrant(null);
      setBloqueurSelectionne(null);
    }

    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modePvp, pvp?.seq, pvp?.statut, pvp?.vue]);

  // ── Plein écran ──────────────────────────────────────────────────────────
  // Le Sablier s'ouvre dans la page, sans plein écran natif ni couche immersive
  // automatique : au montage, rien n'est demandé. Le joueur peut choisir le
  // plein écran à tout moment avec le bouton du menu/de la barre du duel ou la
  // touche F. Au doigt (téléphone, tablette, application), **lancer une partie**
  // demande en plus le plein écran natif dans le geste du clic : c'est la seule
  // condition sous laquelle un navigateur mobile accepte ensuite
  // `screen.orientation.lock('landscape')` — la partie se couche dans le
  // paysage. Sur ordinateur, rien d'automatique : la session de paysage ne
  // verrouille jamais l'orientation.

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
    if (!duelCourant || !histoireEtageId || rpgVainqueur(duelCourant) !== 'joueur') return;
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
    // La victoire raconte aussi l'état de la tour APRÈS le déblayage : si plus
    // aucun étage ne résiste, le butin de la tour (+200 ◈) tombe avec le gain
    // du duel — une fois par tour, la garde vit dans le portefeuille.
    const sommet = tourId ? resumeTourHistoire(tourId, maj) : null;
    const tourComplete = Boolean(sommet && sommet.total > 0 && sommet.vaincus >= sommet.total);
    noterVictoireEtage(histoireEtageId, maj);
    const paiement = noterEvenementDuel({ type: 'duel-gagne', mode: 'histoire', etageId: histoireEtageId, tourId, premiere, tourComplete });
    if (paiement?.gain || paiement?.xp) {
      setAnnonceGain({
        session,
        gain: paiement.gain ?? 0,
        butin: paiement.butin ?? 0,
        xp: paiement.xp ?? 0,
        niveaux: paiement.niveaux ?? 0,
        premiere,
        libre: false,
      });
    }
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
    if (!duelCourant || histoireEtageId || tutorielActif || rpgVainqueur(duelCourant) !== 'joueur') return;
    const session = sessionDuelRef.current;
    if (libreVictoireMarqueeRef.current === session) return;
    libreVictoireMarqueeRef.current = session;
    const paiement = noterEvenementDuel({ type: 'duel-gagne', mode: 'libre', premiere: false });
    if (paiement?.gain || paiement?.xp) {
      setAnnonceGain({
        session,
        gain: paiement.gain ?? 0,
        butin: 0,
        xp: paiement.xp ?? 0,
        niveaux: paiement.niveaux ?? 0,
        premiere: false,
        libre: true,
      });
    }
  });

  // « Le sorcier saigne » se compte sur les **PV du sorcier**, pas au point
  // d'appel : toutes les sources y passent — attaques directes, sorts,
  // capacités d'arrivée, échos différés de la Braise — et une action annulée
  // puis rejouée ne compte pas deux fois, puisque l'on émet l'écart entre les
  // dégâts cumulés et ceux déjà annoncés. Un duel neuf remet le compteur à son
  // état de départ sans rien annoncer.
  // Le compteur vient du moteur (`degatsRecus`) : la vie peut dépasser 25 et
  // le maximum suit le gain, l'écart au maximum ne dirait plus rien — seul le
  // cumul des dégâts réellement encaisés compte.
  useEffect(() => {
    const duelCourant = duelRef.current;
    if (!duelCourant) return;
    const cumules = Math.max(0, duelCourant.sorcier.degatsRecus ?? 0);
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

  // Lancer (ou reprendre) une partie : au doigt seulement, le plein écran natif
  // part dans le geste du clic (le navigateur l'exige), puis la session de
  // paysage verrouille l'orientation — et le rejoue à chaque entrée en plein
  // écran tant que le duel est ouvert. Le bouton « Activer le paysage » de
  // l'invite de rotation repasse par ici : il redemande les deux.
  const demanderPleinEcranEtPaysage = () => {
    const veutPaysage = Boolean(window.LetsPlayAndroid)
      || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
    if (veutPaysage) entrerPleinEcran();
    landscapeRef.current?.enter({ fullscreen: false });
  };
  const reprendrePartie = () => {
    musiqueThemeRef.current?.stop();
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
  // Plateaux du duel : la table est découpée en deux moitiés — en bas, le
  // terrain du deck du joueur (`plateauId`, le principal pour le décor 3D) ;
  // en haut, celui du deck adverse. La musique suit la conquête. Avant la
  // première partie, la table d'origine de Bab El sert de décor aux deux.
  const [plateauId, setPlateauId] = useState(PLATEAU_PAR_DEFAUT.id);
  const [plateauAdverseId, setPlateauAdverseId] = useState(PLATEAU_PAR_DEFAUT.id);
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
    noterEvenementDuel: noterEvenementDuelReel, reclamerUneQuete, reclamerTutoriel,
    reclamerLeCachet, reclamerLeCachetDeLaSemaine,
    acheterBooster, acheterCoffret, fermerOuverture, ouverture: ouvertureSouk,
    // Le profil du joueur (dossier 20) : la barre d'XP, le niveau, et le paquet
    // que chaque palier franchi fait ouvrir au hasard.
    profil: profilJoueur, barreXp, boostersEnAttente: paquetsDePalierEnAttente,
    monteeNiveau, fermerMonteeNiveau, renommerLeProfil, choisirUnEmblemeProfil,
  } = useSablierBourse({
    progression: progressionHistoireRef.current,
    // Un achat range ses cartes dans la collection : l'atelier de decks doit
    // les voir tout de suite, sans qu'on recharge la page. Un paquet offert par
    // un palier passe par le même chemin.
    onCartesRangees: rafraichirCollection,
  });
  // Le mana sans terrain est commun à tous les duels : les récompenses
  // et les quêtes ne sont plus exclues sur le seul critère du format.
  // Le rendu du duel-gagne (gain de l'étage, butin de la tour) remonte à
  // l'écran : l'overlay de victoire l'annonce, session par session.
  const noterEvenementDuel = (evenement) => {
    if (modePvp) return null;
    return noterEvenementDuelReel(evenement);
  };
  // Ce que la dernière victoire vient de payer — `{ session, gain, butin, xp,
  // niveaux, premiere, libre }`. Elle ne s'affiche que sur la session qui l'a
  // produite : « Rejouer » ou « Étage suivant » incrémente la session et
  // l'annonce tombe.
  const [annonceGain, setAnnonceGain] = useState(null);
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
  const musiqueThemeRef = useRef(null);
  const musiqueRef = useRef(null);
  const musiquePlateauRef = useRef(null);
  const sfxRef = useRef(null);
  const [sonActif, setSonActif] = useState(readRpgSoundPref);
  const [volumeSfx, setVolumeSfx] = useState(() => readRpgVolumePref(RPG_SFX_VOLUME_KEY, 1));
  const [volumeMusique, setVolumeMusique] = useState(() => readRpgVolumePref(RPG_MUSIC_VOLUME_KEY, 1));
  const dernierVolumeSfxRef = useRef(volumeSfx > 0 ? volumeSfx : 1);
  const dernierVolumeMusiqueRef = useRef(volumeMusique > 0 ? volumeMusique : 1);
  // Le décor 3D de la table (relief, lumière, particules) : mémorisé sur l'appareil.
  const [decor3dActif, setDecor3dActif] = useState(readRpgTable3dPref);
  const basculerDecor3d = () => setDecor3dActif((actif) => { writeRpgTable3dPref(!actif); return !actif; });
  useEffect(() => { writeRpgSoundPref(sonActif); }, [sonActif]);
  useEffect(() => {
    writeRpgVolumePref(RPG_SFX_VOLUME_KEY, volumeSfx);
    if (volumeSfx > 0) dernierVolumeSfxRef.current = volumeSfx;
    sfxRef.current?.setVolume(volumeSfx);
  }, [volumeSfx]);
  useEffect(() => {
    writeRpgVolumePref(RPG_MUSIC_VOLUME_KEY, volumeMusique);
    if (volumeMusique > 0) dernierVolumeMusiqueRef.current = volumeMusique;
    musiqueThemeRef.current?.setVolume(volumeMusique);
    musiqueRef.current?.setVolume(volumeMusique);
    musiquePlateauRef.current?.setVolume(volumeMusique);
  }, [volumeMusique]);
  useEffect(() => {
    musiqueThemeRef.current = reprendreThemePrincipal() ?? new RpgMainThemeMusic();
    musiqueThemeRef.current.setVolume(volumeMusique);
    musiqueThemeRef.current.setMuted(!sonActif);
    musiqueRef.current = new RpgAmbientMusic();
    musiqueRef.current.setVolume(volumeMusique);
    musiqueRef.current.setMuted(!sonActif);
    musiquePlateauRef.current = new RpgConqueteMusic();
    musiquePlateauRef.current.setVolume(volumeMusique);
    musiquePlateauRef.current.setMuted(!sonActif);
    sfxRef.current = new RpgAudioPlayer();
    sfxRef.current.setVolume(volumeSfx);
    sfxRef.current.setMuted(!sonActif);
    return () => {
      musiqueThemeRef.current?.destroy();
      musiqueThemeRef.current = null;
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
    musiqueThemeRef.current?.setMuted(!sonActif);
    musiqueRef.current?.setMuted(!sonActif);
    musiquePlateauRef.current?.setMuted(!sonActif);
  }, [sonActif]);
  const changerVolumeSfx = (valeur) => {
    const prochain = clampRpgVolume(valeur);
    setVolumeSfx(prochain);
    if (prochain > 0 && !sonActif) setSonActif(true);
  };
  const changerVolumeMusique = (valeur) => {
    const prochain = clampRpgVolume(valeur);
    setVolumeMusique(prochain);
    if (prochain > 0 && !sonActif) setSonActif(true);
  };
  const basculerVolumeSfx = () => {
    if (!sonActif) {
      setSonActif(true);
      if (volumeSfx <= 0) setVolumeSfx(dernierVolumeSfxRef.current || 1);
      return;
    }
    setVolumeSfx((actuel) => (actuel > 0 ? 0 : (dernierVolumeSfxRef.current || 1)));
  };
  const basculerVolumeMusique = () => {
    if (!sonActif) {
      setSonActif(true);
      if (volumeMusique <= 0) setVolumeMusique(dernierVolumeMusiqueRef.current || 1);
      return;
    }
    setVolumeMusique((actuel) => (actuel > 0 ? 0 : (dernierVolumeMusiqueRef.current || 1)));
  };
  // La tour de l'étage en cours commande la boucle (null : duel libre).
  const lectureHistoire = ecran === 'recit' || ecran === 'journal';
  const tourHistoireId = lectureHistoire
    ? (resumeRecitHistoire(progressionHistoire.recit)?.acte?.tourId ?? 'tour-des-listes')
    : histoireEtageId
      ? etageHistoireParId(histoireEtageId)?.tour?.id ?? null
      : null;
  useEffect(() => { musiqueRef.current?.setTour(tourHistoireId); }, [tourHistoireId]);
  useEffect(() => {
    const musiqueTheme = musiqueThemeRef.current;
    if (!musiqueTheme) return;
    if (ecran !== 'partie' && sonActif) void musiqueTheme.start();
    else musiqueTheme.stop();
  }, [ecran, sonActif]);
  // Un seul bruit de feu par geste : un sort ou un effet de Braise qui blesse
  // puis tue sa cible ne joue pas `flame_gust` deux fois (le lancement, puis
  // la destruction). Le souffle n'appartient d'ailleurs qu'aux blessures —
  // les attaques de créatures partagent toutes `player_attack_hit`.
  const dernierSonFeuRef = useRef(0);
  // Même garde pour `foudre_marteau`, devenu silencieux avec le retrait du
  // catalogue synthétique : le test ne coûte rien si le tonnerre revenait.
  const dernierSonFoudreRef = useRef(0);
  const dernierSonFroidRef = useRef(0);
  // La position du journal des blessures déjà animée : une brûlure ancienne ne
  // rallume jamais la roue de feu sur une action qui ne la concerne pas.
  const journalBlessuresRef = useRef({ duel: null, position: 0 });
  const jouerSfx = (nom, delai = 0) => {
    if (nom === 'flame_gust') {
      const maintenant = Date.now();
      if (maintenant - dernierSonFeuRef.current < 700) return;
      dernierSonFeuRef.current = maintenant;
    }
    if (nom === 'foudre_marteau') {
      const maintenant = Date.now();
      if (maintenant - dernierSonFoudreRef.current < 700) return;
      dernierSonFoudreRef.current = maintenant;
    }
    if (nom === 'cold_wind') {
      const maintenant = Date.now();
      if (maintenant - dernierSonFroidRef.current < 900) return;
      dernierSonFroidRef.current = maintenant;
    }
    try {
      const p = sfxRef.current;
      if (!p) return;
      p.unlock();
      p.play(nom, delai);
    } catch { /* audio indisponible */ }
  };
  // L'accueil des cartes pirates alterne d'une arrivée sur l'autre entre le cri
  // « Ahoy ! » (`RPG_PIRATE_ARRIVEE_SFX`) et le dialogue « Alright »
  // (`RPG_PIRATE_DIALOGUE_SFX`) : le compteur vit le temps de la partie et sert
  // les deux camps comme les deux modes (solo et PvP). Un navire, même pirate,
  // reste accueilli par l'ambiance de quai seule — jamais par ce cycle.
  const arriveesPiratesJoueesRef = useRef(0);
  const jouerArriveePirate = (nombre = 1) => {
    const demandees = Math.trunc(Number(nombre));
    const fois = Number.isFinite(demandees) && demandees > 0 ? demandees : 1;
    for (let index = 0; index < fois; index += 1) {
      jouerSfx(rpgSonArriveePirate(arriveesPiratesJoueesRef.current));
      arriveesPiratesJoueesRef.current += 1;
    }
  };
  const unlockSfx = () => {
    try { sfxRef.current?.unlock(); } catch { /* ignore */ }
    if (ecran === 'partie' && sonActif && !document.hidden) void musiquePlateauRef.current?.start();
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
  // La Furie déclenchée de la créature pressée, avec ses statistiques du
  // moment (`null` partout ailleurs) : sa preview montre sa peinture furie.
  const [apercuAppuiFurie, setApercuAppuiFurie] = useState(null);
  // Tenacité/Bouclier déjà dépensés par la créature pressée : sa preview les grise.
  const [apercuAppuiEffetsEpuises, setApercuAppuiEffetsEpuises] = useState([]);
  // La fiche : là où le doigt tient une seconde, la souris **clique** — au
  // catalogue depuis toujours, et par un clic droit partout ailleurs dans le
  // jeu : la carte s'ouvre en grand, illustration et effets, sans être jouée.
  const [apercuCatalogue, setApercuCatalogue] = useState(null);
  // Les armes portées par la créature ouverte (vides partout ailleurs que sur
  // la table du duel) et le mot du sur-titre : l'écran qui a ouvert la fiche.
  const [apercuCatalogueArmes, setApercuCatalogueArmes] = useState([]);
  // La carte détenue en cale par la créature ouverte (Abordage) : la fiche
  // l'empile derrière son capteur, en perspective.
  const [apercuCataloguePrisonniere, setApercuCataloguePrisonniere] = useState(null);
  const [apercuCatalogueSurface, setApercuCatalogueSurface] = useState('CATALOGUE');
  // Même état Furie pour la fiche ouverte d'un clic droit sur la table.
  const [apercuCatalogueFurie, setApercuCatalogueFurie] = useState(null);
  // Même grisaille des effets dépensés pour cette fiche.
  const [apercuCatalogueEffetsEpuises, setApercuCatalogueEffetsEpuises] = useState([]);
  // La carte consultée (appui long ou fiche) garde le focus pendant que le
  // plateau passe au flou derrière elle : on retient l'élément sur lequel le
  // geste a été fait, et un effet y pose `data-apercu-source`, que la feuille
  // de style exclut du flou. Un simple attribut du DOM plutôt qu'une prop : la
  // carte peut être en main, sur la table, dans un rail de terrains ou sur le
  // dessus d'une pile — la marquer par l'état obligerait à la faire descendre
  // dans chacun de ces composants.
  const appuiLongRef = useRef(null);
  const carteSourceApercuRef = useRef(null);
  useEffect(() => {
    // Changer d'écran (menu, deck, catalogue, duel) referme l'aperçu au doigt
    // comme la fiche ouverte d'un clic, et désarme les gestes en cours.
    setApercuAppui(null);
    setApercuAppuiFurie(null);
    setApercuAppuiEffetsEpuises([]);
    setApercuCatalogue(null);
    setApercuCatalogueFurie(null);
    setApercuCatalogueEffetsEpuises([]);
    setApercuCataloguePrisonniere(null);
    if (ecran !== 'partie' && tutorielActif) {
      etapeTutorielIdRef.current = null;
      setEtapeTutorielId(null);
      libererDuelPourLecture();
    }
    return () => {
      touchDragRef.current?.();
      touchDragRef.current = null;
      appuiLongRef.current?.();
      appuiLongRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecran]);
  const clicApresGlisserBloqueurRef = useRef(null);
  const animationsVisuellesTimersRef = useRef([]);
  const sequenceAnimationRef = useRef(0);
  const [, setVersion] = useState(0);
  const force = () => setVersion((v) => v + 1);

  // Une destruction ciblée qui n'a plus de cible légale — le champ adverse
  // s'est vidé ou s'est entièrement protégé entre la mort et le clic — se
  // dissipe d'elle-même : la partie ne reste jamais suspendue sur un choix
  // impossible, et le tour du sorcier mis en pause reprend son cours.
  useEffect(() => {
    const duelCourant = duelRef.current;
    if (!duelCourant?.destructionsEnAttente?.length) return;
    if (!rpgDissiperDestructionsSansCible(duelCourant)) return;
    force();
    reprendreSorcier();
  });
  // Hors tutoriel, le catalogue ne doit pas fournir d'étapes : le voile et
  // les signaux de progression resteraient branchés sur la leçon 1.
  const tutorielCourant = tutorielActif ? tutorielParId(tutorielId) : null;
  const etapesTutoriel = tutorielCourant?.steps ?? [];
  // Les minuteries du tour adverse rappellent des fonctions créées au rendu
  // précédent : elles liraient un `etapeTutorielId` périmé et manqueraient
  // l'étape qui vient d'être affichée. Le ref donne toujours l'étape courante.
  const etapeTutorielIdRef = useRef(etapeTutorielId);
  useLayoutEffect(() => { etapeTutorielIdRef.current = etapeTutorielId; }, [etapeTutorielId]);
  /** Change d'étape en gardant le ref synchrone : les minuteries du tour
   *  adverse lisent toujours l'étape affichée. */
  const allerEtapeTutoriel = (id) => {
    etapeTutorielIdRef.current = id;
    setEtapeTutorielId(id);
  };
  /** Fait avancer l'étape courante si elle écoute cet événement de jeu. */
  const signalerTutoriel = (evenement, details = {}) => {
    const etapeCourante = etapeTutorielIdRef.current;
    if (!tutorielActif || !etapeCourante) return;
    const index = etapesTutoriel.findIndex((step) => step.id === etapeCourante);
    if (index < 0) return;
    const etape = etapesTutoriel[index];
    const evenements = Array.isArray(etape.on) ? etape.on : etape.on ? [etape.on] : [];
    if (!evenements.includes(evenement)) return;
    if (etape.cardId && etape.cardId !== details.cardId) return;
    if (index < etapesTutoriel.length - 1) allerEtapeTutoriel(etapesTutoriel[index + 1].id);
  };
  const continuerTutoriel = () => {
    const index = etapesTutoriel.findIndex((step) => step.id === etapeTutorielIdRef.current);
    if (index >= 0 && index < etapesTutoriel.length - 1) {
      allerEtapeTutoriel(etapesTutoriel[index + 1].id);
    }
  };
  const fermerTutoriel = () => {
    etapeTutorielIdRef.current = null;
    setEtapeTutorielId(null);
    libererDuelPourLecture();
    setEcran('tutoriels');
  };
  const terminerTutoriel = () => {
    if (tutorielActif && tutorielCourant) {
      const gain = reclamerTutoriel(tutorielCourant.id, tutorielCourant.reward);
      if (gain > 0) setRecompenseTutoriel({ gain, token: Date.now() });
    }
    etapeTutorielIdRef.current = null;
    setEtapeTutorielId(null);
    libererDuelPourLecture();
    setEcran('tutoriels');
  };
  useEffect(() => {
    if (!recompenseTutoriel) return undefined;
    const timer = window.setTimeout(() => setRecompenseTutoriel(null), 4200);
    return () => window.clearTimeout(timer);
  }, [recompenseTutoriel?.token]);
  // Un palier sonne : la fanfare de victoire le dit à l'oreille. La cérémonie du
  // paquet a ses propres sons (sceau, retournements) — l'annonce seule, elle,
  // n'a que celui-là.
  useEffect(() => {
    if (!monteeNiveau) return;
    if (monteeNiveau.ouverture) return;
    jouerSfx('victoire');
  }, [monteeNiveau?.token]);
  // L'annonce sans paquet s'efface seule (comme le toast d'une leçon) ; la
  // cérémonie, elle, attend le geste du joueur — on ne lui vole pas ses cartes.
  useEffect(() => {
    if (!monteeNiveau || monteeNiveau.ouverture) return undefined;
    const timer = window.setTimeout(() => fermerMonteeNiveau(), 6000);
    return () => window.clearTimeout(timer);
  }, [monteeNiveau?.token, monteeNiveau?.ouverture, fermerMonteeNiveau]);
  const [animationsEntites, setAnimationsEntites] = useState({});
  const [missVisibles, setMissVisibles] = useState({});
  const sequenceMissRef = useRef(0);
  // Les chocs de bouclier en cours : `{ [entityId]: { montant, restant,
  // lumiere, token } }` le temps d'`ImpactBouclier` — assez longtemps pour
  // voir l'égide encaisser (et, à zéro, se briser) avant de s'effacer.
  const [boucliersVisibles, setBoucliersVisibles] = useState({});
  const sequenceBouclierRef = useRef(0);
  const [cartesEnDestruction, setCartesEnDestruction] = useState([]);
  // Les tourbillons d'eau des renvois en main : `{ entityId, cardId, left, top,
  // width, height, angle, effectId, expireA }`, le temps de l'effet seulement.
  const [tourbillonsEau, setTourbillonsEau] = useState([]);
  // Les roues de feu des créatures brûlées par la Braise : `{ entityId, cardId,
  // left, top, width, height, angle, effectId, expireA }`, le temps de l'effet
  // seulement : la roue brûle l'emplacement, pas la carte.
  const [rouesFeu, setRouesFeu] = useState([]);
  // Les foudres de l'Éclair du marteau : même relève d'emplacement que la
  // roue, le temps que l'éclair tombe et que ses arcs s'éteignent.
  const [eclairsMarteau, setEclairsMarteau] = useState([]);
  const [carteEnVol, setCarteEnVol] = useState(null);
  const [impactEcran, setImpactEcran] = useState(null);
  const [gelMasseFx, setGelMasseFx] = useState(null);
  const sequenceGelMasseRef = useRef(0);
  const timerGelMasseRef = useRef(null);
  const [animationsPioche, setAnimationsPioche] = useState([]);
  const instantanePiocheRef = useRef(null);
  const [presentationsCartes, setPresentationsCartes] = useState([]);
  const presentationDuelRef = useRef(null);
  const transitionTourRef = useRef(false);
  // Une pioche adverse n'entre jamais dans la file d'aperçus de ce joueur.
  useEffect(() => {
    const duelCourant = duelRef.current;
    if (presentationDuelRef.current !== duelCourant || ecran !== 'partie') {
      presentationDuelRef.current = duelCourant;
      transitionTourRef.current = false;
      if (presentationsCartes.length) setPresentationsCartes([]);
      if (duelCourant) rpgConsommerPresentations(duelCourant);
      return;
    }
    if (!duelCourant) return;
    const nouvelles = rpgConsommerPresentations(duelCourant)
      .filter((event) => event.type === 'effet');
    if (nouvelles.length) setPresentationsCartes((file) => [...file, ...nouvelles]);
  });
  const presentationCarte = presentationsCartes[0];
  useEffect(() => {
    if (!presentationCarte) return undefined;
    const timer = window.setTimeout(() => setPresentationsCartes((file) => file.slice(1)), 1000);
    return () => window.clearTimeout(timer);
  }, [presentationCarte]);

  // ── Soins : chaque gain de vie se voit et s'entend ────────────────────────
  // Le moteur note chaque gain de vie réel (`rpgConsommerSoins`) — magie,
  // arrivée, destruction, arme, Tribut ou transfert, des deux camps. Après
  // chaque rendu, la page relève ce journal : la plaque du sorcier soigné ou la
  // créature soignée s'illumine (`EclatSoin`) avec son « +N », et le soin se
  // fait entendre — un seul bruitage par lot. `soinsVisibles` :
  // `{ [cle]: { montant, token } }`, la clé étant 'joueur', 'sorcier' ou l'id
  // de la créature. Un duel neuf ou restauré (annulation) repart d'un journal
  // vide ; hors de la table, le journal est vidé sans rien montrer.
  const [soinsVisibles, setSoinsVisibles] = useState({});
  const sequenceSoinRef = useRef(0);
  const soinsTimersRef = useRef([]);
  const soinsDuelRef = useRef(null);
  useEffect(() => {
    const duelCourant = duelRef.current;
    const soins = rpgConsommerSoins(duelCourant);
    if (soinsDuelRef.current !== duelCourant || ecran !== 'partie') {
      soinsDuelRef.current = duelCourant;
      return;
    }
    const cibles = regrouperSoins(soins);
    if (!cibles.length) return;
    sequenceSoinRef.current += 1;
    const token = sequenceSoinRef.current;
    setSoinsVisibles((courant) => {
      const suivant = { ...courant };
      for (const { cle, montant } of cibles) suivant[cle] = { montant, token };
      return suivant;
    });
    const son = sonDuSoin(soins);
    if (son) jouerSfx(son);
    const timer = window.setTimeout(() => {
      soinsTimersRef.current = soinsTimersRef.current.filter((id) => id !== timer);
      // Seul l'éclat de CE soin s'éteint : un soin plus récent sur la même
      // cible garde le sien jusqu'au bout.
      setSoinsVisibles((courant) => {
        const restants = Object.fromEntries(Object.entries(courant).filter(([, soin]) => soin.token !== token));
        return Object.keys(restants).length === Object.keys(courant).length ? courant : restants;
      });
    }, RPG_SOIN_DUREE);
    soinsTimersRef.current.push(timer);
  });
  const effacerSoinsVisibles = () => {
    soinsTimersRef.current.forEach((id) => window.clearTimeout(id));
    soinsTimersRef.current = [];
    setSoinsVisibles((courant) => (Object.keys(courant).length ? {} : courant));
  };
  useEffect(() => () => soinsTimersRef.current.forEach((id) => window.clearTimeout(id)), []);

  // ── Abordage : chaque créature kidnappée en cale déclenche le cliquetis de chaînes ───
  const prisesDuelRef = useRef(null);
  const prisesPvpIdsRef = useRef({ code: null, ids: new Set() });
  useEffect(() => {
    const duelCourant = duelRef.current;
    const prisesLocales = rpgConsommerPrisesEnCale(duelCourant);
    if (modePvp) {
      const codePvp = pvp?.code ?? '';
      const prisesFeed = (Array.isArray(duelCourant?.combatFeed) ? duelCourant.combatFeed : [])
        .filter((evenement) => evenement?.type === 'prise' && evenement.id);
      if (prisesPvpIdsRef.current.code !== codePvp || ecran !== 'partie') {
        prisesPvpIdsRef.current = { code: codePvp, ids: new Set(prisesFeed.map((e) => e.id)) };
        return;
      }
      const nouvelles = prisesFeed.filter((e) => !prisesPvpIdsRef.current.ids.has(e.id));
      for (const e of nouvelles) prisesPvpIdsRef.current.ids.add(e.id);
      if (nouvelles.length || prisesLocales.length) jouerSfx(RPG_ABORDAGE_SFX);
      return;
    }
    if (prisesDuelRef.current !== duelCourant || ecran !== 'partie') {
      prisesDuelRef.current = duelCourant;
      return;
    }
    if (prisesLocales.length) jouerSfx(RPG_ABORDAGE_SFX);
  });

  // ── Arrivées en jeu : accueil alterné (« Ahoy ! » / « Alright ») pour les
  //    pirates, ambiance de quai pour les navires ──
  const arriveesDuelRef = useRef(null);
  useEffect(() => {
    const duelCourant = duelRef.current;
    // Les journaux se vident à chaque relevé, y compris au premier rendu :
    // aucune arrivée survenue avant le montage ne doit sonner en différé.
    const navires = rpgConsommerArriveesNavire(duelCourant);
    const pirates = rpgConsommerArriveesPirate(duelCourant);
    if (arriveesDuelRef.current !== duelCourant || ecran !== 'partie') {
      arriveesDuelRef.current = duelCourant;
      return;
    }
    if (navires.length) jouerSfx(RPG_NAVIRE_ARRIVEE_SFX);
    if (pirates.length) jouerArriveePirate(pirates.length);
  });

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
  // Le tour du sorcier s'arrête net quand le joueur doit désigner la créature
  // frappée par son Ghul des cendres : la suite reprend après son clic.
  const repriseSorcierRef = useRef(null);
  const [attaquants, setAttaquants] = useState([]);
  const [ciblesAttaque, setCiblesAttaque] = useState({});
  const [combatEntrant, setCombatEntrant] = useState(null);
  const [bloqueurGlisse, setBloqueurGlisse] = useState(null);
  const [bloqueurSelectionne, setBloqueurSelectionne] = useState(null);
  const [cibleEnCours, setCibleEnCours] = useState(null);
  // Quand Bimini retire sa dernière Heure, la cible se choisit directement
  // sur les créatures alliées du champ, comme une arrivée différée.
  useEffect(() => {
    if (duelRef.current?.siteEnAttente?.cote !== 'joueur') return;
    setCibleEnCours((courante) => courante ?? 'source-de-bimini');
  }, [duelRef.current?.siteEnAttente, duelRef.current?.tour]);
  // Le Défi du Jarl : après avoir désigné votre champion, il reste la créature
  // adverse à choisir — ce champ garde le champion entre les deux clics.
  const [cibleAllieeMagie, setCibleAllieeMagie] = useState(null);
  const [activationEnCours, setActivationEnCours] = useState(null);
  // Le lot du Sable : un mode d'arme qui désigne une proie (le Trait de sable
  // de la Jitte) se joue en deux clics — le bouton, puis la créature adverse.
  const [cibleArmeEnCours, setCibleArmeEnCours] = useState(null);
  // Le champ d'essai plein (cinq créatures) : la carte à poser attend le choix
  // de la créature à sacrifier — Échap ou « Renoncer » rend la carte à la main.
  const [sacrificeEnCours, setSacrificeEnCours] = useState(null);
  // La créature cliquée attend sa CASE : `{ carteId, handIndex }` tant que le
  // joueur n'a pas cliqué une des cases libres de sa rangée (les boutons de
  // `CreatureSlots`). Rien n'est encore payé — recliquer la carte ou Échap
  // renonce. `emplacementSurvole` : la case libre sous le glisser en cours.
  const [poseEnCours, setPoseEnCours] = useState(null);
  const [emplacementSurvole, setEmplacementSurvole] = useState(null);
  // Au doigt, la barre de navigation du duel se replie dans un bouton hamburger.
  const [navMenuOuvert, setNavMenuOuvert] = useState(false);
  const [navParametresOuvert, setNavParametresOuvert] = useState(false);
  // La messagerie, en pleine partie : un voile au-dessus de la table — un défi
  // du Sablier reçu pendant un duel se lit sans quitter la table, et le duel
  // reprend où il en était à la fermeture (voir `RpgMessageriePanel.jsx`).
  const [messagerieVoletOuvert, setMessagerieVoletOuvert] = useState(false);

  // La foudre activée se désigne avec Échap, comme les autres ciblages ; la
  // proie d'un mode d'arme aussi ; le sacrifice en attente, enfin, se renonce.
  useEffect(() => {
    if (!activationEnCours && !sacrificeEnCours && !poseEnCours && !navMenuOuvert && !navParametresOuvert && !messagerieVoletOuvert) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      setActivationEnCours(null);
      setSacrificeEnCours(null);
      setPoseEnCours(null);
      setNavMenuOuvert(false);
      setNavParametresOuvert(false);
      setMessagerieVoletOuvert(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activationEnCours, sacrificeEnCours, poseEnCours, navMenuOuvert, navParametresOuvert, messagerieVoletOuvert]);
  // Le menu hamburger et son onglet Paramètres se referment au premier geste hors de la barre du duel.
  useEffect(() => {
    if (!navMenuOuvert && !navParametresOuvert) return undefined;
    const onDown = (event) => {
      if (!event.target?.closest?.('.rpg-duel-nav')) {
        setNavMenuOuvert(false);
        setNavParametresOuvert(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [navMenuOuvert, navParametresOuvert]);
  const [terrainManaChoix, setTerrainManaChoix] = useState(null);
  const [confirmationSort, setConfirmationSort] = useState(null);
  const [carteDefausseSelectionnee, setCarteDefausseSelectionnee] = useState(null);
  // Sacrifice du mode sans terrains : `sacrificeDemande` = la fenêtre « plateau
  // plein » (Sacrifier / Annuler), `sacrificeEnCours` (plus haut) = la carte
  // dont on désigne la victime sur la table, `sacrificeFx` = la carte en
  // train de se déchirer à sa place.
  const [sacrificeDemande, setSacrificeDemande] = useState(null);
  const [sacrificeFx, setSacrificeFx] = useState(null);
  const sacrificeEnCoursRef = useRef(null);
  // Fin de tour suspendue à la défausse de fin de tour (main > 5, mode essai) :
  // le tour ne se ferme qu'une fois les cartes choisies défaussées.
  const finTourApresDefausseRef = useRef(false);
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
  // L'aperçu au survol devient **lisible à la souris** quand on s'attarde sur
  // une carte : ses pastilles d'effets s'ouvrent alors au survol.
  // - Balayer la main reste fluide : tant que l'aperçu n'est pas lisible, il
  //   ne capte rien et la carte suivante prend aussitôt la main.
  // - Une fois lisible, seule sa colonne d'infos capte la souris (la face
  //   reste transparente aux cartes qu'elle recouvre). Quitter la carte en
  //   direction de cette colonne ouvre un court **couloir** : pendant ce
  //   trajet, survoler d'autres cartes ne remplace pas l'aperçu. Repartir dans
  //   l'autre sens, ou traîner hors du panneau, rend le survol aux cartes.
  const apercuSurvolRef = useRef(null);
  const minuteursSurvolRef = useRef({ lisible: 0, masquer: 0, couloir: 0 });
  const couloirSurvolRef = useRef(null);
  const dansApercuRef = useRef(false);
  const pointeurRef = useRef({ x: -1, y: -1 });
  useEffect(() => { apercuSurvolRef.current = apercuSurvol; }, [apercuSurvol]);
  useEffect(() => () => {
    window.clearTimeout(minuteursSurvolRef.current.lisible);
    window.clearTimeout(minuteursSurvolRef.current.masquer);
    window.clearTimeout(minuteursSurvolRef.current.couloir);
  }, []);
  const [carteGlissee, setCarteGlissee] = useState(null);
  const [surZoneDepot, setSurZoneDepot] = useState(false);
  const [annulationDisponible, setAnnulationDisponible] = useState(false);
  const [sortJoue, setSortJoue] = useState(null);
  // Le sort du sorcier : même fiche au milieu du plateau, bordée de rouge.
  // Même vie que celle du joueur, mais son propre minuteur — les deux camps
  // peuvent lancer un sort dans la même seconde, les deux fiches s'empilent
  // alors au centre au lieu de se recouvrir.
  const [sortJoueSorcier, setSortJoueSorcier] = useState(null);
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
  const timerSortSorcierRef = useRef(null);
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
    if (timerSortSorcierRef.current) window.clearTimeout(timerSortSorcierRef.current);
    if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
    if (timerImpactRef.current) window.clearTimeout(timerImpactRef.current);
    if (timerGelMasseRef.current) window.clearTimeout(timerGelMasseRef.current);
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

  // Même chien de garde pour les tourbillons d'eau : un renvoi en main ne
  // laisse jamais sa spirale figée sur la table si la minuterie se perd.
  useEffect(() => {
    if (!tourbillonsEau.length) return undefined;
    const derniere = Math.max(...tourbillonsEau.map((effet) => effet.expireA ?? 0));
    const delai = Math.max(80, derniere - Date.now() + 80);
    const id = window.setTimeout(() => setTourbillonsEau((current) => nettoyerFantomes(current)), delai);
    return () => window.clearTimeout(id);
  }, [tourbillonsEau]);

  // Et pour les roues de feu : une flamme ne reste pas allumée sur une carte
  // qui n'est plus là si la minuterie se perd.
  useEffect(() => {
    if (!rouesFeu.length) return undefined;
    const derniere = Math.max(...rouesFeu.map((effet) => effet.expireA ?? 0));
    const delai = Math.max(80, derniere - Date.now() + 80);
    const id = window.setTimeout(() => setRouesFeu((current) => nettoyerFantomes(current)), delai);
    return () => window.clearTimeout(id);
  }, [rouesFeu]);

  // Même chien de garde pour les foudres du marteau : aucun éclair ne reste
  // suspendu au-dessus de la table si la minuterie se perd.
  useEffect(() => {
    if (!eclairsMarteau.length) return undefined;
    const derniere = Math.max(...eclairsMarteau.map((effet) => effet.expireA ?? 0));
    const delai = Math.max(80, derniere - Date.now() + 80);
    const id = window.setTimeout(() => setEclairsMarteau((current) => nettoyerFantomes(current)), delai);
    return () => window.clearTimeout(id);
  }, [eclairsMarteau]);

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
      setTourbillonsEau((current) => {
        const restants = nettoyerFantomes(current);
        return restants.length === current.length ? current : restants;
      });
      setRouesFeu((current) => {
        const restants = nettoyerFantomes(current);
        return restants.length === current.length ? current : restants;
      });
      setEclairsMarteau((current) => {
        const restants = nettoyerFantomes(current);
        return restants.length === current.length ? current : restants;
      });
      setAnimationsEntites((current) => (Object.keys(current).length ? {} : current));
      setMissVisibles((current) => (Object.keys(current).length ? {} : current));
      setSoinsVisibles((current) => (Object.keys(current).length ? {} : current));
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
    const to = mesurerDestinationVol(table, carteEnVol.kind, from, carteEnVol.carteId, carteEnVol.emplacement ?? null);
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
    const tutoriel = options.tutoriel === true ? tutorielParId(options.tutorielId) : null;
    const modeTutoriel = Boolean(tutoriel);
    const deckEssai = deckManaEssaiParId(options.essaiManaId);
    const adversaireEssai = deckEssai ? adversaireManaEssai(deckEssai) : null;
    const etageId = deckEssai ? null : options.etageId !== undefined ? options.etageId : histoireEtageId;
    const etageCourant = etageId ? etageHistoireParId(etageId)?.etage ?? null : null;
    const deckChoisiId = modeTutoriel ? tutoriel.deckId : options.deckId ?? deckSelectionneId;
    // Les leçons prêtent leur deck : il ne dépend pas de la collection du
    // joueur. Le plateau et les couleurs se lisent donc dans le catalogue.
    const deckTutorielJoueur = modeTutoriel ? RPG_DECKS.find((deck) => deck.id === tutoriel.deckId) ?? null : null;
    const deckTutorielAdverse = modeTutoriel ? RPG_DECKS.find((deck) => deck.id === tutoriel.opponentDeckId) ?? null : null;
    const deckJoueurSelectionne = modeTutoriel
      ? deckTutorielJoueur
      : decksTous.find((deck) => deck.id === deckChoisiId && deckSeJoue(deck, collection));
    // Duel libre : le sorcier joue la Cour des Djinns, ou un autre deck si le joueur joue déjà la Cour.
    // Dans le tutoriel, son paquet de Montagnes est volontairement passif.
    const deckAdverse = modeTutoriel || etageCourant || sorcierDeck || deckEssai ? null : deckAdversePour(deckJoueurSelectionne);
    setTutorielActif(modeTutoriel);
    setTutorielId(modeTutoriel ? tutoriel.id : null);
    allerEtapeTutoriel(modeTutoriel ? tutoriel.steps[0]?.id ?? null : null);
    setDeckDuelId(deckEssai?.id ?? (modeTutoriel ? deckTutorielJoueur?.id ?? null : joueurDeck ? null : deckJoueurSelectionne?.id ?? null));
    setDeckAdverseId(adversaireEssai?.id ?? deckAdverse?.id ?? deckTutorielAdverse?.id ?? null);
    // Chaque camp joue sur son terrain : la moitié basse de la table porte le
    // plateau du deck du joueur (y compris dans l'essai mana), la moitié haute
    // celui du deck adverse — même terrain des deux côtés, et la table reste
    // d'un seul tenant. Un paquet brut parle par sa couleur dominante,
    // un étage d'Histoire par la clé de son deck de campagne. En
    // partie réelle (`variantesPlateaux`), chaque camp peut échanger son
    // terrain contre son double merveilleux ; sans la prop (tests, scénarios),
    // les classiques sont gardés. Le plateau du joueur reste le principal : la
    // musique démarre sur son thème, puis suit la conquête à 60/40.
    const modeLibre = !modeTutoriel && !etageCourant;
    const resolutionPlateaux = resoudrePlateauxDuDuel({
      deckJoueur: deckEssai ?? (modeTutoriel ? deckJoueurSelectionne : joueurDeck ?? deckJoueurSelectionne),
      deckAdverse: adversaireEssai ?? (modeTutoriel
        ? deckTutorielAdverse
        : etageCourant ? etageCourant.deck : sorcierDeck ?? deckAdverse),
      rng,
      variantesFantaisistes: variantesPlateaux,
    });
    const plateau = resolutionPlateaux.joueur.plateau;
    setPlateauId(plateau.id);
    setPlateauAdverseId(resolutionPlateaux.adversaire.plateau.id);
    // `play()` doit partir directement du geste qui lance le duel : un effet
    // React différé peut être refusé par la politique d'autoplay du navigateur.
    const musiquePlateau = musiquePlateauRef.current;
    musiquePlateau?.setPlateau(plateau.id, { reroll: true });
    if (modeLibre && sonActif && RPG_PLATEAUX_MUSICAUX.has(plateau.id)) {
      void musiquePlateau?.start();
    }
    duelRef.current = rpgNouveauDuel({
      joueurDeck: convertirDeckSansTerrain(deckEssai?.cardIds ?? (modeTutoriel
        ? deckTutorielJoueur?.cardIds ?? RPG_TUTORIAL_PLAYER_DECK
        : joueurDeck ?? deckJoueurSelectionne?.cardIds ?? RPG_DECK_JOUEUR_BASE)),
      sorcierDeck: convertirDeckSansTerrain(adversaireEssai?.cardIds ?? (modeTutoriel
        ? deckTutorielAdverse?.cardIds ?? RPG_TUTORIAL_OPPONENT_DECK
        : etageCourant ? deckHistoire(etageCourant.deck) : sorcierDeck ?? deckAdverse?.cardIds ?? RPG_DECK_SORCIER_BASE)),
      sorcierPuissance: modeTutoriel ? 0 : etageCourant ? etageCourant.puissance : sorcierPuissance,
      // En duel libre, le sorcier joue désormais au niveau Veilleur : il
      // anticipe plusieurs coups au lieu de s'arrêter au meilleur score local.
      // Les étages gardent leur profil progressif ; le tutoriel conserve son
      // profil par défaut et n'est pas forcé au niveau Veilleur.
      sorcierIA: etageCourant ? etageCourant.ia : modeTutoriel ? undefined : { niveau: 'veilleur', style: 'equilibre' },
      modeMana: RPG_MODE_MANA_ESSAI,
      joueurCouleurs: deckEssai?.elements,
      sorcierCouleurs: adversaireEssai?.elements,
      rng,
    });
    if (deckEssai) duelRef.current.essaiDeckId = deckEssai.id;
    if (modeTutoriel) {
      preparerDuelTutoriel(duelRef.current, tutoriel);
      rpgDemarrerManaEssai(duelRef.current);
      appliquerManaInitialTutoriel(duelRef.current, tutoriel);
    }
    histoireVictoireMarqueeRef.current = null;
    const campagnePrecedente = campagneDuelRef.current;
    const campagneEffective = options.campagne ?? Boolean(
      campagnePrecedente && etageId && campagnePrecedente.etageId === etageId,
    );
    campagneDuelRef.current = campagneEffective ? {
      session: sessionDuelRef.current, etageId,
      curseur: progressionHistoireRef.current.recit?.curseur ?? campagnePrecedente?.curseur,
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
    setPoseEnCours(null);
    setEmplacementSurvole(null);
    setSacrificeDemande(null);
    setSacrificeFx(null);
    sacrificeEnCoursRef.current = null;
    finTourApresDefausseRef.current = false;
    setCarteDefausseSelectionnee(null);
    setApercuSurvol(null);
    appuiLongRef.current?.();
    appuiLongRef.current = null;
    setApercuAppui(null);
    setCarteGlissee(null);
    setSurZoneDepot(false);
    setAnnulationDisponible(false);
    setSortJoue(null);
    setSortJoueSorcier(null);
    setAnimationsEntites({});
    setCartesEnDestruction([]);
    setTourbillonsEau([]);
    setRouesFeu([]);
    setEclairsMarteau([]);
    setCarteEnVol(null);
    setImpactEcran(null);
    setGelMasseFx(null);
    if (timerGelMasseRef.current) window.clearTimeout(timerGelMasseRef.current);
    timerGelMasseRef.current = null;
    effacerSoinsVisibles();
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
    if (timerSortSorcierRef.current) window.clearTimeout(timerSortSorcierRef.current);
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
    if (modePvp) {
      const indices = [...mulligan.choix];
      masquerApercuSurvol();
      if (!indices.length) setMulligan(null);
      pvpEnVolCountRef.current += 1;
      Promise.resolve(pvpRef.current?.onIntention?.({ type: 'mulligan', index: indices }))
        .then((reponse) => {
          if (reponse?.etat) {
            duelRef.current = structuredClone(reponse.etat);
            pvpSeqAppliqueRef.current = reponse.seq ?? pvpSeqAppliqueRef.current;
          }
          if (!indices.length) {
            setMulligan(null);
            force();
            return;
          }
          const pluriel = (n) => (n > 1 ? 's' : '');
          const mainApres = duelRef.current?.joueur.main.length ?? 0;
          const nbPiochees = Math.min(indices.length, mainApres);
          jouerSfx('card_draw', 0.05);
          setMulligan({
            etape: 'resultat',
            choix: new Set(),
            nouveau: Array.from({ length: nbPiochees }, (_, offset) => Math.max(0, mainApres - nbPiochees) + offset),
            bilan: `Vous écartez ${indices.length} carte${pluriel(indices.length)} et piochez ${nbPiochees} carte${pluriel(nbPiochees)}.`,
          });
          force();
        })
        .finally(() => {
          pvpEnVolCountRef.current = Math.max(0, pvpEnVolCountRef.current - 1);
          force();
        });
      return;
    }
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
    if (!modePvp && duelRef.current?.modeMana === RPG_MODE_MANA_ESSAI) rpgDemarrerManaEssai(duelRef.current);
    setMulligan(null);
    force();
  };
  const envoyerIntentionPvp = (intention) => {
    if (!modePvp) return Promise.resolve(null);
    pvpEnVolCountRef.current += 1;
    return Promise.resolve(pvpRef.current?.onIntention?.(intention))
      .then((reponse) => {
        if (reponse?.etat && pvpEnVolCountRef.current <= 1) {
          const prochain = structuredClone(reponse.etat);
          if (prochain.phase === 'blocage' && prochain.combatDeclare?.cote === 'sorcier') {
            prochain.fenetreReponse = true;
          }
          duelRef.current = prochain;
          if (reponse.seq !== undefined) pvpSeqAppliqueRef.current = reponse.seq;
        }
        return reponse;
      })
      .finally(() => {
        pvpEnVolCountRef.current = Math.max(0, pvpEnVolCountRef.current - 1);
        force();
      });
  };
  const choisirNouveauManaEssai = (couleur) => {
    if (mulligan || !duelRef.current?.manaEssaiDemarre) return;
    const resultat = rpgChoisirCouleurMana(duelRef.current, 'joueur', couleur);
    if (!resultat.ok) { jouerSfx('erreur'); return; }
    if (modePvp) void envoyerIntentionPvp({ type: 'choix-mana', couleur });
    jouerSfx('select');
    force();
  };

  const duel = duelRef.current;
  const vainqueurPvp = modePvp && (pvp?.statut === 'terminee' || duel?.fin?.gagnant)
    ? ((pvp?.resultat === 'gagne' || pvp?.resultat === 'victoire' || (!pvp?.resultat && duel?.fin?.gagnant === 'joueur'))
      ? 'joueur'
      : (pvp?.resultat === 'perdu' || pvp?.resultat === 'defaite' || (!pvp?.resultat && duel?.fin?.gagnant === 'sorcier'))
        ? 'sorcier'
        : 'egalite')
    : null;
  const vainqueur = vainqueurPvp ?? (duel ? rpgVainqueur(duel) : null);
  const territoire = territoireDuDuel(duel, vainqueur);
  // Un nouveau duel repart avec la musique du joueur. Dans la bande neutre,
  // le dernier camp ayant franchi 60/40 conserve la main (hystérésis).
  const [memoireMusicale, setMemoireMusicale] = useState({ session: null, camp: 'joueur' });
  const sessionMusicale = sessionDuelRef.current;
  const campMusical = ecran === 'partie'
    ? campMusicalDuTerritoire(territoire.partJoueur,
      memoireMusicale.session === sessionMusicale ? memoireMusicale.camp : 'joueur')
    : 'joueur';
  useEffect(() => {
    setMemoireMusicale((avant) => avant.session === sessionMusicale && avant.camp === campMusical
      ? avant : { session: sessionMusicale, camp: campMusical });
  }, [sessionMusicale, campMusical]);
  const plateauMusiqueId = plateauMusicalDuCamp(campMusical, plateauId, plateauAdverseId);
  useEffect(() => {
    const musique = musiqueRef.current;
    if (!musique || (ecran === 'partie' && !duel)) return;
    const plateauMusical = RPG_PLATEAUX_MUSICAUX.has(plateauMusiqueId);
    if (ecran === 'partie' && tourHistoireId && sonActif && !plateauMusical && !document.hidden) musique.start();
    else musique.stop();
  }, [ecran, lectureHistoire, tourHistoireId, plateauMusiqueId, sonActif, Boolean(duel)]);
  useEffect(() => {
    const musique = musiquePlateauRef.current;
    if (!musique || (ecran === 'partie' && !duel)) return;
    musique.setPlateau(plateauMusiqueId);
    if (ecran === 'partie' && sonActif && !document.hidden) void musique.start();
    else if (ecran === 'partie') musique.pause();
    else musique.stop();
  }, [plateauMusiqueId, ecran, sonActif, Boolean(duel)]);
  // Un onglet mis de côté ne laisse pas la boucle tourner dans le vide ;
  // au retour, elle reprend où le duel en est.
  useEffect(() => {
    const surVisibilite = () => {
      const musiqueTheme = musiqueThemeRef.current;
      if (musiqueTheme) {
        if (document.hidden) musiqueTheme.pause();
        else if (ecran !== 'partie' && sonActif) musiqueTheme.resume();
      }
      const musique = musiqueRef.current;
      if (musique) {
        if (document.hidden) musique.pause();
        else if (ecran === 'partie' && tourHistoireId && sonActif && !RPG_PLATEAUX_MUSICAUX.has(plateauMusiqueId)) musique.start();
      }
      const musiquePlateau = musiquePlateauRef.current;
      if (musiquePlateau) {
        if (document.hidden) musiquePlateau.pause();
        else if (ecran === 'partie' && sonActif) void musiquePlateau.start();
      }
    };
    document.addEventListener('visibilitychange', surVisibilite);
    return () => document.removeEventListener('visibilitychange', surVisibilite);
  }, [ecran, lectureHistoire, tourHistoireId, plateauMusiqueId, sonActif]);
  const basculerSon = () => setSonActif((actif) => {
    const prochain = !actif;
    if (prochain) {
      if (ecran === 'partie') {
        if (tourHistoireId && !RPG_PLATEAUX_MUSICAUX.has(plateauMusiqueId)) musiqueRef.current?.start();
        if (RPG_PLATEAUX_MUSICAUX.has(plateauMusiqueId)) void musiquePlateauRef.current?.start();
      } else {
        void musiqueThemeRef.current?.start();
      }
    }
    return prochain;
  });
  const delaiReflexionSorcier = () => rpgDelaiReflexionIA(duel, 'sorcier');
  // Les cartes que l'eau ramène dans la main du joueur : elles restent hors de
  // la main tant que le tourbillon joue — le geste se lit avant le résultat.
  const cartesEnRenvoi = new Set((tourbillonsEau ?? [])
    .filter((effet) => effet.camp !== 'sorcier')
    .map((effet) => effet.cardId));
  useRpgMythicImpact(duel, ecran, tableRef, cardById, jouerSfx);
  const plateau = plateauParId(plateauId) ?? PLATEAU_PAR_DEFAUT;
  // La moitié haute de la table : le terrain du deck adverse. La table n'est
  // découpée que si les deux terrains diffèrent ; sinon, un seul tenant, sans
  // couture. Le décor 3D couvre la table entière d'une seule peinture : il
  // s'efface quand la table est découpée (le réglage du joueur, lui, reste).
  const plateauAdverse = plateauParId(plateauAdverseId) ?? plateau;
  const plateauDecoupe = plateauAdverse.id !== plateau.id;
  const decor3dVisible = decor3dActif && !plateauDecoupe;
  // Le plateau passe au flou léger derrière un aperçu qui pose un voile sombre :
  // la fiche ouverte d'un appui long, d'un clic au catalogue ou d'un clic droit.
  // Rien au survol de la souris : cet aperçu-là s'ouvre et se referme au passage
  // du curseur, la table resterait à clignoter au moindre effleurement ; et
  // l'effet activé porte déjà son propre voile flouté (`.rpg-auto-preview`).
  // Le sort joué n'est plus un aperçu : sa fiche compacte se glisse au-dessus
  // des piles sans voiler la table, qui reste donc nette.
  const apercuCarte = (apercuAppui || apercuCatalogue) ? 'fiche' : null;
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

  // Une étape d'attente se referme toute seule quand la table offre ce qu'elle
  // attend : le tour revient au joueur, l'assaut adverse est déclaré. Aucune
  // étape ne doit rester bloquée sur un état déjà passé (le joueur ne pourrait
  // plus avancer). « Le tour revient » suppose d'avoir vu celui du sorcier :
  // au moment où l'étape s'affiche, le clic de fin de tour n'a pas encore
  // basculé le camp.
  const observationTutorielRef = useRef({ id: null, tourSorcier: false });
  useEffect(() => {
    if (!tutorielActif || !duel) return;
    const index = etapesTutoriel.findIndex((step) => step.id === etapeTutorielId);
    const etape = index >= 0 ? etapesTutoriel[index] : null;
    if (!etape || etape.kind !== 'waiting') return;
    const observation = observationTutorielRef.current;
    if (observation.id !== etapeTutorielId) {
      observation.id = etapeTutorielId;
      observation.tourSorcier = false;
    }
    if (duel.tour === 'sorcier') observation.tourSorcier = true;
    const condition = etape.waitFor === 'tour-joueur'
      ? duel.tour === 'joueur' && observation.tourSorcier && !duel.annonce && !combatEntrant
      : etape.waitFor === 'annonce'
        ? Boolean(duel.annonce)
        : etape.waitFor === 'combat-adverse'
          ? combatEntrant?.coteAttaquant === 'sorcier'
          : etape.waitFor === 'combat-joueur'
            ? combatEntrant?.coteAttaquant === 'joueur'
            : false;
    if (condition && index < etapesTutoriel.length - 1) allerEtapeTutoriel(etapesTutoriel[index + 1].id);
  }, [tutorielActif, etapeTutorielId, duel?.tour, duel?.annonce, combatEntrant]);
  // Certaines étapes préparent leur scène en arrivant (la créature que le
  // sorcier envoie pour la leçon de blocage). L'appel est idempotent.
  useEffect(() => {
    if (!tutorielActif || !duelRef.current) return;
    const etape = etapesTutoriel.find((step) => step.id === etapeTutorielId);
    if (!etape?.prepare) return;
    const creees = preparerEtapeTutoriel(duelRef.current, etape);
    if (creees.length) force();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorielActif, etapeTutorielId, duel?.tour]);
  useLayoutEffect(() => {
    if (!duel) return;
    const instantaneActuel = {
      joueur: { deck: duel.joueur.deckCount ?? duel.joueur.deck.length, main: duel.joueur.mainCount ?? duel.joueur.main.length },
      sorcier: { deck: duel.sorcier.deckCount ?? duel.sorcier.deck.length, main: duel.sorcier.mainCount ?? duel.sorcier.main.length },
    };
    const instantanePrecedent = instantanePiocheRef.current;
    instantanePiocheRef.current = instantaneActuel;
    if (!instantanePrecedent) return;

    const animations = [];
    for (const side of ['joueur', 'sorcier']) {
      const nbDeck = instantaneActuel[side].deck;
      const nbMain = instantaneActuel[side].main;
      const nombrePioches = Math.min(8, Math.max(0, instantanePrecedent[side].deck - nbDeck));
      if (!nombrePioches) continue;
      const indexPremierePioche = Math.max(0, nbMain - nombrePioches);
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
    // Mesure dans le même repère écran : le départ suit le vrai paquet,
    // y compris après rotation ou changement de taille de la table.
    const table = tableRef.current;
    const decks = table?.querySelectorAll('.rpg-card-pile--deck');
    for (const side of ['joueur', 'sorcier']) {
      const main = table?.querySelector(side === 'joueur' ? '.rpg-hand' : '.rpg-hidden-hand');
      const deck = decks?.[side === 'joueur' ? 1 : 0];
      if (!main || !deck) continue;
      const depart = deck.getBoundingClientRect();
      const arrivee = main.getBoundingClientRect();
      main.style.setProperty('--rpg-draw-x', `${depart.left + depart.width / 2 - arrivee.left - arrivee.width / 2}px`);
      main.style.setProperty('--rpg-draw-y', `${depart.top + depart.height / 2 - arrivee.top - arrivee.height / 2}px`);
    }
    setAnimationsPioche((current) => [...current, ...animations].slice(-12));
    animations.forEach((animation) => {
      const timer = window.setTimeout(() => {
        setAnimationsPioche((current) => current.filter((active) => active.token !== animation.token));
      }, 1050 + animation.delay);
      timersRef.current.push(timer);
    });
  }, [
    duel,
    duel?.joueur.deckCount ?? duel?.joueur.deck.length,
    duel?.joueur.mainCount ?? duel?.joueur.main.length,
    duel?.sorcier.deckCount ?? duel?.sorcier.deck.length,
    duel?.sorcier.mainCount ?? duel?.sorcier.main.length,
  ]);
  // Mobile, table d'essai : chaque plaque ouvre la colonne de gauche, sa jauge
  // de mana se range derrière elle, dans la même rangée de grille. Publier la
  // hauteur réelle mesurée des deux — la plaque (`--rpg-plaque-*-h`) et la
  // place qui reste pour la jauge (`--rpg-jauge-*-h`) — laisse la colonne
  // s'ajuster d'elle-même : une plaque plus haute parce que les zones de
  // cartes passent sur deux lignes rétrécit sa jauge au lieu de la faire
  // déborder sur le camp d'en face.
  const essaiTactile = Boolean(duel && viewport.mobile && duel.modeMana === RPG_MODE_MANA_ESSAI);
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!essaiTactile || !table) return undefined;
    const camps = [
      { plaque: table.querySelector('.rpg-wizard-plate--ennemi'), rangee: table.querySelector('.card-row--ennemi'), suffixe: 'ennemi' },
      { plaque: table.querySelector('.rpg-wizard-plate--joueur'), rangee: table.querySelector('.card-row--equipe'), suffixe: 'joueur' },
    ].filter(({ plaque, rangee }) => plaque && rangee);
    if (!camps.length) return undefined;
    const publier = () => {
      // Le bord droit des plaques : la barre de réponse du sorcier s'y accroche
      // au lieu de les recouvrir (elle occupe toute la largeur restante,
      // au-dessus de la main).
      const joueur = camps.find(({ suffixe }) => suffixe === 'joueur') ?? camps[0];
      table.style.setProperty('--rpg-plaque-droite', `${Math.round(joueur.plaque.getBoundingClientRect().right)}px`);
      for (const { plaque, rangee, suffixe } of camps) {
        const hauteurPlaque = plaque.offsetHeight;
        table.style.setProperty(`--rpg-plaque-${suffixe}-h`, `${hauteurPlaque}px`);
        // La rangée de jeu du camp donne la hauteur de la cellule de grille :
        // ce qui reste sous (ou au-dessus de) la plaque revient à la jauge.
        const place = Math.max(0, Math.round(rangee.getBoundingClientRect().height - hauteurPlaque - 1));
        table.style.setProperty(`--rpg-jauge-${suffixe}-h`, `${place}px`);
      }
    };
    publier();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(publier);
    camps.forEach(({ plaque, rangee }) => {
      observateur.observe(plaque);
      observateur.observe(rangee);
    });
    return () => {
      observateur.disconnect();
      table.style.removeProperty('--rpg-plaque-droite');
    };
  }, [essaiTactile, ecran, duel]);
  // La barre de combat ferme la colonne de droite, juste au-dessus
  // de la main, et sa hauteur varie d'une à trois commandes empilées
  // (« Confirmer l'attaque », « Annuler l'attaque », « Résoudre le combat »…).
  // Sa hauteur réelle est publiée en variable CSS : le rail du tour s'ancre
  // juste au-dessus d'elle, sans jamais la recouvrir ni passer sous la main.
  useLayoutEffect(() => {
    const table = tableRef.current;
    const controles = table?.querySelector('.rpg-bottombar');
    if (!table || !controles) return undefined;
    const publier = () => table.style.setProperty('--rpg-controles-h', `${controles.offsetHeight}px`);
    publier();
    const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(publier) : null;
    observateur?.observe(controles);
    return () => {
      observateur?.disconnect();
      table.style.removeProperty('--rpg-controles-h');
    };
  }, [viewport.mobile, ecran, duel]);
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
    const minuteurs = minuteursSurvolRef.current;
    const actuel = apercuSurvolRef.current;
    const entiteId = event.currentTarget.dataset.entityId ?? null;
    const dansMain = Boolean(event.currentTarget.classList?.contains('rpg-hand__card'));
    const furie = etatFurieDepuisHote(event.currentTarget);
    const effetsEpuises = effetsEpuisesDepuisHote(event.currentTarget);
    // Deux exemplaires de la même carte ne partagent pas leur preview : une
    // créature en Furie (ou équipée) n'hérite pas de l'aperçu de sa jumelle.
    const memeCarte = actuel?.carteId === carte.id && (actuel?.entiteId ?? null) === entiteId;
    // En chemin vers la colonne d'infos de l'aperçu (ou dedans), les cartes
    // traversées ne le remplacent pas.
    if (!memeCarte && (couloirSurvolRef.current || dansApercuRef.current) && actuel) return;
    window.clearTimeout(minuteurs.masquer);
    window.clearTimeout(minuteurs.couloir);
    couloirSurvolRef.current = null;
    // Retour sur la carte déjà ouverte (après un passage sur son aperçu, ou
    // parce que la carte soulevée a glissé sous la souris) : l'aperçu reste
    // lisible, sans rejouer le son ; il suit la carte si elle a bougé et
    // rafraîchit ce qu'elle porte — armes, et Furie si elle s'est enflammée.
    if (memeCarte) {
      setApercuSurvol((courant) => (courant?.carteId === carte.id && (courant.entiteId ?? null) === entiteId ? {
        ...courant,
        dansMain,
        armesIds: armes,
        furie,
        effetsEpuises,
        rectangle: {
          left: rectangle.left,
          right: rectangle.right,
          top: rectangle.top,
          bottom: rectangle.bottom,
          width: rectangle.width,
          height: rectangle.height,
        },
      } : courant));
      return;
    }
    window.clearTimeout(minuteurs.lisible);
    minuteurs.lisible = window.setTimeout(() => {
      setApercuSurvol((courant) => (courant?.carteId === carte.id ? { ...courant, interactif: true } : courant));
    }, 450);
    // Première pose, au bord de la carte : le panneau n'existe pas encore,
    // sa taille est inconnue. L'effet de mise en page ci-dessous le repose
    // d'après sa boîte réelle, avant la première peinture.
    setApercuSurvol({
      carteId: carte.id,
      entiteId,
      dansMain,
      armesIds: armes,
      furie,
      effetsEpuises,
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
  const masquerApercuSurvol = () => {
    window.clearTimeout(minuteursSurvolRef.current.lisible);
    window.clearTimeout(minuteursSurvolRef.current.masquer);
    window.clearTimeout(minuteursSurvolRef.current.couloir);
    couloirSurvolRef.current = null;
    dansApercuRef.current = false;
    apercuSurvolRef.current = null;
    setApercuSurvol(null);
  };
  /** L'aperçu s'efface et la carte restée sous la souris reprend son survol :
   * elle n'a pas reçu d'entrée pendant que l'aperçu tenait la main. */
  const rendreSurvolAuxCartes = () => {
    masquerApercuSurvol();
    window.requestAnimationFrame(() => {
      const { x, y } = pointeurRef.current;
      if (x < 0 || apercuSurvolRef.current) return;
      const sous = document.elementFromPoint?.(x, y);
      sous?.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
    });
  };
  /** La souris quitte la carte : l'aperçu lisible ouvre le couloir vers sa
   * colonne d'infos ; l'aperçu encore inerte s'efface tout de suite. */
  const quitterCarteSurvol = () => {
    const actuel = apercuSurvolRef.current;
    const details = panelRef.current?.querySelector('.rpg-hover-card-preview__details');
    if (!actuel?.interactif || !details) {
      masquerApercuSurvol();
      return;
    }
    const boite = details.getBoundingClientRect();
    const depart = pointeurRef.current;
    couloirSurvolRef.current = {
      depart,
      sens: boite.left + (boite.width / 2) >= depart.x ? 1 : -1,
    };
    window.clearTimeout(minuteursSurvolRef.current.couloir);
    minuteursSurvolRef.current.couloir = window.setTimeout(() => {
      couloirSurvolRef.current = null;
      if (!dansApercuRef.current) rendreSurvolAuxCartes();
    }, 420);
  };
  const entrerApercuSurvol = () => {
    dansApercuRef.current = true;
    couloirSurvolRef.current = null;
    window.clearTimeout(minuteursSurvolRef.current.couloir);
    window.clearTimeout(minuteursSurvolRef.current.masquer);
  };
  const sortirApercuSurvol = () => {
    dansApercuRef.current = false;
    window.clearTimeout(minuteursSurvolRef.current.masquer);
    minuteursSurvolRef.current.masquer = window.setTimeout(rendreSurvolAuxCartes, 120);
  };
  // La position de la souris, et la sortie du couloir : repartir à rebours de
  // la colonne d'infos, c'est renoncer à la lire.
  useEffect(() => {
    const suivre = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointeurRef.current = { x: event.clientX, y: event.clientY };
      const couloir = couloirSurvolRef.current;
      if (couloir && (event.clientX - couloir.depart.x) * couloir.sens < -10) {
        window.clearTimeout(minuteursSurvolRef.current.couloir);
        couloirSurvolRef.current = null;
        if (!dansApercuRef.current) rendreSurvolAuxCartes();
      }
    };
    window.addEventListener('pointermove', suivre, { passive: true });
    return () => window.removeEventListener('pointermove', suivre);
  }, []);

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
    carteSourceApercuRef.current = null;
    setApercuAppuiFurie(null);
    setApercuAppuiEffetsEpuises([]);
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
    const furieDeLaCarte = etatFurieDepuisHote(hote);
    const effetsEpuisesDeLaCarte = effetsEpuisesDepuisHote(hote);
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
        // Le plateau se floute derrière la carte, pas elle : on retient l'élément.
        carteSourceApercuRef.current = hote;
        setApercuAppuiArmes(armesDeLaCarte);
        setApercuAppuiFurie(furieDeLaCarte);
        setApercuAppuiEffetsEpuises(effetsEpuisesDeLaCarte);
        setApercuAppui(carte.id);
      },
    });
  };
  // ── La fiche du catalogue : la carte cliquée s'ouvre en grand ─────────────
  const fermerApercuCatalogue = () => {
    jouerSfx('annuler');
    carteSourceApercuRef.current = null;
    setApercuCatalogueFurie(null);
    setApercuCatalogueEffetsEpuises([]);
    setApercuCataloguePrisonniere(null);
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
  const ouvrirApercuCatalogue = (carte, { armes = [], furie = null, effetsEpuises = [], prisonniere = null, surface = 'CATALOGUE' } = {}) => {
    if (!carte) return;
    annulerAppuiLong();
    masquerApercuSurvol();
    unlockSfx();
    jouerSfx('hover');
    setApercuCatalogueArmes(armes);
    setApercuCatalogueFurie(furie);
    setApercuCatalogueEffetsEpuises(effetsEpuises);
    setApercuCataloguePrisonniere(prisonniere);
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
    // Le plateau se floute derrière la carte, pas elle : on retient l'élément.
    carteSourceApercuRef.current = hote;
    ouvrirApercuCatalogue(carte, {
      armes: (hote.dataset.armes ?? '').split(' ').filter(Boolean),
      furie: etatFurieDepuisHote(hote),
      effetsEpuises: effetsEpuisesDepuisHote(hote),
      // Le capteur d'Abordage dit qui il détient : la fiche empilera les deux.
      prisonniere: hote.dataset.prisonniere ?? null,
      surface: SURFACE_FICHE[ecran] ?? 'LE SABLIER',
    });
  };
  // Le plateau se floute derrière la carte consultée, elle seule reste nette :
  // `data-apercu-source` est posé sur l'élément qui a ouvert l'aperçu — en main,
  // sur la table, dans un rail de terrains ou sur le dessus d'une pile — et
  // retiré dès que l'aperçu se referme. La feuille de style exclut cette carte
  // du flou (`rpg-battle.css`, « Le plateau derrière une carte consultée »).
  useEffect(() => {
    const hote = carteSourceApercuRef.current;
    if (!hote || !(apercuAppui || apercuCatalogue)) return undefined;
    hote.setAttribute('data-apercu-source', '');
    return () => hote.removeAttribute('data-apercu-source');
  }, [apercuAppui, apercuCatalogue]);

  // En portrait, l'écran de rotation reprend la main : plus rien à consulter.
  useEffect(() => {
    if (viewport.portrait && apercuAppui) fermerApercuAppui();
  }, [viewport.portrait, apercuAppui]);

  // « M » coupe ou rend la musique (en partie comme hors parties).
  useEffect(() => {
    const surTouche = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const cible = event.target?.tagName;
      if (cible === 'INPUT' || cible === 'TEXTAREA' || cible === 'SELECT' || event.target?.isContentEditable) return;
      if (event.key?.toLowerCase() !== 'm') return;
      basculerSon();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ecran, tourHistoireId, plateauId]);

  // Raccourcis clavier PC en duel (façon MTG Arena / Runeterra) :
  // - 1 / 2 / 3 (ou Digit1..3 sur AZERTY) : choisir la couleur de mana en début de tour
  // - Espace : action principale contextuelle (Fin du tour, Confirmer l'attaque, Résoudre le combat, Laisser passer)
  // - A : Attaquer avec tous
  // - Z ou Ctrl/Cmd+Z : Annuler la dernière action ou Annuler l'attaque
  useEffect(() => {
    if (ecran !== 'partie' || viewport.portrait) return undefined;
    const surRaccourciDuel = (event) => {
      if (event.defaultPrevented || event.repeat || event.altKey) return;
      if (vientDunChampDeSaisie(event.target)) return;
      const coque = shellRef.current;
      if (!coque || coque.getAttribute('data-scene') !== 'duel') return;
      if (apercuAppui || apercuCatalogue || navMenuOuvert || navParametresOuvert || messagerieVoletOuvert) return;

      const touche = event.key?.toLowerCase() ?? '';
      const code = event.code ?? '';

      // Ctrl+Z / Cmd+Z ou Z seul : Annuler la dernière action ou Annuler l'attaque
      if (touche === 'z') {
        const btnUndo = coque.querySelector('.rpg-btn--undo:not(:disabled), .rpg-btn--cancel-attack:not(:disabled)');
        if (btnUndo) {
          event.preventDefault();
          btnUndo.click();
        }
        return;
      }
      if (event.ctrlKey || event.metaKey) return;

      // Choix de mana en début de tour : touches 1, 2, 3 (QWERTY & AZERTY via code)
      const optionsMana = coque.querySelectorAll('.rpg-flux-choix__option:not(:disabled)');
      const indexChiffre = (touche === '1' || code === 'Digit1' || code === 'Numpad1') ? 0
        : (touche === '2' || code === 'Digit2' || code === 'Numpad2') ? 1
          : (touche === '3' || code === 'Digit3' || code === 'Numpad3') ? 2
            : (touche === '4' || code === 'Digit4' || code === 'Numpad4') ? 3
              : (touche === '5' || code === 'Digit5' || code === 'Numpad5') ? 4
                : -1;
      if (optionsMana.length > 0) {
        if (indexChiffre >= 0 && indexChiffre < optionsMana.length) {
          event.preventDefault();
          optionsMana[indexChiffre].click();
        }
        return;
      }

      // Une créature attend sa case : les touches 1 à 5 désignent alors
      // l'emplacement numéroté (une case occupée n'a pas de bouton).
      const boutonEmplacement = indexChiffre >= 0
        ? coque.querySelector(`.rpg-creature-slot--choix[data-creature-slot="${indexChiffre + 1}"]`)
        : null;
      if (boutonEmplacement) {
        event.preventDefault();
        boutonEmplacement.click();
        return;
      }
      // Choix d'emplacement ouvert mais case occupée : la touche ne retombe
      // pas sur la main — elle ne fait rien, comme un clic refusé.
      if (indexChiffre >= 0 && coque.querySelector('.rpg-creature-slot--choix')) return;

      // Touches 1 à 5 hors choix de mana : jouer ou sélectionner une carte jouable de la main
      if (indexChiffre >= 0) {
        const cartesMain = coque.querySelectorAll('.rpg-hand .rpg-hand__card');
        const carteMain = cartesMain[indexChiffre];
        if (carteMain && !carteMain.disabled && carteMain.classList.contains('is-playable')) {
          event.preventDefault();
          carteMain.click();
        }
        return;
      }

      // A : Attaquer avec tous
      if (touche === 'a') {
        const btnAttaqueTous = coque.querySelector('.rpg-btn--attaque-tous:not(:disabled)');
        if (btnAttaqueTous) {
          event.preventDefault();
          btnAttaqueTous.click();
        }
        return;
      }

      // Espace : commande principale du tour (hors focus sur un bouton/lien pour ne pas doubler le clic natif)
      if (code === 'Space' || event.key === ' ') {
        if (event.target?.closest?.('button, a, [role="button"]')) return;
        const btnPrincipal = coque.querySelector([
          '.rpg-mulligan__keep:not(:disabled)',
          '.rpg-btn--discard-confirm:not(:disabled)',
          '.rpg-annonce-sort__pass:not(:disabled)',
          '.rpg-btn--confirmer-attaque:not(:disabled)',
          '.rpg-btn--resolve-combat:not(:disabled)',
          '.rpg-btn--endturn:not(:disabled)',
        ].join(', '));
        if (btnPrincipal) {
          event.preventDefault();
          btnPrincipal.click();
        }
      }
    };
    window.addEventListener('keydown', surRaccourciDuel);
    return () => window.removeEventListener('keydown', surRaccourciDuel);
  }, [ecran, viewport.portrait, apercuAppui, apercuCatalogue, navMenuOuvert, navParametresOuvert, messagerieVoletOuvert]);

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

  const demarrerTutoriel = (tutorielIdChoisi) => {
    const tutoriel = tutorielParId(tutorielIdChoisi);
    unlockSfx();
    jouerSfx('select');
    setHistoireEtageId(null);
    setTutorielId(tutoriel.id);
    nouvellePartie({ etageId: null, tutoriel: true, tutorielId: tutoriel.id, deckId: tutoriel.deckId });
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
    // Aucun état de geste ne survit au départ pour la lecture : un vol de carte
    // ou un glisser laissé en arrière rendrait la table `is-card-flight-active`
    // — donc muette (`pointer-events: none`) — au retour du duel.
    timerVolRef.current = null;
    timerSortRef.current = null;
    timerSortSorcierRef.current = null;
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
    if (sonActif) void musiqueThemeRef.current?.start();
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
          profil={profilJoueur}
          barreXp={barreXp}
          paquetsDePalierEnAttente={paquetsDePalierEnAttente}
          nomCompte={nomProfilJoueur}
          onRenommerProfil={renommerLeProfil}
          onChoisirEmbleme={choisirUnEmblemeProfil}
          statutSync={statutSync}
          onEnregistrerDeckMaison={enregistrerDeckMaison}
          onSupprimerDeckMaison={supprimerDeckMaison}
          onHoverCard={afficherApercuSurvol}
          onLeaveHoverCard={quitterCarteSurvol}
          onOpenCardPreview={ouvrirApercuCatalogue}
          onPlaySfx={jouerSfx}
          fullscreen={pleinEcran}
          onToggleFullscreen={basculerPleinEcran}
          decor3dActif={decor3dActif}
          onToggleDecor3d={basculerDecor3d}
          sonActif={sonActif}
          onToggleSound={basculerSon}
          volumeSfx={volumeSfx}
          onChangeVolumeSfx={changerVolumeSfx}
          onToggleSfxMute={basculerVolumeSfx}
          volumeMusique={volumeMusique}
          onChangeVolumeMusique={changerVolumeMusique}
          onToggleMusicMute={basculerVolumeMusique}
          desktopMode={desktopMode}
          desktopAccount={desktopAccount}
          onSignOut={onSignOut}
        />
        {recompenseTutoriel && (
          <div className="rpg-tutorial-reward-toast" role="status" aria-live="polite" key={recompenseTutoriel.token}>
            <RpgCreditIcon />
            <strong>Leçon terminée</strong>
            <span>+{recompenseTutoriel.gain} crédits</span>
          </div>
        )}
        {/* Le palier tombe où le joueur est : au menu comme sur la table, le
            paquet offert s'ouvre par-dessus l'écran (dossier 20). */}
        <MonteeDeNiveau
          montee={monteeNiveau}
          profil={profilJoueur}
          cardArt={cardArt}
          onFermer={fermerMonteeNiveau}
          onPlaySfx={jouerSfx}
        />
        {apercuSurvol && (
          <HoverCardPreview
            carte={cardById(apercuSurvol.carteId)}
            furieDeclenchee={Boolean(apercuSurvol.furie)}
            statsFurie={apercuSurvol.furie}
            effetsEpuises={apercuSurvol.effetsEpuises ?? []}
            style={apercuSurvol.style}
            panelRef={panelRef}
            interactif={Boolean(apercuSurvol.interactif)}
            onPointerEnter={entrerApercuSurvol}
            onPointerLeave={sortirApercuSurvol}
          />
        )}
        {apercuAppui && <ApercuCarteAppuiLong carte={cardById(apercuAppui)} furieDeclenchee={Boolean(apercuAppuiFurie)} statsFurie={apercuAppuiFurie} effetsEpuises={apercuAppuiEffetsEpuises} onFermer={fermerApercuAppui} />}
        {apercuCatalogue && (
          <ApercuCarteCatalogue
            carte={cardById(apercuCatalogue)}
            armes={cartesDesIds(apercuCatalogueArmes)}
            prisonniere={apercuCataloguePrisonniere ? cardById(apercuCataloguePrisonniere) : null}
            furieDeclenchee={Boolean(apercuCatalogueFurie)}
            statsFurie={apercuCatalogueFurie}
            effetsEpuises={apercuCatalogueEffetsEpuises}
            surface={apercuCatalogueSurface}
            onFermer={fermerApercuCatalogue}
          />
        )}
      </div>
    );
  }
  if (!duel) {
    if (!modePvp) return null;
    return (
      <div ref={shellRef} className="rpg-battle rpg-battle--duel rpg-battle--pvp-loading" onContextMenu={neutraliserMenuContextuel}>
        <div className="rpg-pvp-loading-panel" role="status" aria-live="polite">
          <span className="rpg-pvp-loading-eyebrow">LE SABLIER · DUEL EN LIGNE</span>
          <strong>Préparation de la table…</strong>
        </div>
      </div>
    );
  }
  const soinJoueur = soinsVisibles.joueur ?? null;
  const soinSorcier = soinsVisibles.sorcier ?? null;
  // L'éclat de soin d'une créature posée. Une pile d'homonymes repliée ne
  // montre que sa carte de tête : elle porte alors le plus grand soin de la
  // pile, pour qu'aucun soin ne passe inaperçu derrière elle.
  const soinDeCarte = (entite, pile, deployee) => soinsVisibles[entite.id]
    ?? (deployee ? null : pile.entites
      .map((membre) => soinsVisibles[membre.id])
      .filter(Boolean)
      .reduce((meilleur, soin) => (!meilleur || soin.montant > meilleur.montant ? soin : meilleur), null));
  const missDeCarte = (entite, pile, deployee) => missVisibles[entite.id]
    ?? (deployee ? null : pile.entites
      .map((membre) => missVisibles[membre.id])
      .find(Boolean) ?? null);
  // Même relève pour le choc d'un bouclier : la tête d'une pile repliée
  // porte l'impact de l'exemplaire caché qui vient d'encaisser.
  const bouclierDeCarte = (entite, pile, deployee) => boucliersVisibles[entite.id]
    ?? (deployee ? null : pile.entites
      .map((membre) => boucliersVisibles[membre.id])
      .find(Boolean) ?? null);
  const etageHistoire = histoireEtageId ? etageHistoireParId(histoireEtageId)?.etage ?? null : null;
  const etageSuivant = histoireEtageId ? prochainEtage(histoireEtageId) : null;
  const tourDuJoueur = duel.tour === 'joueur' && !vainqueur;
  // Fin de tour : le camp qui a fini ne joue plus ; l'AUTRE a la main pour une magie rapide.
  const finTourJoueur = Boolean(duel.finDeTour?.cote === 'joueur' && !vainqueur);
  const fenetreFinTour = Boolean(duel.finDeTour?.cote === 'sorcier' && !vainqueur);
  // Tant que le volet de mulligan est ouvert, la table attend : rien ne se
  // joue, rien ne s'engage, et le tour ne peut pas être rendu.
  const mulliganOuvert = Boolean(mulligan);
  const mulliganAttenteAdverse = Boolean(
    modePvp && !mulliganOuvert && !vainqueur && (!duel.mulliganFait?.joueur || !duel.mulliganFait?.sorcier),
  );
  const attenteBlocageAdverse = Boolean(
    modePvp && !vainqueur && duel.phase === 'blocage' && duel.combatDeclare?.cote === 'joueur',
  );
  const monTour = tourDuJoueur && !finTourJoueur && !mulliganAttenteAdverse && !attenteBlocageAdverse;
  const sorcierReflechit = Boolean(!vainqueur && !tutorielActif && duel.tour === 'sorcier'
    && !duel.annonce && !combatEntrant && !duel.finDeTour && !duel.magieGratuite
    && !duel.arriveeEnAttente && !duel.destructionsEnAttente?.length
    && !duel.defausseEnAttente && !mulliganOuvert);
  const choixManaEssaiOuvert = duel.modeMana === RPG_MODE_MANA_ESSAI
    && Boolean(duel.joueur.manaChoixEnAttente) && !mulliganOuvert && !mulliganAttenteAdverse && !vainqueur;
  const etapeTutoriel = etapesTutoriel.find((step) => step.id === etapeTutorielId) ?? null;
  const indexEtapeTutoriel = etapeTutoriel ? etapesTutoriel.findIndex((step) => step.id === etapeTutoriel.id) : -1;
  /** Vrai si l'étape courante encadre cette zone du plateau. Évite de figer
   *  une liste d'identifiants d'étapes dans le rendu. */
  const cibleTutoriel = (nom) => Boolean(tutorielActif
    && etapeTutoriel?.target?.includes(`data-tutorial-target="${nom}"`));
  const deckPvpJoueur = modePvp
    ? (RPG_DECKS.find((deck) => deck.id === pvp?.decks?.joueur?.id)
      ?? (duel.joueur.couleurs?.length ? {
        id: 'pvp-joueur',
        name: pvp?.decks?.joueur?.name ?? 'Votre deck',
        elements: duel.joueur.couleurs,
        cardIds: [],
      } : null))
    : null;
  const deckPvpAdverse = modePvp
    ? (RPG_DECKS.find((deck) => deck.id === pvp?.decks?.sorcier?.id)
      ?? (duel.sorcier.couleurs?.length ? {
        id: 'pvp-sorcier',
        name: pvp?.decks?.sorcier?.name ?? 'Deck adverse',
        elements: duel.sorcier.couleurs,
        cardIds: [],
      } : null))
    : null;
  const deckJoueurAffiche = deckPvpJoueur
    ?? (duel.modeMana === RPG_MODE_MANA_ESSAI ? deckManaEssaiParId(duel.essaiDeckId) : null)
    ?? (tutorielActif ? RPG_DECKS.find((deck) => deck.id === tutorielCourant?.deckId) : null)
    ?? decksTous.find((deck) => deck.id === (deckDuelId ?? deckSelectionneId) && deckSeJoue(deck, collection)) ?? RPG_DECKS[0];
  const deckAdverseAffiche = deckPvpAdverse
    ?? (duel.modeMana === RPG_MODE_MANA_ESSAI ? deckManaEssaiParId(deckAdverseId) : null)
    ?? (tutorielActif ? RPG_DECKS.find((deck) => deck.id === tutorielCourant?.opponentDeckId) : null)
    ?? RPG_DECKS.find((deck) => deck.id === deckAdverseId) ?? deckAdverseParDefaut() ?? RPG_DECKS[0];
  const nomJoueurAffiche = modePvp
    ? (duel.noms?.joueur ?? (pvp?.siege === 'sorcier' ? pvp?.noms?.sorcier : pvp?.noms?.joueur) ?? nomProfilJoueur)
    : nomProfilJoueur;
  const nomSorcierAdverse = modePvp
    ? (duel.noms?.sorcier ?? (pvp?.siege === 'sorcier' ? pvp?.noms?.joueur : pvp?.noms?.sorcier) ?? 'Adversaire')
    : etageHistoire?.nom ?? (tutorielActif
      ? tutorielCourant?.opponentName ?? 'Sorcier d’entraînement'
      : duel.modeMana === RPG_MODE_MANA_ESSAI ? 'Sorcier adverse' : 'Ifrit al-Ahmar');
  const nbMainAdverse = duel.sorcier.mainCount ?? duel.sorcier.main.length;
  const nbDeckAdverse = duel.sorcier.deckCount ?? duel.sorcier.deck.length;
  const nbDeckJoueur = duel.joueur.deckCount ?? duel.joueur.deck.length;
  // Fenêtre de réponse : pendant une attaque, ou quand le sorcier vient d'annoncer une carte.
  const fenetreSort = Boolean(duel.annonce && !vainqueur);
  const apercuAnnonceOuvert = Boolean(fenetreSort && annonceApercueFermeePour !== duel.annonce);
  const carteAnnoncee = fenetreSort ? cardById(duel.annonce.carteId) : null;
  const sorcierArtId = etageHistoire
    ? 'ifrit-al-ahmar'
    : (
      deckAdverseAffiche.boxArt
      ?? deckAdverseAffiche.cardIds.find((id) => cardById(id)?.kind !== 'terrain')
      ?? 'ifrit-des-ergs'
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
    // s'allume et aucune créature ne s'allume avec elle. Une arrivée qui
    // frapperait le sorcier adverse ne porterait aucun `cibleId` : le moteur
    // déduirait la cible, l'annonce la montrerait quand même.
    annonceViseVotrePlate = cibleId === 'sorcier'
      || Boolean(carteAnnoncee.kind === 'magie'
        && (effetAnnonce.cible === 'sorcier'
          || (carteAnnoncee.cibles?.includes('sorcier') && !cibleId)))
      || Boolean(arriveeAnnonce.cible === 'sorcier' && (!cibleId || cibleId === 'sorcier'));
    if (!annonceViseVotrePlate && cibleId) idsVisesParAnnonce.add(cibleId);
    if (cibleAllieeId) idsVisesParAnnonce.add(cibleAllieeId);
    if (effetAnnonce.cible === 'toutes-creatures' || arriveeAnnonce.cible === 'toutes-creatures') {
      duel.joueur.creatures.forEach((entite) => idsVisesParAnnonce.add(entite.id));
      if (effetAnnonce.inclutAllies || arriveeAnnonce.inclutAllies) {
        duel.sorcier.creatures.forEach((entite) => idsVisesParAnnonce.add(entite.id));
      }
    }
    if (carteAnnoncee.kind === 'magie' && effetAnnonce.type === 'buff') {
      duel.sorcier.creatures.forEach((entite) => idsVisesParAnnonce.add(entite.id));
    }
  }
  /* La destruction ciblée (le Ghul des cendres) : le mort attend que son
     contrôleur désigne la créature adverse à frapper. Côté joueur, les cibles
     légales s'allument comme celles d'un sort annoncé et un bandeau guide le
     clic ; côté sorcier, le moteur choisit seul et rien ne s'affiche. */
  const attenteDestruction = duel.destructionsEnAttente?.[0]?.cote === 'joueur'
    ? duel.destructionsEnAttente[0]
    : null;
  const carteAttenteDestruction = attenteDestruction ? cardById(attenteDestruction.carteId) : null;
  const idsCiblesDestruction = new Set(attenteDestruction
    ? duel.sorcier.creatures
      .filter((entite) => !rpgEstProtegee(entite, cardColors(carteAttenteDestruction)))
      .map((entite) => entite.id)
    : []);
  // Sans cible légale, l'effet se dissipe (l'effet ci-dessus s'en charge) : le
  // bandeau ne s'accroche pas à un choix impossible.
  const attenteDestructionVisible = attenteDestruction && idsCiblesDestruction.size > 0;
  const reponseActive = Boolean((combatEntrant && duel.fenetreReponse && !vainqueur) || fenetreSort || fenetreFinTour);
  const reponseApresBlocage = Boolean(reponseActive && combatEntrant?.coteAttaquant === 'joueur');
  const defausseOuverte = Boolean(duel.defausseEnAttente?.cote === 'joueur' && duel.defausseEnAttente.restant > 0);
  const selectionDefausseValide = Boolean(defausseOuverte
    && carteDefausseSelectionnee?.attente === duel.defausseEnAttente
    && duel.joueur.main[carteDefausseSelectionnee.handIndex] === carteDefausseSelectionnee.carteId);
  const indicateurTour = vainqueur
    ? 'DUEL TERMINÉ'
    : sacrificeDemande
      ? 'PLATEAU PLEIN · SACRIFICE ?'
    : sacrificeEnCours
      ? 'À VOUS · SACRIFICE'
    : sacrificeFx
      ? 'SACRIFICE…'
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
    : mulliganAttenteAdverse
      ? `ATTENTE · ${nomSorcierAdverse.toUpperCase()}`
    : attenteBlocageAdverse
      ? `${nomSorcierAdverse.toUpperCase()} BLOQUE…`
    : reponseActive
      ? reponseApresBlocage ? 'À VOUS · RÉPONSE' : 'À VOUS · DÉFENSE'
      : phase ? 'À VOUS · ATTAQUE' : monTour ? 'À VOTRE TOUR' : modePvp ? `TOUR · ${nomSorcierAdverse.toUpperCase()}` : 'TOUR DU SORCIER';
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
  const calculerPuissanceAssaut = (entites) => {
    if (!entites.length) return 0;
    const bonusBanniere = entites.reduce((somme, entite) => somme + Math.max(0, Number(cardById(entite.carteId)?.banniere) || 0), 0);
    return entites.reduce((somme, entite) => {
      const carte = cardById(entite.carteId);
      const estSamourai = bonusBanniere > 0 && cardResonanceGroup(carte) === 'samourai';
      return somme + Math.max(0, (Number(entite.atk) || 0) + (estSamourai ? bonusBanniere : 0));
    }, 0);
  };
  const entitesAttaquantes = duel.joueur.creatures.filter((e) => attaquants.includes(e.id));
  const puissancePrets = calculerPuissanceAssaut(prets);
  const puissanceAttaquants = calculerPuissanceAssaut(entitesAttaquantes);
  const vieTotaleSorcier = Math.max(0, (duel.sorcier.pv ?? 0) + (duel.sorcier.bouclier ?? 0));
  const menaceLetaleActive = Boolean(monTour && phase && !combatEntrant && puissanceAttaquants > 0 && puissanceAttaquants >= vieTotaleSorcier);
  const carteCiblee = cibleEnCours ? cardById(cibleEnCours) : null;
  // L'Abordage (set Lettres de Marque) : la créature (ou le porteur du
  // Grappin) vient d'accoster et attend sa prize — la table ne doit allumer
  // que les créatures adverses prisables (vraie carte, pas une figure, pas
  // une tenace, pas protégée, coût ≤ seuil). Le capteur est déjà posé : c'est
  // la table qui désigne, pas la main.
  const attenteAbordage = Number.isFinite(duel.arriveeEnAttente?.abordage)
    && duel.arriveeEnAttente?.cote === 'joueur'
    && duel.arriveeEnAttente?.carteId === cibleEnCours;
  const cibleAbordageLegale = (entite) => {
    const seuil = duel.arriveeEnAttente?.abordage;
    const carteSource = cibleEnCours ? cardById(cibleEnCours) : null;
    if (!carteSource || !Number.isFinite(seuil)) return false;
    const carteVisee = cardById(entite?.carteId);
    return carteVisee?.kind !== 'hero'
      && !carteVisee?.insaisissable
      && !entite?.tenaciteDisponible
      && !rpgEstProtegee(entite, cardColors(carteSource))
      && (carteVisee?.cost ?? 0) <= seuil;
  };
  const attenteSiteBimini = duel.siteEnAttente?.cote === 'joueur'
    && duel.siteEnAttente?.recompense === 'bimini';
  const modeCible = porteeCibleEnCours({
    carte: carteCiblee,
    attenteAbordage,
    attenteSiteBimini,
    cibleAllieeMagie,
  });
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
  const provocationValide = !combatEntrant || rpgProvocationValide(
    duel,
    combatEntrant.coteAttaquant === 'joueur' ? 'joueur' : 'sorcier',
    combatEntrant.attaquants,
    combatEntrant.blocages,
    combatEntrant.ciblesAttaque ?? {},
  );
  const blocageForceValide = !combatEntrant || rpgBlocageForceValide(
    duel,
    combatEntrant.coteAttaquant === 'joueur' ? 'joueur' : 'sorcier',
    combatEntrant.attaquants,
    combatEntrant.blocages,
    combatEntrant.ciblesAttaque ?? {},
  );



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

  const declencherMissEntites = (ids = [], duree = 1400) => {
    const cibles = [...new Set((ids ?? []).filter(Boolean))];
    if (!cibles.length) return;
    const token = ++sequenceMissRef.current;
    setMissVisibles((courant) => ({
      ...courant,
      ...Object.fromEntries(cibles.map((id) => [id, { token }])),
    }));
    programmerNettoyageVisuel(() => {
      setMissVisibles((courant) => {
        const suivant = { ...courant };
        cibles.forEach((id) => {
          if (suivant[id]?.token === token) delete suivant[id];
        });
        return Object.keys(suivant).length === Object.keys(courant).length ? courant : suivant;
      });
    }, duree);
  };

  /** Allume le choc des boucliers qui viennent d'absorber (`ImpactBouclier`) :
   *  un calque à part des cinématiques `fx-*`, pour qu'un attaquant garde son
   *  bond — et une créature foudroyée sa secousse — pendant que son égide
   *  encaisse. Le token fait repartir l'animation à chaque nouveau choc. */
  const declencherImpactsBouclier = (impacts = [], duree = DUREE_IMPACT_BOUCLIER) => {
    const cibles = (impacts ?? []).filter((impact) => impact?.id);
    if (!cibles.length) return;
    const token = ++sequenceBouclierRef.current;
    setBoucliersVisibles((courant) => ({
      ...courant,
      ...Object.fromEntries(cibles.map((impact) => [impact.id, {
        montant: Math.max(0, impact.montant ?? 0),
        restant: Math.max(0, impact.restant ?? 0),
        lumiere: Boolean(impact.lumiere),
        token,
      }])),
    }));
    programmerNettoyageVisuel(() => {
      setBoucliersVisibles((courant) => {
        const suivant = { ...courant };
        cibles.forEach((impact) => {
          if (suivant[impact.id]?.token === token) delete suivant[impact.id];
        });
        return Object.keys(suivant).length === Object.keys(courant).length ? courant : suivant;
      });
    }, duree);
  };

  const demarrerVolCarte = (carte, handIndex, resoudreAction, emplacement = null) => {
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
    setCarteEnVol({ token, carteId: carte.id, kind: carte.kind === 'terrain' ? 'terrain' : 'creature', handIndex: index, emplacement: Number.isInteger(emplacement) ? emplacement : null, phase: 'pending' });
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
  // Une sorcellerie à écho (le Nuage de cendres) dont la promesse est venue
  // d'écho au début de ce tour : `rpgFinDeTour` vient de la consommer. La
  // promesse éteinte — plus consignée dans le registre de l'un des deux camps
  // — fait revenir la carte en preview au centre de la table, et le bandeau
  // nomme la vague : le sort se reconnaît à sa deuxième apparition, comme au
  // premier lancer.
  const annoncerEchosRetombes = (echosAvant) => {
    if (rpgVainqueur(duel)) return;
    const lanceur = duel.tour;
    const promessesRestantes = new Set((duel.joueur.degatsEchos ?? [])
      .concat(duel.sorcier.degatsEchos ?? []));
    const retombes = echosAvant.filter((echo) =>
      (echo.coteSource === lanceur || !echo.coteSource)
      && (Number(echo.toursRestants) || 1) <= 1
      && !promessesRestantes.has(echo));
    // Plusieurs vagues dues en même temps : la preview est un seul battement,
    // on la porte sur la première promesse qui nomme une carte.
    const promesse = retombes.find((echo) => cardById(echo?.carteId)) ?? retombes[0];
    const carte = cardById(promesse?.carteId);
    if (!carte) return;
    const coteVisee = lanceur === 'joueur' ? 'sorcier' : 'joueur';
    const cibles = coteVisee === 'sorcier' ? duel.sorcier.creatures : duel.joueur.creatures;
    const cibleDecrite = promesse.cible === 'sorcier'
      ? {
          nom: coteVisee === 'sorcier' ? 'Le sorcier' : 'Vous',
          illustrationUrl: coteVisee === 'sorcier' ? portraitSorcierAdverse : undefined,
          targetPlate: coteVisee,
          targetIds: [],
        }
      : {
          nom: coteVisee === 'sorcier' ? 'Toutes les créatures adverses' : 'Toutes vos créatures',
          targetPlate: coteVisee === 'sorcier' ? 'sorcier' : null,
          targetIds: cibles.map((entite) => entite.id),
        };
    // L'écho retombe chez qui l'a lancé : sa fiche se pose de son côté.
    annoncerMagie(carte, cibleDecrite, { vague: true, camp: lanceur === 'sorcier' ? 'sorcier' : 'joueur' });
  };

  // Le tour qui s'ouvre peut porter un écho différé (Nuage de cendres) : les
  // blessures et les morts qu'il cause s'animent comme les autres, au lieu de
  // se contenter d'un chiffre qui change sur la carte.
  /**
   * Le Ghul des cendres exige un clic avant que la partie continue : tant que
   * l'attente de destruction est ouverte côté joueur, le tour du sorcier se met
   * en pause et retient par où reprendre. Rend `true` quand il faut s'arrêter.
   */
  const pauseSiAttenteJoueur = (reprendre) => {
    const destruction = duel.destructionsEnAttente?.[0]?.cote === 'joueur';
    const site = duel.siteEnAttente?.cote === 'joueur';
    if (!destruction && !site) return false;
    repriseSorcierRef.current = reprendre;
    force();
    return true;
  };

  /** Relance la suite du tour du sorcier, mise en pause par une désignation. */
  const reprendreSorcier = () => {
    const reprendre = repriseSorcierRef.current;
    repriseSorcierRef.current = null;
    if (reprendre) later(reprendre, 400);
  };

  const terminerTourEtDetecterDegatsJoueur = () => {
    const instantane = prendreInstantaneDegatsJoueur();
    const champAvantFinDeTour = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    // Le registre des échos avant de fermer le tour : la promesse que l'ouverture
    // de ce tour résout se réaffiche en preview (`annoncerEchosRetombes`).
    const echosAvantRetour = (duel.joueur.degatsEchos ?? [])
      .concat(duel.sorcier.degatsEchos ?? []);
    rpgFinDeTour(duel);
    // Début de tour : le rail allume la phase le temps de la pioche.
    setDebutVisible(true);
    later(() => setDebutVisible(false), 800);
    animerModificationsChamp(champAvantFinDeTour, [], debutJournalDestructions);
    annoncerEchosRetombes(echosAvantRetour);
    return joueurToucheDepuis(instantane);
  };

  const prendreInstantaneChamp = () => {
    const table = tableRef.current;
    const tableRect = table?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const elements = new Map([...(table?.querySelectorAll('[data-entity-id], [data-terrain-id]') ?? [])]
      .map((element) => [element.dataset.entityId ?? element.dataset.terrainId, element]));
    const cartesEnJeu = [
      ...duel.joueur.creatures.map((entite) => ({ ...entite, isTerrain: false, camp: 'joueur' })),
      ...duel.sorcier.creatures.map((entite) => ({ ...entite, isTerrain: false, camp: 'sorcier' })),
      ...duel.joueur.terrains.map((terrain) => ({
        ...terrain,
        name: cardById(terrain.carteId)?.name ?? terrain.carteId,
        isTerrain: true,
        camp: 'joueur',
      })),
      ...duel.sorcier.terrains.map((terrain) => ({
        ...terrain,
        name: cardById(terrain.carteId)?.name ?? terrain.carteId,
        isTerrain: true,
        camp: 'sorcier',
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
        // Le camp dit à qui la carte retourne : seule la vôtre doit attendre
        // la fin du tourbillon avant de reparaître dans votre main.
        camp: entite.camp ?? 'joueur',
        atk: entite.atk,
        def: entite.def,
        pv: entite.pv,
        pvMax: entite.pvMax ?? null,
        bouclier: entite.bouclier ?? 0,
        bouclierLumiere: Boolean(entite.bouclierLumiere),
        armeId: entite.arme?.carteId ?? null,
        left: centerX - width / 2,
        top: centerY - height / 2,
        width,
        height,
        angle,
      };
    });
  };

  const animerModificationsChamp = (avant, attaquantsIds = [], debutJournalDestructions = null, entitesRenvoyees = []) => {
    // Le journal des blessures avance à chaque action animée, même sans carte
    // à l'écran : une brûlure non jouée ne doit pas se rallumer plus tard.
    const positionBlessures = journalBlessuresRef.current.duel === duel
      ? journalBlessuresRef.current.position
      : 0;
    const blessuresNouvelles = rpgBlessuresDepuis(duel, positionBlessures);
    journalBlessuresRef.current = { duel, position: rpgNombreBlessures(duel) };
    if (!avant?.length) return;
    const vivants = new Map([
      ...duel.joueur.creatures,
      ...duel.sorcier.creatures,
      ...duel.joueur.terrains,
      ...duel.sorcier.terrains,
    ].map((entite) => [entite.id, entite]));
    // Le journal du moteur dit quelles créatures sont retournées en main —
    // y compris celles qu'un **effet de créature** (le rebond du Sonneur fêlé,
    // le reflux du Léviathan) a renvoyées, sans que l'action le dise. Les
    // seules entités qui comptent sont celles de l'instantané : une créature
    // déjà rentrée en main n'est plus sur la table, elle ne peut donc pas
    // disparaître deux fois.
    const renvoyees = new Set([
      ...entitesRenvoyees.filter(Boolean),
      ...rpgRenvoisEnMain(duel).map((evenement) => evenement.entityId),
    ]);
    const cartesDisparues = avant.filter((entite) => !vivants.has(entite.entityId)
      && !renvoyees.has(entite.entityId));
    // Une prise n'est pas une mort : son fantôme rejoint le capteur par la chaîne.
    const prises = new Map([
      ...rpgPrisesEnCale(duel).map((evenement) => [evenement.entityId, evenement.capteurId]),
      ...(duel.combatFeed ?? [])
        .filter((evenement) => evenement.type === 'prise')
        .map((evenement) => [evenement.victim.id, evenement.killers[0]?.id]),
    ]);
    const mouvementReduit = animationsReduites();
    const disparues = mouvementReduit ? [] : cartesDisparues;
    // La roue de feu : seules les blessures **parues depuis la dernière action
    // animée** comptent. Une brûlure ancienne reste dans le journal, mais elle
    // ne rallume plus rien — sans quoi la moindre action de la créature (une
    // attaque, par exemple) ferait rejouer le feu. La Braise allume la roue ;
    // une attaque de créature, elle, passe par le combat simultané et n'écrit
    // pas dans ce journal.
    const brulees = new Map();
    if (!mouvementReduit) {
      const braiseParEntite = new Map();
      for (const blessure of blessuresNouvelles) {
        if (blessure.elements.includes('braise')) braiseParEntite.set(blessure.entityId, blessure);
      }
      for (const entite of avant) {
        if (entite.isTerrain || renvoyees.has(entite.entityId)) continue;
        const blessure = braiseParEntite.get(entite.entityId);
        if (!blessure) continue;
        const apres = vivants.get(entite.entityId);
        const fraiche = apres
          ? apres.pv === blessure.pvApres
            && (apres.bouclier ?? 0) === blessure.bouclierApres
          : blessure.mortelle;
        if (fraiche) brulees.set(entite.entityId, entite);
      }
    }
    // La foudre du marteau : la couleur ne suffit pas — plein de Neige
    // blesse sans faire tomber le ciel — c'est la carte du coup que le
    // journal nomme (`blessureDuMarteau`). Même règle de fraîcheur que la
    // Braise : seule la blessure qui vient de tomber allume l'éclair, et la
    // créature tuée par le marteau le voit tomber sur son emplacement.
    const idsFoudroyees = new Set(blessuresNouvelles
      .filter((blessure) => blessureDuMarteau(blessure))
      .map((blessure) => blessure.entityId));
    const foudroyees = new Map();
    if (!mouvementReduit && idsFoudroyees.size) {
      const marteauParEntite = new Map();
      for (const blessure of blessuresNouvelles) {
        if (blessureDuMarteau(blessure)) marteauParEntite.set(blessure.entityId, blessure);
      }
      for (const entite of avant) {
        if (entite.isTerrain || renvoyees.has(entite.entityId)) continue;
        const blessure = marteauParEntite.get(entite.entityId);
        if (!blessure) continue;
        const apres = vivants.get(entite.entityId);
        const fraiche = apres
          ? apres.pv === blessure.pvApres
            && (apres.bouclier ?? 0) === blessure.bouclierApres
          : blessure.mortelle;
        if (fraiche) foudroyees.set(entite.entityId, entite);
      }
    }
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
      const duree = disparues.some((entite) => prises.has(entite.entityId)) ? 1400
        : disparues.some((entite) => entitesBrulees.has(entite.entityId)) ? 1050
        : disparues.some((entite) => foudroyees.has(entite.entityId)) ? DUREE_ECLAIR_MARTEAU
          : 760;
      // Le souffle de feu du coup vient peut-être de sonner (le sort qui vient
      // d'être lancé) : une carte consumée par la roue ne le rejoue pas.
      const feuVientDeSonner = Date.now() - dernierSonFeuRef.current < 700;
      const effets = disparues.map((entite) => {
        const capteurId = prises.get(entite.entityId);
        const capteur = avant.find((carte) => carte.entityId === capteurId);
        const tableRect = tableRef.current?.getBoundingClientRect();
        const element = capteurId && [...(tableRef.current?.querySelectorAll('[data-entity-id]') ?? [])]
          .find((carte) => carte.dataset.entityId === capteurId);
        // L'IA peut poser et capturer dans la même action, avant le rendu
        // du capteur : sa rangée n'est qu'une estimation d'attente. Le
        // fantôme (`FantomeCarteDetruite`) remesure le capteur sur la table
        // rendue dès la première image — la chaîne part de SA carte, jamais
        // du milieu de sa rangée.
        const capteurVivant = vivants.get(capteurId);
        const rang = capteurVivant && tableRef.current?.querySelector(
          duel.joueur.creatures.some((carte) => carte.id === capteurId)
            ? '.card-row--equipe' : '.card-row--ennemi',
        );
        const rect = (element ?? rang)?.getBoundingClientRect();
        const destination = capteur
          ? { x: capteur.left + capteur.width / 2, y: capteur.top + capteur.height / 2 }
          : rect && tableRect
            ? { x: rect.left + rect.width / 2 - tableRect.left, y: rect.top + rect.height / 2 - tableRect.top }
            : null;
        return ({
        ...entite,
        priseEnCale: Boolean(capteurId),
        capteurId: capteurId ?? null,
        abordage: capteurId && destination ? {
          dx: destination.x - entite.left - entite.width / 2,
          dy: destination.y - entite.top - entite.height / 2,
        } : null,
        token,
        effectId: `${token}-${entite.entityId}`,
        bruleeParBraise: entitesBrulees.has(entite.entityId),
        flammeJouee: feuVientDeSonner && entitesBrulees.has(entite.entityId),
        // Date de péremption : l'image d'une carte détruite n'est qu'un adieu.
        // Trois voies la retirent (fin d'animation, minuterie, ménage), la
        // dernière servant de filet si l'onglet dort pendant l'animation.
        expireA: Date.now() + duree + 400,
      });
      });
      // La mort ne se fait plus attendre : la carte brûlée reçoit son adieu
      // **tout de suite**, pendant que la roue finit de consumer l'emplacement
      // qu'elle vient de quitter. Seul le tourbillon d'eau retient encore son
      // renvoi (voir plus bas), parce qu'il emporte la carte en main.
      setCartesEnDestruction((current) => [...nettoyerFantomes(current), ...effets]);
      programmerNettoyageVisuel(() => {
        const ids = new Set(effets.map((effect) => effect.effectId));
        setCartesEnDestruction((current) => current.filter((effect) => !ids.has(effect.effectId)));
      }, duree);
    }

    // Les roues de feu : une par créature mordue par la Braise. La roue brûle
    // l'emplacement, pas la carte : celle qui meurt a déjà commencé son adieu.
    if (brulees.size) {
      const token = ++sequenceAnimationRef.current;
      const effetsFeu = [...brulees.values()].map((entite) => ({
        ...entite,
        token,
        effectId: `feu-${token}-${entite.entityId}`,
        expireA: Date.now() + DUREE_ROUE_FEU + 400,
      }));
      setRouesFeu((current) => [...nettoyerFantomes(current), ...effetsFeu]);
      programmerNettoyageVisuel(() => {
        const ids = new Set(effetsFeu.map((effet) => effet.effectId));
        setRouesFeu((current) => current.filter((effet) => !ids.has(effet.effectId)));
      }, DUREE_ROUE_FEU);
    }

    // La foudre du marteau : une par créature que l'Éclair du marteau vient
    // de toucher. Comme la roue, elle tombe sur l'emplacement relevé avant
    // l'action — la créature tuée a déjà commencé son adieu en dessous.
    if (foudroyees.size) {
      const token = ++sequenceAnimationRef.current;
      const effetsFoudre = [...foudroyees.values()].map((entite) => ({
        ...entite,
        token,
        effectId: `foudre-${token}-${entite.entityId}`,
        expireA: Date.now() + DUREE_ECLAIR_MARTEAU + 400,
      }));
      setEclairsMarteau((current) => [...nettoyerFantomes(current), ...effetsFoudre]);
      programmerNettoyageVisuel(() => {
        const ids = new Set(effetsFoudre.map((effet) => effet.effectId));
        setEclairsMarteau((current) => current.filter((effet) => !ids.has(effet.effectId)));
      }, DUREE_ECLAIR_MARTEAU);
    }

    // Renvoi en main : la créature quitte la table dans un tourbillon d'eau.
    // L'effet se pose sur la place qu'elle occupait — relevée avant l'action,
    // comme pour l'adieu d'une carte détruite — et respecte le mouvement réduit.
    const renvoyeesSurTable = mouvementReduit
      ? []
      : avant.filter((entite) => renvoyees.has(entite.entityId) && !entite.isTerrain);
    if (renvoyeesSurTable.length) {
      const token = ++sequenceAnimationRef.current;
      const duree = 950;
      const effets = renvoyeesSurTable.map((entite) => ({
        ...entite,
        token,
        effectId: `eau-${token}-${entite.entityId}`,
        expireA: Date.now() + duree + 400,
      }));
      setTourbillonsEau((current) => [...nettoyerFantomes(current), ...effets]);
      programmerNettoyageVisuel(() => {
        const ids = new Set(effets.map((effet) => effet.effectId));
        setTourbillonsEau((current) => current.filter((effet) => !ids.has(effet.effectId)));
      }, duree);
    }

    const attaquants = new Set(attaquantsIds);
    const attaquesVivantes = attaquantsIds.filter((id) => vivants.has(id));
    const touches = [];
    // La survivante du marteau ne clignote pas comme un coup ordinaire :
    // elle encaisse la secousse de la foudre, synchronisée avec le calque.
    const secoueesParFoudre = [];
    const renforcees = [];
    const statsAugmentees = [];
    const impactsBouclier = [];
    avant.forEach((entite) => {
      const apres = vivants.get(entite.entityId);
      if (!apres || entite.isTerrain) return;
      const bouclierAvant = entite.bouclier ?? 0;
      const bouclierApres = apres.bouclier ?? 0;
      const absorbesParBouclier = Math.max(0, bouclierAvant - bouclierApres);
      const lumiereAbsorbee = Boolean(entite.bouclierLumiere && !apres.bouclierLumiere);
      const toucheeAuxPv = apres.pv < entite.pv || apres.def < entite.def;
      // Un bouclier qui baisse parce que l'arme qui le portait vient d'être
      // remplacée n'a encaissé aucun coup : son reliquat
      // est simplement reparti avec l'arme, sans choc à montrer.
      const armeChangee = (apres.arme?.carteId ?? null) !== (entite.armeId ?? null);
      if (!mouvementReduit && (lumiereAbsorbee || (absorbesParBouclier > 0 && !armeChangee))) {
        impactsBouclier.push({
          id: entite.entityId,
          montant: absorbesParBouclier,
          restant: bouclierApres,
          lumiere: lumiereAbsorbee,
        });
      }
      // Un soin pur — les PV remontent vers un maximum inchangé, rien d'autre
      // ne bouge — a sa propre cinématique (`EclatSoin`, relevé du journal des
      // soins) : il ne rejoue pas, en plus, la lueur dorée des renforts.
      const soinPur = apres.pv > entite.pv
        && apres.atk === entite.atk
        && (apres.pvMax ?? null) === entite.pvMax
        && bouclierApres === bouclierAvant;
      if (toucheeAuxPv || absorbesParBouclier > 0 || lumiereAbsorbee) {
        if (!attaquants.has(entite.entityId)) {
          if (idsFoudroyees.has(entite.entityId)) secoueesParFoudre.push(entite.entityId);
          // Entièrement absorbé, le coup ne fait pas clignoter la créature :
          // c'est l'égide qui encaisse — et qui le montre (`ImpactBouclier`).
          else if (toucheeAuxPv) touches.push(entite.entityId);
        }
      } else if (!soinPur && (apres.pv > entite.pv || bouclierApres > bouclierAvant || apres.atk > entite.atk || apres.def > entite.def)) {
        renforcees.push(entite.entityId);
        if (apres.atk > entite.atk || apres.def > entite.def) statsAugmentees.push(entite.entityId);
      }
    });
    animerEntites(attaquesVivantes, 'attack', 650);
    declencherImpactsBouclier(impactsBouclier);
    animerEntites(touches, 'hit', 620);
    animerEntites(secoueesParFoudre, 'foudre', DUREE_ECLAIR_MARTEAU);
    animerEntites(renforcees, 'glow', 1100, statsAugmentees);
  };

  const conserverAnnulation = (etatAvantAction) => {
    if (modePvp) return;
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
    setPoseEnCours(null);
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
    if (sacrificeDemande || sacrificeEnCours || sacrificeFx) return false;
    if (defausseOuverte) return false;
    // Un contre sans annonce à contrer n'est pas jouable : l'allumer enfermait
    // le joueur dans une confirmation qui ne menait à rien.
    if (!rpgContreJouable(duel, 'joueur', carte)) return false;
    // Un sort sans cible valide n'est pas jouable non plus : pas de créature
    // adverse à frapper, pas d'alliée à protéger, pas de champion pour le
    // Défi… Le moteur refuserait le lancement, donc pas de lueur (classe
    // `is-playable`), pas de clic, pas de glisser-déposer.
    if (carte.kind === 'magie' && !rpgSortACibleValide(duel, 'joueur', carte)) return false;
    if (reponseApresBlocage && !carte.instant) return false;
    if (carte.kind === 'terrain') return monTour && !reponseApresBlocage && !duel.joueur.terrainPose;
    // Une arme sans créature alliée à équiper reste éteinte dans la main —
    // sauf arme vivante (la Lame des ergs), qui fait naître son porteur.
    if (carte.kind === 'arme' && !duel.joueur.creatures.length && !carte.armeVivante) return false;
    // La faveur du Kraken : une magie rapide ou une sorcellerie (jamais un
    // contresort) se lance sans payer son coût de mana tant que l'attente
    // `duel.magieGratuite` est ouverte.
    const lancementGratuit = carte.kind === 'magie' && carte.effet?.type !== 'contresort'
      && duel.magieGratuite?.cote === 'joueur';
    return (reponseApresBlocage ? carte.instant : monTour || (reponseActive && carte.instant))
      && (lancementGratuit || rpgPeutPayer(duel.joueur, carte));
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
    setEmplacementSurvole(null);
    window.setTimeout(() => { clicApresGlisserRef.current = false; }, 300);
  };

  const survolerTablePourDepot = (event) => {
    if (!carteGlisseeRef.current) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setSurZoneDepot(true);
    // Une créature en vol de glisser : la case libre sous le pointeur
    // brille plus fort — c'est elle qui recevra la pose au dépôt.
    if (cartePrendUneCase(cardById(carteGlisseeRef.current))) {
      const survole = emplacementLibreAuPoint(event.clientX, event.clientY);
      setEmplacementSurvole((courant) => (courant === survole ? courant : survole));
    }
  };

  const quitterZoneDepot = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setSurZoneDepot(false);
      setEmplacementSurvole(null);
    }
  };

  const poserTerrain = (carteId) => {
    if (!monTour || reponseApresBlocage || mulliganOuvert) { jouerSfx('erreur'); return; }
    const etatAvantAction = JSON.stringify(duel);
    const res = rpgPoserTerrain(duel, 'joueur', carteId);
    if (res.ok) {
      conserverAnnulation(etatAvantAction);
      jouerSfx('card_place');
    } else { jouerSfx('erreur'); }
    force();
    // Le Souk est prévenu **après** le rendu du plateau : `noterEvenementDuel`
    // met à jour la bourse, qui vit dans la même page — un état de bourse mis à
    // jour avant `force()` fait passer le rendu du champ en tâche de fond, et la
    // table montre encore l'ancien état juste après le geste (vu par
    // `check:rpg-preview` : `rpgJouerCreature` rendait `ok: true` et la créature
    // n'apparaissait qu'à la macrotâche suivante).
    if (res.ok) {
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
      const tousLesCamps = carte.effet.inclutAllies;
      return {
        nom: tousLesCamps ? 'Toutes les créatures des deux camps' : 'Toutes les créatures adverses',
        targetPlate: tousLesCamps ? null : 'sorcier',
        targetIds: (tousLesCamps ? [...duel.joueur.creatures, ...duel.sorcier.creatures] : duel.sorcier.creatures)
          .map((entite) => entite.id),
      };
    }
    if (carte.effet?.type === 'buff') {
      return {
        nom: 'Toutes vos créatures',
        targetIds: duel.joueur.creatures.map((entite) => entite.id),
      };
    }
    if (carte.effet?.type === 'destruction-totale') {
      return { nom: 'Toutes les créatures des deux camps',
        targetIds: [...duel.joueur.creatures, ...duel.sorcier.creatures].map((entite) => entite.id) };
    }
    if (carte.effet?.type === 'degats' && carte.effet.cible === 'toutes-autres') {
      return { nom: 'Toutes les créatures des deux camps',
        targetIds: [...duel.joueur.creatures, ...duel.sorcier.creatures].map((entite) => entite.id) };
    }
    if (carte.cibles?.includes('soi') || ['soin', 'pioche'].includes(carte.effet?.type)) {
      return { nom: 'Vous', illustrationId: 'salem', targetPlate: 'joueur', targetIds: [] };
    }
    if (carte.effet?.cible === 'creature-amie') return { nom: 'Une créature alliée', targetIds: [] };
    if (carte.effet?.cible === 'creature') return { nom: 'Une créature adverse', targetIds: [] };
    if (carte.effet?.type === 'transfert') return { nom: 'Les deux sorciers', targetPlate: 'sorcier', targetIds: [] };
    if (carte.effet?.type === 'defausse-adverse') return { nom: 'La main du sorcier', targetPlate: 'sorcier', targetIds: [] };
    if (carte.effet?.type === 'defaussePaquet') return { nom: 'Le paquet du sorcier', targetPlate: 'sorcier', targetIds: [] };
    return { nom: 'Le champ de bataille', targetIds: [] };
  };

  // `contre` : la carte est un contresort (joué par le joueur ou par le sorcier)
  // qui défait la carte visée — le bandeau le dit au lieu de « Magie jouée ».
  // `vague` : la promesse d'un sort à écho (le Nuage de cendres) retombe au
  // début du tour suivant de son lanceur — la carte se réaffiche en preview,
  // le son du sort reprend, et le bandeau nomme la vague.
  // `camp` : les deux fiches se posent au milieu du plateau — la vôtre en
  // turquoise, celle du sorcier en rouge, chacune avec son propre minuteur.
  const declencherGelMasse = (carte, camp = 'joueur') => {
    if (!carte) return;
    const id = carte.id;
    const effet = carte.effet;
    const arrivee = carte.arrivee;
    const estMasseGel = (effet?.cible === 'toutes-creatures' && (effet?.gel || effet?.gelChance))
      || (arrivee?.type === 'gel' && arrivee?.cible === 'toutes-creatures')
      || ['verglas', 'brume-du-fjord', 'hurlement-du-blizzard', 'geant-des-banquises'].includes(id);
    if (!estMasseGel) return;
    let type = 'verglas';
    if (id === 'brume-du-fjord') type = 'brume';
    else if (id === 'hurlement-du-blizzard') type = 'blizzard';
    else if (id === 'verglas') type = 'verglas';
    else if (id === 'geant-des-banquises') type = 'geant';
    else if (effet?.gelChance === 0.25) type = 'brume';
    else if (effet?.gelChance === 0.5) type = 'blizzard';
    else if (effet?.gel) type = 'verglas';
    else type = 'geant';
    const token = ++sequenceGelMasseRef.current;
    if (timerGelMasseRef.current) window.clearTimeout(timerGelMasseRef.current);
    setGelMasseFx({ type, camp, token, carteId: id });
    // Son de vent froid — réel échantillon CC0 (cold-wind.wav), pas de synthèse
    jouerSfx('cold_wind');
    const duree = type === 'brume' ? 2800 : type === 'blizzard' ? 3200 : type === 'geant' ? 3400 : 3000;
    timerGelMasseRef.current = window.setTimeout(() => setGelMasseFx((cur) => (cur?.token === token ? null : cur)), duree);
  };

  const annoncerMagie = (carte, cible, { contre = false, vague = false, sonForce = null, camp = 'joueur' } = {}) => {
    if (contre) {
      jouerSfx('card_countered');
    } else {
      // Un sort de soin garde le son commun des magies : le soin lui-même se
      // fait entendre quand les PV remontent vraiment (`soin_vie`, relevé du
      // journal des soins) — jamais deux carillons pour un seul geste, et
      // rien de plus qu'une magie s'il est lancé à pleine vie.
      const son = sonForce
        ?? rpgFoudreSoundFor(carte, 'spell')
        ?? rpgWaterSoundFor(carte, 'spell')
        ?? rpgFireSoundFor(carte, 'spell')
        ?? (carte?.effet?.type === 'bouclier' ? 'bouclier' : 'magie');
      jouerSfx(son);
      if (!vague) declencherGelMasse(carte, camp);
    }
    // Chaque camp a sa fiche et son minuteur : deux sorts dans la même seconde
    // ne se volent pas la place.
    const poserFiche = camp === 'sorcier' ? setSortJoueSorcier : setSortJoue;
    const minuteur = camp === 'sorcier' ? timerSortSorcierRef : timerSortRef;
    if (minuteur.current) window.clearTimeout(minuteur.current);
    poserFiche({
      carteId: carte.id,
      cible: cible ?? { nom: 'Champ de bataille', targetPlate: null, targetIds: [] },
      contre,
      vague,
    });
    // Le sort joué ne s'ouvre plus en aperçu plein cadre : sa fiche compacte
    // (`.rpg-spell-played`) se pose au milieu du plateau, la carte en petit et
    // son texte à côté — la table reste lisible autour.
    minuteur.current = window.setTimeout(() => {
      minuteur.current = null;
      poserFiche(null);
    }, 3600);
  };

  /** Le sort du sorcier : même fiche au milieu du plateau, cerclée de rouge. */
  const annoncerMagieSorcier = (carte, cible, options = {}) => {
    if (!carte) return;
    annoncerMagie(carte, cible, { ...options, camp: 'sorcier' });
  };

  // Le sorcier contre une carte du joueur : sa carte de contre s'affiche au
  // milieu du plateau, ciblant la carte défaite. Sans ce bandeau, la carte du
  // joueur disparaissait sans qu'on sache qui l'avait arrêtée ni avec quoi.
  const annoncerContreSorcier = (res) => {
    const contre = cardById(res.carteContre);
    if (!contre) return;
    const contree = cardById(res.carteContree);
    annoncerMagieSorcier(contre, {
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
    if (modePvp) rpgSyncCompteurEntites(duel);
    const res = rpgLancerMagie(duel, 'joueur', carteId, cibleEffective, cibleAllieeId ?? null);
    if (modePvp && res.ok) {
      void envoyerIntentionPvp({
        type: 'jouer-carte',
        carteId,
        cibleId: cibleEffective ?? null,
        cibleAllieeId: cibleAllieeId ?? null,
      });
    }
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
      signalerTutoriel('contre-lance', { cardId: carteId });
      signalerTutoriel('magie-lancee', { cardId: carteId });
      force();
      if (!modePvp) later(annoncerSuivantSorcier, delaiReflexionSorcier());
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
      signalerTutoriel('magie-lancee', { cardId: carteId });
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
            if (!modePvp) apresCombatSorcier();
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
  const finaliserPoseCreature = (carteId, sacrificeId = null, emplacement = null) => {
    const carte = cardById(carteId);
    carteCibleeHandIndexRef.current = null;
    setSacrificeEnCours(null);
    setPoseEnCours(null);
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    if (modePvp) rpgSyncCompteurEntites(duel);
    const res = rpgJouerCreature(duel, 'joueur', carteId, null, {
      cibleDifferee: true,
      sacrificeId,
      emplacement: Number.isInteger(emplacement) ? emplacement : null,
    });
    if (modePvp && res.ok) {
      void envoyerIntentionPvp({
        type: 'jouer-carte',
        carteId,
        cibleDifferee: true,
        sacrificeId: sacrificeId ?? null,
        emplacement: Number.isInteger(emplacement) ? emplacement : null,
      });
    }
    if (res.ok && res.contre && res.parIA) {
      // Le sorcier contre la créature : elle n'entre pas en jeu.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      annoncerContreSorcier(res);
    } else if (res.ok) {
      // Une arrivée qui pioche ou fouille le deck a déjà montré/déplacé des
      // cartes : la pose devient irréversible, comme un sort résolu.
      if (arriveeConsulteDeck(carte) && !res.arriveeEnAttente) invaliderAnnulation();
      else conserverAnnulation(etatAvantAction);
      // La créature sacrifiée a déjà eu son animation de déchirement : pas de
      // second fantôme de destruction pour elle.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions,
        res.sacrificeId ? [res.sacrificeId] : []);
      jouerSfx('card_place');
      const sonEffetBraise = rpgFireSoundFor(carte, 'arrival');
      if (sonEffetBraise) jouerSfx(sonEffetBraise);
      else {
        const sonEau = rpgWaterSoundFor(carte, 'arrival');
        if (sonEau) jouerSfx(sonEau);
      }
      if (carte?.arrivee?.type === 'gel' && carte?.arrivee?.cible === 'toutes-creatures') {
        declencherGelMasse(carte, 'joueur');
      }
      signalerTutoriel('creature-jouee', { cardId: carteId, entiteId: res.entite?.id });
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

  /** Fenêtre « plateau plein » : le joueur vient d'essayer de jouer une
   * sixième créature. « Annuler » rend la main sans rien payer ; « Sacrifier »
   * ouvre la désignation de la créature à déchirer sur la table. */
  const annulerSacrifice = () => {
    setSacrificeDemande(null);
    setSacrificeEnCours(null);
    jouerSfx('annuler');
    force();
  };
  const confirmerSacrifice = () => {
    if (!sacrificeDemande) return;
    setSacrificeEnCours(sacrificeDemande.carteId);
    setSacrificeDemande(null);
    jouerSfx('select');
    force();
  };
  /** La créature à sacrifier est désignée : sa carte se déchire à sa place,
   * PUIS seulement la nouvelle créature est posée dans l'emplacement libéré
   * (le moteur sacrifie et pose d'un seul geste, à ce moment-là). */
  const dechirerEtPoser = (entite) => {
    const carteId = sacrificeEnCours;
    if (!carteId || sacrificeEnCoursRef.current) return;
    const instantane = prendreInstantaneChamp().find((carte) => carte.entityId === entite.id);
    setSacrificeEnCours(null);
    sacrificeEnCoursRef.current = { carteId, sacrificeId: entite.id };
    if (instantane) {
      const token = ++sequenceAnimationRef.current;
      setSacrificeFx({ ...instantane, token, effectId: `dechirement-${token}-${entite.id}` });
    }
    // Le sacrifice déchire une carte : il n'a jamais eu de feu à lui. Le
    // souffle restait allumé pour toute créature sacrifiée, quelle que soit sa
    // couleur — c'est le bruit de la carte détruite qui reste.
    jouerSfx('destruction');
    const duree = animationsReduites() ? 60 : 860;
    later(() => {
      const enCours = sacrificeEnCoursRef.current;
      sacrificeEnCoursRef.current = null;
      setSacrificeFx(null);
      if (enCours) finaliserPoseCreature(enCours.carteId, enCours.sacrificeId);
      force();
    }, duree);
    force();
  };

  const equiperArme = (carteId, cibleId) => {
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    if (modePvp) rpgSyncCompteurEntites(duel);
    const res = rpgJouerArme(duel, 'joueur', carteId, cibleId);
    if (modePvp && res.ok) {
      void envoyerIntentionPvp({ type: 'jouer-carte', carteId, cibleId: cibleId ?? null });
    }
    if (res.ok && res.contre && res.parIA) {
      // Le sorcier contre l'arme : elle part au cimetière sans être portée.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      invaliderAnnulation();
      annoncerContreSorcier(res);
    } else if (res.ok) {
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      jouerSfx('card_place');
      signalerTutoriel('arme-equipee', { cardId: carteId, entiteId: cibleId });
      // Le Grappin d'abordage : l'attachement ouvre une désignation de prize
      // (`duel.arriveeEnAttente.abordage`) — la table adverse s'allume sur
      // les créatures prisables, la carte reste en réserve le temps du clic.
      if (duel.arriveeEnAttente?.cote === 'joueur' && Number.isFinite(duel.arriveeEnAttente?.abordage)) {
        setCibleEnCours(carteId);
      }
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
    if (!monTour || phase || combatEntrant || cibleEnCours || sacrificeEnCours || mulliganOuvert) { jouerSfx('erreur'); return; }
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
    if (modePvp) rpgSyncCompteurEntites(duel);
    const options = { mode: mode?.id ?? null };
    const res = rpgActiverArme(duel, 'joueur', entite.id, options);
    if (res.ok) {
      if (modePvp) void envoyerIntentionPvp({ type: 'activer', arme: true, entiteId: entite.id, options });
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
    if (modePvp) rpgSyncCompteurEntites(duel);
    const options = { mode, cibleId: entite.id };
    const res = rpgActiverArme(duel, 'joueur', porteur.id, options);
    if (res.ok) {
      if (modePvp) void envoyerIntentionPvp({ type: 'activer', arme: true, entiteId: porteur.id, options });
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      jouerSfx('player_attack_hit');
    } else {
      jouerSfx('erreur');
    }
    force();
  };

  const poserCarte = (carteId, emplacement = null) => {
    const carte = cardById(carteId);
    const peutRepondre = reponseActive && carte.instant;
    if (reponseApresBlocage && !carte.instant) return;
    if (!monTour && !peutRepondre) return;
    if (carte.kind === 'arme') {
      signalerTutoriel('arme-choisie', { cardId: carteId });
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
      signalerTutoriel('magie-choisie', { cardId: carteId });
      const cible = targetMode(carte);
      if (cible) {
        setCibleAllieeMagie(null);
        // Même verdict que le halo de la main (`rpgSortACibleValide`, via
        // `peutJouerCarte`) : sans cible légale — protégée, insaisissable par
        // les sorts, ou champion manquant pour le Défi du Jarl — la
        // désignation ne s'ouvre pas.
        if (rpgSortACibleValide(duel, 'joueur', carte)) setCibleEnCours(carteId);
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
    // Champ d'essai plein : avant de poser, le joueur choisit la créature à
    // sacrifier — la carte reste en main, la table s'allume, et le clic sur la
    // victime termine la pose (`finaliserPoseCreature`, avec son sacrifice).
    if (duel.modeMana === RPG_MODE_MANA_ESSAI && duel.joueur.creatures.length >= RPG_MANA_ESSAI_CHAMP_MAX) {
      setSacrificeEnCours(carteId);
      jouerSfx('select');
      force();
      return;
    }
    finaliserPoseCreature(carteId, null, emplacement);
  };

  /** Une carte qui prend une des cinq cases du champ quand on la joue. */
  const cartePrendUneCase = (carte) => carte?.kind === 'creature' || carte?.kind === 'hero' || carte?.kind === 'site';

  /** Les numéros (0 à 4) des cases encore libres dans la rangée du joueur. */
  const casesLibresJoueur = () => (duel.modeMana === RPG_MODE_MANA_ESSAI
    ? rpgEmplacementsChamp(duel.joueur)
      .map((occupant, index) => (occupant ? null : index))
      .filter((index) => index !== null)
    : []);

  /**
   * Jouer une carte de la main. `emplacement` dit qui a choisi la case d'une
   * créature : `undefined` (clic, touche 1 à 5) ouvre le choix sur la table —
   * les cases libres s'allument, `choisirEmplacement` termine la pose ;
   * un numéro (glisser-déposer sur une case) pose directement là ; `null`
   * (dépôt ailleurs sur la table, leçon du tutoriel, une seule case libre)
   * garde la première case libre, comme avant.
   */
  const jouerCarteDepuisMain = (carteId, handIndex = null, emplacement = undefined) => {
    const carte = cardById(carteId);
    if (carteEnVol || sacrificeEnCours) return;
    if (!carte || !duel.joueur.main.includes(carteId)) return;
    if (tutorielActif && etapeTutorielIdRef.current) {
      const etape = etapesTutoriel.find((step) => step.id === etapeTutorielIdRef.current);
      if (etape?.kind !== 'action' || !etape.cardId || etape.cardId !== carteId) {
        jouerSfx('erreur');
        force();
        return;
      }
    }
    if (!peutJouerCarte(carte)) {
      jouerSfx('erreur');
      force();
      return;
    }
    if (carte.kind !== 'terrain') { unlockSfx(); }
    const index = Number.isInteger(handIndex) && duel.joueur.main[handIndex] === carteId
      ? handIndex : duel.joueur.main.indexOf(carteId);
    // Une pose attendait sa case : recliquer la même carte y renonce (rien
    // n'a été payé) ; jouer une autre carte referme l'attente au passage.
    if (poseEnCours) {
      const memeCarte = poseEnCours.carteId === carteId && poseEnCours.handIndex === index;
      setPoseEnCours(null);
      if (memeCarte && emplacement === undefined) {
        jouerSfx('annuler');
        force();
        return;
      }
    }
    // Sixième créature du mode sans terrains : le plateau est plein (5/5).
    // Avant tout vol et tout paiement, une fenêtre demande si l'on veut
    // sacrifier une créature — « Annuler » ne coûte rien, « Sacrifier »
    // ouvre la désignation sur la table (voir `dechirerEtPoser`).
    if (duel.modeMana === RPG_MODE_MANA_ESSAI
      && (carte.kind === 'creature' || carte.kind === 'hero' || carte.kind === 'site')
      && duel.joueur.creatures.length >= RPG_MANA_ESSAI_CHAMP_MAX
      && !sacrificeDemande && !sacrificeEnCours && !sacrificeEnCoursRef.current) {
      setSacrificeDemande({ carteId, handIndex: index });
      jouerSfx('select');
      force();
      return;
    }
    if (carte.kind === 'terrain') {
      demarrerVolCarte(carte, index, () => poserTerrain(carteId));
    } else if (carte.kind === 'magie') {
      poserCarte(carteId);
    } else if (carte.kind === 'arme') {
      carteCibleeHandIndexRef.current = index;
      poserCarte(carteId);
    } else {
      // Champ d'essai plein : la carte reste en main tant que la créature à
      // sacrifier n'est pas choisie — le vol n'a lieu qu'une fois la place faite
      // (le clic sur la victime relance la pose avec son sacrifice).
      if (duel.modeMana === RPG_MODE_MANA_ESSAI && duel.joueur.creatures.length >= RPG_MANA_ESSAI_CHAMP_MAX) {
        setSacrificeEnCours(carteId);
        jouerSfx('select');
        force();
        return;
      }
      // Le choix de la case : un simple clic sur la créature ne la pose plus
      // d'office à gauche — les cases libres de sa rangée s'allument et le
      // clic suivant (ou la touche de son numéro) dit où elle entre en jeu.
      // Le glisser-déposer a déjà choisi (un numéro, ou `null` = première
      // case libre), la leçon du tutoriel garde son geste unique, et une
      // seule case libre ne laisse rien à choisir.
      if (emplacement === undefined && !tutorielActif && cartePrendUneCase(carte)
        && casesLibresJoueur().length > 1) {
        setPoseEnCours({ carteId, handIndex: index });
        jouerSfx('select');
        force();
        return;
      }
      demarrerVolCarte(carte, index, () => poserCarte(carteId, emplacement ?? null), emplacement ?? null);
    }
  };

  /** La case est choisie (clic, doigt ou touche du numéro) : la créature en
   * attente vole jusqu'à elle et s'y pose. La table a pu changer depuis
   * l'attente — tout est revalidé (carte en main, case toujours libre) avant
   * que le moteur ne paie quoi que ce soit. */
  const choisirEmplacement = (index) => {
    const pose = poseEnCours;
    if (!pose || carteEnVol) return;
    const carte = cardById(pose.carteId);
    const handIndex = Number.isInteger(pose.handIndex) && duel.joueur.main[pose.handIndex] === pose.carteId
      ? pose.handIndex : duel.joueur.main.indexOf(pose.carteId);
    if (!carte || handIndex < 0 || rpgEmplacementsChamp(duel.joueur)[index]) {
      jouerSfx('erreur');
      force();
      return;
    }
    setPoseEnCours(null);
    jouerSfx('select');
    demarrerVolCarte(carte, handIndex, () => poserCarte(pose.carteId, index), index);
    force();
  };

  /** La case libre de la rangée du joueur sous un point de l'écran, ou
   * `null` — la géométrie des cases dessinées, partagée par le glisser de la
   * souris (HTML5) et celui du doigt (qui ne voit pas les cases, éteintes
   * aux pointeurs). */
  const emplacementLibreAuPoint = (clientX, clientY) => {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const cases = tableRef.current?.querySelectorAll('.card-row--equipe .rpg-creature-slot.is-empty') ?? [];
    for (const element of cases) {
      const rect = element.getBoundingClientRect();
      if (rect.width && clientX >= rect.left && clientX <= rect.right
        && clientY >= rect.top && clientY <= rect.bottom) {
        const numero = Number(element.dataset.creatureSlot);
        return Number.isInteger(numero) ? numero - 1 : null;
      }
    }
    return null;
  };

  const deposerCarteSurTable = (event, emplacementDepot = undefined) => {
    event.preventDefault();
    if (carteEnVol) return;
    const carteId = event.dataTransfer?.getData('text/plain')
      || event.dataTransfer?.getData('application/x-bab-el-card')
      || carteGlisseeRef.current;
    const handIndex = carteOrigineVolRef.current?.carteId === carteId
      ? carteOrigineVolRef.current.handIndex : null;
    // Déposer une créature sur une case libre la pose sur CETTE case ; la
    // déposer ailleurs sur la table garde la première case libre (`null`),
    // sans ouvrir le choix du clic — le glisser a déjà dit où il visait.
    const emplacement = emplacementDepot !== undefined
      ? emplacementDepot
      : (cartePrendUneCase(cardById(carteId))
        ? emplacementLibreAuPoint(event.clientX, event.clientY)
        : null);
    carteGlisseeRef.current = null;
    carteOrigineVolRef.current = null;
    setCarteGlissee(null);
    setSurZoneDepot(false);
    setEmplacementSurvole(null);
    if (!carteId) return;
    jouerCarteDepuisMain(carteId, handIndex, emplacement);
  };

  const confirmerDefausse = () => {
    if (!defausseOuverte || !selectionDefausseValide) return;
    const { carteId, handIndex } = carteDefausseSelectionnee;
    const cibleDefausse = Number.isInteger(handIndex) ? handIndex : carteId;
    const res = rpgDefausserCarte(duel, 'joueur', cibleDefausse);
    if (modePvp && res.ok) {
      void envoyerIntentionPvp({ type: 'defausser', index: cibleDefausse });
    }
    setCarteDefausseSelectionnee(null);
    jouerSfx(res.ok ? 'annuler' : 'erreur');
    // Défausse de fin de tour terminée (main redescendue à cinq) : le tour
    // suspendu reprend et se ferme pour de bon.
    if (res.ok && finTourApresDefausseRef.current && !duel.defausseEnAttente) {
      finTourApresDefausseRef.current = false;
      force();
      finDuTour();
      return;
    }
    force();
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
    if (carteEnVol || cibleEnCours || cibleAttaqueEnCours || sacrificeEnCours) return;
    // Pendant la demande de sacrifice ou son déchirement, la main attend.
    if (sacrificeDemande || sacrificeEnCoursRef.current) return;
    if (defausseOuverte) {
      setCarteDefausseSelectionnee({ carteId, handIndex, attente: duel.defausseEnAttente });
      jouerSfx('select');
      return;
    }
    if (carte.kind === 'magie' && peutJouerCarte(carte)) {
      // En leçon, la carte part directement : le voile encadre déjà la main et
      // la fenêtre de confirmation viendrait s'interposer sous lui.
      if (tutorielActif) {
        jouerCarteDepuisMain(carteId, handIndex);
        return;
      }
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
    if (attenteSiteBimini) {
      const cibleCarte = cardById(entite.carteId);
      if (cote !== 'joueur' || cibleCarte?.kind === 'site') {
        jouerSfx('erreur');
        force();
        return true;
      }
      const champAvantAction = prendreInstantaneChamp();
      const res = rpgResoudreSiteCible(duel, 'joueur', entite.id);
      if (!res.ok) {
        jouerSfx('erreur');
        force();
        return true;
      }
      setCibleEnCours(null);
      jouerSfx('select');
      animerModificationsChamp(champAvantAction);
      force();
      reprendreSorcier();
      return true;
    }
    const carteSource = cardById(cibleEnCours);
    if (rpgEstProtegee(entite, cardColors(carteSource))
      // Le Serpent du monde : aucun sort ne peut le viser.
      || (carteSource?.kind === 'magie' && rpgEstProtegeeDesSorts(entite, cardColors(carteSource)))
      // Le Père des corbeaux : l'exil ne soulève que les coûts de 3 ou moins.
      || !cibleRespecteCoutMax(carteSource, entite)) {
      jouerSfx('erreur');
      force();
      return true;
    }
    // L'arrivée ciblée d'une créature **déjà posée** : la table vient de
    // désigner sa victime, on referme l'attente ouverte à la pose — la carte
    // n'est plus en main, il n'y a donc pas de vol à relancer. L'attente peut
    // être une désignation d'arrivée OU une prize d'Abordage (`attente.abordage`,
    // créature accostante ou porteur du Grappin). Quand l'attente porte à la
    // fois les deux (Lettre de marque + créature avec arrivée ciblée), un
    // effet est résolu par clic : tant que l'autre reste en attente, la table
    // garde sa désignation ouverte.
    if ((arriveeCiblePortee(carteSource) || Number.isFinite(duel.arriveeEnAttente?.abordage))
      && duel.arriveeEnAttente?.carteId === cibleEnCours) {
      const champAvantAction = prendreInstantaneChamp();
      const debutJournalDestructions = rpgNombreDestructions(duel);
      if (modePvp) rpgSyncCompteurEntites(duel);
      const res = rpgResoudreArriveeCiblee(duel, 'joueur', entite.id);
      if (!res.ok) {
        jouerSfx('erreur');
        force();
        return true;
      }
      if (modePvp) void envoyerIntentionPvp({ type: 'resoudre-arrivee', cibleId: entite.id });
      // L'attente peut subsister pour l'autre effet (ex. Abordage après une
      // cible d'arrivée, ou l'inverse) : on garde la cible en cours pour le
      // prochain clic, sinon on la lève.
      if (!duel.arriveeEnAttente) setCibleEnCours(null);
      if (arriveeConsulteDeck(carteSource)) invaliderAnnulation();
      jouerSfx(carteSource.arrivee?.type === 'retour-main' ? 'creature_return' : 'select');
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
    if (modePvp) rpgSyncCompteurEntites(duel);
    const res = rpgActiverCapacite(duel, 'joueur', sourceId, entite.id);
    if (modePvp && res.ok) {
      void envoyerIntentionPvp({ type: 'activer', capacite: true, entiteId: sourceId, cibleId: entite.id });
    }
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
    // Le déchirement est en cours : la table attend la pose qui le suit.
    if (sacrificeEnCoursRef.current) return;
    // Une créature attend sa case : seule une case libre la pose (Échap ou
    // un reclic sur la carte pour renoncer) — pas une de ses voisines.
    if (poseEnCours) { jouerSfx('erreur'); force(); return; }
    if (clicApresGlisserBloqueurRef.current === entite.id) {
      clicApresGlisserBloqueurRef.current = null;
      return;
    }
    // Désignation du sacrifice (champ d'essai plein) : ce clic désigne la
    // créature qui fait la place — sa carte se déchire sur la table, puis la
    // pose se termine contre le sacrifice choisi (`dechirerEtPoser`).
    if (sacrificeEnCours) {
      if (cardById(entite.carteId)?.kind === 'site') {
        jouerSfx('erreur');
        force();
        return;
      }
      dechirerEtPoser(entite);
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
        signalerTutoriel('bloqueur-selectionne', { entiteId: entite.id });
      }
      force();
      return;
    }
    if (reponseApresBlocage || !monTour) return;
    if (cardById(entite.carteId)?.kind === 'site') {
      jouerSfx('erreur');
      force();
      return;
    }
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
        signalerTutoriel('attaque-declaree', { entiteId: entite.id });
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
    // Une créature attend sa case dans votre rangée : le camp adverse n'a
    // rien à recevoir de ce geste-là.
    if (poseEnCours) { jouerSfx('erreur'); force(); return; }
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
    // Le Ghul des cendres attend sa victime : cliquer une créature adverse
    // résout la destruction ciblée — une cible protégée est refusée d'un son
    // d'erreur et l'attente reste ouverte.
    if (duel.destructionsEnAttente?.[0]?.cote === 'joueur') {
      const champAvantAction = prendreInstantaneChamp();
      const debutJournalDestructions = rpgNombreDestructions(duel);
      const res = rpgResoudreDestructionCiblee(duel, 'joueur', entite.id);
      if (!res.ok) {
        jouerSfx('erreur');
        force();
        return;
      }
      if (modePvp) void envoyerIntentionPvp({ type: 'resoudre-destruction', cibleId: entite.id });
      jouerSfx('select');
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      if (!modePvp) reprendreSorcier();
      force();
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

    if (modePvp) {
      invaliderAnnulation();
      setPhase(false);
      setAttaquants([]);
      setCiblesAttaque({});
      const champAvantAttaque = prendreInstantaneChamp();
      animerEntites(ids, 'attack', 650);
      jouerSfx('combat');
      force();
      pvpEnVolCountRef.current += 1;
      Promise.resolve(pvpRef.current?.onIntention?.({
        type: 'attaquer',
        declarer: true,
        attaquants: ids,
        ciblesAttaque: ciblesFinales,
      }))
        .then((reponse) => {
          if (reponse?.etat) {
            const avant = duelRef.current;
            duelRef.current = structuredClone(reponse.etat);
            pvpSeqAppliqueRef.current = reponse.seq ?? pvpSeqAppliqueRef.current;
            animerModificationsChamp(champAvantAttaque, ids, 0);
            if ((reponse.etat.sorcier?.pv ?? 0) < (avant?.sorcier?.pv ?? 0)) declencherImpactEcran('dealt');
            if ((reponse.etat.joueur?.pv ?? 0) < (avant?.joueur?.pv ?? 0)) declencherImpactEcran('received');
          }
        })
        .finally(() => {
          pvpEnVolCountRef.current = Math.max(0, pvpEnVolCountRef.current - 1);
          force();
        });
      return;
    }

    if (!rpgOuvrirFenetreReponse(duel, 'joueur')) {
      return;
    }
    // Les attaquants sont désormais déclarés : une bannière (celle du Daimyō)
    // grandit ses Samouraïs tout de suite, avant même que le sorcier choisisse
    // ses bloqueurs. La résolution saura ne pas la déclencher une seconde fois.
    const bannieresAppliquees = rpgAppliquerBannieresAttaque(duel, 'joueur', ids);
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
      bannieresAppliquees,
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
    signalerTutoriel('attaque-declaree', { entites: ids });
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
    if (!retireDeCetteAttaque) signalerTutoriel('bloqueur-assigne', { attaquantId, bloqueurId });
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
      if (modePvp) void envoyerIntentionPvp({ type: 'bloquer', blocages: {}, repartitions: null });
      else apresCombatSorcier();
      force();
      return;
    }
    const vivants = new Set(attaquantsVivants);
    // Un attaquant rapide qui frappe une créature ne reçoit pas de bloqueur :
    // sa frappe a déjà clos son attaque.
    const blocages = Object.fromEntries(Object.entries(combatEntrant.blocages)
      .filter(([id]) => vivants.has(id))
      .map(([id, idsBloqueurs]) => [id, combatEntrant.ciblesAttaque?.[id] ? [] : idsBloqueurs]));
    const sonAttaque = rpgCombatSound(duel, attaquantsVivants, blocages);
    const sonFrappeDirecte = rpgCombatSound(duel, attaquantsVivants);
    const champAvantAttaque = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    if (modePvp) rpgSyncCompteurEntites(duel);
    const repartitionsDeclarees = combatEntrant.repartitions ?? null;
    const res = rpgLancerAttaque(
      duel,
      'sorcier',
      attaquantsVivants,
      blocages,
      null, // Le moteur partage les blessures après les capacités du Sahir.
      null,
      Object.fromEntries(Object.entries(combatEntrant.ciblesAttaque ?? {})
        .filter(([id]) => attaquantsVivants.includes(id))),
      {
        attaqueDeclaree: true,
        bannieresAppliquees: Boolean(combatEntrant.bannieresAppliquees),
      },
    );
    if (!res.ok) {
      jouerSfx('erreur');
      force();
      return;
    }
    if (modePvp) {
      void envoyerIntentionPvp({ type: 'bloquer', blocages, repartitions: repartitionsDeclarees });
    }
    const frappeDirecte = res.resume.frappeSorcier > 0;
    const frappeCreature = res.resume.paires.length > 0
      || res.resume.coupsRapides.some((coup) => !coup.annule && !coup.rate);
    const attaquantsRates = (res.resume.coupsRapides ?? [])
      .filter((coup) => coup.rate)
      .map((coup) => coup.attaquantId);
    if (attaquantsRates.length) declencherMissEntites(attaquantsRates);
    jouerSfx('combat');
    if (frappeCreature) jouerSfx(sonAttaque ?? 'player_attack_hit', 0.015);
    if (frappeDirecte) jouerSfx(sonFrappeDirecte ?? 'degats', 0.18);
    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    if (frappeDirecte) declencherImpactEcran('received');
    signalerTutoriel('combat-adverse-resolu', { attaquants: attaquantsVivants });
    if (!modePvp) apresCombatSorcier();
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
        const carteReponse = cardById(reponse.carteId);
        jouerSfx(rpgFoudreSoundFor(carteReponse, 'spell')
          ?? rpgWaterSoundFor(carteReponse, 'spell')
          ?? rpgFireSoundFor(carteReponse, 'spell')
          ?? 'magie');
        if (carteReponse?.kind === 'magie') {
          annoncerMagieSorcier(carteReponse, describeAnnouncedMagicTarget(
            carteReponse, reponse.cibleId ?? null, duel, sorcierArtId, portraitSorcierAdverse,
          ));
        } else if (carteReponse?.arrivee?.type === 'gel' && carteReponse?.arrivee?.cible === 'toutes-creatures') {
          declencherGelMasse(carteReponse, 'sorcier');
        }
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
    const sonAttaque = rpgCombatSound(duel, attaquantsVivants, blocages);
    const sonFrappeDirecte = rpgCombatSound(duel, attaquantsVivants);
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
      {
        attaqueDeclaree: true,
        bannieresAppliquees: Boolean(combat.bannieresAppliquees),
      },
    );
    if (!res.ok) {
      jouerSfx('erreur');
      force();
      return;
    }

    const frappeCreature = res.resume.paires.length > 0
      || res.resume.coupsRapides.some((coup) => !coup.annule && !coup.rate);
    const attaquantsRates = (res.resume.coupsRapides ?? [])
      .filter((coup) => coup.rate)
      .map((coup) => coup.attaquantId);
    if (attaquantsRates.length) declencherMissEntites(attaquantsRates);
    jouerSfx('combat');
    if (frappeCreature) jouerSfx(sonAttaque ?? 'player_attack_hit', 0.015);
    if (res.resume.frappeSorcier > 0) {
      jouerSfx(sonFrappeDirecte ?? 'player_attack_hit', 0.18);
    } else if (!frappeCreature) {
      jouerSfx('block_impact', 0.2);
    }
    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    if (res.resume.frappeSorcier > 0) declencherImpactEcran('dealt');
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    signalerTutoriel('attaque-confirmee', { entites: attaquantsVivants });
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
    // Le Ghul des cendres attend sa victime : le tour ne se ferme pas tant que
    // le joueur n'a pas cliqué la créature qui encaisse.
    if (duel.destructionsEnAttente?.[0]?.cote === 'joueur' || duel.siteEnAttente?.cote === 'joueur') {
      jouerSfx('erreur'); force(); return;
    }
    if (choixManaEssaiOuvert) { jouerSfx('erreur'); return; }
    if (sacrificeDemande || sacrificeEnCours || sacrificeEnCoursRef.current) { jouerSfx('erreur'); return; }
    // Mode sans terrains : plus de cinq cartes en main à la fin du tour ? Le
    // tour se suspend, le joueur CHOISIT ses défausses (l'attente du moteur),
    // et `confirmerDefausse` relance cette fermeture quand la main est à cinq.
    // Une défausse d'EFFET déjà en attente (le Butin d'un Chien du guet) ne
    // suspend rien : elle garde son comportement historique, refermée
    // d'office par la fermeture du tour.
    const defausseEffetEnAttente = duel.defausseEnAttente?.cote === 'joueur'
      && duel.defausseEnAttente.restant > 0
      && duel.defausseEnAttente.motif !== 'fin-de-tour';
    if (!defausseEffetEnAttente && rpgPreparerDefausseFinDeTour(duel, 'joueur') > 0) {
      if (modePvp) void envoyerIntentionPvp({ type: 'preparer-defausse-fin-tour' });
      finTourApresDefausseRef.current = true;
      setCarteDefausseSelectionnee(null);
      jouerSfx('select');
      force();
      return;
    }
    invaliderAnnulation();
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleEnCours(null);
    setPoseEnCours(null);
    setActivationEnCours(null);
    if (modePvp) {
      if (terminerTourEtDetecterDegatsJoueur()) declencherImpactEcran('received');
      void envoyerIntentionPvp({ type: 'fin-de-tour' });
      force();
      return;
    }
    rpgOuvrirFinDeTour(duel);

    const fermerTour = () => {
      if (rpgVainqueur(duel)) { force(); return; }
      sorcierApresCombatRef.current = false;
      if (terminerTourEtDetecterDegatsJoueur()) declencherImpactEcran('received');
      signalerTutoriel('fin-de-tour');
      if (annoncerTutorielScripte()) {
        setApercuAppui(null);
        setApercuSurvol(null);
      }
      force();
      later(() => {
        const champAvantIA = prendreInstantaneChamp();
        const debutJournalDestructions = rpgNombreDestructions(duel);
        rpgSorcierPrepareTerrain(duel);
        animerModificationsChamp(champAvantIA, [], debutJournalDestructions);
        annoncerSuivantSorcier();
      }, Math.max(700, delaiReflexionSorcier()));
    };

    if (!rpgPeutRepondre(duel, 'sorcier')) {
      force();
      later(fermerTour, 600);
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
          : rpgFoudreSoundFor(carte, 'spell') ?? rpgWaterSoundFor(carte, 'spell') ?? rpgFireSoundFor(carte, 'spell') ?? 'magie');
        annoncerMagieSorcier(carte, describeAnnouncedMagicTarget(
          carte, reponse.cibleId ?? null, duel, sorcierArtId, portraitSorcierAdverse,
        ));
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
    if (pauseSiAttenteJoueur(passerFinTourSorcier)) return;
    if (duel.finDeTour?.cote !== 'sorcier') return;
    if (transitionTourRef.current) return;
    transitionTourRef.current = true;
    later(() => {
      transitionTourRef.current = false;
      if (terminerTourEtDetecterDegatsJoueur()) declencherImpactEcran('received');
      force();
    }, 600);
  };

  const finirTourSorcier = () => {
    if (pauseSiAttenteJoueur(finirTourSorcier)) return;
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
    // Le combat du sorcier vient peut-être de tuer votre Ghul : sa capacité
    // attend votre clic, le sorcier reprendra ensuite.
    if (pauseSiAttenteJoueur(apresCombatSorcier)) return;
    rpgDefinirPhase(duel, 'principale2');
    sorcierApresCombatRef.current = true;
    later(annoncerSuivantSorcier, delaiReflexionSorcier());
  };

  // Une leçon peut scénariser l'annonce du sorcier : la carte est posée sur la
  // pile sans passer par l'IA, avec sa cible réelle. Le joueur la contre ou la
  // laisse passer comme n'importe quelle annonce ; la résolution paie.
  const annoncerTutorielScripte = () => {
    if (!tutorielActif) return false;
    const etape = etapesTutoriel.find((step) => step.id === etapeTutorielIdRef.current);
    const spec = etape?.scriptedAnnonce;
    if (!spec) return false;
    if (duel.annonce) return duel.annonce.carteId === spec.cardId;
    const carte = cardById(spec.cardId);
    if (!carte || !duel.sorcier.main.includes(spec.cardId)) return false;
    if (!rpgPeutPayer(duel.sorcier, carte)) return false;
    const cibleId = spec.cible === 'creature-joueur'
      ? (spec.cibleCarteId
        ? duel.joueur.creatures.find((entite) => entite.carteId === spec.cibleCarteId)?.id
        : null) ?? duel.joueur.creatures[0]?.id ?? null
      : spec.cible === 'sorcier' ? 'sorcier' : null;
    if (spec.cible === 'creature-joueur' && !cibleId) return false;
    duel.annonce = { cote: 'sorcier', carteId: spec.cardId, cibleId, cibleAllieeId: null };
    duel.fenetreReponse = true;
    duel.log.push(`Le sorcier annonce ${carte.name}.`);
    return true;
  };

  // Le sorcier annonce sa carte suivante. Le joueur répond avec une magie rapide, ou laisse passer.
  const annoncerSuivantSorcier = () => {
    if (rpgVainqueur(duel)) {
      force();
      return;
    }
    if (pauseSiAttenteJoueur(annoncerSuivantSorcier)) return;
    if (annoncerTutorielScripte()) {
      setApercuAppui(null);
      setApercuSurvol(null);
      force();
      return;
    }
    if (tutorielActif && etapeTutorielIdRef.current) {
      const etape = etapesTutoriel.find((step) => step.id === etapeTutorielIdRef.current);
      if (etape && etape.kind !== 'waiting') {
        force();
        return;
      }
    }
    const annonce = (tutorielActif && etapeTutorielIdRef.current)
      ? null
      : rpgSorcierAnnonceSuivante(duel, rng);
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
        later(declarerAttaqueSorcier, delaiReflexionSorcier());
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
    if (tutorielActif && etapeTutoriel?.on === 'annonce-passee') {
      jouerSfx('erreur');
      return;
    }
    setApercuSurvol(null);
    signalerTutoriel('annonce-repondue', { cardId: duel.annonce.carteId });
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
    if (tutorielActif && etapeTutoriel && etapeTutoriel.on !== 'annonce-passee') {
      jouerSfx('erreur');
      return;
    }
    const carteAnnoncee = cardById(duel.annonce.carteId);
    // La cible est décrite AVANT la résolution : elle efface l'annonce.
    const cibleAnnoncee = describeAnnouncedMagicTarget(
      carteAnnoncee, duel.annonce.cibleId, duel, sorcierArtId, portraitSorcierAdverse,
    );
    setApercuSurvol(null);
    jouerSfx('pass');
    const champAvant = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const degatsJoueurAvantResolution = prendreInstantaneDegatsJoueur();
    const res = rpgSorcierResoudreAnnonce(duel);
    if (res.ok) {
      const sonEffetBraise = res.renvoiMain
        ? 'creature_return'
        : rpgFoudreSoundFor(carteAnnoncee, 'spell')
          ?? rpgWaterSoundFor(carteAnnoncee, 'spell')
          ?? rpgFireSoundFor(carteAnnoncee, 'spell')
          ?? rpgFireSoundFor(carteAnnoncee, 'arrival');
      if (sonEffetBraise) jouerSfx(sonEffetBraise);
    }
    if (res.ok && joueurToucheDepuis(degatsJoueurAvantResolution)) {
      declencherImpactEcran('received');
    }
    if (res.ok) signalerTutoriel('annonce-passee', { cardId: carteAnnoncee?.id });
    // Une magie annoncée qui se résout se lit au-dessus des piles du sorcier.
    // Une créature ou une arme annoncée, elle, reste une carte posée : rien à
    // annoncer dans la zone des sorts.
    if (res.ok && carteAnnoncee?.kind === 'magie') annoncerMagieSorcier(carteAnnoncee, cibleAnnoncee);
    if (res.ok && carteAnnoncee?.arrivee?.type === 'gel' && carteAnnoncee?.arrivee?.cible === 'toutes-creatures') {
      declencherGelMasse(carteAnnoncee, 'sorcier');
    }
    animerModificationsChamp(champAvant, [], debutJournalDestructions,
      [res.renvoiEntityId]);
    force();
    later(annoncerSuivantSorcier, delaiReflexionSorcier());
  };

  // Phase d'attaque du sorcier, une fois toutes ses cartes annoncées et résolues.
  const declarerAttaqueSorcier = () => {
      if (pauseSiAttenteJoueur(declarerAttaqueSorcier)) return;
      // Une leçon de défense impose son assaut : les créatures déjà en scène
      // attaquent, même si l'IA estimerait l'échange défavorable.
      const etape = etapesTutoriel.find((step) => step.id === etapeTutorielIdRef.current);
      const forces = etape?.forceOpponentAttack
        ? duel.sorcier.creatures.filter(rpgPeutAttaquer).map((entite) => entite.id)
        : [];
      const ids = forces.length
        ? forces
        : rpgChoisirAttaquants(duel, 'sorcier', { ia: duel.sorcier.ia, rng });
      if (!ids.length) {
        finirTourSorcier();
        return;
      }
      rpgDefinirPhase(duel, 'attaque');
      rpgOuvrirFenetreReponse(duel);
      // Déclaration verrouillée : la bannière grandit ses Samouraïs avant que
      // le joueur ne voie l'assaut et choisisse ses bloqueurs.
      const bannieresAppliquees = rpgAppliquerBannieresAttaque(duel, 'sorcier', ids);
      const ciblesRapides = rpgCiblesAttaqueRapide(duel, 'sorcier', ids);
      setCombatEntrant({
        coteAttaquant: 'sorcier',
        attaquants: ids,
        blocages: {},
        repartitions: {},
        ciblesAttaque: ciblesRapides,
        bannieresAppliquees,
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
        // Une créature glissée au doigt sur une case libre vise CETTE case :
        // les cases sont éteintes aux pointeurs (`elementFromPoint` ne les
        // voit pas), leur géométrie parle donc directement.
        if (cartePrendUneCase(carte)) {
          const numero = emplacementLibreAuPoint(x, y);
          if (numero !== null) {
            return tableRef.current
              ?.querySelector(`.card-row--equipe .rpg-creature-slot[data-creature-slot="${numero + 1}"]`) ?? null;
          }
        }
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
        if (depuisMain) {
          const numero = Number(target?.dataset?.creatureSlot);
          deposerCarteSurTable(
            { preventDefault() {} },
            target?.classList?.contains('rpg-creature-slot') && Number.isInteger(numero) ? numero - 1 : null,
          );
        }
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
     Sur grand écran rien ne change : chaque carte garde son emplacement. Le
     mode essai (sans terrains) refuse lui la superposition : chaque carte,
     en main comme sur le champ, garde sa place et son identité. */
  const empilerCartes = viewport.mobile && duel.modeMana !== RPG_MODE_MANA_ESSAI;
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
    ...Object.keys(missVisibles ?? {}),
    ...Object.keys(boucliersVisibles ?? {}),
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
        const cible = liste.find((entite) => !rpgEstProtegee(entite, cardColors(carteCiblee))
          && !(carteCiblee?.kind === 'magie' && rpgEstProtegeeDesSorts(entite, cardColors(carteCiblee))));
        if (cible) return cible;
      }
      const prete = liste.find((entite) => entite.ready && !entite.attaquee && !attaquants.includes(entite.id));
      return prete
        ?? liste.find((entite) => !entite.attaquee && !attaquants.includes(entite.id))
        ?? liste[0];
    }
    if (cibleEnCours && ['ennemi', 'tous'].includes(modeCible)) {
      return liste.find((entite) => !rpgEstProtegee(entite, cardColors(carteCiblee))
        && !(carteCiblee?.kind === 'magie' && rpgEstProtegeeDesSorts(entite, cardColors(carteCiblee)))) ?? liste[0];
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
  // Mode essai : la colonne (1 à 5) de la case de chaque créature.
  const casesParId = (camp) => (duel.modeMana === RPG_MODE_MANA_ESSAI
    ? new Map(rpgEmplacementsChamp(camp).flatMap((entite, index) => (entite ? [[entite.id, index + 1]] : [])))
    : null);
  const casesEnnemi = casesParId(duel.sorcier);
  const casesJoueur = casesParId(duel.joueur);
  const inviteActionJoueur = (mulliganOuvert || choixManaEssaiOuvert || sacrificeDemande || Boolean(vainqueur))
    ? null
    : sacrificeEnCours
      ? {
        cle: `sacrifice:${sacrificeEnCours}`,
        classe: 'rpg-sacrifice-prompt',
        texte: `Champ plein — choisissez une créature à sacrifier pour poser ${cardById(sacrificeEnCours)?.name ?? 'cette carte'}`,
      }
      : poseEnCours
        ? {
          cle: `pose:${poseEnCours.carteId}:${poseEnCours.handIndex}`,
          classe: 'rpg-target-prompt',
          texte: `Choisissez l’emplacement de ${cardById(poseEnCours.carteId)?.name ?? 'votre créature'} — cliquez une case libre de votre rangée (Échap pour renoncer)`,
        }
      : defausseOuverte
        ? {
          cle: `defausse:${duel.defausseEnAttente.motif ?? 'effet'}:${duel.defausseEnAttente.restant}:${selectionDefausseValide ? carteDefausseSelectionnee.carteId : 'aucune'}`,
          classe: 'rpg-discard-prompt',
          texte: duel.defausseEnAttente.motif === 'fin-de-tour'
            ? selectionDefausseValide
              ? `Fin du tour : carte choisie : ${cardById(carteDefausseSelectionnee.carteId)?.name ?? 'carte sélectionnée'} · encore ${duel.defausseEnAttente.restant} à défausser`
              : `Fin du tour : choisissez une carte à défausser (${duel.defausseEnAttente.restant} restante${duel.defausseEnAttente.restant > 1 ? 's' : ''})`
            : selectionDefausseValide
              ? `Carte choisie : ${cardById(carteDefausseSelectionnee.carteId)?.name ?? 'carte sélectionnée'} · ${duel.defausseEnAttente.restant} à défausser`
              : `Choisissez une carte à défausser (${duel.defausseEnAttente.restant})`,
        }
        : attenteDestructionVisible
          ? {
            cle: `destruction:${attenteDestruction.carteId}`,
            classe: 'rpg-target-prompt',
            texte: `${carteAttenteDestruction?.name ?? 'Capacité de destruction'} : cliquez la créature adverse qui subira ${carteAttenteDestruction?.destruction?.amount ?? 1} dégât${(carteAttenteDestruction?.destruction?.amount ?? 1) > 1 ? 's' : ''}`,
          }
        : (duel.magieGratuite?.cote === 'joueur' && !cibleEnCours)
          ? {
            cle: 'magie-gratuite',
            classe: 'rpg-target-prompt',
            texte: 'Kraken : lancez une magie rapide ou une sorcellerie de votre main sans payer son coût de mana — ou renoncez',
          }
        : cibleEnCours
          ? {
            cle: `cible:${cibleEnCours}:${cibleAllieeMagie ?? '1'}:${attenteAbordage ? 'abordage' : 'cible'}`,
            classe: 'rpg-target-prompt',
            // L'arme ACCROCHÉE ne demande plus de porteur : le Grappin a mordu,
            // reste à désigner sa prise — une créature adverse, au seuil de
            // l'attente. L'invite d'équipement ne revient donc que tant que
            // l'arme attend encore son porteur.
            texte: attenteAbordage && carteEstArme(carteCiblee)
              ? `${carteCiblee.name} accroché — choisissez la créature adverse à prendre en cale (coût ${duel.arriveeEnAttente?.abordage} ou moins)`
              : carteEstArme(carteCiblee)
                ? `Choisissez une créature alliée à équiper avec ${carteCiblee.name}`
                : (carteCiblee?.effet?.type === 'combat' && carteCiblee?.effet?.sourceCible === 'creature-amie')
                  ? (cibleAllieeMagie
                    ? 'Choisissez la créature adverse à affronter'
                    : `Choisissez votre créature pour ${carteCiblee.name}`)
                  : modeCible === 'allie'
                    ? `Choisissez une créature alliée pour ${carteCiblee?.name ?? 'cet effet'}`
                    : modeCible === 'ennemi'
                      ? `Choisissez une cible adverse pour ${carteCiblee?.name ?? 'cet effet'}`
                      : `Choisissez une cible pour ${carteCiblee?.name ?? 'cet effet'}`,
          }
          : cibleArmeEnCours
            ? {
              cle: `arme:${cibleArmeEnCours.entiteId}:${cibleArmeEnCours.armeId}:${cibleArmeEnCours.mode ?? 'seul'}`,
              classe: 'rpg-target-prompt',
              texte: `Choisissez une cible pour ${armeById(cibleArmeEnCours.armeId)?.name ?? 'votre arme'}`,
            }
            : activationEnCours
              ? {
                cle: `activation:${activationEnCours}`,
                classe: 'rpg-target-prompt',
                texte: `Choisissez une cible pour ${cardById(duel.joueur.creatures.find((e) => e.id === activationEnCours)?.carteId)?.name ?? 'la capacité activée'}`,
              }
              : terrainManaChoix
                ? {
                  cle: `mana:${terrainManaChoix.terrainId}`,
                  classe: 'rpg-mana-prompt',
                  texte: 'Choisissez la couleur de mana à produire',
                }
                : (combatEntrant && reponseActive)
                  ? {
                    cle: `combat:${combatEntrant.coteAttaquant}:${bloqueurSelectionne ?? 'aucun'}:${blocageForceValide ? 'force-ok' : 'force'}:${provocationValide ? 'provocation-ok' : 'provocation'}`,
                    classe: 'rpg-combat-prompt',
                    texte: combatEntrant.coteAttaquant === 'joueur'
                      ? 'Blocages déclarés — jouez un sort rapide ou acceptez les blocages'
                      : !blocageForceValide
                        ? 'Blocage forcé — assignez chaque créature marquée à un attaquant qu’elle peut bloquer'
                        : !provocationValide
                          ? 'Provocation — assignez au moins un bloqueur à l’attaquant provoquant'
                          : bloqueurSelectionne
                            ? 'Choisissez la créature attaquante à bloquer'
                            : 'Choisissez vos bloqueurs ou résolvez le combat',
                  }
                  : (monTour && phase && !combatEntrant)
                    ? {
                      cle: `attaque:${cibleAttaqueEnCours ?? 'aucune'}:${attaquants.length}`,
                      classe: 'rpg-attack-prompt',
                      texte: cibleAttaqueEnCours
                        ? 'Coup rapide — choisissez une cible ou confirmez l’attaque'
                        : attaquants.length > 0
                          ? `${attaquants.length} attaquant${attaquants.length > 1 ? 's' : ''} choisi${attaquants.length > 1 ? 's' : ''} — confirmez l’attaque`
                          : 'Choisissez vos créatures attaquantes',
                    }
                    : null;

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
        inert={viewport.portrait || mulliganOuvert ? true : undefined}
        onPointerDownCapture={() => unlockSfx()}
        className={`card-table card-table--plateau-${plateau.id}${plateauDecoupe ? ' card-table--decoupee' : ''}${carteGlissee ? ' is-card-dragging' : ''}${carteGlissee && cartePrendUneCase(cardById(carteGlissee)) ? ' is-dragging-creature' : ''}${poseEnCours ? ' is-choix-emplacement' : ''}${surZoneDepot ? ' is-drop-target' : ''}${bloqueurGlisse ? ' is-blocker-dragging' : ''}${carteEnVol ? ' is-card-flight-active' : ''}${impactEcran ? ` rpg-screen-shake--${impactEcran.variante}` : ''}${impactEcran?.mode === 'received' ? ` rpg-screen-hit--${impactEcran.variante}` : ''}`}
        data-screen-impact={impactEcran?.mode ?? undefined}
        data-screen-impact-token={impactEcran?.token ?? undefined}
        data-plateau-joueur={plateau.id}
        data-plateau-adversaire={plateauAdverse.id}
        data-territoire-joueur={territoire.partJoueur}
        data-camp-musical={campMusical}
        data-plateau-musical={plateauMusiqueId}
        data-territoire-dominant={territoire.dominant}
        data-territoire-termine={vainqueur ? 'true' : undefined}
        data-apercu-carte={apercuCarte ?? undefined}
        aria-busy={carteEnVol ? 'true' : undefined}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}${plateau.fichier})`,
          '--rpg-frontiere': `${territoire.frontiere}%`,
        }}
        aria-label={plateauDecoupe
          ? `Table de jeu du duel de sorciers — ${plateauAdverse.nom} côté sorcier, ${plateau.nom} côté joueur — territoire joueur ${territoire.partJoueur} %`
          : `Table de jeu du duel de sorciers — ${plateau.nom}`}
        onPointerDown={commencerGlisserTactile}
        onDragOver={survolerTablePourDepot}
        onDragLeave={quitterZoneDepot}
        onDrop={deposerCarteSurTable}
      >
        <CombatFeed events={duel.combatFeed} />
        {/* Le jumeau de la peinture : le flou d'un aperçu ne peut pas être posé
            sur `.card-table` (il emporterait l'aperçu lui-même), ni sur sa
            `background-image`. Ce calque en reprend donc la peinture par
            `background-image: inherit` — transparent au repos, il ne remplace le
            décor que le temps de l'aperçu, flou (voir `rpg-battle.css`).
            `aria-hidden` : il ne montre rien que la table ne montre déjà. */}
        <span className="rpg-plateau-fond" aria-hidden="true" />
        {/* Les peintures restent plein cadre : seul le masque du terrain adverse
            avance ou recule. Le joueur reste dessous pour un fondu sans trou.
            Aucun déplacement des cartes, des zones de dépôt ou des commandes. */}
        {plateauDecoupe && (
          <>
            <div
              className={`rpg-plateau-moitie rpg-plateau-moitie--joueur rpg-plateau-moitie--plateau-${plateau.id}`}
              style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${plateau.fichier})` }}
              aria-hidden="true"
            />
            <div
              className={`rpg-plateau-moitie rpg-plateau-moitie--adverse rpg-plateau-moitie--plateau-${plateauAdverse.id}`}
              style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${plateauAdverse.fichier})` }}
              aria-hidden="true"
            />
            <div className="rpg-plateau-lisere" aria-hidden="true" />
          </>
        )}
        {/* Le décor 3D se met en pause sous un aperçu ou un volet : il est
            masqué ou flouté, et un canvas animé ne vaut pas la peine d'être
            recomposé à chaque image derrière un voile sur mobile. */}
        <RpgTableScene3D plateau={plateau} enabled={decor3dVisible} paused={Boolean(carteGlissee || carteEnVol || bloqueurGlisse || apercuCarte || mulliganOuvert || choixManaEssaiOuvert || sacrificeDemande || navMenuOuvert)} />
        <nav className="rpg-duel-nav" aria-label="Navigation du duel">
          <strong>LE SABLIER</strong>
          {modePvp && (
            <span className="rpg-duel-nav__pvp">
              <span className="rpg-duel-nav__pvp-dot" aria-hidden="true" />
              EN LIGNE{pvp?.code ? ` · ${pvp.code}` : ''}
              <HorlogePvp
                echeance={pvp?.echeance}
                statut={pvp?.statut}
                vainqueur={vainqueur}
                pvpRef={pvpRef}
                pvpHorlogeExpireeRef={pvpHorlogeExpireeRef}
              />
            </span>
          )}
          {tutorielActif && <span className="rpg-duel-nav__tutorial">PARTIE D’ENTRAÎNEMENT</span>}
          {etageHistoire && (
            <span className="rpg-duel-nav__story">
              <span className="rpg-duel-nav__story-mode">MODE </span>HISTOIRE<span className="rpg-duel-nav__story-floor"> · {etageHistoire.nom}</span>
            </span>
          )}
          <div
            className={`rpg-duel-nav__menu${navMenuOuvert ? ' is-open' : ''}`}
            id="rpg-duel-nav-menu"
          >
            {modePvp ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setNavMenuOuvert(false);
                    setNavParametresOuvert(false);
                    pvp?.onQuitter?.();
                  }}
                >
                  ← Salon
                </button>
                {!vainqueur && pvp?.onAbandon && (
                  confirmerAbandonPvp ? (
                    <>
                      <button
                        type="button"
                        className="rpg-duel-nav__abandon is-confirm"
                        disabled={pvp?.occupe}
                        onClick={() => {
                          setConfirmerAbandonPvp(false);
                          setNavMenuOuvert(false);
                          pvp.onAbandon();
                        }}
                      >
                        Confirmer l’abandon
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmerAbandonPvp(false)}
                      >
                        Continuer
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="rpg-duel-nav__abandon"
                      disabled={pvp?.occupe}
                      onClick={() => setConfirmerAbandonPvp(true)}
                    >
                      Abandonner
                    </button>
                  )
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setNavMenuOuvert(false); setNavParametresOuvert(false); setEcran(histoireEtageId ? (campagneDuelRef.current ? 'histoire' : 'tours') : 'jouer'); }}>Menu</button>
                <button type="button" onClick={() => { setNavMenuOuvert(false); setNavParametresOuvert(false); setEcran('decks'); }}>Deck</button>
                <button type="button" onClick={() => { setNavMenuOuvert(false); setNavParametresOuvert(false); setEcran('catalogue'); }}>Catalogue</button>
              </>
            )}
            <button
              type="button"
              className={`rpg-duel-nav__settings-tab${navParametresOuvert ? ' is-open' : ''}`}
              aria-expanded={navParametresOuvert}
              aria-controls="rpg-duel-nav-settings"
              onClick={() => setNavParametresOuvert((ouvert) => !ouvert)}
            >
              Paramètres
            </button>
            <div
              id="rpg-duel-nav-settings"
              className={`rpg-duel-nav__settings${navParametresOuvert ? ' is-open' : ''}`}
              role="region"
              aria-label="Paramètres"
            >
              <div className="rpg-duel-nav__setting-row">
                <span className="rpg-duel-nav__setting-label">Option 3D</span>
                <button
                  type="button"
                  className={`rpg-duel-nav__decor3d${decor3dVisible ? ' is-on' : ''}`}
                  onClick={basculerDecor3d}
                  disabled={plateauDecoupe || undefined}
                  aria-pressed={decor3dVisible}
                  title={plateauDecoupe
                    ? 'Décor 3D indisponible : les deux terrains se partagent la table'
                    : decor3dActif ? 'Désactiver le décor 3D de la table' : 'Activer le décor 3D de la table'}
                  aria-label={plateauDecoupe
                    ? 'Décor 3D indisponible : les deux terrains se partagent la table'
                    : decor3dActif ? 'Désactiver le décor 3D de la table' : 'Activer le décor 3D de la table'}
                >
                  <span aria-hidden="true">3D</span>
                  <span className="rpg-duel-nav__decor3d-state">
                    {plateauDecoupe ? 'Indisponible' : decor3dVisible ? 'Activé' : 'Désactivé'}
                  </span>
                </button>
              </div>
              <label className="rpg-duel-nav__volume">
                <span className="rpg-duel-nav__volume-head">
                  <span>Sons du jeu</span>
                  <strong>{sonActif ? Math.round(volumeSfx * 100) : 0} %</strong>
                </span>
                <input
                  type="range"
                  className="rpg-duel-nav__slider rpg-duel-nav__slider--sfx"
                  min="0"
                  max="100"
                  step="1"
                  value={sonActif ? Math.round(volumeSfx * 100) : 0}
                  aria-label="Volume des sons du jeu"
                  onChange={(event) => changerVolumeSfx(Number(event.target.value) / 100)}
                />
              </label>
              <label className="rpg-duel-nav__volume">
                <span className="rpg-duel-nav__volume-head">
                  <span>Musiques</span>
                  <strong>{sonActif ? Math.round(volumeMusique * 100) : 0} %</strong>
                </span>
                <input
                  type="range"
                  className="rpg-duel-nav__slider rpg-duel-nav__slider--music"
                  min="0"
                  max="100"
                  step="1"
                  value={sonActif ? Math.round(volumeMusique * 100) : 0}
                  aria-label="Volume des musiques"
                  onChange={(event) => changerVolumeMusique(Number(event.target.value) / 100)}
                />
              </label>
              <button
                type="button"
                className={`rpg-duel-nav__sound${sonActif ? ' is-on' : ''}`}
                onClick={basculerSon}
                aria-pressed={sonActif}
                title={sonActif ? 'Couper le son (M)' : 'Activer le son (M)'}
                aria-label={sonActif ? 'Couper tous les sons' : 'Activer tous les sons'}
              >
                <span aria-hidden="true">{sonActif ? '♫' : '♪'}</span>
                <span className="rpg-duel-nav__sound-state">{sonActif ? 'Son activé' : 'Son coupé'}</span>
              </button>
              {desktopMode && desktopAccount && onSignOut && (
                <div className="rpg-duel-nav__account">
                  <p className="rpg-duel-nav__account-label">
                    Compte PC · <strong>{desktopAccountName(desktopAccount)}</strong>
                  </p>
                  <button
                    type="button"
                    className="rpg-duel-nav__signout rpg-settings__signout"
                    onClick={async () => {
                      try { await onSignOut(); } catch { /* la session locale est déjà coupée */ }
                    }}
                  >
                    <span aria-hidden="true">⏻</span> Se déconnecter
                  </button>
                </div>
              )}
            </div>
            {/* La messagerie reste ouvrable en pleine partie : un défi du
                Sablier reçu pendant un duel se lit sans quitter la table —
                le panneau du jeu s'ouvre en voile au-dessus de la table
                (`RpgMessageriePanel.jsx`), le duel reprend à la fermeture. */}
            <RpgMessagerieBouton
              variante="duel"
              onActivate={() => { setNavMenuOuvert(false); setNavParametresOuvert(false); }}
              onOuvrir={() => setMessagerieVoletOuvert(true)}
            />
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
          </div>
          {/* Au doigt, la barre de navigation se replie dans ce bouton hamburger ;
              à la souris, le menu reste déroulé en ligne (voir `rpg-mobile.css`). */}
          <button
            type="button"
            className={`rpg-duel-nav__burger${navMenuOuvert ? ' is-open' : ''}`}
            aria-expanded={navMenuOuvert}
            aria-controls="rpg-duel-nav-menu"
            aria-label={navMenuOuvert ? 'Fermer le menu du duel' : 'Ouvrir le menu du duel'}
            onClick={() => setNavMenuOuvert((ouvert) => {
              if (ouvert) setNavParametresOuvert(false);
              return !ouvert;
            })}
          >
            <span aria-hidden="true" className="rpg-duel-nav__burger-icon">{navMenuOuvert ? '✕' : '☰'}</span>
          </button>
        </nav>

        {/* La messagerie, en pleine partie : le voile se pose au-dessus de la
            table — discussions et défis du Sablier sans quitter le duel
            (`RpgMessageriePanel.jsx`). */}
        {messagerieVoletOuvert && (
          <RpgMessageriePanel
            variante="volet"
            onFermer={() => setMessagerieVoletOuvert(false)}
          />
        )}

        {/* Bandeau d'ouverture de tour : le camp qui prend la main se nomme au
            centre de la table pendant 1,5 s, puis s'efface (`AnnonceTour`). */}
        <AnnonceTour annonce={annonceTour} />
        <AnnonceActionJoueur invite={inviteActionJoueur} decalee={Boolean(annonceTour)} />
        {/* Les sorts qui viennent d'être joués : la fiche rectangulaire se pose
            au milieu du plateau, que le lanceur soit le joueur (turquoise) ou
            le sorcier (rouge). Elles vivaient autrefois accrochées aux piles
            de leur lanceur — au doigt, ces piles sont masquées
            (`.rpg-battle--touch .rpg-card-piles`), la fiche disparaissait
            avec elles. Enfant direct de la table, la pile centrale les tient
            au centre à tous les formats ; quand les deux camps lancent un
            sort dans la même seconde (un contre, une réponse), les deux
            fiches s'empilent autour du centre sans se recouvrir. */}
        {(sortJoue || sortJoueSorcier) && (
          <div className="rpg-spell-played-stack">
            {sortJoueSorcier && <SpellAnnouncement annonce={sortJoueSorcier} camp="sorcier" />}
            {sortJoue && <SpellAnnouncement annonce={sortJoue} />}
          </div>
        )}
        {sorcierReflechit && <span className="sr-only" role="status" aria-live="polite">Le sorcier réfléchit à son prochain coup.</span>}

        {/* Soins : quand VOS PV remontent, les bords de la table s'éclairent
            d'un vert doux — le pendant du voile rouge des coups reçus. La zone
            d'état dit aux lecteurs d'écran qui regagne combien de PV. */}
        {soinJoueur && <span key={soinJoueur.token} className="rpg-soin-ecran" aria-hidden="true" />}
        <p className="sr-only" role="status" aria-live="polite">
          {annonceSoins(soinsVisibles, {
            nomAdversaire: nomSorcierAdverse,
            nomCreature: (id) => [...duel.joueur.creatures, ...duel.sorcier.creatures]
              .find((entite) => entite.id === id)?.name ?? null,
          })}
        </p>

        {combatEntrant && <BlockerArrows tableRef={tableRef} assignments={combatEntrant.blocages} />}
        {modePvp && (mulliganAttenteAdverse || attenteBlocageAdverse || pvp?.erreur) && (
          <div className={`rpg-pvp-table-status${pvp?.erreur ? ' is-error' : ''}`} role="status" aria-live="polite">
            <span className="rpg-pvp-table-status__dot" aria-hidden="true" />
            <span>
              {pvp?.erreur
                ? `Action refusée (${pvp.erreur}) — synchronisation en cours…`
                : mulliganAttenteAdverse
                  ? `En attente de ${nomSorcierAdverse} (choix de la main de départ)…`
                  : `${nomSorcierAdverse} choisit ses bloqueurs…`}
            </span>
          </div>
        )}
        <FaceDownHand count={nbMainAdverse} drawAnimations={piochesSorcier} />

        <div className="rpg-card-piles rpg-card-piles--opponent" aria-label="Zones du sorcier">
          <CardPile count={nbDeckAdverse} label="Paquet" variant="deck" drawing={piochesSorcier.length > 0} drawToken={tokenPiocheSorcier} />
          <CardPile
            count={duel.sorcier.cimetiere.length}
            label="Cimetière"
            variant="graveyard"
            topCard={duel.sorcier.cimetiere.at(-1)}
            onHoverCard={afficherApercuSurvol}
            onLeaveHoverCard={quitterCarteSurvol}
          />
        </div>

        <button type="button" className={`rpg-wizard-plate rpg-wizard-plate--ennemi${cibleEnCours && carteCiblee?.cibles?.includes('sorcier') ? ' is-ciblable' : ''}${sortJoue?.cible.targetPlate === 'sorcier' ? ' is-spell-target' : ''}${classeSoinPlaque(soinSorcier)}`} onClick={cliquerSorcier}
          data-tutorial-target={cibleTutoriel('opponent-health') ? 'opponent-health' : undefined}
          data-soin={soinSorcier ? soinSorcier.montant : undefined}
          data-menace-letale={menaceLetaleActive ? 'true' : undefined}
          title={modePvp ? nomSorcierAdverse : 'Le sorcier adverse'}>
          <span className="rpg-wizard-plate__avatar rpg-wizard-plate__avatar--ennemi" aria-hidden="true"><img src={portraitSorcierAdverse} data-personnage={personnageSorcier ?? undefined} alt="" /></span>
          <span className="rpg-wizard-plate__enemy-name">{nomSorcierAdverse}</span>
          <span className="rpg-wizard-plate__identity">
            <strong>{modePvp ? nomSorcierAdverse : etageHistoire ? etageHistoire.nom : tutorielActif ? 'SORCIER D’ENTRAÎNEMENT' : 'LE SORCIER'}</strong>
            <small>{etageHistoire ? etageHistoire.fonction : tutorielActif ? 'Partie guidée · sans pression' : `${deckAdverseAffiche.name} · ${deckColorLabel(deckAdverseAffiche)}`}</small>
          </span>
          <PlaqueVie
            pv={duel.sorcier.pv}
            pvMax={duel.sorcier.pvMax}
            bouclier={duel.sorcier.bouclier}
            soin={soinSorcier}
            base={RPG_PV_SORCIER_BASE}
          />
          <WizardManaCounters mana={duel.sorcier.mana} />
          {sorcierReflechit && (
            <span className="rpg-wizard-plate__thinking" aria-hidden="true">
              <i /> {modePvp ? `${nomSorcierAdverse} réfléchit…` : 'Le sorcier réfléchit…'}
            </span>
          )}
          <span className="rpg-wizard-plate__zones"><span className="rpg-wizard-plate__zone">Main · {nbMainAdverse}</span><span className="rpg-mobile-zones"><span className="rpg-wizard-plate__zone-sep"> · </span><span className="rpg-wizard-plate__zone">Paquet {nbDeckAdverse}</span><span className="rpg-wizard-plate__zone-sep"> · </span><span className="rpg-wizard-plate__zone">Cimetière {duel.sorcier.cimetiere.length}</span></span></span>
          {soinSorcier && <EclatSoin key={soinSorcier.token} />}
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
                onMouseLeave={quitterCarteSurvol}
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
          data-tutorial-target={cibleTutoriel('enemy-field') ? 'enemy-field' : undefined}>
          {duel.modeMana === RPG_MODE_MANA_ESSAI && <CreatureSlots camp={duel.sorcier} cote="ennemi" />}
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
                      caseEssai={casesEnnemi?.get(entite.id) ?? null}
                      active={Boolean(combatEntrant?.coteAttaquant !== 'joueur' && combatEntrant?.attaquants.includes(entite.id))}
                      declaredAttacker={Boolean(combatEntrant?.coteAttaquant !== 'joueur' && combatEntrant?.attaquants.includes(entite.id))}
                      blocking={bloqueursSelectionnes.has(entite.id)}
                      spellTarget={Boolean(sortJoue?.cible.targetIds.includes(entite.id)) || idsVisesParAnnonce.has(entite.id) || idsCiblesDestruction.has(entite.id)}
                      coupRapideCible={Object.values(combatEntrant?.ciblesAttaque ?? {}).includes(entite.id) || Object.values(ciblesAttaque).includes(entite.id)}
                      canTarget={Boolean(
                        idsCiblesDestruction.has(entite.id)
                        || (cibleEnCours && ['ennemi', 'tous'].includes(modeCible)
                          && !attenteAbordage
                          && !rpgEstProtegee(entite, cardColors(carteCiblee))
                          && !(carteCiblee?.kind === 'magie' && rpgEstProtegeeDesSorts(entite, cardColors(carteCiblee)))
                          && cibleRespecteCoutMax(carteCiblee, entite))
                        || (attenteAbordage && cibleAbordageLegale(entite))
                        || (activationEnCours && !rpgEstProtegee(entite, 'neige'))
                        || (cibleAttaqueEnCours && ciblesCoupRapideLegales(
                          duel.joueur.creatures.find((attaquant) => attaquant.id === cibleAttaqueEnCours),
                          'joueur',
                        ).some((cible) => cible.id === entite.id))
                      )}
                      canReceiveBlocker={Boolean(reponseActive && combatEntrant?.coteAttaquant !== 'joueur' && combatEntrant?.attaquants.includes(entite.id) && !combatEntrant?.ciblesAttaque?.[entite.id] && !entite.infiltration)}
                      onAssignBlocker={assignerBloqueur}
                      actionFx={animationsEntites[entite.id]}
                      soin={soinDeCarte(entite, pile, deployee)}
                      miss={missDeCarte(entite, pile, deployee)}
                      bouclierFx={bouclierDeCarte(entite, pile, deployee)}
                      onHoverCard={afficherApercuSurvol}
                      onLeaveHoverCard={quitterCarteSurvol}
                      onClick={() => cliquerCreatureEnnemie(entite)}
                    />
                  );
                  if (deployee || pile.entites.length < 2) {
                    return carte;
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
          data-tutorial-target={cibleTutoriel('player-field') ? 'player-field' : undefined}>
          {duel.modeMana === RPG_MODE_MANA_ESSAI && (
            <CreatureSlots
              camp={duel.joueur}
              cote="joueur"
              choixEmplacement={Boolean(poseEnCours)}
              nomCartePose={poseEnCours ? cardById(poseEnCours.carteId)?.name ?? null : null}
              onChoisirEmplacement={choisirEmplacement}
              emplacementSurvole={emplacementSurvole}
            />
          )}
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
                      caseEssai={casesJoueur?.get(entite.id) ?? null}
                      active={attaquants.includes(entite.id) || Boolean(reponseApresBlocage && combatEntrant?.attaquants.includes(entite.id))}
                      selected={attaquants.includes(entite.id) || Boolean(reponseApresBlocage && combatEntrant?.attaquants.includes(entite.id))}
                      declaredAttacker={Boolean((phase && attaquants.includes(entite.id)) || (reponseApresBlocage && combatEntrant?.attaquants.includes(entite.id)))}
                      spellTarget={Boolean(sortJoue?.cible.targetIds.includes(entite.id)) || idsVisesParAnnonce.has(entite.id)}
                      blocking={bloqueursSelectionnes.has(entite.id)}
                      selectedBlocker={bloqueurSelectionne === entite.id}
                      coupRapideCible={Object.values(combatEntrant?.ciblesAttaque ?? {}).includes(entite.id)}
                      canTarget={Boolean((sacrificeEnCours && cardById(entite.carteId)?.kind !== 'site')
                        || (cibleEnCours && ['allie', 'tous'].includes(modeCible)
                          && entite.id !== duel.arriveeEnAttente?.entiteId
                          && !rpgEstProtegee(entite, cardColors(carteCiblee))
                          && !(carteCiblee?.kind === 'magie' && rpgEstProtegeeDesSorts(entite, cardColors(carteCiblee)))
                          && cibleRespecteCoutMax(carteCiblee, entite))
                        || (activationEnCours && !rpgEstProtegee(entite, 'neige')))}
                      sacrificeTarget={Boolean(sacrificeEnCours && cardById(entite.carteId)?.kind !== 'site')}
                      activationDispo={Boolean(monTour && !phase && !cibleEnCours && !cibleAttaqueEnCours
                        && !combatEntrant && !reponseActive
                        && (activationEnCours === entite.id || rpgPeutActiverCapacite(duel, 'joueur', entite.id)))}
                      onActiver={() => activerCapacite(entite)}
                      canDragBlocker={Boolean(reponseActive && !reponseApresBlocage && bloqueursDisponibles.some((bloqueur) => bloqueur.id === entite.id))}
                      draggedBlocker={bloqueurGlisse === entite.id}
                      onStartBlockerDrag={commencerGlisserBloqueur}
                      onEndBlockerDrag={terminerGlisserBloqueur}
                      actionFx={animationsEntites[entite.id]}
                      soin={soinDeCarte(entite, pile, deployee)}
                      miss={missDeCarte(entite, pile, deployee)}
                      bouclierFx={bouclierDeCarte(entite, pile, deployee)}
                      playerTurn={tourDuJoueur}
                      onHoverCard={afficherApercuSurvol}
                      onLeaveHoverCard={quitterCarteSurvol}
                      onClick={() => cliquerCreatureJoueur(entite)}
                    />
                  );
                  if (deployee || pile.entites.length < 2) {
                    return carte;
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

        {cartesEnDestruction.map((effet) => (
          <FantomeCarteDetruite
            key={effet.effectId}
            effet={effet}
            tableRef={tableRef}
            onTermine={(effectId) => setCartesEnDestruction((current) => current
              .filter((autre) => autre.effectId !== effectId))}
          />
        ))}

        {/* Braise : la roue de feu tourne autour de la créature brûlée. */}
        {rouesFeu.map((effet) => (
          <RoueDeFeu
            key={effet.effectId}
            effet={effet}
            onTermine={(effectId) => setRouesFeu((current) => current.filter((autre) => autre.effectId !== effectId))}
          />
        ))}

        {/* Éclair du marteau : la foudre tombe sur la créature touchée. */}
        {eclairsMarteau.map((effet) => (
          <EclairDuMarteau
            key={effet.effectId}
            effet={effet}
            onTermine={(effectId) => setEclairsMarteau((current) => current.filter((autre) => autre.effectId !== effectId))}
          />
        ))}

        {/* Renvoi en main : l'eau se referme là où la créature se tenait. */}
        {tourbillonsEau.map((effet) => (
          <TourbillonEau
            key={effet.effectId}
            effet={effet}
            onTermine={(effectId) => setTourbillonsEau((current) => current.filter((autre) => autre.effectId !== effectId))}
          />
        ))}

        {/* Gel de masse : Verglas / Brume / Blizzard / Géant — tempête qui couvre le plateau. */}
        {gelMasseFx && (
          <RpgMassFreezeFx effet={gelMasseFx} />
        )}

        {/* Déchirement du sacrifice : la carte désignée se fend en deux
            moitiés à son emplacement, AVANT que la nouvelle créature ne soit
            posée à sa place (`dechirerEtPoser` enchaîne les deux temps). */}
        {sacrificeFx && (
          <div
            key={sacrificeFx.effectId}
            className={`rpg-card-tear-fx ${cardFrameClass(cardById(sacrificeFx.cardId))} ${cardMotifClass(cardById(sacrificeFx.cardId))}`}
            data-rpg-tear-id={sacrificeFx.entityId}
            data-sacrifice-fx="dechirement"
            role="status"
            aria-label={`${sacrificeFx.name} se déchire : sacrifice en cours.`}
            style={{
              ...cardFrameStyle(cardById(sacrificeFx.cardId)),
              left: `${sacrificeFx.left}px`,
              top: `${sacrificeFx.top}px`,
              width: `${sacrificeFx.width}px`,
              height: `${sacrificeFx.height}px`,
              '--rpg-fx-rotation': `${sacrificeFx.angle}rad`,
            }}
          >
            <span className="rpg-card-tear-fx__half rpg-card-tear-fx__half--gauche" aria-hidden="true">
              <img src={cardArt(sacrificeFx.cardId)} alt="" />
            </span>
            <span className="rpg-card-tear-fx__half rpg-card-tear-fx__half--droite" aria-hidden="true">
              <img src={cardArt(sacrificeFx.cardId)} alt="" />
            </span>
            <b aria-hidden="true">{sacrificeFx.name}</b>
          </div>
        )}

        {/* Cercle magique du sacrifice : runes et halo au pied de la créature
            sacrifiée, le temps de la déchirure. */}
        {sacrificeFx && (
          <CercleMagique
            effet={{
              entityId: sacrificeFx.entityId,
              effectId: sacrificeFx.effectId,
              left: sacrificeFx.left,
              top: sacrificeFx.top,
              width: sacrificeFx.width,
              height: sacrificeFx.height,
              angle: sacrificeFx.angle,
            }}
          />
        )}

        {duel.modeMana === RPG_MODE_MANA_ESSAI ? (
          <FluxManaTrack
            camp={duel.joueur}
            cote="joueur"
            carteApercu={cibleEnCours
              ? cardById(cibleEnCours)
              : confirmationSort
                ? cardById(confirmationSort.carteId)
                : apercuSurvol?.dansMain
                  ? cardById(apercuSurvol.carteId)
                  : null}
          />
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
                onMouseLeave={quitterCarteSurvol}
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
            onLeaveHoverCard={quitterCarteSurvol}
          />
          <CardPile count={nbDeckJoueur} label="Paquet" variant="deck" drawing={piochesJoueur.length > 0} drawToken={tokenPiocheJoueur} />
        </div>

        <div className={`rpg-wizard-plate rpg-wizard-plate--joueur${sortJoue?.cible.targetPlate === 'joueur' || annonceViseVotrePlate ? ' is-spell-target' : ''}${classeSoinPlaque(soinJoueur)}`} title="Vous"
          data-soin={soinJoueur ? soinJoueur.montant : undefined}
          data-tutorial-target={cibleTutoriel('player-health') ? 'player-health' : undefined}>
          <span className="rpg-wizard-plate__avatar rpg-wizard-plate__avatar--joueur" aria-hidden="true"><img src={cardArt('tin-hinan')} alt="" /></span>
          <span className="rpg-wizard-plate__profile-name">{nomJoueurAffiche}</span>
          <span className="rpg-wizard-plate__identity"><strong>{modePvp ? nomJoueurAffiche : 'VOUS'}</strong><small>{deckJoueurAffiche.name} · {deckColorGlyph(deckJoueurAffiche)} {deckColorLabel(deckJoueurAffiche)}</small></span>
          <PlaqueVie
            pv={duel.joueur.pv}
            pvMax={duel.joueur.pvMax}
            bouclier={duel.joueur.bouclier}
            soin={soinJoueur}
            base={RPG_PV_JOUEUR}
          />
          <WizardManaCounters mana={duel.joueur.mana} />
          <span className="rpg-wizard-plate__zones"><span className="rpg-wizard-plate__zone">Main · {duel.joueur.main.length}</span><span className="rpg-mobile-zones"><span className="rpg-wizard-plate__zone-sep"> · </span><span className="rpg-wizard-plate__zone">Paquet {nbDeckJoueur}</span><span className="rpg-wizard-plate__zone-sep"> · </span><span className="rpg-wizard-plate__zone">Cimetière {duel.joueur.cimetiere.length}</span></span></span>
          {soinJoueur && <EclatSoin key={soinJoueur.token} />}
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
                      data-tutorial-target={cibleTutoriel('confirm-attack') ? 'confirm-attack' : undefined}
                      data-key-hint="Espace"
                      data-attaque-totale={puissanceAttaquants > 0 ? puissanceAttaquants : undefined}
                      data-attaque-letale={menaceLetaleActive ? 'true' : undefined}
                      title={puissanceAttaquants > 0 ? `Puissance totale : ${puissanceAttaquants} ATQ${menaceLetaleActive ? ' (LÉTAL)' : ''} · Raccourci : Espace` : 'Raccourci clavier : Espace'}
                      disabled={!attaquants.length} onClick={() => lancerAttaque()}>
                      <CombatActionIcon type="confirm" /> Confirmer l’attaque ({attaquants.length})
                    </button>
                    <button type="button" className="rpg-btn rpg-btn--ghost rpg-btn--cancel-attack"
                      data-key-hint="Z"
                      title="Raccourci clavier : Z"
                      onClick={annulerAttaque}>
                      Annuler l’attaque
                    </button>
                  </>
                )}
                {combatEntrant && (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--attaque rpg-btn--resolve-combat"
                    data-tutorial-target={cibleTutoriel('resolve-combat') ? 'resolve-combat' : undefined}
                    data-key-hint="Espace"
                    onClick={resoudreCombat}
                    disabled={!repartitionValide || !blocageForceValide || !provocationValide}
                    title={!blocageForceValide
                      ? 'Blocage forcé : assignez chaque créature marquée à un attaquant qu’elle peut légalement bloquer'
                      : !provocationValide
                        ? 'Provocation : assignez au moins un bloqueur légal à chaque attaquant qui peut être bloqué'
                        : 'Raccourci clavier : Espace'}
                  >
                    {combatEntrant.coteAttaquant === 'joueur' ? '✓ Accepter les blocages' : '⚔ Résoudre le combat'}
                  </button>
                )}
                {cibleEnCours && !attenteSiteBimini && (
                  <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => {
                    // « Annuler la cible » n'annule que la **désignation** : une
                    // créature déjà posée reste en jeu, son arrivée ciblée
                    // renonce simplement à sa victime. Le bouton d'annulation
                    // de la dernière action, lui, défait la pose entière.
                    setCibleEnCours(null);
                    carteCibleeHandIndexRef.current = null;
                    if (duel.arriveeEnAttente?.cote === 'joueur') {
                      duel.arriveeEnAttente = null;
                      if (modePvp) void envoyerIntentionPvp({ type: 'renoncer-arrivee' });
                    }
                    force();
                  }}>
                    {duel.arriveeEnAttente?.cote === 'joueur' ? 'Renoncer à la cible' : 'Annuler la cible'}
                  </button>
                )}
                {duel.magieGratuite?.cote === 'joueur' && !cibleEnCours && (
                  <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => {
                    // Renoncer à la faveur du Kraken : l'attente se referme,
                    // la main redevient ordinaire.
                    duel.magieGratuite = null;
                    if (modePvp) void envoyerIntentionPvp({ type: 'renoncer-magie-gratuite' });
                    jouerSfx('annuler');
                    force();
                  }}>
                    Renoncer à la magie gratuite
                  </button>
                )}
                {sacrificeEnCours && (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--ghost rpg-btn--sacrifice-cancel"
                    onClick={() => {
                      setSacrificeEnCours(null);
                      jouerSfx('annuler');
                      force();
                    }}
                  >
                    Renoncer
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
                {defausseOuverte && selectionDefausseValide && (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--primary rpg-btn--discard-confirm"
                    onClick={confirmerDefausse}
                    aria-label={`Valider la défausse de ${cardById(carteDefausseSelectionnee.carteId)?.name ?? 'la carte sélectionnée'}`}
                  >
                    ✓ Valider la défausse
                  </button>
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
                  data-tutorial-target={cibleTutoriel('pass-annonce') ? 'pass-annonce' : undefined}
                  aria-label={`Laisser passer ${carteAnnoncee?.name ?? 'la carte annoncée'}`}
                  disabled={Boolean(tutorielActif && etapeTutoriel && etapeTutoriel.on !== 'annonce-passee')}
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
            data-tutorial-target={cibleTutoriel('spell-announcement') ? 'spell-announcement' : undefined}
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
                      data-tutorial-target={cibleTutoriel('respond-annonce') ? 'respond-annonce' : undefined}
                      aria-label={`Répondre à ${carteAnnoncee?.name ?? 'la carte annoncée'} avec une magie rapide`}
                      disabled={Boolean(tutorielActif && etapeTutoriel?.on === 'annonce-passee')}
                      onClick={repondreAAnnonce}
                    >
                      <span aria-hidden="true">✦</span>
                      <span>Répondre</span>
                    </button>
                    <button
                      type="button"
                      className="rpg-btn rpg-annonce-sort__pass"
                      data-tutorial-target={cibleTutoriel('pass-annonce') ? 'pass-annonce' : undefined}
                      aria-label={`Laisser passer ${carteAnnoncee?.name ?? 'la carte annoncée'}`}
                      disabled={Boolean(tutorielActif && etapeTutoriel && etapeTutoriel.on !== 'annonce-passee')}
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
                    data-tutorial-target={cibleTutoriel('attack-all') ? 'attack-all' : undefined}
                    data-key-hint={attaqueJouee ? undefined : 'A'}
                    data-attaque-totale={!attaqueJouee && puissancePrets > 0 ? puissancePrets : undefined}
                    title={attaqueJouee ? undefined : `Puissance prête : ${puissancePrets} ATQ · Raccourci : A`}
                    disabled={!monTour || attaqueJouee || !prets.length || Boolean(combatEntrant) || Boolean(sacrificeEnCours) || defausseOuverte}
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
                data-key-hint="Z"
                title="Raccourci clavier : Z ou Ctrl+Z"
                onClick={annulerDerniereAction}
              >
                ↶ Annuler la dernière action
              </button>
            )}
            <button type="button" className="rpg-btn rpg-btn--endturn"
              data-tutorial-target={cibleTutoriel('end-turn') ? 'end-turn' : undefined}
              data-key-hint="Espace"
              title="Raccourci clavier : Espace"
              onClick={finDuTour}
              disabled={!monTour || phase || Boolean(cibleEnCours) || Boolean(combatEntrant) || Boolean(sacrificeEnCours) || mulliganOuvert || choixManaEssaiOuvert}>
              ⧗ Fin du tour
            </button>
          </div>
        </div>

        <div
          className={`rpg-hand-dock${combatEntrant || fenetreSort || fenetreFinTour ? ' is-open' : ''}`}
          aria-label="Votre main"
          inert={apercuAnnonceOuvert ? true : undefined}
          data-tutorial-target={cibleTutoriel('hand') ? 'hand' : undefined}
        >
          <div className="rpg-hand" style={{ '--hand-count': Math.max(1, groupesMain.length) }}>
            {groupesMain.map((groupe, position) => {
              const carteId = groupe.carteId;
              const i = groupe.indices[0];
              const exemplaires = groupe.indices.length;
              const carte = cardById(carteId);
              if (!carte) return null;
              const defausseSelectionnee = defausseOuverte
                && selectionDefausseValide
                && carteDefausseSelectionnee.carteId === carteId
                && groupe.indices.includes(carteDefausseSelectionnee.handIndex);
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
                  aria-pressed={defausseOuverte ? defausseSelectionnee : poseEnCours?.carteId === carteId && groupe.indices.includes(poseEnCours.handIndex) ? true : undefined}
                  onMouseEnter={(event) => afficherApercuSurvol(carte, event)}
                  onMouseLeave={quitterCarteSurvol}
                  onFocus={(event) => afficherApercuSurvol(carte, event)}
                  onBlur={masquerApercuSurvol}
                  onDragStart={(event) => commencerGlisserCarte(event, carte)}
                  onDragEnd={terminerGlisserCarte}
                  className={[
                    'rpg-hand__card rpg-hand__card--img',
                    // Renvoyée en main : sa place est gardée, mais elle ne
                    // reparaît qu'une fois le tourbillon refermé.
                    cartesEnRenvoi.has(carteId) ? 'is-en-renvoi' : '',
                    estTerrain ? 'rpg-hand__card--terrain' : '',
                    `rpg-hand__card--type-${cardFrameType(carte)}`,
                    `rpg-hand__card--elem-${carte.element}`,
                    familleSort ? `rpg-hand__card--famille-${familleSort}` : '',
                    cardFrameClass(carte),
                    cardMotifClass(carte),
                    piocheEnCours ? 'rpg-hand-card--drawing' : '',
                    defausseSelectionnee ? 'is-discard-selected' : '',
                    carte.instant ? 'is-instant' : '',
                    cibleEnCours === carteId ? 'is-targeting' : '',
                    // En attente de sa case : même soulèvement que le ciblage.
                    poseEnCours?.carteId === carteId && groupe.indices.includes(poseEnCours.handIndex) ? 'is-targeting is-pose-en-cours' : '',
                    jouable ? 'is-playable' : 'is-unplayable',
                    carteGlissee === carteId ? 'is-dragging' : '',
                    enVol ? `rpg-card-flight is-flying${estTerrain ? ' rpg-card-flight--terrain' : ''}` : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    '--hand-fan': eventail,
                    '--hand-fan-arc': eventail * eventail,
                    ...cardFrameStyle(carte),
                    ...(piocheEnCours ? { '--rpg-draw-delay': `${piocheEnCours.delay}ms` } : {}),
                    ...styleVol,
                  }}
                  data-draw-token={piocheEnCours?.token}
                  data-card-id={carteId}
                  data-hand-index={i}
                  data-hand-key={position < 5 ? String(position + 1) : undefined}
                  data-tutorial-target={tutorielActif && etapeTutorielId === 'terrain' && carteId === 'desert'
                    ? 'terrain-card'
                    : tutorielActif && etapeTutorielId === 'creature' && carteId === 'tislit-des-aures'
                      ? 'creature-card'
                      : undefined}
                  data-pile-count={exemplaires}
                  data-rpg-card-flight={enVol ? (estTerrain ? 'terrain' : 'creature') : undefined}
                  data-rpg-flight-card-id={enVol ? carteId : undefined}
                  data-jouable={jouable ? 'true' : 'false'}
                  data-pose-en-cours={poseEnCours?.carteId === carteId && groupe.indices.includes(poseEnCours.handIndex) ? 'true' : undefined}
                  aria-label={`${carte.name}${exemplaires > 1 ? ` — pile de ${exemplaires} exemplaires identiques` : ''} — ${cardFaceTypeLine(carte)} — couleur ${cardColorLabel(carte)}${estTerrain ? '' : ` — coût ${cardCostLabel(carte)}`}${carte.text ? ` — ${carte.text}` : ''} — cliquer pour ${defausseOuverte ? 'défausser cette carte' : carte.kind === 'magie' ? 'demander le lancement du sort' : cartePrendUneCase(carte) && duel.modeMana === RPG_MODE_MANA_ESSAI ? 'choisir son emplacement sur le champ' : 'la jouer'}${defausseOuverte ? '' : jouable ? ', paiement automatique (ou glisser-déposer sur une case)' : ', indisponible pour le moment'}`}
                >
                  <img className="rpg-hand__img" src={cardArt(carte)} alt="" aria-hidden="true" />
                  <CardElementBadge carte={carte} />
                  <span className="rpg-hand__title">
                    <ManaCost carte={carte} showElement={false} />
                  </span>
                  <IconesCarte carte={carte} className="rpg-card-icones--colonne rpg-card-icones--main" />
                  {familleSort && <SortSceau carte={carte} className="rpg-hand__sceau rpg-hand__sort" />}
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
                  {/* Une magie n'a pas de corps : sa face en main ne porte
                      AUCUNE plaque de statistiques, pas même le chiffre de son
                      effet (-2/-2 de la Lame de mer, -1/-2 du Haut-fond). Le
                      nombre vit dans la règle imprimée, l'aperçu au survol et
                      le sceau de famille — pas sur la carte. */}
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

        {presentationCarte && (
          <div className="rpg-auto-preview" aria-live="polite">
            <HoverCardPreview
              carte={cardById(presentationCarte.carteId)}
              variante="fiche"
              surface="EFFET ACTIVÉ"
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            />
          </div>
        )}
        {apercuSurvol && !mulligan && !apercuAnnonceOuvert && (
          <HoverCardPreview
            carte={cardById(apercuSurvol.carteId)}
            armes={cartesDesIds(apercuSurvol.armesIds)}
            furieDeclenchee={Boolean(apercuSurvol.furie)}
            statsFurie={apercuSurvol.furie}
            effetsEpuises={apercuSurvol.effetsEpuises ?? []}
            style={apercuSurvol.style}
            panelRef={panelRef}
            interactif={Boolean(apercuSurvol.interactif)}
            onPointerEnter={entrerApercuSurvol}
            onPointerLeave={sortirApercuSurvol}
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
              {modePvp
                ? (vainqueur === 'joueur' ? 'Victoire !' : vainqueur === 'sorcier' ? 'Défaite' : 'Match nul')
                : etageHistoire
                  ? vainqueur === 'joueur' ? 'Étage déblayé !' : 'L’étage vous repousse…'
                  : vainqueur === 'joueur' ? 'Le sorcier s’effondre !' : vainqueur === 'sorcier' ? 'Vous êtes tombé…' : 'Double chute…'}
            </h2>
            <p>
              {modePvp
                ? (() => {
                  const motif = pvp?.finRaison ?? duel.fin?.raison ?? null;
                  if (motif === 'abandon') {
                    return vainqueur === 'joueur'
                      ? `${nomSorcierAdverse} a abandonné le duel.`
                      : 'Vous avez abandonné le duel.';
                  }
                  if (motif === 'temps') {
                    return vainqueur === 'joueur'
                      ? `${nomSorcierAdverse} a dépassé le temps imparti.`
                      : 'Le temps imparti est écoulé.';
                  }
                  return vainqueur === 'joueur'
                    ? `${nomSorcierAdverse} n’a plus de points de vie. Le duel est à vous.`
                    : vainqueur === 'sorcier'
                      ? `${nomSorcierAdverse} remporte le duel.`
                      : 'Les deux camps tombent au même instant.';
                })()
                : etageHistoire
                  ? vainqueur === 'joueur'
                    ? `${etageHistoire.nom} ne tient plus son palier. La suite de la tour vous attend.`
                    : `${etageHistoire.nom} vous attend au même étage : chaque duel repart à zéro.`
                  : vainqueur === 'joueur'
                      ? 'Bab El respire : le cycle tient encore un soir.'
                      : 'Le sable recouvre votre Nom. L’Astrolabe sonne pour quelqu’un d’autre.'}
            </p>
            {/* Ce que la victoire vient de payer : le gain de l'étage (ou du
                duel libre), et le butin de la tour quand cette victoire l'a
                terminée. L'annonce ne vit que pour la session en cours —
                « Rejouer » l'emporte avec l'ancien duel. */}
            {!modePvp && vainqueur === 'joueur' && annonceGain && annonceGain.session === sessionDuelRef.current && (
              <p className="rpg-overlay__gains" role="status" data-victoire-gain={annonceGain.gain} data-victoire-butin={annonceGain.butin} data-victoire-xp={annonceGain.xp ?? 0} data-victoire-niveaux={annonceGain.niveaux ?? 0}>
                <span className="rpg-overlay__gain">
                  <RpgCreditIcon />
                  +{creditsLisible(annonceGain.gain - annonceGain.butin)} crédits — {annonceGain.libre
                    ? 'duel libre gagné'
                    : annonceGain.premiere ? 'premier déblayage de l’étage' : 'étage rejoué'}
                </span>
                {/* La barre d'XP monte avec les crédits : la victoire dit les
                    deux, et annonce le palier quand il vient de sonner — le
                    paquet offert s'ouvre par-dessus la table. */}
                {annonceGain.xp > 0 && (
                  <span className="rpg-overlay__gain rpg-overlay__gain--xp" data-victoire-xp-ligne>
                    ✦ +{xpLisible(annonceGain.xp)} XP
                    {annonceGain.niveaux > 0 && ` — niveau ${barreXp.niveau} atteint, un paquet s’ouvre !`}
                  </span>
                )}
                {annonceGain.butin > 0 && (
                  <span className="rpg-overlay__gain rpg-overlay__gain--butin">
                    <RpgCreditIcon anime />
                    +{creditsLisible(annonceGain.butin)} crédits — butin de la tour terminée !
                  </span>
                )}
              </p>
            )}
            {modePvp ? (
              <div className="rpg-overlay__actions">
                <button type="button" className="rpg-btn rpg-btn--primary" onClick={() => pvp?.onQuitter?.()}>
                  Retour au salon
                </button>
              </div>
            ) : etageHistoire ? (
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
                <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => setEcran(campagneDuelRef.current ? 'histoire' : 'tours')}>
                  {vainqueur === 'joueur' && !etageSuivant ? 'Tour terminée — retour aux tours' : 'Retour aux tours'}
                </button>
              </div>
            ) : (
              <button type="button" className="rpg-btn rpg-btn--primary" onClick={() => nouvellePartie(duel.modeMana === RPG_MODE_MANA_ESSAI ? { etageId: null, essaiManaId: duel.essaiDeckId } : {})}>
                {'Nouvelle partie'}
              </button>
            )}
          </div>
        )}
      </div>
      {sacrificeDemande && !viewport.portrait && (
        <div className="rpg-sacrifice-choix" role="dialog" aria-modal="true" aria-labelledby="rpg-sacrifice-titre" aria-describedby="rpg-sacrifice-texte">
          <div className="rpg-sacrifice-choix__panel">
            <p className="rpg-sacrifice-choix__eyebrow">Plateau plein · {duel.joueur.creatures.length}/{RPG_MANA_ESSAI_CHAMP_MAX} créatures</p>
            <h2 id="rpg-sacrifice-titre">Sacrifier une créature ?</h2>
            <p id="rpg-sacrifice-texte">
              Vos {RPG_MANA_ESSAI_CHAMP_MAX} emplacements sont occupés. Pour poser{' '}
              <strong>{cardById(sacrificeDemande.carteId)?.name ?? 'cette créature'}</strong>, une de vos
              créatures doit être sacrifiée : vous choisirez laquelle sur la table, et sa carte se
              déchirera avant que la nouvelle ne prenne sa place.
            </p>
            <div className="rpg-sacrifice-choix__actions">
              <button
                type="button"
                autoFocus
                className="rpg-btn rpg-btn--primary rpg-sacrifice-choix__sacrifier"
                onClick={confirmerSacrifice}
                aria-label="Sacrifier : choisir une créature à sacrifier sur la table"
              >
                ✂ Sacrifier
              </button>
              <button
                type="button"
                className="rpg-btn rpg-btn--ghost rpg-sacrifice-choix__annuler"
                onClick={annulerSacrifice}
                aria-label="Annuler : garder la carte en main sans rien sacrifier"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {choixManaEssaiOuvert && !viewport.portrait && (
        <div className="rpg-flux-choix" role="dialog" aria-modal="false" aria-labelledby="rpg-flux-choix-titre">
          <div className="rpg-flux-choix__panel">
            <h2 id="rpg-flux-choix-titre" className="rpg-flux-choix__titre">Choisis ton mana</h2>
            <div className="rpg-flux-choix__options">
              {duel.joueur.couleurs.map((couleur, index) => {
                const acquis = duel.joueur.manaMax?.[couleur] ?? 0;
                const enMain = (duel.joueur.main ?? []).filter((cid) => cardCostColors(cardById(cid)).includes(couleur)).length;
                return (
                  <button
                    key={couleur}
                    type="button"
                    autoFocus={index === 0}
                    className={`rpg-flux-choix__option rpg-flux-choix__option--${couleur}`}
                    data-mana-acquis={acquis}
                    data-mana-en-main={enMain}
                    data-key-shortcut={String(index + 1)}
                    title={`Choisir ${couleurLabel(couleur)} (raccourci : ${index + 1})`}
                    onClick={() => choisirNouveauManaEssai(couleur)}
                    aria-label={`Choisir le mana ${couleurLabel(couleur)} (${acquis} déjà acquis, ${enMain} carte${enMain > 1 ? 's' : ''} en main)`}
                  >
                    <span aria-hidden="true"><ElementEmblem element={couleur} /></span>
                    <small className="rpg-flux-choix__count" aria-hidden="true" title={`${acquis} source(s) acquise(s)`}>{acquis}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {recompenseTutoriel && (
        <div className="rpg-tutorial-reward-toast" role="status" aria-live="polite" key={recompenseTutoriel.token}>
          <RpgCreditIcon />
          <strong>Leçon terminée</strong>
          <span>+{recompenseTutoriel.gain} crédits</span>
        </div>
      )}
      {/* Un niveau peut sonner en plein duel — une carte posée suffit. La
          cérémonie passe au-dessus de la table et de sa navigation, et le duel,
          lui, n'a aucune contrainte de temps : rien n'est perdu pendant qu'elle
          se joue. */}
      <MonteeDeNiveau
        montee={monteeNiveau}
        profil={profilJoueur}
        cardArt={cardArt}
        onFermer={fermerMonteeNiveau}
        onPlaySfx={jouerSfx}
      />
      {tutorielActif && etapeTutoriel && !viewport.portrait && !mulliganOuvert && (
        <RpgTutorialOverlay
          key={etapeTutoriel.id}
          step={etapeTutoriel}
          stepIndex={indexEtapeTutoriel}
          totalSteps={etapesTutoriel.length}
          tutorialName={tutorielCourant?.name ?? 'LE SABLIER · TUTORIEL'}
          reward={tutorielCourant?.reward ?? 0}
          rewardClaimed={Boolean(portefeuilleSouk?.tutoriels?.includes(tutorielCourant?.id))}
          onNext={continuerTutoriel}
          onFinish={terminerTutoriel}
          onClose={fermerTutoriel}
        />
      )}
      {apercuAppui && <ApercuCarteAppuiLong carte={cardById(apercuAppui)} armes={cartesDesIds(apercuAppuiArmes)} furieDeclenchee={Boolean(apercuAppuiFurie)} statsFurie={apercuAppuiFurie} effetsEpuises={apercuAppuiEffetsEpuises} onFermer={fermerApercuAppui} />}
      {/* La même fiche que le catalogue : le clic droit l'ouvre sur la table,
          en main, sur les terrains ou sur une pile — sans rien jouer. */}
      {apercuCatalogue && (
        <ApercuCarteCatalogue
          carte={cardById(apercuCatalogue)}
          armes={cartesDesIds(apercuCatalogueArmes)}
          prisonniere={apercuCataloguePrisonniere ? cardById(apercuCataloguePrisonniere) : null}
          furieDeclenchee={Boolean(apercuCatalogueFurie)}
          statsFurie={apercuCatalogueFurie}
          effetsEpuises={apercuCatalogueEffetsEpuises}
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
          essaiMana={duel.modeMana === RPG_MODE_MANA_ESSAI}
          onBasculer={basculerCarteMulligan}
          onValider={validerMulligan}
          onAnnulerSelection={viderSelectionMulligan}
          onContinuer={terminerMulligan}
        />
      )}
    </div>
  );
}
