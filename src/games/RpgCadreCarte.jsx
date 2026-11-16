import './rpg-cadre-carte.css';

/** Les créatures Ascension, sites et terrains n’ont pas de cadre. */
export default function RpgCadreCarte({ carte }) {
  if (carte?.kind === 'creature' && carte?.ascension) return null;
  const type = carte?.kind === 'hero' ? 'creature' : carte?.kind;
  if (!['creature', 'magie', 'arme'].includes(type)) return null;
  return <span className={`rpg-cadre-carte rpg-cadre-carte--${type}`} aria-hidden="true" />;
}
