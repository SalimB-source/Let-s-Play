import React from 'react';

/**
 * Normalisation de l'identifiant pour la recherche du logo.
 */
function canonicalConsoleKey(raw) {
  if (typeof raw !== 'string') return '';
  const id = raw.trim().toUpperCase();
  const MAP = {
    'PC STEAM': 'PC',
    'STEAM': 'PC',
    'PC': 'PC',
    'PS5': 'PS5',
    'PLAYSTATION 5': 'PS5',
    'PS4': 'PS4',
    'PLAYSTATION 4': 'PS4',
    'PS3': 'PS3',
    'PLAYSTATION 3': 'PS3',
    'PS2': 'PS2',
    'PLAYSTATION 2': 'PS2',
    'PS1': 'PS1',
    'PLAYSTATION 1': 'PS1',
    'PLAYSTATION': 'PS1',
    'PSX': 'PS1',
    'XBOX SERIES X': 'XBOX SERIES X',
    'XBOX SERIES': 'XBOX SERIES X',
    'XBOX SERIES S': 'XBOX SERIES X',
    'XBOX ONE': 'XBOX ONE',
    'XBOX 360': 'XBOX 360',
    'X360': 'XBOX 360',
    'XBOX': 'XBOX ONE',
    'SWITCH 2': 'SWITCH 2',
    'NINTENDO SWITCH 2': 'SWITCH 2',
    'SWITCH': 'SWITCH',
    'NINTENDO SWITCH': 'SWITCH',
    'GAMECUBE': 'GAMECUBE',
    'NINTENDO GAMECUBE': 'GAMECUBE',
    'GCN': 'GAMECUBE',
    'NGC': 'GAMECUBE',
    'SNES': 'SNES',
    'SUPER NINTENDO': 'SNES',
    'SUPER NES': 'SNES',
    'SUPER FAMICOM': 'SNES',
    'MEGADRIVE': 'MEGADRIVE',
    'MEGA DRIVE': 'MEGADRIVE',
    'SEGA MEGA DRIVE': 'MEGADRIVE',
    'GENESIS': 'MEGADRIVE',
    'SEGA GENESIS': 'MEGADRIVE',
    'N64': 'N64',
    'NINTENDO 64': 'N64',
    'DREAMCAST': 'DREAMCAST',
    'SEGA DREAMCAST': 'DREAMCAST',
    'GBA': 'GBA',
    'GAME BOY ADVANCE': 'GBA',
    'GAMEBOY ADVANCE': 'GBA',
    'NES': 'NES',
    'NINTENDO NES': 'NES',
    'FAMICOM': 'NES',
  };
  return MAP[id] || id;
}

/**
 * Composant de logo officiel pour consoles modernes et iconiques rétro.
 */
