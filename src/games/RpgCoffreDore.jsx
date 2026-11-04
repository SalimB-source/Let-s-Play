/**
 * Le coffre de quête de la rampe, sur l'accueil du bureau.
 *
 * Il remplace le médaillon circulaire frappé du nombre de crédits : même
 * information, mais présentée comme un butin à ouvrir plutôt que comme une
 * ligne de compte — la grammaire visuelle du reste du jeu mobile.
 *
 * **Le métal suit le gain** (`rpgCoffreMetal.js`) : bronze pour les petites
 * quêtes, argent pour les moyennes, or pour les grosses, le Cachet et la
 * Semaine. La couleur annonce la valeur avant que le chiffre soit lu.
 *
 * Le volume est **peint**, pas calculé : flanc droit, couvercle bombé avec son
 * dessus visible, ferrures, rivets, platine de serrure, pierre sertie, reflet
 * spéculaire et ombre portée — dans un seul SVG. Cinq coffres vivent sur cet
 * écran ; cinq contextes WebGL de plus auraient coûté bien plus cher qu'un
 * dégradé, pour un résultat qui ne bouge pas. La profondeur vient du dessin,
 * le mouvement d'une transformation CSS en 3D.
 *
 * Trois états, les mêmes que la rangée mobile : `encours` (verrouillé, métal
 * éteint), `pret` (halo, couvercle qui se soulève, butin qui luit, éclats),
 * `ouvert` (couvercle grand ouvert, métal assombri — la récompense est déjà en
 * bourse).
 *
 * Le nom du fichier parle d'« or » pour ne pas casser les sélecteurs existants
 * (`data-coffre-dore`, `.rpg-coffre-dore`) ; le métal réel est dit par
 * `data-coffre-metal`, dont le CSS se sert pour le halo et la plaquette.
 */
import { useId } from 'react';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import { metalPourGain, paletteCoffre } from './rpgCoffreMetal.js';
import './rpg-coffre-dore.css';

/* La caisse et le couvercle, réutilisés comme silhouettes de découpe : les
   ferrures et les reflets doivent rester dedans, même quand le bombé du
   couvercle les couperait. */
const SILHOUETTE_CAISSE = 'M10 42h60v26a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4Z';
const SILHOUETTE_DOME = 'M10 42V34a30 20 0 0 1 60 0v8Z';

