/**
 * Le Sablier — la vie et les compteurs, animés.
 * ---------------------------------------------
 * Deux animations, un seul module parce qu'elles racontent la même chose :
 * **ce qui compte coule comme du sable**.
 *
 * ## 1. La vie est du sable (`PlaqueVie`)
 *
 * La plaque d'un sorcier garde exactement la même structure et les mêmes
 * classes qu'avant (`.rpg-wizard-plate__pv`, `__hp-value`, `__hp-max`,
 * `__shield-value`, `.rpg-soin-montant`) — aucune disposition ne bouge. Ce qui
 * s'ajoute :
 *
 * - une **nappe de sable** derrière le chiffre, dont la hauteur suit
 *   `min(pv / base, 1)` : la vie qui baisse vide le verre, la vie qui monte le
 *   remplit ;
 * - au-dessus de la vie de base (25 PV), le rond reste plein et garde son
 *   diamètre ; seul le chiffre affiche les PV bonus ;
 * - un **roulage du nombre** : le chiffre compte jusqu'à sa nouvelle valeur
 *   quand on encaisse ou qu'on regagne des PV ;
 * - **six grains** qui quittent la plaque à chaque perte, et des variantes
 *   `a`/`b` pour que deux coups rapprochés jouent tous les deux leur geste ;
 * - une **veille** quand la vie tombe à 5 PV ou moins : un liseré chaud pulse,
 *   le jeu ne crie pas, il ralentit.
 *
 * Le roulage ne ment jamais : `.rpg-wizard-plate__hp-value` garde **toujours la
 * valeur vraie** (les lecteurs d'écran et les vérifications la lisent) ; c'est
 * un calque séparé, `aria-hidden`, qui affiche les nombres intermédiaires et
 * recouvre le chiffre le temps du geste.
 *
 * ## 2. Les compteurs de carte (`CompteurCarte`)
 *
 * Un compteur d'Heures ou de sable est un losange de 10 à 18 px : il ne peut
 * pas porter une grande animation. Son geste tient donc en trois signes, tous
 * sur l'élément lui-même :
 *
 * - il **naît** (pose) quand l'effet commence ;
 * - il **se vide** d'un grain et son chiffre repart quand une unité tombe ;
 * - à **une Heure restante**, il veille — liseré qui pulse et fêlure dans le
 *   verre : le joueur sait que l'effet va tomber avant de lire le journal.
 *
 * Toutes les animations de ce module respectent `prefers-reduced-motion` :
 * plus de roulage, plus de grains, plus de pulsation ; les couleurs, les
 * hauteurs de jauge et les valeurs restent (l'information ne disparaît jamais).
 */

import { useEffect, useRef, useState } from 'react';
import {
  RPG_COMPTEUR_DUREE,
  RPG_VIE_DUREE,
  RPG_VIE_GRAINS,
  classesVariation,
  dureeRoulageVie,
  etatJaugeVie,
  prefererMouvementReduit,
  sensVariation,
  valeurRouleeVie,
} from './rpgVieCompteurs.js';
import './rpg-vie-compteurs.css';

// Positions fixes des grains (fraction de la largeur, retard, taille, dérive) :
// le même geste à chaque coup, sans hasard au rendu — on reconnaît la perte.
const GRAINS_VIE = [
  { x: 12, d: 0, t: 3, dx: -3 },
  { x: 27, d: 90, t: 2, dx: 2 },
  { x: 43, d: 40, t: 3, dx: -2 },
  { x: 58, d: 140, t: 2, dx: 3 },
  { x: 74, d: 60, t: 3, dx: -3 },
  { x: 89, d: 120, t: 2, dx: 2 },
];

/**
 * La préférence de mouvement, tenue à jour : un joueur qui la change en cours
 * de partie n'a pas à recharger la table.
 */
function useMouvementReduit() {
  const [reduit, setReduit] = useState(prefererMouvementReduit);
  useEffect(() => {
    const requete = typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? null
      : window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!requete?.addEventListener) return undefined;
    const suivre = (evenement) => setReduit(Boolean(evenement.matches));
    requete.addEventListener('change', suivre);
    return () => requete.removeEventListener('change', suivre);
  }, []);
  return reduit;
}

