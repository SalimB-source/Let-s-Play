/**
 * Les icônes d'effets en React — le pendant vivant d'`effetIcons.js`.
 *
 * Le sprite (26 symboles validés) s'injecte **une fois** par surface avec
 * `<EffetsSprite />` ; ensuite chaque icône n'est qu'un `<use>` sans coût.
 * Deux grammaires, comme sur la preview validée :
 * - les **pastilles** (`<PastillesCarte />`) : les mots-clés d'une fiche,
 *   icône + libellé, sous la ligne de type — l'aperçu n'imprime plus la
 *   règle : **chaque mot-clé porte son « ? » et ouvre sa bulle au survol**
 *   (au toucher et au focus clavier aussi) ;
 * - les **badges** (`<IconesCarte />`) : l'icône seule, posée sur les faces
 *   de cartes (table, main, catalogue) où il n'y a pas la place du mot ;
 * - l'**interlignage** : une icône devant chaque ligne de règle (voir
 *   `RpgCardRules.jsx`, qui s'appuie sur `iconePourLigne`) — réservé aux
 *   surfaces de lecture (grille du catalogue, guide), où le texte reste
 *   écrit en entier.
 */
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EFFETS_SPRITE,
  EFFET_ICONE,
  couleurProtection,
  couleursProtectionCarte,
  effetsDetailles,
  effetsEpuisesPourEntite,
  effetsFurieInactifs,
  pastillesPourCarte,
  iconePourLigne,
} from './effetIcons.js';
import './effet-icons.css';

/** Le sprite des 26 symboles, à monter une fois par écran (menu, duel, guide). */
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
export function EffetIcone({ cle, size = 14, className = '', style = undefined, protectionContre = undefined }) {
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
      style={style}
      data-protection-contre={protectionContre}
      aria-hidden="true"
    >
      <use href={`#${id}`} />
    </svg>
  );
}

/**
 * L'icône d'une pastille. Une Protection élémentaire se teinte de l'élément
 * qu'elle repousse ; une Protection double montre donc deux boucliers, un
 * par couleur. Le Sable n'a pas de teinte propre : son icône garde l'or.
 */
function IconePastille({ pastille, size = 13 }) {
  const contres = pastille.cle === 'protection' ? (pastille.contres ?? []) : [];
  if (!contres.length) return <EffetIcone cle={pastille.cle} size={size} />;
  return (
    <span className="rpg-protection-icones">
      {contres.map((contre) => {
        const couleur = couleurProtection(contre);
        return (
          <EffetIcone
            key={contre}
            cle="protection"
            size={size}
            protectionContre={contre}
            style={couleur ? { color: couleur } : undefined}
          />
        );
      })}
    </span>
  );
}

/**
 * Le libellé complet d'une pastille : « Furie 3 », « Protection Braise »…
 * Une pastille dont la valeur est masquée (le Harakiri) se lit d'un seul
 * mot : le nombre reste dans la donnée, pas dans le nom affiché.
 */
export const pastilleTexte = (pastille) => (
  pastille.cle !== 'bouclier' && pastille.valeur != null && !pastille.valeurMasquee
    ? `${pastille.label} ${pastille.valeur}`
    : pastille.label
);

const PROTECTION_LIBELLES = {
  braise: 'Braise',
  eau: 'Eau',
  sable: 'Sable',
  neige: 'Neige',
  tenebres: 'Ténèbres',
};

/**
 * La teinte élémentaire d'une Protection, portée par la pastille ou le badge
 * entier : le CSS s'en sert pour le glyphe, les mots « Protection <élément> »
 * et le cercle qui entoure l'icône. Le Sable n'écrit aucune variable et garde
 * donc l'or ordinaire.
 */
function styleProtectionPastille(pastille) {
  if (pastille?.cle !== 'protection') return undefined;
  const couleur = (pastille.contres ?? []).map(couleurProtection).find(Boolean);
  return couleur ? { '--rpg-protection-couleur': couleur } : undefined;
}

/**
 * Le nom d'une pastille. Une Protection simple prend directement sa couleur ;
 * une Protection double colore chaque élément séparément (« Protection Eau »
 * en bleu, « Neige » en bleu clair).
 */
