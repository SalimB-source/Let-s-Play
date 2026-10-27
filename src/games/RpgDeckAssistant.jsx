/**
 * L'assistant de création assistée — le wizard en deux pas de l'atelier.
 *
 * Le parcours est désormais celui que la maison promet sur la crate
 * « Nouveau deck » :
 *
 *   1. **Les couleurs** — 1 à 3 des cinq éléments du jeu ;
 *   2. **Le style de jeu** — aggro, contrôle ou mix (`RPG_STYLES_JEU`,
 *      `rpgDeckAuto.js`).
 *
 * « Générer le deck » appelle `onGenerer({ couleurs, style })` : le moteur
 * (`genererDeckAssiste`) compose alors trente cartes — ou un brouillon si la
 * collection ne suffit pas — uniquement avec des cartes possédées. Le deck
 * généré atterrit dans l'atelier manuel, où chaque carte reste retouchable.
 *
 * Composant présentationnel : pas de persistance ici. Il annonce en revanche
 * la taille maximale que la collection permet pour les couleurs retenues,
 * pour ne pas promettre un deck de 30 cartes qu'il ne pourrait pas tenir.
 */

import { useMemo, useState } from 'react';
import {
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  cardColors,
  carteJouableSansTerrain,
} from './rpgCards.js';
import { plafondVisible } from './rpgCollection.js';
import { RPG_STYLES_JEU } from './rpgDeckAuto.js';

const GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', tenebres: '💀' };
const COULEUR_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };

/** Étapes du wizard, dans l'ordre — l'en-tête les montre comme un fil. */
const ETAPES = [
  { id: 'couleurs', label: 'Couleurs', titre: 'Vos couleurs' },
  { id: 'style', label: 'Style de jeu', titre: 'Votre style de jeu' },
];

