import { useEffect, useRef } from 'react';
import { personnageHistoire } from './rpgStoryCast.js';
import { RPG_STORY_SCENES, RPG_STORY_SURVIVANTS, choixListe, texteReplique } from './rpgStoryScenes.js';
import { StoryHeader, StoryPortrait, StoryStorageNotice } from './RpgStoryScene.jsx';

/** Relecture seule : ouvrir une entrée n'enregistre ni choix ni récompense. */
export default function RpgStoryJournal({ recit, cardArt, onExit, onContinue, sauvegardeOk, sonActif, onToggleSound }) {
  const titreRef = useRef(null);
  useEffect(() => { titreRef.current?.focus({ preventScroll: true }); }, []);
  const scenes = RPG_STORY_SCENES.filter((scene) => recit?.scenesVues.includes(scene.id));
  const personnages = [...new Set(scenes.flatMap((scene) => scene.repliques.map((ligne) => ligne.personnage)))].filter((id) => id !== 'narrateur');
  const option = choixListe(recit?.choix['diffusion-liste']);
  return (
    <section className="rpg-narrative rpg-narrative--journal">
      <StoryHeader onExit={onExit} sonActif={sonActif} onToggleSound={onToggleSound} />
      <StoryStorageNotice sauvegardeOk={sauvegardeOk} />
      <main className="rpg-story-journal">
        <p className="rpg-narrative__eyebrow">LA DERNIÈRE LISTE <span aria-hidden="true">/</span> VOTRE MÉMOIRE</p>
        <h1 ref={titreRef} tabIndex={-1}>Le journal de Salem.</h1>
        <p className="rpg-narrative__note">Relisez les scènes et retrouvez les visages rencontrés. La relecture ne change jamais vos décisions.</p>
        <button type="button" className="rpg-narrative-button" onClick={onContinue}>Reprendre le récit <span aria-hidden="true">→</span></button>
        {option && <aside className="rpg-story-journal__decision"><span>VOTRE DÉCISION</span><h2>{option.titre}</h2><p>{option.journal}</p></aside>}
        <section className="rpg-story-journal__scenes" aria-label="Scènes lues">
          <h2>Ce qui s’est passé</h2>
          {!scenes.length && <p>Aucune scène terminée pour le moment. Votre position de lecture est conservée dans le récit.</p>}
          {scenes.map((scene, index) => (
            <details key={scene.id} data-journal-scene={scene.id}>
              <summary><span>{String(index + 1).padStart(2, '0')}</span><strong>{scene.titre}</strong><small>{scene.moment === 'avant' ? 'Avant le duel' : 'Après la victoire'}</small></summary>
              <p className="rpg-story-journal__location">{scene.lieu}</p>
              {scene.repliques.map((ligne, numero) => <p key={numero}><b>{personnageHistoire(ligne.personnage).nom}</b> — {texteReplique(ligne, recit?.choix)}</p>)}
              {scene.choix && option && <p className="rpg-story-journal__choice">Votre choix : {option.titre}.</p>}
            </details>
          ))}
        </section>
        {!!scenes.length && <section className="rpg-story-journal__names" aria-label="Les douze habitants"><h2>Ne pas les oublier</h2><p>Douze personnes. Pas une ligne vide.</p><ul>{RPG_STORY_SURVIVANTS.map((nom) => <li key={nom}>{nom}</li>)}</ul></section>}
        {!!personnages.length && <section aria-label="Personnages rencontrés"><h2>Les visages de Bab El</h2><div className="rpg-story-journal__cast">{personnages.map((id) => <figure key={id}><StoryPortrait personnageId={id} cardArt={cardArt} /><figcaption><strong>{personnageHistoire(id).nom}</strong><small>{personnageHistoire(id).fonction}</small></figcaption></figure>)}</div></section>}
      </main>
    </section>
  );
}
