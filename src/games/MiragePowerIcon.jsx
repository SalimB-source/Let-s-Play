import React, { useId } from 'react';
import { POWER_UPS } from './mirageRules';
import { miragePowerIcon } from './miragePowerIcons';

/**
 * Icônes vectorielles des objets spéciaux de Mirage Rush. Les pouvoirs jaune
 * et rouge de Cloud remplacent le lasso et le pistolet par des SVG dédiés ;
 * Link remplace aussi le bouclier bleu par sa bombe à mèche.
 */
export default function MiragePowerIcon({ type, variant = 'standard', className = '', decorative = true }) {
  const icon = miragePowerIcon(type, variant);
  const resolvedType = icon.id;
  const isCloudIcon = icon.variant === 'cloud';
  const isLinkIcon = icon.variant === 'link';
  const isSkinIcon = isCloudIcon || isLinkIcon;
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      className={`mirage-power-image is-${resolvedType}${isCloudIcon ? ` is-cloud is-cloud-${resolvedType}` : ''}${isLinkIcon ? ` is-link is-link-${resolvedType}` : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 64 64"
      fill="none"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : icon.alt}
      aria-hidden={decorative ? 'true' : undefined}
      data-power-icon={isSkinIcon ? `${icon.variant}-${resolvedType}` : resolvedType}
      focusable="false"
    >
      {isSkinIcon && (
        <image href={icon.src} x="0" y="0" width="64" height="64" preserveAspectRatio="xMidYMid meet" />
      )}
      {resolvedType === POWER_UPS.SHIELD && (
        <>
          <defs>
            <radialGradient id={`shield-bg-${uid}`} cx="50%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#19526b" />
              <stop offset="58%" stopColor="#0c2638" />
              <stop offset="100%" stopColor="#06131e" />
            </radialGradient>
            <linearGradient id={`shield-rim-${uid}`} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff6d6" />
              <stop offset="35%" stopColor="#ffd573" />
              <stop offset="70%" stopColor="#c9872b" />
              <stop offset="100%" stopColor="#f7c965" />
            </linearGradient>
            <linearGradient id={`shield-face-${uid}`} x1="18" y1="12" x2="46" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#84ffff" />
              <stop offset="42%" stopColor="#25d5e6" />
              <stop offset="80%" stopColor="#0b7694" />
              <stop offset="100%" stopColor="#06455c" />
            </linearGradient>
            <linearGradient id={`shield-gem-${uid}`} x1="26" y1="22" x2="38" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#9bfaff" />
              <stop offset="100%" stopColor="#1cb5d8" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#shield-bg-${uid})`} stroke="#4ce9df" strokeWidth="2" strokeOpacity="0.68" />
          <rect x="5" y="5" width="54" height="54" rx="11" stroke="#9afcff" strokeWidth="1" strokeOpacity="0.24" />
          <circle cx="32" cy="32" r="23" stroke="#4ce9df" strokeWidth="1.2" strokeDasharray="4 3" strokeOpacity="0.42" />
          {/* Écu métallique doré */}
          <path d="M32 9L50 16.2V30.8C50 43.2 41.8 51.6 32 55.5C22.2 51.6 14 43.2 14 30.8V16.2L32 9Z" fill={`url(#shield-rim-${uid})`} stroke="#1b1209" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Cœur cristallin cyan */}
          <path d="M32 13.4L45.8 18.9V30.4C45.8 40.2 39.4 47.1 32 50.5C24.6 47.1 18.2 40.2 18.2 30.4V18.9L32 13.4Z" fill={`url(#shield-face-${uid})`} stroke="#083244" strokeWidth="1.6" strokeLinejoin="round" />
          {/* Facettes et reflet spéculaire */}
          <path d="M32 13.4V50.5M18.2 28.5H45.8" stroke="#a6ffff" strokeWidth="1.1" strokeOpacity="0.42" />
          <path d="M21.5 19.8L32 15.6L39.5 18.6L22.2 35.8C20.1 32.5 19.8 26.8 21.5 19.8Z" fill="#ffffff" fillOpacity="0.26" />
          {/* Diamant bleu central */}
          <path d="M32 21.5L39.5 31L32 40.5L24.5 31L32 21.5Z" fill={`url(#shield-gem-${uid})`} stroke="#072c3d" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M32 24L36.2 31L32 33.2L27.8 31L32 24Z" fill="#ffffff" fillOpacity="0.72" />
          {/* Rivets d’armure */}
          <circle cx="32" cy="11.3" r="1.3" fill="#fff7dc" />
          <circle cx="47.6" cy="17.8" r="1.3" fill="#fff7dc" />
          <circle cx="16.4" cy="17.8" r="1.3" fill="#fff7dc" />
          <circle cx="32" cy="52.9" r="1.3" fill="#fff7dc" />
        </>
      )}

      {resolvedType === POWER_UPS.LASSO && !isCloudIcon && (
        <>
          <defs>
            <radialGradient id={`lasso-bg-${uid}`} cx="50%" cy="35%" r="72%">
              <stop offset="0%" stopColor="#5c3612" />
              <stop offset="60%" stopColor="#2c1707" />
              <stop offset="100%" stopColor="#140a03" />
            </radialGradient>
            <linearGradient id={`lasso-rope-${uid}`} x1="12" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff0b8" />
              <stop offset="45%" stopColor="#f7b948" />
              <stop offset="85%" stopColor="#b86b19" />
              <stop offset="100%" stopColor="#e89d2c" />
            </linearGradient>
            <linearGradient id={`lasso-gem-${uid}`} x1="28" y1="19" x2="38" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#ffe680" />
              <stop offset="100%" stopColor="#f39c38" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#lasso-bg-${uid})`} stroke="#ffd15c" strokeWidth="2" strokeOpacity="0.68" />
          <rect x="5" y="5" width="54" height="54" rx="11" stroke="#ffe89e" strokeWidth="1" strokeOpacity="0.24" />
          {/* Sillage de rotation */}
          <path d="M12 24C16 12 36 8 49 16" stroke="#ffe484" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 3" strokeOpacity="0.48" />
          {/* Spires de réserve */}
          <ellipse cx="23" cy="46" rx="9.5" ry="5.2" transform="rotate(-14 23 46)" stroke="#8c4f12" strokeWidth="4.6" />
          <ellipse cx="23" cy="46" rx="9.5" ry="5.2" transform="rotate(-14 23 46)" stroke="#dca03a" strokeWidth="2.6" />
          {/* Brin de corde tenu en main */}
          <path d="M26 37C19 42 15 49 11 54" stroke="#1e1005" strokeWidth="6.4" strokeLinecap="round" />
          <path d="M26 37C19 42 15 49 11 54" stroke={`url(#lasso-rope-${uid})`} strokeWidth="3.8" strokeLinecap="round" />
          {/* Grande boucle de lasso lancée */}
          <ellipse cx="34" cy="26.5" rx="17.5" ry="11.5" transform="rotate(-18 34 26.5)" stroke="#1e1005" strokeWidth="7.4" />
          <ellipse cx="34" cy="26.5" rx="17.5" ry="11.5" transform="rotate(-18 34 26.5)" stroke={`url(#lasso-rope-${uid})`} strokeWidth="4.6" />
          {/* Torsades du cordage */}
          <ellipse cx="34" cy="26.5" rx="17.5" ry="11.5" transform="rotate(-18 34 26.5)" stroke="#6e3809" strokeWidth="4.4" strokeDasharray="2.2 4.4" strokeOpacity="0.65" />
          <ellipse cx="34" cy="26.5" rx="17.5" ry="11.5" transform="rotate(-18 34 26.5)" stroke="#fff7d1" strokeWidth="1.2" strokeDasharray="3 6" strokeOpacity="0.65" />
          {/* Nœud coulant (honda knot) */}
          <g transform="translate(25.5 36.5) rotate(-25)">
            <rect x="-4.5" y="-3.4" width="9" height="6.8" rx="3.2" fill="#d97b24" stroke="#1e1005" strokeWidth="1.8" />
            <rect x="-2.2" y="-3.4" width="4.4" height="6.8" rx="1.2" fill="#ffe28a" stroke="#5e2f07" strokeWidth="1" />
          </g>
          {/* Diamant jaune central */}
          <path d="M35 19.5L40.2 26L35 32.5L29.8 26L35 19.5Z" fill={`url(#lasso-gem-${uid})`} stroke="#2b1604" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M35 21.5L38 26L35 27.6L32 26L35 21.5Z" fill="#ffffff" fillOpacity="0.75" />
        </>
      )}

      {resolvedType === POWER_UPS.BOOST && (
        <>
          <defs>
            <radialGradient id={`boost-bg-${uid}`} cx="50%" cy="35%" r="72%">
              <stop offset="0%" stopColor="#14593b" />
              <stop offset="60%" stopColor="#092b1d" />
              <stop offset="100%" stopColor="#04140d" />
            </radialGradient>
            <linearGradient id={`boost-wing-${uid}`} x1="10" y1="16" x2="54" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c4ffdf" />
              <stop offset="48%" stopColor="#35e892" />
              <stop offset="100%" stopColor="#0e874d" />
            </linearGradient>
            <linearGradient id={`boost-bolt-${uid}`} x1="26" y1="8" x2="38" y2="55" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="32%" stopColor="#fff28c" />
              <stop offset="72%" stopColor="#57f7a4" />
              <stop offset="100%" stopColor="#18b868" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#boost-bg-${uid})`} stroke="#52eda0" strokeWidth="2" strokeOpacity="0.68" />
          <rect x="5" y="5" width="54" height="54" rx="11" stroke="#a3ffd0" strokeWidth="1" strokeOpacity="0.24" />
          {/* Lignes de vitesse */}
          <path d="M11 22H21M9 32H17M12 42H22M43 20H53M46 32H55M42 44H52" stroke="#6ef7af" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.45" />
          {/* Fer à cheval / arc turbo émeraude */}
          <path d="M21 17C14 23 13 36 20 45C24.5 50.5 30 52.5 32 52.5C34 52.5 39.5 50.5 44 45C51 36 50 23 43 17L38.5 21.5C43 26 43.5 34.5 39 40.5C36.8 43.4 34.4 45 32 45C29.6 45 27.2 43.4 25 40.5C20.5 34.5 21 26 25.5 21.5L21 17Z" fill={`url(#boost-wing-${uid})`} stroke="#052114" strokeWidth="2" strokeLinejoin="round" />
          {/* Éclair central de surpuissance */}
          <path d="M36.5 9L20.5 32.5H31.5L26.5 55L44.5 29.5H33.2L36.5 9Z" fill={`url(#boost-bolt-${uid})`} stroke="#072415" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M34.8 14.5L24.2 30.5H32.6L29.5 46.5L40.4 31.2H31.8L34.8 14.5Z" fill="#ffffff" fillOpacity="0.55" />
          {/* Éclat de diamant vert */}
          <path d="M48 11L51 15L48 19L45 15L48 11Z" fill="#a8ffcf" stroke="#062617" strokeWidth="1.1" />
        </>
      )}

      {resolvedType === POWER_UPS.PISTOL && !isCloudIcon && (
        <>
          <defs>
            <radialGradient id={`pistol-bg-${uid}`} cx="50%" cy="35%" r="72%">
              <stop offset="0%" stopColor="#661824" />
              <stop offset="60%" stopColor="#2e0a10" />
              <stop offset="100%" stopColor="#160407" />
            </radialGradient>
            <linearGradient id={`pistol-steel-${uid}`} x1="16" y1="16" x2="48" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#cfd8e3" />
              <stop offset="78%" stopColor="#6e7b8b" />
              <stop offset="100%" stopColor="#434d59" />
            </linearGradient>
            <linearGradient id={`pistol-grip-${uid}`} x1="12" y1="32" x2="28" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e3894f" />
              <stop offset="50%" stopColor="#9e471e" />
              <stop offset="100%" stopColor="#59220b" />
            </linearGradient>
            <linearGradient id={`pistol-flash-${uid}`} x1="44" y1="10" x2="58" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#ffe169" />
              <stop offset="100%" stopColor="#ff4b4b" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#pistol-bg-${uid})`} stroke="#ff6e66" strokeWidth="2" strokeOpacity="0.68" />
          <rect x="5" y="5" width="54" height="54" rx="11" stroke="#ffa8a3" strokeWidth="1" strokeOpacity="0.24" />
          {/* Réticule de duel */}
          <circle cx="34" cy="30" r="19" stroke="#ff6e66" strokeWidth="1.1" strokeDasharray="3 3" strokeOpacity="0.38" />
          {/* Éclat de détonation au bout du canon */}
          <path d="M51 11L53.2 16.2L58.5 15.5L54.8 19.8L57.8 24.2L52.4 23.2L49.5 27.5L48.8 22.1L44 20.2L48.8 17.5L51 11Z" fill={`url(#pistol-flash-${uid})`} stroke="#2b070a" strokeWidth="1.2" strokeLinejoin="round" />
          {/* Revolver six-coups western incliné */}
          <g transform="translate(30 34) rotate(-22) translate(-30 -34)">
            {/* Pontet & détente */}
            <path d="M23 36C23 41.2 28.8 42.2 30.5 37.5" stroke="#f2c15a" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M26.5 35.5C26.2 37.6 25.2 38.8 24.2 39.2" stroke="#cfd8e3" strokeWidth="1.8" strokeLinecap="round" />
            {/* Chien armé */}
            <path d="M18 25.5L13.5 22.5L15.2 27.8Z" fill={`url(#pistol-steel-${uid})`} stroke="#1a080b" strokeWidth="1.6" strokeLinejoin="round" />
            {/* Canon et carcasse */}
            <path d="M17 26.5H47.5C48.6 26.5 49.5 27.4 49.5 28.5V31.2C49.5 32.1 48.8 32.8 47.9 32.8H33.5L30.5 36.8H21.5L17 33V26.5Z" fill={`url(#pistol-steel-${uid})`} stroke="#1a080b" strokeWidth="2" strokeLinejoin="round" />
            {/* Guidon et tige d’éjection */}
            <path d="M45.5 26.5L47.5 23.8L48.8 26.5Z" fill="#cfd8e3" stroke="#1a080b" strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="33" y="32.2" width="13.5" height="2.6" rx="1.2" fill="#7d8a99" stroke="#1a080b" strokeWidth="1.3" />
            <path d="M19 28.4H46.5" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.8" />
            {/* Barillet à chambres */}
            <rect x="21.5" y="26.2" width="11.2" height="8.6" rx="2" fill={`url(#pistol-steel-${uid})`} stroke="#1a080b" strokeWidth="1.8" />
            <rect x="23.4" y="27.8" width="3.2" height="2.1" rx="1" fill="#2c3540" />
            <rect x="27.6" y="27.8" width="3.2" height="2.1" rx="1" fill="#2c3540" />
            <rect x="23.4" y="31.1" width="3.2" height="2.1" rx="1" fill="#2c3540" />
            <rect x="27.6" y="31.1" width="3.2" height="2.1" rx="1" fill="#2c3540" />
            {/* Crosse en noyer et losange doré */}
            <path d="M17.5 32.2L23.8 34.8L19.8 49.5C19.2 51.4 17.2 52.4 15.2 51.8L11.8 50.6C10.1 50 9.4 48.1 10.2 46.4L17.5 32.2Z" fill={`url(#pistol-grip-${uid})`} stroke="#1a080b" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16.8 40L18.8 42.5L16.8 45L14.8 42.5L16.8 40Z" fill="#ffd56b" stroke="#3b1406" strokeWidth="1" />
          </g>
        </>
      )}
    </svg>
  );
}