/**
 * Le sens d'une variation et le jeton qui la rejoue.
 *
 * `pose` (facultatif) anime le premier rendu : sur une carte, un compteur qui
 * apparaît mérite un geste. Une plaque de vie, elle, n'arrive pas en jeu — elle
 * est là dès la première image, et n'a donc rien à poser.
 *
 * Le jeton revient à `stable` après la durée du geste : deux variations
 * rapprochées changent de variante et rejouent leur animation.
 */
function useVariation(element, reduit, { duree, pose = false } = {}) {
  const precedent = useRef(element);
  const jeton = useRef(0);
  const [etat, setEtat] = useState({ sens: pose ? 'pose' : 'stable', token: 0 });

  // Le premier geste (pose) s'éteint de lui-même.
  useEffect(() => {
    if (!pose || reduit) return undefined;
    const minuterie = window.setTimeout(() => {
      setEtat((courant) => (courant.sens === 'pose' ? { ...courant, sens: 'stable' } : courant));
    }, duree ?? RPG_COMPTEUR_DUREE);
    return () => window.clearTimeout(minuterie);
  }, [pose, reduit, duree]);

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = element;
    if (avant === element) return undefined;
    const sens = sensVariation(avant, element);
    if (sens === 'stable' || reduit) return undefined;
    jeton.current += 1;
    const token = jeton.current;
    setEtat({ sens, token });
    const minuterie = window.setTimeout(() => {
      setEtat((courant) => (courant.token === token ? { ...courant, sens: 'stable' } : courant));
    }, duree ?? RPG_COMPTEUR_DUREE);
    return () => window.clearTimeout(minuterie);
  }, [element, reduit, duree]);

  return etat;
}

/**
 * Le nombre affiché, qui roule jusqu'à sa cible.
 *
 * On part de la valeur **affichée** (pas de la précédente cible) : deux coups
 * reçus pendant un roulage repartent de là où le chiffre en est, sans saut.
 * Le roulage se relance à chaque changement de `valeur` et s'annule au
 * démontage : aucun état ne survit à la table.
 */
