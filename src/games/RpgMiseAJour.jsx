import { useCallback, useEffect, useRef, useState } from 'react';
import {
  storeMajDesktop,
  libelleDebit,
  libelleTaille,
} from '../updates/maj-desktop.js';
import './rpg-mise-a-jour.css';

/**
 * La mise à jour de la coque PC, DANS le jeu — src/games/RpgMiseAJour.jsx
 * =====================================================================
 * Le pendant « dans le Sablier » des dialogues natifs de `desktop/main.js`.
 * Trois surfaces, toutes alimentées par le même store (`maj-desktop.js`) :
 *
 *   1. **la pastille** — discrète, en bas à gauche, dès qu'une mise à jour est
 *      disponible, en téléchargement ou prête. Elle ne couvre rien ;
 *   2. **le panneau modal** — le détail : version, barre de progression, et les
 *      boutons « Télécharger », « Redémarrer et installer », « Plus tard » ;
 *   3. **la carte des Paramètres** — la même chose, posée dans la grille des
 *      réglages, pour qui veut garder la main sans pastille.
 *
 * Hors coque PC (navigateur, APK), le pont n'existe pas : le store est inerte
 * et ce composant ne rend rien. Le site web, lui, garde son propre panneau
 * (`MiseAJourDisponible.jsx`) qui recharge la page — ce n'est pas la même
 * mise à jour : ici on parle de l'installeur Windows de la coque.
 */

/** S'abonne au store partagé de la coque. Renvoie l'état et les trois ordres. */
export function useMajDesktop() {
  const store = storeMajDesktop();
  const [etat, setEtat] = useState(() => store.getEtat());
  useEffect(() => store.abonner(setEtat), [store]);
  return {
    etat,
    disponible: store.disponible,
    verifier: useCallback(() => store.verifier(), [store]),
    telecharger: useCallback(() => store.telecharger(), [store]),
    installer: useCallback(() => store.installer(), [store]),
    abonnerOuverture: useCallback((abonne) => store.abonnerOuverture(abonne), [store]),
  };
}

/** Vrai quand la phase mérite la pastille (quelque chose à voir ou à faire). */
function phaseVisible(phase) {
  return ['disponible', 'telechargement', 'prete', 'erreur'].includes(phase);
}

/** Libellé court de la pastille, selon la phase. */
function libellePastille(etat) {
  switch (etat.phase) {
    case 'disponible': return 'Mise à jour disponible';
    case 'telechargement': return `Téléchargement ${etat.progression.percent} %`;
    case 'prete': return 'Mise à jour prête à installer';
    case 'erreur': return 'Mise à jour — réessayer';
    default: return 'Mise à jour';
  }
}

/** Formate une date ISO en français lisible (« 3 novembre 2026 »). */
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

/** Le sablier d'or, glyphe de la maison. */
function GlypheSablier() {
  return <span className="rpg-maj__glyphe" aria-hidden="true">⧗</span>;
}

/**
 * La pastille + le panneau modal. Montée une fois à la racine du jeu (dans
 * `RpgEntryChoice`, à côté de la table) : elle parle pendant le duel comme au
 * menu, par-dessus les surcouches.
 */
