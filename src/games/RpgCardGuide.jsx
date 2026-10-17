import { useEffect, useRef, useState } from 'react';
import RpgTutorialOverlay from './RpgTutorialOverlay.jsx';
import RpgCardRules from './RpgCardRules.jsx';
import { EffetsSprite, PastillesCarte } from './effetIcons.jsx';
import { RPG_CARD_LESSONS } from './rpgCardLessons.js';
import { bonusArme, cardById, cardColorCost, cardColors, cardFrameClass, cardFrameColor, cardHybridGradient, cardMotifClass, cardTypeLine, carteEstArme } from './rpgCards.js';
// Le jeton des familles de sorts : le guide enseigne la face des cartes, il
// montre donc le repère tel que le duel le pose (voir `rpgSortSignature.jsx`).
import { SortSceau } from './rpgSortSignature.jsx';
import './rpg-card-guide.css';

const ELEMENT_LABELS = {
  braise: 'Braise',
  eau: 'Eau',
  sable: 'Sable',
  neige: 'Neige',
};
const ELEMENT_MARKS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️' };

/** Un bonus signé pour l'affichage : « +2 », ou « -2 » pour le malus du Sabre maudit. */
const signeBonus = (valeur = 0) => (valeur >= 0 ? `+${valeur}` : `${valeur}`);

function GuideCard({ carte, cardArt }) {
  const colors = cardColors(carte);
  const degradeCout = cardHybridGradient(carte);
  const exigencesCout = Object.entries(cardColorCost(carte))
    .map(([color, n]) => `${n} ${ELEMENT_LABELS[color] ?? color}`).join(' et ');
  const estCreature = ['creature', 'hero'].includes(carte.kind);
  const labelElement = colors.map((color) => `${ELEMENT_MARKS[color] ?? '◇'} ${ELEMENT_LABELS[color] ?? color}`).join(' · ');

  return (
    <article
      className={`rpg-card-guide__example rpg-card-guide__example--${carte.kind} ${cardFrameClass(carte)} ${cardMotifClass(carte)}`}
      data-card-id={carte.id}
      style={{ '--rpg-guide-frame': cardFrameColor(carte), '--rpg-frame-color': cardFrameColor(carte) }}
    >
      <div className="rpg-card-guide__art">
        <img src={cardArt(carte.id)} alt={`Illustration de ${carte.name}`} loading="lazy" />
        {carte.kind !== 'terrain' && <span
          className={`rpg-card-guide__cost${degradeCout ? ' rpg-card-guide__cost--hybride' : ''}`}
          style={degradeCout ? { '--rpg-hybrid-cost-bg': degradeCout } : undefined}
          aria-label={`Coût : ${carte.cost} mana${exigencesCout ? `, dont ${exigencesCout}` : ''}`}
        >{carte.cost}</span>}
        <SortSceau carte={carte} className="rpg-card-guide__sort" />
      </div>
      <div className="rpg-card-guide__details">
        <span className="rpg-card-guide__element">{labelElement}</span>
        <h3>{carte.name}</h3>
        <p className="rpg-card-guide__type">{cardTypeLine(carte)}</p>
        <PastillesCarte carte={carte} className="rpg-card-guide__pastilles" />
        {estCreature && <p className="rpg-card-guide__stats">⚔ {carte.atk} · 🛡 {carte.def}</p>}
        {carteEstArme(carte) && <p className="rpg-card-guide__stats">Porteur : ⚔ {signeBonus(bonusArme(carte)?.atk)} · 🛡 {signeBonus(bonusArme(carte)?.def)}</p>}
        <p className="rpg-card-guide__rules"><RpgCardRules carte={carte} /></p>
      </div>
    </article>
  );
}

export default function RpgCardGuide({ cardArt, onExit, onResumeGame, hasGame, onPlaySfx }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const examplesRef = useRef(null);
  const lesson = RPG_CARD_LESSONS[lessonIndex] ?? RPG_CARD_LESSONS[0];
  const lastLesson = lessonIndex === RPG_CARD_LESSONS.length - 1;
  const cards = lesson.cardIds.map(cardById).filter(Boolean);
  const step = {
    id: `card-guide-${lesson.id}`,
    kind: lastLesson ? 'complete' : 'info',
    target: '[data-tutorial-target="card-guide-examples"]',
    eyebrow: `${lesson.section.toUpperCase()} · FICHE ${lessonIndex + 1}`,
    title: lesson.title,
    text: lesson.text,
    nextLabel: lastLesson ? 'Terminer le guide' : 'Fiche suivante',
    side: 'right',
  };
  const play = (sound) => { try { onPlaySfx?.(sound); } catch { /* les fiches restent utilisables sans audio */ } };

  const nextLesson = () => {
    if (lastLesson) return;
    play('menu');
    setLessonIndex((index) => Math.min(index + 1, RPG_CARD_LESSONS.length - 1));
  };

  useEffect(() => {
    const target = examplesRef.current;
    if (!target?.scrollIntoView) return;
    const mouvementReduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
  }, [lesson.id]);

  return (
    <main className="rpg-card-guide" aria-label="Guide des cartes et des effets">
      <EffetsSprite />
      <header className="rpg-card-guide__header">
        <div>
          <span className="rpg-mode-menu__eyebrow">LE SABLIER · GUIDE DES CARTES</span>
          <h2>Lire une carte, prévoir son effet</h2>
          <p>Des exemples du vrai catalogue, regroupés par familles et capacités. Avancez fiche par fiche ; fermez le guide pour revenir au menu.</p>
        </div>
        {hasGame && <button type="button" className="rpg-menu-button rpg-menu-button--resume" onClick={() => { play('select'); onResumeGame(); }}>↩ Reprendre le duel</button>}
      </header>

      <div className="rpg-card-guide__layout">
        <section className="rpg-card-guide__stage" aria-label={`Exemples : ${lesson.title}`}>
          <div className="rpg-card-guide__stage-heading">
            <span>{lesson.section}</span>
            <span>{lessonIndex + 1} / {RPG_CARD_LESSONS.length}</span>
          </div>
          <div ref={examplesRef} className="rpg-card-guide__examples" data-tutorial-target="card-guide-examples">
            {cards.map((carte) => <GuideCard key={carte.id} carte={carte} cardArt={cardArt} />)}
          </div>
          <p className="rpg-card-guide__hint">L’encadré doré suit les cartes étudiées. Les règles imprimées restent visibles à côté de l’explication.</p>
        </section>

        <aside className="rpg-card-guide__index" aria-label="Plan du guide">
          <h3>Parcours des notions</h3>
          {['Types de cartes', 'Magies', 'Capacités des créatures'].map((section) => {
            const entries = RPG_CARD_LESSONS
              .map((entry, index) => ({ entry, index }))
              .filter(({ entry }) => entry.section === section);
            return (
              <section key={section} className="rpg-card-guide__index-section">
                <h4>{section}</h4>
                <ol>
                  {entries.map(({ entry, index }) => (
                    <li key={entry.id}>
                      <span className={index === lessonIndex ? 'is-current' : index < lessonIndex ? 'is-read' : ''} aria-current={index === lessonIndex ? 'step' : undefined}>
                        <b>{String(index + 1).padStart(2, '0')}</b> {entry.title}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </aside>
      </div>

      <RpgTutorialOverlay
        key={lesson.id}
        step={step}
        stepIndex={lessonIndex}
        totalSteps={RPG_CARD_LESSONS.length}
        onNext={nextLesson}
        onFinish={onExit}
        onClose={onExit}
      />
    </main>
  );
}
