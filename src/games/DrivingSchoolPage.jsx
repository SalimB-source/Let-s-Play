import DrivingSchoolHub from './DrivingSchoolHub';
import DrivingSchoolResults from './DrivingSchoolResults';
import SchoolDialog from './SchoolDialog';
import { readSchoolSettings, saveSchoolSettings } from './drivingSchoolInterface.js';
import { readDrivingProgress, saveDrivingProgress, recordDrivingProgress, newlyEarnedDrivingBadges } from './drivingProgress.js';
import { withDrivingAssistance, drivingLearningNotice } from './drivingLearning.js';
import { createPortal } from 'react-dom';
import { createDrivingFeedbackAudio, drivingFeedbackEvent } from './drivingFeedbackAudio.js';
import { drivingLiveAssistance } from './drivingLiveInstruction.js';
import { varyDrivingTraffic } from './drivingTrafficVariation.js';
import DrivingSpeedAlert from './DrivingSpeedAlert';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
const ViceCityFreeRoam = lazy(() => import('./ViceCityFreeRoam'));
import { CITY_RUSH_CARS } from './cityRushRules.js';
import { DRIVING_LESSONS, createDrivingSession, stepDrivingSession, drivingSessionPassed } from './drivingSchool.js';
import './driving-school.css';
import './driving-school-interface.css';
const SAVE_KEY = 'letsplay_driving_school_v1';
function readHistory() { try { const data = JSON.parse(localStorage.getItem(SAVE_KEY)); return Array.isArray(data) ? data.slice(0, 20) : []; } catch { return []; } }
export default function DrivingSchoolPage({ onFreeDrive }) {
  const [lesson, setLesson] = useState(DRIVING_LESSONS.find((exercise) => exercise.jurisdiction === 'FR') || DRIVING_LESSONS[0]);
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [sample, setSample] = useState(null);
  const [assistance, setAssistance] = useState('guided');
  const [hubView, setHubView] = useState('home');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [settings, setSettings] = useState(() => { try { return readSchoolSettings(localStorage); } catch { return readSchoolSettings(null); } });
  function updateSettings(value) { setSettings(value); try { saveSchoolSettings(localStorage,value); } catch { /* optional */ } }
  const [notice, setNotice] = useState(null);
  const [progress, setProgress] = useState(() => { try { return readDrivingProgress(localStorage); } catch { return readDrivingProgress(null); } });
  const progressRef = useRef(progress);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const current = useRef(null);
  const feedbackAudio = useRef(null);
  useEffect(() => () => { feedbackAudio.current?.dispose(); feedbackAudio.current = null; }, []);
  const runId = useRef(0);
  const resultRef = useRef(null);
  useEffect(() => {
    if (session && session.status !== 'active') {
      resultRef.current?.scrollIntoView({ block: 'start' });
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [session?.status]);
  const [attempt, setAttempt] = useState(0);
  function start(mode, exercise = lesson, help = assistance) {
    feedbackAudio.current ||= createDrivingFeedbackAudio();
    feedbackAudio.current.unlock();
    runId.current += 1;
    setAttempt(runId.current);
    const baseExercise = DRIVING_LESSONS.find((item) => item.id === exercise.id) ?? exercise;
    const value = createDrivingSession(mode, withDrivingAssistance(varyDrivingTraffic(baseExercise), help));
    setPaused(false); pausedRef.current = false;
    current.current = value; setEarnedBadges([]); setNotice(null); setSample(null); setSession(value);
  }
  function restart() {
    const previous = current.current;
    if (!previous) return;
    setLesson(previous.exercise);
    start(previous.mode, previous.exercise, previous.exercise.teachingAssistance ?? 'guided');
  }
  function quitResult() {
    runId.current += 1;
    current.current = null;
    setSession(null); setSample(null);
    setHubView('situations');
    requestAnimationFrame(() => { const heading = document.querySelector('.school-view-heading'); heading?.focus({preventScroll:true}); heading?.scrollIntoView({block:'start'}); });
  }
  function abandon() { current.current = { ...current.current, status: 'abandoned' }; setSession(current.current); }
  function telemetry(value) {
    if (current.current?.status !== 'active' || pausedRef.current) return;
    const next = stepDrivingSession(current.current, value);
    feedbackAudio.current?.play(drivingFeedbackEvent(current.current, next));
    const learningNotice = drivingLearningNotice(current.current, next);
    if (learningNotice) setNotice(learningNotice);
    current.current = next; setSample(value); setSession(next);
    if (next.status !== 'active') {
      const updatedProgress = recordDrivingProgress(progressRef.current, next, drivingSessionPassed(next));
      setEarnedBadges(newlyEarnedDrivingBadges(progressRef.current, updatedProgress));
      progressRef.current = updatedProgress; setProgress(updatedProgress);
      try { saveDrivingProgress(localStorage, updatedProgress); } catch { /* storage unavailable */ }
      const entry = { date: new Date().toISOString(), title: next.exercise.title, score: next.score, passed: drivingSessionPassed(next) };
      setHistory((previous) => { const saved = [entry, ...previous].slice(0, 20); try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* optional persistence */ } return saved; });
    }
  }
  const active = session?.status === 'active';
  useEffect(() => {
    if (!active) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [active]);
  const completedIndex = session ? DRIVING_LESSONS.findIndex((item) => item.id === session.exercise.id) : -1;
  const nextExercise = completedIndex >= 0 ? DRIVING_LESSONS[completedIndex + 1] : null;
  const target = active ? session.route[session.checkpoint] : null;
  const liveAssistance = active ? drivingLiveAssistance(session, sample) : null;
  const content = <main data-text-size={settings.textSize} className={`driving-school school-interface ${active ? 'is-driving' : ''} ${active && session.speedStatus?.showWarning ? 'is-overspeed' : ''}`}>
    {active ? <>
      <DrivingSpeedAlert status={session.speedStatus} />
      <section className="driving-objective driving-top-brief" data-assistance-state={liveAssistance.state} aria-label="Objectif actuel" aria-live="polite" aria-atomic="true">
        <p>{liveAssistance.symbol && <span className="driving-live-symbol" aria-hidden="true">{liveAssistance.symbol}</span>}<span className="driving-live-copy">{liveAssistance.text}</span></p>
      </section>
      <Suspense fallback={<div className="driving-school-world school-world-loading" role="status">Préparation de la route…</div>}>
      <ViceCityFreeRoam key={`${session.exercise.id}-${attempt}`} carId={CITY_RUSH_CARS[0].id} schoolMode schoolExercise={session.exercise} schoolTarget={target} schoolPriorityState={session.priorityState} schoolFault={session.mode !== 'exam' && notice?.kind === 'error' && session.elapsed < notice.until ? notice.text : null} schoolNotice={session.mode !== 'exam' && notice?.kind === 'success' && session.elapsed < notice.until ? notice.text : null} onTelemetry={(value) => { if (attempt === runId.current) telemetry(value); }} schoolControls={settings} schoolPaused={paused} onExit={() => setPaused(value => !value)} />
      </Suspense>
      <aside className="driving-instructor" aria-label="Consigne de l’exercice">
        <header className="driving-brief-heading">
          <h2>{session.exercise.title}</h2>
          <small>Étape {session.checkpoint + 1}/{session.route.length} · {session.exercise.teachingAssistance === 'autonomous' ? 'Sans aide' : 'Avec aide'}</small>
          <ol className="school-stage-dots" aria-label="Progression de l’exercice">{session.route.map((_, index) => <li key={index} className={index < session.checkpoint ? 'is-done' : index === session.checkpoint ? 'is-current' : ''} aria-current={index === session.checkpoint ? 'step' : undefined} aria-label={`Étape ${index + 1} : ${index < session.checkpoint ? 'validée' : index === session.checkpoint ? 'en cours' : 'à venir'}`}>{index < session.checkpoint ? '✓' : ''}</li>)}</ol>
        </header>
        <div className="driving-max-speed"><span className="school-limit-sign" role="img" aria-label={`Limitation à ${session.roadLimit ?? session.limit} kilomètres par heure`}>{session.roadLimit ?? session.limit}</span><small>MAX. KM/H</small></div>
        <footer className="driving-brief-footer">
          <div className="driving-quick-stats">
            <strong>{sample ? `${Math.round(Math.hypot(sample.x - target.x, sample.z - target.z))} m` : 'Départ'}</strong>
            {['stop', 'green-stop', 'park'].includes(target.kind) && <span className="driving-hold">Arrêt : {Math.min(session.hold ?? 0, target.hold ?? 1).toFixed(1)}/{target.hold ?? 1} s</span>}
          </div>
          <button type="button" className="driving-brief-restart" onClick={restart}>Recommencer ↻</button>
          <details className="driving-brief-details">
            <summary>Détails et actions</summary>
            <div className="driving-brief-popover">
              <div className="driving-brief-exercise">{session.exercise.title}</div>
              <small>{Math.floor(session.elapsed)} s · {session.mode === 'exam' ? 'Évaluation' : `${session.score}/100`}</small>
              <div className="driving-session-actions">
                <button type="button" className="driving-session-quit" onClick={abandon}>Quitter l’exercice</button>
              </div>
            </div>
          </details>
        </footer>
      </aside>
      {paused && <SchoolDialog title="Exercice en pause" onClose={() => setPaused(false)} className="school-pause"><span className="school-kicker">SOUFFLEZ, LA ROUTE PEUT ATTENDRE</span><h2>On fait une pause ?</h2><p>La voiture, les autres usagers et le temps de l’exercice sont arrêtés.</p><button type="button" className="school-primary" onClick={() => setPaused(false)}>Reprendre →</button><div className="school-pause-settings"><label>Direction tactile<select value={settings.steering} onChange={e => updateSettings({...settings,steering:e.target.value})}><option value="buttons">Boutons gauche / droite</option><option value="wheel">Volant tactile</option></select></label><label>Taille des consignes<select value={settings.textSize} onChange={e => updateSettings({...settings,textSize:e.target.value})}><option value="standard">Standard</option><option value="large">Grande</option></select></label></div><button type="button" className="school-secondary" onClick={restart}>Recommencer ↻</button><button type="button" className="school-text-button" onClick={() => { setPaused(false); abandon(); }}>Quitter l’exercice</button></SchoolDialog>}
    </> : <div className="school-menu">
      {session && <DrivingSchoolResults session={session} sectionRef={resultRef} onRestart={restart} onQuit={quitResult} badges={earnedBadges} nextExercise={nextExercise} onNext={() => { if(nextExercise) { setLesson(nextExercise); start(session.mode,nextExercise,session.exercise.teachingAssistance ?? 'guided'); } }} />}
      <DrivingSchoolHub onFreeDrive={onFreeDrive} lessons={DRIVING_LESSONS} progress={progress} assistance={assistance} onAssistance={setAssistance} settings={settings} onSettings={updateSettings} history={history} view={hubView} onViewChange={setHubView} onStart={(mode, exercise, help) => { setLesson(exercise); start(mode,exercise,help); }} />
    </div>}
  </main>;
  // Escape page animations/stacking contexts: the brief and scene stay together.
  return active ? createPortal(content, document.body) : content;
}