export default function RpgMiseAJour() {
  const { etat, disponible, verifier, telecharger, installer, abonnerOuverture } = useMajDesktop();
  const [ouvert, setOuvert] = useState(false);
  const [reportee, setReportee] = useState(false);
  const derniereAnnoncee = useRef('');

  // Le menu « Aide → Rechercher une mise à jour » de la coque ouvre le panneau.
  useEffect(() => abonnerOuverture(() => { setOuvert(true); setReportee(false); }), [abonnerOuverture]);

  // Une nouvelle version disponible ouvre le panneau une seule fois (comme le
  // panneau du site) : « Plus tard » le range en pastille sans le rouvrir en
  // boucle. Une version *prête* après téléchargement le rouvre aussi.
  useEffect(() => {
    if (!disponible) return;
    if (etat.phase === 'disponible' && etat.version && derniereAnnoncee.current !== etat.version) {
      derniereAnnoncee.current = etat.version;
      setReportee(false);
      setOuvert(true);
    }
    if (etat.phase === 'prete') {
      setReportee(false);
      setOuvert(true);
    }
  }, [disponible, etat.phase, etat.version]);

  // Échap vaut « Plus tard » : personne ne reste coincé sous le panneau en
  // plein duel. Déclaré avant tout retour anticipé — les crochets se comptent.
  useEffect(() => {
    if (!ouvert || typeof window === 'undefined') return undefined;
    const auClavier = (evenement) => {
      if (evenement.key === 'Escape') { setOuvert(false); setReportee(true); }
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [ouvert]);

  if (!disponible) return null;

  const fermer = () => { setOuvert(false); setReportee(true); };
  const ouvrir = () => { setOuvert(true); setReportee(false); };
  const publiee = formatDate(etat.datePublication);
  const enCours = etat.phase === 'telechargement' || etat.phase === 'verification';

  return (
    <>
      {phaseVisible(etat.phase) && !ouvert && (
        <button
          type="button"
          className={`rpg-maj__pastille rpg-maj__pastille--${etat.phase}`}
          onClick={ouvrir}
          title="Une mise à jour du Sablier est disponible"
          aria-label={libellePastille(etat)}
        >
          <GlypheSablier />
          <span>{libellePastille(etat)}</span>
          {etat.phase === 'telechargement' && (
            <span className="rpg-maj__pastille-barre" aria-hidden="true">
              <span style={{ width: `${etat.progression.percent}%` }} />
            </span>
          )}
        </button>
      )}

      {ouvert && (
        <div className="rpg-maj" role="dialog" aria-modal="true" aria-labelledby="rpg-maj-titre">
          <div className="rpg-maj__panneau">
            <p className="rpg-maj__sur-titre"><GlypheSablier /> Mise à jour du Sablier</p>

            {etat.phase === 'disponible' && (
              <>
                <h2 className="rpg-maj__titre" id="rpg-maj-titre">Une nouvelle version est disponible</h2>
                <p className="rpg-maj__texte">
                  La version <strong>{etat.version}</strong> du Sablier de Bab El est en ligne.
                  Téléchargez-la maintenant ; le jeu reste utilisable pendant le téléchargement.
                </p>
                {publiee && <p className="rpg-maj__date">Publiée le {publiee}</p>}
                <div className="rpg-maj__actions">
                  <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={telecharger} autoFocus>
                    Télécharger la mise à jour
                  </button>
                  <button type="button" className="rpg-maj__bouton" onClick={fermer}>Plus tard</button>
                </div>
              </>
            )}

            {etat.phase === 'telechargement' && (
              <>
                <h2 className="rpg-maj__titre" id="rpg-maj-titre">Téléchargement en cours…</h2>
                <p className="rpg-maj__texte">
                  La version <strong>{etat.version}</strong> se télécharge. Vous pouvez continuer à jouer ;
                  l’installation vous sera proposée à la fin.
                </p>
                <div
                  className="rpg-maj__progression"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={etat.progression.percent}
                  aria-label="Progression du téléchargement"
                >
                  <span style={{ width: `${etat.progression.percent}%` }} />
                </div>
                <p className="rpg-maj__progression-meta">
                  <span>{etat.progression.percent} %</span>
                  {etat.progression.total > 0 && (
                    <span>{libelleTaille(etat.progression.transferes)} / {libelleTaille(etat.progression.total)}</span>
                  )}
                  {etat.progression.octetsParSeconde > 0 && <span>{libelleDebit(etat.progression.octetsParSeconde)}</span>}
                </p>
                <div className="rpg-maj__actions">
                  <button type="button" className="rpg-maj__bouton" onClick={fermer}>Réduire</button>
                </div>
              </>
            )}

            {etat.phase === 'prete' && (
              <>
                <h2 className="rpg-maj__titre" id="rpg-maj-titre">La mise à jour est prête</h2>
                <p className="rpg-maj__texte">
                  La version <strong>{etat.version}</strong> est téléchargée. Redémarrez pour l’installer
                  maintenant — sinon elle s’installera à la fermeture du jeu, sans rien redemander.
                </p>
                <div className="rpg-maj__actions">
                  <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={installer} autoFocus>
                    Redémarrer et installer
                  </button>
                  <button type="button" className="rpg-maj__bouton" onClick={fermer}>Plus tard (à la fermeture)</button>
                </div>
              </>
            )}

            {etat.phase === 'verification' && (
              <>
                <h2 className="rpg-maj__titre" id="rpg-maj-titre">Recherche d’une mise à jour…</h2>
                <p className="rpg-maj__texte">Le Sablier interroge la dernière version publiée.</p>
                <div className="rpg-maj__actions">
                  <button type="button" className="rpg-maj__bouton" onClick={fermer}>Fermer</button>
                </div>
              </>
            )}

            {etat.phase === 'a-jour' && (
              <>
                <h2 className="rpg-maj__titre" id="rpg-maj-titre">Le Sablier est à jour</h2>
                <p className="rpg-maj__texte">
                  Vous jouez la dernière version publiée{etat.versionInstallee ? ` (${etat.versionInstallee})` : ''}.
                </p>
                <div className="rpg-maj__actions">
                  <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={fermer} autoFocus>Parfait</button>
                </div>
              </>
            )}

            {etat.phase === 'erreur' && (
              <>
                <h2 className="rpg-maj__titre" id="rpg-maj-titre">La mise à jour a échoué</h2>
                <p className="rpg-maj__texte">
                  {etat.erreur || 'La recherche ou le téléchargement a échoué.'}
                  {' '}Vérifiez votre connexion Internet et réessayez.
                </p>
                <div className="rpg-maj__actions">
                  <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={verifier} autoFocus>Réessayer</button>
                  <button type="button" className="rpg-maj__bouton" onClick={fermer}>Fermer</button>
                </div>
              </>
            )}

            {etat.phase === 'repos' && (
              <>
                <h2 className="rpg-maj__titre" id="rpg-maj-titre">Mise à jour du Sablier</h2>
                <p className="rpg-maj__texte">
                  Vérifiez si une nouvelle version de l’installeur Windows est publiée.
                </p>
                <div className="rpg-maj__actions">
                  <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={verifier} autoFocus>
                    Rechercher une mise à jour
                  </button>
                  <button type="button" className="rpg-maj__bouton" onClick={fermer}>Fermer</button>
                </div>
              </>
            )}

            {!enCours && etat.phase !== 'repos' && (
              <p className="rpg-maj__pied">
                <button type="button" className="rpg-maj__lien" onClick={verifier}>Revérifier</button>
                {etat.versionInstallee && <span> · version installée : {etat.versionInstallee}</span>}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * La carte des Paramètres : la mise à jour posée dans la grille des réglages,
 * pour garder la main sans pastille. Même store, mêmes ordres.
 */
export function RpgMiseAJourCarte() {
  const { etat, disponible, verifier, telecharger, installer } = useMajDesktop();
  if (!disponible) return null;

  const enCours = etat.phase === 'telechargement' || etat.phase === 'verification';
  let statut = 'À jour';
  if (etat.phase === 'disponible') statut = `v${etat.version} disponible`;
  else if (etat.phase === 'telechargement') statut = `${etat.progression.percent} %`;
  else if (etat.phase === 'prete') statut = 'Prête à installer';
  else if (etat.phase === 'verification') statut = 'Vérification…';
  else if (etat.phase === 'erreur') statut = 'Échec';

  return (
    <section className="rpg-settings__card rpg-maj-carte" aria-label="Mise à jour du jeu">
      <div className="rpg-settings__card-head">
        <div>
          <span className="rpg-settings__eyebrow">VERSION PC</span>
          <h3>Mise à jour du jeu</h3>
        </div>
        <span className={`rpg-settings__status${etat.phase === 'disponible' || etat.phase === 'prete' ? ' is-on' : ''}`}>
          {statut}
        </span>
      </div>
      <p className="rpg-settings__desc">
        {etat.phase === 'disponible' && `La version ${etat.version} de l’installeur Windows est en ligne. Téléchargez-la, puis redémarrez pour l’installer.`}
        {etat.phase === 'telechargement' && `La version ${etat.version} se télécharge — le jeu reste utilisable.`}
        {etat.phase === 'prete' && `La version ${etat.version} est téléchargée, prête à installer au redémarrage.`}
        {etat.phase === 'verification' && 'Recherche de la dernière version publiée…'}
        {etat.phase === 'a-jour' && `Vous jouez la dernière version publiée${etat.versionInstallee ? ` (${etat.versionInstallee})` : ''}.`}
        {etat.phase === 'erreur' && (etat.erreur || 'La dernière vérification a échoué. Réessayez.')}
        {etat.phase === 'repos' && 'Vérifiez si une nouvelle version de l’installeur Windows est publiée. Le jeu en ligne, lui, se met à jour tout seul au lancement.'}
      </p>

      {etat.phase === 'telechargement' && (
        <div
          className="rpg-maj__progression"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={etat.progression.percent}
          aria-label="Progression du téléchargement"
        >
          <span style={{ width: `${etat.progression.percent}%` }} />
        </div>
      )}

      <div className="rpg-maj-carte__actions">
        {etat.phase === 'disponible' && (
          <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={telecharger}>
            Télécharger la v{etat.version}
          </button>
        )}
        {etat.phase === 'prete' && (
          <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={installer}>
            Redémarrer et installer
          </button>
        )}
        {!enCours && etat.phase !== 'disponible' && etat.phase !== 'prete' && (
          <button type="button" className="rpg-maj__bouton" onClick={verifier}>
            Rechercher une mise à jour
          </button>
        )}
        {etat.phase === 'erreur' && (
          <button type="button" className="rpg-maj__bouton rpg-maj__bouton--ok" onClick={verifier}>Réessayer</button>
        )}
      </div>
    </section>
  );
}
