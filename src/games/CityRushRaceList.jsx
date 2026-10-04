import React from 'react';
import CityRushDriverAvatar from './CityRushDriverAvatar';

function formatGap(racer) {
  if (racer.isPlayer) return 'TOI';
  const gap = Math.round(Number(racer.relativeDistance) || 0);
  if (gap > 0) return `+${gap} m`;
  if (gap < 0) return `${gap} m`;
  return '0 m';
}

/**
 * Classement compact posé dans le HUD de Vice City Rush.
 *
 * Il remplace l'ancienne mini-carte : en course, les positions, le pilote et
 * l'écart utile se lisent sans cacher la route derrière un second tracé.
 */
export default function CityRushRaceList({ racers = [], pursuers = [], laps = 1 }) {
  const sortedRacers = [...(Array.isArray(racers) ? racers : [])]
    .sort((left, right) => (left.rank || Number.MAX_SAFE_INTEGER) - (right.rank || Number.MAX_SAFE_INTEGER));
  const police = Array.isArray(pursuers) ? pursuers.filter((car) => car?.active !== false) : [];
  const activeLaps = Math.max(1, Number(laps) || 1);
  const focus = sortedRacers.find((racer) => racer.isPlayer) || sortedRacers[0];

  return (
    <aside
      className="city-rush-race-list"
      aria-label={`Classement en direct${focus ? ` : ${focus.displayName || focus.name} ${focus.rank || 1}e` : ''}`}
    >
      <div className="city-rush-race-list-head">
        <span className="city-rush-race-list-title"><i aria-hidden="true" /> POSITIONS</span>
        <span className="city-rush-race-list-badges">
          {police.length > 0 && <b title={`${police.length} véhicule${police.length > 1 ? 's' : ''} de police en piste`}>🚨 ×{police.length}</b>}
          <em>T{Math.min(focus?.lap || 1, activeLaps)}/{activeLaps}</em>
        </span>
      </div>
      <div className="city-rush-race-list-rows" role="list" aria-label="Pilotes classés">
        {sortedRacers.map((racer) => (
          <div className={`city-rush-race-list-row${racer.isPlayer ? ' is-player' : ''}`} key={racer.id} role="listitem">
            <span className="city-rush-race-list-rank">{racer.rank || '—'}</span>
            <span className="city-rush-race-list-avatar"><CityRushDriverAvatar driver={racer} decorative /></span>
            <span className="city-rush-race-list-copy">
              <b>{racer.name}{racer.isPlayer && <em>TOI</em>}</b>
              <small>{racer.flag} {racer.country}</small>
            </span>
            <span className="city-rush-race-list-gap">{formatGap(racer)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
