import { useState } from 'react';
import { etapesRecitHistoire, resumeActesHistoire, resumeRecitHistoire } from './rpgStoryFlow.js';
import { RPG_STORY_REGISTRES, acteHistoire, registresDebloques } from './rpgStoryScenes.js';
import { StoryPortrait, StoryStorageNotice } from './RpgStoryScene.jsx';

/** Entrée narrative, sans remplacer la galerie des tours libres. */
export default function RpgStoryCampaign({ recit, etagesVaincus = [], cardArt, onContinue, onJournal, onRestart, sauvegardeOk, duelEnCours = false, campagneEnCours = false }) {
  const [confirmer, setConfirmer] = useState(null);
  const [acteApercuId, setActeApercuId] = useState(null);
  const resume = resumeRecitHistoire(recit);
  const actes = resumeActesHistoire(recit);
  const acteAfficheId = acteApercuId ?? resume.acteId;
  const acteAffiche = acteHistoire(acteAfficheId) ?? resume.acte;
  const etapes = etapesRecitHistoire(recit, etagesVaincus, acteAffiche.id);
  const registres = registresDebloques(recit);
  const actions = { reprendre: onContinue, journal: onJournal, recommencer: onRestart };
  const demander = (action) => {
    if (action === 'recommencer' || (duelEnCours && !(action === 'reprendre' && campagneEnCours))) {
      setConfirmer(action);
    } else actions[action]?.();
  };
  const tourImage = acteAffiche?.tourId ?? 'tour-des-listes';
  const figuresActe = acteAffiche.id === 'acte-2'
    ? ['salem', 'yamina', 'tarek']
    : acteAffiche.id === 'acte-3'
      ? ['salem', 'boualem', 'yamina']
      : acteAffiche.id === 'acte-4'
        ? ['salem', 'feriel', 'yamina']
        : acteAffiche.id === 'acte-5'
          ? ['salem', 'mahieddine', 'yamina']
          : ['salem', 'yamina', 'feriel'];
  return (
    <section className="rpg-campaign" aria-label="Campagne — La Dernière Liste">
      <div className="rpg-campaign__art" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}sablier-tours/${tourImage}.jpg")` }} aria-hidden="true" />
      <div className="rpg-campaign__copy">
        <span className="rpg-narrative__eyebrow">CAMPAGNE ILLUSTRÉE <span aria-hidden="true">/</span> {acteAffiche.id === 'acte-1' ? 'ÉPISODE 01' : `ACTE ${acteAffiche.romain} — ${acteAffiche.titre.toUpperCase()}`}</span>
        <h2>La Dernière<br /><em>Liste.</em></h2>
        <p className="rpg-campaign__pitch">Ils sont douze. La Liste n’en compte aucun.</p>
        <p className="rpg-campaign__description">{acteAffiche.id === 'acte-1'
          ? 'Salem a sauvé des habitants que la Chambre a déjà effacés. Remontez jusqu’au Grand Horloger. Faites compter leurs noms.'
          : `${acteAffiche.accroche} · ${acteAffiche.tourNom}.`}</p>
        <div className="rpg-campaign__cast" aria-label="Personnages de l’acte">
          {figuresActe.map((id) => <StoryPortrait key={id} personnageId={id} cardArt={cardArt} />)}
          <span>20 duels · 5 actes · vos choix · aucun chronomètre</span>
        </div>
        <ol className="rpg-campaign__acts" aria-label="Actes de la campagne">
          {actes.map((acte) => (
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
                onClick={() => setActeApercuId(acte.id === resume.acteId ? null : acte.id)}
              >
                <span className="rpg-campaign__act-num">Acte {acte.romain}</span>
                <strong>{acte.titre}</strong>
              </button>
            </li>
          ))}
        </ol>
        <ol className="rpg-campaign__steps" aria-label={`Paliers de l’acte ${acteAffiche.romain}`}>
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
              </span>
            </li>
          ))}
        </ol>
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
      <span className="rpg-campaign__chapter" aria-hidden="true">{acteAffiche.titre.toUpperCase()}<br /><b>{acteAffiche.romain}</b></span>
    </section>
  );
}
