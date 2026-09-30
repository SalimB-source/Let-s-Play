import React, { useEffect, useState } from 'react';
import MirageCharacterPortrait from './MirageCharacterPortrait';
import { formatGap, formatRaceTime } from './mirageStandings';

/**
 * Tableau des positions de fin de course (Duel et salons en ligne).
 *
 * Présentation seule : les lignes viennent de `buildDuelStandings` /
 * `buildRoomStandings` (mirageStandings.js), déjà classées et numérotées.
 * La ligne du joueur (`isYou`) est mise en avant, les trois premiers ont leur
 * médaille, et le tableau se lit aussi bien au lecteur d'écran (vrai <table>).
 *
 * @param {object[]} rows       lignes classées
 * @param {string}   caption    légende (lue par les lecteurs d'écran)
 * @param {boolean}  [showScore] colonne des points ; par défaut, affichée dès que
 *                               deux cavaliers au moins ont un score à comparer
 */
export default function MirageScoreboard({ rows = [], caption = 'Classement de la course', showScore, className = '' }) {
  const withScore = showScore ?? rows.filter((row) => row.score !== null && row.score !== undefined).length >= 2;
  // Les lignes apparaissent l'une après l'autre à l'ouverture, puis plus : un classement
  // en direct qui se réordonne ne doit pas rejouer l'animation (déplacer un nœud la relance).
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Le cadre sert de conteneur : le tableau s'adapte à la largeur qu'on lui donne (fenêtre de
    // résultats, overlay de duel, panneau du salon), pas à celle de l'écran.
    <div className={`mirage-scoreboard-frame${className ? ` ${className}` : ''}`}>
      <table className={`mirage-scoreboard${entering ? ' is-entering' : ''}`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="mirage-sb-col-pos">Pos.</th>
            <th scope="col" className="mirage-sb-col-rider">Cavalier</th>
            <th scope="col" className="mirage-sb-col-time">Temps</th>
            {withScore && <th scope="col" className="mirage-sb-col-pts">Score</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.key}
              className={[
                'mirage-sb-row',
                `is-pos-${Math.min(row.rank, 4)}`,
                row.isYou ? 'is-you' : '',
                row.status === 'finished' ? 'is-finished' : `is-${row.status}`,
              ].filter(Boolean).join(' ')}
              style={{ '--sb-index': index }}
            >
              <td className="mirage-sb-pos">
                <span className="mirage-sb-medal">{row.rank}</span>
              </td>
              <td className="mirage-sb-rider">
                <div>
                  <MirageCharacterPortrait
                    character={row.character}
                    colors={row.palette}
                    className="mirage-sb-portrait"
                    decorative
                  />
                  {/* Nom puis étiquettes ; si l'espace manque, les étiquettes passent sous le nom. */}
                  <span className="mirage-sb-who">
                    <span className="mirage-sb-name" title={row.name}>{row.name}</span>
                    {row.isYou && <i className="mirage-sb-tag is-you">TOI</i>}
                    {row.tag && <i className="mirage-sb-tag">{row.tag}</i>}
                  </span>
                </div>
              </td>
              <td className="mirage-sb-time"><TimeCell row={row} /></td>
              {withScore && <td className="mirage-sb-pts"><ScoreCell row={row} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimeCell({ row }) {
  if (row.status === 'finished') {
    return (
      <>
        <strong>{row.time === null ? 'ARRIVÉ' : formatRaceTime(row.time)}</strong>
        {row.gap !== null && <small>{formatGap(row.gap)}</small>}
      </>
    );
  }
  // Pas (encore) arrivé : ce qui départage ces cavaliers, c'est la distance qu'il leur reste.
  const state = row.status === 'racing' ? 'EN PISTE' : row.status === 'offline' ? 'HORS LIGNE' : 'DU BUT';
  return (
    <>
      <strong className="is-remaining">à {row.remaining} m</strong>
      <small className={row.status === 'racing' ? 'is-live' : undefined}>{state}</small>
    </>
  );
}

function ScoreCell({ row }) {
  if (row.score === null || row.score === undefined) return <span className="mirage-sb-none" aria-label="Pas de score">—</span>;
  return (
    <>
      <strong>{row.score.toLocaleString('fr-FR')}</strong>
      <small>PTS</small>
    </>
  );
}
