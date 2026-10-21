import { useEffect, useRef, useState } from 'react';
import { etapesRecitHistoire, resumeActesHistoire, resumeRecitHistoire } from './rpgStoryFlow.js';
import { RPG_STORY_CAMPAIGN_MINIATURE, RPG_STORY_REGISTRES, acteHistoire, registresDebloques } from './rpgStoryScenes.js';
import { StoryPortrait, StoryStorageNotice } from './RpgStoryScene.jsx';

/** Entrée narrative, sans remplacer la galerie des tours libres. */
export default function RpgStoryCampaign({ recit, etagesVaincus = [], cardArt, onContinue, onJournal, onRestart, sauvegardeOk, duelEnCours = false, campagneEnCours = false }) {
  const [confirmer, setConfirmer] = useState(null);
  const [acteApercuId, setActeApercuId] = useState(null);
  // La feuille ne se tourne qu'au changement d'acte : au premier rendu, le
  // livre est déjà ouvert sur son acte.
  const [feuilleTournee, setFeuilleTournee] = useState(false);
  const actePrecedent = useRef(null);
  const resume = resumeRecitHistoire(recit);
  const actes = resumeActesHistoire(recit);
  // La campagne se découvre : seuls les actes atteints figurent sur l'affiche.
  // Tant que la première scène n'est pas ouverte, c'est l'Acte I — celui qui
  // commence — et chaque acte suivant apparaît quand le récit y entre.
  // Les actes à venir ne sont plus annoncés par leur titre : ils se révèlent.
  const actesAtteints = actes.slice(0, Math.max(1, actes.findIndex((acte) => acte.id === resume.acteId) + 1));
  const acteApercu = actesAtteints.some((acte) => acte.id === acteApercuId) ? acteApercuId : null;
  const acteAffiche = acteHistoire(acteApercu ?? resume.acteId) ?? resume.acte;
  const statutAffiche = actesAtteints.find((acte) => acte.id === acteAffiche.id)?.statut ?? 'a-venir';
  const libelleStatut = statutAffiche === 'termine' ? 'Terminé'
    : statutAffiche === 'en-cours' ? 'En cours' : 'À découvrir';
  const etapes = etapesRecitHistoire(recit, etagesVaincus, acteAffiche.id);
  const registres = registresDebloques(recit);
  useEffect(() => {
    if (actePrecedent.current === null) { actePrecedent.current = acteAffiche.id; return undefined; }
    if (actePrecedent.current === acteAffiche.id) return undefined;
    actePrecedent.current = acteAffiche.id;
    setFeuilleTournee(true);
    const minuteur = setTimeout(() => setFeuilleTournee(false), 720);
    return () => clearTimeout(minuteur);
  }, [acteAffiche.id]);
  const actions = { reprendre: onContinue, journal: onJournal, recommencer: onRestart };
  const demander = (action) => {
    if (action === 'recommencer' || (duelEnCours && !(action === 'reprendre' && campagneEnCours))) {
      setConfirmer(action);
    } else actions[action]?.();
  };
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
      <div className="rpg-campaign__art" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}${RPG_STORY_CAMPAIGN_MINIATURE}")` }} aria-hidden="true" />
      <div className="rpg-campaign__copy">
        <div className="rpg-campaign__header-row">
          <span className="rpg-campaign__miniature" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}${RPG_STORY_CAMPAIGN_MINIATURE}`} alt="Miniature du Mode Histoire" />
          </span>
          <div className="rpg-campaign__header-text">
            <span className="rpg-narrative__eyebrow">CAMPAGNE ILLUSTRÉE <span aria-hidden="true">/</span> {acteAffiche.id === 'acte-1' ? 'ÉPISODE 01' : `ACTE ${acteAffiche.romain}`}</span>
            <h2>La Dernière<br /><em>Liste.</em></h2>
          </div>
        </div>
        <p className="rpg-campaign__pitch">Ils sont douze. La Liste n’en compte aucun.</p>
        {/* Les actes forment un livre : chaque acte atteint est un onglet posé
            sur la tranche, et le clic ouvre sa double page — le récit à
            gauche, les paliers à droite. Les actes à venir n'ont pas encore
            d'onglet : ils se révèlent en tournant la feuille. */}
        <div className={`rpg-campaign__livre${feuilleTournee ? ' is-tournee' : ''}`} data-campaign-livre>
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
            <div className="rpg-campaign__pages" key={acteAffiche.id} data-campaign-page={acteAffiche.id}>
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
                  <span>20 duels · 5 actes · vos choix · aucun chronomètre</span>
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
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            <span className="rpg-campaign__feuille" aria-hidden="true" />
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
      <span className="rpg-campaign__chapter" aria-hidden="true">{acteAffiche.titre.toUpperCase()}<br /><b>{acteAffiche.romain}</b></span>
    </section>
  );
}
