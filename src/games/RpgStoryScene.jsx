import { useEffect, useRef, useState } from 'react';
import { cardById } from './rpgCards.js';
import { recompenseEtage } from './rpgCollection.js';
import { rpgSorcierPv } from './rpgDuel.js';
import { etageHistoireParId } from './rpgStoryTours.js';
import { acteCourantRecit, cleCurseurRecit } from './rpgStoryFlow.js';
import { personnageEtage, personnageHistoire, portraitHistoire, RPG_STORY_DECORS } from './rpgStoryCast.js';
import {
  RPG_STORY_ALL_SCENES,
  acteHistoire,
  acteSuivantHistoire,
  questionChoix,
  sceneHistoire,
  scenesPourActe,
  texteEpilogueActe,
  texteReplique,
} from './rpgStoryScenes.js';

const BASE = import.meta.env.BASE_URL;

const LIBELLE_STYLE_IA = Object.freeze({
  equilibre: 'Équilibré',
  controle: 'Contrôle',
  prudent: 'Défensif',
  agressif: 'Offensif',
});

const LIBELLE_NIVEAU_IA = Object.freeze({
  recit: 'Initiation',
  normale: 'Gardien',
  veilleur: 'Veilleur',
});

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

function StoryRewards({ etageId, label = 'CARTES RENDUES À VOTRE COLLECTION' }) {
  const cartes = recompenseEtage(etageId);
  if (!cartes.length) return null;
  return (
    <aside className="rpg-narrative__rewards" aria-label="Récompenses de l’étage">
      <span>{label}</span>
      <ul>{cartes.map((id) => <li key={id}>{cardById(id)?.name}</li>)}</ul>
    </aside>
  );
}