function useValeurRoulee(valeur, reduit) {
  const [affichee, setAffichee] = useState(valeur);
  const afficheeRef = useRef(valeur);
  const frameRef = useRef(0);

  useEffect(() => {
    const depart = afficheeRef.current;
    if (depart === valeur) return undefined;
    if (reduit) {
      afficheeRef.current = valeur;
      setAffichee(valeur);
      return undefined;
    }
    const duree = dureeRoulageVie(valeur - depart);
    // L'horloge est celle de `requestAnimationFrame` elle-même, prise à la
    // première image : `performance.now()` d'un autre contexte peut partir
    // d'une autre origine et faire tourner le roulage indéfiniment.
    let debut = null;
    const pas = (maintenant) => {
      if (debut === null) debut = maintenant;
      const t = duree > 0 ? (maintenant - debut) / duree : 1;
      if (t >= 1) {
        afficheeRef.current = valeur;
        setAffichee(valeur);
        return;
      }
      const courante = valeurRouleeVie(depart, valeur, t);
      const atteinte = courante === valeur;
      afficheeRef.current = courante;
      setAffichee(courante);
      if (!atteinte) frameRef.current = window.requestAnimationFrame(pas);
      else afficheeRef.current = valeur;
    };
    frameRef.current = window.requestAnimationFrame(pas);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [valeur, reduit]);

  useEffect(() => () => window.cancelAnimationFrame(frameRef.current), []);

  return affichee;
}

/**
 * La plaque de vie d'un camp — le chiffre et sa jauge de sable.
 *
 * `base` est le seuil du rond plein (25 PV). Le record `pvMax` n'en change
 * ni le remplissage ni le diamètre, et n'est pas ajouté au chiffre.
 */
export function PlaqueVie({ pv, pvMax, bouclier = 0, soin = null, base = 25 }) {
  const reduit = useMouvementReduit();
  const { sens, token } = useVariation(pv, reduit, { duree: RPG_VIE_DUREE });
  const affichee = useValeurRoulee(pv, reduit);
  const jauge = etatJaugeVie({ pv, pvMax, base });
  const roule = affichee !== pv;

  const classes = [
    'rpg-wizard-plate__pv',
    'rpg-jauge-vie',
    sens === 'stable' ? '' : classesVariation(sens, token),
    jauge.critique ? 'is-critique' : '',
    jauge.vide ? 'is-vide' : '',
    roule ? 'is-roulage' : '',
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      data-vie-sens={sens}
      data-vie-token={token}
      style={{
        '--rpg-jauge-part': jauge.part.toFixed(4),
        '--rpg-jauge-base': jauge.basePart.toFixed(4),
        '--rpg-jauge-reserve': jauge.reserve.toFixed(4),
      }}
    >
      {/* Masque d'écrêtage : le rond qui contient le nombre de PV et l'effet de vie qui baisse */}
      <span className="rpg-jauge-vie__rond" aria-hidden="false">
        <span className="rpg-jauge-vie__nappe" aria-hidden="true">
          <span className="rpg-jauge-vie__sable" />
          {jauge.reserve > 0 && <span className="rpg-jauge-vie__reserve" />}
          {jauge.basePart < 1 && <span className="rpg-jauge-vie__trait" />}
        </span>
        {sens === 'perte' && !reduit && (
          <span key={token} className="rpg-jauge-vie__grains" aria-hidden="true">
            {Array.from({ length: RPG_VIE_GRAINS }, (_, index) => {
              const grain = GRAINS_VIE[index % GRAINS_VIE.length];
              return (
                <i
                  key={index}
                  className="rpg-jauge-vie__grain"
                  style={{ '--x': `${grain.x}%`, '--d': `${grain.d}ms`, '--t': `${grain.t}px`, '--dx': `${grain.dx}px` }}
                />
              );
            })}
          </span>
        )}
        {/* Le chiffre vrai, toujours à jour, désormais centré et écrêté au rond */}
        <span className="rpg-jauge-vie__chiffre">
          <span className="rpg-wizard-plate__hp-value">{pv}</span>
          {roule && <span className="rpg-jauge-vie__roule" aria-hidden="true">{affichee}</span>}
        </span>
      </span>
      <span className="rpg-wizard-plate__hp-icon rpg-wizard-plate__hp-icon--shield" aria-hidden="true">🛡</span>
      <span className="rpg-wizard-plate__hp-icon rpg-wizard-plate__hp-icon--heart" aria-hidden="true">♥</span>
      {bouclier > 0 && <span className="rpg-wizard-plate__shield-value">· ◇ {bouclier}</span>}
      {soin && <span key={soin.token} className="rpg-soin-montant" aria-hidden="true">+{soin.montant}</span>}
    </span>
  );
}

/**
 * Un compteur chiffré posé sur une carte : les Heures d'un effet, le sable
 * d'une arme. Le losange et ses classes restent ceux de la feuille
 * (`rpg-battle.css`) ; ce module n'ajoute que l'état de variation.
 *
 * `type` : `heures` ou `sable` (les autres compteurs gardent leur symbole, ils
 * ne changent pas de valeur). `valeur` : le nombre restant.
 */
export function CompteurCarte({ type, valeur, titre = '' }) {
  const reduit = useMouvementReduit();
  const { sens, token } = useVariation(valeur, reduit, { duree: RPG_COMPTEUR_DUREE, pose: true });
  const derniere = type === 'heures' && Number(valeur) === 1;

  const classes = [
    'rpg-card__compteur',
    `rpg-card__compteur--${type}`,
    sens === 'stable' ? '' : classesVariation(sens, token),
    derniere ? 'is-derniere' : '',
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      data-compteur={type}
      data-compteur-sens={sens}
      title={titre || undefined}
    >
      <i className="rpg-compteur__passe" aria-hidden="true" />
      <span>{valeur}</span>
    </span>
  );
}

export default PlaqueVie;