function LibellePastille({ pastille }) {
  const texte = pastilleTexte(pastille);
  const contres = pastille.cle === 'protection' ? (pastille.contres ?? []) : [];
  if (contres.length === 1) {
    const couleur = couleurProtection(contres[0]);
    return couleur ? <span style={{ color: couleur }}>{texte}</span> : texte;
  }
  if (contres.length < 2) return texte;
  return (
    <>
      {contres.map((contre, index) => {
        const couleur = couleurProtection(contre);
        const separateur = index === 0 ? '' : (index === contres.length - 1 ? ' et ' : ', ');
        const libelle = `${index === 0 ? 'Protection ' : ''}${PROTECTION_LIBELLES[contre] ?? contre}`;
        return (
          <span key={contre}>
            {separateur}
            <span style={couleur ? { color: couleur } : undefined}>{libelle}</span>
          </span>
        );
      })}
    </>
  );
}

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
 *
 * Le mot seul s'écrit sur la pastille : son explication reste dans la bulle.
 * Un « ? » cerclé au bout du mot — et le curseur d'aide — annoncent que la
 * description se lit au survol : l'aperçu d'une carte n'imprime plus la règle,
 * ses mots-clés sont la seule porte vers elle.
 */
export function PastilleEffet({ pastille, epuise = false, inactif = false }) {
  const id = useId();
  const ancreRef = useRef(null);
  const [survolee, setSurvolee] = useState(false);
  const [epinglee, setEpinglee] = useState(false);
  const texte = pastilleTexte(pastille);
  const explication = pastille.description ? String(pastille.description) : '';
  const ouverte = Boolean(explication) && (survolee || epinglee);
  const mentionEtat = epuise
    ? (pastille.cle === 'tenacite' ? 'déjà utilisée' : pastille.cle === 'bouclier' ? 'tombé' : 'déjà utilisé')
    : inactif ? 'Furie non active' : '';
  return (
    <span
      ref={ancreRef}
      className={`rpg-pastille${epuise ? ' is-epuisee' : ''}${inactif ? ' is-inactif' : ''}${explication ? ' rpg-pastille--explicable' : ''}${ouverte ? ' is-ouverte' : ''}`}
      role="listitem"
      tabIndex={explication ? 0 : undefined}
      aria-describedby={ouverte ? id : undefined}
      aria-label={explication
        ? `${texte}${mentionEtat ? ` — ${mentionEtat}` : ''} : ${explication}`
        : undefined}
      data-pastille={pastille.cle}
      data-effet-epuise={epuise ? 'true' : undefined}
      data-effet-inactif={inactif ? 'true' : undefined}
      data-protection-contre={pastille.contres?.length ? pastille.contres.join(' ') : undefined}
      style={styleProtectionPastille(pastille)}
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
      <IconePastille pastille={pastille} size={13} />
      <LibellePastille pastille={pastille} />
      {ouverte && <BulleEffet id={id} ancre={ancreRef.current} titre={<LibellePastille pastille={pastille} />} description={explication} />}
    </span>
  );
}

/**
 * Les pastilles d'une fiche : icône + libellé, dans l'ordre de lecture.
 * À poser sous la ligne de type (fiche, aperçu, catalogue, guide). Chaque
 * pastille dit ce qu'elle fait au survol — le texte imprimé de la carte
 * d'abord, le glossaire à défaut (`effetsDetailles`). `pastilles` permet de
 * passer une lecture déjà faite. Les aperçus de carte n'impriment plus le
 * texte de règle : leurs pastilles sont la seule façon d'y lire un effet.
 */
