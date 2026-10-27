/**
 * L'assistant de création assistée — le wizard en trois pas de l'atelier.
 *
 * « ✦ Création assistée » ouvre ce panneau à la place de la collection :
 *
 *   1. **Les couleurs** — 1 à 3 des cinq éléments du jeu ;
 *   2. **4 créatures** — les créatures et héros possédés de ces couleurs ;
 *   3. **4 sorts** — magies et armes, mêmes règles.
 *
 * « Générer le deck » rend la main à l'atelier : `genererDeckAssiste`
 * (`rpgDeckAuto.js`) pose les huit choix à deux exemplaires et l'IA complète
 * autour. Le deck pré-rempli atterrit dans l'édition normale — chaque carte
 * reste retirable, ajoutable, jusqu'à l'enregistrement.
 *
 * Composant présentationnel, comme l'atelier : pas de persistance ici, les
 * cartes choisies remontent par `onGenerer({ couleurs, creatures, sorts })`.
 * Les vignettes portent `data-card-id` : l'appui long de la maison
 * (`rpgLongPress.js`) y ouvre l'aperçu sans rien sélectionner.
 */

import { useMemo, useState } from 'react';
import {
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  cardColors,
  cardCost,
  cardCopyLimit,
  cardFrameColor,
  cardFrameClass,
  cardMotifClass,
  cardTypeLine,
  carteEstArme,
} from './rpgCards.js';
import { SortSceau } from './rpgSortSignature.jsx';
import { plafondVisible } from './rpgCollection.js';
import {
  RPG_ASSISTANT_CREATURES,
  RPG_ASSISTANT_SORTS,
  cartesPourEtape,
  familleDeCarte,
} from './rpgDeckAuto.js';

const GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', tenebres: '💀' };
const COULEUR_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
/**
 * Le catalogue que l'assistant pose sur la table. `limiteDe` n'est PAS le quota
 * de rareté par défaut : l'assistant compose avec le **stock** (doc 13, D10),
 * sinon il générerait un deck à trente cartes dont l'atelier refuserait les
 * doublons — un deck né conforme dans l'assistant, hors stock à l'enregistrement.
 */
const cataloguePour = (collection, exemplaires) => ({
  cartes: RPG_DUEL_CARDS,
  couleursDe: cardColors,
  limiteDe: (carte) => (carte ? plafondVisible(collection, carte.id, exemplaires) : 0),
});

const typeLabel = (carte) => (carteEstArme(carte) ? 'Arme'
  : carte.kind === 'magie' ? 'Magie'
    : carte.kind === 'hero' ? 'Héros' : 'Créature');

/** Étapes du wizard, dans l'ordre — l'en-tête les montre comme un fil. */
const ETAPES = [
  { id: 'couleurs', label: 'Couleurs', titre: 'Vos couleurs' },
  { id: 'creatures', label: '4 créatures', titre: 'Quatre créatures' },
  { id: 'sorts', label: '4 sorts', titre: 'Quatre sorts' },
];

/** Une vignette de choix : un clic coche ou décoche, la coche reste posée. */
function Vignette({ carte, choisi, max, onChoisir, artUrl, surSfx, onHoverCard, onLeaveHoverCard }) {
  const survoler = (event) => onHoverCard?.(carte, event);
  const quitter = () => onLeaveHoverCard?.();
  const famille = familleDeCarte(carte);
  return (
    <li
      className={`rpg-assistant__carte${choisi ? ' is-choisie' : ''}`}
      data-card-id={carte.id}
      style={{ '--frame': cardFrameColor(carte), '--rpg-frame-color': cardFrameColor(carte) }}
      onMouseEnter={survoler}
      onMouseLeave={quitter}
    >
      <button
        type="button"
        className="rpg-assistant__carte-bouton"
        aria-pressed={choisi}
        aria-label={`${choisi ? 'Retirer' : 'Choisir'} ${carte.name} — ${typeLabel(carte)}, ${cardCost(carte)} mana`}
        onClick={() => { surSfx(choisi ? 'annuler' : 'select'); onChoisir(carte.id); }}
        onFocus={survoler}
        onBlur={quitter}
      >
        <span className={`rpg-assistant__carte-art ${cardFrameClass(carte)} ${cardMotifClass(carte)}`}>
          <img src={artUrl(carte.id)} alt="" loading="lazy" />
          <b className="rpg-assistant__cout" aria-hidden="true">{cardCost(carte)}</b>
          {choisi && <span className="rpg-assistant__coche" aria-hidden="true">✓</span>}
          {famille === 'creature' && (
            <span className="rpg-assistant__pt" aria-hidden="true">{carte.atk}<i>/</i>{carte.def}</span>
          )}
          <SortSceau carte={carte} className="rpg-assistant__carte-sort" />
        </span>
        <span className="rpg-assistant__carte-nom">
          <strong>{carte.name}</strong>
          <small>{typeLabel(carte)} · {cardTypeLine(carte)}</small>
        </span>
      </button>
    </li>
  );
}

