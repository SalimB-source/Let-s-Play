import './rpg-cadre-carte.css';

/** Toutes les cartes partagent le cadre des créatures. */
export default function RpgCadreCarte({ carte }) {
  if (!carte?.kind) return null;
  return <span className="rpg-cadre-carte rpg-cadre-carte--creature" aria-hidden="true" />;
}
