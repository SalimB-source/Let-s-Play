import { useEffect, useState } from 'react';
import './chargement-duel.css';

/** Une importation peut rester en attente sans jamais rejeter. On laisse le
 * chargement continuer, mais on donne au joueur un moyen de s'en sortir. */
export default function ChargementDuel() {
  const [lent, setLent] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setLent(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="chargement-duel" role="status" aria-live="polite">
      <p>Chargement du duel…</p>
      {lent && (
        <div className="chargement-duel__aide">
          <p>Le chargement prend plus de temps que prévu. Vérifiez votre connexion ou rechargez la page.</p>
          <button type="button" onClick={() => window.location.reload()}>Recharger la page</button>
        </div>
      )}
    </div>
  );
}
