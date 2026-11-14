import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cardById } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';
import {
  ascensionDisponible, coutImprimeAscension, ERREURS_ASCENSION, libelleRecetteAscension,
  materiauAscensionValide, timingAscensionValide, validerMateriauxAscension,
} from './rpgAscension.js';
import './rpg-ascension.css';

const AUCUN_MATERIAU = Object.freeze([]);
const rendreFocus = (noeud) => window.setTimeout(() => { if (noeud?.isConnected) noeud.focus({ preventScroll: true }); }, 0);
const DANS_RESERVE = '.rpg-ascension-popover, .rpg-ascension-ritual, .rpg-ascension-card-preview';

/** Trois états locaux : consulter la petite réserve, lire une fiche, choisir
 * ses sacrifices. Aucun d'eux ne paie ni ne modifie la partie. */
export function useReserveAscension() {
  const [vue, setVue] = useState(null);
  const vueRef = useRef(vue); vueRef.current = vue;
  const retourFocus = useRef(null);
  const sourceApercu = useRef(null);
  const fermer = useCallback((restaurer = true) => {
    setVue(null);
    if (restaurer) rendreFocus(retourFocus.current);
  }, []);
  const fermerApercu = useCallback(() => {
    setVue((actuelle) => actuelle ? { ...actuelle, apercuId: null } : actuelle);
    rendreFocus(sourceApercu.current);
  }, []);
  const retour = useCallback(() => {
    if (vueRef.current?.apercuId) fermerApercu(); else fermer();
    return true;
  }, [fermer, fermerApercu]);
  const ouvrir = useCallback((duel, cote, bouton = null) => {
    retourFocus.current = bouton ?? document.querySelector(`[data-ascension-side="${cote}"]`);
    const actuelle = vueRef.current;
    setVue(actuelle?.cote === cote && !actuelle.rituel && !actuelle.apercuId ? null
      : { cote, carteId: null, ids: [], apercuId: null, rituel: false });
  }, []);
  const ouverte = Boolean(vue), rituel = Boolean(vue?.rituel), apercuOuvert = Boolean(vue?.apercuId);
  useEffect(() => {
    if (!ouverte) return undefined;
    const echapper = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault(); event.stopPropagation(); retour();
    };
    const ailleurs = (event) => {
      if (!rituel && !apercuOuvert && !event.target.closest(`${DANS_RESERVE}, [data-ascension-side]`)) fermer(false);
    };
    window.addEventListener('keydown', echapper, true);
    window.addEventListener('pointerdown', ailleurs, true);
    return () => { window.removeEventListener('keydown', echapper, true); window.removeEventListener('pointerdown', ailleurs, true); };
  }, [ouverte, rituel, apercuOuvert, retour, fermer]);
  const choisir = (duel, id, disponible = true) => {
    setVue((actuelle) => {
      if (!actuelle?.rituel || actuelle.cote !== 'joueur' || !disponible
        || !duel?.joueur?.reserveAscension?.includes(actuelle.carteId)
        || !timingAscensionValide(duel, 'joueur')) return actuelle;
      const carte = cardById(actuelle.carteId);
      const entite = duel.joueur.creatures.find((e) => e.id === id);
      if (!materiauAscensionValide(carte, entite)) return actuelle;
      const ids = actuelle.ids.includes(id) ? actuelle.ids.filter((ancien) => ancien !== id)
        : actuelle.ids.length < carte.ascension.nombre ? [...actuelle.ids, id] : actuelle.ids;
      return ids === actuelle.ids ? actuelle : { ...actuelle, ids };
    });
  };
  const pourCreature = (duel, cote, entite, disponible = true) => {
    if (!rituel) return null;
    const numero = vue.ids.indexOf(entite?.id) + 1;
    const carte = cardById(vue.carteId);
    const eligible = Boolean(vue.cote === 'joueur' && cote === 'joueur' && disponible
      && duel?.joueur?.reserveAscension?.includes(vue.carteId)
      && timingAscensionValide(duel, 'joueur') && materiauAscensionValide(carte, entite));
    const cliquable = eligible && (numero > 0 || vue.ids.length < carte.ascension.nombre);
    return {
      eligible, numero, cliquable, cout: coutImprimeAscension(entite),
      label: `${entite?.name ?? 'Créature'}, coût imprimé ${coutImprimeAscension(entite) ?? 'inconnu'}, ${numero ? `sacrifice ${numero} sélectionné, retirer de l’Ascension` : cliquable ? 'sélectionner pour l’Ascension' : eligible ? 'sélection complète, retirez un sacrifice pour choisir cette créature' : 'indisponible pour cette Ascension'}`,
      onChoisir: () => choisir(duel, entite.id, disponible),
    };
  };
  return {
    cote: vue?.cote ?? null, carteId: vue?.carteId ?? null, ids: vue?.ids ?? AUCUN_MATERIAU,
    apercuId: vue?.apercuId ?? null, rituel, retourFocus: retourFocus.current,
    ouvrir, fermer, retour, fermerApercu, pourCreature,
    voir: (id, source) => {
      sourceApercu.current = source;
      setVue((actuelle) => actuelle ? { ...actuelle, apercuId: id } : actuelle);
    },
    preparer: (id) => setVue((actuelle) => actuelle?.cote === 'joueur'
      ? { ...actuelle, carteId: id, ids: actuelle.carteId === id ? actuelle.ids : [], apercuId: null, rituel: true } : actuelle),
    intercepterClick: (event) => {
      if (!rituel || event.target.closest(`${DANS_RESERVE}, [data-ascension-material], [data-ascension-side]`)) return;
      event.preventDefault(); event.stopPropagation();
    },
    intercepterPointer: (event) => {
      if (rituel && !event.target.closest(`${DANS_RESERVE}, [data-ascension-side]`)) event.stopPropagation();
    },
    intercepterContexte: (event) => {
      if (rituel) { event.preventDefault(); event.stopPropagation(); }
    },
    intercepterClavier: (event) => {
      if (!rituel || event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab' || event.target.closest(DANS_RESERVE)) return;
      if (['Enter', ' '].includes(event.key) && event.target.closest('button[data-ascension-material]:not(:disabled)')) return;
      event.preventDefault(); event.stopPropagation();
    },
  };
}

