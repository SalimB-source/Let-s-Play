import React, { useEffect, useState } from 'react';
import { CITY_RUSH_TUTORIAL_STEPS } from './cityRushTutorial.js';
import './city-rush-tutorial.css';

function DemoCar({ kind = 'player' }) {
  const police = kind === 'police';
  const vehicleClass = police ? 'is-police' : kind === 'traffic' ? 'is-traffic' : 'is-player';
  return (
    <g className={`cr-tutorial-demo-car ${vehicleClass}`}>
      <ellipse className="cr-tutorial-car-shadow" cx="17" cy="51" rx="20" ry="8" />
      <rect className="cr-tutorial-car-tyre" x="1" y="12" width="5" height="13" rx="2" />
      <rect className="cr-tutorial-car-tyre" x="28" y="12" width="5" height="13" rx="2" />
      <rect className="cr-tutorial-car-tyre" x="1" y="36" width="5" height="12" rx="2" />
      <rect className="cr-tutorial-car-tyre" x="28" y="36" width="5" height="12" rx="2" />
      <rect className="cr-tutorial-car-body" x="4" y="1" width="26" height="52" rx="9" />
      <path className="cr-tutorial-car-hood" d="M9 5 Q17 1 25 5 L27 13 H7 Z" />
      <path className="cr-tutorial-car-glass" d="M8 17 Q17 13 26 17 L24 27 H10 Z" />
      <path className="cr-tutorial-car-glass is-rear" d="M10 33 H24 L26 42 Q17 46 8 42 Z" />
      {police && <>
        <path className="cr-tutorial-police-stripe" d="M5 28 H29 V33 H5 Z" />
        <rect className="cr-tutorial-police-light" x="10" y="27" width="7" height="3" rx="1" />
        <rect className="cr-tutorial-police-light is-blue" x="18" y="27" width="7" height="3" rx="1" />
      </>}
      {!police && <>
        <rect className="cr-tutorial-car-light" x="7" y="2" width="6" height="3" rx="1" />
        <rect className="cr-tutorial-car-light" x="21" y="2" width="6" height="3" rx="1" />
        <path className="cr-tutorial-car-decal" d="M8 47 H26" />
      </>}
    </g>
  );
}

function DemoPickup({ type = 'boost' }) {
  if (type === 'ammo') {
    return (
      <g className="cr-tutorial-pickup is-ammo">
        <circle className="cr-tutorial-pickup-glow" r="25" />
        <rect x="-13" y="-19" width="26" height="38" rx="5" />
        <path className="cr-tutorial-ammo-slots" d="M-7 -10 H7 M-7 -3 H7 M-7 4 H7 M-7 11 H7" />
        <path className="cr-tutorial-pickup-spark" d="M-22 -16 l-7 -5 M22 -16 l7 -5" />
      </g>
    );
  }
  if (type === 'health') {
    return (
      <g className="cr-tutorial-pickup is-health">
        <circle className="cr-tutorial-pickup-glow" r="25" />
        <rect x="-18" y="-18" width="36" height="36" rx="9" />
        <path d="M-3 -11 H3 V-3 H11 V3 H3 V11 H-3 V3 H-11 V-3 H-3 Z" />
      </g>
    );
  }
  return (
    <g className="cr-tutorial-pickup is-boost">
      <circle className="cr-tutorial-pickup-glow" r="25" />
      <circle className="cr-tutorial-boost-ring" r="17" />
      <path d="M3 -17 L-8 1 H-1 L-4 17 L9 -3 H2 Z" />
    </g>
  );
}

