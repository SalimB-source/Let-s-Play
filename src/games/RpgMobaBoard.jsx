import { useEffect, useReducer, useRef, useState } from 'react';
import { cardById, cardColors, cardHasPrintedType, cardFrameClass, cardFrameColor, cardMotifClass } from './rpgCards.js';
import { EffetsSprite, IconesCarte } from './effetIcons.jsx';
import { SortSceau } from './rpgSortSignature.jsx';
import { cardArt } from './rpgCardArt.js';
import { plateauDeDeck } from './rpgPlateaux.js';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';
import { sonSortAuLancement } from './rpgSortAudio.js';
import { rpgSonsResolutionCombat } from './rpgAttackAudio.js';
import { rpgChoisirCouleurMana, rpgEstProtegee, rpgEstProtegeeDesSorts, rpgPeutAttaquer, rpgPeutBloquerAttaquant, cibleRespecteCoutMax, rpgNombreDestructions, rpgDestructionsDepuis } from './rpgDuel.js';
import {
  MOBA_DECKS, MOBA_ARRIVEES_HOSTILES, MOBA_ARRIVEES_NEUTRES, MOBA_MAGIES_ESSAI, MOBA_MAGIES_IMMEDIATES, MOBA_MAGIES_CIBLEES, MOBA_MAGIES_ALLIEES, MOBA_MAGIES_NEUTRES, MOBA_MAGIES_VOIES, MOBA_MAGIES_SOINS, MOBA_MAGIES_PRIX, MOBA_MAGIES_TRANSFERT, rpgMobaCreerPartie, rpgMobaCandidatsRecherche, rpgMobaResoudreRecherche, rpgMobaCiblesAttaque, rpgMobaDeclarerAttaque, rpgMobaDefausser, rpgMobaJouerCreature,
  rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaMulligan,
  rpgMobaPasserEffetCreature, rpgMobaPasserFinDeTour, rpgMobaPeutPayer, rpgMobaResoudreArrivee, rpgMobaTerminerTour,
} from './rpgMobaLocal.js';
import RpgMobaDeckEditor from './RpgMobaDeckEditor.jsx';
import { choisirCouleurManaIA, choisirDefausseIA, choisirMulliganIA } from './rpgAI.js';
import { rpgMobaChoisirRechercheIA, rpgMobaChoisirArriveeIA, rpgMobaChoisirAttaquantsIA, rpgMobaChoisirCiblesAttaqueIA, rpgMobaChoisirBlocagesIA, rpgMobaChoisirCreatureIA, rpgMobaChoisirMagieIA } from './rpgMobaAI.js';
import './rpg-moba.css';

const noms = { joueur: 'Vous', sorcier: 'IA' };
const voies = { left: 'Voie gauche', center: 'Voie centrale', right: 'Voie droite' };
const glyphes = { left: 'I', center: 'II', right: 'III' };
const autre = (side) => side === 'joueur' ? 'sorcier' : 'joueur';
const message = {
  mana: 'Mana insuffisant pour cette carte.', 'pas-pret': 'Cette créature ne peut pas encore attaquer.',
  provocation: 'Une créature avec Provocation doit être bloquée si possible.',
  'blocage-force': 'Les créatures marquées doivent bloquer si elles le peuvent dans leur voie.',
  'attaque-jouee': 'La phase d’attaque est déjà terminée.', 'cible-obligatoire': 'Choisissez une cible dans la voie de chaque attaquant ciblé.', emplacement: 'Cet emplacement n’est pas libre.',
  'effet-non-pris-en-charge': 'Cette capacité n’est pas encore disponible dans l’essai MOBA.',
};
function nouveau(joueur = MOBA_DECKS[0], sorcier = MOBA_DECKS[0]) {
  const result = rpgMobaCreerPartie(joueur, sorcier);
  if (!result.ok) throw new Error(`Deck MOBA invalide (${result.side}) : ${result.raison}`);
  return result.duel;
}

function Marque({ active }) {
  return <span className={`moba__mark${active ? ' is-won' : ''}`} aria-hidden="true">◆</span>;
}

function etatsCreature(entity) {
  if (!entity) return [];
  const etats = [];
  if (entity.gelToursRestants > 0) etats.push('Gelée');
  else if (entity.attaquee) etats.push('A attaqué');
  else if (!entity.ready) etats.push('Arrivée récente');
  if (entity.provocation) etats.push('Provocation');
  if (entity.blocageForce) etats.push('Doit bloquer si possible');
  if (entity.envol) etats.push('Envol');
  if (entity.overkill || entity.overkillTemporaire > 0) etats.push('Overkill');
  if (entity.furieDeclenchee) etats.push('Furie active');
  if (entity.bouclier > 0) etats.push('Bouclier');
  if (entity.heures?.restants > 0) etats.push(`${entity.heures.restants} Heure${entity.heures.restants > 1 ? 's' : ''}`);
  return etats;
}

