import { rpgMobaCartePourApercu, rpgMobaNotesCarte } from './rpgMobaPresentation.js';
import { rpgMobaCiblesIndividuelles } from './rpgMobaAttaqueIndividuelle.js';
import { useEffect, useReducer, useRef, useState } from 'react';
import { peutDemarrerAppuiLong, startRpgLongPress } from './rpgLongPress.js';
import { startRpgTouchDrag } from './rpgTouchDrag.js';
import { cardById, cardColors, cardHasPrintedType, lienSatisfait, cardFrameClass, cardFrameColor, cardMotifClass } from './rpgCards.js';
import { EffetsSprite, IconesCarte } from './effetIcons.jsx';
import { cardArt, cardArtEntite } from './rpgCardArt.js';
import { armesPortees } from './rpgCardStacks.js';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';
import { sonSortAuLancement } from './rpgSortAudio.js';
import { rpgSonsResolutionCombat, rpgVagueAnnonceAcier } from './rpgAttackAudio.js';
import { rpgMobaCombatFeedback, rpgMobaFusionnerFeedback } from './rpgMobaCombatFeedback.js';
import { rpgMobaProjectiles, rpgMobaSignatures, rpgMobaChocEchange } from './rpgMobaCinematiques.js';
import { rpgMobaPositionsContreAttaque, rpgMobaCiblesContreAttaque } from './rpgMobaContreAttaque.js';
import { rpgMobaPositionsImpact, rpgMobaImpactIndividuel, rpgMobaDecalerChiffres } from './rpgMobaImpact.js';
import { rpgMobaSoinsCreatures, rpgMobaSoinsVoies, rpgMobaBoucliersAjoutes } from './rpgMobaSoutien.js';
import { rpgMobaNouvellesConquetes } from './rpgMobaConqueteFx.js';
import { rpgMobaSorties, rpgMobaSortieRemplacee } from './rpgMobaSorties.js';
import { TourbillonEau } from './TourbillonEau.jsx';
import { rpgMobaArrowTarget, rpgMobaCombatIndicators } from './rpgMobaCombatIndicators.js';
import { rpgEstProtegee, rpgEstProtegeeDesSorts, rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgCibleEmbuscadeLegale, cibleRespecteCoutMax, rpgNombreDestructions, rpgDestructionsDepuis, rpgNombreBlessures, rpgBlessuresDepuis, rpgRenvoisEnMain, rpgExils, rpgConsommerSoins, rpgConsommerArriveesCreature, rpgConsommerArriveesPirate, rpgConsommerArriveesNavire, rpgConsommerArriveesDwarf } from './rpgDuel.js';
import {
  rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle, rpgMobaSortBlocageInterdit, MOBA_DECKS, MOBA_EMBUSCADES_COMBAT, rpgMobaValiderDeck, MOBA_ARMES, MOBA_CONTRESORTS, MOBA_ARRIVEES_HOSTILES, MOBA_ARRIVEES_NEUTRES, MOBA_MAGIES_ESSAI, MOBA_MAGIES_SPATIALES, MOBA_MAGIES_IMMEDIATES, MOBA_MAGIES_CIBLEES, MOBA_MAGIES_ALLIEES, MOBA_MAGIES_NEUTRES, MOBA_MAGIES_REANIMATION, MOBA_MAGIES_VOIES, MOBA_MAGIES_SOINS, MOBA_MAGIES_PRIX, MOBA_MAGIES_TRANSFERT, MOBA_MAGIES_ZONE_REPONSE, MOBA_MAGIES_ZONE_TOTALE_REPONSE, MOBA_MAGIES_RENFORT_REPONSE, rpgMobaCreerPartie, rpgMobaCiblesDestruction, rpgMobaResoudreDestruction, rpgMobaCiblesSite, rpgMobaResoudreSite, rpgMobaCiblesPrise, rpgMobaCandidatsRecherche, rpgMobaResoudreRecherche, rpgMobaCiblesAttaque, rpgMobaDeclarerAttaque, rpgMobaDeclarerBlocages, rpgMobaDefausser, rpgMobaPeutEmbuscade, rpgMobaJouerCreature, rpgMobaJouerArme,
  rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaMulligan,
  rpgMobaPasserEffetCreature, rpgMobaPasserSort, rpgMobaPasserCreature, rpgMobaPasserFinDeTour, rpgMobaPeutPayer, rpgMobaSacrificesInvocation, rpgMobaResoudreArrivee, rpgMobaTerminerTour,
} from './rpgMobaLocal.js';
import RpgMobaDeckEditor from './RpgMobaDeckEditor.jsx';
import { SACRIFICE_ANIMATION, victimesSacrificeSurVoies } from './rpgSacrificeAnimation.js';
import { mobaVieMaxPourCamp, mobaVoieCombat, mobaVoiesCombat, mobaPartageVoie, mobaVoieJouable } from './rpgMoba.js';
import { rpgMobaDeckMaison, rpgMobaDeckTourAleatoire } from './rpgMobaDecks.js';
import { MOBA_PLATEAUX, MOBA_PLATEAU_PAR_DEFAUT } from './rpgMobaPlateaux.js';
import { MOBA_HISTOIRE, prochainChapitreMoba } from './rpgMobaHistoire.js';
import { RpgConqueteMusic } from './rpgConqueteMusic.js';
import { choisirDefausseIA, choisirMulliganIA } from './rpgAI.js';
import { rpgMobaChoisirAttaqueIndividuelleIA, rpgMobaChoisirRechercheIA, rpgMobaChoisirSiteIA, rpgMobaChoisirArriveeIA, rpgMobaChoisirAttaquantsIA, rpgMobaChoisirCiblesAttaqueIA, rpgMobaChoisirBlocagesIA, rpgMobaChoisirEmbuscadeIA, rpgMobaChoisirCreatureIA, rpgMobaChoisirMagieIA } from './rpgMobaAI.js';
import './rpg-moba.css';
import './rpgMobaHistoire.css';

// Chaque cible conserve son propre délai : un effet récent ne doit ni
// interrompre ceux des autres cibles, ni être effacé par un ancien minuteur.
function useEffetsTemporairesMoba(duree) {
  const [effets, setEffets] = useState({});
  const minuteries = useRef(new Map());
  useEffect(() => () => {
    for (const timer of minuteries.current.values()) window.clearTimeout(timer);
    minuteries.current.clear();
  }, []);
  const effacer = () => {
    for (const timer of minuteries.current.values()) window.clearTimeout(timer);
    minuteries.current.clear();
    setEffets({});
  };
  const ajouter = (nouveaux) => {
    const entries = Object.entries(nouveaux);
    if (!entries.length) return;
    for (const [id] of entries) {
      window.clearTimeout(minuteries.current.get(id));
      const timer = window.setTimeout(() => {
        if (minuteries.current.get(id) !== timer) return;
        minuteries.current.delete(id);
        setEffets((ancien) => {
          if (!(id in ancien)) return ancien;
          const suivant = { ...ancien };
          delete suivant[id];
          return suivant;
        });
      }, dureeAnimation(duree));
      minuteries.current.set(id, timer);
    }
    setEffets((ancien) => ({ ...ancien, ...nouveaux }));
  };
  return [effets, ajouter, effacer];
}

// Repères d'interface uniquement : ils ne créent pas de phases dans le moteur MOBA.
const MOBA_PHASE_STEPS = [
  { id: 'principale', label: 'Tour', title: 'Tour : actions et attaques individuelles' },
  { id: 'blocage', label: 'Réponse', title: 'Réponse à l’attaque' },
  { id: 'fin', label: 'Réponse', title: 'Réponse de fin de tour' },
];
// Répartition fixe : pas de tirage aléatoire à chaque rendu du master.
const PARTICULES_INTERLUDE = Array.from({ length: 36 }, (_, index) => ({
  '--particle-x': `${(index * 37 + index * index * 3) % 100}%`,
  '--particle-y': `${(index * 29 + 11) % 100}%`,
  '--particle-size': `${2 + index % 4}px`,
  '--particle-delay': `${-((index * 13) % 120) / 10}s`,
  '--particle-duration': `${9 + index % 7 * 2}s`,
  '--particle-drift': `${(index * 19) % 55 - 27}px`,
}));
const TAILLE_PAGE_MAIN = 6;
const noms = { joueur: 'Vous', sorcier: 'IA', tous: 'Vous + IA' };
const voies = { left: 'Voie gauche', center: 'Voie centrale', right: 'Voie droite' };
// Maillons répartis sur les deux diagonales du sceau d'une voie fermée.
const MAILLONS_VOIE_FERMEE = Array.from({ length: 21 }, (_, index) => 5 + index * 4.5);
const autre = (side) => side === 'joueur' ? 'sorcier' : 'joueur';
const message = {
  mana: 'Carte impossible à jouer.', 'creature-limite': 'Une seule créature normale peut être jouée par camp et par tour.', 'embuscade-limite': 'Une seule Embuscade supplémentaire peut être jouée par camp et par tour.', 'sort-limite': 'Un seul sort peut être joué par camp et par tour.', 'arme-limite': 'Une seule arme peut être jouée par camp et par tour.', 'sacrifice-limite': 'Une seule créature nécessitant un sacrifice peut être jouée par camp et par tour.', 'petite-creature-limite': 'Une seule créature de coût 1 à 4 peut être jouée par camp et par tour.', 'pas-pret': 'Cette créature ne peut pas encore attaquer.',
  provocation: 'Une Provocation accessible doit être attaquée en priorité.',
  'blocage-force': 'Les créatures marquées doivent bloquer si elles le peuvent dans leur voie.',
  'attaque-jouee': 'La phase d’attaque est déjà terminée.', 'cible-obligatoire': 'Choisissez une cible légale pour chaque attaquant ciblé.', emplacement: 'Cet emplacement n’est pas libre.', 'emplacement-sacrifice': 'La créature doit prendre la place d’une victime choisie.',
  'blocage-indisponible-moba': 'Ce sort impose un blocage et ne peut pas être joué en MOBA.',
  'effet-non-pris-en-charge': 'Cette capacité n’est pas encore disponible dans l’essai MOBA.',
  'arme-cimetiere': 'Aucun Sabre maudit disponible dans votre cimetière.',
};
function nouveau(joueur = MOBA_DECKS[0], sorcier = MOBA_DECKS[0]) {
  const result = rpgMobaCreerPartie(joueur, sorcier);
  if (!result.ok) throw new Error(`Deck MOBA invalide (${result.side}) : ${result.raison}`);
  return result.duel;
}

// The wrapper is a visual selector for an existing deck, not a purchasable
// booster. Its face uses a real card from that deck; rules never depend on art.
function BoosterDeck({ deck, selected, onSelect, autoFocus = false }) {
  const validation = rpgMobaValiderDeck(deck);
  const illustration = (Array.isArray(deck.cardIds) ? deck.cardIds : [])
    .find((id) => ['creature', 'hero'].includes(cardById(id)?.kind)) ?? 'ashigaru-des-braises';
  return <div className={`moba__booster-item${!validation.ok ? ' is-unavailable' : ''}`}>
    <button type="button" className={`moba__booster${selected ? ' is-selected' : ''}`}
      aria-pressed={selected} disabled={!validation.ok} autoFocus={autoFocus}
      title={validation.ok ? `Choisir ${deck.name}` : validation.raison} onClick={onSelect}>
      <span className="moba__booster-scene" aria-hidden="true">
        <span className="moba__booster-body">
          <span className="moba__booster-edge" />
          <span className="moba__booster-face">
            <span className="moba__booster-seal">LE SABLIER</span>
            <span className="moba__booster-illustration"><img src={cardArt(illustration)} alt="" loading="lazy" draggable={false} /></span>
            <span className="moba__booster-face-name">{deck.name}</span>
            <span className="moba__booster-stamp">DECK · 30 CARTES</span>
          </span>
        </span>
      </span>
      <span className="moba__booster-name">{deck.name}</span>
      <span className="moba__booster-state">{!validation.ok ? 'Non compatible' : selected ? '✓ Sélectionné' : 'Choisir ce deck'}</span>
    </button>
    {!validation.ok && <small className="moba__booster-reason">{validation.raison}</small>}
  </div>;
}

function Marque({ active }) {
  return <span className={`moba__mark${active ? ' is-won' : ''}`} aria-hidden="true">◆</span>;
}

// Le résumé doit venir de la carte réellement en attente, pas de la dernière
// animation : une réponse rapide peut remplacer celle-ci avant la résolution.
function cibleSortEnAttente(duel, attente) {
  if (attente.placementArmeVivante) return `Chien de sable · ${voies[attente.placementArmeVivante.laneId]} · ${noms[attente.cote]}`;
  if (attente.laneId) {
    const cible = attente.carteId === 'le-poids' && attente.cibleId
      ? duel[autre(attente.cote)].creatures.find((entity) => entity.id === attente.cibleId)?.name ?? 'créature ciblée'
      : null;
    return `${cible ? `${cible} + ` : ''}${voies[attente.laneId]} · ${noms[attente.cibleCote]}`;
  }
  const cible = attente.cibleId && attente.cibleId !== 'sorcier'
    ? ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures).find((entity) => entity.id === attente.cibleId)
    : null;
  const nom = attente.cibleNom ?? 'Champ de bataille';
  const voie = cible?.mobaLane && !/voie/i.test(nom) ? ` · ${voies[cible.mobaLane]}` : '';
  return `${nom}${voie}${attente.cibleCote ? ` · ${noms[attente.cibleCote]}` : ''}`;
}

function etatsCreature(entity) {
  if (!entity) return [];
  const etats = [];
  if (entity.site) etats.push('Site indestructible : ne peut ni attaquer ni bloquer');
  if (entity.gelToursRestants > 0) etats.push('Gelée');
  else if (entity.attaquee) etats.push('A attaqué');
  else if (!entity.ready) etats.push('Arrivée récente');
  if (entity.rapidite) etats.push('Rapidité');
  if (entity.coupRapide) etats.push('Attaque ciblée');
  if (entity.coupCritique?.chance) etats.push(`Coup critique : ${Math.round(entity.coupCritique.chance * 100)} % ×${entity.coupCritique.fois}`);
  if (entity.mur) etats.push('Mur : ne peut pas attaquer ni être équipé');
  if (entity.doitBloquer) etats.push('Doit bloquer si possible');
  if (entity.provocation) etats.push('Provocation');
  if (entity.blocageForce) etats.push('Doit bloquer si possible');
  if (entity.envol) etats.push('Envol');
  if (entity.esquive) etats.push('Esquive');
  if (entity.infiltration) etats.push('Infiltration');
  if (entity.contreAttaque) etats.push('Contre-attaque');
  if (entity.overkill || entity.overkillTemporaire > 0) etats.push('Overkill');
  if (entity.furieDeclenchee) etats.push('Furie active');
  if (entity.maledictionBonus < 0) etats.push(`Malédiction ${entity.maledictionBonus} ATQ`);
  if (entity.bouclier > 0) etats.push('Bouclier');
  if (entity.protection?.contre) etats.push(`Bouclier contre les sorts : ${[entity.protection.contre].flat().join(', ')}`);
  if (entity.bouclierLumiere) etats.push('Bouclier de lumière');
  for (const id of armesPortees(entity)) etats.push(`Équipée : ${cardById(id)?.name ?? id}`);
  if (entity.arme && MOBA_ARMES.includes(entity.arme.carteId)) {
    etats.push(`Durabilité : ${entity.arme.durabilite}`);
    if (entity.arme.armure?.max > 0) etats.push(`Armure : ${entity.arme.armure.restant}/${entity.arme.armure.max}`);
  }
  if (entity.volDeVie) etats.push('Vol de vie');
  if (entity.enCale) etats.push(`En cale : ${entity.enCale.name}`);
  if (entity.heures?.restants > 0) etats.push(`${entity.heures.restants} Heure${entity.heures.restants > 1 ? 's' : ''}`);
  return etats;
}

