import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SoulsWorld from './SoulsWorld';
import './souls.css';

/**
 * LA CENDRE — page de jeu (M0 : fondations).
 * Écrans : intro (règles + commandes), partie (HUD), pause.
 * Le monde 3D est monté en permanence derrière les overlays, comme sur
 * Mirage Rush ; le pointer lock de la souris est demandé dans les gestes
 * utilisateur (clic) avec repli « glisser pour regarder ».
 */

const EMPTY_HUD = {
  locked: false, moving: false, run: false, x: 0, z: 0,
  hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
  lockOn: false, targetHp: null, targetMaxHp: 130, targetAlive: false, targetName: null,
  action: 'none', hurt: false,
  souls: 0, flask: 3, maxFlask: 3, level: 0, prompt: null, toast: null,
  hasKey: false, zone: 'LE CAMP', drinking: false, drinkProgress: 0,
  dead: false, deathSouls: 0,
};

const KEYS = [
  { keys: ['Z', 'Q', 'S', 'D'], label: 'ou WASD — se déplacer' },
  { keys: ['MAJ'], label: 'courir' },
  { keys: ['SOURIS'], label: 'regarder (clic pour capturer)' },
  { keys: ['CLIC G'], label: 'attaque légère' },
  { keys: ['CLIC D'], label: 'attaque lourde' },
  { keys: ['ESPACE'], label: 'esquive (i-frames)' },
  { keys: ['TAB'], label: 'verrouiller la cible' },
  { keys: ['J', 'K'], label: 'attaques au clavier' },
  { keys: ['F'], label: 'potion de vie (3 gorgées)' },
  { keys: ['E'], label: 'interagir : feu, coffre, portail' },
  { keys: ['U', 'I', 'O'], label: 'niveaux VIT / END / PUI' },
  { keys: ['P'], label: 'pause' },
  { keys: ['ÉCHAP'], label: 'libérer la souris' },
];

