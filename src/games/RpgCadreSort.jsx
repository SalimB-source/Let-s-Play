import './rpg-cadre-sort.css';

/** Décoration de test : uniquement les cartes Magie, sans modifier les icônes. */
export default function RpgCadreSort({ carte }) {
  return carte?.kind === 'magie' ? <span className="rpg-cadre-sort" aria-hidden="true" /> : null;
}
