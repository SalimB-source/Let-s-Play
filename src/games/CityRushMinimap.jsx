import React, { useMemo } from 'react';
import CityRushDriverAvatar from './CityRushDriverAvatar';
import {
  CITY_RUSH_LAPS,
  buildCityRushMinimapState,
  cityRushMinimapTrackPath,
} from './cityRushRules';
import { cityRushTunnelMinimapBands } from './cityRushTunnels';

const TRACK_PATH = cityRushMinimapTrackPath(72);

function ordinal(place) {
  return place === 1 ? '1er' : `${place}e`;
}

function formatRelativeGap(racer) {
  if (racer.isPlayer) return 'FOCUS · TOI';
  const gap = Math.round(Number(racer.relativeDistance) || 0);
  if (gap > 0) return `+${gap} m`;
  if (gap < 0) return `${gap} m`;
  return '0 m';
}

/**
 * Mini-carte en direct de Vice City Rush :
 * - affiche le circuit en boucle de 600 m et l'emplacement temps réel des 4 joueurs ;
 * - centre l'attention (caméra + cône de visée + halo radar + écarts relatifs) sur notre joueur ;
 * - associe à chacun des 4 pilotes son avatar distinct et son pays ;
 * - montre à part l'escouade de police du dernier tour (`pursuers`), qui
 *   n'est jamais classée.
 */
