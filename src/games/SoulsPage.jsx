import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SoulsWorld from './SoulsWorld';
import SoulsTouchControls from './SoulsTouchControls';
import FullscreenIcon from './FullscreenIcon';
import { nativeFullscreenElement } from './gameFullscreen';
import useGameFullscreen from './useGameFullscreen';
import useGameLandscape from './useGameLandscape';
import './souls.css';

/**
 * LA CENDRE — page de jeu (M0 : fondations).
 * Écrans : intro (règles + commandes), partie (HUD), pause.
 * Le monde 3D est monté en permanence derrière les overlays, comme sur
 * Mirage Rush ; le pointer lock de la souris est demandé dans les gestes
 * utilisateur (clic) avec repli « glisser pour regarder ».
 *
 * Téléphone et application : le jeu **se lance en paysage** — la manette
 * (stick à gauche, boutons à droite) ne tient pas dans une main verticale.
 * `useGameLandscape` demande l'écran couché (verrou navigateur, pont Android)
 * et prévient le joueur quand l'appareil ne peut pas obéir (iPhone, Firefox) ;
 * `useGameFullscreen` ouvre le plein écran de base, dont Chrome Android a
 * besoin pour honorer le verrou d'orientation.
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

/** La même légende, pour les doigts — affichée sur écran tactile. */
const TOUCH_HINTS = [
  { keys: ['STICK'], label: 'se déplacer — à fond, courir' },
  { keys: ['GLISSE'], label: 'regarder autour' },
  { keys: ['⚔', '⚒'], label: 'attaque légère / lourde' },
  { keys: ['⟳'], label: 'esquive (i-frames)' },
  { keys: ['◎'], label: 'verrouiller la cible' },
  { keys: ['⚗'], label: 'potion de vie (3 gorgées)' },
  { keys: ['✦'], label: 'interagir : feu, coffre, portail' },
  { keys: ['❚❚'], label: 'pause — les niveaux s’y montent' },
];

