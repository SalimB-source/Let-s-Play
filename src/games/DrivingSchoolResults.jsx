import React, { useRef } from 'react';
import DrivingErrorReview from './DrivingErrorReview';
import { drivingSessionPassed } from './drivingSchool.js';
import { schoolResultSummary } from './drivingSchoolInterface.js';
export default function DrivingSchoolResults({ session, sectionRef, onRestart, onQuit, onNext, nextExercise, badges }) {
  const passed = drivingSessionPassed(session), summary = schoolResultSummary(session,passed), details = useRef(null);
  function review() { if(details.current) { details.current.open=true; const first=details.current.querySelector('.driving-error-review'); if(first)first.open=true; requestAnimationFrame(()=>{first?.querySelector('summary')?.focus();first?.scrollIntoView({block:'center',behavior:'smooth'});}); } }
  return <section className="school-result" aria-label="Bilan de l’exercice" ref={sectionRef} tabIndex={-1}>
    <header><span className={`school-result-symbol${passed?' is-passed':''}`} aria-hidden="true">{passed?'✓':session.status==='abandoned'?'↶':'↻'}</span><span className="school-kicker">{session.exercise.title} · BILAN</span><h1>{summary.title}</h1><p>{session.status==='abandoned'?'Exercice interrompu':passed?'Exercice réussi':'Exercice à retravailler'}</p></header>
    <div className="school-result-lessons"><article><span>✓ CE QUE VOUS AVEZ FAIT</span><p>{summary.positive}</p></article><article><span>↗ LE PROCHAIN BON RÉFLEXE</span><p>{summary.improvement}</p></article></div>
    {badges.length>0&&<div className="driving-earned-badges" role="status"><h3>Nouveau badge débloqué !</h3>{badges.map(badge=><p key={badge}>★ {badge}</p>)}</div>}
    <nav className="school-result-actions" aria-label="Actions après l’exercice"><button type="button" className="school-primary" onClick={onRestart}>Recommencer ↻</button><button type="button" className="school-secondary" disabled={!nextExercise} onClick={onNext}>Exercice suivant →</button>{session.faults.length>0&&<button type="button" className="school-secondary" onClick={review}>Revoir mon erreur</button>}<button type="button" className="school-text-button" onClick={onQuit}>Quitter</button></nav>
    {!nextExercise&&<p>Vous avez atteint la dernière situation. Votre carnet vous propose la suite.</p>}
    <details ref={details} className="school-result-details"><summary>{session.faults.length?`Comprendre mes erreurs (${session.faults.length})`:'Mon résultat en détail'}</summary><p><strong>{session.score}/100</strong> · {session.checkpoint}/{session.route.length} étapes · {Math.round(session.distance)} m parcourus</p><p>Réussite : toutes les étapes, au moins 70/100 et aucune faute éliminatoire. Les badges demandent une réussite sans faute.</p>{session.status==='timeout'&&<p className="driving-error">Temps imparti écoulé.</p>}{session.status==='outside'&&<p className="driving-error">Sortie de la section autorisée.</p>}
      {session.faults.map((fault,i)=><div key={i} className="school-result-fault"><strong className="driving-error">{fault.label} · −{fault.points} points {fault.critical?'(éliminatoire)':''}</strong><p>{fault.reason}</p>{fault.position&&<DrivingErrorReview fault={fault} exercise={session.exercise} onRetry={onRestart}/>}</div>)}
      {!session.faults.length&&<p>Aucune faute détectée sur la portion effectuée.</p>}
    </details>
    <details className="school-result-details"><summary>La règle à retenir</summary><p>{session.exercise.theory}</p>{session.exercise.source&&<a href={session.exercise.source} target="_blank" rel="noreferrer">Consulter la référence française ↗</a>}<p>Simulation non homologuée. Les durées d’arrêt de validation sont pédagogiques, pas des durées légales.</p></details>
  </section>;
}
