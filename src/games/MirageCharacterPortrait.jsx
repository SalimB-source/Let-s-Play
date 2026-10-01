import React, { useId } from 'react';
import { CHARACTER_NAMES, CHARACTER_PALETTES } from './mirageCharacters';
import { accessoriesForPalette, normalizePalette } from './mirageExplorer';

function toHex(color) {
  return `#${Number(color).toString(16).padStart(6, '0')}`;
}

/**
 * Small, self-contained character illustration used by the online room UI and
 * the cup standings. `colors` ([coat, mane, cloth, trim, head, hat?, markings?]) paints any
 * palette — the equipped skin, say — instead of a `character` preset; `label`
 * overrides the accessible name.
 */
export default function MirageCharacterPortrait({ character = 0, colors = null, label = null, className = '', decorative = false }) {
  const index = ((Number(character) || 0) % CHARACTER_PALETTES.length + CHARACTER_PALETTES.length) % CHARACTER_PALETTES.length;
  const custom = Array.isArray(colors) && colors.length >= 5 && colors.slice(0, 5).every(Number.isFinite);
  const palette = custom ? colors : CHARACTER_PALETTES[index];
  const [coat, mane, cloth, trim, hood, hat] = normalizePalette(palette).map(toHex);
  const isGyro = accessoriesForPalette(palette) === 'gyro';
  const title = label || CHARACTER_NAMES[index];
  const uniqueId = useId().replace(/:/g, '');
  const gradientId = `mirage-portrait-sky-${index}-${uniqueId}`;

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative ? 'true' : undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#765374" />
          <stop offset="0.62" stopColor="#d47d60" />
          <stop offset="1" stopColor="#f0bd77" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="22" fill={`url(#${gradientId})`} />
      <circle cx="75" cy="25" r="12" fill="#ffe4a0" opacity=".88" />
      <path d="M3 73 Q26 62 49 72 T97 70 V98 H3Z" fill="#412d4d" opacity=".55" />
      <path d="M9 91 Q34 83 54 91 T95 88 V98 H9Z" fill="#2b2137" opacity=".48" />
      {/* Horse */}
      <path d="M20 69 Q20 56 31 53 L52 53 Q62 52 69 61 L77 68 Q81 74 76 79 L69 79 Q66 74 61 75 L33 77 Q25 78 20 74Z" fill={coat} stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 59 Q66 47 75 43 L84 47 L82 57 L76 66Z" fill={coat} stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
      <path d="M72 44 Q74 37 80 37 L83 46Z" fill={mane} stroke="#2d2334" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M67 58 Q72 53 78 56" fill="none" stroke={mane} strokeWidth="5" strokeLinecap="round" />
      <circle cx="78" cy="51" r="1.6" fill="#fff4d7" />
      <path d="M31 75 L30 88 M42 75 L42 90 M62 74 L63 87 M71 73 L73 85" fill="none" stroke={mane} strokeWidth="5" strokeLinecap="round" />
      <path d="M20 63 Q12 65 14 74" fill="none" stroke={mane} strokeWidth="4" strokeLinecap="round" />
      {/* Saddle and rider */}
      <path d="M31 57 Q43 52 54 58 L51 66 L34 66Z" fill={trim} stroke="#2d2334" strokeWidth="2.5" />
      <path d="M39 55 L41 43 Q45 36 54 39 L62 49 L56 62 L48 65Z" fill={cloth} stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
      <path d="M52 43 Q56 38 61 43 L66 51 L61 54 L55 49Z" fill={mane} stroke="#2d2334" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M42 42 Q40 35 46 31 L57 31 Q63 35 60 44 L54 49 L46 47Z" fill={hood} stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
      {/* Cowboy Hat (pinched crown + trim hatband + wide curved brim) */}
      <path d="M41 31 L43 20 Q47 17 51 22 Q55 17 59 20 L61 31Z" fill={hat} stroke="#2d2334" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M41 28 L61 28 L61 31 L41 31Z" fill={trim} stroke="#2d2334" strokeWidth="2" strokeLinejoin="round" />
      <path d="M31 28 Q36 34 51 33 Q66 34 71 27 Q66 31 51 30 Q36 31 31 28Z" fill={hat} stroke="#2d2334" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M49 49 L50 61" stroke={trim} strokeWidth="3" strokeLinecap="round" />
      <path d="M54 61 Q62 63 67 60" fill="none" stroke="#2d2334" strokeWidth="2" strokeLinecap="round" />
      {isGyro && (
        <g aria-hidden="true">
          <path d="M36 56 Q32 68 40 78 Q48 70 46 58Z" fill="#2f9a44" stroke="#2d2334" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="47" cy="36.5" rx="5.2" ry="3.4" fill="#8a9aa8" stroke="#c5cdd4" strokeWidth="1.7" />
          <ellipse cx="58" cy="36.5" rx="5.2" ry="3.4" fill="#8a9aa8" stroke="#c5cdd4" strokeWidth="1.7" />
          <path d="M52 36.5 H53.2" stroke="#c5cdd4" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="36" cy="64" r="7.2" fill="#46e04c" stroke="#1d5a22" strokeWidth="2.2" />
          <circle cx="33.6" cy="61.6" r="2.1" fill="#d6ff9c" />
          <circle cx="70" cy="58" r="7.2" fill="#46e04c" stroke="#1d5a22" strokeWidth="2.2" />
          <circle cx="67.6" cy="55.6" r="2.1" fill="#d6ff9c" />
        </g>
      )}
      <rect x="2" y="2" width="96" height="96" rx="22" fill="none" stroke="rgba(255,244,220,.42)" strokeWidth="2" />
    </svg>
  );
}
