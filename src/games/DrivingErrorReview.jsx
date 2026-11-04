import React from 'react';
import { reviewMapPoint } from './drivingLearning.js';

export default function DrivingErrorReview({ fault, exercise, onRetry }) {
  const snapshot = fault.review;
  const project = point => reviewMapPoint(exercise.bounds, point);
  const player = project(snapshot?.player ?? fault.position);
  const previous = snapshot?.previous ? project(snapshot.previous) : null;
  const target = exercise.stages[fault.checkpoint ?? 0];
  const goal = target ? project(target) : null;
  return <details className="driving-error-review">
    <summary>Revoir mon erreur</summary>
    <h3>{fault.label}</h3>
    <svg viewBox="0 0 320 220" role="img" aria-label={`Schéma simplifié de la faute : ${fault.label}`}>
      <rect x="1" y="1" width="318" height="218" rx="10" fill="#162735" />
      {goal && <circle cx={goal.x} cy={goal.y} r="12" fill="none" stroke="#71caff" strokeWidth="2" strokeDasharray="4 3" />}
      {(snapshot?.actors ?? []).filter(actor => actor.x >= exercise.bounds.minX && actor.x <= exercise.bounds.maxX && actor.z >= exercise.bounds.minZ && actor.z <= exercise.bounds.maxZ).map(actor => {
        const point = project(actor);
        return <g key={actor.id}><circle cx={point.x} cy={point.y} r="7" fill="#ffcc67" /><text x={Math.min(245,Math.max(10,point.x + 10))} y={Math.max(14,point.y - 8)} fill="#ffdf9e" fontSize="10">{actor.type === 'pedestrian' ? 'Piéton' : actor.type === 'cyclist' ? 'Cycliste' : 'Véhicule'}</text></g>;
      })}
      {previous && <line x1={previous.x} y1={previous.y} x2={player.x} y2={player.y} stroke="#ff8c8c" strokeWidth="3" />}
      <circle cx={player.x} cy={player.y} r="7" fill="#ff8c8c" />
      <text x={Math.min(260,Math.max(10,player.x + 10))} y={Math.max(14,player.y - 10)} fill="#fff" fontSize="11">Vous</text>
      <text x="12" y="208" fill="#b8d3e3" fontSize="10">Vue de dessus · repère d’étape en bleu · nord en haut</text>
    </svg>
    <p>Schéma simplifié au moment de la faute, pas une vidéo.</p>
    <p><strong>Ce qui s’est passé :</strong> {fault.reason}</p>
    <p><strong>Le bon réflexe :</strong> {fault.advice}</p>
    <p>{exercise.theory}</p>
    {exercise.article && <a href={exercise.source} target="_blank" rel="noreferrer">Référence française de l’exercice : {exercise.article} ↗</a>}
    <button type="button" onClick={onRetry}>Réessayer cet exercice ↻</button>
  </details>;
}
