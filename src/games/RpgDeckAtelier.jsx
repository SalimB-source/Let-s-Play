import { carteJouableSansTerrain } from './rpgCards.js';
/**
 * L'atelier de deck — l'écran où le joueur compose un deck « maison ».
 *
 * La disposition emprunte au constructeur de Magic: The Gathering Arena :
 *
 *   - **à gauche, la collection en grille** : des cartes illustrées, pas des
 *     rangées de texte. Un clic ajoute une carte ; un clic droit (ou le petit
 *     « − ») la retire — un clic droit qui a son sens ici, et qui ne remonte
 *     donc pas jusqu'à la page, où il ouvrirait la fiche de la carte
 *     (`RpgDuelPage.jsx`). Le nombre d'exemplaires déjà dans le deck est posé
 *     sur la carte, les cartes au quota s'éteignent, les cartes verrouillées
 *     portent un cadenas et disent où se gagner ;
 *   - **au-dessus, une barre de filtres à bascules** : pips de couleur, coût
 *     (1 à 6, 7+), type, rareté, « possédées seulement », recherche, tri ;
 *   - **à droite, le panneau du deck** : son nom, le compteur « N / 30 », la
 *     **courbe de mana**, la répartition des couleurs, puis la liste par
 *     type (créatures, magies, terrains) en rangées compactes « pip · nom ·
 *     × N » ; et le geste d'Arena, **Compléter en terrains**.
 *
 * Les règles de construction sont celles du duel (`rpgValiderDeck`) ; la
 * collection (`rpgCollection.js`) borne ce que la grille laisse ajouter.
 * Un deck s'enregistre **même inachevé** : il rejoint l'étagère comme
 * brouillon, non sélectionnable. La suppression, l'abandon et le vidage
 * demandent une confirmation en deux temps, jamais de `window.confirm`.
 *
 * Ce composant est purement présentationnel : la persistance et la
 * synchronisation vivent dans `useDecksSablier.js`, appelé par la page.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './rpg-deck-atelier.css';
import {
  CARD_RARITIES,
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  bonusArme,
  carteEstArme,
  cardById,
  cardColors,
  cardCopyLimit,
  cardCost,
  cardFrameClass,
  cardFrameColor,
  cardHybridGradient,
  cardMotifClass,
  cardTypeLine,
  terrainManaColors,
} from './rpgCards.js';
// Le sceau des familles de sorts : l'atelier feuillette la collection entière,
// c'est donc là aussi qu'un sort doit se repérer d'un coup d'œil.
import { SortSceau } from './rpgSortSignature.jsx';
import { carteReveleePar, possedeCarte } from './rpgCollection.js';
import {
  RPG_DECK_TAILLE,
  compteExemplaires,
  courbeDeMana,
  nouvelIdDeckMaison,
  peutAjouterCarte,
  repartitionCouleurs,
  rpgValiderDeckMaison,
} from './rpgDeckBuilder.js';

const GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️' };
const COULEUR_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige' };
const COUTS = [1, 2, 3, 4, 5, 6, 7];
const TYPES = [
  { id: 'creature', label: 'Créatures', court: 'Créat.' },
  { id: 'hero', label: 'Héros', court: 'Héros' },
  { id: 'magie', label: 'Magies', court: 'Magies' },
  { id: 'arme', label: 'Armes', court: 'Armes' },
];
const RARETES = Object.entries(CARD_RARITIES).map(([id, info]) => ({
  id, label: info.label, court: info.label.charAt(0), color: info.color,
}));
const ORDRE_RARETE = Object.keys(CARD_RARITIES);
const TRIS = [
  { id: 'cout', label: 'Coût' },
  { id: 'nom', label: 'Nom' },
  { id: 'couleur', label: 'Couleur' },
  { id: 'rarete', label: 'Rareté' },
];
const GROUPES = [
  { id: 'creature', label: 'Créatures', kinds: ['creature', 'hero'] },
  { id: 'magie', label: 'Magies', kinds: ['magie'] },
  { id: 'arme', label: 'Armes', kinds: ['arme'] },
];

const typeLabel = (carte) => (carte.kind === 'terrain' ? 'Terrain'
  : carteEstArme(carte) ? 'Arme'
    : carte.kind === 'magie' ? 'Magie'
      : carte.kind === 'hero' ? 'Héros' : 'Créature');

/** Le groupe de la liste du deck : une arme (même magie à effet « arme ») va dans Armes. */
const groupeDeCarte = (carte) => (carteEstArme(carte) ? 'arme' : carte.kind === 'hero' ? 'creature' : carte.kind);

