/**
 * Confettis du sans-faute : une pluie de fragments colorés sur l'écran de
 * résultat. DOM + CSS uniquement (pas de canvas, pas de fichier) : même
 * rendu sur mobile, et un composant inerte — mais sans exception — dans un
 * environnement sans styles (SSR, jsdom). La pluie dure moins de trois
 * secondes, puis le composant se vide de lui-même : les fragments ne
 * survivent pas au « Rejouer ».
 */
import React, { useEffect, useState } from 'react';

const COLORS = ['#ffd619', '#22d3ee', '#a855f7', '#34d399', '#f87171', '#fb923c'];
const COUNT = 80;
const LIFETIME_MS = 3000;

/** Une poignée de fragments : position, retard, durée et trajectoire aléatoires. */
function makePieces() {
  return Array.from({ length: COUNT }, (_, index) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.7 + Math.random() * 0.9,
    width: 5 + Math.round(Math.random() * 6),
    color: COLORS[index % COLORS.length],
    drift: Math.round((Math.random() * 2 - 1) * 130),
    spin: 380 + Math.round(Math.random() * 540),
  }));
}

export default function QuizConfetti() {
  const [pieces, setPieces] = useState(null);

  useEffect(() => {
    setPieces(makePieces());
    const id = window.setTimeout(() => setPieces(null), LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (!pieces) return null;
  return (
    <div className="quiz-confetti" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: Math.max(3, Math.round(piece.width * 0.45)),
            background: piece.color,
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
            '--drift': `${piece.drift}px`,
            '--spin': `${piece.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
