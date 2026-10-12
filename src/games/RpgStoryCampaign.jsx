import { useState } from 'react';
import { resumeRecitHistoire } from './rpgStoryFlow.js';
import { StoryPortrait, StoryStorageNotice } from './RpgStoryScene.jsx';

/** Entrée narrative, sans remplacer la galerie des tours libres. */
export default function RpgStoryCampaign({ recit, cardArt, onContinue, onJournal, onRestart, sauvegardeOk, duelEnCours = false, campagneEnCours = false }) {
  const [confirmer, setConfirmer] = useState(null);
  const resume = resumeRecitHistoire(recit);
  const actions = { reprendre: onContinue, journal: onJournal, recommencer: onRestart };
  const demander = (action) => {
    if (action === 'recommencer' || (duelEnCours && !(action === 'reprendre' && campagneEnCours))) {
      setConfirmer(action);
    } else actions[action]?.();
  };
  return (
    <section className="rpg-campaign" aria-label="Campagne — La Dernière Liste">
      <div className="rpg-campaign__art" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}sablier-tours/tour-des-listes.jpg")` }} aria-hidden="true" />
      <div className="rpg-campaign__copy">
        <span className="rpg-narrative__eyebrow">CAMPAGNE ILLUSTRÉE <span aria-hidden="true">/</span> ÉPISODE 01</span>
        <h2>La Dernière<br /><em>Liste.</em></h2>
        <p className="rpg-campaign__pitch">Ils sont douze. La Liste n’en compte aucun.</p>
        <p className="rpg-campaign__description">Salem a sauvé des habitants que la Chambre a déjà effacés. Remontez jusqu’au Grand Horloger. Faites compter leurs noms.</p>
        <div className="rpg-campaign__cast" aria-label="Avec Salem, Yamina et Fériel">
          {['salem', 'yamina', 'feriel'].map((id) => <StoryPortrait key={id} personnageId={id} cardArt={cardArt} />)}
          <span>5 duels · vos choix · aucun chronomètre</span>
        </div>
        <div className="rpg-campaign__actions">
          <button type="button" className="rpg-narrative-button" data-story-campaign onClick={() => demander('reprendre')}>{resume.termine ? 'Revoir l’épilogue' : resume.commence ? 'Continuer le récit' : 'Commencer le récit'} <span aria-hidden="true">→</span></button>
          {resume.commence && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={() => demander('journal')}>Journal</button>}
        </div>
        {resume.commence && <p className="rpg-campaign__resume">{resume.scenesLues} / {resume.total} scènes lues · {resume.titre}</p>}
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
      <span className="rpg-campaign__chapter" aria-hidden="true">LES ABSENTS<br /><b>I</b></span>
    </section>
  );
}
