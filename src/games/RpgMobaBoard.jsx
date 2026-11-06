import { useReducer, useState } from 'react';
import { cardById } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';
import { rpgChoisirCouleurMana, rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgPeutPayer } from './rpgDuel.js';
import {
  MOBA_DECK_ESSAI, MOBA_MAGIES_ESSAI, rpgMobaDefausser, rpgMobaJouerCreature,
  rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaMulligan, rpgMobaNouveauDuel,
  rpgMobaTerminerTour,
} from './rpgMobaLocal.js';
import './rpg-moba.css';

const noms = { joueur: 'Joueur 1', sorcier: 'Joueur 2' };
const voies = { left: 'Voie gauche', center: 'Voie centrale', right: 'Voie droite' };
const glyphes = { left: 'I', center: 'II', right: 'III' };
const autre = (side) => side === 'joueur' ? 'sorcier' : 'joueur';
const message = {
  mana: 'Mana insuffisant pour cette carte.', 'pas-pret': 'Cette créature ne peut pas encore attaquer.',
  provocation: 'Une créature avec Provocation doit être bloquée si possible.',
  'attaque-jouee': 'La phase d’attaque est déjà terminée.', emplacement: 'Cet emplacement n’est pas libre.',
  'effet-non-pris-en-charge': 'Cette capacité n’est pas encore disponible dans l’essai MOBA.',
};
function nouveau() {
  return rpgMobaNouveauDuel({ joueurDeck: MOBA_DECK_ESSAI, sorcierDeck: MOBA_DECK_ESSAI, joueurCouleurs: ['neige', 'sable', 'braise'], sorcierCouleurs: ['neige', 'sable', 'braise'] });
}

function Marque({ active }) {
  return <span className={`moba__mark${active ? ' is-won' : ''}`} aria-hidden="true">◆</span>;
}

/** Local, shared-device test mode. Game changes are delegated to the engine;
 * React stores only the interaction choices for the current screen. */
