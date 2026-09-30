import React from 'react';
import { DUEL_DISTANCE } from './mirageRules';

const MAPS = [
  { id: 'desert', number: '01', name: 'Dunes de l’Écho', mood: 'Mystique & solaire', detail: 'Désert · funk', sky: '#624575', sun: '#ffd57f', land: '#c99268' },
  { id: 'western', number: '02', name: 'Dust Creek', mood: 'Au cœur du Far West', detail: 'Ville · cowboy', sky: '#c78768', sun: '#ffdf9a', land: '#a57650' },
  { id: 'prairie', number: '03', name: 'Plaines d’Or', mood: 'La grande échappée', detail: 'Golden hour · épique', sky: '#b97553', sun: '#ffad48', land: '#b5a550' },
  { id: 'sardinia', number: '04', name: 'Costa Omertà', mood: 'Un été sur la baie', detail: 'Terrasses · soleil · mandoline', sky: '#4da9dc', sun: '#ffebaa', land: '#c9895a' },
  { id: 'alger', number: '05', name: 'Alger la Blanche', mood: 'La ville blanche face à la baie', detail: 'Alger-Centre · chaâbi oriental', sky: '#7fb2d8', sun: '#ffd28a', land: '#e8e2d2' },
  { id: 'japan', number: '06', name: 'Plaines de Yōtei', mood: 'Sous la lune du Mont Fuji', detail: 'Nuit · shamisen & taiko', sky: '#111a30', sun: '#eef4ff', land: '#1c2936' },
];

