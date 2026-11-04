/**
 * Le coffre de quête de la rampe, sur l'accueil du bureau.
 *
 * **Un vrai cube en 3D CSS**, plus un volume peint dans un SVG. La caisse et le
 * couvercle sont deux boîtes de six faces ; la scène a une perspective, et
 * chaque face est placée dans l'espace. C'est ce qui permet au coffre de
 * *tourner* : quand le curseur s'approche, l'objet s'incline vers lui et l'on
 * voit réellement un autre flanc — un SVG pivoté n'aurait montré qu'une carte
 * qui se penche.
 *
 * Le métal suit le gain (`rpgCoffreMetal.js`) : bronze, argent, or — et violet
 * pour le Coffre de la semaine, qui se demande explicitement. La palette est
 * injectée en variables CSS pour que le dessin et le style lisent la même
 * source.
 *
 * Le parti pris graphique : des angles francs mais des faces arrondies, un
 * cadre sombre qui cerne un panneau clair bombé, des clous aux quatre coins et
 * un large blason de serrure. Le couvercle déborde légèrement la caisse, comme
 * sur un vrai coffre — c'est ce débord qui fait lire « coffre » plutôt que
 * « boîte ».
 *
 * Trois états : `encours` (fermé, métal éteint), `pret` (couvercle entrouvert,
 * halo, butin qui luit), `ouvert` (grand ouvert, métal assombri).
 *
 * Le gain se pose sous le coffre par défaut, ou à sa droite (`gain="droite"`)
 * quand la description de la quête passe en dessous : il devient alors le
 * second point focal de la ligne, en gros, avec son « + ».
 *
 * L'interaction :
 *   - le pointeur incline le cube (`--penche-x` / `--penche-y`) ;
 *   - survoler un coffre prêt soulève davantage le couvercle ;
 *   - le cliquer fait jaillir une gerbe de pièces, puis réclame la récompense ;
 *   - un coffre verrouillé répond par une secousse : « pas encore » ;
 *   - le clavier garde le bouton natif (Entrée / Espace) et l'anneau de focus ;
 *   - `prefers-reduced-motion` coupe l'inclinaison et les animations, mais
 *     garde le volume, les états et la gerbe absente.
 *
 * Le nom du fichier parle d'« or » pour ne pas casser les sélecteurs existants
 * (`data-coffre-dore`, `.rpg-coffre-dore`) ; le métal réel est dit par
 * `data-coffre-metal`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import { metalPourGain, variablesCoffre } from './rpgCoffreMetal.js';
import './rpg-coffre-dore.css';

/** Les pièces de la gerbe : assez pour la fête, pas assez pour noyer la rampe. */
const PIECES = [0, 1, 2, 3, 4, 5];

/** L'inclinaison maximale offerte au curseur, en degrés. */
const PENCHE_X = 14;
const PENCHE_Y = 26;

const mouvementReduit = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

/** Une face de boîte ; `garniture` porte les ferrures, la serrure, la gemme. */
function Face({ cote, garniture = null }) {
  return (
    <span className={`rpg-coffre-dore__face rpg-coffre-dore__face--${cote}`}>
      {garniture}
    </span>
  );
}

