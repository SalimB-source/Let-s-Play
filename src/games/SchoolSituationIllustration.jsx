import React from 'react';
import { schoolChapter } from './drivingSchoolInterface.js';
import { schoolSituationScene } from './schoolSituationArt.js';

function Car({x,y,heading=0,kind='car'}) {
  const player=kind==='player', taxi=kind==='taxi', police=kind==='police';
  return <g transform={`translate(${x} ${y}) rotate(${heading})`} data-art-kind={kind}>
    <rect x="-17" y="-15" width="9" height="5" rx="2" fill="#203432"/><rect x="9" y="-15" width="9" height="5" rx="2" fill="#203432"/>
    <rect x="-17" y="10" width="9" height="5" rx="2" fill="#203432"/><rect x="9" y="10" width="9" height="5" rx="2" fill="#203432"/>
    <rect x="-23" y="-12" width="46" height="24" rx="7" fill={player?'#f5c65f':taxi?'#f0b83f':police?'#edf2f5':kind==='obstacle'?'#a78295':'#9acddd'} stroke="#203b3b" strokeWidth="2"/>
    <path d="M7-9H-6V9H7L11 0Z" fill="#345b66"/><path d="M19-8V-4M19 4V8" stroke="#fff5c4" strokeWidth="3"/>
    {police&&<><rect x="-3" y="-10" width="6" height="20" rx="2" fill="#28baff"/><path d="M-5-18Q0-23 5-18M-10-24Q0-33 10-24" fill="none" stroke="#2874ab" strokeWidth="2"/></>}
    {taxi&&<text x="-11" y="2" fontSize="5" fill="#142c31" fontWeight="900">TAXI</text>}
    {kind!=='obstacle'&&<path d="M28 0H39M35-4L39 0 35 4" fill="none" stroke={player?'#244d43':'#225b7c'} strokeWidth="2"/>}
    {kind==='obstacle'&&<path d="M-8-22H8L0-35Z" fill="#efbb56" stroke="#6c4837" strokeWidth="2"/>}
  </g>;
}
function Sign({kind,x=129,y=162}) {
  return <g transform={`translate(${x} ${y})`} data-art-kind={`sign-${kind}`}>
    <path d="M0 0V30" stroke="#53645c" strokeWidth="3"/>
    {kind==='priority-road'?<path d="M0-18L18 0 0 18-18 0Z" fill="#ffdc3f" stroke="#fff" strokeWidth="4"/>:kind==='narrow-yield'?<><circle r="17" fill="#fff" stroke="#c84b42" strokeWidth="3"/><path d="M-6-11V11L-11 5M-6 11L-1 5" fill="none" stroke="#172f32" strokeWidth="3"/><path d="M7 11V-11L2-5M7-11L12-5" fill="none" stroke="#c84b42" strokeWidth="3"/></>:kind==='stop'?<><path d="M-7-16H7L16-7V7L7 16H-7L-16 7V-7Z" fill="#c84b42" stroke="#fff" strokeWidth="2"/><text y="3" fontSize="8" fontWeight="900" textAnchor="middle" fill="#fff">STOP</text></>:kind==='yield'?<path d="M-16-12H16L0 16Z" fill="#fff6e9" stroke="#c84b42" strokeWidth="4" strokeLinejoin="round"/>:<><path d="M0-18L17 12H-17Z" fill="#fff6e9" stroke="#c84b42" strokeWidth="3" strokeLinejoin="round"/><path d="M-9 6Q0-8 9 6" fill="none" stroke="#263f3a" strokeWidth="3"/></>}
  </g>;
}
function Signal({phase}) {
  return <g transform="translate(134 151)" data-art-kind={`signal-${phase}`}>
    <path d="M0 0V43" stroke="#465e59" strokeWidth="3"/>
    <rect x="-10" y="-23" width="20" height="43" rx="6" fill="#182e31"/>
    {['red','amber','green'].map((light,i)=><circle key={light} cy={-14+i*13} r="4" fill={phase===light?{red:'#f25d52',amber:'#ffce51',green:'#53de8a'}[light]:'#3d4a47'}/>)}
  </g>;
}
function Usager({actor}) {
  if(actor.kind==='cyclist') return <g transform={`translate(${actor.x} ${actor.y})`} data-art-kind="cyclist" stroke="#183f33" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="-9" cy="7" r="6"/><circle cx="12" cy="7" r="6"/><path d="M-9 7L-3-4 5 7H-9M-3-4H7L12 7M7-4L10-8H14M-2-8L-6-8"/><circle cx="0" cy="-22" r="4" fill="#183f33"/><path d="M0-17L-5-8 3-3M-3-12L6-10 10-8M-5-8L-8 0"/><path d="M23 0H35L31-4M35 0L31 4" stroke="#225b7c"/>
  </g>;
  if(actor.kind==='pedestrian') return <g transform={`translate(${actor.x} ${actor.y})`} data-art-kind="pedestrian" stroke="#183f33" strokeWidth="3" strokeLinecap="round" fill="none">
    <circle cy="-13" r="4" fill="#183f33"/><path d="M0-8V3M-7-2L0-5 7-2M0 3L-6 11M0 3L6 11M-15 4V-15M-19-11L-15-15 -11-11"/>
  </g>;
  return <Car {...actor}/>;
}

// Each miniature describes the actual manoeuvre, signs and conflicting road users.
/**
 * La vignette d'une situation : la scène dessinée en SVG par
 * `schoolSituationArt.js` (le modèle, sans React), mise en page pour le hub.
 *
 * Le fichier s'appelle `SchoolSituationIllustration` et non `…Art` : sous
 * Windows, `./SchoolSituationArt` (sans extension) aurait résolu
 * `schoolSituationArt.js` — le modèle, qui n'a pas d'export par défaut — et
 * cassé le build du PC loin des yeux. Deux noms qui ne diffèrent plus par la
 * seule casse, et `npm run check:desktop` le vérifie.
 */
