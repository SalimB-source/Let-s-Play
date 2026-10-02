import React, { useId } from 'react';
import { CITY_RUSH_DRIVERS } from './cityRushRules';

/**
 * Portrait SVG rétro-arcade propre à chaque pilote international de Vice City Rush.
 * Chaque pilote dispose d'une coupe, d'un accessoire (visière, lunettes, béret,
 * casque, bandeau), d'une tenue de course et d'une palette distincte.
 */
export default function CityRushDriverAvatar({
  driver = null,
  driverId = null,
  className = '',
  decorative = false,
}) {
  const uid = useId().replace(/:/g, '');
  const resolved = driver?.avatar
    ? driver
    : CITY_RUSH_DRIVERS.find((item) => item.id === (driverId || driver?.driverId || driver?.id))
      || CITY_RUSH_DRIVERS[0];
  const avatar = resolved.avatar || CITY_RUSH_DRIVERS[0].avatar;
  const label = `${resolved.displayName || resolved.name} (${resolved.country || resolved.countryCode || ''})`.trim();
  const bgId = `cr-avatar-bg-${avatar.id}-${uid}`;
  const visorId = `cr-avatar-visor-${avatar.id}-${uid}`;

  return (
    <svg
      className={`city-rush-driver-avatar is-${avatar.id}${resolved.isPlayer ? ' is-player' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 100 100"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? 'true' : undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={avatar.bgStart} />
          <stop offset="100%" stopColor={avatar.bgEnd} />
        </linearGradient>
        <linearGradient id={visorId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={avatar.accessoryColor} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="100%" stopColor={avatar.trim} />
        </linearGradient>
      </defs>

      {/* Fond néon 80's + soleil / grille synthwave */}
      <rect x="2" y="2" width="96" height="96" rx="22" fill={`url(#${bgId})`} />
      <circle cx="74" cy="26" r="14" fill={avatar.accessoryColor} opacity="0.22" />
      <path d="M6 74 H94 M6 84 H94" stroke={avatar.trim} strokeOpacity="0.16" strokeWidth="1.5" />

      {/* Cheveux arrière pour les coupes longues / volumineuses */}
      {avatar.hairStyle === 'curly' && (
        <g fill={avatar.hair}>
          <circle cx="29" cy="48" r="13" />
          <circle cx="71" cy="48" r="13" />
          <circle cx="26" cy="62" r="11" />
          <circle cx="74" cy="62" r="11" />
        </g>
      )}
      {avatar.hairStyle === 'wavy-long' && (
        <path d="M25 36 Q18 56 24 76 L76 76 Q82 56 75 36 Z" fill={avatar.hair} />
      )}
      {avatar.hairStyle === 'afro-curls' && (
        <g fill={avatar.hair}>
          <circle cx="50" cy="36" r="26" />
          <circle cx="28" cy="44" r="14" />
          <circle cx="72" cy="44" r="14" />
        </g>
      )}
      {avatar.hairStyle === 'braids' && (
        <g fill={avatar.hair}>
          <path d="M26 40 L21 75 L31 75 L33 44 Z" />
          <path d="M74 40 L79 75 L69 75 L67 44 Z" />
          <rect x="22" y="64" width="8" height="3.5" rx="1" fill={avatar.accessoryColor} />
          <rect x="70" y="64" width="8" height="3.5" rx="1" fill={avatar.accessoryColor} />
        </g>
      )}
      {avatar.hairStyle === 'bob' && (
        <path d="M25 36 Q22 56 29 66 L71 66 Q78 56 75 36 Z" fill={avatar.hair} />
      )}

      {/* Buste & blouson de course */}
      <path
        d="M16 96 C17 74 30 66 50 66 C70 66 83 74 84 96 Z"
        fill={avatar.outfit}
        stroke="#121324"
        strokeWidth="2.8"
      />
      {/* Col racing et bandes contrastées */}
      <path d="M35 67 L50 84 L65 67 L59 64 L50 75 L41 64 Z" fill={avatar.trim} />
      <path d="M24 78 L36 73 M76 78 L64 73" stroke={avatar.accessoryColor} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M50 82 V96" stroke="#121324" strokeWidth="2.4" />

      {/* Cou & visage */}
      <rect x="43" y="56" width="14" height="14" rx="5" fill={avatar.skin} />
      <path
        d="M31 36 C31 23 69 23 69 36 L68 51 C68 61 59 66 50 66 C41 66 32 61 32 51 Z"
        fill={avatar.skin}
        stroke="#121324"
        strokeWidth="2.6"
      />
      {/* Oreilles */}
      <circle cx="31" cy="46" r="4.2" fill={avatar.skin} />
      <circle cx="69" cy="46" r="4.2" fill={avatar.skin} />

      {/* Sourire confiant / barbe fine selon le pilote */}
      {avatar.hairStyle === 'short-fade' && (
        <path d="M41 59 Q50 64 59 59" fill="none" stroke={avatar.hair} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      )}
      {avatar.hairStyle === 'cap-back' && (
        <path d="M39 57 Q50 65 61 57" fill="none" stroke={avatar.hair} strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
      )}
      <path d="M43 55 Q50 59.5 57 54.5" fill="none" stroke="#181526" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M45 55.4 Q50 58 55 55" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />

      {/* Coupe de cheveux avant (12 styles distincts) */}
      {avatar.hairStyle === 'spiky' && (
        <path
          d="M27 39 L23 27 L35 29 L39 16 L49 26 L58 14 L63 27 L76 22 L72 38 C64 31 36 31 27 39 Z"
          fill={avatar.hair}
          stroke="#121324"
          strokeWidth="2.2"
        />
      )}
      {avatar.hairStyle === 'curly' && (
        <g fill={avatar.hair}>
          <circle cx="36" cy="27" r="10" />
          <circle cx="50" cy="24" r="11" />
          <circle cx="64" cy="27" r="10" />
        </g>
      )}
      {avatar.hairStyle === 'short-fade' && (
        <path d="M31 36 C31 21 69 21 69 36 C61 29 39 29 31 36 Z" fill={avatar.hair} />
      )}
      {avatar.hairStyle === 'wavy-long' && (
        <path d="M28 38 C29 21 71 21 72 38 C62 28 45 30 28 38 Z" fill={avatar.hair} />
      )}
      {avatar.hairStyle === 'headband' && (
        <g>
          <path d="M28 36 L32 20 L44 25 L52 17 L61 25 L71 21 L72 36 Z" fill={avatar.hair} />
          <rect x="29" y="31" width="42" height="6.5" rx="3" fill={avatar.trim} stroke="#121324" strokeWidth="1.8" />
          <path d="M70 33 L82 29 L79 38 Z" fill={avatar.trim} />
        </g>
      )}
      {avatar.hairStyle === 'bob' && (
        <path d="M28 38 C30 22 70 22 72 38 L67 33 L33 33 Z" fill={avatar.hair} />
      )}
      {avatar.hairStyle === 'locs' && (
        <g fill={avatar.hair}>
          <rect x="31" y="19" width="7" height="19" rx="3.5" />
          <rect x="40" y="16" width="7" height="20" rx="3.5" />
          <rect x="49" y="15" width="7" height="21" rx="3.5" />
          <rect x="58" y="17" width="7" height="19" rx="3.5" />
          <rect x="65" y="21" width="6" height="17" rx="3" />
          <circle cx="34.5" cy="30" r="2" fill={avatar.accessoryColor} />
          <circle cx="61.5" cy="29" r="2" fill={avatar.accessoryColor} />
        </g>
      )}
      {avatar.hairStyle === 'neon-bangs' && (
        <g>
          <path d="M27 42 C27 21 73 21 73 42 L66 33 L54 39 L44 32 L32 40 Z" fill={avatar.hair} />
          <path d="M52 24 L62 36 L56 38 L47 25 Z" fill={avatar.accessoryColor} />
        </g>
      )}
      {avatar.hairStyle === 'swept' && (
        <path d="M28 37 C28 20 66 16 76 31 C64 31 46 28 28 37 Z" fill={avatar.hair} stroke="#121324" strokeWidth="1.8" />
      )}
      {avatar.hairStyle === 'braids' && (
        <path d="M29 37 C31 21 69 21 71 37 C58 30 42 30 29 37 Z" fill={avatar.hair} />
      )}
      {avatar.hairStyle === 'cap-back' && (
        <g>
          <path d="M29 35 C30 19 70 19 71 35 Z" fill={avatar.outfit} stroke="#121324" strokeWidth="2" />
          <rect x="66" y="29" width="18" height="6" rx="3" fill={avatar.trim} stroke="#121324" strokeWidth="1.8" />
          <path d="M36 33 L45 27 L54 33 Z" fill={avatar.hair} />
        </g>
      )}
      {avatar.hairStyle === 'afro-curls' && (
        <g>
          <circle cx="66" cy="28" r="4.5" fill={avatar.accessoryColor} />
          <circle cx="66" cy="28" r="2" fill="#ffffff" />
        </g>
      )}

      {/* Accessoires / lunettes / couvre-chefs (12 modèles uniques) */}
      {avatar.accessory === 'cyber-visor' && (
        <path d="M29 39 H71 L67 48 H53 L50 44 L47 48 H33 Z" fill={`url(#${visorId})`} stroke="#121324" strokeWidth="2.2" />
      )}
      {avatar.accessory === 'aviator-gold' && (
        <g stroke={avatar.accessoryColor} strokeWidth="2.2" fill="#13263a" fillOpacity="0.88">
          <path d="M33 40 H47 L45 49 Q38 51 33 45 Z" />
          <path d="M53 40 H67 L67 45 Q62 51 55 49 Z" />
          <path d="M47 41 H53" fill="none" />
        </g>
      )}
      {avatar.accessory === 'retro-amber' && (
        <g>
          <rect x="33" y="39" width="14" height="9" rx="2.5" fill={avatar.accessoryColor} fillOpacity="0.82" stroke="#121324" strokeWidth="2.2" />
          <rect x="53" y="39" width="14" height="9" rx="2.5" fill={avatar.accessoryColor} fillOpacity="0.82" stroke="#121324" strokeWidth="2.2" />
          <path d="M47 42 H53" stroke="#121324" strokeWidth="2.2" />
        </g>
      )}
      {avatar.accessory === 'cat-eye' && (
        <g>
          <path d="M30 38 L47 41 L45 48 L33 47 Z" fill="#18122b" stroke={avatar.accessoryColor} strokeWidth="2.3" />
          <path d="M70 38 L53 41 L55 48 L67 47 Z" fill="#18122b" stroke={avatar.accessoryColor} strokeWidth="2.3" />
          <path d="M47 42 H53" stroke={avatar.accessoryColor} strokeWidth="2" />
        </g>
      )}
      {avatar.accessory === 'mirror-shades' && (
        <rect x="31" y="39" width="38" height="9" rx="4.5" fill={`url(#${visorId})`} stroke="#121324" strokeWidth="2.2" />
      )}
      {avatar.accessory === 'french-beret' && (
        <g>
          <path d="M24 29 C26 16 64 14 75 25 C63 29 38 31 24 29 Z" fill={avatar.accessoryColor} stroke="#121324" strokeWidth="2" />
          <path d="M49 16 L52 12" stroke="#121324" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="34" y="40" width="13" height="7.5" rx="3" fill="#181c30" stroke={avatar.trim} strokeWidth="1.8" />
          <rect x="53" y="40" width="13" height="7.5" rx="3" fill="#181c30" stroke={avatar.trim} strokeWidth="1.8" />
          <path d="M47 43 H53" stroke={avatar.trim} strokeWidth="1.8" />
        </g>
      )}
      {avatar.accessory === 'gold-shield' && (
        <path d="M30 38 H70 L66 49 H34 Z" fill={avatar.accessoryColor} stroke="#121324" strokeWidth="2.2" />
      )}
      {avatar.accessory === 'neon-headset' && (
        <g>
          <rect x="23" y="38" width="7" height="15" rx="3.5" fill={avatar.accessoryColor} stroke="#121324" strokeWidth="2" />
          <rect x="70" y="38" width="7" height="15" rx="3.5" fill={avatar.accessoryColor} stroke="#121324" strokeWidth="2" />
          <circle cx="39" cy="44" r="2.3" fill="#121324" />
          <circle cx="61" cy="44" r="2.3" fill="#121324" />
          <path d="M35 40 H43 M57 40 H65" stroke="#121324" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {avatar.accessory === 'glacier-glass' && (
        <g>
          <polygon points="32,40 46,40 48,48 34,48" fill={avatar.accessoryColor} stroke="#121324" strokeWidth="2" />
          <polygon points="54,40 68,40 66,48 52,48" fill={avatar.accessoryColor} stroke="#121324" strokeWidth="2" />
          <path d="M46 43 H54" stroke="#121324" strokeWidth="2.2" />
        </g>
      )}
      {avatar.accessory === 'octagon-gold' && (
        <g fill="#1c162b" stroke={avatar.accessoryColor} strokeWidth="2.2">
          <circle cx="39.5" cy="44" r="6.2" />
          <circle cx="60.5" cy="44" r="6.2" />
          <path d="M45.7 44 H54.3" />
        </g>
      )}
      {avatar.accessory === 'sport-visor' && (
        <path d="M31 40 Q50 36 69 40 L66 48 Q50 45 34 48 Z" fill={`url(#${visorId})`} stroke="#121324" strokeWidth="2.2" />
      )}
      {avatar.accessory === 'palm-shades' && (
        <g>
          <rect x="32" y="39" width="15" height="9" rx="3" fill={avatar.accessoryColor} stroke="#121324" strokeWidth="2" />
          <rect x="53" y="39" width="15" height="9" rx="3" fill={avatar.trim} stroke="#121324" strokeWidth="2" />
          <path d="M47 42 H53" stroke="#121324" strokeWidth="2.2" />
        </g>
      )}

      {/* Cadre extérieur néon */}
      <rect
        x="2.5"
        y="2.5"
        width="95"
        height="95"
        rx="21.5"
        fill="none"
        stroke={resolved.isPlayer ? '#43ead5' : avatar.accessoryColor}
        strokeOpacity="0.72"
        strokeWidth="2.5"
      />
    </svg>
  );
}