/** Solo MOBA: the adapter owns the rules, React schedules the AI decisions. */
export default function RpgMobaBoard({ onQuitter, onBackRef = null, initialiser = nouveau, creerPartie = nouveau, rendu = null, onPlaySfx = null, onArriveesAudio = null, onPreloadVoice = null, decksMaison = [],
  sonActif = true, onToggleSound = null, volumeSfx = 1, volumeVoix = 1, volumeMusique = 1,
  onChangeVolumeSfx = null, onChangeVolumeVoix = null, onChangeVolumeMusique = null }) {
  const [duel, setDuel] = useState(initialiser);
  const [version, redraw] = useReducer((n) => n + 1, 0);
  const [carte, setCarte] = useState(null);
  const [sacrificesChoisis, setSacrificesChoisis] = useState([]);
  const [attaquants, setAttaquants] = useState([]);
  const [ciblesRapides, setCiblesRapides] = useState({});
  const [cibleRapideEnCours, setCibleRapideEnCours] = useState(null);
  const [cibleVoieEnCours, setCibleVoieEnCours] = useState(null);
  const [blocages, setBlocages] = useState({});
  const [cible, setCible] = useState(null);
  const [etape, setEtape] = useState(initialiser === nouveau ? 'choix' : 'mulligan');
  const [deckJoueur, setDeckJoueur] = useState(null);
  const [deckSorcier, setDeckSorcier] = useState(null);
  const [plateauMoba, setPlateauMoba] = useState(MOBA_PLATEAU_PAR_DEFAUT);
  const [modeHistoire, setModeHistoire] = useState(false);
  const [chapitreIndex, setChapitreIndex] = useState(0);
  const [annoncePremier, setAnnoncePremier] = useState(false);
  const [interlude, setInterlude] = useState(false);
  const deckCampagneRef = useRef(null);
  const musiqueMobaRef = useRef(null);
  useEffect(() => {
    const musique = new RpgConqueteMusic();
    musiqueMobaRef.current = musique;
    return () => { musique.destroy(); musiqueMobaRef.current = null; };
  }, []);
  useEffect(() => {
    musiqueMobaRef.current?.setVolume(volumeMusique);
    musiqueMobaRef.current?.setMuted(!sonActif);
  }, [volumeMusique, sonActif]);
  useEffect(() => {
    const musique = musiqueMobaRef.current;
    // Le master annonce déjà le plateau suivant : sa musique accompagne le
    // portrait, puis reste la même lorsque le nouveau duel s'ouvre.
    const plateauMusical = annoncePremier ? MOBA_HISTOIRE[0].plateau.musique
      : interlude && modeHistoire ? MOBA_HISTOIRE[chapitreIndex + 1]?.plateau.musique ?? plateauMoba.musique
        : plateauMoba.musique;
    musique?.setPlateau(plateauMusical);
    if (etape === 'choix' && !annoncePremier) musique?.stop();
    else if (sonActif && !document.hidden) void musique?.start();
    else musique?.pause();
  }, [plateauMoba, etape, sonActif, interlude, modeHistoire, chapitreIndex, annoncePremier]);
  useEffect(() => {
    const surVisibilite = () => {
      if (document.hidden || !sonActif || (etape === 'choix' && !annoncePremier)) musiqueMobaRef.current?.pause();
      else void musiqueMobaRef.current?.start();
    };
    document.addEventListener('visibilitychange', surVisibilite);
    return () => document.removeEventListener('visibilitychange', surVisibilite);
  }, [etape, sonActif, annoncePremier]);
  const [decksPersonnalises, setDecksPersonnalises] = useState({ joueur: null, sorcier: null });
  const [edition, setEdition] = useState(null);
  const [confirmerSortie, setConfirmerSortie] = useState(false);
  const [parametresOuverts, setParametresOuverts] = useState(false);
  const [pageMain, setPageMain] = useState(0);
  const [pageJournal, setPageJournal] = useState(0);
  const [vueJournal, setVueJournal] = useState('texte');
  const [cimetiere, setCimetiere] = useState(null);
  const mulliganSide = 'joueur';
  const [mulliganIndices, setMulliganIndices] = useState([]);
  const [erreur, setErreur] = useState('');
  const [prixLane, setPrixLane] = useState(null);
  const [cibleSortPrimaire, setCibleSortPrimaire] = useState(null);
  const [iaBloquee, setIaBloquee] = useState(false);
  const [events, setEvents] = useState([]);
  const [apercu, setApercu] = useState(null);
  const [combatFx, setCombatFx] = useState({});
  const [retoursCombat, ajouterRetourCombat, effacerRetoursCombat] = useEffetsTemporairesMoba(1500);
  const [ripostesVisuelles, ajouterRipostes, effacerRipostes] = useEffetsTemporairesMoba(800);
  const [projectilesVisuels, ajouterProjectiles, effacerProjectiles] = useEffetsTemporairesMoba(650);
  const [signaturesVisuelles, ajouterSignatures, effacerSignatures] = useEffetsTemporairesMoba(1000);
  const [chocsVisuels, ajouterChocs, effacerChocs] = useEffetsTemporairesMoba(700);
  const combatFeedback = rpgMobaFusionnerFeedback(retoursCombat);
  const [impactsIndividuels, ajouterImpactIndividuel, effacerImpactsIndividuels] = useEffetsTemporairesMoba(1200);
  const [sortFx, setSortFx] = useState({});
  const [paradesVisuelles, ajouterParades, effacerParades] = useEffetsTemporairesMoba(1200);
  const afficherSortFx = (fx) => {
    setSortFx(fx);
    ajouterParades(Object.fromEntries(Object.entries(fx).filter(([, effet]) => effet.bouclier).map(([id, effet]) => [id, effet.bouclier])));
  };
  const [annonceSort, setAnnonceSort] = useState(null);
  const [annoncesApercues, setAnnoncesApercues] = useState([]);
  const retourAnnonceRef = useRef(null);
  const boutonRevoirAnnonce = useRef(null);
  const focusRetourAnnonce = useRef(false);
  const [soinsVoiesEtat, setSoinsVoiesEtat] = useState({ events: [], token: 0 });
  const soinsVoies = soinsVoiesEtat.events;
  const setSoinsVoies = (events) => setSoinsVoiesEtat((old) => ({ events, token: old.token + 1 }));
  const [soinsCreatures, ajouterSoinsCreatures, effacerSoinsCreatures] = useEffetsTemporairesMoba(1400);
  const [boucliersAjoutes, ajouterBoucliers, effacerBoucliers] = useEffetsTemporairesMoba(1200);
  // L'entrée ne se montre qu'après l'éventuel rituel de sacrifice.
  const [entreesVisuelles, ajouterEntrees, effacerEntrees] = useEffetsTemporairesMoba(3000);
  const [conquetesVisuelles, ajouterConquetes, effacerConquetes] = useEffetsTemporairesMoba(1500);
  const [sortiesVisuelles, ajouterSorties, effacerSorties] = useEffetsTemporairesMoba(1100);
  const [retoursExil, ajouterRetoursExil, effacerRetoursExil] = useEffetsTemporairesMoba(1400);
  const [fantomes, setFantomes] = useState([]);
  const [cerclesSacrifice, setCerclesSacrifice] = useState([]);
  const [glissement, setGlissement] = useState(null);
  const glissementRef = useRef(null);
  const toucherGlisseRef = useRef(null);
  const terrainRef = useRef(null);
  const appuiLong = useRef(null);
  const sourceApercu = useRef(null);
  const focusApercu = useRef(null);
  const retourFocusApercu = useRef(false);
  const annulerAppuiLong = () => { appuiLong.current?.(); appuiLong.current = null; };
  useEffect(() => () => { toucherGlisseRef.current?.(); appuiLong.current?.(); sourceApercu.current?.removeAttribute('data-apercu-source'); }, []);
  const ouvrirApercu = (carteId, entity, source) => {
    if (!rendu?.ApercuCarteAppuiLong || !cardById(carteId)) return;
    sourceApercu.current?.removeAttribute('data-apercu-source');
    sourceApercu.current = source;
    source?.setAttribute('data-apercu-source', '');
    focusApercu.current = source?.contains(document.activeElement) ? document.activeElement : (source?.querySelector('.moba__inspect, button:not(:disabled)') ?? source);
    const face = source?.matches('[data-card-id]') ? source : source?.querySelector('.rpg-card[data-card-id]');
    setApercu({ carteId, entity, dansMain: Boolean(source?.closest('.moba__hand')), armes: (face?.dataset.armes ?? '').split(' ').filter(Boolean), effetsEpuises: (face?.dataset.effetsEpuises ?? '').split(' ').filter(Boolean) });
  };
  const fermerApercu = () => {
    sourceApercu.current?.removeAttribute('data-apercu-source');
    sourceApercu.current = null;
    retourFocusApercu.current = true;
    setApercu(null);
  };
  useEffect(() => {
    if (!apercu && retourFocusApercu.current) {
      retourFocusApercu.current = false;
      focusApercu.current?.focus({ preventScroll: true });
      focusApercu.current = null;
    }
  }, [apercu]);
  const interactionsApercu = (carteId, entity = null) => ({
    tabIndex: rendu?.ApercuCarteAppuiLong ? 0 : undefined,
    role: rendu?.ApercuCarteAppuiLong ? 'group' : undefined,
    'aria-label': rendu?.ApercuCarteAppuiLong ? `${entity?.name ?? cardById(carteId)?.name ?? carteId}, fiche par la touche I` : undefined,
    onKeyDownCapture: (event) => {
      if (event.key.toLowerCase() !== 'i' || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault(); ouvrirApercu(carteId, entity, event.currentTarget);
    },
    onContextMenu: (event) => {
      event.preventDefault(); annulerAppuiLong(); ouvrirApercu(carteId, entity, event.currentTarget);
    },
    onPointerDownCapture: (event) => {
      if (!peutDemarrerAppuiLong(event)) return;
      annulerAppuiLong();
      appuiLong.current = startRpgLongPress(event, { source: event.currentTarget, onTrigger: ({ source }) => { toucherGlisseRef.current?.(); toucherGlisseRef.current = null; ouvrirApercu(carteId, entity, source); } });
    },
  });
  const sequenceFx = useRef(0);
  // Un même effet peut soigner à la fois une voie et plusieurs créatures.
  const soinSonJoue = useRef(false);
  const jouerSonSoin = () => {
    if (!soinSonJoue.current) { soinSonJoue.current = true; onPlaySfx?.('soin_vie'); }
  };
  // Consume the engine's per-duel audio journals once after each render. This
  // includes scheduled Tenacité returns and does not expose the AI hand.
  useEffect(() => {
    const arrivees = rpgConsommerArriveesCreature(duel);
    const navires = rpgConsommerArriveesNavire(duel);
    const pirates = rpgConsommerArriveesPirate(duel);
    const nains = rpgConsommerArriveesDwarf(duel);
    if (arrivees.length || navires.length || pirates.length || nains.length) onArriveesAudio?.({ arrivees, navires, pirates, nains });
    const entrees = arrivees.filter((event) => duel[event.cote]?.creatures.some((entity) => entity.id === event.entityId));
    const retours = entrees.filter((event) => event.origine === 'retour-exil');
    if (retours.length) {
      ajouterRetoursExil(Object.fromEntries(retours.map((event) => {
        const entity = duel[event.cote].creatures.find((item) => item.id === event.entityId);
        const lane = duel.moba.lanes.find((item) => item.slots[event.cote].includes(event.entityId));
        return [event.entityId, { name: entity.name, cardId: entity.carteId, side: event.cote, exilEntityId: event.exilEntityId,
          laneId: lane?.id ?? entity.mobaLane, slot: lane?.slots[event.cote].indexOf(event.entityId) ?? -1 }];
      })));
    }
    if (entrees.length && !rpgAnimationsReduites()) {
      const token = ++sequenceFx.current;
      ajouterEntrees(Object.fromEntries(entrees.map((event) => [event.entityId, { token, origine: event.origine }])));
    }
    const soins = rpgMobaSoinsCreatures(rpgConsommerSoins(duel), duel);
    if (Object.keys(soins).length) {
      const token = ++sequenceFx.current;
      ajouterSoinsCreatures(Object.fromEntries(Object.entries(soins).map(([id, montant]) => [id, { montant, token }])));
      jouerSonSoin();
    }
    soinSonJoue.current = false;
  });
  useEffect(() => {
    for (const id of duel.joueur.main) onPreloadVoice?.(id);
  }, [duel, version, onPreloadVoice]);
  const boutonParametres = useRef(null);
  const retourFocusParametres = useRef(false);
  const fermerParametres = () => { retourFocusParametres.current = true; setParametresOuverts(false); };
  useEffect(() => {
    if (!parametresOuverts && retourFocusParametres.current) {
      retourFocusParametres.current = false;
      boutonParametres.current?.focus({ preventScroll: true });
    }
  }, [parametresOuverts]);
  const clavierParametres = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); fermerParametres(); return; }
    if (event.key !== 'Tab') return;
    const elements = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
    const premier = elements[0], dernier = elements[elements.length - 1];
    if (premier && event.shiftKey && document.activeElement === premier) { event.preventDefault(); dernier.focus(); }
    else if (dernier && !event.shiftKey && document.activeElement === dernier) { event.preventDefault(); premier.focus(); }
  };
  const boutonQuitter = useRef(null);
  const boutonCimetiere = useRef(null);
  const retourFocusCimetiere = useRef(false);
  const ouvrirCimetiere = (side, event) => { boutonCimetiere.current = event.currentTarget; setCimetiere(side); };
  const fermerCimetiere = () => { retourFocusCimetiere.current = true; setCimetiere(null); };
  useEffect(() => {
    if (!cimetiere && retourFocusCimetiere.current) {
      retourFocusCimetiere.current = false;
      boutonCimetiere.current?.focus();
    }
  }, [cimetiere]);
  const retourFocusSortie = useRef(false);
  const fermerConfirmation = () => { retourFocusSortie.current = true; setConfirmerSortie(false); };
  useEffect(() => {
    if (!confirmerSortie && retourFocusSortie.current) {
      retourFocusSortie.current = false;
      boutonQuitter.current?.focus();
    }
  }, [confirmerSortie]);
  useEffect(() => {
    if (!onBackRef) return undefined;
    const retour = () => {
      if (apercu) fermerApercu();
      else if (parametresOuverts) fermerParametres();
      else if (cimetiere) fermerCimetiere();
      else if (confirmerSortie) fermerConfirmation();
      else if (retourAnnonceRef.current) retourAnnonceRef.current();
      else if (edition) setEdition(null);
      else if (annoncePremier) { setAnnoncePremier(false); if (etape === 'choix') setModeHistoire(false); }
      else if (etape === 'choix' || (Boolean(duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) && !interlude)) onQuitter();
      else if (interlude) setInterlude(false);
      else setConfirmerSortie(true); // Ne pas détruire une partie en cours sans confirmation.
      return true;
    };
    onBackRef.current = retour;
    return () => { if (onBackRef.current === retour) onBackRef.current = null; };
  }, [onBackRef, apercu, parametresOuverts, cimetiere, confirmerSortie, edition, etape, onQuitter, duel, interlude, annoncePremier]);
  const clavierConfirmation = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); fermerConfirmation(); return; }
    if (event.key !== 'Tab') return;
    const boutons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    if (!boutons.length) return;
    const actif = event.currentTarget.ownerDocument.activeElement;
    if (event.shiftKey && actif === boutons[0]) { event.preventDefault(); boutons[boutons.length - 1].focus(); }
    else if (!event.shiftKey && actif === boutons[boutons.length - 1]) { event.preventDefault(); boutons[0].focus(); }
  };
  useEffect(() => {
    if (!Object.keys(combatFx).length) return undefined;
    const timer = window.setTimeout(() => setCombatFx({}), dureeAnimation(900));
    return () => window.clearTimeout(timer);
  }, [combatFx]);
  useEffect(() => {
    if (!Object.keys(sortFx).length) return undefined;
    const timer = window.setTimeout(() => setSortFx({}), dureeAnimation(900));
    return () => window.clearTimeout(timer);
  }, [sortFx]);
  useEffect(() => {
    if (!annonceSort) return undefined;
    const timer = window.setTimeout(() => setAnnonceSort(null), dureeAnimation(2400));
    return () => window.clearTimeout(timer);
  }, [annonceSort]);
  useEffect(() => {
    if ((!events.length && !soinsVoies.length)) return undefined;
    const timer = window.setTimeout(() => { setEvents([]); setSoinsVoies([]); }, dureeAnimation(900));
    return () => window.clearTimeout(timer);
  }, [events, soinsVoies]);
  useEffect(() => {
    if (!fantomes.length) return undefined;
    const timer = window.setTimeout(() => setFantomes([]), dureeAnimation(1200));
    return () => window.clearTimeout(timer);
  }, [fantomes]);
  useEffect(() => {
    if (!cerclesSacrifice.length) return undefined;
    // Secours si animationend ne se déclenche pas (onglet masqué, iframe).
    const timer = window.setTimeout(() => setCerclesSacrifice([]), rpgAnimationsReduites()
      ? SACRIFICE_ANIMATION.reduit
      : dureeAnimation(SACRIFICE_ANIMATION.cercle + SACRIFICE_ANIMATION.secours));
    return () => window.clearTimeout(timer);
  }, [cerclesSacrifice]);
  const actif = duel.tour;
  const defenseur = autre(actif);
  const fini = Boolean(duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul);
  const vainqueur = duel.moba.winner ?? duel.fin?.gagnant ?? (duel.fin?.nul ? 'nul' : null);
  const prochainChapitre = modeHistoire ? prochainChapitreMoba(chapitreIndex, vainqueur) : null;
  const chapitreAnnonce = annoncePremier ? MOBA_HISTOIRE[0] : fini && interlude ? prochainChapitre : null;
  // Le tour appartient toujours au même camp pendant les fenêtres de réponse.
  // Observer le duel et son camp, pas l'étape d'interaction, évite les doublons.
  const partieCommencee = etape !== 'choix' && etape !== 'mulligan' && !fini;
  const [annonceTour, setAnnonceTour] = useState(null);
  const tourAnnonceRef = useRef({ duel: null, camp: null });
  const sequenceTourRef = useRef(0);
  const dureeAnnonceTour = rendu?.dureeAnnonceTour ?? 1500;
  useEffect(() => {
    if (!partieCommencee || !actif) {
      setAnnonceTour(null);
      return;
    }
    if (tourAnnonceRef.current.duel === duel && tourAnnonceRef.current.camp === actif) return;
    tourAnnonceRef.current = { duel, camp: actif };
    setAnnonceTour({ duel, camp: actif, token: ++sequenceTourRef.current });
  }, [duel, actif, partieCommencee]);
  useEffect(() => {
    if (!annonceTour) return undefined;
    const timer = window.setTimeout(() => setAnnonceTour((courant) => courant?.token === annonceTour.token ? null : courant), dureeAnnonceTour);
    return () => window.clearTimeout(timer);
  }, [annonceTour, dureeAnnonceTour]);
  const annonceTourVisible = partieCommencee && annonceTour?.duel === duel && annonceTour.camp === actif ? annonceTour : null;
  const sonFinJoue = useRef(null);
  useEffect(() => {
    if (!fini || !['joueur', 'sorcier'].includes(vainqueur) || sonFinJoue.current === duel) return;
    sonFinJoue.current = duel;
    onPlaySfx?.(vainqueur === 'joueur' ? 'victoire' : 'defaite');
  }, [duel, fini, vainqueur, onPlaySfx]);
  const camp = duel[actif];
  const defausse = duel.defausseEnAttente?.restant ?? 0;
  const recherche = duel.mobaRechercheEnAttente;
  const site = !fini ? duel.siteEnAttente : null;
  const ciblesSite = new Set(site ? rpgMobaCiblesSite(duel, site.cote) : []);
  const destruction = !fini ? duel.destructionsEnAttente?.[0] : null;
  const ciblesDestruction = new Set(destruction ? rpgMobaCiblesDestruction(duel, destruction.cote) : []);
  const arriveeSide = duel.arriveeEnAttente?.cote ?? actif;
  const repondant = etape === 'reponse-creature' && duel.mobaCreatureEnAttente ? autre(duel.mobaCreatureEnAttente.cote)
    : etape === 'reponse-arrivee' && duel.effetCreatureEnAttente ? autre(duel.effetCreatureEnAttente.cote) : defenseur;
  const mainSide = destruction ? destruction.cote : defausse ? duel.defausseEnAttente.cote : etape === 'arrivee' ? arriveeSide : (['blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) ? repondant : actif);
  const campMain = duel[mainSide];
  // La main affichée reste celle du joueur, même lorsque l'IA a la main.
  // mainSide désigne uniquement le camp autorisé à agir/répondre.
  const campMainVisible = duel.joueur;
  const poidsLie = carte === 'le-poids' && lienSatisfait(cardById('le-poids'), campMain.creatures);
  const nombrePagesMain = Math.max(1, Math.ceil(campMainVisible.main.length / TAILLE_PAGE_MAIN));
  const pageMainVisible = Math.min(pageMain, nombrePagesMain - 1);
  const debutPageMain = pageMainVisible * TAILLE_PAGE_MAIN;
  const lignesJournal = duel.log.slice(-12).reverse();
  const echangesJournal = (duel.combatFeed ?? []).slice(-12).reverse();
  const contenuJournal = vueJournal === 'combat' && rendu?.CombatFeedEvent ? echangesJournal : lignesJournal;
  const pagesJournal = Math.max(1, Math.ceil(contenuJournal.length / 2));
  const pageJournalVisible = Math.min(pageJournal, pagesJournal - 1);
  useEffect(() => {
    setPageMain((page) => Math.min(page, nombrePagesMain - 1));
  }, [nombrePagesMain]);
  const getEntity = (side, id) => duel[side].creatures.find((e) => e.id === id);
  const rattachement = duel.moba.centerJoined;
  const scores = Object.fromEntries(['joueur', 'sorcier'].map((side) => [side, duel.moba.lanes.filter((lane) => lane.conqueredBy === side).length]));
  const decksDuJoueur = decksMaison.map(rpgMobaDeckMaison);
  // No hidden fallback to a predefined MOBA deck: pick a compatible personal
  // deck initially, or require the player to create one.
  const deckPour = (side) => side === 'sorcier' ? (deckSorcier ?? MOBA_DECKS[0])
    : decksPersonnalises.joueur ?? (deckJoueur === null
      ? decksDuJoueur.find((deck) => rpgMobaValiderDeck(deck).ok)
      : decksDuJoueur.find((deck) => deck.id === deckJoueur)) ?? null;
  const validationDeckJoueur = deckPour('joueur') ? rpgMobaValiderDeck(deckPour('joueur')) : { ok: false, raison: 'Choisissez ou créez un deck compatible.' };
  const choisirDeck = (id) => {
    setDeckJoueur(id);
    setDecksPersonnalises((decks) => ({ ...decks, joueur: null }));
  };
  const afficherResultat = (res) => {
    setErreur(res.ok ? '' : (message[res.raison] ?? `Action refusée (${res.raison}).`));
    if (!res.ok && iaAgit) setIaBloquee(true);
    redraw();
    return res.ok;
  };
  // The engine's destruction journal distinguishes real deaths from returns
  // to hand and conquest exiles. Capture lane/slot before each mutation; the
  // visual overlay never occupies a slot or changes the authoritative state.
  const instantaneDestructions = () => ({
    position: rpgNombreDestructions(duel),
    blessures: rpgNombreBlessures(duel),
    animationSeq: Number(duel.combatAnimationSeq) || 0,
    positions: rpgAnimationsReduites() ? null : rpgMobaPositionsContreAttaque(terrainRef.current),
    renvois: rpgRenvoisEnMain(duel).length,
    exils: rpgExils(duel).length,
    voies: duel.moba.lanes.map(({ id, active }) => ({ id, active })),
    cartes: duel.moba.lanes.flatMap((lane) => ['joueur', 'sorcier'].flatMap((side) =>
      lane.slots[side].flatMap((id, slot) => {
        const entity = id && getEntity(side, id);
        return entity ? [{ entityId: id, cardId: entity.carteId, name: entity.name, laneId: lane.id, side, slot, bouclier: entity.bouclier, bouclierLumiere: entity.bouclierLumiere }] : [];
      }))),
  });
  const montrerDestructions = (avant, impactCombat = false, sacrificeIds = [], entiteArriveeId = null) => {
    if (!rpgAnimationsReduites()) {
      const ripostes = rpgMobaCiblesContreAttaque(avant, duel);
      ajouterRipostes(Object.fromEntries(ripostes.map((effet) => [`${++sequenceFx.current}-${effet.id}`, effet])));
      const tirs = rpgMobaProjectiles(avant, duel);
      ajouterProjectiles(Object.fromEntries(tirs.map((effet) => [`${++sequenceFx.current}-${effet.id}`, effet])));
      const signatures = rpgMobaSignatures(avant, duel, rpgBlessuresDepuis(duel, avant.blessures));
      ajouterSignatures(Object.fromEntries(signatures.map((effet) => [`${++sequenceFx.current}-${effet.type}-${effet.entityId}`, effet])));
    }
    const sorties = rpgMobaSorties(avant, rpgRenvoisEnMain(duel), rpgExils(duel), duel);
    if (sorties.length) {
      if (sorties.some((item) => item.variante === 'eau')) onPlaySfx?.('creature_return');
      if (sorties.some((item) => item.variante === 'exil')) onPlaySfx?.('cold_wind');
      ajouterSorties(Object.fromEntries(sorties.map((item) => {
        const effectId = `sortie-${++sequenceFx.current}-${item.entityId}`;
        return [effectId, { ...item, effectId, relatifAuSlot: true }];
      })));
    }
    const conquetes = rpgMobaNouvellesConquetes(avant, duel.moba);
    if (conquetes.length && !rpgAnimationsReduites()) {
      const token = ++sequenceFx.current;
      ajouterConquetes(Object.fromEntries(conquetes.map(({ laneId, side }) => [laneId, { side, token }])));
    }
    const protections = rpgMobaBoucliersAjoutes(avant, duel);
    if (protections.length) {
      const token = ++sequenceFx.current;
      ajouterBoucliers(Object.fromEntries(protections.map((id) => [id, token])));
    }
    // Une invocation résolue peut sacrifier une ou deux cartes, y compris
    // celles de l'IA après une fenêtre de réponse. Le cercle utilise leurs
    // cases d'avant la mutation et ne rejoue pas le fantôme de mort ordinaire.
    const victimes = !rpgAnimationsReduites() && rendu?.CercleMagique
      ? victimesSacrificeSurVoies(avant, sacrificeIds).map((entite) => ({
        ...entite, entiteArriveeId,
        effectId: `invocation-moba-${++sequenceFx.current}-${entite.entityId}`,
      })) : [];
    if (victimes.length) setCerclesSacrifice((old) => [...old, ...victimes]);
    const idsAnimes = new Set(victimes.map((entite) => entite.entityId));
    const evenements = rpgDestructionsDepuis(duel, avant.position);
    const disparues = evenements.flatMap((event) => {
      const carteAvant = avant.cartes.find((item) => item.entityId === event.entityId);
      if (!carteAvant || idsAnimes.has(event.entityId) || duel[carteAvant.side].creatures.some((item) => item.id === event.entityId)) return [];
      return [{ ...carteAvant, pleinEmplacement: true, impactCombat, bruleeParBraise: event.sourceElements.includes('braise'), effectId: `${++sequenceFx.current}-${event.entityId}` }];
    });
    if (!disparues.length && !victimes.length) return;
    onPlaySfx?.(disparues.some((item) => item.bruleeParBraise) ? 'flame_gust' : 'destruction_hit');
    if (!rpgAnimationsReduites() && rendu?.FantomeCarteDetruite) setFantomes((old) => [...old, ...disparues]);
  };
  const confirmerMulligan = () => {
    const result = rpgMobaMulligan(duel, mulliganSide, mulliganIndices);
    if (!afficherResultat(result)) return;
    setMulliganIndices([]);
    const ia = rpgMobaMulligan(duel, 'sorcier', choisirMulliganIA(duel, 'sorcier'));
    if (!afficherResultat(ia)) return;
    setEtape('tour');
  };
  const finTour = () => {
    const avantDestructions = instantaneDestructions();
    const result = rpgMobaTerminerTour(duel, actif);
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions);
    setCarte(null); setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); setBlocages({}); setCible(null); setEvents([]);
    if (result.reponse) setEtape('fin');
  };
  const choisirCibleSite = (id) => {
    if (!site || destruction || !ciblesSite.has(id)) return;
    const decksAvant = ['joueur', 'sorcier'].map((side) => duel[side].deck.length);
    const avantDestructions = instantaneDestructions();
    const result = rpgMobaResoudreSite(duel, site.cote, id);
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions);
    if (['joueur', 'sorcier'].some((side, index) => duel[side].deck.length < decksAvant[index])) onPlaySfx?.('card_draw');
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    if (result.healingEvents?.length) setSoinsVoies(result.healingEvents);
  };
  const choisirCibleDestruction = (id) => {
    if (!destruction || !ciblesDestruction.has(id)) return;
    const avantDestructions = instantaneDestructions();
    const avant = ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.map((entity) => ({ entity, pv: entity.pv, bouclier: entity.bouclier })));
    const result = rpgMobaResoudreDestruction(duel, destruction.cote, id);
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions);
    const token = ++sequenceFx.current;
    const fx = {};
    for (const { entity, pv, bouclier } of avant) {
      if (entity.pv < pv) fx[entity.id] = { action: { type: 'hit' } };
      if (bouclier > 0 && !entity.bouclier) fx[entity.id] = { ...fx[entity.id], bouclier: { montant: bouclier, token } };
    }
    afficherSortFx(fx);
    if (Object.values(fx).some((item) => item.bouclier)) onPlaySfx?.('weapon_break');
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    if (result.healingEvents?.length) { setSoinsVoies(result.healingEvents); if (result.healingEvents.some((event) => event.healing > 0)) jouerSonSoin(); }
    if (result.drawEvents?.length) onPlaySfx?.('card_draw');
    if (duel.arriveeEnAttente?.retour) setEtape('arrivee');
    const reponseImbriquee = Boolean(duel.mobaCreatureEnAttente?.embuscadeCombat || duel.mobaCreatureEnAttente?.embuscadeSuspendue || duel.mobaEmbuscadeArrivee);
    if (etape === 'blocage' || reponseImbriquee) {
      const survivants = duel.combatDeclare?.attaquants ?? [];
      setAttaquants(survivants);
      setCiblesRapides(duel.combatDeclare?.ciblesAttaque ?? {});
      setCible((old) => survivants.includes(old) ? old : survivants[0] ?? null);
      setBlocages((old) => Object.fromEntries(Object.entries(old).filter(([attaquant]) => survivants.includes(attaquant))
        .map(([attaquant, ids]) => [attaquant, ids.filter((bloqueur) => duel[defenseur].creatures.some((entity) => entity.id === bloqueur))])));
      if (result.combatTermine && !reponseImbriquee) setEtape('tour');
    }
  };
  const passerFinTour = () => {
    const positionJournal = duel.log.length;
    const avantDestructions = instantaneDestructions();
    const lumieresAvant = ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.filter((entity) => entity.bouclierLumiere));
    const result = rpgMobaPasserFinDeTour(duel, defenseur);
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions);
    const lumieresBrisees = lumieresAvant.filter((entity) => !entity.bouclierLumiere);
    if (lumieresBrisees.length) {
      const token = ++sequenceFx.current;
      afficherSortFx(Object.fromEntries(lumieresBrisees.map((entity) => [entity.id, { bouclier: { montant: 1, token, lumiere: true } }])));
      onPlaySfx?.('weapon_break');
    }
    if (result.healingEvents?.length) { setSoinsVoies(result.healingEvents); if (result.healingEvents.some((event) => event.healing > 0)) jouerSonSoin(); }
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    if (result.drawEvents?.length || duel.log.slice(positionJournal).some((line) => line.includes('Trésor de Lima') && line.includes('est découvert') && !line.includes('piochez 0 carte') && !line.includes('pioche 0 carte'))) onPlaySfx?.('card_draw');
    setCarte(null); setEtape(duel.arriveeEnAttente ? 'arrivee' : 'tour'); setEvents(result.damageEvents ?? []);
  };
  const terminerMagie = (result, reponseEmbuscade = false) => {
    if (!afficherResultat(result)) return false;
    setCarte(null);
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.healingEvents?.length) setSoinsVoies(result.healingEvents);
    if (etape === 'blocage' || reponseEmbuscade) {
      const survivants = duel.combatDeclare?.attaquants ?? [];
      setAttaquants(survivants);
      setCiblesRapides(duel.combatDeclare?.ciblesAttaque ?? {});
      setCibleRapideEnCours(null);
      setCible((id) => survivants.includes(id) && !duel.combatDeclare?.ciblesAttaque?.[id] ? id : survivants.find((survivant) => !duel.combatDeclare?.ciblesAttaque?.[survivant]) ?? null);
      setBlocages((old) => Object.fromEntries(Object.entries(old)
        .filter(([id]) => survivants.includes(id))
        .map(([id, ids]) => [id, ids.filter((blocker) => duel[defenseur].creatures.some((entity) => entity.id === blocker))])));
      if (result.combatTermine && !reponseEmbuscade) setEtape('tour');
    } else { setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); }
    return true;
  };
  // Capture the public target and surviving creatures before the mutable engine
  // resolves the spell: the chosen creature may disappear during resolution.
  const lancerMagie = (id, cibleId = null, laneId = null, prixLaneId = null, cibleSecondaireId = null, emplacementReanimation = null) => {
    const caster = mainSide;
    const reponseEmbuscade = Boolean(etape === 'reponse-creature' && (duel.mobaCreatureEnAttente?.embuscadeCombat || duel.mobaCreatureEnAttente?.embuscadeSuspendue) || etape === 'reponse-arrivee' && duel.mobaEmbuscadeArrivee);
    const carteMagie = cardById(id);
    const entityCible = cibleId && cibleId !== 'sorcier'
      ? ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures).find((entity) => entity.id === cibleId)
      : null;
    const entitySecondaire = cibleSecondaireId && duel[id === 'defi-du-jarl' ? caster : autre(caster)].creatures.find((entity) => entity.id === cibleSecondaireId);
    const cibleAnnonce = entityCible
      ? { nom: id === 'le-poids' && laneId ? `${entityCible.name} + ${voies[laneId]}` : entitySecondaire ? `${entityCible.name} + ${entitySecondaire.name}` : entityCible.name, illustrationId: entityCible.carteId }
      : MOBA_MAGIES_RENFORT_REPONSE.includes(id) ? { nom: `Créatures · ${noms[caster]}` }
      : MOBA_MAGIES_ZONE_REPONSE.includes(id) ? { nom: `Créatures · ${noms[MOBA_MAGIES_ZONE_TOTALE_REPONSE.includes(id) ? 'tous' : autre(caster)]}` }
      : MOBA_CONTRESORTS.includes(id) ? { nom: cardById((duel.mobaSortEnAttente ?? duel.mobaCreatureEnAttente)?.carteId)?.name ?? 'Carte annoncée' }
      : id === 'nom-efface' ? { nom: `Main · ${noms[autre(caster)]}` }
      : id === 'grand-voile-blanc' ? { nom: `Combat · ${noms.tous}` }
      : id === 'papyrus' ? { nom: `Pioche de ${noms[caster]}` }
      : id === 'reanimation' ? { nom: `Cimetière → ${voies[laneId]} · ${noms[caster]}` }
      : id === 'lame-des-ergs' && !cibleId ? { nom: `Chien de sable → ${voies[laneId]} · ${noms[caster]}` }
      : laneId
        ? { nom: `${voies[laneId]} · ${noms[MOBA_MAGIES_SOINS.includes(id) || (MOBA_MAGIES_PRIX.includes(id) && !MOBA_MAGIES_TRANSFERT.includes(id)) ? caster : autre(caster)]}` }
        : ['rapport-du-greffier', 'le-routier'].includes(id) ? { nom: `Pioche de ${noms[caster]}` }
          : id === 'les-feuillets' ? { nom: `Pioche de ${noms[autre(caster)]}` }
            : { nom: 'Champ de bataille' };
    const avant = new Map(['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.map((entity) => [entity.id, entity.pv])));
    const lumieresAvant = ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.filter((entity) => entity.bouclierLumiere));
    const piocheAvant = duel[caster].deck.length;
    const avantDestructions = instantaneDestructions();
    const result = MOBA_ARMES.includes(id)
      ? rpgMobaJouerArme(duel, caster, id, cibleId, { ouvrirReponse: etape === 'tour', laneId, slot: emplacementReanimation })
      : rpgMobaLancerMagie(duel, caster, id, cibleId, laneId, prixLaneId, { ouvrirReponse: etape === 'tour', cibleSecondaireId, emplacementReanimation });
    if (!terminerMagie(result, reponseEmbuscade)) return;
    if (result.sortEnAttente) setEtape('reponse-sort');
    else if (result.contre) setEtape(duel.mobaCreatureEnAttente ? 'reponse-creature' : duel.mobaSortEnAttente ? 'reponse-sort' : duel.effetCreatureEnAttente ? 'reponse-arrivee' : duel.finDeTour ? 'fin' : reponseEmbuscade && duel.combatDeclare ? 'blocage' : 'tour');
    setPrixLane(null); setCibleSortPrimaire(null);
    montrerDestructions(avantDestructions);
    const token = ++sequenceFx.current;
    const fx = {};
    for (const side of ['joueur', 'sorcier']) for (const entity of duel[side].creatures) {
      if (!avant.has(entity.id)) continue;
      const difference = entity.pv - avant.get(entity.id);
      if (difference < 0) fx[entity.id] = { action: { type: id.includes('foudre') || id === 'eclair-du-marteau' ? 'foudre' : 'hit' } };
    }
    if (result.bouclierBloque && result.bouclierEntityId) {
      fx[result.bouclierEntityId] = { ...fx[result.bouclierEntityId], bouclier: { montant: result.bouclierMontant, token } };
    }
    for (const entity of lumieresAvant) if (!entity.bouclierLumiere) {
      fx[entity.id] = { ...fx[entity.id], bouclier: { montant: 1, token } };
    }
    afficherSortFx(fx);
    setEvents(result.damageEvents ?? []);
    setSoinsVoies(result.healingEvents ?? []);
    setAnnonceSort({ carteId: id, cible: cibleAnnonce, camp: caster, token, contre: Boolean(result.contre) });
    const son = sonSortAuLancement(carteMagie);
    if (son) onPlaySfx?.(son);
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    if (result.contre) onPlaySfx?.('card_countered');
    if (result.bouclierBloque || lumieresAvant.some((entity) => !entity.bouclierLumiere)) onPlaySfx?.('weapon_break');
    if (duel[caster].deck.length < piocheAvant) onPlaySfx?.('card_draw');
    if (result.healingEvents?.some((event) => event.healing > 0)) jouerSonSoin();
  };
  const jouerCarte = (id, index) => {
    if (fini || destruction) return;
    if (defausse) {
      const finDeTour = duel.defausseEnAttente?.motif === 'fin-de-tour';
      const result = rpgMobaDefausser(duel, mainSide, index);
      if (afficherResultat(result) && !result.restant && finDeTour) finTour();
      return;
    }
    if (!['tour', 'blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) || campMain.manaChoixEnAttente) return;
    if (['blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && !cardById(id)?.instant && !(['blocage', 'fin', 'reponse-creature', 'reponse-sort', 'reponse-arrivee'].includes(etape) && rpgMobaPeutEmbuscade(duel, mainSide, id))) return;
    if ((MOBA_MAGIES_ESSAI.includes(id) || MOBA_MAGIES_IMMEDIATES.includes(id)) && MOBA_MAGIES_SPATIALES.includes(id)) {
      setCarte(id); setPrixLane(null); setErreur('');
    } else if (MOBA_MAGIES_ESSAI.includes(id) || MOBA_MAGIES_IMMEDIATES.includes(id) || MOBA_CONTRESORTS.includes(id)) {
      lancerMagie(id);
    } else { setSacrificesChoisis([]); setCarte(carte === id ? null : id); setPrixLane(null); setCibleSortPrimaire(null); setErreur(''); }
  };
  const poser = (lane, slot, carteId = carte) => {
    if (!carteId) return;
    const avantDestructions = instantaneDestructions();
    const nombre = rpgMobaSacrificesInvocation(duel, mainSide, cardById(carteId));
    if (sacrificesChoisis.length !== nombre) { setErreur(`Choisissez ${nombre} créature${nombre > 1 ? 's' : ''} à sacrifier.`); return; }
    const result = rpgMobaJouerCreature(duel, mainSide, carteId, lane, slot, { ouvrirReponse: true, sacrificeIds: sacrificesChoisis });
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions, false, result.sacrificeIds, result.entite?.id);
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    setCarte(null); setSacrificesChoisis([]);
    if (result.creatureEnAttente) setEtape('reponse-creature');
    else if (result.arriveeEnAttente) setEtape('arrivee');
  };
  const actualiserCombatApresArrivee = () => {
    const survivants = duel.combatDeclare?.attaquants ?? [];
    setAttaquants(survivants);
    setCiblesRapides(duel.combatDeclare?.ciblesAttaque ?? {});
    setCible((id) => survivants.includes(id) && !duel.combatDeclare?.ciblesAttaque?.[id] ? id : survivants.find((survivant) => !duel.combatDeclare?.ciblesAttaque?.[survivant]) ?? null);
    setBlocages((old) => Object.fromEntries(Object.entries(old).filter(([id]) => survivants.includes(id))
      .map(([id, ids]) => [id, ids.filter((blocker) => duel[defenseur].creatures.some((entity) => entity.id === blocker))])));
  };
  const choisirCibleArrivee = (id) => {
    const avantDestructions = instantaneDestructions();
    const piochesAvant = ['joueur', 'sorcier'].map((side) => duel[side].deck.length);
    const result = rpgMobaResoudreArrivee(duel, arriveeSide, id);
    const embuscadeCombat = Boolean(duel.mobaEmbuscadeArrivee || (arriveeSide !== actif && !duel.arriveeEnAttente?.retour));
    if (!afficherResultat(result)) return;
    if (embuscadeCombat) actualiserCombatApresArrivee();
    montrerDestructions(avantDestructions);
    if (result.drawEvents?.length || ['joueur', 'sorcier'].some((side, index) => duel[side].deck.length < piochesAvant[index])) onPlaySfx?.('card_draw');
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    if (result.healingEvents?.length) { setSoinsVoies(result.healingEvents); if (result.healingEvents.some((event) => event.healing > 0)) jouerSonSoin(); }
    if (result.effetEnAttente) setEtape('reponse-arrivee');
    else setEtape(result.arriveeEnAttente ? 'arrivee' : duel.mobaSortEnAttente ? 'reponse-sort' : duel.effetCreatureEnAttente ? 'reponse-arrivee' : embuscadeCombat && duel.combatDeclare ? 'blocage' : 'tour');
  };
  const passerEffetCreature = () => {
    const avantDestructions = instantaneDestructions();
    const embuscadeCombat = Boolean(duel.mobaEmbuscadeArrivee);
    const result = rpgMobaPasserEffetCreature(duel, repondant);
    if (!afficherResultat(result)) return;
    if (embuscadeCombat) actualiserCombatApresArrivee();
    montrerDestructions(avantDestructions);
    if (result.healingEvents?.length) { setSoinsVoies(result.healingEvents); if (result.healingEvents.some((event) => event.healing > 0)) jouerSonSoin(); }
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    setCarte(null); setEtape(embuscadeCombat && duel.combatDeclare ? 'blocage' : 'tour');
  };
  const passerCreature = () => {
    const attente = duel.mobaCreatureEnAttente;
    if (!attente) return;
    const piocheAvant = duel[attente.cote].deck.length;
    const avant = instantaneDestructions();
    const result = rpgMobaPasserCreature(duel, repondant);
    if (!afficherResultat(result)) return;
    if (attente.embuscadeCombat || attente.embuscadeSuspendue) actualiserCombatApresArrivee();
    montrerDestructions(avant, false, result.sacrificeIds, result.entite?.id);
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    if (result.healingEvents?.length) setSoinsVoies(result.healingEvents);
    if (result.healingEvents?.some((event) => event.healing > 0)) jouerSonSoin();
    if (duel[attente.cote].deck.length < piocheAvant) onPlaySfx?.('card_draw');
    setCarte(null); setEtape(result.arriveeEnAttente ? 'arrivee' : duel.mobaCreatureEnAttente ? 'reponse-creature' : duel.mobaSortEnAttente ? 'reponse-sort' : duel.effetCreatureEnAttente ? 'reponse-arrivee' : duel.finDeTour ? 'fin' : attente.embuscadeCombat && duel.combatDeclare ? 'blocage' : 'tour');
  };
  const passerSort = () => {
    const attente = duel.mobaSortEnAttente;
    const creaturesAvant = ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.map((entity) => ({ entity, pv: entity.pv, bouclier: entity.bouclier, protection: entity.protection, lumiere: entity.bouclierLumiere })));
    const piocheAvant = duel[attente.cote].deck.length;
    const avant = instantaneDestructions();
    const result = rpgMobaPasserSort(duel, defenseur);
    if (!afficherResultat(result)) return;
    setAnnonceSort((annonce) => annonce?.carteId === attente.carteId && annonce.camp === attente.cote ? null : annonce);
    montrerDestructions(avant);
    const token = ++sequenceFx.current;
    const fx = {};
    for (const { entity, pv, bouclier, protection, lumiere } of creaturesAvant) {
      if (entity.pv < pv) fx[entity.id] = { action: { type: attente.carteId.includes('foudre') || attente.carteId === 'eclair-du-marteau' ? 'foudre' : 'hit' } };
      if ((lumiere && !entity.bouclierLumiere) || ((MOBA_MAGIES_ZONE_REPONSE.includes(attente.carteId) || attente.carteId === 'feux-de-kitsune') && ((bouclier > 0 && !entity.bouclier) || (protection && !entity.protection)))) {
        fx[entity.id] = { ...fx[entity.id], bouclier: { montant: bouclier || 1, token } };
      }
    }
    if (result.bouclierBloque && result.bouclierEntityId) fx[result.bouclierEntityId] = { ...fx[result.bouclierEntityId], bouclier: { montant: result.bouclierMontant, token } };
    afficherSortFx(fx);
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.healingEvents?.length) setSoinsVoies(result.healingEvents);
    if (result.healingEvents?.some((event) => event.healing > 0)) jouerSonSoin();
    if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    if (result.bouclierBloque || Object.values(fx).some((item) => item.bouclier)) onPlaySfx?.('weapon_break');
    if (duel[attente.cote].deck.length < piocheAvant) onPlaySfx?.('card_draw');
    setCarte(null); setEtape(result.arriveeEnAttente ? 'arrivee' : 'tour');
  };
  const lancerSurCreature = (id) => {
    if (poidsLie) { setCibleSortPrimaire(id); return; }
    if (!carte || !(MOBA_MAGIES_CIBLEES.includes(carte) || MOBA_ARMES.includes(carte))) return;
    if (carte === 'defi-du-jarl') {
      if (!cibleSortPrimaire) { setCibleSortPrimaire(id); return; }
      if (!mobaPartageVoie(duel.moba, getEntity(mainSide, cibleSortPrimaire)?.mobaLane, getEntity(autre(mainSide), id)?.mobaLane)) { setErreur('Les deux créatures doivent être dans la même voie.'); return; }
      lancerMagie(carte, id, null, null, cibleSortPrimaire);
      return;
    }
    if (carte === 'feux-de-kitsune') {
      if (!cibleSortPrimaire) { setCibleSortPrimaire(id); return; }
      if (!mobaPartageVoie(duel.moba, getEntity(autre(mainSide), cibleSortPrimaire)?.mobaLane, getEntity(autre(mainSide), id)?.mobaLane)) { setErreur('Les deux cibles doivent être dans la même voie.'); return; }
      lancerMagie(carte, cibleSortPrimaire, null, null, cibleSortPrimaire === id ? null : id);
      return;
    }
    lancerMagie(carte, id);
  };
  const lancerSurVoie = (laneId) => {
    if (!carte || !MOBA_MAGIES_VOIES.includes(carte)) return;
    lancerMagie(carte, 'sorcier', laneId);
  };
  const soignerVoie = (laneId) => {
    if (!carte || !MOBA_MAGIES_SOINS.includes(carte)) return;
    lancerMagie(carte, null, laneId);
  };
  const transfererVoie = (laneId) => {
    if (!carte || !MOBA_MAGIES_TRANSFERT.includes(carte)) return;
    lancerMagie(carte, poidsLie ? cibleSortPrimaire : null, laneId, prixLane);
  };
  const payerDepuisVoie = (laneId) => {
    if (!carte || !MOBA_MAGIES_PRIX.includes(carte)) return;
    if (MOBA_MAGIES_TRANSFERT.includes(carte) || MOBA_MAGIES_SPATIALES.includes(carte)) { setPrixLane(laneId); return; }
    lancerMagie(carte, null, laneId);
  };
  // A staged choice must always be reversible before it is committed.
  const annulerChoix = () => {
    if (cibleRapideEnCours) {
      const id = cibleRapideEnCours;
      setAttaquants((ids) => ids.filter((valeur) => valeur !== id));
      setCiblesRapides((old) => { const next = { ...old }; delete next[id]; return next; });
      setCibleRapideEnCours(null);
    }
    setCibleVoieEnCours(null); setCarte(null); setPrixLane(null); setCibleSortPrimaire(null); setErreur('');
  };
  const choisirAttaquant = (id) => {
    if (etape !== 'tour' || carte || fini || defausse) return;
    if (attaquants.includes(id)) {
      setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); setCibleVoieEnCours(null); setErreur(''); return;
    }
    const choix = rpgMobaCiblesIndividuelles(duel, actif, id);
    if (!choix.directe && !choix.cibles.length) { setErreur('Aucune cible légale pour cette attaque.'); return; }
    if (!choix.cibles.length && mobaVoiesCombat(duel.moba, getEntity(actif, id)?.mobaLane).length <= 1) {
      declarer(id, null);
      return;
    }
    setAttaquants([id]); setCiblesRapides({});
    setCibleRapideEnCours(id);
    setErreur('');
  };
  const choisirCibleRapide = (id) => {
    if (!cibleRapideEnCours || !rpgMobaCiblesIndividuelles(duel, actif, cibleRapideEnCours).cibles.includes(id)) return;
    const voiesLegales = mobaVoiesCombat(duel.moba, getEntity(actif, cibleRapideEnCours)?.mobaLane)
      .filter((voie) => rpgMobaCiblesIndividuelles(duel, actif, cibleRapideEnCours, voie).cibles.includes(id));
    if (voiesLegales.length > 1) { setCibleVoieEnCours(id); return; }
    declarer(cibleRapideEnCours, id, voiesLegales[0]);
  };
  const assigner = (id, attaquantId = cible, basculer = true) => {
    if (etape !== 'blocage' || duel.combatDeclare?.blocages || !attaquantId || duel.combatDeclare?.ciblesAttaque?.[attaquantId]
      || !duel.combatDeclare?.attaquants?.includes(attaquantId)
      || !duel.moba.lanes.some((origin) => origin.slots[actif].includes(attaquantId) && mobaVoieCombat(duel.moba, actif, origin.id) === getEntity(defenseur, id)?.mobaLane)) return;
    const blocker = getEntity(defenseur, id);
    const attacker = getEntity(actif, attaquantId);
    const dejaAssigne = (blocages[attaquantId] ?? []).includes(id);
    const retire = basculer && dejaAssigne;
    if (!blocker || !attacker) return;
    if (!retire && (blocker.attaquee || blocker.gelToursRestants > 0 || blocker.empecheBlocageToursRestants > 0
      || !rpgPeutBloquerAttaquant(blocker, attacker) || rpgEstProtegee(attacker, cardColors(cardById(blocker.carteId))))) return;
    if (!basculer && dejaAssigne) return;
    onPlaySfx?.(retire ? 'annuler' : 'block_impact');
    setCombatFx({ [id]: { type: retire ? 'unblock' : 'block' }, [attaquantId]: { type: retire ? 'unblock' : 'block' } });
    setCible(attaquantId);
    setBlocages((old) => {
      const next = Object.fromEntries(Object.entries(old).map(([key, ids]) => [key, ids.filter((value) => value !== id)]));
      next[attaquantId] = basculer && (old[attaquantId] ?? []).includes(id) ? next[attaquantId] : [...(next[attaquantId] ?? []), id];
      return next;
    });
    setErreur('');
  };
  const peutDeposer = (drag, position) => {
    if (!drag || !position || fini || iaAgit || destruction || site || apercu || confirmerSortie || parametresOuverts || cimetiere || recherche || defausse) return false;
    const lane = duel.moba.lanes.find((item) => item.id === position.lane);
    if (!lane || (drag.type === 'creature' && !mobaVoieJouable(duel.moba, 'joueur', lane.id))) return false;
    if (drag.type === 'creature') {
      const card = cardById(drag.id);
      return etape === 'tour' && actif === 'joueur' && !cibleRapideEnCours && !camp.manaChoixEnAttente
        && position.side === 'joueur' && Number.isInteger(position.slot)
        && (rpgMobaSacrificesInvocation(duel, mainSide, card) > 0
          ? sacrificesChoisis.includes(lane.slots.joueur[position.slot]) : lane.slots.joueur[position.slot] === null)
        && sacrificesChoisis.length === rpgMobaSacrificesInvocation(duel, mainSide, card) && duel.joueur.main.includes(drag.id) && ['creature', 'hero', 'site'].includes(card?.kind) && rpgMobaPeutPayer(duel, 'joueur', card);
    }
    if (drag.type !== 'bloqueur' || duel.combatDeclare?.cibleIndividuelle || etape !== 'blocage' || defenseur !== 'joueur' || carte || position.side !== actif) return false;
    const attacker = getEntity(actif, position.id);
    const blocker = getEntity(defenseur, drag.id);
    return Boolean(attacker && blocker && attacker.mobaLane === blocker.mobaLane && lane.slots[actif].includes(attacker.id)
      && duel.combatDeclare?.attaquants?.includes(attacker.id) && !duel.combatDeclare?.ciblesAttaque?.[attacker.id]
      && !blocker.attaquee && !(blocker.gelToursRestants > 0) && !(blocker.empecheBlocageToursRestants > 0)
      && rpgPeutBloquerAttaquant(blocker, attacker) && !rpgEstProtegee(attacker, cardColors(cardById(blocker.carteId))));
  };
  const positionDepuisElement = (element) => {
    const target = element?.closest?.('[data-moba-position]');
    if (!target || !terrainRef.current?.contains(target)) return null;
    return { element: target, lane: target.dataset.mobaLane, side: target.dataset.mobaSide, slot: Number(target.dataset.mobaSlot), id: target.dataset.mobaEntity || null };
  };
  const debutGlissement = (drag) => { annulerAppuiLong(); glissementRef.current = drag; setGlissement(drag); };
  const finGlissement = () => { glissementRef.current = null; setGlissement(null); };
  const deposerGlissement = (drag, position) => {
    if (!peutDeposer(drag, position)) return;
    if (drag.type === 'creature') poser(position.lane, position.slot, drag.id);
    else assigner(drag.id, position.id, false);
  };
  const glisserSouris = (event, drag) => {
    debutGlissement(drag);
    event.dataTransfer?.setData('text/plain', drag.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };
  const glisserTactile = (event, drag) => {
    if (!['touch', 'pen'].includes(event.pointerType) || event.isPrimary === false || event.button > 0) return;
    toucherGlisseRef.current?.();
    toucherGlisseRef.current = startRpgTouchDrag(event, {
      source: event.currentTarget,
      targetAt: (x, y) => {
        const position = positionDepuisElement(document.elementFromPoint(x, y));
        return peutDeposer(drag, position) ? position.element : null;
      },
      onStart: () => debutGlissement(drag),
      onHover: () => {},
      onDrop: (target) => deposerGlissement(drag, positionDepuisElement(target)),
      onEnd: finGlissement,
    });
  };
  useEffect(() => {
    if (!apercu && !confirmerSortie && !parametresOuverts && !cimetiere && !recherche && !fini) return;
    toucherGlisseRef.current?.(); toucherGlisseRef.current = null;
    if (glissementRef.current) finGlissement();
  }, [apercu, confirmerSortie, parametresOuverts, cimetiere, recherche, fini]);
  const peutOuvrirPorte = (affectations) => Boolean(duel.combatDeclare && !duel.combatDeclare.blocages
    && duel[defenseur].main.includes('porte-etendard-de-leclipse')
    && rpgMobaPeutPayer(duel, defenseur, cardById('porte-etendard-de-leclipse'))
    && !duel[defenseur].prochaineArriveeAbordage && !duel[defenseur].abordageDesArrivees
    && duel.moba.lanes.some((lane) => mobaVoieJouable(duel.moba, defenseur, lane.id) && lane.slots[defenseur].includes(null))
    && Object.values(affectations).flat().some((id) => {
      const entite = duel[defenseur].creatures.find((e) => e.id === id);
      return entite && cardHasPrintedType(entite.carteId, 'Vampire');
    }));
  const resoudre = (affectations = blocages) => {
    const combat = duel.combatDeclare;
    const positionsImpact = combat?.cibleIndividuelle ? rpgMobaPositionsImpact(terrainRef.current) : null;
    // Quand un Vampire est choisi comme bloqueur, verrouiller la déclaration
    // avant d'offrir l'Embuscade du Porte-étendard. Les bloqueurs ne peuvent
    // plus être modifiés après cette fenêtre.
    if (!combat?.cibleIndividuelle && peutOuvrirPorte(affectations)) {
      const declaration = rpgMobaDeclarerBlocages(duel, defenseur, affectations);
      if (afficherResultat(declaration)) setBlocages(declaration.blocages);
      return;
    }
    if (combat?.blocages) affectations = combat.blocages;
    const combattants = ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.map((entity) => ({ id: entity.id, name: entity.name })));
    const lumieresAvant = ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.filter((entity) => entity.bouclierLumiere));
    const avant = new Map(['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.map((entity) => [entity.id, entity.pv])));
    const armesAvant = ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.filter((entity) => MOBA_ARMES.includes(entity.arme?.carteId)).map((entity) => ({ side, entity, armeId: entity.arme.carteId })));
    const avantDestructions = instantaneDestructions();
    const piochesAvant = ['joueur', 'sorcier'].map((side) => duel[side].deck.length);
    const res = combat?.cibleIndividuelle ? rpgMobaResoudreAttaqueIndividuelle(duel, actif) : rpgMobaLancerAttaque(duel, actif, attaquants, affectations, { declaree: true });
    if (!afficherResultat(res)) return;
    montrerDestructions(avantDestructions, true);
    if (!rpgAnimationsReduites()) {
      const tirs = rpgMobaProjectiles(avantDestructions, duel, combat, res).filter((tir) => tir.id === 'attaque-ciblee');
      ajouterProjectiles(Object.fromEntries(tirs.map((effet) => [`${++sequenceFx.current}-${effet.id}`, effet])));
      const choc = rpgMobaChocEchange(avantDestructions, duel, combat, res);
      if (choc) ajouterChocs({ [++sequenceFx.current]: choc });
    }
    if (['joueur', 'sorcier'].some((side, index) => duel[side].deck.length < piochesAvant[index])) onPlaySfx?.('card_draw');
    const fx = {};
    for (const side of ['joueur', 'sorcier']) for (const entity of duel[side].creatures) {
      if (entity.pv < (avant.get(entity.id) ?? entity.pv)) fx[entity.id] = { type: 'hit' };
      else if (attaquants.includes(entity.id)) fx[entity.id] = { type: 'attack' };
    }
    setCombatFx(fx);
    const token = ++sequenceFx.current;
    const lumieresBrisees = lumieresAvant.filter((entity) => !entity.bouclierLumiere);
    afficherSortFx(Object.fromEntries(lumieresBrisees.map((entity) => [entity.id, { bouclier: { montant: 1, token, lumiere: true } }])));
    const feedback = rpgMobaCombatFeedback(res.resume, combattants, token);
    if (feedback.annonce || Object.keys(feedback.miss).length || Object.keys(feedback.critiques).length) {
      ajouterRetourCombat({ [token]: feedback });
    }
    const impact = rpgMobaImpactIndividuel(combat, res, positionsImpact, Object.fromEntries(combattants.map((entity) => [entity.id, entity.name])));
    if (impact) ajouterImpactIndividuel({ [token]: { ...rpgMobaDecalerChiffres(impact, impactsIndividuels), token } });
    for (const son of rpgSonsResolutionCombat(res.resume)) onPlaySfx?.(son.nom, son.delai);
    const armeBrisee = armesAvant.some(({ side, entity, armeId }) => duel[side].creatures.includes(entity) && entity.arme?.carteId !== armeId);
    if (lumieresBrisees.length || armeBrisee) onPlaySfx?.('weapon_break');
    if (res.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    setSoinsVoies(res.healingEvents ?? []);
    if (res.healingEvents?.some((event) => event.healing > 0)) jouerSonSoin();
    setEvents(res.damageEvents ?? []);
    setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); setBlocages({}); setCible(null); setEtape('tour'); setCarte(null);
  };
  const declarer = (attaquantId, cibleId, voie = null) => {
    if (!afficherResultat(rpgMobaDeclarerAttaqueIndividuelle(duel, actif, attaquantId, cibleId, voie))) return;
    const ids = [attaquantId];
    const cibles = cibleId ? { [attaquantId]: cibleId } : {};
    if (rpgVagueAnnonceAcier(ids, cibles)) onPlaySfx?.('attackers_confirm');
    setAttaquants(ids); setCiblesRapides(cibles); setCibleRapideEnCours(null); setCibleVoieEnCours(null);
    setCarte(null); setEtape('blocage'); setCible(cibleId ? null : attaquantId);
  };
  const nouvellePartie = (partie = null) => { setPageMain(0); setPageJournal(0); setVueJournal('texte'); setApercu(null); setCimetiere(null); setConfirmerSortie(false); setDuel(partie ?? initialiser()); setCarte(null); setSacrificesChoisis([]); setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); setCibleVoieEnCours(null); setBlocages({}); setCible(null); setEtape(partie || initialiser !== nouveau ? 'mulligan' : 'choix'); setMulliganIndices([]); setErreur(''); setIaBloquee(false); setPrixLane(null); setCibleSortPrimaire(null); setEvents([]); setSoinsVoies([]); effacerSoinsCreatures(); effacerBoucliers(); effacerEntrees(); effacerConquetes(); effacerSorties(); effacerRetoursExil(); setAnnonceSort(null); setAnnoncesApercues([]); setSortFx({}); setCombatFx({}); effacerRetoursCombat(); effacerImpactsIndividuels(); effacerRipostes(); effacerProjectiles(); effacerSignatures(); effacerChocs(); effacerParades(); setFantomes([]); setCerclesSacrifice([]); };
  const demarrerHistoire = () => {
    const deck = modeHistoire && deckCampagneRef.current ? deckCampagneRef.current : deckPour('joueur');
    if (!deck || !rpgMobaValiderDeck(deck).ok) return;
    deckCampagneRef.current = deck;
    // Ne toucher ni au duel ni au chapitre avant que le joueur ait validé le
    // master : « Retour au résultat » doit conserver le vrai bilan final.
    setInterlude(false);
    setAnnoncePremier(true);
  };
  const lancerPremierChapitre = () => {
    if (!deckCampagneRef.current) return;
    setModeHistoire(true);
    setChapitreIndex(0);
    setDeckSorcier(MOBA_HISTOIRE[0].deck);
    setPlateauMoba(MOBA_HISTOIRE[0].plateau);
    nouvellePartie(creerPartie(deckCampagneRef.current, MOBA_HISTOIRE[0].deck));
    setAnnoncePremier(false);
  };
  const revenirDeLAnnonce = () => {
    setAnnoncePremier(false);
    if (etape === 'choix') setModeHistoire(false);
  };
  const ouvrirProchainChapitre = () => {
    const chapitre = prochainChapitreMoba(chapitreIndex, vainqueur);
    if (!chapitre || !deckCampagneRef.current) return;
    setChapitreIndex((index) => index + 1);
    setDeckSorcier(chapitre.deck);
    setPlateauMoba(chapitre.plateau);
    nouvellePartie(creerPartie(deckCampagneRef.current, chapitre.deck));
    setInterlude(false);
  };
  const rejouerChapitre = () => {
    const chapitre = MOBA_HISTOIRE[chapitreIndex];
    nouvellePartie(creerPartie(deckCampagneRef.current, chapitre.deck));
  };
  // Let the opponent's ritual finish before its next move or arrival choice.
  const iaAgit = !fini && !cerclesSacrifice.length && !confirmerSortie && !parametresOuverts && !cimetiere && !apercu && (destruction ? destruction.cote === 'sorcier' : recherche ? recherche.cote === 'sorcier' : defausse ? mainSide === 'sorcier' : site ? site.cote === 'sorcier' : ((etape === 'tour' && actif === 'sorcier') || (etape === 'arrivee' && arriveeSide === 'sorcier')
    || (['blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && repondant === 'sorcier')));
  // Comme en classique, seule la personne qui répond à une carte adverse
  // choisit si elle veut jouer une réponse ou laisser la carte se résoudre.
  const attenteAnnonce = etape === 'reponse-creature' ? duel.mobaCreatureEnAttente
    : etape === 'reponse-sort' ? duel.mobaSortEnAttente : null;
  const carteAnnonce = attenteAnnonce && cardById(attenteAnnonce.carteId);
  const annonceRepondable = Boolean(attenteAnnonce && carteAnnonce && attenteAnnonce.cote === 'sorcier'
    && repondant === 'joueur' && !fini && !destruction && !site && !defausse && !recherche && !duel.moba.centerChoice);
  const apercuAnnonceOuvert = annonceRepondable && !annoncesApercues.includes(attenteAnnonce)
    && !apercu && !confirmerSortie && !parametresOuverts && !cimetiere;
  const cibleAnnonce = attenteAnnonce && etape === 'reponse-creature'
    ? `${voies[attenteAnnonce.laneId]} · ${noms[attenteAnnonce.cote]} · emplacement ${(attenteAnnonce.slot ?? 0) + 1}`
    : attenteAnnonce ? cibleSortEnAttente(duel, attenteAnnonce) : '';
  const repondreAnnonce = () => {
    if (!attenteAnnonce) return;
    setAnnoncesApercues((anciennes) => anciennes.includes(attenteAnnonce) ? anciennes : [...anciennes, attenteAnnonce]);
    focusRetourAnnonce.current = true;
  };
  retourAnnonceRef.current = apercuAnnonceOuvert ? repondreAnnonce : null;
  useEffect(() => {
    if (!apercuAnnonceOuvert && focusRetourAnnonce.current) {
      focusRetourAnnonce.current = false;
      boutonRevoirAnnonce.current?.focus({ preventScroll: true });
    }
  }, [apercuAnnonceOuvert]);
  const clavierAnnonce = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); repondreAnnonce(); return; }
    if (event.key !== 'Tab') return;
    const boutons = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href]')];
    if (!boutons.length) return;
    const actif = event.currentTarget.ownerDocument.activeElement;
    if (event.shiftKey && actif === boutons[0]) { event.preventDefault(); boutons.at(-1).focus(); }
    else if (!event.shiftKey && actif === boutons.at(-1)) { event.preventDefault(); boutons[0].focus(); }
  };
  useEffect(() => {
    if (!iaAgit || iaBloquee || duel.moba.centerChoice) return undefined;
    const timer = window.setTimeout(() => {
      if (site && !destruction && !recherche && !defausse) {
        const choix = rpgMobaChoisirSiteIA(duel, site.cote);
        if (choix) choisirCibleSite(choix);
        else { setErreur("L’IA ne trouve pas de cible pour le Site."); setIaBloquee(true); }
      } else if (recherche) {
        const choix = rpgMobaChoisirRechercheIA(duel, 'sorcier');
        if (choix) afficherResultat(rpgMobaResoudreRecherche(duel, 'sorcier', choix));
        else { setErreur("L’IA ne trouve pas de carte dans son deck."); setIaBloquee(true); }
      } else if (defausse) {
        const finDeTour = duel.defausseEnAttente?.motif === 'fin-de-tour';
        const result = rpgMobaDefausser(duel, 'sorcier', choisirDefausseIA(duel, 'sorcier'));
        if (afficherResultat(result) && !result.restant && finDeTour) finTour();
      } else if (etape === 'tour') {
          const creature = rpgMobaChoisirCreatureIA(duel);
          const magie = rpgMobaChoisirMagieIA(duel);
          if (magie && (!creature || magie.score >= 35)) lancerMagie(magie.id, magie.cible, magie.lane, magie.prixLane, magie.cibleSecondaire ?? null, magie.emplacementArme ?? magie.emplacementReanimation ?? null);
          else if (creature) {
            const avant = instantaneDestructions();
            const result = rpgMobaJouerCreature(duel, 'sorcier', creature.id, creature.lane, creature.slot, { ouvrirReponse: true, sacrificeIds: creature.sacrificeIds });
            if (afficherResultat(result)) { montrerDestructions(avant, false, result.sacrificeIds, result.entite?.id); if (result.damageEvents?.length) setEvents(result.damageEvents); if (result.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier'); if (result.creatureEnAttente) setEtape('reponse-creature'); else if (result.arriveeEnAttente) setEtape('arrivee'); }
          } else {
            const choix = rpgMobaChoisirAttaqueIndividuelleIA(duel, 'sorcier');
            if (choix) {
              const ids = [choix.attaquantId];
              const ciblesIA = choix.cibleId ? { [choix.attaquantId]: choix.cibleId } : {};
              const result = rpgMobaDeclarerAttaqueIndividuelle(duel, 'sorcier', choix.attaquantId, choix.cibleId, choix.voie);
              if (afficherResultat(result)) { setAttaquants(ids); setCiblesRapides(ciblesIA); setCible(null); setEtape('blocage'); if (rpgVagueAnnonceAcier(ids, ciblesIA)) onPlaySfx?.('attackers_confirm'); }
            } else finTour();
          }
      } else if (etape === 'arrivee') {
        const cibleIA = rpgMobaChoisirArriveeIA(duel, arriveeSide);
        if (cibleIA) choisirCibleArrivee(cibleIA);
        else { setErreur("L’IA ne trouve pas de cible pour sa capacité."); setIaBloquee(true); }
      } else {
        const magie = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
        const embuscade = ['blocage', 'fin', 'reponse-creature', 'reponse-sort', 'reponse-arrivee'].includes(etape) && !magie ? rpgMobaChoisirEmbuscadeIA(duel, 'sorcier') : null;
        if (magie) lancerMagie(magie.id, magie.cible, magie.lane, magie.prixLane, magie.cibleSecondaire ?? null, magie.emplacementArme ?? magie.emplacementReanimation ?? null);
        else if (embuscade) {
          const result = rpgMobaJouerCreature(duel, 'sorcier', embuscade.id, embuscade.lane, embuscade.slot, { ouvrirReponse: true, ...(embuscade.sacrificeIds ? { sacrificeIds: embuscade.sacrificeIds } : {}) });
          if (afficherResultat(result)) setEtape('reponse-creature');
        } else if (etape === 'blocage') resoudre(duel.combatDeclare?.cibleIndividuelle ? {} : (duel.combatDeclare?.blocages ?? rpgMobaChoisirBlocagesIA(duel, actif, attaquants)));
        else if (etape === 'fin') passerFinTour();
        else if (etape === 'reponse-sort') passerSort();
        else if (etape === 'reponse-creature') passerCreature();
        else passerEffetCreature();
      }
    }, 450);
    return () => window.clearTimeout(timer);
  // Mutations are made by the adapter; version is incremented after each action.
  }, [duel, version, etape, iaAgit, iaBloquee]); // eslint-disable-line react-hooks/exhaustive-deps

  const phaseVisuelle = etape === 'blocage' ? 'blocage' : etape === 'fin' ? 'fin' : 'principale';
  const soinsParVoie = rpgMobaSoinsVoies(soinsVoies);
  const combatVisuel = etape === 'blocage' ? duel.combatDeclare : null;
  const ciblesIndicateurs = combatVisuel?.cibleIndividuelle ? (combatVisuel.cibleIndividuelle.cibleId ? { [combatVisuel.attaquants[0]]: combatVisuel.cibleIndividuelle.cibleId } : {}) : (combatVisuel?.ciblesAttaque ?? ciblesRapides);
  const indications = rpgMobaCombatIndicators(duel, actif, combatVisuel?.attaquants ?? (etape === 'tour' && !cibleRapideEnCours ? attaquants : []), ciblesIndicateurs, etape === 'blocage' ? blocages : {}, { individuel: Boolean(combatVisuel?.cibleIndividuelle) || etape === 'tour' });
  const instruction = iaAgit ? 'L’IA réfléchit…' : destruction ? 'Ghul des cendres : choisissez une créature adverse illuminée pour lui infliger 1 dégât.' : site ? 'La Source de Bimini : choisissez une créature alliée à soigner et consacrer.' : cibleRapideEnCours && cibleVoieEnCours ? 'Choisissez la voie de cette attaque.' : cibleRapideEnCours ? 'Choisissez une créature adverse illuminée ou, si autorisé, appuyez sur « Attaquer » au niveau des PV adverses.' : etape === 'arrivee' ? (Number.isFinite(duel.arriveeEnAttente?.abordage)
      ? `Choisissez une créature adverse à prendre en cale (coût maximal ${duel.arriveeEnAttente.abordage}).`
      : duel.arriveeEnAttente?.carteId === 'lionne-du-midi-ardent'
    ? 'Choisissez une créature adverse à frapper avec la Lionne.'
    : duel.arriveeEnAttente?.carteId === 'maitre-du-marteau'
      ? 'Choisissez une créature adverse ou la voie adverse du Maître pour ses dégâts d’arrivée.'
      : MOBA_ARRIVEES_NEUTRES.includes(duel.arriveeEnAttente?.carteId)
        ? 'Choisissez une créature admissible, alliée ou adverse, à exiler.'
      : duel.arriveeEnAttente?.carteId === 'kraken'
        ? 'Choisissez un navire adverse à détruire.'
      : duel.arriveeEnAttente?.carteId === 'le-cavalier-sans-nom'
        ? 'Choisissez une créature adverse de coût 4 ou moins à renvoyer en main, puis piochez une carte.'
      : duel.arriveeEnAttente?.carteId === 'oni-de-la-fournaise'
        ? (duel.arriveeEnAttente.cibleOni ? 'Choisissez une seconde créature adverse distincte, ou recliquez la première pour annuler.' : 'Choisissez deux créatures adverses pour les dégâts de l’Oni, ou la seule cible disponible.')
      : ['bakunawa', 'cavalier-amazigh-du-desert', 'souverain-de-la-lune-noire'].includes(duel.arriveeEnAttente?.carteId)
        ? 'Choisissez une créature adverse : les deux combattants s’infligent leurs dégâts simultanément.'
      : duel.arriveeEnAttente?.carteId === 'tour-de-braise'
        ? 'Choisissez une créature adverse pour lui infliger 1 dégât.'
      : duel.arriveeEnAttente?.carteId === 'tour-de-neige'
        ? 'Choisissez une créature adverse à geler.'
      : MOBA_ARRIVEES_HOSTILES.includes(duel.arriveeEnAttente?.carteId)
        ? 'Choisissez une créature adverse admissible pour la capacité d’arrivée.'
        : duel.arriveeEnAttente?.carteId === 'guetteuse-des-marees'
          ? 'Choisissez une autre créature alliée à exiler jusqu’à la fin du tour.'
        : duel.arriveeEnAttente?.carteId === 'volva-soigneuse'
          ? 'Choisissez une créature alliée à soigner, y compris la Völva.'
          : duel.arriveeEnAttente?.carteId === 'faiseur-de-passage'
            ? 'Choisissez une autre créature alliée pour lui donner Infiltration.'
            : duel.arriveeEnAttente?.carteId === 'tour-de-sable'
        ? 'Choisissez une créature alliée, y compris la Tour, pour recevoir un bouclier.'
            : duel.arriveeEnAttente?.carteId === 'veilleuse-des-citernes'
        ? 'Choisissez une autre créature alliée pour recevoir son bouclier.'
        : 'Choisissez une créature alliée, y compris le Guerrier lui-même, pour recevoir son bouclier.')
    : defausse ? `Choisissez ${defausse} carte${defausse > 1 ? 's' : ''} à défausser${duel.defausseEnAttente?.motif === 'fin-de-tour' ? ' pour terminer votre tour' : ''}.`
    : ['le-tresor-de-lima', 'source-de-bimini'].includes(carte) ? 'Choisissez une case libre pour installer le Site.'
    : carte === 'lame-des-ergs' ? 'Choisissez une créature alliée ou une case libre pour créer son Chien de sable.'
    : carte === 'reanimation' ? 'Choisissez où réanimer la dernière créature du cimetière.'
    : carte === 'defi-du-jarl' ? (cibleSortPrimaire ? 'Choisissez une créature adverse pour affronter votre champion.' : 'Choisissez une créature alliée comme champion du Défi du Jarl.')
    : carte === 'feux-de-kitsune' ? (cibleSortPrimaire ? 'Choisissez une autre créature pour partager les dégâts, ou la même pour tout lui infliger.' : 'Choisissez une créature adverse pour Feux de kitsune.')
    : poidsLie && !cibleSortPrimaire ? 'Choisissez la créature adverse ciblée par le Lien de Barbe Noire.'
    : carte && MOBA_MAGIES_TRANSFERT.includes(carte) && MOBA_MAGIES_PRIX.includes(carte) && !prixLane ? `Choisissez une voie alliée ayant plus de ${cardById(carte).prixPv} PV pour payer le prix.`
    : carte && MOBA_MAGIES_TRANSFERT.includes(carte) ? 'Choisissez une voie active : l’adversaire y perd des PV et votre côté y récupère des PV.'
    : carte && MOBA_MAGIES_PRIX.includes(carte) && !prixLane ? `Choisissez une voie alliée ayant plus de ${cardById(carte).prixPv} PV pour payer le prix.`
    : carte && MOBA_MAGIES_SPATIALES.includes(carte) ? `Choisissez la voie active touchée par ${cardById(carte)?.name}${prixLane ? ` (prix payé sur ${voies[prixLane]})` : ''}.`
    : carte && MOBA_MAGIES_SOINS.includes(carte) ? carte === 'festin-des-vaillants' ? 'Choisissez votre voie active à soigner ; vos créatures de cette voie seront également soignées.' : 'Choisissez votre voie active à soigner.'
      : carte && MOBA_MAGIES_VOIES.includes(carte) ? 'Choisissez une créature adverse ou une voie adverse active.'
        : carte === 'memoire-de-l-armurerie' ? 'Choisissez une créature alliée pour récupérer le Sabre maudit de votre cimetière.'
        : carte === 'brise-lame' ? 'Choisissez une créature adverse équipée.'
        : carte && MOBA_ARMES.includes(carte) ? 'Choisissez une créature alliée illuminée pour lui attacher votre arme.'
        : carte && MOBA_MAGIES_ALLIEES.includes(carte) ? 'Choisissez une créature alliée illuminée pour lancer votre magie.'
        : carte && MOBA_MAGIES_NEUTRES.includes(carte) ? 'Choisissez une créature illuminée respectant le coût indiqué.'
        : carte && MOBA_MAGIES_CIBLEES.includes(carte) ? 'Choisissez une créature adverse illuminée pour lancer votre magie.'
          : carte && rpgMobaPeutEmbuscade(duel, mainSide, carte) ? 'Choisissez une case libre pour votre Embuscade.'
          : etape === 'reponse-creature' ? 'Jouez une magie rapide ou une Embuscade éligible, ou passez pour laisser entrer la créature.'
          : etape === 'reponse-sort' ? `Jouez une magie rapide ou une Embuscade éligible, ou passez pour résoudre ${duel.mobaSortEnAttente?.armeMoba ? 'l’arme' : 'le sort'}.`
          : etape === 'reponse-arrivee' ? 'Jouez une magie rapide ou une Embuscade éligible, puis passez pour résoudre la capacité.'
          : etape === 'fin' ? 'Jouez une magie rapide ou une Embuscade éligible si vous le souhaitez, puis passez pour commencer votre tour.'
            : etape === 'blocage' && MOBA_EMBUSCADES_COMBAT.includes(carte) ? 'Choisissez une case libre pour votre Embuscade.'
            : etape === 'blocage' && duel.combatDeclare?.cibleIndividuelle ? 'Répondez avec une Magie Rapide ou une Embuscade, ou passez pour résoudre l’attaque.'
            : etape === 'blocage' ? 'Répondez avec une Magie Rapide ou une Embuscade, ou passez pour résoudre l’attaque.'
            : carte && rpgMobaSacrificesInvocation(duel, mainSide, cardById(carte)) > sacrificesChoisis.length ? 'Choisissez vos créatures à sacrifier pour invoquer.'
            : carte ? 'Choisissez une case illuminée pour invoquer votre créature.'
              : 'Jouez une carte, ou sélectionnez vos créatures prêtes pour attaquer.';
  return <main className={`moba moba--${plateauMoba.id}`} aria-label="MOBA, partie contre l’IA" data-moba-plateau={plateauMoba.id} style={{ '--moba-table': `url("${import.meta.env.BASE_URL}card-table.jpg")`, '--moba-map': `url("${import.meta.env.BASE_URL}${plateauMoba.fichier}")`, '--moba-card-back': `url("${import.meta.env.BASE_URL}dos-de-carte.jpg")`, '--rpg-dos-de-carte': `url("${import.meta.env.BASE_URL}dos-de-carte.jpg")` }}>
    {rendu && <EffetsSprite />}
    <p className="moba__sr-only moba__combat-result" role="status" aria-atomic="true">{[combatFeedback?.annonce, ...Object.values(impactsIndividuels).map((impact) => impact.annonce)].filter(Boolean).join(' ; ')}</p>
    <p className="moba__sr-only" role="status" aria-atomic="true">{duel.moba.lanes.filter((lane) => !lane.active && lane.conqueredBy).map((lane) => `${voies[lane.id]} conquise par ${noms[lane.conqueredBy]} ; ${lane.id === 'center' && duel.moba.centerJoined ? 'présence sur les deux voies latérales actives' : 'voie fermée'}.`).join(' ')}</p>
    <p className="moba__sr-only" role="status" aria-atomic="true">{Object.entries(retoursExil).filter(([id, retour]) => duel[retour.side]?.creatures.some((entity) => entity.id === id)).map(([, retour]) => `${retour.name}, ${noms[retour.side]}, ${voies[retour.laneId]} : revient d’exil`).join(' ; ')}</p>
    <p className="moba__sr-only" role="status" aria-atomic="true">{Object.values(sortiesVisuelles).filter((sortie) => !rpgMobaSortieRemplacee(sortie, retoursExil)).map((sortie) => `${sortie.name}, ${noms[sortie.side]}, ${voies[sortie.laneId]} : ${sortie.variante === 'exil' ? 'exilée' : 'renvoyée en main'}`).join(' ; ')}</p>
    <p className="moba__sr-only" role="status" aria-atomic="true">{[
      ...Object.entries(soinsCreatures).map(([id, soin]) => `${['joueur', 'sorcier'].flatMap((side) => duel[side].creatures).find((entity) => entity.id === id)?.name ?? 'Créature'} regagne ${soin.montant} PV`),
      ...Object.entries(soinsParVoie).map(([cle, montant]) => { const [lane, side] = cle.split(':'); return `${voies[lane]}, ${noms[side]} : ${montant} PV regagnés`; }),
      ...Object.keys(boucliersAjoutes).map((id) => ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures).find((entity) => entity.id === id)).filter(Boolean).map((entity) => `${entity.name} reçoit un bouclier`),
    ].join(' ; ')}</p>
    {rendu?.AnnonceTour ? <rendu.AnnonceTour annonce={annonceTourVisible} /> : <div className="rpg-annonce-tour" style={{ '--rpg-annonce-tour-duree': `${dureeAnnonceTour}ms` }} role="status" aria-live="polite" aria-atomic="true">
      {annonceTourVisible && <p key={annonceTourVisible.token} className={`rpg-annonce-tour__bandeau is-${annonceTourVisible.camp}`}><span className="rpg-annonce-tour__lamp" aria-hidden="true" /><strong>{annonceTourVisible.camp === 'joueur' ? 'Votre tour' : 'Tour de l’adversaire'}</strong><span className="rpg-annonce-tour__lamp" aria-hidden="true" /></p>}
    </div>}
    <div inert={Boolean(etape === 'mulligan' || etape === 'choix' || fini || duel.moba.centerChoice || apercuAnnonceOuvert || apercu || confirmerSortie || parametresOuverts || cimetiere || (recherche?.cote === 'joueur'))}>
    <header className="moba__header">
      <div className="moba__brand"><span>LE SABLIER <i>✦</i> DUEL SOLO</span><h1>MOBA <small>Les trois voies</small></h1></div>
      <div className="moba__header-meta"><span className="moba__trial">{modeHistoire ? `HISTOIRE · CHAPITRE ${chapitreIndex + 1}/${MOBA_HISTOIRE.length}` : 'ESSAI · DUEL SOLO'}</span>{onToggleSound && <button type="button" className="moba__back moba__sound" aria-pressed={sonActif} aria-label={sonActif ? 'Couper tous les sons' : 'Activer tous les sons'} onClick={onToggleSound}><span aria-hidden="true">{sonActif ? '♫' : '♪'}</span> <span className="moba__sound-label">{sonActif ? 'Son activé' : 'Son coupé'}</span></button>}{rendu?.VolumesDuel && onToggleSound && onChangeVolumeSfx && onChangeVolumeVoix && onChangeVolumeMusique && <button type="button" ref={boutonParametres} className="moba__back moba__settings-button" aria-label="Paramètres audio" aria-haspopup="dialog" aria-expanded={parametresOuverts} onClick={() => setParametresOuverts(true)}><span aria-hidden="true">⚙</span></button>}<button type="button" ref={boutonQuitter} className="moba__back moba__quit" aria-label="Quitter la partie" onClick={() => setConfirmerSortie(true)}>← <span>Quitter la partie</span></button></div>
    </header>
    <div className="moba__intro">
      <p className="moba__notice">{modeHistoire ? `${MOBA_HISTOIRE[chapitreIndex].titre} · ${deckSorcier?.name} · Conquérez 2 voies pour avancer` : 'Affrontez l’IA · Conquérez 2 voies pour gagner · Decks de 30 cartes adaptés au MOBA'}</p>
      <details className="moba__rules"><summary>Règles du plateau</summary><div>
        <p>Trois voies indépendantes : 20 / 15 / 20 PV par camp et 2 / 1 / 2 emplacements. Conquérir deux voies remporte la partie.</p>
        <p>Chaque créature peut attaquer une fois par tour, individuellement. La cible est choisie à l’annonce, puis l’adversaire peut répondre par une Magie Rapide ou une Embuscade avant les dégâts. Il n’y a pas de blocage. Une attaque normale vise une créature accessible dans la même voie et les dégâts sont simultanés ; à défaut elle frappe directement la voie. Envol permet aussi la frappe directe s’il n’y a pas d’ennemi volant accessible. Infiltration permet aussi la frappe directe et protège des attaques normales. L’Attaque ciblée peut viser une créature de n’importe quelle voie ou frapper directement, sans riposte ordinaire. Provocation impose une cible accessible prioritaire ; à défaut, Défenseur impose une cible accessible dans la voie de l’attaquant.</p>
        <p>Après la conquête du centre, le vainqueur conserve sa case centrale et peut y jouer. Les créatures centrales participent aux deux voies latérales actives ; les PV restants du centre disparaissent.</p>
        <p>Il n’y a pas de mana : les cartes se jouent sans coût de mana. Chaque camp peut annoncer une créature par tour, quel que soit son coût. Les créatures de coût 1 à 4 ne demandent aucun sacrifice ; celles de coût 5 ou 6 en demandent un, et celles de coût 7 ou plus en demandent deux. Une Embuscade hors tour est une invocation spéciale supplémentaire, limitée à une par camp et par tour ; Tojiro ne demande pas de sacrifice en Embuscade si un Djinn adverse est présent. Chaque camp peut aussi jouer un sort et une arme par tour. Toute annonce compte même si elle est contrée. Choisissez les victimes parmi vos créatures (hors Sites), puis posez la nouvelle créature sur la case de l’une d’elles.</p>
        <p>Un deck vide ne provoque pas de fatigue. Certaines cartes et fenêtres de réponse ne sont pas encore disponibles.</p>
      </div></details>
    </div>
    <div className="moba__scoreboard" aria-label="Score de conquête">
      {['joueur', 'sorcier'].map((side) => <div key={side} className={`moba__player moba__player--${side}${partieCommencee && actif === side ? ' is-active' : ''}`}>
        <span className="moba__player-emblem" aria-hidden="true"><img src={cardArt(side === 'joueur' ? 'tin-hinan' : (deckPour('sorcier').cardIds.find((id) => cardById(id)?.kind === 'creature') ?? 'ifrit-des-ergs'))} alt="" /></span>
        <span className="moba__player-name"><small>{partieCommencee && side === actif ? 'TOUR ACTIF' : 'DUELLISTE'}</small><strong>{noms[side]}</strong></span>
        <span className="moba__player-score" aria-label={`${scores[side]} voies conquises sur 2`}><Marque active={scores[side] > 0} /><Marque active={scores[side] > 1} /><small>{scores[side]} / 2</small></span>
      </div>)}
      <div className="moba__score-center"><span>◆</span><small>CONQUÊTE</small></div>
    </div>
    {rendu?.FaceDownHand ? <rendu.FaceDownHand count={duel.sorcier.main.length} /> : <div className="moba__hidden-hand" aria-label={`Main adverse : ${duel.sorcier.main.length} cartes, faces cachées`}><div aria-hidden="true">{Array.from({ length: Math.min(duel.sorcier.main.length, 7) }, (_, index) => <span key={index} />)}</div><small>Main adverse · {duel.sorcier.main.length}</small></div>}
    {['sorcier', 'joueur'].map((side) => <div className={`moba__piles moba__piles--${side}`} role="group" aria-label={side === 'joueur' ? 'Vos zones de cartes' : 'Zones de l’IA'} key={side}>
      {rendu?.CardPile ? <><rendu.CardPile count={duel[side].deck.length} label="Paquet" variant="deck" /><rendu.CardPile count={duel[side].cimetiere.length} label="Cimetière" variant="graveyard" topCard={duel[side].cimetiere.at(-1)} onClick={(event) => ouvrirCimetiere(side, event)} /></> : <><span className="moba__pile-fallback">Paquet · {duel[side].deck.length}</span><button type="button" className="moba__pile-fallback" disabled={!duel[side].cimetiere.length} onClick={(event) => ouvrirCimetiere(side, event)}>Cimetière · {duel[side].cimetiere.length}</button></>}
    </div>)}
    <div className="moba__ai-status" role="status">{iaBloquee ? <><span>{erreur} </span><button type="button" onClick={() => { setErreur(''); setIaBloquee(false); }}>Réessayer</button></> : iaAgit ? 'L’IA réfléchit…' : ''}</div>
    <div inert={iaAgit}>
    {duel.mobaSortEnAttente && !fini && (() => {
      const attente = duel.mobaSortEnAttente;
      const carteAttendue = cardById(attente.carteId);
      if (!carteAttendue) return null;
      const cibleAttendue = cibleSortEnAttente(duel, attente);
      return <div className={`moba__pending-spell moba__pending-spell--${attente.cote}`} role="status" aria-label={`${attente.armeMoba ? 'Arme' : 'Sort'} ${attente.cote === 'sorcier' ? 'adverse' : 'joué'}, en attente : ${carteAttendue.name}. Cible : ${cibleAttendue}.`}>
        {rendu?.ApercuCarteAppuiLong
          ? <button type="button" className="moba__pending-art" aria-label={`Voir la fiche de ${carteAttendue.name}`} onClick={(event) => ouvrirApercu(carteAttendue.id, null, event.currentTarget)}><img src={cardArt(carteAttendue)} alt="" /></button>
          : <span className="moba__pending-art"><img src={cardArt(carteAttendue)} alt="" /></span>}
        <div className="moba__pending-copy"><small>{attente.armeMoba ? 'ARME' : 'SORT'} {attente.cote === 'sorcier' ? 'ADVERSE' : 'JOUÉ'} · EN ATTENTE</small><strong title={carteAttendue.name}>{carteAttendue.name}</strong><span title={cibleAttendue}>⌖ {cibleAttendue}</span></div>
      </div>;
    })()}
    {carte && rpgMobaSacrificesInvocation(duel, mainSide, cardById(carte)) > 0 && (etape === 'tour' || rpgMobaPeutEmbuscade(duel, mainSide, carte)) && <div className="moba__sacrifice-hint" role="status">Sacrifices pour {cardById(carte).name} : {sacrificesChoisis.length}/{rpgMobaSacrificesInvocation(duel, mainSide, cardById(carte))}. {sacrificesChoisis.length < rpgMobaSacrificesInvocation(duel, mainSide, cardById(carte)) ? "Cliquez sur vos créatures à sacrifier, puis sur la case d’une victime." : "Choisissez la case d’une victime pour invoquer."} <button type="button" onClick={() => setSacrificesChoisis([])}>Recommencer</button></div>}
    <div className="moba__field-scroll" role="region" aria-label="Plateau des trois voies" tabIndex={0}>
    <div className="moba__battlefield" ref={terrainRef}>
    {Object.entries(projectilesVisuels).map(([id, tir]) => <span key={id} className={`rpg-projectile-combat rpg-projectile-combat--${tir.variante}`} data-moba-projectile={tir.variante} aria-hidden="true" style={{ left: tir.x, top: tir.y, '--tir-dx': `${tir.dx}px`, '--tir-dy': `${tir.dy}px`, '--tir-angle': `${tir.angle}deg` }}><span className="rpg-projectile-combat__tete" /></span>)}
    {Object.entries(signaturesVisuelles).map(([id, effet]) => {
      const Composant = effet.type === 'feu' ? rendu?.RoueDeFeu : effet.type === 'sable' ? rendu?.TempeteSable : rendu?.EclairDuMarteau;
      return Composant ? <Composant key={id} effet={effet} /> : null;
    })}
    {Object.entries(chocsVisuels).map(([id, choc]) => <span key={id} className="moba__exchange-clash" data-moba-clash="" aria-hidden="true" style={{ left: choc.x, top: choc.y }}><i /><i /></span>)}
    {Object.entries(ripostesVisuelles).map(([id, effet]) => <span key={id} className="rpg-counterattack-slashes moba__counterattack-slashes" data-moba-counterattack={effet.cible} style={effet.rect} aria-hidden="true"><i className="rpg-counterattack-slashes__slash rpg-counterattack-slashes__slash--a" /><i className="rpg-counterattack-slashes__slash rpg-counterattack-slashes__slash--b" /></span>)}
    {Object.values(impactsIndividuels).map((impactIndividuel) => impactIndividuel.positions && <svg key={impactIndividuel.token} className={`moba__impact-cinema${impactIndividuel.tirCible ? ' is-targeted' : ''}`} viewBox={`0 0 ${impactIndividuel.positions.width} ${impactIndividuel.positions.height}`} preserveAspectRatio="none" aria-hidden="true">
      {impactIndividuel.source && impactIndividuel.destination && <>
        <circle className="moba__impact-source" cx={impactIndividuel.source.x} cy={impactIndividuel.source.y} r="17" />
        {!impactIndividuel.tirCible && <line className="moba__impact-trail" x1={impactIndividuel.source.x} y1={impactIndividuel.source.y} x2={impactIndividuel.destination.x} y2={impactIndividuel.destination.y} pathLength="1" />}
      </>}
      {impactIndividuel.impacts.map((impact, index) => impact.point && <g key={`${impact.id}-${index}`} className={`moba__impact-mark${impact.critique ? ' is-critical' : ''}`} transform={`translate(${impact.point.x} ${impact.point.y})`}>
        <circle className="moba__impact-burst" r="22" />
        <text className="moba__impact-number" x={impact.decalageX || undefined} y="-18" textAnchor="middle">−{impact.montant}</text>
      </g>)}
    </svg>)}
    {rendu?.BlockerArrows && <><rendu.BlockerArrows tableRef={terrainRef} assignments={indications.attackArrows} attaque resolveTarget={rpgMobaArrowTarget} /><rendu.BlockerArrows tableRef={terrainRef} assignments={indications.blockArrows} resolveTarget={rpgMobaArrowTarget} /></>}
    <p className="moba__sr-only" aria-live="polite">{indications.descriptions.join(' ; ')}</p>

    <div className="moba__lanes" data-moba-joined-lane={rattachement?.laneId || undefined} data-moba-joined-side={rattachement?.side || undefined}>
      {duel.moba.lanes.map((lane) => <section key={lane.id} className={`moba__lane${lane.active ? '' : ` is-conquered is-conquered--${lane.conqueredBy}${lane.id !== 'center' ? ' is-sealed' : ''}`}`} aria-label={voies[lane.id]}>
        {conquetesVisuelles[lane.id] && <div key={conquetesVisuelles[lane.id].token} className={`moba__conquest-fx moba__conquest-fx--${conquetesVisuelles[lane.id].side}`} aria-hidden="true"><i /><i /><i /></div>}
        {!lane.active && lane.id !== 'center' && <div className="moba__conquest" aria-hidden="true">
          <svg className="moba__conquest-chains" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="moba__conquest-chain-shadow" d="M5 5 95 95 M95 5 5 95" />
            <path className="moba__conquest-chain-core" d="M5 5 95 95 M95 5 5 95" />
            {MAILLONS_VOIE_FERMEE.map((point, index) => <g key={index} className="moba__conquest-links">
              <ellipse cx={point} cy={point} rx="3" ry="1.8" transform={`rotate(${index % 2 ? 135 : 45} ${point} ${point})`} />
              <ellipse cx={100 - point} cy={point} rx="3" ry="1.8" transform={`rotate(${index % 2 ? 45 : -45} ${100 - point} ${point})`} />
            </g>)}
          </svg>
          <div className="moba__conquest-photo-chains" aria-hidden="true">
            <img className="moba__conquest-photo-chain moba__conquest-photo-chain--down" src={`${import.meta.env.BASE_URL}sablier-moba/chaine-fer.png`} alt="" />
            <img className="moba__conquest-photo-chain moba__conquest-photo-chain--up" src={`${import.meta.env.BASE_URL}sablier-moba/chaine-fer.png`} alt="" />
          </div>
          <span className="moba__conquest-kicker">Voie conquise</span>
          <span className="moba__conquest-lock"><img src={`${import.meta.env.BASE_URL}icons/sablier/verrou-voie.svg`} alt="" /></span>
          <strong className="moba__conquest-owner">{lane.conqueredBy === 'joueur' ? 'VOUS' : 'L’IA'}</strong>
          <span className="moba__conquest-closed">Voie fermée</span>
        </div>}
        {['sorcier', 'joueur'].map((side) => <div className={`moba__side moba__side--${side}${rattachement?.side === side && lane.id === 'center' ? ' is-joined-center' : ''}${rattachement?.side === side && lane.id === rattachement.laneId ? ' is-joined-flank' : ''}`} key={side} inert={!mobaVoieJouable(duel.moba, side, lane.id)} aria-hidden={!mobaVoieJouable(duel.moba, side, lane.id)}>
          {side === 'joueur' && <div className="moba__frontline" aria-hidden="true"><span>✦</span></div>}
          {/* Les PV du centre disparaissent ; les deux flancs gardent leurs jauges. */}
          {!(lane.id === 'center' && lane.conqueredBy === side) && <div className="moba__health" data-moba-lane-hp={`@moba:${lane.id}:${side}`}><span>{noms[side]}</span><div className="moba__health-bar" role="progressbar" aria-label={`${voies[lane.id]}, ${noms[side]}`} aria-valuemin={0} aria-valuemax={mobaVieMaxPourCamp(duel.moba, side, lane.id)} aria-valuenow={lane.hp[side]}><i style={{ width: `${lane.hp[side] / mobaVieMaxPourCamp(duel.moba, side, lane.id) * 100}%` }} /></div><strong key={`${lane.id}-${side}-${lane.hp[side]}`} className={events.some((e) => e.laneId === lane.id && e.targetSide === side && e.damage > 0) ? 'is-damaged' : soinsVoies.some((e) => e.laneId === lane.id && e.side === side && e.healing > 0) ? 'is-healed' : ''}>{lane.hp[side]}<small> / {mobaVieMaxPourCamp(duel.moba, side, lane.id)}</small></strong>{soinsParVoie[`${lane.id}:${side}`] > 0 && <span key={soinsVoiesEtat.token} className="moba__lane-heal" aria-hidden="true">+{soinsParVoie[`${lane.id}:${side}`]}</span>}{etape === 'tour' && !iaAgit && !destruction && !site && !defausse && !fini && side === defenseur && lane.active && cibleRapideEnCours && !cibleVoieEnCours && rpgMobaCiblesIndividuelles(duel, actif, cibleRapideEnCours, lane.id).directe && <button type="button" className="moba__attack-direct" aria-label={`Attaquer directement ${voies[lane.id].toLowerCase()} de ${noms[side]}`} onClick={() => declarer(cibleRapideEnCours, null, lane.id)}>⚔ Attaquer</button>}</div>}
          {['tour', 'blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && !destruction && side === autre(mainSide) && lane.active && carte && MOBA_MAGIES_VOIES.includes(carte) && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Cibler ${voies[lane.id]} de ${noms[side]}`} onClick={() => lancerSurVoie(lane.id)}>✦ Cibler cette voie</button>}
          {['tour', 'blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && !destruction && side === mainSide && lane.active && carte && MOBA_MAGIES_PRIX.includes(carte) && (!MOBA_MAGIES_TRANSFERT.includes(carte) && !MOBA_MAGIES_SPATIALES.includes(carte) || !prixLane) && lane.hp[side] > cardById(carte).prixPv && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Payer ${cardById(carte).prixPv} PV de ${voies[lane.id]} de ${noms[side]}`} onClick={() => payerDepuisVoie(lane.id)}>✦ Payer {cardById(carte).prixPv} PV</button>}
          {['tour', 'blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && !destruction && side === autre(mainSide) && lane.active && carte && MOBA_MAGIES_TRANSFERT.includes(carte) && (!MOBA_MAGIES_PRIX.includes(carte) || prixLane) && (!poidsLie || cibleSortPrimaire) && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Transférer les PV de ${voies[lane.id]}`} onClick={() => transfererVoie(lane.id)}>✦ Transférer les PV de cette voie</button>}
          {etape === 'arrivee' && !Number.isFinite(duel.arriveeEnAttente?.abordage) && duel.arriveeEnAttente?.carteId === 'maitre-du-marteau' && side === autre(arriveeSide) && lane.active && mobaVoiesCombat(duel.moba, getEntity(arriveeSide, duel.arriveeEnAttente.entiteId)?.mobaLane)[0] === lane.id && <button type="button" className="moba__lane-target" aria-label={`Frapper ${voies[lane.id]} de ${noms[side]} avec le Maître`} onClick={() => choisirCibleArrivee('sorcier')}>✦ Frapper {mobaVoiesCombat(duel.moba, getEntity(arriveeSide, duel.arriveeEnAttente.entiteId)?.mobaLane).length > 1 ? 'les deux voies' : 'cette voie'}</button>}
          {['tour', 'blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && !destruction && side === mainSide && lane.active && carte && MOBA_MAGIES_SPATIALES.includes(carte) && (!MOBA_MAGIES_PRIX.includes(carte) || prixLane) && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Appliquer ${cardById(carte)?.name} sur ${voies[lane.id]}`} onClick={() => lancerMagie(carte, null, lane.id, prixLane)}>✦ Cibler cette voie</button>}
          {etape === 'tour' && !destruction && side === actif && lane.active && carte && MOBA_MAGIES_SOINS.includes(carte) && !defausse && !fini && rpgMobaPeutPayer(duel, actif, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Soigner ${voies[lane.id]} de ${noms[side]}`} onClick={() => soignerVoie(lane.id)}>✦ Soigner cette voie</button>}
          <div className="moba__slots">{lane.slots[side].map((id, i) => {
            const entity = id && getEntity(side, id);
            const isAttacker = id && attaquants.includes(id);
            const isBlocked = id && Object.values(blocages).some((ids) => ids.includes(id));
            const isRapidTarget = id && etape === 'blocage' && (duel.combatDeclare?.cibleIndividuelle?.cibleId === id || Object.values(duel.combatDeclare?.ciblesAttaque ?? {}).includes(id));
            const mayAttack = etape === 'tour' && (!cibleRapideEnCours || cibleRapideEnCours === id) && !carte && !defausse && side === actif && entity && rpgPeutAttaquer(entity) && !camp.manaChoixEnAttente && !fini;
            const mayTarget = !duel.combatDeclare?.cibleIndividuelle && etape === 'blocage' && !defausse && !carte && side === actif && isAttacker && !duel.combatDeclare?.ciblesAttaque?.[id];
            const mayTargetRapide = etape === 'tour' && side === defenseur && entity && cibleRapideEnCours && rpgMobaCiblesIndividuelles(duel, actif, cibleRapideEnCours).cibles.includes(id);
            const chosenAttacker = cible && getEntity(actif, cible);
            const mayBlock = !duel.combatDeclare?.cibleIndividuelle && etape === 'blocage' && !duel.combatDeclare?.blocages && !defausse && !carte && side === defenseur && entity && chosenAttacker && !duel.combatDeclare?.ciblesAttaque?.[cible] && chosenAttacker.mobaLane === entity.mobaLane && ((blocages[cible] ?? []).includes(id) || (!entity.attaquee && !(entity.gelToursRestants > 0) && !(entity.empecheBlocageToursRestants > 0) && rpgPeutBloquerAttaquant(entity, chosenAttacker) && !rpgEstProtegee(chosenAttacker, cardColors(cardById(entity.carteId)))));
            const mayDeathTarget = Boolean(destruction && side === autre(destruction.cote) && entity && ciblesDestruction.has(id));
            const maySiteTarget = Boolean(site && !destruction && !defausse && !recherche && side === site.cote && entity && ciblesSite.has(id));
            const carteCiblee = carte && (MOBA_MAGIES_CIBLEES.includes(carte) || MOBA_ARMES.includes(carte) || poidsLie);
            const carteReanimation = MOBA_MAGIES_REANIMATION.includes(carte);
            const carteArmeVivante = carte === 'lame-des-ergs';
            const carteSite = cardById(carte)?.kind === 'site';
            const carteSoin = carte && MOBA_MAGIES_SOINS.includes(carte);
            const cartePrix = carte && MOBA_MAGIES_PRIX.includes(carte);
            const carteTransfert = carte && MOBA_MAGIES_TRANSFERT.includes(carte);
            const nombreSacrifices = rpgMobaSacrificesInvocation(duel, mainSide, cardById(carte));
            const maySacrifice = (etape === 'tour' && side === actif || side === mainSide && rpgMobaPeutEmbuscade(duel, side, carte)) && entity && carte && nombreSacrifices > 0
              && sacrificesChoisis.length < nombreSacrifices && !sacrificesChoisis.includes(id) && cardById(entity.carteId)?.kind !== 'site' && !fini;
            const sacrificeCible = Boolean(entity && sacrificesChoisis.includes(id));
            const mayPlace = (etape === 'tour' && side === actif || ['blocage', 'fin', 'reponse-creature', 'reponse-sort', 'reponse-arrivee'].includes(etape) && side === mainSide && rpgMobaPeutEmbuscade(duel, side, carte)) && (nombreSacrifices > 0 ? sacrificeCible : !id) && mobaVoieJouable(duel.moba, side, lane.id) && carte
              && sacrificesChoisis.length === nombreSacrifices && (!carteCiblee || carteArmeVivante) && !carteSoin && !cartePrix && !carteTransfert && !MOBA_MAGIES_SPATIALES.includes(carte) && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte));
            const campCibleMagie = MOBA_ARMES.includes(carte) || MOBA_MAGIES_ALLIEES.includes(carte) || (carte === 'defi-du-jarl' && !cibleSortPrimaire) ? mainSide : autre(mainSide);
            const maySpellTarget = ['tour', 'blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && (side === campCibleMagie || MOBA_MAGIES_NEUTRES.includes(carte)) && mobaVoiesCombat(duel.moba, entity?.mobaLane).length > 0 && carteCiblee && !defausse && !fini
              && (!MOBA_ARMES.includes(carte) || !entity.mur)
              && (carte !== 'brise-lame' || armesPortees(entity).length > 0)
              && (carte !== 'memoire-de-l-armurerie' || (duel[mainSide].cimetiere.includes('sabre-maudit') && !rpgEstProtegee(entity, cardColors(cardById('sabre-maudit')))))
              && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && cibleRespecteCoutMax(cardById(carte), entity) && !rpgEstProtegee(entity, cardColors(cardById(carte)))
              && (MOBA_ARMES.includes(carte) || !rpgEstProtegeeDesSorts(entity, cardColors(cardById(carte))));
            const arriveeOffensive = MOBA_ARRIVEES_HOSTILES.includes(duel.arriveeEnAttente?.carteId);
            const mayArrivalTarget = etape === 'arrivee' && (Number.isFinite(duel.arriveeEnAttente?.abordage) ? side === autre(arriveeSide) && entity && rpgMobaCiblesPrise(duel, arriveeSide).includes(id) : (MOBA_ARRIVEES_NEUTRES.includes(duel.arriveeEnAttente?.carteId) || side === (arriveeOffensive ? autre(arriveeSide) : arriveeSide)) && mobaPartageVoie(duel.moba, entity?.mobaLane, getEntity(arriveeSide, duel.arriveeEnAttente?.entiteId)?.mobaLane) && mobaVoiesCombat(duel.moba, entity?.mobaLane).length > 0 && !fini
              && (entity.id !== duel.arriveeEnAttente?.entiteId || cardById(duel.arriveeEnAttente?.carteId)?.arrivee?.cibleSoi)
              && (duel.arriveeEnAttente?.carteId !== 'gardienne-du-croissant' || cardById(entity.carteId)?.kind !== 'site')
              && cibleRespecteCoutMax(cardById(duel.arriveeEnAttente?.carteId), entity)
              && rpgCibleEmbuscadeLegale(duel, arriveeSide, cardById(duel.arriveeEnAttente?.carteId), entity)
              && (!cardById(duel.arriveeEnAttente?.carteId)?.arrivee?.attaquanteSeulement || (duel.arriveeEnAttente?.attaquants ?? []).includes(entity.id))
              && (duel.arriveeEnAttente?.carteId !== 'kraken' || cardHasPrintedType(entity.carteId, 'Navire'))
              && (duel.arriveeEnAttente?.carteId === 'guetteuse-des-marees' ? cardById(entity.carteId)?.kind !== 'site' : !rpgEstProtegee(entity, cardColors(cardById(duel.arriveeEnAttente?.carteId))))) && !fini;
            const position = { lane: lane.id, side, slot: i, id };
            const cibleGlisser = Boolean(glissement && peutDeposer(glissement, position));
            const peutGlisserBloqueur = !duel.combatDeclare?.cibleIndividuelle && side === 'joueur' && entity && etape === 'blocage' && defenseur === 'joueur'
              && duel.moba.lanes.flatMap((origin) => origin.slots[actif]).some((attackerId) => attackerId && getEntity(actif, attackerId)?.mobaLane === entity.mobaLane && peutDeposer({ type: 'bloqueur', id }, { ...position, side: actif, id: attackerId }));
            const positionProps = { 'data-moba-position': '', 'data-moba-lane': lane.id, 'data-moba-side': side, 'data-moba-slot': i, 'data-moba-entity': id || undefined,
              onDragOver: (event) => { if (peutDeposer(glissementRef.current, position)) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; } },
              onDrop: (event) => { if (peutDeposer(glissementRef.current, position)) { event.preventDefault(); deposerGlissement(glissementRef.current, position); } finGlissement(); },
            };
            const etats = etatsCreature(entity);
            const label = entity ? `${entity.name}, ${noms[side]}, ${voies[lane.id]}, attaque ${entity.atk}, défense ${entity.pv} sur ${entity.pvMax}${etats.length ? `, ${etats.join(', ')}` : ''}${mayTargetRapide || isRapidTarget ? ', cible de l’attaque' : ''}${(cibleSortPrimaire === id || (etape === 'arrivee' && duel.arriveeEnAttente?.cibleOni === id)) ? ', première cible sélectionnée' : maySpellTarget ? (MOBA_ARMES.includes(carte) ? ', porteur de l’arme' : ', cible de magie') : ''}${maySacrifice ? ', sacrifier pour invoquer' : sacrificeCible ? ', sacrifice sélectionné, invoquer à cette place' : ''}${mayDeathTarget ? ', cible de la destruction du Ghul' : ''}${maySiteTarget ? ', cible de la Source de Bimini' : ''}${mayArrivalTarget && !destruction ? (Number.isFinite(duel.arriveeEnAttente?.abordage) ? ', cible de prise en cale' : arriveeOffensive || MOBA_ARRIVEES_NEUTRES.includes(duel.arriveeEnAttente?.carteId) ? ', cible de la capacité' : duel.arriveeEnAttente?.carteId === 'volva-soigneuse' ? ', cible de soin' : duel.arriveeEnAttente?.carteId === 'faiseur-de-passage' ? ', cible d’infiltration' : duel.arriveeEnAttente?.carteId === 'guetteuse-des-marees' ? ', alliée à exiler temporairement' : ', cible de bouclier') : ''}` : `${voies[lane.id]}, ${noms[side]}, emplacement ${i + 1}${mayPlace ? (carteReanimation ? ', réanimer ici' : carteArmeVivante ? ', créer le Chien porteur ici' : carteSite ? ', installer le Site ici' : ', invoquer') : ''}`;
            const sortiesCase = rpgAnimationsReduites() ? [] : Object.values(sortiesVisuelles).filter((item) => item.laneId === lane.id && item.side === side && item.slot === i
              // Un retour très rapide met fin à son départ, même dans une autre case.
              && !rpgMobaSortieRemplacee(item, retoursExil));
            const tourbillons = sortiesCase.length > 0 && <div className="moba__departure-zone" aria-hidden="true">{sortiesCase.map((effet) => <TourbillonEau key={effet.effectId} effet={effet} />)}</div>;
            const fantomesCase = rendu?.FantomeCarteDetruite ? fantomes.filter((item) => item.laneId === lane.id && item.side === side && item.slot === i) : [];
            const adieux = fantomesCase.map((effet) => <rendu.FantomeCarteDetruite key={effet.effectId} effet={effet} onTermine={(effectId) => setFantomes((old) => old.filter((item) => item.effectId !== effectId))} />);
            const invocationEnCours = Boolean(entity && cerclesSacrifice.some((effet) => effet.entiteArriveeId === id));
            const soutien = entity && <>
              {entreesVisuelles[id] && !invocationEnCours && <span key={`entree-${entreesVisuelles[id].token}`} className={`moba__summon-fx${entreesVisuelles[id].origine === 'retour-exil' ? ' moba__summon-fx--retour-exil' : ''}`} aria-hidden="true"><i /><i /><i /></span>}
              {boucliersAjoutes[id] && <span key={`bouclier-${boucliersAjoutes[id]}`} className="moba__shield-fx" aria-hidden="true"><i /></span>}
              {!rendu?.TableCard && soinsCreatures[id] && <span key={`soin-${soinsCreatures[id].token}`} className="moba__creature-heal" aria-hidden="true">+{soinsCreatures[id].montant}</span>}
            </>;
            const sacrifice = rendu?.CercleMagique ? cerclesSacrifice
              .filter((effet) => effet.laneId === lane.id && effet.side === side && effet.slot === i)
              .map((effet) => <div className="moba__sacrifice-zone" key={effet.effectId} aria-hidden="true">
                <img className="moba__sacrifice-victim" src={cardArt(effet.cardId)} alt="" />
                <rendu.CercleMagique effet={{ ...effet, relativementAuSlot: true }} onTermine={(effectId) => setCerclesSacrifice((old) => old.filter((item) => item.effectId !== effectId))} />
              </div>) : null;
            const action = () => { if (destruction) { if (mayDeathTarget) choisirCibleDestruction(id); return; } if (site) { if (maySiteTarget) choisirCibleSite(id); return; } if (maySacrifice) { setSacrificesChoisis((old) => [...old, id]); return; } if (mayPlace) { if (carteReanimation || carteArmeVivante) lancerMagie(carte, null, lane.id, null, null, i); else poser(lane.id, i); } else if (mayArrivalTarget) choisirCibleArrivee(id); else if (mayTargetRapide) choisirCibleRapide(id); else if (maySpellTarget) lancerSurCreature(id); else if (mayTarget) setCible(id); else if (mayBlock) assigner(id); else if (mayAttack) choisirAttaquant(id); };
            if (entity && rendu?.TableCard) {
              const TableCard = rendu.TableCard;
              return <div className={`moba__real-slot${cibleGlisser ? ' is-moba-drop' : ''}`} key={i} {...positionProps} {...interactionsApercu(entity.carteId, entity)}>
                <TableCard key={`${entity.id}-${invocationEnCours ? 'rituel' : 'pose'}`} entite={entity} cote={side === 'joueur' ? 'joueur' : 'ennemi'} playerTurn={side === actif && etape === 'tour'} actionFx={sortFx[entity.id]?.action ?? combatFx[entity.id] ?? null} miss={combatFeedback?.miss[entity.id]} critiqueFx={combatFeedback?.critiques[entity.id]} soin={soinsCreatures[entity.id] ?? null} bouclierFx={paradesVisuelles[entity.id] ?? null} selected={Boolean(isAttacker)} blocking={Boolean(isBlocked)} declaredAttacker={Boolean(duel.combatDeclare?.attaquants?.includes(id))} canTarget={Boolean(destruction ? mayDeathTarget : site ? maySiteTarget : (maySacrifice || mayPlace || maySpellTarget || mayArrivalTarget || mayBlock || mayTarget || mayTargetRapide))} onClick={action} moba={{ className: `moba__slot has-creature${invocationEnCours ? ' is-invoking' : ''}${isAttacker ? ' is-attacking' : ''}${isBlocked ? ' is-blocking' : ''}${cible === id || isRapidTarget || cibleSortPrimaire === id || (etape === 'arrivee' && duel.arriveeEnAttente?.cibleOni === id) ? ' is-target' : ''}${sacrificeCible ? ' is-sacrifice' : ''}${combatFeedback?.critiques[id] ? ' is-moba-critique' : ''}`, disabled: destruction ? !mayDeathTarget : site ? !maySiteTarget : !(maySacrifice || mayPlace || mayAttack || mayTarget || mayBlock || maySpellTarget || mayArrivalTarget || mayTargetRapide || peutGlisserBloqueur), ariaLabel: label, draggable: Boolean(!destruction && peutGlisserBloqueur), onPointerDown: !destruction && peutGlisserBloqueur ? (event) => glisserTactile(event, { type: 'bloqueur', id }) : undefined, onDragStart: !destruction && peutGlisserBloqueur ? (event) => glisserSouris(event, { type: 'bloqueur', id }) : undefined, onDragEnd: finGlissement }} />
                {adieux.length > 0 && <div className="moba__ghost-zone" aria-hidden="true">{adieux}</div>}
                {sacrifice}
                {soutien}
                {tourbillons}
              </div>;
            }
            const slot = <button type="button" aria-label={label} title={entity ? cardById(entity.carteId)?.text || entity.name : undefined} className={`moba__slot${entity ? ' has-creature' : ' is-empty'}${invocationEnCours ? ' is-invoking' : ''}${isAttacker ? ' is-attacking' : ''}${isBlocked ? ' is-blocking' : ''}${(cible === id || isRapidTarget || cibleSortPrimaire === id || (etape === 'arrivee' && duel.arriveeEnAttente?.cibleOni === id)) && id ? ' is-target' : ''}`} disabled={destruction ? !mayDeathTarget : site ? !maySiteTarget : !(maySacrifice || mayPlace || mayAttack || mayTarget || mayBlock || maySpellTarget || mayArrivalTarget || mayTargetRapide || peutGlisserBloqueur)} draggable={Boolean(!destruction && peutGlisserBloqueur)} onPointerDown={!destruction && peutGlisserBloqueur ? (event) => glisserTactile(event, { type: 'bloqueur', id }) : undefined} onDragStart={!destruction && peutGlisserBloqueur ? (event) => glisserSouris(event, { type: 'bloqueur', id }) : undefined} onDragEnd={finGlissement} onClick={action}>
              {entity ? <><img src={cardArtEntite(entity)} alt="" /><span className="moba__slot-label"><b>{entity.name}</b><small><em>⚔ {entity.atk}</em><em>◆ {entity.pv}/{entity.pvMax}</em></small>{etats.length > 0 && <span className="moba__slot-states">{etats.join(' · ')}</span>}</span>{isAttacker && <span className="moba__slot-tag">ATTAQUE</span>}{isBlocked && <span className="moba__slot-tag">BLOQUE</span>}{isRapidTarget && <span className="moba__slot-tag">CIBLÉE</span>}</> : <span className="moba__empty-label"><i aria-hidden="true">{mayPlace ? '+' : '◇'}</i>{mobaVoieJouable(duel.moba, side, lane.id) ? (mayPlace ? (carteReanimation ? 'RÉANIMER' : carteArmeVivante ? 'CRÉER LE CHIEN' : carteSite ? 'INSTALLER' : 'INVOQUER') : 'EMPLACEMENT') : 'VOIE FERMÉE'}</span>}
            </button>;
            return adieux.length ? <div className={`moba__ghost-slot${cibleGlisser ? ' is-moba-drop' : ''}`} key={i} {...positionProps}>{slot}<div className="moba__ghost-zone moba__ghost-zone--empty" aria-hidden="true">{adieux}</div>{sacrifice}{soutien}{tourbillons}</div> : <div className={`moba__plain-slot${cibleGlisser ? ' is-moba-drop' : ''}`} key={i} {...positionProps}>{slot}{sacrifice}{soutien}{tourbillons}</div>;
          })}</div>
        </div>)}
      </section>)}
    </div></div></div>
    {annonceSort && rendu?.SpellAnnouncement && <div className="rpg-spell-played-stack moba__spell-stack" key={annonceSort.token}><rendu.SpellAnnouncement annonce={annonceSort} camp={annonceSort.camp} nomLanceur={noms[annonceSort.camp]} /></div>}
    <div className="moba__controls"><div className="moba__phase"><span>✦</span><div><small>VOTRE STRATÉGIE</small><strong>{etape === 'arrivee' ? 'Choix de la cible' : etape === 'reponse-creature' ? 'Réponse à la créature' : etape === 'reponse-sort' ? 'Réponse au sort' : etape === 'reponse-arrivee' ? 'Réponse à la capacité' : etape === 'fin' ? 'Réponse de fin de tour' : etape === 'blocage' ? 'Réponse à l’attaque' : defausse ? 'Défausse' : duel.attaqueJouee === actif ? 'Après le combat' : 'Phase principale'}</strong></div></div>{duel.brouillardCombat && <abbr className="moba__fog" title="Voile actif : les créatures ne peuvent pas infliger de dégâts de combat ce tour." aria-label="Voile actif : les créatures ne peuvent pas infliger de dégâts de combat ce tour">☁<span> Voile</span></abbr>}{camp.prochaineArriveeAbordage && <abbr className="moba__boarding" title="La prochaine créature jouée ce tour a Abordage." aria-label="La prochaine créature jouée ce tour a Abordage">⚓<span> Abordage</span></abbr>}{rendu?.PhaseTrack && <div className="moba__phase-track"><rendu.PhaseTrack current={phaseVisuelle} jouees={[]} steps={MOBA_PHASE_STEPS} ariaLabel="Repères du tour MOBA" currentSuffix="repère actuel" /></div>}<div className="moba__buttons">
      {annonceRepondable && !apercuAnnonceOuvert && <button type="button" ref={boutonRevoirAnnonce} aria-label={`Voir l’annonce de ${carteAnnonce.name}`} onClick={() => setAnnoncesApercues((anciennes) => anciennes.filter((item) => item !== attenteAnnonce))}>Voir l’annonce</button>}
      {destruction || site ? null : etape === 'tour' ? <>{cibleRapideEnCours && cibleVoieEnCours && <div role="group" aria-label="Choisir la voie de l’attaque"><span>Choisissez la voie de cette attaque :</span>{mobaVoiesCombat(duel.moba, getEntity(actif, cibleRapideEnCours)?.mobaLane).filter((voie) => rpgMobaCiblesIndividuelles(duel, actif, cibleRapideEnCours, voie).cibles.includes(cibleVoieEnCours)).map((voie) => <button key={voie} type="button" onClick={() => declarer(cibleRapideEnCours, cibleVoieEnCours, voie)}>{voies[voie]}</button>)}<button type="button" onClick={() => setCibleVoieEnCours(null)}>Changer de cible</button></div>}
      {cibleRapideEnCours && !cibleVoieEnCours && (() => {
        const voiesAttaque = mobaVoiesCombat(duel.moba, getEntity(actif, cibleRapideEnCours)?.mobaLane);
        return voiesAttaque.filter((voie) => rpgMobaCiblesIndividuelles(duel, actif, cibleRapideEnCours, voie).directe).map((voie) => <button key={voie} type="button" onClick={() => declarer(cibleRapideEnCours, null, voie)}>{voiesAttaque.length > 1 ? `Attaquer directement ${voies[voie].toLowerCase()}` : 'Attaquer directement la voie'}</button>);
      })()}<button type="button" className="moba__primary" disabled={fini || !!cibleRapideEnCours || !!defausse || camp.manaChoixEnAttente} onClick={finTour}>Fin du tour <span>→</span></button></> : etape === 'blocage' ? (repondant === 'joueur' && !iaAgit ? <button type="button" className="moba__primary" disabled={!!defausse} onClick={() => resoudre()}>{duel.combatDeclare?.cibleIndividuelle ? 'Passer et résoudre l’attaque →' : peutOuvrirPorte(blocages) ? 'Déclarer les bloqueurs →' : 'Résoudre le combat →'}</button> : null) : etape === 'fin' ? <button type="button" className="moba__primary" disabled={!!defausse} onClick={passerFinTour}>Passer et commencer mon tour →</button> : etape === 'reponse-creature' ? <button type="button" className="moba__primary" disabled={fini || !!defausse} onClick={passerCreature}>Passer et laisser entrer →</button> : etape === 'reponse-sort' ? <button type="button" className="moba__primary" disabled={!!defausse} onClick={passerSort}>{duel.mobaSortEnAttente?.armeMoba ? 'Passer et attacher l’arme →' : 'Passer et résoudre le sort →'}</button> : etape === 'reponse-arrivee' ? <button type="button" className="moba__primary" disabled={!!defausse} onClick={passerEffetCreature}>Passer et résoudre l’effet →</button> : null}
    </div>
    {/* Les consignes restent disponibles aux lecteurs d’écran sans texte visible sous les commandes. */}
    <p className="moba__hint moba__sr-only" aria-live="polite">{!destruction && etape === 'reponse-creature' && <><strong>{cardById(duel.mobaCreatureEnAttente?.carteId)?.name} → {voies[duel.mobaCreatureEnAttente?.laneId]} · {noms[duel.mobaCreatureEnAttente?.cote]} · emplacement {(duel.mobaCreatureEnAttente?.slot ?? 0) + 1}.</strong>{' '}</>}{!destruction && etape === 'reponse-sort' && <><strong>{cardById(duel.mobaSortEnAttente?.carteId)?.name} → {duel.mobaSortEnAttente?.laneId ? `${duel.mobaSortEnAttente.carteId === 'festin-des-vaillants' ? 'Alliés + ' : ''}${voies[duel.mobaSortEnAttente.laneId]} · ${noms[duel.mobaSortEnAttente.cibleCote]}${duel.mobaSortEnAttente.carteId === 'le-poids' && duel.mobaSortEnAttente.cibleId ? ` + ${getEntity(autre(duel.mobaSortEnAttente.cote), duel.mobaSortEnAttente.cibleId)?.name ?? 'créature ciblée'}` : ''}` : `${duel.mobaSortEnAttente?.cibleNom} · ${noms[duel.mobaSortEnAttente?.cibleCote]}` }.</strong>{' '} </>}{!destruction && ['reponse-sort', 'reponse-creature'].includes(etape) && !iaAgit && !defausse ? (carte && rpgMobaPeutEmbuscade(duel, mainSide, carte) ? instruction : carte && MOBA_MAGIES_PRIX.includes(carte) && (!MOBA_MAGIES_TRANSFERT.includes(carte) && !MOBA_MAGIES_SPATIALES.includes(carte) || !prixLane) ? 'Choisissez une voie pour payer.' : carte ? 'Cible ?' : 'Répondez ou passez.') : instruction}</p>
    {(erreur || (!destruction && (carte || cibleRapideEnCours) && !defausse && !fini)) && <div className="moba__directive">
      {erreur && <p className="moba__error" role="alert">{erreur}</p>}
      {!destruction && (carte || cibleRapideEnCours) && !defausse && !fini && <button type="button" className="moba__cancel-choice" onClick={annulerChoix}>Annuler le choix</button>}
    </div>}
    </div>
    {['tour', 'arrivee', 'blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && <section className="moba__hand" aria-label="Votre main"><div className="moba__handhead"><div><span>VOTRE RÉSERVE</span><h2>Votre main</h2></div><span className="moba__deck-count">PIOCHE <b>{campMainVisible.deck.length}</b></span>{nombrePagesMain > 1 && <div className="moba__hand-pages" aria-label="Pages de la main"><button type="button" aria-label="Page précédente de la main" disabled={pageMainVisible === 0} onClick={() => setPageMain(pageMainVisible - 1)}>‹</button><span>{pageMainVisible + 1} / {nombrePagesMain}</span><button type="button" aria-label="Page suivante de la main" disabled={pageMainVisible >= nombrePagesMain - 1} onClick={() => setPageMain(pageMainVisible + 1)}>›</button></div>}</div><div className="moba__hand-cards">{campMainVisible.main.slice(debutPageMain, debutPageMain + TAILLE_PAGE_MAIN).map((id, pageIndex) => {
      const index = debutPageMain + pageIndex;
      const card = cardById(id);
      const disabled = mainSide !== 'joueur' || fini || Boolean(destruction || (site && !defausse)) || (!defausse && (rpgMobaSortBlocageInterdit(id) || (id === 'memoire-de-l-armurerie' && !campMainVisible.cimetiere.includes('sabre-maudit')) || !!cibleRapideEnCours || etape === 'arrivee' || campMainVisible.manaChoixEnAttente || (MOBA_CONTRESORTS.includes(id) && !(etape === 'reponse-sort' && (duel.mobaSortEnAttente?.armeMoba ? id === 'contresort-des-abimes' : id !== 'ecueil') && duel.mobaSortEnAttente?.cote !== mainSide || etape === 'reponse-creature' && (id === 'contresort-des-abimes' || (id === 'ecueil' && cardById(duel.mobaCreatureEnAttente?.carteId)?.kind !== 'site')) && duel.mobaCreatureEnAttente?.cote !== mainSide)) || (['blocage', 'fin', 'reponse-arrivee', 'reponse-sort', 'reponse-creature'].includes(etape) && !card.instant && !(['blocage', 'fin', 'reponse-creature', 'reponse-sort', 'reponse-arrivee'].includes(etape) && rpgMobaPeutEmbuscade(duel, mainSide, id))) || !rpgMobaPeutPayer(duel, mainSide, card)));
      const specialementJouable = !disabled && ['creature', 'hero'].includes(card.kind) && rpgMobaPeutEmbuscade(duel, mainSide, id);
      const selected = carte === id && !defausse;
      const peutGlisserCarte = !disabled && !iaAgit && etape === 'tour' && actif === 'joueur' && ['creature', 'hero', 'site'].includes(card.kind) && !defausse;
      if (rendu?.ManaCost && rendu?.CardStatIcon) {
        const { ManaCost, CardStatIcon } = rendu;
        const creature = ['creature', 'hero'].includes(card.kind);
        return <div className="moba__hand-item" key={`${id}-${index}`} {...interactionsApercu(id)}>
          <button type="button" className={`moba__card moba__real-hand rpg-hand__card rpg-hand__card--img rpg-hand__card--elem-${card.element} ${cardFrameClass(card)} ${cardMotifClass(card)}${selected ? ' is-selected is-targeting' : ''}${disabled ? ' is-unplayable' : ' is-playable'}${specialementJouable ? ' is-special-ambush' : ''}`} style={{ '--rpg-frame-color': cardFrameColor(card) }} data-card-id={id} disabled={disabled} draggable={Boolean(peutGlisserCarte)} onPointerDown={peutGlisserCarte ? (event) => glisserTactile(event, { type: 'creature', id }) : undefined} onDragStart={peutGlisserCarte ? (event) => glisserSouris(event, { type: 'creature', id }) : undefined} onDragEnd={finGlissement} aria-label={`${card.name}, coût imprimé ${card.cost}, ${card.text || 'aucune capacité'}${rpgMobaSortBlocageInterdit(id) ? '. Injouable en MOBA : impose un blocage.' : ''}`} title={rpgMobaSortBlocageInterdit(id) ? 'Injouable en MOBA : impose un blocage.' : undefined} aria-pressed={selected} onClick={() => jouerCarte(id, index)}>
            <img draggable="false" className="rpg-hand__img" src={cardArt(id)} alt="" aria-hidden="true" />
            <span className="rpg-hand__title"><ManaCost carte={card} showElement={false} /></span>
            <IconesCarte carte={rpgMobaCartePourApercu(card)} className="rpg-card-icones--colonne rpg-card-icones--main" />
            {creature && <span className="rpg-hand__stats" aria-hidden="true"><span className="rpg-hand__stat rpg-hand__stat--atk"><CardStatIcon type="attack" attaqueCiblee={card.coupRapide} /><span className="rpg-stat-value">{card.atk}</span></span><span className="rpg-hand__stat rpg-hand__stat--def"><CardStatIcon type="defense" /><span className="rpg-stat-value">{card.def}</span></span></span>}
            <span className="moba__sr-only">{card.name}</span>
          </button>
        </div>;
      }
      return <button type="button" key={`${id}-${index}`} className={`moba__card${selected ? ' is-selected' : ''}${specialementJouable ? ' is-special-ambush' : ''}`} disabled={disabled} draggable={Boolean(peutGlisserCarte)} onPointerDown={peutGlisserCarte ? (event) => glisserTactile(event, { type: 'creature', id }) : undefined} onDragStart={peutGlisserCarte ? (event) => glisserSouris(event, { type: 'creature', id }) : undefined} onDragEnd={finGlissement} onClick={() => jouerCarte(id, index)} title={rpgMobaSortBlocageInterdit(id) ? 'Injouable en MOBA : impose un blocage.' : card.text} aria-label={rpgMobaSortBlocageInterdit(id) ? `${card.name}. Injouable en MOBA : impose un blocage.` : undefined}><span className="moba__card-art"><img src={cardArt(id)} alt="" /><i>{card.cost}</i></span><span className="moba__card-info"><b>{card.name}</b><small>{card.kind === 'magie' ? 'MAGIE' : card.kind === 'arme' ? 'ARME' : card.kind === 'site' ? 'SITE' : `⚔ ${card.atk}  ◆ ${card.def}`}</small><small className="moba__cardtext">{card.text || 'Aucune capacité.'}</small></span></button>;
    })}</div></section>}
    </div>
    <details className="moba__journal"><summary>Journal du duel</summary>
      {rendu?.CombatFeedEvent && <div className="moba__journal-tabs" role="group" aria-label="Vue du journal"><button type="button" aria-pressed={vueJournal === 'texte'} onClick={() => { setVueJournal('texte'); setPageJournal(0); }}>Événements</button><button type="button" aria-pressed={vueJournal === 'combat'} onClick={() => { setVueJournal('combat'); setPageJournal(0); }}>Combats</button></div>}
      {vueJournal === 'combat' && rendu?.CombatFeedEvent ? <ol className="rpg-combat-feed__list" aria-label="Échanges de combat">{contenuJournal.slice(pageJournalVisible * 2, pageJournalVisible * 2 + 2).map((event) => <rendu.CombatFeedEvent key={event.id} event={event} />)}</ol> : contenuJournal.slice(pageJournalVisible * 2, pageJournalVisible * 2 + 2).map((line, i) => <p key={i}>{line}</p>)}
      {!contenuJournal.length && <p>{vueJournal === 'combat' ? 'Aucun échange enregistré.' : 'Aucun événement enregistré.'}</p>}
      {pagesJournal > 1 && <div className="moba__journal-pages" aria-label="Pages du journal"><button type="button" aria-label="Page précédente du journal" disabled={pageJournalVisible === 0} onClick={() => setPageJournal(pageJournalVisible - 1)}>‹</button><span>{pageJournalVisible + 1} / {pagesJournal}</span><button type="button" aria-label="Page suivante du journal" disabled={pageJournalVisible >= pagesJournal - 1} onClick={() => setPageJournal(pageJournalVisible + 1)}>›</button></div>}</details>
    </div>

    {cimetiere && <div className="moba__graveyard-layer" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); fermerCimetiere(); }
      if (event.key === 'Tab') {
        const boutons = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')];
        const premier = boutons[0], dernier = boutons[boutons.length - 1];
        if (premier && event.shiftKey && document.activeElement === premier) { event.preventDefault(); dernier.focus(); }
        else if (dernier && !event.shiftKey && document.activeElement === dernier) { event.preventDefault(); premier.focus(); }
      }
    }}>
      {rendu?.CimetiereCarousel ? <rendu.CimetiereCarousel cartes={duel[cimetiere].cimetiere} campLabel={cimetiere === 'joueur' ? 'votre camp' : 'l’IA'} onClose={fermerCimetiere} /> : <div className="moba__overlay" role="dialog" aria-modal="true" aria-label={`Cimetière de ${cimetiere === 'joueur' ? 'votre camp' : 'l’IA'}`}><div className="moba__modal"><h2>Cimetière de {cimetiere === 'joueur' ? 'votre camp' : 'l’IA'}</h2><ul>{duel[cimetiere].cimetiere.slice().reverse().map((id, index) => <li key={`${id}-${index}`}>{cardById(id)?.name ?? id}</li>)}</ul><button type="button" autoFocus onClick={fermerCimetiere}>Fermer le cimetière</button></div></div>}
    </div>}
    {apercu && rendu?.ApercuCarteAppuiLong && <div className="moba__preview-layer" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); fermerApercu(); }
      if (event.key === 'Tab') {
        const boutons = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')];
        const premier = boutons[0], dernier = boutons[boutons.length - 1];
        if (premier && event.shiftKey && document.activeElement === premier) { event.preventDefault(); dernier.focus(); }
        else if (dernier && !event.shiftKey && document.activeElement === dernier) { event.preventDefault(); premier.focus(); }
      }
    }}><rendu.ApercuCarteAppuiLong carte={rpgMobaCartePourApercu(cardById(apercu.carteId))} notesMoba={rpgMobaNotesCarte(cardById(apercu.carteId))} armes={apercu.armes.map(cardById).filter(Boolean)} furieDeclenchee={Boolean(apercu.entity?.furieDeclenchee)} statsFurie={apercu.entity?.furieDeclenchee ? { atk: apercu.entity.atk, def: apercu.entity.pv } : null} effetsEpuises={apercu.effetsEpuises} onFermer={fermerApercu} /></div>}
    {etape === 'choix' && !edition && !annoncePremier && <div className="moba__overlay moba__setup-overlay" role="dialog" aria-modal="true" aria-label="Choix des decks">
      <div className="moba__modal moba__setup">
        <div className="moba__setup-kicker"><span>LE SABLIER</span><i aria-hidden="true">✦</i><span>DUEL SOLO</span></div>
        <h2>Préparez votre duel</h2>
        <p>Deux decks. Trois voies. Une seule victoire.</p>
        <div className="moba__setup-rules"><span><b>03</b> voies</span><span><b>20 / 15 / 20</b> PV par voie</span><span><b>02</b> conquêtes pour gagner</span></div>
        <div className="moba__deck-picker-heading"><div><span>VOTRE CAMP</span><h3>Choisissez votre deck</h3></div><p>Vos decks sont représentés par des paquets, sans achat.</p></div>
        <section className="moba__booster-group" aria-label="Vos decks">
          <div className="moba__booster-list">
            {decksPersonnalises.joueur && <BoosterDeck deck={decksPersonnalises.joueur} selected onSelect={() => {}} />}
            {decksDuJoueur.map((option) => <BoosterDeck key={option.id} deck={option} selected={!decksPersonnalises.joueur && deckPour('joueur')?.id === option.id} onSelect={() => choisirDeck(option.id)} />)}
            {!decksPersonnalises.joueur && !decksDuJoueur.length && <p className="moba__setup-empty">Vous n’avez pas encore de deck. Créez-en un pour commencer.</p>}
          </div>
        </section>
        <fieldset className="moba__plateau-picker">
          <legend>Choisissez votre plateau</legend>
          <div className="moba__plateau-options">{MOBA_PLATEAUX.map((plateau) => <button
            key={plateau.id} type="button" className={`moba__plateau-option${plateau.id === plateauMoba.id ? ' is-selected' : ''}`}
            aria-pressed={plateau.id === plateauMoba.id} onClick={() => setPlateauMoba(plateau)}>
            <img src={`${import.meta.env.BASE_URL}${plateau.fichier}`} alt="" loading="lazy" />
            <span>{plateau.nom}</span>
          </button>)}</div>
        </fieldset>
        {!validationDeckJoueur.ok && <p className="moba__setup-warning" role="status">{deckPour('joueur') ? `Deck non compatible : ${validationDeckJoueur.raison}` : validationDeckJoueur.raison}</p>}
        <div className="moba__story-start">
          <div><span>✦ CAMPAGNE · {MOBA_HISTOIRE.length} CHAPITRES</span><strong>Du seuil au Styx</strong><small>{MOBA_HISTOIRE.length} duels, {MOBA_HISTOIRE.length} plateaux, {MOBA_HISTOIRE.length} adversaires. Votre deck vous accompagne ; chaque victoire ouvre le chapitre suivant.</small></div>
          <button type="button" className="moba__primary" disabled={!validationDeckJoueur.ok} onClick={demarrerHistoire}>Jouer l’histoire →</button>
        </div>
        <div className="moba__setup-actions">
          <button type="button" onClick={onQuitter}>← Retour au menu</button>
          <button type="button" onClick={() => setEdition('joueur')}>{deckPour('joueur') ? 'Personnaliser le deck' : 'Créer un deck'}</button>
          <button type="button" className="moba__primary" disabled={!validationDeckJoueur.ok} onClick={() => { if (!validationDeckJoueur.ok) return; const adversaire = rpgMobaDeckTourAleatoire() ?? MOBA_DECKS[0]; setModeHistoire(false); setDeckSorcier(adversaire); setDuel(nouveau(deckPour('joueur'), adversaire)); setEtape('mulligan'); }}>Commencer le duel libre <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </div>}
    {etape === 'choix' && edition && !annoncePremier && <RpgMobaDeckEditor key={edition} deck={deckPour(edition) ?? { cardIds: [], elements: [] }} joueur={noms[edition]} onCancel={() => setEdition(null)} onSave={(deck) => { setDecksPersonnalises((decks) => ({ ...decks, [edition]: deck })); setEdition(null); }} />}
    {etape === 'mulligan' && <div className="moba__overlay moba__mulligan-overlay" inert={Boolean(apercu)} role="dialog" aria-modal="true" aria-label="Votre main de départ"><div className="moba__modal moba__mulligan"><div className="moba__mulligan-intro"><span>PRÉPARATION · {noms[mulliganSide].toUpperCase()}</span><h2>Votre main de départ</h2><p>Touchez les cartes à échanger, ou gardez votre main.</p></div><div className="moba__mulligan-cards">{duel[mulliganSide].main.map((id, index) => {
      const card = cardById(id), choisi = mulliganIndices.includes(index);
      const toggle = () => setMulliganIndices((ids) => ids.includes(index) ? ids.filter((n) => n !== index) : [...ids, index]);
      if (rendu?.CarteMulligan) {
        const CarteMulligan = rendu.CarteMulligan;
        return <div className="moba__mulligan-item" key={`${id}-${index}`} {...interactionsApercu(id)}>
          <CarteMulligan carte={card} index={index} selectionnee={choisi} onBasculer={toggle} />
          <IconesCarte carte={rpgMobaCartePourApercu(card)} className="rpg-card-icones--colonne rpg-card-icones--mulligan-moba" />
        </div>;
      }
      return <button type="button" autoFocus={index === 0} key={`${id}-${index}`} aria-pressed={choisi} className={`moba__mulligan-card${choisi ? ' is-selected' : ''}`} onClick={toggle}><img src={cardArt(id)} alt="" /><b>{card.name}</b><small>{choisi ? 'À ÉCHANGER' : `COÛT ${card.cost}`}</small></button>;
    })}</div>{erreur && <p className="moba__error" role="alert">{erreur}</p>}<button type="button" className="moba__primary" onClick={confirmerMulligan}>{mulliganIndices.length ? `Échanger ${mulliganIndices.length} carte(s)` : 'Garder ma main'} →</button></div></div>}

    {apercuAnnonceOuvert && <section className="rpg-annonce-sort moba__card-announcement" role="dialog" aria-modal="true" aria-label={`L’IA annonce ${carteAnnonce.name}. Cible : ${cibleAnnonce}.`} onKeyDown={clavierAnnonce}>
      <div className="rpg-annonce-sort__panel">
        {(() => {
          const commandes = <div className="rpg-annonce-sort__controls">
            <button type="button" autoFocus className="rpg-btn rpg-annonce-sort__respond" aria-label={`Répondre à ${carteAnnonce.name}`} onClick={repondreAnnonce}><span aria-hidden="true">✦</span><span>Répondre</span></button>
            <button type="button" className="rpg-btn rpg-annonce-sort__pass" aria-label={`Laisser passer ${carteAnnonce.name}`} onClick={() => { onPlaySfx?.('pass'); if (etape === 'reponse-creature') passerCreature(); else passerSort(); }}><span aria-hidden="true">➜</span><span>Laisser passer</span></button>
          </div>;
          return rendu?.HoverCardPreview
            ? <rendu.HoverCardPreview carte={carteAnnonce} cible={{ nom: cibleAnnonce }} variante="annonce" controls={commandes} />
            : <div className="moba__announcement-fallback"><img src={cardArt(carteAnnonce)} alt="" /><div><small>CARTE ANNONCÉE</small><strong>{carteAnnonce.name}</strong><p>{carteAnnonce.text || 'Aucune capacité.'}</p><p>⌖ {cibleAnnonce}</p>{commandes}</div></div>;
        })()}
      </div>
    </section>}

    {parametresOuverts && rendu?.VolumesDuel && <div className="moba__overlay moba__settings-overlay" role="dialog" aria-modal="true" aria-labelledby="moba-settings-title" onKeyDown={clavierParametres}>
      <div className="moba__modal moba__settings-modal">
        <h2 id="moba-settings-title">Paramètres audio</h2>
        <rendu.VolumesDuel sonActif={sonActif} volumeSfx={volumeSfx} volumeVoix={volumeVoix} volumeMusique={volumeMusique}
          changerVolumeSfx={onChangeVolumeSfx} changerVolumeVoix={onChangeVolumeVoix} changerVolumeMusique={onChangeVolumeMusique} />
        <div className="moba__settings-actions">
          <button type="button" aria-pressed={sonActif} onClick={onToggleSound}>{sonActif ? 'Couper tous les sons' : 'Activer tous les sons'}</button>
          <button type="button" autoFocus className="moba__primary" onClick={fermerParametres}>Fermer</button>
        </div>
      </div>
    </div>}
    {confirmerSortie && !fini && <div className="moba__overlay" role="dialog" aria-modal="true" aria-labelledby="moba-quitter-title" aria-describedby="moba-quitter-description" onKeyDown={clavierConfirmation}><div className="moba__modal moba__quit-modal"><span>FIN DE PARTIE</span><h2 id="moba-quitter-title">Quitter le duel ?</h2><p id="moba-quitter-description">La partie en cours ne sera pas sauvegardée.</p><button type="button" autoFocus className="moba__primary" onClick={fermerConfirmation}>Continuer le duel</button><button type="button" onClick={onQuitter}>Quitter sans sauvegarder</button></div></div>}
    {recherche?.cote === 'joueur' && !fini && !confirmerSortie && <div className="moba__overlay" inert={Boolean(apercu)} role="dialog" aria-modal="true" aria-label="Recherche dans votre deck"><div className="moba__modal moba__mulligan"><span>CAPACITÉ D’ARRIVÉE</span><h2>Choisissez une carte</h2><p>{cardById(recherche.sourceCarteId)?.name} cherche dans votre deck. Choisissez une carte admissible à ajouter à votre main.</p><div className="moba__mulligan-cards moba__search-cards">{rpgMobaCandidatsRecherche(duel, 'joueur').map((id, index) => <div className="moba__search-item" key={id} {...interactionsApercu(id)}><button type="button" autoFocus={index === 0} className="moba__mulligan-card" onClick={() => afficherResultat(rpgMobaResoudreRecherche(duel, 'joueur', id))}><img src={cardArt(id)} alt="" /><b>{cardById(id)?.name}</b><small>COÛT {cardById(id)?.cost}</small><small className="moba__search-text">{cardById(id)?.text}</small></button></div>)}</div>{erreur && <p className="moba__error" role="alert">{erreur}</p>}</div></div>}
    {chapitreAnnonce && <section className={`moba__interlude moba__interlude--${chapitreAnnonce.ambiance}`} role="dialog" aria-modal="true" aria-labelledby="moba-interlude-titre" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); if (annoncePremier) revenirDeLAnnonce(); else setInterlude(false); } else if (event.key === 'Tab') { const boutons = [...event.currentTarget.querySelectorAll('button')]; if (event.shiftKey && document.activeElement === boutons[0]) { event.preventDefault(); boutons.at(-1)?.focus(); } else if (!event.shiftKey && document.activeElement === boutons.at(-1)) { event.preventDefault(); boutons[0]?.focus(); } } }} style={{ '--moba-interlude-decor': `url("${import.meta.env.BASE_URL}${chapitreAnnonce.decor}")` }}>
      <div className="moba__interlude-scene" aria-hidden="true" />
      <div className="moba__interlude-hero"><img src={cardArt(chapitreAnnonce.portrait)} alt={`La peinture originale de ${cardById(chapitreAnnonce.portrait)?.name ?? chapitreAnnonce.deck.name}, prêt à vous affronter`} draggable={false} /></div>
      <div className={`moba__interlude-particles moba__interlude-particles--${chapitreAnnonce.ambiance}`} aria-hidden="true">{PARTICULES_INTERLUDE.map((style, index) => <i key={index} style={style} />)}</div>
      <div className="moba__interlude-copy">
        <span className="moba__interlude-kicker">LE SABLIER · CHAPITRE {annoncePremier ? 1 : chapitreIndex + 2} / {MOBA_HISTOIRE.length}</span>
        <span className="moba__interlude-rule" aria-hidden="true">✦ ─────────── ✦</span>
        <p className="moba__interlude-eyebrow">{annoncePremier ? 'LE PREMIER AFFRONTEMENT' : 'LE PROCHAIN ADVERSAIRE'}</p>
        <h2 id="moba-interlude-titre">{chapitreAnnonce.deck.name}</h2>
        <p className="moba__interlude-text">{chapitreAnnonce.texte}</p>
        <p className="moba__interlude-destination">✦ {chapitreAnnonce.titre} · {chapitreAnnonce.plateau.nom}</p>
        <div className="moba__interlude-actions"><button type="button" autoFocus className="moba__primary" onClick={annoncePremier ? lancerPremierChapitre : ouvrirProchainChapitre}>Affronter {chapitreAnnonce.deck.name} →</button><button type="button" onClick={annoncePremier ? revenirDeLAnnonce : onQuitter}>{annoncePremier ? etape === 'choix' ? 'Retour à la préparation' : 'Retour au résultat' : 'Quitter l’histoire'}</button></div>
      </div>
    </section>}
    {fini && !interlude && !annoncePremier && <div className="moba__end-overlay" role="dialog" aria-modal="true" aria-label={vainqueur === 'joueur' ? 'Victoire' : vainqueur === 'sorcier' ? 'Défaite' : vainqueur === 'nul' ? 'Match nul' : 'Partie terminée'} onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const elements = [...event.currentTarget.querySelectorAll('button:not(:disabled), summary')];
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    }}><div className={`rpg-overlay ${vainqueur === 'joueur' ? 'rpg-overlay--win' : 'rpg-overlay--loss'} moba__end-panel`}>
      {Object.keys(conquetesVisuelles).length > 0 && <span className="moba__end-conquest-fx" aria-hidden="true" />}
      <h2>{vainqueur === 'joueur' ? modeHistoire && !prochainChapitre ? 'Histoire accomplie !' : 'Victoire !' : vainqueur === 'sorcier' ? 'Défaite' : vainqueur === 'nul' ? 'Match nul' : 'Partie terminée'}</h2>
      {modeHistoire && <p className="moba__end-chapter">Chapitre {chapitreIndex + 1} / {MOBA_HISTOIRE.length} · {MOBA_HISTOIRE[chapitreIndex].titre} · {deckSorcier?.name}</p>}
      <p>{duel.moba.winner ? `${duel.moba.winner === 'joueur' ? 'Vous avez conquis' : 'L’IA a conquis'} deux voies.` : 'Le Sablier a rendu son verdict.'}</p>
      <p className="moba__end-score">Voies conquises : vous {scores.joueur} · IA {scores.sorcier}</p>
      <details className="rpg-bilan-fin moba__end-bilan"><summary>Voir le bilan du duel</summary>
        <ul>{duel.moba.lanes.map((lane) => <li key={lane.id}><strong>{voies[lane.id]}</strong> : {lane.conqueredBy ? `conquise par ${noms[lane.conqueredBy]}` : `vous ${lane.hp.joueur} PV · IA ${lane.hp.sorcier} PV`}</li>)}</ul>
        <strong>Derniers événements</strong>{lignesJournal.length ? <ol>{lignesJournal.slice(0, 2).map((line, index) => <li key={index}>{line}</li>)}</ol> : <p>Aucun événement enregistré.</p>}
      </details>
      <div className="moba__end-actions">
        {modeHistoire ? prochainChapitre
          ? <button type="button" autoFocus className="moba__primary" onClick={() => setInterlude(true)}>Découvrir le prochain adversaire →</button>
          : <button type="button" autoFocus className="moba__primary" onClick={vainqueur === 'joueur' ? demarrerHistoire : rejouerChapitre}>{vainqueur === 'joueur' ? 'Recommencer l’histoire' : 'Réessayer ce chapitre'}</button>
          : <button type="button" autoFocus className="moba__primary" onClick={() => { setModeHistoire(false); nouvellePartie(); }}>Rejouer</button>}
        <button type="button" onClick={onQuitter}>Retour au menu</button>
      </div>
    </div></div>}
  </main>;
}
