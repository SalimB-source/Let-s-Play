/**
 * Scène de combat peinte, 100 % DOM — « Le Sablier de Bab El ».
 *
 * Le langage natif de Dragon Quest, c'est le sprite 2D : cette scène place
 * les portraits peints face à face — l'équipe à gauche, les ennemis à droite,
 * chacun sur son étage — sur le ciel de Bab El (SVG). Aucune WebGL requise :
 * elle s'affiche partout, checks jsdom compris.
 *
 * Comme la scène 3D avant elle, elle ne calcule aucune règle : elle lit
 * `battle` (positions, PV, gardes, acteur courant) et consomme `queueRef`
 * pour les cinématiques éphémères (ruée, clignement, chiffres flottants).
 */

import { useEffect, useRef, useState } from 'react';
import { rpgCurrentActor } from './rpgCombat.js';

const portraitSrc = (actor) =>
  `${import.meta.env.BASE_URL}portraits/${actor.portrait ?? actor.id}.jpg`;

/** Position d'un acteur : l'équipe en éventail à gauche, les ennemis à droite. */
function layout(actor, index) {
  const style = { bottom: `${13 + (actor.tier - 1) * 14}%`, zIndex: actor.tier };
  if (actor.side === 'equipe') style.left = `${4 + index * 11.5}%`;
  else style.right = `${4 + index * 13}%`;
  return style;
}

export default function BattleStage2D({ battle, queueRef, waveTitle }) {
  const [anims, setAnims] = useState({});
  const [pops, setPops] = useState([]);
  const bannerRef = useRef(null);
  const popKey = useRef(0);
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
        const key = (popKey.current += 1);
        setPops((prev) => [...prev.slice(-7), { key, to: evt.to, amount: evt.amount }]);
        later(() => setPops((prev) => prev.filter((p) => p.key !== key)), 1000);
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

  const figure = (actor, index) => {
    const alive = actor.alive;
    return (
      <div
        key={actor.id}
        className={[
          'rpg-fig',
          `rpg-fig--${actor.side}`,
          anims[actor.id] ?? '',
          alive ? '' : 'is-down',
        ].join(' ')}
        style={layout(actor, index)}
      >
        <span className="rpg-fig__shadow" aria-hidden="true" />
        {current?.id === actor.id && alive && <span className="rpg-fig__halo" aria-hidden="true" />}
        <img src={portraitSrc(actor)} alt={actor.name} />
        {actor.guarding && alive && <span className="rpg-fig__guard" aria-hidden="true" />}
        {actor.shield > 0 && alive && <span className="rpg-fig__bubble" aria-hidden="true" />}
        <span className="rpg-fig__name">{actor.name}</span>
        <span className="rpg-fig__hp" aria-hidden="true">
          <i style={{ width: `${Math.max(0, (actor.hp / actor.maxHp) * 100)}%` }} />
        </span>
      </div>
    );
  };

  return (
    <div
      className="rpg-stage2d"
      data-scene="2d"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}sablier-battle-bg.svg)` }}
      aria-label="Scène de combat : l’équipe fait face aux ennemis sur les étages de Bab El"
    >
      <p className="rpg-scene__banner" ref={bannerRef} aria-hidden="true" />
      {team.map((actor, i) => figure(actor, i))}
      {foes.map((actor, i) => figure(actor, i))}
      {pops.map((pop) => {
        const actor = battle.actors.find((a) => a.id === pop.to);
        if (!actor) return null;
        const mates = actor.side === 'equipe' ? team : foes;
        return (
          <span
            key={pop.key}
            className={`rpg-pop ${pop.amount < 0 ? 'rpg-pop--dmg' : 'rpg-pop--heal'}`}
            style={layout(actor, mates.indexOf(actor))}
            aria-hidden="true"
          >
            {pop.amount < 0 ? String(-pop.amount) : `+${pop.amount}`}
          </span>
        );
      })}
    </div>
  );
}
