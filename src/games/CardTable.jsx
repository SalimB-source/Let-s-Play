/**
 * La table de jeu — « Le Sablier de Bab El ».
 *
 * Le combat est une partie de cartes posée sur une table en bois : chaque
 * acteur EST sa carte, dans l'anatomie d'une carte Magic — liseré noir
 * extérieur, cadre intérieur teinté par l'élément, bannière de titre avec le
 * coût en pastilles à droite, fenêtre d'illustration (le portrait peint),
 * ligne de type sur bandeau sombre, encadré de texte beige à texte noir
 * (règle + saveur en italique), et le badge doré de puissance/PV en bas à
 * droite. L'adversaire en haut, l'équipe en bas, cartes légèrement de
 * travers comme posées à la main.
 *
 * Pur DOM : aucune WebGL requise, la table s'affiche partout. Comme avant,
 * ce composant ne calcule aucune règle : il lit `battle` et consomme
 * `queueRef` pour les cinématiques éphémères (bond vers la cible, clignement
 * d'impact, chiffres flottants).
 */

import { useEffect, useRef, useState } from 'react';
import {
  RPG_DIFFICULTIES,
  RPG_INTENT_FAMILIES,
  RPG_TIERS,
  rpgCurrentActor,
  rpgEstimateIntent,
} from './rpgCombat';
import { RPG_ELEMENT_ICONS } from './rpgContent';

const portraitSrc = (actor) =>
  `${import.meta.env.BASE_URL}portraits/${actor.portrait ?? actor.id}.jpg`;

/** Légères rotations : des cartes posées à la main, pas alignées au cordeau. */
const TILTS = [-2.4, 1.7, -1.2, 2.3, -1.8, 1.1];

/** Pastilles de coût rondes, façon symboles de mana. */
function CostPips({ element, count = 2 }) {
  return (
    <span className="rpg-card__pips" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={`pip pip--${element}`}>{RPG_ELEMENT_ICONS[element] ?? '❖'}</i>
      ))}
    </span>
  );
}

function TierBadge({ tier }) {
  return (
    <span className="rpg-tier" title={`Étage ${tier} sur ${RPG_TIERS}`}>
      {Array.from({ length: RPG_TIERS }, (_, i) => (
        <span key={i} className={i < tier ? 'is-on' : ''} />
      ))}
    </span>
  );
}

/** Ce que l'ennemi a annoncé, imprimé dans l'encadré de règle de sa carte. */
function IntentCard({ battle, actor, onPick }) {
  const intent = actor.intent;
  const family = intent ? RPG_INTENT_FAMILIES[intent.family] : null;
  const target = intent?.targetId ? battle.actors.find((a) => a.id === intent.targetId) : null;
  const estimated = intent && target ? Math.round(rpgEstimateIntent(battle, actor, target)) : 0;
  const hidden = intent?.family === 'zone' && RPG_DIFFICULTIES[battle.difficulty]?.hidden;
  return (
    <div className="rpg-intent">
      {intent ? (
        <>
          <span className="rpg-intent__icon" aria-hidden="true">{family.icon}</span>
          <span className="rpg-intent__body">
            <strong>{intent.label}</strong>
            <small>
              {family.label}
              {intent.family === 'zone'
                ? (hidden ? ' · cible cachée' : ' · toute l’équipe')
                : ` → ${target?.name ?? '—'}`}
              {estimated > 0 && intent.family !== 'zone' ? ` · ≈${estimated}` : ''}
              {intent.family === 'incantation' ? ` · s’interrompt : ${intent.counterElement}` : ''}
            </small>
          </span>
          {actor.contred && <em className="rpg-tag rpg-tag--contre">élan cassé</em>}
        </>
      ) : (
        <span className="rpg-intent__body"><small>aucune carte annoncée</small></span>
      )}
      <button type="button" className="rpg-intent__pick" onClick={() => onPick(actor.id)} title="Cibler cet ennemi">
        cibler
      </button>
    </div>
  );
}

