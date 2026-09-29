import React from 'react';

const MAPS = [
  { id: 'desert', number: '01', name: 'Dunes de l’Écho', mood: 'Mystique & solaire', detail: 'Désert · funk', sky: '#624575', sun: '#ffd57f', land: '#c99268' },
  { id: 'western', number: '02', name: 'Dust Creek', mood: 'Au cœur du Far West', detail: 'Ville · cowboy', sky: '#c78768', sun: '#ffdf9a', land: '#a57650' },
  { id: 'prairie', number: '03', name: 'Plaines d’Or', mood: 'La grande échappée', detail: 'Golden hour · épique', sky: '#b97553', sun: '#ffad48', land: '#b5a550' },
  { id: 'sardinia', number: '04', name: 'Costa Omertà', mood: 'Le clan veille sur la baie', detail: 'Village côtier · mandoline', sky: '#6b4a42', sun: '#f3b56a', land: '#c9895a' },
];

function Landscape({ map }) {
  return <svg className="mirage-map-art" viewBox="0 0 240 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="240" height="110" fill={map.sky} />
    <circle cx={map.id === 'prairie' ? 120 : 165} cy="43" r={map.id === 'prairie' ? 28 : 19} fill={map.sun} />
    {map.id === 'desert' && <><path d="M0 70 42 36 85 72 128 47 195 76 240 54V110H0Z" fill="#8b6684" /><path d="M0 87Q55 48 120 84T240 79V110H0Z" fill={map.land} /></>}
    {map.id === 'western' && <><path d="M0 81V29H43V21H68V81M177 81V32H211V25H240V81" fill="#624236" /><path d="M4 39H65V46H4M179 42H240V49H179" stroke="#e5bd81" strokeWidth="5" /><path d="M17 54H29V68H17M41 54H53V68H41M190 58H201V73H190M216 58H229V73H216" fill="#e4b77c" /><path d="M0 81H240V110H0Z" fill={map.land} /></>}
    {map.id === 'prairie' && <>
      {/* Sol labouré avec sillons */}
      <path d="M0 54Q60 47 120 55T240 54V110H0Z" fill={map.land} />
      <path d="M0 58Q60 51 120 59T240 58" fill="none" stroke="#9e8a3e" strokeWidth="0.7" opacity=".5" />
      <path d="M0 62Q60 55 120 63T240 62" fill="none" stroke="#9e8a3e" strokeWidth="0.7" opacity=".45" />
      <path d="M0 66Q60 59 120 67T240 66" fill="none" stroke="#9e8a3e" strokeWidth="0.6" opacity=".4" />
      {/* Champs de blé denses */}
      <path d="M0 77Q60 62 108 81M135 78Q185 65 240 72" fill="none" stroke="#dac071" strokeWidth="11" opacity=".95" />
      <path d="M0 84Q55 70 110 86T240 84" fill="none" stroke="#e0b649" strokeWidth="6" opacity=".7" />
      <path d="M0 92Q60 78 120 94T240 92" fill="none" stroke="#c9a13d" strokeWidth="4" opacity=".5" />
      {/* Épis détaillés */}
      {[8, 15, 22, 30, 38, 46, 53, 61, 68, 76, 84, 92, 102, 110, 118, 128, 136, 145, 154, 163, 172, 181, 190, 198, 207, 216, 225, 232].map(x => (
        <g key={x}>
          <path d={`M${x} 102v-22m0 8-4-6m4 2 4-6m-4 6v-6`} stroke={x % 3 === 0 ? "#f4d58a" : x % 3 === 1 ? "#e8c36a" : "#f7df9a"} strokeWidth={x % 5 === 0 ? "2.2" : "1.6"} fill="none" opacity={0.85 + (x % 4) * 0.05} />
          <circle cx={x} cy={78 + (x % 7)} r="1.2" fill="#f0cc72" opacity=".9" />
        </g>
      ))}
      {/* Fleurs sauvages : coquelicots, bleuets, marguerites */}
      <circle cx="28" cy="88" r="1.6" fill="#d93a2b" />
      <circle cx="72" cy="90" r="1.3" fill="#4a7de8" />
      <circle cx="105" cy="86" r="1.2" fill="#faf6f0" stroke="#f2d94e" strokeWidth="0.6" />
      <circle cx="168" cy="89" r="1.5" fill="#d93a2b" />
      <circle cx="195" cy="87" r="1.2" fill="#4a7de8" />
      <circle cx="222" cy="90" r="1.3" fill="#f2d94e" />
      {/* Clôture côté piste */}
      <g opacity=".85">
        <path d="M0 100H68M72 100H120M132 100H188M192 100H240" stroke="#6b4a32" strokeWidth="1.2" />
        <path d="M0 104H68M72 104H120M132 104H188M192 104H240" stroke="#6b4a32" strokeWidth="1" />
        {[0, 22, 44, 68, 96, 120, 148, 172, 192, 215, 240].map(x => <rect key={x} x={x-1} y="97" width="2" height="10" fill="#6b4a32" />)}
      </g>
      {/* Animaux de ferme stylisés */}
      {/* Vache */}
      <g transform="translate(38 72)">
        <rect x="-6" y="-3" width="12" height="6" rx="1.5" fill="#f5f1e8" stroke="#2b2b2b" strokeWidth="0.3" />
        <rect x="-4" y="-2" width="4" height="3" fill="#2b2b2b" />
        <rect x="4" y="-5" width="5" height="4" rx="1" fill="#f5f1e8" stroke="#2b2b2b" strokeWidth="0.3" />
        <rect x="6" y="-6" width="1" height="1.5" fill="#e8dcc0" /><rect x="8" y="-6" width="1" height="1.5" fill="#e8dcc0" />
      </g>
      {/* Moutons */}
      <g transform="translate(92 70)">
        <circle cx="0" cy="0" r="4.5" fill="#faf6f0" stroke="#e8e0d0" strokeWidth="0.4" />
        <circle cx="-2" cy="-0.5" r="3" fill="#faf6f0" />
        <circle cx="2" cy="0.5" r="2.8" fill="#faf6f0" />
        <rect x="-1.5" y="-4" width="3" height="3" rx="1" fill="#2e2e2e" />
      </g>
      <g transform="translate(104 73)">
        <circle cx="0" cy="0" r="3.8" fill="#faf6f0" stroke="#e8e0d0" strokeWidth="0.4" />
        <rect x="-1.2" y="-3.2" width="2.4" height="2.4" rx="0.8" fill="#2e2e2e" />
      </g>
      {/* Cochons */}
      <g transform="translate(185 74)">
        <ellipse cx="0" cy="0" rx="5" ry="3" fill="#e8a0a0" />
        <ellipse cx="3.5" cy="-0.5" rx="2.2" ry="1.8" fill="#e8a0a0" />
        <rect x="4.5" y="-0.8" width="1.5" height="1" rx="0.4" fill="#c97a7a" />
      </g>
      {/* Poules */}
      <g transform="translate(168 78)">
        <ellipse cx="0" cy="0" rx="2" ry="1.6" fill="#f5f1e8" />
        <circle cx="1.2" cy="-0.8" r="1" fill="#f5f1e8" />
        <path d="M1.8 -0.8h1.2l-0.6 0.6z" fill="#f5c542" />
        <rect x="0.8" y="-1.8" width="0.8" height="0.8" fill="#d93a2b" />
      </g>
      <g transform="translate(208 79)">
        <ellipse cx="0" cy="0" rx="1.8" ry="1.4" fill="#c96a3a" />
        <circle cx="1" cy="-0.6" r="0.9" fill="#c96a3a" />
        <path d="M1.5 -0.6h1l-0.5 0.5z" fill="#f5c542" />
      </g>
      {/* Épouvantail */}
      <g transform="translate(125 68)">
        <rect x="-0.4" y="0" width="0.8" height="12" fill="#6b4a32" />
        <rect x="-5" y="2" width="10" height="0.8" fill="#6b4a32" />
        <rect x="-2" y="2" width="4" height="3.5" fill="#4a7ab5" />
        <circle cx="0" cy="1" r="1.8" fill="#f0cc72" stroke="#8a5a3a" strokeWidth="0.3" />
        <path d="M-2.5 -1.2h5l-1 1.5h-3z" fill="#3a2a1e" />
      </g>
    </>}
    {map.id === 'sardinia' && <><path d="M0 76Q60 68 120 76T240 72V110H0Z" fill="#3f7f92" opacity=".55" /><path d="M0 88H30V66H16V58H30V66H46V88M96 88V62H112V54H128V62H144V88M186 88V60H204V52H220V60H236V88" fill="#7a4632" /><path d="M8 88H22V100H8M104 88H120V100H104M194 88H210V100H194" fill="#c9895a" />{[20, 216].map(x => <path key={x} d={`M${x} 88V64Q${x + 3} 52 ${x + 6} 64V88`} fill="#2c4a34" />)}<path d="M0 88H240V110H0Z" fill={map.land} /></>}
    <path d="M109 72H130L168 110H73Z" fill="#f9deb1" opacity=".5" />
    {map.id === 'desert' && <path d="M26 103V75m0 16H17V82m9 3H35V74" stroke="#355f55" strokeWidth="5" fill="none" />}
  </svg>;
}

