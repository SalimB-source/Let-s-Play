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
  const accessoryKind = accessoriesForPalette(palette);
  const isGyro = accessoryKind === 'gyro';
  const isCloudChocobo = accessoryKind === 'cloud-chocobo';
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
      {isCloudChocobo ? (
        <g aria-hidden="true">
          {/* Buster Sword worn upside down: grip up in the back, blade down. */}
          <path d="M43 27 L58 65 L67 61 L52 23Z" fill="#aebdce" stroke="#2d2334" strokeWidth="2.8" strokeLinejoin="round" />
          <path d="M56 55 L62 59 L50 27" fill="none" stroke="#e8eef5" strokeWidth="2.2" />
          <path d="M42 28 L53 24 M44 22 L52 29" stroke="#d9e1e9" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M45 23 L38 16" stroke="#70452b" strokeWidth="4.6" strokeLinecap="round" />
          {/* Chocobo tail, legs and golden body. */}
          <path d="M17 62 Q9 55 12 47 Q20 50 24 58 M20 65 Q14 59 16 52" fill="#ffea72" stroke="#2d2334" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M40 76 L38 89 M57 76 L59 89" fill="none" stroke="#ef8728" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M38 90 L32 92 M38 90 L40 94 M38 90 L45 92 M59 90 L53 92 M59 90 L61 94 M59 90 L66 92" fill="none" stroke="#ef8728" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M14 67 Q13 55 27 52 L54 52 Q69 53 74 65 L71 77 Q66 83 53 82 L28 80 Q16 78 14 71Z" fill="#ffd23e" stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
          <path d="M26 61 Q41 52 60 60 Q55 70 39 70 Q31 69 26 65Z" fill="#f8bb2e" stroke="#2d2334" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M60 64 Q61 47 69 40 L79 42 L78 64 L70 71Z" fill="#ffd23e" stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
          <path d="M68 37 Q68 27 78 26 Q88 26 89 35 L85 45 L73 45Z" fill="#ffd23e" stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
          <path d="M85 34 Q97 31 97 37 Q97 41 85 42Z" fill="#ef8728" stroke="#2d2334" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="81" cy="34" r="2.2" fill="#fff5dc" stroke="#2d2334" strokeWidth="1.2" />
          <circle cx="82" cy="34" r="1.1" fill="#21182a" />
          <path d="M74 27 Q68 22 72 15 Q78 18 78 25 M79 27 Q76 18 83 13 Q88 20 84 28 M84 29 Q87 21 94 21 Q94 28 88 33" fill="#ffea72" stroke="#2d2334" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Blue saddle and Cloud's SOLDIER outfit. */}
          <path d="M31 55 Q44 50 56 55 L59 62 L35 64Z" fill="#244f9b" stroke="#2d2334" strokeWidth="2.5" />
          <path d="M42 49 L44 41 Q49 36 56 39 L64 48 L60 60 L49 63 L42 57Z" fill="#244f9b" stroke="#2d2334" strokeWidth="3" strokeLinejoin="round" />
          <path d="M43 43 Q38 39 36 47 L40 53 L45 51 M59 43 Q64 42 68 48 L63 53 L59 50" fill="#244f9b" stroke="#2d2334" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M48 38 Q46 30 51 27 L59 27 Q65 31 62 39 L58 43 L51 42Z" fill="#f0c6a4" stroke="#2d2334" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M45 32 Q42 26 47 23 L45 17 Q52 18 54 23 Q58 15 62 19 Q67 17 68 24 L65 31 L60 30 L57 34 L53 30 L49 35Z" fill="#ffdf63" stroke="#2d2334" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M49 34 L52 34 M59 34 L62 34" stroke="#2785e8" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M60 42 L67 43 L69 49 L62 51Z" fill="#b9c7d6" stroke="#2d2334" strokeWidth="2.4" strokeLinejoin="round" />
        </g>
      ) : (
        <g>
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
        </g>
      )}
      <rect x="2" y="2" width="96" height="96" rx="22" fill="none" stroke="rgba(255,244,220,.42)" strokeWidth="2" />
    </svg>
  );
}
