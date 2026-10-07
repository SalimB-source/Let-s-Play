import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROOMS, SIM_DT, TUNE, createState, heldInput, measureFeel, step } from './arcadeFeel';
import { VIEW_H, VIEW_W, createPainter } from './arcadeFeelArt';
import useGameFullscreen from './useGameFullscreen';
import './arcade-feel.css';

/**
 * Prototype « feel » de **L'Arcade Éternelle** — la salle « Le Puits Sec ».
 *
 * Cette page ne sert qu'à une chose : juger la prise en main (course, saut,
 * saut mural, attaque, esquive, dash) dans une salle vide d'histoire. Elle
 * contient trois choses et rien de plus :
 *
 *   - **la boucle de jeu** : un pas de simulation fixe de 1/60 s, découplé du
 *     rendu (un appareil lent perd des images, jamais de la physique) ;
 *   - **les entrées** : clavier (flèches ou ZQSD, Espace/Z, X/J, C/K, Maj,
 *     V/L), manette au clavier, et boutons tactiles ;
 *   - **la mesure** : le panneau du bas affiche les chiffres réellement
 *     mesurés par `measureFeel()` — les mêmes que vérifie `node --test`.
 *
 * Tout le reste est dans `arcadeFeel.js` (simulation pure) et
 * `arcadeFeelArt.js` (rendu), pour que la physique soit testable sans
 * navigateur.
 */

const ROOM_ID = 'feel-01';

/** Touches → actions. Pensé pour QWERTY **et** AZERTY (codes physiques). */
const KEY_TO_ACTION = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  KeyZ: 'jump',
  KeyX: 'attack',
  KeyJ: 'attack',
  KeyC: 'dash',
  KeyK: 'dash',
  KeyV: 'dodge',
  KeyL: 'dodge',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
};

const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'dodge', 'sprint'];

