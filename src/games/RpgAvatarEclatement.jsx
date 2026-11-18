import { useEffect, useState } from 'react';
import './rpg-avatar-eclatement.css';
import { DUREE_ECLATEMENT_MAX, DUREE_REPLIQUE, ECLATS_AVATAR, GRILLE_ECLATS } from './rpgAvatarEclats.js';
import { dureeAnimation } from './rpgAnimations.js';

/** Éclatement de l'avatar du camp PERDANT, à la fin du duel.
 *
 * Le composant est purement décoratif (`aria-hidden`, `pointer-events: none`) :
 * il n'intercepte ni le clic sur la plaque ni les flèches de ciblage. Il n'est
 * monté QUE quand `vainqueur` est posé et que les animations ne sont pas
 * réduites ; le gagnant, lui, reste intact.
 *
 * La fin se joue en trois états, jamais superposés :
 *
 *  1. **la réplique** (`DUREE_REPLIQUE`) : l'avatar est encore entier, il dit
 *     sa dernière phrase dans une bulle posée près du médaillon ;
 *  2. **les éclats** (`DUREE_ECLATEMENT_MAX`) : le disque se brise, mille
 *     morceaux volent, l'éclair doré marque le choc ;
 *  3. **le cratère** : une fois les éclats retombés, il reste la marque ronde
 *     et brûlée à l'endroit exact où le personnage se tenait — elle demeure
 *     jusqu'à la relance, donc jusqu'au démontage du composant.
 *
 * `image` est l'URL du WebP détouré déjà utilisé par la plaque : aucune image
 * nouvelle, aucun PNG transparent. Chaque `<i>` porte une tranche de ce
 * portrait sur un fond doré OPAQUE, découpée par `background-position`, et sa
 * propre trajectoire (variables CSS calculées dans `rpgAvatarEclats.js`).
 * `replique` est le texte dit par le personnage (voir `rpgRepliquesDefaite.js`) ;
 * sans lui, le composant saute l'état 1 et la feuille n'attend rien — la page
 * pose `--rpg-replique-delai` à 0 dans ce cas, la démo autonome aussi.
 */
export default function RpgAvatarEclatement({ image, camp = 'joueur', replique = null }) {
  // Sans réplique, les éclats sont déjà là au premier rendu — c'est le cas de
  // la démo autonome, et celui du rendu statique (aucun effet ne s'y exécute).
  const [eclate, setEclate] = useState(() => !replique);
  const [termine, setTermine] = useState(false);
  const attente = replique ? DUREE_REPLIQUE : 0;

  useEffect(() => {
    setEclate(false);
    setTermine(false);
    if (!image) return undefined;
    const timers = [];
    // Les deux minuteurs partagent la même horloge (`dureeAnimation`) et la
    // même origine que les délais CSS : les trois états basculent ensemble,
    // quel que soit le réglage de vitesse.
    if (attente > 0) timers.push(setTimeout(() => setEclate(true), dureeAnimation(attente)));
    else setEclate(true);
    timers.push(setTimeout(() => setTermine(true), dureeAnimation(attente + DUREE_ECLATEMENT_MAX)));
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [image, attente]);

  if (!image) return null;
  return (
    <span
      className={`rpg-avatar-eclatement${eclate ? ' is-eclate' : ''}${termine ? ' is-cratere' : ''}`}
      data-camp={camp}
      data-phase={termine ? 'cratere' : eclate ? 'eclats' : 'replique'}
      aria-hidden="true"
      style={{
        '--rpg-eclat-image': `url("${image}")`,
        '--rpg-eclat-case': `${100 / GRILLE_ECLATS}%`,
        '--rpg-eclat-position': `${100 / (GRILLE_ECLATS - 1)}%`,
        '--rpg-eclat-taille': `${GRILLE_ECLATS * 100}%`,
      }}
    >
      {!eclate && replique && (
        <span className="rpg-avatar-eclatement__replique">{replique}</span>
      )}
      {eclate && <span className="rpg-avatar-eclatement__cratere" />}
      {eclate && !termine && ECLATS_AVATAR.map((eclat) => (
        <i
          key={eclat.id}
          className={`rpg-avatar-eclatement__eclat rpg-avatar-eclatement__eclat--${eclat.forme}`}
          style={eclat.style}
        />
      ))}
      {eclate && !termine && <span className="rpg-avatar-eclatement__flash" />}
    </span>
  );
}
