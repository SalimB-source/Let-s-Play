import './rpg-cadre-carte.css';

/** Les héros partagent le cadre des créatures ; sites et terrains n'en ont pas. */
export default function RpgCadreCarte({ carte }) {
  const type = carte?.kind === 'hero' ? 'creature' : carte?.kind;
  if (!['creature', 'magie', 'arme'].includes(type)) return null;
  return <span className={`rpg-cadre-carte rpg-cadre-carte--${type}`} aria-hidden="true" />;
}
