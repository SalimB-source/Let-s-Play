/**
 * La rangée de coffres de l'accueil mobile — src/games/RpgCoffresQuetes.jsx
 * =======================================================================
 * Le bas de l'écran d'accueil, à la façon d'un jeu mobile d'arène : quatre
 * emplacements alignés, chacun portant son coffre, sa jauge et son gain. Ici
 * les coffres ne se déverrouillent pas avec le temps mais avec le jeu :
 *
 *   - une quête en cours → coffre verrouillé, la jauge dit où on en est ;
 *   - une quête finie → coffre **prêt**, il bondit et n'attend qu'un tap ;
 *   - une quête réclamée → coffre ouvert, coché, grisé.
 *
 * Le Coffre du cycle (les trois quêtes) et le Coffre de la semaine (sept jours)
 * ajoutent des paquets de cartes à leurs crédits : leur pastille « cartes » le
 * dit avant l'ouverture, pour que la surprise soit annoncée, pas cachée.
 *
 * Aucune arithmétique ici : `vueDesCoffres` (rpgCoffresQuetes.js) dit tout, et
 * le composant relaie les gestes du portefeuille.
 */
import { creditsLisible } from './rpgCredits.js';
import { legendeCoffre, vueDesCoffres } from './rpgCoffresQuetes.js';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import './rpg-coffres-quetes.css';

/**
 * Le coffre lui-même, en volume : un corps, un couvercle bombé, deux ferrures
 * et une serrure. Tout est vectoriel — aucune dépendance à une police emoji,
 * aucun asset à télécharger. La couleur vient de `--coffre-teinte`.
 */
export function CoffreSvg({ ouvert = false }) {
  return (
    <svg className={`rpg-coffre-svg${ouvert ? ' is-ouvert' : ''}`} viewBox="0 0 64 58" aria-hidden="true" focusable="false">
      <ellipse className="rpg-coffre-svg__ombre" cx="32" cy="53" rx="23" ry="4" />
      <g className="rpg-coffre-svg__ensemble">
        <g className="rpg-coffre-svg__corps">
          <path className="rpg-coffre-svg__caisse" d="M7 27h50v19a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5Z" />
          <path className="rpg-coffre-svg__ombre-corps" d="M7 40h50v6a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5Z" />
          <rect className="rpg-coffre-svg__ferrure" x="13" y="27" width="5" height="24" />
          <rect className="rpg-coffre-svg__ferrure" x="46" y="27" width="5" height="24" />
        </g>
        {/* La gueule : le creux vide, révélé seulement une fois le coffre
            encaissé. Dessinée avant le couvercle pour que, fermé, il la cache. */}
        <g className="rpg-coffre-svg__gueule">
          <ellipse cx="32" cy="27" rx="25" ry="5" />
          <ellipse cx="32" cy="28.2" rx="20" ry="3.2" />
        </g>
        <g className="rpg-coffre-svg__couvercle">
          <path className="rpg-coffre-svg__dessus" d="M7 27v-6a25 13 0 0 1 50 0v6Z" />
          <path className="rpg-coffre-svg__reflet" d="M12 21a20 9 0 0 1 40 0v2H12Z" />
          <rect className="rpg-coffre-svg__ferrure" x="13" y="15" width="5" height="12" />
          <rect className="rpg-coffre-svg__ferrure" x="46" y="15" width="5" height="12" />
        </g>
        <g className="rpg-coffre-svg__serrure">
          <rect x="26" y="24" width="12" height="13" rx="3" />
          <circle cx="32" cy="30" r="2.1" />
          <rect x="31.1" y="30" width="1.8" height="4.4" rx=".9" />
        </g>
      </g>
    </svg>
  );
}

