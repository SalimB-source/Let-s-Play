import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CityRushDriverAvatar from './CityRushDriverAvatar';
import { storyArtFor, storyCastMember } from './cityRushStory';
import './city-rush-story.css';

// Lecteur BD du mode Histoire : les cases apparaissent une après l'autre, et
// dans chaque case les bulles se révèlent une par une au clic — puis la case
// suivante. Clavier : → / Espace / Entrée pour avancer, ← pour revenir.

function panelArt(chapter, art) {
  if (art && typeof art === 'object' && art.portrait) {
    return { kind: 'portrait', who: art.portrait };
  }
  return { kind: art === 'action' ? 'action' : 'city' };
}

function PortraitArt({ who }) {
  const cast = storyCastMember(who);
  if (!cast.avatar) return null;
  return (
    <div className="cr-comic-portrait" style={{ '--cr-speaker': cast.color }}>
      <div className="cr-comic-portrait-frame">
        <CityRushDriverAvatar
          driver={{ displayName: cast.name, name: cast.short, country: cast.role, avatar: cast.avatar }}
          decorative
        />
      </div>
      <span className="cr-comic-portrait-name">{cast.icon} {cast.name}</span>
    </div>
  );
}

function Bubble({ who, text, index }) {
  const cast = storyCastMember(who);
  if (who === 'narrator' || !cast.avatar) {
    return (
      <div className="cr-comic-bubble is-narration" style={{ '--cr-speaker': cast.color }}>
        <p>{text}</p>
      </div>
    );
  }
  return (
    <div className="cr-comic-bubble" style={{ '--cr-speaker': cast.color }} key={index}>
      <span className="cr-comic-bubble-avatar">
        <CityRushDriverAvatar
          driver={{ displayName: cast.name, name: cast.short, country: cast.role, avatar: cast.avatar }}
          decorative
        />
      </span>
      <span className="cr-comic-bubble-body">
        <b>{cast.icon} {cast.name}</b>
        <p>{text}</p>
      </span>
    </div>
  );
}

export default function CityRushComic({
  chapter = null,
  panels = [],
  kicker = 'MODE HISTOIRE',
  doneLabel = 'CONTINUER',
  onDone = null,
  onSkip = null,
}) {
  const list = useMemo(() => (Array.isArray(panels) ? panels.filter(Boolean) : []), [panels]);
  const [panelIndex, setPanelIndex] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const safeIndex = Math.max(0, Math.min(list.length - 1, panelIndex));
  const panel = list[safeIndex] || null;
  const bubbles = panel?.bubbles || [];
  const isLastPanel = safeIndex >= list.length - 1;
  const panelComplete = revealed >= bubbles.length;
  const imageBase = import.meta.env.BASE_URL || '/';

  // Nouveau script (chapitre suivant) : on repart de la première case.
  useEffect(() => {
    setPanelIndex(0);
    setRevealed(0);
  }, [list]);

  const advance = useCallback(() => {
    if (!panel) {
      onDone?.();
      return;
    }
    if (revealed < bubbles.length) {
      setRevealed((value) => value + 1);
      return;
    }
    if (!isLastPanel) {
      setPanelIndex(safeIndex + 1);
      setRevealed(0);
      return;
    }
    onDone?.();
  }, [panel, bubbles.length, revealed, isLastPanel, safeIndex, onDone]);

  const goBack = useCallback(() => {
    if (revealed > 0) {
      setRevealed((value) => value - 1);
      return;
    }
    if (safeIndex > 0) {
      const previousBubbles = list[safeIndex - 1]?.bubbles?.length || 0;
      setPanelIndex(safeIndex - 1);
      setRevealed(previousBubbles);
    }
  }, [revealed, safeIndex, list]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = event.key.toLowerCase();
      if (key === 'arrowright' || key === ' ' || key === 'enter') {
        event.preventDefault();
        advance();
      } else if (key === 'arrowleft') {
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, goBack]);

  if (!panel) return null;
  const art = panelArt(chapter, panel.art);

  return (
    <div className="cr-comic" role="dialog" aria-label={`Bande dessinée : ${kicker}`}>
      <div className="cr-comic-head">
        <span className="cr-comic-kicker"><i />{kicker}</span>
        <span className="cr-comic-progress" aria-label={`Case ${safeIndex + 1} sur ${list.length}`}>
          {list.map((_, dot) => (
            <i key={dot} className={dot < safeIndex ? 'is-read' : dot === safeIndex ? 'is-current' : ''} />
          ))}
        </span>
      </div>

      <button type="button" className="cr-comic-stage" onClick={advance} aria-label="Case suivante">
        {art.kind === 'portrait' ? (
          <PortraitArt who={art.who} />
        ) : (
          <span className="cr-comic-art">
            <img src={`${imageBase}${storyArtFor(chapter, art.kind)}`} alt="" draggable="false" />
            <span className="cr-comic-art-shade" aria-hidden="true" />
          </span>
        )}
        {panel.caption && <span className="cr-comic-caption">{panel.caption}</span>}
        {panel.sfx && <span className="cr-comic-sfx" aria-hidden="true">{panel.sfx}</span>}
        {bubbles.length > 0 && (
          <span className="cr-comic-bubbles">
            {bubbles.slice(0, revealed).map((bubble, index) => (
              <Bubble key={`${safeIndex}-${index}`} who={bubble.who} text={bubble.text} index={index} />
            ))}
            {revealed < bubbles.length && <span className="cr-comic-more">…</span>}
          </span>
        )}
      </button>

      <div className="cr-comic-nav">
        <button type="button" className="cr-comic-nav-button" onClick={goBack} disabled={safeIndex === 0 && revealed === 0}>
          ← RETOUR
        </button>
        <span className="cr-comic-hint">
          {isLastPanel && panelComplete ? 'Fin de la scène' : 'Clique pour faire apparaître la suite'}
        </span>
        {isLastPanel && panelComplete ? (
          <button type="button" className="cr-comic-nav-button is-primary" onClick={() => onDone?.()}>
            {doneLabel} <span aria-hidden="true">▶</span>
          </button>
        ) : (
          <button type="button" className="cr-comic-nav-button is-primary" onClick={advance}>
            SUITE <span aria-hidden="true">→</span>
          </button>
        )}
        <button type="button" className="cr-comic-nav-button is-quiet" onClick={() => (onSkip || onDone)?.()}>
          PASSER ▶▶
        </button>
      </div>
    </div>
  );
}
