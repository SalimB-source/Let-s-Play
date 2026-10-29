/**
 * L'atelier de création et d'édition de deck — `src/games/RpgDeckAtelier.jsx`
 * ----------------------------------------------------------------------------
 * Inspiré de l'atelier de deck de MTG Arena : un espace plein écran scindé en
 * deux colonnes lisibles et pratiques, sans double défilement.
 *
 *  - À gauche (~73 %), la collection filtrable sur une seule barre d'outils
 *    (recherche instantanée, médaillons d'éléments circulaires, « Possédées »,
 *    « Filtres ») et une grille de vraies cartes lisibles (titre, coût,
 *    illustration cadrée, type/rareté, résumé d'effet en clair, attaque/défense)
 *    surmontées de losanges d'exemplaires (`◆` dans le deck, `◇` en stock).
 *  - À droite (~27 %), la colonne du deck : boîtier miniature + titre éditable
 *    + compteur `N / 30 cartes` + mini-courbe de mana intégrée en tête, pile
 *    verticale de barres horizontales triées par coût (`1x` · Nom · Coût) au
 *    centre, et bouton principal doré/orangé « Enregistrer » ancré en bas.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { resumeCarte } from './rpgCardResume.js';
import {
  CARD_RARITIES,
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  cardById,
  cardColorCost,
  cardColors,
  cardCopyLimit,
  cardCost,
  cardFrameClass,
  cardFrameColor,
  cardMotifClass,
  cardTypeLine,
  carteJouableSansTerrain,
} from './rpgCards.js';
import { carteReveleePar, plafondVisible } from './rpgCollection.js';
import { suggestionsNomsDeck } from './rpgDeckAuto.js';
import {
  RPG_COURBE_PALIERS,
  RPG_DECK_NOM_MAX,
  RPG_DECK_TAILLE,
  compteExemplaires,
  courbeDeMana,
  nouvelIdDeckMaison,
  peutAjouterCarte,
  repartitionCouleurs,
  rpgValiderDeckMaison,
} from './rpgDeckBuilder.js';
import { ElementEmblem } from './rpgEmblemes.jsx';

const GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', tenebres: '💀', neutre: '◇' };
const COULEUR_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
const RARETE_ORDRE = { commune: 0, inhabituelle: 1, rare: 2, mythique: 3 };

/** Les trois familles d'un deck de duel pour l'affichage groupé optionnel. */
const GROUPES = [
  { id: 'creature', titre: 'Créatures', accepte: (carte) => carte.kind === 'creature' || carte.kind === 'hero' },
  { id: 'magie', titre: 'Magies', accepte: (carte) => carte.kind === 'instant' || carte.kind === 'sorcery' },
  { id: 'arme', titre: 'Armes', accepte: (carte) => carte.kind === 'weapon' },
];

const TYPES_FILTRE = [
  { id: 'tous', label: 'Tous' },
  { id: 'creature', label: 'Créat.', test: (c) => c.kind === 'creature' },
  { id: 'hero', label: 'Héros', test: (c) => c.kind === 'hero' },
  { id: 'magie', label: 'Magies', test: (c) => c.kind === 'instant' || c.kind === 'sorcery' },
  { id: 'arme', label: 'Armes', test: (c) => c.kind === 'weapon' },
];

const RARETES_FILTRE = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'commune', label: 'Communes' },
  { id: 'inhabituelle', label: 'Inhabituelles' },
  { id: 'rare', label: 'Rares' },
  { id: 'mythique', label: 'Mythiques' },
];

const TRIS = [
  { id: 'cout', label: 'Coût ↑' },
  { id: 'cout-desc', label: 'Coût ↓' },
  { id: 'nom', label: 'Nom A→Z' },
  { id: 'rarete', label: 'Rareté' },
];

function pipsDeCout(carte) {
  const detail = cardColorCost(carte);
  if (!detail || typeof detail !== 'object') return [];
  const liste = [];
  for (const element of RPG_ELEMENTS) {
    const n = Number(detail[element]) || 0;
    for (let i = 0; i < n; i += 1) liste.push(element);
  }
  return liste;
}

/** Pips élémentaires compacts : un symbole teinté par exigence colorée du coût. */
function Pip({ element }) {
  return (
    <i
      className={`rpg-atelier__pip rpg-atelier__pip--${element}`}
      title={COULEUR_LABELS[element] ?? element}
      aria-hidden="true"
    >
      {GLYPHS[element] ?? GLYPHS.neutre}
    </i>
  );
}

/**
 * Médaillon de coût (valeur totale + pips élémentaires), posé en haut à droite
 * des cartes de la collection et à l'extrémité droite des barres du deck.
 */
function Cout({ carte }) {
  const pips = pipsDeCout(carte);
  const couleurs = cardColors(carte);
  const modificateur = couleurs.length > 1
    ? 'hybride'
    : (couleurs[0] ?? 'neutre');
  return (
    <span
      className={`rpg-atelier__cout rpg-atelier__cout--${modificateur}`}
      aria-label={`Coût ${cardCost(carte)}`}
    >
      <b>{cardCost(carte)}</b>
      {pips.map((pip, index) => <Pip key={`${carte.id}-pip-${index}`} element={pip} />)}
    </span>
  );
}

