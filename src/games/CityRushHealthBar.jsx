import React from 'react';
import {
  CITY_RUSH_HEALTH_GROUP_SIZE,
  CITY_RUSH_PLAYER_HEALTH,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  cityRushHealthSegments,
} from './cityRushRules';

/**
 * La barre de vie d'une voiture, découpée en groupes de cinq cellules.
 *
 * La longueur suit la coque : quinze cellules pour le barème de référence,
 * mais sept pour une PULSE RS et vingt-trois pour une MISTRAL 1.4 (voir
 * `cityRushCarMaxHealth`). Les groupes gardent la même largeur de cellule
 * (`flexGrow` proportionnel) : la barre s'allonge d'un bloc entier plutôt que
 * d'écraser les carrés des voitures fragiles.
 */
export default function CityRushHealthBar({
  health = CITY_RUSH_PLAYER_HEALTH,
  maxHealth = CITY_RUSH_PLAYER_HEALTH,
  label = 'Vie de la voiture',
  compact = false,
  flash = false,
}) {
  const safeMax = Math.max(1, Math.trunc(Number(maxHealth) || CITY_RUSH_PLAYER_HEALTH));
  const safeHealth = Math.max(0, Math.min(safeMax, Math.trunc(Number(health) || 0)));
  const segments = cityRushHealthSegments(safeHealth, safeMax);
  const groups = [];
  for (let index = 0; index < segments.length; index += CITY_RUSH_HEALTH_GROUP_SIZE) {
    groups.push(segments.slice(index, index + CITY_RUSH_HEALTH_GROUP_SIZE));
  }

  return (
    <span
      className={`city-rush-health-cells${compact ? ' is-compact' : ''}${safeHealth <= CITY_RUSH_PLAYER_HEALTH_CRITICAL ? ' is-critical' : ''}${flash ? ' is-hit' : ''}`}
      role="img"
      aria-label={`${label} : ${safeHealth} carrés sur ${safeMax}`}
      title={`${safeHealth}/${safeMax} carrés`}
    >
      {groups.map((group) => (
        <span
          className={`city-rush-health-group is-${group[0]?.group || 'blue'}`}
          style={{ flexGrow: group.length }}
          key={group[0]?.index ?? 0}
          aria-hidden="true"
        >
          {group.map((segment) => (
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
