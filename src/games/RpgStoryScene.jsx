import { useEffect, useRef } from 'react';
import { cardById } from './rpgCards.js';
import { recompenseEtage } from './rpgCollection.js';
import { etageHistoireParId } from './rpgStoryTours.js';
import { cleCurseurRecit } from './rpgStoryFlow.js';
import { personnageEtage, personnageHistoire, portraitHistoire, RPG_STORY_DECORS } from './rpgStoryCast.js';
import {
  RPG_STORY_CAMPAIGN_FLOORS, RPG_STORY_LIST_CHOICE, RPG_STORY_SCENES,
  choixListe, sceneHistoire, texteReplique,
} from './rpgStoryScenes.js';

const BASE = import.meta.env.BASE_URL;

export function StoryPortrait({ personnageId, cardArt, className = '' }) {
  const personnage = personnageHistoire(personnageId);
  const src = portraitHistoire(personnageId, BASE, cardArt);
  return src ? (
    <img className={`rpg-story-portrait ${className}`} src={src}
      alt={`Portrait de ${personnage.nom}`} data-personnage={personnage.id}
      style={{ objectPosition: personnage.position }} draggable="false" />
  ) : null;
}

export function StoryHeader({ onExit, onJournal, sonActif, onToggleSound }) {
  return (
    <header className="rpg-narrative__header">
      <button type="button" className="rpg-narrative__back" onClick={onExit} aria-label="Retour à l’histoire">
        <span aria-hidden="true">←</span> Histoire
      </button>
      <div className="rpg-narrative__brand"><span>LE SABLIER</span><small>LA DERNIÈRE LISTE</small></div>
      <nav className="rpg-narrative__tools" aria-label="Options du récit">
        {onJournal && <button type="button" onClick={onJournal}>Journal</button>}
        {onToggleSound && <button type="button" onClick={onToggleSound} aria-pressed={sonActif} aria-label={sonActif ? 'Couper le son' : 'Activer le son'}>{sonActif ? 'Son activé' : 'Son coupé'}</button>}
      </nav>
    </header>
  );
}

export function StoryStorageNotice({ sauvegardeOk }) {
  return sauvegardeOk ? null : <p className="rpg-narrative__warning" role="status">La sauvegarde sur cet appareil est indisponible. Vous pouvez continuer, mais cette progression ne sera pas conservée après fermeture.</p>;
}

function StoryRewards({ etageId }) {
  return (
    <aside className="rpg-narrative__rewards" aria-label="Récompenses de l’étage">
      <span>CARTES RENDUES À VOTRE COLLECTION</span>
      <ul>{recompenseEtage(etageId).map((id) => <li key={id}>{cardById(id)?.name}</li>)}</ul>
    </aside>
  );
}

