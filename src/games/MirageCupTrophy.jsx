import React, { useEffect, useMemo, useRef, useState } from 'react';
import MirageCupStandings from './MirageCupStandings';
import MirageCupTrophyEmblem from './MirageCupTrophyEmblem';
import { cupChampionBonus, cupGoldMaximum, cupStandings, placeLabel } from './mirageCup';
import { makeTrophyScene } from './mirageTrophyScene';
import { getTrophyDesign } from './mirageTrophy';

function prefersReducedMotion() {
  try { return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/**
 * Écran de remise de la coupe, à la Mario Kart : son trophée 3D tourne sur
 * le podium, avec des félicitations, le nom du vainqueur et le classement final.
 * La scène WebGL vit dans `mirageTrophyScene.js` ; sans WebGL, un trophée CSS
 * prend le relais — le texte, lui, est toujours du vrai HTML.
 */
export default function MirageCupTrophy({ cup, run, raceCoins = 0, onReplay, onQuit }) {
  const trophy = getTrophyDesign(cup.trophyDesign || cup.id);
  const standings = useMemo(() => cupStandings(run), [run]);
  const winner = standings[0];
  const me = standings.find((row) => row.isPlayer);
  const playerWon = Boolean(winner.isPlayer);
  // Or réellement crédité pour les victoires de course, et maximum annoncé
  // dans le sélecteur si le joueur remportait toutes les courses.
  const goldMaximum = cupGoldMaximum(cup);
  // Prime de champion : certains classements généraux paient le titre.
  const championBonus = cupChampionBonus(cup);
  const championBonusWon = playerWon && championBonus > 0;
  const mountRef = useRef(null);
  const slotRef = useRef(null);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let scene;
    setWebgl(true);
    try {
      scene = makeTrophyScene(mount, {
        trophyDesign: trophy.id,
        riderColors: winner.colors,
        slot: slotRef.current,
        reducedMotion: prefersReducedMotion(),
      });
    } catch {
      setWebgl(false);
      return undefined;
    }
    return () => scene.destroy();
  }, [trophy.id, winner.colors]);

  return (
    <section className={`mirage-trophy-screen is-${trophy.id}${playerWon ? ' is-player-win' : ''}`} data-trophy={trophy.id} aria-labelledby="mirage-trophy-title">
      <div className="mirage-trophy-rays" aria-hidden="true" />
      <div className="mirage-trophy-canvas" ref={mountRef} aria-hidden="true" />
      <div className="mirage-trophy-layout">
        <header className="mirage-trophy-head">
          <div className="mirage-overlay-kicker"><span>✦</span> {cup.name.toUpperCase()} · CLASSEMENT FINAL <span>✦</span></div>
          <h2 id="mirage-trophy-title" className="mirage-trophy-title">FÉLICITATIONS</h2>
        </header>

        <div className="mirage-trophy-slot" ref={slotRef}>
          {!webgl && (
            <div className="mirage-trophy-fallback" aria-hidden="true">
              <MirageCupTrophyEmblem design={trophy.id} className="mirage-trophy-fallback-cup" />
              <i /><i /><i /><i /><i /><i />
            </div>
          )}
        </div>

        <div className="mirage-trophy-panel">
          <p className="mirage-trophy-design" title={trophy.description}>{trophy.name}</p>
          <p className="mirage-trophy-winner">
            <small>VAINQUEUR · {cup.name.toUpperCase()}</small>
            <strong className="mirage-trophy-name"><span className="mirage-trophy-crown" aria-hidden="true">♛</span> {winner.name}</strong>
          </p>
          <p className="mirage-trophy-lede" role="status">
            {playerWon
              ? <>Tu remportes la {cup.name} avec <b>{winner.points} points</b>. Bravo, cavalier !</>
              : <>{winner.name} remporte la {cup.name} avec <b>{winner.points} points</b>. Tu termines {placeLabel(me.rank)} avec {me.points} points : la revanche t’attend !</>}
          </p>
          <p className={`mirage-trophy-purse${raceCoins + (championBonusWon ? championBonus : 0) > 0 ? ' is-won' : ''}`}>
            <span aria-hidden="true">●</span> OR GAGNÉS EN COURSE ·{' '}
            <b className={raceCoins > 0 ? 'mirage-coin-gain' : undefined}>+{raceCoins} OR</b>{' '}
            <small>MAX. {goldMaximum} OR SI TOUTES LES COURSES SONT GAGNÉES</small>
          </p>
          {championBonus > 0 && (
            <p className={`mirage-trophy-champion-bonus${championBonusWon ? ' is-won' : ''}`} role="status">
              <span aria-hidden="true">♛</span> PRIME DE CHAMPION ·{' '}
              <b className={championBonusWon ? 'mirage-coin-gain' : undefined}>+{championBonus} OR</b>{' '}
              <small>
                {championBonusWon
                  ? 'AU TITRE DU CLASSEMENT GÉNÉRAL'
                  : `SI TU REMPORTES LE CLASSEMENT GÉNÉRAL DE LA ${cup.name.toUpperCase()}`}
              </small>
            </p>
          )}
          <MirageCupStandings standings={standings} run={run} mode="final" />
          <div className="mirage-result-actions">
            <button type="button" className="mirage-start-button" onClick={onReplay}>REJOUER LA COUPE <span aria-hidden="true">↗</span></button>
            <button type="button" className="mirage-share-button" onClick={onQuit}>← CHOISIR TON MODE</button>
          </div>
          <div className="mirage-overlay-hint">ENTRÉE POUR REJOUER LA COUPE</div>
        </div>
      </div>
    </section>
  );
}