export function PastillesCarte({
  carte,
  pastilles: lues = null,
  className = '',
  effetsEpuises = [],
  // `null` : hors de la table, les gains conditionnels ne sont pas encore là.
  // Une preview en Furie passe explicitement la liste vide pour les réveiller.
  effetsInactifs = null,
}) {
  const pastilles = lues ?? effetsDetailles(carte).pastilles;
  const epuises = new Set(effetsEpuises ?? []);
  const inactifs = new Set(effetsInactifs ?? effetsFurieInactifs(carte));
  if (!pastilles.length) return null;
  return (
    <span
      className={`rpg-pastilles${className ? ` ${className}` : ''}`}
      role="list"
      aria-label="Mots-clés et effets"
    >
      {pastilles.map((pastille) => (
        <PastilleEffet
          key={pastille.cle}
          pastille={pastille}
          epuise={epuises.has(pastille.cle)}
          inactif={inactifs.has(pastille.cle)}
        />
      ))}
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
  const ajouter = (cle, label, valeur = null, details = {}) => {
    if (!cle || pastilles.some((pastille) => pastille.cle === cle)) return;
    pastilles.push({ cle, icone: EFFET_ICONE[cle] ?? 'i-degats', label, valeur, ...details });
  };
  if (entite) {
    if (entite.infiltration) ajouter('infiltration', 'Infiltration');
    if (entite.envol && !carte?.envol) ajouter('envol', 'Envol');
    if (entite.coupRapide && !carte?.coupRapide) ajouter('coupRapide', 'Attaque ciblée');
    if (entite.provocation) ajouter('provocation', 'Provocation');
    if (entite.rapidite && !carte?.rapidite) ajouter('rapidite', 'Rapidité');
    if (entite.overkill) ajouter('overkill', 'Overkill');
    if (entite.esquive) ajouter('esquive', 'Esquive', null);
    if (entite.contreAttaque && !carte?.contreAttaque) ajouter('contreAttaque', 'Contre-attaque');
    if (entite.bouclier) ajouter('bouclier', 'Bouclier', Number(entite.bouclier) || null);
    if (entite.protection?.toursRestants > 0 || entite.protection?.permanente) {
      const contres = [...new Set([entite.protection?.contre].flat(Infinity).filter(Boolean))];
      const labels = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };
      const label = contres.length
        ? `Protection ${contres.map((contre) => labels[contre] ?? contre).join(' et ')}`
        : 'Protection';
      ajouter('protection', label, null, { contres });
    }
    if (entite.tenaciteDisponible) ajouter('tenacite', 'Tenacité');
  }
  const epuises = new Set(effetsEpuisesPourEntite(carte, entite));
  const inactifs = new Set(effetsFurieInactifs(carte, entite));
  const texteBadge = (pastille) => (
    `${pastilleTexte(pastille)}${epuises.has(pastille.cle)
      ? (pastille.cle === 'tenacite' ? ' (déjà utilisée)' : ' (tombé)')
      : inactifs.has(pastille.cle) ? ' (Furie non active)' : ''}`
  );
  if (!pastilles.length) return null;
  const rendreBadge = (pastilleBadge, key) => (
    <span
      key={key}
      className={`rpg-card-icone${epuises.has(pastilleBadge.cle) ? ' is-epuisee' : ''}${inactifs.has(pastilleBadge.cle) ? ' is-inactif' : ''}`}
      data-effet={pastilleBadge.cle}
      data-effet-epuise={epuises.has(pastilleBadge.cle) ? 'true' : undefined}
      data-effet-inactif={inactifs.has(pastilleBadge.cle) ? 'true' : undefined}
      data-protection-contre={pastilleBadge.contres?.length ? pastilleBadge.contres.join(' ') : undefined}
      style={styleProtectionPastille(pastilleBadge)}
    >
      <IconePastille pastille={pastilleBadge} size={12} />
      {pastilleBadge.valeur != null && !pastilleBadge.valeurMasquee && <small>{pastilleBadge.valeur}</small>}
    </span>
  );
  return (
    <span
      className={`rpg-card-icones${className ? ` ${className}` : ''}`}
      aria-label={`Effets : ${pastilles.map(texteBadge).join(', ')}`}
    >
      {pastilles.flatMap((pastille) => (
        pastille.cle === 'protection' && pastille.contres?.length > 1
          // Deux éléments, deux cercles : chacun porte sa propre couleur.
          ? pastille.contres.map((contre) => rendreBadge(
            { ...pastille, contres: [contre] },
            `${pastille.cle}-${contre}`,
          ))
          : [rendreBadge(pastille, pastille.cle)]
      ))}
    </span>
  );
}

/** L'icône qui précède une ligne de règle (ou rien, si la ligne n'en porte pas). */
export function IconeLigneRegle({ carte, ligne, epuise = false }) {
  const cle = iconePourLigne(carte, ligne);
  if (!cle) return null;
  const classeIcone = `rpg-effet-icone--ligne${epuise ? ' is-epuisee' : ''}`;
  if (cle === 'protection') {
    const contres = couleursProtectionCarte(carte);
    if (contres.length) {
      return (
        <span className="rpg-protection-icones rpg-protection-icones--ligne">
          {contres.map((contre) => {
            const couleur = couleurProtection(contre);
            return (
              <EffetIcone
                key={contre}
                cle="protection"
                size={14}
                className={classeIcone}
                protectionContre={contre}
                style={couleur ? { color: couleur } : undefined}
              />
            );
          })}
        </span>
      );
    }
  }
  return <EffetIcone cle={cle} size={14} className={classeIcone} />;
}