function TutorialArtwork({ step }) {
  const scene = step.scene;
  const playerBase = scene === 'health' ? 'translate(220 222)' : 'translate(224 222)';
  return (
    <div className={`cr-tutorial-art is-${scene}`} style={{ '--tutorial-accent': step.accent }} aria-hidden="true">
      <div className="cr-tutorial-skyline">
        <i /><i /><i /><i /><i /><i /><i /><i /><i />
      </div>
      <svg className="cr-tutorial-road" viewBox="0 0 480 320" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="cr-tutorial-road-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#222b3b" />
            <stop offset="1" stopColor="#101722" />
          </linearGradient>
          <linearGradient id="cr-tutorial-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={step.accent} stopOpacity="0.2" />
            <stop offset="1" stopColor={step.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="cr-tutorial-road-edge" d="M157 57 H323 L480 320 H0 Z" />
        <path className="cr-tutorial-road-surface" d="M164 57 H316 L468 320 H12 Z" fill="url(#cr-tutorial-road-fill)" />
        <path className="cr-tutorial-road-glow" d="M164 57 H316 L468 320 H12 Z" fill="url(#cr-tutorial-glow)" />
        <path className="cr-tutorial-road-line" d="M202 57 L126 320 M240 57 V320 M278 57 L354 320" />
        <path className="cr-tutorial-road-dashes" d="M202 57 L126 320 M240 57 V320 M278 57 L354 320" />
        <path className="cr-tutorial-road-shoulder" d="M164 57 L12 320 M316 57 L468 320" />

        {scene === 'steering' && <>
          <g transform="translate(293 139) scale(.72)"><DemoCar kind="traffic" /></g>
          <path className="cr-tutorial-steer-arrow is-left" d="M176 213 C154 192 148 171 160 151" />
          <path className="cr-tutorial-steer-arrow is-right" d="M297 213 C319 192 325 171 313 151" />
          <path className="cr-tutorial-steer-arrow-head is-left" d="M153 160 L160 148 L169 159" />
          <path className="cr-tutorial-steer-arrow-head is-right" d="M304 159 L313 148 L322 160" />
        </>}

        {scene === 'speed' && <>
          <g transform="translate(173 126) scale(.68)"><DemoCar kind="traffic" /></g>
          <path className="cr-tutorial-speed-streak" d="M218 185 V140 M232 170 V124 M249 177 V132 M263 187 V146" />
          <path className="cr-tutorial-oncoming-arrow" d="M188 109 V157 M181 149 L188 158 L195 149" />
          <circle className="cr-tutorial-line-glow" cx="240" cy="229" r="38" />
        </>}

        {scene === 'magazine' && <>
          <g transform="translate(222 101) scale(.72)" className="cr-tutorial-target"><DemoCar kind="police" /></g>
          <g transform="translate(239 161)"><g className="cr-tutorial-moving-pickup"><DemoPickup type="ammo" /></g></g>
          <path className="cr-tutorial-shot-line" d="M240 221 L239 145" />
          <path className="cr-tutorial-shot-flash" d="M231 215 L240 201 L249 215 L240 211 Z" />
        </>}

        {scene === 'boost' && <>
          <g transform="translate(270 155)"><g className="cr-tutorial-moving-pickup"><DemoPickup type="boost" /></g></g>
          <path className="cr-tutorial-boost-streak" d="M198 198 L180 226 M215 187 L204 216 M281 191 L298 221 M296 204 L316 230" />
          <circle className="cr-tutorial-speed-burst" cx="240" cy="210" r="48" />
        </>}

        {scene === 'bazooka' && <>
          <g transform="translate(293 106)" className="cr-tutorial-container">
            <path d="M0 12 L35 0 L62 48 L26 60 Z" />
            <path className="cr-tutorial-container-door" d="M9 15 L33 7 L53 44 L29 52 Z" />
            <path className="cr-tutorial-container-ribs" d="M11 15 L31 52 M20 12 L40 49 M29 9 L49 46" />
            <path className="cr-tutorial-container-mark" d="M20 28 L31 23 L37 34 L27 38 Z" />
          </g>
          <path className="cr-tutorial-bazooka-arrow" d="M262 214 C281 200 291 183 294 159" />
          <g transform="translate(328 154) scale(.65)" className="cr-tutorial-target"><DemoCar kind="police" /></g>
          <path className="cr-tutorial-rocket-line" d="M245 221 L310 167" />
        </>}

        {scene === 'police' && <>
          <circle className="cr-tutorial-police-warning" cx="240" cy="211" r="46" />
          <circle className="cr-tutorial-police-reticle" cx="240" cy="207" r="30" />
          <path className="cr-tutorial-reticle-cross" d="M240 166 V177 M240 237 V248 M199 207 H210 M270 207 H281" />
          <g transform="translate(222 122) scale(.78)" className="cr-tutorial-police-approach"><DemoCar kind="police" /></g>
          <path className="cr-tutorial-evasion-arrow" d="M288 215 C309 198 315 179 306 162" />
        </>}

        {scene === 'garage' && <>
          <path className="cr-tutorial-garage-glow" d="M160 167 V129 Q160 111 181 111 H300 Q321 111 321 129 V167" />
          <path className="cr-tutorial-garage-frame" d="M160 167 V129 Q160 111 181 111 H300 Q321 111 321 129 V167" />
          <path className="cr-tutorial-garage-sign" d="M195 111 V96 H285 V111" />
          <path className="cr-tutorial-garage-chevron" d="M205 140 l9 8 -9 8 M226 140 l9 8 -9 8 M247 140 l9 8 -9 8 M268 140 l9 8 -9 8" />
          <g transform="translate(182 86)"><g className="cr-tutorial-garage-star"><path d="M0 -10 L3 -3 L10 -3 L5 2 L7 10 L0 6 L-7 10 L-5 2 L-10 -3 L-3 -3 Z" /></g></g>
          <g transform="translate(298 86)"><g className="cr-tutorial-garage-star is-second"><path d="M0 -10 L3 -3 L10 -3 L5 2 L7 10 L0 6 L-7 10 L-5 2 L-10 -3 L-3 -3 Z" /></g></g>
        </>}

        {scene === 'health' && <>
          <g transform="translate(291 144)"><g className="cr-tutorial-moving-pickup"><DemoPickup type="health" /></g></g>
          <path className="cr-tutorial-damage-spark" d="M205 210 L217 194 L224 205 L236 187 L238 207 L255 198 L246 217" />
          <g className="cr-tutorial-heart-meter" transform="translate(76 94)">
            <rect x="0" y="0" width="84" height="17" rx="8" />
            <rect className="is-filled" x="4" y="4" width="38" height="9" rx="4" />
          </g>
        </>}

        {scene === 'ramp' && <>
          <path className="cr-tutorial-ramp-shadow" d="M180 180 L237 145 L300 180 L240 199 Z" />
          <path className="cr-tutorial-ramp" d="M180 174 L237 140 L300 174 L240 193 Z" />
          <path className="cr-tutorial-ramp-stripe" d="M198 174 L240 150 M217 182 L260 157 M238 188 L280 164" />
          <g transform="translate(313 119) scale(.66)"><DemoCar kind="traffic" /></g>
          <ellipse className="cr-tutorial-jump-shadow" cx="240" cy="254" rx="22" ry="9" />
        </>}

        {scene === 'modes' && <>
          <path className="cr-tutorial-checkpoint-arch" d="M173 167 V111 Q173 95 191 95 H289 Q307 95 307 111 V167" />
          <path className="cr-tutorial-checkpoint-lights" d="M184 110 H296 M184 118 H296" />
          <g className="cr-tutorial-checkpoint-label" transform="translate(224 71)">
            <rect x="0" y="0" width="34" height="21" rx="6" />
            <text x="17" y="14">CP</text>
          </g>
          <path className="cr-tutorial-finish-flag" d="M292 71 V45 L324 53 L292 61" />
          <circle className="cr-tutorial-trophy-glow" cx="241" cy="177" r="51" />
          <g transform="translate(225 153)">
            <g className="cr-tutorial-trophy">
              <path d="M6 0 H27 V13 Q27 26 16.5 28 Q6 26 6 13 Z" />
              <path className="cr-tutorial-trophy-handle" d="M6 5 H1 V12 Q2 19 9 20 M27 5 H32 V12 Q31 19 24 20" />
              <path className="cr-tutorial-trophy-stem" d="M16.5 28 V36 M10 37 H23" />
            </g>
          </g>
        </>}

        <g transform={playerBase}>
          <g className="cr-tutorial-player-motion"><DemoCar /></g>
        </g>
      </svg>
      <span className="cr-tutorial-art-label">{step.visual}</span>
      <span className="cr-tutorial-art-corner">VICE CITY RUSH <i>·</i> TRAINING RUN</span>
    </div>
  );
}

function TutorialKeys({ step }) {
  return (
    <div className="cr-tutorial-keys" aria-label="Commandes de cette démonstration">
      <div className="cr-tutorial-key-list">
        {step.controls.map((control) => (
          control.length <= 3 && !control.includes(' ')
            ? <kbd key={control}>{control}</kbd>
            : <span className="cr-tutorial-action-chip" key={control}>{control}</span>
        ))}
      </div>
      <span className="cr-tutorial-touch-chip"><i aria-hidden="true">⌁</i>{step.touch}</span>
    </div>
  );
}

export default function CityRushTutorial({
  inGame = true,
  visible = true,
  coursePhase = 'playing',
  onClose = () => {},
  lessonIndex = 0,
  completedCount = 0,
  tick = null,
  police = false,
  complete = false,
}) {
  const total = CITY_RUSH_TUTORIAL_STEPS.length;
  const paused = coursePhase !== 'playing';
  const liveIndex = Math.max(0, Math.min(total - 1, Number(lessonIndex) || 0));
  const doneCount = Math.max(0, Math.min(total, Number(completedCount) || 0));
  // La démonstration mène la fiche : le coach suit la leçon que la voiture est
  // en train de jouer. Le pilote peut feuilleter les autres fiches (PRÉCÉDENT /
  // SUIVANT), la prochaine leçon le ramène au direct.
  const [viewIndex, setViewIndex] = useState(liveIndex);
  const [browsing, setBrowsing] = useState(false);
  useEffect(() => {
    setViewIndex(liveIndex);
    setBrowsing(false);
  }, [liveIndex]);
  useEffect(() => {
    if (!tick) return;
    setViewIndex(Math.max(0, Math.min(total - 1, Number(tick.index) || 0)));
    setBrowsing(false);
  }, [tick?.nonce, total]);
  const shownIndex = Math.max(0, Math.min(total - 1, viewIndex));
  const currentStep = CITY_RUSH_TUTORIAL_STEPS[shownIndex];
  const lastDoneStep = doneCount > 0 ? CITY_RUSH_TUTORIAL_STEPS[doneCount - 1] : null;
  const live = !browsing && shownIndex === liveIndex;
  const stepDone = shownIndex < doneCount;
  const stepUpcoming = shownIndex > liveIndex;
  const liveStep = CITY_RUSH_TUTORIAL_STEPS[liveIndex];

  const goToStep = (index) => {
    const next = Math.max(0, Math.min(total - 1, index));
    setViewIndex(next);
    setBrowsing(next !== liveIndex);
  };
  const backToLive = () => {
    setViewIndex(liveIndex);
    setBrowsing(false);
  };
  const stepState = complete
    ? 'GUIDE TERMINÉ · LIGNE D’ARRIVÉE'
    : stepDone
      ? `${currentStep.chapter} · DÉJÀ RÉUSSIE`
      : stepUpcoming
        ? `${currentStep.chapter} · À VENIR`
        : `${currentStep.chapter} · EN DIRECT`;

  return (
    <div
      className={`cr-tutorial-layer${inGame ? ' is-in-game' : ''}`}
      hidden={!visible}
      aria-hidden={!visible}
    >
      <section
        className="cr-tutorial-panel"
        role={inGame ? 'region' : 'dialog'}
        aria-modal={inGame ? undefined : 'true'}
        aria-labelledby="cr-tutorial-title"
        aria-describedby="cr-tutorial-description"
      >
        <header className="cr-tutorial-header">
          <div className="cr-tutorial-brand">
            <span className="cr-tutorial-brand-mark" aria-hidden="true">▶</span>
            <span><b>COACH EN COURSE</b><small>{total} DÉMOS · LA VOITURE ROULE TOUTE SEULE</small></span>
          </div>
          <span className={`cr-tutorial-police-chip${police ? ' is-live' : ''}`}>
            <i aria-hidden="true" />
            {police ? 'POLICE EN PISTE' : 'ROUTE SANS POLICE'}
          </span>
          <button
            type="button"
            className="cr-tutorial-close"
            onClick={onClose}
            aria-label="Masquer le guide, continuer la course"
            title="Masquer le guide (la course continue)"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="cr-tutorial-progress" role="group" aria-label="Progression du tutoriel">
          {CITY_RUSH_TUTORIAL_STEPS.map((step, index) => {
            const finished = index < doneCount;
            const active = index === liveIndex;
            return (
              <button
                key={step.id}
                type="button"
                className={`cr-tutorial-progress-segment${finished ? ' is-done' : ''}${active ? ' is-current' : ''}${active && !complete ? ' is-animating' : ''}`}
                onClick={() => goToStep(index)}
                aria-label={`${finished ? 'Étape réussie' : 'Afficher l’étape'} ${index + 1} : ${step.label}`}
                aria-current={active ? 'step' : undefined}
              >
                <span>{finished ? <b aria-hidden="true">✓</b> : <i />}</span>
              </button>
            );
          })}
        </div>

        <div className="cr-tutorial-tick-row">
          {doneCount > 0 ? (
            <div className="cr-tutorial-tick" key={tick?.nonce || `done-${doneCount}`} role="status" aria-live="polite">
              <span aria-hidden="true">✓</span>
              <b>{tick?.label || lastDoneStep?.success || 'ÉTAPE RÉUSSIE'}</b>
              <i>{doneCount} / {total}</i>
            </div>
          ) : (
            <div className="cr-tutorial-tick is-idle">
              <span aria-hidden="true">▶</span>
              <b>{complete ? 'TOUR GUIDÉ TERMINÉ' : `DÉMONSTRATION ${liveIndex + 1} EN COURS · ${liveStep?.label || ''}`}</b>
              <i>0 / {total}</i>
            </div>
          )}
        </div>

        <main className="cr-tutorial-main" key={currentStep.id}>
          <div className="cr-tutorial-copy" aria-live="polite">
            <div className="cr-tutorial-step-meta">
              <span>{stepState}</span>
              <b>{String(shownIndex + 1).padStart(2, '0')} <i>/</i> {String(total).padStart(2, '0')}</b>
            </div>
            <h2 id="cr-tutorial-title">{currentStep.title}</h2>
            <p id="cr-tutorial-description">{currentStep.description}</p>
            <div className="cr-tutorial-tip"><i aria-hidden="true">↳</i><span>{currentStep.tip}</span></div>
            <TutorialKeys step={currentStep} />
          </div>
          <TutorialArtwork step={currentStep} />
        </main>

        <footer className="cr-tutorial-footer">
          <div className="cr-tutorial-utility-hint" aria-label="Commandes de course">
            <span>← / → <small>VOIES</small></span>
            <span>Z <small>MITRAILLEUSE</small></span>
            <span>X <small>BAZOOKA</small></span>
            <span>P <small>PAUSE</small></span>
            <span>{paused ? 'PAUSE' : 'AUTO'} <small>{paused ? 'COURSE SUSPENDUE' : 'LA VOITURE CONDUIT'}</small></span>
          </div>
          <div className="cr-tutorial-nav">
            <button type="button" className="cr-tutorial-nav-button is-quiet" onClick={() => goToStep(shownIndex - 1)} disabled={shownIndex === 0}>
              <span aria-hidden="true">←</span> PRÉCÉDENT
            </button>
            <button
              type="button"
              className="cr-tutorial-nav-button is-playback"
              onClick={backToLive}
              disabled={live}
              title={live ? 'La fiche suit la démonstration en cours' : 'Revenir à la leçon jouée en ce moment'}
            >
              <span aria-hidden="true">{live ? '◉' : '▶'}</span>
              {live ? 'SUIT LA DÉMO' : 'REVENIR AU DIRECT'}
            </button>
            <button
              type="button"
              className="cr-tutorial-nav-button is-next"
              onClick={() => {
                if (shownIndex === total - 1 && live) onClose();
                else goToStep(shownIndex + 1);
              }}
            >
              {shownIndex === total - 1 && live ? 'MASQUER LE COACH' : 'SUIVANT'}
              <span aria-hidden="true">{shownIndex === total - 1 && live ? '✓' : '→'}</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
