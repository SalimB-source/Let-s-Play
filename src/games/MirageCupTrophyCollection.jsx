import React from 'react';
import { useAchievements } from '../achievements/AchievementContext';
import { MIRAGE_CUP_TROPHIES_KEY } from '../achievements/engine';
import MirageCupTrophyEmblem from './MirageCupTrophyEmblem';
import { CUPS } from './mirageCup';
import './mirage-cup-trophy-collection.css';

/**
 * Collection personnelle : un seul trophée affiché par coupe remportée.
 *
 * Deux présentations :
 *   - `variant="section"` (défaut) : une section complète du profil joueur ;
 *   - `variant="inline"` : un bloc compact, destiné à être rangé DANS la
 *     catégorie « Mirage Rush » de la vitrine à trophées
 *     (`src/achievements/TrophyShelf.jsx`) — sans double en-tête de section.
 */
export default function MirageCupTrophyCollection({ variant = 'section' }) {
  const { state } = useAchievements();
  const earnedIds = new Set(state?.sets?.[MIRAGE_CUP_TROPHIES_KEY] || []);
  const trophies = CUPS.filter((cup) => earnedIds.has(cup.id));
  const inline = variant === 'inline';

  const body = (
    <>
      {inline && (
        <div className="mirage-profile-trophies-head">
          <span>Trophées Mirage Rush · coupes</span>
          <small>{trophies.length}/{CUPS.length}</small>
        </div>
      )}
      {!inline && (
        <div className="player-section-header">
          <h2 id="mirage-profile-trophies-title">Trophées Mirage Rush</h2>
          <p>Chaque coupe remportée est conservée ici une seule fois.</p>
        </div>
      )}

      {trophies.length > 0 ? (
        <ul className="mirage-profile-trophy-grid" aria-label="Coupes Mirage Rush remportées">
          {trophies.map((cup) => (
            <li className={`mirage-profile-trophy-card is-${cup.trophyDesign}`} data-cup-id={cup.id} data-trophy-design={cup.trophyDesign} key={cup.id}>
              <span className="mirage-profile-trophy-emblem" aria-hidden="true"><MirageCupTrophyEmblem design={cup.trophyDesign} /></span>
              <span className="mirage-profile-trophy-copy">
                <small>MODE COUPE · VAINQUEUR</small>
                <strong>{cup.name}</strong>
                <span>{cup.stages.length} courses · trophée remporté</span>
              </span>
              <span className="mirage-profile-trophy-owned">ACQUIS</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={inline ? 'mirage-profile-trophies-empty' : 'player-empty-note'}>
          {inline
            ? 'Aucune coupe remportée pour l’instant — la première place du classement général d’une coupe ajoute son trophée ici.'
            : 'Aucun trophée remporté pour l’instant. Termine une coupe à la première place pour l’ajouter à ta collection.'}
        </p>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="mirage-profile-trophies is-inline" aria-label="Coupes Mirage Rush remportées">
        {body}
      </div>
    );
  }

  return (
    <section className="player-section mirage-profile-trophies" aria-labelledby="mirage-profile-trophies-title">
      {body}
    </section>
  );
}
