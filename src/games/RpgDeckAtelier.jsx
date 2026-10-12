/**
 * L'atelier de deck — l'écran où le joueur compose un deck « maison ».
 *
 * Deux panneaux : la **bibliothèque** (le catalogue du duel, cartes verrouillées
 * comprises — on voit ce qui manque, et pourquoi), et **le deck en cours** avec
 * ses compteurs vivants (40 cartes, 40 % de terrains, quotas de rareté). Les
 * règles de construction sont celles du duel (`rpgValiderDeck`) ; la collection
 * (`rpgCollection.js`) borne ce que la bibliothèque laisse ajouter.
 *
 * Un deck s'enregistre **même inachevé** : il rejoint l'étagère comme
 * « DECK INCOMPLET », non sélectionnable — le patron existe pour les decks du
 * catalogue. La suppression et l'abandon des modifications demandent une
 * confirmation en deux temps, jamais de `window.confirm`.
 *
 * Ce composant est purement présentationnel : la persistance et la
 * synchronisation vivent dans `useDecksSablier.js`, appelé par la page.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './rpg-deck-atelier.css';
import {
  CARD_RARITIES,
  RPG_DUEL_CARDS,
  cardById,
  cardColors,
  cardCopyLimit,
  cardCost,
} from './rpgCards.js';
import { carteDebloqueePar, possedeCarte } from './rpgCollection.js';
import {
  compteExemplaires,
  nouvelIdDeckMaison,
  peutAjouterCarte,
  rpgValiderDeckMaison,
} from './rpgDeckBuilder.js';

const GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️' };
const COULEUR_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige' };
const OPTIONS_COULEUR = [
  { id: 'toutes', label: 'Toutes les couleurs' },
  { id: 'braise', label: 'Braise' },
  { id: 'eau', label: 'Eau' },
  { id: 'sable', label: 'Sable · Désert' },
  { id: 'neige', label: 'Neige · Glacier' },
  { id: 'hybride', label: 'Hybrides · deux couleurs ou plus' },
];
const OPTIONS_TYPE = [
  { id: 'tous', label: 'Tous les types' },
  { id: 'creature', label: 'Créatures' },
  { id: 'hero', label: 'Héros' },
  { id: 'terrain', label: 'Terrains' },
  { id: 'magie', label: 'Magies' },
];
const GROUPES = [
  { id: 'terrain', label: 'Terrains' },
  { id: 'creature', label: 'Créatures & héros' },
  { id: 'magie', label: 'Magies' },
];

const typeLabel = (carte) => (carte.kind === 'terrain' ? 'Terrain'
  : carte.kind === 'magie' ? 'Magie'
    : carte.kind === 'hero' ? 'Héros' : 'Créature');

/** Coût lisible : « 3 mana, dont 1 Braise ». */
const coutLabel = (carte) => {
  const exigences = Object.entries(carte?.colorCost ?? {})
    .map(([couleur, quantite]) => `${quantite} ${COULEUR_LABELS[couleur] ?? couleur}`)
    .join(' et ');
  return `${cardCost(carte)} mana${exigences ? `, dont ${exigences}` : ''}`;
};