function SceauAscension() {
  return <svg viewBox="0 0 40 48" fill="none" aria-hidden="true" focusable="false">
    <path d="m20 3 16 11v20L20 45 4 34V14L20 3Z" stroke="currentColor" />
    <path d="m11 29 9-15 9 15M14 24h12M20 14v23" stroke="currentColor" strokeWidth="1.7" />
    <path d="m20 7 2 4-2 4-2-4 2-4Z" fill="currentColor" />
  </svg>;
}

/** Un emplacement réel, toujours visible, même réserve vide ou dépliée. */
export function ZoneReserveAscension({ duel, cote, onOpen, className = '', disponible = true, ouverte = false }) {
  const ids = duel?.[cote]?.reserveAscension ?? [];
  const prete = disponible && cote === 'joueur' && ids.some((id) => ascensionDisponible(duel, cote, id));
  return <button type="button"
    className={`rpg-ascension-zone ${className}${prete ? ' is-ready' : ''}${ouverte ? ' is-open' : ''}`}
    data-ascension-side={cote}
    aria-label={`Réserve d’Ascension ${cote === 'joueur' ? 'de votre camp' : 'adverse'} : ${ids.length} carte${ids.length === 1 ? '' : 's'}`}
    aria-haspopup="dialog" aria-expanded={ouverte}
    aria-controls={ouverte ? `rpg-ascension-reserve-${cote}` : undefined}
    title="Réserve d’Ascension · hors du paquet et de la pioche"
    onClick={(event) => onOpen(cote, event.currentTarget)}>
    <span className="rpg-ascension-zone__seal"><SceauAscension /></span>
    <span className="rpg-ascension-zone__label"><strong>Ascension</strong><small>Réserve · {ids.length}</small></span>
    {prete && <span className="rpg-ascension-zone__ready" aria-label="Une invocation est possible" />}
  </button>;
}

/** Se cale au-dessus du bouton sans déplacer le plateau. Si la réserve
 * adverse touche le haut d'un téléphone, seul ce cas se déplie vers le bas. */
function useAncrageReserve(ref, ancre, actif, cote, nombre) {
  const [position, setPosition] = useState({ visibility: 'hidden' });
  useLayoutEffect(() => {
    const popup = ref.current;
    const bouton = ancre?.isConnected ? ancre : document.querySelector(`[data-ascension-side="${cote}"]`);
    if (!actif || !popup || !bouton) return undefined;
    const placer = () => {
      const r = bouton.getBoundingClientRect(), mesure = popup.getBoundingClientRect(), largeur = mesure.width;
      const marge = 8, espace = 7, hauteurNaturelle = popup.scrollHeight + 2;
      const haut = r.top - marge - espace, bas = window.innerHeight - r.bottom - marge - espace;
      const dessus = haut >= Math.min(hauteurNaturelle, 160) || haut >= bas;
      const maxHeight = Math.min(270, Math.max(64, dessus ? haut : bas));
      const hauteur = Math.min(mesure.height, maxHeight);
      const left = Math.max(marge, Math.min(window.innerWidth - largeur - marge, r.left + (r.width - largeur) / 2));
      const top = Math.max(marge, dessus ? r.top - espace - hauteur : r.bottom + espace);
      const suivante = { left, top, maxHeight, visibility: 'visible', '--ascension-arrow-x': `${Math.max(12, Math.min(largeur - 12, r.left + r.width / 2 - left))}px` };
      popup.dataset.placement = dessus ? 'above' : 'below';
      setPosition((ancienne) => Object.keys(suivante).every((cle) => ancienne[cle] === suivante[cle]) ? ancienne : suivante);
    };
    placer();
    const observateur = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(placer);
    observateur?.observe(popup); observateur?.observe(bouton);
    window.addEventListener('resize', placer); window.addEventListener('scroll', placer, true);
    return () => { observateur?.disconnect(); window.removeEventListener('resize', placer); window.removeEventListener('scroll', placer, true); };
  }, [ref, ancre, actif, cote, nombre]);
  return position;
}

