import { rpgAfflictionsVisuelles } from './rpgAfflictionsVisuelles.js';

/** Décor seulement : la carte et ses commandes restent entièrement cliquables. */
export default function RpgAfflictionsVisuelles({ entite }) {
  return rpgAfflictionsVisuelles(entite).map((type) => (
    <span key={type} className={`rpg-affliction rpg-affliction--${type}`} data-affliction={type} aria-hidden="true">
      <i /><i /><i />
    </span>
  ));
}