export default function RpgCoffreDore({
  etat = 'encours', montant = null, metal: metalForce = null,
  sousTitre = null, onClick = null, title = null, ...reste
}) {
  // `useId` contient des deux-points : on les ôte pour des `url(#…)` tranquilles.
  const brut = useId();
  const id = `coffre-${brut.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const metal = metalForce ?? metalPourGain(montant);
  const p = paletteCoffre(metal);
  const ouvert = etat === 'ouvert';
  const Balise = onClick ? 'button' : 'div';

  return (
    <Balise
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`rpg-coffre-dore is-${etat}${onClick ? ' is-cliquable' : ''}`}
      data-coffre-dore={etat}
      data-coffre-metal={metal}
      data-coffre-dore-montant={montant ?? undefined}
      title={title ?? undefined}
      {...reste}
    >
      <span className="rpg-coffre-dore__halo" aria-hidden="true" />
      <svg className="rpg-coffre-dore__dessin" viewBox="0 0 96 88" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.face[0]} />
            <stop offset="26%" stopColor={p.face[1]} />
            <stop offset="68%" stopColor={p.face[2]} />
            <stop offset="100%" stopColor={p.face[3]} />
          </linearGradient>
          <linearGradient id={`${id}-cote`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={p.cote[0]} />
            <stop offset="100%" stopColor={p.cote[1]} />
          </linearGradient>
          <linearGradient id={`${id}-dessus`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor={p.dessus[0]} />
            <stop offset="38%" stopColor={p.dessus[1]} />
            <stop offset="100%" stopColor={p.dessus[2]} />
          </linearGradient>
          {/* Le dessus du couvercle regarde le ciel : c'est lui qui prend le
              plus de lumière, donc la palette la plus claire. */}
          <linearGradient id={`${id}-sommet`} x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0%" stopColor={p.dessus[0]} />
            <stop offset="100%" stopColor={p.dessus[1]} />
          </linearGradient>
          <linearGradient id={`${id}-bande`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.bande[0]} />
            <stop offset="45%" stopColor={p.bande[1]} />
            <stop offset="100%" stopColor={p.bande[2]} />
          </linearGradient>
          <linearGradient id={`${id}-reflet`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.reflet} stopOpacity=".95" />
            <stop offset="100%" stopColor={p.reflet} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-gemme`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={p.gemme[0]} />
            <stop offset="50%" stopColor={p.gemme[1]} />
            <stop offset="100%" stopColor={p.gemme[2]} />
          </linearGradient>
          <radialGradient id={`${id}-lueur`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={p.lueur[0]} stopOpacity=".98" />
            <stop offset="100%" stopColor={p.lueur[1]} stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-dome`}><path d={SILHOUETTE_DOME} /></clipPath>
          <clipPath id={`${id}-caisse`}><path d={SILHOUETTE_CAISSE} /></clipPath>
        </defs>

        {/* L'ombre portée assoit le coffre sur la rampe. */}
        <ellipse className="rpg-coffre-dore__ombre" cx="48" cy="79" rx="33" ry="5" />

        {/* Ce qui attend dedans : la gueule sombre, la lueur, et trois pièces
            qui affleurent. Tout ça n'apparaît que couvercle levé. */}
        <g className="rpg-coffre-dore__interieur">
          <ellipse cx="40" cy="42" rx="30" ry="8.5" fill={p.face[3]} />
          <ellipse cx="40" cy="40" rx="27" ry="8" fill={`url(#${id}-lueur)`} />
          <g className="rpg-coffre-dore__butin">
            <ellipse cx="29" cy="41" rx="6" ry="2.6" fill={`url(#${id}-bande)`} />
            <ellipse cx="51" cy="41.5" rx="6" ry="2.6" fill={`url(#${id}-bande)`} />
            <ellipse cx="40" cy="38.5" rx="6.5" ry="2.8" fill={`url(#${id}-bande)`} />
            <ellipse cx="40" cy="37.8" rx="4" ry="1.5" fill={p.bande[0]} opacity=".75" />
          </g>
        </g>

        <g className="rpg-coffre-dore__caisse">
          {/* Le flanc droit : c'est lui qui donne l'épaisseur. */}
          <path d="M70 42 82 35v26L70 72Z" fill={`url(#${id}-cote)`} />
          <path d={SILHOUETTE_CAISSE} fill={`url(#${id}-face)`} />

          <g clipPath={`url(#${id}-caisse)`}>
            {/* Les planches, et l'ombre que le couvercle porte sur la caisse. */}
            <path d="M10 53h60M10 63h60" stroke={p.face[3]} strokeWidth="1" opacity=".22" />
            <rect x="10" y="42" width="60" height="5" fill={p.face[3]} opacity=".38" />
            {/* La traverse basse et les deux ferrures verticales. */}
            <rect x="10" y="64" width="60" height="8" fill={`url(#${id}-bande)`} opacity=".95" />
            <rect x="19" y="42" width="8" height="30" fill={`url(#${id}-bande)`} />
            <rect x="53" y="42" width="8" height="30" fill={`url(#${id}-bande)`} />
            {/* Un liseré clair sur le bord gauche de chaque ferrure : la
               lumière vient de là, c'est ce qui les décolle de la caisse. */}
            <path d="M19.6 42v30M53.6 42v30" stroke={p.bande[0]} strokeWidth="1.1" opacity=".7" />
          </g>

          {/* Les rivets, aux quatre coins des ferrures. */}
          <g fill={p.bande[0]}>
            <circle cx="23" cy="48" r="1.5" opacity=".9" />
            <circle cx="57" cy="48" r="1.5" opacity=".9" />
            <circle cx="23" cy="68" r="1.5" opacity=".7" />
            <circle cx="57" cy="68" r="1.5" opacity=".7" />
          </g>

          {/* Les pieds : le coffre ne flotte pas au-dessus de son ombre. */}
          <path d="M15 72h9v3a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2Z" fill={p.cote[1]} />
          <path d="M56 72h9v3a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2Z" fill={p.cote[1]} />

          {/* La platine de serrure reste sur la caisse : quand le couvercle se
              lève, c'est le moraillon qui se sépare, pas la serrure qui suit. */}
          <g className="rpg-coffre-dore__serrure">
            <path d="M31 42h18v9a9 9 0 0 1-18 0Z" fill={`url(#${id}-bande)`} stroke={p.face[3]} strokeWidth="1" />
            <path d="M34 44h12v7a6 6 0 0 1-12 0Z" fill={p.face[3]} opacity=".28" />
            <circle cx="40" cy="49" r="2.5" fill={p.cote[1]} />
            <path d="M38.9 49h2.2l.8 5.6h-3.8Z" fill={p.cote[1]} />
          </g>
        </g>

        <g className="rpg-coffre-dore__couvercle">
          {/* Le dessus visible du bombé, entre l'arête avant et l'arête
              arrière : c'est cette bande qui fait lire le volume. */}
          <path d="M10 34a30 20 0 0 1 60 0l12-7a30 20 0 0 0-60 0Z" fill={`url(#${id}-sommet)`} />
          <path d="M70 34 82 27v8l-12 7Z" fill={`url(#${id}-cote)`} />
          <path d={SILHOUETTE_DOME} fill={`url(#${id}-dessus)`} />

          <g clipPath={`url(#${id}-dome)`}>
            <rect x="19" y="8" width="8" height="36" fill={`url(#${id}-bande)`} />
            <rect x="53" y="8" width="8" height="36" fill={`url(#${id}-bande)`} />
            <path d="M19.6 8v36M53.6 8v36" stroke={p.bande[0]} strokeWidth="1.1" opacity=".7" />
            {/* Le reflet spéculaire, en biais sur la bosse. */}
            <ellipse cx="31" cy="26" rx="14" ry="7" fill={`url(#${id}-reflet)`} opacity=".6" transform="rotate(-18 31 26)" />
            {/* L'ombre portée par la jointure, en bas du couvercle. */}
            <rect x="10" y="38" width="60" height="4" fill={p.face[3]} opacity=".35" />
          </g>

          {/* L'arête qui accroche la lumière tout en haut du bombé. */}
          <path d="M10 34a30 20 0 0 1 60 0" fill="none" stroke={p.reflet} strokeWidth="1.4" opacity=".45" />
          <path d="M22 27a30 20 0 0 1 60 0" fill="none" stroke={p.reflet} strokeWidth="1" opacity=".3" />

          {/* Le moraillon, pendant du couvercle au-dessus de la serrure. */}
          <rect x="35" y="35" width="10" height="8" rx="2" fill={`url(#${id}-bande)`} stroke={p.face[3]} strokeWidth=".8" />

          {/* La pierre sertie : même taille pour les trois métaux, mais un
             ambre, un bleu de glace ou un rubis selon le palier. */}
          <g className="rpg-coffre-dore__gemme">
            <path d="M40 18.5 46.5 25 40 31.5 33.5 25Z" fill={`url(#${id}-gemme)`} stroke={p.face[3]} strokeWidth=".9" />
            <path d="M40 18.5 46.5 25H40Z" fill="#ffffff" opacity=".3" />
            <path d="M40 25h6.5L40 31.5Z" fill="#000000" opacity=".18" />
            <circle cx="37.7" cy="22.7" r="1.1" fill="#ffffff" opacity=".85" />
          </g>
        </g>

        {/* Les éclats qui dansent autour quand le coffre est prêt. */}
        <g className="rpg-coffre-dore__eclats">
          <path d="M81 10l1.96 5.04L88 17l-5.04 1.96L81 24l-1.96-5.04L74 17l5.04-1.96Z" />
          <path d="M13 10l1.4 3.6L18 15l-3.6 1.4L13 20l-1.4-3.6L8 15l3.6-1.4Z" />
          <path d="M87 46l1.12 2.88L91 50l-2.88 1.12L87 54l-1.12-2.88L83 50l2.88-1.12Z" />
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