export default function CityRushMinimap({
  racers = [],
  pursuers = [],
  cityId = 'vice-city',
  carId,
  runId = 0,
  playerDriverId = null,
}) {
  const minimap = useMemo(
    () => buildCityRushMinimapState(racers, { cityId, carId, runId, playerDriverId, pursuers }),
    [racers, cityId, carId, runId, playerDriverId, pursuers],
  );
  const { focus, markers, startLine, midGate } = minimap;
  const police = minimap.pursuers || [];
  const blockers = police.filter((car) => car.blocking).length;
  const rallied = police.filter((car) => car.rallied).length;
  // Tremis du circuit : la voûte et, quand la chaussée se resserre, la bande
  // des voies murées. Le resserrement se voit venir sur la carte.
  const tunnelBands = useMemo(() => cityRushTunnelMinimapBands(cityId), [cityId]);

  return (
    <aside
      className="city-rush-minimap"
      aria-label={`Mini-carte de la course : focus sur ${focus.displayName} (${focus.country}), ${ordinal(focus.rank)} sur 4${police.length ? `, ${police.length} berlines de police en piste` : ''}`}
    >
      <div className="city-rush-minimap-head">
        <span className="city-rush-minimap-title">
          <i aria-hidden="true" /> MINI-CARTE · FOCUS JOUEUR
        </span>
        <span className="city-rush-minimap-badges">
          {police.length > 0 && (
            <span className="city-rush-minimap-police" title={`Poursuivants hors classement, solides : ils se rabattent devant leur pilote pour le bloquer.${rallied > 0 ? ' La police routière a été percutée : elle chasse celui qui l’a touchée.' : ''}`}>
              🚨 POLICE ×{police.length}{rallied > 0 ? ` · ${rallied} ROUTIÈRE${rallied > 1 ? 'S' : ''}` : ''}{blockers > 0 ? ` · ${blockers} EN BARRAGE` : ''}
            </span>
          )}
          <span className="city-rush-minimap-lap">
            T{Math.min(focus.lap || 1, CITY_RUSH_LAPS)}/{CITY_RUSH_LAPS}
          </span>
        </span>
      </div>

      <div className="city-rush-minimap-focus" title={`Focus sur ton pilote : ${focus.displayName} (${focus.country})`}>
        <div className="city-rush-minimap-focus-avatar">
          <CityRushDriverAvatar driver={focus} />
          <span className="city-rush-minimap-focus-flag" aria-hidden="true">{focus.flag}</span>
        </div>
        <div className="city-rush-minimap-focus-copy">
          <div className="city-rush-minimap-focus-name">
            <b>{focus.name}</b>
            <em className="city-rush-you-badge">TOI</em>
          </div>
          <small>{focus.flag} {focus.country.toUpperCase()} <i>·</i> VOIE {(focus.lane ?? 1) + 1}/4</small>
        </div>
        <strong className="city-rush-minimap-focus-rank">{ordinal(focus.rank)}<small>/4</small></strong>
      </div>

      <div className="city-rush-minimap-stage">
        <svg
          className="city-rush-minimap-svg"
          viewBox={focus.viewBox}
          role="img"
          aria-label="Tracé du circuit avec les 4 joueurs et le focus sur notre voiture"
        >
          <defs>
            <radialGradient id="city-rush-focus-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#43ead5" stopOpacity="0.42" />
              <stop offset="65%" stopColor="#ff5db8" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#43ead5" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grille radar subtile */}
          <g className="city-rush-minimap-grid" aria-hidden="true">
            <line x1="2" y1={focus.y} x2="98" y2={focus.y} />
            <line x1={focus.x} y1="2" x2={focus.x} y2="98" />
          </g>

          {/* Tracé de la boucle de 600 m (bordure, bitume, 4 voies) */}
          <path className="city-rush-minimap-road-edge" d={TRACK_PATH} />
          <path className="city-rush-minimap-road-asphalt" d={TRACK_PATH} />
          <path className="city-rush-minimap-road-lanes" d={TRACK_PATH} />

          {/* Tremis : voûte courte et voies murées, dessinées sous les repères */}
          {tunnelBands.map((band) => (
            <g
              key={band.id}
              className="city-rush-minimap-tunnel"
              transform={`translate(${band.x.toFixed(2)}, ${band.y.toFixed(2)}) rotate(${band.deg.toFixed(1)})`}
            >
              <rect
                className="city-rush-minimap-tunnel-vault"
                x={(-band.length / 2 - 0.4).toFixed(2)}
                y={(-band.roadHalf - 0.4).toFixed(2)}
                width={(band.length + 0.8).toFixed(2)}
                height={(band.roadHalf * 2 + 0.8).toFixed(2)}
                rx="1"
              />
              {band.walls.map((wall) => (
                <rect
                  key={wall.side}
                  className="city-rush-minimap-tunnel-wall"
                  x={(-band.length / 2 + 0.5).toFixed(2)}
                  y={wall.from.toFixed(2)}
                  width={(band.length - 1).toFixed(2)}
                  height={(wall.to - wall.from).toFixed(2)}
                  rx="0.5"
                />
              ))}
            </g>
          ))}

          {/* Arche de mi-parcours (300 m) & ligne de départ/arrivée */}
          <g
            className="city-rush-minimap-gate"
            transform={`translate(${midGate.centerX.toFixed(2)}, ${midGate.centerY.toFixed(2)}) rotate(${midGate.deg.toFixed(1)})`}
          >
            <line x1="0" y1="-4.6" x2="0" y2="4.6" />
          </g>
          <g
            className="city-rush-minimap-start"
            transform={`translate(${startLine.centerX.toFixed(2)}, ${startLine.centerY.toFixed(2)}) rotate(${startLine.deg.toFixed(1)})`}
          >
            <rect x="-1.4" y="-5.2" width="2.8" height="10.4" rx="0.8" />
            <line x1="0" y1="-5.2" x2="0" y2="5.2" />
          </g>

          {/* Focus radar verrouillé sur notre joueur : halo, anneau cible & cône de direction */}
          <g
            className="city-rush-minimap-focus-target"
            transform={`translate(${focus.x.toFixed(2)}, ${focus.y.toFixed(2)})`}
          >
            <circle className="city-rush-minimap-focus-halo" r="15" fill="url(#city-rush-focus-glow)" />
            <circle className="city-rush-minimap-focus-ring" r="10.5" />
            <g
              className="city-rush-minimap-focus-cone"
              transform={`rotate(${focus.deg.toFixed(1)})`}
            >
              <path d="M 0 0 L 16 -6.5 A 17 17 0 0 1 16 6.5 Z" />
            </g>
          </g>

          {/* Escouade de police du dernier tour : hors classement, mais visible
              pour qu'on sache d'où viennent les sirènes et les vols de bonus. */}
          {police.map((car) => (
            <g
              key={car.id}
              className={`city-rush-minimap-pursuer${car.blocking ? ' is-blockade' : ''}${car.rallied ? ' is-rallied' : ''}`}
              transform={`translate(${car.x.toFixed(2)}, ${car.y.toFixed(2)}) rotate(${car.deg.toFixed(1)})`}
            >
              <title>{car.blocking ? `${car.name} en barrage roulant : elle freine devant le leader` : car.rallied ? `${car.name} rappelée par un contact : elle chasse le pilote qui l’a percutée` : `${car.name} en chasse`}</title>
              <circle className="city-rush-minimap-pursuer-halo" r="7.6" />
              <rect className="city-rush-minimap-pursuer-body" x="-3.8" y="-2.5" width="7.6" height="5" rx="1.5" />
              <rect className="city-rush-minimap-pursuer-light" x="-2.9" y="-1.5" width="2.4" height="3" rx="0.7" />
              <rect className="city-rush-minimap-pursuer-light is-blue" x="0.5" y="-1.5" width="2.4" height="3" rx="0.7" />
            </g>
          ))}

          {/* Emplacement des 4 joueurs sur le circuit (notre joueur dessiné au-dessus) */}
          {markers.map((marker) => (
            <g
              key={marker.id}
              className={`city-rush-minimap-marker${marker.isPlayer ? ' is-player is-focused' : ' is-rival'}`}
              transform={`translate(${marker.x.toFixed(2)}, ${marker.y.toFixed(2)})`}
              style={{ '--marker-color': marker.isPlayer ? '#43ead5' : marker.accent }}
            >
              <g transform={`rotate(${marker.deg.toFixed(1)})`}>
                <polygon
                  className="city-rush-minimap-Pointer"
                  points={marker.isPlayer ? '9.2,0 3.2,-3.4 4.4,0 3.2,3.4' : '6.8,0 2.2,-2.5 3.1,0 2.2,2.5'}
                />
              </g>
              <circle
                className="city-rush-minimap-dot"
                r={marker.isPlayer ? 5.2 : 3.8}
              />
              <text
                className="city-rush-minimap-pin-code"
                y="1.2"
                textAnchor="middle"
              >
                {marker.isPlayer ? 'TOI' : marker.countryCode}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="city-rush-minimap-roster" role="list" aria-label="Emplacement des 4 pilotes">
        {minimap.racers.map((racer) => {
          const progressPct = Math.round(Math.max(0, Math.min(1, Number(racer.progress) || 0)) * 100);
          return (
            <div
              role="listitem"
              key={racer.id}
              className={`city-rush-minimap-racer${racer.isPlayer ? ' is-player is-focused' : ''}`}
              style={{ '--racer-accent': racer.isPlayer ? '#43ead5' : racer.accent }}
              title={`${racer.displayName} (${racer.country}) · ${ordinal(racer.rank)} · tour ${racer.lap}/${CITY_RUSH_LAPS} · ${progressPct} %`}
            >
              <span className="city-rush-minimap-racer-rank">{racer.rank}</span>
              <span className="city-rush-minimap-racer-avatar">
                <CityRushDriverAvatar driver={racer} decorative />
              </span>
              <div className="city-rush-minimap-racer-body">
                <div className="city-rush-minimap-racer-top">
                  <span className="city-rush-minimap-racer-name">
                    <i className="city-rush-minimap-flag" aria-hidden="true">{racer.flag}</i>
                    <b>{racer.name}</b>
                    {racer.isPlayer && <em className="city-rush-you-badge">TOI</em>}
                  </span>
                  <span className="city-rush-minimap-racer-gap">{formatRelativeGap(racer)}</span>
                </div>
                <div className="city-rush-minimap-racer-bar" aria-hidden="true">
                  <i style={{ left: `${progressPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