export default function ArcadeFeelPrototype() {
  const room = ROOMS[ROOM_ID];
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const painterRef = useRef(null);
  const inputRef = useRef({ held: {}, pressed: {} });
  const debugRef = useRef(false);
  const fpsRef = useRef(60);
  const stepsRef = useRef(0);
  const [debug, setDebug] = useState(false);
  const [tuning] = useState(() => measureFeel());

  const { active: immersive, toggle: toggleFullscreen } = useGameFullscreen(shellRef, {});

  // --- mise à l'échelle entière (×2, ×3…) ---------------------------------
  // La charte demande une échelle entière : à 640×360 interne, on agrandit par
  // pas de 1, jamais de 1,37. Une image à l'échelle entière garde son encre
  // nette ; le reste de la boîte est laissé noir (letterbox).
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return undefined;
    const fit = () => {
      const box = stage.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const scale = Math.max(1, Math.floor(Math.min(box.width / VIEW_W, box.height / VIEW_H)));
      canvas.style.width = `${VIEW_W * scale}px`;
      canvas.style.height = `${VIEW_H * scale}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [immersive]);

  /** Range l'état de jeu à zéro (bouton « recommencer », touche R). */
  const reset = useCallback(() => {
    stateRef.current = createState(ROOM_ID);
    inputRef.current.held = {};
    inputRef.current.pressed = {};
  }, []);

  const setAction = useCallback((action, down) => {
    const input = inputRef.current;
    if (down) {
      if (!input.held[action]) input.pressed[action] = true;
      input.held[action] = true;
    } else {
      input.held[action] = false;
    }
  }, []);

  // --- clavier ------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'F3') {
        event.preventDefault();
        debugRef.current = !debugRef.current;
        setDebug(debugRef.current);
        return;
      }
      if (event.code === 'KeyR') {
        reset();
        return;
      }
      const action = KEY_TO_ACTION[event.code];
      if (!action) return;
      event.preventDefault();
      if (!event.repeat) setAction(action, true);
    };
    const onKeyUp = (event) => {
      const action = KEY_TO_ACTION[event.code];
      if (!action) return;
      event.preventDefault();
      setAction(action, false);
    };
    // si la fenêtre perd le focus, on relâche tout : le héros ne part pas tout seul
    const onBlur = () => {
      inputRef.current.held = {};
      inputRef.current.pressed = {};
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [reset, setAction]);

  // --- boucle de jeu ------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    stateRef.current = createState(ROOM_ID);
    painterRef.current = createPainter(room);

    let raf = 0;
    let last = 0;
    let accumulator = 0;
    let fps = 60;

    const simulate = () => {
      const state = stateRef.current;
      const input = inputRef.current;
      if (!state) return;
      const patch = {
        left: !!input.held.left,
        right: !!input.held.right,
        up: !!input.held.up,
        down: !!input.held.down,
        jump: !!input.held.jump,
        attack: !!input.held.attack,
        dash: !!input.held.dash,
        sprint: !!input.held.sprint,
        jumpPressed: !!input.pressed.jump,
        attackPressed: !!input.pressed.attack,
        dashPressed: !!input.pressed.dash,
        dodgePressed: !!input.pressed.dodge,
      };
      step(state, heldInput(patch));
      // les fronts ne valent que pour une image de simulation
      input.pressed = {};
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!last) last = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      accumulator += dt;
      // au plus 5 pas de simulation par image affichée : après une pause (onglet
      // en arrière-plan), on ne rattrape pas le temps perdu d'un coup
      let steps = 0;
      while (accumulator >= SIM_DT && steps < 5) {
        simulate();
        accumulator -= SIM_DT;
        steps += 1;
      }
      if (steps === 5) accumulator = 0;
      stepsRef.current = steps;
      fps = fps * 0.9 + (dt > 0 ? 1 / dt : 60) * 0.1;
      fpsRef.current = fps;
      const painter = painterRef.current;
      if (painter && stateRef.current) {
        painter.paint(ctx, stateRef.current, { dt, debug: debugRef.current, fps });
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [room]);

  // --- boutons tactiles ---------------------------------------------------
  const touchHandlers = (action) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setAction(action, true);
    },
    onPointerUp: () => setAction(action, false),
    onPointerCancel: () => setAction(action, false),
    onPointerLeave: () => setAction(action, false),
    onContextMenu: (event) => event.preventDefault(),
  });

  const help = useMemo(
    () => [
      ['← →  (ou A / D)', 'courir — Maj pour sprinter'],
      ['Espace (ou Z / ↑)', 'sauter — saut variable, appui court = saut court'],
      ['mur + Espace', 'saut mural ; le rebord tolère 0,1 s de retard (coyote)'],
      ['X (ou J)', 'attaquer — 3 coups en enchaînant, ↑ attaque en l’air, ↓ plonge'],
      ['C (ou K)', 'dash aérien'],
      ['V (ou L)', 'esquive roulade (invincibilité courte)'],
      ['↓ + Espace', 'traverser une plateforme fine'],
      ['F3 · R', 'boîtes de collision et mesures · recommencer'],
    ],
    [],
  );

  const whatToJudge = [
    ['Course', 'la vitesse et l’arrêt : le héros doit s’arrêter net, sans glisser'],
    ['Saut', `tenu ${tuning.jumpHeld.toFixed(1)} tuiles, tap ${tuning.jumpTap.toFixed(1)} — le tap doit franchir le caisson`],
    ['Coyote / mémoire', 'sauter juste après le rebord ou juste avant d’atterrir doit marcher'],
    ['Attaque', 'ZAN! à chaque coup, DOON! au 3e (lourd), recul des ennemis'],
    ['Golem de grès', 'les coups latéraux ricochent (TIK!) — passe par le plongeant ou le 3e coup'],
    ['Sable', 'on s’enfonce, le pas ralentit, puis un cœur part et le héros est recraché'],
    ['Dash', 'FWOOSH : il traverse les gouffres, la gravité ne revient qu’après'],
  ];

  return (
    <section
      className={`arcade-feel${immersive ? ' is-immersive' : ''}`}
      ref={shellRef}
      aria-label="Prototype du feel — L'Arcade Éternelle"
    >
      <header className="arcade-feel-head">
        <p className="arcade-feel-badge">PROTOTYPE · LE FEEL</p>
        <h1>
          L’ARCADE ÉTERNELLE <span>— {room.name}</span>
        </h1>
        <p>
          Une salle, un héros, aucune histoire : on juge ici la prise en main — course, saut, saut
          mural, attaque, esquive, dash. Le décor et le HUD suivent la charte artistique des
          maquettes. Zone de jeu : clique dedans d’abord, le clavier y répond.
        </p>
      </header>

      <div className="arcade-feel-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="arcade-feel-canvas"
          width={VIEW_W}
          height={VIEW_H}
          tabIndex={0}
          aria-label="Aire de jeu"
        />
        <div className="arcade-feel-touch" aria-hidden="true">
          <div className="arcade-feel-pad">
            <button type="button" {...touchHandlers('left')} className="arcade-feel-key">
              ◀
            </button>
            <button type="button" {...touchHandlers('up')} className="arcade-feel-key">
              ▲
            </button>
            <button type="button" {...touchHandlers('right')} className="arcade-feel-key">
              ▶
            </button>
            <button type="button" {...touchHandlers('down')} className="arcade-feel-key">
              ▼
            </button>
          </div>
          <div className="arcade-feel-actions">
            <button type="button" {...touchHandlers('attack')} className="arcade-feel-key is-round">
              ATK
            </button>
            <button type="button" {...touchHandlers('jump')} className="arcade-feel-key is-round">
              SAUT
            </button>
            <button type="button" {...touchHandlers('dash')} className="arcade-feel-key is-round">
              DASH
            </button>
            <button type="button" {...touchHandlers('dodge')} className="arcade-feel-key is-round">
              ESQ
            </button>
          </div>
        </div>
      </div>

      <div className="arcade-feel-bar">
        <button type="button" className="arcade-feel-btn" onClick={() => toggleFullscreen()}>
          {immersive ? 'Quitter le plein écran' : 'Plein écran'}
        </button>
        <button
          type="button"
          className="arcade-feel-btn"
          onClick={() => {
            debugRef.current = !debugRef.current;
            setDebug(debugRef.current);
          }}
        >
          {debug ? 'Masquer les mesures (F3)' : 'Boîtes de collision (F3)'}
        </button>
        <button type="button" className="arcade-feel-btn" onClick={reset}>
          Recommencer (R)
        </button>
      </div>

      <div className="arcade-feel-cols">
        <div className="arcade-feel-panel">
          <h2>Commandes</h2>
          <ul className="arcade-feel-help">
            {help.map(([keys, what]) => (
              <li key={keys}>
                <b>{keys}</b>
                <span>{what}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="arcade-feel-panel">
          <h2>Réglage mesuré</h2>
          <p className="arcade-feel-note">
            Ces chiffres sont relevés par la simulation elle-même (`measureFeel`), pas écrits à la
            main : ce sont les mêmes que vérifie <code>npm run test:arcade</code>.
          </p>
          <ul className="arcade-feel-tune">
            <li>
              <b>{tuning.jumpHeld.toFixed(2)} tuiles</b>
              <span>hauteur de saut tenue</span>
            </li>
            <li>
              <b>{tuning.jumpTap.toFixed(2)} tuiles</b>
              <span>saut relâché tout de suite ({Math.round(tuning.jumpTapRatio * 100)} %)</span>
            </li>
            <li>
              <b>{tuning.run1s.toFixed(2)} tuiles</b>
              <span>en 1 s à la course ({TUNE.runSpeed} tuiles/s)</span>
            </li>
            <li>
              <b>{tuning.sprint1s.toFixed(2)} tuiles</b>
              <span>en 1 s en sprint ({TUNE.sprintSpeed} tuiles/s)</span>
            </li>
            <li>
              <b>{tuning.airTime.toFixed(2)} s</b>
              <span>temps de vol d’un saut tenu</span>
            </li>
            <li>
              <b>
                {TUNE.coyote.toFixed(2)} s / {TUNE.jumpBuffer.toFixed(2)} s
              </b>
              <span>coyote / mémoire de saut</span>
            </li>
          </ul>
        </div>
        <div className="arcade-feel-panel">
          <h2>Ce qu’il faut juger</h2>
          <ul className="arcade-feel-judge">
            {whatToJudge.map(([title, text]) => (
              <li key={title}>
                <b>{title}</b>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
