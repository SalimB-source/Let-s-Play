import React, { useCallback, useEffect, useRef, useState } from 'react';
import './pixel-runner.css';

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 430;
const PLAYER_X = 150;
const BEST_SCORE_KEY = 'lets-play-pixel-runner-best';
const BACKGROUND_URL = `${import.meta.env.BASE_URL}pixel-runner-bg.jpg`;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeInitialState() {
  return {
    running: false,
    gameOver: false,
    score: 0,
    distance: 0,
    coins: 0,
    speed: 360,
    player: { y: GROUND - 62, vy: 0, grounded: true, shield: 0 },
    obstacles: [],
    pickups: [],
    spawnTimer: 0.8,
    pickupTimer: 1.4,
    elapsed: 0,
  };
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawText(ctx, text, x, y, size, color, align = 'left') {
  ctx.font = `700 ${size}px "Google Sans", Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

export default function PixelRunner() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const gameRef = useRef(makeInitialState());
  const backgroundRef = useRef(null);
  const statusRef = useRef('ready');
  const [status, setStatus] = useState('ready');
  const [best, setBest] = useState(() => Number(window.localStorage.getItem(BEST_SCORE_KEY) || 0));
  const [hud, setHud] = useState({ score: 0, distance: 0, coins: 0, shield: 0 });

  const syncHud = useCallback(() => {
    const game = gameRef.current;
    setHud({
      score: Math.floor(game.score),
      distance: Math.floor(game.distance),
      coins: game.coins,
      shield: game.player.shield,
    });
  }, []);

  const jump = useCallback(() => {
    const game = gameRef.current;
    if (!game.running) return;
    if (game.player.grounded) {
      game.player.vy = -700;
      game.player.grounded = false;
    } else if (game.player.vy > 80) {
      game.player.vy = -530;
    }
  }, []);

  const updateStatus = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const resetGame = useCallback(() => {
    gameRef.current = makeInitialState();
    gameRef.current.running = true;
    updateStatus('running');
    syncHud();
  }, [syncHud, updateStatus]);

  const startGame = useCallback(() => {
    resetGame();
    canvasRef.current?.focus();
  }, [resetGame]);

  useEffect(() => {
    const image = new Image();
    image.src = BACKGROUND_URL;
    backgroundRef.current = image;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    let last = performance.now();

    const spawnObstacle = (game) => {
      const tall = Math.random() > 0.45;
      game.obstacles.push({
        x: WIDTH + 40,
        y: GROUND - (tall ? 76 : 46),
        width: tall ? 42 : 66,
        height: tall ? 76 : 46,
        color: tall ? '#a855f7' : '#22d3ee',
      });
      game.spawnTimer = Math.max(0.62, 1.15 - game.elapsed * 0.008) + Math.random() * 0.52;
    };

    const spawnPickup = (game) => {
      const shield = Math.random() > 0.78;
      game.pickups.push({
        x: WIDTH + 30,
        y: shield ? GROUND - 170 : GROUND - 120 - Math.random() * 100,
        type: shield ? 'shield' : 'coin',
        spin: 0,
      });
      game.pickupTimer = 1.5 + Math.random() * 2.2;
    };

    const overlaps = (a, b) => (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );

    const draw = () => {
      const game = gameRef.current;
      const player = game.player;
      const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, '#090b22');
      gradient.addColorStop(0.6, '#141342');
      gradient.addColorStop(1, '#05060f');
      context.fillStyle = gradient;
      context.fillRect(0, 0, WIDTH, HEIGHT);

      if (backgroundRef.current?.complete && backgroundRef.current.naturalWidth) {
        context.globalAlpha = 0.48;
        context.drawImage(backgroundRef.current, 0, 0, WIDTH, HEIGHT);
        context.globalAlpha = 1;
      }

      const drift = (game.distance * 1.4) % WIDTH;
      context.fillStyle = 'rgba(34, 211, 238, .22)';
      for (let i = -1; i < 11; i += 1) {
        const x = i * 110 - drift * 0.16;
        const height = 24 + (i * 37 % 80 + 80) % 80;
        context.fillRect(x, GROUND - 12 - height, 56, height);
      }

      context.fillStyle = '#080a19';
      context.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
      context.strokeStyle = '#22d3ee';
      context.globalAlpha = 0.55;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, GROUND);
      context.lineTo(WIDTH, GROUND);
      context.stroke();
      context.globalAlpha = 1;
      for (let i = -1; i < 14; i += 1) {
        const x = i * 100 - (game.distance * 2.1 % 100);
        context.fillStyle = i % 2 ? '#ffd619' : '#a855f7';
        context.globalAlpha = 0.55;
        context.fillRect(x, GROUND + 52, 48, 3);
      }
      context.globalAlpha = 1;

      game.obstacles.forEach((obstacle) => {
        context.shadowBlur = 18;
        context.shadowColor = obstacle.color;
        context.fillStyle = obstacle.color;
        roundedRect(context, obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = 'rgba(5, 6, 15, .72)';
        context.fillRect(obstacle.x + 9, obstacle.y + 10, obstacle.width - 18, 4);
        context.fillRect(obstacle.x + 9, obstacle.y + 23, obstacle.width - 18, 4);
      });

      game.pickups.forEach((pickup) => {
        pickup.spin += 0.08;
        context.save();
        context.translate(pickup.x, pickup.y);
        context.rotate(Math.sin(pickup.spin) * 0.2);
        context.shadowBlur = 18;
        context.shadowColor = pickup.type === 'shield' ? '#22d3ee' : '#ffd619';
        context.strokeStyle = pickup.type === 'shield' ? '#22d3ee' : '#ffd619';
        context.lineWidth = 5;
        if (pickup.type === 'shield') {
          context.beginPath();
          context.arc(0, 0, 18, 0, Math.PI * 2);
          context.stroke();
          context.fillStyle = 'rgba(34, 211, 238, .22)';
          context.fill();
        } else {
          context.beginPath();
          context.moveTo(0, -18); context.lineTo(14, 0); context.lineTo(0, 18); context.lineTo(-14, 0); context.closePath();
          context.fillStyle = '#ffd619';
          context.fill();
          context.stroke();
        }
        context.restore();
      });

      const playerBox = { x: PLAYER_X, y: player.y, width: 46, height: 62 };
      if (player.shield > 0) {
        context.strokeStyle = '#22d3ee';
        context.lineWidth = 3;
        context.globalAlpha = 0.72;
        context.beginPath();
        context.arc(PLAYER_X + 23, player.y + 31, 43 + Math.sin(game.elapsed * 8) * 2, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      }
      context.shadowBlur = 20;
      context.shadowColor = '#ffd619';
      context.fillStyle = '#ffd619';
      roundedRect(context, playerBox.x, playerBox.y, playerBox.width, playerBox.height, 10);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#0a0b1a';
      context.fillRect(PLAYER_X + 9, player.y + 13, 28, 8);
      context.fillStyle = '#22d3ee';
      context.fillRect(PLAYER_X + 12, player.y + 16, 7, 3);
      context.fillRect(PLAYER_X + 27, player.y + 16, 7, 3);
      context.fillStyle = '#7c3aed';
      context.fillRect(PLAYER_X + 8, player.y + 44, 30, 7);

      context.fillStyle = 'rgba(238,240,255,.64)';
      context.font = '500 13px "Google Sans", Arial, sans-serif';
      context.textAlign = 'left';
      context.fillText('SPACE / TAP TO JUMP', 28, HEIGHT - 22);
    };

    const tick = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const game = gameRef.current;
      if (game.running) {
        game.elapsed += dt;
        game.speed = Math.min(680, 360 + game.elapsed * 9);
        game.distance += game.speed * dt * 0.1;
        game.score += game.speed * dt * 0.12;
        game.spawnTimer -= dt;
        game.pickupTimer -= dt;
        if (game.spawnTimer <= 0) spawnObstacle(game);
        if (game.pickupTimer <= 0) spawnPickup(game);
        game.player.vy += 1750 * dt;
        game.player.y += game.player.vy * dt;
        if (game.player.y >= GROUND - 62) {
          game.player.y = GROUND - 62;
          game.player.vy = 0;
          game.player.grounded = true;
        }
        game.obstacles.forEach((obstacle) => { obstacle.x -= game.speed * dt; });
        game.pickups.forEach((pickup) => { pickup.x -= game.speed * dt; });
        game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -60);
        game.pickups = game.pickups.filter((pickup) => pickup.x > -40);
        const playerBox = { x: PLAYER_X, y: game.player.y, width: 46, height: 62 };
        for (const obstacle of game.obstacles) {
          if (overlaps(playerBox, obstacle)) {
            if (game.player.shield > 0) {
              game.player.shield = 0;
              obstacle.x = -100;
            } else {
              game.running = false;
              game.gameOver = true;
              updateStatus('gameover');
              const finalScore = Math.floor(game.score);
              setBest((current) => {
                const next = Math.max(current, finalScore);
                window.localStorage.setItem(BEST_SCORE_KEY, String(next));
                return next;
              });
            }
            break;
          }
        }
        game.pickups = game.pickups.filter((pickup) => {
          const hit = Math.hypot(pickup.x - (PLAYER_X + 23), pickup.y - (game.player.y + 31)) < 40;
          if (!hit) return true;
          if (pickup.type === 'shield') game.player.shield = 1;
          else { game.coins += 1; game.score += 80; }
          return false;
        });
        syncHud();
      }
      draw();
      frameRef.current = requestAnimationFrame(tick);
    };

    const onKeyDown = (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        if (statusRef.current === 'ready' || statusRef.current === 'gameover') startGame();
        else jump();
      }
    };
    const onPointerDown = () => {
      if (statusRef.current === 'ready' || statusRef.current === 'gameover') startGame();
      else jump();
    };
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointerdown', onPointerDown);
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [jump, startGame, syncHud, updateStatus]);

  return (
    <main className="pixel-runner-page">
      <section className="pixel-runner-shell wrap">
        <div className="section-label"><span>GAME / ARCADE</span><span>LET’S PLAY ORIGINAL</span></div>
        <div className="pixel-runner-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> ENDLESS RUNNER</p>
            <h1>PIXEL <em>RUNNER.</em></h1>
            <p className="pixel-runner-intro">Cours, saute et bats ton record dans la ville néon de Let’s Play.</p>
          </div>
          <div className="pixel-runner-best"><span>BEST RUN</span><strong>{best.toLocaleString('fr-FR')}</strong></div>
        </div>
        <div className="pixel-runner-hud" aria-live="polite">
          <span><b>{hud.score.toLocaleString('fr-FR')}</b> SCORE</span>
          <span><b>{hud.distance.toLocaleString('fr-FR')} m</b> DISTANCE</span>
          <span><b>{hud.coins}</b> COINS</span>
          {hud.shield > 0 && <span className="is-shield"><b>ON</b> SHIELD</span>}
        </div>
        <div className="pixel-runner-stage">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex="0" aria-label="Pixel Runner, appuie pour sauter" />
          {status !== 'running' && (
            <div className="pixel-runner-overlay">
              <p className="eyebrow"><span className="live-dot" /> {status === 'gameover' ? 'RUN TERMINÉ' : 'PRÊT À JOUER'}</p>
              <h2>{status === 'gameover' ? 'ENCORE UN RUN ?' : 'ÉVITE. RÉCUPÈRE. SURVIS.'}</h2>
              <p>{status === 'gameover' ? `Score : ${hud.score.toLocaleString('fr-FR')} — meilleur score : ${best.toLocaleString('fr-FR')}.` : 'Appuie sur jouer, puis tape ou appuie sur espace pour sauter.'}</p>
              <button className="button button-yellow" type="button" onClick={startGame}>{status === 'gameover' ? 'REJOUER ↗' : 'JOUER ↗'}</button>
            </div>
          )}
        </div>
        <div className="pixel-runner-controls"><span>SPACE / ↑</span><span>SAUTER</span><span>TOUCHER L’ÉCRAN</span><span>MOBILE</span></div>
      </section>
    </main>
  );
}