/** Un bonus signé pour l'affichage : « +2 », « -2 ». */
const signeBonus = (valeur = 0) => (valeur >= 0 ? `+${valeur}` : `${valeur}`);

/** Coût lisible : « 3 mana, dont 1 Braise ». */
const coutLabel = (carte) => {
  const exigences = Object.entries(carte?.colorCost ?? {})
    .map(([couleur, quantite]) => `${quantite} ${COULEUR_LABELS[couleur] ?? couleur}`)
    .join(' et ');
  return `${cardCost(carte)} mana${exigences ? `, dont ${exigences}` : ''}`;
};

const rangCouleur = (carte) => {
  const couleurs = cardColors(carte);
  return couleurs.length > 1 ? RPG_ELEMENTS.length : RPG_ELEMENTS.indexOf(couleurs[0]);
};

/** Un ensemble bascule : ajoute ou retire une valeur. */
const basculer = (ensemble, valeur) => {
  const suivant = new Set(ensemble);
  if (suivant.has(valeur)) suivant.delete(valeur);
  else suivant.add(valeur);
  return suivant;
};

const FILTRES_VIERGES = {
  couleurs: new Set(),
  hybride: false,
  couts: new Set(),
  types: new Set(),
  raretes: new Set(),
  possedees: false,
  recherche: '',
  tri: 'cout',
};

/** Un pip de couleur, le même dessin partout dans l'atelier. */
function Pip({ couleur, taille = '' }) {
  return (
    <i className={`rpg-atelier__pip rpg-atelier__pip--${couleur}${taille ? ` rpg-atelier__pip--${taille}` : ''}`} aria-hidden="true">
      {GLYPHS[couleur] ?? '◇'}
    </i>
  );
}

/** Le médaillon de coût d'une carte : chiffre et pips de ses couleurs. */
function Cout({ carte }) {
  if (!carte || carte.kind === 'terrain') return null;
  const couleurs = cardColors(carte);
  const degrade = cardHybridGradient(carte);
  return (
    <span
      className={`rpg-atelier__cout${degrade ? ' rpg-atelier__cout--hybride' : ''}`}
      style={degrade ? { '--rpg-hybrid-cost-bg': degrade } : undefined}
      aria-label={`Coût : ${coutLabel(carte)}`}
    >
      <b>{cardCost(carte)}</b>
      {couleurs.map((couleur) => <Pip key={couleur} couleur={couleur} taille="mini" />)}
    </span>
  );
}

