import { useReducer, useState } from 'react';
import { cardById } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';
import { rpgChoisirCouleurMana, rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgPeutPayer } from './rpgDuel.js';
import { MOBA_DECK_ESSAI, MOBA_MAGIES_ESSAI, rpgMobaJouerCreature, rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaNouveauDuel } from './rpgMobaLocal.js';
import './rpg-moba.css';

const noms = { joueur: 'Joueur 1', sorcier: 'Joueur 2' };
const voies = { left: 'Gauche', center: 'Centre', right: 'Droite' };
const autre = (side) => side === 'joueur' ? 'sorcier' : 'joueur';
const message = {
  mana: 'Mana insuffisant pour cette carte.', 'pas-pret': 'Cette créature ne peut pas encore attaquer.',
  provocation: 'Une créature avec Provocation doit être bloquée si possible.',
  'attaque-jouee': 'La phase d’attaque est déjà terminée.', 'emplacement': 'Cet emplacement n’est pas libre.',
  'effet-non-pris-en-charge': 'Cette capacité n’est pas encore disponible dans l’essai MOBA.',
};
function nouveau() {
  const duel = rpgMobaNouveauDuel({ joueurDeck: MOBA_DECK_ESSAI, sorcierDeck: MOBA_DECK_ESSAI, joueurCouleurs: ['neige', 'sable', 'braise'], sorcierCouleurs: ['neige', 'sable', 'braise'] });
  rpgMulligan(duel, 'joueur', []);
  rpgMulligan(duel, 'sorcier', []);
  rpgDemarrerManaEssai(duel);
  return duel;
}

/** Local, shared-device test mode. All board mutations are delegated to the
 * duel engine and its MOBA adapter; React only holds selections. */
