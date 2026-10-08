import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CardTable from './CardTable.jsx';
import {
  RPG_CRISTALLISATION_COST,
  RPG_DIFFICULTIES,
  RPG_SABLE_MAX,
  RPG_VERRE_MAX,
  rpgAddFoes,
  rpgCreateBattle,
  rpgCurrentActor,
  rpgDraftPick,
  rpgElementMultiplier,
  rpgEndTurn,
  rpgEnemyTurn,
  rpgFelureRatio,
  rpgPlayCard,
  rpgPlayableCards,
  rpgRewards,

  rpgTurnRing,
} from './rpgCombat';
import { cardById, CARD_RARITIES } from './rpgCards';
import {
  RPG_DEMO_HELP,
  RPG_DEMO_PARTY,
  RPG_DEMO_RESERVE,
  RPG_DEMO_WAVES,
  RPG_ELEMENT_ICONS,
  RPG_EXPLORE_PALIERS,
} from './rpgContent';
import {
  rpgApplyExplore,
  rpgCreateExplore,
  rpgExploreAct,
  RPG_EXPLORE_HOURS,
} from './rpgExplore';
import { RpgAudioPlayer } from './rpgAudio';
import './rpg-battle.css';

/**
 * Écran jouable du prototype de combat — « Le Sablier de Bab El ».
 *
 * La page ne calcule rien : tout vient de `rpgCombat.js` (règles pures,
 * testées) et de `rpgContent.js` (chiffres et textes de la démo). Elle affiche
 * l'état du combat et pilote le tour des ennemis — il n'y a **aucun minutage**
 * côté joueur : on contre une attaque annoncée en choisissant, pas en appuyant
 * au bon moment.
 */

/** Chaque acteur porte un champ `portrait` ; le fichier vit dans /public/portraits. */
const portraitSrc = (actor) =>
  `${import.meta.env.BASE_URL}portraits/${actor.portrait ?? actor.id}.jpg`;

/** Ce que l'exploration verse dans le combat suivant, en langage joueur. */
const BUFF_LABELS = {
  atk: 'L’équipe frappera +10 %',
  verre: '+1 Verre au début du combat',
  pret: 'L’Astrolabe sonnera une heure plus tard',
  sourdine: 'Ennemis assourdis : −10 % d’attaque',
};

function Bar({ value, max, tone = 'hp' }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className={`rpg-bar rpg-bar--${tone}`}>
      <span className="rpg-bar__fill" style={{ width: `${ratio * 100}%` }} />
    </span>
  );
}

/**
 * Boîte de message façon Dragon Quest : le journal se tape lettre à lettre.
 * Pur DOM — elle vit aussi bien posée sur la scène que dans la barre du bas.
 */
function MessageBox({ battleRef }) {
  const textRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let lastLen = -1;
    let shown = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      const log = battleRef.current?.log;
      if (!log || !textRef.current) return;
      if (log.length !== lastLen) {
        lastLen = log.length;
        shown = 0;
      }
      const line = log.length ? log[log.length - 1].text : '';
      shown = Math.min(line.length, shown + dt * 50);
      textRef.current.textContent = line.slice(0, Math.floor(shown));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [battleRef]);
  return (
    <div className="rpg-scene__msg" aria-live="polite">
      <span ref={textRef} />
      <span className="rpg-scene__caret" aria-hidden="true">▼</span>
    </div>
  );
}


function RingList({ ring, currentId }) {
  return (
    <ol className="rpg-ring">
      <li className="rpg-ring__title">Ordre des tours</li>
      {ring.map((actor, index) => (
        <li
          key={`${actor.id}-${index}`}
          className={`rpg-ring__item ${actor.side === 'ennemi' ? 'is-foe' : 'is-team'} ${index === 0 && actor.id === currentId ? 'is-now' : ''}`}
        >
          <img className="rpg-ring__dot" src={portraitSrc(actor)} alt="" aria-hidden="true" />
          <span>{actor.name}</span>
        </li>
      ))}
    </ol>
  );
}