export default function MirageCoursePicker({ selectedMode, setSelectedMode, stage, setSelectedStage, challenge, modeChosen = true }) {
  const locked = selectedMode === 'duel' && Boolean(challenge);
  return <div className="mirage-course-picker">
    <div className="mirage-picker-label"><span>01 / TON DÉFI</span><span>À TOI DE JOUER</span></div>
    <div className="mirage-mode-picker" role="group" aria-label="Mode de jeu">
      {[
        { id: 'online', name: 'EN LIGNE', icon: '♞', tagline: 'Retrouve tes amis', info: 'Salon · 2 à 4 cavaliers' },
        { id: 'rush', name: 'RUÉE', icon: '↯', tagline: 'Bats ton record', info: '60 secondes · 3 vies' },
        { id: 'duel', name: 'DUEL', icon: '⚔', tagline: challenge ? `Défi de ${challenge.name}` : 'Devance ton rival', info: challenge ? 'Course fantôme · 600 m' : 'Face au PNJ · 600 m' },
      ].map(mode => <button type="button" key={mode.id} aria-pressed={modeChosen && selectedMode === mode.id} onClick={() => setSelectedMode(mode.id)}>
        <span className="mirage-mode-symbol" aria-hidden="true">{mode.icon}</span>
        <span className="mirage-mode-copy"><strong>{mode.name}</strong><span>{mode.tagline}</span><small>{mode.info}</small></span>
        <span className="mirage-choice-dot" aria-hidden="true">{modeChosen && selectedMode === mode.id ? '✓' : ''}</span>
      </button>)}
    </div>
    <div className="mirage-picker-label"><span>02 / TON TERRAIN</span><span>{!modeChosen ? 'DÉBLOQUÉ APRÈS LE MODE' : locked ? 'VERROUILLÉ PAR LE DÉFI' : '3 HORIZONS À EXPLORER'}</span></div>
    {!modeChosen ? (
      <div className="mirage-stage-locked" role="note">
        <span className="mirage-stage-locked-icon" aria-hidden="true">🔒</span>
        <p>Le terrain se choisit <strong>après</strong> le mode : sélectionne d’abord <strong>RUÉE</strong> ou <strong>DUEL</strong>, puis ta map.</p>
      </div>
    ) : (
      <div className="mirage-stage-picker" role="group" aria-label="Choisir le stage">
        {MAPS.map(map => <button type="button" key={map.id} className={`mirage-map-card is-${map.id}`} aria-pressed={stage === map.id} disabled={locked} onClick={() => setSelectedStage(map.id)}>
          <Landscape map={map} />
          <span className="mirage-map-number" aria-hidden="true">{map.number}</span>
          <span className="mirage-map-check" aria-hidden="true">{stage === map.id ? '✓' : '↗'}</span>
          <span className="mirage-map-copy"><strong>{map.name}</strong><span>{map.mood}</span><small>{map.detail}</small></span>
          <span className="mirage-map-selected">{stage === map.id ? 'SÉLECTIONNÉ' : 'EXPLORER'}</span>
        </button>)}
      </div>
    )}
  </div>;
}
