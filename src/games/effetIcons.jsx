/**
 * Les icônes d'effets en React — le pendant vivant d'`effetIcons.js`.
 *
 * Le sprite (21 symboles validés) s'injecte **une fois** par surface avec
 * `<EffetsSprite />` ; ensuite chaque icône n'est qu'un `<use>` sans coût.
 * Deux grammaires, comme sur la preview validée :
 * - les **pastilles** (`<PastillesCarte />`) : les mots-clés passifs d'une
 *   fiche, icône + libellé, sous la ligne de type ;
 * - les **badges** (`<IconesCarte />`) : l'icône seule, posée sur les faces
 *   de cartes (table, main, catalogue) où il n'y a pas la place du mot ;
 * - l'**interlignage** : une icône devant chaque ligne de règle (voir
 *   `RpgCardRules.jsx`, qui s'appuie sur `iconePourLigne`).
 *
 * Accessibilité : les icônes doublent l'information, elles ne la remplacent
 * jamais — le libellé reste porté par le `title` du badge et le texte de
 * règle reste écrit à côté.
 */
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EFFETS_SPRITE, EFFET_ICONE, effetsDetailles, pastillesPourCarte, iconePourLigne } from './effetIcons.js';
import './effet-icons.css';

/** Le sprite des 21 symboles, à monter une fois par écran (menu, duel, guide). */
export function EffetsSprite() {
  // Le contenu est une constante du module — aucun texte venu de l'extérieur.
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: EFFETS_SPRITE }}
    />
  );
}

/** Une icône du sprite : `<EffetIcone cle="butin" />` ou `cle="i-butin"`. */
export function EffetIcone({ cle, size = 14, className = '' }) {
  if (!cle) return null;
  const id = cle.startsWith('i-') ? cle : (EFFET_ICONE[cle] ?? 'i-degats');
  return (
    <svg
      className={`rpg-effet-icone${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <use href={`#${id}`} />
    </svg>
  );
}

/** Le libellé complet d'une pastille : « Furie 3 », « Protection Braise »… */
export const pastilleTexte = (pastille) => (
  pastille.valeur != null ? `${pastille.label} ${pastille.valeur}` : pastille.label
);

/**
 * La bulle d'une pastille : ce que fait l'effet, posée au-dessus du mot (ou
 * dessous, faute de place). Elle est rendue **hors** de la fiche (portail) :
 * les aperçus rognent ce qui dépasse, la bulle, elle, ne doit jamais l'être.
 * En plein écran, elle suit l'élément affiché en grand.
 */
function BulleEffet({ id, ancre, titre, description }) {
  const bulleRef = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const bulle = bulleRef.current;
    if (!bulle || !ancre) return;
    const cible = ancre.getBoundingClientRect();
    const boite = bulle.getBoundingClientRect();
    const largeurVue = window.innerWidth || document.documentElement.clientWidth || 1024;
    const marge = 8;
    const left = Math.max(marge, Math.min(cible.left + (cible.width / 2) - (boite.width / 2), largeurVue - boite.width - marge));
    const dessous = cible.top - boite.height - 8 < marge;
    const top = dessous ? cible.bottom + 8 : cible.top - boite.height - 8;
    setPosition({ left, top, dessous });
  }, [ancre, description]);
  if (typeof document === 'undefined') return null;
  const hote = document.fullscreenElement ?? document.body;
  return createPortal(
    <span
      ref={bulleRef}
      id={id}
      role="tooltip"
      className={`rpg-pastille-bulle${position?.dessous ? ' is-dessous' : ''}`}
      style={position ? { left: `${position.left}px`, top: `${position.top}px` } : { left: '-9999px', top: '0px', visibility: 'hidden' }}
    >
      <strong>{titre}</strong>
      {description}
    </span>,
    hote,
  );
}

/**
 * Une pastille qui s'explique : survolée (ou touchée, ou atteinte au clavier),
 * elle ouvre la bulle de ce que fait son effet. Le toucher ne traverse pas :
 * il n'ouvre ni ne referme la fiche qui l'accueille.
 */