export function RpgDeckAssistant({
  collection = [],
  exemplaires = null,
  onGenerer,
  onFermer,
  surSfx = () => {},
}) {
  const [etape, setEtape] = useState('couleurs');
  const [couleurs, setCouleurs] = useState(() => new Set());
  const [style, setStyle] = useState('');
  const [message, setMessage] = useState('');

  const rangEtape = ETAPES.findIndex((entree) => entree.id === etape);

  /**
   * Le potentiel de génération des couleurs retenues : le nombre de
   * références possédées et le total d'exemplaires alignables (le stock
   * payé borne chaque carte, pas le seul quota de rareté).
   */
  const potentiel = useMemo(() => {
    if (!couleurs.size) return { references: 0, copies: 0 };
    const retenues = RPG_DUEL_CARDS.filter((carte) => {
      if (!carteJouableSansTerrain(carte)) return false;
      if (!collection.includes(carte.id)) return false;
      return cardColors(carte).every((couleur) => couleurs.has(couleur));
    });
    const copies = retenues.reduce(
      (total, carte) => total + plafondVisible(collection, carte.id, exemplaires),
      0,
    );
    return { references: retenues.length, copies };
  }, [couleurs, collection, exemplaires]);

  const basculerCouleur = (couleur) => {
    setMessage('');
    setCouleurs((actuelles) => {
      const suivant = new Set(actuelles);
      if (suivant.has(couleur)) suivant.delete(couleur);
      else if (suivant.size >= 3) {
        surSfx('erreur');
        setMessage('Trois couleurs au plus : le format du duel n’en autorise pas davantage.');
        return actuelles;
      } else suivant.add(couleur);
      return suivant;
    });
  };

  const choisirStyle = (id) => {
    surSfx('menu');
    setMessage('');
    setStyle(id);
  };

  const versStyle = () => {
    if (!couleurs.size) {
      surSfx('erreur');
      setMessage('Choisissez d’abord au moins une couleur.');
      return;
    }
    surSfx('menu');
    setEtape('style');
  };

  const generer = () => {
    if (!style) {
      surSfx('erreur');
      setMessage('Choisissez un style de jeu pour lancer la génération.');
      return;
    }
    surSfx('apparition');
    onGenerer({ couleurs: [...couleurs], style });
  };

  const collectionTropJuste = couleurs.size > 0 && potentiel.copies < 30;

  return (
    <section className="rpg-assistant" aria-label="Création assistée de deck">
      <header className="rpg-assistant__header">
        <div>
          <span className="rpg-mode-menu__eyebrow">ATELIER · CRÉATION ASSISTÉE</span>
          <h3>{ETAPES[rangEtape].titre}</h3>
          <p className="rpg-assistant__aide">
            {etape === 'couleurs' && 'Une à trois couleurs : le deck ne sortira jamais de cette identité.'}
            {etape === 'style' && 'Choisissez un plan de jeu : le moteur compose ensuite avec les cartes que vous possédez.'}
          </p>
        </div>
        <button type="button" className="rpg-menu-link" onClick={() => { surSfx('annuler'); onFermer(); }}>
          ✕ Annuler
        </button>
      </header>

      <ol className="rpg-assistant__fil" aria-label="Étapes de la création assistée">
        {ETAPES.map((entree, index) => (
          <li
            key={entree.id}
            className={index === rangEtape ? 'is-courante' : index < rangEtape ? 'is-faite' : ''}
            aria-current={index === rangEtape ? 'step' : undefined}
          >
            <i aria-hidden="true">{index < rangEtape ? '✓' : index + 1}</i>
            {entree.label}
          </li>
        ))}
      </ol>

      {message && <p className="rpg-assistant__message" role="status" aria-live="polite">{message}</p>}

      {etape === 'couleurs' && (
        <div className="rpg-assistant__couleurs" role="group" aria-label="Couleurs du deck">
          {RPG_ELEMENTS.map((couleur) => (
            <button
              key={couleur}
              type="button"
              className={`rpg-assistant__couleur rpg-assistant__couleur--${couleur}${couleurs.has(couleur) ? ' is-on' : ''}`}
              aria-pressed={couleurs.has(couleur)}
              aria-label={`Couleur ${COULEUR_LABELS[couleur]}`}
              onClick={() => { surSfx('menu'); basculerCouleur(couleur); }}
            >
              <i aria-hidden="true">{GLYPHS[couleur] ?? '◇'}</i>
              <strong>{COULEUR_LABELS[couleur]}</strong>
              <small>{couleurs.has(couleur) ? 'retenue' : 'choisir'}</small>
            </button>
          ))}
          <p className="rpg-assistant__astuce">Mono, duo ou tri : les cartes hybrides de vos couleurs sont aussi retenues.</p>
        </div>
      )}

      {etape === 'style' && (
        <>
          <p className="rpg-assistant__compteur" aria-live="polite">
            Couleurs retenues :{' '}
            <b>{[...couleurs].map((couleur) => COULEUR_LABELS[couleur]).join(' · ')}</b>
            {' · '}{potentiel.references} carte{potentiel.references > 1 ? 's' : ''} possédée{potentiel.references > 1 ? 's' : ''}
          </p>
          {collectionTropJuste && (
            <p className="rpg-assistant__message rpg-assistant__message--alerte" role="status">
              Votre collection de ces couleurs permet {potentiel.copies} cartes au plus : le deck généré sera un
              brouillon incomplet. Élargissez vos couleurs ou débloquez des cartes au Souk pour atteindre 30.
            </p>
          )}
          <div className="rpg-assistant__styles" role="group" aria-label="Style de jeu">
            {RPG_STYLES_JEU.map((profil) => (
              <button
                key={profil.id}
                type="button"
                className={`rpg-assistant__style rpg-assistant__style--${profil.id}${style === profil.id ? ' is-on' : ''}`}
                aria-pressed={style === profil.id}
                onClick={() => choisirStyle(profil.id)}
              >
                <i className="rpg-assistant__style-icone" aria-hidden="true">{profil.icone}</i>
                <strong>{profil.label}</strong>
                <small>{profil.accroche}</small>
                <span>{profil.description}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <footer className="rpg-assistant__actions">
        {etape === 'style' && (
          <button
            type="button"
            className="rpg-menu-button"
            onClick={() => { surSfx('annuler'); setMessage(''); setEtape('couleurs'); }}
          >
            ← Retour
          </button>
        )}
        {etape === 'couleurs' && (
          <button type="button" className="rpg-menu-button rpg-menu-button--primary" onClick={versStyle}>
            Continuer →
          </button>
        )}
        {etape === 'style' && (
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            disabled={!style}
            onClick={generer}
          >
            ✦ Générer le deck
          </button>
        )}
        <p className="rpg-atelier__statut" role="status">
          Le moteur n’emploie que vos cartes possédées, dans la limite de vos exemplaires. Rien n’est joué avant l’enregistrement.
        </p>
      </footer>
    </section>
  );
}

export default RpgDeckAssistant;
