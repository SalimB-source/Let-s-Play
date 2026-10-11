/**
 * Le Sablier de Bab El — duel de cartes tactique.
 * Les tours gardent leur liberté d'une partie de cartes à collectionner :
 * poser un terrain, lancer des sorts, déclarer ses attaquants, puis défendre
 * pendant la fenêtre de réponse de l'adversaire.
 */

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './rpg-battle.css';
import {
  rpgCibleAuto,
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
  rpgTourSorcierPreparationIA,
  rpgVainqueur,
} from './rpgDuel.js';
import {
  cardRarityInfo,
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
const ELEMENT_GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', hybride: '🔥⏳' };
const ELEMENT_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', hybride: 'Sable + Braise' };
const CARD_ART_CACHE_VERSIONS = {
  'djinn-du-souk': 'munch-impressionniste-v3',
  'ifrit-al-ahmar': 'sourire-tempete-huile-v1',
  feriel: 'lance-de-feu-photoreal-v1',
  'trait-de-braise': 'trait-feu-sorcier-appeure-v1',
  'anqa-des-braises': 'anqa-des-braises-huile-v1',
};
const cardArt = (id) => {
  const artId = cardArtId(id);
  const revision = CARD_ART_CACHE_VERSIONS[artId];
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

function cardEffectLines(text) {
  if (!text || text === '—') return [];
  return String(text)
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((effet) => effet.trim())
    .filter(Boolean);
}

function deckColors(deck) {
  return cardColors({ element: deck?.element, colors: deck?.elements });
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

function mesurerDestinationVol(table, kind, from) {
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
    const last = existing.at(-1);
    const lastRect = last?.getBoundingClientRect();
    const lastWidth = last?.offsetWidth || lastRect?.width || 0;
    const width = lastWidth || readPx(zone.querySelector('.rpg-terrain--joueur'), 'width', Math.min(from.width, 68));
    const height = last?.offsetHeight || lastRect?.height || width * 1.25;
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

function cardRarityClass(carte) {
  return `rpg-card--rarity-${cardRarityInfo(carte).key}`;
}

function cardRarityStyle(carte) {
  const { color } = cardRarityInfo(carte);
  return { '--rpg-rarity-color': color, '--rarity-color': color };
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
              className={`rpg-card-pile__card rpg-card-pile__card--top ${cardRarityClass(carteDuDessus)}`}
              style={cardRarityStyle(carteDuDessus)}
              src={cardArt(topCard)}
              alt=""
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
        cardRarityClass(carte),
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
      style={{ '--tilt': `${tilt}deg`, ...cardRarityStyle(carte) }}
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
      aria-label={`${nom}, ${cardFaceTypeLine(carte)}, couleur ${carte?.element ?? 'inconnue'}, coût ${carte?.cost ?? 0}, attaque ${entite.atk}, défense ${entite.pv}${actionFx?.statsUp ? ', attaque ou défense augmentée' : ''}${entite.rapidite ? ', rapidité, peut attaquer le tour où elle arrive' : ''}${entite.envol ? ', envol, ne peut être bloquée que par une créature avec envol' : ''}${protectionActive ? `, protection contre ${protectionLabel} pendant encore ${entite.protection.toursRestants} tour${entite.protection.toursRestants > 1 ? 's' : ''}` : ''}${entite.esquive ? `, esquive ${entite.esquive} contre les attaques et magies` : ''}${blessee ? ', blessée' : ''}${malInvocation ? ', mal d’invocation' : ''}${entite.bouclier ? `, bouclier ${entite.bouclier}` : ''}${blocking ? ', bloqueur assigné, flèche jaune vers son attaquant' : ''}${canDragBlocker ? ', bloqueur disponible, glisser sur une créature attaquante' : ''}${selectedBlocker ? ', bloqueur sélectionné, cliquez une créature attaquante pour lui assigner le blocage' : ''}${coupRapideCible ? ', ciblée par Coup rapide' : ''}`}
      aria-pressed={Boolean(selected || selectedBlocker)}
    >
      <img className="rpg-card__img" src={cardArt(carte)} alt="" aria-hidden="true" />
      {blessee && <span className="rpg-card__blood" aria-hidden="true" />}
      <CardElementBadge carte={carte} />
      <header className="rpg-card__title">
        <ManaCost carte={carte} compact showElement={false} />
      </header>
        <div className="rpg-card__type">
          <span>{cardFaceTypeLine(carte)}</span>
        </div>
        <footer className="rpg-card__foot" aria-label={`Attaque ${entite.atk}, défense ${entite.pv}${blessee ? ', blessée' : ''}`}>
          <span className="rpg-card__stat--atk">⚔ {entite.atk}</span>
          <span className={`rpg-card__pt${blessee ? ' is-wounded' : ''}`}>🛡 {entite.pv}</span>
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
        x: rect.left + rect.width / 2 - tableRect.left,
        y: rect.top + rect.height / 2 - tableRect.top,
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

function CardPreview({ carte, jouable, onClose }) {
  const rarete = cardRarityInfo(carte);
  useEffect(() => {
    const fermerAvecEchap = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fermerAvecEchap);
    return () => window.removeEventListener('keydown', fermerAvecEchap);
  }, [onClose]);

  if (!carte) return null;
  const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
  const effets = cardEffectLines(carte.text);
  return (
    <div
      className="rpg-card-preview-backdrop"
      role="presentation"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        className={`rpg-card-preview rpg-card-preview--${carte.element} rpg-card-preview--type-${cardFrameType(carte)} ${cardRarityClass(carte)}${carte.kind === 'terrain' ? ' rpg-card-preview--terrain' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`rpg-card-preview-title-${carte.id}`}
      >
        <button type="button" className="rpg-card-preview__close" onClick={onClose} aria-label="Fermer l’aperçu">×</button>
        <div className={`rpg-card-preview__art ${cardRarityClass(carte)}`} style={cardRarityStyle(carte)}>
          <img src={cardArt(carte)} alt={`Illustration de ${carte.name}`} />
          <CardElementBadge carte={carte} />
          <span>{rarete.label}</span>
        </div>
        <div className="rpg-card-preview__details">
          <header>
            <h2 id={`rpg-card-preview-title-${carte.id}`}>{carte.name}</h2>
            <ManaCost carte={carte} showElement={false} />
          </header>
          <p className="rpg-card-preview__type">{cardFaceTypeLine(carte)}</p>
          <div className="rpg-card-preview__rules" aria-label="Effets">
            {effets.length
              ? effets.map((effet, index) => <span key={`${index}-${effet}`}>{effet}</span>)
              : <span>Aucune capacité.</span>}
          </div>
          {estCreature && <p className="rpg-card-preview__stats">⚔ {carte.atk} <span>·</span> 🛡 {carte.def}</p>}
          {carte.flavor && <p className="rpg-card-preview__flavor">« {carte.flavor} »</p>}
          <p className="rpg-card-preview__hint">
            {jouable
              ? 'Fermez cet aperçu puis glissez la carte sur la table ; vos terrains paieront automatiquement son coût.'
              : 'Cette carte n’est pas jouable maintenant, mais vous pouvez consulter ses détails.'}
          </p>
        </div>
      </section>
    </div>
  );
}

function HoverCardPreview({ carte, style, spellPlayed = false }) {
  if (!carte) return null;
  const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
  const estTerrain = carte.kind === 'terrain';
  const effet = carte.text && carte.text !== '—' ? carte.text : null;
  const effets = cardEffectLines(effet);
  return (
    <aside
      className={`rpg-hover-card-preview rpg-hover-card-preview--${carte.element} rpg-hover-card-preview--type-${cardFrameType(carte)} ${cardRarityClass(carte)}${estTerrain ? ' rpg-hover-card-preview--terrain' : ''}${spellPlayed ? ' is-spell-preview' : ''}`}
      role="tooltip"
      aria-label={`Aperçu de ${carte.name} : ${cardFaceTypeLine(carte)}${estTerrain ? '' : `, coût ${cardCostLabel(carte)}`}${effet ? `, effet ${effet}` : ''}${estCreature ? `, attaque ${carte.atk}, défense ${carte.def}` : ''}`}
      style={{ ...style, ...cardRarityStyle(carte) }}
    >
      <div
        className={`rpg-hover-card-preview__face ${cardRarityClass(carte)}`}
        style={cardRarityStyle(carte)}
        aria-hidden="true"
      >
        <img src={cardArt(carte)} alt="" />
        <CardElementBadge carte={carte} />
      </div>
      <div className="rpg-hover-card-preview__details">
        <p className="rpg-hover-card-preview__type">{cardFaceTypeLine(carte)}</p>
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
        className={`rpg-spell-played__art ${cardRarityClass(carte)}`}
        style={cardRarityStyle(carte)}
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

function GameModeMenu({ screen, selectedDeckId, onSelectDeck, onChangeScreen, onStartGame, onResumeGame, hasGame, onHoverCard, onLeaveHoverCard }) {
  const [catalogueCouleur, setCatalogueCouleur] = useState('toutes');
  const [catalogueType, setCatalogueType] = useState('tous');
  const selectedDeck = RPG_DECKS.find((deck) => deck.id === selectedDeckId) ?? RPG_DECKS[0];
  const defaultPlayerDeck = RPG_DECKS.find((deck) => deck.role === 'joueur') ?? RPG_DECKS[0];
  const playerDeck = selectedDeck?.role === 'joueur' ? selectedDeck : defaultPlayerDeck;
  const opponentDeck = RPG_DECKS.find((deck) => deck.role === 'adversaire');
  const selectedStats = selectedDeck ? deckStats(selectedDeck) : { terrains: 0, creatures: 0, magies: 0 };
  const selectedCards = selectedDeck ? deckCardList(selectedDeck) : [];
  const selectedValidation = selectedDeck ? rpgValiderDeck(selectedDeck.cardIds) : { ok: false, raison: 'Aucun deck disponible.' };
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
  const menuBackground = `linear-gradient(105deg, rgba(8, 7, 13, .96) 0%, rgba(8, 7, 13, .82) 48%, rgba(8, 7, 13, .72) 100%), url("${import.meta.env.BASE_URL}sablier-de-bab-el-keyart.jpg")`;

  return (
    <section className={`rpg-mode-menu rpg-mode-menu--${screen}`} style={{ backgroundImage: menuBackground }}>
      <div className="rpg-mode-menu__content">
        <header className="rpg-mode-menu__header">
          <div className="rpg-mode-menu__brand">
            <span className="rpg-mode-menu__eyebrow">DUEL TACTIQUE · ALGÉRIE FANTASTIQUE</span>
            <h1>Le Sablier <span>de Bab El</span></h1>
            <p>Les portes de la ville attendent leur prochain gardien.</p>
          </div>
          <nav className="rpg-mode-menu__switch" aria-label="Modes de jeu">
            <button type="button" className={screen === 'jouer' ? 'is-active' : ''} aria-current={screen === 'jouer' ? 'page' : undefined} onClick={() => onChangeScreen('jouer')}>
              <span aria-hidden="true">⚔</span> Jouer
            </button>
            <button type="button" className={screen === 'decks' ? 'is-active' : ''} aria-current={screen === 'decks' ? 'page' : undefined} onClick={() => onChangeScreen('decks')}>
              <span aria-hidden="true">▤</span> Deck
            </button>
            <button type="button" className={screen === 'catalogue' ? 'is-active' : ''} aria-current={screen === 'catalogue' ? 'page' : undefined} onClick={() => onChangeScreen('catalogue')}>
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
                <button type="button" className="rpg-menu-button rpg-menu-button--primary" onClick={onStartGame}>
                  ⚔ Lancer le duel <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="rpg-mode-menu__hero-mark" aria-hidden="true">باب</div>
            </section>

            <aside className="rpg-mode-menu__loadout">
              <div className="rpg-mode-menu__loadout-heading">
                <div><span className="rpg-mode-menu__eyebrow">VOTRE AFFRONTEMENT</span><h2>Decks de départ</h2></div>
                <button type="button" className="rpg-menu-link" onClick={() => onChangeScreen('decks')}>Voir les decks <span aria-hidden="true">→</span></button>
              </div>
              {playerDeck && (
                <article className="rpg-menu-deck-summary rpg-menu-deck-summary--player">
                  <img src={imageForDeck(playerDeck)} alt="" />
                  <div><small>VOTRE DECK · {deckColorGlyph(playerDeck)} {deckColorLabel(playerDeck).toUpperCase()}</small><strong>{playerDeck.name}</strong><span>{deckStats(playerDeck).creatures} créatures · {deckStats(playerDeck).magies} magies</span></div>
                </article>
              )}
              {opponentDeck && (
                <article className="rpg-menu-deck-summary rpg-menu-deck-summary--opponent">
                  <img src={imageForDeck(opponentDeck)} alt="" />
                  <div><small>ADVERSAIRE · {deckColorGlyph(opponentDeck)} {deckColorLabel(opponentDeck).toUpperCase()}</small><strong>{opponentDeck.name}</strong><span>Affrontez les djinns de Braise.</span></div>
                </article>
              )}
              {hasGame && <button type="button" className="rpg-menu-button rpg-menu-button--resume" onClick={onResumeGame}>↩ Reprendre le duel en cours</button>}
            </aside>
          </main>
        ) : screen === 'decks' ? (
          <main className="rpg-deck-catalog">
            <aside className="rpg-deck-catalog__rail">
              <div className="rpg-deck-catalog__intro"><span className="rpg-mode-menu__eyebrow">COLLECTION</span><h2>Vos decks</h2><p>Choisissez un deck monochrome ou hybride pour consulter sa liste et le sélectionner avant le duel.</p></div>
              <div className="rpg-deck-catalog__choices">
                {RPG_DECKS.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    className={`rpg-deck-choice rpg-deck-choice--${deckColorModifier(deck)}${selectedDeck?.id === deck.id ? ' is-selected' : ''}`}
                    aria-pressed={selectedDeck?.id === deck.id}
                    onClick={() => onSelectDeck(deck.id)}
                  >
                    <img src={imageForDeck(deck)} alt="" />
                    <span className="rpg-deck-choice__text"><small>{deck.role === 'joueur' ? 'DECK JOUEUR' : 'DECK ADVERSAIRE'}</small><strong>{deck.name}</strong><em>{deckColorGlyph(deck)} {deckColorLabel(deck)}{deckColors(deck).length > 1 ? ' · Hybride' : ' · Mono'}</em></span>
                    <span className="rpg-deck-choice__count">{deck.cardIds.length}</span>
                  </button>
                ))}
              </div>
              {hasGame && <button type="button" className="rpg-menu-button rpg-menu-button--resume" onClick={onResumeGame}>↩ Reprendre le duel</button>}
            </aside>

            {selectedDeck ? (
              <section className={`rpg-deck-detail rpg-deck-detail--${deckColorModifier(selectedDeck)}`} aria-label={`Détails du deck ${selectedDeck.name}`}>
                <header className="rpg-deck-detail__header">
                  <img src={imageForDeck(selectedDeck)} alt="" />
                  <div><span className="rpg-mode-menu__eyebrow">{selectedDeck.role === 'joueur' ? 'VOTRE DECK' : 'DECK ADVERSE'} · {deckColorGlyph(selectedDeck)} {deckColorLabel(selectedDeck).toUpperCase()} · {deckColors(selectedDeck).length > 1 ? 'HYBRIDE' : 'MONO'}</span><h2>{selectedDeck.name}</h2><p>{selectedDeck.archetype}</p></div>
                </header>
                <p className="rpg-deck-detail__description">{selectedDeck.description}</p>
                <div className="rpg-deck-detail__stats" aria-label="Répartition du deck">
                  <span><b>{selectedDeck.cardIds.length}</b><small>cartes</small></span>
                  <span><b>{selectedStats.terrains}</b><small>terrains</small></span>
                  <span><b>{selectedStats.creatures}</b><small>créatures</small></span>
                  <span><b>{selectedStats.magies}</b><small>magies</small></span>
                  <span className={selectedValidation.ok ? 'is-valid' : 'is-invalid'}><b>{selectedValidation.ok ? '✓' : '!'}</b><small>{selectedValidation.ok ? 'validé' : selectedValidation.raison}</small></span>
                </div>
                <div className="rpg-deck-detail__list-heading"><h3>Liste des cartes</h3><span>{selectedCards.length} références · quantités incluses</span></div>
                <ul className="rpg-deck-list">
                  {selectedCards.map(({ carte, count }) => (
                    <li key={carte.id}>
                      <img src={cardArt(carte)} alt="" />
                      <span><strong>{carte.name}</strong><small>{cardFaceTypeLine(carte)}{carte.kind === 'terrain' ? '' : ` · ${cardCostLabel(carte)}`}</small></span>
                      <b>×{count}</b>
                    </li>
                  ))}
                </ul>
                {selectedDeck.role === 'joueur' ? (
                  <button type="button" className="rpg-menu-button rpg-menu-button--primary rpg-deck-detail__play" onClick={onStartGame}>
                    ⚔ Jouer avec ce deck <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <p className="rpg-deck-detail__note">Ce deck Braise est réservé au sorcier adverse ; il sera chargé automatiquement pendant le duel.</p>
                )}
              </section>
            ) : <p className="rpg-deck-catalog__empty">Aucun deck n’est encore disponible.</p>}
          </main>
        ) : (
          <main className="rpg-card-catalogue" aria-label="Catalogue complet des cartes">
            <header className="rpg-card-catalogue__header">
              <div>
                <span className="rpg-mode-menu__eyebrow">COLLECTION COMPLÈTE · {RPG_DUEL_CARDS.length} CARTES</span>
                <h2>Catalogue</h2>
                <p>Parcourez les créatures, héros, terrains et magies de Bab El.</p>
              </div>
              {hasGame && <button type="button" className="rpg-menu-button rpg-menu-button--resume" onClick={onResumeGame}>↩ Reprendre le duel</button>}
            </header>
            <div className="rpg-card-catalogue__filters" aria-label="Filtres du catalogue">
              <label>
                <span>Couleur</span>
                <select aria-label="Filtrer par couleur" value={catalogueCouleur} onChange={(event) => setCatalogueCouleur(event.target.value)}>
                  <option value="toutes">Toutes les couleurs</option>
                  <option value="braise">Braise</option>
                  <option value="eau">Eau</option>
                  <option value="sable">Sable · Désert</option>
                  <option value="hybride">Hybrides · Sable + Braise</option>
                </select>
              </label>
              <label>
                <span>Type</span>
                <select aria-label="Filtrer par type" value={catalogueType} onChange={(event) => setCatalogueType(event.target.value)}>
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
                  const rarete = cardRarityInfo(carte);
                  return (
                    <article
                      key={carte.id}
                      className={`rpg-card-catalogue__card rpg-card-catalogue__card--${carte.kind}`}
                      data-card-id={carte.id}
                      data-color={carte.element}
                      data-colors={cardColors(carte).join(' ')}
                      data-type={carte.kind}
                      style={cardRarityStyle(carte)}
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
                          <span className="rpg-card-catalogue__rarity" style={{ '--rarity-color': rarete.color }}>{rarete.label}</span>
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
        <footer className="rpg-mode-menu__footer"><span>LE SABLIER DE BAB EL</span><span>STRATÉGIE · CRÉATURES · MAGIE</span></footer>
      </div>
    </section>
  );
}

export default function RpgDuelPage({ joueurDeck, sorcierDeck, sorcierPuissance = 2, rng = Math.random } = {}) {
  const [ecran, setEcran] = useState('jouer');
  const [deckSelectionneId, setDeckSelectionneId] = useState(() => RPG_DECKS.find((deck) => deck.role === 'joueur')?.id ?? '');
  const duelRef = useRef(null);
  const tableRef = useRef(null);
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
  const [carteEnApercu, setCarteEnApercu] = useState(null);
  const [apercuSurvol, setApercuSurvol] = useState(null);
  const [carteGlissee, setCarteGlissee] = useState(null);
  const [surZoneDepot, setSurZoneDepot] = useState(false);
  const [annulationDisponible, setAnnulationDisponible] = useState(false);
  const [sortJoue, setSortJoue] = useState(null);
  const [apercuMagie, setApercuMagie] = useState(null);
  const carteGlisseeRef = useRef(null);
  const clicApresGlisserRef = useRef(false);
  const annulationRef = useRef(null);
  const timerSortRef = useRef(null);
  const timerApercuMagieRef = useRef(null);
  const [message, setMessage] = useState('Les cartes au halo doré sont jouables ; glissez-les sur la table pour les jouer, leurs terrains s’engageront automatiquement.');
  const timersRef = useRef([]);
  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };
  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    animationsVisuellesTimersRef.current.forEach((id) => window.clearTimeout(id));
    if (timerSortRef.current) window.clearTimeout(timerSortRef.current);
    if (timerApercuMagieRef.current) window.clearTimeout(timerApercuMagieRef.current);
    if (timerVolRef.current) window.clearTimeout(timerVolRef.current);
    if (timerImpactRef.current) window.clearTimeout(timerImpactRef.current);
  }, []);

  useEffect(() => {
    if (!terrainManaChoix) return undefined;
    const fermerAvecEchap = (event) => {
      if (event.key === 'Escape') setTerrainManaChoix(null);
    };
    window.addEventListener('keydown', fermerAvecEchap);
    return () => window.removeEventListener('keydown', fermerAvecEchap);
  }, [terrainManaChoix]);

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
    const to = mesurerDestinationVol(table, carteEnVol.kind, from);
    const slotWidth = source.offsetWidth || from.width;
    const slotHeight = source.offsetHeight || from.height;
    setCarteEnVol((current) => current?.token === carteEnVol.token && current.phase === 'pending'
      ? { ...current, from, to, slotWidth, slotHeight, phase: 'flying' }
      : current);
  }, [carteEnVol?.token]);

  const nouvellePartie = () => {
    const deckJoueurSelectionne = RPG_DECKS.find((deck) => deck.id === deckSelectionneId && deck.role === 'joueur');
    duelRef.current = rpgNouveauDuel({
      joueurDeck: joueurDeck ?? deckJoueurSelectionne?.cardIds ?? RPG_DECK_JOUEUR_BASE,
      sorcierDeck: sorcierDeck ?? RPG_DECK_SORCIER_BASE,
      sorcierPuissance,
      rng,
    });
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
    setCarteEnApercu(null);
    setApercuSurvol(null);
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
    setMessage('À vous : posez un terrain, puis jouez les cartes au halo doré ; le paiement engage automatiquement les terrains nécessaires. Cliquez une carte pour son aperçu.');
    force();
  };

  const duel = duelRef.current;
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
    if (terrains) terrains.scrollLeft = terrains.scrollWidth;
  }, [duel?.joueur.terrains.length]);

  const afficherApercuSurvol = (carte, event) => {
    if (!carte || !event?.currentTarget) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const largeurVue = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1024);
    const hauteurVue = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 768);
    const largeurApercu = Math.min(480, Math.max(180, largeurVue - 20));
    const hauteurApercu = Math.min(300, Math.max(150, hauteurVue - 20));
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
  };
  const masquerApercuSurvol = () => setApercuSurvol(null);

  const demarrerPartie = () => {
    nouvellePartie();
    setEcran('partie');
  };

  if (ecran !== 'partie') {
    return (
      <div className="rpg-battle rpg-battle--menu" data-scene="menu">
        <GameModeMenu
          screen={ecran}
          selectedDeckId={deckSelectionneId}
          onSelectDeck={setDeckSelectionneId}
          onChangeScreen={setEcran}
          onStartGame={demarrerPartie}
          onResumeGame={() => setEcran('partie')}
          hasGame={Boolean(duel)}
          onHoverCard={afficherApercuSurvol}
          onLeaveHoverCard={masquerApercuSurvol}
        />
        {apercuSurvol && (
          <HoverCardPreview
            carte={cardById(apercuSurvol.carteId)}
            style={apercuSurvol.style}
          />
        )}
      </div>
    );
  }
  if (!duel) return null;
  const vainqueur = rpgVainqueur(duel);
  const monTour = duel.tour === 'joueur' && !vainqueur;
  const deckJoueurAffiche = RPG_DECKS.find((deck) => deck.id === deckSelectionneId && deck.role === 'joueur') ?? RPG_DECKS[0];
  const reponseActive = Boolean(combatEntrant && duel.fenetreReponse && !vainqueur);
  const reponseApresBlocage = Boolean(reponseActive && combatEntrant?.coteAttaquant === 'joueur');
  const indicateurTour = vainqueur
    ? 'DUEL TERMINÉ'
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
      const element = elements.get(entite.id);
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
    const disparues = avant.filter((entite) => !vivants.has(entite.entityId));
    if (disparues.length) {
      const entitesBrulees = new Set((Number.isInteger(debutJournalDestructions)
        ? rpgDestructionsDepuis(duel, debutJournalDestructions)
        : [])
        .filter((evenement) => evenement.sourceElements.includes('braise'))
        .map((evenement) => evenement.entityId));
      const token = ++sequenceAnimationRef.current;
      const effets = disparues.map((entite) => ({
        ...entite,
        token,
        effectId: `${token}-${entite.entityId}`,
        bruleeParBraise: entitesBrulees.has(entite.entityId),
      }));
      setCartesEnDestruction((current) => [...current, ...effets]);
      programmerNettoyageVisuel(() => {
        const ids = new Set(effets.map((effect) => effect.effectId));
        setCartesEnDestruction((current) => current.filter((effect) => !ids.has(effect.effectId)));
      }, effets.some((effect) => effect.bruleeParBraise) ? 1050 : 760);
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
    if (!annulationDisponible || !annulationRef.current || !monTour || phase || cibleEnCours || combatEntrant) return;
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
    setCarteEnApercu(null);
    setApercuSurvol(null);
    setMessage('Dernière action annulée : la table, les cartes et le mana sont revenus à leur état précédent.');
    force();
  };

  const peutJouerCarte = (carte) => {
    if (!carte || !duel.joueur.main.includes(carte.id)) return false;
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
    if (!monTour || reponseApresBlocage) return;
    const etatAvantAction = JSON.stringify(duel);
    const res = rpgPoserTerrain(duel, 'joueur', carteId);
    if (res.ok) conserverAnnulation(etatAvantAction);
    setMessage(res.ok ? `Terrain posé : ${cardById(carteId).name}. Les terrains nécessaires s’engageront automatiquement au paiement.` : 'Un seul terrain par tour.');
    force();
  };

  const engager = (terrainId, couleurChoisie = null) => {
    if (!monTour && !reponseActive) return;
    const etatAvantAction = monTour ? JSON.stringify(duel) : null;
    const res = rpgEngagerTerrain(duel, 'joueur', terrainId, couleurChoisie);
    if (res.ok && etatAvantAction) conserverAnnulation(etatAvantAction);
    setMessage(res.ok
      ? `Terrain engagé : +1 mana ${ELEMENT_LABELS[res.couleur] ?? res.couleur} disponible. Les cartes peuvent aussi engager leurs terrains automatiquement.`
      : 'Ce terrain ne peut pas produire cette couleur ou il est déjà engagé.');
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
    if (res.ok) {
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
          setMessage(`Réponse résolue : ${carte.name}. Vos attaquants ont quitté le champ ; votre tour continue.`);
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
          setMessage(`Réponse résolue : ${carte.name}. Les flèches jaunes montrent les blocages restants ; jouez un autre éphémère ou acceptez-les.`);
        }
      } else if (reponseActive && combatEntrant) {
        const vainqueurApresSort = rpgVainqueur(duel);
        if (vainqueurApresSort) {
          rpgFermerFenetreReponse(duel);
          setCombatEntrant(null);
          setMessage(`Réponse résolue : ${carte.name}. Le duel est terminé.`);
        } else {
          const attaquantsVivants = combatEntrant.attaquants
            .filter((id) => duel.sorcier.creatures.some((entite) => entite.id === id));
          if (!attaquantsVivants.length) {
            rpgFermerFenetreReponse(duel);
            setCombatEntrant(null);
            rpgFinDeTour(duel);
            setMessage(`Réponse résolue : ${carte.name}. Toutes les attaques sont stoppées ; votre tour commence.`);
          } else {
            const vivants = new Set(attaquantsVivants);
            setCombatEntrant((courant) => courant && ({
              ...courant,
              attaquants: attaquantsVivants,
              blocages: Object.fromEntries(Object.entries(courant.blocages).filter(([id]) => vivants.has(id))),
              repartitions: Object.fromEntries(Object.entries(courant.repartitions).filter(([id]) => vivants.has(id))),
            }));
            setMessage(`Réponse résolue : ${carte.name}.`);
          }
        }
      } else {
        setMessage(`Vous lancez ${carte.name}.`);
      }
    } else if (res.raison === 'cible') {
      setMessage(`Choisissez une cible légale pour ${carte.name}.`);
    } else if (res.raison === 'protection') {
      setMessage(`Cette créature est protégée contre ${cardColorLabel(carte)} et ne peut pas être ciblée par ${carte.name}.`);
    } else if (res.raison === 'timing') {
      setMessage(`${carte.name} ne peut être jouée que pendant votre tour.`);
    } else if (res.raison === 'mana') {
setMessage(`Mana insuffisant pour ${carte.name} (${cardCostLabel(carte)}).`);
    } else {
      setMessage(`Impossible de lancer ${carte.name}.`);
    }
    force();
  };

  const finaliserPoseCreature = (carteId, cibleId = null) => {
    const carte = cardById(carteId);
    carteCibleeHandIndexRef.current = null;
    const cibleCombat = cibleId ? duel.sorcier.creatures.find((entite) => entite.id === cibleId) : null;
    const nomCibleCombat = cibleCombat?.name;
    const attaqueCibleCombat = cibleCombat?.atk;
    const etatAvantAction = JSON.stringify(duel);
    const champAvantAction = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const cibleAuto = carte.arrivee?.type === 'combat' ? cibleId : (duel.sorcier.creatures[0]?.id ?? null);
    const res = rpgJouerCreature(duel, 'joueur', carteId, cibleAuto);
    if (!res.ok) {
      if (res.raison === 'mana') setMessage(`Mana insuffisant pour ${carte.name} (${cardCostLabel(carte)}).`);
      else if (res.raison === 'cible') setMessage(`Choisissez une créature adverse pour ${carte.name}.`);
      else if (res.raison === 'protection') setMessage(`${nomCibleCombat ?? 'Cette créature'} est protégée contre ${cardColorLabel(carte)}.`);
      else setMessage('Impossible.');
    } else {
      conserverAnnulation(etatAvantAction);
      animerModificationsChamp(champAvantAction, [], debutJournalDestructions);
      const protection = carte.protection
        ? ` Protection contre ${ELEMENT_LABELS[carte.protection.contre] ?? carte.protection.contre} active ce tour et jusqu’à la fin du prochain tour adverse.`
        : '';
      const combat = carte.arrivee?.type === 'combat' && nomCibleCombat
        ? ` ${carte.name} et ${nomCibleCombat} se sont infligé ${carte.atk} et ${attaqueCibleCombat} dégâts.`
        : '';
      setMessage(`Vous posez ${carte.name} (⚔ ${carte.atk} / 🛡 ${carte.def}). La créature ne peut pas attaquer avant votre prochain tour.${protection}${combat}`);
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
        if (!aUneCible) {
          setMessage(`${carte.name} n'a pas de cible légale pour l'instant.`);
        } else {
          setCibleEnCours(carteId);
          setMessage(cible === 'allie'
            ? `Choisissez une de vos créatures pour recevoir ${carte.name}.`
            : `Choisissez une créature adverse (ou le sorcier) pour ${carte.name}.`);
        }
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
        setMessage(`Choisissez une créature adverse : ${carte.name} combattra cette cible à son arrivée.`);
        force();
        return;
      }
    }
    if (!monTour) return;
    finaliserPoseCreature(carteId);
  };

  const deposerCarteSurTable = (event) => {
    event.preventDefault();
    if (carteEnVol) return;
    const carteId = event.dataTransfer?.getData('text/plain')
      || event.dataTransfer?.getData('application/x-bab-el-card')
      || carteGlisseeRef.current;
    const carte = cardById(carteId);
    carteGlisseeRef.current = null;
    setCarteGlissee(null);
    setSurZoneDepot(false);
    setCarteEnApercu(null);
    if (!carte || !duel.joueur.main.includes(carteId)) {
      carteOrigineVolRef.current = null;
      return;
    }
    if (!peutJouerCarte(carte)) {
      const explication = carte.kind === 'terrain'
        ? !monTour ? 'Vous ne pouvez poser un terrain que pendant votre tour.' : 'Vous avez déjà posé votre terrain ce tour.'
        : !monTour && !(reponseActive && carte.instant)
          ? 'Cette carte ne peut pas être jouée maintenant.'
          : `Mana insuffisant pour ${carte.name} (${cardCostLabel(carte)}).`;
      setMessage(explication);
      carteOrigineVolRef.current = null;
      force();
      return;
    }
    if (carte.kind === 'terrain') {
      demarrerVolCarte(carte, carteOrigineVolRef.current?.handIndex, () => poserTerrain(carteId));
    } else if (carte.kind === 'magie') {
      carteOrigineVolRef.current = null;
      poserCarte(carteId);
    } else if (carte.arrivee?.type === 'combat'
      && duel.sorcier.creatures.some((entite) => !rpgEstProtegee(entite, cardColors(carte)))) {
      carteCibleeHandIndexRef.current = carteOrigineVolRef.current?.handIndex ?? null;
      carteOrigineVolRef.current = null;
      poserCarte(carteId);
    } else {
      demarrerVolCarte(carte, carteOrigineVolRef.current?.handIndex, () => poserCarte(carteId));
    }
  };

  const cliquerCarteMain = (carteId) => {
    if (clicApresGlisserRef.current) {
      clicApresGlisserRef.current = false;
      return;
    }
    masquerApercuSurvol();
    setCarteEnApercu(carteId);
  };

  const resoudreCible = (entite, cote) => {
    if (!cibleEnCours) return false;
    if (modeCible === 'allie' && cote !== 'joueur') {
      setMessage('Cette parade doit protéger une de vos créatures.');
      force();
      return true;
    }
    if (modeCible === 'ennemi' && cote !== 'ennemi') {
      setMessage('Choisissez une créature adverse.');
      force();
      return true;
    }
    const carteSource = cardById(cibleEnCours);
    if (rpgEstProtegee(entite, cardColors(carteSource))) {
      setMessage(`Protection de ${entite.name} contre ${cardColorLabel(carteSource)} : choisissez une autre cible.`);
      force();
      return true;
    }
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
      setMessage(entite.ready ? `${entite.name} a déjà attaqué ce tour.` : `${entite.name} observe encore (mal d'invocation).`);
      force();
      return;
    }
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
    const prochain = prochainId && duel.joueur.creatures.find((candidate) => candidate.id === prochainId);
    setMessage(prochain
      ? `Coup rapide de ${prochain.name} : choisissez une créature adverse à laquelle infliger ses dégâts d’attaque.`
      : dejaSelectionnee ? `${entite.name} n’est plus déclarée attaquante.` : `${entite.name} est déclarée attaquante.`);
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
        setMessage(`${entite.name} ne peut pas bloquer une seconde fois pendant ce combat.`);
      } else if (bloqueurSelectionne === entite.id) {
        setBloqueurSelectionne(null);
        setMessage('Sélection du bloqueur annulée.');
      } else {
        setBloqueurSelectionne(entite.id);
        setMessage(`${entite.name} sélectionné : cliquez une créature attaquante pour lui assigner le blocage. Vous pouvez toujours glisser la carte.`);
      }
      force();
      return;
    }
    if (reponseApresBlocage || !monTour) return;
    if (cibleAttaqueEnCours) {
      if (entite.id === cibleAttaqueEnCours) basculerAttaquant(entite);
      else setMessage('Choisissez d’abord une créature adverse pour terminer le Coup rapide.');
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
        setMessage(cibleRequise
          ? `Coup rapide de ${entite.name} : choisissez une créature adverse à laquelle infliger ses dégâts d’attaque.`
          : 'Phase de combat : sélectionnez tous vos attaquants, puis confirmez.');
      } else {
        setAttaquants([]);
        setCiblesAttaque({});
        setCibleAttaqueEnCours(null);
        setMessage(entite.ready ? `${entite.name} a déjà attaqué ce tour.` : `${entite.name} observe encore (mal d'invocation).`);
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
        setMessage(`Protection contre Braise ou cible absente : ${entite.name} ne peut pas être choisie pour ce Coup rapide.`);
        force();
        return;
      }
      const cibles = { ...ciblesAttaque, [attaquant.id]: entite.id };
      setCiblesAttaque(cibles);
      const prochainId = prochainCoupRapideSansCible(attaquants, cibles);
      setCibleAttaqueEnCours(prochainId);
      const prochain = prochainId && duel.joueur.creatures.find((candidate) => candidate.id === prochainId);
      setMessage(prochain
        ? `Coup rapide de ${prochain.name} : choisissez une créature adverse à laquelle infliger ses dégâts d’attaque.`
        : `${attaquant.name} infligera ${attaquant.atk} dégâts d’attaque à ${entite.name} avec Coup rapide.`);
      force();
      return;
    }
    if (reponseActive && combatEntrant?.coteAttaquant === 'sorcier' && combatEntrant.attaquants.includes(entite.id)) {
      if (combatEntrant.ciblesAttaque?.[entite.id]) {
        const cible = duel.joueur.creatures.find((candidate) => candidate.id === combatEntrant.ciblesAttaque[entite.id]);
        setBloqueurSelectionne(null);
        setMessage(`${entite.name} vise ${cible?.name ?? 'une créature'} avec Coup rapide et ne peut pas être bloquée.`);
        force();
        return;
      }
      if (bloqueurSelectionne) {
        assignerBloqueur(entite.id, bloqueurSelectionne);
      } else {
        setMessage('Cliquez d’abord une de vos créatures pour la sélectionner, puis cliquez cet attaquant.');
        force();
      }
      return;
    }
    if (!monTour) return;
    setMessage(phase
      ? 'Après la déclaration, le sorcier choisira ses bloqueurs. Les attaquants non bloqués touchent ses PV.'
      : 'Cliquez « Attaquer » pour déclarer vos créatures attaquantes.');
    force();
  };

  const lancerAttaque = () => {
    const ids = [...new Set(attaquants)];
    const attaquantsValides = ids.length && ids.every((id) => duel.joueur.creatures
      .some((entite) => entite.id === id && entite.ready && !entite.attaquee));
    if (!attaquantsValides) {
      setMessage('Personne n’est prêt à attaquer.');
      setPhase(false);
      setAttaquants([]);
      setCiblesAttaque({});
      setCibleAttaqueEnCours(null);
      force();
      return;
    }

    const cibleManquante = prochainCoupRapideSansCible(ids, ciblesAttaque);
    if (cibleManquante) {
      setCibleAttaqueEnCours(cibleManquante);
      const attaquant = duel.joueur.creatures.find((entite) => entite.id === cibleManquante);
      setMessage(`Coup rapide de ${attaquant?.name ?? 'la créature'} : choisissez une créature adverse avant de confirmer.`);
      force();
      return;
    }
    const ciblesFinales = Object.fromEntries(ids.flatMap((id) => {
      const attaquant = duel.joueur.creatures.find((entite) => entite.id === id);
      const cible = ciblesCoupRapideLegales(attaquant, 'joueur')
        .find((entite) => entite.id === ciblesAttaque[id]);
      return cible ? [[id, cible.id]] : [];
    }));

    if (!rpgOuvrirFenetreReponse(duel, 'joueur')) {
      setMessage('La fenêtre de réponse ne peut pas s’ouvrir hors de votre tour.');
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
      setMessage('Aucun bloqueur adverse : les attaques directes et Coups rapides se résolvent automatiquement.');
      resoudreAttaqueJoueur(combat);
      return;
    }
    animerEntites(ids, 'attack', 650);
    setCombatEntrant(combat);
    setMessage('Le sorcier a choisi ses bloqueurs. Les flèches jaunes montrent chaque blocage : jouez un éphémère ou acceptez-les tels quels.');
    force();
  };

  const declarerAttaqueAvecTous = () => {
    const ids = prets.map((entite) => entite.id);
    if (!ids.length) return;
    setPhase(true);
    setAttaquants(ids);
    setCiblesAttaque({});
    const prochainId = prochainCoupRapideSansCible(ids, {});
    setCibleAttaqueEnCours(prochainId);
    const prochain = prochainId && duel.joueur.creatures.find((entite) => entite.id === prochainId);
    setMessage(prochain
      ? `Coup rapide de ${prochain.name} : choisissez une créature adverse avant de confirmer l’attaque.`
      : 'Toutes vos créatures prêtes sont déclarées : vérifiez les cartes inclinées, puis confirmez l’attaque.');
    force();
  };

  const annulerAttaque = () => {
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleAttaqueEnCours(null);
    setMessage('Déclaration annulée.');
    force();
  };

  const cliquerSorcier = () => {
    if (cibleEnCours && carteCiblee?.cibles?.includes('sorcier')) {
      lancerMagie(cibleEnCours, 'sorcier');
      return;
    }
    if (!monTour) return;
    setMessage(duel.sorcier.creatures.length
      ? 'Déclarez vos attaquants : le sorcier peut bloquer certains d’entre eux, les autres frappent ses PV.'
      : 'Déclarez vos attaquants pour frapper directement le sorcier.');
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
      setMessage(`${attaquant.name} vise une créature avec Coup rapide et ne peut pas être bloquée.`);
      force();
      return;
    }
    const retireDeCetteAttaque = (combatEntrant?.blocages[attaquantId] ?? []).includes(bloqueurId);
    if (!retireDeCetteAttaque && !rpgPeutBloquerAttaquant(bloqueur, attaquant)) {
      setBloqueurSelectionne(null);
      setMessage(`${attaquant.name} a Envol : seules les créatures avec Envol peuvent le bloquer. ${bloqueur.name} reste au sol.`);
      force();
      return;
    }
    const couleursBloqueur = cardColors(cardById(bloqueur.carteId));
    if (!retireDeCetteAttaque && rpgEstProtegee(attaquant, couleursBloqueur)) {
      setBloqueurSelectionne(null);
      setMessage(`${attaquant.name} résiste à ${couleursBloqueur.map(couleurLabel).join(' + ')} : ce bloqueur est impossible.`);
      force();
      return;
    }
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
    setMessage(retireDeCetteAttaque
      ? `${bloqueur.name} ne bloque plus ${attaquant.name}.`
      : `${bloqueur.name} bloque ${attaquant.name}. Cliquez une autre créature puis un attaquant, ou glissez d’autres bloqueurs pour les ajouter.`);
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
      setMessage('Aucun attaquant ne reste sur la table. Votre tour commence.');
      force();
      return;
    }
    const vivants = new Set(attaquantsVivants);
    const blocages = Object.fromEntries(Object.entries(combatEntrant.blocages).filter(([id]) => vivants.has(id)));
    const repartitions = Object.fromEntries(Object.entries(combatEntrant.repartitions).filter(([id]) => vivants.has(id)));
    const champAvantAttaque = prendreInstantaneChamp();
    const debutJournalDestructions = rpgNombreDestructions(duel);
    const res = rpgLancerAttaque(
      duel,
      'sorcier',
      attaquantsVivants,
      blocages,
      repartitions,
      null,
      Object.fromEntries(Object.entries(combatEntrant.ciblesAttaque ?? {})
        .filter(([id]) => attaquantsVivants.includes(id))),
    );
    if (!res.ok) {
      setMessage('Le combat n’a pas pu être résolu. Vérifiez les créatures bloquées et réessayez.');
      force();
      return;
    }
    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    if (res.resume.frappeSorcier > 0) declencherImpactEcran('received');
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    if (rpgVainqueur(duel)) {
      setMessage('Le combat est terminé.');
    } else {
      const degats = res.resume.frappeSorcier;
      const resumeCoupRapide = (res.resume.coupsRapides ?? []).map((coup) => (coup.annule
        ? `${coup.attaquant} ne trouve plus sa cible pour son Coup rapide.`
        : `${coup.attaquant} inflige ${coup.degats} dégâts à ${coup.cible} avec Coup rapide.`));
      const resume = [
        degats ? `${degats} dégâts au joueur` : null,
        ...resumeCoupRapide,
      ].filter(Boolean).join(' ; ');
      setMessage(resume
        ? `Combat adverse résolu : ${resume}. Votre tour commence.`
        : 'Combat adverse résolu. Votre tour commence.');
      rpgFinDeTour(duel);
    }
    force();
  };

  const resoudreAttaqueJoueur = (combat = combatEntrant) => {
    if (!combat || combat.coteAttaquant !== 'joueur') return;
    const attaquantsVivants = combat.attaquants
      .filter((id) => duel.joueur.creatures.some((entite) => entite.id === id));
    if (!attaquantsVivants.length) {
      rpgFermerFenetreReponse(duel);
      setCombatEntrant(null);
      setMessage('Aucun attaquant ne reste sur la table. Votre tour continue.');
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
      combat.repartitions,
      attaquantsBloques,
      Object.fromEntries(Object.entries(combat.ciblesAttaque ?? {})
        .filter(([id]) => attaquantsVivants.includes(id))),
    );
    if (!res.ok) {
      setMessage('Le combat n’a pas pu être résolu. Vérifiez les bloqueurs et réessayez.');
      force();
      return;
    }

    animerModificationsChamp(champAvantAttaque, attaquantsVivants, debutJournalDestructions);
    if (res.resume.frappeSorcier > 0) declencherImpactEcran('dealt');
    rpgFermerFenetreReponse(duel);
    setCombatEntrant(null);
    setCibleEnCours(null);
    const direct = res.resume.frappeSorcier;
    const attaquesBloquees = res.resume.attaquantsBloques?.length ?? attaquantsBloques.length;
    const resumeCoupRapide = (res.resume.coupsRapides ?? []).map((coup) => (coup.annule
      ? `${coup.attaquant} ne trouve plus sa cible pour son Coup rapide.`
      : `${coup.attaquant} inflige ${coup.degats} dégâts à ${coup.cible} avec Coup rapide.`));
    const resume = [
      direct
        ? `Combat résolu : ${attaquesBloquees} attaque(s) bloquée(s), ${direct} dégâts au sorcier adverse.`
        : `Combat résolu : ${attaquesBloquees} attaque(s) bloquée(s), aucune attaque directe.`,
      ...resumeCoupRapide,
    ].join(' ');
    setMessage(rpgVainqueur(duel) ? 'Le combat est terminé.' : resume);
    force();
  };

  const resoudreCombat = () => {
    if (combatEntrant?.coteAttaquant === 'joueur') resoudreAttaqueJoueur();
    else resoudreAttaqueEnnemie();
  };

  const finDuTour = () => {
    if (!monTour || combatEntrant) return;
    invaliderAnnulation();
    setPhase(false);
    setAttaquants([]);
    setCiblesAttaque({});
    setCibleAttaqueEnCours(null);
    setCibleEnCours(null);
    rpgFinDeTour(duel);
    setMessage('Le sorcier adverse joue ses cartes…');
    force();
    later(() => {
      const champAvantIA = prendreInstantaneChamp();
      const debutJournalDestructions = rpgNombreDestructions(duel);
      rpgTourSorcierPreparationIA(duel, rng);
      animerModificationsChamp(champAvantIA, [], debutJournalDestructions);
      if (rpgVainqueur(duel)) {
        setMessage('Le sort du sorcier a décidé du duel.');
        force();
        return;
      }
      const ids = duel.sorcier.creatures.filter((e) => e.ready && !e.attaquee).map((e) => e.id);
      if (!ids.length) {
        rpgFinDeTour(duel);
        setMessage('À vous : vos terrains sont dégagés, une carte est piochée.');
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
      const coupsRapides = Object.entries(ciblesRapides).map(([attaquantId, cibleId]) => {
        const attaquant = duel.sorcier.creatures.find((entite) => entite.id === attaquantId);
        const cible = duel.joueur.creatures.find((entite) => entite.id === cibleId);
        return attaquant && cible ? `${attaquant.name} vise ${cible.name} avec Coup rapide` : null;
      }).filter(Boolean);
      const attaquantsVolants = ids
        .map((id) => duel.sorcier.creatures.find((entite) => entite.id === id))
        .filter((entite) => entite?.envol);
      const noteEnvol = attaquantsVolants.length
        ? (duel.joueur.creatures.some((bloqueur) => bloqueur.envol && !bloqueur.attaquee)
          ? ' Leurs créatures avec Envol ne peuvent être bloquées que par vos créatures avec Envol.'
          : ' Aucune de vos créatures n’a Envol : leurs créatures volantes ne peuvent pas être bloquées.')
        : '';
      setMessage(coupsRapides.length
        ? `Le sorcier attaque : ${coupsRapides.join(' ; ')}. Glissez vos bloqueurs sur les autres attaquants, puis résolvez le combat. Vous pouvez aussi jouer un éphémère.${noteEnvol}`
        : `Le sorcier attaque : glissez vos bloqueurs sur les attaquants, puis résolvez le combat. Vous pouvez aussi jouer un éphémère.${noteEnvol}`);
      force();
    }, 700);
  };

  const bloqueursDisponibles = duel.joueur.creatures.filter((e) => !e.attaquee);
  const bloqueursSelectionnes = new Set(Object.values(combatEntrant?.blocages ?? {}).flat());
  const piochesJoueur = animationsPioche.filter((animation) => animation.side === 'joueur');
  const piochesSorcier = animationsPioche.filter((animation) => animation.side === 'sorcier');
  const tokenPiocheJoueur = piochesJoueur.at(-1)?.token ?? null;
  const tokenPiocheSorcier = piochesSorcier.at(-1)?.token ?? null;

  return (
    <div className="rpg-battle" data-scene="duel">
      <div
        ref={tableRef}
        className={`card-table${carteGlissee ? ' is-card-dragging' : ''}${surZoneDepot ? ' is-drop-target' : ''}${bloqueurGlisse ? ' is-blocker-dragging' : ''}${carteEnVol ? ' is-card-flight-active' : ''}${impactEcran ? ` rpg-screen-shake--${impactEcran.variante}` : ''}${impactEcran?.mode === 'received' ? ` rpg-screen-hit--${impactEcran.variante}` : ''}`}
        data-screen-impact={impactEcran?.mode ?? undefined}
        data-screen-impact-token={impactEcran?.token ?? undefined}
        aria-busy={carteEnVol ? 'true' : undefined}
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}card-table.jpg)` }}
        aria-label="Table de jeu du duel de sorciers"
        onDragOver={survolerTablePourDepot}
        onDragLeave={quitterZoneDepot}
        onDrop={deposerCarteSurTable}
      >
        <nav className="rpg-duel-nav" aria-label="Navigation du duel">
          <strong>LE SABLIER DE BAB EL</strong>
          <button type="button" onClick={() => setEcran('jouer')}>Menu</button>
          <button type="button" onClick={() => setEcran('decks')}>Deck</button>
          <button type="button" onClick={() => setEcran('catalogue')}>Catalogue</button>
        </nav>
        {carteGlissee && (
          <div className={`rpg-drop-indicator${surZoneDepot ? ' is-over' : ''}`} aria-hidden="true">
            {surZoneDepot ? 'Relâchez pour jouer la carte' : 'Glissez la carte sur la table'}
          </div>
        )}
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
          <span className="rpg-wizard-plate__avatar rpg-wizard-plate__avatar--ennemi" aria-hidden="true"><img src={cardArt('ifrit-al-ahmar')} alt="" /></span>
          <span className="rpg-wizard-plate__identity"><strong>LE SORCIER</strong><small>Cour des Djinns · Braise</small></span>
          <span className="rpg-wizard-plate__pv">🛡 {duel.sorcier.pv}{duel.sorcier.bouclier > 0 ? ` · ◇ ${duel.sorcier.bouclier}` : ''}</span>
          <span className="rpg-wizard-plate__sable">
            <i className="mana mana--braise" title="Mana braise">{duel.sorcier.mana.braise}</i>
            <i className="mana mana--eau" title="Mana eau">{duel.sorcier.mana.eau}</i>
            <i className="mana mana--sable" title="Mana sable">{duel.sorcier.mana.sable}</i>
          </span>
          <span className="rpg-wizard-plate__zones">Main · {duel.sorcier.main.length}</span>
        </button>

        <div className="rpg-terrains rpg-terrains--ennemi" aria-label="Terrains du sorcier">
          {duel.sorcier.terrains.map((terrain) => {
            const carte = cardById(terrain.carteId);
            return (
              <span
                key={terrain.id}
                className={`rpg-terrain rpg-terrain--type-terrain rpg-terrain--elem-${carte?.element ?? 'sable'} ${cardRarityClass(carte)} ${terrain.tapped ? 'is-tapped' : ''}`}
                style={cardRarityStyle(carte)}
                data-card-id={terrain.carteId}
                data-terrain-id={terrain.id}
                onMouseEnter={(event) => afficherApercuSurvol(carte, event)}
                onMouseLeave={masquerApercuSurvol}
              >
                <img src={cardArt(terrain.carteId)} alt="" />
              </span>
            );
          })}
        </div>

        <div className="card-row card-row--ennemi" aria-label="Champ du sorcier">
          {duel.sorcier.creatures.length ? duel.sorcier.creatures.map((entite, i) => (
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
          )) : <span className="rpg-empty-lane">Les gardiens du sorcier attendent.</span>}
        </div>
        <div className="card-row card-row--equipe" aria-label="Votre champ de bataille">
          {duel.joueur.creatures.length ? duel.joueur.creatures.map((entite, i) => (
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
          )) : <span className="rpg-empty-lane">Vos alliés prendront place ici.</span>}
        </div>

        {cartesEnDestruction.map((effet) => {
          const carteDetruite = cardById(effet.cardId);
          return (
            <div
              key={effet.effectId}
              className={`rpg-card-destruction-fx ${cardRarityClass(carteDetruite)}${effet.bruleeParBraise ? ' is-burning' : ''}`}
              data-rpg-destroyed-id={effet.entityId}
              data-destruction-source={effet.bruleeParBraise ? 'braise' : undefined}
              aria-hidden="true"
              style={{
                ...cardRarityStyle(carteDetruite),
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
          {duel.joueur.terrains.map((terrain) => {
            const carte = cardById(terrain.carteId);
            const couleursProduites = terrainManaColors(terrain.carteId);
            const terrainInactif = (!monTour && !reponseActive) || terrain.tapped;
            const choixOuvert = terrainManaChoix?.terrainId === terrain.id;
            const production = couleursProduites.map(couleurLabel).join(' ou ');
            return (
              <button
                key={terrain.id}
                type="button"
                className={`rpg-terrain rpg-terrain--joueur rpg-terrain--type-terrain rpg-terrain--elem-${carte?.element ?? 'sable'} ${cardRarityClass(carte)} ${terrain.tapped ? 'is-tapped' : ''}${couleursProduites.length > 1 ? ' is-flexible-mana' : ''}`}
                style={cardRarityStyle(carte)}
                data-card-id={terrain.carteId}
                data-terrain-id={terrain.id}
                data-mana-colors={couleursProduites.join(' ')}
                aria-disabled={terrainInactif}
                aria-haspopup={couleursProduites.length > 1 ? 'dialog' : undefined}
                aria-expanded={couleursProduites.length > 1 ? choixOuvert : undefined}
                aria-controls={couleursProduites.length > 1 ? 'rpg-terrain-mana-choice' : undefined}
                aria-label={`${carte?.name ?? 'Terrain'}${terrain.tapped ? ', engagé' : terrainInactif ? ', indisponible' : couleursProduites.length > 1 ? `, cliquer pour choisir un mana ${production}` : `, disponible pour produire un mana ${production}`}`}
                onClick={(event) => { if (!terrainInactif) demanderCouleurMana(event, terrain); }}
                onMouseEnter={(event) => afficherApercuSurvol(carte, event)}
                onMouseLeave={masquerApercuSurvol}
                onFocus={(event) => afficherApercuSurvol(carte, event)}
                onBlur={masquerApercuSurvol}
              >
                <img src={cardArt(terrain.carteId)} alt="" />
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
          </span>
          <span className="rpg-wizard-plate__zones">Main · {duel.joueur.main.length}</span>
        </div>

        <div className="rpg-bottombar">
          <div className="rpg-bottombar__status">
            <div className={`rpg-turn-indicator ${classeIndicateurTour}`} role="status" aria-live="polite">
              <span className="rpg-turn-indicator__lamp" aria-hidden="true" />
              <strong>{indicateurTour}</strong>
            </div>
            <p className="rpg-actions__wait" aria-live="polite">{message}</p>
          </div>
          <ol className="rpg-log" aria-live="polite">
            {duel.log.slice(-6).map((line, index) => (
              <li key={`${duel.log.length}-${index}-${line}`} className="rpg-log__line">{line}</li>
            ))}
          </ol>
          <div className="rpg-actions">
            <PhaseTrack current={phaseDuelActive} />
            <div className="rpg-actions__row">
              <div className="rpg-actions__combat" role="group" aria-label="Actions de combat">
                {!phase ? (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--attaque rpg-btn--attaque-tous"
                    disabled={!monTour || !prets.length || Boolean(combatEntrant)}
                    title="Sélectionne toutes vos créatures prêtes ; vous pourrez vérifier leur déclaration avant de confirmer."
                    onClick={declarerAttaqueAvecTous}
                  >
                    <CombatActionIcon type="attack-all" /> Attaquer avec tous ({prets.length})
                  </button>
                ) : (
                  <>
                    <button type="button" className="rpg-btn rpg-btn--attaque rpg-btn--confirmer-attaque" disabled={!attaquants.length || Boolean(cibleAttaqueEnCours) || Boolean(prochainCoupRapideSansCible(attaquants, ciblesAttaque))} onClick={() => lancerAttaque()}>
                      <CombatActionIcon type="confirm" /> Confirmer ({attaquants.length})
                    </button>
                    <button type="button" className="rpg-btn rpg-btn--ghost" onClick={annulerAttaque}>
                      Annuler
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
                  <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => { setCibleEnCours(null); carteCibleeHandIndexRef.current = null; setMessage('Choix de cible annulé.'); }}>
                    Annuler la cible
                  </button>
                )}
              </div>
              <div className="rpg-actions__turn" role="group" aria-label="Actions de tour">
                {annulationDisponible && monTour && !phase && !cibleEnCours && !combatEntrant && !carteEnApercu && (
                  <button
                    type="button"
                    className="rpg-btn rpg-btn--undo"
                    title="Annule une seule action réversible. Une attaque confirmée ou une magie jouée est définitive."
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
            {duel.joueur.main.map((carteId, i) => {
              const carte = cardById(carteId);
              if (!carte) return null;
              const estTerrain = carte.kind === 'terrain';
              const estCreature = carte.kind === 'creature' || carte.kind === 'hero';
              const peutRepondre = reponseActive && carte.instant;
              const jouable = reponseApresBlocage
                ? carte.instant && rpgPeutPayer(duel.joueur, carte)
                : estTerrain
                  ? monTour && !duel.joueur.terrainPose
                  : (monTour || peutRepondre) && rpgPeutPayer(duel.joueur, carte);
              const enVol = carteEnVol?.phase === 'flying'
                && carteEnVol.carteId === carteId
                && carteEnVol.handIndex === i;
              const piocheEnCours = enVol ? null : piochesJoueur.find((animation) => animation.handIndex === i);
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

              return (
                <Fragment key={`${carteId}-${i}`}>
                <button
                  type="button"
                  draggable={jouable}
                  onClick={() => cliquerCarteMain(carteId)}
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
                    cardRarityClass(carte),
                    piocheEnCours ? 'rpg-hand-card--drawing' : '',
                    carte.instant ? 'is-instant' : '',
                    cibleEnCours === carteId ? 'is-targeting' : '',
                    jouable ? 'is-playable' : 'is-unplayable',
                    carteGlissee === carteId ? 'is-dragging' : '',
                    enVol ? `rpg-card-flight is-flying${estTerrain ? ' rpg-card-flight--terrain' : ''}` : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    '--tilt': `${TILTS[i % TILTS.length]}deg`,
                    ...cardRarityStyle(carte),
                    ...(piocheEnCours ? { '--rpg-draw-delay': `${piocheEnCours.delay}ms` } : {}),
                    ...styleVol,
                  }}
                  data-draw-token={piocheEnCours?.token}
                  data-card-id={carteId}
                  data-hand-index={i}
                  data-rpg-card-flight={enVol ? (estTerrain ? 'terrain' : 'creature') : undefined}
                  data-rpg-flight-card-id={enVol ? carteId : undefined}
                  data-jouable={jouable ? 'true' : 'false'}
                  aria-label={`${carte.name} — ${cardFaceTypeLine(carte)} — couleur ${cardColorLabel(carte)}${estTerrain ? '' : ` — coût ${cardCostLabel(carte)}`}${carte.text ? ` — ${carte.text}` : ''} — cliquer pour l’aperçu${jouable ? ', jouable, glisser sur la table pour jouer (paiement automatique)' : ', indisponible pour le moment'}`}
                >
                  <img className="rpg-hand__img" src={cardArt(carte)} alt="" aria-hidden="true" />
                  <CardElementBadge carte={carte} />
                  <span className="rpg-hand__title">
                    <ManaCost carte={carte} showElement={false} />
                  </span>
                  <span className="rpg-hand__type">{cardFaceTypeLine(carte)}</span>
                  {estCreature && (
                    <span className="rpg-hand__stats" aria-label={`Attaque ${carte.atk}, défense ${carte.def}`}>
                      <span className="rpg-hand__stat rpg-hand__stat--atk">⚔ {carte.atk}</span>
                      <span className="rpg-hand__stat rpg-hand__stat--def">🛡 {carte.def}</span>
                    </span>
                  )}
                </button>
                {enVol && (
                  <span
                    className="rpg-hand__flight-placeholder"
                    style={{ width: `${carteEnVol.slotWidth}px`, height: `${carteEnVol.slotHeight}px` }}
                    aria-hidden="true"
                  />
                )}
                </Fragment>
              );
            })}
          </div>
        </div>

        {sortJoue && <SpellAnnouncement annonce={sortJoue} />}
        {apercuSurvol && !apercuMagie && !carteEnApercu && (
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

        {carteEnApercu && (
          <CardPreview
            carte={cardById(carteEnApercu)}
            jouable={peutJouerCarte(cardById(carteEnApercu))}
            onClose={() => setCarteEnApercu(null)}
          />
        )}
        {vainqueur && (
          <div className="rpg-overlay">
            <h2>{vainqueur === 'joueur' ? 'Le sorcier s’effondre !' : vainqueur === 'sorcier' ? 'Vous êtes tombé…' : 'Double chute…'}</h2>
            <p>
              {vainqueur === 'joueur'
                ? 'Bab El respire : le cycle tient encore un soir.'
                : 'Le sable recouvre votre Nom. L’Astrolabe sonne pour quelqu’un d’autre.'}
            </p>
            <button type="button" className="rpg-btn rpg-btn--primary" onClick={nouvellePartie}>
              Nouvelle partie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
