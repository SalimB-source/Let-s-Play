import React, { useId } from 'react';
import './city-rush-story-scene.css';

const SPEAKERS = { Nico: 'NICO VEGA', Luna: 'LUNA REYES', Kenji: 'KENJI SATO', Dante: 'DANTE CROSS' };

export default function CityRushStoryScene({ city, speaker = 'Nico', chapter = 1, kind = 'dialogue' }) {
  const active = SPEAKERS[speaker] || SPEAKERS.Nico;
  const cityImages = {
    'vice-city': 'vice-city-story-vice-city.webp',
    'new-york': 'vice-city-story-new-york.webp',
    tokyo: 'vice-city-story-tokyo.webp',
    paris: 'vice-city-story-paris.webp',
    london: 'vice-city-story-london.webp',
  };
  const actionImages = {
    'new-york': 'vice-city-action-new-york.webp',
    paris: 'vice-city-action-paris.webp',
    'vice-city': 'vice-city-action-finale.webp',
  };
  const kindLabels = {
    action: ['CAMÉRA EMBARQUÉE', 'PURSUIT · HIGH SPEED'],
  };
  const isSetPiece = kind !== 'dialogue';
  const photo = (kind === 'action' ? actionImages[city?.id] : null) || cityImages[city?.id] || cityImages['vice-city'];
  const imageBase = import.meta.env.BASE_URL || '/';
  const spokenLabel = kindLabels[kind];
  const wantedLevel = kind === 'action' ? (chapter >= 6 ? 5 : 3) : (speaker === 'Dante' ? 2 : 0);
  const stars = Array.from({ length: 5 }, (_, index) => index < wantedLevel ? '★' : '☆').join(' ');
  return (
    <div className={`cr-story-scene has-photo${isSetPiece ? ' is-action' : ''} kind-${kind} city-${city?.id || 'vice-city'}`} aria-label={`${isSetPiece ? 'Scène d’action' : 'Cinématique dialoguée'} photoréaliste à ${city?.name || 'Vice City'}`}>
      <img className="cr-story-photo" src={`${imageBase}${photo}`} alt={kind === 'action' ? `${city?.name || 'Vice City'} : poursuite automobile photoréaliste` : `${city?.name || 'Vice City'} : Nico et un autre personnage près de leurs voitures`} />
      <div className="cr-story-photo-shade" aria-hidden="true" />
      <div className="cr-story-hud-top"><b>VCR <i>·</i> STORIES</b><span>{city?.district || 'OCEAN DRIVE'} <i>·</i> {city?.name || 'VICE CITY'}</span><small>19:86</small></div>
      {isSetPiece ? <span className="cr-story-speaker-tag is-action"><i /> {spokenLabel[0]} <b>· NICO</b></span> : <span className="cr-story-speaker-tag"><i /> {active} <b>· PARLE</b></span>}
      {isSetPiece && <span className="cr-story-action-stamp">{spokenLabel[1].split(' · ')[0]} <b>·</b> {spokenLabel[1].split(' · ')[1]}</span>}
      <div className={`cr-story-wanted${wantedLevel ? ' is-hot' : ''}`} aria-label={`Niveau de recherche : ${wantedLevel} sur 5`}><small>RECHERCHE</small><b>{stars}</b></div>
      <span className="cr-story-scene-chapter">SCÈNE {String(chapter).padStart(2, '0')} <i>·</i> {city?.label || 'FLORIDE'}</span>
    </div>
  );
}
