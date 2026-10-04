import React from 'react';
import MirageCupStandings, { formatRaceLine } from './MirageCupStandings';
import MirageTrophyIcon from './MirageTrophyIcon';
import { cupChampionBonus, cupStandings, cupWinner, getCup, placeLabel } from './mirageCup';
import { stageName } from './MirageCoursePicker';

// Titre de l’overlay selon ta place dans la course (1ᵉʳ → 4ᵉ).
const HEADLINES = [
  ['VICTOIRE', 'DU CAVALIER !'],
  ['BELLE', '2ᵉ PLACE !'],
  ['SUR LE', 'PODIUM !'],
  ['4ᵉ PLACE,', 'ON SE RATTRAPE !'],
];

/**
 * Arrivée d’une course de la coupe : ta place, les points gagnés et le
 * classement général avant d’enchaîner sur la course suivante — ou, après la
 * dernière, sur le podium.
 */
export default function MirageCupResults({ cup, run, award, onNext, onQuit }) {
  const total = run.stages.length;
  const played = run.races.length;
  const last = run.races[played - 1];
  const finished = played >= total;
  const standings = cupStandings(run);
  const mine = last.placements.find((line) => line.riderId === run.riders.find((rider) => rider.isPlayer)?.id);
  const [headline, accent] = HEADLINES[Math.min(3, Math.max(0, (mine?.place ?? 4) - 1))];
  const nextStage = finished ? null : stageName(run.stages[played]);
  // Prime de champion : annoncée sur l’arrivée de la dernière course, quand le
  // classement général est acquis — rien à dire si la coupe n’en offre pas.
  const championBonus = finished && cupWinner(run)?.isPlayer ? cupChampionBonus(cup) : 0;
  // La récompense de la course, prime exclue : elle a sa propre ligne, donc les
  // dix OR d’une victoire ne se confondent jamais avec les 90 OR du titre.
  const raceCoinsGained = Math.max(0, (award?.coinsGained ?? 0) - championBonus);

  return (
    <div className="mirage-overlay mirage-result-overlay mirage-cup-results">
      <div className="mirage-cup-results-body">
        <div className="mirage-overlay-kicker"><span>✦</span> {cup.name.toUpperCase()} · COURSE {played} / {total} <span>✦</span></div>
        <ol className="mirage-cup-progress" aria-label={`Course ${played} sur ${total}`}>
          {run.stages.map((stage, index) => (
            <li key={`${stage}-${index}`} className={index < played ? 'is-done' : index === played ? 'is-next' : ''}>
              <b>{index + 1}</b><span>{stageName(stage)}</span>
            </li>
          ))}
        </ol>
        <h2>{headline} <em>{accent}</em></h2>
        <p className="mirage-cup-gained" role="status">
          <strong>+{mine?.points ?? 0} POINTS</strong>
          <span>{placeLabel(mine?.place ?? 4)} · {stageName(last.stage)} · {formatRaceLine(mine)}</span>
        </p>
        {championBonus > 0 && (
          <p className="mirage-cup-champion-bonus" role="status">
            <span aria-hidden="true">♛</span> PRIME DE CHAMPION ·{' '}
            <b className="mirage-coin-gain">+{championBonus} OR</b>{' '}
            <small>CLASSEMENT GÉNÉRAL REMPORTÉ</small>
          </p>
        )}
        <MirageCupStandings standings={standings} run={run} mode="race" />
        {award && (
          <p className="mirage-xp-award" role="status">
            <strong>+{award.xpGained} XP</strong>
            {raceCoinsGained > 0 && <b className="mirage-coin-gain">+{raceCoinsGained} OR</b>}
            {award.leveledUp && <span>NIVEAU {award.level} !</span>}
            {award.unlocked?.length > 0 && <em>SKIN DÉBLOQUÉ : {award.unlocked.map((skin) => skin.name).join(' · ')}</em>}
            {award.newlyUnlockedStages?.length > 0 && <em>CARTE DÉBLOQUÉE : {award.newlyUnlockedStages.map((id) => stageName(id)).join(' · ')}</em>}
            {award.newlyUnlockedCups?.length > 0 && <em>COUPE DÉBLOQUÉE : {award.newlyUnlockedCups.map((id) => getCup(id)?.name || id).join(' · ')}</em>}
          </p>
        )}
        <div className="mirage-result-actions">
          <button type="button" className="mirage-start-button" onClick={onNext}>
            {finished ? <>VOIR LE PODIUM <MirageTrophyIcon cupId={cup.id} className="mirage-inline-trophy" /></> : <>COURSE SUIVANTE · {nextStage.toUpperCase()} <span aria-hidden="true">↗</span></>}
          </button>
          <button type="button" className="mirage-share-button" onClick={onQuit}>← ABANDONNER LA COUPE</button>
        </div>
        <div className="mirage-overlay-hint">{finished ? 'ENTRÉE POUR DÉCOUVRIR LE VAINQUEUR' : 'ENTRÉE POUR CONTINUER · LES POINTS S’ADDITIONNENT'}</div>
      </div>
    </div>
  );
}