export function RpgDeckAtelier({
  deckInitial = null,
  nomInitial = 'Deck maison',
  cardIdsInitiaux = [],
  collection = [],
  artUrl = (id) => id,
  onEnregistrer,
  onAnnuler,
  onSupprimer = null,
  surSfx = () => {},
}) {
  const edition = Boolean(deckInitial?.maison);
  const [nom, setNom] = useState(deckInitial?.nom ?? nomInitial);
  // En édition, les cartes viennent du deck existant ; en création/copie, de la liste fournie.
  const [cardIds, setCardIds] = useState(() => [...(deckInitial?.cardIds ?? cardIdsInitiaux)]);
  const [boxArt, setBoxArt] = useState(deckInitial?.boxArt ?? '');
  const [message, setMessage] = useState('');
  const [confirmerAbandon, setConfirmerAbandon] = useState(false);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [couleur, setCouleur] = useState('toutes');
  const [type, setType] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const titreRef = useRef(null);

  useEffect(() => {
    titreRef.current?.focus?.();
  }, []);

  const compte = useMemo(() => compteExemplaires(cardIds), [cardIds]);
  const stats = useMemo(() => cardIds.reduce((acc, id) => {
    const carte = cardById(id);
    if (!carte) return acc;
    if (carte.kind === 'terrain') acc.terrains += 1;
    else if (carte.kind === 'magie') acc.magies += 1;
    else acc.creatures += 1;
    return acc;
  }, { terrains: 0, creatures: 0, magies: 0 }), [cardIds]);
  const validation = useMemo(() => rpgValiderDeckMaison(cardIds, collection), [cardIds, collection]);
  const pourcentageTerrains = cardIds.length ? Math.round((stats.terrains / cardIds.length) * 100) : 0;
  const cartesEmbleme = useMemo(
    () => [...new Set(cardIds)].filter((id) => cardById(id)?.kind !== 'terrain'),
    [cardIds],
  );

  // La bibliothèque : le catalogue entier, verrouillées comprises — on voit ce qui manque.
  const cartesFiltrees = useMemo(() => RPG_DUEL_CARDS.filter((carte) => {
    const couleurs = cardColors(carte);
    const couleurCorrespond = couleur === 'toutes'
      || (couleur === 'hybride' ? couleurs.length > 1 : couleurs.includes(couleur));
    const typeCorrespond = type === 'tous' || carte.kind === type;
    const rechercheCorrespond = !recherche.trim()
      || carte.name.toLowerCase().includes(recherche.trim().toLowerCase());
    return couleurCorrespond && typeCorrespond && rechercheCorrespond;
  }), [couleur, type, recherche]);

  const ajouter = (carte) => {
    const avis = peutAjouterCarte(carte.id, cardIds, collection);
    if (!avis.ok) {
      surSfx('erreur');
      setMessage(avis.raison);
      return;
    }
    surSfx('select');
    setMessage('');
    setCardIds((actuels) => [...actuels, carte.id]);
  };

  const retirer = (carteId) => {
    surSfx('annuler');
    setMessage('');
    setCardIds((actuels) => {
      const position = actuels.lastIndexOf(carteId);
      if (position < 0) return actuels;
      return [...actuels.slice(0, position), ...actuels.slice(position + 1)];
    });
  };

  const enregistrer = () => {
    if (!nom.trim()) {
      surSfx('erreur');
      setMessage('Donnez un nom à votre deck.');
      return;
    }
    if (cardIds.length === 0) {
      surSfx('erreur');
      setMessage('Ajoutez au moins une carte : un casier vide ne s\'enregistre pas.');
      return;
    }
    const enregistrement = {
      ...(edition ? deckInitial : {}),
      id: edition ? deckInitial.id : nouvelIdDeckMaison(),
      nom: nom.trim(),
      cardIds: [...cardIds],
      boxArt: boxArt || null,
    };
    const resultat = onEnregistrer(enregistrement);
    if (resultat && !resultat.ok) {
      surSfx('erreur');
      setMessage(resultat.raison ?? 'Enregistrement impossible.');
    }
    // Succès : la page referme l'atelier et confirme sur l'étagère.
  };

  const abandonner = () => {
    const sale = nom !== (deckInitial?.nom ?? nomInitial)
      || boxArt !== (deckInitial?.boxArt ?? '')
      || JSON.stringify(cardIds) !== JSON.stringify([...cardIdsInitiaux]);
    if (sale && !confirmerAbandon) {
      setConfirmerAbandon(true);
      setMessage('Des modifications ne sont pas enregistrées : cliquez encore pour les abandonner.');
      return;
    }
    onAnnuler();
  };

  const supprimer = () => {
    if (!confirmerSuppression) {
      setConfirmerSuppression(true);
      setMessage('Le deck sera retiré de l\'étagère : cliquez encore pour confirmer.');
      return;
    }
    onSupprimer?.(deckInitial.id);
  };

  const possedees = carteId => possedeCarte(collection, carteId);

  return (
    <section className="rpg-atelier" aria-label="Atelier de deck">
      <header className="rpg-atelier__header">
        <div>
          <span className="rpg-mode-menu__eyebrow">{edition ? 'ATELIER · MODIFIER UN DECK' : 'ATELIER · NOUVEAU DECK'}</span>
          <h2 ref={titreRef} tabIndex={-1}>{edition ? deckInitial.nom : 'Un deck à votre main'}</h2>
        </div>
        <button type="button" className="rpg-menu-link" onClick={() => { surSfx('annuler'); abandonner(); }}>
          ✕ Fermer l'atelier
        </button>
      </header>

      <div className="rpg-atelier__state" aria-label="État du deck en cours">
        <span className="rpg-atelier__total" aria-live="polite"><b>{cardIds.length}</b> / 40 cartes</span>
        <span aria-live="polite">{stats.terrains} terrains · {pourcentageTerrains} % <small>(40 % min)</small></span>
        <span>{stats.creatures} créatures · {stats.magies} magies</span>
        <span className={validation.ok ? 'is-valid' : 'is-invalid'} role="status">
          {validation.ok ? '✓ Deck prêt à jouer' : validation.raisons.join(' · ')}
        </span>
      </div>

      <div className="rpg-atelier__panneaux">
        <section className="rpg-atelier__biblio" aria-label="Bibliothèque de cartes">
          <header>
            <h3>Bibliothèque</h3>
            <p aria-live="polite">{collection.length} cartes possédées sur {RPG_DUEL_CARDS.length} du catalogue.</p>
            {/* Au doigt, le survol n'existe pas : l'atelier annonce le geste
                d'aperçu, comme la barre du duel le fait à son ouverture. */}
            <p className="rpg-atelier__astuce">Appui long d’une seconde sur une carte : son aperçu, sans rien ajouter ni retirer.</p>
          </header>
          <div className="rpg-atelier__filters">
            <label>
              <span>Couleur</span>
              <select aria-label="Filtrer la bibliothèque par couleur" value={couleur} onChange={(event) => { surSfx('menu'); setCouleur(event.target.value); }}>
                {OPTIONS_COULEUR.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Type</span>
              <select aria-label="Filtrer la bibliothèque par type" value={type} onChange={(event) => { surSfx('menu'); setType(event.target.value); }}>
                {OPTIONS_TYPE.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Recherche</span>
              <input
                type="search"
                aria-label="Rechercher une carte"
                placeholder="Nom de carte…"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
              />
            </label>
          </div>
          {cartesFiltrees.length === 0 ? (
            <p className="rpg-atelier__vide">Aucune carte ne correspond à ces filtres.</p>
          ) : (
            <ul className="rpg-atelier__cartes">
              {cartesFiltrees.map((carte) => {
                const acquise = possedees(carte.id);
                const dansLeDeck = compte.get(carte.id) ?? 0;
                const limite = cardCopyLimit(carte);
                const avis = peutAjouterCarte(carte.id, cardIds, collection);
                const deblocage = acquise ? null : carteDebloqueePar(carte.id);
                return (
                  <li
                    key={carte.id}
                    className={`rpg-atelier__carte${acquise ? '' : ' is-locked'}${!avis.ok ? ' is-full' : ''}`}
                    data-card-id={carte.id}
                    data-color={carte.element}
                    data-type={carte.kind}
                  >
                    <img src={artUrl(carte.id)} alt="" loading="lazy" />
                    <span className="rpg-atelier__carte-nom">
                      <strong>{carte.name}</strong>
                      <small>{typeLabel(carte)} · {coutLabel(carte)} · {CARD_RARITIES[carte.rarity]?.label ?? carte.rarity}</small>
                      {!acquise && deblocage && (
                        <small className="rpg-atelier__carte-verrou">
                          🔒 Vainquez « {deblocage.etage} »{deblocage.tour ? ` — ${deblocage.tour}` : ''}
                        </small>
                      )}
                    </span>
                    {dansLeDeck > 0 && <b className="rpg-atelier__carte-count" aria-label={`${dansLeDeck} exemplaires dans le deck`}>×{dansLeDeck}</b>}
                    <button
                      type="button"
                      className="rpg-atelier__carte-ajout"
                      aria-label={`Ajouter ${carte.name} au deck${acquise ? '' : ' (verrouillée)'}`}
                      disabled={!avis.ok}
                      onClick={() => ajouter(carte)}
                    >
                      +
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rpg-atelier__deck" aria-label="Contenu du deck en cours">
          <header>
            <h3>Votre deck</h3>
            <label className="rpg-atelier__champ">
              <span>Nom du deck</span>
              <input
                type="text"
                maxLength={60}
                value={nom}
                aria-label="Nom du deck"
                onChange={(event) => { setNom(event.target.value); setConfirmerAbandon(false); }}
              />
            </label>
            <label className="rpg-atelier__champ">
              <span>Carte emblématique du boîtier</span>
              <select
                aria-label="Carte emblématique du boîtier"
                value={boxArt}
                onChange={(event) => { surSfx('menu'); setBoxArt(event.target.value); }}
              >
                <option value="">Automatique (première carte du deck)</option>
                {cartesEmbleme.map((id) => (
                  <option key={id} value={id}>{cardById(id)?.name ?? id}</option>
                ))}
              </select>
            </label>
          </header>
          {GROUPES.map((groupe) => {
            const references = [...compte.entries()]
              .map(([id, nombre]) => ({ carte: cardById(id), nombre }))
              .filter((entree) => entree.carte && (groupe.id === 'creature'
                ? ['creature', 'hero'].includes(entree.carte.kind)
                : entree.carte.kind === groupe.id));
            return (
              <div key={groupe.id} className="rpg-atelier__groupe">
                <h4>{groupe.label} <b>{references.reduce((total, entree) => total + entree.nombre, 0)}</b></h4>
                {references.length === 0 ? (
                  <p className="rpg-atelier__vide">Aucune carte de ce type pour l'instant.</p>
                ) : references.map(({ carte, nombre }) => (
                  <div key={carte.id} className="rpg-atelier__ligne" data-card-id={carte.id}>
                    <img src={artUrl(carte.id)} alt="" loading="lazy" />
                    <span>
                      <strong>{carte.name}</strong>
                      <small>{typeLabel(carte)} · {coutLabel(carte)}</small>
                    </span>
                    <span className="rpg-atelier__ligne-compte">
                      <button
                        type="button"
                        aria-label={`Retirer une exemplaire de ${carte.name}`}
                        onClick={() => retirer(carte.id)}
                      >−</button>
                      <b aria-live="polite">×{nombre}</b>
                      <button
                        type="button"
                        aria-label={`Ajouter une exemplaire de ${carte.name}`}
                        disabled={!peutAjouterCarte(carte.id, cardIds, collection).ok}
                        onClick={() => ajouter(carte)}
                      >+</button>
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
          {cardIds.length === 0 && (
            <p className="rpg-atelier__vide">Le deck est vide : ajoutez des cartes depuis la bibliothèque, ou copiez un deck de l'étagère pour l'adapter.</p>
          )}
        </section>
      </div>

      <footer className="rpg-atelier__actions">
        <button
          type="button"
          className="rpg-menu-button rpg-menu-button--primary"
          disabled={!nom.trim() || cardIds.length === 0}
          onClick={() => { surSfx('apparition'); enregistrer(); }}
        >
          ⌸ Enregistrer le deck
        </button>
        <button
          type="button"
          className="rpg-menu-button"
          onClick={() => { surSfx('annuler'); abandonner(); }}
        >
          {confirmerAbandon ? 'Abandonner les modifications ?' : 'Annuler'}
        </button>
        {edition && onSupprimer && (
          <button
            type="button"
            className="rpg-menu-button rpg-atelier__danger"
            onClick={() => { surSfx('erreur'); supprimer(); }}
          >
            {confirmerSuppression ? 'Confirmer la suppression' : 'Supprimer ce deck'}
          </button>
        )}
        <p className="rpg-atelier__statut" role="status" aria-live="polite">
          {message || (validation.ok
            ? 'Ce deck peut être sélectionné et joué en duel libre dès l\'enregistrement.'
            : 'Brouillon enregistré tel quel : il restera « incomplet » tant qu\'il ne tient pas les règles.')}
        </p>
      </footer>
    </section>
  );
}

export default RpgDeckAtelier;
