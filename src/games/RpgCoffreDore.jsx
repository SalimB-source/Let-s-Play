/**
 * Le coffre doré de la rampe des quêtes, sur l'accueil du bureau.
 *
 * Il remplace le médaillon circulaire frappé du nombre de crédits : même
 * information, mais présentée comme un butin à ouvrir plutôt que comme une
 * ligne de compte — la grammaire visuelle du reste du jeu mobile.
 *
 * Le volume est **peint**, pas calculé : faces latérales, dégradés d'or,
 * reflet spéculaire et ombre portée, dans un seul SVG. Cinq coffres vivent sur
 * cet écran ; cinq contextes WebGL de plus auraient coûté bien plus cher qu'un
 * dégradé, pour un résultat qui ne bouge pas. La profondeur vient du dessin,
 * le mouvement d'une transformation CSS en 3D.
 *
 * Trois états, les mêmes que la rangée mobile : `encours` (verrouillé, or
 * éteint), `pret` (halo, couvercle qui se soulève, il se tape), `ouvert`
 * (couvercle grand ouvert, or assombri — la récompense est déjà en bourse).
 */
import { useId } from 'react';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import './rpg-coffre-dore.css';

export default function RpgCoffreDore({
  etat = 'encours', montant = null, sousTitre = null, onClick = null, title = null, ...reste
}) {
  // `useId` contient des deux-points : on les ôte pour des `url(#…)` tranquilles.
  const brut = useId();
  const id = `coffre-${brut.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const ouvert = etat === 'ouvert';
  const pret = etat === 'pret';
  const Balise = onClick ? 'button' : 'div';

  return (
    <Balise
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`rpg-coffre-dore is-${etat}${onClick ? ' is-cliquable' : ''}`}
      data-coffre-dore={etat}
      data-coffre-dore-montant={montant ?? undefined}
      title={title ?? undefined}
      {...reste}
    >
      <span className="rpg-coffre-dore__halo" aria-hidden="true" />
      <svg className="rpg-coffre-dore__dessin" viewBox="0 0 76 70" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffdf8c" />
            <stop offset="30%" stopColor="#eab63a" />
            <stop offset="70%" stopColor="#b8811a" />
            <stop offset="100%" stopColor="#6f4a09" />
          </linearGradient>
          <linearGradient id={`${id}-cote`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8f6212" />
            <stop offset="100%" stopColor="#4f3405" />
          </linearGradient>
          <linearGradient id={`${id}-dessus`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#ffeaa6" />
            <stop offset="34%" stopColor="#f6c445" />
            <stop offset="100%" stopColor="#a8720f" />
          </linearGradient>
          <linearGradient id={`${id}-bande`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffeeb0" />
            <stop offset="45%" stopColor="#c99320" />
            <stop offset="100%" stopColor="#5e3d05" />
          </linearGradient>
          <linearGradient id={`${id}-reflet`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffdf3" stopOpacity=".92" />
            <stop offset="100%" stopColor="#fffdf3" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-lueur`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff4c9" stopOpacity=".95" />
            <stop offset="100%" stopColor="#ffca4a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* L'ombre portée assoit le coffre sur la rampe. */}
        <ellipse className="rpg-coffre-dore__ombre" cx="38" cy="63" rx="26" ry="4.6" />

        {/* Ce qui brille à l'intérieur, révélé quand le couvercle se lève. */}
        <ellipse className="rpg-coffre-dore__interieur" cx="38" cy="33" rx="24" ry="9" fill={`url(#${id}-lueur)`} />

        <g className="rpg-coffre-dore__caisse">
          {/* Face de droite : c'est elle qui donne l'épaisseur. */}
          <path d="M60 33l8-5v25l-8 5Z" fill={`url(#${id}-cote)`} />
          <path d="M8 33h52v25a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill={`url(#${id}-face)`} />
          {/* Le creux sous le couvercle. */}
          <path d="M8 33h52v4H8Z" fill="#5f3f06" opacity=".45" />
          <rect x="16" y="33" width="6" height="29" fill={`url(#${id}-bande)`} />
          <rect x="46" y="33" width="6" height="29" fill={`url(#${id}-bande)`} />
          <circle cx="19" cy="38" r="1.5" fill="#fff2bd" opacity=".85" />
          <circle cx="49" cy="38" r="1.5" fill="#fff2bd" opacity=".85" />
          <circle cx="19" cy="57" r="1.5" fill="#fff2bd" opacity=".6" />
          <circle cx="49" cy="57" r="1.5" fill="#fff2bd" opacity=".6" />
        </g>

        <g className="rpg-coffre-dore__couvercle">
          <path d="M60 33l8-5v-6a25 13 0 0 0-8-11Z" fill={`url(#${id}-cote)`} />
          <path d="M8 33v-8a25 13 0 0 1 52 0v8Z" fill={`url(#${id}-dessus)`} />
          <path d="M13 27a20 9.5 0 0 1 42 0v2.5H13Z" fill={`url(#${id}-reflet)`} />
          <rect x="16" y="17" width="6" height="16" fill={`url(#${id}-bande)`} />
          <rect x="46" y="17" width="6" height="16" fill={`url(#${id}-bande)`} />
          <path d="M8 31h52v2H8Z" fill="#7d5209" opacity=".5" />
        </g>

        {/* La platine de serrure, par-dessus la jointure. */}
        <g className="rpg-coffre-dore__serrure">
          <rect x="30" y="28" width="16" height="17" rx="4" fill={`url(#${id}-bande)`} stroke="#6d4708" strokeWidth="1" />
          <circle cx="38" cy="35" r="2.6" fill="#4a3105" />
          <path d="M36.9 35h2.2l.7 5.4h-3.6Z" fill="#4a3105" />
        </g>

        {/* L'éclat qui passe sur l'or quand le coffre est prêt. */}
        <g className="rpg-coffre-dore__eclats">
          <path d="M64 16l1.6 4.4L70 22l-4.4 1.6L64 28l-1.6-4.4L58 22l4.4-1.6Z" />
          <path d="M11 12l1.1 3L15 16l-2.9 1L11 20l-1.1-3L7 16l2.9-1Z" />
        </g>
      </svg>

      {montant != null && (
        <span className="rpg-coffre-dore__montant">
          {ouvert ? (
            /* Une coche gravée, pas le glyphe : il manque dans certaines
               polices et laisserait la place vide. */
            <svg className="rpg-coffre-dore__coche" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : <RpgCreditIcon />}
          <strong>{montant}</strong>
        </span>
      )}
      {sousTitre && <span className="rpg-coffre-dore__sous">{sousTitre}</span>}
    </Balise>
  );
}