/** Solo MOBA: the adapter owns the rules, React schedules the AI decisions. */
export default function RpgMobaBoard({ onQuitter, initialiser = nouveau, rendu = null, onPlaySfx = null, sonActif = true, onToggleSound = null }) {
  const [duel, setDuel] = useState(initialiser);
  const [version, redraw] = useReducer((n) => n + 1, 0);
  const [carte, setCarte] = useState(null);
  const [attaquants, setAttaquants] = useState([]);
  const [ciblesRapides, setCiblesRapides] = useState({});
  const [cibleRapideEnCours, setCibleRapideEnCours] = useState(null);
  const [blocages, setBlocages] = useState({});
  const [cible, setCible] = useState(null);
  const [etape, setEtape] = useState(initialiser === nouveau ? 'choix' : 'mulligan');
  const [deckJoueur, setDeckJoueur] = useState(MOBA_DECKS[0].id);
  const [deckSorcier, setDeckSorcier] = useState(MOBA_DECKS[0].id);
  const [decksPersonnalises, setDecksPersonnalises] = useState({ joueur: null, sorcier: null });
  const [edition, setEdition] = useState(null);
  const mulliganSide = 'joueur';
  const [mulliganIndices, setMulliganIndices] = useState([]);
  const [erreur, setErreur] = useState('');
  const [prixLane, setPrixLane] = useState(null);
  const [iaBloquee, setIaBloquee] = useState(false);
  const [events, setEvents] = useState([]);
  const [apercu, setApercu] = useState(null);
  const [combatFx, setCombatFx] = useState({});
  const [sortFx, setSortFx] = useState({});
  const [annonceSort, setAnnonceSort] = useState(null);
  const [soinsVoies, setSoinsVoies] = useState([]);
  const [fantomes, setFantomes] = useState([]);
  const sequenceFx = useRef(0);
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
  const actif = duel.tour;
  const defenseur = autre(actif);
  const fini = Boolean(duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul);
  const camp = duel[actif];
  const defausse = duel.defausseEnAttente?.restant ?? 0;
  const recherche = duel.mobaRechercheEnAttente;
  const mainSide = defausse ? duel.defausseEnAttente.cote : (['blocage', 'fin', 'reponse-arrivee'].includes(etape) ? defenseur : actif);
  const campMain = duel[mainSide];
  const getEntity = (side, id) => duel[side].creatures.find((e) => e.id === id);
  const scores = Object.fromEntries(['joueur', 'sorcier'].map((side) => [side, duel.moba.lanes.filter((lane) => lane.conqueredBy === side).length]));
  const deckPour = (side) => decksPersonnalises[side] ?? MOBA_DECKS.find((deck) => deck.id === (side === 'joueur' ? deckJoueur : deckSorcier));
  const terrainPour = (side) => `url("${import.meta.env.BASE_URL}${plateauDeDeck(deckPour(side)).plateau.fichier}")`;
  const choisirDeck = (side, id) => {
    (side === 'joueur' ? setDeckJoueur : setDeckSorcier)(id);
    setDecksPersonnalises((decks) => ({ ...decks, [side]: null }));
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
    cartes: duel.moba.lanes.flatMap((lane) => ['joueur', 'sorcier'].flatMap((side) =>
      lane.slots[side].flatMap((id, slot) => {
        const entity = id && getEntity(side, id);
        return entity ? [{ entityId: id, cardId: entity.carteId, name: entity.name, laneId: lane.id, side, slot }] : [];
      }))),
  });
  const montrerDestructions = (avant, impactCombat = false) => {
    const evenements = rpgDestructionsDepuis(duel, avant.position);
    const disparues = evenements.flatMap((event) => {
      const carteAvant = avant.cartes.find((item) => item.entityId === event.entityId);
      if (!carteAvant || duel[carteAvant.side].creatures.some((item) => item.id === event.entityId)) return [];
      return [{ ...carteAvant, pleinEmplacement: true, impactCombat, bruleeParBraise: event.sourceElements.includes('braise'), effectId: `${++sequenceFx.current}-${event.entityId}` }];
    });
    if (!disparues.length) return;
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
  const passerFinTour = () => {
    const avantDestructions = instantaneDestructions();
    const result = rpgMobaPasserFinDeTour(duel, defenseur);
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions);
    setCarte(null); setEtape('tour'); setEvents([]);
  };
  const terminerMagie = (result) => {
    if (!afficherResultat(result)) return false;
    setCarte(null);
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.healingEvents?.length) setSoinsVoies(result.healingEvents);
    if (etape === 'blocage') {
      const survivants = duel.combatDeclare?.attaquants ?? [];
      setAttaquants(survivants);
      setCiblesRapides(duel.combatDeclare?.ciblesAttaque ?? {});
      setCibleRapideEnCours(null);
      setCible((id) => survivants.includes(id) && !duel.combatDeclare?.ciblesAttaque?.[id] ? id : survivants.find((survivant) => !duel.combatDeclare?.ciblesAttaque?.[survivant]) ?? null);
      setBlocages((old) => Object.fromEntries(Object.entries(old)
        .filter(([id]) => survivants.includes(id))
        .map(([id, ids]) => [id, ids.filter((blocker) => duel[defenseur].creatures.some((entity) => entity.id === blocker))])));
      if (result.combatTermine) setEtape('tour');
    } else { setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); }
    return true;
  };
  // Capture the public target and surviving creatures before the mutable engine
  // resolves the spell: the chosen creature may disappear during resolution.
  const lancerMagie = (id, cibleId = null, laneId = null, prixLaneId = null) => {
    const caster = mainSide;
    const carteMagie = cardById(id);
    const entityCible = cibleId && cibleId !== 'sorcier'
      ? ['joueur', 'sorcier'].flatMap((side) => duel[side].creatures).find((entity) => entity.id === cibleId)
      : null;
    const cibleAnnonce = entityCible
      ? { nom: entityCible.name, illustrationId: entityCible.carteId }
      : laneId
        ? { nom: `${voies[laneId]} · ${noms[MOBA_MAGIES_SOINS.includes(id) || (MOBA_MAGIES_PRIX.includes(id) && !MOBA_MAGIES_TRANSFERT.includes(id)) ? caster : autre(caster)]}` }
        : id === 'rapport-du-greffier' ? { nom: `Pioche de ${noms[caster]}` }
          : id === 'les-feuillets' ? { nom: `Pioche de ${noms[autre(caster)]}` }
            : { nom: 'Champ de bataille' };
    const avant = new Map(['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.map((entity) => [entity.id, entity.pv])));
    const piocheAvant = duel[caster].deck.length;
    const avantDestructions = instantaneDestructions();
    const result = rpgMobaLancerMagie(duel, caster, id, cibleId, laneId, prixLaneId);
    if (!terminerMagie(result)) return;
    setPrixLane(null);
    montrerDestructions(avantDestructions);
    const token = ++sequenceFx.current;
    const fx = {};
    for (const side of ['joueur', 'sorcier']) for (const entity of duel[side].creatures) {
      if (!avant.has(entity.id)) continue;
      const difference = entity.pv - avant.get(entity.id);
      if (difference < 0) fx[entity.id] = { action: { type: id.includes('foudre') || id === 'eclair-du-marteau' ? 'foudre' : 'hit' } };
      else if (difference > 0) fx[entity.id] = { soin: { montant: difference, token } };
    }
    if (result.bouclierBloque && result.bouclierEntityId) {
      fx[result.bouclierEntityId] = { ...fx[result.bouclierEntityId], bouclier: { montant: result.bouclierMontant, token } };
    }
    setSortFx(fx);
    setEvents(result.damageEvents ?? []);
    setSoinsVoies(result.healingEvents ?? []);
    setAnnonceSort({ carteId: id, cible: cibleAnnonce, camp: caster, token });
    const son = sonSortAuLancement(carteMagie);
    if (son) onPlaySfx?.(son);
    if (result.renvoiMain) onPlaySfx?.('creature_return');
    if (result.bouclierBloque) onPlaySfx?.('weapon_break');
    if (duel[caster].deck.length < piocheAvant) onPlaySfx?.('card_draw');
    if (result.healingEvents?.some((event) => event.healing > 0) || Object.values(fx).some((item) => item.soin)) onPlaySfx?.('soin_vie');
  };
  const jouerCarte = (id, index) => {
    if (fini) return;
    if (defausse) {
      const finDeTour = duel.defausseEnAttente?.motif === 'fin-de-tour';
      const result = rpgMobaDefausser(duel, mainSide, index);
      if (afficherResultat(result) && !result.restant && finDeTour) finTour();
      return;
    }
    if (!['tour', 'blocage', 'fin', 'reponse-arrivee'].includes(etape) || campMain.manaChoixEnAttente) return;
    if (['blocage', 'fin', 'reponse-arrivee'].includes(etape) && !cardById(id)?.instant) return;
    if (MOBA_MAGIES_ESSAI.includes(id) || MOBA_MAGIES_IMMEDIATES.includes(id)) {
      lancerMagie(id);
    } else { setCarte(carte === id ? null : id); setPrixLane(null); setErreur(''); }
  };
  const poser = (lane, slot) => {
    if (!carte) return;
    const avantDestructions = instantaneDestructions();
    const result = rpgMobaJouerCreature(duel, actif, carte, lane, slot);
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions);
    setCarte(null);
    if (result.arriveeEnAttente) setEtape('arrivee');
  };
  const choisirCibleArrivee = (id) => {
    const avantDestructions = instantaneDestructions();
    const result = rpgMobaResoudreArrivee(duel, actif, id);
    if (!afficherResultat(result)) return;
    montrerDestructions(avantDestructions);
    if (result.damageEvents?.length) setEvents(result.damageEvents);
    if (result.effetEnAttente) setEtape('reponse-arrivee');
    else setEtape('tour');
  };
  const passerEffetCreature = () => {
    const avantDestructions = instantaneDestructions();
    if (!afficherResultat(rpgMobaPasserEffetCreature(duel, defenseur))) return;
    montrerDestructions(avantDestructions);
    setCarte(null); setEtape('tour');
  };
  const lancerSurCreature = (id) => {
    if (!carte || !MOBA_MAGIES_CIBLEES.includes(carte)) return;
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
    lancerMagie(carte, null, laneId, prixLane);
  };
  const payerDepuisVoie = (laneId) => {
    if (!carte || !MOBA_MAGIES_PRIX.includes(carte)) return;
    if (MOBA_MAGIES_TRANSFERT.includes(carte)) { setPrixLane(laneId); return; }
    lancerMagie(carte, null, laneId);
  };
  const choisirAttaquant = (id) => {
    if (etape !== 'tour' || carte || fini || defausse) return;
    if (attaquants.includes(id)) {
      setAttaquants((ids) => ids.filter((v) => v !== id));
      setCiblesRapides((old) => { const next = { ...old }; delete next[id]; return next; });
      if (cibleRapideEnCours === id) setCibleRapideEnCours(null);
    } else {
      if (cibleRapideEnCours) return;
      const choix = rpgMobaCiblesAttaque(duel, actif, id);
      if (choix.obligatoires && !choix.cibles.length) { setErreur('Aucune cible légale dans cette voie.'); return; }
      setAttaquants((ids) => [...ids, id]);
      if (choix.obligatoires) setCibleRapideEnCours(id);
    }
    setErreur('');
  };
  const choisirCibleRapide = (id) => {
    if (!cibleRapideEnCours || !rpgMobaCiblesAttaque(duel, actif, cibleRapideEnCours).cibles.includes(id)) return;
    setCiblesRapides((old) => ({ ...old, [cibleRapideEnCours]: id }));
    setCibleRapideEnCours(null); setErreur('');
  };
  const assigner = (id, lane) => {
    if (etape !== 'blocage' || !cible || duel.combatDeclare?.ciblesAttaque?.[cible] || !lane.slots[actif].includes(cible)) return;
    const blocker = getEntity(defenseur, id);
    const attacker = getEntity(actif, cible);
    if (!rpgPeutBloquerAttaquant(blocker, attacker)) return;
    setBlocages((old) => {
      const next = Object.fromEntries(Object.entries(old).map(([key, ids]) => [key, ids.filter((value) => value !== id)]));
      next[cible] = (old[cible] ?? []).includes(id) ? next[cible] : [...(next[cible] ?? []), id];
      return next;
    });
    setErreur('');
  };
  const resoudre = (affectations = blocages) => {
    const avant = new Map(['joueur', 'sorcier'].flatMap((side) => duel[side].creatures.map((entity) => [entity.id, entity.pv])));
    const avantDestructions = instantaneDestructions();
    const res = rpgMobaLancerAttaque(duel, actif, attaquants, affectations, { declaree: true });
    if (!afficherResultat(res)) return;
    montrerDestructions(avantDestructions, true);
    const fx = {};
    for (const side of ['joueur', 'sorcier']) for (const entity of duel[side].creatures) {
      if (entity.pv < (avant.get(entity.id) ?? entity.pv)) fx[entity.id] = { type: 'hit' };
      else if (attaquants.includes(entity.id)) fx[entity.id] = { type: 'attack' };
    }
    setCombatFx(fx);
    for (const son of rpgSonsResolutionCombat(res.resume)) onPlaySfx?.(son.nom, son.delai);
    if (res.damageEvents?.some((event) => event.damage > 0)) onPlaySfx?.('degats_sorcier');
    setSoinsVoies(res.healingEvents ?? []);
    if (res.healingEvents?.some((event) => event.healing > 0)) onPlaySfx?.('soin_vie');
    setEvents(res.damageEvents ?? []);
    setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); setBlocages({}); setCible(null); setEtape('tour'); setCarte(null);
  };
  const declarer = () => {
    if (!afficherResultat(rpgMobaDeclarerAttaque(duel, actif, attaquants, ciblesRapides))) return;
    onPlaySfx?.('attackers_confirm');
    setCarte(null); setEtape('blocage'); setCible(attaquants.find((id) => !ciblesRapides[id]) ?? null);
  };
  const nouvellePartie = () => { setDuel(initialiser()); setCarte(null); setAttaquants([]); setCiblesRapides({}); setCibleRapideEnCours(null); setBlocages({}); setCible(null); setEtape(initialiser === nouveau ? 'choix' : 'mulligan'); setMulliganIndices([]); setErreur(''); setIaBloquee(false); setPrixLane(null); setEvents([]); setSoinsVoies([]); setAnnonceSort(null); setSortFx({}); setCombatFx({}); setFantomes([]); };
  const iaAgit = !fini && (recherche ? recherche.cote === 'sorcier' : defausse ? mainSide === 'sorcier' : ((['tour', 'arrivee'].includes(etape) && actif === 'sorcier')
    || (['blocage', 'fin', 'reponse-arrivee'].includes(etape) && defenseur === 'sorcier')));
  useEffect(() => {
    if (!iaAgit || iaBloquee) return undefined;
    const timer = window.setTimeout(() => {
      if (recherche) {
        const choix = rpgMobaChoisirRechercheIA(duel, 'sorcier');
        if (choix) afficherResultat(rpgMobaResoudreRecherche(duel, 'sorcier', choix));
        else { setErreur("L’IA ne trouve pas de carte dans son deck."); setIaBloquee(true); }
      } else if (defausse) {
        const finDeTour = duel.defausseEnAttente?.motif === 'fin-de-tour';
        const result = rpgMobaDefausser(duel, 'sorcier', choisirDefausseIA(duel, 'sorcier'));
        if (afficherResultat(result) && !result.restant && finDeTour) finTour();
      } else if (etape === 'tour') {
        if (duel.sorcier.manaChoixEnAttente) {
          afficherResultat(rpgChoisirCouleurMana(duel, 'sorcier', choisirCouleurManaIA(duel, 'sorcier')));
        } else {
          const creature = rpgMobaChoisirCreatureIA(duel);
          const magie = rpgMobaChoisirMagieIA(duel);
          if (magie && (!creature || magie.score >= 35)) lancerMagie(magie.id, magie.cible, magie.lane, magie.prixLane);
          else if (creature) {
            const avant = instantaneDestructions();
            const result = rpgMobaJouerCreature(duel, 'sorcier', creature.id, creature.lane, creature.slot);
            if (afficherResultat(result)) { montrerDestructions(avant); if (result.arriveeEnAttente) setEtape('arrivee'); }
          } else {
            const ids = duel.attaqueJouee !== 'sorcier' ? rpgMobaChoisirAttaquantsIA(duel) : [];
            if (ids.length) {
              const ciblesIA = rpgMobaChoisirCiblesAttaqueIA(duel, 'sorcier', ids);
              const result = rpgMobaDeclarerAttaque(duel, 'sorcier', ids, ciblesIA);
              if (afficherResultat(result)) { setAttaquants(ids); setCiblesRapides(ciblesIA); setCible(ids.find((id) => !ciblesIA[id]) ?? null); setEtape('blocage'); onPlaySfx?.('attackers_confirm'); }
            } else finTour();
          }
        }
      } else if (etape === 'arrivee') {
        const cibleIA = rpgMobaChoisirArriveeIA(duel);
        if (cibleIA) choisirCibleArrivee(cibleIA);
        else { setErreur("L’IA ne trouve pas de cible pour sa capacité."); setIaBloquee(true); }
      } else {
        const magie = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
        if (magie) lancerMagie(magie.id, magie.cible, magie.lane, magie.prixLane);
        else if (etape === 'blocage') resoudre(rpgMobaChoisirBlocagesIA(duel, actif, attaquants));
        else if (etape === 'fin') passerFinTour();
        else passerEffetCreature();
      }
    }, 450);
    return () => window.clearTimeout(timer);
  // Mutations are made by the adapter; version is incremented after each action.
  }, [duel, version, etape, iaAgit, iaBloquee]); // eslint-disable-line react-hooks/exhaustive-deps
  const instruction = iaAgit ? 'L’IA réfléchit et joue son tour…' : cibleRapideEnCours ? 'Choisissez une créature adverse illuminée dans la même voie pour l’attaque ciblée.' : etape === 'arrivee' ? (duel.arriveeEnAttente?.carteId === 'lionne-du-midi-ardent'
    ? 'Choisissez une créature adverse à frapper avec la Lionne.'
    : duel.arriveeEnAttente?.carteId === 'maitre-du-marteau'
      ? 'Choisissez une créature adverse ou la voie adverse du Maître pour ses dégâts d’arrivée.'
      : MOBA_ARRIVEES_NEUTRES.includes(duel.arriveeEnAttente?.carteId)
        ? 'Choisissez une créature admissible, alliée ou adverse, à exiler.'
      : duel.arriveeEnAttente?.carteId === 'kraken'
        ? 'Choisissez un navire adverse à détruire.'
      : MOBA_ARRIVEES_HOSTILES.includes(duel.arriveeEnAttente?.carteId)
        ? 'Choisissez une créature adverse admissible pour la capacité d’arrivée.'
        : duel.arriveeEnAttente?.carteId === 'volva-soigneuse'
          ? 'Choisissez une créature alliée à soigner, y compris la Völva.'
          : duel.arriveeEnAttente?.carteId === 'faiseur-de-passage'
            ? 'Choisissez une autre créature alliée pour lui donner Infiltration.'
            : duel.arriveeEnAttente?.carteId === 'veilleuse-des-citernes'
        ? 'Choisissez une autre créature alliée pour recevoir son bouclier.'
        : 'Choisissez une créature alliée, y compris le Guerrier lui-même, pour recevoir son bouclier.')
    : defausse ? `Choisissez ${defausse} carte${defausse > 1 ? 's' : ''} à défausser${duel.defausseEnAttente?.motif === 'fin-de-tour' ? ' pour terminer votre tour' : ''}.`
    : carte && MOBA_MAGIES_TRANSFERT.includes(carte) && MOBA_MAGIES_PRIX.includes(carte) && !prixLane ? `Choisissez une voie alliée ayant plus de ${cardById(carte).prixPv} PV pour payer le prix.`
    : carte && MOBA_MAGIES_TRANSFERT.includes(carte) ? 'Choisissez une voie active : l’adversaire y perd des PV et votre côté y récupère des PV.'
    : carte && MOBA_MAGIES_PRIX.includes(carte) ? `Choisissez une voie alliée ayant plus de ${cardById(carte).prixPv} PV pour payer le prix.`
    : carte && MOBA_MAGIES_SOINS.includes(carte) ? carte === 'festin-des-vaillants' ? 'Choisissez votre voie active à soigner ; vos créatures seront également soignées.' : 'Choisissez votre voie active à soigner.'
      : carte && MOBA_MAGIES_VOIES.includes(carte) ? 'Choisissez une créature adverse ou une voie adverse active.'
        : carte && MOBA_MAGIES_ALLIEES.includes(carte) ? 'Choisissez une créature alliée illuminée pour lancer votre magie.'
        : carte && MOBA_MAGIES_NEUTRES.includes(carte) ? 'Choisissez une créature illuminée respectant le coût indiqué.'
        : carte && MOBA_MAGIES_CIBLEES.includes(carte) ? 'Choisissez une créature adverse illuminée pour lancer votre magie.'
          : etape === 'reponse-arrivee' ? 'Jouez une magie rapide si vous le souhaitez, puis passez pour résoudre la capacité.'
          : etape === 'fin' ? 'Jouez une magie rapide si vous le souhaitez, puis passez pour commencer votre tour.'
            : etape === 'blocage' ? 'Défenseur : jouez une magie rapide ou choisissez un attaquant, puis ses bloqueurs dans la même voie.'
            : carte ? 'Choisissez une case illuminée pour invoquer votre créature.'
              : 'Jouez une carte, ou sélectionnez vos créatures prêtes pour attaquer.';
  return <main className="moba" aria-label="MOBA, partie contre l’IA" style={{ '--moba-table': `url("${import.meta.env.BASE_URL}card-table.jpg")` }}>
    {rendu && <EffetsSprite />}
    <div inert={Boolean(etape === 'mulligan' || etape === 'choix' || fini || apercu || (recherche?.cote === 'joueur'))}>
    <header className="moba__header">
      <div className="moba__brand"><span>LE SABLIER <i>✦</i> DUEL SOLO</span><h1>MOBA <small>Les trois voies</small></h1></div>
      <div className="moba__header-meta"><span className="moba__trial">ESSAI · DUEL SOLO</span>{onToggleSound && <button type="button" className="moba__back" aria-pressed={sonActif} onClick={onToggleSound}>{sonActif ? "♫ Son activé" : "♪ Son coupé"}</button>}<button type="button" className="moba__back" onClick={onQuitter}>← <span>Quitter la partie</span></button></div>
    </header>
    <p className="moba__notice">Affrontez l’IA · Conquérez 2 voies pour gagner · Decks de 30 cartes adaptés au MOBA · Certaines capacités et fenêtres de réponse restent indisponibles.</p>
    <div className="moba__scoreboard" aria-label="Score de conquête">
      {['joueur', 'sorcier'].map((side) => <div key={side} className={`moba__player${actif === side && etape === 'tour' ? ' is-active' : ''}`}>
        <span className="moba__player-emblem" aria-hidden="true">{side === 'joueur' ? 'Ⅰ' : 'Ⅱ'}</span>
        <span className="moba__player-name"><small>{side === actif && etape === 'tour' ? 'TOUR ACTIF' : 'DUELLISTE'}</small><strong>{noms[side]}</strong></span>
        <span className="moba__player-score" aria-label={`${scores[side]} voies conquises sur 2`}><Marque active={scores[side] > 0} /><Marque active={scores[side] > 1} /><small>{scores[side]} / 2</small></span>
      </div>)}
      <div className="moba__score-center"><span>◆</span><small>CONQUÊTE</small></div>
    </div>
    <div className="moba__ai-status" role="status">{iaBloquee ? <><span>{erreur} </span><button type="button" onClick={() => { setErreur(''); setIaBloquee(false); }}>Réessayer</button></> : iaAgit ? 'L’IA réfléchit…' : ''}</div>
    <div inert={iaAgit}>
    <div className="moba__status"><strong>{noms[actif]} <span>·</span> {etape === 'blocage' ? `défense de ${noms[defenseur]}` : ['fin', 'reponse-arrivee'].includes(etape) ? `réponse de ${noms[defenseur]}` : 'phase principale'}</strong><span className="moba__mana">{campMain.couleurs.map((c) => <span className={`moba__mana-${c}`} key={c}><i aria-hidden="true">◆</i> {c} <b>{campMain.mana[c] ?? 0}</b></span>)}</span></div>
    {camp.manaChoixEnAttente && !defausse && !fini && etape === 'tour' && <div className="moba__choice"><strong>Choisissez votre nouveau mana</strong>{camp.couleurs.map((color) => <button type="button" key={color} onClick={() => afficherResultat(rpgChoisirCouleurMana(duel, actif, color))}>◆ {color}</button>)}</div>}
    <div className="moba__directive" aria-live="polite"><span aria-hidden="true">✧</span><p className="moba__hint">{instruction}</p>{erreur && <p className="moba__error" role="alert">{erreur}</p>}</div>
    <div className="moba__battlefield" style={{ '--moba-terrain-haut': terrainPour('sorcier'), '--moba-terrain-bas': terrainPour('joueur') }}><div className="moba__lanes">
      {duel.moba.lanes.map((lane) => <section key={lane.id} className={`moba__lane${lane.active ? '' : ' is-conquered'}`} aria-label={voies[lane.id]}>
        <div className="moba__lanehead"><span className="moba__lane-number">{glyphes[lane.id]}</span><strong>{voies[lane.id]}</strong><span className="moba__lane-state">{lane.active ? 'EN JEU' : `CONQUISE · ${noms[lane.conqueredBy]}`}</span></div>
        {['sorcier', 'joueur'].map((side) => <div className="moba__side" key={side}>
          <div className="moba__health"><span>{noms[side]}</span><div className="moba__health-bar" role="progressbar" aria-label={`${voies[lane.id]}, ${noms[side]}`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={lane.hp[side]}><i style={{ width: `${lane.hp[side] * 10}%` }} /></div><strong key={`${lane.id}-${side}-${lane.hp[side]}`} className={events.some((e) => e.laneId === lane.id && e.targetSide === side && e.damage > 0) ? 'is-damaged' : soinsVoies.some((e) => e.laneId === lane.id && e.side === side && e.healing > 0) ? 'is-healed' : ''}>{lane.hp[side]}<small> / 10</small></strong></div>
          {['tour', 'blocage', 'fin', 'reponse-arrivee'].includes(etape) && side === autre(mainSide) && lane.active && carte && MOBA_MAGIES_VOIES.includes(carte) && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Cibler ${voies[lane.id]} de ${noms[side]}`} onClick={() => lancerSurVoie(lane.id)}>✦ Cibler cette voie</button>}
          {['tour', 'blocage', 'fin', 'reponse-arrivee'].includes(etape) && side === mainSide && lane.active && carte && MOBA_MAGIES_PRIX.includes(carte) && (!MOBA_MAGIES_TRANSFERT.includes(carte) || !prixLane) && lane.hp[side] > cardById(carte).prixPv && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Payer ${cardById(carte).prixPv} PV de ${voies[lane.id]} de ${noms[side]}`} onClick={() => payerDepuisVoie(lane.id)}>✦ Payer {cardById(carte).prixPv} PV</button>}
          {['tour', 'blocage', 'fin', 'reponse-arrivee'].includes(etape) && side === autre(mainSide) && lane.active && carte && MOBA_MAGIES_TRANSFERT.includes(carte) && (!MOBA_MAGIES_PRIX.includes(carte) || prixLane) && !defausse && !fini && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Transférer les PV de ${voies[lane.id]}`} onClick={() => transfererVoie(lane.id)}>✦ Transférer les PV de cette voie</button>}
          {etape === 'arrivee' && duel.arriveeEnAttente?.carteId === 'maitre-du-marteau' && side === defenseur && lane.active && getEntity(actif, duel.arriveeEnAttente.entiteId)?.mobaLane === lane.id && <button type="button" className="moba__lane-target" aria-label={`Frapper ${voies[lane.id]} de ${noms[side]} avec le Maître`} onClick={() => choisirCibleArrivee('sorcier')}>✦ Frapper cette voie</button>}
          {etape === 'tour' && side === actif && lane.active && carte && MOBA_MAGIES_SOINS.includes(carte) && !defausse && !fini && rpgMobaPeutPayer(duel, actif, cardById(carte)) && <button type="button" className="moba__lane-target" aria-label={`Soigner ${voies[lane.id]} de ${noms[side]}`} onClick={() => soignerVoie(lane.id)}>✦ Soigner cette voie</button>}
          <div className="moba__slots">{lane.slots[side].map((id, i) => {
            const entity = id && getEntity(side, id);
            const isAttacker = id && attaquants.includes(id);
            const isBlocked = id && Object.values(blocages).some((ids) => ids.includes(id));
            const isRapidTarget = id && etape === 'blocage' && Object.values(duel.combatDeclare?.ciblesAttaque ?? {}).includes(id);
            const mayAttack = etape === 'tour' && (!cibleRapideEnCours || cibleRapideEnCours === id) && !carte && !defausse && side === actif && entity && rpgPeutAttaquer(entity) && duel.attaqueJouee !== actif && !camp.manaChoixEnAttente && !fini;
            const mayTarget = etape === 'blocage' && !defausse && !carte && side === actif && isAttacker && !duel.combatDeclare?.ciblesAttaque?.[id];
            const mayTargetRapide = etape === 'tour' && side === defenseur && entity && cibleRapideEnCours && rpgMobaCiblesAttaque(duel, actif, cibleRapideEnCours).cibles.includes(id);
            const chosenAttacker = cible && getEntity(actif, cible);
            const mayBlock = etape === 'blocage' && !defausse && !carte && side === defenseur && entity && chosenAttacker && !duel.combatDeclare?.ciblesAttaque?.[cible] && lane.slots[actif].includes(cible) && !entity.attaquee && !(entity.gelToursRestants > 0) && !(entity.empecheBlocageToursRestants > 0) && rpgPeutBloquerAttaquant(entity, chosenAttacker);
            const carteCiblee = carte && MOBA_MAGIES_CIBLEES.includes(carte);
            const carteSoin = carte && MOBA_MAGIES_SOINS.includes(carte);
            const cartePrix = carte && MOBA_MAGIES_PRIX.includes(carte);
            const carteTransfert = carte && MOBA_MAGIES_TRANSFERT.includes(carte);
            const mayPlace = etape === 'tour' && side === actif && !id && lane.active && carte && !carteCiblee && !carteSoin && !cartePrix && !carteTransfert && !defausse && !fini && rpgMobaPeutPayer(duel, actif, cardById(carte));
            const campCibleMagie = MOBA_MAGIES_ALLIEES.includes(carte) ? mainSide : autre(mainSide);
            const maySpellTarget = ['tour', 'blocage', 'fin', 'reponse-arrivee'].includes(etape) && (side === campCibleMagie || MOBA_MAGIES_NEUTRES.includes(carte)) && lane.active && entity && carteCiblee && !defausse && !fini
              && rpgMobaPeutPayer(duel, mainSide, cardById(carte)) && cibleRespecteCoutMax(cardById(carte), entity) && !rpgEstProtegee(entity, cardColors(cardById(carte)))
              && !rpgEstProtegeeDesSorts(entity, cardColors(cardById(carte)));
            const arriveeOffensive = MOBA_ARRIVEES_HOSTILES.includes(duel.arriveeEnAttente?.carteId);
            const mayArrivalTarget = etape === 'arrivee' && (MOBA_ARRIVEES_NEUTRES.includes(duel.arriveeEnAttente?.carteId) || side === (arriveeOffensive ? defenseur : actif)) && lane.active && entity && !fini
              && (entity.id !== duel.arriveeEnAttente?.entiteId || cardById(duel.arriveeEnAttente?.carteId)?.arrivee?.cibleSoi)
              && cibleRespecteCoutMax(cardById(duel.arriveeEnAttente?.carteId), entity)
              && (duel.arriveeEnAttente?.carteId !== 'kraken' || cardHasPrintedType(entity.carteId, 'Navire'))
              && !rpgEstProtegee(entity, cardColors(cardById(duel.arriveeEnAttente?.carteId)));
            const etats = etatsCreature(entity);
            const label = entity ? `${entity.name}, attaque ${entity.atk}, défense ${entity.pv} sur ${entity.pvMax}${etats.length ? `, ${etats.join(', ')}` : ''}${mayTargetRapide || isRapidTarget ? ', cible de l’attaque ciblée' : ''}${maySpellTarget ? ', cible de magie' : ''}${mayArrivalTarget ? (arriveeOffensive || MOBA_ARRIVEES_NEUTRES.includes(duel.arriveeEnAttente?.carteId) ? ', cible de la capacité' : duel.arriveeEnAttente?.carteId === 'volva-soigneuse' ? ', cible de soin' : duel.arriveeEnAttente?.carteId === 'faiseur-de-passage' ? ', cible d’infiltration' : ', cible de bouclier') : ''}` : `${voies[lane.id]}, ${noms[side]}, emplacement ${i + 1}${mayPlace ? ', invoquer' : ''}`;
            const fantomesCase = rendu?.FantomeCarteDetruite ? fantomes.filter((item) => item.laneId === lane.id && item.side === side && item.slot === i) : [];
            const adieux = fantomesCase.map((effet) => <rendu.FantomeCarteDetruite key={effet.effectId} effet={effet} onTermine={(effectId) => setFantomes((old) => old.filter((item) => item.effectId !== effectId))} />);
            const action = () => { if (mayPlace) poser(lane.id, i); else if (mayArrivalTarget) choisirCibleArrivee(id); else if (mayTargetRapide) choisirCibleRapide(id); else if (maySpellTarget) lancerSurCreature(id); else if (mayTarget) setCible(id); else if (mayBlock) assigner(id, lane); else if (mayAttack) choisirAttaquant(id); };
            if (entity && rendu?.TableCard) {
              const TableCard = rendu.TableCard;
              return <div className="moba__real-slot" key={i}>
                <TableCard entite={entity} cote={side === 'joueur' ? 'joueur' : 'ennemi'} playerTurn={side === actif && etape === 'tour'} actionFx={sortFx[entity.id]?.action ?? combatFx[entity.id] ?? null} soin={sortFx[entity.id]?.soin ?? null} bouclierFx={sortFx[entity.id]?.bouclier ?? null} selected={Boolean(isAttacker)} blocking={Boolean(isBlocked)} declaredAttacker={etape === 'blocage' && Boolean(isAttacker)} canTarget={Boolean(maySpellTarget || mayArrivalTarget || mayBlock || mayTarget || mayTargetRapide)} onClick={action} moba={{ className: `moba__slot has-creature${isAttacker ? ' is-attacking' : ''}${isBlocked ? ' is-blocking' : ''}${cible === id || isRapidTarget ? ' is-target' : ''}`, disabled: !(mayAttack || mayTarget || mayBlock || maySpellTarget || mayArrivalTarget || mayTargetRapide), ariaLabel: label, title: cardById(entity.carteId)?.text }} />
                {adieux.length > 0 && <div className="moba__ghost-zone" aria-hidden="true">{adieux}</div>}
                <button type="button" className="moba__inspect" aria-label={`Voir la fiche de ${entity.name}`} onClick={() => setApercu({ carteId: entity.carteId, entity })}>ⓘ</button>
              </div>;
            }
            const slot = <button type="button" aria-label={label} title={entity ? cardById(entity.carteId)?.text || entity.name : undefined} className={`moba__slot${entity ? ' has-creature' : ' is-empty'}${isAttacker ? ' is-attacking' : ''}${isBlocked ? ' is-blocking' : ''}${(cible === id || isRapidTarget) && id ? ' is-target' : ''}`} disabled={!(mayPlace || mayAttack || mayTarget || mayBlock || maySpellTarget || mayArrivalTarget || mayTargetRapide)} onClick={() => { if (mayPlace) poser(lane.id, i); else if (mayArrivalTarget) choisirCibleArrivee(id); else if (mayTargetRapide) choisirCibleRapide(id); else if (maySpellTarget) lancerSurCreature(id); else if (mayTarget) setCible(id); else if (mayBlock) assigner(id, lane); else if (mayAttack) choisirAttaquant(id); }}>
              {entity ? <><img src={cardArt(entity.carteId)} alt="" /><span className="moba__slot-label"><b>{entity.name}</b><small><em>⚔ {entity.atk}</em><em>◆ {entity.pv}/{entity.pvMax}</em></small>{etats.length > 0 && <span className="moba__slot-states">{etats.join(' · ')}</span>}</span>{isAttacker && <span className="moba__slot-tag">ATTAQUE</span>}{isBlocked && <span className="moba__slot-tag">BLOQUE</span>}{isRapidTarget && <span className="moba__slot-tag">CIBLÉE</span>}</> : <span className="moba__empty-label"><i aria-hidden="true">{mayPlace ? '+' : '◇'}</i>{lane.active ? (mayPlace ? 'INVOQUER' : 'EMPLACEMENT') : 'VOIE FERMÉE'}</span>}
            </button>;
            return adieux.length ? <div className="moba__ghost-slot" key={i}>{slot}<div className="moba__ghost-zone moba__ghost-zone--empty" aria-hidden="true">{adieux}</div></div> : <div className="moba__plain-slot" key={i}>{slot}</div>;
          })}</div>
        </div>)}
      </section>)}
    </div></div>
    {annonceSort && rendu?.SpellAnnouncement && <div className="rpg-spell-played-stack moba__spell-stack" key={annonceSort.token}><rendu.SpellAnnouncement annonce={annonceSort} camp={annonceSort.camp} nomLanceur={noms[annonceSort.camp]} /></div>}
    <div className="moba__controls"><div className="moba__phase"><span>✦</span><div><small>VOTRE STRATÉGIE</small><strong>{etape === 'arrivee' ? 'Choix de la cible' : etape === 'reponse-arrivee' ? 'Réponse à la capacité' : etape === 'fin' ? 'Réponse de fin de tour' : etape === 'blocage' ? 'Défense' : defausse ? 'Défausse' : duel.attaqueJouee === actif ? 'Après le combat' : 'Phase principale'}</strong></div></div><div className="moba__buttons">
      {etape === 'tour' ? <><button type="button" disabled={!attaquants.length || !!cibleRapideEnCours || fini || !!defausse || camp.manaChoixEnAttente || duel.attaqueJouee === actif} onClick={declarer}>Déclarer {attaquants.length || ''} attaque(s)</button><button type="button" className="moba__primary" disabled={fini || !!cibleRapideEnCours || !!defausse || camp.manaChoixEnAttente} onClick={finTour}>Fin du tour <span>→</span></button></> : etape === 'blocage' ? <button type="button" className="moba__primary" disabled={!!defausse} onClick={() => resoudre()}>Résoudre le combat →</button> : etape === 'fin' ? <button type="button" className="moba__primary" disabled={!!defausse} onClick={passerFinTour}>Passer et commencer mon tour →</button> : etape === 'reponse-arrivee' ? <button type="button" className="moba__primary" disabled={!!defausse} onClick={passerEffetCreature}>Passer et résoudre l’effet →</button> : null}
    </div></div>
    {mainSide === 'joueur' && ['tour', 'arrivee', 'blocage', 'fin', 'reponse-arrivee'].includes(etape) && <section className="moba__hand" aria-label="Votre main"><div className="moba__handhead"><div><span>VOTRE RÉSERVE</span><h2>Votre main</h2></div><span className="moba__deck-count">PIOCHE <b>{campMain.deck.length}</b></span></div><div className="moba__hand-cards">{campMain.main.map((id, index) => {
      const card = cardById(id);
      const disabled = fini || (!defausse && (!!cibleRapideEnCours || etape === 'arrivee' || campMain.manaChoixEnAttente || (['blocage', 'fin', 'reponse-arrivee'].includes(etape) && !card.instant) || !rpgMobaPeutPayer(duel, mainSide, card)));
      const selected = carte === id && !defausse;
      if (rendu?.ManaCost && rendu?.CardElementBadge && rendu?.CardStatIcon) {
        const { ManaCost, CardElementBadge, CardStatIcon } = rendu;
        const creature = card.kind !== 'magie';
        return <div className="moba__hand-item" key={`${id}-${index}`}>
          <button type="button" className={`moba__card moba__real-hand rpg-hand__card rpg-hand__card--img rpg-hand__card--elem-${card.element} ${cardFrameClass(card)} ${cardMotifClass(card)}${selected ? ' is-selected is-targeting' : ''}${disabled ? ' is-unplayable' : ' is-playable'}`} style={{ '--rpg-frame-color': cardFrameColor(card) }} data-card-id={id} disabled={disabled} aria-label={`${card.name}, coût ${card.cost} mana, ${card.text || 'aucune capacité'}`} aria-pressed={selected} title={card.text} onClick={() => jouerCarte(id, index)}>
            <img className="rpg-hand__img" src={cardArt(id)} alt="" aria-hidden="true" />
            <CardElementBadge carte={card} /><span className="rpg-hand__title"><ManaCost carte={card} showElement={false} /></span>
            <IconesCarte carte={card} className="rpg-card-icones--colonne rpg-card-icones--main" /><SortSceau carte={card} className="rpg-hand__sceau rpg-hand__sort" />
            {creature && <span className="rpg-hand__stats" aria-hidden="true"><span className="rpg-hand__stat rpg-hand__stat--atk"><CardStatIcon type="attack" /><span className="rpg-stat-value">{card.atk}</span></span><span className="rpg-hand__stat rpg-hand__stat--def"><CardStatIcon type="defense" /><span className="rpg-stat-value">{card.def}</span></span></span>}
            <span className="moba__sr-only">{card.name}</span>
          </button>
          <div className="moba__hand-caption"><span>{card.name}</span><button type="button" className="moba__inspect" aria-label={`Voir la fiche de ${card.name}`} onClick={() => setApercu({ carteId: id })}>ⓘ</button></div>
        </div>;
      }
      return <button type="button" key={`${id}-${index}`} className={`moba__card${selected ? ' is-selected' : ''}`} disabled={disabled} onClick={() => jouerCarte(id, index)} title={card.text}><span className="moba__card-art"><img src={cardArt(id)} alt="" /><i>{card.cost}</i></span><span className="moba__card-info"><b>{card.name}</b><small>{card.kind === 'magie' ? 'MAGIE' : `⚔ ${card.atk}  ◆ ${card.def}`}</small><small className="moba__cardtext">{card.text || 'Aucune capacité.'}</small></span></button>;
    })}</div></section>}
    </div>
    <details className="moba__journal"><summary>Journal du duel</summary>{duel.log.slice(-12).reverse().map((line, i) => <p key={i}>{line}</p>)}</details>
    </div>
    {apercu && rendu?.ApercuCarteAppuiLong && <rendu.ApercuCarteAppuiLong carte={cardById(apercu.carteId)} furieDeclenchee={Boolean(apercu.entity?.furieDeclenchee)} statsFurie={apercu.entity?.furieDeclenchee ? { atk: apercu.entity.atk, def: apercu.entity.pv } : null} onFermer={() => setApercu(null)} />}
    {etape === 'choix' && !edition && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label="Choix des decks"><div className="moba__modal"><span>DUEL SOLO · PRÉPARATION</span><h2>Choisissez les decks</h2><p>Choisissez un deck préconstruit ou personnalisez-le avec les cartes adaptées au MOBA.</p><div className="moba__deck-choices">{['joueur', 'sorcier'].map((side) => <div className="moba__deck-choice" key={side}><label>{noms[side]}<select autoFocus={side === 'joueur'} value={side === 'joueur' ? deckJoueur : deckSorcier} onChange={(event) => choisirDeck(side, event.target.value)}>{MOBA_DECKS.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select></label><small>{decksPersonnalises[side] ? `Deck personnalisé · ${deckPour(side).elements.join(', ')}` : deckPour(side).description}</small><button type="button" onClick={() => setEdition(side)}>Personnaliser le deck {side === 'joueur' ? 'du joueur' : 'de l’IA'}</button></div>)}</div><button type="button" className="moba__primary" onClick={() => { setDuel(nouveau(deckPour('joueur'), deckPour('sorcier'))); setEtape('mulligan'); }}>Commencer →</button><button type="button" onClick={onQuitter}>Retour au menu</button></div></div>}
    {etape === 'choix' && edition && <RpgMobaDeckEditor key={edition} deck={deckPour(edition)} joueur={noms[edition]} onCancel={() => setEdition(null)} onSave={(deck) => { setDecksPersonnalises((decks) => ({ ...decks, [edition]: deck })); setEdition(null); }} />}
    {etape === 'mulligan' && <div className="moba__overlay" inert={Boolean(apercu)} role="dialog" aria-modal="true" aria-label="Votre main de départ"><div className="moba__modal moba__mulligan"><span>PRÉPARATION · {noms[mulliganSide].toUpperCase()}</span><h2>Votre main de départ</h2><p>Sélectionnez les cartes à échanger, ou gardez votre main. Vous pouvez faire un échange ; l’IA choisit sa main automatiquement.</p><div className="moba__mulligan-cards">{duel[mulliganSide].main.map((id, index) => {
      const card = cardById(id), choisi = mulliganIndices.includes(index);
      const toggle = () => setMulliganIndices((ids) => ids.includes(index) ? ids.filter((n) => n !== index) : [...ids, index]);
      if (rendu?.CarteMulligan) {
        const CarteMulligan = rendu.CarteMulligan;
        return <div className="moba__mulligan-item" key={`${id}-${index}`}><CarteMulligan carte={card} index={index} selectionnee={choisi} onBasculer={toggle} /><div className="moba__hand-caption"><span>{card.name}</span><button type="button" className="moba__inspect" aria-label={`Voir la fiche de ${card.name}`} onClick={() => setApercu({ carteId: id })}>ⓘ</button></div></div>;
      }
      return <button type="button" autoFocus={index === 0} key={`${id}-${index}`} aria-pressed={choisi} className={`moba__mulligan-card${choisi ? ' is-selected' : ''}`} onClick={toggle}><img src={cardArt(id)} alt="" /><b>{card.name}</b><small>{choisi ? 'À ÉCHANGER' : `${card.cost} MANA`}</small></button>;
    })}</div>{erreur && <p className="moba__error" role="alert">{erreur}</p>}<button type="button" className="moba__primary" onClick={confirmerMulligan}>{mulliganIndices.length ? `Échanger ${mulliganIndices.length} carte(s)` : 'Garder ma main'} →</button></div></div>}

    {recherche?.cote === 'joueur' && !fini && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label="Recherche dans votre deck"><div className="moba__modal moba__mulligan"><span>CAPACITÉ D’ARRIVÉE</span><h2>Choisissez une carte</h2><p>{cardById(recherche.sourceCarteId)?.name} cherche dans votre deck. Choisissez une carte admissible à ajouter à votre main.</p><div className="moba__mulligan-cards moba__search-cards">{rpgMobaCandidatsRecherche(duel, 'joueur').map((id, index) => <button type="button" key={id} autoFocus={index === 0} className="moba__mulligan-card" onClick={() => afficherResultat(rpgMobaResoudreRecherche(duel, 'joueur', id))}><img src={cardArt(id)} alt="" /><b>{cardById(id)?.name}</b><small>{cardById(id)?.cost} MANA</small><small className="moba__search-text">{cardById(id)?.text}</small></button>)}</div>{erreur && <p className="moba__error" role="alert">{erreur}</p>}</div></div>}
    {fini && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label={duel.moba.winner ? 'Victoire' : 'Partie terminée'}><div className="moba__modal"><span>{duel.moba.winner ? 'DEUX VOIES CONQUISES' : 'FIN DE PARTIE'}</span><h2>{duel.moba.winner ? (duel.moba.winner === 'joueur' ? 'Victoire !' : 'Victoire de l’IA') : 'Partie terminée'}</h2><p>Le Sablier a rendu son verdict.</p><button type="button" autoFocus className="moba__primary" onClick={nouvellePartie}>Rejouer</button><button type="button" onClick={onQuitter}>Retour au menu</button></div></div>}
  </main>;
}