export default function RpgBattlePage() {
  const [screen, setScreen] = useState('intro');
  const [difficulty, setDifficulty] = useState('normale');
  const [waveIndex, setWaveIndex] = useState(0);
  const [targetId, setTargetId] = useState(null);
  const [allyId, setAllyId] = useState(null);
  const [crystallize, setCrystallize] = useState(false);
  const [flash, setFlash] = useState(null);
  const [, force] = useReducer((n) => n + 1, 0);

  const battleRef = useRef(null);
  const timersRef = useRef([]);
  // Événements éphémères pour la scène 3D (ruées, zones, soins, souffles).
  const sceneQueueRef = useRef([]);
  // L'exploration en cours entre deux vagues (null pendant les combats).
  const exploreRef = useRef(null);
  const [choice, setChoice] = useState(null);
  // Son synthétisé : muet tant qu'aucun geste joueur n'a éveillé l'AudioContext.
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = new RpgAudioPlayer();
  const [muted, setMuted] = useState(() => {
    try {
      return window.localStorage.getItem('rpg-mute') === '1';
    } catch {
      return false;
    }
  });
  const battle = battleRef.current;

  useEffect(() => {
    const unlock = () => audioRef.current.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    audioRef.current.setMuted(muted);
    try {
      window.localStorage.setItem('rpg-mute', muted ? '1' : '0');
    } catch {
      // navigation privée : le réglage vivra juste le temps de la session
    }
  }, [muted]);

  const later = useCallback((fn, delay) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== id);
      fn();
    }, delay);
    timersRef.current.push(id);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const showFlash = useCallback((text, tone = 'info') => {
    setFlash({ text, tone });
    later(() => setFlash(null), 1600);
  }, [later]);

  // ── Pilotage : le tour ennemi est automatique, rien n'attend le joueur ───
  const pump = useCallback(() => {
    const state = battleRef.current;
    if (!state) return;
    if (state.over) {
      setScreen(state.over === 'victoire' ? 'vague-finie' : 'defaite');
      force();
      return;
    }
    const actor = rpgCurrentActor(state);
    if (!actor) {
      setScreen('vague-finie');
      force();
      return;
    }
    if (actor.side === 'ennemi') {
      later(() => {
        const intent = actor.intent;
        if (intent) {
          if (intent.family === 'zone') cine({ t: 'zone', from: actor.id }, 'zone');
          else if (intent.family === 'soutien') cine({ t: 'soin', from: actor.id, to: actor.id }, 'heal');
          else {
            cine({ t: 'strike', from: actor.id, to: intent.targetId }, 'whoosh');
            audioRef.current.play('hit', 0.28);
          }
        }
        const before = new Map(state.actors.map((a) => [a.id, a.hp]));
        rpgEnemyTurn(state);
        pushPops(state, before);
        force();
        later(pump, 340);
      }, 620);
      return;
    }
    force();
  }, [later]);

  // Les deltas de PV deviennent des chiffres flottants dans la scène.
  const pushPops = useCallback((state, before) => {
    for (const a of state.actors) {
      const prev = before.get(a.id);
      if (prev == null) continue;
      const delta = a.hp - prev;
      if (delta !== 0) {
        sceneQueueRef.current.push({ t: 'pop', to: a.id, amount: delta });
        audioRef.current.play(delta < 0 ? 'hit' : 'heal');
      }
    }
  }, []);

  // Un événement de scène + son geste sonore, d'un seul geste.
  const cine = useCallback((event, sfx = null, delay = 0) => {
    sceneQueueRef.current.push(event);
    if (sfx) audioRef.current.play(sfx, delay);
  }, []);

  const refuse = useCallback((result, action) => {
    const reasons = {
      'pa-insuffisant': 'Plus assez de PA.',
      'sable-insuffisant': 'Pas assez de sable au sol.',
      'verre-insuffisant': 'Pas assez de Verre.',
      'nom-verrouille': 'Nom verrouillé.',
      'etage-max': 'Déjà au dernier étage.',
    };
    showFlash(reasons[result?.reason] ?? `${action} impossible.`, 'refus');
  }, [showFlash]);

  /** Pose une carte : sur son tour, ou en réponse (éphémère) pendant le tour ennemi. */
  const cast = useCallback((card) => {
    const state = battleRef.current;
    const acting = rpgCurrentActor(state);
    if (!acting) return;
    const teamAlive = state.actors.filter((a) => a.alive && a.side === 'equipe');
    // Pendant le tour ennemi, c'est un allié (choisi ou ciblé) qui répond.
    const actorId = acting.side === 'equipe'
      ? acting.id
      : (state.actors.find((a) => a.id === allyId && a.alive)
          ?? teamAlive.find((a) => a.id === acting.intent?.targetId)
          ?? teamAlive[0])?.id;
    if (!actorId) return;
    const foes = state.actors.filter((a) => a.alive && a.side === 'ennemi');
    const foe = state.actors.find((a) => a.id === targetId && a.alive) ?? foes[0];
    const ally = state.actors.find((a) => a.id === allyId && a.alive)
      ?? state.actors.find((a) => a.id === actorId);
    const before = new Map(state.actors.map((a) => [a.id, a.hp]));
    const result = rpgPlayCard(state, {
      actorId,
      cardId: card.id,
      targetId: card.target === 'allie' ? ally.id : card.target === 'ennemi' ? foe?.id ?? null : null,
      crystallize: crystallize && state.verre >= RPG_CRISTALLISATION_COST,
    });
    if (!result.ok) {
      refuse(result, card.name);
      return;
    }
    pushPops(state, before);
    if (card.kind === 'soin' || card.effect === 'recolte') {
      cine({ t: 'soin', from: actorId, to: card.target === 'allie' ? ally.id : actorId }, 'heal');
    } else if (card.effect === 'souffle') {
      cine({ t: 'souffle', from: actorId }, 'souffle');
    } else if (card.power) {
      cine({ t: 'strike', from: actorId, to: card.target === 'tous-ennemis' ? null : foe?.id ?? null }, 'whoosh');
      audioRef.current.play('hit', 0.28);
    } else {
      audioRef.current.play('blip');
    }
    setCrystallize(false);
    force();
    if (state.over) later(() => setScreen('vague-finie'), 800);
  }, [allyId, crystallize, later, refuse, targetId]);

  const endTurn = useCallback(() => {
    const state = battleRef.current;
    if (!state || state.over) return;
    rpgEndTurn(state);
    audioRef.current.play('blip');
    force();
    later(pump, 260);
  }, [later, pump]);

  // ── Ponctuations sonores d'état : cloche, fanfares, arpèges ─────────────
  const prevStrikeRef = useRef(0);
  useEffect(() => {
    const strike = battle?.clockStrike ?? 0;
    if (strike > 0 && prevStrikeRef.current === 0) audioRef.current.play('bell');
    prevStrikeRef.current = strike;
  }, [battle?.clockStrike]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (screen === 'vague-finie') audioRef.current.play('victoire');
    if (screen === 'defaite') audioRef.current.play('defaite');
    if (screen === 'exploration') audioRef.current.play('explore');
    if (screen === 'combat') audioRef.current.play('apparition');
  }, [screen, waveIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRun = useCallback(() => {
    clearTimers();
    const wave = RPG_DEMO_WAVES[0];
    battleRef.current = rpgCreateBattle({
      party: RPG_DEMO_PARTY,
      reserve: RPG_DEMO_RESERVE,
      foes: wave.foes,
      clockInterval: wave.clockInterval,
      difficulty,
      seed: 20261007,
    });
    setWaveIndex(0);
    setTargetId(null);
    setAllyId(null);
    setCrystallize(false);
    setFlash(null);
    setScreen('combat');
    later(pump, 500);
  }, [clearTimers, difficulty, later, pump]);

  // Descendre au combat suivant : l'exploration se verse dans la bataille.
  const descend = useCallback(() => {
    const state = battleRef.current;
    if (!state) return;
    clearTimers();
    const wave = RPG_DEMO_WAVES[waveIndex];
    if (exploreRef.current) rpgApplyExplore(exploreRef.current, state);
    exploreRef.current = null;
    rpgAddFoes(state, wave.foes);
    state.over = null;
    state.clock = wave.clockInterval;
    state.clockInterval = wave.clockInterval;
    state.clockStrike = 0;
    state.consonance = false;
    state.roundElements = [];
    setScreen('combat');
    force();
    later(pump, 700);
  }, [clearTimers, later, pump, waveIndex]);

  // Après une vague : l'équipe respire, puis monte au palier suivant —
  // qui se visite avant de redescendre se battre.
  const nextWave = useCallback(() => {
    const state = battleRef.current;
    const index = waveIndex + 1;
    if (index >= RPG_DEMO_WAVES.length) {
      clearTimers();
      setScreen('fin');
      return;
    }
    // Purge des minuteurs en attente : sans ça, un overlay programmé pendant la
    // vague précédente se rouvre au milieu de la suivante.
    clearTimers();
    for (const member of state.actors) {
      if (member.side === 'equipe' || member.side === 'reserve') {
        if (!member.alive) {
          member.alive = true;
          member.hp = Math.round(member.maxHp / 2);
        } else {
          member.hp = Math.min(member.maxHp, member.hp + Math.round(member.maxHp / 3));
        }
        member.pa = 3;
      }
      member.shield = 0;
      member.felure = 0;
      member.fele = false;
    }
    setWaveIndex(index);
    setTargetId(null);
    setAllyId(null);
    const palier = RPG_EXPLORE_PALIERS[index];
    if (palier) {
      exploreRef.current = rpgCreateExplore({ places: palier.places });
      setChoice(null);
      setScreen('exploration');
      force();
      return;
    }
    descend();
  }, [clearTimers, descend, waveIndex]);

  // Une action d'exploration : une heure, un effet, jamais de réflexe.
  const exploreAct = useCallback((placeId, actionId, option = null) => {
    const state = battleRef.current;
    const explore = exploreRef.current;
    if (!state || !explore) return;
    const result = rpgExploreAct(explore, state.actors, placeId, actionId, option);
    if (!result.ok) {
      const reasons = {
        heures: 'Le cycle reprend : plus une heure libre.',
        'sable-insuffisant': 'Pas assez de sable de poche.',
        'deja-fait': 'Déjà fait, cette heure-ci.',
      };
      showFlash(reasons[result.reason] ?? 'Impossible.', 'refus');
      return;
    }
    setChoice(null);
    force();
  }, [showFlash]);

  // ── Rendu ────────────────────────────────────────────────────────────────
  const current = battle ? rpgCurrentActor(battle) : null;
  const explore = exploreRef.current;
  const team = battle ? battle.actors.filter((a) => a.side === 'equipe') : [];
  const foes = battle ? battle.actors.filter((a) => a.side === 'ennemi') : [];

  const ring = battle ? rpgTurnRing(battle, 6) : [];
  const isPlayerTurn = Boolean(current && current.side === 'equipe' && screen === 'combat');
  const playable = isPlayerTurn ? rpgPlayableCards(battle, current) : [];
  const instants = battle
    ? battle.hand.map((id) => cardById(id)).filter((card) => card?.instant)
    : [];
  const wave = RPG_DEMO_WAVES[waveIndex];
  const rewards = battle ? rpgRewards(battle) : null;

  return (
    <div className="rpg-page">
      <header className="rpg-head">
        <img
          className="rpg-head__keyart"
          src={`${import.meta.env.BASE_URL}sablier-de-bab-el-keyart.jpg`}
          alt=""
          aria-hidden="true"
        />
        <p className="rpg-head__eyebrow">LET’S PLAY · PROTOTYPE</p>
        <h1 className="rpg-head__title">LE SABLIER <span>DE BAB EL</span></h1>
        <p className="rpg-head__lede">
          Tour par tour <strong>sans réflexes</strong> : tout est carte. Chaque ennemi annonce la
          carte qu’il posera un round à l’avance, et l’on répond en choisissant — éphémères,
          contre-élément, étages. Collectionnez des pouvoirs entre les vagues.
          Prototype technique du dossier <code>docs/rpg/</code>.
        </p>
        <nav className="rpg-head__nav">
          <Link to="/jeu">← Tous les jeux</Link>
          <button
            type="button"
            className="rpg-mute"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
            title={muted ? 'Rétablir le son' : 'Couper le son'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </nav>
      </header>

      {screen === 'intro' && (
        <section className="rpg-intro">
          <div className="rpg-intro__pitch">
            <h2>Le pitch</h2>
            <p>
              Bab El est une ville de neuf étages bâtie autour d’un portail fermé, au-dessus d’un
              désert qui monte. À chaque cycle de l’<strong>Astrolabe</strong>, l’étage le plus bas
              est repris par le sable, avec ceux qui y vivent. L’étage 1 est déjà perdu. On en est
              au 4.
            </p>
            <p>
              Cette démo ne contient qu’un combat, mais c’est celui qu’il fallait coder en premier :
              s’il n’est pas bon, rien d’autre ne sauve le jeu. Trois vagues, dont un boss à deux
              phases qui raccourcit l’horloge.
            </p>
            <ul>
              {RPG_DEMO_HELP.map((item) => (
                <li key={item.title}><strong>{item.title}.</strong> {item.text}</li>
              ))}
            </ul>
          </div>
          <div className="rpg-intro__start">
            <h3>Difficulté</h3>
            <div className="rpg-difficulty">
              {Object.entries(RPG_DIFFICULTIES).map(([id, level]) => (
                <button
                  key={id}
                  type="button"
                  className={difficulty === id ? 'is-on' : ''}
                  onClick={() => setDifficulty(id)}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p className="rpg-hint">
              La difficulté ne change jamais le tempo : elle change <em>ce que l’administration
              daigne vous dire</em>. En « Veilleur », les coups de zone n’affichent pas leur cible.
            </p>
            <button type="button" className="rpg-btn rpg-btn--primary" onClick={startRun}>
              Ouvrir le combat
            </button>
          </div>
          <div className="rpg-intro__team">
            <h3>L’équipe</h3>
            <ul>
              {[...RPG_DEMO_PARTY, ...RPG_DEMO_RESERVE].map((member) => (
                <li key={member.id}>
                  <img src={portraitSrc(member)} alt={`Portrait de ${member.name}`} />
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                  <p>« {member.line} »</p>
                </li>
              ))}
            </ul>
          </div>
          <figure className="rpg-intro__art">
            <img
              src={`${import.meta.env.BASE_URL}sablier-de-bab-el-combat.jpg`}
              alt="Maquette du combat : quatre compagnons répartis sur trois étages face à un automate de laiton et à un greffier ; au-dessus de chaque ennemi, son coup annoncé et sa ligne de visée ; barres de vie en colonnes de sable, PA en pastilles."
            />
            <figcaption>
              <strong>Direction artistique.</strong> Maquette du combat : un escalier de trois
              étages, des vies en colonnes de sable qui descendent, des PA en pastilles, et chaque
              ennemi qui montre son coup annoncé avec sa ligne de visée.
            </figcaption>
          </figure>
        </section>
      )}

      {screen === 'exploration' && explore && (
        <section className="rpg-explore">
          <header className="rpg-explore__head">
            <h2>{RPG_EXPLORE_PALIERS[waveIndex]?.title ?? 'Un palier de Bab El'}</h2>
            <p className="rpg-explore__hours" title="Chaque action coûte une heure">
              Heures avant le cycle
              <span className="rpg-pa">
                {Array.from({ length: RPG_EXPLORE_HOURS }, (_, i) => (
                  <span key={i} className={i < explore.hours ? 'is-on' : 'is-off'} />
                ))}
              </span>
            </p>
          </header>
          <p className="rpg-explore__lede">{RPG_EXPLORE_PALIERS[waveIndex]?.lede}</p>
          <div className="rpg-explore__grid">
            {explore.places.map((place) => (
              <article className="rpg-place" key={place.id}>
                <h3>{place.name}</h3>
                <p className="rpg-place__npc"><strong>{place.npc}.</strong> « {place.line} »</p>
                <div className="rpg-place__actions">
                  {place.actions.map((action) => {
                    const cost = action.cost ?? 1;
                    const key = `${place.id}/${action.id}`;
                    const done = Boolean(place.done[action.id]);
                    if (action.choices && choice === key) {
                      return (
                        <div className="rpg-choice" key={action.id}>
                          <p>{action.text}</p>
                          {action.choices.map((opt, i) => (
                            <button
                              key={opt.label}
                              type="button"
                              className="rpg-btn"
                              disabled={explore.hours < cost}
                              onClick={() => exploreAct(place.id, action.id, i)}
                            >
                              {opt.label}
                            </button>
                          ))}
                          <button type="button" className="rpg-btn rpg-btn--ghost" onClick={() => setChoice(null)}>
                            Reculer
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={action.id}
                        type="button"
                        className="rpg-btn"
                        disabled={done || explore.hours < cost}
                        onClick={() => (action.choices ? setChoice(key) : exploreAct(place.id, action.id))}
                      >
                        {action.label}
                        {done ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
            <aside className="rpg-explore__team">
              <h3>L’équipe</h3>
              <ul>
                {team.map((actor) => (
                  <li key={actor.id}>
                    <img src={portraitSrc(actor)} alt="" aria-hidden="true" />
                    <span>
                      <strong>{actor.name}</strong>
                      <small>{actor.hp} / {actor.maxHp} PV</small>
                      <Bar value={actor.hp} max={actor.maxHp} tone={actor.hp / actor.maxHp < 0.35 ? 'low' : 'hp'} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="rpg-explore__pocket">
                Sable de poche <strong>{explore.pocket}</strong> — versé sur notre sol au prochain combat.
              </p>
              {explore.buffs.length > 0 && (
                <p className="rpg-explore__buffs">
                  {explore.buffs.map((b) => BUFF_LABELS[b] ?? b).join(' · ')}
                </p>
              )}
            </aside>
          </div>
          <div className="rpg-explore__foot">
            <p>
              {explore.hours === 0
                ? 'L’Astrolabe tourne : le cycle reprend, il faut descendre.'
                : 'Les heures non passées seront perdues avec le cycle.'}
            </p>
            <button type="button" className="rpg-btn rpg-btn--primary" onClick={descend}>
              Descendre — le cycle reprend →
            </button>
          </div>
        </section>
      )}

      {battle && screen !== 'intro' && screen !== 'fin' && screen !== 'exploration' && (
        <section className="rpg-battle" data-strike={battle.clockStrike > 0 ? 'on' : 'off'}>
          <div className="rpg-stage">
            <CardTable
              battle={battle}
              queueRef={sceneQueueRef}
              waveTitle={wave.title}
              targetId={targetId}
              allyId={allyId}
              onPickFoe={setTargetId}
              onPickAlly={setAllyId}
            />
          </div>

          <header className="rpg-hud-top">
            <nav className="rpg-head__nav">
              <Link to="/jeu">← Tous les jeux</Link>
              <button
                type="button"
                className="rpg-mute"
                onClick={() => setMuted((m) => !m)}
                aria-pressed={muted}
                title={muted ? 'Rétablir le son' : 'Couper le son'}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </nav>
            <RingList ring={ring} currentId={current?.id} />
            <div className="rpg-battle__top">
            <p className="rpg-wave">
              <strong>{wave.title}</strong>
              <span>round {battle.round}</span>
            </p>
            <p className="rpg-clock" title="Quand il arrive à zéro, les ennemis frappent +20 % et tout le monde descend">
              Astrolabe
              <span className="rpg-clock__dial">{battle.clock}</span>
              {battle.clockStrike > 0 && <em className="rpg-tag rpg-tag--clock">il sonne</em>}
            </p>
            <p className="rpg-eclat" title="Verre partagé par l’équipe">
              Verre
              <span className="rpg-eclat__pips">
                {Array.from({ length: RPG_VERRE_MAX }, (_, i) => (
                  <span key={i} className={i < battle.verre ? 'is-on' : 'is-off'} />
                ))}
              </span>
              {battle.consonance && <em className="rpg-tag rpg-tag--consonance">Consonance ×1,5</em>}
            </p>
            <p className="rpg-ground">
              <span title="Sable tombé de notre côté">notre sol <strong>{battle.ground.equipe}</strong></span>
              <span title="Sable tombé du côté ennemi">leur sol <strong>{battle.ground.ennemi}</strong></span>
              <Bar value={Math.max(battle.ground.equipe, battle.ground.ennemi)} max={RPG_SABLE_MAX} tone="sable" />
            </p>
            </div>
          </header>

          <div className="rpg-bottombar">
            <ol className="rpg-log" aria-live="polite">
              {battle.log.slice(-6).map((line, index) => (
                <li key={`${battle.log.length}-${index}-${line.text}`} className={`rpg-log__line rpg-log--${line.tone}`}>{line.text}</li>
              ))}
            </ol>
            <MessageBox battleRef={battleRef} />

          {screen === 'combat' && (
            <div className="rpg-actions">
              {isPlayerTurn ? (
                <div className="rpg-actions__row">
                    <label className={`rpg-crystallize ${crystallize ? 'is-on' : ''} ${battle.verre < RPG_CRISTALLISATION_COST ? 'is-off' : ''}`}>
                      <input
                        type="checkbox"
                        checked={crystallize}
                        disabled={battle.verre < RPG_CRISTALLISATION_COST}
                        onChange={(event) => setCrystallize(event.target.checked)}
                      />
                      Cristalliser ({RPG_CRISTALLISATION_COST} Verres)
                    </label>
                    <button type="button" className="rpg-btn rpg-btn--endturn" onClick={endTurn}>
                      ⧗ Fin du tour
                    </button>
                  </div>
              ) : (
                <p className="rpg-actions__wait">
                  L’ennemi pose et exécute ses cartes…
                  {instants.length > 0 && <em> un éphémère de la main peut répondre.</em>}
                </p>
              )}
            </div>
          )}
          </div>

          {screen === 'combat' && (
            <div className="rpg-hand-dock" aria-label="Votre main, à moitié glissée sous la table">
              {isPlayerTurn ? (
                <div className="rpg-hand">
                  {playable.map((card) => {
                    const disabled = card.locked || card.used || !card.affordable;
                    const foe = battle.actors.find((a) => a.id === targetId);
                    const advantage = foe && card.element
                      ? rpgElementMultiplier(card.element, foe.element) : 1;
                    return (
                      <button
                        key={`${card.source}-${card.id}`}
                        type="button"
                        className={`rpg-hand__card rpg-hand__card--elem-${card.element ?? 'sable'} ${card.source === 'base' ? 'rpg-hand__card--base' : ''} ${card.instant ? 'is-instant' : ''} ${advantage > 1 ? 'is-avantage' : ''}`}
                        disabled={disabled}
                        onClick={() => cast(card)}
                        title={card.locked ? 'Verrouillé : le Nom complet manque' : card.text}
                      >
                        <span className="rpg-hand__title">
                          <strong>{card.name}</strong>
                          <span className="rpg-hand__cost">{card.basic ? 'base' : `${card.cost} ⛃`}</span>
                        </span>
                        <span className="rpg-hand__art" aria-hidden="true">
                          {RPG_ELEMENT_ICONS[card.element] ?? '◇'}
                          {card.power ? <b>{card.power}</b> : null}
                        </span>
                        <span className="rpg-hand__text">
                          {card.locked ? 'Exige le Nom complet (3 segments).' : card.text}
                          {card.used && <em> — déjà jouée ce tour.</em>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : instants.length > 0 ? (
                <div className="rpg-hand rpg-hand--reponse">
                  {instants.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`rpg-hand__card is-instant rpg-hand__card--elem-${card.element ?? 'sable'}`}
                      disabled={card.cost > battle.ground.equipe}
                      onClick={() => cast(card)}
                      title={card.text}
                    >
                      <span className="rpg-hand__title">
                        <strong>{card.name}</strong>
                        <span className="rpg-hand__cost">{card.cost} ⛃</span>
                      </span>
                      <span className="rpg-hand__art" aria-hidden="true">{RPG_ELEMENT_ICONS[card.element] ?? '◇'}</span>
                      <span className="rpg-hand__text">{card.text}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {flash && <p className={`rpg-flash rpg-flash--${flash.tone}`} role="status">{flash.text}</p>}

          {screen === 'vague-finie' && (
            <div className="rpg-overlay">
              <h2>Vague repoussée</h2>
              <p>
                {waveIndex + 1 < RPG_DEMO_WAVES.length
                  ? `${RPG_DEMO_WAVES[waveIndex + 1].title} — ${RPG_DEMO_WAVES[waveIndex + 1].intro}`
                  : 'Le Prototype retombe en pièces de laiton. Le cycle est tenu.'}
              </p>
              {battle?.draft?.length > 0 && (
                <div className="rpg-draft">
                  <h3>Draft — une carte rejoint votre classeur</h3>
                  <div className="rpg-draft__row">
                    {battle.draft.map((id) => {
                      const card = cardById(id);
                      if (!card) return null;
                      const art = card.kind === 'creature'
                        ? `${import.meta.env.BASE_URL}cards/${card.id}.jpg` : null;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={[
                            'rpg-hand__card rpg-hand__card--big',
                            art ? 'rpg-hand__card--img' : '',
                            `rpg-hand__card--elem-${card.element ?? 'sable'}`,
                          ].join(' ')}
                          onClick={() => { rpgDraftPick(battle, id); force(); }}
                          title={card.text}
                        >
                          {art && <img className="rpg-hand__img" src={art} alt={`Illustration de ${card.name}`} />}
                          <span className="rpg-hand__title">
                            <strong>{card.name}</strong>
                            <span className="rpg-hand__cost">{card.cost} ⛃</span>
                          </span>
                          {card.kind === 'creature' ? (
                            <span className="rpg-hand__stats" title="Attaque / Défense">⚔ {card.atk} · 🛡 {card.def}</span>
                          ) : (
                            <span className="rpg-hand__art" aria-hidden="true">
                              {RPG_ELEMENT_ICONS[card.element] ?? '◇'}
                              {card.power ? <b>{card.power}</b> : null}
                            </span>
                          )}
                          <span className="rpg-hand__text">{card.text}</span>
                          <span className="rpg-hand__rarity">{CARD_RARITIES[card.rarity]?.label ?? card.rarity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <button type="button" className="rpg-btn rpg-btn--primary" onClick={nextWave}>
                {waveIndex + 1 < RPG_DEMO_WAVES.length
                  ? (RPG_EXPLORE_PALIERS[waveIndex + 1] ? 'Monter au palier et souffler' : 'Changer de palier, puis continuer')
                  : 'Voir le bilan'}
              </button>
            </div>
          )}

          {screen === 'defaite' && (
            <div className="rpg-overlay rpg-overlay--loss">
              <h2>L’équipe tombe</h2>
              <p>Le sable monte d’un cran. Dans le jeu complet, on repart du dernier palier.</p>
              <button type="button" className="rpg-btn rpg-btn--primary" onClick={startRun}>Reprendre</button>
            </div>
          )}
        </section>
      )}

      {screen === 'fin' && battle && (
        <section className="rpg-outro">
          <h2>Les trois vagues sont tombées</h2>
          <p>
            {rewards.xp} XP · {rewards.sable} sable · {rewards.registres} registre.
            L’Astrolabe a sonné pendant le combat du Prototype, et sa chaudière s’est ouverte sous
            la moitié de sa vie : c’est la phase 2, celle où l’horloge s’emballe.
          </p>
          <p>
            Ce combat est le seul morceau du jeu qui compte : tout le reste — les neuf étages, la
            Chambre des Heures, le Grand Horloger et les trois fins — est écrit dans
            <code>docs/rpg/</code>.
          </p>
          <div className="rpg-outro__actions">
            <button type="button" className="rpg-btn rpg-btn--primary" onClick={startRun}>Rejouer</button>
            <Link className="rpg-btn" to="/jeu">Retour aux jeux</Link>
          </div>
        </section>
      )}

      <section className="rpg-docs">
        <h2>Ce que le prototype ne montre pas encore</h2>
        <ul>
          <li><strong>L’histoire</strong> — neuf étages, cinq compagnons, trois fins (<code>docs/rpg/02-histoire.md</code>).</li>
          <li><strong>La Liste</strong> — le vrai antagoniste : un document, pas une personne.</li>
          <li><strong>Les Creux</strong> — un compagnon perdu laisse une empreinte qui profite à l’équipe.</li>
          <li><strong>L’exploration</strong> — étages, évacuations, registres à retrouver.</li>
        </ul>
      </section>
    </div>
  );
}
