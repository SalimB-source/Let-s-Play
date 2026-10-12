/**
 * Le Sablier — duel de cartes tactique.
 * Les tours gardent leur liberté d'une partie de cartes à collectionner :
 * poser un terrain, lancer des sorts, déclarer ses attaquants, puis défendre
 * pendant la fenêtre de réponse de l'adversaire.
 */

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './rpg-battle.css';
import './rpg-mobile.css';
import './rpg-story.css';
import './rpg-deckbox.css';
import { createRpgLandscapeSession } from './rpgLandscape.js';
import {
  plateauDeRepli,
  plateauParId,
  tirerPlateauDuDuel,
} from './rpgPlateaux.js';
import { groupTerrainStacks } from './rpgTerrainStacks.js';
import { groupCartesMain, groupEntitesParCarte } from './rpgCardStacks.js';
import { startRpgLongPress } from './rpgLongPress.js';
import { startRpgTouchDrag } from './rpgTouchDrag.js';
import {
  chargerProgressionHistoire,
  etageEstDebloque,
  etageEstVaincu,
  marquerEtageVaincu,
  progressionHistoireVide,
  reinitialiserProgressionHistoire,
  resumeTourHistoire,
  sauverProgressionHistoire,
} from './rpgStory.js';
import {
  deckHistoire,
  etageHistoireParId,
  prochainEtage,
  RPG_STORY_TOURS,
  tourHistoireParId,
} from './rpgStoryTours.js';
import { RpgAmbientMusic } from './rpgAmbientMusic.js';
import { RpgAudioPlayer } from './rpgAudio.js';
import RpgDeckAtelier from './RpgDeckAtelier.jsx';
import { useDecksSablier } from './useDecksSablier.js';
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
  rpgCibleAuto,
  rpgChoisirAttaquants,
  rpgContreJouable,
  rpgChoisirBloqueurs,
  rpgCiblesAttaqueRapide,
  rpgEngagerTerrain,
  rpgFermerFenetreReponse,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgLancerMagie,
  rpgNouveauDuel,
  rpgNombreDestructions,
  rpgDestructionsDepuis,
  rpgOuvrirFenetreReponse,
  rpgEstProtegee,
  rpgPeutBloquerAttaquant,
  rpgPeutPayer,
  rpgPoserTerrain,
  rpgSorcierAnnonceSuivante,
  rpgSorcierPrepareTerrain,
  rpgSorcierResoudreAnnonce,
  rpgVainqueur,
} from './rpgDuel.js';
import {
  cardRarityInfo,
  cardFrameColor,
  cardFrameInfo,
  cardHasMythicFrame,
  cardHasShinyFrame,
  cardColorCost,
  cardColors,
  terrainManaColors,
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_SORCIER_BASE,
  RPG_DECKS,
  RPG_DUEL_CARDS,
  cardArtId,
  cardById,
  cardTypeLine,
  rpgValiderDeck,
} from './rpgCards.js';