function Landscape({ map }) {
  return <svg className="mirage-map-art" viewBox="0 0 240 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="240" height="110" fill={map.sky} />
    {map.id !== 'desert' && <circle cx={map.id === 'prairie' || map.id === 'alger' || map.id === 'japan' ? 120 : 165} cy={map.id === 'japan' ? 28 : map.id === 'sardinia' ? 29 : 43} r={map.id === 'prairie' ? 28 : map.id === 'japan' ? 21 : 19} fill={map.sun} />}
    {map.id === 'desert' && <>
      <defs>
        <linearGradient id="mirage-desert-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b4a7c" />
          <stop offset=".55" stopColor="#e2877a" />
          <stop offset="1" stopColor="#f7c99c" />
        </linearGradient>
        <linearGradient id="mirage-desert-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a4f3e8" />
          <stop offset=".6" stopColor="#35b2bf" />
          <stop offset="1" stopColor="#2a8fae" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="mirage-desert-road" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="0" y2="96">
          <stop offset="0" stopColor="#f2cc98" stopOpacity="0" />
          <stop offset="1" stopColor="#f2cc98" stopOpacity=".9" />
        </linearGradient>
      </defs>
      {/* Ciel rose, soleil bas qui se dissout dans la brume */}
      <rect width="240" height="64" fill="url(#mirage-desert-sky)" />
      <circle cx="120" cy="50" r="36" fill="#ffd9a0" opacity=".28" />
      <circle cx="120" cy="50" r="21" fill="#ffad55" />
      <rect y="56" width="240" height="8" fill="#f8cfa6" opacity=".6" />
      {/* Le mirage : palais à dômes, minarets et palmiers posés sur un lac */}
      <g fill="#a3558f">
        <path d="M91 62V56H149V62ZM108 56V51H132V56Z" />
        <path d="M107 51Q108 40 120 37Q132 40 133 51Z" />
        <path d="M94 56Q95 50 101 49Q107 50 108 56ZM132 56Q133 50 139 49Q145 50 146 56Z" />
        <g fill="#8c4a86">
          <path d="M85 62V40H89V62ZM151 62V40H155V62Z" />
          <path d="M84.4 40 87 34 89.6 40ZM150.4 40 153 34 155.6 40Z" />
        </g>
      </g>
      <path d="M120 37V32" stroke="#a3558f" strokeWidth="1.2" />
      <path d="M100 59.5V57M108 59.5V57M120 59.5V57M132 59.5V57M140 59.5V57" stroke="#ffe0a0" strokeWidth="1.6" />
      <g stroke="#14555b" strokeLinecap="round" fill="none">
        <path d="M64 62Q62 54 66 47M76 62Q76 56 73 50M164 62Q166 55 162 49M178 62Q177 54 181 46" strokeWidth="1.5" />
        <path d="M66 47Q58 43 52 48M66 47Q61 40 56 40M66 47Q71 40 76 42M66 47Q73 45 79 50M73 50Q67 47 63 52M73 50Q78 45 83 47M162 49Q156 45 151 50M162 49Q166 42 171 43M162 49Q168 47 173 52M181 46Q174 42 169 47M181 46Q186 39 191 41M181 46Q188 44 193 49" strokeWidth="1.7" />
      </g>
      <rect y="64" width="240" height="46" fill="#e5a773" />
      <rect x="48" y="62" width="144" height="22" fill="url(#mirage-desert-lake)" />
      <path d="M74 66H104M126 68H158M88 72H114M130 75H150M96 79H110" stroke="#eafffb" strokeWidth="1" opacity=".75" strokeLinecap="round" />
      {/* Les dunes encadrent la vallée : faces à l’ombre mauves, crêtes dorées par le contre-jour */}
      <path d="M0 46Q36 47 68 66Q88 77 100 110H0Z" fill="#9a5783" />
      <path d="M240 42Q206 45 176 65Q156 77 144 110H240Z" fill="#a25c86" />
      <path d="M0 46Q36 47 68 66Q88 77 100 110M240 42Q206 45 176 65Q156 77 144 110" stroke="#ffc678" strokeWidth="1.6" fill="none" />
      <path d="M0 76Q30 78 54 94Q64 101 70 110H0Z" fill={map.land} />
      <path d="M240 74Q212 76 190 92Q180 100 174 110H240Z" fill={map.land} />
      <path d="M0 76Q30 78 54 94Q64 101 70 110M240 74Q212 76 190 92Q180 100 174 110" stroke="#ffe0a1" strokeWidth="1.2" fill="none" opacity=".8" />
      {/* La piste file droit vers le lac */}
      <path d="M113 64H127L176 110H64Z" fill="url(#mirage-desert-road)" />
      <path d="M120 64V110" stroke="#c98f63" strokeWidth=".8" opacity=".55" />
      <path d="M206 85V61M206 77H199V68M206 72H213V63" stroke="#2f6b55" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>}
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
    {map.id === 'sardinia' && <><path d="M0 76Q60 68 120 76T240 72V110H0Z" fill="#3f7f92" opacity=".55" /><path d="M0 88H30V66H16V58H30V66H46V88M96 88V62H112V54H128V62H144V88M186 88V60H204V52H220V60H236V88" fill="#7a4632" /><path d="M8 88H22V100H8M104 88H120V100H104M194 88H210V100H194" fill="#c9895a" />{[20, 216].map(x => <path key={x} d={`M${x} 88V64Q${x + 3} 52 ${x + 6} 64V88`} fill="#2c4a34" />)}<path d="M0 88H240V110H0Z" fill={map.land} />
      {/* Parasols et vacanciers sur les terrasses à gauche. */}
      {[35, 68].map((x, i) => <g key={x}>
        <path d={`M${x} 67v22`} stroke="#57493c" strokeWidth="1.4" />
        <path d={`M${x - 15} 71Q${x} ${i ? 55 : 53} ${x + 15} 71Z`} fill={i ? '#f9edcf' : '#e58361'} />
        <path d={`M${x} 61Q${x + 7} 63 ${x + 15} 71H${x}Z`} fill={i ? '#61b2bb' : '#f9edcf'} />
        <path d={`M${x - 6} 83v6m12-6v6`} stroke="#6b5543" strokeWidth="1.3" />
        <ellipse cx={x} cy="82" rx="7" ry="1.7" fill="#f8e9ce" />
        {[-9, 9].map(dx => <g key={dx}>
          <circle cx={x + dx} cy="79" r="2.3" fill="#d9a378" />
          <path d={`M${x + dx - 2} 82h4v6h-4z`} fill={dx < 0 ? '#4c9ca5' : '#e8c05c'} />
        </g>)}
      </g>)}
    </>}
    {map.id === 'alger' && <>
      {/* La baie bleue au loin, visible entre les deux rangées d'immeubles */}
      <rect x="52" y="56" width="136" height="11" fill="#1d6a9c" />
      <rect x="52" y="63" width="136" height="4" fill="#3d8db8" />
      <rect x="52" y="53.5" width="136" height="3" fill="#8fc3de" />
      {/* Ville blanche en cascade sur la colline, à gauche */}
      <rect x="0" y="34" width="30" height="54" fill="#f4f0e6" />
      <rect x="26" y="26" width="24" height="62" fill="#eae4d4" />
      <rect x="46" y="42" width="16" height="46" fill="#f1ecdf" />
      <rect x="58" y="36" width="12" height="52" fill="#e6dfcd" />
      {/* Immeubles haussmanniens blancs, côté droit */}
      <rect x="170" y="38" width="18" height="50" fill="#f1ecdf" />
      <rect x="184" y="30" width="26" height="58" fill="#f4f0e6" />
      <rect x="206" y="24" width="34" height="64" fill="#ece5d4" />
      {/* Toitures d'ardoise */}
      <path d="M0 34 15 23 30 34M26 26 38 16 50 26M46 42 54 34 62 42M170 38 179 30 188 38M184 30 197 20 210 30M206 24 223 13 240 24" fill="#5a6570" />
      {/* Fenêtres, balcons et devantures */}
      {[4, 12, 20, 30, 38, 46, 52, 64, 176, 188, 196, 212, 222, 232].map((x, i) => (
        <g key={`${map.id}-w-${x}`}>
          <rect x={x} y={i % 3 === 0 ? 42 : 46} width="5" height="8" fill="#2e3d46" />
          <rect x={x} y={i % 3 === 0 ? 56 : 60} width="5" height="8" fill="#2e3d46" />
          <rect x={x - 0.8} y={i % 3 === 0 ? 50.5 : 54.5} width="6.6" height="1.2" fill="#2c2c30" />
        </g>
      ))}
      <rect x="6" y="76" width="20" height="12" fill="#1d3a2f" />
      <rect x="188" y="76" width="18" height="12" fill="#1d3a2f" />
      <path d="M0 88H240V110H0Z" fill={map.land} />
    </>}
    {map.id === 'japan' && <>
      {/* Étoiles nocturnes */}
      {[18, 42, 67, 174, 198, 224].map((sx, i) => (
        <circle key={sx} cx={sx} cy={12 + (i % 3) * 8} r={i % 2 === 0 ? '1.1' : '0.8'} fill="#dce8ff" opacity=".85" />
      ))}
      {/* Silhouette du Mont Fuji / Mont Yōtei et sommet enneigé */}
      <path d="M18 78Q82 66 106 30H134Q158 66 222 78Z" fill="#202d48" />
      <path d="M106 30H134L145 48L136 44L129 51L120 43L111 51L104 44L95 48Z" fill="#eef4ff" />
      {/* Brume nocturne au pied du Mont Fuji */}
      <rect x="0" y="70" width="240" height="8" fill="#6884b8" opacity=".28" />
      {/* Plaines sombres de Yōtei */}
      <path d="M0 76Q60 72 120 76T240 75V110H0Z" fill={map.land} />
      {/* Torii vermillon sur le côté */}
      <g fill="#c93228">
        <rect x="24" y="54" width="3" height="28" />
        <rect x="43" y="54" width="3" height="28" />
        <path d="M18 52Q35 49 52 52V56H18Z" />
        <rect x="21" y="60" width="28" height="2.4" />
      </g>
      {/* Hautes herbes d’argent (susuki) au clair de lune */}
      {[10, 20, 56, 68, 82, 158, 172, 186, 202, 216, 228].map(x => (
        <path key={x} d={`M${x} 106Q${x + 3} 88 ${x + 6} 79`} stroke="#dce6f7" strokeWidth="1.5" fill="none" opacity=".78" />
      ))}
    </>}
    {map.id !== 'desert' && <path d="M109 72H130L168 110H73Z" fill={map.id === 'japan' ? '#4a5d80' : '#f9deb1'} opacity=".5" />}
  </svg>;
}