export default function RpgMobaBoard({ onQuitter }) {
  const [duel, setDuel] = useState(nouveau);
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [carte, setCarte] = useState(null);
  const [attaquants, setAttaquants] = useState([]);
  const [blocages, setBlocages] = useState({});
  const [cible, setCible] = useState(null);
  const [etape, setEtape] = useState('tour');
  const [passage, setPassage] = useState(null);
  const [erreur, setErreur] = useState('');
  const [events, setEvents] = useState([]);
  const actif = duel.tour;
  const defenseur = autre(actif);
  const fini = Boolean(duel.moba.winner);
  const camp = duel[actif];
  const getEntity = (side, id) => duel[side].creatures.find((e) => e.id === id);
  const laneOf = (id) => duel.moba.lanes.find((lane) => lane.slots[actif].includes(id));
  const afficherResultat = (res) => {
    setErreur(res.ok ? '' : (message[res.raison] ?? `Action refusée (${res.raison}).`));
    redraw();
    return res.ok;
  };
  const jouerCarte = (id) => {
    if (etape !== 'tour' || fini || camp.manaChoixEnAttente) return;
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
    if (etape !== 'tour' || carte || fini) return;
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
  const finTour = () => {
    if (fini || camp.manaChoixEnAttente) return;
    const avant = duel.tour;
    rpgFinDeTour(duel);
    if (duel.tour === avant) { setErreur('Le tour ne peut pas encore se terminer.'); redraw(); return; }
    setCarte(null); setAttaquants([]); setBlocages({}); setCible(null); setErreur(''); setEvents([]);
    setPassage(duel.tour); redraw();
  };
  const nouvellePartie = () => { setDuel(nouveau()); setCarte(null); setAttaquants([]); setBlocages({}); setCible(null); setEtape('tour'); setPassage(null); setErreur(''); setEvents([]); };
  return <main className="moba" aria-label="MOBA, essai local">
    <header className="moba__header"><div><span>LE SABLIER · ESSAI LOCAL</span><h1>MOBA <small>trois voies</small></h1></div><button onClick={onQuitter}>← Menu</button></header>
    <p className="moba__notice">Version d’essai à deux sur le même appareil : decks fixes de 30 cartes. Certaines cartes et réponses rapides ne sont pas encore disponibles.</p>
    <div className="moba__status"><strong>{noms[actif]} · {etape === 'blocage' ? `défense de ${noms[defenseur]}` : 'à vous de jouer'}</strong><span>Mana : {['neige', 'sable', 'braise'].map((c) => `${c} ${camp.mana[c] ?? 0}`).join(' · ')}</span></div>
    {camp.manaChoixEnAttente && !fini && etape === 'tour' && <div className="moba__choice"><strong>Choisissez votre nouveau mana :</strong>{camp.couleurs.map((color) => <button key={color} onClick={() => afficherResultat(rpgChoisirCouleurMana(duel, actif, color))}>{color}</button>)}</div>}
    <p className="moba__hint">{etape === 'blocage' ? 'Défenseur : choisissez un attaquant, puis ses bloqueurs dans la même voie.' : carte ? 'Choisissez une case libre pour invoquer.' : 'Sélectionnez une carte à jouer, ou vos créatures prêtes pour attaquer.'}</p>
    {erreur && <p className="moba__error" role="alert">{erreur}</p>}
    <div className="moba__lanes">
      {duel.moba.lanes.map((lane) => <section key={lane.id} className={`moba__lane${lane.active ? '' : ' is-conquered'}`} aria-label={`Voie ${voies[lane.id]}`}>
        <div className="moba__lanehead"><strong>{voies[lane.id]}</strong><span>{lane.active ? 'Voie active' : `Conquise par ${noms[lane.conqueredBy]}`}</span></div>
        {[defenseur, actif].map((side) => <div className="moba__side" key={side}>
          <div className="moba__health"><span>{noms[side]}</span><strong key={`${lane.id}-${side}-${lane.hp[side]}`} className={events.some((e) => e.laneId === lane.id && side === defenseur) ? 'is-damaged' : ''}>{lane.hp[side]} / 10 PV</strong></div>
          <div className="moba__slots">{lane.slots[side].map((id, i) => {
            const entity = id && getEntity(side, id);
            const isAttacker = id && attaquants.includes(id);
            const isBlocked = id && Object.values(blocages).some((ids) => ids.includes(id));
            const mayAttack = etape === 'tour' && !carte && side === actif && entity && rpgPeutAttaquer(entity) && duel.attaqueJouee !== actif && !camp.manaChoixEnAttente;
            const mayTarget = etape === 'blocage' && side === actif && isAttacker;
            const chosenAttacker = cible && getEntity(actif, cible);
            const mayBlock = etape === 'blocage' && side === defenseur && entity && chosenAttacker && lane.slots[actif].includes(cible) && !entity.attaquee && !(entity.gelToursRestants > 0) && !(entity.empecheBlocageToursRestants > 0) && rpgPeutBloquerAttaquant(entity, chosenAttacker);
            const mayPlace = etape === 'tour' && side === actif && !id && lane.active && carte && !fini && rpgPeutPayer(camp, cardById(carte));
            return <button type="button" key={i} className={`moba__slot${isAttacker ? ' is-attacking' : ''}${isBlocked ? ' is-blocking' : ''}${cible === id ? ' is-target' : ''}`} disabled={!(mayPlace || mayAttack || mayTarget || mayBlock)} onClick={() => { if (mayPlace) poser(lane.id, i); else if (mayTarget) setCible(id); else if (mayBlock) assigner(id, lane); else if (mayAttack) choisirAttaquant(id); }}>
              {entity ? <><img src={cardArt(entity.carteId)} alt="" /><span><b>{entity.name}</b><small>⚔ {entity.atk} · Déf {entity.pv}{entity.ready && !entity.attaquee ? '' : ' · engagée'}</small></span></> : <span>{lane.active ? (mayPlace ? '+ Invoquer' : 'Emplacement libre') : 'Voie fermée'}</span>}
            </button>;
          })}</div>
        </div>)}
      </section>)}
    </div>
    <div className="moba__controls">
      {etape === 'tour' ? <><button disabled={!attaquants.length || fini || camp.manaChoixEnAttente || duel.attaqueJouee === actif} onClick={() => { setCarte(null); setEtape('blocage'); setCible(attaquants[0]); setPassage(defenseur); }}>Déclarer {attaquants.length || ''} attaque(s)</button><button disabled={fini || camp.manaChoixEnAttente} onClick={finTour}>Fin du tour</button></> : <><button onClick={() => { setEtape('tour'); setBlocages({}); setCible(null); setPassage(actif); }}>Annuler</button><button onClick={resoudre}>Résoudre le combat</button></>}
    </div>
    {etape === 'tour' && <section className="moba__hand" aria-label={`Main de ${noms[actif]}`}><h2>Main de {noms[actif]} <small>· Pioche {camp.deck.length}</small></h2><div>{camp.main.map((id, index) => { const card = cardById(id); return <button key={`${id}-${index}`} className={`moba__card${carte === id ? ' is-selected' : ''}`} disabled={etape !== 'tour' || fini || camp.manaChoixEnAttente || !rpgPeutPayer(camp, card)} onClick={() => jouerCarte(id)} title={card.text}><img src={cardArt(id)} alt="" /><span><b>{card.name}</b><small>{card.cost} mana · {card.kind === 'magie' ? 'Magie' : `${card.atk} / ${card.def}`}</small><small className="moba__cardtext">{card.text || 'Aucune capacité.'}</small></span></button>; })}</div></section>}
    <details className="moba__journal"><summary>Journal du duel</summary>{duel.log.slice(-12).reverse().map((line, i) => <p key={i}>{line}</p>)}</details>
    {passage && !fini && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label="Passage de l’appareil"><div><h2>Passez l’appareil</h2><p>{noms[passage]}, c’est à vous.</p><button onClick={() => setPassage(null)}>Je suis prêt</button></div></div>}
    {fini && <div className="moba__overlay" role="dialog" aria-modal="true" aria-label="Victoire"><div><span>DEUX VOIES CONQUISES</span><h2>Victoire de {noms[duel.moba.winner]}</h2><p>Le Sablier a rendu son verdict.</p><button onClick={nouvellePartie}>Rejouer</button><button onClick={onQuitter}>Retour au menu</button></div></div>}
  </main>;
}