const TILTS = [-2.4, 1.7, -1.2, 2.3, -1.8, 1.1];
const ELEMENT_GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', hybride: '🔥⏳' };
const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', hybride: 'Sable + Braise' };
const FILTRE_COULEUR_LABELS = { toutes: 'Toutes', sable: 'Sable', braise: 'Braise', eau: 'Eau', neige: 'Neige', hybride: 'Hybride' };
const CARD_ART_CACHE_VERSIONS = {
  'djinn-du-souk': 'munch-impressionniste-v3',
  'ifrit-al-ahmar': 'sourire-tempete-huile-v1',
  feriel: 'lance-de-feu-photoreal-v1',
  'trait-de-braise': 'trait-feu-sorcier-appeure-v1',
  'anqa-des-braises': 'anqa-des-braises-huile-v1',
  salem: 'full-art-huile-realiste-v2',
  yamina: 'full-art-huile-realiste-v2',
  tarek: 'full-art-huile-realiste-v2',
  boualem: 'full-art-citerne-protectrice-v1',
  'brisure-de-verre': 'plein-art-verre-v1',
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

function describeAnnouncedMagicTarget(carte, cibleId, duel, sorcierArtId) {
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
  if (effet.cible === 'creature-amie') return { nom: 'Une créature du sorcier', illustrationId: sorcierArtId };
  if (effet.type === 'soin' || effet.type === 'pioche' || carte.cibles?.includes('soi')) {
    return { nom: 'Le sorcier', illustrationId: sorcierArtId };
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

function ManaCost({ carte, compact = false, showElement = true }) {
  if (!carte || carte.kind === 'terrain') return null;
  const colors = cardColors(carte);
  const hybrid = colors.length > 1;
  return (
    <span
      className={`rpg-mana-cost rpg-mana-cost--${hybrid ? 'hybride' : carte.element}${compact ? ' is-compact' : ''}`}
      aria-label={`Coût : ${cardCostLabel(carte)}`}
    >
      <b>{carte.cost}</b>
      {!hybrid && showElement && <i aria-hidden="true">{ELEMENT_GLYPHS[carte.element] ?? '◇'}</i>}
    </span>
  );
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

const RPG_PHASE_STEPS = [
  { id: 'principal', label: 'Principal' },
  { id: 'combat', label: 'Combat' },
  { id: 'reponse', label: 'Réponse' },
  { id: 'adverse', label: 'Adverse' },
  { id: 'termine', label: 'Fin' },
];

function PhaseGlyph({ phase }) {
  const drawing = phase === 'principal' ? (
    <>
      <rect x="6" y="3.5" width="12" height="15" rx="1.5" />
      <path d="M9 8h6M9 11h6M9 14h4M4 7v13a1 1 0 0 0 1 1h11" />
    </>
  ) : phase === 'combat' ? (
    <>
      <path d="m5 19 13-13M14.5 4.5l5 5M4 16l4 4M8 14l2 2" />
      <path d="m4 5 4 4M5 4 4 8m0 0 4-1" />
    </>
  ) : phase === 'reponse' ? (
    <>
      <path d="m12 3 7 3v5c0 4-2.7 7.3-7 10-4.3-2.7-7-6-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ) : phase === 'adverse' ? (
    <>
      <path d="M19 8a7 7 0 0 0-12-2L5 8" />
      <path d="M5 4v4h4M5 16a7 7 0 0 0 12 2l2-2M19 20v-4h-4" />
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

function PhaseTrack({ current }) {
  return (
    <ol className="rpg-phase-track" aria-label="Phases du duel">
      {RPG_PHASE_STEPS.map((step) => {
        const active = current === step.id;
        const title = active ? `${step.label} · phase actuelle` : step.label;
        return (
          <li
            key={step.id}
            className={`rpg-phase-step${active ? ' is-active' : ''}`}
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

function cardFaceTypeLine(carte) {
  return cardTypeLine(carte).replace(/^Créature(?: légendaire)?(?=\s|$)/u, 'Type');
}

function cardFrameType(carte) {
  if (carte?.kind === 'terrain') return 'terrain';
  if (carte?.kind === 'magie') return 'magie';
  return 'creature';
}

/** La rareté ne colore plus rien : elle ne sert qu'au badge de l'aperçu. */
function cardRarityStyle(carte) {
  const { color } = cardRarityInfo(carte);
  return { '--rarity-color': color };
}

/**
 * Le cadre suit la couleur de la carte : bleu (Eau), blanc (Sable), rouge
 * (Braise). Une carte bicolore ajoute le dégradé de sa combinaison, une carte
 * mythique le dégradé doré — les deux sont des cadres brillants.
 */
function cardFrameClass(carte) {
  const classes = [`rpg-card--frame-${cardFrameInfo(carte).key}`];
  if (cardHasShinyFrame(carte)) classes.push('rpg-card--frame-brillant');
  if (cardHasMythicFrame(carte)) classes.push('rpg-card--mythique');
  return classes.join(' ');
}

function cardFrameStyle(carte) {
  return { '--rpg-frame-color': cardFrameColor(carte) };
}

function deckStats(deck) {
  return deck.cardIds.reduce((stats, id) => {
    const carte = cardById(id);
    if (!carte) return stats;
    if (carte.kind === 'terrain') stats.terrains += 1;
    else if (carte.kind === 'magie') stats.magies += 1;
    else stats.creatures += 1;
    return stats;
  }, { terrains: 0, creatures: 0, magies: 0 });
}

function deckCardList(deck) {
  const counts = new Map();
  deck.cardIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  return [...counts.entries()].map(([id, count]) => ({ carte: cardById(id), count })).filter((entry) => entry.carte);
}

function targetMode(carte) {
  if (carte?.arrivee?.type === 'combat' && carte.arrivee.cible === 'creature') return 'ennemi';
  if (carte?.effet?.type === 'degats' && carte.effet.cible === 'creature') return 'ennemi';
  // Renvoi en main : le joueur choisit la créature qui repart dans une main.
  if (carte?.effet?.type === 'retour-main') return carte.effet.cible === 'creature-amie' ? 'allie' : 'ennemi';
  if (carte?.effet?.type === 'bouclier' && carte.effet.cible === 'creature-amie') return 'allie';
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
              className={`rpg-card-pile__card rpg-card-pile__card--top ${cardFrameClass(carteDuDessus)}`}
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

function TableCard({
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
  onHoverCard,
  onLeaveHoverCard,
}) {
  const carte = cardById(entite.carteId);
  const nom = entite.name;
  const protectionActive = entite.protection?.toursRestants > 0;
  const protectionLabel = protectionActive
    ? ELEMENT_LABELS[entite.protection.contre] ?? entite.protection.contre
    : null;
  const blessee = entite.pv < (entite.pvMax ?? carte?.def ?? entite.pv);
  const malInvocation = cote === 'joueur' && playerTurn && !entite.ready && !entite.attaquee;
  const [blockDropHover, setBlockDropHover] = useState(false);
  const [entreeEnCours, setEntreeEnCours] = useState(true);

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

  return (
    <button
      type="button"
      className={[
        `rpg-card rpg-card--img rpg-card--elem-${carte?.element ?? 'sable'} rpg-card--type-${cardFrameType(carte)}`,
        cote === 'ennemi' ? 'rpg-card--ennemi' : 'rpg-card--equipe',
        cardFrameClass(carte),
        carte?.kind === 'hero' ? 'rpg-card--legendaire' : '',
        active ? 'is-active' : '',
        selected ? 'is-selected' : '',
        selectedBlocker ? 'is-blocker-selected' : '',
        blocking ? 'is-blocking' : '',
        entite.attaquee ? 'is-attacked' : '',
        declaredAttacker && !entite.attaquee ? 'is-declared-attacker' : '',
        entite.ready && !entite.attaquee ? 'is-pret' : '',
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
      draggable={canDragBlocker}
      onClick={onClick}
      onMouseEnter={(event) => onHoverCard?.(carte, event)}
      onMouseLeave={onLeaveHoverCard}
      onFocus={(event) => onHoverCard?.(carte, event)}
      onBlur={onLeaveHoverCard}
      onDragStart={commencerGlisserBloqueur}
      onDragEnd={() => onEndBlockerDrag?.(entite.id)}
      onDragOver={survolerCibleBlocage}
      onDragLeave={quitterCibleBlocage}
      onDrop={deposerBloqueur}
      aria-label={`${nom}, ${cardFaceTypeLine(carte)}, couleur ${carte?.element ?? 'inconnue'}, coût ${carte?.cost ?? 0}, attaque ${entite.atk}, défense ${entite.pv}${actionFx?.statsUp ? ', attaque ou défense augmentée' : ''}${entite.rapidite ? ', rapidité, peut attaquer le tour où elle arrive' : ''}${entite.envol ? ', envol, ne peut être bloquée que par une créature avec envol' : ''}${protectionActive ? `, protection contre ${protectionLabel} pendant encore ${entite.protection.toursRestants} tour${entite.protection.toursRestants > 1 ? 's' : ''}` : ''}${entite.esquive ? `, esquive ${entite.esquive} contre les attaques et magies` : ''}${entite.attaquee ? `, engagée, elle se dégagera au début du prochain tour ${cote === 'ennemi' ? 'du sorcier' : 'du joueur'}` : ''}${blessee ? ', blessée' : ''}${malInvocation ? ', mal d’invocation' : ''}${entite.bouclier ? `, bouclier ${entite.bouclier}` : ''}${blocking ? ', bloqueur assigné, flèche jaune vers son attaquant' : ''}${canDragBlocker ? ', bloqueur disponible, glisser sur une créature attaquante' : ''}${selectedBlocker ? ', bloqueur sélectionné, cliquez une créature attaquante pour lui assigner le blocage' : ''}${coupRapideCible ? ', ciblée par Coup rapide' : ''}`}
      aria-pressed={Boolean(selected || selectedBlocker)}
    >
      <img className="rpg-card__img" src={cardArt(carte)} alt="" aria-hidden="true" />
      {entite.attaquee && <span className="rpg-card__engagee" aria-hidden="true">engagée</span>}
      {blessee && <span className="rpg-card__blood" aria-hidden="true" />}
      <CardElementBadge carte={carte} />
      <header className="rpg-card__title">
        <ManaCost carte={carte} compact showElement={false} />
      </header>
        <footer className="rpg-card__foot" aria-label={`Attaque ${entite.atk}, défense ${entite.pv}${blessee ? ', blessée' : ''}`}>
          <span className="rpg-card__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{entite.atk}</span></span>
          <span className={`rpg-card__pt${blessee ? ' is-wounded' : ''}`}><CardStatIcon type="defense" /><span className="rpg-stat-value">{entite.pv}</span></span>
        </footer>
        {actionFx && (
          <span key={actionFx.token} className={`rpg-card__action-fx rpg-card__action-fx--${actionFx.type}`} aria-hidden="true">
            {actionFx.type === 'block' ? 'BLOCAGE'
              : actionFx.type === 'unblock' ? 'RETIRÉ'
                : actionFx.type === 'hit' ? 'IMPACT'
                  : actionFx.type === 'attack' ? 'ATTAQUE' : 'RENFORCÉ'}
          </span>
        )}
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

function HoverCardPreview({ carte, style = null, spellPlayed = false, variante = '', cible = null }) {
  if (!carte) return null;
  const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
  const estTerrain = carte.kind === 'terrain';
  const effet = carte.text && carte.text !== '—' ? carte.text : null;
  const effets = cardEffectLines(effet);
  const cibleAnnoncee = variante === 'annonce' ? cible : null;
  const cibleLabel = cibleAnnoncee?.nom ? `, cible ${cibleAnnoncee.nom}` : '';
  return (
    <aside
      className={`rpg-hover-card-preview${variante ? ` rpg-hover-card-preview--${variante}` : ''} rpg-hover-card-preview--${carte.element} rpg-hover-card-preview--type-${cardFrameType(carte)} ${cardFrameClass(carte)}${estTerrain ? ' rpg-hover-card-preview--terrain' : ''}${spellPlayed ? ' is-spell-preview' : ''}`}
      role={variante === 'annonce' ? 'group' : 'tooltip'}
      aria-label={`Aperçu de ${carte.name} : ${cardFaceTypeLine(carte)}${estTerrain ? '' : `, coût ${cardCostLabel(carte)}`}${effet ? `, effet ${effet}` : ''}${estCreature ? `, attaque ${carte.atk}, défense ${carte.def}` : ''}${cibleLabel}`}
      style={{ ...style, ...cardFrameStyle(carte) }}
    >
      <div
        className={`rpg-hover-card-preview__face ${cardFrameClass(carte)}`}
        style={cardFrameStyle(carte)}
        aria-hidden="true"
      >
        <img src={cardArt(carte)} alt="" />
        <CardElementBadge carte={carte} />
      </div>
      <div className="rpg-hover-card-preview__details">
        {variante === 'annonce' && <span className="rpg-hover-card-preview__eyebrow">CARTE ANNONCÉE</span>}
        {variante === 'annonce' && <strong className="rpg-hover-card-preview__name">{carte.name}</strong>}
        <p className="rpg-hover-card-preview__type">{cardFaceTypeLine(carte)}</p>
        {cibleAnnoncee && (
          <div className="rpg-spell-played__target rpg-hover-card-preview__target">
            {cibleAnnoncee.illustrationId
              ? <img src={cardArt(cibleAnnoncee.illustrationId)} alt="" />
              : <span className="rpg-spell-played__target-mark" aria-hidden="true">⌖</span>}
            <span><small>CIBLE</small><b>{cibleAnnoncee.nom}</b></span>
          </div>
        )}
        {!estTerrain && <p className="rpg-hover-card-preview__cost"><span>Coût</span><b>{carte.cost}</b>{cardColors(carte).length > 1 && <small>{cardColorCostLabel(carte)}</small>}</p>}
        {effet && (
          <div className="rpg-hover-card-preview__rules" aria-label="Effets">
            {effets.map((ligne, index) => <span key={`${index}-${ligne}`}>{ligne}</span>)}
          </div>
        )}
        {estCreature && <p className="rpg-hover-card-preview__stats">⚔ {carte.atk} <span>·</span> 🛡 {carte.def}</p>}
      </div>
    </aside>
  );
}

/** L'aperçu au doigt : une seconde d'appui sur une carte ouvre le même contenu
 * que le survol de la souris, posé sur un volet sombre qui l'isole du plateau.
 * N'importe quel toucher — le volet ou le bouton — le referme. L'appui long ne
 * joue jamais la carte : c'est une consultation, pas une action. */
function ApercuCarteAppuiLong({ carte, onFermer }) {
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
        <HoverCardPreview carte={carte} variante="appui-long" />
      </div>
      <button type="button" autoFocus className="rpg-btn rpg-btn--ghost rpg-card-peek__close" onClick={onFermer}>
        Fermer l’aperçu
      </button>
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
  return (
    <section
      className="rpg-spell-played"
      role="status"
      aria-label={`Magie jouée : ${carte.name}. Cible : ${annonce.cible.nom}.`}
    >
      <img
        className={`rpg-spell-played__art ${cardFrameClass(carte)}`}
        style={cardFrameStyle(carte)}
        src={cardArt(carte)}
        alt=""
      />
      <div className="rpg-spell-played__details">
        <span className="rpg-spell-played__eyebrow">MAGIE JOUÉE</span>
        <strong>{carte.name}</strong>
        <p>{carte.text}</p>
        <div className="rpg-spell-played__target">
          {annonce.cible.illustrationId
            ? <img src={cardArt(annonce.cible.illustrationId)} alt="" />
            : <span className="rpg-spell-played__target-mark" aria-hidden="true">⌖</span>}
          <span><small>CIBLE</small><b>{annonce.cible.nom}</b></span>
        </div>
      </div>
    </section>
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

// Le réglage sonore (musique et bruitages) reste mémorisé sur l'appareil ;
// au prochain passage, le son revient par défaut.
const RPG_SOUND_KEY = 'letsplay_sablier_sound_v1';
function readRpgSoundPref() {
  try { return window.localStorage.getItem(RPG_SOUND_KEY) !== 'off'; } catch { return true; }
}
function writeRpgSoundPref(value) {
  try { window.localStorage.setItem(RPG_SOUND_KEY, value ? 'on' : 'off'); } catch { /* stockage indisponible */ }
}

function GameModeMenu({ screen, selectedDeckId, onSelectDeck, onChangeScreen, onStartGame, onResumeGame, hasGame, progressionHistoire, onStartEtage, onResetHistoire, decksMaison, collection, statutSync, onEnregistrerDeckMaison, onSupprimerDeckMaison, onHoverCard, onLeaveHoverCard, onPlaySfx }) {
  const [catalogueCouleur, setCatalogueCouleur] = useState('toutes');
  const [catalogueType, setCatalogueType] = useState('tous');
  const [openDeckId, setOpenDeckId] = useState(null);
  const [deckCouleur, setDeckCouleur] = useState('toutes');
  const [confirmation, setConfirmation] = useState(null);
  // Mode Histoire : la galerie des tours d'abord (`null`), la page d'une tour
  // — ses étages dévoilés — ensuite. Le clic sur une miniature ouvre la tour.
  const [tourOuverteId, setTourOuverteId] = useState(null);
  // La suppression d'un deck maison se confirme en deux temps (jamais de `window.confirm`).
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  // L'atelier : `null` (fermé), `{ mode: 'nouveau' }`, `{ mode: 'edition', id }`
  // ou `{ mode: 'copie', deck }` — partir d'un deck du catalogue pour l'adapter.
  const [atelier, setAtelier] = useState(null);
  const detailRef = useRef(null);
  const play = (n) => { try { onPlaySfx?.(n); } catch {} };
  // L'étagère : les cinq decks du catalogue, puis les boîtiers maison.
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
  const openStats = openDeck ? deckStats(openDeck) : { terrains: 0, creatures: 0, magies: 0 };
  const openCards = openDeck ? deckCardList(openDeck) : [];
  const openValidation = openDeck
    ? (openDeck.maison ? rpgValiderDeckMaison(openDeck.cardIds, collection) : rpgValiderDeck(openDeck.cardIds))
    : { ok: false, raisons: ['Aucun deck ouvert.'] };
  const cartesCatalogue = RPG_DUEL_CARDS.filter((carte) => {
    const colors = cardColors(carte);
    const couleurCorrespond = catalogueCouleur === 'toutes'
      || (catalogueCouleur === 'hybride' ? colors.length > 1 : colors.includes(catalogueCouleur));
    return couleurCorrespond && (catalogueType === 'tous' || carte.kind === catalogueType);
  });
  const imageForDeck = (deck) => {
    const cardId = deck?.cardIds.find((id) => cardById(id)?.kind !== 'terrain') ?? deck?.cardIds[0];
    return cardId ? cardArt(cardId) : '';
  };
  // La miniature d'une tour : sa peinture livrée dans `public/sablier-tours/`.
  const tourMiniatureUrl = (tour) => `${import.meta.env.BASE_URL}sablier-tours/${tour.miniature}`;
  // La tour ouverte dans le mode Histoire (page d'étages), ou null (galerie).
  const tourOuverte = tourOuverteId ? tourHistoireParId(tourOuverteId) : null;
  const resumeTourOuverte = tourOuverte ? resumeTourHistoire(tourOuverte.id, progressionHistoire) : null;
  const menuBackground = `linear-gradient(105deg, rgba(8, 7, 13, .96) 0%, rgba(8, 7, 13, .82) 48%, rgba(8, 7, 13, .72) 100%), url("${import.meta.env.BASE_URL}sablier-de-bab-el-keyart.jpg")`;
  // Quitter l'onglet Deck referme l'étagère et l'atelier : le prochain passage repart sans liste.
  useEffect(() => { if (screen !== 'decks') { setOpenDeckId(null); setAtelier(null); } }, [screen]);
  // Quitter l'onglet Histoire referme la tour ouverte : le prochain passage sur
  // l'onglet retrouve la galerie des miniatures, jamais les étages d'emblée.
  useEffect(() => { if (screen !== 'histoire') setTourOuverteId(null); }, [screen]);
  // Sur écran étroit, la fiche s'ouvre sous l'étagère : on l'amène à l'écran.
  useEffect(() => {
    const fiche = detailRef.current;
    if (!openDeckId || atelier || !fiche?.scrollIntoView) return;
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
    <section className={`rpg-mode-menu rpg-mode-menu--${screen}`} style={{ backgroundImage: menuBackground }}>
      <div className="rpg-mode-menu__content">
        <header className="rpg-mode-menu__header">
          <div className="rpg-mode-menu__brand">
            <span className="rpg-mode-menu__eyebrow">DUEL TACTIQUE · ALGÉRIE FANTASTIQUE</span>
            <h1>Le <span>Sablier</span></h1>
            <p>Les portes de la ville attendent leur prochain gardien.</p>
          </div>
          <nav className="rpg-mode-menu__switch" aria-label="Modes de jeu">
            <button type="button" className={screen === 'jouer' ? 'is-active' : ''} aria-current={screen === 'jouer' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('jouer'); }}>
              <span aria-hidden="true">⚔</span> Jouer
            </button>
            <button type="button" className={screen === 'histoire' ? 'is-active' : ''} aria-current={screen === 'histoire' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('histoire'); }}>
              <span aria-hidden="true">⌛</span> Histoire
            </button>
            <button type="button" className={screen === 'decks' ? 'is-active' : ''} aria-current={screen === 'decks' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('decks'); }}>
              <span aria-hidden="true">▤</span> Deck
            </button>
            <button type="button" className={screen === 'catalogue' ? 'is-active' : ''} aria-current={screen === 'catalogue' ? 'page' : undefined} onClick={() => { play('menu'); onChangeScreen('catalogue'); }}>
              <span aria-hidden="true">▧</span> Catalogue
            </button>
          </nav>
        </header>

        {screen === 'jouer' ? (
          <main className="rpg-mode-menu__play">
            <section className="rpg-mode-menu__hero" style={{ '--rpg-menu-card-art': `url("${imageForDeck(playerDeck)}")` }}>
              <div className="rpg-mode-menu__hero-copy">
                <span className="rpg-mode-menu__eyebrow">UN DUEL · DEUX DECKS · 40 CARTES</span>
                <h2>Le sable se souvient.<br /><em>À vous d’écrire la suite.</em></h2>
                <p>Déclarez vos attaques, choisissez vos bloqueurs et remportez la bataille des portes.</p>
                <button type="button" className="rpg-menu-button rpg-menu-button--primary" onClick={() => { play('select'); onStartGame(); }}>
                  ⚔ Lancer le duel <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="rpg-mode-menu__hero-mark" aria-hidden="true">باب</div>
            </section>

            <aside className="rpg-mode-menu__loadout">
              <div className="rpg-mode-menu__loadout-heading">
                <div><span className="rpg-mode-menu__eyebrow">VOTRE AFFRONTEMENT</span><h2>Decks de départ</h2></div>
                <button type="button" className="rpg-menu-link" onClick={() => { play('menu'); onChangeScreen('decks'); }}>Voir les decks <span aria-hidden="true">→</span></button>
              </div>
              {playerDeck && (
                <article className="rpg-menu-deck-summary rpg-menu-deck-summary--player">
                  <img src={deckBoxArtUrl(playerDeck)} alt="" />
                  <div><small>VOTRE DECK · {deckColorGlyph(playerDeck)} {deckColorLabel(playerDeck).toUpperCase()}</small><strong>{playerDeck.name}</strong><span>{deckStats(playerDeck).creatures} créatures · {deckStats(playerDeck).magies} magies</span></div>
                </article>
              )}
              {opponentDeck && (
                <article className="rpg-menu-deck-summary rpg-menu-deck-summary--opponent">
                  <img src={deckBoxArtUrl(opponentDeck)} alt="" />
                  <div><small>ADVERSAIRE · {deckColorGlyph(opponentDeck)} {deckColorLabel(opponentDeck).toUpperCase()}</small><strong>{opponentDeck.name}</strong><span>{opponentDeck.affrontement ?? `Affrontez ${opponentDeck.name}.`}</span></div>
                </article>
              )}
              {hasGame && <button type="button" className="rpg-menu-button rpg-menu-button--resume" onClick={() => { play('select'); onResumeGame(); }}>↩ Reprendre le duel en cours</button>}
            </aside>
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
            <aside className="rpg-deck-catalog__rail">
              <div className="rpg-deck-catalog__intro">
                <span className="rpg-mode-menu__eyebrow">COLLECTION</span>
                <h2>Vos decks</h2>
                <p>{openDeck
                  ? 'Cliquez sur un autre boîtier pour changer de deck, ou fermez celui-ci pour masquer sa liste.'
                  : 'Cliquez un boîtier pour voir ses cartes ; «\u00a0Sélectionner\u00a0» le retient pour vos prochaines parties. Le boîtier « Nouveau deck » ouvre l’atelier.'}</p>
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
              {hasGame && <button type="button" className="rpg-menu-button rpg-menu-button--resume" onClick={() => { play('select'); onResumeGame(); }}>↩ Reprendre le duel</button>}
            </aside>

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
                  <span className={openValidation.ok ? 'is-valid' : 'is-invalid'}><b>{openValidation.ok ? '✓' : '!'}</b><small>{openValidation.ok ? 'validé' : (openValidation.raisons ?? [openValidation.raison]).filter(Boolean).join(' · ')}</small></span>
                </div>
                <div className="rpg-deck-detail__list-heading"><h3>Liste des cartes</h3><span>{openCards.length} références · quantités incluses</span></div>
                <ul className="rpg-deck-list">
                  {openCards.map(({ carte, count }) => (
                    <li key={carte.id} data-card-id={carte.id}>
                      <img src={cardArt(carte)} alt="" />
                      <span><strong>{carte.name}</strong><small>{cardFaceTypeLine(carte)}{carte.kind === 'terrain' ? '' : ` · ${cardCostLabel(carte)}`}</small></span>
                      <b>×{count}</b>
                    </li>
                  ))}
                </ul>
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
        )) : screen === 'histoire' ? (
          <main className="rpg-story" aria-label="Mode Histoire — les Tours de Bab El">
            <div className="rpg-story__intro">
              <div>
                <span className="rpg-mode-menu__eyebrow">MODE HISTOIRE · CONTINUITÉ SIMPLE</span>
                <h2>Les Tours de Bab El</h2>
                <p>
                  Chaque étage est un duel autonome : deck complet, PV pleins, aucune ressource
                  reportée. Choisissez une tour pour dévoiler ses étages, puis gravissez-les un à
                  un — la progression est gardée sur cet appareil.
                </p>
              </div>
              <button type="button" className="rpg-story__reset" onClick={() => { play('annuler'); onResetHistoire(); }}>
                Effacer la progression
              </button>
            </div>
            {tourOuverte ? (
              <div className="rpg-story__detail">
                <button type="button" className="rpg-story__back" onClick={() => { play('menu'); setTourOuverteId(null); }}>
                  <span aria-hidden="true">←</span> Retour aux tours
                </button>
                <section key={tourOuverte.id} className="rpg-story-tour">
                  <header className="rpg-story-tour__header">
                    <span className="rpg-story-tour__banner" style={{ backgroundImage: `url("${tourMiniatureUrl(tourOuverte)}")` }} aria-hidden="true" />
                    <div className="rpg-story-tour__heading">
                      <span className="rpg-mode-menu__eyebrow">{resumeTourOuverte.vaincus} / {resumeTourOuverte.total} ÉTAGES DÉBLAYÉS</span>
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
                      <span className="rpg-story-tower__art" style={{ backgroundImage: `url("${tourMiniatureUrl(tour)}")` }} aria-hidden="true" />
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
        ) : (
          <main className="rpg-card-catalogue" aria-label="Catalogue complet des cartes">
            <header className="rpg-card-catalogue__header">
              <div>
                <span className="rpg-mode-menu__eyebrow">COLLECTION COMPLÈTE · {RPG_DUEL_CARDS.length} CARTES</span>
                <h2>Catalogue</h2>
                <p>Parcourez les créatures, héros, terrains et magies de Bab El.</p>
              </div>
              {hasGame && <button type="button" className="rpg-menu-button rpg-menu-button--resume" onClick={() => { play('select'); onResumeGame(); }}>↩ Reprendre le duel</button>}
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
                  const type = carte.kind === 'terrain' ? 'Terrain'
                    : carte.kind === 'magie' ? 'Magie'
                      : carte.kind === 'hero' ? 'Héros' : 'Créature';
                  return (
                    <article
                      key={carte.id}
                      className={`rpg-card-catalogue__card rpg-card-catalogue__card--${carte.kind}`}
                      data-card-id={carte.id}
                      data-color={carte.element}
                      data-colors={cardColors(carte).join(' ')}
                      data-type={carte.kind}
                      style={cardFrameStyle(carte)}
                      tabIndex={0}
                      onMouseEnter={(event) => onHoverCard?.(carte, event)}
                      onMouseLeave={onLeaveHoverCard}
                      onFocus={(event) => onHoverCard?.(carte, event)}
                      onBlur={onLeaveHoverCard}
                    >
                      <div className="rpg-card-catalogue__art">
                        <img src={cardArt(carte)} alt={`Illustration de ${carte.name}`} loading="lazy" />
                        <CardElementBadge carte={carte} />
                        {!estTerrain && <span className="rpg-card-catalogue__cost" aria-label={`Coût ${cardCostLabel(carte)}`}>{carte.cost}</span>}
                      </div>
                      <div className="rpg-card-catalogue__details">
                        <div className="rpg-card-catalogue__title">
                          <h3>{carte.name}</h3>
                        </div>
                        <p className="rpg-card-catalogue__type">{cardFaceTypeLine(carte)}</p>
                        <div className="rpg-card-catalogue__meta">
                          <span className={estTerrain ? 'is-terrain' : cardColors(carte).length > 1 ? 'is-hybrid' : ''}>
                            {estTerrain
                              ? terrainManaColors(carte).length > 1
                                ? '🔥 Braise ou ⏳ Sable'
                                : `${ELEMENT_GLYPHS[carte.element] ?? '◇'} ${cardColorLabel(carte)}`
                              : `${deckColorGlyph({ element: carte.element, elements: cardColors(carte) })} ${cardColorLabel(carte)}${cardColors(carte).includes('sable') ? ' · Désert' : ''}`}
                          </span>
                          {estCreature && <b>⚔ {carte.atk} · 🛡 {carte.def}</b>}
                        </div>
                        <p className="rpg-card-catalogue__rules">{carte.text && carte.text !== '—' ? carte.text : 'Aucune capacité.'}</p>
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
      if (phaseDuelActive === 'combat') jouerSfx('phase');
      else if (phaseDuelActive === 'reponse') jouerSfx('annonce');
      else if (phaseDuelActive === 'principal' || phaseDuelActive === 'adverse') jouerSfx('tour');
    }
    prevPhaseRef.current = phaseDuelActive;
  }, [phaseDuelActive]);
  useEffect(() => {
    if (cartesEnDestruction.length > prevDestructionCountRef.current) {
      const last = cartesEnDestruction[cartesEnDestruction.length - 1];
      jouerSfx(last?.bruleeParBraise ? 'burn' : 'destruction');
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

export default function RpgDuelPage({ joueurDeck, sorcierDeck, sorcierPuissance = 2, rng = Math.random } = {}) {
  const [ecran, setEcran] = useState('jouer');
  const landscapeRef = useRef(null);
  const [viewport, setViewport] = useState({ mobile: false, portrait: false });
  useEffect(() => {
    landscapeRef.current = createRpgLandscapeSession();
    const update = () => {
      const mobile = Boolean(window.LetsPlayAndroid) || Boolean(window.matchMedia?.('(pointer: coarse), (max-width: 1100px)').matches);
      setViewport({ mobile, portrait: mobile && window.innerHeight > window.innerWidth });
    };
    update();
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); landscapeRef.current?.leave(); };
  }, []);
  useEffect(() => {
    if (ecran !== 'partie') landscapeRef.current?.leave();
  }, [ecran]);
  // Mode Histoire : la première fois qu'un étage est remporté, il est marqué
  // déblayé et sauvegardé sur l'appareil (une seule fois par duel). Sa
  // récompense — les cartes rendues par l'étage — rejoint la collection ; le
  // compte connecté reçoit l'union, pour les autres appareils.
  useEffect(() => {
    const duelCourant = duelRef.current;
    if (!duelCourant || !histoireEtageId) return;
    if (rpgVainqueur(duelCourant) !== 'joueur') return;
    if (histoireVictoireMarqueeRef.current === histoireEtageId) return;
    histoireVictoireMarqueeRef.current = histoireEtageId;
    const maj = marquerEtageVaincu(progressionHistoire, histoireEtageId);
    sauverProgressionHistoire(maj);
    setProgressionHistoire(maj);
    noterVictoireEtage(histoireEtageId, maj);
  });
  const reprendrePartie = () => {
    landscapeRef.current?.enter();
    setEcran('partie');
  };
  // Decks maison et collection : l'atelier écrit dans le casier local, le compte
  // connecté synchronise le tout en tâche de fond (`useDecksSablier.js`).
  const {
    decksMaison,
    collection,
    statutSync,
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
  // Plateau du duel : le joueur n'en choisit aucun. C'est le deck de l'un des
  // deux duellistes qui impose son terrain, et le tirage du lancement
  // (`nouvellePartie`) désigne lequel. Avant la première partie, la table
  // d'origine de Bab El sert de décor.
  const [plateauId, setPlateauId] = useState(PLATEAU_PAR_DEFAUT.id);
  // Mode Histoire : l'étage en cours (null = duel libre).
  const [histoireEtageId, setHistoireEtageId] = useState(null);
  const [progressionHistoire, setProgressionHistoire] = useState(() => chargerProgressionHistoire());
  const histoireVictoireMarqueeRef = useRef(null);
  // Son du jeu en deux couches : le mode Histoire porte une boucle par tour
  // (`rpgAmbientMusic.js`), tandis que les bruitages tactiles (`rpgAudio.js`)
  // restent disponibles dans tous les duels. Les deux lecteurs partagent le
  // même réglage et sont libérés au démontage.
  const musiqueRef = useRef(null);
  const sfxRef = useRef(null);
  const [sonActif, setSonActif] = useState(readRpgSoundPref);
  useEffect(() => { writeRpgSoundPref(sonActif); }, [sonActif]);
  useEffect(() => {
    musiqueRef.current = new RpgAmbientMusic();
    sfxRef.current = new RpgAudioPlayer();
    sfxRef.current.setMuted(!sonActif);
    return () => {
      musiqueRef.current?.destroy();
      musiqueRef.current = null;
      sfxRef.current?.destroy();
      sfxRef.current = null;
    };
  }, []);
  useEffect(() => {
    sfxRef.current?.setMuted(!sonActif);
    musiqueRef.current?.setMuted(!sonActif);
  }, [sonActif]);
  // La tour de l'étage en cours commande la boucle (null : duel libre).
  const tourHistoireId = histoireEtageId
    ? etageHistoireParId(histoireEtageId)?.tour?.id ?? null
    : null;
  useEffect(() => { musiqueRef.current?.setTour(tourHistoireId); }, [tourHistoireId]);
  useEffect(() => {
    const musique = musiqueRef.current;
    if (!musique) return;
    if (ecran === 'partie' && tourHistoireId && sonActif) musique.start();
    else musique.stop();
  }, [ecran, tourHistoireId, sonActif]);
  // Un onglet mis de côté ne laisse pas la boucle tourner dans le vide ;
  // au retour, elle reprend où le duel en est.
  useEffect(() => {
    const surVisibilite = () => {
      const musique = musiqueRef.current;
      if (!musique) return;
      if (document.hidden) musique.pause();
      else if (ecran === 'partie' && tourHistoireId && sonActif) musique.resume();
    };
    document.addEventListener('visibilitychange', surVisibilite);
    return () => document.removeEventListener('visibilitychange', surVisibilite);
  }, [ecran, tourHistoireId, sonActif]);
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
  const appuiLongRef = useRef(null);
  useEffect(() => {
    // Changer d'écran (menu, deck, catalogue, duel) referme l'aperçu au doigt
    // et désarme les gestes en cours.
    setApercuAppui(null);
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
  const [animationsEntites, setAnimationsEntites] = useState({});
  const [cartesEnDestruction, setCartesEnDestruction] = useState([]);
  const [carteEnVol, setCarteEnVol] = useState(null);
  const [impactEcran, setImpactEcran] = useState(null);
  const [animationsPioche, setAnimationsPioche] = useState([]);
  const instantanePiocheRef = useRef(null);
  const sequencePiocheRef = useRef(0);
  const carteOrigineVolRef = useRef(null);
  const actionVolRef = useRef(null);
  const sequenceVolRef = useRef(0);
  const carteCibleeHandIndexRef = useRef(null);
  const timerVolRef = useRef(null);
  const sequenceImpactRef = useRef(0);
  const timerImpactRef = useRef(null);
  const force = () => setVersion((v) => v + 1);
  const [phase, setPhase] = useState(false);
  const [attaquants, setAttaquants] = useState([]);
  const [ciblesAttaque, setCiblesAttaque] = useState({});
  const [cibleAttaqueEnCours, setCibleAttaqueEnCours] = useState(null);
  const [combatEntrant, setCombatEntrant] = useState(null);
  const [bloqueurGlisse, setBloqueurGlisse] = useState(null);
  const [bloqueurSelectionne, setBloqueurSelectionne] = useState(null);
  const [cibleEnCours, setCibleEnCours] = useState(null);
  const [terrainManaChoix, setTerrainManaChoix] = useState(null);
  const [confirmationSort, setConfirmationSort] = useState(null);
  const [apercuSurvol, setApercuSurvol] = useState(null);
  const [carteGlissee, setCarteGlissee] = useState(null);
  const [surZoneDepot, setSurZoneDepot] = useState(false);
  const [annulationDisponible, setAnnulationDisponible] = useState(false);
  const [sortJoue, setSortJoue] = useState(null);
  const [apercuMagie, setApercuMagie] = useState(null);
  // Piles de cartes homonymes (tactile) : les groupes que le joueur a dépliés.
  const [pilesDeployees, setPilesDeployees] = useState(() => new Set());
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
    const from = mesurerRectangle(source, 128, 160);
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
    const etageId = options.etageId ?? histoireEtageId;
    const etageCourant = etageId ? etageHistoireParId(etageId)?.etage ?? null : null;
    const deckChoisiId = options.deckId ?? deckSelectionneId;
    const deckJoueurSelectionne = RPG_DECKS.find((deck) => deck.id === deckChoisiId && deckEstSelectionnable(deck));
    // Duel libre : le sorcier joue la Cour des Djinns, ou un autre deck si le joueur joue déjà la Cour.
    const deckAdverse = etageCourant || sorcierDeck ? null : deckAdversePour(deckJoueurSelectionne);
    setDeckDuelId(joueurDeck ? null : deckJoueurSelectionne?.id ?? null);
    setDeckAdverseId(deckAdverse?.id ?? null);
    // Le plateau n'est pas un choix du joueur : il vient du **deck de l'un des
    // deux duellistes**, et c'est le tirage du duel qui désigne lequel. Les
    // paquets joués sont exactement ceux du duel — une prop brute (sans
    // identité de deck) parle par sa couleur dominante, un étage d'Histoire par
    // la clé de son deck de campagne.
    const tiragePlateau = tirerPlateauDuDuel({
      deckJoueur: joueurDeck ?? deckJoueurSelectionne,
      deckAdverse: etageCourant ? etageCourant.deck : sorcierDeck ?? deckAdverse,
      rng,
    });
    const plateau = tiragePlateau.plateau;
    setPlateauId(plateau.id);
    duelRef.current = rpgNouveauDuel({
      joueurDeck: joueurDeck ?? deckJoueurSelectionne?.cardIds ?? RPG_DECK_JOUEUR_BASE,
      sorcierDeck: etageCourant ? deckHistoire(etageCourant.deck) : sorcierDeck ?? deckAdverse?.cardIds ?? RPG_DECK_SORCIER_BASE,
      sorcierPuissance: etageCourant ? etageCourant.puissance : sorcierPuissance,
      sorcierIA: etageCourant ? etageCourant.ia : undefined,
      rng,
    });
    histoireVictoireMarqueeRef.current = null;
    instantanePiocheRef.current = {
      joueur: { deck: duelRef.current.joueur.deck.length + duelRef.current.joueur.main.length, main: 0 },
      sorcier: { deck: duelRef.current.sorcier.deck.length + duelRef.current.sorcier.main.length, main: 0 },
    };
    setAnimationsPioche([]);
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleAttaqueEnCours(null);
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
    jouerSfx('tour', 0.35);
    force();
  };

  const duel = duelRef.current;
  const plateau = plateauParId(plateauId) ?? PLATEAU_PAR_DEFAUT;
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
    animations.forEach((a, idx) => { jouerSfx('pioche', idx * 0.08); });
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

  const afficherApercuSurvol = (carte, event) => {
    if (!carte || !event?.currentTarget) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const largeurVue = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1024);
    const hauteurVue = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 768);
    const largeurApercu = Math.min(680, Math.max(180, largeurVue - 20));
    const hauteurApercu = Math.min(400, Math.max(150, hauteurVue - 20));
    const marge = 10;
    const espace = 12;
    let left = rectangle.right + espace;
    if (left + largeurApercu > largeurVue - marge) left = rectangle.left - largeurApercu - espace;
    left = Math.max(marge, Math.min(left, largeurVue - largeurApercu - marge));
    let top = rectangle.top + rectangle.height > hauteurVue * .56
      ? rectangle.top - hauteurApercu - espace
      : rectangle.bottom + espace;
    top = Math.max(marge, Math.min(top, hauteurVue - hauteurApercu - marge));
    setApercuSurvol({
      carteId: carte.id,
      style: { left: `${left}px`, top: `${top}px` },
    });
    if (!viewport.mobile) jouerSfx('hover');
  };
  const masquerApercuSurvol = () => setApercuSurvol(null);

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
    annulerAppuiLong();
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
        setApercuAppui(carte.id);
      },
    });
  };
  // Échap referme l'aperçu, comme le volet et le bouton Fermer.
  useEffect(() => {
    if (!apercuAppui) return undefined;
    const fermerAvecEchap = (event) => {
      if (event.key === 'Escape') fermerApercuAppui();
    };
    window.addEventListener('keydown', fermerAvecEchap);
    return () => window.removeEventListener('keydown', fermerAvecEchap);
  }, [apercuAppui]);
  // En portrait, l'écran de rotation reprend la main : plus rien à consulter.
  useEffect(() => {
    if (viewport.portrait) fermerApercuAppui();
  }, [viewport.portrait]);

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

  const demarrerEtage = (etageId) => {
    unlockSfx();
    jouerSfx('select');
    setHistoireEtageId(etageId);
    nouvellePartie({ etageId });
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

  if (ecran !== 'partie') {
    return (
      <div className="rpg-battle rpg-battle--menu" data-scene="menu" onPointerDown={demarrerAppuiLongCarte}>
        <GameModeMenu
          screen={ecran}
          selectedDeckId={deckSelectionneId}
          onSelectDeck={choisirDeck}
          onChangeScreen={setEcran}
          onStartGame={demarrerPartie}
          onResumeGame={reprendrePartie}
          hasGame={Boolean(duel)}
          progressionHistoire={progressionHistoire}
          onStartEtage={demarrerEtage}
          onResetHistoire={() => {
            reinitialiserProgressionHistoire();
            setProgressionHistoire(progressionHistoireVide());
          }}
          decksMaison={decksMaison}
          collection={collection}
          statutSync={statutSync}
          onEnregistrerDeckMaison={enregistrerDeckMaison}
          onSupprimerDeckMaison={supprimerDeckMaison}
          onHoverCard={afficherApercuSurvol}
          onLeaveHoverCard={masquerApercuSurvol}
          onPlaySfx={jouerSfx}
        />
        {apercuSurvol && (
          <HoverCardPreview
            carte={cardById(apercuSurvol.carteId)}
            style={apercuSurvol.style}
          />
        )}
        {apercuAppui && <ApercuCarteAppuiLong carte={cardById(apercuAppui)} onFermer={fermerApercuAppui} />}
      </div>
    );
  }
  if (!duel) return null;
  const vainqueur = rpgVainqueur(duel);
  const etageHistoire = histoireEtageId ? etageHistoireParId(histoireEtageId)?.etage ?? null : null;
  const etageSuivant = histoireEtageId ? prochainEtage(histoireEtageId) : null;
  const monTour = duel.tour === 'joueur' && !vainqueur;
  const deckJoueurAffiche = decksTous.find((deck) => deck.id === (deckDuelId ?? deckSelectionneId) && deckSeJoue(deck, collection)) ?? RPG_DECKS[0];
  const deckAdverseAffiche = RPG_DECKS.find((deck) => deck.id === deckAdverseId) ?? deckAdverseParDefaut() ?? RPG_DECKS[0];
  // Fenêtre de réponse : pendant une attaque, ou quand le sorcier vient d'annoncer une carte.
  const fenetreSort = Boolean(duel.annonce && !vainqueur);
  const carteAnnoncee = fenetreSort ? cardById(duel.annonce.carteId) : null;
  const sorcierArtId = etageHistoire
    ? 'ifrit-al-ahmar'
    : (
      deckAdverseAffiche.boxArt
      ?? deckAdverseAffiche.cardIds.find((id) => cardById(id)?.kind !== 'terrain')
      ?? 'djinn-du-souk'
    );
  const cibleAnnoncee = carteAnnoncee?.kind === 'magie'
    ? describeAnnouncedMagicTarget(carteAnnoncee, duel.annonce.cibleId, duel, sorcierArtId)
    : null;
  const reponseActive = Boolean((combatEntrant && duel.fenetreReponse && !vainqueur) || fenetreSort);
  const reponseApresBlocage = Boolean(reponseActive && combatEntrant?.coteAttaquant === 'joueur');
  const indicateurTour = vainqueur
    ? 'DUEL TERMINÉ'
    : fenetreSort
      ? 'SORT ANNONCÉ'
    : reponseActive
      ? reponseApresBlocage ? 'À VOUS · RÉPONSE' : 'À VOUS · DÉFENSE'
      : phase ? 'À VOUS · ATTAQUE' : monTour ? 'À VOTRE TOUR' : 'TOUR DU SORCIER';
  const classeIndicateurTour = vainqueur ? 'is-finished' : reponseActive ? 'is-response' : phase ? 'is-player is-attacking' : monTour ? 'is-player' : 'is-opponent';
  const phaseDuelActive = vainqueur
    ? 'termine'
    : reponseActive
      ? 'reponse'
      : combatEntrant || phase
        ? 'combat'
        : monTour ? 'principal' : 'adverse';
  const prets = duel.joueur.creatures.filter((e) => e.ready && !e.attaquee);
  const carteCiblee = cibleEnCours ? cardById(cibleEnCours) : null;
  const modeCible = targetMode(carteCiblee);
  const ciblesCoupRapideLegales = (attaquant, cote = 'joueur') => {
    const carte = cardById(attaquant?.carteId);
    if (!carte?.coupRapide) return [];
    const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
    return duel[adv].creatures.filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
  };
  const prochainCoupRapideSansCible = (ids, selections = ciblesAttaque) => ids.find((id) => {
    const attaquant = duel.joueur.creatures.find((entite) => entite.id === id);
    const ciblesLegales = ciblesCoupRapideLegales(attaquant, 'joueur');
    return ciblesLegales.length > 0 && !ciblesLegales.some((cible) => cible.id === selections?.[id]);
  }) ?? null;
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

  const animerModificationsChamp = (avant, attaquantsIds = [], debutJournalDestructions = null) => {
    if (!avant?.length) return;
    const vivants = new Map([
      ...duel.joueur.creatures,
      ...duel.sorcier.creatures,
      ...duel.joueur.terrains,
      ...duel.sorcier.terrains,
    ].map((entite) => [entite.id, entite]));
    const disparues = animationsReduites() ? [] : avant.filter((entite) => !vivants.has(entite.entityId));
    if (disparues.length) {
      const entitesBrulees = new Set((Number.isInteger(debutJournalDestructions)
        ? rpgDestructionsDepuis(duel, debutJournalDestructions)
        : [])
        .filter((evenement) => evenement.sourceElements.includes('braise'))
        .map((evenement) => evenement.entityId));
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
    setCibleAttaqueEnCours(null);
    setCibleEnCours(null);
    setConfirmationSort(null);
    setApercuSurvol(null);
    force();
  };

  const peutJouerCarte = (carte) => {
    if (!carte || !duel.joueur.main.includes(carte.id)) return false;
    // Un contre sans annonce à contrer n'est pas jouable : l'allumer enfermait
    // le joueur dans une confirmation qui ne menait à rien.
    if (!rpgContreJouable(duel, 'joueur', carte)) return false;
    if (reponseApresBlocage && !carte.instant) return false;
    if (carte.kind === 'terrain') return monTour && !reponseApresBlocage && !duel.joueur.terrainPose;
    return (reponseApresBlocage ? carte.instant : monTour || (reponseActive && carte.instant))
      && rpgPeutPayer(duel.joueur, carte);
  };

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
    if (!monTour || reponseApresBlocage) { jouerSfx('erreur'); return; }
    const etatAvantAction = JSON.stringify(duel);
    const res = rpgPoserTerrain(duel, 'joueur', carteId);
    if (res.ok) { conserverAnnulation(etatAvantAction); jouerSfx('terrain_pose'); }
    else { jouerSfx('erreur'); }
    force();
  };

  const engager = (terrainId, couleurChoisie = null) => {
    if (!monTour && !reponseActive) { jouerSfx('erreur'); return; }
    const etatAvantAction = monTour ? JSON.stringify(duel) : null;
    const res = rpgEngagerTerrain(duel, 'joueur', terrainId, couleurChoisie);
    if (res.ok) { if (etatAvantAction) conserverAnnulation(etatAvantAction); jouerSfx('terrain_tap'); }
    else { jouerSfx('erreur'); }
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

  const decrireCibleMagie = (carte, cibleId) => {
    if (cibleId === 'sorcier' || carte.effet?.cible === 'sorcier') {
      return { nom: 'Le sorcier adverse', illustrationId: 'djinn-du-souk', targetPlate: 'sorcier', targetIds: [] };
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

  const annoncerMagie = (carte, cible) => {
    jouerSfx(carte?.effet?.type === 'soin' ? 'soin_long' : carte?.effet?.type === 'bouclier' ? 'bouclier' : 'magie');
    if (timerSortRef.current) window.clearTimeout(timerSortRef.current);
    if (timerApercuMagieRef.current) window.clearTimeout(timerApercuMagieRef.current);
    setSortJoue({ carteId: carte.id, cible });
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

  const lancerMagie = (carteId, cibleId = null) => {
    const carte = cardById(carteId);
    const cibleEffective = cibleId ?? rpgCibleAuto(duel, 'joueur', carte);
    const cibleDecrite = decrireCibleMagie(carte, cibleEffective);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgLancerMagie(duel, 'joueur', carteId, cibleEffective);
    if (res.ok && res.contre && res.parIA) {
      // Le sorcier contre la carte du joueur : elle est défaussée, le tour du joueur continue.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      invaliderAnnulation();
      setCibleEnCours(null);
      force();
      return;
    }
    if (res.ok && res.contre) {
      // Le contre a défait l'annonce du sorcier : il reprend son tour, carte suivante.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      invaliderAnnulation();
      annoncerMagie(carte, cibleDecrite);
      setCibleEnCours(null);
      force();
      later(annoncerSuivantSorcier, 900);
      return;
    }
    if (res.ok) {
      jouerSfx(carte?.effet?.type === 'soin' ? 'soin_long' : carte?.effet?.type === 'bouclier' ? 'bouclier' : 'magie');
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      invaliderAnnulation();
      annoncerMagie(carte, cibleDecrite);
      setCibleEnCours(null);
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
            rpgFinDeTour(duel);
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
  };

  const finaliserPoseCreature = (carteId, cibleId = null) => {
    const carte = cardById(carteId);
    carteCibleeHandIndexRef.current = null;
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const cibleAuto = carte.arrivee?.type === 'combat' ? cibleId : (duel.sorcier.creatures[0]?.id ?? null);
    const res = rpgJouerCreature(duel, 'joueur', carteId, cibleAuto);
    if (res.ok && res.contre && res.parIA) {
      // Le sorcier contre la créature : elle n'entre pas en jeu.
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
    } else if (res.ok) {
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      jouerSfx('creature');
    }
    force();
  };

  const poserCarte = (carteId) => {
    const carte = cardById(carteId);
    const peutRepondre = reponseActive && carte.instant;
    if (reponseApresBlocage && !carte.instant) return;
    if (!monTour && !peutRepondre) return;
    if (carte.kind === 'magie') {
      const cible = targetMode(carte);
      if (cible) {
        const aUneCible = cible === 'ennemi'
          ? duel.sorcier.creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte))) || carte.cibles?.includes('sorcier')
          : duel.joueur.creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte)));
        if (aUneCible) setCibleEnCours(carteId);
        force();
        return;
      }
      lancerMagie(carteId);
      return;
    }
    if (carte.arrivee?.type === 'combat') {
      const ciblesLegales = duel.sorcier.creatures.filter((entite) => !rpgEstProtegee(entite, cardColors(carte)));
      if (ciblesLegales.length) {
        setCibleEnCours(carteId);
        force();
        return;
      }
    }
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
    } else if (carte.arrivee?.type === 'combat'
      && duel.sorcier.creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte)))) {
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
    if (carte.kind === 'magie' && peutJouerCarte(carte)) {
      jouerSfx('menu');
      setConfirmationSort({ carteId, handIndex });
      return;
    }
    jouerCarteDepuisMain(carteId, handIndex);
  };

  const confirmerSort = () => {
    const confirmation = confirmationSort;
    setConfirmationSort(null);
    if (!confirmation) return;
    jouerSfx('select');
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
    jouerSfx('select');
    if (carteSource?.arrivee?.type === 'combat') {
      const carteId = cibleEnCours;
      const handIndex = carteCibleeHandIndexRef.current;
      carteCibleeHandIndexRef.current = null;
      setCibleEnCours(null);
      demarrerVolCarte(carteSource, handIndex, () => finaliserPoseCreature(carteId, entite.id));
      return true;
    }
    lancerMagie(cibleEnCours, entite.id);
    return true;
  };

  const basculerAttaquant = (entite) => {
    if (!entite.ready || entite.attaquee) {
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
    const prochainId = prochainCoupRapideSansCible(ids, cibles);
    setCibleAttaqueEnCours(prochainId);
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
    if (reponseActive && combatEntrant?.coteAttaquant === 'sorcier') {
      if (!bloqueursDisponibles.some((bloqueur) => bloqueur.id === entite.id)) {
        jouerSfx('erreur');
      } else if (bloqueurSelectionne === entite.id) {
        jouerSfx('annuler');
        setBloqueurSelectionne(null);
      } else {
        jouerSfx('blocage');
        setBloqueurSelectionne(entite.id);
      }
      force();
      return;
    }
    if (reponseApresBlocage || !monTour) return;
    if (cibleAttaqueEnCours) {
      if (entite.id === cibleAttaqueEnCours) basculerAttaquant(entite);
      force();
      return;
    }
    if (!phase) {
      setPhase(true);
      if (entite.ready && !entite.attaquee) {
        const cibleRequise = ciblesCoupRapideLegales(entite, 'joueur').length > 0;
        setAttaquants([entite.id]);
        setCiblesAttaque({});
        setCibleAttaqueEnCours(cibleRequise ? entite.id : null);
      } else {
        setAttaquants([]);
        setCiblesAttaque({});
        setCibleAttaqueEnCours(null);
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
    if (cibleAttaqueEnCours) {
      const attaquant = duel.joueur.creatures.find((candidate) => candidate.id === cibleAttaqueEnCours);
      const ciblesLegales = ciblesCoupRapideLegales(attaquant, 'joueur');
      if (!attaquant || !ciblesLegales.some((cible) => cible.id === entite.id)) {
        jouerSfx('erreur');
        force();
        return;
      }
      jouerSfx('coup_rapide');
      const cibles = { ...ciblesAttaque, [attaquant.id]: entite.id };
      setCiblesAttaque(cibles);
      const prochainId = prochainCoupRapideSansCible(attaquants, cibles);
      setCibleAttaqueEnCours(prochainId);
      force();
      return;
    }
    if (reponseActive && combatEntrant?.coteAttaquant === 'sorcier' && combatEntrant.attaquants.includes(entite.id)) {
      if (combatEntrant.ciblesAttaque?.[entite.id]) {
        setBloqueurSelectionne(null);
        force();
        return;
      }
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
      .some((entite) => entite.id === id && entite.ready && !entite.attaquee));
    if (!attaquantsValides) {
      jouerSfx('erreur');
      setPhase(false);
      setAttaquants([]);
      setCiblesAttaque({});
      setCibleAttaqueEnCours(null);
      force();
      return;
    }

    const cibleManquante = prochainCoupRapideSansCible(ids, ciblesAttaque);
    if (cibleManquante) {
      jouerSfx('erreur');
      setCibleAttaqueEnCours(cibleManquante);
      force();
      return;
    }
    jouerSfx('attaque_confirmee');
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
    setCibleAttaqueEnCours(null);
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
    if (!ids.length) { jouerSfx('erreur'); return; }
    jouerSfx('attaque_declaree');
    setPhase(true);
    setAttaquants(ids);
    setCiblesAttaque({});
    const prochainId = prochainCoupRapideSansCible(ids, {});
    setCibleAttaqueEnCours(prochainId);
    force();
  };

  const annulerAttaque = () => {
    jouerSfx('annuler');
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleAttaqueEnCours(null);
    force();
  };

  const cliquerSorcier = () => {
    if (cibleEnCours && carteCiblee?.cibles?.includes('sorcier')) {
      jouerSfx('select');
      lancerMagie(cibleEnCours, 'sorcier');
      return;
    }
    if (!monTour) return;
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
    if (combatEntrant.ciblesAttaque?.[attaquantId]) {
      setBloqueurSelectionne(null);
      jouerSfx('erreur');
      force();
      return;
    }
    const retireDeCetteAttaque = (combatEntrant?.blocages[attaquantId] ?? []).includes(bloqueurId);
    if (!retireDeCetteAttaque && !rpgPeutBloquerAttaquant(bloqueur, attaquant)) {
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
    jouerSfx(retireDeCetteAttaque ? 'annuler' : 'blocage');
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
      rpgFinDeTour(duel);
      force();
      return;
    }
    const vivants = new Set(attaquantsVivants);
    const blocages = Object.fromEntries(Object.entries(combatEntrant.blocages).filter(([id]) => vivants.has(id)));
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
    );
    if (!res.ok) {
      jouerSfx('erreur');
      force();
      return;
    }
    jouerSfx('combat');
    if (res.resume.frappeSorcier > 0) { jouerSfx('degats', 0.18); }
    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    if (res.resume.frappeSorcier > 0) declencherImpactEcran('received');
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    if (!rpgVainqueur(duel)) rpgFinDeTour(duel);
    force();
  };

  const resoudreAttaqueJoueur = (combat = combatEntrant) => {
    if (!combat || combat.coteAttaquant !== 'joueur') return;
    const attaquantsVivants = combat.attaquants
      .filter((id) => duel.joueur.creatures.some((entite) => entite.id === id));
    if (!attaquantsVivants.length) {
      rpgFermerFenetreReponse(duel);
      setCombatEntrant(null);
      force();
      return;
    }

    const bloqueursVivants = new Set(duel.sorcier.creatures
      .filter((entite) => !entite.attaquee)
      .map((entite) => entite.id));
    const blocages = Object.fromEntries(attaquantsVivants.map((id) => [
      id,
      (combat.blocages[id] ?? []).filter((bloqueurId) => bloqueursVivants.has(bloqueurId)),
    ]));
    const attaquantsBloques = (combat.attaquantsBloques
      ?? combat.attaquants.filter((id) => combat.blocages[id]?.length))
      .filter((id) => attaquantsVivants.includes(id));
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
    );
    if (!res.ok) {
      jouerSfx('erreur');
      force();
      return;
    }

    jouerSfx('combat');
    if (res.resume.frappeSorcier > 0) { jouerSfx('degats_sorcier', 0.18); }
    else { jouerSfx('blocage', 0.2); }
    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    if (res.resume.frappeSorcier > 0) declencherImpactEcran('dealt');
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    force();
  };

  const resoudreCombat = () => {
    if (combatEntrant?.coteAttaquant === 'joueur') resoudreAttaqueJoueur();
    else resoudreAttaqueEnnemie();
  };

  const finDuTour = () => {
    if (!monTour || combatEntrant) { jouerSfx('erreur'); return; }
    jouerSfx('tour');
    invaliderAnnulation();
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleAttaqueEnCours(null);
    setCibleEnCours(null);
    rpgFinDeTour(duel);
    force();
    later(() => {
      const champAvantIA = prendreInstantaneChamp();
      const debutJournalDestructions = rpgNombreDestructions(duel);
      rpgSorcierPrepareTerrain(duel);
      animerModificationsChamp(champAvantIA, [], debutJournalDestructions);
      annoncerSuivantSorcier();
    }, 700);
  };

  // Le sorcier annonce sa carte suivante. Le joueur répond avec un éphémère, ou laisse passer.
  const annoncerSuivantSorcier = () => {
    if (rpgVainqueur(duel)) {
      force();
      return;
    }
    const annonce = rpgSorcierAnnonceSuivante(duel, rng);
    if (!annonce) {
      declarerAttaqueSorcier();
      return;
    }
    force();
  };

  // « Laisser passer » : la carte annoncée se résout (un contre du joueur peut la défaire).
  const laisserPasser = () => {
    if (!duel.annonce) { jouerSfx('erreur'); return; }
    jouerSfx('pass');
    const champAvant = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    rpgSorcierResoudreAnnonce(duel);
    animerModificationsChamp(champAvant, [], debutJournalDestructions);
    force();
    later(annoncerSuivantSorcier, 900);
  };

  // Phase d'attaque du sorcier, une fois toutes ses cartes annoncées et résolues.
  const declarerAttaqueSorcier = () => {
      const ids = rpgChoisirAttaquants(duel, 'sorcier', { ia: duel.sorcier.ia, rng });
      if (!ids.length) {
        rpgFinDeTour(duel);
        force();
        return;
      }
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

  const bloqueursDisponibles = duel.joueur.creatures.filter((e) => !e.attaquee);
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
    ...(sortJoue?.cible?.targetIds ?? []),
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
      if (cibleEnCours && modeCible === 'allie') {
        const cible = liste.find((entite) => !rpgEstProtegee(entite, cardColors(carteCiblee)));
        if (cible) return cible;
      }
      const prete = liste.find((entite) => entite.ready && !entite.attaquee && !attaquants.includes(entite.id));
      return prete
        ?? liste.find((entite) => !entite.attaquee && !attaquants.includes(entite.id))
        ?? liste[0];
    }
    if (cibleEnCours && modeCible === 'ennemi') {
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
      return liste.find((entite) => combatEntrant.attaquants.includes(entite.id)
        && !combatEntrant.ciblesAttaque?.[entite.id]) ?? liste[0];
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
      className={`rpg-battle${viewport.mobile ? ' rpg-battle--touch' : ''}`}
      data-scene="duel"
      onPointerDown={demarrerAppuiLongCarte}
    >
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
        <button type="button" className="rpg-btn rpg-btn--primary" onClick={() => landscapeRef.current?.enter()}>Activer le paysage</button>
        <small>Si votre navigateur refuse la rotation automatique, tournez l’appareil et désactivez son verrouillage d’orientation.</small>
        <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => setEcran('jouer')}>Retour au menu</button>
      </div>}

      <div
        ref={tableRef}
        inert={viewport.portrait ? true : undefined}
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
        <nav className="rpg-duel-nav" aria-label="Navigation du duel">
          <strong>LE SABLIER</strong>
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
        </nav>

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
          title="Le sorcier adverse">
          <span className="rpg-wizard-plate__avatar rpg-wizard-plate__avatar--ennemi" aria-hidden="true"><img src={cardArt(etageHistoire ? etageHistoire.avatar ?? 'ifrit-al-ahmar' : deckBoxArtUrl(deckAdverseAffiche))} alt="" /></span>
          <span className="rpg-wizard-plate__identity">
            <strong>{etageHistoire ? etageHistoire.nom : 'LE SORCIER'}</strong>
            <small>{etageHistoire ? etageHistoire.fonction : `${deckAdverseAffiche.name} · ${deckColorLabel(deckAdverseAffiche)}`}</small>
          </span>
          <span className="rpg-wizard-plate__pv">🛡 {duel.sorcier.pv}{duel.sorcier.bouclier > 0 ? ` · ◇ ${duel.sorcier.bouclier}` : ''}</span>
          <span className="rpg-wizard-plate__sable">
            <i className="mana mana--braise" title="Mana braise">{duel.sorcier.mana.braise}</i>
            <i className="mana mana--eau" title="Mana eau">{duel.sorcier.mana.eau}</i>
            <i className="mana mana--sable" title="Mana sable">{duel.sorcier.mana.sable}</i>
            <i className="mana mana--neige" title="Mana neige">{duel.sorcier.mana.neige}</i>
          </span>
          <span className="rpg-wizard-plate__zones">Main · {duel.sorcier.main.length}<span className="rpg-mobile-zones"> · Paquet {duel.sorcier.deck.length} · Cimetière {duel.sorcier.cimetiere.length}</span></span>
        </button>

        <div className="rpg-terrains rpg-terrains--ennemi" aria-label="Terrains du sorcier">
          {groupTerrainStacks(duel.sorcier.terrains).map((groupe) => {
            const terrain = groupe.terrain;
            const carte = cardById(terrain.carteId);
            return (
              <button
                type="button"
                key={groupe.carteId}
                aria-label={`${carte?.name ?? 'Terrain adverse'}, ${groupe.count} terrains, ${groupe.available} disponibles, ${groupe.tapped} engagés`}
                className={`rpg-terrain rpg-terrain-stack${groupe.tapped && groupe.available ? ' is-partially-tapped' : ''} rpg-terrain--type-terrain rpg-terrain--elem-${carte?.element ?? 'sable'} ${cardFrameClass(carte)} ${terrain.tapped ? 'is-tapped' : ''}`}
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
                <span className="rpg-terrain-stack__count" aria-hidden="true">×{groupe.count}</span>
              </button>
            );
          })}
        </div>

        <div className="card-row card-row--ennemi" aria-label="Champ du sorcier">
          {duel.sorcier.creatures.length ? campEnnemi.piles.map((pile) => {
            const cle = clePile('ennemi', pile.carteId);
            const deployee = pileDeployee('ennemi', pile);
            const affichees = deployee ? pile.entites : [teteDePile('ennemi', pile)];
            const nom = cardById(pile.carteId)?.name ?? 'ces créatures';
            return (
              <Fragment key={empilerCartes ? pile.carteId : pile.entites[0].id}>
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
                      spellTarget={Boolean(sortJoue?.cible.targetIds.includes(entite.id))}
                      coupRapideCible={Object.values(combatEntrant?.ciblesAttaque ?? {}).includes(entite.id)}
                      canTarget={Boolean(
                        (cibleEnCours && modeCible === 'ennemi' && !rpgEstProtegee(entite, cardColors(carteCiblee)))
                        || (cibleAttaqueEnCours && ciblesCoupRapideLegales(
                          duel.joueur.creatures.find((attaquant) => attaquant.id === cibleAttaqueEnCours),
                          'joueur',
                        ).some((cible) => cible.id === entite.id))
                      )}
                      canReceiveBlocker={Boolean(reponseActive && combatEntrant?.coteAttaquant !== 'joueur' && combatEntrant?.attaquants.includes(entite.id) && !combatEntrant?.ciblesAttaque?.[entite.id])}
                      onAssignBlocker={assignerBloqueur}
                      actionFx={animationsEntites[entite.id]}
                      tilt={TILTS[i % TILTS.length]}
                      onHoverCard={afficherApercuSurvol}
                      onLeaveHoverCard={masquerApercuSurvol}
                      onClick={() => cliquerCreatureEnnemie(entite)}
                    />
                  );
                  if (deployee || pile.entites.length < 2) return carte;
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
          }) : <span className="rpg-empty-lane">Les gardiens du sorcier attendent.</span>}
        </div>
        <div className="card-row card-row--equipe" aria-label="Votre champ de bataille">
          {duel.joueur.creatures.length ? campJoueur.piles.map((pile) => {
            const cle = clePile('joueur', pile.carteId);
            const deployee = pileDeployee('joueur', pile);
            const affichees = deployee ? pile.entites : [teteDePile('joueur', pile)];
            const nom = cardById(pile.carteId)?.name ?? 'ces créatures';
            return (
              <Fragment key={empilerCartes ? pile.carteId : pile.entites[0].id}>
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
                      spellTarget={Boolean(sortJoue?.cible.targetIds.includes(entite.id))}
                      blocking={bloqueursSelectionnes.has(entite.id)}
                      selectedBlocker={bloqueurSelectionne === entite.id}
                      coupRapideCible={Object.values(combatEntrant?.ciblesAttaque ?? {}).includes(entite.id)}
                      canTarget={Boolean(cibleEnCours && modeCible === 'allie' && !rpgEstProtegee(entite, cardColors(carteCiblee)))}
                      canDragBlocker={Boolean(reponseActive && !reponseApresBlocage && bloqueursDisponibles.some((bloqueur) => bloqueur.id === entite.id))}
                      draggedBlocker={bloqueurGlisse === entite.id}
                      onStartBlockerDrag={commencerGlisserBloqueur}
                      onEndBlockerDrag={terminerGlisserBloqueur}
                      actionFx={animationsEntites[entite.id]}
                      playerTurn={monTour}
                      tilt={TILTS[(i + 2) % TILTS.length]}
                      onHoverCard={afficherApercuSurvol}
                      onLeaveHoverCard={masquerApercuSurvol}
                      onClick={() => cliquerCreatureJoueur(entite)}
                    />
                  );
                  if (deployee || pile.entites.length < 2) return carte;
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
          }) : <span className="rpg-empty-lane">Vos alliés prendront place ici.</span>}
        </div>

        {cartesEnDestruction.map((effet) => {
          const carteDetruite = cardById(effet.cardId);
          return (
            <div
              key={effet.effectId}
              className={`rpg-card-destruction-fx ${cardFrameClass(carteDetruite)}${effet.bruleeParBraise ? ' is-burning' : ''}`}
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

        <div className="rpg-terrains rpg-terrains--joueur" aria-label="Vos terrains : clic manuel pour produire du mana, ou engagement automatique au paiement">
          {groupTerrainStacks(duel.joueur.terrains).map((groupe) => {
            const terrain = groupe.terrain;
            const carte = cardById(terrain.carteId);
            const couleursProduites = terrainManaColors(terrain.carteId);
            const terrainInactif = (!monTour && !reponseActive) || terrain.tapped;
            const choixOuvert = terrainManaChoix?.terrainId === terrain.id;
            const production = couleursProduites.map(couleurLabel).join(' ou ');
            return (
              <button
                key={groupe.carteId}
                type="button"
                className={`rpg-terrain rpg-terrain-stack${groupe.tapped && groupe.available ? ' is-partially-tapped' : ''} rpg-terrain--joueur rpg-terrain--type-terrain rpg-terrain--elem-${carte?.element ?? 'sable'} ${cardFrameClass(carte)} ${terrain.tapped ? 'is-tapped' : ''}${couleursProduites.length > 1 ? ' is-flexible-mana' : ''}`}
                style={cardFrameStyle(carte)}
                data-card-id={terrain.carteId}
                data-terrain-id={terrain.id}
                data-terrain-count={groupe.count}
                data-available-count={groupe.available}
                data-tapped-count={groupe.tapped}
                data-mana-colors={couleursProduites.join(' ')}
                aria-disabled={terrainInactif}
                aria-haspopup={couleursProduites.length > 1 ? 'dialog' : undefined}
                aria-expanded={couleursProduites.length > 1 ? choixOuvert : undefined}
                aria-controls={couleursProduites.length > 1 ? 'rpg-terrain-mana-choice' : undefined}
                aria-label={`${carte?.name ?? 'Terrain'}, ${groupe.count} terrains, ${groupe.available} disponibles, ${groupe.tapped} engagés${terrain.tapped ? ', engagé' : terrainInactif ? ', indisponible' : couleursProduites.length > 1 ? `, cliquer pour choisir un mana ${production}` : `, disponible pour produire un mana ${production}`}`}
                onClick={(event) => {
                  if (!terrainInactif) demanderCouleurMana(event, terrain);
                }}
                onMouseEnter={(event) => afficherApercuSurvol(carte, event)}
                onMouseLeave={masquerApercuSurvol}
                onFocus={(event) => afficherApercuSurvol(carte, event)}
                onBlur={masquerApercuSurvol}
              >
                <img src={cardArt(terrain.carteId)} alt="" />
                <span className="rpg-terrain-stack__count" aria-hidden="true">×{groupe.count}</span>
              </button>
            );
          })}
        </div>
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

        <div className={`rpg-wizard-plate rpg-wizard-plate--joueur${sortJoue?.cible.targetPlate === 'joueur' ? ' is-spell-target' : ''}`} title="Vous">
          <span className="rpg-wizard-plate__avatar rpg-wizard-plate__avatar--joueur" aria-hidden="true"><img src={cardArt('tin-hinan')} alt="" /></span>
          <span className="rpg-wizard-plate__identity"><strong>VOUS</strong><small>{deckJoueurAffiche.name} · {deckColorGlyph(deckJoueurAffiche)} {deckColorLabel(deckJoueurAffiche)}</small></span>
          <span className="rpg-wizard-plate__pv">🛡 {duel.joueur.pv}{duel.joueur.bouclier > 0 ? ` · ◇ ${duel.joueur.bouclier}` : ''}</span>
          <span className="rpg-wizard-plate__sable">
            <i className="mana mana--braise" title="Mana braise">{duel.joueur.mana.braise}</i>
            <i className="mana mana--eau" title="Mana eau">{duel.joueur.mana.eau}</i>
            <i className="mana mana--sable" title="Mana sable">{duel.joueur.mana.sable}</i>
            <i className="mana mana--neige" title="Mana neige">{duel.joueur.mana.neige}</i>
          </span>
          <span className="rpg-wizard-plate__zones">Main · {duel.joueur.main.length}<span className="rpg-mobile-zones"> · Paquet {duel.joueur.deck.length} · Cimetière {duel.joueur.cimetiere.length}</span></span>
        </div>

        <div className="rpg-bottombar">
          <div className="rpg-bottombar__status">
            <div className={`rpg-turn-indicator ${classeIndicateurTour}`} role="status" aria-live="polite">
              <span className="rpg-turn-indicator__lamp" aria-hidden="true" />
              <strong>{indicateurTour}</strong>
            </div>
          </div>
          <ol className="rpg-log" aria-live="polite">
            {duel.log.slice(-6).map((line, index) => (
              <li key={`${duel.log.length}-${index}-${line}`} className="rpg-log__line">{line}</li>
            ))}
          </ol>
          <div className="rpg-actions">
            <PhaseTrack current={phaseDuelActive} />
            {fenetreSort && (
              <section
                className="rpg-annonce-sort"
                role="status"
                aria-live="polite"
                aria-label={`Le sorcier annonce ${carteAnnoncee?.name ?? 'une carte'}${cibleAnnoncee ? `. Cible : ${cibleAnnoncee.nom}` : ''}. Répondez avec un éphémère, ou laissez passer.`}
              >
                <HoverCardPreview carte={carteAnnoncee} cible={cibleAnnoncee} variante="annonce" />
                <button
                  type="button"
                  className="rpg-btn rpg-annonce-sort__pass"
                  aria-label={`Laisser passer ${carteAnnoncee?.name ?? 'la carte annoncée'}`}
                  onClick={laisserPasser}
                >
                  <span aria-hidden="true">➜</span>
                  <span>Laisser passer</span>
                </button>
              </section>
            )}
            <div className="rpg-actions__row">
              <div className="rpg-actions__combat" role="group" aria-label="Actions de combat">
                {!phase ? (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--attaque rpg-btn--attaque-tous"
                    disabled={!monTour || !prets.length || Boolean(combatEntrant)}
                    onClick={declarerAttaqueAvecTous}
                  >
                    <CombatActionIcon type="attack-all" /> Attaquer avec tous ({prets.length})
                  </button>
                ) : (
                  <>
                    <button type="button" className="rpg-btn rpg-btn--attaque rpg-btn--confirmer-attaque" disabled={!attaquants.length || Boolean(cibleAttaqueEnCours) || Boolean(prochainCoupRapideSansCible(attaquants, ciblesAttaque))} onClick={() => lancerAttaque()}>
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
                  <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => { setCibleEnCours(null); carteCibleeHandIndexRef.current = null;  }}>
                    Annuler la cible
                  </button>
                )}
              </div>
              <div className="rpg-actions__turn" role="group" aria-label="Actions de tour">
                {annulationDisponible && monTour && !phase && !cibleEnCours && !combatEntrant && (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--undo"
                    aria-label="Annuler la dernière action"
                    onClick={annulerDerniereAction}
                  >
                    ↶ Annuler la dernière action
                  </button>
                )}
                <button type="button" className="rpg-btn rpg-btn--endturn" onClick={finDuTour}
                  disabled={!monTour || phase || Boolean(cibleEnCours) || Boolean(combatEntrant)}>
                  ⧗ Fin du tour
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`rpg-hand-dock${combatEntrant ? ' is-open' : ''}`} aria-label="Votre main">
          <div className="rpg-hand">
            {groupesMain.map((groupe) => {
              const carteId = groupe.carteId;
              const i = groupe.indices[0];
              const exemplaires = groupe.indices.length;
              const carte = cardById(carteId);
              if (!carte) return null;
              const estTerrain = carte.kind === 'terrain';
              const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
              const peutRepondre = reponseActive && carte.instant;
              // Une seule règle pour le halo doré, le glisser-déposer et le
              // clic : deux copies de la règle finissaient par diverger, et
              // une carte allumée mais injouable enferme le joueur.
              const jouable = peutJouerCarte(carte);
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
                  draggable={jouable}
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
                    cardFrameClass(carte),
                    piocheEnCours ? 'rpg-hand-card--drawing' : '',
                    carte.instant ? 'is-instant' : '',
                    cibleEnCours === carteId ? 'is-targeting' : '',
                    jouable ? 'is-playable' : 'is-unplayable',
                    carteGlissee === carteId ? 'is-dragging' : '',
                    enVol ? `rpg-card-flight is-flying${estTerrain ? ' rpg-card-flight--terrain' : ''}` : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    '--tilt': `${TILTS[i % TILTS.length]}deg`,
                    ...cardFrameStyle(carte),
                    ...(piocheEnCours ? { '--rpg-draw-delay': `${piocheEnCours.delay}ms` } : {}),
                    ...styleVol,
                  }}
                  data-draw-token={piocheEnCours?.token}
                  data-card-id={carteId}
                  data-hand-index={i}
                  data-pile-count={exemplaires}
                  data-rpg-card-flight={enVol ? (estTerrain ? 'terrain' : 'creature') : undefined}
                  data-rpg-flight-card-id={enVol ? carteId : undefined}
                  data-jouable={jouable ? 'true' : 'false'}
                  aria-label={`${carte.name}${exemplaires > 1 ? ` — pile de ${exemplaires} exemplaires identiques` : ''} — ${cardFaceTypeLine(carte)} — couleur ${cardColorLabel(carte)}${estTerrain ? '' : ` — coût ${cardCostLabel(carte)}`}${carte.text ? ` — ${carte.text}` : ''} — cliquer pour ${carte.kind === 'magie' ? 'demander le lancement du sort' : 'la jouer'}${jouable ? ', paiement automatique (ou glisser-déposer)' : ', indisponible pour le moment'}`}
                >
                  <img className="rpg-hand__img" src={cardArt(carte)} alt="" aria-hidden="true" />
                  <CardElementBadge carte={carte} />
                  <span className="rpg-hand__title">
                    <ManaCost carte={carte} showElement={false} />
                  </span>
                  <span className="rpg-hand__type">{cardFaceTypeLine(carte)}</span>
                  {estCreature && (
                    <span className="rpg-hand__stats" aria-label={`Attaque ${carte.atk}, défense ${carte.def}`}>
                      <span className="rpg-hand__stat rpg-hand__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{carte.atk}</span></span>
                      <span className="rpg-hand__stat rpg-hand__stat--def"><CardStatIcon type="defense" /><span className="rpg-stat-value">{carte.def}</span></span>
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
        {apercuSurvol && !apercuMagie && (
          <HoverCardPreview
            carte={cardById(apercuSurvol.carteId)}
            style={apercuSurvol.style}
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
                : vainqueur === 'joueur'
                  ? 'Bab El respire : le cycle tient encore un soir.'
                  : 'Le sable recouvre votre Nom. L’Astrolabe sonne pour quelqu’un d’autre.'}
            </p>
            {etageHistoire ? (
              <div className="rpg-overlay__actions">
                {vainqueur === 'joueur' && etageSuivant && (
                  <button type="button" className="rpg-btn rpg-btn--primary" onClick={() => demarrerEtage(etageSuivant.id)}>
                    Étage suivant : {etageSuivant.nom} <span aria-hidden="true">→</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`rpg-btn ${vainqueur === 'joueur' && !etageSuivant ? 'rpg-btn--primary' : 'rpg-btn--ghost'}`}
                  onClick={() => demarrerEtage(etageHistoire.id)}
                >
                  {vainqueur === 'joueur' ? 'Rejouer l’étage' : 'Recommencer l’étage'}
                </button>
                <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => setEcran('histoire')}>
                  {vainqueur === 'joueur' && !etageSuivant ? 'Tour terminée — retour aux tours' : 'Retour aux tours'}
                </button>
              </div>
            ) : (
              <button type="button" className="rpg-btn rpg-btn--primary" onClick={() => nouvellePartie()}>
                Nouvelle partie
              </button>
            )}
          </div>
        )}
      </div>
      {apercuAppui && <ApercuCarteAppuiLong carte={cardById(apercuAppui)} onFermer={fermerApercuAppui} />}
    </div>
  );
}