function ApercuAscension({ carte, selection, consultation, disponible, duel, HoverCardPreview, cartePourApercu, notesPourApercu }) {
  const fermerRef = useRef(null);
  useEffect(() => { fermerRef.current?.focus({ preventScroll: true }); }, [carte.id]);
  const preparable = !consultation && disponible && ascensionDisponible(duel, 'joueur', carte);
  return <div className="rpg-card-peek rpg-card-peek--catalogue rpg-ascension-card-preview" role="dialog" aria-modal="true" aria-label={`Aperçu de ${carte.name}`} data-ascension-preview={carte.id}
    onClick={(event) => { if (event.target === event.currentTarget || event.target.classList.contains('rpg-card-peek__backdrop')) selection.fermerApercu(); }}
    onPointerDown={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key !== 'Tab') return;
      const boutons = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
      if (event.shiftKey && document.activeElement === boutons[0]) { event.preventDefault(); boutons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === boutons.at(-1)) { event.preventDefault(); boutons[0]?.focus(); }
    }}>
    <div className="rpg-card-peek__backdrop" aria-hidden="true" />
    <div className="rpg-card-peek__panel">
      {HoverCardPreview ? <HoverCardPreview carte={cartePourApercu?.(carte) ?? carte} variante="catalogue" surface="RÉSERVE D’ASCENSION" />
        : <figure className="rpg-ascension-preview-fallback"><img src={cardArt(carte.id)} alt={carte.name} /><figcaption><h2>{carte.name}</h2><p>{carte.text}</p></figcaption></figure>}
      {(notesPourApercu?.(carte) ?? []).map((note) => <p key={note} className="rpg-ascension-note">{note}</p>)}
    </div>
    <div className="rpg-card-peek__bar">
      {!consultation && <button type="button" className="rpg-btn rpg-btn--primary rpg-ascension-prepare" disabled={!preparable} onClick={() => selection.preparer(carte.id)}>Choisir les sacrifices</button>}
      <button type="button" ref={fermerRef} className="rpg-btn rpg-btn--ghost rpg-ascension-preview-close" onClick={selection.fermerApercu}>Fermer l’aperçu</button>
      {!consultation && !preparable && <p className="rpg-ascension-preview-unavailable">{disponible && timingAscensionValide(duel, 'joueur') ? 'Les sacrifices requis ne sont pas encore réunis.' : 'Invocation disponible pendant votre phase principale, sans action en attente.'}</p>}
    </div>
  </div>;
}

function RituelAscension({ carte, duel, selection, disponible, onInvoquer, choixEmplacement }) {
  const ref = useRef(null);
  const titreId = useId();
  const condition = carte.ascension;
  const recette = validerMateriauxAscension(duel.joueur, carte, selection.ids);
  const total = selection.ids.reduce((n, id) => n + (coutImprimeAscension(duel.joueur.creatures.find((e) => e.id === id)) ?? 0), 0);
  const prete = disponible && ascensionDisponible(duel, 'joueur', carte) && recette.ok;
  const focaliserPlateau = () => ref.current?.closest('.moba, .rpg-battle')?.querySelector('button[data-ascension-material]:not(:disabled)')?.focus({ preventScroll: true });
  useEffect(() => { focaliserPlateau(); }, [carte.id]); // La sélection commence sur une vraie carte, pas dans une fenêtre.
  return <section ref={ref} className="rpg-ascension-ritual" role="region" aria-labelledby={titreId} inert={selection.apercuId ? true : undefined} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
    <button type="button" className="rpg-ascension-ritual-art" aria-label={`Voir l’aperçu de ${carte.name}`} onClick={(e) => selection.voir(carte.id, e.currentTarget)}><img src={cardArt(carte.id)} alt="" /></button>
    <button type="button" className="rpg-ascension-board-link" onClick={focaliserPlateau}>
      <small>ASCENSION · {libelleRecetteAscension(carte)}</small>
      <strong id={titreId}>{carte.name}</strong><span>Choisir sur le plateau</span>
    </button>
    <div className={`rpg-ascension-total${recette.ok ? ' is-exact' : selection.ids.length === condition.nombre ? ' is-invalid' : ''}`} role="status" aria-live="polite" aria-atomic="true">
      <strong>{selection.ids.map((id) => coutImprimeAscension(duel.joueur.creatures.find((e) => e.id === id)) ?? '?').join(' + ') || '0'} = {total}<small> / {condition.coutTotal}</small></strong>
      <span>{recette.ok ? 'Sacrifices prêts' : selection.ids.length === condition.nombre ? (ERREURS_ASCENSION[recette.raison] ?? 'Recette invalide') : `${selection.ids.length} / ${condition.nombre} sélectionnés`}</span>
    </div>
    <button type="button" className="rpg-ascension-invoke" disabled={!prete} onClick={() => { if (prete) onInvoquer(carte.id, [...selection.ids]); }}>{choixEmplacement ? 'Préparer l’Ascension' : 'Sacrifier et invoquer'}</button>
    <button type="button" className="rpg-ascension-cancel" aria-label="Annuler l’Ascension sans sacrifier" onClick={() => selection.fermer()}>×</button>
  </section>;
}

