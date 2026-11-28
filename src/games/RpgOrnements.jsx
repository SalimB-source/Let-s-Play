import { useLayoutEffect, useRef, useState } from 'react';
import { dureeAnimation, rpgAnimationsReduites } from './rpgAnimations.js';
import { nombreAjouts, retraitsArmesVue, elementPortail, matiereBordure } from './rpgOrnements.js';
import { cardArt } from './rpgCardArt.js';
import { armesPortees } from './rpgCardStacks.js';
import './rpg-ornements.css';

// Les tableaux du moteur sont parfois mutés en place : toujours copier la vue.
// Pas d'effet au montage, ni pour un retrait ou une simple modification de stats.
function useAjoutVisuel(elements) {
  const avant = useRef(null);
  const [token, setToken] = useState(0);
  useLayoutEffect(() => {
    const nouvelle = [...(elements ?? [])];
    if (avant.current && nombreAjouts(avant.current, nouvelle) && !rpgAnimationsReduites()) setToken((n) => n + 1);
    avant.current = nouvelle;
  });
  return token;
}

export function RpgBordurePlateau({ plateau, cote = 'entier' }) {
  return <span className={`rpg-bordure rpg-bordure--${matiereBordure(plateau)} rpg-bordure--${cote}`} data-bordure-plateau={matiereBordure(plateau)} aria-hidden="true" />;
}

export function RpgPortailInvocation({ carte }) {
  return <span className={`rpg-portail rpg-portail--${elementPortail(carte)}`} data-portail-invocation={elementPortail(carte)} aria-hidden="true"><i /><i /></span>;
}

export function RpgBrumeCimetiere({ cartes }) {
  const token = useAjoutVisuel(cartes);
  return <span className="rpg-brume-cimetiere" aria-hidden="true">
    <i className="rpg-brume-cimetiere__voile" />
    {token > 0 && <span key={token} className="rpg-brume-cimetiere__grains" data-cimetiere-arrivee=""><i /><i /><i /><i /></span>}
  </span>;
}

/** Snapshot conservé au niveau du plateau : une carte peut changer de pile
 * et être remontée au moment précis où elle reçoit son arme, surtout au doigt. */
export function useArmesAjoutees(duel, session) {
  const precedent = useRef(null);
  const sequence = useRef(0);
  const timers = useRef(new Set());
  const [effets, setEffets] = useState({});
  useLayoutEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);
  useLayoutEffect(() => {
    const vue = new Map();
    for (const cote of ['joueur', 'sorcier']) {
      for (const entite of duel?.[cote]?.creatures ?? []) vue.set(`${cote}:${entite.id}`, [...armesPortees(entite)]);
    }
    const ancien = precedent.current;
    precedent.current = { session, vue };
    if (!ancien || ancien.session !== session) {
      timers.current.forEach(clearTimeout); timers.current.clear();
      setEffets((courants) => Object.keys(courants).length ? {} : courants);
      return;
    }
    if (rpgAnimationsReduites()) return;
    const ajouts = [];
    for (const [cle, armes] of vue) {
      if (ancien.vue.has(cle) && nombreAjouts(ancien.vue.get(cle), armes)) ajouts.push([cle, ++sequence.current]);
    }
    if (!ajouts.length) return;
    setEffets((courants) => ({ ...courants, ...Object.fromEntries(ajouts) }));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setEffets((courants) => {
        const suivants = { ...courants };
        for (const [cle, token] of ajouts) if (suivants[cle] === token) delete suivants[cle];
        return suivants;
      });
    }, dureeAnimation(900));
    timers.current.add(timer);
  });
  return effets;
}

/** Le relevé vit sur le plateau, pas sur la carte : après une perte, une pile
 * tactile peut se recomposer et remonter son porteur sous un nouveau parent. */
export function useArmesRetirees(duel, session) {
  const precedent = useRef(null);
  const sequence = useRef(0);
  const timers = useRef(new Set());
  const [effets, setEffets] = useState({});
  useLayoutEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);
  useLayoutEffect(() => {
    const vue = new Map();
    for (const cote of ['joueur', 'sorcier']) {
      for (const entite of duel?.[cote]?.creatures ?? []) vue.set(`${cote}:${entite.id}`, [...armesPortees(entite)]);
    }
    const ancien = precedent.current;
    precedent.current = { session, vue };
    if (!ancien || ancien.session !== session) {
      timers.current.forEach(clearTimeout); timers.current.clear();
      setEffets((courants) => Object.keys(courants).length ? {} : courants);
      return;
    }
    const disparus = [...ancien.vue.keys()].filter((cle) => !vue.has(cle));
    if (disparus.length) setEffets((courants) => {
      if (!disparus.some((cle) => cle in courants)) return courants;
      const suivants = { ...courants };
      for (const cle of disparus) delete suivants[cle];
      return suivants;
    });
    if (rpgAnimationsReduites()) return;
    const retraits = retraitsArmesVue(ancien.vue, vue).map(({ cle, armes }) => [cle, { armes, token: ++sequence.current }]);
    if (!retraits.length) return;
    setEffets((courants) => ({ ...courants, ...Object.fromEntries(retraits) }));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setEffets((courants) => {
        const suivants = { ...courants };
        for (const [cle, effet] of retraits) if (suivants[cle]?.token === effet.token) delete suivants[cle];
        return suivants;
      });
    }, dureeAnimation(1100));
    timers.current.add(timer);
  });
  return effets;
}

/** Fantôme de l'ancienne arme, même lors d'un remplacement : le décor ne dit
 * pas qu'elle est détruite et ne capture jamais le geste sur la créature. */
export function RpgDepartArme({ effet }) {
  if (!effet?.armes?.length) return null;
  return <span key={effet.token} className="rpg-arme-depart" data-arme-depart={effet.armes.join(' ')} aria-hidden="true">
    {effet.armes.slice(0, 3).map((id, index) => <span key={`${id}-${index}`} className="rpg-arme-depart__piece" style={{ '--arme-depart-index': index }}>
      <img src={cardArt(id)} alt="" /><i />
    </span>)}
    <span className="rpg-arme-depart__etincelles"><i /><i /><i /></span>
  </span>;
}

/** Dans le rendu autonome Conquête la vignette est dessinée ici aussi. */
export function RpgLueurArme({ armes, token, autonome = false }) {
  if (!armes?.length) return null;
  return <span className={`rpg-arme-eclat${autonome ? ' rpg-arme-eclat--autonome' : ''}`} aria-hidden="true">
    {autonome && <img src={cardArt(armes[0])} alt="" />}
    {token && <i key={token} data-arme-attachee="" />}
  </span>;
}