/** Un emplacement : le coffre, son état, sa jauge, son gain. */
function SlotCoffre({ coffre, onOuvrir, large = false }) {
  const pret = coffre.etat === 'pret';
  const ouvert = coffre.etat === 'ouvert';
  const libelle = coffre.etat === 'pret'
    ? `${coffre.nom} prêt : ${coffre.titre}. Ouvrir pour ${coffre.credits} crédits${coffre.paquets ? ` et ${coffre.paquets} paquet${coffre.paquets > 1 ? 's' : ''} de cartes` : ''}.`
    : `${coffre.nom} — ${coffre.titre} : ${coffre.texte} ${coffre.progres} sur ${coffre.objectif}. Récompense : ${coffre.credits} crédits${coffre.paquets ? ` et ${coffre.paquets} paquet${coffre.paquets > 1 ? 's' : ''} de cartes` : ''}.${ouvert ? ' Déjà ouvert.' : ''}`;

  return (
    <li
      className={`rpg-coffres-quetes__slot is-${coffre.etat}${large ? ' rpg-coffres-quetes__slot--large' : ''}`}
      style={{ '--coffre-teinte': coffre.teinte, '--coffre-pct': `${coffre.pourcent}%` }}
      data-coffre={coffre.cle}
      data-coffre-etat={coffre.etat}
      data-coffre-genre={coffre.genre}
      data-coffre-paquets={coffre.paquets}
    >
      <button
        type="button"
        className="rpg-coffres-quetes__bouton"
        disabled={!pret}
        aria-label={libelle}
        title={pret ? `Ouvrir le ${coffre.nom.toLowerCase()}` : coffre.texte}
        onClick={() => onOuvrir?.(coffre)}
      >
        <span className="rpg-coffres-quetes__etat" data-coffre-legende={legendeCoffre(coffre)}>
          {legendeCoffre(coffre)}
        </span>

        <span className="rpg-coffres-quetes__scene">
          <span className="rpg-coffres-quetes__halo" aria-hidden="true" />
          <CoffreSvg ouvert={ouvert} />
          {coffre.paquets > 0 && (
            <span className="rpg-coffres-quetes__cartes" aria-hidden="true" title={`${coffre.paquets} paquet(s) de cartes`}>
              {coffre.paquets}
            </span>
          )}
        </span>

        <span className="rpg-coffres-quetes__titre">{coffre.titre}</span>

        <span className="rpg-coffres-quetes__gain">
          <RpgCreditIcon />
          <b>{creditsLisible(coffre.credits)}</b>
        </span>

        <span
          className="rpg-coffres-quetes__jauge"
          role="progressbar"
          aria-label={`${coffre.titre} : ${coffre.progres} sur ${coffre.objectif}`}
          aria-valuenow={coffre.progres}
          aria-valuemin={0}
          aria-valuemax={coffre.objectif}
        >
          <span className="rpg-coffres-quetes__jauge-remplie" style={{ width: `${coffre.pourcent}%` }} />
        </span>
      </button>
    </li>
  );
}

export default function RpgCoffresQuetes({ quetes, onOuvrirQuete, onOuvrirCycle, onOuvrirSemaine, onPlaySfx }) {
  const vue = vueDesCoffres(quetes);

  const ouvrir = (coffre) => {
    if (coffre.etat !== 'pret') return;
    onPlaySfx?.('select');
    if (coffre.cle === 'cycle') { onOuvrirCycle?.(coffre); return; }
    if (coffre.cle === 'semaine') { onOuvrirSemaine?.(coffre); return; }
    onOuvrirQuete?.(coffre);
  };

  return (
    <section className="rpg-coffres-quetes" aria-labelledby="coffres-quetes-titre" data-coffres-prets={vue.prets}>
      <h3 id="coffres-quetes-titre" className="sr-only">
        Coffres du jour{vue.prets > 0 ? ` (${vue.prets} à ouvrir)` : ''} — finissez les quêtes pour les gagner
      </h3>
      <ul className="rpg-coffres-quetes__rail">
        {vue.slots.map((coffre) => (
          <SlotCoffre key={coffre.cle} coffre={coffre} onOuvrir={ouvrir} />
        ))}
        <SlotCoffre coffre={vue.semaine} onOuvrir={ouvrir} large />
      </ul>
    </section>
  );
}
