import React, { useMemo, useState } from 'react';

/**
 * Compteur de vitesse à aiguille, style tableau de bord néon bleu.
 *
 * Interactif : un clic (ou Entrée / Espace) bascule l'échelle principale
 * entre km/h et MPH. L'aiguille suit la vitesse en douceur, l'anneau s'allume
 * en vert pendant le turbo et rougit dans la zone rouge.
 */
const MAX_KMH = 320;
const START_ANGLE = -225; // 0 en bas à gauche
const SWEEP = 270;        // jusqu'en bas à droite
const KMH_PER_MPH = 1.609344;

const CX = 100;
const CY = 100;

function polar(radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function arcPath(radius, fromDeg, toDeg) {
  const [x1, y1] = polar(radius, fromDeg);
  const [x2, y2] = polar(radius, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

const kmhToAngle = (kmh) => START_ANGLE + (Math.max(0, Math.min(MAX_KMH, kmh)) / MAX_KMH) * SWEEP;

export default function CityRushSpeedometer({ speed = 0, boosting = false }) {
  const [unit, setUnit] = useState('kmh');
  const kmh = Math.max(0, Number(speed) || 0);
  const mph = kmh / KMH_PER_MPH;
  const isMph = unit === 'mph';
  const redline = kmh >= MAX_KMH * 0.85;

  // Graduations de l'échelle principale (extérieure) et secondaire (intérieure).
  const scales = useMemo(() => {
    const major = isMph
      ? { max: MAX_KMH / KMH_PER_MPH, step: 20, minor: 10, toKmh: (v) => v * KMH_PER_MPH }
      : { max: MAX_KMH, step: 40, minor: 20, toKmh: (v) => v };
    const minor = isMph
      ? { step: 40, toKmh: (v) => v }
      : { step: 20, toKmh: (v) => v * KMH_PER_MPH };
    const outer = [];
    for (let v = 0; v <= major.max + 0.01; v += major.minor) {
      outer.push({ v, angle: kmhToAngle(major.toKmh(v)), big: Math.round(v) % major.step === 0 });
    }
    const inner = [];
    for (let v = 0; minor.toKmh(v) <= MAX_KMH + 0.01; v += minor.step) {
      inner.push({ v, angle: kmhToAngle(minor.toKmh(v)) });
    }
    return { outer, inner };
  }, [isMph]);

  const needle = kmhToAngle(kmh) + 90; // l'aiguille est dessinée pointant vers le haut
  const shown = Math.round(isMph ? mph : kmh);
  const toggle = () => setUnit((u) => (u === 'kmh' ? 'mph' : 'kmh'));

  return (
    <button
      type="button"
      className={`city-rush-speedometer${boosting ? ' is-boost' : ''}${redline ? ' is-redline' : ''}`}
      onClick={toggle}
      title={`Compteur · cliquer pour passer en ${isMph ? 'km/h' : 'MPH'}`}
      aria-label={`Vitesse : ${shown} ${isMph ? 'miles par heure' : 'kilomètres par heure'}. Appuie pour changer d’unité.`}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="crSpeedFace" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#141a2c" />
            <stop offset="100%" stopColor="#04060c" />
          </radialGradient>
          <filter id="crSpeedGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle cx={CX} cy={CY} r="98" className="cr-speed-bezel" />
        <circle cx={CX} cy={CY} r="92" fill="url(#crSpeedFace)" />

        {/* Anneau néon + progression de la vitesse */}
        <path d={arcPath(84, START_ANGLE, START_ANGLE + SWEEP)} className="cr-speed-ring" filter="url(#crSpeedGlow)" />
        <path d={arcPath(84, START_ANGLE + SWEEP * 0.85, START_ANGLE + SWEEP)} className="cr-speed-red" />
        {kmh > 0.5 && <path d={arcPath(84, START_ANGLE, kmhToAngle(kmh))} className="cr-speed-fill" filter="url(#crSpeedGlow)" />}

        {/* Échelle principale */}
        {scales.outer.map(({ v, angle, big }) => {
          const [x1, y1] = polar(big ? 70 : 74, angle);
          const [x2, y2] = polar(79, angle);
          const [tx, ty] = polar(58, angle);
          return (
            <g key={`o${v}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} className={big ? 'cr-speed-tick is-big' : 'cr-speed-tick'} />
              {big && <text x={tx} y={ty} className="cr-speed-num">{Math.round(v)}</text>}
            </g>
          );
        })}

        {/* Échelle secondaire (l'autre unité), plus petite, à l'intérieur */}
        {scales.inner.map(({ v, angle }) => {
          const [tx, ty] = polar(41, angle);
          return <text key={`i${v}`} x={tx} y={ty} className="cr-speed-num is-inner">{v}</text>;
        })}

        <text x={CX} y="146" className="cr-speed-unit">{isMph ? 'MPH' : 'km/h'}</text>

        {/* Aiguille */}
        <g className="cr-speed-needle" style={{ transform: `rotate(${needle}deg)` }}>
          <path d={`M ${CX - 2.4} ${CY + 12} L ${CX - 0.8} ${CY - 76} L ${CX + 0.8} ${CY - 76} L ${CX + 2.4} ${CY + 12} Z`} />
        </g>
        <circle cx={CX} cy={CY} r="9" className="cr-speed-hub" />
      </svg>

      <span className="city-rush-speedometer-readout">
        <b>{shown}</b>
        <small>{isMph ? 'MPH' : 'KM/H'}</small>
      </span>
    </button>
  );
}
