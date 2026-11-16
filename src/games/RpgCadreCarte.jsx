import './rpg-cadre-carte.css';

/** Toutes les cartes partagent le cadre Le Sablier. */
export default function RpgCadreCarte({ carte }) {
  if (!carte?.kind) return null;
  return <span className="rpg-cadre-carte rpg-cadre-carte--sablier" aria-hidden="true" />;
}