/** Petite réserve verticale, ancrée à sa zone. Les faces sont les véritables
 * TableCard du plateau ; un clic consulte uniquement leur aperçu. */
export default function ReserveAscension({ duel, cote, selection, onClose, onInvoquer = null, disponible = true, choixEmplacement = false, TableCard = null, HoverCardPreview = null, cartePourApercu = null, notesPourApercu = null }) {
  const ref = useRef(null);
  const titreId = useId();
  const ids = duel?.[cote]?.reserveAscension ?? [];
  const cartes = ids.map(cardById).filter((c) => c?.ascension);
  const carte = cartes.find((c) => c.id === selection.carteId) ?? null;
  const apercu = cartes.find((c) => c.id === selection.apercuId) ?? null;
  const consultation = !onInvoquer;
  const position = useAncrageReserve(ref, selection.retourFocus, !selection.rituel, cote, cartes.length);
  useEffect(() => {
    if (position.visibility === 'visible') {
      const premier = ref.current?.querySelector('[data-ascension-reserve-card]') ?? ref.current?.querySelector('.rpg-ascension-close');
      premier?.focus({ preventScroll: true });
    }
  }, [cote, position.visibility]);
  return <>
    {!selection.rituel && <aside ref={ref} id={`rpg-ascension-reserve-${cote}`} className="rpg-ascension-popover" style={position} role="dialog" aria-modal="false" aria-labelledby={titreId} inert={apercu ? true : undefined}
      onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} onKeyDown={(e) => e.stopPropagation()}>
      <header><div><h2 id={titreId}>Ascension</h2><small>{cote === 'joueur' ? 'Votre réserve' : 'Réserve adverse'} · {cartes.length}</small></div><button type="button" className="rpg-ascension-close" onClick={onClose} aria-label="Fermer la réserve d’Ascension">×</button></header>
      <div className="rpg-ascension-reserve-cards" role="list" aria-label="Cartes de la réserve d’Ascension">
        {cartes.map((c) => {
          const prete = !consultation && disponible && ascensionDisponible(duel, cote, c);
          const ouvrir = (e) => selection.voir(c.id, e.currentTarget);
          // Une face de lecture seulement, jamais une présence enregistrée en jeu.
          const entite = { ...c, id: `reserve-${cote}-${c.id}`, carteId: c.id, pv: c.def, pvMax: c.def, ready: false };
          return <div role="listitem" key={c.id} className={`rpg-ascension-reserve-item${prete ? ' is-ready' : ''}`}>
            {TableCard ? <TableCard entite={entite} cote={cote === 'joueur' ? 'joueur' : 'ennemi'} reserveAscension onClick={ouvrir} />
              : <button type="button" className="rpg-ascension-card-fallback" data-ascension-reserve-card={c.id} aria-label={`Voir l’aperçu de ${c.name}`} onClick={ouvrir}><img src={cardArt(c.id)} alt="" /><span>⚔ {c.atk} · ◆ {c.def}</span></button>}
            <span className="rpg-ascension-reserve-name">{c.name}</span>
            <span className="rpg-ascension-reserve-status">{consultation ? 'Voir l’aperçu' : prete ? '✦ Invocable' : 'Conditions à réunir'}</span>
          </div>;
        })}
        {!cartes.length && <p className="rpg-ascension-empty">Réserve vide</p>}
      </div>
    </aside>}
    {selection.rituel && carte && <RituelAscension carte={carte} duel={duel} selection={selection} disponible={disponible} onInvoquer={onInvoquer} choixEmplacement={choixEmplacement} />}
    {apercu && <ApercuAscension carte={apercu} duel={duel} selection={selection} consultation={consultation} disponible={disponible} HoverCardPreview={HoverCardPreview} cartePourApercu={cartePourApercu} notesPourApercu={notesPourApercu} />}
  </>;
}