export default function RpgMobaBoard({ onQuitter, initialiser = nouveau }) {
  const [duel, setDuel] = useState(initialiser);
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [carte, setCarte] = useState(null);
  const [attaquants, setAttaquants] = useState([]);
  const [blocages, setBlocages] = useState({});
  const [cible, setCible] = useState(null);
  const [etape, setEtape] = useState('mulligan');
  const [mulliganSide, setMulliganSide] = useState('joueur');
  const [mulliganIndices, setMulliganIndices] = useState([]);
  const [passage, setPassage] = useState(null);
  const [erreur, setErreur] = useState('');
  const [events, setEvents] = useState([]);
  const actif = duel.tour;
  const defenseur = autre(actif);
  const fini = Boolean(duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul);
  const camp = duel[actif];
  const defausse = duel.defausseEnAttente?.cote === actif && duel.defausseEnAttente?.motif === 'fin-de-tour'
    ? duel.defausseEnAttente.restant : 0;
  const getEntity = (side, id) => duel[side].creatures.find((e) => e.id === id);
  const scores = Object.fromEntries(['joueur', 'sorcier'].map((side) => [side, duel.moba.lanes.filter((lane) => lane.conqueredBy === side).length]));
  const afficherResultat = (res) => {
    setErreur(res.ok ? '' : (message[res.raison] ?? `Action refusée (${res.raison}).`));
    redraw();
    return res.ok;
  };
  const confirmerMulligan = () => {
    const result = rpgMobaMulligan(duel, mulliganSide, mulliganIndices);
    if (!afficherResultat(result)) return;
    setMulliganIndices([]);
    if (result.demarre) { setEtape('tour'); setPassage('joueur'); }
    else { setMulliganSide('sorcier'); setPassage('sorcier'); }
  };
  const finTour = () => {
    const result = rpgMobaTerminerTour(duel, actif);
    if (!afficherResultat(result)) return;
    setCarte(null); setAttaquants([]); setBlocages({}); setCible(null); setEvents([]);
    if (result.tour) setPassage(result.tour);
  };
  const jouerCarte = (id, index) => {
    if (etape !== 'tour' || fini || camp.manaChoixEnAttente) return;
    if (defausse) {
      const result = rpgMobaDefausser(duel, actif, index);
      if (afficherResultat(result) && !result.restant) finTour();
      return;
    }
    if (MOBA_MAGIES_ESSAI.includes(id)) {
      if (afficherResultat(rpgMobaLancerMagie(duel, actif, id))) setAttaquants([]);
      setCarte(null);
    } else { setCarte(carte === id ? null : id); setErreur(''); }
  };
  const poser = (lane, slot) => {
    if (!carte) return;
    if (afficherResultat(rpgMobaJouerCreature(duel, actif, carte, lane, slot))) setCarte(null);
  };
  const choisirAttaquant = (id) => {
    if (etape !== 'tour' || carte || fini || defausse) return;
    setAttaquants((ids) => ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]);
    setErreur('');
  };
  const assigner = (id, lane) => {
    if (etape !== 'blocage' || !cible || !lane.slots[actif].includes(cible)) return;
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
  const resoudre = () => {
    const res = rpgMobaLancerAttaque(duel, actif, attaquants, blocages);
    if (!afficherResultat(res)) return;
    setEvents(res.damageEvents ?? []);
    setAttaquants([]); setBlocages({}); setCible(null); setEtape('tour'); setCarte(null);
    if (!duel.moba.winner) setPassage(actif);
  };
  const nouvellePartie = () => { setDuel(initialiser()); setCarte(null); setAttaquants([]); setBlocages({}); setCible(null); setEtape('mulligan'); setMulliganSide('joueur'); setMulliganIndices([]); setPassage(null); setErreur(''); setEvents([]); };
  const instruction = defausse ? `Choisissez ${defausse} carte${defausse > 1 ? 's' : ''} à défausser pour terminer votre tour.`
    : etape === 'blocage' ? 'Défenseur : choisissez un attaquant, puis ses bloqueurs dans la même voie.'
      : carte ? 'Choisissez une case illuminée pour invoquer votre créature.'
        : 'Jouez une carte, ou sélectionnez vos créatures prêtes pour attaquer.';
  return <main className="moba" aria-label="MOBA, essai local" style={{ '--moba-table': `url("${import.meta.env.BASE_URL}card-table.jpg")` }}>
    <div inert={Boolean(passage || etape === 'mulligan' || fini)}>
    <header className="moba__header">
      <div className="moba__brand"><span>LE SABLIER <i>✦</i> DUEL LOCAL</span><h1>MOBA <small>Les trois voies</small></h1></div>
      <div className="moba__header-meta"><span className="moba__trial">ESSAI · DECKS FIXES</span><button type="button" className="moba__back" onClick={onQuitter}>← <span>Quitter la partie</span></button></div>
    </header>
    <p className="moba__notice">Deux joueurs sur le même appareil · Conquérez 2 voies pour gagner · Decks fixes de 30 cartes · Certaines capacités et réponses rapides restent indisponibles.</p>
    <div className="moba__scoreboard" aria-label="Score de conquête">
      {['joueur', 'sorcier'].map((side) => <div key={side} className={`moba__player${actif === side && etape === 'tour' ? ' is-active' : ''}`}>
        <span className="moba__player-emblem" aria-hidden="true">{side === 'joueur' ? 'Ⅰ' : 'Ⅱ'}</span>
        <span className="moba__player-name"><small>{side === actif && etape === 'tour' ? 'TOUR ACTIF' : 'DUELLISTE'}</small><strong>{noms[side]}</strong></span>
        <span className="moba__player-score" aria-label={`${scores[side]} voies conquises sur 2`}><Marque active={scores[side] > 0} /><Marque active={scores[side] > 1} /><small>{scores[side]} / 2</small></span>
      </div>)}
      <div className="moba__score-center"><span>◆</span><small>CONQUÊTE</small></div>
    </div>
    <div className="moba__status"><strong>{noms[actif]} <span>·</span> {etape === 'blocage' ? `défense de ${noms[defenseur]}` : 'phase principale'}</strong><span className="moba__mana">{['neige', 'sable', 'braise'].map((c) => <span className={`moba__mana-${c}`} key={c}><i aria-hidden="true">◆</i> {c} <b>{camp.mana[c] ?? 0}</b></span>)}</span></div>
    {camp.manaChoixEnAttente && !fini && etape === 'tour' && <div className="moba__choice"><strong>Choisissez votre nouveau mana</strong>{camp.couleurs.map((color) => <button type="button" key={color} onClick={() => afficherResultat(rpgChoisirCouleurMana(duel, actif, color))}>◆ {color}</button>)}</div>}
    <div className="moba__directive" aria-live="polite"><span aria-hidden="true">✧</span><p className="moba__hint">{instruction}</p>{erreur && <p className="moba__error" role="alert">{erreur}</p>}</div>
    <div className="moba__battlefield"><div className="moba__lanes">
      {duel.moba.lanes.map((lane) => <section key={lane.id} className={`moba__lane${lane.active ? '' : ' is-conquered'}`} aria-label={voies[lane.id]}>
        <div className="moba__lanehead"><span className="moba__lane-number">{glyphes[lane.id]}</span><strong>{voies[lane.id]}</strong><span className="moba__lane-state">{lane.active ? 'EN JEU' : `CONQUISE · ${noms[lane.conqueredBy]}`}</span></div>
        {[defenseur, actif].map((side) => <div className="moba__side" key={side}>
          <div className="moba__health"><span>{noms[side]}</span><div className="moba__health-bar" role="progressbar" aria-label={`${voies[lane.id]}, ${noms[side]}`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={lane.hp[side]}><i style={{ width: `${lane.hp[side] * 10}%` }} /></div><strong key={`${lane.id}-${side}-${lane.hp[side]}`} className={events.some((e) => e.laneId === lane.id && side === defenseur) ? 'is-damaged' : ''}>{lane.hp[side]}<small> / 10</small></strong></div>
          <div className="moba__slots">{lane.slots[side].map((id, i) => {
            const entity = id && getEntity(side, id);
            const isAttacker = id && attaquants.includes(id);
            const isBlocked = id && Object.values(blocages).some((ids) => ids.includes(id));
            const mayAttack = etape === 'tour' && !carte && !defausse && side === actif && entity && rpgPeutAttaquer(entity) && duel.attaqueJouee !== actif && !camp.manaChoixEnAttente && !fini;
            const mayTarget = etape === 'blocage' && side === actif && isAttacker;
            const chosenAttacker = cible && getEntity(actif, cible);
            const mayBlock = etape === 'blocage' && side === defenseur && entity && chosenAttacker && lane.slots[actif].includes(cible) && !entity.attaquee && !(entity.gelToursRestants > 0) && !(entity.empecheBlocageToursRestants > 0) && rpgPeutBloquerAttaquant(entity, chosenAttacker);
            const mayPlace = etape === 'tour' && side === actif && !id && lane.active && carte && !defausse && !fini && rpgPeutPayer(camp, cardById(carte));
            const label = entity ? `${entity.name}, attaque ${entity.atk}, défense ${entity.pv}` : `${voies[lane.id]}, ${noms[side]}, emplacement ${i + 1}${mayPlace ? ', invoquer' : ''}`;
            return <button type="button" key={i} aria-label={label} className={`moba__slot${entity ? ' has-creature' : ' is-empty'}${isAttacker ? ' is-attacking' : ''}${isBlocked ? ' is-blocking' : ''}${cible === id && id ? ' is-target' : ''}`} disabled={!(mayPlace || mayAttack || mayTarget || mayBlock)} onClick={() => { if (mayPlace) poser(lane.id, i); else if (mayTarget) setCible(id); else if (mayBlock) assigner(id, lane); else if (mayAttack) choisirAttaquant(id); }}>
              {entity ? <><img src={cardArt(entity.carteId)} alt="" /><span className="moba__slot-label"><b>{entity.name}</b><small><em>⚔ {entity.atk}</em><em>◆ {entity.pv}</em></small></span>{isAttacker && <span className="moba__slot-tag">ATTAQUE</span>}{isBlocked && <span className="moba__slot-tag">BLOQUE</span>}</> : <span className="moba__empty-label"><i aria-hidden="true">{mayPlace ? '+' : '◇'}</i>{lane.active ? (mayPlace ? 'INVOQUER' : 'EMPLACEMENT') : 'VOIE FERMÉE'}</span>}
            </button>;
          })}</div>
        </div>)}
      </section>)}
    </div></div>
    <div className="moba__controls"><div className="moba__phase"><span>✦</span><div><small>VOTRE STRATÉGIE</small><strong>{etape === 'blocage' ? 'Défense' : defausse ? 'Défausse' : duel.attaqueJouee === actif ? 'Après le combat' : 'Phase principale'}</strong></div></div><div className="moba__buttons">
      {etape === 'tour' ? <><button type="button" disabled={!attaquants.length || fini || !!defausse || camp.manaChoixEnAttente || duel.attaqueJouee === actif} onClick={() => { setCarte(null); setEtape('blocage'); setCible(attaquants[0]); setPassage(defenseur); }}>Déclarer {attaquants.length || ''} attaque(s)</button><button type="button" className="moba__primary" disabled={fini || !!defausse || camp.manaChoixEnAttente} onClick={finTour}>Fin du tour <span>→</span></button></> : <><button type="button" onClick={() => { setEtape('tour'); setBlocages({}); setCible(null); setPassage(actif); }}>Annuler</button><button type="button" className="moba__primary" onClick={resoudre}>Résoudre le combat →</button></>}
    </div></div>
    {etape === 'tour' && <section className="moba__hand" aria-label={`Main de ${noms[actif]}`}><div className="moba__handhead"><div><span>VOTRE RÉSERVE</span><h2>Main de {noms[actif]}</h2></div><span className="moba__deck-count">PIOCHE <b>{camp.deck.length}</b></span></div><div className="moba__hand-cards">{camp.main.map((id, index) => { const card = cardById(id); return <button type="button" key={`${id}-${index}`} className={`moba__card${carte === id && !defausse ? ' is-selected' : ''}`} disabled={fini || camp.manaChoixEnAttente || (!defausse && !rpgPeutPayer(camp, card))} onClick={() => jouerCarte(id, index)} title={card.text}><span className="moba__card-art"><img src={cardArt(id)} alt="" /><i>{card.cost}</i></span><span className="moba__card-info"><b>{card.name}</b><small>{card.kind === 'magie' ? 'MAGIE' : `⚔ ${card.atk}  ◆ ${card.def}`}</small><small className="moba__cardtext">{card.text || 'Aucune capacité.'}</small></span></button>; })}</div></section>}
    <details className="moba__journal"><summary>Journal du duel</summary>{duel.log.slice(-12).reverse().map((line, i) => <p key={i}>{line}</p>)}</details>
    </div>
    {etape === 'mulligan' && !passage && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label={`Main de départ de ${noms[mulliganSide]}`}><div className="moba__modal moba__mulligan"><span>PRÉPARATION · {noms[mulliganSide].toUpperCase()}</span><h2>Votre main de départ</h2><p>Sélectionnez les cartes à échanger, ou gardez votre main. Chaque joueur peut faire un échange.</p><div className="moba__mulligan-cards">{duel[mulliganSide].main.map((id, index) => { const card = cardById(id); const choisi = mulliganIndices.includes(index); return <button type="button" autoFocus={index === 0} key={`${id}-${index}`} aria-pressed={choisi} className={`moba__mulligan-card${choisi ? ' is-selected' : ''}`} onClick={() => setMulliganIndices((ids) => ids.includes(index) ? ids.filter((n) => n !== index) : [...ids, index])}><img src={cardArt(id)} alt="" /><b>{card.name}</b><small>{choisi ? 'À ÉCHANGER' : `${card.cost} MANA`}</small></button>; })}</div>{erreur && <p className="moba__error" role="alert">{erreur}</p>}<button type="button" className="moba__primary" onClick={confirmerMulligan}>{mulliganIndices.length ? `Échanger ${mulliganIndices.length} carte(s)` : 'Garder ma main'} →</button></div></div>}
    {passage && !fini && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label="Passage de l’appareil"><div className="moba__modal"><span>DUEL LOCAL</span><h2>Passez l’appareil</h2><p>{noms[passage]}, c’est à vous.</p><button type="button" autoFocus className="moba__primary" onClick={() => setPassage(null)}>Je suis prêt →</button></div></div>}
    {fini && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label={duel.moba.winner ? 'Victoire' : 'Partie terminée'}><div className="moba__modal"><span>{duel.moba.winner ? 'DEUX VOIES CONQUISES' : 'FIN DE PARTIE'}</span><h2>{duel.moba.winner ? `Victoire de ${noms[duel.moba.winner]}` : 'Partie terminée'}</h2><p>Le Sablier a rendu son verdict.</p><button type="button" autoFocus className="moba__primary" onClick={nouvellePartie}>Rejouer</button><button type="button" onClick={onQuitter}>Retour au menu</button></div></div>}
  </main>;
}
