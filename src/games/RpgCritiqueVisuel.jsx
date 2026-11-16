import React from 'react';

/** Décor commun aux plateaux : n'intercepte jamais les actions de la carte. */
export default function RpgCritiqueVisuel({ fois }) {
  return <span className="rpg-critique-fx" aria-hidden="true">
    <i className="rpg-critique-fx__flash" />
    <i className="rpg-critique-fx__anneau" />
    <i className="rpg-critique-fx__rayons" />
    <i className="rpg-critique-fx__entaille rpg-critique-fx__entaille--a" />
    <i className="rpg-critique-fx__entaille rpg-critique-fx__entaille--b" />
    <span className="rpg-card__critique">×{fois}</span>
  </span>;
}