export default function RpgCoffreDore({
  etat = 'encours', montant = null, metal: metalForce = null, gain = 'dessous',
  sousTitre = null, onClick = null, title = null, style = null, ...reste
}) {
  const metal = metalForce ?? metalPourGain(montant);
  const ouvert = etat === 'ouvert';
  const pret = etat === 'pret';
  const Balise = onClick ? 'button' : 'div';

  const [penche, setPenche] = useState({ x: 0, y: 0 });
  const [gerbe, setGerbe] = useState(false);
  const [secousse, setSecousse] = useState(false);
  const minuteurs = useRef([]);

  // Les minuteries ne survivent pas au coffre : sans ça, réclamer puis quitter
  // l'écran laisserait un setState sur un composant démonté.
  useEffect(() => () => { minuteurs.current.forEach(clearTimeout); }, []);

  const programmer = useCallback((fn, ms) => {
    const t = setTimeout(fn, ms);
    minuteurs.current.push(t);
  }, []);

  const survol = useCallback((evt) => {
    if (mouvementReduit()) return;
    const boite = evt.currentTarget.getBoundingClientRect();
    if (!boite.width || !boite.height) return;
    const dx = (evt.clientX - boite.left) / boite.width - 0.5;
    const dy = (evt.clientY - boite.top) / boite.height - 0.5;
    setPenche({ x: dy * PENCHE_X, y: dx * PENCHE_Y });
  }, []);

  const repos = useCallback(() => setPenche({ x: 0, y: 0 }), []);

  const clic = useCallback((evt) => {
    if (!pret) {
      // Verrouillé : on le fait tressauter plutôt que de rester muet.
      if (!mouvementReduit()) {
        setSecousse(true);
        programmer(() => setSecousse(false), 420);
      }
      return;
    }
    if (!mouvementReduit()) {
      setGerbe(true);
      programmer(() => setGerbe(false), 780);
    }
    // La récompense part tout de suite : l'animation accompagne le geste,
    // elle ne le retarde pas.
    onClick?.(evt);
  }, [pret, onClick, programmer]);

  const aDroite = gain === 'droite';
  const classes = [
    'rpg-coffre-dore',
    `is-${etat}`,
    onClick ? 'is-cliquable' : 'is-verrouille',
    aDroite ? 'is-gain-droite' : '',
    gerbe ? 'is-gerbe' : '',
    secousse ? 'is-secousse' : '',
  ].filter(Boolean).join(' ');

  return (
    <Balise
      {...(onClick ? { type: 'button', onClick: clic } : { onPointerDown: clic })}
      className={classes}
      data-coffre-dore={etat}
      data-coffre-metal={metal}
      data-coffre-dore-montant={montant ?? undefined}
      data-coffre-gain={gain}
      title={title ?? undefined}
      onPointerMove={survol}
      onPointerLeave={repos}
      style={{
        ...variablesCoffre(metal),
        '--penche-x': `${penche.x.toFixed(2)}deg`,
        '--penche-y': `${penche.y.toFixed(2)}deg`,
        ...style,
      }}
      {...reste}
    >
      <span className="rpg-coffre-dore__halo" aria-hidden="true" />

      <span className="rpg-coffre-dore__scene" aria-hidden="true">
        <span className="rpg-coffre-dore__ombre" />

        <span className="rpg-coffre-dore__dessin">
          <span className="rpg-coffre-dore__cube">

            {/* ── La caisse : cinq faces, le dessus est la gueule ouverte ── */}
            <span className="rpg-coffre-dore__caisse">
              <Face cote="arriere" />
              <Face cote="gauche" />
              <Face cote="droite" garniture={<span className="rpg-coffre-dore__ferrure" />} />
              <Face cote="fond" />
              <Face
                cote="avant"
                garniture={(
                  <>
                    <span className="rpg-coffre-dore__ferrure rpg-coffre-dore__ferrure--g" />
                    <span className="rpg-coffre-dore__ferrure rpg-coffre-dore__ferrure--d" />
                    <span className="rpg-coffre-dore__traverse" />
                    <span className="rpg-coffre-dore__clous" />
                    <span className="rpg-coffre-dore__serrure">
                      <span className="rpg-coffre-dore__trou" />
                    </span>
                  </>
                )}
              />
              {/* Le fond du coffre, à la place du dessus : sombre, avec ce qui
                  brille dedans et trois pièces posées à plat. */}
              <span className="rpg-coffre-dore__gueule">
                <span className="rpg-coffre-dore__lueur" />
                <span className="rpg-coffre-dore__piece rpg-coffre-dore__piece--1" />
                <span className="rpg-coffre-dore__piece rpg-coffre-dore__piece--2" />
                <span className="rpg-coffre-dore__piece rpg-coffre-dore__piece--3" />
              </span>
            </span>

            {/* ── Le couvercle : six faces, charnière sur l'arête arrière ── */}
            <span className="rpg-coffre-dore__couvercle">
              <Face cote="arriere" />
              <Face cote="gauche" />
              <Face cote="droite" garniture={<span className="rpg-coffre-dore__ferrure" />} />
              <Face cote="dessous" />
              <Face cote="avant" garniture={(
                <>
                  <span className="rpg-coffre-dore__ferrure rpg-coffre-dore__ferrure--g" />
                  <span className="rpg-coffre-dore__ferrure rpg-coffre-dore__ferrure--d" />
                  <span className="rpg-coffre-dore__moraillon" />
                </>
              )}
              />
              <Face
                cote="dessus"
                garniture={(
                  <>
                    <span className="rpg-coffre-dore__ferrure rpg-coffre-dore__ferrure--g" />
                    <span className="rpg-coffre-dore__ferrure rpg-coffre-dore__ferrure--d" />
                    <span className="rpg-coffre-dore__clous" />
                    <span className="rpg-coffre-dore__gemme" />
                  </>
                )}
              />
            </span>
          </span>
        </span>

        {/* La gerbe jaillit à plat, par-dessus : des pièces qui pleuvent. */}
        <span className="rpg-coffre-dore__gerbe">
          {PIECES.map((i) => (
            <i key={i} className="rpg-coffre-dore__eclat" style={{ '--i': i }} />
          ))}
        </span>
      </span>

      {montant != null && (
        <span className="rpg-coffre-dore__montant">
          {ouvert ? (
            /* Une coche gravée, pas le glyphe : il manque dans certaines
               polices et laisserait la place vide. */
            <svg className="rpg-coffre-dore__coche" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : <RpgCreditIcon />}
          <strong>{aDroite && !ouvert ? `+${montant}` : montant}</strong>
        </span>
      )}
      {sousTitre && <span className="rpg-coffre-dore__sous">{sousTitre}</span>}
    </Balise>
  );
}