/** Carte ennemie, posée en haut de la table. */
function FoeCard({ battle, actor, selected, onPick, tilt, fx, pop }) {
  return (
    <article
      className={[
        `rpg-card rpg-card--ennemi rpg-card--elem-${actor.element}`,
        selected ? 'is-selected' : '',
        actor.alive ? '' : 'is-down',
        fx ?? '',
      ].join(' ')}
      style={{ '--tilt': `${tilt}deg` }}
      onClick={() => actor.alive && onPick(actor.id)}
    >
      <header className="rpg-card__title">
        <strong>{actor.name}</strong>
        <CostPips element={actor.element} />
      </header>
      <span className="rpg-card__art">
        <img className="rpg-foe__portrait" src={portraitSrc(actor)} alt={`Portrait de ${actor.name}`} />
        {pop != null && (
          <span className={`rpg-pop ${pop < 0 ? 'rpg-pop--dmg' : 'rpg-pop--heal'}`} aria-hidden="true">
            {pop < 0 ? String(-pop) : `+${pop}`}
          </span>
        )}
      </span>
      <span className="rpg-card__type">
        Créature — {actor.role}
        <em className="rpg-card__set" aria-hidden="true">⌖</em>
      </span>
      <span className="rpg-card__text">
        {actor.alive && <IntentCard battle={battle} actor={actor} onPick={onPick} />}
        <span className="rpg-card__tags">
          {actor.fele && <em className="rpg-tag rpg-tag--felure">FÊLÉ ×2</em>}
          {actor.blind > 0 && <em className="rpg-tag">aveuglé</em>}
          {actor.weaken > 0 && <em className="rpg-tag">affaibli</em>}
        </span>
      </span>
      <footer className="rpg-card__foot">
        <span className="rpg-card__col">
          V·{String(battle.round).padStart(2, '0')} · BAB EL
          <TierBadge tier={actor.tier} />
        </span>
        <span className="rpg-card__pt">{actor.hp}/{actor.maxHp}</span>
      </footer>
    </article>
  );
}

/** Carte de l'équipe, posée en bas de la table. */
function AllyCard({ actor, active, selected, onPick, tilt, fx, pop }) {
  return (
    <article
      className={[
        `rpg-card rpg-card--equipe rpg-card--elem-${actor.element}`,
        active ? 'is-active' : '',
        selected ? 'is-selected' : '',
        actor.alive ? '' : 'is-down',
        fx ?? '',
      ].join(' ')}
      style={{ '--tilt': `${tilt}deg` }}
      onClick={() => onPick(actor.id)}
    >
      <header className="rpg-card__title">
        <strong>{actor.name}</strong>
        <CostPips element={actor.element} />
      </header>
      <span className="rpg-card__art">
        <img className="rpg-ally__portrait" src={portraitSrc(actor)} alt={`Portrait de ${actor.name}`} />
        {pop != null && (
          <span className={`rpg-pop ${pop < 0 ? 'rpg-pop--dmg' : 'rpg-pop--heal'}`} aria-hidden="true">
            {pop < 0 ? String(-pop) : `+${pop}`}
          </span>
        )}
      </span>
      <span className="rpg-card__type">
        Créature légendaire — {actor.role}
        <em className="rpg-card__set" aria-hidden="true">⌖</em>
      </span>
      <span className="rpg-card__text rpg-card__text--ally">
        <span className="rpg-card__rules">
          <span className="rpg-name-segments" title={`${actor.nameSegments}/3 segments de Nom`}>
            {[0, 1, 2].map((i) => <span key={i} className={i < actor.nameSegments ? 'is-on' : 'is-off'} />)}
          </span>
          <span className="rpg-card__tags">
            {actor.shield > 0 && <em className="rpg-tag">barrage {actor.shield}</em>}
            {actor.guarding && <em className="rpg-tag">en garde</em>}
          </span>
        </span>
        <i className="rpg-card__flavor">« {actor.line} »</i>
      </span>
      <footer className="rpg-card__foot">
        <span className="rpg-card__col">
          L·{actor.level} · BAB EL
          <TierBadge tier={actor.tier} />
        </span>
        <span className="rpg-card__pt">{actor.hp}/{actor.maxHp}</span>
      </footer>
    </article>
  );
}

