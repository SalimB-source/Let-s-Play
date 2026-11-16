import './rpg-cadre-carte.css';

/** Les créatures Ascension ont leur propre cadre ; sites et terrains n’en ont pas. */
export default function RpgCadreCarte({ carte }) {
  const genre = carte?.kind === 'hero' ? 'creature' : carte?.kind;
  const type = carte?.kind === 'creature' && carte?.ascension ? 'ascension' : genre;
  if (!['creature', 'magie', 'arme', 'ascension'].includes(type)) return null;
  return <span className={`rpg-cadre-carte rpg-cadre-carte--${type}`} aria-hidden="true" />;
}
