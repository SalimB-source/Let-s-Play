import React from 'react';
import { gamePlatforms } from '../lib/gameLibrary';
import ConsoleLogo from './ConsoleLogo';

/** Shared podium rendering for the player hub and public profile. */
export default function TopGamePill({ title, rank, children }) {
  const platforms = gamePlatforms(title);
  const podiumClass = rank <= 3 ? ` player-game-pill-top-${rank}` : '';
  return (
    <span className={`player-game-pill${podiumClass}`}>
      {rank <= 3 && <span className={`player-game-rank player-game-rank-${rank}`}>TOP {rank}</span>}
      <span className="player-game-pill-title">{title}</span>
      {platforms.length > 0 && (
        <span className="player-game-pill-platforms">
          {platforms.map((p) => (
            <span key={p} className="player-game-pill-tag">
              <ConsoleLogo consoleId={p} size={11} /> {p}
            </span>
          ))}
        </span>
      )}
      {children}
    </span>
  );
}
