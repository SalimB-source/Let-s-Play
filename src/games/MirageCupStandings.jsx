import React from 'react';
import MirageCharacterPortrait from './MirageCharacterPortrait';
import { placeLabel } from './mirageCup';
import { DUEL_DISTANCE } from './mirageRules';

/** « 41,3 s » pour un arrivé, « à 38 m » pour un cavalier encore en piste. */
export function formatRaceLine(line) {
  if (!line) return '';
  if (line.finished && line.duration != null) return `${line.duration.toFixed(1).replace('.', ',')} s`;
  return `à ${Math.max(0, Math.round(DUEL_DISTANCE - line.distance))} m`;
}

/**
 * Le classement général d’une coupe, du premier au dernier.
 *
 * `standings` vient de `cupStandings(run)`. En mode « race » (entre deux
 * courses), chaque ligne détaille la dernière course — place, chrono, points
 * gagnés ; en mode « final », elle rappelle la place de chaque course.
 */
export default function MirageCupStandings({ standings, run, mode = 'race' }) {
  const lastRace = run.races[run.races.length - 1];
  return (
    <ol className={`mirage-cup-standings is-${mode}`} aria-label={mode === 'final' ? 'Classement final de la coupe' : 'Classement de la coupe'}>
      {standings.map((row, index) => {
        const line = lastRace?.placements.find((entry) => entry.riderId === row.id);
        const detail = mode === 'final'
          ? row.places.map((place) => (place ? placeLabel(place) : '–')).join(' · ')
          : line ? `${placeLabel(line.place)} · ${formatRaceLine(line)}` : '';
        const gained = row.gained[row.gained.length - 1] ?? 0;
        return (
          <li
            key={row.id}
            className={`mirage-cup-row${row.isPlayer ? ' is-me' : ''}${row.rank === 1 ? ' is-leader' : ''}`}
            style={{ '--row': index }}
          >
            <span className={`mirage-cup-rank is-place-${row.rank}`} aria-label={placeLabel(row.rank)}>{row.rank}</span>
            <MirageCharacterPortrait colors={row.colors} label={row.name} decorative className="mirage-cup-portrait" />
            <span className="mirage-cup-name">
              <strong>{row.name}</strong>
              {row.isPlayer && <i>TOI</i>}
              <small>{detail}</small>
            </span>
            {mode === 'race' && <span className="mirage-cup-gain" aria-label={`${gained} points gagnés`}>+{gained}</span>}
            <span className="mirage-cup-total"><b>{row.points}</b><small>PTS</small></span>
          </li>
        );
      })}
    </ol>
  );
}
