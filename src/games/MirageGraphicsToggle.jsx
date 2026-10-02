import React from 'react';
import useMirageGraphics from './useMirageGraphics';

/**
 * Icône « niveau de graphismes » : trois barres de hauteur croissante, comme un
 * indicateur de signal. Graphismes normaux : les trois sont pleines ; baissés :
 * seule la première reste allumée. Dessinée en SVG (aucune police à charger),
 * elle prend la couleur du texte et reste décorative : le bouton porte son
 * propre `aria-label`.
 */
export function MirageGraphicsIcon({ low = false, className = 'mirage-graphics-icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 13V10" />
      <path d="M8 13V7" className={low ? 'is-dim' : undefined} />
      <path d="M13 13V3" className={low ? 'is-dim' : undefined} />
    </svg>
  );
}

/**
 * Après un clic (souris ou doigt), le bouton rend le focus : un bouton qui le
 * garde recevrait aussi Espace (saut) et Entrée (rejouer) et se rebasculerait en
 * pleine course. Au clavier (`detail` 0), le focus reste où il est.
 */
function releaseFocus(event) {
  if (event.detail > 0) event.currentTarget.blur();
}

/**
 * Bouton de la barre du jeu : bascule « Graphismes baissés » (moins de lag). Il
 * suit le modèle du bouton « Plein écran » — un interrupteur (`aria-pressed`),
 * allumé tant que les graphismes sont baissés, réduit à son icône sur la barre
 * étroite d'un téléphone.
 */
export default function MirageGraphicsButton() {
  const { low, toggle } = useMirageGraphics();
  return (
    <button
      type="button"
      className={`mirage-graphics-button${low ? ' is-on' : ''}`}
      onClick={(event) => {
        toggle();
        releaseFocus(event);
      }}
      aria-pressed={low}
      aria-label="Graphismes baissés"
      title={low
        ? 'Graphismes baissés (moins de lag) — cliquer pour revenir aux graphismes normaux'
        : 'Baisser les graphismes pour réduire le lag'}
    >
      <MirageGraphicsIcon low={low} />
      <span className="mirage-graphics-label">GRAPHISMES : {low ? 'BAISSÉS' : 'NORMAUX'}</span>
    </button>
  );
}

/**
 * Le même réglage en toutes lettres, pour les écrans du jeu (choix du mode,
 * pause) : deux choix explicites plutôt qu'un interrupteur, et la raison d'être
 * de l'option. Il lit et écrit le même choix que le bouton de la barre.
 */
export function MirageGraphicsSwitch() {
  const { low, setQuality } = useMirageGraphics();
  const choose = (quality) => (event) => {
    setQuality(quality);
    releaseFocus(event);
  };
  return (
    <div className="mirage-graphics-switch" role="group" aria-label="Graphismes">
      <span className="mirage-graphics-switch-title"><MirageGraphicsIcon low={low} /> GRAPHISMES</span>
      <span className="mirage-graphics-choices">
        <button
          type="button"
          className={`mirage-graphics-choice${low ? '' : ' is-active'}`}
          aria-pressed={!low}
          onClick={choose('normal')}
        >
          NORMAUX
        </button>
        <button
          type="button"
          className={`mirage-graphics-choice${low ? ' is-active' : ''}`}
          aria-pressed={low}
          onClick={choose('low')}
        >
          BAISSÉS
        </button>
      </span>
      <small className="mirage-graphics-note">Baissés : moins de lag, même jeu.</small>
    </div>
  );
}