export function ConsoleLogo({ consoleId, size = 18, className = '', style = {} }) {
  const key = canonicalConsoleKey(consoleId);

  const baseStyle = {
    display: 'inline-block',
    verticalAlign: 'middle',
    flexShrink: 0,
    ...style,
  };

  switch (key) {
    case 'PS5':
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-ps5 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* PlayStation mark in modern white/blue */}
          <path
            d="M15.858 11.451c-.313.395-1.079.676-1.079.676l-5.696 2.046v-1.509l4.192-1.493c.476-.17.549-.412.162-.538-.386-.127-1.085-.09-1.56.08l-2.794.984v-1.566l.161-.054s.807-.286 1.942-.412c1.135-.125 2.525.017 3.616.43 1.23.39 1.368.962 1.056 1.356M9.625 8.883v-3.86c0-.453-.083-.87-.508-.988-.326-.105-.528.198-.528.65v9.664l-2.606-.827V2c1.108.206 2.722.692 3.59.985 2.207.757 2.955 1.7 2.955 3.825 0 2.071-1.278 2.856-2.903 2.072Zm-8.424 3.625C-.061 12.15-.271 11.41.304 10.984c.532-.394 1.436-.69 1.436-.69l3.737-1.33v1.515l-2.69.963c-.474.17-.547.411-.161.538.386.126 1.085.09 1.56-.08l1.29-.469v1.356l-.257.043a8.45 8.45 0 0 1-4.018-.323Z"
            fill="#0070D1"
          />
        </svg>
      );

    case 'PS4':
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-ps4 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          <path
            d="M15.858 11.451c-.313.395-1.079.676-1.079.676l-5.696 2.046v-1.509l4.192-1.493c.476-.17.549-.412.162-.538-.386-.127-1.085-.09-1.56.08l-2.794.984v-1.566l.161-.054s.807-.286 1.942-.412c1.135-.125 2.525.017 3.616.43 1.23.39 1.368.962 1.056 1.356M9.625 8.883v-3.86c0-.453-.083-.87-.508-.988-.326-.105-.528.198-.528.65v9.664l-2.606-.827V2c1.108.206 2.722.692 3.59.985 2.207.757 2.955 1.7 2.955 3.825 0 2.071-1.278 2.856-2.903 2.072Zm-8.424 3.625C-.061 12.15-.271 11.41.304 10.984c.532-.394 1.436-.69 1.436-.69l3.737-1.33v1.515l-2.69.963c-.474.17-.547.411-.161.538.386.126 1.085.09 1.56-.08l1.29-.469v1.356l-.257.043a8.45 8.45 0 0 1-4.018-.323Z"
            fill="#003791"
          />
        </svg>
      );

    case 'PS3':
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-ps3 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          <path
            d="M15.858 11.451c-.313.395-1.079.676-1.079.676l-5.696 2.046v-1.509l4.192-1.493c.476-.17.549-.412.162-.538-.386-.127-1.085-.09-1.56.08l-2.794.984v-1.566l.161-.054s.807-.286 1.942-.412c1.135-.125 2.525.017 3.616.43 1.23.39 1.368.962 1.056 1.356M9.625 8.883v-3.86c0-.453-.083-.87-.508-.988-.326-.105-.528.198-.528.65v9.664l-2.606-.827V2c1.108.206 2.722.692 3.59.985 2.207.757 2.955 1.7 2.955 3.825 0 2.071-1.278 2.856-2.903 2.072Zm-8.424 3.625C-.061 12.15-.271 11.41.304 10.984c.532-.394 1.436-.69 1.436-.69l3.737-1.33v1.515l-2.69.963c-.474.17-.547.411-.161.538.386.126 1.085.09 1.56-.08l1.29-.469v1.356l-.257.043a8.45 8.45 0 0 1-4.018-.323Z"
            fill="#e2e8f0"
          />
        </svg>
      );

    case 'PS2':
      return (
        <svg
          viewBox="0 0 24 16"
          width={size * 1.5}
          height={size}
          fill="none"
          className={`console-logo console-logo-ps2 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* PS2 iconic electric blue typography */}
          <text
            x="0"
            y="13"
            fontFamily="var(--display), system-ui, sans-serif"
            fontWeight="900"
            fontSize="14"
            letterSpacing="-0.04em"
            fill="url(#ps2-gradient)"
          >
            PS2
          </text>
          <defs>
            <linearGradient id="ps2-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00A3E0" />
              <stop offset="100%" stopColor="#003791" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'PS1':
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-ps1 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Classic 4-color PlayStation logo */}
          <path
            d="M9.625 8.883v-3.86c0-.453-.083-.87-.508-.988-.326-.105-.528.198-.528.65v9.664l-2.606-.827V2c1.108.206 2.722.692 3.59.985 2.207.757 2.955 1.7 2.955 3.825 0 2.071-1.278 2.856-2.903 2.072Z"
            fill="#DF0024"
          />
          <path
            d="M15.858 11.451c-.313.395-1.079.676-1.079.676l-5.696 2.046v-1.509l4.192-1.493c.476-.17.549-.412.162-.538-.386-.127-1.085-.09-1.56.08l-2.794.984v-1.566l.161-.054s.807-.286 1.942-.412c1.135-.125 2.525.017 3.616.43 1.23.39 1.368.962 1.056 1.356Z"
            fill="#00A651"
          />
          <path
            d="M1.201 12.509C-.061 12.15-.271 11.41.304 10.984c.532-.394 1.436-.69 1.436-.69l3.737-1.33v1.515l-2.69.963c-.474.17-.547.411-.161.538.386.126 1.085.09 1.56-.08l1.29-.469v1.356l-.257.043a8.45 8.45 0 0 1-4.018-.323Z"
            fill="#FDB813"
          />
        </svg>
      );

    case 'XBOX SERIES X':
    case 'XBOX ONE':
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-xbox ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          <path
            d="M7.202 15.967a8 8 0 0 1-3.552-1.26c-.898-.585-1.101-.826-1.101-1.306 0-.965 1.062-2.656 2.879-4.583C6.459 7.723 7.897 6.44 8.052 6.475c.302.068 2.718 2.423 3.622 3.531 1.43 1.753 2.088 3.189 1.754 3.829-.254.486-1.83 1.437-2.987 1.802-.954.301-2.207.429-3.239.33m-5.866-3.57C.589 11.253.212 10.127.03 8.497c-.06-.539-.038-.846.137-1.95.218-1.377 1.002-2.97 1.945-3.95.401-.417.437-.427.926-.263.595.2 1.23.638 2.213 1.528l.574.519-.313.385C4.056 6.553 2.52 9.086 1.94 10.653c-.315.852-.442 1.707-.306 2.063.091.24.007.15-.3-.319Zm13.101.195c.074-.36-.019-1.02-.238-1.687-.473-1.443-2.055-4.128-3.508-5.953l-.457-.575.494-.454c.646-.593 1.095-.948 1.58-1.25.381-.237.927-.448 1.161-.448.145 0 .654.528 1.065 1.104a8.4 8.4 0 0 1 1.343 3.102c.153.728.166 2.286.024 3.012a9.5 9.5 0 0 1-.6 1.893c-.179.393-.624 1.156-.82 1.404-.1.128-.1.127-.043-.148ZM7.335 1.952c-.67-.34-1.704-.705-2.276-.803a4 4 0 0 0-.759-.043c-.471.024-.45 0 .306-.358A7.8 7.8 0 0 1 6.47.128c.8-.169 2.306-.17 3.094-.005.85.18 1.853.552 2.418.9l.168.103-.385-.02c-.766-.038-1.88.27-3.078.853-.361.176-.676.316-.699.312a12 12 0 0 1-.654-.319Z"
            fill="#107C10"
          />
        </svg>
      );

    case 'XBOX 360':
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-xbox360 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Xbox 360 ring of light in lime green */}
          <circle cx="8" cy="8" r="7.2" stroke="#52B043" strokeWidth="1.6" fill="rgba(82,176,67,0.15)" />
          <path
            d="M5.5 12.5C6.5 10.5 7.8 8.5 8 8.5c.2 0 1.5 2 2.5 4M3.2 4.2c2 1.8 3.8 3.8 4.8 4.3M12.8 4.2c-2 1.8-3.8 3.8-4.8 4.3"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'SWITCH':
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-switch ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Neon Red Left Joy-Con */}
          <path
            d="M3.425.053a4.14 4.14 0 0 0-3.28 3.015C0 3.628-.01 3.956.005 8.3c.01 3.99.014 4.082.08 4.39.368 1.66 1.548 2.844 3.224 3.235.22.05.497.06 2.29.07 1.856.012 2.048.009 2.097-.04.05-.05.053-.69.053-7.94 0-5.374-.01-7.906-.033-7.952-.033-.06-.09-.063-2.03-.06-1.578.004-2.052.014-2.26.05Zm3 14.665-1.35-.016c-1.242-.013-1.375-.02-1.623-.083a2.81 2.81 0 0 1-2.08-2.167c-.074-.335-.074-8.579-.004-8.907a2.85 2.85 0 0 1 1.716-2.05c.438-.176.64-.196 2.058-.2l1.282-.003v13.426Z"
            fill="#FF3C28"
          />
          <circle cx="3.8" cy="4.5" r="1.15" fill="#FF3C28" />
          {/* Neon Blue Right Joy-Con */}
          <path
            d="M9.34 8.005c0-4.38.01-7.972.023-7.982C9.373.01 10.036 0 10.831 0c1.153 0 1.51.01 1.743.05 1.73.298 3.045 1.6 3.373 3.326.046.242.053.809.053 4.61 0 4.06.005 4.537-.123 4.976-.022.076-.048.15-.08.242a4.14 4.14 0 0 1-3.426 2.767c-.317.033-2.889.046-2.978.013-.05-.02-.053-.752-.053-7.979m4.675.269a1.62 1.62 0 0 0-1.113-1.034 1.61 1.61 0 0 0-1.938 1.073 1.9 1.9 0 0 0-.014.935 1.63 1.63 0 0 0 1.952 1.107c.51-.136.908-.504 1.11-1.028.11-.285.113-.742.003-1.053"
            fill="#00C3E3"
          />
        </svg>
      );

    case 'SWITCH 2':
      return (
        <svg
          viewBox="0 0 20 16"
          width={size * 1.25}
          height={size}
          fill="none"
          className={`console-logo console-logo-switch2 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Switch icon */}
          <path
            d="M3.425.053a4.14 4.14 0 0 0-3.28 3.015C0 3.628-.01 3.956.005 8.3c.01 3.99.014 4.082.08 4.39.368 1.66 1.548 2.844 3.224 3.235.22.05.497.06 2.29.07 1.856.012 2.048.009 2.097-.04.05-.05.053-.69.053-7.94 0-5.374-.01-7.906-.033-7.952-.033-.06-.09-.063-2.03-.06-1.578.004-2.052.014-2.26.05Zm3 14.665-1.35-.016c-1.242-.013-1.375-.02-1.623-.083a2.81 2.81 0 0 1-2.08-2.167c-.074-.335-.074-8.579-.004-8.907a2.85 2.85 0 0 1 1.716-2.05c.438-.176.64-.196 2.058-.2l1.282-.003v13.426Z"
            fill="#FF3C28"
          />
          <circle cx="3.8" cy="4.5" r="1.15" fill="#FF3C28" />
          <path
            d="M9.34 8.005c0-4.38.01-7.972.023-7.982C9.373.01 10.036 0 10.831 0c1.153 0 1.51.01 1.743.05 1.73.298 3.045 1.6 3.373 3.326.046.242.053.809.053 4.61 0 4.06.005 4.537-.123 4.976-.022.076-.048.15-.08.242a4.14 4.14 0 0 1-3.426 2.767c-.317.033-2.889.046-2.978.013-.05-.02-.053-.752-.053-7.979m4.675.269a1.62 1.62 0 0 0-1.113-1.034 1.61 1.61 0 0 0-1.938 1.073 1.9 1.9 0 0 0-.014.935 1.63 1.63 0 0 0 1.952 1.107c.51-.136.908-.504 1.11-1.028.11-.285.113-.742.003-1.053"
            fill="#00C3E3"
          />
          {/* Distinctive '2' badge in gold */}
          <text
            x="15.5"
            y="14.5"
            fontFamily="var(--mono), monospace"
            fontWeight="900"
            fontSize="8"
            fill="#FBBF24"
          >
            2
          </text>
        </svg>
      );

    case 'PC':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-pc ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Steam mark in neon cyan */}
          <path
            d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"
            fill="#22D3EE"
          />
        </svg>
      );

    case 'GAMECUBE':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-gamecube ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* GameCube iconic 3D isometric G/C logo in signature indigo */}
          {/* Outer G loop */}
          <path
            d="M12 2.2L20.8 7.3v10.2L12 22.6l-8.8-5.1V7.3L12 2.2z"
            fill="none"
            stroke="#6A5ACD"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Inner cube forming C */}
          <path
            d="M12 6.8l5.2 3v4.4l-5.2 3-5.2-3V9.8l5.2-3z"
            fill="#582F87"
            stroke="#6A5ACD"
            strokeWidth="1.2"
          />
          {/* Distinctive central cross line connecting to form G & C */}
          <path
            d="M12 11.2v6M6.8 9.8l5.2 3 5.2-3"
            stroke="#1E1435"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* GameCube opening on the right forming the G hook */}
          <line x1="17.2" y1="12.8" x2="20.8" y2="10.7" stroke="#6A5ACD" strokeWidth="2.2" />
        </svg>
      );

    case 'SNES':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-snes ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Super Nintendo 4-color diamond button emblem */}
          {/* Top-left: Yellow */}
          <circle cx="8" cy="7" r="3.6" fill="#FDB813" />
          {/* Top-right: Green */}
          <circle cx="16" cy="7" r="3.6" fill="#00A651" />
          {/* Bottom-right: Red */}
          <circle cx="16" cy="17" r="3.6" fill="#E60012" />
          {/* Bottom-left: Blue */}
          <circle cx="8" cy="17" r="3.6" fill="#008CD6" />
          {/* Connecting swoosh curves */}
          <path
            d="M8 10.6v2.8M16 10.6v2.8M11.6 7h0.8M11.6 17h0.8"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'MEGADRIVE':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-megadrive ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Sega signature striated logo + 16-BIT banner */}
          <path
            d="M21.229 4.14l-.006 3.33h-10.6c-.219 0-.397.181-.397.399 0 .221.18.399.397.399l2.76-.016c4.346 0 7.868 3.525 7.868 7.869 0 4.348-3.522 7.869-7.869 7.869L2.748 24l.005-3.375h10.635c2.487 0 4.504-2.016 4.504-4.504 0-2.49-2.017-4.506-4.506-4.506l-2.771-.03c-2.06 0-3.727-1.666-3.727-3.72 0-2.061 1.666-3.726 3.723-3.726h10.618zM2.763 19.843l-.004-3.331h10.609c.21 0 .383-.175.383-.387 0-.213-.173-.385-.384-.385h-2.744c-4.345 0-7.867-3.525-7.867-7.871S6.278 0 10.623 0l10.6.003.006 3.35-10.604.003c-2.49 0-4.5 2.019-4.5 4.507 0 2.489 2.024 4.504 4.515 4.504l2.775.03c2.055 0 3.72 1.668 3.72 3.724 0 2.055-1.665 3.719-3.72 3.719H2.765l-.002.003z"
            fill="#0089CF"
          />
        </svg>
      );

    case 'N64':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-n64 ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Nintendo 64 3D 'N' in official 4 colors */}
          {/* Left vertical pillar (Red) */}
          <polygon points="4,7 8,5 8,19 4,21" fill="#E60012" />
          <polygon points="8,5 12,7 12,21 8,19" fill="#B3000E" />
          {/* Diagonal bar (Green) */}
          <polygon points="8,7 16,16 16,19 8,10" fill="#00A651" />
          {/* Right vertical pillar (Blue) */}
          <polygon points="12,5 16,3 16,17 12,19" fill="#008CD6" />
          <polygon points="16,3 20,5 20,19 16,17" fill="#0067A3" />
          {/* Top faces (Yellow) */}
          <polygon points="4,7 8,5 12,7 8,9" fill="#FDB813" />
          <polygon points="12,5 16,3 20,5 16,7" fill="#FDB813" />
        </svg>
      );

    case 'DREAMCAST':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-dreamcast ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Sega Dreamcast iconic spiral in orange */}
          <path
            d="M12 4.5c4.14 0 7.5 3.36 7.5 7.5 0 3.1-1.89 5.76-4.6 6.88-2.6 1.07-5.59.34-7.4-1.8-1.7-2-1.9-4.87-.5-7.07 1.3-2.03 3.6-3.1 6-.27 2.2 2.6 1.1 5.6-1.5 5.76-1.8.1-3.2-1.2-3.1-2.9.1-1.4 1.2-2.3 2.5-2.1.9.1 1.5.8 1.4 1.6"
            fill="none"
            stroke="#FF6600"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'GBA':
      return (
        <svg
          viewBox="0 0 24 16"
          width={size * 1.5}
          height={size}
          fill="none"
          className={`console-logo console-logo-gba ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Game Boy Advance indigo silhouette */}
          {/* Body */}
          <rect x="1" y="2" width="22" height="12" rx="4" fill="#4B369D" stroke="#6D55BE" strokeWidth="1" />
          {/* Screen */}
          <rect x="7" y="4" width="10" height="8" rx="1" fill="#1A202C" stroke="#718096" strokeWidth="0.6" />
          <rect x="8" y="5" width="8" height="6" fill="#8FA89B" />
          {/* D-Pad on left */}
          <path d="M4 6.5h2v3H4zM3 7.5h4v1H3z" fill="#E2E8F0" />
          {/* A/B buttons on right */}
          <circle cx="19" cy="8.5" r="1" fill="#A0AEC0" />
          <circle cx="20.5" cy="7" r="1" fill="#A0AEC0" />
        </svg>
      );

    case 'NES':
      return (
        <svg
          viewBox="0 0 24 15"
          width={size * 1.6}
          height={size}
          fill="none"
          className={`console-logo console-logo-nes ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          {/* Classic 8-bit NES Controller */}
          <rect x="1" y="1" width="22" height="13" rx="1.5" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.8" />
          {/* Black horizontal center stripe */}
          <rect x="2" y="4" width="20" height="7" fill="#1E293B" />
          {/* Cross D-Pad */}
          <path d="M5.5 5.5h1.6v4H5.5zM4.3 6.7h4v1.6h-4z" fill="#0F172A" stroke="#475569" strokeWidth="0.3" />
          {/* Select & Start */}
          <rect x="10" y="8" width="1.6" height="0.8" rx="0.3" fill="#EF4444" />
          <rect x="12.5" y="8" width="1.6" height="0.8" rx="0.3" fill="#EF4444" />
          {/* B & A buttons in red */}
          <circle cx="16.5" cy="7.5" r="1.4" fill="#EF4444" />
          <circle cx="19.8" cy="7.5" r="1.4" fill="#EF4444" />
        </svg>
      );

    default:
      // Generic gamepad controller fallback
      return (
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          fill="none"
          className={`console-logo console-logo-default ${className}`.trim()}
          style={baseStyle}
          aria-hidden="true"
        >
          <path
            d="M11.5 6.027a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m-1.5 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m-1.5 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M4.5 7h-.5v.5a.5.5 0 0 1-1 0V7H2.5a.5.5 0 0 1 0-1H3V5.5a.5.5 0 0 1 1 0V6h.5a.5.5 0 0 1 0 1"
            fill="currentColor"
          />
          <path
            d="M3.051 3.26a.5.5 0 0 1 .354-.613l1.932-.518a.5.5 0 0 1 .62.39c.655 3.51 2.125 4.75 2.043 4.75s1.388-1.24 2.043-4.75a.5.5 0 0 1 .62-.39l1.932.518a.5.5 0 0 1 .354.613c-.225 1.05-.623 2.502-1.127 3.99A17 17 0 0 1 15 10.5a1.5 1.5 0 0 1-1.097 1.442l-1.612.449a1.5 1.5 0 0 1-1.61-1.042l-.248-.82a6 6 0 0 0-1.866 0l-.248.82a1.5 1.5 0 0 1-1.61 1.042l-1.612-.45A1.5 1.5 0 0 1 1 10.5c0-.85.39-1.674.808-2.247.504-1.488.902-2.94 1.127-3.993"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </svg>
      );
  }
}

export default ConsoleLogo;
