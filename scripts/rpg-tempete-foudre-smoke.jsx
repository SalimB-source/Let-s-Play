import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EclairDuMarteau } from '../src/games/RpgDuelPage.jsx';
const effet = { entityId: 'creature', effectId: 'eclair', left: 10, top: 20, width: 100, height: 140 };
export const rendreEclairs = () => ({ neige: renderToStaticMarkup(<EclairDuMarteau effet={effet} />), braise: renderToStaticMarkup(<EclairDuMarteau effet={{ ...effet, tempeteBraise: true }} />) });
