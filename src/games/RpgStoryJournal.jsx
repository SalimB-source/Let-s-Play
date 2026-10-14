import { useEffect, useRef, useState } from 'react';
import { personnageHistoire } from './rpgStoryCast.js';
import {
  RPG_STORY_ALL_SCENES,
  RPG_STORY_CHOICES,
  RPG_STORY_REGISTRES,
  RPG_STORY_SURVIVANTS,
  acteHistoire,
  optionChoix,
  registresDebloques,
  sceneHistoire,
  statutSurvivantsHistoire,
  texteRegistre,
  texteReplique,
} from './rpgStoryScenes.js';
import { StoryHeader, StoryPortrait, StoryStorageNotice } from './RpgStoryScene.jsx';

/** Relecture seule : ouvrir une entrée n'enregistre ni choix ni récompense. */
export default function RpgStoryJournal({ recit, cardArt, onExit, onContinue, sauvegardeOk, sonActif, onToggleSound }) {
  const titreRef = useRef(null);
  const [relecture, setRelecture] = useState(null);
  useEffect(() => { titreRef.current?.focus({ preventScroll: true }); }, []);
  const scenes = RPG_STORY_ALL_SCENES.filter((scene) => recit?.scenesVues.includes(scene.id));
  const personnages = [...new Set(scenes.flatMap((scene) => scene.repliques.map((ligne) => ligne.personnage)))].filter((id) => id !== 'narrateur');
  const decisions = Object.values(RPG_STORY_CHOICES)
    .map((question) => {
      const option = optionChoix(question.id, recit?.choix?.[question.id]);
      return option ? { question, option, acte: acteHistoire(question.acteId) } : null;
    })
    .filter(Boolean);
  const registres = registresDebloques(recit);
  const statutSurvivants = statutSurvivantsHistoire(recit);
  const sceneRelecture = relecture && recit?.scenesVues.includes(relecture.id) ? sceneHistoire(relecture.id) : null;
  const ligneRelecture = sceneRelecture?.repliques[relecture.replique];
  const personnageRelectureId = sceneRelecture
    ? (relecture.resume || ligneRelecture?.personnage === 'narrateur' ? sceneRelecture.figure : ligneRelecture?.personnage)
    : null;
  const personnageRelecture = personnageRelectureId ? personnageHistoire(personnageRelectureId) : null;
  const derniereRelecture = sceneRelecture && (relecture.resume || relecture.replique >= sceneRelecture.repliques.length - 1);

  return (
    <section className="rpg-narrative rpg-narrative--journal">
      <StoryHeader onExit={onExit} sonActif={sonActif} onToggleSound={onToggleSound} />
      <StoryStorageNotice sauvegardeOk={sauvegardeOk} />
      <main className="rpg-story-journal">
        <p className="rpg-narrative__eyebrow">LA DERNIÈRE LISTE <span aria-hidden="true">/</span> VOTRE MÉMOIRE</p>
        <h1 ref={titreRef} tabIndex={-1}>Le journal de Salem.</h1>
        <p className="rpg-narrative__note">Relisez les scènes, consultez les pièces versées au dossier et retrouvez les visages rencontrés. La relecture ne change jamais vos décisions.</p>
        <button type="button" className="rpg-narrative-button" onClick={onContinue}>Reprendre le récit <span aria-hidden="true">→</span></button>
        {decisions.map(({ question, option, acte }) => (
          <aside key={question.id} className="rpg-story-journal__decision" data-journal-decision={question.id}>
            <span>VOTRE DÉCISION · ACTE {acte?.romain ?? 'I'}</span>
            <h2>{option.titre}</h2>
            <p>{option.journal}</p>
          </aside>
        ))}
        {sceneRelecture && (
          <aside className="rpg-story-journal__replay" data-journal-stage={sceneRelecture.id} aria-label={`Relecture : ${sceneRelecture.titre}`}>
            <figure className="rpg-story-journal__replay-portrait">
              <StoryPortrait personnageId={personnageRelectureId} cardArt={cardArt} />
              <figcaption><strong>{personnageRelecture?.nom}</strong><small>{personnageRelecture?.fonction}</small></figcaption>
            </figure>
            <div className="rpg-story-journal__replay-body">
              <span className="rpg-narrative__eyebrow">RELECTURE DE SCÈNE <span aria-hidden="true">/</span> {relecture.resume ? 'RÉSUMÉ' : `RÉPLIQUE ${relecture.replique + 1} SUR ${sceneRelecture.repliques.length}`}</span>
              <p className="rpg-story-journal__location">{sceneRelecture.lieu}</p>
              <h3>{sceneRelecture.titre}</h3>
              <p className="rpg-story-journal__replay-speaker" style={{ color: personnageRelecture?.couleur }}>
                {relecture.resume ? 'LE FIL DU RÉCIT' : personnageHistoire(ligneRelecture?.personnage).nom}
              </p>
              <p className="rpg-story-journal__replay-text">
                {relecture.resume ? sceneRelecture.resume : texteReplique(ligneRelecture, recit?.choix)}
              </p>
              <div className="rpg-story-journal__replay-actions">
                {!derniereRelecture && (
                  <button
                    type="button"
                    className="rpg-narrative-button"
                    data-journal-replay-next
                    onClick={() => setRelecture((etat) => ({ ...etat, replique: etat.replique + 1 }))}
                  >
                    Réplique suivante <span aria-hidden="true">→</span>
                  </button>
                )}
                {!relecture.resume && (
                  <button
                    type="button"
                    className="rpg-narrative-button rpg-narrative-button--quiet"
                    data-journal-replay-summary
                    onClick={() => setRelecture((etat) => ({ ...etat, resume: true }))}
                  >
                    Lire le résumé
                  </button>
                )}
                <button
                  type="button"
                  className="rpg-narrative-button rpg-narrative-button--quiet"
                  data-journal-close-replay
                  onClick={() => setRelecture(null)}
                >
                  Fermer la relecture
                </button>
              </div>
            </div>
          </aside>
        )}
        <section className="rpg-story-journal__scenes" aria-label="Scènes lues">
          <h2>Ce qui s’est passé</h2>
          {!scenes.length && <p>Aucune scène terminée pour le moment. Votre position de lecture est conservée dans le récit.</p>}
          {scenes.map((scene, index) => {
            const choixScene = scene.choix ? optionChoix(scene.choix, recit?.choix?.[scene.choix]) : null;
            return (
              <details key={scene.id} data-journal-scene={scene.id}>
                <summary><span>{String(index + 1).padStart(2, '0')}</span><strong>{scene.titre}</strong><small>{scene.moment === 'avant' ? 'Avant le duel' : 'Après la victoire'}</small></summary>
                <p className="rpg-story-journal__location">{scene.lieu}</p>
                {scene.repliques.map((ligne, numero) => <p key={numero}><b>{personnageHistoire(ligne.personnage).nom}</b> — {texteReplique(ligne, recit?.choix)}</p>)}
                {choixScene && <p className="rpg-story-journal__choice">Votre choix : {choixScene.titre}.</p>}
                <div className="rpg-story-journal__scene-tools">
                  <button
                    type="button"
                    className="rpg-narrative-button rpg-narrative-button--quiet"
                    data-journal-replay={scene.id}
                    onClick={() => setRelecture({ id: scene.id, replique: 0, resume: false })}
                  >
                    Rejouer la mise en scène <span aria-hidden="true">→</span>
                  </button>
                </div>
              </details>
            );
          })}
        </section>
        {!!registres.length && (
          <section className="rpg-story-journal__registers" aria-label="Pièces du dossier">
            <h2>Les Neuf Registres ({registres.length} / {RPG_STORY_REGISTRES.length})</h2>
            <p className="rpg-story-journal__registers-lead">Preuves, cahiers et serments recueillis de la Tour des Listes jusqu’au Zénith.</p>
            <div className="rpg-story-journal__registers-grid">
              {registres.map((registre) => (
                <article key={registre.id} className="rpg-story-journal__register" data-journal-register={registre.id}>
                  <header>
                    <span>{registre.cote}</span>
                    <small>{registre.lieu}</small>
                  </header>
                  <h3>{registre.titre}</h3>
                  <p>{texteRegistre(registre, recit?.choix)}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {!!scenes.length && (
          <section className="rpg-story-journal__names" aria-label="Les douze habitants">
            <h2>Ne pas les oublier</h2>
            <p>Douze personnes. Pas une ligne vide.</p>
            <p className="rpg-story-journal__survivors-status" data-journal-survivors-status>
              <strong>{statutSurvivants.etape}</strong> — {statutSurvivants.resume}
            </p>
            <ul>{RPG_STORY_SURVIVANTS.map((nom) => <li key={nom}>{nom}</li>)}</ul>
          </section>
        )}
        {!!personnages.length && <section aria-label="Personnages rencontrés"><h2>Les visages de Bab El</h2><div className="rpg-story-journal__cast">{personnages.map((id) => <figure key={id}><StoryPortrait personnageId={id} cardArt={cardArt} /><figcaption><strong>{personnageHistoire(id).nom}</strong><small>{personnageHistoire(id).fonction}</small></figcaption></figure>)}</div></section>}
      </main>
    </section>
  );
}
