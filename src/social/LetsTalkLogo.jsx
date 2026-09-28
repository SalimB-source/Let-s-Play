import React, { useId } from 'react';
import { LETS_TALK_COLORS as COLORS, LETS_TALK_LOGOS } from './letsTalkLogoData';

/**
 * Logo « Let’s Talk » — l’identité propre de la messagerie.
 * ---------------------------------------------------------------------------
 * Un cousin du logo Let’s Play (même lettrage italique très gras, même
 * extrusion violette vers le bas à droite, même liseré), rendu distinct par
 * le cyan de « Talk » et par son emblème : une bulle de discussion inclinée
 * qui porte les trois points « en train d’écrire ».
 *
 * Trois variantes, tracées par `scripts/lets-talk-logo/build_logo.py`
 * (données dans `letsTalkLogoData.js`, SVG autonomes dans `public/`) :
 *
 *   - `horizontal` : bulle + « Let’s Talk » sur une ligne (lanceur, fenêtre
 *     sociale, en-tête de la page /messages, menu mobile) ;
 *   - `stacked`    : « Let’s » au-dessus de « Talk », comme le logo Let’s Play
 *     (grands formats : invitation à se connecter) ;
 *   - `mark`       : la bulle seule, carrée (onglets, petits formats).
 *
 * Le dessin est le même sur les deux thèmes : le liseré et l’extrusion violets
 * tiennent le contraste sur fond sombre comme sur fond clair. La taille se
 * règle en CSS (hauteur ; la largeur suit la viewBox).
 *
 * Accessibilité : avec `title`, le SVG est une image nommée ; sans, il est
 * décoratif (`aria-hidden`) — le texte voisin ou l’`aria-label` du bouton
 * porte alors le nom.
 *
 * `typing` fait onduler les trois points (messages non lus) ; l’animation est
 * coupée si l’utilisateur demande moins de mouvement (voir social.css).
 */
export default function LetsTalkLogo({ variant = 'horizontal', title, typing = false, className = '', style, ...rest }) {
  const logo = LETS_TALK_LOGOS[variant] || LETS_TALK_LOGOS.horizontal;
  // Plusieurs logos cohabitent (lanceur + fenêtre + onglet) : chaque instance
  // a ses propres identifiants de dégradé et de forme. `useId` peut produire
  // des « : » ou des « « » », invalides dans `url(#…)` : on ne garde que le sûr.
  const uid = `lt-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const solidId = `${uid}-solid`;
  const cyanId = `${uid}-cyan`;
  const [ex, ey] = logo.extrude;
  const stepLength = Math.hypot(ex, ey) / logo.steps;
  const layers = [];
  for (let i = logo.steps - 1; i > 0; i -= 1) layers.push(i);

  const a11y = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true, focusable: 'false' };
  const classes = ['lets-talk-logo', `lets-talk-logo--${variant}`, typing ? 'is-typing' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={logo.viewBox}
      className={classes}
      // Le ratio de la viewBox : une seule dimension CSS suffit (hauteur ou
      // largeur), l'autre suit sans déformer le logo.
      style={{ aspectRatio: `${logo.width} / ${logo.height}`, ...style }}
      {...a11y}
      {...rest}
    >
      <defs>
        <linearGradient id={cyanId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.cyanTop} />
          <stop offset=".55" stopColor={COLORS.cyanMid} />
          <stop offset="1" stopColor={COLORS.cyanBottom} />
        </linearGradient>
        {/* Silhouette pleine (lettres + bulle) : la base de l’extrusion. */}
        <g id={solidId}>
          {logo.lets && <path d={logo.lets} />}
          {logo.talk && <path d={logo.talk} />}
          <path d={logo.bubble} />
        </g>
      </defs>
      <g strokeLinejoin="round">
        {/* Extrusion : la face arrière (avec son arête sombre), puis des
            copies intermédiaires qui comblent le volume jusqu’à la face. */}
        <use
          href={`#${solidId}`}
          transform={`translate(${ex} ${ey})`}
          fill={COLORS.extrude}
          stroke={COLORS.rim}
          strokeWidth={logo.rim * 2}
        />
        <g fill={COLORS.extrude} stroke={COLORS.extrude} strokeWidth={stepLength * 1.8}>
          {layers.map((i) => (
            <use
              key={i}
              href={`#${solidId}`}
              transform={`translate(${(ex * i) / logo.steps} ${(ey * i) / logo.steps})`}
            />
          ))}
        </g>
        {/* Faces : « Let’s » blanc, « Talk » et la bulle en cyan. */}
        <g stroke={COLORS.outline} strokeWidth={logo.stroke}>
          {logo.lets && <path d={logo.lets} fill={COLORS.white} />}
          {logo.talk && <path d={logo.talk} fill={`url(#${cyanId})`} />}
          <path d={logo.bubble} fill={`url(#${cyanId})`} />
        </g>
        <g className="lets-talk-logo-dots" fill={COLORS.dots}>
          {logo.dots.map((d, index) => (
            <path key={d} d={d} className={`lets-talk-logo-dot lets-talk-logo-dot-${index + 1}`} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** La bulle seule (variante carrée), pour les onglets et petits formats. */
export function LetsTalkMark(props) {
  return <LetsTalkLogo variant="mark" {...props} />;
}