export default function SoulsPage() {
  const [phase, setPhase] = useState('intro'); // intro | playing | paused | dead
  const [hud, setHud] = useState(EMPTY_HUD);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [death, setDeath] = useState(null); // { souls, x, z } | null
  const [epoch, setEpoch] = useState(0);
  const actionsRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const launch = useCallback(() => {
    setPhase('playing');
    actionsRef.current?.('launch');
  }, []);

  const pauseGame = useCallback(() => {
    setPhase((current) => (current === 'playing' ? 'paused' : current));
    actionsRef.current?.('pause');
  }, []);

  const resumeGame = useCallback(() => {
    setPhase('playing');
    actionsRef.current?.('launch');
  }, []);

  const restartGame = useCallback(() => {
    setEpoch((n) => n + 1);
    setHud(EMPTY_HUD);
    setDeath(null);
    setPhase('playing');
  }, []);

  // Mort : le monde se fige, l'écran « VOUS ÊTES MORT » prend la main.
  const handleDeath = useCallback((info) => {
    setDeath(info || { souls: 0 });
    setPhase('dead');
  }, []);

  const reviveGame = useCallback(() => {
    setDeath(null);
    setPhase('playing');
    actionsRef.current?.('revive');
  }, []);

  // P : bascule pause/reprise (le monde est monté en permanence).
  const handlePauseKey = useCallback(() => {
    const current = phaseRef.current;
    if (current === 'playing') pauseGame();
    else if (current === 'paused') resumeGame();
  }, [pauseGame, resumeGame]);

  const handleAutoPause = useCallback(() => {
    if (phaseRef.current === 'playing') pauseGame();
  }, [pauseGame]);

  useEffect(() => {
    const onPopState = () => { if (document.pointerLockElement) document.exitPointerLock?.(); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const coordsLabel = `${hud.x.toFixed(1)} / ${hud.z.toFixed(1)}`;

  return (
    <div className="souls-page">
      <header className="souls-heading wrap">
        <div className="souls-heading-copy">
          <div className="souls-eyebrow">
            <span className="souls-live-dot" /> LET’S PLAY ARCADE <span aria-hidden="true">/</span> SOULSLIKE
          </div>
          <Link className="souls-back-link" to="/jeu">← RETOUR AUX JEUX</Link>
        </div>
      </header>

      <div className="souls-layout wrap">
        <section className={`souls-game-shell${phase === 'playing' ? ' is-running' : ''}`} aria-label="Partie de La Cendre">
          <div className="souls-game-topbar">
            <div className="souls-game-brand"><span className="souls-brand-ember">✦</span><span>LE CHEMIN DU ROI · LA CENDRE</span></div>
            <div className="souls-game-controls-top">
              {phase === 'playing' && (
                <>
                  <span className="souls-live-pill"><i /> EN PARTIE</span>
                  <button type="button" className="souls-pause-button" onClick={pauseGame} aria-label="Mettre la partie en pause">❚❚ PAUSE</button>
                </>
              )}
              {phase === 'paused' && (
                <>
                  <span className="souls-live-pill is-paused"><i /> EN PAUSE</span>
                  <button type="button" className="souls-pause-button is-resume" onClick={resumeGame} aria-label="Reprendre la partie">▶ REPRENDRE</button>
                </>
              )}
            </div>
          </div>

          <div className={`souls-viewport${phase === 'playing' ? ' is-live' : ''}${locked ? ' is-locked' : ''}`}>
            <SoulsWorld
              active={phase === 'playing'}
              epoch={epoch}
              onReady={() => setReady(true)}
              onHud={setHud}
              onLockChange={setLocked}
              onPauseKey={handlePauseKey}
              onAutoPause={handleAutoPause}
              onDeath={handleDeath}
              onRevive={reviveGame}
              onError={setError}
              actionsRef={actionsRef}
            />

            {error && (
              <div className="souls-world-error" role="alert">
                <strong>LA FLAMME S’EST ÉTEINTE</strong>
                <span>{error}</span>
                <button type="button" onClick={() => { setError(null); setEpoch((n) => n + 1); }}>RELANCER</button>
              </div>
            )}

            {/* Réticule discret — le lock-on arrivera en M1, on pose le point. */}
            {phase === 'playing' && locked && <div className="souls-dot" aria-hidden="true" />}

            {/* Pastille de status souris — visible tant que la souris n'est pas capturée. */}
            {phase === 'playing' && !locked && !error && (
              <div className="souls-lock-hint" role="status">
                CLIQUE POUR CAPTURER LA SOURIS <span>· ou glisse pour regarder</span>
              </div>
            )}

            {phase === 'playing' && (
              <div className={`souls-hud${hud.hurt ? ' is-hurt' : ''}`}>
                <div className="souls-hud-vitals">
                  <div className="souls-bar souls-bar-hp" title="Vitalité">
                    <i style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
                    <span>{hud.hp}</span>
                  </div>
                  <div className="souls-bar souls-bar-stamina" title="Endurance">
                    <i style={{ width: `${(hud.stamina / hud.maxStamina) * 100}%` }} />
                  </div>
                  <div className="souls-hud-meta">
                    <span className="souls-hud-souls" title="Âmes">
                      <i aria-hidden="true">◈</i>
                      {hud.souls.toLocaleString('fr-FR')}
                      <em>NIV {hud.level}</em>
                    </span>
                    {hud.hasKey && (
                      <span className="souls-key" title="Clé du Roi de Cendre — ouvre le grand portail du château">
                        <i aria-hidden="true">⚿</i> CLÉ DU ROI
                      </span>
                    )}
                    <span
                      className={`souls-flask${hud.drinking ? ' is-drinking' : ''}`}
                      title={`Potion de vie ${hud.flask}/${hud.maxFlask}`}
                    >
                      {Array.from({ length: hud.maxFlask }, (_, i) => (
                        <i key={i} className={i < hud.flask ? 'is-full' : ''} />
                      ))}
                    </span>
                  </div>
                </div>
                {hud.drinking && (
                  <div className="souls-drink" role="status">
                    <span className="souls-drink-label">GOULOT AUX LÈVRES…</span>
                    <i style={{ '--drink': hud.drinkProgress || 0 }} aria-hidden="true" />
                  </div>
                )}
                {hud.prompt && <div className="souls-prompt">{hud.prompt}</div>}
                {hud.toast && <div className="souls-toast" key={hud.toast}>{hud.toast}</div>}
                {hud.targetAlive && (
                  <div className="souls-hud-target">
                    <span className="souls-hud-target-name">{hud.targetName || 'CHEVALIER DÉCHU'}</span>
                    <div className="souls-bar souls-bar-enemy">
                      <i style={{ width: `${(hud.targetHp / hud.targetMaxHp) * 100}%` }} />
                    </div>
                  </div>
                )}
                <div className="souls-hud-coords" title="Zone et position">{hud.zone} · {coordsLabel}</div>
                <ul className="souls-keys-hint">
                  {KEYS.map((entry) => (
                    <li key={entry.label}>
                      <span className="souls-keys-group">
                        {entry.keys.map((k) => <kbd key={k}>{k}</kbd>)}
                      </span>
                      <span className="souls-keys-label">{entry.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase === 'intro' && (
              <div className="souls-overlay souls-overlay-intro">
                <div className="souls-overlay-panel">
                  <div className="souls-overlay-kicker">SOULSLIKE · PLAYTEST M2 — LES CENDRES</div>
                  <h1>LA CENDRE</h1>
                  <p className="souls-overlay-lead">
                    Le feu de cendres s’est éteint. Un chevalier sans nom se réveille
                    dans la Cour du Seuil. Le socle est en place ; M1 livre le{' '}
                    <strong>cœur du jeu</strong> : attaques légère et lourde, esquive à
                    i-frames, endurance, hitstop, lock-on — et un chevalier déchu qui
                    télégraphie chacun de ses coups. <strong>Riposte</strong> pendant sa
                    récupération.
                  </p>
                  <p className="souls-overlay-lead">
                    <strong>Le Chemin du Roi</strong> : quitte le camp par la porte nord.
                    Une <strong>chapelle en ruine</strong> garde un <strong>coffre</strong> (touche E) où dort
                    la <strong>clé du Roi de Cendre</strong>. Reprends la route à travers la
                    <strong> forêt</strong> jusqu’au <strong>château</strong> : seul cette clé ouvre
                    son <strong>grand portail</strong>. Dans la salle des piliers, le Roi attend
                    sur son trône — il se lèvera quand tu approcheras.
                  </p>
                  <p className="souls-overlay-lead">
                    <strong>La boucle des âmes</strong> : tuer rapporte, mourir lâche un{' '}
                    <strong>bloodstain</strong> à récupérer. Ta <strong>potion de vie</strong>{' '}
                    porte <strong>3 gorgées</strong> (touche <kbd>F</kbd>) — le geste est long,
                    tu ne peux ni frapper ni rouler pendant, et un coup encaissé le coupe net.
                    Elle se recharge au <strong>feu de camp</strong>, qui sert aussi à monter
                    de niveau. Tombé à zéro ? L’écran <strong>VOUS ÊTES MORT</strong> s’affiche :
                    un bouton te ramène à la vie, au dernier feu allumé.
                  </p>
                  <ul className="souls-overlay-keys">
                    {KEYS.map((entry) => (
                      <li key={entry.label}>
                        <span className="souls-keys-group">
                          {entry.keys.map((k) => <kbd key={k}>{k}</kbd>)}
                        </span>
                        <span>{entry.label}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="souls-start-button" onClick={launch} disabled={!ready}>
                    {ready ? 'ENTRER DANS LA BRAISE' : 'ALLUMAGE DE LA FLAMME…'}
                  </button>
                  <div className="souls-overlay-hint">RECOMMANDE : ÉCHAP pour libérer la souris, P pour la pause</div>
                  <div className="souls-overlay-hint is-soft">PLAYTEST CLAVIER/SOURIS — LE TACTILE ARRIVE EN M4</div>
                </div>
              </div>
            )}

            {phase === 'dead' && (
              <div className="souls-overlay souls-overlay-death" role="alertdialog" aria-labelledby="souls-death-title">
                <div className="souls-death-blood" aria-hidden="true">
                  <i /><i /><i /><i /><i /><i /><i /><i />
                </div>
                <div className="souls-death-panel">
                  <h2 id="souls-death-title" className="souls-death-title">VOUS ÊTES MORT</h2>
                  <p className="souls-death-lead">
                    La braise s’est éteinte. Vos âmes gisent là où vous êtes tombé —
                    revenez les chercher avant qu’un autre ne les prenne.
                  </p>
                  {death?.souls > 0 && (
                    <p className="souls-death-souls">
                      <i aria-hidden="true">◈</i> {death.souls.toLocaleString('fr-FR')} ÂMES PERDUES
                    </p>
                  )}
                  <button type="button" className="souls-revive-button" onClick={reviveGame} autoFocus>
                    REVENIR À LA VIE
                  </button>
                  <div className="souls-overlay-hint">Vous réapparaîtrez au dernier feu de camp allumé</div>
                </div>
              </div>
            )}

            {phase === 'paused' && (
              <div className="souls-overlay souls-overlay-pause">
                <div className="souls-overlay-panel is-compact">
                  <div className="souls-overlay-kicker">LE CHEMIN DU ROI</div>
                  <h2>PAUSE</h2>
                  <div className="souls-pause-stats">
                    <span>POSITION <b>{coordsLabel}</b></span>
                    <span>SOURIS <b>{locked ? 'CAPTURÉE' : 'LIBRE'}</b></span>
                    <span>STATUT <b>{hud.moving ? (hud.run ? 'COURSE' : 'MARCHE') : 'IMMOBILE'}</b></span>
                    <span>ÂMES <b>{hud.souls.toLocaleString('fr-FR')}</b></span>
                    <span>NIVEAU <b>{hud.level}</b></span>
                  </div>
                  <div className="souls-overlay-actions">
                    <button type="button" className="souls-start-button" onClick={resumeGame}>▶ REPRENDRE</button>
                    <button type="button" className="souls-ghost-button" onClick={restartGame}>↻ RECOMMENCER</button>
                  </div>
                  <div className="souls-overlay-hint">P pour reprendre · ÉCHAP puis clic pour reprendre la souris</div>
                </div>
              </div>
            )}
          </div>

          <footer className="souls-game-foot">
            <span>LES CENDRES — boucle d’âmes, potion de vie, feu de camp · prochain cap : <b>M3, le contenu</b></span>
            <span>BUILD PLAYTEST · <Link to="/jeu">ARCADE LET’S PLAY</Link></span>
          </footer>
        </section>
      </div>
    </div>
  );
}