/** Lecteur du récit et briefing : ne crée jamais de duel à son montage. */
export default function RpgStoryScene({ recit, etagesVaincus, deckNom, cardArt, onEvent, onStartDuel, onExit, onJournal, sauvegardeOk, sonActif, onToggleSound }) {
  const lectureRef = useRef(null);
  const lecteurRef = useRef(null);
  const curseur = recit?.curseur;
  const cle = cleCurseurRecit(curseur);
  useEffect(() => { if (lecteurRef.current) lecteurRef.current.scrollTop = 0; }, [curseur?.type, curseur?.id, curseur?.etageId]);
  useEffect(() => { lectureRef.current?.focus({ preventScroll: true }); }, [cle]);
  if (!recit) return null;
  const scene = curseur.type === 'scene' ? sceneHistoire(curseur.id) : null;
  const etageId = scene?.etageId ?? curseur.etageId;
  const etage = etageHistoireParId(etageId)?.etage;
  const ligne = scene?.repliques[curseur.replique];
  const personnageId = curseur.type === 'fin' ? 'salem'
    : curseur.type === 'duel' ? personnageEtage(etageId)
      : curseur.resume ? scene.figure : ligne?.personnage === 'narrateur' ? scene.figure : ligne?.personnage;
  const personnage = personnageHistoire(personnageId);
  const decor = RPG_STORY_DECORS[scene?.decor ?? (curseur.type === 'fin' ? 'atelier' : 'greffe')];
  const derniere = scene && (curseur.resume || curseur.replique === scene.repliques.length - 1);
  const choixEnAttente = derniere && scene.choix;
  const envoyer = (type, extra = {}) => onEvent({ type, curseur, ...extra });
  const option = choixListe(recit.choix['diffusion-liste']);

  return (
    <section ref={lecteurRef} className="rpg-narrative" data-story-cursor={curseur.id ?? curseur.etageId ?? 'fin'}
      style={{ '--rpg-story-decor': `url("${BASE}${decor.fichier}")`, '--rpg-story-position': decor.position }}>
      <StoryHeader onExit={onExit} onJournal={onJournal} sonActif={sonActif} onToggleSound={onToggleSound} />
      <StoryStorageNotice sauvegardeOk={sauvegardeOk} />
      <main className="rpg-narrative__stage">
        <figure className="rpg-narrative__portrait">
          <StoryPortrait key={personnageId} personnageId={personnageId} cardArt={cardArt} />
          <figcaption><span>{personnage.nom}</span><small>{personnage.fonction}</small></figcaption>
        </figure>
        <div className="rpg-narrative__page">
          <p className="rpg-narrative__eyebrow">CHAPITRE I <span aria-hidden="true">/</span> LES ABSENTS</p>
          <div ref={lectureRef} tabIndex={-1} className="rpg-narrative__reading" aria-live="polite" aria-atomic="true">
            {scene ? (
              <>
                <p className="rpg-narrative__location">{scene.lieu}</p>
                <h1>{scene.titre}</h1>
                <div className="rpg-narrative__dialogue">
                  <span className="rpg-narrative__speaker" style={{ color: personnage.couleur }}>{curseur.resume ? 'LE FIL DU RÉCIT' : personnageHistoire(ligne?.personnage).nom}</span>
                  <p className={curseur.resume ? 'is-summary' : ''}>{curseur.resume ? scene.resume : texteReplique(ligne, recit.choix)}</p>
                </div>
              </>
            ) : curseur.type === 'duel' ? (
              <>
                <p className="rpg-narrative__location">La Tour des Listes · Duel {RPG_STORY_CAMPAIGN_FLOORS.indexOf(etageId) + 1} sur 5</p>
                <h1>Un droit à défendre.</h1>
                <p className="rpg-narrative__lead">Affrontez {etage?.nom}. Une victoire ouvre la suite du récit.</p>
                <dl className="rpg-narrative__duel-stats"><div><dt>Adversaire</dt><dd>{50 + (etage?.puissance ?? 0) * 5} PV · puissance {etage?.puissance}</dd></div><div><dt>Votre deck</dt><dd>{deckNom}</dd></div></dl>
                <p className="rpg-narrative__note">Deck complet, PV pleins. Aucune limite de temps. Un duel interrompu par la fermeture de la page recommence ; votre récit reste sauvegardé.</p>
                {etagesVaincus.includes(etageId) && <p className="rpg-narrative__acquired">Vous avez déjà remporté ce duel. Vous pouvez continuer le récit sans le rejouer.</p>}
              </>
            ) : (
              <>
                <p className="rpg-narrative__location">Épisode I terminé · La Tour des Listes</p>
                <h1>Douze noms.<br />Une porte ouverte.</h1>
                <p className="rpg-narrative__lead">Ils ont un abri. Ils ont un sursis. Et leurs noms sont de nouveau sur la Liste.</p>
                <p className="rpg-narrative__outcome">{option?.id === 'publique'
                  ? 'Le Souk les a accueillis à découvert. La Scribe témoignera devant la Chambre : les noms ont désormais des témoins.'
                  : 'Tarek les a conduits à l’atelier par l’escalier de service. Les témoins sont protégés, même si la ville ignore encore leur histoire.'}</p>
                <p className="rpg-narrative__note">La suite du dossier reste à écrire. Les quatre autres tours sont déjà accessibles en duels libres.</p>
              </>
            )}
          </div>

          {choixEnAttente ? (
            <fieldset className="rpg-narrative__choices">
              <legend>{RPG_STORY_LIST_CHOICE.question}</legend>
              {RPG_STORY_LIST_CHOICE.options.map((choix) => (
                <button key={choix.id} type="button" data-story-choice={choix.id} onClick={() => envoyer('choisir', { optionId: choix.id })}>
                  <strong>{choix.titre}<span aria-hidden="true">↗</span></strong><small>{choix.consequence}</small>
                </button>
              ))}
              <p>Mêmes duels et récompenses. Ce choix change les scènes et l’épilogue.</p>
            </fieldset>
          ) : (
            <div className="rpg-narrative__actions">
              {scene ? (
                <>
                  <button type="button" className="rpg-narrative-button" data-story-next onClick={() => envoyer('continuer')}>
                    {derniere ? scene.moment === 'avant' ? 'Préparer le duel' : scene.id === 'listes-5-apres' ? 'Terminer l’épisode' : 'Poursuivre le récit' : 'Continuer'} <span aria-hidden="true">→</span>
                  </button>
                  {!curseur.resume && !derniere && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-summary onClick={() => envoyer('resumer')}>Lire le résumé</button>}
                </>
              ) : curseur.type === 'duel' ? (
                <>
                  <button type="button" className="rpg-narrative-button" data-story-start-duel onClick={() => onStartDuel(etageId)}>{etagesVaincus.includes(etageId) ? 'Rejouer le duel' : 'Commencer le duel'} <span aria-hidden="true">→</span></button>
                  {etagesVaincus.includes(etageId) && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-skip-duel onClick={() => envoyer('deja-vaincu', { etageId })}>Déjà remporté — continuer le récit</button>}
                </>
              ) : (
                <><button type="button" className="rpg-narrative-button" onClick={onJournal}>Ouvrir le journal <span aria-hidden="true">→</span></button><button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={onExit}>Retour aux tours</button></>
              )}
            </div>
          )}
          {scene?.moment === 'apres' && <StoryRewards etageId={scene.etageId} />}
          <footer className="rpg-narrative__footer">
            <span>{scene ? curseur.resume ? 'RÉSUMÉ DE LA SCÈNE' : `RÉPLIQUE ${curseur.replique + 1} / ${scene.repliques.length}` : curseur.type === 'fin' ? 'FIN DE L’ÉPISODE I' : 'AVANT LE DUEL'}</span>
            <span>{recit.scenesVues.length} / {RPG_STORY_SCENES.length} SCÈNES LUES</span>
            <div className="rpg-narrative__progress" aria-hidden="true"><span style={{ width: `${100 * recit.scenesVues.length / RPG_STORY_SCENES.length}%` }} /></div>
          </footer>
        </div>
      </main>
    </section>
  );
}
