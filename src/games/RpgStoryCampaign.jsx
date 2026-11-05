import { useEffect, useRef, useState } from 'react';
import { GAINS } from './rpgCredits.js';
import { etapesRecitHistoire, resumeActesHistoire, resumeRecitHistoire } from './rpgStoryFlow.js';
import { RPG_STORY_ACTES, RPG_STORY_CAMPAIGN_FLOORS, RPG_STORY_CAMPAIGN_MINIATURE, RPG_STORY_REGISTRES, acteHistoire, registresDebloques } from './rpgStoryScenes.js';
import { StoryPortrait, StoryStorageNotice } from './RpgStoryScene.jsx';

/** Entrée narrative, sans remplacer la galerie des tours libres. */
export default function RpgStoryCampaign({ recit, etagesVaincus = [], cardArt, onContinue, onJournal, onRestart, sauvegardeOk, duelEnCours = false, campagneEnCours = false, children }) {
  const [confirmer, setConfirmer] = useState(null);
  const [acteApercuId, setActeApercuId] = useState(null);
  const resume = resumeRecitHistoire(recit);
  const actes = resumeActesHistoire(recit);
  // La campagne se découvre : seuls les actes atteints figurent sur l'affiche.
  // Tant que la première scène n'est pas ouverte, c'est l'Acte I — celui qui
  // commence — et chaque acte suivant apparaît quand le récit y entre.
  const actesAtteints = actes.slice(0, Math.max(1, actes.findIndex((acte) => acte.id === resume.acteId) + 1));
  const acteApercu = actesAtteints.some((acte) => acte.id === acteApercuId) ? acteApercuId : null;
  const acteDemandeId = acteApercu ?? resume.acteId;
  // Une seule double page est rendue à la fois. Le clic commence par tourner
  // l'ancienne feuille ; le contenu et l'onglet actif ne changent qu'à la
  // pliure, jamais avant. Un autre clic annule les minuteries précédentes.
  const [acteAfficheId, setActeAfficheId] = useState(() => resume.acteId);
  const acteAfficheRef = useRef(acteAfficheId);
  const [pageTournee, setPageTournee] = useState(null);
  const numeroTourRef = useRef(0);
  useEffect(() => {
    if (acteDemandeId === acteAfficheRef.current) {
      setPageTournee(null);
      return undefined;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      acteAfficheRef.current = acteDemandeId;
      setActeAfficheId(acteDemandeId);
      setPageTournee(null);
      return undefined;
    }
    setPageTournee(++numeroTourRef.current);
    const changer = window.setTimeout(() => {
      acteAfficheRef.current = acteDemandeId;
      setActeAfficheId(acteDemandeId);
    }, 330);
    const terminer = window.setTimeout(() => setPageTournee(null), 700);
    return () => { window.clearTimeout(changer); window.clearTimeout(terminer); };
  }, [acteDemandeId]);
  const acteAffiche = acteHistoire(acteAfficheId) ?? resume.acte;
  const statutAffiche = actesAtteints.find((acte) => acte.id === acteAffiche.id)?.statut ?? 'a-venir';
  const libelleStatut = statutAffiche === 'termine' ? 'Terminé'
    : statutAffiche === 'en-cours' ? 'En cours' : 'À découvrir';
  const etapes = etapesRecitHistoire(recit, etagesVaincus, acteAffiche.id);
  const registres = registresDebloques(recit);
  const actions = { reprendre: onContinue, journal: onJournal, recommencer: onRestart };
  const demander = (action) => {
    if (action === 'recommencer' || (duelEnCours && !(action === 'reprendre' && campagneEnCours))) {
      setConfirmer(action);
    } else actions[action]?.();
  };
  const figuresActe = acteAffiche.protagonistes;
  return (
    <section className="rpg-campaign" aria-label="Campagne — La Dernière Liste">
      <div className="rpg-campaign__art" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}${RPG_STORY_CAMPAIGN_MINIATURE}")` }} aria-hidden="true" />
      <div className="rpg-campaign__copy">
        <div className="rpg-campaign__header-row">
          <span className="rpg-campaign__miniature" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}${RPG_STORY_CAMPAIGN_MINIATURE}`} alt="Miniature du Mode Histoire" />
          </span>
          <div className="rpg-campaign__header-text">
            <span className="rpg-narrative__eyebrow">CAMPAGNE ILLUSTRÉE <span aria-hidden="true">/</span> <span className="rpg-campaign__episode">{acteAffiche.id === 'acte-1' ? 'ÉPISODE 01' : `ACTE ${acteAffiche.romain}`}</span></span>
            <h2>La Dernière<br /><em>Liste.</em></h2>
          </div>
        </div>
        <p className="rpg-campaign__pitch">Ils sont douze. La Liste n’en compte aucun.</p>
        {/* Les actes atteints forment des onglets horizontaux au-dessus du livre.
            Chaque clic tourne une feuille et ouvre la double page de l'acte ;
            les actes à venir se révèlent au fil de la campagne. */}
        <div className={`rpg-campaign__livre${pageTournee !== null ? ' is-tournee' : ''}`} data-campaign-livre>
          <ol className="rpg-campaign__acts" aria-label="Actes atteints de la campagne">
            {actesAtteints.map((acte) => (
              <li
                key={acte.id}
                className={`rpg-campaign__act is-${acte.statut}${acte.id === acteAffiche.id ? ' is-current' : ''}`}
                data-campaign-act={acte.id}
                data-act-status={acte.statut}
              >
                <button
                  type="button"
                  className="rpg-campaign__act-btn"
                  aria-pressed={acte.id === acteAffiche.id}
                  aria-label={`Ouvrir l’acte ${acte.romain} — ${acte.titre}`}
                  title={`Acte ${acte.romain} — ${acte.titre}`}
                  onClick={() => setActeApercuId(acte.id === resume.acteId ? null : acte.id)}
                >
                  <span className="rpg-campaign__act-num">Acte {acte.romain}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="rpg-campaign__volume">
            <div className="rpg-campaign__pages" data-campaign-page={acteAffiche.id}>
              <section className="rpg-campaign__page rpg-campaign__page--gauche"
                aria-label={`Acte ${acteAffiche.romain} — ${acteAffiche.titre}`}>
                <span className="rpg-campaign__page-eyebrow">
                  Acte {acteAffiche.romain}
                  <span aria-hidden="true"> · </span>
                  {libelleStatut}
                </span>
                <h3 className="rpg-campaign__page-titre">{acteAffiche.titre}</h3>
                <p className="rpg-campaign__description">{acteAffiche.id === 'acte-1'
                  ? 'Salem a sauvé des habitants que la Chambre a déjà effacés. Remontez jusqu’au Grand Horloger. Faites compter leurs noms.'
                  : acteAffiche.resume}</p>
                <div className="rpg-campaign__cast" aria-label="Personnages de l’acte">
                  {figuresActe.map((id) => <StoryPortrait key={id} personnageId={id} cardArt={cardArt} />)}
                  <span>{RPG_STORY_CAMPAIGN_FLOORS.length} duels · {RPG_STORY_ACTES.length} actes · vos choix · aucun chronomètre</span>
                </div>
              </section>
              <section className="rpg-campaign__page rpg-campaign__page--droite"
                aria-label={`Paliers de l’acte ${acteAffiche.romain}`}>
                <span className="rpg-campaign__page-eyebrow">Les paliers</span>
                <ol className="rpg-campaign__steps">
                  {etapes.map((etape) => (
                    <li
                      key={etape.etageId}
                      className={`rpg-campaign__step is-${etape.statut}`}
                      data-campaign-step={etape.etageId}
                      data-step-status={etape.statut}
                    >
                      <span className="rpg-campaign__step-num" aria-hidden="true">{etape.statut === 'termine' ? '✓' : etape.romain}</span>
                      <span className="rpg-campaign__step-body">
                        <strong>{etape.personnageNom}</strong>
                        <small>{etape.statut === 'termine' ? 'Palier terminé' : etape.statut === 'en-cours' ? 'En cours' : 'À venir'}</small>
                        {/* Le palier dit ce qu'il paie : le premier déblayage
                            gagne, le duel déjà remporté est en poche. */}
                        <span className="rpg-campaign__step-gain" data-step-gain={etape.etageId}>
                          {etape.duelVaincu
                            ? `✓ +${GAINS.etagePremiere} crédits gagnés`
                            : `+${GAINS.etagePremiere} crédits à gagner`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            <span key={pageTournee ?? 'repos'} className="rpg-campaign__feuille" data-campaign-feuille={pageTournee ?? undefined} aria-hidden="true" />
          </div>
        </div>
        <div className="rpg-campaign__actions">
          <button type="button" className="rpg-narrative-button" data-story-campaign onClick={() => demander('reprendre')}>
            {resume.termine
              ? resume.acteSuivant
                ? `Passer à l’Acte ${resume.acteSuivant.romain}`
                : 'Revoir l’épilogue'
              : resume.commence
                ? 'Continuer le récit'
                : 'Commencer le récit'} <span aria-hidden="true">→</span>
          </button>
          {resume.commence && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={() => demander('journal')}>Journal</button>}
        </div>
        {resume.commence && <p className="rpg-campaign__resume">{resume.scenesLues} / {resume.total} scènes lues (Acte {resume.acte.romain}) · {registres.length} / {RPG_STORY_REGISTRES.length} pièces au dossier · {resume.titre}</p>}
        <StoryStorageNotice sauvegardeOk={sauvegardeOk} />
        {resume.commence && !confirmer && <button type="button" className="rpg-campaign__restart" onClick={() => demander('recommencer')}>Recommencer le récit</button>}
        {confirmer && <div className="rpg-campaign__confirm" role="group" aria-label="Confirmer la lecture">
          <p>{confirmer === 'recommencer'
            ? 'Recommencer les scènes et les choix ? Vos victoires, cartes et decks seront conservés.'
            : 'Pour ouvrir la lecture, le duel en cours sera interrompu. Il recommencera depuis sa main de départ. Vos victoires et vos cartes restent acquises.'}</p>
          {confirmer === 'recommencer' && duelEnCours && <p>Le duel en cours sera également interrompu.</p>}
          <button type="button" className="rpg-narrative-button" onClick={() => { const action = confirmer; setConfirmer(null); actions[action]?.(); }}>{confirmer === 'recommencer' ? 'Oui, recommencer le récit' : 'Interrompre le duel et lire'}</button>
          <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={() => setConfirmer(null)}>Annuler</button>
        </div>}
      </div>
      {children}
      <span className="rpg-campaign__chapter" aria-hidden="true">{acteAffiche.titre.toUpperCase()}<br /><b>{acteAffiche.romain}</b></span>
    </section>
  );
}