/** Sceau discret sur l'illustration des sorts pour les distinguer au premier coup d'œil. */
function SortSceau({ carte }) {
  if (carte.kind !== 'instant' && carte.kind !== 'sorcery') return null;
  const rapide = carte.kind === 'instant';
  return (
    <span
      className={`rpg-atelier__sceau rpg-atelier__sceau--${rapide ? 'instant' : 'sorcery'}`}
      title={rapide ? 'Magie rapide — jouable à tout moment' : 'Sorcellerie — jouable à votre phase principale'}
      aria-hidden="true"
    >
      {rapide ? (
        <svg viewBox="0 0 24 24"><path d="M13.5 2 5 13.5h6L9.5 22 19 10.5h-6L13.5 2z" /></svg>
      ) : (
        <svg viewBox="0 0 24 24"><path d="M12 2.5 14.6 9l6.9.6-5.2 4.5 1.6 6.8L12 17.3 6.1 20.9l1.6-6.8-5.2-4.5L9.4 9 12 2.5z" /></svg>
      )}
    </span>
  );
}

function trierCatalogue(liste, tri) {
  return [...liste].sort((a, b) => {
    if (tri === 'nom') return a.name.localeCompare(b.name, 'fr');
    if (tri === 'rarete') {
      const ecart = (RARETE_ORDRE[b.rarity] ?? 0) - (RARETE_ORDRE[a.rarity] ?? 0);
      if (ecart !== 0) return ecart;
    }
    if (tri === 'cout-desc') {
      const ecart = cardCost(b) - cardCost(a);
      if (ecart !== 0) return ecart;
      return a.name.localeCompare(b.name, 'fr');
    }
    const ecartCout = cardCost(a) - cardCost(b);
    if (ecartCout !== 0) return ecartCout;
    return a.name.localeCompare(b.name, 'fr');
  });
}

function memeRecette(a, b) {
  if (a.length !== b.length) return false;
  const triA = [...a].sort();
  const triB = [...b].sort();
  return triA.every((id, i) => id === triB[i]);
}

/** Ligne de type courte et lisible pour le bandeau intermédiaire d'une carte. */
function typeCourtCarte(carte) {
  const couleurs = cardColors(carte).map((c) => COULEUR_LABELS[c]).filter(Boolean).join('/');
  const suffixe = couleurs ? ` · ${couleurs}` : '';
  if (carte.kind === 'hero') return `Héros${suffixe}`;
  if (carte.kind === 'creature') return `Créature${suffixe}`;
  if (carte.kind === 'instant') return `Magie rapide${suffixe}`;
  if (carte.kind === 'sorcery') return `Sorcellerie${suffixe}`;
  if (carte.kind === 'weapon') return `Arme${suffixe}`;
  return cardTypeLine(carte);
}

/** Texte d'effet lisible directement sur la carte dans la grille. */
function texteLisibleCarte(carte) {
  const court = resumeCarte(carte, 116);
  if (court) return court;
  if (carte.kind === 'weapon') {
    const parties = [];
    if (carte.atkBonus) parties.push(`+${carte.atkBonus} ATQ`);
    if (carte.defBonus) parties.push(`+${carte.defBonus} DÉF`);
    return parties.length ? `Équipement : confère ${parties.join(' et ')}.` : 'Équipement de combat.';
  }
  return 'Combattant sans capacité spéciale.';
}

/** Losanges d'exemplaires façon MTG Arena au-dessus de chaque carte. */
function LosangesExemplaires({ quotaMax, limitePossedee, dansLeDeck }) {
  const total = Math.max(1, Math.min(4, quotaMax || 1));
  return (
    <span
      className="rpg-atelier__losanges"
      aria-hidden="true"
      title={`${dansLeDeck} dans le deck · ${limitePossedee} en stock (max ${total})`}
    >
      {Array.from({ length: total }, (_, index) => {
        const etat = index < dansLeDeck
          ? 'is-pris'
          : index < limitePossedee
            ? 'is-dispo'
            : 'is-manquant';
        return <i key={index} className={`rpg-atelier__losange ${etat}`} />;
      })}
    </span>
  );
}

