import { useEffect, useState } from 'react';
import { rpgAnimationsReduites } from './rpgAnimations.js';
import './chargement-duel.css';

const IMAGES_CHARGEMENT = [
  '/images/sablier-chargement.webp',
  '/images/sablier-chargement-2.jpg',
  '/images/sablier-chargement-3.jpg',
  '/cards/manticore-des-dunes.jpg',
  '/cards/sentinelle-du-brasier.jpg',
  '/cards/rodeuse-des-tombes.jpg',
  '/cards/chasseuse-de-braise.jpg',
  '/cards/scorpion-du-seuil.jpg',
];

/** Une importation peut rester en attente sans jamais rejeter. On laisse le
 * chargement continuer, mais on donne au joueur un moyen de s'en sortir. */
export default function ChargementDuel() {
  const [lent, setLent] = useState(false);
  const [image] = useState(() => IMAGES_CHARGEMENT[Math.floor(Math.random() * IMAGES_CHARGEMENT.length)]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLent(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      className={`chargement-duel${rpgAnimationsReduites() ? ' is-reduced' : ''}`}
      style={{ '--chargement-bg': `url('${image}')` }}
      role="status"
      aria-live="polite"
    >
      <span className="chargement-duel__sable" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <div className="chargement-duel__contenu">
        <span className="chargement-duel__sur-titre">Le Sablier</span>
        <p className="chargement-duel__titre">Chargement du duel…</p>
        <p className="chargement-duel__astuce"><b>Astuce</b> Consultez les cartes et leurs capacités avant de choisir vos cibles.</p>
        {lent && (
          <div className="chargement-duel__aide">
            <p>Le chargement prend plus de temps que prévu. Vérifiez votre connexion ou rechargez la page.</p>
            <button type="button" onClick={() => window.location.reload()}>Recharger la page</button>
          </div>
        )}
      </div>
    </div>
  );
}