export function PastilleEffet({ pastille }) {
  const id = useId();
  const ancreRef = useRef(null);
  const [survolee, setSurvolee] = useState(false);
  const [epinglee, setEpinglee] = useState(false);
  const texte = pastilleTexte(pastille);
  const ouverte = Boolean(pastille.description) && (survolee || epinglee);
  return (
    <span
      ref={ancreRef}
      className={`rpg-pastille${pastille.description ? ' rpg-pastille--explicable' : ''}${ouverte ? ' is-ouverte' : ''}`}
      role="listitem"
      tabIndex={pastille.description ? 0 : undefined}
      aria-describedby={ouverte ? id : undefined}
      aria-label={pastille.description ? `${texte} : ${pastille.description}` : undefined}
      data-pastille={pastille.cle}
      // La souris ouvre au survol ; le doigt, lui, ouvre et referme d'un toucher
      // (son survol émulé ne doit pas laisser la bulle collée).
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setSurvolee(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') { setSurvolee(false); setEpinglee(false); } }}
      onFocus={(event) => { if (event.currentTarget.matches?.(':focus-visible')) setSurvolee(true); }}
      onBlur={() => { setSurvolee(false); setEpinglee(false); }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        setEpinglee((valeur) => !valeur);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && ouverte) {
          event.stopPropagation();
          setSurvolee(false);
          setEpinglee(false);
        }
      }}
    >
      <EffetIcone cle={pastille.cle} size={13} />
      {texte}
      {ouverte && <BulleEffet id={id} ancre={ancreRef.current} titre={texte} description={pastille.description} />}
    </span>
  );
}

/**
 * Les pastilles d'une fiche : icône + libellé, dans l'ordre de lecture.
 * À poser sous la ligne de type (fiche, aperçu, catalogue, guide). Chaque
 * pastille dit ce qu'elle fait au survol — le texte imprimé de la carte
 * d'abord, le glossaire à défaut (`effetsDetailles`). `pastilles` permet de
 * passer une lecture déjà faite (l'aperçu s'en sert aussi pour son texte).
 */
export function PastillesCarte({ carte, pastilles: lues = null, className = '' }) {
  const pastilles = lues ?? effetsDetailles(carte).pastilles;
  if (!pastilles.length) return null;
  return (
    <span className={`rpg-pastilles${className ? ` ${className}` : ''}`} role="list" aria-label="Mots-clés et effets">
      {pastilles.map((pastille) => <PastilleEffet key={pastille.cle} pastille={pastille} />)}
    </span>
  );
}

/**
 * Les badges d'une face de carte : l'icône seule, en pastille ronde.
 * `entite` (sur la table) ajoute ses états vivants — infiltration accordée,
 * esquive courante, bouclier en place — aux mots-clés imprimés de la fiche.
 */
export function IconesCarte({ carte, entite = null, className = '' }) {
  const pastilles = pastillesPourCarte(carte);
  const ajouter = (cle, label, valeur = null) => {
    if (!cle || pastilles.some((pastille) => pastille.cle === cle)) return;
    pastilles.push({ cle, icone: EFFET_ICONE[cle] ?? 'i-degats', label, valeur });
  };
  if (entite) {
    if (entite.infiltration) ajouter('infiltration', 'Infiltration');
    if (entite.envol && !carte?.envol) ajouter('envol', 'Envol');
    if (entite.coupRapide && !carte?.coupRapide) ajouter('coupRapide', 'Coup rapide');
    if (entite.rapidite && !carte?.rapidite) ajouter('rapidite', 'Rapidité');
    if (entite.esquive) ajouter('esquive', 'Esquive', Number(entite.esquive) || null);
    if (entite.bouclier) ajouter('bouclier', 'Bouclier', Number(entite.bouclier) || null);
    if (entite.protection?.toursRestants > 0 || entite.protection?.permanente) {
      ajouter('protection', 'Protection');
    }
    if (entite.tenaciteDisponible) ajouter('tenacite', 'Tenacité');
  }
  if (!pastilles.length) return null;
  return (
    <span
      className={`rpg-card-icones${className ? ` ${className}` : ''}`}
      aria-label={`Effets : ${pastilles.map(pastilleTexte).join(', ')}`}
    >
      {pastilles.map((pastille) => (
        <span key={pastille.cle} className="rpg-card-icone" title={pastilleTexte(pastille)}>
          <EffetIcone cle={pastille.cle} size={12} />
          {pastille.valeur != null && <small>{pastille.valeur}</small>}
        </span>
      ))}
    </span>
  );
}

/** L'icône qui précède une ligne de règle (ou rien, si la ligne n'en porte pas). */
export function IconeLigneRegle({ carte, ligne }) {
  const cle = iconePourLigne(carte, ligne);
  if (!cle) return null;
  return <EffetIcone cle={cle} size={14} className="rpg-effet-icone--ligne" />;
}