export default function SchoolSituationIllustration({ exercise, className = '' }) {
  const chapter=schoolChapter(exercise), scene=schoolSituationScene(exercise);
  const junction=scene.layout==='junction', roundabout=scene.layout==='roundabout';
  return <svg className={`school-situation-art ${className}`} viewBox="0 0 360 210" role="img" aria-label={`${exercise.title} : ${scene.caption}`} focusable="false" data-situation={exercise.id} data-layout={scene.layout}>
    <rect width="360" height="210" rx="20" fill={chapter.color}/>
    <path d="M0 63H360V150H0Z" fill="#526868"/><path d="M0 59H360M0 154H360" stroke="#f6f3df" strokeWidth="4"/>
    {junction&&<><path d="M138 0H222V210H138Z" fill="#526868"/><path d="M134 0V59M226 0V59M134 154V210M226 154V210" stroke="#f6f3df" strokeWidth="4"/><path d="M180 0V59M180 154V210" stroke="#f5edc9" strokeWidth="2" strokeDasharray="10 10"/></>}
    <path d={junction||roundabout||scene.layout==='narrow'?'M0 106H133M247 106H360':'M0 106H360'} stroke="#f5edc9" strokeWidth="2" strokeDasharray="12 12"/>
    {roundabout&&<g data-art-kind="roundabout" data-circulation={scene.circulation}><path d="M138 0H222V210H138Z" fill="#526868"/><circle cx="180" cy="105" r="66" fill="#526868" stroke="#f6f3df" strokeWidth="3"/><circle cx="180" cy="105" r="31" fill={chapter.color} stroke="#f6f3df" strokeWidth="3"/><path d="M237 116V97L232 103M237 97L242 103M123 94V113L118 107M123 113L128 107" fill="none" stroke="#f6f3df" strokeWidth="3"/></g>}
    {scene.layout==='narrow'&&<g data-art-kind="narrow-passage"><path d="M142 64H246V88H142ZM142 124H246V150H142Z" fill="#9daba3" stroke="#efd46c" strokeWidth="3"/><rect x="257" y="36" width="26" height="30" rx="3" fill="#2874ab" stroke="#fff" strokeWidth="2"/><path d="M274 61V40L270 45M274 40L278 45" fill="none" stroke="#fff" strokeWidth="3"/><path d="M264 40V61L260 56M264 61L268 56" fill="none" stroke="#ef6863" strokeWidth="3"/></g>}
    {scene.layout==='lanes'&&<g data-art-kind="same-direction-lanes" stroke="#f6f3df" strokeWidth="2" fill="none" opacity=".8"><path d="M22 84H42L36 78M42 84L36 90M22 126H42L36 120M42 126L36 132"/></g>}
    {scene.layout==='parking-exit'&&<rect x="52" y="157" width="77" height="39" rx="4" fill="#637b78" stroke="#fff" strokeWidth="2" data-art-kind="exit-bay"/>}
    {scene.layout==='parking-choice'&&<g data-art-kind="parking-choice">
      <rect x="137" y="157" width="74" height="40" fill="none" stroke="#fff" strokeWidth="2"/><rect x="252" y="157" width="74" height="40" fill="none" stroke="#fff" strokeWidth="2"/>
      <g data-art-kind="no-parking"><circle cx="127" cy="177" r="13" fill="#2874ab" stroke="#c84b42" strokeWidth="4"/><path d="M118 187L136 167" stroke="#c84b42" strokeWidth="4"/></g>
      <g data-art-kind="parking-sign"><rect x="330" y="158" width="23" height="30" rx="3" fill="#2874ab" stroke="#fff" strokeWidth="2"/><text x="341" y="181" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">P</text></g>
    </g>}
    {scene.bump&&<g data-art-kind="speed-bump"><rect x="204" y="66" width="18" height="81" rx="4" fill="#344f4d"/>{[78,101,124].map(y=><path key={y} d={`M207 ${y}L219 ${y+6} 207 ${y+12}`} fill="none" stroke="#f1c968" strokeWidth="4"/>)}</g>}
    {scene.zebra&&<g stroke="#fff9e9" strokeWidth="5" data-art-kind={`zebra-${scene.zebra}`}>{[0,1,2,3,4,5,6].map(i=><path key={i} d={scene.zebra==='approach'?`M110 ${72+i*11}H128`:`M${146+i*10} 159V168`}/>)}</g>}
    {scene.stopLine&&<path d="M133 111V144" stroke="#fff" strokeWidth="5" data-art-kind="stop-line"/>}
    <path d={scene.route} fill="none" stroke="#83d7fb" strokeWidth="5" strokeDasharray="6 7" data-art-kind="route"/>
    {scene.goal&&<circle cx={scene.goal[0]} cy={scene.goal[1]} r={scene.precision?12:17} fill="#83d7fb22" stroke="#83d7fb" strokeWidth="3" data-art-kind={scene.precision?'precision-goal':'goal'}/>}
    {scene.signs?.map(kind=><Sign key={kind} kind={kind} x={scene.bump?157:roundabout?103:126} y={scene.bump?173:174}/>)}
    {exercise.id==='priority-road'&&<Sign kind="yield" x={243} y={179}/>}
    {scene.signal&&<Signal phase={scene.signal}/>}
    {scene.actors?.map((actor,i)=><Usager key={i} actor={actor}/>)}
    <Car x={scene.player?.[0]??80} y={scene.player?.[1]??126} kind="player"/>
  </svg>;
}
