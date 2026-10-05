import React from 'react';
import {
  CITY_RUSH_PLAYER_HEALTH,
  cityRushHealthSegments,
} from './cityRushRules';

/** Une barre de 15 cellules, groupées bleu / vert / jaune. */
export default function CityRushHealthBar({
  health = CITY_RUSH_PLAYER_HEALTH,
  maxHealth = CITY_RUSH_PLAYER_HEALTH,
  label = 'Vie de la voiture',
  compact = false,
  flash = false,
}) {
  const safeMax = Math.max(1, Math.trunc(Number(maxHealth) || CITY_RUSH_PLAYER_HEALTH));
  const safeHealth = Math.max(0, Math.min(safeMax, Math.trunc(Number(health) || 0)));
  const segments = cityRushHealthSegments(safeHealth);
  const groups = ['blue', 'green', 'yellow'];

  return (
    <span
      className={`city-rush-health-cells${compact ? ' is-compact' : ''}${safeHealth <= 3 ? ' is-critical' : ''}${flash ? ' is-hit' : ''}`}
      role="img"
      aria-label={`${label} : ${safeHealth} carrés sur ${safeMax}`}
      title={`${safeHealth}/${safeMax} carrés`}
    >
      {groups.map((group, groupIndex) => (
        <span className={`city-rush-health-group is-${group}`} key={group} aria-hidden="true">
          {segments.slice(groupIndex * 5, groupIndex * 5 + 5).map((segment) => (
            <i
              className={`city-rush-health-cell is-${segment.tone}${segment.active ? ' is-filled' : ' is-empty'}`}
              key={segment.index}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
