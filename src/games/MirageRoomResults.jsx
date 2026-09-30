import React, { useEffect, useId, useRef } from 'react';
import MirageScoreboard from './MirageScoreboard';
import { rankLabel } from './mirageStandings';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Fenêtre « résultats » d'une course en ligne : posée par-dessus le salon dès que
 * le joueur franchit la ligne, avec le tableau des positions. Le tableau reste
 * vivant : les cavaliers encore en piste s'y rangent au fil de leur arrivée.
 *
 * @param {object}   standings  classement (buildRoomStandings)
 * @param {object}   [result]   résultat de la course du joueur ({ score, gems })
 * @param {object}   [xp]       XP gagnée (applyRun)
 * @param {boolean}  [busy]     une commande du salon est en cours
 * @param {Function} onClose    referme la fenêtre (le salon garde le classement)
 * @param {Function} onLeave    quitte le salon
 */
export default function MirageRoomResults({ standings, result = null, xp = null, busy = false, onClose, onLeave }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const primaryRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  // Focus sur l'action principale, Échap pour fermer, Tab qui reste dans la fenêtre.
  useEffect(() => {
    const previous = document.activeElement;
    primaryRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) || [])];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (!inside || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, []);

  const { rows, total, playerRank, playerWon, racing, done, confirmed } = standings;
  // Tant que le salon n'a pas enregistré l'arrivée, le rang n'est qu'une estimation : on ne l'annonce pas.
  const title = !confirmed
    ? <>LIGNE D’ARRIVÉE <em>FRANCHIE !</em></>
    : playerWon
      ? <>VICTOIRE <em>DU CAVALIER !</em></>
      : <>TU TERMINES <em>{rankLabel(playerRank)} !</em></>;
  const status = !confirmed
    ? 'ENREGISTREMENT DE TON ARRIVÉE…'
    : done
      ? 'CLASSEMENT FINAL · COURSE TERMINÉE'
      : `CLASSEMENT PROVISOIRE · ${racing} CAVALIER${racing > 1 ? 'S' : ''} ENCORE EN PISTE`;

  return (
    <div className="mirage-game-popup-backdrop">
      <div ref={dialogRef} className="mirage-results-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mirage-overlay-kicker">
          <span>✦</span> ARRIVÉE · EN LIGNE{confirmed ? ` (${rankLabel(playerRank)} / ${total})` : ''} <span>✦</span>
        </div>
        <h2 id={titleId}>{title}</h2>
        <p className={`mirage-results-status${done ? ' is-final' : ''}`} role="status">
          <i aria-hidden="true" />{status}
        </p>

        <MirageScoreboard rows={rows} caption="Classement de la course en ligne" />

        {result && (
          <div className="mirage-result-stats">
            <span>◆ {result.gems || 0} cristaux · {(result.score || 0).toLocaleString('fr-FR')} pts</span>
          </div>
        )}
        {xp && (
          <p className="mirage-xp-award" role="status">
            <strong>+{xp.xpGained} XP</strong>
            {xp.leveledUp && <span>NIVEAU {xp.level} !</span>}
            {xp.unlocked?.length > 0 && <em>SKIN DÉBLOQUÉ : {xp.unlocked.map((skin) => skin.name).join(' · ')}</em>}
          </p>
        )}

        <div className="mirage-result-actions">
          <button ref={primaryRef} type="button" className="mirage-start-button" onClick={onClose}>VOIR LE SALON</button>
          <button type="button" className="mirage-share-button is-danger" disabled={busy} onClick={onLeave}>← QUITTER LA ROOM</button>
        </div>
        <div className="mirage-overlay-hint">ÉCHAP POUR FERMER · POSITIONS MISES À JOUR EN DIRECT</div>
      </div>
    </div>
  );
}