export function RpgDeckAssistant({
  collection = [],
  exemplaires = null,
  artUrl = (id) => id,
  onGenerer,
  onFermer,
  surSfx = () => {},
  onHoverCard = null,
  onLeaveHoverCard = null,
}) {
  const [etape, setEtape] = useState('couleurs');
  const [couleurs, setCouleurs] = useState(() => new Set());
  const [creatures, setCreatures] = useState([]);
  const [sorts, setSorts] = useState([]);
  const [message, setMessage] = useState('');

  const rangEtape = ETAPES.findIndex((entree) => entree.id === etape);
  const catalogue = useMemo(() => cataloguePour(collection, exemplaires), [collection, exemplaires]);
  const candidatsCreatures = useMemo(
    () => cartesPourEtape([...couleurs], 'creatures', catalogue, collection),
    [couleurs, collection, catalogue],
  );
  const candidatsSorts = useMemo(
    () => cartesPourEtape([...couleurs], 'sorts', catalogue, collection),
    [couleurs, collection, catalogue],
  );

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

  const basculerCarte = (liste, setListe, maximum) => (id) => {
    setMessage('');
    setListe((actuels) => {
      if (actuels.includes(id)) return actuels.filter((entree) => entree !== id);
      if (actuels.length >= maximum) {
        surSfx('erreur');
        setMessage(`${maximum} cartes au plus à cette étape : retirez-en une pour en choisir une autre.`);
        return actuels;
      }
      return [...actuels, id];
    });
  };

  const versCreations = () => {
    if (!couleurs.size) {
      surSfx('erreur');
      setMessage('Choisissez d’abord au moins une couleur.');
      return;
    }
    surSfx('menu');
    setEtape('creatures');
  };

  const versSorts = () => {
    if (creatures.length !== RPG_ASSISTANT_CREATURES) {
      surSfx('erreur');
      setMessage(`Choisissez exactement ${RPG_ASSISTANT_CREATURES} créatures pour continuer.`);
      return;
    }
    surSfx('menu');
    setEtape('sorts');
  };

  const generer = () => {
    if (sorts.length !== RPG_ASSISTANT_SORTS) {
      surSfx('erreur');
      setMessage(`Choisissez exactement ${RPG_ASSISTANT_SORTS} sorts pour lancer la génération.`);
      return;
    }
    surSfx('apparition');
    onGenerer({ couleurs: [...couleurs], creatures: [...creatures], sorts: [...sorts] });
  };

  const peutChoisir = etape === 'creatures'
    ? candidatsCreatures.length >= RPG_ASSISTANT_CREATURES
    : candidatsSorts.length >= RPG_ASSISTANT_SORTS;

  return (
    <section className="rpg-assistant" aria-label="Création assistée de deck">
      <header className="rpg-assistant__header">
        <div>
          <span className="rpg-mode-menu__eyebrow">ATELIER · CRÉATION ASSISTÉE</span>
          <h3>{ETAPES[rangEtape].titre}</h3>
          <p className="rpg-assistant__aide">
            {etape === 'couleurs' && 'Une à trois couleurs : le deck ne sortira jamais de cette identité.'}
            {etape === 'creatures' && 'Choisissez les créatures qui porteront votre deck : l’IA bâtit autour.'}
            {etape === 'sorts' && 'Magies et armes complémentaires, puis l’IA remplit le reste de la collection.'}
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
          <p className="rpg-assistant__astuce">Mono, duo, tri : les hybrides de vos couleurs sont bienvenus.</p>
        </div>
      )}

      {etape !== 'couleurs' && (
        <>
          <p className="rpg-assistant__compteur" aria-live="polite">
            {etape === 'creatures'
              ? <><b>{creatures.length}</b> / {RPG_ASSISTANT_CREATURES} créatures choisies</>
              : <><b>{sorts.length}</b> / {RPG_ASSISTANT_SORTS} sorts choisis</>}
            {' · '}
            {[...couleurs].map((couleur) => COULEUR_LABELS[couleur]).join(' · ')}
          </p>
          {!peutChoisir && (
            <p className="rpg-assistant__message" role="status">
              Votre collection ne compte pas assez de cartes de ces couleurs à cette étape : revenez en arrière
              et élargissez les couleurs.
            </p>
          )}
          {etape === 'creatures' && (
            candidatsCreatures.length === 0 ? (
              <p className="rpg-assistant__vide">Aucune créature possédée dans ces couleurs.</p>
            ) : (
              <ul className="rpg-assistant__grille" aria-label="Créatures de vos couleurs">
                {candidatsCreatures.map((carte) => (
                  <Vignette
                    key={carte.id}
                    carte={carte}
                    choisi={creatures.includes(carte.id)}
                    onChoisir={basculerCarte(creatures, setCreatures, RPG_ASSISTANT_CREATURES)}
                    artUrl={artUrl}
                    surSfx={surSfx}
                    onHoverCard={onHoverCard}
                    onLeaveHoverCard={onLeaveHoverCard}
                  />
                ))}
              </ul>
            )
          )}
          {etape === 'sorts' && (
            candidatsSorts.length === 0 ? (
              <p className="rpg-assistant__vide">Aucun sort possédé dans ces couleurs.</p>
            ) : (
              <ul className="rpg-assistant__grille" aria-label="Sorts de vos couleurs">
                {candidatsSorts.map((carte) => (
                  <Vignette
                    key={carte.id}
                    carte={carte}
                    choisi={sorts.includes(carte.id)}
                    onChoisir={basculerCarte(sorts, setSorts, RPG_ASSISTANT_SORTS)}
                    artUrl={artUrl}
                    surSfx={surSfx}
                    onHoverCard={onHoverCard}
                    onLeaveHoverCard={onLeaveHoverCard}
                  />
                ))}
              </ul>
            )
          )}
        </>
      )}

      <footer className="rpg-assistant__actions">
        {etape !== 'couleurs' && (
          <button
            type="button"
            className="rpg-menu-button"
            onClick={() => { surSfx('annuler'); setMessage(''); setEtape(etape === 'sorts' ? 'creatures' : 'couleurs'); }}
          >
            ← Retour
          </button>
        )}
        {etape === 'couleurs' && (
          <button type="button" className="rpg-menu-button rpg-menu-button--primary" onClick={versCreations}>
            Continuer →
          </button>
        )}
        {etape === 'creatures' && (
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            disabled={creatures.length !== RPG_ASSISTANT_CREATURES}
            onClick={versSorts}
          >
            Continuer →
          </button>
        )}
        {etape === 'sorts' && (
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            disabled={sorts.length !== RPG_ASSISTANT_SORTS}
            onClick={generer}
          >
            ✦ Générer le deck
          </button>
        )}
        <p className="rpg-atelier__statut" role="status">
          L’IA complétera avec les cartes qui font écho aux vôtres — tribus, mécaniques, courbe de mana.
          Rien n’est joué avant l’enregistrement.
        </p>
      </footer>
    </section>
  );
}

export default RpgDeckAssistant;