export function RpgDeckAtelier({
  deckInitial = null,
  nomInitial = 'Deck maison',
  cardIdsInitiaux = [],
  collection = [],
  artUrl = (id) => id,
  onEnregistrer,
  onAnnuler,
  onSupprimer = null,
  onHoverCard = null,
  onLeaveHoverCard = null,
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
  const [confirmerVidage, setConfirmerVidage] = useState(false);
  const [filtres, setFiltres] = useState(FILTRES_VIERGES);
  const titreRef = useRef(null);

  useEffect(() => {
    titreRef.current?.focus?.();
  }, []);

  const compte = useMemo(() => compteExemplaires(cardIds), [cardIds]);
  const stats = useMemo(() => cardIds.reduce((acc, id) => {
    const carte = cardById(id);
    if (!carte) return acc;
    if (carte.kind === 'terrain') acc.terrains += 1;
    else if (carteEstArme(carte)) acc.armes += 1;
    else if (carte.kind === 'magie') acc.magies += 1;
    else acc.creatures += 1;
    return acc;
  }, { terrains: 0, creatures: 0, magies: 0, armes: 0 }), [cardIds]);
  const validation = useMemo(() => rpgValiderDeckMaison(cardIds, collection), [cardIds, collection]);
  const courbe = useMemo(() => courbeDeMana(cardIds), [cardIds]);
  const couleursDeck = useMemo(() => repartitionCouleurs(cardIds), [cardIds]);
  const cartesEmbleme = useMemo(
    () => [...new Set(cardIds)].filter((id) => cardById(id)?.kind !== 'terrain'),
    [cardIds],
  );
  const possedees = (carteId) => possedeCarte(collection, carteId);

  // La grille : le catalogue entier, verrouillées comprises — on voit ce qui manque.
  const cartesFiltrees = useMemo(() => {
    const recherche = filtres.recherche.trim().toLowerCase();
    const retenues = RPG_DUEL_CARDS.filter((carte) => {
      if (!carteJouableSansTerrain(carte)) return false;
      const couleurs = cardColors(carte);
      if (filtres.couleurs.size && !couleurs.some((couleur) => filtres.couleurs.has(couleur))) return false;
      if (filtres.hybride && couleurs.length < 2) return false;
      if (filtres.couts.size) {
        if (carte.kind === 'terrain') return false;
        const palier = Math.min(Math.max(cardCost(carte), 1), 7);
        if (!filtres.couts.has(palier)) return false;
      }
      if (filtres.types.size && !filtres.types.has(carte.kind)) return false;
      if (filtres.raretes.size && !filtres.raretes.has(carte.rarity)) return false;
      if (filtres.possedees && !possedeCarte(collection, carte.id)) return false;
      if (recherche) {
        const corpus = `${carte.name} ${cardTypeLine(carte)} ${carte.text ?? ''}`.toLowerCase();
        if (!corpus.includes(recherche)) return false;
      }
      return true;
    });
    const parNom = (a, b) => a.name.localeCompare(b.name, 'fr');
    const comparateurs = {
      // Les terrains ferment la marche : ce sont les sorts que l'on cherche.
      cout: (a, b) => (a.kind === 'terrain') - (b.kind === 'terrain') || cardCost(a) - cardCost(b) || parNom(a, b),
      nom: parNom,
      couleur: (a, b) => rangCouleur(a) - rangCouleur(b) || cardCost(a) - cardCost(b) || parNom(a, b),
      rarete: (a, b) => ORDRE_RARETE.indexOf(b.rarity) - ORDRE_RARETE.indexOf(a.rarity) || cardCost(a) - cardCost(b) || parNom(a, b),
    };
    return retenues.sort(comparateurs[filtres.tri] ?? comparateurs.cout);
  }, [filtres, collection]);

  const filtresActifs = filtres.couleurs.size > 0 || filtres.hybride || filtres.couts.size > 0
    || filtres.types.size > 0 || filtres.raretes.size > 0 || filtres.possedees || filtres.recherche.trim() !== '';

  const majFiltre = (cle, valeur) => {
    surSfx('menu');
    setFiltres((actuels) => ({ ...actuels, [cle]: valeur }));
  };

  const ajouter = (carte) => {
    const avis = peutAjouterCarte(carte.id, cardIds, collection);
    if (!avis.ok) {
      surSfx('erreur');
      setMessage(avis.raison);
      return;
    }
    surSfx('select');
    setMessage('');
    setConfirmerVidage(false);
    setCardIds((actuels) => [...actuels, carte.id]);
  };

  const retirer = (carteId) => {
    if (!(compte.get(carteId) > 0)) return;
    surSfx('annuler');
    setMessage('');
    setConfirmerVidage(false);
    setCardIds((actuels) => {
      const position = actuels.lastIndexOf(carteId);
      if (position < 0) return actuels;
      return [...actuels.slice(0, position), ...actuels.slice(position + 1)];
    });
  };

  const vider = () => {
    if (!confirmerVidage) {
      surSfx('menu');
      setConfirmerVidage(true);
      setMessage('Toutes les cartes du deck seront retirées : cliquez encore pour confirmer.');
      return;
    }
    surSfx('annuler');
    setConfirmerVidage(false);
    setCardIds([]);
    setBoxArt('');
    setMessage('Deck vidé.');
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
      || JSON.stringify(cardIds) !== JSON.stringify([...(deckInitial?.cardIds ?? cardIdsInitiaux)]);
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

  const survoler = (carte) => (event) => onHoverCard?.(carte, event);
  const quitter = () => onLeaveHoverCard?.();

  const nombrePossedees = RPG_DUEL_CARDS.filter((carte) => possedees(carte.id)).length;
  const deckPlein = cardIds.length === RPG_DECK_TAILLE;
  const deckDeborde = cardIds.length > RPG_DECK_TAILLE;

  return (
    <section className="rpg-atelier" aria-label="Atelier de deck">
      <header className="rpg-atelier__header">
        <div>
          <span className="rpg-mode-menu__eyebrow">{edition ? 'ATELIER · MODIFIER UN DECK' : 'ATELIER · NOUVEAU DECK'}</span>
          <h2 ref={titreRef} tabIndex={-1}>{edition ? deckInitial.nom : 'Un deck à votre main'}</h2>
          <p className="rpg-atelier__aide">
            Clic sur une carte : <b>+1</b> au deck · clic droit : <b>−1</b> · survol : aperçu grand format.
          </p>
          {/* Au doigt, le survol n'existe pas : l'atelier annonce le geste
              d'aperçu de la maison (`rpgLongPress.js`), comme la barre du duel. */}
          <p className="rpg-atelier__astuce">Appui long d’une seconde sur une carte : son aperçu, sans rien ajouter ni retirer.</p>
        </div>
        <button type="button" className="rpg-menu-link" onClick={() => { surSfx('annuler'); abandonner(); }}>
          ✕ Fermer l'atelier
        </button>
      </header>

      <div className="rpg-atelier__panneaux">
        {/* ── La collection en grille ─────────────────────────────────────── */}
        <section className="rpg-atelier__biblio" aria-label="Collection de cartes">
          <div className="rpg-atelier__toolbar" role="group" aria-label="Filtres de la collection">
            <label className="rpg-atelier__search">
              <span className="sr-only">Rechercher une carte</span>
              <input
                type="search"
                aria-label="Rechercher une carte"
                placeholder="Rechercher nom, type, texte…"
                value={filtres.recherche}
                onChange={(event) => setFiltres((actuels) => ({ ...actuels, recherche: event.target.value }))}
              />
            </label>

            <div className="rpg-atelier__toggles rpg-atelier__toggles--couleurs" role="group" aria-label="Couleurs">
              {RPG_ELEMENTS.map((couleur) => (
                <button
                  key={couleur}
                  type="button"
                  className={`rpg-atelier__toggle rpg-atelier__toggle--pip${filtres.couleurs.has(couleur) ? ' is-on' : ''}`}
                  aria-pressed={filtres.couleurs.has(couleur)}
                  aria-label={`Couleur ${COULEUR_LABELS[couleur]}`}
                  title={COULEUR_LABELS[couleur]}
                  onClick={() => majFiltre('couleurs', basculer(filtres.couleurs, couleur))}
                >
                  <Pip couleur={couleur} />
                </button>
              ))}
              <button
                type="button"
                className={`rpg-atelier__toggle${filtres.hybride ? ' is-on' : ''}`}
                aria-pressed={filtres.hybride}
                title="Cartes de plusieurs couleurs"
                onClick={() => majFiltre('hybride', !filtres.hybride)}
              >
                Hybrides
              </button>
            </div>

            <div className="rpg-atelier__toggles rpg-atelier__toggles--couts" role="group" aria-label="Coût en mana">
              {COUTS.map((cout) => (
                <button
                  key={cout}
                  type="button"
                  className={`rpg-atelier__toggle rpg-atelier__toggle--cout${filtres.couts.has(cout) ? ' is-on' : ''}`}
                  aria-pressed={filtres.couts.has(cout)}
                  aria-label={`Coût ${cout === 7 ? '7 ou plus' : cout}`}
                  onClick={() => majFiltre('couts', basculer(filtres.couts, cout))}
                >
                  {cout === 7 ? '7+' : cout}
                </button>
              ))}
            </div>

            <div className="rpg-atelier__toggles" role="group" aria-label="Types">
              {TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`rpg-atelier__toggle${filtres.types.has(type.id) ? ' is-on' : ''}`}
                  aria-pressed={filtres.types.has(type.id)}
                  aria-label={type.label}
                  title={type.label}
                  onClick={() => majFiltre('types', basculer(filtres.types, type.id))}
                >
                  {type.court}
                </button>
              ))}
            </div>

            <div className="rpg-atelier__toggles" role="group" aria-label="Raretés">
              {RARETES.map((rarete) => (
                <button
                  key={rarete.id}
                  type="button"
                  className={`rpg-atelier__toggle rpg-atelier__toggle--rarete${filtres.raretes.has(rarete.id) ? ' is-on' : ''}`}
                  style={{ '--rarete': rarete.color }}
                  aria-pressed={filtres.raretes.has(rarete.id)}
                  aria-label={`Rareté ${rarete.label}`}
                  title={rarete.label}
                  onClick={() => majFiltre('raretes', basculer(filtres.raretes, rarete.id))}
                >
                  <i aria-hidden="true" />{rarete.court}
                </button>
              ))}
            </div>

            <div className="rpg-atelier__toggles rpg-atelier__toggles--fin">
              <button
                type="button"
                className={`rpg-atelier__toggle${filtres.possedees ? ' is-on' : ''}`}
                aria-pressed={filtres.possedees}
                title="Masquer les cartes verrouillées"
                onClick={() => majFiltre('possedees', !filtres.possedees)}
              >
                Possédées
              </button>
              <label className="rpg-atelier__tri">
                <span>Tri</span>
                <select aria-label="Trier la collection" value={filtres.tri} onChange={(event) => majFiltre('tri', event.target.value)}>
                  {TRIS.map((tri) => <option key={tri.id} value={tri.id}>{tri.label}</option>)}
                </select>
              </label>
              {filtresActifs && (
                <button
                  type="button"
                  className="rpg-atelier__toggle rpg-atelier__toggle--reset"
                  onClick={() => { surSfx('annuler'); setFiltres(FILTRES_VIERGES); }}
                >
                  ↺ Réinitialiser
                </button>
              )}
            </div>
          </div>

          <p className="rpg-atelier__count" aria-live="polite">
            <b>{cartesFiltrees.length}</b> carte{cartesFiltrees.length > 1 ? 's' : ''} affichée{cartesFiltrees.length > 1 ? 's' : ''}
            {' · '}{nombrePossedees} possédée{nombrePossedees > 1 ? 's' : ''} sur {RPG_DUEL_CARDS.length}
          </p>

          {cartesFiltrees.length === 0 ? (
            <p className="rpg-atelier__vide">Aucune carte ne correspond à ces filtres.</p>
          ) : (
            <ul className="rpg-atelier__cartes" aria-label="Cartes de la collection">
              {cartesFiltrees.map((carte) => {
                const acquise = possedees(carte.id);
                const dansLeDeck = compte.get(carte.id) ?? 0;
                const limite = cardCopyLimit(carte);
                const avis = peutAjouterCarte(carte.id, cardIds, collection);
                const deblocage = acquise ? null : carteReveleePar(carte.id);
                const estTerrain = carte.kind === 'terrain';
                const estCreature = ['creature', 'hero'].includes(carte.kind);
                const rarete = CARD_RARITIES[carte.rarity]?.label ?? carte.rarity;
                // Le clic droit a son sens dans l'atelier — retirer un
                // exemplaire —, il ne remonte donc pas jusqu'à la page : sans
                // ça, la fiche de la carte s'ouvrirait en plus (RpgDuelPage).
                return (
                  <li
                    key={carte.id}
                    className={[
                      'rpg-atelier__carte',
                      acquise ? '' : 'is-locked',
                      !avis.ok ? 'is-full' : '',
                      dansLeDeck > 0 ? 'is-in-deck' : '',
                    ].filter(Boolean).join(' ')}
                    data-card-id={carte.id}
                    data-color={carte.element}
                    data-type={carte.kind}
                    style={{ '--frame': cardFrameColor(carte), '--rpg-frame-color': cardFrameColor(carte), '--rarete': CARD_RARITIES[carte.rarity]?.color ?? '#f1f3f5' }}
                    onMouseEnter={survoler(carte)}
                    onMouseLeave={quitter}
                    onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); retirer(carte.id); }}
                  >
                    <button
                      type="button"
                      className="rpg-atelier__carte-ajout"
                      aria-label={`Ajouter ${carte.name} au deck${acquise ? '' : ' (verrouillée)'}${dansLeDeck ? ` — ${dansLeDeck} sur ${estTerrain ? '∞' : limite} dans le deck` : ''}`}
                      disabled={!avis.ok}
                      onClick={() => ajouter(carte)}
                      onFocus={survoler(carte)}
                      onBlur={quitter}
                    >
                      <span className={`rpg-atelier__carte-art ${cardFrameClass(carte)} ${cardMotifClass(carte)}`}>
                        <img src={artUrl(carte.id)} alt="" loading="lazy" />
                        {!estTerrain && <Cout carte={carte} />}
                        {estTerrain && (
                          <span className="rpg-atelier__carte-mana" aria-hidden="true">
                            {terrainManaColors(carte).map((couleur) => <Pip key={couleur} couleur={couleur} />)}
                          </span>
                        )}
                        {estCreature && (
                          <span className="rpg-atelier__carte-pt" aria-label={`Attaque ${carte.atk}, défense ${carte.def}`}>
                            {carte.atk}<i>/</i>{carte.def}
                          </span>
                        )}
                        {carteEstArme(carte) && (
                          <span className="rpg-atelier__carte-pt" aria-label={`Porteur : ${signeBonus(bonusArme(carte)?.atk)} attaque, ${signeBonus(bonusArme(carte)?.def)} défense`}>
                            {signeBonus(bonusArme(carte)?.atk)}<i>/</i>{signeBonus(bonusArme(carte)?.def)}
                          </span>
                        )}
                        <SortSceau carte={carte} className="rpg-atelier__carte-sort" />
                        {!acquise && <span className="rpg-atelier__carte-cadenas" aria-hidden="true">🔒</span>}
                      </span>
                      <span className="rpg-atelier__carte-nom">
                        <strong>{carte.name}</strong>
                        <small><i className="rpg-atelier__rarete" aria-hidden="true" />{typeLabel(carte)} · {rarete}</small>
                        {!acquise && deblocage && (
                          <small className="rpg-atelier__carte-verrou">
                            Le Souk la vendra après « {deblocage.etage} »{deblocage.tour ? ` — ${deblocage.tour}` : ''}
                          </small>
                        )}
                      </span>
                    </button>
                    {dansLeDeck > 0 && (
                      <>
                        <b className="rpg-atelier__carte-count" aria-label={`${dansLeDeck} exemplaires dans le deck`}>
                          ×{dansLeDeck}{!estTerrain && <small>/{limite}</small>}
                        </b>
                        <button
                          type="button"
                          className="rpg-atelier__carte-retrait"
                          aria-label={`Retirer un exemplaire de ${carte.name}`}
                          onClick={() => retirer(carte.id)}
                        >
                          −
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Le panneau du deck ──────────────────────────────────────────── */}
        <aside className="rpg-atelier__deck" aria-label="Deck en cours">
          <header className="rpg-atelier__state" aria-label="État du deck en cours">
            <label className="rpg-atelier__champ rpg-atelier__champ--nom">
              <span className="sr-only">Nom du deck</span>
              <input
                type="text"
                maxLength={60}
                value={nom}
                aria-label="Nom du deck"
                placeholder="Nom du deck"
                onChange={(event) => { setNom(event.target.value); setConfirmerAbandon(false); }}
              />
            </label>
            <div className="rpg-atelier__compteur">
              <span className={`rpg-atelier__total${deckPlein ? ' is-full' : ''}${deckDeborde ? ' is-over' : ''}`} aria-live="polite">
                <b>{cardIds.length}</b> / {RPG_DECK_TAILLE} cartes
              </span>
              <span className="rpg-atelier__jauge" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (cardIds.length / RPG_DECK_TAILLE) * 100)}%` }} />
              </span>
            </div>
            <dl className="rpg-atelier__chiffres">
              <div className="is-ok"><dt>Mana</dt><dd>Automatique <small>· 1 par tour, 10 max</small></dd></div>
              <div><dt>Créatures</dt><dd>{stats.creatures}</dd></div>
              <div><dt>Magies</dt><dd>{stats.magies}</dd></div>
              <div><dt>Armes</dt><dd>{stats.armes}</dd></div>
              <div><dt>Coût moyen</dt><dd>{courbe.nonTerrains ? courbe.moyenne.toLocaleString('fr-FR') : '—'}</dd></div>
            </dl>
            <p className={`rpg-atelier__verdict ${validation.ok ? 'is-valid' : 'is-invalid'}`} role="status">
              {validation.ok ? '✓ Deck prêt à jouer' : validation.raisons.join(' · ')}
            </p>
          </header>

          <div className="rpg-atelier__stats">
            <figure className="rpg-atelier__courbe" aria-label="Courbe de mana">
              <figcaption>Courbe de mana</figcaption>
              <div className="rpg-atelier__barres" aria-hidden="true">
                {courbe.paliers.map((palier) => (
                  <span key={palier.cout} className="rpg-atelier__barre" data-cout={palier.cout}>
                    <b>{palier.nombre || ''}</b>
                    <i style={{ height: `${courbe.max ? (palier.nombre / courbe.max) * 100 : 0}%` }} />
                    <small>{palier.label}</small>
                  </span>
                ))}
              </div>
              <p className="sr-only">
                {courbe.paliers.map((palier) => `coût ${palier.label} : ${palier.nombre}`).join(', ')}
              </p>
            </figure>
            <div className="rpg-atelier__couleurs" aria-label="Répartition des couleurs">
              <span className="rpg-atelier__stats-titre">Couleurs</span>
              {couleursDeck.length === 0 ? (
                <p className="rpg-atelier__vide">Aucune couleur encore.</p>
              ) : (
                <ul>
                  {couleursDeck.map((entree) => (
                    <li key={entree.couleur} data-couleur={entree.couleur}>
                      <Pip couleur={entree.couleur} />
                      <span>{COULEUR_LABELS[entree.couleur]}</span>
                      <b>{entree.cartes}</b>
                      <small>{entree.pips} symbole{entree.pips > 1 ? 's' : ''} coloré{entree.pips > 1 ? 's' : ''}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rpg-atelier__outils">
            <button
              type="button"
              className={`rpg-atelier__outil rpg-atelier__outil--danger${confirmerVidage ? ' is-armed' : ''}`}
              disabled={cardIds.length === 0}
              onClick={vider}
            >
              {confirmerVidage ? 'Vider ? (confirmer)' : '⌫ Vider le deck'}
            </button>
          </div>

          <div className="rpg-atelier__liste">
            {GROUPES.map((groupe) => {
              const references = [...compte.entries()]
                .map(([id, nombre]) => ({ carte: cardById(id), nombre }))
                .filter((entree) => entree.carte && groupe.kinds.includes(groupeDeCarte(entree.carte)))
                .sort((a, b) => cardCost(a.carte) - cardCost(b.carte) || a.carte.name.localeCompare(b.carte.name, 'fr'));
              const total = references.reduce((somme, entree) => somme + entree.nombre, 0);
              return (
                <div key={groupe.id} className="rpg-atelier__groupe" data-groupe={groupe.id}>
                  <h4>{groupe.label} <b>{total}</b></h4>
                  {references.length === 0 ? (
                    <p className="rpg-atelier__vide">Aucune carte de ce type pour l'instant.</p>
                  ) : references.map(({ carte, nombre }) => (
                    // Même geste que la grille : retirer, sans ouvrir la fiche.
                    <div
                      key={carte.id}
                      className="rpg-atelier__ligne"
                      data-card-id={carte.id}
                      style={{ '--frame': cardFrameColor(carte) }}
                      onMouseEnter={survoler(carte)}
                      onMouseLeave={quitter}
                      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); retirer(carte.id); }}
                    >
                      <img src={artUrl(carte.id)} alt="" loading="lazy" />
                      {carte.kind === 'terrain'
                        ? <span className="rpg-atelier__cout rpg-atelier__cout--terrain">{terrainManaColors(carte).map((couleur) => <Pip key={couleur} couleur={couleur} taille="mini" />)}</span>
                        : <Cout carte={carte} />}
                      <span className="rpg-atelier__ligne-nom">
                        <strong>{carte.name}</strong>
                        <small>{typeLabel(carte)}{['creature', 'hero'].includes(carte.kind) ? ` · ${carte.atk}/${carte.def}` : carteEstArme(carte) ? ` · ${signeBonus(bonusArme(carte)?.atk)}/${signeBonus(bonusArme(carte)?.def)}` : ''}</small>
                      </span>
                      <span className="rpg-atelier__ligne-compte">
                        <button
                          type="button"
                          aria-label={`Retirer un exemplaire de ${carte.name}`}
                          onClick={() => retirer(carte.id)}
                          onFocus={survoler(carte)}
                          onBlur={quitter}
                        >−</button>
                        <b aria-live="polite">×{nombre}</b>
                        <button
                          type="button"
                          aria-label={`Ajouter un exemplaire de ${carte.name}`}
                          disabled={!peutAjouterCarte(carte.id, cardIds, collection).ok}
                          onClick={() => ajouter(carte)}
                          onFocus={survoler(carte)}
                          onBlur={quitter}
                        >+</button>
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
            {cardIds.length === 0 && (
              <p className="rpg-atelier__vide rpg-atelier__vide--deck">
                Le deck est vide : cliquez les cartes de la collection pour les ajouter, ou copiez un deck de l'étagère pour l'adapter.
              </p>
            )}
          </div>

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
        </aside>
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