/** Statistiques de la pause tactile (mêmes commandes que U / I / O). */
const LEVEL_STATS = [
  { stat: 'vit', label: 'VIT', title: 'Vitalité — plus de PV' },
  { stat: 'end', label: 'END', title: 'Endurance — plus de souffle' },
  { stat: 'str', label: 'PUI', title: 'Puissance — plus de dégâts' },
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
  const shellRef = useRef(null);
  // La sortie « native » du plein écran (Échap, geste retour) est branchée sur
  // la pause plus bas, une fois `pauseGame` défini : d'où la référence.
  const nativeExitRef = useRef(null);

  const {
    active: immersive,
    enter: enterImmersive,
    toggle: toggleImmersive,
  } = useGameFullscreen(shellRef, { onNativeExit: () => nativeExitRef.current?.() });

  // Paysage : téléphone / application. `isTouch` commande la manette à
  // l'écran, `showRotationPrompt` l'écran « tournez votre appareil ».
  const {
    isTouch,
    landscapeDevice,
    showRotationPrompt,
    request: requestLandscape,
    dismissRotation,
  } = useGameLandscape();

  const launch = useCallback(() => {
    // Dans le geste : l'écran se couche (le plein écran natif est demandé au
    // premier geste, voir l'effet plus bas) puis la partie démarre.
    requestLandscape();
    setPhase('playing');
    actionsRef.current?.('launch');
  }, [requestLandscape]);

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
  nativeExitRef.current = handleAutoPause;

  // ── Manette tactile : la page transmet les gestes au monde ─────────
  const handleTouchMove = useCallback((vector) => {
    actionsRef.current?.('touchMove', vector);
  }, []);
  const handleTouchAction = useCallback((action) => {
    actionsRef.current?.('touchAction', action);
  }, []);
  const levelUp = useCallback((stat) => {
    actionsRef.current?.('level', stat);
  }, []);

  useEffect(() => {
    const onPopState = () => { if (document.pointerLockElement) document.exitPointerLock?.(); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Plein écran & paysage ──────────────────────────────────────────
  // Téléphone et application : le jeu s'ouvre plein écran (couche fixe, posée
  // sans geste) et l'écran demande à se coucher. Sur ordinateur, la page garde
  // son cadre : le bouton de la barre ouvre le plein écran si on le veut.
  useEffect(() => {
    if (!landscapeDevice) return;
    enterImmersive({ pinned: true, native: false });
  }, [landscapeDevice, enterImmersive]);

  // Le navigateur n'ouvre le vrai plein écran que dans un geste. Le premier
  // clic ou la première touche le demande — et c'est aussi le geste qui peut
  // verrouiller l'orientation en paysage (Chrome Android l'exige).
  useEffect(() => {
    if (!immersive) return undefined;
    const upgrade = (event) => {
      requestLandscape();
      if (nativeFullscreenElement()) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      enterImmersive({ pinned: true });
    };
    window.addEventListener('pointerdown', upgrade, true);
    window.addEventListener('keydown', upgrade, true);
    return () => {
      window.removeEventListener('pointerdown', upgrade, true);
      window.removeEventListener('keydown', upgrade, true);
    };
  }, [immersive, enterImmersive, requestLandscape]);

  // « Tournez votre appareil » : l'écran bloque la vue, la partie passe en
  // pause plutôt que d'être jouée à l'aveugle.
  useEffect(() => {
    if (showRotationPrompt && phaseRef.current === 'playing') pauseGame();
  }, [showRotationPrompt, pauseGame]);

  const coordsLabel = `${hud.x.toFixed(1)} / ${hud.z.toFixed(1)}`;
  const keys = isTouch ? TOUCH_HINTS : KEYS;

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
        <section
          ref={shellRef}
          className={`souls-game-shell${phase === 'playing' ? ' is-running' : ''}${immersive ? ' is-immersive' : ''}`}
          aria-label="Partie de La Cendre"
        >
          <div className="souls-game-topbar">
            <div className="souls-game-brand"><span className="souls-brand-ember">✦</span><span>LE GARDIEN CHITINE · LA CENDRE</span></div>
            <div className="souls-game-controls-top">
              <button
                type="button"
                className={`souls-fullscreen-button${immersive ? ' is-on' : ''}`}
                onClick={toggleImmersive}
                aria-pressed={immersive}
                aria-label={immersive ? 'Quitter le plein écran' : 'Passer en plein écran'}
                title={immersive ? 'Quitter le plein écran' : 'Plein écran'}
              >
                <FullscreenIcon exit={immersive} />
                <span className="souls-fullscreen-label">PLEIN ÉCRAN</span>
              </button>
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

          <div className={`souls-viewport${phase === 'playing' ? ' is-live' : ''}${locked ? ' is-locked' : ''}${isTouch ? ' is-touch' : ''}`}>
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
            {phase === 'playing' && !locked && !error && !isTouch && (
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
                {!isTouch && (
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
                )}
              </div>
            )}

            {/* La manette : stick à gauche, boutons à droite. */}
            {isTouch && phase === 'playing' && !error && (
              <SoulsTouchControls onMove={handleTouchMove} onAction={handleTouchAction} />
            )}

            {/* Le paysage est demandé à l'ouverture ; quand l'appareil ne peut
                pas obéir (iPhone, Firefox Android), on le dit et on propose de
                continuer quand même. */}
            {showRotationPrompt && (
              <div className="souls-rotate" role="alertdialog" aria-labelledby="souls-rotate-title">
                <div className="souls-rotate-phone" aria-hidden="true"><i /></div>
                <strong id="souls-rotate-title">TOURNEZ VOTRE APPAREIL</strong>
                <span>
                  La Cendre se joue en paysage, comme une manette : le stick
                  tombe sous le pouce gauche, les boutons sous le droit.
                </span>
                <button type="button" className="souls-ghost-button" onClick={dismissRotation}>
                  JOUER QUAND MÊME
                </button>
              </div>
            )}

            {phase === 'intro' && (
              <div className="souls-overlay souls-overlay-intro">
                <div className="souls-overlay-panel">
                  <div className="souls-overlay-kicker">SOULSLIKE · ANIME DARK FANTASY</div>
                  <h1>LA CENDRE</h1>
                  <p className="souls-overlay-lead">
                    Le feu de cendres s’est éteint. Le <strong>Gardien Chitine</strong>,
                    guerrier insecte aux ailes irisées, se réveille dans la Cour du Seuil.
                    Traverse un monde <strong>anime peint à la main</strong> : attaques légère
                    et lourde, esquive à i-frames, endurance, hitstop, lock-on — et un
                    chevalier déchu qui télégraphie chacun de ses coups. <strong>Riposte</strong>
                    pendant sa récupération.
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
                    porte <strong>3 gorgées</strong> — le geste est long,
                    tu ne peux ni frapper ni rouler pendant, et un coup encaissé le coupe net.
                    Elle se recharge au <strong>feu de camp</strong>, qui sert aussi à monter
                    de niveau. Tombé à zéro ? L’écran <strong>VOUS ÊTES MORT</strong> s’affiche :
                    un bouton te ramène à la vie, au dernier feu allumé.
                  </p>
                  <ul className="souls-overlay-keys">
                    {keys.map((entry) => (
                      <li key={entry.label}>
                        <span className="souls-keys-group">
                          {entry.keys.map((k) => <kbd key={k}>{k}</kbd>)}
                        </span>
                        <span>{entry.label}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="souls-start-button" onClick={launch} disabled={!ready}>
                    {ready ? 'ÉVEILLER LE GARDIEN' : 'LUMIÈRE DES AILES…'}
                  </button>
                  <div className="souls-overlay-hint">
                    {isTouch ? 'RECOMMANDÉ : JOUE EN PAYSAGE, LA MANETTE EST À L’ÉCRAN' : 'RECOMMANDÉ : ÉCHAP pour libérer la souris, P pour la pause'}
                  </div>
                  <div className="souls-overlay-hint is-soft">
                    {isTouch
                      ? 'STICK À GAUCHE · BOUTONS À DROITE · GLISSE L’ÉCRAN POUR REGARDER'
                      : 'CLAVIER/SOURIS ICI · MANETTE TACTILE SUR TÉLÉPHONE'}
                  </div>
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
                  <div className="souls-overlay-kicker">LE CHEMIN DU GARDIEN</div>
                  <h2>PAUSE</h2>
                  <div className="souls-pause-stats">
                    <span>POSITION <b>{coordsLabel}</b></span>
                    <span>CONTRÔLES <b>{isTouch ? 'MANETTE' : (locked ? 'SOURIS CAPTURÉE' : 'SOURIS LIBRE')}</b></span>
                    <span>STATUT <b>{hud.moving ? (hud.run ? 'COURSE' : 'MARCHE') : 'IMMOBILE'}</b></span>
                    <span>ÂMES <b>{hud.souls.toLocaleString('fr-FR')}</b></span>
                    <span>NIVEAU <b>{hud.level}</b></span>
                  </div>
                  {isTouch && (
                    <div className="souls-level-up">
                      <span className="souls-level-up-label">MONTER DE NIVEAU — AU FEU DE CAMP</span>
                      <div className="souls-level-up-row">
                        {LEVEL_STATS.map((entry) => (
                          <button
                            key={entry.stat}
                            type="button"
                            className="souls-ghost-button"
                            title={entry.title}
                            onClick={() => levelUp(entry.stat)}
                          >
                            {entry.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="souls-overlay-actions">
                    <button type="button" className="souls-start-button" onClick={resumeGame}>▶ REPRENDRE</button>
                    <button type="button" className="souls-ghost-button" onClick={restartGame}>↻ RECOMMENCER</button>
                  </div>
                  <div className="souls-overlay-hint">
                    {isTouch
                      ? '❚❚ pour reprendre · les niveaux se montent au feu de camp'
                      : 'P pour reprendre · ÉCHAP puis clic pour reprendre la souris'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="souls-game-foot">
            <span>LES CENDRES — gardien insecte, monde anime peint, boucle d’âmes et feu de camp</span>
            <span>BUILD PLAYTEST · <Link to="/jeu">ARCADE LET’S PLAY</Link></span>
          </footer>
        </section>
      </div>
    </div>
  );
}