export function RpgDeckAtelier({
  deckInitial = null,
  nomInitial = 'Deck maison',
  nomParDefaut = null,
  cardIdsInitiaux = null,
  boxArtInitial = '',
  collection = [],
  exemplaires = null,
  artUrl,
  onEnregistrer,
  onAnnuler,
  onSupprimer = null,
  onHoverCard = null,
  onLeaveHoverCard = null,
  onInspecterCarte = null,
  onQuitterCarte = null,
  surSfx = () => {},
}) {
  const libelleDefaut = nomParDefaut ?? nomInitial ?? 'Deck maison';
  const inspecter = onHoverCard ?? onInspecterCarte;
  const quitterInspection = onLeaveHoverCard ?? onQuitterCarte;

  const idsDepart = useMemo(
    () => (deckInitial?.cardIds ? [...deckInitial.cardIds] : (cardIdsInitiaux ? [...cardIdsInitiaux] : [])),
    [deckInitial, cardIdsInitiaux],
  );
  const nomDepart = deckInitial?.nom ?? libelleDefaut;
  const boxArtDepart = deckInitial?.boxArt ?? boxArtInitial ?? '';

  const [nom, setNom] = useState(nomDepart);
  const [nomTouche, setNomTouche] = useState(() => Boolean(deckInitial?.nom));
  const [cardIds, setCardIds] = useState(idsDepart);
  const [boxArt, setBoxArt] = useState(boxArtDepart);

  // Filtres de la bibliothèque.
  const [couleursActives, setCouleursActives] = useState(() => new Set());
  const [typeFiltre, setTypeFiltre] = useState('tous');
  const [coutsActifs, setCoutsActifs] = useState(() => new Set());
  const [rareteFiltre, setRareteFiltre] = useState('toutes');
  const [seulementPossedees, setSeulementPossedees] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState('cout');
  const [filtresAvances, setFiltresAvances] = useState(false);

  // Mode d'affichage de la colonne du deck : pile MTGA par coût (défaut) ou par famille.
  const [modeListeDeck, setModeListeDeck] = useState('cout');

  // Retours visuels & confirmations en deux temps.
  const [statut, setStatut] = useState('');
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [confirmerVider, setConfirmerVider] = useState(false);
  const [confirmerAbandon, setConfirmerAbandon] = useState(false);

  // Nommage à l'enregistrement.
  const [nommageOuvert, setNommageOuvert] = useState(false);
  const [nomPropose, setNomPropose] = useState('');
  const champNommageRef = useRef(null);

  const appuiLongRef = useRef({ timer: null, consomme: false });

  useEffect(() => () => {
    clearTimeout(appuiLongRef.current.timer);
  }, []);

  useEffect(() => {
    if (nommageOuvert) champNommageRef.current?.focus();
  }, [nommageOuvert]);

  const collectionSet = useMemo(() => new Set(collection), [collection]);
  const compte = useMemo(() => compteExemplaires(cardIds), [cardIds]);
  const validation = useMemo(() => rpgValiderDeckMaison(cardIds, collection, exemplaires), [cardIds, collection, exemplaires]);
  const courbe = useMemo(() => courbeDeMana(cardIds), [cardIds]);
  const couleursDeck = useMemo(() => repartitionCouleurs(cardIds), [cardIds]);

  const sale = useMemo(() => {
    const nomCompare = (nom.trim() || libelleDefaut);
    const nomOrigine = (nomDepart.trim() || libelleDefaut);
    return nomCompare !== nomOrigine || boxArt !== boxArtDepart || !memeRecette(cardIds, idsDepart);
  }, [nom, libelleDefaut, nomDepart, boxArt, boxArtDepart, cardIds, idsDepart]);

  const basculerDansSet = (setter, valeur) => {
    surSfx('menu');
    setter((actuel) => {
      const suivant = new Set(actuel);
      if (suivant.has(valeur)) suivant.delete(valeur);
      else suivant.add(valeur);
      return suivant;
    });
  };

  const reinitialiserFiltres = () => {
    surSfx('annuler');
    setCouleursActives(new Set());
    setTypeFiltre('tous');
    setCoutsActifs(new Set());
    setRareteFiltre('toutes');
    setSeulementPossedees(false);
    setRecherche('');
    setTri('cout');
  };

  const nombreFiltresAvances = coutsActifs.size
    + (typeFiltre !== 'tous' ? 1 : 0)
    + (rareteFiltre !== 'toutes' ? 1 : 0)
    + (tri !== 'cout' ? 1 : 0);

  const filtresActifs = couleursActives.size > 0
    || nombreFiltresAvances > 0
    || seulementPossedees
    || recherche.trim() !== '';

  const cartesCatalogue = useMemo(
    () => RPG_DUEL_CARDS.filter(carteJouableSansTerrain),
    [],
  );

  const cartesPossedeesTotal = useMemo(
    () => cartesCatalogue.filter((c) => collectionSet.has(c.id)).length,
    [cartesCatalogue, collectionSet],
  );

  const cartesFiltrees = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    const specType = TYPES_FILTRE.find((entree) => entree.id === typeFiltre);
    const retenues = cartesCatalogue.filter((carte) => {
      if (seulementPossedees && !collectionSet.has(carte.id)) return false;
      if (couleursActives.size > 0) {
        const couleurs = cardColors(carte);
        if (!couleurs.some((couleur) => couleursActives.has(couleur))) return false;
      }
      if (specType?.test && !specType.test(carte)) return false;
      if (coutsActifs.size > 0) {
        const cout = cardCost(carte);
        const palier = cout >= 7 ? 7 : cout;
        if (!coutsActifs.has(palier)) return false;
      }
      if (rareteFiltre !== 'toutes' && carte.rarity !== rareteFiltre) return false;
      if (requete) {
        const texte = `${carte.name} ${cardTypeLine(carte)} ${carte.text ?? ''}`.toLowerCase();
        if (!texte.includes(requete)) return false;
      }
      return true;
    });
    return trierCatalogue(retenues, tri);
  }, [cartesCatalogue, collectionSet, seulementPossedees, couleursActives, typeFiltre, coutsActifs, rareteFiltre, recherche, tri]);

  const entreesDeckParCout = useMemo(() => {
    const entrees = [];
    for (const [id, nombre] of compte) {
      const carte = cardById(id);
      if (carte) entrees.push({ carte, nombre });
    }
    return entrees.sort((a, b) => cardCost(a.carte) - cardCost(b.carte) || a.carte.name.localeCompare(b.carte.name, 'fr'));
  }, [compte]);

  const deckParGroupe = useMemo(() => GROUPES.map((groupe) => {
    const entrees = entreesDeckParCout.filter(({ carte }) => groupe.accepte(carte));
    const total = entrees.reduce((somme, entree) => somme + entree.nombre, 0);
    return { ...groupe, entrees, total };
  }), [entreesDeckParCout]);

  const statsTypes = useMemo(() => {
    const map = Object.fromEntries(deckParGroupe.map((g) => [g.id, g.total]));
    return {
      creatures: map.creature ?? 0,
      magies: map.magie ?? 0,
      armes: map.arme ?? 0,
      coutMoyen: courbe.moyenne ? courbe.moyenne.toFixed(1) : '0.0',
    };
  }, [deckParGroupe, courbe.moyenne]);

  const cartesEmbleme = useMemo(() => {
    const vues = new Set();
    const liste = [];
    for (const id of cardIds) {
      if (vues.has(id)) continue;
      const carte = cardById(id);
      if (carte && carte.kind !== 'terrain') {
        vues.add(id);
        liste.push(carte);
      }
    }
    return liste;
  }, [cardIds]);

  const emblemeEffectif = useMemo(() => {
    if (boxArt && cardById(boxArt)) return boxArt;
    if (cartesEmbleme[0]?.id) return cartesEmbleme[0].id;
    return cartesCatalogue[0]?.id ?? '';
  }, [boxArt, cartesEmbleme, cartesCatalogue]);

  const couleurDominanteDeck = couleursDeck[0]?.couleur ?? 'sable';

  const ajouter = (carte) => {
    const avis = peutAjouterCarte(carte.id, cardIds, collection, exemplaires);
    if (!avis.ok) {
      surSfx('erreur');
      setStatut(avis.raison);
      return;
    }
    surSfx('pioche');
    setConfirmerVider(false);
    setConfirmerAbandon(false);
    setStatut('');
    setCardIds((ids) => [...ids, carte.id]);
  };

  const retirerUne = (cardId) => {
    const index = cardIds.lastIndexOf(cardId);
    if (index < 0) return;
    surSfx('menu');
    setConfirmerAbandon(false);
    setStatut('');
    setCardIds((ids) => [...ids.slice(0, index), ...ids.slice(index + 1)]);
  };

  const viderDeck = () => {
    if (!cardIds.length) return;
    if (!confirmerVider) {
      surSfx('menu');
      setConfirmerVider(true);
      return;
    }
    surSfx('annuler');
    setCardIds([]);
    setBoxArt('');
    setConfirmerVider(false);
    setStatut('Le deck a été vidé.');
  };

  const suggestions = useMemo(
    () => suggestionsNomsDeck(cardIds, boxArt || null),
    [cardIds, boxArt],
  );

  const demanderEnregistrement = () => {
    surSfx('menu');
    const prerempli = nomTouche && nom.trim()
      ? nom.trim()
      : (deckInitial?.nom?.trim() || suggestions[0] || libelleDefaut);
    setNomPropose(prerempli);
    setNommageOuvert(true);
  };

  const confirmerEnregistrement = () => {
    const retenu = nomPropose.trim() || suggestions[0] || libelleDefaut;
    const resultat = onEnregistrer({
      id: deckInitial?.id ?? nouvelIdDeckMaison(),
      creeLe: deckInitial?.creeLe,
      nom: retenu,
      cardIds,
      boxArt: boxArt && cardIds.includes(boxArt) ? boxArt : null,
    });
    if (resultat?.ok === false) {
      surSfx('erreur');
      setStatut(resultat.raison || 'Enregistrement impossible.');
      return;
    }
    surSfx('apparition');
    setNommageOuvert(false);
  };

  const demanderFermeture = () => {
    if (sale && !confirmerAbandon) {
      surSfx('menu');
      setConfirmerAbandon(true);
      setStatut('Modifications non enregistrées : recliquez sur « Fermer » pour quitter.');
      return;
    }
    surSfx('annuler');
    onAnnuler();
  };

  const supprimer = () => {
    if (!deckInitial?.id || !onSupprimer) return;
    if (!confirmerSuppression) {
      surSfx('menu');
      setConfirmerSuppression(true);
      return;
    }
    surSfx('defaite');
    onSupprimer(deckInitial.id);
  };

  const debutToucher = (carte, event) => {
    if (event.pointerType === 'mouse' || !inspecter) return;
    const cible = event.currentTarget;
    clearTimeout(appuiLongRef.current.timer);
    appuiLongRef.current.consomme = false;
    appuiLongRef.current.timer = setTimeout(() => {
      appuiLongRef.current.consomme = true;
      inspecter(carte, { currentTarget: cible });
    }, 380);
  };

  const finToucher = () => {
    clearTimeout(appuiLongRef.current.timer);
  };

  const cliquerCarteGrille = (carte) => {
    if (appuiLongRef.current.consomme) {
      appuiLongRef.current.consomme = false;
      return;
    }
    ajouter(carte);
  };

  const maxCourbe = Math.max(1, courbe.max);
  const resumeCourbe = courbe.paliers.map((palier) => `${palier.label} mana : ${palier.nombre}`).join(', ');

  /** Une barre horizontale de carte dans la colonne de droite (style MTG Arena). */
  const rendreLigneDeck = ({ carte, nombre }) => {
    const ajoutLigne = peutAjouterCarte(carte.id, cardIds, collection, exemplaires);
    return (
      <li
        key={carte.id}
        className="rpg-atelier__ligne"
        data-card-id={carte.id}
        style={{ '--frame': cardFrameColor(carte) }}
        onContextMenu={(event) => {
          event.preventDefault();
          retirerUne(carte.id);
        }}
        onMouseEnter={inspecter ? (event) => inspecter(carte, event) : undefined}
        onMouseLeave={quitterInspection ?? undefined}
      >
        {artUrl && (
          <img
            className="rpg-atelier__ligne-art"
            src={artUrl(carte.id)}
            alt=""
            loading="lazy"
          />
        )}
        <span className="rpg-atelier__ligne-qte" aria-hidden="true">{nombre}x</span>
        <span className="rpg-atelier__ligne-nom">
          <strong>{carte.name}</strong>
        </span>
        <span className="rpg-atelier__ligne-compte">
          <button
            type="button"
            onClick={() => retirerUne(carte.id)}
            aria-label={`Retirer un exemplaire de ${carte.name}`}
            title="Retirer un exemplaire"
          >
            −
          </button>
          <b className="sr-only">×{nombre}</b>
          <button
            type="button"
            disabled={!ajoutLigne.ok}
            title={ajoutLigne.ok ? 'Ajouter un exemplaire' : ajoutLigne.raison}
            onClick={() => ajouter(carte)}
            aria-label={`Ajouter un exemplaire de ${carte.name}`}
          >
            +
          </button>
        </span>
        <Cout carte={carte} />
      </li>
    );
  };

  return (
    <section className="rpg-atelier" aria-label="Atelier de création de deck">
      <div className="rpg-atelier__panneaux">
        {/* ═══ COLONNE GAUCHE : BARRE DE FILTRES MTGA + COLLECTION LISIBLE ═══ */}
        <div className="rpg-atelier__biblio" aria-label="Bibliothèque des cartes">
          <div className="rpg-atelier__toolbar rpg-atelier__toolbar--simple" role="region" aria-label="Filtres de la collection">
            <button
              type="button"
              className={`rpg-menu-link rpg-atelier__fermer${confirmerAbandon ? ' is-armed' : ''}`}
              onClick={demanderFermeture}
              title="Retourner à l’étagère des decks"
            >
              {confirmerAbandon ? '✕ Fermer sans sauver ?' : '← Fermer'}
            </button>

            <label className="rpg-atelier__search">
              <svg className="rpg-atelier__search-icone" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M15.5 15.5 21 21" />
              </svg>
              <span className="sr-only">Rechercher une carte</span>
              <input
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher nom, type, effet…"
              />
              {recherche && (
                <button
                  type="button"
                  className="rpg-atelier__search-clear"
                  onClick={() => setRecherche('')}
                  aria-label="Effacer la recherche"
                >
                  ✕
                </button>
              )}
            </label>

            <div className="rpg-atelier__toggles rpg-atelier__toggles--couleurs" role="group" aria-label="Filtrer par couleur">
              {RPG_ELEMENTS.map((couleur) => (
                <button
                  key={couleur}
                  type="button"
                  className={`rpg-atelier__toggle rpg-atelier__toggle--pip rpg-atelier__toggle--${couleur}${couleursActives.has(couleur) ? ' is-on' : ''}`}
                  aria-pressed={couleursActives.has(couleur)}
                  aria-label={`Couleur ${COULEUR_LABELS[couleur]}`}
                  title={COULEUR_LABELS[couleur]}
                  onClick={() => basculerDansSet(setCouleursActives, couleur)}
                >
                  <ElementEmblem element={couleur} />
                </button>
              ))}
            </div>

            <div className="rpg-atelier__toggles rpg-atelier__toggles--fin">
              <button
                type="button"
                className={`rpg-atelier__toggle${seulementPossedees ? ' is-on' : ''}`}
                aria-pressed={seulementPossedees}
                onClick={() => { surSfx('menu'); setSeulementPossedees((v) => !v); }}
              >
                Possédées
              </button>
              <button
                type="button"
                className={`rpg-atelier__toggle rpg-atelier__toggle--filtres${(filtresAvances || nombreFiltresAvances > 0) ? ' is-on' : ''}`}
                aria-expanded={filtresAvances}
                aria-controls="rpg-atelier-filtres-avances"
                onClick={() => { surSfx('menu'); setFiltresAvances((v) => !v); }}
              >
                {nombreFiltresAvances > 0 ? `Filtres (${nombreFiltresAvances})` : 'Filtres'}
              </button>
            </div>

            <div className="rpg-atelier__meta-biblio" aria-live="polite">
              <span><b>{cartesFiltrees.length}</b> / {cartesCatalogue.length} cartes</span>
              <span className="rpg-atelier__meta-sep" aria-hidden="true">·</span>
              <span className="rpg-atelier__legende-losanges" aria-hidden="true">
                <i className="rpg-atelier__losange is-pris" /> deck
                <i className="rpg-atelier__losange is-dispo" /> stock ({cartesPossedeesTotal})
              </span>
            </div>
          </div>

          {filtresAvances && (
            <div id="rpg-atelier-filtres-avances" className="rpg-atelier__filtres-avances" role="region" aria-label="Filtres avancés">
              <div className="rpg-atelier__toggles" role="group" aria-label="Filtrer par coût de mana">
                <span className="rpg-atelier__filtres-label">Coût</span>
                {RPG_COURBE_PALIERS.map((cout) => {
                  const libelle = cout === 7 ? '7+' : String(cout);
                  return (
                    <button
                      key={cout}
                      type="button"
                      className={`rpg-atelier__toggle rpg-atelier__toggle--cout${coutsActifs.has(cout) ? ' is-on' : ''}`}
                      aria-pressed={coutsActifs.has(cout)}
                      aria-label={`Coût ${libelle}`}
                      onClick={() => basculerDansSet(setCoutsActifs, cout)}
                    >
                      {libelle}
                    </button>
                  );
                })}
              </div>
              <div className="rpg-atelier__toggles" role="group" aria-label="Filtrer par type">
                <span className="rpg-atelier__filtres-label">Type</span>
                {TYPES_FILTRE.map((entree) => (
                  <button
                    key={entree.id}
                    type="button"
                    className={`rpg-atelier__toggle${typeFiltre === entree.id ? ' is-on' : ''}`}
                    aria-pressed={typeFiltre === entree.id}
                    onClick={() => { surSfx('menu'); setTypeFiltre(entree.id); }}
                  >
                    {entree.label}
                  </button>
                ))}
              </div>
              <div className="rpg-atelier__toggles" role="group" aria-label="Filtrer par rareté">
                <span className="rpg-atelier__filtres-label">Rareté</span>
                {RARETES_FILTRE.map((entree) => (
                  <button
                    key={entree.id}
                    type="button"
                    className={`rpg-atelier__toggle${rareteFiltre === entree.id ? ' is-on' : ''}`}
                    aria-pressed={rareteFiltre === entree.id}
                    onClick={() => { surSfx('menu'); setRareteFiltre(entree.id); }}
                  >
                    {entree.label}
                  </button>
                ))}
              </div>
              <div className="rpg-atelier__toggles" role="group" aria-label="Trier la collection">
                <span className="rpg-atelier__filtres-label">Tri</span>
                {TRIS.map((entree) => (
                  <button
                    key={entree.id}
                    type="button"
                    className={`rpg-atelier__toggle${tri === entree.id ? ' is-on' : ''}`}
                    aria-pressed={tri === entree.id}
                    onClick={() => { surSfx('menu'); setTri(entree.id); }}
                  >
                    {entree.label}
                  </button>
                ))}
              </div>
              {filtresActifs && (
                <button type="button" className="rpg-atelier__toggle rpg-atelier__toggle--reset" onClick={reinitialiserFiltres}>
                  Tout effacer
                </button>
              )}
            </div>
          )}

          <p className="rpg-atelier__astuce">
            Touchez une carte pour l’ajouter · maintenez le doigt posé pour la lire en grand.
          </p>

          <ul className="rpg-atelier__cartes" aria-label="Cartes du catalogue">
            {cartesFiltrees.map((carte) => {
              const possedee = collectionSet.has(carte.id);
              const dansLeDeck = compte.get(carte.id) ?? 0;
              const quotaMax = cardCopyLimit(carte);
              const limite = plafondVisible(collection, carte.id, exemplaires);
              const avis = peutAjouterCarte(carte.id, cardIds, collection, exemplaires);
              const origineInfo = !possedee ? carteReveleePar(carte.id) : null;
              const origine = origineInfo
                ? (typeof origineInfo === 'string' ? origineInfo : (origineInfo.etage || origineInfo.tour || 'Histoire'))
                : null;
              const auPlafond = possedee && limite > 0 && dansLeDeck >= limite;
              const couleurRarete = CARD_RARITIES[carte.rarity]?.color ?? '#9d9d9d';
              const libelleRarete = CARD_RARITIES[carte.rarity]?.label ?? carte.rarity;

              const classes = [
                'rpg-atelier__carte',
                !possedee && 'is-locked',
                dansLeDeck > 0 && 'is-picked',
                auPlafond && 'is-full',
              ].filter(Boolean).join(' ');

              return (
                <li
                  key={carte.id}
                  className={classes}
                  data-card-id={carte.id}
                  style={{ '--frame': cardFrameColor(carte), '--rpg-frame-color': cardFrameColor(carte), '--rarete': couleurRarete }}
                  onContextMenu={(event) => {
                    if (dansLeDeck <= 0) return;
                    event.preventDefault();
                    retirerUne(carte.id);
                  }}
                  onMouseEnter={inspecter ? (event) => inspecter(carte, event) : undefined}
                  onMouseLeave={quitterInspection ?? undefined}
                  onPointerDown={(event) => debutToucher(carte, event)}
                  onPointerUp={finToucher}
                  onPointerCancel={finToucher}
                  onPointerLeave={finToucher}
                >
                  <LosangesExemplaires
                    quotaMax={quotaMax}
                    limitePossedee={possedee ? limite : 0}
                    dansLeDeck={dansLeDeck}
                  />

                  <button
                    type="button"
                    className="rpg-atelier__carte-ajout"
                    disabled={!avis.ok}
                    title={avis.ok
                      ? `Ajouter ${carte.name} (${dansLeDeck}/${limite}) · clic droit pour retirer`
                      : `${carte.name} — ${origine ? `Verrouillée · ${origine}` : avis.raison}`}
                    aria-label={possedee
                      ? `${carte.name}, coût ${cardCost(carte)}, ${dansLeDeck} sur ${limite} dans le deck`
                      : `${carte.name}, verrouillée (${origine ?? 'hors collection'})`}
                    onClick={() => cliquerCarteGrille(carte)}
                  >
                    <span className="rpg-atelier__carte-entete">
                      <span className="rpg-atelier__carte-nom">
                        <strong>{carte.name}</strong>
                      </span>
                      <Cout carte={carte} />
                    </span>

                    <span className={`rpg-atelier__carte-art ${cardFrameClass(carte)} ${cardMotifClass(carte)}`}>
                      {artUrl && <img src={artUrl(carte.id)} alt="" loading="lazy" />}
                      <SortSceau carte={carte} />
                      {!possedee && (
                        <span className="rpg-atelier__carte-cadenas" aria-hidden="true">🔒</span>
                      )}
                      {dansLeDeck > 0 && (
                        <span className="rpg-atelier__carte-count" aria-hidden="true">
                          ×{dansLeDeck}
                          <small>/{limite}</small>
                        </span>
                      )}
                    </span>

                    <span className="rpg-atelier__carte-meta">
                      <span className="rpg-atelier__carte-famille">{typeCourtCarte(carte)}</span>
                      <span className="rpg-atelier__rarete" title={libelleRarete} aria-hidden="true" />
                    </span>

                    <span className="rpg-atelier__carte-corps">
                      <span className="rpg-atelier__carte-regle">{texteLisibleCarte(carte)}</span>
                      <span className="rpg-atelier__carte-pied">
                        {!possedee && origine ? (
                          <span className="rpg-atelier__carte-origine">{origine}</span>
                        ) : <span />}
                        {(carte.kind === 'creature' || carte.kind === 'hero') && (
                          <span className="rpg-atelier__carte-pt" aria-label={`Attaque ${carte.atk}, défense ${carte.def}`}>
                            {carte.atk}/{carte.def}
                          </span>
                        )}
                        {carte.kind === 'weapon' && (
                          <span className="rpg-atelier__carte-pt">
                            +{carte.atkBonus}/+{carte.defBonus}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  {dansLeDeck > 0 && (
                    <button
                      type="button"
                      className="rpg-atelier__carte-retrait"
                      aria-label={`Retirer un exemplaire de ${carte.name}`}
                      title="Retirer un exemplaire (ou clic droit)"
                      onClick={(event) => { event.stopPropagation(); retirerUne(carte.id); }}
                    >
                      −
                    </button>
                  )}
                </li>
              );
            })}
            {cartesFiltrees.length === 0 && (
              <li className="rpg-atelier__vide">
                <span>Aucune carte ne correspond à ces filtres.</span>
                {filtresActifs && (
                  <button type="button" className="rpg-atelier__toggle rpg-atelier__toggle--reset" onClick={reinitialiserFiltres}>
                    Réinitialiser les filtres
                  </button>
                )}
              </li>
            )}
          </ul>
        </div>

        {/* ═══ COLONNE DROITE : BOÎTIER + PILE DE CARTES MTGA + CTA BAS ═══ */}
        <aside className="rpg-atelier__deck" aria-label="Composition du deck">
          <div className="rpg-atelier__state">
            <div className="rpg-atelier__boite-entete">
              <div
                className={`rpg-atelier__couverture rpg-atelier__couverture--${couleurDominanteDeck}`}
                aria-hidden="true"
              >
                {artUrl && emblemeEffectif && (
                  <img src={artUrl(emblemeEffectif)} alt="" />
                )}
                <span className="rpg-atelier__couverture-embleme">
                  <ElementEmblem element={couleurDominanteDeck} />
                </span>
              </div>

              <div className="rpg-atelier__identite">
                <label className="rpg-atelier__champ rpg-atelier__champ--nom">
                  <span className="sr-only">Nom du deck</span>
                  <input
                    type="text"
                    value={nom}
                    maxLength={RPG_DECK_NOM_MAX}
                    placeholder={libelleDefaut}
                    aria-label="Nom du deck"
                    onChange={(event) => {
                      setNom(event.target.value);
                      setNomTouche(true);
                    }}
                  />
                </label>

                <div className="rpg-atelier__compteur">
                  <div className={`rpg-atelier__total${cardIds.length === RPG_DECK_TAILLE ? ' is-full' : cardIds.length > RPG_DECK_TAILLE ? ' is-over' : ''}`}>
                    <span><b>{cardIds.length}</b> / {RPG_DECK_TAILLE} cartes</span>
                    {couleursDeck.length > 0 && (
                      <span className="rpg-atelier__mini-couleurs" aria-label={`Couleurs : ${couleursDeck.map((c) => COULEUR_LABELS[c.couleur]).join(', ')}`}>
                        {couleursDeck.map(({ couleur }) => <Pip key={couleur} element={couleur} />)}
                      </span>
                    )}
                  </div>
                  <div className="rpg-atelier__jauge" aria-hidden="true">
                    <i style={{ width: `${Math.min(100, Math.round((cardIds.length / RPG_DECK_TAILLE) * 100))}%` }} />
                  </div>
                </div>
              </div>

              <figure className="rpg-atelier__courbe" aria-label={`Courbe de mana — ${resumeCourbe}`} title={`Courbe de mana : ${resumeCourbe}`}>
                <figcaption className="sr-only">Courbe de mana</figcaption>
                <div className="rpg-atelier__barres" aria-hidden="true">
                  {courbe.paliers.map(({ cout, label, nombre }) => {
                    const hauteur = nombre ? Math.max(16, Math.round((nombre / maxCourbe) * 100)) : 0;
                    return (
                      <div key={cout} className="rpg-atelier__barre" data-cout={cout}>
                        <b>{nombre}</b>
                        <span><i style={{ height: `${hauteur}%` }} /></span>
                        <small>{label}</small>
                      </div>
                    );
                  })}
                </div>
              </figure>
            </div>

            <div className="rpg-atelier__resume-deck">
              <p className="rpg-atelier__mini-stats">
                <span title="Créatures et héros">⚔ <b>{statsTypes.creatures}</b> créat.</span>
                <span aria-hidden="true">·</span>
                <span title="Magies rapides et sorcelleries">✦ <b>{statsTypes.magies}</b> magies</span>
                <span aria-hidden="true">·</span>
                <span title="Armes">🗡 <b>{statsTypes.armes}</b> armes</span>
                <span aria-hidden="true">·</span>
                <span title="Coût moyen de mana">Ø <b>{statsTypes.coutMoyen}</b></span>
              </p>

              <p className={`rpg-atelier__verdict ${validation.ok ? 'is-valid' : 'is-invalid'}`} role="status">
                {validation.ok
                  ? '✓ Deck complet, prêt à jouer'
                  : validation.raisons[0]}
              </p>
            </div>

            <details className="rpg-atelier__options">
              <summary>Couverture du boîtier</summary>
              <label className="rpg-atelier__champ">
                <span className="sr-only">Carte emblème</span>
                <select
                  aria-label="Carte emblématique du boîtier"
                  value={boxArt}
                  onChange={(event) => setBoxArt(event.target.value)}
                  disabled={cartesEmbleme.length === 0}
                >
                  <option value="">Automatique (première carte)</option>
                  {cartesEmbleme.map((carte) => (
                    <option key={carte.id} value={carte.id}>{carte.name}</option>
                  ))}
                </select>
              </label>
            </details>
          </div>

          <div className="rpg-atelier__deck-barre">
            <div className="rpg-atelier__vue-switch" role="group" aria-label="Organisation de la liste du deck">
              <button
                type="button"
                className={`rpg-atelier__vue-btn${modeListeDeck === 'cout' ? ' is-on' : ''}`}
                aria-pressed={modeListeDeck === 'cout'}
                onClick={() => { surSfx('menu'); setModeListeDeck('cout'); }}
              >
                Par coût
              </button>
              <button
                type="button"
                className={`rpg-atelier__vue-btn${modeListeDeck === 'type' ? ' is-on' : ''}`}
                aria-pressed={modeListeDeck === 'type'}
                onClick={() => { surSfx('menu'); setModeListeDeck('type'); }}
              >
                Par type
              </button>
            </div>

            <div className="rpg-atelier__outils">
              <button
                type="button"
                className={`rpg-atelier__outil rpg-atelier__outil--danger${confirmerVider ? ' is-armed' : ''}`}
                disabled={cardIds.length === 0}
                onClick={viderDeck}
              >
                {confirmerVider ? 'Vider — confirmer ?' : 'Vider'}
              </button>
            </div>
          </div>

          {statut && (
            <p className="rpg-atelier__statut" role="status" aria-live="polite">{statut}</p>
          )}

          <div className="rpg-atelier__liste">
            {cardIds.length === 0 ? (
              <div className="rpg-atelier__vide rpg-atelier__vide--deck">
                <strong>Votre deck est vide</strong>
                <span>Cliquez sur une carte à gauche pour l’ajouter, ou faites un clic droit pour en retirer un exemplaire.</span>
              </div>
            ) : modeListeDeck === 'cout' ? (
              <ul className="rpg-atelier__pile" aria-label="Cartes du deck triées par coût">
                {entreesDeckParCout.map(rendreLigneDeck)}
              </ul>
            ) : (
              deckParGroupe.filter((g) => g.entrees.length > 0).map((groupe) => (
                <section key={groupe.id} className="rpg-atelier__groupe" data-groupe={groupe.id}>
                  <h4>
                    <span>{groupe.titre}</span>
                    <b>{groupe.total}</b>
                  </h4>
                  <ul>
                    {groupe.entrees.map(rendreLigneDeck)}
                  </ul>
                </section>
              ))
            )}
          </div>

          <footer className="rpg-atelier__actions">
            {nommageOuvert ? (
              <div className="rpg-atelier__nommage" role="region" aria-label="Nommer le deck">
                <h3>Comment s’appelle ce deck ?</h3>
                <p className="rpg-atelier__nommage-aide">
                  Choisissez une proposition inspirée de vos cartes, ou écrivez votre propre titre.
                </p>
                <label className="rpg-atelier__champ rpg-atelier__champ--nom">
                  <span className="sr-only">Nom du deck</span>
                  <input
                    ref={champNommageRef}
                    type="text"
                    value={nomPropose}
                    maxLength={RPG_DECK_NOM_MAX}
                    placeholder={suggestions[0] ?? libelleDefaut}
                    onChange={(event) => setNomPropose(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        confirmerEnregistrement();
                      }
                    }}
                  />
                </label>
                {suggestions.length > 0 && (
                  <ul className="rpg-atelier__nommage-suggestions" aria-label="Suggestions de noms">
                    {suggestions.map((idee) => (
                      <li key={idee}>
                        <button
                          type="button"
                          className={nomPropose === idee ? 'is-on' : ''}
                          onClick={() => { surSfx('menu'); setNomPropose(idee); }}
                        >
                          {idee}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="rpg-atelier__nommage-actions">
                  <button
                    type="button"
                    className="rpg-menu-button rpg-menu-button--primary rpg-atelier__btn-done"
                    onClick={confirmerEnregistrement}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="rpg-menu-button"
                    onClick={() => { surSfx('annuler'); setNommageOuvert(false); }}
                  >
                    Retour
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={`rpg-menu-button rpg-menu-button--primary rpg-atelier__btn-done${validation.ok ? ' is-ready' : ''}`}
                  onClick={demanderEnregistrement}
                >
                  {validation.ok
                    ? 'Enregistrer'
                    : 'Enregistrer le brouillon'}
                </button>
                <div className="rpg-atelier__actions-secondaires">
                  <button type="button" className="rpg-menu-button rpg-atelier__btn-secondaire" onClick={demanderFermeture}>
                    {confirmerAbandon ? 'Quitter sans sauver ?' : 'Annuler'}
                  </button>
                  {deckInitial?.id && onSupprimer && (
                    <button
                      type="button"
                      className="rpg-menu-button rpg-atelier__btn-secondaire rpg-atelier__danger"
                      onClick={supprimer}
                    >
                      {confirmerSuppression ? 'Confirmer suppression' : 'Supprimer'}
                    </button>
                  )}
                </div>
              </>
            )}
          </footer>
        </aside>
      </div>
    </section>
  );
}

export default RpgDeckAtelier;