/** Lecteur du récit et briefing : ne crée jamais de duel à son montage. */
export default function RpgStoryScene({
  recit,
  etagesVaincus,
  deckNom,
  deckActifId = null,
  decksJouables = [],
  onSelectDeck = null,
  cardArt,
  onEvent,
  onStartDuel,
  onExit,
  onJournal,
  sauvegardeOk,
  sonActif,
  onToggleSound,
}) {
  const lectureRef = useRef(null);
  const lecteurRef = useRef(null);
  const [relectureIntro, setRelectureIntro] = useState(null);
  const curseur = recit?.curseur;
  const cle = cleCurseurRecit(curseur);
  useEffect(() => { setRelectureIntro(null); }, [cle]);
  useEffect(() => { if (lecteurRef.current) lecteurRef.current.scrollTop = 0; }, [curseur?.type, curseur?.id, curseur?.etageId, curseur?.acteId, Boolean(relectureIntro)]);
  useEffect(() => { lectureRef.current?.focus({ preventScroll: true }); }, [cle, relectureIntro?.replique, relectureIntro?.resume]);
  if (!recit) return null;
  const acteId = acteCourantRecit(recit);
  const acte = acteHistoire(acteId) ?? acteHistoire('acte-1');
  const acteSuivant = curseur.type === 'fin' ? acteSuivantHistoire(acte.id) : null;
  const scenesActe = scenesPourActe(acte.id);
  const scenesLuesActe = scenesActe.filter((item) => recit.scenesVues.includes(item.id)).length;
  const sceneIntroDuel = curseur.type === 'duel' && relectureIntro ? sceneHistoire(`${curseur.etageId}-avant`) : null;
  const scene = curseur.type === 'scene' ? sceneHistoire(curseur.id) : sceneIntroDuel;
  const curseurActif = sceneIntroDuel ? relectureIntro : curseur;
  const etageId = scene?.etageId ?? curseur.etageId;
  const etage = etageHistoireParId(etageId)?.etage;
  const ligne = scene?.repliques[curseurActif.replique];
  const personnageId = curseur.type === 'fin' ? 'salem'
    : !scene && curseur.type === 'duel' ? personnageEtage(etageId)
      : curseurActif.resume ? scene.figure : ligne?.personnage === 'narrateur' ? scene.figure : ligne?.personnage;
  const personnage = personnageHistoire(personnageId);
  const decorFin = acte.id === 'acte-2' ? 'souk' : acte.id === 'acte-3' ? 'abysses' : acte.id === 'acte-4' ? 'fjord' : acte.id === 'acte-5' ? 'sables' : 'atelier';
  const decor = RPG_STORY_DECORS[scene?.decor ?? (curseur.type === 'fin' ? decorFin : 'greffe')] ?? RPG_STORY_DECORS.greffe;
  const derniere = scene && (curseurActif.resume || curseurActif.replique === scene.repliques.length - 1);
  const estDerniereSceneActe = Boolean(scene && scenesActe[scenesActe.length - 1]?.id === scene.id);
  const choixEnAttente = !sceneIntroDuel && derniere && scene.choix;
  const choixDef = choixEnAttente ? questionChoix(scene.choix) : null;
  const envoyer = (type, extra = {}) => onEvent({ type, curseur, ...extra });
  const epilogue = curseur.type === 'fin' ? texteEpilogueActe(acte.id, recit.choix) : null;
  const pvAdversaire = rpgSorcierPv(etage?.puissance ?? 0);
  const styleAdversaire = LIBELLE_STYLE_IA[etage?.ia?.style] ?? 'Équilibré';
  const niveauAdversaire = LIBELLE_NIVEAU_IA[etage?.ia?.niveau] ?? 'Gardien';

  return (
    <section ref={lecteurRef} className="rpg-narrative" data-story-cursor={curseur.id ?? curseur.etageId ?? curseur.acteId ?? 'fin'}
      data-story-act={acte.id}
      style={{ '--rpg-story-decor': `url("${BASE}${decor.fichier}")`, '--rpg-story-position': decor.position }}>
      <StoryHeader onExit={onExit} onJournal={onJournal} sonActif={sonActif} onToggleSound={onToggleSound} />
      <StoryStorageNotice sauvegardeOk={sauvegardeOk} />
      <main className="rpg-narrative__stage">
        <figure className="rpg-narrative__portrait">
          <StoryPortrait key={personnageId} personnageId={personnageId} cardArt={cardArt} />
          <figcaption><span>{personnage.nom}</span><small>{personnage.fonction}</small></figcaption>
        </figure>
        <div className="rpg-narrative__page">
          <p className="rpg-narrative__eyebrow">{acte.chapitre} <span aria-hidden="true">/</span> {acte.titre.toUpperCase()}</p>
          <div ref={lectureRef} tabIndex={-1} className="rpg-narrative__reading" aria-live="polite" aria-atomic="true">
            {scene ? (
              <>
                <p className="rpg-narrative__location">{sceneIntroDuel ? `${scene.lieu} · Relecture d’introduction` : scene.lieu}</p>
                <h1>{scene.titre}</h1>
                <div className="rpg-narrative__dialogue">
                  <span className="rpg-narrative__speaker" style={{ color: personnage.couleur }}>{curseurActif.resume ? 'LE FIL DU RÉCIT' : personnageHistoire(ligne?.personnage).nom}</span>
                  <p className={curseurActif.resume ? 'is-summary' : ''}>{curseurActif.resume ? scene.resume : texteReplique(ligne, recit.choix)}</p>
                </div>
              </>
            ) : curseur.type === 'duel' ? (
              <>
                <p className="rpg-narrative__location">{acte.tourNom} · Duel {acte.etages.indexOf(etageId) + 1} sur {acte.etages.length}</p>
                <h1>Un droit à défendre.</h1>
                <p className="rpg-narrative__lead">Affrontez {etage?.nom}. Une victoire ouvre la suite du récit.</p>
                {etage?.note && <p className="rpg-narrative__tactic" data-story-tactic>{etage.note}</p>}
                <dl className="rpg-narrative__duel-stats">
                  <div><dt>Adversaire</dt><dd data-story-duel-hp>{pvAdversaire} PV · puissance {etage?.puissance}</dd></div>
                  <div><dt>Profil tactique</dt><dd data-story-duel-profile>{styleAdversaire} · {niveauAdversaire}</dd></div>
                  <div>
                    <dt>Votre deck</dt>
                    <dd>
                      {decksJouables.length > 1 && onSelectDeck ? (
                        <select
                          className="rpg-narrative__deck-select"
                          data-story-deck-select
                          aria-label="Choisir votre deck pour ce duel"
                          value={deckActifId ?? decksJouables[0]?.id ?? ''}
                          onChange={(event) => onSelectDeck(event.target.value)}
                        >
                          {decksJouables.map((deck) => (
                            <option key={deck.id} value={deck.id}>{deck.name ?? deck.nom}</option>
                          ))}
                        </select>
                      ) : deckNom}
                    </dd>
                  </div>
                </dl>
                <p className="rpg-narrative__note">Deck complet, PV pleins. Aucune limite de temps. Un duel interrompu par la fermeture de la page recommence ; votre récit reste sauvegardé.</p>
                {etagesVaincus.includes(etageId) && <p className="rpg-narrative__acquired">Vous avez déjà remporté ce duel. Vous pouvez continuer le récit sans le rejouer.</p>}
              </>
            ) : (
              <>
                <p className="rpg-narrative__location">{epilogue?.lieu}</p>
                <h1>{acte.id === 'acte-1' ? (<>Douze noms.<br />Une porte ouverte.</>) : epilogue?.titre}</h1>
                <p className="rpg-narrative__lead">{epilogue?.chapeau}</p>
                <p className="rpg-narrative__outcome">{epilogue?.conclusion}</p>
                <p className="rpg-narrative__note">{epilogue?.note}</p>
              </>
            )}
          </div>

          {choixEnAttente && choixDef ? (
            <fieldset className="rpg-narrative__choices" data-story-choice-group={choixDef.id}>
              <legend>{choixDef.question}</legend>
              {choixDef.options.map((choix) => (
                <button key={choix.id} type="button" data-story-choice={choix.id} onClick={() => envoyer('choisir', { optionId: choix.id })}>
                  <strong>{choix.titre}<span aria-hidden="true">↗</span></strong><small>{choix.consequence}</small>
                </button>
              ))}
              <p>Mêmes duels et récompenses. Ce choix change les scènes et l’épilogue.</p>
            </fieldset>
          ) : (
            <div className="rpg-narrative__actions">
              {sceneIntroDuel ? (
                <>
                  <button
                    type="button"
                    className="rpg-narrative-button"
                    data-story-replay-next
                    onClick={() => {
                      if (derniere) setRelectureIntro(null);
                      else setRelectureIntro((etat) => ({ ...etat, replique: etat.replique + 1 }));
                    }}
                  >
                    {derniere ? 'Revenir au briefing' : 'Continuer'} <span aria-hidden="true">→</span>
                  </button>
                  {!curseurActif.resume && !derniere && (
                    <button
                      type="button"
                      className="rpg-narrative-button rpg-narrative-button--quiet"
                      onClick={() => setRelectureIntro((etat) => ({ ...etat, resume: true }))}
                    >
                      Lire le résumé
                    </button>
                  )}
                  <button
                    type="button"
                    className="rpg-narrative-button rpg-narrative-button--quiet"
                    data-story-close-replay
                    onClick={() => setRelectureIntro(null)}
                  >
                    Fermer la relecture
                  </button>
                </>
              ) : scene ? (
                <>
                  <button type="button" className="rpg-narrative-button" data-story-next onClick={() => envoyer('continuer')}>
                    {derniere ? scene.moment === 'avant' ? 'Préparer le duel' : estDerniereSceneActe ? (acte.id === 'acte-5' ? 'Conclure le récit' : 'Terminer l’acte') : 'Poursuivre le récit' : 'Continuer'} <span aria-hidden="true">→</span>
                  </button>
                  {!curseur.resume && !derniere && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-summary onClick={() => envoyer('resumer')}>Lire le résumé</button>}
                </>
              ) : curseur.type === 'duel' ? (
                <>
                  <button type="button" className="rpg-narrative-button" data-story-start-duel onClick={() => onStartDuel(etageId)}>{etagesVaincus.includes(etageId) ? 'Rejouer le duel' : 'Commencer le duel'} <span aria-hidden="true">→</span></button>
                  {etagesVaincus.includes(etageId) && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-skip-duel onClick={() => envoyer('deja-vaincu', { etageId })}>Déjà remporté — continuer le récit</button>}
                  <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-replay-intro onClick={() => setRelectureIntro({ replique: 0, resume: false })}>Revoir la scène</button>
                </>
              ) : (
                <>
                  {acteSuivant && (
                    <button
                      type="button"
                      className="rpg-narrative-button"
                      data-story-next-act={acteSuivant.id}
                      onClick={() => envoyer('ouvrir-acte', { acteId: acteSuivant.id })}
                    >
                      Acte {acteSuivant.romain} — {acteSuivant.titre} <span aria-hidden="true">→</span>
                    </button>
                  )}
                  <button type="button" className={`rpg-narrative-button ${acteSuivant ? 'rpg-narrative-button--quiet' : ''}`} onClick={onJournal}>Ouvrir le journal {!acteSuivant && <span aria-hidden="true">→</span>}</button>
                  <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={onExit}>Retour aux tours</button>
                </>
              )}
            </div>
          )}
          {scene?.moment === 'apres' && <StoryRewards etageId={scene.etageId} />}
          {!scene && curseur.type === 'duel' && (
            <StoryRewards
              etageId={etageId}
              label={etagesVaincus.includes(etageId) ? 'CARTES DÉJÀ ACQUISES SUR CET ÉTAGE' : 'ENJEU DU DUEL · CARTES À DÉBLOQUER'}
            />
          )}
          <footer className="rpg-narrative__footer">
            <span>{scene ? curseurActif.resume ? 'RÉSUMÉ DE LA SCÈNE' : `RÉPLIQUE ${curseurActif.replique + 1} / ${scene.repliques.length}` : curseur.type === 'fin' ? (acte.id === 'acte-1' ? 'FIN DE L’ÉPISODE I' : `FIN DE L’ACTE ${acte.romain}`) : 'AVANT LE DUEL'}</span>
            <span>{scenesLuesActe} / {scenesActe.length} SCÈNES LUES{acte.id !== 'acte-1' ? ` · ${recit.scenesVues.length} / ${RPG_STORY_ALL_SCENES.length} AU TOTAL` : ''}</span>
            <div className="rpg-narrative__progress" aria-hidden="true"><span style={{ width: `${100 * scenesLuesActe / scenesActe.length}%` }} /></div>
          </footer>
        </div>
      </main>
    </section>
  );
}