export default function CardTable({ battle, queueRef, waveTitle, targetId, allyId, onPickFoe, onPickAlly }) {
  const [anims, setAnims] = useState({});
  const [pops, setPops] = useState({});
  const bannerRef = useRef(null);
  const timersRef = useRef([]);

  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };
  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  const flash = (id, cls, ms = 620) => {
    setAnims((prev) => ({ ...prev, [id]: cls }));
    later(() => setAnims((prev) => (prev[id] === cls ? { ...prev, [id]: null } : prev)), ms);
  };

  // Consomme les événements cinématiques poussés par la page.
  useEffect(() => {
    const queue = queueRef.current;
    while (queue.length) {
      const evt = queue.shift();
      if (evt.t === 'strike') {
        flash(evt.from, 'fx-lunge');
        if (evt.to) later(() => flash(evt.to, 'fx-hit', 480), 240);
      }
      if (evt.t === 'zone') {
        later(() => {
          for (const a of battle?.actors ?? []) {
            if (a.side === 'equipe') flash(a.id, 'fx-hit', 480);
          }
        }, 240);
      }
      if (evt.t === 'souffle') flash(evt.from, 'fx-lunge');
      if (evt.t === 'soin') flash(evt.to ?? evt.from, 'fx-glow', 700);
      if (evt.t === 'pop') {
        flash(evt.to, evt.amount < 0 ? 'fx-hit' : 'fx-glow', 480);
        setPops((prev) => ({ ...prev, [evt.to]: evt.amount }));
        later(() => setPops((prev) => {
          const next = { ...prev };
          delete next[evt.to];
          return next;
        }), 1000);
      }
    }
  });

  // Bannière d'apparition.
  const prevWaveRef = useRef(null);
  useEffect(() => {
    if (!waveTitle || prevWaveRef.current === waveTitle) return;
    prevWaveRef.current = waveTitle;
    const el = bannerRef.current;
    if (!el) return;
    el.textContent = `${waveTitle} — des ennemis apparaissent !`;
    el.classList.add('is-on');
    const id = window.setTimeout(() => el.classList.remove('is-on'), 2400);
    return () => window.clearTimeout(id);
  }, [waveTitle]);

  if (!battle) return null;
  const current = rpgCurrentActor(battle);
  const team = battle.actors.filter((a) => a.side === 'equipe');
  const foes = battle.actors.filter((a) => a.side === 'ennemi');

  return (
    <div
      className="card-table"
      data-scene="cards"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}card-table.jpg)` }}
      aria-label="Table de jeu : les cartes de l’équipe font face aux cartes ennemies"
    >
      <p className="rpg-scene__banner" ref={bannerRef} aria-hidden="true" />
      <div className="card-row card-row--ennemi">
        {foes.map((actor, i) => (
          <FoeCard
            key={actor.id}
            battle={battle}
            actor={actor}
            selected={targetId === actor.id}
            onPick={onPickFoe}
            tilt={TILTS[i % TILTS.length]}
            fx={anims[actor.id]}
            pop={pops[actor.id]}
          />
        ))}
      </div>
      <div className="card-row card-row--equipe">
        {team.map((actor, i) => (
          <AllyCard
            key={actor.id}
            actor={actor}
            active={current?.id === actor.id && actor.alive}
            selected={allyId === actor.id}
            onPick={onPickAlly}
            tilt={TILTS[(i + 2) % TILTS.length]}
            fx={anims[actor.id]}
            pop={pops[actor.id]}
          />
        ))}
      </div>
    </div>
  );
}