/** Sélecteur de terrain : les cartes illustrées de Mirage Rush. */
export function MirageStagePicker({ stage, setSelectedStage, locked = false, modeChosen = true }) {
  return <>
    <div className="mirage-picker-label"><span>02 / TON TERRAIN</span><span>{!modeChosen ? 'DÉBLOQUÉ APRÈS LE MODE' : locked ? 'VERROUILLÉ PAR LE DÉFI' : `${MAPS.length} HORIZONS À EXPLORER`}</span></div>
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
  </>;
}

export default function MirageCoursePicker({ selectedMode, setSelectedMode, stage, setSelectedStage, challenge, modeChosen = true }) {
  const locked = selectedMode === 'duel' && Boolean(challenge);
  return <div className="mirage-course-picker">
    <div className="mirage-picker-label"><span>01 / TON DÉFI</span><span>À TOI DE JOUER</span></div>
    <div className="mirage-mode-picker" role="group" aria-label="Mode de jeu">
      {[
        { id: 'online', name: 'EN LIGNE', icon: '♞', tagline: 'Retrouve tes amis', info: 'Salon · 2 à 4 cavaliers' },
        { id: 'rush', name: 'RUÉE', icon: '↯', tagline: 'Bats ton record', info: '60 secondes · 3 vies' },
        { id: 'duel', name: 'DUEL', icon: '⚔', tagline: challenge ? `Défi de ${challenge.name}` : 'Course à 4 cavaliers', info: challenge ? `Fantôme + 2 PNJ · ${DUEL_DISTANCE} m` : `Face à 3 PNJ · ${DUEL_DISTANCE} m` },
      ].map(mode => <button type="button" key={mode.id} aria-pressed={modeChosen && selectedMode === mode.id} onClick={() => setSelectedMode(mode.id)}>
        <span className="mirage-mode-symbol" aria-hidden="true">{mode.icon}</span>
        <span className="mirage-mode-copy"><strong>{mode.name}</strong><span>{mode.tagline}</span><small>{mode.info}</small></span>
        <span className="mirage-choice-dot" aria-hidden="true">{modeChosen && selectedMode === mode.id ? '✓' : ''}</span>
      </button>)}
    </div>
    <MirageStagePicker stage={stage} setSelectedStage={setSelectedStage} locked={locked} modeChosen={modeChosen} />
  </div>;
}
