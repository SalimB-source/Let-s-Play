import { useEffect, useState } from 'react';

import { demarrerVeilleMaj, rechargerMaintenant } from '../updates/maj-site';
import './mise-a-jour.css';

/**
 * « Une nouvelle version est en ligne » — la relance au lancement.
 *
 * Le site change souvent ; un onglet ouvert depuis trois jours, ou la WebView
 * de l'APK, ne le savent pas. Ce composant relit `version.json`, compare au
 * build chargé et propose de recharger — une fois, sans harceler : « Plus tard »
 * laisse une pastille discrète en bas de l'écran, et le rechargement reprend la
 * page telle quelle.
 *
 * Monté à la racine (`src/main.jsx`), hors de `Layout` : il doit parler aussi
 * bien sur l'accueil que sur la table de duel, et par-dessus les surcouches.
 */
function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function MiseAJourDisponible({
  // Deux coutures, pour les tests : la veille est injectable, et le garde de
  // développement peut être levé. En production, les valeurs par défaut sont
  // les seules utilisées (`src/main.jsx` monte `<MiseAJourDisponible />`).
  veille = demarrerVeilleMaj,
  dev = Boolean(import.meta.env?.DEV),
  baseUrl = import.meta.env?.BASE_URL || '/',
}) {
  const [version, setVersion] = useState(null);
  const [reportee, setReportee] = useState(false);

  useEffect(() => {
    // En développement, l'identifiant change à chaque démarrage du serveur :
    // la veille ne dirait rien d'utile (voir `estNouvelleVersion`).
    if (dev) return undefined;
    return veille({
      baseUrl,
      onNouvelleVersion: (distante) => setVersion(distante),
    });
  }, [baseUrl, dev, veille]);

  // Échap vaut « Plus tard » : personne ne doit rester coincé sous le panneau,
  // surtout pas au milieu d'un duel. Déclaré avant tout retour anticipé — les
  // crochets se comptent, pas les branches.
  useEffect(() => {
    if (!version || reportee || typeof window === 'undefined') return undefined;
    const auClavier = (evenement) => {
      if (evenement.key === 'Escape') setReportee(true);
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [version, reportee]);

  if (!version) return null;

  const recharger = () => rechargerMaintenant(version.buildId);
  const publiee = formatDate(version.builtAt);

  if (reportee) {
    return (
      <button
        type="button"
        className="maj-site__pastille"
        onClick={() => setReportee(false)}
        title="Une nouvelle version du site est disponible"
      >
        Mise à jour disponible
      </button>
    );
  }

  return (
    <div className="maj-site" role="dialog" aria-modal="true" aria-labelledby="maj-site-titre">
      <div className="maj-site__panneau">
        <p className="maj-site__sur-titre">Mise à jour</p>
        <h2 className="maj-site__titre" id="maj-site-titre">
          Une nouvelle version est en ligne
        </h2>
        <p className="maj-site__texte">
          Le Sablier a été mis à jour depuis l’ouverture de cette page. Rechargez pour en profiter :
          une partie en cours se reprend ensuite depuis le menu.
        </p>
        {publiee ? <p className="maj-site__date">Publiée le {publiee}</p> : null}
        <div className="maj-site__actions">
          <button type="button" className="maj-site__bouton maj-site__bouton--ok" onClick={recharger} autoFocus>
            Recharger maintenant
          </button>
          <button type="button" className="maj-site__bouton" onClick={() => setReportee(true)}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
