import React from 'react';
import { DRIVING_SKILLS, drivingSkillProgress, recommendDrivingExercise } from './drivingProgress.js';
export default function DrivingProgressPanel({ progress, lessons, onPractice }) {
  const recommendation = recommendDrivingExercise(progress, lessons);
  return <section className="driving-progress" aria-label="Progression par compétences">
    <h2>Votre carnet de progression</h2>
    <p>Une compétence confirmée demande 3 réussites sans faute, dans 2 exercices différents, dont une en autonomie. Aucun bonus de vitesse.</p>
    <div className="driving-skill-grid">{DRIVING_SKILLS.map(skill => {
      const state = drivingSkillProgress(progress, skill);
      return <article key={skill.id} className={`driving-skill${state.confirmed ? ' is-confirmed' : ''}`}>
        <h3>{skill.title}</h3><strong>{state.status}</strong>
        <progress max="3" value={Math.min(3,state.successes)} aria-label={`${skill.title} : réussites sans faute`} />
        <p>{Math.min(3,state.successes)}/3 réussites · {Math.min(2,state.scenarios)}/2 exercices · autonomie {state.autonomy ? '✓' : 'à valider'}</p>
        {state.confirmed && <span className="driving-badge">★ {skill.badge}</span>}
      </article>;
    })}</div>
    {recommendation ? <div className="driving-recommendation"><div><h3>Votre prochain entraînement</h3><p>{recommendation.reason}</p><strong>{recommendation.exercise.title}</strong><p>{recommendation.assistance === 'autonomous' ? 'Autonomie' : 'Apprentissage'}</p></div>
      <button type="button" onClick={() => onPractice(recommendation)}>S’entraîner maintenant ▶</button></div>
      : <p className="driving-badge">★ Toutes les compétences sont confirmées dans cette simulation. Continuez à pratiquer des situations variées.</p>}
    <small>Progression pédagogique enregistrée sur cet appareil, distincte du permis. Les contrôles du regard et des angles morts ne sont pas évalués.</small>
  </section>;
}
