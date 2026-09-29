import React from 'react';

const MAPS = [
  { id: 'desert', number: '01', name: 'Dunes de l’Écho', mood: 'Mystique & solaire', detail: 'Désert · funk', sky: '#624575', sun: '#ffd57f', land: '#c99268' },
  { id: 'western', number: '02', name: 'Dust Creek', mood: 'Au cœur du Far West', detail: 'Ville · cowboy', sky: '#c78768', sun: '#ffdf9a', land: '#a57650' },
  { id: 'prairie', number: '03', name: 'Plaines d’Or', mood: 'La grande échappée', detail: 'Golden hour · épique', sky: '#b97553', sun: '#ffad48', land: '#b5a550' },
];

function Landscape({ map }) {
  return <svg className="mirage-map-art" viewBox="0 0 240 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="240" height="110" fill={map.sky} />
    <circle cx={map.id === 'prairie' ? 120 : 165} cy="43" r={map.id === 'prairie' ? 28 : 19} fill={map.sun} />
    {map.id === 'desert' && <><path d="M0 70 42 36 85 72 128 47 195 76 240 54V110H0Z" fill="#8b6684" /><path d="M0 87Q55 48 120 84T240 79V110H0Z" fill={map.land} /></>}
    {map.id === 'western' && <><path d="M0 81V29H43V21H68V81M177 81V32H211V25H240V81" fill="#624236" /><path d="M4 39H65V46H4M179 42H240V49H179" stroke="#e5bd81" strokeWidth="5" /><path d="M17 54H29V68H17M41 54H53V68H41M190 58H201V73H190M216 58H229V73H216" fill="#e4b77c" /><path d="M0 81H240V110H0Z" fill={map.land} /></>}
    {map.id === 'prairie' && <><path d="M0 54Q60 47 120 55T240 54V110H0Z" fill={map.land} /><path d="M0 77Q60 62 108 81M135 78Q185 65 240 72" fill="none" stroke="#dac071" strokeWidth="10" />{[15, 34, 53, 188, 208, 228].map(x => <path key={x} d={`M${x} 102v-22m0 10-5-7m5 2 5-7`} stroke="#f4d58a" strokeWidth="2" fill="none" />)}</>}
    <path d="M109 72H130L168 110H73Z" fill="#f9deb1" opacity=".5" />
    {map.id === 'desert' && <path d="M26 103V75m0 16H17V82m9 3H35V74" stroke="#355f55" strokeWidth="5" fill="none" />}
  </svg>;
}

export default function MirageCoursePicker({ selectedMode, setSelectedMode, stage, setSelectedStage, challenge }) {
  const locked = selectedMode === 'duel' && Boolean(challenge);
  return <div className="mirage-course-picker">
    <div className="mirage-picker-label"><span>01 / TON DÉFI</span><span>À TOI DE JOUER</span></div>
    <div className="mirage-mode-picker" role="group" aria-label="Mode de jeu">
      {[
        { id: 'online', name: 'EN LIGNE', icon: '♞', tagline: 'Retrouve tes amis', info: 'Salon · 2 à 4 cavaliers' },
        { id: 'rush', name: 'RUÉE', icon: '↯', tagline: 'Bats ton record', info: '60 secondes · 3 vies' },
        { id: 'duel', name: 'DUEL', icon: '⚔', tagline: challenge ? `Défi de ${challenge.name}` : 'Devance ton rival', info: challenge ? 'Course fantôme · 600 m' : 'Face au PNJ · 600 m' },
      ].map(mode => <button type="button" key={mode.id} aria-pressed={selectedMode === mode.id} onClick={() => setSelectedMode(mode.id)}>
        <span className="mirage-mode-symbol" aria-hidden="true">{mode.icon}</span>
        <span className="mirage-mode-copy"><strong>{mode.name}</strong><span>{mode.tagline}</span><small>{mode.info}</small></span>
        <span className="mirage-choice-dot" aria-hidden="true">{selectedMode === mode.id ? '✓' : ''}</span>
      </button>)}
    </div>
    <div className="mirage-picker-label"><span>02 / TON TERRAIN</span><span>{locked ? 'VERROUILLÉ PAR LE DÉFI' : '3 HORIZONS À EXPLORER'}</span></div>
    <div className="mirage-stage-picker" role="group" aria-label="Choisir le stage">
      {MAPS.map(map => <button type="button" key={map.id} className={`mirage-map-card is-${map.id}`} aria-pressed={stage === map.id} disabled={locked} onClick={() => setSelectedStage(map.id)}>
        <Landscape map={map} />
        <span className="mirage-map-number" aria-hidden="true">{map.number}</span>
        <span className="mirage-map-check" aria-hidden="true">{stage === map.id ? '✓' : '↗'}</span>
        <span className="mirage-map-copy"><strong>{map.name}</strong><span>{map.mood}</span><small>{map.detail}</small></span>
        <span className="mirage-map-selected">{stage === map.id ? 'SÉLECTIONNÉ' : 'EXPLORER'}</span>
      </button>)}
    </div>
  </div>;
}
