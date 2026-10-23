/**
 * L'histoire de Bab El — src/games/RpgStoryBabEl.jsx
 * ---------------------------------------------------
 * Le seuil du mode Histoire, pour qui n'a encore rien vécu de la campagne.
 *
 * Ce texte était posé sur l'écran **Jouer**, sous les quatre boutons du menu :
 * tout le monde le relisait à chaque passage, et il n'ouvrait rien. Il attend
 * désormais le moment où il sert — le lancement du mode Histoire par un
 * **nouveau joueur** (aucun récit en cours, aucun étage déblayé) — et il se
 * termine par un bouton qui commence la campagne.
 *
 * Un seul écran, trois choses :
 *
 *   1. le **keyart** de la campagne en fond, voilé pour que le texte reste lu ;
 *   2. les **deux paragraphes** d'origine, mot pour mot — Bab El, l'Astrolabe,
 *      la Liste, Salem et les douze oubliés ;
 *   3. **Commencer la campagne** (qui crée le récit et enchaîne sur la première
 *      scène) et **Plus tard** (qui rend le menu sans rien écrire).
 *
 * Rien n'est persisté ici : « nouveau joueur » se lit dans la progression
 * (`recit` nul et aucun étage vaincu), donc revenir en arrière sans commencer
 * ramène ce seuil la fois suivante — et commencer le fait disparaître pour
 * toujours, puisque le récit existe.
 */

import { useEffect, useRef } from 'react';
import './rpg-story-bab-el.css';

/** Le préfixe de `public/` : `/Let-s-Play/` en ligne, `/` sur le bureau. */
const BASE_URL = import.meta.env?.BASE_URL ?? '/';

export default function RpgStoryBabEl({ onCommencer = null, onPlusTard = null, onPlaySfx = null }) {
  const commencerRef = useRef(null);

  // Le seuil arrive sur son bouton : un lancement au clavier n'a pas à chercher
  // « Commencer » à travers la page.
  useEffect(() => { commencerRef.current?.focus?.(); }, []);

  return (
    <main
      className="rpg-bab-el"
      aria-label="L’histoire de Bab El — avant de commencer la campagne"
      data-bab-el
      style={{ '--bab-el-decor': `url("${BASE_URL}sablier-story/mode-histoire.jpg")` }}
    >
      <div className="rpg-bab-el__voile" aria-hidden="true" />

      <article className="rpg-bab-el__carte">
        <span className="rpg-bab-el__eyebrow" aria-hidden="true">L’HISTOIRE · BAB EL</span>
        <h2 className="rpg-bab-el__titre">Une cité verticale face au désert qui monte.</h2>

        <p className="rpg-bab-el__texte">
          <em>Le Sablier</em> se passe à Bab El, une cité verticale de neuf étages construite autour d’un portail scellé, au-dessus d’un désert dont le sable monte inexorablement. À chaque cycle d’une horloge géante — l’Astrolabe —, l’étage du bas est englouti, et une administration très polie mais implacable, la Chambre des Heures, publie <em>la Liste</em> de ceux qui ont le droit de monter… et de ceux qu’on abandonne.
        </p>
        <p className="rpg-bab-el__texte">
          L’histoire démarre quand Salem, un sauveteur qui fouille les étages condamnés, remonte douze survivants d’un quartier officiellement déclaré vide : sur le papier, ils n’existent plus, donc personne ne veut les loger. Avec Yamina, une ancienne horlogère repentie, et quelques alliés, il invoque un ancien droit de contestation — qui se règle par des duels de cartes faites de mémoire et de pactes — pour forcer la Chambre à réinscrire ces douze oubliés… avant de découvrir que ces effacements cachent le vrai secret du portail de Bab El.
        </p>

        <div className="rpg-bab-el__actions">
          <button
            ref={commencerRef}
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            data-bab-el-commencer
            onClick={() => { onPlaySfx?.('select'); onCommencer?.(); }}
          >
            <span className="rpg-menu-button__text">
              <strong>Commencer la campagne</strong>
              <small>Neuf étages, la Liste, et douze noms à réinscrire</small>
            </span>
            <span className="rpg-menu-button__arrow" aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="rpg-menu-button rpg-bab-el__plus-tard"
            data-bab-el-plus-tard
            onClick={() => { onPlaySfx?.('menu'); onPlusTard?.(); }}
          >
            <span className="rpg-menu-button__text">
              <strong>Plus tard</strong>
              <small>Revenir au menu sans commencer</small>
            </span>
          </button>
        </div>
      </article>
    </main>
  );
}
