import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cardArt } from './rpgCardArt.js';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';
import { consommerSortiesCimetiere, instantaneCimetiere, sortiesCimetiereEntreVues } from './rpgCimetiereAnimation.js';
import './rpg-cimetiere-vols.css';

function rectangleVisible(element) {
  const rect = element?.getBoundingClientRect?.();
  return rect && rect.width > 0 && rect.height > 0 ? rect : null;
}

function premiereBoite(root, selecteurs) {
  for (const selecteur of selecteurs) {
    for (const element of root.querySelectorAll(selecteur)) {
      const rect = rectangleVisible(element);
      if (rect) return rect;
    }
  }
  return null;
}

/** Mesure les zones réellement visibles, y compris les piles mobiles et les
 * cartes empilées. Une carte hors page rejoint la zone de main, sans la changer. */
export function mesurerVolCimetiere(root, mouvement, moba) {
  if (!root) return null;
  const { cote, carteId, destination, entiteId } = mouvement;
  const piles = moba ? `.moba__piles--${cote}` : `.rpg-card-piles--${cote === 'joueur' ? 'player' : 'opponent'}`;
  const plaque = cote === 'joueur' ? '.rpg-wizard-plate--joueur' : '.rpg-wizard-plate--ennemi';
  const depart = premiereBoite(root, [
    `${piles} .rpg-card-pile--graveyard .rpg-card-pile__stack`,
    `${piles} .rpg-card-pile--graveyard`,
    `${piles} .moba__pile-fallback:last-child`,
    `${plaque} .rpg-mobile-zones .rpg-wizard-plate__zone:last-child`,
    plaque,
  ]);
  let arrivee = null;
  if (destination === 'jeu') {
    const zone = moba ? `.moba__side--${cote}` : `.card-row--${cote === 'joueur' ? 'equipe' : 'ennemi'}`;
    const elements = root.querySelectorAll(`${zone} [data-entity-id], ${zone} [data-moba-entity], ${zone} [data-entites-pile]`);
    const cible = [...elements].find((el) => el.dataset.entityId === entiteId || el.dataset.mobaEntity === entiteId
      || el.dataset.entitesPile?.split(' ').includes(entiteId));
    arrivee = rectangleVisible(cible);
  } else if (cote === 'joueur') {
    const zone = moba ? '.moba__hand-cards' : '.rpg-hand';
    const cartes = root.querySelectorAll(`${zone} [data-card-id]`);
    const cible = [...cartes].find((el) => el.dataset.cardId === carteId && rectangleVisible(el));
    arrivee = rectangleVisible(cible) ?? premiereBoite(root, [zone, '.rpg-hand-dock']);
  } else {
    arrivee = premiereBoite(root, ['.rpg-hidden-hand__cards', '.rpg-hidden-hand', '.moba__hidden-hand > div', '.moba__hidden-hand']);
  }
  if (!depart || !arrivee) return null;
  const centre = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  return { depart: centre(depart), arrivee: centre(arrivee) };
}

/** Suit les événements exacts du moteur local ; pour une vue PvP distante,
 * qui ne transporte pas le journal visuel, rapproche les zones publiques. */
export function useCimetiereVols({ duel, session, rootRef, actif = true, moba = false, pvp = false }) {
  const [vols, setVols] = useState([]);
  const precedent = useRef(null);
  const sequence = useRef(0);
  const timers = useRef(new Set());

  useEffect(() => () => { timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current.clear(); }, []);
  useLayoutEffect(() => {
    const evenements = consommerSortiesCimetiere(duel);
    const instantane = instantaneCimetiere(duel);
    const ancien = precedent.current;
    precedent.current = { session, duel, instantane, actif };
    if (!ancien || ancien.session !== session || !ancien.actif || !actif || !duel) {
      if (ancien && (ancien.session !== session || !actif)) {
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current.clear();
        if (vols.length) setVols([]);
      }
      return;
    }
    const distants = pvp && ancien.duel !== duel && !evenements.length
      ? sortiesCimetiereEntreVues(ancien.instantane, instantane) : [];
    if (rpgAnimationsReduites()) {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      if (vols.length) setVols([]);
      return;
    }
    const ajouts = [...evenements, ...distants].slice(0, 8).flatMap((mouvement, index) => {
      const trajet = mesurerVolCimetiere(rootRef.current, mouvement, moba);
      if (!trajet) return [];
      const token = ++sequence.current;
      const duree = dureeAnimation(900);
      const delai = dureeAnimation(index * 100);
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        setVols((courants) => courants.filter((vol) => vol.token !== token));
      }, duree + delai + 60);
      timers.current.add(timer);
      return [{ ...mouvement, ...trajet, token, duree, delai }];
    });
    if (ajouts.length) setVols((courants) => [...courants, ...ajouts].slice(-16));
  });
  return vols;
}

export function CimetiereVols({ vols }) {
  if (!vols.length || typeof document === 'undefined') return null;
  return createPortal(<div className="rpg-cimetiere-vols" aria-hidden="true">
    {vols.map((vol) => <div key={vol.token} className="rpg-cimetiere-vol" data-rpg-cimetiere-vol={`${vol.cote}-${vol.destination}`}
      style={{ left: vol.depart.x, top: vol.depart.y, '--vol-dx': `${vol.arrivee.x - vol.depart.x}px`, '--vol-dy': `${vol.arrivee.y - vol.depart.y}px`, '--vol-mid-x': `${(vol.arrivee.x - vol.depart.x) * .78}px`, '--vol-mid-y': `${(vol.arrivee.y - vol.depart.y) * .78}px`, '--vol-duree': `${vol.duree}ms`, '--vol-delai': `${vol.delai}ms` }}>
      <span className="rpg-cimetiere-vol__aura" />
      <img className="rpg-cimetiere-vol__carte" src={vol.cote === 'sorcier' && vol.destination === 'main' ? `${import.meta.env.BASE_URL}dos-de-carte.jpg` : cardArt(vol.carteId)} alt="" />
      <span className="rpg-cimetiere-vol__legende">CIMETIÈRE → {vol.destination === 'jeu' ? 'JEU' : 'MAIN'}</span>
    </div>)}
  </div>, document.fullscreenElement ?? document.webkitFullscreenElement ?? document.body);
}
